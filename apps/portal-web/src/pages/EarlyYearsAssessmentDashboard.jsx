import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  completeEarlyYearsObservation,
  createEarlyYearsDevelopmentSummary,
  createEarlyYearsJournalEntry,
  createEarlyYearsObservation,
  createEarlyYearsParentContribution,
  getEarlyYearsAssessmentSetup,
  getEarlyYearsChildProfile,
  getEarlyYearsEvidenceCoverage,
  getEarlyYearsJournalPrintHtml,
  getEarlyYearsNextSteps,
  getEarlyYearsObservations,
  getEarlyYearsParentContributions,
  getEarlyYearsStudentDevelopment,
  getEarlyYearsStudentJournal,
  publishEarlyYearsObservation,
  reviewEarlyYearsObservation,
  reviewEarlyYearsParentContribution,
  updateEarlyYearsChildProfile,
  updateEarlyYearsNextStep,
  updateEarlyYearsObservation,
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

function isParent(user) {
  return roleOf(user) === "PARENT";
}

function displayName(row) {
  return String(row?.name || row?.childName || `${row?.firstName || ""} ${row?.lastName || ""}`).trim() || "Child";
}

function labelize(value) {
  return String(value || "").replace(/_/g, " ");
}

function emptyObservation() {
  return {
    studentId: "",
    classId: "",
    academicSessionId: "",
    termId: "",
    weeklyPlanId: "",
    curriculumWeekId: "",
    curriculumItemId: "",
    observationDate: today(),
    observationType: "EVERYDAY_OBSERVATION",
    context: "",
    provisionArea: "",
    eyfsArea: "COMMUNICATION_LANGUAGE",
    secondaryAreas: [],
    amesDimensions: [],
    title: "",
    objectiveObservation: "",
    childWords: "",
    interpretation: "",
    developmentalDescriptor: "DEVELOPING",
    nextStep: "",
    supportRequired: "",
    challengeRequired: "",
    followUpRequired: false,
    reviewDate: "",
    evidenceType: "NONE",
    evidenceReference: "",
    evidenceAnnotation: "",
    possibleAccessConcern: false,
    safeguardingConcern: false,
    isSignificant: false,
    isIncludedInLearningJournal: false,
    journalVisibility: "INTERNAL",
  };
}

function emptyJournalEntry() {
  return {
    entryType: "CHILD_VOICE",
    title: "",
    date: today(),
    content: "",
    teacherComment: "",
    childVoice: "",
    parentVoice: "",
    eyfsArea: "",
    developmentalDescriptor: "",
    visibility: "INTERNAL",
    isHighlighted: false,
  };
}

function emptySummary(areas = []) {
  return {
    summaryType: "TERMLY",
    selectedArea: areas[0]?.code || "COMMUNICATION_LANGUAGE",
    areaSummaries: areas.reduce((out, area) => {
      out[area.code] = { strengthsProgress: "", currentDevelopment: "", nextPriority: "", descriptor: "" };
      return out;
    }, {}),
    overallLearningBehaviour: "",
    practicalLifeIndependence: "",
    characterResponsibility: "",
    parentPartnershipPriority: "",
    teacherSummary: "",
  };
}

function emptyProfile() {
  return {
    preferredName: "",
    dateOfBirth: "",
    startDate: "",
    keyPersonTeacherName: "",
    homeLanguages: "",
    interests: "",
    familyInformation: "",
    medicalDietaryInformation: "",
    additionalSupport: "",
    strengthsAtEntry: "",
    parentPriorities: "",
  };
}

