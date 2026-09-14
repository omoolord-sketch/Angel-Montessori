const express = require("express");
const { nanoid } = require("nanoid");
const { readDB, writeDB } = require("../lib/jsonStore");
const { auth, requireRole } = require("../middleware/auth");
const { CLASS_SUBJECTS, SUBJECT_OPTIONS, normalizeSubject } = require("../lib/subjects");
const { enrichRequestUser, isTeacherRole, normalizeRole } = require("../lib/roles");
const {
  ensureAcademicScope,
  ensureAcademicSession,
  ensureAcademicTerm,
  setActiveAcademicScope,
  syncAcademicMirrors,
} = require("../lib/academicScope");
const { ensureAcademicSystemShape, sortAcademicClasses } = require("../lib/academicSystems");

const router = express.Router();

const LMS_KEYS = [
  "lmsSessions",
  "lmsTerms",
  "lmsSubjects",
  "lmsClassSubjects",
  "lmsTopics",
  "lmsLessons",
  "lmsLessonResources",
  "lmsAssignments",
  "lmsAssignmentSubmissions",
  "lmsQuizzes",
  "lmsQuizQuestions",
  "lmsQuizAttempts",
  "lmsQuizAnswers",
  "lmsAnnouncements",
  "lmsLessonProgress",
  "lmsActivityLogs",
];

function now() {
  return new Date().toISOString();
}

function nk(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function toBool(v, d = false) {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    if (v.toLowerCase() === "true") return true;
    if (v.toLowerCase() === "false") return false;
  }
  return d;
}

function toInt(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : d;
}

function activeSession(db) {
  return (db.academicSessions || db.lmsSessions || []).find((x) => x.isActive) || (db.academicSessions || db.lmsSessions || [])[0] || null;
}

function activeTerm(db, sessionId) {
  const terms = db.terms || db.lmsTerms || [];
  const rows = sessionId ? terms.filter((x) => String(x.sessionId) === String(sessionId)) : terms;
  return rows.find((x) => x.isActive) || rows[0] || null;
}

function ensureDb(db) {
  let changed = false;
  for (const key of LMS_KEYS) {
    if (!Array.isArray(db[key])) {
      db[key] = [];
      changed = true;
    }
  }
  if (!Array.isArray(db.classes)) {
    db.classes = [];
    changed = true;
  }
  if (!Array.isArray(db.users)) {
    db.users = [];
    changed = true;
  }
  if (!Array.isArray(db.students)) {
    db.students = [];
    changed = true;
  }
  if (!Array.isArray(db.courses)) {
    db.courses = [];
    changed = true;
  }
  ensureAcademicScope(db, { currentSession: process.env.CURRENT_SESSION, currentTerm: process.env.CURRENT_TERM });
  changed = true;

  const classShapeBefore = JSON.stringify(db.classes || []);
  ensureAcademicSystemShape(db);
  if (classShapeBefore !== JSON.stringify(db.classes || [])) changed = true;

  if (db.lmsSubjects.length === 0) {
    const t = now();
    db.lmsSubjects = SUBJECT_OPTIONS.map((s) => ({
      id: nanoid(),
      subjectName: s,
      subjectCode: nk(s).slice(0, 8).toUpperCase(),
      category: "general",
      status: "ACTIVE",
      createdAt: t,
      updatedAt: t,
    }));
    changed = true;
  }

  return changed;
}

function loadDb() {
  const db = readDB();
  if (ensureDb(db)) writeDB(db);
  return db;
}

function activeClasses(db) {
  return sortAcademicClasses((Array.isArray(db.classes) ? db.classes : []).filter((item) => item.isActive !== false));
}

function cls(db, ref) {
  const v = String(ref || "").trim();
  const key = nk(v);
  return activeClasses(db).find((x) => String(x.id) === v || nk(x.name) === key) || null;
}

function subj(db, ref) {
  const v = String(ref || "").trim();
  const key = nk(v);
  return db.lmsSubjects.find((x) => String(x.id) === v || nk(x.subjectName) === key) || null;
}

function usr(db, id) {
  return db.users.find((x) => String(x.id) === String(id)) || null;
}

function profile(db, studentRef) {
  const v = String(studentRef || "").trim();
  const student = db.students.find((x) => String(x.id) === v) || null;
  if (!student) return null;
  const c = cls(db, student.classId || student.className);
  return {
    id: student.id,
    name: student.name || "",
    firstName: student.firstName || "",
    lastName: student.lastName || "",
    classId: c?.id || student.classId || "",
    className: c?.name || student.className || "",
    photoUrl: student.photoUrl || "",
  };
}

function parentChildren(db, user) {
  const refs = [
    ...(Array.isArray(user.studentIds) ? user.studentIds : []),
    user.studentId,
  ]
    .map((x) => String(x || "").trim())
    .filter(Boolean);
  const out = [];
  const seen = new Set();
  for (const ref of refs) {
    if (seen.has(ref)) continue;
    seen.add(ref);
    const p = profile(db, ref);
    if (p) out.push(p);
  }
  return out;
}

function isAcademicManager(user) {
  const role = normalizeRole(user?.originalRole || user?.role);
  return role === "ADMIN" || role === "ACADEMIC_OFFICER";
}

function canManageSubject(user, subjectName) {
  const role = normalizeRole(user?.originalRole || user?.role);
  if (role === "ADMIN" || role === "ACADEMIC_OFFICER") return true;
  if (!isTeacherRole(role)) return false;
  const target = nk(normalizeSubject(subjectName) || subjectName);
  return (Array.isArray(user.subjects) ? user.subjects : [])
    .map((x) => nk(normalizeSubject(x) || x))
    .includes(target);
}

function canReceiveSubjectAssignment(db, user, subjectName) {
  const role = normalizeRole(user?.originalRole || user?.role);
  if (role === "CLASS_TEACHER" || role === "ASSIST_CLASS_TEACHER") return true;
  return canManageSubject(enrichRequestUser(user, db), subjectName);
}

function enrichClassSubject(db, row) {
  const c = cls(db, row.classId || row.className);
  const s = subj(db, row.subjectId || row.subjectName);
  const t = usr(db, row.teacherUserId);
  const sess = db.lmsSessions.find((x) => String(x.id) === String(row.sessionId));
  const term = db.lmsTerms.find((x) => String(x.id) === String(row.termId));
  return {
    ...row,
    classId: c?.id || row.classId || "",
    className: c?.name || row.className || "",
    subjectId: s?.id || row.subjectId || "",
    subjectName: s?.subjectName || row.subjectName || "",
    teacherUserId: t?.id || row.teacherUserId || "",
    teacherName: t?.name || row.teacherName || "",
    sessionName: sess?.sessionName || "",
    termName: term?.termName || "",
  };
}

function canManageClassSubject(db, user, classSubject) {
  if (isAcademicManager(user)) return true;
  if (user.role !== "TEACHER") return false;
  if (String(classSubject.teacherUserId || "") === String(user.id || "")) return true;
  return canManageSubject(user, classSubject.subjectName || "");
}

function visibleClassIds(db, user) {
  if (isAcademicManager(user) || user.role === "TEACHER") return activeClasses(db).map((x) => String(x.id));
  if (user.role === "STUDENT") {
    const p = profile(db, user.studentId);
    return p?.classId ? [String(p.classId)] : [];
  }
  if (user.role === "PARENT") {
    return Array.from(new Set(parentChildren(db, user).map((x) => String(x.classId || "")).filter(Boolean)));
  }
  return [];
}

function visibleClassSubjects(db, user) {
  const rows = db.lmsClassSubjects.map((x) => enrichClassSubject(db, x));
  if (isAcademicManager(user)) return rows;
  if (user.role === "TEACHER") return rows.filter((x) => canManageClassSubject(db, user, x));
  const cids = new Set(visibleClassIds(db, user));
  return rows.filter((x) => cids.has(String(x.classId)) && String(x.status || "ACTIVE").toUpperCase() !== "INACTIVE");
}

function visibleClassSubjectIds(db, user) {
  return new Set(visibleClassSubjects(db, user).map((x) => String(x.id)));
}

function log(db, user, action, module, recordId, metadata = {}) {
  db.lmsActivityLogs.unshift({
    id: nanoid(),
    userId: String(user?.id || ""),
    action,
    module,
    recordId: String(recordId || ""),
    metadata,
    createdAt: now(),
  });
  if (db.lmsActivityLogs.length > 5000) db.lmsActivityLogs = db.lmsActivityLogs.slice(0, 5000);
}

