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

  return (
    <div style={{ padding: 20, background: "#f4f7fb", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", display: "grid", gap: 12 }}>
        <div>
          <h2 style={{ marginBottom: 6 }}>Annual Promotion Desk</h2>
          <p style={{ color: "#4a627e", marginTop: 0 }}>Review class progression rules, annual summaries, overrides, and final promotion decisions for Angel Montessori pupils.</p>
          {loading ? <p>Loading promotion records...</p> : null}
          {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
          {message ? <p style={{ color: "#166534" }}>{message}</p> : null}
        </div>

        <div style={grid}>
          <div style={card}><strong>Policies Active</strong><div>{totals.policiesActive || 0}</div></div>
          <div style={card}><strong>Classes Ready</strong><div>{totals.classesReadyForPromotion || 0}</div></div>
          <div style={card}><strong>Pending Review</strong><div>{totals.studentsPendingReview || 0}</div></div>
          <div style={card}><strong>Promoted</strong><div>{totals.promoted || 0}</div></div>
          <div style={card}><strong>Probation</strong><div>{totals.probation || 0}</div></div>
          <div style={card}><strong>Repeated</strong><div>{totals.repeated || 0}</div></div>
          <div style={card}><strong>Graduated</strong><div>{totals.graduated || 0}</div></div>
          <div style={card}><strong>Not Eligible</strong><div>{totals.notEligible || 0}</div></div>
        </div>

        <div style={{ ...card, display: "grid", gap: 10 }}>
          <h3 style={{ margin: 0 }}>Promotion Policy Setup</h3>
          <div style={grid}>
            <input placeholder="Policy Name" value={policyForm.policyName} onChange={(e) => setPolicyForm((p) => ({ ...p, policyName: e.target.value }))} />
            <input placeholder="Section" value={policyForm.section} onChange={(e) => setPolicyForm((p) => ({ ...p, section: e.target.value }))} />
            <select value={policyForm.classId} onChange={(e) => setPolicyForm((p) => ({ ...p, classId: e.target.value }))}><option value="">All Classes</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <select value={policyForm.sessionId} onChange={(e) => setPolicyForm((p) => ({ ...p, sessionId: e.target.value }))}><option value="">All Sessions</option>{sessions.map((s) => <option key={s.id} value={s.id}>{s.sessionName}</option>)}</select>
            <input type="number" placeholder="Min Average" value={policyForm.minAverage} onChange={(e) => setPolicyForm((p) => ({ ...p, minAverage: e.target.value }))} />
            <input type="number" placeholder="Min Passed Subjects" value={policyForm.minSubjectPassCount} onChange={(e) => setPolicyForm((p) => ({ ...p, minSubjectPassCount: e.target.value }))} />
            <input type="number" placeholder="Probation Min Average" value={policyForm.probationMinAverage} onChange={(e) => setPolicyForm((p) => ({ ...p, probationMinAverage: e.target.value }))} />
            <input type="number" placeholder="Min Attendance %" value={policyForm.minAttendancePercentage} onChange={(e) => setPolicyForm((p) => ({ ...p, minAttendancePercentage: e.target.value }))} />
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}><input type="checkbox" checked={policyForm.requireEnglishPass} onChange={(e) => setPolicyForm((p) => ({ ...p, requireEnglishPass: e.target.checked }))} />Require English Pass</label>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}><input type="checkbox" checked={policyForm.requireMathPass} onChange={(e) => setPolicyForm((p) => ({ ...p, requireMathPass: e.target.checked }))} />Require Mathematics Pass</label>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}><input type="checkbox" checked={policyForm.allowProbation} onChange={(e) => setPolicyForm((p) => ({ ...p, allowProbation: e.target.checked }))} />Allow Probation</label>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}><input type="checkbox" checked={policyForm.attendanceRequired} onChange={(e) => setPolicyForm((p) => ({ ...p, attendanceRequired: e.target.checked }))} />Attendance Required</label>
          </div>
          <button onClick={createPolicy}>Create Policy</button>

          <div style={grid}>
            <select value={ruleForm.policyId} onChange={(e) => setRuleForm((p) => ({ ...p, policyId: e.target.value }))}><option value="">Select Policy</option>{policies.map((p) => <option key={p.id} value={p.id}>{p.policyName}</option>)}</select>
            <input placeholder="Subject Name" value={ruleForm.subjectName} onChange={(e) => setRuleForm((p) => ({ ...p, subjectName: e.target.value }))} />
            <input type="number" placeholder="Minimum Score" value={ruleForm.minimumScore} onChange={(e) => setRuleForm((p) => ({ ...p, minimumScore: e.target.value }))} />
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}><input type="checkbox" checked={ruleForm.isCompulsoryPass} onChange={(e) => setRuleForm((p) => ({ ...p, isCompulsoryPass: e.target.checked }))} />Compulsory Pass</label>
            <button onClick={saveRule}>Add Subject Rule</button>
          </div>
        </div>

        <div style={{ ...card, display: "grid", gap: 10 }}>
          <h3 style={{ margin: 0 }}>Class Progression Map</h3>
          <div style={grid}>
            <select value={progressionForm.fromClassId} onChange={(e) => setProgressionForm((p) => ({ ...p, fromClassId: e.target.value }))}><option value="">From Class</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <select value={progressionForm.toClassId} onChange={(e) => setProgressionForm((p) => ({ ...p, toClassId: e.target.value }))} disabled={progressionForm.progressionType === "terminal"}><option value="">To Class</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <select value={progressionForm.progressionType} onChange={(e) => setProgressionForm((p) => ({ ...p, progressionType: e.target.value }))}><option value="normal">normal</option><option value="transition">transition</option><option value="terminal">terminal</option></select>
            <button onClick={saveProgression}>Save Progression</button>
          </div>
        </div>

        <div style={{ ...card, display: "grid", gap: 10 }}>
          <h3 style={{ margin: 0 }}>Annual Summary + Batch Processing</h3>
          <div style={grid}>
            <select value={annualForm.classId} onChange={(e) => setAnnualForm((p) => ({ ...p, classId: e.target.value }))}><option value="">Class</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <select value={annualForm.sessionId} onChange={(e) => setAnnualForm((p) => ({ ...p, sessionId: e.target.value }))}><option value="">Session</option>{sessions.map((s) => <option key={s.id} value={s.id}>{s.sessionName}</option>)}</select>
            <button onClick={generateAnnual}>Generate Annual Summaries</button>
            <button onClick={runBulk}>Run Bulk Promotion (All Classes)</button>
          </div>

          <div style={grid}>
            <select value={batchForm.classId} onChange={(e) => setBatchForm((p) => ({ ...p, classId: e.target.value }))}><option value="">Class</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <select value={batchForm.sessionId} onChange={(e) => setBatchForm((p) => ({ ...p, sessionId: e.target.value }))}><option value="">Session</option>{sessions.map((s) => <option key={s.id} value={s.id}>{s.sessionName}</option>)}</select>
            <select value={batchForm.promotionPolicyId} onChange={(e) => setBatchForm((p) => ({ ...p, promotionPolicyId: e.target.value }))}><option value="">Policy (Auto if empty)</option>{policies.map((p) => <option key={p.id} value={p.id}>{p.policyName}</option>)}</select>
            <input placeholder="Batch Title (Optional)" value={batchForm.title} onChange={(e) => setBatchForm((p) => ({ ...p, title: e.target.value }))} />
            <button onClick={processBatch}>Process Promotion Batch</button>
          </div>
        </div>

        <div style={{ ...card, display: "grid", gap: 10 }}>
          <h3 style={{ margin: 0 }}>Decisions Review</h3>
          <div style={grid}>
            <select value={decisionFilter.classId} onChange={(e) => setDecisionFilter((p) => ({ ...p, classId: e.target.value }))}><option value="">All Classes</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <select value={decisionFilter.sessionId} onChange={(e) => setDecisionFilter((p) => ({ ...p, sessionId: e.target.value }))}><option value="">All Sessions</option>{sessions.map((s) => <option key={s.id} value={s.id}>{s.sessionName}</option>)}</select>
            <select value={decisionFilter.decisionStatus} onChange={(e) => setDecisionFilter((p) => ({ ...p, decisionStatus: e.target.value }))}><option value="">All Statuses</option>{statuses.map((s) => <option key={s} value={s}>{s}</option>)}</select>
            <button onClick={() => loadAll(decisionFilter)}>Apply Filters</button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1350 }}>
              <thead>
                <tr>{["Student", "Class", "Session", "Average", "Decision", "Reason", "Next Class", "Override"].map((h) => <th key={h} style={{ border: "1px solid #e2e8f0", padding: 8, textAlign: "left", background: "#f8fafc" }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {decisions.map((row) => {
                  const draft = overrideDraft[row.id] || {};
                  return (
                    <tr key={row.id}>
                      <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{row.studentName || row.studentUserId}</td>
                      <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{row.currentClassName}</td>
                      <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{row.sessionName}</td>
                      <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{row.annualAverage}</td>
                      <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{row.decisionStatus}</td>
                      <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{row.decisionReason}</td>
                      <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{row.nextClassName || "-"}</td>
                      <td style={{ border: "1px solid #e2e8f0", padding: 8, minWidth: 300 }}>
                        <div style={{ display: "grid", gap: 6 }}>
                          <select value={draft.decisionStatus || row.decisionStatus || ""} onChange={(e) => setOverrideDraft((p) => ({ ...p, [row.id]: { ...p[row.id], decisionStatus: e.target.value } }))}>
                            <option value="">Decision</option>{statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <select value={draft.nextClassId || row.nextClassId || ""} onChange={(e) => setOverrideDraft((p) => ({ ...p, [row.id]: { ...p[row.id], nextClassId: e.target.value } }))}>
                            <option value="">Next Class (optional)</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                          <input placeholder="Override reason" value={draft.overrideReason || ""} onChange={(e) => setOverrideDraft((p) => ({ ...p, [row.id]: { ...p[row.id], overrideReason: e.target.value } }))} />
                          <button onClick={() => applyOverride(row.id)}>Apply Override</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ ...card, display: "grid", gap: 10 }}>
          <h3 style={{ margin: 0 }}>Promotion Batches & Finalization</h3>
          <div style={grid}>
            <select value={selectedBatchId} onChange={(e) => setSelectedBatchId(e.target.value)}><option value="">Select Batch</option>{batches.map((b) => <option key={b.id} value={b.id}>{b.title} ({b.status})</option>)}</select>
            <input placeholder="Next Session Name (optional, e.g. 2026/2027)" value={finalizeForm.nextSessionName} onChange={(e) => setFinalizeForm((p) => ({ ...p, nextSessionName: e.target.value }))} />
            <button onClick={finalizeBatch}>Finalize Selected Batch</button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead>
                <tr>{["Title", "Class", "Session", "Status", "Processed At"].map((h) => <th key={h} style={{ border: "1px solid #e2e8f0", padding: 8, textAlign: "left", background: "#f8fafc" }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id} style={{ background: selectedBatchId === b.id ? "#f0f9ff" : "transparent" }}>
                    <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{b.title}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{classes.find((c) => String(c.id) === String(b.classId))?.name || b.classId}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{sessions.find((s) => String(s.id) === String(b.sessionId))?.sessionName || b.sessionId}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{b.status}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{b.processedAt || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedBatchId ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
                <thead>
                  <tr>{["Student", "Decision", "Reason", "Next Class", "Item Status"].map((h) => <th key={h} style={{ border: "1px solid #e2e8f0", padding: 8, textAlign: "left", background: "#f8fafc" }}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {batchItems.map((item) => (
                    <tr key={item.id}>
                      <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{item.studentName || item.studentUserId}</td>
                      <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{item.decision?.decisionStatus || "-"}</td>
                      <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{item.decision?.decisionReason || "-"}</td>
                      <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{item.decision?.nextClassName || "-"}</td>
                      <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{item.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        <div style={{ ...card, display: "grid", gap: 10 }}>
          <h3 style={{ margin: 0 }}>Annual Summaries (Current Filter)</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1000 }}>
              <thead>
                <tr>{["Student", "Class", "Session", "Subjects", "Passed", "Annual Avg", "Grade", "Attendance %"].map((h) => <th key={h} style={{ border: "1px solid #e2e8f0", padding: 8, textAlign: "left", background: "#f8fafc" }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {annualSummaries.map((row) => (
                  <tr key={row.id}>
                    <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{row.studentName || row.studentUserId}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{row.className}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{row.sessionName}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{row.totalSubjects}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{row.subjectsPassed}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{row.annualAverage}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{row.overallGrade}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{row.attendancePercentage ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

