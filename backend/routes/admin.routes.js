const express = require("express");
const { nanoid } = require("nanoid");
const prisma = require("../prismaClient");
const { auth, requireRole } = require("../middleware/auth");
const { readDB, writeDB } = require("../lib/jsonStore");
const { normalizeSubjectList, SUBJECT_OPTIONS, CLASS_SUBJECTS } = require("../lib/subjects");
const { ensureDefaultClasses } = require("../lib/defaultClasses");
const { ensureAcademicSystemShape, getApprovedClassConfig, sortAcademicClasses } = require("../lib/academicSystems");
const { hashPassword } = require("../lib/passwords");
const { isTeacherRole } = require("../lib/roles");

const router = express.Router();
const ALLOWED_ROLES = ["ADMIN", "SUPER_ADMIN", "ICT_ADMIN", "ADMISSION_OFFICER", "ACADEMIC_OFFICER", "FINANCE_OFFICER", "TRANSPORT_ADMIN", "HR_OFFICER", "DRIVER", "TEACHER", "CLASS_TEACHER", "ASSIST_CLASS_TEACHER", "STUDENT", "PARENT", "APPLICANT"];
const USER_STATUSES = ["active", "inactive", "suspended", "archived"];
const ADMIN_MANAGEMENT_ROLES = ["ADMIN", "SUPER_ADMIN"];

function nowIso() {
  return new Date().toISOString();
}

function normalizeStatus(value, fallback = "active") {
  const status = String(value || fallback).trim().toLowerCase();
  return USER_STATUSES.includes(status) ? status : fallback;
}

function normalizeStudentIds(value) {
  const list = Array.isArray(value) ? value : [];
  const out = [];
  const seen = new Set();

  for (const item of list) {
    const id = String(item || "").trim();
    if (!id) continue;
    const key = id.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(id);
  }

  return out;
}

function normalizeUsernamePart(value, fallback) {
  const cleaned = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .replace(/\.{2,}/g, ".");

  return cleaned || fallback;
}

function buildUniqueUsername(prefix, baseName, suffix, existingUsernames) {
  const safePrefix = normalizeUsernamePart(prefix, "user");
  const safeBaseName = normalizeUsernamePart(baseName, "account");
  const safeSuffix = normalizeUsernamePart(suffix, "001");

  let candidate = `${safePrefix}.${safeBaseName}.${safeSuffix}`;
  let i = 1;

  while (existingUsernames.has(candidate.toLowerCase())) {
    candidate = `${safePrefix}.${safeBaseName}.${safeSuffix}${i}`;
    i += 1;
  }

  existingUsernames.add(candidate.toLowerCase());
  return candidate;
}

function sanitize(user) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    status: normalizeStatus(user.status, "active"),
    mustChangePassword: user.mustChangePassword !== false,
    lastLoginAt: user.lastLoginAt || "",
    phone: user.phone || "",
    subjects: user.subjects || [],
    studentId: user.studentId || "",
    studentIds: user.studentIds || [],
    department: user.department || "",
    createdAt: user.createdAt || "",
    updatedAt: user.updatedAt || ""
  };
}

function randomPassword() {
  return `Tmp@${nanoid(10)}`;
}

function ensureOperationsCollections(db) {
  db.userActivityLogs = Array.isArray(db.userActivityLogs) ? db.userActivityLogs : [];
  db.accountProvisioningLogs = Array.isArray(db.accountProvisioningLogs) ? db.accountProvisioningLogs : [];
}

function addUserActivityLog(db, payload) {
  ensureOperationsCollections(db);
  db.userActivityLogs.unshift({
    id: nanoid(),
    action: String(payload.action || "").trim(),
    userId: String(payload.userId || "").trim(),
    targetUserId: String(payload.targetUserId || "").trim(),
    targetType: String(payload.targetType || "user").trim(),
    metadata: payload.metadata || {},
    createdAt: nowIso(),
  });
}

