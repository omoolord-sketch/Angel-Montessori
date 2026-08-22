import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getLmsAnnouncements,
  getLmsVirtualClasses,
  getLmsVirtualNotifications,
  getStudentPortalOverview,
  submitHomeworkSubmission,
  uploadHomeworkFile,
} from "../api/services";
import { buildReportCardHtml, getTermOptions } from "../utils/reportCard";
import "./PortalSurface.css";
import "./StudentPortalDashboard.css";

const MAX_HOMEWORK_UPLOAD_BYTES = 8 * 1024 * 1024;
const ALLOWED_HOMEWORK_UPLOAD_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
]);

function normalizeDecisionStatus(status) {
  return String(status || "").toLowerCase().replace(/[^a-z]/g, "");
}

function decisionLabel(status) {
  const key = normalizeDecisionStatus(status);
  if (key === "promoted") return "Promoted";
  if (key === "promotedconditionally") return "Promoted Conditionally";
  if (key === "probation") return "Probation";
  if (key === "repeated") return "Repeat";
  if (key === "graduated") return "Graduated";
  if (key === "pendingreview") return "Pending Review";
  if (key === "noteligible") return "Not Eligible";
  if (key === "withdrawn") return "Withdrawn";
  return "Pending Review";
}

function isHomeworkPreviewImage(filePath, fileMimeType = "") {
  const mime = String(fileMimeType || "").toLowerCase();
  const ref = String(filePath || "").toLowerCase();
  return mime.startsWith("image/") || /.(png|jpe?g|gif|webp|heic|bmp)$/i.test(ref);
}

function isHomeworkPreviewPdf(filePath, fileMimeType = "") {
  const mime = String(fileMimeType || "").toLowerCase();
  const ref = String(filePath || "").toLowerCase();
  return mime === "application/pdf" || ref.endsWith(".pdf");
}

function formatSubmissionFileSize(value) {
  const size = Number(value || 0);
  if (!Number.isFinite(size) || size <= 0) return "";
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${size} B`;
}

function isAllowedHomeworkUpload(file) {
  return ALLOWED_HOMEWORK_UPLOAD_TYPES.has(String(file?.type || "").toLowerCase());
}

function formatVirtualClassSchedule(row) {
  const date = String(row?.sessionDate || "").trim();
  const time = String(row?.startTime || "").trim();
  if (!date) return "Schedule not set";
  const parsed = new Date(`${date}T${time || "00:00"}:00`);
  if (Number.isNaN(parsed.getTime())) return [date, time].filter(Boolean).join(" at ");
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function schoolTodayKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year || ""}-${byType.month || ""}-${byType.day || ""}`;
}

function buildPdfPreviewSrc(filePath, page = 1, zoom = "page-width") {
  const base = String(filePath || "").split("#")[0];
  if (!base) return "";
  const safePage = Math.max(1, Number(page) || 1);
  const safeZoom = encodeURIComponent(String(zoom || "page-width"));
  return `${base}#page=${safePage}&zoom=${safeZoom}`;
}

