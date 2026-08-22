
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
  const canManageScores = role === "ADMIN" || role === "TEACHER";

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
    <div style={{ padding: 20, background: "#f4f7fb", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", display: "grid", gap: 12 }}>
        <div>
          <h2 style={{ marginBottom: 6 }}>Result Grading Desk</h2>
          <p style={{ color: "#4a627e", marginTop: 0 }}>
            Manage score sheets, grading rules, computed subject results, and term publishing for Angel Montessori report records.
          </p>
          {loading ? <p>Loading grading records...</p> : null}
          {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
          {message ? <p style={{ color: "#166534" }}>{message}</p> : null}
        </div>

        <div style={grid}>
          <div style={card}><strong>Active Policies</strong><div>{totals.activePolicies || 0}</div></div>
          <div style={card}><strong>Draft Sheets</strong><div>{totals.scoreSheetsDraft || 0}</div></div>
          <div style={card}><strong>Submitted</strong><div>{totals.submittedForReview || 0}</div></div>
          <div style={card}><strong>Approved/Locked</strong><div>{totals.approvedAndLocked || 0}</div></div>
          <div style={card}><strong>Computed Results</strong><div>{totals.computedResults || 0}</div></div>
          <div style={card}><strong>Term Summaries</strong><div>{totals.termSummaries || 0}</div></div>
        </div>

        {isAdmin ? (
          <div style={{ ...card, display: "grid", gap: 10 }}>
            <h3 style={{ margin: 0 }}>Grading Policy</h3>
            <div style={grid}>
              <input placeholder="Policy Name" value={policyForm.policyName} onChange={(e) => setPolicyForm((prev) => ({ ...prev, policyName: e.target.value }))} />
              <input placeholder="Section" value={policyForm.section} onChange={(e) => setPolicyForm((prev) => ({ ...prev, section: e.target.value }))} />
              <select value={policyForm.classId} onChange={(e) => setPolicyForm((prev) => ({ ...prev, classId: e.target.value }))}>
                <option value="">All Classes</option>
                {classes.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
              </select>
              <input type="number" placeholder="Total Score" value={policyForm.totalScore} onChange={(e) => setPolicyForm((prev) => ({ ...prev, totalScore: e.target.value }))} />
              <select value={policyForm.gradeMode} onChange={(e) => setPolicyForm((prev) => ({ ...prev, gradeMode: e.target.value }))}>
                <option value="NUMERIC">NUMERIC</option>
                <option value="DESCRIPTIVE">DESCRIPTIVE</option>
              </select>
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input type="checkbox" checked={policyForm.isActive} onChange={(e) => setPolicyForm((prev) => ({ ...prev, isActive: e.target.checked }))} />
                Active
              </label>
            </div>
            <button onClick={savePolicy}>Create Policy</button>

            <div style={grid}>
              <select value={componentForm.policyId} onChange={(e) => setComponentForm((prev) => ({ ...prev, policyId: e.target.value }))}>
                <option value="">Policy</option>
                {policies.map((row) => <option key={row.id} value={row.id}>{row.policyName}</option>)}
              </select>
              <input placeholder="Component Name" value={componentForm.componentName} onChange={(e) => setComponentForm((prev) => ({ ...prev, componentName: e.target.value }))} />
              <input placeholder="Code" value={componentForm.componentCode} onChange={(e) => setComponentForm((prev) => ({ ...prev, componentCode: e.target.value }))} />
              <input type="number" placeholder="Max Score" value={componentForm.maxScore} onChange={(e) => setComponentForm((prev) => ({ ...prev, maxScore: e.target.value }))} />
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input type="checkbox" checked={componentForm.isExamComponent} onChange={(e) => setComponentForm((prev) => ({ ...prev, isExamComponent: e.target.checked }))} />
                Exam Component
              </label>
              <button onClick={addComponent}>Add Component</button>
            </div>

            <div style={grid}>
              <select value={scaleForm.policyId} onChange={(e) => setScaleForm((prev) => ({ ...prev, policyId: e.target.value }))}>
                <option value="">Policy</option>
                {policies.map((row) => <option key={row.id} value={row.id}>{row.policyName}</option>)}
              </select>
              <input placeholder="Grade Label" value={scaleForm.gradeLabel} onChange={(e) => setScaleForm((prev) => ({ ...prev, gradeLabel: e.target.value }))} />
              <input type="number" placeholder="Min" value={scaleForm.minScore} onChange={(e) => setScaleForm((prev) => ({ ...prev, minScore: e.target.value }))} />
              <input type="number" placeholder="Max" value={scaleForm.maxScore} onChange={(e) => setScaleForm((prev) => ({ ...prev, maxScore: e.target.value }))} />
              <input type="number" placeholder="Grade Point" value={scaleForm.gradePoint} onChange={(e) => setScaleForm((prev) => ({ ...prev, gradePoint: e.target.value }))} />
              <input placeholder="Remark" value={scaleForm.remark} onChange={(e) => setScaleForm((prev) => ({ ...prev, remark: e.target.value }))} />
            </div>
            <button onClick={addScale}>Save Grade Scale</button>
          </div>
        ) : null}

        {isAdmin ? (
          <div style={{ ...card, display: "grid", gap: 10 }}>
            <h3 style={{ margin: 0 }}>Class Subject Offerings</h3>
            <div style={grid}>
              <select value={offeringForm.classId} onChange={(e) => setOfferingForm((prev) => ({ ...prev, classId: e.target.value }))}>
                <option value="">Class</option>
                {classes.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
              </select>
              <select value={offeringForm.subject} onChange={(e) => setOfferingForm((prev) => ({ ...prev, subject: e.target.value }))}>
                <option value="">Subject</option>
                {subjects.map((row) => <option key={row.id || row.name || row.subjectName} value={row.name || row.subjectName}>{row.name || row.subjectName}</option>)}
              </select>
              <select value={offeringForm.teacherUserId} onChange={(e) => setOfferingForm((prev) => ({ ...prev, teacherUserId: e.target.value }))}>
                <option value="">Teacher</option>
                {teachers.map((row) => <option key={row.id} value={row.id}>{row.name || row.username}</option>)}
              </select>
              <select value={offeringForm.sessionId} onChange={(e) => setOfferingForm((prev) => ({ ...prev, sessionId: e.target.value }))}>
                <option value="">Session</option>
                {sessions.map((row) => <option key={row.id} value={row.id}>{row.sessionName}</option>)}
              </select>
              <select value={offeringForm.termId} onChange={(e) => setOfferingForm((prev) => ({ ...prev, termId: e.target.value }))}>
                <option value="">Term</option>
                {(offeringForm.sessionId ? terms.filter((row) => String(row.sessionId) === String(offeringForm.sessionId)) : terms)
                  .map((row) => <option key={row.id} value={row.id}>{row.termName}</option>)}
              </select>
              <select value={offeringForm.gradingPolicyId} onChange={(e) => setOfferingForm((prev) => ({ ...prev, gradingPolicyId: e.target.value }))}>
                <option value="">Policy</option>
                {policies.map((row) => <option key={row.id} value={row.id}>{row.policyName}</option>)}
              </select>
            </div>
            <button onClick={addOffering}>Create Offering</button>
          </div>
        ) : null}

        <div style={{ ...card, display: "grid", gap: 10 }}>
          <h3 style={{ margin: 0 }}>Score Sheets</h3>
          {canManageScores ? (
            <div style={grid}>
              <select value={sheetForm.classSubjectOfferingId} onChange={(e) => setSheetForm((prev) => ({ ...prev, classSubjectOfferingId: e.target.value }))}>
                <option value="">Select Offering</option>
                {offerings.map((row) => <option key={row.id} value={row.id}>{row.className} - {row.subject} - {row.termName}</option>)}
              </select>
              <input placeholder="Optional Sheet Title" value={sheetForm.title} onChange={(e) => setSheetForm((prev) => ({ ...prev, title: e.target.value }))} />
              <button onClick={addSheet}>Create/Reopen Sheet</button>
            </div>
          ) : null}

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
              <thead>
                <tr>{["Title", "Class", "Subject", "Term", "Status", "Action"].map((h) => <th key={h} style={{ border: "1px solid #e2e8f0", padding: 8, textAlign: "left", background: "#f8fafc" }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {sheets.map((row) => (
                  <tr key={row.id}>
                    <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{row.title}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{row.offering?.className || "-"}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{row.offering?.subject || "-"}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{row.offering?.termName || "-"}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{row.status}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: 8 }}><button onClick={() => openSheet(row.id)}>Open</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {selectedSheetDetail ? (
          <div style={{ ...card, display: "grid", gap: 10 }}>
            <h3 style={{ margin: 0 }}>Score Entry: {selectedSheetDetail?.sheet?.title}</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100 }}>
                <thead>
                  <tr>
                    <th style={{ border: "1px solid #e2e8f0", padding: 8, textAlign: "left", background: "#f8fafc" }}>Student</th>
                    {(selectedSheetDetail.components || []).map((component) => (
                      <th key={component.id} style={{ border: "1px solid #e2e8f0", padding: 8, textAlign: "left", background: "#f8fafc" }}>
                        {component.componentName} ({component.maxScore})
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(selectedSheetDetail.students || []).map((student) => (
                    <tr key={student.id}>
                      <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{student.name}</td>
                      {(selectedSheetDetail.components || []).map((component) => (
                        <td key={component.id} style={{ border: "1px solid #e2e8f0", padding: 8 }}>
                          <input
                            type="number"
                            min={0}
                            max={Number(component.maxScore || 0)}
                            value={scoreDrafts?.[String(student.id)]?.[String(component.id)] ?? ""}
                            onChange={(e) => updateDraftScore(String(student.id), String(component.id), e.target.value)}
                            disabled={String(selectedSheetDetail?.sheet?.status || "").toUpperCase() === "LOCKED"}
                            style={{ width: 90 }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {canManageScores ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={saveSheetScores} disabled={String(selectedSheetDetail?.sheet?.status || "").toUpperCase() === "LOCKED"}>Save Scores</button>
                <button onClick={() => runSheetAction(submitGradingSheet, "Sheet submitted.")} disabled={String(selectedSheetDetail?.sheet?.status || "").toUpperCase() === "LOCKED"}>Submit Sheet</button>
                {isAdmin ? <button onClick={() => runSheetAction(approveGradingSheet, "Sheet approved.")}>Approve</button> : null}
                {isAdmin ? <button onClick={() => runSheetAction(lockGradingSheet, "Sheet locked.")}>Lock</button> : null}
                <button onClick={() => runSheetAction(computeGradingSheet, "Subject result computed.")}>Compute Subject</button>
              </div>
            ) : null}
          </div>
        ) : null}

        <div style={{ ...card, display: "grid", gap: 10 }}>
          <h3 style={{ margin: 0 }}>Term Summary and Publish</h3>
          <div style={grid}>
            <select value={termComputeForm.classId} onChange={(e) => setTermComputeForm((prev) => ({ ...prev, classId: e.target.value }))}>
              <option value="">Class</option>
              {classes.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
            <select value={termComputeForm.sessionId} onChange={(e) => setTermComputeForm((prev) => ({ ...prev, sessionId: e.target.value }))}>
              <option value="">Session</option>
              {sessions.map((row) => <option key={row.id} value={row.id}>{row.sessionName}</option>)}
            </select>
            <select value={termComputeForm.termId} onChange={(e) => setTermComputeForm((prev) => ({ ...prev, termId: e.target.value }))}>
              <option value="">Term</option>
              {(termComputeForm.sessionId ? terms.filter((row) => String(row.sessionId) === String(termComputeForm.sessionId)) : terms)
                .map((row) => <option key={row.id} value={row.id}>{row.termName}</option>)}
            </select>
            {isAdmin ? <button onClick={runTermCompute}>Compute Term Summary</button> : null}
            {isAdmin ? <button onClick={runTermPublish}>Publish Term Result</button> : null}
          </div>
        </div>

        <div style={{ ...card, display: "grid", gap: 10 }}>
          <h3 style={{ margin: 0 }}>Term Result Summaries</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1250 }}>
              <thead>
                <tr>{["Student", "Class", "Session", "Term", "Subjects", "Average", "Grade", "Position", "Promotion", "Comments"].map((h) => <th key={h} style={{ border: "1px solid #e2e8f0", padding: 8, textAlign: "left", background: "#f8fafc" }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {termSummaries.map((row) => (
                  <tr key={row.id}>
                    <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{row.studentName || row.studentUserId}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{row.className}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{row.sessionName}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{row.termName}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{row.totalSubjects}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{row.averageScore}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{row.overallGrade}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{row.overallPosition}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{row.promotionStatus}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: 8, minWidth: 320 }}>
                      {canManageScores ? (
                        <div style={{ display: "grid", gap: 6 }}>
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
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ ...card, display: "grid", gap: 10 }}>
          <h3 style={{ margin: 0 }}>Computed Subject Results</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
              <thead>
                <tr>{["Student", "Class", "Subject", "CA", "Exam", "Total", "Grade", "Remark"].map((h) => <th key={h} style={{ border: "1px solid #e2e8f0", padding: 8, textAlign: "left", background: "#f8fafc" }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {computedResults.map((row) => (
                  <tr key={row.id}>
                    <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{row.studentName || row.studentUserId}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{row.offering?.className || "-"}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{row.offering?.subject || "-"}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{row.caTotal}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{row.examTotal}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{row.totalScore}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{row.gradeLabel}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: 8 }}>{row.remark}</td>
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


