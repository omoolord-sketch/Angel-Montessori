const express = require("express");
const path = require("path");
const { auth, requireRole } = require("../middleware/auth");
const { readDB, writeDB } = require("../lib/jsonStore");
const {
  CONFIRMATION_TEXT,
  dryRunVolumeIIIImport,
  executeVolumeIIIImport,
  getVolumeIIIImportStatus,
} = require("../lib/amesVolumeIIIAdminImport");
const {
  CURRICULUM_MANAGE_ROLES,
  CURRICULUM_VIEW_ROLES,
  EYFS_AREA_REFS,
  AMES_DIMENSION_REFS,
  FRAMEWORK_CODE,
  SOURCE_DOCUMENT,
  SOURCE_VERSION,
  TEACHER_PLAN_ROLES,
  ensureEarlyYearsCurriculumShape,
  findAcademicSession,
  findAcademicTerm,
  getCurrentWeek,
  getFramework,
  importCurriculumFile,
  listAccessibleEarlyYearsClasses,
  listCurriculum,
  searchCurriculum,
  seedDirectory,
  str,
  validateImportPayload,
} = require("../lib/earlyYearsCurriculum");
const { createWeeklyPlanFromCurriculum } = require("../lib/earlyYearsPlanning");

const router = express.Router();

router.use(auth());

function handleError(res, error) {
  return res.status(error?.status || 500).json({ message: error?.message || "Early Years curriculum request failed" });
}

function handleImportError(res, error) {
  return res.status(error?.status || 500).json({
    message: error?.message || "AMES Volume III import request failed",
    details: error?.details || null,
  });
}

function readCurriculumDb() {
  const db = readDB();
  const { mutated } = ensureEarlyYearsCurriculumShape(db);
  if (mutated) writeDB(db);
  return db;
}

function buildSetup(db, user) {
  return {
    framework: getFramework(db),
    frameworks: db.curriculumFrameworks || [],
    versions: db.curriculumFrameworkVersions || [],
    eyfsAreas: EYFS_AREA_REFS,
    amesDimensions: AMES_DIMENSION_REFS,
    classes: listAccessibleEarlyYearsClasses(db, user),
    sessions: db.academicSessions || db.lmsSessions || [],
    terms: db.terms || db.lmsTerms || [],
    importBatches: (db.curriculumImportBatches || []).slice(0, 20),
    sourceDocument: SOURCE_DOCUMENT,
    sourceVersion: SOURCE_VERSION,
  };
}

function queryFilters(req) {
  return {
    frameworkId: req.query.frameworkId,
    frameworkCode: req.query.frameworkCode,
    version: req.query.version,
    sessionId: req.query.sessionId,
    sessionName: req.query.sessionName,
    termId: req.query.termId,
    termName: req.query.termName,
    classId: req.query.classId,
    className: req.query.className,
    keyword: req.query.keyword || req.query.q,
    eyfsArea: req.query.eyfsArea || req.query.area,
    dimension: req.query.dimension,
    weekNumber: req.query.weekNumber,
  };
}

router.get("/frameworks", requireRole(...CURRICULUM_VIEW_ROLES), (req, res) => {
  const db = readCurriculumDb();
  return res.json(buildSetup(db, req.user));
});

