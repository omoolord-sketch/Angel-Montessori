const { randomUUID } = require("crypto");
const {
  assertEarlyYearsClassAccess,
  ensureEarlyYearsCurriculumShape,
  findAcademicSession,
  findAcademicTerm,
  listAccessibleEarlyYearsClasses,
  str,
  teacherAssignedClassIds,
} = require("./earlyYearsCurriculum");
const { ensureEarlyYearsPlanningShape, getWeeklyPlanDetail } = require("./earlyYearsPlanning");
const { ensureEarlyYearsAssessmentShape } = require("./earlyYearsAssessment");
const { ensureEarlyYearsLiteracyShape } = require("./earlyYearsLiteracy");
const { ensureEarlyYearsEnvironmentShape } = require("./earlyYearsEnvironment");
const { getApprovedClassConfig, normalizeAcademicKey } = require("./academicSystems");

const LEADER_ROLES = ["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER"];
const INCLUSION_STAFF_ROLES = ["TEACHER", ...LEADER_ROLES];
const PARENT_ROLES = ["PARENT"];
const INCLUSION_ROLES = [...new Set([...INCLUSION_STAFF_ROLES, ...PARENT_ROLES])];

const SUPPORT_LEVELS = ["UNIVERSAL", "TARGETED", "INDIVIDUALISED"];
const SUPPORT_PROFILE_STATUSES = ["MONITORING", "ACTIVE_SUPPORT", "UNDER_REVIEW", "REFERRED", "CLOSED", "ARCHIVED"];
const CONCERN_AREAS = [
  "COMMUNICATION_LANGUAGE",
  "SOCIAL_INTERACTION",
  "EMOTIONAL_REGULATION",
  "PHYSICAL_MOTOR",
  "SENSORY_ACCESS",
  "LITERACY",
  "MATHEMATICS",
  "ATTENTION_ENGAGEMENT",
  "INDEPENDENCE_SELF_CARE",
  "HEARING_ACCESS",
  "VISION_ACCESS",
  "MEDICAL_ACCESS",
  "HOME_LANGUAGE_ACCESS",
  "BEHAVIOUR_SUPPORT",
  "OTHER",
];
const CONCERN_STATUSES = ["NOTED", "MONITOR", "SUPPORT_REQUIRED", "REVIEW_REQUIRED", "REFERRED", "RESOLVED"];
const PARENT_DISCUSSION_STATUSES = ["NOT_YET_DISCUSSED", "PLANNED", "DISCUSSED", "NOT_REQUIRED"];
const SUPPORT_PLAN_STATUSES = ["DRAFT", "ACTIVE", "UNDER_REVIEW", "UPDATED", "COMPLETED", "ARCHIVED"];
const REVIEW_OUTCOMES = ["CONTINUE", "ADAPT", "REDUCE_SUPPORT", "INCREASE_SUPPORT", "CLOSE", "REFER_FOR_FURTHER_REVIEW"];
const REFERRAL_STATUSES = ["PROPOSED", "AWAITING_PARENT_DISCUSSION", "SUBMITTED", "AWAITING_RESPONSE", "ADVICE_RECEIVED", "CLOSED"];
const CONSENT_STATUSES = ["NOT_REQUIRED", "PENDING", "GIVEN", "DECLINED", "WITHDRAWN"];
const MEETING_TYPES = ["STARTING_POINT", "PROGRESS_REVIEW", "SUPPORT_REVIEW", "TRANSITION", "PARENT_REQUEST", "SCHOOL_REQUEST", "OTHER"];
const ACKNOWLEDGEMENT_STATUSES = ["AWAITING_RESPONSE", "ACKNOWLEDGED", "COMMENTED"];
const VISIBILITY_LEVELS = ["TEACHING_TEAM", "LEADERSHIP", "PARENT_VISIBLE", "RESTRICTED"];
const TRANSITION_STATUSES = ["DRAFT", "ACTIVE", "HANDED_OVER", "REVIEWED", "ARCHIVED"];

const INCLUSION_CYCLE = ["NOTICE", "UNDERSTAND", "ADAPT", "SUPPORT", "REVIEW", "REFER_WHERE_APPROPRIATE"];
const PARENT_PARTNERSHIP_CYCLE = ["INFORM", "LISTEN", "COLLABORATE", "SUPPORT", "REVIEW"];
const TRANSITION_CYCLE = ["PREPARE", "FAMILIARISE", "TRANSFER_INFORMATION", "SUPPORT", "REVIEW"];

