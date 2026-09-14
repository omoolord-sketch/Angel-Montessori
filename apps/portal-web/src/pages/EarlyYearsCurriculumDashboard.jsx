import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  createEarlyYearsWeeklyPlan,
  dryRunAmesVolumeIIIImport,
  executeAmesVolumeIIIImport,
  getAmesVolumeIIIImportStatus,
  getEarlyYearsCurriculum,
  getEarlyYearsCurriculumFrameworks,
  searchEarlyYearsCurriculum,
} from "../api/services";
import "./PortalSurface.css";

function payloadOf(response) {
  return response?.data || response || {};
}

function roleOf(user) {
  return String(user?.role || "").toUpperCase();
}

function isAdminRole(user) {
  return ["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER"].includes(roleOf(user));
}

function isVolumeImportAdmin(user) {
  return ["ADMIN", "SUPER_ADMIN"].includes(roleOf(user));
}

function textOrDash(value) {
  const text = Array.isArray(value) ? value.filter(Boolean).join(", ") : String(value || "").trim();
  return text || "-";
}

function yesNo(value) {
  return value ? "YES" : "NO";
}

function StatusBadge({ children, tone = "blue" }) {
  return <span className={`eyfs-curriculum-badge ${tone}`}>{children}</span>;
}

function ImportMetric({ label, value, helper }) {
  return (
    <article>
      <span>{label}</span>
      <strong>{value}</strong>
      {helper ? <small>{helper}</small> : null}
    </article>
  );
}

function VolumeIIIImportPanel({
  status,
  dryRun,
  verification,
  busy,
  confirmationReady,
  onConfirmationReady,
  onRefresh,
  onDryRun,
  onExecute,
}) {
  const active = dryRun || status || {};
  const currentCounts = active.currentCounts || {};
  const finalCounts = active.expectedFinalCounts || active.verification?.classCounts || {};
  const protectedSummary = active.protectedCollections || {};
  const alreadyImported = Boolean(active.alreadyImported);
  const dryRunReady = Boolean(dryRun && dryRun.canImport && !dryRun.alreadyImported);

  return (
    <section className="eyfs-volume-import-panel">
      <div className="eyfs-volume-import-head">
        <div>
          <div className="portal-surface-kicker">Admin Only</div>
          <h2>AMES Volume III one-time import</h2>
          <p>
            Import the locked approved Crèche, Nursery, and Reception curriculum from the backend seed source into the persistent JSON database.
          </p>
        </div>
        <div className="eyfs-volume-import-actions">
          <button type="button" onClick={onRefresh} disabled={busy}>{busy ? "Checking" : "Refresh Status"}</button>
          <button type="button" onClick={onDryRun} disabled={busy || alreadyImported}>{busy ? "Running" : "Dry Run"}</button>
        </div>
      </div>

      {alreadyImported ? (
        <div className="eyfs-volume-import-ready">
          <strong>Curriculum already imported</strong>
          <span>The approved 117-week AMES Volume III source is already present and verified.</span>
        </div>
      ) : null}

      <div className="eyfs-volume-import-grid">
        <ImportMetric label="Database" value={yesNo(active.databaseDetected)} helper={active.resolvedDatabasePath || "Not checked"} />
        <ImportMetric label="Existing Total" value={active.existingCurriculumTotal ?? 0} helper="Current approved weeks" />
        <ImportMetric label="Crèche" value={currentCounts["Crèche"] ?? active.crecheCurrentCount ?? 0} helper="Current weeks" />
        <ImportMetric label="Nursery" value={currentCounts.Nursery ?? active.nurseryCurrentCount ?? 0} helper="Current weeks" />
        <ImportMetric label="Reception" value={currentCounts.Reception ?? active.receptionCurrentCount ?? 0} helper="Current weeks" />
        <ImportMetric label="Source" value={active.source || "approved AMES Volume III"} helper={`Version ${active.version || "1.0"}`} />
        <ImportMetric label="Duplicates" value={active.duplicateCount ?? 0} helper="Expected 0" />
        <ImportMetric label="Placeholders" value={active.placeholderCount ?? 0} helper="Expected 0" />
      </div>

      {dryRun ? (
        <div className="eyfs-volume-import-results">
          <div>
            <span>Proposed additions</span>
            <strong>{dryRun.proposedAdditions?.weeks ?? 0} weeks</strong>
            <small>{dryRun.proposedAdditions?.items ?? 0} curriculum items</small>
          </div>
          <div>
            <span>Proposed updates</span>
            <strong>{dryRun.proposedUpdates?.weeks ?? 0} weeks</strong>
            <small>{dryRun.proposedUpdates?.items ?? 0} curriculum items</small>
          </div>
          <div>
            <span>Proposed deletions</span>
            <strong>{dryRun.proposedDeletions?.totalRecords ?? 0}</strong>
            <small>No deletion is permitted</small>
          </div>
          <div>
            <span>Expected final count</span>
            <strong>{dryRun.expectedFinalTotal ?? 0}</strong>
            <small>Crèche {finalCounts["Crèche"] ?? 0}, Nursery {finalCounts.Nursery ?? 0}, Reception {finalCounts.Reception ?? 0}</small>
          </div>
          <div>
            <span>Backup required</span>
            <strong>{yesNo(dryRun.backupRequired)}</strong>
            <small>Created before live write</small>
          </div>
          <div>
            <span>Protected data</span>
            <strong>{protectedSummary.ok === false ? "Blocked" : "Unchanged"}</strong>
            <small>{protectedSummary.checked || 0} collections checked</small>
          </div>
        </div>
      ) : null}

      {dryRunReady ? (
        <div className="eyfs-volume-import-confirm">
          <label>
            <input type="checkbox" checked={confirmationReady} onChange={(event) => onConfirmationReady(event.target.checked)} />
            <span>I confirm this will import only the approved AMES Volume III curriculum into the persistent JSON database.</span>
          </label>
          <button type="button" onClick={onExecute} disabled={busy || !confirmationReady}>
            {busy ? "Importing" : "Import Approved Curriculum"}
          </button>
        </div>
      ) : null}

      {verification ? (
        <div className="eyfs-volume-import-verification">
          <strong>Verification passed</strong>
          <span>
            Total {verification.total}; Crèche {verification.classCounts?.["Crèche"] ?? 0}; Nursery {verification.classCounts?.Nursery ?? 0};
            Reception {verification.classCounts?.Reception ?? 0}; duplicates {verification.duplicateCount}; placeholders {verification.placeholderCount}.
          </span>
        </div>
      ) : null}
    </section>
  );
}

