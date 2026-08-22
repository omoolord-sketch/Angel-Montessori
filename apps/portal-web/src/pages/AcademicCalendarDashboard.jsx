import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  archiveAcademicCalendar,
  createAcademicCalendarEvent,
  createAcademicCalendarSession,
  createAcademicCalendarTerm,
  duplicateAcademicCalendarSession,
  deleteAcademicCalendarEvent,
  deleteAcademicCalendarTerm,
  exportAcademicCalendar,
  exportAcademicCalendarPdf,
  getAcademicCalendarDashboard,
  getAcademicCalendarEvents,
  getAcademicCalendarPreview,
  getAcademicCalendarSessions,
  getAcademicCalendarSetup,
  getAcademicCalendarTerms,
  publishAcademicCalendar,
  updateAcademicCalendarEvent,
  updateAcademicCalendarSession,
  updateAcademicCalendarTerm,
} from "../api/services";

const MANAGE_ROLES = ["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER"];
const PUBLISH_ROLES = ["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER"];

const TAB_LINKS = [
  { key: "overview", label: "Dashboard", to: "/dashboard/academic-calendar" },
  { key: "sessions", label: "Sessions", to: "/admin/academic-calendar/sessions" },
  { key: "terms", label: "Terms", to: "/admin/academic-calendar/terms" },
  { key: "events", label: "Events", to: "/admin/academic-calendar/events" },
  { key: "preview", label: "Preview", to: "/admin/academic-calendar/preview" },
  { key: "publish", label: "Publish Settings", to: "/admin/academic-calendar/publish" },
  { key: "archive", label: "Archive", to: "/admin/academic-calendar/archive" },
];

const emptySessionForm = {
  sessionName: "",
  title: "",
  description: "",
  status: "draft",
  additionalActivitiesText: "",
  importantNotesText: "",
};

const emptyTermForm = {
  calendarSessionId: "",
  termName: "",
  startDate: "",
  endDate: "",
  sortOrder: "",
};

const emptyEventForm = {
  calendarTermId: "",
  eventTitle: "",
  eventType: "general",
  startDate: "",
  endDate: "",
  description: "",
  isFeatured: false,
  sortOrder: "",
};

const emptyDuplicateForm = {
  sourceSessionId: "",
  sessionName: "",
  title: "",
  description: "",
};

function replaceSessionLabel(value, previousSessionName, nextSessionName) {
  const textValue = String(value || "");
  if (!textValue || !previousSessionName || !nextSessionName) return textValue;
  return textValue.split(previousSessionName).join(nextSessionName);
}

function suggestNextSessionName(sessionName) {
  const current = String(sessionName || "").trim();
  const match = current.match(/^(\d{4})\s*\/\s*(\d{4})$/);
  if (match) {
    return `${Number(match[1]) + 1}/${Number(match[2]) + 1}`;
  }
  return current ? `${current} Copy` : "";
}

function buildDuplicateDraft(session) {
  const nextSessionName = suggestNextSessionName(session?.sessionName);
  return {
    sourceSessionId: session?.id || "",
    sessionName: nextSessionName,
    title:
      replaceSessionLabel(session?.title, session?.sessionName, nextSessionName) ||
      (nextSessionName ? `${nextSessionName} Academic Calendar` : ""),
    description: replaceSessionLabel(session?.description, session?.sessionName, nextSessionName),
  };
}

function getTabFromPath(pathname) {
  if (pathname.includes("/sessions")) return "sessions";
  if (pathname.includes("/terms")) return "terms";
  if (pathname.includes("/events")) return "events";
  if (pathname.includes("/preview")) return "preview";
  if (pathname.includes("/publish")) return "publish";
  if (pathname.includes("/archive")) return "archive";
  return "overview";
}

function formatDate(value, options = { day: "numeric", month: "short", year: "numeric" }) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", options).format(date);
}

