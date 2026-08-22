import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  createFinanceBudget,
  createFinanceExpense,
  createFinanceIncome,
  createFinancePurchase,
  deleteFinanceExpense,
  getFinanceBudgets,
  getFinanceDashboard,
  getFinanceExpenses,
  getFinanceIncome,
  getFinancePayroll,
  getFinancePayments,
  getFinancePurchases,
  getFinanceReceipt,
  getFinanceReports,
  getFinanceSetup,
  getFinanceSettings,
  getFinanceStudentFees,
  payFinanceSalary,
  receiveFinancePayment,
  saveFinanceSalaryStructure,
  updateFinanceExpense,
  updateFinanceSettings,
} from "../api/services";
import "./FinanceDashboard.css";
import "./PortalSurface.css";

const TABS = [
  ["overview", "Overview"],
  ["fees", "Student Fees"],
  ["receive", "Receive Payment"],
  ["expenses", "Expenses"],
  ["purchases", "Purchases"],
  ["income", "Other Income"],
  ["payroll", "Payroll"],
  ["salary", "Pay Salary"],
  ["reports", "Reports"],
  ["statement", "Income Statement"],
  ["budget", "Budget"],
  ["settings", "Settings"],
];

const defaultFeeFilters = { sessionId: "", termId: "", classId: "", status: "", search: "" };
const defaultReportFilters = { type: "term", sessionId: "", termId: "" };
const defaultPaymentForm = { studentId: "", amount: "", paymentMethod: "transfer", reference: "", description: "" };
const defaultExpenseForm = { title: "", amount: "", category: "general", description: "", approvedBy: "" };
const defaultPurchaseForm = { itemName: "", quantity: "1", unitPrice: "", totalPrice: "", supplier: "", approvedBy: "" };
const defaultIncomeForm = { source: "", amount: "", description: "" };
const defaultSalaryStructureForm = { staffId: "", basicSalary: "", allowance: "", deduction: "" };
const defaultSalaryPaymentForm = { staffId: "", amountPaid: "", paymentMethod: "transfer", reference: "", description: "", status: "paid" };
const defaultBudgetForm = { accountId: "", amount: "" };
const defaultSettingsForm = {
  currency: "NGN",
  activeSessionId: "",
  activeTermId: "",
  paymentMethods: "cash, transfer, online",
  expenseCategories: "utilities, maintenance, supplies, operations, transport, fuel, repairs, general",
};

function formatCurrency(amount, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}

function formatDate(value) {
  const safe = String(value || "").trim();
  if (!safe) return "-";
  const date = new Date(safe);
  if (Number.isNaN(date.getTime())) return safe;
  return date.toLocaleDateString();
}

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

