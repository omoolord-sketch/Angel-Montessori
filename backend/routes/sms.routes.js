const express = require("express");
const { nanoid } = require("nanoid");
const { readDB, writeDB } = require("../lib/jsonStore");
const { auth, requireRole } = require("../middleware/auth");
const { isTeacherRole } = require("../lib/roles");

const router = express.Router();

function nowIso() {
  return new Date().toISOString();
}

function normalizePhone(value) {
  return String(value || "").trim();
}

function ensureSmsCollections(db) {
  db.smsLogs = Array.isArray(db.smsLogs) ? db.smsLogs : [];
  db.smsTemplates = Array.isArray(db.smsTemplates) ? db.smsTemplates : [];
  db.smsCampaigns = Array.isArray(db.smsCampaigns) ? db.smsCampaigns : [];
  db.smsMessages = Array.isArray(db.smsMessages) ? db.smsMessages : [];
  db.smsProviderLogs = Array.isArray(db.smsProviderLogs) ? db.smsProviderLogs : [];
  db.smsBalanceLogs = Array.isArray(db.smsBalanceLogs) ? db.smsBalanceLogs : [];
}

function providerMode() {
  return String(process.env.SMS_PROVIDER || process.env.SMS_PROVIDER_NAME || "SIMULATED").trim().toUpperCase();
}

function resolveProviderMode() {
  const mode = providerMode();
  if (["TERMII", "TWILIO", "SIMULATED"].includes(mode)) return mode;
  return "SIMULATED";
}

function fallbackToSimulationEnabled() {
  return String(process.env.SMS_FALLBACK_SIMULATED || "true").toLowerCase() !== "false";
}

function getProviderConfigStatus(mode = resolveProviderMode()) {
  if (mode === "TERMII") {
    const missing = [];
    if (!String(process.env.TERMII_API_KEY || "").trim()) missing.push("TERMII_API_KEY");
    if (!String(process.env.TERMII_SENDER_ID || process.env.TERMII_FROM || "").trim()) missing.push("TERMII_SENDER_ID");
    return { provider: mode, isConfigured: missing.length === 0, missing };
  }

  if (mode === "TWILIO") {
    const missing = [];
    if (!String(process.env.TWILIO_ACCOUNT_SID || "").trim()) missing.push("TWILIO_ACCOUNT_SID");
    if (!String(process.env.TWILIO_AUTH_TOKEN || "").trim()) missing.push("TWILIO_AUTH_TOKEN");
    if (!String(process.env.TWILIO_FROM || "").trim()) missing.push("TWILIO_FROM");
    return { provider: mode, isConfigured: missing.length === 0, missing };
  }

  return { provider: "SIMULATED", isConfigured: true, missing: [] };
}

function classNameById(db, classId) {
  const classes = Array.isArray(db.classes) ? db.classes : [];
  const row = classes.find((item) => String(item.id) === String(classId));
  return row ? String(row.name || "") : "";
}

function buildStudentResolver(db) {
  const rows = Array.isArray(db.students) ? db.students : [];
  const byStudentId = new Map();
  const refToStudentId = new Map();

  const addRef = (ref, studentId) => {
    const key = String(ref || "").trim().toLowerCase();
    const normalizedId = String(studentId || "").trim();
    if (!key || !normalizedId) return;
    if (!refToStudentId.has(key)) refToStudentId.set(key, normalizedId);
  };

  rows.forEach((student, index) => {
    const studentId = String(student.id || "").trim();
    if (!studentId) return;
    byStudentId.set(studentId, student);

    const generatedRef = `AMS${String(index + 1).padStart(4, "0")}`;
    const refs = [
      studentId,
      student.studentId,
      student.admissionNo,
      student.admissionNumber,
      student.registrationNo,
      student.registrationNumber,
      student.code,
      generatedRef,
    ];
    refs.forEach((ref) => addRef(ref, studentId));
  });

  const resolveStudentId = (ref) => {
    const raw = String(ref || "").trim();
    if (!raw) return "";
    const mapped = refToStudentId.get(raw.toLowerCase());
    if (mapped) return mapped;
    if (byStudentId.has(raw)) return raw;
    return "";
  };

  return { byStudentId, resolveStudentId };
}

function getStudentRowsByClass(db, classId = "") {
  const rows = Array.isArray(db.students) ? db.students : [];
  if (!classId) return rows;
  return rows.filter((item) => String(item.classId || "") === String(classId));
}

