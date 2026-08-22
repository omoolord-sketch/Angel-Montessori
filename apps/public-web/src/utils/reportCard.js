function normalizeTerm(term) {
  return String(term || "").trim().toLowerCase();
}

export function getTermIndex(term) {
  const value = normalizeTerm(term);
  if (value.includes("first")) return 1;
  if (value.includes("second")) return 2;
  if (value.includes("third")) return 3;
  return 99;
}

function sessionSortValue(session) {
  const text = String(session || "").trim();
  const match = text.match(/(\d{4})/);
  return match ? Number(match[1]) : -1;
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function gradeFromScore(score) {
  const s = Number(score || 0);
  if (s >= 70) return "A";
  if (s >= 60) return "B";
  if (s >= 50) return "C";
  if (s >= 40) return "D";
  return "F";
}

export function remarkFromScore(score) {
  const s = Number(score || 0);
  if (s >= 70) return "Excellent";
  if (s >= 60) return "Very Good";
  if (s >= 50) return "Good";
  if (s >= 40) return "Pass";
  return "Needs Improvement";
}

export function splitStudentName(student = {}) {
  const explicitFirst = String(student.firstName || "").trim();
  const explicitLast = String(student.lastName || "").trim();
  if (explicitFirst || explicitLast) {
    return {
      firstName: explicitFirst,
      lastName: explicitLast,
      fullName: [explicitFirst, explicitLast].filter(Boolean).join(" ").trim() || String(student.name || "").trim(),
    };
  }

  const full = String(student.name || "").trim();
  if (!full) return { firstName: "", lastName: "", fullName: "" };
  const parts = full.split(/\s+/).filter(Boolean);
  const firstName = parts[0] || "";
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : "";
  return { firstName, lastName, fullName: full };
}

function normalizeDecisionStatus(status) {
  return String(status || "").toLowerCase().replace(/[^a-z]/g, "");
}

function promotionDecisionLabel(status) {
  const key = normalizeDecisionStatus(status);
  if (key === "promoted") return "Promoted";
  if (key === "promotedconditionally") return "Promoted Conditionally";
  if (key === "probation") return "Probation";
  if (key === "repeated") return "Repeat";
  if (key === "graduated") return "Graduated";
  if (key === "pendingreview") return "Pending Review";
  if (key === "noteligible") return "Not Eligible";
  if (key === "withdrawn") return "Withdrawn";
  return "Pending Review";
}

function resolvePromotionDecision(promotionDecisions = [], session = "") {
  const rows = Array.isArray(promotionDecisions) ? promotionDecisions : [];
  if (!rows.length) return null;

  const sessionText = String(session || "").trim();
  const bySession = sessionText
    ? rows.filter((row) => String(row.sessionName || row.session || "").trim() === sessionText)
    : rows;

  const candidates = bySession.length ? bySession : rows;
  return [...candidates].sort((a, b) => {
    const bStamp = String(b.decidedAt || b.updatedAt || b.createdAt || "");
    const aStamp = String(a.decidedAt || a.updatedAt || a.createdAt || "");
    return bStamp.localeCompare(aStamp);
  })[0] || null;
}

function promotionFromDecision(row) {
  return {
    decision: promotionDecisionLabel(row?.decisionStatus || row?.promotionStatus),
    grade: gradeFromScore(Number(row?.annualAverage || 0)),
    basis: "Promotion engine policy decision",
    reason: String(row?.overrideReason || row?.decisionReason || "Policy evaluation").trim(),
    nextClassName: String(row?.nextClassName || "").trim(),
    source: "engine",
  };
}

function decidePromotionFromAverage(average) {
  const avg = Number(average || 0);
  const grade = gradeFromScore(avg);
  const promoted = grade === "A" || grade === "B" || grade === "C";
  return {
    grade,
    promoted,
    decision: promoted ? "Promoted" : "Not Promoted",
    basis: "3rd term cumulative grading average",
    reason: "3rd term cumulative grading average",
    nextClassName: "",
    source: "fallback",
  };
}

export function getTermOptions(results = [], summaries = [], reports = []) {
  const map = new Map();
  const add = (session, term) => {
    const s = String(session || "").trim();
    const t = String(term || "").trim();
    if (!s || !t) return;
    map.set(`${s}__${t}`, { session: s, term: t });
  };

  for (const row of results) add(row.session, row.term);
  for (const row of summaries) add(row.session, row.term);
  for (const row of reports) add(row.session, row.term);

  return Array.from(map.values()).sort((a, b) => {
    const sessionDiff = sessionSortValue(b.session) - sessionSortValue(a.session);
    if (sessionDiff !== 0) return sessionDiff;
    return getTermIndex(b.term) - getTermIndex(a.term);
  });
}

export function pickLatestTerm(results = [], summaries = [], reports = []) {
  const options = getTermOptions(results, summaries, reports);
  return options[0] || { session: "", term: "" };
}

function computeTermStats(rows = []) {
  const total = rows.reduce((sum, row) => sum + Number(row.score || 0), 0);
  const count = rows.length;
  const average = count ? Number((total / count).toFixed(2)) : 0;
  return { total, count, average };
}

function getRowsForTerm(results = [], session, term) {
  return results
    .filter((row) => String(row.session) === String(session) && String(row.term) === String(term))
    .sort((a, b) => String(a.subject || "").localeCompare(String(b.subject || "")));
}

function getCumulativeRows(results = [], session, uptoTerm) {
  const upto = getTermIndex(uptoTerm);
  return results.filter((row) => String(row.session) === String(session) && getTermIndex(row.term) <= upto);
}

export function buildReportCardHtml({ student, results, summaries, reports, promotionDecisions = [], selectedTerm, schoolName, schoolAddress, logoUrl }) {
  const latest = pickLatestTerm(results, summaries, reports);
  const activeTerm = selectedTerm?.session && selectedTerm?.term
    ? { session: selectedTerm.session, term: selectedTerm.term }
    : latest;

  const termResults = getRowsForTerm(results, activeTerm.session, activeTerm.term);
  const termStats = computeTermStats(termResults);
  const studentPhotoUrl = String(student?.photoUrl || "").trim();
  const nameParts = splitStudentName(student || {});

  const reportMeta =
    reports.find((r) => String(r.session) === String(activeTerm.session) && String(r.term) === String(activeTerm.term)) ||
    reports[0] ||
    {};

  const termIndex = getTermIndex(activeTerm.term);
  const showCumulative = termIndex === 2 || termIndex === 3;
  const cumulativeRows = showCumulative ? getCumulativeRows(results, activeTerm.session, activeTerm.term) : [];
  const cumulativeStats = computeTermStats(cumulativeRows);
  const showPromotion = termIndex === 3;
  const selectedPromotionDecision = resolvePromotionDecision(promotionDecisions, activeTerm.session);
  const promotion = showPromotion
    ? (selectedPromotionDecision ? promotionFromDecision(selectedPromotionDecision) : decidePromotionFromAverage(cumulativeStats.average))
    : null;

  const rowsHtml = termResults
    .map((row, idx) => {
      const score = Number(row.score || 0);
      return `
      <tr>
        <td>${idx + 1}</td>
        <td>${escapeHtml(row.subject)}</td>
        <td>${score}</td>
        <td>${gradeFromScore(score)}</td>
        <td>${remarkFromScore(score)}</td>
      </tr>`;
    })
    .join("");

  const cumulativeRowLabel = termIndex === 2
    ? "Cumulated (First + Second Term)"
    : "Cumulated (First + Second + Third Term)";

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Report Card - ${escapeHtml(nameParts.fullName || student?.name || "")}</title>
  <style>
    :root {
      --green: #0b7a39;
      --green-dark: #065f34;
      --dark: #0f172a;
      --line: #d6e2cf;
      --muted: #475569;
      --paper: #fffef8;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", Tahoma, Arial, sans-serif;
      background: linear-gradient(160deg, #f9f6ec 0%, #edf8ee 100%);
      color: var(--dark);
      padding: 20px;
    }
    .sheet {
      background: linear-gradient(180deg, var(--paper) 0%, #fffdf3 100%);
      border: 2px solid var(--green);
      border-radius: 12px;
      overflow: hidden;
      max-width: 980px;
      margin: 0 auto;
      box-shadow: 0 10px 28px rgba(15, 23, 42, 0.12);
    }
    .head {
      display: grid;
      grid-template-columns: 94px 1fr 94px;
      gap: 12px;
      align-items: center;
      background: linear-gradient(135deg, #effaf2, #fffdf8);
      border-bottom: 3px solid var(--green);
      padding: 16px 18px;
    }
    .logo-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .logo {
      width: 78px;
      height: 78px;
      border-radius: 50%;
      border: 2px solid #bbf7d0;
      object-fit: cover;
      background: #fff;
    }
    .title h1 {
      margin: 0;
      text-align: center;
      font-size: 28px;
      color: var(--green-dark);
      letter-spacing: 1.2px;
      font-weight: 900;
      text-transform: uppercase;
    }
    .title .subtitle {
      margin: 6px 0 0;
      color: #0f5130;
      text-align: center;
      font-size: 14px;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      font-weight: 700;
    }
    .title .address {
      margin: 4px 0 0;
      color: var(--muted);
      text-align: center;
      font-size: 12px;
      font-weight: 600;
    }
    .passport {
      width: 86px;
      height: 102px;
      border: 2px solid #b4c9ab;
      border-radius: 10px;
      overflow: hidden;
      background: #fff;
      justify-self: end;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #6b7280;
      font-size: 11px;
      text-align: center;
    }
    .passport img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .meta {
      padding: 14px 18px;
      border-bottom: 1px solid var(--line);
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px 18px;
      font-size: 13px;
    }
    .meta span { color: var(--muted); }
    .section {
      padding: 14px 18px;
    }
    h2 {
      margin: 0 0 8px;
      color: #14532d;
      font-size: 16px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    th, td {
      border: 1px solid var(--line);
      padding: 8px;
      text-align: left;
    }
    th {
      background: #f1f5f9;
      color: #0f172a;
    }
    .cum-row td {
      background: #ecfdf3;
      font-weight: 700;
    }
    .summary {
      margin-top: 10px;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }
    .card {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 10px;
      background: #fcfff8;
      font-size: 12px;
    }
    .card strong { color: #0f172a; }
    .comments {
      margin-top: 10px;
      border: 1px solid var(--line);
      border-radius: 8px;
      overflow: hidden;
    }
    .comments div {
      padding: 10px;
      border-bottom: 1px solid var(--line);
      font-size: 12px;
    }
    .comments div:last-child { border-bottom: 0; }
    .sign {
      padding: 16px 18px 20px;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 30px;
    }
    .sign-line {
      margin-top: 24px;
      border-top: 1px solid #334155;
      font-size: 12px;
      padding-top: 6px;
      color: #334155;
    }
    .foot {
      border-top: 2px solid var(--green);
      background: #eff8ea;
      color: #14532d;
      font-size: 11px;
      text-align: center;
      padding: 8px;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .sheet { border-radius: 0; box-shadow: none; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="head">
      <div class="logo-wrap">
        <img src="${escapeHtml(logoUrl)}" alt="School Logo" class="logo" onerror="this.style.display='none'" />
      </div>
      <div class="title">
        <h1>${escapeHtml(schoolName)}</h1>
        <p class="subtitle">Comprehensive Termly Report Card</p>
        <p class="address">${escapeHtml(schoolAddress)}</p>
      </div>
      <div class="passport">
        ${studentPhotoUrl ? `<img src="${escapeHtml(studentPhotoUrl)}" alt="Student Photo" />` : "No Photo"}
      </div>
    </div>

    <div class="meta">
      <div><span>First Name:</span> <strong>${escapeHtml(nameParts.firstName || "-")}</strong></div>
      <div><span>Last Name:</span> <strong>${escapeHtml(nameParts.lastName || "-")}</strong></div>
      <div><span>Student Name:</span> <strong>${escapeHtml(nameParts.fullName || "-")}</strong></div>
      <div><span>Class:</span> <strong>${escapeHtml(student?.className || "-")}</strong></div>
      <div><span>Session:</span> <strong>${escapeHtml(activeTerm.session || "-")}</strong></div>
      <div><span>Term:</span> <strong>${escapeHtml(activeTerm.term || "-")}</strong></div>
    </div>

    <div class="section">
      <h2>Academic Performance</h2>
      <table>
        <thead>
          <tr>
            <th style="width:50px;">S/N</th>
            <th>Subject</th>
            <th style="width:110px;">Score</th>
            <th style="width:90px;">Grade</th>
            <th style="width:180px;">Remark</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="5">No result records found for this term.</td></tr>'}
          ${showCumulative ? `
          <tr class="cum-row">
            <td colspan="2">${escapeHtml(cumulativeRowLabel)}</td>
            <td>${escapeHtml(cumulativeStats.total)}</td>
            <td>${escapeHtml(gradeFromScore(cumulativeStats.average))}</td>
            <td>Cumulated Average: ${escapeHtml(cumulativeStats.average.toFixed(2))}</td>
          </tr>` : ""}
        </tbody>
      </table>

      <div class="summary">
        <div class="card"><strong>Term Total Score:</strong> ${escapeHtml(termStats.total)}</div>
        <div class="card"><strong>Term Average:</strong> ${escapeHtml(termStats.average.toFixed(2))}</div>
        <div class="card"><strong>Subjects Offered:</strong> ${escapeHtml(termStats.count)}</div>
      </div>

      ${showCumulative ? `
      <div class="summary">
        <div class="card"><strong>Cumulated Score:</strong> ${escapeHtml(cumulativeStats.total)}</div>
        <div class="card"><strong>Cumulated Average:</strong> ${escapeHtml(cumulativeStats.average.toFixed(2))}</div>
        <div class="card"><strong>Cumulated Entries:</strong> ${escapeHtml(cumulativeStats.count)}</div>
      </div>` : ""}

      ${showPromotion ? `
      <div class="summary">
        <div class="card"><strong>Promotion Status:</strong> ${escapeHtml(promotion.decision)}</div>
        <div class="card"><strong>${promotion.source === "engine" ? "Next Class" : "Promotion Grade Band"}:</strong> ${escapeHtml(promotion.source === "engine" ? (promotion.nextClassName || "-") : promotion.grade)}</div>
        <div class="card"><strong>${promotion.source === "engine" ? "Decision Reason" : "Basis"}:</strong> ${escapeHtml(promotion.source === "engine" ? (promotion.reason || "Policy evaluation") : (promotion.basis || "3rd term cumulative grading average"))}</div>
      </div>` : ""}

      <div class="summary">
        <div class="card"><strong>Attendance Present:</strong> ${escapeHtml(reportMeta.present ?? "-")}</div>
        <div class="card"><strong>Attendance Absent:</strong> ${escapeHtml(reportMeta.absent ?? "-")}</div>
        <div class="card"><strong>Total School Days:</strong> ${escapeHtml(reportMeta.total ?? "-")}</div>
      </div>

      <div class="comments">
        <div><strong>Class Teacher's Comment:</strong> ${escapeHtml(reportMeta.teacherComment || "-")}</div>
        <div><strong>Head Teacher's Comment:</strong> ${escapeHtml(reportMeta.headTeacherComment || "-")}</div>
        <div><strong>Next Term Begins:</strong> ${escapeHtml(reportMeta.nextTermBegins || "-")}</div>
      </div>
    </div>

    <div class="sign">
      <div><div class="sign-line">Class Teacher's Signature</div></div>
      <div><div class="sign-line">Head Teacher/Principal Signature</div></div>
    </div>

    <div class="foot">This report card is computer-generated by ${escapeHtml(schoolName)} Digital School Portal.</div>
  </div>
</body>
</html>`;
}





