const { randomUUID } = require("crypto");
const {
  ensureEarlyYearsCurriculumShape,
  findAcademicSession,
  findAcademicTerm,
  listAccessibleEarlyYearsClasses,
  str,
  teacherAssignedClassIds,
} = require("./earlyYearsCurriculum");
const { ensureEarlyYearsPlanningShape } = require("./earlyYearsPlanning");
const { ensureEarlyYearsAssessmentShape } = require("./earlyYearsAssessment");
const { ensureEarlyYearsLiteracyShape } = require("./earlyYearsLiteracy");
const { ensureEarlyYearsEnvironmentShape } = require("./earlyYearsEnvironment");
const { ensureEarlyYearsInclusionShape } = require("./earlyYearsInclusion");
const { getApprovedClassConfig, normalizeAcademicKey } = require("./academicSystems");

const LEADER_ROLES = ["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER"];
const TEACHER_ROLES = ["TEACHER", ...LEADER_ROLES];
const PARENT_ROLES = ["PARENT"];
const REPORT_ROLES = [...new Set([...TEACHER_ROLES, ...PARENT_ROLES])];

const REPORT_TYPES = [
  "CRECHE_TERMLY",
  "NURSERY_TERMLY",
  "RECEPTION_TERMLY",
  "RECEPTION_END_OF_YEAR",
  "REPORT_ARCHIVE_COPY",
];

const REPORT_STATUSES = ["DRAFT", "SUBMITTED", "RETURNED_FOR_REVISION", "REVIEWED", "APPROVED", "PUBLISHED", "ARCHIVED"];
const AREA_DESCRIPTORS = ["EMERGING", "DEVELOPING", "SECURE"];
const AMES_REFERENCE_STATUSES = ["MEETING_REFERENCE", "DEVELOPING_TOWARDS_REFERENCE", "NOT_YET_ASSESSED"];
const TRANSITION_STATUSES = ["DRAFT", "SUBMITTED", "RETURNED_FOR_REVISION", "APPROVED", "PUBLISHED", "HANDED_OVER", "ARCHIVED"];

const EYFS_AREAS = [
  ["COMMUNICATION_LANGUAGE", "Communication and Language"],
  ["PSED", "Personal, Social and Emotional Development"],
  ["PHYSICAL_DEVELOPMENT", "Physical Development"],
  ["LITERACY", "Literacy"],
  ["MATHEMATICS", "Mathematics"],
  ["UNDERSTANDING_THE_WORLD", "Understanding the World"],
  ["EXPRESSIVE_ARTS_DESIGN", "Expressive Arts and Design"],
].map(([code, name], index) => ({ code, name, displayOrder: index + 1 }));

const ELG_REFERENCE_WORDING = "The Early Learning Goals are statutory end-of-Reception expectations within England's EYFS system. Angel Montessori School operates in Nigeria and adopts them as an end-of-Reception reference framework within its British-system Early Years programme.";

const ELG_REFERENCE_ITEMS = [
  ["COMMUNICATION_LANGUAGE", "Listening, Attention and Understanding"],
  ["COMMUNICATION_LANGUAGE", "Speaking"],
  ["PSED", "Self-Regulation"],
  ["PSED", "Managing Self"],
  ["PSED", "Building Relationships"],
  ["PHYSICAL_DEVELOPMENT", "Gross Motor Skills"],
  ["PHYSICAL_DEVELOPMENT", "Fine Motor Skills"],
  ["LITERACY", "Comprehension"],
  ["LITERACY", "Word Reading"],
  ["LITERACY", "Writing"],
  ["MATHEMATICS", "Number"],
  ["MATHEMATICS", "Numerical Patterns"],
  ["UNDERSTANDING_THE_WORLD", "Past and Present"],
  ["UNDERSTANDING_THE_WORLD", "People, Culture and Communities"],
  ["UNDERSTANDING_THE_WORLD", "The Natural World"],
  ["EXPRESSIVE_ARTS_DESIGN", "Creating with Materials"],
  ["EXPRESSIVE_ARTS_DESIGN", "Being Imaginative and Expressive"],
].map(([area, item], index) => ({ id: `elg-${index + 1}`, area, item, displayOrder: index + 1 }));

const READINESS_DOMAINS = [
  "COMMUNICATION",
  "PERSONAL_DEVELOPMENT",
  "SOCIAL_DEVELOPMENT",
  "EMOTIONAL_DEVELOPMENT",
  "PHYSICAL_DEVELOPMENT",
  "LITERACY",
  "MATHEMATICS",
  "INDEPENDENCE",
  "LEARNING_BEHAVIOUR",
  "CHARACTER",
];

const NEGATIVE_LANGUAGE_TERMS = [
  "weak",
  "bad",
  "lazy",
  "dull",
  "slow learner",
  "problem child",
  "poor reader",
  "bottom",
  "failure",
  "naughty",
];

const DISALLOWED_SCORE_TERMS = [
  "ca1",
  "ca2",
  "ca3",
  "exam mark",
  "examination mark",
  "percentage",
  "average",
  "class rank",
  "class position",
  "position in class",
  "cgpa",
  "score total",
];

function nowIso() {
  return new Date().toISOString();
}

function randomId(prefix) {
  return `${prefix}-${randomUUID().slice(0, 10)}`;
}

function arr(value) {
  return Array.isArray(value) ? value : [];
}

function bool(value) {
  return value === true || String(value || "").toLowerCase() === "true";
}

function roleOf(user) {
  return str(user?.role || user?.originalRole).toUpperCase();
}

function hasAnyRole(user, roles) {
  const role = roleOf(user);
  const originalRole = str(user?.originalRole).toUpperCase();
  return roles.includes(role) || roles.includes(originalRole);
}

function isLeader(user) {
  return hasAnyRole(user, LEADER_ROLES);
}

function normalizeEnum(value, allowed, fallback = "") {
  const next = str(value).toUpperCase();
  return allowed.includes(next) ? next : fallback;
}

function textList(value) {
  if (Array.isArray(value)) return value.map(str).filter(Boolean);
  return str(value).split(/\r?\n|,/).map(str).filter(Boolean);
}