function matchRecipientToStudents(recipient, targetStudentIds) {
  const linked = Array.isArray(recipient.linkedStudentIds) ? recipient.linkedStudentIds : [];
  if (linked.some((sid) => targetStudentIds.has(String(sid)))) return true;
  if (recipient.studentId && targetStudentIds.has(String(recipient.studentId))) return true;
  return false;
}

function getUnpaidInvoiceStudentIds(db, resolveStudentId) {
  const invoices = Array.isArray(db.feeInvoices) ? db.feeInvoices : [];
  const targetStudentIds = new Set();

  invoices
    .filter((inv) => ["unpaid", "partial", "overdue"].includes(String(inv.status || "").toLowerCase()))
    .forEach((inv) => {
      const resolved = resolveStudentId(inv.studentId || inv.studentUserId || "");
      if (resolved) targetStudentIds.add(resolved);
    });

  return targetStudentIds;
}

function getAbsentStudentIds(db, resolveStudentId, date) {
  const attendanceRecords = Array.isArray(db.attendanceRecords) ? db.attendanceRecords : [];
  const absentStudentIds = new Set();

  attendanceRecords
    .filter((row) => String(row.status || "").toLowerCase() === "absent")
    .filter((row) => String(row.attendanceDate || row.date || "").slice(0, 10) === date)
    .forEach((row) => {
      const resolved = resolveStudentId(row.studentId || row.studentUserId || "");
      if (resolved) absentStudentIds.add(resolved);
    });

  return absentStudentIds;
}

function getMissingHomeworkStudentIds(db, resolveStudentId, date) {
  const students = Array.isArray(db.students) ? db.students : [];
  const tasks = Array.isArray(db.homeworks) ? db.homeworks : [];
  const submissions = Array.isArray(db.submissions) ? db.submissions : [];

  const validSubmissionKeys = new Set();
  submissions.forEach((row) => {
    const taskId = String(row.assignmentId || row.homeworkId || "").trim();
    const studentId = resolveStudentId(row.studentId || row.studentUserId || "");
    const status = String(row.status || "submitted").toLowerCase();
    const isSubmitted = ["submitted", "graded", "returned"].includes(status);
    if (!taskId || !studentId || !isSubmitted) return;
    validSubmissionKeys.add(`${taskId}::${studentId}`);
  });

  const missingStudentIds = new Set();
  const dayKey = String(date || "").slice(0, 10);

  tasks.forEach((task) => {
    const taskId = String(task.id || "").trim();
    if (!taskId) return;

    const status = String(task.status || "published").toLowerCase();
    if (status === "draft" || status === "archived") return;

    const dueDate = String(task.dueDate || "").slice(0, 10);
    if (!dueDate || (dayKey && dueDate > dayKey)) return;

    const taskClassId = String(task.classId || "").trim();
    const taskClassName = String(task.className || "").trim().toLowerCase();

    const expectedStudents = students.filter((student) => {
      if (!taskClassId && !taskClassName) return true;
      const studentClassId = String(student.classId || "").trim();
      const studentClassName = String(student.className || classNameById(db, student.classId) || "").trim().toLowerCase();
      if (taskClassId && studentClassId && taskClassId === studentClassId) return true;
      if (taskClassName && studentClassName && taskClassName === studentClassName) return true;
      return false;
    });

    expectedStudents.forEach((student) => {
      const studentId = resolveStudentId(student.id);
      if (!studentId) return;
      const key = `${taskId}::${studentId}`;
      if (!validSubmissionKeys.has(key)) missingStudentIds.add(studentId);
    });
  });

  return missingStudentIds;
}

