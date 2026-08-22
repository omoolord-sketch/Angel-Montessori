import { useEffect, useMemo, useState } from "react";
import {
  approveContinuousAssessmentRecord,
  getContinuousAssessmentEntry,
  getContinuousAssessmentMetadata,
  getContinuousAssessmentRecords,
  publishContinuousAssessmentResults,
  rejectContinuousAssessmentRecord,
  saveContinuousAssessmentEntry,
  saveContinuousAssessmentGradingScales,
  saveContinuousAssessmentSettings,
  unlockContinuousAssessmentRecord,
} from "../api/services";
import { useAuth } from "../auth/AuthContext";
import { isTeacherRole } from "../utils/roleHelpers";
import "./PortalAdminModule.css";

function normalizeKey(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function termIndex(termName) {
  const key = normalizeKey(termName);
  if (key.includes("first")) return 1;
  if (key.includes("second")) return 2;
  if (key.includes("third")) return 3;
  return 0;
}

function scoreValue(value) {
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

function formatScore(value) {
  if (value === null || value === undefined || value === "") return "-";
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(number % 1 === 0 ? 0 : 2) : String(value);
}

function statusClass(status) {
  const key = String(status || "").toLowerCase();
  if (key.includes("approved") || key.includes("published")) return "success";
  if (key.includes("submitted") || key.includes("pending")) return "warning";
  if (key.includes("reject")) return "danger";
  return "neutral";
}

function resolveSubjects(meta, classId) {
  const cls = (meta.classes || []).find((item) => String(item.id) === String(classId));
  const classSubjects = meta.classSubjects || {};
  return classSubjects[cls?.name] || meta.subjects || [];
}

function NumberInput({ value, onChange, disabled, max }) {
  return (
    <input
      type="number"
      min="0"
      max={max}
      step="0.01"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export default function ContinuousAssessmentDashboard() {
  const { user } = useAuth();
  const role = String(user?.role || "").toUpperCase();
  const originalRole = String(user?.originalRole || role).toUpperCase();
  const isTeacher = isTeacherRole(role);
  const canReview = ["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER"].includes(originalRole);
  const canAdmin = ["ADMIN", "SUPER_ADMIN"].includes(originalRole);

  const [meta, setMeta] = useState({ classes: [], sessions: [], terms: [], subjects: [], students: [], settings: [], gradingScales: [] });
  const [filters, setFilters] = useState({ classId: "", sessionId: "", termId: "", subject: "" });
  const [entry, setEntry] = useState({ rows: [], settings: {} });
  const [drafts, setDrafts] = useState({});
  const [submitted, setSubmitted] = useState([]);
  const [reviewNote, setReviewNote] = useState("");
  const [settingsForm, setSettingsForm] = useState({ classId: "", classLevel: "Default", ca1Max: "10", ca2Max: "10", ca3Max: "10", examMax: "70", totalMax: "100" });
  const [scaleRows, setScaleRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const activeSessionTerms = useMemo(
    () => (meta.terms || []).filter((term) => !filters.sessionId || String(term.sessionId) === String(filters.sessionId)),
    [meta.terms, filters.sessionId]
  );

  const subjectOptions = useMemo(() => resolveSubjects(meta, filters.classId), [meta, filters.classId]);
  const activeTerm = activeSessionTerms.find((item) => String(item.id) === String(filters.termId));
  const currentTermIndex = termIndex(activeTerm?.termName);
  const settings = entry.settings || {};

  const loadMetadata = async () => {
    const res = await getContinuousAssessmentMetadata();
    const data = res?.data || {};
    setMeta(data);
    setScaleRows(Array.isArray(data.gradingScales) ? data.gradingScales : []);
    setFilters((prev) => {
      const nextSession = prev.sessionId || data.sessions?.find((row) => row.isActive)?.id || data.sessions?.[0]?.id || "";
      const nextTerms = (data.terms || []).filter((row) => !nextSession || String(row.sessionId) === String(nextSession));
      const nextClass = prev.classId || data.classes?.[0]?.id || "";
      const nextSubjectOptions = resolveSubjects(data, nextClass);
      return {
        classId: nextClass,
        sessionId: nextSession,
        termId: prev.termId || nextTerms.find((row) => row.isActive)?.id || nextTerms[0]?.id || "",
        subject: prev.subject || nextSubjectOptions[0] || "",
      };
    });
  };

  const loadEntry = async (activeFilters = filters) => {
    if (!activeFilters.classId || !activeFilters.sessionId || !activeFilters.termId || !activeFilters.subject) return;
    const res = await getContinuousAssessmentEntry(activeFilters);
    const data = res?.data || { rows: [], settings: {} };
    setEntry(data);
    const nextDrafts = {};
    (data.rows || []).forEach((row) => {
      nextDrafts[row.studentId] = {
        ca1: scoreValue(row.ca1),
        ca2: scoreValue(row.ca2),
        ca3: scoreValue(row.ca3),
        examScore: scoreValue(row.examScore),
        teacherRemark: row.teacherRemark || "",
      };
    });
    setDrafts(nextDrafts);
  };

  const loadSubmitted = async () => {
    if (!canReview) return;
    const res = await getContinuousAssessmentRecords({ status: "SUBMITTED" });
    setSubmitted(Array.isArray(res?.data) ? res.data : []);
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      setError("");
      await loadMetadata();
      await loadSubmitted();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load continuous assessment data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (filters.classId && filters.sessionId && filters.termId && filters.subject) {
      loadEntry(filters).catch((err) => setError(err?.response?.data?.message || "Failed to load score entry table."));
    }
  }, [filters.classId, filters.sessionId, filters.termId, filters.subject]);

  const updateFilter = (field, value) => {
    setFilters((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "sessionId") {
        const terms = (meta.terms || []).filter((row) => String(row.sessionId) === String(value));
        next.termId = terms.find((row) => row.isActive)?.id || terms[0]?.id || "";
      }
      if (field === "classId") {
        next.subject = resolveSubjects(meta, value)[0] || "";
      }
      return next;
    });
  };

  const setDraft = (studentId, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [field]: value,
      },
    }));
  };

  const saveRows = async (action) => {
    try {
      setLoading(true);
      setError("");
      const rows = (entry.rows || []).map((row) => ({
        ...row,
        ...drafts[row.studentId],
        classId: filters.classId,
        sessionId: filters.sessionId,
        termId: filters.termId,
        subject: filters.subject,
      }));
      const res = await saveContinuousAssessmentEntry({ ...filters, action, rows });
      const errors = res?.data?.errors || [];
      setMessage(action === "submit" ? "Scores submitted for approval." : "Draft scores saved.");
      if (errors.length) setError(errors.slice(0, 4).join(" | "));
      await loadEntry(filters);
      await loadSubmitted();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save assessment scores.");
    } finally {
      setLoading(false);
    }
  };

  const reviewRecord = async (record, action) => {
    try {
      setError("");
      if (action === "approve") {
        await approveContinuousAssessmentRecord(record.id, { note: reviewNote });
        setMessage("Assessment record approved and locked.");
      } else if (action === "reject") {
        await rejectContinuousAssessmentRecord(record.id, { note: reviewNote });
        setMessage("Assessment record rejected with correction note.");
      } else if (action === "unlock") {
        await unlockContinuousAssessmentRecord(record.id, { note: reviewNote });
        setMessage("Assessment record unlocked.");
      }
      setReviewNote("");
      await loadSubmitted();
      await loadEntry(filters);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to review assessment record.");
    }
  };

  const saveSettings = async () => {
    try {
      setError("");
      await saveContinuousAssessmentSettings({
        ...settingsForm,
        ca1Max: Number(settingsForm.ca1Max || 0),
        ca2Max: Number(settingsForm.ca2Max || 0),
        ca3Max: Number(settingsForm.ca3Max || 0),
        examMax: Number(settingsForm.examMax || 0),
        totalMax: Number(settingsForm.totalMax || 0),
      });
      setMessage("Assessment score settings saved.");
      await loadMetadata();
      await loadEntry(filters);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save assessment settings.");
    }
  };

  const saveScales = async () => {
    try {
      setError("");
      await saveContinuousAssessmentGradingScales(scaleRows);
      setMessage("Grading scale saved.");
      await loadMetadata();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save grading scale.");
    }
  };

  const publishResults = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await publishContinuousAssessmentResults(filters);
      setMessage(`Published ${res?.data?.published || 0} approved CA records.`);
      await loadMetadata();
      await loadEntry(filters);
    } catch (err) {
      const payload = err?.response?.data;
      const missingText = payload?.missingCount ? ` Missing records: ${payload.missingCount}.` : "";
      setError((payload?.message || "Failed to publish results.") + missingText);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-admin-page">
      <div className="portal-admin-hero">
        <div>
          <span>RESULT SYSTEM</span>
          <h1>Continuous Assessment</h1>
          <p>Enter CA1, CA2, carried-forward CA3, exam scores, approvals, and report-card publishing from one result workspace.</p>
        </div>
        <button type="button" onClick={loadAll} disabled={loading}>Refresh</button>
      </div>

      {message ? <div className="admin-message success">{message}</div> : null}
      {error ? <div className="admin-message error">{error}</div> : null}

      <section className="admin-card">
        <div className="admin-section-head">
          <div>
            <h2>Score Entry</h2>
            <p>Select a class, term, subject, and session. Carried-forward columns are calculated automatically by term.</p>
          </div>
          <div className="admin-row-actions">
            <button type="button" onClick={() => saveRows("draft")} disabled={loading || !entry.rows.length}>Save Draft</button>
            <button type="button" onClick={() => saveRows("submit")} disabled={loading || !entry.rows.length}>Submit for Approval</button>
          </div>
        </div>

        <div className="admin-filter-grid">
          <label><span>Session</span><select value={filters.sessionId} onChange={(e) => updateFilter("sessionId", e.target.value)}>{(meta.sessions || []).map((row) => <option key={row.id} value={row.id}>{row.sessionName}</option>)}</select></label>
          <label><span>Term</span><select value={filters.termId} onChange={(e) => updateFilter("termId", e.target.value)}>{activeSessionTerms.map((row) => <option key={row.id} value={row.id}>{row.termName}</option>)}</select></label>
          <label><span>Class</span><select value={filters.classId} onChange={(e) => updateFilter("classId", e.target.value)}>{(meta.classes || []).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
          <label><span>Subject</span><select value={filters.subject} onChange={(e) => updateFilter("subject", e.target.value)}>{subjectOptions.map((subject) => <option key={subject} value={subject}>{subject}</option>)}</select></label>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>CA1 / {settings.ca1Max || 10}</th>
                <th>CA2 / {settings.ca2Max || 10}</th>
                <th>CA3 / {settings.ca3Max || 10}</th>
                <th>Exam / {settings.examMax || 70}</th>
                <th>Total</th>
                <th>Grade</th>
                <th>Remark</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(entry.rows || []).map((row) => {
                const draft = drafts[row.studentId] || {};
                const locked = row.isLocked || String(row.approvalStatus || "").toUpperCase() === "APPROVED";
                const ca2Auto = currentTermIndex === 3;
                const ca3Auto = currentTermIndex === 2 || currentTermIndex === 3;
                const total = Number(draft.ca1 || 0) + Number(draft.ca2 || row.ca2 || 0) + Number(draft.ca3 || row.ca3 || 0) + Number(draft.examScore || 0);
                return (
                  <tr key={row.studentId}>
                    <td><strong>{row.studentName}</strong></td>
                    <td><NumberInput value={draft.ca1 || ""} max={settings.ca1Max || 10} disabled={locked} onChange={(value) => setDraft(row.studentId, "ca1", value)} /></td>
                    <td>
                      <NumberInput value={ca2Auto ? scoreValue(row.ca2) : (draft.ca2 || "")} max={settings.ca2Max || 10} disabled={locked || ca2Auto} onChange={(value) => setDraft(row.studentId, "ca2", value)} />
                      {ca2Auto ? <small>First term carried</small> : null}
                    </td>
                    <td>
                      <NumberInput value={ca3Auto ? scoreValue(row.ca3) : (draft.ca3 || "")} max={settings.ca3Max || 10} disabled={locked || ca3Auto} onChange={(value) => setDraft(row.studentId, "ca3", value)} />
                      {currentTermIndex === 2 ? <small>First term carried</small> : null}
                      {currentTermIndex === 3 ? <small>Second term carried</small> : null}
                    </td>
                    <td><NumberInput value={draft.examScore || ""} max={settings.examMax || 70} disabled={locked} onChange={(value) => setDraft(row.studentId, "examScore", value)} /></td>
                    <td><strong>{formatScore(row.totalScore || total)}</strong></td>
                    <td>{row.grade || "-"}</td>
                    <td><input value={draft.teacherRemark || ""} disabled={locked} onChange={(e) => setDraft(row.studentId, "teacherRemark", e.target.value)} /></td>
                    <td><span className={`admin-status-pill ${statusClass(row.approvalStatus)}`}>{row.approvalStatus || "DRAFT"}</span></td>
                  </tr>
                );
              })}
              {(entry.rows || []).length === 0 ? <tr><td colSpan={9}>No students found for this class.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      {canReview ? (
        <section className="admin-card">
          <div className="admin-section-head">
            <div>
              <h2>Review Submitted Scores</h2>
              <p>Academic officers approve, reject, and lock submitted CA records. Super Admin can unlock approved rows.</p>
            </div>
            {canAdmin ? <button type="button" onClick={publishResults} disabled={loading}>Publish Report Cards</button> : null}
          </div>
          <label className="admin-field"><span>Correction / approval note</span><input value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Optional note for approval, rejection, or unlock" /></label>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Class</th>
                  <th>Subject</th>
                  <th>Term</th>
                  <th>Total</th>
                  <th>CA / Exam</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {submitted.slice(0, 80).map((row) => (
                  <tr key={row.id}>
                    <td>{row.studentName}</td>
                    <td>{row.className}</td>
                    <td>{row.subject}</td>
                    <td>{row.sessionName || row.academicSession} / {row.termName || row.term}</td>
                    <td><strong>{formatScore(row.totalScore)}</strong> {row.grade}</td>
                    <td>CA1 {formatScore(row.ca1)} | CA2 {formatScore(row.ca2)} | CA3 {formatScore(row.ca3)} | Exam {formatScore(row.examScore)}</td>
                    <td><span className={`admin-status-pill ${statusClass(row.approvalStatus)}`}>{row.approvalStatus}</span></td>
                    <td className="admin-row-actions">
                      <button type="button" onClick={() => reviewRecord(row, "approve")}>Approve</button>
                      <button type="button" className="danger" onClick={() => reviewRecord(row, "reject")}>Reject</button>
                      {canAdmin ? <button type="button" className="secondary" onClick={() => reviewRecord(row, "unlock")}>Unlock</button> : null}
                    </td>
                  </tr>
                ))}
                {submitted.length === 0 ? <tr><td colSpan={8}>No submitted CA scores awaiting review.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {canAdmin ? (
        <section className="admin-card">
          <div className="admin-section-head">
            <div>
              <h2>CA Configuration</h2>
              <p>Configure default or class-level score weights and grading scale used by report cards.</p>
            </div>
          </div>
          <div className="admin-filter-grid">
            <label><span>Class override</span><select value={settingsForm.classId} onChange={(e) => setSettingsForm((prev) => ({ ...prev, classId: e.target.value }))}><option value="">Default / class level</option>{(meta.classes || []).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
            <label><span>Class level</span><input value={settingsForm.classLevel} onChange={(e) => setSettingsForm((prev) => ({ ...prev, classLevel: e.target.value }))} /></label>
            <label><span>CA1 Max</span><input type="number" value={settingsForm.ca1Max} onChange={(e) => setSettingsForm((prev) => ({ ...prev, ca1Max: e.target.value }))} /></label>
            <label><span>CA2 Max</span><input type="number" value={settingsForm.ca2Max} onChange={(e) => setSettingsForm((prev) => ({ ...prev, ca2Max: e.target.value }))} /></label>
            <label><span>CA3 Max</span><input type="number" value={settingsForm.ca3Max} onChange={(e) => setSettingsForm((prev) => ({ ...prev, ca3Max: e.target.value }))} /></label>
            <label><span>Exam Max</span><input type="number" value={settingsForm.examMax} onChange={(e) => setSettingsForm((prev) => ({ ...prev, examMax: e.target.value }))} /></label>
            <label><span>Total Max</span><input type="number" value={settingsForm.totalMax} onChange={(e) => setSettingsForm((prev) => ({ ...prev, totalMax: e.target.value }))} /></label>
          </div>
          <div className="admin-row-actions">
            <button type="button" onClick={saveSettings}>Save Score Settings</button>
          </div>

          <h3>Grading Scale</h3>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Grade</th><th>Min</th><th>Max</th><th>Remark</th></tr></thead>
              <tbody>
                {scaleRows.map((row, index) => (
                  <tr key={row.id || index}>
                    <td><input value={row.grade || ""} onChange={(e) => setScaleRows((prev) => prev.map((item, idx) => idx === index ? { ...item, grade: e.target.value } : item))} /></td>
                    <td><input type="number" value={row.minScore ?? ""} onChange={(e) => setScaleRows((prev) => prev.map((item, idx) => idx === index ? { ...item, minScore: Number(e.target.value) } : item))} /></td>
                    <td><input type="number" value={row.maxScore ?? ""} onChange={(e) => setScaleRows((prev) => prev.map((item, idx) => idx === index ? { ...item, maxScore: Number(e.target.value) } : item))} /></td>
                    <td><input value={row.remark || ""} onChange={(e) => setScaleRows((prev) => prev.map((item, idx) => idx === index ? { ...item, remark: e.target.value } : item))} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="admin-row-actions">
            <button type="button" onClick={() => setScaleRows((prev) => [...prev, { grade: "", minScore: 0, maxScore: 0, remark: "" }])}>Add Grade Row</button>
            <button type="button" onClick={saveScales}>Save Grading Scale</button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
