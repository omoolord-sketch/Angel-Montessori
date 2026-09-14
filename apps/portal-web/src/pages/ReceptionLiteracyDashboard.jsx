import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  activateReceptionPhonicsProgramme,
  createReceptionDecodableBook,
  createReceptionHomeReadingRecord,
  createReceptionLiteracyParentUpdate,
  createReceptionLiteracySummary,
  createReceptionLiteracySupportPlan,
  createReceptionPhonicsProgress,
  createReceptionPhonicsProgramme,
  createReceptionPhonicsSequenceUnit,
  createReceptionReadingRecord,
  createReceptionWritingRecord,
  getReceptionHomeReadingRecords,
  getReceptionLiteracyClassOverview,
  getReceptionLiteracyParentUpdates,
  getReceptionLiteracyProfile,
  getReceptionLiteracySetup,
  getReceptionLiteracySupportPlans,
  getReceptionPhonicsProgress,
  getReceptionReadingRecords,
  getReceptionWritingRecords,
  updateReceptionLiteracySupportPlan,
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

function labelize(value) {
  return String(value || "").replace(/_/g, " ");
}

function childName(row) {
  return String(row?.name || `${row?.firstName || ""} ${row?.lastName || ""}`).trim() || "Reception Child";
}

function Field({ label, value, onChange, rows = 1, type = "text", children, hint, disabled }) {
  return (
    <label className="reception-literacy-field">
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

function Badge({ children, tone = "" }) {
  return <span className={`reception-literacy-badge ${tone}`}>{children}</span>;
}

function programmeFormDefaults() {
  return {
    name: "",
    provider: "",
    version: "",
    academicSessionId: "",
    description: "",
    programmeReference: "",
    officialDocumentationReference: "",
  };
}

function sequenceDefaults() {
  return {
    sequenceOrder: "",
    stageLabel: "",
    phaseLabel: "",
    unitLabel: "",
    weekReference: "",
    grapheme: "",
    phoneme: "",
    gpcLabel: "",
    exampleWords: "",
    trickyWords: "",
    reviewOf: "",
    notes: "",
  };
}

export default function ReceptionLiteracyDashboard() {
  const { user } = useAuth();
  const leader = isLeader(user);
  const parent = isParent(user);
  const staff = !parent;
  const [setup, setSetup] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [activeTab, setActiveTab] = useState(parent ? "profile" : "overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [profile, setProfile] = useState(null);
  const [classOverview, setClassOverview] = useState(null);
  const [progressRecords, setProgressRecords] = useState([]);
  const [readingRecords, setReadingRecords] = useState([]);
  const [writingRecords, setWritingRecords] = useState([]);
  const [supportPlans, setSupportPlans] = useState([]);
  const [homeReading, setHomeReading] = useState([]);
  const [parentUpdates, setParentUpdates] = useState([]);
  const [programmeForm, setProgrammeForm] = useState(programmeFormDefaults());
  const [sequenceForm, setSequenceForm] = useState(sequenceDefaults());
  const [selectedProgrammeId, setSelectedProgrammeId] = useState("");
  const [bulkRows, setBulkRows] = useState([]);
  const [phonicsForm, setPhonicsForm] = useState({
    teachingUnitId: "",
    assessmentDate: today(),
    gpcRecognition: "TAUGHT",
    blending: "DEVELOPING",
    segmenting: "DEVELOPING",
    applicationInReading: "DEVELOPING",
    applicationInWriting: "DEVELOPING",
    descriptor: "DEVELOPING",
    teacherNote: "",
    supportRequired: "",
    nextAction: "",
    reviewDate: "",
    includeInJournal: false,
    createLinkedObservation: false,
    parentVisible: false,
  });
  const [readingForm, setReadingForm] = useState({
    textType: "DECODABLE",
    bookTitle: "",
    dateRead: today(),
    accuracyNote: "",
    blendingNote: "",
    fluencyNote: "",
    comprehensionNote: "",
    vocabulary: "",
    confidenceNote: "",
    discussion: "",
    independenceLevel: "",
    reviewAction: "",
    teacherComment: "",
    homePracticeNote: "",
    parentVisible: false,
    includeInJournal: false,
  });
  const [writingForm, setWritingForm] = useState({
    date: today(),
    oralComposition: "",
    segmenting: "",
    graphemeSelection: "",
    letterFormation: "",
    wordWriting: "",
    sentenceConstruction: "",
    writingForPurpose: "",
    independence: "",
    teacherComment: "",
    nextPriority: "",
    parentVisible: false,
    includeInJournal: false,
  });
  const [supportForm, setSupportForm] = useState({
    identifiedNeed: "",
    programmePoint: "",
    supportFocus: "",
    startDate: today(),
    reviewDate: "",
    frequency: "",
    strategy: "",
    status: "PLANNED",
    reviewOutcome: "",
  });
  const [summaryForm, setSummaryForm] = useState({
    summaryType: "TERMLY",
    phonicsSummary: "",
    readingSummary: "",
    comprehensionSummary: "",
    writingSummary: "",
    strengths: "",
    currentPriorities: "",
    support: "",
    nextSteps: "",
    parentVisible: false,
  });
  const [parentUpdateForm, setParentUpdateForm] = useState({
    currentLiteracyFocus: "",
    readingComment: "",
    suggestedHomePractice: "",
    approvedBookInformation: "",
    teacherMessage: "",
  });
  const [homeReadingForm, setHomeReadingForm] = useState({
    book: "",
    date: today(),
    parentComment: "",
    teacherComment: "",
    readingCompleted: false,
    homePracticeNote: "",
  });
  const [bookForm, setBookForm] = useState({ title: "", code: "", programmeStage: "", gpcCoverage: "", trickyWordCoverage: "", sequenceOrder: "" });

  const students = setup?.students || [];
  const programmes = setup?.programmes || [];
  const activeProgramme = setup?.activeProgramme || null;
  const activeSequence = setup?.activeSequence || [];
  const selectedStudent = students.find((row) => String(row.id) === String(selectedStudentId)) || students[0] || null;
  const selectedProgramme = programmes.find((row) => String(row.id) === String(selectedProgrammeId)) || activeProgramme || programmes[0] || null;
  const selectedSequence = selectedProgramme ? (selectedProgramme.id === activeProgramme?.id ? activeSequence : []) : [];
  const programmeConfigured = Boolean(activeProgramme);

  const tabs = useMemo(() => {
    if (parent) return [["profile", "Literacy Profile"], ["homeReading", "Home Reading"]];
    const base = [["overview", "Overview"], ["phonics", "Phonics"], ["reading", "Reading"], ["writing", "Writing"], ["support", "Support"], ["profile", "Child Profiles"]];
    if (leader) base.push(["programme", "SSP Programme"], ["classReview", "Class Review"]);
    return base;
  }, [leader, parent]);

  const showError = useCallback((err, fallback = "Request failed") => {
    setError(err?.response?.data?.message || err?.message || fallback);
    setMessage("");
  }, []);

  const loadSetup = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = payloadOf(await getReceptionLiteracySetup());
      setSetup(data);
      const firstStudentId = selectedStudentId || data.students?.[0]?.id || "";
      setSelectedStudentId(firstStudentId);
      setSelectedProgrammeId((prev) => prev || data.activeProgramme?.id || data.programmes?.[0]?.id || "");
      setProgrammeForm((prev) => ({
        ...prev,
        academicSessionId: prev.academicSessionId || data.activeProgramme?.academicSessionId || "",
      }));
      setPhonicsForm((prev) => ({ ...prev, teachingUnitId: prev.teachingUnitId || data.activeSequence?.[0]?.id || "" }));
      setBulkRows((data.students || []).map((student) => ({
        studentId: student.id,
        selected: false,
        gpcRecognition: "TAUGHT",
        blending: "DEVELOPING",
        segmenting: "DEVELOPING",
        applicationInReading: "DEVELOPING",
        applicationInWriting: "DEVELOPING",
        nextAction: "",
        teacherNote: "",
      })));
    } catch (err) {
      showError(err, "Reception literacy setup could not load.");
    } finally {
      setLoading(false);
    }
  }, [selectedStudentId, showError]);

  const loadRecords = useCallback(async () => {
    if (!selectedStudentId) return;
    try {
      const requests = [
        getReceptionLiteracyProfile(selectedStudentId),
        getReceptionReadingRecords({ studentId: selectedStudentId }),
        getReceptionWritingRecords({ studentId: selectedStudentId }),
        getReceptionHomeReadingRecords({ studentId: selectedStudentId }),
        getReceptionLiteracyParentUpdates({ studentId: selectedStudentId }),
      ];
      if (staff) {
        requests.push(getReceptionPhonicsProgress({ studentId: selectedStudentId }));
        requests.push(getReceptionLiteracySupportPlans({ studentId: selectedStudentId }));
        requests.push(getReceptionLiteracyClassOverview("reception"));
      }
      const [profileRes, readingRes, writingRes, homeRes, parentUpdateRes, progressRes, supportRes, classRes] = await Promise.all(requests);
      setProfile(payloadOf(profileRes));
      setReadingRecords(payloadOf(readingRes).records || []);
      setWritingRecords(payloadOf(writingRes).records || []);
      setHomeReading(payloadOf(homeRes).records || []);
      setParentUpdates(payloadOf(parentUpdateRes).updates || []);
      if (staff) {
        setProgressRecords(payloadOf(progressRes).progress || []);
        setSupportPlans(payloadOf(supportRes).supportPlans || []);
        setClassOverview(payloadOf(classRes));
      }
    } catch (err) {
      showError(err, "Reception literacy records could not load.");
    }
  }, [selectedStudentId, showError, staff]);

  useEffect(() => {
    loadSetup();
  }, [loadSetup]);

  useEffect(() => {
    if (setup && selectedStudentId) loadRecords();
  }, [loadRecords, selectedStudentId, setup]);

  async function refreshAll() {
    await loadSetup();
    await loadRecords();
  }

  function withStudent(payload) {
    return {
      ...payload,
      studentId: selectedStudentId,
      classId: selectedStudent?.classId || "reception",
      programmeId: activeProgramme?.id || selectedProgramme?.id || "",
    };
  }

  async function saveProgramme() {
    try {
      await createReceptionPhonicsProgramme(programmeForm);
      setProgrammeForm(programmeFormDefaults());
      setMessage("Draft SSP programme created.");
      await refreshAll();
    } catch (err) {
      showError(err, "SSP programme could not be created.");
    }
  }

  async function saveSequenceUnit() {
    if (!selectedProgramme?.id) return;
    try {
      await createReceptionPhonicsSequenceUnit(selectedProgramme.id, sequenceForm);
      setSequenceForm(sequenceDefaults());
      setMessage("Programme sequence unit added.");
      await refreshAll();
    } catch (err) {
      showError(err, "Programme sequence unit could not be saved.");
    }
  }

  async function saveDecodableBook() {
    if (!selectedProgramme?.id) return;
    try {
      await createReceptionDecodableBook(selectedProgramme.id, bookForm);
      setBookForm({ title: "", code: "", programmeStage: "", gpcCoverage: "", trickyWordCoverage: "", sequenceOrder: "" });
      setMessage("Decodable book reference saved for the draft programme.");
      await refreshAll();
    } catch (err) {
      showError(err, "Decodable book reference could not be saved.");
    }
  }

  async function activateProgramme() {
    if (!selectedProgramme?.id) return;
    try {
      await activateReceptionPhonicsProgramme(selectedProgramme.id);
      setMessage("SSP programme activated and protected.");
      await refreshAll();
    } catch (err) {
      showError(err, "SSP programme could not be activated.");
    }
  }

  async function savePhonicsProgress() {
    try {
      await createReceptionPhonicsProgress(withStudent(phonicsForm));
      setMessage("Phonics quick check saved.");
      await refreshAll();
    } catch (err) {
      showError(err, "Phonics progress could not be saved.");
    }
  }

  async function saveBulkProgress() {
    try {
      const rows = bulkRows.filter((row) => row.selected);
      for (const row of rows) {
        await createReceptionPhonicsProgress({
          ...row,
          programmeId: activeProgramme?.id,
          teachingUnitId: phonicsForm.teachingUnitId,
          assessmentDate: phonicsForm.assessmentDate,
          classId: "reception",
        });
      }
      setMessage(`${rows.length} individual phonics reviews saved.`);
      await refreshAll();
    } catch (err) {
      showError(err, "Bulk phonics review could not be saved.");
    }
  }

  async function saveReadingRecord() {
    try {
      await createReceptionReadingRecord(withStudent(readingForm));
      setMessage("Reading record saved.");
      await refreshAll();
    } catch (err) {
      showError(err, "Reading record could not be saved.");
    }
  }

  async function saveWritingRecord() {
    try {
      await createReceptionWritingRecord(withStudent(writingForm));
      setMessage("Writing evidence saved.");
      await refreshAll();
    } catch (err) {
      showError(err, "Writing evidence could not be saved.");
    }
  }

  async function saveSupportPlan() {
    try {
      await createReceptionLiteracySupportPlan(withStudent(supportForm));
      setMessage("Keep-up support plan saved.");
      await refreshAll();
    } catch (err) {
      showError(err, "Keep-up support plan could not be saved.");
    }
  }

  async function updateSupportStatus(plan, status) {
    try {
      await updateReceptionLiteracySupportPlan(plan.id, { status });
      setMessage("Support status updated.");
      await refreshAll();
    } catch (err) {
      showError(err, "Support status could not be updated.");
    }
  }

  async function saveSummary() {
    try {
      await createReceptionLiteracySummary(withStudent(summaryForm));
      setMessage("Termly literacy summary saved.");
      await refreshAll();
    } catch (err) {
      showError(err, "Literacy summary could not be saved.");
    }
  }

  async function saveParentUpdate() {
    try {
      await createReceptionLiteracyParentUpdate(withStudent(parentUpdateForm));
      setMessage("Parent-facing literacy update published.");
      await refreshAll();
    } catch (err) {
      showError(err, "Parent-facing update could not be saved.");
    }
  }

  async function saveHomeReading() {
    try {
      await createReceptionHomeReadingRecord(withStudent(homeReadingForm));
      setMessage(parent ? "Home reading record sent." : "Home reading record saved.");
      await refreshAll();
    } catch (err) {
      showError(err, "Home reading record could not be saved.");
    }
  }

  return (
    <div className="portal-surface-page reception-literacy-page">
      <div className="portal-surface-shell">
        <section className="portal-surface-hero reception-literacy-hero">
          <div className="portal-surface-hero-copy">
            <div className="portal-surface-kicker">Reception Literacy</div>
            <h1 className="portal-surface-title">Phonics, reading, writing and keep-up support</h1>
            <p className="portal-surface-subtitle">
              Programme-configurable Reception literacy tracking. No SSP sequence is invented until school leadership configures one.
            </p>
          </div>
          <div className="portal-surface-actions">
            <Link className="portal-surface-action secondary" to="/portal">Portal Home</Link>
            <Link className="portal-surface-action secondary" to="/teacher/early-years/assessment">Learning Journal</Link>
            <button className="portal-surface-action primary" type="button" onClick={refreshAll} disabled={loading}>Refresh</button>
          </div>
        </section>

        {error ? <div className="portal-surface-empty academic-alert">{error}</div> : null}
        {message ? <div className="portal-surface-empty eyfs-curriculum-success">{message}</div> : null}
        {loading ? <div className="portal-surface-empty">Loading Reception literacy workspace...</div> : null}

        {!loading ? (
          <>
            <section className="reception-literacy-status-grid">
              <article>
                <span>SSP Programme</span>
                <strong>{activeProgramme?.name || "ADOPTED SSP PROGRAMME NOT YET CONFIGURED"}</strong>
                <p>{programmeConfigured ? `${activeProgramme.provider || "School configured"} ${activeProgramme.version || ""}` : "Leadership must configure the adopted programme before formal GPC tracking."}</p>
              </article>
              <article>
                <span>Production GPC Sequence</span>
                <strong>{setup?.productionSequenceAudit?.productionGpcSequence || "EMPTY"}</strong>
                <p>Invented placeholder GPCs: {setup?.productionSequenceAudit?.inventedPlaceholderGpcs ?? 0}</p>
              </article>
              <article>
                <span>Selected Child</span>
                <strong>{childName(selectedStudent)}</strong>
                <p>{selectedStudent?.className || "Reception"}</p>
              </article>
            </section>

            <section className="reception-literacy-toolbar">
              <label>
                <span>Child</span>
                <select value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value)}>
                  {students.map((student) => <option key={student.id} value={student.id}>{childName(student)}</option>)}
                </select>
              </label>
            </section>

            <nav className="reception-literacy-tabs">
              {tabs.map(([key, label]) => (
                <button key={key} type="button" className={activeTab === key ? "active" : ""} onClick={() => setActiveTab(key)}>{label}</button>
              ))}
            </nav>

            {activeTab === "overview" && staff ? (
              <section className="reception-literacy-grid">
                <article className="reception-literacy-panel">
                  <div className="portal-surface-kicker">Class Overview</div>
                  <h2>No ranking, no percentages</h2>
                  <div className="reception-literacy-metric-grid">
                    {Object.entries(classOverview?.summary || {}).map(([key, value]) => (
                      <div key={key}><span>{labelize(key)}</span><strong>{value}</strong></div>
                    ))}
                  </div>
                  <p>Children with no recent evidence are listed to support attention, not to create labels or quotas.</p>
                </article>
                <article className="reception-literacy-panel">
                  <div className="portal-surface-kicker">Evidence Coverage</div>
                  <h2>Phonics, reading and writing checks</h2>
                  <div className="reception-literacy-metric-grid">
                    <div><span>No phonics evidence</span><strong>{classOverview?.evidenceCoverage?.noRecentPhonicsEvidence ?? 0}</strong></div>
                    <div><span>No reading evidence</span><strong>{classOverview?.evidenceCoverage?.noRecentReadingEvidence ?? 0}</strong></div>
                    <div><span>No writing evidence</span><strong>{classOverview?.evidenceCoverage?.noRecentWritingEvidence ?? 0}</strong></div>
                  </div>
                </article>
              </section>
            ) : null}

            {activeTab === "phonics" && staff ? (
              <section className="reception-literacy-grid">
                <article className="reception-literacy-panel">
                  <div className="portal-surface-kicker">Phonics Quick Check</div>
                  <h2>Hear, say, see, read, build, write, use, revisit</h2>
                  {!programmeConfigured ? <p className="reception-literacy-warning">ADOPTED SSP PROGRAMME NOT YET CONFIGURED</p> : null}
                  <div className="reception-literacy-form-grid">
                    <Field label="Teaching Unit / GPC">
                      <select value={phonicsForm.teachingUnitId} onChange={(event) => setPhonicsForm((prev) => ({ ...prev, teachingUnitId: event.target.value }))}>
                        <option value="">Select taught unit</option>
                        {activeSequence.map((unit) => <option key={unit.id} value={unit.id}>{unit.gpcLabel || unit.unitLabel}</option>)}
                      </select>
                    </Field>
                    <Field label="Date" type="date" value={phonicsForm.assessmentDate} onChange={(value) => setPhonicsForm((prev) => ({ ...prev, assessmentDate: value }))} />
                    {["gpcRecognition", "blending", "segmenting", "applicationInReading", "applicationInWriting"].map((field) => (
                      <Field key={field} label={labelize(field)}>
                        <select value={phonicsForm[field]} onChange={(event) => setPhonicsForm((prev) => ({ ...prev, [field]: event.target.value }))}>
                          {(setup?.skillStates || []).map((state) => <option key={state} value={state}>{labelize(state)}</option>)}
                        </select>
                      </Field>
                    ))}
                    <Field label="Overall Descriptor">
                      <select value={phonicsForm.descriptor} onChange={(event) => setPhonicsForm((prev) => ({ ...prev, descriptor: event.target.value }))}>
                        {(setup?.descriptors || []).map((state) => <option key={state} value={state}>{labelize(state)}</option>)}
                      </select>
                    </Field>
                  </div>
                  <Field label="Teacher Note" rows={3} value={phonicsForm.teacherNote} onChange={(value) => setPhonicsForm((prev) => ({ ...prev, teacherNote: value }))} />
                  <Field label="Next Action" rows={2} value={phonicsForm.nextAction} onChange={(value) => setPhonicsForm((prev) => ({ ...prev, nextAction: value }))} />
                  <div className="reception-literacy-check-row">
                    <label><input type="checkbox" checked={phonicsForm.includeInJournal} onChange={(event) => setPhonicsForm((prev) => ({ ...prev, includeInJournal: event.target.checked }))} /> Add to Learning Journal</label>
                    <label><input type="checkbox" checked={phonicsForm.createLinkedObservation} onChange={(event) => setPhonicsForm((prev) => ({ ...prev, createLinkedObservation: event.target.checked }))} /> Create linked observation</label>
                    <label><input type="checkbox" checked={phonicsForm.parentVisible} onChange={(event) => setPhonicsForm((prev) => ({ ...prev, parentVisible: event.target.checked }))} /> Parent visible</label>
                  </div>
                  <button type="button" onClick={savePhonicsProgress} disabled={!programmeConfigured}>Save Quick Check</button>
                </article>

                <article className="reception-literacy-panel">
                  <div className="portal-surface-kicker">Bulk Review</div>
                  <h2>Same unit, individual judgement</h2>
                  <div className="reception-literacy-list">
                    {bulkRows.map((row, index) => {
                      const student = students.find((item) => item.id === row.studentId);
                      return (
                        <div className="reception-literacy-card compact" key={row.studentId}>
                          <label><input type="checkbox" checked={row.selected} onChange={(event) => setBulkRows((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, selected: event.target.checked } : item))} /> {childName(student)}</label>
                          <select value={row.gpcRecognition} onChange={(event) => setBulkRows((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, gpcRecognition: event.target.value } : item))}>
                            {(setup?.skillStates || []).map((state) => <option key={state} value={state}>{labelize(state)}</option>)}
                          </select>
                          <input placeholder="Individual note/action" value={row.teacherNote} onChange={(event) => setBulkRows((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, teacherNote: event.target.value, nextAction: event.target.value } : item))} />
                        </div>
                      );
                    })}
                  </div>
                  <button type="button" onClick={saveBulkProgress} disabled={!programmeConfigured}>Save Selected Reviews</button>
                </article>
              </section>
            ) : null}

            {activeTab === "reading" && staff ? (
              <section className="reception-literacy-grid">
                <article className="reception-literacy-panel">
                  <div className="portal-surface-kicker">Reading Record</div>
                  <h2>Decodable and rich literature remain distinct</h2>
                  <div className="reception-literacy-form-grid">
                    <Field label="Text Type">
                      <select value={readingForm.textType} onChange={(event) => setReadingForm((prev) => ({ ...prev, textType: event.target.value }))}>
                        {(setup?.readingTextTypes || []).map((type) => <option key={type} value={type}>{labelize(type)}</option>)}
                      </select>
                    </Field>
                    <Field label="Book / Text Title" value={readingForm.bookTitle} onChange={(value) => setReadingForm((prev) => ({ ...prev, bookTitle: value }))} />
                    <Field label="Date Read" type="date" value={readingForm.dateRead} onChange={(value) => setReadingForm((prev) => ({ ...prev, dateRead: value }))} />
                    <Field label="Independence">
                      <select value={readingForm.independenceLevel} onChange={(event) => setReadingForm((prev) => ({ ...prev, independenceLevel: event.target.value }))}>
                        <option value="">Select</option>
                        {(setup?.independenceLevels || []).map((level) => <option key={level} value={level}>{labelize(level)}</option>)}
                      </select>
                    </Field>
                  </div>
                  {["accuracyNote", "blendingNote", "fluencyNote", "comprehensionNote", "vocabulary", "confidenceNote", "reviewAction", "teacherComment", "homePracticeNote"].map((field) => (
                    <Field key={field} label={labelize(field)} rows={2} value={readingForm[field]} onChange={(value) => setReadingForm((prev) => ({ ...prev, [field]: value }))} />
                  ))}
                  <div className="reception-literacy-check-row">
                    <label><input type="checkbox" checked={readingForm.parentVisible} onChange={(event) => setReadingForm((prev) => ({ ...prev, parentVisible: event.target.checked }))} /> Parent visible</label>
                    <label><input type="checkbox" checked={readingForm.includeInJournal} onChange={(event) => setReadingForm((prev) => ({ ...prev, includeInJournal: event.target.checked }))} /> Add to Learning Journal</label>
                  </div>
                  <button type="button" onClick={saveReadingRecord}>Save Reading Record</button>
                </article>
                <RecordList title="Recent Reading" records={readingRecords} />
              </section>
            ) : null}

            {activeTab === "writing" && staff ? (
              <section className="reception-literacy-grid">
                <article className="reception-literacy-panel">
                  <div className="portal-surface-kicker">Writing Evidence</div>
                  <h2>Say it, build it, write it, read it back</h2>
                  <Field label="Date" type="date" value={writingForm.date} onChange={(value) => setWritingForm((prev) => ({ ...prev, date: value }))} />
                  {["oralComposition", "segmenting", "graphemeSelection", "letterFormation", "wordWriting", "sentenceConstruction", "writingForPurpose", "teacherComment", "nextPriority"].map((field) => (
                    <Field key={field} label={labelize(field)} rows={2} value={writingForm[field]} onChange={(value) => setWritingForm((prev) => ({ ...prev, [field]: value }))} />
                  ))}
                  <Field label="Independence">
                    <select value={writingForm.independence} onChange={(event) => setWritingForm((prev) => ({ ...prev, independence: event.target.value }))}>
                      <option value="">Select</option>
                      {(setup?.independenceLevels || []).map((level) => <option key={level} value={level}>{labelize(level)}</option>)}
                    </select>
                  </Field>
                  <div className="reception-literacy-check-row">
                    <label><input type="checkbox" checked={writingForm.parentVisible} onChange={(event) => setWritingForm((prev) => ({ ...prev, parentVisible: event.target.checked }))} /> Parent visible</label>
                    <label><input type="checkbox" checked={writingForm.includeInJournal} onChange={(event) => setWritingForm((prev) => ({ ...prev, includeInJournal: event.target.checked }))} /> Add to Learning Journal</label>
                  </div>
                  <button type="button" onClick={saveWritingRecord}>Save Writing Evidence</button>
                </article>
                <RecordList title="Recent Writing" records={writingRecords} />
              </section>
            ) : null}

            {activeTab === "support" && staff ? (
              <section className="reception-literacy-grid">
                <article className="reception-literacy-panel">
                  <div className="portal-surface-kicker">Keep-Up Support</div>
                  <h2>Review soon, keep-up required, no punitive labels</h2>
                  {["identifiedNeed", "programmePoint", "supportFocus", "frequency", "strategy", "reviewOutcome"].map((field) => (
                    <Field key={field} label={labelize(field)} rows={field === "strategy" ? 3 : 1} value={supportForm[field]} onChange={(value) => setSupportForm((prev) => ({ ...prev, [field]: value }))} />
                  ))}
                  <div className="reception-literacy-form-grid">
                    <Field label="Start Date" type="date" value={supportForm.startDate} onChange={(value) => setSupportForm((prev) => ({ ...prev, startDate: value }))} />
                    <Field label="Review Date" type="date" value={supportForm.reviewDate} onChange={(value) => setSupportForm((prev) => ({ ...prev, reviewDate: value }))} />
                    <Field label="Status">
                      <select value={supportForm.status} onChange={(event) => setSupportForm((prev) => ({ ...prev, status: event.target.value }))}>
                        {(setup?.supportStatuses || []).map((status) => <option key={status} value={status}>{labelize(status)}</option>)}
                      </select>
                    </Field>
                  </div>
                  <button type="button" onClick={saveSupportPlan}>Save Support Plan</button>
                </article>
                <article className="reception-literacy-panel">
                  <div className="portal-surface-kicker">Support Reviews Due</div>
                  <h2>{supportPlans.length} plan(s)</h2>
                  <div className="reception-literacy-list">
                    {supportPlans.map((plan) => (
                      <article className="reception-literacy-card" key={plan.id}>
                        <Badge>{labelize(plan.status)}</Badge>
                        <h3>{plan.supportFocus || plan.identifiedNeed}</h3>
                        <p>{plan.strategy}</p>
                        <select value={plan.status} onChange={(event) => updateSupportStatus(plan, event.target.value)}>
                          {(setup?.supportStatuses || []).map((status) => <option key={status} value={status}>{labelize(status)}</option>)}
                        </select>
                      </article>
                    ))}
                  </div>
                </article>
              </section>
            ) : null}

            {activeTab === "profile" ? (
              <section className="reception-literacy-grid">
                <article className="reception-literacy-panel">
                  <div className="portal-surface-kicker">Child Literacy Profile</div>
                  <h2>{childName(selectedStudent)}</h2>
                  <ProfileGrid profile={profile} />
                  <RecordList title="Parent Updates" records={parentUpdates} />
                </article>
                {staff ? (
                  <article className="reception-literacy-panel">
                    <div className="portal-surface-kicker">Termly Literacy Summary</div>
                    <h2>Professional judgement remains with the teacher</h2>
                    {["phonicsSummary", "readingSummary", "comprehensionSummary", "writingSummary", "strengths", "currentPriorities", "support", "nextSteps"].map((field) => (
                      <Field key={field} label={labelize(field)} rows={2} value={summaryForm[field]} onChange={(value) => setSummaryForm((prev) => ({ ...prev, [field]: value }))} />
                    ))}
                    <label className="reception-literacy-inline"><input type="checkbox" checked={summaryForm.parentVisible} onChange={(event) => setSummaryForm((prev) => ({ ...prev, parentVisible: event.target.checked }))} /> Parent visible</label>
                    <button type="button" onClick={saveSummary}>Save Literacy Summary</button>

                    <div className="reception-literacy-divider" />
                    <div className="portal-surface-kicker">Parent-Facing Update</div>
                    {["currentLiteracyFocus", "readingComment", "suggestedHomePractice", "approvedBookInformation", "teacherMessage"].map((field) => (
                      <Field key={field} label={labelize(field)} rows={2} value={parentUpdateForm[field]} onChange={(value) => setParentUpdateForm((prev) => ({ ...prev, [field]: value }))} />
                    ))}
                    <button type="button" onClick={saveParentUpdate}>Publish Parent Update</button>
                  </article>
                ) : null}
              </section>
            ) : null}

            {activeTab === "homeReading" || (activeTab === "profile" && parent) ? (
              <section className="reception-literacy-grid">
                <article className="reception-literacy-panel">
                  <div className="portal-surface-kicker">Home Reading Record</div>
                  <h2>Simple home-school reading note</h2>
                  <Field label="Book" value={homeReadingForm.book} onChange={(value) => setHomeReadingForm((prev) => ({ ...prev, book: value }))} />
                  <Field label="Date" type="date" value={homeReadingForm.date} onChange={(value) => setHomeReadingForm((prev) => ({ ...prev, date: value }))} />
                  <Field label="Parent Comment" rows={3} value={homeReadingForm.parentComment} onChange={(value) => setHomeReadingForm((prev) => ({ ...prev, parentComment: value }))} />
                  <label className="reception-literacy-inline"><input type="checkbox" checked={homeReadingForm.readingCompleted} onChange={(event) => setHomeReadingForm((prev) => ({ ...prev, readingCompleted: event.target.checked }))} /> Reading completed</label>
                  <button type="button" onClick={saveHomeReading}>Save Home Reading</button>
                </article>
                <RecordList title="Home Reading History" records={homeReading} />
              </section>
            ) : null}

            {activeTab === "programme" && leader ? (
              <section className="reception-literacy-grid">
                <article className="reception-literacy-panel">
                  <div className="portal-surface-kicker">SSP Programme Configuration</div>
                  <h2>Leadership-controlled programme setup</h2>
                  {["name", "provider", "version", "academicSessionId", "description", "programmeReference", "officialDocumentationReference"].map((field) => (
                    <Field key={field} label={labelize(field)} rows={field.includes("description") || field.includes("Reference") ? 2 : 1} value={programmeForm[field]} onChange={(value) => setProgrammeForm((prev) => ({ ...prev, [field]: value }))} />
                  ))}
                  <button type="button" onClick={saveProgramme}>Create Draft Programme</button>
                  <div className="reception-literacy-divider" />
                  <Field label="Selected Programme">
                    <select value={selectedProgrammeId} onChange={(event) => setSelectedProgrammeId(event.target.value)}>
                      {programmes.map((programme) => <option key={programme.id} value={programme.id}>{programme.name} - {programme.status}</option>)}
                    </select>
                  </Field>
                  <button type="button" onClick={activateProgramme} disabled={!selectedProgramme || selectedProgramme.status === "ACTIVE"}>Activate Configured Programme</button>
                </article>

                <article className="reception-literacy-panel">
                  <div className="portal-surface-kicker">Teaching Sequence</div>
                  <h2>No default GPC order is seeded</h2>
                  {Object.keys(sequenceDefaults()).map((field) => (
                    <Field key={field} label={labelize(field)} value={sequenceForm[field]} onChange={(value) => setSequenceForm((prev) => ({ ...prev, [field]: value }))} />
                  ))}
                  <button type="button" onClick={saveSequenceUnit} disabled={!selectedProgramme || selectedProgramme.status === "ACTIVE"}>Add Sequence Unit</button>
                  <div className="reception-literacy-list">
                    {selectedSequence.map((unit) => <div className="reception-literacy-card compact" key={unit.id}>{unit.sequenceOrder}. {unit.gpcLabel || unit.unitLabel}</div>)}
                  </div>
                  <div className="reception-literacy-divider" />
                  <div className="portal-surface-kicker">Decodable Book References</div>
                  {Object.keys(bookForm).map((field) => (
                    <Field key={field} label={labelize(field)} value={bookForm[field]} onChange={(value) => setBookForm((prev) => ({ ...prev, [field]: value }))} />
                  ))}
                  <button type="button" onClick={saveDecodableBook} disabled={!selectedProgramme || selectedProgramme.status === "ACTIVE"}>Add Decodable Book</button>
                </article>
              </section>
            ) : null}

            {activeTab === "classReview" && leader ? (
              <section className="reception-literacy-panel">
                <div className="portal-surface-kicker">Class Review</div>
                <h2>Reception literacy overview</h2>
                <div className="reception-literacy-list">
                  {(classOverview?.children || []).map((child) => (
                    <article className="reception-literacy-card" key={child.studentId}>
                      <Badge>{labelize(child.status)}</Badge>
                      <h3>{child.studentName}</h3>
                      <p>{child.latestTeachingPoint || "No current teaching point recorded."}</p>
                      <small>{child.keepUpActive ? "Keep-up support active" : "No active keep-up support"}</small>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

function ProfileGrid({ profile }) {
  const rows = [
    ["Programme", profile?.currentProgramme?.name || "Not configured"],
    ["Teaching Point", profile?.currentTeachingPoint || "-"],
    ["GPC", profile?.gpcDevelopment || "-"],
    ["Blending", profile?.blending || "-"],
    ["Segmenting", profile?.segmenting || "-"],
    ["Reading", profile?.readingFluency || "-"],
    ["Comprehension", profile?.comprehension || "-"],
    ["Writing", profile?.writing?.teacherComment || profile?.writing?.writingForPurpose || "-"],
    ["Independence", profile?.independence || "-"],
  ];
  return (
    <div className="reception-literacy-metric-grid">
      {rows.map(([label, value]) => <div key={label}><span>{label}</span><strong>{labelize(value)}</strong></div>)}
    </div>
  );
}

function RecordList({ title, records }) {
  return (
    <article className="reception-literacy-panel">
      <div className="portal-surface-kicker">{title}</div>
      <h2>{records?.length || 0} record(s)</h2>
      <div className="reception-literacy-list">
        {(records || []).length ? records.map((record) => (
          <article className="reception-literacy-card" key={record.id}>
            <Badge>{labelize(record.textType || record.status || record.entryType || "record")}</Badge>
            <h3>{record.bookTitle || record.textTitle || record.title || record.book || record.supportFocus || "Reception literacy record"}</h3>
            <p>{record.teacherComment || record.comprehensionNote || record.writingForPurpose || record.parentComment || record.currentLiteracyFocus || record.homePracticeNote || "No additional note."}</p>
            <small>{record.dateRead || record.date || record.createdAt || ""}</small>
          </article>
        )) : <div className="portal-surface-empty">No records yet.</div>}
      </div>
    </article>
  );
}