function visibleAnnouncements(db, user) {
  const classIds = new Set(visibleClassIds(db, user));
  const classSubjectIds = visibleClassSubjectIds(db, user);
  return db.lmsAnnouncements.filter((a) => {
    const status = String(a.status || "PUBLISHED").toUpperCase();
    if ((user.role === "STUDENT" || user.role === "PARENT") && status !== "PUBLISHED") return false;
    const type = String(a.targetType || "school").toLowerCase();
    const target = String(a.targetId || "");
    if (type === "school") return true;
    if (type === "class") return classIds.has(target);
    if (type === "class_subject") return classSubjectIds.has(target);
    return false;
  });
}

function studentsForClass(db, classId, className = "") {
  const classRow = cls(db, classId || className);
  const targetClassId = String(classRow?.id || classId || "");
  const targetClassKey = nk(classRow?.name || className);

  return (Array.isArray(db.students) ? db.students : [])
    .map((item) => profile(db, item.id))
    .filter((item) => item)
    .filter((item) => {
      if (targetClassId && String(item.classId || "") === targetClassId) return true;
      if (targetClassKey && nk(item.className || "") === targetClassKey) return true;
      return false;
    });
}

function representedStudentIdsFromVirtualJoin(join) {
  const ids = [];
  if (String(join.role || "").toUpperCase() === "STUDENT" && join.studentId) {
    ids.push(String(join.studentId));
  }
  if (Array.isArray(join.childIds)) {
    join.childIds.forEach((item) => {
      const id = String(item || "").trim();
      if (id) ids.push(id);
    });
  }
  return Array.from(new Set(ids));
}

function summarizeVirtualClasses(db, rows) {
  const sessions = Array.isArray(rows) ? rows : [];
  const joins = Array.isArray(db.lmsVirtualClassJoins) ? db.lmsVirtualClassJoins : [];
  let expectedStudentSeats = 0;
  let attendedStudentSeats = 0;

  for (const row of sessions) {
    const classSubject = enrichClassSubject(
      db,
      db.lmsClassSubjects.find((item) => String(item.id) === String(row.classSubjectId)) || {}
    );
    const expectedIds = new Set(
      studentsForClass(db, classSubject.classId || row.classId || "", classSubject.className || row.className || "")
        .map((item) => String(item.id || ""))
        .filter(Boolean)
    );
    const attendedIds = new Set();

    joins
      .filter((item) => String(item.virtualClassId) === String(row.id))
      .forEach((join) => {
        representedStudentIdsFromVirtualJoin(join).forEach((studentId) => {
          if (!expectedIds.size || expectedIds.has(String(studentId))) {
            attendedIds.add(String(studentId));
          }
        });
      });

    expectedStudentSeats += expectedIds.size;
    attendedStudentSeats += attendedIds.size;
  }

  return {
    totalVirtualClasses: sessions.length,
    upcomingVirtualClasses: sessions.filter((item) => String(item.status || "").toLowerCase() === "scheduled").length,
    liveVirtualClasses: sessions.filter((item) => String(item.status || "").toLowerCase() === "live").length,
    completedVirtualClasses: sessions.filter((item) => String(item.status || "").toLowerCase() === "completed").length,
    recordingsAvailable: sessions.filter((item) => String(item.recordingLink || "").trim()).length,
    expectedStudentSeats,
    attendedStudentSeats,
    averageVirtualAttendanceRate: expectedStudentSeats
      ? Number(((attendedStudentSeats / expectedStudentSeats) * 100).toFixed(2))
      : 0,
  };
}

function dashboard(db, user) {
  const cs = visibleClassSubjects(db, user);
  const csIds = new Set(cs.map((x) => String(x.id)));
  const lessons = db.lmsLessons.filter((x) => csIds.has(String(x.classSubjectId)));
  const assignments = db.lmsAssignments.filter((x) => csIds.has(String(x.classSubjectId)));
  const quizzes = db.lmsQuizzes.filter((x) => csIds.has(String(x.classSubjectId)));
  const submissions = db.lmsAssignmentSubmissions.filter((s) => {
    const a = db.lmsAssignments.find((x) => String(x.id) === String(s.assignmentId));
    return a ? csIds.has(String(a.classSubjectId)) : false;
  });
  const virtualClasses = (Array.isArray(db.lmsVirtualClasses) ? db.lmsVirtualClasses : []).filter((item) =>
    csIds.has(String(item.classSubjectId))
  );
  const virtualSummary = summarizeVirtualClasses(db, virtualClasses);

  if (user.role === "ADMIN") {
    return {
      role: "ADMIN",
      totals: {
        totalClasses: activeClasses(db).length,
        totalSubjectsActive: db.lmsSubjects.filter((x) => String(x.status || "ACTIVE").toUpperCase() === "ACTIVE").length,
        totalTeachersUsingLms: new Set(cs.map((x) => String(x.teacherUserId || "")).filter(Boolean)).size,
        totalStudentsActive: db.students.length,
        lessonsPublishedThisWeek: lessons.filter((x) => String(x.publishStatus || "").toUpperCase() === "PUBLISHED").length,
        assignmentsDueToday: assignments.filter((x) => String(x.dueDate || "").slice(0, 10) === now().slice(0, 10)).length,
        pendingSubmissionsToGrade: submissions.filter((x) => String(x.status || "").toUpperCase() === "SUBMITTED").length,
        upcomingVirtualClasses: virtualSummary.upcomingVirtualClasses,
        liveVirtualClasses: virtualSummary.liveVirtualClasses,
        recordingsAvailable: virtualSummary.recordingsAvailable,
        averageVirtualAttendanceRate: virtualSummary.averageVirtualAttendanceRate,
      },
    };
  }

  if (user.role === "TEACHER") {
    return {
      role: "TEACHER",
      totals: {
        myAssignedSubjects: cs.length,
        lessonsToPublish: lessons.filter((x) => String(x.publishStatus || "DRAFT").toUpperCase() === "DRAFT").length,
        submissionsToGrade: submissions.filter((x) => String(x.status || "SUBMITTED").toUpperCase() === "SUBMITTED").length,
        quizzesCreated: quizzes.length,
        upcomingVirtualClasses: virtualSummary.upcomingVirtualClasses,
        liveVirtualClasses: virtualSummary.liveVirtualClasses,
        recordingsAvailable: virtualSummary.recordingsAvailable,
        averageVirtualAttendanceRate: virtualSummary.averageVirtualAttendanceRate,
      },
      mySubjects: cs,
    };
  }

  if (user.role === "STUDENT") {
    const p = profile(db, user.studentId);
    const mySubs = db.lmsAssignmentSubmissions.filter((x) => String(x.studentUserId) === String(user.id));
    const doneIds = new Set(mySubs.map((x) => String(x.assignmentId)));
    return {
      role: "STUDENT",
      student: p,
      totals: {
        mySubjectsThisTerm: cs.length,
        pendingAssignments: assignments.filter((x) => String(x.status || "PUBLISHED").toUpperCase() === "PUBLISHED" && !doneIds.has(String(x.id))).length,
        upcomingQuizzes: quizzes.filter((x) => String(x.status || "PUBLISHED").toUpperCase() === "PUBLISHED").length,
        completedLessons: db.lmsLessonProgress.filter((x) => String(x.studentUserId) === String(user.id) && x.isCompleted).length,
        upcomingVirtualClasses: virtualSummary.upcomingVirtualClasses,
        liveVirtualClasses: virtualSummary.liveVirtualClasses,
        recordingsAvailable: virtualSummary.recordingsAvailable,
        averageVirtualAttendanceRate: virtualSummary.averageVirtualAttendanceRate,
      },
    };
  }

  if (user.role === "PARENT") {
    const children = parentChildren(db, user);
    return {
      role: "PARENT",
      totals: {
        children: children.length,
        upcomingVirtualClasses: virtualSummary.upcomingVirtualClasses,
        recordingsAvailable: virtualSummary.recordingsAvailable,
        averageVirtualAttendanceRate: virtualSummary.averageVirtualAttendanceRate,
      },
      children,
    };
  }

  return { role: user.role, totals: {} };
}

