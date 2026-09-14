const express = require("express");
const { nanoid } = require("nanoid");
const { auth, requireRole } = require("../middleware/auth");
const { readDB, writeDB } = require("../lib/jsonStore");
const { DEFAULT_CLASSES } = require("../lib/defaultClasses");
const { SUBJECT_OPTIONS, getSubjectsForClassName, normalizeSubject } = require("../lib/subjects");
const { ensureAcademicScope } = require("../lib/academicScope");
const {
  ensureAcademicSystemShape,
  sortAcademicClasses,
  supportsNigerianCA,
  getClassCapabilitySummary,
} = require("../lib/academicSystems");

const router = express.Router();

const CURRENT_TERM = String(process.env.CURRENT_TERM || "First Term");
const CURRENT_SESSION = String(process.env.CURRENT_SESSION || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`);
const TERMS = ["First Term", "Second Term", "Third Term"];
const ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);
const REVIEW_ROLES = new Set(["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER"]);

function s(value) {
  return String(value || "").trim();
}

function key(value) {
  return s(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function nowIso() {
  return new Date().toISOString();
}

function num(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nullableScore(value) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundScore(value) {
  return Number(Number(value || 0).toFixed(2));
}

function roleOf(user) {
  return s(user?.originalRole || user?.role).toUpperCase();
}

function isAdmin(user) {
  return ADMIN_ROLES.has(roleOf(user));
}

function canReview(user) {
  return REVIEW_ROLES.has(roleOf(user));
}

function classIdFromName(name) {
  return s(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function inferSectionFromClassName(name) {
  const safe = key(name);
  if (safe.includes("creche") || safe.includes("nursery") || safe.includes("reception") || safe.includes("playgroup")) return "Early Years";
  if (safe.includes("basic") || safe.includes("primary")) return "Basic School";
  if (safe.includes("jss") || safe.includes("junior")) return "Junior Secondary";
  if (safe.includes("ss") || safe.includes("sss") || safe.includes("senior")) return "Senior Secondary";
  return "General";
}

function sortByName(rows) {
  return [...(Array.isArray(rows) ? rows : [])].sort((a, b) => s(a.name || a.studentName).localeCompare(s(b.name || b.studentName)));
}

function ensureAcademicMeta(db) {
  let mutated = false;

  if (!Array.isArray(db.academicSessions)) {
    db.academicSessions = [];
    mutated = true;
  }
  if (!Array.isArray(db.terms)) {
    db.terms = [];
    mutated = true;
  }
  if (!Array.isArray(db.classes)) {
    db.classes = [];
    mutated = true;
  }

  const scope = ensureAcademicScope(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });
  const session = scope.activeSession || db.academicSessions.find((item) => item.isActive) || db.academicSessions[0] || null;
  mutated = true;

  TERMS.forEach((termName, index) => {
    const exists = db.terms.some((item) => s(item.sessionId) === s(session.id) && key(item.termName) === key(termName));
    if (exists) return;
    db.terms.push({
      id: `${session.id}-term-${index + 1}`,
      sessionId: session.id,
      termName,
      position: index + 1,
      isActive: key(termName) === key(CURRENT_TERM),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    mutated = true;
  });

  const existingClasses = new Set(db.classes.map((item) => key(item.name)));
  DEFAULT_CLASSES.forEach((item) => {
    const classKey = key(item.name);
    if (existingClasses.has(classKey)) return;
    db.classes.push({
      id: classIdFromName(item.name),
      name: item.name,
      section: item.section || inferSectionFromClassName(item.name),
      order: Number(item.order || 999),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    existingClasses.add(classKey);
    mutated = true;
  });

  const classShapeBefore = JSON.stringify(db.classes || []);
  ensureAcademicSystemShape(db);
  if (classShapeBefore !== JSON.stringify(db.classes || [])) mutated = true;

  return mutated;
}

function ensureCollections(db) {
  let mutated = ensureAcademicMeta(db);
  [
    "continuousAssessments",
    "assessmentSettings",
    "continuousAssessmentGradingScales",
    "resultApprovals",
    "resultPublicationStatus",
    "results",
    "reports",
    "termResultSummaries",
  ].forEach((name) => {
    if (!Array.isArray(db[name])) {
      db[name] = [];
      mutated = true;
    }
  });

  if (db.assessmentSettings.length === 0) {
    db.assessmentSettings.push({
      id: "aset-default",
      classId: "",
      classLevel: "Default",
      ca1Max: 10,
      ca2Max: 10,
      ca3Max: 10,
      examMax: 70,
      totalMax: 100,
      carryForwardMode: "SCALED_TERM_TOTAL",
      isDefault: true,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    mutated = true;
  }

  if (db.continuousAssessmentGradingScales.length === 0) {
    [
      ["A", 70, 100, "Excellent"],
      ["B", 60, 69.99, "Very Good"],
      ["C", 50, 59.99, "Good"],
      ["D", 45, 49.99, "Fair"],
      ["E", 40, 44.99, "Pass"],
      ["F", 0, 39.99, "Fail"],
    ].forEach(([grade, minScore, maxScore, remark]) => {
      db.continuousAssessmentGradingScales.push({
        id: `cags-${nanoid(8)}`,
        grade,
        minScore,
        maxScore,
        remark,
        isActive: true,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
    });
    mutated = true;
  }

  return mutated;
}

function writeIfNeeded(db, mutated) {
  if (mutated) writeDB(db);
}

function classes(db) {
  return sortAcademicClasses(db.classes || []);
}

function activeClasses(db) {
  return classes(db).filter((item) => item.isActive !== false && supportsNigerianCA(item));
}

function findClass(db, value) {
  const raw = s(value);
  if (!raw) return null;
  return classes(db).find((item) => s(item.id) === raw || key(item.name) === key(raw)) || null;
}

function findSession(db, value) {
  const raw = s(value);
  if (!raw) return (db.academicSessions || []).find((item) => item.isActive) || db.academicSessions[0] || null;
  return (db.academicSessions || []).find((item) => s(item.id) === raw || key(item.sessionName) === key(raw)) || null;
}

function findTerm(db, value, sessionId = "") {
  const raw = s(value);
  const terms = (db.terms || []).filter((item) => !sessionId || s(item.sessionId) === s(sessionId));
  if (!raw) return terms.find((item) => item.isActive) || terms[0] || null;
  return terms.find((item) => s(item.id) === raw || key(item.termName) === key(raw)) || null;
}

function termIndex(termName) {
  const idx = TERMS.findIndex((item) => key(item) === key(termName));
  return idx >= 0 ? idx + 1 : 0;
}

function activeStudentsForClass(db, classId, className = "") {
  const classKey = key(className);
  return sortByName((db.students || []).filter((student) => {
    const archived = Boolean(student.isArchived || key(student.status) === "archived");
    if (archived) return false;
    if (s(classId) && s(student.classId) === s(classId)) return true;
    return classKey && key(student.className) === classKey;
  }));
}

function subjectAllowedForTeacher(user, subject) {
  if (!user || roleOf(user) !== "TEACHER") return true;
  const normalized = normalizeSubject(subject);
  const assigned = (user.subjects || []).map((item) => normalizeSubject(item)).filter(Boolean);
  return normalized && assigned.includes(normalized);
}

function resolveSetting(db, cls) {
  const rows = db.assessmentSettings || [];
  const byClass = rows.find((item) => s(item.classId) && s(item.classId) === s(cls?.id));
  if (byClass) return byClass;

  const sectionKey = key(cls?.section || inferSectionFromClassName(cls?.name));
  const byLevel = rows.find((item) => key(item.classLevel) && key(item.classLevel) === sectionKey);
  if (byLevel) return byLevel;

  return rows.find((item) => item.isDefault) || rows[0] || {
    ca1Max: 10,
    ca2Max: 10,
    ca3Max: 10,
    examMax: 70,
    totalMax: 100,
  };
}

function gradeFor(db, totalScore) {
  const value = Number(totalScore || 0);
  const scale = (db.continuousAssessmentGradingScales || [])
    .filter((item) => item.isActive !== false)
    .sort((a, b) => Number(b.minScore || 0) - Number(a.minScore || 0))
    .find((item) => value >= Number(item.minScore || 0) && value <= Number(item.maxScore || 0));
  return {
    grade: s(scale?.grade || "F"),
    remark: s(scale?.remark || "Fail"),
  };
}

function assessmentKeyOf(row) {
  return [
    s(row.studentId),
    normalizeSubject(row.subject) || s(row.subject),
    s(row.classId),
    s(row.sessionId || row.academicSessionId || row.sessionName || row.academicSession || row.session),
    s(row.termId || row.termName || row.term),
  ].join("::").toLowerCase();
}

function findAssessment(db, input, ignoreId = "") {
  const inputKey = assessmentKeyOf(input);
  return (db.continuousAssessments || []).find((row) => {
    if (ignoreId && s(row.id) === s(ignoreId)) return false;
    return assessmentKeyOf(row) === inputKey;
  }) || null;
}

function previousApprovedRecord(db, { studentId, subject, sessionId, sessionName }, termName) {
  return (db.continuousAssessments || [])
    .filter((row) => {
      if (s(row.studentId) !== s(studentId)) return false;
      if ((normalizeSubject(row.subject) || s(row.subject)) !== (normalizeSubject(subject) || s(subject))) return false;
      if (s(row.sessionId) && s(sessionId) && s(row.sessionId) !== s(sessionId)) return false;
      if (!s(row.sessionId) && s(row.sessionName || row.academicSession || row.session) !== s(sessionName)) return false;
      if (key(row.termName || row.term) !== key(termName)) return false;
      return s(row.approvalStatus).toUpperCase() === "APPROVED";
    })
    .sort((a, b) => s(b.updatedAt || b.createdAt).localeCompare(s(a.updatedAt || a.createdAt)))[0] || null;
}

function carryForwardScore(sourceRecord, targetMax) {
  if (!sourceRecord) return { value: null, sourceRecordId: "", missing: true };
  const sourceTotal = Number(sourceRecord.totalScore || sourceRecord.score || 0);
  const sourceMax = Number(sourceRecord.settingsSnapshot?.totalMax || sourceRecord.totalMax || 100);
  const value = sourceMax > 0 ? roundScore((sourceTotal / sourceMax) * Number(targetMax || 0)) : 0;
  return { value, sourceRecordId: s(sourceRecord.id), missing: false };
}

function validateScore(errors, label, value, max, required) {
  if (value === null || value === undefined) {
    if (required) errors.push(`${label} is required`);
    return;
  }
  if (value < 0 || value > Number(max || 0)) {
    errors.push(`${label} must be between 0 and ${max}`);
  }
}

function buildAssessmentPayload(db, base, input, actor, { submit = false } = {}) {
  const cls = findClass(db, input.classId || input.className || base?.classId || base?.className);
  if (!cls) throw new Error("Class is required");
  if (!supportsNigerianCA(cls)) {
    const err = new Error("Early Years classes use EYFS AMES developmental assessment, not Nigerian continuous assessment scores.");
    err.status = 400;
    throw err;
  }

  const session = findSession(db, input.sessionId || input.academicSessionId || input.sessionName || input.session || base?.sessionId || base?.sessionName);
  if (!session) throw new Error("Academic session is required");

  const term = findTerm(db, input.termId || input.termName || input.term || base?.termId || base?.termName, session.id);
  if (!term) throw new Error("Term is required");

  const subject = normalizeSubject(input.subject || input.subjectName || base?.subject) || s(input.subject || base?.subject);
  if (!subject) throw new Error("Subject is required");

  const studentId = s(input.studentId || base?.studentId);
  const student = (db.students || []).find((item) => s(item.id) === studentId);
  if (!student) throw new Error("Student is required");

  const settings = resolveSetting(db, cls);
  const idx = termIndex(term.termName);
  const required = Boolean(submit);

  let ca1 = nullableScore(input.ca1 ?? base?.ca1);
  let ca2 = nullableScore(input.ca2 ?? base?.ca2);
  let ca3 = nullableScore(input.ca3 ?? base?.ca3);
  const examScore = nullableScore(input.examScore ?? input.exam ?? base?.examScore);

  const first = previousApprovedRecord(db, { studentId, subject, sessionId: session.id, sessionName: session.sessionName }, "First Term");
  const second = previousApprovedRecord(db, { studentId, subject, sessionId: session.id, sessionName: session.sessionName }, "Second Term");

  const carry = {
    ca2Source: "MANUAL",
    ca2SourceRecordId: "",
    ca3Source: "MANUAL",
    ca3SourceRecordId: "",
    missing: [],
  };

  if (idx === 2) {
    const carried = carryForwardScore(first, settings.ca3Max);
    ca3 = carried.value;
    carry.ca3Source = "FIRST_TERM_AVERAGE";
    carry.ca3SourceRecordId = carried.sourceRecordId;
    if (carried.missing) carry.missing.push("First Term carried-forward CA3");
  }

  if (idx === 3) {
    const firstCarry = carryForwardScore(first, settings.ca2Max);
    const secondCarry = carryForwardScore(second, settings.ca3Max);
    ca2 = firstCarry.value;
    ca3 = secondCarry.value;
    carry.ca2Source = "FIRST_TERM_AVERAGE";
    carry.ca2SourceRecordId = firstCarry.sourceRecordId;
    carry.ca3Source = "SECOND_TERM_AVERAGE";
    carry.ca3SourceRecordId = secondCarry.sourceRecordId;
    if (firstCarry.missing) carry.missing.push("First Term carried-forward CA2");
    if (secondCarry.missing) carry.missing.push("Second Term carried-forward CA3");
  }

  const errors = [];
  validateScore(errors, "CA1", ca1, settings.ca1Max, required);
  validateScore(errors, "CA2", ca2, settings.ca2Max, required);
  validateScore(errors, "CA3", ca3, settings.ca3Max, required);
  validateScore(errors, "Exam score", examScore, settings.examMax, required);
  if (required && carry.missing.length) errors.push(`Missing ${carry.missing.join(", ")}`);
  if (errors.length) {
    const err = new Error(errors.join("; "));
    err.status = 400;
    throw err;
  }

  const totalScore = roundScore(Number(ca1 || 0) + Number(ca2 || 0) + Number(ca3 || 0) + Number(examScore || 0));
  if (totalScore > Number(settings.totalMax || 100)) {
    const err = new Error(`Total score cannot exceed ${settings.totalMax}`);
    err.status = 400;
    throw err;
  }

  const grade = gradeFor(db, totalScore);
  const now = nowIso();

  return {
    academicSession: s(session.sessionName),
    session: s(session.sessionName),
    sessionId: s(session.id),
    sessionName: s(session.sessionName),
    term: s(term.termName),
    termId: s(term.id),
    termName: s(term.termName),
    classId: s(cls.id),
    className: s(cls.name),
    arm: s(input.arm || input.section || base?.arm || cls.section),
    section: s(input.arm || input.section || base?.section || cls.section),
    subject,
    studentId,
    studentName: s(student.name),
    ca1,
    ca2,
    ca3,
    examScore,
    score: totalScore,
    totalScore,
    totalMax: Number(settings.totalMax || 100),
    grade: grade.grade,
    teacherRemark: s(input.teacherRemark ?? input.remark ?? base?.teacherRemark ?? grade.remark),
    approvalStatus: submit ? "SUBMITTED" : s(base?.approvalStatus || "DRAFT").toUpperCase() === "REJECTED" ? "DRAFT" : s(base?.approvalStatus || "DRAFT").toUpperCase(),
    isLocked: Boolean(base?.isLocked) && s(base?.approvalStatus).toUpperCase() === "APPROVED",
    isPublished: Boolean(base?.isPublished),
    ca1Source: "MANUAL",
    ca2Source: carry.ca2Source,
    ca3Source: carry.ca3Source,
    ca2SourceRecordId: carry.ca2SourceRecordId,
    ca3SourceRecordId: carry.ca3SourceRecordId,
    settingsSnapshot: {
      ca1Max: Number(settings.ca1Max || 10),
      ca2Max: Number(settings.ca2Max || 10),
      ca3Max: Number(settings.ca3Max || 10),
      examMax: Number(settings.examMax || 70),
      totalMax: Number(settings.totalMax || 100),
    },
    updatedBy: s(actor?.id),
    updatedByName: s(actor?.name || actor?.username),
    updatedAt: now,
  };
}

function syncLegacyResult(db, record, publishedOverride = null) {
  const isPublished = publishedOverride === null ? Boolean(record.isPublished) : Boolean(publishedOverride);
  const payload = {
    studentId: s(record.studentId),
    studentName: s(record.studentName),
    session: s(record.sessionName || record.academicSession || record.session),
    term: s(record.termName || record.term),
    subject: s(record.subject),
    score: Number(record.totalScore || 0),
    ca1: record.ca1,
    ca2: record.ca2,
    ca3: record.ca3,
    examScore: record.examScore,
    totalScore: Number(record.totalScore || 0),
    grade: s(record.grade),
    teacherRemark: s(record.teacherRemark),
    positionInSubject: Number(record.positionInSubject || 0),
    classAverage: record.classAverage == null ? null : Number(record.classAverage),
    firstTermAverage: record.firstTermAverage == null ? null : Number(record.firstTermAverage),
    secondTermAverage: record.secondTermAverage == null ? null : Number(record.secondTermAverage),
    annualCumulativeAverage: record.annualCumulativeAverage == null ? null : Number(record.annualCumulativeAverage),
    approvalStatus: s(record.approvalStatus),
    isPublished,
    source: "continuous_assessment",
    continuousAssessmentId: s(record.id),
    updatedAt: nowIso(),
  };

  const existingIdx = (db.results || []).findIndex((item) => {
    if (s(item.continuousAssessmentId) === s(record.id)) return true;
    return s(item.source) === "continuous_assessment" && assessmentKeyOf(item) === assessmentKeyOf(record);
  });

  if (existingIdx >= 0) {
    db.results[existingIdx] = {
      ...db.results[existingIdx],
      ...payload,
      id: db.results[existingIdx].id,
      createdAt: db.results[existingIdx].createdAt || nowIso(),
    };
    return db.results[existingIdx];
  }

  const row = {
    id: `res-ca-${nanoid(10)}`,
    ...payload,
    createdAt: nowIso(),
  };
  db.results.unshift(row);
  return row;
}

function recalculateSubjectStats(db, { classId, sessionId, termId, subject }) {
  const rows = (db.continuousAssessments || [])
    .filter((item) => s(item.classId) === s(classId) && s(item.sessionId) === s(sessionId) && s(item.termId) === s(termId))
    .filter((item) => (normalizeSubject(item.subject) || s(item.subject)) === (normalizeSubject(subject) || s(subject)))
    .filter((item) => s(item.approvalStatus).toUpperCase() === "APPROVED");

  const avg = rows.length ? roundScore(rows.reduce((sum, item) => sum + Number(item.totalScore || 0), 0) / rows.length) : null;
  const ranked = [...rows].sort((a, b) => Number(b.totalScore || 0) - Number(a.totalScore || 0) || s(a.studentName).localeCompare(s(b.studentName)));

  let lastScore = null;
  let lastRank = 0;
  ranked.forEach((row, index) => {
    const score = Number(row.totalScore || 0);
    if (lastScore === null || score !== lastScore) {
      lastRank = index + 1;
      lastScore = score;
    }
    row.positionInSubject = lastRank;
    row.classAverage = avg;
    row.updatedAt = nowIso();
    syncLegacyResult(db, row);
  });
}

function recalculateCumulativeFields(db, classId, sessionId) {
  const rows = (db.continuousAssessments || [])
    .filter((item) => s(item.classId) === s(classId) && s(item.sessionId) === s(sessionId))
    .filter((item) => s(item.approvalStatus).toUpperCase() === "APPROVED");

  const byStudentSubject = new Map();
  rows.forEach((row) => {
    const mapKey = `${s(row.studentId)}::${normalizeSubject(row.subject) || s(row.subject)}`;
    if (!byStudentSubject.has(mapKey)) byStudentSubject.set(mapKey, []);
    byStudentSubject.get(mapKey).push(row);
  });

  for (const groupRows of byStudentSubject.values()) {
    const first = groupRows.find((row) => termIndex(row.termName || row.term) === 1);
    const second = groupRows.find((row) => termIndex(row.termName || row.term) === 2);
    const third = groupRows.find((row) => termIndex(row.termName || row.term) === 3);
    const values = [first, second, third].filter(Boolean).map((row) => Number(row.totalScore || 0));
    const annual = values.length ? roundScore(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
    groupRows.forEach((row) => {
      row.firstTermAverage = first ? Number(first.totalScore || 0) : null;
      row.secondTermAverage = second ? Number(second.totalScore || 0) : null;
      row.annualCumulativeAverage = annual;
      row.updatedAt = nowIso();
      syncLegacyResult(db, row);
    });
  }
}

function updateTermSummaries(db, { classId, className, sessionId, sessionName, termId, termName }) {
  const approved = (db.continuousAssessments || [])
    .filter((item) => s(item.classId) === s(classId) && s(item.sessionId) === s(sessionId) && s(item.termId) === s(termId))
    .filter((item) => s(item.approvalStatus).toUpperCase() === "APPROVED");

  const byStudent = new Map();
  approved.forEach((row) => {
    const sid = s(row.studentId);
    if (!byStudent.has(sid)) byStudent.set(sid, []);
    byStudent.get(sid).push(row);
  });

  const touched = [];
  for (const [studentId, rows] of byStudent.entries()) {
    const totalSubjects = rows.length;
    const totalScoreAllSubjects = rows.reduce((sum, row) => sum + Number(row.totalScore || 0), 0);
    const averageScore = totalSubjects ? roundScore(totalScoreAllSubjects / totalSubjects) : 0;
    const grade = gradeFor(db, averageScore);
    const termNo = termIndex(termName);

    const next = {
      classId: s(classId),
      className: s(className),
      sessionId: s(sessionId),
      sessionName: s(sessionName),
      termId: s(termId),
      termName: s(termName),
      studentUserId: studentId,
      studentId,
      totalSubjects,
      totalScoreAllSubjects: roundScore(totalScoreAllSubjects),
      averageScore,
      overallGrade: grade.grade,
      overallPosition: 0,
      promotionStatus: termNo === 3 ? (averageScore >= 50 ? "PROMOTED" : "NOT_PROMOTED") : "PENDING",
      updatedAt: nowIso(),
    };

    const idx = (db.termResultSummaries || []).findIndex(
      (item) => s(item.studentUserId || item.studentId) === studentId && s(item.classId) === s(classId) && s(item.sessionId) === s(sessionId) && s(item.termId) === s(termId)
    );

    if (idx >= 0) {
      db.termResultSummaries[idx] = {
        ...db.termResultSummaries[idx],
        ...next,
        id: db.termResultSummaries[idx].id,
        createdAt: db.termResultSummaries[idx].createdAt || nowIso(),
      };
      touched.push(db.termResultSummaries[idx]);
    } else {
      const row = { id: `tsum-ca-${nanoid(10)}`, ...next, classTeacherComment: "", principalComment: "", isPublished: false, createdAt: nowIso() };
      db.termResultSummaries.push(row);
      touched.push(row);
    }
  }

  const studentMap = new Map((db.students || []).map((item) => [s(item.id), s(item.name)]));
  const ranked = [...touched].sort((a, b) => Number(b.averageScore || 0) - Number(a.averageScore || 0) || s(studentMap.get(s(a.studentUserId || a.studentId))).localeCompare(s(studentMap.get(s(b.studentUserId || b.studentId)))));
  let lastAvg = null;
  let lastRank = 0;
  ranked.forEach((row, index) => {
    const avg = Number(row.averageScore || 0);
    if (lastAvg === null || avg !== lastAvg) {
      lastRank = index + 1;
      lastAvg = avg;
    }
    row.overallPosition = lastRank;
    row.updatedAt = nowIso();
  });

  return touched;
}

function publicationKey({ classId, sessionId, termId }) {
  return `${s(classId)}::${s(sessionId)}::${s(termId)}`;
}

function expectedSubjectsForClass(cls, db, sessionId, termId) {
  const catalog = getSubjectsForClassName(cls?.name) || [];
  if (catalog.length) return catalog.map((item) => normalizeSubject(item) || s(item)).filter(Boolean);
  const fromOfferings = (db.classSubjectOfferings || [])
    .filter((item) => s(item.classId) === s(cls?.id) && (!sessionId || s(item.sessionId) === s(sessionId)) && (!termId || s(item.termId) === s(termId)))
    .map((item) => normalizeSubject(item.subject) || s(item.subject))
    .filter(Boolean);
  return Array.from(new Set(fromOfferings.length ? fromOfferings : SUBJECT_OPTIONS));
}

router.get("/metadata", auth(), requireRole("ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER", "TEACHER"), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);
  writeIfNeeded(db, mutated);

  return res.json({
    classes: activeClasses(db).map((item) => ({
      id: s(item.id),
      name: s(item.name),
      section: s(item.section || inferSectionFromClassName(item.name)),
      order: Number(item.order || item.displayOrder || 999),
      academicSystem: s(item.academicSystem),
      curriculumFramework: s(item.curriculumFramework),
      assessmentFramework: s(item.assessmentFramework),
      capabilities: getClassCapabilitySummary(item),
    })),
    sessions: db.academicSessions || [],
    terms: db.terms || [],
    subjects: SUBJECT_OPTIONS,
    classSubjects: Object.fromEntries(activeClasses(db).map((cls) => [cls.name, getSubjectsForClassName(cls.name)])),
    students: (db.students || []).map((item) => ({ id: s(item.id), name: s(item.name), classId: s(item.classId), className: s(item.className), isArchived: Boolean(item.isArchived || key(item.status) === "archived") })),
    settings: db.assessmentSettings || [],
    gradingScales: db.continuousAssessmentGradingScales || [],
    publicationStatus: db.resultPublicationStatus || [],
  });
});

router.get("/entry", auth(), requireRole("ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER", "TEACHER"), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);
  const cls = findClass(db, req.query.classId || req.query.className);
  const session = findSession(db, req.query.sessionId || req.query.sessionName);
  const term = findTerm(db, req.query.termId || req.query.termName, session?.id);
  const subject = normalizeSubject(req.query.subject) || s(req.query.subject);

  if (!cls || !session || !term || !subject) {
    writeIfNeeded(db, mutated);
    return res.status(400).json({ message: "classId, sessionId, termId and subject are required" });
  }

  if (!supportsNigerianCA(cls)) {
    writeIfNeeded(db, mutated);
    return res.status(400).json({ message: "Early Years classes use EYFS AMES developmental assessment, not Nigerian continuous assessment scores." });
  }

  if (!subjectAllowedForTeacher(req.user, subject)) {
    writeIfNeeded(db, mutated);
    return res.status(403).json({ message: "You can only enter scores for your assigned subject." });
  }

  const setting = resolveSetting(db, cls);
  const rows = activeStudentsForClass(db, cls.id, cls.name).map((student) => {
    const existing = findAssessment(db, {
      studentId: student.id,
      subject,
      classId: cls.id,
      sessionId: session.id,
      termId: term.id,
    });

    const draft = buildAssessmentPayload(db, existing || {}, {
      studentId: student.id,
      subject,
      classId: cls.id,
      sessionId: session.id,
      termId: term.id,
    }, req.user, { submit: false });

    return {
      ...draft,
      ...(existing || {}),
      studentName: s(student.name),
      canEdit: !existing?.isLocked && s(existing?.approvalStatus).toUpperCase() !== "APPROVED",
    };
  });

  writeIfNeeded(db, mutated);
  return res.json({ class: cls, session, term, subject, settings: setting, rows });
});

router.post("/entry", auth(), requireRole("ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER", "TEACHER"), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);
  const action = key(req.body?.action || "draft");
  const submit = action === "submit";
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
  if (rows.length === 0) return res.status(400).json({ message: "rows is required" });

  const saved = [];
  const errors = [];

  rows.forEach((row, index) => {
    try {
      const subject = normalizeSubject(row.subject || req.body?.subject) || s(row.subject || req.body?.subject);
      if (!subjectAllowedForTeacher(req.user, subject)) {
        throw new Error("You can only enter scores for your assigned subject.");
      }

      const existing = findAssessment(db, {
        studentId: row.studentId,
        subject,
        classId: row.classId || req.body?.classId,
        sessionId: row.sessionId || req.body?.sessionId,
        sessionName: row.sessionName || req.body?.sessionName,
        termId: row.termId || req.body?.termId,
        termName: row.termName || req.body?.termName,
      });

      if (existing && (existing.isLocked || s(existing.approvalStatus).toUpperCase() === "APPROVED") && !isAdmin(req.user)) {
        throw new Error("Approved result is locked. Ask Super Admin to unlock it before editing.");
      }

      const payload = buildAssessmentPayload(db, existing || {}, {
        ...row,
        subject,
        classId: row.classId || req.body?.classId,
        className: row.className || req.body?.className,
        sessionId: row.sessionId || req.body?.sessionId,
        sessionName: row.sessionName || req.body?.sessionName,
        termId: row.termId || req.body?.termId,
        termName: row.termName || req.body?.termName,
      }, req.user, { submit });

      const duplicate = findAssessment(db, payload, existing?.id);
      if (duplicate) throw new Error("Duplicate assessment record already exists.");

      if (existing) {
        const idx = db.continuousAssessments.findIndex((item) => s(item.id) === s(existing.id));
        db.continuousAssessments[idx] = {
          ...existing,
          ...payload,
          id: existing.id,
          createdAt: existing.createdAt || nowIso(),
          createdBy: existing.createdBy || s(req.user.id),
          createdByName: existing.createdByName || s(req.user.name || req.user.username),
          submittedAt: submit ? nowIso() : existing.submittedAt,
          submittedBy: submit ? s(req.user.id) : existing.submittedBy,
          isLocked: false,
          isPublished: false,
        };
        saved.push(db.continuousAssessments[idx]);
      } else {
        const next = {
          id: `ca-${nanoid(11)}`,
          ...payload,
          createdBy: s(req.user.id),
          createdByName: s(req.user.name || req.user.username),
          createdAt: nowIso(),
          submittedAt: submit ? nowIso() : "",
          submittedBy: submit ? s(req.user.id) : "",
          approvedAt: "",
          approvedBy: "",
          rejectedAt: "",
          rejectedBy: "",
          correctionNote: "",
          isLocked: false,
          isPublished: false,
        };
        db.continuousAssessments.unshift(next);
        saved.push(next);
      }
    } catch (error) {
      errors.push(`Row ${index + 1}: ${error.message}`);
    }
  });

  if (submit && saved.length) {
    db.resultApprovals.unshift({
      id: `rapp-ca-${nanoid(10)}`,
      resultType: "continuous_assessment",
      referenceId: saved.map((item) => s(item.id)).join(","),
      approvalStatus: "PENDING",
      notes: s(req.body?.notes),
      approvedBy: "",
      approvedAt: "",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
  }

  writeDB(db);
  const status = errors.length && saved.length ? 207 : errors.length ? 400 : 200;
  return res.status(status).json({ saved, errors });
});

router.get("/records", auth(), requireRole("ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER", "TEACHER"), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);

  let rows = [...(db.continuousAssessments || [])];
  if (s(req.query.classId)) rows = rows.filter((item) => s(item.classId) === s(req.query.classId));
  if (s(req.query.sessionId)) rows = rows.filter((item) => s(item.sessionId) === s(req.query.sessionId));
  if (s(req.query.termId)) rows = rows.filter((item) => s(item.termId) === s(req.query.termId));
  if (s(req.query.subject)) rows = rows.filter((item) => (normalizeSubject(item.subject) || s(item.subject)) === (normalizeSubject(req.query.subject) || s(req.query.subject)));
  if (s(req.query.status)) rows = rows.filter((item) => s(item.approvalStatus).toUpperCase() === s(req.query.status).toUpperCase());

  if (roleOf(req.user) === "TEACHER") {
    const subjects = new Set((req.user.subjects || []).map((item) => normalizeSubject(item)).filter(Boolean));
    rows = rows.filter((item) => subjects.has(normalizeSubject(item.subject)));
  }

  rows = rows.sort((a, b) => s(b.updatedAt || b.createdAt).localeCompare(s(a.updatedAt || a.createdAt)));
  writeIfNeeded(db, mutated);
  return res.json(rows);
});

router.post("/records/:id/approve", auth(), requireRole("ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER"), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);
  if (!canReview(req.user)) return res.status(403).json({ message: "Forbidden" });

  const idx = (db.continuousAssessments || []).findIndex((item) => s(item.id) === s(req.params.id));
  if (idx < 0) return res.status(404).json({ message: "Assessment record not found" });

  const record = db.continuousAssessments[idx];
  try {
    const checked = buildAssessmentPayload(db, record, record, req.user, { submit: true });
    db.continuousAssessments[idx] = {
      ...record,
      ...checked,
      approvalStatus: "APPROVED",
      isLocked: true,
      approvedAt: nowIso(),
      approvedBy: s(req.user.id),
      approvedByName: s(req.user.name || req.user.username),
      correctionNote: s(req.body?.note || record.correctionNote),
      updatedBy: s(req.user.id),
      updatedAt: nowIso(),
    };

    recalculateSubjectStats(db, db.continuousAssessments[idx]);
    recalculateCumulativeFields(db, record.classId, record.sessionId);
    updateTermSummaries(db, db.continuousAssessments[idx]);
    syncLegacyResult(db, db.continuousAssessments[idx]);

    db.resultApprovals.unshift({
      id: `rapp-ca-${nanoid(10)}`,
      resultType: "continuous_assessment",
      referenceId: s(record.id),
      approvedBy: s(req.user.id),
      approvalStatus: "APPROVED",
      notes: s(req.body?.note),
      approvedAt: nowIso(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });

    writeDB(db);
    return res.json(db.continuousAssessments[idx]);
  } catch (error) {
    writeIfNeeded(db, mutated);
    return res.status(error.status || 400).json({ message: error.message || "Unable to approve assessment" });
  }
});

router.post("/records/:id/reject", auth(), requireRole("ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER"), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);
  const idx = (db.continuousAssessments || []).findIndex((item) => s(item.id) === s(req.params.id));
  if (idx < 0) return res.status(404).json({ message: "Assessment record not found" });

  db.continuousAssessments[idx] = {
    ...db.continuousAssessments[idx],
    approvalStatus: "REJECTED",
    isLocked: false,
    correctionNote: s(req.body?.note || req.body?.correctionNote),
    rejectedAt: nowIso(),
    rejectedBy: s(req.user.id),
    updatedBy: s(req.user.id),
    updatedAt: nowIso(),
  };

  db.resultApprovals.unshift({
    id: `rapp-ca-${nanoid(10)}`,
    resultType: "continuous_assessment",
    referenceId: s(req.params.id),
    approvedBy: s(req.user.id),
    approvalStatus: "REJECTED",
    notes: s(req.body?.note || req.body?.correctionNote),
    approvedAt: nowIso(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });

  writeDB(db);
  return res.json(db.continuousAssessments[idx]);
});

router.post("/records/:id/unlock", auth(), requireRole("ADMIN", "SUPER_ADMIN"), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);
  const idx = (db.continuousAssessments || []).findIndex((item) => s(item.id) === s(req.params.id));
  if (idx < 0) return res.status(404).json({ message: "Assessment record not found" });

  db.continuousAssessments[idx] = {
    ...db.continuousAssessments[idx],
    approvalStatus: "DRAFT",
    isLocked: false,
    isPublished: false,
    unlockNote: s(req.body?.note),
    unlockedAt: nowIso(),
    unlockedBy: s(req.user.id),
    updatedBy: s(req.user.id),
    updatedAt: nowIso(),
  };

  syncLegacyResult(db, db.continuousAssessments[idx], false);
  writeDB(db);
  return res.json(db.continuousAssessments[idx]);
});

router.post("/settings", auth(), requireRole("ADMIN", "SUPER_ADMIN"), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);

  const cls = s(req.body?.classId) ? findClass(db, req.body.classId) : null;
  const classLevel = s(req.body?.classLevel || cls?.section || "Default") || "Default";
  const ca1Max = num(req.body?.ca1Max, 10);
  const ca2Max = num(req.body?.ca2Max, 10);
  const ca3Max = num(req.body?.ca3Max, 10);
  const examMax = num(req.body?.examMax, 70);
  const totalMax = num(req.body?.totalMax, ca1Max + ca2Max + ca3Max + examMax);

  if ([ca1Max, ca2Max, ca3Max, examMax, totalMax].some((value) => value <= 0)) {
    return res.status(400).json({ message: "All score maxima must be greater than zero." });
  }
  if (roundScore(ca1Max + ca2Max + ca3Max + examMax) !== roundScore(totalMax)) {
    return res.status(400).json({ message: "Total max must equal CA1 + CA2 + CA3 + Exam max." });
  }

  const idx = (db.assessmentSettings || []).findIndex((item) => {
    if (cls) return s(item.classId) === s(cls.id);
    return !s(item.classId) && key(item.classLevel) === key(classLevel);
  });

  const payload = {
    classId: s(cls?.id),
    className: s(cls?.name),
    classLevel,
    ca1Max,
    ca2Max,
    ca3Max,
    examMax,
    totalMax,
    carryForwardMode: "SCALED_TERM_TOTAL",
    isDefault: !cls && key(classLevel) === "default",
    updatedBy: s(req.user.id),
    updatedAt: nowIso(),
  };

  if (idx >= 0) {
    db.assessmentSettings[idx] = { ...db.assessmentSettings[idx], ...payload };
  } else {
    db.assessmentSettings.unshift({ id: `aset-${nanoid(9)}`, ...payload, createdAt: nowIso() });
  }

  writeDB(db);
  return res.json(db.assessmentSettings[idx >= 0 ? idx : 0]);
});

router.post("/grading-scales", auth(), requireRole("ADMIN", "SUPER_ADMIN"), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
  if (rows.length === 0) return res.status(400).json({ message: "rows is required" });

  const valid = rows
    .map((row) => ({
      grade: s(row.grade || row.gradeLabel),
      minScore: num(row.minScore, NaN),
      maxScore: num(row.maxScore, NaN),
      remark: s(row.remark || row.grade || row.gradeLabel),
      isActive: row.isActive !== false,
    }))
    .filter((row) => row.grade && Number.isFinite(row.minScore) && Number.isFinite(row.maxScore));

  if (valid.length === 0) return res.status(400).json({ message: "No valid grade scale rows provided." });

  db.continuousAssessmentGradingScales = valid.map((row) => ({
    id: `cags-${nanoid(8)}`,
    ...row,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }));

  writeDB(db);
  return res.json(db.continuousAssessmentGradingScales);
});

router.post("/publish", auth(), requireRole("ADMIN", "SUPER_ADMIN"), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);
  const cls = findClass(db, req.body?.classId || req.body?.className);
  const session = findSession(db, req.body?.sessionId || req.body?.sessionName);
  const term = findTerm(db, req.body?.termId || req.body?.termName, session?.id);

  if (!cls || !session || !term) {
    writeIfNeeded(db, mutated);
    return res.status(400).json({ message: "classId, sessionId and termId are required" });
  }

  const students = activeStudentsForClass(db, cls.id, cls.name);
  const expectedSubjects = expectedSubjectsForClass(cls, db, session.id, term.id);
  const approved = (db.continuousAssessments || []).filter((item) =>
    s(item.classId) === s(cls.id) &&
    s(item.sessionId) === s(session.id) &&
    s(item.termId) === s(term.id) &&
    s(item.approvalStatus).toUpperCase() === "APPROVED"
  );

  const approvedMap = new Set(approved.map((item) => `${s(item.studentId)}::${normalizeSubject(item.subject) || s(item.subject)}`));
  const missing = [];
  students.forEach((student) => {
    expectedSubjects.forEach((subject) => {
      if (!approvedMap.has(`${s(student.id)}::${subject}`)) {
        missing.push({ studentId: s(student.id), studentName: s(student.name), subject });
      }
    });
  });

  if (missing.length) {
    writeIfNeeded(db, mutated);
    return res.status(409).json({
      message: "Cannot publish incomplete results. Approve every required subject score first.",
      missingCount: missing.length,
      missing: missing.slice(0, 30),
    });
  }

  approved.forEach((record) => {
    record.isPublished = true;
    record.publishedAt = nowIso();
    record.publishedBy = s(req.user.id);
    record.updatedAt = nowIso();
    syncLegacyResult(db, record, true);
  });

  const summaries = updateTermSummaries(db, { classId: cls.id, className: cls.name, sessionId: session.id, sessionName: session.sessionName, termId: term.id, termName: term.termName });
  summaries.forEach((summary) => {
    summary.isPublished = true;
    summary.publishedAt = nowIso();
    summary.updatedAt = nowIso();
  });

  const pubKey = publicationKey({ classId: cls.id, sessionId: session.id, termId: term.id });
  const pubIdx = (db.resultPublicationStatus || []).findIndex((item) => publicationKey(item) === pubKey);
  const pub = {
    classId: s(cls.id),
    className: s(cls.name),
    sessionId: s(session.id),
    sessionName: s(session.sessionName),
    termId: s(term.id),
    termName: s(term.termName),
    status: "PUBLISHED",
    isPublished: true,
    publishedBy: s(req.user.id),
    publishedByName: s(req.user.name || req.user.username),
    publishedAt: nowIso(),
    updatedAt: nowIso(),
  };
  if (pubIdx >= 0) db.resultPublicationStatus[pubIdx] = { ...db.resultPublicationStatus[pubIdx], ...pub };
  else db.resultPublicationStatus.unshift({ id: `rpub-${nanoid(10)}`, ...pub, createdAt: nowIso() });

  db.resultApprovals.unshift({
    id: `rapp-ca-${nanoid(10)}`,
    resultType: "term_result",
    referenceId: pubKey,
    approvedBy: s(req.user.id),
    approvalStatus: "PUBLISHED",
    notes: s(req.body?.notes),
    approvedAt: nowIso(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });

  writeDB(db);
  return res.json({ published: approved.length, summaries: summaries.length, publication: pubIdx >= 0 ? db.resultPublicationStatus[pubIdx] : db.resultPublicationStatus[0] });
});

module.exports = router;
