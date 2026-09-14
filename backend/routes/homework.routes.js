const express = require("express");
const multer = require("multer");
const path = require("path");
const { nanoid } = require("nanoid");
const { readDB, writeDB } = require("../lib/jsonStore");
const { auth, requireRole } = require("../middleware/auth");
const { normalizeSubject, getSubjectsForClassName } = require("../lib/subjects");
const { parseDataUrl, storeUploadedFile } = require("../lib/fileStorage");
const { ensureAcademicSystemShape, sortAcademicClasses } = require("../lib/academicSystems");

const router = express.Router();

const TASK_TYPES = new Set(["HOMEWORK", "ASSIGNMENT", "PROJECT", "PRACTICE"]);
const TASK_STATUSES = new Set(["draft", "published", "closed", "archived"]);
const SUBMISSION_TYPES = new Set(["text", "file", "text_and_file", "offline"]);
const SUBMISSION_STATUSES = new Set(["not_submitted", "submitted", "graded", "returned", "excused"]);
const MAX_SUBMISSION_FILE_BYTES = 8 * 1024 * 1024;
const HOMEWORK_UPLOAD_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
]);
const HOMEWORK_UPLOAD_EXTENSIONS = new Set([".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic"]);
const uploadHomeworkFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SUBMISSION_FILE_BYTES },
});

function nowIso() {
  return new Date().toISOString();
}

function nk(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function activeClasses(db) {
  ensureAcademicSystemShape(db);
  return sortAcademicClasses(asArray(db.classes).filter((item) => item.isActive !== false));
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeTaskType(input) {
  const type = String(input || "HOMEWORK").trim().toUpperCase();
  if (!TASK_TYPES.has(type)) return { type: "HOMEWORK", taskType: "homework" };
  return { type, taskType: type.toLowerCase() };
}

function normalizeTaskStatus(input, fallback = "published") {
  const status = String(input || fallback).trim().toLowerCase();
  return TASK_STATUSES.has(status) ? status : fallback;
}

function normalizeSubmissionType(input, fallback = "text") {
  const type = String(input || fallback).trim().toLowerCase();
  return SUBMISSION_TYPES.has(type) ? type : fallback;
}

function normalizeSubmissionStatus(input, fallback = "submitted") {
  const status = String(input || fallback).trim().toLowerCase();
  return SUBMISSION_STATUSES.has(status) ? status : fallback;
}

function normalizeIsoDate(input) {
  const value = String(input || "").trim();
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString();
}

function inferDataUrlMimeType(value) {
  const dataUrl = parseDataUrl(value);
  return dataUrl ? String(dataUrl.mimeType || "").trim().toLowerCase() : "";
}

function estimateDataUrlBytes(value) {
  const dataUrl = parseDataUrl(value);
  if (!dataUrl?.base64) return 0;
  const padding = (dataUrl.base64.match(/=*$/) || [""])[0].length;
  return Math.max(0, Math.floor((dataUrl.base64.length * 3) / 4) - padding);
}

function inferHomeworkMimeType(fileNameOrPath) {
  const ref = String(fileNameOrPath || "").trim().toLowerCase();
  if (!ref) return "";
  const extension = path.extname(ref);
  if (extension === ".pdf") return "application/pdf";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".png") return "image/png";
  if (extension === ".gif") return "image/gif";
  if (extension === ".webp") return "image/webp";
  if (extension === ".heic") return "image/heic";
  return "";
}

function isAllowedHomeworkExtension(fileNameOrPath) {
  return HOMEWORK_UPLOAD_EXTENSIONS.has(path.extname(String(fileNameOrPath || "").trim()).toLowerCase());
}

function assertAllowedHomeworkFile(input) {
  const row = input && typeof input === "object" ? input : {};
  const filePath = String(row.filePath || row.path || row.uri || row.dataUrl || "").trim();
  const fileName = String(row.fileName || row.fileTitle || row.title || row.name || "").trim();
  const fileMimeType = String(
    row.fileMimeType || row.mimeType || inferDataUrlMimeType(filePath) || inferHomeworkMimeType(fileName || filePath) || ""
  )
    .trim()
    .toLowerCase();
  const mimeAllowed = fileMimeType ? HOMEWORK_UPLOAD_MIME_TYPES.has(fileMimeType) : false;
  const extensionAllowed = isAllowedHomeworkExtension(fileName || filePath);

  if (!mimeAllowed && !extensionAllowed) {
    const error = new Error("Only PDF and image files are allowed for homework uploads.");
    error.status = 400;
    throw error;
  }

  if (fileMimeType && !mimeAllowed) {
    const error = new Error("Only PDF and image files are allowed for homework uploads.");
    error.status = 400;
    throw error;
  }

  return {
    filePath,
    fileName,
    fileMimeType: fileMimeType || inferHomeworkMimeType(fileName || filePath),
  };
}

function normalizeSubmissionFile(input) {
  const row = input && typeof input === "object" ? input : {};
  const filePath = String(row.dataUrl || row.filePath || row.uri || "").trim();
  const inferredMimeType = inferDataUrlMimeType(filePath);
  const fileMimeType = String(row.mimeType || row.fileMimeType || inferredMimeType || "").trim().toLowerCase();
  let fileSize = toNumber(row.size ?? row.fileSize, 0);
  if (!fileSize && filePath.startsWith("data:")) {
    fileSize = estimateDataUrlBytes(filePath);
  }

  return {
    filePath,
    fileName: String(row.name || row.fileName || "").trim(),
    fileMimeType,
    fileSize,
  };
}

function normalizeTaskAttachment(input) {
  const row = input && typeof input === "object" ? input : {};
  const filePath = String(row.filePath || row.path || row.uri || "").trim();
  const fileName = String(row.fileName || row.name || row.fileTitle || row.title || "").trim();
  const fileMimeType = String(row.fileMimeType || row.mimeType || inferHomeworkMimeType(fileName || filePath) || "")
    .trim()
    .toLowerCase();
  const timestamp = nowIso();

  return {
    id: String(row.id || nanoid()),
    fileTitle: String(row.fileTitle || row.title || fileName || "Attachment").trim(),
    fileName: fileName || String(row.fileTitle || row.title || "Attachment").trim(),
    filePath,
    mimeType: fileMimeType,
    fileMimeType,
    fileSize: toNumber(row.fileSize ?? row.size, 0),
    uploadedBy: String(row.uploadedBy || "").trim(),
    createdAt: String(row.createdAt || timestamp),
    updatedAt: String(row.updatedAt || row.createdAt || timestamp),
  };
}

function persistSubmissionAttachment(req, input, category = "homework-submissions") {
  const attachment = normalizeSubmissionFile(input);
  if (!attachment.filePath) return attachment;
  if (!attachment.filePath.startsWith("data:")) return attachment;
  if (!/^data:[^;]+;base64,/i.test(attachment.filePath)) {
    const error = new Error("filePath data URLs must be base64 encoded.");
    error.status = 400;
    throw error;
  }
  if (attachment.fileSize > MAX_SUBMISSION_FILE_BYTES) {
    const error = new Error("Attached file must be 8 MB or smaller.");
    error.status = 400;
    throw error;
  }
  assertAllowedHomeworkFile(attachment);
  return storeUploadedFile(req, {
    category,
    fileName: attachment.fileName || "homework-upload",
    mimeType: attachment.fileMimeType || "application/octet-stream",
    dataUrl: attachment.filePath,
  });
}

function resolveHomeworkUploadTarget(req) {
  const target = String(req.body?.target || req.query?.target || "").trim().toLowerCase();
  if (target === "task" || target === "assignment" || target === "attachment") {
    return { target: "task", category: "homework-attachments" };
  }
  if (target === "submission" || target === "student_submission") {
    return { target: "submission", category: "homework-submissions" };
  }
  if (req.user?.role === "STUDENT") {
    return { target: "submission", category: "homework-submissions" };
  }
  return { target: "task", category: "homework-attachments" };
}

function homeworkUploadMiddleware(req, res, next) {
  const contentType = String(req.headers["content-type"] || "").toLowerCase();
  if (!contentType.includes("multipart/form-data")) return next();
  return uploadHomeworkFile.single("file")(req, res, (error) => {
    if (!error) return next();
    if (error?.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ message: "Attached file must be 8 MB or smaller." });
    }
    return res.status(400).json({ message: error?.message || "Failed to upload file." });
  });
}

