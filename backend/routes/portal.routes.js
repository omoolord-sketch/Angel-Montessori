const express = require("express");
const prisma = require("../prismaClient");
const { auth, requireRole } = require("../middleware/auth");
const { readDB } = require("../lib/jsonStore");
const { getSubjectsForClassName } = require("../lib/subjects");

const router = express.Router();

function summarizeResults(results) {
  const buckets = new Map();

  for (const row of results) {
    const session = String(row.session || row.sessionName || row.academicSession || "").trim();
    const term = String(row.term || row.termName || "").trim();
    if (!session || !term) continue;
    const key = `${session}__${term}`;
    if (!buckets.has(key)) {
      buckets.set(key, { session, term, total: 0, count: 0 });
    }

    const bucket = buckets.get(key);
    bucket.total += resultScore(row);
    bucket.count += 1;
  }

  return Array.from(buckets.values())
    .map((item) => ({
      session: item.session,
      term: item.term,
      average: item.count ? Number((item.total / item.count).toFixed(2)) : 0,
      count: item.count,
    }))
    .sort((a, b) => `${b.session}-${b.term}`.localeCompare(`${a.session}-${a.term}`));
}

function resultScore(row = {}) {
  const candidates = [row.totalScore, row.score, row.percentage, row.average];
  for (const value of candidates) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return 0;
}

function isPublishedResult(row = {}) {
  const source = String(row.source || row.resultSource || "").toLowerCase();
  if (source !== "continuous_assessment") return true;
  return row.isPublished === true || String(row.publicationStatus || "").toUpperCase() === "PUBLISHED";
}

function sortResultsByFreshness(rows = []) {
  return [...rows].sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));
}

function resultMergeKey(row = {}) {
  return [
    row.studentId || "",
    row.session || row.sessionName || "",
    row.term || row.termName || "",
    row.subject || row.subjectName || "",
  ].map((part) => String(part || "").trim().toLowerCase()).join("__");
}

function mergeVisibleResults(primaryRows = [], jsonRows = []) {
  const map = new Map();
  for (const row of primaryRows.filter(isPublishedResult)) {
    map.set(resultMergeKey(row), row);
  }
  for (const row of jsonRows.filter(isPublishedResult)) {
    map.set(resultMergeKey(row), row);
  }
  return sortResultsByFreshness(Array.from(map.values()));
}

function normalizeHomeworkTask(task, db) {
  const classes = Array.isArray(db.classes) ? db.classes : [];
  const classRow = classes.find((item) => String(item.id) === String(task.classId));
  const type = String(task.type || task.taskType || "HOMEWORK").toUpperCase();

  return {
    ...task,
    id: String(task.id || ""),
    type,
    taskType: String(task.taskType || type.toLowerCase() || "homework").toLowerCase(),
    title: String(task.title || "").trim(),
    classId: String(task.classId || classRow?.id || ""),
    className: String(task.className || classRow?.name || ""),
    subject: String(task.subject || "").trim(),
    instructions: String(task.instructions || "").trim(),
    dueDate: String(task.dueDate || ""),
    availableFrom: String(task.availableFrom || ""),
    maxScore: Number(task.maxScore || 20),
    submissionType: String(task.submissionType || "text").toLowerCase(),
    allowLateSubmission: task.allowLateSubmission !== false,
    lateSubmissionDeadline: String(task.lateSubmissionDeadline || ""),
    isGraded: task.isGraded !== false,
    status: String(task.status || "published").toLowerCase(),
    attachments: Array.isArray(task.attachments) ? task.attachments : [],
    createdAt: String(task.createdAt || ""),
    updatedAt: String(task.updatedAt || task.createdAt || ""),
  };
}