router.use(auth());
router.get("/", (req, res) => {
  const db = loadDb();
  res.json(visibleClassSubjects(db, req.user));
});

router.post("/", requireRole("ADMIN"), (req, res) => {
  const db = loadDb();
  const title = String(req.body?.title || "").trim();
  if (!title) return res.status(400).json({ message: "title is required" });
  const row = { id: nanoid(), title, createdAt: now() };
  db.courses.unshift(row);
  writeDB(db);
  res.status(201).json(row);
});

router.get("/metadata", (req, res) => {
  const db = loadDb();
  const vClass = new Set(visibleClassIds(db, req.user));
  const students = isAcademicManager(req.user) || req.user.role === "TEACHER"
    ? db.students.map((x) => profile(db, x.id)).filter((x) => x && vClass.has(String(x.classId)))
    : [];
  const teachers = db.users.filter((x) => isTeacherRole(x.role)).map((x) => ({ id: x.id, name: x.name, username: x.username, role: x.role, subjects: x.subjects || [] }));
  res.json({
    role: req.user.role,
    classes: activeClasses(db),
    sessions: db.lmsSessions,
    terms: db.lmsTerms,
    subjects: db.lmsSubjects,
    classSubjects: visibleClassSubjects(db, req.user),
    teachers,
    students,
    activeSessionId: activeSession(db)?.id || "",
    activeTermId: activeTerm(db, activeSession(db)?.id)?.id || "",
    studentProfile: req.user.role === "STUDENT" ? profile(db, req.user.studentId) : null,
    children: req.user.role === "PARENT" ? parentChildren(db, req.user) : [],
  });
});

router.get("/dashboard", (req, res) => {
  const db = loadDb();
  res.json(dashboard(db, req.user));
});

router.get("/sessions", (req, res) => {
  const db = loadDb();
  res.json(db.academicSessions || db.lmsSessions || []);
});

router.post("/sessions", requireRole("ADMIN", "ACADEMIC_OFFICER"), (req, res) => {
  const db = loadDb();
  const sessionName = String(req.body?.sessionName || "").trim();
  const isActive = toBool(req.body?.isActive, false);
  if (!sessionName) return res.status(400).json({ message: "sessionName is required" });
  if ((db.academicSessions || []).some((x) => nk(x.sessionName) === nk(sessionName))) return res.status(409).json({ message: "Session already exists" });
  const row = ensureAcademicSession(db, sessionName, { isActive, createdAt: now(), updatedAt: now() });
  if (isActive) {
    const term = activeTerm(db, row.id);
    setActiveAcademicScope(db, row.id, term?.id);
  } else {
    syncAcademicMirrors(db);
  }
  log(db, req.user, "session_created", "academic_sessions", row.id, { sessionName });
  writeDB(db);
  res.status(201).json(row);
});

router.patch("/sessions/:id", requireRole("ADMIN", "ACADEMIC_OFFICER"), (req, res) => {
  const db = loadDb();
  const id = String(req.params.id || "");
  const idx = (db.academicSessions || []).findIndex((x) => String(x.id) === id);
  if (idx < 0) return res.status(404).json({ message: "Session not found" });
  const row = db.academicSessions[idx];
  const next = {
    ...row,
    sessionName: req.body?.sessionName !== undefined ? String(req.body?.sessionName || "").trim() : row.sessionName,
    isActive: req.body?.isActive !== undefined ? toBool(req.body?.isActive, false) : row.isActive,
    updatedAt: now(),
  };
  if (!next.sessionName) return res.status(400).json({ message: "sessionName cannot be empty" });
  db.academicSessions[idx] = next;
  if (next.isActive) {
    const term = activeTerm(db, next.id);
    setActiveAcademicScope(db, next.id, term?.id);
  } else {
    syncAcademicMirrors(db);
  }
  writeDB(db);
  res.json(next);
});

router.get("/terms", (req, res) => {
  const db = loadDb();
  const sessionId = String(req.query.sessionId || "").trim();
  res.json((db.terms || db.lmsTerms || []).filter((x) => (sessionId ? String(x.sessionId) === sessionId : true)));
});

router.post("/terms", requireRole("ADMIN", "ACADEMIC_OFFICER"), (req, res) => {
  const db = loadDb();
  const sessionId = String(req.body?.sessionId || "").trim();
  const termName = String(req.body?.termName || "").trim();
  const isActive = toBool(req.body?.isActive, false);
  if (!sessionId || !termName) return res.status(400).json({ message: "sessionId and termName are required" });
  if (!(db.academicSessions || []).some((x) => String(x.id) === sessionId)) return res.status(400).json({ message: "Invalid sessionId" });
  if ((db.terms || []).some((x) => String(x.sessionId) === sessionId && nk(x.termName) === nk(termName))) return res.status(409).json({ message: "Term already exists for session" });
  const row = ensureAcademicTerm(db, sessionId, termName, {
    startDate: String(req.body?.startDate || "").trim(),
    endDate: String(req.body?.endDate || "").trim(),
    isActive,
    createdAt: now(),
    updatedAt: now(),
  });
  if (isActive) setActiveAcademicScope(db, sessionId, row.id);
  else syncAcademicMirrors(db);
  writeDB(db);
  res.status(201).json(row);
});

router.patch("/terms/:id", requireRole("ADMIN", "ACADEMIC_OFFICER"), (req, res) => {
  const db = loadDb();
  const id = String(req.params.id || "");
  const idx = (db.terms || []).findIndex((x) => String(x.id) === id);
  if (idx < 0) return res.status(404).json({ message: "Term not found" });
  const row = db.terms[idx];
  const next = {
    ...row,
    sessionId: req.body?.sessionId !== undefined ? String(req.body?.sessionId || "").trim() : row.sessionId,
    termName: req.body?.termName !== undefined ? String(req.body?.termName || "").trim() : row.termName,
    startDate: req.body?.startDate !== undefined ? String(req.body?.startDate || "").trim() : row.startDate,
    endDate: req.body?.endDate !== undefined ? String(req.body?.endDate || "").trim() : row.endDate,
    isActive: req.body?.isActive !== undefined ? toBool(req.body?.isActive, false) : row.isActive,
    updatedAt: now(),
  };
  if (!next.sessionId || !next.termName) return res.status(400).json({ message: "sessionId and termName are required" });
  if (!(db.academicSessions || []).some((x) => String(x.id) === next.sessionId)) return res.status(400).json({ message: "Invalid sessionId" });
  db.terms[idx] = next;
  if (next.isActive) setActiveAcademicScope(db, next.sessionId, next.id);
  else syncAcademicMirrors(db);
  writeDB(db);
  res.json(next);
});

router.get("/subjects", (req, res) => {
  const db = loadDb();
  res.json(db.lmsSubjects);
});

router.post("/subjects", requireRole("ADMIN", "ACADEMIC_OFFICER"), (req, res) => {
  const db = loadDb();
  const subjectNameRaw = String(req.body?.subjectName || "").trim();
  const subjectName = normalizeSubject(subjectNameRaw) || subjectNameRaw;
  if (!subjectName) return res.status(400).json({ message: "subjectName is required" });
  if (db.lmsSubjects.some((x) => nk(x.subjectName) === nk(subjectName))) return res.status(409).json({ message: "Subject already exists" });
  const row = {
    id: nanoid(),
    subjectName,
    subjectCode: String(req.body?.subjectCode || "").trim() || nk(subjectName).slice(0, 8).toUpperCase(),
    category: String(req.body?.category || "general").trim(),
    status: String(req.body?.status || "ACTIVE").toUpperCase(),
    createdAt: now(),
    updatedAt: now(),
  };
  db.lmsSubjects.unshift(row);
  writeDB(db);
  res.status(201).json(row);
});

router.get("/class-subjects", (req, res) => {
  const db = loadDb();
  const classId = String(req.query.classId || "").trim();
  const sessionId = String(req.query.sessionId || "").trim();
  const termId = String(req.query.termId || "").trim();
  const rows = visibleClassSubjects(db, req.user).filter((x) => {
    if (classId && String(x.classId) !== classId) return false;
    if (sessionId && String(x.sessionId) !== sessionId) return false;
    if (termId && String(x.termId) !== termId) return false;
    return true;
  });
  res.json(rows);
});

