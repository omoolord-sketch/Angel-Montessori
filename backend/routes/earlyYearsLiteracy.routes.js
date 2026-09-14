const express = require("express");
const { auth, requireRole } = require("../middleware/auth");
const { readDB, writeDB } = require("../lib/jsonStore");
const {
  ALL_ACCESS_ROLES,
  AMES_DESCRIPTORS,
  INDEPENDENCE_LEVELS,
  LEADER_ROLES,
  LITERACY_ROLES,
  PHONICS_SKILL_STATES,
  PROGRAMME_STATUSES,
  READING_TEXT_TYPES,
  SUMMARY_TYPES,
  SUPPORT_STATUSES,
  activateProgramme,
  createDecodableBook,
  createHomeReadingRecord,
  createLiteracySummary,
  createParentUpdate,
  createPhonicsProgress,
  createProgramme,
  createReadingRecord,
  createSupportPlan,
  createTeachingUnit,
  createWritingRecord,
  ensureEarlyYearsLiteracyShape,
  getClassLiteracyOverview,
  getStudentLiteracyProfile,
  getTransitionSnapshot,
  listDecodableBooks,
  listHomeReadingRecords,
  listLiteracySummaries,
  listParentUpdates,
  listPhonicsProgress,
  listProgrammeSequence,
  listProgrammes,
  listReadingRecords,
  listReceptionStudents,
  listSupportPlans,
  listWritingRecords,
  productionSequenceAudit,
  updatePhonicsProgress,
  updateProgramme,
  updateSupportPlan,
} = require("../lib/earlyYearsLiteracy");

const router = express.Router();

router.use(auth());

function handleError(res, error) {
  return res.status(error?.status || 500).json({ message: error?.message || "Reception literacy request failed" });
}

function readLiteracyDb() {
  const db = readDB();
  const { mutated } = ensureEarlyYearsLiteracyShape(db);
  if (mutated) writeDB(db);
  return db;
}

function activeProgramme(db) {
  return listProgrammes(db, { status: "ACTIVE" })[0] || null;
}

function setupPayload(db, user) {
  const programme = activeProgramme(db);
  return {
    students: listReceptionStudents(db, user),
    programmes: listProgrammes(db),
    activeProgramme: programme,
    activeSequence: programme ? listProgrammeSequence(db, programme.id) : [],
    programmeStatus: programme ? "CONFIGURED" : "ADOPTED SSP PROGRAMME NOT YET CONFIGURED",
    productionSequenceAudit: productionSequenceAudit(db),
    skillStates: PHONICS_SKILL_STATES,
    descriptors: AMES_DESCRIPTORS,
    programmeStatuses: PROGRAMME_STATUSES,
    readingTextTypes: READING_TEXT_TYPES,
    supportStatuses: SUPPORT_STATUSES,
    summaryTypes: SUMMARY_TYPES,
    independenceLevels: INDEPENDENCE_LEVELS,
  };
}

