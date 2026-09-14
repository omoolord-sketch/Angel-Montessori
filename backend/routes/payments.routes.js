const express = require("express");
const crypto = require("crypto");
const { nanoid } = require("nanoid");
const { auth, requireRole } = require("../middleware/auth");
const { readDB, writeDB } = require("../lib/jsonStore");
const { isArchivedStudent, syncStudentRosterFromPrisma } = require("../lib/studentRosterSync");
const {
  nowIso,
  str,
  normalizeMoney,
  normalizeBool,
  normalizePaymentStatus,
  normalizeFinanceSectionName,
  ensurePaymentCollections,
  ensureFinanceDefaults,
  createFinanceDocumentNumber,
  syncLegacyFeeInvoicesMirror,
  recalcInvoiceAmounts,
  appendFinanceAuditLog,
  hasSuccessfulApplicationFeePayment,
} = require("../lib/paymentStore");
const {
  ensureDonationCollections,
  getDonationByReference,
  appendDonationWebhookLog,
  updateWebhookLog,
  validatePaystackAmountCurrency,
  isPaystackSuccess,
  isPaystackFailure,
  finalizeDonationSuccess,
  finalizeDonationFailure,
} = require("../lib/donations");
const { setActiveAcademicScope, syncAcademicMirrors } = require("../lib/academicScope");
const {
  ACTIVE_CLASS_CONFIGS,
  classIdFromName: academicClassIdFromName,
  ensureAcademicSystemShape,
  getApprovedClassConfig,
  getLegacyClassMapping,
  sortAcademicClasses,
} = require("../lib/academicSystems");

const router = express.Router();
const PAYMENT_ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN", "FINANCE_OFFICER"];