router.post("/class-subjects", requireRole("ADMIN", "ACADEMIC_OFFICER", "TEACHER"), (req, res) => {
  const db = loadDb();
  const c = cls(db, req.body?.classId || req.body?.className);
  const s = subj(db, req.body?.subjectId || req.body?.subjectName);
  if (!c) return res.status(400).json({ message: "Invalid classId/className" });
  if (!s) return res.status(400).json({ message: "Invalid subjectId/subjectName" });
  if (req.user.role === "TEACHER" && !canManageSubject(req.user, s.subjectName)) return res.status(403).json({ message: "You can only map your assigned subjects" });
  const sessionId = String(req.body?.sessionId || activeSession(db)?.id || "");
  const termId = String(req.body?.termId || activeTerm(db, sessionId)?.id || "");
  if (!sessionId || !termId) return res.status(400).json({ message: "sessionId and termId are required" });
  const teacherUserId = req.user.role === "TEACHER" ? String(req.user.id) : String(req.body?.teacherUserId || "").trim();
  if (teacherUserId) {
    const t = usr(db, teacherUserId);
    if (!t || !isTeacherRole(t.role)) return res.status(400).json({ message: "Invalid teacherUserId" });
    if (!canReceiveSubjectAssignment(db, t, s.subjectName)) return res.status(400).json({ message: "Selected teacher cannot receive this subject assignment" });
  }
  const exists = db.lmsClassSubjects.find((x) => String(x.classId) === String(c.id) && String(x.subjectId) === String(s.id) && String(x.sessionId) === sessionId && String(x.termId) === termId);
  if (exists) return res.status(409).json({ message: "Class-subject mapping already exists for this session/term" });
  const row = {
    id: nanoid(),
    classId: c.id,
    className: c.name,
    subjectId: s.id,
    subjectName: s.subjectName,
    teacherUserId,
    teacherName: teacherUserId ? (usr(db, teacherUserId)?.name || "") : "",
    sessionId,
    termId,
    status: String(req.body?.status || "ACTIVE").toUpperCase(),
    createdAt: now(),
    updatedAt: now(),
  };
  db.lmsClassSubjects.unshift(row);
  log(db, req.user, "class_subject_created", "lms_class_subjects", row.id, { classId: row.classId, subjectId: row.subjectId });
  writeDB(db);
  res.status(201).json(enrichClassSubject(db, row));
});

router.patch("/class-subjects/:id", requireRole("ADMIN", "ACADEMIC_OFFICER"), (req, res) => {
  const db = loadDb();
  const id = String(req.params.id || "");
  const idx = db.lmsClassSubjects.findIndex((x) => String(x.id) === id);
  if (idx < 0) return res.status(404).json({ message: "Class subject mapping not found" });
  const row = db.lmsClassSubjects[idx];
  const teacherUserId = req.body?.teacherUserId !== undefined ? String(req.body?.teacherUserId || "").trim() : row.teacherUserId;
  if (teacherUserId) {
    const t = usr(db, teacherUserId);
    if (!t || !isTeacherRole(t.role)) return res.status(400).json({ message: "Invalid teacherUserId" });
    if (!canReceiveSubjectAssignment(db, t, row.subjectName)) return res.status(400).json({ message: "Selected teacher cannot receive this subject assignment" });
  }
  const next = {
    ...row,
    teacherUserId,
    teacherName: teacherUserId ? (usr(db, teacherUserId)?.name || "") : "",
    status: req.body?.status !== undefined ? String(req.body?.status || "ACTIVE").toUpperCase() : row.status,
    sessionId: req.body?.sessionId !== undefined ? String(req.body?.sessionId || "").trim() : row.sessionId,
    termId: req.body?.termId !== undefined ? String(req.body?.termId || "").trim() : row.termId,
    updatedAt: now(),
  };
  db.lmsClassSubjects[idx] = next;
  writeDB(db);
  res.json(enrichClassSubject(db, next));
});

router.post("/setup/seed-class-subjects", requireRole("ADMIN", "ACADEMIC_OFFICER"), (req, res) => {
  const db = loadDb();
  const sessionId = String(req.body?.sessionId || activeSession(db)?.id || "");
  const termId = String(req.body?.termId || activeTerm(db, sessionId)?.id || "");
  if (!sessionId || !termId) return res.status(400).json({ message: "sessionId and termId are required" });
  let created = 0;
  for (const c of activeClasses(db)) {
    const catalogKey = Object.keys(CLASS_SUBJECTS).find((k) => nk(k) === nk(c.name));
    const subjects = catalogKey ? CLASS_SUBJECTS[catalogKey] : [];
    for (const name of subjects) {
      const canonical = normalizeSubject(name) || name;
      let s = subj(db, canonical);
      if (!s) {
        s = { id: nanoid(), subjectName: canonical, subjectCode: nk(canonical).slice(0, 8).toUpperCase(), category: "general", status: "ACTIVE", createdAt: now(), updatedAt: now() };
        db.lmsSubjects.unshift(s);
      }
      const exists = db.lmsClassSubjects.some((x) => String(x.classId) === String(c.id) && String(x.subjectId) === String(s.id) && String(x.sessionId) === sessionId && String(x.termId) === termId);
      if (exists) continue;
      db.lmsClassSubjects.unshift({
        id: nanoid(),
        classId: c.id,
        className: c.name,
        subjectId: s.id,
        subjectName: s.subjectName,
        teacherUserId: "",
        teacherName: "",
        sessionId,
        termId,
        status: "ACTIVE",
        createdAt: now(),
        updatedAt: now(),
      });
      created += 1;
    }
  }
  writeDB(db);
  res.json({ created });
});
router.get("/topics", (req, res) => {
  const db = loadDb();
  const classSubjectId = String(req.query.classSubjectId || "").trim();
  const allowed = visibleClassSubjectIds(db, req.user);
  const rows = db.lmsTopics
    .filter((x) => allowed.has(String(x.classSubjectId)))
    .filter((x) => (classSubjectId ? String(x.classSubjectId) === classSubjectId : true))
    .sort((a, b) => Number(a.weekNo || 0) - Number(b.weekNo || 0));
  res.json(rows);
});

router.post("/topics", requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = loadDb();
  const classSubjectId = String(req.body?.classSubjectId || "").trim();
  const topicTitle = String(req.body?.topicTitle || "").trim();
  if (!classSubjectId || !topicTitle) return res.status(400).json({ message: "classSubjectId and topicTitle are required" });
  const csRow = enrichClassSubject(db, db.lmsClassSubjects.find((x) => String(x.id) === classSubjectId) || {});
  if (!csRow?.id) return res.status(404).json({ message: "Class-subject mapping not found" });
  if (!canManageClassSubject(db, req.user, csRow)) return res.status(403).json({ message: "You can only create topics for your assigned subjects" });
  const row = {
    id: nanoid(),
    classSubjectId,
    topicTitle,
    topicDescription: String(req.body?.topicDescription || "").trim(),
    weekNo: toInt(req.body?.weekNo, 0),
    position: toInt(req.body?.position, 0),
    status: String(req.body?.status || "ACTIVE").toUpperCase(),
    createdBy: String(req.user.id),
    createdAt: now(),
    updatedAt: now(),
  };
  db.lmsTopics.unshift(row);
  writeDB(db);
  res.status(201).json(row);
});

router.get("/lessons", (req, res) => {
  const db = loadDb();
  const classSubjectId = String(req.query.classSubjectId || "").trim();
  const topicId = String(req.query.topicId || "").trim();
  const allowed = visibleClassSubjectIds(db, req.user);
  const rows = db.lmsLessons
    .filter((x) => allowed.has(String(x.classSubjectId)))
    .filter((x) => (classSubjectId ? String(x.classSubjectId) === classSubjectId : true))
    .filter((x) => (topicId ? String(x.topicId) === topicId : true))
    .filter((x) => (req.user.role === "STUDENT" || req.user.role === "PARENT" ? String(x.publishStatus || "").toUpperCase() === "PUBLISHED" : true))
    .sort((a, b) => String(b.lessonDate || b.createdAt || "").localeCompare(String(a.lessonDate || a.createdAt || "")))
    .map((x) => ({
      ...x,
      resources: db.lmsLessonResources.filter((r) => String(r.lessonId) === String(x.id)),
    }));
  res.json(rows);
});

