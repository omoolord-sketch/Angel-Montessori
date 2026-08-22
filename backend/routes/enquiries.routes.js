const express = require("express");
const { randomUUID } = require("crypto");
const { auth, requireRole } = require("../middleware/auth");
const { createRateLimiter } = require("../middleware/rateLimit");
const { readDB, writeDB } = require("../lib/jsonStore");
const { dispatchEmail } = require("../lib/emailService");

const router = express.Router();

const ENQUIRY_COLLECTIONS = [
  "contactEnquiries",
  "enquiryReplies",
  "enquiryStatusLogs",
  "callbackRequests",
  "visitRequests",
  "enquiryAssignments",
  "enquiryAttachments",
  "enquiryTemplates",
  "enquiryAuditLogs",
];

const STAFF_ROLES = ["ADMIN", "SUPER_ADMIN", "ICT_ADMIN", "ADMISSION_OFFICER", "FINANCE_OFFICER"];
const STATUS_FLOW = ["new", "in_progress", "replied", "closed", "spam"];
const PRIORITY_OPTIONS = ["low", "normal", "high", "urgent"];
const ENQUIRY_TYPES = ["general", "admission", "fees", "transport", "academics", "result_support", "partnership", "complaint", "callback_request", "visit_request"];
const CALLBACK_STATUSES = ["pending", "called", "unreachable", "completed"];
const VISIT_STATUSES = ["pending", "scheduled", "completed", "cancelled"];
const REPLY_CHANNELS = ["email", "phone", "whatsapp", "sms", "portal_note"];

const publicLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 8,
  keyPrefix: "public-enquiry",
  message: "Too many enquiry submissions. Please try again later.",
});

function ensureEnquiryCollections(db) {
  for (const key of ENQUIRY_COLLECTIONS) {
    if (!Array.isArray(db[key])) db[key] = [];
  }
  return db;
}

