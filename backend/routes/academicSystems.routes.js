const express = require("express");
const { nanoid } = require("nanoid");
const { auth, requireRole } = require("../middleware/auth");
const { readDB, writeDB } = require("../lib/jsonStore");
const {
  ACADEMIC_SYSTEMS,
  LEGACY_CLASS_MAPPINGS,
  ensureAcademicSystemShape,
  appendAcademicAuditLog,
  getActiveClassConfigs,
  getApprovedClassConfig,
  getClassCapabilitySummary,
  getTeacherToolsetForClass,
  normalizeAcademicKey,
  sortAcademicClasses,
} = require("../lib/academicSystems");
const {
  ensureAcademicScope,
  setActiveAcademicScope,
  findAcademicSession,
  findAcademicTerm,
} = require("../lib/academicScope");

const router = express.Router();
const VIEW_ROLES = ["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER", "TEACHER"];
const MANAGE_ROLES = ["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER"];

function str(value) {
  return String(value || "").trim();
}

function activeClassRows(db) {
  return sortAcademicClasses((db.classes || []).filter((item) => item.isActive !== false));
}

function classStudentCounts(db) {
  const counts = new Map();
  (db.students || []).forEach((student) => {
    const id = str(student.classId);
    const nameKey = normalizeAcademicKey(student.className);
    if (id) counts.set(id, (counts.get(id) || 0) + 1);
    if (nameKey) counts.set(nameKey, (counts.get(nameKey) || 0) + 1);
  });
  return counts;
}

function summarizeSystem(db, code) {
  const system = ACADEMIC_SYSTEMS[code];
  const classes = activeClassRows(db).filter((item) => str(item.academicSystem) === code);
  const studentCounts = classStudentCounts(db);
  const students = classes.reduce((sum, cls) => (
    sum + Number(studentCounts.get(str(cls.id)) || studentCounts.get(normalizeAcademicKey(cls.name)) || 0)
  ), 0);
  return {
    ...system,
    activeClassCount: classes.length,
    studentCount: students,
    classes: classes.map((cls) => ({
      ...cls,
      capabilities: getClassCapabilitySummary(cls),
      teacherTools: getTeacherToolsetForClass(cls),
    })),
  };
}

function referenceCountsForClass(db, cls) {
  const id = str(cls.id);
  const nameKey = normalizeAcademicKey(cls.name || cls.className);
  const countRows = (rows, matcher) => (Array.isArray(rows) ? rows.filter(matcher).length : 0);
  return {
    students: countRows(db.students, (row) => str(row.classId) === id || normalizeAcademicKey(row.className) === nameKey),
    financeFees: countRows(db.financeStudentFees, (row) => str(row.classId) === id || normalizeAcademicKey(row.className) === nameKey),
    invoices: countRows(db.invoices, (row) => str(row.classIdSnapshot || row.classId) === id || normalizeAcademicKey(row.classNameSnapshot || row.className) === nameKey),
    attendanceRecords: countRows(db.attendanceSessions, (row) => str(row.classId) === id || normalizeAcademicKey(row.className) === nameKey),
    results: countRows(db.results, (row) => str(row.classId) === id || normalizeAcademicKey(row.className) === nameKey),
  };
}

function isCurrentStudent(row) {
  const status = str(row?.status || "active").toLowerCase();
  return !row?.isArchived && !["archived", "graduated", "left", "withdrawn", "inactive", "alumni"].includes(status);
}

function sendSummary(req, res) {
  const db = readDB();
  ensureAcademicScope(db);
  const shape = ensureAcademicSystemShape(db);
  writeDB(db);
  const activeSession = (db.academicSessions || []).find((row) => row.isActive) || null;
  return res.json({
    activeSession,
    activeTerm: (db.terms || []).find((row) => row.isActive && (!activeSession || str(row.sessionId) === str(activeSession.id))) || null,
    sessions: db.academicSessions || [],
    terms: db.terms || [],
    systems: Object.keys(ACADEMIC_SYSTEMS).map((code) => summarizeSystem(db, code)),
    activeClasses: shape.activeClasses.map((cls) => ({
      ...cls,
      capabilities: getClassCapabilitySummary(cls),
      teacherTools: getTeacherToolsetForClass(cls),
    })),
    legacyClasses: shape.legacyClasses.map((cls) => ({
      ...cls,
      referenceCounts: referenceCountsForClass(db, cls),
    })),
    legacyMappings: LEGACY_CLASS_MAPPINGS,
  });
}

router.get("/", auth(), requireRole(...VIEW_ROLES), sendSummary);
router.get("/summary", auth(), requireRole(...VIEW_ROLES), sendSummary);

router.get("/classes", auth(), requireRole(...VIEW_ROLES), (req, res) => {
  const db = readDB();
  ensureAcademicScope(db);
  ensureAcademicSystemShape(db);
  writeDB(db);
  const activeOnly = str(req.query.activeOnly || "true").toLowerCase() !== "false";
  const rows = activeOnly ? activeClassRows(db) : sortAcademicClasses(db.classes || []);
  res.json(rows.map((cls) => ({
    ...cls,
    capabilities: getClassCapabilitySummary(cls),
    teacherTools: getTeacherToolsetForClass(cls),
  })));
});

