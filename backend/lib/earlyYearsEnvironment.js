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
const { getApprovedClassConfig, normalizeAcademicKey } = require("./academicSystems");

const LEADER_ROLES = ["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER"];
const ENVIRONMENT_ROLES = ["TEACHER", ...LEADER_ROLES];

const PROVISION_AREA_TYPES = [
  "READING",
  "COMMUNICATION_STORYTELLING",
  "WRITING_MARK_MAKING",
  "MATHEMATICS",
  "CONSTRUCTION",
  "SMALL_WORLD",
  "ROLE_PLAY",
  "CREATIVE_ARTS",
  "INVESTIGATION",
  "PRACTICAL_LIFE",
  "FINE_MOTOR_SENSORY",
  "OUTDOOR",
  "TECHNOLOGY",
  "QUIET_REGULATION",
  "OTHER",
];

const PRACTICAL_LIFE_CATEGORIES = [
  "POURING",
  "TRANSFERRING",
  "SCOOPING",
  "SORTING",
  "FOLDING",
  "FASTENING",
  "WIPING",
  "SWEEPING",
  "SERVING",
  "CARRYING",
  "ORGANISING",
  "WASHING",
  "PLANT_CARE",
  "RESOURCE_CARE",
  "SELF_CARE",
  "FOOD_PREPARATION",
  "OTHER",
];

const CHECKLIST_STATUSES = ["SECURE", "DEVELOPING", "ACTION_REQUIRED", "NOT_APPLICABLE"];
const ENHANCEMENT_STATUSES = ["PLANNED", "IN_USE", "REVIEWED", "KEEP", "ADAPT", "REMOVE", "DEEPEN", "REPLACE_RESOURCE"];
const REVIEW_DECISIONS = ["KEEP", "ADAPT", "REMOVE", "DEEPEN", "REPLACE_RESOURCE"];
const RESOURCE_CONDITIONS = ["GOOD", "FAIR", "NEEDS_REPAIR", "REPLACE"];
const RESOURCE_REQUEST_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"];
const RESOURCE_REQUEST_STATUSES = ["REQUESTED", "REVIEWED", "APPROVED", "DECLINED", "PROCURED", "CLOSED"];
const ENVIRONMENT_ACTION_STATUSES = ["OPEN", "IN_PROGRESS", "COMPLETED", "CLOSED"];

const CHECKLIST_DOMAIN_FIELDS = [
  "safetyStatus",
  "emotionalClimateStatus",
  "organisationStatus",
  "accessibilityStatus",
  "independenceStatus",
  "languageRichnessStatus",
  "bookAccessStatus",
  "mathematicsStatus",
  "creativeProvisionStatus",
  "investigationStatus",
  "practicalLifeStatus",
  "outdoorStatus",
  "physicalDevelopmentStatus",
  "inclusionStatus",
  "displayStatus",
  "resourceConditionStatus",
  "adultPositioningStatus",
  "restorationStatus",
  "continuousProvisionStatus",
  "enhancedProvisionStatus",
];

const PREPARED_ENVIRONMENT_CYCLE = ["PREPARE", "INVITE", "OBSERVE", "SUPPORT", "ADAPT", "RESTORE"];

const PRACTICAL_LIFE_PROGRESSION = {
  creche: {
    phase: "Creche",
    stages: ["DO_WITH_ME", "LET_ME_HELP", "LET_ME_TRY"],
    guidance: "Keep practical life relational, sensory, safe, and adult-supported.",
  },
  nursery: {
    phase: "Nursery",
    stages: ["I_CAN_DO_MORE", "I_CAN_TAKE_RESPONSIBILITY", "I_AM_BECOMING_INDEPENDENT"],
    guidance: "Offer real responsibility through choice, care, organisation, and repeatable routines.",
  },
  reception: {
    phase: "Reception",
    stages: [
      "I_CAN_MANAGE_MYSELF_AND_MY_LEARNING",
      "I_CAN_TAKE_RESPONSIBILITY_FOR_MY_LEARNING_ENVIRONMENT",
      "I_AM_READY_TO_TAKE_GREATER_RESPONSIBILITY",
    ],
    guidance: "Strengthen independence, resource responsibility, purposeful concentration, and school readiness.",
  },
};

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