router.post("/lessons", requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = loadDb();
  const classSubjectId = String(req.body?.classSubjectId || "").trim();
  const lessonTitle = String(req.body?.lessonTitle || "").trim();
  if (!classSubjectId || !lessonTitle) return res.status(400).json({ message: "classSubjectId and lessonTitle are required" });
  const csRow = enrichClassSubject(db, db.lmsClassSubjects.find((x) => String(x.id) === classSubjectId) || {});
  if (!csRow?.id) return res.status(404).json({ message: "Class-subject mapping not found" });
  if (!canManageClassSubject(db, req.user, csRow)) return res.status(403).json({ message: "You can only create lessons for your assigned subjects" });
  const topicId = String(req.body?.topicId || "").trim();
  if (topicId) {
    const topic = db.lmsTopics.find((x) => String(x.id) === topicId);
    if (!topic || String(topic.classSubjectId) !== classSubjectId) return res.status(400).json({ message: "Invalid topicId for class-subject" });
  }
  const status = String(req.body?.publishStatus || "DRAFT").toUpperCase();
  const row = {
    id: nanoid(),
    classSubjectId,
    topicId,
    lessonTitle,
    lessonNote: String(req.body?.lessonNote || "").trim(),
    lessonSummary: String(req.body?.lessonSummary || "").trim(),
    videoUrl: String(req.body?.videoUrl || "").trim(),
    liveClassUrl: String(req.body?.liveClassUrl || "").trim(),
    lessonDate: String(req.body?.lessonDate || "").trim() || now().slice(0, 10),
    publishStatus: status,
    publishedAt: status === "PUBLISHED" ? now() : "",
    createdBy: String(req.user.id),
    updatedBy: String(req.user.id),
    createdAt: now(),
    updatedAt: now(),
  };
  db.lmsLessons.unshift(row);
  writeDB(db);
  res.status(201).json(row);
});

router.patch("/lessons/:id", requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = loadDb();
  const id = String(req.params.id || "");
  const idx = db.lmsLessons.findIndex((x) => String(x.id) === id);
  if (idx < 0) return res.status(404).json({ message: "Lesson not found" });
  const row = db.lmsLessons[idx];
  const csRow = enrichClassSubject(db, db.lmsClassSubjects.find((x) => String(x.id) === String(row.classSubjectId)) || {});
  if (!csRow?.id) return res.status(400).json({ message: "Lesson class-subject mapping is missing" });
  if (!canManageClassSubject(db, req.user, csRow)) return res.status(403).json({ message: "You can only edit lessons for your assigned subjects" });
  const nextStatus = req.body?.publishStatus !== undefined ? String(req.body?.publishStatus || "DRAFT").toUpperCase() : row.publishStatus;
  const next = {
    ...row,
    topicId: req.body?.topicId !== undefined ? String(req.body?.topicId || "").trim() : row.topicId,
    lessonTitle: req.body?.lessonTitle !== undefined ? String(req.body?.lessonTitle || "").trim() : row.lessonTitle,
    lessonNote: req.body?.lessonNote !== undefined ? String(req.body?.lessonNote || "").trim() : row.lessonNote,
    lessonSummary: req.body?.lessonSummary !== undefined ? String(req.body?.lessonSummary || "").trim() : row.lessonSummary,
    videoUrl: req.body?.videoUrl !== undefined ? String(req.body?.videoUrl || "").trim() : row.videoUrl,
    liveClassUrl: req.body?.liveClassUrl !== undefined ? String(req.body?.liveClassUrl || "").trim() : row.liveClassUrl,
    lessonDate: req.body?.lessonDate !== undefined ? String(req.body?.lessonDate || "").trim() : row.lessonDate,
    publishStatus: nextStatus,
    publishedAt: nextStatus === "PUBLISHED" ? (row.publishedAt || now()) : "",
    updatedBy: String(req.user.id),
    updatedAt: now(),
  };
  if (!next.lessonTitle) return res.status(400).json({ message: "lessonTitle cannot be empty" });
  db.lmsLessons[idx] = next;
  writeDB(db);
  res.json(next);
});

router.post("/lessons/:id/resources", requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = loadDb();
  const lessonId = String(req.params.id || "");
  const lesson = db.lmsLessons.find((x) => String(x.id) === lessonId);
  if (!lesson) return res.status(404).json({ message: "Lesson not found" });
  const csRow = enrichClassSubject(db, db.lmsClassSubjects.find((x) => String(x.id) === String(lesson.classSubjectId)) || {});
  if (!csRow?.id) return res.status(400).json({ message: "Lesson class-subject mapping is missing" });
  if (!canManageClassSubject(db, req.user, csRow)) return res.status(403).json({ message: "You can only add resources for your assigned subjects" });
  const resourceTitle = String(req.body?.resourceTitle || "").trim();
  const externalUrl = String(req.body?.externalUrl || "").trim();
  const filePath = String(req.body?.filePath || "").trim();
  if (!resourceTitle) return res.status(400).json({ message: "resourceTitle is required" });
  if (!externalUrl && !filePath) return res.status(400).json({ message: "Provide externalUrl or filePath" });
  const row = {
    id: nanoid(),
    lessonId,
    resourceTitle,
    resourceType: String(req.body?.resourceType || "link").trim().toLowerCase(),
    filePath,
    externalUrl,
    fileSize: toInt(req.body?.fileSize, 0),
    mimeType: String(req.body?.mimeType || "").trim(),
    uploadedBy: String(req.user.id),
    createdAt: now(),
    updatedAt: now(),
  };
  db.lmsLessonResources.unshift(row);
  writeDB(db);
  res.status(201).json(row);
});

router.post("/lessons/:id/progress", requireRole("STUDENT"), (req, res) => {
  const db = loadDb();
  const lessonId = String(req.params.id || "");
  const lesson = db.lmsLessons.find((x) => String(x.id) === lessonId);
  if (!lesson) return res.status(404).json({ message: "Lesson not found" });
  const allowed = new Set(db.lmsLessons.filter((x) => visibleClassSubjectIds(db, req.user).has(String(x.classSubjectId)) && String(x.publishStatus || "").toUpperCase() === "PUBLISHED").map((x) => String(x.id)));
  if (!allowed.has(lessonId)) return res.status(403).json({ message: "You can only mark progress for your class lessons" });
  const p = profile(db, req.user.studentId);
  if (!p) return res.status(400).json({ message: "Student profile is not linked" });
  const idx = db.lmsLessonProgress.findIndex((x) => String(x.lessonId) === lessonId && String(x.studentUserId) === String(req.user.id));
  const cur = idx >= 0 ? db.lmsLessonProgress[idx] : {
    id: nanoid(),
    lessonId,
    studentUserId: String(req.user.id),
    studentId: String(p.id),
    isViewed: false,
    viewedAt: "",
    isCompleted: false,
    completedAt: "",
    createdAt: now(),
    updatedAt: now(),
  };
  const markViewed = req.body?.markViewed !== undefined ? toBool(req.body?.markViewed, true) : true;
  const markCompleted = req.body?.markCompleted !== undefined ? toBool(req.body?.markCompleted, false) : false;
  const row = {
    ...cur,
    isViewed: markViewed ? true : cur.isViewed,
    viewedAt: markViewed ? (cur.viewedAt || now()) : cur.viewedAt,
    isCompleted: markCompleted ? true : cur.isCompleted,
    completedAt: markCompleted ? (cur.completedAt || now()) : cur.completedAt,
    updatedAt: now(),
  };
  if (idx >= 0) db.lmsLessonProgress[idx] = row;
  else db.lmsLessonProgress.unshift(row);
  writeDB(db);
  res.json(row);
});

router.get("/assignments", (req, res) => {
  const db = loadDb();
  const classSubjectId = String(req.query.classSubjectId || "").trim();
  const allowed = visibleClassSubjectIds(db, req.user);
  const rows = db.lmsAssignments
    .filter((x) => allowed.has(String(x.classSubjectId)))
    .filter((x) => (classSubjectId ? String(x.classSubjectId) === classSubjectId : true))
    .filter((x) => (req.user.role === "STUDENT" || req.user.role === "PARENT" ? String(x.status || "PUBLISHED").toUpperCase() === "PUBLISHED" : true))
    .sort((a, b) => String(a.dueDate || "").localeCompare(String(b.dueDate || "")))
    .map((x) => ({
      ...x,
      classSubject: enrichClassSubject(db, db.lmsClassSubjects.find((c) => String(c.id) === String(x.classSubjectId)) || {}),
    }));
  res.json(rows);
});

