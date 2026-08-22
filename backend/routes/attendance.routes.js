const express = require("express");
const { nanoid } = require("nanoid");
const { readDB, writeDB } = require("../lib/jsonStore");
const { DEFAULT_CLASSES } = require("../lib/defaultClasses");
const { auth, requireRole } = require("../middleware/auth");
const { isTeacherRole } = require("../lib/roles");

const router = express.Router();

const ATTENDANCE_STATUSES = ["present", "absent", "late", "excused"];
const STATUS_ALIASES = {
  p: "present",
  present: "present",
  a: "absent",
  absent: "absent",
  l: "late",
  late: "late",
  e: "excused",
  excused: "excused",
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function isoNow() {
  return new Date().toISOString();
}

function normalizeClassKey(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return todayIsoDate();

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function normalizeStatus(value) {
  const key = String(value || "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");

  return STATUS_ALIASES[key] || "";
}

function classIdFromName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function ensureAttendanceShape(db) {
  if (!Array.isArray(db.classes)) db.classes = [];
  if (!Array.isArray(db.students)) db.students = [];
  if (!Array.isArray(db.users)) db.users = [];

  if (!Array.isArray(db.attendanceSessions)) db.attendanceSessions = [];
  if (!Array.isArray(db.attendanceRecords)) db.attendanceRecords = [];
  if (!Array.isArray(db.attendance)) db.attendance = [];

  const byId = new Map();
  const byNameKey = new Map();

  const addClass = (item) => {
    const name = String(item?.name || item?.className || "").trim();
    const id = String(item?.id || item?.classId || classIdFromName(name)).trim();
    if (!name || !id) return;

    const key = normalizeClassKey(name);
    const existingById = byId.get(id);

    if (existingById) {
      existingById.name = existingById.name || name;
      existingById.section = existingById.section || String(item?.section || "Other");
      existingById.order = existingById.order ?? Number(item?.order ?? 999);
      existingById.teacherId = String(existingById.teacherId || item?.teacherId || "");
      return;
    }

    const existingByName = byNameKey.get(key);
    if (existingByName) {
      if (!existingByName.id) existingByName.id = id;
      if (!existingByName.section) existingByName.section = String(item?.section || "Other");
      if (existingByName.order == null) existingByName.order = Number(item?.order ?? 999);
      if (!existingByName.teacherId) existingByName.teacherId = String(item?.teacherId || "");
      byId.set(String(existingByName.id), existingByName);
      return;
    }

    const row = {
      id,
      name,
      section: String(item?.section || "Other"),
      order: Number(item?.order ?? 999),
      teacherId: String(item?.teacherId || ""),
    };

    byId.set(id, row);
    byNameKey.set(key, row);
  };

  for (const item of db.classes) addClass(item);
  for (const student of db.students) {
    addClass({
      id: student.classId,
      name: student.className,
      section: "Other",
      order: 999,
    });
  }
  for (const item of DEFAULT_CLASSES) {
    addClass({
      id: classIdFromName(item.name),
      name: item.name,
      section: item.section,
      order: item.order,
    });
  }

  db.classes = sortClasses(Array.from(byId.values()));
}

function sortClasses(classes) {
  return [...(Array.isArray(classes) ? classes : [])].sort((a, b) => {
    const orderA = Number(a.order ?? 999);
    const orderB = Number(b.order ?? 999);
    if (orderA !== orderB) return orderA - orderB;
    return String(a.name || "").localeCompare(String(b.name || ""));
  });
}

function getClasses(db) {
  return sortClasses(db.classes || []);
}

function getClassById(db, classId) {
  return (
    getClasses(db).find((item) => String(item.id) === String(classId)) ||
    getClasses(db).find((item) => normalizeClassKey(item.name) === normalizeClassKey(classId)) ||
    null
  );
}
function getUsersById(db) {
  return new Map((db.users || []).map((item) => [String(item.id), item]));
}

function getTeacherUsers(db) {
  return (db.users || [])
    .filter((item) => isTeacherRole(item.role))
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
}

function getTeacherAssignedClassIds(db, teacherId) {
  const id = String(teacherId || "");
  if (!id) return [];

  return getClasses(db)
    .filter((cls) => String(cls.teacherId || "") === id || String(cls.classTeacherId || "") === id)
    .map((cls) => String(cls.id));
}

function canAccessClass(db, user, classId) {
  const safeClassId = String(classId || "");
  if (!safeClassId) return false;

  if (user?.role === "ADMIN") return true;
  if (user?.role !== "TEACHER") return false;

  const assigned = getTeacherAssignedClassIds(db, user.id);
  return assigned.includes(safeClassId);
}

function getAccessibleClasses(db, user) {
  const classes = getClasses(db);

  if (user?.role === "ADMIN") return classes;
  if (user?.role !== "TEACHER") return [];

  const allowed = new Set(getTeacherAssignedClassIds(db, user.id));
  return classes.filter((cls) => allowed.has(String(cls.id)));
}

function getStudents(db, classId) {
  const classMap = new Map(getClasses(db).map((item) => [String(item.id), item]));
  const classKey = normalizeClassKey(classId);

  return (db.students || [])
    .filter((student) => {
      if (!classId) return true;
      if (String(student.classId) === String(classId)) return true;
      return normalizeClassKey(student.className) === classKey;
    })
    .map((student) => {
      const cls = classMap.get(String(student.classId));
      const firstName = String(student.firstName || "").trim();
      const lastName = String(student.lastName || "").trim();
      const fullName = [firstName, lastName].filter(Boolean).join(" ").trim() || String(student.name || "");

      return {
        id: String(student.id),
        name: fullName,
        classId: String(student.classId || ""),
        className: String(student.className || cls?.name || ""),
        studentPhone: String(student.studentPhone || ""),
        parentPhone: String(student.parentPhone || ""),
      };
    })
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
}

function getSessionRecords(db, attendanceSessionId) {
  return (db.attendanceRecords || []).filter(
    (item) => String(item.attendanceSessionId) === String(attendanceSessionId)
  );
}

function buildStatusCounts(records) {
  const counts = {
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
  };

  for (const row of records) {
    const status = normalizeStatus(row.status);
    if (!status) continue;
    counts[status] += 1;
  }

  return counts;
}

function inDateRange(date, startDate, endDate) {
  const safeDate = normalizeDate(date);
  if (!safeDate) return false;

  if (startDate && safeDate < startDate) return false;
  if (endDate && safeDate > endDate) return false;
  return true;
}

function syncLegacyAttendanceList(db) {
  const classById = new Map(getClasses(db).map((item) => [String(item.id), item]));
  const usersById = getUsersById(db);
  const studentsById = new Map((db.students || []).map((item) => [String(item.id), item]));
  const sessionsById = new Map((db.attendanceSessions || []).map((item) => [String(item.id), item]));

  db.attendance = (db.attendanceRecords || [])
    .map((record) => {
      const session = sessionsById.get(String(record.attendanceSessionId));
      if (!session) return null;

      const student = studentsById.get(String(record.studentId));
      const cls = classById.get(String(session.classId));
      const marker = usersById.get(String(session.markedBy));

      return {
        id: String(record.id),
        attendanceSessionId: String(session.id),
        classId: String(session.classId),
        className: String(cls?.name || ""),
        studentId: String(record.studentId || ""),
        student: String(student?.name || ""),
        status: normalizeStatus(record.status) || String(record.status || ""),
        remark: String(record.remark || ""),
        reason: String(record.reason || ""),
        date: String(session.attendanceDate || ""),
        markedBy: String(session.markedBy || ""),
        markedByName: String(marker?.name || ""),
        markedAt: String(record.markedAt || session.submittedAt || ""),
      };
    })
    .filter(Boolean)
    .sort((a, b) => `${b.date}-${b.markedAt}`.localeCompare(`${a.date}-${a.markedAt}`));
}

function buildSessionPayload(db, session, students) {
  const usersById = getUsersById(db);
  const studentById = new Map((students || []).map((item) => [String(item.id), item]));

  const records = getSessionRecords(db, session.id).map((record) => {
    const student = studentById.get(String(record.studentId));
    return {
      id: record.id,
      attendanceSessionId: String(record.attendanceSessionId),
      studentId: String(record.studentId),
      studentName: String(student?.name || ""),
      status: normalizeStatus(record.status) || "",
      remark: String(record.remark || ""),
      reason: String(record.reason || ""),
      markedAt: String(record.markedAt || ""),
    };
  });

  const counts = buildStatusCounts(records);

  return {
    id: session.id,
    classId: String(session.classId),
    attendanceDate: String(session.attendanceDate),
    academicSession: String(session.academicSession || ""),
    term: String(session.term || ""),
    comment: String(session.comment || ""),
    status: String(session.status || "SUBMITTED"),
    markedBy: String(session.markedBy || ""),
    markedByName: String(usersById.get(String(session.markedBy))?.name || ""),
    submittedAt: String(session.submittedAt || ""),
    createdAt: String(session.createdAt || ""),
    summary: {
      totalStudents: students.length,
      markedCount: records.length,
      ...counts,
    },
    records,
  };
}

router.get("/classes", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = readDB();
  ensureAttendanceShape(db);

  const usersById = getUsersById(db);
  const accessible = getAccessibleClasses(db, req.user);

  const payload = accessible.map((cls) => {
    const teacher = usersById.get(String(cls.teacherId || cls.classTeacherId || ""));
    const studentCount = getStudents(db, cls.id).length;
    return {
      id: String(cls.id),
      name: String(cls.name || ""),
      section: String(cls.section || ""),
      order: Number(cls.order ?? 999),
      teacherId: String(cls.teacherId || cls.classTeacherId || ""),
      teacherName: String(teacher?.name || ""),
      studentCount,
    };
  });

  res.json(payload);
});

router.get("/teachers", auth(), requireRole("ADMIN"), (req, res) => {
  const db = readDB();
  ensureAttendanceShape(db);

  res.json(
    getTeacherUsers(db).map((teacher) => ({
      id: String(teacher.id),
      name: String(teacher.name || ""),
      username: String(teacher.username || ""),
      phone: String(teacher.phone || ""),
    }))
  );
});

router.patch("/classes/:classId/teacher", auth(), requireRole("ADMIN"), (req, res) => {
  const db = readDB();
  ensureAttendanceShape(db);

  const classId = String(req.params.classId || "").trim();
  if (!classId) return res.status(400).json({ message: "classId is required" });

  const idx = (db.classes || []).findIndex((item) => String(item.id) === classId);
  if (idx < 0) return res.status(404).json({ message: "Class not found" });

  const teacherId = String(req.body?.teacherId || "").trim();
  if (teacherId) {
    const teacher = (db.users || []).find((item) => isTeacherRole(item.role) && String(item.id) === teacherId);
    if (!teacher) return res.status(400).json({ message: "Invalid teacherId" });
  }

  db.classes[idx] = {
    ...db.classes[idx],
    teacherId,
  };

  writeDB(db);

  const teacher = (db.users || []).find((item) => String(item.id) === teacherId);
  return res.json({
    id: String(db.classes[idx].id),
    name: String(db.classes[idx].name || ""),
    teacherId,
    teacherName: String(teacher?.name || ""),
  });
});

router.get("/students", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = readDB();
  ensureAttendanceShape(db);

  const classId = String(req.query.classId || "").trim();
  const accessibleClasses = getAccessibleClasses(db, req.user);
  const accessibleClassIds = new Set(accessibleClasses.map((item) => String(item.id)));

  if (classId) {
    if (!accessibleClassIds.has(classId)) {
      return res.status(403).json({ message: "You are not allowed to access this class." });
    }

    return res.json(getStudents(db, classId));
  }

  if (req.user.role === "TEACHER") {
    const rows = Array.from(accessibleClassIds).flatMap((id) => getStudents(db, id));
    const dedupe = new Map(rows.map((item) => [String(item.id), item]));
    return res.json(Array.from(dedupe.values()));
  }

  return res.json(getStudents(db, ""));
});