function createId(prefix) {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

function safeString(value) {
  return String(value || "").trim();
}

function safeLower(value) {
  return safeString(value).toLowerCase();
}

function safeDateKey(value = new Date().toISOString()) {
  return safeString(value).slice(0, 10);
}

function timestamp() {
  return new Date().toISOString();
}

function normalizePhone(value) {
  return safeString(value).replace(/\s+/g, " ");
}

function ensureValidOption(value, allowed, fallback) {
  const normalized = safeLower(value);
  return allowed.includes(normalized) ? normalized : fallback;
}

function createEnquiryNumber(db) {
  ensureEnquiryCollections(db);
  const count = (db.contactEnquiries || []).length + 1;
  return `ENQ-${String(count).padStart(5, "0")}`;
}

function getClassOptions(db) {
  const classRows = Array.isArray(db.classes) ? db.classes : [];
  const reportClassRows = Array.isArray(db.reportCardClasses) ? db.reportCardClasses : [];
  const names = classRows.map((row) => safeString(row.className || row.name)).filter(Boolean);
  const fallbackNames = reportClassRows.map((row) => safeString(row.className || row.name)).filter(Boolean);
  const merged = [...names, ...fallbackNames];
  return Array.from(new Set(merged));
}

function getUsersMap(db) {
  const users = Array.isArray(db.users) ? db.users : [];
  return new Map(users.map((row) => [String(row.id), row]));
}

function getStaffOptions(db) {
  const users = Array.isArray(db.users) ? db.users : [];
  return users
    .filter((row) => STAFF_ROLES.includes(String(row.role || "").toUpperCase()))
    .map((row) => ({
      id: String(row.id),
      name: safeString(row.name || row.username),
      role: safeString(row.role).toUpperCase(),
    }));
}

function getPublicConfig(db) {
  return {
    office: {
      phone: "+234 803 506 7767",
      whatsapp: "+234 803 506 7767",
      email: "info@angelmontessori.ng",
      admissionsEmail: "admissions@angelmontessori.ng",
      address: "152 Okedogbon Road, Owo, Ondo State, Nigeria",
      officeHours: "Monday - Friday, 8:00 AM - 4:00 PM",
    },
    enquiryTypes: ENQUIRY_TYPES,
    classOptions: getClassOptions(db),
    callbackReasons: ["admission enquiry", "fees enquiry", "school visit", "general enquiry", "support request"],
    callbackTimes: ["Morning", "Afternoon", "Evening"],
    faq: [
      {
        question: "How quickly does the school respond to enquiries?",
        answer: "Most enquiries are reviewed within one business day, while urgent admissions and visit requests are prioritized sooner.",
      },
      {
        question: "Can I request a school visit before applying?",
        answer: "Yes. Use the visit request form to suggest a date and time, and the admissions team will confirm availability.",
      },
      {
        question: "Can I ask about fees and transport from the same portal?",
        answer: "Yes. Choose the correct enquiry type and the request will be routed to the right staff desk.",
      },
    ],
    visitGuidance: [
      "Bring a valid phone number so the admissions desk can confirm your visit.",
      "Parents can request admission, fee, and transport information during the visit.",
      "Confirmed visits are usually scheduled within office hours on school days.",
    ],
  };
}

function labelize(value) {
  return safeString(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function getEnquiryNotificationEmail(db) {
  return safeString(
    process.env.ENQUIRY_NOTIFICATION_EMAIL
    || process.env.SCHOOL_EMAIL
    || process.env.EMAIL_FROM
    || getPublicConfig(db)?.office?.email
  );
}

function buildEnquiryNotificationSubject(enquiry) {
  return `[${labelize(enquiry.enquiryType) || "General"}] ${safeString(enquiry.subject) || "New enquiry"} (${safeString(enquiry.enquiryNumber)})`;
}

function buildEnquiryNotificationText(enquiry) {
  return [
    "A new public enquiry was received from the website.",
    "",
    `Reference: ${safeString(enquiry.enquiryNumber)}`,
    `Type: ${labelize(enquiry.enquiryType) || "-"}`,
    `Name: ${safeString(enquiry.fullName) || "-"}`,
    `Phone: ${safeString(enquiry.phone) || "-"}`,
    `Email: ${safeString(enquiry.email) || "-"}`,
    `Intended Class: ${safeString(enquiry.intendedClass) || "-"}`,
    `Subject: ${safeString(enquiry.subject) || "-"}`,
    `Source Page: ${safeString(enquiry.sourcePage) || "-"}`,
    "",
    "Message:",
    safeString(enquiry.message) || "-",
  ].join("\n");
}

function buildEnquiryAcknowledgementSubject(enquiry) {
  return `${labelize(enquiry.enquiryType) || "Enquiry"} received - ${safeString(enquiry.enquiryNumber)}`;
}

function buildEnquiryAcknowledgementText(enquiry) {
  return [
    `Hello ${safeString(enquiry.fullName) || "there"},`,
    "",
    "Thank you for contacting Angel Montessori School.",
    `We have received your ${safeLower(labelize(enquiry.enquiryType) || "enquiry")}.`,
    "",
    `Reference: ${safeString(enquiry.enquiryNumber)}`,
    `Subject: ${safeString(enquiry.subject) || "-"}`,
    "",
    "A member of the school team will follow up with you shortly.",
    "",
    "Angel Montessori School",
  ].join("\n");
}

async function sendEnquiryEmails(db, enquiry) {
  const jobs = [];
  const notificationEmail = getEnquiryNotificationEmail(db);
  if (notificationEmail) {
    jobs.push(dispatchEmail({
      to: notificationEmail,
      subject: buildEnquiryNotificationSubject(enquiry),
      text: buildEnquiryNotificationText(enquiry),
    }));
  }

  const senderEmail = safeString(enquiry.email);
  const sendAcknowledgement = String(process.env.ENQUIRY_SEND_ACK || "true").toLowerCase() !== "false";
  if (senderEmail && senderEmail.includes("@") && sendAcknowledgement) {
    jobs.push(dispatchEmail({
      to: senderEmail,
      name: safeString(enquiry.fullName),
      subject: buildEnquiryAcknowledgementSubject(enquiry),
      text: buildEnquiryAcknowledgementText(enquiry),
    }));
  }

  if (!jobs.length) return [];
  return Promise.allSettled(jobs);
}

function logAudit(db, enquiryId, userId, action, metadata = {}) {
  ensureEnquiryCollections(db);
  db.enquiryAuditLogs.unshift({
    id: createId("enquiry-audit"),
    enquiryId: safeString(enquiryId),
    userId: safeString(userId),
    action: safeString(action),
    metadata,
    createdAt: timestamp(),
  });
}

function logStatusChange(db, enquiryId, oldStatus, newStatus, changedBy, note = "") {
  ensureEnquiryCollections(db);
  db.enquiryStatusLogs.unshift({
    id: createId("enquiry-status"),
    enquiryId: safeString(enquiryId),
    oldStatus: safeLower(oldStatus),
    newStatus: safeLower(newStatus),
    changedBy: safeString(changedBy),
    note: safeString(note),
    createdAt: timestamp(),
  });
}

function createAssignmentLog(db, enquiryId, assignedTo, assignedBy) {
  ensureEnquiryCollections(db);
  db.enquiryAssignments.unshift({
    id: createId("enquiry-assign"),
    enquiryId: safeString(enquiryId),
    assignedTo: safeString(assignedTo),
    assignedBy: safeString(assignedBy),
    assignedAt: timestamp(),
    createdAt: timestamp(),
    updatedAt: timestamp(),
  });
}

function buildEnquiryDetail(db, enquiry) {
  ensureEnquiryCollections(db);
  const usersMap = getUsersMap(db);
  const replies = (db.enquiryReplies || [])
    .filter((row) => String(row.enquiryId) === String(enquiry.id))
    .map((row) => ({
      ...row,
      repliedByName: safeString(usersMap.get(String(row.repliedBy))?.name || usersMap.get(String(row.repliedBy))?.username || "System"),
    }));

  const statusLogs = (db.enquiryStatusLogs || [])
    .filter((row) => String(row.enquiryId) === String(enquiry.id))
    .map((row) => ({
      ...row,
      changedByName: safeString(usersMap.get(String(row.changedBy))?.name || usersMap.get(String(row.changedBy))?.username || "System"),
    }));

  const assignments = (db.enquiryAssignments || [])
    .filter((row) => String(row.enquiryId) === String(enquiry.id))
    .map((row) => ({
      ...row,
      assignedToName: safeString(usersMap.get(String(row.assignedTo))?.name || usersMap.get(String(row.assignedTo))?.username || ""),
      assignedByName: safeString(usersMap.get(String(row.assignedBy))?.name || usersMap.get(String(row.assignedBy))?.username || "System"),
    }));

  const callback = (db.callbackRequests || []).find((row) => String(row.enquiryId) === String(enquiry.id)) || null;
  const visit = (db.visitRequests || []).find((row) => String(row.enquiryId) === String(enquiry.id)) || null;
  const assignee = usersMap.get(String(enquiry.assignedTo || ""));

  return {
    ...enquiry,
    assignedToName: safeString(assignee?.name || assignee?.username || ""),
    replies,
    statusLogs,
    assignments,
    callback,
    visit,
  };
}

function roleScopeAllows(role, enquiry) {
  const normalizedRole = safeString(role).toUpperCase();
  const type = safeLower(enquiry.enquiryType);

  if (["ADMIN", "SUPER_ADMIN"].includes(normalizedRole)) return true;
  if (normalizedRole === "ADMISSION_OFFICER") return ["admission", "visit_request", "callback_request", "general"].includes(type);
  if (normalizedRole === "FINANCE_OFFICER") return ["fees"].includes(type);
  if (normalizedRole === "ICT_ADMIN") return ["result_support", "general", "complaint"].includes(type);
  return false;
}

function filterEnquiriesForUser(db, user, query = {}) {
  ensureEnquiryCollections(db);
  const all = db.contactEnquiries || [];
  const base = all.filter((row) => roleScopeAllows(user?.role, row));
  const search = safeLower(query.search);
  const type = safeLower(query.type);
  const status = safeLower(query.status);
  const priority = safeLower(query.priority);
  const assignedTo = safeString(query.assignedTo);
  const sourcePage = safeLower(query.sourcePage);
  const dateFrom = safeString(query.dateFrom);
  const dateTo = safeString(query.dateTo);
  const tab = safeLower(query.tab);

  return base.filter((row) => {
    const createdDate = safeDateKey(row.createdAt);
    if (type && safeLower(row.enquiryType) !== type) return false;
    if (status && safeLower(row.status) !== status) return false;
    if (priority && safeLower(row.priority) !== priority) return false;
    if (assignedTo && String(row.assignedTo || "") !== assignedTo) return false;
    if (sourcePage && safeLower(row.sourcePage) !== sourcePage) return false;
    if (dateFrom && createdDate < dateFrom) return false;
    if (dateTo && createdDate > dateTo) return false;
    if (tab === "callbacks" && safeLower(row.enquiryType) !== "callback_request") return false;
    if (tab === "visits" && safeLower(row.enquiryType) !== "visit_request") return false;
    if (search) {
      const haystack = [
        row.enquiryNumber,
        row.fullName,
        row.phone,
        row.email,
        row.subject,
        row.message,
        row.intendedClass,
      ].map((value) => safeLower(value)).join(" ");
      if (!haystack.includes(search)) return false;
    }
    return true;
  }).sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

function avgResponseHours(db, enquiries) {
  const replyMap = new Map();
  for (const reply of db.enquiryReplies || []) {
    const key = String(reply.enquiryId);
    const existing = replyMap.get(key);
    if (!existing || String(reply.createdAt).localeCompare(String(existing.createdAt)) < 0) {
      replyMap.set(key, reply);
    }
  }

  const values = enquiries
    .map((row) => {
      const reply = replyMap.get(String(row.id));
      if (!reply) return null;
      const diff = new Date(reply.createdAt).getTime() - new Date(row.createdAt).getTime();
      if (!Number.isFinite(diff) || diff < 0) return null;
      return diff / (1000 * 60 * 60);
    })
    .filter((value) => value !== null);

  if (values.length === 0) return 0;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
}

function buildDashboard(db, user) {
  const enquiries = filterEnquiriesForUser(db, user, {});
  const callbacks = (db.callbackRequests || []).filter((row) => {
    const enquiry = (db.contactEnquiries || []).find((item) => String(item.id) === String(row.enquiryId));
    return enquiry && roleScopeAllows(user?.role, enquiry);
  });
  const visits = (db.visitRequests || []).filter((row) => {
    const enquiry = (db.contactEnquiries || []).find((item) => String(item.id) === String(row.enquiryId));
    return enquiry && roleScopeAllows(user?.role, enquiry);
  });

  return {
    summary: {
      newEnquiries: enquiries.filter((row) => safeLower(row.status) === "new").length,
      inProgress: enquiries.filter((row) => safeLower(row.status) === "in_progress").length,
      replied: enquiries.filter((row) => safeLower(row.status) === "replied").length,
      closed: enquiries.filter((row) => safeLower(row.status) === "closed").length,
      callbackPending: callbacks.filter((row) => safeLower(row.callbackStatus) === "pending").length,
      visitPending: visits.filter((row) => safeLower(row.visitStatus) === "pending").length,
      avgResponseHours: avgResponseHours(db, enquiries),
    },
    recentEnquiries: enquiries.slice(0, 8).map((row) => ({
      id: row.id,
      enquiryNumber: row.enquiryNumber,
      fullName: row.fullName,
      enquiryType: row.enquiryType,
      status: row.status,
      priority: row.priority,
      subject: row.subject,
      createdAt: row.createdAt,
    })),
  };
}

function buildReports(db, user) {
  const enquiries = filterEnquiriesForUser(db, user, {});
  const byType = ENQUIRY_TYPES.map((type) => ({
    type,
    count: enquiries.filter((row) => safeLower(row.enquiryType) === type).length,
  })).filter((row) => row.count > 0);
  const byStatus = STATUS_FLOW.map((status) => ({
    status,
    count: enquiries.filter((row) => safeLower(row.status) === status).length,
  }));
  const bySource = Array.from(
    enquiries.reduce((map, row) => {
      const key = safeLower(row.sourcePage || "unknown") || "unknown";
      map.set(key, (map.get(key) || 0) + 1);
      return map;
    }, new Map()).entries(),
  ).map(([sourcePage, count]) => ({ sourcePage, count }));

  const visitRequests = (db.visitRequests || []).filter((row) => {
    const enquiry = (db.contactEnquiries || []).find((item) => String(item.id) === String(row.enquiryId));
    return enquiry && roleScopeAllows(user?.role, enquiry);
  });
  const callbackRequests = (db.callbackRequests || []).filter((row) => {
    const enquiry = (db.contactEnquiries || []).find((item) => String(item.id) === String(row.enquiryId));
    return enquiry && roleScopeAllows(user?.role, enquiry);
  });

  return {
    totalEnquiries: enquiries.length,
    avgResponseHours: avgResponseHours(db, enquiries),
    byType,
    byStatus,
    bySource,
    callbackCompletionRate: callbackRequests.length
      ? Number(((callbackRequests.filter((row) => safeLower(row.callbackStatus) === "completed").length / callbackRequests.length) * 100).toFixed(1))
      : 0,
    visitSchedulingRate: visitRequests.length
      ? Number(((visitRequests.filter((row) => ["scheduled", "completed"].includes(safeLower(row.visitStatus))).length / visitRequests.length) * 100).toFixed(1))
      : 0,
  };
}

function requireContactDetails({ fullName, phone, email }) {
  if (!safeString(fullName)) return "Full name is required";
  if (!safeString(phone) && !safeString(email)) return "Phone or email is required";
  return "";
}

function createBaseEnquiry(db, payload) {
  ensureEnquiryCollections(db);
  const now = timestamp();
  const enquiry = {
    id: createId("enquiry"),
    enquiryNumber: createEnquiryNumber(db),
    fullName: safeString(payload.fullName),
    phone: normalizePhone(payload.phone),
    email: safeString(payload.email),
    enquiryType: ensureValidOption(payload.enquiryType, ENQUIRY_TYPES, "general"),
    intendedClass: safeString(payload.intendedClass),
    subject: safeString(payload.subject),
    message: safeString(payload.message),
    sourcePage: safeLower(payload.sourcePage) || "contact_page",
    status: "new",
    priority: ensureValidOption(payload.priority, PRIORITY_OPTIONS, "normal"),
    assignedTo: safeString(payload.assignedTo),
    repliedAt: "",
    closedAt: "",
    createdAt: now,
    updatedAt: now,
  };
  db.contactEnquiries.unshift(enquiry);
  logStatusChange(db, enquiry.id, "", "new", payload.createdBy || "public", "Enquiry created");
  logAudit(db, enquiry.id, payload.createdBy || "public", "enquiry_created", {
    enquiryType: enquiry.enquiryType,
    sourcePage: enquiry.sourcePage,
  });
  return enquiry;
}

function defaultTemplates() {
  return [
    {
      id: "template-admission-response",
      templateName: "Admission Response",
      enquiryType: "admission",
      subjectLine: "Admissions enquiry received",
      messageBody: "Thank you for contacting Angel Montessori School. Our admissions desk will share the admission process, class availability, and next steps with you shortly.",
      isActive: true,
      createdAt: "",
      updatedAt: "",
    },
    {
      id: "template-fees-response",
      templateName: "Fees Response",
      enquiryType: "fees",
      subjectLine: "Fees enquiry received",
      messageBody: "Thank you for your enquiry. Our accounts team will review your request and send the current fee guidance as soon as possible.",
      isActive: true,
      createdAt: "",
      updatedAt: "",
    },
    {
      id: "template-visit-response",
      templateName: "Visit Confirmation",
      enquiryType: "visit_request",
      subjectLine: "School visit request received",
      messageBody: "Thank you for your visit request. The admissions office will confirm the visit date and time shortly.",
      isActive: true,
      createdAt: "",
      updatedAt: "",
    },
  ];
}

router.get("/public/config", (req, res) => {
  const db = ensureEnquiryCollections(readDB());
  res.json(getPublicConfig(db));
});

router.post("/public/submit", publicLimiter, async (req, res) => {
  const db = ensureEnquiryCollections(readDB());
  const body = req.body || {};
  const validationError = requireContactDetails(body) || (!safeString(body.message) ? "Message is required" : "") || (!safeString(body.enquiryType) ? "Enquiry type is required" : "");
  if (validationError) return res.status(400).json({ message: validationError });
  if (["admission", "visit_request"].includes(safeLower(body.enquiryType)) && !safeString(body.intendedClass)) {
    return res.status(400).json({ message: "Intended class is required for this enquiry type" });
  }

  const enquiry = createBaseEnquiry(db, {
    ...body,
    sourcePage: safeLower(body.sourcePage) || "contact_page",
  });
  writeDB(db);
  await sendEnquiryEmails(db, enquiry);
  return res.status(201).json({
    message: "Your enquiry has been received.",
    enquiry: buildEnquiryDetail(db, enquiry),
  });
});

router.post("/public/admissions", publicLimiter, async (req, res) => {
  const db = ensureEnquiryCollections(readDB());
  const body = req.body || {};
  const validationError = requireContactDetails(body) || (!safeString(body.intendedClass) ? "Intended class is required" : "") || (!safeString(body.message) ? "Message is required" : "");
  if (validationError) return res.status(400).json({ message: validationError });

  const enquiry = createBaseEnquiry(db, {
    ...body,
    enquiryType: "admission",
    subject: safeString(body.subject) || "Admission enquiry",
    sourcePage: "admissions_page",
    priority: body.priority || "high",
  });
  writeDB(db);
  await sendEnquiryEmails(db, enquiry);
  return res.status(201).json({ message: "Admissions enquiry received.", enquiry: buildEnquiryDetail(db, enquiry) });
});

router.post("/public/callback", publicLimiter, async (req, res) => {
  const db = ensureEnquiryCollections(readDB());
  const body = req.body || {};
  const validationError = requireContactDetails(body) || (!safeString(body.phone) ? "Phone number is required for callback requests" : "");
  if (validationError) return res.status(400).json({ message: validationError });

  const enquiry = createBaseEnquiry(db, {
    ...body,
    enquiryType: "callback_request",
    subject: safeString(body.subject) || "Callback request",
    message: safeString(body.message) || safeString(body.reasonForCallback),
    sourcePage: "callback_form",
  });

  db.callbackRequests.unshift({
    id: createId("callback"),
    enquiryId: enquiry.id,
    preferredCallTime: safeString(body.preferredCallTime),
    callbackStatus: "pending",
    calledBy: "",
    calledAt: "",
    outcomeNote: "",
    createdAt: timestamp(),
    updatedAt: timestamp(),
  });
  logAudit(db, enquiry.id, "public", "callback_logged", { preferredCallTime: safeString(body.preferredCallTime) });
  writeDB(db);
  await sendEnquiryEmails(db, enquiry);
  return res.status(201).json({ message: "Callback request received.", enquiry: buildEnquiryDetail(db, enquiry) });
});

router.post("/public/visit", publicLimiter, async (req, res) => {
  const db = ensureEnquiryCollections(readDB());
  const body = req.body || {};
  const validationError = requireContactDetails(body) || (!safeString(body.intendedClass) ? "Interested class level is required" : "") || (!safeString(body.preferredVisitDate) ? "Preferred visit date is required" : "");
  if (validationError) return res.status(400).json({ message: validationError });

  const enquiry = createBaseEnquiry(db, {
    ...body,
    enquiryType: "visit_request",
    subject: safeString(body.subject) || "School visit request",
    sourcePage: "visit_form",
    priority: body.priority || "high",
  });

  db.visitRequests.unshift({
    id: createId("visit"),
    enquiryId: enquiry.id,
    preferredVisitDate: safeString(body.preferredVisitDate),
    preferredVisitTime: safeString(body.preferredVisitTime),
    numberOfVisitors: Number(body.numberOfVisitors || 1),
    visitStatus: "pending",
    confirmedBy: "",
    confirmedAt: "",
    visitNote: "",
    createdAt: timestamp(),
    updatedAt: timestamp(),
  });
  logAudit(db, enquiry.id, "public", "visit_scheduled", {
    preferredVisitDate: safeString(body.preferredVisitDate),
    preferredVisitTime: safeString(body.preferredVisitTime),
  });
  writeDB(db);
  await sendEnquiryEmails(db, enquiry);
  return res.status(201).json({ message: "Visit request received.", enquiry: buildEnquiryDetail(db, enquiry) });
});

router.get("/dashboard", auth(), requireRole(...STAFF_ROLES), (req, res) => {
  const db = ensureEnquiryCollections(readDB());
  res.json(buildDashboard(db, req.user));
});

router.get("/reports", auth(), requireRole(...STAFF_ROLES), (req, res) => {
  const db = ensureEnquiryCollections(readDB());
  res.json(buildReports(db, req.user));
});

router.get("/templates", auth(), requireRole(...STAFF_ROLES), (req, res) => {
  const db = ensureEnquiryCollections(readDB());
  const templates = (db.enquiryTemplates || []).length ? db.enquiryTemplates : defaultTemplates();
  res.json({ templates });
});

router.post("/templates", auth(), requireRole(...STAFF_ROLES), (req, res) => {
  const db = ensureEnquiryCollections(readDB());
  const body = req.body || {};
  if (!safeString(body.templateName) || !safeString(body.messageBody)) {
    return res.status(400).json({ message: "templateName and messageBody are required" });
  }

  const template = {
    id: createId("enquiry-template"),
    templateName: safeString(body.templateName),
    enquiryType: ensureValidOption(body.enquiryType, ENQUIRY_TYPES, "general"),
    subjectLine: safeString(body.subjectLine),
    messageBody: safeString(body.messageBody),
    isActive: body.isActive !== false,
    createdAt: timestamp(),
    updatedAt: timestamp(),
  };
  db.enquiryTemplates.unshift(template);
  writeDB(db);
  res.status(201).json({ template });
});

router.get("/callbacks", auth(), requireRole(...STAFF_ROLES), (req, res) => {
  const db = ensureEnquiryCollections(readDB());
  const enquiries = filterEnquiriesForUser(db, req.user, { tab: "callbacks", ...req.query });
  const callbackMap = new Map((db.callbackRequests || []).map((row) => [String(row.enquiryId), row]));
  res.json({
    callbacks: enquiries.map((enquiry) => ({
      enquiry: buildEnquiryDetail(db, enquiry),
      callback: callbackMap.get(String(enquiry.id)) || null,
    })),
  });
});

router.patch("/callbacks/:id", auth(), requireRole(...STAFF_ROLES), (req, res) => {
  const db = ensureEnquiryCollections(readDB());
  const callback = (db.callbackRequests || []).find((row) => String(row.id) === String(req.params.id));
  if (!callback) return res.status(404).json({ message: "Callback request not found" });

  const enquiry = (db.contactEnquiries || []).find((row) => String(row.id) === String(callback.enquiryId));
  if (!enquiry || !roleScopeAllows(req.user?.role, enquiry)) return res.status(404).json({ message: "Callback request not found" });

  const nextStatus = ensureValidOption(req.body?.callbackStatus, CALLBACK_STATUSES, safeLower(callback.callbackStatus || "pending"));
  callback.preferredCallTime = safeString(req.body?.preferredCallTime) || callback.preferredCallTime;
  callback.callbackStatus = nextStatus;
  callback.calledBy = nextStatus === "pending" ? safeString(callback.calledBy) : safeString(req.user?.id);
  callback.calledAt = nextStatus === "pending" ? safeString(callback.calledAt) : timestamp();
  callback.outcomeNote = safeString(req.body?.outcomeNote) || callback.outcomeNote;
  callback.updatedAt = timestamp();

  if (["called", "completed"].includes(nextStatus) && safeLower(enquiry.status) === "new") {
    const oldStatus = enquiry.status;
    enquiry.status = "in_progress";
    enquiry.updatedAt = timestamp();
    logStatusChange(db, enquiry.id, oldStatus, enquiry.status, req.user?.id, "Callback action updated enquiry status");
  }

  logAudit(db, enquiry.id, req.user?.id, "callback_logged", { callbackStatus: nextStatus });
  writeDB(db);
  res.json({ callback, enquiry: buildEnquiryDetail(db, enquiry) });
});

router.get("/visits", auth(), requireRole(...STAFF_ROLES), (req, res) => {
  const db = ensureEnquiryCollections(readDB());
  const enquiries = filterEnquiriesForUser(db, req.user, { tab: "visits", ...req.query });
  const visitMap = new Map((db.visitRequests || []).map((row) => [String(row.enquiryId), row]));
  res.json({
    visits: enquiries.map((enquiry) => ({
      enquiry: buildEnquiryDetail(db, enquiry),
      visit: visitMap.get(String(enquiry.id)) || null,
    })),
  });
});

router.patch("/visits/:id", auth(), requireRole(...STAFF_ROLES), (req, res) => {
  const db = ensureEnquiryCollections(readDB());
  const visit = (db.visitRequests || []).find((row) => String(row.id) === String(req.params.id));
  if (!visit) return res.status(404).json({ message: "Visit request not found" });

  const enquiry = (db.contactEnquiries || []).find((row) => String(row.id) === String(visit.enquiryId));
  if (!enquiry || !roleScopeAllows(req.user?.role, enquiry)) return res.status(404).json({ message: "Visit request not found" });

  const nextStatus = ensureValidOption(req.body?.visitStatus, VISIT_STATUSES, safeLower(visit.visitStatus || "pending"));
  visit.preferredVisitDate = safeString(req.body?.preferredVisitDate) || visit.preferredVisitDate;
  visit.preferredVisitTime = safeString(req.body?.preferredVisitTime) || visit.preferredVisitTime;
  visit.numberOfVisitors = Number(req.body?.numberOfVisitors || visit.numberOfVisitors || 1);
  visit.visitStatus = nextStatus;
  visit.confirmedBy = ["scheduled", "completed"].includes(nextStatus) ? safeString(req.user?.id) : safeString(visit.confirmedBy);
  visit.confirmedAt = ["scheduled", "completed"].includes(nextStatus) ? timestamp() : safeString(visit.confirmedAt);
  visit.visitNote = safeString(req.body?.visitNote) || visit.visitNote;
  visit.updatedAt = timestamp();

  if (["scheduled", "completed"].includes(nextStatus) && safeLower(enquiry.status) === "new") {
    const oldStatus = enquiry.status;
    enquiry.status = "in_progress";
    enquiry.updatedAt = timestamp();
    logStatusChange(db, enquiry.id, oldStatus, enquiry.status, req.user?.id, "Visit action updated enquiry status");
  }

  logAudit(db, enquiry.id, req.user?.id, "visit_scheduled", { visitStatus: nextStatus });
  writeDB(db);
  res.json({ visit, enquiry: buildEnquiryDetail(db, enquiry) });
});

router.get("/", auth(), requireRole(...STAFF_ROLES), (req, res) => {
  const db = ensureEnquiryCollections(readDB());
  const enquiries = filterEnquiriesForUser(db, req.user, req.query).map((row) => buildEnquiryDetail(db, row));
  res.json({ enquiries, staffOptions: getStaffOptions(db) });
});

router.get("/:id", auth(), requireRole(...STAFF_ROLES), (req, res) => {
  const db = ensureEnquiryCollections(readDB());
  const enquiry = (db.contactEnquiries || []).find((row) => String(row.id) === String(req.params.id));
  if (!enquiry || !roleScopeAllows(req.user?.role, enquiry)) {
    return res.status(404).json({ message: "Enquiry not found" });
  }
  res.json({ enquiry: buildEnquiryDetail(db, enquiry), staffOptions: getStaffOptions(db) });
});

router.patch("/:id/assign", auth(), requireRole(...STAFF_ROLES), (req, res) => {
  const db = ensureEnquiryCollections(readDB());
  const enquiry = (db.contactEnquiries || []).find((row) => String(row.id) === String(req.params.id));
  if (!enquiry || !roleScopeAllows(req.user?.role, enquiry)) {
    return res.status(404).json({ message: "Enquiry not found" });
  }

  const assignedTo = safeString(req.body?.assignedTo);
  const staffIds = new Set(getStaffOptions(db).map((row) => row.id));
  if (assignedTo && !staffIds.has(assignedTo)) {
    return res.status(400).json({ message: "Assigned staff user is invalid" });
  }

  enquiry.assignedTo = assignedTo;
  enquiry.updatedAt = timestamp();
  createAssignmentLog(db, enquiry.id, assignedTo, req.user?.id);
  logAudit(db, enquiry.id, req.user?.id, "enquiry_assigned", { assignedTo });
  writeDB(db);
  res.json({ enquiry: buildEnquiryDetail(db, enquiry) });
});

router.patch("/:id/status", auth(), requireRole(...STAFF_ROLES), (req, res) => {
  const db = ensureEnquiryCollections(readDB());
  const enquiry = (db.contactEnquiries || []).find((row) => String(row.id) === String(req.params.id));
  if (!enquiry || !roleScopeAllows(req.user?.role, enquiry)) {
    return res.status(404).json({ message: "Enquiry not found" });
  }

  const nextStatus = ensureValidOption(req.body?.status, STATUS_FLOW, "new");
  const oldStatus = enquiry.status;
  enquiry.status = nextStatus;
  enquiry.updatedAt = timestamp();
  if (nextStatus === "closed") enquiry.closedAt = timestamp();
  logStatusChange(db, enquiry.id, oldStatus, nextStatus, req.user?.id, req.body?.note || "");
  logAudit(db, enquiry.id, req.user?.id, "status_changed", { oldStatus, newStatus: nextStatus });
  writeDB(db);
  res.json({ enquiry: buildEnquiryDetail(db, enquiry) });
});

router.post("/:id/replies", auth(), requireRole(...STAFF_ROLES), (req, res) => {
  const db = ensureEnquiryCollections(readDB());
  const enquiry = (db.contactEnquiries || []).find((row) => String(row.id) === String(req.params.id));
  if (!enquiry || !roleScopeAllows(req.user?.role, enquiry)) {
    return res.status(404).json({ message: "Enquiry not found" });
  }

  const body = req.body || {};
  if (!safeString(body.replyMessage)) {
    return res.status(400).json({ message: "replyMessage is required" });
  }

  const reply = {
    id: createId("enquiry-reply"),
    enquiryId: enquiry.id,
    repliedBy: safeString(req.user?.id),
    replyMessage: safeString(body.replyMessage),
    replyChannel: ensureValidOption(body.replyChannel, REPLY_CHANNELS, "email"),
    createdAt: timestamp(),
    updatedAt: timestamp(),
  };
  db.enquiryReplies.unshift(reply);

  const oldStatus = enquiry.status;
  enquiry.repliedAt = timestamp();
  enquiry.updatedAt = timestamp();
  if (safeLower(body.replyMode) !== "note") {
    enquiry.status = "replied";
    logStatusChange(db, enquiry.id, oldStatus, "replied", req.user?.id, "Reply logged");
  }

  logAudit(db, enquiry.id, req.user?.id, "reply_sent", { replyChannel: reply.replyChannel, replyMode: safeLower(body.replyMode || "reply") });
  writeDB(db);
  res.status(201).json({ reply, enquiry: buildEnquiryDetail(db, enquiry) });
});

module.exports = router;
