const { randomUUID } = require("crypto");
const {
  AMES_DIMENSION_REFS,
  EYFS_AREA_REFS,
  assertEarlyYearsClassAccess,
  ensureEarlyYearsCurriculumShape,
  listAccessibleEarlyYearsClasses,
  str,
  teacherAssignedClassIds,
} = require("./earlyYearsCurriculum");
const {
  ensureEarlyYearsPlanningShape,
  getWeeklyPlanDetail,
} = require("./earlyYearsPlanning");
const {
  getApprovedClassConfig,
  normalizeAcademicKey,
} = require("./academicSystems");

const ASSESSMENT_ROLES = ["TEACHER", "ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER"];
const LEADER_ROLES = ["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER"];
const PARENT_ROLES = ["PARENT"];

const OBSERVATION_TYPES = [
  "EVERYDAY_OBSERVATION",
  "SIGNIFICANT_OBSERVATION",
  "FOCUSED_OBSERVATION",
  "LEARNING_CONVERSATION",
  "WORK_EVIDENCE",
  "FOCUSED_CHECK",
];

const DEVELOPMENTAL_DESCRIPTORS = ["EMERGING", "DEVELOPING", "SECURE"];
const OBSERVATION_STATUSES = ["DRAFT", "COMPLETE", "REVIEWED", "ARCHIVED"];
const NEXT_STEP_STATUSES = ["OPEN", "IN_PROGRESS", "ACHIEVED", "REVISED", "NO_LONGER_PRIORITY"];
const JOURNAL_ENTRY_TYPES = [
  "OBSERVATION",
  "WORK_SAMPLE",
  "LEARNING_CONVERSATION",
  "CHILD_VOICE",
  "PARENT_CONTRIBUTION",
  "DEVELOPMENT_SUMMARY",
  "TRANSITION_NOTE",
];
const SUMMARY_TYPES = ["MID_TERM", "TERMLY", "CUSTOM"];
const VISIBILITY = ["INTERNAL", "PARENT_VISIBLE"];
const EVIDENCE_TYPES = [
  "NONE",
  "PHOTO",
  "DOCUMENT",
  "DRAWING_REFERENCE",
  "WRITING_SAMPLE",
  "CONSTRUCTION_REFERENCE",
  "OTHER",
];

const EYFS_AREA_CODES = EYFS_AREA_REFS.map((row) => row.code);
const DIMENSION_CODES = [
  ...AMES_DIMENSION_REFS.map((row) => row.code),
  "INDEPENDENCE",
  "LEARNING_BEHAVIOUR",
];

const AREA_SUMMARY_TEMPLATE = EYFS_AREA_CODES.reduce((out, code) => {
  out[code] = {
    strengthsProgress: "",
    currentDevelopment: "",
    nextPriority: "",
    descriptor: "",
  };
  return out;
}, {});

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

function normalizeEnum(value, allowed, fallback = "") {
  const next = str(value).toUpperCase();
  if (allowed.includes(next)) return next;
  return fallback;
}

function normalizeList(value, allowed = []) {
  const values = Array.isArray(value) ? value : String(value || "").split(/\r?\n|,/);
  const out = [];
  const seen = new Set();
  values.forEach((item) => {
    const key = str(item).toUpperCase();
    if (!key) return;
    const match = allowed.find((allowedValue) => normalizeAcademicKey(allowedValue) === normalizeAcademicKey(key));
    const next = match || key;
    if (seen.has(next)) return;
    seen.add(next);
    out.push(next);
  });
  return out;
}

function ensureEarlyYearsAssessmentShape(db) {
  ensureEarlyYearsCurriculumShape(db);
  ensureEarlyYearsPlanningShape(db);
  let mutated = false;
  [
    "earlyYearsObservations",
    "earlyYearsLearningJournalEntries",
    "earlyYearsChildProfiles",
    "earlyYearsDevelopmentSummaries",
    "earlyYearsNextSteps",
    "earlyYearsParentContributions",
    "earlyYearsAssessmentAuditLogs",
    "earlyYearsEvidenceRecords",
  ].forEach((key) => {
    if (!Array.isArray(db[key])) {
      db[key] = [];
      mutated = true;
    }
  });
  if (!Array.isArray(db.eyfsObservations)) {
    db.eyfsObservations = [];
    mutated = true;
  }
  return { mutated };
}

function appendAssessmentAuditLog(db, actor = {}, action = "", details = {}) {
  if (!Array.isArray(db.earlyYearsAssessmentAuditLogs)) db.earlyYearsAssessmentAuditLogs = [];
  db.earlyYearsAssessmentAuditLogs.unshift({
    id: randomId("eyfs-assessment-audit"),
    action: str(action),
    userId: str(actor.id || actor.username),
    userName: str(actor.name || actor.username),
    userRole: roleOf(actor),
    studentId: str(details.studentId),
    classId: str(details.classId),
    sessionId: str(details.academicSessionId || details.sessionId),
    termId: str(details.termId),
    entityType: str(details.entityType),
    entityId: str(details.entityId),
    details,
    createdAt: nowIso(),
  });
}

function findStudent(db, studentId) {
  const value = str(studentId);
  return arr(db.students).find((row) => str(row.id) === value || str(row.studentId) === value) || null;
}

