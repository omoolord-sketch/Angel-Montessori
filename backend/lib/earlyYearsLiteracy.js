const { randomUUID } = require("crypto");
const {
  assertEarlyYearsClassAccess,
  ensureEarlyYearsCurriculumShape,
  listAccessibleEarlyYearsClasses,
  str,
  teacherAssignedClassIds,
} = require("./earlyYearsCurriculum");
const { ensureEarlyYearsPlanningShape, getWeeklyPlanDetail } = require("./earlyYearsPlanning");
const { getApprovedClassConfig, normalizeAcademicKey } = require("./academicSystems");
const {
  createJournalEntry,
  createObservation,
  completeObservation,
  ensureEarlyYearsAssessmentShape,
} = require("./earlyYearsAssessment");

const LEADER_ROLES = ["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER"];
const LITERACY_ROLES = ["TEACHER", ...LEADER_ROLES];
const PARENT_ROLES = ["PARENT"];
const ALL_ACCESS_ROLES = [...new Set([...LITERACY_ROLES, ...PARENT_ROLES])];

const PROGRAMME_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"];
const PHONICS_SKILL_STATES = ["NOT_YET_TAUGHT", "TAUGHT", "REQUIRES_SUPPORT", "DEVELOPING", "SECURE", "REVIEW_REQUIRED"];
const AMES_DESCRIPTORS = ["EMERGING", "DEVELOPING", "SECURE"];
const READING_TEXT_TYPES = ["DECODABLE", "SHARED_TEXT", "RICH_LITERATURE", "OTHER"];
const SUPPORT_STATUSES = ["PLANNED", "ACTIVE", "REVIEW", "COMPLETED"];
const SUMMARY_TYPES = ["MID_TERM", "TERMLY", "CUSTOM"];
const INDEPENDENCE_LEVELS = ["WITH_ADULT_SUPPORT", "PROMPTED", "INCREASINGLY_INDEPENDENT", "INDEPENDENT"];

function nowIso() {
  return new Date().toISOString();
}

function randomId(prefix) {
  return `${prefix}-${randomUUID().slice(0, 10)}`;
}

function arr(value) {
  return Array.isArray(value) ? value : [];
}

function roleOf(user) {
  return str(user?.role || user?.originalRole).toUpperCase();
}

function hasAnyRole(user, roles) {
  const role = roleOf(user);
  const originalRole = str(user?.originalRole).toUpperCase();
  return roles.includes(role) || roles.includes(originalRole);
}

function bool(value) {
  return value === true || String(value || "").toLowerCase() === "true";
}

