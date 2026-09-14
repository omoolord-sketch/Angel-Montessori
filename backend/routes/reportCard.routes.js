const express = require("express");
const { z } = require("zod");
const { nanoid } = require("nanoid");
const XLSX = require("xlsx");
const prisma = require("../prismaClient");
const { auth, requireRole } = require("../middleware/auth");
const { readDB, writeDB } = require("../lib/jsonStore");
const { normalizeSubject, getSubjectsForClassName } = require("../lib/subjects");
const { ensureDefaultClasses, DEFAULT_CLASSES } = require("../lib/defaultClasses");
const {
  ensureAcademicSystemShape,
  enrichClassConfig,
  getApprovedClassConfig,
  getLegacyClassMapping,
  sortAcademicClasses,
  supportsNigerianCA,
} = require("../lib/academicSystems");

const router = express.Router();
const BROADSHEET_TYPES = new Set(["summary", "detailed", "early_years", "exam_office"]);
const SCHOOL_NAME = String(process.env.SCHOOL_NAME || "Angel Montessori School").trim();
const SCHOOL_ADDRESS = String(process.env.SCHOOL_ADDRESS || "152 Okedogbon Road, Owo, Ondo State, Nigeria").trim();
const SCHOOL_EMAIL = String(process.env.SCHOOL_EMAIL || "info@angelmontessori.ng").trim();
const SCHOOL_PHONE = String(process.env.SCHOOL_PHONE || "+234 803 506 7767").trim();

function normalizeClassKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function classIdFromName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isConnectionError(err) {
  const msg = String(err?.message || "");
  return (
    err?.code === "ECONNREFUSED" ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("DATABASE_URL is required") ||
    msg.includes("Prisma-backed features")
  );
}

function ensureDefaultClassesInJsonStore() {
  const db = readDB();
  ensureAcademicSystemShape(db);
  writeDB(db);
  return sortAcademicClasses(db.classes || []);
}

function getJsonClassMaps() {
  const classes = ensureDefaultClassesInJsonStore();
  const byId = new Map(classes.map((item) => [String(item.id), item]));
  return { classes, byId };
}

function getStudentExtraMap() {
  const db = readDB();
  const students = Array.isArray(db.students) ? db.students : [];
  return new Map(
    students.map((item) => [
      String(item.id),
      normalizeStudentExtra(item),
    ])
  );
}

function admissionValue(row = {}) {
  return String(row.admissionNumber || row.admissionNo || row.admission_no || row.studentNumber || "").trim();
}

function normalizeStudentExtra(row = {}) {
  const admissionNumber = admissionValue(row);
  return {
    admissionNumber,
    admissionNo: admissionNumber,
    photoUrl: String(row.photoUrl || ""),
    studentPhone: String(row.studentPhone || ""),
    parentGuardianName: String(row.parentGuardianName || row.guardianName || ""),
    parentPhone: String(row.parentPhone || row.guardianPhone || ""),
    alternatePhone: String(row.alternatePhone || ""),
    parentEmail: String(row.parentEmail || row.guardianEmail || ""),
    homeAddress: String(row.homeAddress || row.address || ""),
    firstName: String(row.firstName || ""),
    lastName: String(row.lastName || ""),
    otherName: String(row.otherName || ""),
    dateOfBirth: String(row.dateOfBirth || row.dob || ""),
    gender: String(row.gender || ""),
    studentType: String(row.studentType || ""),
    academicSession: String(row.academicSession || ""),
    academicTerm: String(row.academicTerm || ""),
    previousSchool: String(row.previousSchool || ""),
    status: String(row.status || (row.isArchived ? "archived" : "active")).toLowerCase(),
    isArchived: Boolean(row.isArchived || String(row.status || "").toLowerCase() === "archived"),
    archivedAt: String(row.archivedAt || ""),
  };
}

function serializeStudentRow(row = {}, extra = {}, className = "") {
  const derived = splitNameParts(row.name);
  const normalizedExtra = normalizeStudentExtra({ ...extra, admissionNumber: extra.admissionNumber || extra.admissionNo });
  const admissionNumber = admissionValue(normalizedExtra);
  return {
    id: row.id,
    name: row.name,
    firstName: String(normalizedExtra.firstName || "").trim() || derived.firstName,
    lastName: String(normalizedExtra.lastName || "").trim() || derived.lastName,
    otherName: normalizedExtra.otherName || "",
    admissionNumber,
    admissionNo: admissionNumber,
    dateOfBirth: normalizedExtra.dateOfBirth || "",
    gender: normalizedExtra.gender || "",
    classId: row.classId,
    className,
    photoUrl: normalizedExtra.photoUrl || "",
    studentPhone: normalizedExtra.studentPhone || "",
    parentGuardianName: normalizedExtra.parentGuardianName || "",
    parentPhone: normalizedExtra.parentPhone || "",
    alternatePhone: normalizedExtra.alternatePhone || "",
    parentEmail: normalizedExtra.parentEmail || "",
    homeAddress: normalizedExtra.homeAddress || "",
    studentType: normalizedExtra.studentType || "",
    academicSession: normalizedExtra.academicSession || "",
    academicTerm: normalizedExtra.academicTerm || "",
    previousSchool: normalizedExtra.previousSchool || "",
    status: normalizedExtra.status || "active",
    isArchived: Boolean(normalizedExtra.isArchived),
    archivedAt: normalizedExtra.archivedAt || "",
  };
}

function parseArchivedFilter(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (["all", "true", "1", "yes"].includes(raw)) return "all";
  if (["only", "archived"].includes(raw)) return "only";
  return "active";
}

function includeByArchivedFilter(row, archivedFilter) {
  const isArchived = Boolean(
    row?.isArchived ||
      String(row?.status || "").toLowerCase() === "archived"
  );

  if (archivedFilter === "all") return true;
  if (archivedFilter === "only") return isArchived;
  return !isArchived;
}

function splitNameParts(name) {
  const full = String(name || "").trim();
  if (!full) return { firstName: "", lastName: "" };
  const parts = full.split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : "",
  };
}