function addProvisioningLog(db, payload) {
  ensureOperationsCollections(db);
  db.accountProvisioningLogs.unshift({
    id: nanoid(),
    userType: String(payload.userType || "").trim().toLowerCase(),
    sourceRecordId: String(payload.sourceRecordId || "").trim(),
    generatedUsername: String(payload.generatedUsername || "").trim(),
    generatedPasswordHash: String(payload.generatedPasswordHash || "").trim(),
    deliveryMode: String(payload.deliveryMode || "portal").trim().toLowerCase(),
    provisionedBy: String(payload.provisionedBy || "").trim(),
    provisionedAt: nowIso(),
    status: String(payload.status || "created").trim().toLowerCase(),
    notes: String(payload.notes || "").trim(),
    metadata: payload.metadata || {},
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
}

function normalizeClassKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function classNameFromStudent(student) {
  return String(student?.className || student?.class || "").trim();
}

function matchesClass(student, cls) {
  const targetId = String(cls?.id || "").trim();
  const targetNameKey = normalizeClassKey(cls?.name || "");
  const studentClassId = String(student?.classId || "").trim();
  const studentClassNameKey = normalizeClassKey(classNameFromStudent(student));

  if (targetId && studentClassId && studentClassId === targetId) return true;
  if (targetNameKey && studentClassNameKey && studentClassNameKey === targetNameKey) return true;
  return false;
}

function findClassByIdOrName(classes, classRef) {
  const safeRef = String(classRef || "").trim();
  const refKey = normalizeClassKey(safeRef);

  return (Array.isArray(classes) ? classes : []).find((item) => {
    if (String(item?.id || "") === safeRef) return true;
    return normalizeClassKey(item?.name) === refKey;
  }) || null;
}

function ensureDefaultClassesInJsonStore() {
  const db = readDB();
  ensureAcademicSystemShape(db);
  writeDB(db);

  return sortAcademicClasses((db.classes || []).filter((item) => item.isActive !== false));
}
function getClassNameMap(db) {
  const out = new Map();
  const rows = Array.isArray(db.classes) ? db.classes : [];
  for (const cls of rows) out.set(String(cls.id), String(cls.name || ""));
  return out;
}

function getStudentMap(db) {
  const out = new Map();
  const rows = Array.isArray(db.students) ? db.students : [];
  for (const student of rows) out.set(String(student.id), student);
  return out;
}

function userMatchesClassFilter(user, classId, studentMap) {
  if (!classId) return true;
  const safeClassId = String(classId).trim();

  if (user.role === "STUDENT") {
    const student = studentMap.get(String(user.studentId || ""));
    if (!student) return false;
    return String(student.classId || "") === safeClassId;
  }

  if (user.role === "PARENT") {
    const linkedIds = normalizeStudentIds(user.studentIds || []);
    if (user.studentId) linkedIds.push(String(user.studentId));
    return linkedIds.some((id) => String(studentMap.get(String(id))?.classId || "") === safeClassId);
  }

  return true;
}

function listUsersWithFilters(db, query = {}) {
  const users = Array.isArray(db.users) ? db.users : [];
  const studentMap = getStudentMap(db);
  const classNameMap = getClassNameMap(db);

  const role = String(query.role || "").trim().toUpperCase();
  const status = String(query.status || "").trim().toLowerCase();
  const classId = String(query.classId || "").trim();
  const search = String(query.search || "").trim().toLowerCase();

  return users
    .filter((user) => {
      if (!role) return true;
      if (role === "TEACHER") return isTeacherRole(user.role);
      return String(user.role || "").toUpperCase() === role;
    })
    .filter((user) => (status ? normalizeStatus(user.status, "active") === status : true))
    .filter((user) => userMatchesClassFilter(user, classId, studentMap))
    .filter((user) => {
      if (!search) return true;
      const linkedClassNames = [];
      if (user.role === "STUDENT") {
        const st = studentMap.get(String(user.studentId || ""));
        if (st) linkedClassNames.push(String(st.className || classNameMap.get(String(st.classId)) || ""));
      }
      if (user.role === "PARENT") {
        const ids = normalizeStudentIds(user.studentIds || []);
        if (user.studentId) ids.push(String(user.studentId));
        for (const id of ids) {
          const st = studentMap.get(String(id));
          if (!st) continue;
          linkedClassNames.push(String(st.className || classNameMap.get(String(st.classId)) || ""));
        }
      }

      const hay = [user.name, user.username, user.phone, user.role, ...linkedClassNames]
        .map((item) => String(item || "").toLowerCase())
        .join(" ");
      return hay.includes(search);
    })
    .map((user) => {
      const safe = sanitize(user);
      if (safe.role === "STUDENT") {
        const student = studentMap.get(String(safe.studentId || ""));
        safe.linkedClassId = student ? String(student.classId || "") : "";
        safe.linkedClassName = student ? String(student.className || classNameMap.get(String(student.classId)) || "") : "";
      }
      if (safe.role === "PARENT") {
        const wardIds = normalizeStudentIds(safe.studentIds || []);
        if (safe.studentId) wardIds.push(String(safe.studentId));
        const wardNames = [];
        const classNames = new Set();
        for (const sid of wardIds) {
          const student = studentMap.get(String(sid));
          if (!student) continue;
          wardNames.push(String(student.name || sid));
          classNames.add(String(student.className || classNameMap.get(String(student.classId)) || ""));
        }
        safe.wardCount = wardNames.length;
        safe.wardNames = wardNames;
        safe.linkedClassName = Array.from(classNames).filter(Boolean).join(", ");
      }
      return safe;
    })
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
}

function buildUserDetail(db, userId) {
  const users = Array.isArray(db.users) ? db.users : [];
  const user = users.find((item) => String(item.id) === String(userId));
  if (!user) return null;

  const classNameMap = getClassNameMap(db);
  const studentMap = getStudentMap(db);
  const detail = sanitize(user);

  if (detail.role === "STUDENT") {
    const student = studentMap.get(String(detail.studentId || ""));
    if (student) {
      detail.linkedProfile = {
        type: "student",
        studentId: String(student.id),
        firstName: String(student.firstName || ""),
        lastName: String(student.lastName || ""),
        admissionNo: String(student.admissionNo || student.admissionNumber || ""),
        classId: String(student.classId || ""),
        className: String(student.className || classNameMap.get(String(student.classId)) || ""),
        parentPhone: String(student.parentPhone || ""),
        studentPhone: String(student.studentPhone || ""),
      };
    }
  }

  if (detail.role === "PARENT") {
    const wardIds = normalizeStudentIds(detail.studentIds || []);
    if (detail.studentId) wardIds.push(String(detail.studentId));
    const wards = wardIds
      .map((id) => studentMap.get(String(id)))
      .filter(Boolean)
      .map((student) => ({
        id: String(student.id),
        name: String(student.name || ""),
        classId: String(student.classId || ""),
        className: String(student.className || classNameMap.get(String(student.classId)) || ""),
      }));

    detail.linkedProfile = { type: "parent", wards };
  }

  if (isTeacherRole(detail.role)) {
    detail.linkedProfile = {
      type: "teacher",
      subjects: Array.isArray(detail.subjects) ? detail.subjects : [],
      department: String(detail.department || ""),
    };
  }

  const logs = (Array.isArray(db.userActivityLogs) ? db.userActivityLogs : [])
    .filter((item) => String(item.targetUserId || "") === String(userId) || String(item.userId || "") === String(userId))
    .slice(0, 30);

  return { ...detail, activityLogs: logs };
}

function collectStudentsForClass(db, cls) {
  const rows = Array.isArray(db.students) ? db.students : [];
  return rows
    .filter((student) => matchesClass(student, cls))
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
}

function getExistingUsernames(db) {
  const set = new Set();
  const users = Array.isArray(db.users) ? db.users : [];
  for (const user of users) {
    const username = String(user.username || "").trim().toLowerCase();
    if (username) set.add(username);
  }
  return set;
}

function findParentAccountForStudent(users, studentId) {
  return users.find((u) => {
    if (u.role !== "PARENT") return false;
    const linkedMany = normalizeStudentIds(u.studentIds || []);
    const linkedOne = String(u.studentId || "").trim();
    return linkedMany.includes(String(studentId)) || linkedOne === String(studentId);
  });
}

function findParentAccountByPhone(users, phone) {
  const safePhone = String(phone || "").trim();
  if (!safePhone) return null;
  return users.find((u) => u.role === "PARENT" && String(u.phone || "").trim() === safePhone) || null;
}

router.get("/subject-catalog", auth(), requireRole("ADMIN", "SUPER_ADMIN", "TEACHER"), (req, res) => {
  res.json({
    subjects: SUBJECT_OPTIONS,
    classSubjects: CLASS_SUBJECTS,
  });
});

router.get("/users/dashboard", auth(), requireRole(...ADMIN_MANAGEMENT_ROLES), (req, res) => {
  const db = readDB();
  const users = Array.isArray(db.users) ? db.users : [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const activeUsers = users.filter((u) => normalizeStatus(u.status, "active") === "active").length;
  const inactiveUsers = users.filter((u) => normalizeStatus(u.status, "active") === "inactive").length;
  const suspendedUsers = users.filter((u) => normalizeStatus(u.status, "active") === "suspended").length;
  const archivedUsers = users.filter((u) => normalizeStatus(u.status, "active") === "archived").length;

  const recentLoginsToday = users.filter((u) => {
    const ts = new Date(String(u.lastLoginAt || "")).getTime();
    if (!Number.isFinite(ts)) return false;
    return now - ts <= dayMs;
  }).length;

  const byRole = users.reduce((acc, user) => {
    const role = String(user.role || "UNKNOWN").toUpperCase();
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});

  res.json({
    totalUsers: users.length,
    activeUsers,
    inactiveUsers,
    suspendedUsers,
    archivedUsers,
    recentLoginsToday,
    byRole,
  });
});

router.get("/users", auth(), requireRole(...ADMIN_MANAGEMENT_ROLES), (req, res) => {
  const db = readDB();
  const users = listUsersWithFilters(db, req.query || {});
  res.json(users);
});

router.get("/users/:id", auth(), requireRole(...ADMIN_MANAGEMENT_ROLES), (req, res) => {
  const db = readDB();
  const detail = buildUserDetail(db, req.params.id);
  if (!detail) return res.status(404).json({ message: "user not found" });
  res.json(detail);
});

router.post("/users", auth(), requireRole(...ADMIN_MANAGEMENT_ROLES), async (req, res) => {
  const { name, username, password, role, phone, subjects, studentId, studentIds, status, mustChangePassword, department } = req.body || {};

  if (!name || !username || !password || !role) {
    return res.status(400).json({ message: "name, username, password, and role are required" });
  }

  const normalizedRole = String(role).toUpperCase();
  if (!ALLOWED_ROLES.includes(normalizedRole)) {
    return res.status(400).json({ message: `role must be one of: ${ALLOWED_ROLES.join(", ")}` });
  }

  const db = readDB();
  ensureOperationsCollections(db);
  const exists = (db.users || []).some((u) => String(u.username).toLowerCase() === String(username).toLowerCase());
  if (exists) return res.status(409).json({ message: "username already exists" });

  const normalizedSubjects = normalizeSubjectList(Array.isArray(subjects) ? subjects : []);
  if (isTeacherRole(normalizedRole) && normalizedSubjects.invalid.length) {
    return res.status(400).json({ message: `Invalid subjects: ${normalizedSubjects.invalid.join(", ")}` });
  }

  const normalizedStudentId = String(studentId || "").trim();
  const normalizedStudentIds = normalizeStudentIds(studentIds);

  if (normalizedRole === "STUDENT" && !normalizedStudentId) {
    return res.status(400).json({ message: "studentId is required for STUDENT accounts" });
  }

  if (normalizedRole === "PARENT" && normalizedStudentIds.length === 0) {
    return res.status(400).json({ message: "studentIds is required for PARENT accounts" });
  }

  const user = {
    id: nanoid(),
    name: String(name).trim(),
    username: String(username).trim(),
    password: await hashPassword(String(password)),
    role: normalizedRole,
    status: normalizeStatus(status, "active"),
    mustChangePassword: mustChangePassword !== false,
    lastLoginAt: "",
    phone: String(phone || "").trim(),
    subjects: isTeacherRole(normalizedRole) ? normalizedSubjects.subjects : [],
    studentId: normalizedRole === "STUDENT" ? normalizedStudentId : "",
    studentIds: normalizedRole === "PARENT" ? normalizedStudentIds : [],
    department: String(department || "").trim(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  db.users.unshift(user);
  addUserActivityLog(db, {
    action: "user_created",
    userId: req.user?.id,
    targetUserId: user.id,
    metadata: { role: user.role, status: user.status },
  });
  writeDB(db);

  res.status(201).json(sanitize(user));
});

router.patch("/users/:id", auth(), requireRole(...ADMIN_MANAGEMENT_ROLES), async (req, res) => {
  const { id } = req.params;
  const { name, password, role, phone, subjects, studentId, studentIds, status, mustChangePassword, department } = req.body || {};

  const db = readDB();
  ensureOperationsCollections(db);
  const idx = (db.users || []).findIndex((u) => String(u.id) === String(id));
  if (idx < 0) return res.status(404).json({ message: "user not found" });

  const current = db.users[idx];
  const nextRole = role ? String(role).toUpperCase() : current.role;
  if (!ALLOWED_ROLES.includes(nextRole)) {
    return res.status(400).json({ message: `role must be one of: ${ALLOWED_ROLES.join(", ")}` });
  }

  const currentSubjects = normalizeSubjectList(current.subjects || []).subjects;
  const providedSubjects = Array.isArray(subjects) ? subjects : currentSubjects;
  const normalizedSubjects = normalizeSubjectList(providedSubjects);
  if (isTeacherRole(nextRole) && normalizedSubjects.invalid.length) {
    return res.status(400).json({ message: `Invalid subjects: ${normalizedSubjects.invalid.join(", ")}` });
  }

  const nextStudentId = studentId !== undefined ? String(studentId || "").trim() : String(current.studentId || "").trim();
  const nextStudentIds = studentIds !== undefined ? normalizeStudentIds(studentIds) : normalizeStudentIds(current.studentIds);

  if (nextRole === "STUDENT" && !nextStudentId) {
    return res.status(400).json({ message: "studentId is required for STUDENT accounts" });
  }
  if (nextRole === "PARENT" && nextStudentIds.length === 0) {
    return res.status(400).json({ message: "studentIds is required for PARENT accounts" });
  }

  db.users[idx] = {
    ...current,
    name: name ? String(name).trim() : current.name,
    password: password ? await hashPassword(String(password)) : current.password,
    role: nextRole,
    status: status !== undefined ? normalizeStatus(status, normalizeStatus(current.status, "active")) : normalizeStatus(current.status, "active"),
    mustChangePassword: mustChangePassword !== undefined ? Boolean(mustChangePassword) : current.mustChangePassword !== false,
    phone: phone !== undefined ? String(phone || "").trim() : String(current.phone || "").trim(),
    subjects: isTeacherRole(nextRole) ? normalizedSubjects.subjects : [],
    studentId: nextRole === "STUDENT" ? nextStudentId : "",
    studentIds: nextRole === "PARENT" ? nextStudentIds : [],
    department: department !== undefined ? String(department || "").trim() : String(current.department || "").trim(),
    updatedAt: nowIso(),
  };

  addUserActivityLog(db, {
    action: "user_updated",
    userId: req.user?.id,
    targetUserId: id,
    metadata: { changedFields: Object.keys(req.body || {}) },
  });

  writeDB(db);
  res.json(sanitize(db.users[idx]));
});

router.post("/users/:id/actions", auth(), requireRole(...ADMIN_MANAGEMENT_ROLES), async (req, res) => {
  const { id } = req.params;
  const { action, role, status, studentId, studentIds, password, mustChangePassword } = req.body || {};
  const safeAction = String(action || "").trim().toLowerCase();

  const db = readDB();
  ensureOperationsCollections(db);
  const idx = (db.users || []).findIndex((u) => String(u.id) === String(id));
  if (idx < 0) return res.status(404).json({ message: "user not found" });

  const current = db.users[idx];
  const next = { ...current };

  if (safeAction === "activate") next.status = "active";
  else if (safeAction === "deactivate") next.status = "inactive";
  else if (safeAction === "suspend") next.status = "suspended";
  else if (safeAction === "set_status") next.status = normalizeStatus(status, normalizeStatus(current.status, "active"));
  else if (safeAction === "force_password_change") next.mustChangePassword = mustChangePassword !== false;
  else if (safeAction === "change_role") {
    const nextRole = String(role || "").toUpperCase();
    if (!ALLOWED_ROLES.includes(nextRole)) {
      return res.status(400).json({ message: `role must be one of: ${ALLOWED_ROLES.join(", ")}` });
    }
    next.role = nextRole;
  } else if (safeAction === "relink_profile") {
    if (next.role === "STUDENT") {
      next.studentId = String(studentId || "").trim();
      if (!next.studentId) return res.status(400).json({ message: "studentId is required" });
    }
    if (next.role === "PARENT") {
      next.studentIds = normalizeStudentIds(studentIds);
      if (next.studentIds.length === 0) return res.status(400).json({ message: "studentIds is required" });
    }
  } else if (safeAction === "reset_password") {
    const plain = String(password || randomPassword());
    next.password = await hashPassword(plain);
    next.mustChangePassword = true;
    db.users[idx] = { ...next, updatedAt: nowIso() };
    addUserActivityLog(db, { action: "user_reset_password", userId: req.user?.id, targetUserId: id, metadata: { temporaryPasswordIssued: true } });
    writeDB(db);
    return res.json({ user: sanitize(db.users[idx]), temporaryPassword: plain });
  } else {
    return res.status(400).json({ message: "Unsupported action" });
  }

  db.users[idx] = { ...next, updatedAt: nowIso() };
  addUserActivityLog(db, {
    action: `user_action_${safeAction}`,
    userId: req.user?.id,
    targetUserId: id,
    metadata: { role: db.users[idx].role, status: db.users[idx].status },
  });

  writeDB(db);
  return res.json({ user: sanitize(db.users[idx]) });
});

router.post("/users/bulk-actions", auth(), requireRole(...ADMIN_MANAGEMENT_ROLES), async (req, res) => {
  const { userIds, action, status, password } = req.body || {};
  const ids = Array.isArray(userIds) ? userIds.map((item) => String(item || "").trim()).filter(Boolean) : [];
  const safeAction = String(action || "").trim().toLowerCase();
  if (!ids.length) return res.status(400).json({ message: "userIds is required" });

  const db = readDB();
  ensureOperationsCollections(db);
  const updates = [];

  for (const id of ids) {
    const idx = (db.users || []).findIndex((u) => String(u.id) === id);
    if (idx < 0) continue;

    const user = { ...db.users[idx] };
    if (safeAction === "activate") user.status = "active";
    else if (safeAction === "deactivate") user.status = "inactive";
    else if (safeAction === "suspend") user.status = "suspended";
    else if (safeAction === "set_status") user.status = normalizeStatus(status, normalizeStatus(user.status, "active"));
    else if (safeAction === "force_password_change") user.mustChangePassword = true;
    else if (safeAction === "reset_password") {
      const plain = String(password || randomPassword());
      user.password = await hashPassword(plain);
      user.mustChangePassword = true;
      updates.push({ id, temporaryPassword: plain });
    }

    user.updatedAt = nowIso();
    db.users[idx] = user;
    if (!updates.find((item) => item.id === id)) updates.push({ id });
  }

  addUserActivityLog(db, {
    action: `user_bulk_action_${safeAction}`,
    userId: req.user?.id,
    targetType: "user_bulk",
    metadata: { count: updates.length, action: safeAction },
  });

  writeDB(db);
  res.json({ updatedCount: updates.length, updates });
});

router.get("/activity-logs", auth(), requireRole(...ADMIN_MANAGEMENT_ROLES), (req, res) => {
  const db = readDB();
  ensureOperationsCollections(db);
  const targetUserId = String(req.query.targetUserId || "").trim();
  const action = String(req.query.action || "").trim().toLowerCase();

  let rows = db.userActivityLogs;
  if (targetUserId) rows = rows.filter((item) => String(item.targetUserId || "") === targetUserId || String(item.userId || "") === targetUserId);
  if (action) rows = rows.filter((item) => String(item.action || "").toLowerCase().includes(action));

  res.json(rows.slice(0, 500));
});

router.delete("/users/:id", auth(), requireRole(...ADMIN_MANAGEMENT_ROLES), (req, res) => {
  const { id } = req.params;
  const db = readDB();
  ensureOperationsCollections(db);

  const target = (db.users || []).find((u) => String(u.id) === String(id));
  if (!target) return res.status(404).json({ message: "user not found" });

  if (String(req.user.id) === String(id)) {
    return res.status(400).json({ message: "You cannot delete your own account" });
  }

  const remainingAdmins = (db.users || []).filter((u) => ["ADMIN", "SUPER_ADMIN"].includes(String(u.role || "")) && String(u.id) !== String(id));
  if (["ADMIN", "SUPER_ADMIN"].includes(String(target.role || "")) && remainingAdmins.length === 0) {
    return res.status(400).json({ message: "At least one admin must remain" });
  }

  db.users = db.users.filter((u) => String(u.id) !== String(id));
  addUserActivityLog(db, { action: "user_deleted", userId: req.user?.id, targetUserId: id, metadata: { username: target.username } });
  writeDB(db);
  res.json({ ok: true });
});

router.get("/provisioning/overview", auth(), requireRole(...ADMIN_MANAGEMENT_ROLES), (req, res) => {
  const db = readDB();
  ensureOperationsCollections(db);

  const students = Array.isArray(db.students) ? db.students : [];
  const users = Array.isArray(db.users) ? db.users : [];
  const studentUsers = users.filter((u) => u.role === "STUDENT");
  const parentUsers = users.filter((u) => u.role === "PARENT");

  const studentsWithoutAccounts = students.filter((student) => !studentUsers.some((u) => String(u.studentId || "") === String(student.id)));

  const parentsWithoutAccounts = students.filter((student) => {
    return !parentUsers.some((u) => {
      const ids = normalizeStudentIds(u.studentIds || []);
      const one = String(u.studentId || "").trim();
      return ids.includes(String(student.id)) || one === String(student.id);
    });
  });

  const teacherProfiles = Array.isArray(db.teacherProfiles) ? db.teacherProfiles : [];
  const teachersWithoutAccounts = teacherProfiles.filter((profile) => {
    const uid = String(profile.userId || "").trim();
    if (uid) return !users.some((u) => String(u.id) === uid);
    const name = String(profile.fullName || profile.name || "").trim().toLowerCase();
    if (!name) return false;
    return !users.some((u) => isTeacherRole(u.role) && String(u.name || "").trim().toLowerCase() === name);
  });

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const provisionedThisWeek = db.accountProvisioningLogs.filter((log) => new Date(String(log.provisionedAt || log.createdAt || "")).getTime() >= weekAgo);
  const failedProvisioningJobs = db.accountProvisioningLogs.filter((log) => String(log.status || "").toLowerCase() === "failed");

  res.json({
    studentsWithoutAccounts: studentsWithoutAccounts.length,
    teachersWithoutAccounts: teachersWithoutAccounts.length,
    parentsWithoutAccounts: parentsWithoutAccounts.length,
    accountsProvisionedThisWeek: provisionedThisWeek.length,
    failedProvisioningJobs: failedProvisioningJobs.length,
  });
});
router.get("/provisioning/classes", auth(), requireRole(...ADMIN_MANAGEMENT_ROLES), async (req, res) => {
  try {
    await ensureDefaultClasses(prisma);
    const classes = await prisma.class.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      include: { _count: { select: { students: true } } }
    });

    const db = readDB();
    const jsonStudents = Array.isArray(db.students) ? db.students : [];

    return res.json(
      sortAcademicClasses(
        classes
          .map((cls) => {
            const config = getApprovedClassConfig(cls.name) || getApprovedClassConfig(cls.id);
            if (!config) return null;
            return {
              id: cls.id,
              name: config.name,
              section: config.section,
              level: config.level,
              academicSystem: config.academicSystem,
              curriculumFramework: config.curriculumFramework,
              assessmentFramework: config.assessmentFramework,
              order: Number(cls.order ?? config.displayOrder),
              displayOrder: config.displayOrder,
              studentCount: Math.max(
                Number(cls._count?.students || 0),
                jsonStudents.filter((student) => matchesClass(student, { ...cls, name: config.name })).length
              ),
            };
          })
          .filter(Boolean)
      )
    );
  } catch {
    const classes = ensureDefaultClassesInJsonStore();
    const db = readDB();
    const students = Array.isArray(db.students) ? db.students : [];

    const payload = [...classes]
      .sort((a, b) => {
        const orderA = Number(a.order ?? 999);
        const orderB = Number(b.order ?? 999);
        if (orderA !== orderB) return orderA - orderB;
        return String(a.name || "").localeCompare(String(b.name || ""));
      })
      .map((cls) => ({
        id: cls.id,
        name: cls.name,
        section: cls.section || "Other",
        order: cls.order ?? 999,
        studentCount: students.filter((student) => matchesClass(student, cls)).length,
      }));

    return res.json(payload);
  }
});

router.get("/provisioning/students", auth(), requireRole(...ADMIN_MANAGEMENT_ROLES), async (req, res) => {
  const classId = String(req.query.classId || "").trim();
  if (!classId) return res.status(400).json({ message: "classId is required" });

  let cls;
  let classStudents;

  try {
    cls = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        students: {
          orderBy: [{ name: "asc" }],
        },
      },
    });

    if (!cls) return res.status(404).json({ message: "Class not found" });
    classStudents = cls.students || [];

    if (classStudents.length === 0) {
      const db = readDB();
      const jsonMatches = (Array.isArray(db.students) ? db.students : []).filter((student) => matchesClass(student, cls));
      if (jsonMatches.length > 0) {
        classStudents = jsonMatches;
      }
    }

    if (classStudents.length === 0) {
      const db = readDB();
      const jsonMatches = (Array.isArray(db.students) ? db.students : []).filter((student) => matchesClass(student, cls));
      if (jsonMatches.length > 0) {
        classStudents = jsonMatches;
      }
    }
  } catch {
    const classes = ensureDefaultClassesInJsonStore();
    cls = findClassByIdOrName(classes, classId);
    if (!cls) return res.status(404).json({ message: "Class not found" });

    const db = readDB();
    classStudents = (Array.isArray(db.students) ? db.students : [])
      .filter((student) => matchesClass(student, cls))
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  }

  const db = readDB();
  const users = db.users || [];

  const students = classStudents.map((student) => {
    const studentAccount = users.find(
      (u) => u.role === "STUDENT" && String(u.studentId || "") === String(student.id)
    );

    const parentAccounts = users.filter((u) => {
      if (u.role !== "PARENT") return false;
      const linkedMany = Array.isArray(u.studentIds) ? u.studentIds.map((id) => String(id)) : [];
      const linkedOne = String(u.studentId || "").trim();
      return linkedMany.includes(String(student.id)) || linkedOne === String(student.id);
    });

    return {
      id: student.id,
      name: student.name,
      classId: student.classId || cls.id,
      className: cls.name,
      studentAccount: studentAccount ? sanitize(studentAccount) : null,
      parentAccounts: parentAccounts.map(sanitize),
    };
  });

  res.json({
    class: { id: cls.id, name: cls.name, section: cls.section },
    students,
  });
});