function FinanceTable({ columns, rows, empty = "No records yet." }) {
  return (
    <div className="finance-table-shell">
      <table className="finance-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row, index) => (
            <tr key={row.id || index}>
              {columns.map((column) => (
                <td key={column.key}>{typeof column.render === "function" ? column.render(row) : row[column.key]}</td>
              ))}
            </tr>
          )) : (
            <tr>
              <td colSpan={columns.length} className="finance-table-empty">{empty}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="finance-summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function FinanceDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [setup, setSetup] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [fees, setFees] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [incomeRows, setIncomeRows] = useState([]);
  const [payroll, setPayroll] = useState({ records: [], summary: { totalPaid: 0, totalPending: 0 } });
  const [budgets, setBudgets] = useState([]);
  const [reports, setReports] = useState(null);

  const [feeFilters, setFeeFilters] = useState(defaultFeeFilters);
  const [reportFilters, setReportFilters] = useState(defaultReportFilters);
  const [paymentForm, setPaymentForm] = useState(defaultPaymentForm);
  const [expenseForm, setExpenseForm] = useState(defaultExpenseForm);
  const [expenseEditingId, setExpenseEditingId] = useState("");
  const [purchaseForm, setPurchaseForm] = useState(defaultPurchaseForm);
  const [incomeForm, setIncomeForm] = useState(defaultIncomeForm);
  const [salaryStructureForm, setSalaryStructureForm] = useState(defaultSalaryStructureForm);
  const [salaryPaymentForm, setSalaryPaymentForm] = useState(defaultSalaryPaymentForm);
  const [budgetForm, setBudgetForm] = useState(defaultBudgetForm);
  const [settingsForm, setSettingsForm] = useState(defaultSettingsForm);

  const currency = setup?.currency || settingsForm.currency || "NGN";
  const sessions = useMemo(() => (Array.isArray(setup?.sessions) ? setup.sessions : []), [setup]);
  const terms = useMemo(() => (Array.isArray(setup?.terms) ? setup.terms : []), [setup]);
  const classes = useMemo(() => (Array.isArray(setup?.classes) ? setup.classes : []), [setup]);
  const students = useMemo(() => (Array.isArray(setup?.students) ? setup.students : []), [setup]);
  const staff = useMemo(() => (Array.isArray(setup?.staff) ? setup.staff : []), [setup]);
  const accounts = useMemo(() => (Array.isArray(setup?.accounts) ? setup.accounts : []), [setup]);

  const feeTermOptions = useMemo(() => {
    const sessionId = feeFilters.sessionId || setup?.activeSessionId || "";
    return terms.filter((item) => String(item.sessionId) === String(sessionId));
  }, [terms, feeFilters.sessionId, setup]);

  const settingsTermOptions = useMemo(() => {
    const sessionId = settingsForm.activeSessionId || setup?.activeSessionId || "";
    return terms.filter((item) => String(item.sessionId) === String(sessionId));
  }, [terms, settingsForm.activeSessionId, setup]);

  const reportTermOptions = useMemo(() => {
    const sessionId = reportFilters.sessionId || setup?.activeSessionId || "";
    return terms.filter((item) => String(item.sessionId) === String(sessionId));
  }, [terms, reportFilters.sessionId, setup]);

  const feeStudentOptions = useMemo(
    () => students.filter((item) => !feeFilters.classId || String(item.classId) === String(feeFilters.classId)),
    [students, feeFilters.classId]
  );

  const budgetAccountOptions = useMemo(
    () => accounts.filter((item) => item.type === "expense"),
    [accounts]
  );

  const syncFormsFromSetup = (setupData, settingsData) => {
    const activeSessionId = setupData?.activeSessionId || "";
    const activeTermId = setupData?.activeTermId || "";

    setFeeFilters((prev) => ({ ...prev, sessionId: prev.sessionId || activeSessionId, termId: prev.termId || activeTermId }));
    setReportFilters((prev) => ({ ...prev, sessionId: prev.sessionId || activeSessionId, termId: prev.termId || activeTermId }));
    setSettingsForm({
      currency: settingsData?.currency || setupData?.currency || "NGN",
      activeSessionId: settingsData?.activeSessionId || activeSessionId,
      activeTermId: settingsData?.activeTermId || activeTermId,
      paymentMethods: Array.isArray(settingsData?.paymentMethods) ? settingsData.paymentMethods.join(", ") : defaultSettingsForm.paymentMethods,
      expenseCategories: Array.isArray(settingsData?.expenseCategories) ? settingsData.expenseCategories.join(", ") : defaultSettingsForm.expenseCategories,
    });
  };

  const loadAll = async (nextFilters = null, nextReportFilters = null) => {
    const feeScope = nextFilters || feeFilters;
    const reportScope = nextReportFilters || reportFilters;

    try {
      setLoading(true);
      setError("");

      const [setupRes, settingsRes] = await Promise.all([getFinanceSetup(), getFinanceSettings()]);
      const setupData = setupRes.data || {};
      const settingsData = settingsRes.data || {};
      setSetup(setupData);
      syncFormsFromSetup(setupData, settingsData);

      const scopedFeeFilters = {
        ...feeScope,
        sessionId: feeScope.sessionId || setupData.activeSessionId || "",
        termId: feeScope.termId || setupData.activeTermId || "",
      };
      const scopedReportFilters = {
        ...reportScope,
        sessionId: reportScope.sessionId || setupData.activeSessionId || "",
        termId: reportScope.termId || setupData.activeTermId || "",
      };

      setFeeFilters(scopedFeeFilters);
      setReportFilters(scopedReportFilters);

      const [dashboardRes, feesRes, paymentsRes, expensesRes, purchasesRes, incomeRes, payrollRes, budgetsRes, reportsRes] = await Promise.all([
        getFinanceDashboard(),
        getFinanceStudentFees(scopedFeeFilters),
        getFinancePayments(scopedFeeFilters),
        getFinanceExpenses(scopedFeeFilters),
        getFinancePurchases(scopedFeeFilters),
        getFinanceIncome(scopedFeeFilters),
        getFinancePayroll(scopedFeeFilters),
        getFinanceBudgets(scopedFeeFilters),
        getFinanceReports(scopedReportFilters),
      ]);

      setDashboard(dashboardRes.data || null);
      setFees(Array.isArray(feesRes.data?.records) ? feesRes.data.records : []);
      setPayments(Array.isArray(paymentsRes.data?.records) ? paymentsRes.data.records : []);
      setExpenses(Array.isArray(expensesRes.data?.records) ? expensesRes.data.records : []);
      setPurchases(Array.isArray(purchasesRes.data?.records) ? purchasesRes.data.records : []);
      setIncomeRows(Array.isArray(incomeRes.data?.records) ? incomeRes.data.records : []);
      setPayroll(payrollRes.data || { records: [], summary: { totalPaid: 0, totalPending: 0 } });
      setBudgets(Array.isArray(budgetsRes.data?.rows) ? budgetsRes.data.rows : []);
      setReports(reportsRes.data || null);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load finance dashboard"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const runAction = async (label, work, successMessage, nextTab = "") => {
    try {
      setBusy(label);
      setError("");
      setMessage("");
      await work();
      if (successMessage) setMessage(successMessage);
      if (nextTab) setActiveTab(nextTab);
      await loadAll();
    } catch (err) {
      setError(getErrorMessage(err, "Request failed"));
    } finally {
      setBusy("");
    }
  };

  const handlePrintReceipt = async (paymentId) => {
    try {
      setBusy(`receipt-${paymentId}`);
      const res = await getFinanceReceipt(paymentId);
      const receiptHtml = String(res.data || "").trim();
      if (!receiptHtml) {
        throw new Error("Receipt content was empty");
      }
      const popup = window.open("", "_blank", "width=900,height=700");
      if (popup) {
        popup.document.open();
        popup.document.write(receiptHtml);
        popup.document.close();
        let printed = false;
        const printReceipt = () => {
          if (printed) return;
          printed = true;
          popup.focus();
          popup.print();
        };
        popup.onload = printReceipt;
        setTimeout(printReceipt, 500);
      } else {
        throw new Error("Please allow pop-ups to print receipts");
      }
    } catch (err) {
      setError(getErrorMessage(err, "Failed to open receipt"));
    } finally {
      setBusy("");
    }
  };

  const primePaymentForm = (row) => {
    setPaymentForm((prev) => ({
      ...prev,
      studentId: row.studentId,
      amount: row.balance > 0 ? String(row.balance) : "",
      description: `Fee payment for ${row.studentName}`,
    }));
    setActiveTab("receive");
  };

  const startExpenseEdit = (row) => {
    setExpenseEditingId(row.id);
    setExpenseForm({
      title: row.title || "",
      amount: row.amount || "",
      category: row.category || "general",
      description: row.description || "",
      approvedBy: row.approvedBy || "",
    });
    setActiveTab("expenses");
  };

  const handleExpenseSubmit = async (event) => {
    event.preventDefault();
    await runAction(
      "expense",
      async () => {
        if (expenseEditingId) {
          await updateFinanceExpense(expenseEditingId, expenseForm);
        } else {
          await createFinanceExpense(expenseForm);
        }
        setExpenseEditingId("");
        setExpenseForm(defaultExpenseForm);
      },
      expenseEditingId ? "Expense updated." : "Expense recorded."
    );
  };

  const feeColumns = [
    { key: "studentName", label: "Student" },
    { key: "totalFee", label: "Total Fee", render: (row) => formatCurrency(row.totalFee, currency) },
    { key: "amountPaid", label: "Paid", render: (row) => formatCurrency(row.amountPaid, currency) },
    { key: "balance", label: "Balance", render: (row) => formatCurrency(row.balance, currency) },
    { key: "status", label: "Status", render: (row) => <span className={`finance-pill ${String(row.status || "").toLowerCase()}`}>{row.status}</span> },
    { key: "actions", label: "Actions", render: (row) => <button type="button" onClick={() => primePaymentForm(row)}>Receive Payment</button> },
  ];

  const paymentColumns = [
    { key: "datePaid", label: "Date", render: (row) => formatDate(row.datePaid) },
    { key: "description", label: "Description" },
    { key: "amount", label: "Amount", render: (row) => formatCurrency(row.amount, currency) },
    { key: "paymentMethod", label: "Method" },
    { key: "receipt", label: "Receipt", render: (row) => <button type="button" onClick={() => handlePrintReceipt(row.id)}>Print Receipt</button> },
  ];

  const expenseColumns = [
    { key: "title", label: "Title" },
    { key: "category", label: "Category" },
    { key: "amount", label: "Amount", render: (row) => formatCurrency(row.amount, currency) },
    { key: "expenseDate", label: "Date", render: (row) => formatDate(row.expenseDate) },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="finance-inline-actions">
          <button type="button" onClick={() => startExpenseEdit(row)}>Edit</button>
          <button type="button" className="danger" onClick={() => runAction("delete-expense", () => deleteFinanceExpense(row.id), "Expense deleted.")}>Delete</button>
        </div>
      ),
    },
  ];

  const purchaseColumns = [
    { key: "itemName", label: "Item" },
    { key: "quantity", label: "Qty" },
    { key: "totalPrice", label: "Total", render: (row) => formatCurrency(row.totalPrice, currency) },
    { key: "supplier", label: "Supplier" },
  ];

  const incomeColumns = [
    { key: "source", label: "Source" },
    { key: "amount", label: "Amount", render: (row) => formatCurrency(row.amount, currency) },
    { key: "description", label: "Description" },
    { key: "dateReceived", label: "Date", render: (row) => formatDate(row.dateReceived) },
  ];

  const payrollColumns = [
    { key: "staffName", label: "Staff" },
    { key: "netSalary", label: "Salary", render: (row) => formatCurrency(row.netSalary, currency) },
    { key: "status", label: "Status", render: (row) => <span className={`finance-pill ${String(row.status || "").toLowerCase()}`}>{row.status}</span> },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <button
          type="button"
          onClick={() => {
            setSalaryPaymentForm((prev) => ({
              ...prev,
              staffId: row.staffId,
              amountPaid: String(row.pendingAmount || row.netSalary || ""),
              description: `Salary payment for ${row.staffName}`,
            }));
            setActiveTab("salary");
          }}
        >
          Pay Salary
        </button>
      ),
    },
  ];

  const budgetColumns = [
    { key: "accountName", label: "Category" },
    { key: "amount", label: "Budget", render: (row) => formatCurrency(row.amount, currency) },
    { key: "actual", label: "Actual", render: (row) => formatCurrency(row.actual, currency) },
    { key: "difference", label: "Difference", render: (row) => formatCurrency(row.difference, currency) },
  ];

  return (
    <div className="portal-surface-page finance-page">
      <div className="portal-surface-shell finance-shell">
        <section className="portal-surface-hero finance-hero">
          <div className="portal-surface-hero-copy">
            <div className="portal-surface-kicker">Angel Montessori School</div>
            <h1 className="portal-surface-title">Finance Overview</h1>
            <p className="portal-surface-subtitle">
              Manage student fees, ledger-backed finance records, expenses, purchases, payroll, budgets, and reports from one finance desk.
            </p>
          </div>
          <div className="portal-surface-actions">
            <Link to="/portal" className="portal-surface-action secondary">Portal Home</Link>
            <button type="button" className="portal-surface-action primary" onClick={() => setActiveTab("receive")}>Receive Payment</button>
          </div>
        </section>

        {error ? <div className="finance-alert error">{error}</div> : null}
        {message ? <div className="finance-alert success">{message}</div> : null}

        <div className="finance-summary-grid">
          <SummaryCard label="Total Income" value={formatCurrency(dashboard?.totalIncome, currency)} />
          <SummaryCard label="Total Expenses" value={formatCurrency(dashboard?.totalExpenses, currency)} />
          <SummaryCard label="Net Balance" value={formatCurrency(dashboard?.netBalance, currency)} />
          <SummaryCard label="Outstanding Fees" value={formatCurrency(dashboard?.outstandingFees, currency)} />
          <SummaryCard label="Salaries Paid" value={formatCurrency(dashboard?.totalSalariesPaid, currency)} />
          <SummaryCard label="Pending Salaries" value={formatCurrency(dashboard?.pendingSalaries, currency)} />
        </div>

        <div className="finance-quick-actions">
          <button type="button" onClick={() => setActiveTab("receive")}>Receive Payment</button>
          <button type="button" onClick={() => setActiveTab("expenses")}>Record Expense</button>
          <button type="button" onClick={() => setActiveTab("salary")}>Pay Salary</button>
          <button type="button" onClick={() => setActiveTab("reports")}>View Reports</button>
        </div>

        <div className="finance-tab-row">
          {TABS.map(([key, label]) => (
            <button key={key} type="button" className={activeTab === key ? "active" : ""} onClick={() => setActiveTab(key)}>
              {label}
            </button>
          ))}
        </div>

        {loading ? <div className="finance-card">Loading finance desk…</div> : null}

        {!loading && activeTab === "overview" ? (
          <div className="finance-card">
            <div className="finance-card-header">
              <div>
                <h2>Recent Transactions</h2>
                <p>Latest finance activity across payments, expenses, salaries, and other income.</p>
              </div>
            </div>
            <FinanceTable
              columns={[
                { key: "date", label: "Date", render: (row) => formatDate(row.date) },
                { key: "type", label: "Type" },
                { key: "description", label: "Description" },
                { key: "amount", label: "Amount", render: (row) => formatCurrency(row.amount, currency) },
              ]}
              rows={dashboard?.recentTransactions || []}
            />
          </div>
        ) : null}

        {!loading && activeTab === "fees" ? (
          <div className="finance-card-stack">
            <div className="finance-card">
              <div className="finance-card-header">
                <div>
                  <h2>Student Fees Management</h2>
                  <p>Track billed fees, amounts received, balances, and payment status per student.</p>
                </div>
              </div>
              <div className="finance-filter-grid">
                <select value={feeFilters.sessionId} onChange={(e) => setFeeFilters((prev) => ({ ...prev, sessionId: e.target.value, termId: "" }))}>
                  <option value="">Session</option>
                  {sessions.map((item) => <option key={item.id} value={item.id}>{item.sessionName}</option>)}
                </select>
                <select value={feeFilters.termId} onChange={(e) => setFeeFilters((prev) => ({ ...prev, termId: e.target.value }))}>
                  <option value="">Term</option>
                  {feeTermOptions.map((item) => <option key={item.id} value={item.id}>{item.termName}</option>)}
                </select>
                <select value={feeFilters.classId} onChange={(e) => setFeeFilters((prev) => ({ ...prev, classId: e.target.value }))}>
                  <option value="">Class</option>
                  {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
                <select value={feeFilters.status} onChange={(e) => setFeeFilters((prev) => ({ ...prev, status: e.target.value }))}>
                  <option value="">Status</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                  <option value="unpaid">Unpaid</option>
                </select>
                <input value={feeFilters.search} onChange={(e) => setFeeFilters((prev) => ({ ...prev, search: e.target.value }))} placeholder="Search student" />
                <button type="button" onClick={() => loadAll(feeFilters, reportFilters)}>Apply Filters</button>
              </div>
              <FinanceTable columns={feeColumns} rows={fees} />
            </div>
            <div className="finance-card">
              <div className="finance-card-header">
                <div>
                  <h2>Recent Fee Payments</h2>
                  <p>Print receipts and review the latest student fee payments.</p>
                </div>
              </div>
              <FinanceTable columns={paymentColumns} rows={payments.slice(0, 8)} />
            </div>
          </div>
        ) : null}

        {!loading && activeTab === "receive" ? (
          <div className="finance-card">
            <div className="finance-card-header">
              <div>
                <h2>Receive Payment</h2>
                <p>Record a school fee payment, issue a receipt, and update the student balance automatically.</p>
              </div>
            </div>
            <form className="finance-form-grid" onSubmit={(event) => {
              event.preventDefault();
              runAction("payment", async () => {
                await receiveFinancePayment({
                  ...paymentForm,
                  sessionId: feeFilters.sessionId || setup?.activeSessionId,
                  termId: feeFilters.termId || setup?.activeTermId,
                  amount: Number(paymentForm.amount || 0),
                });
                setPaymentForm(defaultPaymentForm);
              }, "Payment received and ledger updated.", "fees");
            }}>
              <label>
                Student
                <select value={paymentForm.studentId} onChange={(e) => setPaymentForm((prev) => ({ ...prev, studentId: e.target.value }))}>
                  <option value="">Select student</option>
                  {feeStudentOptions.map((item) => <option key={item.id} value={item.id}>{item.name} - {item.className}</option>)}
                </select>
              </label>
              <label>
                Amount
                <input value={paymentForm.amount} onChange={(e) => setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))} placeholder="50000" />
              </label>
              <label>
                Method
                <select value={paymentForm.paymentMethod} onChange={(e) => setPaymentForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}>
                  {(setup?.paymentMethods || ["cash", "transfer", "online"]).map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label>
                Reference
                <input value={paymentForm.reference} onChange={(e) => setPaymentForm((prev) => ({ ...prev, reference: e.target.value }))} placeholder="Optional" />
              </label>
              <label className="finance-form-span">
                Description
                <input value={paymentForm.description} onChange={(e) => setPaymentForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="School fee payment" />
              </label>
              <div className="finance-form-actions">
                <button type="submit" disabled={busy === "payment"}>{busy === "payment" ? "Submitting..." : "Submit Payment"}</button>
              </div>
            </form>
          </div>
        ) : null}

        {!loading && activeTab === "expenses" ? (
          <div className="finance-card-stack">
            <div className="finance-card">
              <div className="finance-card-header">
                <div>
                  <h2>{expenseEditingId ? "Edit Expense" : "Record Expense"}</h2>
                  <p>Log operational spending and post the matching ledger entries automatically.</p>
                </div>
              </div>
              <form className="finance-form-grid" onSubmit={handleExpenseSubmit}>
                <label>
                  Title
                  <input value={expenseForm.title} onChange={(e) => setExpenseForm((prev) => ({ ...prev, title: e.target.value }))} />
                </label>
                <label>
                  Category
                  <select value={expenseForm.category} onChange={(e) => setExpenseForm((prev) => ({ ...prev, category: e.target.value }))}>
                    {(setup?.expenseCategories || []).map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label>
                  Amount
                  <input value={expenseForm.amount} onChange={(e) => setExpenseForm((prev) => ({ ...prev, amount: e.target.value }))} />
                </label>
                <label>
                  Approved By
                  <input value={expenseForm.approvedBy} onChange={(e) => setExpenseForm((prev) => ({ ...prev, approvedBy: e.target.value }))} />
                </label>
                <label className="finance-form-span">
                  Description
                  <input value={expenseForm.description} onChange={(e) => setExpenseForm((prev) => ({ ...prev, description: e.target.value }))} />
                </label>
                <div className="finance-form-actions">
                  <button type="submit" disabled={busy === "expense"}>{busy === "expense" ? "Saving..." : expenseEditingId ? "Update Expense" : "Add Expense"}</button>
                  {expenseEditingId ? <button type="button" className="secondary" onClick={() => { setExpenseEditingId(""); setExpenseForm(defaultExpenseForm); }}>Cancel Edit</button> : null}
                </div>
              </form>
            </div>
            <div className="finance-card">
              <FinanceTable columns={expenseColumns} rows={expenses} />
            </div>
          </div>
        ) : null}

        {!loading && activeTab === "purchases" ? (
          <div className="finance-card-stack">
            <div className="finance-card">
              <div className="finance-card-header">
                <div>
                  <h2>Add Purchase</h2>
                  <p>Record books, chairs, supplies, and bulk items bought for school operations.</p>
                </div>
              </div>
              <form className="finance-form-grid" onSubmit={(event) => {
                event.preventDefault();
                runAction("purchase", async () => {
                  await createFinancePurchase({
                    ...purchaseForm,
                    quantity: Number(purchaseForm.quantity || 1),
                    unitPrice: Number(purchaseForm.unitPrice || 0),
                    totalPrice: Number(purchaseForm.totalPrice || 0),
                  });
                  setPurchaseForm(defaultPurchaseForm);
                }, "Purchase recorded.");
              }}>
                <label><span>Item</span><input value={purchaseForm.itemName} onChange={(e) => setPurchaseForm((prev) => ({ ...prev, itemName: e.target.value }))} /></label>
                <label><span>Quantity</span><input value={purchaseForm.quantity} onChange={(e) => setPurchaseForm((prev) => ({ ...prev, quantity: e.target.value }))} /></label>
                <label><span>Unit Price</span><input value={purchaseForm.unitPrice} onChange={(e) => setPurchaseForm((prev) => ({ ...prev, unitPrice: e.target.value }))} /></label>
                <label><span>Total Price</span><input value={purchaseForm.totalPrice} onChange={(e) => setPurchaseForm((prev) => ({ ...prev, totalPrice: e.target.value }))} placeholder="Optional if auto-calculated" /></label>
                <label><span>Supplier</span><input value={purchaseForm.supplier} onChange={(e) => setPurchaseForm((prev) => ({ ...prev, supplier: e.target.value }))} /></label>
                <label><span>Approved By</span><input value={purchaseForm.approvedBy} onChange={(e) => setPurchaseForm((prev) => ({ ...prev, approvedBy: e.target.value }))} /></label>
                <div className="finance-form-actions"><button type="submit" disabled={busy === "purchase"}>{busy === "purchase" ? "Saving..." : "Add Purchase"}</button></div>
              </form>
            </div>
            <div className="finance-card"><FinanceTable columns={purchaseColumns} rows={purchases} /></div>
          </div>
        ) : null}

        {!loading && activeTab === "income" ? (
          <div className="finance-card-stack">
            <div className="finance-card">
              <div className="finance-card-header">
                <div>
                  <h2>Record Other Income</h2>
                  <p>Capture non-fee income such as uniform sales, donations, or approved school revenue.</p>
                </div>
              </div>
              <form className="finance-form-grid" onSubmit={(event) => {
                event.preventDefault();
                runAction("income", async () => {
                  await createFinanceIncome({ ...incomeForm, amount: Number(incomeForm.amount || 0) });
                  setIncomeForm(defaultIncomeForm);
                }, "Other income recorded.");
              }}>
                <label><span>Source</span><input value={incomeForm.source} onChange={(e) => setIncomeForm((prev) => ({ ...prev, source: e.target.value }))} placeholder="Uniform sales" /></label>
                <label><span>Amount</span><input value={incomeForm.amount} onChange={(e) => setIncomeForm((prev) => ({ ...prev, amount: e.target.value }))} /></label>
                <label className="finance-form-span"><span>Description</span><input value={incomeForm.description} onChange={(e) => setIncomeForm((prev) => ({ ...prev, description: e.target.value }))} /></label>
                <div className="finance-form-actions"><button type="submit" disabled={busy === "income"}>{busy === "income" ? "Saving..." : "Record Income"}</button></div>
              </form>
            </div>
            <div className="finance-card"><FinanceTable columns={incomeColumns} rows={incomeRows} /></div>
          </div>
        ) : null}

        {!loading && activeTab === "payroll" ? (
          <div className="finance-card-stack">
            <div className="finance-card">
              <div className="finance-card-header">
                <div>
                  <h2>Salary Structure</h2>
                  <p>Set or update the salary structure for staff before payroll is processed.</p>
                </div>
              </div>
              <form className="finance-form-grid" onSubmit={(event) => {
                event.preventDefault();
                runAction("salary-structure", async () => {
                  await saveFinanceSalaryStructure({
                    ...salaryStructureForm,
                    basicSalary: Number(salaryStructureForm.basicSalary || 0),
                    allowance: Number(salaryStructureForm.allowance || 0),
                    deduction: Number(salaryStructureForm.deduction || 0),
                  });
                  setSalaryStructureForm(defaultSalaryStructureForm);
                }, "Salary structure saved.");
              }}>
                <label>
                  Staff
                  <select value={salaryStructureForm.staffId} onChange={(e) => setSalaryStructureForm((prev) => ({ ...prev, staffId: e.target.value }))}>
                    <option value="">Select staff</option>
                    {staff.map((item) => <option key={item.id} value={item.id}>{item.name} - {item.role}</option>)}
                  </select>
                </label>
                <label><span>Basic Salary</span><input value={salaryStructureForm.basicSalary} onChange={(e) => setSalaryStructureForm((prev) => ({ ...prev, basicSalary: e.target.value }))} /></label>
                <label><span>Allowance</span><input value={salaryStructureForm.allowance} onChange={(e) => setSalaryStructureForm((prev) => ({ ...prev, allowance: e.target.value }))} /></label>
                <label><span>Deduction</span><input value={salaryStructureForm.deduction} onChange={(e) => setSalaryStructureForm((prev) => ({ ...prev, deduction: e.target.value }))} /></label>
                <div className="finance-form-actions"><button type="submit" disabled={busy === "salary-structure"}>{busy === "salary-structure" ? "Saving..." : "Save Salary Structure"}</button></div>
              </form>
            </div>
            <div className="finance-card"><FinanceTable columns={payrollColumns} rows={payroll.records || []} /></div>
          </div>
        ) : null}

        {!loading && activeTab === "salary" ? (
          <div className="finance-card">
            <div className="finance-card-header">
              <div><h2>Pay Salary</h2><p>Process staff salary payments and update payroll records and the ledger.</p></div>
            </div>
            <form className="finance-form-grid" onSubmit={(event) => {
              event.preventDefault();
              runAction("salary-payment", async () => {
                await payFinanceSalary({ ...salaryPaymentForm, amountPaid: Number(salaryPaymentForm.amountPaid || 0) });
                setSalaryPaymentForm(defaultSalaryPaymentForm);
              }, "Salary payment processed.", "payroll");
            }}>
              <label>
                Staff
                <select value={salaryPaymentForm.staffId} onChange={(e) => setSalaryPaymentForm((prev) => ({ ...prev, staffId: e.target.value }))}>
                  <option value="">Select staff</option>
                  {(payroll.records || []).map((item) => <option key={item.staffId} value={item.staffId}>{item.staffName}</option>)}
                </select>
              </label>
              <label><span>Amount</span><input value={salaryPaymentForm.amountPaid} onChange={(e) => setSalaryPaymentForm((prev) => ({ ...prev, amountPaid: e.target.value }))} /></label>
              <label>
                Method
                <select value={salaryPaymentForm.paymentMethod} onChange={(e) => setSalaryPaymentForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}>
                  {(setup?.paymentMethods || ["transfer"]).map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label><span>Reference</span><input value={salaryPaymentForm.reference} onChange={(e) => setSalaryPaymentForm((prev) => ({ ...prev, reference: e.target.value }))} /></label>
              <label>
                Status
                <select value={salaryPaymentForm.status} onChange={(e) => setSalaryPaymentForm((prev) => ({ ...prev, status: e.target.value }))}>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                </select>
              </label>
              <label className="finance-form-span"><span>Description</span><input value={salaryPaymentForm.description} onChange={(e) => setSalaryPaymentForm((prev) => ({ ...prev, description: e.target.value }))} /></label>
              <div className="finance-form-actions"><button type="submit" disabled={busy === "salary-payment"}>{busy === "salary-payment" ? "Processing..." : "Process Payment"}</button></div>
            </form>
          </div>
        ) : null}

        {!loading && activeTab === "reports" ? (
          <div className="finance-card-stack">
            <div className="finance-card">
              <div className="finance-card-header"><div><h2>Financial Reports</h2><p>Generate termly or yearly finance reports from the live ledger and activity records.</p></div></div>
              <form className="finance-form-grid" onSubmit={(event) => { event.preventDefault(); loadAll(feeFilters, reportFilters); }}>
                <label>
                  Report Type
                  <select value={reportFilters.type} onChange={(e) => setReportFilters((prev) => ({ ...prev, type: e.target.value }))}>
                    <option value="term">Termly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </label>
                <label>
                  Session
                  <select value={reportFilters.sessionId} onChange={(e) => setReportFilters((prev) => ({ ...prev, sessionId: e.target.value, termId: "" }))}>
                    <option value="">Session</option>
                    {sessions.map((item) => <option key={item.id} value={item.id}>{item.sessionName}</option>)}
                  </select>
                </label>
                <label>
                  Term
                  <select value={reportFilters.termId} onChange={(e) => setReportFilters((prev) => ({ ...prev, termId: e.target.value }))}>
                    <option value="">Term</option>
                    {reportTermOptions.map((item) => <option key={item.id} value={item.id}>{item.termName}</option>)}
                  </select>
                </label>
                <div className="finance-form-actions"><button type="submit">Generate Report</button></div>
              </form>
            </div>
            <div className="finance-card">
              <div className="finance-card-header"><div><h2>Available Reports</h2><p>These summaries are produced from the same finance ledger and filtered scope.</p></div></div>
              <ul className="finance-list">{(reports?.availableReports || []).map((item) => <li key={item}>{item}</li>)}</ul>
              <div className="finance-report-totals">
                <div><strong>Total Income:</strong> {formatCurrency(reports?.totals?.totalIncome, currency)}</div>
                <div><strong>Total Expense:</strong> {formatCurrency(reports?.totals?.totalExpense, currency)}</div>
                <div><strong>Net Balance:</strong> {formatCurrency(reports?.totals?.netBalance, currency)}</div>
              </div>
            </div>
          </div>
        ) : null}

        {!loading && activeTab === "statement" ? (
          <div className="finance-card">
            <div className="finance-card-header"><div><h2>Income Statement</h2><p>Income and expenses rolled up from the chart of accounts and general ledger.</p></div></div>
            <div className="finance-statement-grid">
              <div>
                <h3>Income</h3>
                <ul className="finance-list finance-list-tight">
                  {(reports?.incomeStatement?.income || []).map((item) => <li key={item.accountId}><span>{item.accountName}</span><strong>{formatCurrency(item.amount, currency)}</strong></li>)}
                </ul>
              </div>
              <div>
                <h3>Expenses</h3>
                <ul className="finance-list finance-list-tight">
                  {(reports?.incomeStatement?.expenses || []).map((item) => <li key={item.accountId}><span>{item.accountName}</span><strong>{formatCurrency(item.amount, currency)}</strong></li>)}
                </ul>
              </div>
            </div>
            <div className="finance-statement-summary">
              <div><strong>Total Income</strong><span>{formatCurrency(reports?.incomeStatement?.totalIncome, currency)}</span></div>
              <div><strong>Total Expenses</strong><span>{formatCurrency(reports?.incomeStatement?.totalExpense, currency)}</span></div>
              <div><strong>Net Profit / Balance</strong><span>{formatCurrency(reports?.incomeStatement?.netBalance, currency)}</span></div>
            </div>
          </div>
        ) : null}

        {!loading && activeTab === "budget" ? (
          <div className="finance-card-stack">
            <div className="finance-card">
              <div className="finance-card-header"><div><h2>Budget Management</h2><p>Create and monitor budget lines against actual expense performance.</p></div></div>
              <form className="finance-form-grid" onSubmit={(event) => {
                event.preventDefault();
                runAction("budget", async () => {
                  await createFinanceBudget({
                    ...budgetForm,
                    amount: Number(budgetForm.amount || 0),
                    sessionId: feeFilters.sessionId || setup?.activeSessionId,
                    termId: feeFilters.termId || setup?.activeTermId,
                  });
                  setBudgetForm(defaultBudgetForm);
                }, "Budget line saved.");
              }}>
                <label>
                  Category
                  <select value={budgetForm.accountId} onChange={(e) => setBudgetForm((prev) => ({ ...prev, accountId: e.target.value }))}>
                    <option value="">Select account</option>
                    {budgetAccountOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>
                <label><span>Amount</span><input value={budgetForm.amount} onChange={(e) => setBudgetForm((prev) => ({ ...prev, amount: e.target.value }))} /></label>
                <div className="finance-form-actions"><button type="submit" disabled={busy === "budget"}>{busy === "budget" ? "Saving..." : "Create Budget"}</button></div>
              </form>
            </div>
            <div className="finance-card"><FinanceTable columns={budgetColumns} rows={budgets} /></div>
          </div>
        ) : null}

        {!loading && activeTab === "settings" ? (
          <div className="finance-card">
            <div className="finance-card-header"><div><h2>Finance Settings</h2><p>Control finance-wide payment methods, categories, and the active reporting scope.</p></div></div>
            <form className="finance-form-grid" onSubmit={(event) => {
              event.preventDefault();
              runAction("settings", () => updateFinanceSettings(settingsForm), "Finance settings updated.");
            }}>
              <label><span>Currency</span><input value={settingsForm.currency} onChange={(e) => setSettingsForm((prev) => ({ ...prev, currency: e.target.value }))} /></label>
              <label>
                Active Session
                <select value={settingsForm.activeSessionId} onChange={(e) => setSettingsForm((prev) => ({ ...prev, activeSessionId: e.target.value, activeTermId: "" }))}>
                  <option value="">Select session</option>
                  {sessions.map((item) => <option key={item.id} value={item.id}>{item.sessionName}</option>)}
                </select>
              </label>
              <label>
                Active Term
                <select value={settingsForm.activeTermId} onChange={(e) => setSettingsForm((prev) => ({ ...prev, activeTermId: e.target.value }))}>
                  <option value="">Select term</option>
                  {settingsTermOptions.map((item) => <option key={item.id} value={item.id}>{item.termName}</option>)}
                </select>
              </label>
              <label className="finance-form-span"><span>Payment Methods</span><input value={settingsForm.paymentMethods} onChange={(e) => setSettingsForm((prev) => ({ ...prev, paymentMethods: e.target.value }))} /></label>
              <label className="finance-form-span"><span>Expense Categories</span><input value={settingsForm.expenseCategories} onChange={(e) => setSettingsForm((prev) => ({ ...prev, expenseCategories: e.target.value }))} /></label>
              <div className="finance-form-actions"><button type="submit" disabled={busy === "settings"}>{busy === "settings" ? "Saving..." : "Save Settings"}</button></div>
            </form>
            <div className="finance-settings-note"><strong>Account types:</strong> asset, liability, income, expense, equity</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
