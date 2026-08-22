function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatSchedule(sessionDate, startTime, durationMinutes) {
  const date = String(sessionDate || "").trim();
  const time = String(startTime || "").trim();
  if (!date) return "Schedule to be confirmed";
  const parsed = new Date(`${date}T${time || "00:00"}:00`);
  const pretty = Number.isNaN(parsed.getTime())
    ? [date, time].filter(Boolean).join(" at ")
    : new Intl.DateTimeFormat("en-GB", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(parsed);

  return durationMinutes ? `${pretty} (${durationMinutes} mins)` : pretty;
}

export function buildVirtualClassTimetableHtml(payload) {
  const rows = Array.isArray(payload?.rows) ? payload.rows : [];
  const grouped = new Map();

  rows
    .filter((row) => String(row.status || "").toLowerCase() !== "cancelled")
    .sort((a, b) => String(a.sessionDate || "").localeCompare(String(b.sessionDate || "")) || String(a.startTime || "").localeCompare(String(b.startTime || "")))
    .forEach((row) => {
      const dateKey = String(row.sessionDate || "To Be Scheduled");
      if (!grouped.has(dateKey)) grouped.set(dateKey, []);
      grouped.get(dateKey).push(row);
    });

  const groupsMarkup = Array.from(grouped.entries())
    .map(([date, items]) => {
      const cards = items
        .map(
          (row) => `
            <tr>
              <td>${escapeHtml(row.title || "Virtual Class")}</td>
              <td>${escapeHtml(row.className || row.classSubject?.className || "-")}</td>
              <td>${escapeHtml(row.subjectName || row.classSubject?.subjectName || "-")}</td>
              <td>${escapeHtml(formatSchedule(row.sessionDate, row.startTime, row.durationMinutes))}</td>
              <td>${escapeHtml(String(row.hostTeacherName || "Teacher"))}</td>
              <td>${escapeHtml(String(row.status || "scheduled").replace(/_/g, " "))}</td>
            </tr>
          `
        )
        .join("");

      return `
        <section>
          <h2>${escapeHtml(date)}</h2>
          <table>
            <thead>
              <tr>
                <th>Session</th>
                <th>Class</th>
                <th>Subject</th>
                <th>Schedule</th>
                <th>Teacher</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>${cards}</tbody>
          </table>
        </section>
      `;
    })
    .join("");

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(payload?.title || "Virtual Class Timetable")}</title>
        <style>
          body { font-family: Arial, Helvetica, sans-serif; margin: 0; background: #f4f7fb; color: #1d2735; }
          .sheet { max-width: 980px; margin: 28px auto; background: #fff; border: 1px solid #d8e2ee; border-radius: 18px; padding: 32px; }
          .kicker { color: #c79a2b; font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; }
          h1 { margin: 10px 0 6px; color: #163a70; font-size: 32px; }
          h2 { margin: 28px 0 12px; color: #163a70; font-size: 20px; }
          p { line-height: 1.7; }
          .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin: 18px 0 22px; }
          .summary-card { border: 1px solid #dfe7f0; border-radius: 14px; padding: 14px; background: #f9fbff; }
          .summary-card strong { display: block; margin-bottom: 6px; color: #163a70; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #dfe7f0; padding: 10px 12px; text-align: left; }
          th { background: #f8fafc; color: #163a70; }
          .footer { margin-top: 28px; padding-top: 18px; border-top: 1px solid #d7deea; color: #4a5565; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="kicker">${escapeHtml(payload?.schoolName || "Angel Montessori School")}</div>
          <h1>${escapeHtml(payload?.title || "Virtual Class Timetable")}</h1>
          <p>${escapeHtml(payload?.description || "Download and share the current live-learning timetable for Angel Montessori pupils and teachers.")}</p>

          <div class="summary">
            <div class="summary-card">
              <strong>View</strong>
              <span>${escapeHtml(payload?.roleLabel || "School View")}</span>
            </div>
            <div class="summary-card">
              <strong>Class</strong>
              <span>${escapeHtml(payload?.classLabel || "All Visible Classes")}</span>
            </div>
            <div class="summary-card">
              <strong>Term</strong>
              <span>${escapeHtml(payload?.termLabel || "All Terms")}</span>
            </div>
            <div class="summary-card">
              <strong>Sessions Included</strong>
              <span>${escapeHtml(String(rows.length))}</span>
            </div>
          </div>

          ${groupsMarkup || "<p>No virtual class sessions are available for the selected timetable filters yet.</p>"}

          <div class="footer">
            <div><strong>Motto:</strong> ${escapeHtml(payload?.motto || "Honesty, Service and Honour")}</div>
            <div><strong>Address:</strong> ${escapeHtml(payload?.address || "152 Okedogbon Road, Owo, Ondo State, Nigeria")}</div>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function downloadVirtualClassTimetable(payload) {
  const html = buildVirtualClassTimetableHtml(payload);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const classKey = String(payload?.classLabel || "virtual-classes").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const termKey = String(payload?.termLabel || "all-terms").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  link.href = url;
  link.download = `${classKey}-${termKey}-virtual-timetable.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
