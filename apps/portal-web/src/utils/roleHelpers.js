export const TEACHER_ROLES = ["TEACHER", "CLASS_TEACHER", "ASSIST_CLASS_TEACHER"];

export function normalizeRole(value) {
  return String(value || "").trim().toUpperCase();
}

export function isTeacherRole(value) {
  return TEACHER_ROLES.includes(normalizeRole(value));
}

export function matchesRoleAccess(userRole, allowedRoles = []) {
  const normalizedUserRole = normalizeRole(userRole);
  const normalizedAllowedRoles = Array.isArray(allowedRoles) ? allowedRoles.map(normalizeRole) : [];

  if (normalizedAllowedRoles.includes(normalizedUserRole)) return true;
  if (normalizedAllowedRoles.includes("TEACHER") && isTeacherRole(normalizedUserRole)) return true;
  return false;
}