function isTeacherSubjectAllowed(user, subject) {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  if (user.role !== "TEACHER") return false;
  const canonical = normalizeSubject(subject);
  if (!canonical) return false;
  return asArray(user.subjects)
    .map((item) => normalizeSubject(item))
    .filter(Boolean)
    .includes(canonical);
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

function createStudentResolver(db) {
  const students = asArray(db.students);
  const ordered = [...students].sort((a, b) => {
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
    if (!map.has(normalizedRef)) map.set(normalizedRef, normalizedId);
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
      `AMS${String(index + 1).padStart(4, "0")}`,
    ];
    refs.forEach((ref) => addRef(ref, id));
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

  return { resolveOne };
}

function getClassByRef(db, classRef) {
  const classes = asArray(db.classes);
  const safeRef = String(classRef || "").trim();
  if (!safeRef) return null;
  const key = nk(safeRef);
  return classes.find((item) => String(item.id || "") === safeRef || nk(item.name) === key) || null;
}

function getStudentProfile(db, studentRef) {
  const resolver = createStudentResolver(db);
  const resolvedId = resolver.resolveOne(studentRef);
  const students = asArray(db.students);
  const classes = asArray(db.classes);
  const student = students.find((item) => String(item.id) === String(resolvedId));
  if (!student) return null;

  const cls = classes.find((item) => String(item.id) === String(student.classId));
  const derived = splitNameParts(student.name);

  return {
    id: String(student.id),
    name: String(student.name || "").trim(),
    firstName: String(student.firstName || "").trim() || derived.firstName,
    lastName: String(student.lastName || "").trim() || derived.lastName,
    classId: String(student.classId || cls?.id || "").trim(),
    className: String(student.className || cls?.name || "").trim(),
  };
}

function getParentChildProfiles(db, user) {
  const refs = [...asArray(user?.studentIds), user?.studentId]
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  const seen = new Set();
  const children = [];

  for (const ref of refs) {
    const profile = getStudentProfile(db, ref);
    if (!profile) continue;
    if (seen.has(profile.id)) continue;
    seen.add(profile.id);
    children.push(profile);
  }

  return children;
}

function getSubjectsForProfile(profile) {
  return getSubjectsForClassName(profile?.className || "");
}

function normalizeTask(task, db) {
  const type = normalizeTaskType(task.type || task.taskType || "HOMEWORK");
  const canonicalSubject = normalizeSubject(task.subject);
  const normalizedClass = getClassByRef(db, task.classId || task.className);

  return {
    ...task,
    id: String(task.id || nanoid()),
    type: type.type,
    taskType: type.taskType,
    title: String(task.title || "").trim(),
    instructions: String(task.instructions || "").trim(),
    classId: String(task.classId || normalizedClass?.id || "").trim(),
    className: String(task.className || normalizedClass?.name || "").trim(),
    subject: canonicalSubject || String(task.subject || "").trim(),
    topic: String(task.topic || "").trim(),
    lesson: String(task.lesson || "").trim(),
    dueDate: normalizeIsoDate(task.dueDate),
    availableFrom: normalizeIsoDate(task.availableFrom),
    maxScore: Number.isFinite(Number(task.maxScore)) ? Number(task.maxScore) : 20,
    submissionType: normalizeSubmissionType(task.submissionType, "text"),
    allowLateSubmission: task.allowLateSubmission !== false,
    lateSubmissionDeadline: normalizeIsoDate(task.lateSubmissionDeadline),
    isGraded: task.isGraded !== false,
    status: normalizeTaskStatus(task.status, "published"),
    createdBy: String(task.createdBy || "").trim(),
    createdByName: String(task.createdByName || "").trim(),
    createdAt: String(task.createdAt || nowIso()),
    updatedAt: String(task.updatedAt || task.createdAt || nowIso()),
    attachments: asArray(task.attachments).map((item) => normalizeTaskAttachment(item)),
  };
}

function normalizeSubmission(row) {
  const assignmentId = String(row.assignmentId || row.homeworkId || "").trim();
  const status = normalizeSubmissionStatus(row.status, "submitted");
  const scoreRaw = row.score;
  const score = scoreRaw === "" || scoreRaw === undefined || scoreRaw === null ? null : Number(scoreRaw);
  const attachment = normalizeSubmissionFile(row);

  return {
    ...row,
    id: String(row.id || nanoid()),
    assignmentId,
    homeworkId: assignmentId,
    studentId: String(row.studentId || "").trim(),
    studentName: String(row.studentName || "").trim(),
    studentUserId: String(row.studentUserId || "").trim(),
    submissionText: String(row.submissionText || row.content || "").trim(),
    content: String(row.content || row.submissionText || "").trim(),
    filePath: attachment.filePath,
    fileName: attachment.fileName,
    fileMimeType: attachment.fileMimeType,
    fileSize: attachment.fileSize,
    hasFile: Boolean(attachment.filePath),
    submittedAt: String(row.submittedAt || "").trim(),
    isLate: Boolean(row.isLate),
    score: score == null || Number.isNaN(score) ? null : Number(score),
    feedback: String(row.feedback || "").trim(),
    gradedBy: String(row.gradedBy || row.reviewedBy || "").trim(),
    gradedAt: String(row.gradedAt || row.reviewedAt || "").trim(),
    status,
    createdAt: String(row.createdAt || row.submittedAt || nowIso()),
    updatedAt: String(row.updatedAt || row.submittedAt || nowIso()),
  };
}
function isTaskAvailable(task, currentTime = Date.now()) {
  if (task.status !== "published") return false;
  if (!task.availableFrom) return true;
  const availableAt = new Date(task.availableFrom).getTime();
  if (Number.isNaN(availableAt)) return true;
  return currentTime >= availableAt;
}

function matchesTaskClass(task, profile) {
  const taskClassId = String(task.classId || "").trim();
  const taskClassName = nk(task.className || "");
  const profileClassId = String(profile.classId || "").trim();
  const profileClassName = nk(profile.className || "");

  if (!taskClassId && !taskClassName) return true;
  if (taskClassId && profileClassId && taskClassId === profileClassId) return true;
  if (taskClassName && profileClassName && taskClassName === profileClassName) return true;
  return false;
}

function matchesTaskSubject(task, profile) {
  const subjects = getSubjectsForProfile(profile);
  if (!task.subject) return true;
  if (!subjects.length) return true;
  return subjects.includes(task.subject);
}

function canStudentViewTask(task, profile, currentTime = Date.now()) {
  if (!isTaskAvailable(task, currentTime)) return false;
  if (!matchesTaskClass(task, profile)) return false;
  if (!matchesTaskSubject(task, profile)) return false;
  return true;
}

function getTaskSubmissions(db, taskId) {
  return asArray(db.submissions)
    .map(normalizeSubmission)
    .filter((item) => String(item.assignmentId) === String(taskId));
}

function getTaskSubmissionForStudent(db, taskId, studentId) {
  return asArray(db.submissions)
    .map(normalizeSubmission)
    .find((item) => String(item.assignmentId) === String(taskId) && String(item.studentId) === String(studentId)) || null;
}

function getExpectedStudentsForTask(db, task) {
  return asArray(db.students)
    .map((student) => getStudentProfile(db, student.id))
    .filter(Boolean)
    .filter((profile) => matchesTaskClass(task, profile))
    .filter((profile) => matchesTaskSubject(task, profile));
}

function computeTaskSubmissionStats(db, task) {
  const expectedStudents = getExpectedStudentsForTask(db, task);
  const expectedIds = new Set(expectedStudents.map((item) => String(item.id)));
  const submissions = getTaskSubmissions(db, task.id).filter((item) => expectedIds.has(String(item.studentId)));

  const submittedIds = new Set(submissions.map((item) => String(item.studentId)));
  const graded = submissions.filter((item) => item.status === "graded" || item.status === "returned").length;
  const missing = expectedStudents.length - submittedIds.size;

  const averageScore = graded
    ? Number(
        (
          submissions
            .filter((item) => item.status === "graded" || item.status === "returned")
            .reduce((sum, item) => sum + Number(item.score || 0), 0) / graded
        ).toFixed(2)
      )
    : 0;

  return {
    totalStudents: expectedStudents.length,
    totalSubmitted: submittedIds.size,
    totalNotSubmitted: Math.max(missing, 0),
    submissionRate: expectedStudents.length ? Number(((submittedIds.size / expectedStudents.length) * 100).toFixed(2)) : 0,
    averageScore,
    totalGraded: graded,
    gradingCompletionRate: submittedIds.size ? Number(((graded / submittedIds.size) * 100).toFixed(2)) : 0,
  };
}

function decorateTask(db, task) {
  const stats = computeTaskSubmissionStats(db, task);
  return {
    ...task,
    ...stats,
  };
}

function enrichSubmissionWithTask(db, submission) {
  const task = asArray(db.homeworks).map((item) => normalizeTask(item, db)).find((item) => String(item.id) === String(submission.assignmentId));
  return {
    ...submission,
    homeworkId: submission.assignmentId,
    homeworkTitle: task?.title || "",
    assignmentTitle: task?.title || "",
    taskType: task?.taskType || "homework",
    type: task?.type || "HOMEWORK",
    subject: task?.subject || "",
    classId: task?.classId || "",
    className: task?.className || "",
    dueDate: task?.dueDate || "",
    maxScore: Number(task?.maxScore || 20),
    isGraded: task?.isGraded !== false,
  };
}

function timelinessForTask(task, submission, currentTime = Date.now()) {
  const dueAt = task?.dueDate ? new Date(task.dueDate).getTime() : null;
  if (!dueAt || Number.isNaN(dueAt)) return submission?.isLate ? "late" : "on_time";
  if (submission) {
    return submission.isLate ? "late" : "on_time";
  }
  return currentTime > dueAt ? "overdue" : "pending";
}

function decorateTaskForStudent(db, task, studentProfile, currentTime = Date.now()) {
  const submission = getTaskSubmissionForStudent(db, task.id, studentProfile.id);
  const status = submission?.status || "not_submitted";
  const timeliness = timelinessForTask(task, submission, currentTime);
  return {
    ...task,
    submission: submission ? enrichSubmissionWithTask(db, submission) : null,
    submissionStatus: status,
    timelinessStatus: timeliness,
    isOverdue: timeliness === "overdue",
  };
}

function getVisibleTasks(db, user, query = {}) {
  const now = Date.now();
  const tasks = asArray(db.homeworks).map((item) => normalizeTask(item, db));
  let rows = [];

  if (user.role === "ADMIN") {
    rows = tasks;
  } else if (user.role === "TEACHER") {
    rows = tasks.filter((task) => isTeacherSubjectAllowed(user, task.subject));
  } else if (user.role === "STUDENT") {
    const profile = getStudentProfile(db, user.studentId);
    if (!profile) return [];
    rows = tasks
      .filter((task) => canStudentViewTask(task, profile, now))
      .map((task) => decorateTaskForStudent(db, task, profile, now));
  } else if (user.role === "PARENT") {
    const children = getParentChildProfiles(db, user);
    const seen = new Set();
    rows = [];
    for (const child of children) {
      for (const task of tasks) {
        if (!canStudentViewTask(task, child, now)) continue;
        const key = String(task.id);
        if (seen.has(key)) continue;
        seen.add(key);
        rows.push(task);
      }
    }
  }

  const classId = String(query.classId || "").trim();
  const status = String(query.status || "").trim().toLowerCase();
  const subjectRaw = String(query.subject || "").trim();
  const subject = subjectRaw ? normalizeSubject(subjectRaw) || subjectRaw : "";
  const taskType = String(query.taskType || query.type || "").trim().toLowerCase();

  rows = rows.filter((task) => {
    if (classId) {
      const taskClassId = String(task.classId || "").trim();
      const taskClassNameKey = nk(task.className);
      if (taskClassId !== classId && taskClassNameKey !== nk(classId)) return false;
    }
    if (status && String(task.status || "").toLowerCase() !== status) return false;
    if (subject && String(task.subject || "") !== subject) return false;
    if (taskType && String(task.taskType || "").toLowerCase() !== taskType) return false;
    return true;
  });

  if (user.role === "ADMIN" || user.role === "TEACHER") {
    rows = rows.map((task) => decorateTask(db, task));
  }

  return rows.sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));
}