function buildStudentName(firstName, lastName, fallbackName) {
  const first = String(firstName || "").trim();
  const last = String(lastName || "").trim();
  const joined = [first, last].filter(Boolean).join(" ").trim();
  return joined || String(fallbackName || "").trim();
}
function canManageSubject(user, subject) {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  if (user.role !== "TEACHER") return false;
  const normalized = normalizeSubject(subject);
  if (!normalized) return false;

  return (user.subjects || [])
    .map((s) => normalizeSubject(s))
    .filter(Boolean)
    .includes(normalized);
}

async function findStudentWithClass(studentId) {
  try {
    const student = await prisma.student.findUnique({
      where: { id: String(studentId) },
      include: { class: true },
    });

    if (student) {
      return {
        id: student.id,
        name: student.name,
        classId: student.classId,
        className: student.class?.name || "",
      };
    }
  } catch {
    // fallback below
  }

  const db = readDB();
  const { byId } = getJsonClassMaps();
  const student = (Array.isArray(db.students) ? db.students : []).find((item) => String(item.id) === String(studentId));
  if (!student) return null;

  const cls = byId.get(String(student.classId));
  return {
    id: student.id,
    name: student.name,
    classId: student.classId,
    className: student.className || cls?.name || "",
  };
}

async function findTermLock(classId, session, term) {
  try {
    return await prisma.termLock.findUnique({
      where: {
        classId_session_term: {
          classId: String(classId),
          session: String(session),
          term: String(term),
        },
      },
    });
  } catch {
    const db = readDB();
    const locks = Array.isArray(db.termLocks) ? db.termLocks : [];
    return (
      locks.find(
        (item) =>
          String(item.classId) === String(classId) &&
          String(item.session) === String(session) &&
          String(item.term) === String(term)
      ) || null
    );
  }
}

async function ensureNotLocked(studentId, session, term) {
  const student = await findStudentWithClass(studentId);
  if (!student) return { ok: false, status: 400, message: "Invalid studentId" };

  const lock = await findTermLock(student.classId, session, term);
  if (lock?.status === "LOCKED") {
    return { ok: false, status: 409, message: "Term is locked for this class. Unlock to edit." };
  }

  return { ok: true, student };
}

function matchResultFilters(row, where) {
  if (where.session && String(row.session) !== String(where.session)) return false;
  if (where.term && String(row.term) !== String(where.term)) return false;
  if (where.studentId && String(row.studentId) !== String(where.studentId)) return false;
  return true;
}

function findDuplicateResult(rows, { studentId, session, term, subject, ignoreId }) {
  return rows.find((row) => {
    if (ignoreId && String(row.id) === String(ignoreId)) return false;
    return (
      String(row.studentId) === String(studentId) &&
      String(row.session) === String(session) &&
      String(row.term) === String(term) &&
      String(row.subject) === String(subject)
    );
  });
}

/* ---------- CLASSES ---------- */
router.get("/classes", auth(), requireRole("ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER", "TEACHER"), async (req, res) => {
  try {
    await ensureDefaultClasses(prisma);
    const classes = await prisma.class.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }] });
    return res.json(
      sortAcademicClasses(classes.map((item) => enrichClassConfig(item)).filter((item) => item.isActive !== false))
    );
  } catch {
    return res.json(ensureDefaultClassesInJsonStore().filter((item) => item.isActive !== false));
  }
});

router.post("/classes", auth(), requireRole("ADMIN"), async (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    section: z.string().min(1).default("Other"),
    order: z.number().int().optional(),
  });

  const data = schema.parse(req.body);
  const approvedClass = getApprovedClassConfig(data.name);
  const legacyClass = getLegacyClassMapping(data.name);
  if (legacyClass) {
    return res.status(400).json({ message: `${data.name} is preserved for history only. Use ${legacyClass.targetClassName || "an active class"} for new records.` });
  }

  try {
    const cls = await prisma.class.create({
      data: approvedClass
        ? { name: approvedClass.name, section: approvedClass.section, order: approvedClass.displayOrder }
        : data,
    });
    return res.status(201).json(cls);
  } catch (err) {
    if (!isConnectionError(err)) {
      return res.status(400).json({ message: "Failed to create class" });
    }

    const db = readDB();
    const classes = Array.isArray(db.classes) ? db.classes : [];
    const key = normalizeClassKey(data.name);
    const exists = classes.some((item) => normalizeClassKey(item.name) === key);
    if (exists) return res.status(409).json({ message: "Class already exists" });

    const displayOrder = approvedClass?.displayOrder ?? data.order ?? 999;
    const cls = {
      id: approvedClass?.id || classIdFromName(data.name),
      name: approvedClass?.name || data.name,
      section: approvedClass?.section || data.section,
      order: displayOrder,
      displayOrder,
      level: approvedClass?.level || "",
      academicSystem: approvedClass?.academicSystem || "",
      curriculumFramework: approvedClass?.curriculumFramework || "",
      assessmentFramework: approvedClass?.assessmentFramework || "",
      isActive: true,
    };

    classes.push(cls);
    db.classes = classes;
    writeDB(db);
    return res.status(201).json(cls);
  }
});

/* ---------- STUDENTS ---------- */
router.get("/students", auth(), requireRole("ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER", "TEACHER"), async (req, res) => {
  const archivedFilter = parseArchivedFilter(req.query.archived);

  try {
    const students = await prisma.student.findMany({
      include: { class: true },
      orderBy: [{ createdAt: "desc" }],
    });
    const extraById = getStudentExtraMap();

    return res.json(
      students
        .map((s) => {
          const extra = extraById.get(String(s.id)) || {};
          return serializeStudentRow(s, extra, s.class?.name || "");
        })
        .filter((row) => includeByArchivedFilter(row, archivedFilter))
    );
  } catch {
    const db = readDB();
    const { byId } = getJsonClassMaps();
    const students = Array.isArray(db.students) ? db.students : [];

    return res.json(
      [...students]
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .map((item) => {
          const cls = byId.get(String(item.classId));
          return serializeStudentRow(item, item, item.className || cls?.name || "");
        })
        .filter((row) => includeByArchivedFilter(row, archivedFilter))
    );
  }
});