function PdfPreviewModal({ file, onClose }) {
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState("page-width");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setPage(1);
    setZoom("page-width");
    setLoading(true);
    setError("");
  }, [file?.filePath]);

  if (!file?.filePath) return null;

  const previewSrc = buildPdfPreviewSrc(file.filePath, page, zoom);
  const selectPage = (nextPage) => {
    setLoading(true);
    setError("");
    setPage(Math.max(1, nextPage));
  };
  const selectZoom = (nextZoom) => {
    setLoading(true);
    setError("");
    setZoom(nextZoom);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.68)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        zIndex: 1000,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(940px, 100%)",
          height: "min(88vh, 820px)",
          background: "#ffffff",
          borderRadius: 18,
          boxShadow: "0 24px 80px rgba(15, 23, 42, 0.28)",
          overflow: "hidden",
          display: "grid",
          gridTemplateRows: "auto 1fr",
        }}
      >
        <div style={{ padding: 16, borderBottom: "1px solid #dbe4ef", display: "grid", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <strong>{file.fileName || "Homework PDF"}</strong>
              <p style={{ margin: "4px 0 0", color: "#475569" }}>Inline preview of your homework attachment.</p>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <a
                href={file.filePath}
                target="_blank"
                rel="noreferrer"
                style={{ color: "#0b5faf", fontWeight: 700, textDecoration: "none" }}
              >
                Open in new tab
              </a>
              <button type="button" onClick={onClose}>Close</button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button type="button" onClick={() => selectPage(page - 1)} disabled={page <= 1}>Previous page</button>
            <button type="button" onClick={() => selectPage(page + 1)}>Next page</button>
            <span style={{ padding: "8px 12px", borderRadius: 999, border: "1px solid #dbe4ef", background: "#f8fbff", fontWeight: 700, color: "#17355a" }}>{`Page ${page}`}</span>
            <button type="button" onClick={() => selectZoom("page-width")} disabled={zoom == "page-width"}>Fit width</button>
            <button type="button" onClick={() => selectZoom("125")} disabled={zoom == "125"}>125%</button>
            <button type="button" onClick={() => selectZoom("200")} disabled={zoom == "200"}>200%</button>
            {loading ? <span style={{ color: "#475569", fontSize: 13 }}>Loading preview...</span> : null}
            {error ? <span style={{ color: "#b91c1c", fontSize: 13, fontWeight: 600 }}>{error}</span> : null}
          </div>
        </div>
        <div style={{ position: "relative", background: "#f8fafc" }}>
          <iframe
            key={previewSrc}
            src={previewSrc}
            title={file.fileName || "PDF preview"}
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError("Preview could not be loaded here. Use Open in new tab.");
            }}
            style={{ width: "100%", height: "100%", border: 0, background: "#f8fafc" }}
          />
          {loading ? (
            <div style={{ position: "absolute", top: 16, right: 16, padding: "8px 12px", borderRadius: 999, background: "rgba(255,255,255,0.94)", border: "1px solid #dbe4ef", color: "#334155", fontSize: 13, fontWeight: 600 }}>
              Loading page {page}...
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function HomeworkAttachmentPreview({ filePath, fileName, fileMimeType, onPreviewPdf }) {
  if (!filePath) return null;

  return (
    <div style={{ marginBottom: 10, padding: 10, borderRadius: 10, border: "1px solid #dde6f3", background: "#f8fbff" }}>
      <p style={{ margin: "0 0 8px" }}>
        <strong>Attachment:</strong>{" "}
        <a href={filePath} target="_blank" rel="noreferrer" download={fileName || undefined}>
          {fileName || "Open attachment"}
        </a>
      </p>
      {isHomeworkPreviewImage(filePath, fileMimeType) ? (
        <img
          src={filePath}
          alt={fileName || "Homework attachment"}
          style={{ width: 160, maxWidth: "100%", borderRadius: 10, border: "1px solid #dbe4ef" }}
        />
      ) : isHomeworkPreviewPdf(filePath, fileMimeType) ? (
        <div style={{ display: "grid", gap: 8 }}>
          <p style={{ margin: 0, color: "#475569" }}>Preview this PDF here without leaving your homework list.</p>
          <button type="button" onClick={() => onPreviewPdf?.({ filePath, fileName, fileMimeType })} style={{ width: "fit-content" }}>Preview PDF</button>
        </div>
      ) : (
        <p style={{ margin: 0, color: "#475569" }}>Preview is available when you open the file.</p>
      )}
    </div>
  );
}

const FRIENDLY_SERVICE_ERROR = "Some live services are temporarily unavailable. Please refresh or try again later.";

function initialsFromName(name = "") {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "AM";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

function humanizeStatus(value = "") {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase()) || "Pending";
}

function formatDateTime(value, options = {}) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(options.time ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(parsed);
}

function getResultScore(row = {}) {
  const candidates = [row.totalScore, row.score, row.percentage, row.average];
  for (const value of candidates) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

function getComponentScore(row = {}, keys = []) {
  for (const key of keys) {
    if (row[key] === "" || row[key] == null) continue;
    const number = Number(row[key]);
    if (Number.isFinite(number)) return Number.isInteger(number) ? String(number) : number.toFixed(2).replace(/\.?0+$/, "");
  }
  return "-";
}

function toneForStatus(status = "") {
  const key = String(status || "").toLowerCase();
  if (["present", "paid", "submitted", "graded", "completed", "promoted", "success", "live"].some((item) => key.includes(item))) return "success";
  if (["late", "pending", "partial", "scheduled", "review"].some((item) => key.includes(item))) return "warning";
  if (["absent", "missed", "overdue", "failed", "not submitted", "not_submitted", "repeat"].some((item) => key.includes(item))) return "danger";
  return "neutral";
}

function StatusBadge({ children, tone = "neutral" }) {
  return <span className={`student-status-badge ${tone}`}>{children}</span>;
}

function StudentAvatar({ student }) {
  const [failed, setFailed] = useState(false);
  const photoUrl = String(student?.photoUrl || student?.passportPhotoUrl || student?.photo || "").trim();
  const name = student?.name || [student?.firstName, student?.lastName].filter(Boolean).join(" ");

  if (photoUrl && !failed) {
    return (
      <div className="student-avatar-wrap">
        <img src={photoUrl} alt={`${name || "Student"} profile`} onError={() => setFailed(true)} />
      </div>
    );
  }

  return <div className="student-avatar-wrap student-avatar-fallback">{initialsFromName(name)}</div>;
}

function AlertCard({ children, tone = "warning" }) {
  if (!children) return null;
  return <div className={`student-alert-card ${tone}`} role="status">{children}</div>;
}

function SectionHeader({ kicker, title, text, action }) {
  return (
    <div className="student-section-header">
      <div>
        {kicker ? <span className="student-kicker">{kicker}</span> : null}
        <h2>{title}</h2>
        {text ? <p>{text}</p> : null}
      </div>
      {action ? <div className="student-section-action">{action}</div> : null}
    </div>
  );
}

function StatCard({ label, value, hint, tone = "primary" }) {
  return (
    <div className={`student-stat-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </div>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="student-empty-state">
      <div className="student-empty-mark">AM</div>
      <strong>{title}</strong>
      {text ? <p>{text}</p> : null}
    </div>
  );
}

function ProgressBar({ value = 0, tone = "primary" }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="student-progress-track" aria-label={`${safeValue}%`}>
      <span className={`student-progress-fill ${tone}`} style={{ width: `${safeValue}%` }} />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="student-skeleton-grid" aria-label="Loading student dashboard">
      {Array.from({ length: 6 }).map((_, index) => (
        <div className="student-skeleton-card" key={index} />
      ))}
    </div>
  );
}

function QuickAction({ item }) {
  const content = (
    <>
      <span className="student-action-icon" aria-hidden="true">{item.icon}</span>
      <span>
        <strong>{item.title}</strong>
        <small>{item.subtitle}</small>
      </span>
      {item.badge ? <StatusBadge tone={item.disabled ? "neutral" : "warning"}>{item.badge}</StatusBadge> : null}
    </>
  );

  if (item.disabled) {
    return (
      <button type="button" className="student-action-card disabled" disabled>
        {content}
      </button>
    );
  }

  if (item.to) {
    return <Link className="student-action-card" to={item.to}>{content}</Link>;
  }

  return <a className="student-action-card" href={item.href}>{content}</a>;
}

export default function StudentPortalDashboard() {
  const [overview, setOverview] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedPrintTermKey, setSelectedPrintTermKey] = useState("");
  const [pdfPreview, setPdfPreview] = useState(null);
  const [virtualClasses, setVirtualClasses] = useState([]);
  const [virtualNotifications, setVirtualNotifications] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [submissionFiles, setSubmissionFiles] = useState({});
  const [submissionFileInputKeys, setSubmissionFileInputKeys] = useState({});
  const [submittingHomeworkId, setSubmittingHomeworkId] = useState("");

  const printTermOptions = useMemo(
    () => getTermOptions(overview?.recentResults || [], overview?.summaries || [], overview?.reports || []),
    [overview]
  );

  const latestPromotionDecision = useMemo(() => {
    const rows = Array.isArray(overview?.promotionDecisions) ? overview.promotionDecisions : [];
    if (!rows.length) return null;
    return [...rows].sort((a, b) =>
      String(b.decidedAt || b.updatedAt || b.createdAt || "").localeCompare(
        String(a.decidedAt || a.updatedAt || a.createdAt || "")
      )
    )[0] || null;
  }, [overview?.promotionDecisions]);

  const submissionByHomeworkId = useMemo(() => {
    const map = new Map();
    for (const item of overview?.submissions || []) {
      map.set(String(item.homeworkId), item);
    }
    return map;
  }, [overview]);

  const virtualSummary = useMemo(() => ({
    upcoming: virtualClasses.filter((row) => ["scheduled", "live"].includes(String(row.status || "").toLowerCase())).length,
    recordings: virtualClasses.filter((row) => String(row.recordingLink || "").trim()).length,
    alerts: virtualNotifications.length,
  }), [virtualClasses, virtualNotifications]);

  const upcomingVirtualClasses = useMemo(() => (
    virtualClasses
      .filter((row) => ["scheduled", "live"].includes(String(row.status || "").toLowerCase()))
      .sort((a, b) => Number(a.startsAt || 0) - Number(b.startsAt || 0))
      .slice(0, 4)
  ), [virtualClasses]);

  const todaysVirtualClasses = useMemo(() => {
    const todayKey = schoolTodayKey();
    return virtualClasses
      .filter((row) => String(row.sessionDate || "") === todayKey)
      .filter((row) => ["scheduled", "live", "completed"].includes(String(row.status || "").toLowerCase()))
      .sort((a, b) => Number(a.startsAt || 0) - Number(b.startsAt || 0));
  }, [virtualClasses]);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const [overviewRes, classesRes, notificationsRes, announcementsRes] = await Promise.allSettled([
        getStudentPortalOverview(),
        getLmsVirtualClasses(),
        getLmsVirtualNotifications(),
        getLmsAnnouncements(),
      ]);

      if (overviewRes.status === "fulfilled") {
        setOverview(overviewRes.value?.data || null);
      } else {
        setOverview(null);
      }

      if (classesRes.status === "fulfilled") {
        setVirtualClasses(Array.isArray(classesRes.value?.data) ? classesRes.value.data : []);
      } else {
        setVirtualClasses([]);
      }

      if (notificationsRes.status === "fulfilled") {
        setVirtualNotifications(Array.isArray(notificationsRes.value?.data) ? notificationsRes.value.data : []);
      } else {
        setVirtualNotifications([]);
      }

      if (announcementsRes.status === "fulfilled") {
        setAnnouncements(Array.isArray(announcementsRes.value?.data) ? announcementsRes.value.data : []);
      } else {
        setAnnouncements([]);
      }

      const serviceErrors = [overviewRes, classesRes, notificationsRes, announcementsRes]
        .filter((item) => item.status === "rejected")
        .map((item) => item.reason?.response?.data?.message || item.reason?.message)
        .filter(Boolean);
      if (serviceErrors.length) {
        console.warn("Student dashboard live service issue:", serviceErrors);
        setError(FRIENDLY_SERVICE_ERROR);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const bumpSubmissionFileInputKey = (homeworkId) => {
    const key = String(homeworkId || "").trim();
    if (!key) return;
    setSubmissionFileInputKeys((prev) => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
  };

  const handleSubmissionFileChange = (homeworkId, event) => {
    const file = event.target.files?.[0] || null;
    if (!file) {
      setSubmissionFiles((prev) => ({ ...prev, [homeworkId]: null }));
      return;
    }

    if (!isAllowedHomeworkUpload(file)) {
      setError("Only PDF and image files can be uploaded for assignments.");
      setSubmissionFiles((prev) => ({ ...prev, [homeworkId]: null }));
      bumpSubmissionFileInputKey(homeworkId);
      return;
    }

    if (Number(file.size || 0) > MAX_HOMEWORK_UPLOAD_BYTES) {
      setError("Each submission file must be 8 MB or smaller.");
      setSubmissionFiles((prev) => ({ ...prev, [homeworkId]: null }));
      bumpSubmissionFileInputKey(homeworkId);
      return;
    }

    setSubmissionFiles((prev) => ({ ...prev, [homeworkId]: file }));
    setError("");
  };

  const submitWork = async (homework) => {
    const homeworkId = String(homework?.id || "").trim();
    const submissionType = String(homework?.submissionType || "text").toLowerCase();
    const content = String(drafts[homeworkId] || "").trim();
    const selectedFile = submissionFiles[homeworkId] || null;
    const existingSubmission = homework?.submission || submissionByHomeworkId.get(homeworkId) || null;
    const existingFilePayload = existingSubmission?.filePath
      ? {
          filePath: existingSubmission.filePath,
          fileName: existingSubmission.fileName || "",
          fileMimeType: existingSubmission.fileMimeType || "",
          fileSize: existingSubmission.fileSize || 0,
        }
      : null;

    if (!content && !selectedFile && !existingFilePayload) {
      setError("Add a response or upload a file before submitting.");
      return;
    }

    if (submissionType === "text" && !content) {
      setError("This homework needs a written response.");
      return;
    }

    if (submissionType === "file" && !selectedFile && !existingFilePayload) {
      setError("This homework needs a PDF or image upload.");
      return;
    }

    if (submissionType === "text_and_file" && (!content || (!selectedFile && !existingFilePayload))) {
      setError("This homework needs both a written response and a file upload.");
      return;
    }

    try {
      setError("");
      setSubmittingHomeworkId(homeworkId);

      let filePayload = existingFilePayload;
      if (selectedFile) {
        const uploadRes = await uploadHomeworkFile(selectedFile, { target: "submission" });
        const uploaded = uploadRes?.data || {};
        filePayload = {
          filePath: uploaded.filePath || "",
          fileName: uploaded.fileName || selectedFile.name || "",
          fileMimeType: uploaded.fileMimeType || selectedFile.type || "",
          fileSize: uploaded.fileSize || selectedFile.size || 0,
        };
      }

      await submitHomeworkSubmission({
        homeworkId,
        content,
        submissionText: content,
        ...(filePayload ? { file: filePayload } : {}),
      });
      setDrafts((prev) => ({ ...prev, [homeworkId]: "" }));
      setSubmissionFiles((prev) => ({ ...prev, [homeworkId]: null }));
      bumpSubmissionFileInputKey(homeworkId);
      await load();
    } catch (e) {
      console.warn("Homework submission failed:", e?.response?.data?.message || e?.message || e);
      setError("Homework could not be submitted right now. Please refresh and try again.");
    } finally {
      setSubmittingHomeworkId("");
    }
  };

  const printResult = () => {
    if (!overview?.student) return;

    const schoolName = "Angel Montessori School";
    const schoolAddress = "152 Okedogbon Road, Owo, Ondo State, Nigeria";
    const logoUrl = `${window.location.origin}/logo.png`;
    const selectedTerm = printTermOptions.find((item) => `${item.session}__${item.term}` === selectedPrintTermKey) || null;

    const html = buildReportCardHtml({
      student: overview.student,
      results: overview.recentResults || [],
      summaries: overview.summaries || [],
      reports: overview.reports || [],
      promotionDecisions: overview.promotionDecisions || [],
      selectedTerm,
      schoolName,
      schoolAddress,
      logoUrl,
    });

    const win = window.open("", "_blank", "width=1100,height=800");
    if (!win) {
      setError("Please allow pop-ups to print the result.");
      return;
    }

    win.document.open();
    win.document.write(html);
    win.document.close();

    setTimeout(() => {
      win.focus();
      win.print();
    }, 500);
  };

  const attendanceSummary = overview?.attendanceSummary || {};
  const attendanceHistory = Array.isArray(overview?.attendanceHistory) ? overview.attendanceHistory : [];
  const student = overview?.student || null;
  const homework = Array.isArray(overview?.homework) ? overview.homework : [];
  const homeworkSummary = overview?.homeworkSummary || {};
  const recentResults = Array.isArray(overview?.recentResults) ? overview.recentResults : [];
  const summaries = Array.isArray(overview?.summaries) ? overview.summaries : [];
  const currentPeriod = printTermOptions[0] ? `${printTermOptions[0].session} / ${printTermOptions[0].term}` : "Session and term will appear when available";
  const numericResults = recentResults
    .map((row) => ({ row, score: getResultScore(row) }))
    .filter((item) => item.score !== null);
  const averageScore = numericResults.length
    ? Math.round(numericResults.reduce((total, item) => total + item.score, 0) / numericResults.length)
    : null;
  const highestResult = numericResults.length
    ? numericResults.reduce((best, item) => (item.score > best.score ? item : best), numericResults[0])
    : null;
  const subjectCount = new Set(recentResults.map((row) => row.subject || row.subjectName).filter(Boolean)).size;
  const latestSummary = summaries[0] || null;
  const quickActions = [
    { icon: "RS", title: "View Results", subtitle: "Check uploaded scores and report summaries.", href: "#results" },
    { icon: "AT", title: "Attendance", subtitle: "Review present, absent, late, and excused records.", href: "#attendance" },
    { icon: "HW", title: "Homework & Assignments", subtitle: "Open recent tasks and submit work.", href: "#homework" },
    { icon: "VC", title: "Virtual Classroom", subtitle: "Join live lessons and check recordings.", to: "/student/lms/virtual-classes" },
    { icon: "TT", title: "Timetable", subtitle: "Class timetable access is being prepared.", disabled: true, badge: "Coming soon" },
    { icon: "SF", title: "School Fees", subtitle: "Fees are managed through the parent portal.", disabled: true, badge: "Parent portal" },
    { icon: "CBT", title: "CBT Exams", subtitle: "Open assigned computer-based tests.", to: "/cbt/exam" },
    { icon: "MS", title: "Messages / Announcements", subtitle: "Read school and class notices.", to: "/student/lms/announcements" },
  ];

  return (
    <main className="student-dashboard-page">
      {pdfPreview ? <PdfPreviewModal file={pdfPreview} onClose={() => setPdfPreview(null)} /> : null}
      <div className="student-dashboard-shell">
        <section className="student-hero-card">
          <div className="student-hero-copy">
            <div className="student-brand-line">
              <span>Angel Montessori School</span>
              <StatusBadge tone="primary">Student Portal</StatusBadge>
            </div>
            <h1>{student?.name ? `Welcome, ${student.name}` : "Welcome to your learning dashboard"}</h1>
            <p>
              Review attendance, homework, report cards, online learning, and class updates from one calm student workspace.
            </p>
            <div className="student-hero-meta">
              <StatusBadge tone="primary">{student?.className || "Class not assigned"}</StatusBadge>
              <StatusBadge tone="warning">{currentPeriod}</StatusBadge>
              {latestSummary?.average !== undefined ? (
                <StatusBadge tone="success">Latest average: {latestSummary.average}</StatusBadge>
              ) : null}
            </div>
          </div>
          <div className="student-profile-panel">
            <StudentAvatar student={student} />
            <div>
              <strong>{student?.name || "Student"}</strong>
              <span>{student?.className || "Angel Montessori School"}</span>
            </div>
            <div className="student-report-actions">
              <select
                value={selectedPrintTermKey}
                onChange={(e) => setSelectedPrintTermKey(e.target.value)}
                disabled={!printTermOptions.length}
                aria-label="Select report card term"
              >
                <option value="">Latest Available Report</option>
                {printTermOptions.map((item) => (
                  <option key={`${item.session}-${item.term}`} value={`${item.session}__${item.term}`}>
                    {item.term} - {item.session}
                  </option>
                ))}
              </select>
              <button type="button" onClick={printResult} disabled={!student}>
                Print Student Report Card
              </button>
            </div>
          </div>
        </section>

        <AlertCard tone="warning">{error}</AlertCard>
        {loading && !overview ? <LoadingSkeleton /> : null}
        {!loading && !overview ? (
          <EmptyState
            title="Student dashboard could not be loaded right now."
            text="Please refresh the page. If it continues, the school office can confirm the account linkage."
          />
        ) : null}

        <section className="student-dashboard-section" aria-labelledby="quick-actions-heading">
          <SectionHeader
            kicker="Quick Actions"
            title="What would you like to do today?"
            text="Jump straight to the learning area you need."
          />
          <div className="student-action-grid">
            {quickActions.map((item) => <QuickAction key={item.title} item={item} />)}
          </div>
        </section>

        <section id="virtual-classroom" className="student-dashboard-section">
          <SectionHeader
            kicker="Online Learning"
            title="Virtual Classroom"
            text="Join scheduled lessons, check recordings, and keep track of live class alerts."
            action={<Link to="/student/lms/virtual-classes" className="student-primary-link">Open Virtual Classroom</Link>}
          />
          <div className="student-stat-grid three">
            <StatCard label="Upcoming classes" value={virtualSummary.upcoming || 0} hint="Scheduled or live" tone="primary" />
            <StatCard label="Recordings ready" value={virtualSummary.recordings || 0} hint="Available replays" tone="success" />
            <StatCard label="Active alerts" value={virtualSummary.alerts || 0} hint="Virtual class notices" tone="warning" />
          </div>
          <div className="student-two-column">
            <div className="student-inner-card">
              <h3>Today's online classes</h3>
              {todaysVirtualClasses.length ? (
                <div className="student-list-stack">
                  {todaysVirtualClasses.map((row) => (
                    <article className="student-learning-item" key={row.id}>
                      <div>
                        <strong>{row.title}</strong>
                        <span>{row.subjectName || "Class subject"} | {row.className || student?.className || "Class"}</span>
                        <small>{formatVirtualClassSchedule(row)}</small>
                      </div>
                      <StatusBadge tone={toneForStatus(row.status)}>{humanizeStatus(row.status || "scheduled")}</StatusBadge>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState title="No online classes are scheduled for today." text="New live classes will appear here when teachers publish them." />
              )}
            </div>
            <div className="student-inner-card">
              <h3>Virtual classroom alerts</h3>
              {virtualNotifications.length ? (
                <div className="student-list-stack">
                  {virtualNotifications.slice(0, 4).map((notice) => (
                    <article className="student-notice-card" key={notice.id}>
                      <strong>{notice.title}</strong>
                      <p>{notice.message}</p>
                      <small>{formatDateTime(notice.createdAt, { time: true })}</small>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState title="No current virtual classroom alerts." text="Important online learning messages will show here." />
              )}
            </div>
          </div>
        </section>

        <section className="student-dashboard-section">
          <SectionHeader
            kicker="Progress Status"
            title="Latest Promotion Decision"
            text="Promotion decisions are shown only after they are finalized by the school."
          />
          {latestPromotionDecision ? (
            <div className="student-promotion-card">
              <StatusBadge tone={toneForStatus(latestPromotionDecision.decisionStatus || latestPromotionDecision.promotionStatus)}>
                {decisionLabel(latestPromotionDecision.decisionStatus || latestPromotionDecision.promotionStatus)}
              </StatusBadge>
              <div>
                <strong>{latestPromotionDecision.sessionName || latestPromotionDecision.sessionId || "Current session"}</strong>
                <p>Next class: {latestPromotionDecision.nextClassName || "Not specified yet"}</p>
                <p>{latestPromotionDecision.overrideReason || latestPromotionDecision.decisionReason || "No additional note was added."}</p>
              </div>
            </div>
          ) : (
            <EmptyState title="No finalized promotion decision has been released yet." text="This will update when the academic team publishes a decision." />
          )}
        </section>

        <section id="attendance" className="student-dashboard-section">
          <SectionHeader
            kicker="Attendance"
            title="Attendance Snapshot"
            text="A quick view of your attendance pattern for the current term."
          />
          <div className="student-stat-grid five">
            <StatCard label="Present" value={attendanceSummary.present || 0} tone="success" />
            <StatCard label="Absent" value={attendanceSummary.absent || 0} tone="danger" />
            <StatCard label="Late" value={attendanceSummary.late || 0} tone="warning" />
            <StatCard label="Excused" value={attendanceSummary.excused || 0} tone="neutral" />
            <StatCard label="Attendance Rate" value={`${attendanceSummary.attendanceRate || 0}%`} tone="primary" />
          </div>
          <div className="student-progress-card">
            <div>
              <strong>Attendance rate</strong>
              <span>{attendanceSummary.attendanceRate || 0}% recorded</span>
            </div>
            <ProgressBar value={attendanceSummary.attendanceRate || 0} />
          </div>
          <div className="student-table-card">
            <h3>Attendance Log</h3>
            <div className="student-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Remark</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceHistory.map((row, index) => (
                    <tr key={`${row.attendanceDate}-${row.status}-${index}`}>
                      <td>{row.attendanceDate || "-"}</td>
                      <td><StatusBadge tone={toneForStatus(row.status)}>{humanizeStatus(row.status)}</StatusBadge></td>
                      <td>{row.remark || "-"}</td>
                      <td>{row.reason || "-"}</td>
                    </tr>
                  ))}
                  {!attendanceHistory.length ? (
                    <tr>
                      <td colSpan={4}>
                        <EmptyState title="No attendance records have been recorded yet for this term." />
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="results" className="student-dashboard-section">
          <SectionHeader
            kicker="Academic Performance"
            title="Term Performance & Recent Results"
            text="Scores and summaries appear here once uploaded by the school."
          />
          <div className="student-stat-grid three">
            <StatCard label="Average score" value={averageScore !== null ? `${averageScore}%` : "-"} hint="From available scores only" tone="primary" />
            <StatCard label="Highest subject" value={highestResult?.row?.subject || highestResult?.row?.subjectName || "-"} hint={highestResult ? `${highestResult.score}%` : "No score yet"} tone="success" />
            <StatCard label="Subjects uploaded" value={subjectCount || 0} hint="Recent result subjects" tone="warning" />
          </div>
          {summaries.length ? (
            <div className="student-summary-grid">
              {summaries.slice(0, 4).map((item) => (
                <article className="student-inner-card" key={`${item.session}-${item.term}`}>
                  <span className="student-kicker">{item.session}</span>
                  <h3>{item.term}</h3>
                  <p>Average: <strong>{item.average ?? "-"}</strong></p>
                </article>
              ))}
            </div>
          ) : null}
          <div className="student-table-card">
            <h3>Recent Results</h3>
            <div className="student-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Session</th>
                    <th>Term</th>
                    <th>Subject</th>
                    <th>CA1</th>
                    <th>CA2</th>
                    <th>CA3</th>
                    <th>Exam</th>
                    <th>Total</th>
                    <th>Grade</th>
                    <th>Position</th>
                  </tr>
                </thead>
                <tbody>
                  {recentResults.slice(0, 20).map((row, index) => {
                    const score = getResultScore(row);
                    return (
                      <tr key={row.id || [row.session, row.term, row.subject || row.subjectName, index].join("-")}>
                        <td>{row.session || "-"}</td>
                        <td>{row.term || "-"}</td>
                        <td>{row.subject || row.subjectName || "-"}</td>
                        <td>{getComponentScore(row, ["ca1", "CA1"])}</td>
                        <td>{getComponentScore(row, ["ca2", "CA2"])}</td>
                        <td>{getComponentScore(row, ["ca3", "CA3"])}</td>
                        <td>{getComponentScore(row, ["examScore", "exam", "exam_score"])}</td>
                        <td>
                          <div className="student-score-cell">
                            <strong>{score !== null ? score : row.score || "-"}</strong>
                            {score !== null ? <ProgressBar value={score} tone={score >= 50 ? "success" : "warning"} /> : null}
                          </div>
                        </td>
                        <td><StatusBadge tone="neutral">{row.grade || row.gradeLetter || "Pending"}</StatusBadge></td>
                        <td>{row.positionInSubject || row.subjectPosition || row.position || "-"}</td>
                      </tr>
                    );
                  })}
                  {!recentResults.length ? (
                    <tr>
                      <td colSpan={10}>
                        <EmptyState title="No results have been uploaded yet." />
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="homework" className="student-dashboard-section">
          <SectionHeader
            kicker="Assignments"
            title="Homework and Assignments"
            text="Track pending tasks, due dates, attachments, submissions, and teacher feedback."
          />
          <div className="student-stat-grid five">
            <StatCard label="Pending" value={homeworkSummary.pendingTasks || 0} tone="warning" />
            <StatCard label="Due Today" value={homeworkSummary.dueToday || 0} tone="primary" />
            <StatCard label="Due This Week" value={homeworkSummary.dueThisWeek || 0} tone="neutral" />
            <StatCard label="Overdue" value={homeworkSummary.overdue || 0} tone="danger" />
            <StatCard label="Graded" value={homeworkSummary.graded || 0} tone="success" />
          </div>
          {homework.length ? (
            <div className="student-homework-list">
              {homework.map((hw) => {
                const submission = hw.submission || submissionByHomeworkId.get(String(hw.id));
                const taskAttachments = Array.isArray(hw.attachments) ? hw.attachments : [];
                const selectedFile = submissionFiles[hw.id] || null;
                const submissionStatus = hw.submissionStatus || submission?.status || "not_submitted";
                return (
                  <article key={hw.id} className="student-homework-card">
                    <div className="student-homework-head">
                      <div>
                        <h3>{hw.title}</h3>
                        <p>{hw.subject || "Subject"} | {humanizeStatus(hw.type || hw.taskType || "Assignment")}</p>
                      </div>
                      <StatusBadge tone={toneForStatus(submissionStatus)}>{humanizeStatus(submissionStatus)}</StatusBadge>
                    </div>
                    <div className="student-homework-meta">
                      {hw.dueDate ? <span>Due: {formatDateTime(hw.dueDate, { time: true })}</span> : <span>No due date set</span>}
                      {hw.timelinessStatus ? <span>{humanizeStatus(hw.timelinessStatus)}</span> : null}
                      {taskAttachments.length ? <span>{taskAttachments.length} attachment{taskAttachments.length === 1 ? "" : "s"}</span> : null}
                      {hw.submissionType ? <span>{humanizeStatus(hw.submissionType)} submission</span> : null}
                    </div>
                    {hw.instructions ? <p className="student-homework-instructions">{hw.instructions}</p> : null}

                    {taskAttachments.length ? (
                      <div className="student-attachment-list">
                        <strong>Teacher attachment{taskAttachments.length === 1 ? "" : "s"}</strong>
                        {taskAttachments.map((attachment) => (
                          <HomeworkAttachmentPreview
                            key={attachment.id}
                            filePath={attachment.filePath}
                            fileName={attachment.fileName || attachment.fileTitle}
                            fileMimeType={attachment.fileMimeType || attachment.mimeType}
                            onPreviewPdf={setPdfPreview}
                          />
                        ))}
                      </div>
                    ) : null}

                    {submission ? (
                      <div className="student-submission-note">
                        <strong>{submission.score !== null ? `Score: ${submission.score}` : "Awaiting grade"}</strong>
                        {submission.feedback ? <span>Feedback: {submission.feedback}</span> : null}
                      </div>
                    ) : null}

                    {submission?.filePath ? (
                      <HomeworkAttachmentPreview
                        filePath={submission.filePath}
                        fileName={submission.fileName}
                        fileMimeType={submission.fileMimeType}
                        onPreviewPdf={setPdfPreview}
                      />
                    ) : null}

                    <label className="student-form-field">
                      <span>Submission note</span>
                      <textarea
                        rows={3}
                        value={drafts[hw.id] || ""}
                        onChange={(e) => setDrafts((prev) => ({ ...prev, [hw.id]: e.target.value }))}
                        placeholder="Write your answer or short submission note here"
                      />
                    </label>
                    {hw.submissionType !== "offline" ? (
                      <div className="student-upload-panel">
                        <input
                          key={submissionFileInputKeys[hw.id] || 0}
                          type="file"
                          accept="application/pdf,image/jpeg,image/png,image/gif,image/webp,image/heic"
                          onChange={(event) => handleSubmissionFileChange(hw.id, event)}
                        />
                        <span>Upload a PDF or image when your teacher requests a file submission.</span>
                        {selectedFile ? (
                          <div className="student-file-chip">
                            <strong>{selectedFile.name}</strong>
                            <small>
                              {selectedFile.type || "Unknown type"}
                              {selectedFile.size ? ` | ${formatSubmissionFileSize(selectedFile.size)}` : ""}
                            </small>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      className="student-primary-action"
                      onClick={() => submitWork(hw)}
                      disabled={submittingHomeworkId === String(hw.id)}
                    >
                      {submittingHomeworkId === String(hw.id) ? "Submitting..." : submission ? "Resubmit" : "Submit"}
                    </button>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState title="You are all caught up. No homework or assignments have been posted yet." />
          )}
        </section>

        <section id="announcements" className="student-dashboard-section">
          <SectionHeader
            kicker="Messages"
            title="Announcements"
            text="Recent school or class messages will appear here when published."
            action={<Link to="/student/lms/announcements" className="student-secondary-link">Open announcements</Link>}
          />
          {announcements.length ? (
            <div className="student-announcement-grid">
              {announcements.slice(0, 4).map((item) => (
                <article className="student-notice-card" key={item.id}>
                  <StatusBadge tone="primary">{humanizeStatus(item.targetType || "School")}</StatusBadge>
                  <strong>{item.title}</strong>
                  <p>{item.message}</p>
                  <small>{formatDateTime(item.publishedAt || item.createdAt, { time: true })}</small>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="No announcements at the moment." text="School messages and class notices will appear here." />
          )}
        </section>
      </div>
    </main>
  );
}















