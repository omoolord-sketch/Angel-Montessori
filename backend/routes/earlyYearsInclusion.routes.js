const express = require("express");
const { auth, requireRole } = require("../middleware/auth");
const { readDB, writeDB } = require("../lib/jsonStore");
const { listAccessibleEarlyYearsClasses } = require("../lib/earlyYearsCurriculum");
const {
  ACKNOWLEDGEMENT_STATUSES,
  CONCERN_AREAS,
  CONCERN_STATUSES,
  CONSENT_STATUSES,
  INCLUSION_CYCLE,
  INCLUSION_ROLES,
  MEETING_TYPES,
  PARENT_PARTNERSHIP_CYCLE,
  REFERRAL_STATUSES,
  REVIEW_OUTCOMES,
  SUPPORT_LEVELS,
  SUPPORT_PLAN_STATUSES,
  SUPPORT_PROFILE_STATUSES,
  TRANSITION_CYCLE,
  TRANSITION_STATUSES,
  VISIBILITY_LEVELS,
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
} = require("../lib/earlyYearsInclusion");

const router = express.Router();

router.use(auth());

function handleError(res, error) {
  return res.status(error?.status || 500).json({ message: error?.message || "Early Years inclusion request failed" });
}

function readInclusionDb() {
  const db = readDB();
  const { mutated } = ensureEarlyYearsInclusionShape(db);
  if (mutated) writeDB(db);
  return db;
}

function setupPayload(db, user) {
  return {
    classes: listAccessibleEarlyYearsClasses(db, user),
    students: listAccessibleEarlyYearsStudents(db, user, {}),
    sessions: db.academicSessions || db.lmsSessions || [],
    terms: db.terms || db.lmsTerms || [],
    supportLevels: SUPPORT_LEVELS,
    supportProfileStatuses: SUPPORT_PROFILE_STATUSES,
    concernAreas: CONCERN_AREAS,
    concernStatuses: CONCERN_STATUSES,
    supportPlanStatuses: SUPPORT_PLAN_STATUSES,
    reviewOutcomes: REVIEW_OUTCOMES,
    referralStatuses: REFERRAL_STATUSES,
    consentStatuses: CONSENT_STATUSES,
    meetingTypes: MEETING_TYPES,
    acknowledgementStatuses: ACKNOWLEDGEMENT_STATUSES,
    transitionStatuses: TRANSITION_STATUSES,
    visibilityLevels: VISIBILITY_LEVELS,
    cycles: {
      inclusion: INCLUSION_CYCLE,
      parentPartnership: PARENT_PARTNERSHIP_CYCLE,
      transition: TRANSITION_CYCLE,
    },
    boundaryMessage: "Observe carefully - refer appropriately - do not diagnose casually.",
  };
}

