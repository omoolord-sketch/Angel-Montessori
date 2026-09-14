const express = require("express");
const { auth, requireRole } = require("../middleware/auth");
const { readDB, writeDB } = require("../lib/jsonStore");
const { listAccessibleEarlyYearsClasses } = require("../lib/earlyYearsCurriculum");
const {
  CHECKLIST_DOMAIN_FIELDS,
  CHECKLIST_STATUSES,
  ENHANCEMENT_STATUSES,
  ENVIRONMENT_ACTION_STATUSES,
  ENVIRONMENT_ROLES,
  PRACTICAL_LIFE_CATEGORIES,
  PRACTICAL_LIFE_PROGRESSION,
  PREPARED_ENVIRONMENT_CYCLE,
  PROVISION_AREA_TYPES,
  RESOURCE_CONDITIONS,
  RESOURCE_REQUEST_PRIORITIES,
  RESOURCE_REQUEST_STATUSES,
  REVIEW_DECISIONS,
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
} = require("../lib/earlyYearsEnvironment");

const router = express.Router();

router.use(auth());

function handleError(res, error) {
  return res.status(error?.status || 500).json({ message: error?.message || "Early Years environment request failed" });
}

function readEnvironmentDb() {
  const db = readDB();
  const { mutated } = ensureEarlyYearsEnvironmentShape(db);
  if (mutated) writeDB(db);
  return db;
}

function setupPayload(db, user) {
  return {
    classes: listAccessibleEarlyYearsClasses(db, user),
    sessions: db.academicSessions || db.lmsSessions || [],
    terms: db.terms || db.lmsTerms || [],
    provisionAreaTypes: PROVISION_AREA_TYPES,
    practicalLifeCategories: PRACTICAL_LIFE_CATEGORIES,
    practicalLifeProgression: PRACTICAL_LIFE_PROGRESSION,
    checklistDomains: CHECKLIST_DOMAIN_FIELDS,
    checklistStatuses: CHECKLIST_STATUSES,
    enhancementStatuses: ENHANCEMENT_STATUSES,
    reviewDecisions: REVIEW_DECISIONS,
    resourceConditions: RESOURCE_CONDITIONS,
    resourceRequestPriorities: RESOURCE_REQUEST_PRIORITIES,
    resourceRequestStatuses: RESOURCE_REQUEST_STATUSES,
    actionStatuses: ENVIRONMENT_ACTION_STATUSES,
    preparedEnvironmentCycle: PREPARED_ENVIRONMENT_CYCLE,
  };
}

