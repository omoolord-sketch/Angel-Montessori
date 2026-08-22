
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  createAdmissionAdminClass,
  createAdmissionAdminSession,
  archiveAdmissionApplication,
  deleteAdmissionApplication,
  enrollAdmissionApplicant,
  getAdmissionAdminApplications,
  getAdmissionAdminClasses,
  getAdmissionAdminDashboard,
  getAdmissionAdminSessions,
  publishAdmissionDecision,
  reopenAdmissionApplication,
  reviewAdmissionApplication,
  updateAdmissionAcceptance,
  updateAdmissionAdminClass,
  updateAdmissionAdminSession,
  updateAdmissionScreening,
  updateAdmissionWorkflow,
  verifyAdmissionDocument,
} from "../api/services";

const statusOptions = [
  "REGISTERED",
  "IN_PROGRESS",
  "SUBMITTED",
  "UNDER_REVIEW",
  "SHORTLISTED",
  "SCREENING_SCHEDULED",
  "SCREENING_COMPLETED",
  "ADMITTED",
  "WAITLISTED",
  "REJECTED",
  "ENROLLED",
];

const documentKeys = [
  { key: "passportPhotoUrl", label: "Passport Photograph" },
  { key: "birthCertificateUrl", label: "Birth Certificate" },
  { key: "previousResultUrl", label: "Previous Result" },
  { key: "testimonialUrl", label: "Testimonial" },
  { key: "transferLetterUrl", label: "Transfer Letter" },
  { key: "immunizationCardUrl", label: "Immunization Card" },
];

const ADMIN_SECTIONS = [
  { key: "dashboard", label: "Overview", path: "/admin/admissions/dashboard" },
  { key: "sessions", label: "Sessions", path: "/admin/admissions/sessions" },
  { key: "classes", label: "Classes", path: "/admin/admissions/classes" },
  { key: "applications", label: "Applications", path: "/admin/admissions/applications" },
  { key: "documents", label: "Documents", path: "/admin/admissions/documents" },
  { key: "payments", label: "Payments", path: "/admin/admissions/payments" },
  { key: "screening", label: "Screening", path: "/admin/admissions/screening" },
  { key: "decisions", label: "Decisions", path: "/admin/admissions/decisions" },
  { key: "enrollment", label: "Enrollment", path: "/admin/admissions/enrollment" },
];

function resolveSectionFromPath(pathname) {
  const path = String(pathname || "");
  if (path === "/dashboard/admissions") return "dashboard";
  if (path.startsWith("/admin/admissions/sessions")) return "sessions";
  if (path.startsWith("/admin/admissions/classes")) return "classes";
  if (path.startsWith("/admin/admissions/applications")) return "applications";
  if (path.startsWith("/admin/admissions/documents")) return "documents";
  if (path.startsWith("/admin/admissions/payments")) return "payments";
  if (path.startsWith("/admin/admissions/screening")) return "screening";
  if (path.startsWith("/admin/admissions/decisions")) return "decisions";
  if (path.startsWith("/admin/admissions/enrollment")) return "enrollment";
  return "dashboard";
}

function filterApplicationsBySection(rows, section) {
  const list = Array.isArray(rows) ? rows : [];
  if (section === "documents") {
    return list.filter((row) => ["SUBMITTED", "UNDER_REVIEW", "SHORTLISTED", "SCREENING_SCHEDULED", "SCREENING_COMPLETED", "ADMITTED", "WAITLISTED", "ENROLLED"].includes(row.status));
  }
  if (section === "payments") {
    return list.filter((row) => !row.applicationFeePaid || !row.acceptanceFeePaid || ["SUBMITTED", "UNDER_REVIEW", "ADMITTED", "ENROLLED"].includes(row.status));
  }
  if (section === "screening") {
    return list.filter((row) => ["SHORTLISTED", "SCREENING_SCHEDULED", "SCREENING_COMPLETED"].includes(row.status));
  }
  if (section === "decisions") {
    return list.filter((row) => ["SCREENING_COMPLETED", "ADMITTED", "WAITLISTED", "REJECTED", "ENROLLED"].includes(row.status));
  }
  if (section === "enrollment") {
    return list.filter((row) => ["ADMITTED", "ENROLLED"].includes(row.status));
  }
  return list;
}

