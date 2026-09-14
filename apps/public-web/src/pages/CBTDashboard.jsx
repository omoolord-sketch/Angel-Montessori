import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";
import {
  addCbtQuestion,
  addCbtQuestionsBulk,
  addExam,
  approveCbtQuestion,
  assignCbtExamQuestions,
  closeCbtExam,
  createCbtClass,
  createCbtSession,
  createCbtSubject,
  createCbtTopic,
  getCbtAdminOverview,
  getCbtAnalytics,
  getCbtAttempts,
  getCbtClassesCatalog,
  getCbtMetadata,
  getCbtQuestions,
  getCbtResults,
  getCbtSessions,
  getCbtSettings,
  getCbtStudents,
  getCbtSubjectsCatalog,
  getCbtTopicsCatalog,
  getExams,
  publishCbtExam,
  rejectCbtQuestion,
  updateCbtSettings,
} from "../api/services";
import { useAuth } from "../auth/AuthContext";
import { ACTIVE_CLASS_NAMES, normalizeAcademicClassKey } from "../utils/academicSystems";

const ADMIN_MODULES = [
  { id: "overview", label: "Overview" },
  { id: "classes", label: "Manage Classes" },
  { id: "subjects", label: "Manage Subjects" },
  { id: "sessions", label: "Sessions / Terms" },
  { id: "bank", label: "Question Bank" },
  { id: "exams", label: "Exams" },
  { id: "students", label: "Students" },
  { id: "results", label: "Results" },
  { id: "reports", label: "Reports" },
  { id: "settings", label: "Settings" },
];

const TEACHER_MODULES = [
  { id: "overview", label: "Overview" },
  { id: "bank", label: "Question Bank" },
  { id: "exams", label: "Exams" },
  { id: "results", label: "Results" },
  { id: "reports", label: "Reports" },
  { id: "students", label: "Students" },
];

const DEFAULT_TARGET_AUDIENCES = ["STUDENT", "ENTRANCE", "INTERVIEW"];

const TARGET_AUDIENCE_LABELS = {
  STUDENT: "Student Portal",
  ENTRANCE: "Entrance Candidates",
  INTERVIEW: "Interview Candidates",
};

function getDefaultTargetAudience(examType) {
  const clean = String(examType || "").trim().toUpperCase();
  if (clean === "ENTRANCE") return "ENTRANCE";
  if (clean === "INTERVIEW") return "INTERVIEW";
  return "STUDENT";
}

function getTargetAudienceLabel(targetAudience) {
  return TARGET_AUDIENCE_LABELS[String(targetAudience || "").trim().toUpperCase()] || "Student Portal";
}

function getExamLoginLabel(targetAudience) {
  const clean = String(targetAudience || "").trim().toUpperCase();
  if (clean === "ENTRANCE") return "Entrance Exam Login";
  if (clean === "INTERVIEW") return "Interview Test Login";
  return "Student Exam Login";
}

function parseBulkLine(line) {
  const parts = String(line || "").split("||").map((item) => item.trim());
  if (parts.length < 9) return null;
  return {
    Class: parts[0],
    Subject: parts[1],
    Topic: parts[2],
    Question: parts[3],
    Option_A: parts[4],
    Option_B: parts[5],
    Option_C: parts[6],
    Option_D: parts[7],
    Correct_Answer: parts[8],
    Difficulty: parts[9] || "MEDIUM",
    Explanation: parts[10] || "",
  };
}

function normalizeHeaderKey(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseBulkRowObject(row) {
  const bag = {};
  Object.keys(row || {}).forEach((key) => {
    bag[normalizeHeaderKey(key)] = row[key];
  });

  const pick = (...aliases) => {
    for (const alias of aliases) {
      const value = bag[normalizeHeaderKey(alias)];
      if (value !== undefined && value !== null) return String(value).trim();
    }
    return "";
  };

  const optionA = pick("Option_A", "Option A", "A", "OptionA");
  const optionB = pick("Option_B", "Option B", "B", "OptionB");
  const optionC = pick("Option_C", "Option C", "C", "OptionC");
  const optionD = pick("Option_D", "Option D", "D", "OptionD");

  return {
    Class: pick("Class", "Class Name", "Class Level"),
    Subject: pick("Subject", "Subject Name"),
    Topic: pick("Topic", "Topic Name"),
    Question: pick("Question", "Question Text"),
    Option_A: optionA,
    Option_B: optionB,
    Option_C: optionC,
    Option_D: optionD,
    Correct_Answer: pick("Correct_Answer", "Correct Answer", "Answer", "Correct"),
    Difficulty: pick("Difficulty") || "MEDIUM",
    Explanation: pick("Explanation"),
  };
}
function toCsvRow(values) {
  return values
    .map((value) => {
      const text = String(value ?? "");
      if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
        return `"${text.replace(/\"/g, '""')}"`;
      }
      return text;
    })
    .join(",");
}

