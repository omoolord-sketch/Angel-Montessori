const express = require("express");
const { auth, requireRole } = require("../middleware/auth");
const { readDB, writeDB } = require("../lib/jsonStore");
const {
  LEADER_ROLES,
  QA_ROLES,
  actionRows,
  createEnvironmentWalk,
  createLeadershipNote,
  createModerationRecord,
  createQAAction,
  ensureEarlyYearsQAShape,
  getAssessmentQA,
  getClassQAView,
  getCurriculumQA,
  getEnvironmentQA,
  getGovernanceSummary,
  getInclusionQA,
  getLearningJournalQA,
  getLiteracyQA,
  getParentPartnershipQA,
  getPlanningQA,
  getQADashboard,
  getReportingQA,
  getSystemHealth,
  getTeacherQATasks,
  getTransitionQA,
  moderationRows,
  runDataQualityEngine,
  runSystemIntegrityAudit,
  setupPayload,
  updateEnvironmentWalk,
  updateModerationRecord,
  updateQAAction,
} = require("../lib/earlyYearsQA");

const router = express.Router();

router.use(auth());

function handleError(res, error) {
  return res.status(error?.status || 500).json({ message: error?.message || "Early Years quality assurance request failed" });
}

function readQADb() {
  const db = readDB();
  const { mutated } = ensureEarlyYearsQAShape(db);
  if (mutated) writeDB(db);
  return db;
}

function withSetup(db, user, payload) {
  return { ...payload, setup: setupPayload(db, user) };
}