router.post("/assignments", requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = loadDb();
  const classSubjectId = String(req.body?.classSubjectId || "").trim();
  const title = String(req.body?.title || "").trim();
  if (!classSubjectId || !title) return res.status(400).json({ message: "classSubjectId and title are required" });
  const csRow = enrichClassSubject(db, db.lmsClassSubjects.find((x) => String(x.id) === classSubjectId) || {});
  if (!csRow?.id) return res.status(404).json({ message: "Class-subject mapping not found" });
  if (!canManageClassSubject(db, req.user, csRow)) return res.status(403).json({ message: "You can only create assignments for your assigned subjects" });
  const row = {
    id: nanoid(),
    classSubjectId,
    topicId: String(req.body?.topicId || "").trim(),
    lessonId: String(req.body?.lessonId || "").trim(),
    title,
    instructions: String(req.body?.instructions || "").trim(),
    attachmentPath: String(req.body?.attachmentPath || "").trim(),
    dueDate: String(req.body?.dueDate || "").trim(),
    maxScore: toInt(req.body?.maxScore, 20),
    submissionType: String(req.body?.submissionType || "text_and_file").toLowerCase(),
    allowLateSubmission: toBool(req.body?.allowLateSubmission, false),
    status: String(req.body?.status || "PUBLISHED").toUpperCase(),
    createdBy: String(req.user.id),
    createdAt: now(),
    updatedAt: now(),
  };
  db.lmsAssignments.unshift(row);
  writeDB(db);
  res.status(201).json(row);
});

router.get("/assignments/:id/submissions", (req, res) => {
  const db = loadDb();
  const assignmentId = String(req.params.id || "");
  const assignment = db.lmsAssignments.find((x) => String(x.id) === assignmentId);
  if (!assignment) return res.status(404).json({ message: "Assignment not found" });
  const rows = db.lmsAssignmentSubmissions.filter((x) => String(x.assignmentId) === assignmentId);
  if (req.user.role === "STUDENT") return res.json(rows.filter((x) => String(x.studentUserId) === String(req.user.id)));
  if (req.user.role === "PARENT") {
    const kids = new Set(parentChildren(db, req.user).map((x) => String(x.id)));
    return res.json(rows.filter((x) => kids.has(String(x.studentId || ""))));
  }
  const csRow = enrichClassSubject(db, db.lmsClassSubjects.find((x) => String(x.id) === String(assignment.classSubjectId)) || {});
  if (!csRow?.id) return res.status(400).json({ message: "Assignment class-subject mapping is missing" });
  if (!canManageClassSubject(db, req.user, csRow)) return res.status(403).json({ message: "You can only view submissions for your assigned subjects" });
  res.json(rows);
});

router.post("/assignments/:id/submissions", requireRole("STUDENT"), (req, res) => {
  const db = loadDb();
  const assignmentId = String(req.params.id || "");
  const assignment = db.lmsAssignments.find((x) => String(x.id) === assignmentId);
  if (!assignment) return res.status(404).json({ message: "Assignment not found" });
  const allowed = new Set(db.lmsAssignments.filter((x) => visibleClassSubjectIds(db, req.user).has(String(x.classSubjectId)) && String(x.status || "PUBLISHED").toUpperCase() === "PUBLISHED").map((x) => String(x.id)));
  if (!allowed.has(assignmentId)) return res.status(403).json({ message: "You can only submit assignments assigned to your class" });
  const p = profile(db, req.user.studentId);
  if (!p) return res.status(400).json({ message: "Student profile is not linked" });
  const submissionText = String(req.body?.submissionText || "").trim();
  const filePath = String(req.body?.filePath || "").trim();
  if (!submissionText && !filePath) return res.status(400).json({ message: "submissionText or filePath is required" });
  const due = assignment.dueDate ? new Date(assignment.dueDate).getTime() : null;
  const isLate = due ? Date.now() > due : false;
  if (isLate && !assignment.allowLateSubmission) return res.status(400).json({ message: "Late submission is not allowed for this assignment" });
  const idx = db.lmsAssignmentSubmissions.findIndex((x) => String(x.assignmentId) === assignmentId && String(x.studentUserId) === String(req.user.id));
  const row = {
    id: idx >= 0 ? db.lmsAssignmentSubmissions[idx].id : nanoid(),
    assignmentId,
    studentUserId: String(req.user.id),
    studentId: String(p.id),
    studentName: p.name,
    submissionText,
    filePath,
    submittedAt: now(),
    isLate,
    score: idx >= 0 ? db.lmsAssignmentSubmissions[idx].score : null,
    feedback: idx >= 0 ? db.lmsAssignmentSubmissions[idx].feedback : "",
    gradedBy: idx >= 0 ? db.lmsAssignmentSubmissions[idx].gradedBy : "",
    gradedAt: idx >= 0 ? db.lmsAssignmentSubmissions[idx].gradedAt : "",
    status: "SUBMITTED",
    createdAt: idx >= 0 ? db.lmsAssignmentSubmissions[idx].createdAt : now(),
    updatedAt: now(),
  };
  if (idx >= 0) db.lmsAssignmentSubmissions[idx] = row;
  else db.lmsAssignmentSubmissions.unshift(row);
  writeDB(db);
  res.status(idx >= 0 ? 200 : 201).json(row);
});

router.patch("/assignment-submissions/:id/grade", requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = loadDb();
  const id = String(req.params.id || "");
  const idx = db.lmsAssignmentSubmissions.findIndex((x) => String(x.id) === id);
  if (idx < 0) return res.status(404).json({ message: "Submission not found" });
  const sub = db.lmsAssignmentSubmissions[idx];
  const assignment = db.lmsAssignments.find((x) => String(x.id) === String(sub.assignmentId));
  if (!assignment) return res.status(400).json({ message: "Submission assignment is missing" });
  const csRow = enrichClassSubject(db, db.lmsClassSubjects.find((x) => String(x.id) === String(assignment.classSubjectId)) || {});
  if (!csRow?.id) return res.status(400).json({ message: "Class-subject mapping is missing" });
  if (!canManageClassSubject(db, req.user, csRow)) return res.status(403).json({ message: "You can only grade submissions for your assigned subjects" });
  const max = Number(assignment.maxScore || 20);
  let score = sub.score;
  if (req.body?.score !== undefined && req.body?.score !== null && req.body?.score !== "") {
    const n = Number(req.body?.score);
    if (!Number.isFinite(n) || n < 0 || n > max) return res.status(400).json({ message: `score must be between 0 and ${max}` });
    score = n;
  }
  const row = {
    ...sub,
    score,
    feedback: req.body?.feedback !== undefined ? String(req.body?.feedback || "").trim() : sub.feedback,
    status: String(req.body?.status || "GRADED").toUpperCase() === "RETURNED" ? "RETURNED" : "GRADED",
    gradedBy: String(req.user.id),
    gradedAt: now(),
    updatedAt: now(),
  };
  db.lmsAssignmentSubmissions[idx] = row;
  writeDB(db);
  res.json(row);
});
router.get("/quizzes", (req, res) => {
  const db = loadDb();
  const classSubjectId = String(req.query.classSubjectId || "").trim();
  const allowed = visibleClassSubjectIds(db, req.user);
  const rows = db.lmsQuizzes
    .filter((x) => allowed.has(String(x.classSubjectId)))
    .filter((x) => (classSubjectId ? String(x.classSubjectId) === classSubjectId : true))
    .filter((x) => (req.user.role === "STUDENT" || req.user.role === "PARENT" ? String(x.status || "PUBLISHED").toUpperCase() === "PUBLISHED" : true))
    .sort((a, b) => String(a.startAt || a.createdAt || "").localeCompare(String(b.startAt || b.createdAt || "")))
    .map((x) => ({
      ...x,
      questionCount: db.lmsQuizQuestions.filter((q) => String(q.quizId) === String(x.id)).length,
      classSubject: enrichClassSubject(db, db.lmsClassSubjects.find((c) => String(c.id) === String(x.classSubjectId)) || {}),
    }));
  res.json(rows);
});