const SCHOOL_CURRENCY = String(process.env.SCHOOL_CURRENCY || "NGN").toUpperCase();
const DEFAULT_SCHOOL_FEE = Number(process.env.SCHOOL_FEE_DEFAULT || 50000);
const DEFAULT_APPLICATION_FEE = Number(process.env.APPLICATION_FEE_DEFAULT || 2000);
const CURRENT_TERM = String(process.env.CURRENT_TERM || "First Term");
const CURRENT_SESSION = String(
  process.env.CURRENT_SESSION || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`
);
const PAYMENT_CLASS_SEED = ACTIVE_CLASS_CONFIGS.map((item) => ({
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

const SUPPORTED_PAYMENT_PROVIDERS = ["REMITA", "PAYSTACK", "MOCK"];

function isPlaceholderConfigValue(value) {
  const safe = str(value).trim().toLowerCase();
  if (!safe) return true;
  return [
    "replace-with",
    "your-",
    "your_",
    "placeholder",
    "change-me",
    "changeme",
    "dummy",
    "example",
  ].some((marker) => safe.includes(marker));
}

function ensureGatewaySettings(db) {
  if (!db || typeof db !== "object") {
    return { enabledProviders: [], defaultProvider: "" };
  }

  if (!db.financeGatewaySettings || typeof db.financeGatewaySettings !== "object") {
    db.financeGatewaySettings = { enabledProviders: [], defaultProvider: "" };
  }

  const enabledProviders = parseProviderList(db.financeGatewaySettings.enabledProviders);
  const defaultProvider = str(db.financeGatewaySettings.defaultProvider).toUpperCase();

  db.financeGatewaySettings.enabledProviders = enabledProviders;
  db.financeGatewaySettings.defaultProvider = SUPPORTED_PAYMENT_PROVIDERS.includes(defaultProvider)
    ? defaultProvider
    : "";

  return db.financeGatewaySettings;
}

function getPaystackMissingConfig() {
  const missing = [];
  if (isPlaceholderConfigValue(process.env.PAYSTACK_SECRET_KEY)) missing.push("PAYSTACK_SECRET_KEY");
  return missing;
}

function getRemitaMissingConfig() {
  const missing = [];
  if (isPlaceholderConfigValue(process.env.REMITA_MERCHANT_ID)) missing.push("REMITA_MERCHANT_ID");
  if (isPlaceholderConfigValue(process.env.REMITA_SERVICE_TYPE_ID)) missing.push("REMITA_SERVICE_TYPE_ID");
  if (isPlaceholderConfigValue(process.env.REMITA_API_KEY)) missing.push("REMITA_API_KEY");
  if (
    isPlaceholderConfigValue(process.env.REMITA_RESPONSE_URL) &&
    isPlaceholderConfigValue(process.env.PARENT_PAYMENT_CALLBACK_URL) &&
    isPlaceholderConfigValue(process.env.APPLICANT_PAYMENT_CALLBACK_URL) &&
    isPlaceholderConfigValue(process.env.PAYMENT_CALLBACK_URL)
  ) {
    missing.push("REMITA_RESPONSE_URL or a payment callback URL");
  }
  return missing;
}

function hasPaystackConfiguration() {
  return getPaystackMissingConfig().length === 0;
}

function hasRemitaConfiguration() {
  return getRemitaMissingConfig().length === 0;
}

function getProviderConfigStatus(provider) {
  const safe = str(provider).toUpperCase();

  if (safe === "PAYSTACK") {
    const missing = getPaystackMissingConfig();
    return {
      provider: safe,
      available: missing.length === 0,
      missing,
      message: missing.length === 0 ? "Ready" : `Missing ${missing.join(", ")}`,
    };
  }

  if (safe === "REMITA") {
    const missing = getRemitaMissingConfig();
    return {
      provider: safe,
      available: missing.length === 0,
      missing,
      message: missing.length === 0 ? "Ready" : `Missing ${missing.join(", ")}`,
    };
  }

  if (safe === "MOCK") {
    return { provider: safe, available: true, missing: [], message: "Offline demo mode" };
  }

  return { provider: safe, available: false, missing: ["UNKNOWN_PROVIDER"], message: "Unsupported provider" };
}

function providerIsAvailable(provider) {
  return Boolean(getProviderConfigStatus(provider).available);
}

function parseProviderList(raw) {
  const source = Array.isArray(raw) ? raw.join(",") : String(raw || "");
  const values = source
    .split(",")
    .map((item) => str(item).toUpperCase())
    .filter(Boolean)
    .filter((item, idx, arr) => arr.indexOf(item) === idx)
    .filter((item) => SUPPORTED_PAYMENT_PROVIDERS.includes(item));
  return values;
}

function getConfiguredProviderList(db) {
  const settings = ensureGatewaySettings(db);
  return parseProviderList(settings.enabledProviders);
}

function getEnabledProviders(db) {
  const fromDb = getConfiguredProviderList(db);
  const fromEnv = parseProviderList(process.env.ENABLED_PAYMENT_PROVIDERS);
  const fromLegacy = parseProviderList(process.env.PAYMENT_PROVIDER);
  const hasExplicitProviderConfig = fromDb.length > 0 || fromEnv.length > 0 || fromLegacy.length > 0;

  const candidates = fromDb.length ? fromDb : fromEnv.length ? fromEnv : fromLegacy.length ? fromLegacy : ["MOCK"];
  const enabled = candidates.filter((provider) => providerIsAvailable(provider));

  if (enabled.length > 0) return enabled;
  if (hasExplicitProviderConfig) return [];
  if (providerIsAvailable("REMITA")) return ["REMITA"];
  if (providerIsAvailable("PAYSTACK")) return ["PAYSTACK"];
  return ["MOCK"];
}

function resolveProvider(requestedProvider = "", db = null) {
  const enabled = getEnabledProviders(db);
  if (!enabled.length) return "";
  const requested = str(requestedProvider).toUpperCase();
  if (requested && enabled.includes(requested)) return requested;

  const settings = ensureGatewaySettings(db);
  const defaultProvider = str(settings.defaultProvider).toUpperCase();
  if (defaultProvider && enabled.includes(defaultProvider)) return defaultProvider;

  return enabled[0] || "MOCK";
}

function getPaymentProviderMeta(db) {
  const providers = getEnabledProviders(db);
  const defaultProvider = resolveProvider("", db);

  return {
    providers,
    defaultProvider,
    providerStatus: SUPPORTED_PAYMENT_PROVIDERS.map((provider) => getProviderConfigStatus(provider)),
    configuredProviders: getConfiguredProviderList(db),
  };
}

function resolvePaymentCallbackUrl(audience = "parent") {
  const safeAudience = str(audience).toLowerCase() === "applicant" ? "applicant" : "parent";
  const specific =
    safeAudience === "applicant"
      ? str(process.env.APPLICANT_PAYMENT_CALLBACK_URL)
      : str(process.env.PARENT_PAYMENT_CALLBACK_URL);

  if (specific) return specific;

  const generic = str(process.env.PAYMENT_CALLBACK_URL);
  if (generic) return generic;

  return safeAudience === "applicant"
    ? "http://localhost:3000/portal/applicant"
    : "http://localhost:3000/portal/parent";
}

function resolveRemitaCallbackUrl(audience = "parent") {
  return str(process.env.REMITA_RESPONSE_URL) || resolvePaymentCallbackUrl(audience);
}

function validateRequestedProvider(requestedProvider, db = null) {
  const requested = str(requestedProvider).toUpperCase();
  const enabled = getEnabledProviders(db);

  if (!enabled.length) {
    return "Online payment is not configured yet. Please contact the school office.";
  }

  if (!requested) return "";
  if (!SUPPORTED_PAYMENT_PROVIDERS.includes(requested)) {
    return `Unsupported payment provider: ${requested}`;
  }

  if (!enabled.includes(requested)) {
    const status = getProviderConfigStatus(requested);
    const reason = status?.message ? ` (${status.message})` : "";
    return `Selected payment provider is not enabled. Available providers: ${enabled.join(", ")}${reason}`;
  }

  return "";
}

function createReference(prefix) {
  return `${prefix}-${Date.now()}-${nanoid(6)}`.toUpperCase();
}

function normalizeClassKey(value) {
  return str(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function classIdFromName(name) {
  return academicClassIdFromName(name);
}

const FEE_CATEGORIES = [
  "tuition",
  "examination",
  "levy",
  "boarding",
  "transport",
  "feeding",
  "books",
  "uniform",
  "registration",
  "practical",
  "special_event",
  "optional_service",
];

function normalizeStructureType(value, fallbackOptional) {
  const type = str(value).toUpperCase();
  if (type === "COMPULSORY" || type === "OPTIONAL") return type;
  return normalizeBool(fallbackOptional) ? "OPTIONAL" : "COMPULSORY";
}

function normalizeFeeCategory(value) {
  const safe = str(value).toLowerCase().replace(/[^a-z_]/g, "");
  if (!safe) return "levy";
  if (FEE_CATEGORIES.includes(safe)) return safe;
  return "optional_service";
}

function isStructureActive(row) {
  return row?.isActive === undefined ? true : normalizeBool(row.isActive);
}

function isCompulsoryStructure(row) {
  return normalizeStructureType(row?.structureType, row?.isOptional) === "COMPULSORY";
}
function ensureClassCatalog(db) {
  if (!Array.isArray(db.classes)) db.classes = [];
  if (!Array.isArray(db.students)) db.students = [];
  if (!Array.isArray(db.financeSections)) db.financeSections = [];

  const ensureSection = (sectionName, order = 999) => {
    const name = normalizeFinanceSectionName(sectionName);
    const id = classIdFromName(name);
    let row = (db.financeSections || []).find(
      (item) => str(item.id) === id || normalizeFinanceSectionName(item.sectionName || item.name).toLowerCase() === name.toLowerCase()
    );
    if (!row) {
      row = {
        id,
        sectionName: name,
        name,
        order: Number(order || 999),
        isActive: true,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      db.financeSections.push(row);
    } else {
      row.sectionName = name;
      row.name = name;
      row.order = Number(row.order || order || 999);
      row.isActive = row.isActive === undefined ? true : normalizeBool(row.isActive);
      row.updatedAt = str(row.updatedAt || nowIso());
    }
    return row;
  };

  [
    { name: "Early Years", order: 1 },
    { name: "Primary", order: 2 },
    { name: "Junior Secondary", order: 3 },
    { name: "Senior Secondary", order: 4 },
  ].forEach((item) => ensureSection(item.name, item.order));

  const byId = new Map();
  const byName = new Map();

  const addClass = (item) => {
    const name = str(item?.name || item?.className);
    const id = str(item?.id || item?.classId || classIdFromName(name));
    if (!name || !id) return;

    if (byId.has(id)) return;
    const key = normalizeClassKey(name);
    const section = ensureSection(item?.section || item?.sectionName || "Other");

    if (byName.has(key)) {
      byId.set(id, { ...byName.get(key), id, section: section.sectionName, sectionId: section.id });
      return;
    }

    const row = {
      id,
      name,
      section: section.sectionName,
      sectionId: section.id,
      order: Number(item?.order ?? 999),
      createdAt: str(item?.createdAt) || nowIso(),
      updatedAt: str(item?.updatedAt) || nowIso(),
    };

    byId.set(id, row);
    byName.set(key, row);
  };

  for (const cls of db.classes) addClass(cls);
  for (const cls of PAYMENT_CLASS_SEED) addClass(cls);

  for (const student of db.students) {
    if (!str(student.classId) && str(student.className)) {
      student.classId = classIdFromName(student.className);
    }

    addClass({
      id: student.classId,
      name: student.className,
      section: "Other",
      order: 999,
    });
  }

  db.classes = sortAcademicClasses(Array.from(byId.values()));
  ensureAcademicSystemShape(db);
  db.financeSections = (db.financeSections || []).sort((a, b) => Number(a.order || 999) - Number(b.order || 999));
}
function createStudentIdResolver(db) {
  const students = Array.isArray(db.students) ? db.students : [];
  const ordered = students.slice().sort((a, b) => str(a.createdAt).localeCompare(str(b.createdAt)));
  const knownIds = new Set();
  const map = new Map();

  const addRef = (ref, studentId) => {
    const normalizedRef = str(ref).toLowerCase();
    const normalizedId = str(studentId);
    if (!normalizedRef || !normalizedId) return;
    if (!map.has(normalizedRef)) map.set(normalizedRef, normalizedId);
  };

  ordered.forEach((student, index) => {
    const id = str(student.id);
    if (!id) return;
    knownIds.add(id);

    const refs = [
      id,
      student.studentId,
      student.admissionNo,
      student.admissionNumber,
      student.registrationNo,
      student.registrationNumber,
      student.code,
      `AMS${String(index + 1).padStart(4, "0")}`,
    ];

    refs.forEach((ref) => addRef(ref, id));
  });

  const resolveOne = (value) => {
    const raw = str(value);
    if (!raw) return "";
    const mapped = map.get(raw.toLowerCase());
    if (mapped) return mapped;
    if (knownIds.has(raw)) return raw;
    if (knownIds.size === 1) return Array.from(knownIds)[0];
    return raw;
  };

  const resolveMany = (values) => {
    const refs = Array.isArray(values) ? values : [];
    const out = [];
    const seen = new Set();

    for (const value of refs) {
      const id = resolveOne(value);
      if (!id || !knownIds.has(id) || seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }

    if (out.length === 0 && refs.length > 0 && knownIds.size === 1) {
      out.push(Array.from(knownIds)[0]);
    }

    return out;
  };

  return { resolveOne, resolveMany };
}

function getActiveSessionTerm(db) {
  const setup = ensureFinanceDefaults(db, {
    currentSession: CURRENT_SESSION,
    currentTerm: CURRENT_TERM,
  });

  const activeSession =
    setup.activeSession ||
    (db.academicSessions || []).find((item) => Boolean(item.isActive)) ||
    (db.academicSessions || [])[0] ||
    null;

  const activeTerm =
    setup.activeTerm ||
    (db.terms || []).find((item) => Boolean(item.isActive) && str(item.sessionId) === str(activeSession?.id)) ||
    (db.terms || []).find((item) => str(item.sessionId) === str(activeSession?.id)) ||
    null;

  return { activeSession, activeTerm };
}

function buildSchoolFeeTemplate(db, payload = {}) {
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });
  ensureClassCatalog(db);

  const { activeSession, activeTerm } = getActiveSessionTerm(db);
  const session = findSessionByInput(db, payload.sessionId || payload.sessionName) || activeSession;
  if (!session) return null;

  const requestedTerm = str(payload.termId || payload.termName);
  const term = requestedTerm
    ? findTermByInput(db, requestedTerm, session.id)
    : findTermByInput(db, activeTerm?.id, session.id) ||
      (db.terms || []).find((row) => str(row.sessionId) === str(session.id)) ||
      null;
  if (!term) return null;

  const classId = resolveClassIdsFromInput(db, payload)[0] || "";
  if (!classId) return null;

  const schoolClass = (db.classes || []).find((row) => str(row.id) === classId);
  if (!schoolClass) return null;

  const items = (db.feeStructures || [])
    .filter((row) => str(row.sessionId) === str(session.id) && str(row.termId) === str(term.id) && str(row.classId) === classId)
    .filter((row) => isStructureActive(row))
    .map((row) => {
      const feeType = (db.feeTypes || []).find((item) => str(item.id) === str(row.feeTypeId));
      const structureType = normalizeStructureType(row.structureType, row.isOptional);
      return {
        id: str(row.id),
        feeTypeId: str(row.feeTypeId),
        feeName: str(feeType?.feeName) || "Fee",
        feeCode: str(feeType?.feeCode),
        feeCategory: normalizeFeeCategory(feeType?.category),
        feeCategoryLabel: str(feeType?.category || "General").replace(/_/g, " "),
        amount: normalizeMoney(row.amount),
        dueDate: str(row.dueDate),
        structureType,
      };
    })
    .sort((a, b) => {
      if (a.structureType !== b.structureType) return a.structureType === "COMPULSORY" ? -1 : 1;
      return a.feeName.localeCompare(b.feeName);
    });

  if (!items.length) return null;

  const compulsoryItems = items.filter((item) => item.structureType === "COMPULSORY");
  const optionalItems = items.filter((item) => item.structureType === "OPTIONAL");
  const compulsoryTotal = compulsoryItems.reduce((sum, item) => sum + normalizeMoney(item.amount), 0);
  const optionalTotal = optionalItems.reduce((sum, item) => sum + normalizeMoney(item.amount), 0);
  const dueDate = items
    .map((item) => str(item.dueDate))
    .filter(Boolean)
    .sort()[0] || "";

  return {
    schoolName: "Angel Montessori School",
    motto: "In God We Trust",
    currency: SCHOOL_CURRENCY,
    sessionId: str(session.id),
    sessionName: str(session.sessionName),
    termId: str(term.id),
    termName: str(term.termName),
    classId: str(schoolClass.id),
    className: str(schoolClass.name),
    section: str(schoolClass.section),
    dueDate,
    itemCount: items.length,
    compulsoryCount: compulsoryItems.length,
    optionalCount: optionalItems.length,
    compulsoryTotal,
    optionalTotal,
    totalAmount: normalizeMoney(compulsoryTotal + optionalTotal),
    items,
    generatedAt: nowIso(),
    contact: {
      address: "152 Okedogbon Road, Owo, Ondo State, Nigeria",
      email: "info@angelmontessori.ng",
      phone: "+234 803 506 7767",
    },
  };
}

function getFeeTypeByCode(db, feeCode) {
  return (db.feeTypes || []).find((item) => str(item.feeCode).toUpperCase() === str(feeCode).toUpperCase()) || null;
}

function resolveStudentClassId(db, student) {
  ensureClassCatalog(db);

  const classId = str(student?.classId);
  if (classId && (db.classes || []).some((item) => str(item.id) === classId)) {
    return classId;
  }

  const classNameKey = normalizeClassKey(student?.className);
  if (!classNameKey) return "";

  const found = (db.classes || []).find((item) => normalizeClassKey(item.name) === classNameKey);
  if (found) return str(found.id);

  const id = classIdFromName(student.className);
  const now = nowIso();
  db.classes.push({ id, name: str(student.className), section: "Other", sectionId: "other", order: 999, createdAt: now, updatedAt: now });
  return id;
}
function getActiveStudentFeeAssignments(db, { studentId, sessionId, termId }) {
  return (db.studentFeeAssignments || []).filter((row) => {
    if (!isStructureActive(row)) return false;
    if (str(row.studentId) !== str(studentId)) return false;
    if (str(row.sessionId) !== str(sessionId)) return false;
    if (str(row.termId) !== str(termId)) return false;
    return normalizeMoney(row.amount) > 0;
  });
}

function getStudentAdmissionNumber(student) {
  return str(student?.admissionNumber || student?.admissionNo || student?.registrationNo || student?.studentId || student?.id);
}

function buildInvoiceSnapshot(db, { student, session, term, classId }) {
  const cls = (db.classes || []).find((row) => str(row.id) === str(classId)) || null;
  const sectionName = normalizeFinanceSectionName(cls?.section);
  const section = (db.financeSections || []).find(
    (row) => normalizeFinanceSectionName(row.sectionName || row.name).toLowerCase() === sectionName.toLowerCase()
  ) || null;

  return {
    sessionNameSnapshot: str(session?.sessionName),
    termNameSnapshot: str(term?.termName),
    studentNameSnapshot: str(student?.name),
    admissionNumberSnapshot: getStudentAdmissionNumber(student),
    classIdSnapshot: str(cls?.id || classId),
    classNameSnapshot: str(cls?.name || student?.className),
    sectionIdSnapshot: str(section?.id || cls?.sectionId),
    sectionNameSnapshot: str(section?.sectionName || sectionName),
  };
}

function applyMissingInvoiceSnapshot(invoice, snapshot) {
  for (const [key, value] of Object.entries(snapshot || {})) {
    if (!str(invoice[key]) && str(value)) invoice[key] = str(value);
  }
  if (invoice.snapshotLocked === undefined) invoice.snapshotLocked = true;
}

function buildInvoiceItemPayload(db, item) {
  const feeType = (db.feeTypes || []).find((row) => str(row.id) === str(item.feeTypeId));
  const description = str(item.description || feeType?.feeName || "Fee");
  const amount = normalizeMoney(item.amount);
  return {
    id: nanoid(),
    invoiceId: str(item.invoiceId),
    feeTypeId: str(item.feeTypeId),
    description,
    feeNameSnapshot: str(item.feeNameSnapshot || feeType?.feeName || description),
    feeCodeSnapshot: str(item.feeCodeSnapshot || feeType?.feeCode),
    feeCategorySnapshot: normalizeFeeCategory(item.feeCategorySnapshot || feeType?.category),
    structureTypeSnapshot: normalizeStructureType(item.structureTypeSnapshot || item.structureType, item.isOptional),
    originalAmount: normalizeMoney(item.originalAmount || amount),
    discountAmount: normalizeMoney(item.discountAmount),
    adjustmentAmount: normalizeMoney(item.adjustmentAmount),
    amount,
    sourceType: str(item.sourceType).toUpperCase(),
    sourceId: str(item.sourceId),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

function createInvoiceForStudent({
  db,
  student,
  session,
  term,
  dueDate,
  createdBy,
  feeStructures,
  fallbackAmount,
  includePreviousBalance = true,
  ignoreSuppression = false,
}) {
  const now = nowIso();
  const classId = resolveStudentClassId(db, student);
  const snapshot = buildInvoiceSnapshot(db, { student, session, term, classId });
  const suppressed = !ignoreSuppression && (db.invoiceSuppressions || []).some((row) => (
    str(row.studentId) === str(student.id) &&
    str(row.sessionId) === str(session.id) &&
    str(row.termId) === str(term.id)
  ));
  if (suppressed) return null;

  const existing = (db.invoices || []).find(
    (row) =>
      str(row.studentId) === str(student.id) &&
      str(row.sessionId) === str(session.id) &&
      str(row.termId) === str(term.id) &&
      str(row.status) !== "CANCELLED"
  );

  const compulsoryStructures = (feeStructures || [])
    .filter((row) => str(row.classId) === classId)
    .filter((row) => isStructureActive(row) && isCompulsoryStructure(row));

  let generatedItems = compulsoryStructures.map((row) => {
    const feeType = (db.feeTypes || []).find((item) => str(item.id) === str(row.feeTypeId));
    return {
      feeTypeId: str(row.feeTypeId),
      description: str(feeType?.feeName) || "Fee",
      feeNameSnapshot: str(feeType?.feeName) || "Fee",
      feeCodeSnapshot: str(feeType?.feeCode),
      feeCategorySnapshot: normalizeFeeCategory(feeType?.category),
      structureTypeSnapshot: "COMPULSORY",
      amount: normalizeMoney(row.amount),
      sourceType: "CLASS_STRUCTURE",
      sourceId: str(row.id),
      dueDate: str(row.dueDate),
    };
  });

  const safeFallbackAmount = normalizeMoney(fallbackAmount);
  if (generatedItems.length === 0 && safeFallbackAmount > 0) {
    const tuition = getFeeTypeByCode(db, "TUITION") || (db.feeTypes || [])[0] || null;
    generatedItems = [{
      feeTypeId: str(tuition?.id),
      description: str(tuition?.feeName) || "Tuition",
      feeNameSnapshot: str(tuition?.feeName) || "Tuition",
      feeCodeSnapshot: str(tuition?.feeCode || "TUITION"),
      feeCategorySnapshot: normalizeFeeCategory(tuition?.category || "tuition"),
      structureTypeSnapshot: "COMPULSORY",
      amount: safeFallbackAmount,
      sourceType: "FALLBACK_TUITION",
      sourceId: "",
      dueDate: "",
    }];
  }

  const studentAssignments = getActiveStudentFeeAssignments(db, {
    studentId: student.id,
    sessionId: session.id,
    termId: term.id,
  });

  for (const assignment of studentAssignments) {
    const feeType = (db.feeTypes || []).find((item) => str(item.id) === str(assignment.feeTypeId));
    generatedItems.push({
      feeTypeId: str(assignment.feeTypeId),
      description: str(feeType?.feeName) || "Optional Fee",
      feeNameSnapshot: str(feeType?.feeName) || "Optional Fee",
      feeCodeSnapshot: str(feeType?.feeCode),
      feeCategorySnapshot: normalizeFeeCategory(feeType?.category || "optional_service"),
      structureTypeSnapshot: "OPTIONAL",
      amount: normalizeMoney(assignment.amount),
      sourceType: "STUDENT_ASSIGNMENT",
      sourceId: str(assignment.id),
      dueDate: str(assignment.dueDate),
    });
  }

  if (includePreviousBalance) {
    const currentInvoiceId = str(existing?.id);
    const previousBalance = (db.invoices || [])
      .filter((row) => str(row.studentId) === str(student.id))
      .filter((row) => str(row.id) !== currentInvoiceId)
      .filter((row) => str(row.status) !== "CANCELLED")
      .reduce((sum, row) => sum + normalizeMoney(row.balance), 0);

    if (previousBalance > 0) {
      generatedItems.push({
        feeTypeId: "",
        description: "Previous Balance (Arrears)",
        feeNameSnapshot: "Previous Balance (Arrears)",
        feeCodeSnapshot: "ARREARS",
        feeCategorySnapshot: "arrears",
        structureTypeSnapshot: "COMPULSORY",
        amount: normalizeMoney(previousBalance),
        sourceType: "ARREARS",
        sourceId: "AUTO",
        dueDate: "",
      });
    }
  }

  generatedItems = generatedItems.filter((item) => normalizeMoney(item.amount) > 0);
  if (generatedItems.length === 0 && !existing) return null;

  const resolvedDueDate =
    str(dueDate) ||
    str(generatedItems.find((item) => str(item.dueDate))?.dueDate) ||
    str(existing?.dueDate);

  const generatedSourceTypes = new Set(["CLASS_STRUCTURE", "STUDENT_ASSIGNMENT", "FALLBACK_TUITION", "ARREARS"]);

  let invoiceId = str(existing?.id);
  let invoiceNumber = str(existing?.invoiceNumber);

  if (!existing) {
    invoiceId = nanoid();
    invoiceNumber = createFinanceDocumentNumber(db.invoices || [], "INV", now);

    db.invoices.unshift({
      id: invoiceId,
      invoiceNumber,
      studentId: str(student.id),
      sessionId: str(session.id),
      termId: str(term.id),
      ...snapshot,
      snapshotLocked: true,
      totalAmount: 0,
      amountPaid: 0,
      balance: 0,
      status: "UNPAID",
      dueDate: resolvedDueDate,
      createdBy: str(createdBy) || "system",
      createdAt: now,
      updatedAt: now,
    });
  } else {
    applyMissingInvoiceSnapshot(existing, snapshot);
    existing.dueDate = resolvedDueDate || str(existing.dueDate);
    existing.updatedAt = now;
  }

  const existingItems = (db.invoiceItems || []).filter((row) => str(row.invoiceId) === invoiceId);
  const shouldPreserveBaseSnapshot = Boolean(existing && existing.snapshotLocked !== false && existingItems.length > 0);
  const sourceTypesToReplace = shouldPreserveBaseSnapshot
    ? new Set(["STUDENT_ASSIGNMENT"])
    : generatedSourceTypes;

  db.invoiceItems = (db.invoiceItems || []).filter((row) => {
    if (str(row.invoiceId) !== invoiceId) return true;
    return !sourceTypesToReplace.has(str(row.sourceType).toUpperCase());
  });

  const itemsToWrite = shouldPreserveBaseSnapshot
    ? generatedItems.filter((item) => str(item.sourceType).toUpperCase() === "STUDENT_ASSIGNMENT")
    : generatedItems;

  for (const item of itemsToWrite) {
    db.invoiceItems.unshift(buildInvoiceItemPayload(db, { ...item, invoiceId }));
  }

  db.paymentLogs.unshift({
    id: nanoid(),
    invoiceId,
    paymentId: "",
    action: existing ? (shouldPreserveBaseSnapshot ? "invoice_snapshot_preserved" : "invoice_synced") : "invoice_created",
    performedBy: str(createdBy) || "system",
    notes: shouldPreserveBaseSnapshot
      ? `Preserved original invoice snapshot ${invoiceNumber}; refreshed student-specific fee lines only`
      : `${existing ? "Synced" : "Created"} invoice ${invoiceNumber} for student ${str(student.name)}`,
    createdAt: now,
  });

  return recalcInvoiceAmounts(db, invoiceId);
}
function ensureStudentInvoices(db, studentIds, options = {}) {
  ensureClassCatalog(db);
  const { activeSession, activeTerm } = getActiveSessionTerm(db);
  if (!activeSession || !activeTerm) return [];

  const ids = Array.isArray(studentIds) ? studentIds.map((id) => str(id)).filter(Boolean) : [];
  const students = (db.students || []).filter((item) => ids.includes(str(item.id)));

  const feeStructures = (db.feeStructures || []).filter(
    (row) => str(row.sessionId) === str(activeSession.id) && str(row.termId) === str(activeTerm.id)
  );

  const invoices = [];
  for (const student of students) {
    const invoice = createInvoiceForStudent({
      db,
      student,
      session: activeSession,
      term: activeTerm,
      dueDate: str(options.dueDate),
      createdBy: str(options.createdBy) || "system:auto",
      feeStructures,
      fallbackAmount: options.fallbackAmount === undefined ? 0 : Number(options.fallbackAmount || 0),
      includePreviousBalance: options.includePreviousBalance !== false,
    });

    if (invoice) invoices.push(invoice);
  }

  syncLegacyFeeInvoicesMirror(db);
  return invoices;
}

function removeInvoiceSuppression(db, studentId, sessionId, termId) {
  db.invoiceSuppressions = (db.invoiceSuppressions || []).filter((row) => !(
    str(row.studentId) === str(studentId) &&
    str(row.sessionId) === str(sessionId) &&
    str(row.termId) === str(termId)
  ));
}

function addInvoiceSuppression(db, invoice, payload = {}) {
  if (!invoice) return null;
  const existing = (db.invoiceSuppressions || []).find((row) => (
    str(row.studentId) === str(invoice.studentId) &&
    str(row.sessionId) === str(invoice.sessionId) &&
    str(row.termId) === str(invoice.termId)
  ));
  const now = nowIso();
  if (existing) {
    existing.reason = str(payload.reason || existing.reason);
    existing.action = str(payload.action || existing.action);
    existing.updatedAt = now;
    return existing;
  }

  const row = {
    id: nanoid(),
    studentId: str(invoice.studentId),
    sessionId: str(invoice.sessionId),
    termId: str(invoice.termId),
    invoiceId: str(invoice.id),
    action: str(payload.action || "SUPPRESSED"),
    reason: str(payload.reason),
    createdBy: str(payload.createdBy),
    createdAt: now,
    updatedAt: now,
  };
  db.invoiceSuppressions.unshift(row);
  return row;
}

function findActiveInvoiceForStudent(db, studentId, sessionId, termId) {
  return (db.invoices || []).find((row) => (
    str(row.studentId) === str(studentId) &&
    str(row.sessionId) === str(sessionId) &&
    str(row.termId) === str(termId) &&
    str(row.status).toUpperCase() !== "CANCELLED"
  )) || null;
}

function getAutomaticStudentFeeAmount(db, student, sessionId, termId) {
  const feeRow = (db.financeStudentFees || []).find((row) => (
    str(row.studentId) === str(student.id) &&
    str(row.sessionId) === str(sessionId) &&
    str(row.termId) === str(termId)
  ));
  if (normalizeMoney(feeRow?.totalFee) > 0) return normalizeMoney(feeRow.totalFee);

  const existing = findActiveInvoiceForStudent(db, student.id, sessionId, termId);
  if (normalizeMoney(existing?.totalAmount) > 0) return normalizeMoney(existing.totalAmount);

  return 0;
}

function mirrorFinancePaymentIntoSchoolFees(db, financePayment, invoice, actor = {}) {
  const financePaymentId = str(financePayment?.id);
  if (!financePaymentId || !invoice || str(financePayment?.status).toLowerCase() === "voided") return null;

  const existing = (db.payments || []).find((row) => (
    str(row.financePaymentId) === financePaymentId ||
    str(row.id) === `finance-mirror-${financePaymentId}`
  ));
  if (existing) return null;

  const paidAt = str(financePayment.datePaid || financePayment.createdAt || nowIso());
  const reference = str(financePayment.reference || financePayment.receiptNumber || `FIN-${financePaymentId}`);
  const payment = {
    id: `finance-mirror-${financePaymentId}`,
    financePaymentId,
    type: "STUDENT_FEE",
    userId: str(financePayment.receivedBy || actor.id),
    role: "FINANCE_OFFICER",
    invoiceId: str(invoice.id),
    studentId: str(invoice.studentId),
    paymentReference: reference,
    reference,
    gatewayName: "MANUAL",
    provider: "MANUAL",
    gatewayReference: reference,
    amount: normalizeMoney(financePayment.amount),
    currency: SCHOOL_CURRENCY,
    paymentMethod: str(financePayment.paymentMethod || "TRANSFER").toUpperCase(),
    status: "SUCCESS",
    receiptNumber: str(financePayment.receiptNumber),
    paidAt,
    verifiedAt: paidAt,
    createdAt: str(financePayment.createdAt || paidAt),
    updatedAt: nowIso(),
    metadata: {
      source: "FINANCE_DESK",
      description: str(financePayment.description),
    },
  };

  db.payments.unshift(payment);
  applyPaymentSuccess(db, payment);
  return payment;
}

function syncAllStudentInvoicesAndFinancePayments(db, actor = {}) {
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });
  ensureClassCatalog(db);

  const { activeSession, activeTerm } = getActiveSessionTerm(db);
  if (!activeSession || !activeTerm) {
    return { invoicesCreated: 0, paymentsMirrored: 0 };
  }

  const students = (db.students || []).filter((row) => !isArchivedStudent(row));
  const feeStructures = (db.feeStructures || []).filter((row) => (
    str(row.sessionId) === str(activeSession.id) &&
    str(row.termId) === str(activeTerm.id)
  ));
  let invoicesCreated = 0;
  let paymentsMirrored = 0;

  for (const student of students) {
    const before = findActiveInvoiceForStudent(db, student.id, activeSession.id, activeTerm.id);
    const invoice = before || createInvoiceForStudent({
      db,
      student,
      session: activeSession,
      term: activeTerm,
      dueDate: "",
      createdBy: str(actor.id) || "system:auto-finance-sync",
      feeStructures,
      fallbackAmount: getAutomaticStudentFeeAmount(db, student, activeSession.id, activeTerm.id),
      includePreviousBalance: false,
    });
    if (!before && invoice) invoicesCreated += 1;
  }

  for (const financePayment of db.financePayments || []) {
    const invoice = findActiveInvoiceForStudent(
      db,
      financePayment.studentId,
      financePayment.sessionId,
      financePayment.termId
    );
    if (mirrorFinancePaymentIntoSchoolFees(db, financePayment, invoice, actor)) {
      paymentsMirrored += 1;
    }
  }

  recalcAllInvoices(db);
  syncLegacyFeeInvoicesMirror(db);
  return { invoicesCreated, paymentsMirrored };
}

function buildInvoiceProjection(db, invoice) {
  const session = (db.academicSessions || []).find((item) => str(item.id) === str(invoice.sessionId));
  const term = (db.terms || []).find((item) => str(item.id) === str(invoice.termId));
  const student = (db.students || []).find((item) => str(item.id) === str(invoice.studentId));
  const classId = resolveStudentClassId(db, student || {});
  const classRow = (db.classes || []).find((item) => str(item.id) === classId);
  const snapshotClassId = str(invoice.classIdSnapshot || classRow?.id);

  const items = (db.invoiceItems || [])
    .filter((item) => str(item.invoiceId) === str(invoice.id))
    .map((item) => {
      const feeType = (db.feeTypes || []).find((row) => str(row.id) === str(item.feeTypeId));
      return {
        id: str(item.id),
        feeTypeId: str(item.feeTypeId),
        feeTypeName: str(item.feeNameSnapshot || feeType?.feeName),
        feeCode: str(item.feeCodeSnapshot || feeType?.feeCode),
        feeCategory: normalizeFeeCategory(item.feeCategorySnapshot || feeType?.category),
        structureType: normalizeStructureType(item.structureTypeSnapshot, item.isOptional),
        description: str(item.description),
        originalAmount: normalizeMoney(item.originalAmount || item.amount),
        amount: normalizeMoney(item.amount),
      };
    });

  return {
    ...invoice,
    invoiceNumber: str(invoice.invoiceNumber),
    sessionName: str(invoice.sessionNameSnapshot || session?.sessionName),
    termName: str(invoice.termNameSnapshot || term?.termName),
    studentName: str(invoice.studentNameSnapshot || student?.name),
    admissionNumber: str(invoice.admissionNumberSnapshot || getStudentAdmissionNumber(student)),
    classId: snapshotClassId,
    className: str(invoice.classNameSnapshot || classRow?.name || student?.className),
    sectionId: str(invoice.sectionIdSnapshot || classRow?.sectionId),
    sectionName: str(invoice.sectionNameSnapshot || classRow?.section),
    items,
    totalAmount: normalizeMoney(invoice.totalAmount),
    amountPaid: normalizeMoney(invoice.amountPaid),
    balance: normalizeMoney(invoice.balance),
    status: str(invoice.status),
  };
}

function buildParentInvoiceSummary(db, parentUser) {
  const resolver = createStudentIdResolver(db);
  const parentStudentRefs = [
    ...(Array.isArray(parentUser.studentIds) ? parentUser.studentIds : []),
    parentUser.studentId,
  ];

  const studentIds = resolver.resolveMany(parentStudentRefs);
  ensureStudentInvoices(db, studentIds, { createdBy: "system:auto-parent", fallbackAmount: 0 });

  const invoices = (db.invoices || [])
    .filter((item) => studentIds.includes(str(item.studentId)))
    .map((item) => buildInvoiceProjection(db, recalcInvoiceAmounts(db, item.id) || item))
    .sort((a, b) => str(b.updatedAt).localeCompare(str(a.updatedAt)));

  return {
    studentIds,
    invoices: invoices.map((invoice) => ({
      ...invoice,
      id: str(invoice.id),
      label: `Invoice ${invoice.invoiceNumber}`,
      amount: invoice.totalAmount,
      paidAmount: invoice.amountPaid,
      dueAmount: invoice.balance,
      currency: SCHOOL_CURRENCY,
    })),
  };
}

function createPaymentLog(db, payload) {
  db.paymentLogs.unshift({
    id: nanoid(),
    invoiceId: str(payload.invoiceId),
    paymentId: str(payload.paymentId),
    action: str(payload.action),
    performedBy: str(payload.performedBy),
    notes: str(payload.notes),
    createdAt: nowIso(),
  });
}

function createReceiptForPayment(db, payment) {
  const paymentId = str(payment.id);
  if (!paymentId) return null;

  const existing = (db.receipts || []).find((row) => str(row.paymentId) === paymentId);
  if (existing) return existing;

  const now = nowIso();
  const requestedReceiptNumber = str(payment.receiptNumber);
  const receiptNumber = requestedReceiptNumber && !(db.receipts || []).some((row) => str(row.receiptNumber) === requestedReceiptNumber)
    ? requestedReceiptNumber
    : createFinanceDocumentNumber(db.receipts || [], "RCP", now);

  const receipt = {
    id: nanoid(),
    receiptNumber,
    paymentId,
    invoiceId: str(payment.invoiceId),
    studentId: str(payment.studentId),
    pdfPath: "",
    issuedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  db.receipts.unshift(receipt);
  return receipt;
}

function applyPaymentSuccess(db, payment) {
  if (str(payment.type).toUpperCase() === "STUDENT_FEE") {
    const updatedInvoice = recalcInvoiceAmounts(db, payment.invoiceId);
    const receipt = createReceiptForPayment(db, payment);

    createPaymentLog(db, {
      invoiceId: payment.invoiceId,
      paymentId: payment.id,
      action: "payment_verified",
      performedBy: payment.userId,
      notes: `Payment ${payment.paymentReference || payment.reference} verified as SUCCESS`,
    });

    if (receipt) {
      createPaymentLog(db, {
        invoiceId: payment.invoiceId,
        paymentId: payment.id,
        action: "receipt_generated",
        performedBy: payment.userId,
        notes: `Receipt ${receipt.receiptNumber} generated`,
      });
    }

    return updatedInvoice;
  }

  if (str(payment.type).toUpperCase() === "APPLICATION_FEE") {
    const admissions = Array.isArray(db.admissions) ? db.admissions : [];
    const row = admissions.find((item) => str(item.applicantUserId) === str(payment.userId));
    if (row) {
      row.applicationFeePaid = true;
      row.applicationFeePaidAt = nowIso();
      row.updatedAt = nowIso();
    }
  }

  if (str(payment.type).toUpperCase() === "ACCEPTANCE_FEE") {
    const admissions = Array.isArray(db.admissions) ? db.admissions : [];
    const row = admissions.find((item) => str(item.applicantUserId) === str(payment.userId));
    if (row) {
      row.acceptanceFeePaid = true;
      row.acceptanceFeePaidAt = nowIso();
      row.acceptanceFeeReference = str(payment.paymentReference || payment.reference);
      row.updatedAt = nowIso();
    }
  }

  return null;
}
async function initializePaystackTransaction({ email, amount, reference, callbackUrl, metadata }) {
  const secret = str(process.env.PAYSTACK_SECRET_KEY);
  if (isPlaceholderConfigValue(secret)) throw new Error("PAYSTACK_SECRET_KEY is missing");

  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({
      email,
      amount,
      reference,
      callback_url: callbackUrl,
      metadata,
      currency: SCHOOL_CURRENCY,
    }),
  });

  const payload = await response.json();
  if (!response.ok || !payload?.status || !payload?.data?.authorization_url) {
    throw new Error(payload?.message || "Failed to initialize payment");
  }

  return {
    authorizationUrl: payload.data.authorization_url,
    accessCode: payload.data.access_code,
  };
}

async function verifyPaystackTransaction(reference) {
  const secret = str(process.env.PAYSTACK_SECRET_KEY);
  if (isPlaceholderConfigValue(secret)) throw new Error("PAYSTACK_SECRET_KEY is missing");

  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });

  const payload = await response.json();
  if (!response.ok || !payload?.status) {
    throw new Error(payload?.message || "Failed to verify payment");
  }

  return payload?.data || {};
}

function sha512Hex(value) {
  return crypto.createHash("sha512").update(str(value), "utf8").digest("hex");
}

function parseRemitaPayload(rawText) {
  const raw = str(rawText).trim();
  if (!raw) return {};

  const stripJsonp = (value) =>
    String(value || "")
      .trim()
      .replace(/^jsonp\s*\(/i, "")
      .replace(/\)\s*;?\s*$/, "");

  const attempts = [raw, stripJsonp(raw)];

  for (const candidate of attempts) {
    if (!candidate) continue;

    try {
      const parsed = JSON.parse(candidate);
      if (Array.isArray(parsed)) return parsed[0] || {};
      if (parsed && typeof parsed === "object") return parsed;
    } catch (_) {
      const firstBrace = candidate.indexOf("{");
      const lastBrace = candidate.lastIndexOf("}");
      if (firstBrace >= 0 && lastBrace > firstBrace) {
        const segment = candidate.slice(firstBrace, lastBrace + 1);
        try {
          const parsed = JSON.parse(segment);
          if (Array.isArray(parsed)) return parsed[0] || {};
          if (parsed && typeof parsed === "object") return parsed;
        } catch (_inner) {
          // Continue with next attempt.
        }
      }
    }
  }

  return { raw };
}

function getRemitaConfig() {
  const responseUrl = str(process.env.REMITA_RESPONSE_URL) || str(process.env.PAYMENT_CALLBACK_URL);
  return {
    merchantId: str(process.env.REMITA_MERCHANT_ID),
    serviceTypeId: str(process.env.REMITA_SERVICE_TYPE_ID),
    apiKey: str(process.env.REMITA_API_KEY),
    initUrl:
      str(process.env.REMITA_INIT_URL) ||
      "https://login.remita.net/remita/exapp/api/v1/send/api/echannelsvc/merchant/api/paymentinit",
    checkoutUrl:
      str(process.env.REMITA_CHECKOUT_URL) ||
      "https://login.remita.net/remita/ecomm/finalize.reg",
    statusUrlBase:
      str(process.env.REMITA_STATUS_URL_BASE) ||
      "https://login.remita.net/remita/exapp/api/v1/send/api/echannelsvc",
    responseUrl,
  };
}

function ensureRemitaConfig(config) {
  const missing = [];
  if (isPlaceholderConfigValue(config.merchantId)) missing.push("REMITA_MERCHANT_ID");
  if (isPlaceholderConfigValue(config.serviceTypeId)) missing.push("REMITA_SERVICE_TYPE_ID");
  if (isPlaceholderConfigValue(config.apiKey)) missing.push("REMITA_API_KEY");
  if (isPlaceholderConfigValue(config.responseUrl)) missing.push("REMITA_RESPONSE_URL or PAYMENT_CALLBACK_URL");

  if (missing.length > 0) {
    throw new Error(`Remita configuration is incomplete: ${missing.join(", ")}`);
  }
}

function toRemitaAmount(amount) {
  return normalizeMoney(amount).toFixed(2);
}

async function initializeRemitaTransaction({ reference, amount, callbackUrl, payerName, payerEmail, payerPhone, description }) {
  const config = getRemitaConfig();
  ensureRemitaConfig(config);

  const orderId = str(reference);
  if (!orderId) throw new Error("Payment reference is required for Remita initialization");

  const effectiveCallbackUrl = str(callbackUrl) || config.responseUrl;
  const requestPayload = {
    serviceTypeId: config.serviceTypeId,
    amount: toRemitaAmount(amount),
    orderId,
    payerName: str(payerName) || "School Parent/Applicant",
    payerEmail: str(payerEmail) || "noreply@angelmontessori.local",
    payerPhone: str(payerPhone) || "08000000000",
    description: str(description) || "School fee payment",
  };

  const apiHash = sha512Hex(`${orderId}${config.apiKey}${config.merchantId}`);
  const authorization = `remitaConsumerKey=${config.merchantId},remitaConsumerToken=${apiHash}`;

  const response = await fetch(config.initUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authorization,
    },
    body: JSON.stringify(requestPayload),
  });

  const rawText = await response.text();
  const payload = parseRemitaPayload(rawText);
  const rrr = str(payload.RRR || payload.rrr || payload.paymentReference || payload.remitaRetrievalReference);
  const statusCode = str(payload.statuscode || payload.statusCode || payload.status);
  const statusMessage = str(payload.status || payload.message || payload.statusMessage);

  if (!response.ok || !rrr) {
    const hint = statusCode || statusMessage || "Failed to initialize Remita payment";
    throw new Error(`Remita initialization failed: ${hint}`);
  }

  // Remita finalize request uses a hash built from rrr + apiKey + merchantId.
  const checkoutHash = sha512Hex(`${rrr}${config.apiKey}${config.merchantId}`);
  const params = new URLSearchParams({
    merchantId: config.merchantId,
    rrr,
    responseurl: effectiveCallbackUrl,
    hash: checkoutHash,
  });

  return {
    authorizationUrl: `${config.checkoutUrl}?${params.toString()}`,
    gatewayReference: rrr,
    initPayload: payload,
  };
}

async function verifyRemitaTransaction(payment) {
  const config = getRemitaConfig();
  ensureRemitaConfig(config);

  const rrr = str(payment?.gatewayReference || payment?.gatewayPayload?.rrr || payment?.paymentReference || payment?.reference);
  if (!rrr) throw new Error("No Remita retrieval reference was found for this payment");

  const hash = sha512Hex(`${rrr}${config.apiKey}${config.merchantId}`);
  const statusBase = str(config.statusUrlBase).replace(/\/+$/, "");
  const statusUrl = `${statusBase}/${encodeURIComponent(config.merchantId)}/${encodeURIComponent(rrr)}/${hash}/status.reg`;

  const response = await fetch(statusUrl, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  const rawText = await response.text();
  const payload = parseRemitaPayload(rawText);

  const rawCode = str(payload.status || payload.statuscode || payload.statusCode || payload.paymentState).toUpperCase();
  const message = str(payload.message || payload.statusMessage).toUpperCase();

  const successCodes = new Set(["00", "01", "SUCCESS", "SUCCESSFUL", "APPROVED", "COMPLETED"]);
  const pendingCodes = new Set(["025", "PENDING", "IN_PROGRESS", "PROCESSING", "INITIATED"]);

  let status = "failed";
  if (successCodes.has(rawCode) || message.includes("SUCCESS") || message.includes("APPROVED")) {
    status = "success";
  } else if (pendingCodes.has(rawCode) || message.includes("PENDING") || message.includes("PROCESSING")) {
    status = "pending";
  }

  return {
    status,
    reference: rrr,
    code: rawCode,
    message: str(payload.message || payload.statusMessage),
    raw: payload,
    httpStatus: response.status,
  };
}

function paymentToAdminRow(db, payment) {
  const user = (db.users || []).find((u) => str(u.id) === str(payment.userId));
  const invoice = (db.invoices || []).find((inv) => str(inv.id) === str(payment.invoiceId));
  const projection = invoice ? buildInvoiceProjection(db, invoice) : null;

  return {
    ...payment,
    reference: str(payment.paymentReference || payment.reference),
    userName: str(user?.name),
    username: str(user?.username),
    studentName: str(projection?.studentName),
    className: str(projection?.className),
    invoiceLabel: str(projection?.invoiceNumber),
    sessionId: str(projection?.sessionId || invoice?.sessionId || payment.sessionId),
    termId: str(projection?.termId || invoice?.termId || payment.termId),
    session: str(projection?.sessionName),
    term: str(projection?.termName),
  };
}

function buildAdminRows(db) {
  return (db.payments || []).map((payment) => paymentToAdminRow(db, payment));
}

function parseDateParam(value) {
  const text = str(value);
  if (!text) return null;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function filterAdminRows(rows, query) {
  const status = str(query.status).toUpperCase();
  const type = str(query.type).toUpperCase();
  const role = str(query.role).toUpperCase();
  const className = str(query.className).toLowerCase();
  const sessionId = str(query.sessionId);
  const termId = str(query.termId);
  const search = str(query.search).toLowerCase();
  const from = parseDateParam(query.from);
  const to = parseDateParam(query.to);

  return rows.filter((row) => {
    if ((!status || status === "ALL") && str(row.status).toUpperCase() === "CANCELLED") return false;
    if (status && status !== "ALL" && str(row.status).toUpperCase() !== status) return false;
    if (type && type !== "ALL" && str(row.type).toUpperCase() !== type) return false;
    if (role && role !== "ALL" && str(row.role).toUpperCase() !== role) return false;
    if (className && !str(row.className).toLowerCase().includes(className)) return false;
    if (sessionId && str(row.sessionId) !== sessionId) return false;
    if (termId && str(row.termId) !== termId) return false;

    const createdAt = new Date(row.createdAt || 0);
    if (from && createdAt < from) return false;
    if (to) {
      const toInclusive = new Date(to);
      toInclusive.setHours(23, 59, 59, 999);
      if (createdAt > toInclusive) return false;
    }

    if (search) {
      const hay = [
        row.reference,
        row.userName,
        row.username,
        row.studentName,
        row.className,
        row.invoiceLabel,
        row.type,
        row.status,
      ]
        .map((item) => str(item).toLowerCase())
        .join(" | ");

      if (!hay.includes(search)) return false;
    }

    return true;
  });
}

function escapeCsvValue(value) {
  const raw = String(value ?? "");
  if (!/[",\n]/.test(raw)) return raw;
  return '"' + raw.replace(/"/g, '""') + '"';
}

function verifyPaystackWebhookSignature(req) {
  const secret = str(process.env.PAYSTACK_SECRET_KEY);
  if (isPlaceholderConfigValue(secret)) return { ok: false, status: 503, message: "Paystack secret key is not configured" };

  const provided = str(req.headers["x-paystack-signature"]);
  if (!provided) return { ok: false, status: 401, message: "Missing webhook signature" };

  const rawBody = Buffer.isBuffer(req.rawBody)
    ? req.rawBody
    : Buffer.from(JSON.stringify(req.body || {}));

  const expected = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  const providedBuf = Buffer.from(provided, "utf8");
  const expectedBuf = Buffer.from(expected, "utf8");

  if (providedBuf.length !== expectedBuf.length) {
    return { ok: false, status: 401, message: "Invalid webhook signature" };
  }

  const match = crypto.timingSafeEqual(providedBuf, expectedBuf);
  if (!match) return { ok: false, status: 401, message: "Invalid webhook signature" };

  return { ok: true };
}

function isPaystackChargeSuccessful(payload) {
  const event = str(payload?.event).toLowerCase();
  const status = str(payload?.data?.status).toLowerCase();
  return event === "charge.success" || status === "success";
}

function isPaystackChargeFailed(payload) {
  const event = str(payload?.event).toLowerCase();
  const status = str(payload?.data?.status).toLowerCase();
  return event === "charge.failed" || status === "failed";
}

function validateWebhookAmountCurrency(payment, payloadData) {
  const expectedAmountKobo = Math.round(Number(payment.amount || 0) * 100);
  const paidAmountKobo = Number(payloadData?.amount || 0);
  const payloadCurrency = str(payloadData?.currency || payment.currency || SCHOOL_CURRENCY).toUpperCase();
  const expectedCurrency = str(payment.currency || SCHOOL_CURRENCY).toUpperCase();

  return {
    amountMatch: expectedAmountKobo <= 0 || paidAmountKobo <= 0 || expectedAmountKobo === paidAmountKobo,
    currencyMatch: !payloadCurrency || !expectedCurrency || payloadCurrency === expectedCurrency,
  };
}

function isAuthorizedToPayment(payment, user) {
  if (!payment || !user) return false;
  if (user.role === "ADMIN") return true;
  return str(payment.userId) === str(user.id);
}
router.get("/parent/summary", auth(), requireRole("PARENT"), (req, res) => {
  const db = readDB();
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });

  const summary = buildParentInvoiceSummary(db, req.user);
  writeDB(db);

  return res.json({
    ...getPaymentProviderMeta(db),
    currency: SCHOOL_CURRENCY,
    invoices: summary.invoices,
  });
});

router.post("/parent/initialize", auth(), requireRole("PARENT"), async (req, res) => {
  const { invoiceId, amount } = req.body || {};
  if (!str(invoiceId)) return res.status(400).json({ message: "invoiceId is required" });

  const db = readDB();
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });

  const summary = buildParentInvoiceSummary(db, req.user);
  const invoice = summary.invoices.find((item) => str(item.id) === str(invoiceId));
  if (!invoice) return res.status(404).json({ message: "Invoice not found for this parent" });
  if (Number(invoice.balance || 0) <= 0) return res.status(400).json({ message: "Invoice is already fully paid" });

  const requestedAmount = amount === undefined || amount === null || str(amount) === ""
    ? Number(invoice.balance)
    : normalizeMoney(amount);

  if (requestedAmount <= 0) return res.status(400).json({ message: "Payment amount must be greater than zero" });
  if (requestedAmount > Number(invoice.balance || 0)) {
    return res.status(400).json({ message: "Payment amount cannot exceed invoice balance" });
  }

  const providerError = validateRequestedProvider(req.body?.provider, db);
  if (providerError) {
    return res.status(400).json({ message: providerError });
  }
  const provider = resolveProvider(req.body?.provider, db);
  if (!provider) {
    return res.status(503).json({ message: "Online payment is not configured yet. Please contact the school office." });
  }
  const reference = createReference("FEE");
  const now = nowIso();

  const payment = {
    id: nanoid(),
    paymentReference: reference,
    reference,
    provider,
    gatewayName: provider,
    type: "STUDENT_FEE",
    userId: req.user.id,
    role: str(req.user.role).toUpperCase(),
    invoiceId: invoice.id,
    studentId: invoice.studentId,
    amount: requestedAmount,
    currency: SCHOOL_CURRENCY,
    paymentMethod: "ONLINE",
    status: "PENDING",
    authorizationUrl: "",
    gatewayReference: "",
    rawResponse: {},
    gatewayPayload: {},
    createdAt: now,
    updatedAt: now,
    paidAt: "",
    verifiedAt: "",
  };

  if (provider === "PAYSTACK") {
    try {
      const callbackUrl = resolvePaymentCallbackUrl("parent");
      const email = `${str(req.user.username).replace(/[^a-z0-9._-]/gi, "") || "parent"}@angelmontessori.local`;
      const init = await initializePaystackTransaction({
        email,
        amount: Math.round(payment.amount * 100),
        reference,
        callbackUrl,
        metadata: {
          paymentType: payment.type,
          invoiceId: payment.invoiceId,
          studentId: payment.studentId,
          userId: payment.userId,
        },
      });

      payment.authorizationUrl = init.authorizationUrl;
      payment.gatewayPayload = { accessCode: init.accessCode };
    } catch (error) {
      return res.status(502).json({ message: error.message || "Payment initialization failed" });
    }
  } else if (provider === "REMITA") {
    try {
      const callbackUrl = resolveRemitaCallbackUrl("parent");
      const email = `${str(req.user.username).replace(/[^a-z0-9._-]/gi, "") || "parent"}@angelmontessori.local`;

      const init = await initializeRemitaTransaction({
        reference,
        amount: payment.amount,
        callbackUrl,
        payerName: str(req.user.name) || str(req.user.username) || "Parent",
        payerEmail: email,
        payerPhone: str(req.user.phone) || "08000000000",
        description: `School fee payment (${str(invoice.invoiceNumber || invoice.id || payment.invoiceId)})`,
      });

      payment.authorizationUrl = init.authorizationUrl;
      payment.gatewayReference = init.gatewayReference;
      payment.gatewayPayload = {
        rrr: init.gatewayReference,
        init: init.initPayload,
      };
    } catch (error) {
      return res.status(502).json({ message: error.message || "Payment initialization failed" });
    }
  }

  db.payments.unshift(payment);
  createPaymentLog(db, {
    invoiceId: payment.invoiceId,
    paymentId: payment.id,
    action: "payment_initialized",
    performedBy: payment.userId,
    notes: `Initialized payment ${payment.paymentReference}`,
  });

  writeDB(db);

  return res.status(201).json({
    reference: payment.paymentReference,
    provider: payment.provider,
    amount: payment.amount,
    currency: payment.currency,
    authorizationUrl: payment.authorizationUrl,
    status: payment.status,
  });
});

router.get("/applicant/summary", auth(), requireRole("APPLICANT"), (req, res) => {
  const db = readDB();
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });

  const paid = hasSuccessfulApplicationFeePayment(db, req.user.id);
  const pending = (db.payments || [])
    .filter(
      (item) =>
        str(item.userId) === str(req.user.id) &&
        str(item.type).toUpperCase() === "APPLICATION_FEE" &&
        normalizePaymentStatus(item.status) === "PENDING"
    )
    .sort((a, b) => str(b.createdAt).localeCompare(str(a.createdAt)))[0] || null;

  return res.json({
    ...getPaymentProviderMeta(db),
    paid,
    amount: DEFAULT_APPLICATION_FEE,
    currency: SCHOOL_CURRENCY,
    pendingReference: pending ? str(pending.paymentReference || pending.reference) : "",
    pendingAuthorizationUrl: pending ? str(pending.authorizationUrl) : "",
  });
});

router.post("/applicant/initialize", auth(), requireRole("APPLICANT"), async (req, res) => {
  const db = readDB();
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });

  if (hasSuccessfulApplicationFeePayment(db, req.user.id)) {
    return res.status(409).json({ message: "Application fee already paid" });
  }

  const providerError = validateRequestedProvider(req.body?.provider, db);
  if (providerError) {
    return res.status(400).json({ message: providerError });
  }
  const provider = resolveProvider(req.body?.provider, db);
  if (!provider) {
    return res.status(503).json({ message: "Online payment is not configured yet. Please contact the school office." });
  }
  const reference = createReference("APP");
  const now = nowIso();

  const payment = {
    id: nanoid(),
    paymentReference: reference,
    reference,
    provider,
    gatewayName: provider,
    type: "APPLICATION_FEE",
    userId: req.user.id,
    role: str(req.user.role).toUpperCase(),
    invoiceId: "",
    studentId: "",
    amount: DEFAULT_APPLICATION_FEE,
    currency: SCHOOL_CURRENCY,
    paymentMethod: "ONLINE",
    status: "PENDING",
    authorizationUrl: "",
    gatewayReference: "",
    rawResponse: {},
    gatewayPayload: {},
    createdAt: now,
    updatedAt: now,
    paidAt: "",
    verifiedAt: "",
  };

  if (provider === "PAYSTACK") {
    try {
      const callbackUrl = resolvePaymentCallbackUrl("applicant");
      const email = `${str(req.user.username).replace(/[^a-z0-9._-]/gi, "") || "applicant"}@angelmontessori.local`;
      const init = await initializePaystackTransaction({
        email,
        amount: Math.round(payment.amount * 100),
        reference,
        callbackUrl,
        metadata: {
          paymentType: payment.type,
          userId: payment.userId,
        },
      });

      payment.authorizationUrl = init.authorizationUrl;
      payment.gatewayPayload = { accessCode: init.accessCode };
    } catch (error) {
      return res.status(502).json({ message: error.message || "Payment initialization failed" });
    }
  } else if (provider === "REMITA") {
    try {
      const callbackUrl = resolveRemitaCallbackUrl("applicant");
      const email = `${str(req.user.username).replace(/[^a-z0-9._-]/gi, "") || "applicant"}@angelmontessori.local`;

      const init = await initializeRemitaTransaction({
        reference,
        amount: payment.amount,
        callbackUrl,
        payerName: str(req.user.name) || str(req.user.username) || "Applicant",
        payerEmail: email,
        payerPhone: str(req.user.phone) || "08000000000",
        description: "Application fee payment",
      });

      payment.authorizationUrl = init.authorizationUrl;
      payment.gatewayReference = init.gatewayReference;
      payment.gatewayPayload = {
        rrr: init.gatewayReference,
        init: init.initPayload,
      };
    } catch (error) {
      return res.status(502).json({ message: error.message || "Payment initialization failed" });
    }
  }

  db.payments.unshift(payment);
  writeDB(db);

  return res.status(201).json({
    reference: payment.paymentReference,
    provider: payment.provider,
    amount: payment.amount,
    currency: payment.currency,
    authorizationUrl: payment.authorizationUrl,
    status: payment.status,
  });
});

function getLatestApplicantAdmission(db, userId) {
  const admissions = Array.isArray(db.admissions) ? db.admissions : [];
  return admissions
    .filter((item) => str(item.applicantUserId) === str(userId))
    .sort((a, b) => str(b.updatedAt).localeCompare(str(a.updatedAt)))[0] || null;
}

function getAcceptanceFeeAmount(db, application) {
  const sessions = Array.isArray(db.admissionSessions) ? db.admissionSessions : [];
  const session = sessions.find((item) => str(item.id) === str(application?.sessionId)) || null;
  const fallback = Number(process.env.ADMISSION_ACCEPTANCE_FEE_DEFAULT || 25000);
  return normalizeMoney(session?.acceptanceFee || fallback);
}

function hasSuccessfulAcceptanceFeePayment(db, userId) {
  return (db.payments || []).some(
    (item) =>
      str(item.userId) === str(userId) &&
      str(item.type).toUpperCase() === "ACCEPTANCE_FEE" &&
      normalizePaymentStatus(item.status) === "SUCCESS"
  );
}

router.get("/applicant/acceptance/summary", auth(), requireRole("APPLICANT"), (req, res) => {
  const db = readDB();
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });

  const application = getLatestApplicantAdmission(db, req.user.id);
  if (!application) {
    return res.status(404).json({ message: "Admission application not found" });
  }

  const eligible = ["ADMITTED", "ENROLLED"].includes(str(application.status).toUpperCase());
  const paid = Boolean(application.acceptanceFeePaid || hasSuccessfulAcceptanceFeePayment(db, req.user.id));
  const pending = (db.payments || [])
    .filter(
      (item) =>
        str(item.userId) === str(req.user.id) &&
        str(item.type).toUpperCase() === "ACCEPTANCE_FEE" &&
        normalizePaymentStatus(item.status) === "PENDING"
    )
    .sort((a, b) => str(b.createdAt).localeCompare(str(a.createdAt)))[0] || null;

  return res.json({
    ...getPaymentProviderMeta(db),
    eligible,
    paid,
    amount: getAcceptanceFeeAmount(db, application),
    currency: SCHOOL_CURRENCY,
    status: str(application.status),
    pendingReference: pending ? str(pending.paymentReference || pending.reference) : "",
    pendingAuthorizationUrl: pending ? str(pending.authorizationUrl) : "",
  });
});

router.post("/applicant/acceptance/initialize", auth(), requireRole("APPLICANT"), async (req, res) => {
  const db = readDB();
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });

  const application = getLatestApplicantAdmission(db, req.user.id);
  if (!application) {
    return res.status(404).json({ message: "Admission application not found" });
  }

  if (!["ADMITTED", "ENROLLED"].includes(str(application.status).toUpperCase())) {
    return res.status(409).json({ message: "Acceptance fee is only available for admitted applicants." });
  }

  if (Boolean(application.acceptanceFeePaid) || hasSuccessfulAcceptanceFeePayment(db, req.user.id)) {
    return res.status(409).json({ message: "Acceptance fee already paid" });
  }

  const providerError = validateRequestedProvider(req.body?.provider, db);
  if (providerError) {
    return res.status(400).json({ message: providerError });
  }
  const provider = resolveProvider(req.body?.provider, db);
  if (!provider) {
    return res.status(503).json({ message: "Online payment is not configured yet. Please contact the school office." });
  }
  const reference = createReference("ACPT");
  const now = nowIso();

  const payment = {
    id: nanoid(),
    paymentReference: reference,
    reference,
    provider,
    gatewayName: provider,
    type: "ACCEPTANCE_FEE",
    userId: req.user.id,
    role: str(req.user.role).toUpperCase(),
    invoiceId: "",
    studentId: "",
    amount: getAcceptanceFeeAmount(db, application),
    currency: SCHOOL_CURRENCY,
    paymentMethod: "ONLINE",
    status: "PENDING",
    authorizationUrl: "",
    gatewayReference: "",
    rawResponse: {},
    gatewayPayload: {},
    createdAt: now,
    updatedAt: now,
    paidAt: "",
    verifiedAt: "",
  };

  if (provider === "PAYSTACK") {
    try {
      const callbackUrl = resolvePaymentCallbackUrl("applicant");
      const email = `${str(req.user.username).replace(/[^a-z0-9._-]/gi, "") || "applicant"}@angelmontessori.local`;
      const init = await initializePaystackTransaction({
        email,
        amount: Math.round(payment.amount * 100),
        reference,
        callbackUrl,
        metadata: {
          paymentType: payment.type,
          userId: payment.userId,
          sessionId: str(application.sessionId),
          applicationNo: str(application.applicationNo),
        },
      });

      payment.authorizationUrl = init.authorizationUrl;
      payment.gatewayPayload = { accessCode: init.accessCode };
    } catch (error) {
      return res.status(502).json({ message: error.message || "Payment initialization failed" });
    }
  } else if (provider === "REMITA") {
    try {
      const callbackUrl = resolveRemitaCallbackUrl("applicant");
      const email = `${str(req.user.username).replace(/[^a-z0-9._-]/gi, "") || "applicant"}@angelmontessori.local`;

      const init = await initializeRemitaTransaction({
        reference,
        amount: payment.amount,
        callbackUrl,
        payerName: str(req.user.name) || str(req.user.username) || "Applicant",
        payerEmail: email,
        payerPhone: str(req.user.phone) || "08000000000",
        description: "Acceptance fee payment",
      });

      payment.authorizationUrl = init.authorizationUrl;
      payment.gatewayReference = init.gatewayReference;
      payment.gatewayPayload = {
        rrr: init.gatewayReference,
        init: init.initPayload,
      };
    } catch (error) {
      return res.status(502).json({ message: error.message || "Payment initialization failed" });
    }
  }

  db.payments.unshift(payment);
  writeDB(db);

  return res.status(201).json({
    reference: payment.paymentReference,
    provider: payment.provider,
    amount: payment.amount,
    currency: payment.currency,
    authorizationUrl: payment.authorizationUrl,
    status: payment.status,
  });
});
router.post("/verify", auth(), requireRole("ADMIN", "PARENT", "APPLICANT"), async (req, res) => {
  const { reference } = req.body || {};
  const safeReference = str(reference);
  if (!safeReference) return res.status(400).json({ message: "reference is required" });

  const db = readDB();
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });

  const idx = (db.payments || []).findIndex((item) => str(item.paymentReference || item.reference) === safeReference);
  if (idx < 0) return res.status(404).json({ message: "Payment not found" });

  const current = db.payments[idx];
  if (!isAuthorizedToPayment(current, req.user)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  if (normalizePaymentStatus(current.status) === "SUCCESS") {
    return res.json({ payment: current, status: "SUCCESS" });
  }

  let nextStatus = "FAILED";
  let gatewayData = {};
  let verificationIssue = "";
  let paystackValidation = null;
  const provider = str(current.provider).toUpperCase();

  if (provider === "PAYSTACK") {
    try {
      gatewayData = await verifyPaystackTransaction(str(current.paymentReference || current.reference));
      if (str(gatewayData.status).toLowerCase() === "success") {
        paystackValidation = validateWebhookAmountCurrency(current, gatewayData);
        if (paystackValidation.amountMatch && paystackValidation.currencyMatch) {
          nextStatus = "SUCCESS";
        } else {
          const mismatches = [];
          if (!paystackValidation.amountMatch) mismatches.push("amount");
          if (!paystackValidation.currencyMatch) mismatches.push("currency");
          verificationIssue = `Paystack verification mismatch: ${mismatches.join(" and ")}`;
          nextStatus = "FAILED";
        }
      } else {
        nextStatus = "FAILED";
      }
    } catch (error) {
      return res.status(502).json({ message: error.message || "Verification failed" });
    }
  } else if (provider === "REMITA") {
    try {
      gatewayData = await verifyRemitaTransaction(current);
      if (str(gatewayData.status).toLowerCase() === "success") nextStatus = "SUCCESS";
      else if (str(gatewayData.status).toLowerCase() === "pending") nextStatus = "PENDING";
      else nextStatus = "FAILED";
    } catch (error) {
      return res.status(502).json({ message: error.message || "Verification failed" });
    }
  } else {
    nextStatus = "SUCCESS";
    gatewayData = { status: "success", channel: "mock" };
  }

  const now = nowIso();
  db.payments[idx] = {
    ...current,
    status: nextStatus,
    paidAt: nextStatus === "SUCCESS" ? str(current.paidAt) || now : "",
    verifiedAt: now,
    verificationIssue,
    gatewayReference: str(gatewayData?.reference || current.gatewayReference),
    rawResponse: gatewayData,
    gatewayPayload: {
      ...(current.gatewayPayload || {}),
      verify: gatewayData,
      ...(paystackValidation ? { verifyValidation: paystackValidation } : {}),
    },
    updatedAt: now,
  };

  if (nextStatus === "SUCCESS") {
    applyPaymentSuccess(db, db.payments[idx]);
  }

  syncLegacyFeeInvoicesMirror(db);
  writeDB(db);
  const responseBody = { payment: db.payments[idx], status: db.payments[idx].status };
  if (verificationIssue) responseBody.message = verificationIssue;
  return res.status(verificationIssue ? 409 : 200).json(responseBody);
});




function findSessionByInput(db, input) {
  const safe = str(input);
  if (!safe) return null;
  return (db.academicSessions || []).find(
    (row) => str(row.id) === safe || str(row.sessionName).toLowerCase() === safe.toLowerCase()
  ) || null;
}

function findTermByInput(db, input, sessionId = "") {
  const safe = str(input);
  if (!safe) return null;
  return (db.terms || []).find((row) => {
    const sessionMatch = !sessionId || str(row.sessionId) === str(sessionId);
    if (!sessionMatch) return false;
    return str(row.id) === safe || str(row.termName).toLowerCase() === safe.toLowerCase();
  }) || null;
}

function normalizeBulkHeaderKey(value) {
  return str(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function buildBulkValueBag(row) {
  const bag = {};
  for (const [key, value] of Object.entries(row || {})) {
    bag[normalizeBulkHeaderKey(key)] = value;
  }
  return bag;
}

function pickBulkValue(bag, aliases = []) {
  for (const alias of aliases) {
    const key = normalizeBulkHeaderKey(alias);
    const value = bag[key];
    if (value !== undefined && value !== null && str(value)) return str(value);
  }
  return "";
}

function resolveSessionTermForBulkRow(db, bag, defaultSession, defaultTerm) {
  const sessionInput = pickBulkValue(bag, ["Session", "Session_Id", "SessionID", "Academic_Session"]);
  const session = findSessionByInput(db, sessionInput) || defaultSession;
  if (!session) return { session: null, term: null, error: "Unable to resolve session" };

  const termInput = pickBulkValue(bag, ["Term", "Term_Id", "TermID", "Term_Name"]);
  const term =
    findTermByInput(db, termInput, session.id) ||
    (db.terms || []).find((row) => Boolean(row.isActive) && str(row.sessionId) === str(session.id)) ||
    (db.terms || []).find((row) => str(row.sessionId) === str(session.id)) ||
    null;

  if (!term) return { session, term: null, error: "Unable to resolve term" };
  return { session, term, error: "" };
}

function findFeeTypeForBulkRow(db, bag) {
  const feeTypeInput = pickBulkValue(bag, ["Fee_Type_Id", "FeeTypeId", "feeTypeId", "Fee_Type", "FeeType"]);
  const feeCodeInput = pickBulkValue(bag, ["Fee_Code", "FeeCode", "feeCode"]);
  const feeNameInput = pickBulkValue(bag, ["Fee_Name", "FeeName", "Fee", "Fee_Type_Name"]);

  let feeType = (db.feeTypes || []).find((row) => str(row.id) === str(feeTypeInput));
  if (!feeType && feeCodeInput) {
    feeType = (db.feeTypes || []).find((row) => str(row.feeCode).toUpperCase() === str(feeCodeInput).toUpperCase());
  }
  if (!feeType && feeNameInput) {
    feeType = (db.feeTypes || []).find((row) => normalizeClassKey(row.feeName) === normalizeClassKey(feeNameInput));
  }

  return feeType || null;
}

function resolveStudentForBulkRow(db, bag) {
  const studentIdInput = pickBulkValue(bag, ["Student_Id", "StudentID", "studentId", "ID"]);
  const admissionInput = pickBulkValue(bag, ["Admission_No", "AdmissionNo", "admissionNo", "Admission_Number", "AdmissionNumber"]);
  const studentNameInput = pickBulkValue(bag, ["Student_Name", "StudentName", "Full_Name", "FullName", "Name"]);
  const classInput = pickBulkValue(bag, ["Class", "Class_Name", "ClassName", "Class_Id", "ClassID"]);

  if (studentIdInput) {
    const byId = (db.students || []).find((row) => str(row.id) === studentIdInput);
    if (byId) return { student: byId, error: "" };
  }

  if (admissionInput) {
    const byAdmission = (db.students || []).find((row) => {
      return [row.admissionNo, row.admissionNumber, row.registrationNo, row.studentId]
        .map((item) => str(item).toLowerCase())
        .includes(str(admissionInput).toLowerCase());
    });
    if (byAdmission) return { student: byAdmission, error: "" };
  }

  if (!studentNameInput) return { student: null, error: "Student identifier not provided" };

  let candidates = (db.students || []).filter((row) => normalizeClassKey(row.name) === normalizeClassKey(studentNameInput));
  if (classInput) {
    candidates = candidates.filter((row) => {
      const studentClassId = resolveStudentClassId(db, row);
      const byClass = resolveClassIdsFromInput(db, { classId: classInput, className: classInput });
      if (byClass.length > 0) return byClass.includes(studentClassId);
      return normalizeClassKey(row.className) === normalizeClassKey(classInput);
    });
  }

  if (candidates.length === 1) return { student: candidates[0], error: "" };
  if (candidates.length > 1) return { student: null, error: "Multiple students matched name. Add Student_ID or Admission_No." };
  return { student: null, error: "Student not found" };
}
function ensureTermsForSession(db, sessionId) {
  const safeSessionId = str(sessionId);
  if (!safeSessionId) return;

  const defaults = ["First Term", "Second Term", "Third Term"];
  for (const name of defaults) {
    const exists = (db.terms || []).some(
      (row) => str(row.sessionId) === safeSessionId && str(row.termName).toLowerCase() === name.toLowerCase()
    );

    if (!exists) {
      db.terms.unshift({
        id: nanoid(),
        sessionId: safeSessionId,
        termName: name,
        isActive: false,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
    }
  }
}

function toSessionPayload(row) {
  return {
    id: str(row.id),
    sessionName: str(row.sessionName),
    startDate: str(row.startDate),
    endDate: str(row.endDate),
    isActive: Boolean(row.isActive),
    createdAt: str(row.createdAt),
    updatedAt: str(row.updatedAt),
  };
}

function toTermPayload(row) {
  return {
    id: str(row.id),
    sessionId: str(row.sessionId),
    termName: str(row.termName),
    startDate: str(row.startDate),
    endDate: str(row.endDate),
    isActive: Boolean(row.isActive),
    createdAt: str(row.createdAt),
    updatedAt: str(row.updatedAt),
  };
}

function reassignFinanceTermRecords(db, payload = {}) {
  const fromTermId = str(payload.fromTermId);
  const fromSessionId = str(payload.fromSessionId);
  const toTermId = str(payload.toTermId);
  const toSessionId = str(payload.toSessionId);
  const updateInvoiceSnapshots = payload.updateInvoiceSnapshots !== false;
  let touched = 0;

  const scopedCollections = [
    "feeStructures",
    "studentFeeAssignments",
    "financeStudentFees",
    "financePayments",
    "financeTransactions",
    "financeExpenses",
    "financePurchases",
    "financeSalaryPayments",
    "financeIncome",
    "financeBudgets",
    "financialReports",
  ];

  for (const key of scopedCollections) {
    db[key] = Array.isArray(db[key]) ? db[key] : [];
    for (const row of db[key]) {
      if (str(row.termId) !== fromTermId) continue;
      if (fromSessionId && str(row.sessionId) !== fromSessionId) continue;
      row.termId = toTermId;
      row.sessionId = toSessionId;
      if ("updatedAt" in row) row.updatedAt = nowIso();
      touched += 1;
    }
  }

  for (const invoice of db.invoices || []) {
    if (str(invoice.termId) !== fromTermId) continue;
    if (fromSessionId && str(invoice.sessionId) !== fromSessionId) continue;
    invoice.termId = toTermId;
    invoice.sessionId = toSessionId;
    if (updateInvoiceSnapshots) {
      invoice.sessionNameSnapshot = str(payload.sessionName);
      invoice.termNameSnapshot = str(payload.termName);
    }
    invoice.updatedAt = nowIso();
    touched += 1;
  }

  return touched;
}

function setCurrentFinanceScope(db, sessionId, termId) {
  setActiveAcademicScope(db, sessionId, termId);
}

function buildFinanceSetupPayload(db) {
  ensureClassCatalog(db);
  ensureGatewaySettings(db);
  const { activeSession, activeTerm } = getActiveSessionTerm(db);
  const providerMeta = getPaymentProviderMeta(db);

  return {
    ...providerMeta,
    currency: SCHOOL_CURRENCY,
    defaultSchoolFee: DEFAULT_SCHOOL_FEE,
    applicationFee: DEFAULT_APPLICATION_FEE,
    activeSessionId: str(activeSession?.id),
    activeTermId: str(activeTerm?.id),
    sessions: (db.academicSessions || []).map((row) => ({
      id: str(row.id),
      sessionName: str(row.sessionName),
      startDate: str(row.startDate),
      endDate: str(row.endDate),
      isActive: Boolean(row.isActive),
    })),
    terms: (db.terms || []).map((row) => ({
      id: str(row.id),
      sessionId: str(row.sessionId),
      termName: str(row.termName),
      startDate: str(row.startDate),
      endDate: str(row.endDate),
      isActive: Boolean(row.isActive),
    })),
    sections: (db.financeSections || []).map((row) => ({
      id: str(row.id),
      sectionName: str(row.sectionName || row.name),
      name: str(row.name || row.sectionName),
      order: Number(row.order || 999),
      isActive: row.isActive === undefined ? true : normalizeBool(row.isActive),
    })),
    classes: sortAcademicClasses((db.classes || []).filter((row) => row.isActive !== false)).map((row) => ({
      id: str(row.id),
      name: str(row.name),
      section: str(row.section),
      sectionId: str(row.sectionId),
      order: Number(row.order || 999),
      academicSystem: str(row.academicSystem),
      curriculumFramework: str(row.curriculumFramework),
      assessmentFramework: str(row.assessmentFramework),
    })),
    feeCategories: FEE_CATEGORIES,
    feeTypes: (db.feeTypes || []).map((row) => ({
      id: str(row.id),
      feeName: str(row.feeName),
      feeCode: str(row.feeCode),
      category: normalizeFeeCategory(row.category),
      isRecurring: Boolean(row.isRecurring),
    })),
  };
}

function resolveClassIdsFromInput(db, payload = {}) {
  ensureClassCatalog(db);
  const classIds = new Set();

  const direct = [];
  if (Array.isArray(payload.classIds)) direct.push(...payload.classIds);
  if (payload.classId !== undefined) direct.push(payload.classId);

  for (const item of direct) {
    const safe = str(item);
    if (!safe) continue;

    const byId = (db.classes || []).find((row) => str(row.id) === safe);
    if (byId) {
      classIds.add(str(byId.id));
      continue;
    }

    const byName = (db.classes || []).find((row) => normalizeClassKey(row.name) === normalizeClassKey(safe));
    if (byName) classIds.add(str(byName.id));
  }

  if (classIds.size === 0 && str(payload.className)) {
    const byName = (db.classes || []).find((row) => normalizeClassKey(row.name) === normalizeClassKey(payload.className));
    if (byName) classIds.add(str(byName.id));
  }

  return Array.from(classIds.values());
}

function recalcAllInvoices(db) {
  const invoices = (Array.isArray(db.invoices) ? db.invoices : [])
    .filter((row) => str(row.status).toUpperCase() !== "CANCELLED");
  for (const row of invoices) {
    recalcInvoiceAmounts(db, row.id);
  }
}

function toInvoiceAdminRow(db, invoice) {
  const session = (db.academicSessions || []).find((row) => str(row.id) === str(invoice.sessionId));
  const term = (db.terms || []).find((row) => str(row.id) === str(invoice.termId));
  const student = (db.students || []).find((row) => str(row.id) === str(invoice.studentId));
  const classId = resolveStudentClassId(db, student || {});
  const cls = (db.classes || []).find((row) => str(row.id) === classId);
  const snapshotClassId = str(invoice.classIdSnapshot || cls?.id);

  const items = (db.invoiceItems || [])
    .filter((item) => str(item.invoiceId) === str(invoice.id))
    .map((item) => {
      const feeType = (db.feeTypes || []).find((row) => str(row.id) === str(item.feeTypeId));
      return {
        id: str(item.id),
        feeTypeId: str(item.feeTypeId),
        feeName: str(item.feeNameSnapshot || feeType?.feeName),
        feeCode: str(item.feeCodeSnapshot || feeType?.feeCode),
        feeCategory: normalizeFeeCategory(item.feeCategorySnapshot || feeType?.category),
        structureType: normalizeStructureType(item.structureTypeSnapshot, item.isOptional),
        description: str(item.description),
        originalAmount: normalizeMoney(item.originalAmount || item.amount),
        amount: normalizeMoney(item.amount),
      };
    });

  return {
    ...invoice,
    id: str(invoice.id),
    invoiceNumber: str(invoice.invoiceNumber),
    studentId: str(invoice.studentId),
    studentName: str(invoice.studentNameSnapshot || student?.name),
    admissionNumber: str(invoice.admissionNumberSnapshot || getStudentAdmissionNumber(student)),
    classId: snapshotClassId,
    className: str(invoice.classNameSnapshot || cls?.name || student?.className),
    sectionId: str(invoice.sectionIdSnapshot || cls?.sectionId),
    sectionName: str(invoice.sectionNameSnapshot || cls?.section),
    sessionId: str(invoice.sessionId),
    sessionName: str(invoice.sessionNameSnapshot || session?.sessionName),
    termId: str(invoice.termId),
    termName: str(invoice.termNameSnapshot || term?.termName),
    status: str(invoice.status),
    totalAmount: normalizeMoney(invoice.totalAmount),
    amountPaid: normalizeMoney(invoice.amountPaid),
    balance: normalizeMoney(invoice.balance),
    dueDate: str(invoice.dueDate),
    items,
  };
}

function filterInvoices(rows, query = {}) {
  const status = str(query.status).toUpperCase();
  const classId = str(query.classId);
  const sectionId = str(query.sectionId);
  const sessionId = str(query.sessionId);
  const termId = str(query.termId);
  const search = str(query.search).toLowerCase();

  return rows.filter((row) => {
    if ((!status || status === "ALL") && str(row.status).toUpperCase() === "CANCELLED") return false;
    if (status && status !== "ALL" && str(row.status).toUpperCase() !== status) return false;
    if (classId && str(row.classId) !== classId) return false;
    if (sectionId && str(row.sectionId) !== sectionId) return false;
    if (sessionId && str(row.sessionId) !== sessionId) return false;
    if (termId && str(row.termId) !== termId) return false;

    if (search) {
      const hay = [row.invoiceNumber, row.studentName, row.className, row.sessionName, row.termName]
        .map((item) => str(item).toLowerCase())
        .join(" | ");
      if (!hay.includes(search)) return false;
    }

    return true;
  });
}

function resolveAdminFinanceScope(db, query = {}) {
  const { activeSession, activeTerm } = getActiveSessionTerm(db);
  const requestedSession = str(query.sessionId || query.sessionName);
  const session = requestedSession ? findSessionByInput(db, requestedSession) : activeSession;
  const safeSession = session || activeSession || null;
  const requestedTerm = str(query.termId || query.termName);
  const term = requestedTerm
    ? findTermByInput(db, requestedTerm, safeSession?.id)
    : (
      safeSession && str(activeTerm?.sessionId) === str(safeSession.id)
        ? activeTerm
        : (db.terms || []).find((row) => str(row.sessionId) === str(safeSession?.id) && Boolean(row.isActive)) ||
          (db.terms || []).find((row) => str(row.sessionId) === str(safeSession?.id)) ||
          null
    );

  return {
    session: safeSession,
    term: term || null,
    sessionId: str(safeSession?.id),
    termId: str(term?.id),
  };
}

function withDefaultAdminFinanceScope(db, query = {}) {
  const scope = resolveAdminFinanceScope(db, query);
  return {
    ...(query || {}),
    sessionId: scope.sessionId,
    termId: scope.termId,
  };
}

function buildFinanceOverview(db, query = {}) {
  recalcAllInvoices(db);

  const scopedQuery = withDefaultAdminFinanceScope(db, query);
  const invoices = filterInvoices(
    (Array.isArray(db.invoices) ? db.invoices : []).map((row) => toInvoiceAdminRow(db, row)),
    scopedQuery
  );
  const payments = Array.isArray(db.payments) ? db.payments : [];
  const scopedInvoiceIds = new Set(invoices.map((row) => str(row.id)).filter(Boolean));
  const hasScopedInvoiceFilter = Boolean(str(scopedQuery.sessionId) || str(scopedQuery.termId));

  const totalExpected = invoices.reduce((sum, row) => sum + normalizeMoney(row.totalAmount), 0);
  const totalCollected = invoices.reduce((sum, row) => sum + normalizeMoney(row.amountPaid), 0);
  const totalOutstanding = invoices.reduce((sum, row) => sum + normalizeMoney(row.balance), 0);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setHours(23, 59, 59, 999);

  const paymentsToday = payments
    .filter((row) => {
      if (normalizePaymentStatus(row.status) !== "SUCCESS") return false;
      if (hasScopedInvoiceFilter && !scopedInvoiceIds.has(str(row.invoiceId))) return false;
      const paidAt = new Date(str(row.paidAt || row.updatedAt || row.createdAt));
      if (Number.isNaN(paidAt.getTime())) return false;
      return paidAt >= startOfToday && paidAt <= endOfToday;
    })
    .reduce((sum, row) => sum + normalizeMoney(row.amount), 0);

  const overdueInvoices = invoices.filter((row) => str(row.status).toUpperCase() === "OVERDUE").length;

  return {
    sessionId: str(scopedQuery.sessionId),
    termId: str(scopedQuery.termId),
    totalExpected: normalizeMoney(totalExpected),
    totalCollected: normalizeMoney(totalCollected),
    totalOutstanding: normalizeMoney(totalOutstanding),
    paymentsToday: normalizeMoney(paymentsToday),
    overdueInvoices,
  };
}

function buildReportByClass(db, invoices) {
  const out = new Map();

  for (const invoice of invoices) {
    const className = str(invoice.className) || "Unassigned";
    if (!out.has(className)) {
      out.set(className, {
        className,
        totalExpected: 0,
        totalCollected: 0,
        totalOutstanding: 0,
        invoiceCount: 0,
      });
    }

    const row = out.get(className);
    row.totalExpected += normalizeMoney(invoice.totalAmount);
    row.totalCollected += normalizeMoney(invoice.amountPaid);
    row.totalOutstanding += normalizeMoney(invoice.balance);
    row.invoiceCount += 1;
  }

  return Array.from(out.values())
    .map((row) => ({
      ...row,
      totalExpected: normalizeMoney(row.totalExpected),
      totalCollected: normalizeMoney(row.totalCollected),
      totalOutstanding: normalizeMoney(row.totalOutstanding),
    }))
    .sort((a, b) => a.className.localeCompare(b.className));
}

function buildReportByTerm(db, invoices) {
  const out = new Map();

  for (const invoice of invoices) {
    const key = `${str(invoice.sessionName)}::${str(invoice.termName)}`;
    if (!out.has(key)) {
      out.set(key, {
        sessionName: str(invoice.sessionName),
        termName: str(invoice.termName),
        totalExpected: 0,
        totalCollected: 0,
        totalOutstanding: 0,
        invoiceCount: 0,
      });
    }

    const row = out.get(key);
    row.totalExpected += normalizeMoney(invoice.totalAmount);
    row.totalCollected += normalizeMoney(invoice.amountPaid);
    row.totalOutstanding += normalizeMoney(invoice.balance);
    row.invoiceCount += 1;
  }

  return Array.from(out.values())
    .map((row) => ({
      ...row,
      totalExpected: normalizeMoney(row.totalExpected),
      totalCollected: normalizeMoney(row.totalCollected),
      totalOutstanding: normalizeMoney(row.totalOutstanding),
    }))
    .sort((a, b) => `${b.sessionName}-${b.termName}`.localeCompare(`${a.sessionName}-${a.termName}`));
}

function buildReportByFeeType(db, invoices) {
  const feeTypeById = new Map((db.feeTypes || []).map((row) => [str(row.id), row]));
  const itemsByInvoice = new Map();

  for (const item of db.invoiceItems || []) {
    const invoiceId = str(item.invoiceId);
    if (!itemsByInvoice.has(invoiceId)) itemsByInvoice.set(invoiceId, []);
    itemsByInvoice.get(invoiceId).push(item);
  }

  const out = new Map();

  for (const invoice of invoices) {
    const invoiceId = str(invoice.id);
    const items = itemsByInvoice.get(invoiceId) || [];
    const itemsTotal = items.reduce((sum, item) => sum + normalizeMoney(item.amount), 0);

    for (const item of items) {
      const feeType = feeTypeById.get(str(item.feeTypeId));
      const code = str(item.feeCodeSnapshot || feeType?.feeCode) || "UNKNOWN";
      if (!out.has(code)) {
        out.set(code, {
          feeCode: code,
          feeName: str(item.feeNameSnapshot || feeType?.feeName) || "Unknown",
          totalExpected: 0,
          totalCollected: 0,
        });
      }

      const row = out.get(code);
      const expected = normalizeMoney(item.amount);
      const share = itemsTotal > 0 ? expected / itemsTotal : 0;
      const collected = normalizeMoney(Number(invoice.amountPaid || 0) * share);

      row.totalExpected += expected;
      row.totalCollected += collected;
    }
  }

  return Array.from(out.values())
    .map((row) => ({
      ...row,
      totalExpected: normalizeMoney(row.totalExpected),
      totalCollected: normalizeMoney(row.totalCollected),
      totalOutstanding: normalizeMoney(row.totalExpected - row.totalCollected),
    }))
    .sort((a, b) => a.feeName.localeCompare(b.feeName));
}

function buildOutstandingList(invoices) {
  return invoices
    .filter((row) => Number(row.balance || 0) > 0)
    .map((row) => ({
      invoiceId: row.id,
      invoiceNumber: row.invoiceNumber,
      studentId: row.studentId,
      studentName: row.studentName,
      className: row.className,
      sessionName: row.sessionName,
      termName: row.termName,
      balance: normalizeMoney(row.balance),
      status: row.status,
      dueDate: row.dueDate,
    }))
    .sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0));
}

function buildReceiptRows(db, query = {}) {
  const classId = str(query.classId);
  const sessionId = str(query.sessionId);
  const termId = str(query.termId);
  const search = str(query.search).toLowerCase();

  const rows = (db.receipts || []).map((receipt) => {
    const payment = (db.payments || []).find((row) => str(row.id) === str(receipt.paymentId));
    const invoice = (db.invoices || []).find((row) => str(row.id) === str(receipt.invoiceId));
    const invoiceRow = invoice ? toInvoiceAdminRow(db, invoice) : null;

    return {
      ...receipt,
      id: str(receipt.id),
      receiptNumber: str(receipt.receiptNumber),
      paymentReference: str(payment?.paymentReference || payment?.reference),
      paymentStatus: str(payment?.status),
      paymentAmount: normalizeMoney(payment?.amount),
      paymentMethod: str(payment?.paymentMethod),
      studentId: str(receipt.studentId || invoiceRow?.studentId),
      studentName: str(invoiceRow?.studentName),
      classId: str(invoiceRow?.classId),
      className: str(invoiceRow?.className),
      invoiceId: str(receipt.invoiceId),
      invoiceNumber: str(invoiceRow?.invoiceNumber),
      sessionId: str(invoiceRow?.sessionId),
      termId: str(invoiceRow?.termId),
      sessionName: str(invoiceRow?.sessionName),
      termName: str(invoiceRow?.termName),
      issuedAt: str(receipt.issuedAt || receipt.createdAt),
    };
  });

  return rows
    .filter((row) => {
      if (classId && str(row.classId) !== classId) return false;
      if (sessionId && str(row.sessionId) !== sessionId) return false;
      if (termId && str(row.termId) !== termId) return false;
      if (search) {
        const hay = [row.receiptNumber, row.paymentReference, row.studentName, row.className, row.invoiceNumber]
          .map((item) => str(item).toLowerCase())
          .join(" | ");
        if (!hay.includes(search)) return false;
      }
      return true;
    })
    .sort((a, b) => str(b.issuedAt).localeCompare(str(a.issuedAt)));
}

router.get("/history", auth(), requireRole("ADMIN", "PARENT", "APPLICANT"), (req, res) => {
  const db = readDB();
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });
  ensureClassCatalog(db);
  recalcAllInvoices(db);

  let rows = buildAdminRows(db)
    .map((row) => {
      const receipt = (db.receipts || []).find((item) => str(item.paymentId) === str(row.id));
      return {
        ...row,
        receiptNumber: str(receipt?.receiptNumber),
      };
    })
    .sort((a, b) => str(b.createdAt).localeCompare(str(a.createdAt)));

  if (req.user.role !== "ADMIN") {
    rows = rows.filter((row) => str(row.userId) === str(req.user.id));
  }

  return res.json({
    currency: SCHOOL_CURRENCY,
    records: rows,
  });
});

router.get("/public/fee-template", (req, res) => {
  const db = readDB();
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });
  ensureClassCatalog(db);

  const template = buildSchoolFeeTemplate(db, {
    sessionId: req.query.sessionId,
    sessionName: req.query.sessionName,
    termId: req.query.termId,
    termName: req.query.termName,
    classId: req.query.classId,
    className: req.query.className,
  });

  writeDB(db);

  if (!template) {
    return res.status(404).json({ message: "No school fee template is available for this class and term yet" });
  }

  return res.json({ template });
});

router.get("/admin/setup", auth(), requireRole(...PAYMENT_ADMIN_ROLES), async (req, res) => {
  const db = readDB();
  await syncStudentRosterFromPrisma(db);
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });
  ensureClassCatalog(db);
  syncAllStudentInvoicesAndFinancePayments(db, req.user || {});
  writeDB(db);
  return res.json(buildFinanceSetupPayload(db));
});

router.post("/admin/setup", auth(), requireRole(...PAYMENT_ADMIN_ROLES), (req, res) => {
  const body = req.body || {};
  const db = readDB();

  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });
  ensureClassCatalog(db);
  const gatewaySettings = ensureGatewaySettings(db);

  let session =
    findSessionByInput(db, body.sessionId) ||
    findSessionByInput(db, body.sessionName) ||
    null;

  if (!session && str(body.sessionName)) {
    session = {
      id: nanoid(),
      sessionName: str(body.sessionName),
      isActive: false,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    db.academicSessions.unshift(session);
  }

  if (!session) {
    session = (db.academicSessions || []).find((row) => Boolean(row.isActive)) || (db.academicSessions || [])[0] || null;
  }

  if (!session) {
    return res.status(400).json({ message: "Unable to resolve academic session" });
  }

  ensureTermsForSession(db, session.id);

  let term =
    findTermByInput(db, body.termId, session.id) ||
    findTermByInput(db, body.termName, session.id) ||
    null;

  if (!term && str(body.termName)) {
    term = {
      id: nanoid(),
      sessionId: str(session.id),
      termName: str(body.termName),
      isActive: false,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    db.terms.unshift(term);
  }

  if (!term) {
    term =
      (db.terms || []).find((row) => str(row.sessionId) === str(session.id) && Boolean(row.isActive)) ||
      (db.terms || []).find((row) => str(row.sessionId) === str(session.id)) ||
      null;
  }

  if (!term) {
    return res.status(400).json({ message: "Unable to resolve term" });
  }

  const requestedEnabledProviders = parseProviderList(body.enabledProviders);
  if (requestedEnabledProviders.length > 0) {
    gatewaySettings.enabledProviders = requestedEnabledProviders;
  }

  if (body.defaultProvider !== undefined) {
    const defaultProvider = str(body.defaultProvider).toUpperCase();
    if (defaultProvider && !SUPPORTED_PAYMENT_PROVIDERS.includes(defaultProvider)) {
      return res.status(400).json({ message: `Unsupported default payment provider: ${defaultProvider}` });
    }
    gatewaySettings.defaultProvider = defaultProvider;
  }

  const enabledProviders = getEnabledProviders(db);
  if (enabledProviders.length > 0 && !enabledProviders.includes(str(gatewaySettings.defaultProvider).toUpperCase())) {
    gatewaySettings.defaultProvider = enabledProviders[0];
  }

  for (const row of db.academicSessions || []) {
    row.isActive = str(row.id) === str(session.id);
    row.updatedAt = nowIso();
  }

  for (const row of db.terms || []) {
    row.isActive = str(row.id) === str(term.id);
    row.updatedAt = nowIso();
  }
  syncAcademicMirrors(db);

  writeDB(db);
  return res.json(buildFinanceSetupPayload(db));
});

router.get("/admin/academic-sessions", auth(), requireRole(...PAYMENT_ADMIN_ROLES), (req, res) => {
  const db = readDB();
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });
  ensureClassCatalog(db);

  for (const session of db.academicSessions || []) ensureTermsForSession(db, session.id);

  const { activeSession, activeTerm } = getActiveSessionTerm(db);
  writeDB(db);
  return res.json({
    sessions: (db.academicSessions || []).map(toSessionPayload).sort((a, b) => b.sessionName.localeCompare(a.sessionName)),
    terms: (db.terms || []).map(toTermPayload).sort((a, b) => a.termName.localeCompare(b.termName)),
    activeSessionId: str(activeSession?.id),
    activeTermId: str(activeTerm?.id),
  });
});

router.post("/admin/academic-sessions", auth(), requireRole(...PAYMENT_ADMIN_ROLES), (req, res) => {
  const body = req.body || {};
  const safeName = str(body.sessionName);
  if (!safeName) return res.status(400).json({ message: "Academic session name is required" });

  const db = readDB();
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });
  ensureClassCatalog(db);

  const existing = (db.academicSessions || []).find((row) => str(row.sessionName).toLowerCase() === safeName.toLowerCase());
  if (existing) return res.status(409).json({ message: "Academic session already exists" });

  const now = nowIso();
  const session = {
    id: nanoid(),
    sessionName: safeName,
    startDate: str(body.startDate),
    endDate: str(body.endDate),
    isActive: normalizeBool(body.isActive),
    createdAt: now,
    updatedAt: now,
  };
  db.academicSessions.unshift(session);
  ensureTermsForSession(db, session.id);

  if (session.isActive) {
    const term =
      findTermByInput(db, body.termId, session.id) ||
      findTermByInput(db, body.termName || "First Term", session.id) ||
      (db.terms || []).find((row) => str(row.sessionId) === str(session.id));
    setCurrentFinanceScope(db, session.id, term?.id);
  }

  appendFinanceAuditLog(db, {
    action: "academic_session_created",
    entityType: "academic_session",
    entityId: session.id,
    newValue: session,
    userId: req.user?.id,
    userName: req.user?.name || req.user?.username,
    ipAddress: req.ip,
  });

  syncAcademicMirrors(db);
  writeDB(db);
  return res.status(201).json({ session: toSessionPayload(session), terms: (db.terms || []).filter((row) => str(row.sessionId) === str(session.id)).map(toTermPayload) });
});

router.patch("/admin/academic-sessions/:sessionId", auth(), requireRole(...PAYMENT_ADMIN_ROLES), (req, res) => {
  const db = readDB();
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });
  ensureClassCatalog(db);

  const session = (db.academicSessions || []).find((row) => str(row.id) === str(req.params.sessionId));
  if (!session) return res.status(404).json({ message: "Academic session not found" });

  const oldValue = { ...session };
  const nextName = req.body?.sessionName !== undefined ? str(req.body.sessionName) : str(session.sessionName);
  if (!nextName) return res.status(400).json({ message: "Academic session name is required" });

  const duplicate = (db.academicSessions || []).find(
    (row) => str(row.id) !== str(session.id) && str(row.sessionName).toLowerCase() === nextName.toLowerCase()
  );
  if (duplicate) return res.status(409).json({ message: "Another academic session already uses that name" });

  session.sessionName = nextName;
  if (req.body?.startDate !== undefined) session.startDate = str(req.body.startDate);
  if (req.body?.endDate !== undefined) session.endDate = str(req.body.endDate);
  session.updatedAt = nowIso();

  let updatedSnapshots = 0;
  if (normalizeBool(req.body?.updateInvoiceSnapshots)) {
    for (const invoice of db.invoices || []) {
      if (str(invoice.sessionId) !== str(session.id)) continue;
      invoice.sessionNameSnapshot = session.sessionName;
      invoice.updatedAt = nowIso();
      updatedSnapshots += 1;
    }
  }

  if (req.body?.isActive !== undefined && normalizeBool(req.body.isActive)) {
    ensureTermsForSession(db, session.id);
    const term =
      findTermByInput(db, req.body.termId, session.id) ||
      (db.terms || []).find((row) => str(row.sessionId) === str(session.id) && Boolean(row.isActive)) ||
      (db.terms || []).find((row) => str(row.sessionId) === str(session.id));
    setCurrentFinanceScope(db, session.id, term?.id);
  } else if (req.body?.isActive !== undefined) {
    session.isActive = normalizeBool(req.body.isActive);
  }

  appendFinanceAuditLog(db, {
    action: "academic_session_updated",
    entityType: "academic_session",
    entityId: session.id,
    oldValue,
    newValue: { ...session, updatedSnapshots },
    reason: str(req.body?.reason),
    userId: req.user?.id,
    userName: req.user?.name || req.user?.username,
    ipAddress: req.ip,
  });

  syncAcademicMirrors(db);
  writeDB(db);
  return res.json({ session: toSessionPayload(session), updatedSnapshots });
});

router.post("/admin/academic-sessions/:sessionId/terms", auth(), requireRole(...PAYMENT_ADMIN_ROLES), (req, res) => {
  const db = readDB();
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });

  const session = (db.academicSessions || []).find((row) => str(row.id) === str(req.params.sessionId));
  if (!session) return res.status(404).json({ message: "Academic session not found" });

  const safeName = str(req.body?.termName);
  if (!safeName) return res.status(400).json({ message: "Term name is required" });

  const existing = findTermByInput(db, safeName, session.id);
  if (existing) return res.status(409).json({ message: "Term already exists for this session" });

  const now = nowIso();
  const term = {
    id: nanoid(),
    sessionId: str(session.id),
    termName: safeName,
    startDate: str(req.body?.startDate),
    endDate: str(req.body?.endDate),
    isActive: normalizeBool(req.body?.isActive),
    createdAt: now,
    updatedAt: now,
  };
  db.terms.unshift(term);
  if (term.isActive) setCurrentFinanceScope(db, session.id, term.id);

  appendFinanceAuditLog(db, {
    action: "term_created",
    entityType: "term",
    entityId: term.id,
    newValue: term,
    userId: req.user?.id,
    userName: req.user?.name || req.user?.username,
    ipAddress: req.ip,
  });

  syncAcademicMirrors(db);
  writeDB(db);
  return res.status(201).json({ term: toTermPayload(term) });
});

router.patch("/admin/terms/:termId", auth(), requireRole(...PAYMENT_ADMIN_ROLES), (req, res) => {
  const db = readDB();
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });
  ensureClassCatalog(db);

  const term = (db.terms || []).find((row) => str(row.id) === str(req.params.termId));
  if (!term) return res.status(404).json({ message: "Term not found" });

  const oldValue = { ...term };
  const targetSession =
    findSessionByInput(db, req.body?.sessionId) ||
    findSessionByInput(db, req.body?.sessionName) ||
    (db.academicSessions || []).find((row) => str(row.id) === str(term.sessionId));
  if (!targetSession) return res.status(400).json({ message: "Target academic session not found" });

  const nextTermName = req.body?.termName !== undefined ? str(req.body.termName) : str(term.termName);
  if (!nextTermName) return res.status(400).json({ message: "Term name is required" });

  const targetDuplicate = (db.terms || []).find(
    (row) =>
      str(row.id) !== str(term.id) &&
      str(row.sessionId) === str(targetSession.id) &&
      str(row.termName).toLowerCase() === nextTermName.toLowerCase()
  );
  const shouldReassign = req.body?.reassignRecords === undefined ? true : normalizeBool(req.body.reassignRecords);
  const updateSnapshots = req.body?.updateInvoiceSnapshots === undefined ? shouldReassign : normalizeBool(req.body.updateInvoiceSnapshots);
  let reassignedRecords = 0;
  let resultTerm = term;

  if (targetDuplicate) {
    if (req.body?.mergeIntoExisting === false || str(req.body?.mergeIntoExisting).toLowerCase() === "false") {
      return res.status(409).json({ message: "A matching term already exists in the target session. Enable mergeIntoExisting to move records into it." });
    }
    if (shouldReassign) {
      reassignedRecords = reassignFinanceTermRecords(db, {
        fromTermId: term.id,
        fromSessionId: term.sessionId,
        toTermId: targetDuplicate.id,
        toSessionId: targetSession.id,
        sessionName: targetSession.sessionName,
        termName: targetDuplicate.termName,
        updateInvoiceSnapshots: updateSnapshots,
      });
    }
    db.terms = (db.terms || []).filter((row) => str(row.id) !== str(term.id));
    targetDuplicate.startDate = req.body?.startDate !== undefined ? str(req.body.startDate) : str(targetDuplicate.startDate || term.startDate);
    targetDuplicate.endDate = req.body?.endDate !== undefined ? str(req.body.endDate) : str(targetDuplicate.endDate || term.endDate);
    targetDuplicate.updatedAt = nowIso();
    resultTerm = targetDuplicate;
  } else {
    const sessionChanged = str(term.sessionId) !== str(targetSession.id);
    term.sessionId = str(targetSession.id);
    term.termName = nextTermName;
    if (req.body?.startDate !== undefined) term.startDate = str(req.body.startDate);
    if (req.body?.endDate !== undefined) term.endDate = str(req.body.endDate);
    term.updatedAt = nowIso();

    if (shouldReassign && sessionChanged) {
      reassignedRecords = reassignFinanceTermRecords(db, {
        fromTermId: oldValue.id,
        fromSessionId: oldValue.sessionId,
        toTermId: term.id,
        toSessionId: targetSession.id,
        sessionName: targetSession.sessionName,
        termName: term.termName,
        updateInvoiceSnapshots: updateSnapshots,
      });
    } else if (updateSnapshots && (sessionChanged || str(oldValue.termName) !== str(term.termName))) {
      for (const invoice of db.invoices || []) {
        if (str(invoice.termId) !== str(term.id)) continue;
        invoice.sessionNameSnapshot = str(targetSession.sessionName);
        invoice.termNameSnapshot = str(term.termName);
        invoice.updatedAt = nowIso();
        reassignedRecords += 1;
      }
    }
    resultTerm = term;
  }

  if (req.body?.isActive !== undefined && normalizeBool(req.body.isActive)) {
    setCurrentFinanceScope(db, targetSession.id, resultTerm.id);
  } else if (req.body?.isActive !== undefined) {
    resultTerm.isActive = normalizeBool(req.body.isActive);
  }

  appendFinanceAuditLog(db, {
    action: "term_updated",
    entityType: "term",
    entityId: resultTerm.id,
    oldValue,
    newValue: { ...resultTerm, reassignedRecords, mergedFromTermId: targetDuplicate ? oldValue.id : "" },
    reason: str(req.body?.reason),
    userId: req.user?.id,
    userName: req.user?.name || req.user?.username,
    ipAddress: req.ip,
  });

  syncAcademicMirrors(db);
  writeDB(db);
  return res.json({ term: toTermPayload(resultTerm), reassignedRecords, merged: Boolean(targetDuplicate) });
});

router.get("/admin/school-structure", auth(), requireRole(...PAYMENT_ADMIN_ROLES), (req, res) => {
  const db = readDB();
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });
  ensureClassCatalog(db);
  writeDB(db);
  return res.json({
    sections: (db.financeSections || []).map((row) => ({
      id: str(row.id),
      sectionName: str(row.sectionName || row.name),
      name: str(row.name || row.sectionName),
      order: Number(row.order || 999),
      isActive: row.isActive === undefined ? true : normalizeBool(row.isActive),
    })),
    classes: sortAcademicClasses((db.classes || []).filter((row) => row.isActive !== false)).map((row) => ({
      id: str(row.id),
      name: str(row.name),
      sectionId: str(row.sectionId),
      section: str(row.section),
      order: Number(row.order || 999),
      isActive: row.isActive === undefined ? true : normalizeBool(row.isActive),
    })),
  });
});

router.post("/admin/school-structure/sections", auth(), requireRole(...PAYMENT_ADMIN_ROLES), (req, res) => {
  const db = readDB();
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });
  ensureClassCatalog(db);

  const sectionName = normalizeFinanceSectionName(req.body?.sectionName || req.body?.name);
  if (!sectionName || sectionName === "Other") return res.status(400).json({ message: "Section name is required" });
  const duplicate = (db.financeSections || []).find((row) => str(row.sectionName).toLowerCase() === sectionName.toLowerCase());
  if (duplicate) return res.status(409).json({ message: "Section already exists" });

  const now = nowIso();
  const section = {
    id: nanoid(),
    sectionName,
    name: sectionName,
    order: Number(req.body?.order || 999),
    isActive: req.body?.isActive === undefined ? true : normalizeBool(req.body.isActive),
    createdAt: now,
    updatedAt: now,
  };
  db.financeSections.push(section);
  appendFinanceAuditLog(db, {
    action: "school_section_created",
    entityType: "finance_section",
    entityId: section.id,
    newValue: section,
    userId: req.user?.id,
    userName: req.user?.name || req.user?.username,
    ipAddress: req.ip,
  });
  writeDB(db);
  return res.status(201).json({ section });
});

router.patch("/admin/school-structure/sections/:sectionId", auth(), requireRole(...PAYMENT_ADMIN_ROLES), (req, res) => {
  const db = readDB();
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });
  ensureClassCatalog(db);

  const section = (db.financeSections || []).find((row) => str(row.id) === str(req.params.sectionId));
  if (!section) return res.status(404).json({ message: "Section not found" });
  const oldValue = { ...section };
  const sectionName = req.body?.sectionName !== undefined || req.body?.name !== undefined
    ? normalizeFinanceSectionName(req.body?.sectionName || req.body?.name)
    : str(section.sectionName);
  if (!sectionName) return res.status(400).json({ message: "Section name is required" });
  section.sectionName = sectionName;
  section.name = sectionName;
  if (req.body?.order !== undefined) section.order = Number(req.body.order || 999);
  if (req.body?.isActive !== undefined) section.isActive = normalizeBool(req.body.isActive);
  section.updatedAt = nowIso();

  for (const cls of db.classes || []) {
    if (str(cls.sectionId) === str(section.id)) cls.section = section.sectionName;
  }

  appendFinanceAuditLog(db, {
    action: "school_section_updated",
    entityType: "finance_section",
    entityId: section.id,
    oldValue,
    newValue: section,
    reason: str(req.body?.reason),
    userId: req.user?.id,
    userName: req.user?.name || req.user?.username,
    ipAddress: req.ip,
  });
  writeDB(db);
  return res.json({ section });
});

router.post("/admin/school-structure/classes", auth(), requireRole(...PAYMENT_ADMIN_ROLES), (req, res) => {
  const db = readDB();
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });
  ensureClassCatalog(db);

  const className = str(req.body?.name || req.body?.className);
  if (!className) return res.status(400).json({ message: "Class name is required" });
  const approvedClass = getApprovedClassConfig(className);
  const legacyClass = getLegacyClassMapping(className);
  if (legacyClass) {
    return res.status(400).json({ message: `${className} is preserved for history only. Use ${legacyClass.targetClassName || "an active class"} for new fee setup.` });
  }
  const duplicate = (db.classes || []).find((row) => normalizeClassKey(row.name) === normalizeClassKey(className));
  if (duplicate) return res.status(409).json({ message: "Class already exists" });

  const section =
    (db.financeSections || []).find((row) => str(row.id) === str(req.body?.sectionId)) ||
    (db.financeSections || []).find((row) => str(row.sectionName).toLowerCase() === normalizeFinanceSectionName(req.body?.sectionName).toLowerCase()) ||
    (db.financeSections || []).find((row) => str(row.id) === "other") ||
    null;
  if (!section) return res.status(400).json({ message: "Section is required" });

  const now = nowIso();
  const row = {
    id: approvedClass?.id || nanoid(),
    name: approvedClass?.name || className,
    sectionId: str(section.id),
    section: approvedClass?.section || str(section.sectionName || section.name),
    order: Number(approvedClass?.displayOrder || req.body?.order || 999),
    displayOrder: Number(approvedClass?.displayOrder || req.body?.order || 999),
    level: approvedClass?.level || "",
    academicSystem: approvedClass?.academicSystem || "",
    curriculumFramework: approvedClass?.curriculumFramework || "",
    assessmentFramework: approvedClass?.assessmentFramework || "",
    isActive: req.body?.isActive === undefined ? true : normalizeBool(req.body.isActive),
    createdAt: now,
    updatedAt: now,
  };
  db.classes.push(row);
  appendFinanceAuditLog(db, {
    action: "school_class_created",
    entityType: "class",
    entityId: row.id,
    newValue: row,
    userId: req.user?.id,
    userName: req.user?.name || req.user?.username,
    ipAddress: req.ip,
  });
  writeDB(db);
  return res.status(201).json({ class: row });
});

router.patch("/admin/school-structure/classes/:classId", auth(), requireRole(...PAYMENT_ADMIN_ROLES), (req, res) => {
  const db = readDB();
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });
  ensureClassCatalog(db);

  const row = (db.classes || []).find((item) => str(item.id) === str(req.params.classId));
  if (!row) return res.status(404).json({ message: "Class not found" });
  const oldValue = { ...row };
  if (req.body?.name !== undefined || req.body?.className !== undefined) {
    const className = str(req.body.name || req.body.className);
    if (!className) return res.status(400).json({ message: "Class name is required" });
    row.name = className;
  }
  if (req.body?.sectionId !== undefined || req.body?.sectionName !== undefined) {
    const section =
      (db.financeSections || []).find((item) => str(item.id) === str(req.body.sectionId)) ||
      (db.financeSections || []).find((item) => str(item.sectionName).toLowerCase() === normalizeFinanceSectionName(req.body.sectionName).toLowerCase());
    if (!section) return res.status(400).json({ message: "Section not found" });
    row.sectionId = str(section.id);
    row.section = str(section.sectionName || section.name);
  }
  if (req.body?.order !== undefined) row.order = Number(req.body.order || 999);
  if (req.body?.isActive !== undefined) row.isActive = normalizeBool(req.body.isActive);
  row.updatedAt = nowIso();

  appendFinanceAuditLog(db, {
    action: "school_class_updated",
    entityType: "class",
    entityId: row.id,
    oldValue,
    newValue: row,
    reason: str(req.body?.reason),
    userId: req.user?.id,
    userName: req.user?.name || req.user?.username,
    ipAddress: req.ip,
  });
  writeDB(db);
  return res.json({ class: row });
});

router.get("/admin/fee-types", auth(), requireRole(...PAYMENT_ADMIN_ROLES), (req, res) => {
  const db = readDB();
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });

  const rows = (db.feeTypes || [])
    .map((row) => ({
      id: str(row.id),
      feeName: str(row.feeName),
      feeCode: str(row.feeCode),
      category: normalizeFeeCategory(row.category),
      isRecurring: Boolean(row.isRecurring),
      createdAt: str(row.createdAt),
      updatedAt: str(row.updatedAt),
    }))
    .sort((a, b) => a.feeName.localeCompare(b.feeName));

  writeDB(db);
  return res.json({ feeTypes: rows });
});

router.post("/admin/fee-types", auth(), requireRole(...PAYMENT_ADMIN_ROLES), (req, res) => {
  const { feeName, feeCode, category, isRecurring } = req.body || {};
  const safeName = str(feeName);
  const safeCode = str(feeCode).toUpperCase();

  if (!safeName || !safeCode) {
    return res.status(400).json({ message: "feeName and feeCode are required" });
  }

  const db = readDB();
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });

  const exists = (db.feeTypes || []).find((row) => str(row.feeCode).toUpperCase() === safeCode);
  if (exists) return res.status(409).json({ message: "Fee type code already exists" });

  const now = nowIso();
  const row = {
    id: nanoid(),
    feeName: safeName,
    feeCode: safeCode,
    category: normalizeFeeCategory(category),
    isRecurring: normalizeBool(isRecurring),
    createdAt: now,
    updatedAt: now,
  };

  db.feeTypes.unshift(row);
  writeDB(db);

  return res.status(201).json(row);
});

router.get("/admin/fee-structures", auth(), requireRole(...PAYMENT_ADMIN_ROLES), (req, res) => {
  const db = readDB();
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });
  ensureClassCatalog(db);

  const { activeSession, activeTerm } = getActiveSessionTerm(db);
  const sessionId = str(req.query.sessionId || activeSession?.id);
  const termId = str(req.query.termId || activeTerm?.id);
  const classIdFilter = str(req.query.classId);
  const typeFilter = str(req.query.structureType).toUpperCase();
  const isActiveFilter = str(req.query.isActive).toLowerCase();
  const includeArchived = normalizeBool(req.query.includeArchived);

  const rows = (db.feeStructures || [])
    .filter((row) => includeArchived || !str(row.archivedAt))
    .filter((row) => (!sessionId || str(row.sessionId) === sessionId) && (!termId || str(row.termId) === termId))
    .filter((row) => (!classIdFilter || str(row.classId) === classIdFilter))
    .map((row) => {
      const session = (db.academicSessions || []).find((item) => str(item.id) === str(row.sessionId));
      const term = (db.terms || []).find((item) => str(item.id) === str(row.termId));
      const cls = (db.classes || []).find((item) => str(item.id) === str(row.classId));
      const feeType = (db.feeTypes || []).find((item) => str(item.id) === str(row.feeTypeId));
      const structureType = normalizeStructureType(row.structureType, row.isOptional);
      const isActive = isStructureActive(row);

      return {
        ...row,
        id: str(row.id),
        sessionName: str(session?.sessionName),
        termName: str(term?.termName),
        className: str(cls?.name),
        feeName: str(feeType?.feeName),
        feeCode: str(feeType?.feeCode),
        feeCategory: normalizeFeeCategory(feeType?.category),
        amount: normalizeMoney(row.amount),
        structureType,
        isOptional: structureType === "OPTIONAL",
        isActive,
      };
    })
    .filter((row) => (!typeFilter || typeFilter === "ALL" || row.structureType === typeFilter))
    .filter((row) => {
      if (!isActiveFilter || isActiveFilter === "all") return true;
      if (isActiveFilter === "true") return Boolean(row.isActive);
      if (isActiveFilter === "false") return !Boolean(row.isActive);
      return true;
    })
    .sort((a, b) => {
      if (str(a.className) !== str(b.className)) return str(a.className).localeCompare(str(b.className));
      if (str(a.structureType) !== str(b.structureType)) return str(a.structureType).localeCompare(str(b.structureType));
      return str(a.feeName).localeCompare(str(b.feeName));
    });

  writeDB(db);
  return res.json({
    sessionId,
    termId,
    feeStructures: rows,
  });
});

router.get("/admin/fee-templates", auth(), requireRole(...PAYMENT_ADMIN_ROLES), (req, res) => {
  const db = readDB();
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });
  ensureClassCatalog(db);

  const { activeSession, activeTerm } = getActiveSessionTerm(db);
  const session = findSessionByInput(db, req.query.sessionId) || activeSession;
  if (!session) return res.status(400).json({ message: "Invalid session" });

  const requestedTerm = str(req.query.termId || req.query.termName);
  const term = requestedTerm
    ? findTermByInput(db, requestedTerm, session.id)
    : findTermByInput(db, activeTerm?.id, session.id) ||
      (db.terms || []).find((row) => str(row.sessionId) === str(session.id)) ||
      null;
  if (!term) return res.status(400).json({ message: "Invalid term" });

  const classFilter = resolveClassIdsFromInput(db, { classId: req.query.classId, className: req.query.className });
  const availableClassIds = Array.from(
    new Set(
      (db.feeStructures || [])
        .filter((row) => str(row.sessionId) === str(session.id) && str(row.termId) === str(term.id))
        .filter((row) => isStructureActive(row))
        .map((row) => str(row.classId))
    )
  );

  const targetClassIds = classFilter.length ? availableClassIds.filter((id) => classFilter.includes(id)) : availableClassIds;
  const templates = targetClassIds
    .map((classId) => buildSchoolFeeTemplate(db, { sessionId: session.id, termId: term.id, classId }))
    .filter(Boolean)
    .sort((a, b) => String(a.className).localeCompare(String(b.className)));

  writeDB(db);
  return res.json({
    sessionId: str(session.id),
    sessionName: str(session.sessionName),
    termId: str(term.id),
    termName: str(term.termName),
    templates,
  });
});

router.post("/admin/fee-structures", auth(), requireRole(...PAYMENT_ADMIN_ROLES), (req, res) => {
  const { sessionId, termId, classId, className, feeTypeId, feeCode, amount, structureType, isOptional, dueDate, isActive } = req.body || {};
  const safeAmount = normalizeMoney(amount);
  if (safeAmount <= 0) return res.status(400).json({ message: "amount must be greater than zero" });

  const db = readDB();
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });
  ensureClassCatalog(db);

  const { activeSession, activeTerm } = getActiveSessionTerm(db);

  const session = findSessionByInput(db, sessionId) || activeSession;
  if (!session) return res.status(400).json({ message: "Invalid session" });

  const term = findTermByInput(db, termId, session.id) || activeTerm;
  if (!term) return res.status(400).json({ message: "Invalid term" });

  const resolvedClassId = resolveClassIdsFromInput(db, { classId, className })[0] || "";
  if (!resolvedClassId) return res.status(400).json({ message: "Invalid class" });

  const feeType =
    (db.feeTypes || []).find((row) => str(row.id) === str(feeTypeId)) ||
    (db.feeTypes || []).find((row) => str(row.feeCode).toUpperCase() === str(feeCode).toUpperCase()) ||
    null;

  if (!feeType) return res.status(400).json({ message: "Invalid fee type" });

  const safeStructureType = normalizeStructureType(structureType, isOptional);
  const safeOptional = safeStructureType === "OPTIONAL";
  const safeActive = isActive === undefined ? true : normalizeBool(isActive);

  const existing = (db.feeStructures || []).find(
    (row) =>
      str(row.sessionId) === str(session.id) &&
      str(row.termId) === str(term.id) &&
      str(row.classId) === resolvedClassId &&
      str(row.feeTypeId) === str(feeType.id) &&
      normalizeStructureType(row.structureType, row.isOptional) === safeStructureType
  );

  const now = nowIso();
  if (existing) {
    existing.amount = safeAmount;
    existing.isOptional = safeOptional;
    existing.structureType = safeStructureType;
    existing.isActive = safeActive;
    existing.dueDate = str(dueDate);
    existing.updatedAt = now;
    writeDB(db);
    return res.json(existing);
  }

  const row = {
    id: nanoid(),
    sessionId: str(session.id),
    termId: str(term.id),
    classId: resolvedClassId,
    feeTypeId: str(feeType.id),
    amount: safeAmount,
    isOptional: safeOptional,
    structureType: safeStructureType,
    isActive: safeActive,
    dueDate: str(dueDate),
    createdAt: now,
    updatedAt: now,
  };

  db.feeStructures.unshift(row);
  appendFinanceAuditLog(db, {
    action: "fee_structure_created",
    entityType: "feeStructure",
    entityId: row.id,
    performedBy: req.user?.id,
    after: row,
  });
  writeDB(db);
  return res.status(201).json(row);
});

router.patch("/admin/fee-structures/:structureId", auth(), requireRole(...PAYMENT_ADMIN_ROLES), (req, res) => {
  const db = readDB();
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });
  ensureClassCatalog(db);

  const row = (db.feeStructures || []).find((item) => str(item.id) === str(req.params.structureId));
  if (!row) return res.status(404).json({ message: "Fee structure not found" });

  const before = { ...row };
  const body = req.body || {};
  const safeAmount = body.amount === undefined ? normalizeMoney(row.amount) : normalizeMoney(body.amount);
  if (safeAmount <= 0) return res.status(400).json({ message: "amount must be greater than zero" });

  const session = findSessionByInput(db, body.sessionId) || findSessionByInput(db, row.sessionId);
  const term = findTermByInput(db, body.termId, session?.id) || findTermByInput(db, row.termId, session?.id);
  if (!session || !term) return res.status(400).json({ message: "Invalid session/term" });

  const resolvedClassId = body.classId || body.className
    ? resolveClassIdsFromInput(db, { classId: body.classId, className: body.className })[0] || ""
    : str(row.classId);
  if (!resolvedClassId) return res.status(400).json({ message: "Invalid class" });

  const feeType = body.feeTypeId || body.feeCode
    ? (
      (db.feeTypes || []).find((item) => str(item.id) === str(body.feeTypeId)) ||
      (db.feeTypes || []).find((item) => str(item.feeCode).toUpperCase() === str(body.feeCode).toUpperCase())
    )
    : (db.feeTypes || []).find((item) => str(item.id) === str(row.feeTypeId));
  if (!feeType) return res.status(400).json({ message: "Invalid fee type" });

  const structureType = normalizeStructureType(body.structureType ?? row.structureType, body.isOptional ?? row.isOptional);

  Object.assign(row, {
    sessionId: str(session.id),
    termId: str(term.id),
    classId: resolvedClassId,
    sectionId: str((db.classes || []).find((item) => str(item.id) === resolvedClassId)?.sectionId),
    feeTypeId: str(feeType.id),
    amount: safeAmount,
    structureType,
    isOptional: structureType === "OPTIONAL",
    isActive: body.isActive === undefined ? isStructureActive(row) : normalizeBool(body.isActive),
    dueDate: body.dueDate === undefined ? str(row.dueDate) : str(body.dueDate),
    archivedAt: "",
    archivedBy: "",
    updatedAt: nowIso(),
  });

  appendFinanceAuditLog(db, {
    action: "fee_structure_updated",
    entityType: "feeStructure",
    entityId: row.id,
    performedBy: req.user?.id,
    before,
    after: row,
    notes: "Existing invoice snapshots were preserved; regenerate invoices only for newly issued records.",
  });

  writeDB(db);
  return res.json(row);
});

router.delete("/admin/fee-structures/:structureId", auth(), requireRole(...PAYMENT_ADMIN_ROLES), (req, res) => {
  const db = readDB();
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });
  ensureClassCatalog(db);

  const row = (db.feeStructures || []).find((item) => str(item.id) === str(req.params.structureId));
  if (!row) return res.status(404).json({ message: "Fee structure not found" });

  const before = { ...row };
  row.isActive = false;
  row.archivedAt = nowIso();
  row.archivedBy = str(req.user?.id);
  row.updatedAt = nowIso();

  appendFinanceAuditLog(db, {
    action: "fee_structure_archived",
    entityType: "feeStructure",
    entityId: row.id,
    performedBy: req.user?.id,
    before,
    after: row,
    notes: "Archived fee structure. Existing invoice snapshots were not recalculated.",
  });

  writeDB(db);
  return res.json({ deleted: true, archived: true, id: str(row.id), record: row });
});

router.post("/admin/fee-structures/bulk", auth(), requireRole(...PAYMENT_ADMIN_ROLES), (req, res) => {
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
  if (rows.length === 0) return res.status(400).json({ message: "rows array is required" });

  const db = readDB();
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });
  ensureClassCatalog(db);

  const { activeSession, activeTerm } = getActiveSessionTerm(db);
  const createdBy = str(req.user?.id) || "system";
  const now = nowIso();

  let created = 0;
  let updated = 0;
  const errors = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const bag = buildBulkValueBag(row);

    const { session, term, error: sessionTermError } = resolveSessionTermForBulkRow(db, bag, activeSession, activeTerm);
    if (sessionTermError || !session || !term) {
      errors.push({ rowNumber, message: sessionTermError || "Invalid session/term" });
      return;
    }

    const classInput = pickBulkValue(bag, ["Class", "Class_Name", "ClassName", "Class_Id", "ClassID"]);
    const resolvedClassId = resolveClassIdsFromInput(db, { classId: classInput, className: classInput })[0] || "";
    if (!resolvedClassId) {
      errors.push({ rowNumber, message: "Invalid class" });
      return;
    }

    const feeType = findFeeTypeForBulkRow(db, bag);
    if (!feeType) {
      errors.push({ rowNumber, message: "Invalid fee type" });
      return;
    }

    const safeAmount = normalizeMoney(pickBulkValue(bag, ["Amount", "Fee_Amount", "amount"]));
    if (safeAmount <= 0) {
      errors.push({ rowNumber, message: "Amount must be greater than zero" });
      return;
    }

    const structureType = normalizeStructureType(
      pickBulkValue(bag, ["Structure_Type", "Type", "Fee_Structure_Type", "structureType"]),
      pickBulkValue(bag, ["Is_Optional", "Optional", "isOptional"])
    );
    const safeOptional = structureType === "OPTIONAL";

    const isActiveInput = pickBulkValue(bag, ["Is_Active", "Active", "isActive"]);
    const safeActive = isActiveInput ? normalizeBool(isActiveInput) : true;
    const dueDate = pickBulkValue(bag, ["Due_Date", "DueDate", "dueDate"]);

    const existing = (db.feeStructures || []).find(
      (item) =>
        str(item.sessionId) === str(session.id) &&
        str(item.termId) === str(term.id) &&
        str(item.classId) === resolvedClassId &&
        str(item.feeTypeId) === str(feeType.id) &&
        normalizeStructureType(item.structureType, item.isOptional) === structureType
    );

    if (existing) {
      existing.amount = safeAmount;
      existing.structureType = structureType;
      existing.isOptional = safeOptional;
      existing.isActive = safeActive;
      existing.dueDate = dueDate;
      existing.updatedAt = now;
      updated += 1;
      return;
    }

    db.feeStructures.unshift({
      id: nanoid(),
      sessionId: str(session.id),
      termId: str(term.id),
      classId: resolvedClassId,
      feeTypeId: str(feeType.id),
      amount: safeAmount,
      isOptional: safeOptional,
      structureType,
      isActive: safeActive,
      dueDate,
      createdAt: now,
      updatedAt: now,
      createdBy,
    });
    created += 1;
  });

  writeDB(db);
  return res.json({
    totalRows: rows.length,
    created,
    updated,
    failed: errors.length,
    errors: errors.slice(0, 100),
  });
});
router.get("/admin/students", auth(), requireRole(...PAYMENT_ADMIN_ROLES), async (req, res) => {
  const db = readDB();
  await syncStudentRosterFromPrisma(db);
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });
  ensureClassCatalog(db);

  const classId = str(req.query.classId);
  const search = str(req.query.search).toLowerCase();
  const includeProtected = normalizeBool(req.query.includeProtected);

  const rows = (db.students || [])
    .filter((student) => includeProtected || !isArchivedStudent(student))
    .map((student) => {
      const resolvedClassId = resolveStudentClassId(db, student);
      const cls = (db.classes || []).find((row) => str(row.id) === str(resolvedClassId));
      return {
        id: str(student.id),
        name: str(student.name),
        admissionNumber: getStudentAdmissionNumber(student),
        classId: str(resolvedClassId),
        className: str(cls?.name || student.className),
        financeStatus: str(student.financeStatus || student.status || "active"),
        financeProtected: isArchivedStudent(student),
      };
    })
    .filter((row) => (!classId || row.classId === classId))
    .filter((row) => {
      if (!search) return true;
      return `${row.name} ${row.className}`.toLowerCase().includes(search);
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  writeDB(db);
  return res.json({ students: rows });
});

router.get("/admin/student-finance/:studentId", auth(), requireRole(...PAYMENT_ADMIN_ROLES), async (req, res) => {
  const db = readDB();
  await syncStudentRosterFromPrisma(db);
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });
  ensureClassCatalog(db);
  recalcAllInvoices(db);

  const student = (db.students || []).find((row) => str(row.id) === str(req.params.studentId));
  if (!student) return res.status(404).json({ message: "Student not found" });

  const invoiceRows = (db.invoices || [])
    .filter((row) => str(row.studentId) === str(student.id))
    .map((row) => toInvoiceAdminRow(db, row))
    .sort((a, b) => str(b.updatedAt).localeCompare(str(a.updatedAt)));
  const invoiceIds = new Set(invoiceRows.map((row) => str(row.id)));

  const financeFees = (db.financeStudentFees || [])
    .filter((row) => str(row.studentId) === str(student.id))
    .sort((a, b) => str(b.updatedAt || b.createdAt).localeCompare(str(a.updatedAt || a.createdAt)));
  const financePayments = (db.financePayments || [])
    .filter((row) => str(row.studentId) === str(student.id))
    .sort((a, b) => str(b.datePaid || b.createdAt).localeCompare(str(a.datePaid || a.createdAt)));
  const onlinePayments = (db.payments || [])
    .filter((row) => invoiceIds.has(str(row.invoiceId)))
    .sort((a, b) => str(b.paidAt || b.createdAt).localeCompare(str(a.paidAt || a.createdAt)));
  const assignments = (db.studentFeeAssignments || [])
    .filter((row) => str(row.studentId) === str(student.id))
    .sort((a, b) => str(b.updatedAt || b.createdAt).localeCompare(str(a.updatedAt || a.createdAt)));

  const totalBilled = invoiceRows.reduce((sum, row) => sum + normalizeMoney(row.totalAmount), 0);
  const totalPaid = invoiceRows.reduce((sum, row) => sum + normalizeMoney(row.amountPaid), 0);
  const totalOutstanding = invoiceRows.reduce((sum, row) => sum + normalizeMoney(row.balance), 0);

  writeDB(db);
  return res.json({
    student: {
      id: str(student.id),
      name: str(student.name),
      admissionNumber: getStudentAdmissionNumber(student),
      classId: str(resolveStudentClassId(db, student)),
      className: str(student.className || student.class),
      financeStatus: str(student.financeStatus || student.status || "active"),
      financeProtected: isArchivedStudent(student),
    },
    summary: {
      currency: SCHOOL_CURRENCY,
      totalBilled: normalizeMoney(totalBilled),
      totalPaid: normalizeMoney(totalPaid),
      totalOutstanding: normalizeMoney(totalOutstanding),
      invoiceCount: invoiceRows.length,
      paymentCount: financePayments.length + onlinePayments.length,
    },
    invoices: invoiceRows,
    financeFees,
    financePayments,
    onlinePayments,
    assignments,
  });
});

router.patch("/admin/students/:studentId/finance-status", auth(), requireRole(...PAYMENT_ADMIN_ROLES), async (req, res) => {
  const db = readDB();
  await syncStudentRosterFromPrisma(db);
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });

  const student = (db.students || []).find((row) => str(row.id) === str(req.params.studentId));
  if (!student) return res.status(404).json({ message: "Student not found" });

  const allowed = new Set(["active", "inactive", "withdrawn", "left", "transferred", "graduated", "alumni"]);
  const status = str(req.body?.financeStatus || req.body?.status).toLowerCase();
  if (!allowed.has(status)) return res.status(400).json({ message: "Invalid finance status" });

  const oldValue = {
    financeStatus: str(student.financeStatus),
    status: str(student.status),
    financeProtectedAt: str(student.financeProtectedAt),
  };

  student.financeStatus = status;
  student.financeProtectedAt = status === "active" ? "" : str(req.body?.effectiveDate || nowIso());
  student.financeProtectionReason = str(req.body?.reason);
  student.updatedAt = nowIso();

  appendFinanceAuditLog(db, {
    action: status === "active" ? "student_finance_reactivated" : "student_finance_protected",
    entityType: "student",
    entityId: student.id,
    oldValue,
    newValue: {
      financeStatus: student.financeStatus,
      financeProtectedAt: student.financeProtectedAt,
      financeProtectionReason: student.financeProtectionReason,
    },
    reason: str(req.body?.reason),
    userId: req.user?.id,
    userName: req.user?.name || req.user?.username,
    ipAddress: req.ip,
  });

  writeDB(db);
  return res.json({
    student: {
      id: str(student.id),
      name: str(student.name),
      financeStatus: str(student.financeStatus),
      financeProtectedAt: str(student.financeProtectedAt),
      financeProtected: isArchivedStudent(student),
    },
  });
});

router.get("/admin/audit-logs", auth(), requireRole(...PAYMENT_ADMIN_ROLES), (req, res) => {
  const db = readDB();
  ensurePaymentCollections(db);
  const entityType = str(req.query.entityType);
  const entityId = str(req.query.entityId);
  const limit = Math.min(Math.max(Number(req.query.limit || 100), 1), 500);
  const rows = (db.financeAuditLogs || [])
    .filter((row) => (!entityType || str(row.entityType) === entityType))
    .filter((row) => (!entityId || str(row.entityId) === entityId))
    .sort((a, b) => str(b.createdAt).localeCompare(str(a.createdAt)))
    .slice(0, limit);
  writeDB(db);
  return res.json({ records: rows, totalCount: rows.length });
});

router.get("/admin/student-fee-assignments", auth(), requireRole(...PAYMENT_ADMIN_ROLES), (req, res) => {
  const db = readDB();
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });
  ensureClassCatalog(db);

  const { activeSession, activeTerm } = getActiveSessionTerm(db);
  const sessionId = str(req.query.sessionId || activeSession?.id);
  const termId = str(req.query.termId || activeTerm?.id);
  const studentId = str(req.query.studentId);
  const classId = str(req.query.classId);
  const isActiveFilter = str(req.query.isActive).toLowerCase();

  const rows = (db.studentFeeAssignments || [])
    .filter((row) => (!sessionId || str(row.sessionId) === sessionId) && (!termId || str(row.termId) === termId))
    .filter((row) => (!studentId || str(row.studentId) === studentId))
    .map((row) => {
      const student = (db.students || []).find((item) => str(item.id) === str(row.studentId));
      const studentClassId = resolveStudentClassId(db, student || {});
      const cls = (db.classes || []).find((item) => str(item.id) === studentClassId);
      const feeType = (db.feeTypes || []).find((item) => str(item.id) === str(row.feeTypeId));
      return {
        ...row,
        id: str(row.id),
        studentName: str(student?.name),
        classId: str(studentClassId),
        className: str(cls?.name),
        feeName: str(feeType?.feeName),
        feeCode: str(feeType?.feeCode),
        feeCategory: normalizeFeeCategory(feeType?.category),
        amount: normalizeMoney(row.amount),
        isActive: isStructureActive(row),
      };
    })
    .filter((row) => (!classId || str(row.classId) === classId))
    .filter((row) => {
      if (!isActiveFilter || isActiveFilter === "all") return true;
      if (isActiveFilter === "true") return Boolean(row.isActive);
      if (isActiveFilter === "false") return !Boolean(row.isActive);
      return true;
    })
    .sort((a, b) => str(a.studentName).localeCompare(str(b.studentName)));

  writeDB(db);
  return res.json({ sessionId, termId, assignments: rows });
});

router.post("/admin/student-fee-assignments", auth(), requireRole(...PAYMENT_ADMIN_ROLES), (req, res) => {
  const { studentId, feeTypeId, feeCode, amount, sessionId, termId, dueDate, isActive, notes } = req.body || {};
  const safeStudentId = str(studentId);
  const safeAmount = normalizeMoney(amount);

  if (!safeStudentId) return res.status(400).json({ message: "studentId is required" });
  if (safeAmount <= 0) return res.status(400).json({ message: "amount must be greater than zero" });

  const db = readDB();
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });
  ensureClassCatalog(db);

  const student = (db.students || []).find((row) => str(row.id) === safeStudentId);
  if (!student) return res.status(400).json({ message: "Invalid student" });

  const { activeSession, activeTerm } = getActiveSessionTerm(db);
  const session = findSessionByInput(db, sessionId) || activeSession;
  const term = findTermByInput(db, termId, session?.id) || activeTerm;
  if (!session || !term) return res.status(400).json({ message: "Invalid session/term" });

  const feeType =
    (db.feeTypes || []).find((row) => str(row.id) === str(feeTypeId)) ||
    (db.feeTypes || []).find((row) => str(row.feeCode).toUpperCase() === str(feeCode).toUpperCase()) ||
    null;

  if (!feeType) return res.status(400).json({ message: "Invalid fee type" });

  const existing = (db.studentFeeAssignments || []).find(
    (row) =>
      str(row.studentId) === safeStudentId &&
      str(row.sessionId) === str(session.id) &&
      str(row.termId) === str(term.id) &&
      str(row.feeTypeId) === str(feeType.id)
  );

  const now = nowIso();
  let assignment;
  if (existing) {
    existing.amount = safeAmount;
    existing.dueDate = str(dueDate);
    existing.isActive = isActive === undefined ? true : normalizeBool(isActive);
    existing.notes = str(notes);
    existing.updatedAt = now;
    assignment = existing;
  } else {
    assignment = {
      id: nanoid(),
      studentId: safeStudentId,
      sessionId: str(session.id),
      termId: str(term.id),
      feeTypeId: str(feeType.id),
      amount: safeAmount,
      dueDate: str(dueDate),
      isActive: isActive === undefined ? true : normalizeBool(isActive),
      notes: str(notes),
      createdAt: now,
      updatedAt: now,
    };
    db.studentFeeAssignments.unshift(assignment);
  }

  const feeStructures = (db.feeStructures || []).filter(
    (row) => str(row.sessionId) === str(session.id) && str(row.termId) === str(term.id)
  );

  const syncedInvoice = createInvoiceForStudent({
    db,
    student,
    session,
    term,
    dueDate: str(dueDate),
    createdBy: req.user?.id || "system",
    feeStructures,
    fallbackAmount: 0,
    includePreviousBalance: true,
  });

  syncLegacyFeeInvoicesMirror(db);
  writeDB(db);

  return res.status(existing ? 200 : 201).json({
    assignment,
    invoice: syncedInvoice ? toInvoiceAdminRow(db, syncedInvoice) : null,
  });
});

router.post("/admin/student-fee-assignments/bulk", auth(), requireRole(...PAYMENT_ADMIN_ROLES), (req, res) => {
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
  if (rows.length === 0) return res.status(400).json({ message: "rows array is required" });

  const db = readDB();
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });
  ensureClassCatalog(db);

  const { activeSession, activeTerm } = getActiveSessionTerm(db);
  const createdBy = str(req.user?.id) || "system";
  const now = nowIso();

  const feeStructureCache = new Map();
  const getScopedFeeStructures = (sessionId, termId) => {
    const key = `${sessionId}::${termId}`;
    if (!feeStructureCache.has(key)) {
      feeStructureCache.set(
        key,
        (db.feeStructures || []).filter((row) => str(row.sessionId) === str(sessionId) && str(row.termId) === str(termId))
      );
    }
    return feeStructureCache.get(key);
  };

  let created = 0;
  let updated = 0;
  let invoiceSynced = 0;
  const errors = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const bag = buildBulkValueBag(row);

    const { session, term, error: sessionTermError } = resolveSessionTermForBulkRow(db, bag, activeSession, activeTerm);
    if (sessionTermError || !session || !term) {
      errors.push({ rowNumber, message: sessionTermError || "Invalid session/term" });
      return;
    }

    const studentResolved = resolveStudentForBulkRow(db, bag);
    if (!studentResolved.student) {
      errors.push({ rowNumber, message: studentResolved.error || "Invalid student" });
      return;
    }

    const feeType = findFeeTypeForBulkRow(db, bag);
    if (!feeType) {
      errors.push({ rowNumber, message: "Invalid fee type" });
      return;
    }

    const safeAmount = normalizeMoney(pickBulkValue(bag, ["Amount", "Fee_Amount", "amount"]));
    if (safeAmount <= 0) {
      errors.push({ rowNumber, message: "Amount must be greater than zero" });
      return;
    }

    const dueDate = pickBulkValue(bag, ["Due_Date", "DueDate", "dueDate"]);
    const notes = pickBulkValue(bag, ["Notes", "Remark", "Remarks"]);
    const isActiveInput = pickBulkValue(bag, ["Is_Active", "Active", "isActive"]);
    const safeActive = isActiveInput ? normalizeBool(isActiveInput) : true;

    const existing = (db.studentFeeAssignments || []).find(
      (item) =>
        str(item.studentId) === str(studentResolved.student.id) &&
        str(item.sessionId) === str(session.id) &&
        str(item.termId) === str(term.id) &&
        str(item.feeTypeId) === str(feeType.id)
    );

    if (existing) {
      existing.amount = safeAmount;
      existing.dueDate = dueDate;
      existing.isActive = safeActive;
      existing.notes = notes;
      existing.updatedAt = now;
      updated += 1;
    } else {
      db.studentFeeAssignments.unshift({
        id: nanoid(),
        studentId: str(studentResolved.student.id),
        sessionId: str(session.id),
        termId: str(term.id),
        feeTypeId: str(feeType.id),
        amount: safeAmount,
        dueDate,
        isActive: safeActive,
        notes,
        createdAt: now,
        updatedAt: now,
        createdBy,
      });
      created += 1;
    }

    const syncedInvoice = createInvoiceForStudent({
      db,
      student: studentResolved.student,
      session,
      term,
      dueDate,
      createdBy,
      feeStructures: getScopedFeeStructures(session.id, term.id),
      fallbackAmount: 0,
      includePreviousBalance: true,
    });

    if (syncedInvoice) invoiceSynced += 1;
  });

  syncLegacyFeeInvoicesMirror(db);
  writeDB(db);

  return res.json({
    totalRows: rows.length,
    created,
    updated,
    invoiceSynced,
    failed: errors.length,
    errors: errors.slice(0, 100),
  });
});
router.get("/admin/discounts", auth(), requireRole(...PAYMENT_ADMIN_ROLES), (req, res) => {
  const db = readDB();
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });
  ensureClassCatalog(db);

  const invoiceId = str(req.query.invoiceId);
  const studentId = str(req.query.studentId);

  const rows = (db.discounts || [])
    .filter((row) => (!invoiceId || str(row.invoiceId) === invoiceId))
    .filter((row) => (!studentId || str(row.studentId) === studentId))
    .map((row) => {
      const invoice = (db.invoices || []).find((item) => str(item.id) === str(row.invoiceId));
      const invoiceRow = invoice ? toInvoiceAdminRow(db, invoice) : null;
      return {
        ...row,
        id: str(row.id),
        amount: normalizeMoney(row.amount),
        discountType: str(row.discountType),
        invoiceNumber: str(invoiceRow?.invoiceNumber),
        studentName: str(invoiceRow?.studentName),
        className: str(invoiceRow?.className),
      };
    })
    .sort((a, b) => str(b.createdAt).localeCompare(str(a.createdAt)));

  writeDB(db);
  return res.json({ discounts: rows });
});

router.post("/admin/discounts", auth(), requireRole(...PAYMENT_ADMIN_ROLES), (req, res) => {
  const { invoiceId, studentId, sessionId, termId, amount, discountType, reason } = req.body || {};
  const safeAmount = normalizeMoney(amount);
  if (safeAmount <= 0) return res.status(400).json({ message: "amount must be greater than zero" });

  const db = readDB();
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });

  let invoice = (db.invoices || []).find((row) => str(row.id) === str(invoiceId));

  if (!invoice && str(studentId)) {
    invoice = (db.invoices || [])
      .filter((row) => str(row.studentId) === str(studentId))
      .filter((row) => (!str(sessionId) || str(row.sessionId) === str(sessionId)))
      .filter((row) => (!str(termId) || str(row.termId) === str(termId)))
      .sort((a, b) => str(b.createdAt).localeCompare(str(a.createdAt)))[0] || null;
  }

  if (!invoice) return res.status(400).json({ message: "Unable to resolve target invoice" });

  const row = {
    id: nanoid(),
    studentId: str(invoice.studentId),
    invoiceId: str(invoice.id),
    discountType: str(discountType || "SPECIAL_ADJUSTMENT").toUpperCase(),
    amount: safeAmount,
    reason: str(reason),
    approvedBy: str(req.user?.id),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  db.discounts.unshift(row);
  const updatedInvoice = recalcInvoiceAmounts(db, invoice.id);
  syncLegacyFeeInvoicesMirror(db);
  writeDB(db);

  return res.status(201).json({
    discount: row,
    invoice: updatedInvoice ? toInvoiceAdminRow(db, updatedInvoice) : null,
  });
});
router.post("/admin/generate-invoices", auth(), requireRole(...PAYMENT_ADMIN_ROLES), async (req, res) => {
  const body = req.body || {};
  const db = readDB();

  await syncStudentRosterFromPrisma(db);
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });
  ensureClassCatalog(db);

  const session = findSessionByInput(db, body.sessionId) || findSessionByInput(db, body.sessionName) || getActiveSessionTerm(db).activeSession;
  const term = findTermByInput(db, body.termId, session?.id) || findTermByInput(db, body.termName, session?.id) || getActiveSessionTerm(db).activeTerm;

  if (!session || !term) return res.status(400).json({ message: "Unable to resolve session/term" });

  const resolver = createStudentIdResolver(db);
  const studentIdsDirect = resolver.resolveMany([...(Array.isArray(body.studentIds) ? body.studentIds : []), body.studentId]);
  const classIds = resolveClassIdsFromInput(db, body);

  let students = [];
  if (studentIdsDirect.length > 0) {
    students = (db.students || [])
      .filter((row) => !isArchivedStudent(row))
      .filter((row) => studentIdsDirect.includes(str(row.id)));
  } else if (classIds.length > 0) {
    students = (db.students || [])
      .filter((row) => !isArchivedStudent(row))
      .filter((row) => classIds.includes(resolveStudentClassId(db, row)));
  } else {
    students = Array.isArray(db.students) ? db.students.filter((row) => !isArchivedStudent(row)) : [];
  }

  if (students.length === 0) {
    return res.status(400).json({ message: "No students found for invoice generation" });
  }

  const feeStructures = (db.feeStructures || []).filter(
    (row) => str(row.sessionId) === str(session.id) && str(row.termId) === str(term.id)
  );

  const hasFallbackAmount = body.fallbackAmount !== undefined && str(body.fallbackAmount) !== "";
  const safeFallbackAmount = hasFallbackAmount ? normalizeMoney(body.fallbackAmount) : 0;
  const now = nowIso();
  const beforeIds = new Set((db.invoices || []).map((row) => str(row.id)));
  const touched = [];

  for (const student of students) {
    removeInvoiceSuppression(db, student.id, session.id, term.id);
    const invoice = createInvoiceForStudent({
      db,
      student,
      session,
      term,
      dueDate: str(body.dueDate),
      createdBy: req.user?.id || "system",
      feeStructures,
      fallbackAmount: safeFallbackAmount,
      includePreviousBalance: normalizeBool(body.includePreviousBalance),
      ignoreSuppression: true,
    });

    if (invoice) {
      invoice.updatedAt = now;
      touched.push(invoice);
    }
  }

  recalcAllInvoices(db);
  syncLegacyFeeInvoicesMirror(db);
  writeDB(db);

  const rows = touched
    .map((row) => toInvoiceAdminRow(db, row))
    .sort((a, b) => str(a.studentName).localeCompare(str(b.studentName)));

  const createdCount = rows.filter((row) => !beforeIds.has(str(row.id))).length;
  const existingCount = rows.length - createdCount;

  return res.json({
    generatedCount: rows.length,
    createdCount,
    existingCount,
    sessionId: str(session.id),
    termId: str(term.id),
    invoices: rows,
  });
});

function getSuccessfulInvoicePaymentTotal(db, invoiceId) {
  return (db.payments || [])
    .filter((row) => (
      str(row.invoiceId) === str(invoiceId) &&
      normalizePaymentStatus(row.status) === "SUCCESS"
    ))
    .reduce((sum, row) => sum + normalizeMoney(row.amount), 0);
}

function deleteUnpaidInvoiceRecord(db, invoice, payload = {}) {
  if (!invoice) return { deleted: false, reason: "NOT_FOUND" };
  if (getSuccessfulInvoicePaymentTotal(db, invoice.id) > 0) {
    return { deleted: false, reason: "HAS_SUCCESSFUL_PAYMENT" };
  }

  addInvoiceSuppression(db, invoice, {
    action: "DELETED",
    reason: payload.reason,
    createdBy: payload.createdBy,
  });

  const paymentIds = new Set(
    (db.payments || [])
      .filter((row) => str(row.invoiceId) === str(invoice.id))
      .map((row) => str(row.id))
  );
  db.receipts = (db.receipts || []).filter((row) => (
    str(row.invoiceId) !== str(invoice.id) &&
    !paymentIds.has(str(row.paymentId))
  ));
  db.payments = (db.payments || []).filter((row) => str(row.invoiceId) !== str(invoice.id));
  db.invoiceItems = (db.invoiceItems || []).filter((row) => str(row.invoiceId) !== str(invoice.id));
  db.discounts = (db.discounts || []).filter((row) => str(row.invoiceId) !== str(invoice.id));
  db.paymentLogs = (db.paymentLogs || []).filter((row) => str(row.invoiceId) !== str(invoice.id));
  db.invoices = (db.invoices || []).filter((row) => str(row.id) !== str(invoice.id));
  syncLegacyFeeInvoicesMirror(db);
  return { deleted: true, reason: "" };
}

router.patch("/admin/invoices/:invoiceId/cancel", auth(), requireRole(...PAYMENT_ADMIN_ROLES), (req, res) => {
  const db = readDB();
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });
  const invoice = (db.invoices || []).find((row) => str(row.id) === str(req.params.invoiceId));
  if (!invoice) return res.status(404).json({ message: "Invoice not found" });
  if (getSuccessfulInvoicePaymentTotal(db, invoice.id) > 0) {
    return res.status(409).json({ message: "This invoice has a successful payment and cannot be cancelled." });
  }

  const now = nowIso();
  invoice.status = "CANCELLED";
  invoice.cancelledAt = now;
  invoice.cancelledBy = str(req.user?.id);
  invoice.cancellationReason = str(req.body?.reason);
  invoice.updatedAt = now;
  addInvoiceSuppression(db, invoice, {
    action: "CANCELLED",
    reason: req.body?.reason,
    createdBy: req.user?.id,
  });
  syncLegacyFeeInvoicesMirror(db);
  writeDB(db);
  return res.json({ invoice: toInvoiceAdminRow(db, invoice) });
});

router.delete("/admin/invoices/:invoiceId", auth(), requireRole(...PAYMENT_ADMIN_ROLES), (req, res) => {
  const db = readDB();
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });
  const invoice = (db.invoices || []).find((row) => str(row.id) === str(req.params.invoiceId));
  if (!invoice) return res.status(404).json({ message: "Invoice not found" });

  const result = deleteUnpaidInvoiceRecord(db, invoice, {
    reason: "Deleted from finance invoice screen",
    createdBy: req.user?.id,
  });
  if (!result.deleted) {
    return res.status(409).json({ message: "This invoice has a successful payment and cannot be deleted." });
  }

  writeDB(db);
  return res.json({ deleted: true, invoiceId: str(invoice.id) });
});

router.post("/admin/invoices/bulk-cancel", auth(), requireRole(...PAYMENT_ADMIN_ROLES), (req, res) => {
  const ids = [...new Set((Array.isArray(req.body?.invoiceIds) ? req.body.invoiceIds : []).map(str).filter(Boolean))];
  if (!ids.length) return res.status(400).json({ message: "invoiceIds array is required" });

  const db = readDB();
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });
  let cancelledCount = 0;
  let skippedPaidCount = 0;
  let missingCount = 0;

  for (const id of ids) {
    const invoice = (db.invoices || []).find((row) => str(row.id) === id);
    if (!invoice) {
      missingCount += 1;
      continue;
    }
    if (getSuccessfulInvoicePaymentTotal(db, invoice.id) > 0) {
      skippedPaidCount += 1;
      continue;
    }
    const now = nowIso();
    invoice.status = "CANCELLED";
    invoice.cancelledAt = now;
    invoice.cancelledBy = str(req.user?.id);
    invoice.cancellationReason = str(req.body?.reason);
    invoice.updatedAt = now;
    addInvoiceSuppression(db, invoice, {
      action: "CANCELLED",
      reason: req.body?.reason,
      createdBy: req.user?.id,
    });
    cancelledCount += 1;
  }

  syncLegacyFeeInvoicesMirror(db);
  writeDB(db);
  return res.json({ requestedCount: ids.length, cancelledCount, skippedPaidCount, missingCount });
});

router.post("/admin/invoices/bulk-delete", auth(), requireRole(...PAYMENT_ADMIN_ROLES), (req, res) => {
  const ids = [...new Set((Array.isArray(req.body?.invoiceIds) ? req.body.invoiceIds : []).map(str).filter(Boolean))];
  if (!ids.length) return res.status(400).json({ message: "invoiceIds array is required" });

  const db = readDB();
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });
  let deletedCount = 0;
  let skippedPaidCount = 0;
  let missingCount = 0;

  for (const id of ids) {
    const invoice = (db.invoices || []).find((row) => str(row.id) === id);
    if (!invoice) {
      missingCount += 1;
      continue;
    }
    const result = deleteUnpaidInvoiceRecord(db, invoice, {
      reason: req.body?.reason,
      createdBy: req.user?.id,
    });
    if (result.deleted) deletedCount += 1;
    else skippedPaidCount += 1;
  }

  syncLegacyFeeInvoicesMirror(db);
  writeDB(db);
  return res.json({ requestedCount: ids.length, deletedCount, skippedPaidCount, missingCount });
});

router.get("/admin/invoices", auth(), requireRole(...PAYMENT_ADMIN_ROLES), async (req, res) => {
  const db = readDB();
  await syncStudentRosterFromPrisma(db);
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });
  ensureClassCatalog(db);
  syncAllStudentInvoicesAndFinancePayments(db, req.user || {});
  recalcAllInvoices(db);

  const scopedQuery = withDefaultAdminFinanceScope(db, req.query || {});
  const rows = (db.invoices || []).map((row) => toInvoiceAdminRow(db, row));
  const filtered = filterInvoices(rows, scopedQuery).sort((a, b) => str(b.updatedAt).localeCompare(str(a.updatedAt)));

  writeDB(db);

  return res.json({
    currency: SCHOOL_CURRENCY,
    records: filtered,
    totalCount: filtered.length,
    classOptions: (db.classes || []).map((row) => ({ id: str(row.id), name: str(row.name) })),
    statusOptions: ["UNPAID", "PARTIAL", "PAID", "OVERDUE", "CANCELLED"],
  });
});

function reverseAdminPaymentRecord(req, res) {
  const db = readDB();
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });
  ensureClassCatalog(db);

  const safeId = str(req.params.paymentId);
  const payment = (db.payments || []).find(
    (row) => str(row.id) === safeId || str(row.paymentReference || row.reference) === safeId
  );
  if (!payment) return res.status(404).json({ message: "Payment record not found" });

  if (normalizePaymentStatus(payment.status) === "REVERSED") {
    return res.status(409).json({ message: "Payment has already been reversed" });
  }

  const oldValue = { ...payment };
  const reason = str(req.body?.reason || req.query?.reason || "Payment reversed by finance office");
  payment.status = "REVERSED";
  payment.reversedAt = nowIso();
  payment.reversedBy = str(req.user?.id || req.user?.name || req.user?.username);
  payment.reversalReason = reason;
  payment.updatedAt = nowIso();

  const financeMirrors = (db.financePayments || []).filter((row) => (
    str(row.id) === str(payment.financePaymentId) ||
    str(row.reference) === str(payment.paymentReference || payment.reference)
  ));
  for (const mirror of financeMirrors) {
    mirror.status = "voided";
    mirror.voidedAt = payment.reversedAt;
    mirror.voidedBy = payment.reversedBy;
    mirror.voidReason = reason;
    mirror.updatedAt = nowIso();
  }

  if (payment.invoiceId) recalcInvoiceAmounts(db, payment.invoiceId);
  syncLegacyFeeInvoicesMirror(db);

  appendFinanceAuditLog(db, {
    action: "admin_payment_reversed",
    entityType: "payment",
    entityId: payment.id,
    performedBy: payment.reversedBy,
    reason,
    before: oldValue,
    after: payment,
  });

  writeDB(db);
  return res.json({ payment: paymentToAdminRow(db, payment), reversedMirrorCount: financeMirrors.length });
}

router.patch("/admin/payments/:paymentId/reverse", auth(), requireRole(...PAYMENT_ADMIN_ROLES), (req, res) => {
  return reverseAdminPaymentRecord(req, res);
});

router.delete("/admin/payments/:paymentId", auth(), requireRole(...PAYMENT_ADMIN_ROLES), (req, res) => {
  return reverseAdminPaymentRecord(req, res);
});

router.get("/admin/receipts", auth(), requireRole(...PAYMENT_ADMIN_ROLES), (req, res) => {
  const db = readDB();
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });
  ensureClassCatalog(db);
  recalcAllInvoices(db);

  const records = buildReceiptRows(db, withDefaultAdminFinanceScope(db, req.query || {}));
  writeDB(db);
  return res.json({
    currency: SCHOOL_CURRENCY,
    records,
    totalCount: records.length,
  });
});

router.get("/admin/reports", auth(), requireRole(...PAYMENT_ADMIN_ROLES), (req, res) => {
  const db = readDB();
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });
  ensureClassCatalog(db);
  recalcAllInvoices(db);

  const scopedQuery = withDefaultAdminFinanceScope(db, req.query || {});
  const rows = (db.invoices || []).map((row) => toInvoiceAdminRow(db, row));
  const filtered = filterInvoices(rows, scopedQuery);

  const overview = buildFinanceOverview(db, scopedQuery);
  const byClass = buildReportByClass(db, filtered);
  const byTerm = buildReportByTerm(db, filtered);
  const byFeeType = buildReportByFeeType(db, filtered);
  const outstanding = buildOutstandingList(filtered).slice(0, 200);

  writeDB(db);

  return res.json({
    currency: SCHOOL_CURRENCY,
    overview,
    reports: {
      byClass,
      byTerm,
      byFeeType,
      outstanding,
    },
  });
});

router.get("/admin/summary", auth(), requireRole(...PAYMENT_ADMIN_ROLES), (req, res) => {
  const db = readDB();
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });
  ensureClassCatalog(db);
  recalcAllInvoices(db);

  const scopedQuery = withDefaultAdminFinanceScope(db, req.query || {});
  const rows = filterAdminRows(buildAdminRows(db), scopedQuery);
  const successful = rows.filter((row) => normalizePaymentStatus(row.status) === "SUCCESS");
  const pending = rows.filter((row) => normalizePaymentStatus(row.status) === "PENDING");
  const failed = rows.filter((row) => normalizePaymentStatus(row.status) === "FAILED");

  const totalSuccessAmount = successful.reduce((sum, row) => sum + normalizeMoney(row.amount), 0);
  const financeOverview = buildFinanceOverview(db, scopedQuery);

  writeDB(db);

  return res.json({
    currency: SCHOOL_CURRENCY,
    totalCount: rows.length,
    successfulCount: successful.length,
    pendingCount: pending.length,
    failedCount: failed.length,
    totalSuccessAmount: normalizeMoney(totalSuccessAmount),
    ...financeOverview,
  });
});

router.get("/admin/records", auth(), requireRole(...PAYMENT_ADMIN_ROLES), (req, res) => {
  const db = readDB();
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });
  ensureClassCatalog(db);
  recalcAllInvoices(db);

  const scopedQuery = withDefaultAdminFinanceScope(db, req.query || {});
  const rows = filterAdminRows(buildAdminRows(db), scopedQuery)
    .sort((a, b) => str(b.createdAt).localeCompare(str(a.createdAt)));

  const classOptions = Array.from(new Set((db.classes || []).map((row) => str(row.name)).filter(Boolean))).sort((a, b) => a.localeCompare(b));

  writeDB(db);

  return res.json({
    currency: SCHOOL_CURRENCY,
    classOptions,
    records: rows,
    totalCount: rows.length,
  });
});

router.get("/admin/export", auth(), requireRole(...PAYMENT_ADMIN_ROLES), (req, res) => {
  const db = readDB();
  ensurePaymentCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });
  ensureClassCatalog(db);

  const scopedQuery = withDefaultAdminFinanceScope(db, req.query || {});
  const rows = filterAdminRows(buildAdminRows(db), scopedQuery)
    .sort((a, b) => str(b.createdAt).localeCompare(str(a.createdAt)));

  const headers = [
    "reference",
    "type",
    "status",
    "amount",
    "currency",
    "role",
    "userName",
    "username",
    "studentName",
    "className",
    "invoiceLabel",
    "session",
    "term",
    "provider",
    "createdAt",
    "paidAt",
  ];

  const lines = [headers.join(",")];
  for (const row of rows) {
    const line = headers
      .map((key) => escapeCsvValue(row[key]))
      .join(",");
    lines.push(line);
  }

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="payments-export-${Date.now()}.csv"`);
  return res.status(200).send(lines.join("\n"));
});

