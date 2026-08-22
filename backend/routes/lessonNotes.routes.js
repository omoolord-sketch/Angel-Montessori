const express = require("express");
const { auth, requireRole } = require("../middleware/auth");
const { readDB, writeDB } = require("../lib/jsonStore");
const {
  LESSON_NOTE_STATUSES,
  LESSON_NOTE_REVIEW_STATUSES,
  LESSON_NOTE_READ_ROLES,
  LESSON_NOTE_MANAGE_ROLES,
  LESSON_NOTE_REVIEW_ROLES,
  ensureLessonNoteCollections,
  listLessonNotes,
  listLessonNoteReviews,
  buildLessonNoteDashboard,
  buildLessonNoteSetup,
  buildLessonNoteDetail,
  buildLessonNoteTemplateForWeek,
  buildLessonNoteExportHtml,
  buildLessonNotePdfBuffer,
  findVisibleWeekContext,
} = require("../lib/lessonNotes");
const {
  createSchemeId,
  createHttpError,
  safeString,
  nowIso,
  ensureOption,
} = require("../lib/schemeOfWork");

const router = express.Router();
router.use(auth());

function getDb() {
  const db = readDB();
  const mutated = ensureLessonNoteCollections(db);
  if (mutated) writeDB(db);
  return db;
}

function handleError(res, error) {
  return res.status(error?.status || 500).json({ message: error?.message || "Lesson note request failed" });
}

function findLessonNoteIndex(db, id) {
  return db.lessonNotes.findIndex((item) => String(item.id) === String(id));
}

function getVisibleLessonNote(db, id, user) {
  const note = buildLessonNoteDetail(db, id, user);
  if (!note) throw createHttpError(404, "Lesson note not found");
  return note;
}

function assertLessonNoteOwnership(week, user) {
  if (user?.role === "TEACHER" && String(week.teacherUserId) !== String(user.id)) {
    throw createHttpError(403, "You can only work on lesson notes for schemes assigned to you");
  }
}

function assertCanEditLessonNote(note, user) {
  if (note.status === "archived") throw createHttpError(400, "Archived lesson notes cannot be edited");
  if (LESSON_NOTE_REVIEW_ROLES.includes(user?.role)) return;
  if (user?.role !== "TEACHER" || String(note.teacherUserId) !== String(user.id)) {
    throw createHttpError(403, "You do not have permission to edit this lesson note");
  }
  if (note.status === "approved") throw createHttpError(403, "Approved lesson notes can only be changed by the academic desk");
}

