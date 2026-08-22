const DEFAULT_CLASSES = [
  { name: "Creche", section: "Early Years", order: 1 },
  { name: "Playgroup", section: "Early Years", order: 2 },
  { name: "Nursery 1", section: "Early Years", order: 3 },
  { name: "Nursery 2", section: "Early Years", order: 4 },
  { name: "Reception", section: "Early Years", order: 5 },

  { name: "Basic 1", section: "Basic School", order: 10 },
  { name: "Basic 2", section: "Basic School", order: 11 },
  { name: "Basic 3", section: "Basic School", order: 12 },
  { name: "Basic 4", section: "Basic School", order: 13 },
  { name: "Basic 5", section: "Basic School", order: 14 },
  { name: "Basic 6", section: "Basic School", order: 15 },

  { name: "JSS 1", section: "Junior Secondary", order: 20 },
  { name: "JSS 2", section: "Junior Secondary", order: 21 },
  { name: "JSS 3", section: "Junior Secondary", order: 22 },

  { name: "SSS 1", section: "Senior Secondary", order: 30 },
  { name: "SSS 2", section: "Senior Secondary", order: 31 },
  { name: "SSS 3", section: "Senior Secondary", order: 32 },
];

function normalizeKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function classIdFromName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function ensureDefaultClassesInDb(db) {
  let mutated = false;

  if (!Array.isArray(db.classes)) {
    db.classes = [];
    mutated = true;
  }

  const existingByKey = new Map();
  db.classes.forEach((row) => {
    const key = normalizeKey(row?.name);
    if (!key) return;
    existingByKey.set(key, row);
  });

  DEFAULT_CLASSES.forEach((item) => {
    const key = normalizeKey(item.name);
    const existing = existingByKey.get(key);

    if (!existing) {
      db.classes.push({
        id: classIdFromName(item.name),
        name: item.name,
        section: item.section,
        order: item.order,
      });
      mutated = true;
      return;
    }

    if (!String(existing.id || "").trim()) {
      existing.id = classIdFromName(item.name);
      mutated = true;
    }

    if (!String(existing.section || "").trim()) {
      existing.section = item.section;
      mutated = true;
    }

    if (!Number.isFinite(Number(existing.order))) {
      existing.order = item.order;
      mutated = true;
    }
  });

  return mutated;
}

async function ensureDefaultClasses(prisma) {
  const existing = await prisma.class.findMany({
    select: { id: true, name: true, section: true, order: true },
  });

  const existingKeys = new Set(existing.map((item) => normalizeKey(item.name)));
  const missing = DEFAULT_CLASSES.filter((item) => !existingKeys.has(normalizeKey(item.name)));

  if (missing.length > 0) {
    await prisma.class.createMany({ data: missing });
  }
}

module.exports = {
  DEFAULT_CLASSES,
  classIdFromName,
  ensureDefaultClassesInDb,
  ensureDefaultClasses,
};