router.post("/students", auth(), requireRole("ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER"), async (req, res) => {
  const schema = z.object({
    name: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    otherName: z.string().optional(),
    admissionNumber: z.string().optional(),
    admissionNo: z.string().optional(),
    dateOfBirth: z.string().optional(),
    gender: z.string().optional(),
    classId: z.string().min(1),
    photoUrl: z.string().optional(),
    studentPhone: z.string().optional(),
    parentGuardianName: z.string().optional(),
    parentPhone: z.string().optional(),
    alternatePhone: z.string().optional(),
    parentEmail: z.string().optional(),
    homeAddress: z.string().optional(),
    studentType: z.string().optional(),
    academicSession: z.string().optional(),
    academicTerm: z.string().optional(),
    previousSchool: z.string().optional(),
  });

  const data = schema.parse(req.body);
  const { name, firstName, lastName, classId, photoUrl, studentPhone, parentPhone } = data;
  const resolvedName = buildStudentName(firstName, lastName, name);
  if (!resolvedName) {
    return res.status(400).json({ message: "Provide student first name and last name, or a full name." });
  }
  const nameParts = splitNameParts(resolvedName);
  const resolvedFirstName = String(firstName || "").trim() || nameParts.firstName;
  const resolvedLastName = String(lastName || "").trim() || nameParts.lastName;
  const admissionNumber = admissionValue(data);

  try {
    const cls = await prisma.class.findUnique({ where: { id: classId } });
    if (!cls) return res.status(400).json({ message: "Invalid classId" });
    const currentClass = enrichClassConfig(cls);
    if (currentClass.isActive === false) {
      return res.status(400).json({ message: "This class is preserved for history only. Select an active AMES class." });
    }

    const student = await prisma.student.create({ data: { name: resolvedName, classId } });

    await prisma.auditLog.create({
      data: { userId: req.user?.id || null, action: "CREATE", entity: "Student", entityId: student.id, after: student },
    });

    // Keep photo in JSON mirror so portals/prints can render student image.
    const db = readDB();
    const students = Array.isArray(db.students) ? db.students : [];
    const idx = students.findIndex((item) => String(item.id) === String(student.id));
    const now = new Date().toISOString();
    const mirror = {
      id: student.id,
      name: student.name,
      firstName: resolvedFirstName,
      lastName: resolvedLastName,
      otherName: String(data.otherName || "").trim(),
      admissionNumber,
      admissionNo: admissionNumber,
      dateOfBirth: String(data.dateOfBirth || "").trim(),
      gender: String(data.gender || "").trim(),
      classId: student.classId,
      className: cls.name,
      photoUrl: String(photoUrl || ""),
      studentPhone: String(studentPhone || "").trim(),
      parentGuardianName: String(data.parentGuardianName || "").trim(),
      parentPhone: String(parentPhone || "").trim(),
      alternatePhone: String(data.alternatePhone || "").trim(),
      parentEmail: String(data.parentEmail || "").trim(),
      homeAddress: String(data.homeAddress || "").trim(),
      studentType: String(data.studentType || "").trim(),
      academicSession: String(data.academicSession || "").trim(),
      academicTerm: String(data.academicTerm || "").trim(),
      previousSchool: String(data.previousSchool || "").trim(),
      status: "active",
      isArchived: false,
      archivedAt: "",
      createdAt: idx >= 0 ? students[idx].createdAt || now : now,
      updatedAt: now,
    };
    if (idx >= 0) students[idx] = mirror;
    else students.unshift(mirror);
    db.students = students;
    writeDB(db);

    return res.status(201).json({
      id: student.id,
      name: student.name,
      firstName: resolvedFirstName,
      lastName: resolvedLastName,
      otherName: String(data.otherName || "").trim(),
      admissionNumber,
      admissionNo: admissionNumber,
      dateOfBirth: String(data.dateOfBirth || "").trim(),
      gender: String(data.gender || "").trim(),
      classId: student.classId,
      className: cls.name,
      photoUrl: String(photoUrl || ""),
      studentPhone: String(studentPhone || "").trim(),
      parentGuardianName: String(data.parentGuardianName || "").trim(),
      parentPhone: String(parentPhone || "").trim(),
      alternatePhone: String(data.alternatePhone || "").trim(),
      parentEmail: String(data.parentEmail || "").trim(),
      homeAddress: String(data.homeAddress || "").trim(),
      studentType: String(data.studentType || "").trim(),
      academicSession: String(data.academicSession || "").trim(),
      academicTerm: String(data.academicTerm || "").trim(),
      previousSchool: String(data.previousSchool || "").trim(),
      status: "active",
      isArchived: false,
      archivedAt: "",
    });
  } catch (err) {
    if (!isConnectionError(err)) {
      return res.status(400).json({ message: "Failed to create student" });
    }

    const db = readDB();
    const { byId } = getJsonClassMaps();
    const cls = byId.get(String(classId));
    if (!cls) return res.status(400).json({ message: "Invalid classId" });
    if (cls.isActive === false) {
      return res.status(400).json({ message: "This class is preserved for history only. Select an active AMES class." });
    }

    const now = new Date().toISOString();
    const student = {
      id: nanoid(),
      name: resolvedName,
      firstName: resolvedFirstName,
      lastName: resolvedLastName,
      otherName: String(data.otherName || "").trim(),
      admissionNumber,
      admissionNo: admissionNumber,
      dateOfBirth: String(data.dateOfBirth || "").trim(),
      gender: String(data.gender || "").trim(),
      classId: String(classId),
      className: cls.name,
      photoUrl: String(photoUrl || ""),
      studentPhone: String(studentPhone || "").trim(),
      parentGuardianName: String(data.parentGuardianName || "").trim(),
      parentPhone: String(parentPhone || "").trim(),
      alternatePhone: String(data.alternatePhone || "").trim(),
      parentEmail: String(data.parentEmail || "").trim(),
      homeAddress: String(data.homeAddress || "").trim(),
      studentType: String(data.studentType || "").trim(),
      academicSession: String(data.academicSession || "").trim(),
      academicTerm: String(data.academicTerm || "").trim(),
      previousSchool: String(data.previousSchool || "").trim(),
      status: "active",
      isArchived: false,
      archivedAt: "",
      createdAt: now,
      updatedAt: now,
    };

    const students = Array.isArray(db.students) ? db.students : [];
    students.unshift(student);
    db.students = students;
    writeDB(db);

    return res.status(201).json({
      id: student.id,
      name: student.name,
      firstName: student.firstName || "",
      lastName: student.lastName || "",
      otherName: student.otherName || "",
      admissionNumber: student.admissionNumber || "",
      admissionNo: student.admissionNo || student.admissionNumber || "",
      dateOfBirth: student.dateOfBirth || "",
      gender: student.gender || "",
      classId: student.classId,
      className: student.className,
      photoUrl: student.photoUrl || "",
      studentPhone: student.studentPhone || "",
      parentGuardianName: student.parentGuardianName || "",
      parentPhone: student.parentPhone || "",
      alternatePhone: student.alternatePhone || "",
      parentEmail: student.parentEmail || "",
      homeAddress: student.homeAddress || "",
      studentType: student.studentType || "",
      academicSession: student.academicSession || "",
      academicTerm: student.academicTerm || "",
      previousSchool: student.previousSchool || "",
      status: student.status,
      isArchived: student.isArchived,
      archivedAt: student.archivedAt,
    });
  }
});

