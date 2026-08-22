const {
  buildSchemeSetup,
  ensureSchemeCollections,
  listSchemeTerms,
  listSchemeWeeks,
  createSchemeId,
  createHttpError,
  safeString,
  safeLower,
  safeNumber,
  nowIso,
  ensureOption,
  humanize,
  findUser,
} = require("./schemeOfWork");

const LESSON_NOTE_STATUSES = ["draft", "in_review", "approved", "archived"];
const LESSON_NOTE_REVIEW_STATUSES = ["pending", "approved", "rejected"];
const LESSON_NOTE_READ_ROLES = ["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER", "TEACHER"];
const LESSON_NOTE_MANAGE_ROLES = ["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER", "TEACHER"];
const LESSON_NOTE_REVIEW_ROLES = ["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER"];
const LESSON_NOTE_COLLECTIONS = ["lessonNotes", "lessonNoteReviews"];

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function sortNewest(rows = [], field = "createdAt") {
  return [...rows].sort((a, b) => safeString(b[field]).localeCompare(safeString(a[field])));
}

function termOrderValue(termName) {
  const key = safeLower(termName);
  if (key.includes("first")) return 1;
  if (key.includes("second")) return 2;
  if (key.includes("third")) return 3;
  return 99;
}

function sortWeekContexts(rows = []) {
  return [...rows].sort((a, b) => {
    const sessionDiff = safeString(b.sessionName).localeCompare(safeString(a.sessionName));
    if (sessionDiff !== 0) return sessionDiff;
    const termDiff = termOrderValue(a.termName) - termOrderValue(b.termName);
    if (termDiff !== 0) return termDiff;
    const classDiff = safeString(a.className).localeCompare(safeString(b.className));
    if (classDiff !== 0) return classDiff;
    const subjectDiff = safeString(a.subjectName).localeCompare(safeString(b.subjectName));
    if (subjectDiff !== 0) return subjectDiff;
    return safeNumber(a.weekNumber, 0) - safeNumber(b.weekNumber, 0);
  });
}

function sortLessonNotes(rows = []) {
  return [...rows].sort((a, b) => {
    const sessionDiff = safeString(b.sessionName).localeCompare(safeString(a.sessionName));
    if (sessionDiff !== 0) return sessionDiff;
    const termDiff = termOrderValue(a.termName) - termOrderValue(b.termName);
    if (termDiff !== 0) return termDiff;
    const classDiff = safeString(a.className).localeCompare(safeString(b.className));
    if (classDiff !== 0) return classDiff;
    const subjectDiff = safeString(a.subjectName).localeCompare(safeString(b.subjectName));
    if (subjectDiff !== 0) return subjectDiff;
    return safeNumber(a.weekNumber, 0) - safeNumber(b.weekNumber, 0);
  });
}

function ensureLessonNoteCollections(db) {
  let mutated = ensureSchemeCollections(db);
  LESSON_NOTE_COLLECTIONS.forEach((key) => {
    if (!Array.isArray(db[key])) {
      db[key] = [];
      mutated = true;
    }
  });
  return mutated;
}

function buildVisibleWeekContexts(db, user = null) {
  const terms = listSchemeTerms(db, {}, user);
  const termMap = new Map(terms.map((item) => [String(item.id), item]));
  const notesByWeek = new Map(
    safeArray(db.lessonNotes).map((item) => [String(item.schemeWeekId), item])
  );

  return sortWeekContexts(
    listSchemeWeeks(db, {}, user).map((week) => {
      const term = termMap.get(String(week.schemeTermId)) || null;
      const note = notesByWeek.get(String(week.id)) || null;
      return {
        ...week,
        schemeSessionId: term?.schemeSessionId || "",
        schemeSessionTitle: term?.schemeSessionTitle || "",
        sessionId: term?.sessionId || "",
        sessionName: term?.sessionName || "",
        termId: term?.termId || "",
        termName: term?.termName || "",
        classId: term?.classId || "",
        className: term?.className || "",
        subjectId: term?.subjectId || "",
        subjectName: term?.subjectName || "",
        teacherUserId: term?.teacherUserId || "",
        teacherName: term?.teacherName || "",
        lessonNoteId: note?.id || "",
        lessonNoteStatus: note?.status || "",
        lessonNoteStatusLabel: note?.status ? humanize(note.status) : "",
      };
    })
  );
}

