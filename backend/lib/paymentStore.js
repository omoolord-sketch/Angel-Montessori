const { nanoid } = require("nanoid");
const { ensureAcademicScope } = require("./academicScope");

function nowIso() {
  return new Date().toISOString();
}

function str(value) {
  return String(value || "").trim();
}

function normalizeMoney(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return 0;
  return Number(amount.toFixed(2));
}

function normalizeBool(value) {
  if (typeof value === "boolean") return value;
  const text = str(value).toLowerCase();
  return text === "true" || text === "1" || text === "yes";
}

function normalizeInvoiceStatus(value) {
  const status = str(value).toUpperCase();
  const allowed = new Set(["UNPAID", "PARTIAL", "PAID", "OVERDUE", "CANCELLED"]);
  return allowed.has(status) ? status : "UNPAID";
}

function normalizePaymentStatus(value) {
  const status = str(value).toUpperCase();
  const allowed = new Set(["PENDING", "SUCCESS", "FAILED", "REVERSED"]);
  return allowed.has(status) ? status : "PENDING";
}

function normalizeStructureType(value, fallbackOptional) {
  const type = str(value).toUpperCase();
  if (type === "COMPULSORY" || type === "OPTIONAL") return type;
  return normalizeBool(fallbackOptional) ? "OPTIONAL" : "COMPULSORY";
}

function normalizeFinanceSectionName(value) {
  const safe = str(value);
  const key = safe.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (key === "basic" || key === "basicschool" || key === "primaryschool") return "Primary";
  if (key === "earlyyears" || key === "nursery" || key === "preschool") return "Early Years";
  if (key === "juniorsecondary" || key === "juniorsecondaryschool" || key === "jss") return "Junior Secondary";
  if (key === "seniorsecondary" || key === "seniorsecondaryschool" || key === "sss") return "Senior Secondary";
  return safe || "Other";
}

