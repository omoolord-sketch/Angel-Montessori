const { randomUUID } = require("crypto");
const { DEFAULT_CLASSES } = require("./defaultClasses");
const { SUBJECT_OPTIONS, normalizeSubject } = require("./subjects");

const { ensureAcademicScope } = require("./academicScope");

const SCHEME_SESSION_STATUSES = ["draft", "active", "archived"];
const SCHEME_TERM_STATUSES = ["draft", "in_review", "approved", "archived"];
const SCHEME_COMPLETION_STATUSES = ["pending", "in_progress", "completed", "skipped"];
const SCHEME_APPROVAL_STATUSES = ["pending", "approved", "rejected"];
const SCHEME_READ_ROLES = ["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER", "TEACHER"];
const SCHEME_MANAGE_ROLES = ["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER"];
const SCHEME_APPROVE_ROLES = ["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER"];
const SCHEME_COLLECTIONS = [
  "schemeOfWorkSessions",
  "schemeOfWorkTerms",
  "schemeOfWorkWeeks",
  "schemeOfWorkAttachments",
  "schemeOfWorkApprovals",
  "schemeOfWorkProgressLogs",
];
const SHARED_ACADEMIC_COLLECTIONS = [
  "lmsClassSubjects",
  "lmsTopics",
  "lmsLessons",
  "lmsAssignments",
  "lmsQuizzes",
];

function safeString(value) {
  return String(value || "").trim();
}

function safeLower(value) {
  return safeString(value).toLowerCase();
}

