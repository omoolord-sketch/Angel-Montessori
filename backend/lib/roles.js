const { readDB } = require("./jsonStore");
const { normalizeSubject } = require("./subjects");

const TEACHER_ROLES = ["TEACHER", "CLASS_TEACHER", "ASSIST_CLASS_TEACHER"];

function normalizeRole(value) {
  return String(value || "").trim().toUpperCase();
}

function isTeacherRole(value) {
  return TEACHER_ROLES.includes(normalizeRole(value));
}

function getCanonicalRole(value) {
  const role = normalizeRole(value);
  return isTeacherRole(role) ? "TEACHER" : role;
}

function uniqueSubjects(list) {
  const out = [];
  const seen = new Set();

  for (const item of Array.isArray(list) ? list : []) {
    const canonical = normalizeSubject(item) || String(item || "").trim();
    if (!canonical) continue;
    const key = canonical.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(canonical);
  }

  return out;
}

function getTeacherAssignedSubjects(db, user) {
  const userId = String(user?.id || "").trim();
  if (!userId) return [];

  const subjects = [];
  const dbUser =
    (Array.isArray(db?.users) ? db.users : []).find((item) => String(item?.id || "") === userId) || user || {};

  subjects.push(...(Array.isArray(dbUser.subjects) ? dbUser.subjects : []));

  for (const row of Array.isArray(db?.lmsClassSubjects) ? db.lmsClassSubjects : []) {
    if (String(row?.teacherUserId || "") !== userId) continue;
    subjects.push(row?.subjectName);
  }

  for (const row of Array.isArray(db?.classSubjectOfferings) ? db.classSubjectOfferings : []) {
    if (String(row?.teacherUserId || "") !== userId) continue;
    subjects.push(row?.subject);
  }

  return uniqueSubjects(subjects);
}

function enrichRequestUser(sourceUser, db = null) {
  const currentDb = db || readDB();
  const originalRole = normalizeRole(sourceUser?.originalRole || sourceUser?.role);
  const safeUser = { ...(sourceUser || {}) };
  const subjects = isTeacherRole(originalRole)
    ? getTeacherAssignedSubjects(currentDb, safeUser)
    : uniqueSubjects(safeUser.subjects);

  return {
    ...safeUser,
    originalRole,
    role: getCanonicalRole(originalRole),
    subjects,
  };
}

function hasRequestedRoleAccess(user, allowedRoles = []) {
  const requested = Array.isArray(allowedRoles) ? allowedRoles.map(normalizeRole) : [];
  const originalRole = normalizeRole(user?.originalRole || user?.role);
  const canonicalRole = getCanonicalRole(originalRole);

  return requested.includes(originalRole) || requested.includes(canonicalRole);
}

module.exports = {
  TEACHER_ROLES,
  getCanonicalRole,
  getTeacherAssignedSubjects,
  hasRequestedRoleAccess,
  isTeacherRole,
  normalizeRole,
  enrichRequestUser,
};