function studentClassRef(student, classRef = "") {
  return str(classRef || student?.classId || student?.className);
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

function assertStaffAccessToStudent(db, user, student, action = "view") {
  const classRow = assertEarlyYearsClassAccess(db, user, studentClassRef(student));
  if (hasAnyRole(user, LEADER_ROLES)) return classRow;
  if (roleOf(user) !== "TEACHER") {
    const error = new Error("You do not have access to Early Years assessment records.");
    error.status = 403;
    throw error;
  }
  const assigned = teacherAssignedClassIds(db, user);
  if (assigned.has(str(classRow.id)) || assigned.has(str(student.classId))) return classRow;
  const error = new Error(action === "view" ? "You do not have access to this child's assessment records." : "You cannot assess a child outside your assigned Early Years class.");
  error.status = 403;
  throw error;
}

function assertStudentAccess(db, user, studentId, options = {}) {
  const student = findStudent(db, studentId);
  if (!student) {
    const error = new Error("Child record could not be found.");
    error.status = 404;
    throw error;
  }
  if (options.classId && !classMatchesStudent(student, options.classId)) {
    const error = new Error("Selected class does not match this child.");
    error.status = 400;
    throw error;
  }

  if (hasAnyRole(user, ASSESSMENT_ROLES)) {
    const classRow = assertStaffAccessToStudent(db, user, student, options.action || "view");
    return { student, classRow, access: "STAFF" };
  }

  if (hasAnyRole(user, PARENT_ROLES)) {
    if (!parentStudentIds(user).has(str(student.id))) {
      const error = new Error("Parents can only view approved records for their own child.");
      error.status = 403;
      throw error;
    }
    const approved = getApprovedClassConfig(student.classId || student.className);
    if (!approved || approved.academicSystem !== "BRITISH_EYFS") {
      const error = new Error("Early Years journal access is only available for Crèche, Nursery, and Reception.");
      error.status = 400;
      throw error;
    }
    return { student, classRow: approved, access: "PARENT" };
  }

  const error = new Error("Student access to Early Years learning journals is not enabled.");
  error.status = 403;
  throw error;
}

function listAccessibleStudents(db, user, filters = {}) {
  ensureEarlyYearsAssessmentShape(db);
  if (hasAnyRole(user, PARENT_ROLES)) {
    return arr(db.students).filter((student) => parentStudentIds(user).has(str(student.id))).filter((student) => getApprovedClassConfig(student.classId || student.className)?.academicSystem === "BRITISH_EYFS");
  }
  if (!hasAnyRole(user, ASSESSMENT_ROLES)) return [];
  const classes = listAccessibleEarlyYearsClasses(db, user);
  const allowedClassIds = new Set(classes.map((row) => str(row.id)));
  const allowedClassKeys = new Set(classes.map((row) => normalizeAcademicKey(row.name)));
  return arr(db.students).filter((student) => {
    const classId = str(student.classId);
    const classKey = normalizeAcademicKey(student.className);
    if (!allowedClassIds.has(classId) && !allowedClassKeys.has(classKey)) return false;
    if (filters.classId && !classMatchesStudent(student, filters.classId)) return false;
    return true;
  });
}

function getOrCreateChildProfile(db, student, user = {}) {
  let profile = arr(db.earlyYearsChildProfiles).find((row) => str(row.studentId) === str(student.id));
  if (!profile) {
    const timestamp = nowIso();
    profile = {
      id: randomId("eyfs-child-profile"),
      studentId: str(student.id),
      childName: str(student.name || `${student.firstName || ""} ${student.lastName || ""}`),
      preferredName: str(student.preferredName),
      dateOfBirth: str(student.dateOfBirth || student.dob),
      classId: str(student.classId),
      className: str(student.className),
      startDate: str(student.startDate || student.admissionDate),
      keyPersonTeacherId: str(student.teacherId),
      keyPersonTeacherName: "",
      homeLanguages: [],
      interests: "",
      familyInformation: "",
      medicalDietaryInformation: "",
      additionalSupport: "",
      strengthsAtEntry: "",
      parentPriorities: "",
      baseline: { ...AREA_SUMMARY_TEMPLATE },
      createdBy: str(user.id),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    db.earlyYearsChildProfiles.unshift(profile);
  }
  return profile;
}

function sanitizeProfilePayload(body = {}) {
  const baseline = {};
  Object.keys(AREA_SUMMARY_TEMPLATE).forEach((area) => {
    const source = body.baseline?.[area] || {};
    baseline[area] = {
      strengthsProgress: str(source.strengthsProgress),
      currentDevelopment: str(source.currentDevelopment),
      nextPriority: str(source.nextPriority),
      descriptor: normalizeEnum(source.descriptor, DEVELOPMENTAL_DESCRIPTORS, ""),
    };
  });
  return {
    preferredName: str(body.preferredName),
    dateOfBirth: str(body.dateOfBirth),
    startDate: str(body.startDate),
    keyPersonTeacherId: str(body.keyPersonTeacherId),
    keyPersonTeacherName: str(body.keyPersonTeacherName),
    homeLanguages: normalizeList(body.homeLanguages),
    interests: str(body.interests),
    familyInformation: str(body.familyInformation),
    medicalDietaryInformation: str(body.medicalDietaryInformation),
    additionalSupport: str(body.additionalSupport),
    strengthsAtEntry: str(body.strengthsAtEntry),
    parentPriorities: str(body.parentPriorities),
    baseline,
  };
}

function updateChildProfile(db, studentId, user = {}, body = {}) {
  const { student } = assertStudentAccess(db, user, studentId, { action: "profile" });
  if (!hasAnyRole(user, ASSESSMENT_ROLES)) {
    const error = new Error("Only authorised staff can edit Early Years child profiles.");
    error.status = 403;
    throw error;
  }
  const profile = getOrCreateChildProfile(db, student, user);
  const before = { ...profile };
  Object.assign(profile, sanitizeProfilePayload(body), {
    childName: str(student.name || profile.childName),
    classId: str(student.classId),
    className: str(student.className),
    updatedAt: nowIso(),
    updatedBy: str(user.id),
  });
  appendAssessmentAuditLog(db, user, "child_profile_updated", {
    entityType: "CHILD_PROFILE",
    entityId: profile.id,
    studentId: student.id,
    classId: student.classId,
    before,
    after: profile,
  });
  return profile;
}

function validateCurriculumLinks(db, user, student, body = {}) {
  const out = {
    curriculumWeekId: str(body.curriculumWeekId),
    weeklyPlanId: str(body.weeklyPlanId),
    curriculumItemId: str(body.curriculumItemId),
  };

  if (out.weeklyPlanId) {
    const detail = getWeeklyPlanDetail(db, out.weeklyPlanId, user);
    if (!classMatchesStudent(student, detail.plan.classId)) {
      const error = new Error("Selected weekly plan does not belong to this child's Early Years class.");
      error.status = 400;
      throw error;
    }
    out.curriculumWeekId = out.curriculumWeekId || str(detail.plan.curriculumWeekId);
  }

  if (out.curriculumWeekId) {
    const week = arr(db.curriculumWeeks).find((row) => str(row.id) === out.curriculumWeekId || str(row.code) === out.curriculumWeekId);
    if (!week) {
      const error = new Error("Selected curriculum week could not be found.");
      error.status = 400;
      throw error;
    }
    const term = arr(db.curriculumTerms).find((row) => str(row.id) === str(week.curriculumTermId));
    if (term && !classMatchesStudent(student, term.classId || term.className || term.classLevelCode)) {
      const error = new Error("Selected curriculum week does not match this child's Early Years class.");
      error.status = 400;
      throw error;
    }
    out.curriculumWeekId = week.id;
  }

  if (out.curriculumItemId) {
    const item = arr(db.curriculumItems).find((row) => str(row.id) === out.curriculumItemId || str(row.code) === out.curriculumItemId);
    if (!item) {
      const error = new Error("Selected curriculum item could not be found.");
      error.status = 400;
      throw error;
    }
    if (out.curriculumWeekId && str(item.curriculumWeekId) !== out.curriculumWeekId) {
      const error = new Error("Selected curriculum item does not belong to the selected curriculum week.");
      error.status = 400;
      throw error;
    }
    out.curriculumItemId = item.id;
  }

  return out;
}

function sanitizeObservationPayload(body = {}) {
  if (bool(body.safeguardingConcern)) {
    const error = new Error("Use the school's safeguarding reporting procedure immediately. Do not rely on the Learning Journal as the safeguarding record.");
    error.status = 400;
    throw error;
  }
  const eyfsArea = normalizeEnum(body.eyfsArea, EYFS_AREA_CODES, "");
  if (!eyfsArea) {
    const error = new Error("A valid EYFS area is required.");
    error.status = 400;
    throw error;
  }
  return {
    observationType: normalizeEnum(body.observationType, OBSERVATION_TYPES, "EVERYDAY_OBSERVATION"),
    observationDate: str(body.observationDate) || new Date().toISOString().slice(0, 10),
    observationTime: str(body.observationTime),
    context: str(body.context),
    provisionArea: str(body.provisionArea),
    provisionAreaId: str(body.provisionAreaId),
    weeklyEnhancementId: str(body.weeklyEnhancementId),
    practicalLifeActivityId: str(body.practicalLifeActivityId),
    eyfsArea,
    secondaryAreas: normalizeList(body.secondaryAreas, EYFS_AREA_CODES).filter((area) => area !== eyfsArea),
    amesDimensions: normalizeList(body.amesDimensions, DIMENSION_CODES),
    title: str(body.title),
    objectiveObservation: str(body.objectiveObservation),
    childWords: str(body.childWords),
    interpretation: str(body.interpretation),
    developmentalDescriptor: normalizeEnum(body.developmentalDescriptor, DEVELOPMENTAL_DESCRIPTORS, ""),
    nextStep: str(body.nextStep),
    supportRequired: str(body.supportRequired),
    challengeRequired: str(body.challengeRequired),
    followUpRequired: bool(body.followUpRequired),
    reviewDate: str(body.reviewDate),
    evidenceType: normalizeEnum(body.evidenceType, EVIDENCE_TYPES, "NONE"),
    evidenceReference: str(body.evidenceReference),
    evidenceAnnotation: str(body.evidenceAnnotation),
    possibleAccessConcern: bool(body.possibleAccessConcern),
    isSignificant: bool(body.isSignificant) || normalizeEnum(body.observationType, OBSERVATION_TYPES, "") === "SIGNIFICANT_OBSERVATION",
    isIncludedInLearningJournal: bool(body.isIncludedInLearningJournal),
    journalVisibility: normalizeEnum(body.journalVisibility, VISIBILITY, "INTERNAL"),
  };
}

function syncNextStepFromObservation(db, observation, user = {}) {
  if (!str(observation.nextStep)) return null;
  let row = arr(db.earlyYearsNextSteps).find((item) => str(item.linkedObservationId) === str(observation.id));
  const timestamp = nowIso();
  if (!row) {
    row = {
      id: randomId("eyfs-next-step"),
      studentId: observation.studentId,
      classId: observation.classId,
      academicSessionId: observation.academicSessionId,
      termId: observation.termId,
      eyfsArea: observation.eyfsArea,
      linkedObservationId: observation.id,
      description: observation.nextStep,
      status: "OPEN",
      reviewDate: observation.reviewDate,
      createdBy: str(user.id),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    db.earlyYearsNextSteps.unshift(row);
  } else {
    row.description = observation.nextStep;
    row.eyfsArea = observation.eyfsArea;
    row.reviewDate = observation.reviewDate;
    row.updatedAt = timestamp;
  }
  return row;
}

function journalEntryFromObservation(db, observation, user = {}) {
  let row = arr(db.earlyYearsLearningJournalEntries).find((item) => str(item.linkedObservationId) === str(observation.id));
  const timestamp = nowIso();
  const payload = {
    studentId: observation.studentId,
    academicSessionId: observation.academicSessionId,
    termId: observation.termId,
    classId: observation.classId,
    entryType: observation.observationType === "WORK_EVIDENCE" ? "WORK_SAMPLE" : "OBSERVATION",
    linkedObservationId: observation.id,
    title: observation.title || observation.context || "Learning observation",
    date: observation.observationDate,
    content: observation.objectiveObservation,
    teacherComment: observation.interpretation,
    childVoice: observation.childWords,
    parentVoice: "",
    eyfsAreas: [observation.eyfsArea, ...arr(observation.secondaryAreas)].filter(Boolean),
    amesDimensions: arr(observation.amesDimensions),
    developmentalDescriptor: observation.developmentalDescriptor,
    visibility: observation.journalVisibility || "INTERNAL",
    status: observation.journalVisibility === "PARENT_VISIBLE" ? "PUBLISHED" : "INTERNAL",
    isHighlighted: observation.isSignificant,
    displayOrder: 0,
    updatedAt: timestamp,
  };
  if (!row) {
    row = {
      id: randomId("eyfs-journal"),
      createdBy: str(user.id),
      createdAt: timestamp,
      ...payload,
    };
    db.earlyYearsLearningJournalEntries.unshift(row);
  } else {
    Object.assign(row, payload);
  }
  return row;
}

function createObservation(db, user = {}, body = {}) {
  ensureEarlyYearsAssessmentShape(db);
  const { student, classRow } = assertStudentAccess(db, user, body.studentId, { classId: body.classId, action: "observe" });
  if (!hasAnyRole(user, ASSESSMENT_ROLES)) {
    const error = new Error("Only authorised staff can create Early Years observations.");
    error.status = 403;
    throw error;
  }
  const payload = sanitizeObservationPayload(body);
  const links = validateCurriculumLinks(db, user, student, body);
  const timestamp = nowIso();
  const observation = {
    id: randomId("eyfs-observation"),
    studentId: str(student.id),
    studentName: str(student.name),
    teacherId: str(user.id),
    teacherName: str(user.name || user.username),
    classId: str(classRow.id),
    className: str(classRow.name),
    academicSessionId: str(body.academicSessionId || body.sessionId),
    termId: str(body.termId),
    ...links,
    ...payload,
    status: "DRAFT",
    reviewedAt: "",
    reviewedBy: "",
    moderationNote: "",
    visibility: payload.journalVisibility,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  db.earlyYearsObservations.unshift(observation);
  db.eyfsObservations.unshift(observation);
  syncNextStepFromObservation(db, observation, user);
  if (observation.isIncludedInLearningJournal) journalEntryFromObservation(db, observation, user);
  appendAssessmentAuditLog(db, user, "observation_created", {
    entityType: "OBSERVATION",
    entityId: observation.id,
    studentId: observation.studentId,
    classId: observation.classId,
    academicSessionId: observation.academicSessionId,
    termId: observation.termId,
  });
  return observation;
}

function findObservation(db, id) {
  return arr(db.earlyYearsObservations).find((row) => str(row.id) === str(id)) || null;
}

function assertObservationAccess(db, user, observation, action = "view") {
  if (!observation) {
    const error = new Error("Observation could not be found.");
    error.status = 404;
    throw error;
  }
  const { student, access } = assertStudentAccess(db, user, observation.studentId, { classId: observation.classId, action });
  if (access === "PARENT") {
    if (observation.journalVisibility !== "PARENT_VISIBLE" || observation.status === "DRAFT") {
      const error = new Error("This observation is internal and is not visible to parents.");
      error.status = 403;
      throw error;
    }
  }
  return { student, access };
}

function updateObservation(db, observationId, user = {}, body = {}) {
  ensureEarlyYearsAssessmentShape(db);
  const observation = findObservation(db, observationId);
  assertObservationAccess(db, user, observation, "edit");
  if (!hasAnyRole(user, ASSESSMENT_ROLES)) {
    const error = new Error("Only authorised staff can edit Early Years observations.");
    error.status = 403;
    throw error;
  }
  if (str(observation.status) !== "DRAFT") {
    const error = new Error("Only draft observations can be edited. Use review or next-step actions for completed records.");
    error.status = 409;
    throw error;
  }
  const before = { ...observation };
  const payload = sanitizeObservationPayload({ ...observation, ...body });
  const links = validateCurriculumLinks(db, user, observation, { ...observation, ...body });
  Object.assign(observation, links, payload, {
    visibility: payload.journalVisibility,
    updatedAt: nowIso(),
    updatedBy: str(user.id),
  });
  syncLegacyObservation(db, observation);
  syncNextStepFromObservation(db, observation, user);
  if (observation.isIncludedInLearningJournal) journalEntryFromObservation(db, observation, user);
  appendAssessmentAuditLog(db, user, "observation_updated", {
    entityType: "OBSERVATION",
    entityId: observation.id,
    studentId: observation.studentId,
    classId: observation.classId,
    before,
    after: observation,
  });
  return observation;
}

function syncLegacyObservation(db, observation) {
  const existing = arr(db.eyfsObservations).find((row) => str(row.id) === str(observation.id));
  if (existing) Object.assign(existing, observation);
  else db.eyfsObservations.unshift(observation);
}

function completeObservation(db, observationId, user = {}) {
  const observation = findObservation(db, observationId);
  assertObservationAccess(db, user, observation, "complete");
  if (!hasAnyRole(user, ASSESSMENT_ROLES)) {
    const error = new Error("Only authorised staff can complete Early Years observations.");
    error.status = 403;
    throw error;
  }
  const missing = [];
  if (!str(observation.objectiveObservation)) missing.push("what happened");
  if (!str(observation.interpretation)) missing.push("what this suggests");
  if (!str(observation.developmentalDescriptor)) missing.push("developmental descriptor");
  if (missing.length) {
    const error = new Error(`Complete these fields before marking complete: ${missing.join(", ")}.`);
    error.status = 400;
    throw error;
  }
  observation.status = "COMPLETE";
  observation.completedAt = nowIso();
  observation.updatedAt = nowIso();
  syncLegacyObservation(db, observation);
  syncNextStepFromObservation(db, observation, user);
  if (observation.isIncludedInLearningJournal) journalEntryFromObservation(db, observation, user);
  appendAssessmentAuditLog(db, user, "observation_completed", {
    entityType: "OBSERVATION",
    entityId: observation.id,
    studentId: observation.studentId,
    classId: observation.classId,
  });
  return observation;
}

function reviewObservation(db, observationId, user = {}, body = {}) {
  const observation = findObservation(db, observationId);
  assertObservationAccess(db, user, observation, "review");
  if (!hasAnyRole(user, LEADER_ROLES)) {
    const error = new Error("Only academic leaders or admins can moderate Early Years observations.");
    error.status = 403;
    throw error;
  }
  const descriptor = normalizeEnum(body.developmentalDescriptor || observation.developmentalDescriptor, DEVELOPMENTAL_DESCRIPTORS, observation.developmentalDescriptor);
  const beforeDescriptor = observation.developmentalDescriptor;
  observation.developmentalDescriptor = descriptor;
  observation.status = "REVIEWED";
  observation.reviewedAt = nowIso();
  observation.reviewedBy = str(user.id);
  observation.reviewedByName = str(user.name || user.username);
  observation.moderationNote = str(body.moderationNote || body.note);
  observation.updatedAt = nowIso();
  syncLegacyObservation(db, observation);
  if (observation.isIncludedInLearningJournal) journalEntryFromObservation(db, observation, user);
  appendAssessmentAuditLog(db, user, "observation_reviewed", {
    entityType: "OBSERVATION",
    entityId: observation.id,
    studentId: observation.studentId,
    classId: observation.classId,
    beforeDescriptor,
    afterDescriptor: descriptor,
    moderationNote: observation.moderationNote,
  });
  return observation;
}

function publishObservation(db, observationId, user = {}, body = {}) {
  const observation = findObservation(db, observationId);
  assertObservationAccess(db, user, observation, "publish");
  if (!hasAnyRole(user, ASSESSMENT_ROLES)) {
    const error = new Error("Only authorised staff can publish Early Years journal entries.");
    error.status = 403;
    throw error;
  }
  observation.isIncludedInLearningJournal = true;
  observation.journalVisibility = normalizeEnum(body.visibility || body.journalVisibility, VISIBILITY, "PARENT_VISIBLE");
  observation.visibility = observation.journalVisibility;
  observation.updatedAt = nowIso();
  syncLegacyObservation(db, observation);
  const entry = journalEntryFromObservation(db, observation, user);
  appendAssessmentAuditLog(db, user, "journal_visibility_changed", {
    entityType: "JOURNAL_ENTRY",
    entityId: entry.id,
    observationId: observation.id,
    studentId: observation.studentId,
    classId: observation.classId,
    visibility: entry.visibility,
  });
  return { observation, journalEntry: entry };
}

function listObservations(db, user = {}, filters = {}) {
  ensureEarlyYearsAssessmentShape(db);
  return arr(db.earlyYearsObservations).filter((observation) => {
    try {
      assertObservationAccess(db, user, observation, "view");
    } catch {
      return false;
    }
    if (filters.studentId && str(observation.studentId) !== str(filters.studentId)) return false;
    if (filters.classId && str(observation.classId) !== str(filters.classId)) return false;
    if (filters.termId && str(observation.termId) !== str(filters.termId)) return false;
    if (filters.eyfsArea && str(observation.eyfsArea) !== str(filters.eyfsArea)) return false;
    if (filters.observationType && str(observation.observationType) !== str(filters.observationType)) return false;
    if (filters.descriptor && str(observation.developmentalDescriptor) !== str(filters.descriptor)) return false;
    if (filters.status && str(observation.status) !== str(filters.status)) return false;
    return str(observation.status) !== "ARCHIVED" || str(filters.status) === "ARCHIVED";
  }).sort((a, b) => str(b.observationDate || b.createdAt).localeCompare(str(a.observationDate || a.createdAt)));
}

function sanitizeJournalPayload(body = {}) {
  const entryType = normalizeEnum(body.entryType, JOURNAL_ENTRY_TYPES, "OBSERVATION");
  return {
    entryType,
    linkedObservationId: str(body.linkedObservationId),
    linkedEvidenceId: str(body.linkedEvidenceId),
    title: str(body.title) || entryType.replace(/_/g, " "),
    date: str(body.date) || new Date().toISOString().slice(0, 10),
    content: str(body.content),
    teacherComment: str(body.teacherComment),
    childVoice: str(body.childVoice),
    parentVoice: str(body.parentVoice),
    eyfsAreas: normalizeList(body.eyfsAreas, EYFS_AREA_CODES),
    amesDimensions: normalizeList(body.amesDimensions, DIMENSION_CODES),
    developmentalDescriptor: normalizeEnum(body.developmentalDescriptor, DEVELOPMENTAL_DESCRIPTORS, ""),
    visibility: normalizeEnum(body.visibility, VISIBILITY, "INTERNAL"),
    isHighlighted: bool(body.isHighlighted),
    displayOrder: Number.isFinite(Number(body.displayOrder)) ? Number(body.displayOrder) : 0,
  };
}

function createJournalEntry(db, studentId, user = {}, body = {}) {
  ensureEarlyYearsAssessmentShape(db);
  const { student } = assertStudentAccess(db, user, studentId, { action: "journal" });
  if (!hasAnyRole(user, ASSESSMENT_ROLES)) {
    const error = new Error("Only authorised staff can create Early Years learning journal entries.");
    error.status = 403;
    throw error;
  }
  const payload = sanitizeJournalPayload(body);
  const timestamp = nowIso();
  const entry = {
    id: randomId("eyfs-journal"),
    studentId: str(student.id),
    academicSessionId: str(body.academicSessionId || body.sessionId),
    termId: str(body.termId),
    classId: str(student.classId),
    status: payload.visibility === "PARENT_VISIBLE" ? "PUBLISHED" : "INTERNAL",
    createdBy: str(user.id),
    createdByName: str(user.name || user.username),
    createdAt: timestamp,
    updatedAt: timestamp,
    ...payload,
  };
  db.earlyYearsLearningJournalEntries.unshift(entry);
  appendAssessmentAuditLog(db, user, "journal_entry_created", {
    entityType: "JOURNAL_ENTRY",
    entityId: entry.id,
    studentId: entry.studentId,
    classId: entry.classId,
    visibility: entry.visibility,
  });
  return entry;
}

function listJournalEntries(db, studentId, user = {}, filters = {}) {
  ensureEarlyYearsAssessmentShape(db);
  const { access } = assertStudentAccess(db, user, studentId, { action: "journal" });
  return arr(db.earlyYearsLearningJournalEntries).filter((entry) => {
    if (str(entry.studentId) !== str(studentId)) return false;
    if (access === "PARENT" && (entry.visibility !== "PARENT_VISIBLE" || entry.status !== "PUBLISHED")) return false;
    if (filters.termId && str(entry.termId) !== str(filters.termId)) return false;
    if (filters.entryType && str(entry.entryType) !== str(filters.entryType)) return false;
    if (filters.eyfsArea && !arr(entry.eyfsAreas).includes(str(filters.eyfsArea))) return false;
    return true;
  }).sort((a, b) => str(b.date || b.createdAt).localeCompare(str(a.date || a.createdAt)) || Number(a.displayOrder || 0) - Number(b.displayOrder || 0));
}

function sanitizeAreaSummaries(source = {}) {
  return EYFS_AREA_CODES.reduce((out, area) => {
    const row = source[area] || {};
    out[area] = {
      strengthsProgress: str(row.strengthsProgress),
      currentDevelopment: str(row.currentDevelopment),
      nextPriority: str(row.nextPriority),
      descriptor: normalizeEnum(row.descriptor, DEVELOPMENTAL_DESCRIPTORS, ""),
    };
    return out;
  }, {});
}

function saveDevelopmentSummary(db, studentId, user = {}, body = {}) {
  ensureEarlyYearsAssessmentShape(db);
  const { student } = assertStudentAccess(db, user, studentId, { action: "summary" });
  if (!hasAnyRole(user, ASSESSMENT_ROLES)) {
    const error = new Error("Only authorised staff can save Early Years development summaries.");
    error.status = 403;
    throw error;
  }
  const timestamp = nowIso();
  const summary = {
    id: randomId("eyfs-development-summary"),
    studentId: str(student.id),
    academicSessionId: str(body.academicSessionId || body.sessionId),
    termId: str(body.termId),
    classId: str(student.classId),
    summaryType: normalizeEnum(body.summaryType, SUMMARY_TYPES, "TERMLY"),
    areaSummaries: sanitizeAreaSummaries(body.areaSummaries || body.areas),
    overallLearningBehaviour: str(body.overallLearningBehaviour),
    practicalLifeIndependence: str(body.practicalLifeIndependence),
    characterResponsibility: str(body.characterResponsibility),
    parentPartnershipPriority: str(body.parentPartnershipPriority),
    teacherSummary: str(body.teacherSummary),
    createdBy: str(user.id),
    createdByName: str(user.name || user.username),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  db.earlyYearsDevelopmentSummaries.unshift(summary);
  createJournalEntry(db, student.id, user, {
    entryType: "DEVELOPMENT_SUMMARY",
    title: `${summary.summaryType.replace(/_/g, " ")} Development Summary`,
    date: timestamp.slice(0, 10),
    content: summary.teacherSummary,
    teacherComment: summary.overallLearningBehaviour,
    eyfsAreas: EYFS_AREA_CODES,
    visibility: "INTERNAL",
    academicSessionId: summary.academicSessionId,
    termId: summary.termId,
  });
  appendAssessmentAuditLog(db, user, "development_summary_created", {
    entityType: "DEVELOPMENT_SUMMARY",
    entityId: summary.id,
    studentId: summary.studentId,
    classId: summary.classId,
  });
  return summary;
}

function updateDevelopmentSummary(db, summaryId, user = {}, body = {}) {
  ensureEarlyYearsAssessmentShape(db);
  const summary = arr(db.earlyYearsDevelopmentSummaries).find((row) => str(row.id) === str(summaryId));
  if (!summary) {
    const error = new Error("Development summary could not be found.");
    error.status = 404;
    throw error;
  }
  assertStudentAccess(db, user, summary.studentId, { classId: summary.classId, action: "summary" });
  if (!hasAnyRole(user, ASSESSMENT_ROLES)) {
    const error = new Error("Only authorised staff can update Early Years development summaries.");
    error.status = 403;
    throw error;
  }
  const before = { ...summary };
  Object.assign(summary, {
    summaryType: normalizeEnum(body.summaryType || summary.summaryType, SUMMARY_TYPES, summary.summaryType),
    areaSummaries: sanitizeAreaSummaries(body.areaSummaries || body.areas || summary.areaSummaries),
    overallLearningBehaviour: str(body.overallLearningBehaviour || summary.overallLearningBehaviour),
    practicalLifeIndependence: str(body.practicalLifeIndependence || summary.practicalLifeIndependence),
    characterResponsibility: str(body.characterResponsibility || summary.characterResponsibility),
    parentPartnershipPriority: str(body.parentPartnershipPriority || summary.parentPartnershipPriority),
    teacherSummary: str(body.teacherSummary || summary.teacherSummary),
    updatedAt: nowIso(),
    updatedBy: str(user.id),
  });
  appendAssessmentAuditLog(db, user, "development_summary_updated", {
    entityType: "DEVELOPMENT_SUMMARY",
    entityId: summary.id,
    studentId: summary.studentId,
    classId: summary.classId,
    before,
    after: summary,
  });
  return summary;
}

function getDevelopmentOverview(db, studentId, user = {}, filters = {}) {
  ensureEarlyYearsAssessmentShape(db);
  assertStudentAccess(db, user, studentId, { action: "development" });
  const observations = listObservations(db, user, { studentId, termId: filters.termId }).filter((row) => ["COMPLETE", "REVIEWED"].includes(str(row.status)));
  const nextSteps = listNextSteps(db, user, { studentId, status: "OPEN" });
  const areaSummary = EYFS_AREA_CODES.map((area) => {
    const areaObservations = observations.filter((row) => row.eyfsArea === area || arr(row.secondaryAreas).includes(area));
    const sorted = [...areaObservations].sort((a, b) => str(b.observationDate || b.updatedAt).localeCompare(str(a.observationDate || a.updatedAt)));
    const latest = sorted[0] || null;
    const priority = nextSteps.find((row) => row.eyfsArea === area) || null;
    return {
      eyfsArea: area,
      latestDescriptor: latest?.developmentalDescriptor || "",
      recentEvidenceCount: areaObservations.length,
      currentPriority: priority?.description || "",
      lastReviewedDate: latest?.reviewedAt || latest?.updatedAt || latest?.observationDate || "",
    };
  });
  return {
    areaSummary,
    observations,
    nextSteps,
    summaries: arr(db.earlyYearsDevelopmentSummaries).filter((row) => str(row.studentId) === str(studentId)),
  };
}

function listNextSteps(db, user = {}, filters = {}) {
  ensureEarlyYearsAssessmentShape(db);
  return arr(db.earlyYearsNextSteps).filter((step) => {
    try {
      assertStudentAccess(db, user, step.studentId, { classId: step.classId, action: "next-step" });
    } catch {
      return false;
    }
    if (filters.studentId && str(step.studentId) !== str(filters.studentId)) return false;
    if (filters.classId && str(step.classId) !== str(filters.classId)) return false;
    if (filters.eyfsArea && str(step.eyfsArea) !== str(filters.eyfsArea)) return false;
    if (filters.status && str(step.status) !== str(filters.status)) return false;
    return true;
  }).sort((a, b) => str(a.reviewDate || a.createdAt).localeCompare(str(b.reviewDate || b.createdAt)));
}

function updateNextStep(db, nextStepId, user = {}, body = {}) {
  ensureEarlyYearsAssessmentShape(db);
  const step = arr(db.earlyYearsNextSteps).find((row) => str(row.id) === str(nextStepId));
  if (!step) {
    const error = new Error("Next step could not be found.");
    error.status = 404;
    throw error;
  }
  assertStudentAccess(db, user, step.studentId, { classId: step.classId, action: "next-step" });
  if (!hasAnyRole(user, ASSESSMENT_ROLES)) {
    const error = new Error("Only authorised staff can update Early Years next steps.");
    error.status = 403;
    throw error;
  }
  const before = { ...step };
  Object.assign(step, {
    description: body.description !== undefined ? str(body.description) : step.description,
    status: normalizeEnum(body.status || step.status, NEXT_STEP_STATUSES, step.status),
    reviewNote: body.reviewNote !== undefined ? str(body.reviewNote) : step.reviewNote,
    reviewDate: body.reviewDate !== undefined ? str(body.reviewDate) : step.reviewDate,
    updatedAt: nowIso(),
    updatedBy: str(user.id),
  });
  appendAssessmentAuditLog(db, user, "next_step_updated", {
    entityType: "NEXT_STEP",
    entityId: step.id,
    studentId: step.studentId,
    classId: step.classId,
    before,
    after: step,
  });
  return step;
}

function createParentContribution(db, user = {}, body = {}) {
  ensureEarlyYearsAssessmentShape(db);
  const { student } = assertStudentAccess(db, user, body.studentId, { action: "parent-contribution" });
  if (!hasAnyRole(user, PARENT_ROLES) && !hasAnyRole(user, ASSESSMENT_ROLES)) {
    const error = new Error("Only parents or authorised staff can create parent contributions.");
    error.status = 403;
    throw error;
  }
  const timestamp = nowIso();
  const staffCreated = hasAnyRole(user, ASSESSMENT_ROLES);
  const contribution = {
    id: randomId("eyfs-parent-contribution"),
    studentId: str(student.id),
    date: str(body.date) || timestamp.slice(0, 10),
    parentId: hasAnyRole(user, PARENT_ROLES) ? str(user.id) : str(body.parentId),
    parentName: hasAnyRole(user, PARENT_ROLES) ? str(user.name || user.username) : str(body.parentName),
    title: str(body.title) || "Parent contribution",
    contribution: str(body.contribution),
    homeLearningObservation: str(body.homeLearningObservation),
    photoReference: str(body.photoReference),
    teacherResponse: "",
    status: staffCreated ? "APPROVED" : "SUBMITTED",
    createdBy: str(user.id),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  db.earlyYearsParentContributions.unshift(contribution);
  if (staffCreated) publishParentContributionToJournal(db, contribution, user);
  appendAssessmentAuditLog(db, user, "parent_contribution_created", {
    entityType: "PARENT_CONTRIBUTION",
    entityId: contribution.id,
    studentId: contribution.studentId,
    status: contribution.status,
  });
  return contribution;
}

function publishParentContributionToJournal(db, contribution, user = {}) {
  const student = findStudent(db, contribution.studentId);
  if (!student) return null;
  const entry = {
    id: randomId("eyfs-journal"),
    studentId: str(student.id),
    academicSessionId: "",
    termId: "",
    classId: str(student.classId),
    entryType: "PARENT_CONTRIBUTION",
    linkedObservationId: "",
    linkedEvidenceId: contribution.id,
    title: contribution.title,
    date: contribution.date,
    content: contribution.contribution,
    teacherComment: contribution.teacherResponse,
    childVoice: "",
    parentVoice: contribution.homeLearningObservation,
    eyfsAreas: [],
    amesDimensions: [],
    developmentalDescriptor: "",
    visibility: "PARENT_VISIBLE",
    status: "PUBLISHED",
    isHighlighted: false,
    displayOrder: 0,
    createdBy: str(user.id),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  db.earlyYearsLearningJournalEntries.unshift(entry);
  return entry;
}

function reviewParentContribution(db, contributionId, user = {}, body = {}) {
  ensureEarlyYearsAssessmentShape(db);
  const contribution = arr(db.earlyYearsParentContributions).find((row) => str(row.id) === str(contributionId));
  if (!contribution) {
    const error = new Error("Parent contribution could not be found.");
    error.status = 404;
    throw error;
  }
  assertStudentAccess(db, user, contribution.studentId, { action: "parent-contribution-review" });
  if (!hasAnyRole(user, ASSESSMENT_ROLES)) {
    const error = new Error("Only authorised staff can review parent contributions.");
    error.status = 403;
    throw error;
  }
  contribution.teacherResponse = str(body.teacherResponse);
  contribution.status = normalizeEnum(body.status, ["APPROVED", "RETURNED", "ARCHIVED"], "APPROVED");
  contribution.reviewedAt = nowIso();
  contribution.reviewedBy = str(user.id);
  contribution.updatedAt = nowIso();
  let journalEntry = null;
  if (contribution.status === "APPROVED") journalEntry = publishParentContributionToJournal(db, contribution, user);
  appendAssessmentAuditLog(db, user, "parent_contribution_reviewed", {
    entityType: "PARENT_CONTRIBUTION",
    entityId: contribution.id,
    studentId: contribution.studentId,
    status: contribution.status,
  });
  return { contribution, journalEntry };
}

function listParentContributions(db, user = {}, filters = {}) {
  ensureEarlyYearsAssessmentShape(db);
  return arr(db.earlyYearsParentContributions).filter((row) => {
    try {
      assertStudentAccess(db, user, row.studentId, { action: "parent-contribution" });
    } catch {
      return false;
    }
    if (filters.studentId && str(row.studentId) !== str(filters.studentId)) return false;
    if (filters.status && str(row.status) !== str(filters.status)) return false;
    if (hasAnyRole(user, PARENT_ROLES) && str(row.parentId) !== str(user.id)) return false;
    return true;
  }).sort((a, b) => str(b.date || b.createdAt).localeCompare(str(a.date || a.createdAt)));
}

function evidenceCoverageCheck(db, user = {}, filters = {}) {
  ensureEarlyYearsAssessmentShape(db);
  const students = listAccessibleStudents(db, user, filters);
  return students.map((student) => {
    const observations = arr(db.earlyYearsObservations).filter((row) => str(row.studentId) === str(student.id));
    const significant = observations.filter((row) => row.isSignificant);
    const summaries = arr(db.earlyYearsDevelopmentSummaries).filter((row) => str(row.studentId) === str(student.id));
    const sorted = [...observations].sort((a, b) => str(b.observationDate || b.createdAt).localeCompare(str(a.observationDate || a.createdAt)));
    const flags = [];
    if (!observations.length) flags.push("NO_EVIDENCE_YET");
    if (!significant.length) flags.push("NO_RECENT_SIGNIFICANT_EVIDENCE");
    if (!summaries.length) flags.push("NO_DEVELOPMENT_SUMMARY");
    return {
      studentId: student.id,
      studentName: student.name,
      classId: student.classId,
      className: student.className,
      evidenceCount: observations.length,
      significantEvidenceCount: significant.length,
      lastEvidenceDate: sorted[0]?.observationDate || sorted[0]?.createdAt || "",
      hasDevelopmentSummary: summaries.length > 0,
      flags,
      label: flags.length ? "Evidence coverage check" : "Evidence present",
    };
  }).filter((row) => !filters.onlyGaps || row.flags.length);
}

function buildJournalPrintHtml(db, studentId, user = {}, filters = {}) {
  const { student } = assertStudentAccess(db, user, studentId, { action: "journal-print" });
  const profile = getOrCreateChildProfile(db, student, user);
  const entries = listJournalEntries(db, studentId, user, filters)
    .filter((entry) => entry.visibility === "PARENT_VISIBLE" || entry.isHighlighted || entry.entryType === "DEVELOPMENT_SUMMARY")
    .slice(0, 30);
  const summaries = arr(db.earlyYearsDevelopmentSummaries).filter((row) => str(row.studentId) === str(studentId));
  const latestSummary = summaries.sort((a, b) => str(b.updatedAt || b.createdAt).localeCompare(str(a.updatedAt || a.createdAt)))[0] || null;
  const entryHtml = entries.map((entry) => `
    <section>
      <h2>${escapeHtml(entry.title)}</h2>
      <p><strong>${escapeHtml(entry.date)}</strong> - ${escapeHtml(entry.entryType.replace(/_/g, " "))}</p>
      <p>${escapeHtml(entry.content).replace(/\n/g, "<br>")}</p>
      ${entry.childVoice ? `<p><strong>Child Voice:</strong> ${escapeHtml(entry.childVoice)}</p>` : ""}
      ${entry.parentVoice ? `<p><strong>Parent Voice:</strong> ${escapeHtml(entry.parentVoice)}</p>` : ""}
    </section>
  `).join("");
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Angel Montessori Learning Journal Summary</title>
  <style>
    body { font-family: Arial, sans-serif; color: #102a4c; margin: 28px; line-height: 1.45; }
    header { border-bottom: 3px solid #1d5fa9; padding-bottom: 16px; margin-bottom: 18px; }
    h1, h2 { color: #173a70; margin: 0 0 8px; }
    h1 { font-size: 28px; }
    h2 { font-size: 17px; border-bottom: 1px solid #d8e4f2; padding-bottom: 5px; }
    .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 14px 0; }
    .meta div, section { border: 1px solid #d8e4f2; border-radius: 10px; padding: 10px; }
    section { margin-bottom: 10px; break-inside: avoid; }
    @media print { body { margin: 18mm; } .no-print { display: none; } }
  </style>
</head>
<body>
  <button class="no-print" onclick="window.print()">Print / Save PDF</button>
  <header>
    <div>Angel Montessori School</div>
    <h1>Early Years Learning Journal Summary</h1>
  </header>
  <div class="meta">
    <div><strong>Child</strong><br>${escapeHtml(profile.childName || student.name)}</div>
    <div><strong>Class</strong><br>${escapeHtml(student.className)}</div>
    <div><strong>Date</strong><br>${escapeHtml(new Date().toISOString().slice(0, 10))}</div>
  </div>
  ${latestSummary ? `<section><h2>Development Summary</h2><p>${escapeHtml(latestSummary.teacherSummary || "").replace(/\n/g, "<br>")}</p><p>${escapeHtml(latestSummary.overallLearningBehaviour || "")}</p></section>` : ""}
  ${entryHtml || "<section><h2>Learning Journal</h2><p>No selected journal highlights are available for this print view.</p></section>"}
  <section><h2>Next Priorities</h2><p>${escapeHtml(latestSummary?.parentPartnershipPriority || "Continue to observe, respond and review next steps.")}</p></section>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = {
  ASSESSMENT_ROLES,
  DEVELOPMENTAL_DESCRIPTORS,
  DIMENSION_CODES,
  EVIDENCE_TYPES,
  EYFS_AREA_CODES,
  JOURNAL_ENTRY_TYPES,
  LEADER_ROLES,
  NEXT_STEP_STATUSES,
  OBSERVATION_STATUSES,
  OBSERVATION_TYPES,
  PARENT_ROLES,
  SUMMARY_TYPES,
  VISIBILITY,
  appendAssessmentAuditLog,
  buildJournalPrintHtml,
  completeObservation,
  createJournalEntry,
  createObservation,
  createParentContribution,
  ensureEarlyYearsAssessmentShape,
  evidenceCoverageCheck,
  findObservation,
  getDevelopmentOverview,
  getOrCreateChildProfile,
  listAccessibleStudents,
  listJournalEntries,
  listNextSteps,
  listObservations,
  listParentContributions,
  publishObservation,
  reviewObservation,
  reviewParentContribution,
  saveDevelopmentSummary,
  updateChildProfile,
  updateDevelopmentSummary,
  updateNextStep,
  updateObservation,
};
