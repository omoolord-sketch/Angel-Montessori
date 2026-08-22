import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  addActivity,
  addHomeworkItem,
  addResult,
  bulkGradeHomeworkSubmissions,
  getActivities,
  getClasses,
  getHomework,
  getHomeworkSubmissions,
  getHomeworkTaskSubmissions,
  getStudents,
  getTeacherFinanceSalary,
  gradeHomeworkSubmission,
  reviewHomeworkSubmission,
  sendHomeworkTaskReminders,
  uploadHomeworkFile,
} from "../api/services";
import { useAuth } from "../auth/AuthContext";
import "./PortalSurface.css";

const MAX_HOMEWORK_UPLOAD_BYTES = 8 * 1024 * 1024;
const ALLOWED_HOMEWORK_UPLOAD_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
]);

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}

function formatSubmissionFileSize(value) {
  const size = Number(value || 0);
  if (!Number.isFinite(size) || size <= 0) return "";
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${size} B`;
}

function isPreviewImage(filePath, fileMimeType = "") {
  const mime = String(fileMimeType || "").toLowerCase();
  const ref = String(filePath || "").toLowerCase();
  return mime.startsWith("image/") || /.(png|jpe?g|gif|webp|heic|bmp)$/i.test(ref);
}

function isPreviewPdf(filePath, fileMimeType = "") {
  const mime = String(fileMimeType || "").toLowerCase();
  const ref = String(filePath || "").toLowerCase();
  return mime === "application/pdf" || ref.endsWith(".pdf");
}

function isAllowedHomeworkUpload(file) {
  return ALLOWED_HOMEWORK_UPLOAD_TYPES.has(String(file?.type || "").toLowerCase());
}

function buildPdfPreviewSrc(filePath, page = 1, zoom = "page-width") {
  const base = String(filePath || "").split("#")[0];
  if (!base) return "";
  const safePage = Math.max(1, Number(page) || 1);
  const safeZoom = encodeURIComponent(String(zoom || "page-width"));
  return `${base}#page=${safePage}&zoom=${safeZoom}`;
}

function formatCurrency(amount, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
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
        background: "rgba(15, 23, 42, 0.65)",
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
          width: "min(960px, 100%)",
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
              <p style={{ margin: "4px 0 0", color: "#475569" }}>Inline PDF preview for the attached submission.</p>
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

function AttachmentPreview({ filePath, fileName, fileMimeType, onPreviewPdf }) {
  if (!filePath) return null;
  if (isPreviewImage(filePath, fileMimeType)) {
    return (
      <div style={{ marginTop: 8 }}>
        <img
          src={filePath}
          alt={fileName || "Attachment preview"}
          style={{ width: 140, height: 100, objectFit: "cover", borderRadius: 10, border: "1px solid #d8e2ee" }}
        />
      </div>
    );
  }

  if (isPreviewPdf(filePath, fileMimeType)) {
    return (
      <div style={{ marginTop: 8, padding: 12, borderRadius: 12, background: "#f5f7fb", color: "#475569", fontSize: 13, display: "grid", gap: 8 }}>
        <span>PDF attached. Preview it here without leaving this page.</span>
        {onPreviewPdf ? <button type="button" onClick={() => onPreviewPdf({ filePath, fileName, fileMimeType })} style={{ width: "fit-content" }}>Preview PDF</button> : null}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 8, padding: 10, borderRadius: 10, background: "#f5f7fb", color: "#475569", fontSize: 13 }}>
      Preview is not embedded for this file type yet.
    </div>
  );
}

