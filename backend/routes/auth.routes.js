const express = require("express");
const jwt = require("jsonwebtoken");
const { readDB, writeDB } = require("../lib/jsonStore");
const { auth } = require("../middleware/auth");
const { createRateLimiter } = require("../middleware/rateLimit");
const { hashPassword, verifyPassword } = require("../lib/passwords");
const { getTeacherAssignedSubjects, isTeacherRole } = require("../lib/roles");

const router = express.Router();

const loginLimiter = createRateLimiter({
  windowMs: Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.LOGIN_RATE_LIMIT_MAX || 10),
  keyPrefix: "auth-login",
  message: "Too many login attempts. Please try again later.",
});

function findStudentPhoto(db, studentId) {
  const students = Array.isArray(db?.students) ? db.students : [];
  const reports = Array.isArray(db?.reportCardStudents) ? db.reportCardStudents : [];
  const targetId = String(studentId || "").trim();
  if (!targetId) return "";
  const studentMatch = students.find((item) => String(item?.id || item?.studentId || "").trim() === targetId);
  if (studentMatch?.photoUrl) return String(studentMatch.photoUrl || "");
  const reportMatch = reports.find((item) => String(item?.id || item?.studentId || "").trim() === targetId);
  return String(reportMatch?.photoUrl || "");
}

function sanitizeUser(user, db = {}) {
  const studentPhotoUrl = user?.role === "STUDENT" ? findStudentPhoto(db, user.studentId) : "";
  const photoUrl = String(user?.photoUrl || studentPhotoUrl || "").trim();
  const subjects = isTeacherRole(user?.role) ? getTeacherAssignedSubjects(db, user) : user?.subjects || [];

  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    status: user.status || "active",
    mustChangePassword: user.mustChangePassword !== false,
    lastLoginAt: user.lastLoginAt || "",
    phone: user.phone || "",
    subjects,
    studentId: user.studentId || "",
    studentIds: user.studentIds || [],
    photoUrl,
  };
}

router.post("/login", loginLimiter, async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ message: "username and password are required" });
  }

  const db = readDB();
  const users = Array.isArray(db.users) ? db.users : [];
  const userIndex = users.findIndex(
    (u) => String(u.username).toLowerCase() === String(username).toLowerCase()
  );

  if (userIndex < 0) return res.status(401).json({ message: "Invalid credentials" });

  const user = users[userIndex];
  const authCheck = await verifyPassword(password, user.password);
  if (!authCheck.ok) return res.status(401).json({ message: "Invalid credentials" });

  const normalizedStatus = String(user.status || "active").toLowerCase();
  if (normalizedStatus !== "active") {
    return res.status(403).json({ message: "Account is not active. Contact school admin." });
  }

  const upgradedPassword = authCheck.needsUpgrade ? await hashPassword(password) : user.password;
  users[userIndex] = {
    ...user,
    password: upgradedPassword,
    status: normalizedStatus,
    mustChangePassword: user.mustChangePassword !== false,
    lastLoginAt: new Date().toISOString(),
  };
  db.users = users;
  writeDB(db);

  const payload = sanitizeUser(users[userIndex], db);
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "10h" });

  res.json({ token, user: payload });
});

router.get("/me", auth(), (req, res) => {
  const db = readDB();
  const users = Array.isArray(db.users) ? db.users : [];
  const current = users.find((item) => String(item?.id || "") === String(req.user?.id || ""));
  res.json({ user: current ? sanitizeUser(current, db) : req.user });
});

router.post("/change-password", auth(), async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "currentPassword and newPassword are required" });
  }

  const nextPassword = String(newPassword || "");
  if (nextPassword.length < 8) {
    return res.status(400).json({ message: "New password must be at least 8 characters long" });
  }

  const db = readDB();
  const users = Array.isArray(db.users) ? db.users : [];
  const userIndex = users.findIndex((u) => String(u.id || "") === String(req.user?.id || ""));
  if (userIndex < 0) {
    return res.status(404).json({ message: "User account no longer exists" });
  }

  const current = users[userIndex];
  const authCheck = await verifyPassword(currentPassword, current.password);
  if (!authCheck.ok) {
    return res.status(401).json({ message: "Current password is incorrect" });
  }

  const samePasswordCheck = await verifyPassword(nextPassword, current.password);
  if (samePasswordCheck.ok) {
    return res.status(400).json({ message: "Choose a different password from the current one" });
  }

  users[userIndex] = {
    ...current,
    password: await hashPassword(nextPassword),
    mustChangePassword: false,
    status: String(current.status || "active").toLowerCase(),
    updatedAt: new Date().toISOString(),
  };
  db.users = users;
  writeDB(db);

  const payload = sanitizeUser(users[userIndex], db);
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "10h" });

  res.json({ token, user: payload });
});

module.exports = router;