export default function CBTDashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const modules = isAdmin ? ADMIN_MODULES : TEACHER_MODULES;

  const [activeModule, setActiveModule] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [metadata, setMetadata] = useState({});
  const [overview, setOverview] = useState({ totals: {} });
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [exams, setExams] = useState([]);
  const [students, setStudents] = useState([]);
  const [results, setResults] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [analytics, setAnalytics] = useState({
    topPerformers: [],
    averageByClass: [],
    averageBySubject: [],
    failedQuestions: [],
    topicWeakness: [],
  });
  const [settings, setSettings] = useState({ schoolName: "", brandingLogoUrl: "", cbtRules: {} });

  const [classForm, setClassForm] = useState({ className: "", section: "", levelOrder: "" });
  const [subjectForm, setSubjectForm] = useState({ className: "", subjectName: "", category: "GENERAL" });
  const [topicForm, setTopicForm] = useState({ className: "", subjectName: "", topicName: "" });
  const [sessionForm, setSessionForm] = useState({ name: "", startDate: "", endDate: "" });

  const [questionFilter, setQuestionFilter] = useState({ className: "", subject: "", status: "" });
  const [questionForm, setQuestionForm] = useState({
    className: "",
    subjectName: "",
    topicName: "",
    questionText: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correctAnswer: "A",
    difficulty: "MEDIUM",
    explanation: "",
  });
  const [bulkText, setBulkText] = useState("");
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkFileName, setBulkFileName] = useState("");

  const [examForm, setExamForm] = useState({
    examTitle: "",
    examType: "CLASS_TEST",
    targetAudience: "STUDENT",
    className: "",
    subjects: [],
    durationMinutes: "40",
    totalQuestions: "20",
    passMark: "50",
    accessPassword: "",
    accessCode: "",
    startTime: "",
    endTime: "",
    instructions: "Answer all questions and submit before time elapses.",
    status: "PUBLISHED",
  });

  const [resultFilter, setResultFilter] = useState({ className: "", subject: "", examId: "" });

  const classSubjectMap = useMemo(() => metadata?.classSubjects || {}, [metadata]);
  const audienceOptions = useMemo(() => {
    const items = Array.isArray(metadata?.targetAudiences) && metadata.targetAudiences.length
      ? metadata.targetAudiences
      : DEFAULT_TARGET_AUDIENCES;
    return items.map((item) => String(item || "").trim().toUpperCase()).filter(Boolean);
  }, [metadata]);

  const currentClassSubjects = useMemo(() => {
    if (!questionForm.className) return metadata?.subjects || [];
    return classSubjectMap[questionForm.className] || metadata?.subjects || [];
  }, [questionForm.className, classSubjectMap, metadata]);

  const currentExamSubjects = useMemo(() => {
    if (examForm.targetAudience === "ENTRANCE") return metadata?.admissionDefaultSubjects || [];
    if (examForm.targetAudience !== "STUDENT") return metadata?.subjects || [];
    if (!examForm.className) return metadata?.subjects || [];
    return classSubjectMap[examForm.className] || metadata?.subjects || [];
  }, [examForm.className, examForm.targetAudience, classSubjectMap, metadata]);

  const defaultClassNames = ACTIVE_CLASS_NAMES;

  const classOptions = useMemo(() => {
    const out = [];
    const seen = new Set();

    const add = (item) => {
      const className = String(item?.className || item?.name || "").trim();
      if (!className) return;
      const key = normalizeAcademicClassKey(className);
      if (seen.has(key)) return;
      seen.add(key);
      out.push({
        id: String(item?.id || `fallback-${className}`),
        className,
        section: String(item?.section || ""),
      });
    };

    (Array.isArray(classes) ? classes : []).forEach(add);
    (Array.isArray(metadata?.classes) ? metadata.classes : []).forEach(add);
    defaultClassNames.forEach((name) => add({ id: `fallback-${name}`, className: name }));

    return out;
  }, [classes, metadata]);
  const cardStyle = { border: "1px solid #d7e3f2", borderRadius: 12, padding: 12, background: "#fff" };

  const loadEverything = async () => {
    try {
      setLoading(true);
      setError("");

      const calls = [
        getCbtMetadata(),
        getCbtAdminOverview(),
        getCbtClassesCatalog(),
        getCbtSubjectsCatalog(),
        getCbtTopicsCatalog(),
        getCbtSessions(),
        getCbtQuestions(),
        getExams(),
        getCbtStudents(),
        getCbtResults(),
        getCbtAttempts(),
        getCbtAnalytics(),
        getCbtSettings(),
      ];

      const [
        metadataRes,
        overviewRes,
        classesRes,
        subjectsRes,
        topicsRes,
        sessionsRes,
        questionsRes,
        examsRes,
        studentsRes,
        resultsRes,
        attemptsRes,
        analyticsRes,
        settingsRes,
      ] = await Promise.allSettled(calls);

      if (metadataRes.status === "fulfilled") setMetadata(metadataRes.value.data || {});
      if (overviewRes.status === "fulfilled") setOverview(overviewRes.value.data || { totals: {} });
      if (classesRes.status === "fulfilled") setClasses(Array.isArray(classesRes.value.data) ? classesRes.value.data : []);
      if (subjectsRes.status === "fulfilled") setSubjects(Array.isArray(subjectsRes.value.data) ? subjectsRes.value.data : []);
      if (topicsRes.status === "fulfilled") setTopics(Array.isArray(topicsRes.value.data) ? topicsRes.value.data : []);
      if (sessionsRes.status === "fulfilled") setSessions(Array.isArray(sessionsRes.value.data) ? sessionsRes.value.data : []);
      if (questionsRes.status === "fulfilled") setQuestions(Array.isArray(questionsRes.value.data) ? questionsRes.value.data : []);
      if (examsRes.status === "fulfilled") setExams(Array.isArray(examsRes.value.data) ? examsRes.value.data : []);
      if (studentsRes.status === "fulfilled") setStudents(Array.isArray(studentsRes.value.data) ? studentsRes.value.data : []);
      if (resultsRes.status === "fulfilled") setResults(Array.isArray(resultsRes.value.data) ? resultsRes.value.data : []);
      if (attemptsRes.status === "fulfilled") setAttempts(Array.isArray(attemptsRes.value.data) ? attemptsRes.value.data : []);
      if (analyticsRes.status === "fulfilled") setAnalytics(analyticsRes.value.data || {});
      if (settingsRes.status === "fulfilled") setSettings(settingsRes.value.data || settings);

      const errors = [metadataRes, overviewRes, classesRes, subjectsRes, topicsRes, sessionsRes, questionsRes, examsRes, studentsRes, resultsRes, attemptsRes, analyticsRes, settingsRes]
        .filter((entry) => entry.status === "rejected")
        .map((entry) => entry.reason?.response?.data?.message || entry.reason?.message)
        .filter(Boolean);
      if (errors.length > 0) setError(errors[0]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEverything();
  }, []);
  const refreshQuestions = async () => {
    const res = await getCbtQuestions(questionFilter);
    setQuestions(Array.isArray(res.data) ? res.data : []);
  };

  const refreshExams = async () => {
    const res = await getExams();
    setExams(Array.isArray(res.data) ? res.data : []);
  };

  const createClassRow = async () => {
    if (!classForm.className.trim()) return setError("Class name is required.");
    try {
      setError("");
      setMessage("");
      await createCbtClass({
        className: classForm.className.trim(),
        section: classForm.section.trim(),
        levelOrder: classForm.levelOrder ? Number(classForm.levelOrder) : undefined,
      });
      setClassForm({ className: "", section: "", levelOrder: "" });
      setMessage("Class added.");
      await loadEverything();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to add class");
    }
  };

  const createSubjectRow = async () => {
    if (!subjectForm.className || !subjectForm.subjectName) return setError("Select class and subject.");
    try {
      setError("");
      setMessage("");
      await createCbtSubject(subjectForm);
      setSubjectForm({ className: subjectForm.className, subjectName: "", category: "GENERAL" });
      setMessage("Subject added.");
      await loadEverything();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to add subject");
    }
  };

  const createTopicRow = async () => {
    if (!topicForm.subjectName || !topicForm.topicName.trim()) return setError("Subject and topic are required.");
    try {
      setError("");
      setMessage("");
      await createCbtTopic(topicForm);
      setTopicForm({ ...topicForm, topicName: "" });
      setMessage("Topic added.");
      await loadEverything();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to add topic");
    }
  };

  const createSessionRow = async () => {
    if (!sessionForm.name.trim()) return setError("Session/term name is required.");
    try {
      setError("");
      setMessage("");
      await createCbtSession(sessionForm);
      setSessionForm({ name: "", startDate: "", endDate: "" });
      setMessage("Session/term added.");
      await loadEverything();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to add session/term");
    }
  };

  const uploadQuestion = async () => {
    if (!questionForm.subjectName || !questionForm.questionText.trim()) {
      return setError("Subject and question text are required.");
    }

    try {
      setError("");
      setMessage("");
      await addCbtQuestion(questionForm);
      setQuestionForm({
        ...questionForm,
        questionText: "",
        optionA: "",
        optionB: "",
        optionC: "",
        optionD: "",
        explanation: "",
      });
      setMessage("Question uploaded successfully.");
      await refreshQuestions();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to upload question");
    }
  };

  const uploadBulkQuestions = async () => {
    const lines = bulkText.split("\n").map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return setError("Paste bulk lines first.");

    const rows = [];
    const invalid = [];
    lines.forEach((line, idx) => {
      const parsed = parseBulkLine(line);
      if (!parsed) invalid.push(idx + 1);
      else rows.push(parsed);
    });

    if (!rows.length) {
      return setError("No valid rows found. Format: Class||Subject||Topic||Question||A||B||C||D||Correct||Difficulty||Explanation");
    }

    try {
      setError("");
      setMessage("");
      const res = await addCbtQuestionsBulk({ rows });
      const created = Number(res?.data?.created || 0);
      setBulkText("");
      setMessage(`Bulk upload done. Created: ${created}. Invalid lines: ${invalid.join(", ") || "none"}`);
      await refreshQuestions();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed bulk upload");
    }
  };


  const uploadBulkSpreadsheet = async () => {
    if (!bulkFile) return setError("Select an Excel/CSV file first.");

    try {
      setError("");
      setMessage("");

      const arrayBuffer = await bulkFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const firstSheet = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheet];
      if (!worksheet) {
        return setError("No worksheet found in file.");
      }

      const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "", raw: false });
      const parsedRows = rawRows.map((row) => parseBulkRowObject(row));
      const validRows = parsedRows.filter((row) => (
        row.Class && row.Subject && row.Question && row.Option_A && row.Option_B && row.Correct_Answer
      ));
      const invalidCount = parsedRows.length - validRows.length;

      if (!validRows.length) {
        return setError("No valid rows found in spreadsheet. Check required columns and values.");
      }

      const res = await addCbtQuestionsBulk({ rows: validRows });
      const created = Number(res?.data?.created || 0);
      const failed = Array.isArray(res?.data?.failed) ? res.data.failed.length : 0;

      setMessage(`Spreadsheet upload complete. Rows: ${rawRows.length}. Created: ${created}. Invalid rows: ${invalidCount}. Failed rows: ${failed}.`);
      setBulkFile(null);
      setBulkFileName("");
      await refreshQuestions();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to process spreadsheet upload");
    }
  };

  const handleQuestionApproval = async (id, mode) => {
    try {
      setError("");
      setMessage("");
      if (mode === "approve") await approveCbtQuestion(id);
      else await rejectCbtQuestion(id);
      setMessage(`Question ${mode}d.`);
      await refreshQuestions();
    } catch (e) {
      setError(e?.response?.data?.message || `Failed to ${mode} question`);
    }
  };

  const toggleExamSubject = (subject) => {
    setExamForm((prev) => {
      const exists = prev.subjects.includes(subject);
      if (exists) return { ...prev, subjects: prev.subjects.filter((s) => s !== subject) };
      return { ...prev, subjects: [...prev.subjects, subject] };
    });
  };

  const handleExamTypeChange = (nextType) => {
    const targetAudience = getDefaultTargetAudience(nextType);
    setExamForm((prev) => ({
      ...prev,
      examType: nextType,
      targetAudience,
      className: targetAudience === "STUDENT" ? prev.className : "",
      subjects: [],
    }));
  };

  const handleExamAudienceChange = (nextAudience) => {
    setExamForm((prev) => {
      let nextExamType = prev.examType;
      if (nextAudience === "ENTRANCE") nextExamType = "ENTRANCE";
      else if (nextAudience === "INTERVIEW") nextExamType = "INTERVIEW";
      else if (nextExamType === "ENTRANCE" || nextExamType === "INTERVIEW") nextExamType = "CLASS_TEST";

      return {
        ...prev,
        targetAudience: nextAudience,
        examType: nextExamType,
        className: nextAudience === "STUDENT" ? prev.className : "",
        subjects: [],
      };
    });
  };

  const createExamSession = async () => {
    if (!examForm.examTitle.trim() || !examForm.accessPassword.trim()) {
      return setError("Exam title and access password are required.");
    }
    if (examForm.targetAudience === "STUDENT" && !examForm.className) {
      return setError("Select the class for this student exam.");
    }
    if (!examForm.subjects.length) return setError("Select at least one subject.");

    try {
      setError("");
      setMessage("");
      const payload = {
        ...examForm,
        targetAudience: examForm.targetAudience,
        durationMinutes: Number(examForm.durationMinutes || 40),
        totalQuestions: Number(examForm.totalQuestions || 20),
        passMark: Number(examForm.passMark || 50),
        startTime: examForm.startTime || undefined,
        endTime: examForm.endTime || undefined,
      };
      const res = await addExam(payload);
      setExamForm({
        examTitle: "",
        examType: "CLASS_TEST",
        targetAudience: "STUDENT",
        className: examForm.targetAudience === "STUDENT" ? examForm.className : "",
        subjects: [],
        durationMinutes: "40",
        totalQuestions: "20",
        passMark: "50",
        accessPassword: "",
        accessCode: "",
        startTime: "",
        endTime: "",
        instructions: "Answer all questions and submit before time elapses.",
        status: "PUBLISHED",
      });
      setMessage(`Exam created with code: ${res?.data?.accessCode || ""}`);
      await refreshExams();
      await loadEverything();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to create exam");
    }
  };

  const handleExamAction = async (examId, action) => {
    try {
      setError("");
      setMessage("");
      if (action === "publish") await publishCbtExam(examId);
      if (action === "close") await closeCbtExam(examId);
      if (action === "assign") await assignCbtExamQuestions(examId, {});
      setMessage(`Exam ${action} action completed.`);
      await refreshExams();
    } catch (e) {
      setError(e?.response?.data?.message || `Failed to ${action} exam`);
    }
  };

  const applyResultFilter = async () => {
    try {
      const res = await getCbtResults(resultFilter);
      setResults(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load results");
    }
  };

  const exportResultsCsv = () => {
    const header = ["Candidate", "Candidate ID", "Exam", "Class", "Score", "Total", "Percentage", "Status", "Submitted At"];
    const rows = results.map((item) => [
      item.candidateName,
      item.candidateId,
      item.examTitle,
      item.className || "",
      item.score,
      item.totalQuestions,
      item.percentage,
      item.passed ? "PASSED" : "FAILED",
      item.submittedAt,
    ]);
    const csv = [toCsvRow(header), ...rows.map((row) => toCsvRow(row))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cbt-results-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const saveSettings = async () => {
    if (!isAdmin) return;
    try {
      setError("");
      setMessage("");
      await updateCbtSettings(settings);
      setMessage("CBT settings updated.");
      await loadEverything();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to update settings");
    }
  };
  const renderOverview = () => (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
        {[
          ["Classes", overview?.totals?.classes || 0],
          ["Subjects", overview?.totals?.subjects || 0],
          ["Questions", overview?.totals?.questions || 0],
          ["Pending", overview?.totals?.pendingQuestions || 0],
          ["Published Exams", overview?.totals?.publishedExams || 0],
          ["Submitted", overview?.totals?.submittedAttempts || 0],
          ["Pass Rate", `${overview?.totals?.passRate || 0}%`],
        ].map(([label, value]) => (
          <div key={label} style={{ ...cardStyle, padding: 10 }}>
            <div style={{ color: "#64748b", fontSize: 13 }}>{label}</div>
            <strong style={{ fontSize: 24 }}>{value}</strong>
          </div>
        ))}
      </div>

      <div style={cardStyle}>
        <h3>Recent Exam Sessions</h3>
        {!(overview?.recentExams || []).length ? <p>No recent exam sessions yet.</p> : null}
        {(overview?.recentExams || []).slice(0, 10).map((exam) => (
          <div key={exam.id} style={{ borderTop: "1px dashed #d7e3f2", marginTop: 8, paddingTop: 8 }}>
            <strong>{exam.examTitle || exam.title}</strong>
            <p style={{ margin: "4px 0" }}>
              {exam.examType} | {getTargetAudienceLabel(exam.targetAudience)} | {exam.className || "No class link"} | {exam.durationMinutes} mins | {exam.totalQuestions} questions
            </p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderClasses = () => (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={cardStyle}>
        <h3>Add Class</h3>
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <input placeholder="Class Name" value={classForm.className} onChange={(e) => setClassForm({ ...classForm, className: e.target.value })} />
          <input placeholder="Section" value={classForm.section} onChange={(e) => setClassForm({ ...classForm, section: e.target.value })} />
          <input placeholder="Order" type="number" value={classForm.levelOrder} onChange={(e) => setClassForm({ ...classForm, levelOrder: e.target.value })} />
          <button onClick={createClassRow}>Add Class</button>
        </div>
      </div>

      <div style={cardStyle}>
        <h3>Class List</h3>
        {classOptions.map((item) => (
          <div key={item.id} style={{ borderTop: "1px dashed #d7e3f2", marginTop: 8, paddingTop: 8 }}>
            <strong>{item.className}</strong> <span style={{ color: "#64748b" }}>({item.section})</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSubjects = () => (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={cardStyle}>
        <h3>Add Subject</h3>
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          <select value={subjectForm.className} onChange={(e) => setSubjectForm({ ...subjectForm, className: e.target.value })}>
            <option value="">Select Class</option>
            {classOptions.map((c) => <option key={c.id || c.className} value={c.className}>{c.className}</option>)}
          </select>
          <input placeholder="Subject Name" value={subjectForm.subjectName} onChange={(e) => setSubjectForm({ ...subjectForm, subjectName: e.target.value })} />
          <button onClick={createSubjectRow}>Add Subject</button>
        </div>
      </div>

      <div style={cardStyle}>
        <h3>Subjects</h3>
        {subjects.map((item) => (
          <div key={item.id} style={{ borderTop: "1px dashed #d7e3f2", marginTop: 8, paddingTop: 8 }}>
            <strong>{item.subjectName}</strong> <span style={{ color: "#64748b" }}>| {item.className}</span>
          </div>
        ))}
      </div>

      <div style={cardStyle}>
        <h3>Add Topic</h3>
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <select value={topicForm.className} onChange={(e) => setTopicForm({ ...topicForm, className: e.target.value })}>
            <option value="">Class (optional)</option>
            {classOptions.map((c) => <option key={c.id || c.className} value={c.className}>{c.className}</option>)}
          </select>
          <select value={topicForm.subjectName} onChange={(e) => setTopicForm({ ...topicForm, subjectName: e.target.value })}>
            <option value="">Select Subject</option>
            {(metadata?.subjects || []).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input placeholder="Topic Name" value={topicForm.topicName} onChange={(e) => setTopicForm({ ...topicForm, topicName: e.target.value })} />
          <button onClick={createTopicRow}>Add Topic</button>
        </div>
      </div>
    </div>
  );

  const renderSessions = () => (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={cardStyle}>
        <h3>Manage Sessions / Terms</h3>
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          <input placeholder="Name (e.g. First Term)" value={sessionForm.name} onChange={(e) => setSessionForm({ ...sessionForm, name: e.target.value })} />
          <input type="date" value={sessionForm.startDate} onChange={(e) => setSessionForm({ ...sessionForm, startDate: e.target.value })} />
          <input type="date" value={sessionForm.endDate} onChange={(e) => setSessionForm({ ...sessionForm, endDate: e.target.value })} />
          <button onClick={createSessionRow}>Add Session</button>
        </div>
      </div>

      <div style={cardStyle}>
        <h3>Session / Term List</h3>
        {sessions.map((session) => (
          <div key={session.id} style={{ borderTop: "1px dashed #d7e3f2", marginTop: 8, paddingTop: 8 }}>
            <strong>{session.name}</strong>
            <p style={{ margin: "4px 0", color: "#64748b" }}>
              {session.startDate ? `Start: ${session.startDate.slice(0, 10)}` : ""}
              {session.endDate ? ` | End: ${session.endDate.slice(0, 10)}` : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderQuestionBank = () => (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={cardStyle}>
        <h3>Add Single Question</h3>
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            <select value={questionForm.className} onChange={(e) => setQuestionForm({ ...questionForm, className: e.target.value, subjectName: "" })}>
              <option value="">Select Class</option>
              {classOptions.map((c) => <option key={c.id || c.className} value={c.className}>{c.className}</option>)}
            </select>
            <select value={questionForm.subjectName} onChange={(e) => setQuestionForm({ ...questionForm, subjectName: e.target.value })}>
              <option value="">Select Subject</option>
              {currentClassSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <input placeholder="Topic" value={questionForm.topicName} onChange={(e) => setQuestionForm({ ...questionForm, topicName: e.target.value })} />
          </div>

          <textarea rows={3} placeholder="Question text" value={questionForm.questionText} onChange={(e) => setQuestionForm({ ...questionForm, questionText: e.target.value })} />

          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <input placeholder="Option A" value={questionForm.optionA} onChange={(e) => setQuestionForm({ ...questionForm, optionA: e.target.value })} />
            <input placeholder="Option B" value={questionForm.optionB} onChange={(e) => setQuestionForm({ ...questionForm, optionB: e.target.value })} />
            <input placeholder="Option C" value={questionForm.optionC} onChange={(e) => setQuestionForm({ ...questionForm, optionC: e.target.value })} />
            <input placeholder="Option D" value={questionForm.optionD} onChange={(e) => setQuestionForm({ ...questionForm, optionD: e.target.value })} />
          </div>

          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <select value={questionForm.correctAnswer} onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: e.target.value })}>
              <option value="A">Correct Answer: A</option>
              <option value="B">Correct Answer: B</option>
              <option value="C">Correct Answer: C</option>
              <option value="D">Correct Answer: D</option>
            </select>
            <select value={questionForm.difficulty} onChange={(e) => setQuestionForm({ ...questionForm, difficulty: e.target.value })}>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>

          <textarea rows={2} placeholder="Explanation (optional)" value={questionForm.explanation} onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })} />
          <button onClick={uploadQuestion}>Upload Question</button>
        </div>
      </div>

      <div style={cardStyle}>
        <h3>Bulk Upload (Standard Format)</h3>
        <p style={{ color: "#64748b", margin: "4px 0" }}>
          Text format: <code>Class||Subject||Topic||Question||Option A||Option B||Option C||Option D||Correct||Difficulty||Explanation</code>
        </p>
        <textarea rows={6} value={bulkText} onChange={(e) => setBulkText(e.target.value)} style={{ width: "100%" }} />
        <button onClick={uploadBulkQuestions} style={{ marginTop: 8 }}>Upload Text Bulk Questions</button>

        <div style={{ marginTop: 12, borderTop: "1px dashed #d7e3f2", paddingTop: 10 }}>
          <strong>Upload Excel / CSV File</strong>
          <p style={{ color: "#64748b", margin: "6px 0" }}>
            Required columns: <code>Class, Subject, Topic, Question, Option_A, Option_B, Option_C, Option_D, Correct_Answer, Difficulty, Explanation</code>
          </p>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => {
              const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
              setBulkFile(file);
              setBulkFileName(file ? file.name : "");
            }}
          />
          {bulkFileName ? <p style={{ margin: "6px 0", color: "#334155" }}>Selected: {bulkFileName}</p> : null}
          <button onClick={uploadBulkSpreadsheet}>Upload Spreadsheet</button>
        </div>
      </div>

      <div style={cardStyle}>
        <h3>Question Bank Data</h3>
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <select value={questionFilter.className} onChange={(e) => setQuestionFilter({ ...questionFilter, className: e.target.value })}>
            <option value="">Filter by class</option>
            {classOptions.map((c) => <option key={c.id || c.className} value={c.className}>{c.className}</option>)}
          </select>
          <select value={questionFilter.subject} onChange={(e) => setQuestionFilter({ ...questionFilter, subject: e.target.value })}>
            <option value="">Filter by subject</option>
            {(metadata?.subjects || []).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={questionFilter.status} onChange={(e) => setQuestionFilter({ ...questionFilter, status: e.target.value })}>
            <option value="">Filter by status</option>
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
          <button onClick={refreshQuestions}>Apply Filters</button>
        </div>

        {questions.slice(0, 200).map((item) => (
          <div key={item.id} style={{ borderTop: "1px dashed #d7e3f2", marginTop: 8, paddingTop: 8 }}>
            <strong>{item.subjectName || item.subject}</strong>
            <span style={{ marginLeft: 8, color: "#64748b" }}>{item.className || item.classLevel}</span>
            <span style={{ marginLeft: 8, color: item.status === "APPROVED" ? "#14532d" : item.status === "REJECTED" ? "#b91c1c" : "#92400e" }}>[{item.status}]</span>
            <p style={{ margin: "6px 0" }}>{item.questionText || item.question}</p>
            <ol style={{ margin: 0, paddingLeft: 18 }}>
              {(item.options || []).map((opt, idx) => (
                <li key={`${item.id}-${idx}`} style={{ color: Number(item.answerIndex) === idx ? "#14532d" : "#1f2937" }}>{opt}</li>
              ))}
            </ol>
            {isAdmin ? (
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <button onClick={() => handleQuestionApproval(item.id, "approve")}>Approve</button>
                <button onClick={() => handleQuestionApproval(item.id, "reject")}>Reject</button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
  const renderExams = () => (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={cardStyle}>
        <h3>Create Exam</h3>
        <div style={{ display: "grid", gap: 8 }}>
          <input value={examForm.examTitle} onChange={(e) => setExamForm({ ...examForm, examTitle: e.target.value })} placeholder="Exam Title" />
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <select value={examForm.examType} onChange={(e) => handleExamTypeChange(e.target.value)}>
              <option value="CLASS_TEST">Class Test</option>
              <option value="PRACTICE">Practice Test</option>
              <option value="MOCK">Mock Exam</option>
              <option value="PROMOTIONAL">Promotional Exam</option>
              <option value="ENTRANCE">Entrance Exam</option>
              <option value="INTERVIEW">Interview Test</option>
            </select>
            <select value={examForm.targetAudience} onChange={(e) => handleExamAudienceChange(e.target.value)}>
              {audienceOptions.map((audience) => <option key={audience} value={audience}>{getTargetAudienceLabel(audience)}</option>)}
            </select>
            <select
              value={examForm.className}
              disabled={examForm.targetAudience !== "STUDENT"}
              onChange={(e) => setExamForm({ ...examForm, className: e.target.value, subjects: [] })}
            >
              <option value="">Select Class (student exams only)</option>
              {classOptions.map((c) => <option key={c.id || c.className} value={c.className}>{c.className}</option>)}
            </select>
            <input type="number" value={examForm.durationMinutes} onChange={(e) => setExamForm({ ...examForm, durationMinutes: e.target.value })} placeholder="Duration (mins)" />
            <input type="number" value={examForm.totalQuestions} onChange={(e) => setExamForm({ ...examForm, totalQuestions: e.target.value })} placeholder="Total Questions" />
            <input type="number" value={examForm.passMark} onChange={(e) => setExamForm({ ...examForm, passMark: e.target.value })} placeholder="Pass Mark" />
            <input value={examForm.accessCode} onChange={(e) => setExamForm({ ...examForm, accessCode: e.target.value })} placeholder="Access Code (optional)" />
            <input value={examForm.accessPassword} onChange={(e) => setExamForm({ ...examForm, accessPassword: e.target.value })} placeholder="Exam Password" />
            <input type="datetime-local" value={examForm.startTime} onChange={(e) => setExamForm({ ...examForm, startTime: e.target.value })} />
            <input type="datetime-local" value={examForm.endTime} onChange={(e) => setExamForm({ ...examForm, endTime: e.target.value })} />
          </div>

          <p style={{ margin: 0, color: "#64748b" }}>
            Student exams appear only inside the matching student profile after login. Entrance and interview exams use school-issued candidate login IDs in the format ACCESSCODE/application number plus the published exam password.
          </p>

          <div>
            <strong>Subjects</strong>
            <div style={{ display: "grid", gap: 6, marginTop: 6, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              {currentExamSubjects.map((subject) => (
                <label key={subject} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="checkbox" checked={examForm.subjects.includes(subject)} onChange={() => toggleExamSubject(subject)} />
                  <span>{subject}</span>
                </label>
              ))}
            </div>
            {!currentExamSubjects.length ? <p style={{ color: "#64748b", margin: "6px 0 0" }}>No subjects are available for the current audience and class selection yet.</p> : null}
          </div>

          <textarea rows={2} value={examForm.instructions} onChange={(e) => setExamForm({ ...examForm, instructions: e.target.value })} />
          <button onClick={createExamSession}>Create Exam Session</button>
        </div>
      </div>

      <div style={cardStyle}>
        <h3>Exam Sessions</h3>
        {exams.map((exam) => (
          <div key={exam.id} style={{ borderTop: "1px dashed #d7e3f2", marginTop: 8, paddingTop: 8 }}>
            <strong>{exam.examTitle || exam.title}</strong>
            <p style={{ margin: "4px 0" }}>{exam.examType} | {getTargetAudienceLabel(exam.targetAudience)} | {exam.className || "No class link"} | {exam.durationMinutes} mins | {exam.totalQuestions} questions</p>
            <p style={{ margin: "4px 0", color: "#334155" }}>Subjects: {(exam.subjects || []).join(", ")}</p>
            <p style={{ margin: "4px 0", color: "#14532d" }}>Access Code: <strong>{exam.accessCode}</strong> | Password: <strong>{exam.accessPassword}</strong></p>
            {exam.targetAudience !== "STUDENT" ? (
              <p style={{ margin: "4px 0", color: "#64748b" }}>
                Candidate login ID format: <strong>{`${exam.accessCode}/${exam.targetAudience === "ENTRANCE" ? "APPLICATION-NO" : "APP-00001"}`}</strong>
              </p>
            ) : null}
            <p style={{ margin: "4px 0", color: "#92400e" }}>Status: {exam.status} | Assigned Questions: {exam.assignedQuestions || 0}</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button onClick={() => handleExamAction(exam.id, "assign")}>Auto-Assign Questions</button>
              {isAdmin ? <button onClick={() => handleExamAction(exam.id, "publish")}>Publish</button> : null}
              {isAdmin ? <button onClick={() => handleExamAction(exam.id, "close")}>Close</button> : null}
              <Link to="/cbt/exam">{getExamLoginLabel(exam.targetAudience)}</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStudents = () => (
    <div style={cardStyle}>
      <h3>Students</h3>
      {students.length === 0 ? <p>No students linked.</p> : null}
      {students.slice(0, 200).map((student) => (
        <div key={student.id} style={{ borderTop: "1px dashed #d7e3f2", marginTop: 8, paddingTop: 8 }}>
          <strong>{student.name}</strong>
          <p style={{ margin: "4px 0" }}>{student.className || "-"} | {student.studentId || "-"}</p>
          <p style={{ margin: "4px 0", color: "#64748b" }}>Parent: {student.parentPhone || "-"} | Student: {student.studentPhone || "-"}</p>
        </div>
      ))}
    </div>
  );

  const renderResults = () => (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={cardStyle}>
        <h3>Result Filters</h3>
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <select value={resultFilter.className} onChange={(e) => setResultFilter({ ...resultFilter, className: e.target.value })}>
            <option value="">All Classes</option>
            {classOptions.map((c) => <option key={c.id || c.className} value={c.className}>{c.className}</option>)}
          </select>
          <select value={resultFilter.subject} onChange={(e) => setResultFilter({ ...resultFilter, subject: e.target.value })}>
            <option value="">All Subjects</option>
            {(metadata?.subjects || []).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={resultFilter.examId} onChange={(e) => setResultFilter({ ...resultFilter, examId: e.target.value })}>
            <option value="">All Exams</option>
            {exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.examTitle || exam.title}</option>)}
          </select>
          <button onClick={applyResultFilter}>Apply</button>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <h3>Results</h3>
          <button onClick={exportResultsCsv}>Export CSV</button>
        </div>

        {results.length === 0 ? <p>No results yet.</p> : null}
        {results.slice(0, 300).map((item) => (
          <div key={item.attemptId} style={{ borderTop: "1px dashed #d7e3f2", marginTop: 8, paddingTop: 8 }}>
            <strong>{item.candidateName}</strong> <span style={{ color: "#64748b" }}>({item.candidateId})</span>
            <p style={{ margin: "4px 0" }}>{item.examTitle} | Score: {item.score}/{item.totalQuestions} ({item.percentage}%)</p>
            <p style={{ margin: "4px 0", color: item.passed ? "#14532d" : "#b91c1c" }}>{item.passed ? "PASSED" : "FAILED"} | Pass Mark: {item.passMark}%</p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderReports = () => (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={cardStyle}>
        <h3>Top Performers</h3>
        {(analytics.topPerformers || []).slice(0, 10).map((item) => (
          <div key={item.attemptId} style={{ borderTop: "1px dashed #d7e3f2", marginTop: 8, paddingTop: 8 }}>
            <strong>{item.candidateName}</strong>
            <p style={{ margin: "4px 0" }}>{item.className} | {item.examTitle} | {item.percentage}%</p>
          </div>
        ))}
      </div>

      <div style={cardStyle}>
        <h3>Average by Class</h3>
        {(analytics.averageByClass || []).map((item) => (
          <p key={item.className} style={{ margin: "4px 0" }}><strong>{item.className}</strong>: {item.average}% ({item.attempts} attempts)</p>
        ))}
      </div>

      <div style={cardStyle}>
        <h3>Average by Subject</h3>
        {(analytics.averageBySubject || []).map((item) => (
          <p key={item.subjectName} style={{ margin: "4px 0" }}><strong>{item.subjectName}</strong>: {item.average}% ({item.attempts} attempts)</p>
        ))}
      </div>

      <div style={cardStyle}>
        <h3>Topic Weakness</h3>
        {(analytics.topicWeakness || []).slice(0, 15).map((item, idx) => (
          <p key={`${item.subjectName}-${item.topicName}-${idx}`} style={{ margin: "4px 0" }}><strong>{item.subjectName} - {item.topicName}</strong>: {item.failRate}% failed</p>
        ))}
      </div>
    </div>
  );

  const renderSettings = () => (
    <div style={{ ...cardStyle, display: "grid", gap: 8 }}>
      <h3>CBT Settings</h3>
      <input placeholder="School Name" value={settings.schoolName || ""} onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })} />
      <input placeholder="Branding Logo URL" value={settings.brandingLogoUrl || ""} onChange={(e) => setSettings({ ...settings, brandingLogoUrl: e.target.value })} />

      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="checkbox" checked={Boolean(settings?.cbtRules?.allowResultSlipPrint)} onChange={(e) => setSettings({ ...settings, cbtRules: { ...(settings.cbtRules || {}), allowResultSlipPrint: e.target.checked } })} />
        Allow result slip print
      </label>

      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="checkbox" checked={Boolean(settings?.cbtRules?.showCorrectionsAfterSubmit)} onChange={(e) => setSettings({ ...settings, cbtRules: { ...(settings.cbtRules || {}), showCorrectionsAfterSubmit: e.target.checked } })} />
        Show corrections after submit
      </label>

      <button onClick={saveSettings} disabled={!isAdmin}>Save Settings</button>
    </div>
  );

  const moduleTitle = modules.find((m) => m.id === activeModule)?.label || "CBT";
  const renderModule = () => {
    if (activeModule === "overview") return renderOverview();
    if (activeModule === "classes") return renderClasses();
    if (activeModule === "subjects") return renderSubjects();
    if (activeModule === "sessions") return renderSessions();
    if (activeModule === "bank") return renderQuestionBank();
    if (activeModule === "exams") return renderExams();
    if (activeModule === "students") return renderStudents();
    if (activeModule === "results") return renderResults();
    if (activeModule === "reports") return renderReports();
    if (activeModule === "settings") return renderSettings();
    return null;
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f4f8fd", padding: 20 }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", display: "grid", gridTemplateColumns: "260px 1fr", gap: 14 }}>
        <aside style={{ border: "1px solid #d7e3f2", borderRadius: 12, padding: 12, background: "#fff", height: "fit-content" }}>
          <h3 style={{ marginTop: 0 }}>CBT Assessment Desk</h3>
          <p style={{ color: "#64748b", marginTop: 4 }}>{isAdmin ? "Admin / ICT" : "Teacher Portal"}</p>
          <div style={{ display: "grid", gap: 6 }}>
            {modules.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveModule(item.id)}
                style={{
                  textAlign: "left",
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: activeModule === item.id ? "1px solid #0f766e" : "1px solid #dbe7f5",
                  background: activeModule === item.id ? "#e6fffa" : "#fff",
                  fontWeight: activeModule === item.id ? 700 : 500,
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </aside>

        <main style={{ display: "grid", gap: 12 }}>
          <div style={{ border: "1px solid #d7e3f2", borderRadius: 12, padding: 12, background: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div>
                <h2 style={{ margin: 0 }}>{moduleTitle}</h2>
                <p style={{ margin: "4px 0", color: "#64748b" }}>Manage Angel Montessori computer-based assessments from class setup and question banks to exams, results, and performance analysis.</p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link to="/cbt/exam">CBT Exam Login</Link>
                <button onClick={loadEverything} disabled={loading}>{loading ? "Refreshing..." : "Refresh Data"}</button>
              </div>
            </div>
          </div>

          {error ? <p style={{ color: "crimson", margin: 0 }}>{error}</p> : null}
          {message ? <p style={{ color: "#14532d", margin: 0 }}>{message}</p> : null}

          {renderModule()}

          <div style={{ ...cardStyle }}>
            <h3>Attempt Log</h3>
            {(attempts || []).slice(0, 25).map((item) => (
              <div key={item.id} style={{ borderTop: "1px dashed #d7e3f2", marginTop: 8, paddingTop: 8 }}>
                <strong>{item.examTitle}</strong>
                <p style={{ margin: "4px 0" }}>{item.candidateName} ({item.candidateId}) | {item.status} | {item.score}/{item.totalQuestions} ({item.percentage}%)</p>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}














