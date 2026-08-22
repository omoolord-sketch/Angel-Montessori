const fs = require("fs");
const path = require("path");
const express = require("express");
const { nanoid } = require("nanoid");
const { readDB, writeDB } = require("../lib/jsonStore");
const { auth, requireRole } = require("../middleware/auth");
const { ensureAcademicScope } = require("../lib/academicScope");

const router = express.Router();

const COLLECTION_KEYS = [
  "teacherAnalyticsSnapshots",
  "teacherPerformanceFlags",
  "teacherTargets",
  "teacherFeedbackNotes",
  "teacherWorkloadSnapshots",
  "teacherMetricTrends",
  "analyticsJobsLog",
  "teacherAnalyticsExports",
];

const ADMIN_ROLES = ["ADMIN", "HOD", "SECTION_HEAD", "PRINCIPAL", "VICE_PRINCIPAL"];
const TARGET_DEFAULTS = {
  expectedLessons: 6,
  expectedAssignments: 3,
  expectedQuizzes: 2,
  expectedAttendanceRate: 75,
  expectedGradingCompletionRate: 80,
  expectedMaxGradingDays: 7,
  expectedPassRate: 40,
  expectedLessonViewRate: 50,
  expectedAssignmentSubmissionRate: 60,
};

const SCHOOL_NAME = str(process.env.SCHOOL_NAME || "Angel Montessori School");
const SCHOOL_ADDRESS = str(process.env.SCHOOL_ADDRESS || "152 Okedogbon Road, Owo, Ondo State, Nigeria");
const SCHOOL_EMAIL = str(process.env.SCHOOL_EMAIL || "info@angelmontessori.ng");
const SCHOOL_PHONE = str(process.env.SCHOOL_PHONE || "+234 803 506 7767");
const SCHOOL_REPORT_FOOTER = str(process.env.SCHOOL_REPORT_FOOTER || "Teacher Analytics Report");

const LOGO_CANDIDATE_PATHS = [
  process.env.SCHOOL_LOGO_JPG_PATH,
  path.join(__dirname, "../assets/school-logo.jpg"),
  path.join(__dirname, "../../frontend/public/school-logo.jpg"),
  path.join(__dirname, "../../frontend/public/logo.jpg"),
];

let cachedPdfLogo = null;

function nowIso() {
  return new Date().toISOString();
}

function str(value) {
  return String(value || "").trim();
}