router.get("/legacy-classes", auth(), requireRole(...MANAGE_ROLES), (req, res) => {
  const db = readDB();
  ensureAcademicScope(db);
  const shape = ensureAcademicSystemShape(db);
  writeDB(db);
  res.json(shape.legacyClasses.map((cls) => ({
    ...cls,
    referenceCounts: referenceCountsForClass(db, cls),
  })));
});

router.get("/foundation", auth(), requireRole(...VIEW_ROLES), (req, res) => {
  const db = readDB();
  ensureAcademicScope(db);
  ensureAcademicSystemShape(db);
  writeDB(db);
  res.json({
    eyfsCurriculumAreas: db.eyfsCurriculumAreas || [],
    amesCurriculumDimensions: db.amesCurriculumDimensions || [],
    eyfsAssessmentDescriptors: db.eyfsAssessmentDescriptors || [],
    eyfsDevelopmentalProgressions: db.eyfsDevelopmentalProgressions || [],
    amesTeachingCycles: db.amesTeachingCycles || [],
    receptionPhonicsReady: Array.isArray(db.receptionPhonicsRecords),
    observationRecordsReady: Array.isArray(db.eyfsObservations),
  });
});

router.patch("/scope", auth(), requireRole(...MANAGE_ROLES), (req, res) => {
  const db = readDB();
  ensureAcademicScope(db);
  const session = findAcademicSession(db, req.body?.sessionId || req.body?.sessionName);
  if (!session) return res.status(400).json({ message: "Academic session could not be found." });
  const term = findAcademicTerm(db, req.body?.termId || req.body?.termName, session.id);
  if (!term) return res.status(400).json({ message: "Academic term could not be found for this session." });
  const scope = setActiveAcademicScope(db, session.id, term.id);
  ensureAcademicSystemShape(db);
  appendAcademicAuditLog(db, req.user || {}, "academic_scope_updated", {
    sessionId: scope.activeSession?.id || "",
    termId: scope.activeTerm?.id || "",
  });
  writeDB(db);
  res.json(scope);
});

router.post("/legacy-classes/:classId/migration-plan", auth(), requireRole(...MANAGE_ROLES), (req, res) => {
  const db = readDB();
  ensureAcademicScope(db);
  ensureAcademicSystemShape(db);
  const legacy = (db.classes || []).find((row) => str(row.id) === str(req.params.classId) && row.isActive === false);
  if (!legacy) return res.status(404).json({ message: "Legacy class could not be found." });
  const target = getApprovedClassConfig(req.body?.targetClassId || req.body?.targetClassName);
  if (!target) return res.status(400).json({ message: "Select a valid active target class." });

  const existing = (db.academicClassMigrationPlans || []).find((row) => str(row.legacyClassId) === str(legacy.id));
  const row = {
    id: existing?.id || `class-migration-${nanoid(10)}`,
    legacyClassId: str(legacy.id),
    legacyClassName: str(legacy.name),
    targetClassId: target.id,
    targetClassName: target.name,
    status: "PLANNED",
    notes: str(req.body?.notes),
    createdBy: existing?.createdBy || str(req.user?.id),
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (existing) Object.assign(existing, row);
  else db.academicClassMigrationPlans.unshift(row);
  appendAcademicAuditLog(db, req.user || {}, "legacy_class_migration_planned", row);
  writeDB(db);
  res.status(existing ? 200 : 201).json(row);
});

router.post("/legacy-classes/:classId/migrate-students", auth(), requireRole(...MANAGE_ROLES), (req, res) => {
  const db = readDB();
  ensureAcademicScope(db);
  ensureAcademicSystemShape(db);
  if (req.body?.confirm !== true) {
    return res.status(400).json({ message: "Set confirm to true to migrate current student class assignments." });
  }
  const legacy = (db.classes || []).find((row) => str(row.id) === str(req.params.classId) && row.isActive === false);
  if (!legacy) return res.status(404).json({ message: "Legacy class could not be found." });
  const target = getApprovedClassConfig(req.body?.targetClassId || legacy.legacyTargetClassId || req.body?.targetClassName);
  if (!target) return res.status(400).json({ message: "A valid active target class is required." });

  const legacyNameKey = normalizeAcademicKey(legacy.name);
  const touched = [];
  (db.students || []).forEach((student) => {
    if (!isCurrentStudent(student)) return;
    if (str(student.classId) !== str(legacy.id) && normalizeAcademicKey(student.className) !== legacyNameKey) return;
    student.classHistory = Array.isArray(student.classHistory) ? student.classHistory : [];
    student.classHistory.unshift({
      classId: str(student.classId),
      className: str(student.className),
      migratedToClassId: target.id,
      migratedToClassName: target.name,
      migratedAt: new Date().toISOString(),
      migratedBy: str(req.user?.id),
      reason: str(req.body?.reason || "Legacy class mapped to active AMES class"),
    });
    student.classId = target.id;
    student.className = target.name;
    student.updatedAt = new Date().toISOString();
    touched.push(student.id);
  });

  appendAcademicAuditLog(db, req.user || {}, "legacy_class_students_migrated", {
    legacyClassId: legacy.id,
    legacyClassName: legacy.name,
    targetClassId: target.id,
    targetClassName: target.name,
    studentCount: touched.length,
  });
  writeDB(db);
  res.json({ migratedStudentIds: touched, count: touched.length, targetClass: target });
});

module.exports = router;