export default function TeacherSubjectDashboard() {
  const { user, logout } = useAuth();
  const subjects = user?.subjects || [];
  const defaultSubject = subjects[0] || "";

  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [items, setItems] = useState([]);
  const [activities, setActivities] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [error, setError] = useState("");

  const [type, setType] = useState("HOMEWORK");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState(defaultSubject);
  const [taskClassId, setTaskClassId] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskInstructions, setTaskInstructions] = useState("");
  const [taskSubmissionType, setTaskSubmissionType] = useState("file");
  const [taskAttachmentFiles, setTaskAttachmentFiles] = useState([]);
  const [taskAttachmentInputKey, setTaskAttachmentInputKey] = useState(0);
  const [taskCreating, setTaskCreating] = useState(false);

  const [studentId, setStudentId] = useState("");
  const [term, setTerm] = useState("First Term");
  const [session, setSession] = useState("2025/2026");
  const [resultSubject, setResultSubject] = useState(defaultSubject);
  const [score, setScore] = useState("");

  const [activityClassId, setActivityClassId] = useState("");
  const [activityStudentId, setActivityStudentId] = useState("");
  const [activitySubject, setActivitySubject] = useState(defaultSubject);
  const [activityTitle, setActivityTitle] = useState("");
  const [activityDescription, setActivityDescription] = useState("");
  const [activityDate, setActivityDate] = useState(new Date().toISOString().slice(0, 10));
  const [activityImageData, setActivityImageData] = useState("");

  const [reviewDrafts, setReviewDrafts] = useState({});
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [taskStatusFilter, setTaskStatusFilter] = useState("");
  const [taskSubmissionTask, setTaskSubmissionTask] = useState(null);
  const [taskSubmissionRows, setTaskSubmissionRows] = useState([]);
  const [taskSubmissionLoading, setTaskSubmissionLoading] = useState(false);
  const [taskRowSavingId, setTaskRowSavingId] = useState("");
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState([]);
  const [bulkStatus, setBulkStatus] = useState("graded");
  const [bulkScore, setBulkScore] = useState("");
  const [bulkFeedback, setBulkFeedback] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [reminderSending, setReminderSending] = useState(false);
  const [message, setMessage] = useState("");
  const [pdfPreview, setPdfPreview] = useState(null);
  const [salaryRecord, setSalaryRecord] = useState(null);

  const subjectOptions = useMemo(() => subjects, [subjects]);

  const studentsForActivityClass = useMemo(() => {
    if (!activityClassId) return [];
    return students.filter((item) => String(item.classId) === String(activityClassId));
  }, [students, activityClassId]);

  const taskOptions = useMemo(() => {
    return Array.isArray(items)
      ? items
          .filter((item) => String(item.status || "").toLowerCase() !== "archived")
          .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
      : [];
  }, [items]);

  const selectableSubmissionIds = useMemo(
    () => taskSubmissionRows.filter((row) => row.submissionId).map((row) => String(row.submissionId)),
    [taskSubmissionRows]
  );
  const allVisibleSelected = useMemo(
    () => selectableSubmissionIds.length > 0 && selectableSubmissionIds.every((id) => selectedSubmissionIds.includes(id)),
    [selectableSubmissionIds, selectedSubmissionIds]
  );

  const load = async () => {
    try {
      const [classRes, sRes, hRes, subRes, activityRes] = await Promise.all([
        getClasses(),
        getStudents(),
        getHomework(),
        getHomeworkSubmissions(),
        getActivities(),
      ]);

      const classRows = Array.isArray(classRes.data) ? classRes.data : [];
      const taskRows = Array.isArray(hRes.data) ? hRes.data : [];

      setClasses(classRows);
      setStudents(Array.isArray(sRes.data) ? sRes.data : []);
      setItems(taskRows);
      setSubmissions(Array.isArray(subRes.data) ? subRes.data : []);
      setActivities(Array.isArray(activityRes.data) ? activityRes.data : []);

      if (classRows.length > 0) {
        if (!activityClassId) setActivityClassId(String(classRows[0].id));
        if (!taskClassId) setTaskClassId(String(classRows[0].id));
      }

      if (!selectedTaskId && taskRows.length > 0) {
        setSelectedTaskId(String(taskRows[0].id));
      }

      try {
        const financeRes = await getTeacherFinanceSalary();
        setSalaryRecord(financeRes?.data?.record || null);
      } catch {
        setSalaryRecord(null);
      }

      setError("");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load teacher classroom records");
    }
  };

  const loadTaskSubmissionTable = async (taskId = selectedTaskId, status = taskStatusFilter) => {
    const safeTaskId = String(taskId || "").trim();
    if (!safeTaskId) {
      setTaskSubmissionTask(null);
      setTaskSubmissionRows([]);
      return;
    }

    try {
      setTaskSubmissionLoading(true);
      const params = status ? { status } : undefined;
      const res = await getHomeworkTaskSubmissions(safeTaskId, params);
      setTaskSubmissionTask(res?.data?.task || null);
      setTaskSubmissionRows(Array.isArray(res?.data?.rows) ? res.data.rows : []);
    } catch (e) {
      setTaskSubmissionTask(null);
      setTaskSubmissionRows([]);
      setError(e?.response?.data?.message || "Failed to load task submissions");
    } finally {
      setTaskSubmissionLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!activityClassId) {
      setActivityStudentId("");
      return;
    }

    const exists = studentsForActivityClass.some((item) => String(item.id) === String(activityStudentId));
    if (!exists) setActivityStudentId("");
  }, [activityClassId, activityStudentId, studentsForActivityClass]);
  useEffect(() => {
    if (!selectedTaskId) return;
    loadTaskSubmissionTable(selectedTaskId, taskStatusFilter);
  }, [selectedTaskId, taskStatusFilter]);

  useEffect(() => {
    setSelectedSubmissionIds([]);
  }, [taskSubmissionRows, selectedTaskId, taskStatusFilter]);

  const handleTaskAttachmentSelection = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      setTaskAttachmentFiles([]);
      return;
    }

    const invalidType = files.find((file) => !isAllowedHomeworkUpload(file));
    if (invalidType) {
      setError("Only PDF and image files can be attached to assignments.");
      setTaskAttachmentFiles([]);
      setTaskAttachmentInputKey((value) => value + 1);
      return;
    }

    const oversized = files.find((file) => Number(file.size || 0) > MAX_HOMEWORK_UPLOAD_BYTES);
    if (oversized) {
      setError("Each assignment file must be 8 MB or smaller.");
      setTaskAttachmentFiles([]);
      setTaskAttachmentInputKey((value) => value + 1);
      return;
    }

    setTaskAttachmentFiles(files);
    setError("");
  };

  const createItem = async () => {
    if (!title.trim() || !subject.trim()) {
      setError("Enter task title and subject.");
      return;
    }

    try {
      setTaskCreating(true);
      setMessage("");
      setError("");

      const uploadedAttachments = [];
      for (const file of taskAttachmentFiles) {
        const uploadRes = await uploadHomeworkFile(file, { target: "task" });
        const uploaded = uploadRes?.data || {};
        uploadedAttachments.push({
          fileTitle: uploaded.fileName || file.name || "Attachment",
          fileName: uploaded.fileName || file.name || "Attachment",
          filePath: uploaded.filePath || "",
          fileMimeType: uploaded.fileMimeType || file.type || "",
          mimeType: uploaded.fileMimeType || file.type || "",
          fileSize: uploaded.fileSize || file.size || 0,
        });
      }

      const created = await addHomeworkItem({
        type,
        taskType: String(type || "HOMEWORK").toLowerCase(),
        title,
        subject,
        classId: taskClassId || undefined,
        instructions: taskInstructions,
        dueDate: taskDueDate ? new Date(taskDueDate).toISOString() : "",
        submissionType: taskSubmissionType,
        attachments: uploadedAttachments,
        isGraded: true,
        maxScore: 20,
        status: "published",
      });

      const createdTaskId = String(created?.data?.id || "").trim();
      setTitle("");
      setTaskDueDate("");
      setTaskInstructions("");
      setTaskSubmissionType("file");
      setTaskAttachmentFiles([]);
      setTaskAttachmentInputKey((value) => value + 1);
      if (createdTaskId) {
        setSelectedTaskId(createdTaskId);
      }
      await load();
      await loadTaskSubmissionTable(createdTaskId || selectedTaskId, taskStatusFilter);
      setMessage("Task created successfully.");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to create item");
    } finally {
      setTaskCreating(false);
    }
  };

  const createActivity = async () => {
    if (!activityClassId) {
      setError("Select class for activity.");
      return;
    }

    if (!activityTitle.trim() || !activityDescription.trim()) {
      setError("Enter activity title and description.");
      return;
    }

    try {
      await addActivity({
        classId: activityClassId,
        studentId: activityStudentId || undefined,
        subject: activitySubject || undefined,
        title: activityTitle.trim(),
        description: activityDescription.trim(),
        activityDate,
        imageUrl: activityImageData || undefined,
      });

      setActivityTitle("");
      setActivityDescription("");
      setActivityImageData("");
      setError("");
      await load();
      await loadTaskSubmissionTable(selectedTaskId, taskStatusFilter);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to post activity");
    }
  };

  const uploadResult = async () => {
    try {
      await addResult({
        studentId,
        term,
        session,
        subject: resultSubject,
        score: Number(score),
        date: new Date().toLocaleDateString(),
      });
      setScore("");
      setError("");
      await load();
      await loadTaskSubmissionTable(selectedTaskId, taskStatusFilter);
      alert("Result uploaded");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to upload result");
    }
  };

  const reviewSubmission = async (submissionId) => {
    const draft = reviewDrafts[submissionId] || {};
    try {
      await reviewHomeworkSubmission(submissionId, {
        status: draft.status || "graded",
        score: draft.score,
        feedback: draft.feedback || "",
      });
      await load();
      await loadTaskSubmissionTable(selectedTaskId, taskStatusFilter);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to review submission");
    }
  };  const gradeTaskSubmissionRow = async (row) => {
    if (!row?.submissionId) return;
    const draft = reviewDrafts[row.submissionId] || {};

    try {
      setTaskRowSavingId(String(row.submissionId));
      setMessage("");
      await gradeHomeworkSubmission(row.submissionId, {
        status: draft.status || row.status || "graded",
        score: draft.score !== undefined && draft.score !== "" ? Number(draft.score) : row.score,
        feedback: draft.feedback !== undefined ? draft.feedback : row.feedback,
      });
      await loadTaskSubmissionTable(selectedTaskId, taskStatusFilter);
      await load();
      setMessage("Submission updated successfully.");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to grade submission");
    } finally {
      setTaskRowSavingId("");
    }
  };

  const sendMissingReminders = async () => {
    if (!selectedTaskId) return;
    try {
      setReminderSending(true);
      setError("");
      setMessage("");
      const res = await sendHomeworkTaskReminders(selectedTaskId, {});
      const count = Number(res?.data?.missingCount || 0);
      setMessage(`Reminder sent. Missing students: ${count}`);
      await loadTaskSubmissionTable(selectedTaskId, taskStatusFilter);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to send reminders");
    } finally {
      setReminderSending(false);
    }
  };

  const exportTaskRowsCsv = () => {
    if (!taskSubmissionRows.length) {
      setError("No rows to export.");
      return;
    }

    const escapeCell = (value) => {
      const text = String(value ?? "");
      if (text.includes('"') || text.includes(",") || text.includes("\n")) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };

    const header = [
      "Student",
      "Status",
      "Timeliness",
      "SubmittedAt",
      "Score",
      "Feedback",
      "HasSubmission",
    ];

    const lines = [header.join(",")];
    for (const row of taskSubmissionRows) {
      lines.push(
        [
          escapeCell(row.studentName),
          escapeCell(row.status),
          escapeCell(row.timelinessStatus),
          escapeCell(row.submittedAt),
          escapeCell(row.score ?? ""),
          escapeCell(row.feedback || ""),
          escapeCell(row.submissionId ? "Yes" : "No"),
        ].join(",")
      );
    }

    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const taskName = (taskSubmissionTask?.title || "task").replace(/[^a-z0-9]+/gi, "_").toLowerCase();
    a.href = url;
    a.download = `${taskName}_submissions.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleSubmissionSelection = (submissionId) => {
    const key = String(submissionId || "").trim();
    if (!key) return;
    setSelectedSubmissionIds((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  const toggleSelectAllVisible = () => {
    if (!selectableSubmissionIds.length) return;
    const allSelected = selectableSubmissionIds.every((id) => selectedSubmissionIds.includes(id));
    if (allSelected) {
      setSelectedSubmissionIds((prev) => prev.filter((id) => !selectableSubmissionIds.includes(id)));
      return;
    }
    setSelectedSubmissionIds((prev) => Array.from(new Set([...prev, ...selectableSubmissionIds])));
  };

  const applyBulkGrade = async () => {
    if (!selectedSubmissionIds.length) {
      setError("Select at least one submitted row for bulk grading.");
      return;
    }

    try {
      setBulkSaving(true);
      setError("");
      setMessage("");
      const payload = {
        submissionIds: selectedSubmissionIds,
        status: bulkStatus,
        feedback: bulkFeedback,
      };
      if (bulkScore !== "") payload.score = Number(bulkScore);

      const res = await bulkGradeHomeworkSubmissions(payload);
      setMessage(`Bulk grading complete. Updated: ${res?.data?.updatedCount || 0}, Skipped: ${res?.data?.skippedCount || 0}`);
      setSelectedSubmissionIds([]);
      await loadTaskSubmissionTable(selectedTaskId, taskStatusFilter);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to apply bulk grading");
    } finally {
      setBulkSaving(false);
    }
  };

  return (
    <div className="portal-dashboard-page">
      {pdfPreview ? <PdfPreviewModal file={pdfPreview} onClose={() => setPdfPreview(null)} /> : null}
      <section className="portal-dashboard-hero">
        <div className="portal-dashboard-hero-copy">
          <div className="portal-surface-kicker">Angel Montessori School</div>
          <h2 className="portal-dashboard-title">Teacher Classroom Desk</h2>
          <p className="portal-dashboard-subtitle">
            Post class updates, create homework, review submissions, and enter results for your Angel Montessori pupils from one teaching workspace.
          </p>
          <p className="portal-dashboard-meta">Signed in as <strong>{user?.name}</strong> ({user?.role})</p>
          <p className="portal-dashboard-meta">Assigned subjects: <strong>{subjects.join(", ") || "None"}</strong></p>
        </div>
        <div className="portal-dashboard-actions">
          <Link to="/teacher/continuous-assessment" className="portal-dashboard-link-btn">Continuous Assessment</Link>
          <Link to="/dashboard/broadsheet" className="portal-dashboard-link-btn">Print Broadsheet</Link>
          <button type="button" onClick={logout}>Logout</button>
        </div>
      </section>
      <section
        className="portal-surface-card"
        style={{
          marginBottom: 16,
          padding: 16,
          display: "grid",
          gap: 14,
          border: "1px solid #d7e3f2",
          background: "#f8fbff",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div className="portal-surface-kicker">Teacher Salary View</div>
            <h3 style={{ margin: "6px 0", color: "#16355f" }}>Current salary status</h3>
            <p style={{ margin: 0, color: "#4d647f" }}>
              See the finance snapshot for your current salary profile without leaving the teaching workspace.
            </p>
          </div>
          <div
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              background: salaryRecord ? (String(salaryRecord.status || "").toLowerCase() === "paid" ? "#e7f8ee" : "#fff7e6") : "#eef4fb",
              color: salaryRecord ? (String(salaryRecord.status || "").toLowerCase() === "paid" ? "#166534" : "#9a6700") : "#4d647f",
              fontWeight: 700,
            }}
          >
            {salaryRecord?.status || "Profile Pending"}
          </div>
        </div>

        {salaryRecord ? (
          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            }}
          >
            <div style={{ padding: 12, borderRadius: 12, background: "#ffffff", border: "1px solid #d7e3f2" }}>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "#7c8ea6" }}>Net Salary</div>
              <strong style={{ display: "block", marginTop: 6, fontSize: 20, color: "#16355f" }}>{formatCurrency(salaryRecord.netSalary)}</strong>
            </div>
            <div style={{ padding: 12, borderRadius: 12, background: "#ffffff", border: "1px solid #d7e3f2" }}>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "#7c8ea6" }}>Paid This Term</div>
              <strong style={{ display: "block", marginTop: 6, fontSize: 20, color: "#16355f" }}>{formatCurrency(salaryRecord.paidAmount)}</strong>
            </div>
            <div style={{ padding: 12, borderRadius: 12, background: "#ffffff", border: "1px solid #d7e3f2" }}>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "#7c8ea6" }}>Pending</div>
              <strong style={{ display: "block", marginTop: 6, fontSize: 20, color: "#16355f" }}>{formatCurrency(salaryRecord.pendingAmount)}</strong>
            </div>
            <div style={{ padding: 12, borderRadius: 12, background: "#ffffff", border: "1px solid #d7e3f2" }}>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "#7c8ea6" }}>Latest Payment</div>
              <strong style={{ display: "block", marginTop: 6, fontSize: 15, color: "#16355f" }}>
                {salaryRecord.latestPayment?.paymentDate
                  ? new Date(salaryRecord.latestPayment.paymentDate).toLocaleDateString("en-GB")
                  : "No payment yet"}
              </strong>
              <div style={{ marginTop: 4, color: "#4d647f", fontSize: 13 }}>
                {salaryRecord.latestPayment?.reference || "Awaiting finance posting"}
              </div>
            </div>
          </div>
        ) : (
          <p style={{ margin: 0, color: "#4d647f" }}>
            No salary structure has been posted to this account yet. The finance office will update this view once your record is ready.
          </p>
        )}
      </section>
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      {message ? <p style={{ color: "#166534" }}>{message}</p> : null}

      <div style={{ border: "1px solid #ccc", padding: 12, marginBottom: 12 }}>
        <h3>Post Daily Class Update</h3>
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select value={activityClassId} onChange={(e) => setActivityClassId(e.target.value)}>
              <option value="">Select Class</option>
              {classes.map((cls) => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
            </select>

            <select value={activityStudentId} onChange={(e) => setActivityStudentId(e.target.value)}>
              <option value="">Whole Class (Optional)</option>
              {studentsForActivityClass.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            <select value={activitySubject} onChange={(e) => setActivitySubject(e.target.value)}>
              <option value="">General Activity</option>
              {subjectOptions.map((s) => <option key={s}>{s}</option>)}
            </select>

            <input type="date" value={activityDate} onChange={(e) => setActivityDate(e.target.value)} />
          </div>

          <input value={activityTitle} onChange={(e) => setActivityTitle(e.target.value)} placeholder="Activity title" />
          <textarea
            rows={3}
            value={activityDescription}
            onChange={(e) => setActivityDescription(e.target.value)}
            placeholder="Describe what pupils learned, practised, or completed today"
          />

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) {
                  setActivityImageData("");
                  return;
                }

                try {
                  const dataUrl = await fileToDataUrl(file);
                  setActivityImageData(dataUrl);
                } catch {
                  setActivityImageData("");
                  setError("Failed to read activity image.");
                }
              }}
            />
            <button onClick={createActivity}>Post Class Update</button>
          </div>

          {activityImageData ? (
            <img
              src={activityImageData}
              alt="Activity preview"
              style={{ width: 110, height: 80, objectFit: "cover", borderRadius: 8, border: "1px solid #ccd6e0" }}
            />
          ) : null}
        </div>
      </div>

      <div style={{ border: "1px solid #ccc", padding: 12, marginBottom: 12 }}>
        <h3>Create Homework or Assignment</h3>
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="HOMEWORK">Homework</option>
              <option value="ASSIGNMENT">Assignment</option>
              <option value="PROJECT">Project</option>
              <option value="PRACTICE">Practice</option>
            </select>
            <select value={taskClassId} onChange={(e) => setTaskClassId(e.target.value)}>
              <option value="">Select Class</option>
              {classes.map((cls) => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
            </select>
            <select value={subject} onChange={(e) => setSubject(e.target.value)}>
              {subjectOptions.map((s) => <option key={s}>{s}</option>)}
            </select>
            <select value={taskSubmissionType} onChange={(e) => setTaskSubmissionType(e.target.value)}>
              <option value="text">Text only</option>
              <option value="file">File only</option>
              <option value="text_and_file">Text and file</option>
              <option value="offline">Offline</option>
            </select>
            <input type="datetime-local" value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} />
          </div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Homework or task title" />
          <textarea
            rows={2}
            value={taskInstructions}
            onChange={(e) => setTaskInstructions(e.target.value)}
            placeholder="Instructions for the class"
          />
          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontWeight: 600 }}>Assignment file upload</label>
            <input
              key={taskAttachmentInputKey}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/gif,image/webp,image/heic"
              multiple
              onChange={handleTaskAttachmentSelection}
            />
            <span style={{ color: "#475569", fontSize: 13 }}>
              Upload PDF or image briefs only. Each file must be 8 MB or smaller.
            </span>
            {taskAttachmentFiles.length ? (
              <div style={{ display: "grid", gap: 6 }}>
                {taskAttachmentFiles.map((file) => (
                  <div key={`${file.name}-${file.size}`} style={{ padding: 10, borderRadius: 10, border: "1px solid #dbe4ef", background: "#f8fbff" }}>
                    <strong>{file.name}</strong>
                    <p style={{ margin: "4px 0 0", color: "#475569" }}>
                      {file.type || "Unknown type"}
                      {file.size ? ` | ${formatSubmissionFileSize(file.size)}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div>
            <button onClick={createItem} disabled={taskCreating}>
              {taskCreating ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      </div>

      <div style={{ border: "1px solid #ccc", padding: 12, marginBottom: 12 }}>
        <h3>Enter Student Result</h3>
        <select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
          <option value="">Select Student</option>
          {students.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.className})</option>)}
        </select>
        <select value={term} onChange={(e) => setTerm(e.target.value)} style={{ marginLeft: 8 }}>
          <option>First Term</option>
          <option>Second Term</option>
          <option>Third Term</option>
        </select>
        <input value={session} onChange={(e) => setSession(e.target.value)} style={{ marginLeft: 8, width: 120 }} />
        <select value={resultSubject} onChange={(e) => setResultSubject(e.target.value)} style={{ marginLeft: 8 }}>
          {subjectOptions.map((s) => <option key={s}>{s}</option>)}
        </select>
        <input type="number" value={score} onChange={(e) => setScore(e.target.value)} placeholder="Score" style={{ marginLeft: 8, width: 90 }} />
        <button onClick={uploadResult} style={{ marginLeft: 8 }}>Upload</button>
      </div>

      <div style={{ border: "1px solid #ccc", padding: 12, marginBottom: 12 }}>
        <h3>Assignment Review Tracker</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <select value={selectedTaskId} onChange={(e) => setSelectedTaskId(e.target.value)}>
            <option value="">Select Task</option>
            {taskOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title} ({item.className || "All"} | {item.subject})
              </option>
            ))}
          </select>

          <select value={taskStatusFilter} onChange={(e) => setTaskStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="submitted">submitted</option>
            <option value="graded">graded</option>
            <option value="returned">returned</option>
            <option value="not_submitted">not_submitted</option>
            <option value="overdue">overdue</option>
          </select>

          <button onClick={() => loadTaskSubmissionTable(selectedTaskId, taskStatusFilter)} disabled={!selectedTaskId || taskSubmissionLoading}>
            {taskSubmissionLoading ? "Loading..." : "Refresh Tracker"}
          </button>
          <button onClick={exportTaskRowsCsv} disabled={!taskSubmissionRows.length}>
            Export CSV
          </button>
          <button onClick={sendMissingReminders} disabled={!selectedTaskId || reminderSending}>
            {reminderSending ? "Sending..." : "Send Missing Reminders"}
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
          <strong>Bulk Review:</strong>
          <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
            <option value="graded">graded</option>
            <option value="returned">returned</option>
            <option value="submitted">submitted</option>
            <option value="excused">excused</option>
          </select>
          <input
            type="number"
            min={0}
            value={bulkScore}
            onChange={(e) => setBulkScore(e.target.value)}
            placeholder="Score (optional)"
            style={{ width: 140 }}
          />
          <input
            value={bulkFeedback}
            onChange={(e) => setBulkFeedback(e.target.value)}
            placeholder="Feedback (optional)"
            style={{ width: 260, maxWidth: "100%" }}
          />
          <button onClick={applyBulkGrade} disabled={!selectedSubmissionIds.length || bulkSaving}>
            {bulkSaving ? "Applying..." : `Apply to Selected (${selectedSubmissionIds.length})`}
          </button>
        </div>

        {taskSubmissionTask ? (
          <p style={{ margin: "6px 0", color: "#334155" }}>
            <strong>{taskSubmissionTask.title}</strong>
            {" | "}
            {taskSubmissionTask.className || "All Classes"}
            {" | "}
            {taskSubmissionTask.subject}
            {taskSubmissionTask.dueDate ? ` | Due: ${new Date(taskSubmissionTask.dueDate).toLocaleString()}` : ""}
          </p>
        ) : null}

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ border: "1px solid #ddd", padding: 6, textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    disabled={!selectableSubmissionIds.length}
                    title="Select all visible submitted rows"
                  />
                </th>
                <th style={{ border: "1px solid #ddd", padding: 6, textAlign: "left" }}>Student</th>
                <th style={{ border: "1px solid #ddd", padding: 6, textAlign: "left" }}>Status</th>
                <th style={{ border: "1px solid #ddd", padding: 6, textAlign: "left" }}>Timeliness</th>
                <th style={{ border: "1px solid #ddd", padding: 6, textAlign: "left" }}>Submitted At</th>
                <th style={{ border: "1px solid #ddd", padding: 6, textAlign: "left" }}>Score</th>
                <th style={{ border: "1px solid #ddd", padding: 6, textAlign: "left" }}>Feedback</th>
                <th style={{ border: "1px solid #ddd", padding: 6, textAlign: "left" }}>Action</th>
              </tr>
            </thead>
            <tbody>
                            {taskSubmissionRows.map((row) => {
                const draftKey = row.submissionId || `missing-${row.studentId}`;
                const draft = reviewDrafts[draftKey] || {};
                return (
                  <tr key={`${row.studentId}-${row.submissionId || "missing"}`}>
                    <td style={{ border: "1px solid #ddd", padding: 6, textAlign: "center" }}>
                      {row.submissionId ? (
                        <input
                          type="checkbox"
                          checked={selectedSubmissionIds.includes(String(row.submissionId))}
                          onChange={() => toggleSubmissionSelection(row.submissionId)}
                        />
                      ) : null}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: 6 }}>{row.studentName}</td>
                    <td style={{ border: "1px solid #ddd", padding: 6 }}>
                      {row.submissionId ? (
                        <select
                          value={draft.status || row.status || "submitted"}
                          onChange={(e) =>
                            setReviewDrafts((prev) => ({
                              ...prev,
                              [draftKey]: { ...prev[draftKey], status: e.target.value },
                            }))
                          }
                        >
                          <option value="submitted">submitted</option>
                          <option value="graded">graded</option>
                          <option value="returned">returned</option>
                          <option value="excused">excused</option>
                        </select>
                      ) : (
                        <span>{row.status}</span>
                      )}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: 6 }}>{row.timelinessStatus || "-"}</td>
                    <td style={{ border: "1px solid #ddd", padding: 6 }}>{row.submittedAt ? new Date(row.submittedAt).toLocaleString() : "-"}</td>
                    <td style={{ border: "1px solid #ddd", padding: 6 }}>
                      {row.submissionId ? (
                        <input
                          type="number"
                          min={0}
                          value={draft.score ?? row.score ?? ""}
                          onChange={(e) =>
                            setReviewDrafts((prev) => ({
                              ...prev,
                              [draftKey]: { ...prev[draftKey], score: e.target.value },
                            }))
                          }
                          style={{ width: 80 }}
                        />
                      ) : (
                        "-"
                      )}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: 6 }}>
                      {row.submissionId ? (
                        <input
                          value={draft.feedback ?? row.feedback ?? ""}
                          onChange={(e) =>
                            setReviewDrafts((prev) => ({
                              ...prev,
                              [draftKey]: { ...prev[draftKey], feedback: e.target.value },
                            }))
                          }
                          style={{ width: 220, maxWidth: "100%" }}
                        />
                      ) : (
                        "-"
                      )}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: 6 }}>
                      {row.submissionId ? (
                        <div style={{ display: "grid", gap: 6 }}>
                          {row.filePath ? (
                            <>
                              <a href={row.filePath} target="_blank" rel="noreferrer" download={row.fileName || undefined}>
                                {row.fileName || "Open attachment"}
                              </a>
                              <AttachmentPreview filePath={row.filePath} fileName={row.fileName} fileMimeType={row.fileMimeType} onPreviewPdf={setPdfPreview} />
                            </>
                          ) : null}
                          <button
                            onClick={() => gradeTaskSubmissionRow(row)}
                            disabled={taskRowSavingId === String(row.submissionId)}
                          >
                            {taskRowSavingId === String(row.submissionId) ? "Saving..." : "Save"}
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: "#b91c1c" }}>Missing</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!taskSubmissionLoading && selectedTaskId && taskSubmissionRows.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ border: "1px solid #ddd", padding: 8, textAlign: "center", color: "#666" }}>
                    No rows found for this task.
                  </td>
                </tr>
              ) : null}
              {!selectedTaskId ? (
                <tr>
                  <td colSpan={8} style={{ border: "1px solid #ddd", padding: 8, textAlign: "center", color: "#666" }}>
                    Select a task to view full class submissions.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ border: "1px solid #ccc", padding: 12, marginBottom: 12 }}>
        <h3>Recent Student Submissions</h3>
        {submissions.length === 0 ? <p>No student submissions have been recorded yet.</p> : null}
        {submissions.map((sub) => {
          const draft = reviewDrafts[sub.id] || {};
          return (
            <div key={sub.id} style={{ borderBottom: "1px dashed #ddd", padding: "8px 0" }}>
              <strong>{sub.homeworkTitle}</strong> ({sub.subject})
              <p style={{ margin: "6px 0" }}><strong>Student ID:</strong> {sub.studentId}</p>
              <p style={{ margin: "6px 0" }}><strong>Submission:</strong> {sub.content || (sub.filePath ? "File attached below." : "-")}</p>
              {sub.filePath ? (
                <>
                  <p style={{ margin: "6px 0" }}>
                    <strong>Attachment:</strong>{" "}
                    <a href={sub.filePath} target="_blank" rel="noreferrer" download={sub.fileName || undefined}>
                      {sub.fileName || "Open attachment"}
                    </a>
                    {sub.fileSize ? ` (${formatSubmissionFileSize(sub.fileSize)})` : ""}
                  </p>
                  <AttachmentPreview filePath={sub.filePath} fileName={sub.fileName} fileMimeType={sub.fileMimeType} onPreviewPdf={setPdfPreview} />
                </>
              ) : null}
              <p style={{ margin: "6px 0" }}><strong>Status:</strong> {sub.status}</p>

              <select
                value={draft.status || "graded"}
                onChange={(e) => setReviewDrafts((prev) => ({ ...prev, [sub.id]: { ...prev[sub.id], status: e.target.value } }))}
              >
                <option value="graded">graded</option>
                <option value="returned">returned</option>
                <option value="submitted">submitted</option><option value="excused">excused</option>
              </select>

              <input
                type="number"
                placeholder="Score"
                value={draft.score ?? sub.score ?? ""}
                onChange={(e) => setReviewDrafts((prev) => ({ ...prev, [sub.id]: { ...prev[sub.id], score: e.target.value } }))}
                style={{ marginLeft: 8, width: 90 }}
              />

              <input
                placeholder="Feedback"
                value={draft.feedback ?? sub.feedback ?? ""}
                onChange={(e) => setReviewDrafts((prev) => ({ ...prev, [sub.id]: { ...prev[sub.id], feedback: e.target.value } }))}
                style={{ marginLeft: 8, width: 260, maxWidth: "100%" }}
              />

              <button onClick={() => reviewSubmission(sub.id)} style={{ marginLeft: 8 }}>Save Review</button>
            </div>
          );
        })}
      </div>

      <div style={{ border: "1px solid #ccc", padding: 12, marginBottom: 12 }}>
        <h3>Posted Class Updates</h3>
        {activities.length === 0 ? <p>No class updates have been posted yet.</p> : null}
        {activities.map((item) => (
          <div key={item.id} style={{ borderBottom: "1px dashed #ddd", padding: "8px 0" }}>
            <strong>{item.title}</strong>
            <p style={{ margin: "4px 0" }}>{item.description}</p>
            <p style={{ margin: "4px 0", fontSize: 13, color: "#334155" }}>
              {item.className}
              {item.studentName ? ` | ${item.studentName}` : ""}
              {item.subject ? ` | ${item.subject}` : ""}
              {item.activityDate ? ` | ${item.activityDate}` : ""}
            </p>
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt="Activity"
                style={{ width: 120, height: 90, objectFit: "cover", borderRadius: 8, border: "1px solid #d9e2ec" }}
              />
            ) : null}
          </div>
        ))}
      </div>

      <div style={{ border: "1px solid #ccc", padding: 12 }}>
        <h3>Published Class Tasks</h3>
        {items.length === 0 ? <p>No homework or assignments have been published yet.</p> : null}
        {items.map((item) => {
          const attachments = Array.isArray(item.attachments) ? item.attachments : [];
          return (
            <div key={item.id} style={{ borderBottom: "1px dashed #ddd", padding: "10px 0", display: "grid", gap: 6 }}>
              <strong>{item.type}: {item.title}</strong>
              <p style={{ margin: 0, color: "#334155" }}>
                {item.subject}
                {item.className ? ` | ${item.className}` : ""}
                {item.dueDate ? ` | Due: ${new Date(item.dueDate).toLocaleString()}` : ""}
                {item.submissionType ? ` | Submission: ${item.submissionType}` : ""}
              </p>
              {item.instructions ? <p style={{ margin: 0 }}>{item.instructions}</p> : null}
              {attachments.length ? (
                <div style={{ display: "grid", gap: 8 }}>
                  {attachments.map((attachment) => (
                    <div key={attachment.id} style={{ padding: 10, borderRadius: 10, border: "1px solid #dbe4ef", background: "#f8fbff" }}>
                      <a href={attachment.filePath} target="_blank" rel="noreferrer" download={attachment.fileName || attachment.fileTitle || undefined}>
                        {attachment.fileName || attachment.fileTitle || "Open attachment"}
                      </a>
                      {attachment.fileSize ? (
                        <p style={{ margin: "4px 0 0", color: "#475569" }}>{formatSubmissionFileSize(attachment.fileSize)}</p>
                      ) : null}
                      <AttachmentPreview
                        filePath={attachment.filePath}
                        fileName={attachment.fileName || attachment.fileTitle}
                        fileMimeType={attachment.fileMimeType || attachment.mimeType}
                        onPreviewPdf={setPdfPreview}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, color: "#64748b" }}>No assignment file attached.</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}




