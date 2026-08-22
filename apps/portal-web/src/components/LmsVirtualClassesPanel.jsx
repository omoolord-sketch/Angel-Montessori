import { useEffect, useMemo, useState } from "react";
import {
  createLmsVirtualClass,
  exportLmsVirtualClassJoins,
  getLmsVirtualClasses,
  getLmsVirtualClassJoins,
  getLmsVirtualClassReminderTargets,
  getLmsVirtualEmailProviderStatus,
  getLmsVirtualNotifications,
  joinLmsVirtualClass,
  sendLmsVirtualClassReminders,
  updateLmsVirtualClass,
} from "../api/services";
import { isTeacherRole } from "../utils/roleHelpers";
import { downloadVirtualClassTimetable } from "../utils/virtualClassTimetable";

const cardStyle = { border: "1px solid #dbe6f4", borderRadius: 12, padding: 12, background: "#fff" };
const gridStyle = { display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" };

function pretty(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatSchedule(row) {
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

function platformLabel(value) {
  const key = String(value || "other").toLowerCase();
  if (key === "google_meet") return "Google Meet";
  if (key === "zoom") return "Zoom";
  if (key === "microsoft_teams") return "Microsoft Teams";
  return pretty(key);
}

function statusBadge(status) {
  const key = String(status || "scheduled").toLowerCase();
  if (key === "live") return { background: "#dcfce7", color: "#166534" };
  if (key === "completed") return { background: "#dbeafe", color: "#1d4ed8" };
  if (key === "cancelled") return { background: "#fee2e2", color: "#b91c1c" };
  return { background: "#fef3c7", color: "#92400e" };
}

function severityBadge(severity) {
  const key = String(severity || "medium").toLowerCase();
  if (key === "high") return { background: "#fee2e2", color: "#b91c1c" };
  if (key === "low") return { background: "#dbeafe", color: "#1d4ed8" };
  return { background: "#fef3c7", color: "#92400e" };
}

function reminderWindowLabel(value) {
  const key = String(value || "").toLowerCase();
  if (key === "hour_before") return "1 hour reminder";
  if (key === "day_before") return "24 hour reminder";
  if (key === "manual") return "Manual reminder";
  return pretty(key);
}

function triggerBlobDownload(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 500);
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

export default function LmsVirtualClassesPanel({ role, classSubjects = [] }) {
  const canManage = role === "ADMIN" || isTeacherRole(role);
  const [rows, setRows] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [actionBusyId, setActionBusyId] = useState("");
  const [emailProviderStatus, setEmailProviderStatus] = useState(null);
  const [reminderTargetPreview, setReminderTargetPreview] = useState({});
  const [joinRegisters, setJoinRegisters] = useState({});
  const [drafts, setDrafts] = useState({});
  const [filters, setFilters] = useState({ className: "", termName: "" });
  const [form, setForm] = useState({
    classSubjectId: "",
    title: "",
    summary: "",
    platform: "google_meet",
    sessionDate: "",
    startTime: "",
    durationMinutes: "60",
    meetingLink: "",
    accessCode: "",
    recordingLink: "",
    status: "scheduled",
  });

  const loadRows = async () => {
    try {
      setLoading(true);
      setError("");
      const requests = [
        getLmsVirtualClasses(),
        getLmsVirtualNotifications(),
      ];
      if (canManage) requests.push(getLmsVirtualEmailProviderStatus());
      const [rowsRes, notificationsRes, providerStatusRes] = await Promise.allSettled(requests);

      if (rowsRes.status === "fulfilled") {
        const data = Array.isArray(rowsRes.value?.data) ? rowsRes.value.data : [];
        setRows(data);
        setDrafts((prev) => {
          const next = { ...prev };
          data.forEach((row) => {
            next[row.id] = next[row.id] || {
              status: row.status || "scheduled",
              recordingLink: row.recordingLink || "",
              meetingLink: row.meetingLink || "",
              accessCode: row.accessCode || "",
            };
          });
          return next;
        });
      } else {
        setRows([]);
      }

      if (notificationsRes.status === "fulfilled") {
        setNotifications(Array.isArray(notificationsRes.value?.data) ? notificationsRes.value.data : []);
      } else {
        setNotifications([]);
      }

      if (canManage) {
        if (providerStatusRes?.status === "fulfilled") {
          setEmailProviderStatus(providerStatusRes.value?.data || null);
        } else {
          setEmailProviderStatus(null);
        }
      }

      const firstError = [rowsRes, notificationsRes, providerStatusRes]
        .filter((item) => item && item.status === "rejected")
        .map((item) => item.reason?.response?.data?.message || item.reason?.message)
        .find(Boolean);
      if (firstError) setError(firstError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, []);

  const metrics = useMemo(
    () => ({
      upcoming: rows.filter((row) => String(row.status || "").toLowerCase() === "scheduled").length,
      live: rows.filter((row) => String(row.status || "").toLowerCase() === "live").length,
      completed: rows.filter((row) => String(row.status || "").toLowerCase() === "completed").length,
      recordings: rows.filter((row) => String(row.recordingLink || "").trim()).length,
      attendanceRate: rows.length
        ? Number(
            (
              rows.reduce((sum, row) => sum + Number(row.attendanceRate || 0), 0) /
              rows.length
            ).toFixed(2)
          )
        : 0,
    }),
    [rows]
  );

  const classOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => String(row.className || "").trim()).filter(Boolean))).sort(),
    [rows]
  );

  const termOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => String(row.termName || "").trim()).filter(Boolean))).sort(),
    [rows]
  );

  const filteredRows = useMemo(
    () => rows.filter((row) => {
      if (filters.className && String(row.className || "") !== filters.className) return false;
      if (filters.termName && String(row.termName || "") !== filters.termName) return false;
      return true;
    }),
    [filters.className, filters.termName, rows]
  );

  const todaysRows = useMemo(() => {
    const todayKey = schoolTodayKey();
    return rows
      .filter((row) => String(row.sessionDate || "") === todayKey)
      .filter((row) => ["scheduled", "live", "completed"].includes(String(row.status || "").toLowerCase()))
      .sort((a, b) => Number(a.startsAt || 0) - Number(b.startsAt || 0));
  }, [rows]);

  const createRow = async () => {
    if (!form.classSubjectId || !form.title.trim() || !form.sessionDate || !form.startTime || !form.meetingLink.trim()) return;
    try {
      setError("");
      await createLmsVirtualClass({
        ...form,
        title: form.title.trim(),
        summary: form.summary.trim(),
        meetingLink: form.meetingLink.trim(),
        accessCode: form.accessCode.trim(),
        recordingLink: form.recordingLink.trim(),
        durationMinutes: Number(form.durationMinutes || 60),
      });
      setForm({
        classSubjectId: form.classSubjectId,
        title: "",
        summary: "",
        platform: "google_meet",
        sessionDate: "",
        startTime: "",
        durationMinutes: "60",
        meetingLink: "",
        accessCode: "",
        recordingLink: "",
        status: "scheduled",
      });
      setMessage("Virtual class scheduled.");
      await loadRows();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to create virtual class");
    }
  };

  const saveDraft = async (id) => {
    try {
      setError("");
      await updateLmsVirtualClass(id, drafts[id] || {});
      setMessage("Virtual class updated.");
      await loadRows();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update virtual class");
    }
  };

  const openSession = async (row, accessMode) => {
    try {
      setError("");
      const res = await joinLmsVirtualClass(row.id, { accessMode });
      const url = String(res?.data?.accessUrl || "").trim();
      if (!url) {
        setError(accessMode === "recording" ? "Recording link is not available yet." : "Meeting link is not available.");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
      setMessage(accessMode === "recording" ? "Opening recorded lesson..." : "Opening live class...");
      await loadRows();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to open virtual classroom");
    }
  };

  const loadJoinRegister = async (id) => {
    try {
      setError("");
      const res = await getLmsVirtualClassJoins(id);
      setJoinRegisters((prev) => ({ ...prev, [id]: Array.isArray(res?.data) ? res.data : [] }));
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load join register");
    }
  };

  const sendReminders = async (row) => {
    try {
      setActionBusyId(`reminder-${row.id}`);
      setError("");
      const res = await sendLmsVirtualClassReminders(row.id, {});
      const smsSent = Number(res?.data?.smsSent || 0);
      const emailSent = Number(res?.data?.emailSent || 0);
      const emailLogged = Number(res?.data?.emailLogged || 0);
      setMessage(`Reminder update saved. SMS sent: ${smsSent}, Email sent: ${emailSent}, Email logged: ${emailLogged}.`);
      await loadRows();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to send class reminders");
    } finally {
      setActionBusyId("");
    }
  };

  const exportAttendance = async (row) => {
    try {
      setActionBusyId(`export-${row.id}`);
      setError("");
      const res = await exportLmsVirtualClassJoins(row.id);
      const blob = res?.data instanceof Blob ? res.data : new Blob([res?.data || ""], { type: "text/csv;charset=utf-8;" });
      const safeName = String(row.title || "virtual-class-attendance")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "virtual-class-attendance";
      triggerBlobDownload(blob, `${safeName}-attendance.csv`);
      setMessage("Attendance register downloaded.");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to export attendance register");
    } finally {
      setActionBusyId("");
    }
  };

  const previewReminderTargets = async (row) => {
    const key = String(row.id || "");
    if (!key) return;

    if (reminderTargetPreview[key]?.loaded) {
      setReminderTargetPreview((prev) => ({
        ...prev,
        [key]: { ...prev[key], open: !prev[key].open },
      }));
      return;
    }

    try {
      setActionBusyId(`preview-${key}`);
      setError("");
      const res = await getLmsVirtualClassReminderTargets(key);
      setReminderTargetPreview((prev) => ({
        ...prev,
        [key]: {
          loaded: true,
          open: true,
          data: res?.data || { summary: {}, students: [] },
        },
      }));
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load reminder recipient preview");
    } finally {
      setActionBusyId("");
    }
  };

  const downloadTimetable = () => {
    downloadVirtualClassTimetable({
      rows: filteredRows,
      title: "Virtual Class Timetable",
      schoolName: "Angel Montessori School",
      roleLabel: pretty(role),
      classLabel: filters.className || "All Visible Classes",
      termLabel: filters.termName || "All Terms",
      description: "This timetable is generated from the current virtual-class schedule in the Angel Montessori learning desk.",
      motto: "Honesty, Service and Honour",
      address: "152 Okedogbon Road, Owo, Ondo State, Nigeria",
    });
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Virtual Classroom Overview</h3>
        <div style={gridStyle}>
          {Object.entries(metrics).map(([key, value]) => (
            <div key={key} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, background: "#f8fafc" }}>
              <p style={{ margin: 0, color: "#475569" }}>{pretty(key)}</p>
              <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 700 }}>
                {key === "attendanceRate" ? `${value}%` : value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {canManage && emailProviderStatus ? (
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <h3 style={{ margin: 0 }}>Email Reminder Status</h3>
              <p style={{ margin: "6px 0 0", color: "#52607a" }}>
                Check whether virtual-class reminder emails are fully configured or still falling back to log-only mode.
              </p>
            </div>
            <span style={{ padding: "6px 10px", borderRadius: 999, fontWeight: 700, fontSize: 12, background: emailProviderStatus.providerConfigured ? "#dcfce7" : "#fef3c7", color: emailProviderStatus.providerConfigured ? "#166534" : "#92400e" }}>
              {emailProviderStatus.providerConfigured ? "Ready to send" : "Log only"}
            </span>
          </div>
          <div style={{ ...gridStyle, marginTop: 12 }}>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, background: "#f8fafc" }}>
              <p style={{ margin: 0, color: "#475569" }}>Provider</p>
              <p style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 700 }}>{pretty(emailProviderStatus.providerMode || "SIMULATED")}</p>
            </div>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, background: "#f8fafc" }}>
              <p style={{ margin: 0, color: "#475569" }}>From Address</p>
              <p style={{ margin: "4px 0 0", fontSize: 16, fontWeight: 700 }}>{emailProviderStatus.fromEmail || "Not set"}</p>
            </div>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, background: "#f8fafc" }}>
              <p style={{ margin: 0, color: "#475569" }}>Fallback</p>
              <p style={{ margin: "4px 0 0", fontSize: 16, fontWeight: 700 }}>{emailProviderStatus.fallbackToLogOnly ? "Enabled" : "Disabled"}</p>
            </div>
          </div>
          {!emailProviderStatus.providerConfigured ? (
            <p style={{ margin: "12px 0 0", color: "#7c2d12" }}>
              Missing config: {(emailProviderStatus.providerConfigIssues || []).join(", ") || "Provider credentials"}
            </p>
          ) : null}
        </div>
      ) : null}

      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Today's Online Classes</h3>
        <p style={{ margin: "6px 0 0", color: "#52607a" }}>
          {todaysRows.length
            ? `${todaysRows.length} session${todaysRows.length === 1 ? "" : "s"} appear on today's learning timetable.`
            : "There are no virtual classes on today's timetable yet."}
        </p>
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          {todaysRows.map((row) => (
            <div key={row.id} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, background: "#f8fafc" }}>
              <strong>{row.title}</strong>
              <p style={{ margin: "4px 0", color: "#334155" }}>{row.className} - {row.subjectName}</p>
              <p style={{ margin: "4px 0", color: "#475569" }}>{formatSchedule(row)} | {pretty(row.status)}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0 }}>Virtual Class Alerts</h3>
            <p style={{ margin: "6px 0 0", color: "#52607a" }}>
              Important updates for scheduled live lessons, timetable changes, and recordings.
            </p>
          </div>
          <button onClick={loadRows} disabled={loading}>{loading ? "Refreshing..." : "Refresh Alerts"}</button>
        </div>

        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          {notifications.slice(0, 6).map((notice) => (
            <div key={notice.id} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, background: "#f8fafc" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ padding: "4px 8px", borderRadius: 999, fontSize: 12, fontWeight: 700, ...severityBadge(notice.severity) }}>
                    {pretty(notice.severity)}
                  </span>
                  {notice.childName ? <strong>{notice.childName}</strong> : null}
                </div>
                <span style={{ color: "#64748b", fontSize: 13 }}>{new Date(notice.createdAt).toLocaleString("en-GB")}</span>
              </div>
              <div style={{ marginTop: 8, fontWeight: 700, color: "#163a70" }}>{notice.title}</div>
              <p style={{ margin: "6px 0", color: "#334155" }}>{notice.message}</p>
              {notice.virtualClassTitle ? (
                <p style={{ margin: "4px 0", color: "#64748b", fontSize: 13 }}>
                  {notice.virtualClassTitle}
                  {notice.className ? ` | ${notice.className}` : ""}
                  {notice.subjectName ? ` | ${notice.subjectName}` : ""}
                </p>
              ) : null}
            </div>
          ))}
          {notifications.length === 0 ? (
            <p style={{ margin: 0, color: "#64748b" }}>
              No active virtual class alerts right now.
            </p>
          ) : null}
        </div>
      </div>

      {canManage ? (
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Schedule Virtual Class</h3>
          <div style={gridStyle}>
            <select value={form.classSubjectId} onChange={(event) => setForm({ ...form, classSubjectId: event.target.value })}>
              <option value="">Select Class Subject</option>
              {classSubjects.map((row) => (
                <option key={row.id} value={row.id}>{row.className} - {row.subjectName}</option>
              ))}
            </select>
            <input placeholder="Class title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            <select value={form.platform} onChange={(event) => setForm({ ...form, platform: event.target.value })}>
              <option value="google_meet">Google Meet</option>
              <option value="zoom">Zoom</option>
              <option value="microsoft_teams">Microsoft Teams</option>
              <option value="other">Other</option>
            </select>
            <input type="date" value={form.sessionDate} onChange={(event) => setForm({ ...form, sessionDate: event.target.value })} />
            <input type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} />
            <input type="number" min="15" step="5" placeholder="Duration (mins)" value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: event.target.value })} />
            <input placeholder="Meeting link" value={form.meetingLink} onChange={(event) => setForm({ ...form, meetingLink: event.target.value })} />
            <input placeholder="Access code (optional)" value={form.accessCode} onChange={(event) => setForm({ ...form, accessCode: event.target.value })} />
            <input placeholder="Recording link (optional)" value={form.recordingLink} onChange={(event) => setForm({ ...form, recordingLink: event.target.value })} />
            <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
              <option value="scheduled">Scheduled</option>
              <option value="live">Live</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <textarea
            rows={3}
            style={{ width: "100%", marginTop: 8 }}
            placeholder="Class summary or learning focus"
            value={form.summary}
            onChange={(event) => setForm({ ...form, summary: event.target.value })}
          />
          <button style={{ marginTop: 8 }} onClick={createRow}>Create Virtual Class</button>
        </div>
      ) : null}

      {error ? <p style={{ margin: 0, color: "crimson" }}>{error}</p> : null}
      {message ? <p style={{ margin: 0, color: "#14532d" }}>{message}</p> : null}

      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          <div>
            <h3 style={{ margin: 0 }}>Timetable Filters</h3>
            <p style={{ margin: "6px 0 0", color: "#52607a" }}>
              Use these filters for the session list below and for the timetable download.
            </p>
          </div>
          <button onClick={downloadTimetable} disabled={!filteredRows.length}>Download Timetable</button>
        </div>
        <div style={{ ...gridStyle, marginTop: 12 }}>
          <select value={filters.className} onChange={(event) => setFilters((prev) => ({ ...prev, className: event.target.value }))}>
            <option value="">All Visible Classes</option>
            {classOptions.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={filters.termName} onChange={(event) => setFilters((prev) => ({ ...prev, termName: event.target.value }))}>
            <option value="">All Terms</option>
            {termOptions.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <button type="button" onClick={() => setFilters({ className: "", termName: "" })}>Clear Filters</button>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <h3 style={{ marginTop: 0, marginBottom: 0 }}>Virtual Class Sessions</h3>
          <button onClick={loadRows} disabled={loading}>{loading ? "Refreshing..." : "Refresh List"}</button>
        </div>

        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
          {filteredRows.length ? filteredRows.map((row) => (
            <div key={row.id} style={{ border: "1px solid #dbe6f4", borderRadius: 12, padding: 12, background: "#f8fbff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start", flexWrap: "wrap" }}>
                <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <strong>{row.title}</strong>
                    <span style={{ padding: "4px 8px", borderRadius: 999, fontSize: 12, fontWeight: 700, ...statusBadge(row.status) }}>{pretty(row.status)}</span>
                    <span style={{ padding: "4px 8px", borderRadius: 999, background: "#fff4cf", color: "#6b4d00", fontSize: 12, fontWeight: 700 }}>{platformLabel(row.platform)}</span>
                  </div>
                  <p style={{ margin: "6px 0", color: "#334155" }}>{row.className} - {row.subjectName}</p>
                  <p style={{ margin: "6px 0", color: "#475569" }}>{formatSchedule(row)} | {row.durationMinutes} mins</p>
                  <p style={{ margin: "6px 0", color: "#475569" }}>
                    Host: {row.hostTeacherName || "Teacher"} | Participants logged: {row.participantCount || 0}
                  </p>
                  <p style={{ margin: "6px 0", color: "#475569" }}>
                    Attendance: <strong>{row.attendedStudentCount || 0}</strong> / <strong>{row.expectedStudentCount || 0}</strong>
                    {` (${Number(row.attendanceRate || 0).toFixed(2)}%)`}
                  </p>
                  {row.reminderSummary?.lastReminderAt ? (
                    <p style={{ margin: "6px 0", color: "#475569", fontSize: 13 }}>
                      Reminder history: {row.reminderSummary.windowsSent?.map((item) => reminderWindowLabel(item)).join(", ") || "Recorded"}
                      {` | Last update: ${new Date(row.reminderSummary.lastReminderAt).toLocaleString("en-GB")}`}
                      {` | Email sent: ${Number(row.reminderSummary.emailSent || 0)}`}
                      {` | Email logged: ${Number(row.reminderSummary.emailLogged || 0)}`}
                    </p>
                  ) : null}
                  {row.summary ? <p style={{ margin: "6px 0", color: "#334155" }}>{row.summary}</p> : null}
                  {row.accessCode ? <p style={{ margin: "6px 0", color: "#475569" }}>Access code: {row.accessCode}</p> : null}
                </div>

                <div style={{ display: "grid", gap: 8, minWidth: 220 }}>
                  {(row.status === "scheduled" || row.status === "live") && row.meetingLink ? (
                    <button onClick={() => openSession(row, "live")}>{canManage ? "Open Live Room" : "Join Live Class"}</button>
                  ) : null}
                  {row.recordingLink ? (
                    <button onClick={() => openSession(row, "recording")}>Watch Recording</button>
                  ) : null}
                  {canManage ? (
                    <button type="button" onClick={() => loadJoinRegister(row.id)}>View Join Register</button>
                  ) : null}
                  {canManage ? (
                    <button type="button" onClick={() => exportAttendance(row)} disabled={actionBusyId === `export-${row.id}`}>
                      {actionBusyId === `export-${row.id}` ? "Preparing export..." : "Export Attendance CSV"}
                    </button>
                  ) : null}
                  {canManage ? (
                    <button type="button" onClick={() => previewReminderTargets(row)} disabled={actionBusyId === `preview-${row.id}`}>
                      {actionBusyId === `preview-${row.id}`
                        ? "Loading recipients..."
                        : reminderTargetPreview[row.id]?.open
                          ? "Hide Recipient Preview"
                          : "Preview Recipients"}
                    </button>
                  ) : null}
                  {canManage && row.status !== "cancelled" ? (
                    <button type="button" onClick={() => sendReminders(row)} disabled={actionBusyId === `reminder-${row.id}`}>
                      {actionBusyId === `reminder-${row.id}` ? "Sending reminders..." : "Send Reminders"}
                    </button>
                  ) : null}
                </div>
              </div>

              {canManage ? (
                <div style={{ ...gridStyle, marginTop: 10 }}>
                  <select value={drafts[row.id]?.status || row.status || "scheduled"} onChange={(event) => setDrafts((prev) => ({ ...prev, [row.id]: { ...prev[row.id], status: event.target.value } }))}>
                    <option value="scheduled">Scheduled</option>
                    <option value="live">Live</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <input
                    placeholder="Update meeting link"
                    value={drafts[row.id]?.meetingLink || ""}
                    onChange={(event) => setDrafts((prev) => ({ ...prev, [row.id]: { ...prev[row.id], meetingLink: event.target.value } }))}
                  />
                  <input
                    placeholder="Add recording link"
                    value={drafts[row.id]?.recordingLink || ""}
                    onChange={(event) => setDrafts((prev) => ({ ...prev, [row.id]: { ...prev[row.id], recordingLink: event.target.value } }))}
                  />
                  <input
                    placeholder="Access code"
                    value={drafts[row.id]?.accessCode || ""}
                    onChange={(event) => setDrafts((prev) => ({ ...prev, [row.id]: { ...prev[row.id], accessCode: event.target.value } }))}
                  />
                  <button onClick={() => saveDraft(row.id)}>Save Updates</button>
                </div>
              ) : null}

              {canManage && reminderTargetPreview[row.id]?.open ? (
                <div style={{ marginTop: 12, borderTop: "1px dashed #dbe6f4", paddingTop: 10 }}>
                  <strong>Reminder Recipient Preview</strong>
                  <p style={{ margin: "6px 0", color: "#475569" }}>
                    Students covered: <strong>{reminderTargetPreview[row.id]?.data?.summary?.studentsCovered || 0}</strong>
                    {` | Email recipients: ${reminderTargetPreview[row.id]?.data?.summary?.emailRecipients || 0}`}
                    {` | SMS recipients: ${reminderTargetPreview[row.id]?.data?.summary?.smsRecipients || 0}`}
                  </p>
                  <p style={{ margin: "6px 0", color: "#64748b", fontSize: 13 }}>
                    Email source order: {(reminderTargetPreview[row.id]?.data?.summary?.emailSourceOrder || []).join(" -> ")}
                  </p>
                  <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                    {(reminderTargetPreview[row.id]?.data?.students || []).map((student) => (
                      <div key={student.studentId} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 8, background: "#fff" }}>
                        <strong>{student.studentName}</strong>
                        <p style={{ margin: "4px 0", color: "#64748b" }}>{student.className || row.className}</p>
                        <p style={{ margin: "4px 0", color: "#334155" }}>
                          Emails: {student.emailRecipients?.length ? student.emailRecipients.map((item) => `${item.name} <${item.email}>`).join(" | ") : "No email found"}
                        </p>
                        <p style={{ margin: "4px 0", color: "#334155" }}>
                          SMS: {student.smsRecipients?.length ? student.smsRecipients.map((item) => `${item.name} (${item.phone})`).join(" | ") : "No phone found"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {canManage && joinRegisters[row.id]?.length ? (
                <div style={{ marginTop: 12, borderTop: "1px dashed #dbe6f4", paddingTop: 10 }}>
                  <strong>Join Register</strong>
                  <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
                    {joinRegisters[row.id].slice(0, 8).map((item) => (
                      <div key={item.id} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 8, background: "#fff" }}>
                        <span style={{ fontWeight: 700 }}>{item.userName || item.userId}</span>
                        <span style={{ color: "#64748b" }}> | {pretty(item.role)} | {pretty(item.accessMode)} | {new Date(item.joinedAt).toLocaleString("en-GB")}</span>
                        {item.representedStudentCount ? <span style={{ color: "#64748b" }}>{` | Students covered: ${item.representedStudentCount}`}</span> : null}
                        {item.representedStudentNames?.length ? <span style={{ color: "#64748b" }}>{` | ${item.representedStudentNames.join(", ")}`}</span> : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )) : (
            <p style={{ margin: 0, color: "#64748b" }}>
              No virtual classes match the current filter. {canManage ? "Adjust the filters or create the first live session above." : "Check back when your teacher schedules a live lesson."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

























