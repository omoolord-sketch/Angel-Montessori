import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { isTeacherRole } from "../utils/roleHelpers";
import {
  createTeacherAnalyticsNote,
  exportTeacherAnalytics,
  getTeacherAnalyticsDashboard,
  getTeacherAnalyticsExports,
  getTeacherAnalyticsFlags,
  getTeacherAnalyticsMetadata,
  getTeacherAnalyticsTeacherDetail,
  getTeacherAnalyticsTeachers,
  resolveTeacherAnalyticsFlag,
  runTeacherAnalyticsFlagJob,
  runTeacherAnalyticsSnapshotJob,
} from "../api/services";
import "./PortalAdminModule.css";

const card = { border: "1px solid #d7e3f2", borderRadius: 10, padding: 12, background: "#fff" };
const grid = { display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" };

function pct(value) {
  const n = Number(value || 0);
  return `${n.toFixed(1)}%`;
}

function num(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function fmtDate(value) {
  const v = String(value || "").trim();
  if (!v) return "-";
  const dt = new Date(v);
  if (Number.isNaN(dt.getTime())) return v;
  return dt.toLocaleString();
}

function parseFileNameFromDisposition(value, fallback = "teacher-analytics-export.csv") {
  const raw = String(value || "");
  const utf = raw.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf && utf[1]) return decodeURIComponent(utf[1]);
  const basic = raw.match(/filename="?([^";]+)"?/i);
  if (basic && basic[1]) return basic[1];
  return fallback;
}

