import { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import {
  bulkCancelAdminInvoices,
  bulkDeleteAdminInvoices,
  bulkUploadAdminFeeStructures,
  bulkUploadAdminStudentFeeAssignments,
  cancelAdminInvoice,
  createAdminDiscount,
  createAdminFeeStructure,
  createAdminFeeType,
  createAdminStudentFeeAssignment,
  deleteAdminInvoice,
  deleteAdminFeeStructure,
  exportAdminPayments,
  generateAdminInvoices,
  getAdminDiscounts,
  getAdminFeeStructures,
  getAdminSchoolFeeTemplates,
  getAdminFeeTypes,
  getAdminFinanceReports,
  getAdminFinanceSetup,
  getAdminFinanceStudents,
  getAdminInvoices,
  getAdminPayments,
  getAdminPaymentsSummary,
  getAdminReceipts,
  getAdminStudentFeeAssignments,
  reverseAdminPayment,
  updateAdminAcademicSession,
  updateAdminAcademicTerm,
  updateAdminFeeStructure,
  updateAdminFinanceSetup,
  updateAdminStudentFinanceStatus,
} from "../api/services";
import {
  downloadSchoolFeeTemplateExcel,
  downloadSchoolFeeTemplatePdf,
} from "../utils/schoolFeeTemplate";
import "./FinanceDashboard.css";

const defaultPaymentFilters = {
  status: "ALL",
  type: "ALL",
  role: "ALL",
  className: "",
  search: "",
  from: "",
  to: "",
};

const defaultInvoiceFilters = {
  status: "ALL",
  classId: "",
  search: "",
};

const discountTypes = ["SCHOLARSHIP", "WAIVER", "SIBLING_DISCOUNT", "SPECIAL_ADJUSTMENT"];
const providerOptions = ["REMITA", "PAYSTACK", "MOCK"];

const financeTabs = [
  { key: "dashboard", label: "Dashboard" },
  { key: "feeSetup", label: "Fee Setup" },
  { key: "invoices", label: "Invoices" },
  { key: "payments", label: "Payments" },
  { key: "receipts", label: "Receipts" },
  { key: "discounts", label: "Discounts" },
  { key: "reports", label: "Reports" },
  { key: "settings", label: "Settings" },
];

function cleanParams(filters) {
  const out = {};
  for (const [key, value] of Object.entries(filters || {})) {
    if (value === undefined || value === null) continue;
    const safe = String(value).trim();
    if (!safe || safe === "ALL") continue;
    out[key] = safe;
  }
  return out;
}

function formatCurrency(amount, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}

function formatPdfCurrency(amount, currency = "NGN") {
  return `${currency} ${Number(amount || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function safePdfFileName(value) {
  return String(value || "receipt").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "") || "receipt";
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function loadLogoDataUrl() {
  const res = await fetch(`${window.location.origin}/logo.png`, { cache: "force-cache" });
  if (!res.ok) return "";
  return blobToDataUrl(await res.blob());
}

function removeDarkLogoBackground(logoDataUrl) {
  return new Promise((resolve) => {
    if (!logoDataUrl) return resolve("");
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(logoDataUrl);
      ctx.drawImage(img, 0, 0);
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < image.data.length; i += 4) {
        const red = image.data[i];
        const green = image.data[i + 1];
        const blue = image.data[i + 2];
        if (red < 34 && green < 34 && blue < 34) {
          image.data[i + 3] = 0;
        }
      }
      ctx.putImageData(image, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(logoDataUrl);
    img.src = logoDataUrl;
  });
}

function makeFadedLogoDataUrl(logoDataUrl) {
  return new Promise((resolve) => {
    if (!logoDataUrl) return resolve("");
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 520;
      canvas.height = 520;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve("");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 0.08;
      const size = 420;
      ctx.drawImage(img, (canvas.width - size) / 2, (canvas.height - size) / 2, size, size);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve("");
    img.src = logoDataUrl;
  });
}

async function downloadReceiptPdf(row, currency = "NGN") {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 52;
  const receiptNumber = row.receiptNumber || "Receipt";
  const rawLogoDataUrl = await loadLogoDataUrl().catch(() => "");
  const logoDataUrl = await removeDarkLogoBackground(rawLogoDataUrl);
  const watermarkLogo = await makeFadedLogoDataUrl(logoDataUrl);

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  if (watermarkLogo) {
    doc.addImage(watermarkLogo, "PNG", (pageWidth - 380) / 2, 210, 380, 380);
  }

  doc.setDrawColor(219, 229, 241);
  doc.setLineWidth(1);
  doc.roundedRect(margin, 42, pageWidth - margin * 2, pageHeight - 96, 14, 14, "S");

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", margin + 18, 62, 66, 66);
  }

  doc.setTextColor(178, 123, 19);
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.text("ANGEL MONTESSORI SCHOOL", margin + 100, 80);

  doc.setTextColor(8, 41, 88);
  doc.setFontSize(28);
  doc.text("Payment Receipt", margin + 100, 110);

  doc.setFontSize(11);
  doc.setFont("times", "normal");
  doc.text(`Receipt No: ${receiptNumber}`, margin + 100, 132);

  doc.setDrawColor(219, 229, 241);
  doc.line(margin + 18, 152, pageWidth - margin - 18, 152);

  const fields = [
    ["Student", row.studentName || "-"],
    ["Class", row.className || "-"],
    ["Invoice", row.invoiceNumber || "-"],
    ["Payment Ref", row.paymentReference || "-"],
    ["Payment Method", row.paymentMethod || "ONLINE"],
    ["Issued", formatDateTime(row.issuedAt)],
    ["Session", row.sessionName || "-"],
    ["Term", row.termName || "-"],
  ];

  let y = 190;
  const colWidth = (pageWidth - margin * 2 - 44) / 2;
  fields.forEach(([label, value], index) => {
    const x = margin + 22 + (index % 2) * (colWidth + 24);
    if (index > 0 && index % 2 === 0) y += 64;
    doc.setTextColor(93, 115, 148);
    doc.setFont("times", "bold");
    doc.setFontSize(9);
    doc.text(String(label).toUpperCase(), x, y);
    doc.setTextColor(8, 41, 88);
    doc.setFontSize(12);
    doc.setFont("times", "bold");
    doc.text(String(value), x, y + 20, { maxWidth: colWidth });
    doc.setDrawColor(237, 242, 248);
    doc.line(x, y + 34, x + colWidth, y + 34);
  });

  const totalY = y + 92;
  doc.setFillColor(246, 249, 255);
  doc.roundedRect(margin + 22, totalY, pageWidth - margin * 2 - 44, 58, 12, 12, "F");
  doc.setTextColor(8, 41, 88);
  doc.setFont("times", "bold");
  doc.setFontSize(15);
  doc.text("Amount Received", margin + 42, totalY + 36);
  doc.text(formatPdfCurrency(row.paymentAmount, currency), pageWidth - margin - 42, totalY + 36, { align: "right" });

  doc.setTextColor(93, 115, 148);
  doc.setFont("times", "normal");
  doc.setFontSize(11);
  doc.text("This receipt confirms payment recorded by Angel Montessori School.", margin + 22, totalY + 96);

  doc.save(`${safePdfFileName(receiptNumber)}.pdf`);
}

function buildReceiptHtml(row, currency = "NGN") {
  const escape = (value) => String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escape(row.receiptNumber || "Receipt")}</title>
    <style>
      @page { size: A4; margin: 18mm; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Georgia, "Times New Roman", serif; color: #16355f; background: #fff; }
      .sheet { max-width: 760px; margin: 0 auto; border: 1px solid #dbe5f1; border-radius: 16px; padding: 28px; }
      .header { display: flex; align-items: center; gap: 16px; border-bottom: 1px solid #dbe5f1; padding-bottom: 18px; margin-bottom: 22px; }
      .logo { width: 74px; height: 74px; object-fit: contain; }
      .kicker { color: #b27b13; text-transform: uppercase; letter-spacing: 0.12em; font-weight: 700; font-size: 12px; }
      h1 { margin: 4px 0 6px; font-size: 32px; color: #082958; }
      .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 24px; margin-top: 22px; }
      .meta div { border-bottom: 1px solid #edf2f8; padding-bottom: 10px; }
      .meta span { display: block; color: #5d7394; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 5px; }
      .meta strong { color: #082958; }
      .total { margin-top: 26px; padding: 18px; background: #f6f9ff; border-radius: 14px; display: flex; justify-content: space-between; font-size: 18px; font-weight: 700; }
      .footer { margin-top: 28px; color: #5d7394; font-size: 13px; }
      @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } .sheet { border-radius: 0; } }
    </style>
  </head>
  <body>
    <main class="sheet">
      <section class="header">
        <img class="logo" src="${window.location.origin}/logo.png" alt="Angel Montessori School logo" />
        <div>
          <div class="kicker">Angel Montessori School</div>
          <h1>Payment Receipt</h1>
          <div>Receipt No: <strong>${escape(row.receiptNumber)}</strong></div>
        </div>
      </section>
      <section class="meta">
        <div><span>Student</span><strong>${escape(row.studentName || "-")}</strong></div>
        <div><span>Class</span><strong>${escape(row.className || "-")}</strong></div>
        <div><span>Invoice</span><strong>${escape(row.invoiceNumber || "-")}</strong></div>
        <div><span>Payment Ref</span><strong>${escape(row.paymentReference || "-")}</strong></div>
        <div><span>Payment Method</span><strong>${escape(row.paymentMethod || "ONLINE")}</strong></div>
        <div><span>Issued</span><strong>${escape(formatDateTime(row.issuedAt))}</strong></div>
        <div><span>Session</span><strong>${escape(row.sessionName || "-")}</strong></div>
        <div><span>Term</span><strong>${escape(row.termName || "-")}</strong></div>
      </section>
      <section class="total">
        <span>Amount Received</span>
        <span>${escape(formatCurrency(row.paymentAmount, currency))}</span>
      </section>
      <p class="footer">This receipt confirms payment recorded by Angel Montessori School.</p>
    </main>
  </body>
</html>`;
}

function printReceiptDocument(row, currency = "NGN") {
  const popup = window.open("", "_blank", "width=900,height=700");
  if (!popup) return false;
  popup.document.open();
  popup.document.write(buildReceiptHtml(row, currency));
  popup.document.close();
  let printed = false;
  const printOnce = () => {
    if (printed) return;
    printed = true;
    popup.focus();
    popup.print();
  };
  popup.onload = printOnce;
  setTimeout(printOnce, 500);
  return true;
}

function formatDate(value) {
  const safe = String(value || "").trim();
  if (!safe) return "-";
  const d = new Date(safe);
  if (Number.isNaN(d.getTime())) return safe;
  return d.toLocaleDateString();
}

function formatDateTime(value) {
  const safe = String(value || "").trim();
  if (!safe) return "-";
  const d = new Date(safe);
  if (Number.isNaN(d.getTime())) return safe;
  return d.toLocaleString();
}

function toPrettyProvider(value) {
  const safe = String(value || "").toUpperCase();
  if (safe === "MOCK") return "OFFLINE DEMO";
  return safe || "-";
}

function getErrorLabel(error) {
  if (!error) return "unknown error";
  const status = error?.response?.status;
  const backendMessage = error?.response?.data?.message;
  const axiosMessage = error?.message;
  if (status && backendMessage) return `${status} ${backendMessage}`;
  if (backendMessage) return backendMessage;
  if (axiosMessage) return axiosMessage;
  return "request failed";
}

function getStatusClass(value) {
  const status = String(value || "").toLowerCase();
  if (["paid", "success", "available", "active"].includes(status)) return "paid";
  if (["partial", "pending", "offline demo mode"].includes(status)) return "partial";
  if (["overdue", "failed", "unpaid", "missing configuration", "inactive"].includes(status)) return "unpaid";
  if (status === "cancelled") return "neutral";
  return "neutral";
}

function providerState(row) {
  if (String(row?.provider || "").toUpperCase() === "MOCK") return "Offline demo mode";
  return row?.available ? "Available" : "Missing configuration";
}

function StatusBadge({ value }) {
  return <span className={`finance-pill ${getStatusClass(value)}`}>{String(value || "-").toLowerCase()}</span>;
}

function ProviderBadge({ value }) {
  return <span className="finance-provider-badge">{toPrettyProvider(value)}</span>;
}

function FinanceOverviewCards({ summary, currency }) {
  const cards = [
    { label: "Total Expected", value: formatCurrency(summary?.totalExpected || 0, currency), tone: "blue" },
    { label: "Total Collected", value: formatCurrency(summary?.totalCollected || 0, currency), tone: "green" },
    { label: "Outstanding", value: formatCurrency(summary?.totalOutstanding || 0, currency), tone: "gold" },
    { label: "Payments Today", value: formatCurrency(summary?.paymentsToday || 0, currency), tone: "sky" },
    { label: "Overdue Invoices", value: summary?.overdueInvoices || 0, tone: "red" },
  ];

  return (
    <section className="finance-summary-grid">
      {cards.map((card) => (
        <article key={card.label} className={`finance-summary-card finance-summary-card-${card.tone}`}>
          <span>{card.label}</span>
          <strong>{card.value}</strong>
        </article>
      ))}
    </section>
  );
}

function FinanceTabs({ activeTab, onChange }) {
  return (
    <nav className="finance-tab-row" aria-label="School fees finance sections">
      {financeTabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={activeTab === tab.key ? "active" : ""}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

function FinanceCard({ title, description, actions, children }) {
  return (
    <section className="finance-card">
      <div className="finance-card-header">
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {actions ? <div className="finance-inline-actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="finance-empty-state">
      <strong>{title}</strong>
      {text ? <span>{text}</span> : null}
    </div>
  );
}

function TableShell({ minWidth = 900, children }) {
  return (
    <div className="finance-table-shell">
      <table className="finance-table" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

function FormField({ label, children, span = false }) {
  return (
    <label className={span ? "finance-form-span" : ""}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export default function AdminPaymentsDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [setup, setSetup] = useState(null);
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [reports, setReports] = useState(null);
  const [feeTypes, setFeeTypes] = useState([]);
  const [feeStructures, setFeeStructures] = useState([]);
  const [feeTemplates, setFeeTemplates] = useState([]);
  const [students, setStudents] = useState([]);
  const [studentAssignments, setStudentAssignments] = useState([]);
  const [discounts, setDiscounts] = useState([]);

  const [paymentFilters, setPaymentFilters] = useState(defaultPaymentFilters);
  const [invoiceFilters, setInvoiceFilters] = useState(defaultInvoiceFilters);
  const [feeSetupScope, setFeeSetupScope] = useState({
    sessionId: "",
    termId: "",
  });

  const [settingsForm, setSettingsForm] = useState({
    sessionId: "",
    termId: "",
    enabledProviders: [],
    defaultProvider: "",
  });
  const [sessionEditForm, setSessionEditForm] = useState({
    sessionId: "",
    sessionName: "",
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [termEditForm, setTermEditForm] = useState({
    termId: "",
    targetSessionId: "",
    termName: "",
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [studentFinanceStatusForm, setStudentFinanceStatusForm] = useState({
    studentId: "",
    financeStatus: "graduated",
    reason: "",
  });

  const [feeTypeForm, setFeeTypeForm] = useState({ feeName: "", feeCode: "", category: "tuition", isRecurring: true });
  const [feeStructureForm, setFeeStructureForm] = useState({
    classId: "",
    feeTypeId: "",
    amount: "",
    dueDate: "",
    structureType: "COMPULSORY",
    isActive: true,
  });
  const [feeStructureEditingId, setFeeStructureEditingId] = useState("");

  const [studentAssignmentForm, setStudentAssignmentForm] = useState({
    classId: "",
    studentId: "",
    feeTypeId: "",
    amount: "",
    dueDate: "",
    isActive: true,
    notes: "",
  });

  const [discountForm, setDiscountForm] = useState({
    invoiceId: "",
    studentId: "",
    amount: "",
    discountType: "SPECIAL_ADJUSTMENT",
    reason: "",
  });

  const [invoiceGenerationForm, setInvoiceGenerationForm] = useState({
    classId: "",
    dueDate: "",
    fallbackAmount: "",
    includePreviousBalance: false,
  });

  const [feeStructureBulkFile, setFeeStructureBulkFile] = useState(null);
  const [studentAssignmentBulkFile, setStudentAssignmentBulkFile] = useState(null);

  const currency = summary?.currency || "NGN";
  const classes = useMemo(() => (Array.isArray(setup?.classes) ? setup.classes : []), [setup]);
  const sessions = useMemo(() => (Array.isArray(setup?.sessions) ? setup.sessions : []), [setup]);
  const terms = useMemo(() => (Array.isArray(setup?.terms) ? setup.terms : []), [setup]);
  const providerStatus = useMemo(() => (Array.isArray(setup?.providerStatus) ? setup.providerStatus : []), [setup]);

  const termOptions = useMemo(() => {
    const sessionId = String(settingsForm.sessionId || setup?.activeSessionId || "");
    return terms.filter((row) => String(row.sessionId) === sessionId);
  }, [terms, setup, settingsForm.sessionId]);

  const feeSetupTermOptions = useMemo(() => {
    const sessionId = String(feeSetupScope.sessionId || setup?.activeSessionId || "");
    return terms.filter((row) => String(row.sessionId) === sessionId);
  }, [terms, setup, feeSetupScope.sessionId]);

  const activeFeeSetupSessionName = useMemo(() => {
    const sessionId = String(feeSetupScope.sessionId || setup?.activeSessionId || "");
    return sessions.find((row) => String(row.id) === sessionId)?.sessionName || "Active session";
  }, [sessions, setup, feeSetupScope.sessionId]);

  const activeFeeSetupTermName = useMemo(() => {
    const termId = String(feeSetupScope.termId || setup?.activeTermId || "");
    return terms.find((row) => String(row.id) === termId)?.termName || "Active term";
  }, [terms, setup, feeSetupScope.termId]);

  const filteredStudents = useMemo(() => {
    return students
      .filter((row) => !studentAssignmentForm.classId || String(row.classId) === String(studentAssignmentForm.classId))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [students, studentAssignmentForm.classId]);

  const discountableInvoices = useMemo(() => {
    return invoices
      .filter((row) => ["UNPAID", "PARTIAL", "OVERDUE"].includes(String(row.status || "").toUpperCase()))
      .slice(0, 500);
  }, [invoices]);

  const recentInvoices = useMemo(() => invoices.slice(0, 5), [invoices]);
  const recentPayments = useMemo(() => payments.slice(0, 5), [payments]);
  const classReportRows = Array.isArray(reports?.byClass) ? reports.byClass : [];
  const feeTypeReportRows = Array.isArray(reports?.byFeeType) ? reports.byFeeType : [];

  const loadDashboard = async (nextPaymentFilters = paymentFilters, nextInvoiceFilters = invoiceFilters, nextFeeSetupScope = feeSetupScope) => {
    try {
      setLoading(true);
      setError("");

      const setupRes = await getAdminFinanceSetup();
      const setupData = setupRes?.data || {};
      setSetup(setupData);

      const effectiveFeeScope = {
        sessionId: nextFeeSetupScope.sessionId || setupData.activeSessionId || "",
        termId: nextFeeSetupScope.termId || setupData.activeTermId || "",
      };
      setFeeSetupScope(effectiveFeeScope);

      setSettingsForm((prev) => ({
        sessionId: prev.sessionId || setupData.activeSessionId || "",
        termId: prev.termId || setupData.activeTermId || "",
        enabledProviders:
          Array.isArray(prev.enabledProviders) && prev.enabledProviders.length > 0
            ? prev.enabledProviders
            : (Array.isArray(setupData.providers) ? setupData.providers : []),
        defaultProvider: prev.defaultProvider || setupData.defaultProvider || "",
      }));

      const scopedParams = effectiveFeeScope;
      const scopedPaymentFilters = {
        ...nextPaymentFilters,
        sessionId: nextPaymentFilters.sessionId || effectiveFeeScope.sessionId,
        termId: nextPaymentFilters.termId || effectiveFeeScope.termId,
      };
      const scopedInvoiceFilters = {
        ...nextInvoiceFilters,
        sessionId: nextInvoiceFilters.sessionId || effectiveFeeScope.sessionId,
        termId: nextInvoiceFilters.termId || effectiveFeeScope.termId,
      };

      const sectionJobs = [
        { label: "overview", run: () => getAdminPaymentsSummary(cleanParams(scopedPaymentFilters)) },
        { label: "payments", run: () => getAdminPayments(cleanParams(scopedPaymentFilters)) },
        { label: "fee types", run: () => getAdminFeeTypes() },
        { label: "fee structures", run: () => getAdminFeeStructures(scopedParams) },
        { label: "fee templates", run: () => getAdminSchoolFeeTemplates(scopedParams) },
        { label: "students", run: () => getAdminFinanceStudents({}) },
        { label: "student assignments", run: () => getAdminStudentFeeAssignments(scopedParams) },
        { label: "invoices", run: () => getAdminInvoices(cleanParams(scopedInvoiceFilters)) },
        { label: "discounts", run: () => getAdminDiscounts({}) },
        { label: "receipts", run: () => getAdminReceipts(scopedParams) },
        { label: "reports", run: () => getAdminFinanceReports(scopedParams) },
      ];

      const settled = [];
      for (const job of sectionJobs) {
        try {
          settled.push({ label: job.label, status: "fulfilled", value: await job.run() });
        } catch (reason) {
          settled.push({ label: job.label, status: "rejected", reason });
        }
      }

      const pull = (name) => settled.find((row) => row.label === name) || { status: "rejected", reason: new Error("missing") };
      const overviewSet = pull("overview");
      const paymentsSet = pull("payments");
      const feeTypesSet = pull("fee types");
      const feeStructuresSet = pull("fee structures");
      const feeTemplatesSet = pull("fee templates");
      const studentsSet = pull("students");
      const assignmentsSet = pull("student assignments");
      const invoicesSet = pull("invoices");
      const discountsSet = pull("discounts");
      const receiptsSet = pull("receipts");
      const reportsSet = pull("reports");

      setSummary(overviewSet.status === "fulfilled" ? overviewSet.value?.data || null : null);
      setPayments(paymentsSet.status === "fulfilled" ? (Array.isArray(paymentsSet.value?.data?.records) ? paymentsSet.value.data.records : []) : []);
      setFeeTypes(feeTypesSet.status === "fulfilled" ? (Array.isArray(feeTypesSet.value?.data?.feeTypes) ? feeTypesSet.value.data.feeTypes : []) : []);
      setFeeStructures(feeStructuresSet.status === "fulfilled" ? (Array.isArray(feeStructuresSet.value?.data?.feeStructures) ? feeStructuresSet.value.data.feeStructures : []) : []);
      setFeeTemplates(feeTemplatesSet.status === "fulfilled" ? (Array.isArray(feeTemplatesSet.value?.data?.templates) ? feeTemplatesSet.value.data.templates : []) : []);
      setStudents(studentsSet.status === "fulfilled" ? (Array.isArray(studentsSet.value?.data?.students) ? studentsSet.value.data.students : []) : []);
      setStudentAssignments(assignmentsSet.status === "fulfilled" ? (Array.isArray(assignmentsSet.value?.data?.assignments) ? assignmentsSet.value.data.assignments : []) : []);
      setInvoices(invoicesSet.status === "fulfilled" ? (Array.isArray(invoicesSet.value?.data?.records) ? invoicesSet.value.data.records : []) : []);
      setDiscounts(discountsSet.status === "fulfilled" ? (Array.isArray(discountsSet.value?.data?.discounts) ? discountsSet.value.data.discounts : []) : []);
      setReceipts(receiptsSet.status === "fulfilled" ? (Array.isArray(receiptsSet.value?.data?.records) ? receiptsSet.value.data.records : []) : []);
      setReports(reportsSet.status === "fulfilled" ? reportsSet.value?.data?.reports || null : null);

      const failed = settled.filter((row) => row.status === "rejected");
      if (failed.length > 0) {
        const text = failed.map((row) => `${row.label} (${getErrorLabel(row.reason)})`).join(", ");
        setError(`Some finance sections failed to load: ${text}`);
      }
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load finance dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard(defaultPaymentFilters, defaultInvoiceFilters);
  }, []);

  const saveSettings = async () => {
    try {
      setBusy("settings");
      setError("");
      setMessage("");

      const enabled = Array.isArray(settingsForm.enabledProviders)
        ? settingsForm.enabledProviders.filter((row) => providerOptions.includes(String(row).toUpperCase()))
        : [];

      const payload = {
        sessionId: settingsForm.sessionId,
        termId: settingsForm.termId,
        enabledProviders: enabled,
        defaultProvider: settingsForm.defaultProvider,
      };

      await updateAdminFinanceSetup(payload);
      setMessage("Finance settings updated.");
      await loadDashboard(paymentFilters, invoiceFilters, {
        sessionId: settingsForm.sessionId,
        termId: settingsForm.termId,
      });
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to update settings");
    } finally {
      setBusy("");
    }
  };

  const changeFeeSetupSession = (sessionId) => {
    const nextTerms = terms.filter((row) => String(row.sessionId) === String(sessionId));
    const nextTerm = nextTerms.find((row) => row.isActive) || nextTerms[0] || null;
    setFeeSetupScope({
      sessionId,
      termId: nextTerm?.id || "",
    });
  };

  const applyFeeSetupScope = async () => {
    await loadDashboard(paymentFilters, invoiceFilters, feeSetupScope);
  };

  const chooseSessionForEdit = (sessionId) => {
    const row = sessions.find((item) => String(item.id) === String(sessionId));
    setSessionEditForm({
      sessionId,
      sessionName: row?.sessionName || "",
      startDate: row?.startDate || "",
      endDate: row?.endDate || "",
      reason: "",
    });
  };

  const chooseTermForEdit = (termId) => {
    const row = terms.find((item) => String(item.id) === String(termId));
    setTermEditForm({
      termId,
      targetSessionId: row?.sessionId || "",
      termName: row?.termName || "",
      startDate: row?.startDate || "",
      endDate: row?.endDate || "",
      reason: "",
    });
  };

  const saveSessionCorrection = async () => {
    if (!sessionEditForm.sessionId || !sessionEditForm.sessionName.trim()) {
      setError("Select a session and enter the correct session name.");
      return;
    }
    try {
      setBusy("session-correction");
      setError("");
      setMessage("");
      await updateAdminAcademicSession(sessionEditForm.sessionId, {
        sessionName: sessionEditForm.sessionName,
        startDate: sessionEditForm.startDate,
        endDate: sessionEditForm.endDate,
        updateInvoiceSnapshots: true,
        reason: sessionEditForm.reason || "Academic session correction",
      });
      setMessage("Academic session corrected and invoice labels updated.");
      await loadDashboard(paymentFilters, invoiceFilters);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to correct academic session");
    } finally {
      setBusy("");
    }
  };

  const saveTermCorrection = async () => {
    if (!termEditForm.termId || !termEditForm.targetSessionId || !termEditForm.termName.trim()) {
      setError("Select the term, correct session, and term name.");
      return;
    }
    try {
      setBusy("term-correction");
      setError("");
      setMessage("");
      const res = await updateAdminAcademicTerm(termEditForm.termId, {
        sessionId: termEditForm.targetSessionId,
        termName: termEditForm.termName,
        startDate: termEditForm.startDate,
        endDate: termEditForm.endDate,
        mergeIntoExisting: true,
        reassignRecords: true,
        updateInvoiceSnapshots: true,
        reason: termEditForm.reason || "Term assigned to wrong academic session",
      });
      const moved = Number(res?.data?.reassignedRecords || 0);
      setMessage(`Term corrected. ${moved} linked finance record${moved === 1 ? "" : "s"} reassigned.`);
      await loadDashboard(paymentFilters, invoiceFilters);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to correct term");
    } finally {
      setBusy("");
    }
  };

  const saveStudentFinanceStatus = async () => {
    if (!studentFinanceStatusForm.studentId) {
      setError("Select a student before updating finance status.");
      return;
    }
    try {
      setBusy("student-finance-status");
      setError("");
      setMessage("");
      await updateAdminStudentFinanceStatus(studentFinanceStatusForm.studentId, {
        financeStatus: studentFinanceStatusForm.financeStatus,
        reason: studentFinanceStatusForm.reason || "Finance record protection update",
      });
      setStudentFinanceStatusForm({ studentId: "", financeStatus: "graduated", reason: "" });
      setMessage("Student finance status updated. Historical records remain protected.");
      await loadDashboard(paymentFilters, invoiceFilters);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to update student finance status");
    } finally {
      setBusy("");
    }
  };

  const reversePaymentRecord = async (row) => {
    try {
      setBusy(`reverse-payment-${row.id}`);
      setError("");
      setMessage("");
      await reverseAdminPayment(row.id, { reason: "Payment reversed from School Fees & Payments" });
      setMessage("Payment reversed and linked invoice balance recalculated.");
      await loadDashboard(paymentFilters, invoiceFilters);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to reverse payment");
    } finally {
      setBusy("");
    }
  };

  const addFeeType = async () => {
    try {
      setBusy("feeType");
      setError("");
      await createAdminFeeType(feeTypeForm);
      setFeeTypeForm({ feeName: "", feeCode: "", category: "tuition", isRecurring: true });
      setMessage("Fee type created.");
      await loadDashboard(paymentFilters, invoiceFilters);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to create fee type");
    } finally {
      setBusy("");
    }
  };

  const addFeeStructure = async () => {
    try {
      setBusy("feeStructure");
      setError("");
      const payload = {
        ...feeStructureForm,
        sessionId: feeSetupScope.sessionId || setup?.activeSessionId,
        termId: feeSetupScope.termId || setup?.activeTermId,
      };

      if (feeStructureEditingId) {
        await updateAdminFeeStructure(feeStructureEditingId, payload);
      } else {
        await createAdminFeeStructure(payload);
      }

      setFeeStructureEditingId("");
      setFeeStructureForm({
        classId: "",
        feeTypeId: "",
        amount: "",
        dueDate: "",
        structureType: "COMPULSORY",
        isActive: true,
      });
      setMessage(feeStructureEditingId ? "Fee structure updated and invoices re-synced." : "Fee structure saved.");
      await loadDashboard(paymentFilters, invoiceFilters);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to save fee structure");
    } finally {
      setBusy("");
    }
  };

  const startFeeStructureEdit = (row) => {
    setFeeStructureEditingId(row.id);
    setFeeStructureForm({
      classId: row.classId || "",
      feeTypeId: row.feeTypeId || "",
      amount: String(row.amount || ""),
      dueDate: row.dueDate ? String(row.dueDate).slice(0, 10) : "",
      structureType: row.structureType || "COMPULSORY",
      isActive: row.isActive !== false,
    });
    setActiveTab("feeSetup");
  };

  const cancelFeeStructureEdit = () => {
    setFeeStructureEditingId("");
    setFeeStructureForm({
      classId: "",
      feeTypeId: "",
      amount: "",
      dueDate: "",
      structureType: "COMPULSORY",
      isActive: true,
    });
  };

  const removeFeeStructure = async (row) => {
    const label = `${row.className || "class"} - ${row.feeName || "fee"}`;
    if (!window.confirm(`Delete this fee structure?\n\n${label}\n\nInvoices for this class will be re-synced from the remaining active fee structures.`)) return;

    try {
      setBusy(`feeStructureDelete-${row.id}`);
      setError("");
      await deleteAdminFeeStructure(row.id);
      if (feeStructureEditingId === row.id) cancelFeeStructureEdit();
      setMessage("Fee structure deleted and related invoices re-synced.");
      await loadDashboard(paymentFilters, invoiceFilters);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to delete fee structure");
    } finally {
      setBusy("");
    }
  };

  const addStudentAssignment = async () => {
    try {
      setBusy("assignment");
      setError("");
      await createAdminStudentFeeAssignment({
        ...studentAssignmentForm,
        sessionId: feeSetupScope.sessionId || setup?.activeSessionId,
        termId: feeSetupScope.termId || setup?.activeTermId,
      });
      setStudentAssignmentForm((prev) => ({ ...prev, studentId: "", feeTypeId: "", amount: "", dueDate: "", notes: "" }));
      setMessage("Student fee assignment saved.");
      await loadDashboard(paymentFilters, invoiceFilters);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to save student fee assignment");
    } finally {
      setBusy("");
    }
  };

  const addDiscount = async () => {
    try {
      setBusy("discount");
      setError("");
      await createAdminDiscount(discountForm);
      setDiscountForm({ invoiceId: "", studentId: "", amount: "", discountType: "SPECIAL_ADJUSTMENT", reason: "" });
      setMessage("Discount applied.");
      await loadDashboard(paymentFilters, invoiceFilters);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to apply discount");
    } finally {
      setBusy("");
    }
  };

  const runInvoiceGeneration = async () => {
    try {
      setBusy("generate");
      setError("");
      await generateAdminInvoices({
        sessionId: feeSetupScope.sessionId || setup?.activeSessionId,
        termId: feeSetupScope.termId || setup?.activeTermId,
        classId: invoiceGenerationForm.classId,
        dueDate: invoiceGenerationForm.dueDate,
        fallbackAmount: invoiceGenerationForm.fallbackAmount ? Number(invoiceGenerationForm.fallbackAmount) : undefined,
        includePreviousBalance: Boolean(invoiceGenerationForm.includePreviousBalance),
      });
      setMessage("Invoices generated/synced.");
      await loadDashboard(paymentFilters, invoiceFilters);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to generate invoices");
    } finally {
      setBusy("");
    }
  };

  const applyPaymentFilters = async () => {
    await loadDashboard(paymentFilters, invoiceFilters);
  };

  const resetPaymentFilters = async () => {
    setPaymentFilters(defaultPaymentFilters);
    await loadDashboard(defaultPaymentFilters, invoiceFilters);
  };

  const applyInvoiceFilters = async () => {
    await loadDashboard(paymentFilters, invoiceFilters);
  };

  const resetInvoiceFilters = async () => {
    setInvoiceFilters(defaultInvoiceFilters);
    await loadDashboard(paymentFilters, defaultInvoiceFilters);
  };

  const cancelInvoice = async (row) => {
    if (!row?.id) return;
    const ok = window.confirm(`Cancel ${row.invoiceNumber || "this invoice"}?\n\nCancelled invoices are removed from active totals and hidden from All Status.`);
    if (!ok) return;

    try {
      setBusy(`cancel-invoice-${row.id}`);
      setError("");
      await cancelAdminInvoice(row.id, { reason: "Cancelled from finance invoice cleanup" });
      setMessage("Invoice cancelled and removed from active totals.");
      await loadDashboard(paymentFilters, invoiceFilters);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to cancel invoice");
    } finally {
      setBusy("");
    }
  };

  const deleteInvoice = async (row) => {
    if (!row?.id) return;
    if (Number(row.amountPaid || 0) > 0) {
      setError("This invoice has payment history. Cancel it instead of deleting it.");
      return;
    }
    const ok = window.confirm(`Permanently delete ${row.invoiceNumber || "this unpaid invoice"}?\n\nUse this only for test or duplicate invoices with no payments.`);
    if (!ok) return;

    try {
      setBusy(`delete-invoice-${row.id}`);
      setError("");
      await deleteAdminInvoice(row.id);
      setMessage("Unpaid invoice deleted.");
      await loadDashboard(paymentFilters, invoiceFilters);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to delete invoice");
    } finally {
      setBusy("");
    }
  };

  const cancelFilteredInvoices = async () => {
    const invoiceIds = invoices
      .filter((row) => String(row.status || "").toUpperCase() !== "CANCELLED")
      .map((row) => row.id)
      .filter(Boolean);

    if (invoiceIds.length === 0) {
      setError("No active invoices in the current filtered list to cancel.");
      return;
    }

    const ok = window.confirm(`Cancel ${invoiceIds.length} filtered invoice(s)?\n\nThis is the safest cleanup option for old test balances. They will no longer count in totals.`);
    if (!ok) return;

    try {
      setBusy("bulk-cancel-invoices");
      setError("");
      await bulkCancelAdminInvoices({ invoiceIds, reason: "Bulk cleanup from finance invoice screen" });
      setMessage(`${invoiceIds.length} filtered invoice(s) cancelled and removed from active totals.`);
      await loadDashboard(paymentFilters, invoiceFilters);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to cancel filtered invoices");
    } finally {
      setBusy("");
    }
  };

  const deleteFilteredUnpaidInvoices = async () => {
    const invoiceIds = invoices
      .filter((row) => Number(row.amountPaid || 0) <= 0)
      .map((row) => row.id)
      .filter(Boolean);

    if (invoiceIds.length === 0) {
      setError("No unpaid invoices in the current filtered list to delete.");
      return;
    }

    const ok = window.confirm(`Permanently delete ${invoiceIds.length} unpaid filtered invoice(s)?\n\nOnly use this for test records. Invoices with successful payments will be skipped by the backend.`);
    if (!ok) return;

    try {
      setBusy("bulk-delete-invoices");
      setError("");
      await bulkDeleteAdminInvoices({ invoiceIds, reason: "Bulk unpaid test cleanup from finance invoice screen" });
      setMessage("Filtered unpaid invoice cleanup completed.");
      await loadDashboard(paymentFilters, invoiceFilters);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to delete filtered unpaid invoices");
    } finally {
      setBusy("");
    }
  };

  const downloadExport = async () => {
    try {
      setBusy("export");
      setError("");
      const res = await exportAdminPayments(cleanParams({
        ...paymentFilters,
        sessionId: feeSetupScope.sessionId || setup?.activeSessionId || "",
        termId: feeSetupScope.termId || setup?.activeTermId || "",
      }));
      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payments-export-${Date.now()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to export payments");
    } finally {
      setBusy("");
    }
  };

  const parseSpreadsheetRows = async (file) => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
  };

  const uploadFeeStructures = async () => {
    if (!feeStructureBulkFile) return setError("Select fee structure file first");
    try {
      setBusy("feeStructureBulk");
      setError("");
      const rows = await parseSpreadsheetRows(feeStructureBulkFile);
      const scopedRows = rows.map((row) => ({
        ...row,
        Session_Id: row.Session_Id || row.SessionID || row.Session || row.Academic_Session || feeSetupScope.sessionId || setup?.activeSessionId || "",
        Term_Id: row.Term_Id || row.TermID || row.Term || row.Term_Name || feeSetupScope.termId || setup?.activeTermId || "",
      }));
      await bulkUploadAdminFeeStructures({ rows: scopedRows });
      setFeeStructureBulkFile(null);
      setMessage("Fee structures uploaded.");
      await loadDashboard(paymentFilters, invoiceFilters);
    } catch (e) {
      setError(e?.response?.data?.message || "Fee structure upload failed");
    } finally {
      setBusy("");
    }
  };

  const uploadStudentAssignments = async () => {
    if (!studentAssignmentBulkFile) return setError("Select student assignment file first");
    try {
      setBusy("assignmentBulk");
      setError("");
      const rows = await parseSpreadsheetRows(studentAssignmentBulkFile);
      const scopedRows = rows.map((row) => ({
        ...row,
        Session_Id: row.Session_Id || row.SessionID || row.Session || row.Academic_Session || feeSetupScope.sessionId || setup?.activeSessionId || "",
        Term_Id: row.Term_Id || row.TermID || row.Term || row.Term_Name || feeSetupScope.termId || setup?.activeTermId || "",
      }));
      await bulkUploadAdminStudentFeeAssignments({ rows: scopedRows });
      setStudentAssignmentBulkFile(null);
      setMessage("Student assignments uploaded.");
      await loadDashboard(paymentFilters, invoiceFilters);
    } catch (e) {
      setError(e?.response?.data?.message || "Student assignment upload failed");
    } finally {
      setBusy("");
    }
  };

  const renderDashboardTab = () => (
    <div className="finance-card-stack">
      <div className="finance-mini-grid">
        <FinanceCard title="Recent Invoices" description="Latest billed student accounts and their current balances.">
          {recentInvoices.length ? (
            <TableShell minWidth={760}>
              <thead>
                <tr>{["Invoice", "Student", "Class", "Status", "Balance"].map((h) => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {recentInvoices.map((row) => (
                  <tr key={row.id}>
                    <td>{row.invoiceNumber}</td>
                    <td>{row.studentName}</td>
                    <td>{row.className}</td>
                    <td><StatusBadge value={row.status} /></td>
                    <td>{formatCurrency(row.balance, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          ) : (
            <EmptyState title="No invoices yet" text="Generate invoices from the Invoices tab when fee setup is ready." />
          )}
        </FinanceCard>

        <FinanceCard title="Recent Payments" description="Successful, pending, and failed payment activity.">
          {recentPayments.length ? (
            <TableShell minWidth={760}>
              <thead>
                <tr>{["Reference", "Provider", "Status", "Amount", "Paid"].map((h) => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {recentPayments.map((row) => (
                  <tr key={row.id}>
                    <td>{row.reference}</td>
                    <td><ProviderBadge value={row.provider || row.gatewayName} /></td>
                    <td><StatusBadge value={row.status} /></td>
                    <td>{formatCurrency(row.amount, row.currency || currency)}</td>
                    <td>{formatDateTime(row.paidAt)}</td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          ) : (
            <EmptyState title="No payments yet" text="Payments will appear here once parents or staff complete a transaction." />
          )}
        </FinanceCard>
      </div>

      <FinanceCard title="Outstanding by Class" description="A quick view of where follow-up may be needed.">
        {classReportRows.length ? (
          <TableShell minWidth={760}>
            <thead>
              <tr>{["Class", "Expected", "Collected", "Outstanding", "Invoices"].map((h) => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {classReportRows.map((row) => (
                <tr key={row.className}>
                  <td>{row.className}</td>
                  <td>{formatCurrency(row.totalExpected, currency)}</td>
                  <td>{formatCurrency(row.totalCollected, currency)}</td>
                  <td>{formatCurrency(row.totalOutstanding, currency)}</td>
                  <td>{row.invoiceCount}</td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        ) : (
          <EmptyState title="No class summary yet" text="Class totals will appear once invoices are available." />
        )}
      </FinanceCard>
    </div>
  );

  const renderFeeSetupTab = () => (
    <div className="finance-card-stack">
      <FinanceCard title="Fee Types" description="Create reusable fee categories such as tuition, development levy, PTA levy, or examination fee.">
        <div className="finance-form-grid">
          <FormField label="Fee name">
            <input placeholder="e.g. Tuition" value={feeTypeForm.feeName} onChange={(e) => setFeeTypeForm((prev) => ({ ...prev, feeName: e.target.value }))} />
          </FormField>
          <FormField label="Fee code">
            <input placeholder="e.g. TUITION" value={feeTypeForm.feeCode} onChange={(e) => setFeeTypeForm((prev) => ({ ...prev, feeCode: e.target.value.toUpperCase() }))} />
          </FormField>
          <FormField label="Category">
            <input placeholder="e.g. tuition" value={feeTypeForm.category} onChange={(e) => setFeeTypeForm((prev) => ({ ...prev, category: e.target.value }))} />
          </FormField>
          <label className="finance-check-field">
            <input type="checkbox" checked={feeTypeForm.isRecurring} onChange={(e) => setFeeTypeForm((prev) => ({ ...prev, isRecurring: e.target.checked }))} />
            <span>Recurring fee</span>
          </label>
        </div>
        <div className="finance-form-actions">
          <button type="button" onClick={addFeeType} disabled={busy === "feeType"}>{busy === "feeType" ? "Saving..." : "Add Fee Type"}</button>
        </div>
      </FinanceCard>

      <FinanceCard title="Fee Setup Scope" description="Choose the academic session and term before creating fee templates, optional fees, or invoices.">
        <div className="finance-form-grid">
          <FormField label="Academic session">
            <select value={feeSetupScope.sessionId || setup?.activeSessionId || ""} onChange={(e) => changeFeeSetupSession(e.target.value)}>
              <option value="">Select session</option>
              {sessions.map((row) => <option key={row.id} value={row.id}>{row.sessionName}{row.isActive ? " (Active)" : ""}</option>)}
            </select>
          </FormField>
          <FormField label="Term">
            <select value={feeSetupScope.termId || setup?.activeTermId || ""} onChange={(e) => setFeeSetupScope((prev) => ({ ...prev, termId: e.target.value }))}>
              <option value="">Select term</option>
              {feeSetupTermOptions.map((row) => <option key={row.id} value={row.id}>{row.termName}{row.isActive ? " (Active)" : ""}</option>)}
            </select>
          </FormField>
          <div className="finance-scope-pill">
            {activeFeeSetupSessionName} / {activeFeeSetupTermName}
          </div>
        </div>
        <div className="finance-form-actions">
          <button type="button" onClick={applyFeeSetupScope} disabled={loading}>Apply Scope</button>
        </div>
      </FinanceCard>

      <FinanceCard title="Fee Structures" description="Build class fee templates for the selected academic session and term.">
        <div className="finance-form-grid">
          <FormField label="Class">
            <select value={feeStructureForm.classId} onChange={(e) => setFeeStructureForm((prev) => ({ ...prev, classId: e.target.value }))}>
              <option value="">Select class</option>
              {classes.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </FormField>
          <FormField label="Fee type">
            <select value={feeStructureForm.feeTypeId} onChange={(e) => setFeeStructureForm((prev) => ({ ...prev, feeTypeId: e.target.value }))}>
              <option value="">Select fee type</option>
              {feeTypes.map((row) => <option key={row.id} value={row.id}>{row.feeName}</option>)}
            </select>
          </FormField>
          <FormField label="Structure type">
            <select value={feeStructureForm.structureType} onChange={(e) => setFeeStructureForm((prev) => ({ ...prev, structureType: e.target.value }))}>
              <option value="COMPULSORY">Compulsory</option>
              <option value="OPTIONAL">Optional</option>
            </select>
          </FormField>
          <FormField label="Amount">
            <input type="number" placeholder="0.00" value={feeStructureForm.amount} onChange={(e) => setFeeStructureForm((prev) => ({ ...prev, amount: e.target.value }))} />
          </FormField>
          <FormField label="Due date">
            <input type="date" value={feeStructureForm.dueDate} onChange={(e) => setFeeStructureForm((prev) => ({ ...prev, dueDate: e.target.value }))} />
          </FormField>
          <label className="finance-check-field">
            <input type="checkbox" checked={feeStructureForm.isActive} onChange={(e) => setFeeStructureForm((prev) => ({ ...prev, isActive: e.target.checked }))} />
            <span>Active fee line</span>
          </label>
        </div>
        <div className="finance-form-actions">
          <button type="button" onClick={addFeeStructure} disabled={busy === "feeStructure"}>
            {busy === "feeStructure" ? "Saving..." : feeStructureEditingId ? "Update Fee Structure" : "Save Fee Structure"}
          </button>
          {feeStructureEditingId ? (
            <button type="button" className="secondary" onClick={cancelFeeStructureEdit}>Cancel Edit</button>
          ) : null}
        </div>
        <p className="finance-settings-note">
          Editing or deleting a fee structure affects only {activeFeeSetupSessionName} / {activeFeeSetupTermName}; existing invoice snapshots remain preserved.
        </p>

        <div className="finance-upload-row">
          <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setFeeStructureBulkFile(e.target.files?.[0] || null)} />
          <button type="button" onClick={uploadFeeStructures} disabled={busy === "feeStructureBulk"}>{busy === "feeStructureBulk" ? "Uploading..." : "Upload Fee Structure File"}</button>
        </div>

        {feeStructures.length ? (
          <TableShell minWidth={1040}>
            <thead>
              <tr>{["Class", "Fee", "Type", "Amount", "Due", "Active", "Actions"].map((h) => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {feeStructures.map((row) => (
                <tr key={row.id}>
                  <td>{row.className}</td>
                  <td>{row.feeName}</td>
                  <td><StatusBadge value={row.structureType} /></td>
                  <td>{formatCurrency(row.amount, currency)}</td>
                  <td>{formatDate(row.dueDate)}</td>
                  <td><StatusBadge value={row.isActive ? "Active" : "Inactive"} /></td>
                  <td>
                    <div className="finance-inline-actions">
                      <button type="button" onClick={() => startFeeStructureEdit(row)}>Edit</button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => removeFeeStructure(row)}
                        disabled={busy === `feeStructureDelete-${row.id}`}
                      >
                        {busy === `feeStructureDelete-${row.id}` ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        ) : (
          <EmptyState title="No fee structures yet" text="Add class fee lines to produce downloadable school fee templates." />
        )}
      </FinanceCard>

      <FinanceCard title="School Fee Templates" description="Download class templates generated from saved fee structures for the selected session and term.">
        {feeTemplates.length ? (
          <TableShell minWidth={960}>
            <thead>
              <tr>{["Class", "Session", "Term", "Compulsory", "Optional", "Due", "Download"].map((h) => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {feeTemplates.map((row) => (
                <tr key={`${row.classId}-${row.termId}`}>
                  <td>{row.className}</td>
                  <td>{row.sessionName}</td>
                  <td>{row.termName}</td>
                  <td>{formatCurrency(row.compulsoryTotal, currency)}</td>
                  <td>{formatCurrency(row.optionalTotal, currency)}</td>
                  <td>{formatDate(row.dueDate)}</td>
                  <td>
                    <div className="finance-inline-actions">
                      <button type="button" onClick={() => downloadSchoolFeeTemplateExcel(row)}>Excel</button>
                      <button type="button" onClick={() => downloadSchoolFeeTemplatePdf(row)}>PDF</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        ) : (
          <EmptyState title="No templates yet" text="Save fee structures for a class to generate its downloadable school fee template." />
        )}
      </FinanceCard>

      <FinanceCard title="Student Optional Fees" description="Assign student-specific fees such as transport, clubs, or optional services.">
        <div className="finance-form-grid">
          <FormField label="Class">
            <select value={studentAssignmentForm.classId} onChange={(e) => setStudentAssignmentForm((prev) => ({ ...prev, classId: e.target.value, studentId: "" }))}>
              <option value="">Select class</option>
              {classes.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </FormField>
          <FormField label="Student">
            <select value={studentAssignmentForm.studentId} onChange={(e) => setStudentAssignmentForm((prev) => ({ ...prev, studentId: e.target.value }))}>
              <option value="">Select student</option>
              {filteredStudents.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </FormField>
          <FormField label="Fee type">
            <select value={studentAssignmentForm.feeTypeId} onChange={(e) => setStudentAssignmentForm((prev) => ({ ...prev, feeTypeId: e.target.value }))}>
              <option value="">Select fee type</option>
              {feeTypes.map((row) => <option key={row.id} value={row.id}>{row.feeName}</option>)}
            </select>
          </FormField>
          <FormField label="Amount">
            <input type="number" placeholder="0.00" value={studentAssignmentForm.amount} onChange={(e) => setStudentAssignmentForm((prev) => ({ ...prev, amount: e.target.value }))} />
          </FormField>
          <FormField label="Due date">
            <input type="date" value={studentAssignmentForm.dueDate} onChange={(e) => setStudentAssignmentForm((prev) => ({ ...prev, dueDate: e.target.value }))} />
          </FormField>
          <FormField label="Notes">
            <input placeholder="Optional note" value={studentAssignmentForm.notes} onChange={(e) => setStudentAssignmentForm((prev) => ({ ...prev, notes: e.target.value }))} />
          </FormField>
        </div>
        <div className="finance-form-actions">
          <button type="button" onClick={addStudentAssignment} disabled={busy === "assignment"}>{busy === "assignment" ? "Saving..." : "Assign Fee"}</button>
        </div>

        <div className="finance-upload-row">
          <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setStudentAssignmentBulkFile(e.target.files?.[0] || null)} />
          <button type="button" onClick={uploadStudentAssignments} disabled={busy === "assignmentBulk"}>{busy === "assignmentBulk" ? "Uploading..." : "Upload Student Assignment File"}</button>
        </div>

        {studentAssignments.length ? (
          <TableShell minWidth={920}>
            <thead>
              <tr>{["Student", "Class", "Fee", "Amount", "Due", "Notes"].map((h) => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {studentAssignments.map((row) => (
                <tr key={row.id}>
                  <td>{row.studentName}</td>
                  <td>{row.className}</td>
                  <td>{row.feeName}</td>
                  <td>{formatCurrency(row.amount, currency)}</td>
                  <td>{formatDate(row.dueDate)}</td>
                  <td>{row.notes || "-"}</td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        ) : (
          <EmptyState title="No optional fees assigned" text="Student-specific fees will appear here after assignment." />
        )}
      </FinanceCard>
    </div>
  );

  const renderInvoicesTab = () => (
    <FinanceCard title="Invoice Management" description="Generate, sync, search, and monitor school fee invoices.">
      <div className="finance-form-grid finance-toolbar-grid">
        <FormField label="Generate for class">
          <select value={invoiceGenerationForm.classId} onChange={(e) => setInvoiceGenerationForm((prev) => ({ ...prev, classId: e.target.value }))}>
            <option value="">All Classes</option>
            {classes.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select>
        </FormField>
        <FormField label="Due date">
          <input type="date" value={invoiceGenerationForm.dueDate} onChange={(e) => setInvoiceGenerationForm((prev) => ({ ...prev, dueDate: e.target.value }))} />
        </FormField>
        <FormField label="Fallback amount">
          <input type="number" placeholder="Leave blank to use templates only" value={invoiceGenerationForm.fallbackAmount} onChange={(e) => setInvoiceGenerationForm((prev) => ({ ...prev, fallbackAmount: e.target.value }))} />
        </FormField>
        <label className="finance-check-field">
          <input type="checkbox" checked={invoiceGenerationForm.includePreviousBalance} onChange={(e) => setInvoiceGenerationForm((prev) => ({ ...prev, includePreviousBalance: e.target.checked }))} />
          <span>Include previous unpaid balance as arrears</span>
        </label>
      </div>
      <div className="finance-form-actions">
        <button type="button" onClick={runInvoiceGeneration} disabled={busy === "generate"}>{busy === "generate" ? "Generating..." : "Generate / Sync"}</button>
      </div>

      <div className="finance-filter-grid">
        <FormField label="Status">
          <select value={invoiceFilters.status} onChange={(e) => setInvoiceFilters((prev) => ({ ...prev, status: e.target.value }))}>
            <option value="ALL">All Status</option>
            <option value="UNPAID">UNPAID</option>
            <option value="PARTIAL">PARTIAL</option>
            <option value="PAID">PAID</option>
            <option value="OVERDUE">OVERDUE</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </FormField>
        <FormField label="Class">
          <select value={invoiceFilters.classId} onChange={(e) => setInvoiceFilters((prev) => ({ ...prev, classId: e.target.value }))}>
            <option value="">All Classes</option>
            {classes.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select>
        </FormField>
        <FormField label="Search">
          <input placeholder="Invoice, student, class..." value={invoiceFilters.search} onChange={(e) => setInvoiceFilters((prev) => ({ ...prev, search: e.target.value }))} />
        </FormField>
      </div>
      <div className="finance-form-actions">
        <button type="button" onClick={applyInvoiceFilters}>Apply Invoice Filters</button>
        <button type="button" className="secondary" onClick={resetInvoiceFilters}>Reset Invoice Filters</button>
        <button type="button" className="secondary" onClick={cancelFilteredInvoices} disabled={!invoices.length || busy === "bulk-cancel-invoices"}>
          {busy === "bulk-cancel-invoices" ? "Cancelling..." : "Cancel Filtered Invoices"}
        </button>
        <button type="button" className="danger" onClick={deleteFilteredUnpaidInvoices} disabled={!invoices.length || busy === "bulk-delete-invoices"}>
          {busy === "bulk-delete-invoices" ? "Deleting..." : "Delete Filtered Unpaid"}
        </button>
      </div>
      <p className="finance-muted">
        Cancelled invoices are hidden from All Status and excluded from finance totals. Use Status = CANCELLED to review them later.
      </p>

      {invoices.length ? (
        <TableShell minWidth={1120}>
          <thead>
            <tr>{["Invoice", "Student", "Class", "Status", "Total", "Paid", "Balance", "Term", "Due", "Actions"].map((h) => <th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {invoices.map((row) => (
              <tr key={row.id}>
                <td>{row.invoiceNumber}</td>
                <td>{row.studentName}</td>
                <td>{row.className}</td>
                <td><StatusBadge value={row.status} /></td>
                <td>{formatCurrency(row.totalAmount, currency)}</td>
                <td>{formatCurrency(row.amountPaid, currency)}</td>
                <td className="finance-amount-strong">{formatCurrency(row.balance, currency)}</td>
                <td>{[row.sessionName, row.termName].filter(Boolean).join(" / ") || "-"}</td>
                <td>{formatDate(row.dueDate)}</td>
                <td>
                  <div className="finance-row-actions">
                    {String(row.status || "").toUpperCase() !== "CANCELLED" ? (
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => cancelInvoice(row)}
                        disabled={busy === `cancel-invoice-${row.id}`}
                      >
                        {busy === `cancel-invoice-${row.id}` ? "Cancelling..." : "Cancel"}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="danger"
                      onClick={() => deleteInvoice(row)}
                      disabled={busy === `delete-invoice-${row.id}` || Number(row.amountPaid || 0) > 0}
                      title={Number(row.amountPaid || 0) > 0 ? "Invoices with payment history should be cancelled, not deleted." : "Delete unpaid test invoice"}
                    >
                      {busy === `delete-invoice-${row.id}` ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      ) : (
        <EmptyState title="No invoices found" text="Generate invoices or adjust the filters to see records." />
      )}
    </FinanceCard>
  );

  const renderPaymentsTab = () => (
    <FinanceCard
      title="Payment Management"
      description="Track gateway payments, filter transactions, and export payment records."
      actions={<button type="button" onClick={downloadExport} disabled={busy === "export"}>{busy === "export" ? "Exporting..." : "Export CSV"}</button>}
    >
      <div className="finance-filter-grid">
        <FormField label="Status">
          <select value={paymentFilters.status} onChange={(e) => setPaymentFilters((prev) => ({ ...prev, status: e.target.value }))}>
            <option value="ALL">All Status</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="PENDING">PENDING</option>
            <option value="FAILED">FAILED</option>
            <option value="REVERSED">REVERSED</option>
          </select>
        </FormField>
        <FormField label="Type">
          <select value={paymentFilters.type} onChange={(e) => setPaymentFilters((prev) => ({ ...prev, type: e.target.value }))}>
            <option value="ALL">All Types</option>
            <option value="STUDENT_FEE">STUDENT_FEE</option>
            <option value="APPLICATION_FEE">APPLICATION_FEE</option>
          </select>
        </FormField>
        <FormField label="Search">
          <input placeholder="Reference, student, invoice..." value={paymentFilters.search} onChange={(e) => setPaymentFilters((prev) => ({ ...prev, search: e.target.value }))} />
        </FormField>
        <FormField label="From">
          <input type="date" value={paymentFilters.from} onChange={(e) => setPaymentFilters((prev) => ({ ...prev, from: e.target.value }))} />
        </FormField>
        <FormField label="To">
          <input type="date" value={paymentFilters.to} onChange={(e) => setPaymentFilters((prev) => ({ ...prev, to: e.target.value }))} />
        </FormField>
      </div>
      <div className="finance-form-actions">
        <button type="button" onClick={applyPaymentFilters}>Apply Filters</button>
        <button type="button" className="secondary" onClick={resetPaymentFilters}>Reset Filters</button>
      </div>

      {payments.length ? (
        <TableShell minWidth={1200}>
          <thead>
            <tr>{["Reference", "Provider", "Status", "Amount", "Student", "Class", "Invoice", "Type", "Role", "Created", "Paid", "Actions"].map((h) => <th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {payments.map((row) => (
              <tr key={row.id}>
                <td>{row.reference}</td>
                <td><ProviderBadge value={row.provider || row.gatewayName} /></td>
                <td><StatusBadge value={row.status} /></td>
                <td className="finance-amount-strong">{formatCurrency(row.amount, row.currency || currency)}</td>
                <td>{row.studentName || "-"}</td>
                <td>{row.className || "-"}</td>
                <td>{row.invoiceLabel || "-"}</td>
                <td>{row.type}</td>
                <td>{row.role}</td>
                <td>{formatDateTime(row.createdAt)}</td>
                <td>{formatDateTime(row.paidAt)}</td>
                <td>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => reversePaymentRecord(row)}
                    disabled={busy === `reverse-payment-${row.id}` || String(row.status || "").toUpperCase() === "REVERSED"}
                  >
                    {String(row.status || "").toUpperCase() === "REVERSED" ? "Reversed" : "Reverse"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      ) : (
        <EmptyState title="No payments found" text="Payment records will appear here after successful or pending gateway activity." />
      )}
    </FinanceCard>
  );

  const renderReceiptsTab = () => (
    <FinanceCard
      title="Receipts"
      description="Review issued receipts linked to completed payment records."
    >
      {receipts.length ? (
        <TableShell minWidth={980}>
          <thead>
            <tr>{["Receipt", "Payment Ref", "Student", "Class", "Invoice", "Amount", "Issued", "Actions"].map((h) => <th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {receipts.map((row) => (
              <tr key={row.id}>
                <td>{row.receiptNumber}</td>
                <td>{row.paymentReference}</td>
                <td>{row.studentName || "-"}</td>
                <td>{row.className || "-"}</td>
                <td>{row.invoiceNumber || "-"}</td>
                <td className="finance-amount-strong">{formatCurrency(row.paymentAmount, currency)}</td>
                <td>{formatDateTime(row.issuedAt)}</td>
                <td>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        setError("");
                        await downloadReceiptPdf(row, currency);
                      } catch (e) {
                        setError("Failed to download receipt PDF.");
                      }
                    }}
                  >
                    Download PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      ) : (
        <EmptyState title="No receipts yet" text="Receipts will appear automatically after payment confirmation." />
      )}
    </FinanceCard>
  );

  const renderDiscountsTab = () => (
    <div className="finance-card-stack">
      <FinanceCard title="Apply Discount" description="Record scholarships, waivers, sibling discounts, or approved adjustments.">
        <div className="finance-form-grid">
          <FormField label="Invoice">
            <select value={discountForm.invoiceId} onChange={(e) => setDiscountForm((prev) => ({ ...prev, invoiceId: e.target.value }))}>
              <option value="">Invoice (Optional)</option>
              {discountableInvoices.map((row) => <option key={row.id} value={row.id}>{row.invoiceNumber} - {row.studentName}</option>)}
            </select>
          </FormField>
          <FormField label="Student">
            <select value={discountForm.studentId} onChange={(e) => setDiscountForm((prev) => ({ ...prev, studentId: e.target.value }))}>
              <option value="">Student (Optional)</option>
              {students.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </FormField>
          <FormField label="Discount type">
            <select value={discountForm.discountType} onChange={(e) => setDiscountForm((prev) => ({ ...prev, discountType: e.target.value }))}>
              {discountTypes.map((row) => <option key={row} value={row}>{row}</option>)}
            </select>
          </FormField>
          <FormField label="Amount">
            <input type="number" placeholder="0.00" value={discountForm.amount} onChange={(e) => setDiscountForm((prev) => ({ ...prev, amount: e.target.value }))} />
          </FormField>
          <FormField label="Reason" span>
            <input placeholder="Reason for discount" value={discountForm.reason} onChange={(e) => setDiscountForm((prev) => ({ ...prev, reason: e.target.value }))} />
          </FormField>
        </div>
        <div className="finance-form-actions">
          <button type="button" onClick={addDiscount} disabled={busy === "discount"}>{busy === "discount" ? "Applying..." : "Apply Discount"}</button>
        </div>
      </FinanceCard>

      <FinanceCard title="Discount History" description="Previously applied discounts and finance adjustments.">
        {discounts.length ? (
          <TableShell minWidth={900}>
            <thead>
              <tr>{["Invoice", "Student", "Type", "Amount", "Reason", "Created"].map((h) => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {discounts.map((row) => (
                <tr key={row.id}>
                  <td>{row.invoiceNumber || row.invoiceId || "-"}</td>
                  <td>{row.studentName || "-"}</td>
                  <td><StatusBadge value={row.discountType} /></td>
                  <td>{formatCurrency(row.amount, currency)}</td>
                  <td>{row.reason || "-"}</td>
                  <td>{formatDateTime(row.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        ) : (
          <EmptyState title="No discounts recorded" text="Discount history will appear after an approved adjustment is applied." />
        )}
      </FinanceCard>
    </div>
  );

  const renderReportsTab = () => (
    <div className="finance-card-stack">
      <div className="finance-report-card-grid">
        <article className="finance-report-stat">
          <span>Total Expected</span>
          <strong>{formatCurrency(summary?.totalExpected || 0, currency)}</strong>
        </article>
        <article className="finance-report-stat">
          <span>Total Collected</span>
          <strong>{formatCurrency(summary?.totalCollected || 0, currency)}</strong>
        </article>
        <article className="finance-report-stat">
          <span>Total Outstanding</span>
          <strong>{formatCurrency(summary?.totalOutstanding || 0, currency)}</strong>
        </article>
      </div>

      <FinanceCard title="By Class" description="Class-level expected, collected, and outstanding balances.">
        {classReportRows.length ? (
          <TableShell minWidth={760}>
            <thead>
              <tr>{["Class", "Expected", "Collected", "Outstanding", "Invoices"].map((h) => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {classReportRows.map((row) => (
                <tr key={row.className}>
                  <td>{row.className}</td>
                  <td>{formatCurrency(row.totalExpected, currency)}</td>
                  <td>{formatCurrency(row.totalCollected, currency)}</td>
                  <td>{formatCurrency(row.totalOutstanding, currency)}</td>
                  <td>{row.invoiceCount}</td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        ) : (
          <EmptyState title="No class report yet" text="Class reports will appear after invoices are generated." />
        )}
      </FinanceCard>

      <FinanceCard title="By Fee Type" description="Track the performance of each fee category across invoices.">
        {feeTypeReportRows.length ? (
          <TableShell minWidth={760}>
            <thead>
              <tr>{["Fee", "Code", "Expected", "Collected", "Outstanding"].map((h) => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {feeTypeReportRows.map((row) => (
                <tr key={row.feeCode}>
                  <td>{row.feeName}</td>
                  <td>{row.feeCode}</td>
                  <td>{formatCurrency(row.totalExpected, currency)}</td>
                  <td>{formatCurrency(row.totalCollected, currency)}</td>
                  <td>{formatCurrency(row.totalOutstanding, currency)}</td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        ) : (
          <EmptyState title="No fee type report yet" text="Fee type reports will appear once invoice items are available." />
        )}
      </FinanceCard>
    </div>
  );

  const renderSettingsTab = () => (
    <FinanceCard title="Finance Settings" description="Choose the school-wide active session, term, enabled providers, and default payment provider.">
      <div className="finance-form-grid">
        <FormField label="School active session">
          <select value={settingsForm.sessionId} onChange={(e) => setSettingsForm((prev) => ({ ...prev, sessionId: e.target.value, termId: "" }))}>
            <option value="">Select Session</option>
            {sessions.map((row) => <option key={row.id} value={row.id}>{row.sessionName}</option>)}
          </select>
        </FormField>
        <FormField label="School active term">
          <select value={settingsForm.termId} onChange={(e) => setSettingsForm((prev) => ({ ...prev, termId: e.target.value }))}>
            <option value="">Select Term</option>
            {termOptions.map((row) => <option key={row.id} value={row.id}>{row.termName}</option>)}
          </select>
        </FormField>
        <FormField label="Enabled providers">
          <select
            multiple
            value={settingsForm.enabledProviders}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions).map((opt) => opt.value);
              setSettingsForm((prev) => ({ ...prev, enabledProviders: selected }));
            }}
            className="finance-multi-select"
          >
            {providerOptions.map((row) => <option key={row} value={row}>{toPrettyProvider(row)}</option>)}
          </select>
        </FormField>
        <FormField label="Default provider">
          <select value={settingsForm.defaultProvider} onChange={(e) => setSettingsForm((prev) => ({ ...prev, defaultProvider: e.target.value }))}>
            <option value="">Default Provider</option>
            {providerOptions.map((row) => <option key={row} value={row}>{toPrettyProvider(row)}</option>)}
          </select>
        </FormField>
      </div>
      <div className="finance-form-actions">
        <button type="button" onClick={saveSettings} disabled={busy === "settings"}>{busy === "settings" ? "Saving..." : "Save Settings"}</button>
      </div>

      <h3 className="finance-subheading">Academic Session Corrections</h3>
      <p className="finance-settings-note">
        Use these only for data-entry corrections, such as moving Third Term records from 2026/2027 back to 2025/2026. Existing invoice amounts are preserved.
      </p>
      <div className="finance-form-grid">
        <FormField label="Session to correct">
          <select value={sessionEditForm.sessionId} onChange={(e) => chooseSessionForEdit(e.target.value)}>
            <option value="">Select Session</option>
            {sessions.map((row) => <option key={row.id} value={row.id}>{row.sessionName}</option>)}
          </select>
        </FormField>
        <FormField label="Correct session name">
          <input value={sessionEditForm.sessionName} onChange={(e) => setSessionEditForm((prev) => ({ ...prev, sessionName: e.target.value }))} placeholder="2025/2026" />
        </FormField>
        <FormField label="Start date">
          <input type="date" value={sessionEditForm.startDate} onChange={(e) => setSessionEditForm((prev) => ({ ...prev, startDate: e.target.value }))} />
        </FormField>
        <FormField label="End date">
          <input type="date" value={sessionEditForm.endDate} onChange={(e) => setSessionEditForm((prev) => ({ ...prev, endDate: e.target.value }))} />
        </FormField>
        <FormField label="Correction note" span>
          <input value={sessionEditForm.reason} onChange={(e) => setSessionEditForm((prev) => ({ ...prev, reason: e.target.value }))} placeholder="Reason for audit log" />
        </FormField>
      </div>
      <div className="finance-form-actions">
        <button type="button" onClick={saveSessionCorrection} disabled={busy === "session-correction"}>
          {busy === "session-correction" ? "Correcting..." : "Correct Session Name"}
        </button>
      </div>

      <div className="finance-form-grid">
        <FormField label="Term to correct">
          <select value={termEditForm.termId} onChange={(e) => chooseTermForEdit(e.target.value)}>
            <option value="">Select Term</option>
            {terms.map((row) => {
              const session = sessions.find((item) => String(item.id) === String(row.sessionId));
              return <option key={row.id} value={row.id}>{session?.sessionName || "Session"} / {row.termName}</option>;
            })}
          </select>
        </FormField>
        <FormField label="Correct session">
          <select value={termEditForm.targetSessionId} onChange={(e) => setTermEditForm((prev) => ({ ...prev, targetSessionId: e.target.value }))}>
            <option value="">Select Correct Session</option>
            {sessions.map((row) => <option key={row.id} value={row.id}>{row.sessionName}</option>)}
          </select>
        </FormField>
        <FormField label="Term name">
          <input value={termEditForm.termName} onChange={(e) => setTermEditForm((prev) => ({ ...prev, termName: e.target.value }))} placeholder="Third Term" />
        </FormField>
        <FormField label="Correction note">
          <input value={termEditForm.reason} onChange={(e) => setTermEditForm((prev) => ({ ...prev, reason: e.target.value }))} placeholder="Reason for audit log" />
        </FormField>
      </div>
      <div className="finance-form-actions">
        <button type="button" onClick={saveTermCorrection} disabled={busy === "term-correction"}>
          {busy === "term-correction" ? "Moving Records..." : "Move/Merge Term Records"}
        </button>
      </div>

      <h3 className="finance-subheading">Student Record Protection</h3>
      <p className="finance-settings-note">
        Mark pupils who have left, transferred, or graduated so future billing sync ignores them. Their old invoices, payments, receipts, and statements remain available.
      </p>
      <div className="finance-form-grid">
        <FormField label="Student">
          <select value={studentFinanceStatusForm.studentId} onChange={(e) => setStudentFinanceStatusForm((prev) => ({ ...prev, studentId: e.target.value }))}>
            <option value="">Select Student</option>
            {students.map((row) => <option key={row.id} value={row.id}>{row.name} - {row.className || "No class"}</option>)}
          </select>
        </FormField>
        <FormField label="Finance status">
          <select value={studentFinanceStatusForm.financeStatus} onChange={(e) => setStudentFinanceStatusForm((prev) => ({ ...prev, financeStatus: e.target.value }))}>
            {["graduated", "left", "withdrawn", "transferred", "inactive", "active"].map((row) => <option key={row} value={row}>{row}</option>)}
          </select>
        </FormField>
        <FormField label="Reason" span>
          <input value={studentFinanceStatusForm.reason} onChange={(e) => setStudentFinanceStatusForm((prev) => ({ ...prev, reason: e.target.value }))} placeholder="Reason for audit log" />
        </FormField>
      </div>
      <div className="finance-form-actions">
        <button type="button" onClick={saveStudentFinanceStatus} disabled={busy === "student-finance-status"}>
          {busy === "student-finance-status" ? "Saving..." : "Update Student Finance Status"}
        </button>
      </div>

      <h3 className="finance-subheading">Provider Availability</h3>
      {providerStatus.length ? (
        <TableShell minWidth={760}>
          <thead>
            <tr>{["Provider", "Status", "Info"].map((h) => <th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {providerStatus.map((row) => (
              <tr key={row.provider}>
                <td><ProviderBadge value={row.provider} /></td>
                <td><StatusBadge value={providerState(row)} /></td>
                <td>{row.message || "-"}</td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      ) : (
        <EmptyState title="Provider status unavailable" text="Provider availability will appear when finance setup loads." />
      )}
    </FinanceCard>
  );

  const renderActiveTab = () => {
    if (activeTab === "feeSetup") return renderFeeSetupTab();
    if (activeTab === "invoices") return renderInvoicesTab();
    if (activeTab === "payments") return renderPaymentsTab();
    if (activeTab === "receipts") return renderReceiptsTab();
    if (activeTab === "discounts") return renderDiscountsTab();
    if (activeTab === "reports") return renderReportsTab();
    if (activeTab === "settings") return renderSettingsTab();
    return renderDashboardTab();
  };

  return (
    <div className="finance-page admin-finance-module">
      <div className="finance-shell">
        <section className="finance-hero admin-finance-hero">
          <div>
            <div className="finance-kicker">Angel Montessori School</div>
            <h1>School Fees & Payments</h1>
            <p>Manage school fees, invoices, payments, receipts, discounts, and finance reports.</p>
          </div>
          <button type="button" className="finance-refresh-btn" onClick={() => loadDashboard(paymentFilters, invoiceFilters)} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh Finance Data"}
          </button>
        </section>

        {error ? <div className="finance-alert error">{error}</div> : null}
        {message ? <div className="finance-alert success">{message}</div> : null}
        {loading ? <div className="finance-alert">Loading finance records...</div> : null}

        <FinanceOverviewCards summary={summary} currency={currency} />
        <FinanceTabs activeTab={activeTab} onChange={setActiveTab} />

        <main className="finance-tab-panel">
          {renderActiveTab()}
        </main>
      </div>
    </div>
  );
}
