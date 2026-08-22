const express = require("express");
const { nanoid } = require("nanoid");
const { auth, requireRole } = require("../middleware/auth");
const { readDB, writeDB } = require("../lib/jsonStore");
const { normalizeSubject } = require("../lib/subjects");

const router = express.Router();

function canManageSubject(user, subject) {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  if (user.role !== "TEACHER") return false;

  const canonical = normalizeSubject(subject);
  if (!canonical) return false;

  return (user.subjects || [])
    .map((item) => normalizeSubject(item))
    .filter(Boolean)
    .includes(canonical);
}

function sortByNewest(items) {
  return [...items].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

function buildCommentMap(db) {
  const comments = Array.isArray(db.activityComments) ? db.activityComments : [];
  const map = new Map();

  for (const item of comments) {
    const key = String(item.activityId || "");
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }

  for (const [key, value] of map.entries()) {
    map.set(
      key,
      [...value].sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")))
    );
  }

  return map;
}

function getParentScope(db, user) {
  const students = Array.isArray(db.students) ? db.students : [];
  const orderedStudents = students
    .slice()
    .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));

  const refToId = new Map();
  const addRef = (ref, id) => {
    const key = String(ref || "").trim().toLowerCase();
    const safeId = String(id || "").trim();
    if (!key || !safeId) return;
    if (!refToId.has(key)) refToId.set(key, safeId);
  };

  orderedStudents.forEach((student, index) => {
    const id = String(student.id || "").trim();
    if (!id) return;

    const refs = [
      id,
      student.studentId,
      student.admissionNo,
      student.admissionNumber,
      student.registrationNo,
      student.registrationNumber,
      student.code,
      "AMS" + String(index + 1).padStart(4, "0"),
    ];

    refs.forEach((ref) => addRef(ref, id));
  });

  const requestedRefs = [
    ...(Array.isArray(user?.studentIds) ? user.studentIds : []),
    user?.studentId,
  ];

  const studentIds = new Set();
  const studentIdKeys = new Set();

  for (const ref of requestedRefs) {
    const raw = String(ref || "").trim();
    if (!raw) continue;

    const mapped = refToId.get(raw.toLowerCase()) || raw;
    if (!mapped) continue;

    studentIds.add(mapped);
    studentIdKeys.add(String(mapped).toLowerCase());
    studentIdKeys.add(raw.toLowerCase());
  }

  if (studentIds.size === 0 && requestedRefs.length > 0 && orderedStudents.length === 1) {
    const onlyId = String(orderedStudents[0].id || "").trim();
    if (onlyId) {
      studentIds.add(onlyId);
      studentIdKeys.add(onlyId.toLowerCase());
    }
  }

  const classIds = new Set(
    students
      .filter((student) => studentIds.has(String(student.id || "").trim()))
      .map((student) => String(student.classId || "").trim())
      .filter(Boolean)
  );

  return { studentIds, studentIdKeys, classIds };
}

function canParentViewActivity(activity, scope) {
  const studentId = String(activity.studentId || "");
  const classId = String(activity.classId || "");

  if (studentId) {
    const studentKey = studentId.toLowerCase();
    if (scope.studentIds.has(studentId) || scope.studentIdKeys.has(studentKey)) return true;
  }
  if (classId && scope.classIds.has(classId)) return true;
  return false;
}

function canStudentViewActivity(db, activity, studentId) {
  const sid = String(studentId || "");
  if (!sid) return false;

  const students = Array.isArray(db.students) ? db.students : [];
  const me = students.find((item) => String(item.id) === sid);
  if (!me) return false;

  if (String(activity.studentId || "") === sid) return true;
  return String(activity.classId || "") === String(me.classId || "");
}

function isActivityVisibleToUser(db, user, activity) {
  if (!user || !activity) return false;

  if (user.role === "ADMIN") return true;

  if (user.role === "TEACHER") {
    if (String(activity.createdBy || "") === String(user.id || "")) return true;
    if (!activity.subject) return false;
    return canManageSubject(user, activity.subject);
  }

  if (user.role === "PARENT") {
    return canParentViewActivity(activity, getParentScope(db, user));
  }

  if (user.role === "STUDENT") {
    return canStudentViewActivity(db, activity, user.studentId);
  }

  return false;
}