function collectRecipients(db, options = {}) {
  const recipientType = String(options.recipientType || "all_parents").toLowerCase();
  const classId = String(options.classId || "").trim();
  const customContacts = Array.isArray(options.customContacts) ? options.customContacts : [];
  const filter = String(options.filter || "all").toLowerCase();
  const today = String(options.date || new Date().toISOString().slice(0, 10)).slice(0, 10);

  const users = Array.isArray(db.users) ? db.users : [];
  const { byStudentId, resolveStudentId } = buildStudentResolver(db);

  const toContact = (id, name, phone, extra = {}) => ({
    id: String(id || nanoid()),
    name: String(name || "").trim() || "Unknown",
    phone: normalizePhone(phone),
    ...extra,
  });

  const allParents = users
    .filter((u) => u.role === "PARENT")
    .map((u) => {
      const wardRefs = Array.isArray(u.studentIds) ? u.studentIds.map((id) => String(id || "").trim()) : [];
      if (u.studentId) wardRefs.push(String(u.studentId || "").trim());
      const linkedStudentIds = Array.from(
        new Set(
          wardRefs
            .map((ref) => resolveStudentId(ref))
            .filter(Boolean)
        )
      );
      const wards = linkedStudentIds.map((id) => byStudentId.get(String(id))).filter(Boolean);
      return toContact(u.id, u.name, u.phone, {
        role: "PARENT",
        classNames: Array.from(new Set(wards.map((s) => String(s.className || classNameById(db, s.classId) || "")).filter(Boolean))),
        linkedStudentIds,
      });
    })
    .filter((item) => Boolean(item.phone));

  const allTeachers = users
    .filter((u) => isTeacherRole(u.role))
    .map((u) => toContact(u.id, u.name, u.phone, { role: "TEACHER", subjects: u.subjects || [] }))
    .filter((item) => Boolean(item.phone));

  const allStudents = users
    .filter((u) => u.role === "STUDENT")
    .map((u) => {
      const studentId = resolveStudentId(u.studentId || u.studentRef || "");
      const profile = byStudentId.get(String(studentId || ""));
      return toContact(u.id, u.name, u.phone || profile?.studentPhone || "", {
        role: "STUDENT",
        studentId: String(studentId || ""),
        classId: String(profile?.classId || ""),
        className: String(profile?.className || classNameById(db, profile?.classId || "") || ""),
      });
    })
    .filter((item) => Boolean(item.phone));

  const allApplicants = users
    .filter((u) => u.role === "APPLICANT")
    .map((u) => toContact(u.id, u.name, u.phone, { role: "APPLICANT" }))
    .filter((item) => Boolean(item.phone));

  const classStudentIds = new Set(
    getStudentRowsByClass(db, classId)
      .map((s) => resolveStudentId(s.id))
      .filter(Boolean)
  );

  const classParents = allParents.filter((parent) => {
    if (!classId) return true;
    return (parent.linkedStudentIds || []).some((sid) => classStudentIds.has(String(sid)));
  });

  const classStudents = allStudents.filter((student) => !classId || String(student.classId || "") === String(classId));


  let recipients = [];
  if (recipientType === "all_parents") recipients = classId ? classParents : allParents;
  else if (recipientType === "all_teachers") recipients = allTeachers;
  else if (recipientType === "all_students") recipients = classId ? classStudents : allStudents;
  else if (recipientType === "class_parents") recipients = classParents;
  else if (recipientType === "class_students") recipients = classStudents;
  else if (recipientType === "applicants") recipients = allApplicants;
  else if (recipientType === "custom_list") {
    recipients = customContacts
      .map((item, index) => {
        if (typeof item === "string") return toContact(`custom-${index + 1}`, `Recipient ${index + 1}`, item);
        return toContact(item.id || `custom-${index + 1}`, item.name || `Recipient ${index + 1}`, item.phone || "");
      })
      .filter((item) => Boolean(item.phone));
  } else if (recipientType === "unpaid_invoices") {
    const targetStudentIds = getUnpaidInvoiceStudentIds(db, resolveStudentId);
    recipients = allParents.filter((recipient) => matchRecipientToStudents(recipient, targetStudentIds));
  } else if (recipientType === "absent_students") {
    const absentStudentIds = getAbsentStudentIds(db, resolveStudentId, today);
    recipients = allParents.filter((recipient) => matchRecipientToStudents(recipient, absentStudentIds));
  }

  if (filter === "unpaid_fees") {
    const targetStudentIds = getUnpaidInvoiceStudentIds(db, resolveStudentId);
    recipients = recipients.filter((recipient) => matchRecipientToStudents(recipient, targetStudentIds));
  } else if (filter === "missing_homework") {
    const targetStudentIds = getMissingHomeworkStudentIds(db, resolveStudentId, today);
    recipients = recipients.filter((recipient) => matchRecipientToStudents(recipient, targetStudentIds));
  } else if (filter === "absence_today") {
    const targetStudentIds = getAbsentStudentIds(db, resolveStudentId, today);
    recipients = recipients.filter((recipient) => matchRecipientToStudents(recipient, targetStudentIds));
  }

  const seen = new Set();
  return recipients.filter((item) => {
    const phone = String(item.phone || "").trim();
    if (!phone) return false;
    if (seen.has(phone)) return false;
    seen.add(phone);
    return true;
  });
}

function estimateSmsUnits(message, recipientCount) {
  const length = String(message || "").length;
  const unitsPerRecipient = Math.max(1, Math.ceil(length / 160));
  return unitsPerRecipient * Math.max(0, Number(recipientCount || 0));
}