function WeekDetail({ week, areas, onCreatePlan, planSaving }) {
  if (!week) {
    return (
      <section className="eyfs-curriculum-panel">
        <div className="portal-surface-empty">Select a week to view the approved curriculum map.</div>
      </section>
    );
  }

  return (
    <section className="eyfs-curriculum-panel">
      <div className="eyfs-curriculum-detail-head">
        <div>
          <div className="portal-surface-kicker">Curriculum Details</div>
          <h2>{week.weekLabel || `Week ${week.weekNumber}`}: {week.title || "Untitled Week"}</h2>
          <p>{week.bigIdea || "No big idea has been imported yet."}</p>
        </div>
        <button className="eyfs-curriculum-primary-btn" type="button" onClick={() => onCreatePlan(week)} disabled={planSaving}>
          {planSaving ? "Creating" : "Create Weekly Plan From Curriculum"}
        </button>
      </div>

      <div className="eyfs-curriculum-meta-grid">
        <div><span>Main Development</span><strong>{textOrDash(week.mainDevelopment)}</strong></div>
        <div><span>Intent</span><strong>{textOrDash(week.curriculumIntent)}</strong></div>
        <div><span>Calendar</span><strong>{textOrDash(week.calendarStatus)}</strong></div>
        <div><span>Source</span><strong>{textOrDash(week.sourceSection)}</strong></div>
      </div>

      <div className="eyfs-curriculum-area-stack">
        {areas.map((area) => {
          const areaItems = week.areas?.[area.code]?.items || week.items?.filter((item) => item.eyfsArea === area.code) || [];
          return (
            <article className="eyfs-curriculum-area-card" key={area.code}>
              <div className="eyfs-curriculum-area-head">
                <div>
                  <span>{area.group}</span>
                  <h3>{area.name}</h3>
                </div>
                <StatusBadge tone={areaItems.length ? "green" : "muted"}>{areaItems.length} item{areaItems.length === 1 ? "" : "s"}</StatusBadge>
              </div>
              {areaItems.length ? areaItems.map((item) => (
                <div className="eyfs-curriculum-item" key={item.id || item.code}>
                  <h4>{item.title || item.code}</h4>
                  <dl>
                    <dt>Learning Intent</dt><dd>{textOrDash(item.learningIntent)}</dd>
                    <dt>Learning Content</dt><dd>{textOrDash(item.learningContent)}</dd>
                    <dt>Vocabulary</dt><dd>{textOrDash(item.keyVocabulary)}</dd>
                    <dt>Teaching / Provision</dt><dd>{textOrDash(item.teachingGuidance || item.suggestedExperiences)}</dd>
                    <dt>Practical Life</dt><dd>{textOrDash(item.practicalLife)}</dd>
                    <dt>Outdoor Learning</dt><dd>{textOrDash(item.outdoorLearning)}</dd>
                    <dt>Christian Character</dt><dd>{textOrDash(item.christianCharacter)}</dd>
                    <dt>Nigerian / African Context</dt><dd>{textOrDash(item.nigerianAfricanContext)}</dd>
                    <dt>SEND / Access</dt><dd>{textOrDash(item.sendAccess)}</dd>
                    <dt>Assessment Focus</dt><dd>{textOrDash(item.assessmentFocus)}</dd>
                  </dl>
                </div>
              )) : (
                <p className="eyfs-curriculum-muted">No approved content has been imported for this area in this week.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default function EarlyYearsCurriculumDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [setup, setSetup] = useState(null);
  const [curriculum, setCurriculum] = useState(null);
  const [form, setForm] = useState({ sessionId: "", termId: "", classId: "" });
  const [selectedWeekId, setSelectedWeekId] = useState("");
  const [search, setSearch] = useState({ keyword: "", eyfsArea: "", dimension: "" });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [planSaving, setPlanSaving] = useState(false);
  const [importStatus, setImportStatus] = useState(null);
  const [importDryRun, setImportDryRun] = useState(null);
  const [importVerification, setImportVerification] = useState(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importConfirmationReady, setImportConfirmationReady] = useState(false);
  const [importConfirmationText, setImportConfirmationText] = useState("IMPORT_APPROVED_AMES_VOLUME_III");

  const sessions = useMemo(() => setup?.sessions || [], [setup]);
  const terms = useMemo(() => setup?.terms || [], [setup]);
  const classes = useMemo(() => setup?.classes || [], [setup]);
  const areas = useMemo(() => setup?.eyfsAreas || [], [setup]);
  const dimensions = useMemo(() => setup?.amesDimensions || [], [setup]);
  const weeks = curriculum?.weeks || [];
  const selectedWeek = weeks.find((week) => String(week.id) === String(selectedWeekId)) || weeks[0] || null;
  const visibleTerms = useMemo(() => {
    if (!form.sessionId) return terms;
    const scoped = terms.filter((term) => String(term.sessionId || "") === String(form.sessionId));
    return scoped.length ? scoped : terms;
  }, [terms, form.sessionId]);

  const loadSetup = async () => {
    setLoading(true);
    setError("");
    try {
      const data = payloadOf(await getEarlyYearsCurriculumFrameworks());
      setSetup(data);
      const nextClass = form.classId || data.classes?.[0]?.id || "";
      const nextSession = form.sessionId || data.sessions?.find((row) => row.isActive)?.id || data.sessions?.[0]?.id || "";
      const sessionTerms = (data.terms || []).filter((term) => !nextSession || String(term.sessionId || "") === String(nextSession));
      const nextTerm = form.termId || sessionTerms.find((row) => row.isActive)?.id || sessionTerms[0]?.id || data.terms?.[0]?.id || "";
      const nextForm = { classId: nextClass, sessionId: nextSession, termId: nextTerm };
      setForm(nextForm);
      if (isVolumeImportAdmin(user)) await loadVolumeIIIImportStatus(false);
      if (nextClass) await loadCurriculum(nextForm, false);
    } catch (err) {
      setError(err?.response?.data?.message || "Early Years curriculum setup could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  const loadCurriculum = async (filters = form, showLoading = true) => {
    if (!filters.classId) return;
    if (showLoading) setLoading(true);
    setError("");
    setMessage("");
    try {
      const params = { ...filters };
      const hasSearch = search.keyword || search.eyfsArea || search.dimension;
      const data = payloadOf(hasSearch ? await searchEarlyYearsCurriculum({ ...params, ...search }) : await getEarlyYearsCurriculum(params));
      setCurriculum(data);
      setSelectedWeekId(data.weeks?.[0]?.id || "");
    } catch (err) {
      setError(err?.response?.data?.message || "Curriculum could not be loaded for this selection.");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadSetup();
  }, []);

  const loadVolumeIIIImportStatus = async (showBusy = true) => {
    if (!isVolumeImportAdmin(user)) return;
    if (showBusy) setImportBusy(true);
    setError("");
    try {
      const data = payloadOf(await getAmesVolumeIIIImportStatus());
      setImportStatus(data.status || data);
      setImportConfirmationText(data.confirmationText || "IMPORT_APPROVED_AMES_VOLUME_III");
    } catch (err) {
      setError(err?.response?.data?.message || "AMES Volume III import status could not be loaded.");
    } finally {
      if (showBusy) setImportBusy(false);
    }
  };

  const handleVolumeIIIDryRun = async () => {
    setImportBusy(true);
    setError("");
    setMessage("");
    setImportVerification(null);
    setImportConfirmationReady(false);
    try {
      const data = payloadOf(await dryRunAmesVolumeIIIImport());
      const result = data.dryRun || data;
      setImportDryRun(result);
      setImportStatus(result);
      setImportConfirmationText(data.confirmationText || "IMPORT_APPROVED_AMES_VOLUME_III");
      setMessage(result.alreadyImported ? "Curriculum already imported." : "Dry run completed. Review the result before importing.");
    } catch (err) {
      setError(err?.response?.data?.message || "AMES Volume III dry run could not be completed.");
    } finally {
      setImportBusy(false);
    }
  };

  const handleVolumeIIIExecute = async () => {
    if (!importDryRun?.canImport || !importConfirmationReady) return;
    setImportBusy(true);
    setError("");
    setMessage("");
    try {
      const data = payloadOf(await executeAmesVolumeIIIImport({ confirmation: importConfirmationText }));
      const result = data.result || data;
      setImportVerification(result.persistedVerification || result.verification || null);
      setImportStatus(result);
      setImportDryRun(null);
      setImportConfirmationReady(false);
      setMessage(result.result === "ALREADY_IMPORTED" ? "Curriculum already imported." : "AMES Volume III curriculum import completed and verified.");
      await loadVolumeIIIImportStatus(false);
      if (form.classId) await loadCurriculum(form, false);
    } catch (err) {
      setError(err?.response?.data?.message || "AMES Volume III import could not be completed.");
    } finally {
      setImportBusy(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    loadCurriculum(form);
  };

  const handleCreatePlan = async (week) => {
    if (!week?.id) return;
    setPlanSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await createEarlyYearsWeeklyPlan({
        curriculumWeekId: week.id,
        sessionId: form.sessionId,
        termId: form.termId,
      });
      const plan = payloadOf(response)?.plan;
      setMessage(payloadOf(response)?.duplicatePrevented ? "This weekly plan already exists. Opening the existing plan." : "Weekly implementation plan created.");
      if (plan?.id) navigate(`/teacher/early-years/plans/${plan.id}`);
    } catch (err) {
      setError(err?.response?.data?.message || "Weekly implementation plan could not be created.");
    } finally {
      setPlanSaving(false);
    }
  };

  return (
    <div className="portal-surface-page eyfs-curriculum-page">
      <div className="portal-surface-shell">
        <section className="portal-surface-hero">
          <div className="portal-surface-hero-copy">
            <div className="portal-surface-kicker">Early Years Curriculum</div>
            <h1 className="portal-surface-title">AMES Volume III curriculum engine</h1>
            <p className="portal-surface-subtitle">
              View the locked approved master curriculum for Crèche, Nursery, and Reception, then prepare linked teacher planning without altering the source.
            </p>
          </div>
          <div className="portal-surface-actions">
            <Link className="portal-surface-action secondary" to="/portal">Portal Home</Link>
            <button className="portal-surface-action primary" type="button" onClick={loadSetup} disabled={loading}>
              {loading ? "Refreshing" : "Refresh"}
            </button>
          </div>
        </section>

        {error ? <div className="portal-surface-empty academic-alert">{error}</div> : null}
        {message ? <div className="portal-surface-empty eyfs-curriculum-success">{message}</div> : null}

        {isVolumeImportAdmin(user) ? (
          <VolumeIIIImportPanel
            status={importStatus}
            dryRun={importDryRun}
            verification={importVerification}
            busy={importBusy}
            confirmationReady={importConfirmationReady}
            onConfirmationReady={setImportConfirmationReady}
            onRefresh={loadVolumeIIIImportStatus}
            onDryRun={handleVolumeIIIDryRun}
            onExecute={handleVolumeIIIExecute}
          />
        ) : null}

        <section className="eyfs-curriculum-toolbar">
          <form className="eyfs-curriculum-form" onSubmit={handleSubmit}>
            <label>
              <span>Academic Session</span>
              <select value={form.sessionId} onChange={(event) => setForm((prev) => ({ ...prev, sessionId: event.target.value, termId: "" }))}>
                <option value="">Template / all sessions</option>
                {sessions.map((session) => <option key={session.id} value={session.id}>{session.sessionName}</option>)}
              </select>
            </label>
            <label>
              <span>Term</span>
              <select value={form.termId} onChange={(event) => setForm((prev) => ({ ...prev, termId: event.target.value }))}>
                <option value="">Select term</option>
                {visibleTerms.map((term) => <option key={term.id} value={term.id}>{term.termName}</option>)}
              </select>
            </label>
            <label>
              <span>Class</span>
              <select value={form.classId} onChange={(event) => setForm((prev) => ({ ...prev, classId: event.target.value }))}>
                <option value="">Select class</option>
                {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label>
              <span>Keyword</span>
              <input value={search.keyword} onChange={(event) => setSearch((prev) => ({ ...prev, keyword: event.target.value }))} placeholder="Search curriculum..." />
            </label>
            <label>
              <span>EYFS Area</span>
              <select value={search.eyfsArea} onChange={(event) => setSearch((prev) => ({ ...prev, eyfsArea: event.target.value }))}>
                <option value="">All areas</option>
                {areas.map((area) => <option key={area.code} value={area.code}>{area.name}</option>)}
              </select>
            </label>
            <label>
              <span>AMES Dimension</span>
              <select value={search.dimension} onChange={(event) => setSearch((prev) => ({ ...prev, dimension: event.target.value }))}>
                <option value="">All dimensions</option>
                {dimensions.map((dimension) => <option key={dimension.code} value={dimension.code}>{dimension.name}</option>)}
              </select>
            </label>
            <button type="submit" disabled={loading || !form.classId}>{loading ? "Loading" : "Apply"}</button>
          </form>
        </section>

        <section className="eyfs-curriculum-summary-grid">
          <article>
            <span>Framework</span>
            <strong>{curriculum?.framework?.name || setup?.framework?.name || "AMES Volume III"}</strong>
            <small>{curriculum?.framework?.status || setup?.framework?.status || "APPROVED_LOCKED"}</small>
          </article>
          <article>
            <span>Version</span>
            <strong>{curriculum?.framework?.version || setup?.framework?.version || "1.0"}</strong>
            <small>View Version</small>
          </article>
          <article>
            <span>Developmental Journey</span>
            <strong>{textOrDash(curriculum?.developmentalJourney?.journey || curriculum?.curriculumTerms?.[0]?.developmentalJourney)}</strong>
            <small>View Curriculum Map</small>
          </article>
          <article>
            <span>Weeks Imported</span>
            <strong>{weeks.length}</strong>
            <small>{curriculum?.sourceReady ? "Approved content available" : "Awaiting source import"}</small>
          </article>
        </section>

        {!curriculum?.sourceReady ? (
          <section className="eyfs-curriculum-source-warning">
            <div>
              <div className="portal-surface-kicker">Source Required</div>
              <h2>Approved Volume III content has not been imported for this selection.</h2>
              <p>{curriculum?.sourceMessage || "Upload the approved master JSON seed before teachers can use the week-by-week curriculum."}</p>
            </div>
            {isAdminRole(user) ? (
              <div className="eyfs-curriculum-source-actions">
                <StatusBadge tone="gold">View Source</StatusBadge>
                <StatusBadge tone="blue">Import Status</StatusBadge>
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="eyfs-curriculum-layout">
          <aside className="eyfs-curriculum-week-list">
            <div className="portal-surface-kicker">Weeks</div>
            {weeks.length ? weeks.map((week) => (
              <button
                key={week.id}
                type="button"
                className={String(selectedWeek?.id) === String(week.id) ? "active" : ""}
                onClick={() => setSelectedWeekId(week.id)}
              >
                <span>{week.weekLabel || `Week ${week.weekNumber}`}</span>
                <strong>{week.title || "Untitled Week"}</strong>
                <small>{week.bigIdea || week.mainDevelopment || "Curriculum details"}</small>
                <em>{week.isFlexibleWeek ? "Flexible" : week.calendarStatus || "Upcoming"}</em>
              </button>
            )) : (
              <div className="portal-surface-empty">No weeks imported yet.</div>
            )}
          </aside>
          <WeekDetail week={selectedWeek} areas={areas} onCreatePlan={handleCreatePlan} planSaving={planSaving} />
        </section>
      </div>
    </div>
  );
}
