import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  addAdminCareerApplicationNote,
  createAdminCareerVacancy,
  getAdminCareerApplicationDetail,
  getAdminCareerApplications,
  getAdminCareerInterviews,
  getAdminCareerReports,
  getAdminCareerVacancies,
  getCareersDashboard,
  getCareersSetup,
  scheduleAdminCareerInterview,
  updateAdminCareerApplicationStatus,
  updateAdminCareerInterview,
  updateAdminCareerVacancy,
} from "../api/services";

const shellStyle = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #eef4fb 0%, #f8fafc 100%)",
  padding: "24px 16px 40px",
};

const wrapStyle = {
  maxWidth: 1300,
  margin: "0 auto",
};

const cardStyle = {
  background: "#ffffff",
  border: "1px solid #d8e1ef",
  borderRadius: 20,
  padding: 20,
  boxShadow: "0 20px 45px rgba(15, 23, 42, 0.06)",
};

const mutedText = {
  color: "#5b6472",
  lineHeight: 1.6,
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #d2dbe8",
  boxSizing: "border-box",
};

function labelize(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getInitialTab(pathname) {
  if (pathname.includes("/vacancies")) return "vacancies";
  if (pathname.includes("/applications")) return "applications";
  if (pathname.includes("/shortlisted")) return "shortlisted";
  if (pathname.includes("/interviews")) return "interviews";
  if (pathname.includes("/reports")) return "reports";
  return "overview";
}

function DetailRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, borderBottom: "1px solid #edf2f7", paddingBottom: 10 }}>
      <strong style={{ color: "#16335a" }}>{label}</strong>
      <span style={{ color: "#5f7185", textAlign: "right" }}>{value}</span>
    </div>
  );
}

