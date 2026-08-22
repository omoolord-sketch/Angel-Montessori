import { useEffect, useMemo, useState } from "react";
import {
  createPromotionPolicy,
  finalizePromotionBatch,
  generatePromotionAnnualSummaries,
  getPromotionAnnualSummaries,
  getPromotionBatchItems,
  getPromotionBatches,
  getPromotionDashboard,
  getPromotionDecisions,
  getPromotionMetadata,
  getPromotionPolicies,
  overridePromotionDecision,
  processPromotionBatch,
  promoteStudents,
  savePromotionPolicySubjectRules,
  savePromotionProgressionMap,
} from "../api/services";
import "./PortalAdminModule.css";

const card = { border: "1px solid #d9e4f0", borderRadius: 10, padding: 12, background: "#fff" };
const grid = { display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" };

const DEFAULT_POLICY = {
  policyName: "",
  section: "Basic School",
  classId: "",
  sessionId: "",
  minAverage: "50",
  minSubjectPassCount: "5",
  requireEnglishPass: true,
  requireMathPass: true,
  allowProbation: true,
  probationMinAverage: "45",
  attendanceRequired: false,
  minAttendancePercentage: "0",
  autoPromote: true,
  isTerminalClass: false,
  isActive: true,
};

const promotionTone = (status) => {
  const key = String(status || "").toLowerCase();
  if (["promoted", "graduated", "approved", "finalized"].some((word) => key.includes(word))) return "success";
  if (["repeated", "not_eligible", "not eligible", "failed"].some((word) => key.includes(word))) return "danger";
  if (["probation", "pending", "review"].some((word) => key.includes(word))) return "warning";
  return "neutral";
};

export default function PromotionDashboard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [meta, setMeta] = useState({ classes: [], sessions: [], terms: [], policies: [], progressionMap: [], statuses: [] });
  const [dashboard, setDashboard] = useState({ totals: {}, recentActivity: [] });
  const [policies, setPolicies] = useState([]);
  const [annualSummaries, setAnnualSummaries] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [batches, setBatches] = useState([]);
  const [batchItems, setBatchItems] = useState([]);

  const [policyForm, setPolicyForm] = useState(DEFAULT_POLICY);
  const [ruleForm, setRuleForm] = useState({ policyId: "", subjectName: "", minimumScore: "50", isCompulsoryPass: true });
  const [progressionForm, setProgressionForm] = useState({ fromClassId: "", toClassId: "", progressionType: "normal" });
  const [annualForm, setAnnualForm] = useState({ classId: "", sessionId: "" });
  const [batchForm, setBatchForm] = useState({ classId: "", sessionId: "", promotionPolicyId: "", title: "" });
  const [decisionFilter, setDecisionFilter] = useState({ classId: "", sessionId: "", decisionStatus: "" });
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [overrideDraft, setOverrideDraft] = useState({});
  const [finalizeForm, setFinalizeForm] = useState({ batchId: "", nextSessionName: "" });

  const classes = Array.isArray(meta.classes) ? meta.classes : [];
  const sessions = Array.isArray(meta.sessions) ? meta.sessions : [];

  const activeSessionId = useMemo(() => {
    return sessions.find((s) => s.isActive)?.id || sessions[0]?.id || "";
  }, [sessions]);

  const loadAll = async (filters = decisionFilter) => {
    setLoading(true);
    setError("");

    const [metaRes, dashRes, polRes, annualRes, decisionRes, batchRes] = await Promise.allSettled([
      getPromotionMetadata(),
      getPromotionDashboard({ sessionId: filters.sessionId || "" }),
      getPromotionPolicies(),
      getPromotionAnnualSummaries({ classId: filters.classId || "", sessionId: filters.sessionId || "" }),
      getPromotionDecisions(filters),
      getPromotionBatches({ classId: filters.classId || "", sessionId: filters.sessionId || "" }),
    ]);

    if (metaRes.status === "fulfilled") {
      const payload = metaRes.value?.data || {};
      setMeta(payload);
      const fallbackSession = payload.sessions?.find((s) => s.isActive)?.id || payload.sessions?.[0]?.id || "";
      const fallbackClass = payload.classes?.[0]?.id || "";

      setPolicyForm((prev) => ({ ...prev, sessionId: prev.sessionId || fallbackSession, classId: prev.classId || "" }));
      setAnnualForm((prev) => ({ classId: prev.classId || fallbackClass, sessionId: prev.sessionId || fallbackSession }));
      setBatchForm((prev) => ({
        ...prev,
        classId: prev.classId || fallbackClass,
        sessionId: prev.sessionId || fallbackSession,
        promotionPolicyId: prev.promotionPolicyId || payload.policies?.[0]?.id || "",
      }));
      setRuleForm((prev) => ({ ...prev, policyId: prev.policyId || payload.policies?.[0]?.id || "" }));
      setProgressionForm((prev) => ({ ...prev, fromClassId: prev.fromClassId || fallbackClass }));
      setDecisionFilter((prev) => ({ classId: prev.classId, sessionId: prev.sessionId || fallbackSession, decisionStatus: prev.decisionStatus }));
    }

    if (dashRes.status === "fulfilled") setDashboard(dashRes.value?.data || { totals: {}, recentActivity: [] });
    if (polRes.status === "fulfilled") setPolicies(Array.isArray(polRes.value?.data) ? polRes.value.data : []);
    if (annualRes.status === "fulfilled") setAnnualSummaries(Array.isArray(annualRes.value?.data) ? annualRes.value.data : []);
    if (decisionRes.status === "fulfilled") setDecisions(Array.isArray(decisionRes.value?.data) ? decisionRes.value.data : []);
    if (batchRes.status === "fulfilled") setBatches(Array.isArray(batchRes.value?.data) ? batchRes.value.data : []);

    const firstErr = [metaRes, dashRes, polRes, annualRes, decisionRes, batchRes]
      .filter((x) => x.status === "rejected")
      .map((x) => x.reason?.response?.data?.message || x.reason?.message)
      .find(Boolean);

    if (firstErr) setError(firstErr);
    setLoading(false);
  };

  const loadBatchItems = async (batchId) => {
    if (!batchId) {
      setBatchItems([]);
      return;
    }
    try {
      const res = await getPromotionBatchItems(batchId);
      setBatchItems(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load batch items");
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    loadBatchItems(selectedBatchId);
    setFinalizeForm((prev) => ({ ...prev, batchId: selectedBatchId || prev.batchId }));
  }, [selectedBatchId]);

  const createPolicy = async () => {
    try {
      setError("");
      await createPromotionPolicy({
        ...policyForm,
        minAverage: Number(policyForm.minAverage || 50),
        minSubjectPassCount: Number(policyForm.minSubjectPassCount || 0),
        probationMinAverage: Number(policyForm.probationMinAverage || 45),
        minAttendancePercentage: Number(policyForm.minAttendancePercentage || 0),
      });
      setPolicyForm(DEFAULT_POLICY);
      setMessage("Promotion policy created.");
      await loadAll();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to create policy");
    }
  };

  const saveRule = async () => {
    if (!ruleForm.policyId || !ruleForm.subjectName) {
      setError("Select policy and enter subject name.");
      return;
    }

    try {
      const existing = policies.find((p) => String(p.id) === String(ruleForm.policyId))?.subjectRules || [];
      const rows = [
        ...existing.map((r) => ({
          subjectName: r.subjectName,
          subjectId: r.subjectId,
          isCompulsoryPass: Boolean(r.isCompulsoryPass),
          minimumScore: Number(r.minimumScore || 50),
        })),
        {
          subjectName: ruleForm.subjectName,
          isCompulsoryPass: Boolean(ruleForm.isCompulsoryPass),
          minimumScore: Number(ruleForm.minimumScore || 50),
        },
      ];

      await savePromotionPolicySubjectRules(ruleForm.policyId, rows);
      setRuleForm((prev) => ({ ...prev, subjectName: "", minimumScore: "50", isCompulsoryPass: true }));
      setMessage("Policy subject rule saved.");
      await loadAll();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to save subject rule");
    }
  };

  const saveProgression = async () => {
    if (!progressionForm.fromClassId) {
      setError("Select source class.");
      return;
    }

    if (progressionForm.progressionType !== "terminal" && !progressionForm.toClassId) {
      setError("Select destination class.");
      return;
    }

    try {
      await savePromotionProgressionMap(progressionForm);
      setMessage("Class progression mapping saved.");
      await loadAll();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to save progression map");
    }
  };

  const generateAnnual = async () => {
    if (!annualForm.classId || !annualForm.sessionId) {
      setError("Select class and session.");
      return;
    }

    try {
      const res = await generatePromotionAnnualSummaries(annualForm);
      setMessage(`Annual summaries generated: ${res?.data?.generated || 0}`);
      await loadAll({ ...decisionFilter, classId: annualForm.classId, sessionId: annualForm.sessionId });
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to generate annual summaries");
    }
  };

  const processBatch = async () => {
    if (!batchForm.classId || !batchForm.sessionId) {
      setError("Select class and session.");
      return;
    }

    try {
      const res = await processPromotionBatch({ ...batchForm, generateAnnualSummaries: true });
      const createdBatch = res?.data?.batch || null;
      setMessage("Promotion batch processed.");
      await loadAll({ ...decisionFilter, classId: batchForm.classId, sessionId: batchForm.sessionId });
      if (createdBatch?.id) setSelectedBatchId(String(createdBatch.id));
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to process batch");
    }
  };

  const runBulk = async () => {
    try {
      const res = await promoteStudents({ sessionId: decisionFilter.sessionId || activeSessionId, generateAnnualSummaries: true });
      setMessage(res?.data?.message || "Promotion run completed.");
      await loadAll();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to run bulk promotion");
    }
  };

  const applyOverride = async (decisionId) => {
    const row = overrideDraft[decisionId] || {};
    if (!row.decisionStatus || !row.overrideReason) {
      setError("Override requires status and reason.");
      return;
    }

    try {
      await overridePromotionDecision(decisionId, row);
      setMessage("Promotion decision overridden.");
      await loadAll(decisionFilter);
      if (selectedBatchId) await loadBatchItems(selectedBatchId);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to override decision");
    }
  };

  const finalizeBatch = async () => {
    if (!finalizeForm.batchId) {
      setError("Select a batch to finalize.");
      return;
    }

    try {
      const res = await finalizePromotionBatch(finalizeForm.batchId, { nextSessionName: finalizeForm.nextSessionName });
      setMessage(`Batch finalized. Students updated: ${res?.data?.finalized || 0}`);
      await loadAll(decisionFilter);
      await loadBatchItems(finalizeForm.batchId);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to finalize batch");
    }
  };

  const totals = dashboard?.totals || {};
  const statuses = Array.isArray(meta.statuses) ? meta.statuses : [];
  const recentActivity = Array.isArray(dashboard?.recentActivity) ? dashboard.recentActivity : [];

  return (
    <div className="admin-module-page">
      <div className="admin-module-shell">
        <section className="admin-module-hero">
          <div>
            <span className="admin-module-kicker">Student Progression</span>
            <h1>Annual Promotion Desk</h1>
            <p>Review class progression rules, annual summaries, overrides, and final promotion decisions for Angel Montessori pupils.</p>
          </div>
          <div className="admin-module-actions">
            <button type="button" className="secondary" onClick={() => loadAll(decisionFilter)} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh Records"}
            </button>
            <button type="button" onClick={runBulk}>Run Bulk Promotion</button>
          </div>
        </section>

        {error ? <div className="admin-alert error">{error}</div> : null}
        {message ? <div className="admin-alert success">{message}</div> : null}
        {loading ? <div className="admin-alert">Loading promotion records...</div> : null}

        <section className="admin-stat-grid">
          <article className="admin-stat-card"><span>Policies Active</span><strong>{totals.policiesActive || 0}</strong><small>Promotion rules available</small></article>
          <article className="admin-stat-card"><span>Classes Ready</span><strong>{totals.classesReadyForPromotion || 0}</strong><small>Configured for progression</small></article>
          <article className="admin-stat-card"><span>Pending Review</span><strong>{totals.studentsPendingReview || 0}</strong><small>Awaiting decision checks</small></article>
          <article className="admin-stat-card"><span>Promoted</span><strong>{totals.promoted || 0}</strong><small>Students moving forward</small></article>
          <article className="admin-stat-card"><span>Probation</span><strong>{totals.probation || 0}</strong><small>Requires monitoring</small></article>
          <article className="admin-stat-card"><span>Repeated</span><strong>{totals.repeated || 0}</strong><small>Class repeat decisions</small></article>
          <article className="admin-stat-card"><span>Graduated</span><strong>{totals.graduated || 0}</strong><small>Terminal class completion</small></article>
          <article className="admin-stat-card"><span>Not Eligible</span><strong>{totals.notEligible || 0}</strong><small>Promotion blocked</small></article>
        </section>

        <section className="admin-two-column">
          <article className="admin-card">
            <div className="admin-card-header">
              <div>
                <span className="admin-section-tag">Policy Setup</span>
                <h2>Create Promotion Policy</h2>
                <p>Define class or section-wide requirements for automatic promotion decisions.</p>
              </div>
            </div>
            <div className="admin-form-grid">
              <label className="admin-field"><span>Policy name</span><input placeholder="Policy Name" value={policyForm.policyName} onChange={(e) => setPolicyForm((p) => ({ ...p, policyName: e.target.value }))} /></label>
              <label className="admin-field"><span>Section</span><input placeholder="Section" value={policyForm.section} onChange={(e) => setPolicyForm((p) => ({ ...p, section: e.target.value }))} /></label>
              <label className="admin-field"><span>Class scope</span><select value={policyForm.classId} onChange={(e) => setPolicyForm((p) => ({ ...p, classId: e.target.value }))}><option value="">All Classes</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
              <label className="admin-field"><span>Session scope</span><select value={policyForm.sessionId} onChange={(e) => setPolicyForm((p) => ({ ...p, sessionId: e.target.value }))}><option value="">All Sessions</option>{sessions.map((s) => <option key={s.id} value={s.id}>{s.sessionName}</option>)}</select></label>
              <label className="admin-field"><span>Minimum average</span><input type="number" value={policyForm.minAverage} onChange={(e) => setPolicyForm((p) => ({ ...p, minAverage: e.target.value }))} /></label>
              <label className="admin-field"><span>Minimum passed subjects</span><input type="number" value={policyForm.minSubjectPassCount} onChange={(e) => setPolicyForm((p) => ({ ...p, minSubjectPassCount: e.target.value }))} /></label>
              <label className="admin-field"><span>Probation minimum average</span><input type="number" value={policyForm.probationMinAverage} onChange={(e) => setPolicyForm((p) => ({ ...p, probationMinAverage: e.target.value }))} /></label>
              <label className="admin-field"><span>Minimum attendance %</span><input type="number" value={policyForm.minAttendancePercentage} onChange={(e) => setPolicyForm((p) => ({ ...p, minAttendancePercentage: e.target.value }))} /></label>
            </div>
            <div className="admin-check-grid">
              <label className="admin-check-field"><input type="checkbox" checked={policyForm.requireEnglishPass} onChange={(e) => setPolicyForm((p) => ({ ...p, requireEnglishPass: e.target.checked }))} />Require English pass</label>
              <label className="admin-check-field"><input type="checkbox" checked={policyForm.requireMathPass} onChange={(e) => setPolicyForm((p) => ({ ...p, requireMathPass: e.target.checked }))} />Require Mathematics pass</label>
              <label className="admin-check-field"><input type="checkbox" checked={policyForm.allowProbation} onChange={(e) => setPolicyForm((p) => ({ ...p, allowProbation: e.target.checked }))} />Allow probation</label>
              <label className="admin-check-field"><input type="checkbox" checked={policyForm.attendanceRequired} onChange={(e) => setPolicyForm((p) => ({ ...p, attendanceRequired: e.target.checked }))} />Attendance required</label>
            </div>
            <div className="admin-form-actions">
              <button type="button" onClick={createPolicy}>Create Policy</button>
            </div>
          </article>

          <article className="admin-card">
            <div className="admin-card-header">
              <div>
                <span className="admin-section-tag">Subject Rules</span>
                <h2>Compulsory Subject Rule</h2>
                <p>Add subject-specific pass requirements to an existing promotion policy.</p>
              </div>
            </div>
            <div className="admin-form-grid compact">
              <label className="admin-field"><span>Policy</span><select value={ruleForm.policyId} onChange={(e) => setRuleForm((p) => ({ ...p, policyId: e.target.value }))}><option value="">Select Policy</option>{policies.map((p) => <option key={p.id} value={p.id}>{p.policyName}</option>)}</select></label>
              <label className="admin-field"><span>Subject name</span><input placeholder="Subject Name" value={ruleForm.subjectName} onChange={(e) => setRuleForm((p) => ({ ...p, subjectName: e.target.value }))} /></label>
              <label className="admin-field"><span>Minimum score</span><input type="number" value={ruleForm.minimumScore} onChange={(e) => setRuleForm((p) => ({ ...p, minimumScore: e.target.value }))} /></label>
              <label className="admin-check-field"><input type="checkbox" checked={ruleForm.isCompulsoryPass} onChange={(e) => setRuleForm((p) => ({ ...p, isCompulsoryPass: e.target.checked }))} />Compulsory pass</label>
            </div>
            <div className="admin-form-actions">
              <button type="button" onClick={saveRule}>Add Subject Rule</button>
            </div>
            <div className="admin-divider" />
            <div className="admin-card-header">
              <div>
                <span className="admin-section-tag">Progression Map</span>
                <h2>Class Movement Path</h2>
                <p>Map each class to the next class or mark it as a terminal class.</p>
              </div>
            </div>
            <div className="admin-form-grid compact">
              <label className="admin-field"><span>From class</span><select value={progressionForm.fromClassId} onChange={(e) => setProgressionForm((p) => ({ ...p, fromClassId: e.target.value }))}><option value="">From Class</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
              <label className="admin-field"><span>To class</span><select value={progressionForm.toClassId} onChange={(e) => setProgressionForm((p) => ({ ...p, toClassId: e.target.value }))} disabled={progressionForm.progressionType === "terminal"}><option value="">To Class</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
              <label className="admin-field"><span>Progression type</span><select value={progressionForm.progressionType} onChange={(e) => setProgressionForm((p) => ({ ...p, progressionType: e.target.value }))}><option value="normal">Normal</option><option value="transition">Transition</option><option value="terminal">Terminal</option></select></label>
            </div>
            <div className="admin-form-actions">
              <button type="button" onClick={saveProgression}>Save Progression</button>
            </div>
          </article>
        </section>

        <section className="admin-two-column">
          <article className="admin-card">
            <div className="admin-card-header">
              <div>
                <span className="admin-section-tag">Annual Summary</span>
                <h2>Generate Promotion Evidence</h2>
                <p>Build annual performance summaries before processing promotion batches.</p>
              </div>
            </div>
            <div className="admin-form-grid compact">
              <label className="admin-field"><span>Class</span><select value={annualForm.classId} onChange={(e) => setAnnualForm((p) => ({ ...p, classId: e.target.value }))}><option value="">Class</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
              <label className="admin-field"><span>Session</span><select value={annualForm.sessionId} onChange={(e) => setAnnualForm((p) => ({ ...p, sessionId: e.target.value }))}><option value="">Session</option>{sessions.map((s) => <option key={s.id} value={s.id}>{s.sessionName}</option>)}</select></label>
            </div>
            <div className="admin-form-actions">
              <button type="button" onClick={generateAnnual}>Generate Annual Summaries</button>
            </div>
          </article>

          <article className="admin-card">
            <div className="admin-card-header">
              <div>
                <span className="admin-section-tag">Batch Processing</span>
                <h2>Process Promotion Batch</h2>
                <p>Create a review batch for a class using the configured promotion policy.</p>
              </div>
            </div>
            <div className="admin-form-grid compact">
              <label className="admin-field"><span>Class</span><select value={batchForm.classId} onChange={(e) => setBatchForm((p) => ({ ...p, classId: e.target.value }))}><option value="">Class</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
              <label className="admin-field"><span>Session</span><select value={batchForm.sessionId} onChange={(e) => setBatchForm((p) => ({ ...p, sessionId: e.target.value }))}><option value="">Session</option>{sessions.map((s) => <option key={s.id} value={s.id}>{s.sessionName}</option>)}</select></label>
              <label className="admin-field"><span>Policy</span><select value={batchForm.promotionPolicyId} onChange={(e) => setBatchForm((p) => ({ ...p, promotionPolicyId: e.target.value }))}><option value="">Policy (Auto if empty)</option>{policies.map((p) => <option key={p.id} value={p.id}>{p.policyName}</option>)}</select></label>
              <label className="admin-field"><span>Batch title</span><input placeholder="Optional" value={batchForm.title} onChange={(e) => setBatchForm((p) => ({ ...p, title: e.target.value }))} /></label>
            </div>
            <div className="admin-form-actions">
              <button type="button" onClick={processBatch}>Process Promotion Batch</button>
            </div>
          </article>
        </section>

        <section className="admin-card">
          <div className="admin-card-header">
            <div>
              <span className="admin-section-tag">Decision Review</span>
              <h2>Promotion Decisions</h2>
              <p>Filter generated decisions, review reasons, and apply approved overrides where needed.</p>
            </div>
          </div>
          <div className="admin-toolbar">
            <label className="admin-field"><span>Class</span><select value={decisionFilter.classId} onChange={(e) => setDecisionFilter((p) => ({ ...p, classId: e.target.value }))}><option value="">All Classes</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label className="admin-field"><span>Session</span><select value={decisionFilter.sessionId} onChange={(e) => setDecisionFilter((p) => ({ ...p, sessionId: e.target.value }))}><option value="">All Sessions</option>{sessions.map((s) => <option key={s.id} value={s.id}>{s.sessionName}</option>)}</select></label>
            <label className="admin-field"><span>Status</span><select value={decisionFilter.decisionStatus} onChange={(e) => setDecisionFilter((p) => ({ ...p, decisionStatus: e.target.value }))}><option value="">All Statuses</option>{statuses.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
            <button type="button" onClick={() => loadAll(decisionFilter)}>Apply Filters</button>
          </div>
          <div className="admin-table-scroll">
            <table className="admin-table wide-table">
              <thead>
                <tr>{["Student", "Class", "Session", "Average", "Decision", "Reason", "Next Class", "Override"].map((h) => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {decisions.length ? decisions.map((row) => {
                  const draft = overrideDraft[row.id] || {};
                  return (
                    <tr key={row.id}>
                      <td><strong>{row.studentName || row.studentUserId}</strong></td>
                      <td>{row.currentClassName}</td>
                      <td>{row.sessionName}</td>
                      <td className="number-cell">{row.annualAverage}</td>
                      <td><span className={`admin-status-pill ${promotionTone(row.decisionStatus)}`}>{row.decisionStatus}</span></td>
                      <td>{row.decisionReason}</td>
                      <td>{row.nextClassName || "-"}</td>
                      <td>
                        <div className="admin-comment-stack">
                          <select value={draft.decisionStatus || row.decisionStatus || ""} onChange={(e) => setOverrideDraft((p) => ({ ...p, [row.id]: { ...p[row.id], decisionStatus: e.target.value } }))}>
                            <option value="">Decision</option>{statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <select value={draft.nextClassId || row.nextClassId || ""} onChange={(e) => setOverrideDraft((p) => ({ ...p, [row.id]: { ...p[row.id], nextClassId: e.target.value } }))}>
                            <option value="">Next Class (optional)</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                          <input placeholder="Override reason" value={draft.overrideReason || ""} onChange={(e) => setOverrideDraft((p) => ({ ...p, [row.id]: { ...p[row.id], overrideReason: e.target.value } }))} />
                          <button type="button" className="admin-table-action" onClick={() => applyOverride(row.id)}>Apply Override</button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan="8"><div className="admin-empty-inline">No promotion decisions match the current filters.</div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-two-column">
          <article className="admin-card">
            <div className="admin-card-header">
              <div>
                <span className="admin-section-tag">Batches</span>
                <h2>Promotion Batches</h2>
                <p>Select a processed batch to inspect its student-level decisions.</p>
              </div>
            </div>
            <div className="admin-form-grid compact">
              <label className="admin-field"><span>Batch</span><select value={selectedBatchId} onChange={(e) => setSelectedBatchId(e.target.value)}><option value="">Select Batch</option>{batches.map((b) => <option key={b.id} value={b.id}>{b.title} ({b.status})</option>)}</select></label>
              <label className="admin-field"><span>Next session name</span><input placeholder="Optional, e.g. 2026/2027" value={finalizeForm.nextSessionName} onChange={(e) => setFinalizeForm((p) => ({ ...p, nextSessionName: e.target.value }))} /></label>
            </div>
            <div className="admin-form-actions">
              <button type="button" onClick={finalizeBatch}>Finalize Selected Batch</button>
            </div>
            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>{["Title", "Class", "Session", "Status", "Processed"].map((h) => <th key={h}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {batches.length ? batches.map((b) => (
                    <tr key={b.id}>
                      <td><strong>{b.title}</strong></td>
                      <td>{classes.find((c) => String(c.id) === String(b.classId))?.name || b.classId}</td>
                      <td>{sessions.find((s) => String(s.id) === String(b.sessionId))?.sessionName || b.sessionId}</td>
                      <td><span className={`admin-status-pill ${promotionTone(b.status)}`}>{b.status}</span></td>
                      <td>{b.processedAt || "-"}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan="5"><div className="admin-empty-inline">No promotion batches have been processed yet.</div></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <article className="admin-card">
            <div className="admin-card-header">
              <div>
                <span className="admin-section-tag">Batch Items</span>
                <h2>Selected Batch Details</h2>
                <p>Student decisions inside the selected promotion batch.</p>
              </div>
            </div>
            {selectedBatchId ? (
              <div className="admin-table-scroll">
                <table className="admin-table">
                  <thead>
                    <tr>{["Student", "Decision", "Reason", "Next Class", "Item Status"].map((h) => <th key={h}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {batchItems.length ? batchItems.map((item) => (
                      <tr key={item.id}>
                        <td><strong>{item.studentName || item.studentUserId}</strong></td>
                        <td><span className={`admin-status-pill ${promotionTone(item.decision?.decisionStatus)}`}>{item.decision?.decisionStatus || "-"}</span></td>
                        <td>{item.decision?.decisionReason || "-"}</td>
                        <td>{item.decision?.nextClassName || "-"}</td>
                        <td>{item.status}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan="5"><div className="admin-empty-inline">No students found inside this batch.</div></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="admin-empty-state">Select a promotion batch to review student decisions.</div>
            )}
          </article>
        </section>

        <section className="admin-card">
          <div className="admin-card-header">
            <div>
              <span className="admin-section-tag">Annual Records</span>
              <h2>Annual Summaries</h2>
              <p>Generated yearly promotion evidence for the current filter.</p>
            </div>
            <div className="admin-mini-stat"><span>Records</span><strong>{annualSummaries.length}</strong></div>
          </div>
          <div className="admin-table-scroll">
            <table className="admin-table wide-table">
              <thead>
                <tr>{["Student", "Class", "Session", "Subjects", "Passed", "Annual Avg", "Grade", "Attendance %"].map((h) => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {annualSummaries.length ? annualSummaries.map((row) => (
                  <tr key={row.id}>
                    <td><strong>{row.studentName || row.studentUserId}</strong></td>
                    <td>{row.className}</td>
                    <td>{row.sessionName}</td>
                    <td className="number-cell">{row.totalSubjects}</td>
                    <td className="number-cell">{row.subjectsPassed}</td>
                    <td className="number-cell">{row.annualAverage}</td>
                    <td><span className="admin-grade-chip">{row.overallGrade}</span></td>
                    <td className="number-cell">{row.attendancePercentage ?? "-"}</td>
                  </tr>
                )) : (
                  <tr><td colSpan="8"><div className="admin-empty-inline">No annual summaries have been generated for this filter yet.</div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {recentActivity.length ? (
          <section className="admin-card">
            <div className="admin-card-header">
              <div>
                <span className="admin-section-tag">Activity</span>
                <h2>Recent Promotion Activity</h2>
              </div>
            </div>
            <div className="admin-result-list">
              {recentActivity.map((item, index) => (
                <div className="admin-result-row" key={item.id || index}>
                  <div>
                    <strong>{item.title || item.action || "Promotion activity"}</strong>
                    <span>{item.message || item.description || item.createdAt || ""}</span>
                  </div>
                  <span className="admin-status-pill neutral">{item.status || "Recorded"}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

