const express = require("express");
const { readDB, writeDB } = require("../lib/jsonStore");
const {
  ensureAcademicCalendarCollections,
  getPublishedAcademicCalendar,
  buildPublicCalendarSummaryItems,
  buildCalendarAnnouncements,
} = require("../lib/academicCalendar");
const { ensureAcademicScope } = require("../lib/academicScope");

const router = express.Router();

function safeString(value) {
  return String(value || "").trim();
}

function asDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function latestByDate(rows = [], getDate) {
  return [...rows].sort((a, b) => {
    const left = asDate(getDate(b))?.getTime() || 0;
    const right = asDate(getDate(a))?.getTime() || 0;
    return left - right;
  });
}

function getActiveSession(db) {
  const sessions = Array.isArray(db.academicSessions) ? db.academicSessions : [];
  return sessions.find((row) => row.isActive) || sessions[0] || null;
}

function getActiveTerm(db, sessionId = "") {
  const terms = Array.isArray(db.terms) ? db.terms : [];
  return (
    terms.find((row) => row.isActive && (!sessionId || String(row.sessionId) === String(sessionId))) ||
    terms.find((row) => !sessionId || String(row.sessionId) === String(sessionId)) ||
    null
  );
}

router.get("/overview", (req, res) => {
  const db = readDB();
  ensureAcademicScope(db, { currentSession: process.env.CURRENT_SESSION, currentTerm: process.env.CURRENT_TERM });
  ensureAcademicCalendarCollections(db);
  writeDB(db);

  const activeSession = getActiveSession(db);
  const activeTerm = getActiveTerm(db, activeSession?.id || "");
  const publishedCalendar = getPublishedAcademicCalendar(db);

  const admissionsSessions = Array.isArray(db.admissionSessions) ? db.admissionSessions : [];
  const activeAdmission =
    admissionsSessions.find((row) => safeString(row.status).toUpperCase() === "OPEN") ||
    admissionsSessions.find((row) => row.isActive) ||
    admissionsSessions[0] ||
    null;

  const examRows = Array.isArray(db.exams) ? db.exams : [];
  const latestExams = latestByDate(examRows, (row) => row.createdAt || row.updatedAt).slice(0, 3).map((row) => ({
    id: String(row.id || ""),
    title: safeString(row.title || "Assessment"),
    createdAt: safeString(row.createdAt || row.updatedAt || ""),
  }));

  const libraryRows = Array.isArray(db.books) ? db.books : [];
  const orderedLibraryRows = latestByDate(libraryRows, (row) => row.createdAt || row.updatedAt);
  const rowsWithUrls = orderedLibraryRows.filter((row) => safeString(row?.url));
  const rowsWithoutUrls = orderedLibraryRows.filter((row) => !safeString(row?.url));
  const downloads = [...rowsWithUrls, ...rowsWithoutUrls].slice(0, 6).map((row) => ({
    id: String(row.id || ""),
    title: safeString(row.title || row.name || "School Resource"),
    category: safeString(row.section || "Resource"),
    type: safeString(row.type || "Document"),
    url: safeString(row.url || ""),
    description: safeString(row.description || "School learning and information resource."),
  }));

  const calendar = buildPublicCalendarSummaryItems(db, 6);
  if (!calendar.length && activeSession) {
    calendar.push({
      id: String(activeSession.id || "session"),
      title: `Academic Session ${safeString(activeSession.sessionName)}`,
      subtitle: activeSession.isActive ? "Current school session" : "School session",
      startDate: safeString(activeSession.startDate || ""),
      endDate: safeString(activeSession.endDate || ""),
    });
  }
  if (!calendar.length && activeTerm) {
    calendar.push({
      id: String(activeTerm.id || "term"),
      title: `${safeString(activeTerm.termName)}${activeSession?.sessionName ? ` - ${safeString(activeSession.sessionName)}` : ""}`,
      subtitle: activeTerm.isActive ? "Current term" : "School term",
      startDate: safeString(activeTerm.startDate || ""),
      endDate: safeString(activeTerm.endDate || ""),
    });
  }
  if (!calendar.length && activeAdmission) {
    calendar.push({
      id: String(activeAdmission.id || "admission-window"),
      title: safeString(activeAdmission.title || activeAdmission.sessionName || "Admission Window"),
      subtitle: "Admissions timeline",
      startDate: safeString(activeAdmission.startDate || ""),
      endDate: safeString(activeAdmission.endDate || ""),
    });
  }

  const announcements = [
    ...buildCalendarAnnouncements(db, 2),
    activeAdmission
      ? {
          id: String(activeAdmission.id || "admission-window"),
          title: safeString(activeAdmission.title || "Admissions Open"),
          summary: "Families can begin the admission journey, ask questions, and complete the online application flow.",
          date: safeString(activeAdmission.startDate || ""),
          link: "/admissions",
        }
      : null,
    latestExams[0]
      ? {
          id: `exam-${latestExams[0].id}`,
          title: latestExams[0].title,
          summary: "Assessment and CBT readiness remain part of the school's modern academic system.",
          date: latestExams[0].createdAt,
          link: "/academics/cbt-assessments",
        }
      : null,
  ].filter(Boolean).slice(0, 4);

  res.json({
    activeSession,
    activeTerm,
    activeAdmission,
    publishedCalendar,
    announcements,
    calendar,
    downloads,
    latestExams,
  });
});

module.exports = router;