function numberOr(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeEnum(value, allowed, fallback = "") {
  const next = str(value).toUpperCase();
  if (allowed.includes(next)) return next;
  return fallback;
}

function textList(value) {
  if (Array.isArray(value)) return value.map(str).filter(Boolean);
  return str(value).split(/\r?\n|,/).map(str).filter(Boolean);
}

function ensureEarlyYearsLiteracyShape(db) {
  ensureEarlyYearsCurriculumShape(db);
  ensureEarlyYearsPlanningShape(db);
  ensureEarlyYearsAssessmentShape(db);
  let mutated = false;
  [
    "earlyYearsPhonicsProgrammes",
    "earlyYearsPhonicsTeachingUnits",
    "earlyYearsPhonicsProgress",
    "earlyYearsDecodableBooks",
    "earlyYearsDecodableReadingRecords",
    "earlyYearsReadingRecords",
    "earlyYearsWritingRecords",
    "earlyYearsLiteracySupportPlans",
    "earlyYearsLiteracySummaries",
    "earlyYearsHomeReadingRecords",
    "earlyYearsLiteracyParentUpdates",
    "earlyYearsLiteracyAuditLogs",
  ].forEach((key) => {
    if (!Array.isArray(db[key])) {
      db[key] = [];
      mutated = true;
    }
  });
  return { mutated };
}

function appendLiteracyAuditLog(db, actor = {}, action = "", details = {}) {
  if (!Array.isArray(db.earlyYearsLiteracyAuditLogs)) db.earlyYearsLiteracyAuditLogs = [];
  db.earlyYearsLiteracyAuditLogs.unshift({
    id: randomId("eyfs-literacy-audit"),
    action: str(action),
    userId: str(actor.id || actor.username),
    userName: str(actor.name || actor.username),
    userRole: roleOf(actor),
    studentId: str(details.studentId),
    classId: str(details.classId),
    programmeId: str(details.programmeId),
    entityType: str(details.entityType),
    entityId: str(details.entityId),
    before: details.before || null,
    after: details.after || null,
    details,
    createdAt: nowIso(),
  });
}

function assertLeader(user) {
  if (!hasAnyRole(user, LEADER_ROLES)) {
    const error = new Error("Only authorised academic leadership can configure the Reception SSP programme.");
    error.status = 403;
    throw error;
  }
}

function findStudent(db, studentId) {
  const value = str(studentId);
  return arr(db.students).find((row) => str(row.id) === value || str(row.studentId) === value) || null;
}

function isReceptionClass(ref) {
  const approved = getApprovedClassConfig(ref);
  const key = normalizeAcademicKey(approved?.id || approved?.name || ref);
  return key === "reception";
}

function classMatchesStudent(student, classRef) {
  if (!classRef) return true;
  const approved = getApprovedClassConfig(classRef);
  const studentApproved = getApprovedClassConfig(student?.classId || student?.className);
  if (approved?.id && studentApproved?.id) return approved.id === studentApproved.id;
  const classKey = normalizeAcademicKey(classRef);
  return [student?.classId, student?.className].some((item) => normalizeAcademicKey(item) === classKey);
}

function parentStudentIds(user) {
  return new Set(arr(user?.studentIds).map(str).filter(Boolean));
}

function assertReceptionClassAccess(db, user, classRef, action = "view") {
  const classRow = assertEarlyYearsClassAccess(db, user, classRef || "reception");
  if (!isReceptionClass(classRow)) {
    const error = new Error("The formal Reception SSP tracker is only available for Reception.");
    error.status = 400;
    throw error;
  }
  if (hasAnyRole(user, LEADER_ROLES)) return classRow;
  if (roleOf(user) !== "TEACHER") {
    const error = new Error("You do not have access to Reception literacy tracking.");
    error.status = 403;
    throw error;
  }
  const assigned = teacherAssignedClassIds(db, user);
  if (assigned.has(str(classRow.id))) return classRow;
  const error = new Error(action === "view" ? "You do not have access to this Reception literacy class." : "You cannot record Reception literacy evidence for an unassigned class.");
  error.status = 403;
  throw error;
}

function assertReceptionStudentAccess(db, user, studentId, options = {}) {
  const student = findStudent(db, studentId);
  if (!student) {
    const error = new Error("Reception child record could not be found.");
    error.status = 404;
    throw error;
  }
  if (options.classId && !classMatchesStudent(student, options.classId)) {
    const error = new Error("Selected class does not match this child.");
    error.status = 400;
    throw error;
  }

  const approved = getApprovedClassConfig(student.classId || student.className);
  if (!approved || !isReceptionClass(approved)) {
    const error = new Error("Formal Reception literacy tracking is only available for Reception children.");
    error.status = 400;
    throw error;
  }

  if (hasAnyRole(user, LITERACY_ROLES)) {
    const classRow = assertReceptionClassAccess(db, user, student.classId || student.className, options.action || "view");
    return { student, classRow, access: "STAFF" };
  }

  if (hasAnyRole(user, PARENT_ROLES)) {
    if (!parentStudentIds(user).has(str(student.id))) {
      const error = new Error("Parents can only view selected literacy information for their own child.");
      error.status = 403;
      throw error;
    }
    return { student, classRow: approved, access: "PARENT" };
  }

  const error = new Error("Student access to Reception literacy assessment is not enabled.");
  error.status = 403;
  throw error;
}

function listReceptionStudents(db, user, filters = {}) {
  ensureEarlyYearsLiteracyShape(db);
  if (hasAnyRole(user, PARENT_ROLES)) {
    return arr(db.students).filter((student) => parentStudentIds(user).has(str(student.id)) && isReceptionClass(student.classId || student.className));
  }
  if (!hasAnyRole(user, LITERACY_ROLES)) return [];
  const canViewReception = listAccessibleEarlyYearsClasses(db, user).some((row) => isReceptionClass(row));
  if (!canViewReception) return [];
  return arr(db.students).filter((student) => {
    if (!isReceptionClass(student.classId || student.className)) return false;
    if (filters.classId && !classMatchesStudent(student, filters.classId)) return false;
    try {
      assertReceptionStudentAccess(db, user, student.id, { action: "view" });
      return true;
    } catch {
      return false;
    }
  });
}

function activeProgramme(db, filters = {}) {
  const rows = arr(db.earlyYearsPhonicsProgrammes).filter((row) => row.status === "ACTIVE");
  if (filters.academicSessionId || filters.sessionId) {
    const sessionId = str(filters.academicSessionId || filters.sessionId);
    const scoped = rows.find((row) => str(row.academicSessionId) === sessionId);
    if (scoped) return scoped;
  }
  return rows[0] || null;
}

function findProgramme(db, programmeId) {
  return arr(db.earlyYearsPhonicsProgrammes).find((row) => str(row.id) === str(programmeId)) || null;
}

function listProgrammes(db, filters = {}) {
  ensureEarlyYearsLiteracyShape(db);
  return arr(db.earlyYearsPhonicsProgrammes)
    .filter((programme) => !filters.status || programme.status === str(filters.status).toUpperCase())
    .filter((programme) => !filters.academicSessionId || str(programme.academicSessionId) === str(filters.academicSessionId))
    .sort((a, b) => str(b.createdAt).localeCompare(str(a.createdAt)));
}

function sanitizeProgrammePayload(body = {}) {
  return {
    name: str(body.name),
    provider: str(body.provider),
    version: str(body.version),
    academicSessionId: str(body.academicSessionId || body.sessionId),
    description: str(body.description),
    programmeReference: str(body.programmeReference),
    officialDocumentationReference: str(body.officialDocumentationReference),
    sequenceConfigured: bool(body.sequenceConfigured),
    decodableReadingConfigured: bool(body.decodableReadingConfigured),
  };
}

function createProgramme(db, user = {}, body = {}) {
  ensureEarlyYearsLiteracyShape(db);
  assertLeader(user);
  const payload = sanitizeProgrammePayload(body);
  if (!payload.name) {
    const error = new Error("Programme name is required.");
    error.status = 400;
    throw error;
  }
  const timestamp = nowIso();
  const programme = {
    id: randomId("eyfs-ssp-programme"),
    ...payload,
    status: "DRAFT",
    createdBy: str(user.id),
    createdByName: str(user.name || user.username),
    approvedBy: "",
    approvedAt: "",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  db.earlyYearsPhonicsProgrammes.unshift(programme);
  appendLiteracyAuditLog(db, user, "programme_created", { entityType: "SSP_PROGRAMME", entityId: programme.id, programmeId: programme.id, after: programme });
  return programme;
}

function updateProgramme(db, user = {}, programmeId, body = {}) {
  ensureEarlyYearsLiteracyShape(db);
  assertLeader(user);
  const programme = findProgramme(db, programmeId);
  if (!programme) {
    const error = new Error("SSP programme could not be found.");
    error.status = 404;
    throw error;
  }
  if (programme.status === "ACTIVE") {
    const error = new Error("Active SSP programmes are protected. Create a new version for material changes.");
    error.status = 409;
    throw error;
  }
  const before = { ...programme };
  Object.assign(programme, sanitizeProgrammePayload({ ...programme, ...body }), { updatedAt: nowIso(), updatedBy: str(user.id) });
  appendLiteracyAuditLog(db, user, "programme_updated", { entityType: "SSP_PROGRAMME", entityId: programme.id, programmeId: programme.id, before, after: programme });
  return programme;
}

function listProgrammeSequence(db, programmeId) {
  ensureEarlyYearsLiteracyShape(db);
  return arr(db.earlyYearsPhonicsTeachingUnits)
    .filter((row) => str(row.programmeId) === str(programmeId) && row.active !== false)
    .sort((a, b) => numberOr(a.sequenceOrder, 9999) - numberOr(b.sequenceOrder, 9999) || str(a.unitLabel).localeCompare(str(b.unitLabel)));
}

function sanitizeSequencePayload(body = {}) {
  return {
    sequenceOrder: numberOr(body.sequenceOrder, 0),
    stageLabel: str(body.stageLabel),
    phaseLabel: str(body.phaseLabel),
    unitLabel: str(body.unitLabel),
    weekReference: str(body.weekReference),
    grapheme: str(body.grapheme),
    phoneme: str(body.phoneme),
    gpcLabel: str(body.gpcLabel),
    isDigraph: bool(body.isDigraph),
    isTrigraph: bool(body.isTrigraph),
    isAlternativeSpelling: bool(body.isAlternativeSpelling),
    exampleWords: textList(body.exampleWords),
    trickyWords: textList(body.trickyWords),
    reviewOf: textList(body.reviewOf),
    notes: str(body.notes),
    active: body.active === undefined ? true : bool(body.active),
  };
}

function createTeachingUnit(db, user = {}, programmeId, body = {}) {
  ensureEarlyYearsLiteracyShape(db);
  assertLeader(user);
  const programme = findProgramme(db, programmeId);
  if (!programme) {
    const error = new Error("SSP programme could not be found.");
    error.status = 404;
    throw error;
  }
  if (programme.status === "ACTIVE") {
    const error = new Error("Active SSP programme sequence is protected. Create a new programme version for sequence changes.");
    error.status = 409;
    throw error;
  }
  const payload = sanitizeSequencePayload(body);
  if (!payload.unitLabel && !payload.gpcLabel && !payload.grapheme) {
    const error = new Error("A unit label, GPC label, or grapheme is required.");
    error.status = 400;
    throw error;
  }
  const timestamp = nowIso();
  const unit = {
    id: randomId("eyfs-phonics-unit"),
    programmeId: programme.id,
    ...payload,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  db.earlyYearsPhonicsTeachingUnits.push(unit);
  programme.sequenceConfigured = listProgrammeSequence(db, programme.id).length > 0;
  programme.updatedAt = timestamp;
  appendLiteracyAuditLog(db, user, "sequence_unit_created", { entityType: "PHONICS_TEACHING_UNIT", entityId: unit.id, programmeId: programme.id, after: unit });
  return unit;
}

function activateProgramme(db, user = {}, programmeId) {
  ensureEarlyYearsLiteracyShape(db);
  assertLeader(user);
  const programme = findProgramme(db, programmeId);
  if (!programme) {
    const error = new Error("SSP programme could not be found.");
    error.status = 404;
    throw error;
  }
  if (!listProgrammeSequence(db, programme.id).length) {
    const error = new Error("Cannot activate an SSP programme until its approved teaching sequence has been configured.");
    error.status = 400;
    throw error;
  }
  const timestamp = nowIso();
  arr(db.earlyYearsPhonicsProgrammes).forEach((row) => {
    if (row.status === "ACTIVE" && str(row.id) !== str(programme.id) && (!programme.academicSessionId || str(row.academicSessionId) === str(programme.academicSessionId))) {
      row.status = "ARCHIVED";
      row.updatedAt = timestamp;
    }
  });
  programme.status = "ACTIVE";
  programme.sequenceConfigured = true;
  programme.approvedBy = str(user.id);
  programme.approvedByName = str(user.name || user.username);
  programme.approvedAt = timestamp;
  programme.updatedAt = timestamp;
  appendLiteracyAuditLog(db, user, "programme_activated", { entityType: "SSP_PROGRAMME", entityId: programme.id, programmeId: programme.id, after: programme });
  return programme;
}

function createDecodableBook(db, user = {}, programmeId, body = {}) {
  ensureEarlyYearsLiteracyShape(db);
  assertLeader(user);
  const programme = findProgramme(db, programmeId);
  if (!programme) {
    const error = new Error("SSP programme could not be found.");
    error.status = 404;
    throw error;
  }
  if (programme.status === "ACTIVE") {
    const error = new Error("Active SSP decodable book configuration is protected. Create a new programme version for material changes.");
    error.status = 409;
    throw error;
  }
  const timestamp = nowIso();
  const book = {
    id: randomId("eyfs-decodable-book"),
    programmeId: programme.id,
    title: str(body.title),
    code: str(body.code),
    programmeStage: str(body.programmeStage),
    gpcCoverage: textList(body.gpcCoverage),
    trickyWordCoverage: textList(body.trickyWordCoverage),
    sequenceOrder: numberOr(body.sequenceOrder, 0),
    active: body.active === undefined ? true : bool(body.active),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  if (!book.title) {
    const error = new Error("Decodable book title is required.");
    error.status = 400;
    throw error;
  }
  db.earlyYearsDecodableBooks.push(book);
  programme.decodableReadingConfigured = true;
  programme.updatedAt = timestamp;
  appendLiteracyAuditLog(db, user, "decodable_book_created", { entityType: "DECODABLE_BOOK", entityId: book.id, programmeId: programme.id, after: book });
  return book;
}

function listDecodableBooks(db, programmeId) {
  ensureEarlyYearsLiteracyShape(db);
  return arr(db.earlyYearsDecodableBooks)
    .filter((book) => str(book.programmeId) === str(programmeId) && book.active !== false)
    .sort((a, b) => numberOr(a.sequenceOrder, 9999) - numberOr(b.sequenceOrder, 9999) || str(a.title).localeCompare(str(b.title)));
}

function validateProgrammeAndUnit(db, programmeId, teachingUnitId = "") {
  const programme = programmeId ? findProgramme(db, programmeId) : activeProgramme(db);
  if (!programme) {
    const error = new Error("ADOPTED SSP PROGRAMME NOT YET CONFIGURED");
    error.status = 400;
    throw error;
  }
  let unit = null;
  if (teachingUnitId) {
    unit = listProgrammeSequence(db, programme.id).find((row) => str(row.id) === str(teachingUnitId));
    if (!unit) {
      const error = new Error("Selected teaching unit does not belong to the configured SSP programme.");
      error.status = 400;
      throw error;
    }
  }
  return { programme, unit };
}

function validateWeeklyPlanLink(db, user, student, body = {}) {
  const weeklyPlanId = str(body.weeklyPlanId);
  const out = { weeklyPlanId, curriculumWeekId: str(body.curriculumWeekId) };
  if (!weeklyPlanId) return out;
  const detail = getWeeklyPlanDetail(db, weeklyPlanId, user);
  if (!classMatchesStudent(student, detail.plan.classId)) {
    const error = new Error("Selected weekly plan does not belong to this Reception child.");
    error.status = 400;
    throw error;
  }
  out.curriculumWeekId = out.curriculumWeekId || str(detail.plan.curriculumWeekId);
  return out;
}

function maybeCreateLinkedObservation(db, user, student, classRow, body, source) {
  if (!bool(body.createLinkedObservation)) return "";
  const observation = createObservation(db, user, {
    studentId: student.id,
    classId: classRow.id,
    academicSessionId: body.academicSessionId || body.sessionId,
    termId: body.termId,
    weeklyPlanId: body.weeklyPlanId,
    curriculumWeekId: body.curriculumWeekId,
    observationDate: body.assessmentDate || body.date || new Date().toISOString().slice(0, 10),
    observationType: source === "WRITING" ? "WORK_EVIDENCE" : "FOCUSED_CHECK",
    context: `Reception literacy ${source.toLowerCase()} evidence`,
    eyfsArea: "LITERACY",
    title: body.title || `${source} evidence`,
    objectiveObservation: body.objectiveObservation || body.teacherNote || body.note || body.teacherComment || "Reception literacy evidence recorded.",
    interpretation: body.interpretation || body.nextAction || body.nextPriority || "Use alongside professional Literacy judgement.",
    developmentalDescriptor: normalizeEnum(body.descriptor, AMES_DESCRIPTORS, "DEVELOPING"),
    nextStep: body.nextAction || body.nextPriority || body.supportRequired,
    supportRequired: body.supportRequired || body.support,
    evidenceType: "OTHER",
    evidenceAnnotation: "Linked from Reception literacy tracker.",
    isIncludedInLearningJournal: bool(body.includeInJournal),
    journalVisibility: bool(body.parentVisible) ? "PARENT_VISIBLE" : "INTERNAL",
  });
  if (str(observation.objectiveObservation) && str(observation.interpretation) && str(observation.developmentalDescriptor)) {
    try {
      completeObservation(db, observation.id, user);
    } catch {
      // A linked observation can remain draft if a school chooses to expand it later.
    }
  }
  return observation.id;
}

function maybeCreateJournalEntry(db, user, student, body, source, content) {
  if (!bool(body.includeInJournal)) return "";
  const entry = createJournalEntry(db, student.id, user, {
    entryType: source === "WRITING" ? "WORK_SAMPLE" : "LEARNING_CONVERSATION",
    title: body.journalTitle || `${source} evidence`,
    date: body.assessmentDate || body.date || new Date().toISOString().slice(0, 10),
    content,
    teacherComment: body.teacherNote || body.teacherComment || body.nextPriority || "",
    childVoice: body.childVoice || "",
    eyfsAreas: ["LITERACY"],
    developmentalDescriptor: normalizeEnum(body.descriptor, AMES_DESCRIPTORS, ""),
    visibility: bool(body.parentVisible) ? "PARENT_VISIBLE" : "INTERNAL",
    isHighlighted: bool(body.isHighlighted),
  });
  return entry.id;
}

function createPhonicsProgress(db, user = {}, body = {}) {
  ensureEarlyYearsLiteracyShape(db);
  const { student, classRow } = assertReceptionStudentAccess(db, user, body.studentId, { classId: body.classId, action: "phonics-progress" });
  const { programme, unit } = validateProgrammeAndUnit(db, body.programmeId, body.teachingUnitId);
  const links = validateWeeklyPlanLink(db, user, student, body);
  const timestamp = nowIso();
  const observationId = str(body.evidenceObservationId) || maybeCreateLinkedObservation(db, user, student, classRow, { ...body, ...links }, "PHONICS");
  const record = {
    id: randomId("eyfs-phonics-progress"),
    studentId: str(student.id),
    studentName: str(student.name),
    classId: str(classRow.id),
    className: str(classRow.name),
    academicSessionId: str(body.academicSessionId || body.sessionId),
    termId: str(body.termId),
    programmeId: programme.id,
    programmeName: programme.name,
    programmeVersion: programme.version,
    teachingUnitId: str(unit?.id),
    teachingUnitLabel: str(unit?.gpcLabel || unit?.unitLabel),
    assessmentDate: str(body.assessmentDate || body.date) || new Date().toISOString().slice(0, 10),
    gpcRecognition: normalizeEnum(body.gpcRecognition, PHONICS_SKILL_STATES, "TAUGHT"),
    blending: normalizeEnum(body.blending, PHONICS_SKILL_STATES, "DEVELOPING"),
    segmenting: normalizeEnum(body.segmenting, PHONICS_SKILL_STATES, "DEVELOPING"),
    applicationInReading: normalizeEnum(body.applicationInReading, PHONICS_SKILL_STATES, "DEVELOPING"),
    applicationInWriting: normalizeEnum(body.applicationInWriting, PHONICS_SKILL_STATES, "DEVELOPING"),
    descriptor: normalizeEnum(body.descriptor, AMES_DESCRIPTORS, ""),
    teacherNote: str(body.teacherNote || body.note),
    supportRequired: str(body.supportRequired),
    nextAction: str(body.nextAction),
    reviewDate: str(body.reviewDate),
    evidenceObservationId: observationId,
    linkedJournalEntryId: "",
    ...links,
    assessedBy: str(user.id),
    assessedByName: str(user.name || user.username),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  record.linkedJournalEntryId = maybeCreateJournalEntry(db, user, student, body, "PHONICS", record.teacherNote || record.nextAction || "Reception phonics evidence recorded.");
  db.earlyYearsPhonicsProgress.unshift(record);
  appendLiteracyAuditLog(db, user, "phonics_progress_created", { entityType: "PHONICS_PROGRESS", entityId: record.id, studentId: record.studentId, classId: record.classId, programmeId: record.programmeId, after: record });
  return record;
}

function updatePhonicsProgress(db, user = {}, id, body = {}) {
  ensureEarlyYearsLiteracyShape(db);
  const record = arr(db.earlyYearsPhonicsProgress).find((row) => str(row.id) === str(id));
  if (!record) {
    const error = new Error("Phonics progress record could not be found.");
    error.status = 404;
    throw error;
  }
  assertReceptionStudentAccess(db, user, record.studentId, { classId: record.classId, action: "phonics-progress" });
  const before = { ...record };
  ["gpcRecognition", "blending", "segmenting", "applicationInReading", "applicationInWriting"].forEach((field) => {
    if (body[field] !== undefined) record[field] = normalizeEnum(body[field], PHONICS_SKILL_STATES, record[field]);
  });
  if (body.descriptor !== undefined) record.descriptor = normalizeEnum(body.descriptor, AMES_DESCRIPTORS, record.descriptor);
  ["teacherNote", "supportRequired", "nextAction", "reviewDate"].forEach((field) => {
    if (body[field] !== undefined) record[field] = str(body[field]);
  });
  record.updatedAt = nowIso();
  record.updatedBy = str(user.id);
  appendLiteracyAuditLog(db, user, "phonics_progress_updated", { entityType: "PHONICS_PROGRESS", entityId: record.id, studentId: record.studentId, classId: record.classId, programmeId: record.programmeId, before, after: record });
  return record;
}

function listPhonicsProgress(db, user = {}, filters = {}) {
  ensureEarlyYearsLiteracyShape(db);
  return arr(db.earlyYearsPhonicsProgress).filter((record) => {
    try {
      assertReceptionStudentAccess(db, user, record.studentId, { classId: record.classId, action: "view" });
    } catch {
      return false;
    }
    if (filters.studentId && str(record.studentId) !== str(filters.studentId)) return false;
    if (filters.classId && str(record.classId) !== str(filters.classId)) return false;
    if (filters.programmeId && str(record.programmeId) !== str(filters.programmeId)) return false;
    if (filters.teachingUnitId && str(record.teachingUnitId) !== str(filters.teachingUnitId)) return false;
    return true;
  }).sort((a, b) => str(b.assessmentDate || b.createdAt).localeCompare(str(a.assessmentDate || a.createdAt)));
}

function createReadingRecord(db, user = {}, body = {}) {
  ensureEarlyYearsLiteracyShape(db);
  const { student, classRow } = assertReceptionStudentAccess(db, user, body.studentId, { classId: body.classId, action: "reading" });
  const programme = body.programmeId ? findProgramme(db, body.programmeId) : activeProgramme(db);
  const links = validateWeeklyPlanLink(db, user, student, body);
  const timestamp = nowIso();
  const textType = normalizeEnum(body.textType, READING_TEXT_TYPES, "DECODABLE");
  const observationId = str(body.linkedObservationId) || maybeCreateLinkedObservation(db, user, student, classRow, { ...body, ...links, assessmentDate: body.dateRead || body.date }, "READING");
  const record = {
    id: randomId("eyfs-reading"),
    studentId: str(student.id),
    studentName: str(student.name),
    classId: str(classRow.id),
    className: str(classRow.name),
    academicSessionId: str(body.academicSessionId || body.sessionId),
    termId: str(body.termId),
    programmeId: str(programme?.id || body.programmeId),
    programmeName: str(programme?.name),
    bookTitle: str(body.bookTitle || body.textTitle),
    bookCode: str(body.bookCode),
    bookLevel: str(body.bookLevel),
    programmePoint: str(body.programmePoint),
    textTitle: str(body.textTitle || body.bookTitle),
    textType,
    dateIssued: str(body.dateIssued),
    dateRead: str(body.dateRead || body.date) || new Date().toISOString().slice(0, 10),
    accuracyNote: str(body.accuracyNote || body.accuracy),
    blendingNote: str(body.blendingNote || body.blending),
    fluencyNote: str(body.fluencyNote || body.fluency),
    comprehensionNote: str(body.comprehensionNote || body.comprehension),
    vocabulary: str(body.vocabulary),
    confidenceNote: str(body.confidenceNote || body.confidence),
    discussion: str(body.discussion),
    independenceLevel: normalizeEnum(body.independenceLevel, INDEPENDENCE_LEVELS, ""),
    reviewAction: str(body.reviewAction || body.nextPriority),
    teacherComment: str(body.teacherComment),
    homePracticeNote: str(body.homePracticeNote),
    parentVisible: bool(body.parentVisible),
    linkedObservationId: observationId,
    linkedJournalEntryId: "",
    ...links,
    teacherId: str(user.id),
    teacherName: str(user.name || user.username),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  record.linkedJournalEntryId = maybeCreateJournalEntry(db, user, student, body, "READING", record.teacherComment || record.comprehensionNote || `${record.textType.replace(/_/g, " ")} reading evidence.`);
  db.earlyYearsReadingRecords.unshift(record);
  if (textType === "DECODABLE") {
    db.earlyYearsDecodableReadingRecords.unshift({
      id: randomId("eyfs-decodable-reading"),
      readingRecordId: record.id,
      studentId: record.studentId,
      academicSessionId: record.academicSessionId,
      termId: record.termId,
      programmeId: record.programmeId,
      bookTitle: record.bookTitle,
      bookCode: record.bookCode,
      bookLevel: record.bookLevel,
      programmePoint: record.programmePoint,
      dateIssued: record.dateIssued,
      dateRead: record.dateRead,
      accuracyNote: record.accuracyNote,
      blendingNote: record.blendingNote,
      fluencyNote: record.fluencyNote,
      comprehensionNote: record.comprehensionNote,
      confidenceNote: record.confidenceNote,
      independenceLevel: record.independenceLevel,
      reviewAction: record.reviewAction,
      teacherId: record.teacherId,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }
  appendLiteracyAuditLog(db, user, "reading_record_created", { entityType: "READING_RECORD", entityId: record.id, studentId: record.studentId, classId: record.classId, programmeId: record.programmeId, after: record });
  return record;
}

function listReadingRecords(db, user = {}, filters = {}) {
  ensureEarlyYearsLiteracyShape(db);
  return arr(db.earlyYearsReadingRecords).filter((record) => {
    try {
      const { access } = assertReceptionStudentAccess(db, user, record.studentId, { classId: record.classId, action: "reading" });
      if (access === "PARENT" && !record.parentVisible) return false;
    } catch {
      return false;
    }
    if (filters.studentId && str(record.studentId) !== str(filters.studentId)) return false;
    if (filters.textType && record.textType !== str(filters.textType).toUpperCase()) return false;
    return true;
  }).sort((a, b) => str(b.dateRead || b.createdAt).localeCompare(str(a.dateRead || a.createdAt)));
}

function createWritingRecord(db, user = {}, body = {}) {
  ensureEarlyYearsLiteracyShape(db);
  const { student, classRow } = assertReceptionStudentAccess(db, user, body.studentId, { classId: body.classId, action: "writing" });
  const programme = body.programmeId ? findProgramme(db, body.programmeId) : activeProgramme(db);
  const links = validateWeeklyPlanLink(db, user, student, body);
  const timestamp = nowIso();
  const observationId = str(body.linkedObservationId) || maybeCreateLinkedObservation(db, user, student, classRow, { ...body, ...links, assessmentDate: body.date }, "WRITING");
  const record = {
    id: randomId("eyfs-writing"),
    studentId: str(student.id),
    studentName: str(student.name),
    classId: str(classRow.id),
    className: str(classRow.name),
    academicSessionId: str(body.academicSessionId || body.sessionId),
    termId: str(body.termId),
    programmeId: str(programme?.id || body.programmeId),
    programmeName: str(programme?.name),
    date: str(body.date) || new Date().toISOString().slice(0, 10),
    oralComposition: str(body.oralComposition),
    segmenting: str(body.segmenting),
    graphemeSelection: str(body.graphemeSelection),
    letterFormation: str(body.letterFormation),
    wordWriting: str(body.wordWriting),
    spacing: str(body.spacing),
    sentenceConstruction: str(body.sentenceConstruction),
    rereading: str(body.rereading),
    writingForPurpose: str(body.writingForPurpose),
    independence: normalizeEnum(body.independence, INDEPENDENCE_LEVELS, ""),
    sayItBuildItWriteItReadItBack: str(body.sayItBuildItWriteItReadItBack),
    teacherComment: str(body.teacherComment),
    nextPriority: str(body.nextPriority),
    parentVisible: bool(body.parentVisible),
    linkedObservationId: observationId,
    linkedJournalEntryId: "",
    ...links,
    teacherId: str(user.id),
    teacherName: str(user.name || user.username),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  record.linkedJournalEntryId = maybeCreateJournalEntry(db, user, student, body, "WRITING", record.teacherComment || record.writingForPurpose || "Reception writing evidence recorded.");
  db.earlyYearsWritingRecords.unshift(record);
  appendLiteracyAuditLog(db, user, "writing_record_created", { entityType: "WRITING_RECORD", entityId: record.id, studentId: record.studentId, classId: record.classId, programmeId: record.programmeId, after: record });
  return record;
}

function listWritingRecords(db, user = {}, filters = {}) {
  ensureEarlyYearsLiteracyShape(db);
  return arr(db.earlyYearsWritingRecords).filter((record) => {
    try {
      const { access } = assertReceptionStudentAccess(db, user, record.studentId, { classId: record.classId, action: "writing" });
      if (access === "PARENT" && !record.parentVisible) return false;
    } catch {
      return false;
    }
    if (filters.studentId && str(record.studentId) !== str(filters.studentId)) return false;
    return true;
  }).sort((a, b) => str(b.date || b.createdAt).localeCompare(str(a.date || a.createdAt)));
}

function createSupportPlan(db, user = {}, body = {}) {
  ensureEarlyYearsLiteracyShape(db);
  const { student, classRow } = assertReceptionStudentAccess(db, user, body.studentId, { classId: body.classId, action: "support" });
  const programme = body.programmeId ? findProgramme(db, body.programmeId) : activeProgramme(db);
  const timestamp = nowIso();
  const plan = {
    id: randomId("eyfs-literacy-support"),
    studentId: str(student.id),
    studentName: str(student.name),
    classId: str(classRow.id),
    className: str(classRow.name),
    academicSessionId: str(body.academicSessionId || body.sessionId),
    termId: str(body.termId),
    programmeId: str(programme?.id || body.programmeId),
    programmePoint: str(body.programmePoint),
    identifiedNeed: str(body.identifiedNeed),
    supportFocus: str(body.supportFocus),
    startDate: str(body.startDate) || new Date().toISOString().slice(0, 10),
    reviewDate: str(body.reviewDate),
    frequency: str(body.frequency),
    strategy: str(body.strategy),
    status: normalizeEnum(body.status, SUPPORT_STATUSES, "PLANNED"),
    reviewOutcome: str(body.reviewOutcome),
    teacherId: str(user.id),
    teacherName: str(user.name || user.username),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  db.earlyYearsLiteracySupportPlans.unshift(plan);
  appendLiteracyAuditLog(db, user, "support_plan_created", { entityType: "LITERACY_SUPPORT", entityId: plan.id, studentId: plan.studentId, classId: plan.classId, programmeId: plan.programmeId, after: plan });
  return plan;
}

function updateSupportPlan(db, user = {}, id, body = {}) {
  ensureEarlyYearsLiteracyShape(db);
  const plan = arr(db.earlyYearsLiteracySupportPlans).find((row) => str(row.id) === str(id));
  if (!plan) {
    const error = new Error("Keep-up support plan could not be found.");
    error.status = 404;
    throw error;
  }
  assertReceptionStudentAccess(db, user, plan.studentId, { classId: plan.classId, action: "support" });
  const before = { ...plan };
  ["identifiedNeed", "programmePoint", "supportFocus", "startDate", "reviewDate", "frequency", "strategy", "reviewOutcome"].forEach((field) => {
    if (body[field] !== undefined) plan[field] = str(body[field]);
  });
  if (body.status !== undefined) plan.status = normalizeEnum(body.status, SUPPORT_STATUSES, plan.status);
  plan.updatedAt = nowIso();
  plan.updatedBy = str(user.id);
  appendLiteracyAuditLog(db, user, "support_plan_updated", { entityType: "LITERACY_SUPPORT", entityId: plan.id, studentId: plan.studentId, classId: plan.classId, programmeId: plan.programmeId, before, after: plan });
  return plan;
}

function listSupportPlans(db, user = {}, filters = {}) {
  ensureEarlyYearsLiteracyShape(db);
  return arr(db.earlyYearsLiteracySupportPlans).filter((plan) => {
    try {
      assertReceptionStudentAccess(db, user, plan.studentId, { classId: plan.classId, action: "support" });
    } catch {
      return false;
    }
    if (filters.studentId && str(plan.studentId) !== str(filters.studentId)) return false;
    if (filters.status && plan.status !== str(filters.status).toUpperCase()) return false;
    return true;
  }).sort((a, b) => str(a.reviewDate || a.createdAt).localeCompare(str(b.reviewDate || b.createdAt)));
}

function createLiteracySummary(db, user = {}, body = {}) {
  ensureEarlyYearsLiteracyShape(db);
  const { student, classRow } = assertReceptionStudentAccess(db, user, body.studentId, { classId: body.classId, action: "literacy-summary" });
  const timestamp = nowIso();
  const summary = {
    id: randomId("eyfs-literacy-summary"),
    studentId: str(student.id),
    studentName: str(student.name),
    classId: str(classRow.id),
    className: str(classRow.name),
    academicSessionId: str(body.academicSessionId || body.sessionId),
    termId: str(body.termId),
    summaryType: normalizeEnum(body.summaryType, SUMMARY_TYPES, "TERMLY"),
    phonicsSummary: str(body.phonicsSummary),
    readingSummary: str(body.readingSummary),
    comprehensionSummary: str(body.comprehensionSummary),
    writingSummary: str(body.writingSummary),
    strengths: str(body.strengths),
    currentPriorities: str(body.currentPriorities),
    support: str(body.support),
    nextSteps: str(body.nextSteps),
    parentVisible: bool(body.parentVisible),
    createdBy: str(user.id),
    createdByName: str(user.name || user.username),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  db.earlyYearsLiteracySummaries.unshift(summary);
  appendLiteracyAuditLog(db, user, "literacy_summary_created", { entityType: "LITERACY_SUMMARY", entityId: summary.id, studentId: summary.studentId, classId: summary.classId, after: summary });
  return summary;
}

function listLiteracySummaries(db, user = {}, filters = {}) {
  ensureEarlyYearsLiteracyShape(db);
  return arr(db.earlyYearsLiteracySummaries).filter((summary) => {
    try {
      const { access } = assertReceptionStudentAccess(db, user, summary.studentId, { classId: summary.classId, action: "literacy-summary" });
      if (access === "PARENT" && !summary.parentVisible) return false;
    } catch {
      return false;
    }
    if (filters.studentId && str(summary.studentId) !== str(filters.studentId)) return false;
    return true;
  }).sort((a, b) => str(b.createdAt).localeCompare(str(a.createdAt)));
}

function createHomeReadingRecord(db, user = {}, body = {}) {
  ensureEarlyYearsLiteracyShape(db);
  const { student, classRow, access } = assertReceptionStudentAccess(db, user, body.studentId, { classId: body.classId, action: "home-reading" });
  const timestamp = nowIso();
  const row = {
    id: randomId("eyfs-home-reading"),
    studentId: str(student.id),
    studentName: str(student.name),
    classId: str(classRow.id),
    academicSessionId: str(body.academicSessionId || body.sessionId),
    termId: str(body.termId),
    book: str(body.book || body.bookTitle),
    date: str(body.date) || timestamp.slice(0, 10),
    parentComment: str(body.parentComment),
    teacherComment: str(body.teacherComment),
    readingCompleted: bool(body.readingCompleted),
    homePracticeNote: str(body.homePracticeNote),
    createdBy: str(user.id),
    createdByRole: access,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  db.earlyYearsHomeReadingRecords.unshift(row);
  appendLiteracyAuditLog(db, user, "home_reading_record_created", { entityType: "HOME_READING", entityId: row.id, studentId: row.studentId, classId: row.classId, after: row });
  return row;
}

function listHomeReadingRecords(db, user = {}, filters = {}) {
  ensureEarlyYearsLiteracyShape(db);
  return arr(db.earlyYearsHomeReadingRecords).filter((row) => {
    try {
      assertReceptionStudentAccess(db, user, row.studentId, { classId: row.classId, action: "home-reading" });
    } catch {
      return false;
    }
    if (filters.studentId && str(row.studentId) !== str(filters.studentId)) return false;
    return true;
  }).sort((a, b) => str(b.date || b.createdAt).localeCompare(str(a.date || a.createdAt)));
}

function createParentUpdate(db, user = {}, body = {}) {
  ensureEarlyYearsLiteracyShape(db);
  const { student, classRow } = assertReceptionStudentAccess(db, user, body.studentId, { classId: body.classId, action: "parent-update" });
  if (!hasAnyRole(user, LITERACY_ROLES)) {
    const error = new Error("Only authorised staff can publish Reception literacy updates to parents.");
    error.status = 403;
    throw error;
  }
  const timestamp = nowIso();
  const row = {
    id: randomId("eyfs-literacy-parent-update"),
    studentId: str(student.id),
    studentName: str(student.name),
    classId: str(classRow.id),
    academicSessionId: str(body.academicSessionId || body.sessionId),
    termId: str(body.termId),
    currentLiteracyFocus: str(body.currentLiteracyFocus),
    readingComment: str(body.readingComment),
    suggestedHomePractice: str(body.suggestedHomePractice),
    approvedBookInformation: str(body.approvedBookInformation),
    teacherMessage: str(body.teacherMessage),
    status: "PUBLISHED",
    createdBy: str(user.id),
    createdByName: str(user.name || user.username),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  db.earlyYearsLiteracyParentUpdates.unshift(row);
  appendLiteracyAuditLog(db, user, "parent_literacy_update_published", { entityType: "LITERACY_PARENT_UPDATE", entityId: row.id, studentId: row.studentId, classId: row.classId, after: row });
  return row;
}

function listParentUpdates(db, user = {}, filters = {}) {
  ensureEarlyYearsLiteracyShape(db);
  return arr(db.earlyYearsLiteracyParentUpdates).filter((row) => {
    try {
      assertReceptionStudentAccess(db, user, row.studentId, { classId: row.classId, action: "parent-update" });
    } catch {
      return false;
    }
    if (filters.studentId && str(row.studentId) !== str(filters.studentId)) return false;
    return true;
  }).sort((a, b) => str(b.createdAt).localeCompare(str(a.createdAt)));
}

function latestBy(records, field, value) {
  return records.find((row) => !value || str(row[field]) === str(value)) || null;
}

function getStudentLiteracyProfile(db, user = {}, studentId, filters = {}) {
  ensureEarlyYearsLiteracyShape(db);
  const { student } = assertReceptionStudentAccess(db, user, studentId, { action: "literacy-profile" });
  const programme = activeProgramme(db, filters);
  const sequence = programme ? listProgrammeSequence(db, programme.id) : [];
  const progress = listPhonicsProgress(db, user, { studentId });
  const reading = listReadingRecords(db, user, { studentId });
  const writing = listWritingRecords(db, user, { studentId });
  const support = listSupportPlans(db, user, { studentId });
  const summaries = listLiteracySummaries(db, user, { studentId });
  const homeReading = listHomeReadingRecords(db, user, { studentId });
  const parentUpdates = listParentUpdates(db, user, { studentId });
  const latestProgress = progress[0] || null;
  return {
    student,
    programmeStatus: programme ? "CONFIGURED" : "ADOPTED SSP PROGRAMME NOT YET CONFIGURED",
    currentProgramme: programme,
    currentTeachingPoint: latestProgress?.teachingUnitLabel || sequence[0]?.gpcLabel || sequence[0]?.unitLabel || "",
    sequenceConfigured: sequence.length > 0,
    gpcDevelopment: latestProgress?.gpcRecognition || "",
    blending: latestProgress?.blending || "",
    segmenting: latestProgress?.segmenting || "",
    readingApplication: latestProgress?.applicationInReading || "",
    writingApplication: latestProgress?.applicationInWriting || "",
    decodableReading: latestBy(reading, "textType", "DECODABLE"),
    readingFluency: reading[0]?.fluencyNote || "",
    comprehension: reading[0]?.comprehensionNote || "",
    vocabulary: reading[0]?.vocabulary || "",
    writing: writing[0] || null,
    letterFormation: writing[0]?.letterFormation || "",
    independence: writing[0]?.independence || reading[0]?.independenceLevel || "",
    recentEvidence: { phonics: progress.slice(0, 5), reading: reading.slice(0, 5), writing: writing.slice(0, 5) },
    currentPriorities: {
      phonics: latestProgress?.nextAction || latestProgress?.supportRequired || "",
      reading: reading[0]?.reviewAction || "",
      writing: writing[0]?.nextPriority || "",
    },
    keepUpSupport: support,
    summaries,
    homeReading,
    parentUpdates,
  };
}

function getClassLiteracyOverview(db, user = {}, classId = "reception", filters = {}) {
  ensureEarlyYearsLiteracyShape(db);
  const classRow = assertReceptionClassAccess(db, user, classId, "class-review");
  const students = listReceptionStudents(db, user, { classId: classRow.id });
  const programme = activeProgramme(db, filters);
  const progress = listPhonicsProgress(db, user, { classId: classRow.id });
  const support = listSupportPlans(db, user, {});
  const reading = listReadingRecords(db, user, {});
  const writing = listWritingRecords(db, user, {});
  const statuses = { SECURE: 0, DEVELOPING: 0, REQUIRES_SUPPORT: 0, REVIEW_REQUIRED: 0, NO_RECENT_EVIDENCE: 0 };
  const children = students.map((student) => {
    const childProgress = progress.find((row) => str(row.studentId) === str(student.id));
    const needsReview = childProgress && [childProgress.gpcRecognition, childProgress.blending, childProgress.segmenting, childProgress.applicationInReading, childProgress.applicationInWriting].includes("REVIEW_REQUIRED");
    const needsSupport = childProgress && [childProgress.gpcRecognition, childProgress.blending, childProgress.segmenting].includes("REQUIRES_SUPPORT");
    let status = "NO_RECENT_EVIDENCE";
    if (needsReview) status = "REVIEW_REQUIRED";
    else if (needsSupport) status = "REQUIRES_SUPPORT";
    else if (childProgress?.descriptor === "SECURE" || childProgress?.gpcRecognition === "SECURE") status = "SECURE";
    else if (childProgress) status = "DEVELOPING";
    statuses[status] += 1;
    return {
      studentId: student.id,
      studentName: student.name,
      status,
      latestTeachingPoint: childProgress?.teachingUnitLabel || "",
      lastReviewed: childProgress?.assessmentDate || "",
      keepUpActive: support.some((row) => str(row.studentId) === str(student.id) && ["PLANNED", "ACTIVE", "REVIEW"].includes(row.status)),
    };
  });
  return {
    class: classRow,
    currentProgramme: programme,
    programmeStatus: programme ? "CONFIGURED" : "ADOPTED SSP PROGRAMME NOT YET CONFIGURED",
    currentProgrammePoint: progress[0]?.teachingUnitLabel || "",
    recentlyTaughtGpcs: [...new Set(progress.slice(0, 8).map((row) => row.teachingUnitLabel).filter(Boolean))],
    summary: statuses,
    children,
    supportDue: support.filter((row) => row.reviewDate && row.status !== "COMPLETED").slice(0, 20),
    evidenceCoverage: {
      noRecentPhonicsEvidence: children.filter((row) => row.status === "NO_RECENT_EVIDENCE").length,
      noRecentReadingEvidence: students.filter((student) => !reading.some((row) => str(row.studentId) === str(student.id))).length,
      noRecentWritingEvidence: students.filter((student) => !writing.some((row) => str(row.studentId) === str(student.id))).length,
    },
  };
}

function getTransitionSnapshot(db, user = {}, studentId) {
  const profile = getStudentLiteracyProfile(db, user, studentId, {});
  return {
    student: profile.student,
    sspProgrammeUsed: profile.currentProgramme ? `${profile.currentProgramme.name}${profile.currentProgramme.version ? ` ${profile.currentProgramme.version}` : ""}` : "ADOPTED SSP PROGRAMME NOT YET CONFIGURED",
    programmePointReached: profile.currentTeachingPoint,
    gpcInformation: profile.gpcDevelopment,
    blending: profile.blending,
    segmenting: profile.segmenting,
    decodableReading: profile.decodableReading?.bookTitle || "",
    fluency: profile.readingFluency,
    comprehension: profile.comprehension,
    writing: profile.writing?.teacherComment || profile.writing?.writingForPurpose || "",
    currentPriorities: profile.currentPriorities,
    supportStrategies: profile.keepUpSupport.map((row) => row.strategy).filter(Boolean),
    note: "Transition means continuity, not reset. This is data architecture for later handover reporting.",
  };
}

function productionSequenceAudit(db) {
  ensureEarlyYearsLiteracyShape(db);
  const configured = arr(db.earlyYearsPhonicsProgrammes).some((row) => row.status === "ACTIVE");
  const sequenceCount = arr(db.earlyYearsPhonicsTeachingUnits).filter((row) => {
    const programme = findProgramme(db, row.programmeId);
    return programme && programme.status === "ACTIVE";
  }).length;
  return {
    configuredSspProgramme: configured ? "YES" : "NO",
    productionGpcSequence: sequenceCount > 0 ? "CONFIGURED" : "EMPTY",
    inventedPlaceholderGpcs: 0,
    productionSequenceCount: sequenceCount,
  };
}

module.exports = {
  ALL_ACCESS_ROLES,
  AMES_DESCRIPTORS,
  INDEPENDENCE_LEVELS,
  LEADER_ROLES,
  LITERACY_ROLES,
  PARENT_ROLES,
  PHONICS_SKILL_STATES,
  PROGRAMME_STATUSES,
  READING_TEXT_TYPES,
  SUMMARY_TYPES,
  SUPPORT_STATUSES,
  activateProgramme,
  appendLiteracyAuditLog,
  createDecodableBook,
  createHomeReadingRecord,
  createLiteracySummary,
  createParentUpdate,
  createPhonicsProgress,
  createProgramme,
  createReadingRecord,
  createSupportPlan,
  createTeachingUnit,
  createWritingRecord,
  ensureEarlyYearsLiteracyShape,
  getClassLiteracyOverview,
  getStudentLiteracyProfile,
  getTransitionSnapshot,
  listDecodableBooks,
  listHomeReadingRecords,
  listLiteracySummaries,
  listParentUpdates,
  listPhonicsProgress,
  listProgrammeSequence,
  listProgrammes,
  listReadingRecords,
  listReceptionStudents,
  listSupportPlans,
  listWritingRecords,
  productionSequenceAudit,
  updatePhonicsProgress,
  updateProgramme,
  updateSupportPlan,
};
