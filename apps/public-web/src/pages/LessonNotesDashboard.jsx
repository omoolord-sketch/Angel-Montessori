import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  createLessonNote,
  exportLessonNote,
  exportLessonNotePdf,
  getLessonNoteByWeek,
  getLessonNoteReviews,
  getLessonNotes,
  getLessonNotesDashboard,
  getLessonNotesSetup,
  reviewLessonNote,
  submitLessonNoteForReview,
  updateLessonNote,
} from "../api/services";
import { useAuth } from "../auth/AuthContext";
import DomainAwareLink from "../components/DomainAwareLink";

const REVIEW_ROLES = ["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER"];

const ADMIN_TABS = [
  { key: "overview", label: "Dashboard", to: "/dashboard/lesson-notes" },
  { key: "notes", label: "Lesson Notes", to: "/admin/lesson-notes/notes" },
  { key: "reviews", label: "Reviews", to: "/admin/lesson-notes/reviews" },
  { key: "export", label: "Export", to: "/admin/lesson-notes/export" },
];

const TEACHER_TABS = [
  { key: "overview", label: "My Notes", to: "/teacher/lesson-notes" },
  { key: "notes", label: "Lesson Notes", to: "/teacher/lesson-notes/notes" },
  { key: "reviews", label: "Review Status", to: "/teacher/lesson-notes/reviews" },
  { key: "export", label: "Export", to: "/teacher/lesson-notes/export" },
];

const emptyNoteForm = {
  schemeWeekId: "",
  title: "",
  topic: "",
  subTopic: "",
  learningObjectives: "",
  lessonIntroduction: "",
  presentationSteps: "",
  teachingAids: "",
  classActivities: "",
  assessment: "",
  assignment: "",
  references: "",
  reflectionNote: "",
  status: "draft",
};

