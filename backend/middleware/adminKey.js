function requireAdminKey(req, res, next) {
  const expected = process.env.ADMIN_DASHBOARD_KEY || "change_me_admin_key";
  const provided = req.header("x-admin-key");

  if (!provided || provided !== expected) {
    return res.status(403).json({ message: "Admin access denied" });
  }

  return next();
}

module.exports = { requireAdminKey };