function numberOr(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeEnum(value, allowed, fallback = "") {
  const next = str(value).toUpperCase();
  if (allowed.includes(next)) return next;
  return fallback;
}

function customCode(value, fallback = "OTHER") {
  const next = str(value).toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return next || fallback;
}

function textList(value) {
  if (Array.isArray(value)) return value.map(str).filter(Boolean);
  return str(value).split(/\r?\n|,/).map(str).filter(Boolean);
}

function ensureEarlyYearsEnvironmentShape(db) {
  ensureEarlyYearsCurriculumShape(db);
  ensureEarlyYearsPlanningShape(db);
  ensureEarlyYearsAssessmentShape(db);
  let mutated = false;
  [
    "earlyYearsProvisionAreas",
    "earlyYearsWeeklyProvisionEnhancements",
    "earlyYearsPracticalLifeActivities",
    "earlyYearsPracticalLifeAssignments",
    "earlyYearsEnvironmentChecklists",
    "earlyYearsEnvironmentActions",
    "earlyYearsResources",
    "earlyYearsResourceRequests",
    "earlyYearsEnvironmentReviews",
    "earlyYearsDisplayReviews",
    "earlyYearsEnvironmentAuditLogs",
  ].forEach((key) => {
    if (!Array.isArray(db[key])) {
      db[key] = [];
      mutated = true;
    }
  });
  return { mutated };
}

function appendEnvironmentAuditLog(db, actor = {}, action = "", details = {}) {
  if (!Array.isArray(db.earlyYearsEnvironmentAuditLogs)) db.earlyYearsEnvironmentAuditLogs = [];
  db.earlyYearsEnvironmentAuditLogs.unshift({
    id: randomId("eyfs-env-audit"),
    action: str(action),
    userId: str(actor.id || actor.username),
    userName: str(actor.name || actor.username),
    userRole: roleOf(actor),
    classId: str(details.classId),
    sessionId: str(details.academicSessionId || details.sessionId),
    termId: str(details.termId),
    entityType: str(details.entityType),
    entityId: str(details.entityId),
    before: details.before || null,
    after: details.after || null,
    details,
    createdAt: nowIso(),
  });
}

function assertEnvironmentRole(user) {
  if (!hasAnyRole(user, ENVIRONMENT_ROLES)) {
    const error = new Error("Early Years environment management is internal to authorised staff.");
    error.status = 403;
    throw error;
  }
}

function assertEnvironmentClassAccess(db, user, classRef, action = "view") {
  assertEnvironmentRole(user);
  const classRow = assertEarlyYearsClassAccess(db, user, classRef);
  if (isLeader(user)) return classRow;
  if (roleOf(user) !== "TEACHER") {
    const error = new Error("You do not have access to Early Years environment management.");
    error.status = 403;
    throw error;
  }
  const assigned = teacherAssignedClassIds(db, user);
  if (assigned.has(str(classRow.id))) return classRow;
  const error = new Error(action === "view"
    ? "You do not have access to this Early Years classroom environment."
    : "You cannot manage environment records for an unassigned Early Years class.");
  error.status = 403;
  throw error;
}

function classKey(classRef) {
  const approved = getApprovedClassConfig(classRef);
  return normalizeAcademicKey(approved?.id || approved?.name || classRef);
}

function classPhaseGuidance(classRef) {
  const key = classKey(classRef);
  return PRACTICAL_LIFE_PROGRESSION[key] || PRACTICAL_LIFE_PROGRESSION.nursery;
}

function assertSessionTerm(db, body = {}) {
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

function findById(rows, id) {
  return arr(rows).find((row) => str(row.id) === str(id)) || null;
}

function assertRecordClassAccess(db, user, record, action = "view") {
  if (!record) {
    const error = new Error("Environment record could not be found.");
    error.status = 404;
    throw error;
  }
  if (!record.classId && isLeader(user)) return null;
  return assertEnvironmentClassAccess(db, user, record.classId || record.className, action);
}

function validateWeeklyPlanLink(db, user, weeklyPlanId, classId = "") {
  const id = str(weeklyPlanId);
  if (!id) return null;
  const detail = getWeeklyPlanDetail(db, id, user);
  const plan = detail.plan;
  if (classId && str(plan.classId) !== str(classId)) {
    const error = new Error("Weekly plan does not match the selected Early Years class.");
    error.status = 400;
    throw error;
  }
  return detail;
}

function validateProvisionArea(db, user, provisionAreaId, classId = "") {
  const id = str(provisionAreaId);
  if (!id) return null;
  const area = findById(db.earlyYearsProvisionAreas, id);
  assertRecordClassAccess(db, user, area, "view");
  if (classId && str(area.classId) !== str(classId)) {
    const error = new Error("Provision area does not belong to this class.");
    error.status = 400;
    throw error;
  }
  return area;
}

function validateObservationLink(db, user, observationId, classId = "") {
  const id = str(observationId);
  if (!id) return null;
  const observation = findById(db.earlyYearsObservations, id);
  if (!observation) {
    const error = new Error("Linked observation could not be found.");
    error.status = 404;
    throw error;
  }
  assertEnvironmentClassAccess(db, user, observation.classId, "view");
  if (classId && str(observation.classId) !== str(classId)) {
    const error = new Error("Linked observation does not belong to this class.");
    error.status = 400;
    throw error;
  }
  return observation;
}

function canSeeRecord(db, user, record) {
  try {
    assertRecordClassAccess(db, user, record);
    return true;
  } catch {
    return false;
  }
}

function listProvisionAreas(db, user, filters = {}) {
  ensureEarlyYearsEnvironmentShape(db);
  assertEnvironmentRole(user);
  return arr(db.earlyYearsProvisionAreas)
    .filter((row) => canSeeRecord(db, user, row))
    .filter((row) => !filters.classId || str(row.classId) === str(filters.classId))
    .filter((row) => !filters.academicSessionId || str(row.academicSessionId) === str(filters.academicSessionId))
    .filter((row) => !filters.termId || str(row.termId) === str(filters.termId))
    .filter((row) => !filters.areaType || str(row.areaType) === str(filters.areaType).toUpperCase())
    .filter((row) => filters.isActive === undefined || row.isActive === bool(filters.isActive))
    .sort((a, b) => numberOr(a.displayOrder, 999) - numberOr(b.displayOrder, 999) || str(a.name).localeCompare(str(b.name)));
}

function sanitizeProvisionAreaPayload(body = {}) {
  const areaType = normalizeEnum(body.areaType, PROVISION_AREA_TYPES, "OTHER");
  return {
    areaType,
    name: str(body.name) || areaType.replace(/_/g, " "),
    purpose: str(body.purpose),
    coreResources: textList(body.coreResources),
    accessibilityNotes: str(body.accessibilityNotes),
    independenceNotes: str(body.independenceNotes),
    currentEnhancement: str(body.currentEnhancement),
    observedUse: str(body.observedUse),
    reviewNotes: str(body.reviewNotes),
    outdoorNotes: str(body.outdoorNotes),
    isActive: body.isActive === undefined ? true : bool(body.isActive),
    displayOrder: numberOr(body.displayOrder, 0),
  };
}

function createProvisionArea(db, user, body = {}) {
  ensureEarlyYearsEnvironmentShape(db);
  assertSessionTerm(db, body);
  const classRow = assertEnvironmentClassAccess(db, user, body.classId || body.className, "create");
  const timestamp = nowIso();
  const area = {
    id: randomId("eyfs-provision-area"),
    classId: str(classRow.id),
    className: str(classRow.name),
    academicSessionId: str(body.academicSessionId || body.sessionId),
    termId: str(body.termId),
    ...sanitizeProvisionAreaPayload(body),
    createdBy: str(user.id || user.username),
    updatedBy: str(user.id || user.username),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  db.earlyYearsProvisionAreas.push(area);
  appendEnvironmentAuditLog(db, user, "provision_area_created", {
    entityType: "PROVISION_AREA",
    entityId: area.id,
    classId: area.classId,
    after: area,
  });
  return area;
}

function updateProvisionArea(db, user, areaId, body = {}) {
  ensureEarlyYearsEnvironmentShape(db);
  const area = findById(db.earlyYearsProvisionAreas, areaId);
  assertRecordClassAccess(db, user, area, "edit");
  const before = { ...area };
  Object.assign(area, sanitizeProvisionAreaPayload({ ...area, ...body }), {
    updatedBy: str(user.id || user.username),
    updatedAt: nowIso(),
  });
  appendEnvironmentAuditLog(db, user, "provision_area_updated", {
    entityType: "PROVISION_AREA",
    entityId: area.id,
    classId: area.classId,
    before,
    after: area,
  });
  return area;
}

function listWeeklyEnhancements(db, user, filters = {}) {
  ensureEarlyYearsEnvironmentShape(db);
  assertEnvironmentRole(user);
  return arr(db.earlyYearsWeeklyProvisionEnhancements)
    .filter((row) => canSeeRecord(db, user, row))
    .filter((row) => !filters.classId || str(row.classId) === str(filters.classId))
    .filter((row) => !filters.weeklyPlanId || str(row.weeklyPlanId) === str(filters.weeklyPlanId))
    .filter((row) => !filters.provisionAreaId || str(row.provisionAreaId) === str(filters.provisionAreaId))
    .filter((row) => !filters.status || str(row.status) === str(filters.status).toUpperCase())
    .sort((a, b) => str(b.updatedAt || b.createdAt).localeCompare(str(a.updatedAt || a.createdAt)));
}

function createWeeklyEnhancement(db, user, body = {}) {
  ensureEarlyYearsEnvironmentShape(db);
  const planDetail = validateWeeklyPlanLink(db, user, body.weeklyPlanId, body.classId);
  const classRef = body.classId || planDetail?.plan?.classId;
  const classRow = assertEnvironmentClassAccess(db, user, classRef, "create");
  const area = validateProvisionArea(db, user, body.provisionAreaId, classRow.id);
  validateObservationLink(db, user, body.linkedObservationId, classRow.id);
  const timestamp = nowIso();
  const enhancement = {
    id: randomId("eyfs-enhancement"),
    weeklyPlanId: str(body.weeklyPlanId),
    classId: str(classRow.id),
    className: str(classRow.name),
    curriculumWeekId: str(body.curriculumWeekId || planDetail?.plan?.curriculumWeekId),
    provisionAreaId: str(area?.id || body.provisionAreaId),
    provisionAreaName: str(area?.name),
    areaType: str(area?.areaType || body.areaType),
    enhancementTitle: str(body.enhancementTitle || body.title),
    purpose: str(body.purpose),
    linkedCurriculumAreas: textList(body.linkedCurriculumAreas),
    resourcesAdded: textList(body.resourcesAdded),
    adultRole: str(body.adultRole),
    intendedLearning: str(body.intendedLearning),
    accessAdjustments: str(body.accessAdjustments),
    outdoorConnection: str(body.outdoorConnection),
    practicalLifeConnection: str(body.practicalLifeConnection),
    notes: str(body.notes),
    linkedObservationId: str(body.linkedObservationId),
    linkedSupportRecordId: str(body.linkedSupportRecordId),
    status: normalizeEnum(body.status, ENHANCEMENT_STATUSES, "PLANNED"),
    reviewDecision: "",
    reviewNotes: "",
    createdBy: str(user.id || user.username),
    updatedBy: str(user.id || user.username),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  db.earlyYearsWeeklyProvisionEnhancements.unshift(enhancement);
  appendEnvironmentAuditLog(db, user, "weekly_enhancement_created", {
    entityType: "WEEKLY_ENHANCEMENT",
    entityId: enhancement.id,
    classId: enhancement.classId,
    after: enhancement,
  });
  return enhancement;
}

function updateWeeklyEnhancement(db, user, enhancementId, body = {}) {
  ensureEarlyYearsEnvironmentShape(db);
  const enhancement = findById(db.earlyYearsWeeklyProvisionEnhancements, enhancementId);
  assertRecordClassAccess(db, user, enhancement, "edit");
  if (body.provisionAreaId) validateProvisionArea(db, user, body.provisionAreaId, enhancement.classId);
  if (body.weeklyPlanId) validateWeeklyPlanLink(db, user, body.weeklyPlanId, enhancement.classId);
  if (body.linkedObservationId) validateObservationLink(db, user, body.linkedObservationId, enhancement.classId);
  const before = { ...enhancement };
  Object.assign(enhancement, {
    weeklyPlanId: str(body.weeklyPlanId ?? enhancement.weeklyPlanId),
    curriculumWeekId: str(body.curriculumWeekId ?? enhancement.curriculumWeekId),
    provisionAreaId: str(body.provisionAreaId ?? enhancement.provisionAreaId),
    enhancementTitle: str(body.enhancementTitle ?? body.title ?? enhancement.enhancementTitle),
    purpose: str(body.purpose ?? enhancement.purpose),
    linkedCurriculumAreas: body.linkedCurriculumAreas !== undefined ? textList(body.linkedCurriculumAreas) : enhancement.linkedCurriculumAreas,
    resourcesAdded: body.resourcesAdded !== undefined ? textList(body.resourcesAdded) : enhancement.resourcesAdded,
    adultRole: str(body.adultRole ?? enhancement.adultRole),
    intendedLearning: str(body.intendedLearning ?? enhancement.intendedLearning),
    accessAdjustments: str(body.accessAdjustments ?? enhancement.accessAdjustments),
    outdoorConnection: str(body.outdoorConnection ?? enhancement.outdoorConnection),
    practicalLifeConnection: str(body.practicalLifeConnection ?? enhancement.practicalLifeConnection),
    notes: str(body.notes ?? enhancement.notes),
    linkedObservationId: str(body.linkedObservationId ?? enhancement.linkedObservationId),
    linkedSupportRecordId: str(body.linkedSupportRecordId ?? enhancement.linkedSupportRecordId),
    status: normalizeEnum(body.status ?? enhancement.status, ENHANCEMENT_STATUSES, enhancement.status || "PLANNED"),
    updatedBy: str(user.id || user.username),
    updatedAt: nowIso(),
  });
  appendEnvironmentAuditLog(db, user, "weekly_enhancement_updated", {
    entityType: "WEEKLY_ENHANCEMENT",
    entityId: enhancement.id,
    classId: enhancement.classId,
    before,
    after: enhancement,
  });
  return enhancement;
}

function listPracticalLifeActivities(db, user, filters = {}) {
  ensureEarlyYearsEnvironmentShape(db);
  assertEnvironmentRole(user);
  return arr(db.earlyYearsPracticalLifeActivities)
    .filter((row) => {
      if (!row.classId) return isLeader(user) || true;
      return canSeeRecord(db, user, row);
    })
    .filter((row) => !filters.classId || !row.classId || str(row.classId) === str(filters.classId))
    .filter((row) => !filters.category || str(row.category) === customCode(filters.category))
    .filter((row) => filters.isActive === undefined || row.isActive === bool(filters.isActive))
    .sort((a, b) => str(a.name).localeCompare(str(b.name)));
}

function practicalLifeCategory(value) {
  const next = customCode(value, "OTHER");
  return next;
}

function createPracticalLifeActivity(db, user, body = {}) {
  ensureEarlyYearsEnvironmentShape(db);
  assertEnvironmentRole(user);
  let classRow = null;
  if (body.classId || body.className) {
    classRow = assertEnvironmentClassAccess(db, user, body.classId || body.className, "create");
  } else if (!isLeader(user)) {
    const error = new Error("Teachers must attach Practical Life activities to their Early Years class.");
    error.status = 400;
    throw error;
  }
  const timestamp = nowIso();
  const activity = {
    id: randomId("eyfs-practical-life"),
    classId: str(classRow?.id),
    className: str(classRow?.name),
    academicSessionId: str(body.academicSessionId || body.sessionId),
    termId: str(body.termId),
    name: str(body.name),
    category: practicalLifeCategory(body.category),
    purpose: str(body.purpose),
    developmentalStage: str(body.developmentalStage),
    materials: textList(body.materials),
    presentationSteps: textList(body.presentationSteps),
    safetyNotes: str(body.safetyNotes),
    skillsDeveloped: textList(body.skillsDeveloped),
    independenceFocus: str(body.independenceFocus),
    fineMotorFocus: str(body.fineMotorFocus),
    selfRegulationFocus: str(body.selfRegulationFocus),
    responsibilityFocus: str(body.responsibilityFocus),
    curriculumConnections: textList(body.curriculumConnections),
    recommendedAgePhase: str(body.recommendedAgePhase || classRow?.name),
    isActive: body.isActive === undefined ? true : bool(body.isActive),
    createdBy: str(user.id || user.username),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  db.earlyYearsPracticalLifeActivities.unshift(activity);
  appendEnvironmentAuditLog(db, user, "practical_life_activity_created", {
    entityType: "PRACTICAL_LIFE_ACTIVITY",
    entityId: activity.id,
    classId: activity.classId,
    after: activity,
  });
  return activity;
}

function updatePracticalLifeActivity(db, user, activityId, body = {}) {
  ensureEarlyYearsEnvironmentShape(db);
  const activity = findById(db.earlyYearsPracticalLifeActivities, activityId);
  if (activity?.classId) assertRecordClassAccess(db, user, activity, "edit");
  else if (!isLeader(user)) {
    const error = new Error("Only academic leadership can edit shared Practical Life templates.");
    error.status = 403;
    throw error;
  }
  const before = { ...activity };
  Object.assign(activity, {
    name: str(body.name ?? activity.name),
    category: practicalLifeCategory(body.category ?? activity.category),
    purpose: str(body.purpose ?? activity.purpose),
    developmentalStage: str(body.developmentalStage ?? activity.developmentalStage),
    materials: body.materials !== undefined ? textList(body.materials) : activity.materials,
    presentationSteps: body.presentationSteps !== undefined ? textList(body.presentationSteps) : activity.presentationSteps,
    safetyNotes: str(body.safetyNotes ?? activity.safetyNotes),
    skillsDeveloped: body.skillsDeveloped !== undefined ? textList(body.skillsDeveloped) : activity.skillsDeveloped,
    independenceFocus: str(body.independenceFocus ?? activity.independenceFocus),
    fineMotorFocus: str(body.fineMotorFocus ?? activity.fineMotorFocus),
    selfRegulationFocus: str(body.selfRegulationFocus ?? activity.selfRegulationFocus),
    responsibilityFocus: str(body.responsibilityFocus ?? activity.responsibilityFocus),
    curriculumConnections: body.curriculumConnections !== undefined ? textList(body.curriculumConnections) : activity.curriculumConnections,
    recommendedAgePhase: str(body.recommendedAgePhase ?? activity.recommendedAgePhase),
    isActive: body.isActive === undefined ? activity.isActive : bool(body.isActive),
    updatedAt: nowIso(),
  });
  appendEnvironmentAuditLog(db, user, "practical_life_activity_updated", {
    entityType: "PRACTICAL_LIFE_ACTIVITY",
    entityId: activity.id,
    classId: activity.classId,
    before,
    after: activity,
  });
  return activity;
}

function createPracticalLifeAssignment(db, user, body = {}) {
  ensureEarlyYearsEnvironmentShape(db);
  const planDetail = validateWeeklyPlanLink(db, user, body.weeklyPlanId, body.classId);
  const classRow = assertEnvironmentClassAccess(db, user, body.classId || planDetail?.plan?.classId, "create");
  const activity = findById(db.earlyYearsPracticalLifeActivities, body.activityId || body.practicalLifeActivityId);
  if (!activity) {
    const error = new Error("Practical Life activity could not be found.");
    error.status = 404;
    throw error;
  }
  if (activity.classId && str(activity.classId) !== str(classRow.id)) {
    const error = new Error("Practical Life activity does not belong to this class.");
    error.status = 400;
    throw error;
  }
  const timestamp = nowIso();
  const assignment = {
    id: randomId("eyfs-pl-assignment"),
    practicalLifeActivityId: str(activity.id),
    activityName: str(activity.name),
    weeklyPlanId: str(body.weeklyPlanId),
    classId: str(classRow.id),
    className: str(classRow.name),
    academicSessionId: str(body.academicSessionId || body.sessionId || planDetail?.plan?.academicSessionId),
    termId: str(body.termId || planDetail?.plan?.termId),
    curriculumWeekId: str(body.curriculumWeekId || planDetail?.plan?.curriculumWeekId),
    purpose: str(body.purpose || activity.purpose),
    groupMode: str(body.groupMode || body.group || "SMALL_GROUP"),
    plannedDate: str(body.plannedDate),
    adultRole: str(body.adultRole),
    independenceExpectation: str(body.independenceExpectation),
    resources: textList(body.resources || activity.materials),
    adaptations: str(body.adaptations),
    notes: str(body.notes),
    status: normalizeEnum(body.status, ENHANCEMENT_STATUSES, "PLANNED"),
    createdBy: str(user.id || user.username),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  db.earlyYearsPracticalLifeAssignments.unshift(assignment);
  appendEnvironmentAuditLog(db, user, "practical_life_assignment_created", {
    entityType: "PRACTICAL_LIFE_ASSIGNMENT",
    entityId: assignment.id,
    classId: assignment.classId,
    after: assignment,
  });
  return assignment;
}

function listPracticalLifeAssignments(db, user, filters = {}) {
  ensureEarlyYearsEnvironmentShape(db);
  assertEnvironmentRole(user);
  return arr(db.earlyYearsPracticalLifeAssignments)
    .filter((row) => canSeeRecord(db, user, row))
    .filter((row) => !filters.classId || str(row.classId) === str(filters.classId))
    .filter((row) => !filters.weeklyPlanId || str(row.weeklyPlanId) === str(filters.weeklyPlanId))
    .filter((row) => !filters.status || str(row.status) === str(filters.status).toUpperCase())
    .sort((a, b) => str(b.plannedDate || b.createdAt).localeCompare(str(a.plannedDate || a.createdAt)));
}

function deriveChecklistOverall(payload) {
  const statuses = CHECKLIST_DOMAIN_FIELDS.map((field) => payload[field]).filter(Boolean);
  if (statuses.includes("ACTION_REQUIRED") || str(payload.priorityActions)) return "ACTION_REQUIRED";
  if (statuses.includes("DEVELOPING")) return "DEVELOPING";
  if (statuses.length && statuses.every((status) => status === "NOT_APPLICABLE")) return "NOT_APPLICABLE";
  return "SECURE";
}

function sanitizeChecklistPayload(body = {}) {
  const payload = {
    date: str(body.date),
    completedBy: str(body.completedBy),
    hazards: str(body.hazards),
    culturalRepresentationNotes: str(body.culturalRepresentationNotes),
    accessibilityNotes: str(body.accessibilityNotes),
    strengths: str(body.strengths),
    priorityActions: str(body.priorityActions),
    deadline: str(body.deadline),
    responsiblePerson: str(body.responsiblePerson),
    reviewDate: str(body.reviewDate),
    leadershipComment: str(body.leadershipComment),
  };
  CHECKLIST_DOMAIN_FIELDS.forEach((field) => {
    payload[field] = normalizeEnum(body[field], CHECKLIST_STATUSES, "DEVELOPING");
  });
  payload.status = normalizeEnum(body.status, CHECKLIST_STATUSES, deriveChecklistOverall(payload));
  return payload;
}

function syncChecklistAction(db, user, checklist) {
  if (checklist.status !== "ACTION_REQUIRED" && !str(checklist.priorityActions)) return null;
  let action = arr(db.earlyYearsEnvironmentActions).find((row) => str(row.linkedChecklistId) === str(checklist.id));
  const timestamp = nowIso();
  const payload = {
    classId: checklist.classId,
    className: checklist.className,
    academicSessionId: checklist.academicSessionId,
    termId: checklist.termId,
    linkedChecklistId: checklist.id,
    title: "Environment checklist action",
    actionRequired: str(checklist.priorityActions || "Review classroom environment priority."),
    responsiblePerson: str(checklist.responsiblePerson),
    dueDate: str(checklist.deadline || checklist.reviewDate),
    status: action?.status || "OPEN",
    updatedAt: timestamp,
  };
  if (!action) {
    action = {
      id: randomId("eyfs-env-action"),
      createdBy: str(user.id || user.username),
      createdAt: timestamp,
      ...payload,
    };
    db.earlyYearsEnvironmentActions.unshift(action);
  } else {
    Object.assign(action, payload);
  }
  return action;
}

function createEnvironmentChecklist(db, user, body = {}) {
  ensureEarlyYearsEnvironmentShape(db);
  assertSessionTerm(db, body);
  const classRow = assertEnvironmentClassAccess(db, user, body.classId || body.className, "create");
  const timestamp = nowIso();
  const checklist = {
    id: randomId("eyfs-env-checklist"),
    classId: str(classRow.id),
    className: str(classRow.name),
    academicSessionId: str(body.academicSessionId || body.sessionId),
    termId: str(body.termId),
    ...sanitizeChecklistPayload(body),
    completedByUserId: str(user.id || user.username),
    createdBy: str(user.id || user.username),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  if (!checklist.completedBy) checklist.completedBy = str(user.name || user.username);
  db.earlyYearsEnvironmentChecklists.unshift(checklist);
  const action = syncChecklistAction(db, user, checklist);
  appendEnvironmentAuditLog(db, user, "environment_checklist_created", {
    entityType: "ENVIRONMENT_CHECKLIST",
    entityId: checklist.id,
    classId: checklist.classId,
    after: checklist,
    actionId: action?.id,
  });
  return { checklist, action };
}

function updateEnvironmentChecklist(db, user, checklistId, body = {}) {
  ensureEarlyYearsEnvironmentShape(db);
  const checklist = findById(db.earlyYearsEnvironmentChecklists, checklistId);
  assertRecordClassAccess(db, user, checklist, "edit");
  const before = { ...checklist };
  Object.assign(checklist, sanitizeChecklistPayload({ ...checklist, ...body }), {
    reviewedBy: body.leadershipComment && isLeader(user) ? str(user.id || user.username) : checklist.reviewedBy,
    reviewedAt: body.leadershipComment && isLeader(user) ? nowIso() : checklist.reviewedAt,
    updatedAt: nowIso(),
  });
  const action = syncChecklistAction(db, user, checklist);
  appendEnvironmentAuditLog(db, user, "environment_checklist_updated", {
    entityType: "ENVIRONMENT_CHECKLIST",
    entityId: checklist.id,
    classId: checklist.classId,
    before,
    after: checklist,
    actionId: action?.id,
  });
  return { checklist, action };
}

function listEnvironmentChecklists(db, user, filters = {}) {
  ensureEarlyYearsEnvironmentShape(db);
  assertEnvironmentRole(user);
  return arr(db.earlyYearsEnvironmentChecklists)
    .filter((row) => canSeeRecord(db, user, row))
    .filter((row) => !filters.classId || str(row.classId) === str(filters.classId))
    .filter((row) => !filters.status || str(row.status) === str(filters.status).toUpperCase())
    .filter((row) => !filters.academicSessionId || str(row.academicSessionId) === str(filters.academicSessionId))
    .filter((row) => !filters.termId || str(row.termId) === str(filters.termId))
    .sort((a, b) => str(b.date || b.createdAt).localeCompare(str(a.date || a.createdAt)));
}

function listEnvironmentActions(db, user, filters = {}) {
  ensureEarlyYearsEnvironmentShape(db);
  assertEnvironmentRole(user);
  return arr(db.earlyYearsEnvironmentActions)
    .filter((row) => canSeeRecord(db, user, row))
    .filter((row) => !filters.classId || str(row.classId) === str(filters.classId))
    .filter((row) => !filters.status || str(row.status) === str(filters.status).toUpperCase())
    .sort((a, b) => str(a.dueDate || a.createdAt).localeCompare(str(b.dueDate || b.createdAt)));
}

function updateEnvironmentAction(db, user, actionId, body = {}) {
  ensureEarlyYearsEnvironmentShape(db);
  const action = findById(db.earlyYearsEnvironmentActions, actionId);
  assertRecordClassAccess(db, user, action, "edit");
  const before = { ...action };
  Object.assign(action, {
    actionRequired: str(body.actionRequired ?? action.actionRequired),
    responsiblePerson: str(body.responsiblePerson ?? action.responsiblePerson),
    dueDate: str(body.dueDate ?? action.dueDate),
    status: normalizeEnum(body.status ?? action.status, ENVIRONMENT_ACTION_STATUSES, action.status || "OPEN"),
    completionNote: str(body.completionNote ?? action.completionNote),
    completedAt: normalizeEnum(body.status, ENVIRONMENT_ACTION_STATUSES, action.status) === "COMPLETED" ? nowIso() : action.completedAt,
    updatedAt: nowIso(),
  });
  appendEnvironmentAuditLog(db, user, "environment_action_updated", {
    entityType: "ENVIRONMENT_ACTION",
    entityId: action.id,
    classId: action.classId,
    before,
    after: action,
  });
  return action;
}

function createResource(db, user, body = {}) {
  ensureEarlyYearsEnvironmentShape(db);
  let classRow = null;
  if (body.classId || body.className) classRow = assertEnvironmentClassAccess(db, user, body.classId || body.className, "create");
  else if (!isLeader(user)) {
    const error = new Error("Teachers must attach resource records to their Early Years class.");
    error.status = 400;
    throw error;
  }
  const timestamp = nowIso();
  const resource = {
    id: randomId("eyfs-resource"),
    name: str(body.name),
    category: customCode(body.category, "GENERAL"),
    provisionArea: normalizeEnum(body.provisionArea, PROVISION_AREA_TYPES, customCode(body.provisionArea, "OTHER")),
    classId: str(classRow?.id),
    className: str(classRow?.name),
    quantity: numberOr(body.quantity, 1),
    usableQuantity: numberOr(body.usableQuantity, numberOr(body.quantity, 1)),
    condition: normalizeEnum(body.condition, RESOURCE_CONDITIONS, "GOOD"),
    storageLocation: str(body.storageLocation),
    isConsumable: bool(body.isConsumable),
    minimumRequired: numberOr(body.minimumRequired, 0),
    purpose: str(body.purpose),
    actuallyUsed: body.actuallyUsed === undefined ? false : bool(body.actuallyUsed),
    childAccessible: body.childAccessible === undefined ? false : bool(body.childAccessible),
    safetyNote: str(body.safetyNote),
    notes: str(body.notes),
    createdBy: str(user.id || user.username),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  db.earlyYearsResources.unshift(resource);
  appendEnvironmentAuditLog(db, user, "resource_created", {
    entityType: "RESOURCE",
    entityId: resource.id,
    classId: resource.classId,
    after: resource,
  });
  return resource;
}

function updateResource(db, user, resourceId, body = {}) {
  ensureEarlyYearsEnvironmentShape(db);
  const resource = findById(db.earlyYearsResources, resourceId);
  if (resource?.classId) assertRecordClassAccess(db, user, resource, "edit");
  else if (!isLeader(user)) {
    const error = new Error("Only academic leadership can edit shared Early Years resources.");
    error.status = 403;
    throw error;
  }
  const before = { ...resource };
  Object.assign(resource, {
    name: str(body.name ?? resource.name),
    category: customCode(body.category ?? resource.category, "GENERAL"),
    provisionArea: normalizeEnum(body.provisionArea ?? resource.provisionArea, PROVISION_AREA_TYPES, resource.provisionArea || "OTHER"),
    quantity: numberOr(body.quantity ?? resource.quantity, resource.quantity),
    usableQuantity: numberOr(body.usableQuantity ?? resource.usableQuantity, resource.usableQuantity),
    condition: normalizeEnum(body.condition ?? resource.condition, RESOURCE_CONDITIONS, resource.condition || "GOOD"),
    storageLocation: str(body.storageLocation ?? resource.storageLocation),
    isConsumable: body.isConsumable === undefined ? resource.isConsumable : bool(body.isConsumable),
    minimumRequired: numberOr(body.minimumRequired ?? resource.minimumRequired, resource.minimumRequired),
    purpose: str(body.purpose ?? resource.purpose),
    actuallyUsed: body.actuallyUsed === undefined ? resource.actuallyUsed : bool(body.actuallyUsed),
    childAccessible: body.childAccessible === undefined ? resource.childAccessible : bool(body.childAccessible),
    safetyNote: str(body.safetyNote ?? resource.safetyNote),
    notes: str(body.notes ?? resource.notes),
    updatedAt: nowIso(),
  });
  appendEnvironmentAuditLog(db, user, "resource_updated", {
    entityType: "RESOURCE",
    entityId: resource.id,
    classId: resource.classId,
    before,
    after: resource,
  });
  return resource;
}

function listResources(db, user, filters = {}) {
  ensureEarlyYearsEnvironmentShape(db);
  assertEnvironmentRole(user);
  return arr(db.earlyYearsResources)
    .filter((row) => {
      if (!row.classId) return isLeader(user) || true;
      return canSeeRecord(db, user, row);
    })
    .filter((row) => !filters.classId || !row.classId || str(row.classId) === str(filters.classId))
    .filter((row) => !filters.condition || str(row.condition) === str(filters.condition).toUpperCase())
    .filter((row) => !filters.provisionArea || str(row.provisionArea) === str(filters.provisionArea).toUpperCase())
    .sort((a, b) => str(a.name).localeCompare(str(b.name)));
}

function createResourceRequest(db, user, body = {}) {
  ensureEarlyYearsEnvironmentShape(db);
  const classRow = assertEnvironmentClassAccess(db, user, body.classId || body.className, "create");
  const planDetail = validateWeeklyPlanLink(db, user, body.linkedWeeklyPlanId || body.weeklyPlanId, classRow.id);
  const timestamp = nowIso();
  const request = {
    id: randomId("eyfs-resource-request"),
    resource: str(body.resource || body.name),
    reason: str(body.reason),
    quantity: numberOr(body.quantity, 1),
    priority: normalizeEnum(body.priority, RESOURCE_REQUEST_PRIORITIES, "NORMAL"),
    classId: str(classRow.id),
    className: str(classRow.name),
    provisionArea: normalizeEnum(body.provisionArea, PROVISION_AREA_TYPES, customCode(body.provisionArea, "OTHER")),
    linkedWeeklyPlanId: str(body.linkedWeeklyPlanId || body.weeklyPlanId),
    linkedCurriculumWeekId: str(planDetail?.plan?.curriculumWeekId),
    requestedBy: str(user.id || user.username),
    requestedByName: str(user.name || user.username),
    status: "REQUESTED",
    adminNote: "",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  db.earlyYearsResourceRequests.unshift(request);
  appendEnvironmentAuditLog(db, user, "resource_request_created", {
    entityType: "RESOURCE_REQUEST",
    entityId: request.id,
    classId: request.classId,
    after: request,
  });
  return request;
}

function updateResourceRequest(db, user, requestId, body = {}) {
  ensureEarlyYearsEnvironmentShape(db);
  const request = findById(db.earlyYearsResourceRequests, requestId);
  assertRecordClassAccess(db, user, request, "edit");
  const requestedStatus = body.status === undefined ? request.status : normalizeEnum(body.status, RESOURCE_REQUEST_STATUSES, request.status);
  if (requestedStatus !== request.status && !isLeader(user)) {
    const error = new Error("Only academic leadership can review or approve Early Years resource requests.");
    error.status = 403;
    throw error;
  }
  const before = { ...request };
  Object.assign(request, {
    resource: str(body.resource ?? request.resource),
    reason: str(body.reason ?? request.reason),
    quantity: numberOr(body.quantity ?? request.quantity, request.quantity),
    priority: normalizeEnum(body.priority ?? request.priority, RESOURCE_REQUEST_PRIORITIES, request.priority || "NORMAL"),
    provisionArea: normalizeEnum(body.provisionArea ?? request.provisionArea, PROVISION_AREA_TYPES, request.provisionArea || "OTHER"),
    status: requestedStatus,
    adminNote: str(body.adminNote ?? request.adminNote),
    reviewedBy: requestedStatus !== before.status ? str(user.id || user.username) : request.reviewedBy,
    reviewedAt: requestedStatus !== before.status ? nowIso() : request.reviewedAt,
    updatedAt: nowIso(),
  });
  appendEnvironmentAuditLog(db, user, "resource_request_updated", {
    entityType: "RESOURCE_REQUEST",
    entityId: request.id,
    classId: request.classId,
    before,
    after: request,
  });
  return request;
}

function listResourceRequests(db, user, filters = {}) {
  ensureEarlyYearsEnvironmentShape(db);
  assertEnvironmentRole(user);
  return arr(db.earlyYearsResourceRequests)
    .filter((row) => canSeeRecord(db, user, row))
    .filter((row) => !filters.classId || str(row.classId) === str(filters.classId))
    .filter((row) => !filters.status || str(row.status) === str(filters.status).toUpperCase())
    .sort((a, b) => str(b.createdAt).localeCompare(str(a.createdAt)));
}

function createEnvironmentReview(db, user, body = {}) {
  ensureEarlyYearsEnvironmentShape(db);
  const enhancement = body.weeklyEnhancementId ? findById(db.earlyYearsWeeklyProvisionEnhancements, body.weeklyEnhancementId) : null;
  const classRef = body.classId || enhancement?.classId;
  const classRow = assertEnvironmentClassAccess(db, user, classRef, "create");
  if (enhancement && str(enhancement.classId) !== str(classRow.id)) {
    const error = new Error("Weekly enhancement does not belong to this class.");
    error.status = 400;
    throw error;
  }
  const decision = normalizeEnum(body.reviewDecision || body.decision, REVIEW_DECISIONS, "ADAPT");
  const timestamp = nowIso();
  const review = {
    id: randomId("eyfs-env-review"),
    classId: str(classRow.id),
    className: str(classRow.name),
    weeklyPlanId: str(body.weeklyPlanId || enhancement?.weeklyPlanId),
    weeklyEnhancementId: str(body.weeklyEnhancementId),
    provisionAreaId: str(body.provisionAreaId || enhancement?.provisionAreaId),
    reviewDate: str(body.reviewDate),
    cycleStage: normalizeEnum(body.cycleStage, PREPARED_ENVIRONMENT_CYCLE, "OBSERVE"),
    reviewDecision: decision,
    observedUse: str(body.observedUse),
    visibleLearning: str(body.visibleLearning),
    languageObserved: str(body.languageObserved),
    barriers: str(body.barriers),
    changeNeeded: str(body.changeNeeded),
    nextWeeklyPlanFeedForward: str(body.nextWeeklyPlanFeedForward),
    notes: str(body.notes),
    createdBy: str(user.id || user.username),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  db.earlyYearsEnvironmentReviews.unshift(review);
  if (enhancement) {
    enhancement.reviewDecision = decision;
    enhancement.reviewNotes = review.changeNeeded || review.nextWeeklyPlanFeedForward || review.notes;
    enhancement.status = "REVIEWED";
    enhancement.updatedAt = timestamp;
  }
  appendEnvironmentAuditLog(db, user, "environment_review_created", {
    entityType: "ENVIRONMENT_REVIEW",
    entityId: review.id,
    classId: review.classId,
    after: review,
  });
  return review;
}

function listEnvironmentReviews(db, user, filters = {}) {
  ensureEarlyYearsEnvironmentShape(db);
  assertEnvironmentRole(user);
  return arr(db.earlyYearsEnvironmentReviews)
    .filter((row) => canSeeRecord(db, user, row))
    .filter((row) => !filters.classId || str(row.classId) === str(filters.classId))
    .filter((row) => !filters.weeklyEnhancementId || str(row.weeklyEnhancementId) === str(filters.weeklyEnhancementId))
    .sort((a, b) => str(b.reviewDate || b.createdAt).localeCompare(str(a.reviewDate || a.createdAt)));
}

function createDisplayReview(db, user, body = {}) {
  ensureEarlyYearsEnvironmentShape(db);
  const classRow = assertEnvironmentClassAccess(db, user, body.classId || body.className, "create");
  const timestamp = nowIso();
  const review = {
    id: randomId("eyfs-display"),
    classId: str(classRow.id),
    className: str(classRow.name),
    displayTitle: str(body.displayTitle),
    purpose: str(body.purpose),
    curriculumConnection: str(body.curriculumConnection),
    childWorkIncluded: bool(body.childWorkIncluded),
    vocabularySupport: str(body.vocabularySupport),
    isCurrent: body.isCurrent === undefined ? true : bool(body.isCurrent),
    reviewDate: str(body.reviewDate),
    notes: str(body.notes),
    createdBy: str(user.id || user.username),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  db.earlyYearsDisplayReviews.unshift(review);
  appendEnvironmentAuditLog(db, user, "display_review_created", {
    entityType: "DISPLAY_REVIEW",
    entityId: review.id,
    classId: review.classId,
    after: review,
  });
  return review;
}

function listDisplayReviews(db, user, filters = {}) {
  ensureEarlyYearsEnvironmentShape(db);
  assertEnvironmentRole(user);
  return arr(db.earlyYearsDisplayReviews)
    .filter((row) => canSeeRecord(db, user, row))
    .filter((row) => !filters.classId || str(row.classId) === str(filters.classId))
    .sort((a, b) => str(b.reviewDate || b.createdAt).localeCompare(str(a.reviewDate || a.createdAt)));
}

function getEnvironmentDashboard(db, user, filters = {}) {
  ensureEarlyYearsEnvironmentShape(db);
  assertEnvironmentRole(user);
  const classes = listAccessibleEarlyYearsClasses(db, user);
  const selectedClassId = str(filters.classId || classes[0]?.id);
  const classRow = selectedClassId ? assertEnvironmentClassAccess(db, user, selectedClassId, "view") : null;
  const scoped = { ...filters, classId: selectedClassId };
  const areas = selectedClassId ? listProvisionAreas(db, user, scoped) : [];
  const enhancements = selectedClassId ? listWeeklyEnhancements(db, user, scoped) : [];
  const assignments = selectedClassId ? listPracticalLifeAssignments(db, user, scoped) : [];
  const checklists = selectedClassId ? listEnvironmentChecklists(db, user, scoped) : [];
  const actions = selectedClassId ? listEnvironmentActions(db, user, scoped) : [];
  const resources = selectedClassId ? listResources(db, user, scoped) : [];
  const requests = selectedClassId ? listResourceRequests(db, user, scoped) : [];
  const resourcesNeedingAttention = resources.filter((row) => ["NEEDS_REPAIR", "REPLACE"].includes(row.condition));
  const openActions = actions.filter((row) => !["COMPLETED", "CLOSED"].includes(row.status));
  const overdueActions = openActions.filter((row) => row.dueDate && row.dueDate < new Date().toISOString().slice(0, 10));
  return {
    classes,
    selectedClass: classRow,
    practicalLifeGuidance: classRow ? classPhaseGuidance(classRow.id) : null,
    cycle: PREPARED_ENVIRONMENT_CYCLE,
    summary: {
      secure: checklists.filter((row) => row.status === "SECURE").length,
      developing: checklists.filter((row) => row.status === "DEVELOPING").length,
      actionRequired: checklists.filter((row) => row.status === "ACTION_REQUIRED").length,
      activeProvisionAreas: areas.filter((row) => row.isActive !== false).length,
      currentEnhancements: enhancements.filter((row) => ["PLANNED", "IN_USE"].includes(row.status)).length,
      practicalLifeFocus: assignments.length,
      outdoorFocus: enhancements.filter((row) => row.areaType === "OUTDOOR" || row.outdoorConnection).length,
      openActions: openActions.length,
      overdueActions: overdueActions.length,
      resourceRequests: requests.filter((row) => !["CLOSED", "DECLINED"].includes(row.status)).length,
      resourcesNeedingAttention: resourcesNeedingAttention.length,
    },
    latestChecklist: checklists[0] || null,
    provisionAreas: areas,
    currentEnhancements: enhancements.slice(0, 10),
    practicalLifeAssignments: assignments.slice(0, 10),
    openActions: openActions.slice(0, 10),
    resourcesNeedingAttention: resourcesNeedingAttention.slice(0, 10),
    resourceRequests: requests.slice(0, 10),
  };
}

function escapeHtml(value) {
  return str(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildChecklistPrintHtml(checklist) {
  if (!checklist) {
    const error = new Error("Environment checklist could not be found.");
    error.status = 404;
    throw error;
  }
  const rows = CHECKLIST_DOMAIN_FIELDS.map((field) => `<tr><td>${escapeHtml(field.replace(/Status$/, ""))}</td><td>${escapeHtml(checklist[field])}</td></tr>`).join("");
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Angel Montessori Environment Checklist</title>
  <style>
    body { font-family: Arial, sans-serif; color: #102a4c; margin: 28px; line-height: 1.45; }
    header { border-bottom: 3px solid #1d5fa9; padding-bottom: 14px; margin-bottom: 18px; }
    h1 { color: #173a70; margin: 0 0 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border: 1px solid #d8e4f2; padding: 8px; text-align: left; vertical-align: top; }
    .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 12px 0; }
    .meta div, section { border: 1px solid #d8e4f2; border-radius: 8px; padding: 10px; }
    @media print { .no-print { display: none; } body { margin: 16mm; } }
  </style>
</head>
<body>
  <button class="no-print" onclick="window.print()">Print / Save PDF</button>
  <header>
    <div>Angel Montessori School</div>
    <h1>Early Years Environment Checklist</h1>
  </header>
  <div class="meta">
    <div><strong>Class</strong><br>${escapeHtml(checklist.className)}</div>
    <div><strong>Date</strong><br>${escapeHtml(checklist.date || checklist.createdAt)}</div>
    <div><strong>Status</strong><br>${escapeHtml(checklist.status)}</div>
    <div><strong>Teacher</strong><br>${escapeHtml(checklist.completedBy)}</div>
    <div><strong>Session</strong><br>${escapeHtml(checklist.academicSessionId)}</div>
    <div><strong>Term</strong><br>${escapeHtml(checklist.termId)}</div>
  </div>
  <table><thead><tr><th>Domain</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
  <section><strong>Strengths</strong><br>${escapeHtml(checklist.strengths)}</section>
  <section><strong>Priority Actions</strong><br>${escapeHtml(checklist.priorityActions)}</section>
  <section><strong>Responsible / Review</strong><br>${escapeHtml(checklist.responsiblePerson)} - ${escapeHtml(checklist.reviewDate || checklist.deadline)}</section>
  <section><strong>Accessibility Boundary</strong><br>General class provision actions are shown here. Confidential child-level SEND details are excluded from this printout.</section>
</body>
</html>`;
}

function buildResourceRequestPrintHtml(request) {
  if (!request) {
    const error = new Error("Resource request could not be found.");
    error.status = 404;
    throw error;
  }
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Angel Montessori Resource Request</title>
  <style>
    body { font-family: Arial, sans-serif; color: #102a4c; margin: 28px; line-height: 1.45; }
    header { border-bottom: 3px solid #1d5fa9; padding-bottom: 14px; margin-bottom: 18px; }
    h1 { color: #173a70; margin: 0 0 8px; }
    .meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin: 12px 0; }
    .meta div, section { border: 1px solid #d8e4f2; border-radius: 8px; padding: 10px; }
    @media print { .no-print { display: none; } body { margin: 16mm; } }
  </style>
</head>
<body>
  <button class="no-print" onclick="window.print()">Print / Save PDF</button>
  <header>
    <div>Angel Montessori School</div>
    <h1>Early Years Resource Request</h1>
  </header>
  <div class="meta">
    <div><strong>Class</strong><br>${escapeHtml(request.className)}</div>
    <div><strong>Teacher</strong><br>${escapeHtml(request.requestedByName)}</div>
    <div><strong>Resource</strong><br>${escapeHtml(request.resource)}</div>
    <div><strong>Quantity</strong><br>${escapeHtml(request.quantity)}</div>
    <div><strong>Priority</strong><br>${escapeHtml(request.priority)}</div>
    <div><strong>Status</strong><br>${escapeHtml(request.status)}</div>
  </div>
  <section><strong>Purpose / Reason</strong><br>${escapeHtml(request.reason)}</section>
  <section><strong>Provision Area</strong><br>${escapeHtml(request.provisionArea)}</section>
  <section><strong>Admin Note</strong><br>${escapeHtml(request.adminNote)}</section>
</body>
</html>`;
}

module.exports = {
  CHECKLIST_DOMAIN_FIELDS,
  CHECKLIST_STATUSES,
  ENHANCEMENT_STATUSES,
  ENVIRONMENT_ACTION_STATUSES,
  ENVIRONMENT_ROLES,
  LEADER_ROLES,
  PRACTICAL_LIFE_CATEGORIES,
  PRACTICAL_LIFE_PROGRESSION,
  PREPARED_ENVIRONMENT_CYCLE,
  PROVISION_AREA_TYPES,
  RESOURCE_CONDITIONS,
  RESOURCE_REQUEST_PRIORITIES,
  RESOURCE_REQUEST_STATUSES,
  REVIEW_DECISIONS,
  appendEnvironmentAuditLog,
  assertEnvironmentClassAccess,
  buildChecklistPrintHtml,
  buildResourceRequestPrintHtml,
  createDisplayReview,
  createEnvironmentChecklist,
  createEnvironmentReview,
  createPracticalLifeActivity,
  createPracticalLifeAssignment,
  createProvisionArea,
  createResource,
  createResourceRequest,
  createWeeklyEnhancement,
  ensureEarlyYearsEnvironmentShape,
  getEnvironmentDashboard,
  listDisplayReviews,
  listEnvironmentActions,
  listEnvironmentChecklists,
  listEnvironmentReviews,
  listPracticalLifeActivities,
  listPracticalLifeAssignments,
  listProvisionAreas,
  listResourceRequests,
  listResources,
  listWeeklyEnhancements,
  updateEnvironmentAction,
  updateEnvironmentChecklist,
  updatePracticalLifeActivity,
  updateProvisionArea,
  updateResource,
  updateResourceRequest,
  updateWeeklyEnhancement,
};