router.patch("/students/:id", auth(), requireRole("ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER"), async (req, res) => {
  const id = String(req.params.id || "");
  const schema = z.object({
    name: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    otherName: z.string().optional(),
    admissionNumber: z.string().optional(),
    admissionNo: z.string().optional(),
    dateOfBirth: z.string().optional(),
    gender: z.string().optional(),
    classId: z.string().min(1).optional(),
    photoUrl: z.string().optional(),
    studentPhone: z.string().optional(),
    parentGuardianName: z.string().optional(),
    parentPhone: z.string().optional(),
    alternatePhone: z.string().optional(),
    parentEmail: z.string().optional(),
    homeAddress: z.string().optional(),
    studentType: z.string().optional(),
    academicSession: z.string().optional(),
    academicTerm: z.string().optional(),
    previousSchool: z.string().optional(),
  });

  const body = schema.parse(req.body);
  const now = new Date().toISOString();

  try {
    const before = await prisma.student.findUnique({
      where: { id },
      include: { class: true },
    });
    if (!before) return res.status(404).json({ message: "Student not found" });

    const nextClassId = String(body.classId || before.classId || "").trim();
    const cls = await prisma.class.findUnique({ where: { id: nextClassId } });
    if (!cls) return res.status(400).json({ message: "Invalid classId" });
    const currentClass = enrichClassConfig(cls);
    if (currentClass.isActive === false) {
      return res.status(400).json({ message: "This class is preserved for history only. Select an active AMES class." });
    }

    const resolvedName = buildStudentName(body.firstName, body.lastName, body.name || before.name);
    if (!resolvedName) {
      return res.status(400).json({ message: "Provide student first name and last name, or a full name." });
    }

    const student = await prisma.student.update({
      where: { id },
      data: {
        name: resolvedName,
        classId: nextClassId,
      },
      include: { class: true },
    });

    await prisma.auditLog.create({
      data: { userId: req.user?.id || null, action: "UPDATE", entity: "Student", entityId: student.id, before, after: student },
    });

    const db = readDB();
    const students = Array.isArray(db.students) ? db.students : [];
    const idx = students.findIndex((item) => String(item.id) === String(student.id));
    const existing = idx >= 0 ? students[idx] : {};
    const derived = splitNameParts(student.name);
    const existingAdmission = admissionValue(existing);
    const admissionNumber = body.admissionNumber !== undefined || body.admissionNo !== undefined ? admissionValue(body) : existingAdmission;
    const mirror = {
      id: student.id,
      name: student.name,
      firstName: String(body.firstName || "").trim() || derived.firstName || String(existing.firstName || "").trim(),
      lastName: String(body.lastName || "").trim() || derived.lastName || String(existing.lastName || "").trim(),
      otherName: body.otherName !== undefined ? String(body.otherName || "").trim() : String(existing.otherName || ""),
      admissionNumber,
      admissionNo: admissionNumber,
      dateOfBirth: body.dateOfBirth !== undefined ? String(body.dateOfBirth || "").trim() : String(existing.dateOfBirth || existing.dob || ""),
      gender: body.gender !== undefined ? String(body.gender || "").trim() : String(existing.gender || ""),
      classId: student.classId,
      className: student.class?.name || cls.name,
      photoUrl: body.photoUrl !== undefined ? String(body.photoUrl || "") : String(existing.photoUrl || ""),
      studentPhone: body.studentPhone !== undefined ? String(body.studentPhone || "").trim() : String(existing.studentPhone || ""),
      parentGuardianName: body.parentGuardianName !== undefined ? String(body.parentGuardianName || "").trim() : String(existing.parentGuardianName || existing.guardianName || ""),
      parentPhone: body.parentPhone !== undefined ? String(body.parentPhone || "").trim() : String(existing.parentPhone || ""),
      alternatePhone: body.alternatePhone !== undefined ? String(body.alternatePhone || "").trim() : String(existing.alternatePhone || ""),
      parentEmail: body.parentEmail !== undefined ? String(body.parentEmail || "").trim() : String(existing.parentEmail || existing.guardianEmail || ""),
      homeAddress: body.homeAddress !== undefined ? String(body.homeAddress || "").trim() : String(existing.homeAddress || existing.address || ""),
      studentType: body.studentType !== undefined ? String(body.studentType || "").trim() : String(existing.studentType || ""),
      academicSession: body.academicSession !== undefined ? String(body.academicSession || "").trim() : String(existing.academicSession || ""),
      academicTerm: body.academicTerm !== undefined ? String(body.academicTerm || "").trim() : String(existing.academicTerm || ""),
      previousSchool: body.previousSchool !== undefined ? String(body.previousSchool || "").trim() : String(existing.previousSchool || ""),
      status: String(existing.status || (existing.isArchived ? "archived" : "active")).toLowerCase() || "active",
      isArchived: Boolean(existing.isArchived || String(existing.status || "").toLowerCase() === "archived"),
      archivedAt: String(existing.archivedAt || ""),
      createdAt: existing.createdAt || now,
      updatedAt: now,
    };

    if (idx >= 0) students[idx] = mirror;
    else students.unshift(mirror);
    db.students = students;
    writeDB(db);

    return res.json(mirror);
  } catch (err) {
    if (!isConnectionError(err)) {
      return res.status(400).json({ message: "Failed to update student" });
    }

    const db = readDB();
    const students = Array.isArray(db.students) ? db.students : [];
    const idx = students.findIndex((item) => String(item.id) === id);
    if (idx < 0) return res.status(404).json({ message: "Student not found" });

    const current = students[idx];
    const { byId } = getJsonClassMaps();
    const cls = byId.get(String(body.classId || current.classId || ""));
    if (!cls) return res.status(400).json({ message: "Invalid classId" });
    if (cls.isActive === false) {
      return res.status(400).json({ message: "This class is preserved for history only. Select an active AMES class." });
    }

    const resolvedName = buildStudentName(body.firstName, body.lastName, body.name || current.name);
    if (!resolvedName) {
      return res.status(400).json({ message: "Provide student first name and last name, or a full name." });
    }

    const derived = splitNameParts(resolvedName);
    const currentAdmission = admissionValue(current);
    const admissionNumber = body.admissionNumber !== undefined || body.admissionNo !== undefined ? admissionValue(body) : currentAdmission;
    const updated = {
      ...current,
      name: resolvedName,
      firstName: String(body.firstName || "").trim() || derived.firstName,
      lastName: String(body.lastName || "").trim() || derived.lastName,
      otherName: body.otherName !== undefined ? String(body.otherName || "").trim() : String(current.otherName || ""),
      admissionNumber,
      admissionNo: admissionNumber,
      dateOfBirth: body.dateOfBirth !== undefined ? String(body.dateOfBirth || "").trim() : String(current.dateOfBirth || current.dob || ""),
      gender: body.gender !== undefined ? String(body.gender || "").trim() : String(current.gender || ""),
      classId: String(body.classId || current.classId),
      className: cls.name,
      photoUrl: body.photoUrl !== undefined ? String(body.photoUrl || "") : String(current.photoUrl || ""),
      studentPhone: body.studentPhone !== undefined ? String(body.studentPhone || "").trim() : String(current.studentPhone || ""),
      parentGuardianName: body.parentGuardianName !== undefined ? String(body.parentGuardianName || "").trim() : String(current.parentGuardianName || current.guardianName || ""),
      parentPhone: body.parentPhone !== undefined ? String(body.parentPhone || "").trim() : String(current.parentPhone || ""),
      alternatePhone: body.alternatePhone !== undefined ? String(body.alternatePhone || "").trim() : String(current.alternatePhone || ""),
      parentEmail: body.parentEmail !== undefined ? String(body.parentEmail || "").trim() : String(current.parentEmail || current.guardianEmail || ""),
      homeAddress: body.homeAddress !== undefined ? String(body.homeAddress || "").trim() : String(current.homeAddress || current.address || ""),
      studentType: body.studentType !== undefined ? String(body.studentType || "").trim() : String(current.studentType || ""),
      academicSession: body.academicSession !== undefined ? String(body.academicSession || "").trim() : String(current.academicSession || ""),
      academicTerm: body.academicTerm !== undefined ? String(body.academicTerm || "").trim() : String(current.academicTerm || ""),
      previousSchool: body.previousSchool !== undefined ? String(body.previousSchool || "").trim() : String(current.previousSchool || ""),
      updatedAt: now,
    };

    students[idx] = updated;
    db.students = students;
    writeDB(db);

    return res.json(updated);
  }
});

