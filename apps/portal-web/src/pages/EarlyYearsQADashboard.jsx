import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  createEarlyYearsQAAction,
  createEarlyYearsQAEnvironmentWalk,
  createEarlyYearsQALeadershipNote,
  createEarlyYearsQAModeration,
  getEarlyYearsQAActions,
  getEarlyYearsQAAssessment,
  getEarlyYearsQACurriculum,
  getEarlyYearsQADashboard,
  getEarlyYearsQADataQuality,
  getEarlyYearsQAEnvironment,
  getEarlyYearsQAInclusion,
  getEarlyYearsQAJournal,
  getEarlyYearsQALiteracy,
  getEarlyYearsQAModeration,
  getEarlyYearsQAParentPartnership,
  getEarlyYearsQAPlanning,
  getEarlyYearsQAReporting,
  getEarlyYearsQASystemHealth,
  getEarlyYearsQATransition,
  getMyEarlyYearsQATasks,
  runEarlyYearsQAAudit,
  updateEarlyYearsQAAction,
} from "../api/services";
import "./PortalSurface.css";

function payloadOf(response) {
  return response?.data || response || {};
}

function roleOf(user) {
  return String(user?.role || user?.originalRole || "").toUpperCase();
}

function isLeader(user) {
  return ["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER", "HEAD_OF_SCHOOL", "PROPRIETOR"].includes(roleOf(user));
}