function buildDashboard(db, user) {
  const currentTime = Date.now();

  if (user.role === "ADMIN") {
    const tasks = getVisibleTasks(db, user);
    const published = tasks.filter((task) => task.status === "published");
    const oneWeekAgo = currentTime - 7 * 24 * 60 * 60 * 1000;
    const tasksThisWeek = tasks.filter((task) => {
      const createdAt = new Date(task.createdAt).getTime();
      return !Number.isNaN(createdAt) && createdAt >= oneWeekAgo;
    }).length;

    const pendingGrading = asArray(db.submissions)
      .map(normalizeSubmission)
      .filter((item) => item.status === "submitted")
      .length;

    const averageSubmissionRate = published.length
      ? Number((published.reduce((sum, item) => sum + Number(item.submissionRate || 0), 0) / published.length).toFixed(2))
      : 0;

    const lowSubmissionTasks = published.filter((item) => Number(item.submissionRate || 0) < 50);

    return {
      role: "ADMIN",
      summary: {
        tasksPublishedThisWeek: tasksThisWeek,
        openTasks: published.length,
        pendingGrading,
        averageSubmissionRate,
        classesWithLowSubmission: new Set(lowSubmissionTasks.map((item) => String(item.className || item.classId || "Unspecified"))).size,
      },
      flags: lowSubmissionTasks.slice(0, 10).map((task) => ({
        taskId: task.id,
        title: task.title,
        className: task.className || "Unspecified",
        subject: task.subject,
        submissionRate: task.submissionRate,
      })),
      recentTasks: tasks.slice(0, 10),
    };
  }

  if (user.role === "TEACHER") {
    const tasks = getVisibleTasks(db, user);
    const active = tasks.filter((task) => task.status === "published");
    const pendingGrading = asArray(db.submissions)
      .map(normalizeSubmission)
      .filter((submission) => submission.status === "submitted")
      .filter((submission) => {
        const task = tasks.find((item) => String(item.id) === String(submission.assignmentId));
        return Boolean(task);
      }).length;

    const dueToday = active.filter((task) => task.dueDate && String(task.dueDate).slice(0, 10) === new Date(currentTime).toISOString().slice(0, 10)).length;
    const overdue = active.filter((task) => {
      if (!task.dueDate) return false;
      const dueAt = new Date(task.dueDate).getTime();
      return !Number.isNaN(dueAt) && dueAt < currentTime;
    }).length;

    const averageSubmissionRate = active.length
      ? Number((active.reduce((sum, item) => sum + Number(item.submissionRate || 0), 0) / active.length).toFixed(2))
      : 0;

    return {
      role: "TEACHER",
      summary: {
        activeTasks: active.length,
        dueToday,
        overdueTasks: overdue,
        pendingGrading,
        averageSubmissionRate,
      },
      recentTasks: tasks.slice(0, 12),
    };
  }

  if (user.role === "STUDENT") {
    const profile = getStudentProfile(db, user.studentId);
    if (!profile) {
      return {
        role: "STUDENT",
        summary: {
          pendingTasks: 0,
          dueToday: 0,
          dueThisWeek: 0,
          overdue: 0,
          graded: 0,
        },
        tasks: [],
      };
    }

    const tasks = getVisibleTasks(db, user);
    const nowDate = new Date(currentTime);
    const endOfWeek = new Date(nowDate);
    endOfWeek.setDate(nowDate.getDate() + 7);

    const summary = {
      pendingTasks: tasks.filter((task) => task.submissionStatus === "not_submitted" && task.timelinessStatus !== "overdue").length,
      dueToday: tasks.filter((task) => task.timelinessStatus !== "overdue" && task.dueDate && String(task.dueDate).slice(0, 10) === nowDate.toISOString().slice(0, 10)).length,
      dueThisWeek: tasks.filter((task) => {
        if (!task.dueDate || task.timelinessStatus === "overdue") return false;
        const dueAt = new Date(task.dueDate).getTime();
        return !Number.isNaN(dueAt) && dueAt >= currentTime && dueAt <= endOfWeek.getTime();
      }).length,
      overdue: tasks.filter((task) => task.timelinessStatus === "overdue").length,
      graded: tasks.filter((task) => task.submissionStatus === "graded" || task.submissionStatus === "returned").length,
    };

    return {
      role: "STUDENT",
      student: profile,
      summary,
      tasks,
    };
  }

  if (user.role === "PARENT") {
    const children = getParentChildProfiles(db, user);
    const rows = children.map((child) => {
      const tasks = asArray(db.homeworks)
        .map((item) => normalizeTask(item, db))
        .filter((task) => canStudentViewTask(task, child, currentTime))
        .map((task) => decorateTaskForStudent(db, task, child, currentTime));

      return {
        ...child,
        summary: {
          pendingTasks: tasks.filter((task) => task.submissionStatus === "not_submitted" && task.timelinessStatus !== "overdue").length,
          missedTasks: tasks.filter((task) => task.timelinessStatus === "overdue").length,
          recentlyGraded: tasks.filter((task) => task.submissionStatus === "graded" || task.submissionStatus === "returned").slice(0, 5).length,
        },
        tasks,
      };
    });

    return {
      role: "PARENT",
      children: rows,
    };
  }

  return { role: user.role, summary: {}, tasks: [] };
}