router.patch("/students/:id/archive", auth(), requireRole("ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER"), async (req, res) => {
  const id = String(req.params.id || "");
  const archived = req.body?.archived !== undefined ? Boolean(req.body.archived) : true;
  const now = new Date().toISOString();

  try {
    const student = await prisma.student.findUnique({
      where: { id },
      include: { class: true },
    });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const db = readDB();
    const students = Array.isArray(db.students) ? db.students : [];
    const idx = students.findIndex((item) => String(item.id) === id);
    const existing = idx >= 0 ? students[idx] : {};
    const derived = splitNameParts(student.name);

    const mirror = {
      ...existing,
      id: student.id,
      name: student.name,
      firstName: String(existing.firstName || "").trim() || derived.firstName,
      lastName: String(existing.lastName || "").trim() || derived.lastName,
      admissionNumber: admissionValue(existing),
      admissionNo: admissionValue(existing),
      classId: student.classId,
      className: student.class?.name || existing.className || "",
      photoUrl: String(existing.photoUrl || ""),
      studentPhone: String(existing.studentPhone || ""),
      parentPhone: String(existing.parentPhone || ""),
      status: archived ? "archived" : "active",
      isArchived: archived,
      archivedAt: archived ? now : "",
      createdAt: existing.createdAt || now,
      updatedAt: now,
    };

    if (idx >= 0) students[idx] = mirror;
    else students.unshift(mirror);
    db.students = students;
    writeDB(db);

    return res.json({ ok: true, student: mirror });
  } catch (err) {
    if (!isConnectionError(err)) {
      return res.status(400).json({ message: "Failed to update student archive status" });
    }

    const db = readDB();
    const students = Array.isArray(db.students) ? db.students : [];
    const idx = students.findIndex((item) => String(item.id) === id);
    if (idx < 0) return res.status(404).json({ message: "Student not found" });

    const current = students[idx];
    const updated = {
      ...current,
      status: archived ? "archived" : "active",
      isArchived: archived,
      archivedAt: archived ? now : "",
      updatedAt: now,
    };
    students[idx] = updated;
    db.students = students;
    writeDB(db);

    return res.json({ ok: true, student: updated });
  }
});
router.delete("/students/:id", auth(), requireRole("ADMIN", "SUPER_ADMIN"), async (req, res) => {
  const id = req.params.id;

  try {
    const before = await prisma.student.findUnique({ where: { id } });
    if (!before) return res.status(404).json({ message: "Student not found" });

    await prisma.student.delete({ where: { id } });

    await prisma.auditLog.create({
      data: { userId: req.user?.id || null, action: "DELETE", entity: "Student", entityId: id, before },
    });

    const db = readDB();
    db.students = (Array.isArray(db.students) ? db.students : []).filter((item) => String(item.id) !== String(id));
    writeDB(db);

    return res.json({ ok: true });
  } catch (err) {
    if (!isConnectionError(err)) {
      return res.status(400).json({ message: "Failed to delete student" });
    }

    const db = readDB();
    const students = Array.isArray(db.students) ? db.students : [];
    const idx = students.findIndex((item) => String(item.id) === String(id));
    if (idx < 0) return res.status(404).json({ message: "Student not found" });

    db.students = students.filter((item) => String(item.id) !== String(id));
    db.results = (Array.isArray(db.results) ? db.results : []).filter((item) => String(item.studentId) !== String(id));
    db.reports = (Array.isArray(db.reports) ? db.reports : []).filter((item) => String(item.studentId) !== String(id));
    db.submissions = (Array.isArray(db.submissions) ? db.submissions : []).filter((item) => String(item.studentId) !== String(id));
    writeDB(db);

    return res.json({ ok: true });
  }
});