router.get("/", auth(), (req, res) => {
  const db = readDB();
  const activities = Array.isArray(db.activities) ? db.activities : [];
  const visible = activities.filter((activity) => isActivityVisibleToUser(db, req.user, activity));
  const commentMap = buildCommentMap(db);

  const payload = sortByNewest(visible).map((activity) => ({
    ...activity,
    comments: commentMap.get(String(activity.id)) || [],
  }));

  return res.json(payload);
});

router.post("/", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const { title, description, classId, studentId, subject, imageUrl, activityDate } = req.body || {};

  const safeTitle = String(title || "").trim();
  const safeDescription = String(description || "").trim();
  const safeClassId = String(classId || "").trim();
  const safeStudentId = String(studentId || "").trim();
  const safeImageUrl = String(imageUrl || "").trim();
  const safeActivityDate = String(activityDate || "").trim() || new Date().toISOString().slice(0, 10);

  if (!safeTitle || !safeDescription || !safeClassId) {
    return res.status(400).json({ message: "title, description and classId are required" });
  }

  const db = readDB();
  const classes = Array.isArray(db.classes) ? db.classes : [];
  const students = Array.isArray(db.students) ? db.students : [];

  const cls = classes.find((item) => String(item.id) === safeClassId);
  if (!cls) return res.status(400).json({ message: "Invalid classId" });

  let student = null;
  if (safeStudentId) {
    student = students.find((item) => String(item.id) === safeStudentId);
    if (!student) return res.status(400).json({ message: "Invalid studentId" });
    if (String(student.classId || "") !== safeClassId) {
      return res.status(400).json({ message: "Selected student does not belong to selected class" });
    }
  }

  let canonicalSubject = "";
  if (subject !== undefined && subject !== null && String(subject).trim()) {
    canonicalSubject = normalizeSubject(subject);
    if (!canonicalSubject) {
      return res.status(400).json({ message: "Invalid subject. Use a standard subject name." });
    }
  }

  if (req.user.role === "TEACHER" && canonicalSubject && !canManageSubject(req.user, canonicalSubject)) {
    return res.status(403).json({ message: "You can only post activities for your assigned subject(s)." });
  }

  const now = new Date().toISOString();
  const activity = {
    id: nanoid(),
    title: safeTitle,
    description: safeDescription,
    classId: safeClassId,
    className: String(cls.name || ""),
    studentId: safeStudentId,
    studentName: student ? String(student.name || "") : "",
    subject: canonicalSubject,
    imageUrl: safeImageUrl,
    activityDate: safeActivityDate,
    createdBy: String(req.user.id || ""),
    createdByName: String(req.user.name || ""),
    createdAt: now,
    updatedAt: now,
  };

  if (!Array.isArray(db.activities)) db.activities = [];
  db.activities.unshift(activity);
  writeDB(db);

  return res.status(201).json({ ...activity, comments: [] });
});

router.post("/:id/comments", auth(), requireRole("PARENT"), (req, res) => {
  const { id } = req.params;
  const text = String(req.body?.comment || "").trim();

  if (!text) return res.status(400).json({ message: "comment is required" });

  const db = readDB();
  const activity = (Array.isArray(db.activities) ? db.activities : []).find((item) => String(item.id) === String(id));
  if (!activity) return res.status(404).json({ message: "Activity not found" });

  if (!isActivityVisibleToUser(db, req.user, activity)) {
    return res.status(403).json({ message: "You can only comment on activities visible to your child(ren)." });
  }

  const comment = {
    id: nanoid(),
    activityId: String(id),
    authorId: String(req.user.id || ""),
    authorName: String(req.user.name || "Parent"),
    role: String(req.user.role || "PARENT"),
    comment: text,
    createdAt: new Date().toISOString(),
  };

  if (!Array.isArray(db.activityComments)) db.activityComments = [];
  db.activityComments.push(comment);
  writeDB(db);

  return res.status(201).json(comment);
});

module.exports = router;