router.post("/quizzes", requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = loadDb();
  const classSubjectId = String(req.body?.classSubjectId || "").trim();
  const title = String(req.body?.title || "").trim();
  if (!classSubjectId || !title) return res.status(400).json({ message: "classSubjectId and title are required" });
  const csRow = enrichClassSubject(db, db.lmsClassSubjects.find((x) => String(x.id) === classSubjectId) || {});
  if (!csRow?.id) return res.status(404).json({ message: "Class-subject mapping not found" });
  if (!canManageClassSubject(db, req.user, csRow)) return res.status(403).json({ message: "You can only create quizzes for your assigned subjects" });
  const row = {
    id: nanoid(),
    classSubjectId,
    topicId: String(req.body?.topicId || "").trim(),
    lessonId: String(req.body?.lessonId || "").trim(),
    title,
    instructions: String(req.body?.instructions || "").trim(),
    durationMinutes: toInt(req.body?.durationMinutes, 15),
    totalMarks: toInt(req.body?.totalMarks, 20),
    attemptsAllowed: toInt(req.body?.attemptsAllowed, 1),
    shuffleQuestions: toBool(req.body?.shuffleQuestions, false),
    shuffleOptions: toBool(req.body?.shuffleOptions, false),
    status: String(req.body?.status || "PUBLISHED").toUpperCase(),
    startAt: String(req.body?.startAt || "").trim(),
    endAt: String(req.body?.endAt || "").trim(),
    createdBy: String(req.user.id),
    createdAt: now(),
    updatedAt: now(),
  };
  db.lmsQuizzes.unshift(row);
  writeDB(db);
  res.status(201).json(row);
});

router.post("/quizzes/:id/questions", requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = loadDb();
  const quizId = String(req.params.id || "");
  const quiz = db.lmsQuizzes.find((x) => String(x.id) === quizId);
  if (!quiz) return res.status(404).json({ message: "Quiz not found" });
  const csRow = enrichClassSubject(db, db.lmsClassSubjects.find((x) => String(x.id) === String(quiz.classSubjectId)) || {});
  if (!csRow?.id) return res.status(400).json({ message: "Quiz class-subject mapping is missing" });
  if (!canManageClassSubject(db, req.user, csRow)) return res.status(403).json({ message: "You can only add quiz questions for your assigned subjects" });
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [req.body];
  const created = [];
  for (const r of rows) {
    const questionText = String(r?.questionText || "").trim();
    const optionA = String(r?.optionA || "").trim();
    const optionB = String(r?.optionB || "").trim();
    const optionC = String(r?.optionC || "").trim();
    const optionD = String(r?.optionD || "").trim();
    const correctAnswer = String(r?.correctAnswer || "A").trim().toUpperCase();
    if (!questionText || !optionA || !optionB || !optionC || !optionD) continue;
    if (!["A", "B", "C", "D"].includes(correctAnswer)) continue;
    const row = {
      id: nanoid(),
      quizId,
      questionText,
      optionA,
      optionB,
      optionC,
      optionD,
      correctAnswer,
      marks: toInt(r?.marks, 1),
      position: toInt(r?.position, db.lmsQuizQuestions.filter((x) => String(x.quizId) === quizId).length + 1),
      createdAt: now(),
      updatedAt: now(),
    };
    db.lmsQuizQuestions.unshift(row);
    created.push(row);
  }
  if (!created.length) return res.status(400).json({ message: "No valid quiz questions found in payload" });
  writeDB(db);
  res.status(201).json({ created: created.length, rows: created });
});

router.get("/quizzes/:id/questions", (req, res) => {
  const db = loadDb();
  const quizId = String(req.params.id || "");
  const quiz = db.lmsQuizzes.find((x) => String(x.id) === quizId);
  if (!quiz) return res.status(404).json({ message: "Quiz not found" });
  const allowedQuiz = db.lmsQuizzes.some((x) => String(x.id) === quizId && visibleClassSubjectIds(db, req.user).has(String(x.classSubjectId)));
  if (!allowedQuiz) return res.status(403).json({ message: "You can only access quizzes assigned to your role/class" });
  const rows = db.lmsQuizQuestions
    .filter((x) => String(x.quizId) === quizId)
    .sort((a, b) => Number(a.position || 0) - Number(b.position || 0));
  if (req.user.role === "STUDENT" || req.user.role === "PARENT") {
    return res.json(rows.map((x) => ({
      id: x.id,
      quizId: x.quizId,
      questionText: x.questionText,
      optionA: x.optionA,
      optionB: x.optionB,
      optionC: x.optionC,
      optionD: x.optionD,
      marks: x.marks,
      position: x.position,
    })));
  }
  res.json(rows);
});

router.post("/quizzes/:id/start", requireRole("STUDENT"), (req, res) => {
  const db = loadDb();
  const quizId = String(req.params.id || "");
  const quiz = db.lmsQuizzes.find((x) => String(x.id) === quizId);
  if (!quiz) return res.status(404).json({ message: "Quiz not found" });
  const allowedQuiz = db.lmsQuizzes.some((x) => String(x.id) === quizId && visibleClassSubjectIds(db, req.user).has(String(x.classSubjectId)));
  if (!allowedQuiz) return res.status(403).json({ message: "You can only start quizzes assigned to your class" });
  if (String(quiz.status || "DRAFT").toUpperCase() !== "PUBLISHED") return res.status(400).json({ message: "Quiz is not published" });
  const nowTs = Date.now();
  if (quiz.startAt && nowTs < new Date(quiz.startAt).getTime()) return res.status(400).json({ message: "Quiz has not started yet" });
  if (quiz.endAt && nowTs > new Date(quiz.endAt).getTime()) return res.status(400).json({ message: "Quiz has ended" });
  const p = profile(db, req.user.studentId);
  if (!p) return res.status(400).json({ message: "Student profile is not linked" });
  const tries = db.lmsQuizAttempts.filter((x) => String(x.quizId) === quizId && String(x.studentUserId) === String(req.user.id));
  const active = tries.find((x) => String(x.status) === "in_progress");
  if (active) {
    const qRows = db.lmsQuizQuestions.filter((x) => String(x.quizId) === quizId).sort((a, b) => Number(a.position || 0) - Number(b.position || 0));
    return res.json({ attempt: active, questions: qRows.map((x) => ({ id: x.id, questionText: x.questionText, optionA: x.optionA, optionB: x.optionB, optionC: x.optionC, optionD: x.optionD, marks: x.marks, position: x.position })) });
  }
  if (tries.filter((x) => String(x.status) !== "in_progress").length >= Number(quiz.attemptsAllowed || 1)) return res.status(400).json({ message: "Maximum attempt limit reached for this quiz" });
  let questions = db.lmsQuizQuestions.filter((x) => String(x.quizId) === quizId).sort((a, b) => Number(a.position || 0) - Number(b.position || 0));
  if (toBool(quiz.shuffleQuestions, false)) questions = [...questions].sort(() => Math.random() - 0.5);
  const attempt = {
    id: nanoid(),
    quizId,
    studentUserId: String(req.user.id),
    studentId: String(p.id),
    studentName: p.name,
    startedAt: now(),
    submittedAt: "",
    score: 0,
    totalMarks: Number(quiz.totalMarks || 0),
    percentage: 0,
    status: "in_progress",
    createdAt: now(),
    updatedAt: now(),
  };
  db.lmsQuizAttempts.unshift(attempt);
  writeDB(db);
  res.status(201).json({
    attempt,
    questions: questions.map((x) => ({ id: x.id, questionText: x.questionText, optionA: x.optionA, optionB: x.optionB, optionC: x.optionC, optionD: x.optionD, marks: x.marks, position: x.position })),
  });
});

