const express = require("express");
const { nanoid } = require("nanoid");
const { readDB, writeDB } = require("../lib/jsonStore");
const { auth, requireRole } = require("../middleware/auth");
const { dispatchEmail, resolveEmailProviderMode, getEmailProviderConfigStatus } = require("../lib/emailService");
const { ensureAcademicScope } = require("../lib/academicScope");
const smsRouter = require("./sms.routes");
const sendCampaignInternal = smsRouter.sendCampaignInternal;

const router = express.Router();

function now() {
  return new Date().toISOString();
}

function nk(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function toInt(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
}

function ensureDb(db) {
  let changed = false;
  for (const key of [
    "lmsVirtualClasses",
    "lmsVirtualClassJoins",
    "lmsVirtualNotifications",
    "lmsVirtualReminderLogs",
    "lmsVirtualEmailLogs",
    "classes",
    "users",
    "students",
    "lmsClassSubjects",
    "lmsSessions",
    "lmsTerms",
    "lmsSubjects",
  ]) {
    if (!Array.isArray(db[key])) {
      db[key] = [];
      changed = true;
    }
  }
  ensureAcademicScope(db, { currentSession: process.env.CURRENT_SESSION, currentTerm: process.env.CURRENT_TERM });
  changed = true;
  return changed;
}

function loadDb() {
  const db = readDB();
  if (ensureDb(db)) writeDB(db);
  return db;
}

function cls(db, ref) {
  const value = String(ref || "").trim();
  const key = nk(value);
  return db.classes.find((item) => String(item.id) === value || nk(item.name) === key) || null;
}

function subj(db, ref) {
  const value = String(ref || "").trim();
  const key = nk(value);
  return db.lmsSubjects.find((item) => String(item.id) === value || nk(item.subjectName) === key) || null;
}

function usr(db, id) {
  return db.users.find((item) => String(item.id) === String(id)) || null;
}

function profile(db, studentRef) {
  const value = String(studentRef || "").trim();
  const student = db.students.find((item) => String(item.id) === value) || null;
  if (!student) return null;
  const classRow = cls(db, student.classId || student.className);
  return {
    id: student.id,
    name: student.name || "",
    classId: classRow?.id || student.classId || "",
    className: classRow?.name || student.className || "",
  };
}

function parentChildren(db, user) {
  const refs = [
    ...(Array.isArray(user.studentIds) ? user.studentIds : []),
    user.studentId,
  ]
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  const out = [];
  const seen = new Set();
  for (const ref of refs) {
    if (seen.has(ref)) continue;
    seen.add(ref);
    const linked = profile(db, ref);
    if (linked) out.push(linked);
  }
  return out;
}

function enrichClassSubject(db, row) {
  const classRow = cls(db, row.classId || row.className);
  const subjectRow = subj(db, row.subjectId || row.subjectName);
  const teacher = usr(db, row.teacherUserId);
  const session = db.lmsSessions.find((item) => String(item.id) === String(row.sessionId));
  const term = db.lmsTerms.find((item) => String(item.id) === String(row.termId));
  return {
    ...row,
    id: row.id || "",
    classId: classRow?.id || row.classId || "",
    className: classRow?.name || row.className || "",
    subjectId: subjectRow?.id || row.subjectId || "",
    subjectName: subjectRow?.subjectName || row.subjectName || "",
    teacherUserId: teacher?.id || row.teacherUserId || "",
    teacherName: teacher?.name || row.teacherName || "",
    sessionName: session?.sessionName || "",
    termName: term?.termName || "",
  };
}

function canManageClassSubject(db, user, classSubject) {
  if (user.role === "ADMIN") return true;
  if (user.role !== "TEACHER") return false;
  return String(classSubject.teacherUserId || "") === String(user.id || "");
}

function visibleClassIds(db, user) {
  if (user.role === "ADMIN" || user.role === "TEACHER") return db.classes.map((item) => String(item.id));
  if (user.role === "STUDENT") {
    const student = profile(db, user.studentId);
    return student?.classId ? [String(student.classId)] : [];
  }
  if (user.role === "PARENT") {
    return Array.from(new Set(parentChildren(db, user).map((item) => String(item.classId || "")).filter(Boolean)));
  }
  return [];
}

function visibleClassSubjects(db, user) {
  const rows = db.lmsClassSubjects.map((item) => enrichClassSubject(db, item));
  if (user.role === "ADMIN") return rows;
  if (user.role === "TEACHER") return rows.filter((item) => canManageClassSubject(db, user, item));
  const classIds = new Set(visibleClassIds(db, user));
  return rows.filter((item) => classIds.has(String(item.classId)) && String(item.status || "ACTIVE").toUpperCase() !== "INACTIVE");
}

function visibleClassSubjectIds(db, user) {
  return new Set(visibleClassSubjects(db, user).map((item) => String(item.id)));
}

function studentsForClass(db, classId, className = "") {
  const classRow = cls(db, classId || className);
  const targetClassId = String(classRow?.id || classId || "");
  const targetClassKey = nk(classRow?.name || className);

  return (Array.isArray(db.students) ? db.students : [])
    .map((item) => profile(db, item.id))
    .filter((item) => item)
    .filter((item) => {
      if (targetClassId && String(item.classId || "") === targetClassId) return true;
      if (targetClassKey && nk(item.className || "") === targetClassKey) return true;
      return false;
    });
}

function studentIdsRepresentedByJoin(join) {
  const ids = [];
  if (String(join.role || "").toUpperCase() === "STUDENT" && join.studentId) {
    ids.push(String(join.studentId));
  }
  if (Array.isArray(join.childIds)) {
    join.childIds.forEach((item) => {
      const id = String(item || "").trim();
      if (id) ids.push(id);
    });
  }
  return Array.from(new Set(ids));
}

function combineDateTime(sessionDate, startTime) {
  const date = String(sessionDate || "").trim();
  const time = String(startTime || "").trim();
  if (!date) return 0;
  const value = Date.parse(`${date}T${time || "00:00"}:00`);
  return Number.isFinite(value) ? value : 0;
}

function statusPriority(value) {
  const key = String(value || "").toLowerCase();
  if (key === "live") return 0;
  if (key === "scheduled") return 1;
  if (key === "completed") return 2;
  if (key === "cancelled") return 3;
  return 4;
}

function notificationSeverity(type) {
  const key = String(type || "").toLowerCase();
  if (key === "session_cancelled") return "high";
  if (key === "recording_available") return "low";
  if (key === "session_live") return "medium";
  return "medium";
}

function buildVirtualNotificationTitle(type) {
  const key = String(type || "").toLowerCase();
  if (key === "recording_available") return "Recorded lesson available";
  if (key === "session_live") return "Live class is ready";
  if (key === "session_updated") return "Virtual class updated";
  if (key === "session_cancelled") return "Virtual class cancelled";
  return "Virtual class scheduled";
}

function buildVirtualNotificationMessage(virtualClass, type) {
  const className = String(virtualClass.className || virtualClass.classSubject?.className || "your class");
  const subjectName = String(virtualClass.subjectName || virtualClass.classSubject?.subjectName || "lesson");
  const sessionDate = String(virtualClass.sessionDate || "");
  const startTime = String(virtualClass.startTime || "");
  const schedule = [sessionDate, startTime].filter(Boolean).join(" at ");
  const key = String(type || "").toLowerCase();

  if (key === "recording_available") {
    return `The recording for ${subjectName} (${className}) is now available for replay.`;
  }
  if (key === "session_live") {
    return `${subjectName} for ${className} is now live${schedule ? ` (${schedule})` : ""}.`;
  }
  if (key === "session_updated") {
    return `${subjectName} for ${className} has been updated${schedule ? ` and is now set for ${schedule}` : ""}.`;
  }
  if (key === "session_cancelled") {
    return `${subjectName} for ${className} has been cancelled. Please check the latest timetable for the replacement session.`;
  }
  return `${subjectName} for ${className} has been scheduled${schedule ? ` for ${schedule}` : ""}.`;
}

function resolveVirtualNotifications(db, { virtualClassId, studentId = "", types = [] } = {}) {
  ensureDb(db);
  const typeSet = new Set((Array.isArray(types) ? types : []).map((item) => String(item || "").toLowerCase()).filter(Boolean));
  const stamp = now();

  (db.lmsVirtualNotifications || []).forEach((row) => {
    if (String(row.virtualClassId || "") !== String(virtualClassId || "")) return;
    if (studentId && String(row.studentId || "") !== String(studentId)) return;
    if (String(row.status || "active") === "resolved") return;
    if (typeSet.size && !typeSet.has(String(row.notificationType || "").toLowerCase())) return;
    row.status = "resolved";
    row.updatedAt = stamp;
  });
}

function createVirtualNotification(db, payload = {}) {
  ensureDb(db);
  const studentId = String(payload.studentId || "").trim();
  if (!studentId) return null;

  const type = String(payload.notificationType || payload.type || "session_scheduled").trim().toLowerCase();
  const message = String(payload.message || "").trim();
  const virtualClassId = String(payload.virtualClassId || "").trim();
  const duplicate = (db.lmsVirtualNotifications || []).find((row) =>
    String(row.studentId) === studentId &&
    String(row.virtualClassId || "") === virtualClassId &&
    String(row.notificationType || "") === type &&
    String(row.message || "") === message &&
    String(row.status || "active") === "active"
  );
  if (duplicate) return duplicate;

  const row = {
    id: nanoid(),
    studentId,
    classId: String(payload.classId || "").trim(),
    classSubjectId: String(payload.classSubjectId || "").trim(),
    virtualClassId,
    notificationType: type,
    title: String(payload.title || buildVirtualNotificationTitle(type)).trim(),
    message,
    severity: String(payload.severity || notificationSeverity(type)).trim().toLowerCase(),
    status: "active",
    createdAt: now(),
    updatedAt: now(),
  };

  db.lmsVirtualNotifications.unshift(row);
  return row;
}

function emitVirtualClassNotifications(db, virtualClass, type, options = {}) {
  const classId = String(virtualClass.classSubject?.classId || virtualClass.classId || "");
  const className = String(virtualClass.classSubject?.className || virtualClass.className || "");
  const classSubjectId = String(virtualClass.classSubjectId || virtualClass.classSubject?.id || "");
  const students = studentsForClass(db, classId, className);
  const created = [];

  students.forEach((student) => {
    if (Array.isArray(options.resolveTypes) && options.resolveTypes.length) {
      resolveVirtualNotifications(db, {
        virtualClassId: virtualClass.id,
        studentId: student.id,
        types: options.resolveTypes,
      });
    }

    const row = createVirtualNotification(db, {
      studentId: student.id,
      classId,
      classSubjectId,
      virtualClassId: virtualClass.id,
      notificationType: type,
      title: options.title || buildVirtualNotificationTitle(type),
      message: options.message || buildVirtualNotificationMessage(virtualClass, type),
      severity: options.severity || notificationSeverity(type),
    });

    if (row) created.push(row);
  });

  return created;
}

function safeEmail(value) {
  const email = String(value || "").trim();
  if (!email || !email.includes("@")) return "";
  return email;
}

function linkedStudentIdsFromUser(user) {
  return Array.from(
    new Set(
      [
        ...(Array.isArray(user?.studentIds) ? user.studentIds : []),
        user?.studentId,
      ]
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    )
  );
}

function parentUsersForStudent(db, studentId) {
  const targetId = String(studentId || "").trim();
  if (!targetId) return [];
  return (Array.isArray(db.users) ? db.users : []).filter((user) => {
    if (String(user.role || "").toUpperCase() !== "PARENT") return false;
    return linkedStudentIdsFromUser(user).includes(targetId);
  });
}

function emailTargetsForStudent(db, student) {
  const out = [];
  const studentUser = (Array.isArray(db.users) ? db.users : []).find(
    (user) => String(user.role || "").toUpperCase() === "STUDENT" && String(user.studentId || "") === String(student.id || "")
  );

  const studentEmail = safeEmail(studentUser?.email || studentUser?.emailAddress || student.email || student.studentEmail);
  if (studentEmail) {
    out.push({
      recipientId: String(studentUser?.id || `student-${student.id}`),
      recipientType: "student",
      name: String(studentUser?.name || student.name || "Student").trim(),
      email: studentEmail,
    });
  }

  parentUsersForStudent(db, student.id).forEach((user) => {
    const email = safeEmail(user.email || user.emailAddress || user.contactEmail);
    if (!email) return;
    out.push({
      recipientId: String(user.id || `parent-${student.id}`),
      recipientType: "parent",
      name: String(user.name || `Parent of ${student.name || "Student"}`).trim(),
      email,
    });
  });

  const fallbackStudentFields = [
    student.parentEmail,
    student.guardianEmail,
    student.motherEmail,
    student.fatherEmail,
  ];
  fallbackStudentFields.forEach((value, index) => {
    const email = safeEmail(value);
    if (!email) return;
    out.push({
      recipientId: `student-email-${student.id}-${index}`,
      recipientType: "parent",
      name: `Parent of ${student.name || "Student"}`,
      email,
    });
  });

  return Array.from(new Map(out.map((item) => [`${String(item.email).toLowerCase()}::${item.recipientType}`, item])).values());
}

function smsTargetsForStudent(db, student) {
  const out = [];
  const studentUser = (Array.isArray(db.users) ? db.users : []).find(
    (user) => String(user.role || "").toUpperCase() === "STUDENT" && String(user.studentId || "") === String(student.id || "")
  );
  const studentPhone = String(studentUser?.phone || student.studentPhone || student.phone || "").trim();
  if (studentPhone) {
    out.push({
      id: String(studentUser?.id || `student-${student.id}`),
      name: String(studentUser?.name || student.name || "Student").trim(),
      phone: studentPhone,
      role: "STUDENT",
    });
  }

  parentUsersForStudent(db, student.id).forEach((user) => {
    const phone = String(user.phone || "").trim();
    if (!phone) return;
    out.push({
      id: String(user.id || `parent-${student.id}`),
      name: String(user.name || `Parent of ${student.name || "Student"}`).trim(),
      phone,
      role: "PARENT",
    });
  });

  const fallbackParentPhone = String(student.parentPhone || "").trim();
  if (fallbackParentPhone) {
    out.push({
      id: `student-parent-phone-${student.id}`,
      name: `Parent of ${student.name || "Student"}`,
      phone: fallbackParentPhone,
      role: "PARENT",
    });
  }

  return Array.from(new Map(out.map((item) => [`${String(item.phone)}::${String(item.role)}`, item])).values());
}

function reminderWindowLabel(windowKey) {
  if (String(windowKey) === "hour_before") return "starts within the next hour";
  if (String(windowKey) === "manual") return "is coming up soon";
  return "is scheduled within the next 24 hours";
}

function buildReminderMessage(virtualClass, windowKey) {
  const subjectName = String(virtualClass.subjectName || virtualClass.classSubject?.subjectName || "lesson");
  const className = String(virtualClass.className || virtualClass.classSubject?.className || "your class");
  const schedule = [String(virtualClass.sessionDate || ""), String(virtualClass.startTime || "")].filter(Boolean).join(" at ");
  const platform = platformLabelForReminder(virtualClass.platform);
  return `${subjectName} for ${className} ${reminderWindowLabel(windowKey)}${schedule ? ` (${schedule})` : ""}. Join via ${platform}.`;
}

function buildReminderEmailSubject(virtualClass, windowKey) {
  const subjectName = String(virtualClass.subjectName || virtualClass.classSubject?.subjectName || "Virtual class");
  if (String(windowKey) === "hour_before") return `${subjectName} begins soon`;
  if (String(windowKey) === "manual") return `${subjectName} reminder`;
  return `${subjectName} virtual class reminder`;
}

function platformLabelForReminder(platform) {
  const key = String(platform || "google_meet").toLowerCase();
  if (key === "google_meet") return "Google Meet";
  if (key === "microsoft_teams") return "Microsoft Teams";
  if (key === "zoom") return "Zoom";
  return "your classroom link";
}

function buildReminderEmailBody(virtualClass, windowKey, recipientName) {
  const greeting = recipientName ? `Dear ${recipientName},` : "Hello,";
  const subjectName = String(virtualClass.subjectName || virtualClass.classSubject?.subjectName || virtualClass.title || "lesson");
  const className = String(virtualClass.className || virtualClass.classSubject?.className || "your class");
  const platform = platformLabelForReminder(virtualClass.platform);
  const schedule = [String(virtualClass.sessionDate || ""), String(virtualClass.startTime || "")].filter(Boolean).join(" at ");
  return [
    greeting,
    "",
    `This is a reminder that ${subjectName} for ${className} ${reminderWindowLabel(windowKey)}${schedule ? ` (${schedule})` : ""}.`,
    `Platform: ${platform}`,
    String(virtualClass.meetingLink || "").trim() ? `Meeting link: ${String(virtualClass.meetingLink).trim()}` : "",
    String(virtualClass.accessCode || "").trim() ? `Access code: ${String(virtualClass.accessCode).trim()}` : "",
    "",
    "Angel Montessori School",
    "Honesty, Service and Honour",
  ].filter(Boolean).join("\n");
}

function reminderLogsForClass(db, virtualClassId) {
  return (Array.isArray(db.lmsVirtualReminderLogs) ? db.lmsVirtualReminderLogs : [])
    .filter((row) => String(row.virtualClassId || "") === String(virtualClassId || ""))
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

function buildReminderSummary(db, virtualClassId) {
  const logs = reminderLogsForClass(db, virtualClassId);
  return {
    total: logs.length,
    smsSent: logs.filter((row) => String(row.channel || "") === "sms" && String(row.status || "") === "sent").length,
    emailSent: logs.filter((row) => String(row.channel || "") === "email" && String(row.status || "") === "sent").length,
    emailLogged: logs.filter((row) => String(row.channel || "") === "email" && String(row.status || "") === "logged").length,
    emailFailed: logs.filter((row) => String(row.channel || "") === "email" && String(row.status || "") === "failed").length,
    lastReminderAt: logs[0]?.createdAt || "",
    windowsSent: Array.from(new Set(logs.map((row) => String(row.windowKey || "")).filter(Boolean))),
  };
}

function reminderTargetsForVirtualClass(db, virtualClass) {
  const students = studentsForClass(
    db,
    virtualClass.classSubject?.classId || virtualClass.classId || "",
    virtualClass.classSubject?.className || virtualClass.className || ""
  );

  const smsContacts = [];
  const emailContacts = [];
  students.forEach((student) => {
    smsContacts.push(...smsTargetsForStudent(db, student));
    emailContacts.push(...emailTargetsForStudent(db, student));
  });

  return {
    students,
    smsContacts: Array.from(new Map(smsContacts.map((item) => [`${String(item.phone)}::${String(item.role)}`, item])).values()),
    emailContacts: Array.from(new Map(emailContacts.map((item) => [`${String(item.email).toLowerCase()}::${String(item.recipientType)}`, item])).values()),
  };
}

function buildReminderTargetsPreview(db, virtualClass) {
  const targets = reminderTargetsForVirtualClass(db, virtualClass);
  const studentRows = targets.students.map((student) => {
    const emailRecipients = emailTargetsForStudent(db, student).map((item) => ({
      recipientType: item.recipientType,
      name: item.name,
      email: item.email,
    }));
    const smsRecipients = smsTargetsForStudent(db, student).map((item) => ({
      recipientType: String(item.role || "").toLowerCase(),
      name: item.name,
      phone: item.phone,
    }));
    return {
      studentId: String(student.id || ""),
      studentName: String(student.name || "Student").trim(),
      className: String(student.className || virtualClass.className || "").trim(),
      emailRecipients,
      smsRecipients,
      emailCount: emailRecipients.length,
      smsCount: smsRecipients.length,
    };
  });

  return {
    summary: {
      studentsCovered: studentRows.length,
      emailRecipients: targets.emailContacts.length,
      smsRecipients: targets.smsContacts.length,
      emailSourceOrder: [
        "Student portal account email",
        "Student profile email or studentEmail",
        "Linked parent account email",
        "Student profile parentEmail / guardianEmail / motherEmail / fatherEmail",
      ],
      smsSourceOrder: [
        "Student portal account phone",
        "Student profile studentPhone or phone",
        "Linked parent account phone",
        "Student profile parentPhone",
      ],
    },
    students: studentRows,
  };
}

function dueReminderWindows(virtualClass, timestamp = Date.now()) {
  const startTs = Number(virtualClass.startsAt || combineDateTime(virtualClass.sessionDate, virtualClass.startTime));
  if (!startTs || startTs <= timestamp) return [];
  const diff = startTs - timestamp;
  if (diff <= 60 * 60 * 1000) return ["hour_before"];
  if (diff <= 24 * 60 * 60 * 1000) return ["day_before"];
  return [];
}

function reminderAlreadyLogged(db, virtualClassId, windowKey, channel) {
  return (Array.isArray(db.lmsVirtualReminderLogs) ? db.lmsVirtualReminderLogs : []).some((row) =>
    String(row.virtualClassId || "") === String(virtualClassId || "") &&
    String(row.windowKey || "") === String(windowKey || "") &&
    String(row.channel || "") === String(channel || "") &&
    ["sent", "logged"].includes(String(row.status || "").toLowerCase())
  );
}

async function sendReminderWindow(db, virtualClass, windowKey, actorUserId = "", dispatchMode = "auto") {
  ensureDb(db);
  const targets = reminderTargetsForVirtualClass(db, virtualClass);
  const title = buildReminderEmailSubject(virtualClass, windowKey);
  const message = buildReminderMessage(virtualClass, windowKey);
  const emailProviderMode = resolveEmailProviderMode();
  const emailProviderStatus = getEmailProviderConfigStatus(emailProviderMode);
  const result = {
    smsRecipients: 0,
    smsSent: 0,
    emailRecipients: 0,
    emailSent: 0,
    emailLogged: 0,
    reminderLogs: [],
  };

  if (targets.smsContacts.length && !reminderAlreadyLogged(db, virtualClass.id, windowKey, "sms") && typeof sendCampaignInternal === "function") {
    const smsOutcome = await sendCampaignInternal(db, {
      title,
      messageBody: message,
      recipientType: "custom_list",
      contacts: targets.smsContacts,
    }, actorUserId);

    const reminderLog = {
      id: nanoid(),
      virtualClassId: String(virtualClass.id || ""),
      classSubjectId: String(virtualClass.classSubjectId || virtualClass.classSubject?.id || ""),
      windowKey: String(windowKey || "manual"),
      channel: "sms",
      dispatchMode,
      status: smsOutcome?.error ? "failed" : "sent",
      actorUserId: String(actorUserId || ""),
      recipientCount: targets.smsContacts.length,
      sentCount: smsOutcome?.campaign?.totalSent || 0,
      failedCount: smsOutcome?.campaign?.totalFailed || 0,
      campaignId: String(smsOutcome?.campaign?.id || ""),
      createdAt: now(),
      updatedAt: now(),
      message,
    };
    db.lmsVirtualReminderLogs.unshift(reminderLog);
    result.smsRecipients = targets.smsContacts.length;
    result.smsSent = smsOutcome?.campaign?.totalSent || 0;
    result.reminderLogs.push(reminderLog);
  }

  if (targets.emailContacts.length && !reminderAlreadyLogged(db, virtualClass.id, windowKey, "email")) {
    const emailBatchId = nanoid();
    let emailSentCount = 0;
    let emailLoggedCount = 0;
    let emailFailedCount = 0;

    for (const contact of targets.emailContacts) {
      const body = buildReminderEmailBody(virtualClass, windowKey, contact.name);
      const delivery = await dispatchEmail({
        to: String(contact.email || "").trim(),
        name: String(contact.name || "").trim(),
        subject: title,
        text: body,
      });

      const logStatus = String(delivery.deliveryStatus || "failed").toLowerCase();
      if (logStatus === "sent") emailSentCount += 1;
      else if (logStatus === "logged") emailLoggedCount += 1;
      else emailFailedCount += 1;

      db.lmsVirtualEmailLogs.unshift({
        id: nanoid(),
        batchId: emailBatchId,
        virtualClassId: String(virtualClass.id || ""),
        classSubjectId: String(virtualClass.classSubjectId || virtualClass.classSubject?.id || ""),
        recipientId: String(contact.recipientId || ""),
        recipientType: String(contact.recipientType || "student"),
        recipientName: String(contact.name || "").trim(),
        email: String(contact.email || "").trim(),
        subject: title,
        body,
        status: logStatus,
        provider: String(delivery.provider || emailProviderMode || "SIMULATED"),
        providerMessageId: String(delivery.providerMessageId || ""),
        errorMessage: String(delivery.errorMessage || ""),
        dispatchMode,
        createdAt: now(),
        updatedAt: now(),
      });
    }

    const emailReminderLog = {
      id: nanoid(),
      virtualClassId: String(virtualClass.id || ""),
      classSubjectId: String(virtualClass.classSubjectId || virtualClass.classSubject?.id || ""),
      windowKey: String(windowKey || "manual"),
      channel: "email",
      dispatchMode,
      status: emailSentCount > 0 ? "sent" : emailLoggedCount > 0 ? "logged" : "failed",
      actorUserId: String(actorUserId || ""),
      recipientCount: targets.emailContacts.length,
      sentCount: emailSentCount,
      failedCount: emailFailedCount,
      loggedCount: emailLoggedCount,
      emailBatchId,
      provider: emailProviderMode,
      providerConfigured: emailProviderStatus.isConfigured,
      createdAt: now(),
      updatedAt: now(),
      message: title,
    };
    db.lmsVirtualReminderLogs.unshift(emailReminderLog);
    result.emailRecipients = targets.emailContacts.length;
    result.emailSent = emailSentCount;
    result.emailLogged = emailLoggedCount;
    result.reminderLogs.push(emailReminderLog);
  }

  return result;
}

async function dispatchDueVirtualReminders(db, actorUserId = "", dispatchMode = "auto") {
  ensureDb(db);
  const eligibleRows = (Array.isArray(db.lmsVirtualClasses) ? db.lmsVirtualClasses : [])
    .map((row) => enrichVirtualClass(db, row))
    .filter((row) => String(row.status || "scheduled").toLowerCase() !== "cancelled")
    .filter((row) => String(row.status || "scheduled").toLowerCase() !== "completed")
    .filter((row) => String(row.meetingLink || "").trim());

  const report = {
    triggered: 0,
    smsRecipients: 0,
    smsSent: 0,
    emailRecipients: 0,
    emailSent: 0,
    emailLogged: 0,
  };

  for (const row of eligibleRows) {
    const windows = dueReminderWindows(row);
    for (const windowKey of windows) {
      const outcome = await sendReminderWindow(db, row, windowKey, actorUserId, dispatchMode);
      if (outcome.smsRecipients || outcome.emailRecipients) {
        report.triggered += 1;
        report.smsRecipients += outcome.smsRecipients;
        report.smsSent += outcome.smsSent || 0;
        report.emailRecipients += outcome.emailRecipients;
        report.emailSent += outcome.emailSent || 0;
        report.emailLogged += outcome.emailLogged || 0;
      }
    }
  }

  return report;
}

function escapeCsv(value) {
  const safe = String(value ?? "");
  if (!/[",\n]/.test(safe)) return safe;
  return `"${safe.replace(/"/g, '""')}"`;
}

function buildJoinExportRows(db, joins = []) {
  return joins.map((item) => {
    const representedStudentNames = studentIdsRepresentedByJoin(item)
      .map((studentId) => profile(db, studentId)?.name || "")
      .filter(Boolean);
    return {
      ...item,
      representedStudentNames,
    };
  });
}

function buildJoinExportCsv(db, virtualClass, joins = []) {
  const rows = buildJoinExportRows(db, joins);
  const lines = [
    ["School", "Angel Montessori School"],
    ["Virtual Class", String(virtualClass.title || "")],
    ["Class", String(virtualClass.className || "")],
    ["Subject", String(virtualClass.subjectName || "")],
    ["Schedule", [String(virtualClass.sessionDate || ""), String(virtualClass.startTime || "")].filter(Boolean).join(" at ")],
    ["Attendance", `${Number(virtualClass.attendedStudentCount || 0)} / ${Number(virtualClass.expectedStudentCount || 0)} (${Number(virtualClass.attendanceRate || 0).toFixed(2)}%)`],
    [],
    ["User", "Role", "Access Mode", "Joined At", "Students Covered", "Student Names"],
  ];

  rows.forEach((item) => {
    lines.push([
      item.userName || item.userId || "",
      String(item.role || ""),
      String(item.accessMode || ""),
      String(item.joinedAt || ""),
      String(item.representedStudentCount || 0),
      (item.representedStudentNames || []).join("; "),
    ]);
  });

  return lines.map((row) => row.map((cell) => escapeCsv(cell)).join(",")).join("\r\n");
}

function manualReminderWindow(reqBody = {}, virtualClass) {
  const requested = String(reqBody?.windowKey || "").trim().toLowerCase();
  if (["day_before", "hour_before", "manual"].includes(requested)) return requested;
  const dueWindows = dueReminderWindows(virtualClass);
  return dueWindows[0] || "manual";
}

function getVirtualNotificationsForUser(db, user) {
  ensureDb(db);
  const notifications = Array.isArray(db.lmsVirtualNotifications) ? db.lmsVirtualNotifications : [];

  if (user.role === "STUDENT") {
    const studentId = String(user.studentId || "").trim();
    return notifications
      .filter((row) => String(row.studentId) === studentId)
      .filter((row) => String(row.status || "active") !== "resolved")
      .map((row) => {
        const virtualClass = enrichVirtualClass(db, db.lmsVirtualClasses.find((item) => String(item.id) === String(row.virtualClassId)) || {});
        return {
          ...row,
          virtualClassTitle: virtualClass.title || "",
          className: virtualClass.className || "",
          subjectName: virtualClass.subjectName || "",
          sessionDate: virtualClass.sessionDate || "",
          startTime: virtualClass.startTime || "",
        };
      })
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  }

  if (user.role === "PARENT") {
    const children = parentChildren(db, user);
    const childMap = new Map(children.map((item) => [String(item.id), item]));
    return notifications
      .filter((row) => childMap.has(String(row.studentId || "")))
      .filter((row) => String(row.status || "active") !== "resolved")
      .map((row) => {
        const virtualClass = enrichVirtualClass(db, db.lmsVirtualClasses.find((item) => String(item.id) === String(row.virtualClassId)) || {});
        return {
          ...row,
          childName: childMap.get(String(row.studentId || ""))?.name || "",
          virtualClassTitle: virtualClass.title || "",
          className: virtualClass.className || "",
          subjectName: virtualClass.subjectName || "",
          sessionDate: virtualClass.sessionDate || "",
          startTime: virtualClass.startTime || "",
        };
      })
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  }

  return [];
}

function enrichVirtualClass(db, row) {
  const classSubject = enrichClassSubject(db, db.lmsClassSubjects.find((item) => String(item.id) === String(row.classSubjectId)) || {});
  const joins = db.lmsVirtualClassJoins.filter((item) => String(item.virtualClassId) === String(row.id));
  const participantCount = new Set(joins.map((item) => String(item.userId || "")).filter(Boolean)).size;
  const classStudents = studentsForClass(db, classSubject.classId || row.classId || "", classSubject.className || row.className || "");
  const expectedStudentIds = new Set(classStudents.map((item) => String(item.id || "")).filter(Boolean));
  const attendedStudentIds = new Set();

  joins.forEach((join) => {
    studentIdsRepresentedByJoin(join).forEach((studentId) => {
      if (!expectedStudentIds.size || expectedStudentIds.has(String(studentId))) {
        attendedStudentIds.add(String(studentId));
      }
    });
  });

  const expectedStudentCount = expectedStudentIds.size;
  const attendedStudentCount = attendedStudentIds.size;
  const attendanceRate = expectedStudentCount
    ? Number(((attendedStudentCount / expectedStudentCount) * 100).toFixed(2))
    : 0;
  const startTs = combineDateTime(row.sessionDate, row.startTime);

  return {
    ...row,
    classSubject,
    className: classSubject.className || row.className || "",
    subjectName: classSubject.subjectName || row.subjectName || "",
    sessionName: classSubject.sessionName || row.sessionName || "",
    termName: classSubject.termName || row.termName || "",
    hostTeacherUserId: row.hostTeacherUserId || classSubject.teacherUserId || "",
    hostTeacherName: row.hostTeacherName || classSubject.teacherName || "",
    joinCount: joins.length,
    participantCount,
    expectedStudentCount,
    attendedStudentCount,
    attendanceRate,
    startsAt: startTs || null,
    reminderSummary: buildReminderSummary(db, row.id),
  };
}

function visibleVirtualClasses(db, user) {
  const allowedIds = visibleClassSubjectIds(db, user);
  return db.lmsVirtualClasses
    .filter((item) => allowedIds.has(String(item.classSubjectId)))
    .map((item) => enrichVirtualClass(db, item))
    .filter((item) => {
      if (user.role === "ADMIN" || user.role === "TEACHER") return true;
      return String(item.status || "scheduled").toLowerCase() !== "cancelled";
    })
    .sort((a, b) => {
      const priorityDiff = statusPriority(a.status) - statusPriority(b.status);
      if (priorityDiff !== 0) return priorityDiff;
      return Number(b.startsAt || 0) - Number(a.startsAt || 0);
    });
}

function canAccessVirtualClass(db, user, record) {
  return visibleClassSubjectIds(db, user).has(String(record.classSubjectId));
}

router.use(auth());

router.get("/provider-status", requireRole("ADMIN", "TEACHER"), (req, res) => {
  const config = getEmailProviderConfigStatus();
  res.json({
    providerMode: resolveEmailProviderMode(),
    providerConfigured: config.isConfigured,
    providerConfigIssues: config.missing,
    fallbackToLogOnly: String(process.env.EMAIL_FALLBACK_LOG_ONLY || "true").toLowerCase() !== "false",
    fromEmail: String(process.env.EMAIL_FROM || process.env.SCHOOL_EMAIL || "info@angelmontessori.ng").trim(),
    fromName: String(process.env.EMAIL_FROM_NAME || "Angel Montessori School").trim() || "Angel Montessori School",
  });
});

router.get("/notifications", async (req, res) => {
  const db = loadDb();
  const reminderReport = await dispatchDueVirtualReminders(db, req.user?.id, "auto");
  if (reminderReport.triggered) writeDB(db);
  res.json(getVirtualNotificationsForUser(db, req.user).slice(0, 24));
});

router.get("/", async (req, res) => {
  const db = loadDb();
  const reminderReport = await dispatchDueVirtualReminders(db, req.user?.id, "auto");
  if (reminderReport.triggered) writeDB(db);
  const classSubjectId = String(req.query.classSubjectId || "").trim();
  const status = String(req.query.status || "").trim().toLowerCase();
  const rows = visibleVirtualClasses(db, req.user).filter((item) => {
    if (classSubjectId && String(item.classSubjectId) !== classSubjectId) return false;
    if (status && String(item.status || "").toLowerCase() !== status) return false;
    return true;
  });
  res.json(rows);
});

router.post("/:id/reminders/send", requireRole("ADMIN", "TEACHER"), async (req, res) => {
  const db = loadDb();
  const id = String(req.params.id || "");
  const record = db.lmsVirtualClasses.find((item) => String(item.id) === id);
  if (!record) return res.status(404).json({ message: "Virtual class not found" });

  const classSubject = enrichClassSubject(db, db.lmsClassSubjects.find((item) => String(item.id) === String(record.classSubjectId)) || {});
  if (!classSubject?.id) return res.status(400).json({ message: "Virtual class subject mapping is missing" });
  if (!canManageClassSubject(db, req.user, classSubject)) {
    return res.status(403).json({ message: "You can only send reminders for your assigned virtual classes" });
  }

  const enriched = enrichVirtualClass(db, record);
  const windowKey = manualReminderWindow(req.body || {}, enriched);
  const outcome = await sendReminderWindow(db, enriched, windowKey, req.user?.id, "manual");
  writeDB(db);

  res.json({
    ok: true,
    windowKey,
    smsRecipients: outcome.smsRecipients,
    smsSent: outcome.smsSent || 0,
    emailRecipients: outcome.emailRecipients,
    emailSent: outcome.emailSent || 0,
    emailLogged: outcome.emailLogged || 0,
    reminderSummary: buildReminderSummary(db, id),
  });
});
router.get("/:id/reminder-targets", requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = loadDb();
  const id = String(req.params.id || "");
  const record = db.lmsVirtualClasses.find((item) => String(item.id) === id);
  if (!record) return res.status(404).json({ message: "Virtual class not found" });

  const classSubject = enrichClassSubject(db, db.lmsClassSubjects.find((item) => String(item.id) === String(record.classSubjectId)) || {});
  if (!classSubject?.id) return res.status(400).json({ message: "Virtual class subject mapping is missing" });
  if (!canManageClassSubject(db, req.user, classSubject)) {
    return res.status(403).json({ message: "You can only preview reminder recipients for your assigned virtual classes" });
  }

  const enriched = enrichVirtualClass(db, record);
  res.json(buildReminderTargetsPreview(db, enriched));
});

router.post("/", requireRole("ADMIN", "TEACHER"), async (req, res) => {
  const db = loadDb();
  const classSubjectId = String(req.body?.classSubjectId || "").trim();
  const title = String(req.body?.title || "").trim();
  const sessionDate = String(req.body?.sessionDate || "").trim();
  const startTime = String(req.body?.startTime || "").trim();
  const meetingLink = String(req.body?.meetingLink || "").trim();
  if (!classSubjectId || !title || !sessionDate || !startTime || !meetingLink) {
    return res.status(400).json({ message: "classSubjectId, title, sessionDate, startTime, and meetingLink are required" });
  }

  const classSubject = enrichClassSubject(db, db.lmsClassSubjects.find((item) => String(item.id) === classSubjectId) || {});
  if (!classSubject?.id) return res.status(404).json({ message: "Class subject not found" });
  if (!canManageClassSubject(db, req.user, classSubject)) {
    return res.status(403).json({ message: "You can only schedule virtual classes for your assigned subjects" });
  }

  const record = {
    id: nanoid(),
    classSubjectId,
    title,
    summary: String(req.body?.summary || "").trim(),
    platform: String(req.body?.platform || "google_meet").trim().toLowerCase(),
    meetingLink,
    recordingLink: String(req.body?.recordingLink || "").trim(),
    sessionDate,
    startTime,
    durationMinutes: toInt(req.body?.durationMinutes, 60),
    accessCode: String(req.body?.accessCode || "").trim(),
    hostTeacherUserId: classSubject.teacherUserId || String(req.user.id),
    hostTeacherName: classSubject.teacherName || String(req.user.name || ""),
    status: String(req.body?.status || "scheduled").trim().toLowerCase(),
    createdBy: String(req.user.id),
    createdAt: now(),
    updatedAt: now(),
  };

  db.lmsVirtualClasses.unshift(record);
  const enriched = enrichVirtualClass(db, record);
  const initialType = record.status === "cancelled" ? "session_cancelled" : record.status === "live" ? "session_live" : "session_scheduled";
  emitVirtualClassNotifications(db, enriched, initialType, {
    resolveTypes: ["session_scheduled", "session_updated", "session_live"],
  });
  if (record.recordingLink && record.status !== "cancelled") {
    emitVirtualClassNotifications(db, enriched, "recording_available", {
      resolveTypes: ["session_scheduled", "session_updated", "session_live"],
    });
  }

  await dispatchDueVirtualReminders(db, req.user?.id, "auto");
  writeDB(db);
  res.status(201).json(enrichVirtualClass(db, record));
});

router.patch("/:id", requireRole("ADMIN", "TEACHER"), async (req, res) => {
  const db = loadDb();
  const id = String(req.params.id || "");
  const index = db.lmsVirtualClasses.findIndex((item) => String(item.id) === id);
  if (index < 0) return res.status(404).json({ message: "Virtual class not found" });

  const current = db.lmsVirtualClasses[index];
  const classSubject = enrichClassSubject(db, db.lmsClassSubjects.find((item) => String(item.id) === String(current.classSubjectId)) || {});
  if (!classSubject?.id) return res.status(400).json({ message: "Virtual class subject mapping is missing" });
  if (!canManageClassSubject(db, req.user, classSubject)) {
    return res.status(403).json({ message: "You can only update virtual classes for your assigned subjects" });
  }

  const next = {
    ...current,
    title: req.body?.title !== undefined ? String(req.body?.title || "").trim() : current.title,
    summary: req.body?.summary !== undefined ? String(req.body?.summary || "").trim() : current.summary,
    platform: req.body?.platform !== undefined ? String(req.body?.platform || "google_meet").trim().toLowerCase() : current.platform,
    meetingLink: req.body?.meetingLink !== undefined ? String(req.body?.meetingLink || "").trim() : current.meetingLink,
    recordingLink: req.body?.recordingLink !== undefined ? String(req.body?.recordingLink || "").trim() : current.recordingLink,
    sessionDate: req.body?.sessionDate !== undefined ? String(req.body?.sessionDate || "").trim() : current.sessionDate,
    startTime: req.body?.startTime !== undefined ? String(req.body?.startTime || "").trim() : current.startTime,
    durationMinutes: req.body?.durationMinutes !== undefined ? toInt(req.body?.durationMinutes, current.durationMinutes || 60) : current.durationMinutes,
    accessCode: req.body?.accessCode !== undefined ? String(req.body?.accessCode || "").trim() : current.accessCode,
    status: req.body?.status !== undefined ? String(req.body?.status || current.status).trim().toLowerCase() : current.status,
    updatedAt: now(),
  };

  if (!next.title || !next.sessionDate || !next.startTime || !next.meetingLink) {
    return res.status(400).json({ message: "title, sessionDate, startTime, and meetingLink are required" });
  }

  const statusChanged = String(current.status || "") !== String(next.status || "");
  const recordingAdded = !String(current.recordingLink || "").trim() && Boolean(String(next.recordingLink || "").trim());
  const scheduleChanged =
    String(current.sessionDate || "") !== String(next.sessionDate || "") ||
    String(current.startTime || "") !== String(next.startTime || "") ||
    String(current.meetingLink || "") !== String(next.meetingLink || "") ||
    String(current.accessCode || "") !== String(next.accessCode || "");
  const summaryChanged =
    String(current.title || "") !== String(next.title || "") ||
    String(current.summary || "") !== String(next.summary || "");

  db.lmsVirtualClasses[index] = next;
  const enriched = enrichVirtualClass(db, next);

  if (statusChanged && next.status === "cancelled") {
    emitVirtualClassNotifications(db, enriched, "session_cancelled", {
      resolveTypes: ["session_scheduled", "session_updated", "session_live", "recording_available"],
    });
  } else if (recordingAdded) {
    emitVirtualClassNotifications(db, enriched, "recording_available", {
      resolveTypes: ["session_scheduled", "session_updated", "session_live"],
    });
  } else if (statusChanged && next.status === "live") {
    emitVirtualClassNotifications(db, enriched, "session_live", {
      resolveTypes: ["session_scheduled", "session_updated", "session_live"],
    });
  } else if (scheduleChanged || summaryChanged) {
    emitVirtualClassNotifications(db, enriched, "session_updated", {
      resolveTypes: ["session_scheduled", "session_updated"],
    });
  }

  await dispatchDueVirtualReminders(db, req.user?.id, "auto");
  writeDB(db);
  res.json(enrichVirtualClass(db, next));
});

router.post("/:id/join", (req, res) => {
  const db = loadDb();
  const id = String(req.params.id || "");
  const record = db.lmsVirtualClasses.find((item) => String(item.id) === id);
  if (!record) return res.status(404).json({ message: "Virtual class not found" });
  if (!canAccessVirtualClass(db, req.user, record)) {
    return res.status(403).json({ message: "You can only access virtual classes assigned to your class or teaching desk" });
  }

  const mode = String(req.body?.accessMode || "live").trim().toLowerCase();
  const accessUrl = mode === "recording" ? String(record.recordingLink || "").trim() : String(record.meetingLink || "").trim();
  if (!accessUrl) {
    return res.status(400).json({ message: mode === "recording" ? "Recording link is not available yet" : "Meeting link is not available" });
  }

  const joinRecord = {
    id: nanoid(),
    virtualClassId: id,
    userId: String(req.user.id),
    role: String(req.user.role || ""),
    studentId: req.user.role === "STUDENT" ? String(req.user.studentId || "") : "",
    childIds: req.user.role === "PARENT" ? parentChildren(db, req.user).map((item) => item.id) : [],
    accessMode: mode,
    joinedAt: now(),
    createdAt: now(),
    updatedAt: now(),
  };

  db.lmsVirtualClassJoins.unshift(joinRecord);
  writeDB(db);
  res.json({
    accessUrl,
    accessMode: mode,
    virtualClass: enrichVirtualClass(db, record),
  });
});

router.get("/:id/joins/export", requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = loadDb();
  const id = String(req.params.id || "");
  const record = db.lmsVirtualClasses.find((item) => String(item.id) === id);
  if (!record) return res.status(404).json({ message: "Virtual class not found" });

  const classSubject = enrichClassSubject(db, db.lmsClassSubjects.find((item) => String(item.id) === String(record.classSubjectId)) || {});
  if (!classSubject?.id) return res.status(400).json({ message: "Virtual class subject mapping is missing" });
  if (!canManageClassSubject(db, req.user, classSubject)) {
    return res.status(403).json({ message: "You can only export attendance for your assigned virtual classes" });
  }

  const joins = db.lmsVirtualClassJoins
    .filter((item) => String(item.virtualClassId) === id)
    .map((item) => ({
      ...item,
      userName: usr(db, item.userId)?.name || "",
      representedStudentCount: studentIdsRepresentedByJoin(item).length,
      representedStudentNames: studentIdsRepresentedByJoin(item)
        .map((studentId) => profile(db, studentId)?.name || "")
        .filter(Boolean),
    }))
    .sort((a, b) => String(b.joinedAt || "").localeCompare(String(a.joinedAt || "")));

  const csv = buildJoinExportCsv(db, enrichVirtualClass(db, record), joins);
  const baseName = String(record.title || "virtual-class-attendance").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "virtual-class-attendance";
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${baseName}-attendance.csv"`);
  res.send(csv);
});

router.get("/:id/joins", requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = loadDb();
  const id = String(req.params.id || "");
  const record = db.lmsVirtualClasses.find((item) => String(item.id) === id);
  if (!record) return res.status(404).json({ message: "Virtual class not found" });

  const classSubject = enrichClassSubject(db, db.lmsClassSubjects.find((item) => String(item.id) === String(record.classSubjectId)) || {});
  if (!classSubject?.id) return res.status(400).json({ message: "Virtual class subject mapping is missing" });
  if (!canManageClassSubject(db, req.user, classSubject)) {
    return res.status(403).json({ message: "You can only view join records for your assigned virtual classes" });
  }

  const joins = db.lmsVirtualClassJoins
    .filter((item) => String(item.virtualClassId) === id)
    .map((item) => ({
      ...item,
      userName: usr(db, item.userId)?.name || "",
      representedStudentCount: studentIdsRepresentedByJoin(item).length,
      representedStudentNames: studentIdsRepresentedByJoin(item)
        .map((studentId) => profile(db, studentId)?.name || "")
        .filter(Boolean),
    }))
    .sort((a, b) => String(b.joinedAt || "").localeCompare(String(a.joinedAt || "")));

  res.json(joins);
});

module.exports = router;


