router.get("/", requireRole(...CURRICULUM_VIEW_ROLES), (req, res) => {
  try {
    const db = readCurriculumDb();
    return res.json({ ...listCurriculum(db, queryFilters(req), req.user), setup: buildSetup(db, req.user) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/search", requireRole(...CURRICULUM_VIEW_ROLES), (req, res) => {
  try {
    const db = readCurriculumDb();
    return res.json(searchCurriculum(db, queryFilters(req), req.user));
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/current", requireRole(...CURRICULUM_VIEW_ROLES), (req, res) => {
  try {
    const db = readCurriculumDb();
    return res.json(getCurrentWeek(db, queryFilters(req), req.user));
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/version/:versionId", requireRole(...CURRICULUM_VIEW_ROLES), (req, res) => {
  const db = readCurriculumDb();
  const versionId = str(req.params.versionId);
  const version = (db.curriculumFrameworkVersions || []).find(
    (row) => str(row.id) === versionId || str(row.version) === versionId || str(row.frameworkCode) === versionId
  );
  if (!version) return res.status(404).json({ message: "Curriculum version could not be found." });
  const framework = (db.curriculumFrameworks || []).find((row) => str(row.id) === str(version.frameworkId)) || getFramework(db);
  return res.json({ version, framework });
});

router.get("/weeks/:weekId", requireRole(...CURRICULUM_VIEW_ROLES), (req, res) => {
  try {
    const db = readCurriculumDb();
    const weekId = str(req.params.weekId);
    const week = (db.curriculumWeeks || []).find((row) => str(row.id) === weekId || str(row.code) === weekId);
    if (!week) return res.status(404).json({ message: "Curriculum week could not be found." });
    const term = (db.curriculumTerms || []).find((row) => str(row.id) === str(week.curriculumTermId));
    const detail = listCurriculum(db, {
      frameworkId: term?.frameworkId,
      classId: term?.classId || term?.classLevelCode,
      termName: term?.termName,
      sessionId: req.query.sessionId || term?.academicSessionId,
    }, req.user);
    const enriched = detail.weeks.find((row) => str(row.id) === str(week.id));
    if (!enriched) return res.status(403).json({ message: "You do not have access to this curriculum week." });
    return res.json({ week: enriched, term, framework: detail.framework, class: detail.class });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/weeks/:weekId/plans", requireRole(...TEACHER_PLAN_ROLES), (req, res) => {
  try {
    const db = readCurriculumDb();
    const result = createWeeklyPlanFromCurriculum(db, req.params.weekId, req.user, req.body || {});
    writeDB(db);
    return res.status(result.created ? 201 : 200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/teacher/my-curriculum", requireRole("TEACHER"), (req, res) => {
  try {
    const db = readCurriculumDb();
    const classes = listAccessibleEarlyYearsClasses(db, req.user);
    const selectedClass = req.query.classId || classes[0]?.id || "";
    if (!selectedClass) {
      return res.json({ classes, weeks: [], sourceReady: false, sourceMessage: "No Early Years class is assigned to this teacher account yet." });
    }
    return res.json({ ...listCurriculum(db, { ...queryFilters(req), classId: selectedClass }, req.user), classes });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/admin/import-status", requireRole(...CURRICULUM_MANAGE_ROLES), (req, res) => {
  const db = readCurriculumDb();
  return res.json({
    frameworkCode: FRAMEWORK_CODE,
    seedDirectory: seedDirectory(),
    importBatches: db.curriculumImportBatches || [],
    auditLogs: (db.curriculumAuditLogs || []).slice(0, 100),
  });
});

router.get("/admin/volume-iii-import/status", requireRole("ADMIN", "SUPER_ADMIN"), (req, res) => {
  try {
    return res.json({ status: getVolumeIIIImportStatus(), confirmationText: CONFIRMATION_TEXT });
  } catch (error) {
    return handleImportError(res, error);
  }
});

router.get("/admin/volume-iii-import/dry-run", requireRole("ADMIN", "SUPER_ADMIN"), (req, res) => {
  try {
    return res.json({ dryRun: dryRunVolumeIIIImport(req.user), confirmationText: CONFIRMATION_TEXT });
  } catch (error) {
    return handleImportError(res, error);
  }
});

router.post("/admin/volume-iii-import/execute", requireRole("ADMIN", "SUPER_ADMIN"), (req, res) => {
  try {
    const result = executeVolumeIIIImport({
      actor: req.user,
      confirmation: req.body?.confirmation || req.body?.confirm,
    });
    return res.json({ result });
  } catch (error) {
    return handleImportError(res, error);
  }
});

router.post("/admin/import", requireRole(...CURRICULUM_MANAGE_ROLES), (req, res) => {
  try {
    const sourceFile = str(req.body?.sourceFile);
    if (!sourceFile) return res.status(400).json({ message: "sourceFile is required." });
    const base = seedDirectory();
    const fullPath = path.resolve(base, sourceFile);
    if (!fullPath.startsWith(path.resolve(base))) {
      return res.status(400).json({ message: "sourceFile must be inside the AMES Volume III curriculum seed directory." });
    }
    const db = readCurriculumDb();
    const report = importCurriculumFile(db, fullPath, { dryRun: Boolean(req.body?.dryRun), actor: req.user });
    if (!req.body?.dryRun && report.result === "PASS") writeDB(db);
    return res.status(report.result === "FAILED" ? 400 : 200).json({ report });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/admin/validate", requireRole(...CURRICULUM_MANAGE_ROLES), (req, res) => {
  try {
    const report = validateImportPayload(req.body || {}, "request-body");
    return res.status(report.errors.length ? 400 : 200).json(report);
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/resolve-scope", requireRole(...CURRICULUM_VIEW_ROLES), (req, res) => {
  const db = readCurriculumDb();
  const session = findAcademicSession(db, req.query.sessionId || req.query.sessionName);
  const term = findAcademicTerm(db, req.query.termId || req.query.termName, session?.id || "");
  return res.json({ session, term });
});

module.exports = router;
