import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  addSchemeOfWorkAttachment,
  createSchemeOfWorkSession,
  createSchemeOfWorkTerm,
  createSchemeOfWorkWeek,
  deleteSchemeOfWorkAttachment,
  exportSchemeOfWork,
  exportSchemeOfWorkPdf,
  getSchemeOfWorkApprovals,
  getSchemeOfWorkAnalytics,
  getSchemeOfWorkDashboard,
  getSchemeOfWorkProgress,
  getSchemeOfWorkSessions,
  getSchemeOfWorkSetup,
  getSchemeOfWorkTermDetail,
  getSchemeOfWorkTerms,
  getTeacherSchemeOfWorkTermDetail,
  getTeacherSchemeOfWorkTerms,
  reviewSchemeOfWork,
  submitSchemeOfWorkForReview,
  updateSchemeOfWorkSession,
  updateSchemeOfWorkTerm,
  updateSchemeOfWorkWeek,
  updateTeacherSchemeOfWorkWeekProgress,
} from "../api/services";
import { useAuth } from "../auth/AuthContext";
import DomainAwareLink from "../components/DomainAwareLink";

const MANAGE_ROLES = ["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER"];
const APPROVE_ROLES = ["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER"];

const ADMIN_TABS = [
  { key: "overview", label: "Dashboard", to: "/dashboard/scheme-of-work" },
  { key: "sessions", label: "Sessions", to: "/admin/scheme-of-work/sessions" },
  { key: "terms", label: "Schemes", to: "/admin/scheme-of-work/terms" },
  { key: "weeks", label: "Weekly Entries", to: "/admin/scheme-of-work/weeks" },
  { key: "approvals", label: "Approvals", to: "/admin/scheme-of-work/approvals" },
  { key: "progress", label: "Progress", to: "/admin/scheme-of-work/progress" },
  { key: "export", label: "Export", to: "/admin/scheme-of-work/export" },
];

const TEACHER_TABS = [
  { key: "overview", label: "My Schemes", to: "/teacher/scheme-of-work" },
  { key: "weeks", label: "Weekly Entries", to: "/teacher/scheme-of-work/weeks" },
  { key: "progress", label: "Progress", to: "/teacher/scheme-of-work/progress" },
  { key: "export", label: "Export", to: "/teacher/scheme-of-work/export" },
];

const emptySessionForm = { sessionId: "", title: "", description: "", status: "draft" };
const emptyTermForm = { schemeSessionId: "", termId: "", classId: "", subjectId: "", teacherUserId: "", status: "draft" };
const emptyWeekForm = {
  schemeTermId: "",
  weekNumber: "",
  title: "",
  topic: "",
  subTopic: "",
  learningObjectives: "",
  teachingActivities: "",
  learningMaterials: "",
  assessmentMethod: "",
  teacherNote: "",
  completionStatus: "pending",
  sortOrder: "",
  linkedClassSubjectId: "",
  linkedTopicId: "",
  linkedLessonId: "",
  linkedAssignmentId: "",
  linkedQuizId: "",
};

function getTabFromPath(pathname) {
  if (pathname.includes("/sessions")) return "sessions";
  if (pathname.includes("/terms")) return "terms";
  if (pathname.includes("/weeks")) return "weeks";
  if (pathname.includes("/approvals")) return "approvals";
  if (pathname.includes("/progress")) return "progress";
  if (pathname.includes("/export")) return "export";
  return "overview";
}

function saveBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

function SectionCard({ title, children, aside }) {
  return (
    <section style={styles.sectionCard}>
      <div style={styles.sectionHeaderRow}>
        <h3 style={styles.sectionTitle}>{title}</h3>
        {aside ? <div>{aside}</div> : null}
      </div>
      {children}
    </section>
  );
}

function StatCard({ label, value }) {
  return (
    <article style={styles.statCard}>
      <div style={styles.statLabel}>{label}</div>
      <div style={styles.statValue}>{value}</div>
    </article>
  );
}

function humanizeLabel(value) {
  return String(value || "").replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatStamp(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Attachment file could not be read."));
    reader.readAsDataURL(file);
  });
}

