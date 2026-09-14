const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const {
  ACADEMIC_SYSTEMS,
  AMES_EYFS_DIMENSIONS,
  EYFS_AREAS,
  ensureAcademicSystemShape,
  getApprovedClassConfig,
  isEarlyYearsClass,
  normalizeAcademicKey,
} = require("./academicSystems");

const FRAMEWORK_CODE = "AMES_VOLUME_III_EYFS";
const FRAMEWORK_ID = "curriculum-framework-ames-volume-iii-eyfs-v1";
const SOURCE_DOCUMENT = "AMES Volume III - Final Master";
const SOURCE_VERSION = "1.0";

const CURRICULUM_VIEW_ROLES = ["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER", "TEACHER"];
const CURRICULUM_MANAGE_ROLES = ["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER"];
const CURRICULUM_AUTHOR_ROLES = ["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER", "CURRICULUM_ADMIN"];
const TEACHER_PLAN_ROLES = ["TEACHER", "ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER"];

const EYFS_AREA_REFS = [
  ["COMMUNICATION_LANGUAGE", "Communication and Language", "PRIME"],
  ["PSED", "Personal, Social and Emotional Development", "PRIME"],
  ["PHYSICAL_DEVELOPMENT", "Physical Development", "PRIME"],
  ["LITERACY", "Literacy", "SPECIFIC"],
  ["MATHEMATICS", "Mathematics", "SPECIFIC"],
  ["UNDERSTANDING_THE_WORLD", "Understanding the World", "SPECIFIC"],
  ["EXPRESSIVE_ARTS_DESIGN", "Expressive Arts and Design", "SPECIFIC"],
].map(([code, name, group], index) => ({ code, name, group, displayOrder: index + 1 }));

const AMES_DIMENSION_REFS = AMES_EYFS_DIMENSIONS.map((name, index) => ({
  code: slugify(name).replace(/-/g, "_").toUpperCase(),
  name,
  displayOrder: index + 1,
}));

const CLASS_LEVELS = [
  { code: "CRECHE", classId: "creche", className: "Crèche", displayOrder: 1 },
  { code: "NURSERY", classId: "nursery", className: "Nursery", displayOrder: 2 },
  { code: "RECEPTION", classId: "reception", className: "Reception", displayOrder: 3 },
];

const CLASS_LEVEL_BY_KEY = new Map();
for (const row of CLASS_LEVELS) {
  CLASS_LEVEL_BY_KEY.set(normalizeAcademicKey(row.code), row);
  CLASS_LEVEL_BY_KEY.set(normalizeAcademicKey(row.classId), row);
  CLASS_LEVEL_BY_KEY.set(normalizeAcademicKey(row.className), row);
}

const TERM_JOURNEYS = [
  {
    classLevelCode: "NURSERY",
    termName: "First Term",
    journey: ["BELONG", "COMMUNICATE", "NOTICE", "REPRESENT"],
  },
  {
    classLevelCode: "NURSERY",
    termName: "Second Term",
    journey: ["QUESTION", "INVESTIGATE", "COMPARE", "EXPLAIN", "SOLVE"],
  },
  {
    classLevelCode: "NURSERY",
    termName: "Third Term",
    journey: ["CONNECT", "APPLY", "CREATE", "REFLECT", "PREPARE"],
  },
  {
    classLevelCode: "RECEPTION",
    termName: "First Term",
    journey: ["SETTLE", "SECURE", "DECODE", "REPRESENT", "REASON"],
  },
  {
    classLevelCode: "RECEPTION",
    termName: "Second Term",
    journey: ["DEEPEN", "READ", "COMPOSE", "INVESTIGATE", "APPLY"],
  },
  {
    classLevelCode: "RECEPTION",
    termName: "Third Term",
    journey: ["FLUENCY", "INDEPENDENCE", "CONNECTION", "REFLECTION", "TRANSITION"],
  },
];

const COLLECTIONS = [
  "curriculumFrameworks",
  "curriculumFrameworkVersions",
  "curriculumTerms",
  "curriculumWeeks",
  "curriculumItems",
  "curriculumTeacherPlans",
  "curriculumImportBatches",
  "curriculumAuditLogs",
  "curriculumSessionAssignments",
  "curriculumDevelopmentalJourneys",
];