const DIAGNOSTIC_TERMS = [
  "autism",
  "adhd",
  "dyslexia",
  "developmental disorder",
  "speech disorder",
  "learning disability",
  "autistic",
  "attention deficit",
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

function bool(value) {
  return value === true || String(value || "").toLowerCase() === "true";
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

function containsDiagnosticTerm(value) {
  const lower = str(value).toLowerCase();
  return DIAGNOSTIC_TERMS.some((term) => lower.includes(term));
}

function rejectSafeguardingOnlyRecord(body = {}) {
  if (bool(body.safeguardingConcern) || containsAny([body.objectiveEvidence, body.reason, body.notes, body.discussionSummary], ["abuse", "neglect", "immediate danger", "safeguarding"])) {
    const error = new Error("Use the school safeguarding procedure immediately. Do not rely on SEND/inclusion records as the safeguarding report.");
    error.status = 400;
    throw error;
  }
}

function containsAny(values = [], terms = []) {
  const lower = values.map(str).join(" ").toLowerCase();
  return terms.some((term) => lower.includes(term));
}

function assertNotCasualDiagnosis(body = {}, options = {}) {
  const text = [
    body.context,
    body.concernArea,
    body.objectiveEvidence,
    body.durationOrPattern,
    body.strategiesAlreadyTried,
    body.impactOnParticipation,
    body.priorityNeed,
    body.desiredOutcome,
    body.reason,
    body.evidenceSummary,
    body.professionalAdvice,
    body.schoolAction,
    body.notes,
  ].map(str).join(" ");
  if (!containsDiagnosticTerm(text)) return;
  if (options.allowFormalDiagnosis && bool(body.formalDiagnosisRecorded) && str(body.diagnosisSource)) return;
  const error = new Error("Teacher observation is not diagnosis. Observe carefully, refer appropriately, and do not record casual diagnostic labels.");
  error.status = 400;
  throw error;
}

function ensureEarlyYearsInclusionShape(db) {
  ensureEarlyYearsCurriculumShape(db);
  ensureEarlyYearsPlanningShape(db);
  ensureEarlyYearsAssessmentShape(db);
  ensureEarlyYearsLiteracyShape(db);
  ensureEarlyYearsEnvironmentShape(db);
  let mutated = false;
  [
    "earlyYearsSupportProfiles",
    "earlyYearsSupportConcerns",
    "earlyYearsSupportPlans",
    "earlyYearsSupportPlanReviews",
    "earlyYearsSupportStrategies",
    "earlyYearsReferralRecords",
    "earlyYearsProfessionalRecords",
    "earlyYearsParentPartnershipProfiles",
    "earlyYearsParentPartnershipMeetings",
    "earlyYearsParentSupportSummaries",
    "earlyYearsConsentRecords",
    "earlyYearsTransitionSupportPlans",
    "earlyYearsInclusionAuditLogs",
  ].forEach((key) => {
    if (!Array.isArray(db[key])) {
      db[key] = [];
      mutated = true;
    }
  });
  return { mutated };
}

function appendInclusionAuditLog(db, actor = {}, action = "", details = {}) {
  if (!Array.isArray(db.earlyYearsInclusionAuditLogs)) db.earlyYearsInclusionAuditLogs = [];
  db.earlyYearsInclusionAuditLogs.unshift({
    id: randomId("eyfs-inclusion-audit"),
    action: str(action),
    userId: str(actor.id || actor.username),
    userName: str(actor.name || actor.username),
    userRole: roleOf(actor),
    studentId: str(details.studentId),
    classId: str(details.classId),
    entityType: str(details.entityType),
    entityId: str(details.entityId),
    visibility: str(details.visibility),
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

function classMatchesStudent(student, classRef) {
  if (!classRef) return true;
  const approved = getApprovedClassConfig(classRef);
  const studentApproved = getApprovedClassConfig(student?.classId || student?.className);
  if (approved?.id && studentApproved?.id) return str(approved.id) === str(studentApproved.id);
  const classKey = normalizeAcademicKey(classRef);
  return [student?.classId, student?.className].some((item) => normalizeAcademicKey(item) === classKey);
}

function isEarlyYearsStudent(student) {
  return getApprovedClassConfig(student?.classId || student?.className)?.academicSystem === "BRITISH_EYFS";
}

function assertStaffStudentAccess(db, user, student, action = "view") {
  const classRow = assertEarlyYearsClassAccess(db, user, student?.classId || student?.className);
  if (isLeader(user)) return classRow;
  if (roleOf(user) !== "TEACHER") {
    const error = new Error("You do not have access to Early Years inclusion records.");
    error.status = 403;
    throw error;
  }
  const assigned = teacherAssignedClassIds(db, user);
  if (assigned.has(str(classRow.id)) || assigned.has(str(student?.classId))) return classRow;
  const error = new Error(action === "view"
    ? "You do not have access to this child's inclusion records."
    : "You cannot manage inclusion records for an unassigned child.");
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
  if (!isEarlyYearsStudent(student)) {
    const error = new Error("Early Years inclusion profiles are only available for Crèche, Nursery, and Reception children.");
    error.status = 400;
    throw error;
  }
  if (hasAnyRole(user, INCLUSION_STAFF_ROLES)) {
    const classRow = assertStaffStudentAccess(db, user, student, options.action || "view");
    return { student, classRow, access: "STAFF" };
  }
  if (hasAnyRole(user, PARENT_ROLES)) {
    if (!parentStudentIds(user).has(str(student.id))) {
      const error = new Error("Parents can only view approved support information for their own child.");
      error.status = 403;
      throw error;
    }
    return { student, classRow: getApprovedClassConfig(student.classId || student.className), access: "PARENT" };
  }
  const error = new Error("Student access to Early Years support profiles is not enabled.");
  error.status = 403;
  throw error;
}

function canSeeVisibility(user, visibility) {
  const level = normalizeEnum(visibility, VISIBILITY_LEVELS, "TEACHING_TEAM");
  if (isLeader(user)) return true;
  if (roleOf(user) === "TEACHER") return ["TEACHING_TEAM", "PARENT_VISIBLE"].includes(level);
  if (roleOf(user) === "PARENT") return level === "PARENT_VISIBLE";
  return false;
}

function assertRecordVisibility(user, record, message = "This inclusion record is restricted.") {
  if (!canSeeVisibility(user, record?.visibility)) {
    const error = new Error(message);
    error.status = 403;
    throw error;
  }
}

function sanitizeRecordForUser(user, record) {
  if (!record || roleOf(user) !== "PARENT") return record;
  const clone = { ...record };
  [
    "restrictedNotes",
    "diagnosisDetails",
    "diagnosisSource",
    "existingProfessionalSupport",
    "professionalAdvice",
    "schoolAction",
    "teacherContribution",
    "teacherJudgement",
    "createdBy",
    "updatedBy",
    "approvedBy",
  ].forEach((key) => {
    if (key in clone) delete clone[key];
  });
  return clone;
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

function validateObservationLinks(db, user, student, ids = []) {
  const out = [];
  ids.forEach((id) => {
    const value = str(id);
    if (!value) return;
    const observation = arr(db.earlyYearsObservations).find((row) => str(row.id) === value);
    if (!observation) {
      const error = new Error("Linked observation could not be found.");
      error.status = 404;
      throw error;
    }
    if (str(observation.studentId) !== str(student.id)) {
      const error = new Error("Linked observation belongs to another child.");
      error.status = 400;
      throw error;
    }
    assertStaffStudentAccess(db, user, student, "view");
    out.push(value);
  });
  return out;
}

function validateEnvironmentLinks(db, user, classId, body = {}) {
  const links = {
    provisionAreaId: str(body.provisionAreaId),
    environmentAdjustmentId: str(body.environmentAdjustmentId || body.weeklyEnhancementId),
    resourceId: str(body.resourceId),
  };
  if (links.provisionAreaId) {
    const area = arr(db.earlyYearsProvisionAreas).find((row) => str(row.id) === links.provisionAreaId);
    if (!area || str(area.classId) !== str(classId)) {
      const error = new Error("Linked provision area does not belong to this class.");
      error.status = 400;
      throw error;
    }
  }
  if (links.environmentAdjustmentId) {
    const enhancement = arr(db.earlyYearsWeeklyProvisionEnhancements).find((row) => str(row.id) === links.environmentAdjustmentId);
    if (!enhancement || str(enhancement.classId) !== str(classId)) {
      const error = new Error("Linked environment adjustment does not belong to this class.");
      error.status = 400;
      throw error;
    }
  }
  if (links.resourceId) {
    const resource = arr(db.earlyYearsResources).find((row) => str(row.id) === links.resourceId);
    if (!resource || (resource.classId && str(resource.classId) !== str(classId))) {
      const error = new Error("Linked resource does not belong to this class.");
      error.status = 400;
      throw error;
    }
  }
  return links;
}

function validateWeeklyPlanReference(db, user, student, weeklyPlanId) {
  const id = str(weeklyPlanId);
  if (!id) return "";
  const detail = getWeeklyPlanDetail(db, id, user);
  if (!classMatchesStudent(student, detail.plan.classId)) {
    const error = new Error("Weekly plan does not belong to this child's class.");
    error.status = 400;
    throw error;
  }
  return id;
}

function getOrCreateParentPartnershipProfile(db, student, user = {}) {
  let profile = arr(db.earlyYearsParentPartnershipProfiles).find((row) => str(row.studentId) === str(student.id));
  if (!profile) {
    const timestamp = nowIso();
    profile = {
      id: randomId("eyfs-family-profile"),
      studentId: str(student.id),
      studentName: str(student.name),
      classId: str(student.classId),
      preferredContactMethod: "",
      preferredCommunicationLanguage: "",
      keyFamilyContacts: [],
      parentPriorities: "",
      parentConcerns: "",
      familyStrengths: "",
      agreedActions: "",
      homeLanguages: [],
      languagesUnderstood: [],
      languagesSpoken: [],
      interpreterSupportNeeds: "",
      createdBy: str(user.id || user.username),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    db.earlyYearsParentPartnershipProfiles.unshift(profile);
  }
  return profile;
}

function sanitizePartnershipPayload(body = {}) {
  return {
    preferredContactMethod: str(body.preferredContactMethod),
    preferredCommunicationLanguage: str(body.preferredCommunicationLanguage),
    keyFamilyContacts: textList(body.keyFamilyContacts),
    parentPriorities: str(body.parentPriorities),
    parentConcerns: str(body.parentConcerns),
    familyStrengths: str(body.familyStrengths),
    agreedActions: str(body.agreedActions),
    homeLanguages: textList(body.homeLanguages),
    languagesUnderstood: textList(body.languagesUnderstood),
    languagesSpoken: textList(body.languagesSpoken),
    interpreterSupportNeeds: str(body.interpreterSupportNeeds),
  };
}

function updateParentPartnershipProfile(db, user, studentId, body = {}) {
  ensureEarlyYearsInclusionShape(db);
  const { student } = assertStudentAccess(db, user, studentId, { action: "family partnership" });
  if (!hasAnyRole(user, INCLUSION_STAFF_ROLES)) {
    const error = new Error("Only authorised staff can update parent partnership records.");
    error.status = 403;
    throw error;
  }
  const profile = getOrCreateParentPartnershipProfile(db, student, user);
  const before = { ...profile };
  Object.assign(profile, sanitizePartnershipPayload(body), {
    studentName: str(student.name || profile.studentName),
    classId: str(student.classId),
    updatedBy: str(user.id || user.username),
    updatedAt: nowIso(),
  });
  appendInclusionAuditLog(db, user, "parent_partnership_profile_updated", {
    entityType: "PARENT_PARTNERSHIP_PROFILE",
    entityId: profile.id,
    studentId: student.id,
    classId: student.classId,
    before,
    after: profile,
  });
  return profile;
}

function sanitizeSupportProfilePayload(body = {}) {
  assertNotCasualDiagnosis(body, { allowFormalDiagnosis: true });
  if (bool(body.formalDiagnosisRecorded) && (!str(body.diagnosisDetails) || !str(body.diagnosisSource))) {
    const error = new Error("Formal diagnosis details require an authorised source. Teacher observation is not diagnosis.");
    error.status = 400;
    throw error;
  }
  return {
    supportLevel: normalizeEnum(body.supportLevel, SUPPORT_LEVELS, "UNIVERSAL"),
    primaryConcernArea: normalizeEnum(body.primaryConcernArea, CONCERN_AREAS, ""),
    additionalConcernAreas: textList(body.additionalConcernAreas).map((item) => normalizeEnum(item, CONCERN_AREAS, "OTHER")),
    strengths: str(body.strengths),
    interests: str(body.interests),
    whatHelps: str(body.whatHelps),
    whatMakesParticipationDifficult: str(body.whatMakesParticipationDifficult),
    parentPerspective: str(body.parentPerspective),
    childVoice: str(body.childVoice),
    childVoiceMode: str(body.childVoiceMode || "OBSERVED"),
    homeLanguageInformation: str(body.homeLanguageInformation),
    existingProfessionalSupport: str(body.existingProfessionalSupport),
    formalDiagnosisRecorded: bool(body.formalDiagnosisRecorded),
    diagnosisDetails: bool(body.formalDiagnosisRecorded) ? str(body.diagnosisDetails) : "",
    diagnosisSource: bool(body.formalDiagnosisRecorded) ? str(body.diagnosisSource) : "",
    status: normalizeEnum(body.status, SUPPORT_PROFILE_STATUSES, "MONITORING"),
    nextReviewDate: str(body.nextReviewDate || body.reviewDate),
    visibility: normalizeEnum(body.visibility, VISIBILITY_LEVELS, "TEACHING_TEAM"),
  };
}

function createSupportProfile(db, user, body = {}) {
  ensureEarlyYearsInclusionShape(db);
  validateSessionTerm(db, body);
  const { student, classRow } = assertStudentAccess(db, user, body.studentId, { classId: body.classId, action: "create" });
  if (!hasAnyRole(user, INCLUSION_STAFF_ROLES)) {
    const error = new Error("Only authorised staff can create support profiles.");
    error.status = 403;
    throw error;
  }
  const existing = arr(db.earlyYearsSupportProfiles).find((row) => str(row.studentId) === str(student.id) && row.status !== "ARCHIVED");
  if (existing) return existing;
  const timestamp = nowIso();
  const profile = {
    id: randomId("eyfs-support-profile"),
    studentId: str(student.id),
    studentName: str(student.name),
    classId: str(classRow.id),
    className: str(classRow.name),
    academicSessionId: str(body.academicSessionId || body.sessionId),
    ...sanitizeSupportProfilePayload(body),
    createdBy: str(user.id || user.username),
    createdAt: timestamp,
    updatedAt: timestamp,
    reviewedAt: "",
  };
  db.earlyYearsSupportProfiles.unshift(profile);
  getOrCreateParentPartnershipProfile(db, student, user);
  appendInclusionAuditLog(db, user, "support_profile_created", {
    entityType: "SUPPORT_PROFILE",
    entityId: profile.id,
    studentId: profile.studentId,
    classId: profile.classId,
    visibility: profile.visibility,
    after: profile,
  });
  return profile;
}

function updateSupportProfile(db, user, profileId, body = {}) {
  ensureEarlyYearsInclusionShape(db);
  const profile = arr(db.earlyYearsSupportProfiles).find((row) => str(row.id) === str(profileId));
  if (!profile) {
    const error = new Error("Support profile could not be found.");
    error.status = 404;
    throw error;
  }
  assertStudentAccess(db, user, profile.studentId, { action: "update" });
  if (!hasAnyRole(user, INCLUSION_STAFF_ROLES)) {
    const error = new Error("Only authorised staff can update support profiles.");
    error.status = 403;
    throw error;
  }
  const before = { ...profile };
  Object.assign(profile, sanitizeSupportProfilePayload({ ...profile, ...body }), {
    updatedBy: str(user.id || user.username),
    updatedAt: nowIso(),
    reviewedAt: body.status === "UNDER_REVIEW" ? nowIso() : profile.reviewedAt,
  });
  appendInclusionAuditLog(db, user, "support_profile_updated", {
    entityType: "SUPPORT_PROFILE",
    entityId: profile.id,
    studentId: profile.studentId,
    classId: profile.classId,
    visibility: profile.visibility,
    before,
    after: profile,
  });
  return profile;
}

function listSupportProfiles(db, user, filters = {}) {
  ensureEarlyYearsInclusionShape(db);
  return arr(db.earlyYearsSupportProfiles)
    .filter((profile) => {
      try {
        assertStudentAccess(db, user, profile.studentId, { action: "view" });
        assertRecordVisibility(user, profile);
        return true;
      } catch {
        return false;
      }
    })
    .filter((profile) => !filters.classId || str(profile.classId) === str(filters.classId))
    .filter((profile) => !filters.supportLevel || str(profile.supportLevel) === str(filters.supportLevel).toUpperCase())
    .filter((profile) => !filters.status || str(profile.status) === str(filters.status).toUpperCase())
    .filter((profile) => !filters.concernArea || [profile.primaryConcernArea, ...arr(profile.additionalConcernAreas)].includes(str(filters.concernArea).toUpperCase()))
    .sort((a, b) => str(b.updatedAt || b.createdAt).localeCompare(str(a.updatedAt || a.createdAt)))
    .map((profile) => sanitizeRecordForUser(user, profile));
}

function sanitizeConcernPayload(body = {}) {
  rejectSafeguardingOnlyRecord(body);
  assertNotCasualDiagnosis(body);
  if (!str(body.objectiveEvidence) || str(body.objectiveEvidence).length < 12) {
    const error = new Error("Describe before you interpret. Concern records require objective evidence, not only a label.");
    error.status = 400;
    throw error;
  }
  return {
    date: str(body.date) || new Date().toISOString().slice(0, 10),
    raisedBy: str(body.raisedBy),
    context: str(body.context),
    concernArea: normalizeEnum(body.concernArea, CONCERN_AREAS, "OTHER"),
    objectiveEvidence: str(body.objectiveEvidence),
    durationOrPattern: str(body.durationOrPattern),
    strategiesAlreadyTried: str(body.strategiesAlreadyTried),
    impactOnParticipation: str(body.impactOnParticipation),
    impactOnLearning: str(body.impactOnLearning),
    impactOnWellbeing: str(body.impactOnWellbeing),
    parentDiscussionStatus: normalizeEnum(body.parentDiscussionStatus, PARENT_DISCUSSION_STATUSES, "NOT_YET_DISCUSSED"),
    nextAction: str(body.nextAction),
    status: normalizeEnum(body.status, CONCERN_STATUSES, "NOTED"),
    visibility: normalizeEnum(body.visibility, VISIBILITY_LEVELS, "TEACHING_TEAM"),
  };
}

function createSupportConcern(db, user, body = {}) {
  ensureEarlyYearsInclusionShape(db);
  const { student, classRow } = assertStudentAccess(db, user, body.studentId, { action: "concern" });
  if (!hasAnyRole(user, INCLUSION_STAFF_ROLES)) {
    const error = new Error("Only authorised staff can raise support concerns.");
    error.status = 403;
    throw error;
  }
  const linkedObservationIds = validateObservationLinks(db, user, student, textList(body.linkedObservationIds));
  const timestamp = nowIso();
  const concern = {
    id: randomId("eyfs-support-concern"),
    studentId: str(student.id),
    studentName: str(student.name),
    classId: str(classRow.id),
    className: str(classRow.name),
    supportProfileId: str(body.supportProfileId),
    ...sanitizeConcernPayload(body),
    linkedObservationIds,
    createdBy: str(user.id || user.username),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  db.earlyYearsSupportConcerns.unshift(concern);
  appendInclusionAuditLog(db, user, "support_concern_created", {
    entityType: "SUPPORT_CONCERN",
    entityId: concern.id,
    studentId: concern.studentId,
    classId: concern.classId,
    visibility: concern.visibility,
    after: concern,
  });
  return concern;
}

function updateSupportConcern(db, user, concernId, body = {}) {
  ensureEarlyYearsInclusionShape(db);
  const concern = arr(db.earlyYearsSupportConcerns).find((row) => str(row.id) === str(concernId));
  if (!concern) {
    const error = new Error("Support concern could not be found.");
    error.status = 404;
    throw error;
  }
  const { student } = assertStudentAccess(db, user, concern.studentId, { action: "concern" });
  assertRecordVisibility(user, concern);
  if (!hasAnyRole(user, INCLUSION_STAFF_ROLES)) {
    const error = new Error("Only authorised staff can update support concerns.");
    error.status = 403;
    throw error;
  }
  const before = { ...concern };
  const linkedObservationIds = body.linkedObservationIds !== undefined
    ? validateObservationLinks(db, user, student, textList(body.linkedObservationIds))
    : concern.linkedObservationIds;
  Object.assign(concern, sanitizeConcernPayload({ ...concern, ...body }), {
    linkedObservationIds,
    updatedBy: str(user.id || user.username),
    updatedAt: nowIso(),
  });
  appendInclusionAuditLog(db, user, "support_concern_updated", {
    entityType: "SUPPORT_CONCERN",
    entityId: concern.id,
    studentId: concern.studentId,
    classId: concern.classId,
    visibility: concern.visibility,
    before,
    after: concern,
  });
  return concern;
}

function sanitizeSupportPlanPayload(body = {}) {
  rejectSafeguardingOnlyRecord(body);
  assertNotCasualDiagnosis(body);
  if (!str(body.priorityNeed) || !str(body.desiredOutcome)) {
    const error = new Error("Support plans must name the barrier/priority need and the desired outcome.");
    error.status = 400;
    throw error;
  }
  if (str(body.desiredOutcome).toLowerCase() === "improve behaviour") {
    const error = new Error("Use a meaningful support outcome. Avoid vague targets such as 'Improve behaviour'.");
    error.status = 400;
    throw error;
  }
  return {
    startDate: str(body.startDate) || new Date().toISOString().slice(0, 10),
    reviewDate: str(body.reviewDate),
    priorityNeed: str(body.priorityNeed),
    desiredOutcome: str(body.desiredOutcome),
    strategies: textList(body.strategies),
    environmentAdjustments: str(body.environmentAdjustments),
    communicationStrategies: str(body.communicationStrategies),
    adultSupport: str(body.adultSupport),
    resources: textList(body.resources),
    homeSupport: str(body.homeSupport),
    professionalAdvice: str(body.professionalAdvice),
    childVoice: str(body.childVoice),
    parentContribution: str(body.parentContribution),
    teacherContribution: str(body.teacherContribution),
    status: normalizeEnum(body.status, SUPPORT_PLAN_STATUSES, "DRAFT"),
    visibility: normalizeEnum(body.visibility, VISIBILITY_LEVELS, "TEACHING_TEAM"),
  };
}

function createSupportPlan(db, user, body = {}) {
  ensureEarlyYearsInclusionShape(db);
  validateSessionTerm(db, body);
  const { student, classRow } = assertStudentAccess(db, user, body.studentId, { action: "support plan" });
  if (!hasAnyRole(user, INCLUSION_STAFF_ROLES)) {
    const error = new Error("Only authorised staff can create support plans.");
    error.status = 403;
    throw error;
  }
  const weeklyPlanId = validateWeeklyPlanReference(db, user, student, body.weeklyPlanId);
  const environmentLinks = validateEnvironmentLinks(db, user, classRow.id, body);
  const timestamp = nowIso();
  const plan = {
    id: randomId("eyfs-support-plan"),
    studentId: str(student.id),
    studentName: str(student.name),
    classId: str(classRow.id),
    className: str(classRow.name),
    supportProfileId: str(body.supportProfileId),
    academicSessionId: str(body.academicSessionId || body.sessionId),
    termId: str(body.termId),
    weeklyPlanId,
    receptionLiteracySupportPlanId: str(body.receptionLiteracySupportPlanId),
    ...environmentLinks,
    ...sanitizeSupportPlanPayload(body),
    createdBy: str(user.id || user.username),
    approvedBy: "",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  db.earlyYearsSupportPlans.unshift(plan);
  appendInclusionAuditLog(db, user, "support_plan_created", {
    entityType: "SUPPORT_PLAN",
    entityId: plan.id,
    studentId: plan.studentId,
    classId: plan.classId,
    visibility: plan.visibility,
    after: plan,
  });
  return plan;
}

function updateSupportPlan(db, user, planId, body = {}) {
  ensureEarlyYearsInclusionShape(db);
  const plan = arr(db.earlyYearsSupportPlans).find((row) => str(row.id) === str(planId));
  if (!plan) {
    const error = new Error("Support plan could not be found.");
    error.status = 404;
    throw error;
  }
  const { student, classRow } = assertStudentAccess(db, user, plan.studentId, { action: "support plan" });
  assertRecordVisibility(user, plan);
  if (!hasAnyRole(user, INCLUSION_STAFF_ROLES)) {
    const error = new Error("Only authorised staff can update support plans.");
    error.status = 403;
    throw error;
  }
  const before = { ...plan };
  const weeklyPlanId = body.weeklyPlanId !== undefined ? validateWeeklyPlanReference(db, user, student, body.weeklyPlanId) : plan.weeklyPlanId;
  const environmentLinks = (body.provisionAreaId || body.environmentAdjustmentId || body.weeklyEnhancementId || body.resourceId)
    ? validateEnvironmentLinks(db, user, classRow.id, body)
    : { provisionAreaId: plan.provisionAreaId, environmentAdjustmentId: plan.environmentAdjustmentId, resourceId: plan.resourceId };
  Object.assign(plan, {
    weeklyPlanId,
    ...environmentLinks,
    ...sanitizeSupportPlanPayload({ ...plan, ...body }),
    updatedBy: str(user.id || user.username),
    approvedBy: ["ACTIVE", "UPDATED"].includes(str(body.status).toUpperCase()) && isLeader(user) ? str(user.id || user.username) : plan.approvedBy,
    updatedAt: nowIso(),
  });
  appendInclusionAuditLog(db, user, "support_plan_updated", {
    entityType: "SUPPORT_PLAN",
    entityId: plan.id,
    studentId: plan.studentId,
    classId: plan.classId,
    visibility: plan.visibility,
    before,
    after: plan,
  });
  return plan;
}

function reviewSupportPlan(db, user, planId, body = {}) {
  ensureEarlyYearsInclusionShape(db);
  const plan = arr(db.earlyYearsSupportPlans).find((row) => str(row.id) === str(planId));
  if (!plan) {
    const error = new Error("Support plan could not be found.");
    error.status = 404;
    throw error;
  }
  assertStudentAccess(db, user, plan.studentId, { action: "review" });
  assertRecordVisibility(user, plan);
  if (!hasAnyRole(user, INCLUSION_STAFF_ROLES)) {
    const error = new Error("Only authorised staff can review support plans.");
    error.status = 403;
    throw error;
  }
  rejectSafeguardingOnlyRecord(body);
  const outcome = normalizeEnum(body.outcome || body.reviewOutcome, REVIEW_OUTCOMES, "CONTINUE");
  const timestamp = nowIso();
  const review = {
    id: randomId("eyfs-support-review"),
    supportPlanId: str(plan.id),
    supportProfileId: str(plan.supportProfileId),
    studentId: str(plan.studentId),
    classId: str(plan.classId),
    reviewDate: str(body.reviewDate) || new Date().toISOString().slice(0, 10),
    whatWasImplemented: str(body.whatWasImplemented),
    whatChanged: str(body.whatChanged),
    whatImproved: str(body.whatImproved),
    whatRemainedDifficult: str(body.whatRemainedDifficult),
    parentFeedback: str(body.parentFeedback),
    childResponse: str(body.childResponse),
    teacherJudgement: str(body.teacherJudgement),
    nextDecision: outcome,
    nextReviewDate: str(body.nextReviewDate),
    visibility: normalizeEnum(body.visibility, VISIBILITY_LEVELS, plan.visibility || "TEACHING_TEAM"),
    createdBy: str(user.id || user.username),
    createdAt: timestamp,
  };
  db.earlyYearsSupportPlanReviews.unshift(review);
  const before = { ...plan };
  if (outcome === "CLOSE") plan.status = "COMPLETED";
  else if (outcome === "ADAPT" || outcome === "INCREASE_SUPPORT" || outcome === "REDUCE_SUPPORT") plan.status = "UNDER_REVIEW";
  plan.reviewDate = review.nextReviewDate || plan.reviewDate;
  plan.updatedAt = timestamp;
  appendInclusionAuditLog(db, user, "support_plan_reviewed", {
    entityType: "SUPPORT_PLAN_REVIEW",
    entityId: review.id,
    studentId: plan.studentId,
    classId: plan.classId,
    visibility: review.visibility,
    before,
    after: { plan, review },
  });
  return { plan, review };
}

function createSupportStrategy(db, user, body = {}) {
  ensureEarlyYearsInclusionShape(db);
  if (!isLeader(user)) {
    const error = new Error("Only academic leadership can manage shared support strategy templates.");
    error.status = 403;
    throw error;
  }
  const timestamp = nowIso();
  const strategy = {
    id: randomId("eyfs-support-strategy"),
    name: str(body.name),
    concernAreas: textList(body.concernAreas).map((item) => normalizeEnum(item, CONCERN_AREAS, "OTHER")),
    description: str(body.description),
    classroomUse: str(body.classroomUse),
    homeUse: str(body.homeUse),
    isActive: body.isActive === undefined ? true : bool(body.isActive),
    createdBy: str(user.id || user.username),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  db.earlyYearsSupportStrategies.unshift(strategy);
  appendInclusionAuditLog(db, user, "support_strategy_created", {
    entityType: "SUPPORT_STRATEGY",
    entityId: strategy.id,
    after: strategy,
  });
  return strategy;
}

function listSupportStrategies(db, user, filters = {}) {
  ensureEarlyYearsInclusionShape(db);
  if (!hasAnyRole(user, INCLUSION_STAFF_ROLES)) return [];
  return arr(db.earlyYearsSupportStrategies)
    .filter((row) => row.isActive !== false || filters.includeInactive)
    .filter((row) => !filters.concernArea || arr(row.concernAreas).includes(str(filters.concernArea).toUpperCase()))
    .sort((a, b) => str(a.name).localeCompare(str(b.name)));
}

function sanitizeReferralPayload(body = {}) {
  rejectSafeguardingOnlyRecord(body);
  assertNotCasualDiagnosis(body);
  return {
    referralType: str(body.referralType || "OTHER"),
    referredTo: str(body.referredTo),
    reason: str(body.reason),
    evidenceSummary: str(body.evidenceSummary),
    parentAware: bool(body.parentAware),
    parentConsentStatus: normalizeEnum(body.parentConsentStatus, CONSENT_STATUSES, "PENDING"),
    referralDate: str(body.referralDate) || new Date().toISOString().slice(0, 10),
    appointmentDate: str(body.appointmentDate),
    outcomeDate: str(body.outcomeDate),
    professionalAdvice: str(body.professionalAdvice),
    schoolAction: str(body.schoolAction),
    status: normalizeEnum(body.status, REFERRAL_STATUSES, "PROPOSED"),
    visibility: normalizeEnum(body.visibility, VISIBILITY_LEVELS, "LEADERSHIP"),
  };
}

function createReferralRecord(db, user, body = {}) {
  ensureEarlyYearsInclusionShape(db);
  const { student, classRow } = assertStudentAccess(db, user, body.studentId, { action: "referral" });
  if (!hasAnyRole(user, INCLUSION_STAFF_ROLES)) {
    const error = new Error("Only authorised staff can create referral records.");
    error.status = 403;
    throw error;
  }
  const timestamp = nowIso();
  const referral = {
    id: randomId("eyfs-referral"),
    studentId: str(student.id),
    studentName: str(student.name),
    classId: str(classRow.id),
    supportProfileId: str(body.supportProfileId),
    ...sanitizeReferralPayload(body),
    createdBy: str(user.id || user.username),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  db.earlyYearsReferralRecords.unshift(referral);
  appendInclusionAuditLog(db, user, "referral_created", {
    entityType: "REFERRAL",
    entityId: referral.id,
    studentId: referral.studentId,
    classId: referral.classId,
    visibility: referral.visibility,
    after: referral,
  });
  return referral;
}

function updateReferralRecord(db, user, referralId, body = {}) {
  ensureEarlyYearsInclusionShape(db);
  const referral = arr(db.earlyYearsReferralRecords).find((row) => str(row.id) === str(referralId));
  if (!referral) {
    const error = new Error("Referral record could not be found.");
    error.status = 404;
    throw error;
  }
  assertStudentAccess(db, user, referral.studentId, { action: "referral" });
  assertRecordVisibility(user, referral);
  if (!hasAnyRole(user, INCLUSION_STAFF_ROLES)) {
    const error = new Error("Only authorised staff can update referral records.");
    error.status = 403;
    throw error;
  }
  const before = { ...referral };
  Object.assign(referral, sanitizeReferralPayload({ ...referral, ...body }), {
    updatedBy: str(user.id || user.username),
    updatedAt: nowIso(),
  });
  appendInclusionAuditLog(db, user, "referral_updated", {
    entityType: "REFERRAL",
    entityId: referral.id,
    studentId: referral.studentId,
    classId: referral.classId,
    visibility: referral.visibility,
    before,
    after: referral,
  });
  return referral;
}

function createConsentRecord(db, user, body = {}) {
  ensureEarlyYearsInclusionShape(db);
  const { student, classRow } = assertStudentAccess(db, user, body.studentId, { action: "consent" });
  if (!hasAnyRole(user, INCLUSION_STAFF_ROLES)) {
    const error = new Error("Only authorised staff can record consent status.");
    error.status = 403;
    throw error;
  }
  const timestamp = nowIso();
  const consent = {
    id: randomId("eyfs-consent"),
    studentId: str(student.id),
    classId: str(classRow.id),
    relatedEntityType: str(body.relatedEntityType),
    relatedEntityId: str(body.relatedEntityId),
    consentStatus: normalizeEnum(body.consentStatus, CONSENT_STATUSES, "PENDING"),
    date: str(body.date) || new Date().toISOString().slice(0, 10),
    purpose: str(body.purpose),
    recordedBy: str(user.id || user.username),
    visibility: normalizeEnum(body.visibility, VISIBILITY_LEVELS, "LEADERSHIP"),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  db.earlyYearsConsentRecords.unshift(consent);
  appendInclusionAuditLog(db, user, "consent_recorded", {
    entityType: "CONSENT",
    entityId: consent.id,
    studentId: consent.studentId,
    classId: consent.classId,
    visibility: consent.visibility,
    after: consent,
  });
  return consent;
}

function createParentMeeting(db, user, body = {}) {
  ensureEarlyYearsInclusionShape(db);
  validateSessionTerm(db, body);
  const { student, classRow } = assertStudentAccess(db, user, body.studentId, { action: "parent meeting" });
  if (!hasAnyRole(user, INCLUSION_STAFF_ROLES)) {
    const error = new Error("Only authorised staff can record parent partnership meetings.");
    error.status = 403;
    throw error;
  }
  rejectSafeguardingOnlyRecord(body);
  const timestamp = nowIso();
  const meeting = {
    id: randomId("eyfs-parent-meeting"),
    studentId: str(student.id),
    studentName: str(student.name),
    classId: str(classRow.id),
    className: str(classRow.name),
    academicSessionId: str(body.academicSessionId || body.sessionId),
    termId: str(body.termId),
    meetingDate: str(body.meetingDate) || new Date().toISOString().slice(0, 10),
    meetingType: normalizeEnum(body.meetingType, MEETING_TYPES, "OTHER"),
    attendees: textList(body.attendees),
    purpose: str(body.purpose),
    childStrengths: str(body.childStrengths),
    parentViews: str(body.parentViews),
    teacherViews: str(body.teacherViews),
    discussionSummary: str(body.discussionSummary),
    agreedActions: str(body.agreedActions),
    schoolActions: str(body.schoolActions),
    parentActions: str(body.parentActions),
    togetherActions: str(body.togetherActions),
    reviewDate: str(body.reviewDate),
    parentVisibleSummary: str(body.parentVisibleSummary),
    acknowledgementStatus: normalizeEnum(body.acknowledgementStatus, ACKNOWLEDGEMENT_STATUSES, "AWAITING_RESPONSE"),
    parentComment: str(body.parentComment),
    restrictedNotes: str(body.restrictedNotes),
    visibility: normalizeEnum(body.visibility, VISIBILITY_LEVELS, "PARENT_VISIBLE"),
    createdBy: str(user.id || user.username),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  db.earlyYearsParentPartnershipMeetings.unshift(meeting);
  appendInclusionAuditLog(db, user, "parent_meeting_created", {
    entityType: "PARENT_MEETING",
    entityId: meeting.id,
    studentId: meeting.studentId,
    classId: meeting.classId,
    visibility: meeting.visibility,
    after: meeting,
  });
  return meeting;
}

function updateParentMeeting(db, user, meetingId, body = {}) {
  ensureEarlyYearsInclusionShape(db);
  const meeting = arr(db.earlyYearsParentPartnershipMeetings).find((row) => str(row.id) === str(meetingId));
  if (!meeting) {
    const error = new Error("Parent meeting could not be found.");
    error.status = 404;
    throw error;
  }
  const access = assertStudentAccess(db, user, meeting.studentId, { action: "parent meeting" });
  assertRecordVisibility(user, meeting);
  const before = { ...meeting };
  if (access.access === "PARENT") {
    meeting.acknowledgementStatus = body.parentComment ? "COMMENTED" : "ACKNOWLEDGED";
    meeting.parentComment = str(body.parentComment ?? meeting.parentComment);
    meeting.updatedAt = nowIso();
  } else {
    Object.assign(meeting, {
      ...meeting,
      ...createParentMeetingPayloadFromExisting(meeting, body),
      updatedBy: str(user.id || user.username),
      updatedAt: nowIso(),
    });
  }
  appendInclusionAuditLog(db, user, "parent_meeting_updated", {
    entityType: "PARENT_MEETING",
    entityId: meeting.id,
    studentId: meeting.studentId,
    classId: meeting.classId,
    visibility: meeting.visibility,
    before,
    after: meeting,
  });
  return meeting;
}

function createParentMeetingPayloadFromExisting(existing, body = {}) {
  return {
    meetingDate: str(body.meetingDate ?? existing.meetingDate),
    meetingType: normalizeEnum(body.meetingType ?? existing.meetingType, MEETING_TYPES, existing.meetingType || "OTHER"),
    attendees: body.attendees !== undefined ? textList(body.attendees) : existing.attendees,
    purpose: str(body.purpose ?? existing.purpose),
    childStrengths: str(body.childStrengths ?? existing.childStrengths),
    parentViews: str(body.parentViews ?? existing.parentViews),
    teacherViews: str(body.teacherViews ?? existing.teacherViews),
    discussionSummary: str(body.discussionSummary ?? existing.discussionSummary),
    agreedActions: str(body.agreedActions ?? existing.agreedActions),
    schoolActions: str(body.schoolActions ?? existing.schoolActions),
    parentActions: str(body.parentActions ?? existing.parentActions),
    togetherActions: str(body.togetherActions ?? existing.togetherActions),
    reviewDate: str(body.reviewDate ?? existing.reviewDate),
    parentVisibleSummary: str(body.parentVisibleSummary ?? existing.parentVisibleSummary),
    acknowledgementStatus: normalizeEnum(body.acknowledgementStatus ?? existing.acknowledgementStatus, ACKNOWLEDGEMENT_STATUSES, existing.acknowledgementStatus || "AWAITING_RESPONSE"),
    parentComment: str(body.parentComment ?? existing.parentComment),
    restrictedNotes: str(body.restrictedNotes ?? existing.restrictedNotes),
    visibility: normalizeEnum(body.visibility ?? existing.visibility, VISIBILITY_LEVELS, existing.visibility || "PARENT_VISIBLE"),
  };
}

function createParentSupportSummary(db, user, body = {}) {
  ensureEarlyYearsInclusionShape(db);
  const { student, classRow } = assertStudentAccess(db, user, body.studentId, { action: "parent summary" });
  if (!hasAnyRole(user, INCLUSION_STAFF_ROLES)) {
    const error = new Error("Only authorised staff can create parent-facing support summaries.");
    error.status = 403;
    throw error;
  }
  const timestamp = nowIso();
  const summary = {
    id: randomId("eyfs-parent-summary"),
    studentId: str(student.id),
    classId: str(classRow.id),
    strengths: str(body.strengths),
    currentFocus: str(body.currentFocus),
    agreedSchoolSupport: str(body.agreedSchoolSupport),
    agreedFamilySupport: str(body.agreedFamilySupport),
    reviewDate: str(body.reviewDate),
    acknowledgementStatus: "AWAITING_RESPONSE",
    visibility: "PARENT_VISIBLE",
    createdBy: str(user.id || user.username),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  db.earlyYearsParentSupportSummaries.unshift(summary);
  appendInclusionAuditLog(db, user, "parent_support_summary_created", {
    entityType: "PARENT_SUPPORT_SUMMARY",
    entityId: summary.id,
    studentId: summary.studentId,
    classId: summary.classId,
    visibility: summary.visibility,
    after: summary,
  });
  return summary;
}

function createTransitionPlan(db, user, body = {}) {
  ensureEarlyYearsInclusionShape(db);
  const { student, classRow } = assertStudentAccess(db, user, body.studentId, { action: "transition" });
  if (!hasAnyRole(user, INCLUSION_STAFF_ROLES)) {
    const error = new Error("Only authorised staff can create transition support plans.");
    error.status = 403;
    throw error;
  }
  const receiving = getApprovedClassConfig(body.receivingClass || body.receivingClassId);
  if (!receiving) {
    const error = new Error("Receiving class could not be resolved.");
    error.status = 400;
    throw error;
  }
  const timestamp = nowIso();
  const transition = {
    id: randomId("eyfs-transition"),
    studentId: str(student.id),
    studentName: str(student.name),
    currentClassId: str(classRow.id),
    currentClassName: str(classRow.name),
    receivingClassId: str(receiving.id),
    receivingClassName: str(receiving.name),
    transitionDate: str(body.transitionDate),
    strengths: str(body.strengths),
    routinesThatHelp: str(body.routinesThatHelp),
    communicationNeeds: str(body.communicationNeeds),
    accessAdjustments: str(body.accessAdjustments),
    independence: str(body.independence),
    relationships: str(body.relationships),
    supportStrategies: textList(body.supportStrategies),
    parentInput: str(body.parentInput),
    childVoice: str(body.childVoice),
    receivingTeacherNotes: str(body.receivingTeacherNotes),
    reviewAfterTransition: str(body.reviewAfterTransition),
    literacySupportSummary: str(body.literacySupportSummary),
    mathematicsSupportSummary: str(body.mathematicsSupportSummary),
    learningBehaviour: str(body.learningBehaviour),
    currentPriorities: str(body.currentPriorities),
    status: normalizeEnum(body.status, TRANSITION_STATUSES, "DRAFT"),
    visibility: normalizeEnum(body.visibility, VISIBILITY_LEVELS, "TEACHING_TEAM"),
    createdBy: str(user.id || user.username),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  db.earlyYearsTransitionSupportPlans.unshift(transition);
  appendInclusionAuditLog(db, user, "transition_plan_created", {
    entityType: "TRANSITION_PLAN",
    entityId: transition.id,
    studentId: transition.studentId,
    classId: transition.currentClassId,
    visibility: transition.visibility,
    after: transition,
  });
  return transition;
}

function updateTransitionPlan(db, user, transitionId, body = {}) {
  ensureEarlyYearsInclusionShape(db);
  const transition = arr(db.earlyYearsTransitionSupportPlans).find((row) => str(row.id) === str(transitionId));
  if (!transition) {
    const error = new Error("Transition support plan could not be found.");
    error.status = 404;
    throw error;
  }
  assertStudentAccess(db, user, transition.studentId, { action: "transition" });
  assertRecordVisibility(user, transition);
  if (!hasAnyRole(user, INCLUSION_STAFF_ROLES)) {
    const error = new Error("Only authorised staff can update transition support plans.");
    error.status = 403;
    throw error;
  }
  const before = { ...transition };
  Object.assign(transition, {
    strengths: str(body.strengths ?? transition.strengths),
    routinesThatHelp: str(body.routinesThatHelp ?? transition.routinesThatHelp),
    communicationNeeds: str(body.communicationNeeds ?? transition.communicationNeeds),
    accessAdjustments: str(body.accessAdjustments ?? transition.accessAdjustments),
    independence: str(body.independence ?? transition.independence),
    relationships: str(body.relationships ?? transition.relationships),
    supportStrategies: body.supportStrategies !== undefined ? textList(body.supportStrategies) : transition.supportStrategies,
    parentInput: str(body.parentInput ?? transition.parentInput),
    childVoice: str(body.childVoice ?? transition.childVoice),
    receivingTeacherNotes: str(body.receivingTeacherNotes ?? transition.receivingTeacherNotes),
    reviewAfterTransition: str(body.reviewAfterTransition ?? transition.reviewAfterTransition),
    status: normalizeEnum(body.status ?? transition.status, TRANSITION_STATUSES, transition.status || "DRAFT"),
    visibility: normalizeEnum(body.visibility ?? transition.visibility, VISIBILITY_LEVELS, transition.visibility || "TEACHING_TEAM"),
    updatedBy: str(user.id || user.username),
    updatedAt: nowIso(),
  });
  appendInclusionAuditLog(db, user, "transition_plan_updated", {
    entityType: "TRANSITION_PLAN",
    entityId: transition.id,
    studentId: transition.studentId,
    classId: transition.currentClassId,
    visibility: transition.visibility,
    before,
    after: transition,
  });
  return transition;
}

function listRecordsForStudent(db, user, studentId) {
  const { student, access } = assertStudentAccess(db, user, studentId, { action: "view" });
  const visible = (row) => {
    try {
      assertRecordVisibility(user, row);
      return true;
    } catch {
      return false;
    }
  };
  const profile = arr(db.earlyYearsSupportProfiles).find((row) => str(row.studentId) === str(student.id) && visible(row)) || null;
  return {
    student,
    access,
    profile: sanitizeRecordForUser(user, profile),
    familyProfile: getOrCreateParentPartnershipProfile(db, student, user),
    concerns: arr(db.earlyYearsSupportConcerns).filter((row) => str(row.studentId) === str(student.id) && visible(row)).map((row) => sanitizeRecordForUser(user, row)),
    supportPlans: arr(db.earlyYearsSupportPlans).filter((row) => str(row.studentId) === str(student.id) && visible(row)).map((row) => sanitizeRecordForUser(user, row)),
    reviews: arr(db.earlyYearsSupportPlanReviews).filter((row) => str(row.studentId) === str(student.id) && visible(row)).map((row) => sanitizeRecordForUser(user, row)),
    referrals: arr(db.earlyYearsReferralRecords).filter((row) => str(row.studentId) === str(student.id) && visible(row)).map((row) => sanitizeRecordForUser(user, row)),
    meetings: arr(db.earlyYearsParentPartnershipMeetings).filter((row) => str(row.studentId) === str(student.id) && visible(row)).map((row) => sanitizeRecordForUser(user, row)),
    parentSummaries: arr(db.earlyYearsParentSupportSummaries).filter((row) => str(row.studentId) === str(student.id) && visible(row)).map((row) => sanitizeRecordForUser(user, row)),
    consents: arr(db.earlyYearsConsentRecords).filter((row) => str(row.studentId) === str(student.id) && visible(row)).map((row) => sanitizeRecordForUser(user, row)),
    transitions: arr(db.earlyYearsTransitionSupportPlans).filter((row) => str(row.studentId) === str(student.id) && visible(row)).map((row) => sanitizeRecordForUser(user, row)),
    parentContributions: arr(db.earlyYearsParentContributions).filter((row) => str(row.studentId) === str(student.id) && (access !== "PARENT" || ["APPROVED", "PUBLISHED"].includes(str(row.status).toUpperCase()))),
  };
}

function getStudentInclusionProfile(db, user, studentId) {
  ensureEarlyYearsInclusionShape(db);
  return {
    ...listRecordsForStudent(db, user, studentId),
    supportPrinciples: {
      inclusionCycle: INCLUSION_CYCLE,
      parentPartnershipCycle: PARENT_PARTNERSHIP_CYCLE,
      message: "Observe carefully - refer appropriately - do not diagnose casually.",
    },
  };
}

function listAccessibleEarlyYearsStudents(db, user, filters = {}) {
  ensureEarlyYearsInclusionShape(db);
  if (hasAnyRole(user, PARENT_ROLES)) {
    return arr(db.students).filter((student) => parentStudentIds(user).has(str(student.id)) && isEarlyYearsStudent(student));
  }
  if (!hasAnyRole(user, INCLUSION_STAFF_ROLES)) return [];
  const classes = listAccessibleEarlyYearsClasses(db, user);
  const allowed = new Set(classes.map((row) => str(row.id)));
  return arr(db.students).filter((student) => {
    if (!isEarlyYearsStudent(student)) return false;
    if (filters.classId && !classMatchesStudent(student, filters.classId)) return false;
    return allowed.has(str(student.classId)) || allowed.has(str(getApprovedClassConfig(student.classId || student.className)?.id));
  });
}

function getInclusionDashboard(db, user, filters = {}) {
  ensureEarlyYearsInclusionShape(db);
  const classes = hasAnyRole(user, INCLUSION_STAFF_ROLES) ? listAccessibleEarlyYearsClasses(db, user) : [];
  const students = listAccessibleEarlyYearsStudents(db, user, filters);
  const profiles = listSupportProfiles(db, user, filters);
  const plans = arr(db.earlyYearsSupportPlans).filter((row) => {
    try {
      assertStudentAccess(db, user, row.studentId, { action: "view" });
      assertRecordVisibility(user, row);
      return !filters.classId || str(row.classId) === str(filters.classId);
    } catch {
      return false;
    }
  });
  const meetings = arr(db.earlyYearsParentPartnershipMeetings).filter((row) => {
    try {
      assertStudentAccess(db, user, row.studentId, { action: "view" });
      assertRecordVisibility(user, row);
      return !filters.classId || str(row.classId) === str(filters.classId);
    } catch {
      return false;
    }
  });
  const referrals = arr(db.earlyYearsReferralRecords).filter((row) => {
    try {
      assertStudentAccess(db, user, row.studentId, { action: "view" });
      assertRecordVisibility(user, row);
      return !filters.classId || str(row.classId) === str(filters.classId);
    } catch {
      return false;
    }
  });
  const transitions = arr(db.earlyYearsTransitionSupportPlans).filter((row) => {
    try {
      assertStudentAccess(db, user, row.studentId, { action: "view" });
      assertRecordVisibility(user, row);
      return !filters.classId || str(row.currentClassId) === str(filters.classId);
    } catch {
      return false;
    }
  });
  const today = new Date().toISOString().slice(0, 10);
  const reviewsDue = plans.filter((row) => row.reviewDate && row.reviewDate <= today && !["COMPLETED", "ARCHIVED"].includes(row.status));
  const parentMeetingsDue = meetings.filter((row) => row.reviewDate && row.reviewDate <= today);
  const transitionReviewsDue = transitions.filter((row) => row.reviewAfterTransition && row.reviewAfterTransition <= today);
  return {
    classes,
    students,
    profiles,
    supportPlans: plans.map((row) => sanitizeRecordForUser(user, row)),
    meetings: meetings.map((row) => sanitizeRecordForUser(user, row)),
    referrals: referrals.map((row) => sanitizeRecordForUser(user, row)),
    transitions: transitions.map((row) => sanitizeRecordForUser(user, row)),
    strategies: listSupportStrategies(db, user, {}),
    summary: {
      monitoring: profiles.filter((row) => row.status === "MONITORING").length,
      activeSupport: profiles.filter((row) => row.status === "ACTIVE_SUPPORT").length,
      reviewsDue: reviewsDue.length,
      overdueReviews: reviewsDue.length,
      referralsAwaitingResponse: referrals.filter((row) => row.status === "AWAITING_RESPONSE").length,
      transitionPlans: transitions.length,
      parentMeetingsDue: parentMeetingsDue.length,
      transitionReviewsDue: transitionReviewsDue.length,
    },
    cycles: {
      inclusion: INCLUSION_CYCLE,
      parentPartnership: PARENT_PARTNERSHIP_CYCLE,
      transition: TRANSITION_CYCLE,
    },
  };
}

function escapeHtml(value) {
  return str(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildSupportPlanPrintHtml(plan, profile = null) {
  if (!plan) {
    const error = new Error("Support plan could not be found.");
    error.status = 404;
    throw error;
  }
  return `<!doctype html><html><head><meta charset="utf-8"><title>Angel Montessori Support Plan</title><style>
body{font-family:Arial,sans-serif;color:#102a4c;margin:28px;line-height:1.45}header{border-bottom:3px solid #1d5fa9;padding-bottom:14px;margin-bottom:18px}h1{color:#173a70}.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.meta div,section{border:1px solid #d8e4f2;border-radius:8px;padding:10px;margin-bottom:10px}@media print{.no-print{display:none}body{margin:16mm}}
</style></head><body><button class="no-print" onclick="window.print()">Print / Save PDF</button><header><div>Angel Montessori School</div><h1>Early Years Support Plan</h1></header>
<div class="meta"><div><strong>Child</strong><br>${escapeHtml(plan.studentName)}</div><div><strong>Class</strong><br>${escapeHtml(plan.className)}</div><div><strong>Status</strong><br>${escapeHtml(plan.status)}</div><div><strong>Session</strong><br>${escapeHtml(plan.academicSessionId)}</div><div><strong>Term</strong><br>${escapeHtml(plan.termId)}</div><div><strong>Review Date</strong><br>${escapeHtml(plan.reviewDate)}</div></div>
<section><strong>Strengths</strong><br>${escapeHtml(profile?.strengths)}</section>
<section><strong>Priority Need</strong><br>${escapeHtml(plan.priorityNeed)}</section>
<section><strong>Desired Outcome</strong><br>${escapeHtml(plan.desiredOutcome)}</section>
<section><strong>Strategies</strong><br>${escapeHtml(arr(plan.strategies).join(", "))}</section>
<section><strong>Environment Adjustments</strong><br>${escapeHtml(plan.environmentAdjustments)}</section>
<section><strong>School Support</strong><br>${escapeHtml(plan.adultSupport)}</section>
<section><strong>Family Partnership</strong><br>${escapeHtml(plan.homeSupport)}</section>
<section><strong>Boundary</strong><br>Confidential diagnosis, referral, and restricted professional details are excluded from this teaching support printout.</section>
</body></html>`;
}

function buildParentMeetingPrintHtml(meeting) {
  if (!meeting) {
    const error = new Error("Parent meeting could not be found.");
    error.status = 404;
    throw error;
  }
  return `<!doctype html><html><head><meta charset="utf-8"><title>Angel Montessori Parent Meeting</title><style>
body{font-family:Arial,sans-serif;color:#102a4c;margin:28px;line-height:1.45}header{border-bottom:3px solid #1d5fa9;padding-bottom:14px;margin-bottom:18px}h1{color:#173a70}.meta{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.meta div,section{border:1px solid #d8e4f2;border-radius:8px;padding:10px;margin-bottom:10px}@media print{.no-print{display:none}body{margin:16mm}}
</style></head><body><button class="no-print" onclick="window.print()">Print / Save PDF</button><header><div>Angel Montessori School</div><h1>Parent Partnership Meeting Summary</h1></header>
<div class="meta"><div><strong>Child</strong><br>${escapeHtml(meeting.studentName)}</div><div><strong>Date</strong><br>${escapeHtml(meeting.meetingDate)}</div><div><strong>Purpose</strong><br>${escapeHtml(meeting.purpose)}</div><div><strong>Review Date</strong><br>${escapeHtml(meeting.reviewDate)}</div></div>
<section><strong>Strengths</strong><br>${escapeHtml(meeting.childStrengths)}</section>
<section><strong>Parent Views</strong><br>${escapeHtml(meeting.parentViews)}</section>
<section><strong>School Views</strong><br>${escapeHtml(meeting.teacherViews)}</section>
<section><strong>Agreed Actions</strong><br>${escapeHtml(meeting.agreedActions)}</section>
<section><strong>School Will</strong><br>${escapeHtml(meeting.schoolActions)}</section>
<section><strong>Family Will</strong><br>${escapeHtml(meeting.parentActions)}</section>
<section><strong>Together We Will</strong><br>${escapeHtml(meeting.togetherActions)}</section>
</body></html>`;
}

function buildTransitionPrintHtml(transition) {
  if (!transition) {
    const error = new Error("Transition plan could not be found.");
    error.status = 404;
    throw error;
  }
  return `<!doctype html><html><head><meta charset="utf-8"><title>Angel Montessori Transition Summary</title><style>
body{font-family:Arial,sans-serif;color:#102a4c;margin:28px;line-height:1.45}header{border-bottom:3px solid #1d5fa9;padding-bottom:14px;margin-bottom:18px}h1{color:#173a70}.meta{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.meta div,section{border:1px solid #d8e4f2;border-radius:8px;padding:10px;margin-bottom:10px}@media print{.no-print{display:none}body{margin:16mm}}
</style></head><body><button class="no-print" onclick="window.print()">Print / Save PDF</button><header><div>Angel Montessori School</div><h1>Transition Support Summary</h1></header>
<div class="meta"><div><strong>Child</strong><br>${escapeHtml(transition.studentName)}</div><div><strong>Transition</strong><br>${escapeHtml(transition.currentClassName)} to ${escapeHtml(transition.receivingClassName)}</div><div><strong>Date</strong><br>${escapeHtml(transition.transitionDate)}</div><div><strong>Review</strong><br>${escapeHtml(transition.reviewAfterTransition)}</div></div>
<section><strong>Strengths</strong><br>${escapeHtml(transition.strengths)}</section>
<section><strong>Communication</strong><br>${escapeHtml(transition.communicationNeeds)}</section>
<section><strong>Independence</strong><br>${escapeHtml(transition.independence)}</section>
<section><strong>Successful Strategies</strong><br>${escapeHtml(arr(transition.supportStrategies).join(", "))}</section>
<section><strong>Access Adjustments</strong><br>${escapeHtml(transition.accessAdjustments)}</section>
<section><strong>Current Priorities</strong><br>${escapeHtml(transition.currentPriorities)}</section>
<section><strong>Parent Input</strong><br>${escapeHtml(transition.parentInput)}</section>
<section><strong>Receiving Teacher Guidance</strong><br>${escapeHtml(transition.receivingTeacherNotes)}</section>
</body></html>`;
}

module.exports = {
  ACKNOWLEDGEMENT_STATUSES,
  CONCERN_AREAS,
  CONCERN_STATUSES,
  CONSENT_STATUSES,
  INCLUSION_CYCLE,
  INCLUSION_ROLES,
  INCLUSION_STAFF_ROLES,
  LEADER_ROLES,
  MEETING_TYPES,
  PARENT_PARTNERSHIP_CYCLE,
  PARENT_ROLES,
  REFERRAL_STATUSES,
  REVIEW_OUTCOMES,
  SUPPORT_LEVELS,
  SUPPORT_PLAN_STATUSES,
  SUPPORT_PROFILE_STATUSES,
  TRANSITION_CYCLE,
  TRANSITION_STATUSES,
  VISIBILITY_LEVELS,
  appendInclusionAuditLog,
  buildParentMeetingPrintHtml,
  buildSupportPlanPrintHtml,
  buildTransitionPrintHtml,
  createConsentRecord,
  createParentMeeting,
  createParentSupportSummary,
  createReferralRecord,
  createSupportConcern,
  createSupportPlan,
  createSupportProfile,
  createSupportStrategy,
  createTransitionPlan,
  ensureEarlyYearsInclusionShape,
  getInclusionDashboard,
  getStudentInclusionProfile,
  listAccessibleEarlyYearsStudents,
  listSupportProfiles,
  listSupportStrategies,
  reviewSupportPlan,
  updateParentMeeting,
  updateParentPartnershipProfile,
  updateReferralRecord,
  updateSupportConcern,
  updateSupportPlan,
  updateSupportProfile,
  updateTransitionPlan,
};