function numberOr(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function ensureEarlyYearsReportingShape(db) {
  ensureEarlyYearsCurriculumShape(db);
  ensureEarlyYearsPlanningShape(db);
  ensureEarlyYearsAssessmentShape(db);
  ensureEarlyYearsLiteracyShape(db);
  ensureEarlyYearsEnvironmentShape(db);
  ensureEarlyYearsInclusionShape(db);
  let mutated = false;
  [
    "earlyYearsReports",
    "earlyYearsReportAreas",
    "earlyYearsReportEvidenceLinks",
    "earlyYearsReportTemplates",
    "earlyYearsReportAuditLogs",
    "receptionEyfsReferences",
    "receptionSchoolReadinessProfiles",
    "receptionBasicOneTransitionProfiles",
    "earlyYearsReportHandoverAcknowledgements",
  ].forEach((key) => {
    if (!Array.isArray(db[key])) {
      db[key] = [];
      mutated = true;
    }
  });
  return { mutated };
}

function appendReportAuditLog(db, actor = {}, action = "", details = {}) {
  if (!Array.isArray(db.earlyYearsReportAuditLogs)) db.earlyYearsReportAuditLogs = [];
  db.earlyYearsReportAuditLogs.unshift({
    id: randomId("eyfs-report-audit"),
    action: str(action),
    userId: str(actor.id || actor.username),
    userName: str(actor.name || actor.username),
    userRole: roleOf(actor),
    studentId: str(details.studentId),
    classId: str(details.classId),
    reportId: str(details.reportId),
    entityType: str(details.entityType),
    entityId: str(details.entityId),
    before: details.before || null,
    after: details.after || null,
    details,
    createdAt: nowIso(),
  });
}

function findStudent(db, studentId) {
  const value = str(studentId);
  return arr(db.students).find((row) => str(row.id) === value || str(row.studentId) === value) || null;
}

function parentStudentIds(user) {
  return new Set(arr(user?.studentIds).map(str).filter(Boolean));
}

function classConfig(ref) {
  return getApprovedClassConfig(ref) || null;
}

function classRefOfStudent(student) {
  return student?.classId || student?.className;
}

function classMatchesStudent(student, classRef) {
  if (!classRef) return true;
  const approved = classConfig(classRef);
  const studentApproved = classConfig(classRefOfStudent(student));
  if (approved?.id && studentApproved?.id) return str(approved.id) === str(studentApproved.id);
  const classKey = normalizeAcademicKey(classRef);
  return [student?.classId, student?.className].some((item) => normalizeAcademicKey(item) === classKey);
}

function isEarlyYearsStudent(student) {
  return classConfig(classRefOfStudent(student))?.academicSystem === "BRITISH_EYFS";
}

function isReceptionStudent(student) {
  return normalizeAcademicKey(classConfig(classRefOfStudent(student))?.id) === "reception";
}

function isBasicOneClass(ref) {
  return normalizeAcademicKey(classConfig(ref)?.id || ref) === normalizeAcademicKey("basic-1");
}

function teacherCanAccessClass(db, user, classRef) {
  if (isLeader(user)) return true;
  if (roleOf(user) !== "TEACHER") return false;
  const approved = classConfig(classRef);
  const assigned = teacherAssignedClassIds(db, user);
  return assigned.has(str(classRef)) || assigned.has(str(approved?.id));
}

function assertEarlyYearsStudentAccess(db, user, studentId, options = {}) {
  const student = findStudent(db, studentId);
  if (!student) {
    const error = new Error("Child record could not be found.");
    error.status = 404;
    throw error;
  }
  if (!isEarlyYearsStudent(student)) {
    const error = new Error("Early Years reports are only available for Crèche, Nursery, and Reception children.");
    error.status = 400;
    throw error;
  }
  if (options.classId && !classMatchesStudent(student, options.classId)) {
    const error = new Error("Selected class does not match this child.");
    error.status = 400;
    throw error;
  }
  const approved = classConfig(classRefOfStudent(student));
  if (hasAnyRole(user, TEACHER_ROLES)) {
    if (!teacherCanAccessClass(db, user, approved?.id || classRefOfStudent(student))) {
      const error = new Error(options.action === "view" ? "You do not have access to this child's Early Years report records." : "You cannot manage reports for an unassigned Early Years child.");
      error.status = 403;
      throw error;
    }
    return { student, classRow: approved, access: "STAFF" };
  }
  if (hasAnyRole(user, PARENT_ROLES)) {
    if (!parentStudentIds(user).has(str(student.id))) {
      const error = new Error("Parents can only view published reports for their own child.");
      error.status = 403;
      throw error;
    }
    return { student, classRow: approved, access: "PARENT" };
  }
  const error = new Error("Student access to Early Years reports is not enabled.");
  error.status = 403;
  throw error;
}

function assertBasicOneIncomingAccess(db, user, transition) {
  if (isLeader(user)) return true;
  if (roleOf(user) !== "TEACHER" || !isBasicOneClass(transition?.receivingClassId || transition?.receivingClassName)) {
    const error = new Error("You do not have access to this Reception to Basic 1 handover.");
    error.status = 403;
    throw error;
  }
  if (!teacherCanAccessClass(db, user, transition.receivingClassId || "basic-1")) {
    const error = new Error("You do not have access to this incoming Basic 1 handover.");
    error.status = 403;
    throw error;
  }
  return true;
}

function validateSessionTerm(db, body = {}) {
  if (body.academicSessionId || body.sessionId) {
    const session = findAcademicSession(db, body.academicSessionId || body.sessionId);
    if (!session) {
      const error = new Error("Academic session could not be found.");
      error.status = 400;
      throw error;
    }
  }
  if (body.termId) {
    const term = findAcademicTerm(db, body.termId, body.academicSessionId || body.sessionId || "");
    if (!term) {
      const error = new Error("Academic term could not be found.");
      error.status = 400;
      throw error;
    }
  }
}

function containsAny(value, terms) {
  const lower = str(value).toLowerCase();
  return terms.some((term) => lower.includes(term));
}

function assertProfessionalLanguage(body = {}) {
  const text = JSON.stringify(body || {});
  if (containsAny(text, NEGATIVE_LANGUAGE_TERMS)) {
    const error = new Error("Use professional developmental language. Avoid labels such as weak, lazy, poor, naughty, slow learner, or failure.");
    error.status = 400;
    throw error;
  }
  if (containsAny(text, DISALLOWED_SCORE_TERMS)) {
    const error = new Error("Early Years reports must be developmental. Do not use CA scores, percentages, averages, ranking, positions, CGPA, or exam marks.");
    error.status = 400;
    throw error;
  }
}

function reportTypeForStudent(student, requested = "") {
  const approved = classConfig(classRefOfStudent(student));
  const type = normalizeEnum(requested, REPORT_TYPES, "");
  const id = normalizeAcademicKey(approved?.id || approved?.name);
  if (id === "creche") {
    if (type && type !== "CRECHE_TERMLY" && type !== "REPORT_ARCHIVE_COPY") throwBadReportType();
    return type || "CRECHE_TERMLY";
  }
  if (id === "nursery") {
    if (type && type !== "NURSERY_TERMLY" && type !== "REPORT_ARCHIVE_COPY") throwBadReportType();
    return type || "NURSERY_TERMLY";
  }
  if (id === "reception") {
    if (type && !["RECEPTION_TERMLY", "RECEPTION_END_OF_YEAR", "REPORT_ARCHIVE_COPY"].includes(type)) throwBadReportType();
    return type || "RECEPTION_TERMLY";
  }
  throwBadReportType();
}

function throwBadReportType() {
  const error = new Error("Selected report type is not valid for this Early Years class.");
  error.status = 400;
  throw error;
}

function reportTypeLabel(type) {
  return str(type).replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeVersion(value = "1.0") {
  const match = str(value || "1.0").match(/^(\d+)(?:\.(\d+))?$/);
  if (!match) return "1.0";
  return `${Number(match[1]) || 1}.${Number(match[2]) || 0}`;
}

function nextMinorVersion(value = "1.0") {
  const [major, minor] = normalizeVersion(value).split(".").map((item) => Number(item));
  return `${major}.${minor + 1}`;
}

function latestRows(rows = [], limit = 6) {
  return [...rows]
    .sort((a, b) => str(b.updatedAt || b.createdAt || b.observationDate || b.date).localeCompare(str(a.updatedAt || a.createdAt || a.observationDate || a.date)))
    .slice(0, limit);
}

function evidenceSuggestionsForStudent(db, studentId) {
  const observations = latestRows(arr(db.earlyYearsObservations).filter((row) => str(row.studentId) === str(studentId)), 12);
  const summaries = latestRows(arr(db.earlyYearsDevelopmentSummaries).filter((row) => str(row.studentId) === str(studentId)), 6);
  const nextSteps = latestRows(arr(db.earlyYearsNextSteps).filter((row) => str(row.studentId) === str(studentId)), 8);
  const journalHighlights = latestRows(arr(db.earlyYearsLearningJournalEntries).filter((row) => str(row.studentId) === str(studentId)), 6);
  const literacySupport = latestRows(arr(db.earlyYearsLiteracySupportPlans).filter((row) => str(row.studentId) === str(studentId)), 4);
  const reading = latestRows(arr(db.earlyYearsReadingRecords).filter((row) => str(row.studentId) === str(studentId)), 4);
  const writing = latestRows(arr(db.earlyYearsWritingRecords).filter((row) => str(row.studentId) === str(studentId)), 4);
  const phonics = latestRows(arr(db.earlyYearsPhonicsProgress).filter((row) => str(row.studentId) === str(studentId)), 6);
  const supportPlans = latestRows(arr(db.earlyYearsSupportPlans).filter((row) => str(row.studentId) === str(studentId) && row.visibility === "PARENT_VISIBLE"), 4);
  const transitions = latestRows(arr(db.earlyYearsTransitionSupportPlans).filter((row) => str(row.studentId) === str(studentId) && row.visibility !== "RESTRICTED"), 4);

  const latestDescriptorByArea = {};
  observations.forEach((observation) => {
    if (observation.eyfsArea && observation.developmentalDescriptor && !latestDescriptorByArea[observation.eyfsArea]) {
      latestDescriptorByArea[observation.eyfsArea] = observation.developmentalDescriptor;
    }
  });

  return {
    recentObservations: observations.map((row) => ({
      id: row.id,
      eyfsArea: row.eyfsArea,
      title: row.title,
      observationDate: row.observationDate,
      objectiveObservation: row.objectiveObservation,
      nextStep: row.nextStep,
      significant: row.isSignificant === true,
    })),
    latestDescriptorByArea,
    developmentSummaries: summaries.map((row) => ({ id: row.id, type: row.summaryType || row.type, summary: row.summary || row.teacherSummary || row.comment })),
    nextSteps: nextSteps.map((row) => ({ id: row.id, eyfsArea: row.eyfsArea, description: row.description, status: row.status })),
    journalHighlights: journalHighlights.map((row) => ({ id: row.id, title: row.title, summary: row.summary || row.description, visibility: row.visibility || row.journalVisibility })),
    literacySummary: {
      phonics: phonics.map((row) => ({ id: row.id, programmePoint: row.programmePoint, skillState: row.skillState, notes: row.notes || row.teacherComment })),
      reading: reading.map((row) => ({ id: row.id, bookTitle: row.bookTitle || row.textTitle, fluencyNote: row.fluencyNote, comprehensionNote: row.comprehensionNote })),
      writing: writing.map((row) => ({ id: row.id, teacherComment: row.teacherComment, nextPriority: row.nextPriority })),
      support: literacySupport.map((row) => ({ id: row.id, supportFocus: row.supportFocus, strategy: row.strategy, reviewDate: row.reviewDate })),
    },
    supportSummary: supportPlans.map((row) => ({
      id: row.id,
      priorityNeed: row.priorityNeed,
      desiredOutcome: row.desiredOutcome,
      strategies: row.strategies,
      environmentAdjustments: row.environmentAdjustments,
      homeSupport: row.homeSupport,
      reviewDate: row.reviewDate,
    })),
    transitionSupport: transitions.map((row) => ({
      id: row.id,
      strengths: row.strengths,
      supportStrategies: row.supportStrategies,
      currentPriorities: row.currentPriorities,
    })),
  };
}

function sanitizeReportPayload(body = {}) {
  assertProfessionalLanguage(body);
  return {
    attendanceSummary: str(body.attendanceSummary),
    overallTeacherComment: str(body.overallTeacherComment),
    parentPartnershipSummary: str(body.parentPartnershipSummary),
    practicalLifeSummary: str(body.practicalLifeSummary),
    independenceSummary: str(body.independenceSummary),
    characterResponsibilitySummary: str(body.characterResponsibilitySummary),
    learningBehaviourSummary: str(body.learningBehaviourSummary),
    strengths: str(body.strengths),
    nextPriorities: str(body.nextPriorities),
    supportSummary: str(body.supportSummary),
    accessSummary: str(body.accessSummary),
    literacySummary: str(body.literacySummary),
    mathematicsSummary: str(body.mathematicsSummary),
    schoolReadinessSummary: str(body.schoolReadinessSummary),
    transitionPriorities: str(body.transitionPriorities),
    internalTeacherNotes: str(body.internalTeacherNotes),
  };
}

function sanitizeAreaPayload(body = {}) {
  assertProfessionalLanguage(body);
  return {
    eyfsArea: normalizeEnum(body.eyfsArea, EYFS_AREAS.map((row) => row.code), ""),
    descriptor: normalizeEnum(body.descriptor, AREA_DESCRIPTORS, ""),
    strengthsProgress: str(body.strengthsProgress),
    currentDevelopment: str(body.currentDevelopment),
    nextPriority: str(body.nextPriority),
    teacherComment: str(body.teacherComment),
    sourceEvidenceSummary: str(body.sourceEvidenceSummary),
    selectedEvidenceIds: textList(body.selectedEvidenceIds),
  };
}

function defaultAreaRows(reportId) {
  const timestamp = nowIso();
  return EYFS_AREAS.map((area) => ({
    id: randomId("eyfs-report-area"),
    reportId,
    eyfsArea: area.code,
    descriptor: "",
    strengthsProgress: "",
    currentDevelopment: "",
    nextPriority: "",
    teacherComment: "",
    sourceEvidenceSummary: "",
    selectedEvidenceIds: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
}

function areasForReport(db, reportId) {
  return arr(db.earlyYearsReportAreas)
    .filter((row) => str(row.reportId) === str(reportId))
    .sort((a, b) => {
      const ao = EYFS_AREAS.find((area) => area.code === a.eyfsArea)?.displayOrder || 99;
      const bo = EYFS_AREAS.find((area) => area.code === b.eyfsArea)?.displayOrder || 99;
      return ao - bo;
    });
}

function applyAreaUpdates(db, reportId, areas = []) {
  if (!Array.isArray(areas)) return;
  areas.forEach((area) => {
    const payload = sanitizeAreaPayload(area);
    if (!payload.eyfsArea) return;
    let row = db.earlyYearsReportAreas.find((item) => str(item.reportId) === str(reportId) && item.eyfsArea === payload.eyfsArea);
    if (!row) {
      row = {
        id: randomId("eyfs-report-area"),
        reportId,
        createdAt: nowIso(),
      };
      db.earlyYearsReportAreas.push(row);
    }
    Object.assign(row, payload, { updatedAt: nowIso() });
  });
}

function ensureReportAreas(db, reportId) {
  const existing = new Set(areasForReport(db, reportId).map((row) => row.eyfsArea));
  defaultAreaRows(reportId).forEach((row) => {
    if (!existing.has(row.eyfsArea)) db.earlyYearsReportAreas.push(row);
  });
}

function createEarlyYearsReport(db, user, body = {}) {
  ensureEarlyYearsReportingShape(db);
  validateSessionTerm(db, body);
  const { student, classRow } = assertEarlyYearsStudentAccess(db, user, body.studentId, { classId: body.classId, action: "create report" });
  if (!hasAnyRole(user, TEACHER_ROLES)) {
    const error = new Error("Only authorised staff can create Early Years reports.");
    error.status = 403;
    throw error;
  }
  const reportType = reportTypeForStudent(student, body.reportType);
  const existing = arr(db.earlyYearsReports).find((row) => (
    str(row.studentId) === str(student.id) &&
    str(row.academicSessionId) === str(body.academicSessionId || body.sessionId) &&
    str(row.termId) === str(body.termId) &&
    str(row.reportType) === str(reportType) &&
    !row.supersedesReportId &&
    !["ARCHIVED"].includes(row.reportStatus)
  ));
  if (existing && !body.forceNew) {
    ensureReportAreas(db, existing.id);
    return { report: existing, areas: areasForReport(db, existing.id), duplicatePrevented: true };
  }
  const timestamp = nowIso();
  const report = {
    id: randomId("eyfs-report"),
    studentId: str(student.id),
    studentName: str(student.name),
    classId: str(classRow.id),
    className: str(classRow.name),
    academicSessionId: str(body.academicSessionId || body.sessionId),
    termId: str(body.termId),
    reportType,
    reportStatus: "DRAFT",
    reportVersion: normalizeVersion(body.reportVersion || "1.0"),
    supersedesReportId: str(body.supersedesReportId),
    supersededByReportId: "",
    isCurrentVersion: true,
    amendmentReason: str(body.amendmentReason),
    curriculumFramework: str(body.curriculumFramework || "AMES_VOLUME_III_EYFS"),
    curriculumVersion: str(body.curriculumVersion || "1.0"),
    teacherId: str(user.id || body.teacherId),
    teacherName: str(user.name || user.username),
    reviewedBy: "",
    approvedBy: "",
    reviewerComment: "",
    returnedReason: "",
    publishedToParent: false,
    ...sanitizeReportPayload(body),
    createdAt: timestamp,
    updatedAt: timestamp,
    submittedAt: "",
    reviewedAt: "",
    approvedAt: "",
    publishedAt: "",
    archivedAt: "",
  };
  db.earlyYearsReports.unshift(report);
  db.earlyYearsReportAreas.push(...defaultAreaRows(report.id));
  applyAreaUpdates(db, report.id, body.areas || []);
  appendReportAuditLog(db, user, "report_created", { entityType: "EARLY_YEARS_REPORT", entityId: report.id, reportId: report.id, studentId: report.studentId, classId: report.classId, after: report });
  return { report, areas: areasForReport(db, report.id), duplicatePrevented: false };
}

function findReport(db, reportId) {
  return arr(db.earlyYearsReports).find((row) => str(row.id) === str(reportId)) || null;
}

function assertReportAccess(db, user, report, action = "view") {
  if (!report) {
    const error = new Error("Early Years report could not be found.");
    error.status = 404;
    throw error;
  }
  const reportClass = classConfig(report.classId || report.className);
  if (reportClass?.academicSystem !== "BRITISH_EYFS") {
    const error = new Error("This is not an Early Years report record.");
    error.status = 400;
    throw error;
  }
  if (hasAnyRole(user, PARENT_ROLES)) {
    if (!parentStudentIds(user).has(str(report.studentId)) || report.reportStatus !== "PUBLISHED") {
      const error = new Error("Parents can only view published Early Years reports for their own child.");
      error.status = 403;
      throw error;
    }
    return "PARENT";
  }
  if (hasAnyRole(user, TEACHER_ROLES)) {
    if (!teacherCanAccessClass(db, user, report.classId || reportClass.id)) {
      const error = new Error(`You do not have access to ${action} this Early Years report.`);
      error.status = 403;
      throw error;
    }
    return "STAFF";
  }
  const error = new Error("Student access to Early Years reports is not enabled.");
  error.status = 403;
  throw error;
}

function assertCurrentEarlyYearsReportOwner(db, user, report, action = "view") {
  const { access } = assertEarlyYearsStudentAccess(db, user, report.studentId, { action, classId: report.classId });
  if (access === "PARENT") {
    const error = new Error("Parents cannot manage Early Years report records.");
    error.status = 403;
    throw error;
  }
  return access;
}

function assertCanEditReport(db, user, report) {
  assertReportAccess(db, user, report, "edit report");
  assertCurrentEarlyYearsReportOwner(db, user, report, "edit report");
  if (!hasAnyRole(user, TEACHER_ROLES)) {
    const error = new Error("Only authorised staff can edit reports.");
    error.status = 403;
    throw error;
  }
  if (["PUBLISHED", "ARCHIVED"].includes(report.reportStatus)) {
    const error = new Error("Published reports are locked. Create an amended version for corrections.");
    error.status = 409;
    throw error;
  }
}

function updateEarlyYearsReport(db, user, reportId, body = {}) {
  ensureEarlyYearsReportingShape(db);
  const report = findReport(db, reportId);
  assertCanEditReport(db, user, report);
  const before = { ...report, areas: areasForReport(db, report.id) };
  Object.assign(report, sanitizeReportPayload({ ...report, ...body }), {
    updatedBy: str(user.id || user.username),
    updatedAt: nowIso(),
  });
  applyAreaUpdates(db, report.id, body.areas || []);
  appendReportAuditLog(db, user, "report_updated", { entityType: "EARLY_YEARS_REPORT", entityId: report.id, reportId: report.id, studentId: report.studentId, classId: report.classId, before, after: { ...report, areas: areasForReport(db, report.id) } });
  return getReportDetail(db, user, report.id);
}

function completenessIssues(db, report) {
  const issues = [];
  const areas = areasForReport(db, report.id);
  if (!report.studentId || !report.classId || !report.academicSessionId || !report.termId) issues.push("Student, class, academic session, and term are required.");
  if (!report.teacherId) issues.push("Teacher identity is required.");
  if (!str(report.overallTeacherComment)) issues.push("Overall teacher comment is required.");
  if (!str(report.nextPriorities)) issues.push("Next priorities are required.");
  if (!str(report.practicalLifeSummary)) issues.push("Practical Life / independence summary is required.");
  if (!str(report.learningBehaviourSummary)) issues.push("Learning behaviour summary is required.");
  if (str(report.reportType).startsWith("RECEPTION") && !str(report.literacySummary)) issues.push("Reception reports require a professional literacy summary.");
  if (areas.length < EYFS_AREAS.length) issues.push("All seven EYFS areas must be present.");
  EYFS_AREAS.forEach((area) => {
    const row = areas.find((item) => item.eyfsArea === area.code);
    if (!row || !str(row.strengthsProgress) || !str(row.currentDevelopment) || !str(row.nextPriority) || !str(row.teacherComment)) {
      issues.push(`${area.name} requires strengths/progress, current development, next priority, and teacher comment.`);
    }
  });
  return issues;
}

function submitReport(db, user, reportId) {
  ensureEarlyYearsReportingShape(db);
  const report = findReport(db, reportId);
  assertCanEditReport(db, user, report);
  const issues = completenessIssues(db, report);
  if (issues.length) {
    const error = new Error(`Report is incomplete: ${issues.join(" ")}`);
    error.status = 400;
    throw error;
  }
  const before = { ...report };
  Object.assign(report, { reportStatus: "SUBMITTED", submittedAt: nowIso(), updatedAt: nowIso(), updatedBy: str(user.id || user.username) });
  appendReportAuditLog(db, user, "report_submitted", { entityType: "EARLY_YEARS_REPORT", entityId: report.id, reportId: report.id, studentId: report.studentId, classId: report.classId, before, after: report });
  return getReportDetail(db, user, report.id);
}

function assertLeaderAction(user, action = "review reports") {
  if (!isLeader(user)) {
    const error = new Error(`Only academic leadership can ${action}.`);
    error.status = 403;
    throw error;
  }
}

function returnReport(db, user, reportId, body = {}) {
  ensureEarlyYearsReportingShape(db);
  assertLeaderAction(user, "return reports for revision");
  const report = findReport(db, reportId);
  assertReportAccess(db, user, report, "return report");
  if (!["SUBMITTED", "REVIEWED"].includes(report.reportStatus)) {
    const error = new Error("Only submitted or reviewed reports can be returned for revision.");
    error.status = 409;
    throw error;
  }
  const before = { ...report };
  Object.assign(report, {
    reportStatus: "RETURNED_FOR_REVISION",
    reviewerComment: str(body.reviewerComment || body.comment),
    returnedReason: str(body.reason || body.reviewerComment || body.comment),
    reviewedBy: str(user.id || user.username),
    reviewedAt: nowIso(),
    updatedAt: nowIso(),
  });
  appendReportAuditLog(db, user, "report_returned", { entityType: "EARLY_YEARS_REPORT", entityId: report.id, reportId: report.id, studentId: report.studentId, classId: report.classId, before, after: report });
  return getReportDetail(db, user, report.id);
}

function approveReport(db, user, reportId, body = {}) {
  ensureEarlyYearsReportingShape(db);
  assertLeaderAction(user, "approve reports");
  const report = findReport(db, reportId);
  assertReportAccess(db, user, report, "approve report");
  if (!["SUBMITTED", "REVIEWED"].includes(report.reportStatus)) {
    const error = new Error("Only submitted or reviewed reports can be approved.");
    error.status = 409;
    throw error;
  }
  const before = { ...report };
  Object.assign(report, {
    reportStatus: "APPROVED",
    reviewerComment: str(body.reviewerComment || body.comment || report.reviewerComment),
    reviewedBy: str(user.id || user.username),
    approvedBy: str(user.id || user.username),
    reviewedAt: nowIso(),
    approvedAt: nowIso(),
    updatedAt: nowIso(),
  });
  appendReportAuditLog(db, user, "report_approved", { entityType: "EARLY_YEARS_REPORT", entityId: report.id, reportId: report.id, studentId: report.studentId, classId: report.classId, before, after: report });
  return getReportDetail(db, user, report.id);
}

function publishReport(db, user, reportId) {
  ensureEarlyYearsReportingShape(db);
  assertLeaderAction(user, "publish reports");
  const report = findReport(db, reportId);
  assertReportAccess(db, user, report, "publish report");
  if (report.reportStatus !== "APPROVED") {
    const error = new Error("Only approved reports can be published.");
    error.status = 409;
    throw error;
  }
  const before = { ...report };
  Object.assign(report, {
    reportStatus: "PUBLISHED",
    publishedToParent: true,
    publishedAt: nowIso(),
    updatedAt: nowIso(),
  });
  if (report.supersedesReportId) {
    const source = findReport(db, report.supersedesReportId);
    if (source) {
      source.isCurrentVersion = false;
      source.supersededByReportId = report.id;
      source.updatedAt = nowIso();
    }
  }
  appendReportAuditLog(db, user, "report_published", { entityType: "EARLY_YEARS_REPORT", entityId: report.id, reportId: report.id, studentId: report.studentId, classId: report.classId, before, after: report });
  return getReportDetail(db, user, report.id);
}

function amendReport(db, user, reportId, body = {}) {
  ensureEarlyYearsReportingShape(db);
  assertLeaderAction(user, "amend published reports");
  const source = findReport(db, reportId);
  assertReportAccess(db, user, source, "amend report");
  if (source.reportStatus !== "PUBLISHED") {
    const error = new Error("Only published reports can be amended through versioning.");
    error.status = 409;
    throw error;
  }
  const timestamp = nowIso();
  const next = {
    ...source,
    id: randomId("eyfs-report"),
    reportStatus: "DRAFT",
    reportVersion: nextMinorVersion(source.reportVersion),
    supersedesReportId: source.id,
    supersededByReportId: "",
    isCurrentVersion: true,
    amendmentReason: str(body.amendmentReason || body.reason),
    publishedToParent: false,
    reviewedBy: "",
    approvedBy: "",
    reviewerComment: "",
    returnedReason: "",
    createdAt: timestamp,
    updatedAt: timestamp,
    submittedAt: "",
    reviewedAt: "",
    approvedAt: "",
    publishedAt: "",
    archivedAt: "",
    updatedBy: str(user.id || user.username),
  };
  db.earlyYearsReports.unshift(next);
  areasForReport(db, source.id).forEach((area) => {
    db.earlyYearsReportAreas.push({ ...area, id: randomId("eyfs-report-area"), reportId: next.id, createdAt: timestamp, updatedAt: timestamp });
  });
  appendReportAuditLog(db, user, "report_amended_version_created", { entityType: "EARLY_YEARS_REPORT", entityId: next.id, reportId: next.id, studentId: next.studentId, classId: next.classId, before: source, after: next });
  return getReportDetail(db, user, next.id);
}

function archiveReport(db, user, reportId) {
  ensureEarlyYearsReportingShape(db);
  assertLeaderAction(user, "archive reports");
  const report = findReport(db, reportId);
  assertReportAccess(db, user, report, "archive report");
  const before = { ...report };
  Object.assign(report, { reportStatus: "ARCHIVED", archivedAt: nowIso(), updatedAt: nowIso() });
  appendReportAuditLog(db, user, "report_archived", { entityType: "EARLY_YEARS_REPORT", entityId: report.id, reportId: report.id, studentId: report.studentId, classId: report.classId, before, after: report });
  return getReportDetail(db, user, report.id);
}

function sanitizeReportForUser(user, report) {
  if (!report) return report;
  const copy = { ...report };
  if (roleOf(user) === "PARENT") {
    delete copy.internalTeacherNotes;
    delete copy.reviewerComment;
    delete copy.returnedReason;
    delete copy.reviewedBy;
    delete copy.approvedBy;
  }
  return copy;
}

function canListReport(db, user, report) {
  try {
    assertReportAccess(db, user, report, "view");
    return true;
  } catch {
    return false;
  }
}

function listReports(db, user, filters = {}) {
  ensureEarlyYearsReportingShape(db);
  return arr(db.earlyYearsReports)
    .filter((report) => canListReport(db, user, report))
    .filter((report) => !filters.studentId || str(report.studentId) === str(filters.studentId))
    .filter((report) => !filters.classId || str(report.classId) === str(filters.classId))
    .filter((report) => !filters.academicSessionId || str(report.academicSessionId) === str(filters.academicSessionId))
    .filter((report) => !filters.termId || str(report.termId) === str(filters.termId))
    .filter((report) => !filters.reportType || str(report.reportType) === str(filters.reportType).toUpperCase())
    .filter((report) => !filters.status || str(report.reportStatus) === str(filters.status).toUpperCase())
    .filter((report) => roleOf(user) !== "PARENT" || filters.includeSuperseded || report.isCurrentVersion !== false)
    .sort((a, b) => str(b.updatedAt || b.createdAt).localeCompare(str(a.updatedAt || a.createdAt)))
    .map((report) => sanitizeReportForUser(user, report));
}

function getReportDetail(db, user, reportId) {
  ensureEarlyYearsReportingShape(db);
  const report = findReport(db, reportId);
  assertReportAccess(db, user, report, "view");
  appendReportAuditLog(db, user, "report_viewed", { entityType: "EARLY_YEARS_REPORT", entityId: report.id, reportId: report.id, studentId: report.studentId, classId: report.classId });
  return {
    report: sanitizeReportForUser(user, report),
    areas: areasForReport(db, report.id),
    evidenceSuggestions: roleOf(user) === "PARENT" ? null : evidenceSuggestionsForStudent(db, report.studentId),
    completenessIssues: roleOf(user) === "PARENT" ? [] : completenessIssues(db, report),
  };
}

function listAccessibleReportStudents(db, user, filters = {}) {
  ensureEarlyYearsReportingShape(db);
  if (hasAnyRole(user, PARENT_ROLES)) {
    return arr(db.students).filter((student) => parentStudentIds(user).has(str(student.id)) && isEarlyYearsStudent(student));
  }
  if (!hasAnyRole(user, TEACHER_ROLES)) return [];
  const classes = listAccessibleEarlyYearsClasses(db, user);
  const allowed = new Set(classes.map((row) => str(row.id)));
  return arr(db.students).filter((student) => {
    if (!isEarlyYearsStudent(student)) return false;
    if (filters.classId && !classMatchesStudent(student, filters.classId)) return false;
    return isLeader(user) || allowed.has(str(student.classId)) || allowed.has(str(classConfig(classRefOfStudent(student))?.id));
  });
}

function reportDashboard(db, user, filters = {}) {
  ensureEarlyYearsReportingShape(db);
  const classes = hasAnyRole(user, TEACHER_ROLES) ? listAccessibleEarlyYearsClasses(db, user) : [];
  const students = listAccessibleReportStudents(db, user, filters);
  const reports = listReports(db, user, filters);
  const byStudent = new Map();
  reports.forEach((report) => {
    const key = `${report.studentId}:${report.reportType}`;
    if (!byStudent.has(key)) byStudent.set(key, report);
  });
  const statusCounts = REPORT_STATUSES.reduce((acc, status) => ({ ...acc, [status]: reports.filter((row) => row.reportStatus === status).length }), {});
  return {
    classes,
    students,
    reports,
    statusCounts,
    reportTypes: REPORT_TYPES,
    reportStatuses: REPORT_STATUSES,
    descriptors: AREA_DESCRIPTORS,
    eyfsAreas: EYFS_AREAS,
    elgReferenceItems: ELG_REFERENCE_ITEMS,
    amesReferenceStatuses: AMES_REFERENCE_STATUSES,
    transitionStatuses: TRANSITION_STATUSES,
    readinessDomains: READINESS_DOMAINS,
    legalWording: ELG_REFERENCE_WORDING,
    classReportStatus: students.map((student) => {
      const type = reportTypeForStudent(student, filters.reportType);
      const report = byStudent.get(`${student.id}:${type}`) || null;
      return {
        studentId: student.id,
        studentName: student.name,
        classId: student.classId,
        className: student.className,
        reportType: type,
        status: report?.reportStatus || "NOT_STARTED",
        reportId: report?.id || "",
        lastUpdated: report?.updatedAt || "",
        reviewer: report?.reviewedBy || "",
      };
    }),
  };
}

function listReportArchive(db, user, studentId, filters = {}) {
  assertEarlyYearsStudentAccess(db, user, studentId, { action: "archive" });
  return listReports(db, user, { ...filters, studentId, includeSuperseded: true });
}

function createCommentTemplate(db, user, body = {}) {
  ensureEarlyYearsReportingShape(db);
  assertLeaderAction(user, "manage report comment templates");
  assertProfessionalLanguage(body);
  const timestamp = nowIso();
  const template = {
    id: randomId("eyfs-report-template"),
    title: str(body.title),
    section: str(body.section || "GENERAL"),
    eyfsArea: normalizeEnum(body.eyfsArea, EYFS_AREAS.map((row) => row.code), ""),
    reportType: normalizeEnum(body.reportType, REPORT_TYPES, ""),
    guidanceText: str(body.guidanceText),
    exampleComment: str(body.exampleComment),
    isActive: body.isActive === undefined ? true : bool(body.isActive),
    createdBy: str(user.id || user.username),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  db.earlyYearsReportTemplates.unshift(template);
  appendReportAuditLog(db, user, "comment_template_created", { entityType: "REPORT_COMMENT_TEMPLATE", entityId: template.id, after: template });
  return template;
}

function listCommentTemplates(db, user, filters = {}) {
  ensureEarlyYearsReportingShape(db);
  if (!hasAnyRole(user, TEACHER_ROLES)) return [];
  return arr(db.earlyYearsReportTemplates)
    .filter((row) => row.isActive !== false || filters.includeInactive)
    .filter((row) => !filters.eyfsArea || row.eyfsArea === str(filters.eyfsArea).toUpperCase())
    .filter((row) => !filters.reportType || row.reportType === str(filters.reportType).toUpperCase())
    .sort((a, b) => str(a.title).localeCompare(str(b.title)));
}

function createReceptionEyfsReference(db, user, body = {}) {
  ensureEarlyYearsReportingShape(db);
  validateSessionTerm(db, body);
  const { student, classRow } = assertEarlyYearsStudentAccess(db, user, body.studentId, { classId: body.classId, action: "create EYFS reference" });
  if (!isReceptionStudent(student)) {
    const error = new Error("AMES End-of-Reception EYFS reference is only available for Reception children.");
    error.status = 400;
    throw error;
  }
  if (!hasAnyRole(user, TEACHER_ROLES)) {
    const error = new Error("Only authorised staff can create Reception EYFS reference records.");
    error.status = 403;
    throw error;
  }
  assertProfessionalLanguage(body);
  const item = ELG_REFERENCE_ITEMS.find((row) => row.id === str(body.referenceItemId) || row.item === str(body.referenceItem) || normalizeAcademicKey(row.item) === normalizeAcademicKey(body.referenceItem));
  if (!item) {
    const error = new Error("Reference item is not part of the AMES End-of-Reception EYFS reference structure.");
    error.status = 400;
    throw error;
  }
  const timestamp = nowIso();
  const record = {
    id: randomId("reception-eyfs-reference"),
    studentId: str(student.id),
    studentName: str(student.name),
    classId: str(classRow.id),
    academicSessionId: str(body.academicSessionId || body.sessionId),
    referenceItemId: item.id,
    referenceArea: item.area,
    referenceItem: item.item,
    amesReferenceStatus: normalizeEnum(body.amesReferenceStatus, AMES_REFERENCE_STATUSES, "NOT_YET_ASSESSED"),
    teacherComment: str(body.teacherComment),
    evidenceSummary: str(body.evidenceSummary),
    teacherId: str(user.id || user.username),
    reviewedBy: "",
    approvedBy: "",
    reviewerComment: "",
    status: isLeader(user) ? normalizeEnum(body.status, REPORT_STATUSES, "DRAFT") : "DRAFT",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  db.receptionEyfsReferences.unshift(record);
  appendReportAuditLog(db, user, "eyfs_reference_created", { entityType: "RECEPTION_EYFS_REFERENCE", entityId: record.id, studentId: record.studentId, classId: record.classId, after: record });
  return record;
}

function updateReceptionEyfsReference(db, user, referenceId, body = {}) {
  ensureEarlyYearsReportingShape(db);
  const record = arr(db.receptionEyfsReferences).find((row) => str(row.id) === str(referenceId));
  if (!record) {
    const error = new Error("Reception EYFS reference record could not be found.");
    error.status = 404;
    throw error;
  }
  assertEarlyYearsStudentAccess(db, user, record.studentId, { classId: record.classId, action: "update EYFS reference" });
  if (roleOf(user) === "PARENT") {
    const error = new Error("Parents cannot update Reception EYFS reference records.");
    error.status = 403;
    throw error;
  }
  if (["PUBLISHED", "ARCHIVED"].includes(record.status)) {
    const error = new Error("Published Reception EYFS reference records are locked.");
    error.status = 409;
    throw error;
  }
  assertProfessionalLanguage(body);
  const before = { ...record };
  const nextStatus = body.status ? normalizeEnum(body.status, REPORT_STATUSES, record.status) : record.status;
  if (["RETURNED_FOR_REVISION", "APPROVED", "PUBLISHED"].includes(nextStatus) && !isLeader(user)) {
    const error = new Error("Only academic leadership can return, approve, or publish EYFS reference records.");
    error.status = 403;
    throw error;
  }
  Object.assign(record, {
    amesReferenceStatus: normalizeEnum(body.amesReferenceStatus ?? record.amesReferenceStatus, AMES_REFERENCE_STATUSES, record.amesReferenceStatus),
    teacherComment: str(body.teacherComment ?? record.teacherComment),
    evidenceSummary: str(body.evidenceSummary ?? record.evidenceSummary),
    reviewerComment: str(body.reviewerComment ?? record.reviewerComment),
    status: nextStatus,
    reviewedBy: ["RETURNED_FOR_REVISION", "APPROVED", "PUBLISHED"].includes(nextStatus) ? str(user.id || user.username) : record.reviewedBy,
    approvedBy: ["APPROVED", "PUBLISHED"].includes(nextStatus) ? str(user.id || user.username) : record.approvedBy,
    updatedBy: str(user.id || user.username),
    updatedAt: nowIso(),
  });
  appendReportAuditLog(db, user, "eyfs_reference_updated", { entityType: "RECEPTION_EYFS_REFERENCE", entityId: record.id, studentId: record.studentId, classId: record.classId, before, after: record });
  return record;
}

function listReceptionEyfsReferences(db, user, studentId) {
  ensureEarlyYearsReportingShape(db);
  assertEarlyYearsStudentAccess(db, user, studentId, { action: "view EYFS reference" });
  const parent = roleOf(user) === "PARENT";
  return arr(db.receptionEyfsReferences)
    .filter((row) => str(row.studentId) === str(studentId))
    .filter((row) => !parent || ["APPROVED", "PUBLISHED"].includes(row.status))
    .sort((a, b) => {
      const ao = ELG_REFERENCE_ITEMS.find((item) => item.id === a.referenceItemId)?.displayOrder || 99;
      const bo = ELG_REFERENCE_ITEMS.find((item) => item.id === b.referenceItemId)?.displayOrder || 99;
      return ao - bo;
    });
}

function readinessPayload(body = {}) {
  assertProfessionalLanguage(body);
  const domains = {};
  READINESS_DOMAINS.forEach((domain) => {
    domains[domain] = str(body.readiness?.[domain] ?? body[domain] ?? "");
  });
  return domains;
}

function createOrUpdateReadinessProfile(db, user, student, body = {}) {
  const timestamp = nowIso();
  let profile = arr(db.receptionSchoolReadinessProfiles).find((row) => str(row.studentId) === str(student.id) && str(row.academicSessionId) === str(body.academicSessionId || body.sessionId));
  if (!profile) {
    profile = {
      id: randomId("reception-readiness"),
      studentId: str(student.id),
      academicSessionId: str(body.academicSessionId || body.sessionId),
      classId: str(student.classId),
      domains: {},
      summary: "",
      createdBy: str(user.id || user.username),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    db.receptionSchoolReadinessProfiles.unshift(profile);
  }
  profile.domains = { ...profile.domains, ...readinessPayload(body) };
  profile.summary = str(body.schoolReadinessSummary ?? profile.summary);
  profile.updatedBy = str(user.id || user.username);
  profile.updatedAt = timestamp;
  return profile;
}

function transitionPayload(body = {}) {
  assertProfessionalLanguage(body);
  return {
    transitionDate: str(body.transitionDate),
    receivingClassId: str(classConfig(body.receivingClass || body.receivingClassId)?.id || body.receivingClassId || "basic-1"),
    receivingClassName: str(classConfig(body.receivingClass || body.receivingClassId)?.name || body.receivingClassName || "Basic 1"),
    communicationLanguage: str(body.communicationLanguage || body.communicationAndLanguage),
    psed: str(body.psed),
    physicalDevelopment: str(body.physicalDevelopment),
    phonics: str(body.phonics),
    reading: str(body.reading),
    writing: str(body.writing),
    mathematics: str(body.mathematics),
    understandingTheWorld: str(body.understandingTheWorld),
    expressiveArts: str(body.expressiveArts),
    practicalLifeIndependence: str(body.practicalLifeIndependence),
    learningBehaviour: str(body.learningBehaviour),
    characterResponsibility: str(body.characterResponsibility),
    strengths: str(body.strengths),
    interests: str(body.interests),
    successfulStrategies: textList(body.successfulStrategies),
    accessAdjustments: str(body.accessAdjustments),
    currentPriorities: str(body.currentPriorities),
    parentInformation: str(body.parentInformation),
    childVoice: str(body.childVoice),
    receivingTeacherNotes: str(body.receivingTeacherNotes),
    parentTransitionSummary: str(body.parentTransitionSummary),
    status: "DRAFT",
  };
}

function createReceptionTransitionProfile(db, user, body = {}) {
  ensureEarlyYearsReportingShape(db);
  validateSessionTerm(db, body);
  const { student, classRow } = assertEarlyYearsStudentAccess(db, user, body.studentId, { classId: body.classId, action: "create transition profile" });
  if (!isReceptionStudent(student)) {
    const error = new Error("Reception to Basic 1 transition profile is only available for Reception children.");
    error.status = 400;
    throw error;
  }
  if (!hasAnyRole(user, TEACHER_ROLES)) {
    const error = new Error("Only authorised staff can create Reception transition profiles.");
    error.status = 403;
    throw error;
  }
  const payload = transitionPayload({ receivingClass: "basic-1", ...body });
  if (!isBasicOneClass(payload.receivingClassId)) {
    const error = new Error("Reception transition profile receiving class must be Basic 1.");
    error.status = 400;
    throw error;
  }
  const timestamp = nowIso();
  const readiness = createOrUpdateReadinessProfile(db, user, student, body);
  const profile = {
    id: randomId("reception-basic1-transition"),
    studentId: str(student.id),
    studentName: str(student.name),
    classId: str(classRow.id),
    className: str(classRow.name),
    receptionTeacherId: str(user.id || user.username),
    receptionTeacherName: str(user.name || user.username),
    receivingTeacherId: str(body.receivingTeacherId),
    academicSessionId: str(body.academicSessionId || body.sessionId),
    termId: str(body.termId),
    readinessProfileId: readiness.id,
    handoverAcknowledgedBy: "",
    handoverAcknowledgedAt: "",
    ...payload,
    createdBy: str(user.id || user.username),
    createdAt: timestamp,
    updatedAt: timestamp,
    publishedAt: "",
    approvedBy: "",
    approvedAt: "",
  };
  db.receptionBasicOneTransitionProfiles.unshift(profile);
  appendReportAuditLog(db, user, "transition_profile_created", { entityType: "RECEPTION_BASIC1_TRANSITION", entityId: profile.id, studentId: profile.studentId, classId: profile.classId, after: profile });
  return profile;
}

function assertTransitionEditAccess(db, user, transition) {
  if (!transition) {
    const error = new Error("Reception transition profile could not be found.");
    error.status = 404;
    throw error;
  }
  if (isLeader(user)) return "LEADER";
  const student = findStudent(db, transition.studentId);
  if (roleOf(user) === "TEACHER" && teacherCanAccessClass(db, user, student?.classId || transition.classId)) return "RECEPTION_TEACHER";
  const error = new Error("You cannot edit this Reception transition profile.");
  error.status = 403;
  throw error;
}

function updateReceptionTransitionProfile(db, user, transitionId, body = {}) {
  ensureEarlyYearsReportingShape(db);
  const transition = arr(db.receptionBasicOneTransitionProfiles).find((row) => str(row.id) === str(transitionId));
  const editRole = assertTransitionEditAccess(db, user, transition);
  if (["PUBLISHED", "ARCHIVED", "HANDED_OVER"].includes(transition.status) && !isLeader(user)) {
    const error = new Error("Published transition profiles are locked for Reception teacher edits.");
    error.status = 409;
    throw error;
  }
  const nextStatus = body.status ? normalizeEnum(body.status, TRANSITION_STATUSES, transition.status) : transition.status;
  if (["APPROVED", "PUBLISHED", "HANDED_OVER", "RETURNED_FOR_REVISION"].includes(nextStatus) && editRole !== "LEADER") {
    const error = new Error("Only academic leadership can approve, publish, hand over, or return transition profiles.");
    error.status = 403;
    throw error;
  }
  const before = { ...transition };
  Object.assign(transition, transitionPayload({ ...transition, ...body }), {
    status: nextStatus,
    approvedBy: ["APPROVED", "PUBLISHED", "HANDED_OVER"].includes(nextStatus) ? str(user.id || user.username) : transition.approvedBy,
    approvedAt: ["APPROVED", "PUBLISHED", "HANDED_OVER"].includes(nextStatus) ? nowIso() : transition.approvedAt,
    publishedAt: ["PUBLISHED", "HANDED_OVER"].includes(nextStatus) && !transition.publishedAt ? nowIso() : transition.publishedAt,
    updatedBy: str(user.id || user.username),
    updatedAt: nowIso(),
  });
  const student = findStudent(db, transition.studentId);
  if (student) createOrUpdateReadinessProfile(db, user, student, { ...body, academicSessionId: transition.academicSessionId });
  appendReportAuditLog(db, user, "transition_profile_updated", { entityType: "RECEPTION_BASIC1_TRANSITION", entityId: transition.id, studentId: transition.studentId, classId: transition.classId, before, after: transition });
  return transition;
}

function acknowledgeTransitionHandover(db, user, transitionId, body = {}) {
  ensureEarlyYearsReportingShape(db);
  const transition = arr(db.receptionBasicOneTransitionProfiles).find((row) => str(row.id) === str(transitionId));
  assertBasicOneIncomingAccess(db, user, transition);
  if (!["PUBLISHED", "HANDED_OVER"].includes(transition.status)) {
    const error = new Error("Only published or handed-over transition profiles can be acknowledged by Basic 1.");
    error.status = 409;
    throw error;
  }
  const before = { ...transition };
  transition.receivingTeacherNotes = str(body.receivingTeacherNotes ?? transition.receivingTeacherNotes);
  transition.handoverAcknowledgedBy = str(user.id || user.username);
  transition.handoverAcknowledgedAt = nowIso();
  transition.status = "HANDED_OVER";
  transition.updatedAt = nowIso();
  db.earlyYearsReportHandoverAcknowledgements.unshift({
    id: randomId("eyfs-handover-ack"),
    transitionProfileId: transition.id,
    studentId: transition.studentId,
    acknowledgedBy: transition.handoverAcknowledgedBy,
    notes: str(body.receivingTeacherNotes || body.notes),
    createdAt: transition.handoverAcknowledgedAt,
  });
  appendReportAuditLog(db, user, "transition_handover_acknowledged", { entityType: "RECEPTION_BASIC1_TRANSITION", entityId: transition.id, studentId: transition.studentId, classId: transition.classId, before, after: transition });
  return transition;
}

function listReceptionTransitions(db, user, filters = {}) {
  ensureEarlyYearsReportingShape(db);
  return arr(db.receptionBasicOneTransitionProfiles)
    .filter((transition) => {
      try {
        if (hasAnyRole(user, PARENT_ROLES)) {
          if (!parentStudentIds(user).has(str(transition.studentId))) return false;
          return ["PUBLISHED", "HANDED_OVER"].includes(transition.status);
        }
        if (isLeader(user)) return true;
        const student = findStudent(db, transition.studentId);
        return teacherCanAccessClass(db, user, student?.classId || transition.classId) || (["PUBLISHED", "HANDED_OVER"].includes(transition.status) && assertBasicOneIncomingAccess(db, user, transition));
      } catch {
        return false;
      }
    })
    .filter((transition) => !filters.studentId || str(transition.studentId) === str(filters.studentId))
    .filter((transition) => !filters.status || str(transition.status) === str(filters.status).toUpperCase())
    .sort((a, b) => str(b.updatedAt || b.createdAt).localeCompare(str(a.updatedAt || a.createdAt)));
}

function getReceptionTransitionForStudent(db, user, studentId) {
  return {
    transitions: listReceptionTransitions(db, user, { studentId }),
    evidenceSuggestions: roleOf(user) === "PARENT" ? null : evidenceSuggestionsForStudent(db, studentId),
    readinessProfiles: arr(db.receptionSchoolReadinessProfiles).filter((row) => str(row.studentId) === str(studentId)),
    principle: "READY DOES NOT MEAN FINISHED. READINESS IS CAPABILITY - NOT EXAMINATION PERFORMANCE. TRANSITION MEANS CONTINUITY - NOT RESET.",
  };
}

function buildReportPrintHtml(detail) {
  const report = detail?.report;
  if (!report) {
    const error = new Error("Report could not be found.");
    error.status = 404;
    throw error;
  }
  const areas = arr(detail.areas);
  return `<!doctype html><html><head><meta charset="utf-8"><title>Angel Montessori Early Years Report</title><style>
body{font-family:Arial,sans-serif;color:#102a4c;margin:28px;line-height:1.45}header{border-bottom:3px solid #1d5fa9;padding-bottom:14px;margin-bottom:18px}h1{color:#173a70}.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.meta div,section{border:1px solid #d8e4f2;border-radius:8px;padding:10px;margin-bottom:10px}.area{break-inside:avoid}h2{color:#173a70}@media print{.no-print{display:none}body{margin:14mm}.meta{grid-template-columns:repeat(2,1fr)}}
</style></head><body><button class="no-print" onclick="window.print()">Print / Save PDF</button><header><div>Angel Montessori School</div><strong>In God We Trust</strong><h1>${escapeHtml(reportTypeLabel(report.reportType))}</h1></header>
<div class="meta"><div><strong>Child</strong><br>${escapeHtml(report.studentName)}</div><div><strong>Class</strong><br>${escapeHtml(report.className)}</div><div><strong>Teacher</strong><br>${escapeHtml(report.teacherName)}</div><div><strong>Session</strong><br>${escapeHtml(report.academicSessionId)}</div><div><strong>Term</strong><br>${escapeHtml(report.termId)}</div><div><strong>Version</strong><br>${escapeHtml(report.reportVersion)}</div></div>
${areas.map((area) => `<section class="area"><h2>${escapeHtml(EYFS_AREAS.find((row) => row.code === area.eyfsArea)?.name || area.eyfsArea)}</h2><p><strong>What is going well:</strong> ${escapeHtml(area.strengthsProgress)}</p><p><strong>What is developing:</strong> ${escapeHtml(area.currentDevelopment)}</p><p><strong>Next priority:</strong> ${escapeHtml(area.nextPriority)}</p><p>${escapeHtml(area.teacherComment)}</p></section>`).join("")}
<section><h2>Practical Life, Independence and Responsibility</h2><p>${escapeHtml(report.practicalLifeSummary)}</p><p>${escapeHtml(report.independenceSummary)}</p></section>
<section><h2>Character and Learning Behaviour</h2><p>${escapeHtml(report.characterResponsibilitySummary)}</p><p>${escapeHtml(report.learningBehaviourSummary)}</p></section>
${report.literacySummary ? `<section><h2>Reception Literacy Summary</h2><p>${escapeHtml(report.literacySummary)}</p></section>` : ""}
<section><h2>Overall Comment</h2><p>${escapeHtml(report.overallTeacherComment)}</p></section>
<section><h2>Next Priorities</h2><p>${escapeHtml(report.nextPriorities)}</p></section>
<section><h2>Approval</h2><p>Approved by: ${escapeHtml(report.approvedBy)} &nbsp; Published: ${escapeHtml(report.publishedAt)}</p></section>
</body></html>`;
}

function buildTransitionPrintHtml(transition) {
  if (!transition) {
    const error = new Error("Transition profile could not be found.");
    error.status = 404;
    throw error;
  }
  return `<!doctype html><html><head><meta charset="utf-8"><title>Reception to Basic 1 Transition Profile</title><style>
body{font-family:Arial,sans-serif;color:#102a4c;margin:28px;line-height:1.45}header{border-bottom:3px solid #1d5fa9;padding-bottom:14px;margin-bottom:18px}section{border:1px solid #d8e4f2;border-radius:8px;padding:10px;margin-bottom:10px}@media print{.no-print{display:none}body{margin:14mm}}
</style></head><body><button class="no-print" onclick="window.print()">Print / Save PDF</button><header><div>Angel Montessori School</div><h1>Reception to Basic 1 Transition Profile</h1><p>Know where they are - continue the journey.</p></header>
<section><strong>Child</strong><br>${escapeHtml(transition.studentName)}<br><strong>Transition</strong><br>${escapeHtml(transition.className)} to ${escapeHtml(transition.receivingClassName)}</section>
<section><h2>Strengths and Interests</h2><p>${escapeHtml(transition.strengths)}</p><p>${escapeHtml(transition.interests)}</p></section>
<section><h2>Literacy</h2><p><strong>Phonics:</strong> ${escapeHtml(transition.phonics)}</p><p><strong>Reading:</strong> ${escapeHtml(transition.reading)}</p><p><strong>Writing:</strong> ${escapeHtml(transition.writing)}</p></section>
<section><h2>Mathematics and Wider Learning</h2><p>${escapeHtml(transition.mathematics)}</p><p>${escapeHtml(transition.understandingTheWorld)}</p><p>${escapeHtml(transition.expressiveArts)}</p></section>
<section><h2>Independence, Behaviour and Character</h2><p>${escapeHtml(transition.practicalLifeIndependence)}</p><p>${escapeHtml(transition.learningBehaviour)}</p><p>${escapeHtml(transition.characterResponsibility)}</p></section>
<section><h2>Successful Strategies and Priorities</h2><p>${escapeHtml(arr(transition.successfulStrategies).join(", "))}</p><p>${escapeHtml(transition.accessAdjustments)}</p><p>${escapeHtml(transition.currentPriorities)}</p></section>
<section><h2>Parent Summary</h2><p>${escapeHtml(transition.parentTransitionSummary)}</p></section>
</body></html>`;
}

function escapeHtml(value) {
  return str(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = {
  AMES_REFERENCE_STATUSES,
  AREA_DESCRIPTORS,
  ELG_REFERENCE_ITEMS,
  ELG_REFERENCE_WORDING,
  EYFS_AREAS,
  LEADER_ROLES,
  PARENT_ROLES,
  READINESS_DOMAINS,
  REPORT_ROLES,
  REPORT_STATUSES,
  REPORT_TYPES,
  TEACHER_ROLES,
  TRANSITION_STATUSES,
  acknowledgeTransitionHandover,
  amendReport,
  approveReport,
  archiveReport,
  buildReportPrintHtml,
  buildTransitionPrintHtml,
  createCommentTemplate,
  createEarlyYearsReport,
  createReceptionEyfsReference,
  createReceptionTransitionProfile,
  ensureEarlyYearsReportingShape,
  getReceptionTransitionForStudent,
  getReportDetail,
  listCommentTemplates,
  listReceptionEyfsReferences,
  listReceptionTransitions,
  listReportArchive,
  listReports,
  publishReport,
  reportDashboard,
  returnReport,
  submitReport,
  updateEarlyYearsReport,
  updateReceptionEyfsReference,
  updateReceptionTransitionProfile,
};