function Field({ label, value, onChange, rows = 3, type = "text", children, disabled, hint }) {
  return (
    <label className="eyfs-assessment-field">
      <span>{label}</span>
      {children || (rows > 1 ? (
        <textarea value={value || ""} onChange={(event) => onChange(event.target.value)} rows={rows} disabled={disabled} />
      ) : (
        <input type={type} value={value || ""} onChange={(event) => onChange(event.target.value)} disabled={disabled} />
      ))}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

function MultiCheck({ label, options, values, onChange }) {
  const current = new Set(Array.isArray(values) ? values : []);
  return (
    <div className="eyfs-assessment-check-group">
      <span>{label}</span>
      <div>
        {options.map((option) => {
          const value = option.code || option;
          return (
            <label key={value}>
              <input
                type="checkbox"
                checked={current.has(value)}
                onChange={(event) => {
                  const next = new Set(current);
                  if (event.target.checked) next.add(value);
                  else next.delete(value);
                  onChange([...next]);
                }}
              />
              {option.name || labelize(value)}
            </label>
          );
        })}
      </div>
    </div>
  );
}

function StatusBadge({ children, tone = "" }) {
  return <span className={`eyfs-assessment-status ${tone}`}>{children}</span>;
}

export default function EarlyYearsAssessmentDashboard() {
  const { user } = useAuth();
  const parentView = isParent(user);
  const leaderView = isLeader(user);
  const staffView = !parentView;
  const [setup, setSetup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState(parentView ? "journal" : "observations");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [filters, setFilters] = useState({ classId: "", termId: "", eyfsArea: "", status: "" });
  const [observations, setObservations] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState(emptyProfile());
  const [development, setDevelopment] = useState({ areaSummary: [], summaries: [], observations: [], nextSteps: [] });
  const [nextSteps, setNextSteps] = useState([]);
  const [coverage, setCoverage] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [editingObservationId, setEditingObservationId] = useState("");
  const [observationForm, setObservationForm] = useState(emptyObservation());
  const [journalForm, setJournalForm] = useState(emptyJournalEntry());
  const [summaryForm, setSummaryForm] = useState(emptySummary());
  const [parentForm, setParentForm] = useState({ studentId: "", date: today(), title: "", contribution: "", homeLearningObservation: "", photoReference: "" });

  const students = setup?.students || [];
  const classes = setup?.classes || [];
  const areas = setup?.eyfsAreas || [];
  const descriptorNotes = setup?.descriptorNotes || {};
  const weeklyPlans = setup?.weeklyPlans || [];
  const selectedStudent = students.find((row) => String(row.id) === String(selectedStudentId)) || students[0] || null;

  const selectedStudentName = useMemo(() => displayName(selectedStudent), [selectedStudent]);

  const setFormStudent = useCallback((studentId) => {
    const student = students.find((row) => String(row.id) === String(studentId));
    setSelectedStudentId(studentId);
    setObservationForm((prev) => ({ ...prev, studentId, classId: student?.classId || "" }));
    setParentForm((prev) => ({ ...prev, studentId }));
  }, [students]);

  const showError = useCallback((err, fallback = "Request failed") => {
    setError(err?.response?.data?.message || err?.message || fallback);
    setMessage("");
  }, []);

  const loadSetup = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = payloadOf(await getEarlyYearsAssessmentSetup());
      setSetup(data);
      const firstStudent = data.students?.[0] || null;
      const firstArea = data.eyfsAreas?.[0]?.code || "COMMUNICATION_LANGUAGE";
      const nextStudentId = selectedStudentId || firstStudent?.id || "";
      setSelectedStudentId(nextStudentId);
      setObservationForm((prev) => ({
        ...prev,
        studentId: prev.studentId || nextStudentId,
        classId: prev.classId || firstStudent?.classId || "",
        academicSessionId: prev.academicSessionId || data.sessions?.[0]?.id || "",
        termId: prev.termId || data.terms?.[0]?.id || "",
        eyfsArea: prev.eyfsArea || firstArea,
      }));
      setSummaryForm((prev) => {
        const next = emptySummary(data.eyfsAreas || []);
        return prev?.areaSummaries && Object.keys(prev.areaSummaries).length ? prev : next;
      });
      setParentForm((prev) => ({ ...prev, studentId: prev.studentId || nextStudentId }));
    } catch (err) {
      showError(err, "Early Years assessment setup could not load.");
    } finally {
      setLoading(false);
    }
  }, [selectedStudentId, showError]);

  const loadStudentRecords = useCallback(async () => {
    if (!selectedStudentId) return;
    setError("");
    try {
      const [journalRes, profileRes, developmentRes, contributionRes] = await Promise.all([
        getEarlyYearsStudentJournal(selectedStudentId, { termId: filters.termId }),
        getEarlyYearsChildProfile(selectedStudentId),
        getEarlyYearsStudentDevelopment(selectedStudentId, { termId: filters.termId }),
        getEarlyYearsParentContributions({ studentId: selectedStudentId }),
      ]);
      const profilePayload = payloadOf(profileRes).profile || {};
      setJournalEntries(payloadOf(journalRes).entries || []);
      setProfile(profilePayload);
      setProfileForm({
        preferredName: profilePayload.preferredName || "",
        dateOfBirth: profilePayload.dateOfBirth || "",
        startDate: profilePayload.startDate || "",
        keyPersonTeacherName: profilePayload.keyPersonTeacherName || "",
        homeLanguages: (profilePayload.homeLanguages || []).join(", "),
        interests: profilePayload.interests || "",
        familyInformation: profilePayload.familyInformation || "",
        medicalDietaryInformation: profilePayload.medicalDietaryInformation || "",
        additionalSupport: profilePayload.additionalSupport || "",
        strengthsAtEntry: profilePayload.strengthsAtEntry || "",
        parentPriorities: profilePayload.parentPriorities || "",
      });
      setDevelopment(payloadOf(developmentRes));
      setContributions(payloadOf(contributionRes).contributions || []);
    } catch (err) {
      showError(err, "Child assessment records could not load.");
    }
  }, [filters.termId, selectedStudentId, showError]);

  const loadStaffRecords = useCallback(async () => {
    if (!staffView) return;
    setError("");
    try {
      const [observationRes, nextStepRes, coverageRes] = await Promise.all([
        getEarlyYearsObservations({
          studentId: selectedStudentId,
          classId: filters.classId,
          termId: filters.termId,
          eyfsArea: filters.eyfsArea,
          status: filters.status,
        }),
        getEarlyYearsNextSteps({ classId: filters.classId, termId: filters.termId }),
        getEarlyYearsEvidenceCoverage({ classId: filters.classId, onlyGaps: false }),
      ]);
      setObservations(payloadOf(observationRes).observations || []);
      setNextSteps(payloadOf(nextStepRes).nextSteps || []);
      setCoverage(payloadOf(coverageRes).coverage || []);
    } catch (err) {
      showError(err, "Early Years assessment records could not load.");
    }
  }, [filters.classId, filters.eyfsArea, filters.status, filters.termId, selectedStudentId, showError, staffView]);

  useEffect(() => {
    loadSetup();
  }, [loadSetup]);

  useEffect(() => {
    if (setup && selectedStudentId) loadStudentRecords();
  }, [loadStudentRecords, selectedStudentId, setup]);

  useEffect(() => {
    if (setup) loadStaffRecords();
  }, [loadStaffRecords, setup]);

  async function refreshAll() {
    await loadSetup();
    await Promise.all([loadStudentRecords(), loadStaffRecords()]);
  }

  function resetObservationForm() {
    const student = students.find((row) => String(row.id) === String(selectedStudentId));
    setObservationForm({
      ...emptyObservation(),
      studentId: selectedStudentId,
      classId: student?.classId || "",
      academicSessionId: setup?.sessions?.[0]?.id || "",
      termId: setup?.terms?.[0]?.id || "",
      eyfsArea: areas[0]?.code || "COMMUNICATION_LANGUAGE",
    });
  }

  async function saveObservation(markComplete = false) {
    if (observationForm.safeguardingConcern) {
      setError(setup?.safeguardingBoundary || "Use the school's safeguarding reporting procedure immediately.");
      return;
    }
    try {
      const payload = {
        ...observationForm,
        academicSessionId: observationForm.academicSessionId || setup?.sessions?.[0]?.id || "",
        termId: observationForm.termId || setup?.terms?.[0]?.id || "",
      };
      const result = editingObservationId
        ? payloadOf(await updateEarlyYearsObservation(editingObservationId, payload)).observation
        : payloadOf(await createEarlyYearsObservation(payload)).observation;
      if (markComplete) await completeEarlyYearsObservation(result.id);
      setMessage(markComplete ? "Observation completed." : editingObservationId ? "Draft observation updated." : "Observation draft saved.");
      setEditingObservationId("");
      resetObservationForm();
      await refreshAll();
    } catch (err) {
      showError(err, "Observation could not be saved.");
    }
  }

  function loadDraft(observation) {
    setEditingObservationId(observation.id);
    setObservationForm({
      ...emptyObservation(),
      ...observation,
      safeguardingConcern: false,
      secondaryAreas: observation.secondaryAreas || [],
      amesDimensions: observation.amesDimensions || [],
    });
    setActiveTab("observations");
    setMessage("Draft loaded for editing.");
  }

  async function completeExistingObservation(id) {
    try {
      await completeEarlyYearsObservation(id);
      setMessage("Observation completed.");
      await refreshAll();
    } catch (err) {
      showError(err, "Observation could not be completed.");
    }
  }

  async function publishExistingObservation(id, visibility = "PARENT_VISIBLE") {
    try {
      await publishEarlyYearsObservation(id, { visibility });
      setMessage(visibility === "PARENT_VISIBLE" ? "Journal entry published to parent view." : "Observation added to internal journal.");
      await refreshAll();
    } catch (err) {
      showError(err, "Observation could not be added to the journal.");
    }
  }

  async function moderateObservation(observation) {
    const note = window.prompt("Moderation note", observation.moderationNote || "");
    if (note === null) return;
    try {
      await reviewEarlyYearsObservation(observation.id, {
        moderationNote: note,
        developmentalDescriptor: observation.developmentalDescriptor,
      });
      setMessage("Observation reviewed by leadership.");
      await refreshAll();
    } catch (err) {
      showError(err, "Observation could not be moderated.");
    }
  }

  async function saveProfile() {
    try {
      await updateEarlyYearsChildProfile(selectedStudentId, {
        ...profileForm,
        homeLanguages: profileForm.homeLanguages,
      });
      setMessage("Child profile updated.");
      await refreshAll();
    } catch (err) {
      showError(err, "Child profile could not be updated.");
    }
  }

  async function saveJournalEntry() {
    try {
      const payload = {
        ...journalForm,
        eyfsAreas: journalForm.eyfsArea ? [journalForm.eyfsArea] : [],
      };
      await createEarlyYearsJournalEntry(selectedStudentId, payload);
      setJournalForm(emptyJournalEntry());
      setMessage("Learning journal entry saved.");
      await refreshAll();
    } catch (err) {
      showError(err, "Journal entry could not be saved.");
    }
  }

  async function saveDevelopmentSummary() {
    try {
      await createEarlyYearsDevelopmentSummary(selectedStudentId, {
        ...summaryForm,
        academicSessionId: observationForm.academicSessionId || setup?.sessions?.[0]?.id || "",
        termId: observationForm.termId || setup?.terms?.[0]?.id || "",
      });
      setSummaryForm(emptySummary(areas));
      setMessage("Development summary saved.");
      await refreshAll();
    } catch (err) {
      showError(err, "Development summary could not be saved.");
    }
  }

  async function updateNextStep(step, status) {
    try {
      await updateEarlyYearsNextStep(step.id, { status });
      setMessage("Next step updated.");
      await refreshAll();
    } catch (err) {
      showError(err, "Next step could not be updated.");
    }
  }

  async function saveParentContribution() {
    try {
      await createEarlyYearsParentContribution(parentForm);
      setParentForm({ studentId: selectedStudentId, date: today(), title: "", contribution: "", homeLearningObservation: "", photoReference: "" });
      setMessage(parentView ? "Contribution sent for school review." : "Parent contribution saved.");
      await refreshAll();
    } catch (err) {
      showError(err, "Parent contribution could not be saved.");
    }
  }

  async function reviewContribution(row, status) {
    try {
      await reviewEarlyYearsParentContribution(row.id, { status, teacherResponse: row.teacherResponse || "Reviewed by school." });
      setMessage(status === "APPROVED" ? "Parent contribution approved and added to journal." : "Parent contribution returned.");
      await refreshAll();
    } catch (err) {
      showError(err, "Parent contribution could not be reviewed.");
    }
  }

  async function printJournal() {
    try {
      const response = await getEarlyYearsJournalPrintHtml(selectedStudentId, { termId: filters.termId });
      const html = response?.data || response;
      const popup = window.open("", "_blank", "noopener,noreferrer");
      if (popup) {
        popup.document.open();
        popup.document.write(html);
        popup.document.close();
      } else {
        setError("Your browser blocked the print window. Please allow pop-ups for the portal and try again.");
      }
    } catch (err) {
      showError(err, "Print view could not be opened.");
    }
  }

  const tabs = parentView
    ? [
      ["journal", "Learning Journal"],
      ["contributions", "Parent Contribution"],
      ["profile", "Child Profile"],
    ]
    : [
      ["observations", "Observations"],
      ["journal", "Learning Journal"],
      ["development", "Development"],
      ["nextSteps", "Next Steps"],
      ["coverage", "Coverage"],
      ["contributions", "Parent Contributions"],
      ["profile", "Child Profile"],
    ];

  return (
    <div className="portal-surface-page eyfs-assessment-page">
      <div className="portal-surface-shell">
        <section className="portal-surface-hero eyfs-assessment-hero">
          <div className="portal-surface-hero-copy">
            <div className="portal-surface-kicker">Early Years Assessment</div>
            <h1 className="portal-surface-title">Observe, interpret, respond, and review</h1>
            <p className="portal-surface-subtitle">
              Child-level AMES observation records, developmental summaries, next steps, and meaningful learning journals.
            </p>
          </div>
          <div className="portal-surface-actions">
            <Link className="portal-surface-action secondary" to="/portal">Portal Home</Link>
            {staffView ? <Link className="portal-surface-action secondary" to="/teacher/early-years/plans">Weekly Plans</Link> : null}
            <button className="portal-surface-action primary" type="button" onClick={refreshAll} disabled={loading}>Refresh</button>
          </div>
        </section>

        {error ? <div className="portal-surface-empty academic-alert">{error}</div> : null}
        {message ? <div className="portal-surface-empty eyfs-curriculum-success">{message}</div> : null}
        {loading ? <div className="portal-surface-empty">Loading Early Years assessment workspace...</div> : null}

        {!loading && !students.length ? (
          <div className="portal-surface-empty">No Early Years children are available for this account.</div>
        ) : null}

        {!loading && students.length ? (
          <>
            <section className="eyfs-assessment-toolbar">
              <label>
                <span>Child</span>
                <select value={selectedStudentId} onChange={(event) => setFormStudent(event.target.value)}>
                  {students.map((student) => <option key={student.id} value={student.id}>{displayName(student)} - {student.className || student.classId}</option>)}
                </select>
              </label>
              {staffView ? (
                <>
                  <label>
                    <span>Class</span>
                    <select value={filters.classId} onChange={(event) => setFilters((prev) => ({ ...prev, classId: event.target.value }))}>
                      <option value="">All classes</option>
                      {classes.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Term</span>
                    <select value={filters.termId} onChange={(event) => setFilters((prev) => ({ ...prev, termId: event.target.value }))}>
                      <option value="">All terms</option>
                      {(setup?.terms || []).map((term) => <option key={term.id} value={term.id}>{term.termName || term.name}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Area</span>
                    <select value={filters.eyfsArea} onChange={(event) => setFilters((prev) => ({ ...prev, eyfsArea: event.target.value }))}>
                      <option value="">All areas</option>
                      {areas.map((area) => <option key={area.code} value={area.code}>{area.name}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Status</span>
                    <select value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}>
                      <option value="">All statuses</option>
                      {(setup?.observationStatuses || []).map((status) => <option key={status} value={status}>{labelize(status)}</option>)}
                    </select>
                  </label>
                </>
              ) : null}
            </section>

            <nav className="eyfs-assessment-tabs">
              {tabs.map(([key, label]) => (
                <button key={key} type="button" className={activeTab === key ? "active" : ""} onClick={() => setActiveTab(key)}>
                  {label}
                </button>
              ))}
            </nav>

            {activeTab === "observations" && staffView ? (
              <section className="eyfs-assessment-grid">
                <article className="eyfs-assessment-panel">
                  <div className="eyfs-assessment-panel-head">
                    <div>
                      <div className="portal-surface-kicker">Quick Observation</div>
                      <h2>{editingObservationId ? "Edit draft observation" : "Create observation"}</h2>
                    </div>
                    {editingObservationId ? <button type="button" onClick={() => { setEditingObservationId(""); resetObservationForm(); }}>Cancel Edit</button> : null}
                  </div>

                  <div className="eyfs-assessment-form-grid">
                    <Field label="Child" rows={1}>
                      <select value={observationForm.studentId || selectedStudentId} onChange={(event) => setFormStudent(event.target.value)}>
                        {students.map((student) => <option key={student.id} value={student.id}>{displayName(student)}</option>)}
                      </select>
                    </Field>
                    <Field label="Date" rows={1} type="date" value={observationForm.observationDate} onChange={(value) => setObservationForm((prev) => ({ ...prev, observationDate: value }))} />
                    <Field label="Observation Type" rows={1}>
                      <select value={observationForm.observationType} onChange={(event) => setObservationForm((prev) => ({ ...prev, observationType: event.target.value }))}>
                        {(setup?.observationTypes || []).map((type) => <option key={type} value={type}>{labelize(type)}</option>)}
                      </select>
                    </Field>
                    <Field label="EYFS Area" rows={1}>
                      <select value={observationForm.eyfsArea} onChange={(event) => setObservationForm((prev) => ({ ...prev, eyfsArea: event.target.value }))}>
                        {areas.map((area) => <option key={area.code} value={area.code}>{area.name}</option>)}
                      </select>
                    </Field>
                    <Field label="Descriptor" rows={1} hint={descriptorNotes[observationForm.developmentalDescriptor]}>
                      <select value={observationForm.developmentalDescriptor} onChange={(event) => setObservationForm((prev) => ({ ...prev, developmentalDescriptor: event.target.value }))}>
                        {(setup?.descriptors || []).map((descriptor) => <option key={descriptor} value={descriptor}>{labelize(descriptor)}</option>)}
                      </select>
                    </Field>
                    <Field label="Weekly Plan Link" rows={1}>
                      <select value={observationForm.weeklyPlanId} onChange={(event) => setObservationForm((prev) => ({ ...prev, weeklyPlanId: event.target.value }))}>
                        <option value="">Optional plan link</option>
                        {weeklyPlans.map((plan) => <option key={plan.id} value={plan.id}>{plan.className} - {plan.weekLabel || plan.weekNumber}</option>)}
                      </select>
                    </Field>
                  </div>

                  <Field label="Context" rows={2} value={observationForm.context} onChange={(value) => setObservationForm((prev) => ({ ...prev, context: value }))} />
                  <Field label="What Happened?" value={observationForm.objectiveObservation} onChange={(value) => setObservationForm((prev) => ({ ...prev, objectiveObservation: value }))} hint="Keep this factual before interpreting." />
                  <Field label="Child's Words" value={observationForm.childWords} onChange={(value) => setObservationForm((prev) => ({ ...prev, childWords: value }))} />
                  <Field label="What Does This Suggest?" value={observationForm.interpretation} onChange={(value) => setObservationForm((prev) => ({ ...prev, interpretation: value }))} />
                  <Field label="What Should Happen Next?" value={observationForm.nextStep} onChange={(value) => setObservationForm((prev) => ({ ...prev, nextStep: value }))} />
                  <div className="eyfs-assessment-form-grid">
                    <Field label="Support Required" value={observationForm.supportRequired} onChange={(value) => setObservationForm((prev) => ({ ...prev, supportRequired: value }))} />
                    <Field label="Challenge Required" value={observationForm.challengeRequired} onChange={(value) => setObservationForm((prev) => ({ ...prev, challengeRequired: value }))} />
                    <Field label="Review Date" rows={1} type="date" value={observationForm.reviewDate} onChange={(value) => setObservationForm((prev) => ({ ...prev, reviewDate: value }))} />
                    <Field label="Evidence Type" rows={1}>
                      <select value={observationForm.evidenceType} onChange={(event) => setObservationForm((prev) => ({ ...prev, evidenceType: event.target.value }))}>
                        {(setup?.evidenceTypes || []).map((type) => <option key={type} value={type}>{labelize(type)}</option>)}
                      </select>
                    </Field>
                  </div>
                  <Field label="Why Does This Evidence Matter?" value={observationForm.evidenceAnnotation} onChange={(value) => setObservationForm((prev) => ({ ...prev, evidenceAnnotation: value }))} />
                  <MultiCheck label="Secondary Areas" options={areas} values={observationForm.secondaryAreas} onChange={(value) => setObservationForm((prev) => ({ ...prev, secondaryAreas: value }))} />
                  <MultiCheck label="AMES Dimensions" options={setup?.amesDimensions || []} values={observationForm.amesDimensions} onChange={(value) => setObservationForm((prev) => ({ ...prev, amesDimensions: value }))} />
                  <div className="eyfs-assessment-check-row">
                    <label><input type="checkbox" checked={observationForm.isSignificant} onChange={(event) => setObservationForm((prev) => ({ ...prev, isSignificant: event.target.checked }))} /> Significant evidence</label>
                    <label><input type="checkbox" checked={observationForm.isIncludedInLearningJournal} onChange={(event) => setObservationForm((prev) => ({ ...prev, isIncludedInLearningJournal: event.target.checked }))} /> Include in journal</label>
                    <label><input type="checkbox" checked={observationForm.safeguardingConcern} onChange={(event) => setObservationForm((prev) => ({ ...prev, safeguardingConcern: event.target.checked }))} /> Safeguarding concern</label>
                  </div>
                  {observationForm.safeguardingConcern ? <p className="eyfs-assessment-warning">{setup?.safeguardingBoundary}</p> : null}
                  <div className="eyfs-assessment-action-row">
                    <button type="button" onClick={() => saveObservation(false)}>{editingObservationId ? "Update Draft" : "Save Draft"}</button>
                    <button type="button" onClick={() => saveObservation(true)}>Save and Complete</button>
                  </div>
                </article>

                <article className="eyfs-assessment-panel">
                  <div className="eyfs-assessment-panel-head">
                    <div>
                      <div className="portal-surface-kicker">My Observations</div>
                      <h2>{observations.length} records</h2>
                    </div>
                  </div>
                  <div className="eyfs-assessment-list">
                    {observations.length ? observations.map((row) => (
                      <article key={row.id} className="eyfs-assessment-card">
                        <div>
                          <StatusBadge tone={String(row.status || "").toLowerCase()}>{labelize(row.status)}</StatusBadge>
                          <h3>{row.title || row.context || "Learning observation"}</h3>
                          <p><strong>{row.studentName || selectedStudentName}</strong> - {labelize(row.eyfsArea)} - {labelize(row.developmentalDescriptor)}</p>
                          <p>{row.objectiveObservation}</p>
                          {row.interpretation ? <small>Interpretation: {row.interpretation}</small> : null}
                          {row.nextStep ? <small>Next step: {row.nextStep}</small> : null}
                        </div>
                        <div className="eyfs-assessment-action-row">
                          {row.status === "DRAFT" ? <button type="button" onClick={() => loadDraft(row)}>Edit Draft</button> : null}
                          {row.status === "DRAFT" ? <button type="button" onClick={() => completeExistingObservation(row.id)}>Complete</button> : null}
                          <button type="button" onClick={() => publishExistingObservation(row.id, "INTERNAL")}>Internal Journal</button>
                          <button type="button" onClick={() => publishExistingObservation(row.id, "PARENT_VISIBLE")}>Parent Visible</button>
                          {leaderView ? <button type="button" onClick={() => moderateObservation(row)}>Moderate</button> : null}
                        </div>
                      </article>
                    )) : <div className="portal-surface-empty">No observations match these filters yet.</div>}
                  </div>
                </article>
              </section>
            ) : null}

            {activeTab === "journal" ? (
              <section className="eyfs-assessment-grid">
                <article className="eyfs-assessment-panel">
                  <div className="eyfs-assessment-panel-head">
                    <div>
                      <div className="portal-surface-kicker">Learning Journal</div>
                      <h2>{selectedStudentName}</h2>
                    </div>
                    <button type="button" onClick={printJournal}>Print Summary</button>
                  </div>
                  <div className="eyfs-assessment-list">
                    {journalEntries.length ? journalEntries.map((entry) => (
                      <article key={entry.id} className="eyfs-assessment-card">
                        <div>
                          <StatusBadge tone={entry.visibility === "PARENT_VISIBLE" ? "published" : "internal"}>{labelize(entry.entryType)}</StatusBadge>
                          <h3>{entry.title}</h3>
                          <p>{entry.content}</p>
                          {entry.childVoice ? <small>Child voice: {entry.childVoice}</small> : null}
                          {entry.parentVoice ? <small>Parent voice: {entry.parentVoice}</small> : null}
                        </div>
                        <small>{entry.date} - {entry.visibility === "PARENT_VISIBLE" ? "Parent visible" : "Internal"}</small>
                      </article>
                    )) : <div className="portal-surface-empty">No learning journal entries yet.</div>}
                  </div>
                </article>

                {staffView ? (
                  <article className="eyfs-assessment-panel">
                    <div className="portal-surface-kicker">Add Journal Entry</div>
                    <h2>Child voice or work sample</h2>
                    <div className="eyfs-assessment-form-grid">
                      <Field label="Entry Type" rows={1}>
                        <select value={journalForm.entryType} onChange={(event) => setJournalForm((prev) => ({ ...prev, entryType: event.target.value }))}>
                          {(setup?.journalEntryTypes || []).filter((type) => type !== "OBSERVATION").map((type) => <option key={type} value={type}>{labelize(type)}</option>)}
                        </select>
                      </Field>
                      <Field label="Visibility" rows={1}>
                        <select value={journalForm.visibility} onChange={(event) => setJournalForm((prev) => ({ ...prev, visibility: event.target.value }))}>
                          {(setup?.visibilityOptions || []).map((option) => <option key={option} value={option}>{labelize(option)}</option>)}
                        </select>
                      </Field>
                      <Field label="Date" rows={1} type="date" value={journalForm.date} onChange={(value) => setJournalForm((prev) => ({ ...prev, date: value }))} />
                      <Field label="EYFS Area" rows={1}>
                        <select value={journalForm.eyfsArea} onChange={(event) => setJournalForm((prev) => ({ ...prev, eyfsArea: event.target.value }))}>
                          <option value="">No single area</option>
                          {areas.map((area) => <option key={area.code} value={area.code}>{area.name}</option>)}
                        </select>
                      </Field>
                    </div>
                    <Field label="Title" rows={1} value={journalForm.title} onChange={(value) => setJournalForm((prev) => ({ ...prev, title: value }))} />
                    <Field label="Why Does This Matter?" value={journalForm.content} onChange={(value) => setJournalForm((prev) => ({ ...prev, content: value }))} />
                    <Field label="Child Voice" value={journalForm.childVoice} onChange={(value) => setJournalForm((prev) => ({ ...prev, childVoice: value }))} />
                    <Field label="Teacher Comment" value={journalForm.teacherComment} onChange={(value) => setJournalForm((prev) => ({ ...prev, teacherComment: value }))} />
                    <div className="eyfs-assessment-action-row"><button type="button" onClick={saveJournalEntry}>Save Journal Entry</button></div>
                  </article>
                ) : null}
              </section>
            ) : null}

            {activeTab === "development" && staffView ? (
              <section className="eyfs-assessment-grid">
                <article className="eyfs-assessment-panel">
                  <div className="portal-surface-kicker">Development By Area</div>
                  <h2>No scores, percentages or ranking</h2>
                  <div className="eyfs-assessment-area-grid">
                    {(development.areaSummary || []).map((row) => (
                      <article key={row.eyfsArea}>
                        <span>{labelize(row.eyfsArea)}</span>
                        <strong>{labelize(row.latestDescriptor || "No descriptor yet")}</strong>
                        <p>{row.recentEvidenceCount} evidence record(s)</p>
                        <small>{row.currentPriority || "No current priority recorded."}</small>
                      </article>
                    ))}
                  </div>
                </article>
                <article className="eyfs-assessment-panel">
                  <div className="portal-surface-kicker">Periodic Development Summary</div>
                  <h2>Teacher professional judgement</h2>
                  <div className="eyfs-assessment-form-grid">
                    <Field label="Summary Type" rows={1}>
                      <select value={summaryForm.summaryType} onChange={(event) => setSummaryForm((prev) => ({ ...prev, summaryType: event.target.value }))}>
                        {(setup?.summaryTypes || []).map((type) => <option key={type} value={type}>{labelize(type)}</option>)}
                      </select>
                    </Field>
                    <Field label="Area to Edit" rows={1}>
                      <select value={summaryForm.selectedArea} onChange={(event) => setSummaryForm((prev) => ({ ...prev, selectedArea: event.target.value }))}>
                        {areas.map((area) => <option key={area.code} value={area.code}>{area.name}</option>)}
                      </select>
                    </Field>
                    <Field label="Area Descriptor" rows={1}>
                      <select
                        value={summaryForm.areaSummaries?.[summaryForm.selectedArea]?.descriptor || ""}
                        onChange={(event) => setSummaryForm((prev) => ({
                          ...prev,
                          areaSummaries: {
                            ...prev.areaSummaries,
                            [prev.selectedArea]: { ...prev.areaSummaries[prev.selectedArea], descriptor: event.target.value },
                          },
                        }))}
                      >
                        <option value="">No descriptor</option>
                        {(setup?.descriptors || []).map((descriptor) => <option key={descriptor} value={descriptor}>{labelize(descriptor)}</option>)}
                      </select>
                    </Field>
                  </div>
                  {["strengthsProgress", "currentDevelopment", "nextPriority"].map((key) => (
                    <Field
                      key={key}
                      label={labelize(key)}
                      value={summaryForm.areaSummaries?.[summaryForm.selectedArea]?.[key] || ""}
                      onChange={(value) => setSummaryForm((prev) => ({
                        ...prev,
                        areaSummaries: {
                          ...prev.areaSummaries,
                          [prev.selectedArea]: { ...prev.areaSummaries[prev.selectedArea], [key]: value },
                        },
                      }))}
                    />
                  ))}
                  <Field label="Teacher Summary" value={summaryForm.teacherSummary} onChange={(value) => setSummaryForm((prev) => ({ ...prev, teacherSummary: value }))} />
                  <Field label="Overall Learning Behaviour" value={summaryForm.overallLearningBehaviour} onChange={(value) => setSummaryForm((prev) => ({ ...prev, overallLearningBehaviour: value }))} />
                  <Field label="Practical Life / Independence" value={summaryForm.practicalLifeIndependence} onChange={(value) => setSummaryForm((prev) => ({ ...prev, practicalLifeIndependence: value }))} />
                  <Field label="Character / Responsibility" value={summaryForm.characterResponsibility} onChange={(value) => setSummaryForm((prev) => ({ ...prev, characterResponsibility: value }))} />
                  <Field label="Parent Partnership Priority" value={summaryForm.parentPartnershipPriority} onChange={(value) => setSummaryForm((prev) => ({ ...prev, parentPartnershipPriority: value }))} />
                  <div className="eyfs-assessment-action-row"><button type="button" onClick={saveDevelopmentSummary}>Save Summary</button></div>
                </article>
              </section>
            ) : null}

            {activeTab === "nextSteps" && staffView ? (
              <section className="eyfs-assessment-panel">
                <div className="portal-surface-kicker">Next Step Dashboard</div>
                <h2>Open, in-progress and reviewed priorities</h2>
                <div className="eyfs-assessment-list">
                  {nextSteps.length ? nextSteps.map((step) => (
                    <article key={step.id} className="eyfs-assessment-card">
                      <div>
                        <StatusBadge>{labelize(step.status)}</StatusBadge>
                        <h3>{step.description}</h3>
                        <p>{labelize(step.eyfsArea)} - review {step.reviewDate || "when ready"}</p>
                      </div>
                      <select value={step.status} onChange={(event) => updateNextStep(step, event.target.value)}>
                        {(setup?.nextStepStatuses || []).map((status) => <option key={status} value={status}>{labelize(status)}</option>)}
                      </select>
                    </article>
                  )) : <div className="portal-surface-empty">No next steps yet.</div>}
                </div>
              </section>
            ) : null}

            {activeTab === "coverage" && staffView ? (
              <section className="eyfs-assessment-panel">
                <div className="portal-surface-kicker">Evidence Coverage Check</div>
                <h2>Notice children who may be overlooked</h2>
                <p className="eyfs-assessment-muted">This is not a ranking, score, or quota. It only helps staff notice where evidence may be missing.</p>
                <div className="eyfs-assessment-area-grid">
                  {coverage.map((row) => (
                    <article key={row.studentId}>
                      <span>{row.studentName || "Child"}</span>
                      <strong>{row.evidenceCount} evidence record(s)</strong>
                      <p>{row.label}</p>
                      <small>{row.flags.length ? row.flags.map(labelize).join(", ") : "Coverage is present."}</small>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {activeTab === "contributions" ? (
              <section className="eyfs-assessment-grid">
                <article className="eyfs-assessment-panel">
                  <div className="portal-surface-kicker">{parentView ? "Share From Home" : "Parent Contribution"}</div>
                  <h2>Purposeful parent voice</h2>
                  <Field label="Date" rows={1} type="date" value={parentForm.date} onChange={(value) => setParentForm((prev) => ({ ...prev, date: value }))} />
                  <Field label="Title" rows={1} value={parentForm.title} onChange={(value) => setParentForm((prev) => ({ ...prev, title: value }))} />
                  <Field label="Contribution" value={parentForm.contribution} onChange={(value) => setParentForm((prev) => ({ ...prev, contribution: value }))} />
                  <Field label="Home Learning Observation" value={parentForm.homeLearningObservation} onChange={(value) => setParentForm((prev) => ({ ...prev, homeLearningObservation: value }))} />
                  <Field label="Photo / Evidence Reference" rows={1} value={parentForm.photoReference} onChange={(value) => setParentForm((prev) => ({ ...prev, photoReference: value }))} />
                  <div className="eyfs-assessment-action-row"><button type="button" onClick={saveParentContribution}>Save Contribution</button></div>
                </article>
                <article className="eyfs-assessment-panel">
                  <div className="portal-surface-kicker">Contribution Review</div>
                  <h2>{contributions.length} contribution(s)</h2>
                  <div className="eyfs-assessment-list">
                    {contributions.length ? contributions.map((row) => (
                      <article key={row.id} className="eyfs-assessment-card">
                        <div>
                          <StatusBadge>{labelize(row.status)}</StatusBadge>
                          <h3>{row.title}</h3>
                          <p>{row.contribution}</p>
                          {row.homeLearningObservation ? <small>Home learning: {row.homeLearningObservation}</small> : null}
                        </div>
                        {staffView && row.status === "SUBMITTED" ? (
                          <div className="eyfs-assessment-action-row">
                            <button type="button" onClick={() => reviewContribution(row, "APPROVED")}>Approve</button>
                            <button type="button" onClick={() => reviewContribution(row, "RETURNED")}>Return</button>
                          </div>
                        ) : null}
                      </article>
                    )) : <div className="portal-surface-empty">No parent contributions yet.</div>}
                  </div>
                </article>
              </section>
            ) : null}

            {activeTab === "profile" ? (
              <section className="eyfs-assessment-grid">
                <article className="eyfs-assessment-panel">
                  <div className="portal-surface-kicker">Child Profile</div>
                  <h2>{profile?.childName || selectedStudentName}</h2>
                  <div className="eyfs-assessment-profile-grid">
                    <div><span>Preferred Name</span><strong>{profile?.preferredName || "-"}</strong></div>
                    <div><span>Class</span><strong>{profile?.className || selectedStudent?.className || "-"}</strong></div>
                    <div><span>Start Date</span><strong>{profile?.startDate || "-"}</strong></div>
                    <div><span>Key Person</span><strong>{profile?.keyPersonTeacherName || "-"}</strong></div>
                  </div>
                  <p>{profile?.interests || "No interests recorded yet."}</p>
                  <p>{profile?.strengthsAtEntry || "No starting point summary recorded yet."}</p>
                </article>
                {staffView ? (
                  <article className="eyfs-assessment-panel">
                    <div className="portal-surface-kicker">Edit Profile</div>
                    <h2>Starting point and context</h2>
                    <div className="eyfs-assessment-form-grid">
                      <Field label="Preferred Name" rows={1} value={profileForm.preferredName} onChange={(value) => setProfileForm((prev) => ({ ...prev, preferredName: value }))} />
                      <Field label="Date of Birth" rows={1} type="date" value={profileForm.dateOfBirth} onChange={(value) => setProfileForm((prev) => ({ ...prev, dateOfBirth: value }))} />
                      <Field label="Start Date" rows={1} type="date" value={profileForm.startDate} onChange={(value) => setProfileForm((prev) => ({ ...prev, startDate: value }))} />
                      <Field label="Key Person / Teacher" rows={1} value={profileForm.keyPersonTeacherName} onChange={(value) => setProfileForm((prev) => ({ ...prev, keyPersonTeacherName: value }))} />
                    </div>
                    <Field label="Home Language(s)" rows={1} value={profileForm.homeLanguages} onChange={(value) => setProfileForm((prev) => ({ ...prev, homeLanguages: value }))} />
                    <Field label="Interests" value={profileForm.interests} onChange={(value) => setProfileForm((prev) => ({ ...prev, interests: value }))} />
                    <Field label="Family Information" value={profileForm.familyInformation} onChange={(value) => setProfileForm((prev) => ({ ...prev, familyInformation: value }))} />
                    <Field label="Medical / Dietary Information" value={profileForm.medicalDietaryInformation} onChange={(value) => setProfileForm((prev) => ({ ...prev, medicalDietaryInformation: value }))} />
                    <Field label="Additional Support" value={profileForm.additionalSupport} onChange={(value) => setProfileForm((prev) => ({ ...prev, additionalSupport: value }))} />
                    <Field label="Strengths At Entry" value={profileForm.strengthsAtEntry} onChange={(value) => setProfileForm((prev) => ({ ...prev, strengthsAtEntry: value }))} />
                    <Field label="Parent Priorities" value={profileForm.parentPriorities} onChange={(value) => setProfileForm((prev) => ({ ...prev, parentPriorities: value }))} />
                    <div className="eyfs-assessment-action-row"><button type="button" onClick={saveProfile}>Save Profile</button></div>
                  </article>
                ) : null}
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
