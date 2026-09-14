import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  createEarlyYearsConsent,
  createEarlyYearsParentMeeting,
  createEarlyYearsParentSupportSummary,
  createEarlyYearsReferral,
  createEarlyYearsSupportConcern,
  createEarlyYearsSupportPlan,
  createEarlyYearsSupportProfile,
  createEarlyYearsSupportStrategy,
  createEarlyYearsTransitionPlan,
  getEarlyYearsInclusionDashboard,
  getEarlyYearsStudentInclusionProfile,
  getEarlyYearsSupportPlanPrintHtml,
  getEarlyYearsParentMeetingPrintHtml,
  getEarlyYearsTransitionPrintHtml,
  reviewEarlyYearsSupportPlan,
  updateEarlyYearsParentMeeting,
  updateEarlyYearsParentPartnershipProfile,
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

function isParent(user) {
  return roleOf(user) === "PARENT";
}

function isLeader(user) {
  return ["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER"].includes(roleOf(user));
}

function labelize(value) {
  return String(value || "").replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function Field({ label, value, onChange, rows = 1, type = "text", children, hint }) {
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

function firstStudentId(dashboard) {
  return dashboard?.students?.[0]?.id || "";
}

function studentName(students, id) {
  return students.find((student) => String(student.id) === String(id))?.name || "Selected child";
}

function formDefaults(studentId = "", classId = "", setup = {}) {
  const sessionId = setup.sessions?.find((row) => row.isActive)?.id || setup.sessions?.[0]?.id || "";
  const termId = setup.terms?.find((row) => row.isActive)?.id || setup.terms?.[0]?.id || "";
  return {
    profile: {
      studentId,
      classId,
      academicSessionId: sessionId,
      supportLevel: "UNIVERSAL",
      primaryConcernArea: "COMMUNICATION_LANGUAGE",
      strengths: "",
      interests: "",
      whatHelps: "",
      whatMakesParticipationDifficult: "",
      parentPerspective: "",
      childVoice: "",
      homeLanguageInformation: "",
      nextReviewDate: "",
      visibility: "TEACHING_TEAM",
    },
    concern: {
      studentId,
      concernArea: "COMMUNICATION_LANGUAGE",
      objectiveEvidence: "",
      context: "",
      durationOrPattern: "",
      strategiesAlreadyTried: "",
      impactOnParticipation: "",
      parentDiscussionStatus: "PLANNED",
      nextAction: "",
      status: "NOTED",
      visibility: "TEACHING_TEAM",
    },
    plan: {
      studentId,
      academicSessionId: sessionId,
      termId,
      priorityNeed: "",
      desiredOutcome: "",
      strategies: "",
      environmentAdjustments: "",
      communicationStrategies: "",
      adultSupport: "",
      resources: "",
      homeSupport: "",
      parentContribution: "",
      reviewDate: "",
      status: "DRAFT",
      visibility: "TEACHING_TEAM",
    },
    review: {
      supportPlanId: "",
      reviewDate: today(),
      whatWasImplemented: "",
      whatChanged: "",
      parentFeedback: "",
      teacherJudgement: "",
      outcome: "CONTINUE",
      nextReviewDate: "",
      visibility: "TEACHING_TEAM",
    },
    family: {
      preferredContactMethod: "",
      preferredCommunicationLanguage: "",
      keyFamilyContacts: "",
      parentPriorities: "",
      parentConcerns: "",
      familyStrengths: "",
      agreedActions: "",
      homeLanguages: "",
      languagesUnderstood: "",
      languagesSpoken: "",
      interpreterSupportNeeds: "",
    },
    meeting: {
      studentId,
      academicSessionId: sessionId,
      termId,
      meetingDate: today(),
      meetingType: "SUPPORT_REVIEW",
      attendees: "",
      purpose: "",
      childStrengths: "",
      parentViews: "",
      teacherViews: "",
      agreedActions: "",
      schoolActions: "",
      parentActions: "",
      togetherActions: "",
      reviewDate: "",
      parentVisibleSummary: "",
      visibility: "PARENT_VISIBLE",
    },
    referral: {
      studentId,
      referralType: "OTHER",
      referredTo: "",
      reason: "",
      evidenceSummary: "",
      parentAware: true,
      parentConsentStatus: "PENDING",
      status: "PROPOSED",
      visibility: "LEADERSHIP",
    },
    consent: {
      studentId,
      relatedEntityType: "REFERRAL",
      relatedEntityId: "",
      consentStatus: "PENDING",
      purpose: "",
      visibility: "LEADERSHIP",
    },
    transition: {
      studentId,
      receivingClass: "nursery",
      transitionDate: "",
      strengths: "",
      routinesThatHelp: "",
      communicationNeeds: "",
      accessAdjustments: "",
      independence: "",
      supportStrategies: "",
      parentInput: "",
      receivingTeacherNotes: "",
      reviewAfterTransition: "",
      status: "DRAFT",
      visibility: "TEACHING_TEAM",
    },
    strategy: {
      name: "",
      concernAreas: "COMMUNICATION_LANGUAGE",
      description: "",
      classroomUse: "",
      homeUse: "",
      isActive: true,
    },
  };
}

function openHtmlDocument(response, fallbackTitle) {
  const html = payloadOf(response);
  const content = typeof html === "string" ? html : String(response?.data || "");
  const blob = new Blob([content], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  return fallbackTitle;
}

export default function EarlyYearsInclusionDashboard() {
  const { user } = useAuth();
  const parentView = isParent(user);
  const leader = isLeader(user);
  const [dashboard, setDashboard] = useState(null);
  const [detail, setDetail] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [activeTab, setActiveTab] = useState(parentView ? "parent" : "overview");
  const [forms, setForms] = useState(formDefaults());
  const [parentComment, setParentComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const setup = dashboard?.setup || {};
  const students = dashboard?.students || [];
  const filteredStudents = selectedClassId
    ? students.filter((student) => String(student.classId) === String(selectedClassId))
    : students;

  const selectedStudentName = useMemo(
    () => studentName(students, selectedStudentId),
    [students, selectedStudentId],
  );

  const refreshDetail = useCallback(async (studentId = selectedStudentId) => {
    if (!studentId) {
      setDetail(null);
      return null;
    }
    const response = payloadOf(await getEarlyYearsStudentInclusionProfile(studentId));
    setDetail(response);
    return response;
  }, [selectedStudentId]);

  const load = useCallback(async (classId = selectedClassId, studentId = selectedStudentId) => {
    setLoading(true);
    setError("");
    try {
      const response = payloadOf(await getEarlyYearsInclusionDashboard(classId ? { classId } : {}));
      const nextSetup = response.setup || {};
      const nextClassId = classId || response.classes?.[0]?.id || "";
      const nextStudentId = studentId || firstStudentId(response);
      setDashboard(response);
      setSelectedClassId(nextClassId);
      setSelectedStudentId(nextStudentId);
      setForms(formDefaults(nextStudentId, nextClassId, nextSetup));
      if (nextStudentId) await refreshDetail(nextStudentId);
    } catch (err) {
      setError(err?.response?.data?.message || "Early Years inclusion workspace could not load.");
    } finally {
      setLoading(false);
    }
  }, [refreshDetail, selectedClassId, selectedStudentId]);

  useEffect(() => {
    load("", "");
  }, []);

  useEffect(() => {
    if (!selectedStudentId || !setup) return;
    setForms((prev) => {
      const next = formDefaults(selectedStudentId, selectedClassId, setup);
      return Object.fromEntries(Object.entries(prev).map(([key, value]) => [key, { ...next[key], ...value, studentId: selectedStudentId, classId: selectedClassId || value.classId }]));
    });
  }, [selectedStudentId, selectedClassId, setup]);

  async function run(label, action, after = true) {
    setSaving(label);
    setError("");
    setMessage("");
    try {
      await action();
      if (after) {
        const response = payloadOf(await getEarlyYearsInclusionDashboard(selectedClassId ? { classId: selectedClassId } : {}));
        setDashboard(response);
        await refreshDetail(selectedStudentId);
      }
      setMessage(`${label} saved.`);
    } catch (err) {
      setError(err?.response?.data?.message || `${label} could not be saved.`);
    } finally {
      setSaving("");
    }
  }

  function setForm(name, patch) {
    setForms((prev) => ({ ...prev, [name]: { ...prev[name], ...patch } }));
  }

  function handleClassChange(classId) {
    const first = students.find((student) => String(student.classId) === String(classId))?.id || "";
    setSelectedClassId(classId);
    setSelectedStudentId(first);
    load(classId, first);
  }

  function handleStudentChange(studentId) {
    setSelectedStudentId(studentId);
    refreshDetail(studentId);
  }

  async function printSupportPlan(id) {
    await run("Support plan print view", async () => openHtmlDocument(await getEarlyYearsSupportPlanPrintHtml(id), "Support plan"), false);
  }

  async function printMeeting(id) {
    await run("Parent meeting print view", async () => openHtmlDocument(await getEarlyYearsParentMeetingPrintHtml(id), "Parent meeting"), false);
  }

  async function printTransition(id) {
    await run("Transition print view", async () => openHtmlDocument(await getEarlyYearsTransitionPrintHtml(id), "Transition"), false);
  }

  const tabs = parentView
    ? [["parent", "My Child"], ["meetings", "Meetings"], ["plans", "Support"]]
    : [["overview", "Overview"], ["profile", "Profile"], ["concerns", "Concerns"], ["plans", "Plans"], ["partnership", "Parent Partnership"], ["referrals", "Referrals"], ["transitions", "Transition"], ["strategies", "Strategies"]];

  return (
    <div className="portal-surface-page inclusion-surface">
      <div className="portal-surface-shell">
        <section className="portal-surface-hero inclusion-hero">
          <div>
            <p className="portal-surface-kicker">Early Years Inclusion</p>
            <h1>SEND support and parent partnership</h1>
            <p>
              Notice needs early, understand barriers, adapt provision, support participation, review impact, and involve parents with professional care.
            </p>
          </div>
          <div className="inclusion-hero-actions">
            <Link className="portal-surface-action secondary" to="/portal">Portal Home</Link>
            {!parentView ? <Link className="portal-surface-action secondary" to="/teacher/early-years/environment">Environment</Link> : null}
            {!parentView ? <Link className="portal-surface-action" to="/teacher/early-years/assessment">Learning Journal</Link> : null}
          </div>
        </section>

        {message ? <div className="portal-surface-success">{message}</div> : null}
        {error ? <div className="portal-surface-error">{error}</div> : null}
        {loading ? <Empty>Loading Early Years support workspace...</Empty> : null}

        {!loading && dashboard ? (
          <>
            <section className="inclusion-stat-grid">
              <article className="inclusion-stat-card"><span>Monitoring</span><strong>{dashboard.summary?.monitoring || 0}</strong></article>
              <article className="inclusion-stat-card"><span>Active Support</span><strong>{dashboard.summary?.activeSupport || 0}</strong></article>
              <article className="inclusion-stat-card"><span>Reviews Due</span><strong>{dashboard.summary?.reviewsDue || 0}</strong></article>
              <article className="inclusion-stat-card"><span>Parent Meetings Due</span><strong>{dashboard.summary?.parentMeetingsDue || 0}</strong></article>
              <article className="inclusion-stat-card"><span>Transitions</span><strong>{dashboard.summary?.transitionPlans || 0}</strong></article>
            </section>

            <section className="inclusion-toolbar">
              {!parentView ? (
                <Field label="Class">
                  <select value={selectedClassId} onChange={(event) => handleClassChange(event.target.value)}>
                    <option value="">All Early Years classes</option>
                    {dashboard.classes?.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                  </select>
                </Field>
              ) : null}
              <Field label={parentView ? "Child" : "Selected Child"}>
                <select value={selectedStudentId} onChange={(event) => handleStudentChange(event.target.value)}>
                  {filteredStudents.map((student) => <option key={student.id} value={student.id}>{student.name} - {student.className || student.classId}</option>)}
                </select>
              </Field>
              <button className="portal-surface-action secondary" type="button" onClick={() => load(selectedClassId, selectedStudentId)}>Refresh</button>
            </section>

            <section className="inclusion-cycle">
              {(dashboard.cycles?.inclusion || []).map((step) => <Chip key={step}>{labelize(step)}</Chip>)}
            </section>

            <nav className="inclusion-tabs">
              {tabs.map(([key, label]) => (
                <button key={key} className={activeTab === key ? "active" : ""} type="button" onClick={() => setActiveTab(key)}>{label}</button>
              ))}
            </nav>

            {parentView ? (
              <ParentView
                activeTab={activeTab}
                detail={detail}
                parentComment={parentComment}
                selectedStudentName={selectedStudentName}
                setParentComment={setParentComment}
                printMeeting={printMeeting}
                onAcknowledge={(id) => run("Parent acknowledgement", () => updateEarlyYearsParentMeeting(id, { parentComment }))}
              />
            ) : (
              <StaffView
                activeTab={activeTab}
                dashboard={dashboard}
                detail={detail}
                forms={forms}
                leader={leader}
                saving={saving}
                selectedStudentId={selectedStudentId}
                selectedStudentName={selectedStudentName}
                setup={setup}
                setForm={setForm}
                printMeeting={printMeeting}
                printSupportPlan={printSupportPlan}
                printTransition={printTransition}
                run={run}
              />
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

function ParentView({ activeTab, detail, parentComment, selectedStudentName, setParentComment, printMeeting, onAcknowledge }) {
  if (!detail) return <Empty>Select a child to view support information.</Empty>;
  if (activeTab === "meetings") {
    return (
      <section className="inclusion-grid">
        <article className="inclusion-panel wide">
          <h2>Parent partnership meetings</h2>
          <div className="inclusion-list">
            {(detail.meetings || []).map((meeting) => (
              <article className="inclusion-card" key={meeting.id}>
                <div><h3>{meeting.purpose || "Support meeting"}</h3><Chip>{labelize(meeting.acknowledgementStatus)}</Chip></div>
                <p>{meeting.parentVisibleSummary || meeting.agreedActions || "A parent-visible summary will appear here once shared."}</p>
                <Field label="Your comment" value={parentComment} rows={2} onChange={setParentComment} />
                <div className="inclusion-actions">
                  <button type="button" onClick={() => onAcknowledge(meeting.id)}>Acknowledge / Comment</button>
                  <button type="button" className="secondary" onClick={() => printMeeting(meeting.id)}>Print</button>
                </div>
              </article>
            ))}
            {!detail.meetings?.length ? <Empty>No parent meeting summary has been shared yet.</Empty> : null}
          </div>
        </article>
      </section>
    );
  }
  if (activeTab === "plans") {
    return (
      <section className="inclusion-grid">
        <article className="inclusion-panel wide">
          <h2>Support shared with you</h2>
          <div className="inclusion-list">
            {(detail.supportPlans || []).map((plan) => (
              <article className="inclusion-card" key={plan.id}>
                <div><h3>{plan.desiredOutcome}</h3><Chip>{labelize(plan.status)}</Chip></div>
                <p>{plan.priorityNeed}</p>
                <p><strong>School support:</strong> {plan.adultSupport || plan.environmentAdjustments || "Support details will be shared by the school."}</p>
                <p><strong>Home support:</strong> {plan.homeSupport || "No home action has been agreed yet."}</p>
              </article>
            ))}
            {!detail.supportPlans?.length ? <Empty>No parent-visible support plan has been shared yet.</Empty> : null}
          </div>
        </article>
      </section>
    );
  }
  return (
    <section className="inclusion-grid">
      <article className="inclusion-panel wide">
        <h2>{selectedStudentName}</h2>
        <p className="inclusion-muted">Parent-visible support profile</p>
        {detail.profile ? (
          <div className="inclusion-card">
            <h3>Strengths first</h3>
            <p>{detail.profile.strengths || "The school has not shared profile strengths yet."}</p>
            <p><strong>What helps:</strong> {detail.profile.whatHelps || "Support preferences will appear here."}</p>
            <p><strong>Parent perspective:</strong> {detail.profile.parentPerspective || "No parent perspective has been recorded yet."}</p>
          </div>
        ) : <Empty>No parent-visible support profile has been shared yet.</Empty>}
      </article>
    </section>
  );
}

function StaffView({ activeTab, dashboard, detail, forms, leader, saving, selectedStudentId, selectedStudentName, setup, setForm, printMeeting, printSupportPlan, printTransition, run }) {
  const selectedPlans = (dashboard.supportPlans || []).filter((row) => !selectedStudentId || row.studentId === selectedStudentId);
  const selectedMeetings = (dashboard.meetings || []).filter((row) => !selectedStudentId || row.studentId === selectedStudentId);
  const selectedTransitions = (dashboard.transitions || []).filter((row) => !selectedStudentId || row.studentId === selectedStudentId);

  if (activeTab === "overview") {
    return (
      <section className="inclusion-grid">
        <article className="inclusion-panel">
          <h2>Profiles</h2>
          <div className="inclusion-list">
            {(dashboard.profiles || []).slice(0, 8).map((profile) => (
              <article className="inclusion-card compact" key={profile.id}>
                <div><h3>{profile.studentName}</h3><Chip>{labelize(profile.supportLevel)}</Chip></div>
                <p>{profile.strengths || "Strengths should be captured before concerns."}</p>
              </article>
            ))}
            {!dashboard.profiles?.length ? <Empty>No inclusion profile yet.</Empty> : null}
          </div>
        </article>
        <article className="inclusion-panel">
          <h2>Reviews and partnership</h2>
          <div className="inclusion-list">
            {selectedPlans.slice(0, 4).map((plan) => (
              <article className="inclusion-card compact" key={plan.id}>
                <div><h3>{plan.studentName}</h3><Chip>{labelize(plan.status)}</Chip></div>
                <p>{plan.desiredOutcome}</p>
                <small>Review: {plan.reviewDate || "Not set"}</small>
              </article>
            ))}
            {!selectedPlans.length ? <Empty>No support plan for the selected child yet.</Empty> : null}
          </div>
        </article>
      </section>
    );
  }

  if (activeTab === "profile") {
    return (
      <section className="inclusion-grid">
        <article className="inclusion-panel">
          <h2>Create support profile</h2>
          <Field label="Child"><select value={forms.profile.studentId} onChange={(event) => setForm("profile", { studentId: event.target.value })}>{(dashboard.students || []).map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}</select></Field>
          <Field label="Support level"><select value={forms.profile.supportLevel} onChange={(event) => setForm("profile", { supportLevel: event.target.value })}>{(setup.supportLevels || []).map((item) => <option key={item} value={item}>{labelize(item)}</option>)}</select></Field>
          <Field label="Primary concern area"><select value={forms.profile.primaryConcernArea} onChange={(event) => setForm("profile", { primaryConcernArea: event.target.value })}>{(setup.concernAreas || []).map((item) => <option key={item} value={item}>{labelize(item)}</option>)}</select></Field>
          <Field label="Strengths" rows={3} value={forms.profile.strengths} onChange={(value) => setForm("profile", { strengths: value })} />
          <Field label="Interests" rows={2} value={forms.profile.interests} onChange={(value) => setForm("profile", { interests: value })} />
          <Field label="What helps" rows={3} value={forms.profile.whatHelps} onChange={(value) => setForm("profile", { whatHelps: value })} />
          <Field label="What makes participation difficult" rows={3} value={forms.profile.whatMakesParticipationDifficult} onChange={(value) => setForm("profile", { whatMakesParticipationDifficult: value })} />
          <Field label="Parent perspective" rows={3} value={forms.profile.parentPerspective} onChange={(value) => setForm("profile", { parentPerspective: value })} />
          <Field label="Home language information" rows={2} value={forms.profile.homeLanguageInformation} onChange={(value) => setForm("profile", { homeLanguageInformation: value })} />
          <Field label="Next review date" type="date" value={forms.profile.nextReviewDate} onChange={(value) => setForm("profile", { nextReviewDate: value })} />
          <button type="button" disabled={saving === "Support profile"} onClick={() => run("Support profile", () => createEarlyYearsSupportProfile(forms.profile))}>Save Profile</button>
        </article>
        <RecordPanel title={`${selectedStudentName} profile`} items={detail?.profile ? [detail.profile] : []} empty="No profile for the selected child yet." />
      </section>
    );
  }

  if (activeTab === "concerns") {
    return (
      <section className="inclusion-grid">
        <article className="inclusion-panel">
          <h2>Record concern</h2>
          <Field label="Concern area"><select value={forms.concern.concernArea} onChange={(event) => setForm("concern", { concernArea: event.target.value })}>{(setup.concernAreas || []).map((item) => <option key={item} value={item}>{labelize(item)}</option>)}</select></Field>
          <Field label="Context" value={forms.concern.context} onChange={(value) => setForm("concern", { context: value })} />
          <Field label="Objective evidence" rows={4} value={forms.concern.objectiveEvidence} onChange={(value) => setForm("concern", { objectiveEvidence: value })} hint="Describe what was seen or heard. Do not diagnose." />
          <Field label="Strategies already tried" rows={3} value={forms.concern.strategiesAlreadyTried} onChange={(value) => setForm("concern", { strategiesAlreadyTried: value })} />
          <Field label="Impact on participation" rows={3} value={forms.concern.impactOnParticipation} onChange={(value) => setForm("concern", { impactOnParticipation: value })} />
          <Field label="Next action" rows={2} value={forms.concern.nextAction} onChange={(value) => setForm("concern", { nextAction: value })} />
          <button type="button" onClick={() => run("Concern record", () => createEarlyYearsSupportConcern({ ...forms.concern, studentId: selectedStudentId }))}>Save Concern</button>
        </article>
        <RecordPanel title="Recorded concerns" items={detail?.concerns || []} empty="No concerns recorded for this child." />
      </section>
    );
  }

  if (activeTab === "plans") {
    return (
      <section className="inclusion-grid">
        <article className="inclusion-panel">
          <h2>Create support plan</h2>
          <Field label="Priority need" rows={2} value={forms.plan.priorityNeed} onChange={(value) => setForm("plan", { priorityNeed: value })} />
          <Field label="Desired outcome" rows={2} value={forms.plan.desiredOutcome} onChange={(value) => setForm("plan", { desiredOutcome: value })} />
          <Field label="Strategies" rows={3} value={forms.plan.strategies} onChange={(value) => setForm("plan", { strategies: value })} />
          <Field label="Environment adjustments" rows={3} value={forms.plan.environmentAdjustments} onChange={(value) => setForm("plan", { environmentAdjustments: value })} />
          <Field label="Adult support" rows={3} value={forms.plan.adultSupport} onChange={(value) => setForm("plan", { adultSupport: value })} />
          <Field label="Home support" rows={3} value={forms.plan.homeSupport} onChange={(value) => setForm("plan", { homeSupport: value })} />
          <Field label="Parent contribution" rows={3} value={forms.plan.parentContribution} onChange={(value) => setForm("plan", { parentContribution: value })} />
          <Field label="Review date" type="date" value={forms.plan.reviewDate} onChange={(value) => setForm("plan", { reviewDate: value })} />
          <button type="button" onClick={() => run("Support plan", () => createEarlyYearsSupportPlan({ ...forms.plan, studentId: selectedStudentId }))}>Save Plan</button>
        </article>
        <article className="inclusion-panel">
          <h2>Review support plan</h2>
          <Field label="Plan"><select value={forms.review.supportPlanId} onChange={(event) => setForm("review", { supportPlanId: event.target.value })}><option value="">Select plan</option>{selectedPlans.map((plan) => <option key={plan.id} value={plan.id}>{plan.desiredOutcome || plan.id}</option>)}</select></Field>
          <Field label="What was implemented" rows={3} value={forms.review.whatWasImplemented} onChange={(value) => setForm("review", { whatWasImplemented: value })} />
          <Field label="What changed" rows={3} value={forms.review.whatChanged} onChange={(value) => setForm("review", { whatChanged: value })} />
          <Field label="Parent feedback" rows={2} value={forms.review.parentFeedback} onChange={(value) => setForm("review", { parentFeedback: value })} />
          <Field label="Decision"><select value={forms.review.outcome} onChange={(event) => setForm("review", { outcome: event.target.value })}>{(setup.reviewOutcomes || []).map((item) => <option key={item} value={item}>{labelize(item)}</option>)}</select></Field>
          <Field label="Next review" type="date" value={forms.review.nextReviewDate} onChange={(value) => setForm("review", { nextReviewDate: value })} />
          <button type="button" disabled={!forms.review.supportPlanId} onClick={() => run("Support plan review", () => reviewEarlyYearsSupportPlan(forms.review.supportPlanId, forms.review))}>Save Review</button>
        </article>
        <article className="inclusion-panel wide">
          <h2>Support plans</h2>
          <div className="inclusion-list">
            {selectedPlans.map((plan) => (
              <article className="inclusion-card" key={plan.id}>
                <div><h3>{plan.desiredOutcome}</h3><Chip>{labelize(plan.status)}</Chip></div>
                <p>{plan.priorityNeed}</p>
                <button type="button" className="secondary" onClick={() => printSupportPlan(plan.id)}>Print</button>
              </article>
            ))}
            {!selectedPlans.length ? <Empty>No support plans yet.</Empty> : null}
          </div>
        </article>
      </section>
    );
  }

  if (activeTab === "partnership") {
    return (
      <section className="inclusion-grid">
        <article className="inclusion-panel">
          <h2>Family partnership profile</h2>
          <Field label="Preferred contact method" value={forms.family.preferredContactMethod} onChange={(value) => setForm("family", { preferredContactMethod: value })} />
          <Field label="Preferred communication language" value={forms.family.preferredCommunicationLanguage} onChange={(value) => setForm("family", { preferredCommunicationLanguage: value })} />
          <Field label="Home languages" value={forms.family.homeLanguages} onChange={(value) => setForm("family", { homeLanguages: value })} />
          <Field label="Family strengths" rows={2} value={forms.family.familyStrengths} onChange={(value) => setForm("family", { familyStrengths: value })} />
          <Field label="Parent priorities" rows={3} value={forms.family.parentPriorities} onChange={(value) => setForm("family", { parentPriorities: value })} />
          <Field label="Agreed actions" rows={3} value={forms.family.agreedActions} onChange={(value) => setForm("family", { agreedActions: value })} />
          <button type="button" onClick={() => run("Family partnership profile", () => updateEarlyYearsParentPartnershipProfile(selectedStudentId, forms.family))}>Save Family Profile</button>
        </article>
        <article className="inclusion-panel">
          <h2>Parent meeting</h2>
          <Field label="Purpose" rows={2} value={forms.meeting.purpose} onChange={(value) => setForm("meeting", { purpose: value })} />
          <Field label="Child strengths" rows={2} value={forms.meeting.childStrengths} onChange={(value) => setForm("meeting", { childStrengths: value })} />
          <Field label="Parent views" rows={3} value={forms.meeting.parentViews} onChange={(value) => setForm("meeting", { parentViews: value })} />
          <Field label="School views" rows={3} value={forms.meeting.teacherViews} onChange={(value) => setForm("meeting", { teacherViews: value })} />
          <Field label="Agreed actions" rows={3} value={forms.meeting.agreedActions} onChange={(value) => setForm("meeting", { agreedActions: value })} />
          <Field label="Parent-visible summary" rows={3} value={forms.meeting.parentVisibleSummary} onChange={(value) => setForm("meeting", { parentVisibleSummary: value })} />
          <button type="button" onClick={() => run("Parent meeting", () => createEarlyYearsParentMeeting({ ...forms.meeting, studentId: selectedStudentId }))}>Save Meeting</button>
          <button type="button" className="secondary" onClick={() => run("Parent support summary", () => createEarlyYearsParentSupportSummary({ studentId: selectedStudentId, strengths: forms.meeting.childStrengths, currentFocus: forms.meeting.purpose, agreedSchoolSupport: forms.meeting.schoolActions, agreedFamilySupport: forms.meeting.parentActions, reviewDate: forms.meeting.reviewDate }))}>Share Summary</button>
        </article>
        <article className="inclusion-panel wide">
          <h2>Meeting records</h2>
          <div className="inclusion-list">
            {selectedMeetings.map((meeting) => (
              <article className="inclusion-card" key={meeting.id}>
                <div><h3>{meeting.purpose || "Parent partnership meeting"}</h3><Chip>{labelize(meeting.acknowledgementStatus)}</Chip></div>
                <p>{meeting.parentVisibleSummary || meeting.agreedActions}</p>
                <button type="button" className="secondary" onClick={() => printMeeting(meeting.id)}>Print</button>
              </article>
            ))}
            {!selectedMeetings.length ? <Empty>No parent partnership meeting has been recorded yet.</Empty> : null}
          </div>
        </article>
      </section>
    );
  }

  if (activeTab === "referrals") {
    return (
      <section className="inclusion-grid">
        <article className="inclusion-panel">
          <h2>Referral record</h2>
          <Field label="Referred to" value={forms.referral.referredTo} onChange={(value) => setForm("referral", { referredTo: value })} />
          <Field label="Reason" rows={3} value={forms.referral.reason} onChange={(value) => setForm("referral", { reason: value })} />
          <Field label="Evidence summary" rows={3} value={forms.referral.evidenceSummary} onChange={(value) => setForm("referral", { evidenceSummary: value })} />
          <Field label="Consent status"><select value={forms.referral.parentConsentStatus} onChange={(event) => setForm("referral", { parentConsentStatus: event.target.value })}>{(setup.consentStatuses || []).map((item) => <option key={item} value={item}>{labelize(item)}</option>)}</select></Field>
          <button type="button" onClick={() => run("Referral", () => createEarlyYearsReferral({ ...forms.referral, studentId: selectedStudentId }))}>Save Referral</button>
        </article>
        <article className="inclusion-panel">
          <h2>Consent record</h2>
          <Field label="Related record id" value={forms.consent.relatedEntityId} onChange={(value) => setForm("consent", { relatedEntityId: value })} />
          <Field label="Purpose" rows={3} value={forms.consent.purpose} onChange={(value) => setForm("consent", { purpose: value })} />
          <Field label="Consent status"><select value={forms.consent.consentStatus} onChange={(event) => setForm("consent", { consentStatus: event.target.value })}>{(setup.consentStatuses || []).map((item) => <option key={item} value={item}>{labelize(item)}</option>)}</select></Field>
          <button type="button" onClick={() => run("Consent", () => createEarlyYearsConsent({ ...forms.consent, studentId: selectedStudentId }))}>Save Consent</button>
        </article>
        <RecordPanel title="Referral records" items={dashboard.referrals || []} empty="No referral records visible." />
      </section>
    );
  }

  if (activeTab === "transitions") {
    return (
      <section className="inclusion-grid">
        <article className="inclusion-panel">
          <h2>Transition support</h2>
          <Field label="Receiving class" value={forms.transition.receivingClass} onChange={(value) => setForm("transition", { receivingClass: value })} hint="Use nursery, reception, or basic-1." />
          <Field label="Transition date" type="date" value={forms.transition.transitionDate} onChange={(value) => setForm("transition", { transitionDate: value })} />
          <Field label="Strengths" rows={2} value={forms.transition.strengths} onChange={(value) => setForm("transition", { strengths: value })} />
          <Field label="Routines that help" rows={2} value={forms.transition.routinesThatHelp} onChange={(value) => setForm("transition", { routinesThatHelp: value })} />
          <Field label="Access adjustments" rows={3} value={forms.transition.accessAdjustments} onChange={(value) => setForm("transition", { accessAdjustments: value })} />
          <Field label="Successful strategies" rows={3} value={forms.transition.supportStrategies} onChange={(value) => setForm("transition", { supportStrategies: value })} />
          <Field label="Parent input" rows={2} value={forms.transition.parentInput} onChange={(value) => setForm("transition", { parentInput: value })} />
          <Field label="Receiving teacher notes" rows={3} value={forms.transition.receivingTeacherNotes} onChange={(value) => setForm("transition", { receivingTeacherNotes: value })} />
          <Field label="Review after transition" type="date" value={forms.transition.reviewAfterTransition} onChange={(value) => setForm("transition", { reviewAfterTransition: value })} />
          <button type="button" onClick={() => run("Transition support", () => createEarlyYearsTransitionPlan({ ...forms.transition, studentId: selectedStudentId }))}>Save Transition</button>
        </article>
        <article className="inclusion-panel">
          <h2>Transition records</h2>
          <div className="inclusion-list">
            {selectedTransitions.map((transition) => (
              <article className="inclusion-card" key={transition.id}>
                <div><h3>{transition.currentClassName} to {transition.receivingClassName}</h3><Chip>{labelize(transition.status)}</Chip></div>
                <p>{transition.strengths}</p>
                <button type="button" className="secondary" onClick={() => printTransition(transition.id)}>Print</button>
              </article>
            ))}
            {!selectedTransitions.length ? <Empty>No transition support record yet.</Empty> : null}
          </div>
        </article>
      </section>
    );
  }

  return (
    <section className="inclusion-grid">
      <article className="inclusion-panel">
        <h2>Shared strategy library</h2>
        {leader ? (
          <>
            <Field label="Strategy name" value={forms.strategy.name} onChange={(value) => setForm("strategy", { name: value })} />
            <Field label="Concern areas" value={forms.strategy.concernAreas} onChange={(value) => setForm("strategy", { concernAreas: value })} />
            <Field label="Description" rows={3} value={forms.strategy.description} onChange={(value) => setForm("strategy", { description: value })} />
            <Field label="Classroom use" rows={3} value={forms.strategy.classroomUse} onChange={(value) => setForm("strategy", { classroomUse: value })} />
            <Field label="Home use" rows={2} value={forms.strategy.homeUse} onChange={(value) => setForm("strategy", { homeUse: value })} />
            <button type="button" onClick={() => run("Support strategy", () => createEarlyYearsSupportStrategy(forms.strategy))}>Save Strategy</button>
          </>
        ) : <p>Shared strategy templates are managed by academic leadership.</p>}
      </article>
      <RecordPanel title="Available strategies" items={dashboard.strategies || []} empty="No shared strategy templates yet." />
    </section>
  );
}

function RecordPanel({ title, items, empty }) {
  return (
    <article className="inclusion-panel">
      <h2>{title}</h2>
      <div className="inclusion-list">
        {(items || []).map((item) => (
          <article className="inclusion-card" key={item.id}>
            <div>
              <h3>{item.studentName || item.name || item.desiredOutcome || item.reason || item.purpose || "Record"}</h3>
              {item.status || item.supportLevel || item.visibility ? <Chip>{labelize(item.status || item.supportLevel || item.visibility)}</Chip> : null}
            </div>
            <p>{item.strengths || item.priorityNeed || item.objectiveEvidence || item.description || item.parentVisibleSummary || item.evidenceSummary || "No summary recorded."}</p>
          </article>
        ))}
        {!items?.length ? <Empty>{empty}</Empty> : null}
      </div>
    </article>
  );
}