function buildVisibleWeekContextMap(db, user = null) {
  return new Map(buildVisibleWeekContexts(db, user).map((item) => [String(item.id), item]));
}

function findVisibleWeekContext(db, schemeWeekId, user = null) {
  return buildVisibleWeekContextMap(db, user).get(String(schemeWeekId)) || null;
}

function normalizeLessonNoteRecord(db, row, weekMap = null) {
  const map = weekMap || buildVisibleWeekContextMap(db, null);
  const week = map.get(String(row.schemeWeekId)) || null;
  const reviews = sortNewest(
    safeArray(db.lessonNoteReviews).filter((item) => String(item.lessonNoteId) === String(row.id))
  );
  const latestReview = reviews[0] || null;
  const teacher = findUser(db, row.teacherUserId);
  const status = ensureOption(row.status, LESSON_NOTE_STATUSES, "draft");

  return {
    ...row,
    schemeSessionId: safeString(row.schemeSessionId || week?.schemeSessionId),
    schemeSessionTitle: safeString(row.schemeSessionTitle || week?.schemeSessionTitle),
    schemeTermId: safeString(row.schemeTermId || week?.schemeTermId),
    sessionId: safeString(row.sessionId || week?.sessionId),
    sessionName: safeString(row.sessionName || week?.sessionName),
    termId: safeString(row.termId || week?.termId),
    termName: safeString(row.termName || week?.termName),
    classId: safeString(row.classId || week?.classId),
    className: safeString(row.className || week?.className),
    subjectId: safeString(row.subjectId || week?.subjectId),
    subjectName: safeString(row.subjectName || week?.subjectName),
    teacherUserId: safeString(row.teacherUserId || week?.teacherUserId),
    teacherName: safeString(row.teacherName || teacher?.name || week?.teacherName),
    schemeWeekId: safeString(row.schemeWeekId),
    weekNumber: safeNumber(row.weekNumber || week?.weekNumber, 0),
    weekTitle: safeString(row.weekTitle || week?.title),
    title: safeString(row.title) || `${safeString(row.topic || week?.topic || "Week")} Lesson Note`,
    topic: safeString(row.topic || week?.topic),
    subTopic: safeString(row.subTopic || week?.subTopic),
    learningObjectives: safeString(row.learningObjectives || week?.learningObjectives),
    lessonIntroduction: safeString(row.lessonIntroduction),
    presentationSteps: safeString(row.presentationSteps),
    teachingAids: safeString(row.teachingAids || week?.learningMaterials),
    classActivities: safeString(row.classActivities || week?.teachingActivities),
    assessment: safeString(row.assessment || week?.assessmentMethod),
    assignment: safeString(row.assignment),
    references: safeString(row.references),
    reflectionNote: safeString(row.reflectionNote),
    status,
    statusLabel: humanize(status),
    latestReviewStatus: latestReview?.reviewStatus || "",
    latestReviewStatusLabel: latestReview?.reviewStatus ? humanize(latestReview.reviewStatus) : "",
    latestReviewNote: safeString(latestReview?.note),
    latestReviewAt: safeString(latestReview?.reviewedAt || latestReview?.createdAt),
    reviewsCount: reviews.length,
    hasSchemeWeek: Boolean(week),
  };
}

