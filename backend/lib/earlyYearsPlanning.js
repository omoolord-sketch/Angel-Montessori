const { randomUUID } = require("crypto");
const {
  CURRICULUM_MANAGE_ROLES,
  SOURCE_DOCUMENT,
  SOURCE_VERSION,
  appendCurriculumAuditLog,
  assertEarlyYearsClassAccess,
  ensureEarlyYearsCurriculumShape,
  findAcademicSession,
  findAcademicTerm,
  getFramework,
  listCurriculum,
  str,
  teacherAssignedClassIds,
} = require("./earlyYearsCurriculum");
const { normalizeAcademicKey } = require("./academicSystems");

const PLAN_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "REVIEWED",
  "APPROVED",
  "RETURNED_FOR_REVISION",
  "ARCHIVED",
];

const TEACHER_EDIT_STATUSES = ["DRAFT", "RETURNED_FOR_REVISION"];
const REVIEW_ROLES = ["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER"];
const PLAN_ROLES = ["TEACHER", ...REVIEW_ROLES];

const TEXT_FIELDS = [
  "weeklyPriorities",
  "keyVocabularyFocus",
  "directTeaching",
  "purposefulPlayProvision",
  "continuousProvisionEnhancements",
  "practicalLifePlan",
  "outdoorLearningPlan",
  "christianCharacterPlan",
  "nigerianAfricanContextPlan",
  "technologyUse",
  "sendAccessAdjustments",
  "parentHomeConnection",
  "assessmentFocus",
  "observationFocus",
  "teacherReflection",
  "teacherNotes",
  "adultDeployment",
  "grouping",
  "readingPlan",
  "writingPlan",
  "mathematicsPlan",
  "schoolReadinessPlan",
];

const DAILY_FIELDS = [
  "plannedTeaching",
  "actualTeaching",
  "childrenRequiringRevisit",
  "childrenReadyForExtension",
  "unexpectedLearning",
  "significantObservations",
  "resourcesAdjusted",
  "provisionChanges",
  "sendAdjustments",
  "parentCommunicationNote",
  "reflection",
  "nextDayAdjustment",
];

const REVIEW_FIELDS = [
  "learningSecure",
  "learningDeveloping",
  "misconceptions",
  "supportNeeded",
  "challengeNeeded",
  "resourcesWorked",
  "changesNeeded",
  "revisitNextWeek",
  "parentPartnershipNotes",
  "sendAccessReview",
  "professionalReflection",
];

const COPY_STRUCTURE_FIELDS = [
  "coreTexts",
  "resources",
  "grouping",
  "adultDeployment",
  "continuousProvisionEnhancements",
  "practicalLifePlan",
  "outdoorLearningPlan",
  "technologyUse",
  "sendAccessAdjustments",
  "parentHomeConnection",
  "teacherNotes",
];

