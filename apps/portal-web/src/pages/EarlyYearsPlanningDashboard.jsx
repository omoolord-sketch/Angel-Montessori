import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  approveEarlyYearsPlan,
  copyEarlyYearsPreviousPlanStructure,
  getEarlyYearsPlan,
  getEarlyYearsPlanPrintHtml,
  getEarlyYearsPlans,
  getEarlyYearsPlanningSetup,
  returnEarlyYearsPlan,
  reviewEarlyYearsPlan,
  saveEarlyYearsPlanDailyRecord,
  saveEarlyYearsWeeklyReview,
  submitEarlyYearsPlan,
  updateEarlyYearsPlan,
} from "../api/services";
import "./PortalSurface.css";

function payloadOf(response) {
  return response?.data || response || {};
}

function roleOf(user) {
  return String(user?.role || "").toUpperCase();
}

function isLeader(user) {
  return ["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER"].includes(roleOf(user));
}

function textOrDash(value) {
  const text = Array.isArray(value) ? value.filter(Boolean).join(", ") : String(value || "").trim();
  return text || "-";
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function textareaValue(value) {
  return Array.isArray(value) ? value.join("\n") : String(value || "");
}

function planToEditor(plan = {}) {
  return {
    plannedStartDate: plan.plannedStartDate || "",
    plannedEndDate: plan.plannedEndDate || "",
    weeklyPriorities: plan.weeklyPriorities || "",
    keyVocabularyFocus: plan.keyVocabularyFocus || "",
    coreTexts: textareaValue(plan.coreTexts),
    resources: textareaValue(plan.resources),
    grouping: plan.grouping || "",
    adultDeployment: plan.adultDeployment || "",
    directTeaching: plan.directTeaching || "",
    purposefulPlayProvision: plan.purposefulPlayProvision || "",
    continuousProvisionEnhancements: plan.continuousProvisionEnhancements || "",
    practicalLifePlan: plan.practicalLifePlan || "",
    outdoorLearningPlan: plan.outdoorLearningPlan || "",
    christianCharacterPlan: plan.christianCharacterPlan || "",
    nigerianAfricanContextPlan: plan.nigerianAfricanContextPlan || "",
    technologyUse: plan.technologyUse || "",
    sendAccessAdjustments: plan.sendAccessAdjustments || "",
    parentHomeConnection: plan.parentHomeConnection || "",
    assessmentFocus: plan.assessmentFocus || "",
    observationFocus: plan.observationFocus || "",
    teacherReflection: plan.teacherReflection || "",
    teacherNotes: plan.teacherNotes || "",
    readingPlan: plan.readingPlan || "",
    writingPlan: plan.writingPlan || "",
    mathematicsPlan: plan.mathematicsPlan || "",
    schoolReadinessPlan: plan.schoolReadinessPlan || "",
    phonicsProgrammePoint: plan.phonicsImplementation?.programmePoint || "",
    phonicsReviewFocus: plan.phonicsImplementation?.reviewFocus || "",
    phonicsBlendingFocus: plan.phonicsImplementation?.blendingFocus || "",
    phonicsSegmentingFocus: plan.phonicsImplementation?.segmentingFocus || "",
    phonicsDecodableReadingFocus: plan.phonicsImplementation?.decodableReadingFocus || "",
  };
}

function editorToPayload(editor = {}) {
  return {
    ...editor,
    coreTexts: editor.coreTexts,
    resources: editor.resources,
    phonicsImplementation: {
      programmePoint: editor.phonicsProgrammePoint,
      reviewFocus: editor.phonicsReviewFocus,
      blendingFocus: editor.phonicsBlendingFocus,
      segmentingFocus: editor.phonicsSegmentingFocus,
      decodableReadingFocus: editor.phonicsDecodableReadingFocus,
    },
  };
}

function StatusBadge({ status }) {
  const key = String(status || "DRAFT").toLowerCase().replace(/_/g, "-");
  return <span className={`eyfs-planning-status ${key}`}>{String(status || "DRAFT").replace(/_/g, " ")}</span>;
}

function Field({ label, value, onChange, disabled, hint, rows = 4 }) {
  return (
    <label className="eyfs-planning-field">
      <span>{label}</span>
      <textarea value={value || ""} onChange={(event) => onChange(event.target.value)} disabled={disabled} rows={rows} />
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

function SnapshotPanel({ plan }) {
  const snapshot = plan?.curriculumSnapshot || {};
  return (
    <section className="eyfs-planning-panel approved">
      <div className="eyfs-planning-panel-head">
        <div>
          <div className="portal-surface-kicker">Approved Curriculum</div>
          <h2>{snapshot.weekLabel || plan.weekLabel}: {snapshot.weekTitle || "Weekly curriculum"}</h2>
        </div>
        <span className="eyfs-curriculum-badge green">Locked</span>
      </div>
      <div className="eyfs-planning-fact-grid">
        <div><span>Class</span><strong>{plan.className}</strong></div>
        <div><span>Term</span><strong>{plan.termName}</strong></div>
        <div><span>Version</span><strong>{snapshot.curriculumVersion || "1.0"}</strong></div>
        <div><span>Source</span><strong>{snapshot.sourceDocument || "AMES Volume III"}</strong></div>
      </div>
      <dl className="eyfs-planning-snapshot-list">
        <dt>Big Idea</dt><dd>{textOrDash(snapshot.bigIdea)}</dd>
        <dt>Main Development</dt><dd>{textOrDash(snapshot.mainDevelopment)}</dd>
        <dt>Curriculum Intent</dt><dd>{textOrDash(snapshot.curriculumIntent)}</dd>
        <dt>EYFS Areas</dt><dd>{textOrDash(snapshot.eyfsAreas)}</dd>
        <dt>Key Vocabulary</dt><dd>{textOrDash(snapshot.keyVocabulary)}</dd>
        <dt>Practical Life</dt><dd>{textOrDash(snapshot.practicalLife)}</dd>
        <dt>Outdoor Learning</dt><dd>{textOrDash(snapshot.outdoorLearning)}</dd>
        <dt>Christian Character</dt><dd>{textOrDash(snapshot.christianCharacter)}</dd>
        <dt>Nigerian / African Context</dt><dd>{textOrDash(snapshot.nigerianAfricanContext)}</dd>
        <dt>Assessment Focus</dt><dd>{textOrDash(snapshot.assessmentFocus)}</dd>
      </dl>
    </section>
  );
}

function PlanList({ plans, summary, setup, filters, setFilters, loadPlans, openPlanPath }) {
  const classes = setup?.classes || [];
  const sessions = setup?.sessions || [];
  const terms = setup?.terms || [];
  const statuses = setup?.statuses || [];
  return (
    <>
      <section className="eyfs-planning-toolbar">
        <form className="eyfs-planning-filter-form" onSubmit={(event) => { event.preventDefault(); loadPlans(); }}>
          <label>
            <span>Session</span>
            <select value={filters.sessionId} onChange={(event) => setFilters((prev) => ({ ...prev, sessionId: event.target.value }))}>
              <option value="">All sessions</option>
              {sessions.map((session) => <option key={session.id} value={session.id}>{session.sessionName || session.name}</option>)}
            </select>
          </label>
          <label>
            <span>Term</span>
            <select value={filters.termId} onChange={(event) => setFilters((prev) => ({ ...prev, termId: event.target.value }))}>
              <option value="">All terms</option>
              {terms.map((term) => <option key={term.id} value={term.id}>{term.termName || term.name}</option>)}
            </select>
          </label>
          <label>
            <span>Class</span>
            <select value={filters.classId} onChange={(event) => setFilters((prev) => ({ ...prev, classId: event.target.value }))}>
              <option value="">All classes</option>
              {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label>
            <span>Status</span>
            <select value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}>
              <option value="">All statuses</option>
              {statuses.map((status) => <option key={status} value={status}>{status.replace(/_/g, " ")}</option>)}
            </select>
          </label>
          <button type="submit">Apply Filters</button>
        </form>
      </section>

      <section className="eyfs-planning-summary-grid">
        {["DRAFT", "SUBMITTED", "REVIEWED", "APPROVED", "RETURNED_FOR_REVISION"].map((status) => (
          <article key={status}>
            <span>{status.replace(/_/g, " ")}</span>
            <strong>{summary?.[status] || 0}</strong>
          </article>
        ))}
      </section>

      <section className="eyfs-planning-panel">
        <div className="eyfs-planning-panel-head">
          <div>
            <div className="portal-surface-kicker">Weekly Plan List</div>
            <h2>Current, upcoming and historical plans</h2>
          </div>
          <Link className="portal-surface-action secondary" to="/teacher/early-years/curriculum">Open Curriculum</Link>
        </div>
        {plans.length ? (
          <div className="eyfs-planning-card-list">
            {plans.map((plan) => (
              <article className="eyfs-planning-card" key={plan.id}>
                <div>
                  <StatusBadge status={plan.planStatus || plan.status} />
                  <h3>{plan.className} - {plan.weekLabel || `Week ${plan.weekNumber}`}</h3>
                  <p>{plan.curriculumSnapshot?.weekTitle || plan.curriculumSnapshot?.bigIdea || "Linked AMES Volume III curriculum"}</p>
                </div>
                <div className="eyfs-planning-card-meta">
                  <span>{plan.termName}</span>
                  <span>Updated {String(plan.updatedAt || "").slice(0, 10) || "-"}</span>
                  <span>{plan.teacherName || plan.createdByName || "Teacher"}</span>
                </div>
                <Link className="eyfs-curriculum-primary-btn" to={openPlanPath(plan.id)}>Open</Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="portal-surface-empty">No weekly implementation plans match this filter yet. Open the approved curriculum and create a plan from a week.</div>
        )}
      </section>
    </>
  );
}

export default function EarlyYearsPlanningDashboard() {
  const { user } = useAuth();
  const { planId } = useParams();
  const navigate = useNavigate();
  const [setup, setSetup] = useState(null);
  const [plans, setPlans] = useState([]);
  const [summary, setSummary] = useState({});
  const [filters, setFilters] = useState({ sessionId: "", termId: "", classId: "", status: "" });
  const [detail, setDetail] = useState(null);
  const [editor, setEditor] = useState(planToEditor());
  const [dailyForm, setDailyForm] = useState({ date: today() });
  const [reviewForm, setReviewForm] = useState({});
  const [reviewerNote, setReviewerNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const openPlanPath = useCallback((id) => {
    return isLeader(user) ? `/admin/early-years/plans/${id}` : `/teacher/early-years/plans/${id}`;
  }, [user]);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = payloadOf(await getEarlyYearsPlans(filters));
      if (data.setup) setSetup(data.setup);
      setPlans(data.plans || []);
      setSummary(data.summary || {});
    } catch (err) {
      setError(err?.response?.data?.message || "Early Years planning list could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadSetup = useCallback(async () => {
    try {
      const data = payloadOf(await getEarlyYearsPlanningSetup());
      setSetup(data);
    } catch (err) {
      setError(err?.response?.data?.message || "Planning setup could not be loaded.");
    }
  }, []);

  const loadPlan = useCallback(async (id) => {
    setLoading(true);
    setError("");
    try {
      const data = payloadOf(await getEarlyYearsPlan(id));
      setDetail(data);
      setEditor(planToEditor(data.plan));
      setDailyForm({ date: today() });
      setReviewForm(data.weeklyReview || {});
    } catch (err) {
      setError(err?.response?.data?.message || "Weekly plan could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (planId) loadPlan(planId);
    else {
      loadSetup();
      loadPlans();
    }
  }, [planId, loadPlan, loadSetup, loadPlans]);

  const plan = detail?.plan || null;
  const canEdit = plan && ["DRAFT", "RETURNED_FOR_REVISION"].includes(String(plan.planStatus || plan.status || "DRAFT"));
  const guidance = detail?.phaseGuidance || plan?.phaseGuidance || {};
  const snapshot = plan?.curriculumSnapshot || {};
  const receptionPlan = String(plan?.classLevelCode || "").toUpperCase() === "RECEPTION";
  const phonicsConfigured = Boolean(String(snapshot.phonicsProgramme || "").trim());

  const setEditorField = (field, value) => setEditor((prev) => ({ ...prev, [field]: value }));
  const setDailyField = (field, value) => setDailyForm((prev) => ({ ...prev, [field]: value }));
  const setReviewField = (field, value) => setReviewForm((prev) => ({ ...prev, [field]: value }));

  const saveDraft = async () => {
    if (!plan?.id) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await updateEarlyYearsPlan(plan.id, editorToPayload(editor));
      setMessage("Draft saved.");
      await loadPlan(plan.id);
    } catch (err) {
      setError(err?.response?.data?.message || "Draft could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const submitPlan = async () => {
    if (!plan?.id) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await submitEarlyYearsPlan(plan.id);
      setMessage("Plan submitted for leadership review.");
      await loadPlan(plan.id);
    } catch (err) {
      setError(err?.response?.data?.message || "Plan could not be submitted.");
    } finally {
      setSaving(false);
    }
  };

  const copyPreviousStructure = async () => {
    if (!plan?.id) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await copyEarlyYearsPreviousPlanStructure(plan.id);
      const copiedFromPlanId = payloadOf(response)?.copiedFromPlanId;
      setMessage(copiedFromPlanId ? "Previous week structure copied into this draft." : "Previous week structure copied.");
      await loadPlan(plan.id);
    } catch (err) {
      setError(err?.response?.data?.message || "Previous week structure could not be copied.");
    } finally {
      setSaving(false);
    }
  };

  const leaderAction = async (action) => {
    if (!plan?.id) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      if (action === "review") await reviewEarlyYearsPlan(plan.id, { notes: reviewerNote });
      if (action === "approve") await approveEarlyYearsPlan(plan.id, { notes: reviewerNote });
      if (action === "return") await returnEarlyYearsPlan(plan.id, { notes: reviewerNote });
      setMessage(action === "approve" ? "Plan approved." : action === "return" ? "Plan returned for revision." : "Plan reviewed.");
      setReviewerNote("");
      await loadPlan(plan.id);
    } catch (err) {
      setError(err?.response?.data?.message || "Leadership action could not be completed.");
    } finally {
      setSaving(false);
    }
  };

  const saveDaily = async () => {
    if (!plan?.id) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await saveEarlyYearsPlanDailyRecord(plan.id, dailyForm);
      setMessage("Daily responsive teaching record saved.");
      setDailyForm({ date: today() });
      await loadPlan(plan.id);
    } catch (err) {
      setError(err?.response?.data?.message || "Daily record could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const saveReview = async () => {
    if (!plan?.id) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await saveEarlyYearsWeeklyReview(plan.id, reviewForm);
      setMessage("Weekly review saved.");
      await loadPlan(plan.id);
    } catch (err) {
      setError(err?.response?.data?.message || "Weekly review could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const printPlan = async () => {
    if (!plan?.id) return;
    setError("");
    try {
      const response = await getEarlyYearsPlanPrintHtml(plan.id);
      const html = response?.data || "";
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        setError("Print window could not be opened. Please allow pop-ups for this portal.");
        return;
      }
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
    } catch (err) {
      setError(err?.response?.data?.message || "Print view could not be opened.");
    }
  };

  const dailyRecords = detail?.dailyRecords || [];
  const auditTrail = detail?.auditTrail || [];

  return (
    <div className="portal-surface-page eyfs-planning-page">
      <div className="portal-surface-shell eyfs-planning-shell">
        <section className="portal-surface-hero">
          <div className="portal-surface-hero-copy">
            <div className="portal-surface-kicker">Early Years Planning</div>
            <h1 className="portal-surface-title">Weekly planning and daily responsive teaching</h1>
            <p className="portal-surface-subtitle">
              Plan from locked AMES Volume III curriculum, record responsive teaching, review the week, and keep leadership approval visible.
            </p>
          </div>
          <div className="portal-surface-actions">
            {plan ? <button className="portal-surface-action secondary" type="button" onClick={() => navigate(isLeader(user) ? "/admin/early-years/planning" : "/teacher/early-years/plans")}>All Plans</button> : null}
            <Link className="portal-surface-action secondary" to="/teacher/early-years/curriculum">Curriculum</Link>
            <button className="portal-surface-action primary" type="button" onClick={plan ? () => loadPlan(plan.id) : loadPlans} disabled={loading}>
              {loading ? "Refreshing" : "Refresh"}
            </button>
          </div>
        </section>

        {error ? <div className="portal-surface-empty academic-alert">{error}</div> : null}
        {message ? <div className="portal-surface-empty eyfs-curriculum-success">{message}</div> : null}

        {!plan ? (
          <PlanList
            plans={plans}
            summary={summary}
            setup={setup}
            filters={filters}
            setFilters={setFilters}
            loadPlans={loadPlans}
            openPlanPath={openPlanPath}
          />
        ) : (
          <>
            <section className="eyfs-planning-header-card">
              <div>
                <StatusBadge status={plan.planStatus || plan.status} />
                <h2>{plan.className} - {plan.weekLabel || `Week ${plan.weekNumber}`}</h2>
                <p>{snapshot.weekTitle || snapshot.bigIdea || "Linked AMES Volume III curriculum"}</p>
              </div>
              <div className="eyfs-planning-action-row">
                <button type="button" onClick={printPlan}>Print</button>
                {canEdit ? <button type="button" onClick={copyPreviousStructure} disabled={saving}>Copy Previous Week Structure</button> : null}
                {canEdit ? <button type="button" onClick={saveDraft} disabled={saving}>{saving ? "Saving" : "Save Draft"}</button> : null}
                {canEdit ? <button type="button" onClick={submitPlan} disabled={saving}>Submit</button> : null}
              </div>
            </section>

            <section className="eyfs-planning-phase-card">
              <strong>{guidance.phase || plan.className} planning guidance</strong>
              <p>{guidance.message}</p>
              <div>{(guidance.emphasis || []).map((item) => <span key={item}>{item}</span>)}</div>
            </section>

            <div className="eyfs-planning-detail-grid">
              <SnapshotPanel plan={plan} />
              <section className="eyfs-planning-panel">
                <div className="eyfs-planning-panel-head">
                  <div>
                    <div className="portal-surface-kicker">My Weekly Implementation Plan</div>
                    <h2>Teacher editable planning</h2>
                  </div>
                  {!canEdit ? <span className="eyfs-curriculum-badge gold">Read-only status</span> : null}
                </div>
                <div className="eyfs-planning-date-grid">
                  <label><span>Planned Start</span><input type="date" value={editor.plannedStartDate || ""} onChange={(event) => setEditorField("plannedStartDate", event.target.value)} disabled={!canEdit} /></label>
                  <label><span>Planned End</span><input type="date" value={editor.plannedEndDate || ""} onChange={(event) => setEditorField("plannedEndDate", event.target.value)} disabled={!canEdit} /></label>
                </div>
                <Field label="Weekly Priorities" value={editor.weeklyPriorities} onChange={(value) => setEditorField("weeklyPriorities", value)} disabled={!canEdit} />
                <Field label="Key Vocabulary Focus" value={editor.keyVocabularyFocus} onChange={(value) => setEditorField("keyVocabularyFocus", value)} disabled={!canEdit} hint="Use approved vocabulary as the source, then add classroom implementation notes." />
                <Field label="Core Texts" value={editor.coreTexts} onChange={(value) => setEditorField("coreTexts", value)} disabled={!canEdit} hint="One book/resource per line." rows={3} />
                <Field label="Direct / Intentional Teaching" value={editor.directTeaching} onChange={(value) => setEditorField("directTeaching", value)} disabled={!canEdit} />
                <Field label="Purposeful Play / Provision" value={editor.purposefulPlayProvision} onChange={(value) => setEditorField("purposefulPlayProvision", value)} disabled={!canEdit} />
                <Field label="Continuous Provision Enhancements" value={editor.continuousProvisionEnhancements} onChange={(value) => setEditorField("continuousProvisionEnhancements", value)} disabled={!canEdit} />
                <Field label="Practical Life" value={editor.practicalLifePlan} onChange={(value) => setEditorField("practicalLifePlan", value)} disabled={!canEdit} />
                <Field label="Outdoor Learning" value={editor.outdoorLearningPlan} onChange={(value) => setEditorField("outdoorLearningPlan", value)} disabled={!canEdit} />
                <Field label="Christian Character" value={editor.christianCharacterPlan} onChange={(value) => setEditorField("christianCharacterPlan", value)} disabled={!canEdit} />
                <Field label="Nigerian / African Context" value={editor.nigerianAfricanContextPlan} onChange={(value) => setEditorField("nigerianAfricanContextPlan", value)} disabled={!canEdit} />
                <Field label="SEND / Access Adjustments" value={editor.sendAccessAdjustments} onChange={(value) => setEditorField("sendAccessAdjustments", value)} disabled={!canEdit} hint="Keep sensitive child-specific details in the dedicated SEND/safeguarding process." />
                <Field label="Parent / Home Connection" value={editor.parentHomeConnection} onChange={(value) => setEditorField("parentHomeConnection", value)} disabled={!canEdit} />
                <Field label="Assessment Focus" value={editor.assessmentFocus} onChange={(value) => setEditorField("assessmentFocus", value)} disabled={!canEdit} />
                <Field label="Observation Focus" value={editor.observationFocus} onChange={(value) => setEditorField("observationFocus", value)} disabled={!canEdit} />
                <Field label="Resources" value={editor.resources} onChange={(value) => setEditorField("resources", value)} disabled={!canEdit} rows={3} />
                <Field label="Adult Deployment" value={editor.adultDeployment} onChange={(value) => setEditorField("adultDeployment", value)} disabled={!canEdit} rows={3} />
                <Field label="Grouping" value={editor.grouping} onChange={(value) => setEditorField("grouping", value)} disabled={!canEdit} rows={3} />

                {receptionPlan ? (
                  <section className="eyfs-planning-subsection">
                    <h3>Reception Phonics Reference</h3>
                    <p>{phonicsConfigured ? `Adopted SSP programme: ${snapshot.phonicsProgramme}` : "Adopted SSP programme not yet configured"}</p>
                    <div className="eyfs-planning-two-col">
                      <Field label="Programme Point" value={editor.phonicsProgrammePoint} onChange={(value) => setEditorField("phonicsProgrammePoint", value)} disabled={!canEdit} rows={2} />
                      <Field label="Review Focus" value={editor.phonicsReviewFocus} onChange={(value) => setEditorField("phonicsReviewFocus", value)} disabled={!canEdit} rows={2} />
                      <Field label="Blending Focus" value={editor.phonicsBlendingFocus} onChange={(value) => setEditorField("phonicsBlendingFocus", value)} disabled={!canEdit} rows={2} />
                      <Field label="Segmenting Focus" value={editor.phonicsSegmentingFocus} onChange={(value) => setEditorField("phonicsSegmentingFocus", value)} disabled={!canEdit} rows={2} />
                    </div>
                    <Field label="Decodable Reading Focus" value={editor.phonicsDecodableReadingFocus} onChange={(value) => setEditorField("phonicsDecodableReadingFocus", value)} disabled={!canEdit} rows={2} />
                    <Field label="Reading Plan" value={editor.readingPlan} onChange={(value) => setEditorField("readingPlan", value)} disabled={!canEdit} rows={3} />
                    <Field label="Writing Plan" value={editor.writingPlan} onChange={(value) => setEditorField("writingPlan", value)} disabled={!canEdit} rows={3} />
                    <Field label="Mathematics Plan" value={editor.mathematicsPlan} onChange={(value) => setEditorField("mathematicsPlan", value)} disabled={!canEdit} rows={3} />
                    <Field label="School Readiness Plan" value={editor.schoolReadinessPlan} onChange={(value) => setEditorField("schoolReadinessPlan", value)} disabled={!canEdit} rows={3} />
                  </section>
                ) : null}

                <Field label="Teacher Notes" value={editor.teacherNotes} onChange={(value) => setEditorField("teacherNotes", value)} disabled={!canEdit} />
              </section>
            </div>

            {isLeader(user) ? (
              <section className="eyfs-planning-panel">
                <div className="eyfs-planning-panel-head">
                  <div>
                    <div className="portal-surface-kicker">Leadership Review</div>
                    <h2>Review, approve, or return for revision</h2>
                  </div>
                </div>
                <Field label="Review Notes" value={reviewerNote} onChange={setReviewerNote} disabled={saving} rows={3} />
                <div className="eyfs-planning-action-row">
                  <button type="button" onClick={() => leaderAction("review")} disabled={saving}>Mark Reviewed</button>
                  <button type="button" onClick={() => leaderAction("return")} disabled={saving}>Return For Revision</button>
                  <button type="button" onClick={() => leaderAction("approve")} disabled={saving}>Approve Plan</button>
                </div>
              </section>
            ) : null}

            <section className="eyfs-planning-panel">
              <div className="eyfs-planning-panel-head">
                <div>
                  <div className="portal-surface-kicker">Daily Responsive Teaching</div>
                  <h2>What should change because of what I now know?</h2>
                </div>
              </div>
              <div className="eyfs-planning-date-grid">
                <label><span>Date</span><input type="date" value={dailyForm.date || today()} onChange={(event) => setDailyField("date", event.target.value)} /></label>
              </div>
              <div className="eyfs-planning-two-col">
                <Field label="Planned Teaching" value={dailyForm.plannedTeaching} onChange={(value) => setDailyField("plannedTeaching", value)} rows={3} />
                <Field label="Actual Teaching" value={dailyForm.actualTeaching} onChange={(value) => setDailyField("actualTeaching", value)} rows={3} />
                <Field label="Children Requiring Revisit" value={dailyForm.childrenRequiringRevisit} onChange={(value) => setDailyField("childrenRequiringRevisit", value)} rows={3} />
                <Field label="Children Ready For Extension" value={dailyForm.childrenReadyForExtension} onChange={(value) => setDailyField("childrenReadyForExtension", value)} rows={3} />
              </div>
              <Field label="Unexpected Learning / Significant Observations" value={dailyForm.significantObservations} onChange={(value) => setDailyField("significantObservations", value)} rows={3} />
              <Field label="Provision Changes / Resources Adjusted" value={dailyForm.provisionChanges} onChange={(value) => setDailyField("provisionChanges", value)} rows={3} />
              <Field label="Reflection / Next Day Adjustment" value={dailyForm.nextDayAdjustment} onChange={(value) => setDailyField("nextDayAdjustment", value)} rows={3} />
              <p className="eyfs-planning-safeguarding-note">Safeguarding concerns must be recorded using the school's safeguarding procedure, not only in planning notes.</p>
              <button className="eyfs-curriculum-primary-btn" type="button" onClick={saveDaily} disabled={saving}>Save Daily Record</button>
              {dailyRecords.length ? (
                <div className="eyfs-planning-mini-list">
                  {dailyRecords.map((record) => (
                    <article key={record.id}>
                      <strong>{record.date}</strong>
                      <p>{record.actualTeaching || record.plannedTeaching || "Daily note saved."}</p>
                      <small>{record.nextDayAdjustment || record.reflection}</small>
                    </article>
                  ))}
                </div>
              ) : <div className="portal-surface-empty">No daily responsive records yet.</div>}
            </section>

            <section className="eyfs-planning-panel">
              <div className="eyfs-planning-panel-head">
                <div>
                  <div className="portal-surface-kicker">Weekly Review</div>
                  <h2>Review and inform next week</h2>
                </div>
              </div>
              <div className="eyfs-planning-two-col">
                <Field label="What learning was secure?" value={reviewForm.learningSecure} onChange={(value) => setReviewField("learningSecure", value)} rows={3} />
                <Field label="What remains developing?" value={reviewForm.learningDeveloping} onChange={(value) => setReviewField("learningDeveloping", value)} rows={3} />
                <Field label="Misconceptions" value={reviewForm.misconceptions} onChange={(value) => setReviewField("misconceptions", value)} rows={3} />
                <Field label="Support Needed" value={reviewForm.supportNeeded} onChange={(value) => setReviewField("supportNeeded", value)} rows={3} />
                <Field label="Challenge Needed" value={reviewForm.challengeNeeded} onChange={(value) => setReviewField("challengeNeeded", value)} rows={3} />
                <Field label="Resources / Provision Worked Well" value={reviewForm.resourcesWorked} onChange={(value) => setReviewField("resourcesWorked", value)} rows={3} />
              </div>
              <Field label="What should be revisited next week?" value={reviewForm.revisitNextWeek} onChange={(value) => setReviewField("revisitNextWeek", value)} rows={3} />
              <Field label="Parent Partnership / SEND Access Review" value={reviewForm.parentPartnershipNotes} onChange={(value) => setReviewField("parentPartnershipNotes", value)} rows={3} />
              <Field label="Teacher Professional Reflection" value={reviewForm.professionalReflection} onChange={(value) => setReviewField("professionalReflection", value)} rows={3} />
              <button className="eyfs-curriculum-primary-btn" type="button" onClick={saveReview} disabled={saving}>Save Weekly Review</button>
            </section>

            <section className="eyfs-planning-panel">
              <div className="portal-surface-kicker">Audit Trail</div>
              {auditTrail.length ? (
                <div className="eyfs-planning-audit-list">
                  {auditTrail.map((item) => (
                    <div key={item.id}>
                      <strong>{item.action}</strong>
                      <span>{item.userName || item.userId} - {String(item.createdAt || "").slice(0, 19).replace("T", " ")}</span>
                    </div>
                  ))}
                </div>
              ) : <div className="portal-surface-empty">No audit entries yet.</div>}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
