import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  acknowledgeReceptionTransitionProfile,
  amendEarlyYearsReport,
  approveEarlyYearsReport,
  approveReceptionEyfsReference,
  approveReceptionTransitionProfile,
  createEarlyYearsReport,
  createEarlyYearsReportTemplate,
  createReceptionEyfsReference,
  createReceptionTransitionProfile,
  getEarlyYearsReport,
  getEarlyYearsReportArchive,
  getEarlyYearsReportDashboard,
  getEarlyYearsReportPrintHtml,
  getEarlyYearsReportTemplates,
  getReceptionEyfsReference,
  getReceptionTransitionPrintHtml,
  getReceptionTransitionProfile,
  handoverReceptionTransitionProfile,
  publishEarlyYearsReport,
  publishReceptionEyfsReference,
  publishReceptionTransitionProfile,
  returnEarlyYearsReport,
  returnReceptionEyfsReference,
  submitEarlyYearsReport,
  submitReceptionEyfsReference,
  submitReceptionTransitionProfile,
  updateEarlyYearsReport,
  updateReceptionEyfsReference,
  updateReceptionTransitionProfile,
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

function activeId(rows = []) {
  return rows.find((row) => row.isActive)?.id || rows[0]?.id || "";
}

function Field({ label, value, onChange, rows = 1, children, hint, type = "text" }) {
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

function openHtmlDocument(response, fallbackTitle) {
  const html = typeof response?.data === "string" ? response.data : String(response?.data || response || "");
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (!win) {
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fallbackTitle}.html`;
    link.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

function reportDefaults(student = {}, setup = {}) {
  return {
    studentId: student.id || "",
    classId: student.classId || "",
    academicSessionId: activeId(setup.sessions || []),
    termId: activeId(setup.terms || []),
    reportType: student.reportType || "",
    attendanceSummary: "",
    practicalLifeSummary: "",
    independenceSummary: "",
    characterResponsibilitySummary: "",
    learningBehaviourSummary: "",
    parentPartnershipSummary: "",
    supportSummary: "",
    accessSummary: "",
    literacySummary: "",
    strengths: "",
    nextPriorities: "",
    overallTeacherComment: "",
    internalTeacherNotes: "",
  };
}

function transitionDefaults(student = {}, setup = {}) {
  return {
    studentId: student.id || "",
    classId: student.classId || "",
    academicSessionId: activeId(setup.sessions || []),
    termId: activeId(setup.terms || []),
    transitionDate: today(),
    communicationLanguage: "",
    psed: "",
    physicalDevelopment: "",
    phonics: "",
    reading: "",
    writing: "",
    mathematics: "",
    understandingTheWorld: "",
    expressiveArts: "",
    practicalLifeIndependence: "",
    learningBehaviour: "",
    characterResponsibility: "",
    strengths: "",
    interests: "",
    successfulStrategies: "",
    accessAdjustments: "",
    currentPriorities: "",
    parentInformation: "",
    childVoice: "",
    receivingTeacherNotes: "",
    parentTransitionSummary: "",
    schoolReadinessSummary: "",
  };
}

export default function EarlyYearsReportingDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState("reports");
  const [dashboard, setDashboard] = useState(null);
  const [filters, setFilters] = useState({ academicSessionId: "", termId: "", classId: "" });
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [detail, setDetail] = useState(null);
  const [reportForm, setReportForm] = useState(reportDefaults());
  const [areaForms, setAreaForms] = useState([]);
  const [archive, setArchive] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [templateForm, setTemplateForm] = useState({ title: "", section: "GENERAL", guidanceText: "", exampleComment: "" });
  const [referenceData, setReferenceData] = useState(null);
  const [referenceForm, setReferenceForm] = useState({ referenceItemId: "", amesReferenceStatus: "NOT_YET_ASSESSED", teacherComment: "", evidenceSummary: "" });
  const [transitionData, setTransitionData] = useState(null);
  const [transitionForm, setTransitionForm] = useState(transitionDefaults());

  const parent = isParent(user);
  const leader = isLeader(user);
  const setup = dashboard?.setup || dashboard || {};
  const students = dashboard?.students || [];
  const selectedStudent = useMemo(() => students.find((student) => String(student.id) === String(selectedStudentId)) || students[0] || {}, [students, selectedStudentId]);

  const setReportField = (field, value) => setReportForm((current) => ({ ...current, [field]: value }));
  const setTransitionField = (field, value) => setTransitionForm((current) => ({ ...current, [field]: value }));

  const load = useCallback(async (nextFilters = {}) => {
    setLoading(true);
    setError("");
    try {
      const data = payloadOf(await getEarlyYearsReportDashboard(nextFilters));
      setDashboard(data);
      setFilters((current) => ({
        academicSessionId: nextFilters.academicSessionId || current.academicSessionId || activeId(data.setup?.sessions || data.sessions || []),
        termId: nextFilters.termId || current.termId || activeId(data.setup?.terms || data.terms || []),
        classId: nextFilters.classId || current.classId || "",
      }));
      const first = data.students?.[0]?.id || "";
      setSelectedStudentId((current) => current || first);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Could not load Early Years reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selectedStudent?.id) return;
    setReportForm((current) => ({ ...reportDefaults(selectedStudent, setup), ...current, studentId: selectedStudent.id, classId: selectedStudent.classId || current.classId }));
    setTransitionForm((current) => ({ ...transitionDefaults(selectedStudent, setup), ...current, studentId: selectedStudent.id, classId: selectedStudent.classId || current.classId }));
  }, [selectedStudent?.id]);

  const loadReport = async (reportId) => {
    setSaving(true);
    setError("");
    try {
      const data = payloadOf(await getEarlyYearsReport(reportId));
      setDetail(data);
      setReportForm({ ...reportDefaults(selectedStudent, setup), ...(data.report || {}) });
      setAreaForms(data.areas || []);
      setSelectedStudentId(data.report?.studentId || selectedStudentId);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Could not open this report.");
    } finally {
      setSaving(false);
    }
  };

  const createOrOpenReport = async (row = selectedStudent) => {
    const statusRow = dashboard?.classReportStatus?.find((item) => String(item.studentId) === String(row.id));
    if (statusRow?.reportId) {
      await loadReport(statusRow.reportId);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...reportDefaults(row, setup),
        academicSessionId: filters.academicSessionId || activeId(setup.sessions || []),
        termId: filters.termId || activeId(setup.terms || []),
        reportType: statusRow?.reportType || row.reportType || "",
      };
      const data = payloadOf(await createEarlyYearsReport(payload));
      setDetail(data);
      setReportForm({ ...payload, ...(data.report || {}) });
      setAreaForms(data.areas || []);
      setSelectedStudentId(data.report?.studentId || row.id);
      setNotice(data.duplicatePrevented ? "Existing draft opened." : "Report draft created.");
      await load(filters);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Could not create report.");
    } finally {
      setSaving(false);
    }
  };

  const saveReport = async () => {
    if (!detail?.report?.id) return;
    setSaving(true);
    setError("");
    try {
      const data = payloadOf(await updateEarlyYearsReport(detail.report.id, { ...reportForm, areas: areaForms }));
      setDetail(data);
      setReportForm({ ...reportDefaults(selectedStudent, setup), ...(data.report || {}) });
      setAreaForms(data.areas || []);
      setNotice("Report saved.");
      await load(filters);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Could not save report.");
    } finally {
      setSaving(false);
    }
  };

  const runReportAction = async (action) => {
    if (!detail?.report?.id) return;
    setSaving(true);
    setError("");
    try {
      const id = detail.report.id;
      const calls = {
        submit: () => submitEarlyYearsReport(id),
        return: () => returnEarlyYearsReport(id, { reviewerComment: reportForm.reviewerComment || "Please revise the report wording before publication." }),
        approve: () => approveEarlyYearsReport(id, { reviewerComment: reportForm.reviewerComment || "" }),
        publish: () => publishEarlyYearsReport(id),
        amend: () => amendEarlyYearsReport(id, { amendmentReason: reportForm.amendmentReason || "Correction after publication." }),
      };
      const data = payloadOf(await calls[action]());
      setDetail(data);
      setReportForm({ ...reportDefaults(selectedStudent, setup), ...(data.report || {}) });
      setAreaForms(data.areas || []);
      setNotice(`Report ${action} complete.`);
      await load(filters);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || `Could not ${action} report.`);
    } finally {
      setSaving(false);
    }
  };

  const loadArchive = async () => {
    if (!selectedStudent?.id) return;
    try {
      setArchive(payloadOf(await getEarlyYearsReportArchive(selectedStudent.id)).reports || []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Could not load report archive.");
    }
  };

  const loadReferences = async () => {
    if (!selectedStudent?.id) return;
    try {
      const data = payloadOf(await getReceptionEyfsReference(selectedStudent.id));
      setReferenceData(data);
      setReferenceForm((current) => ({ ...current, referenceItemId: current.referenceItemId || data.referenceItems?.[0]?.id || "" }));
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Could not load Reception EYFS reference.");
    }
  };

  const saveReference = async () => {
    setSaving(true);
    try {
      await createReceptionEyfsReference({
        ...referenceForm,
        studentId: selectedStudent.id,
        classId: selectedStudent.classId,
        academicSessionId: filters.academicSessionId || activeId(setup.sessions || []),
      });
      setNotice("Reception EYFS reference saved.");
      await loadReferences();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Could not save EYFS reference.");
    } finally {
      setSaving(false);
    }
  };

  const referenceAction = async (record, action) => {
    const calls = {
      save: () => updateReceptionEyfsReference(record.id, record),
      submit: () => submitReceptionEyfsReference(record.id),
      return: () => returnReceptionEyfsReference(record.id, { reviewerComment: "Please revise this reference item." }),
      approve: () => approveReceptionEyfsReference(record.id, {}),
      publish: () => publishReceptionEyfsReference(record.id),
    };
    try {
      await calls[action]();
      await loadReferences();
      setNotice(`Reference ${action} complete.`);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || `Could not ${action} reference.`);
    }
  };

  const loadTransition = async () => {
    if (!selectedStudent?.id) return;
    try {
      const data = payloadOf(await getReceptionTransitionProfile(selectedStudent.id));
      setTransitionData(data);
      if (data.transitions?.[0]) setTransitionForm({ ...transitionDefaults(selectedStudent, setup), ...data.transitions[0], successfulStrategies: (data.transitions[0].successfulStrategies || []).join(", ") });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Could not load transition profile.");
    }
  };

  const saveTransition = async () => {
    setSaving(true);
    try {
      const existing = transitionData?.transitions?.[0];
      const payload = {
        ...transitionForm,
        studentId: selectedStudent.id,
        classId: selectedStudent.classId,
        academicSessionId: filters.academicSessionId || activeId(setup.sessions || []),
        termId: filters.termId || activeId(setup.terms || []),
      };
      if (existing?.id) await updateReceptionTransitionProfile(existing.id, payload);
      else await createReceptionTransitionProfile(payload);
      setNotice("Transition profile saved.");
      await loadTransition();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Could not save transition profile.");
    } finally {
      setSaving(false);
    }
  };

  const transitionAction = async (action) => {
    const transition = transitionData?.transitions?.[0];
    if (!transition?.id) return;
    const calls = {
      submit: () => submitReceptionTransitionProfile(transition.id),
      approve: () => approveReceptionTransitionProfile(transition.id, {}),
      publish: () => publishReceptionTransitionProfile(transition.id),
      handover: () => handoverReceptionTransitionProfile(transition.id, {}),
      acknowledge: () => acknowledgeReceptionTransitionProfile(transition.id, { receivingTeacherNotes: transitionForm.receivingTeacherNotes }),
      print: () => getReceptionTransitionPrintHtml(transition.id),
    };
    try {
      const response = await calls[action]();
      if (action === "print") openHtmlDocument(response, "reception-basic-1-transition");
      await loadTransition();
      setNotice(`Transition ${action} complete.`);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || `Could not ${action} transition.`);
    }
  };

  const loadTemplates = async () => {
    try {
      setTemplates(payloadOf(await getEarlyYearsReportTemplates()).templates || []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Could not load comment templates.");
    }
  };

  const saveTemplate = async () => {
    try {
      await createEarlyYearsReportTemplate(templateForm);
      setTemplateForm({ title: "", section: "GENERAL", guidanceText: "", exampleComment: "" });
      setNotice("Comment-support template saved.");
      await loadTemplates();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Could not save template.");
    }
  };

  useEffect(() => {
    if (tab === "archive") loadArchive();
    if (tab === "reference") loadReferences();
    if (tab === "transition") loadTransition();
    if (tab === "templates") loadTemplates();
  }, [tab, selectedStudentId]);

  const statusCounts = dashboard?.statusCounts || {};

  return (
    <main className="portal-surface">
      <section className="portal-hero inclusion-hero">
        <div>
          <p className="portal-kicker">Early Years Reporting</p>
          <h1>Developmental reports, Reception reference, and Basic 1 handover</h1>
          <p>Report from evidence with teacher judgement, leadership review, parent-safe publication, and historical archive protection.</p>
        </div>
        <div className="inclusion-hero-actions">
          <Link className="portal-button ghost" to="/portal">Portal Home</Link>
          <button onClick={() => load(filters)} disabled={loading || saving}>Refresh</button>
        </div>
      </section>

      {error ? <div className="portal-alert error">{error}</div> : null}
      {notice ? <div className="portal-alert success">{notice}</div> : null}
      {loading ? <Empty>Loading Early Years reporting workspace...</Empty> : null}

      <section className="inclusion-toolbar">
        <Field label="Academic Session" value={filters.academicSessionId} onChange={(value) => setFilters((current) => ({ ...current, academicSessionId: value }))}>
          <select value={filters.academicSessionId} onChange={(event) => setFilters((current) => ({ ...current, academicSessionId: event.target.value }))}>
            <option value="">All sessions</option>
            {(setup.sessions || []).map((session) => <option key={session.id} value={session.id}>{session.sessionName || session.name || session.id}</option>)}
          </select>
        </Field>
        <Field label="Term" value={filters.termId} onChange={(value) => setFilters((current) => ({ ...current, termId: value }))}>
          <select value={filters.termId} onChange={(event) => setFilters((current) => ({ ...current, termId: event.target.value }))}>
            <option value="">All terms</option>
            {(setup.terms || []).map((term) => <option key={term.id} value={term.id}>{term.termName || term.name || term.id}</option>)}
          </select>
        </Field>
        {!parent ? (
          <Field label="Class" value={filters.classId} onChange={(value) => setFilters((current) => ({ ...current, classId: value }))}>
            <select value={filters.classId} onChange={(event) => setFilters((current) => ({ ...current, classId: event.target.value }))}>
              <option value="">All Early Years classes</option>
              {(setup.classes || []).map((row) => <option key={row.id} value={row.id}>{row.name || row.className || row.id}</option>)}
            </select>
          </Field>
        ) : null}
        <button onClick={() => load(filters)}>Apply Filters</button>
      </section>

      <section className="inclusion-stat-grid">
        {["DRAFT", "SUBMITTED", "RETURNED_FOR_REVISION", "APPROVED", "PUBLISHED", "ARCHIVED"].map((status) => (
          <div className="inclusion-stat-card" key={status}>
            <span>{labelize(status)}</span>
            <strong>{statusCounts[status] || 0}</strong>
          </div>
        ))}
      </section>

      <nav className="inclusion-tabs">
        {["reports", "editor", "reference", "transition", "archive", "templates"].filter((item) => item !== "templates" || leader).map((item) => (
          <button className={tab === item ? "active" : ""} key={item} onClick={() => setTab(item)}>{labelize(item)}</button>
        ))}
      </nav>

      {tab === "reports" ? (
        <section className="inclusion-grid">
          <div className="inclusion-panel wide">
            <h2>{parent ? "Published Reports" : "Class Reporting Status"}</h2>
            <div className="inclusion-list">
              {(dashboard?.classReportStatus || []).map((row) => (
                <article className="inclusion-card compact" key={`${row.studentId}-${row.reportType}`}>
                  <div>
                    <h3>{row.studentName}</h3>
                    <Chip tone={row.status === "RETURNED_FOR_REVISION" ? "warn" : ""}>{labelize(row.status)}</Chip>
                  </div>
                  <p>{row.className || row.classId} | {labelize(row.reportType)} | Updated {row.lastUpdated || "not started"}</p>
                  {parent && !row.reportId ? null : (
                    <div className="inclusion-actions">
                      <button onClick={() => createOrOpenReport({ id: row.studentId, name: row.studentName, classId: row.classId, reportType: row.reportType })}>{row.reportId ? "Open" : "Create"}</button>
                    </div>
                  )}
                </article>
              ))}
              {!dashboard?.classReportStatus?.length ? <Empty>No report records are available for this view yet.</Empty> : null}
            </div>
          </div>
        </section>
      ) : null}

      {tab === "editor" ? (
        <section className="inclusion-grid">
          <div className="inclusion-panel">
            <h2>Report Editor</h2>
            <Field label="Child" value={selectedStudentId} onChange={setSelectedStudentId}>
              <select value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value)}>
                {students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
              </select>
            </Field>
            <div className="inclusion-actions">
              <button onClick={() => createOrOpenReport(selectedStudent)} disabled={!selectedStudent?.id || saving}>{detail?.report?.id ? "Open Current Draft" : "Create/Open Report"}</button>
              {detail?.report?.id ? <button className="secondary" onClick={() => getEarlyYearsReportPrintHtml(detail.report.id).then((response) => openHtmlDocument(response, "early-years-report"))}>Preview / Print</button> : null}
            </div>
            {detail?.completenessIssues?.length ? (
              <div className="portal-alert warning">{detail.completenessIssues.join(" ")}</div>
            ) : null}
            <Field label="Attendance Summary" value={reportForm.attendanceSummary} onChange={(value) => setReportField("attendanceSummary", value)} />
            <Field label="Practical Life Summary" value={reportForm.practicalLifeSummary} onChange={(value) => setReportField("practicalLifeSummary", value)} rows={3} />
            <Field label="Independence Summary" value={reportForm.independenceSummary} onChange={(value) => setReportField("independenceSummary", value)} rows={3} />
            <Field label="Character / Responsibility" value={reportForm.characterResponsibilitySummary} onChange={(value) => setReportField("characterResponsibilitySummary", value)} rows={3} />
            <Field label="Learning Behaviour" value={reportForm.learningBehaviourSummary} onChange={(value) => setReportField("learningBehaviourSummary", value)} rows={3} />
            <Field label="Reception Literacy Summary" value={reportForm.literacySummary} onChange={(value) => setReportField("literacySummary", value)} rows={3} />
            <Field label="Support / Access Parent Summary" value={reportForm.supportSummary} onChange={(value) => setReportField("supportSummary", value)} rows={3} />
            <Field label="Strengths" value={reportForm.strengths} onChange={(value) => setReportField("strengths", value)} rows={3} />
            <Field label="Next Priorities" value={reportForm.nextPriorities} onChange={(value) => setReportField("nextPriorities", value)} rows={3} />
            <Field label="Overall Teacher Comment" value={reportForm.overallTeacherComment} onChange={(value) => setReportField("overallTeacherComment", value)} rows={4} />
            {!parent ? <Field label="Internal Teacher Notes" value={reportForm.internalTeacherNotes} onChange={(value) => setReportField("internalTeacherNotes", value)} rows={3} /> : null}
          </div>

          <div className="inclusion-panel">
            <h2>Seven EYFS Areas</h2>
            {areaForms.map((area, index) => (
              <article className="inclusion-card compact" key={area.eyfsArea}>
                <h3>{setup.eyfsAreas?.find((row) => row.code === area.eyfsArea)?.name || labelize(area.eyfsArea)}</h3>
                <Field label="Descriptor" value={area.descriptor} onChange={(value) => setAreaForms((rows) => rows.map((row, i) => i === index ? { ...row, descriptor: value } : row))}>
                  <select value={area.descriptor || ""} onChange={(event) => setAreaForms((rows) => rows.map((row, i) => i === index ? { ...row, descriptor: event.target.value } : row))}>
                    <option value="">Not selected</option>
                    {(setup.descriptors || []).map((item) => <option key={item} value={item}>{labelize(item)}</option>)}
                  </select>
                </Field>
                <Field label="What is going well?" value={area.strengthsProgress} onChange={(value) => setAreaForms((rows) => rows.map((row, i) => i === index ? { ...row, strengthsProgress: value } : row))} rows={2} />
                <Field label="What is developing?" value={area.currentDevelopment} onChange={(value) => setAreaForms((rows) => rows.map((row, i) => i === index ? { ...row, currentDevelopment: value } : row))} rows={2} />
                <Field label="Next priority" value={area.nextPriority} onChange={(value) => setAreaForms((rows) => rows.map((row, i) => i === index ? { ...row, nextPriority: value } : row))} rows={2} />
                <Field label="Teacher comment" value={area.teacherComment} onChange={(value) => setAreaForms((rows) => rows.map((row, i) => i === index ? { ...row, teacherComment: value } : row))} rows={2} />
              </article>
            ))}
            {detail?.evidenceSuggestions ? (
              <article className="inclusion-card compact">
                <h3>Evidence Suggestions</h3>
                <p>Recent observations: {detail.evidenceSuggestions.recentObservations?.length || 0}</p>
                <p>Next steps: {detail.evidenceSuggestions.nextSteps?.length || 0}</p>
                <p>Support summaries: {detail.evidenceSuggestions.supportSummary?.length || 0}</p>
              </article>
            ) : null}
          </div>

          <div className="inclusion-panel wide">
            <div className="inclusion-actions">
              <button onClick={saveReport} disabled={!detail?.report?.id || saving || parent}>Save Report</button>
              <button className="secondary" onClick={() => runReportAction("submit")} disabled={!detail?.report?.id || parent}>Submit</button>
              {leader ? <button className="secondary" onClick={() => runReportAction("return")} disabled={!detail?.report?.id}>Return</button> : null}
              {leader ? <button className="secondary" onClick={() => runReportAction("approve")} disabled={!detail?.report?.id}>Approve</button> : null}
              {leader ? <button className="secondary" onClick={() => runReportAction("publish")} disabled={!detail?.report?.id}>Publish</button> : null}
              {leader ? <button className="secondary" onClick={() => runReportAction("amend")} disabled={!detail?.report?.id}>Create Amendment</button> : null}
            </div>
          </div>
        </section>
      ) : null}

      {tab === "reference" ? (
        <section className="inclusion-grid">
          <div className="inclusion-panel">
            <h2>AMES End-of-Reception EYFS Reference</h2>
            <p>{referenceData?.legalWording || setup.legalWording}</p>
            {!parent ? (
              <>
                <Field label="Reference Item" value={referenceForm.referenceItemId} onChange={(value) => setReferenceForm((current) => ({ ...current, referenceItemId: value }))}>
                  <select value={referenceForm.referenceItemId} onChange={(event) => setReferenceForm((current) => ({ ...current, referenceItemId: event.target.value }))}>
                    {(referenceData?.referenceItems || setup.elgReferenceItems || []).map((item) => <option key={item.id} value={item.id}>{item.item}</option>)}
                  </select>
                </Field>
                <Field label="AMES Reference Status" value={referenceForm.amesReferenceStatus} onChange={(value) => setReferenceForm((current) => ({ ...current, amesReferenceStatus: value }))}>
                  <select value={referenceForm.amesReferenceStatus} onChange={(event) => setReferenceForm((current) => ({ ...current, amesReferenceStatus: event.target.value }))}>
                    {(setup.amesReferenceStatuses || []).map((item) => <option key={item} value={item}>{labelize(item)}</option>)}
                  </select>
                </Field>
                <Field label="Teacher Comment" value={referenceForm.teacherComment} onChange={(value) => setReferenceForm((current) => ({ ...current, teacherComment: value }))} rows={3} />
                <Field label="Evidence Summary" value={referenceForm.evidenceSummary} onChange={(value) => setReferenceForm((current) => ({ ...current, evidenceSummary: value }))} rows={3} />
                <button onClick={saveReference}>Save Reference Item</button>
              </>
            ) : null}
          </div>
          <div className="inclusion-panel">
            <h2>Reference Records</h2>
            <div className="inclusion-list">
              {(referenceData?.records || []).map((record) => (
                <article className="inclusion-card compact" key={record.id}>
                  <div><h3>{record.referenceItem}</h3><Chip>{labelize(record.status)}</Chip></div>
                  <p><strong>AMES Reference Status:</strong> {labelize(record.amesReferenceStatus)}</p>
                  <p>{record.teacherComment}</p>
                  {!parent ? (
                    <div className="inclusion-actions">
                      <button className="secondary" onClick={() => referenceAction(record, "submit")}>Submit</button>
                      {leader ? <button className="secondary" onClick={() => referenceAction(record, "return")}>Return</button> : null}
                      {leader ? <button className="secondary" onClick={() => referenceAction(record, "approve")}>Approve</button> : null}
                      {leader ? <button className="secondary" onClick={() => referenceAction(record, "publish")}>Publish</button> : null}
                    </div>
                  ) : null}
                </article>
              ))}
              {!referenceData?.records?.length ? <Empty>No Reception EYFS reference records yet.</Empty> : null}
            </div>
          </div>
        </section>
      ) : null}

      {tab === "transition" ? (
        <section className="inclusion-grid">
          <div className="inclusion-panel">
            <h2>Reception to Basic 1 Transition Profile</h2>
            <p>{transitionData?.principle || "READY DOES NOT MEAN FINISHED. TRANSITION MEANS CONTINUITY - NOT RESET."}</p>
            {["communicationLanguage", "psed", "physicalDevelopment", "phonics", "reading", "writing", "mathematics", "practicalLifeIndependence", "learningBehaviour", "characterResponsibility", "strengths", "interests", "successfulStrategies", "accessAdjustments", "currentPriorities", "parentTransitionSummary", "childVoice", "receivingTeacherNotes"].map((field) => (
              <Field key={field} label={labelize(field)} value={transitionForm[field]} onChange={(value) => setTransitionField(field, value)} rows={field.includes("Notes") || field.includes("Summary") ? 3 : 2} />
            ))}
            {!parent ? <button onClick={saveTransition}>Save Transition Profile</button> : null}
          </div>
          <div className="inclusion-panel">
            <h2>Workflow</h2>
            {(transitionData?.transitions || []).map((transition) => (
              <article className="inclusion-card compact" key={transition.id}>
                <div><h3>{transition.studentName}</h3><Chip>{labelize(transition.status)}</Chip></div>
                <p>{transition.className} to {transition.receivingClassName}</p>
                <div className="inclusion-actions">
                  {!parent ? <button className="secondary" onClick={() => transitionAction("submit")}>Submit</button> : null}
                  {leader ? <button className="secondary" onClick={() => transitionAction("approve")}>Approve</button> : null}
                  {leader ? <button className="secondary" onClick={() => transitionAction("publish")}>Publish</button> : null}
                  {leader ? <button className="secondary" onClick={() => transitionAction("handover")}>Handover</button> : null}
                  {!parent ? <button className="secondary" onClick={() => transitionAction("acknowledge")}>Acknowledge</button> : null}
                  <button className="secondary" onClick={() => transitionAction("print")}>Print</button>
                </div>
              </article>
            ))}
            {!transitionData?.transitions?.length ? <Empty>No transition profile exists yet for this child.</Empty> : null}
          </div>
        </section>
      ) : null}

      {tab === "archive" ? (
        <section className="inclusion-panel">
          <h2>Historical Report Archive</h2>
          <div className="inclusion-list">
            {archive.map((report) => (
              <article className="inclusion-card compact" key={report.id}>
                <div><h3>{labelize(report.reportType)} v{report.reportVersion}</h3><Chip>{labelize(report.reportStatus)}</Chip></div>
                <p>{report.studentName} | {report.className} | {report.academicSessionId} | {report.termId}</p>
                <div className="inclusion-actions">
                  <button onClick={() => loadReport(report.id)}>Open</button>
                </div>
              </article>
            ))}
            {!archive.length ? <Empty>No archived or historical report versions found for this child.</Empty> : null}
          </div>
        </section>
      ) : null}

      {tab === "templates" && leader ? (
        <section className="inclusion-grid">
          <div className="inclusion-panel">
            <h2>Comment-Support Library</h2>
            <Field label="Title" value={templateForm.title} onChange={(value) => setTemplateForm((current) => ({ ...current, title: value }))} />
            <Field label="Section" value={templateForm.section} onChange={(value) => setTemplateForm((current) => ({ ...current, section: value }))} />
            <Field label="Guidance Text" value={templateForm.guidanceText} onChange={(value) => setTemplateForm((current) => ({ ...current, guidanceText: value }))} rows={3} />
            <Field label="Example Comment" value={templateForm.exampleComment} onChange={(value) => setTemplateForm((current) => ({ ...current, exampleComment: value }))} rows={3} />
            <button onClick={saveTemplate}>Save Template</button>
          </div>
          <div className="inclusion-panel">
            <h2>Templates</h2>
            <div className="inclusion-list">
              {templates.map((template) => (
                <article className="inclusion-card compact" key={template.id}>
                  <h3>{template.title}</h3>
                  <p>{template.guidanceText}</p>
                  <small>{template.section}</small>
                </article>
              ))}
              {!templates.length ? <Empty>No comment-support templates yet.</Empty> : null}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