function nowIso() {
  return new Date().toISOString();
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

function randomId(prefix) {
  return `${prefix}-${randomUUID().slice(0, 10)}`;
}

function textList(value) {
  if (Array.isArray(value)) return value.map(str).filter(Boolean);
  return str(value)
    .split(/\r?\n|,/)
    .map(str)
    .filter(Boolean);
}

function oneLine(value) {
  return str(value).replace(/\s+/g, " ");
}

function ensureEarlyYearsPlanningShape(db) {
  const curriculum = ensureEarlyYearsCurriculumShape(db);
  let mutated = Boolean(curriculum.mutated);
  [
    "curriculumTeacherPlans",
    "curriculumDailyTeachingRecords",
    "curriculumWeeklyPlanReviews",
    "curriculumPlanAmendments",
    "curriculumAuditLogs",
  ].forEach((key) => {
    if (!Array.isArray(db[key])) {
      db[key] = [];
      mutated = true;
    }
  });

  db.curriculumTeacherPlans.forEach((plan) => {
    const status = str(plan.planStatus || plan.status || "DRAFT").toUpperCase();
    if (plan.planStatus !== status) {
      plan.planStatus = PLAN_STATUSES.includes(status) ? status : "DRAFT";
      mutated = true;
    }
    if (!plan.status || plan.status !== plan.planStatus) {
      plan.status = plan.planStatus;
      mutated = true;
    }
    if (!plan.contributors) {
      plan.contributors = [str(plan.teacherId || plan.teacherUserId || plan.createdBy)].filter(Boolean);
      mutated = true;
    }
  });

  return { mutated };
}

function phaseGuidance(classLevelCode) {
  const key = normalizeAcademicKey(classLevelCode);
  if (key === "creche") {
    return {
      phase: "Crèche",
      requiresReceptionPhonics: false,
      emphasis: [
        "relationships and care routines",
        "communication through songs, books, naming and response",
        "movement, sensory exploration and wellbeing",
        "Practical Life beginnings and responsive interaction",
      ],
      message: "Keep this plan light, responsive, relational and care-integrated.",
    };
  }
  if (key === "nursery") {
    return {
      phase: "Nursery",
      requiresReceptionPhonics: false,
      emphasis: [
        "language, stories and phonological awareness",
        "number sense, investigation and purposeful play",
        "Practical Life, outdoor learning and independence",
      ],
      message: "Nursery planning supports rich foundations without imposing Reception SSP sequencing.",
    };
  }
  return {
    phase: "Reception",
    requiresReceptionPhonics: true,
    emphasis: [
      "systematic phonics reference",
      "reading, writing and mathematical modelling",
      "school readiness through purposeful play and independence",
    ],
    message: "Reception planning may reference the adopted SSP programme without inventing a separate sequence.",
  };
}

function getWeekContext(db, weekId, user, filters = {}) {
  ensureEarlyYearsPlanningShape(db);
  const id = str(weekId);
  const week = arr(db.curriculumWeeks).find((row) => str(row.id) === id || str(row.code) === id);
  if (!week) {
    const error = new Error("Curriculum week could not be found.");
    error.status = 404;
    throw error;
  }

  const term = arr(db.curriculumTerms).find((row) => str(row.id) === str(week.curriculumTermId));
  if (!term) {
    const error = new Error("Curriculum term could not be found for this week.");
    error.status = 404;
    throw error;
  }

  const curriculum = listCurriculum(db, {
    frameworkId: term.frameworkId,
    classId: term.classId || term.classLevelCode,
    termName: term.termName,
    sessionId: filters.sessionId || term.academicSessionId,
  }, user);
  const enrichedWeek = curriculum.weeks.find((row) => str(row.id) === str(week.id));
  if (!enrichedWeek) {
    const error = new Error("You do not have access to this curriculum week.");
    error.status = 403;
    throw error;
  }

  return {
    framework: curriculum.framework || getFramework(db),
    classRow: curriculum.class,
    classLevel: curriculum.classLevel,
    term,
    week: enrichedWeek,
    rawWeek: week,
  };
}

function buildCurriculumSnapshot(context) {
  const itemRows = arr(context.week.items);
  const vocabulary = new Set();
  const eyfsAreas = new Map();
  const dimensions = new Set();
  const practicalLife = [];
  const outdoorLearning = [];
  const christianCharacter = [];
  const nigerianAfricanContext = [];
  const continuousProvision = [];
  const assessmentFocus = [];
  const phonicsProgrammes = new Set();

  itemRows.forEach((item) => {
    arr(item.keyVocabulary).forEach((word) => {
      if (str(word)) vocabulary.add(str(word));
    });
    if (item.eyfsArea) eyfsAreas.set(str(item.eyfsArea), str(item.eyfsArea));
    arr(item.dimensionCodes).forEach((dimension) => {
      if (str(dimension)) dimensions.add(str(dimension));
    });
    if (str(item.practicalLife)) practicalLife.push(str(item.practicalLife));
    if (str(item.outdoorLearning)) outdoorLearning.push(str(item.outdoorLearning));
    if (str(item.christianCharacter)) christianCharacter.push(str(item.christianCharacter));
    if (str(item.nigerianAfricanContext)) nigerianAfricanContext.push(str(item.nigerianAfricanContext));
    if (str(item.continuousProvision)) continuousProvision.push(str(item.continuousProvision));
    if (str(item.assessmentFocus)) assessmentFocus.push(str(item.assessmentFocus));
    if (str(item.phonicsProgramme)) phonicsProgrammes.add(str(item.phonicsProgramme));
  });

  return {
    lockedFromEditing: true,
    frameworkId: str(context.framework?.id),
    frameworkCode: str(context.framework?.code),
    curriculumVersion: str(context.framework?.version || SOURCE_VERSION),
    sourceDocument: SOURCE_DOCUMENT,
    sourceVersion: SOURCE_VERSION,
    curriculumWeekId: str(context.week.id),
    curriculumWeekCode: str(context.week.code),
    curriculumTermId: str(context.term?.id),
    classId: str(context.classRow?.id),
    className: str(context.classRow?.name || context.term?.className),
    classLevelCode: str(context.classLevel?.code || context.term?.classLevelCode),
    termName: str(context.term?.termName),
    weekNumber: context.week.weekNumber,
    weekLabel: str(context.week.weekLabel),
    weekTitle: str(context.week.title),
    bigIdea: str(context.week.bigIdea),
    mainDevelopment: str(context.week.mainDevelopment),
    curriculumIntent: str(context.week.curriculumIntent),
    eyfsAreas: Array.from(eyfsAreas.values()),
    keyVocabulary: Array.from(vocabulary),
    amesDimensions: Array.from(dimensions),
    practicalLife: practicalLife.slice(0, 12),
    outdoorLearning: outdoorLearning.slice(0, 12),
    christianCharacter: christianCharacter.slice(0, 12),
    nigerianAfricanContext: nigerianAfricanContext.slice(0, 12),
    continuousProvision: continuousProvision.slice(0, 12),
    assessmentFocus: assessmentFocus.slice(0, 12),
    sourceSection: str(context.week.sourceSection),
    sourcePage: str(context.week.sourcePage),
    phonicsProgramme: Array.from(phonicsProgrammes).join(", "),
    capturedAt: nowIso(),
  };
}

function sanitizePlanPayload(body = {}) {
  const payload = {};
  TEXT_FIELDS.forEach((field) => {
    if (body[field] !== undefined) payload[field] = str(body[field]);
  });
  if (body.plannedStartDate !== undefined) payload.plannedStartDate = str(body.plannedStartDate);
  if (body.plannedEndDate !== undefined) payload.plannedEndDate = str(body.plannedEndDate);
  if (body.coreTexts !== undefined) payload.coreTexts = textList(body.coreTexts);
  if (body.resources !== undefined) payload.resources = textList(body.resources);
  if (body.phonicsImplementation !== undefined) {
    const source = body.phonicsImplementation || {};
    payload.phonicsImplementation = {
      programmePoint: str(source.programmePoint),
      reviewFocus: str(source.reviewFocus),
      blendingFocus: str(source.blendingFocus),
      segmentingFocus: str(source.segmentingFocus),
      decodableReadingFocus: str(source.decodableReadingFocus),
    };
  }
  return payload;
}

function planKeyFields(plan) {
  return {
    academicSessionId: str(plan.academicSessionId || plan.sessionId || "TEMPLATE"),
    termId: str(plan.termId || plan.curriculumTermId || plan.termName),
    classId: str(plan.classId),
    curriculumWeekId: str(plan.curriculumWeekId),
  };
}

function sameLogicalPlan(a, b) {
  const left = planKeyFields(a);
  const right = planKeyFields(b);
  return left.academicSessionId === right.academicSessionId
    && left.termId === right.termId
    && left.classId === right.classId
    && left.curriculumWeekId === right.curriculumWeekId
    && str(a.planStatus || a.status).toUpperCase() !== "ARCHIVED";
}

function assertPlanAccess(db, plan, user, action = "view") {
  if (!plan) {
    const error = new Error("Weekly plan could not be found.");
    error.status = 404;
    throw error;
  }
  if (hasAnyRole(user, REVIEW_ROLES)) return true;
  if (roleOf(user) !== "TEACHER") {
    const error = new Error("You do not have access to Early Years teacher planning.");
    error.status = 403;
    throw error;
  }

  const classRow = assertEarlyYearsClassAccess(db, user, plan.classId || plan.className);
  const assigned = teacherAssignedClassIds(db, user);
  const userId = str(user?.id);
  const contributor = arr(plan.contributors).map(str).includes(userId);
  const owns = [plan.createdBy, plan.teacherId, plan.teacherUserId].map(str).includes(userId);
  const assignedToClass = assigned.has(str(plan.classId)) || assigned.has(str(classRow.id));
  if (assignedToClass || owns || contributor) return true;

  const error = new Error(action === "view"
    ? "You do not have access to this weekly plan."
    : "You cannot change a plan for an unassigned Early Years class.");
  error.status = 403;
  throw error;
}

function statusOf(plan) {
  return str(plan.planStatus || plan.status || "DRAFT").toUpperCase();
}

function createWeeklyPlanFromCurriculum(db, weekId, user = {}, body = {}) {
  const context = getWeekContext(db, weekId, user, body);
  const sessionId = str(body.academicSessionId || body.sessionId || context.term.academicSessionId || "TEMPLATE");
  const termId = str(body.termId || context.term.termId || context.term.id || context.term.termName);
  const requestedSession = sessionId !== "TEMPLATE" ? findAcademicSession(db, sessionId) : null;
  const requestedTerm = findAcademicTerm(db, termId, requestedSession?.id || sessionId);
  if (sessionId !== "TEMPLATE" && !requestedSession) {
    const error = new Error("Academic session could not be found.");
    error.status = 400;
    throw error;
  }
  if (body.termId && !requestedTerm && str(context.term.id) !== termId) {
    const error = new Error("Academic term could not be found for this session.");
    error.status = 400;
    throw error;
  }

  const logical = {
    academicSessionId: sessionId,
    termId,
    classId: context.classRow.id,
    curriculumWeekId: context.week.id,
  };
  const existing = arr(db.curriculumTeacherPlans).find((plan) => sameLogicalPlan(plan, logical));
  if (existing) {
    assertPlanAccess(db, existing, user);
    return { plan: existing, created: false, duplicatePrevented: true };
  }

  const timestamp = nowIso();
  const plan = {
    id: randomId("curriculum-plan"),
    teacherId: str(user.id),
    teacherUserId: str(user.id),
    teacherName: str(user.name || user.username),
    createdBy: str(user.id),
    createdByName: str(user.name || user.username),
    createdByRole: roleOf(user),
    contributors: [str(user.id)].filter(Boolean),
    classId: context.classRow.id,
    className: context.classRow.name,
    classLevelCode: context.classLevel?.code || context.term.classLevelCode,
    academicSessionId: sessionId,
    sessionId,
    termId,
    curriculumTermId: context.term.id,
    termName: context.term.termName,
    curriculumFrameworkId: context.framework?.id || "",
    curriculumVersionId: `${context.framework?.id || "ames-volume-iii"}-version-${SOURCE_VERSION}`,
    curriculumWeekId: context.week.id,
    curriculumWeekCode: context.week.code,
    weekNumber: context.week.weekNumber,
    weekLabel: context.week.weekLabel,
    planStatus: "DRAFT",
    status: "DRAFT",
    plannedStartDate: str(body.plannedStartDate || context.week.plannedStartDate),
    plannedEndDate: str(body.plannedEndDate || context.week.plannedEndDate),
    curriculumSnapshot: buildCurriculumSnapshot(context),
    phaseGuidance: phaseGuidance(context.classLevel?.code || context.term.classLevelCode),
    weeklyPriorities: "",
    keyVocabularyFocus: "",
    coreTexts: [],
    resources: [],
    grouping: "",
    adultDeployment: "",
    directTeaching: "",
    purposefulPlayProvision: "",
    continuousProvisionEnhancements: "",
    practicalLifePlan: "",
    outdoorLearningPlan: "",
    christianCharacterPlan: "",
    nigerianAfricanContextPlan: "",
    technologyUse: "",
    sendAccessAdjustments: "",
    parentHomeConnection: "",
    assessmentFocus: "",
    observationFocus: "",
    teacherReflection: "",
    teacherNotes: "",
    readingPlan: "",
    writingPlan: "",
    mathematicsPlan: "",
    schoolReadinessPlan: "",
    phonicsImplementation: {
      programmePoint: "",
      reviewFocus: "",
      blendingFocus: "",
      segmentingFocus: "",
      decodableReadingFocus: "",
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  Object.assign(plan, sanitizePlanPayload(body));
  db.curriculumTeacherPlans.unshift(plan);
  appendCurriculumAuditLog(db, user, "weekly_plan_created", {
    planId: plan.id,
    classId: plan.classId,
    classLevelCode: plan.classLevelCode,
    termName: plan.termName,
    curriculumWeekId: plan.curriculumWeekId,
    planStatus: plan.planStatus,
  });
  return { plan, created: true, duplicatePrevented: false };
}

function listWeeklyPlans(db, filters = {}, user = {}) {
  ensureEarlyYearsPlanningShape(db);
  const rows = arr(db.curriculumTeacherPlans).filter((plan) => {
    try {
      assertPlanAccess(db, plan, user);
    } catch {
      return false;
    }
    if (filters.status && statusOf(plan) !== str(filters.status).toUpperCase()) return false;
    if (filters.classId && str(plan.classId) !== str(filters.classId)) return false;
    if (filters.sessionId && str(plan.academicSessionId || plan.sessionId) !== str(filters.sessionId)) return false;
    if (filters.termId && str(plan.termId || plan.curriculumTermId) !== str(filters.termId)) return false;
    if (filters.weekId && str(plan.curriculumWeekId) !== str(filters.weekId)) return false;
    if (filters.teacherId) {
      const teacherId = str(filters.teacherId);
      if (str(plan.teacherId || plan.teacherUserId) !== teacherId && !arr(plan.contributors).map(str).includes(teacherId)) return false;
    }
    return statusOf(plan) !== "ARCHIVED" || str(filters.status).toUpperCase() === "ARCHIVED";
  }).sort((a, b) => str(b.updatedAt).localeCompare(str(a.updatedAt)));

  const summary = PLAN_STATUSES.reduce((out, status) => {
    out[status] = rows.filter((plan) => statusOf(plan) === status).length;
    return out;
  }, {});
  summary.notStarted = 0;
  return { plans: rows, summary };
}

function getWeeklyPlanDetail(db, planId, user = {}) {
  ensureEarlyYearsPlanningShape(db);
  const plan = arr(db.curriculumTeacherPlans).find((row) => str(row.id) === str(planId));
  assertPlanAccess(db, plan, user);
  return {
    plan,
    dailyRecords: arr(db.curriculumDailyTeachingRecords)
      .filter((row) => str(row.weeklyPlanId) === str(plan.id))
      .sort((a, b) => str(a.date || a.createdAt).localeCompare(str(b.date || b.createdAt))),
    weeklyReview: arr(db.curriculumWeeklyPlanReviews).find((row) => str(row.weeklyPlanId) === str(plan.id)) || null,
    auditTrail: arr(db.curriculumAuditLogs)
      .filter((row) => str(row.details?.planId) === str(plan.id))
      .slice(0, 50),
    phaseGuidance: plan.phaseGuidance || phaseGuidance(plan.classLevelCode),
  };
}

function assertEditablePlan(db, plan, user) {
  assertPlanAccess(db, plan, user, "edit");
  if (!TEACHER_EDIT_STATUSES.includes(statusOf(plan))) {
    const error = new Error("This weekly plan cannot be silently rewritten in its current status.");
    error.status = 409;
    throw error;
  }
}

function updateWeeklyPlan(db, planId, user = {}, body = {}) {
  ensureEarlyYearsPlanningShape(db);
  const plan = arr(db.curriculumTeacherPlans).find((row) => str(row.id) === str(planId));
  assertEditablePlan(db, plan, user);
  const before = sanitizePlanPayload(plan);
  const patch = sanitizePlanPayload(body);
  Object.assign(plan, patch, {
    updatedAt: nowIso(),
    lastEditedBy: str(user.id),
    lastEditedByName: str(user.name || user.username),
  });
  appendCurriculumAuditLog(db, user, "weekly_plan_updated", {
    planId: plan.id,
    planStatus: plan.planStatus,
    before,
    after: patch,
  });
  return plan;
}

function validateSubmission(plan) {
  const missing = [];
  if (!str(plan.curriculumWeekId)) missing.push("curriculum link");
  if (!str(plan.weeklyPriorities)) missing.push("weekly priorities");
  if (!str(plan.directTeaching) && !str(plan.purposefulPlayProvision) && !str(plan.continuousProvisionEnhancements)) {
    missing.push("planned teaching or provision");
  }
  if (!arr(plan.resources).length && !str(plan.teacherNotes)) missing.push("resources or teacher notes");
  if (!str(plan.assessmentFocus) && !str(plan.observationFocus)) missing.push("assessment or observation focus");
  if (missing.length) {
    const error = new Error(`Before submission, complete: ${missing.join(", ")}.`);
    error.status = 400;
    throw error;
  }
}

function submitWeeklyPlan(db, planId, user = {}) {
  const plan = arr(db.curriculumTeacherPlans).find((row) => str(row.id) === str(planId));
  assertEditablePlan(db, plan, user);
  validateSubmission(plan);
  plan.planStatus = "SUBMITTED";
  plan.status = "SUBMITTED";
  plan.submittedAt = nowIso();
  plan.submittedBy = str(user.id);
  plan.updatedAt = nowIso();
  appendCurriculumAuditLog(db, user, "weekly_plan_submitted", { planId: plan.id, planStatus: plan.planStatus });
  return plan;
}

function assertReviewer(user) {
  if (hasAnyRole(user, REVIEW_ROLES)) return;
  const error = new Error("Only academic leaders or admins can review Early Years plans.");
  error.status = 403;
  throw error;
}

function reviewWeeklyPlan(db, planId, user = {}, body = {}) {
  assertReviewer(user);
  const plan = arr(db.curriculumTeacherPlans).find((row) => str(row.id) === str(planId));
  assertPlanAccess(db, plan, user, "review");
  plan.planStatus = "REVIEWED";
  plan.status = "REVIEWED";
  plan.reviewedAt = nowIso();
  plan.reviewedBy = str(user.id);
  plan.reviewerName = str(user.name || user.username);
  plan.approvalNotes = str(body.notes || body.approvalNotes);
  plan.updatedAt = nowIso();
  appendCurriculumAuditLog(db, user, "weekly_plan_reviewed", { planId: plan.id, notes: plan.approvalNotes });
  return plan;
}

function approveWeeklyPlan(db, planId, user = {}, body = {}) {
  assertReviewer(user);
  const plan = arr(db.curriculumTeacherPlans).find((row) => str(row.id) === str(planId));
  assertPlanAccess(db, plan, user, "approve");
  plan.planStatus = "APPROVED";
  plan.status = "APPROVED";
  plan.approvedAt = nowIso();
  plan.reviewedAt = plan.reviewedAt || plan.approvedAt;
  plan.reviewedBy = str(user.id);
  plan.reviewerName = str(user.name || user.username);
  plan.approvalNotes = str(body.notes || body.approvalNotes || plan.approvalNotes);
  plan.updatedAt = nowIso();
  appendCurriculumAuditLog(db, user, "weekly_plan_approved", { planId: plan.id, notes: plan.approvalNotes });
  return plan;
}

function returnWeeklyPlan(db, planId, user = {}, body = {}) {
  assertReviewer(user);
  const plan = arr(db.curriculumTeacherPlans).find((row) => str(row.id) === str(planId));
  assertPlanAccess(db, plan, user, "return");
  plan.planStatus = "RETURNED_FOR_REVISION";
  plan.status = "RETURNED_FOR_REVISION";
  plan.reviewedAt = nowIso();
  plan.reviewedBy = str(user.id);
  plan.reviewerName = str(user.name || user.username);
  plan.approvalNotes = str(body.notes || body.approvalNotes || "Returned for revision.");
  plan.updatedAt = nowIso();
  appendCurriculumAuditLog(db, user, "weekly_plan_returned", { planId: plan.id, notes: plan.approvalNotes });
  return plan;
}

function saveDailyRecord(db, planId, user = {}, body = {}, dailyId = "") {
  ensureEarlyYearsPlanningShape(db);
  const plan = arr(db.curriculumTeacherPlans).find((row) => str(row.id) === str(planId));
  assertPlanAccess(db, plan, user, "daily-record");
  const date = str(body.date) || new Date().toISOString().slice(0, 10);
  let record = arr(db.curriculumDailyTeachingRecords).find((row) => {
    if (dailyId) return str(row.id) === str(dailyId) && str(row.weeklyPlanId) === str(plan.id);
    return str(row.weeklyPlanId) === str(plan.id) && str(row.date) === date;
  });
  const timestamp = nowIso();
  const patch = DAILY_FIELDS.reduce((out, field) => {
    if (body[field] !== undefined) out[field] = str(body[field]);
    return out;
  }, {});
  if (!record) {
    record = {
      id: randomId("daily-teaching"),
      weeklyPlanId: plan.id,
      date,
      teacherId: str(user.id),
      teacherName: str(user.name || user.username),
      createdAt: timestamp,
      updatedAt: timestamp,
      ...DAILY_FIELDS.reduce((out, field) => ({ ...out, [field]: "" }), {}),
    };
    db.curriculumDailyTeachingRecords.unshift(record);
  }
  Object.assign(record, patch, {
    date,
    updatedAt: timestamp,
    updatedBy: str(user.id),
  });
  appendCurriculumAuditLog(db, user, dailyId ? "daily_teaching_record_updated" : "daily_teaching_record_saved", {
    planId: plan.id,
    dailyRecordId: record.id,
    date: record.date,
  });
  return record;
}

function saveWeeklyReview(db, planId, user = {}, body = {}) {
  ensureEarlyYearsPlanningShape(db);
  const plan = arr(db.curriculumTeacherPlans).find((row) => str(row.id) === str(planId));
  assertPlanAccess(db, plan, user, "weekly-review");
  const timestamp = nowIso();
  let review = arr(db.curriculumWeeklyPlanReviews).find((row) => str(row.weeklyPlanId) === str(plan.id));
  const patch = REVIEW_FIELDS.reduce((out, field) => {
    if (body[field] !== undefined) out[field] = str(body[field]);
    return out;
  }, {});
  if (!review) {
    review = {
      id: randomId("weekly-review"),
      weeklyPlanId: plan.id,
      teacherId: str(user.id),
      teacherName: str(user.name || user.username),
      createdAt: timestamp,
      updatedAt: timestamp,
      ...REVIEW_FIELDS.reduce((out, field) => ({ ...out, [field]: "" }), {}),
    };
    db.curriculumWeeklyPlanReviews.unshift(review);
  }
  Object.assign(review, patch, {
    updatedAt: timestamp,
    updatedBy: str(user.id),
  });
  plan.weeklyReviewCompletedAt = timestamp;
  plan.updatedAt = timestamp;
  appendCurriculumAuditLog(db, user, "weekly_plan_review_saved", { planId: plan.id, weeklyReviewId: review.id });
  return review;
}

function copyPreviousWeekStructure(db, planId, user = {}) {
  ensureEarlyYearsPlanningShape(db);
  const plan = arr(db.curriculumTeacherPlans).find((row) => str(row.id) === str(planId));
  assertEditablePlan(db, plan, user);
  const currentWeekNumber = Number(plan.weekNumber || 0);
  const previous = arr(db.curriculumTeacherPlans)
    .filter((row) => str(row.id) !== str(plan.id))
    .filter((row) => statusOf(row) !== "ARCHIVED")
    .filter((row) => str(row.classId) === str(plan.classId))
    .filter((row) => str(row.academicSessionId || row.sessionId) === str(plan.academicSessionId || plan.sessionId))
    .filter((row) => str(row.termId || row.curriculumTermId) === str(plan.termId || plan.curriculumTermId))
    .filter((row) => Number(row.weekNumber || 0) > 0 && Number(row.weekNumber || 0) < currentWeekNumber)
    .sort((a, b) => Number(b.weekNumber || 0) - Number(a.weekNumber || 0))[0];

  if (!previous) {
    const error = new Error("No previous weekly plan structure is available for this class, session, and term.");
    error.status = 404;
    throw error;
  }

  COPY_STRUCTURE_FIELDS.forEach((field) => {
    if (Array.isArray(previous[field])) plan[field] = [...previous[field]];
    else plan[field] = str(previous[field]);
  });
  plan.updatedAt = nowIso();
  plan.lastEditedBy = str(user.id);
  plan.lastEditedByName = str(user.name || user.username);
  appendCurriculumAuditLog(db, user, "weekly_plan_structure_copied", {
    planId: plan.id,
    copiedFromPlanId: previous.id,
    copiedFields: COPY_STRUCTURE_FIELDS,
  });
  return { plan, copiedFromPlanId: previous.id, copiedFields: COPY_STRUCTURE_FIELDS };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function block(title, value) {
  const text = Array.isArray(value) ? value.map(oneLine).filter(Boolean).join(", ") : str(value);
  if (!text) return "";
  return `<section><h2>${escapeHtml(title)}</h2><p>${escapeHtml(text).replace(/\n/g, "<br>")}</p></section>`;
}

function buildPrintHtml(detail) {
  const { plan, dailyRecords, weeklyReview } = detail;
  const snapshot = plan.curriculumSnapshot || {};
  const review = weeklyReview || {};
  const dailyRows = dailyRecords.map((row) => `
    <tr>
      <td>${escapeHtml(row.date)}</td>
      <td>${escapeHtml(oneLine(row.actualTeaching || row.plannedTeaching))}</td>
      <td>${escapeHtml(oneLine(row.nextDayAdjustment || row.reflection))}</td>
    </tr>`).join("");
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Angel Montessori Weekly Plan</title>
  <style>
    body { font-family: Arial, sans-serif; color: #102a4c; margin: 28px; line-height: 1.45; }
    header { border-bottom: 3px solid #1d5fa9; padding-bottom: 16px; margin-bottom: 18px; }
    h1, h2 { color: #173a70; margin: 0 0 8px; }
    h1 { font-size: 28px; }
    h2 { font-size: 17px; border-bottom: 1px solid #d8e4f2; padding-bottom: 5px; }
    .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 14px 0; }
    .meta div, section { border: 1px solid #d8e4f2; border-radius: 10px; padding: 10px; }
    section { margin-bottom: 10px; break-inside: avoid; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #d8e4f2; padding: 8px; text-align: left; vertical-align: top; }
    .badge { display: inline-block; background: #eaf5ff; border: 1px solid #bad9f7; border-radius: 999px; padding: 4px 8px; font-weight: 700; }
    @media print { body { margin: 18mm; } .no-print { display: none; } }
  </style>
</head>
<body>
  <button class="no-print" onclick="window.print()">Print / Save PDF</button>
  <header>
    <div>Angel Montessori School</div>
    <h1>AMES Weekly Implementation Plan</h1>
    <span class="badge">${escapeHtml(plan.planStatus)}</span>
  </header>
  <div class="meta">
    <div><strong>Class</strong><br>${escapeHtml(plan.className)}</div>
    <div><strong>Session / Term</strong><br>${escapeHtml(plan.academicSessionId)} / ${escapeHtml(plan.termName)}</div>
    <div><strong>Week</strong><br>${escapeHtml(plan.weekLabel)} - ${escapeHtml(snapshot.weekTitle)}</div>
    <div><strong>Teacher</strong><br>${escapeHtml(plan.teacherName)}</div>
    <div><strong>Curriculum Version</strong><br>${escapeHtml(snapshot.curriculumVersion || SOURCE_VERSION)}</div>
    <div><strong>Source</strong><br>${escapeHtml(snapshot.sourceDocument || SOURCE_DOCUMENT)}</div>
  </div>
  ${block("Approved Curriculum - Big Idea", snapshot.bigIdea)}
  ${block("Main Development", snapshot.mainDevelopment)}
  ${block("Curriculum Intent", snapshot.curriculumIntent)}
  ${block("EYFS Areas", snapshot.eyfsAreas)}
  ${block("Key Vocabulary", snapshot.keyVocabulary)}
  ${block("Weekly Priorities", plan.weeklyPriorities)}
  ${block("Direct / Intentional Teaching", plan.directTeaching)}
  ${block("Purposeful Play / Provision", plan.purposefulPlayProvision)}
  ${block("Continuous Provision Enhancements", plan.continuousProvisionEnhancements)}
  ${block("Practical Life", plan.practicalLifePlan)}
  ${block("Outdoor Learning", plan.outdoorLearningPlan)}
  ${block("Christian Character", plan.christianCharacterPlan)}
  ${block("Nigerian / African Context", plan.nigerianAfricanContextPlan)}
  ${block("SEND / Access Adjustments", plan.sendAccessAdjustments)}
  ${block("Assessment / Observation Focus", [plan.assessmentFocus, plan.observationFocus].filter(Boolean).join("\\n"))}
  ${block("Resources", plan.resources)}
  ${dailyRows ? `<section><h2>Daily Responsive Teaching Notes</h2><table><thead><tr><th>Date</th><th>Teaching</th><th>Responsive Adjustment</th></tr></thead><tbody>${dailyRows}</tbody></table></section>` : ""}
  ${block("Weekly Review", [review.learningSecure, review.learningDeveloping, review.revisitNextWeek, review.professionalReflection].filter(Boolean).join("\\n"))}
  <section><h2>Sign-off</h2><p>Teacher: ____________________ &nbsp;&nbsp; Academic Leader: ____________________</p></section>
</body>
</html>`;
}

module.exports = {
  DAILY_FIELDS,
  COPY_STRUCTURE_FIELDS,
  PLAN_ROLES,
  PLAN_STATUSES,
  REVIEW_FIELDS,
  REVIEW_ROLES,
  TEXT_FIELDS,
  approveWeeklyPlan,
  buildPrintHtml,
  copyPreviousWeekStructure,
  createWeeklyPlanFromCurriculum,
  ensureEarlyYearsPlanningShape,
  getWeeklyPlanDetail,
  listWeeklyPlans,
  phaseGuidance,
  returnWeeklyPlan,
  reviewWeeklyPlan,
  saveDailyRecord,
  saveWeeklyReview,
  submitWeeklyPlan,
  updateWeeklyPlan,
};