function getSimulatedBalance(db) {
  const totalUnitsSent = (Array.isArray(db.smsMessages) ? db.smsMessages : [])
    .filter((item) => ["sent", "delivered"].includes(String(item.deliveryStatus || "").toLowerCase()))
    .reduce((sum, item) => sum + Number(item.units || 1), 0);
  const starting = Number(process.env.SMS_SIMULATED_BALANCE || 50000);
  return Math.max(0, starting - totalUnitsSent);
}

function sanitizeProviderPayload(payload = {}) {
  const clone = { ...(payload || {}) };
  if (Object.prototype.hasOwnProperty.call(clone, "api_key")) clone.api_key = "***";
  return clone;
}

async function sendViaTermii(phone, message) {
  const apiKey = String(process.env.TERMII_API_KEY || "").trim();
  const senderId = String(process.env.TERMII_SENDER_ID || process.env.TERMII_FROM || "").trim();
  const channel = String(process.env.TERMII_CHANNEL || "generic").trim();
  const type = String(process.env.TERMII_TYPE || "plain").trim();
  const baseUrl = String(process.env.TERMII_API_BASE || "https://api.ng.termii.com/api").replace(/\/+$/, "");

  if (!apiKey || !senderId) {
    return {
      ok: false,
      provider: "TERMII",
      deliveryStatus: "failed",
      errorMessage: "TERMII_API_KEY and TERMII_SENDER_ID are required for live SMS sending",
      requestPayload: { to: phone, from: senderId, channel, type },
      responsePayload: {},
      providerMessageId: "",
    };
  }

  const requestPayload = {
    to: phone,
    from: senderId,
    sms: message,
    type,
    channel,
    api_key: apiKey,
  };

  try {
    const response = await fetch(`${baseUrl}/sms/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestPayload),
    });

    const raw = await response.text();
    let data;
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { raw };
    }

    const ok = response.ok && !data?.error;
    return {
      ok,
      provider: "TERMII",
      deliveryStatus: ok ? "sent" : "failed",
      errorMessage: ok ? "" : String(data?.message || data?.error || `HTTP ${response.status}`).trim(),
      requestPayload: sanitizeProviderPayload(requestPayload),
      responsePayload: data,
      providerMessageId: String(data?.message_id || data?.messageId || data?.sms_id || "").trim(),
    };
  } catch (err) {
    return {
      ok: false,
      provider: "TERMII",
      deliveryStatus: "failed",
      errorMessage: String(err?.message || "Failed to send via Termii"),
      requestPayload: sanitizeProviderPayload(requestPayload),
      responsePayload: {},
      providerMessageId: "",
    };
  }
}

async function sendViaTwilio(phone, message) {
  const accountSid = String(process.env.TWILIO_ACCOUNT_SID || "").trim();
  const authToken = String(process.env.TWILIO_AUTH_TOKEN || "").trim();
  const from = String(process.env.TWILIO_FROM || "").trim();

  if (!accountSid || !authToken || !from) {
    return {
      ok: false,
      provider: "TWILIO",
      deliveryStatus: "failed",
      errorMessage: "TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM are required for live SMS sending",
      requestPayload: { to: phone, from },
      responsePayload: {},
      providerMessageId: "",
    };
  }

  const params = new URLSearchParams();
  params.set("To", phone);
  params.set("From", from);
  params.set("Body", message);

  const url = "https://api.twilio.com/2010-04-01/Accounts/" + encodeURIComponent(accountSid) + "/Messages.json";
  const authHeader = "Basic " + Buffer.from(accountSid + ":" + authToken).toString("base64");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const raw = await response.text();
    let data;
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { raw };
    }

    const ok = response.ok && !data?.error_code;
    return {
      ok,
      provider: "TWILIO",
      deliveryStatus: ok ? "sent" : "failed",
      errorMessage: ok ? "" : String(data?.message || data?.error_message || ("HTTP " + response.status)).trim(),
      requestPayload: { to: phone, from },
      responsePayload: data,
      providerMessageId: String(data?.sid || "").trim(),
    };
  } catch (err) {
    return {
      ok: false,
      provider: "TWILIO",
      deliveryStatus: "failed",
      errorMessage: String(err?.message || "Failed to send via Twilio"),
      requestPayload: { to: phone, from },
      responsePayload: {},
      providerMessageId: "",
    };
  }
}

async function getLiveBalance() {
  const mode = resolveProviderMode();

  if (mode === "TERMII") {
    const apiKey = String(process.env.TERMII_API_KEY || "").trim();
    const baseUrl = String(process.env.TERMII_API_BASE || "https://api.ng.termii.com/api").replace(/\/+$/, "");
    if (!apiKey) return null;

    try {
      const url = baseUrl + "/get-balance?api_key=" + encodeURIComponent(apiKey);
      const response = await fetch(url, { method: "GET" });
      const raw = await response.text();
      let data;
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { raw };
      }

      const balance = Number(data?.balance);
      if (Number.isFinite(balance)) return balance;

      const alt = Number(data?.sms_balance || data?.units || 0);
      return Number.isFinite(alt) ? alt : null;
    } catch {
      return null;
    }
  }

  if (mode === "TWILIO") {
    const accountSid = String(process.env.TWILIO_ACCOUNT_SID || "").trim();
    const authToken = String(process.env.TWILIO_AUTH_TOKEN || "").trim();
    if (!accountSid || !authToken) return null;

    try {
      const url = "https://api.twilio.com/2010-04-01/Accounts/" + encodeURIComponent(accountSid) + "/Balance.json";
      const authHeader = "Basic " + Buffer.from(accountSid + ":" + authToken).toString("base64");
      const response = await fetch(url, {
        method: "GET",
        headers: { Authorization: authHeader },
      });
      const raw = await response.text();
      let data;
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { raw };
      }

      const balance = Number(data?.balance);
      return Number.isFinite(balance) ? balance : null;
    } catch {
      return null;
    }
  }

  return null;
}

async function dispatchMessage(provider, phone, message) {
  if (provider === "TERMII") {
    return sendViaTermii(phone, message);
  }
  if (provider === "TWILIO") {
    return sendViaTwilio(phone, message);
  }

  return {
    ok: Boolean(phone),
    provider: "SIMULATED",
    deliveryStatus: phone ? "delivered" : "failed",
    errorMessage: phone ? "" : "Missing phone number",
    requestPayload: { to: phone },
    responsePayload: { simulated: true },
    providerMessageId: phone ? "SIM-" + nanoid(8) : "",
  };
}

async function sendCampaignInternal(db, payload, actorUserId) {
  ensureSmsCollections(db);

  const messageBody = String(payload.messageBody || payload.message || "").trim();
  if (!messageBody) {
    return { error: { status: 400, message: "message is required" } };
  }

  const provider = resolveProviderMode();

  const recipientType = String(payload.recipientType || payload.group || "all_parents").toLowerCase();
  const classId = String(payload.classId || "").trim();
  const recipients = Array.isArray(payload.contacts) && payload.contacts.length > 0
    ? collectRecipients(db, { recipientType: "custom_list", customContacts: payload.contacts, classId })
    : collectRecipients(db, {
        recipientType,
        classId,
        filter: payload.filter || "all",
        date: payload.date,
      });

  if (!recipients.length) {
    return { error: { status: 400, message: "No recipients found for the selected audience/filter." } };
  }

  const campaignId = nanoid();
  const campaign = {
    id: campaignId,
    title: String(payload.title || payload.templateName || "SMS Campaign").trim() || "SMS Campaign",
    messageBody,
    recipientType,
    recipientFilterJson: {
      classId,
      filter: String(payload.filter || "all").toLowerCase(),
      date: String(payload.date || "").slice(0, 10),
    },
    totalRecipients: recipients.length,
    totalSent: 0,
    totalFailed: 0,
    status: "sent",
    createdBy: String(actorUserId || ""),
    provider,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  const unitsPerMessage = Math.max(1, Math.ceil(messageBody.length / 160));
  const messages = [];

  for (const recipient of recipients) {
    const delivery = await dispatchMessage(provider, String(recipient.phone || ""), messageBody);

    if (!delivery.ok && fallbackToSimulationEnabled()) {
      const fallback = await dispatchMessage("SIMULATED", String(recipient.phone || ""), messageBody);
      if (fallback.ok) {
        delivery.ok = true;
        delivery.deliveryStatus = fallback.deliveryStatus;
        delivery.errorMessage = "";
        delivery.provider = `${provider}->SIMULATED_FALLBACK`;
        delivery.providerMessageId = fallback.providerMessageId;
        delivery.responsePayload = {
          primary: delivery.responsePayload,
          fallback: fallback.responsePayload,
        };
      }
    }

    const msg = {
      id: nanoid(),
      campaignId,
      userId: String(recipient.id || ""),
      phone: String(recipient.phone || ""),
      messageBody,
      providerMessageId: String(delivery.providerMessageId || ""),
      deliveryStatus: delivery.ok ? (delivery.deliveryStatus || "sent") : "failed",
      sentAt: nowIso(),
      deliveredAt: delivery.ok && ["sent", "delivered"].includes(String(delivery.deliveryStatus || "").toLowerCase()) ? nowIso() : "",
      failedAt: delivery.ok ? "" : nowIso(),
      errorMessage: delivery.ok ? "" : String(delivery.errorMessage || "Delivery failed"),
      units: unitsPerMessage,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      recipientName: String(recipient.name || ""),
      recipientRole: String(recipient.role || "").toUpperCase(),
      provider: String(delivery.provider || provider),
    };

    messages.push(msg);

    db.smsProviderLogs.unshift({
      id: nanoid(),
      providerName: String(delivery.provider || provider),
      requestPayload: delivery.requestPayload || { to: msg.phone },
      responsePayload: delivery.responsePayload || {},
      status: msg.deliveryStatus,
      createdAt: nowIso(),
    });
  }

  campaign.totalSent = messages.filter((m) => ["delivered", "sent"].includes(String(m.deliveryStatus || "").toLowerCase())).length;
  campaign.totalFailed = messages.filter((m) => String(m.deliveryStatus || "").toLowerCase() === "failed").length;

  db.smsCampaigns.unshift(campaign);
  db.smsMessages.unshift(...messages);
  db.smsLogs.unshift({
    id: nanoid(),
    message: messageBody,
    to: recipients.map((r) => r.phone).join(", "),
    recipients: recipients.map((r) => r.phone),
    recipientCount: recipients.length,
    group: String(payload.group || recipientType).toUpperCase(),
    classId,
    recipientType,
    filter: String(payload.filter || "all"),
    sentAt: nowIso(),
    campaignId,
  });

  db.smsBalanceLogs.unshift({
    id: nanoid(),
    providerName: provider,
    balanceBefore: getSimulatedBalance({ ...db, smsMessages: db.smsMessages.slice(messages.length) }),
    balanceAfter: getSimulatedBalance(db),
    checkedAt: nowIso(),
    createdAt: nowIso(),
  });

  return {
    campaign,
    messages,
    recipients,
    estimatedUnits: unitsPerMessage * recipients.length,
  };
}

router.get("/dashboard", auth(), requireRole("ADMIN"), async (req, res) => {
  const db = readDB();
  ensureSmsCollections(db);
  const mode = resolveProviderMode();
  const config = getProviderConfigStatus(mode);

  const today = new Date().toISOString().slice(0, 10);
  const todayMessages = db.smsMessages.filter((msg) => String(msg.sentAt || "").slice(0, 10) === today);
  const sentToday = todayMessages.length;
  const deliveredToday = todayMessages.filter((msg) => ["delivered", "sent"].includes(String(msg.deliveryStatus || "").toLowerCase())).length;
  const failedToday = todayMessages.filter((msg) => String(msg.deliveryStatus || "").toLowerCase() === "failed").length;

  const successRate = sentToday > 0 ? Number(((deliveredToday / sentToday) * 100).toFixed(2)) : 0;
  const queuedCampaigns = db.smsCampaigns.filter((item) => String(item.status || "").toLowerCase() === "queued").length;

  const liveBalance = await getLiveBalance();

  res.json({
    smsBalance: liveBalance != null ? liveBalance : getSimulatedBalance(db),
    providerMode: mode,
    providerConfigured: config.isConfigured,
    providerConfigIssues: config.missing,
    fallbackToSimulation: fallbackToSimulationEnabled(),
    liveBalanceAvailable: liveBalance != null,
    messagesSentToday: sentToday,
    deliverySuccessRate: successRate,
    failedMessages: failedToday,
    queuedCampaigns,
    templatesCount: db.smsTemplates.length,
    campaignsCount: db.smsCampaigns.length,
  });
});

router.get("/provider/status", auth(), requireRole("ADMIN"), async (req, res) => {
  const mode = resolveProviderMode();
  const config = getProviderConfigStatus(mode);
  const liveBalance = await getLiveBalance();

  return res.json({
    providerMode: mode,
    providerConfigured: config.isConfigured,
    providerConfigIssues: config.missing,
    fallbackToSimulation: fallbackToSimulationEnabled(),
    liveBalance,
    liveBalanceAvailable: liveBalance != null,
  });
});

router.get("/contacts", auth(), requireRole("ADMIN"), (req, res) => {
  const db = readDB();
  ensureSmsCollections(db);

  const group = String(req.query.group || "PARENTS").toUpperCase();
  const classId = String(req.query.classId || "").trim();
  const filter = String(req.query.filter || "all").toLowerCase();
  const date = String(req.query.date || "").slice(0, 10);
  const requestedRecipientType = String(req.query.recipientType || "").trim().toLowerCase();
  const allowedRecipientTypes = new Set([
    "all_parents",
    "all_teachers",
    "all_students",
    "class_parents",
    "class_students",
    "unpaid_invoices",
    "absent_students",
    "applicants",
    "custom_list",
  ]);

  let recipientType = "all_parents";
  if (group === "PARENTS") recipientType = classId ? "class_parents" : "all_parents";
  else if (group === "TEACHERS") recipientType = "all_teachers";
  else if (group === "STUDENTS") recipientType = classId ? "class_students" : "all_students";
  else if (group === "APPLICANTS") recipientType = "applicants";
  if (allowedRecipientTypes.has(requestedRecipientType)) recipientType = requestedRecipientType;

  const contacts = collectRecipients(db, { recipientType, classId, filter, date });

  return res.json({
    group,
    classId,
    recipientType,
    contacts,
    count: contacts.length,
  });
});

router.get("/templates", auth(), requireRole("ADMIN"), (req, res) => {
  const db = readDB();
  ensureSmsCollections(db);
  res.json(db.smsTemplates);
});

router.post("/templates", auth(), requireRole("ADMIN"), (req, res) => {
  const { templateName, templateType, messageBody, isActive = true } = req.body || {};
  const safeName = String(templateName || "").trim();
  const safeBody = String(messageBody || "").trim();
  if (!safeName || !safeBody) {
    return res.status(400).json({ message: "templateName and messageBody are required" });
  }

  const db = readDB();
  ensureSmsCollections(db);

  const template = {
    id: nanoid(),
    templateName: safeName,
    templateType: String(templateType || "broadcast").trim().toLowerCase(),
    messageBody: safeBody,
    isActive: isActive !== false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  db.smsTemplates.unshift(template);
  writeDB(db);
  res.status(201).json(template);
});

router.patch("/templates/:id", auth(), requireRole("ADMIN"), (req, res) => {
  const db = readDB();
  ensureSmsCollections(db);

  const idx = db.smsTemplates.findIndex((item) => String(item.id) === String(req.params.id));
  if (idx < 0) return res.status(404).json({ message: "Template not found" });

  const current = db.smsTemplates[idx];
  const hasTemplateName = req.body?.templateName !== undefined;
  const hasMessageBody = req.body?.messageBody !== undefined;
  if (hasTemplateName && !String(req.body?.templateName || "").trim()) {
    return res.status(400).json({ message: "templateName cannot be empty" });
  }
  if (hasMessageBody && !String(req.body?.messageBody || "").trim()) {
    return res.status(400).json({ message: "messageBody cannot be empty" });
  }

  db.smsTemplates[idx] = {
    ...current,
    templateName: hasTemplateName ? String(req.body.templateName || "").trim() : current.templateName,
    templateType: req.body?.templateType !== undefined ? String(req.body.templateType || "").trim().toLowerCase() : current.templateType,
    messageBody: hasMessageBody ? String(req.body.messageBody || "").trim() : current.messageBody,
    isActive: req.body?.isActive !== undefined ? Boolean(req.body.isActive) : current.isActive,
    updatedAt: nowIso(),
  };

  writeDB(db);
  res.json(db.smsTemplates[idx]);
});

router.get("/campaigns", auth(), requireRole("ADMIN"), (req, res) => {
  const db = readDB();
  ensureSmsCollections(db);

  const status = String(req.query.status || "").trim().toLowerCase();
  const recipientType = String(req.query.recipientType || "").trim().toLowerCase();

  let rows = db.smsCampaigns;
  if (status) rows = rows.filter((item) => String(item.status || "").toLowerCase() === status);
  if (recipientType) rows = rows.filter((item) => String(item.recipientType || "").toLowerCase() === recipientType);

  res.json(rows.slice(0, 500));
});

router.post("/campaigns/send", auth(), requireRole("ADMIN"), async (req, res) => {
  const db = readDB();
  ensureSmsCollections(db);

  const result = await sendCampaignInternal(db, req.body || {}, req.user?.id);
  if (result.error) {
    return res.status(result.error.status).json({ message: result.error.message });
  }

  writeDB(db);
  res.status(201).json({
    ok: true,
    provider: result.campaign.provider,
    campaign: result.campaign,
    sent: result.campaign.totalSent,
    failed: result.campaign.totalFailed,
    recipientCount: result.recipients.length,
    estimatedUnits: result.estimatedUnits,
  });
});

router.post("/send", auth(), requireRole("ADMIN"), async (req, res) => {
  const db = readDB();
  ensureSmsCollections(db);

  const group = String(req.body?.group || "").toLowerCase();
  const recipientType = group === "parents"
    ? "all_parents"
    : group === "teachers"
      ? "all_teachers"
      : group === "students"
        ? "all_students"
        : group === "applicants"
          ? "applicants"
          : group === "unpaid_invoices"
            ? "unpaid_invoices"
            : group === "absent_students"
              ? "absent_students"
              : "custom_list";

  const payload = {
    title: String(req.body?.title || "SMS Send").trim(),
    messageBody: req.body?.message,
    recipientType,
    classId: req.body?.classId,
    filter: req.body?.filter,
    contacts: req.body?.contacts,
  };

  const result = await sendCampaignInternal(db, payload, req.user?.id);
  if (result.error) {
    return res.status(result.error.status).json({ message: result.error.message });
  }

  writeDB(db);
  res.status(201).json({ ok: true, log: db.smsLogs[0], campaign: result.campaign });
});

router.post("/messages/retry-failed", auth(), requireRole("ADMIN"), async (req, res) => {
  const db = readDB();
  ensureSmsCollections(db);

  const campaignId = String(req.body?.campaignId || "").trim();
  const failedRows = db.smsMessages.filter((msg) => {
    const failed = String(msg.deliveryStatus || "").toLowerCase() === "failed";
    if (!failed) return false;
    if (!campaignId) return true;
    return String(msg.campaignId || "") === campaignId;
  });

  let retried = 0;
  let failed = 0;
  const configuredProvider = resolveProviderMode();

  for (const row of failedRows) {
    const delivery = await dispatchMessage(configuredProvider, String(row.phone || ""), String(row.messageBody || ""));
    let finalDelivery = delivery;

    if (!delivery.ok && fallbackToSimulationEnabled()) {
      const fallback = await dispatchMessage("SIMULATED", String(row.phone || ""), String(row.messageBody || ""));
      if (fallback.ok) {
        finalDelivery = {
          ...delivery,
          ok: true,
          deliveryStatus: fallback.deliveryStatus,
          errorMessage: "",
          provider: configuredProvider + "->SIMULATED_FALLBACK",
          providerMessageId: fallback.providerMessageId,
          responsePayload: {
            primary: delivery.responsePayload,
            fallback: fallback.responsePayload,
          },
        };
      }
    }

    if (finalDelivery.ok) {
      row.deliveryStatus = finalDelivery.deliveryStatus || "sent";
      row.errorMessage = "";
      row.deliveredAt = nowIso();
      row.failedAt = "";
      row.providerMessageId = finalDelivery.providerMessageId || row.providerMessageId || "";
      row.provider = String(finalDelivery.provider || configuredProvider);
      row.updatedAt = nowIso();
      retried += 1;
    } else {
      row.deliveryStatus = "failed";
      row.errorMessage = String(finalDelivery.errorMessage || "Delivery failed");
      row.failedAt = nowIso();
      row.updatedAt = nowIso();
      failed += 1;
    }

    db.smsProviderLogs.unshift({
      id: nanoid(),
      providerName: String(finalDelivery.provider || configuredProvider),
      requestPayload: finalDelivery.requestPayload || { to: row.phone },
      responsePayload: finalDelivery.responsePayload || {},
      status: finalDelivery.ok ? (finalDelivery.deliveryStatus || "sent") : "failed",
      createdAt: nowIso(),
    });
  }

  writeDB(db);
  res.json({ retried, failed });
});

router.get("/logs", auth(), requireRole("ADMIN"), (req, res) => {
  const db = readDB();
  ensureSmsCollections(db);
  res.json(db.smsLogs);
});

router.get("/messages", auth(), requireRole("ADMIN"), (req, res) => {
  const db = readDB();
  ensureSmsCollections(db);

  const campaignId = String(req.query.campaignId || "").trim();
  const status = String(req.query.status || "").trim().toLowerCase();

  let rows = db.smsMessages;
  if (campaignId) rows = rows.filter((item) => String(item.campaignId || "") === campaignId);
  if (status) rows = rows.filter((item) => String(item.deliveryStatus || "").toLowerCase() === status);

  res.json(rows.slice(0, 1000));
});

module.exports = router;
module.exports.sendCampaignInternal = sendCampaignInternal;
module.exports.ensureSmsCollections = ensureSmsCollections;













