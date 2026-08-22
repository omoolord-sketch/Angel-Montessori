const express = require("express");
const { auth, requireRole } = require("../middleware/auth");
const { readDB, writeDB } = require("../lib/jsonStore");
const {
  SCHEME_SESSION_STATUSES,
  SCHEME_TERM_STATUSES,
  SCHEME_COMPLETION_STATUSES,
  SCHEME_APPROVAL_STATUSES,
  SCHEME_READ_ROLES,
  SCHEME_MANAGE_ROLES,
  SCHEME_APPROVE_ROLES,
  ensureSchemeCollections,
  buildSchemeDashboard,
  buildSchemeSetup,
  buildSchemeAnalytics,
  listSchemeSessions,
  listSchemeTerms,
  listSchemeWeeks,
  listSchemeApprovals,
  buildSchemeProgressRows,
  buildSchemeTermDetail,
  buildSchemeExportHtml,
  buildSchemePdfBuffer,
  createSchemeId,
  createHttpError,
  safeString,
  safeLower,
  safeNumber,
  nowIso,
  ensureOption,
  humanize,
  findAcademicSession,
  findAcademicTerm,
  findClass,
  findSubject,
  findTeacher,
  findUser,
  teacherCanTeachSubject,
  validateWeekLinks,
} = require("../lib/schemeOfWork");

const router = express.Router();
router.use(auth());

function getDb() {
  const db = readDB();
  const mutated = ensureSchemeCollections(db);
  if (mutated) writeDB(db);
  return db;
}

function handleError(res, error) {
  return res.status(error?.status || 500).json({ message: error?.message || "Scheme of work request failed" });
}

function addProgressLog(db, schemeWeekId, user, oldStatus, newStatus, note = "") {
  db.schemeOfWorkProgressLogs.unshift({
    id: createSchemeId("scheme-progress"),
    schemeWeekId: safeString(schemeWeekId),
    updatedBy: safeString(user?.id || user?.username),
    updaterName: safeString(user?.name || user?.username),
    oldStatus: ensureOption(oldStatus, SCHEME_COMPLETION_STATUSES, "pending"),
    newStatus: ensureOption(newStatus, SCHEME_COMPLETION_STATUSES, "pending"),
    note: safeString(note),
    createdAt: nowIso(),
  });
}

