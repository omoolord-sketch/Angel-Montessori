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
    <div style={{ padding: 16, background: "#f4f8fc", minHeight: "100vh", display: "grid", gap: 12 }}>
      <div style={panel}>
        <h2 style={{ marginTop: 0 }}>Termly Broadsheet Desk</h2>
        <p style={{ marginTop: 0, color: "#4d647f" }}>Generate, review, approve, and export official class broadsheets for Angel Montessori terms and sessions.</p>
        <div style={grid}>
          <div><strong>Available Classes:</strong> {fmtNum(dashboard.cards?.availableClassesThisTerm)}</div>
          <div><strong>Generated:</strong> {fmtNum(dashboard.cards?.broadsheetsGenerated)}</div>
          <div><strong>Locked:</strong> {fmtNum(dashboard.cards?.broadsheetsLocked)}</div>
          <div><strong>Pending Approval:</strong> {fmtNum(dashboard.cards?.pendingApproval)}</div>
        </div>
      </div>

      <div style={panel}>
        <h3 style={{ marginTop: 0 }}>Generate Broadsheet</h3>
        <div style={{ ...grid, gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
          <select value={filters.classId} onChange={(e) => setFilters((p) => ({ ...p, classId: e.target.value }))}><option value="">Select Class</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <input value={filters.session} onChange={(e) => setFilters((p) => ({ ...p, session: e.target.value }))} placeholder="Session" />
          <select value={filters.term} onChange={(e) => setFilters((p) => ({ ...p, term: e.target.value }))}><option>First Term</option><option>Second Term</option><option>Third Term</option></select>
          <select value={filters.broadsheetType} onChange={(e) => setFilters((p) => ({ ...p, broadsheetType: e.target.value, includeCAExamSplit: e.target.value === "detailed" }))}><option value="summary">Summary</option><option value="detailed">Detailed</option><option value="early_years">Early Years</option><option value="exam_office">Exam Office</option></select>
          <select value={filters.sortBy} onChange={(e) => setFilters((p) => ({ ...p, sortBy: e.target.value }))}><option value="position">Position</option><option value="name">Name</option><option value="admission_no">Admission No</option></select>
          <input value={filters.subject} onChange={(e) => setFilters((p) => ({ ...p, subject: e.target.value }))} placeholder="Optional subject filter" />
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
          <label><input type="checkbox" checked={filters.includeCAExamSplit} onChange={(e) => setFilters((p) => ({ ...p, includeCAExamSplit: e.target.checked }))} /> CA/Exam Split</label>
          <label><input type="checkbox" checked={filters.includeGrades} onChange={(e) => setFilters((p) => ({ ...p, includeGrades: e.target.checked }))} /> Include Grades</label>
          <label><input type="checkbox" checked={filters.includeAttendance} onChange={(e) => setFilters((p) => ({ ...p, includeAttendance: e.target.checked }))} /> Include Attendance</label>
          <label><input type="checkbox" checked={filters.includeComments} onChange={(e) => setFilters((p) => ({ ...p, includeComments: e.target.checked }))} /> Include Comments</label>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <button onClick={generate} disabled={loading}>Generate</button>
          <button onClick={() => loadPreview()} disabled={loading}>Preview</button>
          <button onClick={() => runExport("excel")} disabled={loading || !preview}>Export Excel</button>
          <button onClick={() => runExport("pdf")} disabled={loading || !preview}>Export PDF</button>
          {canApprove && <button onClick={approve} disabled={loading || !preview?.snapshotId}>Approve</button>}
          {canApprove && <button onClick={lock} disabled={loading || !preview?.snapshotId}>Lock Official Copy</button>}
          <button onClick={refreshAll} disabled={loading}>Refresh Records</button>
        </div>
        {loading ? <p>Loading broadsheet records...</p> : null}
        {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
        {message ? <p style={{ color: "#0b7a2f" }}>{message}</p> : null}
      </div>

      {preview ? (
        <div style={panel}>
          <h3 style={{ marginTop: 0 }}>{preview.class?.name} - {preview.term} Broadsheet</h3>
          <p style={{ marginTop: 0 }}>Session: {preview.session} | Type: {preview.broadsheetType} | Snapshot: {preview.snapshotId || "Live"} {preview.snapshotStatus ? `(${preview.snapshotStatus})` : ""}</p>
          <div style={{ overflowX: "auto", border: "1px solid #e0e7ef", borderRadius: 8 }}>
            <table style={{ borderCollapse: "collapse", minWidth: 1000, width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ position: "sticky", left: 0, background: "#eef5ff", border: "1px solid #d8e3f0", padding: 6 }}>S/N</th>
                  <th style={{ position: "sticky", left: 40, background: "#eef5ff", border: "1px solid #d8e3f0", padding: 6 }}>Adm No</th>
                  <th style={{ position: "sticky", left: 160, background: "#eef5ff", border: "1px solid #d8e3f0", padding: 6 }}>Student Name</th>
                  {(preview.subjects || []).map((sub) => <th key={sub} style={{ border: "1px solid #d8e3f0", padding: 6 }}>{sub}</th>)}
                  <th style={{ border: "1px solid #d8e3f0", padding: 6 }}>Total</th>
                  <th style={{ border: "1px solid #d8e3f0", padding: 6 }}>Avg</th>
                  <th style={{ border: "1px solid #d8e3f0", padding: 6 }}>Pos</th>
                  <th style={{ border: "1px solid #d8e3f0", padding: 6 }}>Remark</th>
                </tr>
              </thead>
              <tbody>
                {(preview.rows || []).map((row, i) => (
                  <tr key={`${row.studentId}-${i}`}>
                    <td style={{ position: "sticky", left: 0, background: "#fff", border: "1px solid #e5edf5", padding: 6 }}>{i + 1}</td>
                    <td style={{ position: "sticky", left: 40, background: "#fff", border: "1px solid #e5edf5", padding: 6 }}>{row.admissionNo}</td>
                    <td style={{ position: "sticky", left: 160, background: "#fff", border: "1px solid #e5edf5", padding: 6 }}>{row.studentName}</td>
                    {(preview.subjects || []).map((sub) => <td key={sub} style={{ border: "1px solid #e5edf5", padding: 6, textAlign: "center" }}>{row.subjectScores?.[sub]?.total ?? ""}</td>)}
                    <td style={{ border: "1px solid #e5edf5", padding: 6, textAlign: "center" }}>{row.totalScore}</td>
                    <td style={{ border: "1px solid #e5edf5", padding: 6, textAlign: "center" }}>{Number(row.averageScore || 0).toFixed(2)}</td>
                    <td style={{ border: "1px solid #e5edf5", padding: 6, textAlign: "center" }}>{row.overallPosition}</td>
                    <td style={{ border: "1px solid #e5edf5", padding: 6 }}>{row.overallRemark || row.remark}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {classStats ? (
        <div style={panel}>
          <h3 style={{ marginTop: 0 }}>Class Statistics</h3>
          <p style={{ marginTop: 0, color: "#4d647f" }}>Generate, review, approve, and export official class broadsheets for Angel Montessori terms and sessions.</p>
        <div style={grid}>
            <div>Students: <strong>{fmtNum(classStats.students)}</strong></div>
            <div>Subjects: <strong>{fmtNum(classStats.subjectsOffered)}</strong></div>
            <div>Highest Avg: <strong>{fmtNum(classStats.highestAverage)}</strong></div>
            <div>Lowest Avg: <strong>{fmtNum(classStats.lowestAverage)}</strong></div>
            <div>Class Avg: <strong>{fmtNum(classStats.classAverage)}</strong></div>
            <div>Pass Rate: <strong>{fmtPct(classStats.passRate)}</strong></div>
            <div>Fail Rate: <strong>{fmtPct(classStats.failRate)}</strong></div>
          </div>
        </div>
      ) : null}

      {subjectStats.length ? (
        <div style={panel}>
          <h3 style={{ marginTop: 0 }}>Subject Statistics</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th align="left">Subject</th><th align="right">Highest</th><th align="right">Lowest</th><th align="right">Average</th><th align="right">Pass Rate</th><th align="right">Fail Rate</th></tr></thead>
              <tbody>
                {subjectStats.map((r) => (
                  <tr key={r.subject} style={{ borderTop: "1px solid #edf2f8" }}>
                    <td>{r.subject}</td><td align="right">{fmtNum(r.highest)}</td><td align="right">{fmtNum(r.lowest)}</td><td align="right">{fmtNum(r.average)}</td><td align="right">{fmtPct(r.passRate)}</td><td align="right">{fmtPct(r.failRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {canApprove ? (
        <div style={panel}>
          <h3 style={{ marginTop: 0 }}>Snapshot Archive</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th align="left">Class</th><th>Session</th><th>Term</th><th>Type</th><th>Status</th><th>Generated</th><th>Action</th></tr></thead>
              <tbody>
                {archive.map((row) => (
                  <tr key={row.id} style={{ borderTop: "1px solid #edf2f8" }}>
                    <td>{row.className}</td><td align="center">{row.session}</td><td align="center">{row.term}</td><td align="center">{row.broadsheetType}</td><td align="center">{row.status}</td><td align="center">{String(row.generatedAt || row.createdAt || "").slice(0, 10)}</td>
                    <td><button onClick={() => loadPreview({ snapshotId: row.id })}>View</button></td>
                  </tr>
                ))}
                {archive.length === 0 ? <tr><td colSpan={7} style={{ padding: 8 }}>No snapshots found.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