router.post("/provisioning/provision-class", auth(), requireRole(...ADMIN_MANAGEMENT_ROLES), async (req, res) => {
  const {
    classId,
    studentIds = [],
    createStudents = true,
    createParents = true,
    studentPassword = "",
    parentPassword = "",
    studentUsernamePrefix = "student",
    parentUsernamePrefix = "parent",
    forcePasswordChange = true,
    mergeSiblings = true,
  } = req.body || {};

  if (!classId) return res.status(400).json({ message: "classId is required" });
  if (!createStudents && !createParents) {
    return res.status(400).json({ message: "Set createStudents and/or createParents to true." });
  }

  let cls;
  let classStudents;

  try {
    cls = await prisma.class.findUnique({
      where: { id: String(classId) },
      include: { students: { orderBy: [{ name: "asc" }] } },
    });

    if (!cls) return res.status(404).json({ message: "Class not found" });
    classStudents = cls.students || [];
  } catch {
    const classes = ensureDefaultClassesInJsonStore();
    cls = findClassByIdOrName(classes, classId);
    if (!cls) return res.status(404).json({ message: "Class not found" });

    const jsonDb = readDB();
    classStudents = collectStudentsForClass(jsonDb, cls);
  }

  const requestedStudentIds = normalizeStudentIds(studentIds);
  if (requestedStudentIds.length > 0) {
    const requestedSet = new Set(requestedStudentIds.map((item) => String(item)));
    classStudents = classStudents.filter((student) => requestedSet.has(String(student.id)));
    if (classStudents.length === 0) {
      return res.status(400).json({ message: "No matching returning students found in the selected class." });
    }
  }

  const db = readDB();
  ensureOperationsCollections(db);
  const users = Array.isArray(db.users) ? db.users : [];
  const existingUsernames = getExistingUsernames(db);

  const rawStudentPassword = String(studentPassword || randomPassword());
  const rawParentPassword = String(parentPassword || randomPassword());
  const hashedStudentPassword = await hashPassword(rawStudentPassword);
  const hashedParentPassword = await hashPassword(rawParentPassword);

  const createdStudents = [];
  const createdParents = [];
  const skippedStudents = [];
  const skippedParents = [];

  for (const student of classStudents) {
    const existingStudentAccount = users.find((u) => u.role === "STUDENT" && String(u.studentId || "") === String(student.id));

    if (createStudents) {
      if (existingStudentAccount) {
        skippedStudents.push({
          studentId: student.id,
          studentName: student.name,
          reason: `Existing student account: ${existingStudentAccount.username}`,
        });
      } else {
        const username = buildUniqueUsername(
          studentUsernamePrefix,
          student.name,
          String(student.id).slice(-4),
          existingUsernames
        );

        const studentUser = {
          id: nanoid(),
          name: String(student.name || "").trim(),
          username,
          password: hashedStudentPassword,
          role: "STUDENT",
          status: "active",
          mustChangePassword: forcePasswordChange !== false,
          lastLoginAt: "",
          phone: String(student.studentPhone || "").trim(),
          subjects: [],
          studentId: String(student.id),
          studentIds: [],
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };

        users.unshift(studentUser);
        createdStudents.push({
          studentId: student.id,
          studentName: student.name,
          username: studentUser.username,
          phone: studentUser.phone || "",
          password: rawStudentPassword,
        });

        addProvisioningLog(db, {
          userType: "student",
          sourceRecordId: student.id,
          generatedUsername: studentUser.username,
          generatedPasswordHash: studentUser.password,
          deliveryMode: "portal",
          provisionedBy: req.user?.id,
          status: "created",
          metadata: { classId: cls.id, className: cls.name },
        });
      }
    }
  }

  if (createParents) {
    if (mergeSiblings) {
      const groups = new Map();
      for (const student of classStudents) {
        const phone = String(student.parentPhone || "").trim();
        const key = phone || `student-${student.id}`;
        const row = groups.get(key) || { phone, students: [] };
        row.students.push(student);
        groups.set(key, row);
      }

      for (const group of groups.values()) {
        const studentIds = group.students.map((s) => String(s.id));
        const existingByWard = users.find((u) => {
          if (u.role !== "PARENT") return false;
          const linkedMany = normalizeStudentIds(u.studentIds || []);
          const linkedOne = String(u.studentId || "").trim();
          return studentIds.some((sid) => linkedMany.includes(sid) || linkedOne === sid);
        });
        const existingByPhone = findParentAccountByPhone(users, group.phone);
        const existingParent = existingByWard || existingByPhone;

        if (existingParent) {
          const nextIds = Array.from(new Set([...normalizeStudentIds(existingParent.studentIds || []), ...studentIds]));
          existingParent.studentIds = nextIds;
          existingParent.studentId = "";
          existingParent.updatedAt = nowIso();
          skippedParents.push({
            studentId: studentIds.join(", "),
            studentName: group.students.map((s) => s.name).join(", "),
            reason: `Existing parent account: ${existingParent.username}`,
          });
          continue;
        }

        const first = group.students[0];
        const username = buildUniqueUsername(
          parentUsernamePrefix,
          first.name,
          String(first.id).slice(-4),
          existingUsernames
        );

        const parentUser = {
          id: nanoid(),
          name: `Parent of ${first.name}`,
          username,
          password: hashedParentPassword,
          role: "PARENT",
          status: "active",
          mustChangePassword: forcePasswordChange !== false,
          lastLoginAt: "",
          phone: String(group.phone || "").trim(),
          subjects: [],
          studentId: "",
          studentIds,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };

        users.unshift(parentUser);
        createdParents.push({
          studentId: studentIds.join(", "),
          studentName: group.students.map((s) => s.name).join(", "),
          username: parentUser.username,
          phone: parentUser.phone || "",
          password: rawParentPassword,
        });

        addProvisioningLog(db, {
          userType: "parent",
          sourceRecordId: studentIds.join(","),
          generatedUsername: parentUser.username,
          generatedPasswordHash: parentUser.password,
          deliveryMode: "portal",
          provisionedBy: req.user?.id,
          status: "created",
          metadata: { classId: cls.id, className: cls.name, mergedSiblings: studentIds.length > 1 },
        });
      }
    } else {
      for (const student of classStudents) {
        const existingParentAccount = findParentAccountForStudent(users, student.id);
        if (existingParentAccount) {
          skippedParents.push({
            studentId: student.id,
            studentName: student.name,
            reason: `Existing parent account: ${existingParentAccount.username}`,
          });
          continue;
        }

        const username = buildUniqueUsername(
          parentUsernamePrefix,
          student.name,
          String(student.id).slice(-4),
          existingUsernames
        );

        const parentUser = {
          id: nanoid(),
          name: `Parent of ${student.name}`,
          username,
          password: hashedParentPassword,
          role: "PARENT",
          status: "active",
          mustChangePassword: forcePasswordChange !== false,
          lastLoginAt: "",
          phone: String(student.parentPhone || "").trim(),
          subjects: [],
          studentId: "",
          studentIds: [String(student.id)],
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };

        users.unshift(parentUser);
        createdParents.push({
          studentId: student.id,
          studentName: student.name,
          username: parentUser.username,
          phone: parentUser.phone || "",
          password: rawParentPassword,
        });

        addProvisioningLog(db, {
          userType: "parent",
          sourceRecordId: student.id,
          generatedUsername: parentUser.username,
          generatedPasswordHash: parentUser.password,
          deliveryMode: "portal",
          provisionedBy: req.user?.id,
          status: "created",
          metadata: { classId: cls.id, className: cls.name, mergedSiblings: false },
        });
      }
    }
  }

  db.users = users;
  addUserActivityLog(db, {
    action: "provision_class_accounts",
    userId: req.user?.id,
    targetType: "class",
    metadata: {
      classId: cls.id,
      className: cls.name,
      createdStudentAccounts: createdStudents.length,
      createdParentAccounts: createdParents.length,
    },
  });

  writeDB(db);

  res.json({
    class: { id: cls.id, name: cls.name, section: cls.section },
    totalStudents: classStudents.length,
    createdStudents,
    createdParents,
    skippedStudents,
    skippedParents,
    summary: {
      createdStudentAccounts: createdStudents.length,
      createdParentAccounts: createdParents.length,
      skippedStudentAccounts: skippedStudents.length,
      skippedParentAccounts: skippedParents.length,
    },
  });
});