function addLessonNoteReview(db, lessonNoteId, user, reviewStatus, note = "", reviewedAt = "") {
  db.lessonNoteReviews.unshift({
    id: createSchemeId("lesson-note-review"),
    lessonNoteId: safeString(lessonNoteId),
    reviewedBy: safeString(user?.id || user?.username),
    reviewerName: safeString(user?.name || user?.username),
    reviewStatus: ensureOption(reviewStatus, LESSON_NOTE_REVIEW_STATUSES, "pending"),
    note: safeString(note),
    reviewedAt: safeString(reviewedAt),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
}

function validateLessonNoteForReview(payload) {
  if (!safeString(payload.learningObjectives)) throw createHttpError(400, "Learning objectives are required before review");
  if (!safeString(payload.lessonIntroduction)) throw createHttpError(400, "Lesson introduction is required before review");
  if (!safeString(payload.presentationSteps)) throw createHttpError(400, "Presentation steps are required before review");
  if (!safeString(payload.classActivities)) throw createHttpError(400, "Class activities are required before review");
  if (!safeString(payload.assessment)) throw createHttpError(400, "Assessment details are required before review");
}

function buildLessonNotePayload(db, body = {}, user, current = null) {
  const schemeWeekId = safeString(body.schemeWeekId || current?.schemeWeekId);
  if (!schemeWeekId) throw createHttpError(400, "A scheme week is required for the lesson note");

  const week = findVisibleWeekContext(db, schemeWeekId, user);
  if (!week) throw createHttpError(404, "Scheme week not found");
  assertLessonNoteOwnership(week, user);

  const duplicate = db.lessonNotes.find(
    (item) => String(item.schemeWeekId) === String(schemeWeekId) && String(item.id) !== String(current?.id || "")
  );
  if (duplicate) throw createHttpError(400, "A lesson note already exists for this scheme week");

  const requestedStatus = ensureOption(body.status || current?.status, LESSON_NOTE_STATUSES, current?.status || "draft");
  const nextStatus = LESSON_NOTE_REVIEW_ROLES.includes(user?.role)
    ? requestedStatus
    : current?.status === "in_review" || current?.status === "approved"
      ? current.status
      : "draft";

  return {
    schemeSessionId: week.schemeSessionId,
    schemeSessionTitle: safeString(week.schemeSessionTitle),
    schemeTermId: week.schemeTermId,
    sessionId: week.sessionId,
    sessionName: week.sessionName,
    termId: week.termId,
    termName: week.termName,
    classId: week.classId,
    className: week.className,
    subjectId: week.subjectId,
    subjectName: week.subjectName,
    teacherUserId: week.teacherUserId,
    teacherName: week.teacherName,
    schemeWeekId: week.id,
    weekNumber: week.weekNumber,
    weekTitle: week.title,
    title: safeString(body.title) || `${safeString(body.topic || week.topic || week.title || "Week")} Lesson Note`,
    topic: safeString(body.topic) || week.topic,
    subTopic: safeString(body.subTopic) || week.subTopic,
    learningObjectives: safeString(body.learningObjectives) || week.learningObjectives,
    lessonIntroduction: safeString(body.lessonIntroduction),
    presentationSteps: safeString(body.presentationSteps),
    teachingAids: safeString(body.teachingAids) || week.learningMaterials,
    classActivities: safeString(body.classActivities) || week.teachingActivities,
    assessment: safeString(body.assessment) || week.assessmentMethod,
    assignment: safeString(body.assignment),
    references: safeString(body.references),
    reflectionNote: safeString(body.reflectionNote),
    status: nextStatus,
  };
}

router.get("/dashboard", requireRole(...LESSON_NOTE_READ_ROLES), (req, res) => {
  const db = getDb();
  res.json(buildLessonNoteDashboard(db, req.user));
});

router.get("/setup", requireRole(...LESSON_NOTE_READ_ROLES), (req, res) => {
  const db = getDb();
  res.json({ setup: buildLessonNoteSetup(db, req.user) });
});

router.get("/reviews", requireRole(...LESSON_NOTE_READ_ROLES), (req, res) => {
  const db = getDb();
  res.json({
    reviews: listLessonNoteReviews(
      db,
      {
        lessonNoteId: req.query.lessonNoteId,
        reviewStatus: req.query.reviewStatus,
      },
      req.user
    ),
  });
});

router.get("/by-week/:schemeWeekId", requireRole(...LESSON_NOTE_READ_ROLES), (req, res) => {
  try {
    const db = getDb();
    const week = findVisibleWeekContext(db, req.params.schemeWeekId, req.user);
    if (!week) throw createHttpError(404, "Scheme week not found");
    const noteSummary = listLessonNotes(db, { schemeWeekId: req.params.schemeWeekId }, req.user)[0] || null;
    const note = noteSummary ? buildLessonNoteDetail(db, noteSummary.id, req.user) : null;
    return res.json({
      week,
      note,
      template: note ? null : buildLessonNoteTemplateForWeek(db, req.params.schemeWeekId, req.user),
    });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/export/:id/pdf", requireRole(...LESSON_NOTE_READ_ROLES), (req, res) => {
  try {
    const db = getDb();
    const note = getVisibleLessonNote(db, req.params.id, req.user);
    const pdf = buildLessonNotePdfBuffer(note);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${safeString(note.className || "lesson-note").replace(/[^0-9A-Za-z_-]+/g, "-")}-${safeString(note.subjectName || "subject").replace(/[^0-9A-Za-z_-]+/g, "-")}-week-${note.weekNumber}-lesson-note.pdf"`);
    return res.send(pdf);
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/export/:id", requireRole(...LESSON_NOTE_READ_ROLES), (req, res) => {
  try {
    const db = getDb();
    const note = getVisibleLessonNote(db, req.params.id, req.user);
    const html = buildLessonNoteExportHtml(note);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${safeString(note.className || "lesson-note").replace(/[^0-9A-Za-z_-]+/g, "-")}-${safeString(note.subjectName || "subject").replace(/[^0-9A-Za-z_-]+/g, "-")}-week-${note.weekNumber}-lesson-note.html"`);
    return res.send(html);
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/", requireRole(...LESSON_NOTE_READ_ROLES), (req, res) => {
  const db = getDb();
  res.json({
    notes: listLessonNotes(
      db,
      {
        schemeSessionId: req.query.schemeSessionId,
        schemeTermId: req.query.schemeTermId,
        sessionId: req.query.sessionId,
        termId: req.query.termId,
        classId: req.query.classId,
        subjectId: req.query.subjectId,
        teacherUserId: req.query.teacherUserId,
        status: req.query.status,
        schemeWeekId: req.query.schemeWeekId,
      },
      req.user
    ),
  });
});

router.get("/:id", requireRole(...LESSON_NOTE_READ_ROLES), (req, res) => {
  try {
    const db = getDb();
    return res.json({ note: getVisibleLessonNote(db, req.params.id, req.user) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/", requireRole(...LESSON_NOTE_MANAGE_ROLES), (req, res) => {
  try {
    const db = getDb();
    const payload = buildLessonNotePayload(db, req.body || {}, req.user);
    const timestamp = nowIso();
    const next = {
      id: createSchemeId("lesson-note"),
      ...payload,
      createdBy: safeString(req.user?.id || req.user?.username),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    db.lessonNotes.unshift(next);
    writeDB(db);
    return res.status(201).json({ note: getVisibleLessonNote(db, next.id, req.user) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.patch("/:id", requireRole(...LESSON_NOTE_MANAGE_ROLES), (req, res) => {
  try {
    const db = getDb();
    const index = findLessonNoteIndex(db, req.params.id);
    if (index === -1) throw createHttpError(404, "Lesson note not found");
    const current = getVisibleLessonNote(db, req.params.id, req.user);
    assertCanEditLessonNote(current, req.user);
    const payload = buildLessonNotePayload(db, { ...current, ...(req.body || {}) }, req.user, current);
    db.lessonNotes[index] = {
      ...db.lessonNotes[index],
      ...payload,
      updatedAt: nowIso(),
    };
    writeDB(db);
    return res.json({ note: getVisibleLessonNote(db, req.params.id, req.user) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/:id/submit-review", requireRole(...LESSON_NOTE_MANAGE_ROLES), (req, res) => {
  try {
    const db = getDb();
    const index = findLessonNoteIndex(db, req.params.id);
    if (index === -1) throw createHttpError(404, "Lesson note not found");
    const note = getVisibleLessonNote(db, req.params.id, req.user);
    assertCanEditLessonNote(note, req.user);
    validateLessonNoteForReview(note);
    db.lessonNotes[index] = {
      ...db.lessonNotes[index],
      status: "in_review",
      updatedAt: nowIso(),
    };
    addLessonNoteReview(db, req.params.id, req.user, "pending", safeString(req.body?.note || "Submitted for review"));
    writeDB(db);
    return res.json({ note: getVisibleLessonNote(db, req.params.id, req.user) });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/:id/review", requireRole(...LESSON_NOTE_REVIEW_ROLES), (req, res) => {
  try {
    const db = getDb();
    const index = findLessonNoteIndex(db, req.params.id);
    if (index === -1) throw createHttpError(404, "Lesson note not found");
    const reviewStatus = ensureOption(req.body?.reviewStatus, ["approved", "rejected"], "approved");
    db.lessonNotes[index] = {
      ...db.lessonNotes[index],
      status: reviewStatus === "approved" ? "approved" : "draft",
      updatedAt: nowIso(),
    };
    addLessonNoteReview(db, req.params.id, req.user, reviewStatus, safeString(req.body?.note), nowIso());
    writeDB(db);
    return res.json({ note: getVisibleLessonNote(db, req.params.id, req.user) });
  } catch (error) {
    return handleError(res, error);
  }
});

module.exports = router;