function normalizeHomeworkSubmission(sub) {
  const assignmentId = String(sub.assignmentId || sub.homeworkId || "");
  return {
    ...sub,
    assignmentId,
    homeworkId: assignmentId,
    studentId: String(sub.studentId || ""),
    status: String(sub.status || "submitted").toLowerCase(),
    score: sub.score == null ? null : Number(sub.score),
    feedback: String(sub.feedback || ""),
    submissionText: String(sub.submissionText || sub.content || ""),
    content: String(sub.content || sub.submissionText || ""),
    filePath: String(sub.filePath || ""),
    fileName: String(sub.fileName || ""),
    fileMimeType: String(sub.fileMimeType || ""),
    fileSize: Number(sub.fileSize || 0),
    hasFile: Boolean(sub.filePath),
    submittedAt: String(sub.submittedAt || ""),
    gradedAt: String(sub.gradedAt || sub.reviewedAt || ""),
    updatedAt: String(sub.updatedAt || sub.submittedAt || ""),
    isLate: Boolean(sub.isLate),
  };
}

function isHomeworkTaskOpen(task, currentTime = Date.now()) {
  if (String(task.status || "published").toLowerCase() !== "published") return false;
  if (!task.availableFrom) return true;
  const availableAt = new Date(task.availableFrom).getTime();
  if (Number.isNaN(availableAt)) return true;
  return currentTime >= availableAt;
}