router.get("/session", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = readDB();
  ensureAttendanceShape(db);

  const classId = String(req.query.classId || "").trim();
  const attendanceDate = normalizeDate(req.query.attendanceDate || req.query.date);

  if (!classId) return res.status(400).json({ message: "classId is required" });
  if (!attendanceDate) return res.status(400).json({ message: "Invalid attendanceDate" });

  if (!canAccessClass(db, req.user, classId)) {
    return res.status(403).json({ message: "You are not assigned to this class." });
  }

  const cls = getClassById(db, classId);
  if (!cls) return res.status(404).json({ message: "Class not found" });

  const students = getStudents(db, classId);
  const session = (db.attendanceSessions || []).find(
    (item) => String(item.classId) === classId && String(item.attendanceDate) === attendanceDate
  );

  if (!session) {
    return res.json({
      class: {
        id: String(cls.id),
        name: String(cls.name || ""),
      },
      session: null,
      attendanceDate,
      students: students.map((student) => ({
        studentId: String(student.id),
        studentName: String(student.name || ""),
        status: "",
        remark: "",
        reason: "",
      })),
      summary: {
        totalStudents: students.length,
        markedCount: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
      },
    });
  }

  const payload = buildSessionPayload(db, session, students);
  return res.json({
    class: {
      id: String(cls.id),
      name: String(cls.name || ""),
    },
    attendanceDate,
    session: payload,
    students: students.map((student) => {
      const row = payload.records.find((item) => String(item.studentId) === String(student.id));
      return {
        studentId: String(student.id),
        studentName: String(student.name || ""),
        status: row?.status || "",
        remark: row?.remark || "",
        reason: row?.reason || "",
      };
    }),
    summary: payload.summary,
  });
});