router.post("/provisioning/provision-parents", auth(), requireRole(...ADMIN_MANAGEMENT_ROLES), async (req, res) => {
  const {
    classId = "",
    parentPassword = "",
    parentUsernamePrefix = "parent",
    forcePasswordChange = true,
    mergeSiblings = true,
  } = req.body || {};

  const db = readDB();
  ensureOperationsCollections(db);
  const users = Array.isArray(db.users) ? db.users : [];

  const classes = Array.isArray(db.classes) ? db.classes : [];
  const targetClass = classId ? findClassByIdOrName(classes, classId) : null;
  const students = (Array.isArray(db.students) ? db.students : []).filter((student) => {
    if (!targetClass) return true;
    return matchesClass(student, targetClass);
  });

  const existingUsernames = getExistingUsernames(db);
  const plainPassword = String(parentPassword || randomPassword());
  const hashedPassword = await hashPassword(plainPassword);

  const created = [];
  const skipped = [];

  if (mergeSiblings) {
    const groups = new Map();
    for (const student of students) {
      const phone = String(student.parentPhone || "").trim();
      const key = phone || `student-${student.id}`;
      const row = groups.get(key) || { phone, students: [] };
      row.students.push(student);
      groups.set(key, row);
    }

    for (const group of groups.values()) {
      const studentIds = group.students.map((s) => String(s.id));
      const existingByWard = users.find((u) => {
        if (u.role !== "PARENT") return false;
        const linkedMany = normalizeStudentIds(u.studentIds || []);
        const linkedOne = String(u.studentId || "").trim();
        return studentIds.some((sid) => linkedMany.includes(sid) || linkedOne === sid);
      });
      const existingByPhone = findParentAccountByPhone(users, group.phone);
      const existingParent = existingByWard || existingByPhone;

      if (existingParent) {
        existingParent.studentIds = Array.from(new Set([...normalizeStudentIds(existingParent.studentIds || []), ...studentIds]));
        existingParent.studentId = "";
        existingParent.updatedAt = nowIso();
        skipped.push({ studentIds, reason: `Existing parent account: ${existingParent.username}` });
        continue;
      }

      const first = group.students[0];
      const username = buildUniqueUsername(
        parentUsernamePrefix,
        first.name,
        String(first.id).slice(-4),
        existingUsernames
      );

      const parentUser = {
        id: nanoid(),
        name: `Parent of ${first.name}`,
        username,
        password: hashedPassword,
        role: "PARENT",
        status: "active",
        mustChangePassword: forcePasswordChange !== false,
        lastLoginAt: "",
        phone: String(group.phone || "").trim(),
        subjects: [],
        studentId: "",
        studentIds,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };

      users.unshift(parentUser);
      created.push({ username: parentUser.username, phone: parentUser.phone, password: plainPassword, students: group.students.map((s) => s.name) });

      addProvisioningLog(db, {
        userType: "parent",
        sourceRecordId: studentIds.join(","),
        generatedUsername: parentUser.username,
        generatedPasswordHash: parentUser.password,
        deliveryMode: "portal",
        provisionedBy: req.user?.id,
        status: "created",
        metadata: { mergedSiblings: studentIds.length > 1, classId: targetClass?.id || "" },
      });
    }
  }

  db.users = users;
  addUserActivityLog(db, {
    action: "provision_parent_accounts",
    userId: req.user?.id,
    targetType: "provisioning",
    metadata: { classId: targetClass?.id || "", createdCount: created.length },
  });

  writeDB(db);
  res.json({ createdCount: created.length, skippedCount: skipped.length, created, skipped });
});

