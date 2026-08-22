import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  getClasses,
  getBroadsheetDashboard,
  generateBroadsheet,
  getBroadsheetPreview,
  getBroadsheetDetailed,
  getBroadsheetClassStatistics,
  getBroadsheetSubjectStatistics,
  approveBroadsheetSnapshot,
  lockBroadsheetSnapshot,
  getBroadsheetArchive,
  exportBroadsheetExcel,
  exportBroadsheetPdf,
} from "../api/services";
import "./PortalAdminModule.css";

const panel = { border: "1px solid #dbe5f0", borderRadius: 10, background: "#fff", padding: 12 };
const grid = { display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" };

function fmtPct(v) { return `${Number(v || 0).toFixed(1)}%`; }
function fmtNum(v) { return Number(v || 0); }

function parseFilename(disposition = "", fallback = "export.xlsx") {
  const utf = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf?.[1]) return decodeURIComponent(utf[1]);
  const basic = disposition.match(/filename="?([^";]+)"?/i);
  return basic?.[1] || fallback;
}

function downloadBlob(data, mime, filename) {
  const blob = new Blob([data], { type: mime });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export default function BroadsheetDashboard() {
  const { user } = useAuth();
  const role = String(user?.role || "").toUpperCase();
  const canApprove = role === "ADMIN";

  const [classes, setClasses] = useState([]);
  const [filters, setFilters] = useState({
    classId: "",
    session: "2025/2026",
    term: "First Term",
    broadsheetType: "summary",
    includeCAExamSplit: false,
    includeGrades: true,
    includeAttendance: true,
    includeComments: true,
    sortBy: "position",
    subject: "",
  });

  const [dashboard, setDashboard] = useState({ cards: {}, recentActivity: [] });
  const [preview, setPreview] = useState(null);
  const [classStats, setClassStats] = useState(null);
  const [subjectStats, setSubjectStats] = useState([]);
  const [archive, setArchive] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");


  const loadSetup = async () => {
    setError("");
    const cls = await getClasses();
    const rows = Array.isArray(cls?.data) ? cls.data : Array.isArray(cls?.data?.classes) ? cls.data.classes : [];
    setClasses(rows.map((x) => ({ id: String(x.id), name: String(x.name || x.className), section: String(x.section || "") })));
  };

  const loadDashboard = async () => {
    const res = await getBroadsheetDashboard({ session: filters.session, term: filters.term });
    setDashboard(res?.data || { cards: {}, recentActivity: [] });
  };

  const loadArchive = async () => {
    if (!canApprove) return;
    const res = await getBroadsheetArchive({ session: filters.session, term: filters.term });
    setArchive(Array.isArray(res?.data) ? res.data : []);
  };

  const refreshAll = async () => {
    setLoading(true);
    setError("");
    try {
      await Promise.all([loadSetup(), loadDashboard(), loadArchive()]);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load broadsheet dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refreshAll(); }, []);

  const loadPreview = async (extra = {}) => {
    if (!filters.classId && !extra.snapshotId) {
      setError("Select class first.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const params = { ...filters, ...extra };
      const fn = filters.broadsheetType === "detailed" ? getBroadsheetDetailed : getBroadsheetPreview;
      const [prevRes, cRes, sRes] = await Promise.all([
        fn(params),
        getBroadsheetClassStatistics(params),
        getBroadsheetSubjectStatistics(params),
      ]);
      setPreview(prevRes?.data || null);
      setClassStats(cRes?.data?.classStats || prevRes?.data?.classStats || null);
      setSubjectStats(sRes?.data?.subjectStats || prevRes?.data?.subjectStats || []);
      setMessage("Broadsheet loaded.");
    } catch (e) {
      setPreview(null);
      setClassStats(null);
      setSubjectStats([]);
      setError(e?.response?.data?.message || "Failed to load broadsheet preview");
    } finally {
      setLoading(false);
    }
  };

  const generate = async () => {
    if (!filters.classId) {
      setError("Select class first.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await generateBroadsheet({ ...filters, createSnapshot: true });
      setPreview(res?.data?.payload || null);
      setClassStats(res?.data?.payload?.classStats || null);
      setSubjectStats(res?.data?.payload?.subjectStats || []);
      setMessage(res?.data?.snapshot?.id ? `Broadsheet generated. Snapshot: ${res.data.snapshot.id}` : "Broadsheet generated.");
      await Promise.all([loadDashboard(), loadArchive()]);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to generate broadsheet");
    } finally {
      setLoading(false);
    }
  };

  const approve = async () => {
    const snapshotId = preview?.snapshotId;
    if (!snapshotId) return setError("Load a generated snapshot first.");
    setLoading(true);
    setError("");
    try {
      await approveBroadsheetSnapshot({ snapshotId });
      setMessage("Broadsheet approved.");
      await Promise.all([loadDashboard(), loadArchive(), loadPreview({ snapshotId })]);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to approve broadsheet");
    } finally {
      setLoading(false);
    }
  };

  const lock = async () => {
    const snapshotId = preview?.snapshotId;
    if (!snapshotId) return setError("Load a generated snapshot first.");
    setLoading(true);
    setError("");
    try {
      await lockBroadsheetSnapshot({ snapshotId });
      setMessage("Broadsheet locked as official copy.");
      await Promise.all([loadDashboard(), loadArchive(), loadPreview({ snapshotId })]);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to lock broadsheet");
    } finally {
      setLoading(false);
    }
  };

  const runExport = async (kind) => {
    const params = preview?.snapshotId
      ? { snapshotId: preview.snapshotId, detailed: filters.broadsheetType === "detailed", broadsheetType: filters.broadsheetType }
      : { ...filters, detailed: filters.broadsheetType === "detailed" };

    setLoading(true);
    setError("");
    try {
      const res = kind === "excel" ? await exportBroadsheetExcel(params) : await exportBroadsheetPdf(params);
      const disposition = res?.headers?.["content-disposition"] || "";
      const type = res?.headers?.["content-type"] || (kind === "excel" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/pdf");
      const fallback = kind === "excel" ? "broadsheet.xlsx" : "broadsheet.pdf";
      const filename = parseFilename(disposition, fallback);
      downloadBlob(res?.data, type, filename);
      setMessage(`${kind.toUpperCase()} exported.`);
    } catch (e) {
      setError(e?.response?.data?.message || `Failed to export ${kind.toUpperCase()}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-module-page broadsheet-module">
      <div className="admin-module-shell">
        <section className="admin-module-hero">
          <div>
            <div className="admin-module-kicker">Termly Academic Summary</div>
            <h1>Termly Broadsheet Desk</h1>
            <p>
              Generate, review, approve, lock, and export official class broadsheets for Angel Montessori terms and sessions.
            </p>
          </div>
          <div className="admin-module-actions">
            <button type="button" onClick={refreshAll} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh Records"}
            </button>
          </div>
        </section>

        {error ? <div className="admin-alert error">{error}</div> : null}
        {message ? <div className="admin-alert success">{message}</div> : null}
        {loading ? <div className="admin-alert">Loading broadsheet records...</div> : null}

        <section className="admin-stat-grid" aria-label="Broadsheet overview">
          <article className="admin-stat-card">
            <span>Available Classes</span>
            <strong>{fmtNum(dashboard.cards?.availableClassesThisTerm)}</strong>
            <small>Classes ready this term</small>
          </article>
          <article className="admin-stat-card">
            <span>Generated</span>
            <strong>{fmtNum(dashboard.cards?.broadsheetsGenerated)}</strong>
            <small>Snapshots created</small>
          </article>
          <article className="admin-stat-card">
            <span>Locked</span>
            <strong>{fmtNum(dashboard.cards?.broadsheetsLocked)}</strong>
            <small>Official copies secured</small>
          </article>
          <article className="admin-stat-card">
            <span>Pending Approval</span>
            <strong>{fmtNum(dashboard.cards?.pendingApproval)}</strong>
            <small>Awaiting admin review</small>
          </article>
        </section>

        <section className="admin-card">
          <div className="admin-card-header">
            <div>
              <span className="admin-section-tag">Broadsheet Builder</span>
              <h2>Generate Broadsheet</h2>
            </div>
            <p>Select class, session, term, and broadsheet format before previewing or generating an official snapshot.</p>
          </div>

          <div className="admin-form-grid">
            <label className="admin-field">
              Class
              <select value={filters.classId} onChange={(e) => setFilters((p) => ({ ...p, classId: e.target.value }))}>
                <option value="">Select Class</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="admin-field">
              Session
              <input value={filters.session} onChange={(e) => setFilters((p) => ({ ...p, session: e.target.value }))} placeholder="Session" />
            </label>
            <label className="admin-field">
              Term
              <select value={filters.term} onChange={(e) => setFilters((p) => ({ ...p, term: e.target.value }))}>
                <option>First Term</option>
                <option>Second Term</option>
                <option>Third Term</option>
              </select>
            </label>
            <label className="admin-field">
              Broadsheet Type
              <select
                value={filters.broadsheetType}
                onChange={(e) => setFilters((p) => ({ ...p, broadsheetType: e.target.value, includeCAExamSplit: e.target.value === "detailed" }))}
              >
                <option value="summary">Summary</option>
                <option value="detailed">Detailed</option>
                <option value="early_years">Early Years</option>
                <option value="exam_office">Exam Office</option>
              </select>
            </label>
            <label className="admin-field">
              Sort By
              <select value={filters.sortBy} onChange={(e) => setFilters((p) => ({ ...p, sortBy: e.target.value }))}>
                <option value="position">Position</option>
                <option value="name">Name</option>
                <option value="admission_no">Admission No</option>
              </select>
            </label>
            <label className="admin-field">
              Subject Filter
              <input value={filters.subject} onChange={(e) => setFilters((p) => ({ ...p, subject: e.target.value }))} placeholder="Optional subject filter" />
            </label>
          </div>

          <div className="admin-check-grid">
            <label><input type="checkbox" checked={filters.includeCAExamSplit} onChange={(e) => setFilters((p) => ({ ...p, includeCAExamSplit: e.target.checked }))} /> CA/Exam Split</label>
            <label><input type="checkbox" checked={filters.includeGrades} onChange={(e) => setFilters((p) => ({ ...p, includeGrades: e.target.checked }))} /> Include Grades</label>
            <label><input type="checkbox" checked={filters.includeAttendance} onChange={(e) => setFilters((p) => ({ ...p, includeAttendance: e.target.checked }))} /> Include Attendance</label>
            <label><input type="checkbox" checked={filters.includeComments} onChange={(e) => setFilters((p) => ({ ...p, includeComments: e.target.checked }))} /> Include Comments</label>
          </div>

          <div className="admin-form-actions">
            <button type="button" onClick={generate} disabled={loading}>Generate</button>
            <button type="button" className="secondary" onClick={() => loadPreview()} disabled={loading}>Preview</button>
            <button type="button" className="secondary" onClick={() => runExport("excel")} disabled={loading || !preview}>Export Excel</button>
            <button type="button" className="secondary" onClick={() => runExport("pdf")} disabled={loading || !preview}>Export PDF</button>
            {canApprove ? <button type="button" onClick={approve} disabled={loading || !preview?.snapshotId}>Approve</button> : null}
            {canApprove ? <button type="button" onClick={lock} disabled={loading || !preview?.snapshotId}>Lock Official Copy</button> : null}
          </div>
        </section>

        {preview ? (
          <section className="admin-card">
            <div className="admin-card-header">
              <div>
                <span className="admin-section-tag">Preview</span>
                <h2>{preview.class?.name} - {preview.term} Broadsheet</h2>
              </div>
              <p>
                Session: {preview.session} | Type: {preview.broadsheetType} | Snapshot: {preview.snapshotId || "Live"} {preview.snapshotStatus ? `(${preview.snapshotStatus})` : ""}
              </p>
            </div>

            <div className="admin-table-scroll broadsheet-preview-table">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th className="sticky-col one">S/N</th>
                    <th className="sticky-col two">Adm No</th>
                    <th className="sticky-col three">Student Name</th>
                    {(preview.subjects || []).map((sub) => <th key={sub}>{sub}</th>)}
                    <th>Total</th>
                    <th>Avg</th>
                    <th>Pos</th>
                    <th>Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {(preview.rows || []).map((row, i) => (
                    <tr key={`${row.studentId}-${i}`}>
                      <td className="sticky-col one">{i + 1}</td>
                      <td className="sticky-col two">{row.admissionNo}</td>
                      <td className="sticky-col three">{row.studentName}</td>
                      {(preview.subjects || []).map((sub) => <td key={sub} className="number-cell">{row.subjectScores?.[sub]?.total ?? ""}</td>)}
                      <td className="number-cell">{row.totalScore}</td>
                      <td className="number-cell">{Number(row.averageScore || 0).toFixed(2)}</td>
                      <td className="number-cell">{row.overallPosition}</td>
                      <td>{row.overallRemark || row.remark}</td>
                    </tr>
                  ))}
                  {(preview.rows || []).length === 0 ? (
                    <tr><td colSpan={(preview.subjects || []).length + 7}>No broadsheet rows found.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <section className="admin-empty-state">
            <strong>No broadsheet preview loaded yet.</strong>
            <span>Select a class and click Preview or Generate to view the termly broadsheet.</span>
          </section>
        )}

        {classStats ? (
          <section className="admin-card">
            <div className="admin-card-header">
              <div>
                <span className="admin-section-tag">Class Analytics</span>
                <h2>Class Statistics</h2>
              </div>
              <p>Quick performance health check for the selected class and term.</p>
            </div>
            <div className="admin-stat-grid compact">
              <article className="admin-mini-stat"><span>Students</span><strong>{fmtNum(classStats.students)}</strong></article>
              <article className="admin-mini-stat"><span>Subjects</span><strong>{fmtNum(classStats.subjectsOffered)}</strong></article>
              <article className="admin-mini-stat"><span>Highest Avg</span><strong>{fmtNum(classStats.highestAverage)}</strong></article>
              <article className="admin-mini-stat"><span>Lowest Avg</span><strong>{fmtNum(classStats.lowestAverage)}</strong></article>
              <article className="admin-mini-stat"><span>Class Avg</span><strong>{fmtNum(classStats.classAverage)}</strong></article>
              <article className="admin-mini-stat"><span>Pass Rate</span><strong>{fmtPct(classStats.passRate)}</strong></article>
              <article className="admin-mini-stat"><span>Fail Rate</span><strong>{fmtPct(classStats.failRate)}</strong></article>
            </div>
          </section>
        ) : null}

        {subjectStats.length ? (
          <section className="admin-card">
            <div className="admin-card-header">
              <div>
                <span className="admin-section-tag">Subject Breakdown</span>
                <h2>Subject Statistics</h2>
              </div>
              <p>Highest, lowest, average, pass rate, and fail rate for each subject.</p>
            </div>
            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th className="number-cell">Highest</th>
                    <th className="number-cell">Lowest</th>
                    <th className="number-cell">Average</th>
                    <th className="number-cell">Pass Rate</th>
                    <th className="number-cell">Fail Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectStats.map((r) => (
                    <tr key={r.subject}>
                      <td>{r.subject}</td>
                      <td className="number-cell">{fmtNum(r.highest)}</td>
                      <td className="number-cell">{fmtNum(r.lowest)}</td>
                      <td className="number-cell">{fmtNum(r.average)}</td>
                      <td className="number-cell">{fmtPct(r.passRate)}</td>
                      <td className="number-cell">{fmtPct(r.failRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {canApprove ? (
          <section className="admin-card">
            <div className="admin-card-header">
              <div>
                <span className="admin-section-tag">Official Records</span>
                <h2>Snapshot Archive</h2>
              </div>
              <p>View generated snapshots and reopen official records for review.</p>
            </div>
            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Class</th>
                    <th>Session</th>
                    <th>Term</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Generated</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {archive.map((row) => (
                    <tr key={row.id}>
                      <td>{row.className}</td>
                      <td>{row.session}</td>
                      <td>{row.term}</td>
                      <td>{row.broadsheetType}</td>
                      <td><span className="admin-status-pill neutral">{row.status}</span></td>
                      <td>{String(row.generatedAt || row.createdAt || "").slice(0, 10)}</td>
                      <td><button type="button" className="admin-table-action" onClick={() => loadPreview({ snapshotId: row.id })}>View</button></td>
                    </tr>
                  ))}
                  {archive.length === 0 ? <tr><td colSpan={7}>No snapshots found.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