function studentMatchesHomeworkTask(task, student, classSubjects) {
  const taskClassId = String(task.classId || "").trim();
  const taskClassNameKey = String(task.className || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const studentClassId = String(student.classId || "").trim();
  const studentClassNameKey = String(student.className || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  if (taskClassId || taskClassNameKey) {
    if (!(taskClassId && taskClassId === studentClassId) && !(taskClassNameKey && taskClassNameKey === studentClassNameKey)) {
      return false;
    }
  }

  if (classSubjects.length > 0 && task.subject && !classSubjects.includes(task.subject)) {
    return false;
  }

  return true;
}

function enrichSubmissions(submissions, homeworks) {
  const tasks = Array.isArray(homeworks) ? homeworks : [];
  return submissions
    .map((rawSub) => {
      const sub = normalizeHomeworkSubmission(rawSub);
      const homework = tasks.find((h) => String(h.id) === String(sub.assignmentId));
      return {
        ...sub,
        homeworkTitle: homework?.title || "",
        assignmentTitle: homework?.title || "",
        taskType: homework?.taskType || "homework",
        type: homework?.type || "HOMEWORK",
        subject: homework?.subject || "",
        className: homework?.className || "",
        dueDate: homework?.dueDate || "",
        maxScore: Number(homework?.maxScore || 20),
      };
    })
    .sort((a, b) => String(b.updatedAt || b.submittedAt || "").localeCompare(String(a.updatedAt || a.submittedAt || "")));
}

function buildHomeworkSummaryForStudent(student, db) {
  const currentTime = Date.now();
  const homeworks = (Array.isArray(db.homeworks) ? db.homeworks : []).map((item) => normalizeHomeworkTask(item, db));
  const classSubjects = getSubjectsForClassName(student.className);

  const visibleHomework = homeworks
    .filter((task) => isHomeworkTaskOpen(task, currentTime))
    .filter((task) => studentMatchesHomeworkTask(task, student, classSubjects));

  const allSubmissions = (Array.isArray(db.submissions) ? db.submissions : []).map(normalizeHomeworkSubmission);
  const submissions = enrichSubmissions(
    allSubmissions.filter((sub) => String(sub.studentId) === String(student.id)),
    visibleHomework
  );

  const submissionByTaskId = new Map(submissions.map((item) => [String(item.assignmentId), item]));

  const tasks = visibleHomework.map((task) => {
    const submission = submissionByTaskId.get(String(task.id)) || null;
    const dueAt = task.dueDate ? new Date(task.dueDate).getTime() : null;
    const isOverdue = !submission && dueAt && !Number.isNaN(dueAt) ? currentTime > dueAt : false;
    return {
      ...task,
      submission,
      submissionStatus: submission?.status || "not_submitted",
      timelinessStatus: submission ? (submission.isLate ? "late" : "on_time") : (isOverdue ? "overdue" : "pending"),
      isOverdue,
    };
  });

  return {
    homework: tasks,
    submissions,
    homeworkSummary: {
      pendingTasks: tasks.filter((task) => task.submissionStatus === "not_submitted" && !task.isOverdue).length,
      dueToday: tasks.filter((task) => task.dueDate && String(task.dueDate).slice(0, 10) === new Date(currentTime).toISOString().slice(0, 10)).length,
      dueThisWeek: tasks.filter((task) => {
        if (!task.dueDate || task.isOverdue) return false;
        const dueAt = new Date(task.dueDate).getTime();
        if (Number.isNaN(dueAt)) return false;
        const weekAhead = currentTime + 7 * 24 * 60 * 60 * 1000;
        return dueAt >= currentTime && dueAt <= weekAhead;
      }).length,
      overdue: tasks.filter((task) => task.isOverdue).length,
      graded: tasks.filter((task) => task.submissionStatus === "graded" || task.submissionStatus === "returned").length,
    },
  };
}

function findClassName(db, classId, fallbackName) {
  if (fallbackName) return fallbackName;
  const classes = Array.isArray(db.classes) ? db.classes : [];
  return classes.find((item) => String(item.id) === String(classId))?.name || "";
}

function splitNameParts(name) {
  const full = String(name || "").trim();
  if (!full) return { firstName: "", lastName: "" };
  const parts = full.split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : "",
  };
}

function findStudentExtra(db, studentId) {
  const students = Array.isArray(db.students) ? db.students : [];
  return students.find((item) => String(item.id) === String(studentId)) || null;
}

function findStudentPhoto(db, studentId, fallbackPhoto) {
  if (fallbackPhoto) return fallbackPhoto;
  return String(findStudentExtra(db, studentId)?.photoUrl || "");
}

function normalizeAttendanceDate(value) {
  const parsed = new Date(String(value || ""));
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function normalizeAttendanceStatus(value) {
  const key = String(value || "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");

  if (key === "present" || key === "p") return "present";
  if (key === "absent" || key === "a") return "absent";
  if (key === "late" || key === "l") return "late";
  if (key === "excused" || key === "e") return "excused";
  return "";
}

function emptyAttendanceOverview() {
  return {
    summary: {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      totalRecords: 0,
      attendanceRate: 0,
    },
    history: [],
    monthly: [],
  };
}

function buildAttendanceOverviewMap(db, studentIds) {
  const ids = Array.from(
    new Set((Array.isArray(studentIds) ? studentIds : []).map((id) => String(id || "").trim()).filter(Boolean))
  );

  const out = new Map(ids.map((id) => [id, emptyAttendanceOverview()]));
  if (ids.length === 0) return out;

  const sessions = Array.isArray(db.attendanceSessions) ? db.attendanceSessions : [];
  const records = Array.isArray(db.attendanceRecords) ? db.attendanceRecords : [];
  const classes = Array.isArray(db.classes) ? db.classes : [];

  const sessionById = new Map(sessions.map((item) => [String(item.id), item]));
  const classById = new Map(classes.map((item) => [String(item.id), item]));
  const idSet = new Set(ids);

  for (const row of records) {
    const studentId = String(row.studentId || "");
    if (!idSet.has(studentId)) continue;

    const session = sessionById.get(String(row.attendanceSessionId));
    if (!session) continue;

    const status = normalizeAttendanceStatus(row.status);
    if (!status) continue;

    const date = normalizeAttendanceDate(session.attendanceDate);
    const cls = classById.get(String(session.classId));

    const entry = out.get(studentId) || emptyAttendanceOverview();
    entry.summary[status] += 1;
    entry.summary.totalRecords += 1;

    entry.history.push({
      attendanceDate: date,
      status,
      remark: String(row.remark || ""),
      reason: String(row.reason || ""),
      classId: String(session.classId || ""),
      className: String(cls?.name || ""),
      markedAt: String(row.markedAt || session.submittedAt || ""),
    });

    out.set(studentId, entry);
  }

  for (const [studentId, entry] of out.entries()) {
    entry.summary.attendanceRate = entry.summary.totalRecords
      ? Number((((entry.summary.present + entry.summary.late) / entry.summary.totalRecords) * 100).toFixed(2))
      : 0;

    entry.history = entry.history
      .sort((a, b) => `${b.attendanceDate}-${b.markedAt}`.localeCompare(`${a.attendanceDate}-${a.markedAt}`))
      .slice(0, 30);

    const monthlyMap = new Map();
    for (const item of entry.history) {
      const period = String(item.attendanceDate || "").slice(0, 7);
      if (!period) continue;

      if (!monthlyMap.has(period)) {
        monthlyMap.set(period, { period, present: 0, absent: 0, late: 0, excused: 0, totalRecords: 0, attendanceRate: 0 });
      }

      const bucket = monthlyMap.get(period);
      bucket[item.status] += 1;
      bucket.totalRecords += 1;
    }

    entry.monthly = Array.from(monthlyMap.values())
      .map((item) => ({
        ...item,
        attendanceRate: item.totalRecords
          ? Number((((item.present + item.late) / item.totalRecords) * 100).toFixed(2))
          : 0,
      }))
      .sort((a, b) => String(a.period).localeCompare(String(b.period)));

    out.set(studentId, entry);
  }

  return out;
}

function createStudentIdResolver(db) {
  const students = Array.isArray(db.students) ? db.students : [];
  const ordered = students.slice().sort((a, b) => {
    const aTime = String(a.createdAt || "");
    const bTime = String(b.createdAt || "");
    return aTime.localeCompare(bTime);
  });
  const knownIds = new Set();
  const map = new Map();

  const addRef = (ref, studentId) => {
    const normalizedRef = String(ref || "").trim().toLowerCase();
    const normalizedId = String(studentId || "").trim();
    if (!normalizedRef || !normalizedId) return;
    if (!map.has(normalizedRef)) {
      map.set(normalizedRef, normalizedId);
    }
  };

  ordered.forEach((student, index) => {
    const id = String(student.id || "").trim();
    if (!id) return;
    knownIds.add(id);

    const refs = [
      id,
      student.studentId,
      student.admissionNo,
      student.admissionNumber,
      student.registrationNo,
      student.registrationNumber,
      student.code,
    ];

    // Backward compatibility with legacy IDs like AMS0001 used by older accounts.
    refs.push(`AMS${String(index + 1).padStart(4, "0")}`);

    for (const ref of refs) {
      addRef(ref, id);
    }
  });

  const resolveOne = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const mapped = map.get(raw.toLowerCase());
    if (mapped) return mapped;
    if (knownIds.has(raw)) return raw;
    if (knownIds.size === 1) return Array.from(knownIds)[0];
    return raw;
  };

  const resolveMany = (values) => {
    const out = [];
    const seen = new Set();
    const refs = Array.isArray(values) ? values : [];

    for (const ref of refs) {
      const id = resolveOne(ref);
      if (!id || !knownIds.has(id)) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }

    if (out.length === 0 && refs.length > 0 && knownIds.size === 1) {
      out.push(Array.from(knownIds)[0]);
    }

    return out;
  };

  return { resolveOne, resolveMany };
}

function getPromotionDecisionsForStudent(db, studentId) {
  return (Array.isArray(db.promotionDecisions) ? db.promotionDecisions : [])
    .filter((item) => String(item.studentUserId) === String(studentId))
    .sort((a, b) =>
      String(b.decidedAt || b.updatedAt || b.createdAt || "").localeCompare(
        String(a.decidedAt || a.updatedAt || a.createdAt || "")
      )
    );
}
async function getStudentOverviewData(studentRef) {
  const db = readDB();
  const resolver = createStudentIdResolver(db);
  const resolvedStudentId = resolver.resolveOne(studentRef);

  try {
    const student = await prisma.student.findUnique({
      where: { id: resolvedStudentId },
      include: { class: true },
    });

    if (!student) throw new Error("Student not found in primary store");

    const [results, reports] = await Promise.all([
      prisma.result.findMany({ where: { studentId: resolvedStudentId }, orderBy: [{ updatedAt: "desc" }] }),
      prisma.reportMeta.findMany({ where: { studentId: resolvedStudentId }, orderBy: [{ updatedAt: "desc" }] }),
    ]);

    const jsonResults = (Array.isArray(db.results) ? db.results : [])
      .filter((item) => String(item.studentId) === String(resolvedStudentId))
      .filter(isPublishedResult)
      .sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));
    const jsonReports = (Array.isArray(db.reports) ? db.reports : [])
      .filter((item) => String(item.studentId) === String(resolvedStudentId))
      .sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));

    const extra = findStudentExtra(db, student.id) || {};
    const derived = splitNameParts(student.name);

    return {
      student: {
        id: student.id,
        name: student.name,
        firstName: String(extra.firstName || "").trim() || derived.firstName,
        lastName: String(extra.lastName || "").trim() || derived.lastName,
        classId: student.classId,
        className: student.class?.name || "",
        photoUrl: findStudentPhoto(db, student.id, student.photoUrl),
      },
      results: mergeVisibleResults(results, jsonResults),
      reports: reports.length ? reports : jsonReports,
    };
  } catch {
    const students = Array.isArray(db.students) ? db.students : [];
    const results = (Array.isArray(db.results) ? db.results : []).filter(isPublishedResult);
    const reports = Array.isArray(db.reports) ? db.reports : [];

    const student = students.find((item) => String(item.id) === String(resolvedStudentId));
    if (!student) return null;

    const derived = splitNameParts(student.name);
    return {
      student: {
        id: student.id,
        name: student.name,
        firstName: String(student.firstName || "").trim() || derived.firstName,
        lastName: String(student.lastName || "").trim() || derived.lastName,
        classId: student.classId,
        className: findClassName(db, student.classId, student.className),
        photoUrl: student.photoUrl || "",
      },
      results: results
        .filter((item) => String(item.studentId) === String(resolvedStudentId))
        .sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || ""))),
      reports: reports
        .filter((item) => String(item.studentId) === String(resolvedStudentId))
        .sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || ""))),
    };
  }
}

