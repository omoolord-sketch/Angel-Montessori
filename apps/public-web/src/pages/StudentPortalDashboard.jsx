import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getLmsVirtualClasses, getLmsVirtualNotifications, getStudentPortalOverview, submitHomeworkSubmission } from "../api/services";
import { buildReportCardHtml, getTermOptions } from "../utils/reportCard";
import "./PortalSurface.css";

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

function HomeworkAttachmentPreview({ submission, onPreviewPdf }) {
  if (!submission?.filePath) return null;

  return (
    <div style={{ marginBottom: 10, padding: 10, borderRadius: 10, border: "1px solid #dde6f3", background: "#f8fbff" }}>
      <p style={{ margin: "0 0 8px" }}>
        <strong>Attachment:</strong>{" "}
        <a href={submission.filePath} target="_blank" rel="noreferrer" download={submission.fileName || undefined}>
          {submission.fileName || "Open attachment"}
        </a>
      </p>
      {isHomeworkPreviewImage(submission.filePath, submission.fileMimeType) ? (
        <img
          src={submission.filePath}
          alt={submission.fileName || "Homework attachment"}
          style={{ width: 160, maxWidth: "100%", borderRadius: 10, border: "1px solid #dbe4ef" }}
        />
      ) : isHomeworkPreviewPdf(submission.filePath, submission.fileMimeType) ? (
        <div style={{ display: "grid", gap: 8 }}>
          <p style={{ margin: 0, color: "#475569" }}>Preview this PDF here without leaving your homework list.</p>
          <button type="button" onClick={() => onPreviewPdf?.(submission)} style={{ width: "fit-content" }}>Preview PDF</button>
        </div>
      ) : (
        <p style={{ margin: 0, color: "#475569" }}>Preview is available when you open the file.</p>
      )}
    </div>
  );
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
      const [overviewRes, classesRes, notificationsRes] = await Promise.allSettled([
        getStudentPortalOverview(),
        getLmsVirtualClasses(),
        getLmsVirtualNotifications(),
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

      const firstError = [overviewRes, classesRes, notificationsRes]
        .filter((item) => item.status === "rejected")
        .map((item) => item.reason?.response?.data?.message || item.reason?.message)
        .find(Boolean);
      if (firstError) setError(firstError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submitWork = async (homeworkId) => {
    const content = String(drafts[homeworkId] || "").trim();
    if (!content) {
      setError("Enter submission content before submitting.");
      return;
    }

    try {
      setError("");
      await submitHomeworkSubmission({ homeworkId, content });
      setDrafts((prev) => ({ ...prev, [homeworkId]: "" }));
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to submit homework");
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
  const attendanceHistory = overview?.attendanceHistory || [];

  return (
    <div className="portal-dashboard-page">
      {pdfPreview ? <PdfPreviewModal file={pdfPreview} onClose={() => setPdfPreview(null)} /> : null}
      <section className="portal-dashboard-hero">
        <div className="portal-dashboard-hero-copy">
          <div className="portal-surface-kicker">Angel Montessori School</div>
          <h2 className="portal-dashboard-title">Student Portal</h2>
          <p className="portal-dashboard-subtitle">
            Review your attendance, homework, report card, and class progress from one clear Angel Montessori student view.
          </p>
          {overview?.student ? (
            <p className="portal-dashboard-meta">
              Signed in as <strong>{overview.student.name}</strong> in <strong>{overview.student.className}</strong>.
            </p>
          ) : null}
        </div>
        <div className="portal-dashboard-actions">
          <select
            value={selectedPrintTermKey}
            onChange={(e) => setSelectedPrintTermKey(e.target.value)}
            disabled={!printTermOptions.length}
          >
            <option value="">Latest Available Report</option>
            {printTermOptions.map((item) => (
              <option key={`${item.session}-${item.term}`} value={`${item.session}__${item.term}`}>
                {item.term} - {item.session}
              </option>
            ))}
          </select>
          <button onClick={printResult} disabled={!overview?.student}>Print Student Report Card</button>
        </div>
      </section>

      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      {loading ? <p>Loading student records...</p> : null}

      {overview?.student ? (
        <div style={{ border: "1px solid #ccd8e8", borderRadius: 10, padding: 12, marginBottom: 12, background: "#fff" }}>
          <strong>{overview.student.name}</strong>
          <p style={{ margin: "6px 0 0" }}>Class: {overview.student.className}</p>
        </div>
      ) : null}

      <h3>Virtual Classroom</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, marginBottom: 12 }}>
        <div style={{ border: "1px solid #dde6f3", borderRadius: 8, padding: 10, background: "#fff" }}>
          Upcoming: <strong>{virtualSummary.upcoming || 0}</strong>
        </div>
        <div style={{ border: "1px solid #dde6f3", borderRadius: 8, padding: 10, background: "#fff" }}>
          Recordings Ready: <strong>{virtualSummary.recordings || 0}</strong>
        </div>
        <div style={{ border: "1px solid #dde6f3", borderRadius: 8, padding: 10, background: "#fff" }}>
          Active Alerts: <strong>{virtualSummary.alerts || 0}</strong>
        </div>
      </div>
      <div style={{ border: "1px solid #dde6f3", borderRadius: 10, padding: 12, background: "#fff", marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <strong>Live Classes and Recorded Lessons</strong>
            <p style={{ margin: "6px 0 0", color: "#475569" }}>
              Join scheduled sessions, check recording availability, and keep track of class alerts from your learning desk.
            </p>
          </div>
          <Link to="/student/lms/virtual-classes" style={{ textDecoration: "none", padding: "10px 14px", borderRadius: 10, background: "#163a70", color: "#fff", fontWeight: 700 }}>
            Open Virtual Classroom
          </Link>
        </div>

        <div style={{ marginTop: 12, padding: 10, borderRadius: 10, border: "1px solid #dbe4ef", background: "#f8fbff" }}>
          <strong>Today's Online Classes</strong>
          <p style={{ margin: "6px 0 0", color: "#475569" }}>
            {todaysVirtualClasses.length
              ? `${todaysVirtualClasses.length} online class${todaysVirtualClasses.length === 1 ? "" : "es"} appear on today's learning schedule.`
              : "No online classes are scheduled for today yet."}
          </p>
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {todaysVirtualClasses.map((row) => (
              <div key={row.id} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 10, background: "#fff" }}>
                <strong>{row.title}</strong>
                <p style={{ margin: "4px 0", color: "#334155" }}>{row.subjectName} | {row.className}</p>
                <p style={{ margin: "4px 0", color: "#475569" }}>{formatVirtualClassSchedule(row)} | {String(row.status || "scheduled").replace(/_/g, " ")}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          {upcomingVirtualClasses.map((row) => (
            <div key={row.id} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 10, background: "#f8fafc" }}>
              <strong>{row.title}</strong>
              <p style={{ margin: "4px 0", color: "#334155" }}>{row.subjectName} | {row.className}</p>
              <p style={{ margin: "4px 0", color: "#475569" }}>{formatVirtualClassSchedule(row)} | {String(row.status || "scheduled").replace(/_/g, " ")}</p>
            </div>
          ))}
          {upcomingVirtualClasses.length === 0 ? <p style={{ margin: 0, color: "#64748b" }}>No live or scheduled virtual classes are visible yet.</p> : null}
        </div>

        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          {virtualNotifications.slice(0, 4).map((notice) => (
            <div key={notice.id} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 10, background: "#f8fafc" }}>
              <strong>{notice.title}</strong>
              <p style={{ margin: "4px 0", color: "#334155" }}>{notice.message}</p>
              <p style={{ margin: "4px 0", color: "#64748b", fontSize: 13 }}>{new Date(notice.createdAt).toLocaleString("en-GB")}</p>
            </div>
          ))}
          {virtualNotifications.length === 0 ? <p style={{ margin: 0, color: "#64748b" }}>No current virtual classroom alerts.</p> : null}
        </div>
      </div>

      <h3>Latest Promotion Decision</h3>
      <div style={{ border: "1px solid #dde6f3", borderRadius: 8, padding: 10, background: "#fff", marginBottom: 12 }}>
        {latestPromotionDecision ? (
          <>
            <p style={{ margin: "4px 0" }}><strong>Status:</strong> {decisionLabel(latestPromotionDecision.decisionStatus || latestPromotionDecision.promotionStatus)}</p>
            <p style={{ margin: "4px 0" }}><strong>Session:</strong> {latestPromotionDecision.sessionName || latestPromotionDecision.sessionId || "-"}</p>
            <p style={{ margin: "4px 0" }}><strong>Next Class:</strong> {latestPromotionDecision.nextClassName || "-"}</p>
            <p style={{ margin: "4px 0" }}><strong>Reason:</strong> {latestPromotionDecision.overrideReason || latestPromotionDecision.decisionReason || "-"}</p>
          </>
        ) : (
          <p style={{ margin: 0, color: "#475569" }}>No finalized promotion decision yet.</p>
        )}
      </div>

      <h3>Attendance Snapshot</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, marginBottom: 12 }}>
        <div style={{ border: "1px solid #dde6f3", borderRadius: 8, padding: 10, background: "#fff" }}>
          Present: <strong>{attendanceSummary.present || 0}</strong>
        </div>
        <div style={{ border: "1px solid #dde6f3", borderRadius: 8, padding: 10, background: "#fff" }}>
          Absent: <strong>{attendanceSummary.absent || 0}</strong>
        </div>
        <div style={{ border: "1px solid #dde6f3", borderRadius: 8, padding: 10, background: "#fff" }}>
          Late: <strong>{attendanceSummary.late || 0}</strong>
        </div>
        <div style={{ border: "1px solid #dde6f3", borderRadius: 8, padding: 10, background: "#fff" }}>
          Excused: <strong>{attendanceSummary.excused || 0}</strong>
        </div>
        <div style={{ border: "1px solid #dde6f3", borderRadius: 8, padding: 10, background: "#fff" }}>
          Attendance Rate: <strong>{attendanceSummary.attendanceRate || 0}%</strong>
        </div>
      </div>

      <h3>Attendance Log</h3>
      <div style={{ overflowX: "auto", marginBottom: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid #ddd", padding: 6 }}>Date</th>
              <th style={{ border: "1px solid #ddd", padding: 6 }}>Status</th>
              <th style={{ border: "1px solid #ddd", padding: 6 }}>Remark</th>
              <th style={{ border: "1px solid #ddd", padding: 6 }}>Reason</th>
            </tr>
          </thead>
          <tbody>
            {attendanceHistory.map((row, index) => (
              <tr key={`${row.attendanceDate}-${row.status}-${index}`}>
                <td style={{ border: "1px solid #ddd", padding: 6 }}>{row.attendanceDate}</td>
                <td style={{ border: "1px solid #ddd", padding: 6, textTransform: "capitalize" }}>{row.status}</td>
                <td style={{ border: "1px solid #ddd", padding: 6 }}>{row.remark || "-"}</td>
                <td style={{ border: "1px solid #ddd", padding: 6 }}>{row.reason || "-"}</td>
              </tr>
            ))}
            {attendanceHistory.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ border: "1px solid #ddd", padding: 8, textAlign: "center", color: "#666" }}>
                  No attendance records yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <h3>Term Performance</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginBottom: 12 }}>
        {(overview?.summaries || []).map((item) => (
          <div key={`${item.session}-${item.term}`} style={{ border: "1px solid #dde6f3", borderRadius: 8, padding: 10, background: "#fff" }}>
            <strong>{item.term}</strong>
            <p style={{ margin: "6px 0" }}>{item.session}</p>
            <p style={{ margin: 0 }}>Average: <strong>{item.average}</strong></p>
          </div>
        ))}
      </div>

      <h3>Recent Results</h3>
      <div style={{ overflowX: "auto", marginBottom: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid #ddd", padding: 6 }}>Session</th>
              <th style={{ border: "1px solid #ddd", padding: 6 }}>Term</th>
              <th style={{ border: "1px solid #ddd", padding: 6 }}>Subject</th>
              <th style={{ border: "1px solid #ddd", padding: 6 }}>Score</th>
            </tr>
          </thead>
          <tbody>
            {(overview?.recentResults || []).slice(0, 20).map((row, index) => (
              <tr key={row.id || [row.session, row.term, row.subject, index].join("-")}>
                <td style={{ border: "1px solid #ddd", padding: 6 }}>{row.session}</td>
                <td style={{ border: "1px solid #ddd", padding: 6 }}>{row.term}</td>
                <td style={{ border: "1px solid #ddd", padding: 6 }}>{row.subject}</td>
                <td style={{ border: "1px solid #ddd", padding: 6, textAlign: "center" }}>{row.score}</td>
              </tr>
            ))}
            {(overview?.recentResults || []).length === 0 ? (
              <tr>
                <td colSpan={4} style={{ border: "1px solid #ddd", padding: 8, textAlign: "center", color: "#666" }}>
                  No results have been uploaded yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <h3>Homework and Assignments</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, marginBottom: 12 }}>
        <div style={{ border: "1px solid #dde6f3", borderRadius: 8, padding: 10, background: "#fff" }}>
          Pending: <strong>{overview?.homeworkSummary?.pendingTasks || 0}</strong>
        </div>
        <div style={{ border: "1px solid #dde6f3", borderRadius: 8, padding: 10, background: "#fff" }}>
          Due Today: <strong>{overview?.homeworkSummary?.dueToday || 0}</strong>
        </div>
        <div style={{ border: "1px solid #dde6f3", borderRadius: 8, padding: 10, background: "#fff" }}>
          Due This Week: <strong>{overview?.homeworkSummary?.dueThisWeek || 0}</strong>
        </div>
        <div style={{ border: "1px solid #dde6f3", borderRadius: 8, padding: 10, background: "#fff" }}>
          Overdue: <strong>{overview?.homeworkSummary?.overdue || 0}</strong>
        </div>
        <div style={{ border: "1px solid #dde6f3", borderRadius: 8, padding: 10, background: "#fff" }}>
          Graded: <strong>{overview?.homeworkSummary?.graded || 0}</strong>
        </div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {(overview?.homework || []).map((hw) => {
          const submission = hw.submission || submissionByHomeworkId.get(String(hw.id));
          return (
            <div key={hw.id} style={{ border: "1px solid #dde6f3", borderRadius: 10, padding: 12, background: "#fff" }}>
              <strong>{hw.title}</strong>
              <p style={{ margin: "6px 0" }}>{hw.subject} | {hw.type || hw.taskType}</p>
              <p style={{ margin: "6px 0", color: "#475569" }}>
                Status: <strong>{hw.submissionStatus || submission?.status || "not_submitted"}</strong>
                {hw.timelinessStatus ? ` | Timeliness: ${hw.timelinessStatus}` : ""}
                {hw.dueDate ? ` | Due: ${new Date(hw.dueDate).toLocaleString()}` : ""}
              </p>

              {submission ? (
                <p style={{ margin: "6px 0", color: "#245b2a" }}>
                  {submission.score !== null ? `Score: ${submission.score}` : "Awaiting grade"}
                  {submission.feedback ? ` | Feedback: ${submission.feedback}` : ""}
                </p>
              ) : null}

              {submission?.filePath ? (<HomeworkAttachmentPreview submission={submission} onPreviewPdf={setPdfPreview} />) : null}

              <textarea
                rows={3}
                value={drafts[hw.id] || ""}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [hw.id]: e.target.value }))}
                placeholder="Write your answer or short submission note here"
                style={{ width: "100%" }}
              />
              <button onClick={() => submitWork(hw.id)} style={{ marginTop: 8 }}>
                {submission ? "Resubmit" : "Submit"}
              </button>
            </div>
          );
        })}
        {(overview?.homework || []).length === 0 ? <p>No homework or assignments have been posted yet.</p> : null}
      </div>
    </div>
  );
}















