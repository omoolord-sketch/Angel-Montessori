const prisma = require("../prismaClient");

function str(value) {
  return String(value ?? "").trim();
}

function normalizeClassKey(value) {
  return str(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function dateValue(value, fallback = "") {
  if (!value) return fallback;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? str(value) || fallback : date.toISOString();
}

function isArchivedStudent(student = {}) {
  const inactiveStatuses = new Set([
    "archived",
    "graduated",
    "withdrawn",
    "left",
    "transferred",
    "alumni",
    "inactive",
  ]);

  return Boolean(
    student.isArchived ||
      student.isGraduated ||
      student.hasLeft ||
      inactiveStatuses.has(str(student.status).toLowerCase()) ||
      inactiveStatuses.has(str(student.financeStatus).toLowerCase())
  );
}

function mergeStudentRoster(db, roster = {}) {
  if (!db || typeof db !== "object") {
    return { changed: false, classCount: 0, studentCount: 0 };
  }

  if (!Array.isArray(db.classes)) db.classes = [];
  if (!Array.isArray(db.students)) db.students = [];

  const incomingClasses = Array.isArray(roster.classes) ? roster.classes : [];
  const incomingStudents = Array.isArray(roster.students) ? roster.students : [];
  const classById = new Map();
  const classByName = new Map();
  let changed = false;

  for (const row of db.classes) {
    const id = str(row?.id);
    const key = normalizeClassKey(row?.name);
    if (id) classById.set(id, row);
    if (key && !classByName.has(key)) classByName.set(key, row);
  }

  for (const incoming of incomingClasses) {
    const incomingId = str(incoming?.id);
    const name = str(incoming?.name);
    const key = normalizeClassKey(name);
    if (!name || !key) continue;

    const existing = classByName.get(key) || classById.get(incomingId);
    if (existing) {
      if (!str(existing.name)) {
        existing.name = name;
        changed = true;
      }
      if (!str(existing.section) && str(incoming.section)) {
        existing.section = str(incoming.section);
        changed = true;
      }
      if (!Number.isFinite(Number(existing.order)) && Number.isFinite(Number(incoming.order))) {
        existing.order = Number(incoming.order);
        changed = true;
      }
      if (incomingId) classById.set(incomingId, existing);
      classByName.set(key, existing);
      continue;
    }

    const created = {
      id: incomingId || key,
      name,
      section: str(incoming.section) || "Other",
      order: Number.isFinite(Number(incoming.order)) ? Number(incoming.order) : 999,
      createdAt: dateValue(incoming.createdAt, new Date().toISOString()),
      updatedAt: new Date().toISOString(),
    };
    db.classes.push(created);
    classById.set(created.id, created);
    classByName.set(key, created);
    changed = true;
  }

  const existingStudents = new Map(
    db.students
      .filter((row) => str(row?.id))
      .map((row) => [str(row.id), row])
  );

  for (const incoming of incomingStudents) {
    const id = str(incoming?.id);
    const name = str(incoming?.name);
    if (!id || !name) continue;

    const incomingClass =
      incoming.class ||
      classById.get(str(incoming.classId)) ||
      null;
    const className = str(incomingClass?.name || incoming.className);
    const canonicalClass =
      classByName.get(normalizeClassKey(className)) ||
      classById.get(str(incoming.classId)) ||
      null;
    const classId = str(canonicalClass?.id || incoming.classId);
    const existing = existingStudents.get(id);

    if (existing) {
      const nextValues = {
        name,
        classId,
        className: str(canonicalClass?.name || className),
        updatedAt: dateValue(incoming.updatedAt, new Date().toISOString()),
      };

      for (const [key, value] of Object.entries(nextValues)) {
        if (value && str(existing[key]) !== str(value)) {
          existing[key] = value;
          changed = true;
        }
      }
      continue;
    }

    const createdAt = dateValue(incoming.createdAt, new Date().toISOString());
    const student = {
      id,
      name,
      classId,
      className: str(canonicalClass?.name || className),
      admissionNumber: str(incoming.admissionNumber || incoming.admissionNo),
      admissionNo: str(incoming.admissionNo || incoming.admissionNumber),
      status: isArchivedStudent(incoming) ? "archived" : "active",
      isArchived: isArchivedStudent(incoming),
      createdAt,
      updatedAt: dateValue(incoming.updatedAt, createdAt),
    };
    db.students.push(student);
    existingStudents.set(id, student);
    changed = true;
  }

  return {
    changed,
    classCount: db.classes.length,
    studentCount: db.students.filter((row) => !isArchivedStudent(row)).length,
  };
}

async function syncStudentRosterFromPrisma(db) {
  try {
    const [classes, students] = await Promise.all([
      prisma.class.findMany({
        select: {
          id: true,
          name: true,
          section: true,
          order: true,
          createdAt: true,
        },
      }),
      prisma.student.findMany({
        include: { class: true },
        orderBy: [{ createdAt: "asc" }],
      }),
    ]);

    return {
      available: true,
      ...mergeStudentRoster(db, { classes, students }),
    };
  } catch (error) {
    return {
      available: false,
      changed: false,
      classCount: Array.isArray(db?.classes) ? db.classes.length : 0,
      studentCount: Array.isArray(db?.students)
        ? db.students.filter((row) => !isArchivedStudent(row)).length
        : 0,
      error: str(error?.message),
    };
  }
}

module.exports = {
  isArchivedStudent,
  mergeStudentRoster,
  syncStudentRosterFromPrisma,
};