async function getParentOverviewData(studentRefs) {
  const db = readDB();
  const resolver = createStudentIdResolver(db);
  const ids = resolver.resolveMany(Array.isArray(studentRefs) ? studentRefs : []);

  try {
    const [students, results, reports] = await Promise.all([
      prisma.student.findMany({
        where: { id: { in: ids } },
        include: { class: true },
        orderBy: [{ name: "asc" }],
      }),
      prisma.result.findMany({ where: { studentId: { in: ids } }, orderBy: [{ updatedAt: "desc" }] }),
      prisma.reportMeta.findMany({ where: { studentId: { in: ids } }, orderBy: [{ updatedAt: "desc" }] }),
    ]);

    if (students.length === 0 && ids.length > 0) throw new Error("Students not found in primary store");

    const extraById = new Map(
      (Array.isArray(db.students) ? db.students : []).map((item) => [
        String(item.id),
        {
          photoUrl: String(item.photoUrl || ""),
          firstName: String(item.firstName || ""),
          lastName: String(item.lastName || ""),
        },
      ])
    );

    const jsonResults = (Array.isArray(db.results) ? db.results : [])
      .filter((item) => ids.includes(String(item.studentId)))
      .filter(isPublishedResult)
      .sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));

    const jsonReports = (Array.isArray(db.reports) ? db.reports : [])
      .filter((item) => ids.includes(String(item.studentId)))
      .sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));

    return {
      students: students.map((student) => {
        const extra = extraById.get(String(student.id)) || {};
        const derived = splitNameParts(student.name);
        return {
          id: student.id,
          name: student.name,
          firstName: String(extra.firstName || "").trim() || derived.firstName,
          lastName: String(extra.lastName || "").trim() || derived.lastName,
          classId: student.classId,
          className: student.class?.name || "",
          photoUrl: extra.photoUrl || String(student.photoUrl || ""),
        };
      }),
      results: mergeVisibleResults(results, jsonResults),
      reports: reports.length ? reports : jsonReports,
    };
  } catch {
    const students = (Array.isArray(db.students) ? db.students : [])
      .filter((item) => ids.includes(String(item.id)))
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
      .map((item) => {
        const derived = splitNameParts(item.name);
        return {
          id: item.id,
          name: item.name,
          firstName: String(item.firstName || "").trim() || derived.firstName,
          lastName: String(item.lastName || "").trim() || derived.lastName,
          classId: item.classId,
          className: findClassName(db, item.classId, item.className),
          photoUrl: item.photoUrl || "",
        };
      });

    const results = (Array.isArray(db.results) ? db.results : [])
      .filter((item) => ids.includes(String(item.studentId)))
      .filter(isPublishedResult)
      .sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));

    const reports = (Array.isArray(db.reports) ? db.reports : [])
      .filter((item) => ids.includes(String(item.studentId)))
      .sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));

    return { students, results, reports };
  }
}