function sectionTitle(section) {
  if (section === "documents") return "Document Verification";
  if (section === "payments") return "Admission Payments";
  if (section === "screening") return "Screening Management";
  if (section === "decisions") return "Decision Management";
  if (section === "enrollment") return "Enrollment Conversion";
  return "Applications";
}

function sectionHint(section) {
  if (section === "documents") return "Review and verify uploaded applicant documents.";
  if (section === "payments") return "Track application and acceptance fee completion.";
  if (section === "screening") return "Schedule screening and enter screening outcomes.";
  if (section === "decisions") return "Publish admitted, waitlisted, or rejected decisions.";
  if (section === "enrollment") return "Convert admitted applicants into enrolled students.";
  return "Filter and review applicants from one list.";
}

export default function AdmissionsAdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState(resolveSectionFromPath(location.pathname));

  const [summary, setSummary] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selectedId, setSelectedId] = useState("");

  const [filter, setFilter] = useState({ status: "ALL", search: "", sessionId: "", classId: "", paymentStatus: "ALL", archived: "active" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [sessionForm, setSessionForm] = useState({ title: "", academicSession: "", startDate: "", endDate: "", applicationFee: "", acceptanceFee: "" });
  const [classForm, setClassForm] = useState({ className: "", section: "", capacity: "", formFee: "" });

  useEffect(() => {
    setActiveSection(resolveSectionFromPath(location.pathname));
  }, [location.pathname]);

  const visibleApplications = useMemo(
    () => filterApplicationsBySection(applications, activeSection),
    [applications, activeSection]
  );

  const selected = useMemo(
    () => visibleApplications.find((item) => String(item.id) === String(selectedId)) || visibleApplications[0] || null,
    [visibleApplications, selectedId]
  );

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      const [dashboardRes, sessionRes, classRes, applicationsRes] = await Promise.all([
        getAdmissionAdminDashboard(),
        getAdmissionAdminSessions(),
        getAdmissionAdminClasses(),
        getAdmissionAdminApplications(filter),
      ]);

      setSummary(dashboardRes?.data?.summary || null);
      setSessions(Array.isArray(sessionRes?.data) ? sessionRes.data : []);
      setClasses(Array.isArray(classRes?.data) ? classRes.data : []);

      const rows = Array.isArray(applicationsRes?.data) ? applicationsRes.data : [];
      setApplications(rows);
      if (rows.length > 0) {
        setSelectedId((prev) => (prev && rows.some((item) => String(item.id) === String(prev)) ? prev : rows[0].id));
      } else {
        setSelectedId("");
      }
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load admissions dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const goToSection = (key) => {
    const target = ADMIN_SECTIONS.find((x) => x.key === key);
    if (!target) return;
    setActiveSection(target.key);
    navigate(target.path);
  };

  const applyFilters = async () => {
    await load();
  };

  const createSession = async () => {
    try {
      await createAdmissionAdminSession({
        title: sessionForm.title,
        academicSession: sessionForm.academicSession,
        startDate: sessionForm.startDate,
        endDate: sessionForm.endDate,
        applicationFee: Number(sessionForm.applicationFee || 0),
        acceptanceFee: Number(sessionForm.acceptanceFee || 0),
      });
      setSessionForm({ title: "", academicSession: "", startDate: "", endDate: "", applicationFee: "", acceptanceFee: "" });
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to create admission session");
    }
  };

  const createClass = async () => {
    try {
      await createAdmissionAdminClass({
        className: classForm.className,
        section: classForm.section,
        capacity: Number(classForm.capacity || 0),
        formFee: Number(classForm.formFee || 0),
      });
      setClassForm({ className: "", section: "", capacity: "", formFee: "" });
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to create admission class");
    }
  };

  return (
    <div style={{ padding: 20, background: "#f4f8fd", minHeight: "100vh" }}>
      <h2>Admissions Desk</h2>
      <p style={{ marginTop: 0, color: "#4b637f" }}>Review enquiries, screening, class placement, admission decisions, and enrolment records from one Angel Montessori admissions desk.</p>

      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      {loading ? <p>Loading admissions records...</p> : null}

      <SummaryCards summary={summary} />

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "240px 1fr", gap: 12, alignItems: "start" }}>
        <aside style={{ ...panelStyle, position: "sticky", top: 16 }}>
          <h4 style={{ marginTop: 0, marginBottom: 8 }}>Admissions Menu</h4>
          <div style={{ display: "grid", gap: 6 }}>
            {ADMIN_SECTIONS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => goToSection(item.key)}
                style={{
                  textAlign: "left",
                  border: "1px solid #d5e3f3",
                  background: activeSection === item.key ? "#e8f2ff" : "#fff",
                  borderRadius: 8,
                  padding: "8px 10px",
                  cursor: "pointer",
                  fontWeight: activeSection === item.key ? 700 : 500,
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </aside>

        <main style={{ display: "grid", gap: 12 }}>
          {activeSection === "dashboard" ? (
            <section style={panelStyle}>
              <h3 style={{ marginTop: 0 }}>Overview</h3>
              <p style={{ marginTop: 0, color: "#4d647f" }}>Use the sections on the left to follow each admission step, from setup and applications to screening, decisions, and enrolment.</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button onClick={() => goToSection("sessions")}>Manage Sessions</button>
                <button onClick={() => goToSection("classes")}>Manage Classes</button>
                <button onClick={() => goToSection("applications")}>View Applications</button>
                <button onClick={() => goToSection("screening")}>Schedule Screening</button>
                <button onClick={() => goToSection("decisions")}>Publish Decisions</button>
                <button onClick={() => goToSection("enrollment")}>Enrollment</button>
              </div>
            </section>
          ) : null}

          {activeSection === "sessions" ? (
            <SessionsPanel
              sessions={sessions}
              sessionForm={sessionForm}
              setSessionForm={setSessionForm}
              createSession={createSession}
              onSessionStatusChange={async (id, status) => {
                await updateAdmissionAdminSession(id, { status });
                await load();
              }}
            />
          ) : null}

          {activeSection === "classes" ? (
            <ClassesPanel
              classes={classes}
              classForm={classForm}
              setClassForm={setClassForm}
              createClass={createClass}
              onClassStatusChange={async (id, status) => {
                await updateAdmissionAdminClass(id, { status });
                await load();
              }}
            />
          ) : null}

          {["applications", "documents", "payments", "screening", "decisions", "enrollment"].includes(activeSection) ? (
            <ApplicationsPanel
              title={sectionTitle(activeSection)}
              hint={sectionHint(activeSection)}
              filter={filter}
              setFilter={setFilter}
              applyFilters={applyFilters}
              sessions={sessions}
              classes={classes}
              applications={visibleApplications}
              selected={selected}
              selectedId={selectedId}
              setSelectedId={setSelectedId}
              onRefresh={load}
              focusSection={activeSection}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}
function SessionsPanel({ sessions, sessionForm, setSessionForm, createSession, onSessionStatusChange }) {
  return (
    <section style={panelStyle}>
      <h3 style={{ marginTop: 0 }}>Admission Intake Settings</h3>
      <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
        {sessions.map((row) => (
          <div key={row.id} style={{ border: "1px solid #e2eaf5", borderRadius: 8, padding: 8, background: "#fff" }}>
            <strong>{row.title}</strong>
            <div style={{ fontSize: 13, color: "#4d647f" }}>
              {row.academicSession} | {row.startDate} - {row.endDate || "Open"} {row.isActive ? "| Active school session" : ""}
            </div>
            <div style={{ marginTop: 6, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <select value={row.status} onChange={async (e) => onSessionStatusChange(row.id, e.target.value)}>
                <option value="OPEN">OPEN</option>
                <option value="CLOSED">CLOSED</option>
              </select>
              <span style={{ fontSize: 12, color: "#64748b" }}>App Fee: N{Number(row.applicationFee || 0).toLocaleString()}</span>
              <span style={{ fontSize: 12, color: "#64748b" }}>Acceptance Fee: N{Number(row.acceptanceFee || 0).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>

      <h4 style={{ marginBottom: 6 }}>Create Admission Intake</h4>
      <Grid2>
        <input placeholder="Title (e.g 2026/2027 Admission)" value={sessionForm.title} onChange={(e) => setSessionForm((p) => ({ ...p, title: e.target.value }))} />
        <input placeholder="Shared academic session" value={sessionForm.academicSession} onChange={(e) => setSessionForm((p) => ({ ...p, academicSession: e.target.value }))} />
        <input type="date" value={sessionForm.startDate} onChange={(e) => setSessionForm((p) => ({ ...p, startDate: e.target.value }))} />
        <input type="date" value={sessionForm.endDate} onChange={(e) => setSessionForm((p) => ({ ...p, endDate: e.target.value }))} />
        <input placeholder="Application Fee" value={sessionForm.applicationFee} onChange={(e) => setSessionForm((p) => ({ ...p, applicationFee: e.target.value }))} />
        <input placeholder="Acceptance Fee" value={sessionForm.acceptanceFee} onChange={(e) => setSessionForm((p) => ({ ...p, acceptanceFee: e.target.value }))} />
      </Grid2>
      <button onClick={createSession} style={{ marginTop: 8 }}>Create Session</button>
    </section>
  );
}

function ClassesPanel({ classes, classForm, setClassForm, createClass, onClassStatusChange }) {
  return (
    <section style={panelStyle}>
      <h3 style={{ marginTop: 0 }}>Classes Open For Admission</h3>
      <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
        {classes.map((row) => (
          <div key={row.id} style={{ border: "1px solid #e2eaf5", borderRadius: 8, padding: 8, background: "#fff" }}>
            <strong>{row.className}</strong>
            <div style={{ fontSize: 13, color: "#4d647f" }}>{row.section || "-"}</div>
            <div style={{ marginTop: 6, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <select value={row.status} onChange={async (e) => onClassStatusChange(row.id, e.target.value)}>
                <option value="OPEN">OPEN</option>
                <option value="CLOSED">CLOSED</option>
              </select>
              <span style={{ fontSize: 12, color: "#64748b" }}>Capacity: {row.capacity || "-"}</span>
            </div>
          </div>
        ))}
      </div>

      <h4 style={{ marginBottom: 6 }}>Add Class</h4>
      <Grid2>
        <input placeholder="Class Name" value={classForm.className} onChange={(e) => setClassForm((p) => ({ ...p, className: e.target.value }))} />
        <input placeholder="Section" value={classForm.section} onChange={(e) => setClassForm((p) => ({ ...p, section: e.target.value }))} />
        <input placeholder="Capacity" value={classForm.capacity} onChange={(e) => setClassForm((p) => ({ ...p, capacity: e.target.value }))} />
        <input placeholder="Form Fee" value={classForm.formFee} onChange={(e) => setClassForm((p) => ({ ...p, formFee: e.target.value }))} />
      </Grid2>
      <button onClick={createClass} style={{ marginTop: 8 }}>Add Class</button>
    </section>
  );
}

function ApplicationsPanel({
  title,
  hint,
  filter,
  setFilter,
  applyFilters,
  sessions,
  classes,
  applications,
  selected,
  selectedId,
  setSelectedId,
  onRefresh,
  focusSection,
}) {
  return (
    <section style={panelStyle}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <p style={{ marginTop: 0, color: "#4d647f" }}>{hint}</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8, marginBottom: 8 }}>
        <select value={filter.status} onChange={(e) => setFilter((p) => ({ ...p, status: e.target.value }))}>
          <option value="ALL">All Status</option>
          {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
        <select value={filter.paymentStatus} onChange={(e) => setFilter((p) => ({ ...p, paymentStatus: e.target.value }))}>
          <option value="ALL">All Payments</option>
          <option value="PAID">Paid</option>
          <option value="UNPAID">Unpaid</option>
        </select>
        <select value={filter.sessionId} onChange={(e) => setFilter((p) => ({ ...p, sessionId: e.target.value }))}>
          <option value="">All Sessions</option>
          {sessions.map((row) => <option key={row.id} value={row.id}>{row.title}</option>)}
        </select>
        <select value={filter.classId} onChange={(e) => setFilter((p) => ({ ...p, classId: e.target.value }))}>
          <option value="">All Classes</option>
          {classes.map((row) => <option key={row.id} value={row.id}>{row.className}</option>)}
        </select>
        <select value={filter.archived} onChange={(e) => setFilter((p) => ({ ...p, archived: e.target.value }))}>
          <option value="active">Active Only</option>
          <option value="all">Include Archived</option>
          <option value="only">Archived Only</option>
        </select>
        <input placeholder="Search name, app no, class" value={filter.search} onChange={(e) => setFilter((p) => ({ ...p, search: e.target.value }))} />
        <button onClick={applyFilters}>Apply Filters</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 12 }}>
        <div style={{ border: "1px solid #dbe4f0", borderRadius: 10, maxHeight: 620, overflow: "auto", background: "#fff" }}>
          {applications.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedId(item.id)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                border: "none",
                borderBottom: "1px solid #e8edf5",
                background: String(selectedId) === String(item.id) ? "#eef5ff" : "#fff",
                padding: 10,
                cursor: "pointer",
              }}
            >
              <strong>{item.applicationNo}</strong>
              <div>{item.personal?.firstName} {item.personal?.surname}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{item.className} | {item.status}</div>
            </button>
          ))}
          {applications.length === 0 ? <p style={{ padding: 10 }}>No applications found in this section.</p> : null}
        </div>

        <div style={{ border: "1px solid #dbe4f0", borderRadius: 10, padding: 12, background: "#fff" }}>
          {selected ? <ApplicationInspector item={selected} classes={classes} onRefresh={onRefresh} focusSection={focusSection} /> : <p>Select an application to review.</p>}
        </div>
      </div>
    </section>
  );
}
function ApplicationInspector({ item, classes, onRefresh, focusSection }) {
  const [status, setStatus] = useState(item.status || "SUBMITTED");
  const [assignedOfficerName, setAssignedOfficerName] = useState(item.assignedOfficerName || "");
  const [workflowNote, setWorkflowNote] = useState("");

  const [reviewChecklist, setReviewChecklist] = useState(item.reviewChecklist || {});
  const [reviewNotes, setReviewNotes] = useState(item.reviewNotes || "");

  const [screening, setScreening] = useState(item.screening || {});
  const [decision, setDecision] = useState(item.decision?.decision || "ADMITTED");
  const [decisionNote, setDecisionNote] = useState(item.decision?.note || "");
  const [decisionClass, setDecisionClass] = useState(item.decision?.offeredClassId || item.classId || "");

  const [acceptancePaid, setAcceptancePaid] = useState(Boolean(item.acceptanceFeePaid));
  const [acceptanceRef, setAcceptanceRef] = useState(item.acceptanceFeeReference || "");

  const [enroll, setEnroll] = useState({
    assignedClassId: item.enrollment?.assignedClassId || item.classId || "",
    admissionNo: item.enrollment?.admissionNo || "",
    createStudentLogin: true,
    createParentLogin: true,
    studentUsername: "",
    parentUsername: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const run = async (fn, successText) => {
    try {
      setError("");
      setMessage("");
      await fn();
      setMessage(successText);
      await onRefresh();
    } catch (e) {
      setError(e?.response?.data?.message || "Operation failed");
    }
  };

  const handleArchiveToggle = async () => {
    await run(
      () => archiveAdmissionApplication(item.id, { archived: !item.isArchived }),
      item.isArchived ? "Application restored." : "Application archived."
    );
  };

  const handleDelete = async () => {
    const approved = window.confirm(`Delete application ${item.applicationNo}? This cannot be undone.`);
    if (!approved) return;
    await run(() => deleteAdmissionApplication(item.id), "Application deleted.");
  };
  const showAll = focusSection === "dashboard" || focusSection === "applications";
  const showWorkflow = showAll;
  const showReview = showAll;
  const showDocuments = showAll || focusSection === "documents";
  const showPayments = showAll || focusSection === "payments";
  const showScreening = showAll || focusSection === "screening";
  const showDecisions = showAll || focusSection === "decisions";
  const showEnrollment = showAll || focusSection === "enrollment";

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>{item.applicationNo} - {item.personal?.firstName} {item.personal?.surname}</h3>
      <p style={{ marginTop: 0, color: "#64748b" }}>
        {item.className} | {item.sessionName} | Current Status: <strong>{item.status}</strong>
      </p>

      {message ? <p style={{ color: "#1f6f3a" }}>{message}</p> : null}
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <button onClick={handleArchiveToggle}>{item.isArchived ? "Restore Application" : "Archive Application"}</button>
        <button onClick={handleDelete} style={{ color: "crimson" }} disabled={item.status === "ENROLLED" || Boolean(item.enrollment?.studentId)}>
          Delete Application
        </button>
        {item.status === "ENROLLED" || item.enrollment?.studentId ? (
          <span style={{ fontSize: 12, color: "#64748b" }}>Enrolled applications can be archived but not deleted.</span>
        ) : null}
      </div>

      {showWorkflow ? (
        <div style={{ borderTop: "1px solid #e5edf6", paddingTop: 8, marginTop: 8 }}>
          <h4>Admission Review</h4>
          <Grid2>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {statusOptions.map((row) => <option key={row} value={row}>{row}</option>)}
            </select>
            <input placeholder="Assigned officer" value={assignedOfficerName} onChange={(e) => setAssignedOfficerName(e.target.value)} />
          </Grid2>
          <textarea rows={2} placeholder="Admission note" value={workflowNote} onChange={(e) => setWorkflowNote(e.target.value)} style={{ width: "100%", marginTop: 8 }} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={() => run(() => updateAdmissionWorkflow(item.id, { status, assignedOfficerName, note: workflowNote }), "Admission review updated")}>Save Review</button>
            <button onClick={() => run(() => reopenAdmissionApplication(item.id, { note: "Reopened by admin" }), "Application reopened")}>Reopen</button>
          </div>
        </div>
      ) : null}

      {showReview ? (
        <div style={{ borderTop: "1px solid #e5edf6", paddingTop: 8, marginTop: 12 }}>
          <h4>Review Checklist</h4>
          <div style={{ display: "grid", gap: 4 }}>
            {[
              ["personalComplete", "Personal details complete"],
              ["parentComplete", "Parent details complete"],
              ["academicComplete", "Academic history complete"],
              ["documentsComplete", "Documents complete"],
              ["paymentVerified", "Payment verified"],
              ["academicAcceptable", "Academic profile acceptable"],
            ].map(([key, label]) => (
              <label key={key} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={Boolean(reviewChecklist[key])}
                  onChange={(e) => setReviewChecklist((prev) => ({ ...prev, [key]: e.target.checked }))}
                />
                {label}
              </label>
            ))}
          </div>
          <textarea rows={2} value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Review notes" style={{ width: "100%", marginTop: 6 }} />
          <button onClick={() => run(() => reviewAdmissionApplication(item.id, { reviewChecklist, reviewNotes }), "Review notes saved")}>Save Review</button>
        </div>
      ) : null}

      {showDocuments ? (
        <div style={{ borderTop: "1px solid #e5edf6", paddingTop: 8, marginTop: 12 }}>
          <h4>Document Verification</h4>
          <div style={{ display: "grid", gap: 6 }}>
            {documentKeys.map((row) => (
              <div key={row.key} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <strong style={{ minWidth: 170 }}>{row.label}</strong>
                <span style={{ fontSize: 12, color: "#64748b" }}>{item.documents?.[row.key] ? "Uploaded" : "Not uploaded"}</span>
                <button onClick={() => run(() => verifyAdmissionDocument(item.id, { key: row.key, status: "VERIFIED" }), `${row.label} verified`)}>Verify</button>
                <button onClick={() => run(() => verifyAdmissionDocument(item.id, { key: row.key, status: "REJECTED" }), `${row.label} rejected`)}>Reject</button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {showScreening ? (
        <div style={{ borderTop: "1px solid #e5edf6", paddingTop: 8, marginTop: 12 }}>
          <h4>Screening</h4>
          <Grid2>
            <input placeholder="Type (Exam/Interview)" value={screening.type || ""} onChange={(e) => setScreening((p) => ({ ...p, type: e.target.value }))} />
            <input type="date" value={screening.date || ""} onChange={(e) => setScreening((p) => ({ ...p, date: e.target.value }))} />
            <input placeholder="Time" value={screening.time || ""} onChange={(e) => setScreening((p) => ({ ...p, time: e.target.value }))} />
            <input placeholder="Venue" value={screening.venue || ""} onChange={(e) => setScreening((p) => ({ ...p, venue: e.target.value }))} />
            <input placeholder="Score" value={screening.score || ""} onChange={(e) => setScreening((p) => ({ ...p, score: e.target.value }))} />
            <input placeholder="Screening Status" value={screening.status || ""} onChange={(e) => setScreening((p) => ({ ...p, status: e.target.value }))} />
          </Grid2>
          <textarea rows={2} placeholder="Instructions / remarks" value={screening.instructions || ""} onChange={(e) => setScreening((p) => ({ ...p, instructions: e.target.value }))} style={{ width: "100%", marginTop: 6 }} />
          <button onClick={() => run(() => updateAdmissionScreening(item.id, screening), "Screening updated")}>Save Screening</button>
        </div>
      ) : null}
      {showDecisions ? (
        <div style={{ borderTop: "1px solid #e5edf6", paddingTop: 8, marginTop: 12 }}>
          <h4>Decision</h4>
          <Grid2>
            <select value={decision} onChange={(e) => setDecision(e.target.value)}>
              <option value="ADMITTED">ADMITTED</option>
              <option value="WAITLISTED">WAITLISTED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
            <select value={decisionClass} onChange={(e) => setDecisionClass(e.target.value)}>
              <option value="">Offered Class</option>
              {classes.map((row) => <option key={row.id} value={row.id}>{row.className}</option>)}
            </select>
          </Grid2>
          <textarea rows={2} placeholder="Decision note" value={decisionNote} onChange={(e) => setDecisionNote(e.target.value)} style={{ width: "100%", marginTop: 6 }} />
          <button onClick={() => run(() => publishAdmissionDecision(item.id, { decision, offeredClassId: decisionClass, note: decisionNote }), "Decision published")}>Publish Decision</button>
        </div>
      ) : null}

      {showPayments ? (
        <div style={{ borderTop: "1px solid #e5edf6", paddingTop: 8, marginTop: 12 }}>
          <h4>Acceptance Fee</h4>
          <p style={{ margin: "0 0 8px", color: "#4d647f" }}>
            Application Fee: <strong>{item.applicationFeePaid ? "Paid" : "Unpaid"}</strong>
            {" | "}
            Acceptance Fee: <strong>{item.acceptanceFeePaid ? "Paid" : "Unpaid"}</strong>
          </p>
          <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
            <input type="checkbox" checked={acceptancePaid} onChange={(e) => setAcceptancePaid(e.target.checked)} />
            Mark acceptance fee as paid
          </label>
          <input placeholder="Reference" value={acceptanceRef} onChange={(e) => setAcceptanceRef(e.target.value)} />
          <div style={{ marginTop: 6 }}>
            <button onClick={() => run(() => updateAdmissionAcceptance(item.id, { paid: acceptancePaid, reference: acceptanceRef }), "Acceptance fee updated")}>Save Acceptance</button>
          </div>
        </div>
      ) : null}

      {showEnrollment ? (
        <div style={{ borderTop: "1px solid #e5edf6", paddingTop: 8, marginTop: 12 }}>
          <h4>Enrollment Conversion</h4>
          <Grid2>
            <input placeholder="Admission No (optional)" value={enroll.admissionNo} onChange={(e) => setEnroll((p) => ({ ...p, admissionNo: e.target.value }))} />
            <select value={enroll.assignedClassId} onChange={(e) => setEnroll((p) => ({ ...p, assignedClassId: e.target.value }))}>
              <option value="">Assign Class</option>
              {classes.map((row) => <option key={row.id} value={row.id}>{row.className}</option>)}
            </select>
            <input placeholder="Student username (optional)" value={enroll.studentUsername} onChange={(e) => setEnroll((p) => ({ ...p, studentUsername: e.target.value }))} />
            <input placeholder="Parent username (optional)" value={enroll.parentUsername} onChange={(e) => setEnroll((p) => ({ ...p, parentUsername: e.target.value }))} />
          </Grid2>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <label><input type="checkbox" checked={enroll.createStudentLogin} onChange={(e) => setEnroll((p) => ({ ...p, createStudentLogin: e.target.checked }))} /> Student Login</label>
            <label><input type="checkbox" checked={enroll.createParentLogin} onChange={(e) => setEnroll((p) => ({ ...p, createParentLogin: e.target.checked }))} /> Parent Login</label>
          </div>
          <div style={{ marginTop: 8 }}>
            <button
              onClick={() =>
                run(
                  () =>
                    enrollAdmissionApplicant(item.id, {
                      assignedClassId: enroll.assignedClassId,
                      admissionNo: enroll.admissionNo,
                      createStudentLogin: enroll.createStudentLogin,
                      createParentLogin: enroll.createParentLogin,
                      studentUsername: enroll.studentUsername || undefined,
                      parentUsername: enroll.parentUsername || undefined,
                    }),
                  "Applicant enrolled successfully"
                )
              }
            >
              Enroll Applicant
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SummaryCards({ summary }) {
  const cards = [
    ["Started", summary?.applicationsStarted || 0],
    ["Submitted", summary?.applicationsSubmitted || 0],
    ["Under Review", summary?.underReview || 0],
    ["Awaiting Payment", summary?.awaitingPayment || 0],
    ["Shortlisted", summary?.shortlisted || 0],
    ["Admitted", summary?.admitted || 0],
    ["Rejected", summary?.rejected || 0],
    ["Enrolled", summary?.enrolled || 0],
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
      {cards.map(([label, value]) => (
        <div key={label} style={panelStyle}>
          <div style={{ fontSize: 12, color: "#64748b" }}>{label}</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{value}</div>
        </div>
      ))}
    </div>
  );
}

function Grid2({ children }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>{children}</div>;
}

const panelStyle = {
  background: "#fff",
  border: "1px solid #d9e4f0",
  borderRadius: 10,
  padding: 10,
};