function buildSlug(value) {
  return str(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "na";
}

function createSequenceCounter() {
  const state = new Map();

  return {
    next(prefix, year) {
      const key = `${prefix}-${year}`;
      const current = state.get(key) || 0;
      const nextValue = current + 1;
      state.set(key, nextValue);
      return `${prefix}-${year}-${String(nextValue).padStart(5, "0")}`;
    },
  };
}

function ensurePaymentCollections(db) {
  if (!Array.isArray(db.payments)) db.payments = [];
  if (!Array.isArray(db.feeInvoices)) db.feeInvoices = []; // legacy

  if (!Array.isArray(db.academicSessions)) db.academicSessions = [];
  if (!Array.isArray(db.terms)) db.terms = [];
  if (!Array.isArray(db.feeTypes)) db.feeTypes = [];
  if (!Array.isArray(db.feeStructures)) db.feeStructures = [];
  if (!Array.isArray(db.invoices)) db.invoices = [];
  if (!Array.isArray(db.invoiceItems)) db.invoiceItems = [];
  if (!Array.isArray(db.receipts)) db.receipts = [];
  if (!Array.isArray(db.discounts)) db.discounts = [];
  if (!Array.isArray(db.studentFeeAssignments)) db.studentFeeAssignments = [];
  if (!Array.isArray(db.paymentLogs)) db.paymentLogs = [];
  if (!Array.isArray(db.invoiceSuppressions)) db.invoiceSuppressions = [];
  if (!Array.isArray(db.financeSections)) db.financeSections = [];
  if (!Array.isArray(db.paymentAllocations)) db.paymentAllocations = [];
  if (!Array.isArray(db.financeAdjustments)) db.financeAdjustments = [];
  if (!Array.isArray(db.financeAuditLogs)) db.financeAuditLogs = [];
  if (!Array.isArray(db.financeCreditBalances)) db.financeCreditBalances = [];
}

function ensureFinanceDefaults(db, options = {}) {
  ensurePaymentCollections(db);

  const currentYear = new Date().getFullYear();
  const defaultSessionName = str(options.currentSession) || `${currentYear}/${currentYear + 1}`;
  const defaultTermName = str(options.currentTerm) || "First Term";
  const now = nowIso();
  const { activeSession: activeSessionRow, activeTerm: activeTermRow } = ensureAcademicScope(db, {
    currentSession: defaultSessionName,
    currentTerm: defaultTermName,
  });

  const defaultFeeTypes = [
    { feeName: "Tuition", feeCode: "TUITION", category: "tuition", isRecurring: true },
    { feeName: "Exam Fee", feeCode: "EXAM", category: "examination", isRecurring: true },
    { feeName: "ICT Levy", feeCode: "ICT", category: "levy", isRecurring: true },
    { feeName: "Development Levy", feeCode: "DEVELOPMENT", category: "levy", isRecurring: true },
    { feeName: "PTA Levy", feeCode: "PTA", category: "levy", isRecurring: true },
    { feeName: "Library Fee", feeCode: "LIBRARY", category: "levy", isRecurring: true },
    { feeName: "Sports Fee", feeCode: "SPORTS", category: "levy", isRecurring: true },
    { feeName: "Transport", feeCode: "TRANSPORT", category: "transport", isRecurring: true },
    { feeName: "Lunch", feeCode: "LUNCH", category: "feeding", isRecurring: true },
    { feeName: "Hostel", feeCode: "HOSTEL", category: "boarding", isRecurring: true },
    { feeName: "Books", feeCode: "BOOKS", category: "books", isRecurring: false },
    { feeName: "Uniform", feeCode: "UNIFORM", category: "uniform", isRecurring: false },
    { feeName: "Practical Fee", feeCode: "PRACTICAL", category: "practical", isRecurring: false },
    { feeName: "Application Fee", feeCode: "APPLICATION", category: "registration", isRecurring: false },
    { feeName: "Acceptance Fee", feeCode: "ACCEPTANCE", category: "registration", isRecurring: false },
    { feeName: "Caution Fee", feeCode: "CAUTION", category: "special_event", isRecurring: false },
  ];

  for (const item of defaultFeeTypes) {
    const exists = db.feeTypes.find((row) => str(row.feeCode).toUpperCase() === str(item.feeCode).toUpperCase());
    if (!exists) {
      db.feeTypes.unshift({
        id: nanoid(),
        feeName: item.feeName,
        feeCode: item.feeCode,
        category: item.category,
        isRecurring: Boolean(item.isRecurring),
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  normalizeFinanceRows(db);
  migrateLegacyFeeInvoices(db, { now, defaultSession: activeSessionRow, defaultTerm: activeTermRow });
  syncLegacyFeeInvoicesMirror(db);

  return {
    activeSession: activeSessionRow,
    activeTerm: activeTermRow,
  };
}

function normalizeFinanceRows(db) {
  ensurePaymentCollections(db);

  const defaultSections = [
    { sectionName: "Early Years", order: 1 },
    { sectionName: "Primary", order: 2 },
    { sectionName: "Junior Secondary", order: 3 },
    { sectionName: "Senior Secondary", order: 4 },
  ];

  for (const seed of defaultSections) {
    const exists = (db.financeSections || []).some(
      (row) => normalizeFinanceSectionName(row.sectionName || row.name).toLowerCase() === seed.sectionName.toLowerCase()
    );
    if (!exists) {
      db.financeSections.push({
        id: buildSlug(seed.sectionName),
        sectionName: seed.sectionName,
        name: seed.sectionName,
        order: seed.order,
        isActive: true,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
    }
  }

  db.financeSections = (db.financeSections || []).map((row, index) => {
    const sectionName = normalizeFinanceSectionName(row.sectionName || row.name);
    return {
      ...row,
      id: str(row.id) || buildSlug(sectionName),
      sectionName,
      name: sectionName,
      order: Number(row.order || index + 1),
      isActive: row.isActive === undefined ? true : normalizeBool(row.isActive),
      createdAt: str(row.createdAt || nowIso()),
      updatedAt: str(row.updatedAt || nowIso()),
    };
  });

  db.feeTypes = (db.feeTypes || []).map((row) => ({
    ...row,
    feeName: str(row.feeName),
    feeCode: str(row.feeCode).toUpperCase(),
    category: str(row.category) || "general",
    isRecurring: normalizeBool(row.isRecurring),
  }));

  db.feeStructures = (db.feeStructures || []).map((row) => ({
    ...row,
    sessionId: str(row.sessionId),
    termId: str(row.termId),
    sectionId: str(row.sectionId),
    classId: str(row.classId),
    feeTypeId: str(row.feeTypeId),
    amount: normalizeMoney(row.amount),
    isOptional: normalizeBool(row.isOptional),
    structureType: normalizeStructureType(row.structureType, row.isOptional),
    isActive: row.isActive === undefined ? true : normalizeBool(row.isActive),
    dueDate: str(row.dueDate),
  }));

  db.invoices = (db.invoices || []).map((row) => ({
    ...row,
    invoiceNumber: str(row.invoiceNumber),
    studentId: str(row.studentId),
    sessionId: str(row.sessionId),
    termId: str(row.termId),
    sessionNameSnapshot: str(row.sessionNameSnapshot || row.sessionName),
    termNameSnapshot: str(row.termNameSnapshot || row.termName),
    studentNameSnapshot: str(row.studentNameSnapshot || row.studentName),
    admissionNumberSnapshot: str(row.admissionNumberSnapshot || row.admissionNumber || row.admissionNo),
    classIdSnapshot: str(row.classIdSnapshot || row.classId),
    classNameSnapshot: str(row.classNameSnapshot || row.className),
    sectionIdSnapshot: str(row.sectionIdSnapshot || row.sectionId),
    sectionNameSnapshot: normalizeFinanceSectionName(row.sectionNameSnapshot || row.sectionName),
    snapshotLocked: row.snapshotLocked === undefined ? Boolean(row.invoiceNumber) : normalizeBool(row.snapshotLocked),
    totalAmount: normalizeMoney(row.totalAmount),
    amountPaid: normalizeMoney(row.amountPaid),
    balance: normalizeMoney(row.balance),
    status: normalizeInvoiceStatus(row.status),
    dueDate: str(row.dueDate),
    createdBy: str(row.createdBy),
  }));

  db.invoiceItems = (db.invoiceItems || []).map((row) => ({
    ...row,
    invoiceId: str(row.invoiceId),
    feeTypeId: str(row.feeTypeId),
    description: str(row.description),
    feeNameSnapshot: str(row.feeNameSnapshot || row.feeName || row.description),
    feeCodeSnapshot: str(row.feeCodeSnapshot || row.feeCode),
    feeCategorySnapshot: str(row.feeCategorySnapshot || row.feeCategory || row.category),
    structureTypeSnapshot: normalizeStructureType(row.structureTypeSnapshot || row.structureType, row.isOptional),
    originalAmount: normalizeMoney(row.originalAmount || row.amount),
    discountAmount: normalizeMoney(row.discountAmount),
    adjustmentAmount: normalizeMoney(row.adjustmentAmount),
    sourceType: str(row.sourceType).toUpperCase(),
    sourceId: str(row.sourceId),
    amount: normalizeMoney(row.amount),
  }));

  db.payments = (db.payments || []).map((row) => ({
    ...row,
    paymentReference: str(row.paymentReference || row.reference),
    reference: str(row.reference || row.paymentReference),
    invoiceId: str(row.invoiceId),
    studentId: str(row.studentId),
    userId: str(row.userId),
    role: str(row.role).toUpperCase(),
    gatewayName: str(row.gatewayName || row.provider || "MOCK"),
    provider: str(row.provider || row.gatewayName || "MOCK"),
    gatewayReference: str(row.gatewayReference),
    amount: normalizeMoney(row.amount),
    currency: str(row.currency || "NGN").toUpperCase(),
    paymentMethod: str(row.paymentMethod || "ONLINE").toUpperCase(),
    status: normalizePaymentStatus(row.status),
    paidAt: str(row.paidAt),
    verifiedAt: str(row.verifiedAt),
  }));

  db.receipts = (db.receipts || []).map((row) => ({
    ...row,
    receiptNumber: str(row.receiptNumber),
    paymentId: str(row.paymentId),
    invoiceId: str(row.invoiceId),
    studentId: str(row.studentId),
    pdfPath: str(row.pdfPath),
    issuedAt: str(row.issuedAt),
  }));

  db.discounts = (db.discounts || []).map((row) => ({
    ...row,
    studentId: str(row.studentId),
    invoiceId: str(row.invoiceId),
    discountType: str(row.discountType || "SPECIAL_ADJUSTMENT").toUpperCase(),
    amount: normalizeMoney(row.amount),
    reason: str(row.reason),
    approvedBy: str(row.approvedBy),
  }));

  db.financeAdjustments = (db.financeAdjustments || []).map((row) => ({
    ...row,
    studentId: str(row.studentId),
    invoiceId: str(row.invoiceId),
    adjustmentType: str(row.adjustmentType || row.type || "DEBIT").toUpperCase(),
    mode: str(row.mode || "AMOUNT").toUpperCase(),
    value: normalizeMoney(row.value || row.amount),
    amount: normalizeMoney(row.amount || row.value),
    reason: str(row.reason),
    approvalStatus: str(row.approvalStatus || "APPROVED").toUpperCase(),
    approvedBy: str(row.approvedBy),
    createdBy: str(row.createdBy),
    createdAt: str(row.createdAt || nowIso()),
    updatedAt: str(row.updatedAt || nowIso()),
  }));

  db.studentFeeAssignments = (db.studentFeeAssignments || []).map((row) => ({
    ...row,
    studentId: str(row.studentId),
    sessionId: str(row.sessionId),
    termId: str(row.termId),
    feeTypeId: str(row.feeTypeId),
    amount: normalizeMoney(row.amount),
    dueDate: str(row.dueDate),
    isActive: row.isActive === undefined ? true : normalizeBool(row.isActive),
    notes: str(row.notes),
  }));

  db.paymentLogs = (db.paymentLogs || []).map((row) => ({
    ...row,
    invoiceId: str(row.invoiceId),
    paymentId: str(row.paymentId),
    action: str(row.action),
    performedBy: str(row.performedBy),
    notes: str(row.notes),
  }));

  db.paymentAllocations = (db.paymentAllocations || []).map((row) => ({
    ...row,
    paymentId: str(row.paymentId),
    invoiceId: str(row.invoiceId),
    studentId: str(row.studentId),
    amount: normalizeMoney(row.amount),
    allocationMode: str(row.allocationMode || "AUTO_OLDEST_FIRST").toUpperCase(),
    createdBy: str(row.createdBy),
    createdAt: str(row.createdAt || nowIso()),
  }));

  db.financeAuditLogs = (db.financeAuditLogs || []).map((row) => ({
    ...row,
    id: str(row.id) || nanoid(),
    action: str(row.action),
    entityType: str(row.entityType),
    entityId: str(row.entityId),
    performedBy: str(row.performedBy),
    notes: str(row.notes),
    before: row.before && typeof row.before === "object" ? row.before : null,
    after: row.after && typeof row.after === "object" ? row.after : null,
    createdAt: str(row.createdAt || nowIso()),
  }));

  db.financeCreditBalances = (db.financeCreditBalances || []).map((row) => ({
    ...row,
    studentId: str(row.studentId),
    amount: normalizeMoney(row.amount),
    currency: str(row.currency || "NGN").toUpperCase(),
    reason: str(row.reason),
    createdAt: str(row.createdAt || nowIso()),
    updatedAt: str(row.updatedAt || nowIso()),
  }));
}
function migrateLegacyFeeInvoices(db, { now, defaultSession, defaultTerm }) {
  ensurePaymentCollections(db);
  const students = Array.isArray(db.students) ? db.students : [];
  const sessionByName = new Map((db.academicSessions || []).map((row) => [str(row.sessionName).toLowerCase(), row]));
  const termBySessionAndName = new Map(
    (db.terms || []).map((row) => [`${str(row.sessionId)}::${str(row.termName).toLowerCase()}`, row])
  );

  const tuitionType =
    (db.feeTypes || []).find((item) => str(item.feeCode).toUpperCase() === "TUITION") ||
    (db.feeTypes || [])[0] ||
    null;

  for (const legacy of db.feeInvoices || []) {
    const studentId = str(legacy.studentId);
    if (!studentId) continue;

    const sessionName = str(legacy.session) || str(defaultSession?.sessionName);
    const termName = str(legacy.term) || str(defaultTerm?.termName);

    const session = sessionByName.get(sessionName.toLowerCase()) || defaultSession;
    const term =
      termBySessionAndName.get(`${str(session?.id)}::${termName.toLowerCase()}`) ||
      defaultTerm;

    if (!session || !term) continue;

    const existing = (db.invoices || []).find(
      (row) =>
        str(row.studentId) === studentId &&
        str(row.sessionId) === str(session.id) &&
        str(row.termId) === str(term.id)
    );

    if (existing) continue;

    const invoiceId = nanoid();
    const invoiceNumber = createFinanceDocumentNumber(db.invoices || [], "INV", now);
    const amount = normalizeMoney(legacy.amount);

    db.invoices.unshift({
      id: invoiceId,
      invoiceNumber,
      studentId,
      sessionId: str(session.id),
      termId: str(term.id),
      sessionNameSnapshot: str(session.sessionName),
      termNameSnapshot: str(term.termName),
      studentNameSnapshot: str(student?.name),
      admissionNumberSnapshot: str(student?.admissionNumber || student?.admissionNo || student?.studentId),
      classIdSnapshot: str(student?.classId),
      classNameSnapshot: str(student?.className),
      sectionIdSnapshot: "",
      sectionNameSnapshot: "",
      snapshotLocked: true,
      totalAmount: amount,
      amountPaid: 0,
      balance: amount,
      status: "UNPAID",
      dueDate: str(legacy.dueDate || ""),
      createdBy: "system:migration",
      createdAt: str(legacy.createdAt || now),
      updatedAt: now,
    });

    db.invoiceItems.unshift({
      id: nanoid(),
      invoiceId,
      feeTypeId: str(tuitionType?.id),
      description: str(legacy.label || "School Fees"),
      feeNameSnapshot: str(tuitionType?.feeName || legacy.label || "School Fees"),
      feeCodeSnapshot: str(tuitionType?.feeCode || "TUITION"),
      feeCategorySnapshot: str(tuitionType?.category || "tuition"),
      structureTypeSnapshot: "COMPULSORY",
      originalAmount: amount,
      discountAmount: 0,
      adjustmentAmount: 0,
      amount,
      createdAt: now,
      updatedAt: now,
    });

    db.paymentLogs.unshift({
      id: nanoid(),
      invoiceId,
      paymentId: "",
      action: "invoice_created_migration",
      performedBy: "system:migration",
      notes: `Migrated from legacy feeInvoices for student ${studentId}`,
      createdAt: now,
    });

    const student = students.find((row) => str(row.id) === studentId);
    if (student && !str(student.classId) && str(student.className)) {
      student.classId = buildSlug(student.className);
    }
  }
}

function createFinanceDocumentNumber(existingRows, prefix, nowValue) {
  const now = new Date(str(nowValue) || Date.now());
  const year = String(now.getFullYear());
  const safePrefix = str(prefix).toUpperCase() || "DOC";

  const seq = (existingRows || []).reduce((max, item) => {
    const number = str(item.invoiceNumber || item.receiptNumber || "");
    const match = number.match(new RegExp(`^${safePrefix}-${year}-(\\d{5})$`));
    if (!match) return max;
    return Math.max(max, Number(match[1] || 0));
  }, 0);

  return `${safePrefix}-${year}-${String(seq + 1).padStart(5, "0")}`;
}

function syncLegacyFeeInvoicesMirror(db) {
  ensurePaymentCollections(db);

  const sessionById = new Map((db.academicSessions || []).map((row) => [str(row.id), row]));
  const termById = new Map((db.terms || []).map((row) => [str(row.id), row]));

  db.feeInvoices = (db.invoices || []).map((invoice) => ({
    id: str(invoice.id),
    type: "SCHOOL_FEE",
    studentId: str(invoice.studentId),
    session: str(invoice.sessionNameSnapshot || sessionById.get(str(invoice.sessionId))?.sessionName),
    term: str(invoice.termNameSnapshot || termById.get(str(invoice.termId))?.termName),
    label: str(invoice.invoiceNumber || "School Fee Invoice"),
    amount: normalizeMoney(invoice.totalAmount),
    currency: "NGN",
    dueDate: str(invoice.dueDate),
    createdAt: str(invoice.createdAt),
    updatedAt: str(invoice.updatedAt),
  }));
}

function recalcInvoiceAmounts(db, invoiceId) {
  ensurePaymentCollections(db);
  const id = str(invoiceId);
  if (!id) return null;

  const idx = (db.invoices || []).findIndex((row) => str(row.id) === id);
  if (idx < 0) return null;

  const invoice = db.invoices[idx];

  const itemTotal = (db.invoiceItems || [])
    .filter((row) => str(row.invoiceId) === id)
    .reduce((sum, row) => sum + normalizeMoney(row.amount), 0);

  const discountTotal = (db.discounts || [])
    .filter((row) => str(row.invoiceId) === id)
    .reduce((sum, row) => sum + normalizeMoney(row.amount), 0);

  const approvedAdjustments = (db.financeAdjustments || [])
    .filter((row) => str(row.invoiceId) === id)
    .filter((row) => str(row.approvalStatus || "APPROVED").toUpperCase() === "APPROVED");

  const debitAdjustments = approvedAdjustments
    .filter((row) => !["CREDIT", "DISCOUNT", "WAIVER"].includes(str(row.adjustmentType).toUpperCase()))
    .reduce((sum, row) => sum + normalizeMoney(row.amount), 0);

  const creditAdjustments = approvedAdjustments
    .filter((row) => ["CREDIT", "DISCOUNT", "WAIVER"].includes(str(row.adjustmentType).toUpperCase()))
    .reduce((sum, row) => sum + normalizeMoney(row.amount), 0);

  const totalAmount = Math.max(0, normalizeMoney(itemTotal + debitAdjustments - discountTotal - creditAdjustments));

  const seenPaymentKeys = new Set();
  const paidAmount = (db.payments || [])
    .filter(
      (row) =>
        str(row.invoiceId) === id &&
        normalizePaymentStatus(row.status) === "SUCCESS"
    )
    .filter((row) => {
      const key = [
        str(row.financePaymentId),
        str(row.gatewayReference),
        str(row.paymentReference || row.reference),
        str(row.id),
      ].find(Boolean);
      if (!key) return true;
      const scopedKey = `${id}::${key.toLowerCase()}`;
      if (seenPaymentKeys.has(scopedKey)) return false;
      seenPaymentKeys.add(scopedKey);
      return true;
    })
    .reduce((sum, row) => sum + normalizeMoney(row.amount), 0);

  const balance = Math.max(0, normalizeMoney(totalAmount - paidAmount));
  const wasCancelled = normalizeInvoiceStatus(invoice.status) === "CANCELLED";
  let status = wasCancelled
    ? "CANCELLED"
    : balance <= 0
      ? "PAID"
      : paidAmount > 0
        ? "PARTIAL"
        : "UNPAID";

  if (!wasCancelled && status !== "PAID") {
    const dueDate = str(invoice.dueDate);
    if (dueDate) {
      const due = new Date(dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (!Number.isNaN(due.getTime()) && due < today) {
        status = "OVERDUE";
      }
    }
  }

  db.invoices[idx] = {
    ...invoice,
    totalAmount,
    amountPaid: normalizeMoney(paidAmount),
    balance,
    status,
    updatedAt: nowIso(),
  };

  return db.invoices[idx];
}

function hasSuccessfulApplicationFeePayment(db, applicantUserId) {
  ensurePaymentCollections(db);
  const userId = str(applicantUserId);
  if (!userId) return false;

  return db.payments.some(
    (item) =>
      str(item.userId) === userId &&
      str(item.type).toUpperCase() === "APPLICATION_FEE" &&
      normalizePaymentStatus(item.status) === "SUCCESS"
  );
}

function getSuccessfulInvoicePaidAmount(db, invoiceId) {
  ensurePaymentCollections(db);
  const id = str(invoiceId);
  if (!id) return 0;

  return db.payments
    .filter(
      (item) =>
        str(item.invoiceId) === id &&
        str(item.type).toUpperCase() === "STUDENT_FEE" &&
        normalizePaymentStatus(item.status) === "SUCCESS"
    )
    .reduce((sum, item) => sum + normalizeMoney(item.amount), 0);
}

function appendFinanceAuditLog(db, payload = {}) {
  ensurePaymentCollections(db);
  const row = {
    id: nanoid(),
    action: str(payload.action),
    entityType: str(payload.entityType),
    entityId: str(payload.entityId),
    performedBy: str(payload.performedBy || payload.userId || payload.userName),
    userName: str(payload.userName),
    ipAddress: str(payload.ipAddress),
    notes: str(payload.notes),
    reason: str(payload.reason),
    before: payload.before && typeof payload.before === "object" ? payload.before : payload.oldValue && typeof payload.oldValue === "object" ? payload.oldValue : null,
    after: payload.after && typeof payload.after === "object" ? payload.after : payload.newValue && typeof payload.newValue === "object" ? payload.newValue : null,
    createdAt: nowIso(),
  };
  db.financeAuditLogs.unshift(row);
  return row;
}

module.exports = {
  nowIso,
  str,
  normalizeMoney,
  normalizeBool,
  normalizeInvoiceStatus,
  normalizePaymentStatus,
  normalizeFinanceSectionName,
  ensurePaymentCollections,
  ensureFinanceDefaults,
  createFinanceDocumentNumber,
  syncLegacyFeeInvoicesMirror,
  recalcInvoiceAmounts,
  appendFinanceAuditLog,
  hasSuccessfulApplicationFeePayment,
  getSuccessfulInvoicePaidAmount,
};