router.get("/qa/setup", requireRole(...QA_ROLES), (req, res) => {
  try {
    const db = readQADb();
    return res.json(setupPayload(db, req.user));
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/qa/dashboard", requireRole(...QA_ROLES), (req, res) => {
  try {
    const db = readQADb();
    return res.json(withSetup(db, req.user, getQADashboard(db, req.user, req.query || {})));
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/qa/class/:classId", requireRole(...QA_ROLES), (req, res) => {
  try {
    const db = readQADb();
    return res.json(withSetup(db, req.user, getClassQAView(db, req.user, req.params.classId, req.query || {})));
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/qa/teacher/me", requireRole(...QA_ROLES), (req, res) => {
  try {
    const db = readQADb();
    return res.json(withSetup(db, req.user, getTeacherQATasks(db, req.user, req.query || {})));
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/qa/curriculum", requireRole(...QA_ROLES), (req, res) => {
  try {
    const db = readQADb();
    return res.json(withSetup(db, req.user, getCurriculumQA(db, req.user, req.query || {})));
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/qa/planning", requireRole(...QA_ROLES), (req, res) => {
  try {
    const db = readQADb();
    return res.json(withSetup(db, req.user, getPlanningQA(db, req.user, req.query || {})));
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/qa/assessment", requireRole(...QA_ROLES), (req, res) => {
  try {
    const db = readQADb();
    return res.json(withSetup(db, req.user, getAssessmentQA(db, req.user, req.query || {})));
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/qa/journal", requireRole(...QA_ROLES), (req, res) => {
  try {
    const db = readQADb();
    return res.json(withSetup(db, req.user, getLearningJournalQA(db, req.user, req.query || {})));
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/qa/literacy", requireRole(...QA_ROLES), (req, res) => {
  try {
    const db = readQADb();
    return res.json(withSetup(db, req.user, getLiteracyQA(db, req.user, req.query || {})));
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/qa/environment", requireRole(...QA_ROLES), (req, res) => {
  try {
    const db = readQADb();
    return res.json(withSetup(db, req.user, getEnvironmentQA(db, req.user, req.query || {})));
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/qa/inclusion", requireRole(...QA_ROLES), (req, res) => {
  try {
    const db = readQADb();
    return res.json(withSetup(db, req.user, getInclusionQA(db, req.user, req.query || {})));
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/qa/parent-partnership", requireRole(...QA_ROLES), (req, res) => {
  try {
    const db = readQADb();
    return res.json(withSetup(db, req.user, getParentPartnershipQA(db, req.user, req.query || {})));
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/qa/reporting", requireRole(...QA_ROLES), (req, res) => {
  try {
    const db = readQADb();
    return res.json(withSetup(db, req.user, getReportingQA(db, req.user, req.query || {})));
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/qa/transition", requireRole(...QA_ROLES), (req, res) => {
  try {
    const db = readQADb();
    return res.json(withSetup(db, req.user, getTransitionQA(db, req.user, req.query || {})));
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/qa/data-quality", requireRole(...LEADER_ROLES), (req, res) => {
  try {
    const db = readQADb();
    return res.json(withSetup(db, req.user, runDataQualityEngine(db, req.user, req.query || {})));
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/qa/system-health", requireRole(...LEADER_ROLES), (req, res) => {
  try {
    const db = readQADb();
    return res.json(withSetup(db, req.user, getSystemHealth(db, req.user, req.query || {})));
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/qa/governance-summary", requireRole(...LEADER_ROLES), (req, res) => {
  try {
    const db = readQADb();
    return res.json(withSetup(db, req.user, getGovernanceSummary(db, req.user, req.query || {})));
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/qa/actions", requireRole(...QA_ROLES), (req, res) => {
  try {
    const db = readQADb();
    return res.json({ actions: actionRows(db, req.user, req.query || {}), setup: setupPayload(db, req.user) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/qa/actions", requireRole(...LEADER_ROLES), (req, res) => {
  try {
    const db = readQADb();
    const action = createQAAction(db, req.user, req.body || {});
    writeDB(db);
    return res.status(201).json({ action });
  } catch (error) {
    return handleError(res, error);
  }
});

router.put("/qa/actions/:id", requireRole(...QA_ROLES), (req, res) => {
  try {
    const db = readQADb();
    const action = updateQAAction(db, req.user, req.params.id, req.body || {});
    writeDB(db);
    return res.json({ action });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/qa/moderation", requireRole(...QA_ROLES), (req, res) => {
  try {
    const db = readQADb();
    return res.json({ moderation: moderationRows(db, req.user, req.query || {}), setup: setupPayload(db, req.user) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/qa/moderation", requireRole(...LEADER_ROLES), (req, res) => {
  try {
    const db = readQADb();
    const moderation = createModerationRecord(db, req.user, req.body || {});
    writeDB(db);
    return res.status(201).json({ moderation });
  } catch (error) {
    return handleError(res, error);
  }
});

router.put("/qa/moderation/:id", requireRole(...LEADER_ROLES), (req, res) => {
  try {
    const db = readQADb();
    const moderation = updateModerationRecord(db, req.user, req.params.id, req.body || {});
    writeDB(db);
    return res.json({ moderation });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/qa/environment-walks", requireRole(...QA_ROLES), (req, res) => {
  try {
    const db = readQADb();
    const allowedClasses = new Set((setupPayload(db, req.user).classes || []).map((row) => String(row.id || row.name || row.className || "")));
    const rows = (db.earlyYearsQAEnvironmentWalks || []).filter((row) => {
      if (req.query?.classId && String(row.classId || "") !== String(req.query.classId || "")) return false;
      if (LEADER_ROLES.includes(String(req.user?.role || "").toUpperCase())) return true;
      return allowedClasses.has(String(row.classId || row.className || ""));
    });
    return res.json({ environmentWalks: rows, setup: setupPayload(db, req.user) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/qa/environment-walks", requireRole(...LEADER_ROLES), (req, res) => {
  try {
    const db = readQADb();
    const environmentWalk = createEnvironmentWalk(db, req.user, req.body || {});
    writeDB(db);
    return res.status(201).json({ environmentWalk });
  } catch (error) {
    return handleError(res, error);
  }
});

router.put("/qa/environment-walks/:id", requireRole(...LEADER_ROLES), (req, res) => {
  try {
    const db = readQADb();
    const environmentWalk = updateEnvironmentWalk(db, req.user, req.params.id, req.body || {});
    writeDB(db);
    return res.json({ environmentWalk });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/qa/leadership-notes", requireRole(...LEADER_ROLES), (req, res) => {
  try {
    const db = readQADb();
    return res.json({ notes: db.earlyYearsQALeadershipNotes || [], setup: setupPayload(db, req.user) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/qa/leadership-notes", requireRole(...LEADER_ROLES), (req, res) => {
  try {
    const db = readQADb();
    const note = createLeadershipNote(db, req.user, req.body || {});
    writeDB(db);
    return res.status(201).json({ note });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/qa/run-audit", requireRole(...LEADER_ROLES), (req, res) => {
  try {
    const db = readQADb();
    const audit = runSystemIntegrityAudit(db, req.user, req.body || {});
    writeDB(db);
    return res.status(201).json({ audit });
  } catch (error) {
    return handleError(res, error);
  }
});

module.exports = router;