function safeNumber(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function nowIso() {
  return new Date().toISOString();
}

function createSchemeId(prefix) {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function ensureOption(value, allowed, fallback) {
  const normalized = safeLower(value);
  return allowed.includes(normalized) ? normalized : fallback;
}

function humanize(value) {
  return safeString(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function nk(value) {
  return safeString(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function classIdFromName(name) {
  return safeString(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function termOrderValue(termName) {
  const key = safeLower(termName);
  if (key.includes("first")) return 1;
  if (key.includes("second")) return 2;
  if (key.includes("third")) return 3;
  return 99;
}

function sortClasses(rows = []) {
  return [...rows].sort((a, b) => {
    const orderDiff = safeNumber(a.order, 999) - safeNumber(b.order, 999);
    if (orderDiff !== 0) return orderDiff;
    return safeString(a.name).localeCompare(safeString(b.name));
  });
}

function sortSchemeTerms(rows = []) {
  return [...rows].sort((a, b) => {
    const sessionDiff = safeString(b.sessionName).localeCompare(safeString(a.sessionName));
    if (sessionDiff !== 0) return sessionDiff;
    const termDiff = termOrderValue(a.termName) - termOrderValue(b.termName);
    if (termDiff !== 0) return termDiff;
    const classDiff = safeNumber(a.classOrder, 999) - safeNumber(b.classOrder, 999);
    if (classDiff !== 0) return classDiff;
    const subjectDiff = safeString(a.subjectName).localeCompare(safeString(b.subjectName));
    if (subjectDiff !== 0) return subjectDiff;
    return safeString(a.teacherName).localeCompare(safeString(b.teacherName));
  });
}

function sortWeeks(rows = []) {
  return [...rows].sort((a, b) => {
    const orderDiff = safeNumber(a.sortOrder || a.weekNumber, 0) - safeNumber(b.sortOrder || b.weekNumber, 0);
    if (orderDiff !== 0) return orderDiff;
    return safeNumber(a.weekNumber, 0) - safeNumber(b.weekNumber, 0);
  });
}

function sortNewest(rows = [], field = "createdAt") {
  return [...rows].sort((a, b) => safeString(b[field]).localeCompare(safeString(a[field])));
}

function ensureSharedAcademicSetup(db) {
  let mutated = false;
  const timestamp = nowIso();

  if (!Array.isArray(db.classes)) {
    db.classes = [];
    mutated = true;
  }

  const classKeys = new Set(db.classes.map((item) => nk(item.name)));
  DEFAULT_CLASSES.forEach((row) => {
    if (classKeys.has(nk(row.name))) return;
    db.classes.push({ id: classIdFromName(row.name), name: row.name, section: row.section, order: row.order });
    classKeys.add(nk(row.name));
    mutated = true;
  });

  if (!Array.isArray(db.users)) {
    db.users = [];
    mutated = true;
  }

  ensureAcademicScope(db, { currentSession: process.env.CURRENT_SESSION, currentTerm: process.env.CURRENT_TERM });
  mutated = true;

  if (!Array.isArray(db.lmsSubjects)) {
    db.lmsSubjects = [];
    mutated = true;
  }

  if (db.lmsSubjects.length === 0) {
    db.lmsSubjects = SUBJECT_OPTIONS.map((subjectName) => ({
      id: createSchemeId("lms-subject"),
      subjectName,
      subjectCode: nk(subjectName).slice(0, 8).toUpperCase(),
      category: "general",
      status: "ACTIVE",
      createdAt: timestamp,
      updatedAt: timestamp,
    }));
    mutated = true;
  }

  SHARED_ACADEMIC_COLLECTIONS.forEach((key) => {
    if (!Array.isArray(db[key])) {
      db[key] = [];
      mutated = true;
    }
  });

  return mutated;
}

function ensureSchemeCollections(db) {
  let mutated = ensureSharedAcademicSetup(db);
  SCHEME_COLLECTIONS.forEach((key) => {
    if (!Array.isArray(db[key])) {
      db[key] = [];
      mutated = true;
    }
  });
  return mutated;
}

function findAcademicSession(db, ref) {
  const value = safeString(ref);
  const key = nk(value);
  return safeArray(db.lmsSessions).find((item) => String(item.id) === value || nk(item.sessionName) === key) || null;
}

function findAcademicTerm(db, ref) {
  const value = safeString(ref);
  const key = nk(value);
  return safeArray(db.lmsTerms).find((item) => String(item.id) === value || nk(item.termName) === key) || null;
}

function findClass(db, ref) {
  const value = safeString(ref);
  const key = nk(value);
  return safeArray(db.classes).find((item) => String(item.id) === value || nk(item.name) === key) || null;
}

function findSubject(db, ref) {
  const value = safeString(ref);
  const key = nk(value);
  return safeArray(db.lmsSubjects).find((item) => String(item.id) === value || nk(item.subjectName) === key) || null;
}

function findUser(db, ref) {
  const value = safeString(ref);
  return safeArray(db.users).find((item) => String(item.id) === value) || null;
}

function findTeacher(db, ref) {
  const user = findUser(db, ref);
  return user && safeString(user.role).toUpperCase() === "TEACHER" ? user : null;
}

function findClassSubject(db, ref) {
  const value = safeString(ref);
  if (!value) return null;
  return safeArray(db.lmsClassSubjects).find((item) => String(item.id) === value) || null;
}

function findTopic(db, ref) {
  const value = safeString(ref);
  if (!value) return null;
  return safeArray(db.lmsTopics).find((item) => String(item.id) === value) || null;
}

function findLesson(db, ref) {
  const value = safeString(ref);
  if (!value) return null;
  return safeArray(db.lmsLessons).find((item) => String(item.id) === value) || null;
}

function findAssignment(db, ref) {
  const value = safeString(ref);
  if (!value) return null;
  return safeArray(db.lmsAssignments).find((item) => String(item.id) === value) || null;
}

function findQuiz(db, ref) {
  const value = safeString(ref);
  if (!value) return null;
  return safeArray(db.lmsQuizzes).find((item) => String(item.id) === value) || null;
}

function teacherCanTeachSubject(teacher, subjectName) {
  const subjects = safeArray(teacher?.subjects).map((item) => nk(normalizeSubject(item) || item));
  if (!subjects.length) return true;
  return subjects.includes(nk(normalizeSubject(subjectName) || subjectName));
}
function visibleSchemeTermRows(db, user = null) {
  const rows = safeArray(db.schemeOfWorkTerms);
  if (!user || user.role !== "TEACHER") return rows;
  return rows.filter((item) => String(item.teacherUserId) === String(user.id));
}

function weekSummary(weeks = []) {
  const summary = { total: weeks.length, completed: 0, inProgress: 0, pending: 0, skipped: 0 };
  weeks.forEach((week) => {
    const status = ensureOption(week.completionStatus, SCHEME_COMPLETION_STATUSES, "pending");
    if (status === "completed") summary.completed += 1;
    else if (status === "in_progress") summary.inProgress += 1;
    else if (status === "skipped") summary.skipped += 1;
    else summary.pending += 1;
  });
  return {
    ...summary,
    coveragePercent: summary.total ? Math.round((summary.completed / summary.total) * 100) : 0,
  };
}

function normalizeClassSubjectRecord(db, row) {
  const classRow = findClass(db, row.classId || row.className);
  const subjectRow = findSubject(db, row.subjectId || row.subjectName);
  const teacher = findTeacher(db, row.teacherUserId) || findUser(db, row.teacherUserId);
  const session = findAcademicSession(db, row.sessionId || row.sessionName);
  const term = findAcademicTerm(db, row.termId || row.termName);
  return {
    ...row,
    classId: classRow?.id || row.classId || "",
    className: classRow?.name || row.className || "",
    classOrder: safeNumber(classRow?.order, 999),
    subjectId: subjectRow?.id || row.subjectId || "",
    subjectName: subjectRow?.subjectName || row.subjectName || "",
    teacherUserId: teacher?.id || row.teacherUserId || "",
    teacherName: teacher?.name || row.teacherName || "",
    sessionId: session?.id || row.sessionId || "",
    sessionName: session?.sessionName || row.sessionName || "",
    termId: term?.id || row.termId || "",
    termName: term?.termName || row.termName || "",
  };
}

function normalizeTopicRecord(db, row) {
  const classSubject = normalizeClassSubjectRecord(db, findClassSubject(db, row.classSubjectId) || {});
  return {
    ...row,
    classSubjectId: classSubject.id || row.classSubjectId || "",
    classId: classSubject.classId,
    className: classSubject.className,
    classOrder: classSubject.classOrder,
    subjectId: classSubject.subjectId,
    subjectName: classSubject.subjectName,
    teacherUserId: classSubject.teacherUserId,
    teacherName: classSubject.teacherName,
    sessionId: classSubject.sessionId,
    sessionName: classSubject.sessionName,
    termId: classSubject.termId,
    termName: classSubject.termName,
    topicTitle: safeString(row.topicTitle),
    topicDescription: safeString(row.topicDescription),
    weekNo: safeNumber(row.weekNo, 0),
    position: safeNumber(row.position, 0),
  };
}

function normalizeLessonRecord(db, row) {
  const classSubject = normalizeClassSubjectRecord(db, findClassSubject(db, row.classSubjectId) || {});
  const topic = normalizeTopicRecord(db, findTopic(db, row.topicId) || {});
  return {
    ...row,
    classSubjectId: classSubject.id || row.classSubjectId || "",
    classId: classSubject.classId,
    className: classSubject.className,
    classOrder: classSubject.classOrder,
    subjectId: classSubject.subjectId,
    subjectName: classSubject.subjectName,
    teacherUserId: classSubject.teacherUserId,
    teacherName: classSubject.teacherName,
    sessionId: classSubject.sessionId,
    sessionName: classSubject.sessionName,
    termId: classSubject.termId,
    termName: classSubject.termName,
    topicId: topic.id || row.topicId || "",
    topicTitle: topic.topicTitle || "",
    lessonTitle: safeString(row.lessonTitle),
    lessonSummary: safeString(row.lessonSummary),
    lessonNote: safeString(row.lessonNote),
    lessonDate: safeString(row.lessonDate),
    publishStatus: safeString(row.publishStatus || "DRAFT") || "DRAFT",
  };
}

function normalizeAssignmentRecord(db, row) {
  const classSubject = normalizeClassSubjectRecord(db, findClassSubject(db, row.classSubjectId) || {});
  const topic = normalizeTopicRecord(db, findTopic(db, row.topicId) || {});
  const lesson = normalizeLessonRecord(db, findLesson(db, row.lessonId) || {});
  return {
    ...row,
    classSubjectId: classSubject.id || row.classSubjectId || "",
    classId: classSubject.classId,
    className: classSubject.className,
    classOrder: classSubject.classOrder,
    subjectId: classSubject.subjectId,
    subjectName: classSubject.subjectName,
    teacherUserId: classSubject.teacherUserId,
    teacherName: classSubject.teacherName,
    sessionId: classSubject.sessionId,
    sessionName: classSubject.sessionName,
    termId: classSubject.termId,
    termName: classSubject.termName,
    topicId: topic.id || row.topicId || "",
    topicTitle: topic.topicTitle || "",
    lessonId: lesson.id || row.lessonId || "",
    lessonTitle: lesson.lessonTitle || "",
    title: safeString(row.title),
    instructions: safeString(row.instructions),
    dueDate: safeString(row.dueDate),
    status: safeString(row.status || "DRAFT") || "DRAFT",
  };
}

function normalizeQuizRecord(db, row) {
  const classSubject = normalizeClassSubjectRecord(db, findClassSubject(db, row.classSubjectId) || {});
  const topic = normalizeTopicRecord(db, findTopic(db, row.topicId) || {});
  const lesson = normalizeLessonRecord(db, findLesson(db, row.lessonId) || {});
  return {
    ...row,
    classSubjectId: classSubject.id || row.classSubjectId || "",
    classId: classSubject.classId,
    className: classSubject.className,
    classOrder: classSubject.classOrder,
    subjectId: classSubject.subjectId,
    subjectName: classSubject.subjectName,
    teacherUserId: classSubject.teacherUserId,
    teacherName: classSubject.teacherName,
    sessionId: classSubject.sessionId,
    sessionName: classSubject.sessionName,
    termId: classSubject.termId,
    termName: classSubject.termName,
    topicId: topic.id || row.topicId || "",
    topicTitle: topic.topicTitle || "",
    lessonId: lesson.id || row.lessonId || "",
    lessonTitle: lesson.lessonTitle || "",
    title: safeString(row.title),
    instructions: safeString(row.instructions),
    startAt: safeString(row.startAt),
    endAt: safeString(row.endAt),
    status: safeString(row.status || "DRAFT") || "DRAFT",
  };
}

function normalizeSchemeAttachmentRecord(row) {
  return {
    ...row,
    fileTitle: safeString(row.fileTitle),
    fileName: safeString(row.fileName),
    filePath: safeString(row.filePath || row.externalUrl),
    mimeType: safeString(row.mimeType),
    fileSize: safeNumber(row.fileSize, 0),
    hasInlineFile: safeString(row.filePath).startsWith("data:"),
  };
}

function normalizeSchemeWeekRecord(db, row) {
  const latestProgress = sortNewest(
    safeArray(db.schemeOfWorkProgressLogs).filter((item) => String(item.schemeWeekId) === String(row.id))
  )[0] || null;
  const classSubject = normalizeClassSubjectRecord(db, findClassSubject(db, row.linkedClassSubjectId) || {});
  const topic = normalizeTopicRecord(db, findTopic(db, row.linkedTopicId) || {});
  const lesson = normalizeLessonRecord(db, findLesson(db, row.linkedLessonId) || {});
  const assignment = normalizeAssignmentRecord(db, findAssignment(db, row.linkedAssignmentId) || {});
  const quiz = normalizeQuizRecord(db, findQuiz(db, row.linkedQuizId) || {});
  const lessonNote = safeArray(db.lessonNotes).find((item) => String(item.schemeWeekId) === String(row.id)) || null;
  const attachments = sortNewest(
    safeArray(db.schemeOfWorkAttachments)
      .filter((item) => String(item.schemeWeekId) === String(row.id))
      .map((item) => normalizeSchemeAttachmentRecord(item))
  );

  return {
    ...row,
    weekNumber: safeNumber(row.weekNumber, 0),
    title: safeString(row.title) || `Week ${safeNumber(row.weekNumber, 0)}`,
    topic: safeString(row.topic),
    subTopic: safeString(row.subTopic),
    learningObjectives: safeString(row.learningObjectives),
    teachingActivities: safeString(row.teachingActivities),
    learningMaterials: safeString(row.learningMaterials),
    assessmentMethod: safeString(row.assessmentMethod),
    teacherNote: safeString(row.teacherNote),
    completionStatus: ensureOption(row.completionStatus, SCHEME_COMPLETION_STATUSES, "pending"),
    completionStatusLabel: humanize(ensureOption(row.completionStatus, SCHEME_COMPLETION_STATUSES, "pending")),
    sortOrder: safeNumber(row.sortOrder || row.weekNumber, safeNumber(row.weekNumber, 0)),
    latestProgressAt: latestProgress?.createdAt || "",
    latestProgressNote: latestProgress?.note || "",
    linkedClassSubjectId: classSubject.id || safeString(row.linkedClassSubjectId),
    linkedClassSubjectLabel: classSubject.id ? `${classSubject.className} - ${classSubject.subjectName}` : "",
    linkedTopicId: topic.id || safeString(row.linkedTopicId),
    linkedTopicTitle: topic.topicTitle || "",
    linkedLessonId: lesson.id || safeString(row.linkedLessonId),
    linkedLessonTitle: lesson.lessonTitle || "",
    linkedLessonNote: lesson.lessonNote || "",
    linkedAssignmentId: assignment.id || safeString(row.linkedAssignmentId),
    linkedAssignmentTitle: assignment.title || "",
    linkedQuizId: quiz.id || safeString(row.linkedQuizId),
    linkedQuizTitle: quiz.title || "",
    linkedLessonNoteId: safeString(lessonNote?.id),
    linkedLessonNoteTitle: safeString(lessonNote?.title),
    linkedLessonNoteStatus: safeString(lessonNote?.status),
    linkedLessonNoteStatusLabel: lessonNote?.status ? humanize(lessonNote.status) : "",
    attachments,
    attachmentsCount: attachments.length,
  };
}

function normalizeSchemeTermRecord(db, row, options = {}) {
  const schemeSession = safeArray(db.schemeOfWorkSessions).find((item) => String(item.id) === String(row.schemeSessionId)) || null;
  const academicSession = findAcademicSession(db, schemeSession?.sessionId || row.sessionId);
  const academicTerm = findAcademicTerm(db, row.termId || row.termName);
  const classRow = findClass(db, row.classId || row.className);
  const subjectRow = findSubject(db, row.subjectId || row.subjectName);
  const teacher = findTeacher(db, row.teacherUserId) || findUser(db, row.teacherUserId);
  const weeks = safeArray(options.weeks || db.schemeOfWorkWeeks.filter((item) => String(item.schemeTermId) === String(row.id))).map((item) =>
    normalizeSchemeWeekRecord(db, item)
  );
  const approvals = sortNewest(
    safeArray(options.approvals || db.schemeOfWorkApprovals.filter((item) => String(item.schemeTermId) === String(row.id)))
  );
  const summary = weekSummary(weeks);
  const latestApproval = approvals[0] || null;

  return {
    ...row,
    schemeSessionTitle: schemeSession?.title || "",
    sessionId: academicSession?.id || schemeSession?.sessionId || row.sessionId || "",
    sessionName: academicSession?.sessionName || schemeSession?.sessionName || row.sessionName || "",
    termId: academicTerm?.id || row.termId || "",
    termName: academicTerm?.termName || row.termName || "",
    classId: classRow?.id || row.classId || "",
    className: classRow?.name || row.className || "",
    classOrder: safeNumber(classRow?.order, 999),
    subjectId: subjectRow?.id || row.subjectId || "",
    subjectName: subjectRow?.subjectName || row.subjectName || "",
    teacherUserId: teacher?.id || row.teacherUserId || "",
    teacherName: teacher?.name || row.teacherName || "",
    status: ensureOption(row.status, SCHEME_TERM_STATUSES, "draft"),
    statusLabel: humanize(ensureOption(row.status, SCHEME_TERM_STATUSES, "draft")),
    weeksTotal: summary.total,
    completedWeeks: summary.completed,
    inProgressWeeks: summary.inProgress,
    pendingWeeks: summary.pending,
    skippedWeeks: summary.skipped,
    coveragePercent: summary.coveragePercent,
    latestApprovalStatus: latestApproval?.approvalStatus || "",
    latestApprovalStatusLabel: latestApproval?.approvalStatus ? humanize(latestApproval.approvalStatus) : "",
    latestApprovalNote: latestApproval?.note || "",
    latestApprovalAt: latestApproval?.approvedAt || latestApproval?.createdAt || "",
  };
}

function normalizeSchemeSessionRecord(db, row) {
  const academicSession = findAcademicSession(db, row.sessionId || row.sessionName);
  const terms = safeArray(db.schemeOfWorkTerms).filter((item) => String(item.schemeSessionId) === String(row.id));
  const weekCount = terms.reduce(
    (sum, item) => sum + safeArray(db.schemeOfWorkWeeks).filter((week) => String(week.schemeTermId) === String(item.id)).length,
    0
  );

  return {
    ...row,
    sessionId: academicSession?.id || row.sessionId || "",
    sessionName: academicSession?.sessionName || row.sessionName || "",
    status: ensureOption(row.status, SCHEME_SESSION_STATUSES, "draft"),
    schemesCount: terms.length,
    weekCount,
  };
}

function normalizeApprovalRecord(db, row) {
  const termRow = safeArray(db.schemeOfWorkTerms).find((item) => String(item.id) === String(row.schemeTermId)) || null;
  const term = termRow ? normalizeSchemeTermRecord(db, termRow) : null;
  const approver = findUser(db, row.approvedBy);

  return {
    ...row,
    approvalStatus: ensureOption(row.approvalStatus, SCHEME_APPROVAL_STATUSES, "pending"),
    approvalStatusLabel: humanize(ensureOption(row.approvalStatus, SCHEME_APPROVAL_STATUSES, "pending")),
    approverName: approver?.name || row.approverName || "",
    sessionName: term?.sessionName || "",
    termName: term?.termName || "",
    className: term?.className || "",
    subjectName: term?.subjectName || "",
    teacherName: term?.teacherName || "",
  };
}

function normalizeProgressLogRecord(db, row) {
  const week = safeArray(db.schemeOfWorkWeeks).find((item) => String(item.id) === String(row.schemeWeekId)) || null;
  const termRow = week ? safeArray(db.schemeOfWorkTerms).find((item) => String(item.id) === String(week.schemeTermId)) || null : null;
  const term = termRow ? normalizeSchemeTermRecord(db, termRow) : null;
  const updater = findUser(db, row.updatedBy);

  return {
    ...row,
    updaterName: updater?.name || row.updaterName || "",
    oldStatus: ensureOption(row.oldStatus, SCHEME_COMPLETION_STATUSES, "pending"),
    newStatus: ensureOption(row.newStatus, SCHEME_COMPLETION_STATUSES, "pending"),
    oldStatusLabel: humanize(ensureOption(row.oldStatus, SCHEME_COMPLETION_STATUSES, "pending")),
    newStatusLabel: humanize(ensureOption(row.newStatus, SCHEME_COMPLETION_STATUSES, "pending")),
    weekNumber: safeNumber(week?.weekNumber, 0),
    topic: safeString(week?.topic),
    sessionName: term?.sessionName || "",
    termName: term?.termName || "",
    className: term?.className || "",
    subjectName: term?.subjectName || "",
    teacherName: term?.teacherName || "",
  };
}

function listSchemeSessions(db, filters = {}) {
  const includeArchived = Boolean(filters.includeArchived);
  return safeArray(db.schemeOfWorkSessions)
    .map((item) => normalizeSchemeSessionRecord(db, item))
    .filter((item) => (includeArchived ? true : item.status !== "archived"))
    .sort((a, b) => safeString(b.sessionName).localeCompare(safeString(a.sessionName)));
}

function listSchemeTerms(db, filters = {}, user = null) {
  const rows = visibleSchemeTermRows(db, user)
    .map((item) => normalizeSchemeTermRecord(db, item))
    .filter((item) => (filters.schemeSessionId ? String(item.schemeSessionId) === String(filters.schemeSessionId) : true))
    .filter((item) => (filters.sessionId ? String(item.sessionId) === String(filters.sessionId) : true))
    .filter((item) => (filters.termId ? String(item.termId) === String(filters.termId) : true))
    .filter((item) => (filters.classId ? String(item.classId) === String(filters.classId) : true))
    .filter((item) => (filters.subjectId ? String(item.subjectId) === String(filters.subjectId) : true))
    .filter((item) => (filters.teacherUserId ? String(item.teacherUserId) === String(filters.teacherUserId) : true))
    .filter((item) => (filters.status ? safeLower(item.status) === safeLower(filters.status) : true));
  return sortSchemeTerms(rows);
}

function listSchemeWeeks(db, filters = {}, user = null) {
  const visibleTermIds = new Set(visibleSchemeTermRows(db, user).map((item) => String(item.id)));
  return sortWeeks(
    safeArray(db.schemeOfWorkWeeks).filter((item) => visibleTermIds.has(String(item.schemeTermId)))
  )
    .map((item) => normalizeSchemeWeekRecord(db, item))
    .filter((item) => (filters.schemeTermId ? String(item.schemeTermId) === String(filters.schemeTermId) : true))
    .filter((item) => (filters.completionStatus ? safeLower(item.completionStatus) === safeLower(filters.completionStatus) : true));
}

function listSchemeApprovals(db, filters = {}, user = null) {
  const visibleTermIds = new Set(visibleSchemeTermRows(db, user).map((item) => String(item.id)));
  return sortNewest(
    safeArray(db.schemeOfWorkApprovals)
      .filter((item) => visibleTermIds.has(String(item.schemeTermId)))
      .map((item) => normalizeApprovalRecord(db, item))
      .filter((item) => (filters.schemeTermId ? String(item.schemeTermId) === String(filters.schemeTermId) : true))
      .filter((item) => (filters.status ? safeLower(item.approvalStatus) === safeLower(filters.status) : true))
  );
}

function listSchemeProgressLogs(db, filters = {}, user = null) {
  const visibleWeekIds = new Set(listSchemeWeeks(db, {}, user).map((item) => String(item.id)));
  return sortNewest(
    safeArray(db.schemeOfWorkProgressLogs)
      .filter((item) => visibleWeekIds.has(String(item.schemeWeekId)))
      .map((item) => normalizeProgressLogRecord(db, item))
      .filter((item) => (filters.sessionId ? String(item.sessionId) === String(filters.sessionId) : true))
  );
}

function buildSchemeTermDetail(db, schemeTermId) {
  const row = safeArray(db.schemeOfWorkTerms).find((item) => String(item.id) === String(schemeTermId));
  if (!row) return null;
  const weekRows = sortWeeks(safeArray(db.schemeOfWorkWeeks).filter((item) => String(item.schemeTermId) === String(schemeTermId)));
  const approvalRows = sortNewest(safeArray(db.schemeOfWorkApprovals).filter((item) => String(item.schemeTermId) === String(schemeTermId)));
  const progressRows = sortNewest(
    safeArray(db.schemeOfWorkProgressLogs).filter((item) => weekRows.some((week) => String(week.id) === String(item.schemeWeekId)))
  );
  const detail = normalizeSchemeTermRecord(db, row, { weeks: weekRows, approvals: approvalRows });
  return {
    ...detail,
    weeks: weekRows.map((item) => normalizeSchemeWeekRecord(db, item)),
    approvals: approvalRows.map((item) => normalizeApprovalRecord(db, item)),
    progressLogs: progressRows.map((item) => normalizeProgressLogRecord(db, item)),
  };
}

function buildSchemeProgressRows(db, filters = {}, user = null) {
  return listSchemeTerms(db, filters, user).map((item) => ({
    id: item.id,
    sessionName: item.sessionName,
    termName: item.termName,
    className: item.className,
    subjectName: item.subjectName,
    teacherName: item.teacherName,
    status: item.status,
    statusLabel: item.statusLabel,
    weeksTotal: item.weeksTotal,
    completedWeeks: item.completedWeeks,
    inProgressWeeks: item.inProgressWeeks,
    pendingWeeks: item.pendingWeeks,
    skippedWeeks: item.skippedWeeks,
    coveragePercent: item.coveragePercent,
  }));
}

function buildSchemeSetup(db) {
  return {
    sessions: [...safeArray(db.lmsSessions)].sort((a, b) => safeString(b.sessionName).localeCompare(safeString(a.sessionName))),
    terms: [...safeArray(db.lmsTerms)].sort((a, b) => termOrderValue(a.termName) - termOrderValue(b.termName)),
    classes: sortClasses(db.classes),
    subjects: [...safeArray(db.lmsSubjects)].sort((a, b) => safeString(a.subjectName).localeCompare(safeString(b.subjectName))),
    teachers: safeArray(db.users)
      .filter((item) => safeString(item.role).toUpperCase() === "TEACHER")
      .map((item) => ({ id: item.id, name: item.name, username: item.username, subjects: safeArray(item.subjects) }))
      .sort((a, b) => safeString(a.name).localeCompare(safeString(b.name))),
    classSubjects: sortSchemeTerms(safeArray(db.lmsClassSubjects).map((item) => normalizeClassSubjectRecord(db, item))),
    topics: sortWeeks(safeArray(db.lmsTopics).map((item) => normalizeTopicRecord(db, item))),
    lessons: sortNewest(safeArray(db.lmsLessons).map((item) => normalizeLessonRecord(db, item)), "lessonDate"),
    assignments: sortNewest(safeArray(db.lmsAssignments).map((item) => normalizeAssignmentRecord(db, item)), "dueDate"),
    quizzes: sortNewest(safeArray(db.lmsQuizzes).map((item) => normalizeQuizRecord(db, item)), "startAt"),
    activeSessionId: safeArray(db.lmsSessions).find((item) => item.isActive)?.id || safeArray(db.lmsSessions)[0]?.id || "",
    activeTermId: safeArray(db.lmsTerms).find((item) => item.isActive)?.id || safeArray(db.lmsTerms)[0]?.id || "",
    statuses: {
      session: SCHEME_SESSION_STATUSES,
      term: SCHEME_TERM_STATUSES,
      completion: SCHEME_COMPLETION_STATUSES,
      approval: SCHEME_APPROVAL_STATUSES,
    },
  };
}

function buildTeacherCoverage(terms = []) {
  const byTeacher = new Map();
  terms.forEach((term) => {
    const key = safeString(term.teacherUserId || term.teacherName || "unassigned");
    if (!byTeacher.has(key)) {
      byTeacher.set(key, {
        teacherUserId: term.teacherUserId || "",
        teacherName: term.teacherName || "Unassigned",
        schemesCount: 0,
        weeksTotal: 0,
        completedWeeks: 0,
        inProgressWeeks: 0,
        pendingWeeks: 0,
        skippedWeeks: 0,
        approvedSchemes: 0,
        reviewQueue: 0,
      });
    }
    const row = byTeacher.get(key);
    row.schemesCount += 1;
    row.weeksTotal += safeNumber(term.weeksTotal, 0);
    row.completedWeeks += safeNumber(term.completedWeeks, 0);
    row.inProgressWeeks += safeNumber(term.inProgressWeeks, 0);
    row.pendingWeeks += safeNumber(term.pendingWeeks, 0);
    row.skippedWeeks += safeNumber(term.skippedWeeks, 0);
    if (term.status === "approved") row.approvedSchemes += 1;
    if (term.status === "draft" || term.status === "in_review") row.reviewQueue += 1;
  });
  return [...byTeacher.values()]
    .map((row) => ({
      ...row,
      coveragePercent: row.weeksTotal ? Math.round((row.completedWeeks / row.weeksTotal) * 100) : 0,
      averageWeeksPerScheme: row.schemesCount ? Number((row.weeksTotal / row.schemesCount).toFixed(1)) : 0,
      needsAttention: row.reviewQueue > 0 || (row.weeksTotal > 0 && row.completedWeeks / row.weeksTotal < 0.5),
    }))
    .sort((a, b) => {
      if (Number(b.needsAttention) !== Number(a.needsAttention)) return Number(b.needsAttention) - Number(a.needsAttention);
      const queueDiff = safeNumber(b.reviewQueue, 0) - safeNumber(a.reviewQueue, 0);
      if (queueDiff !== 0) return queueDiff;
      const coverageDiff = safeNumber(a.coveragePercent, 0) - safeNumber(b.coveragePercent, 0);
      if (coverageDiff !== 0) return coverageDiff;
      return safeString(a.teacherName).localeCompare(safeString(b.teacherName));
    });
}

function buildSubjectCoverage(terms = []) {
  const bySubject = new Map();
  terms.forEach((term) => {
    const key = safeString(term.subjectId || term.subjectName || "unknown-subject");
    if (!bySubject.has(key)) {
      bySubject.set(key, {
        subjectId: term.subjectId || "",
        subjectName: term.subjectName || "Unknown Subject",
        classesCovered: new Set(),
        schemesCount: 0,
        weeksTotal: 0,
        completedWeeks: 0,
        pendingWeeks: 0,
        approvedSchemes: 0,
      });
    }
    const row = bySubject.get(key);
    row.classesCovered.add(term.className || term.classId || "");
    row.schemesCount += 1;
    row.weeksTotal += safeNumber(term.weeksTotal, 0);
    row.completedWeeks += safeNumber(term.completedWeeks, 0);
    row.pendingWeeks += safeNumber(term.pendingWeeks, 0);
    if (term.status === "approved") row.approvedSchemes += 1;
  });
  return [...bySubject.values()]
    .map((row) => ({
      ...row,
      classesCovered: row.classesCovered.size,
      coveragePercent: row.weeksTotal ? Math.round((row.completedWeeks / row.weeksTotal) * 100) : 0,
    }))
    .sort((a, b) => {
      const coverageDiff = safeNumber(a.coveragePercent, 0) - safeNumber(b.coveragePercent, 0);
      if (coverageDiff !== 0) return coverageDiff;
      return safeString(a.subjectName).localeCompare(safeString(b.subjectName));
    });
}

function buildAtRiskSchemes(terms = []) {
  return terms
    .filter((term) => term.status !== "approved" || safeNumber(term.coveragePercent, 0) < 60 || safeNumber(term.pendingWeeks, 0) > safeNumber(term.completedWeeks, 0))
    .map((term) => ({
      id: term.id,
      sessionName: term.sessionName,
      termName: term.termName,
      className: term.className,
      subjectName: term.subjectName,
      teacherName: term.teacherName,
      status: term.status,
      statusLabel: term.statusLabel,
      coveragePercent: term.coveragePercent,
      weeksTotal: term.weeksTotal,
      pendingWeeks: term.pendingWeeks,
      completedWeeks: term.completedWeeks,
      riskReason:
        term.status !== "approved"
          ? "Scheme still requires review or approval."
          : safeNumber(term.coveragePercent, 0) < 60
            ? "Weekly coverage is below the expected level."
            : "Pending weeks are still higher than completed weeks.",
    }))
    .sort((a, b) => {
      const coverageDiff = safeNumber(a.coveragePercent, 0) - safeNumber(b.coveragePercent, 0);
      if (coverageDiff !== 0) return coverageDiff;
      return safeString(a.className).localeCompare(safeString(b.className));
    });
}

function buildSchemeAnalytics(db, filters = {}, user = null) {
  const terms = listSchemeTerms(db, filters, user);
  const weeks = listSchemeWeeks(db, filters.schemeTermId ? { schemeTermId: filters.schemeTermId } : {}, user);
  const teacherCoverage = buildTeacherCoverage(terms);
  const subjectCoverage = buildSubjectCoverage(terms);
  const atRiskSchemes = buildAtRiskSchemes(terms);
  return {
    totals: {
      schemesCount: terms.length,
      weeksCount: weeks.length,
      completedWeeks: weeks.filter((item) => item.completionStatus === "completed").length,
      approvalQueue: terms.filter((item) => item.status === "draft" || item.status === "in_review").length,
      onTrackSchemes: terms.filter((item) => item.status === "approved" && safeNumber(item.coveragePercent, 0) >= 60).length,
      atRiskSchemes: atRiskSchemes.length,
    },
    teacherCoverage,
    subjectCoverage,
    atRiskSchemes,
  };
}

function buildSchemeDashboard(db, user = null) {
  const visibleTerms = listSchemeTerms(db, {}, user);
  const visibleWeeks = listSchemeWeeks(db, {}, user);
  const visibleWeekIds = new Set(visibleWeeks.map((item) => String(item.id)));
  const recentActivity = [
    ...safeArray(db.schemeOfWorkProgressLogs)
      .filter((item) => visibleWeekIds.has(String(item.schemeWeekId)))
      .map((item) => {
        const entry = normalizeProgressLogRecord(db, item);
        return {
          id: `progress-${entry.id}`,
          createdAt: entry.createdAt,
          title: `${entry.className} ${entry.subjectName} - Week ${entry.weekNumber}`,
          summary: `${entry.newStatusLabel} by ${entry.updaterName || "School team"}`,
          detail: entry.note || entry.topic || "Progress updated",
        };
      }),
    ...visibleTerms.map((item) => ({
      id: `term-${item.id}`,
      createdAt: item.updatedAt,
      title: `${item.className} ${item.subjectName} - ${item.termName}`,
      summary: `${item.statusLabel} scheme plan`,
      detail: item.teacherName ? `Assigned teacher: ${item.teacherName}` : "Scheme record updated",
    })),
  ]
    .sort((a, b) => safeString(b.createdAt).localeCompare(safeString(a.createdAt)))
    .slice(0, 8);

  return {
    activeSessionName: listSchemeSessions(db, { includeArchived: true }).find((item) => item.status === "active")?.sessionName || "",
    totals: {
      schemesCreated: visibleTerms.length,
      pendingApproval: visibleTerms.filter((item) => item.status === "in_review").length,
      completedWeeklyEntries: visibleWeeks.filter((item) => item.completionStatus === "completed").length,
      classesCovered: new Set(visibleTerms.map((item) => String(item.classId))).size,
      subjectsCovered: new Set(visibleTerms.map((item) => String(item.subjectId))).size,
      archivedSessions: listSchemeSessions(db, { includeArchived: true }).filter((item) => item.status === "archived").length,
    },
    recentActivity,
    assignedSchemes: user?.role === "TEACHER" ? visibleTerms.slice(0, 6) : [],
  };
}
function validateWeekLinks(db, schemeTermRow, links = {}) {
  const normalizedTerm = normalizeSchemeTermRecord(db, schemeTermRow);
  const linkedClassSubjectId = safeString(links.linkedClassSubjectId);
  const linkedTopicId = safeString(links.linkedTopicId);
  const linkedLessonId = safeString(links.linkedLessonId);
  const linkedAssignmentId = safeString(links.linkedAssignmentId);
  const linkedQuizId = safeString(links.linkedQuizId);
  const hasAnyLinks = [linkedClassSubjectId, linkedTopicId, linkedLessonId, linkedAssignmentId, linkedQuizId].some(Boolean);
  if (!hasAnyLinks) {
    return {
      linkedClassSubjectId: "",
      linkedTopicId: "",
      linkedLessonId: "",
      linkedAssignmentId: "",
      linkedQuizId: "",
    };
  }

  const topic = linkedTopicId ? findTopic(db, linkedTopicId) : null;
  const lesson = linkedLessonId ? findLesson(db, linkedLessonId) : null;
  const assignment = linkedAssignmentId ? findAssignment(db, linkedAssignmentId) : null;
  const quiz = linkedQuizId ? findQuiz(db, linkedQuizId) : null;

  if (linkedTopicId && !topic) throw createHttpError(404, "Linked LMS topic not found");
  if (linkedLessonId && !lesson) throw createHttpError(404, "Linked LMS lesson not found");
  if (linkedAssignmentId && !assignment) throw createHttpError(404, "Linked LMS assignment not found");
  if (linkedQuizId && !quiz) throw createHttpError(404, "Linked LMS quiz not found");

  const candidateClassSubjectIds = [
    linkedClassSubjectId,
    topic?.classSubjectId,
    lesson?.classSubjectId,
    assignment?.classSubjectId,
    quiz?.classSubjectId,
  ].filter(Boolean);
  const uniqueClassSubjectIds = [...new Set(candidateClassSubjectIds.map((item) => String(item)))];
  if (uniqueClassSubjectIds.length > 1) {
    throw createHttpError(400, "All linked LMS items must belong to the same class subject");
  }

  const classSubject = uniqueClassSubjectIds.length ? findClassSubject(db, uniqueClassSubjectIds[0]) : null;
  if (!classSubject) throw createHttpError(400, "Select a valid LMS class subject before linking LMS items");
  const normalizedClassSubject = normalizeClassSubjectRecord(db, classSubject);

  if (String(normalizedClassSubject.classId) !== String(normalizedTerm.classId) || String(normalizedClassSubject.subjectId) !== String(normalizedTerm.subjectId)) {
    throw createHttpError(400, "Linked LMS class subject must match the scheme class and subject");
  }
  if (normalizedClassSubject.sessionId && normalizedTerm.sessionId && String(normalizedClassSubject.sessionId) !== String(normalizedTerm.sessionId)) {
    throw createHttpError(400, "Linked LMS class subject must belong to the same academic session");
  }
  if (normalizedClassSubject.termId && normalizedTerm.termId && String(normalizedClassSubject.termId) !== String(normalizedTerm.termId)) {
    throw createHttpError(400, "Linked LMS class subject must belong to the same term");
  }
  if (topic && String(topic.classSubjectId) !== String(normalizedClassSubject.id)) {
    throw createHttpError(400, "Linked topic does not belong to the selected LMS class subject");
  }
  if (lesson && String(lesson.classSubjectId) !== String(normalizedClassSubject.id)) {
    throw createHttpError(400, "Linked lesson does not belong to the selected LMS class subject");
  }
  if (assignment && String(assignment.classSubjectId) !== String(normalizedClassSubject.id)) {
    throw createHttpError(400, "Linked assignment does not belong to the selected LMS class subject");
  }
  if (quiz && String(quiz.classSubjectId) !== String(normalizedClassSubject.id)) {
    throw createHttpError(400, "Linked quiz does not belong to the selected LMS class subject");
  }
  if (topic && lesson?.topicId && String(lesson.topicId) !== String(topic.id)) {
    throw createHttpError(400, "Linked lesson does not belong to the selected LMS topic");
  }
  if (topic && assignment?.topicId && String(assignment.topicId) !== String(topic.id)) {
    throw createHttpError(400, "Linked assignment does not belong to the selected LMS topic");
  }
  if (topic && quiz?.topicId && String(quiz.topicId) !== String(topic.id)) {
    throw createHttpError(400, "Linked quiz does not belong to the selected LMS topic");
  }
  if (lesson && assignment?.lessonId && String(assignment.lessonId) !== String(lesson.id)) {
    throw createHttpError(400, "Linked assignment does not belong to the selected LMS lesson");
  }
  if (lesson && quiz?.lessonId && String(quiz.lessonId) !== String(lesson.id)) {
    throw createHttpError(400, "Linked quiz does not belong to the selected LMS lesson");
  }

  return {
    linkedClassSubjectId: normalizedClassSubject.id,
    linkedTopicId: topic?.id || "",
    linkedLessonId: lesson?.id || "",
    linkedAssignmentId: assignment?.id || "",
    linkedQuizId: quiz?.id || "",
  };
}

function escapeHtml(value) {
  return safeString(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function wrapPdfLine(text, maxLength = 88) {
  const content = safeString(text);
  if (!content) return [""];
  if (content.length <= maxLength) return [content];
  const words = content.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });
  if (current) lines.push(current);
  return lines.length ? lines : [content];
}

function pdfEscape(text) {
  return String(text || "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[\r\n]+/g, " ");
}

function pdfText(x, y, font, size, text, color = "0 0 0") {
  return `${color} rg\nBT /${font} ${size} Tf ${x} ${y} Td (${pdfEscape(text)}) Tj ET`;
}

function buildSchemeExportHtml(detail) {
  if (!detail) throw createHttpError(404, "Scheme of work not found");

  const weekSections = detail.weeks
    .map(
      (week) => `
<section class="week-card">
  <div class="week-head">
    <div>
      <h3>Week ${escapeHtml(week.weekNumber)} - ${escapeHtml(week.topic)}</h3>
      <p>${escapeHtml(week.subTopic || week.title || "Scheme entry")}</p>
    </div>
    <span class="status">${escapeHtml(week.completionStatusLabel)}</span>
  </div>
  <dl>
    <dt>Learning Objectives</dt><dd>${escapeHtml(week.learningObjectives)}</dd>
    <dt>Teaching Activities</dt><dd>${escapeHtml(week.teachingActivities || "-")}</dd>
    <dt>Learning Materials</dt><dd>${escapeHtml(week.learningMaterials || "-")}</dd>
    <dt>Assessment Method</dt><dd>${escapeHtml(week.assessmentMethod || "-")}</dd>
    <dt>Teacher Note</dt><dd>${escapeHtml(week.teacherNote || "-")}</dd>
  </dl>
</section>`
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(detail.className)} ${escapeHtml(detail.subjectName)} Scheme of Work</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; color: #10233d; }
    .brand { margin-bottom: 24px; }
    .meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 24px; }
    .meta-card, .week-card { border: 1px solid #d7e2ef; border-radius: 14px; padding: 16px; background: #ffffff; }
    .summary { margin: 20px 0; padding: 16px; background: #f8fbff; border: 1px solid #d7e2ef; border-radius: 14px; }
    .week-card { margin-bottom: 16px; }
    .week-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 12px; }
    dt { font-weight: 700; }
    dd { margin: 0 0 10px; white-space: pre-wrap; }
  </style>
</head>
<body>
  <div class="brand">
    <h1>Angel Montessori School</h1>
    <p>Scheme of Work Export</p>
  </div>
  <div class="meta">
    <div class="meta-card"><strong>Session</strong><div>${escapeHtml(detail.sessionName)}</div></div>
    <div class="meta-card"><strong>Term</strong><div>${escapeHtml(detail.termName)}</div></div>
    <div class="meta-card"><strong>Class</strong><div>${escapeHtml(detail.className)}</div></div>
    <div class="meta-card"><strong>Subject</strong><div>${escapeHtml(detail.subjectName)}</div></div>
    <div class="meta-card"><strong>Teacher</strong><div>${escapeHtml(detail.teacherName || "-")}</div></div>
    <div class="meta-card"><strong>Status</strong><div>${escapeHtml(detail.statusLabel)}</div></div>
  </div>
  <div class="summary">
    <strong>Coverage Summary</strong>
    <p>${escapeHtml(`${detail.completedWeeks} completed, ${detail.inProgressWeeks} in progress, ${detail.pendingWeeks} pending, ${detail.skippedWeeks} skipped out of ${detail.weeksTotal} weekly entries.`)}</p>
  </div>
  ${weekSections || "<p>No weekly entries have been added for this scheme yet.</p>"}
</body>
</html>`;
}

function buildSchemePdfLines(detail) {
  if (!detail) throw createHttpError(404, "Scheme of work not found");
  const lines = [
    "Angel Montessori School",
    "Scheme of Work",
    "",
    `${detail.sessionName} - ${detail.termName}`,
    `${detail.className} - ${detail.subjectName}`,
    `Teacher: ${detail.teacherName || "Not assigned"}`,
    `Status: ${detail.statusLabel}`,
    `Coverage: ${detail.completedWeeks}/${detail.weeksTotal} weeks completed (${detail.coveragePercent}%)`,
    "",
  ];
  detail.weeks.forEach((week) => {
    lines.push(`Week ${week.weekNumber}: ${week.topic}`);
    if (week.subTopic) lines.push(`Sub-topic: ${week.subTopic}`);
    wrapPdfLine(`Objectives: ${week.learningObjectives}`, 84).forEach((line) => lines.push(line));
    if (week.teachingActivities) wrapPdfLine(`Activities: ${week.teachingActivities}`, 84).forEach((line) => lines.push(line));
    if (week.learningMaterials) wrapPdfLine(`Materials: ${week.learningMaterials}`, 84).forEach((line) => lines.push(line));
    if (week.assessmentMethod) wrapPdfLine(`Assessment: ${week.assessmentMethod}`, 84).forEach((line) => lines.push(line));
    if (week.teacherNote) wrapPdfLine(`Teacher Note: ${week.teacherNote}`, 84).forEach((line) => lines.push(line));
    lines.push(`Status: ${week.completionStatusLabel}`);
    lines.push("");
  });
  if (!detail.weeks.length) lines.push("No weekly entries have been added for this scheme yet.");
  lines.push("Angel Montessori School - Building Lives, Inspiring Futures.");
  return lines;
}

function buildSchemePdfBuffer(detail) {
  const lines = buildSchemePdfLines(detail);
  const pages = [];
  for (let index = 0; index < lines.length; index += 52) pages.push(lines.slice(index, index + 52));
  if (!pages.length) pages.push(["No scheme of work content available"]);

  const objects = {};
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";
  objects[5] = "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>";

  let objectId = 6;
  const pageIds = [];
  pages.forEach((pageLines, pageIndex) => {
    const pageId = objectId;
    const contentId = objectId + 1;
    objectId += 2;
    pageIds.push(pageId);
    const operations = [];
    operations.push("0.11 0.31 0.56 rg\n36 792 523 28 re f");
    operations.push(pdfText(46, 801, "F4", 13, `SCHEME OF WORK - ${safeString(detail.className)} ${safeString(detail.subjectName)} (Page ${pageIndex + 1}/${pages.length})`, "1 1 1"));
    let y = 776;
    pageLines.forEach((line, lineIndex) => {
      const font = lineIndex < 2 || lineIndex === 3 || lineIndex === 4 ? "F4" : "F5";
      const size = font === "F4" ? 9.5 : 8.2;
      operations.push(pdfText(40, y, font, size, line));
      y -= 12;
    });
    const stream = operations.join("\n");
    objects[contentId] = `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`;
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F3 3 0 R /F4 4 0 R /F5 5 0 R >> >> /Contents ${contentId} 0 R >>`;
  });

  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((value) => `${value} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
  let pdf = "%PDF-1.4\n";
  const maxObjectId = objectId - 1;
  const offsets = new Array(maxObjectId + 1).fill(0);
  for (let index = 1; index <= maxObjectId; index += 1) {
    offsets[index] = Buffer.byteLength(pdf, "utf8");
    pdf += `${index} 0 obj\n${objects[index] || "<<>>"}\nendobj\n`;
  }
  const xrefStart = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${maxObjectId + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= maxObjectId; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${maxObjectId + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}

module.exports = {
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
  listSchemeProgressLogs,
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
};