router.get("/metadata", auth(), (req, res) => {
  const db = readDB();
  const classes = activeClasses(db)
    .map((item) => ({
      id: String(item.id || ""),
      name: String(item.name || ""),
      section: String(item.section || ""),
      order: Number(item.order || 999),
    }))
    .sort((a, b) => a.order - b.order || String(a.name).localeCompare(String(b.name)));

  const subjectsByClass = classes.reduce((acc, cls) => {
    acc[cls.id] = getSubjectsForClassName(cls.name);
    return acc;
  }, {});

  const teacherSubjects = req.user.role === "TEACHER" ? asArray(req.user.subjects) : [];

  writeDB(db);
  res.json({
    role: req.user.role,
    classes,
    subjectsByClass,
    taskTypes: Array.from(TASK_TYPES).map((item) => ({ value: item.toLowerCase(), label: item })),
    taskStatuses: Array.from(TASK_STATUSES),
    submissionTypes: Array.from(SUBMISSION_TYPES),
    teacherSubjects,
  });
});

router.get("/dashboard", auth(), (req, res) => {
  const db = readDB();
  res.json(buildDashboard(db, req.user));
});

router.get("/", auth(), (req, res) => {
  const db = readDB();
  const rows = getVisibleTasks(db, req.user, req.query || {});
  res.json(rows);
});

