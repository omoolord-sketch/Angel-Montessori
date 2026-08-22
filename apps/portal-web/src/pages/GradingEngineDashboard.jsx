
import { useEffect, useMemo, useState } from "react";
import {
  approveGradingSheet,
  computeGradingSheet,
  computeGradingTerm,
  createGradingOffering,
  createGradingPolicy,
  createGradingScoreSheet,
  getGradingComputedResults,
  getGradingDashboard,
  getGradingMetadata,
  getGradingPolicies,
  getGradingScoreSheetDetail,
  getGradingScoreSheets,
  getGradingTermSummaries,
  lockGradingSheet,
  publishGradingTerm,
  saveGradingComponents,
  saveGradingScales,
  saveGradingScores,
  submitGradingSheet,
  updateGradingSummaryComments,
} from "../api/services";
import { useAuth } from "../auth/AuthContext";
import { isTeacherRole } from "../utils/roleHelpers";
import "./PortalAdminModule.css";

const card = { border: "1px solid #d9e4f0", borderRadius: 10, padding: 12, background: "#fff" };
const grid = { display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" };

function termSessionOptions(meta) {
  const sessions = Array.isArray(meta?.sessions) ? meta.sessions : [];
  const terms = Array.isArray(meta?.terms) ? meta.terms : [];
  return { sessions, terms };
}

export default function GradingEngineDashboard() {
  const { user } = useAuth();
  const role = String(user?.role || "").toUpperCase();
  const isAdmin = role === "ADMIN";
  const canManageScores = isAdmin || isTeacherRole(role);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [dashboard, setDashboard] = useState({ totals: {}, recentActivity: [] });
  const [meta, setMeta] = useState({ classes: [], subjects: [], sessions: [], terms: [], teachers: [], students: [], offerings: [] });
  const [policies, setPolicies] = useState([]);
  const [sheets, setSheets] = useState([]);
  const [computedResults, setComputedResults] = useState([]);
  const [termSummaries, setTermSummaries] = useState([]);

  const [policyForm, setPolicyForm] = useState({ policyName: "", section: "Basic School", classId: "", totalScore: "100", gradeMode: "NUMERIC", isActive: true });
  const [componentForm, setComponentForm] = useState({ policyId: "", componentName: "", componentCode: "", maxScore: "", isExamComponent: false });
  const [scaleForm, setScaleForm] = useState({ policyId: "", gradeLabel: "", minScore: "", maxScore: "", gradePoint: "", remark: "" });

  const [offeringForm, setOfferingForm] = useState({ classId: "", subject: "", teacherUserId: "", sessionId: "", termId: "", gradingPolicyId: "" });
  const [sheetForm, setSheetForm] = useState({ classSubjectOfferingId: "", title: "" });

  const [selectedSheetId, setSelectedSheetId] = useState("");
  const [selectedSheetDetail, setSelectedSheetDetail] = useState(null);
  const [scoreDrafts, setScoreDrafts] = useState({});

  const [termComputeForm, setTermComputeForm] = useState({ classId: "", sessionId: "", termId: "" });

  const activePolicyId = useMemo(() => {
    if (componentForm.policyId) return componentForm.policyId;
    if (scaleForm.policyId) return scaleForm.policyId;
    return policies[0]?.id || "";
  }, [componentForm.policyId, scaleForm.policyId, policies]);

  const loadAll = async () => {
    try {
      setLoading(true);
      setError("");
      const [dashRes, metaRes, policyRes, sheetsRes, computedRes, summaryRes] = await Promise.allSettled([
        getGradingDashboard(),
        getGradingMetadata(),
        getGradingPolicies(),
        getGradingScoreSheets(),
        getGradingComputedResults(),
        getGradingTermSummaries(),
      ]);

      if (dashRes.status === "fulfilled") setDashboard(dashRes.value?.data || { totals: {}, recentActivity: [] });
      if (metaRes.status === "fulfilled") {
        const payload = metaRes.value?.data || {};
        setMeta(payload);
        setOfferingForm((prev) => ({
          ...prev,
          sessionId: prev.sessionId || payload.sessions?.[0]?.id || "",
          termId: prev.termId || payload.terms?.[0]?.id || "",
          classId: prev.classId || payload.classes?.[0]?.id || "",
        }));
        setTermComputeForm((prev) => ({
          ...prev,
          sessionId: prev.sessionId || payload.sessions?.[0]?.id || "",
          termId: prev.termId || payload.terms?.[0]?.id || "",
          classId: prev.classId || payload.classes?.[0]?.id || "",
        }));
      }
      if (policyRes.status === "fulfilled") {
        const rows = Array.isArray(policyRes.value?.data) ? policyRes.value.data : [];
        setPolicies(rows);
        setComponentForm((prev) => ({ ...prev, policyId: prev.policyId || rows[0]?.id || "" }));
        setScaleForm((prev) => ({ ...prev, policyId: prev.policyId || rows[0]?.id || "" }));
        setOfferingForm((prev) => ({ ...prev, gradingPolicyId: prev.gradingPolicyId || rows[0]?.id || "" }));
      }
      if (sheetsRes.status === "fulfilled") setSheets(Array.isArray(sheetsRes.value?.data) ? sheetsRes.value.data : []);
      if (computedRes.status === "fulfilled") setComputedResults(Array.isArray(computedRes.value?.data) ? computedRes.value.data : []);
      if (summaryRes.status === "fulfilled") setTermSummaries(Array.isArray(summaryRes.value?.data) ? summaryRes.value.data : []);

      const firstError = [dashRes, metaRes, policyRes, sheetsRes, computedRes, summaryRes]
        .filter((x) => x.status === "rejected")
        .map((x) => x.reason?.response?.data?.message || x.reason?.message)
        .find(Boolean);
      if (firstError) setError(firstError);
    } finally {
      setLoading(false);
    }
  };

  const openSheet = async (sheetId) => {
    if (!sheetId) return;
    try {
      setSelectedSheetId(sheetId);
      const res = await getGradingScoreSheetDetail(sheetId);
      const detail = res?.data || null;
      setSelectedSheetDetail(detail);

      const nextDrafts = {};
      const students = detail?.students || [];
      const components = detail?.components || [];
      students.forEach((student) => {
        const sid = String(student.id);
        nextDrafts[sid] = {};
        components.forEach((component) => {
          const cid = String(component.id);
          nextDrafts[sid][cid] = String(detail?.scoreMap?.[sid]?.[cid] ?? "");
        });
      });
      setScoreDrafts(nextDrafts);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load score sheet detail");
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const selectedPolicy = useMemo(
    () => policies.find((item) => String(item.id) === String(activePolicyId)) || null,
    [policies, activePolicyId]
  );

  const savePolicy = async () => {
    try {
      setError("");
      await createGradingPolicy({ ...policyForm, totalScore: Number(policyForm.totalScore || 100) });
      setPolicyForm({ policyName: "", section: "Basic School", classId: "", totalScore: "100", gradeMode: "NUMERIC", isActive: true });
      setMessage("Grading policy created.");
      await loadAll();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to create policy");
    }
  };

  const addComponent = async () => {
    try {
      setError("");
      await saveGradingComponents(componentForm.policyId, [{
        componentName: componentForm.componentName,
        componentCode: componentForm.componentCode,
        maxScore: Number(componentForm.maxScore || 0),
        isExamComponent: componentForm.isExamComponent,
      }]);
      setComponentForm((prev) => ({ ...prev, componentName: "", componentCode: "", maxScore: "", isExamComponent: false }));
      setMessage("Assessment component saved.");
      await loadAll();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to save component");
    }
  };

  const addScale = async () => {
    try {
      setError("");
      const existing = selectedPolicy?.gradeScales || [];
      const nextRows = [
        ...existing.map((item) => ({
          gradeLabel: item.gradeLabel,
          minScore: item.minScore,
          maxScore: item.maxScore,
          gradePoint: item.gradePoint,
          remark: item.remark,
        })),
        {
          gradeLabel: scaleForm.gradeLabel,
          minScore: Number(scaleForm.minScore || 0),
          maxScore: Number(scaleForm.maxScore || 0),
          gradePoint: Number(scaleForm.gradePoint || 0),
          remark: scaleForm.remark,
        },
      ];
      await saveGradingScales(scaleForm.policyId, nextRows);
      setScaleForm((prev) => ({ ...prev, gradeLabel: "", minScore: "", maxScore: "", gradePoint: "", remark: "" }));
      setMessage("Grade scale updated.");
      await loadAll();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to update grade scales");
    }
  };

  const offerings = useMemo(() => (Array.isArray(meta?.offerings) ? meta.offerings : []), [meta?.offerings]);
  const classes = Array.isArray(meta?.classes) ? meta.classes : [];
  const subjects = Array.isArray(meta?.subjects) ? meta.subjects : [];
  const sessions = Array.isArray(meta?.sessions) ? meta.sessions : [];
  const terms = Array.isArray(meta?.terms) ? meta.terms : [];
  const teachers = Array.isArray(meta?.teachers) ? meta.teachers : [];

  const addOffering = async () => {
    if (!offeringForm.classId || !offeringForm.subject || !offeringForm.teacherUserId) {
      setError("Class, subject, and teacher are required");
      return;
    }
    try {
      setError("");
      await createGradingOffering({ ...offeringForm });
      setMessage("Class-subject offering created.");
      await loadAll();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to create offering");
    }
  };

  const addSheet = async () => {
    if (!sheetForm.classSubjectOfferingId) {
      setError("Select an offering");
      return;
    }
    try {
      setError("");
      const res = await createGradingScoreSheet({
        classSubjectOfferingId: sheetForm.classSubjectOfferingId,
        title: sheetForm.title,
      });
      setMessage("Score sheet is ready.");
      await loadAll();
      const createdId = String(res?.data?.id || "");
      if (createdId) await openSheet(createdId);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to create score sheet");
    }
  };

  const updateDraftScore = (studentId, componentId, value) => {
    setScoreDrafts((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev?.[studentId] || {}),
        [componentId]: value,
      },
    }));
  };

  const saveSheetScores = async () => {
    if (!selectedSheetId || !selectedSheetDetail) return;

    const rows = [];
    const students = selectedSheetDetail.students || [];
    const components = selectedSheetDetail.components || [];

    students.forEach((student) => {
      const sid = String(student.id);
      components.forEach((component) => {
        const cid = String(component.id);
        const raw = String(scoreDrafts?.[sid]?.[cid] ?? "").trim();
        if (raw === "") return;
        rows.push({
          studentUserId: sid,
          assessmentComponentId: cid,
          score: Number(raw),
        });
      });
    });

    if (rows.length === 0) {
      setError("Enter at least one score");
      return;
    }

    try {
      setError("");
      await saveGradingScores(selectedSheetId, rows);
      setMessage("Scores saved.");
      await openSheet(selectedSheetId);
      await loadAll();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to save scores");
    }
  };

  const runSheetAction = async (fn, successMessage) => {
    if (!selectedSheetId) return;
    try {
      setError("");
      await fn(selectedSheetId);
      setMessage(successMessage);
      await openSheet(selectedSheetId);
      await loadAll();
    } catch (e) {
      setError(e?.response?.data?.message || "Action failed");
    }
  };

  const runTermCompute = async () => {
    if (!termComputeForm.classId || !termComputeForm.sessionId || !termComputeForm.termId) {
      setError("Class, session, and term are required");
      return;
    }

    try {
      setError("");
      await computeGradingTerm(termComputeForm);
      setMessage("Term summary computed.");
      await loadAll();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to compute term summary");
    }
  };

  const runTermPublish = async () => {
    if (!termComputeForm.classId || !termComputeForm.sessionId || !termComputeForm.termId) {
      setError("Class, session, and term are required");
      return;
    }

    try {
      setError("");
      await publishGradingTerm(termComputeForm);
      setMessage("Term result published.");
      await loadAll();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to publish term result");
    }
  };

  const saveSummaryComment = async (summaryId, classTeacherComment, principalComment) => {
    try {
      setError("");
      await updateGradingSummaryComments(summaryId, { classTeacherComment, principalComment });
      setMessage("Comments updated.");
      await loadAll();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to update summary comments");
    }
  };

  const totals = dashboard?.totals || {};

  return (
    <div className="admin-module-page grading-module">
      <div className="admin-module-shell">
        <section className="admin-module-hero">
          <div>
            <div className="admin-module-kicker">Assessment and Publishing</div>
            <h1>Result Grading Desk</h1>
            <p>
              Manage score sheets, grading rules, computed subject results, and term publishing for Angel Montessori report records.
            </p>
          </div>
          <div className="admin-module-actions">
            <button type="button" onClick={loadAll} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh Data"}
            </button>
          </div>
        </section>

        {loading ? <div className="admin-alert">Loading grading records...</div> : null}
        {error ? <div className="admin-alert error">{error}</div> : null}
        {message ? <div className="admin-alert success">{message}</div> : null}

        <section className="admin-stat-grid" aria-label="Grading overview">
          <article className="admin-stat-card"><span>Active Policies</span><strong>{totals.activePolicies || 0}</strong><small>Available grading rules</small></article>
          <article className="admin-stat-card"><span>Draft Sheets</span><strong>{totals.scoreSheetsDraft || 0}</strong><small>Open for score entry</small></article>
          <article className="admin-stat-card"><span>Submitted</span><strong>{totals.submittedForReview || 0}</strong><small>Awaiting review</small></article>
          <article className="admin-stat-card"><span>Approved / Locked</span><strong>{totals.approvedAndLocked || 0}</strong><small>Protected result sheets</small></article>
          <article className="admin-stat-card"><span>Computed Results</span><strong>{totals.computedResults || 0}</strong><small>Subject totals generated</small></article>
          <article className="admin-stat-card"><span>Term Summaries</span><strong>{totals.termSummaries || 0}</strong><small>Ready for publishing</small></article>
        </section>

        {isAdmin ? (
          <section className="admin-card">
            <div className="admin-card-header">
              <div>
                <span className="admin-section-tag">Rules</span>
                <h2>Grading Policy</h2>
              </div>
              <p>Create grading policies, assessment components, and grade scales used across classes and terms.</p>
            </div>

            <div className="admin-form-grid">
              <label className="admin-field">
                Policy Name
                <input placeholder="Policy Name" value={policyForm.policyName} onChange={(e) => setPolicyForm((prev) => ({ ...prev, policyName: e.target.value }))} />
              </label>
              <label className="admin-field">
                Section
                <input placeholder="Section" value={policyForm.section} onChange={(e) => setPolicyForm((prev) => ({ ...prev, section: e.target.value }))} />
              </label>
              <label className="admin-field">
                Class Scope
                <select value={policyForm.classId} onChange={(e) => setPolicyForm((prev) => ({ ...prev, classId: e.target.value }))}>
                  <option value="">All Classes</option>
                  {classes.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                </select>
              </label>
              <label className="admin-field">
                Total Score
                <input type="number" placeholder="100" value={policyForm.totalScore} onChange={(e) => setPolicyForm((prev) => ({ ...prev, totalScore: e.target.value }))} />
              </label>
              <label className="admin-field">
                Grade Mode
                <select value={policyForm.gradeMode} onChange={(e) => setPolicyForm((prev) => ({ ...prev, gradeMode: e.target.value }))}>
                  <option value="NUMERIC">NUMERIC</option>
                  <option value="DESCRIPTIVE">DESCRIPTIVE</option>
                </select>
              </label>
              <label className="admin-check-field">
                <input type="checkbox" checked={policyForm.isActive} onChange={(e) => setPolicyForm((prev) => ({ ...prev, isActive: e.target.checked }))} />
                Active policy
              </label>
            </div>

            <div className="admin-form-actions">
              <button type="button" onClick={savePolicy}>Create Policy</button>
            </div>

            <div className="admin-divider" />

            <div className="admin-form-grid">
              <label className="admin-field">
                Policy
                <select value={componentForm.policyId} onChange={(e) => setComponentForm((prev) => ({ ...prev, policyId: e.target.value }))}>
                  <option value="">Policy</option>
                  {policies.map((row) => <option key={row.id} value={row.id}>{row.policyName}</option>)}
                </select>
              </label>
              <label className="admin-field">
                Component Name
                <input placeholder="Component Name" value={componentForm.componentName} onChange={(e) => setComponentForm((prev) => ({ ...prev, componentName: e.target.value }))} />
              </label>
              <label className="admin-field">
                Code
                <input placeholder="Code" value={componentForm.componentCode} onChange={(e) => setComponentForm((prev) => ({ ...prev, componentCode: e.target.value }))} />
              </label>
              <label className="admin-field">
                Max Score
                <input type="number" placeholder="Max Score" value={componentForm.maxScore} onChange={(e) => setComponentForm((prev) => ({ ...prev, maxScore: e.target.value }))} />
              </label>
              <label className="admin-check-field">
                <input type="checkbox" checked={componentForm.isExamComponent} onChange={(e) => setComponentForm((prev) => ({ ...prev, isExamComponent: e.target.checked }))} />
                Exam component
              </label>
            </div>
            <div className="admin-form-actions">
              <button type="button" onClick={addComponent}>Add Component</button>
            </div>

            <div className="admin-divider" />

            <div className="admin-form-grid">
              <label className="admin-field">
                Policy
                <select value={scaleForm.policyId} onChange={(e) => setScaleForm((prev) => ({ ...prev, policyId: e.target.value }))}>
                  <option value="">Policy</option>
                  {policies.map((row) => <option key={row.id} value={row.id}>{row.policyName}</option>)}
                </select>
              </label>
              <label className="admin-field">
                Grade Label
                <input placeholder="A" value={scaleForm.gradeLabel} onChange={(e) => setScaleForm((prev) => ({ ...prev, gradeLabel: e.target.value }))} />
              </label>
              <label className="admin-field">
                Minimum
                <input type="number" placeholder="Min" value={scaleForm.minScore} onChange={(e) => setScaleForm((prev) => ({ ...prev, minScore: e.target.value }))} />
              </label>
              <label className="admin-field">
                Maximum
                <input type="number" placeholder="Max" value={scaleForm.maxScore} onChange={(e) => setScaleForm((prev) => ({ ...prev, maxScore: e.target.value }))} />
              </label>
              <label className="admin-field">
                Grade Point
                <input type="number" placeholder="Grade Point" value={scaleForm.gradePoint} onChange={(e) => setScaleForm((prev) => ({ ...prev, gradePoint: e.target.value }))} />
              </label>
              <label className="admin-field">
                Remark
                <input placeholder="Remark" value={scaleForm.remark} onChange={(e) => setScaleForm((prev) => ({ ...prev, remark: e.target.value }))} />
              </label>
            </div>
            <div className="admin-form-actions">
              <button type="button" onClick={addScale}>Save Grade Scale</button>
            </div>
          </section>
        ) : null}

        {isAdmin ? (
          <section className="admin-card">
            <div className="admin-card-header">
              <div>
                <span className="admin-section-tag">Teaching Load</span>
                <h2>Class Subject Offerings</h2>
              </div>
              <p>Connect class, subject, teacher, session, term, and grading policy before score sheets are created.</p>
            </div>
            <div className="admin-form-grid">
              <label className="admin-field">
                Class
                <select value={offeringForm.classId} onChange={(e) => setOfferingForm((prev) => ({ ...prev, classId: e.target.value }))}>
                  <option value="">Class</option>
                  {classes.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                </select>
              </label>
              <label className="admin-field">
                Subject
                <select value={offeringForm.subject} onChange={(e) => setOfferingForm((prev) => ({ ...prev, subject: e.target.value }))}>
                  <option value="">Subject</option>
                  {subjects.map((row) => <option key={row.id || row.name || row.subjectName} value={row.name || row.subjectName}>{row.name || row.subjectName}</option>)}
                </select>
              </label>
              <label className="admin-field">
                Teacher
                <select value={offeringForm.teacherUserId} onChange={(e) => setOfferingForm((prev) => ({ ...prev, teacherUserId: e.target.value }))}>
                  <option value="">Teacher</option>
                  {teachers.map((row) => <option key={row.id} value={row.id}>{row.name || row.username}</option>)}
                </select>
              </label>
              <label className="admin-field">
                Session
                <select value={offeringForm.sessionId} onChange={(e) => setOfferingForm((prev) => ({ ...prev, sessionId: e.target.value }))}>
                  <option value="">Session</option>
                  {sessions.map((row) => <option key={row.id} value={row.id}>{row.sessionName}</option>)}
                </select>
              </label>
              <label className="admin-field">
                Term
                <select value={offeringForm.termId} onChange={(e) => setOfferingForm((prev) => ({ ...prev, termId: e.target.value }))}>
                  <option value="">Term</option>
                  {(offeringForm.sessionId ? terms.filter((row) => String(row.sessionId) === String(offeringForm.sessionId)) : terms)
                    .map((row) => <option key={row.id} value={row.id}>{row.termName}</option>)}
                </select>
              </label>
              <label className="admin-field">
                Policy
                <select value={offeringForm.gradingPolicyId} onChange={(e) => setOfferingForm((prev) => ({ ...prev, gradingPolicyId: e.target.value }))}>
                  <option value="">Policy</option>
                  {policies.map((row) => <option key={row.id} value={row.id}>{row.policyName}</option>)}
                </select>
              </label>
            </div>
            <div className="admin-form-actions">
              <button type="button" onClick={addOffering}>Create Offering</button>
            </div>
          </section>
        ) : null}

        <section className="admin-card">
          <div className="admin-card-header">
            <div>
              <span className="admin-section-tag">Score Entry</span>
              <h2>Score Sheets</h2>
            </div>
            <p>Create, reopen, submit, approve, lock, and compute score sheets for class-subject offerings.</p>
          </div>

          {canManageScores ? (
            <div className="admin-form-grid">
              <label className="admin-field">
                Offering
                <select value={sheetForm.classSubjectOfferingId} onChange={(e) => setSheetForm((prev) => ({ ...prev, classSubjectOfferingId: e.target.value }))}>
                  <option value="">Select Offering</option>
                  {offerings.map((row) => <option key={row.id} value={row.id}>{row.className} - {row.subject} - {row.termName}</option>)}
                </select>
              </label>
              <label className="admin-field">
                Sheet Title
                <input placeholder="Optional Sheet Title" value={sheetForm.title} onChange={(e) => setSheetForm((prev) => ({ ...prev, title: e.target.value }))} />
              </label>
            </div>
          ) : null}

          {canManageScores ? (
            <div className="admin-form-actions">
              <button type="button" onClick={addSheet}>Create/Reopen Sheet</button>
            </div>
          ) : null}

          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>{["Title", "Class", "Subject", "Term", "Status", "Action"].map((h) => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {sheets.map((row) => (
                  <tr key={row.id}>
                    <td>{row.title}</td>
                    <td>{row.offering?.className || "-"}</td>
                    <td>{row.offering?.subject || "-"}</td>
                    <td>{row.offering?.termName || "-"}</td>
                    <td><span className="admin-status-pill neutral">{row.status}</span></td>
                    <td><button type="button" className="admin-table-action" onClick={() => openSheet(row.id)}>Open</button></td>
                  </tr>
                ))}
                {sheets.length === 0 ? <tr><td colSpan={6}>No score sheets found.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>

        {selectedSheetDetail ? (
          <section className="admin-card">
            <div className="admin-card-header">
              <div>
                <span className="admin-section-tag">Open Sheet</span>
                <h2>Score Entry: {selectedSheetDetail?.sheet?.title}</h2>
              </div>
              <p>Status: <span className="admin-status-pill neutral">{selectedSheetDetail?.sheet?.status || "DRAFT"}</span></p>
            </div>

            <div className="admin-table-scroll grading-score-table">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    {(selectedSheetDetail.components || []).map((component) => (
                      <th key={component.id}>{component.componentName} ({component.maxScore})</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(selectedSheetDetail.students || []).map((student) => (
                    <tr key={student.id}>
                      <td>{student.name}</td>
                      {(selectedSheetDetail.components || []).map((component) => (
                        <td key={component.id}>
                          <input
                            type="number"
                            min={0}
                            max={Number(component.maxScore || 0)}
                            value={scoreDrafts?.[String(student.id)]?.[String(component.id)] ?? ""}
                            onChange={(e) => updateDraftScore(String(student.id), String(component.id), e.target.value)}
                            disabled={String(selectedSheetDetail?.sheet?.status || "").toUpperCase() === "LOCKED"}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {canManageScores ? (
              <div className="admin-form-actions">
                <button type="button" onClick={saveSheetScores} disabled={String(selectedSheetDetail?.sheet?.status || "").toUpperCase() === "LOCKED"}>Save Scores</button>
                <button type="button" className="secondary" onClick={() => runSheetAction(submitGradingSheet, "Sheet submitted.")} disabled={String(selectedSheetDetail?.sheet?.status || "").toUpperCase() === "LOCKED"}>Submit Sheet</button>
                {isAdmin ? <button type="button" onClick={() => runSheetAction(approveGradingSheet, "Sheet approved.")}>Approve</button> : null}
                {isAdmin ? <button type="button" onClick={() => runSheetAction(lockGradingSheet, "Sheet locked.")}>Lock</button> : null}
                <button type="button" className="secondary" onClick={() => runSheetAction(computeGradingSheet, "Subject result computed.")}>Compute Subject</button>
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="admin-card">
          <div className="admin-card-header">
            <div>
              <span className="admin-section-tag">Term Control</span>
              <h2>Term Summary and Publish</h2>
            </div>
            <p>Compute term summaries after subject sheets are ready, then publish final results when approved.</p>
          </div>
          <div className="admin-form-grid">
            <label className="admin-field">
              Class
              <select value={termComputeForm.classId} onChange={(e) => setTermComputeForm((prev) => ({ ...prev, classId: e.target.value }))}>
                <option value="">Class</option>
                {classes.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
              </select>
            </label>
            <label className="admin-field">
              Session
              <select value={termComputeForm.sessionId} onChange={(e) => setTermComputeForm((prev) => ({ ...prev, sessionId: e.target.value }))}>
                <option value="">Session</option>
                {sessions.map((row) => <option key={row.id} value={row.id}>{row.sessionName}</option>)}
              </select>
            </label>
            <label className="admin-field">
              Term
              <select value={termComputeForm.termId} onChange={(e) => setTermComputeForm((prev) => ({ ...prev, termId: e.target.value }))}>
                <option value="">Term</option>
                {(termComputeForm.sessionId ? terms.filter((row) => String(row.sessionId) === String(termComputeForm.sessionId)) : terms)
                  .map((row) => <option key={row.id} value={row.id}>{row.termName}</option>)}
              </select>
            </label>
          </div>
          <div className="admin-form-actions">
            {isAdmin ? <button type="button" onClick={runTermCompute}>Compute Term Summary</button> : null}
            {isAdmin ? <button type="button" className="secondary" onClick={runTermPublish}>Publish Term Result</button> : null}
          </div>
        </section>

        <section className="admin-card">
          <div className="admin-card-header">
            <div>
              <span className="admin-section-tag">Published Records</span>
              <h2>Term Result Summaries</h2>
            </div>
            <p>Review term averages, positions, promotion status, and report comments.</p>
          </div>
          <div className="admin-table-scroll">
            <table className="admin-table wide-table">
              <thead>
                <tr>{["Student", "Class", "Session", "Term", "Subjects", "Average", "Grade", "Position", "Promotion", "Comments"].map((h) => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {termSummaries.map((row) => (
                  <tr key={row.id}>
                    <td>{row.studentName || row.studentUserId}</td>
                    <td>{row.className}</td>
                    <td>{row.sessionName}</td>
                    <td>{row.termName}</td>
                    <td className="number-cell">{row.totalSubjects}</td>
                    <td className="number-cell">{row.averageScore}</td>
                    <td><span className="admin-grade-chip">{row.overallGrade}</span></td>
                    <td className="number-cell">{row.overallPosition}</td>
                    <td><span className="admin-status-pill neutral">{row.promotionStatus}</span></td>
                    <td className="comment-cell">
                      {canManageScores ? (
                        <div className="admin-comment-stack">
                          <input
                            placeholder="Class Teacher Comment"
                            defaultValue={row.classTeacherComment || ""}
                            onBlur={(e) => saveSummaryComment(row.id, e.target.value, row.principalComment || "")}
                          />
                          <input
                            placeholder="Principal Comment"
                            defaultValue={row.principalComment || ""}
                            onBlur={(e) => saveSummaryComment(row.id, row.classTeacherComment || "", e.target.value)}
                          />
                        </div>
                      ) : (
                        <div>
                          <div>{row.classTeacherComment || "-"}</div>
                          <div>{row.principalComment || "-"}</div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {termSummaries.length === 0 ? <tr><td colSpan={10}>No term result summaries found.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-card">
          <div className="admin-card-header">
            <div>
              <span className="admin-section-tag">Subject Results</span>
              <h2>Computed Subject Results</h2>
            </div>
            <p>Computed CA, exam, total, grade, and remark records from submitted score sheets.</p>
          </div>
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>{["Student", "Class", "Subject", "CA", "Exam", "Total", "Grade", "Remark"].map((h) => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {computedResults.map((row) => (
                  <tr key={row.id}>
                    <td>{row.studentName || row.studentUserId}</td>
                    <td>{row.offering?.className || "-"}</td>
                    <td>{row.offering?.subject || "-"}</td>
                    <td className="number-cell">{row.caTotal}</td>
                    <td className="number-cell">{row.examTotal}</td>
                    <td className="number-cell">{row.totalScore}</td>
                    <td><span className="admin-grade-chip">{row.gradeLabel}</span></td>
                    <td>{row.remark}</td>
                  </tr>
                ))}
                {computedResults.length === 0 ? <tr><td colSpan={8}>No computed subject results found.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}