router.post("/quiz-attempts/:id/answer", requireRole("STUDENT"), (req, res) => {
  const db = loadDb();
  const attemptId = String(req.params.id || "");
  const idx = db.lmsQuizAttempts.findIndex((x) => String(x.id) === attemptId);
  if (idx < 0) return res.status(404).json({ message: "Quiz attempt not found" });
  const attempt = db.lmsQuizAttempts[idx];
  if (String(attempt.studentUserId) !== String(req.user.id)) return res.status(403).json({ message: "You can only answer your own quiz attempt" });
  if (String(attempt.status) !== "in_progress") return res.status(400).json({ message: "Quiz attempt is already submitted" });
  const questionId = String(req.body?.questionId || "").trim();
  const selectedOption = String(req.body?.selectedOption || "").trim().toUpperCase();
  if (!questionId || !["A", "B", "C", "D"].includes(selectedOption)) return res.status(400).json({ message: "questionId and selectedOption (A-D) are required" });
  const q = db.lmsQuizQuestions.find((x) => String(x.id) === questionId && String(x.quizId) === String(attempt.quizId));
  if (!q) return res.status(400).json({ message: "Question does not belong to this quiz" });
  const aIdx = db.lmsQuizAnswers.findIndex((x) => String(x.quizAttemptId) === attemptId && String(x.quizQuestionId) === questionId);
  const row = {
    id: aIdx >= 0 ? db.lmsQuizAnswers[aIdx].id : nanoid(),
    quizAttemptId: attemptId,
    quizQuestionId: questionId,
    selectedOption,
    isCorrect: false,
    marksAwarded: 0,
    createdAt: aIdx >= 0 ? db.lmsQuizAnswers[aIdx].createdAt : now(),
    updatedAt: now(),
  };
  if (aIdx >= 0) db.lmsQuizAnswers[aIdx] = row;
  else db.lmsQuizAnswers.unshift(row);
  db.lmsQuizAttempts[idx] = { ...attempt, updatedAt: now() };
  writeDB(db);
  res.json(row);
});

router.post("/quiz-attempts/:id/submit", requireRole("STUDENT"), (req, res) => {
  const db = loadDb();
  const attemptId = String(req.params.id || "");
  const idx = db.lmsQuizAttempts.findIndex((x) => String(x.id) === attemptId);
  if (idx < 0) return res.status(404).json({ message: "Quiz attempt not found" });
  const attempt = db.lmsQuizAttempts[idx];
  if (String(attempt.studentUserId) !== String(req.user.id)) return res.status(403).json({ message: "You can only submit your own quiz attempt" });
  if (String(attempt.status) !== "in_progress") return res.status(400).json({ message: "Quiz attempt is already submitted" });
  const quiz = db.lmsQuizzes.find((x) => String(x.id) === String(attempt.quizId));
  if (!quiz) return res.status(400).json({ message: "Quiz record no longer exists" });
  const questions = db.lmsQuizQuestions.filter((x) => String(x.quizId) === String(quiz.id));
  const answers = db.lmsQuizAnswers.filter((x) => String(x.quizAttemptId) === attemptId);
  const byQ = new Map(answers.map((x) => [String(x.quizQuestionId), x]));
  let score = 0;
  let totalMarks = 0;
  for (const q of questions) {
    const m = Number(q.marks || 1);
    totalMarks += m;
    const a = byQ.get(String(q.id));
    if (!a) continue;
    const ok = String(a.selectedOption || "").toUpperCase() === String(q.correctAnswer || "").toUpperCase();
    const marksAwarded = ok ? m : 0;
    score += marksAwarded;
    const aIdx = db.lmsQuizAnswers.findIndex((x) => String(x.id) === String(a.id));
    if (aIdx >= 0) {
      db.lmsQuizAnswers[aIdx] = {
        ...db.lmsQuizAnswers[aIdx],
        isCorrect: ok,
        marksAwarded,
        updatedAt: now(),
      };
    }
  }
  const percentage = totalMarks ? Number(((score / totalMarks) * 100).toFixed(2)) : 0;
  const row = {
    ...attempt,
    submittedAt: now(),
    score,
    totalMarks,
    percentage,
    status: "submitted",
    updatedAt: now(),
  };
  db.lmsQuizAttempts[idx] = row;
  writeDB(db);
  res.json(row);
});

router.get("/quiz-attempts", (req, res) => {
  const db = loadDb();
  const allowedQuizIds = new Set(db.lmsQuizzes.filter((x) => visibleClassSubjectIds(db, req.user).has(String(x.classSubjectId))).map((x) => String(x.id)));
  let rows = db.lmsQuizAttempts.filter((x) => allowedQuizIds.has(String(x.quizId)));
  if (req.user.role === "STUDENT") rows = rows.filter((x) => String(x.studentUserId) === String(req.user.id));
  if (req.user.role === "PARENT") {
    const kids = new Set(parentChildren(db, req.user).map((x) => String(x.id)));
    rows = rows.filter((x) => kids.has(String(x.studentId || "")));
  }
  rows = rows
    .map((x) => ({
      ...x,
      quizTitle: db.lmsQuizzes.find((q) => String(q.id) === String(x.quizId))?.title || "",
      classSubject: enrichClassSubject(
        db,
        db.lmsClassSubjects.find((csx) => {
          const q = db.lmsQuizzes.find((qq) => String(qq.id) === String(x.quizId));
          return q ? String(csx.id) === String(q.classSubjectId) : false;
        }) || {}
      ),
    }))
    .sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));
  res.json(rows);
});

router.get("/announcements", (req, res) => {
  const db = loadDb();
  const rows = visibleAnnouncements(db, req.user).sort((a, b) => String(b.publishedAt || b.createdAt || "").localeCompare(String(a.publishedAt || a.createdAt || "")));
  res.json(rows);
});

router.post("/announcements", requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = loadDb();
  const title = String(req.body?.title || "").trim();
  const message = String(req.body?.message || "").trim();
  const targetType = String(req.body?.targetType || "school").trim().toLowerCase();
  const targetId = String(req.body?.targetId || "").trim();
  if (!title || !message) return res.status(400).json({ message: "title and message are required" });
  if (!["school", "class", "class_subject"].includes(targetType)) return res.status(400).json({ message: "targetType must be school, class, or class_subject" });
  if (targetType !== "school" && !targetId) return res.status(400).json({ message: "targetId is required for class/class_subject announcements" });
  if (req.user.role === "TEACHER") {
    if (targetType === "class") {
      const ok = new Set(visibleClassIds(db, req.user)).has(targetId);
      if (!ok) return res.status(403).json({ message: "You can only publish announcements for your assigned classes" });
    }
    if (targetType === "class_subject") {
      const ok = visibleClassSubjectIds(db, req.user).has(targetId);
      if (!ok) return res.status(403).json({ message: "You can only publish announcements for your assigned class subjects" });
    }
  }
  const row = {
    id: nanoid(),
    title,
    message,
    targetType,
    targetId,
    publishedBy: String(req.user.id),
    publishedAt: now(),
    status: String(req.body?.status || "PUBLISHED").toUpperCase(),
    createdAt: now(),
    updatedAt: now(),
  };
  db.lmsAnnouncements.unshift(row);
  writeDB(db);
  res.status(201).json(row);
});

router.get("/reports/overview", (req, res) => {
  const db = loadDb();
  const csIds = visibleClassSubjectIds(db, req.user);
  const lessons = db.lmsLessons.filter((x) => csIds.has(String(x.classSubjectId)));
  const assignments = db.lmsAssignments.filter((x) => csIds.has(String(x.classSubjectId)));
  const quizzes = db.lmsQuizzes.filter((x) => csIds.has(String(x.classSubjectId)));
  const submissions = db.lmsAssignmentSubmissions.filter((x) => {
    const a = db.lmsAssignments.find((r) => String(r.id) === String(x.assignmentId));
    return a ? csIds.has(String(a.classSubjectId)) : false;
  });
  const attempts = db.lmsQuizAttempts.filter((x) => {
    const q = db.lmsQuizzes.find((r) => String(r.id) === String(x.quizId));
    return q ? csIds.has(String(q.classSubjectId)) : false;
  });
  const virtualClasses = (Array.isArray(db.lmsVirtualClasses) ? db.lmsVirtualClasses : []).filter((item) =>
    csIds.has(String(item.classSubjectId))
  );
  const virtualSummary = summarizeVirtualClasses(db, virtualClasses);
  res.json({
    role: req.user.role,
    totals: {
      classSubjects: csIds.size,
      lessons: lessons.length,
      assignments: assignments.length,
      submissions: submissions.length,
      quizzes: quizzes.length,
      attempts: attempts.length,
      virtualClasses: virtualSummary.totalVirtualClasses,
      upcomingVirtualClasses: virtualSummary.upcomingVirtualClasses,
      liveVirtualClasses: virtualSummary.liveVirtualClasses,
      completedVirtualClasses: virtualSummary.completedVirtualClasses,
      recordingsAvailable: virtualSummary.recordingsAvailable,
      averageVirtualAttendanceRate: virtualSummary.averageVirtualAttendanceRate,
    },
  });
});

module.exports = router;
