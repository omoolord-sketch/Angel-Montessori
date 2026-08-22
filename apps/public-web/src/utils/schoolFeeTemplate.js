function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatCurrency(amount, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
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
            <td class="amount">${escapeHtml(formatCurrency(item.amount, currency))}</td>
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
              <span>${escapeHtml(formatCurrency(template?.compulsoryTotal || 0, currency))}</span>
            </div>
            <div class="total-card">
              <strong>Optional Total</strong>
              <span>${escapeHtml(formatCurrency(template?.optionalTotal || 0, currency))}</span>
            </div>
            <div class="total-card">
              <strong>Combined Total</strong>
              <span>${escapeHtml(formatCurrency(template?.totalAmount || 0, currency))}</span>
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
  const html = buildSchoolFeeTemplateHtml(template);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const classKey = String(template?.className || "class").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const termKey = String(template?.termName || "term").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  link.href = url;
  link.download = `${classKey}-${termKey}-school-fees.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