function normalizeLessonNoteReviewRecord(db, row, noteMap = null, weekMap = null) {
  const notes = noteMap || new Map(safeArray(db.lessonNotes).map((item) => [String(item.id), item]));
  const weeks = weekMap || buildVisibleWeekContextMap(db, null);
  const note = notes.get(String(row.lessonNoteId)) || null;
  const week = note ? weeks.get(String(note.schemeWeekId)) || null : null;
  const reviewer = findUser(db, row.reviewedBy);
  const reviewStatus = ensureOption(row.reviewStatus, LESSON_NOTE_REVIEW_STATUSES, "pending");

  return {
    ...row,
    reviewStatus,
    reviewStatusLabel: humanize(reviewStatus),
    reviewerName: safeString(reviewer?.name || row.reviewerName),
    lessonNoteTitle: safeString(note?.title),
    topic: safeString(note?.topic || week?.topic),
    weekNumber: safeNumber(note?.weekNumber || week?.weekNumber, 0),
    sessionName: safeString(note?.sessionName || week?.sessionName),
    termName: safeString(note?.termName || week?.termName),
    className: safeString(note?.className || week?.className),
    subjectName: safeString(note?.subjectName || week?.subjectName),
    teacherName: safeString(note?.teacherName || week?.teacherName),
  };
}

function listLessonNotes(db, filters = {}, user = null) {
  const weekMap = buildVisibleWeekContextMap(db, user);
  const visibleWeekIds = new Set([...weekMap.keys()]);

  return sortLessonNotes(
    safeArray(db.lessonNotes)
      .filter((item) => visibleWeekIds.has(String(item.schemeWeekId)))
      .map((item) => normalizeLessonNoteRecord(db, item, weekMap))
      .filter((item) => (filters.schemeSessionId ? String(item.schemeSessionId) === String(filters.schemeSessionId) : true))
      .filter((item) => (filters.schemeTermId ? String(item.schemeTermId) === String(filters.schemeTermId) : true))
      .filter((item) => (filters.sessionId ? String(item.sessionId) === String(filters.sessionId) : true))
      .filter((item) => (filters.termId ? String(item.termId) === String(filters.termId) : true))
      .filter((item) => (filters.classId ? String(item.classId) === String(filters.classId) : true))
      .filter((item) => (filters.subjectId ? String(item.subjectId) === String(filters.subjectId) : true))
      .filter((item) => (filters.teacherUserId ? String(item.teacherUserId) === String(filters.teacherUserId) : true))
      .filter((item) => (filters.status ? safeLower(item.status) === safeLower(filters.status) : true))
      .filter((item) => (filters.schemeWeekId ? String(item.schemeWeekId) === String(filters.schemeWeekId) : true))
  );
}

function listLessonNoteReviews(db, filters = {}, user = null) {
  const notes = listLessonNotes(db, {}, user);
  const noteIds = new Set(notes.map((item) => String(item.id)));
  const noteMap = new Map(notes.map((item) => [String(item.id), item]));
  const weekMap = buildVisibleWeekContextMap(db, user);

  return sortNewest(
    safeArray(db.lessonNoteReviews)
      .filter((item) => noteIds.has(String(item.lessonNoteId)))
      .map((item) => normalizeLessonNoteReviewRecord(db, item, noteMap, weekMap))
      .filter((item) => (filters.lessonNoteId ? String(item.lessonNoteId) === String(filters.lessonNoteId) : true))
      .filter((item) => (filters.reviewStatus ? safeLower(item.reviewStatus) === safeLower(filters.reviewStatus) : true))
  );
}

function buildLessonNoteDetail(db, lessonNoteId, user = null) {
  const note = listLessonNotes(db, { }, user).find((item) => String(item.id) === String(lessonNoteId)) || null;
  if (!note) return null;
  return {
    ...note,
    reviews: listLessonNoteReviews(db, { lessonNoteId }, user),
  };
}

function buildLessonNoteTemplateForWeek(db, schemeWeekId, user = null) {
  const week = findVisibleWeekContext(db, schemeWeekId, user);
  if (!week) return null;
  return {
    schemeWeekId: week.id,
    schemeTermId: week.schemeTermId,
    schemeSessionId: week.schemeSessionId,
    sessionId: week.sessionId,
    termId: week.termId,
    classId: week.classId,
    subjectId: week.subjectId,
    teacherUserId: week.teacherUserId,
    weekNumber: week.weekNumber,
    weekTitle: week.title,
    title: `${safeString(week.topic || week.title || "Week")} Lesson Note`,
    topic: safeString(week.topic),
    subTopic: safeString(week.subTopic),
    learningObjectives: safeString(week.learningObjectives),
    lessonIntroduction: "",
    presentationSteps: "",
    teachingAids: safeString(week.learningMaterials),
    classActivities: safeString(week.teachingActivities),
    assessment: safeString(week.assessmentMethod),
    assignment: "",
    references: "",
    reflectionNote: "",
    status: "draft",
  };
}

