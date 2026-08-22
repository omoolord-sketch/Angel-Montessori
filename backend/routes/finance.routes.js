const express = require("express");
const fs = require("fs");
const path = require("path");
const { auth, requireRole } = require("../middleware/auth");
const { readDB, writeDB } = require("../lib/jsonStore");
const { syncStudentRosterFromPrisma } = require("../lib/studentRosterSync");
const {
  FINANCE_VIEW_ROLES,
  FINANCE_MANAGE_ROLES,
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
} = require("../lib/finance");

const router = express.Router();

function parseList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  return String(value || "")
    .split(/\r?\n|,/)
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

function htmlEscape(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatCurrency(amount, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}

function getReceiptLogoDataUri() {
  const logoPath = path.join(__dirname, "..", "assets", "school-logo.jpg");
  try {
    const logo = fs.readFileSync(logoPath);
    return `data:image/jpeg;base64,${logo.toString("base64")}`;
  } catch (error) {
    return "";
  }
}

function buildReceiptMarkup(payload) {
  const { payment, studentFee, sessionName, termName, currency } = payload;
  const balance = Number(studentFee?.balance || 0);
  const logoDataUri = getReceiptLogoDataUri();

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Finance Receipt</title>
    <style>
      body { font-family: Georgia, serif; padding: 32px; color: #16355f; }
      .sheet { max-width: 760px; margin: 0 auto; border: 1px solid #dbe5f1; border-radius: 16px; padding: 28px; }
      .receipt-header { display: flex; align-items: center; gap: 16px; border-bottom: 1px solid #dbe5f1; padding-bottom: 18px; margin-bottom: 18px; }
      .receipt-logo { width: 76px; height: 76px; object-fit: contain; border: 1px solid #dbe5f1; border-radius: 50%; background: #fff; padding: 6px; }
      h1 { margin: 0 0 8px; font-size: 32px; }
      .kicker { color: #b27b13; text-transform: uppercase; letter-spacing: 0.12em; font-weight: 700; font-size: 12px; }
      .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; margin-top: 24px; }
      .meta strong { display: block; color: #183a68; margin-bottom: 6px; }
      .summary { margin-top: 24px; border-top: 1px solid #dbe5f1; padding-top: 20px; }
      .total { margin-top: 20px; padding: 18px; background: #f6f9ff; border-radius: 14px; display: flex; justify-content: space-between; font-size: 18px; font-weight: 700; }
      .note { margin-top: 16px; color: #5d7394; }
    </style>
  </head>
  <body>
    <div class="sheet">
      <div class="receipt-header">
        ${logoDataUri ? `<img class="receipt-logo" src="${logoDataUri}" alt="Angel Montessori School logo" />` : ""}
        <div>
          <div class="kicker">Angel Montessori School</div>
          <h1>Finance Receipt</h1>
          <div>Receipt No: <strong>${htmlEscape(payment.receiptNumber)}</strong></div>
        </div>
      </div>
      <div class="meta">
        <div><strong>Student</strong>${htmlEscape(studentFee?.studentName || "")}</div>
        <div><strong>Class</strong>${htmlEscape(studentFee?.className || "")}</div>
        <div><strong>Session</strong>${htmlEscape(sessionName)}</div>
        <div><strong>Term</strong>${htmlEscape(termName)}</div>
        <div><strong>Payment Method</strong>${htmlEscape(payment.paymentMethod)}</div>
        <div><strong>Reference</strong>${htmlEscape(payment.reference)}</div>
        <div><strong>Date Paid</strong>${htmlEscape(payment.datePaid)}</div>
        <div><strong>Received By</strong>${htmlEscape(payment.receivedBy)}</div>
      </div>
      <div class="summary">
        <div><strong>Description</strong></div>
        <div>${htmlEscape(payment.description)}</div>
      </div>
      <div class="total">
        <span>Amount Received</span>
        <span>${formatCurrency(payment.amount, currency)}</span>
      </div>
      <div class="note">Outstanding balance after this payment: ${formatCurrency(balance, currency)}</div>
    </div>
  </body>
</html>`;
}

router.get("/setup", auth(), requireRole(...FINANCE_MANAGE_ROLES), async (req, res) => {
  const db = readDB();
  await syncStudentRosterFromPrisma(db);
  ensureFinanceCollections(db);
  writeDB(db);
  res.json(buildFinanceSetup(db));
});

router.get("/dashboard", auth(), requireRole(...FINANCE_MANAGE_ROLES), (req, res) => {
  const db = readDB();
  ensureFinanceCollections(db);
  writeDB(db);
  res.json(buildFinanceDashboard(db));
});

router.get("/student-fees", auth(), requireRole(...FINANCE_MANAGE_ROLES), (req, res) => {
  const db = readDB();
  ensureFinanceCollections(db);
  const payload = listFinanceStudentFees(db, req.query || {});
  writeDB(db);
  res.json(payload);
});

router.get("/payments", auth(), requireRole(...FINANCE_MANAGE_ROLES), (req, res) => {
  const db = readDB();
  ensureFinanceCollections(db);
  const payload = listFinancePayments(db, req.query || {});
  writeDB(db);
  res.json(payload);
});

router.post("/payments", auth(), requireRole(...FINANCE_MANAGE_ROLES), async (req, res, next) => {
  try {
    const db = readDB();
    await syncStudentRosterFromPrisma(db);
    ensureFinanceCollections(db);
    const payload = receiveFinancePayment(db, req.body || {}, req.user || {});
    writeDB(db);
    res.status(201).json(payload);
  } catch (error) {
    next(error);
  }
});

router.post("/payments/bulk", auth(), requireRole(...FINANCE_MANAGE_ROLES), async (req, res, next) => {
  try {
    const db = readDB();
    await syncStudentRosterFromPrisma(db);
    ensureFinanceCollections(db);
    const payload = receiveFinancePaymentsBulk(db, req.body || {}, req.user || {});
    writeDB(db);
    res.status(201).json(payload);
  } catch (error) {
    next(error);
  }
});

router.get("/payments/:paymentId/receipt", auth(), requireRole(...FINANCE_MANAGE_ROLES), (req, res, next) => {
  try {
    const db = readDB();
    ensureFinanceCollections(db);
    const payload = buildFinanceReceipt(db, req.params.paymentId);
    const markup = buildReceiptMarkup(payload);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(markup);
  } catch (error) {
    next(error);
  }
});

router.patch("/payments/:paymentId/void", auth(), requireRole(...FINANCE_MANAGE_ROLES), (req, res, next) => {
  try {
    const db = readDB();
    ensureFinanceCollections(db);
    const payload = voidFinancePayment(db, req.params.paymentId, req.body || {}, req.user || {});
    writeDB(db);
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

router.delete("/payments/:paymentId", auth(), requireRole(...FINANCE_MANAGE_ROLES), (req, res, next) => {
  try {
    const db = readDB();
    ensureFinanceCollections(db);
    const payload = voidFinancePayment(
      db,
      req.params.paymentId,
      { reason: req.query.reason || "Payment reversed from finance desk" },
      req.user || {}
    );
    writeDB(db);
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

router.get("/expenses", auth(), requireRole(...FINANCE_MANAGE_ROLES), (req, res) => {
  const db = readDB();
  ensureFinanceCollections(db);
  res.json(listFinanceExpenses(db, req.query || {}));
});

router.post("/expenses", auth(), requireRole(...FINANCE_MANAGE_ROLES), (req, res, next) => {
  try {
    const db = readDB();
    ensureFinanceCollections(db);
    const record = createFinanceExpense(db, req.body || {}, req.user || {});
    writeDB(db);
    res.status(201).json({ record });
  } catch (error) {
    next(error);
  }
});

router.patch("/expenses/:expenseId", auth(), requireRole(...FINANCE_MANAGE_ROLES), (req, res, next) => {
  try {
    const db = readDB();
    ensureFinanceCollections(db);
    const record = updateFinanceExpense(db, req.params.expenseId, req.body || {}, req.user || {});
    writeDB(db);
    res.json({ record });
  } catch (error) {
    next(error);
  }
});

router.delete("/expenses/:expenseId", auth(), requireRole(...FINANCE_MANAGE_ROLES), (req, res, next) => {
  try {
    const db = readDB();
    ensureFinanceCollections(db);
    const record = deleteFinanceExpense(db, req.params.expenseId);
    writeDB(db);
    res.json({ record });
  } catch (error) {
    next(error);
  }
});

router.get("/purchases", auth(), requireRole(...FINANCE_MANAGE_ROLES), (req, res) => {
  const db = readDB();
  ensureFinanceCollections(db);
  res.json(listFinancePurchases(db, req.query || {}));
});

router.post("/purchases", auth(), requireRole(...FINANCE_MANAGE_ROLES), (req, res, next) => {
  try {
    const db = readDB();
    ensureFinanceCollections(db);
    const record = createFinancePurchase(db, req.body || {}, req.user || {});
    writeDB(db);
    res.status(201).json({ record });
  } catch (error) {
    next(error);
  }
});

router.get("/payroll", auth(), requireRole(...FINANCE_MANAGE_ROLES), (req, res) => {
  const db = readDB();
  ensureFinanceCollections(db);
  res.json(listFinancePayroll(db, req.query || {}));
});

router.post("/payroll/structures", auth(), requireRole(...FINANCE_MANAGE_ROLES), (req, res, next) => {
  try {
    const db = readDB();
    ensureFinanceCollections(db);
    const record = saveFinanceSalaryStructure(db, req.body || {});
    writeDB(db);
    res.status(201).json({ record });
  } catch (error) {
    next(error);
  }
});

router.post("/payroll/payments", auth(), requireRole(...FINANCE_MANAGE_ROLES), (req, res, next) => {
  try {
    const db = readDB();
    ensureFinanceCollections(db);
    const record = payFinanceSalary(db, req.body || {}, req.user || {});
    writeDB(db);
    res.status(201).json({ record });
  } catch (error) {
    next(error);
  }
});

router.get("/payroll/me", auth(), requireRole(...FINANCE_VIEW_ROLES), (req, res) => {
  const db = readDB();
  ensureFinanceCollections(db);
  const record = buildTeacherSalaryView(db, req.user || {}, req.query || {});
  res.json({ record });
});

router.get("/income", auth(), requireRole(...FINANCE_MANAGE_ROLES), (req, res) => {
  const db = readDB();
  ensureFinanceCollections(db);
  res.json(listFinanceIncome(db, req.query || {}));
});

router.post("/income", auth(), requireRole(...FINANCE_MANAGE_ROLES), (req, res, next) => {
  try {
    const db = readDB();
    ensureFinanceCollections(db);
    const record = createFinanceIncome(db, req.body || {}, req.user || {});
    writeDB(db);
    res.status(201).json({ record });
  } catch (error) {
    next(error);
  }
});

router.get("/budgets", auth(), requireRole(...FINANCE_MANAGE_ROLES), (req, res) => {
  const db = readDB();
  ensureFinanceCollections(db);
  res.json(listFinanceBudgets(db, req.query || {}));
});

router.post("/budgets", auth(), requireRole(...FINANCE_MANAGE_ROLES), (req, res, next) => {
  try {
    const db = readDB();
    ensureFinanceCollections(db);
    const record = createFinanceBudget(db, req.body || {});
    writeDB(db);
    res.status(201).json({ record });
  } catch (error) {
    next(error);
  }
});

router.get("/reports", auth(), requireRole(...FINANCE_MANAGE_ROLES), (req, res) => {
  const db = readDB();
  ensureFinanceCollections(db);
  const payload = buildFinanceReports(db, req.query || {}, true);
  writeDB(db);
  res.json(payload);
});

router.get("/settings", auth(), requireRole(...FINANCE_MANAGE_ROLES), (req, res) => {
  const db = readDB();
  ensureFinanceCollections(db);
  res.json(getFinanceSettings(db));
});

router.patch("/settings", auth(), requireRole(...FINANCE_MANAGE_ROLES), (req, res, next) => {
  try {
    const db = readDB();
    ensureFinanceCollections(db);
    const payload = {
      ...req.body,
      paymentMethods: parseList(req.body?.paymentMethods),
      expenseCategories: parseList(req.body?.expenseCategories),
      accountTypes: parseList(req.body?.accountTypes),
    };
    const settings = updateFinanceSettings(db, payload);
    writeDB(db);
    res.json(settings);
  } catch (error) {
    next(error);
  }
});

router.get("/parent/fees", auth(), requireRole("PARENT"), (req, res) => {
  const db = readDB();
  ensureFinanceCollections(db);
  const payload = buildParentFeeView(db, req.user || {});
  writeDB(db);
  res.json(payload);
});

module.exports = router;
