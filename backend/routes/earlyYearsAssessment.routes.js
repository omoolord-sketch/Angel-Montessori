const express = require("express");
const { auth, requireRole } = require("../middleware/auth");
const { readDB, writeDB } = require("../lib/jsonStore");
const {
  AMES_DIMENSION_REFS,
  EYFS_AREA_REFS,
  getFramework,
  listAccessibleEarlyYearsClasses,
} = require("../lib/earlyYearsCurriculum");
const { listWeeklyPlans } = require("../lib/earlyYearsPlanning");
const {
  ASSESSMENT_ROLES,
  DEVELOPMENTAL_DESCRIPTORS,
  DIMENSION_CODES,
  EVIDENCE_TYPES,
  JOURNAL_ENTRY_TYPES,
  LEADER_ROLES,
  NEXT_STEP_STATUSES,
  OBSERVATION_STATUSES,
  OBSERVATION_TYPES,
  PARENT_ROLES,
  SUMMARY_TYPES,
  VISIBILITY,
  buildJournalPrintHtml,
  completeObservation,
  createJournalEntry,
  createObservation,
  createParentContribution,
  ensureEarlyYearsAssessmentShape,
  evidenceCoverageCheck,
  findObservation,
  getDevelopmentOverview,
  getOrCreateChildProfile,
  listAccessibleStudents,
  listJournalEntries,
  listNextSteps,
  listObservations,
  listParentContributions,
  publishObservation,
  reviewObservation,
  reviewParentContribution,
  saveDevelopmentSummary,
  updateChildProfile,
  updateDevelopmentSummary,
  updateNextStep,
  updateObservation,
} = require("../lib/earlyYearsAssessment");

const router = express.Router();
const ACCESS_ROLES = [...new Set([...ASSESSMENT_ROLES, ...PARENT_ROLES])];

router.use(auth());

function handleError(res, error) {
  return res.status(error?.status || 500).json({ message: error?.message || "Early Years assessment request failed" });
}

function readAssessmentDb() {
  const db = readDB();
  const { mutated } = ensureEarlyYearsAssessmentShape(db);
  if (mutated) writeDB(db);
  return db;
}

function descriptorNotes() {
  return {
    EMERGING: "Learning is beginning or usually requires significant support.",
    DEVELOPING: "Learning is increasingly evident but may remain inconsistent or supported.",
    SECURE: "Learning is demonstrated independently and appropriately across suitable contexts.",
    note: "These are AMES internal curriculum-monitoring descriptors, not statutory EYFS Profile judgement terms.",
  };
}

function setupPayload(db, user) {
  const isParent = PARENT_ROLES.includes(String(user?.role || "").toUpperCase());
  return {
    framework: isParent ? null : getFramework(db),
    eyfsAreas: EYFS_AREA_REFS,
    amesDimensions: AMES_DIMENSION_REFS,
    dimensionCodes: DIMENSION_CODES,
    observationTypes: OBSERVATION_TYPES,
    descriptors: DEVELOPMENTAL_DESCRIPTORS,
    descriptorNotes: descriptorNotes(),
    observationStatuses: OBSERVATION_STATUSES,
    nextStepStatuses: NEXT_STEP_STATUSES,
    journalEntryTypes: JOURNAL_ENTRY_TYPES,
    summaryTypes: SUMMARY_TYPES,
    visibilityOptions: VISIBILITY,
    evidenceTypes: EVIDENCE_TYPES,
    parentContributionEnabled: true,
    safeguardingBoundary: "Use the school's safeguarding reporting procedure immediately. Do not rely on the Learning Journal as the safeguarding record.",
    classes: isParent ? [] : listAccessibleEarlyYearsClasses(db, user),
    students: listAccessibleStudents(db, user),
    sessions: db.academicSessions || db.lmsSessions || [],
    terms: db.terms || db.lmsTerms || [],
    weeklyPlans: isParent ? [] : listWeeklyPlans(db, {}, user).plans || [],
  };
}

function accessibleStudent(db, user, studentId) {
  const student = listAccessibleStudents(db, user).find((row) => String(row.id) === String(studentId));
  if (!student) {
    const error = new Error("Child record could not be found or is not available to this user.");
    error.status = 404;
    throw error;
  }
  return student;
}

