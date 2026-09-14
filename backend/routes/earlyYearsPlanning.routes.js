const express = require("express");
const { auth, requireRole } = require("../middleware/auth");
const { readDB, writeDB } = require("../lib/jsonStore");
const {
  CURRICULUM_VIEW_ROLES,
  EYFS_AREA_REFS,
  AMES_DIMENSION_REFS,
  getFramework,
  listAccessibleEarlyYearsClasses,
} = require("../lib/earlyYearsCurriculum");
const {
  PLAN_ROLES,
  REVIEW_ROLES,
  approveWeeklyPlan,
  buildPrintHtml,
  copyPreviousWeekStructure,
  createWeeklyPlanFromCurriculum,
  ensureEarlyYearsPlanningShape,
  getWeeklyPlanDetail,
  listWeeklyPlans,
  returnWeeklyPlan,
  reviewWeeklyPlan,
  saveDailyRecord,
  saveWeeklyReview,
  submitWeeklyPlan,
  updateWeeklyPlan,
} = require("../lib/earlyYearsPlanning");

const router = express.Router();

router.use(auth());

function handleError(res, error) {
  return res.status(error?.status || 500).json({ message: error?.message || "Early Years planning request failed" });
}

function readPlanningDb() {
  const db = readDB();
  const { mutated } = ensureEarlyYearsPlanningShape(db);
  if (mutated) writeDB(db);
  return db;
}

function setupPayload(db, user) {
  return {
    framework: getFramework(db),
    eyfsAreas: EYFS_AREA_REFS,
    amesDimensions: AMES_DIMENSION_REFS,
    classes: listAccessibleEarlyYearsClasses(db, user),
    sessions: db.academicSessions || db.lmsSessions || [],
    terms: db.terms || db.lmsTerms || [],
    statuses: ["DRAFT", "SUBMITTED", "REVIEWED", "APPROVED", "RETURNED_FOR_REVISION", "ARCHIVED"],
  };
}

router.get("/setup", requireRole(...PLAN_ROLES), (req, res) => {
  try {
    const db = readPlanningDb();
    return res.json(setupPayload(db, req.user));
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/", requireRole(...PLAN_ROLES), (req, res) => {
  try {
    const db = readPlanningDb();
    const result = listWeeklyPlans(db, req.query || {}, req.user);
    return res.json({ ...result, setup: setupPayload(db, req.user) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/", requireRole(...PLAN_ROLES), (req, res) => {
  try {
    const db = readPlanningDb();
    const weekId = req.body?.curriculumWeekId || req.body?.weekId;
    const result = createWeeklyPlanFromCurriculum(db, weekId, req.user, req.body || {});
    writeDB(db);
    return res.status(result.created ? 201 : 200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/:id/print", requireRole(...PLAN_ROLES), (req, res) => {
  try {
    const db = readPlanningDb();
    const detail = getWeeklyPlanDetail(db, req.params.id, req.user);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(buildPrintHtml(detail));
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/:id/daily", requireRole(...PLAN_ROLES), (req, res) => {
  try {
    const db = readPlanningDb();
    const detail = getWeeklyPlanDetail(db, req.params.id, req.user);
    return res.json({ dailyRecords: detail.dailyRecords });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/:id/daily", requireRole(...PLAN_ROLES), (req, res) => {
  try {
    const db = readPlanningDb();
    const dailyRecord = saveDailyRecord(db, req.params.id, req.user, req.body || {});
    writeDB(db);
    return res.status(201).json({ dailyRecord });
  } catch (error) {
    return handleError(res, error);
  }
});

router.put("/:id/daily/:dailyId", requireRole(...PLAN_ROLES), (req, res) => {
  try {
    const db = readPlanningDb();
    const dailyRecord = saveDailyRecord(db, req.params.id, req.user, req.body || {}, req.params.dailyId);
    writeDB(db);
    return res.json({ dailyRecord });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/:id/weekly-review", requireRole(...PLAN_ROLES), (req, res) => {
  try {
    const db = readPlanningDb();
    const weeklyReview = saveWeeklyReview(db, req.params.id, req.user, req.body || {});
    writeDB(db);
    return res.json({ weeklyReview });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/:id/copy-previous-structure", requireRole(...PLAN_ROLES), (req, res) => {
  try {
    const db = readPlanningDb();
    const result = copyPreviousWeekStructure(db, req.params.id, req.user);
    writeDB(db);
    return res.json(result);
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/:id/submit", requireRole(...PLAN_ROLES), (req, res) => {
  try {
    const db = readPlanningDb();
    const plan = submitWeeklyPlan(db, req.params.id, req.user);
    writeDB(db);
    return res.json({ plan });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/:id/review", requireRole(...REVIEW_ROLES), (req, res) => {
  try {
    const db = readPlanningDb();
    const plan = reviewWeeklyPlan(db, req.params.id, req.user, req.body || {});
    writeDB(db);
    return res.json({ plan });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/:id/approve", requireRole(...REVIEW_ROLES), (req, res) => {
  try {
    const db = readPlanningDb();
    const plan = approveWeeklyPlan(db, req.params.id, req.user, req.body || {});
    writeDB(db);
    return res.json({ plan });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/:id/return", requireRole(...REVIEW_ROLES), (req, res) => {
  try {
    const db = readPlanningDb();
    const plan = returnWeeklyPlan(db, req.params.id, req.user, req.body || {});
    writeDB(db);
    return res.json({ plan });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/:id", requireRole(...PLAN_ROLES), (req, res) => {
  try {
    const db = readPlanningDb();
    return res.json(getWeeklyPlanDetail(db, req.params.id, req.user));
  } catch (error) {
    return handleError(res, error);
  }
});

router.put("/:id", requireRole(...PLAN_ROLES), (req, res) => {
  try {
    const db = readPlanningDb();
    const plan = updateWeeklyPlan(db, req.params.id, req.user, req.body || {});
    writeDB(db);
    return res.json({ plan });
  } catch (error) {
    return handleError(res, error);
  }
});

module.exports = router;
