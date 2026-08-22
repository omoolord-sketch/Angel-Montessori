import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  addLmsLessonResource,
  addLmsQuizQuestions,
  answerLmsQuizAttempt,
  createLmsAnnouncement,
  createLmsAssignment,
  createLmsClassSubject,
  createLmsLesson,
  createLmsQuiz,
  createLmsSession,
  createLmsSubject,
  createLmsTerm,
  createLmsTopic,
  getLmsAnnouncements,
  getLmsAssignmentSubmissions,
  getLmsAssignments,
  getLmsDashboard,
  getLmsLessons,
  getLmsMetadata,
  getLmsQuizAttempts,
  getLmsQuizzes,
  getLmsReportsOverview,
  getLmsTopics,
  gradeLmsAssignmentSubmission,
  markLmsLessonProgress,
  seedLmsClassSubjects,
  startLmsQuiz,
  submitLmsAssignment,
  submitLmsQuizAttempt,
  updateLmsClassSubject,
  updateLmsLesson,
  updateLmsSession,
  updateLmsTerm,
} from "../api/services";
import { useAuth } from "../auth/AuthContext";
import LmsVirtualClassesPanel from "../components/LmsVirtualClassesPanel";
import { isTeacherRole } from "../utils/roleHelpers";

const card = { border: "1px solid #dbe6f4", borderRadius: 12, padding: 12, background: "#fff" };
const grid2 = { display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" };

const ADMIN_MODULES = ["overview", "setup", "classsubjects", "virtualclasses", "announcements", "reports"];
const ACADEMIC_OFFICER_MODULES = ["overview", "setup", "classsubjects", "reports"];
const TEACHER_MODULES = ["overview", "classsubjects", "virtualclasses", "topics", "assignments", "quizzes", "announcements", "reports"];
const STUDENT_MODULES = ["overview", "classsubjects", "virtualclasses", "lessons", "assignments", "quizzes", "progress", "announcements"];
const PARENT_MODULES = ["overview", "classsubjects", "virtualclasses", "assignments", "quizzes", "progress", "announcements"];
const MODULE_SEGMENT_MAP = {
  overview: "dashboard",
  setup: "setup",
  classsubjects: "class-subjects",
  virtualclasses: "virtual-classes",
  topics: "topics",
  lessons: "lessons",
  assignments: "assignments",
  quizzes: "quizzes",
  announcements: "announcements",
  reports: "reports",
  progress: "progress",
};

const SEGMENT_MODULE_MAP = {
  dashboard: "overview",
  overview: "overview",
  home: "overview",
  setup: "setup",
  "class-subjects": "classsubjects",
  "virtual-classes": "virtualclasses",
  "virtual-classroom": "virtualclasses",
  "my-subjects": "classsubjects",
  subjects: "classsubjects",
  topics: "topics",
  lessons: "lessons",
  assignments: "assignments",
  quizzes: "quizzes",
  announcements: "announcements",
  reports: "reports",
  progress: "progress",
  "child-progress": "progress",
};

function getLmsBaseByRole(role) {
  if (role === "ADMIN") return "/admin/lms";
  if (isTeacherRole(role)) return "/teacher/lms";
  if (role === "STUDENT") return "/student/lms";
  if (role === "PARENT") return "/parent/lms";
  return "/dashboard/lms";
}

function getModuleFromPathname(pathname) {
  const path = String(pathname || "");

  if (path === "/dashboard/lms") return "overview";
  const dashboardMatch = path.match(/^\/dashboard\/lms\/([^/?#]+)/i);
  if (dashboardMatch?.[1]) {
    return SEGMENT_MODULE_MAP[String(dashboardMatch[1]).toLowerCase()] || "overview";
  }

  const match = path.match(/\/(admin|teacher|student|parent)\/lms\/([^/?#]+)/i);
  const segment = String(match?.[2] || "dashboard").toLowerCase();
  return SEGMENT_MODULE_MAP[segment] || "overview";
}

function getLessonIdFromPathname(pathname) {
  const path = String(pathname || "");
  const match = path.match(/\/(dashboard|admin|teacher|student|parent)\/lms\/lessons\/([^/?#]+)/i);
  return String(match?.[2] || "");
}

function getAssignmentIdFromPathname(pathname) {
  const path = String(pathname || "");
  const match = path.match(/\/(dashboard|admin|teacher|student|parent)\/lms\/assignments\/([^/?#]+)/i);
  return String(match?.[2] || "");
}

function getQuizIdFromPathname(pathname) {
  const path = String(pathname || "");
  const match = path.match(/\/(dashboard|admin|teacher|student|parent)\/lms\/quizzes\/([^/?#]+)/i);
  return String(match?.[2] || "");
}

function pretty(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function parseQuestionBulk(text) {
  const lines = String(text || "").split("\n").map((x) => x.trim()).filter(Boolean);
  const rows = [];
  for (const line of lines) {
    const parts = line.split("||").map((x) => x.trim());
    if (parts.length < 6) continue;
    rows.push({
      questionText: parts[0],
      optionA: parts[1],
      optionB: parts[2],
      optionC: parts[3],
      optionD: parts[4],
      correctAnswer: parts[5] || "A",
      marks: Number(parts[6] || 1),
    });
  }
  return rows;
}

export default function LMSDashboard() {
  const { user } = useAuth();
  const role = user?.role || "";
  const isTeacher = isTeacherRole(role);
  const isAcademicOfficer = role === "ACADEMIC_OFFICER";
  const canManageTeachingModules = role === "ADMIN" || isAcademicOfficer || isTeacher;
  const location = useLocation();
  const navigate = useNavigate();

  const modules =
    role === "ADMIN"
      ? ADMIN_MODULES
      : isAcademicOfficer
        ? ACADEMIC_OFFICER_MODULES
      : isTeacher
        ? TEACHER_MODULES
        : role === "STUDENT"
          ? STUDENT_MODULES
          : role === "PARENT"
            ? PARENT_MODULES
            : [];

  const [activeModule, setActiveModule] = useState(modules[0] || "overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [metadata, setMetadata] = useState({
    classes: [],
    sessions: [],
    terms: [],
    subjects: [],
    classSubjects: [],
    teachers: [],
    students: [],
    children: [],
  });
  const [dashboard, setDashboard] = useState({ totals: {} });
  const [topics, setTopics] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [reports, setReports] = useState({ totals: {} });
  const [submissionsByAssignment, setSubmissionsByAssignment] = useState({});
  const [activeQuizState, setActiveQuizState] = useState(null);
  const [answerState, setAnswerState] = useState({});
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [selectedQuizId, setSelectedQuizId] = useState("");

  const [sessionForm, setSessionForm] = useState({ sessionName: "", isActive: false });
  const [termForm, setTermForm] = useState({ sessionId: "", termName: "", startDate: "", endDate: "", isActive: false });
  const [subjectForm, setSubjectForm] = useState({ subjectName: "", subjectCode: "", category: "general" });
  const [classSubjectForm, setClassSubjectForm] = useState({ classId: "", subjectId: "", teacherUserId: "", sessionId: "", termId: "", status: "ACTIVE" });

  const [topicForm, setTopicForm] = useState({ classSubjectId: "", topicTitle: "", topicDescription: "", weekNo: "" });
  const [lessonForm, setLessonForm] = useState({ classSubjectId: "", topicId: "", lessonTitle: "", lessonSummary: "", lessonNote: "", lessonDate: "", publishStatus: "PUBLISHED" });
  const [resourceForm, setResourceForm] = useState({ lessonId: "", resourceTitle: "", resourceType: "pdf", externalUrl: "", filePath: "" });

  const [assignmentForm, setAssignmentForm] = useState({ classSubjectId: "", topicId: "", title: "", instructions: "", dueDate: "", maxScore: "20", allowLateSubmission: false, status: "PUBLISHED" });
  const [studentSubmissionDrafts, setStudentSubmissionDrafts] = useState({});

  const [quizForm, setQuizForm] = useState({ classSubjectId: "", topicId: "", title: "", instructions: "", durationMinutes: "20", totalMarks: "20", attemptsAllowed: "1", status: "PUBLISHED", startAt: "", endAt: "" });
  const [quizQuestionForm, setQuizQuestionForm] = useState({ quizId: "", questionText: "", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: "A", marks: "1", bulk: "" });

  const [announcementForm, setAnnouncementForm] = useState({ title: "", message: "", targetType: "school", targetId: "", status: "PUBLISHED" });

  const classSubjects = useMemo(() => (Array.isArray(metadata.classSubjects) ? metadata.classSubjects : []), [metadata]);
  const classOptions = useMemo(() => (Array.isArray(metadata.classes) ? metadata.classes : []), [metadata]);
  const subjectOptions = useMemo(() => (Array.isArray(metadata.subjects) ? metadata.subjects : []), [metadata]);
  const sessionOptions = useMemo(() => (Array.isArray(metadata.sessions) ? metadata.sessions : []), [metadata]);
  const termOptions = useMemo(() => (Array.isArray(metadata.terms) ? metadata.terms : []), [metadata]);
  const teacherOptions = useMemo(() => (Array.isArray(metadata.teachers) ? metadata.teachers : []), [metadata]);
  const selectedLesson = useMemo(() => lessons.find((x) => String(x.id) === String(selectedLessonId)) || null, [lessons, selectedLessonId]);
  const selectedAssignment = useMemo(() => assignments.find((x) => String(x.id) === String(selectedAssignmentId)) || null, [assignments, selectedAssignmentId]);
  const selectedQuiz = useMemo(() => quizzes.find((x) => String(x.id) === String(selectedQuizId)) || null, [quizzes, selectedQuizId]);

  const loadAll = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        metaRes,
        dashRes,
        topicsRes,
        lessonsRes,
        assignmentsRes,
        quizzesRes,
        attemptsRes,
        announcementsRes,
        reportsRes,
      ] = await Promise.allSettled([
        getLmsMetadata(),
        getLmsDashboard(),
        getLmsTopics(),
        getLmsLessons(),
        getLmsAssignments(),
        getLmsQuizzes(),
        getLmsQuizAttempts(),
        getLmsAnnouncements(),
        getLmsReportsOverview(),
      ]);

      if (metaRes.status === "fulfilled") setMetadata(metaRes.value?.data || {});
      if (dashRes.status === "fulfilled") setDashboard(dashRes.value?.data || { totals: {} });
      if (topicsRes.status === "fulfilled") setTopics(Array.isArray(topicsRes.value?.data) ? topicsRes.value.data : []);
      if (lessonsRes.status === "fulfilled") setLessons(Array.isArray(lessonsRes.value?.data) ? lessonsRes.value.data : []);
      if (assignmentsRes.status === "fulfilled") setAssignments(Array.isArray(assignmentsRes.value?.data) ? assignmentsRes.value.data : []);
      if (quizzesRes.status === "fulfilled") setQuizzes(Array.isArray(quizzesRes.value?.data) ? quizzesRes.value.data : []);
      if (attemptsRes.status === "fulfilled") setAttempts(Array.isArray(attemptsRes.value?.data) ? attemptsRes.value.data : []);
      if (announcementsRes.status === "fulfilled") setAnnouncements(Array.isArray(announcementsRes.value?.data) ? announcementsRes.value.data : []);
      if (reportsRes.status === "fulfilled") setReports(reportsRes.value?.data || { totals: {} });

      const firstError = [metaRes, dashRes, topicsRes, lessonsRes, assignmentsRes, quizzesRes, attemptsRes, announcementsRes, reportsRes]
        .filter((x) => x.status === "rejected")
        .map((x) => x.reason?.response?.data?.message || x.reason?.message)
        .find(Boolean);
      if (firstError) setError(firstError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const pathModule = getModuleFromPathname(location.pathname);
    const next = modules.includes(pathModule) ? pathModule : (modules[0] || "overview");
    setActiveModule(next);
  }, [location.pathname, role]);

  useEffect(() => {
    const lessonIdFromPath = getLessonIdFromPathname(location.pathname);
    if (lessonIdFromPath) {
      setSelectedLessonId(lessonIdFromPath);
      if (modules.includes("lessons")) {
        setActiveModule("lessons");
        return;
      }
      if (modules.includes("topics")) {
        setActiveModule("topics");
        return;
      }
    }

    const assignmentIdFromPath = getAssignmentIdFromPathname(location.pathname);
    if (assignmentIdFromPath) {
      setSelectedAssignmentId(assignmentIdFromPath);
      if (modules.includes("assignments")) {
        setActiveModule("assignments");
      }
      return;
    }

    const quizIdFromPath = getQuizIdFromPathname(location.pathname);
    if (quizIdFromPath) {
      setSelectedQuizId(quizIdFromPath);
      if (modules.includes("quizzes")) {
        setActiveModule("quizzes");
      }
    }
  }, [location.pathname, role]);
  useEffect(() => {
    loadAll();
  }, []);

  const refreshWithMessage = async (msg) => {
    setMessage(msg);
    await loadAll();
  };
  const createSession = async () => {
    if (!sessionForm.sessionName.trim()) return;
    try {
      await createLmsSession({ ...sessionForm, sessionName: sessionForm.sessionName.trim() });
      setSessionForm({ sessionName: "", isActive: false });
      await refreshWithMessage("Session created.");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to create session");
    }
  };

  const createTerm = async () => {
    if (!termForm.sessionId || !termForm.termName.trim()) return;
    try {
      await createLmsTerm({ ...termForm, termName: termForm.termName.trim() });
      setTermForm((prev) => ({ ...prev, termName: "", startDate: "", endDate: "", isActive: false }));
      await refreshWithMessage("Term created.");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to create term");
    }
  };

  const createSubjectRow = async () => {
    if (!subjectForm.subjectName.trim()) return;
    try {
      await createLmsSubject({ ...subjectForm, subjectName: subjectForm.subjectName.trim() });
      setSubjectForm({ subjectName: "", subjectCode: "", category: "general" });
      await refreshWithMessage("Subject created.");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to create subject");
    }
  };

  const createClassSubjectRow = async () => {
    if (!classSubjectForm.classId || !classSubjectForm.subjectId) return;
    try {
      await createLmsClassSubject(classSubjectForm);
      setClassSubjectForm((prev) => ({ ...prev, subjectId: "", teacherUserId: "" }));
      await refreshWithMessage("Class subject mapping created.");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to create class-subject mapping");
    }
  };

  const activateSession = async (id) => {
    try {
      await updateLmsSession(id, { isActive: true });
      await refreshWithMessage("Session activated.");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to update session");
    }
  };

  const activateTerm = async (id) => {
    try {
      await updateLmsTerm(id, { isActive: true });
      await refreshWithMessage("Term activated.");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to update term");
    }
  };

  const assignTeacher = async (classSubjectId, teacherUserId) => {
    try {
      await updateLmsClassSubject(classSubjectId, { teacherUserId });
      await refreshWithMessage("Teacher assignment updated.");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to assign teacher");
    }
  };

  const seedMappings = async () => {
    try {
      await seedLmsClassSubjects({
        sessionId: classSubjectForm.sessionId || metadata.activeSessionId,
        termId: classSubjectForm.termId || metadata.activeTermId,
      });
      await refreshWithMessage("Class subject templates seeded.");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to seed class subjects");
    }
  };

  const createTopicRow = async () => {
    if (!topicForm.classSubjectId || !topicForm.topicTitle.trim()) return;
    try {
      await createLmsTopic({ ...topicForm, topicTitle: topicForm.topicTitle.trim(), weekNo: Number(topicForm.weekNo || 0) });
      setTopicForm((prev) => ({ ...prev, topicTitle: "", topicDescription: "", weekNo: "" }));
      await refreshWithMessage("Topic created.");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to create topic");
    }
  };

  const createLessonRow = async () => {
    if (!lessonForm.classSubjectId || !lessonForm.lessonTitle.trim()) return;
    try {
      await createLmsLesson({ ...lessonForm, lessonTitle: lessonForm.lessonTitle.trim() });
      setLessonForm((prev) => ({ ...prev, lessonTitle: "", lessonSummary: "", lessonNote: "" }));
      await refreshWithMessage("Lesson created.");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to create lesson");
    }
  };

  const publishLesson = async (lesson) => {
    try {
      await updateLmsLesson(lesson.id, { publishStatus: "PUBLISHED" });
      await refreshWithMessage("Lesson published.");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to publish lesson");
    }
  };

  const addResource = async () => {
    if (!resourceForm.lessonId || !resourceForm.resourceTitle.trim()) return;
    try {
      await addLmsLessonResource(resourceForm.lessonId, {
        resourceTitle: resourceForm.resourceTitle.trim(),
        resourceType: resourceForm.resourceType,
        externalUrl: resourceForm.externalUrl,
        filePath: resourceForm.filePath,
      });
      setResourceForm({ lessonId: "", resourceTitle: "", resourceType: "pdf", externalUrl: "", filePath: "" });
      await refreshWithMessage("Lesson resource added.");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to add lesson resource");
    }
  };

  const markProgress = async (lessonId, markCompleted) => {
    try {
      await markLmsLessonProgress(lessonId, { markViewed: true, markCompleted });
      await refreshWithMessage(markCompleted ? "Lesson marked as completed." : "Lesson marked as viewed.");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to update lesson progress");
    }
  };

  const openLessonRoute = (lessonId) => {
    const id = String(lessonId || "").trim();
    if (!id) return;
    const base = getLmsBaseByRole(role);
    setSelectedLessonId(id);
    if (modules.includes("lessons")) setActiveModule("lessons");
    else if (modules.includes("topics")) setActiveModule("topics");
    navigate(`${base}/lessons/${id}`);
  };

  const openAssignmentRoute = (assignmentId) => {
    const id = String(assignmentId || "").trim();
    if (!id) return;
    const base = getLmsBaseByRole(role);
    setSelectedAssignmentId(id);
    if (modules.includes("assignments")) setActiveModule("assignments");
    navigate(`${base}/assignments/${id}`);
  };

  const openQuizRoute = (quizId) => {
    const id = String(quizId || "").trim();
    if (!id) return;
    const base = getLmsBaseByRole(role);
    setSelectedQuizId(id);
    if (modules.includes("quizzes")) setActiveModule("quizzes");
    navigate(`${base}/quizzes/${id}`);
  };

  const createAssignmentRow = async () => {
    if (!assignmentForm.classSubjectId || !assignmentForm.title.trim()) return;
    try {
      await createLmsAssignment({
        ...assignmentForm,
        title: assignmentForm.title.trim(),
        maxScore: Number(assignmentForm.maxScore || 20),
      });
      setAssignmentForm((prev) => ({ ...prev, title: "", instructions: "", dueDate: "" }));
      await refreshWithMessage("Assignment created.");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to create assignment");
    }
  };

  const submitStudentAssignment = async (assignmentId) => {
    const submissionText = String(studentSubmissionDrafts[assignmentId] || "").trim();
    if (!submissionText) return;
    try {
      await submitLmsAssignment(assignmentId, { submissionText });
      setStudentSubmissionDrafts((prev) => ({ ...prev, [assignmentId]: "" }));
      await refreshWithMessage("Assignment submitted.");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to submit assignment");
    }
  };

  const loadSubmissions = async (assignmentId) => {
    try {
      const res = await getLmsAssignmentSubmissions(assignmentId);
      setSubmissionsByAssignment((prev) => ({ ...prev, [assignmentId]: Array.isArray(res.data) ? res.data : [] }));
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load submissions");
    }
  };

  const gradeSubmission = async (submissionId, score, feedback) => {
    try {
      await gradeLmsAssignmentSubmission(submissionId, { score, feedback, status: "GRADED" });
      await refreshWithMessage("Submission graded.");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to grade submission");
    }
  };

  const createQuizRow = async () => {
    if (!quizForm.classSubjectId || !quizForm.title.trim()) return;
    try {
      await createLmsQuiz({
        ...quizForm,
        title: quizForm.title.trim(),
        durationMinutes: Number(quizForm.durationMinutes || 20),
        totalMarks: Number(quizForm.totalMarks || 20),
        attemptsAllowed: Number(quizForm.attemptsAllowed || 1),
      });
      setQuizForm((prev) => ({ ...prev, title: "", instructions: "" }));
      await refreshWithMessage("Quiz created.");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to create quiz");
    }
  };

  const addQuizQuestion = async () => {
    if (!quizQuestionForm.quizId) return;
    try {
      if (quizQuestionForm.bulk.trim()) {
        const rows = parseQuestionBulk(quizQuestionForm.bulk);
        if (!rows.length) return;
        await addLmsQuizQuestions(quizQuestionForm.quizId, { rows });
      } else {
        await addLmsQuizQuestions(quizQuestionForm.quizId, {
          questionText: quizQuestionForm.questionText,
          optionA: quizQuestionForm.optionA,
          optionB: quizQuestionForm.optionB,
          optionC: quizQuestionForm.optionC,
          optionD: quizQuestionForm.optionD,
          correctAnswer: quizQuestionForm.correctAnswer,
          marks: Number(quizQuestionForm.marks || 1),
        });
      }
      setQuizQuestionForm((prev) => ({
        ...prev,
        questionText: "",
        optionA: "",
        optionB: "",
        optionC: "",
        optionD: "",
        correctAnswer: "A",
        marks: "1",
        bulk: "",
      }));
      await refreshWithMessage("Quiz questions uploaded.");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to upload quiz questions");
    }
  };

  const startQuizForStudent = async (quiz) => {
    try {
      const res = await startLmsQuiz(quiz.id);
      const payload = res.data || {};
      setActiveQuizState({
        quiz,
        attempt: payload.attempt,
        questions: Array.isArray(payload.questions) ? payload.questions : [],
      });
      setAnswerState({});
      setMessage(`Quiz started: ${quiz.title}`);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to start quiz");
    }
  };

  const answerQuestion = async (questionId, selectedOption) => {
    if (!activeQuizState?.attempt?.id) return;
    try {
      await answerLmsQuizAttempt(activeQuizState.attempt.id, { questionId, selectedOption });
      setAnswerState((prev) => ({ ...prev, [questionId]: selectedOption }));
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to save answer");
    }
  };

  const submitActiveQuiz = async () => {
    if (!activeQuizState?.attempt?.id) return;
    try {
      const res = await submitLmsQuizAttempt(activeQuizState.attempt.id);
      setMessage(`Quiz submitted. Score: ${res.data?.score}/${res.data?.totalMarks} (${res.data?.percentage}%)`);
      setActiveQuizState(null);
      setAnswerState({});
      await loadAll();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to submit quiz");
    }
  };

  const createAnnouncementRow = async () => {
    if (!announcementForm.title.trim() || !announcementForm.message.trim()) return;
    try {
      await createLmsAnnouncement({
        ...announcementForm,
        title: announcementForm.title.trim(),
        message: announcementForm.message.trim(),
      });
      setAnnouncementForm({ title: "", message: "", targetType: "school", targetId: "", status: "PUBLISHED" });
      await refreshWithMessage("Announcement posted.");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to create announcement");
    }
  };

  const renderOverview = () => (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={card}>
        <h3 style={{ marginTop: 0 }}>Learning Overview</h3>
        <div style={grid2}>
          {Object.entries(dashboard?.totals || {}).map(([k, v]) => (
            <div key={k} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, background: "#f8fafc" }}>
              <p style={{ margin: 0, color: "#475569" }}>{pretty(k)}</p>
              <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 700 }}>{v}</p>
            </div>
          ))}
        </div>
      </div>

      {role === "PARENT" ? (
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>Linked Children</h3>
          <div style={grid2}>
            {(dashboard?.children || []).map((row, index) => (
              <div key={`${row?.child?.id || index}`} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10 }}>
                <strong>{row?.child?.name || row?.name || "Child"}</strong>
                <p style={{ margin: "6px 0" }}>{row?.child?.className || row?.className || ""}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
  const renderSetup = () => {
    const activeScopeSession = sessionOptions.find((x) => x.isActive) || sessionOptions[0] || null;
    const activeScopeTerm =
      termOptions.find((x) => x.isActive && String(x.sessionId) === String(activeScopeSession?.id)) ||
      termOptions.find((x) => String(x.sessionId) === String(activeScopeSession?.id)) ||
      termOptions.find((x) => x.isActive) ||
      null;

    return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={card}>
        <h3 style={{ marginTop: 0 }}>School Academic Scope</h3>
        <div style={grid2}>
          <div style={{ border: "1px solid #dbe6f4", borderRadius: 10, padding: 12, background: "#f8fbff" }}>
            <p style={{ margin: 0, color: "#4d647f" }}>Active Session</p>
            <strong>{activeScopeSession?.sessionName || "Not set"}</strong>
          </div>
          <div style={{ border: "1px solid #dbe6f4", borderRadius: 10, padding: 12, background: "#f8fbff" }}>
            <p style={{ margin: 0, color: "#4d647f" }}>Active Term</p>
            <strong>{activeScopeTerm?.termName || "Not set"}</strong>
          </div>
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
          {(sessionOptions || []).map((x) => (
            <div key={x.id} style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed #dbe6f4", paddingTop: 6 }}>
              <span>{x.sessionName}</span>
              <span style={{ color: x.isActive ? "#047857" : "#64748b", fontWeight: x.isActive ? 700 : 400 }}>{x.isActive ? "Active" : "Available"}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={card}>
        <h3 style={{ marginTop: 0 }}>Terms</h3>
        <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
          {termOptions.map((x) => {
            const session = sessionOptions.find((item) => String(item.id) === String(x.sessionId));
            return (
              <div key={x.id} style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed #dbe6f4", paddingTop: 6 }}>
                <span>{session?.sessionName || "Session"} / {x.termName}</span>
                <span style={{ color: x.isActive ? "#047857" : "#64748b", fontWeight: x.isActive ? 700 : 400 }}>{x.isActive ? "Active" : "Available"}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={card}>
        <h3 style={{ marginTop: 0 }}>Subjects</h3>
        <div style={grid2}>
          <input placeholder="Subject name" value={subjectForm.subjectName} onChange={(e) => setSubjectForm({ ...subjectForm, subjectName: e.target.value })} />
          <input placeholder="Subject code" value={subjectForm.subjectCode} onChange={(e) => setSubjectForm({ ...subjectForm, subjectCode: e.target.value })} />
          <input placeholder="Category" value={subjectForm.category} onChange={(e) => setSubjectForm({ ...subjectForm, category: e.target.value })} />
          <button onClick={createSubjectRow}>Create Subject</button>
        </div>
      </div>
    </div>
    );
  };

  const renderClassSubjects = () => (
    <div style={{ display: "grid", gap: 12 }}>
      {canManageTeachingModules ? (
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>Class Subject Mapping</h3>
          <div style={grid2}>
            <select value={classSubjectForm.classId} onChange={(e) => setClassSubjectForm({ ...classSubjectForm, classId: e.target.value })}>
              <option value="">Select Class</option>
              {classOptions.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
            <select value={classSubjectForm.subjectId} onChange={(e) => setClassSubjectForm({ ...classSubjectForm, subjectId: e.target.value })}>
              <option value="">Select Subject</option>
              {subjectOptions.map((x) => <option key={x.id} value={x.id}>{x.subjectName}</option>)}
            </select>
            <select value={classSubjectForm.teacherUserId} onChange={(e) => setClassSubjectForm({ ...classSubjectForm, teacherUserId: e.target.value })}>
              <option value="">Assign Teacher</option>
              {teacherOptions.map((x) => <option key={x.id} value={x.id}>{`${x.name} (${pretty(x.role)})`}</option>)}
            </select>
            <select value={classSubjectForm.sessionId} onChange={(e) => setClassSubjectForm({ ...classSubjectForm, sessionId: e.target.value })}>
              <option value="">Session (default active)</option>
              {sessionOptions.map((x) => <option key={x.id} value={x.id}>{x.sessionName}</option>)}
            </select>
            <select value={classSubjectForm.termId} onChange={(e) => setClassSubjectForm({ ...classSubjectForm, termId: e.target.value })}>
              <option value="">Term (default active)</option>
              {termOptions.map((x) => <option key={x.id} value={x.id}>{x.termName}</option>)}
            </select>
            <button onClick={createClassSubjectRow}>Save Mapping</button>
          </div>
          {role === "ADMIN" || isAcademicOfficer ? <button style={{ marginTop: 8 }} onClick={seedMappings}>Seed Templates by Class</button> : null}
        </div>
      ) : null}

      <div style={card}>
        <h3 style={{ marginTop: 0 }}>Class Subjects</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ border: "1px solid #ddd", padding: 6 }}>Class</th>
                <th style={{ border: "1px solid #ddd", padding: 6 }}>Subject</th>
                <th style={{ border: "1px solid #ddd", padding: 6 }}>Teacher</th>
                <th style={{ border: "1px solid #ddd", padding: 6 }}>Session/Term</th>
              </tr>
            </thead>
            <tbody>
              {classSubjects.map((x) => (
                <tr key={x.id}>
                  <td style={{ border: "1px solid #ddd", padding: 6 }}>{x.className}</td>
                  <td style={{ border: "1px solid #ddd", padding: 6 }}>{x.subjectName}</td>
                  <td style={{ border: "1px solid #ddd", padding: 6 }}>
                    {role === "ADMIN" || isAcademicOfficer ? (
                      <select value={x.teacherUserId || ""} onChange={(e) => assignTeacher(x.id, e.target.value)}>
                        <option value="">Unassigned</option>
                        {teacherOptions.map((t) => <option key={t.id} value={t.id}>{`${t.name} (${pretty(t.role)})`}</option>)}
                      </select>
                    ) : (x.teacherName || "Unassigned")}
                  </td>
                  <td style={{ border: "1px solid #ddd", padding: 6 }}>{x.sessionName || ""} / {x.termName || ""}</td>
                </tr>
              ))}
              {classSubjects.length === 0 ? (
                <tr><td colSpan={4} style={{ border: "1px solid #ddd", padding: 8, textAlign: "center" }}>No class-subject mappings found.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderTopicsLessons = () => (
    <div style={{ display: "grid", gap: 12 }}>
      {canManageTeachingModules ? (
        <>
          <div style={card}>
            <h3 style={{ marginTop: 0 }}>Create Topic</h3>
            <div style={grid2}>
              <select value={topicForm.classSubjectId} onChange={(e) => setTopicForm({ ...topicForm, classSubjectId: e.target.value })}>
                <option value="">Select Class Subject</option>
                {classSubjects.map((x) => <option key={x.id} value={x.id}>{x.className} - {x.subjectName}</option>)}
              </select>
              <input placeholder="Topic title" value={topicForm.topicTitle} onChange={(e) => setTopicForm({ ...topicForm, topicTitle: e.target.value })} />
              <input placeholder="Week No" value={topicForm.weekNo} onChange={(e) => setTopicForm({ ...topicForm, weekNo: e.target.value })} />
              <input placeholder="Topic description" value={topicForm.topicDescription} onChange={(e) => setTopicForm({ ...topicForm, topicDescription: e.target.value })} />
              <button onClick={createTopicRow}>Create Topic</button>
            </div>
          </div>

          <div style={card}>
            <h3 style={{ marginTop: 0 }}>Create Lesson</h3>
            <div style={grid2}>
              <select value={lessonForm.classSubjectId} onChange={(e) => setLessonForm({ ...lessonForm, classSubjectId: e.target.value })}>
                <option value="">Select Class Subject</option>
                {classSubjects.map((x) => <option key={x.id} value={x.id}>{x.className} - {x.subjectName}</option>)}
              </select>
              <select value={lessonForm.topicId} onChange={(e) => setLessonForm({ ...lessonForm, topicId: e.target.value })}>
                <option value="">Topic (optional)</option>
                {topics.filter((x) => !lessonForm.classSubjectId || String(x.classSubjectId) === String(lessonForm.classSubjectId)).map((x) => <option key={x.id} value={x.id}>{x.topicTitle}</option>)}
              </select>
              <input placeholder="Lesson title" value={lessonForm.lessonTitle} onChange={(e) => setLessonForm({ ...lessonForm, lessonTitle: e.target.value })} />
              <input placeholder="Summary" value={lessonForm.lessonSummary} onChange={(e) => setLessonForm({ ...lessonForm, lessonSummary: e.target.value })} />
              <input type="date" value={lessonForm.lessonDate} onChange={(e) => setLessonForm({ ...lessonForm, lessonDate: e.target.value })} />
              <select value={lessonForm.publishStatus} onChange={(e) => setLessonForm({ ...lessonForm, publishStatus: e.target.value })}>
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Draft</option>
              </select>
            </div>
            <textarea style={{ width: "100%", marginTop: 8 }} rows={3} placeholder="Lesson note" value={lessonForm.lessonNote} onChange={(e) => setLessonForm({ ...lessonForm, lessonNote: e.target.value })} />
            <button onClick={createLessonRow}>Create Lesson</button>
          </div>

          <div style={card}>
            <h3 style={{ marginTop: 0 }}>Attach Lesson Resource</h3>
            <div style={grid2}>
              <select value={resourceForm.lessonId} onChange={(e) => setResourceForm({ ...resourceForm, lessonId: e.target.value })}>
                <option value="">Select Lesson</option>
                {lessons.map((x) => <option key={x.id} value={x.id}>{x.lessonTitle}</option>)}
              </select>
              <input placeholder="Resource title" value={resourceForm.resourceTitle} onChange={(e) => setResourceForm({ ...resourceForm, resourceTitle: e.target.value })} />
              <select value={resourceForm.resourceType} onChange={(e) => setResourceForm({ ...resourceForm, resourceType: e.target.value })}>
                <option value="pdf">PDF</option>
                <option value="doc">Doc</option>
                <option value="slide">Slide</option>
                <option value="video">Video</option>
                <option value="link">Link</option>
              </select>
              <input placeholder="External URL" value={resourceForm.externalUrl} onChange={(e) => setResourceForm({ ...resourceForm, externalUrl: e.target.value })} />
              <input placeholder="File path (if uploaded on server)" value={resourceForm.filePath} onChange={(e) => setResourceForm({ ...resourceForm, filePath: e.target.value })} />
              <button onClick={addResource}>Add Resource</button>
            </div>
          </div>
        </>
      ) : null}

      <div style={card}>
        <h3 style={{ marginTop: 0 }}>Lessons</h3>

        {selectedLesson ? (
          <div style={{ border: "1px solid #cfe0f3", borderRadius: 10, padding: 10, background: "#f8fbff", marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <strong>{selectedLesson.lessonTitle}</strong>
              <button type="button" onClick={() => openLessonRoute(selectedLesson.id)}>Lesson URL Active</button>
            </div>
            <p style={{ margin: "6px 0" }}>{selectedLesson.lessonSummary || selectedLesson.lessonNote || "No summary provided."}</p>
            <p style={{ margin: "6px 0", color: "#475569" }}>{selectedLesson.lessonDate || ""} | {selectedLesson.publishStatus}</p>
            {(selectedLesson.resources || []).map((r) => (
              <p key={r.id} style={{ margin: "4px 0", fontSize: 13 }}>{r.resourceType}: {r.resourceTitle}</p>
            ))}
            {role === "STUDENT" ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => markProgress(selectedLesson.id, false)}>Mark Viewed</button>
                <button onClick={() => markProgress(selectedLesson.id, true)}>Mark Completed</button>
              </div>
            ) : null}
          </div>
        ) : null}

        {lessons.map((x) => {
          const isSelected = String(x.id) === String(selectedLessonId);
          return (
            <div key={x.id} style={{ borderTop: "1px dashed #dbe6f4", paddingTop: 8, marginTop: 8, background: isSelected ? "#f8fbff" : "transparent", borderRadius: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <strong>{x.lessonTitle}</strong>
                <button type="button" onClick={() => openLessonRoute(x.id)}>Open Lesson</button>
              </div>
              <p style={{ margin: "4px 0" }}>{x.lessonSummary || ""}</p>
              <p style={{ margin: "4px 0", color: "#475569" }}>{x.lessonDate} | {x.publishStatus}</p>
              {(x.resources || []).map((r) => (
                <p key={r.id} style={{ margin: "4px 0", fontSize: 13 }}>{r.resourceType}: {r.resourceTitle}</p>
              ))}
              {canManageTeachingModules ? (
                x.publishStatus !== "PUBLISHED" ? <button onClick={() => publishLesson(x)}>Publish</button> : null
              ) : null}
              {role === "STUDENT" ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => markProgress(x.id, false)}>Mark Viewed</button>
                  <button onClick={() => markProgress(x.id, true)}>Mark Completed</button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
  const renderAssignments = () => (
    <div style={{ display: "grid", gap: 12 }}>
      {canManageTeachingModules ? (
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>Create Assignment</h3>
          <div style={grid2}>
            <select value={assignmentForm.classSubjectId} onChange={(e) => setAssignmentForm({ ...assignmentForm, classSubjectId: e.target.value })}>
              <option value="">Select Class Subject</option>
              {classSubjects.map((x) => <option key={x.id} value={x.id}>{x.className} - {x.subjectName}</option>)}
            </select>
            <select value={assignmentForm.topicId} onChange={(e) => setAssignmentForm({ ...assignmentForm, topicId: e.target.value })}>
              <option value="">Topic (optional)</option>
              {topics.filter((x) => !assignmentForm.classSubjectId || String(x.classSubjectId) === String(assignmentForm.classSubjectId)).map((x) => <option key={x.id} value={x.id}>{x.topicTitle}</option>)}
            </select>
            <input placeholder="Assignment title" value={assignmentForm.title} onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })} />
            <input type="date" value={assignmentForm.dueDate} onChange={(e) => setAssignmentForm({ ...assignmentForm, dueDate: e.target.value })} />
            <input placeholder="Max score" value={assignmentForm.maxScore} onChange={(e) => setAssignmentForm({ ...assignmentForm, maxScore: e.target.value })} />
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}><input type="checkbox" checked={assignmentForm.allowLateSubmission} onChange={(e) => setAssignmentForm({ ...assignmentForm, allowLateSubmission: e.target.checked })} /> Allow Late</label>
          </div>
          <textarea style={{ width: "100%", marginTop: 8 }} rows={3} placeholder="Instructions" value={assignmentForm.instructions} onChange={(e) => setAssignmentForm({ ...assignmentForm, instructions: e.target.value })} />
          <button onClick={createAssignmentRow}>Create Assignment</button>
        </div>
      ) : null}

      <div style={card}>
        <h3 style={{ marginTop: 0 }}>Assignments</h3>

        {selectedAssignment ? (
          <div style={{ border: "1px solid #cfe0f3", borderRadius: 10, padding: 10, background: "#f8fbff", marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <strong>{selectedAssignment.title}</strong>
              <button type="button" onClick={() => openAssignmentRoute(selectedAssignment.id)}>Assignment URL Active</button>
            </div>
            <p style={{ margin: "6px 0" }}>{selectedAssignment.instructions || "No instructions provided."}</p>
            <p style={{ margin: "6px 0", color: "#475569" }}>Due: {selectedAssignment.dueDate || "N/A"} | Max: {selectedAssignment.maxScore}</p>
          </div>
        ) : null}

        {assignments.map((x) => {
          const isSelected = String(x.id) === String(selectedAssignmentId);
          return (
            <div key={x.id} style={{ borderTop: "1px dashed #dbe6f4", paddingTop: 8, marginTop: 8, background: isSelected ? "#f8fbff" : "transparent", borderRadius: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <strong>{x.title}</strong>
                <button type="button" onClick={() => openAssignmentRoute(x.id)}>Open Assignment</button>
              </div>
              <p style={{ margin: "4px 0" }}>{x.instructions || ""}</p>
              <p style={{ margin: "4px 0", color: "#475569" }}>Due: {x.dueDate || "N/A"} | Max: {x.maxScore}</p>

              {role === "STUDENT" ? (
                <div>
                  <textarea
                    rows={3}
                    style={{ width: "100%" }}
                    placeholder="Type your submission"
                    value={studentSubmissionDrafts[x.id] || ""}
                    onChange={(e) => setStudentSubmissionDrafts((prev) => ({ ...prev, [x.id]: e.target.value }))}
                  />
                  <button onClick={() => submitStudentAssignment(x.id)}>Submit Assignment</button>
                </div>
              ) : null}

              {canManageTeachingModules ? (
                <div style={{ marginTop: 6 }}>
                  <button onClick={() => loadSubmissions(x.id)}>Load Submissions</button>
                  {(submissionsByAssignment[x.id] || []).map((sub) => (
                    <div key={sub.id} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 8, marginTop: 6 }}>
                      <p style={{ margin: "4px 0" }}><strong>{sub.studentName}</strong> | Status: {sub.status}</p>
                      <p style={{ margin: "4px 0" }}>{sub.submissionText || ""}</p>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <input id={`score-${sub.id}`} defaultValue={sub.score ?? ""} placeholder="Score" style={{ width: 90 }} />
                        <input id={`feedback-${sub.id}`} defaultValue={sub.feedback || ""} placeholder="Feedback" style={{ minWidth: 200 }} />
                        <button onClick={() => {
                          const score = document.getElementById(`score-${sub.id}`)?.value;
                          const feedback = document.getElementById(`feedback-${sub.id}`)?.value;
                          gradeSubmission(sub.id, score, feedback);
                        }}>Save Grade</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderQuizzes = () => (
    <div style={{ display: "grid", gap: 12 }}>
      {canManageTeachingModules ? (
        <>
          <div style={card}>
            <h3 style={{ marginTop: 0 }}>Create Quiz</h3>
            <div style={grid2}>
              <select value={quizForm.classSubjectId} onChange={(e) => setQuizForm({ ...quizForm, classSubjectId: e.target.value })}>
                <option value="">Select Class Subject</option>
                {classSubjects.map((x) => <option key={x.id} value={x.id}>{x.className} - {x.subjectName}</option>)}
              </select>
              <select value={quizForm.topicId} onChange={(e) => setQuizForm({ ...quizForm, topicId: e.target.value })}>
                <option value="">Topic (optional)</option>
                {topics.filter((x) => !quizForm.classSubjectId || String(x.classSubjectId) === String(quizForm.classSubjectId)).map((x) => <option key={x.id} value={x.id}>{x.topicTitle}</option>)}
              </select>
              <input placeholder="Quiz title" value={quizForm.title} onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })} />
              <input placeholder="Duration (mins)" value={quizForm.durationMinutes} onChange={(e) => setQuizForm({ ...quizForm, durationMinutes: e.target.value })} />
              <input placeholder="Total marks" value={quizForm.totalMarks} onChange={(e) => setQuizForm({ ...quizForm, totalMarks: e.target.value })} />
              <input placeholder="Attempts allowed" value={quizForm.attemptsAllowed} onChange={(e) => setQuizForm({ ...quizForm, attemptsAllowed: e.target.value })} />
              <input type="datetime-local" value={quizForm.startAt} onChange={(e) => setQuizForm({ ...quizForm, startAt: e.target.value })} />
              <input type="datetime-local" value={quizForm.endAt} onChange={(e) => setQuizForm({ ...quizForm, endAt: e.target.value })} />
              <select value={quizForm.status} onChange={(e) => setQuizForm({ ...quizForm, status: e.target.value })}>
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Draft</option>
              </select>
            </div>
            <textarea style={{ width: "100%", marginTop: 8 }} rows={2} placeholder="Instructions" value={quizForm.instructions} onChange={(e) => setQuizForm({ ...quizForm, instructions: e.target.value })} />
            <button onClick={createQuizRow}>Create Quiz</button>
          </div>

          <div style={card}>
            <h3 style={{ marginTop: 0 }}>Add Quiz Questions</h3>
            <div style={grid2}>
              <select value={quizQuestionForm.quizId} onChange={(e) => setQuizQuestionForm({ ...quizQuestionForm, quizId: e.target.value })}>
                <option value="">Select Quiz</option>
                {quizzes.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
              </select>
              <input placeholder="Question" value={quizQuestionForm.questionText} onChange={(e) => setQuizQuestionForm({ ...quizQuestionForm, questionText: e.target.value })} />
              <input placeholder="Option A" value={quizQuestionForm.optionA} onChange={(e) => setQuizQuestionForm({ ...quizQuestionForm, optionA: e.target.value })} />
              <input placeholder="Option B" value={quizQuestionForm.optionB} onChange={(e) => setQuizQuestionForm({ ...quizQuestionForm, optionB: e.target.value })} />
              <input placeholder="Option C" value={quizQuestionForm.optionC} onChange={(e) => setQuizQuestionForm({ ...quizQuestionForm, optionC: e.target.value })} />
              <input placeholder="Option D" value={quizQuestionForm.optionD} onChange={(e) => setQuizQuestionForm({ ...quizQuestionForm, optionD: e.target.value })} />
              <select value={quizQuestionForm.correctAnswer} onChange={(e) => setQuizQuestionForm({ ...quizQuestionForm, correctAnswer: e.target.value })}>
                <option value="A">Correct: A</option>
                <option value="B">Correct: B</option>
                <option value="C">Correct: C</option>
                <option value="D">Correct: D</option>
              </select>
              <input placeholder="Marks" value={quizQuestionForm.marks} onChange={(e) => setQuizQuestionForm({ ...quizQuestionForm, marks: e.target.value })} />
            </div>
            <textarea style={{ width: "100%", marginTop: 8 }} rows={3} placeholder="Bulk lines: Question||A||B||C||D||Answer||Marks" value={quizQuestionForm.bulk} onChange={(e) => setQuizQuestionForm({ ...quizQuestionForm, bulk: e.target.value })} />
            <button onClick={addQuizQuestion}>Upload Questions</button>
          </div>
        </>
      ) : null}

      <div style={card}>
        <h3 style={{ marginTop: 0 }}>Quizzes</h3>

        {selectedQuiz ? (
          <div style={{ border: "1px solid #cfe0f3", borderRadius: 10, padding: 10, background: "#f8fbff", marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <strong>{selectedQuiz.title}</strong>
              <button type="button" onClick={() => openQuizRoute(selectedQuiz.id)}>Quiz URL Active</button>
            </div>
            <p style={{ margin: "6px 0" }}>{selectedQuiz.instructions || "No instructions provided."}</p>
            <p style={{ margin: "6px 0", color: "#475569" }}>Questions: {selectedQuiz.questionCount || 0} | Duration: {selectedQuiz.durationMinutes} mins | Status: {selectedQuiz.status}</p>
            {role === "STUDENT" ? <button onClick={() => startQuizForStudent(selectedQuiz)}>Start Quiz</button> : null}
          </div>
        ) : null}

        {quizzes.map((x) => {
          const isSelected = String(x.id) === String(selectedQuizId);
          return (
            <div key={x.id} style={{ borderTop: "1px dashed #dbe6f4", paddingTop: 8, marginTop: 8, background: isSelected ? "#f8fbff" : "transparent", borderRadius: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <strong>{x.title}</strong>
                <button type="button" onClick={() => openQuizRoute(x.id)}>Open Quiz</button>
              </div>
              <p style={{ margin: "4px 0" }}>{x.instructions || ""}</p>
              <p style={{ margin: "4px 0", color: "#475569" }}>Questions: {x.questionCount || 0} | Duration: {x.durationMinutes} mins | Status: {x.status}</p>
              {role === "STUDENT" ? <button onClick={() => startQuizForStudent(x)}>Start Quiz</button> : null}
            </div>
          );
        })}
      </div>

      {role === "STUDENT" && activeQuizState ? (
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>Active Quiz: {activeQuizState.quiz?.title}</h3>
          {(activeQuizState.questions || []).map((q, index) => (
            <div key={q.id} style={{ borderTop: "1px dashed #dbe6f4", paddingTop: 8, marginTop: 8 }}>
              <p style={{ margin: "4px 0" }}><strong>Q{index + 1}.</strong> {q.questionText}</p>
              {[ ["A", q.optionA], ["B", q.optionB], ["C", q.optionC], ["D", q.optionD] ].map(([opt, label]) => (
                <label key={`${q.id}-${opt}`} style={{ display: "block", marginBottom: 4 }}>
                  <input type="radio" name={`q-${q.id}`} checked={answerState[q.id] === opt} onChange={() => answerQuestion(q.id, opt)} /> {opt}. {label}
                </label>
              ))}
            </div>
          ))}
          <button style={{ marginTop: 10 }} onClick={submitActiveQuiz}>Submit Quiz</button>
        </div>
      ) : null}

      <div style={card}>
        <h3 style={{ marginTop: 0 }}>Quiz Attempts</h3>
        {attempts.map((x) => (
          <p key={x.id} style={{ margin: "6px 0" }}>
            <strong>{x.quizTitle || "Quiz"}</strong> | {x.studentName || ""} | {x.status} | {x.score}/{x.totalMarks} ({x.percentage}%)
          </p>
        ))}
      </div>
    </div>
  );

  const renderAnnouncements = () => (
    <div style={{ display: "grid", gap: 12 }}>
      {canManageTeachingModules ? (
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>Post Announcement</h3>
          <div style={grid2}>
            <input placeholder="Title" value={announcementForm.title} onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })} />
            <select value={announcementForm.targetType} onChange={(e) => setAnnouncementForm({ ...announcementForm, targetType: e.target.value, targetId: "" })}>
              <option value="school">School Wide</option>
              <option value="class">Class</option>
              <option value="class_subject">Class Subject</option>
            </select>
            {announcementForm.targetType === "class" ? (
              <select value={announcementForm.targetId} onChange={(e) => setAnnouncementForm({ ...announcementForm, targetId: e.target.value })}>
                <option value="">Select Class</option>
                {classOptions.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            ) : null}
            {announcementForm.targetType === "class_subject" ? (
              <select value={announcementForm.targetId} onChange={(e) => setAnnouncementForm({ ...announcementForm, targetId: e.target.value })}>
                <option value="">Select Class Subject</option>
                {classSubjects.map((x) => <option key={x.id} value={x.id}>{x.className} - {x.subjectName}</option>)}
              </select>
            ) : null}
          </div>
          <textarea style={{ width: "100%", marginTop: 8 }} rows={3} placeholder="Message" value={announcementForm.message} onChange={(e) => setAnnouncementForm({ ...announcementForm, message: e.target.value })} />
          <button onClick={createAnnouncementRow}>Post</button>
        </div>
      ) : null}

      <div style={card}>
        <h3 style={{ marginTop: 0 }}>Announcements</h3>
        {announcements.map((x) => (
          <div key={x.id} style={{ borderTop: "1px dashed #dbe6f4", paddingTop: 8, marginTop: 8 }}>
            <strong>{x.title}</strong>
            <p style={{ margin: "4px 0" }}>{x.message}</p>
            <p style={{ margin: "4px 0", color: "#475569" }}>{pretty(x.targetType)} {x.targetId ? `| ${x.targetId}` : ""}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderVirtualClasses = () => (
    <LmsVirtualClassesPanel role={role} classSubjects={classSubjects} />
  );

  const renderReports = () => (
    <div style={card}>
      <h3 style={{ marginTop: 0 }}>Learning Reports</h3>
      {Object.entries(reports?.totals || {}).map(([k, v]) => (
        <p key={k} style={{ margin: "6px 0" }}>{pretty(k)}: <strong>{v}</strong></p>
      ))}
    </div>
  );

  const renderProgress = () => (
    <div style={card}>
      <h3 style={{ marginTop: 0 }}>Progress Snapshot</h3>
      {Object.entries(dashboard?.totals || {}).map(([k, v]) => (
        <p key={k} style={{ margin: "6px 0" }}>{pretty(k)}: <strong>{v}</strong></p>
      ))}
    </div>
  );

  const renderModule = () => {
    if (activeModule === "overview") return renderOverview();
    if (activeModule === "setup") return renderSetup();
    if (activeModule === "classsubjects") return renderClassSubjects();
    if (activeModule === "virtualclasses") return renderVirtualClasses();
    if (activeModule === "topics") return renderTopicsLessons();
    if (activeModule === "lessons") return renderTopicsLessons();
    if (activeModule === "assignments") return renderAssignments();
    if (activeModule === "quizzes") return renderQuizzes();
    if (activeModule === "announcements") return renderAnnouncements();
    if (activeModule === "reports") return renderReports();
    if (activeModule === "progress") return renderProgress();
    return renderOverview();
  };

  const handleModuleSelect = (module) => {
    if (!modules.includes(module)) return;
    setActiveModule(module);
    const base = getLmsBaseByRole(role);
    const segment = MODULE_SEGMENT_MAP[module] || "dashboard";
    navigate(`${base}/${segment}`);
  };

  const moduleLabel = pretty(activeModule || "overview");

  return (
    <div style={{ minHeight: "100vh", background: "#f4f8fd", padding: 20 }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", display: "grid", gridTemplateColumns: "260px 1fr", gap: 14 }}>
        <aside style={{ ...card, height: "fit-content" }}>
          <h3 style={{ marginTop: 0 }}>Learning Management Desk</h3>
          <p style={{ marginTop: 4, color: "#64748b" }}>{role}</p>
          <div style={{ display: "grid", gap: 6 }}>
            {modules.map((module) => (
              <button
                key={module}
                onClick={() => handleModuleSelect(module)}
                style={{
                  textAlign: "left",
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: activeModule === module ? "1px solid #0f766e" : "1px solid #dbe7f5",
                  background: activeModule === module ? "#e6fffa" : "#fff",
                  fontWeight: activeModule === module ? 700 : 500,
                }}
              >
                {pretty(module)}
              </button>
            ))}
          </div>
        </aside>

        <main style={{ display: "grid", gap: 12 }}>
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div>
                <h2 style={{ margin: 0 }}>{moduleLabel}</h2>
                <p style={{ margin: "4px 0", color: "#64748b" }}>
                  Manage class subjects, virtual classes, lessons, assignments, quizzes, announcements, and learning progress for Angel Montessori pupils from Reception to SS3.
                </p>
              </div>
              <button onClick={loadAll} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</button>
            </div>
          </div>

          {error ? <p style={{ margin: 0, color: "crimson" }}>{error}</p> : null}
          {message ? <p style={{ margin: 0, color: "#14532d" }}>{message}</p> : null}

          {renderModule()}
        </main>
      </div>
    </div>
  );
}
