router.post("/session", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = readDB();
  ensureAttendanceShape(db);

  const classId = String(req.body?.classId || "").trim();
  const attendanceDate = normalizeDate(req.body?.attendanceDate || req.body?.date);
  const academicSession = String(req.body?.academicSession || req.body?.session || "").trim();
  const term = String(req.body?.term || "").trim();
  const comment = String(req.body?.comment || "").trim();

  if (!classId) return res.status(400).json({ message: "classId is required" });
  if (!attendanceDate) return res.status(400).json({ message: "Invalid attendanceDate" });

  if (!canAccessClass(db, req.user, classId)) {
    return res.status(403).json({ message: "You are not assigned to this class." });
  }

  const cls = getClassById(db, classId);
  if (!cls) return res.status(404).json({ message: "Class not found" });

  const students = getStudents(db, classId);
  const studentsById = new Map(students.map((item) => [String(item.id), item]));

  const inputRecords = Array.isArray(req.body?.records) ? req.body.records : [];
  if (inputRecords.length === 0) {
    return res.status(400).json({ message: "records are required" });
  }

  const seen = new Set();
  const normalizedRecords = [];

  for (const row of inputRecords) {
    const studentId = String(row?.studentId || "").trim();
    const status = normalizeStatus(row?.status);

    if (!studentId) return res.status(400).json({ message: "Each record requires studentId" });
    if (!status) {
      return res.status(400).json({
        message: `Invalid status for student ${studentId}. Use one of: ${ATTENDANCE_STATUSES.join(", ")}`,
      });
    }
    if (!studentsById.has(studentId)) {
      return res.status(400).json({ message: `Student ${studentId} is not in class ${cls.name}` });
    }

    if (seen.has(studentId)) {
      return res.status(400).json({ message: `Duplicate record for student ${studentId}` });
    }

    seen.add(studentId);
    normalizedRecords.push({
      studentId,
      status,
      remark: String(row?.remark || "").trim(),
      reason: String(row?.reason || "").trim(),
    });
  }

  const now = isoNow();
  const sessions = db.attendanceSessions || [];

  let session = sessions.find(
    (item) => String(item.classId) === classId && String(item.attendanceDate) === attendanceDate
  );

  if (!session) {
    session = {
      id: nanoid(),
      classId,
      attendanceDate,
      academicSession,
      term,
      comment,
      status: "SUBMITTED",
      markedBy: String(req.user.id || ""),
      submittedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    sessions.unshift(session);
  } else {
    session.academicSession = academicSession;
    session.term = term;
    session.comment = comment;
    session.status = "SUBMITTED";
    session.markedBy = String(req.user.id || "");
    session.submittedAt = now;
    session.updatedAt = now;
  }

  db.attendanceSessions = sessions;
  db.attendanceRecords = (db.attendanceRecords || []).filter(
    (item) => String(item.attendanceSessionId) !== String(session.id)
  );

  const nextRecords = normalizedRecords.map((row) => ({
    id: nanoid(),
    attendanceSessionId: String(session.id),
    studentId: row.studentId,
    status: row.status,
    remark: row.remark,
    reason: row.reason,
    markedAt: now,
  }));

  db.attendanceRecords.unshift(...nextRecords);

  syncLegacyAttendanceList(db);
  writeDB(db);

  const payload = buildSessionPayload(db, session, students);
  return res.status(201).json({
    class: {
      id: String(cls.id),
      name: String(cls.name || ""),
    },
    session: payload,
  });
});