function buildLessonNoteSetup(db, user = null) {
  const schemeSetup = buildSchemeSetup(db);
  const terms = listSchemeTerms(db, {}, user);
  const weeks = buildVisibleWeekContexts(db, user);
  return {
    sessions: schemeSetup.sessions,
    terms,
    weeks,
    statuses: {
      note: LESSON_NOTE_STATUSES,
      review: LESSON_NOTE_REVIEW_STATUSES,
    },
    activeSchemeSessionId: terms[0]?.schemeSessionId || "",
    activeSchemeTermId: terms[0]?.id || "",
  };
}

function buildTeacherCoverage(weeks = [], notes = []) {
  const weeksByTeacher = new Map();
  weeks.forEach((week) => {
    const key = safeString(week.teacherUserId || week.teacherName || "unassigned");
    if (!weeksByTeacher.has(key)) {
      weeksByTeacher.set(key, {
        teacherUserId: week.teacherUserId || "",
        teacherName: week.teacherName || "Unassigned",
        weeksTotal: 0,
        notesCreated: 0,
        approvedNotes: 0,
        pendingReview: 0,
      });
    }
    weeksByTeacher.get(key).weeksTotal += 1;
  });

  notes.forEach((note) => {
    const key = safeString(note.teacherUserId || note.teacherName || "unassigned");
    if (!weeksByTeacher.has(key)) {
      weeksByTeacher.set(key, {
        teacherUserId: note.teacherUserId || "",
        teacherName: note.teacherName || "Unassigned",
        weeksTotal: 0,
        notesCreated: 0,
        approvedNotes: 0,
        pendingReview: 0,
      });
    }
    const row = weeksByTeacher.get(key);
    row.notesCreated += 1;
    if (note.status === "approved") row.approvedNotes += 1;
    if (note.status === "in_review") row.pendingReview += 1;
  });

  return [...weeksByTeacher.values()]
    .map((row) => ({
      ...row,
      coveragePercent: row.weeksTotal ? Math.round((row.notesCreated / row.weeksTotal) * 100) : 0,
    }))
    .sort((a, b) => {
      const coverageDiff = safeNumber(b.coveragePercent, 0) - safeNumber(a.coveragePercent, 0);
      if (coverageDiff !== 0) return coverageDiff;
      return safeString(a.teacherName).localeCompare(safeString(b.teacherName));
    });
}

function buildRecentActivity(db, notes = [], reviews = []) {
  const noteItems = notes.slice(0, 8).map((item) => ({
    id: `note-${item.id}`,
    createdAt: item.updatedAt || item.createdAt,
    title: item.title,
    summary: `${item.className} - ${item.subjectName} | Week ${item.weekNumber}`,
    detail: `${item.statusLabel} | ${item.termName} | ${item.teacherName}`,
  }));

  const reviewItems = reviews.slice(0, 8).map((item) => ({
    id: `review-${item.id}`,
    createdAt: item.reviewedAt || item.createdAt,
    title: item.lessonNoteTitle || "Lesson note review",
    summary: `${item.className} - ${item.subjectName} | ${item.reviewStatusLabel}`,
    detail: `${item.termName} | ${item.reviewerName || "Academic desk"}`,
  }));

  return sortNewest([...noteItems, ...reviewItems]).slice(0, 10);
}