function PrimaryButton({ children, onClick, disabled = false, type = "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        border: "none",
        background: disabled ? "#98add0" : "#163A70",
        color: "#fff",
        borderRadius: 10,
        padding: "10px 14px",
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

export default function CareersDashboard() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => getInitialTab(location.pathname));
  const [dashboard, setDashboard] = useState(null);
  const [setup, setSetup] = useState({ categories: [], employmentTypes: [], departments: [] });
  const [vacancies, setVacancies] = useState([]);
  const [applications, setApplications] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [reports, setReports] = useState(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState("");
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [applicationSearch, setApplicationSearch] = useState("");
  const [vacancyForm, setVacancyForm] = useState({
    jobTitle: "",
    department: "",
    category: "academic_staff",
    location: "Main Campus, Owo",
    employmentType: "full_time",
    description: "",
    requirements: "",
    responsibilities: "",
    salaryRange: "",
    applicationDeadline: "",
    openingsCount: 1,
    status: "draft",
  });
  const [statusForm, setStatusForm] = useState({ status: "under_review", note: "" });
  const [noteText, setNoteText] = useState("");
  const [interviewForm, setInterviewForm] = useState({ interviewDate: "", interviewTime: "", interviewMode: "physical", interviewerName: "", interviewNote: "" });

  useEffect(() => {
    setActiveTab(getInitialTab(location.pathname));
  }, [location.pathname]);

  const loadAll = async (preserveId = "") => {
    try {
      setLoading(true);
      setError("");
      const [dashboardRes, setupRes, vacanciesRes, applicationsRes, interviewsRes, reportsRes] = await Promise.all([
        getCareersDashboard(),
        getCareersSetup(),
        getAdminCareerVacancies(),
        getAdminCareerApplications({ search: applicationSearch }),
        getAdminCareerInterviews(),
        getAdminCareerReports(),
      ]);

      const nextApplications = applicationsRes?.data?.applications || [];
      const nextSelectedId = preserveId && nextApplications.some((item) => item.id === preserveId)
        ? preserveId
        : nextApplications[0]?.id || "";

      setDashboard(dashboardRes?.data || null);
      setSetup(setupRes?.data?.setup || { categories: [], employmentTypes: [], departments: [] });
      setVacancies(vacanciesRes?.data?.vacancies || []);
      setApplications(nextApplications);
      setInterviews(interviewsRes?.data?.interviews || []);
      setReports(reportsRes?.data || null);
      setSelectedApplicationId(nextSelectedId);
      if (nextSelectedId) {
        await loadApplicationDetail(nextSelectedId);
      } else {
        setSelectedApplication(null);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "We could not load the careers dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll(selectedApplicationId);
  }, []);

  const loadApplicationDetail = async (applicationId) => {
    if (!applicationId) {
      setSelectedApplication(null);
      return;
    }
    try {
      const res = await getAdminCareerApplicationDetail(applicationId);
      const application = res?.data?.application || null;
      setSelectedApplication(application);
      if (application) {
        setStatusForm({ status: application.status === "new" ? "under_review" : application.status, note: "" });
        setInterviewForm((prev) => ({ ...prev, interviewDate: "", interviewTime: "", interviewMode: "physical", interviewerName: "", interviewNote: "" }));
      }
    } catch {
      setSelectedApplication(null);
    }
  };

  useEffect(() => {
    loadApplicationDetail(selectedApplicationId);
  }, [selectedApplicationId]);

  const summaryCards = dashboard?.summary ? [
    ["Open Vacancies", dashboard.summary.openVacancies],
    ["Applications", dashboard.summary.applicationsReceived],
    ["Under Review", dashboard.summary.underReview],
    ["Shortlisted", dashboard.summary.shortlisted],
    ["Interviews", dashboard.summary.interviewsScheduled],
    ["Hired", dashboard.summary.hired],
  ] : [];

  const shortlistedRows = useMemo(
    () => applications.filter((item) => ["shortlisted", "interviewed", "offered", "hired"].includes(String(item.status || "").toLowerCase())),
    [applications],
  );

  const runAction = async (task, successMessage) => {
    try {
      setSaving(true);
      setError("");
      setNotice("");
      await task();
      await loadAll(selectedApplicationId);
      if (selectedApplicationId) {
        await loadApplicationDetail(selectedApplicationId);
      }
      setNotice(successMessage);
    } catch (err) {
      setError(err?.response?.data?.message || "We could not complete that action.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={shellStyle}>
      <div style={wrapStyle}>
        <section style={{ ...cardStyle, background: "linear-gradient(135deg, #163A70 0%, #1f4e79 58%, #254a92 100%)", color: "#fff", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <div style={{ letterSpacing: "0.12em", textTransform: "uppercase", fontSize: 12, color: "#d7e5ff" }}>Careers Dashboard</div>
              <h1 style={{ margin: "10px 0 8px", fontSize: "clamp(2rem, 4vw, 3rem)" }}>Vacancies, applications, interviews, and hiring records</h1>
              <p style={{ margin: 0, color: "#e7eefb", maxWidth: 760, lineHeight: 1.7 }}>
                Manage recruitment for teaching, administration, ICT, transport, finance, and support roles from one Angel Montessori hiring desk.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link to="/careers" style={{ background: "#ffffff", color: "#163A70", padding: "10px 14px", borderRadius: 10, textDecoration: "none", fontWeight: 700 }}>Public Careers Page</Link>
              <Link to="/careers/vacancies" style={{ background: "#f3d16b", color: "#3b2f07", padding: "10px 14px", borderRadius: 10, textDecoration: "none", fontWeight: 700 }}>Current Vacancies</Link>
            </div>
          </div>
        </section>

        {error ? <div style={{ ...cardStyle, borderColor: "#f3c7c7", color: "#b42318", marginBottom: 16 }}>{error}</div> : null}
        {notice ? <div style={{ ...cardStyle, borderColor: "#b7ebd0", color: "#027a48", marginBottom: 16 }}>{notice}</div> : null}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 20 }}>
          {summaryCards.map(([label, value]) => (
            <article key={label} style={{ ...cardStyle, padding: 18 }}>
              <div style={{ color: "#163A70", fontWeight: 800, fontSize: 30 }}>{value}</div>
              <div style={{ marginTop: 6, color: "#465063", fontWeight: 700 }}>{label}</div>
            </article>
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
          {["overview", "vacancies", "applications", "shortlisted", "interviews", "reports"].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                border: "1px solid #d7e0ee",
                background: activeTab === tab ? "#163A70" : "#ffffff",
                color: activeTab === tab ? "#ffffff" : "#163A70",
                borderRadius: 999,
                padding: "10px 16px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {labelize(tab)}
            </button>
          ))}
        </div>

        {loading ? <div style={cardStyle}>Loading careers records...</div> : null}

        {!loading && activeTab === "overview" ? (
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 18 }}>
            <article style={cardStyle}>
              <h2 style={{ marginTop: 0 }}>Recent Applications</h2>
              <div style={{ display: "grid", gap: 12 }}>
                {(dashboard?.recentApplications || []).map((item) => (
                  <div key={item.id} style={{ border: "1px solid #e4e8ef", borderRadius: 16, padding: 16 }}>
                    <strong style={{ color: "#163A70" }}>{item.fullName}</strong>
                    <div style={mutedText}>{item.applicationNumber} • {item.vacancyTitle || "Vacancy"}</div>
                    <div style={{ color: "#667085", fontSize: 13, marginTop: 6 }}>{labelize(item.status)} • {formatDate(item.submittedAt)}</div>
                  </div>
                ))}
              </div>
            </article>
            <article style={cardStyle}>
              <h2 style={{ marginTop: 0 }}>Upcoming Interviews</h2>
              <div style={{ display: "grid", gap: 12 }}>
                {(dashboard?.upcomingInterviews || []).map((item) => (
                  <div key={item.id} style={{ border: "1px solid #e4e8ef", borderRadius: 16, padding: 16 }}>
                    <strong style={{ color: "#163A70" }}>{item.applicantName || "Candidate"}</strong>
                    <div style={mutedText}>{item.vacancyTitle || "Vacancy"}</div>
                    <div style={{ color: "#667085", fontSize: 13, marginTop: 6 }}>{formatDate(item.interviewDate)} • {item.interviewTime} • {labelize(item.interviewMode)}</div>
                  </div>
                ))}
              </div>
            </article>
          </div>
        ) : null}

        {!loading && activeTab === "vacancies" ? (
          <div style={{ display: "grid", gridTemplateColumns: "0.9fr 1.1fr", gap: 18 }}>
            <article style={cardStyle}>
              <h2 style={{ marginTop: 0 }}>Create Vacancy</h2>
              <form onSubmit={(e) => {
                e.preventDefault();
                runAction(() => createAdminCareerVacancy(vacancyForm), "Vacancy saved successfully.");
              }} style={{ display: "grid", gap: 12 }}>
                <input value={vacancyForm.jobTitle} onChange={(e) => setVacancyForm((prev) => ({ ...prev, jobTitle: e.target.value }))} placeholder="Job Title" style={inputStyle} required />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <input value={vacancyForm.department} onChange={(e) => setVacancyForm((prev) => ({ ...prev, department: e.target.value }))} placeholder="Department" style={inputStyle} required />
                  <select value={vacancyForm.category} onChange={(e) => setVacancyForm((prev) => ({ ...prev, category: e.target.value }))} style={inputStyle}>
                    {(setup.categories || []).map((item) => <option key={item} value={item}>{labelize(item)}</option>)}
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <input value={vacancyForm.location} onChange={(e) => setVacancyForm((prev) => ({ ...prev, location: e.target.value }))} placeholder="Location" style={inputStyle} />
                  <select value={vacancyForm.employmentType} onChange={(e) => setVacancyForm((prev) => ({ ...prev, employmentType: e.target.value }))} style={inputStyle}>
                    {(setup.employmentTypes || []).map((item) => <option key={item} value={item}>{labelize(item)}</option>)}
                  </select>
                </div>
                <textarea value={vacancyForm.description} onChange={(e) => setVacancyForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Description" rows={4} style={{ ...inputStyle, resize: "vertical" }} required />
                <textarea value={vacancyForm.requirements} onChange={(e) => setVacancyForm((prev) => ({ ...prev, requirements: e.target.value }))} placeholder="Requirements" rows={4} style={{ ...inputStyle, resize: "vertical" }} />
                <textarea value={vacancyForm.responsibilities} onChange={(e) => setVacancyForm((prev) => ({ ...prev, responsibilities: e.target.value }))} placeholder="Responsibilities" rows={4} style={{ ...inputStyle, resize: "vertical" }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <input value={vacancyForm.salaryRange} onChange={(e) => setVacancyForm((prev) => ({ ...prev, salaryRange: e.target.value }))} placeholder="Salary Range" style={inputStyle} />
                  <input type="date" value={vacancyForm.applicationDeadline} onChange={(e) => setVacancyForm((prev) => ({ ...prev, applicationDeadline: e.target.value }))} style={inputStyle} required />
                  <input type="number" min="1" value={vacancyForm.openingsCount} onChange={(e) => setVacancyForm((prev) => ({ ...prev, openingsCount: Number(e.target.value || 1) }))} placeholder="Openings" style={inputStyle} />
                </div>
                <select value={vacancyForm.status} onChange={(e) => setVacancyForm((prev) => ({ ...prev, status: e.target.value }))} style={inputStyle}>
                  {["draft", "published", "closed", "archived"].map((item) => <option key={item} value={item}>{labelize(item)}</option>)}
                </select>
                <PrimaryButton type="submit" disabled={saving}>{saving ? "Saving..." : "Save Vacancy"}</PrimaryButton>
              </form>
            </article>
            <article style={cardStyle}>
              <h2 style={{ marginTop: 0 }}>Vacancies</h2>
              <div style={{ display: "grid", gap: 12 }}>
                {vacancies.map((item) => (
                  <div key={item.id} style={{ border: "1px solid #e4e8ef", borderRadius: 16, padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <strong style={{ color: "#163A70" }}>{item.jobTitle}</strong>
                        <div style={mutedText}>{item.department} • {item.vacancyCode}</div>
                      </div>
                      <div style={{ fontWeight: 700, color: "#475467" }}>{labelize(item.status)}</div>
                    </div>
                    <div style={{ color: "#667085", fontSize: 13, margin: "8px 0 12px" }}>
                      Deadline: {formatDate(item.applicationDeadline)} • {item.applicationsCount} applications
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {["draft", "published", "closed"].map((status) => (
                        <button key={status} type="button" onClick={() => runAction(() => updateAdminCareerVacancy(item.id, { status }), `Vacancy marked ${labelize(status)}.`)} style={{ border: "1px solid #d7e0ee", background: "#fff", color: "#163A70", borderRadius: 10, padding: "8px 12px", fontWeight: 700, cursor: "pointer" }}>
                          {labelize(status)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </div>
        ) : null}

        {!loading && activeTab === "applications" ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <article style={cardStyle}>
              <h2 style={{ marginTop: 0 }}>Applications</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, marginBottom: 12 }}>
                <input value={applicationSearch} onChange={(e) => setApplicationSearch(e.target.value)} placeholder="Search applications" style={inputStyle} />
                <PrimaryButton onClick={() => loadAll(selectedApplicationId)}>Search</PrimaryButton>
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                {applications.map((item) => (
                  <button key={item.id} type="button" onClick={() => setSelectedApplicationId(item.id)} style={{ textAlign: "left", border: item.id === selectedApplicationId ? "2px solid #163A70" : "1px solid #dbe4f0", background: item.id === selectedApplicationId ? "#eff6ff" : "#fff", borderRadius: 16, padding: 16, cursor: "pointer" }}>
                    <strong style={{ color: "#163A70" }}>{item.fullName}</strong>
                    <div style={mutedText}>{item.applicationNumber} • {item.vacancyTitle}</div>
                    <div style={{ color: "#667085", fontSize: 13, marginTop: 6 }}>{labelize(item.status)} • {formatDate(item.submittedAt)}</div>
                  </button>
                ))}
              </div>
            </article>

            <article style={cardStyle}>
              {selectedApplication ? (
                <>
                  <h2 style={{ marginTop: 0 }}>Application Detail</h2>
                  <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
                    <DetailRow label="Applicant" value={selectedApplication.fullName} />
                    <DetailRow label="Vacancy" value={selectedApplication.vacancy?.jobTitle || "-"} />
                    <DetailRow label="Phone" value={selectedApplication.phone || "-"} />
                    <DetailRow label="Email" value={selectedApplication.email || "-"} />
                    <DetailRow label="Qualification" value={selectedApplication.highestQualification || "-"} />
                    <DetailRow label="Experience" value={selectedApplication.yearsOfExperience || "-"} />
                    <DetailRow label="TRCN" value={labelize(selectedApplication.trcnStatus)} />
                    <DetailRow label="Teaching Level" value={selectedApplication.teachingLevel || "-"} />
                    <DetailRow label="Subjects" value={selectedApplication.subjectsCanTeach || "-"} />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <h3 style={{ marginBottom: 6 }}>Cover Letter</h3>
                    <p style={mutedText}>{selectedApplication.coverLetter}</p>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <h3 style={{ marginBottom: 6 }}>Documents</h3>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {(selectedApplication.attachments || []).map((item) => (
                        <a key={item.id} href={item.filePath} target="_blank" rel="noreferrer" style={{ border: "1px solid #d7e0ee", borderRadius: 999, padding: "8px 12px", textDecoration: "none", color: "#163A70", fontWeight: 700 }}>
                          {labelize(item.attachmentType)}
                        </a>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <select value={statusForm.status} onChange={(e) => setStatusForm((prev) => ({ ...prev, status: e.target.value }))} style={inputStyle}>
                        {["under_review", "shortlisted", "interviewed", "offered", "rejected", "hired", "archived"].map((item) => <option key={item} value={item}>{labelize(item)}</option>)}
                      </select>
                      <PrimaryButton onClick={() => runAction(() => updateAdminCareerApplicationStatus(selectedApplication.id, statusForm), "Application status updated.")} disabled={saving}>Update Status</PrimaryButton>
                    </div>
                    <textarea value={statusForm.note} onChange={(e) => setStatusForm((prev) => ({ ...prev, note: e.target.value }))} placeholder="Status note" rows={3} style={{ ...inputStyle, resize: "vertical" }} />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <h3 style={{ marginBottom: 6 }}>Internal Note</h3>
                    <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add internal review note" rows={3} style={{ ...inputStyle, resize: "vertical", marginBottom: 10 }} />
                    <PrimaryButton onClick={() => runAction(() => addAdminCareerApplicationNote(selectedApplication.id, { note: noteText }), "Review note added.")} disabled={saving || !noteText.trim()}>Save Note</PrimaryButton>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <h3 style={{ marginBottom: 6 }}>Schedule Interview</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                      <input type="date" value={interviewForm.interviewDate} onChange={(e) => setInterviewForm((prev) => ({ ...prev, interviewDate: e.target.value }))} style={inputStyle} />
                      <input type="time" value={interviewForm.interviewTime} onChange={(e) => setInterviewForm((prev) => ({ ...prev, interviewTime: e.target.value }))} style={inputStyle} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                      <select value={interviewForm.interviewMode} onChange={(e) => setInterviewForm((prev) => ({ ...prev, interviewMode: e.target.value }))} style={inputStyle}>
                        {["physical", "virtual", "phone"].map((item) => <option key={item} value={item}>{labelize(item)}</option>)}
                      </select>
                      <input value={interviewForm.interviewerName} onChange={(e) => setInterviewForm((prev) => ({ ...prev, interviewerName: e.target.value }))} placeholder="Interviewer" style={inputStyle} />
                    </div>
                    <textarea value={interviewForm.interviewNote} onChange={(e) => setInterviewForm((prev) => ({ ...prev, interviewNote: e.target.value }))} placeholder="Interview note" rows={3} style={{ ...inputStyle, resize: "vertical", marginBottom: 10 }} />
                    <PrimaryButton onClick={() => runAction(() => scheduleAdminCareerInterview(selectedApplication.id, interviewForm), "Interview scheduled.")} disabled={saving}>Schedule Interview</PrimaryButton>
                  </div>

                  <div>
                    <h3 style={{ marginBottom: 6 }}>Status History</h3>
                    <div style={{ display: "grid", gap: 8 }}>
                      {(selectedApplication.statusLogs || []).map((item) => (
                        <div key={item.id} style={{ border: "1px solid #e4e8ef", borderRadius: 12, padding: 12 }}>
                          <strong style={{ color: "#163A70" }}>{labelize(item.newStatus)}</strong>
                          <div style={{ color: "#667085", fontSize: 13 }}>{item.changedByName} • {formatDate(item.createdAt)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : <p style={mutedText}>Select an application to review its details.</p>}
            </article>
          </div>
        ) : null}

        {!loading && activeTab === "shortlisted" ? (
          <article style={cardStyle}>
            <h2 style={{ marginTop: 0 }}>Shortlisted Candidates</h2>
            <div style={{ display: "grid", gap: 12 }}>
              {shortlistedRows.map((item) => (
                <div key={item.id} style={{ border: "1px solid #e4e8ef", borderRadius: 16, padding: 16, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <strong style={{ color: "#163A70" }}>{item.fullName}</strong>
                    <div style={mutedText}>{item.vacancyTitle}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, color: "#475467" }}>{labelize(item.status)}</div>
                    <div style={{ color: "#667085", fontSize: 13 }}>{item.latestInterview?.interviewDate ? formatDate(item.latestInterview.interviewDate) : "Schedule interview"}</div>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ) : null}

        {!loading && activeTab === "interviews" ? (
          <article style={cardStyle}>
            <h2 style={{ marginTop: 0 }}>Interviews</h2>
            <div style={{ display: "grid", gap: 12 }}>
              {interviews.map((item) => (
                <div key={item.id} style={{ border: "1px solid #e4e8ef", borderRadius: 16, padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <strong style={{ color: "#163A70" }}>{item.applicantName || "Candidate"}</strong>
                      <div style={mutedText}>{item.vacancyTitle}</div>
                    </div>
                    <div style={{ color: "#475467", fontWeight: 700 }}>{labelize(item.interviewStatus)}</div>
                  </div>
                  <div style={{ color: "#667085", fontSize: 13, margin: "8px 0 12px" }}>{formatDate(item.interviewDate)} • {item.interviewTime} • {labelize(item.interviewMode)} • {item.interviewerName}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {["scheduled", "completed", "rescheduled", "cancelled"].map((status) => (
                      <button key={status} type="button" onClick={() => runAction(() => updateAdminCareerInterview(item.id, { interviewStatus: status }), `Interview marked ${labelize(status)}.`)} style={{ border: "1px solid #d7e0ee", background: "#fff", color: "#163A70", borderRadius: 10, padding: "8px 12px", fontWeight: 700, cursor: "pointer" }}>
                        {labelize(status)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </article>
        ) : null}

        {!loading && activeTab === "reports" ? (
          <div style={{ display: "grid", gap: 18 }}>
            <article style={cardStyle}>
              <h2 style={{ marginTop: 0 }}>Hiring Summary</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                {Object.entries(reports?.summary || {}).map(([key, value]) => (
                  <div key={key} style={{ border: "1px solid #e4e8ef", borderRadius: 14, padding: 16 }}>
                    <div style={{ color: "#163A70", fontWeight: 800, fontSize: 28 }}>{value}</div>
                    <div style={{ color: "#465063", fontWeight: 700 }}>{labelize(key)}</div>
                  </div>
                ))}
              </div>
            </article>

            <article style={cardStyle}>
              <h2 style={{ marginTop: 0 }}>Applications by Vacancy</h2>
              <div style={{ display: "grid", gap: 10 }}>
                {(reports?.applicationsByVacancy || []).map((item) => (
                  <div key={item.vacancyId} style={{ border: "1px solid #e4e8ef", borderRadius: 14, padding: 14, display: "grid", gridTemplateColumns: "2fr repeat(3, 1fr)", gap: 10 }}>
                    <strong style={{ color: "#163A70" }}>{item.jobTitle}</strong>
                    <span style={{ color: "#5f7185" }}>Apps: {item.applications}</span>
                    <span style={{ color: "#5f7185" }}>Shortlisted: {item.shortlisted}</span>
                    <span style={{ color: "#5f7185" }}>Hires: {item.hires}</span>
                  </div>
                ))}
              </div>
            </article>
          </div>
        ) : null}
      </div>
    </div>
  );
}