router.get("/sessions", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = readDB();
  ensureAttendanceShape(db);

  const classId = String(req.query.classId || "").trim();
  const startDate = normalizeDate(req.query.startDate);
  const endDate = normalizeDate(req.query.endDate);
  const term = String(req.query.term || "").trim();
  const academicSession = String(req.query.academicSession || req.query.session || "").trim();

  const classes = getClasses(db);
  const classById = new Map(classes.map((item) => [String(item.id), item]));
  const usersById = getUsersById(db);

  const accessibleClasses = getAccessibleClasses(db, req.user);
  const accessibleClassIds = new Set(accessibleClasses.map((item) => String(item.id)));

  if (classId && !accessibleClassIds.has(classId)) {
    return res.status(403).json({ message: "You are not assigned to this class." });
  }

  const rows = (db.attendanceSessions || [])
    .filter((item) => {
      const rowClassId = String(item.classId || "");
      if (!accessibleClassIds.has(rowClassId)) return false;
      if (classId && rowClassId !== classId) return false;
      if (term && String(item.term || "") !== term) return false;
      if (academicSession && String(item.academicSession || "") !== academicSession) return false;

      const safeDate = normalizeDate(item.attendanceDate);
      if (!safeDate) return false;
      return inDateRange(safeDate, startDate, endDate);
    })
    .map((item) => {
      const records = getSessionRecords(db, item.id);
      const counts = buildStatusCounts(records);
      return {
        id: String(item.id),
        classId: String(item.classId),
        className: String(classById.get(String(item.classId))?.name || ""),
        attendanceDate: String(item.attendanceDate || ""),
        academicSession: String(item.academicSession || ""),
        term: String(item.term || ""),
        status: String(item.status || "SUBMITTED"),
        markedBy: String(item.markedBy || ""),
        markedByName: String(usersById.get(String(item.markedBy))?.name || ""),
        submittedAt: String(item.submittedAt || ""),
        summary: {
          totalStudents: getStudents(db, item.classId).length,
          markedCount: records.length,
          ...counts,
        },
      };
    })
    .sort((a, b) => `${b.attendanceDate}-${b.submittedAt}`.localeCompare(`${a.attendanceDate}-${a.submittedAt}`));

  return res.json(rows);
});