router.post("/provisioning/provision-teachers", auth(), requireRole(...ADMIN_MANAGEMENT_ROLES), async (req, res) => {
  const {
    teachers = [],
    teacherPassword = "",
    teacherUsernamePrefix = "teacher",
    teacherRole = "TEACHER",
    forcePasswordChange = true,
  } = req.body || {};

  const teacherRows = Array.isArray(teachers) ? teachers : [];
  if (teacherRows.length === 0) {
    return res.status(400).json({ message: "Provide teachers array for bulk teacher provisioning" });
  }

  const db = readDB();
  ensureOperationsCollections(db);
  const users = Array.isArray(db.users) ? db.users : [];
  const existingUsernames = getExistingUsernames(db);
  const plainPassword = String(teacherPassword || randomPassword());
  const hashedPassword = await hashPassword(plainPassword);
  const normalizedTeacherRole = String(teacherRole || "TEACHER").toUpperCase();
  if (!isTeacherRole(normalizedTeacherRole)) {
    return res.status(400).json({ message: "teacherRole must be TEACHER, CLASS_TEACHER, or ASSIST_CLASS_TEACHER" });
  }

  const created = [];
  const skipped = [];

  for (const teacher of teacherRows) {
    const name = String(teacher?.name || "").trim();
    const phone = String(teacher?.phone || "").trim();
    const department = String(teacher?.department || "").trim();
    const rowRole = String(teacher?.role || normalizedTeacherRole).toUpperCase();
    const subjects = normalizeSubjectList(Array.isArray(teacher?.subjects) ? teacher.subjects : []).subjects;

    if (!name) {
      skipped.push({ name: "", reason: "name is required" });
      continue;
    }

    if (!isTeacherRole(rowRole)) {
      skipped.push({ name, reason: "role must be TEACHER, CLASS_TEACHER, or ASSIST_CLASS_TEACHER" });
      continue;
    }

    const existingTeacher = users.find((u) => isTeacherRole(u.role) && String(u.name || "").trim().toLowerCase() === name.toLowerCase());
    if (existingTeacher) {
      skipped.push({ name, reason: `Existing teacher account: ${existingTeacher.username}` });
      continue;
    }

    const username = buildUniqueUsername(
      teacherUsernamePrefix,
      name,
      String(name).split(/\s+/).slice(-1)[0] || "001",
      existingUsernames
    );

    const user = {
      id: nanoid(),
      name,
      username,
      password: hashedPassword,
      role: rowRole,
      status: "active",
      mustChangePassword: forcePasswordChange !== false,
      lastLoginAt: "",
      phone,
      subjects,
      studentId: "",
      studentIds: [],
      department,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    users.unshift(user);
    created.push({ name, username, phone, password: plainPassword, department, role: rowRole, subjects });

    addProvisioningLog(db, {
      userType: "teacher",
      sourceRecordId: String(teacher?.id || name),
      generatedUsername: user.username,
      generatedPasswordHash: user.password,
      deliveryMode: "portal",
      provisionedBy: req.user?.id,
      status: "created",
      metadata: { department, role: rowRole, subjectsCount: subjects.length },
    });
  }

  db.users = users;
  addUserActivityLog(db, {
    action: "provision_teacher_accounts",
    userId: req.user?.id,
    targetType: "provisioning",
    metadata: { createdCount: created.length, skippedCount: skipped.length },
  });

  writeDB(db);
  res.json({ createdCount: created.length, skippedCount: skipped.length, created, skipped });
});

router.post("/provisioning/reissue-credentials", auth(), requireRole(...ADMIN_MANAGEMENT_ROLES), async (req, res) => {
  const { userIds, role, classId, password } = req.body || {};

  const db = readDB();
  ensureOperationsCollections(db);
  const users = Array.isArray(db.users) ? db.users : [];
  const studentMap = getStudentMap(db);

  let targets = [];
  const requestedIds = Array.isArray(userIds) ? userIds.map((id) => String(id || "").trim()).filter(Boolean) : [];
  if (requestedIds.length > 0) {
    targets = users.filter((u) => requestedIds.includes(String(u.id)));
  } else {
    targets = users.filter((u) => {
      if (role) {
        const requestedRole = String(role).toUpperCase();
        if (requestedRole === "TEACHER") {
          if (!isTeacherRole(u.role)) return false;
        } else if (String(u.role || "").toUpperCase() !== requestedRole) {
          return false;
        }
      }
      if (classId) return userMatchesClassFilter(u, classId, studentMap);
      return true;
    });
  }

  if (targets.length === 0) {
    return res.status(400).json({ message: "No users found for credential reissue" });
  }

  const out = [];
  for (const user of targets) {
    const plain = String(password || randomPassword());
    user.password = await hashPassword(plain);
    user.mustChangePassword = true;
    user.updatedAt = nowIso();

    out.push({
      userId: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      temporaryPassword: plain,
    });

    addProvisioningLog(db, {
      userType: String(user.role || "").toLowerCase(),
      sourceRecordId: String(user.id),
      generatedUsername: user.username,
      generatedPasswordHash: user.password,
      deliveryMode: "portal",
      provisionedBy: req.user?.id,
      status: "reissued",
      metadata: { reissue: true },
    });
  }

  addUserActivityLog(db, {
    action: "provision_reissue_credentials",
    userId: req.user?.id,
    targetType: "provisioning",
    metadata: { count: out.length },
  });

  writeDB(db);
  res.json({ updatedCount: out.length, credentials: out });
});

router.get("/provisioning/logs", auth(), requireRole(...ADMIN_MANAGEMENT_ROLES), (req, res) => {
  const db = readDB();
  ensureOperationsCollections(db);

  const userType = String(req.query.userType || "").trim().toLowerCase();
  const status = String(req.query.status || "").trim().toLowerCase();

  let rows = db.accountProvisioningLogs;
  if (userType) rows = rows.filter((item) => String(item.userType || "").toLowerCase() === userType);
  if (status) rows = rows.filter((item) => String(item.status || "").toLowerCase() === status);

  res.json(rows.slice(0, 500));
});
module.exports = router;
