function buildLessonNoteDashboard(db, user = null) {
  const weeks = buildVisibleWeekContexts(db, user);
  const notes = listLessonNotes(db, {}, user);
  const reviews = listLessonNoteReviews(db, {}, user);
  const notedWeekIds = new Set(notes.map((item) => String(item.schemeWeekId)));

  return {
    totals: {
      notesCreated: notes.length,
      pendingReview: notes.filter((item) => item.status === "in_review").length,
      approvedNotes: notes.filter((item) => item.status === "approved").length,
      draftNotes: notes.filter((item) => item.status === "draft").length,
      weeksCovered: notedWeekIds.size,
      weeksWithoutNotes: weeks.filter((item) => !notedWeekIds.has(String(item.id))).length,
      coveragePercent: weeks.length ? Math.round((notedWeekIds.size / weeks.length) * 100) : 0,
    },
    teacherCoverage: buildTeacherCoverage(weeks, notes),
    notesNeedingReview: notes.filter((item) => item.status === "in_review").slice(0, 8),
    weeksWithoutNotes: weeks.filter((item) => !notedWeekIds.has(String(item.id))).slice(0, 8),
    recentActivity: buildRecentActivity(db, notes, reviews),
  };
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function wrapPdfLine(text, maxLength = 88) {
  const content = safeString(text);
  if (!content) return [""];
  if (content.length <= maxLength) return [content];
  const words = content.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });
  if (current) lines.push(current);
  return lines.length ? lines : [content];
}

