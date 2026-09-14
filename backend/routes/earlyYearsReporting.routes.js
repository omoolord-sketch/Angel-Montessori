const express = require("express");
const { auth, requireRole } = require("../middleware/auth");
const { readDB, writeDB } = require("../lib/jsonStore");
const { listAccessibleEarlyYearsClasses } = require("../lib/earlyYearsCurriculum");
const {
  AMES_REFERENCE_STATUSES,
  AREA_DESCRIPTORS,
  ELG_REFERENCE_ITEMS,
  ELG_REFERENCE_WORDING,
  EYFS_AREAS,
  READINESS_DOMAINS,
  REPORT_ROLES,
  REPORT_STATUSES,
  REPORT_TYPES,
  TRANSITION_STATUSES,
  acknowledgeTransitionHandover,
  amendReport,
  approveReport,
  archiveReport,
  buildReportPrintHtml,
  buildTransitionPrintHtml,
  createCommentTemplate,
  createEarlyYearsReport,
  createReceptionEyfsReference,
  createReceptionTransitionProfile,
  ensureEarlyYearsReportingShape,
  getReceptionTransitionForStudent,
  getReportDetail,
  listCommentTemplates,
  listReceptionEyfsReferences,
  listReceptionTransitions,
  listReportArchive,
  listReports,
  publishReport,
  reportDashboard,
  returnReport,
  submitReport,
  updateEarlyYearsReport,
  updateReceptionEyfsReference,
  updateReceptionTransitionProfile,
} = require("../lib/earlyYearsReporting");

const router = express.Router();

router.use(auth());

function handleError(res, error) {
  return res.status(error?.status || 500).json({ message: error?.message || "Early Years reporting request failed" });
}

function readReportingDb() {
  const db = readDB();
  const { mutated } = ensureEarlyYearsReportingShape(db);
  if (mutated) writeDB(db);
  return db;
}

function setupPayload(db, user) {
  return {
    classes: listAccessibleEarlyYearsClasses(db, user),
    sessions: db.academicSessions || db.lmsSessions || [],
    terms: db.terms || db.lmsTerms || [],
    reportTypes: REPORT_TYPES,
    reportStatuses: REPORT_STATUSES,
    descriptors: AREA_DESCRIPTORS,
    eyfsAreas: EYFS_AREAS,
    elgReferenceItems: ELG_REFERENCE_ITEMS,
    amesReferenceStatuses: AMES_REFERENCE_STATUSES,
    transitionStatuses: TRANSITION_STATUSES,
    readinessDomains: READINESS_DOMAINS,
    legalWording: ELG_REFERENCE_WORDING,
    parentLanguageGuidance: [
      "Be specific.",
      "Describe learning and progress.",
      "Give the next priority.",
      "Avoid comparison, scores, percentages, ranking, or negative labels.",
    ],
  };
}