router.get("/student/overview", auth(), requireRole("STUDENT"), async (req, res) => {
  const studentId = String(req.user.studentId || "").trim();
  if (!studentId) {
    return res.status(400).json({ message: "Student account is not linked to a student profile." });
  }

  const overview = await getStudentOverviewData(studentId);
  if (!overview) return res.status(404).json({ message: "Linked student profile not found." });

  const db = readDB();
  const homeworkView = buildHomeworkSummaryForStudent(overview.student, db);
  const attendance = buildAttendanceOverviewMap(db, [overview.student.id]).get(String(overview.student.id)) || emptyAttendanceOverview();

  res.json({
    student: overview.student,
    summaries: summarizeResults(overview.results),
    recentResults: overview.results.slice(0, 30),
    reports: overview.reports,
    homework: homeworkView.homework,
    submissions: homeworkView.submissions,
    homeworkSummary: homeworkView.homeworkSummary,
    attendanceSummary: attendance.summary,
    attendanceHistory: attendance.history,
    attendanceTrend: attendance.monthly,
    promotionDecisions: getPromotionDecisionsForStudent(db, overview.student.id),
  });
});

router.get("/parent/overview", auth(), requireRole("PARENT"), async (req, res) => {
  const studentRefs = [
    ...(Array.isArray(req.user.studentIds) ? req.user.studentIds : []),
    req.user.studentId,
  ]
    .map((id) => String(id || "").trim())
    .filter(Boolean);

  if (studentRefs.length === 0) {
    return res.status(400).json({ message: "Parent account is not linked to any student profile." });
  }

  const { students, results, reports } = await getParentOverviewData(studentRefs);

  const db = readDB();
  const attendanceByStudent = buildAttendanceOverviewMap(db, students.map((student) => student.id));

  const children = students.map((student) => {
    const childResults = results.filter((r) => String(r.studentId) === String(student.id));
    const childReports = reports.filter((r) => String(r.studentId) === String(student.id));
    const homeworkView = buildHomeworkSummaryForStudent(student, db);
    const attendance = attendanceByStudent.get(String(student.id)) || emptyAttendanceOverview();

    return {
      id: student.id,
      name: student.name,
      firstName: student.firstName || "",
      lastName: student.lastName || "",
      classId: student.classId,
      className: student.className,
      photoUrl: student.photoUrl || "",
      summaries: summarizeResults(childResults),
      recentResults: childResults.slice(0, 20),
      reports: childReports,
      homework: homeworkView.homework,
      submissions: homeworkView.submissions.slice(0, 20),
      homeworkSummary: homeworkView.homeworkSummary,
      attendanceSummary: attendance.summary,
      attendanceHistory: attendance.history,
      attendanceTrend: attendance.monthly,
      promotionDecisions: getPromotionDecisionsForStudent(db, student.id),
    };
  });

  res.json({ children });
});

module.exports = router;
