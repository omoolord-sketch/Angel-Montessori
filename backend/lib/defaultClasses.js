const {
  ACTIVE_CLASS_CONFIGS,
  classIdFromName,
  ensureAcademicSystemShape,
} = require("./academicSystems");

const DEFAULT_CLASSES = ACTIVE_CLASS_CONFIGS.map((item) => ({
  id: item.id,
  name: item.name,
  section: item.section,
  order: item.displayOrder,
  displayOrder: item.displayOrder,
  level: item.level,
  academicSystem: item.academicSystem,
  curriculumFramework: item.curriculumFramework,
  assessmentFramework: item.assessmentFramework,
  isActive: true,
}));

function normalizeKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function ensureDefaultClassesInDb(db) {
  if (!db) return false;
  const before = JSON.stringify(db.classes || []);
  ensureAcademicSystemShape(db);
  return before !== JSON.stringify(db.classes || []);
}

async function ensureDefaultClasses(prisma) {
  const existing = await prisma.class.findMany({
    select: { id: true, name: true, section: true, order: true },
  });

  const existingKeys = new Set(existing.map((item) => normalizeKey(item.name)));
  const missing = DEFAULT_CLASSES.filter((item) => !existingKeys.has(normalizeKey(item.name)));

  if (missing.length > 0) {
    await prisma.class.createMany({
      data: missing.map((item) => ({
        name: item.name,
        section: item.section,
        order: item.order,
      })),
    });
  }
}

module.exports = {
  DEFAULT_CLASSES,
  classIdFromName,
  ensureDefaultClassesInDb,
  ensureDefaultClasses,
};