function pdfEscape(text) {
  return String(text || "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[\r\n]+/g, " ");
}

function pdfText(x, y, font, size, text, color = "0 0 0") {
  return `${color} rg\nBT /${font} ${size} Tf ${x} ${y} Td (${pdfEscape(text)}) Tj ET`;
}

function buildLessonNoteExportHtml(note) {
  if (!note) throw createHttpError(404, "Lesson note not found");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(note.title)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; color: #10233d; }
    .brand { margin-bottom: 24px; }
    .meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 24px; }
    .meta-card, .section-card { border: 1px solid #d7e2ef; border-radius: 14px; padding: 16px; background: #ffffff; }
    .section-card { margin-bottom: 16px; }
    h1, h2, h3 { margin-top: 0; }
    p { white-space: pre-wrap; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="brand">
    <h1>Angel Montessori School</h1>
    <p>Lesson Note Export</p>
  </div>
  <div class="meta">
    <div class="meta-card"><strong>Session</strong><div>${escapeHtml(note.sessionName)}</div></div>
    <div class="meta-card"><strong>Term</strong><div>${escapeHtml(note.termName)}</div></div>
    <div class="meta-card"><strong>Class</strong><div>${escapeHtml(note.className)}</div></div>
    <div class="meta-card"><strong>Subject</strong><div>${escapeHtml(note.subjectName)}</div></div>
    <div class="meta-card"><strong>Week</strong><div>${escapeHtml(`Week ${note.weekNumber}`)}</div></div>
    <div class="meta-card"><strong>Status</strong><div>${escapeHtml(note.statusLabel)}</div></div>
  </div>
  <div class="section-card"><h2>${escapeHtml(note.title)}</h2><p>${escapeHtml(note.topic)}${note.subTopic ? `\n${escapeHtml(note.subTopic)}` : ""}</p></div>
  <div class="section-card"><h3>Learning Objectives</h3><p>${escapeHtml(note.learningObjectives || "-")}</p></div>
  <div class="section-card"><h3>Lesson Introduction</h3><p>${escapeHtml(note.lessonIntroduction || "-")}</p></div>
  <div class="section-card"><h3>Presentation Steps</h3><p>${escapeHtml(note.presentationSteps || "-")}</p></div>
  <div class="section-card"><h3>Teaching Aids</h3><p>${escapeHtml(note.teachingAids || "-")}</p></div>
  <div class="section-card"><h3>Class Activities</h3><p>${escapeHtml(note.classActivities || "-")}</p></div>
  <div class="section-card"><h3>Assessment</h3><p>${escapeHtml(note.assessment || "-")}</p></div>
  <div class="section-card"><h3>Assignment</h3><p>${escapeHtml(note.assignment || "-")}</p></div>
  <div class="section-card"><h3>References</h3><p>${escapeHtml(note.references || "-")}</p></div>
  <div class="section-card"><h3>Reflection Note</h3><p>${escapeHtml(note.reflectionNote || "-")}</p></div>
</body>
</html>`;
}

function buildLessonNotePdfLines(note) {
  if (!note) throw createHttpError(404, "Lesson note not found");
  const lines = [
    "Angel Montessori School",
    "Lesson Note",
    "",
    `${note.sessionName} - ${note.termName}`,
    `${note.className} - ${note.subjectName}`,
    `Week ${note.weekNumber} | ${note.statusLabel}`,
    `Topic: ${note.topic}`,
  ];
  if (note.subTopic) lines.push(`Sub-topic: ${note.subTopic}`);
  lines.push("");
  wrapPdfLine(`Learning Objectives: ${note.learningObjectives || "-"}`, 84).forEach((line) => lines.push(line));
  lines.push("");
  wrapPdfLine(`Lesson Introduction: ${note.lessonIntroduction || "-"}`, 84).forEach((line) => lines.push(line));
  lines.push("");
  wrapPdfLine(`Presentation Steps: ${note.presentationSteps || "-"}`, 84).forEach((line) => lines.push(line));
  lines.push("");
  wrapPdfLine(`Teaching Aids: ${note.teachingAids || "-"}`, 84).forEach((line) => lines.push(line));
  lines.push("");
  wrapPdfLine(`Class Activities: ${note.classActivities || "-"}`, 84).forEach((line) => lines.push(line));
  lines.push("");
  wrapPdfLine(`Assessment: ${note.assessment || "-"}`, 84).forEach((line) => lines.push(line));
  lines.push("");
  wrapPdfLine(`Assignment: ${note.assignment || "-"}`, 84).forEach((line) => lines.push(line));
  lines.push("");
  wrapPdfLine(`References: ${note.references || "-"}`, 84).forEach((line) => lines.push(line));
  lines.push("");
  wrapPdfLine(`Reflection Note: ${note.reflectionNote || "-"}`, 84).forEach((line) => lines.push(line));
  lines.push("");
  lines.push("Angel Montessori School - Building Lives, Inspiring Futures.");
  return lines;
}

function buildLessonNotePdfBuffer(note) {
  const lines = buildLessonNotePdfLines(note);
  const pages = [];
  for (let index = 0; index < lines.length; index += 52) pages.push(lines.slice(index, index + 52));
  if (!pages.length) pages.push(["No lesson note content available"]);

  const objects = {};
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";
  objects[5] = "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>";

  let objectId = 6;
  const pageIds = [];
  pages.forEach((pageLines, pageIndex) => {
    const pageId = objectId;
    const contentId = objectId + 1;
    objectId += 2;
    pageIds.push(pageId);
    const operations = [];
    operations.push("0.11 0.31 0.56 rg\n36 792 523 28 re f");
    operations.push(pdfText(46, 801, "F4", 13, `LESSON NOTE - ${safeString(note.className)} ${safeString(note.subjectName)} (Page ${pageIndex + 1}/${pages.length})`, "1 1 1"));
    let y = 776;
    pageLines.forEach((line, lineIndex) => {
      const font = lineIndex < 2 || lineIndex === 3 || lineIndex === 4 ? "F4" : "F5";
      const size = font === "F4" ? 9.5 : 8.2;
      operations.push(pdfText(40, y, font, size, line));
      y -= 12;
    });
    const stream = operations.join("\n");
    objects[contentId] = `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`;
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F3 3 0 R /F4 4 0 R /F5 5 0 R >> >> /Contents ${contentId} 0 R >>`;
  });

  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((value) => `${value} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
  let pdf = "%PDF-1.4\n";
  const maxObjectId = objectId - 1;
  const offsets = new Array(maxObjectId + 1).fill(0);
  for (let index = 1; index <= maxObjectId; index += 1) {
    offsets[index] = Buffer.byteLength(pdf, "utf8");
    pdf += `${index} 0 obj\n${objects[index] || "<<>>"}\nendobj\n`;
  }
  const xrefStart = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${maxObjectId + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= maxObjectId; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${maxObjectId + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}

module.exports = {
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
};
