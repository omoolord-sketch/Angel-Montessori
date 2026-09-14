const express = require("express");
const { nanoid } = require("nanoid");
const { auth, requireRole } = require("../middleware/auth");
const { readDB, writeDB } = require("../lib/jsonStore");
const {
  ensureAcademicSystemShape,
  getLegacyClassMapping,
  sortAcademicClasses,
} = require("../lib/academicSystems");

const router = express.Router();

router.get("/", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = readDB();
  ensureAcademicSystemShape(db);
  writeDB(db);
  const classes = sortAcademicClasses((db.classes || []).filter((item) => item.isActive !== false));
  res.json(classes);
});

router.post("/", auth(), requireRole("ADMIN"), (req, res) => {
  const { name, section, order } = req.body || {};
  if (!name || !section) return res.status(400).json({ message: "name and section are required" });
  const legacy = getLegacyClassMapping(name);
  if (legacy) {
    return res.status(400).json({ message: `${name} is preserved for history only. Use ${legacy.targetClassName || "an active class"} for new records.` });
  }

  const db = readDB();
  ensureAcademicSystemShape(db);
  const newClass = {
    id: nanoid(),
    name: String(name).trim(),
    section: String(section).trim(),
    order: order === undefined ? 999 : Number(order),
  };

  db.classes = db.classes || [];
  db.classes.push(newClass);
  writeDB(db);

  res.status(201).json(newClass);
});

module.exports = router;