router.get("/reports/setup", requireRole(...REPORT_ROLES), (req, res) => {
  try {
    const db = readReportingDb();
    return res.json(setupPayload(db, req.user));
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/reports/dashboard", requireRole(...REPORT_ROLES), (req, res) => {
  try {
    const db = readReportingDb();
    return res.json({ ...reportDashboard(db, req.user, req.query || {}), setup: setupPayload(db, req.user) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/reports", requireRole(...REPORT_ROLES), (req, res) => {
  try {
    const db = readReportingDb();
    return res.json({ reports: listReports(db, req.user, req.query || {}) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/reports", requireRole(...REPORT_ROLES), (req, res) => {
  try {
    const db = readReportingDb();
    const result = createEarlyYearsReport(db, req.user, req.body || {});
    writeDB(db);
    return res.status(result.duplicatePrevented ? 200 : 201).json(result);
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/reports/student/:studentId/archive", requireRole(...REPORT_ROLES), (req, res) => {
  try {
    const db = readReportingDb();
    return res.json({ reports: listReportArchive(db, req.user, req.params.studentId, req.query || {}) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/reports/templates", requireRole(...REPORT_ROLES), (req, res) => {
  try {
    const db = readReportingDb();
    return res.json({ templates: listCommentTemplates(db, req.user, req.query || {}) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/reports/templates", requireRole("ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER"), (req, res) => {
  try {
    const db = readReportingDb();
    const template = createCommentTemplate(db, req.user, req.body || {});
    writeDB(db);
    return res.status(201).json({ template });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/reports/:id", requireRole(...REPORT_ROLES), (req, res) => {
  try {
    const db = readReportingDb();
    const detail = getReportDetail(db, req.user, req.params.id);
    writeDB(db);
    return res.json(detail);
  } catch (error) {
    return handleError(res, error);
  }
});

router.put("/reports/:id", requireRole(...REPORT_ROLES), (req, res) => {
  try {
    const db = readReportingDb();
    const detail = updateEarlyYearsReport(db, req.user, req.params.id, req.body || {});
    writeDB(db);
    return res.json(detail);
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/reports/:id/submit", requireRole(...REPORT_ROLES), (req, res) => {
  try {
    const db = readReportingDb();
    const detail = submitReport(db, req.user, req.params.id);
    writeDB(db);
    return res.json(detail);
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/reports/:id/return", requireRole("ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER"), (req, res) => {
  try {
    const db = readReportingDb();
    const detail = returnReport(db, req.user, req.params.id, req.body || {});
    writeDB(db);
    return res.json(detail);
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/reports/:id/approve", requireRole("ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER"), (req, res) => {
  try {
    const db = readReportingDb();
    const detail = approveReport(db, req.user, req.params.id, req.body || {});
    writeDB(db);
    return res.json(detail);
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/reports/:id/publish", requireRole("ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER"), (req, res) => {
  try {
    const db = readReportingDb();
    const detail = publishReport(db, req.user, req.params.id);
    writeDB(db);
    return res.json(detail);
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/reports/:id/amend", requireRole("ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER"), (req, res) => {
  try {
    const db = readReportingDb();
    const detail = amendReport(db, req.user, req.params.id, req.body || {});
    writeDB(db);
    return res.status(201).json(detail);
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/reports/:id/archive", requireRole("ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER"), (req, res) => {
  try {
    const db = readReportingDb();
    const detail = archiveReport(db, req.user, req.params.id);
    writeDB(db);
    return res.json(detail);
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/reports/:id/print", requireRole(...REPORT_ROLES), (req, res) => {
  try {
    const db = readReportingDb();
    const detail = getReportDetail(db, req.user, req.params.id);
    writeDB(db);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(buildReportPrintHtml(detail));
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/reception/eyfs-reference/:studentId", requireRole(...REPORT_ROLES), (req, res) => {
  try {
    const db = readReportingDb();
    return res.json({
      records: listReceptionEyfsReferences(db, req.user, req.params.studentId),
      legalWording: ELG_REFERENCE_WORDING,
      referenceItems: ELG_REFERENCE_ITEMS,
      statuses: AMES_REFERENCE_STATUSES,
    });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/reception/eyfs-reference", requireRole(...REPORT_ROLES), (req, res) => {
  try {
    const db = readReportingDb();
    const reference = createReceptionEyfsReference(db, req.user, req.body || {});
    writeDB(db);
    return res.status(201).json({ reference });
  } catch (error) {
    return handleError(res, error);
  }
});

router.put("/reception/eyfs-reference/:id", requireRole(...REPORT_ROLES), (req, res) => {
  try {
    const db = readReportingDb();
    const reference = updateReceptionEyfsReference(db, req.user, req.params.id, req.body || {});
    writeDB(db);
    return res.json({ reference });
  } catch (error) {
    return handleError(res, error);
  }
});

["submit", "return", "approve", "publish"].forEach((action) => {
  router.post(`/reception/eyfs-reference/:id/${action}`, requireRole(...REPORT_ROLES), (req, res) => {
    try {
      const statusByAction = {
        submit: "SUBMITTED",
        return: "RETURNED_FOR_REVISION",
        approve: "APPROVED",
        publish: "PUBLISHED",
      };
      const db = readReportingDb();
      const reference = updateReceptionEyfsReference(db, req.user, req.params.id, { ...(req.body || {}), status: statusByAction[action] });
      writeDB(db);
      return res.json({ reference });
    } catch (error) {
      return handleError(res, error);
    }
  });
});

router.get("/reception/transition/:studentId", requireRole(...REPORT_ROLES), (req, res) => {
  try {
    const db = readReportingDb();
    return res.json(getReceptionTransitionForStudent(db, req.user, req.params.studentId));
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/reception/transition", requireRole(...REPORT_ROLES), (req, res) => {
  try {
    const db = readReportingDb();
    const transition = createReceptionTransitionProfile(db, req.user, req.body || {});
    writeDB(db);
    return res.status(201).json({ transition });
  } catch (error) {
    return handleError(res, error);
  }
});

router.put("/reception/transition/:id", requireRole(...REPORT_ROLES), (req, res) => {
  try {
    const db = readReportingDb();
    const transition = updateReceptionTransitionProfile(db, req.user, req.params.id, req.body || {});
    writeDB(db);
    return res.json({ transition });
  } catch (error) {
    return handleError(res, error);
  }
});

["submit", "return", "approve", "publish", "handover"].forEach((action) => {
  router.post(`/reception/transition/:id/${action}`, requireRole(...REPORT_ROLES), (req, res) => {
    try {
      const statusByAction = {
        submit: "SUBMITTED",
        return: "RETURNED_FOR_REVISION",
        approve: "APPROVED",
        publish: "PUBLISHED",
        handover: "HANDED_OVER",
      };
      const db = readReportingDb();
      const transition = updateReceptionTransitionProfile(db, req.user, req.params.id, { ...(req.body || {}), status: statusByAction[action] });
      writeDB(db);
      return res.json({ transition });
    } catch (error) {
      return handleError(res, error);
    }
  });
});

router.post("/reception/transition/:id/acknowledge", requireRole(...REPORT_ROLES), (req, res) => {
  try {
    const db = readReportingDb();
    const transition = acknowledgeTransitionHandover(db, req.user, req.params.id, req.body || {});
    writeDB(db);
    return res.json({ transition });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/reception/transition/:id/print", requireRole(...REPORT_ROLES), (req, res) => {
  try {
    const db = readReportingDb();
    const transition = listReceptionTransitions(db, req.user, {}).find((row) => String(row.id) === String(req.params.id));
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(buildTransitionPrintHtml(transition));
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/reception/handover/incoming", requireRole(...REPORT_ROLES), (req, res) => {
  try {
    const db = readReportingDb();
    return res.json({
      transitions: listReceptionTransitions(db, req.user, { status: req.query?.status }),
      principle: "KNOW WHERE THEY ARE - CONTINUE THE JOURNEY.",
    });
  } catch (error) {
    return handleError(res, error);
  }
});

module.exports = router;