router.get("/reports/class", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = readDB();
  ensureAttendanceShape(db);

  const classId = String(req.query.classId || "").trim();
  const startDate = normalizeDate(req.query.startDate);
  const endDate = normalizeDate(req.query.endDate);
  const term = String(req.query.term || "").trim();
  const academicSession = String(req.query.academicSession || req.query.session || "").trim();

  if (!classId) return res.status(400).json({ message: "classId is required" });
  if (!canAccessClass(db, req.user, classId)) {
    return res.status(403).json({ message: "You are not assigned to this class." });
  }

  const cls = getClassById(db, classId);
  if (!cls) return res.status(404).json({ message: "Class not found" });

  const students = getStudents(db, classId);
  const studentsById = new Map(students.map((item) => [String(item.id), item]));
  const usersById = getUsersById(db);

  const sessions = (db.attendanceSessions || [])
    .filter((item) => {
      if (String(item.classId) !== classId) return false;
      if (term && String(item.term || "") !== term) return false;
      if (academicSession && String(item.academicSession || "") !== academicSession) return false;
      return inDateRange(item.attendanceDate, startDate, endDate);
    })
    .sort((a, b) => String(a.attendanceDate || "").localeCompare(String(b.attendanceDate || "")));

  const sessionIds = new Set(sessions.map((item) => String(item.id)));
  const records = (db.attendanceRecords || []).filter((item) => sessionIds.has(String(item.attendanceSessionId)));

  const studentStatsMap = new Map(
    students.map((student) => [
      String(student.id),
      {
        studentId: String(student.id),
        studentName: String(student.name || ""),
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        markedCount: 0,
        attendancePercentage: 0,
        absenceAlert: false,
      },
    ])
  );

  for (const row of records) {
    const studentId = String(row.studentId || "");
    if (!studentStatsMap.has(studentId)) continue;

    const status = normalizeStatus(row.status);
    if (!status) continue;

    const item = studentStatsMap.get(studentId);
    item[status] += 1;
    item.markedCount += 1;
  }

  const expectedSessions = sessions.length;
  const studentStats = Array.from(studentStatsMap.values())
    .map((item) => {
      const attended = item.present + item.late;
      item.attendancePercentage = expectedSessions
        ? Number(((attended / expectedSessions) * 100).toFixed(2))
        : 0;
      item.absenceAlert = item.absent >= 3;
      return item;
    })
    .sort((a, b) => String(a.studentName || "").localeCompare(String(b.studentName || "")));

  const totals = buildStatusCounts(records);

  const dailyRegisters = sessions.map((sessionRow) => {
    const dayRecords = records.filter(
      (item) => String(item.attendanceSessionId) === String(sessionRow.id)
    );

    return {
      attendanceDate: String(sessionRow.attendanceDate || ""),
      classId: String(sessionRow.classId || ""),
      className: String(cls.name || ""),
      markedBy: String(sessionRow.markedBy || ""),
      markedByName: String(usersById.get(String(sessionRow.markedBy))?.name || ""),
      submittedAt: String(sessionRow.submittedAt || ""),
      status: String(sessionRow.status || "SUBMITTED"),
      summary: {
        totalStudents: students.length,
        markedCount: dayRecords.length,
        ...buildStatusCounts(dayRecords),
      },
    };
  });

  const trendMap = new Map();
  for (const day of dailyRegisters) {
    const bucket = String(day.attendanceDate || "").slice(0, 7);
    if (!bucket) continue;
    if (!trendMap.has(bucket)) {
      trendMap.set(bucket, { period: bucket, present: 0, absent: 0, late: 0, excused: 0, records: 0 });
    }
    const entry = trendMap.get(bucket);
    entry.present += Number(day.summary.present || 0);
    entry.absent += Number(day.summary.absent || 0);
    entry.late += Number(day.summary.late || 0);
    entry.excused += Number(day.summary.excused || 0);
    entry.records += Number(day.summary.markedCount || 0);
  }

  const monthlyTrend = Array.from(trendMap.values())
    .map((item) => ({
      ...item,
      attendanceRate: item.records
        ? Number((((item.present + item.late) / item.records) * 100).toFixed(2))
        : 0,
    }))
    .sort((a, b) => String(a.period).localeCompare(String(b.period)));

  return res.json({
    class: {
      id: String(cls.id),
      name: String(cls.name || ""),
      section: String(cls.section || ""),
    },
    filters: {
      classId,
      startDate,
      endDate,
      term,
      academicSession,
    },
    totals: {
      totalSessions: sessions.length,
      totalStudents: students.length,
      totalRecords: records.length,
      ...totals,
    },
    studentStats,
    dailyRegisters,
    monthlyTrend,
  });
});

