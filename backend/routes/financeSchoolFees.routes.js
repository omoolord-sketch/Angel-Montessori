const express = require("express");
const { auth, requireRole } = require("../middleware/auth");
const {
  FINANCE_FEE_MANAGE_ROLES,
  FINANCE_FEE_APPROVAL_ROLES,
  getFinanceFeeMeta,
  listFeeStructures,
  getFeeStructureById,
  createFeeStructure,
  updateFeeStructure,
  submitFeeStructure,
  approveFeeStructure,
  rejectFeeStructure,
  upsertStudentFinanceProfile,
  buildStudentFeeVisibility,
  buildParentFeeVisibility,
  createHttpError,
} = require("../lib/financeSchoolFees");

const router = express.Router();

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

router.get(
  "/school-fees/meta",
  auth(),
  requireRole(...FINANCE_FEE_MANAGE_ROLES),
  asyncHandler(async (req, res) => {
    res.json(await getFinanceFeeMeta());
  })
);

router.get(
  "/school-fees/structures",
  auth(),
  requireRole(...FINANCE_FEE_MANAGE_ROLES),
  asyncHandler(async (req, res) => {
    res.json(await listFeeStructures(req.query || {}));
  })
);

router.get(
  "/school-fees/structures/:structureId",
  auth(),
  requireRole(...FINANCE_FEE_MANAGE_ROLES),
  asyncHandler(async (req, res) => {
    res.json(await getFeeStructureById(req.params.structureId));
  })
);

router.post(
  "/school-fees/structures",
  auth(),
  requireRole(...FINANCE_FEE_MANAGE_ROLES),
  asyncHandler(async (req, res) => {
    const record = await createFeeStructure(req.body || {}, req.user || {});
    res.status(201).json(record);
  })
);

router.patch(
  "/school-fees/structures/:structureId",
  auth(),
  requireRole(...FINANCE_FEE_MANAGE_ROLES),
  asyncHandler(async (req, res) => {
    const record = await updateFeeStructure(req.params.structureId, req.body || {}, req.user || {});
    res.json(record);
  })
);

router.post(
  "/school-fees/structures/:structureId/submit",
  auth(),
  requireRole(...FINANCE_FEE_MANAGE_ROLES),
  asyncHandler(async (req, res) => {
    const record = await submitFeeStructure(req.params.structureId, req.body || {}, req.user || {});
    res.json(record);
  })
);

router.post(
  "/school-fees/structures/:structureId/approve",
  auth(),
  requireRole(...FINANCE_FEE_APPROVAL_ROLES),
  asyncHandler(async (req, res) => {
    const record = await approveFeeStructure(req.params.structureId, req.body || {}, req.user || {});
    res.json(record);
  })
);

router.post(
  "/school-fees/structures/:structureId/reject",
  auth(),
  requireRole(...FINANCE_FEE_APPROVAL_ROLES),
  asyncHandler(async (req, res) => {
    const record = await rejectFeeStructure(req.params.structureId, req.body || {}, req.user || {});
    res.json(record);
  })
);

router.patch(
  "/school-fees/students/:studentId/profile",
  auth(),
  requireRole(...FINANCE_FEE_MANAGE_ROLES),
  asyncHandler(async (req, res) => {
    const payload = await upsertStudentFinanceProfile(req.params.studentId, req.body || {}, req.user || {});
    res.json(payload);
  })
);

router.get(
  "/school-fees/students/:studentId/visibility",
  auth(),
  requireRole(...FINANCE_FEE_MANAGE_ROLES),
  asyncHandler(async (req, res) => {
    const audience = String(req.query.audience || "student").trim().toLowerCase();
    if (!["student", "parent"].includes(audience)) {
      throw createHttpError(400, "audience must be either student or parent.");
    }

    res.json(
      await buildStudentFeeVisibility(req.params.studentId, {
        session: req.query.session,
        term: req.query.term,
        audience,
      })
    );
  })
);

router.get(
  "/school-fees/student/me",
  auth(),
  requireRole("STUDENT"),
  asyncHandler(async (req, res) => {
    const linkedStudentId = String(req.user?.studentId || "").trim();
    if (!linkedStudentId) {
      throw createHttpError(400, "Student account is not linked to a student profile.");
    }

    const payload = await buildStudentFeeVisibility(linkedStudentId, {
      session: req.query.session,
      term: req.query.term,
      audience: "student",
    });

    if (!payload.student.financeProfile.canStudentView) {
      throw createHttpError(403, "Student fee visibility is disabled for this profile.");
    }

    res.json(payload);
  })
);

router.get(
  "/school-fees/parent/me",
  auth(),
  requireRole("PARENT"),
  asyncHandler(async (req, res) => {
    const linkedStudentIds = [
      ...(Array.isArray(req.user?.studentIds) ? req.user.studentIds : []),
      req.user?.studentId,
    ]
      .map((item) => String(item || "").trim())
      .filter(Boolean);

    if (linkedStudentIds.length === 0) {
      throw createHttpError(400, "Parent account is not linked to any student profile.");
    }

    res.json(
      await buildParentFeeVisibility(linkedStudentIds, {
        session: req.query.session,
        term: req.query.term,
      })
    );
  })
);

module.exports = router;