router.post("/", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = readDB();

  const title = String(req.body?.title || "").trim();
  const subjectRaw = String(req.body?.subject || "").trim();
  const subject = normalizeSubject(subjectRaw);

  if (!title) {
    return res.status(400).json({ message: "title is required" });
  }

  if (!subject) {
    return res.status(400).json({ message: "Valid subject is required" });
  }

  if (!isTeacherSubjectAllowed(req.user, subject)) {
    return res.status(403).json({ message: "You can only create tasks for your assigned subject(s)." });
  }

  const normalizedType = normalizeTaskType(req.body?.type || req.body?.taskType || "HOMEWORK");
  const classRef = String(req.body?.classId || req.body?.className || "").trim();
  const classRow = classRef ? getClassByRef(db, classRef) : null;
  if (classRef && !classRow) {
    return res.status(400).json({ message: "Invalid class selected." });
  }

  const availableFrom = normalizeIsoDate(req.body?.availableFrom);
  const dueDate = normalizeIsoDate(req.body?.dueDate);
  const lateSubmissionDeadline = normalizeIsoDate(req.body?.lateSubmissionDeadline);

  if (availableFrom && dueDate) {
    const availableAt = new Date(availableFrom).getTime();
    const dueAt = new Date(dueDate).getTime();
    if (!Number.isNaN(availableAt) && !Number.isNaN(dueAt) && dueAt <= availableAt) {
      return res.status(400).json({ message: "Due date must be after available from date." });
    }
  }

  const submissionType = normalizeSubmissionType(req.body?.submissionType, "text");
  const isGraded = req.body?.isGraded !== false;
  const maxScoreRaw = req.body?.maxScore;
  const maxScore = isGraded ? toNumber(maxScoreRaw, 20) : 0;
  if (isGraded && (maxScore <= 0 || maxScore > 1000)) {
    return res.status(400).json({ message: "maxScore must be between 1 and 1000 for graded tasks." });
  }

  const status = normalizeTaskStatus(req.body?.status, "published");

  const attachments = [];
  const bodyAttachments = asArray(req.body?.attachments);
  for (const item of bodyAttachments) {
    const filePath = String(item?.filePath || item?.path || item?.uri || "").trim();
    if (!filePath) continue;
    assertAllowedHomeworkFile({
      filePath,
      fileName: item?.fileName || item?.name || item?.fileTitle || item?.title,
      fileMimeType: item?.fileMimeType || item?.mimeType,
    });
    attachments.push(
      normalizeTaskAttachment({
        ...item,
        filePath,
        uploadedBy: String(req.user.id || ""),
      })
    );
  }

  const singleAttachment = String(req.body?.attachmentPath || "").trim();
  if (singleAttachment) {
    assertAllowedHomeworkFile({ filePath: singleAttachment });
    attachments.push(
      normalizeTaskAttachment({
        filePath: singleAttachment,
        uploadedBy: String(req.user.id || ""),
      })
    );
  }

  const row = normalizeTask(
    {
      id: nanoid(),
      type: normalizedType.type,
      taskType: normalizedType.taskType,
      title,
      instructions: String(req.body?.instructions || "").trim(),
      classId: classRow?.id || "",
      className: classRow?.name || String(req.body?.className || "").trim(),
      subject,
      topic: String(req.body?.topic || "").trim(),
      lesson: String(req.body?.lesson || "").trim(),
      dueDate,
      availableFrom,
      maxScore,
      submissionType,
      allowLateSubmission: req.body?.allowLateSubmission !== false,
      lateSubmissionDeadline,
      isGraded,
      status,
      attachments,
      createdBy: String(req.user.id || ""),
      createdByName: String(req.user.name || ""),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    db
  );

  db.homeworks = asArray(db.homeworks);
  db.homeworks.unshift(row);
  writeDB(db);

  res.status(201).json(decorateTask(db, row));
});

