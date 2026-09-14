import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  createEarlyYearsDisplayReview,
  createEarlyYearsEnvironmentChecklist,
  createEarlyYearsEnvironmentReview,
  createEarlyYearsPracticalLifeActivity,
  createEarlyYearsPracticalLifeAssignment,
  createEarlyYearsProvisionArea,
  createEarlyYearsProvisionEnhancement,
  createEarlyYearsResource,
  createEarlyYearsResourceRequest,
  getEarlyYearsEnvironmentDashboard,
  getEarlyYearsPlans,
  updateEarlyYearsResourceRequest,
} from "../api/services";
import "./PortalSurface.css";

function payloadOf(response) {
  return response?.data || response || {};
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function roleOf(user) {
  return String(user?.role || user?.originalRole || "").toUpperCase();
}

function isLeader(user) {
  return ["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER"].includes(roleOf(user));
}

function labelize(value) {
  return String(value || "").replace(/_/g, " ");
}

function Field({ label, value, onChange, rows = 1, type = "text", children, hint }) {
  return (
    <label className="environment-field">
      <span>{label}</span>
      {children || (rows > 1 ? (
        <textarea value={value || ""} rows={rows} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input type={type} value={value || ""} onChange={(event) => onChange(event.target.value)} />
      ))}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

function StatusChip({ children, tone = "" }) {
  return <span className={`environment-chip ${tone}`}>{children}</span>;
}

function cardTitle(row, fallback) {
  return row?.name || row?.enhancementTitle || row?.activityName || row?.resource || row?.title || fallback;
}

function areaDefaults(classId = "") {
  return {
    classId,
    areaType: "READING",
    name: "",
    purpose: "",
    coreResources: "",
    accessibilityNotes: "",
    independenceNotes: "",
    currentEnhancement: "",
  };
}

function enhancementDefaults(classId = "", weeklyPlanId = "", provisionAreaId = "") {
  return {
    classId,
    weeklyPlanId,
    provisionAreaId,
    enhancementTitle: "",
    purpose: "",
    linkedCurriculumAreas: "",
    resourcesAdded: "",
    adultRole: "",
    intendedLearning: "",
    accessAdjustments: "",
    outdoorConnection: "",
    practicalLifeConnection: "",
    notes: "",
  };
}

function practicalLifeDefaults(classId = "") {
  return {
    classId,
    name: "",
    category: "POURING",
    purpose: "",
    developmentalStage: "",
    materials: "",
    skillsDeveloped: "",
    independenceFocus: "",
    responsibilityFocus: "",
  };
}

function checklistDefaults(classId = "") {
  return {
    classId,
    date: today(),
    safetyStatus: "SECURE",
    emotionalClimateStatus: "SECURE",
    organisationStatus: "DEVELOPING",
    accessibilityStatus: "DEVELOPING",
    independenceStatus: "DEVELOPING",
    languageRichnessStatus: "DEVELOPING",
    bookAccessStatus: "DEVELOPING",
    mathematicsStatus: "DEVELOPING",
    creativeProvisionStatus: "DEVELOPING",
    investigationStatus: "DEVELOPING",
    practicalLifeStatus: "DEVELOPING",
    outdoorStatus: "DEVELOPING",
    physicalDevelopmentStatus: "DEVELOPING",
    inclusionStatus: "DEVELOPING",
    displayStatus: "DEVELOPING",
    resourceConditionStatus: "DEVELOPING",
    adultPositioningStatus: "DEVELOPING",
    restorationStatus: "DEVELOPING",
    continuousProvisionStatus: "DEVELOPING",
    enhancedProvisionStatus: "DEVELOPING",
    strengths: "",
    priorityActions: "",
    responsiblePerson: "",
    deadline: "",
    reviewDate: "",
    accessibilityNotes: "",
    culturalRepresentationNotes: "",
  };
}

function resourceDefaults(classId = "") {
  return {
    classId,
    name: "",
    category: "GENERAL",
    provisionArea: "READING",
    quantity: "1",
    usableQuantity: "1",
    condition: "GOOD",
    storageLocation: "",
    purpose: "",
    childAccessible: true,
    actuallyUsed: true,
    notes: "",
  };
}

function requestDefaults(classId = "") {
  return {
    classId,
    resource: "",
    reason: "",
    quantity: "1",
    priority: "NORMAL",
    provisionArea: "READING",
  };
}

function reviewDefaults(classId = "", enhancementId = "") {
  return {
    classId,
    weeklyEnhancementId: enhancementId,
    reviewDate: today(),
    cycleStage: "OBSERVE",
    reviewDecision: "ADAPT",
    observedUse: "",
    visibleLearning: "",
    languageObserved: "",
    barriers: "",
    changeNeeded: "",
    nextWeeklyPlanFeedForward: "",
  };
}

export default function EarlyYearsEnvironmentDashboard() {
  const { user } = useAuth();
  const leader = isLeader(user);
  const [dashboard, setDashboard] = useState(null);
  const [setup, setSetup] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [weeklyPlans, setWeeklyPlans] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [areaForm, setAreaForm] = useState(areaDefaults());
  const [enhancementForm, setEnhancementForm] = useState(enhancementDefaults());
  const [practicalForm, setPracticalForm] = useState(practicalLifeDefaults());
  const [checklistForm, setChecklistForm] = useState(checklistDefaults());
  const [resourceForm, setResourceForm] = useState(resourceDefaults());
  const [requestForm, setRequestForm] = useState(requestDefaults());
  const [reviewForm, setReviewForm] = useState(reviewDefaults());
  const [displayForm, setDisplayForm] = useState({ classId: "", displayTitle: "", purpose: "", curriculumConnection: "", vocabularySupport: "", notes: "", reviewDate: today(), childWorkIncluded: true, isCurrent: true });

  const load = useCallback(async (classId = selectedClassId) => {
    setLoading(true);
    setError("");
    try {
      const response = payloadOf(await getEarlyYearsEnvironmentDashboard(classId ? { classId } : {}));
      const nextSetup = response.setup || {};
      const nextClassId = classId || response.selectedClass?.id || nextSetup.classes?.[0]?.id || "";
      setSetup(nextSetup);
      setDashboard(response);
      setSelectedClassId(nextClassId);
      const plansResponse = payloadOf(await getEarlyYearsPlans(nextClassId ? { classId: nextClassId } : {}));
      setWeeklyPlans(plansResponse.plans || []);
      setAreaForm(areaDefaults(nextClassId));
      setEnhancementForm(enhancementDefaults(nextClassId, plansResponse.plans?.[0]?.id || "", response.provisionAreas?.[0]?.id || ""));
      setPracticalForm(practicalLifeDefaults(nextClassId));
      setChecklistForm(checklistDefaults(nextClassId));
      setResourceForm(resourceDefaults(nextClassId));
      setRequestForm(requestDefaults(nextClassId));
      setReviewForm(reviewDefaults(nextClassId, response.currentEnhancements?.[0]?.id || ""));
      setDisplayForm({ classId: nextClassId, displayTitle: "", purpose: "", curriculumConnection: "", vocabularySupport: "", notes: "", reviewDate: today(), childWorkIncluded: true, isCurrent: true });
    } catch (err) {
      setError(err?.response?.data?.message || "Early Years environment could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [selectedClassId]);

  useEffect(() => {
    load("");
  }, [load]);

  const classes = setup?.classes || [];
  const areaTypes = setup?.provisionAreaTypes || [];
  const practicalCategories = setup?.practicalLifeCategories || [];
  const checklistStatuses = setup?.checklistStatuses || [];
  const resourceConditions = setup?.resourceConditions || [];
  const requestPriorities = setup?.resourceRequestPriorities || [];
  const reviewDecisions = setup?.reviewDecisions || [];
  const cycle = setup?.preparedEnvironmentCycle || [];
  const classGuidance = dashboard?.practicalLifeGuidance;

  const selectedWeeklyPlanId = useMemo(() => enhancementForm.weeklyPlanId || weeklyPlans[0]?.id || "", [enhancementForm.weeklyPlanId, weeklyPlans]);
  const selectedEnhancementId = useMemo(() => reviewForm.weeklyEnhancementId || dashboard?.currentEnhancements?.[0]?.id || "", [reviewForm.weeklyEnhancementId, dashboard]);

  const submit = async (key, action, resetMessage) => {
    setSaving(key);
    setError("");
    setMessage("");
    try {
      await action();
      setMessage(resetMessage);
      await load(selectedClassId);
    } catch (err) {
      setError(err?.response?.data?.message || "The environment record could not be saved.");
    } finally {
      setSaving("");
    }
  };

  const tabs = [
    ["overview", "Overview"],
    ["provision", "Provision"],
    ["enhancements", "Weekly Enhancements"],
    ["practical", "Practical Life"],
    ["outdoor", "Outdoor"],
    ["resources", "Resources"],
    ["checklist", "Checklist"],
    ["review", "Weekly Review"],
  ];

  const currentEnhancements = dashboard?.currentEnhancements || [];
  const provisionAreas = dashboard?.provisionAreas || [];
  const openActions = dashboard?.openActions || [];
  const resourceRequests = dashboard?.resourceRequests || [];
  const resourcesNeedingAttention = dashboard?.resourcesNeedingAttention || [];

  return (
    <main className="portal-surface environment-surface">
      <section className="surface-hero environment-hero">
        <div>
          <p className="surface-eyebrow">Angel Montessori School</p>
          <h1>Early Years Environment</h1>
          <p>Prepare, observe, adapt, and restore classroom provision for Creche, Nursery, and Reception.</p>
        </div>
        <div className="environment-hero-actions">
          <Link className="surface-action secondary" to="/dashboard/early-years-planning">Weekly Plans</Link>
          <Link className="surface-action secondary" to="/dashboard/early-years-assessment">Learning Journal</Link>
          <button className="surface-action" type="button" onClick={() => load(selectedClassId)}>Refresh</button>
        </div>
      </section>

      {error ? <div className="surface-alert error">{error}</div> : null}
      {message ? <div className="surface-alert success">{message}</div> : null}

      <section className="environment-toolbar">
        <Field label="Class">
          <select value={selectedClassId} onChange={(event) => load(event.target.value)}>
            {classes.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select>
        </Field>
        <div>
          <span className="environment-muted">Prepared Environment Cycle</span>
          <div className="environment-cycle">
            {cycle.map((item) => <StatusChip key={item}>{labelize(item)}</StatusChip>)}
          </div>
        </div>
      </section>

      {loading ? (
        <section className="surface-card"><p>Loading classroom environment...</p></section>
      ) : (
        <>
          <section className="environment-stat-grid">
            {[
              ["Active Provision Areas", dashboard?.summary?.activeProvisionAreas || 0],
              ["Current Enhancements", dashboard?.summary?.currentEnhancements || 0],
              ["Practical Life Focus", dashboard?.summary?.practicalLifeFocus || 0],
              ["Outdoor Focus", dashboard?.summary?.outdoorFocus || 0],
              ["Open Actions", dashboard?.summary?.openActions || 0],
              ["Resources Need Attention", dashboard?.summary?.resourcesNeedingAttention || 0],
            ].map(([label, value]) => (
              <article className="environment-stat-card" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </article>
            ))}
          </section>

          <nav className="environment-tabs">
            {tabs.map(([key, label]) => (
              <button key={key} type="button" className={activeTab === key ? "active" : ""} onClick={() => setActiveTab(key)}>
                {label}
              </button>
            ))}
          </nav>

          {activeTab === "overview" ? (
            <section className="environment-grid">
              <article className="surface-card">
                <h2>Classroom Profile</h2>
                <p><strong>{dashboard?.selectedClass?.name || "Early Years Class"}</strong></p>
                <p>Current checklist: <StatusChip tone={dashboard?.latestChecklist?.status === "ACTION_REQUIRED" ? "warn" : ""}>{dashboard?.latestChecklist?.status || "Not completed"}</StatusChip></p>
                <p>Practical Life: {classGuidance?.phase || "Early Years"} - {classGuidance?.guidance}</p>
              </article>
              <article className="surface-card">
                <h2>Current Actions</h2>
                {openActions.length ? openActions.map((row) => (
                  <div className="environment-mini-card" key={row.id}>
                    <strong>{row.actionRequired}</strong>
                    <span>{row.responsiblePerson || "Unassigned"} {row.dueDate ? `- ${row.dueDate}` : ""}</span>
                  </div>
                )) : <p>No open environment actions.</p>}
              </article>
              <article className="surface-card">
                <h2>Resource Requests</h2>
                {resourceRequests.length ? resourceRequests.map((row) => (
                  <div className="environment-mini-card" key={row.id}>
                    <strong>{row.resource}</strong>
                    <span>{row.priority} - {row.status}</span>
                  </div>
                )) : <p>No resource requests yet.</p>}
              </article>
            </section>
          ) : null}

          {activeTab === "provision" ? (
            <section className="environment-grid">
              <article className="surface-card environment-form-card">
                <h2>Add Provision Area</h2>
                <Field label="Area type">
                  <select value={areaForm.areaType} onChange={(event) => setAreaForm({ ...areaForm, areaType: event.target.value })}>
                    {areaTypes.map((item) => <option key={item} value={item}>{labelize(item)}</option>)}
                  </select>
                </Field>
                <Field label="Name" value={areaForm.name} onChange={(value) => setAreaForm({ ...areaForm, name: value })} />
                <Field label="Purpose" rows={2} value={areaForm.purpose} onChange={(value) => setAreaForm({ ...areaForm, purpose: value })} />
                <Field label="Core resources" rows={2} value={areaForm.coreResources} onChange={(value) => setAreaForm({ ...areaForm, coreResources: value })} />
                <Field label="Access / independence notes" rows={2} value={areaForm.accessibilityNotes} onChange={(value) => setAreaForm({ ...areaForm, accessibilityNotes: value })} />
                <button className="surface-action" type="button" disabled={saving === "area"} onClick={() => submit("area", () => createEarlyYearsProvisionArea(areaForm), "Provision area saved.")}>Save Provision Area</button>
              </article>
              <article className="surface-card">
                <h2>Active Provision</h2>
                <div className="environment-list">
                  {provisionAreas.length ? provisionAreas.map((row) => (
                    <div className="environment-list-card" key={row.id}>
                      <div><strong>{cardTitle(row, "Provision Area")}</strong><StatusChip>{labelize(row.areaType)}</StatusChip></div>
                      <p>{row.purpose || "Purpose not recorded yet."}</p>
                      <small>{(row.coreResources || []).join(", ")}</small>
                    </div>
                  )) : <p>No provision areas have been added yet.</p>}
                </div>
              </article>
              <article className="surface-card environment-form-card">
                <h2>Display Review</h2>
                <Field label="Display title" value={displayForm.displayTitle} onChange={(value) => setDisplayForm({ ...displayForm, displayTitle: value })} />
                <Field label="Purpose" rows={2} value={displayForm.purpose} onChange={(value) => setDisplayForm({ ...displayForm, purpose: value })} hint="Display learning, not decoration for its own sake." />
                <Field label="Curriculum connection" value={displayForm.curriculumConnection} onChange={(value) => setDisplayForm({ ...displayForm, curriculumConnection: value })} />
                <button className="surface-action" type="button" disabled={saving === "display"} onClick={() => submit("display", () => createEarlyYearsDisplayReview(displayForm), "Display review saved.")}>Save Display Review</button>
              </article>
            </section>
          ) : null}

          {activeTab === "enhancements" || activeTab === "outdoor" ? (
            <section className="environment-grid">
              <article className="surface-card environment-form-card">
                <h2>{activeTab === "outdoor" ? "Outdoor Enhancement" : "Weekly Enhancement"}</h2>
                <Field label="Weekly plan">
                  <select value={selectedWeeklyPlanId} onChange={(event) => setEnhancementForm({ ...enhancementForm, weeklyPlanId: event.target.value })}>
                    <option value="">No weekly plan selected</option>
                    {weeklyPlans.map((plan) => <option key={plan.id} value={plan.id}>{plan.weekLabel || plan.curriculumWeekId} - {plan.planStatus}</option>)}
                  </select>
                </Field>
                <Field label="Provision area">
                  <select value={enhancementForm.provisionAreaId} onChange={(event) => setEnhancementForm({ ...enhancementForm, provisionAreaId: event.target.value })}>
                    <option value="">Select area</option>
                    {provisionAreas.map((area) => <option key={area.id} value={area.id}>{area.name} ({labelize(area.areaType)})</option>)}
                  </select>
                </Field>
                <Field label="Title" value={enhancementForm.enhancementTitle} onChange={(value) => setEnhancementForm({ ...enhancementForm, enhancementTitle: value })} />
                <Field label="Purpose" rows={2} value={enhancementForm.purpose} onChange={(value) => setEnhancementForm({ ...enhancementForm, purpose: value })} />
                <Field label="Resources added" rows={2} value={enhancementForm.resourcesAdded} onChange={(value) => setEnhancementForm({ ...enhancementForm, resourcesAdded: value })} />
                <Field label="Adult role" value={enhancementForm.adultRole} onChange={(value) => setEnhancementForm({ ...enhancementForm, adultRole: value })} />
                <Field label="Access adjustments" rows={2} value={enhancementForm.accessAdjustments} onChange={(value) => setEnhancementForm({ ...enhancementForm, accessAdjustments: value })} />
                {activeTab === "outdoor" ? <Field label="Risk consideration / outdoor connection" rows={2} value={enhancementForm.outdoorConnection} onChange={(value) => setEnhancementForm({ ...enhancementForm, outdoorConnection: value })} /> : null}
                <button className="surface-action" type="button" disabled={saving === "enhancement"} onClick={() => submit("enhancement", () => createEarlyYearsProvisionEnhancement({ ...enhancementForm, classId: selectedClassId }), "Weekly provision enhancement saved.")}>Save Enhancement</button>
              </article>
              <article className="surface-card">
                <h2>Current Enhancements</h2>
                <div className="environment-list">
                  {currentEnhancements.length ? currentEnhancements.map((row) => (
                    <div className="environment-list-card" key={row.id}>
                      <div><strong>{row.enhancementTitle}</strong><StatusChip>{row.status}</StatusChip></div>
                      <p>{row.purpose}</p>
                      <small>{row.accessAdjustments || row.outdoorConnection || "No access or outdoor note yet."}</small>
                    </div>
                  )) : <p>No weekly enhancements for this class yet.</p>}
                </div>
              </article>
            </section>
          ) : null}

          {activeTab === "practical" ? (
            <section className="environment-grid">
              <article className="surface-card environment-form-card">
                <h2>Practical Life Activity</h2>
                <p>{classGuidance?.guidance}</p>
                <div className="environment-cycle">{(classGuidance?.stages || []).map((item) => <StatusChip key={item}>{labelize(item)}</StatusChip>)}</div>
                <Field label="Name" value={practicalForm.name} onChange={(value) => setPracticalForm({ ...practicalForm, name: value })} />
                <Field label="Category">
                  <select value={practicalForm.category} onChange={(event) => setPracticalForm({ ...practicalForm, category: event.target.value })}>
                    {practicalCategories.map((item) => <option key={item} value={item}>{labelize(item)}</option>)}
                  </select>
                </Field>
                <Field label="Purpose" rows={2} value={practicalForm.purpose} onChange={(value) => setPracticalForm({ ...practicalForm, purpose: value })} />
                <Field label="Materials" rows={2} value={practicalForm.materials} onChange={(value) => setPracticalForm({ ...practicalForm, materials: value })} />
                <Field label="Independence focus" value={practicalForm.independenceFocus} onChange={(value) => setPracticalForm({ ...practicalForm, independenceFocus: value })} />
                <button className="surface-action" type="button" disabled={saving === "practical"} onClick={() => submit("practical", async () => {
                  const saved = payloadOf(await createEarlyYearsPracticalLifeActivity(practicalForm)).activity;
                  await createEarlyYearsPracticalLifeAssignment({ classId: selectedClassId, activityId: saved.id, weeklyPlanId: selectedWeeklyPlanId, purpose: saved.purpose, resources: (saved.materials || []).join(", "), independenceExpectation: saved.independenceFocus });
                }, "Practical Life activity and weekly focus saved.")}>Save Practical Life Focus</button>
              </article>
              <article className="surface-card">
                <h2>Weekly Practical Life Focus</h2>
                {(dashboard?.practicalLifeAssignments || []).length ? dashboard.practicalLifeAssignments.map((row) => (
                  <div className="environment-list-card" key={row.id}>
                    <strong>{row.activityName}</strong>
                    <p>{row.independenceExpectation || row.purpose}</p>
                  </div>
                )) : <p>No Practical Life focus has been assigned yet.</p>}
              </article>
            </section>
          ) : null}

          {activeTab === "resources" ? (
            <section className="environment-grid">
              <article className="surface-card environment-form-card">
                <h2>Resource Condition</h2>
                <Field label="Resource name" value={resourceForm.name} onChange={(value) => setResourceForm({ ...resourceForm, name: value })} />
                <Field label="Provision area">
                  <select value={resourceForm.provisionArea} onChange={(event) => setResourceForm({ ...resourceForm, provisionArea: event.target.value })}>
                    {areaTypes.map((item) => <option key={item} value={item}>{labelize(item)}</option>)}
                  </select>
                </Field>
                <Field label="Condition">
                  <select value={resourceForm.condition} onChange={(event) => setResourceForm({ ...resourceForm, condition: event.target.value })}>
                    {resourceConditions.map((item) => <option key={item} value={item}>{labelize(item)}</option>)}
                  </select>
                </Field>
                <Field label="Purpose" rows={2} value={resourceForm.purpose} onChange={(value) => setResourceForm({ ...resourceForm, purpose: value })} />
                <button className="surface-action" type="button" disabled={saving === "resource"} onClick={() => submit("resource", () => createEarlyYearsResource(resourceForm), "Resource condition saved.")}>Save Resource</button>
              </article>
              <article className="surface-card environment-form-card">
                <h2>Request Resource</h2>
                <Field label="Resource" value={requestForm.resource} onChange={(value) => setRequestForm({ ...requestForm, resource: value })} />
                <Field label="Priority">
                  <select value={requestForm.priority} onChange={(event) => setRequestForm({ ...requestForm, priority: event.target.value })}>
                    {requestPriorities.map((item) => <option key={item} value={item}>{labelize(item)}</option>)}
                  </select>
                </Field>
                <Field label="Reason / learning purpose" rows={2} value={requestForm.reason} onChange={(value) => setRequestForm({ ...requestForm, reason: value })} />
                <button className="surface-action" type="button" disabled={saving === "request"} onClick={() => submit("request", () => createEarlyYearsResourceRequest(requestForm), "Resource request submitted.")}>Submit Request</button>
              </article>
              <article className="surface-card">
                <h2>Needs Attention</h2>
                {resourcesNeedingAttention.length ? resourcesNeedingAttention.map((row) => (
                  <div className="environment-list-card" key={row.id}>
                    <strong>{row.name}</strong>
                    <StatusChip tone="warn">{labelize(row.condition)}</StatusChip>
                    <p>{row.purpose}</p>
                  </div>
                )) : <p>No resource condition issues recorded.</p>}
                {leader && resourceRequests.length ? (
                  <div className="environment-leader-review">
                    <h3>Leadership Requests</h3>
                    {resourceRequests.map((row) => (
                      <button key={row.id} type="button" onClick={() => submit(`approve-${row.id}`, () => updateEarlyYearsResourceRequest(row.id, { status: "REVIEWED", adminNote: "Reviewed by academic leadership." }), `${row.resource} marked reviewed.`)}>
                        Review {row.resource} ({row.status})
                      </button>
                    ))}
                  </div>
                ) : null}
              </article>
            </section>
          ) : null}

          {activeTab === "checklist" ? (
            <section className="environment-grid">
              <article className="surface-card environment-form-card wide">
                <h2>Environment Checklist</h2>
                <Field label="Date" type="date" value={checklistForm.date} onChange={(value) => setChecklistForm({ ...checklistForm, date: value })} />
                <div className="environment-domain-grid">
                  {(setup?.checklistDomains || []).map((field) => (
                    <Field key={field} label={labelize(field.replace(/Status$/, ""))}>
                      <select value={checklistForm[field] || "DEVELOPING"} onChange={(event) => setChecklistForm({ ...checklistForm, [field]: event.target.value })}>
                        {checklistStatuses.map((item) => <option key={item} value={item}>{labelize(item)}</option>)}
                      </select>
                    </Field>
                  ))}
                </div>
                <Field label="Strengths" rows={2} value={checklistForm.strengths} onChange={(value) => setChecklistForm({ ...checklistForm, strengths: value })} />
                <Field label="Priority actions" rows={2} value={checklistForm.priorityActions} onChange={(value) => setChecklistForm({ ...checklistForm, priorityActions: value })} />
                <Field label="Responsible person" value={checklistForm.responsiblePerson} onChange={(value) => setChecklistForm({ ...checklistForm, responsiblePerson: value })} />
                <Field label="Review date" type="date" value={checklistForm.reviewDate} onChange={(value) => setChecklistForm({ ...checklistForm, reviewDate: value })} />
                <button className="surface-action" type="button" disabled={saving === "checklist"} onClick={() => submit("checklist", () => createEarlyYearsEnvironmentChecklist(checklistForm), "Environment checklist saved.")}>Save Checklist</button>
              </article>
            </section>
          ) : null}

          {activeTab === "review" ? (
            <section className="environment-grid">
              <article className="surface-card environment-form-card">
                <h2>Weekly Provision Review</h2>
                <Field label="Enhancement">
                  <select value={selectedEnhancementId} onChange={(event) => setReviewForm({ ...reviewForm, weeklyEnhancementId: event.target.value })}>
                    <option value="">Select enhancement</option>
                    {currentEnhancements.map((row) => <option key={row.id} value={row.id}>{row.enhancementTitle}</option>)}
                  </select>
                </Field>
                <Field label="Cycle stage">
                  <select value={reviewForm.cycleStage} onChange={(event) => setReviewForm({ ...reviewForm, cycleStage: event.target.value })}>
                    {cycle.map((item) => <option key={item} value={item}>{labelize(item)}</option>)}
                  </select>
                </Field>
                <Field label="Review decision">
                  <select value={reviewForm.reviewDecision} onChange={(event) => setReviewForm({ ...reviewForm, reviewDecision: event.target.value })}>
                    {reviewDecisions.map((item) => <option key={item} value={item}>{labelize(item)}</option>)}
                  </select>
                </Field>
                <Field label="Observed use" rows={2} value={reviewForm.observedUse} onChange={(value) => setReviewForm({ ...reviewForm, observedUse: value })} />
                <Field label="Visible learning / language" rows={2} value={reviewForm.visibleLearning} onChange={(value) => setReviewForm({ ...reviewForm, visibleLearning: value })} />
                <Field label="Barriers / change needed" rows={2} value={reviewForm.changeNeeded} onChange={(value) => setReviewForm({ ...reviewForm, changeNeeded: value })} />
                <Field label="Feed into next plan" rows={2} value={reviewForm.nextWeeklyPlanFeedForward} onChange={(value) => setReviewForm({ ...reviewForm, nextWeeklyPlanFeedForward: value })} />
                <button className="surface-action" type="button" disabled={saving === "review"} onClick={() => submit("review", () => createEarlyYearsEnvironmentReview({ ...reviewForm, classId: selectedClassId, weeklyEnhancementId: selectedEnhancementId }), "Weekly environment review saved.")}>Save Review</button>
              </article>
              <article className="surface-card">
                <h2>Review Principle</h2>
                <p>Beautiful enough to invite. Simple enough to think. Purpose before price.</p>
                <p>Use reviews to adapt provision calmly, not to rank teachers or children.</p>
              </article>
            </section>
          ) : null}
        </>
      )}
    </main>
  );
}