function nk(value) {
  return str(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function pct(a, b) {
  if (!b) return 0;
  return Number(((a / b) * 100).toFixed(2));
}

function toDate(value) {
  const raw = str(value);
  if (!raw) return null;
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

function dayKey(value) {
  return str(value).slice(0, 10);
}

function daysBetween(a, b) {
  const x = toDate(a);
  const y = toDate(b);
  if (!x || !y) return null;
  return Number(((y.getTime() - x.getTime()) / 86400000).toFixed(2));
}

function inDateRange(value, startDate, endDate) {
  const d = dayKey(value);
  if (!d) return false;
  if (startDate && d < startDate) return false;
  if (endDate && d > endDate) return false;
  return true;
}

function sectionFromClass(row = {}) {
  const section = str(row.section);
  if (section) return section;
  const key = nk(row.name || row.className);
  if (key.includes("creche") || key.includes("nursery") || key.includes("reception")) return "Early Years";
  if (key.includes("basic")) return "Basic School";
  if (key.includes("jss") || key.includes("junior")) return "Junior Secondary";
  if (key.includes("ss") || key.includes("senior")) return "Senior Secondary";
  return "General";
}

function ensureCollections(db) {
  let changed = false;
  for (const key of COLLECTION_KEYS) {
    if (!Array.isArray(db[key])) {
      db[key] = [];
      changed = true;
    }
  }
  if (!Array.isArray(db.users)) {
    db.users = [];
    changed = true;
  }
  if (!Array.isArray(db.classes)) {
    db.classes = [];
    changed = true;
  }
  if (!Array.isArray(db.students)) {
    db.students = [];
    changed = true;
  }
  ensureAcademicScope(db, { currentSession: process.env.CURRENT_SESSION, currentTerm: process.env.CURRENT_TERM });
  changed = true;
  return changed;
}

function role(req) {
  return str(req?.user?.role).toUpperCase();
}

function canAdminView(req) {
  return ADMIN_ROLES.includes(role(req));
}

function getSessions(db) {
  const out = [];
  for (const row of db.lmsSessions || []) {
    out.push({ id: str(row.id), sessionName: str(row.sessionName), isActive: Boolean(row.isActive), source: "LMS" });
  }
  for (const row of db.academicSessions || []) {
    const id = str(row.id);
    if (out.some((x) => str(x.id) === id)) continue;
    out.push({ id, sessionName: str(row.sessionName), isActive: Boolean(row.isActive), source: "ACADEMIC" });
  }
  return out;
}

function getTerms(db) {
  const out = [];
  for (const row of db.lmsTerms || []) {
    out.push({
      id: str(row.id),
      sessionId: str(row.sessionId),
      termName: str(row.termName),
      startDate: dayKey(row.startDate),
      endDate: dayKey(row.endDate),
      isActive: Boolean(row.isActive),
      source: "LMS",
    });
  }
  for (const row of db.terms || []) {
    const id = str(row.id);
    if (out.some((x) => str(x.id) === id)) continue;
    out.push({
      id,
      sessionId: str(row.sessionId),
      termName: str(row.termName),
      startDate: dayKey(row.startDate),
      endDate: dayKey(row.endDate),
      isActive: Boolean(row.isActive),
      source: "ACADEMIC",
    });
  }
  return out;
}

function filterContext(db, source = {}) {
  const sessions = getSessions(db);
  const terms = getTerms(db);

  const sessionInput = str(source.sessionId);
  const termInput = str(source.termId);

  const session =
    sessions.find((x) => str(x.id) === sessionInput) ||
    sessions.find((x) => nk(x.sessionName) === nk(source.sessionName)) ||
    sessions.find((x) => x.isActive) ||
    sessions[0] ||
    null;

  const termRows = terms.filter((x) => !session || str(x.sessionId) === str(session.id));
  const term =
    termRows.find((x) => str(x.id) === termInput) ||
    termRows.find((x) => nk(x.termName) === nk(source.termName)) ||
    termRows.find((x) => x.isActive) ||
    termRows[0] ||
    null;

  return {
    sessionId: str(session?.id),
    sessionName: str(session?.sessionName),
    termId: str(term?.id),
    termName: str(term?.termName),
    startDate: dayKey(source.startDate || term?.startDate),
    endDate: dayKey(source.endDate || term?.endDate),
    section: str(source.section),
  };
}

function classLookups(db) {
  const byId = new Map();
  const byName = new Map();
  for (const row of db.classes || []) {
    const normalized = {
      id: str(row.id),
      name: str(row.name || row.className),
      section: sectionFromClass(row),
      teacherId: str(row.teacherId || row.classTeacherId),
    };
    byId.set(normalized.id, normalized);
    if (normalized.name) byName.set(nk(normalized.name), normalized);
  }
  return { byId, byName };
}

function resolveAssignments(db, teacher, ctx, lookups) {
  const teacherId = str(teacher.id);
  const classMap = new Map();
  const subjects = new Set();
  const lmsClassSubjectIds = new Set();
  const offeringIds = new Set();

  for (const row of db.lmsClassSubjects || []) {
    if (str(row.teacherUserId) !== teacherId) continue;
    if (ctx.sessionId && str(row.sessionId) && str(row.sessionId) !== ctx.sessionId) continue;
    if (ctx.termId && str(row.termId) && str(row.termId) !== ctx.termId) continue;
    const cls = lookups.byId.get(str(row.classId)) || lookups.byName.get(nk(row.className)) || null;
    const classId = str(row.classId || cls?.id);
    const className = str(row.className || cls?.name);
    classMap.set(classId || nk(className), {
      id: classId,
      name: className,
      section: str(cls?.section || row.section || "General"),
    });
    subjects.add(nk(row.subjectName || row.subjectId));
    lmsClassSubjectIds.add(str(row.id));
  }

  for (const row of db.classSubjectOfferings || []) {
    if (str(row.teacherUserId) !== teacherId) continue;
    if (ctx.sessionId && str(row.sessionId) && str(row.sessionId) !== ctx.sessionId) continue;
    if (ctx.termId && str(row.termId) && str(row.termId) !== ctx.termId) continue;
    const cls = lookups.byId.get(str(row.classId)) || lookups.byName.get(nk(row.className)) || null;
    classMap.set(str(row.classId) || nk(row.className), {
      id: str(row.classId || cls?.id),
      name: str(row.className || cls?.name),
      section: str(row.section || cls?.section || "General"),
    });
    subjects.add(nk(row.subject));
    offeringIds.add(str(row.id));
  }

  for (const cls of lookups.byId.values()) {
    if (str(cls.teacherId) !== teacherId) continue;
    classMap.set(str(cls.id), { id: str(cls.id), name: str(cls.name), section: str(cls.section || "General") });
  }

  for (const sub of Array.isArray(teacher.subjects) ? teacher.subjects : []) subjects.add(nk(sub));

  const classes = Array.from(classMap.values()).sort((a, b) => str(a.name).localeCompare(str(b.name)));
  const classIds = new Set(classes.map((x) => str(x.id)).filter(Boolean));

  return { classes, classIds, subjectCount: subjects.size, lmsClassSubjectIds, offeringIds };
}

function belongsToClass(student, classIds, lookups) {
  const classId = str(student.classId);
  if (classId && classIds.has(classId)) return true;
  const cls = lookups.byName.get(nk(student.className));
  return cls ? classIds.has(str(cls.id)) : false;
}

function teacherTarget(db, teacherId, ctx) {
  const rows = db.teacherTargets || [];
  const exact = rows.find((x) => str(x.teacherUserId) === str(teacherId) && str(x.sessionId) === str(ctx.sessionId) && str(x.termId) === str(ctx.termId));
  const base = exact || {};
  return {
    expectedLessons: num(base.expectedLessons, TARGET_DEFAULTS.expectedLessons),
    expectedAssignments: num(base.expectedAssignments, TARGET_DEFAULTS.expectedAssignments),
    expectedQuizzes: num(base.expectedQuizzes, TARGET_DEFAULTS.expectedQuizzes),
    expectedAttendanceRate: num(base.expectedAttendanceRate, TARGET_DEFAULTS.expectedAttendanceRate),
    expectedGradingCompletionRate: num(base.expectedGradingCompletionRate, TARGET_DEFAULTS.expectedGradingCompletionRate),
    expectedMaxGradingDays: num(base.expectedMaxGradingDays, TARGET_DEFAULTS.expectedMaxGradingDays),
    expectedPassRate: num(base.expectedPassRate, TARGET_DEFAULTS.expectedPassRate),
    expectedLessonViewRate: num(base.expectedLessonViewRate, TARGET_DEFAULTS.expectedLessonViewRate),
    expectedAssignmentSubmissionRate: num(base.expectedAssignmentSubmissionRate, TARGET_DEFAULTS.expectedAssignmentSubmissionRate),
  };
}

function buildFlags(snapshot, target) {
  const out = [];

  if (num(snapshot.lessonsPublished) < num(target.expectedLessons) * 0.5) {
    out.push({
      flagType: "low_lms_activity",
      severity: num(snapshot.lessonsPublished) === 0 ? "critical" : "warning",
      sourceMetric: "lessonsPublished",
      metricValue: num(snapshot.lessonsPublished),
      thresholdValue: Number((num(target.expectedLessons) * 0.5).toFixed(2)),
      flagMessage: "Lesson publication is below expected level.",
    });
  }

  if (num(snapshot.attendanceSubmissionRate) < num(target.expectedAttendanceRate)) {
    out.push({
      flagType: "low_attendance_compliance",
      severity: num(target.expectedAttendanceRate) - num(snapshot.attendanceSubmissionRate) >= 20 ? "critical" : "warning",
      sourceMetric: "attendanceSubmissionRate",
      metricValue: num(snapshot.attendanceSubmissionRate),
      thresholdValue: num(target.expectedAttendanceRate),
      flagMessage: "Attendance compliance is below target.",
    });
  }

  if (num(snapshot.gradingCompletionRate) < num(target.expectedGradingCompletionRate) || num(snapshot.avgAssignmentGradingDays) > num(target.expectedMaxGradingDays)) {
    out.push({
      flagType: "overdue_grading",
      severity: num(snapshot.avgAssignmentGradingDays) > num(target.expectedMaxGradingDays) ? "critical" : "warning",
      sourceMetric: num(snapshot.avgAssignmentGradingDays) > num(target.expectedMaxGradingDays) ? "avgAssignmentGradingDays" : "gradingCompletionRate",
      metricValue: num(snapshot.avgAssignmentGradingDays) > num(target.expectedMaxGradingDays) ? num(snapshot.avgAssignmentGradingDays) : num(snapshot.gradingCompletionRate),
      thresholdValue: num(snapshot.avgAssignmentGradingDays) > num(target.expectedMaxGradingDays) ? num(target.expectedMaxGradingDays) : num(target.expectedGradingCompletionRate),
      flagMessage: "Grading turnaround/completion requires attention.",
    });
  }

  if (num(snapshot.lessonViewRate) < num(target.expectedLessonViewRate) || num(snapshot.assignmentSubmissionRate) < num(target.expectedAssignmentSubmissionRate) || num(snapshot.quizParticipationRate) < 50) {
    out.push({
      flagType: "low_student_engagement",
      severity: "warning",
      sourceMetric: "lessonViewRate",
      metricValue: Math.min(num(snapshot.lessonViewRate), num(snapshot.assignmentSubmissionRate), num(snapshot.quizParticipationRate)),
      thresholdValue: Math.min(num(target.expectedLessonViewRate), num(target.expectedAssignmentSubmissionRate), 50),
      flagMessage: "Student engagement indicators are below threshold.",
    });
  }

  if (num(snapshot.classPassRate) > 0 && num(snapshot.classPassRate) < num(target.expectedPassRate)) {
    out.push({
      flagType: "weak_academic_outcome",
      severity: "warning",
      sourceMetric: "classPassRate",
      metricValue: num(snapshot.classPassRate),
      thresholdValue: num(target.expectedPassRate),
      flagMessage: "Class pass rate is below expected level.",
    });
  }

  if (num(snapshot.activeDaysCount) === 0 && num(snapshot.totalClassesAssigned) > 0) {
    out.push({
      flagType: "inactivity_detected",
      severity: "critical",
      sourceMetric: "activeDaysCount",
      metricValue: 0,
      thresholdValue: 1,
      flagMessage: "No portal activity detected in this period.",
    });
  }

  return out;
}

function computeSnapshot(db, teacher, ctx) {
  const lookups = classLookups(db);
  const a = resolveAssignments(db, teacher, ctx, lookups);

  const students = (db.students || []).filter((x) => belongsToClass(x, a.classIds, lookups));
  const classSize = new Map();
  for (const c of a.classes) {
    classSize.set(str(c.id), students.filter((s) => str(s.classId) === str(c.id) || nk(s.className) === nk(c.name)).length);
  }

  const csById = new Map((db.lmsClassSubjects || []).map((x) => [str(x.id), x]));
  const lessonById = new Map((db.lmsLessons || []).map((x) => [str(x.id), x]));

  const teacherId = str(teacher.id);
  const lessonsAll = (db.lmsLessons || []).filter((x) => a.lmsClassSubjectIds.has(str(x.classSubjectId)) && (str(x.createdBy) === teacherId || str(x.updatedBy) === teacherId));
  const lessonsPublished = lessonsAll.filter((x) => str(x.publishStatus).toUpperCase() === "PUBLISHED");

  const resourcesUploaded = (db.lmsLessonResources || []).filter((x) => {
    if (str(x.uploadedBy) !== teacherId) return false;
    const lesson = lessonById.get(str(x.lessonId));
    return lesson ? a.lmsClassSubjectIds.has(str(lesson.classSubjectId)) : false;
  });

  const teacherAssignments = (db.lmsAssignments || []).filter((x) => a.lmsClassSubjectIds.has(str(x.classSubjectId)) && str(x.createdBy) === teacherId);
  const teacherQuizzes = (db.lmsQuizzes || []).filter((x) => a.lmsClassSubjectIds.has(str(x.classSubjectId)) && str(x.createdBy) === teacherId);
  const announcements = (db.lmsAnnouncements || []).filter((x) => str(x.publishedBy) === teacherId);

  let expectedAssignmentSubs = 0;
  for (const row of teacherAssignments) {
    const cs = csById.get(str(row.classSubjectId));
    expectedAssignmentSubs += num(classSize.get(str(cs?.classId)), 0);
  }

  const assignmentSubmissions = (db.lmsAssignmentSubmissions || []).filter((x) => teacherAssignments.some((aRow) => str(aRow.id) === str(x.assignmentId)));

  let expectedLessonViews = 0;
  for (const row of lessonsPublished) {
    const cs = csById.get(str(row.classSubjectId));
    expectedLessonViews += num(classSize.get(str(cs?.classId)), 0);
  }
  const lessonViews = (db.lmsLessonProgress || []).filter((x) => x.isViewed && lessonsPublished.some((l) => str(l.id) === str(x.lessonId)));

  let expectedQuizParticipation = 0;
  for (const row of teacherQuizzes) {
    const cs = csById.get(str(row.classSubjectId));
    expectedQuizParticipation += num(classSize.get(str(cs?.classId)), 0);
  }
  const quizAttempts = new Set();
  for (const attempt of db.lmsQuizAttempts || []) {
    if (!teacherQuizzes.some((q) => str(q.id) === str(attempt.quizId))) continue;
    const sid = str(attempt.studentId || attempt.studentUserId);
    if (!sid) continue;
    quizAttempts.add(`${str(attempt.quizId)}:${sid}`);
  }

  const gradingDays = (db.lmsAssignmentSubmissions || [])
    .filter((x) => str(x.gradedBy) === teacherId && str(x.gradedAt))
    .map((x) => daysBetween(x.submittedAt, x.gradedAt))
    .filter((x) => x != null);

  const attendanceRows = (db.attendanceSessions || []).filter((x) => {
    if (!a.classIds.has(str(x.classId))) return false;
    if (ctx.sessionName && str(x.academicSession) && nk(x.academicSession) !== nk(ctx.sessionName)) return false;
    if (ctx.termName && str(x.term) && nk(x.term) !== nk(ctx.termName)) return false;
    if (ctx.startDate || ctx.endDate) return inDateRange(x.attendanceDate, ctx.startDate, ctx.endDate);
    return true;
  });

  const schoolDays = new Set(attendanceRows.map((x) => dayKey(x.attendanceDate)).filter(Boolean));
  const attendanceExpected = schoolDays.size > 0 && a.classes.length > 0 ? schoolDays.size * a.classes.length : attendanceRows.length;
  const attendanceSubmittedRows = attendanceRows.filter((x) => str(x.markedBy) === teacherId);

  const attendanceDelays = attendanceSubmittedRows
    .map((x) => {
      const submitted = toDate(x.submittedAt);
      const start = toDate(`${dayKey(x.attendanceDate)}T08:00:00.000Z`);
      if (!submitted || !start) return null;
      return Number(Math.max((submitted.getTime() - start.getTime()) / 60000, 0).toFixed(2));
    })
    .filter((x) => x != null);

  const offerings = (db.classSubjectOfferings || []).filter((x) => {
    if (str(x.teacherUserId) !== teacherId) return false;
    if (ctx.sessionId && str(x.sessionId) && str(x.sessionId) !== ctx.sessionId) return false;
    if (ctx.termId && str(x.termId) && str(x.termId) !== ctx.termId) return false;
    return true;
  });
  const offeringIds = new Set(offerings.map((x) => str(x.id)));
  const scoreSheetsExpected = offerings.length;
  const scoreSheetsSubmitted = (db.scoreSheets || []).filter((x) => offeringIds.has(str(x.classSubjectOfferingId)) && ["SUBMITTED", "APPROVED", "LOCKED"].includes(str(x.status).toUpperCase())).length;

  const computedRows = (db.computedResults || []).filter((x) => offeringIds.has(str(x.classSubjectOfferingId)));
  const passRows = computedRows.filter((x) => num(x.totalScore) >= 50);
  const failRows = computedRows.filter((x) => num(x.totalScore) < 50);

  const timestamps = [];
  for (const row of db.lmsActivityLogs || []) if (str(row.userId) === teacherId) timestamps.push(str(row.createdAt));
  for (const row of lessonsAll) timestamps.push(str(row.updatedAt || row.createdAt));
  for (const row of teacherAssignments) timestamps.push(str(row.updatedAt || row.createdAt));
  for (const row of teacherQuizzes) timestamps.push(str(row.updatedAt || row.createdAt));
  for (const row of announcements) timestamps.push(str(row.updatedAt || row.createdAt || row.publishedAt));
  for (const row of attendanceSubmittedRows) timestamps.push(str(row.submittedAt));
  for (const row of db.studentScores || []) if (str(row.enteredBy) === teacherId) timestamps.push(str(row.enteredAt));
  for (const row of db.gradingLogs || []) if (str(row.userId) === teacherId) timestamps.push(str(row.createdAt));

  const filteredTimes = timestamps.filter((x) => {
    if (!ctx.startDate && !ctx.endDate) return true;
    return inDateRange(x, ctx.startDate, ctx.endDate);
  });

  const activeDays = new Set(filteredTimes.map((x) => dayKey(x)).filter(Boolean));
  const lastActiveAt = filteredTimes.sort().slice(-1)[0] || "";
  const loginCount = (db.lmsActivityLogs || []).filter((x) => str(x.userId) === teacherId && str(x.action).toLowerCase().includes("login")).length;

  const sections = new Set(a.classes.map((x) => str(x.section)).filter(Boolean));

  return {
    id: `tas-${nanoid(10)}`,
    teacherUserId: teacherId,
    teacherName: str(teacher.name),
    sessionId: ctx.sessionId,
    sessionName: ctx.sessionName,
    termId: ctx.termId,
    termName: ctx.termName,
    section: sections.size === 1 ? Array.from(sections)[0] : sections.size > 1 ? "Mixed" : "General",
    totalClassesAssigned: a.classes.length,
    totalSubjectsAssigned: a.subjectCount,
    totalStudentsAssigned: students.length,
    lessonsPublished: lessonsPublished.length,
    resourcesUploaded: resourcesUploaded.length,
    assignmentsCreated: teacherAssignments.length,
    quizzesCreated: teacherQuizzes.length,
    announcementsPosted: announcements.length,
    attendanceSessionsExpected: attendanceExpected,
    attendanceSessionsSubmitted: attendanceSubmittedRows.length,
    attendanceSubmissionRate: pct(attendanceSubmittedRows.length, attendanceExpected),
    avgAttendanceSubmissionMinutes: attendanceDelays.length ? Number((attendanceDelays.reduce((s, v) => s + v, 0) / attendanceDelays.length).toFixed(2)) : 0,
    scoreSheetsExpected,
    scoreSheetsSubmitted,
    gradingCompletionRate: pct(scoreSheetsSubmitted, scoreSheetsExpected),
    avgAssignmentGradingDays: gradingDays.length ? Number((gradingDays.reduce((s, v) => s + v, 0) / gradingDays.length).toFixed(2)) : 0,
    lessonViewRate: pct(lessonViews.length, expectedLessonViews),
    assignmentSubmissionRate: pct(assignmentSubmissions.length, expectedAssignmentSubs),
    quizParticipationRate: pct(quizAttempts.size, expectedQuizParticipation),
    classAverageScore: computedRows.length ? Number((computedRows.reduce((s, row) => s + num(row.totalScore), 0) / computedRows.length).toFixed(2)) : 0,
    classPassRate: pct(passRows.length, computedRows.length),
    classFailRate: pct(failRows.length, computedRows.length),
    loginCount,
    activeDaysCount: activeDays.size,
    lastActiveAt,
    pendingAssignmentSubmissions: Math.max(expectedAssignmentSubs - assignmentSubmissions.length, 0),
    pendingScoreSheets: Math.max(scoreSheetsExpected - scoreSheetsSubmitted, 0),
    pendingQuizReviews: (db.lmsQuizAttempts || []).filter((x) => teacherQuizzes.some((q) => str(q.id) === str(x.quizId)) && str(x.status).toLowerCase() === "in_progress").length,
    totalPeriodsPerWeek: 0,
    snapshotDate: dayKey(nowIso()),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

function computeSnapshots(db, ctx, teacherUserId = "") {
  return (db.users || [])
    .filter((x) => str(x.role).toUpperCase() === "TEACHER")
    .filter((x) => (teacherUserId ? str(x.id) === str(teacherUserId) : true))
    .sort((a, b) => str(a.name).localeCompare(str(b.name)))
    .map((teacher) => computeSnapshot(db, teacher, ctx));
}

function upsertSnapshot(db, row) {
  const idx = (db.teacherAnalyticsSnapshots || []).findIndex((x) => str(x.teacherUserId) === str(row.teacherUserId) && str(x.sessionId) === str(row.sessionId) && str(x.termId) === str(row.termId));
  if (idx >= 0) {
    db.teacherAnalyticsSnapshots[idx] = { ...db.teacherAnalyticsSnapshots[idx], ...row, id: db.teacherAnalyticsSnapshots[idx].id, updatedAt: nowIso() };
    return db.teacherAnalyticsSnapshots[idx];
  }
  const created = { ...row, id: `tas-${nanoid(10)}`, createdAt: nowIso(), updatedAt: nowIso() };
  db.teacherAnalyticsSnapshots.unshift(created);
  return created;
}

function syncFlags(db, snapshot, actorId = "SYSTEM") {
  const target = teacherTarget(db, snapshot.teacherUserId, snapshot);
  const generated = buildFlags(snapshot, target);
  const active = new Set();

  for (const entry of generated) {
    active.add(str(entry.flagType));
    const idx = (db.teacherPerformanceFlags || []).findIndex((x) => str(x.teacherUserId) === str(snapshot.teacherUserId) && str(x.sessionId) === str(snapshot.sessionId) && str(x.termId) === str(snapshot.termId) && str(x.flagType) === str(entry.flagType) && !x.isResolved);
    if (idx >= 0) {
      db.teacherPerformanceFlags[idx] = { ...db.teacherPerformanceFlags[idx], ...entry, updatedAt: nowIso() };
    } else {
      db.teacherPerformanceFlags.unshift({
        id: `tpf-${nanoid(10)}`,
        teacherUserId: str(snapshot.teacherUserId),
        sessionId: str(snapshot.sessionId),
        termId: str(snapshot.termId),
        ...entry,
        isResolved: false,
        resolvedBy: "",
        resolvedAt: "",
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
    }
  }

  for (const row of db.teacherPerformanceFlags || []) {
    if (str(row.teacherUserId) !== str(snapshot.teacherUserId)) continue;
    if (str(row.sessionId) !== str(snapshot.sessionId)) continue;
    if (str(row.termId) !== str(snapshot.termId)) continue;
    if (row.isResolved) continue;
    if (active.has(str(row.flagType))) continue;
    row.isResolved = true;
    row.resolvedBy = str(actorId || "SYSTEM");
    row.resolvedAt = nowIso();
    row.updatedAt = nowIso();
  }

  return generated;
}

function addJob(db, jobName, ctx, metadata = {}) {
  const row = {
    id: `aj-${nanoid(10)}`,
    jobName,
    sessionId: str(ctx.sessionId),
    termId: str(ctx.termId),
    status: "running",
    recordsProcessed: 0,
    startedAt: nowIso(),
    completedAt: "",
    errorMessage: "",
    metadata,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  db.analyticsJobsLog.unshift(row);
  return row;
}

router.use(auth());

router.get("/", (req, res) => {
  const db = readDB();
  const changed = ensureCollections(db);
  const ctx = filterContext(db, req.query);

  if (role(req) === "TEACHER") {
    const snapshot = computeSnapshot(db, req.user, ctx);
    const flags = (db.teacherPerformanceFlags || []).filter((x) => str(x.teacherUserId) === str(req.user.id) && str(x.sessionId) === str(ctx.sessionId) && str(x.termId) === str(ctx.termId) && !x.isResolved);
    const notes = (db.teacherFeedbackNotes || []).filter((x) => str(x.teacherUserId) === str(req.user.id) && !["admin_only", "hod_only"].includes(str(x.visibility).toLowerCase()));
    if (changed) writeDB(db);
    return res.json({ mode: "teacher", session: { id: ctx.sessionId, name: ctx.sessionName }, term: { id: ctx.termId, name: ctx.termName }, snapshot, flags, notes });
  }

  if (!canAdminView(req)) {
    if (changed) writeDB(db);
    return res.status(403).json({ message: "Forbidden" });
  }

  const snapshots = computeSnapshots(db, ctx);
  const flags = (db.teacherPerformanceFlags || []).filter((x) => str(x.sessionId) === str(ctx.sessionId) && str(x.termId) === str(ctx.termId) && !x.isResolved);
  const summary = {
    teachersActive: snapshots.filter((x) => num(x.activeDaysCount) > 0).length,
    teachersTotal: snapshots.length,
    averageAttendanceCompliance: snapshots.length ? Number((snapshots.reduce((s, x) => s + num(x.attendanceSubmissionRate), 0) / snapshots.length).toFixed(2)) : 0,
    averageGradingCompletion: snapshots.length ? Number((snapshots.reduce((s, x) => s + num(x.gradingCompletionRate), 0) / snapshots.length).toFixed(2)) : 0,
    averageStudentEngagement: snapshots.length ? Number((snapshots.reduce((s, x) => s + ((num(x.lessonViewRate) + num(x.assignmentSubmissionRate) + num(x.quizParticipationRate)) / 3), 0) / snapshots.length).toFixed(2)) : 0,
    averagePassRate: snapshots.length ? Number((snapshots.reduce((s, x) => s + num(x.classPassRate), 0) / snapshots.length).toFixed(2)) : 0,
    teachersFlagged: new Set(flags.map((x) => str(x.teacherUserId))).size,
  };
  const cards = {
    lowLmsActivity: flags.filter((x) => str(x.flagType) === "low_lms_activity").length,
    overdueGrading: flags.filter((x) => str(x.flagType) === "overdue_grading").length,
    lowAttendance: flags.filter((x) => str(x.flagType) === "low_attendance_compliance").length,
    weakOutcomes: flags.filter((x) => str(x.flagType) === "weak_academic_outcome").length,
  };

  if (changed) writeDB(db);
  return res.json({ mode: "admin", session: { id: ctx.sessionId, name: ctx.sessionName }, term: { id: ctx.termId, name: ctx.termName }, summary, cards });
});

router.get("/metadata", (req, res) => {
  const db = readDB();
  const changed = ensureCollections(db);
  if (!canAdminView(req) && role(req) !== "TEACHER") {
    if (changed) writeDB(db);
    return res.status(403).json({ message: "Forbidden" });
  }

  const sessions = getSessions(db);
  const terms = getTerms(db);
  const sections = Array.from(new Set((db.classes || []).map((row) => sectionFromClass(row)))).sort((a, b) => str(a).localeCompare(str(b)));
  const teachers = (db.users || []).filter((row) => str(row.role).toUpperCase() === "TEACHER").map((row) => ({ id: str(row.id), name: str(row.name), username: str(row.username) })).sort((a, b) => str(a.name).localeCompare(str(b.name)));

  if (changed) writeDB(db);
  return res.json({ sessions, terms, sections, teachers, defaults: TARGET_DEFAULTS });
});

router.post("/jobs/snapshot", requireRole("ADMIN", "HOD", "SECTION_HEAD", "PRINCIPAL", "VICE_PRINCIPAL"), (req, res) => {
  const db = readDB();
  ensureCollections(db);
  const ctx = filterContext(db, req.body || {});
  const teacherUserId = str(req.body?.teacherUserId);

  const job = addJob(db, "nightly_teacher_metrics_snapshot", ctx, { teacherUserId });
  try {
    const snapshots = computeSnapshots(db, ctx, teacherUserId);
    for (const row of snapshots) {
      const saved = upsertSnapshot(db, row);
      db.teacherWorkloadSnapshots = (db.teacherWorkloadSnapshots || []).filter((x) => !(str(x.teacherUserId) === str(saved.teacherUserId) && str(x.sessionId) === str(saved.sessionId) && str(x.termId) === str(saved.termId)));
      db.teacherWorkloadSnapshots.unshift({
        id: `tws-${nanoid(10)}`,
        teacherUserId: str(saved.teacherUserId),
        sessionId: str(saved.sessionId),
        termId: str(saved.termId),
        totalClasses: num(saved.totalClassesAssigned),
        totalSubjects: num(saved.totalSubjectsAssigned),
        totalStudents: num(saved.totalStudentsAssigned),
        totalPeriodsPerWeek: num(saved.totalPeriodsPerWeek),
        pendingAssignmentSubmissions: num(saved.pendingAssignmentSubmissions),
        pendingScoreSheets: num(saved.pendingScoreSheets),
        pendingQuizReviews: num(saved.pendingQuizReviews),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
    }

    job.status = "completed";
    job.recordsProcessed = snapshots.length;
    job.completedAt = nowIso();
    job.updatedAt = nowIso();
    writeDB(db);
    return res.json({ message: "Snapshot job completed.", processed: snapshots.length, job });
  } catch (error) {
    job.status = "failed";
    job.errorMessage = str(error.message || "Failed to run snapshot job");
    job.completedAt = nowIso();
    job.updatedAt = nowIso();
    writeDB(db);
    return res.status(500).json({ message: job.errorMessage });
  }
});

router.post("/jobs/flags", requireRole("ADMIN", "HOD", "SECTION_HEAD", "PRINCIPAL", "VICE_PRINCIPAL"), (req, res) => {
  const db = readDB();
  ensureCollections(db);
  const ctx = filterContext(db, req.body || {});

  const job = addJob(db, "weekly_teacher_flags", ctx, {});
  try {
    const snapshots = computeSnapshots(db, ctx);
    for (const row of snapshots) {
      const saved = upsertSnapshot(db, row);
      syncFlags(db, saved, req.user.id);
    }
    job.status = "completed";
    job.recordsProcessed = snapshots.length;
    job.completedAt = nowIso();
    job.updatedAt = nowIso();
    writeDB(db);
    return res.json({ message: "Flag job completed.", processed: snapshots.length, job });
  } catch (error) {
    job.status = "failed";
    job.errorMessage = str(error.message || "Failed to run flags job");
    job.completedAt = nowIso();
    job.updatedAt = nowIso();
    writeDB(db);
    return res.status(500).json({ message: job.errorMessage });
  }
});

router.get("/dashboard", requireRole("ADMIN", "HOD", "SECTION_HEAD", "PRINCIPAL", "VICE_PRINCIPAL"), (req, res) => {
  const db = readDB();
  const changed = ensureCollections(db);
  const ctx = filterContext(db, req.query);

  const snapshots = computeSnapshots(db, ctx).filter((x) => (ctx.section ? nk(x.section) === nk(ctx.section) : true));
  const flags = (db.teacherPerformanceFlags || []).filter((x) => str(x.sessionId) === str(ctx.sessionId) && str(x.termId) === str(ctx.termId) && !x.isResolved);
  const usersById = new Map((db.users || []).map((row) => [str(row.id), row]));

  const summary = {
    teachersActive: snapshots.filter((x) => num(x.activeDaysCount) > 0).length,
    teachersTotal: snapshots.length,
    averageAttendanceCompliance: snapshots.length ? Number((snapshots.reduce((s, x) => s + num(x.attendanceSubmissionRate), 0) / snapshots.length).toFixed(2)) : 0,
    averageGradingCompletion: snapshots.length ? Number((snapshots.reduce((s, x) => s + num(x.gradingCompletionRate), 0) / snapshots.length).toFixed(2)) : 0,
    averageStudentEngagement: snapshots.length ? Number((snapshots.reduce((s, x) => s + ((num(x.lessonViewRate) + num(x.assignmentSubmissionRate) + num(x.quizParticipationRate)) / 3), 0) / snapshots.length).toFixed(2)) : 0,
    averagePassRate: snapshots.length ? Number((snapshots.reduce((s, x) => s + num(x.classPassRate), 0) / snapshots.length).toFixed(2)) : 0,
    teachersFlagged: new Set(flags.map((x) => str(x.teacherUserId))).size,
  };

  const recentFlags = flags
    .slice()
    .sort((a, b) => str(b.createdAt).localeCompare(str(a.createdAt)))
    .slice(0, 15)
    .map((x) => ({ ...x, teacherName: str(usersById.get(str(x.teacherUserId))?.name) }));

  if (changed) writeDB(db);
  return res.json({ session: ctx, summary, recentFlags });
});

router.get("/teachers", requireRole("ADMIN", "HOD", "SECTION_HEAD", "PRINCIPAL", "VICE_PRINCIPAL"), (req, res) => {
  const db = readDB();
  const changed = ensureCollections(db);
  const ctx = filterContext(db, req.query);

  const search = nk(req.query.search);
  const flagStatus = str(req.query.flagStatus).toLowerCase();

  const snapshots = computeSnapshots(db, ctx);
  const openFlags = (db.teacherPerformanceFlags || []).filter((x) => str(x.sessionId) === str(ctx.sessionId) && str(x.termId) === str(ctx.termId) && !x.isResolved);
  const flagCounts = new Map();
  for (const row of openFlags) {
    const key = str(row.teacherUserId);
    flagCounts.set(key, num(flagCounts.get(key), 0) + 1);
  }

  let rows = snapshots.map((x) => ({
    teacherUserId: str(x.teacherUserId),
    teacherName: str(x.teacherName),
    section: str(x.section),
    lessonsPublished: num(x.lessonsPublished),
    attendanceSubmissionRate: num(x.attendanceSubmissionRate),
    gradingCompletionRate: num(x.gradingCompletionRate),
    engagementRate: Number(((num(x.lessonViewRate) + num(x.assignmentSubmissionRate) + num(x.quizParticipationRate)) / 3).toFixed(2)),
    passRate: num(x.classPassRate),
    flagsCount: num(flagCounts.get(str(x.teacherUserId)), 0),
    lastActiveAt: str(x.lastActiveAt),
    totalClassesAssigned: num(x.totalClassesAssigned),
    totalStudentsAssigned: num(x.totalStudentsAssigned),
  }));

  if (ctx.section) rows = rows.filter((x) => nk(x.section) === nk(ctx.section));
  if (search) rows = rows.filter((x) => nk(x.teacherName).includes(search));
  if (flagStatus === "flagged") rows = rows.filter((x) => num(x.flagsCount) > 0);
  if (flagStatus === "clean") rows = rows.filter((x) => num(x.flagsCount) === 0);

  rows.sort((a, b) => str(a.teacherName).localeCompare(str(b.teacherName)));
  if (changed) writeDB(db);
  return res.json(rows);
});

router.get("/teachers/:teacherUserId", (req, res) => {
  const db = readDB();
  const changed = ensureCollections(db);
  const teacherUserId = str(req.params.teacherUserId);
  if (!teacherUserId) {
    if (changed) writeDB(db);
    return res.status(400).json({ message: "teacherUserId is required" });
  }

  if (role(req) === "TEACHER" && str(req.user.id) !== teacherUserId) {
    if (changed) writeDB(db);
    return res.status(403).json({ message: "Forbidden" });
  }
  if (role(req) !== "TEACHER" && !canAdminView(req)) {
    if (changed) writeDB(db);
    return res.status(403).json({ message: "Forbidden" });
  }

  const teacher = (db.users || []).find((x) => str(x.id) === teacherUserId && str(x.role).toUpperCase() === "TEACHER");
  if (!teacher) {
    if (changed) writeDB(db);
    return res.status(404).json({ message: "Teacher not found" });
  }

  const ctx = filterContext(db, req.query);
  const snapshot = computeSnapshot(db, teacher, ctx);
  const target = teacherTarget(db, teacherUserId, ctx);

  let notes = (db.teacherFeedbackNotes || []).filter((x) => str(x.teacherUserId) === teacherUserId && (!ctx.sessionId || str(x.sessionId) === ctx.sessionId) && (!ctx.termId || str(x.termId) === ctx.termId));
  if (role(req) === "TEACHER") notes = notes.filter((x) => !["admin_only", "hod_only"].includes(str(x.visibility).toLowerCase()));

  const flags = (db.teacherPerformanceFlags || []).filter((x) => str(x.teacherUserId) === teacherUserId && str(x.sessionId) === str(ctx.sessionId) && str(x.termId) === str(ctx.termId)).sort((a, b) => str(b.createdAt).localeCompare(str(a.createdAt)));
  const trends = (db.teacherMetricTrends || []).filter((x) => str(x.teacherUserId) === teacherUserId && str(x.sessionId) === str(ctx.sessionId) && str(x.termId) === str(ctx.termId)).sort((a, b) => str(a.periodStart).localeCompare(str(b.periodStart)));

  if (changed) writeDB(db);
  return res.json({
    teacher: { id: str(teacher.id), name: str(teacher.name), username: str(teacher.username), subjects: Array.isArray(teacher.subjects) ? teacher.subjects : [] },
    session: { id: ctx.sessionId, name: ctx.sessionName },
    term: { id: ctx.termId, name: ctx.termName },
    snapshot,
    target,
    flags,
    notes: notes.sort((a, b) => str(b.createdAt).localeCompare(str(a.createdAt))),
    trends,
  });
});

router.get("/self", requireRole("TEACHER"), (req, res) => {
  const db = readDB();
  const changed = ensureCollections(db);
  const teacher = (db.users || []).find((x) => str(x.id) === str(req.user.id) && str(x.role).toUpperCase() === "TEACHER");
  if (!teacher) {
    if (changed) writeDB(db);
    return res.status(404).json({ message: "Teacher not found" });
  }

  const ctx = filterContext(db, req.query);
  const snapshot = computeSnapshot(db, teacher, ctx);
  const target = teacherTarget(db, teacher.id, ctx);
  const notes = (db.teacherFeedbackNotes || [])
    .filter((x) => str(x.teacherUserId) === str(req.user.id))
    .filter((x) => !["admin_only", "hod_only"].includes(str(x.visibility).toLowerCase()))
    .sort((a, b) => str(b.createdAt).localeCompare(str(a.createdAt)));

  const flags = (db.teacherPerformanceFlags || [])
    .filter((x) => str(x.teacherUserId) === str(req.user.id) && str(x.sessionId) === str(ctx.sessionId) && str(x.termId) === str(ctx.termId))
    .sort((a, b) => str(b.createdAt).localeCompare(str(a.createdAt)));

  const trends = (db.teacherMetricTrends || [])
    .filter((x) => str(x.teacherUserId) === str(req.user.id) && str(x.sessionId) === str(ctx.sessionId) && str(x.termId) === str(ctx.termId))
    .sort((a, b) => str(a.periodStart).localeCompare(str(b.periodStart)));

  if (changed) writeDB(db);
  return res.json({
    teacher: { id: str(teacher.id), name: str(teacher.name), username: str(teacher.username), subjects: Array.isArray(teacher.subjects) ? teacher.subjects : [] },
    session: { id: ctx.sessionId, name: ctx.sessionName },
    term: { id: ctx.termId, name: ctx.termName },
    snapshot,
    target,
    flags,
    notes,
    trends,
  });
});

router.get("/flags", requireRole("ADMIN", "HOD", "SECTION_HEAD", "PRINCIPAL", "VICE_PRINCIPAL"), (req, res) => {
  const db = readDB();
  const changed = ensureCollections(db);
  const ctx = filterContext(db, req.query);

  const teacherUserId = str(req.query.teacherUserId);
  const severity = str(req.query.severity).toLowerCase();
  const status = str(req.query.status).toLowerCase();

  let rows = (db.teacherPerformanceFlags || []).filter((x) => (!ctx.sessionId || str(x.sessionId) === ctx.sessionId) && (!ctx.termId || str(x.termId) === ctx.termId) && (!teacherUserId || str(x.teacherUserId) === teacherUserId));
  if (severity) rows = rows.filter((x) => str(x.severity).toLowerCase() === severity);
  if (status === "open") rows = rows.filter((x) => !x.isResolved);
  if (status === "resolved") rows = rows.filter((x) => Boolean(x.isResolved));

  const usersById = new Map((db.users || []).map((x) => [str(x.id), x]));
  rows = rows.map((x) => ({ ...x, teacherName: str(usersById.get(str(x.teacherUserId))?.name), resolvedByName: str(usersById.get(str(x.resolvedBy))?.name) })).sort((a, b) => str(b.createdAt).localeCompare(str(a.createdAt)));

  if (changed) writeDB(db);
  return res.json(rows);
});

router.patch("/flags/:flagId/resolve", requireRole("ADMIN", "HOD", "SECTION_HEAD", "PRINCIPAL", "VICE_PRINCIPAL"), (req, res) => {
  const db = readDB();
  ensureCollections(db);
  const flagId = str(req.params.flagId);
  const idx = (db.teacherPerformanceFlags || []).findIndex((x) => str(x.id) === flagId);
  if (idx < 0) return res.status(404).json({ message: "Flag not found" });

  db.teacherPerformanceFlags[idx] = {
    ...db.teacherPerformanceFlags[idx],
    isResolved: true,
    resolvedBy: str(req.user.id),
    resolvedAt: nowIso(),
    resolutionNote: req.body?.resolutionNote !== undefined ? str(req.body.resolutionNote) : str(db.teacherPerformanceFlags[idx].resolutionNote),
    updatedAt: nowIso(),
  };

  writeDB(db);
  return res.json(db.teacherPerformanceFlags[idx]);
});

router.get("/notes", (req, res) => {
  const db = readDB();
  const changed = ensureCollections(db);

  let rows = db.teacherFeedbackNotes || [];
  if (str(req.query.teacherUserId)) rows = rows.filter((x) => str(x.teacherUserId) === str(req.query.teacherUserId));
  if (str(req.query.sessionId)) rows = rows.filter((x) => str(x.sessionId) === str(req.query.sessionId));
  if (str(req.query.termId)) rows = rows.filter((x) => str(x.termId) === str(req.query.termId));

  if (role(req) === "TEACHER") {
    rows = rows.filter((x) => str(x.teacherUserId) === str(req.user.id));
    rows = rows.filter((x) => !["admin_only", "hod_only"].includes(str(x.visibility).toLowerCase()));
  } else if (!canAdminView(req)) {
    if (changed) writeDB(db);
    return res.status(403).json({ message: "Forbidden" });
  }

  const usersById = new Map((db.users || []).map((x) => [str(x.id), x]));
  rows = rows.map((x) => ({ ...x, teacherName: str(usersById.get(str(x.teacherUserId))?.name), createdByName: str(usersById.get(str(x.createdBy))?.name) })).sort((a, b) => str(b.createdAt).localeCompare(str(a.createdAt)));

  if (changed) writeDB(db);
  return res.json(rows);
});

router.post("/notes", requireRole("ADMIN", "HOD", "SECTION_HEAD", "PRINCIPAL", "VICE_PRINCIPAL"), (req, res) => {
  const db = readDB();
  ensureCollections(db);

  const teacherUserId = str(req.body?.teacherUserId);
  const title = str(req.body?.title);
  const note = str(req.body?.note);
  if (!teacherUserId || !title || !note) {
    return res.status(400).json({ message: "teacherUserId, title and note are required" });
  }

  const teacher = (db.users || []).find((x) => str(x.id) === teacherUserId && str(x.role).toUpperCase() === "TEACHER");
  if (!teacher) return res.status(400).json({ message: "Invalid teacherUserId" });

  const row = {
    id: `tfn-${nanoid(10)}`,
    teacherUserId,
    sessionId: str(req.body?.sessionId),
    termId: str(req.body?.termId),
    noteType: str(req.body?.noteType || "observation").toLowerCase(),
    title,
    note,
    createdBy: str(req.user.id),
    visibility: str(req.body?.visibility || "admin_only").toLowerCase(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  db.teacherFeedbackNotes.unshift(row);
  writeDB(db);
  return res.status(201).json(row);
});

router.get("/targets", requireRole("ADMIN", "HOD", "SECTION_HEAD", "PRINCIPAL", "VICE_PRINCIPAL"), (req, res) => {
  const db = readDB();
  const changed = ensureCollections(db);
  let rows = db.teacherTargets || [];
  if (str(req.query.teacherUserId)) rows = rows.filter((x) => str(x.teacherUserId) === str(req.query.teacherUserId));
  if (str(req.query.sessionId)) rows = rows.filter((x) => str(x.sessionId) === str(req.query.sessionId));
  if (str(req.query.termId)) rows = rows.filter((x) => str(x.termId) === str(req.query.termId));
  rows = rows.sort((a, b) => str(b.updatedAt || b.createdAt).localeCompare(str(a.updatedAt || a.createdAt)));
  if (changed) writeDB(db);
  return res.json(rows);
});

router.post("/targets", requireRole("ADMIN", "HOD", "SECTION_HEAD", "PRINCIPAL", "VICE_PRINCIPAL"), (req, res) => {
  const db = readDB();
  ensureCollections(db);

  const teacherUserId = str(req.body?.teacherUserId);
  if (!teacherUserId) return res.status(400).json({ message: "teacherUserId is required" });

  const teacher = (db.users || []).find((x) => str(x.id) === teacherUserId && str(x.role).toUpperCase() === "TEACHER");
  if (!teacher) return res.status(400).json({ message: "Invalid teacherUserId" });

  const sessionId = str(req.body?.sessionId);
  const termId = str(req.body?.termId);

  const row = {
    teacherUserId,
    sessionId,
    termId,
    expectedLessons: num(req.body?.expectedLessons, TARGET_DEFAULTS.expectedLessons),
    expectedAssignments: num(req.body?.expectedAssignments, TARGET_DEFAULTS.expectedAssignments),
    expectedQuizzes: num(req.body?.expectedQuizzes, TARGET_DEFAULTS.expectedQuizzes),
    expectedAttendanceRate: num(req.body?.expectedAttendanceRate, TARGET_DEFAULTS.expectedAttendanceRate),
    expectedGradingCompletionRate: num(req.body?.expectedGradingCompletionRate, TARGET_DEFAULTS.expectedGradingCompletionRate),
    expectedMaxGradingDays: num(req.body?.expectedMaxGradingDays, TARGET_DEFAULTS.expectedMaxGradingDays),
    expectedPassRate: num(req.body?.expectedPassRate, TARGET_DEFAULTS.expectedPassRate),
    expectedLessonViewRate: num(req.body?.expectedLessonViewRate, TARGET_DEFAULTS.expectedLessonViewRate),
    expectedAssignmentSubmissionRate: num(req.body?.expectedAssignmentSubmissionRate, TARGET_DEFAULTS.expectedAssignmentSubmissionRate),
    updatedAt: nowIso(),
  };

  const idx = (db.teacherTargets || []).findIndex((x) => str(x.teacherUserId) === teacherUserId && str(x.sessionId) === sessionId && str(x.termId) === termId);
  if (idx >= 0) {
    db.teacherTargets[idx] = { ...db.teacherTargets[idx], ...row };
    writeDB(db);
    return res.json(db.teacherTargets[idx]);
  }

  const created = { id: `ttg-${nanoid(10)}`, ...row, createdAt: nowIso() };
  db.teacherTargets.unshift(created);
  writeDB(db);
  return res.status(201).json(created);
});

function csvCell(value) {
  const safe = String(value == null ? "" : value);
  if (safe.includes(",") || safe.includes("\n") || safe.includes('"')) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

function toCsv(rows, columns) {
  const header = columns.map((col) => csvCell(col.label)).join(",");
  const lines = rows.map((row) => columns.map((col) => csvCell(row[col.key])).join(","));
  return [header, ...lines].join("\n");
}

function pdfEscape(value) {
  return String(value == null ? "" : value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[\r\n]+/g, " ");
}

function padOrTrim(value, width) {
  const text = String(value == null ? "" : value).trim();
  if (text.length === width) return text;
  if (text.length < width) return `${text}${" ".repeat(width - text.length)}`;
  if (width <= 1) return text.slice(0, width);
  return `${text.slice(0, Math.max(0, width - 1))}~`;
}

function tableLines(rows, columns, totalChars = 108) {
  if (!columns.length) return [];

  const baseWidths = columns.map((col) => {
    const labelLen = String(col.label || col.key || "").length;
    let sampleLen = labelLen;
    const sampleRows = rows.slice(0, 40);
    for (const row of sampleRows) {
      const len = String(row?.[col.key] == null ? "" : row[col.key]).length;
      if (len > sampleLen) sampleLen = len;
    }
    return Math.max(6, Math.min(26, sampleLen));
  });

  const sepSpace = (columns.length - 1) * 3;
  let available = Math.max(40, totalChars - sepSpace);
  let sum = baseWidths.reduce((a, b) => a + b, 0);

  let widths = [...baseWidths];
  if (sum > available) {
    const ratio = available / sum;
    widths = widths.map((w) => Math.max(4, Math.floor(w * ratio)));
    sum = widths.reduce((a, b) => a + b, 0);
    while (sum < available) {
      const idx = widths.findIndex((w) => w < 26);
      if (idx < 0) break;
      widths[idx] += 1;
      sum += 1;
    }
  }

  const mk = (row, isHeader = false) =>
    columns
      .map((col, idx) => {
        const v = isHeader ? col.label : row?.[col.key];
        return padOrTrim(v, widths[idx]);
      })
      .join(" | ");

  const head = mk({}, true);
  const dash = widths.map((w) => "-".repeat(w)).join("-+-");
  const body = rows.map((r) => mk(r, false));
  return [head, dash, ...body];
}

function textOp(x, y, font, size, text, color = "0 0 0") {
  return `${color} rg\nBT /${font} ${size} Tf ${x} ${y} Td (${pdfEscape(text)}) Tj ET`;
}

function imageOp(name, x, y, width, height) {
  return `q ${width} 0 0 ${height} ${x} ${y} cm /${name} Do Q`;
}

function asAsciiHex(buffer) {
  if (!buffer || !buffer.length) return ">";
  return `${buffer.toString("hex").toUpperCase()}>`;
}

function parseJpegSize(buffer) {
  if (!buffer || buffer.length < 4) return null;
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;

  let offset = 2;
  while (offset < buffer.length - 1) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    while (offset < buffer.length && buffer[offset] === 0xff) offset += 1;
    if (offset >= buffer.length) break;

    const marker = buffer[offset];
    offset += 1;

    if (marker === 0xd8 || marker === 0xd9) continue;
    if (offset + 1 >= buffer.length) break;

    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) break;

    const isSof =
      marker === 0xc0 || marker === 0xc1 || marker === 0xc2 || marker === 0xc3 ||
      marker === 0xc5 || marker === 0xc6 || marker === 0xc7 || marker === 0xc9 ||
      marker === 0xca || marker === 0xcb || marker === 0xcd || marker === 0xce || marker === 0xcf;

    if (isSof && offset + 7 < buffer.length) {
      const height = buffer.readUInt16BE(offset + 3);
      const width = buffer.readUInt16BE(offset + 5);
      if (width > 0 && height > 0) {
        return { width, height };
      }
    }

    offset += segmentLength;
  }

  return null;
}

function resolveSchoolBranding(db = {}) {
  const schoolProfile = db.schoolProfile && typeof db.schoolProfile === "object" ? db.schoolProfile : {};
  const schoolBranding = db.schoolBranding && typeof db.schoolBranding === "object" ? db.schoolBranding : {};

  return {
    schoolName: str(schoolProfile.schoolName || schoolBranding.schoolName || SCHOOL_NAME),
    schoolAddress: str(schoolProfile.schoolAddress || schoolBranding.schoolAddress || SCHOOL_ADDRESS),
    schoolEmail: str(schoolProfile.schoolEmail || schoolBranding.schoolEmail || SCHOOL_EMAIL),
    schoolPhone: str(schoolProfile.schoolPhone || schoolBranding.schoolPhone || SCHOOL_PHONE),
  };
}

function loadLogoForPdf() {
  if (cachedPdfLogo !== null) return cachedPdfLogo;

  for (const candidate of LOGO_CANDIDATE_PATHS) {
    const safe = str(candidate);
    if (!safe) continue;
    if (!fs.existsSync(safe)) continue;

    try {
      const bytes = fs.readFileSync(safe);
      const size = parseJpegSize(bytes);
      if (!size) continue;

      cachedPdfLogo = {
        name: "Im1",
        width: size.width,
        height: size.height,
        asciiHex: asAsciiHex(bytes),
      };
      return cachedPdfLogo;
    } catch (_) {
      // Try next candidate
    }
  }

  cachedPdfLogo = null;
  return null;
}

function buildPdfBuffer(pageContents, options = {}) {
  const logo = options.logo && options.logo.asciiHex ? options.logo : null;

  const objects = {};
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";
  objects[5] = "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>";

  let nextId = 6;
  let logoObjectId = 0;

  if (logo) {
    logoObjectId = nextId;
    nextId += 1;
    const logoLen = Buffer.byteLength(logo.asciiHex, "utf8");
    objects[logoObjectId] =
      `<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter [/ASCIIHexDecode /DCTDecode] /Length ${logoLen} >>\n` +
      `stream\n${logo.asciiHex}\nendstream`;
  }

  const pageIds = [];
  for (const stream of pageContents) {
    const pageId = nextId;
    const contentId = nextId + 1;
    nextId += 2;
    pageIds.push(pageId);

    const len = Buffer.byteLength(stream, "utf8");
    objects[contentId] = `<< /Length ${len} >>\nstream\n${stream}\nendstream`;

    const xObj = logoObjectId ? ` /XObject << /Im1 ${logoObjectId} 0 R >>` : "";
    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >>${xObj} >> /Contents ${contentId} 0 R >>`;
  }

  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  const maxId = nextId - 1;
  let pdf = "%PDF-1.4\n";
  const offsets = new Array(maxId + 1).fill(0);

  for (let id = 1; id <= maxId; id += 1) {
    offsets[id] = Buffer.byteLength(pdf, "utf8");
    pdf += `${id} 0 obj\n${objects[id] || "<<>>"}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${maxId + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let id = 1; id <= maxId; id += 1) {
    pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}

function buildTeacherAnalyticsPdf({ type, ctx, rows, columns, schoolBranding = {} }) {
  const generatedAt = nowIso();
  const branding = {
    schoolName: str(schoolBranding.schoolName || SCHOOL_NAME),
    schoolAddress: str(schoolBranding.schoolAddress || SCHOOL_ADDRESS),
    schoolEmail: str(schoolBranding.schoolEmail || SCHOOL_EMAIL),
    schoolPhone: str(schoolBranding.schoolPhone || SCHOOL_PHONE),
  };

  const titleByType = {
    teachers: "Teacher Analytics Summary",
    flags: "Teacher Performance Flags",
    teacher: "Teacher Analytics Profile",
  };
  const title = titleByType[type] || "Teacher Analytics Export";
  const logo = loadLogoForPdf();

  const lines = [];
  lines.push(`Session: ${str(ctx.sessionName) || "-"}`);
  lines.push(`Term: ${str(ctx.termName) || "-"}`);
  lines.push(`Generated: ${generatedAt}`);
  lines.push("");

  if (type === "teacher") {
    const row = rows[0] || {};
    const fields = [
      ["Teacher", row.teacherName],
      ["Section", row.section],
      ["Classes Assigned", row.totalClassesAssigned],
      ["Subjects Assigned", row.totalSubjectsAssigned],
      ["Students Assigned", row.totalStudentsAssigned],
      ["Lessons Published", row.lessonsPublished],
      ["Resources Uploaded", row.resourcesUploaded],
      ["Assignments Created", row.assignmentsCreated],
      ["Quizzes Created", row.quizzesCreated],
      ["Attendance Submission Rate", `${num(row.attendanceSubmissionRate).toFixed(2)}%`],
      ["Grading Completion Rate", `${num(row.gradingCompletionRate).toFixed(2)}%`],
      ["Average Assignment Grading Days", num(row.avgAssignmentGradingDays).toFixed(2)],
      ["Lesson View Rate", `${num(row.lessonViewRate).toFixed(2)}%`],
      ["Assignment Submission Rate", `${num(row.assignmentSubmissionRate).toFixed(2)}%`],
      ["Quiz Participation Rate", `${num(row.quizParticipationRate).toFixed(2)}%`],
      ["Class Average Score", num(row.classAverageScore).toFixed(2)],
      ["Class Pass Rate", `${num(row.classPassRate).toFixed(2)}%`],
      ["Class Fail Rate", `${num(row.classFailRate).toFixed(2)}%`],
      ["Login Count", row.loginCount],
      ["Active Days", row.activeDaysCount],
      ["Last Active", row.lastActiveAt],
    ];

    for (const [label, value] of fields) {
      lines.push(`${label}: ${str(value) || "-"}`);
    }
  } else {
    const pdfColumns = type === "flags"
      ? [
          { key: "teacherName", label: "Teacher" },
          { key: "flagType", label: "Flag" },
          { key: "severity", label: "Severity" },
          { key: "metricValue", label: "Value" },
          { key: "thresholdValue", label: "Threshold" },
          { key: "flagMessage", label: "Message" },
        ]
      : [
          { key: "teacherName", label: "Teacher" },
          { key: "section", label: "Section" },
          { key: "totalClassesAssigned", label: "Classes" },
          { key: "totalStudentsAssigned", label: "Students" },
          { key: "lessonsPublished", label: "Lessons" },
          { key: "attendanceSubmissionRate", label: "Attend%" },
          { key: "gradingCompletionRate", label: "Grade%" },
          { key: "classPassRate", label: "Pass%" },
        ];

    const outputRows = rows.map((row) => ({
      ...row,
      attendanceSubmissionRate: `${num(row.attendanceSubmissionRate).toFixed(1)}%`,
      gradingCompletionRate: `${num(row.gradingCompletionRate).toFixed(1)}%`,
      classPassRate: `${num(row.classPassRate).toFixed(1)}%`,
    }));

    lines.push(...tableLines(outputRows, pdfColumns, 106));
  }

  const pageLineCapacity = 42;
  const pageChunks = [];
  for (let i = 0; i < lines.length; i += pageLineCapacity) {
    pageChunks.push(lines.slice(i, i + pageLineCapacity));
  }
  if (pageChunks.length === 0) pageChunks.push(["No records found."]);

  const totalPages = pageChunks.length;
  const streams = pageChunks.map((chunk, idx) => {
    const ops = [];

    ops.push("0.95 0.98 1 rg\n30 735 535 90 re f");
    ops.push("0.11 0.31 0.56 RG\n30 735 535 90 re S");

    const hasLogo = Boolean(logo);
    if (hasLogo) {
      ops.push(imageOp("Im1", 40, 748, 64, 64));
    }

    const x = hasLogo ? 112 : 46;
    ops.push(textOp(x, 808, "F2", 16, branding.schoolName));
    ops.push(textOp(x, 792, "F1", 10, branding.schoolAddress));
    ops.push(textOp(x, 778, "F1", 10, `Email: ${branding.schoolEmail}  |  Phone: ${branding.schoolPhone}`));

    ops.push("0.11 0.31 0.56 rg\n30 710 535 20 re f");
    ops.push(textOp(42, 715, "F2", 11, title, "1 1 1"));

    let y = 688;
    for (const line of chunk) {
      if (!line) {
        y -= 8;
        continue;
      }
      ops.push(textOp(40, y, "F3", 8.5, line));
      y -= 13;
    }

    ops.push("0.55 0.55 0.55 RG\n40 72 m 240 72 l S");
    ops.push("0.55 0.55 0.55 RG\n330 72 m 530 72 l S");
    ops.push(textOp(40, 58, "F1", 9, "Prepared By (Signature)"));
    ops.push(textOp(330, 58, "F1", 9, "Approved By (Signature)"));

    ops.push(textOp(40, 28, "F1", 8.5, `${SCHOOL_REPORT_FOOTER} | Page ${idx + 1} of ${totalPages}`));
    ops.push(textOp(430, 28, "F1", 8.5, dayKey(generatedAt)));

    return ops.join("\n");
  });

  return buildPdfBuffer(streams, { logo });
}
function registerExport(db, req, exportType, ctx, filters = {}) {
  db.teacherAnalyticsExports.unshift({
    id: `tae-${nanoid(10)}`,
    exportedBy: str(req.user.id),
    exportType: str(exportType),
    sessionId: str(ctx.sessionId),
    termId: str(ctx.termId),
    filtersJson: filters,
    filePath: "",
    createdAt: nowIso(),
  });
}

router.get("/exports", requireRole("ADMIN", "HOD", "SECTION_HEAD", "PRINCIPAL", "VICE_PRINCIPAL"), (req, res) => {
  const db = readDB();
  const changed = ensureCollections(db);
  const ctx = filterContext(db, req.query);

  let rows = db.teacherAnalyticsExports || [];
  if (ctx.sessionId) rows = rows.filter((x) => str(x.sessionId) === str(ctx.sessionId));
  if (ctx.termId) rows = rows.filter((x) => str(x.termId) === str(ctx.termId));

  const usersById = new Map((db.users || []).map((x) => [str(x.id), x]));
  rows = rows
    .map((x) => ({
      ...x,
      exportedByName: str(usersById.get(str(x.exportedBy))?.name),
    }))
    .sort((a, b) => str(b.createdAt).localeCompare(str(a.createdAt)));

  if (changed) writeDB(db);
  return res.json(rows);
});

router.get("/export", (req, res) => {
  const db = readDB();
  ensureCollections(db);
  const ctx = filterContext(db, req.query);

  const type = str(req.query.type || "teachers").toLowerCase();
  const format = str(req.query.format || "csv").toLowerCase();

  const isTeacher = role(req) === "TEACHER";
  if (!isTeacher && !canAdminView(req)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  let rows = [];
  let columns = [];

  if (type === "teachers") {
    if (isTeacher) {
      const snapshot = computeSnapshot(db, req.user, ctx);
      rows = [snapshot];
    } else {
      rows = computeSnapshots(db, ctx);
    }

    columns = [
      { key: "teacherName", label: "Teacher" },
      { key: "section", label: "Section" },
      { key: "totalClassesAssigned", label: "Classes" },
      { key: "totalStudentsAssigned", label: "Students" },
      { key: "lessonsPublished", label: "Lessons" },
      { key: "attendanceSubmissionRate", label: "Attendance %" },
      { key: "gradingCompletionRate", label: "Grading %" },
      { key: "lessonViewRate", label: "Lesson View %" },
      { key: "assignmentSubmissionRate", label: "Assignment Submit %" },
      { key: "quizParticipationRate", label: "Quiz Participation %" },
      { key: "classPassRate", label: "Pass %" },
      { key: "lastActiveAt", label: "Last Active" },
    ];
  } else if (type === "flags") {
    rows = (db.teacherPerformanceFlags || []).filter(
      (x) =>
        (!ctx.sessionId || str(x.sessionId) === str(ctx.sessionId)) &&
        (!ctx.termId || str(x.termId) === str(ctx.termId))
    );
    if (isTeacher) rows = rows.filter((x) => str(x.teacherUserId) === str(req.user.id));

    const usersById = new Map((db.users || []).map((x) => [str(x.id), x]));
    rows = rows.map((x) => ({ ...x, teacherName: str(usersById.get(str(x.teacherUserId))?.name) }));

    columns = [
      { key: "teacherName", label: "Teacher" },
      { key: "flagType", label: "Flag Type" },
      { key: "severity", label: "Severity" },
      { key: "sourceMetric", label: "Metric" },
      { key: "metricValue", label: "Value" },
      { key: "thresholdValue", label: "Threshold" },
      { key: "isResolved", label: "Resolved" },
      { key: "createdAt", label: "Created At" },
      { key: "flagMessage", label: "Message" },
    ];
  } else if (type === "teacher") {
    const teacherUserId = isTeacher ? str(req.user.id) : str(req.query.teacherUserId);
    if (!teacherUserId) return res.status(400).json({ message: "teacherUserId is required for teacher export" });

    const teacher = (db.users || []).find((x) => str(x.id) === teacherUserId && str(x.role).toUpperCase() === "TEACHER");
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    const snapshot = computeSnapshot(db, teacher, ctx);
    rows = [snapshot];
    columns = [
      { key: "teacherName", label: "Teacher" },
      { key: "sessionName", label: "Session" },
      { key: "termName", label: "Term" },
      { key: "section", label: "Section" },
      { key: "totalClassesAssigned", label: "Classes" },
      { key: "totalStudentsAssigned", label: "Students" },
      { key: "lessonsPublished", label: "Lessons" },
      { key: "resourcesUploaded", label: "Resources" },
      { key: "assignmentsCreated", label: "Assignments" },
      { key: "quizzesCreated", label: "Quizzes" },
      { key: "attendanceSubmissionRate", label: "Attendance %" },
      { key: "gradingCompletionRate", label: "Grading %" },
      { key: "avgAssignmentGradingDays", label: "Avg Grading Days" },
      { key: "lessonViewRate", label: "Lesson View %" },
      { key: "assignmentSubmissionRate", label: "Assignment Submit %" },
      { key: "quizParticipationRate", label: "Quiz Participation %" },
      { key: "classAverageScore", label: "Class Avg Score" },
      { key: "classPassRate", label: "Pass %" },
      { key: "classFailRate", label: "Fail %" },
      { key: "activeDaysCount", label: "Active Days" },
      { key: "lastActiveAt", label: "Last Active" },
    ];
  } else {
    return res.status(400).json({ message: "Invalid export type" });
  }

  registerExport(db, req, type, ctx, {
    format,
    type,
    sessionId: ctx.sessionId,
    termId: ctx.termId,
    section: ctx.section,
    search: str(req.query.search),
    teacherUserId: str(req.query.teacherUserId),
  });
  writeDB(db);

  if (format === "json") {
    return res.json({ type, session: ctx.sessionName, term: ctx.termName, rows });
  }

  if (format === "pdf") {
    const pdf = buildTeacherAnalyticsPdf({ type, ctx, rows, columns, schoolBranding: resolveSchoolBranding(db) });
    const fileName = `teacher-analytics-${type}-${dayKey(nowIso())}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    return res.status(200).send(pdf);
  }

  if (format !== "csv") {
    return res.status(400).json({ message: "Invalid export format. Use csv, pdf, or json." });
  }

  const csv = toCsv(rows, columns);
  const fileName = `teacher-analytics-${type}-${dayKey(nowIso())}.csv`;
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  return res.status(200).send(csv);
});

module.exports = router;