router.get("/submissions", auth(), (req, res) => {
  const db = readDB();
  const taskRows = getVisibleTasks(db, req.user, {});
  const visibleTaskIds = new Set(taskRows.map((item) => String(item.id)));

  let rows = asArray(db.submissions)
    .map(normalizeSubmission)
    .filter((item) => visibleTaskIds.has(String(item.assignmentId)));

  if (req.user.role === "STUDENT") {
    const profile = getStudentProfile(db, req.user.studentId);
    if (profile) {
      rows = rows.filter((item) => String(item.studentId) === String(profile.id));
    } else {
      rows = [];
    }
  }

  if (req.user.role === "PARENT") {
    const children = new Set(getParentChildProfiles(db, req.user).map((item) => String(item.id)));
    rows = rows.filter((item) => children.has(String(item.studentId)));
  }

  const taskId = String(req.query.homeworkId || req.query.assignmentId || "").trim();
  if (taskId) {
    rows = rows.filter((item) => String(item.assignmentId) === taskId);
  }

  const status = String(req.query.status || "").trim().toLowerCase();
  if (status) {
    rows = rows.filter((item) => String(item.status) === status);
  }

  rows = rows
    .map((item) => enrichSubmissionWithTask(db, item))
    .sort((a, b) => String(b.updatedAt || b.submittedAt || "").localeCompare(String(a.updatedAt || a.submittedAt || "")));

  res.json(rows);
});

router.get("/:id/submissions", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = readDB();
  const taskId = String(req.params.id || "").trim();
  const task = asArray(db.homeworks).map((item) => normalizeTask(item, db)).find((item) => String(item.id) === taskId);
  if (!task) return res.status(404).json({ message: "Task not found" });

  if (req.user.role === "TEACHER" && !isTeacherSubjectAllowed(req.user, task.subject)) {
    return res.status(403).json({ message: "You can only view submissions for your assigned subject(s)." });
  }

  const expectedStudents = getExpectedStudentsForTask(db, task);
  const submissionMap = new Map(
    getTaskSubmissions(db, task.id).map((item) => [String(item.studentId), item])
  );

  const rows = expectedStudents.map((student) => {
    const submission = submissionMap.get(String(student.id)) || null;
    const status = submission?.status || "not_submitted";
    return {
      studentId: student.id,
      studentName: student.name,
      classId: student.classId,
      className: student.className,
      submissionId: submission?.id || "",
      status,
      submittedAt: submission?.submittedAt || "",
      isLate: submission?.isLate || false,
      score: submission?.score ?? null,
      feedback: submission?.feedback || "",
      submissionText: submission?.submissionText || "",
      content: submission?.submissionText || "",
      filePath: submission?.filePath || "",
      fileName: submission?.fileName || "",
      fileMimeType: submission?.fileMimeType || "",
      fileSize: submission?.fileSize || 0,
      hasFile: Boolean(submission?.filePath),
      timelinessStatus: timelinessForTask(task, submission),
      gradedAt: submission?.gradedAt || "",
    };
  });

  const statusFilter = String(req.query.status || "").trim().toLowerCase();
  const filtered = statusFilter
    ? rows.filter((item) => String(item.status).toLowerCase() === statusFilter || String(item.timelinessStatus).toLowerCase() === statusFilter)
    : rows;

  res.json({
    task: decorateTask(db, task),
    rows: filtered,
  });
});

router.post("/uploads", auth(), requireRole("ADMIN", "TEACHER", "STUDENT"), homeworkUploadMiddleware, (req, res) => {
  try {
    const uploadTarget = resolveHomeworkUploadTarget(req);
    if (req.file?.buffer?.length) {
      assertAllowedHomeworkFile({
        fileName: req.file.originalname || req.body?.fileName,
        fileMimeType: req.file.mimetype || req.body?.mimeType,
      });
      const uploaded = storeUploadedFile(req, {
        category: uploadTarget.category,
        fileName: req.file.originalname || req.body?.fileName || "homework-upload",
        mimeType: req.file.mimetype || req.body?.mimeType || "application/octet-stream",
        buffer: req.file.buffer,
      });
      return res.status(201).json({ ...uploaded, target: uploadTarget.target });
    }

    const uploaded = persistSubmissionAttachment(req, req.body || {}, uploadTarget.category);
    if (!uploaded.filePath || uploaded.filePath.startsWith("data:")) {
      return res.status(400).json({ message: "Upload data is required." });
    }
    assertAllowedHomeworkFile(uploaded);
    return res.status(201).json({ ...uploaded, target: uploadTarget.target });
  } catch (error) {
    return res.status(Number(error?.status || 500)).json({ message: error?.message || "Failed to upload file." });
  }
});