/* ---------- TERM LOCK ---------- */
router.get("/term-lock", auth(), requireRole("ADMIN", "TEACHER"), async (req, res) => {
  const { classId, session, term } = req.query;
  if (!classId || !session || !term) return res.status(400).json({ message: "classId, session, term required" });

  const lock = await findTermLock(String(classId), String(session), String(term));
  return res.json(lock || { status: "DRAFT" });
});

router.post("/term-lock/lock", auth(), requireRole("ADMIN"), async (req, res) => {
  const schema = z.object({ classId: z.string(), session: z.string(), term: z.string() });
  const { classId, session, term } = schema.parse(req.body);

  try {
    const lock = await prisma.termLock.upsert({
      where: { classId_session_term: { classId, session, term } },
      update: { status: "LOCKED", lockedBy: req.user?.id || null, lockedAt: new Date() },
      create: { classId, session, term, status: "LOCKED", lockedBy: req.user?.id || null, lockedAt: new Date() },
    });

    return res.json(lock);
  } catch (err) {
    if (!isConnectionError(err)) {
      return res.status(400).json({ message: "Failed to lock term" });
    }

    const db = readDB();
    const locks = Array.isArray(db.termLocks) ? db.termLocks : [];
    const idx = locks.findIndex(
      (item) =>
        String(item.classId) === String(classId) &&
        String(item.session) === String(session) &&
        String(item.term) === String(term)
    );

    const lock = {
      id: idx >= 0 ? locks[idx].id : nanoid(),
      classId,
      session,
      term,
      status: "LOCKED",
      lockedBy: req.user?.id || null,
      lockedAt: new Date().toISOString(),
    };

    if (idx >= 0) locks[idx] = lock;
    else locks.unshift(lock);

    db.termLocks = locks;
    writeDB(db);
    return res.json(lock);
  }
});

/* ---------- RESULTS ---------- */
router.get("/results", auth(), requireRole("ADMIN", "TEACHER"), async (req, res) => {
  const { session, term, studentId } = req.query;

  const where = {};
  if (session) where.session = String(session);
  if (term) where.term = String(term);
  if (studentId) where.studentId = String(studentId);

  try {
    const results = await prisma.result.findMany({ where, orderBy: [{ createdAt: "desc" }] });
    return res.json(results);
  } catch {
    const db = readDB();
    const results = Array.isArray(db.results) ? db.results : [];
    const filtered = results.filter((row) => matchResultFilters(row, where));

    return res.json(
      [...filtered].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    );
  }
});

router.post("/results", auth(), requireRole("ADMIN", "TEACHER"), async (req, res) => {
  const schema = z.object({
    studentId: z.string(),
    session: z.string(),
    term: z.string(),
    subject: z.string().min(1),
    score: z.number().int().min(0).max(100),
    date: z.string().optional(),
  });

  const data = schema.parse(req.body);
  const canonicalSubject = normalizeSubject(data.subject);
  if (!canonicalSubject) return res.status(400).json({ message: "Invalid subject. Use a standard subject name." });

  if (!canManageSubject(req.user, canonicalSubject)) {
    return res.status(403).json({ message: "You can only upload results for your assigned subject(s)." });
  }

  const lockCheck = await ensureNotLocked(data.studentId, data.session, data.term);
  if (!lockCheck.ok) return res.status(lockCheck.status).json({ message: lockCheck.message });
  if (!supportsNigerianCA({ name: lockCheck.student.className, className: lockCheck.student.className })) {
    return res.status(400).json({ message: "Early Years learners use EYFS AMES developmental reports, not Nigerian score report cards." });
  }

  const allowed = getSubjectsForClassName(lockCheck.student.className);
  if (allowed.length > 0 && !allowed.includes(canonicalSubject)) {
    return res.status(400).json({
      message: `Subject '${canonicalSubject}' is not allowed for class ${lockCheck.student.className}.`,
    });
  }

  try {
    const created = await prisma.result.create({
      data: {
        ...data,
        subject: canonicalSubject,
      },
    });

    await prisma.auditLog.create({
      data: { userId: req.user?.id || null, action: "CREATE", entity: "Result", entityId: created.id, after: created },
    });

    return res.status(201).json(created);
  } catch (err) {
    if (!isConnectionError(err)) {
      return res.status(409).json({ message: "Duplicate subject for this student + term + session." });
    }

    const db = readDB();
    const results = Array.isArray(db.results) ? db.results : [];
    if (findDuplicateResult(results, { ...data, subject: canonicalSubject })) {
      return res.status(409).json({ message: "Duplicate subject for this student + term + session." });
    }

    const now = new Date().toISOString();
    const created = {
      id: nanoid(),
      studentId: data.studentId,
      studentName: lockCheck.student.name,
      session: data.session,
      term: data.term,
      subject: canonicalSubject,
      score: Number(data.score),
      date: data.date || new Date().toLocaleDateString(),
      createdAt: now,
      updatedAt: now,
    };

    results.unshift(created);
    db.results = results;
    writeDB(db);
    return res.status(201).json(created);
  }
});

