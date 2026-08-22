import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatNumber(amount) {
  return new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}

function formatExportCurrency(amount, currency = "NGN") {
  const safeCurrency = String(currency || "NGN").toUpperCase();

  // PDF generators/viewers can corrupt non-ASCII symbols such as the naira sign.
  // Keep exported fee templates readable everywhere by using an ASCII currency label.
  if (safeCurrency === "NGN") {
    return `NGN ${formatNumber(amount)}`;
  }

  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: safeCurrency,
      currencyDisplay: "code",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(amount || 0));
  } catch {
    return `${safeCurrency} ${formatNumber(amount)}`;
  }
}

function fileKey(value, fallback = "school-fees") {
  const safe = String(value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return safe || fallback;
}

function getTemplateItems(template) {
  return Array.isArray(template?.items) ? template.items : [];
}

function getTemplateFileBase(template) {
  return [
    fileKey(template?.className, "class"),
    fileKey(template?.sessionName, "session"),
    fileKey(template?.termName, "term"),
    "school-fees",
  ].join("-");
}

function buildTemplateRows(template) {
  return getTemplateItems(template).map((item, index) => ({
    SNo: index + 1,
    Fee: item.feeName || item.description || "Fee",
    Category: item.feeCategoryLabel || item.feeCategory || "General",
    Type: String(item.structureType || "COMPULSORY").toUpperCase(),
    DueDate: item.dueDate || template?.dueDate || "",
    Amount: Number(item.amount || 0),
  }));
}

export function buildSchoolFeeTemplateHtml(template) {
  const items = Array.isArray(template?.items) ? template.items : [];
  const compulsoryItems = items.filter((item) => String(item.structureType || "").toUpperCase() === "COMPULSORY");
  const optionalItems = items.filter((item) => String(item.structureType || "").toUpperCase() === "OPTIONAL");
  const currency = String(template?.currency || "NGN").toUpperCase();

  const renderRows = (rows) =>
    rows
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.feeName || item.description || "Fee")}</td>
            <td>${escapeHtml(item.feeCategoryLabel || item.feeCategory || "General")}</td>
            <td>${item.dueDate ? escapeHtml(item.dueDate) : "-"}</td>
            <td class="amount">${escapeHtml(formatExportCurrency(item.amount, currency))}</td>
          </tr>
        `
      )
      .join("");

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(template?.className || "Class")} School Fees - ${escapeHtml(template?.termName || "Term")}</title>
        <style>
          body { font-family: Arial, Helvetica, sans-serif; margin: 0; background: #f6f7fb; color: #1e2430; }
          .sheet { max-width: 900px; margin: 28px auto; background: #ffffff; border: 1px solid #d7deea; border-radius: 18px; padding: 32px; }
          .kicker { color: #c79a2b; font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; }
          h1 { margin: 10px 0 6px; color: #163a70; font-size: 32px; }
          h2 { margin: 28px 0 12px; color: #163a70; font-size: 19px; }
          p, li { line-height: 1.7; }
          .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin: 20px 0 14px; }
          .summary-card { border: 1px solid #e2e7f1; border-radius: 14px; padding: 14px; background: #fbfcff; }
          .summary-card strong { display: block; margin-bottom: 6px; color: #163a70; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #e2e7f1; padding: 10px 12px; text-align: left; }
          th { background: #f8fafc; color: #163a70; }
          td.amount { font-weight: 700; }
          .totals { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-top: 16px; }
          .total-card { border-radius: 14px; padding: 14px; background: #fff8e7; border: 1px solid #ead7a1; }
          .total-card strong { display: block; margin-bottom: 6px; color: #163a70; }
          .muted { color: #5d6a7c; }
          .footer { margin-top: 28px; padding-top: 18px; border-top: 1px solid #d7deea; color: #4a5565; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="kicker">${escapeHtml(template?.schoolName || "Angel Montessori School")}</div>
          <h1>${escapeHtml(template?.className || "Class")} School Fees Template</h1>
          <p><strong>Session:</strong> ${escapeHtml(template?.sessionName || "Current Session")}</p>
          <p><strong>Term:</strong> ${escapeHtml(template?.termName || "Current Term")}</p>
          <p><strong>Motto:</strong> ${escapeHtml(template?.motto || "In God We Trust")}</p>

          <div class="summary">
            <div class="summary-card">
              <strong>Class</strong>
              <span>${escapeHtml(template?.className || "-")}</span>
            </div>
            <div class="summary-card">
              <strong>Section</strong>
              <span>${escapeHtml(template?.section || "-")}</span>
            </div>
            <div class="summary-card">
              <strong>Primary Due Date</strong>
              <span>${escapeHtml(template?.dueDate || "To be confirmed")}</span>
            </div>
          </div>

          <p class="muted">This template is generated directly from the approved fee structures saved by the school finance desk for the selected class and term.</p>

          <h2>Compulsory Fee Items</h2>
          ${compulsoryItems.length ? `<table><thead><tr><th>Fee Item</th><th>Category</th><th>Due Date</th><th>Amount</th></tr></thead><tbody>${renderRows(compulsoryItems)}</tbody></table>` : "<p>No compulsory fee items are available for this class and term yet.</p>"}

          <h2>Optional Fee Items</h2>
          ${optionalItems.length ? `<table><thead><tr><th>Fee Item</th><th>Category</th><th>Due Date</th><th>Amount</th></tr></thead><tbody>${renderRows(optionalItems)}</tbody></table>` : "<p>No optional fee items have been added for this class and term.</p>"}

          <div class="totals">
            <div class="total-card">
              <strong>Compulsory Total</strong>
              <span>${escapeHtml(formatExportCurrency(template?.compulsoryTotal || 0, currency))}</span>
            </div>
            <div class="total-card">
              <strong>Optional Total</strong>
              <span>${escapeHtml(formatExportCurrency(template?.optionalTotal || 0, currency))}</span>
            </div>
            <div class="total-card">
              <strong>Combined Total</strong>
              <span>${escapeHtml(formatExportCurrency(template?.totalAmount || 0, currency))}</span>
            </div>
          </div>

          <div class="footer">
            <div><strong>Address:</strong> ${escapeHtml(template?.contact?.address || "152 Okedogbon Road, Owo, Ondo State, Nigeria")}</div>
            <div><strong>Email:</strong> ${escapeHtml(template?.contact?.email || "info@angelmontessori.ng")}</div>
            <div><strong>Phone:</strong> ${escapeHtml(template?.contact?.phone || "+234 803 506 7767")}</div>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function downloadSchoolFeeTemplate(template) {
  return downloadSchoolFeeTemplatePdf(template);
}

export function downloadSchoolFeeTemplateHtml(template) {
  const html = buildSchoolFeeTemplateHtml(template);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${getTemplateFileBase(template)}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadSchoolFeeTemplateExcel(template) {
  const currency = String(template?.currency || "NGN").toUpperCase();
  const rows = buildTemplateRows(template);
  const summaryRows = [
    ["School", template?.schoolName || "Angel Montessori School"],
    ["Class", template?.className || "-"],
    ["Session", template?.sessionName || "-"],
    ["Term", template?.termName || "-"],
    ["Primary Due Date", template?.dueDate || "-"],
    ["Currency", currency],
    ["Compulsory Total", Number(template?.compulsoryTotal || 0)],
    ["Optional Total", Number(template?.optionalTotal || 0)],
    ["Combined Total", Number(template?.totalAmount || 0)],
  ];

  const workbook = XLSX.utils.book_new();
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  const itemsSheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{
    SNo: "",
    Fee: "No fee item available",
    Category: "",
    Type: "",
    DueDate: "",
    Amount: "",
  }]);

  summarySheet["!cols"] = [{ wch: 22 }, { wch: 38 }];
  itemsSheet["!cols"] = [{ wch: 8 }, { wch: 28 }, { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 14 }];

  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
  XLSX.utils.book_append_sheet(workbook, itemsSheet, "Fee Items");
  XLSX.writeFile(workbook, `${getTemplateFileBase(template)}.xlsx`);
}

export function downloadSchoolFeeTemplatePdf(template) {
  const currency = String(template?.currency || "NGN").toUpperCase();
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const rows = buildTemplateRows(template);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(22, 58, 112);
  doc.setFontSize(18);
  doc.text(template?.schoolName || "Angel Montessori School", 40, 48);

  doc.setFontSize(14);
  doc.text(`${template?.className || "Class"} School Fees Template`, 40, 75);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(70, 85, 105);
  doc.setFontSize(10);
  doc.text(`Session: ${template?.sessionName || "-"}`, 40, 100);
  doc.text(`Term: ${template?.termName || "-"}`, 220, 100);
  doc.text(`Due date: ${template?.dueDate || "To be confirmed"}`, 390, 100);

  autoTable(doc, {
    startY: 124,
    head: [["Fee Item", "Category", "Type", "Due Date", `Amount (${currency})`]],
    body: rows.length
      ? rows.map((row) => [row.Fee, row.Category, row.Type, row.DueDate || "-", formatExportCurrency(row.Amount, currency)])
      : [["No fee item available", "-", "-", "-", formatExportCurrency(0, currency)]],
    styles: { fontSize: 9, cellPadding: 7 },
    headStyles: { fillColor: [22, 58, 112], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  const finalY = doc.lastAutoTable?.finalY || 180;
  autoTable(doc, {
    startY: finalY + 18,
    theme: "plain",
    body: [
      ["Compulsory Total", formatExportCurrency(template?.compulsoryTotal || 0, currency)],
      ["Optional Total", formatExportCurrency(template?.optionalTotal || 0, currency)],
      ["Combined Total", formatExportCurrency(template?.totalAmount || 0, currency)],
    ],
    styles: { fontSize: 11, cellPadding: 6 },
    columnStyles: {
      0: { fontStyle: "bold", textColor: [22, 58, 112] },
      1: { fontStyle: "bold", halign: "right" },
    },
  });

  doc.setFontSize(9);
  doc.setTextColor(90, 106, 124);
  doc.text("Generated from the approved Angel Montessori School finance setup.", 40, 790);
  doc.save(`${getTemplateFileBase(template)}.pdf`);
}