const VALID_WEEK_STATUSES = ["UPCOMING", "CURRENT", "COMPLETED", "PAUSED", "FLEXIBLE"];
const VALID_TERM_STATUSES = ["DRAFT", "APPROVED_LOCKED", "ARCHIVED"];
const VALID_ITEM_STATUSES = ["DRAFT", "APPROVED_LOCKED", "ARCHIVED"];

function nowIso() {
  return new Date().toISOString();
}

function str(value) {
  return String(value || "").trim();
}

function num(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
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

function slugify(value) {
  return str(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function termCode(value) {
  const key = normalizeAcademicKey(value);
  if (key.includes("first") || key === "1") return "T1";
  if (key.includes("second") || key === "2") return "T2";
  if (key.includes("third") || key === "3") return "T3";
  return slugify(value).toUpperCase();
}

function termOrder(value) {
  const code = termCode(value);
  if (code === "T1") return 1;
  if (code === "T2") return 2;
  if (code === "T3") return 3;
  return 99;
}

function classLevelFromRef(ref) {
  return CLASS_LEVEL_BY_KEY.get(normalizeAcademicKey(ref)) || null;
}

function classLevelFromClass(input) {
  const approved = getApprovedClassConfig(input);
  return classLevelFromRef(approved?.id || approved?.name || input?.id || input?.name || input);
}

function ensureEarlyYearsCurriculumShape(db) {
  ensureAcademicSystemShape(db);
  let mutated = false;
  COLLECTIONS.forEach((key) => {
    if (!Array.isArray(db[key])) {
      db[key] = [];
      mutated = true;
    }
  });

  const timestamp = nowIso();
  let framework = db.curriculumFrameworks.find((row) => str(row.code) === FRAMEWORK_CODE);
  if (!framework) {
    framework = {
      id: FRAMEWORK_ID,
      code: FRAMEWORK_CODE,
      name: "AMES Volume III - The Complete Early Years Curriculum",
      version: SOURCE_VERSION,
      academicSystem: ACADEMIC_SYSTEMS.BRITISH_EYFS.code,
      status: "APPROVED_LOCKED",
      effectiveFromSession: "",
      effectiveToSession: "",
      isActive: true,
      sourceDocument: SOURCE_DOCUMENT,
      sourceVersion: SOURCE_VERSION,
      lockedFromEditing: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    db.curriculumFrameworks.unshift(framework);
    mutated = true;
  }

  const versionExists = db.curriculumFrameworkVersions.some((row) => str(row.frameworkId) === str(framework.id) && str(row.version) === SOURCE_VERSION);
  if (!versionExists) {
    db.curriculumFrameworkVersions.unshift({
      id: `${framework.id}-version-${SOURCE_VERSION.replace(/[^0-9A-Za-z]+/g, "-")}`,
      frameworkId: framework.id,
      frameworkCode: framework.code,
      version: SOURCE_VERSION,
      status: "APPROVED_LOCKED",
      sourceDocument: SOURCE_DOCUMENT,
      sourceVersion: SOURCE_VERSION,
      lockedFromEditing: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    mutated = true;
  }

  const journeyKeys = new Set(db.curriculumDevelopmentalJourneys.map((row) => `${normalizeAcademicKey(row.classLevelCode)}:${normalizeAcademicKey(row.termName)}`));
  TERM_JOURNEYS.forEach((row) => {
    const key = `${normalizeAcademicKey(row.classLevelCode)}:${normalizeAcademicKey(row.termName)}`;
    if (journeyKeys.has(key)) return;
    db.curriculumDevelopmentalJourneys.push({
      id: `curriculum-journey-${slugify(row.classLevelCode)}-${slugify(row.termName)}`,
      frameworkId: framework.id,
      frameworkCode: framework.code,
      classLevelCode: row.classLevelCode,
      termName: row.termName,
      journey: row.journey,
      status: "APPROVED_LOCKED",
      sourceDocument: SOURCE_DOCUMENT,
      sourceVersion: SOURCE_VERSION,
      lockedFromEditing: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    mutated = true;
  });

  return { mutated, framework };
}

function appendCurriculumAuditLog(db, actor = {}, action = "", details = {}) {
  if (!Array.isArray(db.curriculumAuditLogs)) db.curriculumAuditLogs = [];
  db.curriculumAuditLogs.unshift({
    id: `curriculum-audit-${randomUUID().slice(0, 10)}`,
    userId: str(actor.id || actor.username),
    userName: str(actor.name || actor.username),
    userRole: roleOf(actor),
    action: str(action),
    frameworkId: str(details.frameworkId),
    frameworkCode: str(details.frameworkCode || FRAMEWORK_CODE),
    version: str(details.version || SOURCE_VERSION),
    classLevelCode: str(details.classLevelCode),
    termName: str(details.termName),
    importBatchId: str(details.importBatchId),
    details,
    createdAt: nowIso(),
  });
}

function findAcademicSession(db, ref) {
  const value = str(ref);
  if (!value) return null;
  const key = normalizeAcademicKey(value);
  return [...arr(db.academicSessions), ...arr(db.lmsSessions)].find((row) => str(row.id) === value || normalizeAcademicKey(row.sessionName || row.name) === key) || null;
}

function findAcademicTerm(db, ref, sessionId = "") {
  const value = str(ref);
  if (!value) return null;
  const key = normalizeAcademicKey(value);
  return [...arr(db.terms), ...arr(db.lmsTerms)].find((row) => {
    const matches = str(row.id) === value || normalizeAcademicKey(row.termName || row.name) === key;
    if (!matches) return false;
    return !sessionId || !row.sessionId || str(row.sessionId) === str(sessionId);
  }) || null;
}

function findEarlyYearsClass(db, ref) {
  const approved = getApprovedClassConfig(ref);
  if (approved && isEarlyYearsClass(approved)) return approved;
  const value = str(ref);
  const key = normalizeAcademicKey(value);
  const row = arr(db.classes).find((item) => str(item.id) === value || normalizeAcademicKey(item.name || item.className) === key);
  if (row && isEarlyYearsClass(row)) return row;
  return null;
}

function teacherAssignedClassIds(db, user) {
  const userId = str(user?.id);
  if (!userId) return new Set();
  const ids = new Set();
  arr(db.classes).forEach((cls) => {
    if (str(cls.teacherId) === userId || str(cls.classTeacherId) === userId || str(cls.assistantTeacherId) === userId) {
      ids.add(str(cls.id));
      const approved = getApprovedClassConfig(cls);
      if (approved?.id) ids.add(str(approved.id));
    }
  });
  arr(db.lmsClassSubjects).forEach((row) => {
    if (str(row.teacherUserId) === userId && row.classId) ids.add(str(row.classId));
  });
  arr(db.classSubjectOfferings).forEach((row) => {
    if (str(row.teacherUserId) === userId && row.classId) ids.add(str(row.classId));
  });
  return ids;
}

function canViewClass(db, user, classRow) {
  if (hasAnyRole(user, CURRICULUM_MANAGE_ROLES)) return true;
  if (roleOf(user) !== "TEACHER") return false;
  const approved = getApprovedClassConfig(classRow);
  const assigned = teacherAssignedClassIds(db, user);
  return assigned.has(str(classRow?.id)) || assigned.has(str(approved?.id));
}

function assertEarlyYearsClassAccess(db, user, classRef) {
  const classRow = findEarlyYearsClass(db, classRef);
  if (!classRow) {
    const error = new Error("Early Years curriculum is only available for Crèche, Nursery, and Reception.");
    error.status = 400;
    throw error;
  }
  if (!canViewClass(db, user, classRow)) {
    const error = new Error("You do not have access to this Early Years class curriculum.");
    error.status = 403;
    throw error;
  }
  return getApprovedClassConfig(classRow) || classRow;
}

function normalizeEyfsArea(value) {
  const key = normalizeAcademicKey(value);
  const match = EYFS_AREA_REFS.find((row) => normalizeAcademicKey(row.code) === key || normalizeAcademicKey(row.name) === key);
  return match?.code || "";
}

function normalizeDimension(value) {
  const key = normalizeAcademicKey(value);
  const match = AMES_DIMENSION_REFS.find((row) => normalizeAcademicKey(row.code) === key || normalizeAcademicKey(row.name) === key);
  return match?.code || "";
}

function sortWeeks(rows = []) {
  return [...rows].sort((a, b) => {
    const order = num(a.displayOrder || a.weekNumber, 0) - num(b.displayOrder || b.weekNumber, 0);
    if (order !== 0) return order;
    return str(a.weekLabel).localeCompare(str(b.weekLabel));
  });
}

function sortItems(rows = []) {
  return [...rows].sort((a, b) => num(a.displayOrder, 999) - num(b.displayOrder, 999) || str(a.title).localeCompare(str(b.title)));
}

function enrichWeek(db, week) {
  const items = sortItems(arr(db.curriculumItems).filter((item) => str(item.curriculumWeekId) === str(week.id)));
  const byArea = {};
  EYFS_AREA_REFS.forEach((area) => {
    byArea[area.code] = {
      ...area,
      items: items.filter((item) => str(item.eyfsArea) === area.code),
    };
  });
  return {
    ...week,
    items,
    areas: byArea,
    itemCount: items.length,
  };
}

function listAccessibleEarlyYearsClasses(db, user) {
  const rows = arr(db.classes)
    .filter((row) => row.isActive !== false && isEarlyYearsClass(row))
    .map((row) => getApprovedClassConfig(row) || row)
    .filter((row, index, list) => list.findIndex((item) => str(item.id) === str(row.id)) === index)
    .filter((row) => canViewClass(db, user, row))
    .sort((a, b) => num(a.displayOrder || a.order, 999) - num(b.displayOrder || b.order, 999));
  return rows;
}

function getFramework(db, ref = "") {
  const value = str(ref);
  return arr(db.curriculumFrameworks).find((row) => {
    if (!value) return str(row.code) === FRAMEWORK_CODE && row.isActive !== false;
    return str(row.id) === value || str(row.code) === value || str(row.version) === value;
  }) || null;
}

function listCurriculum(db, filters = {}, user = {}) {
  ensureEarlyYearsCurriculumShape(db);
  const framework = getFramework(db, filters.frameworkId || filters.frameworkCode || filters.version);
  if (!framework) {
    const error = new Error("AMES Volume III curriculum framework is not configured.");
    error.status = 404;
    throw error;
  }
  const classRow = assertEarlyYearsClassAccess(db, user, filters.classId || filters.className || "creche");
  const level = classLevelFromClass(classRow);
  const session = findAcademicSession(db, filters.sessionId || filters.sessionName);
  const term = findAcademicTerm(db, filters.termId || filters.termName, session?.id || "");
  const termName = term?.termName || str(filters.termName);
  const normalizedTermCode = termName ? termCode(termName) : "";

  let curriculumTerms = arr(db.curriculumTerms).filter((row) => {
    if (str(row.frameworkId) !== str(framework.id)) return false;
    if (normalizeAcademicKey(row.classLevelCode) !== normalizeAcademicKey(level?.code)) return false;
    if (normalizedTermCode && termCode(row.termName || row.termCode) !== normalizedTermCode) return false;
    if (session?.id && row.academicSessionId && str(row.academicSessionId) !== str(session.id)) return false;
    return true;
  });

  curriculumTerms = curriculumTerms.sort((a, b) => termOrder(a.termName) - termOrder(b.termName));
  const termIds = new Set(curriculumTerms.map((row) => str(row.id)));
  const weeks = sortWeeks(arr(db.curriculumWeeks).filter((row) => termIds.has(str(row.curriculumTermId)))).map((week) => enrichWeek(db, week));
  const journey = arr(db.curriculumDevelopmentalJourneys).find(
    (row) => normalizeAcademicKey(row.classLevelCode) === normalizeAcademicKey(level?.code) && (!termName || termCode(row.termName) === normalizedTermCode)
  ) || null;

  return {
    framework,
    class: classRow,
    classLevel: level,
    session,
    term,
    curriculumTerms,
    developmentalJourney: journey,
    weeks,
    sourceReady: weeks.length > 0,
    sourceMessage: weeks.length
      ? "Approved AMES Volume III curriculum content is available for this selection."
      : "No approved Volume III curriculum content has been imported for this class and term yet.",
  };
}

function searchCurriculum(db, filters = {}, user = {}) {
  const keyword = normalizeAcademicKey(filters.keyword || filters.q);
  const area = normalizeEyfsArea(filters.eyfsArea || filters.area);
  const dimension = normalizeDimension(filters.dimension);
  const weekNumber = str(filters.weekNumber);
  const response = listCurriculum(db, filters, user);
  let weeks = response.weeks;
  if (weekNumber) weeks = weeks.filter((week) => str(week.weekNumber) === weekNumber || normalizeAcademicKey(week.weekLabel) === normalizeAcademicKey(weekNumber));
  const matchedWeeks = [];
  weeks.forEach((week) => {
    let items = week.items;
    if (area) items = items.filter((item) => str(item.eyfsArea) === area);
    if (dimension) items = items.filter((item) => arr(item.dimensionCodes).includes(dimension));
    if (keyword) {
      items = items.filter((item) => normalizeAcademicKey([
        item.title,
        item.learningIntent,
        item.learningContent,
        arr(item.keyVocabulary).join(" "),
        item.teachingGuidance,
        item.assessmentFocus,
      ].join(" ")).includes(keyword));
    }
    if (items.length) matchedWeeks.push({ ...week, items, itemCount: items.length });
  });
  return { ...response, weeks: matchedWeeks, resultCount: matchedWeeks.reduce((sum, week) => sum + week.items.length, 0) };
}

function getCurrentWeek(db, filters = {}, user = {}) {
  const response = listCurriculum(db, filters, user);
  const current = response.weeks.find((week) => str(week.calendarStatus).toUpperCase() === "CURRENT") || null;
  return { ...response, currentWeek: current };
}

function createTeacherPlanShell(db, weekId, user = {}, payload = {}) {
  ensureEarlyYearsCurriculumShape(db);
  const week = arr(db.curriculumWeeks).find((row) => str(row.id) === str(weekId) || str(row.code) === str(weekId));
  if (!week) {
    const error = new Error("Curriculum week could not be found.");
    error.status = 404;
    throw error;
  }
  const term = arr(db.curriculumTerms).find((row) => str(row.id) === str(week.curriculumTermId));
  const classRow = assertEarlyYearsClassAccess(db, user, term?.classId || term?.classLevelCode);
  const existing = arr(db.curriculumTeacherPlans).find((row) => str(row.curriculumWeekId) === str(week.id) && str(row.teacherUserId) === str(user.id));
  const timestamp = nowIso();
  const row = {
    id: existing?.id || `curriculum-plan-${randomUUID().slice(0, 10)}`,
    curriculumWeekId: week.id,
    curriculumWeekCode: week.code,
    curriculumTermId: term?.id || "",
    frameworkId: term?.frameworkId || "",
    classId: classRow.id,
    className: classRow.name,
    sessionId: str(payload.sessionId || term?.academicSessionId),
    termId: str(payload.termId || term?.termId),
    teacherUserId: str(user.id),
    teacherName: str(user.name || user.username),
    status: existing?.status || "DRAFT",
    weeklyPlan: str(payload.weeklyPlan || existing?.weeklyPlan),
    dailyResponsiveNotes: str(payload.dailyResponsiveNotes || existing?.dailyResponsiveNotes),
    activities: arr(payload.activities || existing?.activities),
    resources: arr(payload.resources || existing?.resources),
    adaptations: str(payload.adaptations || existing?.adaptations),
    reflection: str(payload.reflection || existing?.reflection),
    createdAt: existing?.createdAt || timestamp,
    updatedAt: timestamp,
  };
  if (existing) Object.assign(existing, row);
  else db.curriculumTeacherPlans.unshift(row);
  appendCurriculumAuditLog(db, user, existing ? "teacher_plan_shell_updated" : "teacher_plan_shell_created", {
    frameworkId: row.frameworkId,
    classLevelCode: term?.classLevelCode,
    termName: term?.termName,
    curriculumWeekId: week.id,
  });
  return row;
}

function normalizeImportPayload(raw, sourceFile = "") {
  const classLevel = classLevelFromRef(raw.classLevelCode || raw.classId || raw.className);
  return {
    framework: raw.framework || {},
    classLevel,
    classLevelCode: classLevel?.code || str(raw.classLevelCode).toUpperCase(),
    classId: classLevel?.classId || str(raw.classId),
    className: classLevel?.className || str(raw.className),
    termId: str(raw.termId),
    termName: str(raw.termName),
    title: str(raw.title),
    overview: str(raw.overview),
    developmentalJourney: arr(raw.developmentalJourney),
    academicSessionId: str(raw.academicSessionId),
    templateSessionReference: str(raw.templateSessionReference || "TEMPLATE"),
    sourceDocument: str(raw.sourceDocument || SOURCE_DOCUMENT),
    sourceVersion: str(raw.sourceVersion || SOURCE_VERSION),
    sourceSection: str(raw.sourceSection),
    sourceStatus: str(raw.sourceStatus),
    weeks: arr(raw.weeks),
    sourceFile,
  };
}

function validateImportPayload(raw, sourceFile = "") {
  const payload = normalizeImportPayload(raw, sourceFile);
  const errors = [];
  const warnings = [];
  if (payload.sourceStatus === "AWAITING_APPROVED_MASTER_CONTENT") {
    errors.push("This seed file is only a placeholder. Replace it with approved AMES Volume III content before importing.");
  }
  if (!payload.classLevel) errors.push("classLevelCode/classId/className must be Crèche, Nursery, or Reception.");
  if (!payload.termName) errors.push("termName is required.");
  if (!payload.weeks.length) errors.push("weeks must include at least one approved curriculum week.");
  if (payload.framework?.code && str(payload.framework.code) !== FRAMEWORK_CODE) errors.push(`framework.code must be ${FRAMEWORK_CODE}.`);
  const weekCodes = new Set();
  const itemCodes = new Set();
  payload.weeks.forEach((week, weekIndex) => {
    const weekNumber = num(week.weekNumber, 0);
    const code = str(week.code);
    if (!code) errors.push(`weeks[${weekIndex}].code is required.`);
    if (code && weekCodes.has(code)) errors.push(`Duplicate week code: ${code}.`);
    if (code) weekCodes.add(code);
    if (weekNumber <= 0 && !str(week.weekLabel)) errors.push(`weeks[${weekIndex}] must include weekNumber or weekLabel.`);
    const weekItems = arr(week.items);
    if (!weekItems.length && !week.isFlexibleWeek) warnings.push(`${code || `Week ${weekIndex + 1}`} has no curriculum items.`);
    weekItems.forEach((item, itemIndex) => {
      const itemCode = str(item.code);
      if (!itemCode) errors.push(`${code || `weeks[${weekIndex}]`}.items[${itemIndex}].code is required.`);
      if (itemCode && itemCodes.has(itemCode)) errors.push(`Duplicate curriculum item code: ${itemCode}.`);
      if (itemCode) itemCodes.add(itemCode);
      const area = normalizeEyfsArea(item.eyfsArea);
      if (!area) errors.push(`${itemCode || `items[${itemIndex}]`} has invalid eyfsArea.`);
      arr(item.dimensionCodes || item.amesDimensions || item.dimensions).forEach((dimension) => {
        if (!normalizeDimension(dimension)) errors.push(`${itemCode || `items[${itemIndex}]`} has invalid AMES dimension: ${dimension}.`);
      });
    });
  });
  return { payload, errors, warnings };
}

function importCurriculumPayload(db, raw, options = {}) {
  const { payload, errors, warnings } = validateImportPayload(raw, options.sourceFile || "");
  const report = {
    sourceFile: options.sourceFile || "",
    class: payload.className,
    term: payload.termName,
    weeksDetected: payload.weeks.length,
    itemsDetected: payload.weeks.reduce((sum, week) => sum + arr(week.items).length, 0),
    itemsCreated: 0,
    itemsUpdated: 0,
    itemsSkipped: 0,
    weeksCreated: 0,
    weeksUpdated: 0,
    validationErrors: errors,
    duplicateWarnings: warnings,
    dryRun: Boolean(options.dryRun),
    result: errors.length ? "FAILED" : "READY",
  };
  if (errors.length || options.dryRun) {
    report.result = errors.length ? "FAILED" : "DRY_RUN_PASS";
    return report;
  }

  ensureEarlyYearsCurriculumShape(db);
  const timestamp = nowIso();
  const framework = getFramework(db) || {
    id: FRAMEWORK_ID,
    code: FRAMEWORK_CODE,
    name: "AMES Volume III - The Complete Early Years Curriculum",
    version: SOURCE_VERSION,
    academicSystem: ACADEMIC_SYSTEMS.BRITISH_EYFS.code,
    status: "APPROVED_LOCKED",
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const batchId = `curriculum-import-${randomUUID().slice(0, 10)}`;
  const termStableCode = `${FRAMEWORK_CODE}-${payload.classLevel.code}-${termCode(payload.termName)}`;
  let term = db.curriculumTerms.find((row) => str(row.code) === termStableCode);
  const termPayload = {
    id: term?.id || `curriculum-term-${slugify(payload.classLevel.code)}-${slugify(payload.termName)}`,
    code: termStableCode,
    frameworkId: framework.id,
    frameworkCode: framework.code,
    academicSessionId: payload.academicSessionId,
    templateSessionReference: payload.templateSessionReference || "TEMPLATE",
    termId: payload.termId,
    termName: payload.termName,
    classId: payload.classLevel.classId,
    className: payload.classLevel.className,
    classLevelCode: payload.classLevel.code,
    title: payload.title || `${payload.classLevel.className} ${payload.termName}`,
    overview: payload.overview,
    developmentalJourney: payload.developmentalJourney,
    displayOrder: termOrder(payload.termName),
    status: "APPROVED_LOCKED",
    sourceDocument: payload.sourceDocument,
    sourceVersion: payload.sourceVersion,
    sourceSection: payload.sourceSection || `${payload.className} / ${payload.termName}`,
    importBatchId: batchId,
    importedAt: timestamp,
    importedBy: str(options.actor?.id || options.actor?.username),
    lockedFromEditing: true,
    createdAt: term?.createdAt || timestamp,
    updatedAt: timestamp,
  };
  if (term) Object.assign(term, termPayload);
  else {
    term = termPayload;
    db.curriculumTerms.push(term);
  }

  payload.weeks.forEach((week, index) => {
    const weekCode = str(week.code) || `${termStableCode}-W${String(num(week.weekNumber, index + 1)).padStart(2, "0")}`;
    let existingWeek = db.curriculumWeeks.find((row) => str(row.code) === weekCode);
    const weekRow = {
      id: existingWeek?.id || `curriculum-week-${randomUUID().slice(0, 10)}`,
      code: weekCode,
      curriculumTermId: term.id,
      weekNumber: num(week.weekNumber, index + 1),
      weekLabel: str(week.weekLabel || `Week ${num(week.weekNumber, index + 1)}`),
      title: str(week.title),
      bigIdea: str(week.bigIdea),
      mainDevelopment: str(week.mainDevelopment),
      curriculumIntent: str(week.curriculumIntent),
      notes: str(week.notes),
      isFlexibleWeek: Boolean(week.isFlexibleWeek),
      isTeachingWeek: week.isTeachingWeek !== false,
      calendarNotes: str(week.calendarNotes),
      plannedStartDate: str(week.plannedStartDate),
      plannedEndDate: str(week.plannedEndDate),
      calendarStatus: VALID_WEEK_STATUSES.includes(str(week.calendarStatus).toUpperCase()) ? str(week.calendarStatus).toUpperCase() : (week.isFlexibleWeek ? "FLEXIBLE" : "UPCOMING"),
      displayOrder: num(week.displayOrder, index + 1),
      sourceDocument: payload.sourceDocument,
      sourceVersion: payload.sourceVersion,
      sourceSection: str(week.sourceSection || `${payload.className} ${payload.termName} / ${week.weekLabel || week.title || weekCode}`),
      sourcePage: str(week.sourcePage),
      importBatchId: batchId,
      lockedFromEditing: true,
      createdAt: existingWeek?.createdAt || timestamp,
      updatedAt: timestamp,
    };
    if (existingWeek) {
      Object.assign(existingWeek, weekRow);
      report.weeksUpdated += 1;
    } else {
      existingWeek = weekRow;
      db.curriculumWeeks.push(existingWeek);
      report.weeksCreated += 1;
    }

    arr(week.items).forEach((item, itemIndex) => {
      const itemCode = str(item.code);
      let existingItem = db.curriculumItems.find((row) => str(row.code) === itemCode);
      const dimensions = arr(item.dimensionCodes || item.amesDimensions || item.dimensions).map(normalizeDimension).filter(Boolean);
      const itemRow = {
        id: existingItem?.id || `curriculum-item-${randomUUID().slice(0, 10)}`,
        code: itemCode,
        curriculumWeekId: existingWeek.id,
        eyfsArea: normalizeEyfsArea(item.eyfsArea),
        title: str(item.title),
        learningIntent: str(item.learningIntent),
        learningContent: str(item.learningContent),
        keyVocabulary: arr(item.keyVocabulary).map(str).filter(Boolean),
        teachingGuidance: str(item.teachingGuidance),
        suggestedExperiences: arr(item.suggestedExperiences).map(str).filter(Boolean),
        resources: arr(item.resources).map(str).filter(Boolean),
        outdoorLearning: str(item.outdoorLearning),
        practicalLife: str(item.practicalLife),
        montessoriPractice: str(item.montessoriPractice),
        christianCharacter: str(item.christianCharacter),
        nigerianAfricanContext: str(item.nigerianAfricanContext),
        continuousProvision: str(item.continuousProvision),
        sendAccess: str(item.sendAccess),
        parentHomeConnection: str(item.parentHomeConnection),
        assessmentFocus: str(item.assessmentFocus),
        progressionReference: str(item.progressionReference),
        phonicsProgramme: str(item.phonicsProgramme),
        notes: str(item.notes),
        dimensionCodes: dimensions,
        displayOrder: num(item.displayOrder, itemIndex + 1),
        status: VALID_ITEM_STATUSES.includes(str(item.status).toUpperCase()) ? str(item.status).toUpperCase() : "APPROVED_LOCKED",
        sourceDocument: payload.sourceDocument,
        sourceVersion: payload.sourceVersion,
        sourceSection: str(item.sourceSection || existingWeek.sourceSection),
        sourcePage: str(item.sourcePage || week.sourcePage),
        importBatchId: batchId,
        importedAt: timestamp,
        importedBy: str(options.actor?.id || options.actor?.username),
        lockedFromEditing: item.lockedFromEditing !== false,
        createdAt: existingItem?.createdAt || timestamp,
        updatedAt: timestamp,
      };
      if (existingItem) {
        Object.assign(existingItem, itemRow);
        report.itemsUpdated += 1;
      } else {
        db.curriculumItems.push(itemRow);
        report.itemsCreated += 1;
      }
    });
  });

  db.curriculumImportBatches.unshift({
    id: batchId,
    frameworkId: framework.id,
    frameworkCode: framework.code,
    sourceFile: options.sourceFile || "",
    sourceDocument: payload.sourceDocument,
    sourceVersion: payload.sourceVersion,
    classLevelCode: payload.classLevel.code,
    className: payload.classLevel.className,
    termName: payload.termName,
    weeksDetected: report.weeksDetected,
    itemsDetected: report.itemsDetected,
    itemsCreated: report.itemsCreated,
    itemsUpdated: report.itemsUpdated,
    warnings,
    validationErrors: [],
    result: "PASS",
    importedBy: str(options.actor?.id || options.actor?.username),
    importedAt: timestamp,
    createdAt: timestamp,
  });
  report.importBatchId = batchId;
  report.result = "PASS";
  appendCurriculumAuditLog(db, options.actor || {}, "curriculum_import", {
    frameworkId: framework.id,
    frameworkCode: framework.code,
    version: framework.version,
    classLevelCode: payload.classLevel.code,
    termName: payload.termName,
    importBatchId: batchId,
    report,
  });
  return report;
}

function importCurriculumFile(db, filePath, options = {}) {
  const fullPath = path.resolve(filePath);
  const raw = JSON.parse(fs.readFileSync(fullPath, "utf8"));
  return importCurriculumPayload(db, raw, { ...options, sourceFile: fullPath });
}

function seedDirectory() {
  return path.join(__dirname, "..", "data", "curriculum", "ames-volume-iii");
}

module.exports = {
  AMES_DIMENSION_REFS,
  CLASS_LEVELS,
  CURRICULUM_AUTHOR_ROLES,
  CURRICULUM_MANAGE_ROLES,
  CURRICULUM_VIEW_ROLES,
  EYFS_AREA_REFS,
  FRAMEWORK_CODE,
  FRAMEWORK_ID,
  SOURCE_DOCUMENT,
  SOURCE_VERSION,
  TEACHER_PLAN_ROLES,
  TERM_JOURNEYS,
  appendCurriculumAuditLog,
  assertEarlyYearsClassAccess,
  canViewClass,
  classLevelFromClass,
  classLevelFromRef,
  createTeacherPlanShell,
  ensureEarlyYearsCurriculumShape,
  findAcademicSession,
  findAcademicTerm,
  findEarlyYearsClass,
  getCurrentWeek,
  getFramework,
  importCurriculumFile,
  importCurriculumPayload,
  listAccessibleEarlyYearsClasses,
  listCurriculum,
  normalizeDimension,
  normalizeEyfsArea,
  searchCurriculum,
  seedDirectory,
  str,
  teacherAssignedClassIds,
  validateImportPayload,
};