router.put("/results/:id", auth(), requireRole("ADMIN", "TEACHER"), async (req, res) => {
  const id = req.params.id;

  const schema = z.object({
    subject: z.string().min(1).optional(),
    score: z.number().int().min(0).max(100).optional(),
    term: z.string().optional(),
    session: z.string().optional(),
    date: z.string().optional(),
  });

  const patch = schema.parse(req.body);

  let before;
  try {
    before = await prisma.result.findUnique({ where: { id } });
  } catch {
    const db = readDB();
    before = (Array.isArray(db.results) ? db.results : []).find((item) => String(item.id) === String(id));
  }

  if (!before) return res.status(404).json({ message: "Result not found" });

  const nextSubjectRaw = patch.subject ?? before.subject;
  const nextSubject = normalizeSubject(nextSubjectRaw);
  if (!nextSubject) return res.status(400).json({ message: "Invalid subject. Use a standard subject name." });

  if (!canManageSubject(req.user, nextSubject)) {
    return res.status(403).json({ message: "You can only edit results for your assigned subject(s)." });
  }

  const session = patch.session ?? before.session;
  const term = patch.term ?? before.term;

  const lockCheck = await ensureNotLocked(before.studentId, session, term);
  if (!lockCheck.ok) return res.status(lockCheck.status).json({ message: lockCheck.message });
  if (!supportsNigerianCA({ name: lockCheck.student.className, className: lockCheck.student.className })) {
    return res.status(400).json({ message: "Early Years learners use EYFS AMES developmental reports, not Nigerian score report cards." });
  }

  const allowed = getSubjectsForClassName(lockCheck.student.className);
  if (allowed.length > 0 && !allowed.includes(nextSubject)) {
    return res.status(400).json({
      message: `Subject '${nextSubject}' is not allowed for class ${lockCheck.student.className}.`,
    });
  }

  try {
    const updated = await prisma.result.update({
      where: { id },
      data: {
        ...patch,
        subject: patch.subject ? nextSubject : undefined,
      },
    });

    await prisma.auditLog.create({
      data: { userId: req.user?.id || null, action: "UPDATE", entity: "Result", entityId: id, before, after: updated },
    });

    return res.json(updated);
  } catch (err) {
    if (!isConnectionError(err)) {
      return res.status(409).json({ message: "Duplicate subject for this student + term + session." });
    }

    const db = readDB();
    const results = Array.isArray(db.results) ? db.results : [];
    const idx = results.findIndex((item) => String(item.id) === String(id));
    if (idx < 0) return res.status(404).json({ message: "Result not found" });

    const current = results[idx];
    const next = {
      ...current,
      ...patch,
      subject: patch.subject ? nextSubject : current.subject,
      updatedAt: new Date().toISOString(),
    };

    if (
      findDuplicateResult(results, {
        studentId: next.studentId,
        session: next.session,
        term: next.term,
        subject: next.subject,
        ignoreId: next.id,
      })
    ) {
      return res.status(409).json({ message: "Duplicate subject for this student + term + session." });
    }

    results[idx] = next;
    db.results = results;
    writeDB(db);
    return res.json(next);
  }
});

router.delete("/results/:id", auth(), requireRole("ADMIN"), async (req, res) => {
  const id = req.params.id;

  let before;
  try {
    before = await prisma.result.findUnique({ where: { id } });
  } catch {
    const db = readDB();
    before = (Array.isArray(db.results) ? db.results : []).find((item) => String(item.id) === String(id));
  }

  if (!before) return res.status(404).json({ message: "Result not found" });

  const lockCheck = await ensureNotLocked(before.studentId, before.session, before.term);
  if (!lockCheck.ok) return res.status(lockCheck.status).json({ message: lockCheck.message });

  try {
    await prisma.result.delete({ where: { id } });
    await prisma.auditLog.create({
      data: { userId: req.user?.id || null, action: "DELETE", entity: "Result", entityId: id, before },
    });

    return res.json({ ok: true });
  } catch (err) {
    if (!isConnectionError(err)) {
      return res.status(400).json({ message: "Failed to delete result" });
    }

    const db = readDB();
    const results = Array.isArray(db.results) ? db.results : [];
    db.results = results.filter((item) => String(item.id) !== String(id));
    writeDB(db);
    return res.json({ ok: true });
  }
});

/* ---------- REPORT METADATA ---------- */
router.get("/reports", auth(), requireRole("ADMIN", "TEACHER"), async (req, res) => {
  const { session, term, studentId } = req.query;

  const where = {};
  if (session) where.session = String(session);
  if (term) where.term = String(term);
  if (studentId) where.studentId = String(studentId);

  try {
    const reports = await prisma.reportMeta.findMany({ where });
    return res.json(reports);
  } catch {
    const db = readDB();
    const reports = Array.isArray(db.reports) ? db.reports : [];
    return res.json(reports.filter((row) => matchResultFilters(row, where)));
  }
});