router.get("/phonics/setup", requireRole(...ALL_ACCESS_ROLES), (req, res) => {
  try {
    const db = readLiteracyDb();
    return res.json(setupPayload(db, req.user));
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/phonics/programmes", requireRole(...LITERACY_ROLES), (req, res) => {
  try {
    const db = readLiteracyDb();
    return res.json({ programmes: listProgrammes(db, req.query || {}), audit: productionSequenceAudit(db) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/phonics/programmes", requireRole(...LEADER_ROLES), (req, res) => {
  try {
    const db = readLiteracyDb();
    const programme = createProgramme(db, req.user, req.body || {});
    writeDB(db);
    return res.status(201).json({ programme });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/phonics/programmes/:id", requireRole(...LITERACY_ROLES), (req, res) => {
  try {
    const db = readLiteracyDb();
    const programme = listProgrammes(db).find((row) => String(row.id) === String(req.params.id));
    if (!programme) return res.status(404).json({ message: "SSP programme could not be found." });
    return res.json({ programme, sequence: listProgrammeSequence(db, req.params.id), books: listDecodableBooks(db, req.params.id) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.put("/phonics/programmes/:id", requireRole(...LEADER_ROLES), (req, res) => {
  try {
    const db = readLiteracyDb();
    const programme = updateProgramme(db, req.user, req.params.id, req.body || {});
    writeDB(db);
    return res.json({ programme });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/phonics/programmes/:id/activate", requireRole(...LEADER_ROLES), (req, res) => {
  try {
    const db = readLiteracyDb();
    const programme = activateProgramme(db, req.user, req.params.id);
    writeDB(db);
    return res.json({ programme });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/phonics/programmes/:id/sequence", requireRole(...LITERACY_ROLES), (req, res) => {
  try {
    const db = readLiteracyDb();
    return res.json({ sequence: listProgrammeSequence(db, req.params.id) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/phonics/programmes/:id/sequence", requireRole(...LEADER_ROLES), (req, res) => {
  try {
    const db = readLiteracyDb();
    const unit = createTeachingUnit(db, req.user, req.params.id, req.body || {});
    writeDB(db);
    return res.status(201).json({ unit });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/phonics/programmes/:id/books", requireRole(...LITERACY_ROLES), (req, res) => {
  try {
    const db = readLiteracyDb();
    return res.json({ books: listDecodableBooks(db, req.params.id) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/phonics/programmes/:id/books", requireRole(...LEADER_ROLES), (req, res) => {
  try {
    const db = readLiteracyDb();
    const book = createDecodableBook(db, req.user, req.params.id, req.body || {});
    writeDB(db);
    return res.status(201).json({ book });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/phonics/progress", requireRole(...LITERACY_ROLES), (req, res) => {
  try {
    const db = readLiteracyDb();
    return res.json({ progress: listPhonicsProgress(db, req.user, req.query || {}) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/phonics/progress", requireRole(...LITERACY_ROLES), (req, res) => {
  try {
    const db = readLiteracyDb();
    const progress = createPhonicsProgress(db, req.user, req.body || {});
    writeDB(db);
    return res.status(201).json({ progress });
  } catch (error) {
    return handleError(res, error);
  }
});

router.put("/phonics/progress/:id", requireRole(...LITERACY_ROLES), (req, res) => {
  try {
    const db = readLiteracyDb();
    const progress = updatePhonicsProgress(db, req.user, req.params.id, req.body || {});
    writeDB(db);
    return res.json({ progress });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/reading", requireRole(...ALL_ACCESS_ROLES), (req, res) => {
  try {
    const db = readLiteracyDb();
    return res.json({ records: listReadingRecords(db, req.user, req.query || {}) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/reading", requireRole(...LITERACY_ROLES), (req, res) => {
  try {
    const db = readLiteracyDb();
    const record = createReadingRecord(db, req.user, req.body || {});
    writeDB(db);
    return res.status(201).json({ record });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/writing", requireRole(...ALL_ACCESS_ROLES), (req, res) => {
  try {
    const db = readLiteracyDb();
    return res.json({ records: listWritingRecords(db, req.user, req.query || {}) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/writing", requireRole(...LITERACY_ROLES), (req, res) => {
  try {
    const db = readLiteracyDb();
    const record = createWritingRecord(db, req.user, req.body || {});
    writeDB(db);
    return res.status(201).json({ record });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/literacy/students/:studentId", requireRole(...ALL_ACCESS_ROLES), (req, res) => {
  try {
    const db = readLiteracyDb();
    return res.json(getStudentLiteracyProfile(db, req.user, req.params.studentId, req.query || {}));
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/literacy/class/:classId", requireRole(...LITERACY_ROLES), (req, res) => {
  try {
    const db = readLiteracyDb();
    return res.json(getClassLiteracyOverview(db, req.user, req.params.classId, req.query || {}));
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/literacy/support", requireRole(...LITERACY_ROLES), (req, res) => {
  try {
    const db = readLiteracyDb();
    return res.json({ supportPlans: listSupportPlans(db, req.user, req.query || {}) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/literacy/support", requireRole(...LITERACY_ROLES), (req, res) => {
  try {
    const db = readLiteracyDb();
    const supportPlan = createSupportPlan(db, req.user, req.body || {});
    writeDB(db);
    return res.status(201).json({ supportPlan });
  } catch (error) {
    return handleError(res, error);
  }
});

router.put("/literacy/support/:id", requireRole(...LITERACY_ROLES), (req, res) => {
  try {
    const db = readLiteracyDb();
    const supportPlan = updateSupportPlan(db, req.user, req.params.id, req.body || {});
    writeDB(db);
    return res.json({ supportPlan });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/literacy/summaries", requireRole(...ALL_ACCESS_ROLES), (req, res) => {
  try {
    const db = readLiteracyDb();
    return res.json({ summaries: listLiteracySummaries(db, req.user, req.query || {}) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/literacy/summaries", requireRole(...LITERACY_ROLES), (req, res) => {
  try {
    const db = readLiteracyDb();
    const summary = createLiteracySummary(db, req.user, req.body || {});
    writeDB(db);
    return res.status(201).json({ summary });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/literacy/home-reading", requireRole(...ALL_ACCESS_ROLES), (req, res) => {
  try {
    const db = readLiteracyDb();
    return res.json({ records: listHomeReadingRecords(db, req.user, req.query || {}) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/literacy/home-reading", requireRole(...ALL_ACCESS_ROLES), (req, res) => {
  try {
    const db = readLiteracyDb();
    const record = createHomeReadingRecord(db, req.user, req.body || {});
    writeDB(db);
    return res.status(201).json({ record });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/literacy/parent-updates", requireRole(...ALL_ACCESS_ROLES), (req, res) => {
  try {
    const db = readLiteracyDb();
    return res.json({ updates: listParentUpdates(db, req.user, req.query || {}) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/literacy/parent-updates", requireRole(...LITERACY_ROLES), (req, res) => {
  try {
    const db = readLiteracyDb();
    const update = createParentUpdate(db, req.user, req.body || {});
    writeDB(db);
    return res.status(201).json({ update });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/literacy/students/:studentId/transition", requireRole(...LITERACY_ROLES), (req, res) => {
  try {
    const db = readLiteracyDb();
    return res.json(getTransitionSnapshot(db, req.user, req.params.studentId));
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/phonics/audit/no-invented-sequence", requireRole(...LITERACY_ROLES), (req, res) => {
  try {
    const db = readLiteracyDb();
    return res.json(productionSequenceAudit(db));
  } catch (error) {
    return handleError(res, error);
  }
});

module.exports = router;