router.get("/reports/admin-overview", auth(), requireRole("ADMIN"), (req, res) => {
  const db = readDB();
  ensureAttendanceShape(db);

  const targetDate = normalizeDate(req.query.date) || todayIsoDate();

  const classes = getClasses(db);
  const usersById = getUsersById(db);
  const teachers = getTeacherUsers(db);

  const sessionsToday = (db.attendanceSessions || []).filter(
    (item) => String(item.attendanceDate || "") === targetDate
  );

  const sessionByClassId = new Map(
    sessionsToday.map((item) => [String(item.classId), item])
  );

  const classesMarkedToday = classes
    .filter((cls) => sessionByClassId.has(String(cls.id)))
    .map((cls) => ({
      classId: String(cls.id),
      className: String(cls.name || ""),
      markedBy: String(sessionByClassId.get(String(cls.id))?.markedBy || ""),
      markedByName: String(
        usersById.get(String(sessionByClassId.get(String(cls.id))?.markedBy || ""))?.name || ""
      ),
      submittedAt: String(sessionByClassId.get(String(cls.id))?.submittedAt || ""),
    }));

  const classesNotMarkedToday = classes
    .filter((cls) => !sessionByClassId.has(String(cls.id)))
    .map((cls) => ({
      classId: String(cls.id),
      className: String(cls.name || ""),
      section: String(cls.section || ""),
      teacherId: String(cls.teacherId || ""),
      teacherName: String(usersById.get(String(cls.teacherId || ""))?.name || ""),
    }));

  const sessionIdsToday = new Set(sessionsToday.map((item) => String(item.id)));
  const recordsToday = (db.attendanceRecords || []).filter((row) =>
    sessionIdsToday.has(String(row.attendanceSessionId))
  );

  const staffCompliance = teachers.map((teacher) => {
    const assignedClassIds = getTeacherAssignedClassIds(db, teacher.id);
    const markedAssigned = sessionsToday.filter(
      (item) => assignedClassIds.includes(String(item.classId)) && String(item.markedBy) === String(teacher.id)
    );

    const expected = assignedClassIds.length;
    const marked = markedAssigned.length;

    return {
      teacherId: String(teacher.id),
      teacherName: String(teacher.name || ""),
      assignedClasses: expected,
      markedToday: marked,
      compliancePercent: expected ? Number(((marked / expected) * 100).toFixed(2)) : null,
    };
  });

  return res.json({
    date: targetDate,
    totalClasses: classes.length,
    markedClassesCount: classesMarkedToday.length,
    notMarkedClassesCount: classesNotMarkedToday.length,
    todayStatusTotals: {
      ...buildStatusCounts(recordsToday),
      totalRecords: recordsToday.length,
    },
    classesMarkedToday,
    classesNotMarkedToday,
    staffCompliance,
  });
});

module.exports = router;