router.post("/webhook/paystack", async (req, res) => {
  const signatureCheck = verifyPaystackWebhookSignature(req);
  if (!signatureCheck.ok) {
    return res.status(signatureCheck.status).json({ message: signatureCheck.message });
  }

  const payload = req.body || {};
  const reference = str(payload?.data?.reference);
  if (!reference) return res.status(200).json({ ok: true });

  const db = readDB();
  ensurePaymentCollections(db);
  ensureDonationCollections(db);
  ensureFinanceDefaults(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });

  const idx = (db.payments || []).findIndex((row) => str(row.paymentReference || row.reference) === reference);
  if (idx < 0) {
    const donation = getDonationByReference(db, reference);
    if (!donation) return res.status(200).json({ ok: true });

    const log = appendDonationWebhookLog(db, {
      donationId: donation.id,
      reference,
      event: str(payload?.event || payloadData?.status || "paystack_webhook"),
      status: "received",
      payload,
    });

    try {
      const { amountMatch, currencyMatch } = validatePaystackAmountCurrency(donation, payloadData);
      donation.gatewayPayload = {
        ...(donation.gatewayPayload || {}),
        webhook: payload,
      };

      if (isPaystackSuccess(payloadData) && amountMatch && currencyMatch) {
        await finalizeDonationSuccess(db, donation, payloadData, "payments_webhook");
        updateWebhookLog(log, { status: "processed", notes: "Donation marked successful", processedAt: nowIso() });
      } else if (!amountMatch || !currencyMatch || isPaystackFailure(payloadData)) {
        finalizeDonationFailure(db, donation, payloadData, "payments_webhook");
        updateWebhookLog(log, { status: "processed", notes: "Donation marked failed", processedAt: nowIso() });
      } else {
        updateWebhookLog(log, { status: "processed", notes: "Donation left pending after webhook", processedAt: nowIso() });
      }

      writeDB(db);
      return res.status(200).json({ ok: true });
    } catch (error) {
      updateWebhookLog(log, { status: "failed", notes: str(error?.message || "Donation webhook handling failed"), processedAt: nowIso() });
      writeDB(db);
      return res.status(200).json({ ok: true });
    }
  }

  const payment = db.payments[idx];
  const currentStatus = normalizePaymentStatus(payment.status);
  const payloadData = payload?.data || {};

  if (currentStatus === "SUCCESS") {
    return res.status(200).json({ ok: true });
  }

  const { amountMatch, currencyMatch } = validateWebhookAmountCurrency(payment, payloadData);
  const chargeSuccess = isPaystackChargeSuccessful(payload);
  const chargeFailed = isPaystackChargeFailed(payload);

  let nextStatus = currentStatus;
  if (!amountMatch || !currencyMatch) {
    nextStatus = "FAILED";
  } else if (chargeSuccess) {
    nextStatus = "SUCCESS";
  } else if (chargeFailed) {
    nextStatus = "FAILED";
  }

  const now = nowIso();
  db.payments[idx] = {
    ...payment,
    status: nextStatus,
    paidAt: nextStatus === "SUCCESS" ? str(payment.paidAt) || now : "",
    verifiedAt: now,
    gatewayReference: str(payloadData.reference || payment.gatewayReference),
    rawResponse: payloadData,
    gatewayPayload: {
      ...(payment.gatewayPayload || {}),
      webhook: payload,
    },
    updatedAt: now,
  };

  if (nextStatus === "SUCCESS") {
    applyPaymentSuccess(db, db.payments[idx]);
  }

  syncLegacyFeeInvoicesMirror(db);
  writeDB(db);

  return res.status(200).json({ ok: true });
});

module.exports = router;

