function getTabFromPath(pathname) {
  if (pathname.includes("/notes")) return "notes";
  if (pathname.includes("/reviews")) return "reviews";
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

function formatStamp(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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

function buildFormFromSource(source = {}, weekId = "") {
  return {
    schemeWeekId: source.schemeWeekId || weekId || "",
    title: source.title || "",
    topic: source.topic || "",
    subTopic: source.subTopic || "",
    learningObjectives: source.learningObjectives || "",
    lessonIntroduction: source.lessonIntroduction || "",
    presentationSteps: source.presentationSteps || "",
    teachingAids: source.teachingAids || "",
    classActivities: source.classActivities || "",
    assessment: source.assessment || "",
    assignment: source.assignment || "",
    references: source.references || "",
    reflectionNote: source.reflectionNote || "",
    status: source.status || "draft",
  };
}

export default function LessonNotesDashboard() {
  const { user } = useAuth();
  const role = user?.role || "";
  const isTeacher = role === "TEACHER";
  const canReview = REVIEW_ROLES.includes(role);
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = useMemo(() => getTabFromPath(location.pathname), [location.pathname]);
  const tabLinks = isTeacher ? TEACHER_TABS : ADMIN_TABS;

  const [dashboard, setDashboard] = useState({
    totals: {},
    teacherCoverage: [],
    notesNeedingReview: [],
    weeksWithoutNotes: [],
    recentActivity: [],
  });
  const [setup, setSetup] = useState({ sessions: [], terms: [], weeks: [], statuses: { note: [], review: [] } });
  const [notes, setNotes] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [selectedSchemeSessionId, setSelectedSchemeSessionId] = useState("");
  const [selectedSchemeTermId, setSelectedSchemeTermId] = useState("");
  const [selectedWeekId, setSelectedWeekId] = useState("");
  const [selectedNoteId, setSelectedNoteId] = useState("");
  const [noteDetail, setNoteDetail] = useState(null);
  const [noteForm, setNoteForm] = useState(emptyNoteForm);
  const [reviewDraft, setReviewDraft] = useState({ reviewStatus: "approved", note: "" });
  const [loading, setLoading] = useState(true);
  const [noteLoading, setNoteLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const visibleTerms = useMemo(
    () =>
      selectedSchemeSessionId
        ? (setup.terms || []).filter((item) => String(item.schemeSessionId) === String(selectedSchemeSessionId))
        : setup.terms || [],
    [selectedSchemeSessionId, setup.terms]
  );

  const visibleWeeks = useMemo(
    () =>
      selectedSchemeTermId
        ? (setup.weeks || []).filter((item) => String(item.schemeTermId) === String(selectedSchemeTermId))
        : setup.weeks || [],
    [selectedSchemeTermId, setup.weeks]
  );

  const visibleNotes = useMemo(
    () => (selectedSchemeTermId ? notes.filter((item) => String(item.schemeTermId) === String(selectedSchemeTermId)) : notes),
    [notes, selectedSchemeTermId]
  );

  const selectedWeek = useMemo(
    () => (setup.weeks || []).find((item) => String(item.id) === String(selectedWeekId)) || null,
    [setup.weeks, selectedWeekId]
  );

  const selectedNoteSummary = useMemo(
    () =>
      visibleNotes.find((item) => String(item.id) === String(selectedNoteId)) ||
      visibleNotes.find((item) => String(item.schemeWeekId) === String(selectedWeekId)) ||
      null,
    [selectedNoteId, selectedWeekId, visibleNotes]
  );

  const visibleReviews = useMemo(() => {
    if (selectedNoteId) {
      return (noteDetail?.reviews || []).length
        ? noteDetail.reviews
        : reviews.filter((item) => String(item.lessonNoteId) === String(selectedNoteId));
    }
    return reviews.filter((item) =>
      selectedSchemeTermId ? visibleNotes.some((note) => String(note.id) === String(item.lessonNoteId)) : true
    );
  }, [noteDetail, reviews, selectedNoteId, selectedSchemeTermId, visibleNotes]);

  const noNotesMessage = isTeacher
    ? "Your assigned scheme weeks will appear here once the school schemes are created for your subjects."
    : "Lesson notes will appear once scheme weeks are available for the academic planning team.";

  const loadAll = async (preferredTermId = "", preferredWeekId = "") => {
    setLoading(true);
    setError("");
    try {
      const [dashboardRes, setupRes, notesRes, reviewsRes] = await Promise.all([
        getLessonNotesDashboard(),
        getLessonNotesSetup(),
        getLessonNotes({}),
        getLessonNoteReviews({}),
      ]);

      const nextDashboard = dashboardRes?.data || {
        totals: {},
        teacherCoverage: [],
        notesNeedingReview: [],
        weeksWithoutNotes: [],
        recentActivity: [],
      };
      const nextSetup = setupRes?.data?.setup || { sessions: [], terms: [], weeks: [], statuses: { note: [], review: [] } };
      const nextNotes = Array.isArray(notesRes?.data?.notes) ? notesRes.data.notes : [];
      const nextReviews = Array.isArray(reviewsRes?.data?.reviews) ? reviewsRes.data.reviews : [];

      const searchParams = new URLSearchParams(location.search);
      const searchTermId = searchParams.get("termId") || "";
      const searchWeekId = searchParams.get("weekId") || "";

      let fallbackTermId = preferredTermId || searchTermId || selectedSchemeTermId;
      if (!nextSetup.terms.some((item) => String(item.id) === String(fallbackTermId))) {
        fallbackTermId = nextSetup.activeSchemeTermId || nextSetup.terms[0]?.id || "";
      }

      let fallbackSessionId = selectedSchemeSessionId;
      const selectedTerm = nextSetup.terms.find((item) => String(item.id) === String(fallbackTermId)) || null;
      if (selectedTerm) fallbackSessionId = selectedTerm.schemeSessionId || fallbackSessionId;
      if (!nextSetup.sessions.some((item) => String(item.id) === String(fallbackSessionId))) {
        fallbackSessionId =
          nextSetup.terms.find((item) => String(item.id) === String(fallbackTermId))?.schemeSessionId ||
          nextSetup.activeSchemeSessionId ||
          nextSetup.sessions[0]?.id ||
          "";
      }

      const termWeeks = fallbackTermId
        ? nextSetup.weeks.filter((item) => String(item.schemeTermId) === String(fallbackTermId))
        : nextSetup.weeks;
      let fallbackWeekId = preferredWeekId || searchWeekId || selectedWeekId;
      if (!termWeeks.some((item) => String(item.id) === String(fallbackWeekId))) {
        fallbackWeekId =
          termWeeks[0]?.id ||
          nextNotes.find((item) => String(item.schemeTermId) === String(fallbackTermId))?.schemeWeekId ||
          "";
      }

      setDashboard(nextDashboard);
      setSetup(nextSetup);
      setNotes(nextNotes);
      setReviews(nextReviews);
      setSelectedSchemeSessionId(fallbackSessionId);
      setSelectedSchemeTermId(fallbackTermId);
      setSelectedWeekId(fallbackWeekId);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Lesson Notes data could not be loaded right now.");
    } finally {
      setLoading(false);
    }
  };

  const loadSelectedWeek = async (weekId) => {
    if (!weekId) {
      setSelectedNoteId("");
      setNoteDetail(null);
      setNoteForm(emptyNoteForm);
      return;
    }

    setNoteLoading(true);
    try {
      const response = await getLessonNoteByWeek(weekId);
      const note = response?.data?.note || null;
      const template = response?.data?.template || null;
      setSelectedNoteId(note?.id || "");
      setNoteDetail(note);
      setNoteForm(buildFormFromSource(note || template || { schemeWeekId: weekId }, weekId));
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "The selected scheme week could not be opened for lesson notes.");
      setSelectedNoteId("");
      setNoteDetail(null);
      setNoteForm({ ...emptyNoteForm, schemeWeekId: weekId });
    } finally {
      setNoteLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [location.search]);

  useEffect(() => {
    loadSelectedWeek(selectedWeekId);
  }, [selectedWeekId]);

  const handleSelectSession = (sessionId) => {
    setSelectedSchemeSessionId(sessionId);
    const nextTermId = (setup.terms || []).find((item) => String(item.schemeSessionId) === String(sessionId))?.id || "";
    setSelectedSchemeTermId(nextTermId);
    const nextWeekId = (setup.weeks || []).find((item) => String(item.schemeTermId) === String(nextTermId))?.id || "";
    setSelectedWeekId(nextWeekId);
  };

  const handleSelectTerm = (termId) => {
    setSelectedSchemeTermId(termId);
    const term = (setup.terms || []).find((item) => String(item.id) === String(termId)) || null;
    if (term?.schemeSessionId) setSelectedSchemeSessionId(term.schemeSessionId);
    const nextWeekId = (setup.weeks || []).find((item) => String(item.schemeTermId) === String(termId))?.id || "";
    setSelectedWeekId(nextWeekId);
  };

  const handleOpenNote = (note) => {
    if (!note) return;
    if (note.schemeSessionId) setSelectedSchemeSessionId(note.schemeSessionId);
    if (note.schemeTermId) setSelectedSchemeTermId(note.schemeTermId);
    if (note.schemeWeekId) setSelectedWeekId(note.schemeWeekId);
  };

  const handleNoteSubmit = async (event) => {
    event.preventDefault();
    if (!selectedWeekId) return;
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const payload = { ...noteForm, schemeWeekId: selectedWeekId };
      if (selectedNoteId) {
        await updateLessonNote(selectedNoteId, payload);
        setMessage("Lesson note updated.");
      } else {
        await createLessonNote(payload);
        setMessage("Lesson note created.");
      }
      await loadAll(selectedSchemeTermId, selectedWeekId);
      await loadSelectedWeek(selectedWeekId);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "The lesson note could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!selectedNoteId) return;
    try {
      setSaving(true);
      setError("");
      await submitLessonNoteForReview(selectedNoteId, { note: reviewDraft.note });
      setMessage("Lesson note submitted for review.");
      setReviewDraft((current) => ({ ...current, note: "" }));
      await loadAll(selectedSchemeTermId, selectedWeekId);
      await loadSelectedWeek(selectedWeekId);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "The lesson note could not be submitted for review.");
    } finally {
      setSaving(false);
    }
  };

  const handleReviewDecision = async (reviewStatus) => {
    if (!selectedNoteId || !canReview) return;
    try {
      setSaving(true);
      setError("");
      await reviewLessonNote(selectedNoteId, { reviewStatus, note: reviewDraft.note });
      setMessage(reviewStatus === "approved" ? "Lesson note approved." : "Lesson note returned to draft.");
      setReviewDraft({ reviewStatus: "approved", note: "" });
      await loadAll(selectedSchemeTermId, selectedWeekId);
      await loadSelectedWeek(selectedWeekId);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "The review decision could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (format) => {
    if (!selectedNoteId) return;
    try {
      setSaving(true);
      const response = format === "pdf" ? await exportLessonNotePdf(selectedNoteId) : await exportLessonNote(selectedNoteId);
      const suffix = format === "pdf" ? "pdf" : "html";
      const fileName = `${(selectedWeek?.className || noteDetail?.className || "lesson-note").replace(/\s+/g, "-")}-${(selectedWeek?.subjectName || noteDetail?.subjectName || "subject").replace(/\s+/g, "-")}-week-${noteDetail?.weekNumber || selectedWeek?.weekNumber || 0}-lesson-note.${suffix}`;
      saveBlob(response.data, fileName);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "The lesson note export could not be generated.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <div style={styles.eyebrow}>Angel Montessori School</div>
          <h1 style={styles.pageTitle}>{isTeacher ? "My Lesson Notes" : "Lesson Notes Desk"}</h1>
          <p style={styles.pageSubtitle}>
            Prepare, review, approve, and export structured lesson notes linked directly to weekly scheme coverage.
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
      {loading ? <div style={styles.loadingBox}>Loading lesson note data...</div> : null}

      {!loading ? (
        <>
          <div style={styles.filterRow}>
            <label style={styles.fieldLabel}>
              Scheme Session
              <select value={selectedSchemeSessionId} onChange={(event) => handleSelectSession(event.target.value)} style={styles.input}>
                <option value="">All visible sessions</option>
                {(setup.sessions || []).map((item) => (
                  <option key={item.id} value={item.id}>{item.sessionName}</option>
                ))}
              </select>
            </label>
            <label style={styles.fieldLabel}>
              Scheme Term
              <select value={selectedSchemeTermId} onChange={(event) => handleSelectTerm(event.target.value)} style={styles.input}>
                <option value="">Select a term scheme</option>
                {visibleTerms.map((item) => (
                  <option key={item.id} value={item.id}>{`${item.className} - ${item.subjectName} (${item.termName})`}</option>
                ))}
              </select>
            </label>
            <label style={styles.fieldLabel}>
              Scheme Week
              <select value={selectedWeekId} onChange={(event) => setSelectedWeekId(event.target.value)} style={styles.input}>
                <option value="">Select a week</option>
                {visibleWeeks.map((item) => (
                  <option key={item.id} value={item.id}>{`${item.className} - ${item.subjectName} | ${item.termName} | Week ${item.weekNumber}: ${item.topic}`}</option>
                ))}
              </select>
            </label>
          </div>

          <div style={styles.statsGrid}>
            <StatCard label="Lesson Notes" value={dashboard.totals?.notesCreated || 0} />
            <StatCard label="Pending Review" value={dashboard.totals?.pendingReview || 0} />
            <StatCard label="Approved Notes" value={dashboard.totals?.approvedNotes || 0} />
            <StatCard label="Weeks Covered" value={dashboard.totals?.weeksCovered || 0} />
            <StatCard label="Coverage" value={`${dashboard.totals?.coveragePercent || 0}%`} />
          </div>

          {activeTab === "overview" ? (
            <div style={styles.gridTwo}>
              <SectionCard title="Recent Activity">
                {(dashboard.recentActivity || []).length ? dashboard.recentActivity.map((item) => (
                  <div key={item.id} style={styles.listRow}>
                    <strong>{item.title}</strong>
                    <div style={styles.mutedText}>{item.summary}</div>
                    <div style={styles.mutedText}>{item.detail}</div>
                  </div>
                )) : <p style={styles.mutedText}>{noNotesMessage}</p>}
              </SectionCard>
              <SectionCard title={isTeacher ? "My Review Queue" : "Notes Needing Review"} aside={<span style={styles.badge}>{dashboard.totals?.pendingReview || 0}</span>}>
                {(dashboard.notesNeedingReview || []).length ? dashboard.notesNeedingReview.map((item) => (
                  <button key={item.id} type="button" style={styles.listButton} onClick={() => handleOpenNote(item)}>
                    <strong>{item.title}</strong>
                    <div style={styles.mutedText}>{`${item.className} - ${item.subjectName} | Week ${item.weekNumber}`}</div>
                    <div style={styles.mutedText}>{`${item.statusLabel} | ${item.termName}`}</div>
                  </button>
                )) : <p style={styles.mutedText}>There are no lesson notes waiting for review right now.</p>}
              </SectionCard>
              <SectionCard title={isTeacher ? "My Coverage" : "Teacher Coverage"}>
                {(dashboard.teacherCoverage || []).length ? dashboard.teacherCoverage.map((item) => (
                  <div key={item.teacherUserId || item.teacherName} style={styles.listRow}>
                    <strong>{item.teacherName}</strong>
                    <div style={styles.mutedText}>{item.notesCreated + " notes for " + item.weeksTotal + " weeks"}</div>
                    <div style={styles.mutedText}>{item.coveragePercent + "% coverage | " + item.pendingReview + " pending review"}</div>
                  </div>
                )) : <p style={styles.mutedText}>Coverage snapshots will appear after lesson notes start coming in.</p>}
              </SectionCard>
              <SectionCard title="Weeks Waiting For Notes">
                {(dashboard.weeksWithoutNotes || []).length ? dashboard.weeksWithoutNotes.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    style={styles.listButton}
                    onClick={() => {
                      setSelectedSchemeSessionId(item.schemeSessionId || selectedSchemeSessionId);
                      setSelectedSchemeTermId(item.schemeTermId || selectedSchemeTermId);
                      setSelectedWeekId(item.id);
                      navigate(isTeacher ? "/teacher/lesson-notes/notes" : "/admin/lesson-notes/notes");
                    }}
                  >
                    <strong>{`${item.className} - ${item.subjectName}`}</strong>
                    <div style={styles.mutedText}>{`${item.termName} | Week ${item.weekNumber}`}</div>
                    <div style={styles.mutedText}>{item.topic || item.title}</div>
                  </button>
                )) : <p style={styles.mutedText}>All visible scheme weeks currently have a linked lesson note.</p>}
              </SectionCard>
            </div>
          ) : null}

          {activeTab === "notes" ? (
            <div style={styles.gridTwo}>
              <SectionCard title="Selected Scheme Week" aside={noteLoading ? <span style={styles.badge}>Loading...</span> : selectedNoteSummary ? <span style={styles.badge}>{selectedNoteSummary.statusLabel}</span> : null}>
                {selectedWeek ? (
                  <div style={styles.summaryBox}>
                    <strong>{`${selectedWeek.className} - ${selectedWeek.subjectName}`}</strong>
                    <div style={styles.mutedText}>{`${selectedWeek.termName} | Week ${selectedWeek.weekNumber}`}</div>
                    <div style={styles.mutedText}>{selectedWeek.topic || selectedWeek.title}</div>
                    {selectedWeek.subTopic ? <div style={styles.mutedText}>{selectedWeek.subTopic}</div> : null}
                    <div style={styles.mutedText}>
                      {selectedWeek.lessonNoteStatusLabel ? `Lesson note status: ${selectedWeek.lessonNoteStatusLabel}` : "No lesson note has been created for this week yet."}
                    </div>
                    {selectedNoteSummary?.latestReviewAt ? <div style={styles.mutedText}>{`Latest review: ${formatStamp(selectedNoteSummary.latestReviewAt)}`}</div> : null}
                  </div>
                ) : <p style={styles.mutedText}>Select a scheme week to create or update its lesson note.</p>}
              </SectionCard>

              <SectionCard title={selectedNoteId ? "Edit Lesson Note" : "Create Lesson Note"}>
                <form onSubmit={handleNoteSubmit} style={styles.formGrid}>
                  <label style={styles.fieldLabel}>Title<input value={noteForm.title} onChange={(event) => setNoteForm({ ...noteForm, title: event.target.value })} style={styles.input} /></label>
                  <label style={styles.fieldLabel}>Topic<input value={noteForm.topic} onChange={(event) => setNoteForm({ ...noteForm, topic: event.target.value })} style={styles.input} /></label>
                  <label style={styles.fieldLabel}>Sub-topic<input value={noteForm.subTopic} onChange={(event) => setNoteForm({ ...noteForm, subTopic: event.target.value })} style={styles.input} /></label>
                  <label style={{ ...styles.fieldLabel, gridColumn: "1 / -1" }}>Learning Objectives<textarea value={noteForm.learningObjectives} onChange={(event) => setNoteForm({ ...noteForm, learningObjectives: event.target.value })} style={styles.textarea} rows={3} /></label>
                  <label style={{ ...styles.fieldLabel, gridColumn: "1 / -1" }}>Lesson Introduction<textarea value={noteForm.lessonIntroduction} onChange={(event) => setNoteForm({ ...noteForm, lessonIntroduction: event.target.value })} style={styles.textarea} rows={3} /></label>
                  <label style={{ ...styles.fieldLabel, gridColumn: "1 / -1" }}>Presentation Steps<textarea value={noteForm.presentationSteps} onChange={(event) => setNoteForm({ ...noteForm, presentationSteps: event.target.value })} style={styles.textarea} rows={4} /></label>
                  <label style={{ ...styles.fieldLabel, gridColumn: "1 / -1" }}>Teaching Aids<textarea value={noteForm.teachingAids} onChange={(event) => setNoteForm({ ...noteForm, teachingAids: event.target.value })} style={styles.textarea} rows={2} /></label>
                  <label style={{ ...styles.fieldLabel, gridColumn: "1 / -1" }}>Class Activities<textarea value={noteForm.classActivities} onChange={(event) => setNoteForm({ ...noteForm, classActivities: event.target.value })} style={styles.textarea} rows={3} /></label>
                  <label style={{ ...styles.fieldLabel, gridColumn: "1 / -1" }}>Assessment<textarea value={noteForm.assessment} onChange={(event) => setNoteForm({ ...noteForm, assessment: event.target.value })} style={styles.textarea} rows={2} /></label>
                  <label style={{ ...styles.fieldLabel, gridColumn: "1 / -1" }}>Assignment<textarea value={noteForm.assignment} onChange={(event) => setNoteForm({ ...noteForm, assignment: event.target.value })} style={styles.textarea} rows={2} /></label>
                  <label style={{ ...styles.fieldLabel, gridColumn: "1 / -1" }}>References<textarea value={noteForm.references} onChange={(event) => setNoteForm({ ...noteForm, references: event.target.value })} style={styles.textarea} rows={2} /></label>
                  <label style={{ ...styles.fieldLabel, gridColumn: "1 / -1" }}>Reflection Note<textarea value={noteForm.reflectionNote} onChange={(event) => setNoteForm({ ...noteForm, reflectionNote: event.target.value })} style={styles.textarea} rows={2} /></label>
                  <div style={styles.buttonRow}>
                    <button type="submit" style={styles.primaryButton} disabled={saving || !selectedWeekId}>{selectedNoteId ? "Update Lesson Note" : "Save Lesson Note"}</button>
                    <button
                      type="button"
                      style={styles.secondaryButton}
                      onClick={() => setNoteForm(buildFormFromSource(noteDetail || { schemeWeekId: selectedWeekId }, selectedWeekId))}
                      disabled={saving || !selectedWeekId}
                    >
                      Reset Form
                    </button>
                  </div>
                </form>
              </SectionCard>

              <SectionCard title={isTeacher ? "My Lesson Notes" : "Visible Lesson Notes"} aside={<span style={styles.badge}>{visibleNotes.length}</span>}>
                {visibleNotes.length ? visibleNotes.map((item) => (
                  <button key={item.id} type="button" style={styles.listButton} onClick={() => handleOpenNote(item)}>
                    <strong>{item.title}</strong>
                    <div style={styles.mutedText}>{`${item.className} - ${item.subjectName} | ${item.termName}`}</div>
                    <div style={styles.mutedText}>{`Week ${item.weekNumber} | ${item.statusLabel}`}</div>
                  </button>
                )) : <p style={styles.mutedText}>{noNotesMessage}</p>}
              </SectionCard>
            </div>
          ) : null}

          {activeTab === "reviews" ? (
            <div style={styles.gridTwo}>
              <SectionCard title={canReview ? "Review Decision" : "Review Status"}>
                {selectedNoteSummary ? (
                  <div style={styles.summaryBox}>
                    <strong>{selectedNoteSummary.title}</strong>
                    <div style={styles.mutedText}>{`${selectedNoteSummary.className} - ${selectedNoteSummary.subjectName} | Week ${selectedNoteSummary.weekNumber}`}</div>
                    <div style={styles.mutedText}>{`${selectedNoteSummary.statusLabel} | ${selectedNoteSummary.termName}`}</div>
                    <label style={{ ...styles.fieldLabel, marginTop: 6 }}>
                      Review Note
                      <textarea value={reviewDraft.note} onChange={(event) => setReviewDraft({ ...reviewDraft, note: event.target.value })} style={styles.textarea} rows={4} />
                    </label>
                    <div style={styles.buttonRow}>
                      <button type="button" style={styles.primaryButton} onClick={handleSubmitForReview} disabled={!selectedNoteId || saving}>Submit For Review</button>
                      {canReview ? <button type="button" style={styles.primaryButton} onClick={() => handleReviewDecision("approved")} disabled={!selectedNoteId || saving}>Approve</button> : null}
                      {canReview ? <button type="button" style={styles.secondaryButton} onClick={() => handleReviewDecision("rejected")} disabled={!selectedNoteId || saving}>Return To Draft</button> : null}
                    </div>
                  </div>
                ) : <p style={styles.mutedText}>Select a lesson note to submit it for review or record an approval decision.</p>}
              </SectionCard>
              <SectionCard title="Review History" aside={<span style={styles.badge}>{visibleReviews.length}</span>}>
                {visibleReviews.length ? visibleReviews.map((item) => (
                  <div key={item.id} style={styles.listRow}>
                    <strong>{item.lessonNoteTitle || "Lesson note review"}</strong>
                    <div style={styles.mutedText}>{`${item.className} - ${item.subjectName} | ${item.reviewStatusLabel}`}</div>
                    <div style={styles.mutedText}>{`${item.reviewerName || "School team"} | ${formatStamp(item.reviewedAt || item.createdAt)}`}</div>
                    <div style={styles.mutedText}>{item.note || "No review note added."}</div>
                  </div>
                )) : <p style={styles.mutedText}>Review history will appear here once notes move through the approval workflow.</p>}
              </SectionCard>
            </div>
          ) : null}

          {activeTab === "export" ? (
            <div style={styles.gridTwo}>
              <SectionCard title="Export Lesson Note">
                {selectedNoteSummary ? (
                  <div style={styles.summaryBox}>
                    <strong>{selectedNoteSummary.title}</strong>
                    <div style={styles.mutedText}>{`${selectedNoteSummary.className} - ${selectedNoteSummary.subjectName}`}</div>
                    <div style={styles.mutedText}>{`${selectedNoteSummary.termName} | Week ${selectedNoteSummary.weekNumber}`}</div>
                    <div style={styles.buttonRow}>
                      <button type="button" style={styles.primaryButton} onClick={() => handleExport("html")} disabled={saving}>Export HTML</button>
                      <button type="button" style={styles.secondaryButton} onClick={() => handleExport("pdf")} disabled={saving}>Export PDF</button>
                    </div>
                  </div>
                ) : <p style={styles.mutedText}>Select a lesson note to export it for printing or sharing.</p>}
              </SectionCard>
              <SectionCard title="Notes Ready For Export">
                {visibleNotes.length ? visibleNotes.map((item) => (
                  <button key={item.id} type="button" style={styles.listButton} onClick={() => handleOpenNote(item)}>
                    <strong>{item.title}</strong>
                    <div style={styles.mutedText}>{`${item.className} - ${item.subjectName} | ${item.statusLabel}`}</div>
                    <div style={styles.mutedText}>{`${item.termName} | Week ${item.weekNumber}`}</div>
                  </button>
                )) : <p style={styles.mutedText}>Export options will appear once lesson notes have been created.</p>}
              </SectionCard>
            </div>
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
  fieldLabel: { display: "grid", gap: 6, color: "#17355a", fontWeight: 700 },
  input: { minHeight: 42, borderRadius: 10, border: "1px solid #d7e3f2", padding: "10px 12px", background: "#fff" },
  textarea: { borderRadius: 10, border: "1px solid #d7e3f2", padding: "10px 12px", background: "#fff", resize: "vertical" },
  formGrid: { display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" },
  primaryButton: { padding: "10px 14px", borderRadius: 10, border: "1px solid #0b5faf", background: "#0b5faf", color: "#fff", fontWeight: 700, cursor: "pointer" },
  secondaryButton: { padding: "10px 14px", borderRadius: 10, border: "1px solid #d7e3f2", background: "#fff", color: "#17355a", fontWeight: 700, cursor: "pointer" },
  buttonRow: { display: "flex", gap: 10, flexWrap: "wrap" },
  listRow: { padding: 12, border: "1px solid #e1e8f2", borderRadius: 12, display: "grid", gap: 6, background: "#fbfdff" },
  listButton: { padding: 12, border: "1px solid #e1e8f2", borderRadius: 12, display: "grid", gap: 6, background: "#fbfdff", textAlign: "left", cursor: "pointer" },
  summaryBox: { display: "grid", gap: 8, padding: 14, borderRadius: 12, background: "#f8fbff", border: "1px solid #d7e3f2" },
  mutedText: { color: "#4a6283" },
  badge: { padding: "6px 10px", borderRadius: 999, background: "#edf5ff", color: "#0b5faf", fontWeight: 700 },
};