router.get("/environment/setup", requireRole(...ENVIRONMENT_ROLES), (req, res) => {
  try {
    const db = readEnvironmentDb();
    return res.json(setupPayload(db, req.user));
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/environment/dashboard", requireRole(...ENVIRONMENT_ROLES), (req, res) => {
  try {
    const db = readEnvironmentDb();
    return res.json({ ...getEnvironmentDashboard(db, req.user, req.query || {}), setup: setupPayload(db, req.user) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/environment/areas", requireRole(...ENVIRONMENT_ROLES), (req, res) => {
  try {
    const db = readEnvironmentDb();
    return res.json({ provisionAreas: listProvisionAreas(db, req.user, req.query || {}) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/environment/areas", requireRole(...ENVIRONMENT_ROLES), (req, res) => {
  try {
    const db = readEnvironmentDb();
    const provisionArea = createProvisionArea(db, req.user, req.body || {});
    writeDB(db);
    return res.status(201).json({ provisionArea });
  } catch (error) {
    return handleError(res, error);
  }
});

router.put("/environment/areas/:id", requireRole(...ENVIRONMENT_ROLES), (req, res) => {
  try {
    const db = readEnvironmentDb();
    const provisionArea = updateProvisionArea(db, req.user, req.params.id, req.body || {});
    writeDB(db);
    return res.json({ provisionArea });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/environment/enhancements", requireRole(...ENVIRONMENT_ROLES), (req, res) => {
  try {
    const db = readEnvironmentDb();
    return res.json({ enhancements: listWeeklyEnhancements(db, req.user, req.query || {}) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/environment/enhancements", requireRole(...ENVIRONMENT_ROLES), (req, res) => {
  try {
    const db = readEnvironmentDb();
    const enhancement = createWeeklyEnhancement(db, req.user, req.body || {});
    writeDB(db);
    return res.status(201).json({ enhancement });
  } catch (error) {
    return handleError(res, error);
  }
});

router.put("/environment/enhancements/:id", requireRole(...ENVIRONMENT_ROLES), (req, res) => {
  try {
    const db = readEnvironmentDb();
    const enhancement = updateWeeklyEnhancement(db, req.user, req.params.id, req.body || {});
    writeDB(db);
    return res.json({ enhancement });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/practical-life", requireRole(...ENVIRONMENT_ROLES), (req, res) => {
  try {
    const db = readEnvironmentDb();
    return res.json({ activities: listPracticalLifeActivities(db, req.user, req.query || {}) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/practical-life", requireRole(...ENVIRONMENT_ROLES), (req, res) => {
  try {
    const db = readEnvironmentDb();
    const activity = createPracticalLifeActivity(db, req.user, req.body || {});
    writeDB(db);
    return res.status(201).json({ activity });
  } catch (error) {
    return handleError(res, error);
  }
});

router.put("/practical-life/:id", requireRole(...ENVIRONMENT_ROLES), (req, res) => {
  try {
    const db = readEnvironmentDb();
    const activity = updatePracticalLifeActivity(db, req.user, req.params.id, req.body || {});
    writeDB(db);
    return res.json({ activity });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/practical-life/assignments", requireRole(...ENVIRONMENT_ROLES), (req, res) => {
  try {
    const db = readEnvironmentDb();
    return res.json({ assignments: listPracticalLifeAssignments(db, req.user, req.query || {}) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/practical-life/assignments", requireRole(...ENVIRONMENT_ROLES), (req, res) => {
  try {
    const db = readEnvironmentDb();
    const assignment = createPracticalLifeAssignment(db, req.user, req.body || {});
    writeDB(db);
    return res.status(201).json({ assignment });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/environment/checklists", requireRole(...ENVIRONMENT_ROLES), (req, res) => {
  try {
    const db = readEnvironmentDb();
    return res.json({ checklists: listEnvironmentChecklists(db, req.user, req.query || {}) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/environment/checklists", requireRole(...ENVIRONMENT_ROLES), (req, res) => {
  try {
    const db = readEnvironmentDb();
    const result = createEnvironmentChecklist(db, req.user, req.body || {});
    writeDB(db);
    return res.status(201).json(result);
  } catch (error) {
    return handleError(res, error);
  }
});

router.put("/environment/checklists/:id", requireRole(...ENVIRONMENT_ROLES), (req, res) => {
  try {
    const db = readEnvironmentDb();
    const result = updateEnvironmentChecklist(db, req.user, req.params.id, req.body || {});
    writeDB(db);
    return res.json(result);
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/environment/checklists/:id/print", requireRole(...ENVIRONMENT_ROLES), (req, res) => {
  try {
    const db = readEnvironmentDb();
    const checklist = listEnvironmentChecklists(db, req.user, {}).find((row) => String(row.id) === String(req.params.id));
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(buildChecklistPrintHtml(checklist));
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/environment/actions", requireRole(...ENVIRONMENT_ROLES), (req, res) => {
  try {
    const db = readEnvironmentDb();
    return res.json({ actions: listEnvironmentActions(db, req.user, req.query || {}) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.put("/environment/actions/:id", requireRole(...ENVIRONMENT_ROLES), (req, res) => {
  try {
    const db = readEnvironmentDb();
    const action = updateEnvironmentAction(db, req.user, req.params.id, req.body || {});
    writeDB(db);
    return res.json({ action });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/environment/resources", requireRole(...ENVIRONMENT_ROLES), (req, res) => {
  try {
    const db = readEnvironmentDb();
    return res.json({ resources: listResources(db, req.user, req.query || {}) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/environment/resources", requireRole(...ENVIRONMENT_ROLES), (req, res) => {
  try {
    const db = readEnvironmentDb();
    const resource = createResource(db, req.user, req.body || {});
    writeDB(db);
    return res.status(201).json({ resource });
  } catch (error) {
    return handleError(res, error);
  }
});

router.put("/environment/resources/:id", requireRole(...ENVIRONMENT_ROLES), (req, res) => {
  try {
    const db = readEnvironmentDb();
    const resource = updateResource(db, req.user, req.params.id, req.body || {});
    writeDB(db);
    return res.json({ resource });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/environment/resource-requests", requireRole(...ENVIRONMENT_ROLES), (req, res) => {
  try {
    const db = readEnvironmentDb();
    return res.json({ resourceRequests: listResourceRequests(db, req.user, req.query || {}) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/environment/resource-requests", requireRole(...ENVIRONMENT_ROLES), (req, res) => {
  try {
    const db = readEnvironmentDb();
    const resourceRequest = createResourceRequest(db, req.user, req.body || {});
    writeDB(db);
    return res.status(201).json({ resourceRequest });
  } catch (error) {
    return handleError(res, error);
  }
});

router.put("/environment/resource-requests/:id", requireRole(...ENVIRONMENT_ROLES), (req, res) => {
  try {
    const db = readEnvironmentDb();
    const resourceRequest = updateResourceRequest(db, req.user, req.params.id, req.body || {});
    writeDB(db);
    return res.json({ resourceRequest });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/environment/resource-requests/:id/print", requireRole(...ENVIRONMENT_ROLES), (req, res) => {
  try {
    const db = readEnvironmentDb();
    const request = listResourceRequests(db, req.user, {}).find((row) => String(row.id) === String(req.params.id));
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(buildResourceRequestPrintHtml(request));
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/environment/reviews", requireRole(...ENVIRONMENT_ROLES), (req, res) => {
  try {
    const db = readEnvironmentDb();
    return res.json({ reviews: listEnvironmentReviews(db, req.user, req.query || {}) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/environment/reviews", requireRole(...ENVIRONMENT_ROLES), (req, res) => {
  try {
    const db = readEnvironmentDb();
    const review = createEnvironmentReview(db, req.user, req.body || {});
    writeDB(db);
    return res.status(201).json({ review });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/environment/displays", requireRole(...ENVIRONMENT_ROLES), (req, res) => {
  try {
    const db = readEnvironmentDb();
    return res.json({ displays: listDisplayReviews(db, req.user, req.query || {}) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/environment/displays", requireRole(...ENVIRONMENT_ROLES), (req, res) => {
  try {
    const db = readEnvironmentDb();
    const display = createDisplayReview(db, req.user, req.body || {});
    writeDB(db);
    return res.status(201).json({ display });
  } catch (error) {
    return handleError(res, error);
  }
});

module.exports = router;