router.post("/reports", auth(), requireRole("ADMIN", "TEACHER"), async (req, res) => {
  const schema = z.object({
    studentId: z.string(),
    session: z.string(),
    term: z.string(),
    nextTermBegins: z.string().optional(),
    teacherComment: z.string().optional(),
    headTeacherComment: z.string().optional(),
    attendance: z
      .object({
        present: z.number().int().min(0).optional(),
        absent: z.number().int().min(0).optional(),
        total: z.number().int().min(0).optional(),
      })
      .optional(),
  });

  const body = schema.parse(req.body);

  const lockCheck = await ensureNotLocked(body.studentId, body.session, body.term);
  if (!lockCheck.ok) return res.status(lockCheck.status).json({ message: lockCheck.message });
  if (!supportsNigerianCA({ name: lockCheck.student.className, className: lockCheck.student.className })) {
    return res.status(400).json({ message: "Early Years learners use EYFS AMES developmental reports, not Nigerian score report cards." });
  }

  const payload = {
    studentId: body.studentId,
    session: body.session,
    term: body.term,
    nextTermBegins: body.nextTermBegins || "",
    teacherComment: body.teacherComment || "",
    headTeacherComment: body.headTeacherComment || "",
    present: Number(body.attendance?.present || 0),
    absent: Number(body.attendance?.absent || 0),
    total: Number(body.attendance?.total || 0),
  };

  try {
    const existing = await prisma.reportMeta.findUnique({
      where: { studentId_session_term: { studentId: body.studentId, session: body.session, term: body.term } },
    });

    const saved = existing
      ? await prisma.reportMeta.update({ where: { id: existing.id }, data: payload })
      : await prisma.reportMeta.create({ data: payload });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id || null,
        action: existing ? "UPDATE" : "CREATE",
        entity: "ReportMeta",
        entityId: saved.id,
        before: existing || undefined,
        after: saved,
      },
    });

    return res.status(201).json(saved);
  } catch (err) {
    if (!isConnectionError(err)) {
      return res.status(400).json({ message: "Failed to save report metadata" });
    }

    const db = readDB();
    const reports = Array.isArray(db.reports) ? db.reports : [];
    const idx = reports.findIndex(
      (item) =>
        String(item.studentId) === String(body.studentId) &&
        String(item.session) === String(body.session) &&
        String(item.term) === String(body.term)
    );

    const now = new Date().toISOString();
    const saved = {
      id: idx >= 0 ? reports[idx].id : nanoid(),
      ...payload,
      updatedAt: now,
      createdAt: idx >= 0 ? reports[idx].createdAt || now : now,
    };

    if (idx >= 0) reports[idx] = saved;
    else reports.unshift(saved);

    db.reports = reports;
    writeDB(db);
    return res.status(201).json(saved);
  }
});

router.get("/broadsheet", auth(), requireRole("ADMIN", "TEACHER"), async (req, res) => {
  const { classId, session, term, subject } = req.query;

  if (!classId || !session || !term) {
    return res.status(400).json({ message: "classId, session, and term are required" });
  }

  const canonicalSubject = subject ? normalizeSubject(subject) : null;
  if (subject && !canonicalSubject) {
    return res.status(400).json({ message: "Invalid subject. Use a standard subject name." });
  }

  if (req.user.role === "TEACHER" && canonicalSubject && !canManageSubject(req.user, canonicalSubject)) {
    return res.status(403).json({ message: "You can only access broadsheet data for your assigned subject(s)." });
  }

  const teacherSubjects = req.user.role === "TEACHER"
    ? new Set((req.user.subjects || []).map((s) => normalizeSubject(s)).filter(Boolean))
    : null;

  try {
    const cls = await prisma.class.findUnique({
      where: { id: String(classId) },
      include: {
        students: {
          include: {
            results: {
              where: {
                session: String(session),
                term: String(term),
                ...(canonicalSubject ? { subject: canonicalSubject } : {}),
              },
              orderBy: [{ subject: "asc" }],
            },
          },
          orderBy: [{ name: "asc" }],
        },
      },
    });

    if (!cls) return res.status(404).json({ message: "Class not found" });

    const subjectSet = new Set();
    const rows = cls.students.map((student) => {
      const scores = {};
      let total = 0;
      let count = 0;

      for (const row of student.results || []) {
        const normalized = normalizeSubject(row.subject) || row.subject;
        if (teacherSubjects && !teacherSubjects.has(normalized)) continue;
        if (canonicalSubject && normalized !== canonicalSubject) continue;

        const score = Number(row.score || 0);
        scores[normalized] = score;
        total += score;
        count += 1;
        subjectSet.add(normalized);
      }

      return {
        studentId: student.id,
        studentName: student.name,
        scores,
        total,
        average: count ? Number((total / count).toFixed(2)) : 0,
      };
    });

    const subjects = Array.from(subjectSet).sort((a, b) => a.localeCompare(b));

    return res.json({
      class: { id: cls.id, name: cls.name, section: cls.section },
      session: String(session),
      term: String(term),
      subject: canonicalSubject || "",
      subjects,
      rows,
    });
  } catch {
    const db = readDB();
    const { byId } = getJsonClassMaps();
    const cls = byId.get(String(classId));
    if (!cls) return res.status(404).json({ message: "Class not found" });

    const students = (Array.isArray(db.students) ? db.students : [])
      .filter((item) => String(item.classId) === String(classId))
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

    const allResults = Array.isArray(db.results) ? db.results : [];
    const subjectSet = new Set();

    const rows = students.map((student) => {
      const scores = {};
      let total = 0;
      let count = 0;

      const studentResults = allResults.filter(
        (row) =>
          String(row.studentId) === String(student.id) &&
          String(row.session || "") === String(session) &&
          String(row.term || "") === String(term)
      );

      for (const row of studentResults) {
        const normalized = normalizeSubject(row.subject) || row.subject;
        if (!normalized) continue;
        if (teacherSubjects && !teacherSubjects.has(normalized)) continue;
        if (canonicalSubject && normalized !== canonicalSubject) continue;

        const score = Number(row.score || 0);
        scores[normalized] = score;
        total += score;
        count += 1;
        subjectSet.add(normalized);
      }

      return {
        studentId: student.id,
        studentName: student.name,
        scores,
        total,
        average: count ? Number((total / count).toFixed(2)) : 0,
      };
    });

    const subjects = Array.from(subjectSet).sort((a, b) => a.localeCompare(b));

    return res.json({
      class: { id: cls.id, name: cls.name, section: cls.section },
      session: String(session),
      term: String(term),
      subject: canonicalSubject || "",
      subjects,
      rows,
    });
  }
});

module.exports = router;
