export default function SchemeOfWorkDashboard() {
  const { user } = useAuth();
  const role = user?.role || "";
  const isTeacher = role === "TEACHER";
  const canManage = MANAGE_ROLES.includes(role);
  const canApprove = APPROVE_ROLES.includes(role);
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = useMemo(() => getTabFromPath(location.pathname), [location.pathname]);
  const tabLinks = isTeacher ? TEACHER_TABS : ADMIN_TABS;
  const lessonNotesBasePath = isTeacher ? "/teacher/lesson-notes" : "/dashboard/lesson-notes";

  const [dashboard, setDashboard] = useState({ totals: {}, recentActivity: [], assignedSchemes: [], teacherCoverage: [], atRiskSchemes: [] });
  const [analytics, setAnalytics] = useState({ totals: {}, teacherCoverage: [], subjectCoverage: [], atRiskSchemes: [] });
  const [setup, setSetup] = useState({ sessions: [], terms: [], classes: [], subjects: [], teachers: [], classSubjects: [], topics: [], lessons: [], assignments: [], quizzes: [], statuses: {} });
  const [sessions, setSessions] = useState([]);
  const [allTerms, setAllTerms] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [progressRows, setProgressRows] = useState([]);
  const [termDetail, setTermDetail] = useState(null);
  const [selectedSchemeSessionId, setSelectedSchemeSessionId] = useState("");
  const [selectedTermId, setSelectedTermId] = useState("");
  const [editingSessionId, setEditingSessionId] = useState("");
  const [editingTermId, setEditingTermId] = useState("");
  const [editingWeekId, setEditingWeekId] = useState("");
  const [sessionForm, setSessionForm] = useState(emptySessionForm);
  const [termForm, setTermForm] = useState(emptyTermForm);
  const [weekForm, setWeekForm] = useState(emptyWeekForm);
  const [approvalNote, setApprovalNote] = useState("");
  const [progressDrafts, setProgressDrafts] = useState({});
  const [attachmentWeekId, setAttachmentWeekId] = useState("");
  const [attachmentForm, setAttachmentForm] = useState({ fileTitle: "", fileName: "", fileData: "", mimeType: "", fileSize: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const visibleTerms = useMemo(
    () => (selectedSchemeSessionId ? allTerms.filter((item) => String(item.schemeSessionId) === String(selectedSchemeSessionId)) : allTerms),
    [allTerms, selectedSchemeSessionId]
  );

  const visibleApprovals = useMemo(() => {
    const visibleIds = new Set(visibleTerms.map((item) => String(item.id)));
    return approvals.filter((item) => visibleIds.has(String(item.schemeTermId)));
  }, [approvals, visibleTerms]);

  const visibleProgress = useMemo(() => {
    const visibleIds = new Set(visibleTerms.map((item) => String(item.id)));
    return progressRows.filter((item) => visibleIds.has(String(item.id)));
  }, [progressRows, visibleTerms]);

  const selectedTermSummary = useMemo(
    () => visibleTerms.find((item) => String(item.id) === String(selectedTermId)) || null,
    [visibleTerms, selectedTermId]
  );

  const selectedAttachmentWeek = useMemo(
    () => (termDetail?.weeks || []).find((item) => String(item.id) === String(attachmentWeekId)) || null,
    [attachmentWeekId, termDetail]
  );

  const filteredClassSubjects = useMemo(() => {
    const target = selectedTermSummary || termDetail || null;
    return (setup.classSubjects || []).filter((item) => {
      if (!target) return true;
      if (target.classId && String(item.classId) !== String(target.classId)) return false;
      if (target.subjectId && String(item.subjectId) !== String(target.subjectId)) return false;
      if (target.sessionId && item.sessionId && String(item.sessionId) !== String(target.sessionId)) return false;
      if (target.termId && item.termId && String(item.termId) !== String(target.termId)) return false;
      return true;
    });
  }, [selectedTermSummary, termDetail, setup.classSubjects]);

  const filteredTopics = useMemo(
    () => (setup.topics || []).filter((item) => !weekForm.linkedClassSubjectId || String(item.classSubjectId) === String(weekForm.linkedClassSubjectId)),
    [setup.topics, weekForm.linkedClassSubjectId]
  );

  const filteredLessons = useMemo(
    () => (setup.lessons || []).filter((item) => {
      if (weekForm.linkedClassSubjectId && String(item.classSubjectId) !== String(weekForm.linkedClassSubjectId)) return false;
      if (weekForm.linkedTopicId && item.topicId && String(item.topicId) !== String(weekForm.linkedTopicId)) return false;
      return true;
    }),
    [setup.lessons, weekForm.linkedClassSubjectId, weekForm.linkedTopicId]
  );

  const filteredAssignments = useMemo(
    () => (setup.assignments || []).filter((item) => {
      if (weekForm.linkedClassSubjectId && String(item.classSubjectId) !== String(weekForm.linkedClassSubjectId)) return false;
      if (weekForm.linkedTopicId && item.topicId && String(item.topicId) !== String(weekForm.linkedTopicId)) return false;
      if (weekForm.linkedLessonId && item.lessonId && String(item.lessonId) !== String(weekForm.linkedLessonId)) return false;
      return true;
    }),
    [setup.assignments, weekForm.linkedClassSubjectId, weekForm.linkedTopicId, weekForm.linkedLessonId]
  );

  const filteredQuizzes = useMemo(
    () => (setup.quizzes || []).filter((item) => {
      if (weekForm.linkedClassSubjectId && String(item.classSubjectId) !== String(weekForm.linkedClassSubjectId)) return false;
      if (weekForm.linkedTopicId && item.topicId && String(item.topicId) !== String(weekForm.linkedTopicId)) return false;
      if (weekForm.linkedLessonId && item.lessonId && String(item.lessonId) !== String(weekForm.linkedLessonId)) return false;
      return true;
    }),
    [setup.quizzes, weekForm.linkedClassSubjectId, weekForm.linkedTopicId, weekForm.linkedLessonId]
  );

  const reviewChecklist = useMemo(() => {
    const weeks = Array.isArray(termDetail?.weeks) ? termDetail.weeks : [];
    return [
      { label: "Weekly entries created", ok: weeks.length > 0 },
      { label: "Objectives entered for each week", ok: weeks.length > 0 && weeks.every((item) => item.learningObjectives) },
      { label: "Activities entered for each week", ok: weeks.length > 0 && weeks.every((item) => item.teachingActivities) },
      { label: "Scheme submitted for review", ok: termDetail?.status === "in_review" || termDetail?.status === "approved" },
    ];
  }, [termDetail]);

  const loadAll = async (preferredSchemeSessionId = "", preferredTermId = "") => {
    setLoading(true);
    setError("");
    try {
      const [dashboardRes, analyticsRes, setupRes, sessionsRes, termsRes, approvalsRes, progressRes] = await Promise.all([
        getSchemeOfWorkDashboard(),
        getSchemeOfWorkAnalytics({}),
        getSchemeOfWorkSetup(),
        getSchemeOfWorkSessions(),
        isTeacher ? getTeacherSchemeOfWorkTerms({}) : getSchemeOfWorkTerms({}),
        getSchemeOfWorkApprovals({}),
        getSchemeOfWorkProgress({}),
      ]);

      const nextDashboard = dashboardRes?.data || { totals: {}, recentActivity: [], assignedSchemes: [], teacherCoverage: [], atRiskSchemes: [] };
      const nextAnalytics = analyticsRes?.data?.analytics || { totals: {}, teacherCoverage: [], subjectCoverage: [], atRiskSchemes: [] };
      const nextSetup = setupRes?.data?.setup || { sessions: [], terms: [], classes: [], subjects: [], teachers: [], classSubjects: [], topics: [], lessons: [], assignments: [], quizzes: [], statuses: {} };
      const nextSessions = Array.isArray(sessionsRes?.data?.sessions) ? sessionsRes.data.sessions : [];
      const nextTerms = Array.isArray(termsRes?.data?.terms) ? termsRes.data.terms : [];
      const nextApprovals = Array.isArray(approvalsRes?.data?.approvals) ? approvalsRes.data.approvals : [];
      const nextProgress = Array.isArray(progressRes?.data?.progress) ? progressRes.data.progress : [];

      const fallbackSchemeSessionId =
        preferredSchemeSessionId ||
        (nextTerms.some((item) => String(item.schemeSessionId) === String(selectedSchemeSessionId)) ? selectedSchemeSessionId : "") ||
        nextTerms[0]?.schemeSessionId ||
        nextSessions.find((item) => item.status === "active")?.id ||
        nextSessions[0]?.id ||
        "";

      const nextVisibleTerms = fallbackSchemeSessionId
        ? nextTerms.filter((item) => String(item.schemeSessionId) === String(fallbackSchemeSessionId))
        : nextTerms;

      const fallbackTermId =
        preferredTermId ||
        (nextVisibleTerms.some((item) => String(item.id) === String(selectedTermId)) ? selectedTermId : "") ||
        nextVisibleTerms[0]?.id ||
        "";

      setDashboard(nextDashboard);
      setAnalytics(nextAnalytics);
      setSetup(nextSetup);
      setSessions(nextSessions);
      setAllTerms(nextTerms);
      setApprovals(nextApprovals);
      setProgressRows(nextProgress);
      setSelectedSchemeSessionId(fallbackSchemeSessionId);
      setSelectedTermId(fallbackTermId);
      setSessionForm((current) => ({ ...current, sessionId: current.sessionId || nextSetup.activeSessionId || nextSetup.sessions[0]?.id || "" }));
      setTermForm((current) => ({
        ...current,
        schemeSessionId: fallbackSchemeSessionId || current.schemeSessionId,
        termId: current.termId || nextSetup.activeTermId || nextSetup.terms[0]?.id || "",
      }));
      setWeekForm((current) => ({ ...current, schemeTermId: fallbackTermId || current.schemeTermId }));

      if (fallbackTermId) {
        const detailRes = isTeacher ? await getTeacherSchemeOfWorkTermDetail(fallbackTermId) : await getSchemeOfWorkTermDetail(fallbackTermId);
        setTermDetail(detailRes?.data?.term || null);
      } else {
        setTermDetail(null);
      }
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Scheme of Work data could not be loaded right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    const draft = {};
    (termDetail?.weeks || []).forEach((week) => {
      draft[week.id] = { completionStatus: week.completionStatus, note: "" };
    });
    setProgressDrafts(draft);
    setWeekForm((current) => ({ ...current, schemeTermId: selectedTermId || current.schemeTermId }));
    setAttachmentWeekId((current) => {
      if (current && (termDetail?.weeks || []).some((week) => String(week.id) === String(current))) return current;
      return termDetail?.weeks?.[0]?.id || "";
    });
  }, [termDetail, selectedTermId]);

  const handleSelectSchemeSession = async (schemeSessionId) => {
    setSelectedSchemeSessionId(schemeSessionId);
    const nextVisibleTerms = allTerms.filter((item) => String(item.schemeSessionId) === String(schemeSessionId));
    const nextTermId = nextVisibleTerms[0]?.id || "";
    setSelectedTermId(nextTermId);
    if (nextTermId) {
      const detailRes = isTeacher ? await getTeacherSchemeOfWorkTermDetail(nextTermId) : await getSchemeOfWorkTermDetail(nextTermId);
      setTermDetail(detailRes?.data?.term || null);
    } else {
      setTermDetail(null);
    }
    setTermForm((current) => ({ ...current, schemeSessionId }));
  };

  const handleSelectTerm = async (termId) => {
    setSelectedTermId(termId);
    if (!termId) {
      setTermDetail(null);
      return;
    }
    try {
      const detailRes = isTeacher ? await getTeacherSchemeOfWorkTermDetail(termId) : await getSchemeOfWorkTermDetail(termId);
      setTermDetail(detailRes?.data?.term || null);
      setWeekForm((current) => ({ ...current, schemeTermId: termId }));
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "The selected scheme could not be opened.");
    }
  };
  const handleSessionSubmit = async (event) => {
    event.preventDefault();
    if (!canManage) return;
    try {
      setSaving(true);
      setError("");
      setMessage("");
      if (editingSessionId) {
        await updateSchemeOfWorkSession(editingSessionId, sessionForm);
        setMessage("Scheme session updated.");
      } else {
        await createSchemeOfWorkSession(sessionForm);
        setMessage("Scheme session created.");
      }
      setEditingSessionId("");
      setSessionForm({ ...emptySessionForm, sessionId: setup.activeSessionId || setup.sessions[0]?.id || "" });
      await loadAll(selectedSchemeSessionId, selectedTermId);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "The scheme session could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const handleTermSubmit = async (event) => {
    event.preventDefault();
    if (!canManage) return;
    try {
      setSaving(true);
      setError("");
      setMessage("");
      if (editingTermId) {
        await updateSchemeOfWorkTerm(editingTermId, termForm);
        setMessage("Scheme term updated.");
      } else {
        await createSchemeOfWorkTerm(termForm);
        setMessage("Scheme term created.");
      }
      setEditingTermId("");
      setTermForm({ ...emptyTermForm, schemeSessionId: selectedSchemeSessionId || "", termId: setup.activeTermId || setup.terms[0]?.id || "" });
      await loadAll(selectedSchemeSessionId, selectedTermId);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "The scheme term could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const handleWeekSubmit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      setMessage("");
      if (editingWeekId) {
        await updateSchemeOfWorkWeek(editingWeekId, weekForm);
        setMessage("Weekly entry updated.");
      } else {
        await createSchemeOfWorkWeek(weekForm);
        setMessage("Weekly entry saved.");
      }
      setEditingWeekId("");
      setWeekForm({ ...emptyWeekForm, schemeTermId: selectedTermId || "" });
      await loadAll(selectedSchemeSessionId, selectedTermId);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "The weekly entry could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!selectedTermId) return;
    try {
      setSaving(true);
      setError("");
      await submitSchemeOfWorkForReview(selectedTermId, { note: approvalNote });
      setApprovalNote("");
      setMessage("Scheme submitted for review.");
      await loadAll(selectedSchemeSessionId, selectedTermId);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "This scheme could not be submitted for review.");
    } finally {
      setSaving(false);
    }
  };

  const handleApprovalDecision = async (approvalStatus) => {
    if (!selectedTermId || !canApprove) return;
    try {
      setSaving(true);
      setError("");
      await reviewSchemeOfWork(selectedTermId, { approvalStatus, note: approvalNote });
      setApprovalNote("");
      setMessage(`Scheme ${approvalStatus === "approved" ? "approved" : "returned to draft"}.`);
      await loadAll(selectedSchemeSessionId, selectedTermId);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "The approval action could not be completed.");
    } finally {
      setSaving(false);
    }
  };

  const handleQuickProgressSave = async (week) => {
    const draft = progressDrafts[week.id] || { completionStatus: week.completionStatus, note: "" };
    try {
      setSaving(true);
      setError("");
      if (isTeacher) {
        await updateTeacherSchemeOfWorkWeekProgress(week.id, { completionStatus: draft.completionStatus, note: draft.note, teacherNote: week.teacherNote });
      } else {
        await updateSchemeOfWorkWeek(week.id, { completionStatus: draft.completionStatus, progressNote: draft.note, teacherNote: week.teacherNote });
      }
      setMessage(`Week ${week.weekNumber} progress updated.`);
      await loadAll(selectedSchemeSessionId, selectedTermId);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Progress could not be updated.");
    } finally {
      setSaving(false);
    }
  };

  const handleEditWeek = (week) => {
    setEditingWeekId(week.id);
    setAttachmentWeekId(week.id);
    setWeekForm({
      schemeTermId: selectedTermId,
      weekNumber: week.weekNumber,
      title: week.title,
      topic: week.topic,
      subTopic: week.subTopic,
      learningObjectives: week.learningObjectives,
      teachingActivities: week.teachingActivities,
      learningMaterials: week.learningMaterials,
      assessmentMethod: week.assessmentMethod,
      teacherNote: week.teacherNote,
      completionStatus: week.completionStatus,
      sortOrder: week.sortOrder,
      linkedClassSubjectId: week.linkedClassSubjectId || "",
      linkedTopicId: week.linkedTopicId || "",
      linkedLessonId: week.linkedLessonId || "",
      linkedAssignmentId: week.linkedAssignmentId || "",
      linkedQuizId: week.linkedQuizId || "",
    });
  };

  const handleAttachmentFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const fileData = await readFileAsDataUrl(file);
      setAttachmentForm({
        fileTitle: file.name.replace(/\.[^.]+$/, "") || file.name,
        fileName: file.name,
        fileData,
        mimeType: file.type || "application/octet-stream",
        fileSize: file.size || 0,
      });
    } catch (requestError) {
      setError(requestError?.message || "Attachment file could not be prepared.");
    }
  };

  const handleAttachmentSave = async () => {
    if (!attachmentWeekId) return;
    try {
      setSaving(true);
      setError("");
      await addSchemeOfWorkAttachment(attachmentWeekId, attachmentForm);
      setAttachmentForm({ fileTitle: "", fileName: "", fileData: "", mimeType: "", fileSize: 0 });
      setMessage("Supporting file added to the scheme week.");
      await loadAll(selectedSchemeSessionId, selectedTermId);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "The supporting file could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const handleAttachmentDelete = async (attachmentId) => {
    if (!window.confirm("Remove this supporting file from the week entry?")) return;
    try {
      setSaving(true);
      setError("");
      await deleteSchemeOfWorkAttachment(attachmentId);
      setMessage("Supporting file removed.");
      await loadAll(selectedSchemeSessionId, selectedTermId);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "The supporting file could not be removed.");
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (format) => {
    if (!selectedTermId) return;
    try {
      setSaving(true);
      const response = format === "pdf" ? await exportSchemeOfWorkPdf(selectedTermId) : await exportSchemeOfWork(selectedTermId);
      const suffix = format === "pdf" ? "pdf" : "html";
      const fileName = `${(termDetail?.className || "scheme").replace(/\s+/g, "-")}-${(termDetail?.subjectName || "subject").replace(/\s+/g, "-")}-scheme-of-work.${suffix}`;
      saveBlob(response.data, fileName);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "The export could not be generated.");
    } finally {
      setSaving(false);
    }
  };

  const noSchemeMessage = isTeacher
    ? "Your assigned schemes will appear here once the academic desk creates and assigns them to you."
    : "Create a scheme session and class-subject scheme to begin the structured weekly planning workflow.";

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <div style={styles.eyebrow}>Angel Montessori School</div>
          <h1 style={styles.pageTitle}>{isTeacher ? "My Scheme of Work" : "Scheme of Work Desk"}</h1>
          <p style={styles.pageSubtitle}>
            Structured academic planning for weekly topics, objectives, approval control, and real delivery progress.
          </p>
        </div>
        <div style={styles.headerActions}>
          <DomainAwareLink to="/portal" style={styles.secondaryLink}>Portal Home</DomainAwareLink>
        </div>
      </div>

      <div style={styles.tabsRow}>
        {tabLinks.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => navigate(tab.to)}
            style={tab.key === activeTab ? styles.activeTabButton : styles.tabButton}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error ? <div style={styles.errorBox}>{error}</div> : null}
      {message ? <div style={styles.messageBox}>{message}</div> : null}
      {loading ? <div style={styles.loadingBox}>Loading scheme of work data...</div> : null}

      {!loading ? (
        <>
          <div style={styles.filterRow}>
            <label style={styles.fieldLabel}>
              Scheme Session
              <select value={selectedSchemeSessionId} onChange={(event) => handleSelectSchemeSession(event.target.value)} style={styles.input}>
                <option value="">All visible schemes</option>
                {sessions.map((item) => (
                  <option key={item.id} value={item.id}>{item.sessionName || item.title}</option>
                ))}
              </select>
            </label>
            <label style={styles.fieldLabel}>
              Current Scheme
              <select value={selectedTermId} onChange={(event) => handleSelectTerm(event.target.value)} style={styles.input}>
                <option value="">Select a scheme</option>
                {visibleTerms.map((item) => (
                  <option key={item.id} value={item.id}>{`${item.className} - ${item.subjectName} (${item.termName})`}</option>
                ))}
              </select>
            </label>
          </div>

          <div style={styles.statsGrid}>
            <StatCard label="Schemes Created" value={dashboard.totals?.schemesCreated || 0} />
            <StatCard label="Pending Approval" value={dashboard.totals?.pendingApproval || 0} />
            <StatCard label="Completed Weekly Entries" value={dashboard.totals?.completedWeeklyEntries || 0} />
            <StatCard label="Classes Covered" value={dashboard.totals?.classesCovered || 0} />
            <StatCard label="Subjects Covered" value={dashboard.totals?.subjectsCovered || 0} />
          </div>
          {activeTab === "overview" ? (
            <div style={styles.gridTwo}>
              <SectionCard title="Recent Activity">
                {dashboard.recentActivity?.length ? dashboard.recentActivity.map((item) => (
                  <div key={item.id} style={styles.listRow}>
                    <strong>{item.title}</strong>
                    <div style={styles.mutedText}>{item.summary}</div>
                    <div style={styles.mutedText}>{item.detail}</div>
                  </div>
                )) : <p style={styles.mutedText}>{noSchemeMessage}</p>}
              </SectionCard>
              <SectionCard title={isTeacher ? "Assigned Schemes" : "Visible Schemes"}>
                {visibleTerms.length ? visibleTerms.slice(0, 8).map((item) => (
                  <button key={item.id} type="button" onClick={() => handleSelectTerm(item.id)} style={styles.listButton}>
                    <strong>{item.className + " - " + item.subjectName}</strong>
                    <span style={styles.mutedText}>{item.termName + " | " + item.statusLabel + " | " + item.coveragePercent + "% covered"}</span>
                  </button>
                )) : <p style={styles.mutedText}>{noSchemeMessage}</p>}
              </SectionCard>
              <SectionCard title={isTeacher ? "My Coverage Snapshot" : "Teacher Coverage"} aside={<span style={styles.badge}>{analytics.totals?.schemesCount || 0} schemes</span>}>
                {(analytics.teacherCoverage || []).length ? analytics.teacherCoverage.slice(0, 8).map((item) => (
                  <div key={item.teacherUserId || item.teacherName} style={styles.listRow}>
                    <strong>{item.teacherName}</strong>
                    <div style={styles.mutedText}>{item.schemesCount + " schemes | " + item.completedWeeks + "/" + item.weeksTotal + " weeks completed"}</div>
                    <div style={styles.mutedText}>{item.coveragePercent + "% coverage | " + item.reviewQueue + " in review queue"}</div>
                  </div>
                )) : <p style={styles.mutedText}>Coverage insight will appear once weekly planning begins.</p>}
              </SectionCard>
              <SectionCard title="Schemes Needing Attention">
                {(analytics.atRiskSchemes || []).length ? analytics.atRiskSchemes.slice(0, 8).map((item) => (
                  <div key={item.id} style={styles.listRow}>
                    <strong>{item.className + " - " + item.subjectName}</strong>
                    <div style={styles.mutedText}>{item.termName + " | " + item.teacherName + " | " + item.coveragePercent + "% covered"}</div>
                    <div style={styles.mutedText}>{item.riskReason}</div>
                  </div>
                )) : <p style={styles.mutedText}>No schemes are currently flagged for attention.</p>}
              </SectionCard>
            </div>
          ) : null}

          {activeTab === "sessions" && canManage ? (
            <div style={styles.gridTwo}>
              <SectionCard title={editingSessionId ? "Edit Scheme Session" : "Create Scheme Session"}>
                <form onSubmit={handleSessionSubmit} style={styles.formGrid}>
                  <label style={styles.fieldLabel}>Academic Session<select value={sessionForm.sessionId} onChange={(event) => setSessionForm({ ...sessionForm, sessionId: event.target.value })} style={styles.input}>{setup.sessions.map((item) => <option key={item.id} value={item.id}>{item.sessionName}</option>)}</select></label>
                  <label style={styles.fieldLabel}>Title<input value={sessionForm.title} onChange={(event) => setSessionForm({ ...sessionForm, title: event.target.value })} style={styles.input} /></label>
                  <label style={styles.fieldLabel}>Status<select value={sessionForm.status} onChange={(event) => setSessionForm({ ...sessionForm, status: event.target.value })} style={styles.input}>{(setup.statuses?.session || []).map((item) => <option key={item} value={item}>{item.replace(/_/g, " ")}</option>)}</select></label>
                  <label style={{ ...styles.fieldLabel, gridColumn: "1 / -1" }}>Description<textarea value={sessionForm.description} onChange={(event) => setSessionForm({ ...sessionForm, description: event.target.value })} style={styles.textarea} rows={4} /></label>
                  <button type="submit" style={styles.primaryButton} disabled={saving}>{editingSessionId ? "Update Session" : "Save Session"}</button>
                </form>
              </SectionCard>
              <SectionCard title="Scheme Sessions">
                {sessions.length ? sessions.map((item) => (
                  <div key={item.id} style={styles.listRow}>
                    <strong>{item.title}</strong>
                    <div style={styles.mutedText}>{`${item.sessionName} | ${humanizeLabel(item.status)} | ${item.schemesCount || 0} schemes`}</div>
                    <button type="button" style={styles.secondaryButton} onClick={() => { setEditingSessionId(item.id); setSessionForm({ sessionId: item.sessionId, title: item.title, description: item.description || "", status: item.status }); }}>Edit</button>
                  </div>
                )) : <p style={styles.mutedText}>{noSchemeMessage}</p>}
              </SectionCard>
            </div>
          ) : null}

          {activeTab === "terms" && canManage ? (
            <div style={styles.gridTwo}>
              <SectionCard title={editingTermId ? "Edit Scheme Term" : "Create Scheme Term"}>
                <form onSubmit={handleTermSubmit} style={styles.formGrid}>
                  <label style={styles.fieldLabel}>Scheme Session<select value={termForm.schemeSessionId} onChange={(event) => setTermForm({ ...termForm, schemeSessionId: event.target.value })} style={styles.input}>{sessions.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
                  <label style={styles.fieldLabel}>Term<select value={termForm.termId} onChange={(event) => setTermForm({ ...termForm, termId: event.target.value })} style={styles.input}>{setup.terms.map((item) => <option key={item.id} value={item.id}>{item.termName}</option>)}</select></label>
                  <label style={styles.fieldLabel}>Class<select value={termForm.classId} onChange={(event) => setTermForm({ ...termForm, classId: event.target.value })} style={styles.input}>{setup.classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                  <label style={styles.fieldLabel}>Subject<select value={termForm.subjectId} onChange={(event) => setTermForm({ ...termForm, subjectId: event.target.value })} style={styles.input}>{setup.subjects.map((item) => <option key={item.id} value={item.id}>{item.subjectName}</option>)}</select></label>
                  <label style={styles.fieldLabel}>Teacher<select value={termForm.teacherUserId} onChange={(event) => setTermForm({ ...termForm, teacherUserId: event.target.value })} style={styles.input}>{setup.teachers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                  <label style={styles.fieldLabel}>Status<select value={termForm.status} onChange={(event) => setTermForm({ ...termForm, status: event.target.value })} style={styles.input}>{(setup.statuses?.term || []).map((item) => <option key={item} value={item}>{item.replace(/_/g, " ")}</option>)}</select></label>
                  <button type="submit" style={styles.primaryButton} disabled={saving}>{editingTermId ? "Update Scheme" : "Save Scheme"}</button>
                </form>
              </SectionCard>
              <SectionCard title="Schemes">
                {visibleTerms.length ? visibleTerms.map((item) => (
                  <div key={item.id} style={styles.listRow}>
                    <strong>{`${item.className} - ${item.subjectName}`}</strong>
                    <div style={styles.mutedText}>{`${item.termName} | ${item.teacherName} | ${item.statusLabel}`}</div>
                    <div style={styles.buttonRow}><button type="button" style={styles.secondaryButton} onClick={() => handleSelectTerm(item.id)}>Open</button><button type="button" style={styles.secondaryButton} onClick={() => { setEditingTermId(item.id); setTermForm({ schemeSessionId: item.schemeSessionId, termId: item.termId, classId: item.classId, subjectId: item.subjectId, teacherUserId: item.teacherUserId, status: item.status }); }}>Edit</button></div>
                  </div>
                )) : <p style={styles.mutedText}>{noSchemeMessage}</p>}
              </SectionCard>
            </div>
          ) : null}

          {activeTab === "weeks" ? (
            <div style={styles.gridTwo}>
              <SectionCard title="Selected Scheme Summary">
                {termDetail ? <div style={styles.summaryBox}><strong>{termDetail.className + " - " + termDetail.subjectName}</strong><div style={styles.mutedText}>{termDetail.termName + " | " + termDetail.teacherName + " | " + termDetail.statusLabel}</div><div style={styles.mutedText}>{termDetail.completedWeeks + "/" + termDetail.weeksTotal + " weeks completed"}</div></div> : <p style={styles.mutedText}>Select a scheme to begin weekly planning.</p>}
                {termDetail && (canManage || termDetail.teacherUserId === user?.id) ? <div style={styles.buttonRow}><button type="button" style={styles.secondaryButton} onClick={handleSubmitForReview} disabled={saving || termDetail.status === "in_review" || termDetail.status === "approved"}>Submit for Review</button></div> : null}
              </SectionCard>
              <SectionCard title={editingWeekId ? "Edit Weekly Entry" : "Add Weekly Entry"}>
                <form onSubmit={handleWeekSubmit} style={styles.formGrid}>
                  <label style={styles.fieldLabel}>Week Number<input value={weekForm.weekNumber} onChange={(event) => setWeekForm({ ...weekForm, weekNumber: event.target.value })} style={styles.input} /></label>
                  <label style={styles.fieldLabel}>Title<input value={weekForm.title} onChange={(event) => setWeekForm({ ...weekForm, title: event.target.value })} style={styles.input} /></label>
                  <label style={styles.fieldLabel}>Topic<input value={weekForm.topic} onChange={(event) => setWeekForm({ ...weekForm, topic: event.target.value })} style={styles.input} /></label>
                  <label style={styles.fieldLabel}>Sub-topic<input value={weekForm.subTopic} onChange={(event) => setWeekForm({ ...weekForm, subTopic: event.target.value })} style={styles.input} /></label>
                  <label style={{ ...styles.fieldLabel, gridColumn: "1 / -1" }}>Learning Objectives<textarea value={weekForm.learningObjectives} onChange={(event) => setWeekForm({ ...weekForm, learningObjectives: event.target.value })} style={styles.textarea} rows={3} /></label>
                  <label style={{ ...styles.fieldLabel, gridColumn: "1 / -1" }}>Teaching Activities<textarea value={weekForm.teachingActivities} onChange={(event) => setWeekForm({ ...weekForm, teachingActivities: event.target.value })} style={styles.textarea} rows={3} /></label>
                  <label style={{ ...styles.fieldLabel, gridColumn: "1 / -1" }}>Learning Materials<textarea value={weekForm.learningMaterials} onChange={(event) => setWeekForm({ ...weekForm, learningMaterials: event.target.value })} style={styles.textarea} rows={2} /></label>
                  <label style={{ ...styles.fieldLabel, gridColumn: "1 / -1" }}>Assessment Method<textarea value={weekForm.assessmentMethod} onChange={(event) => setWeekForm({ ...weekForm, assessmentMethod: event.target.value })} style={styles.textarea} rows={2} /></label>
                  <label style={{ ...styles.fieldLabel, gridColumn: "1 / -1" }}>Teacher Note<textarea value={weekForm.teacherNote} onChange={(event) => setWeekForm({ ...weekForm, teacherNote: event.target.value })} style={styles.textarea} rows={2} /></label>
                  <label style={styles.fieldLabel}>Completion Status<select value={weekForm.completionStatus} onChange={(event) => setWeekForm({ ...weekForm, completionStatus: event.target.value })} style={styles.input}>{(setup.statuses?.completion || []).map((item) => <option key={item} value={item}>{item.replace(/_/g, " ")}</option>)}</select></label>
                  <label style={styles.fieldLabel}>LMS Class Subject<select value={weekForm.linkedClassSubjectId} onChange={(event) => setWeekForm({ ...weekForm, linkedClassSubjectId: event.target.value, linkedTopicId: "", linkedLessonId: "", linkedAssignmentId: "", linkedQuizId: "" })} style={styles.input}><option value="">Not linked yet</option>{filteredClassSubjects.map((item) => <option key={item.id} value={item.id}>{item.className + " - " + item.subjectName + (item.termName ? " (" + item.termName + ")" : "")}</option>)}</select></label>
                  <label style={styles.fieldLabel}>LMS Topic<select value={weekForm.linkedTopicId} onChange={(event) => setWeekForm({ ...weekForm, linkedTopicId: event.target.value, linkedLessonId: "", linkedAssignmentId: "", linkedQuizId: "" })} style={styles.input}><option value="">No topic link</option>{filteredTopics.map((item) => <option key={item.id} value={item.id}>{item.topicTitle}</option>)}</select></label>
                  <label style={styles.fieldLabel}>LMS Lesson<select value={weekForm.linkedLessonId} onChange={(event) => setWeekForm({ ...weekForm, linkedLessonId: event.target.value, linkedAssignmentId: "", linkedQuizId: "" })} style={styles.input}><option value="">No lesson link</option>{filteredLessons.map((item) => <option key={item.id} value={item.id}>{item.lessonTitle}</option>)}</select></label>
                  <label style={styles.fieldLabel}>LMS Assignment<select value={weekForm.linkedAssignmentId} onChange={(event) => setWeekForm({ ...weekForm, linkedAssignmentId: event.target.value })} style={styles.input}><option value="">No assignment link</option>{filteredAssignments.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
                  <label style={styles.fieldLabel}>LMS Quiz<select value={weekForm.linkedQuizId} onChange={(event) => setWeekForm({ ...weekForm, linkedQuizId: event.target.value })} style={styles.input}><option value="">No quiz link</option>{filteredQuizzes.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
                  <div style={styles.buttonRow}><button type="submit" style={styles.primaryButton} disabled={saving || !selectedTermId}>{editingWeekId ? "Update Week" : "Save Week"}</button><button type="button" style={styles.secondaryButton} onClick={() => { setEditingWeekId(""); setWeekForm({ ...emptyWeekForm, schemeTermId: selectedTermId || "" }); }} disabled={saving}>Clear Form</button></div>
                </form>
              </SectionCard>
              <SectionCard title="Weekly Scheme View" aside={termDetail ? <span style={styles.badge}>{termDetail.weeksTotal + " weeks"}</span> : null}>
                {termDetail?.weeks?.length ? termDetail.weeks.map((week) => (
                  <div key={week.id} style={styles.weekRow}>
                    <div style={styles.weekSummaryBlock}>
                      <strong>{"Week " + week.weekNumber + ": " + week.topic}</strong>
                      <div style={styles.mutedText}>{(week.subTopic || week.title || "") + " | " + week.completionStatusLabel}</div>
                      {week.linkedClassSubjectLabel || week.linkedTopicTitle || week.linkedLessonTitle || week.linkedAssignmentTitle || week.linkedQuizTitle ? <div style={styles.linkPillRow}>
                        {week.linkedClassSubjectLabel ? <span style={styles.linkPill}>{week.linkedClassSubjectLabel}</span> : null}
                        {week.linkedTopicTitle ? <span style={styles.linkPill}>{"Topic: " + week.linkedTopicTitle}</span> : null}
                        {week.linkedLessonTitle ? <span style={styles.linkPill}>{"Lesson: " + week.linkedLessonTitle}</span> : null}
                        {week.linkedAssignmentTitle ? <span style={styles.linkPill}>{"Assignment: " + week.linkedAssignmentTitle}</span> : null}
                        {week.linkedQuizTitle ? <span style={styles.linkPill}>{"Quiz: " + week.linkedQuizTitle}</span> : null}
                        {week.linkedLessonNoteStatusLabel ? <span style={styles.linkPill}>{"Lesson Note: " + week.linkedLessonNoteStatusLabel}</span> : null}
                      </div> : null}
                      {week.attachmentsCount ? <div style={styles.mutedText}>{week.attachmentsCount + " supporting file(s) attached"}</div> : null}
                    </div>
                    <div style={styles.weekActions}><button type="button" style={styles.secondaryButton} onClick={() => handleEditWeek(week)}>Edit</button><Link to={`${lessonNotesBasePath}?termId=${selectedTermId}&weekId=${week.id}`} style={styles.secondaryLink}>Lesson Note</Link><button type="button" style={styles.secondaryButton} onClick={() => setAttachmentWeekId(week.id)}>Files</button><select value={progressDrafts[week.id]?.completionStatus || week.completionStatus} onChange={(event) => setProgressDrafts({ ...progressDrafts, [week.id]: { ...(progressDrafts[week.id] || {}), completionStatus: event.target.value } })} style={styles.smallInput}>{(setup.statuses?.completion || []).map((item) => <option key={item} value={item}>{item.replace(/_/g, " ")}</option>)}</select><input placeholder="Progress note" value={progressDrafts[week.id]?.note || ""} onChange={(event) => setProgressDrafts({ ...progressDrafts, [week.id]: { ...(progressDrafts[week.id] || {}), note: event.target.value } })} style={styles.smallInput} /><button type="button" style={styles.primaryButton} onClick={() => handleQuickProgressSave(week)} disabled={saving}>Save</button></div>
                  </div>
                )) : <p style={styles.mutedText}>No weekly entries have been added yet.</p>}
              </SectionCard>
              <SectionCard title="Supporting Files and LMS Links">
                {selectedAttachmentWeek ? (
                  <div style={styles.summaryBox}>
                    <strong>{"Week " + selectedAttachmentWeek.weekNumber + ": " + selectedAttachmentWeek.topic}</strong>
                    <div style={styles.mutedText}>{selectedAttachmentWeek.linkedLessonTitle ? "Linked lesson: " + selectedAttachmentWeek.linkedLessonTitle : "Link lesson notes, assignments, and quizzes from the LMS when they are ready."}</div>
                    <div style={styles.formGrid}>
                      <label style={styles.fieldLabel}>File Title<input value={attachmentForm.fileTitle} onChange={(event) => setAttachmentForm({ ...attachmentForm, fileTitle: event.target.value })} style={styles.input} /></label>
                      <label style={styles.fieldLabel}>Upload File<input type="file" onChange={handleAttachmentFileChange} style={styles.input} /></label>
                    </div>
                    <div style={styles.buttonRow}><button type="button" style={styles.primaryButton} onClick={handleAttachmentSave} disabled={saving || !attachmentForm.fileData || !attachmentForm.fileTitle}>Add Supporting File</button></div>
                    {(selectedAttachmentWeek.attachments || []).length ? selectedAttachmentWeek.attachments.map((attachment) => (
                      <div key={attachment.id} style={styles.listRow}>
                        <strong>{attachment.fileTitle || attachment.fileName}</strong>
                        <div style={styles.mutedText}>{attachment.fileName || attachment.mimeType || "Supporting file"}</div>
                        <div style={styles.buttonRow}><a href={attachment.filePath} target="_blank" rel="noreferrer" style={styles.secondaryLink}>Open</a><button type="button" style={styles.secondaryButton} onClick={() => handleAttachmentDelete(attachment.id)} disabled={saving}>Delete</button></div>
                      </div>
                    )) : <p style={styles.mutedText}>No supporting files have been added for this week yet.</p>}
                  </div>
                ) : <p style={styles.mutedText}>Select a week to manage attachments and linked LMS resources.</p>}
              </SectionCard>
            </div>
          ) : null}

          {activeTab === "approvals" && !isTeacher ? (
            <div style={styles.gridTwo}>
              <SectionCard title="Approval Checklist">
                {termDetail ? reviewChecklist.map((item) => <div key={item.label} style={styles.checkRow}>{item.ok ? "[x]" : "[ ]"} {item.label}</div>) : <p style={styles.mutedText}>Select a scheme to review it.</p>}
                <label style={{ ...styles.fieldLabel, marginTop: 12 }}>Approval Note<textarea value={approvalNote} onChange={(event) => setApprovalNote(event.target.value)} style={styles.textarea} rows={4} /></label>
                <div style={styles.buttonRow}><button type="button" style={styles.primaryButton} onClick={() => handleApprovalDecision("approved")} disabled={!termDetail || saving}>Approve Scheme</button><button type="button" style={styles.secondaryButton} onClick={() => handleApprovalDecision("rejected")} disabled={!termDetail || saving}>Return to Draft</button></div>
              </SectionCard>
              <SectionCard title="Approval History">
                {visibleApprovals.length ? visibleApprovals.map((item) => <div key={item.id} style={styles.listRow}><strong>{`${item.className} - ${item.subjectName}`}</strong><div style={styles.mutedText}>{`${item.termName} | ${item.approvalStatusLabel} | ${item.approverName || "School team"}`}</div><div style={styles.mutedText}>{item.note || "No note added"}</div></div>) : <p style={styles.mutedText}>Approval actions will appear here once reviews begin.</p>}
              </SectionCard>
            </div>
          ) : null}

          {activeTab === "progress" ? (
            <div style={styles.gridTwo}>
              <SectionCard title="Progress Tracking">
                {visibleProgress.length ? visibleProgress.map((item) => <div key={item.id} style={styles.listRow}><strong>{item.className + " - " + item.subjectName}</strong><div style={styles.mutedText}>{item.termName + " | " + item.teacherName}</div><div style={styles.mutedText}>{item.completedWeeks + "/" + item.weeksTotal + " completed | " + item.inProgressWeeks + " in progress | " + item.pendingWeeks + " pending | " + item.coveragePercent + "% covered"}</div></div>) : <p style={styles.mutedText}>Progress rows will appear once schemes and weekly entries are created.</p>}
              </SectionCard>
              <SectionCard title="Subject Coverage Overview">
                {(analytics.subjectCoverage || []).length ? analytics.subjectCoverage.slice(0, 10).map((item) => <div key={item.subjectId || item.subjectName} style={styles.listRow}><strong>{item.subjectName}</strong><div style={styles.mutedText}>{item.classesCovered + " classes | " + item.schemesCount + " schemes"}</div><div style={styles.mutedText}>{item.completedWeeks + "/" + item.weeksTotal + " weeks completed | " + item.coveragePercent + "% coverage"}</div></div>) : <p style={styles.mutedText}>Subject-level coverage will appear after scheme records are created.</p>}
              </SectionCard>
            </div>
          ) : null}

          {activeTab === "export" ? (
            <SectionCard title="Export Scheme of Work">
              {termDetail ? <div style={styles.summaryBox}><strong>{`${termDetail.className} - ${termDetail.subjectName}`}</strong><div style={styles.mutedText}>{`${termDetail.termName} | ${termDetail.sessionName}`}</div><div style={styles.buttonRow}><button type="button" style={styles.primaryButton} onClick={() => handleExport("html")} disabled={saving}>Export HTML</button><button type="button" style={styles.secondaryButton} onClick={() => handleExport("pdf")} disabled={saving}>Export PDF</button></div></div> : <p style={styles.mutedText}>Select a scheme to export it for printing or sharing.</p>}
            </SectionCard>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#f4f7fb", padding: 20, display: "grid", gap: 18 },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" },
  eyebrow: { color: "#c79d2d", fontSize: 12, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" },
  pageTitle: { margin: "6px 0", color: "#14325a" },
  pageSubtitle: { margin: 0, maxWidth: 760, color: "#4a6283" },
  headerActions: { display: "flex", gap: 10 },
  tabsRow: { display: "flex", gap: 10, flexWrap: "wrap" },
  tabButton: { padding: "10px 14px", borderRadius: 10, border: "1px solid #d7e3f2", background: "#fff", cursor: "pointer", fontWeight: 700, color: "#17355a" },
  activeTabButton: { padding: "10px 14px", borderRadius: 10, border: "1px solid #17355a", background: "#17355a", cursor: "pointer", fontWeight: 700, color: "#fff" },
  secondaryLink: { padding: "10px 14px", borderRadius: 10, border: "1px solid #d7e3f2", background: "#fff", textDecoration: "none", color: "#17355a", fontWeight: 700 },
  errorBox: { padding: 14, borderRadius: 12, background: "#fde8e8", color: "#9b1c1c", border: "1px solid #f5c2c2" },
  messageBox: { padding: 14, borderRadius: 12, background: "#e8f6ec", color: "#256029", border: "1px solid #b9e2c1" },
  loadingBox: { padding: 16, borderRadius: 12, background: "#fff", border: "1px solid #d7e3f2", color: "#4a6283" },
  filterRow: { display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" },
  statsGrid: { display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" },
  statCard: { background: "#fff", border: "1px solid #d7e3f2", borderRadius: 14, padding: 16 },
  statLabel: { fontSize: 12, color: "#4a6283", textTransform: "uppercase", letterSpacing: "0.08em" },
  statValue: { fontSize: 28, fontWeight: 800, color: "#17355a", marginTop: 10 },
  gridTwo: { display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" },
  sectionCard: { background: "#fff", border: "1px solid #d7e3f2", borderRadius: 16, padding: 18, display: "grid", gap: 14 },
  sectionHeaderRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" },
  sectionTitle: { margin: 0, color: "#17355a" },
  formGrid: { display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" },
  fieldLabel: { display: "grid", gap: 6, color: "#17355a", fontWeight: 700 },
  input: { minHeight: 42, borderRadius: 10, border: "1px solid #d7e3f2", padding: "10px 12px", background: "#fff" },
  smallInput: { minHeight: 38, borderRadius: 10, border: "1px solid #d7e3f2", padding: "8px 10px", background: "#fff" },
  textarea: { borderRadius: 10, border: "1px solid #d7e3f2", padding: "10px 12px", background: "#fff", resize: "vertical" },
  primaryButton: { padding: "10px 14px", borderRadius: 10, border: "1px solid #0b5faf", background: "#0b5faf", color: "#fff", fontWeight: 700, cursor: "pointer" },
  secondaryButton: { padding: "10px 14px", borderRadius: 10, border: "1px solid #d7e3f2", background: "#fff", color: "#17355a", fontWeight: 700, cursor: "pointer" },
  buttonRow: { display: "flex", gap: 10, flexWrap: "wrap" },
  listRow: { padding: 12, border: "1px solid #e1e8f2", borderRadius: 12, display: "grid", gap: 6, background: "#fbfdff" },
  listButton: { padding: 12, border: "1px solid #e1e8f2", borderRadius: 12, display: "grid", gap: 6, background: "#fbfdff", textAlign: "left", cursor: "pointer" },
  mutedText: { color: "#4a6283" },
  summaryBox: { display: "grid", gap: 8, padding: 14, borderRadius: 12, background: "#f8fbff", border: "1px solid #d7e3f2" },
  weekRow: { padding: 12, border: "1px solid #e1e8f2", borderRadius: 12, display: "grid", gap: 10, background: "#fbfdff" },
  weekSummaryBlock: { display: "grid", gap: 6 },
  linkPillRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  linkPill: { padding: "6px 10px", borderRadius: 999, background: "#edf5ff", color: "#0b5faf", fontSize: 12, fontWeight: 700 },
  weekActions: { display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" },
  checkRow: { padding: "8px 0", color: "#17355a" },
  badge: { padding: "6px 10px", borderRadius: 999, background: "#edf5ff", color: "#0b5faf", fontWeight: 700 },
};