function triggerDownload(blob, fileName) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export default function TeacherAnalyticsDashboard() {
  const { user } = useAuth();
  const role = String(user?.role || "").toUpperCase();
  const isTeacher = isTeacherRole(role);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [metadata, setMetadata] = useState({ sessions: [], terms: [], sections: [], teachers: [] });
  const [filters, setFilters] = useState({ sessionId: "", termId: "", section: "", search: "", flagStatus: "" });

  const [summary, setSummary] = useState({});
  const [cards, setCards] = useState({});
  const [teachers, setTeachers] = useState([]);
  const [flags, setFlags] = useState([]);
  const [exportsLog, setExportsLog] = useState([]);

  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [teacherDetail, setTeacherDetail] = useState(null);

  const [noteDraft, setNoteDraft] = useState({ noteType: "observation", visibility: "admin_only", title: "", note: "" });

  const activeSessionId = useMemo(() => {
    return filters.sessionId || metadata.sessions.find((x) => x.isActive)?.id || metadata.sessions[0]?.id || "";
  }, [filters.sessionId, metadata.sessions]);

  const activeTermId = useMemo(() => {
    const termRows = metadata.terms.filter((x) => !activeSessionId || String(x.sessionId) === String(activeSessionId));
    return filters.termId || termRows.find((x) => x.isActive)?.id || termRows[0]?.id || "";
  }, [filters.termId, metadata.terms, activeSessionId]);

  const loadMetadata = async () => {
    const res = await getTeacherAnalyticsMetadata();
    const payload = res?.data || {};
    setMetadata({
      sessions: Array.isArray(payload.sessions) ? payload.sessions : [],
      terms: Array.isArray(payload.terms) ? payload.terms : [],
      sections: Array.isArray(payload.sections) ? payload.sections : [],
      teachers: Array.isArray(payload.teachers) ? payload.teachers : [],
    });

    const nextSession = (payload.sessions || []).find((x) => x.isActive)?.id || payload.sessions?.[0]?.id || "";
    const nextTerms = (payload.terms || []).filter((x) => !nextSession || String(x.sessionId) === String(nextSession));
    const nextTerm = nextTerms.find((x) => x.isActive)?.id || nextTerms[0]?.id || "";

    setFilters((prev) => ({ ...prev, sessionId: prev.sessionId || nextSession, termId: prev.termId || nextTerm }));
  };

  const adminParams = (extra = {}) => ({
    sessionId: activeSessionId,
    termId: activeTermId,
    section: filters.section,
    search: filters.search,
    flagStatus: filters.flagStatus,
    ...extra,
  });

  const loadAdmin = async (teacherToLoad = "") => {
    const [dashboardRes, teachersRes, flagsRes, exportsRes] = await Promise.allSettled([
      getTeacherAnalyticsDashboard(adminParams()),
      getTeacherAnalyticsTeachers(adminParams()),
      getTeacherAnalyticsFlags({ sessionId: activeSessionId, termId: activeTermId, status: "open" }),
      getTeacherAnalyticsExports({ sessionId: activeSessionId, termId: activeTermId }),
    ]);

    if (dashboardRes.status === "fulfilled") {
      setSummary(dashboardRes.value?.data?.summary || {});
      setCards(dashboardRes.value?.data?.cards || {});
    }

    if (teachersRes.status === "fulfilled") {
      const rows = Array.isArray(teachersRes.value?.data) ? teachersRes.value.data : [];
      setTeachers(rows);

      const candidate = teacherToLoad || selectedTeacherId || rows[0]?.teacherUserId || "";
      if (candidate) {
        setSelectedTeacherId(candidate);
        await loadTeacherDetail(candidate);
      } else {
        setTeacherDetail(null);
      }
    }

    if (flagsRes.status === "fulfilled") {
      setFlags(Array.isArray(flagsRes.value?.data) ? flagsRes.value.data : []);
    }

    if (exportsRes.status === "fulfilled") {
      setExportsLog(Array.isArray(exportsRes.value?.data) ? exportsRes.value.data : []);
    }

    const firstErr = [dashboardRes, teachersRes, flagsRes, exportsRes]
      .filter((x) => x.status === "rejected")
      .map((x) => x.reason?.response?.data?.message || x.reason?.message)
      .find(Boolean);

    if (firstErr) setError(firstErr);
  };

  const loadTeacherDetail = async (teacherUserId) => {
    if (!teacherUserId) return;
    const res = await getTeacherAnalyticsTeacherDetail(teacherUserId, {
      sessionId: activeSessionId,
      termId: activeTermId,
    });
    setTeacherDetail(res?.data || null);
  };

  const loadTeacherSelf = async () => {
    const id = String(user?.id || "");
    if (!id) return;
    await loadTeacherDetail(id);
  };

  const refresh = async (teacherToLoad = "") => {
    setLoading(true);
    setError("");
    try {
      if (!metadata.sessions.length) await loadMetadata();
      if (isTeacher) await loadTeacherSelf();
      else await loadAdmin(teacherToLoad);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load teacher analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!metadata.sessions.length) return;
    if (isTeacher) {
      refresh();
    } else {
      refresh(selectedTeacherId);
    }
  }, [activeSessionId, activeTermId, filters.section, filters.search, filters.flagStatus]);

  const runSnapshot = async () => {
    setLoading(true);
    setError("");
    try {
      await runTeacherAnalyticsSnapshotJob({ sessionId: activeSessionId, termId: activeTermId });
      setMessage("Snapshot job completed.");
      await refresh(selectedTeacherId);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to run snapshot job");
    } finally {
      setLoading(false);
    }
  };

  const runFlags = async () => {
    setLoading(true);
    setError("");
    try {
      await runTeacherAnalyticsFlagJob({ sessionId: activeSessionId, termId: activeTermId });
      setMessage("Flag job completed.");
      await refresh(selectedTeacherId);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to run flag job");
    } finally {
      setLoading(false);
    }
  };

  const resolveFlag = async (flagId) => {
    if (!flagId) return;
    setLoading(true);
    setError("");
    try {
      await resolveTeacherAnalyticsFlag(flagId, { resolutionNote: "Resolved from dashboard" });
      setMessage("Flag resolved.");
      await refresh(selectedTeacherId);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to resolve flag");
    } finally {
      setLoading(false);
    }
  };

  const addNote = async () => {
    if (!selectedTeacherId) {
      setError("Select a teacher first.");
      return;
    }
    if (!noteDraft.title || !noteDraft.note) {
      setError("Note title and details are required.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await createTeacherAnalyticsNote({
        teacherUserId: selectedTeacherId,
        sessionId: activeSessionId,
        termId: activeTermId,
        noteType: noteDraft.noteType,
        visibility: noteDraft.visibility,
        title: noteDraft.title,
        note: noteDraft.note,
      });
      setNoteDraft({ noteType: "observation", visibility: "admin_only", title: "", note: "" });
      setMessage("Feedback note added.");
      await refresh(selectedTeacherId);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to add feedback note");
    } finally {
      setLoading(false);
    }
  };

  const downloadExport = async (type, format = "csv") => {
    setLoading(true);
    setError("");
    try {
      const params = {
        sessionId: activeSessionId,
        termId: activeTermId,
        section: filters.section,
        search: filters.search,
        type,
        format,
      };

      if (type === "teacher" && !isTeacher && selectedTeacherId) {
        params.teacherUserId = selectedTeacherId;
      }

      const res = await exportTeacherAnalytics(params);
      const disposition = res?.headers?.["content-disposition"] || "";
      const fallback = `teacher-analytics-${type}.${format === "pdf" ? "pdf" : "csv"}`;
      const fileName = parseFileNameFromDisposition(disposition, fallback);
      const mime =
        res?.headers?.["content-type"] ||
        (format === "pdf" ? "application/pdf" : "text/csv;charset=utf-8");
      const blob = new Blob([res?.data], { type: mime });
      triggerDownload(blob, fileName);
      setMessage(`${String(format).toUpperCase()} export downloaded.`);
      if (!isTeacher) await refresh(selectedTeacherId);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to download export");
    } finally {
      setLoading(false);
    }
  };

  const printProfile = () => {
    window.print();
  };

  const snapshot = teacherDetail?.snapshot || {};

  return (
    <div className="admin-module-page">
      <div className="admin-module-shell">
        <section className="admin-module-hero">
          <div>
            <span className="admin-module-kicker">Teacher Analytics</span>
            <h1>Teacher Performance and Support</h1>
            <p>
            {isTeacher
              ? "Review your teaching activity, class engagement, flagged items, and performance records for the selected period."
              : "Monitor teaching activity, class engagement, flagged items, outcomes, and follow-up notes across the school."}
            </p>
          </div>
          <div className="admin-module-actions">
            <button type="button" className="secondary" onClick={() => refresh(selectedTeacherId)} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
            {!isTeacher && <button type="button" onClick={runSnapshot} disabled={loading}>Run Snapshot</button>}
            {!isTeacher && <button type="button" onClick={runFlags} disabled={loading}>Run Flags</button>}
            <button type="button" className="secondary" onClick={printProfile} disabled={!teacherDetail}>Print Profile</button>
          </div>
        </section>

        {loading && <div className="admin-alert">Loading teacher analytics...</div>}
        {error && <div className="admin-alert error">{error}</div>}
        {message && <div className="admin-alert success">{message}</div>}

        <section className="admin-card">
          <div className="admin-card-header">
            <div>
              <span className="admin-section-tag">Filters</span>
              <h2>Analytics Period</h2>
              <p>Select the session, term, and teacher scope for analytics review.</p>
            </div>
          </div>
          <div className="admin-form-grid">
            <label className="admin-field"><span>Session</span><select value={activeSessionId} onChange={(e) => setFilters((prev) => ({ ...prev, sessionId: e.target.value, termId: "" }))}>{(metadata.sessions || []).map((row) => <option key={row.id} value={row.id}>{row.sessionName}</option>)}</select></label>
            <label className="admin-field"><span>Term</span><select value={activeTermId} onChange={(e) => setFilters((prev) => ({ ...prev, termId: e.target.value }))}>{(metadata.terms || []).filter((row) => !activeSessionId || String(row.sessionId) === String(activeSessionId)).map((row) => <option key={row.id} value={row.id}>{row.termName}</option>)}</select></label>
            {!isTeacher && (
              <>
                <label className="admin-field"><span>Section</span><select value={filters.section} onChange={(e) => setFilters((prev) => ({ ...prev, section: e.target.value }))}><option value="">All Sections</option>{(metadata.sections || []).map((section) => <option key={section} value={section}>{section}</option>)}</select></label>
                <label className="admin-field"><span>Search teacher</span><input placeholder="Search teacher" value={filters.search} onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))} /></label>
                <label className="admin-field"><span>Flag status</span><select value={filters.flagStatus} onChange={(e) => setFilters((prev) => ({ ...prev, flagStatus: e.target.value }))}><option value="">All Statuses</option><option value="flagged">Flagged</option><option value="clean">Clean</option></select></label>
              </>
            )}
          </div>
          <div className="admin-form-actions">
            {!isTeacher && <button type="button" className="secondary" onClick={() => downloadExport("teachers", "csv")} disabled={loading}>Teachers CSV</button>}
            {!isTeacher && <button type="button" className="secondary" onClick={() => downloadExport("teachers", "pdf")} disabled={loading}>Teachers PDF</button>}
            {!isTeacher && <button type="button" className="secondary" onClick={() => downloadExport("flags", "csv")} disabled={loading}>Flags CSV</button>}
            {!isTeacher && <button type="button" className="secondary" onClick={() => downloadExport("flags", "pdf")} disabled={loading}>Flags PDF</button>}
            {!isTeacher && <button type="button" className="secondary" onClick={() => downloadExport("teacher", "csv")} disabled={loading || !selectedTeacherId}>Selected CSV</button>}
            {!isTeacher && <button type="button" className="secondary" onClick={() => downloadExport("teacher", "pdf")} disabled={loading || !selectedTeacherId}>Selected PDF</button>}
            {isTeacher && <button type="button" className="secondary" onClick={() => downloadExport("teacher", "csv")} disabled={loading}>My CSV</button>}
            {isTeacher && <button type="button" className="secondary" onClick={() => downloadExport("teacher", "pdf")} disabled={loading}>My PDF</button>}
          </div>
        </section>

        {isTeacher ? (
          <>
            <div style={grid}>
              <div style={card}><strong>Lessons Published</strong><div>{num(snapshot.lessonsPublished)}</div></div>
              <div style={card}><strong>Attendance Compliance</strong><div>{pct(snapshot.attendanceSubmissionRate)}</div></div>
              <div style={card}><strong>Grading Completion</strong><div>{pct(snapshot.gradingCompletionRate)}</div></div>
              <div style={card}><strong>Student Engagement</strong><div>{pct((num(snapshot.lessonViewRate) + num(snapshot.assignmentSubmissionRate) + num(snapshot.quizParticipationRate)) / 3)}</div></div>
              <div style={card}><strong>Class Pass Rate</strong><div>{pct(snapshot.classPassRate)}</div></div>
              <div style={card}><strong>Last Active</strong><div>{fmtDate(snapshot.lastActiveAt)}</div></div>
            </div>

            <div style={card}>
              <h3 style={{ marginTop: 0 }}>My Flags</h3>
              {(teacherDetail?.flags || []).length === 0 ? (
                <p>No active flags in this period.</p>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {(teacherDetail?.flags || []).map((row) => (
                    <div key={row.id} style={{ border: "1px solid #ead7d7", borderRadius: 8, padding: 10 }}>
                      <strong>{row.flagType}</strong> ({row.severity})
                      <div>{row.flagMessage}</div>
                      <small>Metric: {row.metricValue} / Threshold: {row.thresholdValue}</small>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={card}>
              <h3 style={{ marginTop: 0 }}>My Feedback Notes</h3>
              {(teacherDetail?.notes || []).length === 0 ? (
                <p>No notes for this period.</p>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {(teacherDetail?.notes || []).map((row) => (
                    <div key={row.id} style={{ border: "1px solid #d7e3f2", borderRadius: 8, padding: 10 }}>
                      <strong>{row.title}</strong>
                      <div>{row.note}</div>
                      <small>{row.noteType} | {fmtDate(row.createdAt)}</small>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div style={grid}>
              <div style={card}><strong>Teachers Active</strong><div>{num(summary.teachersActive)} / {num(summary.teachersTotal)}</div></div>
              <div style={card}><strong>Attendance Compliance</strong><div>{pct(summary.averageAttendanceCompliance)}</div></div>
              <div style={card}><strong>Grading Completion</strong><div>{pct(summary.averageGradingCompletion)}</div></div>
              <div style={card}><strong>Student Engagement</strong><div>{pct(summary.averageStudentEngagement)}</div></div>
              <div style={card}><strong>Pass Rate</strong><div>{pct(summary.averagePassRate)}</div></div>
              <div style={card}><strong>Teachers Flagged</strong><div>{num(summary.teachersFlagged)}</div></div>
            </div>

            <div style={grid}>
              <div style={card}><strong>Low LMS Activity</strong><div>{num(cards.lowLmsActivity)}</div></div>
              <div style={card}><strong>Overdue Grading</strong><div>{num(cards.overdueGrading)}</div></div>
              <div style={card}><strong>Low Attendance</strong><div>{num(cards.lowAttendance)}</div></div>
              <div style={card}><strong>Weak Outcomes</strong><div>{num(cards.weakOutcomes)}</div></div>
            </div>

            <div style={card}>
              <h3 style={{ marginTop: 0 }}>Teacher Performance List</h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th align="left">Teacher</th>
                      <th align="left">Section</th>
                      <th align="right">Lessons</th>
                      <th align="right">Attend%</th>
                      <th align="right">Grade%</th>
                      <th align="right">Engage%</th>
                      <th align="right">Pass%</th>
                      <th align="right">Flags</th>
                      <th align="left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachers.map((row) => (
                      <tr key={row.teacherUserId} style={{ borderTop: "1px solid #edf2f8" }}>
                        <td>{row.teacherName}</td>
                        <td>{row.section}</td>
                        <td align="right">{row.lessonsPublished}</td>
                        <td align="right">{pct(row.attendanceSubmissionRate)}</td>
                        <td align="right">{pct(row.gradingCompletionRate)}</td>
                        <td align="right">{pct(row.engagementRate)}</td>
                        <td align="right">{pct(row.passRate)}</td>
                        <td align="right">{row.flagsCount}</td>
                        <td><button onClick={() => { setSelectedTeacherId(row.teacherUserId); loadTeacherDetail(row.teacherUserId); }}>View</button></td>
                      </tr>
                    ))}
                    {teachers.length === 0 && (
                      <tr><td colSpan={9} style={{ padding: 10 }}>No teacher data for current filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {!isTeacher && teacherDetail && (
          <div style={{ ...card, display: "grid", gap: 10 }}>
            <h3 style={{ marginTop: 0 }}>Teacher Profile: {teacherDetail?.teacher?.name}</h3>

            <div style={grid}>
              <div style={card}><strong>Classes Assigned</strong><div>{num(snapshot.totalClassesAssigned)}</div></div>
              <div style={card}><strong>Students Assigned</strong><div>{num(snapshot.totalStudentsAssigned)}</div></div>
              <div style={card}><strong>Avg Grading Days</strong><div>{num(snapshot.avgAssignmentGradingDays).toFixed(1)}</div></div>
              <div style={card}><strong>Lesson View Rate</strong><div>{pct(snapshot.lessonViewRate)}</div></div>
              <div style={card}><strong>Assignment Submission Rate</strong><div>{pct(snapshot.assignmentSubmissionRate)}</div></div>
              <div style={card}><strong>Quiz Participation</strong><div>{pct(snapshot.quizParticipationRate)}</div></div>
              <div style={card}><strong>Class Average Score</strong><div>{num(snapshot.classAverageScore).toFixed(1)}</div></div>
              <div style={card}><strong>Fail Rate</strong><div>{pct(snapshot.classFailRate)}</div></div>
            </div>

            <div style={card}>
              <h4 style={{ marginTop: 0 }}>Open Flags</h4>
              {flags.length === 0 ? (
                <p>No active flags.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th align="left">Teacher</th>
                        <th align="left">Type</th>
                        <th align="left">Severity</th>
                        <th align="left">Message</th>
                        <th align="left">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {flags.map((row) => (
                        <tr key={row.id} style={{ borderTop: "1px solid #edf2f8" }}>
                          <td>{row.teacherName}</td>
                          <td>{row.flagType}</td>
                          <td>{row.severity}</td>
                          <td>{row.flagMessage}</td>
                          <td><button onClick={() => resolveFlag(row.id)}>Resolve</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={card}>
              <h4 style={{ marginTop: 0 }}>Add Feedback Note</h4>
              <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                <select value={noteDraft.noteType} onChange={(e) => setNoteDraft((prev) => ({ ...prev, noteType: e.target.value }))}>
                  <option value="observation">Observation</option>
                  <option value="support_needed">Support Needed</option>
                  <option value="commendation">Commendation</option>
                  <option value="intervention">Intervention</option>
                </select>
                <select value={noteDraft.visibility} onChange={(e) => setNoteDraft((prev) => ({ ...prev, visibility: e.target.value }))}>
                  <option value="admin_only">Admin Only</option>
                  <option value="hod_only">HOD Only</option>
                  <option value="teacher_visible">Teacher Visible</option>
                </select>
                <input
                  placeholder="Note title"
                  value={noteDraft.title}
                  onChange={(e) => setNoteDraft((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <textarea
                style={{ width: "100%", marginTop: 8 }}
                rows={3}
                placeholder="Write note"
                value={noteDraft.note}
                onChange={(e) => setNoteDraft((prev) => ({ ...prev, note: e.target.value }))}
              />
              <div style={{ marginTop: 8 }}>
                <button onClick={addNote} disabled={loading}>Save Note</button>
              </div>

              <h4 style={{ marginBottom: 6 }}>Recent Notes</h4>
              {(teacherDetail?.notes || []).length === 0 ? (
                <p>No notes recorded for this teacher.</p>
              ) : (
                <div style={{ display: "grid", gap: 6 }}>
                  {(teacherDetail?.notes || []).slice(0, 8).map((row) => (
                    <div key={row.id} style={{ border: "1px solid #edf2f8", borderRadius: 8, padding: 8 }}>
                      <strong>{row.title}</strong>
                      <div>{row.note}</div>
                      <small>{row.noteType} | {row.visibility} | {fmtDate(row.createdAt)}</small>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={card}>
              <h4 style={{ marginTop: 0 }}>Export History</h4>
              {exportsLog.length === 0 ? (
                <p>No exports recorded for this period.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th align="left">Date</th>
                        <th align="left">Type</th>
                        <th align="left">Exported By</th>
                        <th align="left">Session</th>
                        <th align="left">Term</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exportsLog.slice(0, 20).map((row) => (
                        <tr key={row.id} style={{ borderTop: "1px solid #edf2f8" }}>
                          <td>{fmtDate(row.createdAt)}</td>
                          <td>{row.exportType}</td>
                          <td>{row.exportedByName || "-"}</td>
                          <td>{row.sessionId || "-"}</td>
                          <td>{row.termId || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