function labelize(value) {
  return String(value || "").replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function activeId(rows = []) {
  return rows.find((row) => row.isActive)?.id || rows.find((row) => row.isActive)?.sessionName || rows[0]?.id || "";
}

function Field({ label, value, onChange, children, rows = 1, type = "text", hint = "" }) {
  return (
    <label className="inclusion-field">
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

function Chip({ children, tone = "" }) {
  return <span className={`inclusion-chip ${tone}`}>{children}</span>;
}

function Empty({ children }) {
  return <div className="portal-surface-empty">{children}</div>;
}

function SummaryBlock({ summary = {} }) {
  const rows = Object.entries(summary).filter(([key]) => !["status"].includes(key));
  if (!rows.length) return <Empty>No summary is available yet.</Empty>;
  return (
    <div className="inclusion-stat-grid">
      {rows.map(([key, value]) => (
        <div className="inclusion-stat-card" key={key}>
          <span>{labelize(key)}</span>
          <strong>{String(value)}</strong>
        </div>
      ))}
    </div>
  );
}

function StatusChip({ value }) {
  const key = String(value || "").toUpperCase();
  return <Chip tone={["ACTION_REQUIRED", "CRITICAL", "ACTION_NEEDED", "REVIEW_REQUIRED"].includes(key) ? "warn" : ""}>{labelize(key || "Info")}</Chip>;
}

function ListCard({ title, children, meta, status }) {
  return (
    <article className="inclusion-card">
      <div>
        <h3>{title}</h3>
        {status ? <StatusChip value={status} /> : null}
      </div>
      {meta ? <small>{meta}</small> : null}
      {children}
    </article>
  );
}

const domainFetchers = {
  curriculum: getEarlyYearsQACurriculum,
  planning: getEarlyYearsQAPlanning,
  assessment: getEarlyYearsQAAssessment,
  journal: getEarlyYearsQAJournal,
  literacy: getEarlyYearsQALiteracy,
  environment: getEarlyYearsQAEnvironment,
  inclusion: getEarlyYearsQAInclusion,
  parent: getEarlyYearsQAParentPartnership,
  reporting: getEarlyYearsQAReporting,
  transition: getEarlyYearsQATransition,
  moderation: getEarlyYearsQAModeration,
  actions: getEarlyYearsQAActions,
  "data-quality": getEarlyYearsQADataQuality,
  "system-health": getEarlyYearsQASystemHealth,
  tasks: getMyEarlyYearsQATasks,
};

const tabs = [
  ["overview", "Overview"],
  ["curriculum", "Curriculum"],
  ["planning", "Planning"],
  ["assessment", "Assessment"],
  ["journal", "Journals"],
  ["literacy", "Literacy"],
  ["environment", "Environment"],
  ["inclusion", "Inclusion"],
  ["parent", "Parents"],
  ["reporting", "Reporting"],
  ["transition", "Transition"],
  ["moderation", "Moderation"],
  ["actions", "Actions"],
  ["data-quality", "Data Quality"],
  ["system-health", "System Health"],
  ["tasks", "My Tasks"],
];

export default function EarlyYearsQADashboard() {
  const { user } = useAuth();
  const leader = isLeader(user);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState(leader ? "overview" : "tasks");
  const [dashboard, setDashboard] = useState(null);
  const [domainData, setDomainData] = useState({});
  const [filters, setFilters] = useState({ academicSessionId: "", termId: "", classId: "", module: "" });
  const [actionForm, setActionForm] = useState({ title: "", module: "PLANNING", priority: "NORMAL", severity: "REVIEW", assignedToId: "", classId: "", issueSummary: "", supportPlan: "", dueDate: "" });
  const [moderationForm, setModerationForm] = useState({ evidenceType: "OBSERVATION", evidenceId: "", module: "ASSESSMENT", classId: "", teacherId: "", reviewFocus: "", leadershipFeedback: "", agreedSupport: "" });
  const [walkForm, setWalkForm] = useState({ classId: "", focusAreas: "", strengthsObserved: "", supportNeeded: "", followUpActions: "" });
  const [noteForm, setNoteForm] = useState({ module: "SYSTEM_HEALTH", title: "", note: "", followUpNeeded: false });
  const [audit, setAudit] = useState(null);

  const setup = dashboard?.setup || domainData?.setup || {};
  const currentData = domainData?.[tab] || {};
  const visibleTabs = useMemo(() => tabs.filter(([key]) => leader || !["moderation", "data-quality", "system-health"].includes(key)), [leader]);

  const setFilter = (field, value) => setFilters((current) => ({ ...current, [field]: value }));
  const setActionField = (field, value) => setActionForm((current) => ({ ...current, [field]: value }));
  const setModerationField = (field, value) => setModerationForm((current) => ({ ...current, [field]: value }));
  const setWalkField = (field, value) => setWalkForm((current) => ({ ...current, [field]: value }));
  const setNoteField = (field, value) => setNoteForm((current) => ({ ...current, [field]: value }));

  const loadDashboard = useCallback(async (nextFilters = filters) => {
    setLoading(true);
    setError("");
    try {
      const data = payloadOf(await getEarlyYearsQADashboard(nextFilters));
      setDashboard(data);
      setFilters((current) => ({
        ...current,
        academicSessionId: current.academicSessionId || activeId(data.setup?.sessions || data.sessions || []),
        termId: current.termId || activeId(data.setup?.terms || data.terms || []),
      }));
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Could not load Early Years quality assurance.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadTab = useCallback(async (nextTab = tab, nextFilters = filters) => {
    if (nextTab === "overview") return;
    const fetcher = domainFetchers[nextTab];
    if (!fetcher) return;
    setSaving(true);
    setError("");
    try {
      const data = payloadOf(await fetcher(nextFilters));
      setDomainData((current) => ({ ...current, [nextTab]: data, setup: data.setup || current.setup }));
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Could not load the selected QA section.");
    } finally {
      setSaving(false);
    }
  }, [filters, tab]);

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    loadTab(tab, filters);
  }, [tab]);

  const applyFilters = async () => {
    await loadDashboard(filters);
    await loadTab(tab, filters);
  };

  const createAction = async () => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await createEarlyYearsQAAction({ ...actionForm, academicSessionId: filters.academicSessionId, termId: filters.termId, classId: actionForm.classId || filters.classId });
      setNotice("Quality action created.");
      setActionForm({ title: "", module: "PLANNING", priority: "NORMAL", severity: "REVIEW", assignedToId: "", classId: "", issueSummary: "", supportPlan: "", dueDate: "" });
      await loadDashboard(filters);
      await loadTab("actions", filters);
      setTab("actions");
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Could not create the QA action.");
    } finally {
      setSaving(false);
    }
  };

  const updateActionStatus = async (id, status) => {
    setSaving(true);
    setError("");
    try {
      await updateEarlyYearsQAAction(id, { status });
      await loadDashboard(filters);
      await loadTab(tab, filters);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Could not update the QA action.");
    } finally {
      setSaving(false);
    }
  };

  const createModeration = async () => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await createEarlyYearsQAModeration({ ...moderationForm, academicSessionId: filters.academicSessionId, termId: filters.termId });
      setNotice("Moderation record created.");
      setModerationForm({ evidenceType: "OBSERVATION", evidenceId: "", module: "ASSESSMENT", classId: "", teacherId: "", reviewFocus: "", leadershipFeedback: "", agreedSupport: "" });
      await loadTab("moderation", filters);
      setTab("moderation");
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Could not create the moderation record.");
    } finally {
      setSaving(false);
    }
  };

  const createWalk = async () => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await createEarlyYearsQAEnvironmentWalk({ ...walkForm, academicSessionId: filters.academicSessionId, termId: filters.termId, classId: walkForm.classId || filters.classId });
      setNotice("Environment walk recorded.");
      setWalkForm({ classId: "", focusAreas: "", strengthsObserved: "", supportNeeded: "", followUpActions: "" });
      await loadTab("environment", filters);
      setTab("environment");
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Could not record the environment walk.");
    } finally {
      setSaving(false);
    }
  };

  const createNote = async () => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await createEarlyYearsQALeadershipNote({ ...noteForm, academicSessionId: filters.academicSessionId, termId: filters.termId, classId: filters.classId });
      setNotice("Leadership note saved.");
      setNoteForm({ module: "SYSTEM_HEALTH", title: "", note: "", followUpNeeded: false });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Could not save the leadership note.");
    } finally {
      setSaving(false);
    }
  };

  const runAudit = async () => {
    setSaving(true);
    setError("");
    try {
      const data = payloadOf(await runEarlyYearsQAAudit(filters));
      setAudit(data.audit || data);
      setNotice("System integrity audit completed.");
      await loadDashboard(filters);
      await loadTab("system-health", filters);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Could not run the system integrity audit.");
    } finally {
      setSaving(false);
    }
  };

  const renderFilters = () => (
    <div className="inclusion-toolbar">
      <Field label="Session">
        <select value={filters.academicSessionId} onChange={(event) => setFilter("academicSessionId", event.target.value)}>
          <option value="">Active session</option>
          {(setup.sessions || []).map((session) => <option key={session.id || session.sessionName} value={session.id || session.sessionName}>{session.sessionName || session.name || session.id}</option>)}
        </select>
      </Field>
      <Field label="Term">
        <select value={filters.termId} onChange={(event) => setFilter("termId", event.target.value)}>
          <option value="">Active term</option>
          {(setup.terms || []).map((term) => <option key={term.id || term.termName} value={term.id || term.termName}>{term.termName || term.name || term.id}</option>)}
        </select>
      </Field>
      <Field label="Class">
        <select value={filters.classId} onChange={(event) => setFilter("classId", event.target.value)}>
          <option value="">All classes</option>
          {(setup.classes || []).map((row) => <option key={row.id || row.className || row.name} value={row.id || row.className || row.name}>{row.name || row.className || row.id}</option>)}
        </select>
      </Field>
      <button type="button" onClick={applyFilters} disabled={saving}>Refresh QA</button>
    </div>
  );

  const renderOverview = () => (
    <>
      <div className="inclusion-stat-grid">
        {(dashboard?.cards || []).map((card) => (
          <div className="inclusion-stat-card" key={card.key}>
            <span>{card.label}</span>
            <strong>{String(card.value)}</strong>
            <StatusChip value={card.status} />
          </div>
        ))}
      </div>
      <div className="inclusion-grid">
        <section className="inclusion-panel">
          <h2>Quality Cycle</h2>
          <div className="inclusion-cycle">
            {(dashboard?.cycle || []).map((stage) => <Chip key={stage}>{labelize(stage)}</Chip>)}
          </div>
          <p className="inclusion-muted">Review, identify, support, follow up, improve, and embed.</p>
        </section>
        <section className="inclusion-panel">
          <h2>Safeguards</h2>
          <div className="inclusion-cycle">
            <Chip>No league tables</Chip>
            <Chip>No child comparison</Chip>
            <Chip>No teacher comparison</Chip>
            <Chip>No EYFS percentages</Chip>
          </div>
        </section>
      </div>
    </>
  );

  const renderCurriculum = () => (
    <section className="inclusion-panel wide">
      <h2>Curriculum Coverage Timeline</h2>
      <SummaryBlock summary={currentData.summary} />
      <div className="inclusion-list">
        {(currentData.timeline || []).slice(0, 60).map((row) => (
          <ListCard key={`${row.classId}-${row.weekNumber}`} title={`${row.className} - Week ${row.weekNumber}`} status={row.status} meta={row.weekTitle}>
            <p>{row.curriculumAvailable ? "Curriculum available" : "Curriculum not found"} | {row.planCreated ? "Plan created" : "Plan needed"} | {row.teachingRecorded ? "Teaching recorded" : "Teaching record needed"} | {row.weeklyReviewCompleted ? "Review complete" : "Review needed"}</p>
          </ListCard>
        ))}
      </div>
    </section>
  );

  const renderPlanning = () => (
    <section className="inclusion-panel wide">
      <h2>Planning Quality Checks</h2>
      <SummaryBlock summary={currentData.summary} />
      <div className="inclusion-list">
        {(currentData.checklist || []).slice(0, 40).map((row) => (
          <ListCard key={row.id} title={`${row.className} - Week ${row.weekNumber || ""}`} status={row.qaStatus} meta={row.teacherName}>
            <p>{(row.checks || []).join(" ")}</p>
          </ListCard>
        ))}
      </div>
    </section>
  );

  const renderAssessment = () => (
    <section className="inclusion-panel wide">
      <h2>Assessment and Journal QA</h2>
      <SummaryBlock summary={currentData.summary} />
      <div className="inclusion-list">
        {(currentData.childrenNeedingReview || []).slice(0, 40).map((row) => (
          <ListCard key={`${row.studentId}-${row.classId}`} title={row.studentName} status="REVIEW" meta={row.className}>
            <p>Observation or development summary follow-up is needed.</p>
          </ListCard>
        ))}
      </div>
    </section>
  );

  const renderJournal = () => (
    <section className="inclusion-panel wide">
      <h2>Learning Journal QA</h2>
      <SummaryBlock summary={currentData.summary} />
      <div className="inclusion-list">
        {(currentData.entries || []).slice(0, 40).map((row) => (
          <ListCard key={row.id} title={row.title || row.entryType || "Journal entry"} meta={row.studentName || row.date} status={row.visibility}>
            <p>{row.content || "Journal evidence recorded."}</p>
          </ListCard>
        ))}
      </div>
    </section>
  );

  const renderLiteracy = () => (
    <section className="inclusion-panel wide">
      <h2>Reception Literacy QA</h2>
      <SummaryBlock summary={currentData.summary} />
      <ListCard title="SSP Safeguard" status={currentData.sspSafeguard?.productionGpcSequence || "REVIEW"}>
        <p>{currentData.sspSafeguard?.note || "The adopted SSP sequence is checked before literacy QA is used."}</p>
        <p>Configured programme: {currentData.sspSafeguard?.configuredSspProgramme || "NO"} | Sequence records: {currentData.sspSafeguard?.productionSequenceCount || 0}</p>
      </ListCard>
      <div className="inclusion-list">
        {(currentData.reviewsDue || []).slice(0, 40).map((row) => (
          <ListCard key={row.studentId} title={row.studentName} status="REVIEW" meta={row.className}>
            <p>Reception literacy evidence needs review.</p>
          </ListCard>
        ))}
      </div>
    </section>
  );

  const renderEnvironment = () => (
    <section className="inclusion-panel wide">
      <h2>Environment QA</h2>
      <SummaryBlock summary={currentData.summary} />
      {leader ? (
        <div className="inclusion-panel compact">
          <h3>Leadership Environment Walk</h3>
          <Field label="Class">
            <select value={walkForm.classId || filters.classId} onChange={(event) => setWalkField("classId", event.target.value)}>
              <option value="">Select class</option>
              {(setup.classes || []).map((row) => <option key={row.id || row.name} value={row.id || row.name}>{row.name || row.className || row.id}</option>)}
            </select>
          </Field>
          <Field label="Focus areas" value={walkForm.focusAreas} onChange={(value) => setWalkField("focusAreas", value)} />
          <Field label="Strengths observed" value={walkForm.strengthsObserved} onChange={(value) => setWalkField("strengthsObserved", value)} rows={2} />
          <Field label="Support needed" value={walkForm.supportNeeded} onChange={(value) => setWalkField("supportNeeded", value)} rows={2} />
          <Field label="Follow-up actions" value={walkForm.followUpActions} onChange={(value) => setWalkField("followUpActions", value)} rows={2} />
          <button type="button" onClick={createWalk} disabled={saving}>Save Walk</button>
        </div>
      ) : null}
      <div className="inclusion-list">
        {(currentData.actions || []).slice(0, 40).map((row) => (
          <ListCard key={row.id} title={row.title || row.domain || "Environment action"} status={row.status} meta={row.className}>
            <p>{row.action || row.notes || row.description || "Environment follow-up action."}</p>
          </ListCard>
        ))}
      </div>
    </section>
  );

  const renderInclusion = () => (
    <section className="inclusion-panel wide">
      <h2>Inclusion and Parent Partnership QA</h2>
      <SummaryBlock summary={currentData.summary} />
      <div className="inclusion-list">
        {(currentData.openConcerns || []).slice(0, 40).map((row) => (
          <ListCard key={row.id} title={row.studentName || row.concernArea || "Support concern"} status={row.status} meta={row.className}>
            <p>{row.concernSummary || row.summary || "Support concern requires follow-up."}</p>
          </ListCard>
        ))}
      </div>
    </section>
  );

  const renderReporting = () => (
    <section className="inclusion-panel wide">
      <h2>Reporting QA</h2>
      <SummaryBlock summary={currentData.summary} />
      <div className="inclusion-list">
        {(currentData.reports || []).slice(0, 50).map((row) => (
          <ListCard key={row.id} title={row.studentName || "Early Years report"} status={row.reportStatus || row.status} meta={row.className}>
            <p>{row.reportType ? labelize(row.reportType) : "Report record"} | {row.teacherName || "Teacher pending"}</p>
          </ListCard>
        ))}
      </div>
    </section>
  );

  const renderTransition = () => (
    <section className="inclusion-panel wide">
      <h2>Transition QA</h2>
      <SummaryBlock summary={currentData.summary} />
      <div className="inclusion-list">
        {(currentData.transitions || []).slice(0, 50).map((row) => (
          <ListCard key={row.id} title={row.studentName || "Transition profile"} status={row.transitionStatus || row.status} meta={`${row.className || "Reception"} to ${row.receivingClassName || "Basic 1"}`}>
            <p>{row.currentPriorities || row.schoolReadinessSummary || "Transition continuity profile."}</p>
          </ListCard>
        ))}
      </div>
    </section>
  );

  const renderActions = () => {
    const actions = currentData.actions || dashboard?.recentActions || [];
    return (
      <section className="inclusion-panel wide">
        <h2>Leadership Action Tracker</h2>
        {leader ? (
          <div className="inclusion-grid">
            <Field label="Title" value={actionForm.title} onChange={(value) => setActionField("title", value)} />
            <Field label="Module">
              <select value={actionForm.module} onChange={(event) => setActionField("module", event.target.value)}>
                {(setup.modules || []).map((item) => <option key={item} value={item}>{labelize(item)}</option>)}
              </select>
            </Field>
            <Field label="Assigned to">
              <select value={actionForm.assignedToId} onChange={(event) => setActionField("assignedToId", event.target.value)}>
                <option value="">Unassigned</option>
                {(setup.teachers || []).map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
              </select>
            </Field>
            <Field label="Class">
              <select value={actionForm.classId || filters.classId} onChange={(event) => setActionField("classId", event.target.value)}>
                <option value="">Whole Early Years</option>
                {(setup.classes || []).map((row) => <option key={row.id || row.name} value={row.id || row.name}>{row.name || row.className || row.id}</option>)}
              </select>
            </Field>
            <Field label="Due date" type="date" value={actionForm.dueDate} onChange={(value) => setActionField("dueDate", value)} />
            <Field label="Issue summary" rows={2} value={actionForm.issueSummary} onChange={(value) => setActionField("issueSummary", value)} />
            <Field label="Support plan" rows={2} value={actionForm.supportPlan} onChange={(value) => setActionField("supportPlan", value)} />
            <button type="button" onClick={createAction} disabled={saving}>Create Action</button>
          </div>
        ) : null}
        <div className="inclusion-list">
          {actions.length ? actions.map((row) => (
            <ListCard key={row.id} title={row.title} status={row.status} meta={`${labelize(row.module)} | ${row.assignedToName || "Unassigned"}`}>
              <p>{row.issueSummary || "Quality action follow-up."}</p>
              <p>{row.supportPlan}</p>
              <div className="inclusion-actions">
                {["IN_PROGRESS", "COMPLETED", "CLOSED"].map((status) => (
                  <button key={status} type="button" className="secondary" onClick={() => updateActionStatus(row.id, status)}>{labelize(status)}</button>
                ))}
              </div>
            </ListCard>
          )) : <Empty>No quality actions yet.</Empty>}
        </div>
      </section>
    );
  };

  const renderModeration = () => (
    <section className="inclusion-panel wide">
      <h2>Moderation Workspace</h2>
      {leader ? (
        <div className="inclusion-grid">
          <Field label="Evidence type">
            <select value={moderationForm.evidenceType} onChange={(event) => setModerationField("evidenceType", event.target.value)}>
              {["OBSERVATION", "JOURNAL", "PLAN", "REPORT", "ENVIRONMENT", "INCLUSION"].map((item) => <option key={item} value={item}>{labelize(item)}</option>)}
            </select>
          </Field>
          <Field label="Evidence ID" value={moderationForm.evidenceId} onChange={(value) => setModerationField("evidenceId", value)} />
          <Field label="Module">
            <select value={moderationForm.module} onChange={(event) => setModerationField("module", event.target.value)}>
              {(setup.modules || []).map((item) => <option key={item} value={item}>{labelize(item)}</option>)}
            </select>
          </Field>
          <Field label="Review focus" value={moderationForm.reviewFocus} onChange={(value) => setModerationField("reviewFocus", value)} rows={2} />
          <Field label="Leadership feedback" value={moderationForm.leadershipFeedback} onChange={(value) => setModerationField("leadershipFeedback", value)} rows={2} />
          <Field label="Agreed support" value={moderationForm.agreedSupport} onChange={(value) => setModerationField("agreedSupport", value)} rows={2} />
          <button type="button" onClick={createModeration} disabled={saving}>Create Moderation Record</button>
        </div>
      ) : null}
      <div className="inclusion-list">
        {(currentData.moderation || []).map((row) => (
          <ListCard key={row.id} title={`${labelize(row.evidenceType)} moderation`} status={row.status} meta={row.teacherName || row.className}>
            <p>{(row.reviewFocus || []).join(", ")}</p>
            <p>{row.leadershipFeedback}</p>
          </ListCard>
        ))}
      </div>
    </section>
  );

  const renderDataQuality = () => (
    <section className="inclusion-panel wide">
      <h2>Data Quality Engine</h2>
      <SummaryBlock summary={currentData.summary} />
      <div className="inclusion-list">
        {(currentData.alerts || []).length ? currentData.alerts.map((row) => (
          <ListCard key={row.id} title={row.message} status={row.severity} meta={`${row.code} | ${labelize(row.module)}`}>
            <p>{Object.entries(row.details || {}).map(([key, value]) => `${labelize(key)}: ${value}`).join(" | ")}</p>
          </ListCard>
        )) : <Empty>No data integrity alerts for this scope.</Empty>}
      </div>
    </section>
  );

  const renderSystemHealth = () => (
    <section className="inclusion-panel wide">
      <h2>System Health and Integrity</h2>
      <SummaryBlock summary={currentData.summary} />
      {leader ? (
        <div className="inclusion-actions">
          <button type="button" onClick={runAudit} disabled={saving}>Run Integrity Audit</button>
        </div>
      ) : null}
      {audit ? (
        <ListCard title={`Latest audit: ${audit.result}`} status={audit.result} meta={audit.generatedAt}>
          <p>Curriculum weeks: {audit.integrity?.curriculumWeeks || 0} | 117 expected: {String(Boolean(audit.integrity?.curriculumWeeksExpected117))}</p>
          <p>SSP configured: {String(Boolean(audit.integrity?.sspSequenceConfigured))} | Invented sequence count: {audit.integrity?.inventedSspSequenceCount || 0}</p>
        </ListCard>
      ) : null}
      <div className="inclusion-list">
        {(currentData.storage || []).map((row) => (
          <ListCard key={row.key} title={labelize(row.key)} meta={`${row.records} records`} />
        ))}
      </div>
    </section>
  );

  const renderTasks = () => (
    <section className="inclusion-panel wide">
      <h2>My Quality Tasks</h2>
      <SummaryBlock summary={currentData.summary} />
      <div className="inclusion-list">
        {(currentData.actions || []).map((row) => (
          <ListCard key={row.id} title={row.title} status={row.status} meta={labelize(row.module)}>
            <p>{row.supportPlan || row.issueSummary}</p>
          </ListCard>
        ))}
      </div>
    </section>
  );

  const renderParent = () => (
    <section className="inclusion-panel wide">
      <h2>Parent Partnership QA</h2>
      <SummaryBlock summary={currentData.summary} />
      <div className="inclusion-list">
        {(currentData.meetings || []).slice(0, 40).map((row) => (
          <ListCard key={row.id} title={row.studentName || "Parent meeting"} status={row.status || "INFO"} meta={row.meetingDate}>
            <p>{row.agreedActions || row.purpose || "Parent partnership record."}</p>
          </ListCard>
        ))}
      </div>
    </section>
  );

  const renderCurrentTab = () => {
    if (loading) return <Empty>Loading Early Years quality assurance...</Empty>;
    if (tab === "overview") return renderOverview();
    if (tab === "curriculum") return renderCurriculum();
    if (tab === "planning") return renderPlanning();
    if (tab === "assessment") return renderAssessment();
    if (tab === "journal") return renderJournal();
    if (tab === "literacy") return renderLiteracy();
    if (tab === "environment") return renderEnvironment();
    if (tab === "inclusion") return renderInclusion();
    if (tab === "parent") return renderParent();
    if (tab === "reporting") return renderReporting();
    if (tab === "transition") return renderTransition();
    if (tab === "moderation") return renderModeration();
    if (tab === "actions") return renderActions();
    if (tab === "data-quality") return renderDataQuality();
    if (tab === "system-health") return renderSystemHealth();
    if (tab === "tasks") return renderTasks();
    return <Empty>Select a quality assurance section.</Empty>;
  };

  return (
    <main className="portal-surface-page inclusion-surface">
      <section className="portal-surface-hero inclusion-hero">
        <div className="portal-surface-hero-copy">
          <p className="portal-surface-kicker">Angel Montessori School</p>
          <h1 className="portal-surface-title">Early Years Quality Assurance</h1>
          <p className="portal-surface-subtitle">Review evidence, identify support, follow up actions, improve practice, and embed the AMES Early Years system without comparison or competition.</p>
        </div>
        <div className="inclusion-hero-actions">
          <Link className="portal-surface-action secondary" to="/portal">Portal Home</Link>
          <Link className="portal-surface-action secondary" to="/admin/early-years/reports">Reports</Link>
        </div>
      </section>

      {error ? <div className="portal-alert error">{error}</div> : null}
      {notice ? <div className="portal-alert success">{notice}</div> : null}

      {renderFilters()}

      <div className="inclusion-tabs">
        {visibleTabs.map(([key, label]) => (
          <button type="button" key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {leader ? (
        <section className="inclusion-panel">
          <h2>Leadership Note</h2>
          <div className="inclusion-grid">
            <Field label="Module">
              <select value={noteForm.module} onChange={(event) => setNoteField("module", event.target.value)}>
                {(setup.modules || []).map((item) => <option key={item} value={item}>{labelize(item)}</option>)}
              </select>
            </Field>
            <Field label="Title" value={noteForm.title} onChange={(value) => setNoteField("title", value)} />
            <Field label="Note" rows={2} value={noteForm.note} onChange={(value) => setNoteField("note", value)} />
            <button type="button" onClick={createNote} disabled={saving}>Save Note</button>
          </div>
        </section>
      ) : null}

      {saving ? <p className="inclusion-muted">Updating quality assurance data...</p> : null}
      {renderCurrentTab()}
    </main>
  );
}