router.get("/inclusion/setup", requireRole(...INCLUSION_ROLES), (req, res) => {
  try {
    const db = readInclusionDb();
    return res.json(setupPayload(db, req.user));
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/inclusion/dashboard", requireRole(...INCLUSION_ROLES), (req, res) => {
  try {
    const db = readInclusionDb();
    return res.json({ ...getInclusionDashboard(db, req.user, req.query || {}), setup: setupPayload(db, req.user) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/inclusion/profiles", requireRole(...INCLUSION_ROLES), (req, res) => {
  try {
    const db = readInclusionDb();
    return res.json({ profiles: listSupportProfiles(db, req.user, req.query || {}) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/inclusion/profiles", requireRole(...INCLUSION_ROLES), (req, res) => {
  try {
    const db = readInclusionDb();
    const profile = createSupportProfile(db, req.user, req.body || {});
    writeDB(db);
    return res.status(201).json({ profile });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/inclusion/profiles/:id", requireRole(...INCLUSION_ROLES), (req, res) => {
  try {
    const db = readInclusionDb();
    const profile = listSupportProfiles(db, req.user, {}).find((row) => String(row.id) === String(req.params.id));
    if (!profile) return res.status(404).json({ message: "Support profile could not be found." });
    return res.json({ profile, detail: getStudentInclusionProfile(db, req.user, profile.studentId) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.put("/inclusion/profiles/:id", requireRole(...INCLUSION_ROLES), (req, res) => {
  try {
    const db = readInclusionDb();
    const profile = updateSupportProfile(db, req.user, req.params.id, req.body || {});
    writeDB(db);
    return res.json({ profile });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/inclusion/students/:studentId", requireRole(...INCLUSION_ROLES), (req, res) => {
  try {
    const db = readInclusionDb();
    return res.json(getStudentInclusionProfile(db, req.user, req.params.studentId));
  } catch (error) {
    return handleError(res, error);
  }
});

router.put("/inclusion/students/:studentId/parent-partnership", requireRole(...INCLUSION_ROLES), (req, res) => {
  try {
    const db = readInclusionDb();
    const familyProfile = updateParentPartnershipProfile(db, req.user, req.params.studentId, req.body || {});
    writeDB(db);
    return res.json({ familyProfile });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/inclusion/concerns", requireRole(...INCLUSION_ROLES), (req, res) => {
  try {
    const db = readInclusionDb();
    const concern = createSupportConcern(db, req.user, req.body || {});
    writeDB(db);
    return res.status(201).json({ concern });
  } catch (error) {
    return handleError(res, error);
  }
});

router.put("/inclusion/concerns/:id", requireRole(...INCLUSION_ROLES), (req, res) => {
  try {
    const db = readInclusionDb();
    const concern = updateSupportConcern(db, req.user, req.params.id, req.body || {});
    writeDB(db);
    return res.json({ concern });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/inclusion/support-plans", requireRole(...INCLUSION_ROLES), (req, res) => {
  try {
    const db = readInclusionDb();
    const supportPlan = createSupportPlan(db, req.user, req.body || {});
    writeDB(db);
    return res.status(201).json({ supportPlan });
  } catch (error) {
    return handleError(res, error);
  }
});

router.put("/inclusion/support-plans/:id", requireRole(...INCLUSION_ROLES), (req, res) => {
  try {
    const db = readInclusionDb();
    const supportPlan = updateSupportPlan(db, req.user, req.params.id, req.body || {});
    writeDB(db);
    return res.json({ supportPlan });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/inclusion/support-plans/:id/review", requireRole(...INCLUSION_ROLES), (req, res) => {
  try {
    const db = readInclusionDb();
    const result = reviewSupportPlan(db, req.user, req.params.id, req.body || {});
    writeDB(db);
    return res.json(result);
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/inclusion/support-plans/:id/print", requireRole(...INCLUSION_ROLES), (req, res) => {
  try {
    const db = readInclusionDb();
    const detail = getInclusionDashboard(db, req.user, {});
    const supportPlan = detail.supportPlans.find((row) => String(row.id) === String(req.params.id));
    const profile = detail.profiles.find((row) => String(row.studentId) === String(supportPlan?.studentId));
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(buildSupportPlanPrintHtml(supportPlan, profile));
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/inclusion/strategies", requireRole(...INCLUSION_ROLES), (req, res) => {
  try {
    const db = readInclusionDb();
    return res.json({ strategies: listSupportStrategies(db, req.user, req.query || {}) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/inclusion/strategies", requireRole(...INCLUSION_ROLES), (req, res) => {
  try {
    const db = readInclusionDb();
    const strategy = createSupportStrategy(db, req.user, req.body || {});
    writeDB(db);
    return res.status(201).json({ strategy });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/inclusion/referrals", requireRole(...INCLUSION_ROLES), (req, res) => {
  try {
    const db = readInclusionDb();
    const referral = createReferralRecord(db, req.user, req.body || {});
    writeDB(db);
    return res.status(201).json({ referral });
  } catch (error) {
    return handleError(res, error);
  }
});

router.put("/inclusion/referrals/:id", requireRole(...INCLUSION_ROLES), (req, res) => {
  try {
    const db = readInclusionDb();
    const referral = updateReferralRecord(db, req.user, req.params.id, req.body || {});
    writeDB(db);
    return res.json({ referral });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/inclusion/consents", requireRole(...INCLUSION_ROLES), (req, res) => {
  try {
    const db = readInclusionDb();
    const consent = createConsentRecord(db, req.user, req.body || {});
    writeDB(db);
    return res.status(201).json({ consent });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/parent-partnership/meetings", requireRole(...INCLUSION_ROLES), (req, res) => {
  try {
    const db = readInclusionDb();
    const dashboard = getInclusionDashboard(db, req.user, req.query || {});
    return res.json({ meetings: dashboard.meetings });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/parent-partnership/meetings", requireRole(...INCLUSION_ROLES), (req, res) => {
  try {
    const db = readInclusionDb();
    const meeting = createParentMeeting(db, req.user, req.body || {});
    writeDB(db);
    return res.status(201).json({ meeting });
  } catch (error) {
    return handleError(res, error);
  }
});

router.put("/parent-partnership/meetings/:id", requireRole(...INCLUSION_ROLES), (req, res) => {
  try {
    const db = readInclusionDb();
    const meeting = updateParentMeeting(db, req.user, req.params.id, req.body || {});
    writeDB(db);
    return res.json({ meeting });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/parent-partnership/meetings/:id/print", requireRole(...INCLUSION_ROLES), (req, res) => {
  try {
    const db = readInclusionDb();
    const dashboard = getInclusionDashboard(db, req.user, {});
    const meeting = dashboard.meetings.find((row) => String(row.id) === String(req.params.id));
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(buildParentMeetingPrintHtml(meeting));
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/inclusion/parent-summaries", requireRole(...INCLUSION_ROLES), (req, res) => {
  try {
    const db = readInclusionDb();
    const summary = createParentSupportSummary(db, req.user, req.body || {});
    writeDB(db);
    return res.status(201).json({ summary });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/inclusion/transitions", requireRole(...INCLUSION_ROLES), (req, res) => {
  try {
    const db = readInclusionDb();
    const transition = createTransitionPlan(db, req.user, req.body || {});
    writeDB(db);
    return res.status(201).json({ transition });
  } catch (error) {
    return handleError(res, error);
  }
});

router.put("/inclusion/transitions/:id", requireRole(...INCLUSION_ROLES), (req, res) => {
  try {
    const db = readInclusionDb();
    const transition = updateTransitionPlan(db, req.user, req.params.id, req.body || {});
    writeDB(db);
    return res.json({ transition });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/inclusion/transitions/:id/print", requireRole(...INCLUSION_ROLES), (req, res) => {
  try {
    const db = readInclusionDb();
    const dashboard = getInclusionDashboard(db, req.user, {});
    const transition = dashboard.transitions.find((row) => String(row.id) === String(req.params.id));
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(buildTransitionPrintHtml(transition));
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/inclusion/reviews-due", requireRole(...INCLUSION_ROLES), (req, res) => {
  try {
    const db = readInclusionDb();
    const dashboard = getInclusionDashboard(db, req.user, req.query || {});
    return res.json({
      reviewsDue: dashboard.supportPlans.filter((row) => row.reviewDate && row.reviewDate <= new Date().toISOString().slice(0, 10) && !["COMPLETED", "ARCHIVED"].includes(row.status)),
      parentMeetingsDue: dashboard.meetings.filter((row) => row.reviewDate && row.reviewDate <= new Date().toISOString().slice(0, 10)),
      transitionReviewsDue: dashboard.transitions.filter((row) => row.reviewAfterTransition && row.reviewAfterTransition <= new Date().toISOString().slice(0, 10)),
    });
  } catch (error) {
    return handleError(res, error);
  }
});

module.exports = router;