router.post("/submissions", auth(), requireRole("STUDENT"), (req, res) => {
  const db = readDB();

  const taskId = String(req.body?.homeworkId || req.body?.assignmentId || "").trim();
  const submissionText = String(req.body?.submissionText || req.body?.content || "").trim();
  const rawAttachment = normalizeSubmissionFile(req.body?.file && typeof req.body.file === "object" ? req.body.file : req.body || {});
  const storedAttachment = rawAttachment.filePath.startsWith("data:")
    ? persistSubmissionAttachment(req, req.body?.file && typeof req.body.file === "object" ? req.body.file : req.body || {}, "homework-submissions")
    : rawAttachment;
  const { filePath, fileName, fileMimeType, fileSize } = storedAttachment;

  if (!taskId) {
    return res.status(400).json({ message: "homeworkId or assignmentId is required" });
  }

  if (!submissionText && !filePath) {
    return res.status(400).json({ message: "submissionText/content or filePath is required" });
  }

  if (filePath.startsWith("data:") && !/^data:[^;]+;base64,/i.test(filePath)) {
    return res.status(400).json({ message: "filePath data URLs must be base64 encoded." });
  }

  if (fileSize > MAX_SUBMISSION_FILE_BYTES) {
    return res.status(400).json({ message: "Attached file must be 8 MB or smaller." });
  }

  if (filePath) {
    try {
      assertAllowedHomeworkFile({ filePath, fileName, fileMimeType });
    } catch (error) {
      return res.status(Number(error?.status || 400)).json({ message: error?.message || "Failed to attach file." });
    }
  }

  const student = getStudentProfile(db, req.user.studentId);
  if (!student) {
    return res.status(400).json({ message: "Student account is not linked to a student profile." });
  }

  const task = asArray(db.homeworks).map((item) => normalizeTask(item, db)).find((item) => String(item.id) === taskId);
  if (!task) return res.status(404).json({ message: "Task not found" });

  if (!canStudentViewTask(task, student)) {
    return res.status(403).json({ message: "You can only submit work assigned to your class subjects." });
  }

  if (task.status !== "published") {
    return res.status(400).json({ message: "This task is not currently open for submission." });
  }

  if (task.availableFrom) {
    const availableAt = new Date(task.availableFrom).getTime();
    if (!Number.isNaN(availableAt) && Date.now() < availableAt) {
      return res.status(400).json({ message: "Submission is not open yet for this task." });
    }
  }

  if (task.submissionType === "text" && !submissionText) {
    return res.status(400).json({ message: "This task requires text submission." });
  }

  if (task.submissionType === "file" && !filePath) {
    return res.status(400).json({ message: "This task requires file submission." });
  }

  if (task.submissionType === "text_and_file" && (!submissionText || !filePath)) {
    return res.status(400).json({ message: "This task requires both text and file submission." });
  }

  const dueAt = task.dueDate ? new Date(task.dueDate).getTime() : null;
  const lateAt = task.lateSubmissionDeadline ? new Date(task.lateSubmissionDeadline).getTime() : null;
  const now = Date.now();
  const isLate = dueAt && !Number.isNaN(dueAt) ? now > dueAt : false;

  if (isLate && !task.allowLateSubmission) {
    return res.status(400).json({ message: "Late submission is not allowed for this task." });
  }

  if (isLate && lateAt && !Number.isNaN(lateAt) && now > lateAt) {
    return res.status(400).json({ message: "Late submission window has closed for this task." });
  }

  const list = asArray(db.submissions).map(normalizeSubmission);
  const idx = list.findIndex(
    (item) => String(item.assignmentId) === taskId && String(item.studentId) === String(student.id)
  );

  const payload = normalizeSubmission({
    id: idx >= 0 ? list[idx].id : nanoid(),
    assignmentId: taskId,
    homeworkId: taskId,
    studentId: String(student.id),
    studentName: String(student.name || ""),
    studentUserId: String(req.user.id || ""),
    submissionText,
    content: submissionText,
    filePath,
    fileName,
    fileMimeType,
    fileSize,
    submittedAt: nowIso(),
    isLate,
    score: idx >= 0 ? list[idx].score : null,
    feedback: idx >= 0 ? list[idx].feedback : "",
    gradedBy: idx >= 0 ? list[idx].gradedBy : "",
    gradedAt: idx >= 0 ? list[idx].gradedAt : "",
    status: "submitted",
    createdAt: idx >= 0 ? list[idx].createdAt : nowIso(),
    updatedAt: nowIso(),
  });

  if (idx >= 0) list[idx] = payload;
  else list.unshift(payload);

  db.submissions = list;
  writeDB(db);

  res.status(idx >= 0 ? 200 : 201).json(enrichSubmissionWithTask(db, payload));
});

