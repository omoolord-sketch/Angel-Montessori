const jwt = require("jsonwebtoken");
const { readDB } = require("../lib/jsonStore");
const { enrichRequestUser, hasRequestedRoleAccess } = require("../lib/roles");

function auth(required = true) {
  return (req, res, next) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      if (!required) return next();
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const db = readDB();
      const current = (Array.isArray(db.users) ? db.users : []).find(
        (item) => String(item?.id || "") === String(decoded?.id || "")
      );
      if (!current) {
        return res.status(401).json({ message: "User account no longer exists. Please sign in again." });
      }

      const status = String(current.status || "active").trim().toLowerCase();
      if (status !== "active") {
        return res.status(403).json({ message: "Account is not active. Contact school admin." });
      }

      req.user = enrichRequestUser(current, db);
      return next();
    } catch {
      return res.status(401).json({ message: "Invalid token" });
    }
  };
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (!hasRequestedRoleAccess(req.user, roles)) return res.status(403).json({ message: "Forbidden" });
    next();
  };
}

module.exports = { auth, requireRole };
