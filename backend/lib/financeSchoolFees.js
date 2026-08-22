const { randomUUID } = require("crypto");
const { readDB, writeDB } = require("./jsonStore");
const { ensureDefaultClassesInDb } = require("./defaultClasses");

const CURRENT_SESSION = String(
  process.env.CURRENT_SESSION || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`
).trim();
const CURRENT_TERM = String(process.env.CURRENT_TERM || "First Term").trim();

const DEFAULT_TERM_OPTIONS = ["First Term", "Second Term", "Third Term"];
const DEFAULT_STUDENT_TYPES = ["ALL", "REGULAR", "NEW", "RETURNING", "SCHOLARSHIP", "STAFF"];
const FINANCE_APPROVAL_STATUSES = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED", "ARCHIVED"];
const FINANCE_FEE_MANAGE_ROLES = ["ADMIN", "SUPER_ADMIN", "FINANCE_OFFICER"];
const FINANCE_FEE_APPROVAL_ROLES = ["ADMIN", "SUPER_ADMIN"];
const FINANCE_COLLECTIONS = ["financeFeeStructures", "financeStudentProfiles"];

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix) {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function cleanText(value) {
  return String(value || "").trim();
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatDateTime(value) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  return cleanText(value);
}

function normalizeClassKey(value) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeMoney(value) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  const normalized = cleanText(value).replace(/,/g, "");
  if (!normalized) return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

function normalizeBool(value, fallback = true) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  const normalized = cleanText(value).toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "n", "off"].includes(normalized)) return false;
  return fallback;
}

function normalizeStudentType(value, fallback = "REGULAR") {
  const normalized = cleanText(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || fallback;
}

function normalizeCode(value, fallback = "COMPONENT") {
  const normalized = cleanText(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || fallback;
}

function dedupeStrings(values = []) {
  const out = [];
  const seen = new Set();
  for (const item of values) {
    const safe = cleanText(item);
    if (!safe) continue;
    const key = safe.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(safe);
  }
  return out;
}

function buildActor(user = {}) {
  return {
    actorId: cleanText(user.id),
    actorName: cleanText(user.name),
    actorRole: cleanText(user.role).toUpperCase(),
  };
}

function sortClasses(rows = []) {
  return [...rows].sort((a, b) => {
    const orderDiff = Number(a?.order || 999) - Number(b?.order || 999);
    if (orderDiff !== 0) return orderDiff;
    return cleanText(a?.name).localeCompare(cleanText(b?.name));
  });
}

function sortNewest(rows = [], field = "createdAt") {
  return [...rows].sort((a, b) => cleanText(b?.[field]).localeCompare(cleanText(a?.[field])));
}

function ensureFinanceCollections(db) {
  let mutated = ensureDefaultClassesInDb(db);
  for (const key of FINANCE_COLLECTIONS) {
    if (!Array.isArray(db[key])) {
      db[key] = [];
      mutated = true;
    }
  }
  return mutated;
}

function readFinanceDb() {
  const db = readDB();
  if (ensureFinanceCollections(db)) writeDB(db);
  return db;
}

function writeFinanceDb(db) {
  ensureFinanceCollections(db);
  writeDB(db);
}

function getSortedClasses(db) {
  return sortClasses(safeArray(db.classes));
}

function findClassById(db, classId) {
  return getSortedClasses(db).find((item) => cleanText(item.id) === cleanText(classId)) || null;
}

function normalizeFinanceProfile(profile) {
  return {
    studentType: normalizeStudentType(profile?.studentType, "REGULAR"),
    canStudentView: normalizeBool(profile?.canStudentView, true),
    canParentView: normalizeBool(profile?.canParentView, true),
    notes: cleanText(profile?.notes),
  };
}

function serializeFinanceProfile(profile) {
  if (!profile) {
    return {
      studentType: "REGULAR",
      canStudentView: true,
      canParentView: true,
      notes: "",
      createdAt: "",
      updatedAt: "",
    };
  }
  return {
    id: cleanText(profile.id),
    studentId: cleanText(profile.studentId),
    studentType: normalizeStudentType(profile.studentType, "REGULAR"),
    canStudentView: normalizeBool(profile.canStudentView, true),
    canParentView: normalizeBool(profile.canParentView, true),
    notes: cleanText(profile.notes),
    createdAt: formatDateTime(profile.createdAt),
    updatedAt: formatDateTime(profile.updatedAt),
  };
}

function normalizeComponentInput(component, index) {
  const name = cleanText(component?.name);
  if (!name) throw createHttpError(400, `Component ${index + 1} name is required.`);
  const amount = normalizeMoney(component?.amount);
  if (amount <= 0) throw createHttpError(400, `Component ${index + 1} amount must be greater than zero.`);
  return {
    code: normalizeCode(component?.code || name, `COMPONENT_${index + 1}`),
    name,
    description: cleanText(component?.description),
    amount,
    isOptional: normalizeBool(component?.isOptional, false),
    visibleToStudent: normalizeBool(component?.visibleToStudent, true),
    visibleToParent: normalizeBool(component?.visibleToParent, true),
    sortOrder: Number.isFinite(Number(component?.sortOrder)) ? Number(component.sortOrder) : index + 1,
  };
}

function normalizeStoredComponent(component, index) {
  return {
    id: cleanText(component?.id) || createId("fee-component"),
    code: normalizeCode(component?.code || component?.name, `COMPONENT_${index + 1}`),
    name: cleanText(component?.name),
    description: cleanText(component?.description),
    amount: normalizeMoney(component?.amount),
    isOptional: normalizeBool(component?.isOptional, false),
    visibleToStudent: normalizeBool(component?.visibleToStudent, true),
    visibleToParent: normalizeBool(component?.visibleToParent, true),
    sortOrder: Number.isFinite(Number(component?.sortOrder)) ? Number(component.sortOrder) : index + 1,
  };
}

function normalizeComponents(components) {
  if (!Array.isArray(components) || components.length === 0) {
    throw createHttpError(400, "At least one fee component is required.");
  }
  const seenCodes = new Set();
  return components.map((component, index) => {
    const normalized = normalizeComponentInput(component, index);
    const key = normalized.code.toLowerCase();
    if (seenCodes.has(key)) throw createHttpError(400, `Duplicate component code: ${normalized.code}`);
    seenCodes.add(key);
    return normalized;
  });
}

function normalizeStructureInput(payload = {}, options = {}) {
  const partial = Boolean(options.partial);
  const classId = partial && payload.classId === undefined ? undefined : cleanText(payload.classId);
  const session = partial && payload.session === undefined ? undefined : (cleanText(payload.session) || CURRENT_SESSION);
  const term = partial && payload.term === undefined ? undefined : (cleanText(payload.term) || CURRENT_TERM);
  const studentType = partial && payload.studentType === undefined ? undefined : normalizeStudentType(payload.studentType, "REGULAR");
  const title = partial && payload.title === undefined ? undefined : cleanText(payload.title);
  const description = partial && payload.description === undefined ? undefined : cleanText(payload.description);
  if ((!partial || payload.classId !== undefined) && !classId) throw createHttpError(400, "classId is required.");

  return {
    classId,
    session,
    term,
    studentType,
    title,
    description,
    components: (!partial || payload.components !== undefined) ? normalizeComponents(payload.components) : undefined,
    changeNote: cleanText(payload.changeNote),
  };
}

function buildStructureTitle(record, schoolClass) {
  const explicit = cleanText(record?.title);
  if (explicit) return explicit;
  return [
    cleanText(schoolClass?.name),
    cleanText(record?.term),
    cleanText(record?.session),
    normalizeStudentType(record?.studentType, "REGULAR").replace(/_/g, " "),
  ].filter(Boolean).join(" - ");
}

function serializeApprovalEntry(entry) {
  return {
    id: cleanText(entry?.id),
    action: cleanText(entry?.action),
    status: cleanText(entry?.status),
    notes: cleanText(entry?.notes),
    actorId: cleanText(entry?.actorId),
    actorName: cleanText(entry?.actorName),
    actorRole: cleanText(entry?.actorRole),
    createdAt: formatDateTime(entry?.createdAt),
  };
}

function hydrateStructure(record, db) {
  const schoolClass = findClassById(db, record?.classId);
  const components = safeArray(record?.components)
    .map((item, index) => normalizeStoredComponent(item, index))
    .sort((a, b) => {
      const orderDiff = Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
      if (orderDiff !== 0) return orderDiff;
      return cleanText(a.name).localeCompare(cleanText(b.name));
    });
  const approvals = sortNewest(safeArray(record?.approvals).map((item) => ({
    id: cleanText(item?.id) || createId("fee-approval"),
    action: cleanText(item?.action),
    status: cleanText(item?.status),
    notes: cleanText(item?.notes),
    actorId: cleanText(item?.actorId),
    actorName: cleanText(item?.actorName),
    actorRole: cleanText(item?.actorRole),
    createdAt: formatDateTime(item?.createdAt),
  })));

  return {
    ...record,
    id: cleanText(record?.id),
    classId: cleanText(record?.classId),
    session: cleanText(record?.session) || CURRENT_SESSION,
    term: cleanText(record?.term) || CURRENT_TERM,
    studentType: normalizeStudentType(record?.studentType, "REGULAR"),
    title: cleanText(record?.title),
    description: cleanText(record?.description),
    status: cleanText(record?.status) || "DRAFT",
    submittedAt: formatDateTime(record?.submittedAt),
    submittedById: cleanText(record?.submittedById),
    submittedByName: cleanText(record?.submittedByName),
    approvedAt: formatDateTime(record?.approvedAt),
    approvedById: cleanText(record?.approvedById),
    approvedByName: cleanText(record?.approvedByName),
    rejectedAt: formatDateTime(record?.rejectedAt),
    rejectedById: cleanText(record?.rejectedById),
    rejectedByName: cleanText(record?.rejectedByName),
    rejectionReason: cleanText(record?.rejectionReason),
    createdById: cleanText(record?.createdById),
    createdByName: cleanText(record?.createdByName),
    updatedById: cleanText(record?.updatedById),
    updatedByName: cleanText(record?.updatedByName),
    createdAt: formatDateTime(record?.createdAt),
    updatedAt: formatDateTime(record?.updatedAt),
    class: schoolClass ? {
      id: cleanText(schoolClass.id),
      name: cleanText(schoolClass.name),
      section: cleanText(schoolClass.section),
      order: Number(schoolClass.order || 999),
    } : null,
    components,
    approvals,
  };
}

function serializeStructure(record, db, options = {}) {
  const hydrated = hydrateStructure(record, db);
  const audience = cleanText(options.audience).toLowerCase();
  const allComponents = hydrated.components;
  const filteredComponents = audience === "student"
    ? allComponents.filter((item) => item.visibleToStudent)
    : audience === "parent"
      ? allComponents.filter((item) => item.visibleToParent)
      : allComponents;

  return {
    id: cleanText(hydrated.id),
    classId: cleanText(hydrated.classId),
    className: cleanText(hydrated.class?.name),
    classSection: cleanText(hydrated.class?.section),
    session: cleanText(hydrated.session),
    term: cleanText(hydrated.term),
    studentType: normalizeStudentType(hydrated.studentType, "REGULAR"),
    title: buildStructureTitle(hydrated, hydrated.class),
    description: cleanText(hydrated.description),
    status: cleanText(hydrated.status),
    totalAmount: allComponents.reduce((sum, item) => sum + normalizeMoney(item.amount), 0),
    visibleTotalAmount: filteredComponents.reduce((sum, item) => sum + normalizeMoney(item.amount), 0),
    componentCount: allComponents.length,
    createdAt: formatDateTime(hydrated.createdAt),
    updatedAt: formatDateTime(hydrated.updatedAt),
    submittedAt: formatDateTime(hydrated.submittedAt),
    submittedById: cleanText(hydrated.submittedById),
    submittedByName: cleanText(hydrated.submittedByName),
    approvedAt: formatDateTime(hydrated.approvedAt),
    approvedById: cleanText(hydrated.approvedById),
    approvedByName: cleanText(hydrated.approvedByName),
    rejectedAt: formatDateTime(hydrated.rejectedAt),
    rejectedById: cleanText(hydrated.rejectedById),
    rejectedByName: cleanText(hydrated.rejectedByName),
    rejectionReason: cleanText(hydrated.rejectionReason),
    createdById: cleanText(hydrated.createdById),
    createdByName: cleanText(hydrated.createdByName),
    updatedById: cleanText(hydrated.updatedById),
    updatedByName: cleanText(hydrated.updatedByName),
    components: filteredComponents.map((component) => ({
      id: cleanText(component.id),
      code: cleanText(component.code),
      name: cleanText(component.name),
      description: cleanText(component.description),
      amount: normalizeMoney(component.amount),
      isOptional: normalizeBool(component.isOptional, false),
      visibleToStudent: normalizeBool(component.visibleToStudent, true),
      visibleToParent: normalizeBool(component.visibleToParent, true),
      sortOrder: Number(component.sortOrder || 0),
    })),
    approvalHistory: hydrated.approvals.map(serializeApprovalEntry),
  };
}

function getStructureRecordOrThrow(db, id) {
  const safeId = cleanText(id);
  if (!safeId) throw createHttpError(400, "structureId is required.");
  const record = safeArray(db.financeFeeStructures).find((item) => cleanText(item.id) === safeId);
  if (!record) throw createHttpError(404, "Fee structure not found.");
  return record;
}

function resolveClassForJsonStudent(classes, student) {
  const classId = cleanText(student?.classId);
  if (classId) {
    const direct = classes.find((item) => cleanText(item.id) === classId);
    if (direct) return direct;
  }
  const classNameKey = normalizeClassKey(student?.className);
  if (!classNameKey) return null;
  return classes.find((item) => normalizeClassKey(item.name) === classNameKey) || null;
}

function loadStudentFinanceContext(db, studentId) {
  const safeStudentId = cleanText(studentId);
  if (!safeStudentId) return null;
  const student = safeArray(db.students).find((item) => cleanText(item.id) === safeStudentId);
  if (!student) return null;
  const schoolClass = resolveClassForJsonStudent(getSortedClasses(db), student);
  const profile = safeArray(db.financeStudentProfiles).find((item) => cleanText(item.studentId) === safeStudentId);
  return {
    id: cleanText(student.id),
    name: cleanText(student.name),
    classId: cleanText(schoolClass?.id || student.classId),
    className: cleanText(schoolClass?.name || student.className),
    financeProfile: profile ? serializeFinanceProfile(profile) : serializeFinanceProfile(null),
  };
}

function resolveApprovedFeeStructure(db, options = {}) {
  const safeClassId = cleanText(options.classId);
  if (!safeClassId) return null;
  const normalizedType = normalizeStudentType(options.studentType, "REGULAR");
  const candidateTypes = normalizedType === "ALL" ? ["ALL"] : dedupeStrings([normalizedType, "ALL"]);

  const records = safeArray(db.financeFeeStructures)
    .filter((item) => (
      cleanText(item.classId) === safeClassId &&
      cleanText(item.session || CURRENT_SESSION) === (cleanText(options.session) || CURRENT_SESSION) &&
      cleanText(item.term || CURRENT_TERM) === (cleanText(options.term) || CURRENT_TERM) &&
      cleanText(item.status).toUpperCase() === "APPROVED" &&
      candidateTypes.includes(normalizeStudentType(item.studentType, "REGULAR"))
    ))
    .sort((a, b) => {
      const exactA = normalizeStudentType(a.studentType, "REGULAR") === normalizedType ? 1 : 0;
      const exactB = normalizeStudentType(b.studentType, "REGULAR") === normalizedType ? 1 : 0;
      if (exactA !== exactB) return exactB - exactA;
      const approvedDiff = cleanText(b.approvedAt).localeCompare(cleanText(a.approvedAt));
      if (approvedDiff !== 0) return approvedDiff;
      return cleanText(b.updatedAt).localeCompare(cleanText(a.updatedAt));
    });

  return records[0] ? serializeStructure(records[0], db, { audience: options.audience }) : null;
}

async function getFinanceFeeMeta() {
  const db = readFinanceDb();
  const structures = safeArray(db.financeFeeStructures);
  return {
    currentSession: CURRENT_SESSION,
    currentTerm: CURRENT_TERM,
    approvalStatuses: FINANCE_APPROVAL_STATUSES,
    sessionOptions: dedupeStrings([CURRENT_SESSION, ...structures.map((item) => item.session)]),
    termOptions: dedupeStrings([...DEFAULT_TERM_OPTIONS, CURRENT_TERM, ...structures.map((item) => item.term)]),
    studentTypeOptions: dedupeStrings([
      ...DEFAULT_STUDENT_TYPES,
      ...structures.map((item) => normalizeStudentType(item.studentType, "REGULAR")),
      ...safeArray(db.financeStudentProfiles).map((item) => normalizeStudentType(item.studentType, "REGULAR")),
    ]),
    classes: getSortedClasses(db).map((item) => ({
      id: cleanText(item.id),
      name: cleanText(item.name),
      section: cleanText(item.section),
      order: Number(item.order || 0),
    })),
  };
}

async function listFeeStructures(query = {}) {
  const db = readFinanceDb();
  const filters = {
    classId: cleanText(query.classId),
    session: cleanText(query.session),
    term: cleanText(query.term),
    status: cleanText(query.status).toUpperCase(),
    studentType: cleanText(query.studentType) ? normalizeStudentType(query.studentType, "REGULAR") : "",
  };
  const records = sortNewest(
    safeArray(db.financeFeeStructures).filter((item) => {
      if (filters.classId && cleanText(item.classId) !== filters.classId) return false;
      if (filters.session && cleanText(item.session) !== filters.session) return false;
      if (filters.term && cleanText(item.term) !== filters.term) return false;
      if (filters.status && cleanText(item.status).toUpperCase() !== filters.status) return false;
      if (filters.studentType && normalizeStudentType(item.studentType, "REGULAR") !== filters.studentType) return false;
      return true;
    }),
    "updatedAt"
  );

  return {
    totalCount: records.length,
    records: records.map((record) => serializeStructure(record, db)),
  };
}

async function getFeeStructureById(id) {
  const db = readFinanceDb();
  return serializeStructure(getStructureRecordOrThrow(db, id), db);
}

async function createFeeStructure(payload, user = {}) {
  const db = readFinanceDb();
  const actor = buildActor(user);
  const input = normalizeStructureInput(payload);
  if (!findClassById(db, input.classId)) throw createHttpError(400, "Invalid classId.");

  const timestamp = nowIso();
  const record = {
    id: createId("fee-structure"),
    classId: input.classId,
    session: input.session,
    term: input.term,
    studentType: input.studentType,
    title: input.title,
    description: input.description,
    status: "DRAFT",
    submittedAt: "",
    submittedById: "",
    submittedByName: "",
    approvedAt: "",
    approvedById: "",
    approvedByName: "",
    rejectedAt: "",
    rejectedById: "",
    rejectedByName: "",
    rejectionReason: "",
    createdById: actor.actorId,
    createdByName: actor.actorName,
    updatedById: actor.actorId,
    updatedByName: actor.actorName,
    createdAt: timestamp,
    updatedAt: timestamp,
    components: input.components.map((component) => ({ ...component, id: createId("fee-component") })),
    approvals: [{
      id: createId("fee-approval"),
      action: "CREATED",
      status: "DRAFT",
      notes: "Draft fee structure created.",
      actorId: actor.actorId,
      actorName: actor.actorName,
      actorRole: actor.actorRole,
      createdAt: timestamp,
    }],
  };
  db.financeFeeStructures.unshift(record);
  writeFinanceDb(db);
  return serializeStructure(record, db);
}

async function updateFeeStructure(id, payload, user = {}) {
  const db = readFinanceDb();
  const actor = buildActor(user);
  const input = normalizeStructureInput(payload, { partial: true });
  const record = getStructureRecordOrThrow(db, id);

  if (!["DRAFT", "REJECTED"].includes(cleanText(record.status).toUpperCase())) {
    throw createHttpError(409, "Only draft or rejected fee structures can be edited.");
  }
  if (input.classId && !findClassById(db, input.classId)) throw createHttpError(400, "Invalid classId.");

  if (input.classId !== undefined) record.classId = input.classId;
  if (input.session !== undefined) record.session = input.session;
  if (input.term !== undefined) record.term = input.term;
  if (input.studentType !== undefined) record.studentType = input.studentType;
  if (input.title !== undefined) record.title = input.title;
  if (input.description !== undefined) record.description = input.description;
  if (input.components) {
    record.components = input.components.map((component) => ({ ...component, id: createId("fee-component") }));
  }
  record.status = "DRAFT";
  record.rejectionReason = "";
  record.rejectedAt = "";
  record.rejectedById = "";
  record.rejectedByName = "";
  record.updatedById = actor.actorId;
  record.updatedByName = actor.actorName;
  record.updatedAt = nowIso();
  if (!Array.isArray(record.approvals)) record.approvals = [];
  record.approvals.unshift({
    id: createId("fee-approval"),
    action: "UPDATED",
    status: "DRAFT",
    notes: input.changeNote || "Draft fee structure updated.",
    actorId: actor.actorId,
    actorName: actor.actorName,
    actorRole: actor.actorRole,
    createdAt: nowIso(),
  });

  writeFinanceDb(db);
  return serializeStructure(record, db);
}

async function submitFeeStructure(id, payload = {}, user = {}) {
  const db = readFinanceDb();
  const actor = buildActor(user);
  const record = getStructureRecordOrThrow(db, id);
  if (!["DRAFT", "REJECTED"].includes(cleanText(record.status).toUpperCase())) {
    throw createHttpError(409, "Only draft or rejected fee structures can be submitted.");
  }

  const timestamp = nowIso();
  record.status = "PENDING_APPROVAL";
  record.submittedAt = timestamp;
  record.submittedById = actor.actorId;
  record.submittedByName = actor.actorName;
  record.rejectionReason = "";
  record.rejectedAt = "";
  record.rejectedById = "";
  record.rejectedByName = "";
  record.updatedById = actor.actorId;
  record.updatedByName = actor.actorName;
  record.updatedAt = timestamp;
  if (!Array.isArray(record.approvals)) record.approvals = [];
  record.approvals.unshift({
    id: createId("fee-approval"),
    action: "SUBMITTED",
    status: "PENDING_APPROVAL",
    notes: cleanText(payload.notes) || "Fee structure submitted for approval.",
    actorId: actor.actorId,
    actorName: actor.actorName,
    actorRole: actor.actorRole,
    createdAt: timestamp,
  });

  writeFinanceDb(db);
  return serializeStructure(record, db);
}

async function approveFeeStructure(id, payload = {}, user = {}) {
  const db = readFinanceDb();
  const actor = buildActor(user);
  const record = getStructureRecordOrThrow(db, id);
  if (cleanText(record.status).toUpperCase() !== "PENDING_APPROVAL") {
    throw createHttpError(409, "Only pending fee structures can be approved.");
  }

  const timestamp = nowIso();
  safeArray(db.financeFeeStructures).forEach((item) => {
    if (
      cleanText(item.id) !== cleanText(record.id) &&
      cleanText(item.classId) === cleanText(record.classId) &&
      cleanText(item.session) === cleanText(record.session) &&
      cleanText(item.term) === cleanText(record.term) &&
      normalizeStudentType(item.studentType, "REGULAR") === normalizeStudentType(record.studentType, "REGULAR") &&
      cleanText(item.status).toUpperCase() === "APPROVED"
    ) {
      item.status = "ARCHIVED";
      item.updatedAt = timestamp;
      item.updatedById = actor.actorId;
      item.updatedByName = actor.actorName;
    }
  });

  record.status = "APPROVED";
  record.approvedAt = timestamp;
  record.approvedById = actor.actorId;
  record.approvedByName = actor.actorName;
  record.rejectionReason = "";
  record.rejectedAt = "";
  record.rejectedById = "";
  record.rejectedByName = "";
  record.updatedById = actor.actorId;
  record.updatedByName = actor.actorName;
  record.updatedAt = timestamp;
  if (!Array.isArray(record.approvals)) record.approvals = [];
  record.approvals.unshift({
    id: createId("fee-approval"),
    action: "APPROVED",
    status: "APPROVED",
    notes: cleanText(payload.notes) || "Fee structure approved.",
    actorId: actor.actorId,
    actorName: actor.actorName,
    actorRole: actor.actorRole,
    createdAt: timestamp,
  });

  writeFinanceDb(db);
  return serializeStructure(record, db);
}

async function rejectFeeStructure(id, payload = {}, user = {}) {
  const db = readFinanceDb();
  const actor = buildActor(user);
  const record = getStructureRecordOrThrow(db, id);
  if (cleanText(record.status).toUpperCase() !== "PENDING_APPROVAL") {
    throw createHttpError(409, "Only pending fee structures can be rejected.");
  }

  const timestamp = nowIso();
  const notes = cleanText(payload.notes) || cleanText(payload.reason) || "Fee structure rejected.";
  record.status = "REJECTED";
  record.rejectedAt = timestamp;
  record.rejectedById = actor.actorId;
  record.rejectedByName = actor.actorName;
  record.rejectionReason = notes;
  record.updatedById = actor.actorId;
  record.updatedByName = actor.actorName;
  record.updatedAt = timestamp;
  if (!Array.isArray(record.approvals)) record.approvals = [];
  record.approvals.unshift({
    id: createId("fee-approval"),
    action: "REJECTED",
    status: "REJECTED",
    notes,
    actorId: actor.actorId,
    actorName: actor.actorName,
    actorRole: actor.actorRole,
    createdAt: timestamp,
  });

  writeFinanceDb(db);
  return serializeStructure(record, db);
}

async function upsertStudentFinanceProfile(studentId, payload = {}) {
  const db = readFinanceDb();
  const safeStudentId = cleanText(studentId);
  if (!safeStudentId) throw createHttpError(400, "studentId is required.");

  const student = safeArray(db.students).find((item) => cleanText(item.id) === safeStudentId);
  if (!student) throw createHttpError(404, "Student not found.");

  const normalized = normalizeFinanceProfile(payload);
  const timestamp = nowIso();
  const schoolClass = resolveClassForJsonStudent(getSortedClasses(db), student);
  let profile = safeArray(db.financeStudentProfiles).find((item) => cleanText(item.studentId) === safeStudentId);

  if (!profile) {
    profile = { id: createId("student-finance-profile"), studentId: safeStudentId, createdAt: timestamp };
    db.financeStudentProfiles.unshift(profile);
  }

  profile.studentType = normalized.studentType;
  profile.canStudentView = normalized.canStudentView;
  profile.canParentView = normalized.canParentView;
  profile.notes = normalized.notes;
  profile.updatedAt = timestamp;

  writeFinanceDb(db);
  return {
    student: {
      id: cleanText(student.id),
      name: cleanText(student.name),
      classId: cleanText(schoolClass?.id || student.classId),
      className: cleanText(schoolClass?.name || student.className),
    },
    profile: serializeFinanceProfile(profile),
  };
}

async function buildStudentFeeVisibility(studentId, options = {}) {
  const db = readFinanceDb();
  const student = loadStudentFinanceContext(db, studentId);
  if (!student) throw createHttpError(404, "Student not found.");

  const financeProfile = normalizeFinanceProfile(student.financeProfile);
  const session = cleanText(options.session) || CURRENT_SESSION;
  const term = cleanText(options.term) || CURRENT_TERM;
  const audience = cleanText(options.audience).toLowerCase() || "student";

  return {
    session,
    term,
    audience,
    student: {
      id: student.id,
      name: student.name,
      classId: student.classId,
      className: student.className,
      financeProfile,
    },
    feeStructure: resolveApprovedFeeStructure(db, {
      classId: student.classId,
      session,
      term,
      studentType: financeProfile.studentType,
      audience,
    }),
  };
}

async function buildParentFeeVisibility(studentIds = [], options = {}) {
  const db = readFinanceDb();
  const session = cleanText(options.session) || CURRENT_SESSION;
  const term = cleanText(options.term) || CURRENT_TERM;
  const children = [];
  const missingStudentIds = [];

  for (const studentId of dedupeStrings(studentIds)) {
    const student = loadStudentFinanceContext(db, studentId);
    if (!student) {
      missingStudentIds.push(studentId);
      continue;
    }

    const financeProfile = normalizeFinanceProfile(student.financeProfile);
    children.push({
      student: {
        id: student.id,
        name: student.name,
        classId: student.classId,
        className: student.className,
        financeProfile,
      },
      feeStructure: financeProfile.canParentView ? resolveApprovedFeeStructure(db, {
        classId: student.classId,
        session,
        term,
        studentType: financeProfile.studentType,
        audience: "parent",
      }) : null,
      canParentView: financeProfile.canParentView,
    });
  }

  return {
    session,
    term,
    totalChildren: children.length,
    missingStudentIds,
    children,
  };
}

module.exports = {
  FINANCE_APPROVAL_STATUSES,
  FINANCE_FEE_MANAGE_ROLES,
  FINANCE_FEE_APPROVAL_ROLES,
  getFinanceFeeMeta,
  listFeeStructures,
  getFeeStructureById,
  createFeeStructure,
  updateFeeStructure,
  submitFeeStructure,
  approveFeeStructure,
  rejectFeeStructure,
  upsertStudentFinanceProfile,
  buildStudentFeeVisibility,
  buildParentFeeVisibility,
  createHttpError,
};