function addApprovalRecord(db, schemeTermId, user, approvalStatus, note = "", approvedAt = "") {
  db.schemeOfWorkApprovals.unshift({
    id: createSchemeId("scheme-approval"),
    schemeTermId: safeString(schemeTermId),
    approvedBy: safeString(user?.id || user?.username),
    approverName: safeString(user?.name || user?.username),
    approvalStatus: ensureOption(approvalStatus, SCHEME_APPROVAL_STATUSES, "pending"),
    note: safeString(note),
    approvedAt: safeString(approvedAt),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
}

function findSchemeSessionIndex(db, id) {
  return db.schemeOfWorkSessions.findIndex((item) => String(item.id) === String(id));
}

function findSchemeTermIndex(db, id) {
  return db.schemeOfWorkTerms.findIndex((item) => String(item.id) === String(id));
}

function findSchemeWeekIndex(db, id) {
  return db.schemeOfWorkWeeks.findIndex((item) => String(item.id) === String(id));
}

function findSchemeAttachmentIndex(db, id) {
  return db.schemeOfWorkAttachments.findIndex((item) => String(item.id) === String(id));
}

function getVisibleTermDetail(db, termId, user) {
  const detail = buildSchemeTermDetail(db, termId);
  if (!detail) throw createHttpError(404, "Scheme term not found");
  if (user?.role === "TEACHER" && String(detail.teacherUserId) !== String(user.id)) {
    throw createHttpError(403, "You can only access schemes assigned to you");
  }
  return detail;
}

function assertCanEditTermStructure(detail, user) {
  if (detail.status === "archived") throw createHttpError(400, "Archived schemes cannot be edited");
  if (SCHEME_MANAGE_ROLES.includes(user?.role)) return;
  if (user?.role !== "TEACHER" || String(detail.teacherUserId) !== String(user.id)) {
    throw createHttpError(403, "You do not have permission to edit this scheme");
  }
  if (detail.status === "approved") {
    throw createHttpError(403, "Approved schemes can only be changed by the academic desk");
  }
}

function buildSessionPayload(db, body = {}, currentId = "") {
  const sessionId = safeString(body.sessionId);
  const title = safeString(body.title);
  const description = safeString(body.description);
  const status = ensureOption(body.status, SCHEME_SESSION_STATUSES, "draft");
  if (!sessionId) throw createHttpError(400, "Academic session is required");
  if (!title) throw createHttpError(400, "Session title is required");
  const academicSession = findAcademicSession(db, sessionId);
  if (!academicSession) throw createHttpError(404, "Academic session not found");
  const duplicate = db.schemeOfWorkSessions.find((item) => String(item.sessionId) === String(academicSession.id) && String(item.id) !== String(currentId));
  if (duplicate) throw createHttpError(400, "A scheme session already exists for this academic session");
  return {
    sessionId: academicSession.id,
    sessionName: academicSession.sessionName,
    title,
    description,
    status,
  };
}

function buildTermPayload(db, body = {}, currentId = "") {
  const schemeSessionId = safeString(body.schemeSessionId);
  const termId = safeString(body.termId);
  const classId = safeString(body.classId);
  const subjectId = safeString(body.subjectId);
  const teacherUserId = safeString(body.teacherUserId);
  const status = ensureOption(body.status, SCHEME_TERM_STATUSES, "draft");
  if (!schemeSessionId || !termId || !classId || !subjectId || !teacherUserId) {
    throw createHttpError(400, "Scheme session, term, class, subject, and teacher are required");
  }
  const schemeSession = db.schemeOfWorkSessions.find((item) => String(item.id) === String(schemeSessionId));
  if (!schemeSession) throw createHttpError(404, "Scheme session not found");
  if (safeLower(schemeSession.status) === "archived") throw createHttpError(400, "Archived sessions cannot receive new schemes");
  const term = findAcademicTerm(db, termId);
  const classRow = findClass(db, classId);
  const subject = findSubject(db, subjectId);
  const teacher = findTeacher(db, teacherUserId);
  if (!term) throw createHttpError(404, "Academic term not found");
  if (!classRow) throw createHttpError(404, "Class not found");
  if (!subject) throw createHttpError(404, "Subject not found");
  if (!teacher) throw createHttpError(404, "Teacher not found");
  if (!teacherCanTeachSubject(teacher, subject.subjectName)) {
    throw createHttpError(400, "The selected teacher is not assigned to this subject");
  }
  const duplicate = db.schemeOfWorkTerms.find(
    (item) =>
      String(item.schemeSessionId) === String(schemeSessionId) &&
      String(item.termId) === String(term.id) &&
      String(item.classId) === String(classRow.id) &&
      String(item.subjectId) === String(subject.id) &&
      String(item.id) !== String(currentId)
  );
  if (duplicate) throw createHttpError(400, "This class, subject, and term already have a scheme in the selected session");
  return {
    schemeSessionId,
    termId: term.id,
    termName: term.termName,
    classId: classRow.id,
    className: classRow.name,
    subjectId: subject.id,
    subjectName: subject.subjectName,
    teacherUserId: teacher.id,
    teacherName: teacher.name,
    status,
  };
}

function buildAttachmentPayload(body = {}) {
  const fileTitle = safeString(body.fileTitle || body.fileName);
  const filePath = safeString(body.fileData || body.filePath || body.externalUrl);
  const mimeType = safeString(body.mimeType);
  const fileName = safeString(body.fileName || fileTitle);
  const fileSize = safeNumber(body.fileSize, 0);
  if (!fileTitle) throw createHttpError(400, "Attachment title is required");
  if (!filePath) throw createHttpError(400, "Attachment file data is required");
  return {
    fileTitle,
    fileName,
    filePath,
    mimeType,
    fileSize,
  };
}

function buildWeekPayload(db, body = {}, currentId = "") {
  const schemeTermId = safeString(body.schemeTermId);
  const weekNumber = safeNumber(body.weekNumber, 0);
  const topic = safeString(body.topic);
  const learningObjectives = safeString(body.learningObjectives);
  if (!schemeTermId || weekNumber <= 0 || !topic || !learningObjectives) {
    throw createHttpError(400, "Scheme term, week number, topic, and learning objectives are required");
  }
  const schemeTerm = db.schemeOfWorkTerms.find((item) => String(item.id) === String(schemeTermId));
  if (!schemeTerm) throw createHttpError(404, "Scheme term not found");
  const duplicate = db.schemeOfWorkWeeks.find(
    (item) => String(item.schemeTermId) === String(schemeTermId) && safeNumber(item.weekNumber, 0) === weekNumber && String(item.id) !== String(currentId)
  );
  if (duplicate) throw createHttpError(400, "Week number already exists for this scheme");
  const linkPayload = validateWeekLinks(db, schemeTerm, body || {});
  return {
    schemeTermId,
    weekNumber,
    title: safeString(body.title) || "Week " + weekNumber,
    topic,
    subTopic: safeString(body.subTopic),
    learningObjectives,
    teachingActivities: safeString(body.teachingActivities),
    learningMaterials: safeString(body.learningMaterials),
    assessmentMethod: safeString(body.assessmentMethod),
    teacherNote: safeString(body.teacherNote),
    completionStatus: ensureOption(body.completionStatus, SCHEME_COMPLETION_STATUSES, "pending"),
    sortOrder: safeNumber(body.sortOrder, weekNumber),
    ...linkPayload,
  };
}
router.get("/dashboard", requireRole(...SCHEME_READ_ROLES), (req, res) => {
  const db = getDb();
  res.json(buildSchemeDashboard(db, req.user));
});

router.get("/setup", requireRole(...SCHEME_READ_ROLES), (req, res) => {
  const db = getDb();
  res.json({ setup: buildSchemeSetup(db) });
});

router.get("/analytics", requireRole(...SCHEME_READ_ROLES), (req, res) => {
  const db = getDb();
  res.json({
    analytics: buildSchemeAnalytics(
      db,
      {
        schemeSessionId: req.query.schemeSessionId,
        sessionId: req.query.sessionId,
        termId: req.query.termId,
        classId: req.query.classId,
        subjectId: req.query.subjectId,
        teacherUserId: req.query.teacherUserId,
        status: req.query.status,
        schemeTermId: req.query.schemeTermId,
      },
      req.user
    ),
  });
});

router.get("/sessions", requireRole(...SCHEME_READ_ROLES), (req, res) => {
  const db = getDb();
  res.json({ sessions: listSchemeSessions(db, { includeArchived: true }) });
});

router.post("/sessions", requireRole(...SCHEME_MANAGE_ROLES), (req, res) => {
  try {
    const db = getDb();
    const payload = buildSessionPayload(db, req.body || {});
    const timestamp = nowIso();
    const next = {
      id: createSchemeId("scheme-session"),
      ...payload,
      status: payload.status === "archived" ? "draft" : payload.status,
      createdBy: safeString(req.user?.id || req.user?.username),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    if (next.status === "active") {
      db.schemeOfWorkSessions = db.schemeOfWorkSessions.map((item) => ({ ...item, status: item.status === "archived" ? "archived" : "draft", updatedAt: timestamp }));
    }
    db.schemeOfWorkSessions.unshift(next);
    writeDB(db);
    res.status(201).json({ session: next });
  } catch (error) {
    return handleError(res, error);
  }
});

router.patch("/sessions/:id", requireRole(...SCHEME_MANAGE_ROLES), (req, res) => {
  try {
    const db = getDb();
    const index = findSchemeSessionIndex(db, req.params.id);
    if (index === -1) throw createHttpError(404, "Scheme session not found");
    const payload = buildSessionPayload(db, { ...db.schemeOfWorkSessions[index], ...(req.body || {}) }, req.params.id);
    const timestamp = nowIso();
    if (payload.status === "active") {
      db.schemeOfWorkSessions = db.schemeOfWorkSessions.map((item) => ({ ...item, status: item.status === "archived" ? "archived" : "draft", updatedAt: timestamp }));
    }
    db.schemeOfWorkSessions[index] = {
      ...db.schemeOfWorkSessions[index],
      ...payload,
      updatedAt: timestamp,
    };
    writeDB(db);
    res.json({ session: db.schemeOfWorkSessions[index] });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/terms", requireRole(...SCHEME_READ_ROLES), (req, res) => {
  const db = getDb();
  res.json({
    terms: listSchemeTerms(db, {
      schemeSessionId: req.query.schemeSessionId,
      sessionId: req.query.sessionId,
      termId: req.query.termId,
      classId: req.query.classId,
      subjectId: req.query.subjectId,
      teacherUserId: req.query.teacherUserId,
      status: req.query.status,
    }, req.user),
  });
});

router.get("/terms/:id", requireRole(...SCHEME_READ_ROLES), (req, res) => {
  try {
    const db = getDb();
    const detail = getVisibleTermDetail(db, req.params.id, req.user);
    return res.json({ term: detail });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/terms", requireRole(...SCHEME_MANAGE_ROLES), (req, res) => {
  try {
    const db = getDb();
    const payload = buildTermPayload(db, req.body || {});
    const timestamp = nowIso();
    const next = {
      id: createSchemeId("scheme-term"),
      ...payload,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    db.schemeOfWorkTerms.unshift(next);
    writeDB(db);
    res.status(201).json({ term: next });
  } catch (error) {
    return handleError(res, error);
  }
});

router.patch("/terms/:id", requireRole(...SCHEME_MANAGE_ROLES), (req, res) => {
  try {
    const db = getDb();
    const index = findSchemeTermIndex(db, req.params.id);
    if (index === -1) throw createHttpError(404, "Scheme term not found");
    const payload = buildTermPayload(db, { ...db.schemeOfWorkTerms[index], ...(req.body || {}) }, req.params.id);
    db.schemeOfWorkTerms[index] = {
      ...db.schemeOfWorkTerms[index],
      ...payload,
      updatedAt: nowIso(),
    };
    writeDB(db);
    res.json({ term: db.schemeOfWorkTerms[index] });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/weeks", requireRole(...SCHEME_READ_ROLES), (req, res) => {
  const db = getDb();
  res.json({ weeks: listSchemeWeeks(db, { schemeTermId: req.query.schemeTermId, completionStatus: req.query.completionStatus }, req.user) });
});

router.post("/weeks", requireRole(...SCHEME_READ_ROLES), (req, res) => {
  try {
    const db = getDb();
    const payload = buildWeekPayload(db, req.body || {});
    const detail = getVisibleTermDetail(db, payload.schemeTermId, req.user);
    assertCanEditTermStructure(detail, req.user);
    const timestamp = nowIso();
    const next = { id: createSchemeId("scheme-week"), ...payload, createdAt: timestamp, updatedAt: timestamp };
    db.schemeOfWorkWeeks.unshift(next);
    addProgressLog(db, next.id, req.user, "pending", next.completionStatus, "Week entry created");
    writeDB(db);
    res.status(201).json({ week: next });
  } catch (error) {
    return handleError(res, error);
  }
});

router.patch("/weeks/:id", requireRole(...SCHEME_READ_ROLES), (req, res) => {
  try {
    const db = getDb();
    const index = findSchemeWeekIndex(db, req.params.id);
    if (index === -1) throw createHttpError(404, "Scheme week not found");
    const current = db.schemeOfWorkWeeks[index];
    const detail = getVisibleTermDetail(db, current.schemeTermId, req.user);
    assertCanEditTermStructure(detail, req.user);
    const payload = buildWeekPayload(db, { ...current, ...(req.body || {}) }, req.params.id);
    db.schemeOfWorkWeeks[index] = { ...current, ...payload, updatedAt: nowIso() };
    if (payload.completionStatus !== current.completionStatus) {
      addProgressLog(db, current.id, req.user, current.completionStatus, payload.completionStatus, safeString(req.body?.progressNote || "Week status updated"));
    }
    writeDB(db);
    res.json({ week: db.schemeOfWorkWeeks[index] });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/weeks/:id/attachments", requireRole(...SCHEME_READ_ROLES), (req, res) => {
  try {
    const db = getDb();
    const weekIndex = findSchemeWeekIndex(db, req.params.id);
    if (weekIndex === -1) throw createHttpError(404, "Scheme week not found");
    const week = db.schemeOfWorkWeeks[weekIndex];
    const detail = getVisibleTermDetail(db, week.schemeTermId, req.user);
    assertCanEditTermStructure(detail, req.user);
    const payload = buildAttachmentPayload(req.body || {});
    const timestamp = nowIso();
    const next = {
      id: createSchemeId("scheme-attachment"),
      schemeWeekId: week.id,
      ...payload,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    db.schemeOfWorkAttachments.unshift(next);
    writeDB(db);
    res.status(201).json({ attachment: next, term: buildSchemeTermDetail(db, week.schemeTermId) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.delete("/attachments/:id", requireRole(...SCHEME_READ_ROLES), (req, res) => {
  try {
    const db = getDb();
    const attachmentIndex = findSchemeAttachmentIndex(db, req.params.id);
    if (attachmentIndex === -1) throw createHttpError(404, "Scheme attachment not found");
    const attachment = db.schemeOfWorkAttachments[attachmentIndex];
    const week = db.schemeOfWorkWeeks.find((item) => String(item.id) === String(attachment.schemeWeekId));
    if (!week) throw createHttpError(404, "Scheme week not found");
    const detail = getVisibleTermDetail(db, week.schemeTermId, req.user);
    assertCanEditTermStructure(detail, req.user);
    db.schemeOfWorkAttachments.splice(attachmentIndex, 1);
    writeDB(db);
    res.json({ ok: true, term: buildSchemeTermDetail(db, week.schemeTermId) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/terms/:id/submit-review", requireRole(...SCHEME_READ_ROLES), (req, res) => {
  try {
    const db = getDb();
    const index = findSchemeTermIndex(db, req.params.id);
    if (index === -1) throw createHttpError(404, "Scheme term not found");
    const detail = getVisibleTermDetail(db, req.params.id, req.user);
    assertCanEditTermStructure(detail, req.user);
    db.schemeOfWorkTerms[index] = { ...db.schemeOfWorkTerms[index], status: "in_review", updatedAt: nowIso() };
    addApprovalRecord(db, req.params.id, req.user, "pending", safeString(req.body?.note || "Submitted for review"));
    writeDB(db);
    res.json({ term: buildSchemeTermDetail(db, req.params.id) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/approvals", requireRole(...SCHEME_READ_ROLES), (req, res) => {
  const db = getDb();
  res.json({ approvals: listSchemeApprovals(db, { schemeTermId: req.query.schemeTermId, status: req.query.status }, req.user) });
});

router.post("/terms/:id/approval", requireRole(...SCHEME_APPROVE_ROLES), (req, res) => {
  try {
    const db = getDb();
    const index = findSchemeTermIndex(db, req.params.id);
    if (index === -1) throw createHttpError(404, "Scheme term not found");
    const approvalStatus = ensureOption(req.body?.approvalStatus, ["approved", "rejected"], "approved");
    const note = safeString(req.body?.note);
    db.schemeOfWorkTerms[index] = {
      ...db.schemeOfWorkTerms[index],
      status: approvalStatus === "approved" ? "approved" : "draft",
      updatedAt: nowIso(),
    };
    addApprovalRecord(db, req.params.id, req.user, approvalStatus, note, nowIso());
    writeDB(db);
    res.json({ term: buildSchemeTermDetail(db, req.params.id) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/progress", requireRole(...SCHEME_READ_ROLES), (req, res) => {
  const db = getDb();
  res.json({ progress: buildSchemeProgressRows(db, { sessionId: req.query.sessionId, termId: req.query.termId, classId: req.query.classId, subjectId: req.query.subjectId, teacherUserId: req.query.teacherUserId }, req.user) });
});

router.get("/export/:termId", requireRole(...SCHEME_READ_ROLES), (req, res) => {
  try {
    const db = getDb();
    const detail = getVisibleTermDetail(db, req.params.termId, req.user);
    const html = buildSchemeExportHtml(detail);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${safeString(detail.className || "scheme").replace(/[^0-9A-Za-z_-]+/g, "-")}-${safeString(detail.subjectName || "subject").replace(/[^0-9A-Za-z_-]+/g, "-")}-scheme-of-work.html"`);
    return res.send(html);
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/export/:termId/pdf", requireRole(...SCHEME_READ_ROLES), (req, res) => {
  try {
    const db = getDb();
    const detail = getVisibleTermDetail(db, req.params.termId, req.user);
    const pdf = buildSchemePdfBuffer(detail);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${safeString(detail.className || "scheme").replace(/[^0-9A-Za-z_-]+/g, "-")}-${safeString(detail.subjectName || "subject").replace(/[^0-9A-Za-z_-]+/g, "-")}-scheme-of-work.pdf"`);
    return res.send(pdf);
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/teacher/my-schemes", requireRole("TEACHER"), (req, res) => {
  const db = getDb();
  res.json({ terms: listSchemeTerms(db, { sessionId: req.query.sessionId, status: req.query.status }, req.user) });
});

router.get("/teacher/terms/:id", requireRole("TEACHER"), (req, res) => {
  try {
    const db = getDb();
    const detail = getVisibleTermDetail(db, req.params.id, req.user);
    return res.json({ term: detail });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/teacher/weeks/:id/update-progress", requireRole("TEACHER"), (req, res) => {
  try {
    const db = getDb();
    const index = findSchemeWeekIndex(db, req.params.id);
    if (index === -1) throw createHttpError(404, "Scheme week not found");
    const current = db.schemeOfWorkWeeks[index];
    const detail = getVisibleTermDetail(db, current.schemeTermId, req.user);
    if (String(detail.teacherUserId) !== String(req.user.id)) throw createHttpError(403, "You can only update progress for your assigned schemes");
    if (detail.status === "archived") throw createHttpError(400, "Archived schemes cannot be updated");
    const newStatus = ensureOption(req.body?.completionStatus, SCHEME_COMPLETION_STATUSES, current.completionStatus || "pending");
    const note = safeString(req.body?.note || "Progress updated from teacher portal");
    db.schemeOfWorkWeeks[index] = {
      ...current,
      completionStatus: newStatus,
      teacherNote: safeString(req.body?.teacherNote || current.teacherNote),
      updatedAt: nowIso(),
    };
    addProgressLog(db, current.id, req.user, current.completionStatus, newStatus, note);
    writeDB(db);
    res.json({ week: db.schemeOfWorkWeeks[index] });
  } catch (error) {
    return handleError(res, error);
  }
});

module.exports = router;