function formatDateRange(startDate, endDate) {
  if (!startDate && !endDate) return "Date to be confirmed";
  if (startDate === endDate || !endDate) {
    return formatDate(startDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }
  return `${formatDate(startDate, { day: "numeric", month: "long", year: "numeric" })} - ${formatDate(endDate, {
    day: "numeric",
    month: "long",
    year: "numeric",
  })}`;
}

function joinLines(value) {
  return Array.isArray(value) ? value.join("\n") : "";
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

function StatCard({ label, value, accent }) {
  return (
    <article style={{ ...styles.card, borderTop: `4px solid ${accent}` }}>
      <div style={styles.statLabel}>{label}</div>
      <div style={styles.statValue}>{value}</div>
    </article>
  );
}

function SectionCard({ title, children, aside }) {
  return (
    <section style={styles.sectionCard}>
      <div style={styles.sectionHeaderRow}>
        <div>
          <h3 style={styles.sectionTitle}>{title}</h3>
        </div>
        {aside ? <div>{aside}</div> : null}
      </div>
      {children}
    </section>
  );
}

export default function AcademicCalendarDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = useMemo(() => getTabFromPath(location.pathname), [location.pathname]);
  const canManage = MANAGE_ROLES.includes(user?.role);
  const canPublish = PUBLISH_ROLES.includes(user?.role);

  const [dashboard, setDashboard] = useState(null);
  const [setup, setSetup] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [terms, setTerms] = useState([]);
  const [events, setEvents] = useState([]);
  const [preview, setPreview] = useState(null);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedTermId, setSelectedTermId] = useState("");
  const [editingSessionId, setEditingSessionId] = useState("");
  const [editingTermId, setEditingTermId] = useState("");
  const [editingEventId, setEditingEventId] = useState("");
  const [sessionForm, setSessionForm] = useState(emptySessionForm);
  const [termForm, setTermForm] = useState(emptyTermForm);
  const [eventForm, setEventForm] = useState(emptyEventForm);
  const [duplicateForm, setDuplicateForm] = useState(emptyDuplicateForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const selectedTerm = useMemo(
    () => terms.find((item) => String(item.id) === String(selectedTermId)) || null,
    [terms, selectedTermId]
  );

  const filteredEvents = useMemo(() => {
    if (!selectedTermId) return events;
    return events.filter((item) => String(item.calendarTermId) === String(selectedTermId));
  }, [events, selectedTermId]);

  const archivedSessions = useMemo(() => sessions.filter((item) => item.status === "archived"), [sessions]);
  const publishableSessions = useMemo(() => sessions.filter((item) => item.status !== "archived"), [sessions]);
  const duplicateSourceSession = useMemo(
    () => sessions.find((item) => String(item.id) === String(duplicateForm.sourceSessionId)) || null,
    [sessions, duplicateForm.sourceSessionId]
  );

  const loadSummary = async (preferredSessionId = "", preferredTermId = "") => {
    setLoading(true);
    setError("");

    try {
      const [dashboardRes, setupRes, sessionsRes] = await Promise.all([
        getAcademicCalendarDashboard(),
        getAcademicCalendarSetup(),
        getAcademicCalendarSessions(),
      ]);

      const nextDashboard = dashboardRes?.data || null;
      const nextSetup = setupRes?.data?.setup || null;
      const nextSessions = Array.isArray(sessionsRes?.data?.sessions) ? sessionsRes.data.sessions : [];
      const chosenSessionId =
        preferredSessionId ||
        selectedSessionId ||
        nextSessions.find((item) => item.isPublished)?.id ||
        nextSessions[0]?.id ||
        "";

      setDashboard(nextDashboard);
      setSetup(nextSetup);
      setSessions(nextSessions);
      setSelectedSessionId(chosenSessionId);

      if (!chosenSessionId) {
        setTerms([]);
        setEvents([]);
        setPreview(null);
        setSelectedTermId("");
        setTermForm((current) => ({ ...current, calendarSessionId: "" }));
        setEventForm((current) => ({ ...current, calendarTermId: "" }));
        setLoading(false);
        return;
      }

      const [termsRes, eventsRes, previewRes] = await Promise.all([
        getAcademicCalendarTerms({ sessionId: chosenSessionId }),
        getAcademicCalendarEvents({ sessionId: chosenSessionId }),
        getAcademicCalendarPreview(chosenSessionId),
      ]);

      const nextTerms = Array.isArray(termsRes?.data?.terms) ? termsRes.data.terms : [];
      const chosenTermId =
        preferredTermId ||
        nextTerms.find((item) => String(item.id) === String(selectedTermId))?.id ||
        nextTerms[0]?.id ||
        "";

      setTerms(nextTerms);
      setEvents(Array.isArray(eventsRes?.data?.events) ? eventsRes.data.events : []);
      setPreview(previewRes?.data?.calendar || null);
      setSelectedTermId(chosenTermId);
      setTermForm((current) => ({ ...current, calendarSessionId: chosenSessionId }));
      setEventForm((current) => ({ ...current, calendarTermId: chosenTermId }));
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Academic calendar data could not be loaded right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);
  const handleSessionSelection = async (sessionId) => {
    setSelectedSessionId(sessionId);
    setSelectedTermId("");
    await loadSummary(sessionId, "");
  };

  const handleSessionSubmit = async (event) => {
    event.preventDefault();
    if (!canManage) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");
      const payload = { ...sessionForm };

      if (editingSessionId) {
        await updateAcademicCalendarSession(editingSessionId, payload);
        setMessage("Academic calendar session updated.");
      } else {
        await createAcademicCalendarSession(payload);
        setMessage("Academic calendar session created.");
      }

      setEditingSessionId("");
      setSessionForm(emptySessionForm);
      await loadSummary(selectedSessionId || "");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "The calendar session could not be saved.");
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
      const payload = {
        ...termForm,
        sortOrder: termForm.sortOrder ? Number(termForm.sortOrder) : undefined,
      };

      if (editingTermId) {
        await updateAcademicCalendarTerm(editingTermId, payload);
        setMessage("Calendar term updated.");
      } else {
        await createAcademicCalendarTerm(payload);
        setMessage("Calendar term created.");
      }

      setEditingTermId("");
      setTermForm((current) => ({ ...emptyTermForm, calendarSessionId: current.calendarSessionId || selectedSessionId }));
      await loadSummary(termForm.calendarSessionId || selectedSessionId, selectedTermId);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "The calendar term could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const handleEventSubmit = async (event) => {
    event.preventDefault();
    if (!canManage) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");
      const payload = {
        ...eventForm,
        sortOrder: eventForm.sortOrder ? Number(eventForm.sortOrder) : undefined,
      };

      if (editingEventId) {
        await updateAcademicCalendarEvent(editingEventId, payload);
        setMessage("Calendar event updated.");
      } else {
        await createAcademicCalendarEvent(payload);
        setMessage("Calendar event created.");
      }

      setEditingEventId("");
      setEventForm((current) => ({ ...emptyEventForm, calendarTermId: current.calendarTermId || selectedTermId }));
      await loadSummary(selectedSessionId, eventForm.calendarTermId || selectedTermId);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "The calendar event could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (sessionId) => {
    if (!canPublish) return;
    const item = sessions.find((row) => row.id === sessionId);
    const okay = window.confirm(`Publish ${item?.sessionName || "this calendar"} to the public website?`);
    if (!okay) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");
      await publishAcademicCalendar(sessionId);
      setMessage("Academic calendar published to the public website.");
      await loadSummary(sessionId);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "The academic calendar could not be published.");
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (sessionId) => {
    if (!canPublish) return;
    const item = sessions.find((row) => row.id === sessionId);
    const okay = window.confirm(`Archive ${item?.sessionName || "this calendar"}? It will no longer appear publicly.`);
    if (!okay) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");
      await archiveAcademicCalendar(sessionId);
      setMessage("Academic calendar archived.");
      await loadSummary(selectedSessionId === sessionId ? "" : selectedSessionId);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "The academic calendar could not be archived.");
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (sessionId) => {
    try {
      setSaving(true);
      setError("");
      const response = await exportAcademicCalendar(sessionId);
      const session = sessions.find((row) => row.id === sessionId);
      const filename = `${(session?.sessionName || "academic-calendar").replace(/[^0-9A-Za-z_-]+/g, "-")}-academic-calendar.html`;
      saveBlob(response.data, filename);
      setMessage("Academic calendar HTML export downloaded.");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "The academic calendar export could not be created.");
    } finally {
      setSaving(false);
    }
  };

  const handleExportPdf = async (sessionId) => {
    try {
      setSaving(true);
      setError("");
      const response = await exportAcademicCalendarPdf(sessionId);
      const session = sessions.find((row) => row.id === sessionId);
      const filename = `${(session?.sessionName || "academic-calendar").replace(/[^0-9A-Za-z_-]+/g, "-")}-academic-calendar.pdf`;
      saveBlob(response.data, filename);
      setMessage("Academic calendar PDF export downloaded.");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "The academic calendar PDF could not be created.");
    } finally {
      setSaving(false);
    }
  };

  const startEditSession = (session) => {
    setEditingSessionId(session.id);
    setSessionForm({
      sessionName: session.sessionName || "",
      title: session.title || "",
      description: session.description || "",
      status: session.status || "draft",
      additionalActivitiesText: joinLines(session.additionalActivities),
      importantNotesText: joinLines(session.importantNotes),
    });
    navigate("/admin/academic-calendar/sessions");
  };

  const prepareDuplicateSession = (session) => {
    setError("");
    setMessage("");
    setDuplicateForm(buildDuplicateDraft(session));
    navigate("/admin/academic-calendar/sessions");
  };

  const handleDuplicateSourceSelection = (sourceSessionId) => {
    const source = sessions.find((item) => String(item.id) === String(sourceSessionId));
    setDuplicateForm(source ? buildDuplicateDraft(source) : emptyDuplicateForm);
  };

  const handleDuplicateSession = async (event) => {
    event.preventDefault();
    if (!canManage) return;

    const sourceSession = duplicateSourceSession || sessions.find((item) => String(item.id) === String(duplicateForm.sourceSessionId));
    if (!sourceSession) {
      setError("Choose the previous session you want to duplicate first.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");
      const response = await duplicateAcademicCalendarSession(sourceSession.id, {
        sessionName: duplicateForm.sessionName,
        title: duplicateForm.title,
        description: duplicateForm.description,
      });
      const nextSession = response?.data?.session || null;
      setDuplicateForm(emptyDuplicateForm);
      setEditingSessionId("");
      setSessionForm(emptySessionForm);
      setMessage(
        nextSession
          ? `Copied ${sourceSession.sessionName} into ${nextSession.sessionName} as a draft calendar.`
          : "Academic calendar duplicated."
      );
      await loadSummary(nextSession?.id || selectedSessionId || "");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "The academic calendar copy could not be created.");
    } finally {
      setSaving(false);
    }
  };

  const startEditTerm = (term) => {
    setEditingTermId(term.id);
    setSelectedSessionId(term.calendarSessionId);
    setSelectedTermId(term.id);
    setTermForm({
      calendarSessionId: term.calendarSessionId || "",
      termName: term.termName || "",
      startDate: term.startDate || "",
      endDate: term.endDate || "",
      sortOrder: term.sortOrder || "",
    });
    navigate("/admin/academic-calendar/terms");
  };

  const startEditEvent = (calendarEvent) => {
    setEditingEventId(calendarEvent.id);
    setSelectedTermId(calendarEvent.calendarTermId);
    setEventForm({
      calendarTermId: calendarEvent.calendarTermId || "",
      eventTitle: calendarEvent.eventTitle || "",
      eventType: calendarEvent.eventType || "general",
      startDate: calendarEvent.startDate || "",
      endDate: calendarEvent.endDate || "",
      description: calendarEvent.description || "",
      isFeatured: Boolean(calendarEvent.isFeatured),
      sortOrder: calendarEvent.sortOrder || "",
    });
    navigate("/admin/academic-calendar/events");
  };

  const handleDeleteTerm = async (termId) => {
    if (!canManage) return;
    const okay = window.confirm("Delete this term and all events under it?");
    if (!okay) return;

    try {
      setSaving(true);
      await deleteAcademicCalendarTerm(termId);
      setMessage("Calendar term deleted.");
      setEditingTermId("");
      setTermForm((current) => ({ ...emptyTermForm, calendarSessionId: current.calendarSessionId || selectedSessionId }));
      await loadSummary(selectedSessionId);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "The calendar term could not be deleted.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!canManage) return;
    const okay = window.confirm("Delete this calendar event?");
    if (!okay) return;

    try {
      setSaving(true);
      await deleteAcademicCalendarEvent(eventId);
      setMessage("Calendar event deleted.");
      setEditingEventId("");
      setEventForm((current) => ({ ...emptyEventForm, calendarTermId: current.calendarTermId || selectedTermId }));
      await loadSummary(selectedSessionId, selectedTermId);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "The calendar event could not be deleted.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.hero}>
          <div>
            <div style={styles.kicker}>Academic Calendar</div>
            <h1 style={styles.title}>Academic Calendar Management</h1>
            <p style={styles.subtitle}>
              Create academic sessions, add terms and events, preview the published calendar, and keep the public
              website aligned with one clean school-managed source of truth.
            </p>
          </div>
          <div style={styles.heroActions}>
            <Link to="/academics/calendar" style={styles.secondaryAction}>Public Academic Calendar</Link>
            <Link to="/information/calendar" style={styles.secondaryAction}>Information Calendar Page</Link>
          </div>
        </div>

        <div style={styles.tabRow}>
          {TAB_LINKS.map((tab) => (
            <Link
              key={tab.key}
              to={tab.to}
              style={tab.key === activeTab ? styles.activeTab : styles.tab}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {error ? <div style={styles.error}>{error}</div> : null}
        {message ? <div style={styles.message}>{message}</div> : null}
        {!canManage ? (
          <div style={styles.notice}>
            You currently have view access only. Teachers can review the calendar, but only admin or academic office
            accounts can create, edit, publish, or archive calendars.
          </div>
        ) : null}

        {loading ? (
          <section style={styles.sectionCard}>
            <p style={{ margin: 0 }}>Loading academic calendar desk...</p>
          </section>
        ) : null}

        {!loading && activeTab === "overview" ? (
          <>
            <div style={styles.statsGrid}>
              <StatCard label="Active Calendar" value={dashboard?.summary?.activeCalendar || "-"} accent="#0f6cbf" />
              <StatCard label="Published Terms" value={dashboard?.summary?.publishedTerms || 0} accent="#d59f22" />
              <StatCard label="Upcoming Events" value={dashboard?.summary?.upcomingEvents || 0} accent="#1c9256" />
              <StatCard label="Draft Calendars" value={dashboard?.summary?.draftCalendars || 0} accent="#7a4dd8" />
              <StatCard label="Archived Calendars" value={dashboard?.summary?.archivedCalendars || 0} accent="#5a6a7f" />
            </div>

            <div style={styles.quickActions}>
              {canManage ? (
                <>
                  <Link to="/admin/academic-calendar/sessions" style={styles.primaryAction}>Create Academic Session</Link>
                  <Link to="/admin/academic-calendar/terms" style={styles.secondaryAction}>Add Term</Link>
                  <Link to="/admin/academic-calendar/events" style={styles.secondaryAction}>Add Calendar Event</Link>
                </>
              ) : null}
              <Link to="/admin/academic-calendar/preview" style={styles.secondaryAction}>Preview Published Calendar</Link>
              {canPublish ? <Link to="/admin/academic-calendar/publish" style={styles.secondaryAction}>Publish Calendar</Link> : null}
            </div>

            <div style={styles.twoColumn}>
              <SectionCard title="Recent Calendars">
                <div style={styles.listWrap}>
                  {(dashboard?.recentCalendars || []).map((item) => (
                    <div key={item.id} style={styles.listItem}>
                      <div>
                        <strong>{item.sessionName}</strong>
                        <div style={styles.metaText}>{item.title}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={styles.statusPill(item.status)}>{item.status}</div>
                        <div style={styles.metaText}>{item.isPublished ? "Published" : "Internal"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Upcoming Events">
                <div style={styles.listWrap}>
                  {(dashboard?.upcomingEvents || []).map((item) => (
                    <div key={item.id} style={styles.listItem}>
                      <div>
                        <strong>{item.eventTitle}</strong>
                        <div style={styles.metaText}>{item.termName}</div>
                      </div>
                      <div style={styles.metaText}>{formatDateRange(item.startDate, item.endDate)}</div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          </>
        ) : null}

        {!loading && activeTab === "sessions" ? (
          <div style={styles.twoColumn}>
            <SectionCard title={editingSessionId ? "Edit Academic Session" : "Create Academic Session"}>
              <form onSubmit={handleSessionSubmit} style={styles.formGrid}>
                <label style={styles.field}>
                  <span>Session Name</span>
                  <input value={sessionForm.sessionName} onChange={(e) => setSessionForm((current) => ({ ...current, sessionName: e.target.value }))} disabled={!canManage || saving} placeholder="2026/2027" />
                </label>
                <label style={styles.field}>
                  <span>Title</span>
                  <input value={sessionForm.title} onChange={(e) => setSessionForm((current) => ({ ...current, title: e.target.value }))} disabled={!canManage || saving} placeholder="2026/2027 Academic Calendar" />
                </label>
                <label style={{ ...styles.field, gridColumn: "1 / -1" }}>
                  <span>Description</span>
                  <textarea rows={4} value={sessionForm.description} onChange={(e) => setSessionForm((current) => ({ ...current, description: e.target.value }))} disabled={!canManage || saving} />
                </label>
                <label style={styles.field}>
                  <span>Status</span>
                  <select value={sessionForm.status} onChange={(e) => setSessionForm((current) => ({ ...current, status: e.target.value }))} disabled={!canManage || saving}>
                    {(setup?.statuses || []).map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </label>
                <label style={{ ...styles.field, gridColumn: "1 / -1" }}>
                  <span>Additional School Activities</span>
                  <textarea rows={5} value={sessionForm.additionalActivitiesText} onChange={(e) => setSessionForm((current) => ({ ...current, additionalActivitiesText: e.target.value }))} disabled={!canManage || saving} placeholder="One activity per line" />
                </label>
                <label style={{ ...styles.field, gridColumn: "1 / -1" }}>
                  <span>Important Notes</span>
                  <textarea rows={4} value={sessionForm.importantNotesText} onChange={(e) => setSessionForm((current) => ({ ...current, importantNotesText: e.target.value }))} disabled={!canManage || saving} placeholder="One note per line" />
                </label>
                {canManage ? (
                  <div style={styles.formActions}>
                    <button type="submit" disabled={saving}>{editingSessionId ? "Update Session" : "Save Session"}</button>
                    <button type="button" onClick={() => { setEditingSessionId(""); setSessionForm(emptySessionForm); }} disabled={saving}>Clear</button>
                  </div>
                ) : null}
              </form>

              {canManage ? (
                <div style={styles.subSection}>
                  <div style={styles.kicker}>Duplicate Previous Session</div>
                  <p style={{ ...styles.metaText, marginTop: 0, marginBottom: 14, lineHeight: 1.6 }}>
                    Copy terms, events, additional activities, and important notes into a new draft session. This is the fastest way to prepare next year and then adjust only the dates that changed.
                  </p>
                  <form onSubmit={handleDuplicateSession} style={styles.formGrid}>
                    <label style={styles.field}>
                      <span>Source Session</span>
                      <select
                        value={duplicateForm.sourceSessionId}
                        onChange={(e) => handleDuplicateSourceSelection(e.target.value)}
                        disabled={!canManage || saving}
                      >
                        <option value="">Select session to duplicate</option>
                        {sessions.map((session) => (
                          <option key={session.id} value={session.id}>{session.sessionName}</option>
                        ))}
                      </select>
                    </label>
                    <label style={styles.field}>
                      <span>New Session Name</span>
                      <input
                        value={duplicateForm.sessionName}
                        onChange={(e) => setDuplicateForm((current) => ({ ...current, sessionName: e.target.value }))}
                        disabled={!canManage || saving}
                        placeholder="2026/2027"
                      />
                    </label>
                    <label style={styles.field}>
                      <span>New Title</span>
                      <input
                        value={duplicateForm.title}
                        onChange={(e) => setDuplicateForm((current) => ({ ...current, title: e.target.value }))}
                        disabled={!canManage || saving}
                        placeholder="2026/2027 Academic Calendar"
                      />
                    </label>
                    <label style={{ ...styles.field, gridColumn: "1 / -1" }}>
                      <span>Description</span>
                      <textarea
                        rows={3}
                        value={duplicateForm.description}
                        onChange={(e) => setDuplicateForm((current) => ({ ...current, description: e.target.value }))}
                        disabled={!canManage || saving}
                        placeholder="Optional"
                      />
                    </label>
                    <div style={styles.formActions}>
                      <button type="submit" disabled={saving || !duplicateForm.sourceSessionId}>Duplicate Session</button>
                      <button type="button" onClick={() => setDuplicateForm(emptyDuplicateForm)} disabled={saving}>Clear Copy Form</button>
                    </div>
                  </form>
                </div>
              ) : null}
            </SectionCard>

            <SectionCard title="Academic Calendar Sessions">
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th>Session</th>
                      <th>Status</th>
                      <th>Published</th>
                      <th>Terms</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((session) => (
                      <tr key={session.id}>
                        <td>
                          <strong>{session.sessionName}</strong>
                          <div style={styles.metaText}>{session.title}</div>
                        </td>
                        <td><span style={styles.statusPill(session.status)}>{session.status}</span></td>
                        <td>{session.isPublished ? "Yes" : "No"}</td>
                        <td>{session.termsCount}</td>
                        <td>
                          <div style={styles.inlineActions}>
                            {canManage ? <button type="button" onClick={() => startEditSession(session)}>Edit</button> : null}
                            {canManage ? <button type="button" onClick={() => prepareDuplicateSession(session)}>Duplicate</button> : null}
                            <button type="button" onClick={() => { handleSessionSelection(session.id); navigate("/admin/academic-calendar/preview"); }}>Preview</button>
                            {canPublish && session.status !== "archived" ? <button type="button" onClick={() => handlePublish(session.id)}>Publish</button> : null}
                            {canPublish && session.status !== "archived" ? <button type="button" onClick={() => handleArchive(session.id)}>Archive</button> : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>
        ) : null}

        {!loading && activeTab === "terms" ? (
          <div style={styles.twoColumn}>
            <SectionCard
              title={editingTermId ? "Edit Calendar Term" : "Add Calendar Term"}
              aside={(
                <select value={selectedSessionId} onChange={(e) => handleSessionSelection(e.target.value)} style={styles.filterSelect}>
                  {sessions.map((session) => (
                    <option key={session.id} value={session.id}>{session.sessionName}</option>
                  ))}
                </select>
              )}
            >
              <form onSubmit={handleTermSubmit} style={styles.formGrid}>
                <label style={styles.field}>
                  <span>Calendar Session</span>
                  <select value={termForm.calendarSessionId} onChange={(e) => setTermForm((current) => ({ ...current, calendarSessionId: e.target.value }))} disabled={!canManage || saving}>
                    <option value="">Select session</option>
                    {sessions.filter((item) => item.status !== "archived").map((session) => (
                      <option key={session.id} value={session.id}>{session.sessionName}</option>
                    ))}
                  </select>
                </label>
                <label style={styles.field}>
                  <span>Term Name</span>
                  <input value={termForm.termName} onChange={(e) => setTermForm((current) => ({ ...current, termName: e.target.value }))} disabled={!canManage || saving} placeholder="First Term" />
                </label>
                <label style={styles.field}>
                  <span>Start Date</span>
                  <input type="date" value={termForm.startDate} onChange={(e) => setTermForm((current) => ({ ...current, startDate: e.target.value }))} disabled={!canManage || saving} />
                </label>
                <label style={styles.field}>
                  <span>End Date</span>
                  <input type="date" value={termForm.endDate} onChange={(e) => setTermForm((current) => ({ ...current, endDate: e.target.value }))} disabled={!canManage || saving} />
                </label>
                <label style={styles.field}>
                  <span>Sort Order</span>
                  <input type="number" min="1" value={termForm.sortOrder} onChange={(e) => setTermForm((current) => ({ ...current, sortOrder: e.target.value }))} disabled={!canManage || saving} />
                </label>
                {canManage ? (
                  <div style={styles.formActions}>
                    <button type="submit" disabled={saving}>{editingTermId ? "Update Term" : "Save Term"}</button>
                    <button type="button" onClick={() => { setEditingTermId(""); setTermForm({ ...emptyTermForm, calendarSessionId: selectedSessionId }); }} disabled={saving}>Clear</button>
                  </div>
                ) : null}
              </form>
            </SectionCard>

            <SectionCard title="Terms for Selected Session">
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th>Term</th>
                      <th>Start</th>
                      <th>End</th>
                      <th>Order</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {terms.map((term) => (
                      <tr key={term.id}>
                        <td>
                          <strong>{term.termName}</strong>
                          <div style={styles.metaText}>{term.eventsCount} events</div>
                        </td>
                        <td>{formatDate(term.startDate)}</td>
                        <td>{formatDate(term.endDate)}</td>
                        <td>{term.sortOrder}</td>
                        <td>
                          <div style={styles.inlineActions}>
                            {canManage ? <button type="button" onClick={() => startEditTerm(term)}>Edit</button> : null}
                            <button type="button" onClick={() => { setSelectedTermId(term.id); navigate("/admin/academic-calendar/events"); }}>Events</button>
                            {canManage ? <button type="button" onClick={() => handleDeleteTerm(term.id)}>Delete</button> : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>
        ) : null}

        {!loading && activeTab === "events" ? (
          <div style={styles.twoColumn}>
            <SectionCard
              title={editingEventId ? "Edit Calendar Event" : "Add Calendar Event"}
              aside={(
                <div style={styles.filterRow}>
                  <select value={selectedSessionId} onChange={(e) => handleSessionSelection(e.target.value)} style={styles.filterSelect}>
                    {sessions.map((session) => (
                      <option key={session.id} value={session.id}>{session.sessionName}</option>
                    ))}
                  </select>
                  <select value={selectedTermId} onChange={(e) => { setSelectedTermId(e.target.value); setEventForm((current) => ({ ...current, calendarTermId: e.target.value })); }} style={styles.filterSelect}>
                    <option value="">All terms</option>
                    {terms.map((term) => (
                      <option key={term.id} value={term.id}>{term.termName}</option>
                    ))}
                  </select>
                </div>
              )}
            >
              <form onSubmit={handleEventSubmit} style={styles.formGrid}>
                <label style={styles.field}>
                  <span>Term</span>
                  <select value={eventForm.calendarTermId} onChange={(e) => setEventForm((current) => ({ ...current, calendarTermId: e.target.value }))} disabled={!canManage || saving}>
                    <option value="">Select term</option>
                    {terms.map((term) => (
                      <option key={term.id} value={term.id}>{term.termName}</option>
                    ))}
                  </select>
                </label>
                <label style={styles.field}>
                  <span>Event Title</span>
                  <input value={eventForm.eventTitle} onChange={(e) => setEventForm((current) => ({ ...current, eventTitle: e.target.value }))} disabled={!canManage || saving} placeholder="Resumption" />
                </label>
                <label style={styles.field}>
                  <span>Event Type</span>
                  <select value={eventForm.eventType} onChange={(e) => setEventForm((current) => ({ ...current, eventType: e.target.value }))} disabled={!canManage || saving}>
                    {(setup?.eventTypes || []).map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </label>
                <label style={styles.field}>
                  <span>Start Date</span>
                  <input type="date" value={eventForm.startDate} onChange={(e) => setEventForm((current) => ({ ...current, startDate: e.target.value }))} disabled={!canManage || saving} />
                </label>
                <label style={styles.field}>
                  <span>End Date</span>
                  <input type="date" value={eventForm.endDate} onChange={(e) => setEventForm((current) => ({ ...current, endDate: e.target.value }))} disabled={!canManage || saving} />
                </label>
                <label style={styles.field}>
                  <span>Sort Order</span>
                  <input type="number" min="1" value={eventForm.sortOrder} onChange={(e) => setEventForm((current) => ({ ...current, sortOrder: e.target.value }))} disabled={!canManage || saving} />
                </label>
                <label style={{ ...styles.field, gridColumn: "1 / -1" }}>
                  <span>Description</span>
                  <textarea rows={4} value={eventForm.description} onChange={(e) => setEventForm((current) => ({ ...current, description: e.target.value }))} disabled={!canManage || saving} />
                </label>
                <label style={styles.checkboxField}>
                  <input type="checkbox" checked={eventForm.isFeatured} onChange={(e) => setEventForm((current) => ({ ...current, isFeatured: e.target.checked }))} disabled={!canManage || saving} />
                  <span>Featured event</span>
                </label>
                {canManage ? (
                  <div style={styles.formActions}>
                    <button type="submit" disabled={saving}>{editingEventId ? "Update Event" : "Save Event"}</button>
                    <button type="button" onClick={() => { setEditingEventId(""); setEventForm({ ...emptyEventForm, calendarTermId: selectedTermId }); }} disabled={saving}>Clear</button>
                  </div>
                ) : null}
              </form>
            </SectionCard>

            <SectionCard title={`Calendar Events${selectedTerm ? ` - ${selectedTerm.termName}` : ""}`}>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Type</th>
                      <th>Date</th>
                      <th>Featured</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.map((calendarEvent) => (
                      <tr key={calendarEvent.id}>
                        <td>
                          <strong>{calendarEvent.eventTitle}</strong>
                          <div style={styles.metaText}>{calendarEvent.termName}</div>
                        </td>
                        <td>{calendarEvent.eventTypeLabel}</td>
                        <td>{formatDateRange(calendarEvent.startDate, calendarEvent.endDate)}</td>
                        <td>{calendarEvent.isFeatured ? "Yes" : "No"}</td>
                        <td>
                          <div style={styles.inlineActions}>
                            {canManage ? <button type="button" onClick={() => startEditEvent(calendarEvent)}>Edit</button> : null}
                            {canManage ? <button type="button" onClick={() => handleDeleteEvent(calendarEvent.id)}>Delete</button> : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>
        ) : null}

        {!loading && activeTab === "preview" ? (
          <SectionCard
            title="Academic Calendar Preview"
            aside={(
              <div style={styles.filterRow}>
                <select value={selectedSessionId} onChange={(e) => handleSessionSelection(e.target.value)} style={styles.filterSelect}>
                  {sessions.map((session) => (
                    <option key={session.id} value={session.id}>{session.sessionName}</option>
                  ))}
                </select>
                <button type="button" onClick={() => handleExport(selectedSessionId)} disabled={!selectedSessionId || saving}>Export HTML</button>
                <button type="button" onClick={() => handleExportPdf(selectedSessionId)} disabled={!selectedSessionId || saving}>Export PDF</button>
                {canPublish ? <button type="button" onClick={() => handlePublish(selectedSessionId)} disabled={!selectedSessionId || saving}>Publish Calendar</button> : null}
              </div>
            )}
          >
            {preview ? (
              <div style={styles.previewWrap}>
                <div style={styles.previewHeader}>
                  <div style={styles.kicker}>Angel Montessori School</div>
                  <h2 style={{ margin: "6px 0 8px" }}>{preview.title}</h2>
                  <p style={{ margin: 0, color: "#526174", lineHeight: 1.7 }}>{preview.description}</p>
                </div>
                <div style={styles.previewGrid}>
                  {preview.terms.map((term) => (
                    <article key={term.id} style={styles.previewCard}>
                      <div style={styles.kicker}>{term.termName}</div>
                      <h3 style={{ margin: "6px 0 10px" }}>{term.termName}</h3>
                      <div style={styles.metaText}>{formatDate(term.startDate)} - {formatDate(term.endDate)}</div>
                      <ul style={styles.previewList}>
                        {term.events.map((calendarEvent) => (
                          <li key={calendarEvent.id}>
                            <strong>{calendarEvent.eventTitle}</strong>
                            <div style={styles.metaText}>{formatDateRange(calendarEvent.startDate, calendarEvent.endDate)}</div>
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
                {preview.additionalActivities?.length ? (
                  <article style={styles.previewNotesCard}>
                    <h3 style={{ marginTop: 0 }}>Additional School Activities</h3>
                    <ul style={styles.previewList}>
                      {preview.additionalActivities.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </article>
                ) : null}
                {preview.importantNotes?.length ? (
                  <article style={styles.previewNotesCard}>
                    <h3 style={{ marginTop: 0 }}>Important Notes</h3>
                    <ul style={styles.previewList}>
                      {preview.importantNotes.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </article>
                ) : null}
              </div>
            ) : (
              <p style={{ margin: 0 }}>Select a session to preview its public calendar layout.</p>
            )}
          </SectionCard>
        ) : null}

        {!loading && activeTab === "publish" ? (
          <SectionCard title="Publish Settings">
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Session</th>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Published</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {publishableSessions.map((session) => (
                    <tr key={session.id}>
                      <td>{session.sessionName}</td>
                      <td>{session.title}</td>
                      <td><span style={styles.statusPill(session.status)}>{session.status}</span></td>
                      <td>{session.isPublished ? `Yes (${formatDate(session.publishedAt)})` : "No"}</td>
                      <td>
                        {canPublish ? <button type="button" onClick={() => handlePublish(session.id)} disabled={saving}>Confirm Publish</button> : "View only"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        ) : null}

        {!loading && activeTab === "archive" ? (
          <SectionCard title="Archive">
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Session</th>
                    <th>Status</th>
                    <th>Archived</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr key={session.id}>
                      <td>
                        <strong>{session.sessionName}</strong>
                        <div style={styles.metaText}>{session.title}</div>
                      </td>
                      <td><span style={styles.statusPill(session.status)}>{session.status}</span></td>
                      <td>{session.archivedAt ? formatDate(session.archivedAt) : "-"}</td>
                      <td>
                        {session.status !== "archived" && canPublish ? (
                          <button type="button" onClick={() => handleArchive(session.id)} disabled={saving}>Confirm Archive</button>
                        ) : (
                          "Stored internally"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {archivedSessions.length ? (
              <div style={{ marginTop: 16 }}>
                <div style={styles.kicker}>Archive History</div>
                <p style={{ marginBottom: 8, color: "#526174" }}>
                  Archived calendars remain available internally for school records, planning history, and future reference.
                </p>
              </div>
            ) : null}
          </SectionCard>
        ) : null}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f4f7fb",
    padding: "24px 16px 48px",
  },
  container: {
    maxWidth: 1280,
    margin: "0 auto",
  },
  hero: {
    background: "linear-gradient(135deg, #112f57, #1e4e86)",
    borderRadius: 24,
    padding: 24,
    color: "#fff",
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
    marginBottom: 18,
  },
  kicker: {
    color: "#f0c455",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    fontWeight: 800,
  },
  title: {
    margin: "8px 0 10px",
    fontSize: "clamp(1.8rem, 3vw, 2.6rem)",
  },
  subtitle: {
    margin: 0,
    maxWidth: 760,
    lineHeight: 1.7,
    color: "#dce8f7",
  },
  heroActions: {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  tabRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 18,
  },
  tab: {
    padding: "11px 16px",
    borderRadius: 999,
    textDecoration: "none",
    background: "#ffffff",
    border: "1px solid #d6e1ee",
    color: "#1a355a",
    fontWeight: 700,
  },
  activeTab: {
    padding: "11px 16px",
    borderRadius: 999,
    textDecoration: "none",
    background: "#173a6a",
    border: "1px solid #173a6a",
    color: "#ffffff",
    fontWeight: 700,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 14,
    marginBottom: 18,
  },
  card: {
    background: "#ffffff",
    borderRadius: 18,
    border: "1px solid #dce5f0",
    padding: 18,
    boxShadow: "0 14px 34px rgba(22, 50, 88, 0.06)",
  },
  statLabel: {
    color: "#607086",
    fontSize: 13,
    marginBottom: 10,
    fontWeight: 700,
  },
  statValue: {
    color: "#15283f",
    fontSize: 28,
    fontWeight: 800,
  },
  quickActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 18,
  },
  primaryAction: {
    padding: "12px 16px",
    borderRadius: 12,
    background: "#173a6a",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 700,
  },
  secondaryAction: {
    padding: "12px 16px",
    borderRadius: 12,
    background: "#ffffff",
    color: "#173a6a",
    textDecoration: "none",
    fontWeight: 700,
    border: "1px solid #d6e1ee",
  },
  twoColumn: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
    gap: 18,
  },
  sectionCard: {
    background: "#ffffff",
    borderRadius: 20,
    border: "1px solid #dce5f0",
    padding: 20,
    boxShadow: "0 14px 34px rgba(22, 50, 88, 0.06)",
    marginBottom: 18,
  },
  sectionHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  sectionTitle: {
    margin: 0,
    color: "#173a6a",
  },
  listWrap: {
    display: "grid",
    gap: 12,
  },
  listItem: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    background: "#f8fbff",
    border: "1px solid #dce5f0",
  },
  metaText: {
    color: "#607086",
    fontSize: 13,
  },
  filterRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  filterSelect: {
    minWidth: 180,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 14,
  },
  field: {
    display: "grid",
    gap: 6,
  },
  checkboxField: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    gridColumn: "1 / -1",
  },
  formActions: {
    display: "flex",
    gap: 8,
    gridColumn: "1 / -1",
    flexWrap: "wrap",
  },
  subSection: {
    marginTop: 20,
    paddingTop: 18,
    borderTop: "1px solid #e1e8f1",
  },
  tableWrap: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  inlineActions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  statusPill: (status) => ({
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    textTransform: "capitalize",
    background:
      status === "published"
        ? "#def6e8"
        : status === "archived"
          ? "#edf1f6"
          : "#fff3d6",
    color:
      status === "published"
        ? "#11653a"
        : status === "archived"
          ? "#556679"
          : "#8d6300",
  }),
  previewWrap: {
    display: "grid",
    gap: 18,
  },
  previewHeader: {
    padding: 18,
    borderRadius: 18,
    background: "#f8fbff",
    border: "1px solid #dce5f0",
  },
  previewGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 16,
  },
  previewCard: {
    border: "1px solid #dce5f0",
    background: "#fbfdff",
    borderRadius: 18,
    padding: 18,
  },
  previewNotesCard: {
    border: "1px solid #dce5f0",
    background: "#fffdfa",
    borderRadius: 18,
    padding: 18,
  },
  previewList: {
    margin: "12px 0 0",
    paddingLeft: 20,
    display: "grid",
    gap: 10,
  },
  error: {
    background: "#fff2f0",
    color: "#a13328",
    border: "1px solid #efc5bf",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  message: {
    background: "#eef9f1",
    color: "#17623b",
    border: "1px solid #c6e7d0",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  notice: {
    background: "#f3f7ff",
    color: "#2b4f81",
    border: "1px solid #d0dff5",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
};


