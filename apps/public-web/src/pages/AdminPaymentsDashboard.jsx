import { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import {
  bulkUploadAdminFeeStructures,
  bulkUploadAdminStudentFeeAssignments,
  createAdminDiscount,
  createAdminFeeStructure,
  createAdminFeeType,
  createAdminStudentFeeAssignment,
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
  updateAdminFinanceSetup,
} from "../api/services";
import { downloadSchoolFeeTemplate } from "../utils/schoolFeeTemplate";

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

const cardStyle = {
  border: "1px solid #dbe5f1",
  borderRadius: 10,
  padding: 12,
  background: "#fff",
};

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

export default function AdminPaymentsDashboard() {
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

  const [settingsForm, setSettingsForm] = useState({
    sessionId: "",
    termId: "",
    enabledProviders: [],
    defaultProvider: "",
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
    includePreviousBalance: true,
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

  const loadDashboard = async (nextPaymentFilters = paymentFilters, nextInvoiceFilters = invoiceFilters) => {
    try {
      setLoading(true);
      setError("");

      const setupRes = await getAdminFinanceSetup();
      const setupData = setupRes?.data || {};
      setSetup(setupData);

      setSettingsForm((prev) => ({
        sessionId: prev.sessionId || setupData.activeSessionId || "",
        termId: prev.termId || setupData.activeTermId || "",
        enabledProviders:
          Array.isArray(prev.enabledProviders) && prev.enabledProviders.length > 0
            ? prev.enabledProviders
            : (Array.isArray(setupData.providers) ? setupData.providers : []),
        defaultProvider: prev.defaultProvider || setupData.defaultProvider || "",
      }));

      const scopedParams = {
        sessionId: setupData.activeSessionId,
        termId: setupData.activeTermId,
      };

      const sectionJobs = [
        { label: "overview", run: () => getAdminPaymentsSummary(cleanParams(nextPaymentFilters)) },
        { label: "payments", run: () => getAdminPayments(cleanParams(nextPaymentFilters)) },
        { label: "fee types", run: () => getAdminFeeTypes() },
        { label: "fee structures", run: () => getAdminFeeStructures(scopedParams) },
        { label: "fee templates", run: () => getAdminSchoolFeeTemplates(scopedParams) },
        { label: "students", run: () => getAdminFinanceStudents({}) },
        { label: "student assignments", run: () => getAdminStudentFeeAssignments(scopedParams) },
        { label: "invoices", run: () => getAdminInvoices(cleanParams(nextInvoiceFilters)) },
        { label: "discounts", run: () => getAdminDiscounts({}) },
        { label: "receipts", run: () => getAdminReceipts({}) },
        { label: "reports", run: () => getAdminFinanceReports({}) },
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
      await loadDashboard(paymentFilters, invoiceFilters);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to update settings");
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
      await createAdminFeeStructure({
        ...feeStructureForm,
        sessionId: setup?.activeSessionId,
        termId: setup?.activeTermId,
      });
      setMessage("Fee structure saved.");
      await loadDashboard(paymentFilters, invoiceFilters);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to save fee structure");
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
        sessionId: setup?.activeSessionId,
        termId: setup?.activeTermId,
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
        classId: invoiceGenerationForm.classId,
        dueDate: invoiceGenerationForm.dueDate,
        fallbackAmount: Number(invoiceGenerationForm.fallbackAmount || 0),
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

  const downloadExport = async () => {
    try {
      setBusy("export");
      setError("");
      const res = await exportAdminPayments(cleanParams(paymentFilters));
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
      await bulkUploadAdminFeeStructures({ rows });
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
      await bulkUploadAdminStudentFeeAssignments({ rows });
      setStudentAssignmentBulkFile(null);
      setMessage("Student assignments uploaded.");
      await loadDashboard(paymentFilters, invoiceFilters);
    } catch (e) {
      setError(e?.response?.data?.message || "Student assignment upload failed");
    } finally {
      setBusy("");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>School Fees and Payments</h2>
      <p>Manage school fee setup, invoices, payment providers, receipts, discounts, and finance reports for Angel Montessori School.</p>

      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      {message ? <p style={{ color: "#1b7d2c" }}>{message}</p> : null}
      {loading ? <p>Loading finance records...</p> : null}

      <div style={{ ...cardStyle, marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Finance Overview</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <div style={cardStyle}><strong>Total Expected</strong><p>{formatCurrency(summary?.totalExpected || 0, currency)}</p></div>
          <div style={cardStyle}><strong>Total Collected</strong><p>{formatCurrency(summary?.totalCollected || 0, currency)}</p></div>
          <div style={cardStyle}><strong>Outstanding</strong><p>{formatCurrency(summary?.totalOutstanding || 0, currency)}</p></div>
          <div style={cardStyle}><strong>Payments Today</strong><p>{formatCurrency(summary?.paymentsToday || 0, currency)}</p></div>
          <div style={cardStyle}><strong>Overdue Invoices</strong><p>{summary?.overdueInvoices || 0}</p></div>
        </div>
      </div>

      <div style={{ ...cardStyle, marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Settings</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
          <select value={settingsForm.sessionId} onChange={(e) => setSettingsForm((prev) => ({ ...prev, sessionId: e.target.value, termId: "" }))}>
            <option value="">Select Session</option>
            {sessions.map((row) => <option key={row.id} value={row.id}>{row.sessionName}</option>)}
          </select>

          <select value={settingsForm.termId} onChange={(e) => setSettingsForm((prev) => ({ ...prev, termId: e.target.value }))}>
            <option value="">Select Term</option>
            {termOptions.map((row) => <option key={row.id} value={row.id}>{row.termName}</option>)}
          </select>

          <select
            multiple
            value={settingsForm.enabledProviders}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions).map((opt) => opt.value);
              setSettingsForm((prev) => ({ ...prev, enabledProviders: selected }));
            }}
            style={{ minHeight: 110 }}
          >
            {providerOptions.map((row) => <option key={row} value={row}>{toPrettyProvider(row)}</option>)}
          </select>

          <select value={settingsForm.defaultProvider} onChange={(e) => setSettingsForm((prev) => ({ ...prev, defaultProvider: e.target.value }))}>
            <option value="">Default Provider</option>
            {providerOptions.map((row) => <option key={row} value={row}>{toPrettyProvider(row)}</option>)}
          </select>

          <button onClick={saveSettings} disabled={busy === "settings"}>{busy === "settings" ? "Saving..." : "Save Settings"}</button>
        </div>

        <div style={{ marginTop: 8, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
            <thead><tr>{["Provider", "Available", "Info"].map((h) => <th key={h} style={{ border: "1px solid #e5ebf3", padding: 8, textAlign: "left", background: "#f8fafc" }}>{h}</th>)}</tr></thead>
            <tbody>
              {providerStatus.map((row) => (
                <tr key={row.provider}>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{toPrettyProvider(row.provider)}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{row.available ? "Yes" : "No"}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{row.message || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ ...cardStyle, marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Fee Types</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8, marginBottom: 8 }}>
          <input placeholder="Fee Name" value={feeTypeForm.feeName} onChange={(e) => setFeeTypeForm((prev) => ({ ...prev, feeName: e.target.value }))} />
          <input placeholder="Fee Code" value={feeTypeForm.feeCode} onChange={(e) => setFeeTypeForm((prev) => ({ ...prev, feeCode: e.target.value.toUpperCase() }))} />
          <input placeholder="Category" value={feeTypeForm.category} onChange={(e) => setFeeTypeForm((prev) => ({ ...prev, category: e.target.value }))} />
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" checked={feeTypeForm.isRecurring} onChange={(e) => setFeeTypeForm((prev) => ({ ...prev, isRecurring: e.target.checked }))} />
            Recurring
          </label>
          <button onClick={addFeeType} disabled={busy === "feeType"}>{busy === "feeType" ? "Saving..." : "Add Fee Type"}</button>
        </div>

        <h4 style={{ marginBottom: 6 }}>Fee Structures</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8, marginBottom: 8 }}>
          <select value={feeStructureForm.classId} onChange={(e) => setFeeStructureForm((prev) => ({ ...prev, classId: e.target.value }))}>
            <option value="">Class</option>
            {classes.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select>
          <select value={feeStructureForm.feeTypeId} onChange={(e) => setFeeStructureForm((prev) => ({ ...prev, feeTypeId: e.target.value }))}>
            <option value="">Fee Type</option>
            {feeTypes.map((row) => <option key={row.id} value={row.id}>{row.feeName}</option>)}
          </select>
          <select value={feeStructureForm.structureType} onChange={(e) => setFeeStructureForm((prev) => ({ ...prev, structureType: e.target.value }))}>
            <option value="COMPULSORY">Compulsory</option>
            <option value="OPTIONAL">Optional</option>
          </select>
          <input type="number" placeholder="Amount" value={feeStructureForm.amount} onChange={(e) => setFeeStructureForm((prev) => ({ ...prev, amount: e.target.value }))} />
          <input type="date" value={feeStructureForm.dueDate} onChange={(e) => setFeeStructureForm((prev) => ({ ...prev, dueDate: e.target.value }))} />
          <button onClick={addFeeStructure} disabled={busy === "feeStructure"}>{busy === "feeStructure" ? "Saving..." : "Save Fee Structure"}</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8, marginBottom: 8 }}>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setFeeStructureBulkFile(e.target.files?.[0] || null)} />
          <button onClick={uploadFeeStructures} disabled={busy === "feeStructureBulk"}>{busy === "feeStructureBulk" ? "Uploading..." : "Upload Fee Structure File"}</button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
            <thead><tr>{["Class", "Fee", "Type", "Amount", "Due", "Active"].map((h) => <th key={h} style={{ border: "1px solid #e5ebf3", padding: 8, textAlign: "left", background: "#f8fafc" }}>{h}</th>)}</tr></thead>
            <tbody>
              {feeStructures.map((row) => (
                <tr key={row.id}>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{row.className}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{row.feeName}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{row.structureType}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{formatCurrency(row.amount, currency)}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{formatDate(row.dueDate)}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{row.isActive ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ ...cardStyle, marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>School Fee Templates</h3>
        <p style={{ marginTop: 0, color: "#4a5565" }}>
          These templates are built directly from the saved fee structures for the active session and term. Once a class fee
          structure exists, the matching school fee template is ready to download.
        </p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 960 }}>
            <thead><tr>{["Class", "Session", "Term", "Compulsory", "Optional", "Due", "Download"].map((h) => <th key={h} style={{ border: "1px solid #e5ebf3", padding: 8, textAlign: "left", background: "#f8fafc" }}>{h}</th>)}</tr></thead>
            <tbody>
              {feeTemplates.length ? feeTemplates.map((row) => (
                <tr key={`${row.classId}-${row.termId}`}>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{row.className}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{row.sessionName}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{row.termName}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{formatCurrency(row.compulsoryTotal, currency)}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{formatCurrency(row.optionalTotal, currency)}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{formatDate(row.dueDate)}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>
                    <button type="button" onClick={() => downloadSchoolFeeTemplate(row)}>Download Template</button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} style={{ border: "1px solid #e5ebf3", padding: 12, color: "#4a5565" }}>
                    Save fee structures for a class to generate its downloadable school fee template.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ ...cardStyle, marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Student Optional Fees</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 8, marginBottom: 8 }}>
          <select value={studentAssignmentForm.classId} onChange={(e) => setStudentAssignmentForm((prev) => ({ ...prev, classId: e.target.value, studentId: "" }))}>
            <option value="">Class</option>
            {classes.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select>
          <select value={studentAssignmentForm.studentId} onChange={(e) => setStudentAssignmentForm((prev) => ({ ...prev, studentId: e.target.value }))}>
            <option value="">Student</option>
            {filteredStudents.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select>
          <select value={studentAssignmentForm.feeTypeId} onChange={(e) => setStudentAssignmentForm((prev) => ({ ...prev, feeTypeId: e.target.value }))}>
            <option value="">Fee Type</option>
            {feeTypes.map((row) => <option key={row.id} value={row.id}>{row.feeName}</option>)}
          </select>
          <input type="number" placeholder="Amount" value={studentAssignmentForm.amount} onChange={(e) => setStudentAssignmentForm((prev) => ({ ...prev, amount: e.target.value }))} />
          <input type="date" value={studentAssignmentForm.dueDate} onChange={(e) => setStudentAssignmentForm((prev) => ({ ...prev, dueDate: e.target.value }))} />
          <input placeholder="Notes" value={studentAssignmentForm.notes} onChange={(e) => setStudentAssignmentForm((prev) => ({ ...prev, notes: e.target.value }))} />
          <button onClick={addStudentAssignment} disabled={busy === "assignment"}>{busy === "assignment" ? "Saving..." : "Assign Fee"}</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8, marginBottom: 8 }}>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setStudentAssignmentBulkFile(e.target.files?.[0] || null)} />
          <button onClick={uploadStudentAssignments} disabled={busy === "assignmentBulk"}>{busy === "assignmentBulk" ? "Uploading..." : "Upload Student Assignment File"}</button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 920 }}>
            <thead><tr>{["Student", "Class", "Fee", "Amount", "Due", "Notes"].map((h) => <th key={h} style={{ border: "1px solid #e5ebf3", padding: 8, textAlign: "left", background: "#f8fafc" }}>{h}</th>)}</tr></thead>
            <tbody>
              {studentAssignments.map((row) => (
                <tr key={row.id}>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{row.studentName}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{row.className}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{row.feeName}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{formatCurrency(row.amount, currency)}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{formatDate(row.dueDate)}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{row.notes || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ ...cardStyle, marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Invoice Management</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8, marginBottom: 8 }}>
          <select value={invoiceGenerationForm.classId} onChange={(e) => setInvoiceGenerationForm((prev) => ({ ...prev, classId: e.target.value }))}>
            <option value="">All Classes</option>
            {classes.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select>
          <input type="date" value={invoiceGenerationForm.dueDate} onChange={(e) => setInvoiceGenerationForm((prev) => ({ ...prev, dueDate: e.target.value }))} />
          <input type="number" placeholder="Fallback Amount" value={invoiceGenerationForm.fallbackAmount} onChange={(e) => setInvoiceGenerationForm((prev) => ({ ...prev, fallbackAmount: e.target.value }))} />
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" checked={invoiceGenerationForm.includePreviousBalance} onChange={(e) => setInvoiceGenerationForm((prev) => ({ ...prev, includePreviousBalance: e.target.checked }))} />
            Include Previous Balance
          </label>
          <button onClick={runInvoiceGeneration} disabled={busy === "generate"}>{busy === "generate" ? "Generating..." : "Generate / Sync"}</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8, marginBottom: 8 }}>
          <select value={invoiceFilters.status} onChange={(e) => setInvoiceFilters((prev) => ({ ...prev, status: e.target.value }))}>
            <option value="ALL">All Status</option>
            <option value="UNPAID">UNPAID</option>
            <option value="PARTIAL">PARTIAL</option>
            <option value="PAID">PAID</option>
            <option value="OVERDUE">OVERDUE</option>
          </select>
          <select value={invoiceFilters.classId} onChange={(e) => setInvoiceFilters((prev) => ({ ...prev, classId: e.target.value }))}>
            <option value="">All Classes</option>
            {classes.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select>
          <input placeholder="Search" value={invoiceFilters.search} onChange={(e) => setInvoiceFilters((prev) => ({ ...prev, search: e.target.value }))} />
          <button onClick={applyInvoiceFilters}>Apply Invoice Filters</button>
          <button onClick={resetInvoiceFilters}>Reset Invoice Filters</button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 960 }}>
            <thead><tr>{["Invoice", "Student", "Class", "Status", "Total", "Paid", "Balance", "Term", "Due"].map((h) => <th key={h} style={{ border: "1px solid #e5ebf3", padding: 8, textAlign: "left", background: "#f8fafc" }}>{h}</th>)}</tr></thead>
            <tbody>
              {invoices.map((row) => (
                <tr key={row.id}>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{row.invoiceNumber}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{row.studentName}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{row.className}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{row.status}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{formatCurrency(row.totalAmount, currency)}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{formatCurrency(row.amountPaid, currency)}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{formatCurrency(row.balance, currency)}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{[row.sessionName, row.termName].filter(Boolean).join(" / ") || "-"}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{formatDate(row.dueDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ ...cardStyle, marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Discounts</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8, marginBottom: 8 }}>
          <select value={discountForm.invoiceId} onChange={(e) => setDiscountForm((prev) => ({ ...prev, invoiceId: e.target.value }))}>
            <option value="">Invoice (Optional)</option>
            {discountableInvoices.map((row) => <option key={row.id} value={row.id}>{row.invoiceNumber} - {row.studentName}</option>)}
          </select>
          <select value={discountForm.studentId} onChange={(e) => setDiscountForm((prev) => ({ ...prev, studentId: e.target.value }))}>
            <option value="">Student (Optional)</option>
            {students.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select>
          <select value={discountForm.discountType} onChange={(e) => setDiscountForm((prev) => ({ ...prev, discountType: e.target.value }))}>
            {discountTypes.map((row) => <option key={row} value={row}>{row}</option>)}
          </select>
          <input type="number" placeholder="Amount" value={discountForm.amount} onChange={(e) => setDiscountForm((prev) => ({ ...prev, amount: e.target.value }))} />
          <input placeholder="Reason" value={discountForm.reason} onChange={(e) => setDiscountForm((prev) => ({ ...prev, reason: e.target.value }))} />
          <button onClick={addDiscount} disabled={busy === "discount"}>{busy === "discount" ? "Applying..." : "Apply Discount"}</button>
        </div>
      </div>

      <div style={{ ...cardStyle, marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Payment Management</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8, marginBottom: 8 }}>
          <select value={paymentFilters.status} onChange={(e) => setPaymentFilters((prev) => ({ ...prev, status: e.target.value }))}>
            <option value="ALL">All Status</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="PENDING">PENDING</option>
            <option value="FAILED">FAILED</option>
          </select>
          <select value={paymentFilters.type} onChange={(e) => setPaymentFilters((prev) => ({ ...prev, type: e.target.value }))}>
            <option value="ALL">All Types</option>
            <option value="STUDENT_FEE">STUDENT_FEE</option>
            <option value="APPLICATION_FEE">APPLICATION_FEE</option>
          </select>
          <input placeholder="Search" value={paymentFilters.search} onChange={(e) => setPaymentFilters((prev) => ({ ...prev, search: e.target.value }))} />
          <input type="date" value={paymentFilters.from} onChange={(e) => setPaymentFilters((prev) => ({ ...prev, from: e.target.value }))} />
          <input type="date" value={paymentFilters.to} onChange={(e) => setPaymentFilters((prev) => ({ ...prev, to: e.target.value }))} />
          <button onClick={applyPaymentFilters}>Apply Filters</button>
          <button onClick={resetPaymentFilters}>Reset Filters</button>
          <button onClick={downloadExport} disabled={busy === "export"}>{busy === "export" ? "Exporting..." : "Export CSV"}</button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1200 }}>
            <thead><tr>{["Reference", "Provider", "Status", "Amount", "Student", "Class", "Invoice", "Type", "Role", "Created", "Paid"].map((h) => <th key={h} style={{ border: "1px solid #e5ebf3", padding: 8, textAlign: "left", background: "#f8fafc" }}>{h}</th>)}</tr></thead>
            <tbody>
              {payments.map((row) => (
                <tr key={row.id}>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{row.reference}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{toPrettyProvider(row.provider || row.gatewayName)}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{row.status}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{formatCurrency(row.amount, row.currency || currency)}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{row.studentName || "-"}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{row.className || "-"}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{row.invoiceLabel || "-"}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{row.type}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{row.role}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{formatDateTime(row.createdAt)}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{formatDateTime(row.paidAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ ...cardStyle, marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Receipts</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
            <thead><tr>{["Receipt", "Payment Ref", "Student", "Class", "Invoice", "Amount", "Issued", "Actions"].map((h) => <th key={h} style={{ border: "1px solid #e5ebf3", padding: 8, textAlign: "left", background: "#f8fafc" }}>{h}</th>)}</tr></thead>
            <tbody>
              {receipts.map((row) => (
                <tr key={row.id}>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{row.receiptNumber}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{row.paymentReference}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{row.studentName || "-"}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{row.className || "-"}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{row.invoiceNumber || "-"}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{formatCurrency(row.paymentAmount, currency)}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{formatDateTime(row.issuedAt)}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>
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
          </table>
        </div>
      </div>

      <div style={{ ...cardStyle, marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Reports</h3>

        <h4>By Class</h4>
        <div style={{ overflowX: "auto", marginBottom: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
            <thead><tr>{["Class", "Expected", "Collected", "Outstanding", "Invoices"].map((h) => <th key={h} style={{ border: "1px solid #e5ebf3", padding: 8, textAlign: "left", background: "#f8fafc" }}>{h}</th>)}</tr></thead>
            <tbody>
              {(reports?.byClass || []).map((row) => (
                <tr key={row.className}>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{row.className}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{formatCurrency(row.totalExpected, currency)}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{formatCurrency(row.totalCollected, currency)}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{formatCurrency(row.totalOutstanding, currency)}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{row.invoiceCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h4>By Fee Type</h4>
        <div style={{ overflowX: "auto", marginBottom: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
            <thead><tr>{["Fee", "Code", "Expected", "Collected", "Outstanding"].map((h) => <th key={h} style={{ border: "1px solid #e5ebf3", padding: 8, textAlign: "left", background: "#f8fafc" }}>{h}</th>)}</tr></thead>
            <tbody>
              {(reports?.byFeeType || []).map((row) => (
                <tr key={row.feeCode}>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{row.feeName}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{row.feeCode}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{formatCurrency(row.totalExpected, currency)}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{formatCurrency(row.totalCollected, currency)}</td>
                  <td style={{ border: "1px solid #e5ebf3", padding: 8 }}>{formatCurrency(row.totalOutstanding, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}






