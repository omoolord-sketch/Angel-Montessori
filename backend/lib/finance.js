const { nanoid } = require("nanoid");
const {
  str,
  nowIso,
  normalizeMoney,
  normalizePaymentStatus,
  ensureFinanceDefaults,
  createFinanceDocumentNumber,
  syncLegacyFeeInvoicesMirror,
  recalcInvoiceAmounts,
  appendFinanceAuditLog,
} = require("./paymentStore");
const { setActiveAcademicScope, findAcademicTerm } = require("./academicScope");
const { isArchivedStudent } = require("./studentRosterSync");
const { ensureAcademicSystemShape, sortAcademicClasses } = require("./academicSystems");

const FINANCE_VIEW_ROLES = ["ADMIN", "SUPER_ADMIN", "FINANCE_OFFICER", "TEACHER"];
const FINANCE_MANAGE_ROLES = ["ADMIN", "SUPER_ADMIN", "FINANCE_OFFICER"];
const FINANCE_COLLECTIONS = [
  "financeAccounts",
  "financeTransactions",
  "financeStudentFees",
  "financePayments",
  "financeExpenses",
  "financePurchases",
  "financeStaffSalaries",
  "financeSalaryPayments",
  "financeIncome",
  "financeBudgets",
  "financialReports",
];

const ACCOUNT_TYPES = ["asset", "liability", "income", "expense", "equity"];
const PAYMENT_METHODS = ["cash", "transfer", "online"];
const EXPENSE_CATEGORIES = [
  "utilities",
  "maintenance",
  "supplies",
  "operations",
  "transport",
  "fuel",
  "repairs",
  "general",
];
const REPORT_TYPES = ["term", "yearly"];
const STAFF_ROLES = [
  "ADMIN",
  "SUPER_ADMIN",
  "FINANCE_OFFICER",
  "ICT_ADMIN",
  "ADMISSION_OFFICER",
  "ACADEMIC_OFFICER",
  "HR_OFFICER",
  "TRANSPORT_ADMIN",
  "DRIVER",
  "TEACHER",
];
const DEFAULT_STUDENT_FEE = Number(process.env.SCHOOL_FEE_DEFAULT || 50000);
const SCHOOL_CURRENCY = String(process.env.SCHOOL_CURRENCY || "NGN").toUpperCase();

const DEFAULT_ACCOUNTS = [
  { code: "AST-001", name: "Cash and Bank", type: "asset" },
  { code: "INC-001", name: "Tuition Fees", type: "income" },
  { code: "INC-002", name: "Other Income", type: "income" },
  { code: "INC-003", name: "Uniform Sales", type: "income" },
  { code: "INC-004", name: "Donations", type: "income" },
  { code: "EXP-001", name: "Salaries and Wages", type: "expense" },
  { code: "EXP-002", name: "Utilities", type: "expense" },
  { code: "EXP-003", name: "Maintenance and Repairs", type: "expense" },
  { code: "EXP-004", name: "Supplies and Purchases", type: "expense" },
  { code: "EXP-005", name: "Transport and Logistics", type: "expense" },
  { code: "EXP-006", name: "General Operations", type: "expense" },
  { code: "EQT-001", name: "Retained Balance", type: "equity" },
];

const EXPENSE_ACCOUNT_MAP = {
  utilities: "EXP-002",
  maintenance: "EXP-003",
  repairs: "EXP-003",
  supplies: "EXP-004",
  purchases: "EXP-004",
  transport: "EXP-005",
  fuel: "EXP-005",
  operations: "EXP-006",
  general: "EXP-006",
};