function gradeSubmission(req, res) {
  const db = readDB();
  const submissionId = String(req.params.id || "").trim();
  const list = asArray(db.submissions).map(normalizeSubmission);
  const idx = list.findIndex((item) => String(item.id) === submissionId);
  if (idx < 0) return res.status(404).json({ message: "Submission not found" });

  const submission = list[idx];
  const task = asArray(db.homeworks).map((item) => normalizeTask(item, db)).find((item) => String(item.id) === String(submission.assignmentId));
  if (!task) return res.status(400).json({ message: "Submission task no longer exists" });

  if (req.user.role === "TEACHER" && !isTeacherSubjectAllowed(req.user, task.subject)) {
    return res.status(403).json({ message: "You can only review submissions for your assigned subject(s)." });
  }

  const nextStatus = normalizeSubmissionStatus(req.body?.status, "graded");
  let score = submission.score;

  if (req.body?.score !== undefined && req.body?.score !== null && req.body?.score !== "") {
    const parsed = Number(req.body.score);
    if (!Number.isFinite(parsed)) {
      return res.status(400).json({ message: "score must be a number" });
    }
    const maxAllowed = task.isGraded !== false ? Number(task.maxScore || 20) : 100;
    if (parsed < 0 || parsed > maxAllowed) {
      return res.status(400).json({ message: `score must be between 0 and ${maxAllowed}` });
    }
    score = parsed;
  }

  const updated = normalizeSubmission({
    ...submission,
    score,
    feedback: req.body?.feedback !== undefined ? String(req.body.feedback || "").trim() : submission.feedback,
    status: nextStatus,
    gradedBy: String(req.user.id || ""),
    gradedAt: nowIso(),
    updatedAt: nowIso(),
  });

  list[idx] = updated;
  db.submissions = list;
  writeDB(db);

  res.json(enrichSubmissionWithTask(db, updated));
}

router.post("/submissions/bulk-grade", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = readDB();
  const submissionIds = Array.isArray(req.body?.submissionIds)
    ? req.body.submissionIds.map((item) => String(item || "").trim()).filter(Boolean)
    : [];

  if (!submissionIds.length) {
    return res.status(400).json({ message: "submissionIds is required" });
  }

  const nextStatus = normalizeSubmissionStatus(req.body?.status, "graded");
  const hasScore = req.body?.score !== undefined && req.body?.score !== null && req.body?.score !== "";
  const bulkScore = hasScore ? Number(req.body.score) : null;
  if (hasScore && !Number.isFinite(bulkScore)) {
    return res.status(400).json({ message: "score must be a number" });
  }

  const list = asArray(db.submissions).map(normalizeSubmission);
  const updatedRows = [];
  const skipped = [];

  for (const submissionId of submissionIds) {
    const idx = list.findIndex((item) => String(item.id) === submissionId);
    if (idx < 0) {
      skipped.push({ submissionId, reason: "Submission not found" });
      continue;
    }

    const submission = list[idx];
    const task = asArray(db.homeworks)
      .map((item) => normalizeTask(item, db))
      .find((item) => String(item.id) === String(submission.assignmentId));

    if (!task) {
      skipped.push({ submissionId, reason: "Task not found" });
      continue;
    }

    if (req.user.role === "TEACHER" && !isTeacherSubjectAllowed(req.user, task.subject)) {
      skipped.push({ submissionId, reason: "Not allowed for this subject" });
      continue;
    }

    let score = submission.score;
    if (hasScore) {
      const maxAllowed = task.isGraded !== false ? Number(task.maxScore || 20) : 100;
      if (bulkScore < 0 || bulkScore > maxAllowed) {
        skipped.push({ submissionId, reason: `score must be between 0 and ${maxAllowed}` });
        continue;
      }
      score = bulkScore;
    }

    const updated = normalizeSubmission({
      ...submission,
      score,
      feedback: req.body?.feedback !== undefined ? String(req.body.feedback || "").trim() : submission.feedback,
      status: nextStatus,
      gradedBy: String(req.user.id || ""),
      gradedAt: nowIso(),
      updatedAt: nowIso(),
    });

    list[idx] = updated;
    updatedRows.push(enrichSubmissionWithTask(db, updated));
  }

  db.submissions = list;
  writeDB(db);

  res.json({
    updatedCount: updatedRows.length,
    skippedCount: skipped.length,
    updatedRows,
    skipped,
  });
});

router.post("/:id/reminders", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = readDB();
  const taskId = String(req.params.id || "").trim();
  const task = asArray(db.homeworks).map((item) => normalizeTask(item, db)).find((item) => String(item.id) === taskId);
  if (!task) return res.status(404).json({ message: "Task not found" });

  if (req.user.role === "TEACHER" && !isTeacherSubjectAllowed(req.user, task.subject)) {
    return res.status(403).json({ message: "You can only send reminders for your assigned subject(s)." });
  }

  const expectedStudents = getExpectedStudentsForTask(db, task);
  const submissionMap = new Map(getTaskSubmissions(db, task.id).map((item) => [String(item.studentId), item]));

  const missingStudents = expectedStudents.filter((student) => !submissionMap.has(String(student.id)));

  db.assignmentReminders = asArray(db.assignmentReminders);
  db.smsLogs = asArray(db.smsLogs);

  const reminder = {
    id: nanoid(),
    assignmentId: task.id,
    reminderType: String(req.body?.reminderType || "overdue"),
    sendAt: nowIso(),
    status: "sent",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    recipients: missingStudents.map((student) => ({
      studentId: student.id,
      studentName: student.name,
      className: student.className,
    })),
  };

  db.assignmentReminders.unshift(reminder);

  const studentRows = asArray(db.students);
  const message = String(req.body?.message || `Reminder: ${task.title} is pending submission.`).trim();
  for (const student of missingStudents) {
    const details = studentRows.find((item) => String(item.id) === String(student.id)) || {};
    const contacts = [String(details.parentPhone || "").trim(), String(details.studentPhone || "").trim()].filter(Boolean);
    for (const phone of contacts) {
      db.smsLogs.unshift({
        id: nanoid(),
        to: phone,
        message,
        audience: "ASSIGNMENT_REMINDER",
        status: "QUEUED",
        studentId: student.id,
        studentName: student.name,
        className: student.className,
        assignmentId: task.id,
        assignmentTitle: task.title,
        createdAt: nowIso(),
      });
    }
  }

  writeDB(db);

  res.json({
    taskId: task.id,
    taskTitle: task.title,
    missingCount: missingStudents.length,
    reminder,
  });
});

router.patch("/submissions/:id/review", auth(), requireRole("ADMIN", "TEACHER"), gradeSubmission);
router.patch("/submissions/:id/grade", auth(), requireRole("ADMIN", "TEACHER"), gradeSubmission);

module.exports = router;