router.get("/assessment/setup", requireRole(...ACCESS_ROLES), (req, res) => {
  try {
    const db = readAssessmentDb();
    return res.json(setupPayload(db, req.user));
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/students", requireRole(...ACCESS_ROLES), (req, res) => {
  try {
    const db = readAssessmentDb();
    return res.json({ students: listAccessibleStudents(db, req.user, req.query || {}) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/observations", requireRole(...ACCESS_ROLES), (req, res) => {
  try {
    const db = readAssessmentDb();
    return res.json({ observations: listObservations(db, req.user, req.query || {}) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/observations", requireRole(...ASSESSMENT_ROLES), (req, res) => {
  try {
    const db = readAssessmentDb();
    const observation = createObservation(db, req.user, req.body || {});
    writeDB(db);
    return res.status(201).json({ observation });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/observations/:id", requireRole(...ACCESS_ROLES), (req, res) => {
  try {
    const db = readAssessmentDb();
    const observation = listObservations(db, req.user, {}).find((row) => String(row.id) === String(req.params.id));
    if (!observation) return res.status(404).json({ message: "Observation could not be found." });
    return res.json({ observation });
  } catch (error) {
    return handleError(res, error);
  }
});

router.put("/observations/:id", requireRole(...ASSESSMENT_ROLES), (req, res) => {
  try {
    const db = readAssessmentDb();
    const observation = updateObservation(db, req.params.id, req.user, req.body || {});
    writeDB(db);
    return res.json({ observation });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/observations/:id/complete", requireRole(...ASSESSMENT_ROLES), (req, res) => {
  try {
    const db = readAssessmentDb();
    const observation = completeObservation(db, req.params.id, req.user);
    writeDB(db);
    return res.json({ observation });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/observations/:id/review", requireRole(...LEADER_ROLES), (req, res) => {
  try {
    const db = readAssessmentDb();
    const observation = reviewObservation(db, req.params.id, req.user, req.body || {});
    writeDB(db);
    return res.json({ observation });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/observations/:id/publish", requireRole(...ASSESSMENT_ROLES), (req, res) => {
  try {
    const db = readAssessmentDb();
    const result = publishObservation(db, req.params.id, req.user, req.body || {});
    writeDB(db);
    return res.json(result);
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/students/:studentId/journal/print", requireRole(...ACCESS_ROLES), (req, res) => {
  try {
    const db = readAssessmentDb();
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(buildJournalPrintHtml(db, req.params.studentId, req.user, req.query || {}));
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/students/:studentId/profile", requireRole(...ACCESS_ROLES), (req, res) => {
  try {
    const db = readAssessmentDb();
    const student = accessibleStudent(db, req.user, req.params.studentId);
    const profile = getOrCreateChildProfile(db, student, req.user);
    writeDB(db);
    return res.json({ student, profile });
  } catch (error) {
    return handleError(res, error);
  }
});

router.put("/students/:studentId/profile", requireRole(...ASSESSMENT_ROLES), (req, res) => {
  try {
    const db = readAssessmentDb();
    const profile = updateChildProfile(db, req.params.studentId, req.user, req.body || {});
    writeDB(db);
    return res.json({ profile });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/students/:studentId/journal", requireRole(...ACCESS_ROLES), (req, res) => {
  try {
    const db = readAssessmentDb();
    const student = accessibleStudent(db, req.user, req.params.studentId);
    return res.json({ student, entries: listJournalEntries(db, req.params.studentId, req.user, req.query || {}) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/students/:studentId/journal", requireRole(...ASSESSMENT_ROLES), (req, res) => {
  try {
    const db = readAssessmentDb();
    const entry = createJournalEntry(db, req.params.studentId, req.user, req.body || {});
    writeDB(db);
    return res.status(201).json({ entry });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/students/:studentId/development", requireRole(...ACCESS_ROLES), (req, res) => {
  try {
    const db = readAssessmentDb();
    return res.json(getDevelopmentOverview(db, req.params.studentId, req.user, req.query || {}));
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/students/:studentId/summaries", requireRole(...ASSESSMENT_ROLES), (req, res) => {
  try {
    const db = readAssessmentDb();
    const summary = saveDevelopmentSummary(db, req.params.studentId, req.user, req.body || {});
    writeDB(db);
    return res.status(201).json({ summary });
  } catch (error) {
    return handleError(res, error);
  }
});

router.put("/summaries/:id", requireRole(...ASSESSMENT_ROLES), (req, res) => {
  try {
    const db = readAssessmentDb();
    const summary = updateDevelopmentSummary(db, req.params.id, req.user, req.body || {});
    writeDB(db);
    return res.json({ summary });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/next-steps", requireRole(...ASSESSMENT_ROLES), (req, res) => {
  try {
    const db = readAssessmentDb();
    return res.json({ nextSteps: listNextSteps(db, req.user, req.query || {}) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.put("/next-steps/:id", requireRole(...ASSESSMENT_ROLES), (req, res) => {
  try {
    const db = readAssessmentDb();
    const nextStep = updateNextStep(db, req.params.id, req.user, req.body || {});
    writeDB(db);
    return res.json({ nextStep });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/coverage", requireRole(...ASSESSMENT_ROLES), (req, res) => {
  try {
    const db = readAssessmentDb();
    return res.json({ coverage: evidenceCoverageCheck(db, req.user, req.query || {}) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/parent-contributions", requireRole(...ACCESS_ROLES), (req, res) => {
  try {
    const db = readAssessmentDb();
    return res.json({ contributions: listParentContributions(db, req.user, req.query || {}) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/parent-contributions", requireRole(...ACCESS_ROLES), (req, res) => {
  try {
    const db = readAssessmentDb();
    const contribution = createParentContribution(db, req.user, req.body || {});
    writeDB(db);
    return res.status(201).json({ contribution });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/parent-contributions/:id/review", requireRole(...ASSESSMENT_ROLES), (req, res) => {
  try {
    const db = readAssessmentDb();
    const result = reviewParentContribution(db, req.params.id, req.user, req.body || {});
    writeDB(db);
    return res.json(result);
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/audit-log", requireRole(...LEADER_ROLES), (req, res) => {
  try {
    const db = readAssessmentDb();
    return res.json({ auditLogs: (db.earlyYearsAssessmentAuditLogs || []).slice(0, 200) });
  } catch (error) {
    return handleError(res, error);
  }
});

module.exports = router;