function safeNumber(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function safeLower(value) {
  return str(value).toLowerCase();
}

function createFinanceId(prefix) {
  return `${prefix}-${nanoid(10)}`;
}

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function asDate(value) {
  const safe = str(value);
  if (!safe) return null;
  const date = new Date(safe);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeRole(value) {
  return str(value).toUpperCase();
}

function normalizeClassKey(value) {
  return str(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isTruthy(value) {
  if (typeof value === "boolean") return value;
  const text = safeLower(value);
  return text === "true" || text === "1" || text === "yes";
}

function isCompulsoryFeeStructure(item) {
  const structureType = str(item?.structureType).toUpperCase();
  if (structureType === "OPTIONAL") return false;
  return !isTruthy(item?.isOptional);
}

function isFinanceDeskMirrorPayment(payment) {
  const id = str(payment?.id);
  const metadataSource = safeLower(payment?.metadata?.source);
  return Boolean(
    str(payment?.financePaymentId) ||
    id.startsWith("finance-mirror-") ||
    metadataSource === "finance_desk"
  );
}

function getClassNameMap(db) {
  const out = new Map();
  const classes = Array.isArray(db.classes) ? db.classes : [];
  for (const item of classes) {
    out.set(str(item.id), str(item.name));
  }
  return out;
}

function sortByName(rows = [], field = "name") {
  return [...rows].sort((a, b) => str(a?.[field]).localeCompare(str(b?.[field])));
}

function sortByCreatedAtDesc(rows = [], field = "createdAt") {
  return [...rows].sort((a, b) => {
    const left = asDate(a?.[field])?.getTime() || 0;
    const right = asDate(b?.[field])?.getTime() || 0;
    return right - left;
  });
}

function ensureFinanceCollections(db) {
  ensureFinanceDefaults(db, {
    currentSession: process.env.CURRENT_SESSION,
    currentTerm: process.env.CURRENT_TERM,
  });
  ensureAcademicSystemShape(db);

  for (const key of FINANCE_COLLECTIONS) {
    if (!Array.isArray(db[key])) db[key] = [];
  }

  if (!db.financeSettings || typeof db.financeSettings !== "object") {
    db.financeSettings = {};
  }

  if (!Array.isArray(db.financeSettings.paymentMethods) || db.financeSettings.paymentMethods.length === 0) {
    db.financeSettings.paymentMethods = [...PAYMENT_METHODS];
  }

  if (!Array.isArray(db.financeSettings.expenseCategories) || db.financeSettings.expenseCategories.length === 0) {
    db.financeSettings.expenseCategories = [...EXPENSE_CATEGORIES];
  }

  if (!Array.isArray(db.financeSettings.accountTypes) || db.financeSettings.accountTypes.length === 0) {
    db.financeSettings.accountTypes = [...ACCOUNT_TYPES];
  }

  db.financeSettings.currency = str(db.financeSettings.currency || SCHOOL_CURRENCY).toUpperCase() || SCHOOL_CURRENCY;

  const activeSession =
    (db.academicSessions || []).find((item) => Boolean(item.isActive)) ||
    (db.academicSessions || [])[0] ||
    null;
  const activeTerm =
    (db.terms || []).find((item) => Boolean(item.isActive) && str(item.sessionId) === str(activeSession?.id)) ||
    (db.terms || []).find((item) => str(item.sessionId) === str(activeSession?.id)) ||
    null;

  db.financeSettings.activeSessionId = str(activeSession?.id);
  db.financeSettings.activeTermId = str(activeTerm?.id);

  const existingByCode = new Map((db.financeAccounts || []).map((item) => [str(item.code).toUpperCase(), item]));
  for (const seed of DEFAULT_ACCOUNTS) {
    const code = str(seed.code).toUpperCase();
    if (existingByCode.has(code)) continue;
    db.financeAccounts.push({
      id: createFinanceId("finance-account"),
      name: str(seed.name),
      type: safeLower(seed.type),
      code,
      parentId: "",
      createdAt: nowIso(),
    });
  }

  db.financeAccounts = sortByName(
    (db.financeAccounts || []).map((item) => ({
      ...item,
      name: str(item.name),
      type: ACCOUNT_TYPES.includes(safeLower(item.type)) ? safeLower(item.type) : "expense",
      code: str(item.code).toUpperCase(),
      parentId: str(item.parentId),
      createdAt: str(item.createdAt || nowIso()),
    })),
    "name"
  );

  db.financeTransactions = (db.financeTransactions || []).map((item) => ({
    ...item,
    accountId: str(item.accountId),
    type: safeLower(item.type) === "credit" ? "credit" : "debit",
    amount: normalizeMoney(item.amount),
    referenceType: str(item.referenceType),
    referenceId: str(item.referenceId),
    description: str(item.description),
    transactionDate: str(item.transactionDate || item.createdAt),
    sessionId: str(item.sessionId),
    termId: str(item.termId),
    createdBy: str(item.createdBy),
    createdAt: str(item.createdAt || nowIso()),
  }));

  db.financeStudentFees = (db.financeStudentFees || []).map((item) => ({
    ...item,
    studentId: str(item.studentId),
    studentName: str(item.studentName),
    sessionId: str(item.sessionId),
    termId: str(item.termId),
    classId: str(item.classId),
    className: str(item.className),
    totalFee: normalizeMoney(item.totalFee),
    discount: normalizeMoney(item.discount),
    amountPaid: normalizeMoney(item.amountPaid),
    balance: normalizeMoney(item.balance),
    status: ["paid", "partial", "unpaid"].includes(safeLower(item.status)) ? safeLower(item.status) : "unpaid",
    createdAt: str(item.createdAt || nowIso()),
    updatedAt: str(item.updatedAt || nowIso()),
  }));

  db.financePayments = (db.financePayments || []).map((item) => ({
    ...item,
    studentId: str(item.studentId),
    studentFeeId: str(item.studentFeeId),
    amount: normalizeMoney(item.amount),
    paymentMethod: safeLower(item.paymentMethod) || "transfer",
    reference: str(item.reference),
    description: str(item.description),
    datePaid: str(item.datePaid || item.createdAt),
    sessionId: str(item.sessionId),
    termId: str(item.termId),
    classId: str(item.classId),
    receivedBy: str(item.receivedBy),
    receiptNumber: str(item.receiptNumber),
    status: safeLower(item.status) || "posted",
    createdAt: str(item.createdAt || nowIso()),
  }));

  db.financeExpenses = (db.financeExpenses || []).map((item) => ({
    ...item,
    accountId: str(item.accountId),
    title: str(item.title),
    amount: normalizeMoney(item.amount),
    category: safeLower(item.category) || "general",
    description: str(item.description),
    expenseDate: str(item.expenseDate || item.createdAt),
    sessionId: str(item.sessionId),
    termId: str(item.termId),
    approvedBy: str(item.approvedBy),
    createdBy: str(item.createdBy),
    createdAt: str(item.createdAt || nowIso()),
  }));

  db.financePurchases = (db.financePurchases || []).map((item) => ({
    ...item,
    accountId: str(item.accountId),
    itemName: str(item.itemName),
    quantity: safeNumber(item.quantity, 1),
    unitPrice: normalizeMoney(item.unitPrice),
    totalPrice: normalizeMoney(item.totalPrice),
    supplier: str(item.supplier),
    purchaseDate: str(item.purchaseDate || item.createdAt),
    sessionId: str(item.sessionId),
    termId: str(item.termId),
    approvedBy: str(item.approvedBy),
    createdBy: str(item.createdBy),
    createdAt: str(item.createdAt || nowIso()),
  }));

  db.financeStaffSalaries = (db.financeStaffSalaries || []).map((item) => {
    const basicSalary = normalizeMoney(item.basicSalary);
    const allowance = normalizeMoney(item.allowance);
    const deduction = normalizeMoney(item.deduction);
    return {
      ...item,
      staffId: str(item.staffId),
      basicSalary,
      allowance,
      deduction,
      netSalary: normalizeMoney(item.netSalary || basicSalary + allowance - deduction),
      createdAt: str(item.createdAt || nowIso()),
      updatedAt: str(item.updatedAt || nowIso()),
    };
  });

  db.financeSalaryPayments = (db.financeSalaryPayments || []).map((item) => ({
    ...item,
    staffId: str(item.staffId),
    amountPaid: normalizeMoney(item.amountPaid),
    paymentDate: str(item.paymentDate || item.createdAt),
    paymentMethod: safeLower(item.paymentMethod) || "transfer",
    reference: str(item.reference),
    sessionId: str(item.sessionId),
    termId: str(item.termId),
    status: ["paid", "pending"].includes(safeLower(item.status)) ? safeLower(item.status) : "paid",
    createdAt: str(item.createdAt || nowIso()),
  }));

  db.financeIncome = (db.financeIncome || []).map((item) => ({
    ...item,
    accountId: str(item.accountId),
    source: str(item.source),
    amount: normalizeMoney(item.amount),
    description: str(item.description),
    dateReceived: str(item.dateReceived || item.createdAt),
    sessionId: str(item.sessionId),
    termId: str(item.termId),
    receivedBy: str(item.receivedBy),
    createdAt: str(item.createdAt || nowIso()),
  }));

  db.financeBudgets = (db.financeBudgets || []).map((item) => ({
    ...item,
    accountId: str(item.accountId),
    sessionId: str(item.sessionId),
    termId: str(item.termId),
    amount: normalizeMoney(item.amount),
    createdAt: str(item.createdAt || nowIso()),
  }));

  db.financialReports = (db.financialReports || []).map((item) => ({
    ...item,
    type: REPORT_TYPES.includes(safeLower(item.type)) ? safeLower(item.type) : "term",
    sessionId: str(item.sessionId),
    termId: str(item.termId),
    totalIncome: normalizeMoney(item.totalIncome),
    totalExpense: normalizeMoney(item.totalExpense),
    netBalance: normalizeMoney(item.netBalance),
    generatedAt: str(item.generatedAt || nowIso()),
  }));
}

function getFinanceAccountByCode(db, code) {
  const safeCode = str(code).toUpperCase();
  return (db.financeAccounts || []).find((item) => str(item.code).toUpperCase() === safeCode) || null;
}

function getFinanceAccountById(db, id) {
  const safeId = str(id);
  return (db.financeAccounts || []).find((item) => str(item.id) === safeId) || null;
}

function resolveScope(db, input = {}) {
  ensureFinanceCollections(db);
  const sessionId = str(input.sessionId || db.financeSettings.activeSessionId);
  const termId = str(input.termId || db.financeSettings.activeTermId);
  const session = (db.academicSessions || []).find((item) => str(item.id) === sessionId) || null;
  const term = (db.terms || []).find((item) => str(item.id) === termId) || null;
  return {
    sessionId,
    termId,
    session,
    term,
  };
}

function getStudents(db) {
  const classMap = getClassNameMap(db);
  return sortByName((db.students || [])
    .filter((item) => !isArchivedStudent(item))
    .map((item) => ({
      id: str(item.id),
      name: str(item.name),
      classId: str(item.classId),
      className: str(item.className || classMap.get(str(item.classId)) || item.class),
      admissionNumber: str(item.admissionNumber || item.studentId || item.id),
    })));
}

function getClasses(db) {
  return sortAcademicClasses([...(Array.isArray(db.classes) ? db.classes : [])].filter((item) => item.isActive !== false))
    .map((item) => ({
      id: str(item.id),
      name: str(item.name),
      section: str(item.section),
      order: safeNumber(item.order, 999),
      academicSystem: str(item.academicSystem),
      curriculumFramework: str(item.curriculumFramework),
      assessmentFramework: str(item.assessmentFramework),
    }));
}

function getStaffUsers(db) {
  return sortByName((db.users || [])
    .filter((item) => STAFF_ROLES.includes(normalizeRole(item.role)))
    .map((item) => ({
      id: str(item.id),
      name: str(item.name),
      role: normalizeRole(item.role),
      username: str(item.username),
    })));
}

function getParentLinkedStudentIds(user = {}) {
  const values = [];
  if (user.studentId) values.push(str(user.studentId));
  if (Array.isArray(user.studentIds)) {
    for (const item of user.studentIds) values.push(str(item));
  }
  return [...new Set(values.filter(Boolean))];
}

function getApplicableFeeStructures(db, student, sessionId, termId) {
  const classKey = normalizeClassKey(student.classId || student.className);
  return (db.feeStructures || []).filter((item) => {
    if (!item) return false;
    if (str(item.sessionId) !== str(sessionId)) return false;
    if (str(item.termId) !== str(termId)) return false;
    if (item.isActive === false) return false;
    if (!isCompulsoryFeeStructure(item)) return false;
    const rowKey = normalizeClassKey(item.classId || item.className);
    return rowKey && rowKey === classKey;
  });
}

function getApplicableStudentAssignments(db, studentId, sessionId, termId) {
  return (db.studentFeeAssignments || []).filter((item) => {
    if (!item) return false;
    if (str(item.studentId) !== str(studentId)) return false;
    if (str(item.sessionId) !== str(sessionId)) return false;
    if (str(item.termId) !== str(termId)) return false;
    return item.isActive !== false;
  });
}

function sumMoney(rows = [], field) {
  return normalizeMoney(rows.reduce((sum, item) => sum + safeNumber(item?.[field], 0), 0));
}

function findActiveInvoiceForStudent(db, studentId, sessionId, termId) {
  return (db.invoices || []).find((invoice) => (
    str(invoice.studentId) === str(studentId) &&
    str(invoice.sessionId) === str(sessionId) &&
    str(invoice.termId) === str(termId) &&
    str(invoice.status).toUpperCase() !== "CANCELLED"
  )) || null;
}

function getInvoiceGrossTotal(db, invoiceId) {
  const safeInvoiceId = str(invoiceId);
  if (!safeInvoiceId) return 0;
  return sumMoney(
    (db.invoiceItems || []).filter((item) => str(item.invoiceId) === safeInvoiceId),
    "amount"
  );
}

function getSuccessfulOnlineFeePayments(db, studentId, sessionId, termId) {
  const invoices = (db.invoices || []).filter((invoice) => (
    str(invoice.studentId) === str(studentId) &&
    str(invoice.sessionId) === str(sessionId) &&
    str(invoice.termId) === str(termId)
  ));
  const invoiceIds = new Set(invoices.map((invoice) => str(invoice.id)).filter(Boolean));
  if (!invoiceIds.size) return [];

  return (db.payments || []).filter((payment) => (
    str(payment.type).toUpperCase() === "STUDENT_FEE" &&
    invoiceIds.has(str(payment.invoiceId)) &&
    normalizePaymentStatus(payment.status) === "SUCCESS" &&
    !isFinanceDeskMirrorPayment(payment)
  ));
}

function syncStudentFeeRows(db, filters = {}) {
  ensureFinanceCollections(db);
  const { sessionId, termId } = resolveScope(db, filters);
  const students = getStudents(db)
    .filter((item) => !filters.classId || str(item.classId) === str(filters.classId))
    .filter((item) => !filters.studentId || str(item.id) === str(filters.studentId));

  for (const student of students) {
    const existing = (db.financeStudentFees || []).find((item) => (
      str(item.studentId) === str(student.id) &&
      str(item.sessionId) === str(sessionId) &&
      str(item.termId) === str(termId)
    ));

    const feeStructures = getApplicableFeeStructures(db, student, sessionId, termId);
    const assignments = getApplicableStudentAssignments(db, student.id, sessionId, termId);
    const calculatedTotal = normalizeMoney(sumMoney(feeStructures, "amount") + sumMoney(assignments, "amount"));
    const activeInvoice = findActiveInvoiceForStudent(db, student.id, sessionId, termId);
    const invoiceGrossTotal = getInvoiceGrossTotal(db, activeInvoice?.id);
    const discount = normalizeMoney(existing?.discount || 0);
    const payments = (db.financePayments || []).filter((item) => (
      str(item.studentId) === str(student.id) &&
      str(item.sessionId) === str(sessionId) &&
      str(item.termId) === str(termId) &&
      !["voided", "reversed", "refunded"].includes(safeLower(item.status))
    ));
    const onlinePayments = getSuccessfulOnlineFeePayments(db, student.id, sessionId, termId);
    const amountPaid = normalizeMoney(sumMoney(payments, "amount") + sumMoney(onlinePayments, "amount"));
    const totalFee = calculatedTotal > 0
      ? calculatedTotal
      : invoiceGrossTotal > 0
        ? invoiceGrossTotal
        : amountPaid > 0
          ? normalizeMoney(Math.max(normalizeMoney(existing?.totalFee), amountPaid))
          : 0;
    if (!existing && totalFee <= 0 && amountPaid <= 0 && discount <= 0) continue;
    const balance = normalizeMoney(Math.max(totalFee - discount - amountPaid, 0));
    const status = totalFee <= 0 ? "paid" : balance <= 0 ? "paid" : amountPaid > 0 ? "partial" : "unpaid";

    if (existing) {
      existing.studentName = student.name;
      existing.classId = student.classId;
      existing.className = student.className;
      existing.totalFee = totalFee;
      existing.discount = discount;
      existing.amountPaid = amountPaid;
      existing.balance = balance;
      existing.status = status;
      existing.updatedAt = nowIso();
      continue;
    }

    db.financeStudentFees.unshift({
      id: createFinanceId("student-fee"),
      studentId: student.id,
      studentName: student.name,
      sessionId,
      termId,
      classId: student.classId,
      className: student.className,
      totalFee,
      discount,
      amountPaid,
      balance,
      status,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
  }

  return sortByName((db.financeStudentFees || []).filter((item) => (
    str(item.sessionId) === str(sessionId) &&
    str(item.termId) === str(termId) &&
    (!filters.classId || str(item.classId) === str(filters.classId)) &&
    (!filters.studentId || str(item.studentId) === str(filters.studentId)) &&
    (
      normalizeMoney(item.totalFee) > 0 ||
      normalizeMoney(item.amountPaid) > 0 ||
      normalizeMoney(item.balance) > 0 ||
      normalizeMoney(item.discount) > 0
    )
  )), "studentName");
}

function removeReferenceTransactions(db, referenceType, referenceId) {
  db.financeTransactions = (db.financeTransactions || []).filter((item) => {
    return !(str(item.referenceType) === str(referenceType) && str(item.referenceId) === str(referenceId));
  });
}

function createLedgerEntries(db, payload) {
  const entries = Array.isArray(payload.entries) ? payload.entries : [];
  const createdAt = nowIso();
  for (const entry of entries) {
    const account = entry.accountId
      ? getFinanceAccountById(db, entry.accountId)
      : getFinanceAccountByCode(db, entry.accountCode);

    if (!account) {
      throw createHttpError(400, `Finance account not found for ${str(entry.accountCode || entry.accountId)}`);
    }

    db.financeTransactions.unshift({
      id: createFinanceId("ledger"),
      accountId: str(account.id),
      type: safeLower(entry.type) === "credit" ? "credit" : "debit",
      amount: normalizeMoney(entry.amount),
      referenceType: str(payload.referenceType),
      referenceId: str(payload.referenceId),
      description: str(payload.description),
      transactionDate: str(payload.transactionDate || createdAt),
      sessionId: str(payload.sessionId),
      termId: str(payload.termId),
      createdBy: str(payload.createdBy),
      createdAt,
    });
  }
}

function buildFinanceSetup(db) {
  ensureFinanceCollections(db);
  return {
    currency: db.financeSettings.currency,
    paymentMethods: [...db.financeSettings.paymentMethods],
    expenseCategories: [...db.financeSettings.expenseCategories],
    accountTypes: [...db.financeSettings.accountTypes],
    reportTypes: [...REPORT_TYPES],
    activeSessionId: str(db.financeSettings.activeSessionId),
    activeTermId: str(db.financeSettings.activeTermId),
    sessions: sortByName((db.academicSessions || []).map((item) => ({
      id: str(item.id),
      sessionName: str(item.sessionName),
      isActive: Boolean(item.isActive),
    })), "sessionName"),
    terms: sortByName((db.terms || []).map((item) => ({
      id: str(item.id),
      sessionId: str(item.sessionId),
      termName: str(item.termName),
      isActive: Boolean(item.isActive),
    })), "termName"),
    classes: getClasses(db),
    students: getStudents(db),
    staff: getStaffUsers(db),
    accounts: (db.financeAccounts || []).map((item) => ({
      id: str(item.id),
      name: str(item.name),
      type: safeLower(item.type),
      code: str(item.code),
      parentId: str(item.parentId),
    })),
  };
}

function buildRecentActivity(db, filters = {}) {
  const { sessionId, termId } = resolveScope(db, filters);
  const rows = [];

  for (const item of db.financePayments || []) {
    if (str(item.sessionId) !== sessionId || str(item.termId) !== termId) continue;
    if (["voided", "reversed", "refunded"].includes(safeLower(item.status))) continue;
    rows.push({
      date: str(item.datePaid),
      type: "Payment",
      description: str(item.description || "Student fee payment"),
      amount: normalizeMoney(item.amount),
    });
  }

  for (const item of db.financeExpenses || []) {
    if (str(item.sessionId) !== sessionId || str(item.termId) !== termId) continue;
    rows.push({
      date: str(item.expenseDate),
      type: "Expense",
      description: str(item.title),
      amount: normalizeMoney(item.amount),
    });
  }

  for (const item of db.financeSalaryPayments || []) {
    if (str(item.sessionId) !== sessionId || str(item.termId) !== termId) continue;
    rows.push({
      date: str(item.paymentDate),
      type: "Salary",
      description: str(item.description || "Salary payment"),
      amount: normalizeMoney(item.amountPaid),
    });
  }

  for (const item of db.financeIncome || []) {
    if (str(item.sessionId) !== sessionId || str(item.termId) !== termId) continue;
    rows.push({
      date: str(item.dateReceived),
      type: "Income",
      description: str(item.source),
      amount: normalizeMoney(item.amount),
    });
  }

  return rows
    .sort((a, b) => (asDate(b.date)?.getTime() || 0) - (asDate(a.date)?.getTime() || 0))
    .slice(0, 10);
}

function aggregateTransactionsByAccountType(db, filters = {}) {
  const { sessionId, termId } = resolveScope(db, filters);
  const accountMap = new Map((db.financeAccounts || []).map((item) => [str(item.id), item]));
  const summaries = new Map();

  for (const row of db.financeTransactions || []) {
    if (sessionId && str(row.sessionId) !== sessionId) continue;
    if (filters.type === "term" && termId && str(row.termId) !== termId) continue;
    const account = accountMap.get(str(row.accountId));
    if (!account) continue;

    const key = str(account.id);
    const existing = summaries.get(key) || {
      accountId: key,
      accountName: str(account.name),
      accountCode: str(account.code),
      accountType: safeLower(account.type),
      debit: 0,
      credit: 0,
    };

    if (safeLower(row.type) === "credit") {
      existing.credit = normalizeMoney(existing.credit + safeNumber(row.amount));
    } else {
      existing.debit = normalizeMoney(existing.debit + safeNumber(row.amount));
    }

    summaries.set(key, existing);
  }

  return [...summaries.values()].sort((a, b) => a.accountName.localeCompare(b.accountName));
}

function buildFinanceReports(db, filters = {}, persist = true) {
  ensureFinanceCollections(db);
  const reportType = REPORT_TYPES.includes(safeLower(filters.type)) ? safeLower(filters.type) : "term";
  const { sessionId, termId } = resolveScope(db, filters);
  const lines = aggregateTransactionsByAccountType(db, {
    sessionId,
    termId,
    type: reportType,
  });

  const incomeLines = lines
    .filter((item) => item.accountType === "income")
    .map((item) => ({
      ...item,
      amount: normalizeMoney(item.credit - item.debit),
    }))
    .filter((item) => item.amount > 0);

  const expenseLines = lines
    .filter((item) => item.accountType === "expense")
    .map((item) => ({
      ...item,
      amount: normalizeMoney(item.debit - item.credit),
    }))
    .filter((item) => item.amount > 0);

  const totalIncome = sumMoney(incomeLines, "amount");
  const totalExpense = sumMoney(expenseLines, "amount");
  const netBalance = normalizeMoney(totalIncome - totalExpense);

  const studentFees = syncStudentFeeRows(db, { sessionId, termId });
  const totalStudentFees = sumMoney(studentFees, "totalFee");
  const totalStudentPaid = sumMoney(studentFees, "amountPaid");
  const totalStudentBalance = sumMoney(studentFees, "balance");

  const budgets = listFinanceBudgets(db, { sessionId, termId }, true).rows;

  const payload = {
    type: reportType,
    sessionId,
    termId,
    totals: {
      totalIncome,
      totalExpense,
      netBalance,
      totalStudentFees,
      totalStudentPaid,
      totalStudentBalance,
    },
    incomeStatement: {
      income: incomeLines,
      expenses: expenseLines,
      totalIncome,
      totalExpense,
      netBalance,
    },
    cashFlow: {
      inflow: totalIncome,
      outflow: totalExpense,
      netCash: netBalance,
    },
    feeCollectionReport: {
      totalBilled: totalStudentFees,
      totalCollected: totalStudentPaid,
      outstanding: totalStudentBalance,
    },
    budgetReport: budgets,
    availableReports: [
      "Income Statement",
      "Expense Report",
      "Cash Flow",
      "Fee Collection Report",
      "Budget Performance",
    ],
    generatedAt: nowIso(),
  };

  if (persist) {
    const existing = (db.financialReports || []).find((item) => (
      safeLower(item.type) === reportType &&
      str(item.sessionId) === sessionId &&
      str(item.termId) === termId
    ));

    if (existing) {
      existing.totalIncome = totalIncome;
      existing.totalExpense = totalExpense;
      existing.netBalance = netBalance;
      existing.generatedAt = payload.generatedAt;
    } else {
      db.financialReports.unshift({
        id: createFinanceId("finance-report"),
        type: reportType,
        sessionId,
        termId,
        totalIncome,
        totalExpense,
        netBalance,
        generatedAt: payload.generatedAt,
      });
    }
  }

  return payload;
}

function buildFinanceDashboard(db) {
  ensureFinanceCollections(db);
  const { sessionId, termId } = resolveScope(db, {});
  const fees = syncStudentFeeRows(db, { sessionId, termId });
  const reports = buildFinanceReports(db, { sessionId, termId, type: "term" }, false);
  const payroll = listFinancePayroll(db, { sessionId, termId });
  const feeCollectionIncome = sumMoney(fees, "amountPaid");
  const otherIncome = sumMoney((db.financeIncome || []).filter((item) => (
    (!sessionId || str(item.sessionId) === sessionId) &&
    (!termId || str(item.termId) === termId)
  )), "amount");
  const totalIncome = normalizeMoney(feeCollectionIncome + otherIncome);
  const totalExpenses = reports.totals.totalExpense;
  const netBalance = normalizeMoney(totalIncome - totalExpenses);

  return {
    currency: db.financeSettings.currency,
    sessionId,
    termId,
    totalIncome,
    totalExpenses,
    netBalance,
    outstandingFees: sumMoney(fees, "balance"),
    totalSalariesPaid: payroll.summary.totalPaid,
    pendingSalaries: payroll.summary.totalPending,
    recentTransactions: buildRecentActivity(db, { sessionId, termId }),
  };
}

function listFinanceStudentFees(db, filters = {}) {
  ensureFinanceCollections(db);
  const { sessionId, termId } = resolveScope(db, filters);
  const rows = syncStudentFeeRows(db, {
    sessionId,
    termId,
    classId: filters.classId,
    studentId: filters.studentId,
  });

  const filtered = rows.filter((item) => {
    if (filters.status && safeLower(filters.status) !== safeLower(item.status)) return false;
    const search = safeLower(filters.search);
    if (search) {
      const hay = [item.studentName, item.className].map((value) => safeLower(value)).join(" ");
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  return {
    sessionId,
    termId,
    records: filtered,
  };
}

function findOrCreateStudentFeeRow(db, payload = {}) {
  const { sessionId, termId } = resolveScope(db, payload);
  const student = getStudents(db).find((item) => str(item.id) === str(payload.studentId));
  if (!student) {
    throw createHttpError(404, "Student not found for finance payment");
  }

  syncStudentFeeRows(db, { sessionId, termId, studentId: student.id });
  let row = (db.financeStudentFees || []).find((item) => (
    str(item.studentId) === str(student.id) &&
    str(item.sessionId) === sessionId &&
    str(item.termId) === termId
  ));

  if (!row) {
    const seedTotalFee = normalizeMoney(payload.totalFee || 0);
    row = {
      id: createFinanceId("student-fee"),
      studentId: student.id,
      studentName: student.name,
      sessionId,
      termId,
      classId: student.classId,
      className: student.className,
      totalFee: seedTotalFee,
      discount: 0,
      amountPaid: 0,
      balance: seedTotalFee,
      status: "unpaid",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    db.financeStudentFees.unshift(row);
  }

  return row;
}

function listFinancePayments(db, filters = {}) {
  ensureFinanceCollections(db);
  const { sessionId, termId } = resolveScope(db, filters);
  const rows = sortByCreatedAtDesc((db.financePayments || []).filter((item) => {
    if (sessionId && str(item.sessionId) !== sessionId) return false;
    if (termId && str(item.termId) !== termId) return false;
    if (filters.studentId && str(item.studentId) !== str(filters.studentId)) return false;
    const search = safeLower(filters.search);
    if (search) {
      const hay = [item.description, item.reference, item.receiptNumber].map((value) => safeLower(value)).join(" ");
      if (!hay.includes(search)) return false;
    }
    return true;
  }), "datePaid");

  return { sessionId, termId, records: rows };
}

function receiveFinancePayment(db, payload = {}, actor = {}) {
  ensureFinanceCollections(db);
  const amount = normalizeMoney(payload.amount);
  if (amount <= 0) {
    throw createHttpError(400, "Payment amount must be greater than zero");
  }

  const studentFee = findOrCreateStudentFeeRow(db, payload);
  const scope = resolveScope(db, { sessionId: studentFee.sessionId, termId: studentFee.termId });

  if (studentFee.totalFee <= 0) {
    studentFee.totalFee = amount;
  }

  if (studentFee.balance > 0 && amount - studentFee.balance > 0.009) {
    throw createHttpError(400, `Payment exceeds current student fee balance of ${studentFee.balance}`);
  }

  const paymentId = createFinanceId("finance-payment");
  const paymentReference = str(payload.reference || createFinanceDocumentNumber(db.financePayments || [], "PAY", nowIso()));
  const receiptNumber = createFinanceDocumentNumber(db.financePayments || [], "RCT", nowIso());
  const payment = {
    id: paymentId,
    studentId: studentFee.studentId,
    studentFeeId: studentFee.id,
    amount,
    paymentMethod: safeLower(payload.paymentMethod) || "transfer",
    reference: paymentReference,
    description: str(payload.description || `Fee payment received for ${studentFee.studentName}`),
    datePaid: str(payload.datePaid || nowIso()),
    sessionId: scope.sessionId,
    termId: scope.termId,
    classId: studentFee.classId,
    receivedBy: str(actor.id || actor.name),
    receiptNumber,
    status: "posted",
    createdAt: nowIso(),
  };

  db.financePayments.unshift(payment);

  createLedgerEntries(db, {
    referenceType: "payment",
    referenceId: payment.id,
    description: payment.description,
    transactionDate: payment.datePaid,
    sessionId: scope.sessionId,
    termId: scope.termId,
    createdBy: str(actor.id || actor.name),
    entries: [
      { accountCode: "AST-001", type: "debit", amount },
      { accountCode: "INC-001", type: "credit", amount },
    ],
  });

  syncStudentFeeRows(db, { sessionId: scope.sessionId, termId: scope.termId, studentId: studentFee.studentId });
  const updatedRow = (db.financeStudentFees || []).find((item) => str(item.id) === str(studentFee.id)) || studentFee;

  return {
    payment,
    studentFee: updatedRow,
  };
}

function receiveFinancePaymentsBulk(db, payload = {}, actor = {}) {
  ensureFinanceCollections(db);
  const rows = Array.isArray(payload.payments) ? payload.payments : [];
  if (rows.length === 0) {
    throw createHttpError(400, "Add at least one student payment");
  }
  if (rows.length > 200) {
    throw createHttpError(400, "A bulk payment batch cannot exceed 200 students");
  }

  const seenStudentIds = new Set();
  const records = rows.map((row) => {
    const studentId = str(row?.studentId);
    if (!studentId) {
      throw createHttpError(400, "Every bulk payment row must include a student");
    }
    if (seenStudentIds.has(studentId)) {
      throw createHttpError(400, "A student can only appear once in a bulk payment batch");
    }
    seenStudentIds.add(studentId);

    return receiveFinancePayment(db, {
      ...row,
      sessionId: row.sessionId || payload.sessionId,
      termId: row.termId || payload.termId,
      paymentMethod: row.paymentMethod || payload.paymentMethod,
      datePaid: row.datePaid || payload.datePaid,
    }, actor);
  });

  return {
    createdCount: records.length,
    records,
  };
}

function voidFinancePayment(db, paymentId, payload = {}, actor = {}) {
  ensureFinanceCollections(db);
  const payment = (db.financePayments || []).find((item) => str(item.id) === str(paymentId));
  if (!payment) throw createHttpError(404, "Finance payment not found");
  if (["voided", "reversed", "refunded"].includes(safeLower(payment.status))) {
    throw createHttpError(409, "Payment has already been reversed");
  }

  const reason = str(payload.reason || "Payment reversed by finance office");
  const approvedBy = str(actor.id || actor.name || actor.username);
  const oldValue = { ...payment };

  payment.status = "voided";
  payment.voidedAt = nowIso();
  payment.voidedBy = approvedBy;
  payment.voidReason = reason;
  payment.updatedAt = nowIso();

  createLedgerEntries(db, {
    referenceType: "payment_reversal",
    referenceId: payment.id,
    description: `Reversal: ${payment.description}`,
    transactionDate: payload.date || nowIso(),
    sessionId: payment.sessionId,
    termId: payment.termId,
    createdBy: approvedBy,
    entries: [
      { accountCode: "INC-001", type: "debit", amount: payment.amount },
      { accountCode: "AST-001", type: "credit", amount: payment.amount },
    ],
  });

  const mirrors = (db.payments || []).filter((row) => (
    str(row.financePaymentId) === str(payment.id) ||
    str(row.id) === `finance-mirror-${payment.id}` ||
    (str(row.paymentReference || row.reference) && str(row.paymentReference || row.reference) === str(payment.reference) && str(row.studentId) === str(payment.studentId))
  ));

  for (const mirror of mirrors) {
    mirror.status = "REVERSED";
    mirror.reversedAt = payment.voidedAt;
    mirror.reversedBy = approvedBy;
    mirror.reversalReason = reason;
    mirror.updatedAt = nowIso();
    if (mirror.invoiceId) recalcInvoiceAmounts(db, mirror.invoiceId);
  }

  syncStudentFeeRows(db, { sessionId: payment.sessionId, termId: payment.termId, studentId: payment.studentId });
  syncLegacyFeeInvoicesMirror(db);

  appendFinanceAuditLog(db, {
    action: "payment_reversed",
    entityType: "financePayment",
    entityId: payment.id,
    performedBy: approvedBy,
    reason,
    before: oldValue,
    after: payment,
  });

  const studentFee =
    (db.financeStudentFees || []).find((item) => str(item.id) === str(payment.studentFeeId)) ||
    (db.financeStudentFees || []).find((item) => (
      str(item.studentId) === str(payment.studentId) &&
      str(item.sessionId) === str(payment.sessionId) &&
      str(item.termId) === str(payment.termId)
    ));

  return { payment, studentFee, reversedMirrorCount: mirrors.length };
}

function resolveExpenseAccountCode(category) {
  return EXPENSE_ACCOUNT_MAP[safeLower(category)] || "EXP-006";
}

function listFinanceExpenses(db, filters = {}) {
  ensureFinanceCollections(db);
  const { sessionId, termId } = resolveScope(db, filters);
  const rows = sortByCreatedAtDesc((db.financeExpenses || []).filter((item) => {
    if (sessionId && str(item.sessionId) !== sessionId) return false;
    if (termId && str(item.termId) !== termId) return false;
    if (filters.category && safeLower(item.category) !== safeLower(filters.category)) return false;
    return true;
  }), "expenseDate");
  return { sessionId, termId, records: rows };
}

function saveExpenseTransactions(db, expense) {
  removeReferenceTransactions(db, "expense", expense.id);
  createLedgerEntries(db, {
    referenceType: "expense",
    referenceId: expense.id,
    description: expense.title,
    transactionDate: expense.expenseDate,
    sessionId: expense.sessionId,
    termId: expense.termId,
    createdBy: expense.createdBy,
    entries: [
      { accountId: expense.accountId, type: "debit", amount: expense.amount },
      { accountCode: "AST-001", type: "credit", amount: expense.amount },
    ],
  });
}

function createFinanceExpense(db, payload = {}, actor = {}) {
  ensureFinanceCollections(db);
  const amount = normalizeMoney(payload.amount);
  if (amount <= 0) throw createHttpError(400, "Expense amount must be greater than zero");
  const scope = resolveScope(db, payload);
  const account = payload.accountId
    ? getFinanceAccountById(db, payload.accountId)
    : getFinanceAccountByCode(db, resolveExpenseAccountCode(payload.category));
  if (!account) throw createHttpError(400, "Expense account could not be resolved");

  const expense = {
    id: createFinanceId("finance-expense"),
    accountId: account.id,
    title: str(payload.title),
    amount,
    category: safeLower(payload.category) || "general",
    description: str(payload.description),
    expenseDate: str(payload.expenseDate || nowIso()),
    sessionId: scope.sessionId,
    termId: scope.termId,
    approvedBy: str(payload.approvedBy),
    createdBy: str(actor.id || actor.name),
    createdAt: nowIso(),
  };

  if (!expense.title) throw createHttpError(400, "Expense title is required");

  db.financeExpenses.unshift(expense);
  saveExpenseTransactions(db, expense);
  return expense;
}

function updateFinanceExpense(db, expenseId, payload = {}, actor = {}) {
  ensureFinanceCollections(db);
  const expense = (db.financeExpenses || []).find((item) => str(item.id) === str(expenseId));
  if (!expense) throw createHttpError(404, "Expense record not found");
  const account = payload.accountId
    ? getFinanceAccountById(db, payload.accountId)
    : getFinanceAccountByCode(db, resolveExpenseAccountCode(payload.category || expense.category));
  if (!account) throw createHttpError(400, "Expense account could not be resolved");

  expense.accountId = account.id;
  expense.title = str(payload.title || expense.title);
  expense.amount = normalizeMoney(payload.amount ?? expense.amount);
  expense.category = safeLower(payload.category || expense.category) || "general";
  expense.description = str(payload.description ?? expense.description);
  expense.expenseDate = str(payload.expenseDate || expense.expenseDate);
  expense.approvedBy = str(payload.approvedBy ?? expense.approvedBy);
  expense.createdBy = str(actor.id || expense.createdBy);
  saveExpenseTransactions(db, expense);
  return expense;
}

function deleteFinanceExpense(db, expenseId) {
  ensureFinanceCollections(db);
  const index = (db.financeExpenses || []).findIndex((item) => str(item.id) === str(expenseId));
  if (index < 0) throw createHttpError(404, "Expense record not found");
  const [expense] = db.financeExpenses.splice(index, 1);
  removeReferenceTransactions(db, "expense", expense.id);
  return expense;
}

function listFinancePurchases(db, filters = {}) {
  ensureFinanceCollections(db);
  const { sessionId, termId } = resolveScope(db, filters);
  const rows = sortByCreatedAtDesc((db.financePurchases || []).filter((item) => {
    if (sessionId && str(item.sessionId) !== sessionId) return false;
    if (termId && str(item.termId) !== termId) return false;
    return true;
  }), "purchaseDate");
  return { sessionId, termId, records: rows };
}

function createFinancePurchase(db, payload = {}, actor = {}) {
  ensureFinanceCollections(db);
  const quantity = safeNumber(payload.quantity, 1);
  const unitPrice = normalizeMoney(payload.unitPrice);
  const totalPrice = normalizeMoney(payload.totalPrice || quantity * unitPrice);
  if (!str(payload.itemName)) throw createHttpError(400, "Purchase item name is required");
  if (quantity <= 0 || totalPrice <= 0) throw createHttpError(400, "Purchase quantity and total price must be valid");
  const scope = resolveScope(db, payload);
  const account = payload.accountId
    ? getFinanceAccountById(db, payload.accountId)
    : getFinanceAccountByCode(db, "EXP-004");

  const purchase = {
    id: createFinanceId("finance-purchase"),
    accountId: str(account?.id),
    itemName: str(payload.itemName),
    quantity,
    unitPrice,
    totalPrice,
    supplier: str(payload.supplier),
    purchaseDate: str(payload.purchaseDate || nowIso()),
    sessionId: scope.sessionId,
    termId: scope.termId,
    approvedBy: str(payload.approvedBy),
    createdBy: str(actor.id || actor.name),
    createdAt: nowIso(),
  };

  db.financePurchases.unshift(purchase);
  createLedgerEntries(db, {
    referenceType: "purchase",
    referenceId: purchase.id,
    description: purchase.itemName,
    transactionDate: purchase.purchaseDate,
    sessionId: purchase.sessionId,
    termId: purchase.termId,
    createdBy: purchase.createdBy,
    entries: [
      { accountId: purchase.accountId, type: "debit", amount: purchase.totalPrice },
      { accountCode: "AST-001", type: "credit", amount: purchase.totalPrice },
    ],
  });

  return purchase;
}

function saveFinanceSalaryStructure(db, payload = {}) {
  ensureFinanceCollections(db);
  const staffId = str(payload.staffId);
  if (!staffId) throw createHttpError(400, "Staff member is required for salary structure");
  const basicSalary = normalizeMoney(payload.basicSalary);
  const allowance = normalizeMoney(payload.allowance);
  const deduction = normalizeMoney(payload.deduction);
  const netSalary = normalizeMoney(basicSalary + allowance - deduction);

  let row = (db.financeStaffSalaries || []).find((item) => str(item.staffId) === staffId);
  if (row) {
    row.basicSalary = basicSalary;
    row.allowance = allowance;
    row.deduction = deduction;
    row.netSalary = netSalary;
    row.updatedAt = nowIso();
    return row;
  }

  row = {
    id: createFinanceId("salary-structure"),
    staffId,
    basicSalary,
    allowance,
    deduction,
    netSalary,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  db.financeStaffSalaries.unshift(row);
  return row;
}

function listFinancePayroll(db, filters = {}) {
  ensureFinanceCollections(db);
  const { sessionId, termId } = resolveScope(db, filters);
  const staffMap = new Map(getStaffUsers(db).map((item) => [item.id, item]));
  const rows = (db.financeStaffSalaries || [])
    .filter((item) => !filters.staffId || str(item.staffId) === str(filters.staffId))
    .map((item) => {
      const payments = (db.financeSalaryPayments || []).filter((row) => (
        str(row.staffId) === str(item.staffId) &&
        str(row.sessionId) === sessionId &&
        str(row.termId) === termId
      ));
      const paidAmount = sumMoney(payments.filter((row) => safeLower(row.status) === "paid"), "amountPaid");
      const pendingAmount = normalizeMoney(Math.max(normalizeMoney(item.netSalary) - paidAmount, 0));
      const latestPayment = payments.sort((a, b) => (asDate(b.paymentDate)?.getTime() || 0) - (asDate(a.paymentDate)?.getTime() || 0))[0] || null;
      return {
        id: str(item.id),
        staffId: str(item.staffId),
        staffName: str(staffMap.get(str(item.staffId))?.name || item.staffId),
        staffRole: str(staffMap.get(str(item.staffId))?.role || ""),
        basicSalary: normalizeMoney(item.basicSalary),
        allowance: normalizeMoney(item.allowance),
        deduction: normalizeMoney(item.deduction),
        netSalary: normalizeMoney(item.netSalary),
        paidAmount,
        pendingAmount,
        status: pendingAmount <= 0 && item.netSalary > 0 ? "Paid" : "Pending",
        latestPayment,
        history: sortByCreatedAtDesc(payments, "paymentDate"),
      };
    })
    .sort((a, b) => a.staffName.localeCompare(b.staffName));

  return {
    sessionId,
    termId,
    records: rows,
    summary: {
      totalPaid: sumMoney(rows, "paidAmount"),
      totalPending: sumMoney(rows, "pendingAmount"),
    },
  };
}

function payFinanceSalary(db, payload = {}, actor = {}) {
  ensureFinanceCollections(db);
  const structure = (db.financeStaffSalaries || []).find((item) => str(item.staffId) === str(payload.staffId));
  if (!structure) throw createHttpError(404, "Salary structure has not been set for this staff member");
  const scope = resolveScope(db, payload);
  const amountPaid = normalizeMoney(payload.amountPaid || structure.netSalary);
  if (amountPaid <= 0) throw createHttpError(400, "Salary amount must be greater than zero");

  const payment = {
    id: createFinanceId("salary-payment"),
    staffId: str(payload.staffId),
    amountPaid,
    paymentDate: str(payload.paymentDate || nowIso()),
    paymentMethod: safeLower(payload.paymentMethod) || "transfer",
    reference: str(payload.reference || createFinanceDocumentNumber(db.financeSalaryPayments || [], "SAL", nowIso())),
    sessionId: scope.sessionId,
    termId: scope.termId,
    status: ["paid", "pending"].includes(safeLower(payload.status)) ? safeLower(payload.status) : "paid",
    description: str(payload.description || "Salary payment"),
    createdAt: nowIso(),
  };

  db.financeSalaryPayments.unshift(payment);

  if (payment.status === "paid") {
    createLedgerEntries(db, {
      referenceType: "salary",
      referenceId: payment.id,
      description: payment.description,
      transactionDate: payment.paymentDate,
      sessionId: payment.sessionId,
      termId: payment.termId,
      createdBy: str(actor.id || actor.name),
      entries: [
        { accountCode: "EXP-001", type: "debit", amount: payment.amountPaid },
        { accountCode: "AST-001", type: "credit", amount: payment.amountPaid },
      ],
    });
  }

  return payment;
}

function buildTeacherSalaryView(db, user = {}, filters = {}) {
  ensureFinanceCollections(db);
  const payroll = listFinancePayroll(db, {
    ...filters,
    staffId: user.id,
  });
  return payroll.records[0] || null;
}

function listFinanceIncome(db, filters = {}) {
  ensureFinanceCollections(db);
  const { sessionId, termId } = resolveScope(db, filters);
  const rows = sortByCreatedAtDesc((db.financeIncome || []).filter((item) => {
    if (sessionId && str(item.sessionId) !== sessionId) return false;
    if (termId && str(item.termId) !== termId) return false;
    return true;
  }), "dateReceived");
  return { sessionId, termId, records: rows };
}

function resolveIncomeAccountCode(source) {
  const text = safeLower(source);
  if (text.includes("uniform")) return "INC-003";
  if (text.includes("donation")) return "INC-004";
  return "INC-002";
}

function createFinanceIncome(db, payload = {}, actor = {}) {
  ensureFinanceCollections(db);
  const amount = normalizeMoney(payload.amount);
  if (amount <= 0) throw createHttpError(400, "Income amount must be greater than zero");
  const scope = resolveScope(db, payload);
  const account = payload.accountId
    ? getFinanceAccountById(db, payload.accountId)
    : getFinanceAccountByCode(db, resolveIncomeAccountCode(payload.source));
  if (!account) throw createHttpError(400, "Income account could not be resolved");

  const income = {
    id: createFinanceId("finance-income"),
    accountId: account.id,
    source: str(payload.source),
    amount,
    description: str(payload.description),
    dateReceived: str(payload.dateReceived || nowIso()),
    sessionId: scope.sessionId,
    termId: scope.termId,
    receivedBy: str(actor.id || actor.name),
    createdAt: nowIso(),
  };

  if (!income.source) throw createHttpError(400, "Income source is required");

  db.financeIncome.unshift(income);
  createLedgerEntries(db, {
    referenceType: "income",
    referenceId: income.id,
    description: income.source,
    transactionDate: income.dateReceived,
    sessionId: income.sessionId,
    termId: income.termId,
    createdBy: income.receivedBy,
    entries: [
      { accountCode: "AST-001", type: "debit", amount: income.amount },
      { accountId: income.accountId, type: "credit", amount: income.amount },
    ],
  });

  return income;
}

function listFinanceBudgets(db, filters = {}, includeActuals = true) {
  ensureFinanceCollections(db);
  const { sessionId, termId } = resolveScope(db, filters);
  const rows = (db.financeBudgets || []).filter((item) => {
    if (sessionId && str(item.sessionId) !== sessionId) return false;
    if (termId && str(item.termId) !== termId) return false;
    return true;
  });
  const accountMap = new Map((db.financeAccounts || []).map((item) => [str(item.id), item]));
  const actualByAccount = new Map();

  if (includeActuals) {
    const expenseTransactions = aggregateTransactionsByAccountType(db, { sessionId, termId, type: "term" })
      .filter((item) => item.accountType === "expense")
      .map((item) => [item.accountId, normalizeMoney(item.debit - item.credit)]);
    for (const [accountId, actual] of expenseTransactions) {
      actualByAccount.set(str(accountId), actual);
    }
  }

  return {
    sessionId,
    termId,
    rows: rows.map((item) => {
      const actual = normalizeMoney(actualByAccount.get(str(item.accountId)) || 0);
      const amount = normalizeMoney(item.amount);
      return {
        id: str(item.id),
        accountId: str(item.accountId),
        accountName: str(accountMap.get(str(item.accountId))?.name || "Unknown account"),
        amount,
        actual,
        difference: normalizeMoney(amount - actual),
        createdAt: str(item.createdAt),
      };
    }).sort((a, b) => a.accountName.localeCompare(b.accountName)),
  };
}

function createFinanceBudget(db, payload = {}) {
  ensureFinanceCollections(db);
  const scope = resolveScope(db, payload);
  const accountId = str(payload.accountId);
  if (!accountId) throw createHttpError(400, "Budget account is required");
  const amount = normalizeMoney(payload.amount);
  if (amount <= 0) throw createHttpError(400, "Budget amount must be greater than zero");
  let row = (db.financeBudgets || []).find((item) => (
    str(item.accountId) === accountId &&
    str(item.sessionId) === scope.sessionId &&
    str(item.termId) === scope.termId
  ));
  if (row) {
    row.amount = amount;
    row.createdAt = nowIso();
    return row;
  }
  row = {
    id: createFinanceId("finance-budget"),
    accountId,
    sessionId: scope.sessionId,
    termId: scope.termId,
    amount,
    createdAt: nowIso(),
  };
  db.financeBudgets.unshift(row);
  return row;
}

function getFinanceSettings(db) {
  ensureFinanceCollections(db);
  return {
    currency: db.financeSettings.currency,
    activeSessionId: str(db.financeSettings.activeSessionId),
    activeTermId: str(db.financeSettings.activeTermId),
    paymentMethods: [...db.financeSettings.paymentMethods],
    expenseCategories: [...db.financeSettings.expenseCategories],
    accountTypes: [...db.financeSettings.accountTypes],
  };
}

function updateFinanceSettings(db, payload = {}) {
  ensureFinanceCollections(db);
  if (payload.currency) {
    db.financeSettings.currency = str(payload.currency).toUpperCase() || SCHOOL_CURRENCY;
  }
  if (payload.activeSessionId) {
    const nextSessionId = str(payload.activeSessionId);
    const nextTerm =
      findAcademicTerm(db, payload.activeTermId, nextSessionId) ||
      (db.terms || []).find((item) => str(item.sessionId) === nextSessionId && Boolean(item.isActive)) ||
      (db.terms || []).find((item) => str(item.sessionId) === nextSessionId) ||
      null;
    setActiveAcademicScope(db, nextSessionId, nextTerm?.id);
  }
  if (payload.activeTermId && !payload.activeSessionId) {
    setActiveAcademicScope(db, db.financeSettings.activeSessionId, payload.activeTermId);
  }
  if (Array.isArray(payload.paymentMethods) && payload.paymentMethods.length > 0) {
    db.financeSettings.paymentMethods = payload.paymentMethods.map((item) => safeLower(item)).filter(Boolean);
  }
  if (Array.isArray(payload.expenseCategories) && payload.expenseCategories.length > 0) {
    db.financeSettings.expenseCategories = payload.expenseCategories.map((item) => safeLower(item)).filter(Boolean);
  }
  if (Array.isArray(payload.accountTypes) && payload.accountTypes.length > 0) {
    db.financeSettings.accountTypes = payload.accountTypes.map((item) => safeLower(item)).filter((item) => ACCOUNT_TYPES.includes(item));
  }
  return getFinanceSettings(db);
}

function buildFinanceReceipt(db, paymentId) {
  ensureFinanceCollections(db);
  const payment = (db.financePayments || []).find((item) => str(item.id) === str(paymentId));
  if (!payment) throw createHttpError(404, "Finance payment not found");
  syncStudentFeeRows(db, { sessionId: payment.sessionId, termId: payment.termId, studentId: payment.studentId });
  const student = getStudents(db).find((item) => str(item.id) === str(payment.studentId));
  const feeRow =
    (db.financeStudentFees || []).find((item) => str(item.id) === str(payment.studentFeeId)) ||
    (db.financeStudentFees || []).find((item) => (
      str(item.studentId) === str(payment.studentId) &&
      str(item.sessionId) === str(payment.sessionId) &&
      str(item.termId) === str(payment.termId)
    ));
  const session = (db.academicSessions || []).find((item) => str(item.id) === str(payment.sessionId));
  const term = (db.terms || []).find((item) => str(item.id) === str(payment.termId));
  return {
    payment,
    studentFee: feeRow || {
      studentName: str(student?.name),
      className: str(student?.className),
      balance: 0,
    },
    sessionName: str(session?.sessionName),
    termName: str(term?.termName),
    currency: db.financeSettings.currency,
  };
}

function buildParentFeeView(db, user = {}) {
  ensureFinanceCollections(db);
  const linkedStudentIds = getParentLinkedStudentIds(user);
  const { sessionId, termId } = resolveScope(db, {});
  const rows = syncStudentFeeRows(db, { sessionId, termId }).filter((item) => linkedStudentIds.includes(str(item.studentId)));
  return {
    sessionId,
    termId,
    records: rows,
  };
}

module.exports = {
  FINANCE_VIEW_ROLES,
  FINANCE_MANAGE_ROLES,
  FINANCE_COLLECTIONS,
  ensureFinanceCollections,
  buildFinanceSetup,
  buildFinanceDashboard,
  listFinanceStudentFees,
  listFinancePayments,
  receiveFinancePayment,
  receiveFinancePaymentsBulk,
  voidFinancePayment,
  listFinanceExpenses,
  createFinanceExpense,
  updateFinanceExpense,
  deleteFinanceExpense,
  listFinancePurchases,
  createFinancePurchase,
  listFinancePayroll,
  saveFinanceSalaryStructure,
  payFinanceSalary,
  buildTeacherSalaryView,
  listFinanceIncome,
  createFinanceIncome,
  listFinanceBudgets,
  createFinanceBudget,
  buildFinanceReports,
  getFinanceSettings,
  updateFinanceSettings,
  buildFinanceReceipt,
  buildParentFeeView,
  getFinanceAccountByCode,
};
