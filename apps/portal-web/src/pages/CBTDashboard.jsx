import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";
import {
  addCbtExamManualCandidate,
  addCbtQuestion,
  addCbtQuestionsBulk,
  addExam,
  approveCbtQuestion,
  approveCbtQuestionsBulk,
  assignCbtExamQuestions,
  createCbtClass,
  createCbtSession,
  createCbtSubject,
  createCbtTopic,
  deleteCbtExam,
  deleteCbtQuestionsBulk,
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
  rejectCbtQuestion,
  rejectCbtQuestionsBulk,
  submitCbtExamForGeneration,
  syncCbtExamCandidates,
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
const DEFAULT_ASSESSMENT_MODES = ["STUDENT_EXAM", "RECRUITMENT_EXAM"];
const DEFAULT_QUESTION_TYPES = ["mcq_single", "short_answer", "essay", "scenario"];
const DEFAULT_RECRUITMENT_CATEGORIES = ["PRESCHOOL", "BASIC", "SSS"];
const DEFAULT_RECRUITMENT_ASSESSMENT_AREAS = [
  "General Interview",
  "Teaching Aptitude",
  "Classroom Management",
  "Early Years Pedagogy",
  "Basic Classroom Practice",
  "Subject Pedagogy",
  "Educational Technology",
  "Communication Skills",
];
const SCHOOL_TIME_ZONE = "Africa/Lagos";

const TARGET_AUDIENCE_LABELS = {
  STUDENT: "Student Portal",
  ENTRANCE: "Entrance Candidates",
  INTERVIEW: "Interview Candidates",
};

const ASSESSMENT_MODE_LABELS = {
  STUDENT_EXAM: "Student Exam",
  RECRUITMENT_EXAM: "Recruitment Assessment",
};

const QUESTION_TYPE_LABELS = {
  mcq_single: "MCQ (Single Answer)",
  short_answer: "Short Answer",
  essay: "Essay",
  scenario: "Scenario",
};

const RECRUITMENT_CATEGORY_LABELS = {
  PRESCHOOL: "Pre-school Interview",
  BASIC: "Basic Class Interview",
  SSS: "SSS Interview",
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

function getAssessmentModeLabel(value) {
  return ASSESSMENT_MODE_LABELS[String(value || "").trim().toUpperCase()] || "Student Exam";
}

function getQuestionTypeLabel(value) {
  return QUESTION_TYPE_LABELS[String(value || "").trim().toLowerCase()] || "Question";
}

function normalizeOptionValue(item) {
  if (item && typeof item === "object") {
    return String(item.value || item.id || item.code || item.label || item.name || "").trim().toUpperCase();
  }
  return String(item || "").trim().toUpperCase();
}

function getRecruitmentCategoryLabel(value) {
  if (value && typeof value === "object") {
    const normalized = normalizeOptionValue(value);
    return String(value.label || value.name || RECRUITMENT_CATEGORY_LABELS[normalized] || "Recruitment Assessment").trim();
  }
  return RECRUITMENT_CATEGORY_LABELS[normalizeOptionValue(value)] || "Recruitment Assessment";
}

function normalizeSelectOptions(items, labelResolver) {
  const seen = new Set();
  return (Array.isArray(items) ? items : [])
    .map((item) => {
      const value = normalizeOptionValue(item);
      if (!value || seen.has(value)) return null;
      seen.add(value);
      return {
        value,
        label: labelResolver ? labelResolver(item) : value,
      };
    })
    .filter(Boolean);
}

function isRecruitmentAssessmentMode(value) {
  return String(value || "").trim().toUpperCase() === "RECRUITMENT_EXAM";
}

function isObjectiveQuestionType(value) {
  return String(value || "").trim().toLowerCase() === "mcq_single";
}

function getExamStatus(value) {
  return String(value || "DRAFT").trim().toUpperCase();
}

function canAssignExamQuestions(exam) {
  return getExamStatus(exam?.status) === "DRAFT";
}

function getExamAssignmentLockReason(exam) {
  const status = getExamStatus(exam?.status);
  if (status === "DRAFT") return "";
  if (status === "CLOSED") return "This exam is closed. Create a new draft exam or reopen it before assigning questions.";
  if (status === "ARCHIVED") return "This exam is archived. Create a new draft exam before assigning questions.";
  return "Questions can only be assigned while the exam is still in draft status.";
}

function getAssessmentBucketLabel(assessmentMode, plural = false) {
  if (isRecruitmentAssessmentMode(assessmentMode)) {
    return plural ? "Assessment Areas" : "Assessment Area";
  }
  return plural ? "Subjects" : "Subject";
}

function uniqueTextOptions(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((item) => String(item || "").trim()).filter(Boolean))];
}

function getExamLoginLabel(targetAudience) {
  const clean = String(targetAudience || "").trim().toUpperCase();
  if (clean === "ENTRANCE") return "Entrance Exam Login";
  if (clean === "INTERVIEW") return "Interview Test Login";
  return "Student Exam Login";
}

function formatExamDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: SCHOOL_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatExamWindow(startDate, endDate) {
  const start = formatExamDateTime(startDate);
  const end = formatExamDateTime(endDate);
  if (!start && !end) return "Schedule: Open until the school closes the session";
  if (start && end) return `Schedule: ${start} WAT - ${end} WAT`;
  if (start) return `Schedule: Opens ${start} WAT`;
  return `Schedule: Closes ${end} WAT`;
}

function parseBulkLine(line, options = {}) {
  const recruitmentMode = isRecruitmentAssessmentMode(options.assessmentMode);
  const parts = String(line || "").split("||").map((item) => item.trim());
  if (parts.length < 9) return null;
  if (recruitmentMode) {
    const recruitmentCategory = parts[0] || options.recruitmentCategory || "BASIC";
    return {
      Recruitment_Category: recruitmentCategory,
      Assessment_Area: parts[1],
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
    Subject: pick("Subject", "Subject Name", "Assessment Area", "Assessment_Area"),
    Assessment_Area: pick("Assessment Area", "Assessment_Area", "Subject", "Subject Name"),
    Recruitment_Category: pick("Recruitment Category", "Recruitment_Category", "Teaching Category", "Teaching_Category"),
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

function hasActiveQuestionFilter(filters) {
  return [
    filters?.className,
    filters?.subject,
    filters?.status,
    filters?.assessmentMode,
    filters?.recruitmentCategory,
    filters?.questionType,
  ].some((value) => String(value || "").trim());
}

function getQuestionFilterAssessmentMode(filters = {}) {
  if (isRecruitmentAssessmentMode(filters?.assessmentMode)) return "RECRUITMENT_EXAM";
  if (String(filters?.recruitmentCategory || "").trim()) return "RECRUITMENT_EXAM";
  return "STUDENT_EXAM";
}

function buildQuestionFilterSummary(filters) {
  const items = [];
  if (filters?.className) items.push(`Class: ${filters.className}`);
  if (filters?.subject) {
    const bucketLabel = getAssessmentBucketLabel(getQuestionFilterAssessmentMode(filters));
    items.push(`${bucketLabel}: ${filters.subject}`);
  }
  if (filters?.status) items.push(`Status: ${filters.status}`);
  if (filters?.assessmentMode) items.push(`Mode: ${getAssessmentModeLabel(filters.assessmentMode)}`);
  if (filters?.recruitmentCategory) items.push(`Recruitment: ${getRecruitmentCategoryLabel(filters.recruitmentCategory)}`);
  if (filters?.questionType) items.push(`Type: ${getQuestionTypeLabel(filters.questionType)}`);
  return items.join(" | ");
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

  const [questionFilter, setQuestionFilter] = useState({
    className: "",
    subject: "",
    status: "",
    assessmentMode: "",
    recruitmentCategory: "",
    questionType: "",
  });
  const [questionForm, setQuestionForm] = useState({
    assessmentMode: "STUDENT_EXAM",
    recruitmentCategory: "BASIC",
    className: "",
    subjectName: "",
    topicName: "",
    questionType: "mcq_single",
    questionText: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correctAnswer: "A",
    difficulty: "MEDIUM",
    maxScore: "1",
    sampleAnswer: "",
    evaluationRubric: "",
    scenarioContext: "",
    explanation: "",
  });
  const [bulkText, setBulkText] = useState("");
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkFileName, setBulkFileName] = useState("");

  const [examForm, setExamForm] = useState({
    assessmentMode: "STUDENT_EXAM",
    recruitmentCategory: "BASIC",
    appliedRoleFilter: "",
    subjectSpecializationFilter: "",
    examTitle: "",
    examType: "CLASS_TEST",
    targetAudience: "STUDENT",
    className: "",
    subjects: [],
    durationMinutes: "40",
    totalQuestions: "20",
    passMark: "50",
    attemptLimit: "1",
    startTime: "",
    endTime: "",
    instructions: "Answer all questions and submit before time elapses.",
    status: "DRAFT",
  });

  const [resultFilter, setResultFilter] = useState({ className: "", subject: "", examId: "" });
  const [customAssessmentArea, setCustomAssessmentArea] = useState("");
  const [manualCandidateRefs, setManualCandidateRefs] = useState({});
  const [manualCandidateNames, setManualCandidateNames] = useState({});

  const classSubjectMap = useMemo(() => metadata?.classSubjects || {}, [metadata]);
  const audienceOptions = useMemo(() => {
    const items = Array.isArray(metadata?.targetAudiences) && metadata.targetAudiences.length
      ? metadata.targetAudiences
      : DEFAULT_TARGET_AUDIENCES;
    return items.map((item) => String(item || "").trim().toUpperCase()).filter(Boolean);
  }, [metadata]);

  const assessmentModeOptions = useMemo(() => {
    const items = Array.isArray(metadata?.assessmentModes) && metadata.assessmentModes.length
      ? metadata.assessmentModes
      : DEFAULT_ASSESSMENT_MODES;
    return items.map((item) => String(item || "").trim().toUpperCase()).filter(Boolean);
  }, [metadata]);

  const questionTypeOptions = useMemo(() => {
    const items = Array.isArray(metadata?.questionTypes) && metadata.questionTypes.length
      ? metadata.questionTypes
      : DEFAULT_QUESTION_TYPES;
    return items.map((item) => String(item || "").trim().toLowerCase()).filter(Boolean);
  }, [metadata]);

  const recruitmentCategoryOptions = useMemo(() => {
    const items = Array.isArray(metadata?.recruitmentCategories) && metadata.recruitmentCategories.length
      ? metadata.recruitmentCategories
      : DEFAULT_RECRUITMENT_CATEGORIES;
    return normalizeSelectOptions(items, getRecruitmentCategoryLabel);
  }, [metadata]);

  const recruitmentAssessmentAreaOptions = useMemo(() => {
    const items = Array.isArray(metadata?.recruitmentAssessmentAreas) && metadata.recruitmentAssessmentAreas.length
      ? metadata.recruitmentAssessmentAreas
      : DEFAULT_RECRUITMENT_ASSESSMENT_AREAS;
    return uniqueTextOptions(items);
  }, [metadata]);

  const currentQuestionSubjects = useMemo(() => {
    if (isRecruitmentAssessmentMode(questionForm.assessmentMode)) {
      return uniqueTextOptions([...recruitmentAssessmentAreaOptions, questionForm.subjectName]);
    }
    if (!questionForm.className) return metadata?.subjects || [];
    return classSubjectMap[questionForm.className] || metadata?.subjects || [];
  }, [questionForm.assessmentMode, questionForm.className, questionForm.subjectName, classSubjectMap, metadata, recruitmentAssessmentAreaOptions]);

  const currentExamSubjects = useMemo(() => {
    if (isRecruitmentAssessmentMode(examForm.assessmentMode)) {
      return uniqueTextOptions([...recruitmentAssessmentAreaOptions, ...examForm.subjects]);
    }
    if (examForm.targetAudience === "ENTRANCE") return metadata?.admissionDefaultSubjects || [];
    if (examForm.targetAudience !== "STUDENT") return metadata?.subjects || [];
    if (!examForm.className) return metadata?.subjects || [];
    return classSubjectMap[examForm.className] || metadata?.subjects || [];
  }, [examForm.assessmentMode, examForm.className, examForm.targetAudience, examForm.subjects, classSubjectMap, metadata, recruitmentAssessmentAreaOptions]);

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
  const activeQuestionFilterSummary = useMemo(() => buildQuestionFilterSummary(questionFilter), [questionFilter]);
  const questionFilterAssessmentMode = useMemo(
    () => getQuestionFilterAssessmentMode(questionFilter),
    [questionFilter]
  );
  const questionFilterBucketLabel = useMemo(
    () => getAssessmentBucketLabel(questionFilterAssessmentMode),
    [questionFilterAssessmentMode]
  );
  const isRecruitmentQuestionFilter = useMemo(
    () => isRecruitmentAssessmentMode(questionFilterAssessmentMode),
    [questionFilterAssessmentMode]
  );
  const currentQuestionFilterSubjects = useMemo(() => {
    if (isRecruitmentQuestionFilter) {
      const visibleAreas = questions
        .filter((item) => isRecruitmentAssessmentMode(item.assessmentMode || questionFilterAssessmentMode))
        .filter((item) => (
          !questionFilter.recruitmentCategory
          || String(item.recruitmentCategory || "").trim().toUpperCase() === String(questionFilter.recruitmentCategory || "").trim().toUpperCase()
        ))
        .map((item) => item.subjectName || item.subject || "");
      return uniqueTextOptions([
        ...recruitmentAssessmentAreaOptions,
        ...visibleAreas,
        questionFilter.subject,
      ]);
    }
    if (questionFilter.className) return classSubjectMap[questionFilter.className] || metadata?.subjects || [];
    return metadata?.subjects || [];
  }, [
    classSubjectMap,
    isRecruitmentQuestionFilter,
    metadata,
    questionFilter.className,
    questionFilter.recruitmentCategory,
    questionFilter.subject,
    questionFilterAssessmentMode,
    questions,
    recruitmentAssessmentAreaOptions,
  ]);
  const canBulkDeleteFilteredQuestions = useMemo(
    () => hasActiveQuestionFilter(questionFilter) && questions.length > 0,
    [questionFilter, questions.length]
  );
  const canBulkModerateFilteredQuestions = useMemo(
    () => isAdmin && hasActiveQuestionFilter(questionFilter) && questions.length > 0,
    [isAdmin, questionFilter, questions.length]
  );
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

  const resetQuestionFilters = async () => {
    const nextFilters = {
      className: "",
      subject: "",
      status: "",
      assessmentMode: "",
      recruitmentCategory: "",
      questionType: "",
    };
    setQuestionFilter(nextFilters);
    const res = await getCbtQuestions(nextFilters);
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
      return setError(`${getAssessmentBucketLabel(questionForm.assessmentMode)} and question text are required.`);
    }
    if (isRecruitmentAssessmentMode(questionForm.assessmentMode) && !questionForm.recruitmentCategory) {
      return setError("Select a recruitment category for this question.");
    }
    if (!isObjectiveQuestionType(questionForm.questionType) && !questionForm.maxScore) {
      return setError("Set a score value for this question.");
    }

    try {
      setError("");
      setMessage("");
      await addCbtQuestion(questionForm);
      setQuestionForm({
        ...questionForm,
        className: isRecruitmentAssessmentMode(questionForm.assessmentMode) ? "" : questionForm.className,
        questionText: "",
        optionA: "",
        optionB: "",
        optionC: "",
        optionD: "",
        sampleAnswer: "",
        evaluationRubric: "",
        scenarioContext: "",
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
      const parsed = parseBulkLine(line, {
        assessmentMode: questionForm.assessmentMode,
        recruitmentCategory: questionForm.recruitmentCategory,
      });
      if (!parsed) invalid.push(idx + 1);
      else rows.push(parsed);
    });

    if (!rows.length) {
      return setError(
        isRecruitmentAssessmentMode(questionForm.assessmentMode)
          ? "No valid rows found. Format: Recruitment_Category||Assessment_Area||Topic||Question||A||B||C||D||Correct||Difficulty||Explanation"
          : "No valid rows found. Format: Class||Subject||Topic||Question||A||B||C||D||Correct||Difficulty||Explanation"
      );
    }

    try {
      setError("");
      setMessage("");
      const res = await addCbtQuestionsBulk({
        rows,
        assessmentMode: questionForm.assessmentMode,
        recruitmentCategory: questionForm.recruitmentCategory,
      });
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
          row.Subject && row.Question && row.Option_A && row.Option_B && row.Correct_Answer
          && (
            !isRecruitmentAssessmentMode(questionForm.assessmentMode)
            || row.Recruitment_Category
            || questionForm.recruitmentCategory
          )
          && (
            isRecruitmentAssessmentMode(questionForm.assessmentMode)
            || row.Class
          )
        ));
      const invalidCount = parsedRows.length - validRows.length;

      if (!validRows.length) {
        return setError("No valid rows found in spreadsheet. Check required columns and values.");
      }

        const res = await addCbtQuestionsBulk({
          rows: validRows,
          assessmentMode: questionForm.assessmentMode,
          recruitmentCategory: questionForm.recruitmentCategory,
        });
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
      setMessage(`Question ${mode === "approve" ? "approved" : "rejected"}.`);
      await refreshQuestions();
    } catch (e) {
      setError(e?.response?.data?.message || `Failed to ${mode} question`);
    }
  };

  const handleBulkModerateQuestions = async (mode) => {
    if (!hasActiveQuestionFilter(questionFilter)) {
      return setError(`Set at least one question-bank filter before bulk ${mode}.`);
    }
    if (!questions.length) {
      return setError("No questions match the current filters.");
    }

    const verb = mode === "approve" ? "approve" : "reject";
    const confirmed = window.confirm(
      `${verb.charAt(0).toUpperCase() + verb.slice(1)} ${questions.length} filtered question${questions.length === 1 ? "" : "s"}?\n\nScope: ${activeQuestionFilterSummary || "Current filters"}`
    );
    if (!confirmed) return;

    try {
      setError("");
      setMessage("");
      const res = mode === "approve"
        ? await approveCbtQuestionsBulk({ filters: questionFilter })
        : await rejectCbtQuestionsBulk({ filters: questionFilter });
      const updated = Number(res?.data?.updated || 0);
      setMessage(`${mode === "approve" ? "Approved" : "Rejected"} ${updated} filtered question${updated === 1 ? "" : "s"}.`);
      await refreshQuestions();
    } catch (e) {
      setError(e?.response?.data?.message || `Failed to bulk ${mode} filtered questions`);
    }
  };

  const handleBulkDeleteQuestions = async () => {
    if (!hasActiveQuestionFilter(questionFilter)) {
      return setError("Set at least one question-bank filter before bulk delete.");
    }
    if (!questions.length) {
      return setError("No questions match the current filters.");
    }

    const confirmed = window.confirm(
      `Delete ${questions.length} question${questions.length === 1 ? "" : "s"} from the question bank?\n\nScope: ${activeQuestionFilterSummary || "Current filters"}\n\nThis cannot be undone.`
    );
    if (!confirmed) return;

    try {
      setError("");
      setMessage("");
      const res = await deleteCbtQuestionsBulk({ filters: questionFilter });
      const deleted = Number(res?.data?.deleted || 0);
      setMessage(`Deleted ${deleted} filtered question${deleted === 1 ? "" : "s"} from the question bank.`);
      await refreshQuestions();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to delete filtered questions");
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
    const assessmentMode = targetAudience === "INTERVIEW" ? "RECRUITMENT_EXAM" : "STUDENT_EXAM";
    setExamForm((prev) => ({
      ...prev,
      assessmentMode,
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
      const assessmentMode = nextAudience === "INTERVIEW" ? "RECRUITMENT_EXAM" : "STUDENT_EXAM";

      return {
        ...prev,
        assessmentMode,
        targetAudience: nextAudience,
        examType: nextExamType,
        className: nextAudience === "STUDENT" ? prev.className : "",
        subjects: [],
      };
    });
  };

  const addCustomExamSubject = () => {
    const value = String(customAssessmentArea || "").trim();
    if (!value) return;
    setExamForm((prev) => (
      prev.subjects.includes(value)
        ? prev
        : { ...prev, subjects: [...prev.subjects, value] }
    ));
    setCustomAssessmentArea("");
  };

  const handleExamAssessmentModeChange = (nextMode) => {
    const recruitmentMode = isRecruitmentAssessmentMode(nextMode);
    setExamForm((prev) => ({
      ...prev,
      assessmentMode: nextMode,
      examType: recruitmentMode ? "INTERVIEW" : (prev.examType === "INTERVIEW" ? "CLASS_TEST" : prev.examType),
      targetAudience: recruitmentMode ? "INTERVIEW" : (prev.targetAudience === "INTERVIEW" ? "STUDENT" : prev.targetAudience),
      className: recruitmentMode ? "" : prev.className,
      subjects: [],
    }));
  };

  const createExamSession = async () => {
    if (!examForm.examTitle.trim()) {
      return setError("Exam title is required.");
    }
    if (!isRecruitmentAssessmentMode(examForm.assessmentMode) && !examForm.className) {
      return setError("Select the target class or applicant cohort.");
    }
    if (isRecruitmentAssessmentMode(examForm.assessmentMode) && !examForm.recruitmentCategory) {
      return setError("Select the recruitment category for this assessment.");
    }
    if (!examForm.subjects.length) {
      return setError(`Select at least one ${getAssessmentBucketLabel(examForm.assessmentMode).toLowerCase()}.`);
    }

    try {
      setError("");
      setMessage("");
      const payload = {
        ...examForm,
        className: isRecruitmentAssessmentMode(examForm.assessmentMode) ? "" : examForm.className,
        targetAudience: examForm.targetAudience,
        durationMinutes: Number(examForm.durationMinutes || 40),
        totalQuestions: Number(examForm.totalQuestions || 20),
        passMark: Number(examForm.passMark || 50),
        attemptLimit: Number(examForm.attemptLimit || 1),
        startTime: examForm.startTime || undefined,
        endTime: examForm.endTime || undefined,
        status: "DRAFT",
      };
      const res = await addExam(payload);
        setExamForm({
        assessmentMode: examForm.assessmentMode,
        recruitmentCategory: examForm.recruitmentCategory || "BASIC",
        appliedRoleFilter: examForm.appliedRoleFilter || "",
        subjectSpecializationFilter: examForm.subjectSpecializationFilter || "",
        examTitle: "",
        examType: isRecruitmentAssessmentMode(examForm.assessmentMode) ? "INTERVIEW" : "CLASS_TEST",
        targetAudience: isRecruitmentAssessmentMode(examForm.assessmentMode) ? "INTERVIEW" : "STUDENT",
        className: isRecruitmentAssessmentMode(examForm.assessmentMode) ? "" : examForm.className,
        subjects: [],
        durationMinutes: "40",
        totalQuestions: "20",
        passMark: "50",
        attemptLimit: "1",
        startTime: "",
        endTime: "",
        instructions: "Answer all questions and submit before time elapses.",
        status: "DRAFT",
        });
        setCustomAssessmentArea("");
        setMessage(`Exam draft created${res?.data?.examCode ? ` with code ${res.data.examCode}` : ""}.`);
        await refreshExams();
      await loadEverything();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to create exam draft");
    }
  };

  const handleExamAction = async (examId, action) => {
    try {
      setError("");
      setMessage("");
      const exam = exams.find((item) => String(item.id) === String(examId));
      if (action === "delete") {
        const title = exam?.examTitle || exam?.title || "this exam";
        const ok = window.confirm(`Delete the closed exam "${title}"? This removes its candidate links, credentials, assigned questions, attempts, and CBT audit records.`);
        if (!ok) return;
        await deleteCbtExam(examId);
        setMessage("Closed exam deleted.");
        await refreshExams();
        await loadEverything();
        return;
      }
      if (action === "assign") {
        if (!canAssignExamQuestions(exam)) {
          return setError(getExamAssignmentLockReason(exam));
        }
        const res = await assignCbtExamQuestions(examId, {});
        const assigned = Number(res?.data?.assigned || res?.data?.summary?.assignedQuestions || 0);
        setMessage(`Assigned ${assigned} question(s) to this exam.`);
      }
      if (action === "sync") {
        const res = await syncCbtExamCandidates(examId, {});
        const data = res?.data || {};
        const diagnostics = data.diagnostics || null;
        const syncNotes = [];
        if (diagnostics) {
          syncNotes.push(`Source check: ${Number(diagnostics.careerApplications || 0)} applications, ${Number(diagnostics.activeCareerInterviews || 0)} active interviews, ${Number(diagnostics.matchedCandidates || 0)} matched for ${diagnostics.examCategory || "this exam"}.`);
          if (Array.isArray(diagnostics.matchedNames) && diagnostics.matchedNames.length > 0) {
            syncNotes.push(`Matched: ${diagnostics.matchedNames.join(", ")}.`);
          }
          if (Array.isArray(diagnostics.duplicateInterviewApplicationIds) && diagnostics.duplicateInterviewApplicationIds.length > 0) {
            syncNotes.push("Some interview schedules are for the same applicant.");
          }
        }
        setMessage(`Synced ${Number(data.total || 0)} candidate(s): ${Number(data.added || 0)} added, ${Number(data.removed || 0)} removed.${syncNotes.length ? ` ${syncNotes.join(" ")}` : ""}`);
      }
      if (action === "submit") {
        await submitCbtExamForGeneration(examId, {});
        setMessage("Exam submitted to the Academic Officer for credential generation.");
      }
      await refreshExams();
      await loadEverything();
    } catch (e) {
      setError(e?.response?.data?.message || `Failed to ${action} exam`);
    }
  };

  const addManualInterviewCandidate = async (exam) => {
    const examId = exam?.id;
    const candidateRef = String(manualCandidateRefs[examId] || "").trim();
    const fullName = String(manualCandidateNames[examId] || "").trim();

    if (!examId) return;
    if (!candidateRef) {
      return setError("Enter the applicant ID, application number, email, or applicant username.");
    }

    try {
      setError("");
      setMessage("");
      const response = await addCbtExamManualCandidate(examId, {
        candidateType: "APPLICANT",
        candidateRef,
        fullName,
      });
      setManualCandidateRefs((prev) => ({ ...prev, [examId]: "" }));
      setManualCandidateNames((prev) => ({ ...prev, [examId]: "" }));
      setMessage(response?.data?.message || "Candidate added to this interview.");
      await refreshExams();
      await loadEverything();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to add candidate manually");
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
            <select value={questionForm.assessmentMode} onChange={(e) => setQuestionForm({ ...questionForm, assessmentMode: e.target.value, className: "", subjectName: "", recruitmentCategory: questionForm.recruitmentCategory || "BASIC" })}>
              {assessmentModeOptions.map((mode) => <option key={mode} value={mode}>{getAssessmentModeLabel(mode)}</option>)}
            </select>
            {isRecruitmentAssessmentMode(questionForm.assessmentMode) ? (
              <select value={questionForm.recruitmentCategory} onChange={(e) => setQuestionForm({ ...questionForm, recruitmentCategory: e.target.value })}>
                {recruitmentCategoryOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            ) : (
              <select value={questionForm.className} onChange={(e) => setQuestionForm({ ...questionForm, className: e.target.value, subjectName: "" })}>
                <option value="">Select Class</option>
                {classOptions.map((c) => <option key={c.id || c.className} value={c.className}>{c.className}</option>)}
              </select>
            )}
            <select value={questionForm.questionType} onChange={(e) => setQuestionForm({ ...questionForm, questionType: e.target.value, maxScore: e.target.value === "mcq_single" ? "1" : questionForm.maxScore || "10" })}>
              {questionTypeOptions.map((type) => <option key={type} value={type}>{getQuestionTypeLabel(type)}</option>)}
            </select>
            {isRecruitmentAssessmentMode(questionForm.assessmentMode) ? (
              <>
                <input
                  list="cbt-recruitment-assessment-areas"
                  value={questionForm.subjectName}
                  onChange={(e) => setQuestionForm({ ...questionForm, subjectName: e.target.value })}
                  placeholder="Assessment Area (e.g. Teaching Aptitude)"
                />
                <datalist id="cbt-recruitment-assessment-areas">
                  {currentQuestionSubjects.map((s) => <option key={s} value={s} />)}
                </datalist>
              </>
            ) : (
              <select value={questionForm.subjectName} onChange={(e) => setQuestionForm({ ...questionForm, subjectName: e.target.value })}>
                <option value="">Select Subject</option>
                {currentQuestionSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            <input placeholder="Topic" value={questionForm.topicName} onChange={(e) => setQuestionForm({ ...questionForm, topicName: e.target.value })} />
            <select value={questionForm.difficulty} onChange={(e) => setQuestionForm({ ...questionForm, difficulty: e.target.value })}>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>

          <textarea rows={3} placeholder="Question text" value={questionForm.questionText} onChange={(e) => setQuestionForm({ ...questionForm, questionText: e.target.value })} />

          {isObjectiveQuestionType(questionForm.questionType) ? (
            <>
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
                <input type="number" min="1" value={questionForm.maxScore} onChange={(e) => setQuestionForm({ ...questionForm, maxScore: e.target.value })} placeholder="Score Value" />
              </div>
            </>
          ) : (
            <>
              <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                <input type="number" min="1" value={questionForm.maxScore} onChange={(e) => setQuestionForm({ ...questionForm, maxScore: e.target.value })} placeholder="Maximum Score" />
                <input placeholder="Short sample answer" value={questionForm.sampleAnswer} onChange={(e) => setQuestionForm({ ...questionForm, sampleAnswer: e.target.value })} />
              </div>
              {questionForm.questionType === "scenario" ? (
                <textarea rows={3} placeholder="Scenario context" value={questionForm.scenarioContext} onChange={(e) => setQuestionForm({ ...questionForm, scenarioContext: e.target.value })} />
              ) : null}
              <textarea rows={3} placeholder="Evaluation rubric" value={questionForm.evaluationRubric} onChange={(e) => setQuestionForm({ ...questionForm, evaluationRubric: e.target.value })} />
            </>
          )}

          <textarea rows={2} placeholder="Explanation (optional)" value={questionForm.explanation} onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })} />
          <button onClick={uploadQuestion}>Upload Question</button>
        </div>
      </div>

        <div style={cardStyle}>
          <h3>Bulk Upload (Standard Format)</h3>
          <p style={{ color: "#64748b", margin: "4px 0" }}>
            Text format: <code>{isRecruitmentAssessmentMode(questionForm.assessmentMode)
              ? "Recruitment_Category||Assessment_Area||Topic||Question||Option A||Option B||Option C||Option D||Correct||Difficulty||Explanation"
              : "Class||Subject||Topic||Question||Option A||Option B||Option C||Option D||Correct||Difficulty||Explanation"}</code>
          </p>
          <textarea rows={6} value={bulkText} onChange={(e) => setBulkText(e.target.value)} style={{ width: "100%" }} />
          <button onClick={uploadBulkQuestions} style={{ marginTop: 8 }}>Upload Text Bulk Questions</button>

          <div style={{ marginTop: 12, borderTop: "1px dashed #d7e3f2", paddingTop: 10 }}>
            <strong>Upload Excel / CSV File</strong>
            <p style={{ color: "#64748b", margin: "6px 0" }}>
              Required columns: <code>{isRecruitmentAssessmentMode(questionForm.assessmentMode)
                ? "Recruitment_Category, Assessment_Area, Topic, Question, Option_A, Option_B, Option_C, Option_D, Correct_Answer, Difficulty, Explanation"
                : "Class, Subject, Topic, Question, Option_A, Option_B, Option_C, Option_D, Correct_Answer, Difficulty, Explanation"}</code>
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
          <select
            value={questionFilter.className}
            disabled={isRecruitmentQuestionFilter}
            onChange={(e) => setQuestionFilter({ ...questionFilter, className: e.target.value })}
          >
            <option value="">Filter by class</option>
            {classOptions.map((c) => <option key={c.id || c.className} value={c.className}>{c.className}</option>)}
          </select>
          <select value={questionFilter.subject} onChange={(e) => setQuestionFilter({ ...questionFilter, subject: e.target.value })}>
            <option value="">{`Filter by ${questionFilterBucketLabel.toLowerCase()}`}</option>
            {currentQuestionFilterSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={questionFilter.status} onChange={(e) => setQuestionFilter({ ...questionFilter, status: e.target.value })}>
            <option value="">Filter by status</option>
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
          <select
            value={questionFilter.assessmentMode}
            onChange={(e) => {
              const nextMode = e.target.value;
              setQuestionFilter({
                ...questionFilter,
                assessmentMode: nextMode,
                recruitmentCategory: nextMode === "RECRUITMENT_EXAM" ? questionFilter.recruitmentCategory : "",
                subject: "",
                className: nextMode === "RECRUITMENT_EXAM" ? "" : questionFilter.className,
              });
            }}
          >
            <option value="">Filter by assessment mode</option>
            {assessmentModeOptions.map((mode) => <option key={mode} value={mode}>{getAssessmentModeLabel(mode)}</option>)}
          </select>
          <select value={questionFilter.questionType} onChange={(e) => setQuestionFilter({ ...questionFilter, questionType: e.target.value })}>
            <option value="">Filter by question type</option>
            {questionTypeOptions.map((type) => <option key={type} value={type}>{getQuestionTypeLabel(type)}</option>)}
          </select>
          <select
            value={questionFilter.recruitmentCategory}
            onChange={(e) => setQuestionFilter({
              ...questionFilter,
              recruitmentCategory: e.target.value,
              assessmentMode: e.target.value ? "RECRUITMENT_EXAM" : questionFilter.assessmentMode,
              subject: "",
              className: e.target.value ? "" : questionFilter.className,
            })}
          >
            <option value="">Filter by recruitment category</option>
            {recruitmentCategoryOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <button onClick={refreshQuestions}>Apply Filters</button>
          <button onClick={resetQuestionFilters} style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: 10 }}>Reset Filters</button>
        </div>

        {isAdmin ? (
          <div style={{ marginTop: 12, border: "1px solid #bfdbfe", background: "#eff6ff", borderRadius: 12, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <strong style={{ color: "#1d4ed8" }}>Bulk Review Filtered Questions</strong>
                <p style={{ margin: "6px 0 0", color: "#1e3a8a" }}>
                  Approve or reject only the questions currently matched by the active filters.
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={() => handleBulkModerateQuestions("approve")}
                  disabled={!canBulkModerateFilteredQuestions}
                  style={{
                    background: canBulkModerateFilteredQuestions ? "#166534" : "#bbf7d0",
                    color: canBulkModerateFilteredQuestions ? "#fff" : "#14532d",
                    border: "none",
                    borderRadius: 10,
                    padding: "10px 16px",
                    cursor: canBulkModerateFilteredQuestions ? "pointer" : "not-allowed",
                  }}
                >
                  Approve {questions.length || 0} Filtered Question{questions.length === 1 ? "" : "s"}
                </button>
                <button
                  onClick={() => handleBulkModerateQuestions("reject")}
                  disabled={!canBulkModerateFilteredQuestions}
                  style={{
                    background: canBulkModerateFilteredQuestions ? "#92400e" : "#fde68a",
                    color: canBulkModerateFilteredQuestions ? "#fff" : "#78350f",
                    border: "none",
                    borderRadius: 10,
                    padding: "10px 16px",
                    cursor: canBulkModerateFilteredQuestions ? "pointer" : "not-allowed",
                  }}
                >
                  Reject {questions.length || 0} Filtered Question{questions.length === 1 ? "" : "s"}
                </button>
              </div>
            </div>
            <p style={{ margin: "10px 0 0", color: "#1e3a8a" }}>
              {activeQuestionFilterSummary
                ? `Current review scope: ${activeQuestionFilterSummary}`
                : "Select at least one filter before bulk approval or rejection is enabled."}
            </p>
          </div>
        ) : null}

        <div style={{ marginTop: 12, border: "1px solid #fecaca", background: "#fff5f5", borderRadius: 12, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <strong style={{ color: "#991b1b" }}>Bulk Delete Filtered Questions</strong>
              <p style={{ margin: "6px 0 0", color: "#7f1d1d" }}>
                Remove only the questions currently matched by the active filters. Existing exam snapshots stay intact.
              </p>
            </div>
            <button
              onClick={handleBulkDeleteQuestions}
              disabled={!canBulkDeleteFilteredQuestions}
              style={{
                background: canBulkDeleteFilteredQuestions ? "#b91c1c" : "#fecaca",
                color: canBulkDeleteFilteredQuestions ? "#fff" : "#7f1d1d",
                border: "none",
                borderRadius: 10,
                padding: "10px 16px",
                cursor: canBulkDeleteFilteredQuestions ? "pointer" : "not-allowed",
              }}
            >
              Delete {questions.length || 0} Filtered Question{questions.length === 1 ? "" : "s"}
            </button>
          </div>
          <p style={{ margin: "10px 0 0", color: "#991b1b" }}>
            {activeQuestionFilterSummary
              ? `Current delete scope: ${activeQuestionFilterSummary}`
              : "Select at least one filter before bulk delete is enabled."}
          </p>
        </div>

        {questions.slice(0, 200).map((item) => (
          <div key={item.id} style={{ borderTop: "1px dashed #d7e3f2", marginTop: 8, paddingTop: 8 }}>
            <strong>{item.subjectName || item.subject}</strong>
            <span style={{ marginLeft: 8, color: "#64748b" }}>{item.className || item.classLevel || getRecruitmentCategoryLabel(item.recruitmentCategory)}</span>
            <span style={{ marginLeft: 8, color: item.status === "APPROVED" ? "#14532d" : item.status === "REJECTED" ? "#b91c1c" : "#92400e" }}>[{item.status}]</span>
            <span style={{ marginLeft: 8, color: "#1d4ed8" }}>{getAssessmentModeLabel(item.assessmentMode)}</span>
            <span style={{ marginLeft: 8, color: "#475569" }}>{getQuestionTypeLabel(item.questionType)}</span>
            <p style={{ margin: "6px 0" }}>{item.questionText || item.question}</p>
            {(item.options || []).length ? (
              <ol style={{ margin: 0, paddingLeft: 18 }}>
                {(item.options || []).map((opt, idx) => (
                  <li key={`${item.id}-${idx}`} style={{ color: Number(item.answerIndex) === idx ? "#14532d" : "#1f2937" }}>{opt}</li>
                ))}
              </ol>
            ) : (
              <div style={{ display: "grid", gap: 6, color: "#475569" }}>
                {item.scenarioContext ? <p style={{ margin: 0 }}><strong>Scenario:</strong> {item.scenarioContext}</p> : null}
                {item.sampleAnswer ? <p style={{ margin: 0 }}><strong>Guide:</strong> {item.sampleAnswer}</p> : null}
                {item.evaluationRubric ? <p style={{ margin: 0 }}><strong>Rubric:</strong> {item.evaluationRubric}</p> : null}
              </div>
            )}
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
            <select value={examForm.assessmentMode} onChange={(e) => handleExamAssessmentModeChange(e.target.value)}>
              {assessmentModeOptions.map((mode) => <option key={mode} value={mode}>{getAssessmentModeLabel(mode)}</option>)}
            </select>
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
            {isRecruitmentAssessmentMode(examForm.assessmentMode) ? (
              <select value={examForm.recruitmentCategory} onChange={(e) => setExamForm({ ...examForm, recruitmentCategory: e.target.value })}>
                {recruitmentCategoryOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            ) : (
              <select
                value={examForm.className}
                onChange={(e) => setExamForm({ ...examForm, className: e.target.value, subjects: [] })}
              >
                <option value="">Select Class / Candidate Cohort</option>
                {classOptions.map((c) => <option key={c.id || c.className} value={c.className}>{c.className}</option>)}
              </select>
            )}
            <input type="number" value={examForm.durationMinutes} onChange={(e) => setExamForm({ ...examForm, durationMinutes: e.target.value })} placeholder="Duration (mins)" />
            <input type="number" value={examForm.totalQuestions} onChange={(e) => setExamForm({ ...examForm, totalQuestions: e.target.value })} placeholder="Total Questions" />
            <input type="number" value={examForm.passMark} onChange={(e) => setExamForm({ ...examForm, passMark: e.target.value })} placeholder="Pass Mark" />
            <input type="number" min="1" max="5" value={examForm.attemptLimit} onChange={(e) => setExamForm({ ...examForm, attemptLimit: e.target.value })} placeholder="Attempt Limit" />
            <input type="datetime-local" value={examForm.startTime} onChange={(e) => setExamForm({ ...examForm, startTime: e.target.value })} />
            <input type="datetime-local" value={examForm.endTime} onChange={(e) => setExamForm({ ...examForm, endTime: e.target.value })} />
            {isRecruitmentAssessmentMode(examForm.assessmentMode) ? (
              <>
                <input value={examForm.appliedRoleFilter} onChange={(e) => setExamForm({ ...examForm, appliedRoleFilter: e.target.value })} placeholder="Applied Role Filter (optional)" />
                <input value={examForm.subjectSpecializationFilter} onChange={(e) => setExamForm({ ...examForm, subjectSpecializationFilter: e.target.value })} placeholder="Subject Specialization Filter (optional)" />
              </>
            ) : null}
          </div>

          <p style={{ margin: 0, color: "#64748b" }}>
            Start and end times are saved in school time (WAT).
          </p>

          <p style={{ margin: 0, color: "#64748b" }}>
            Teachers create draft exams here, assign questions, and submit them when they are ready. Academic Officers and Super Admins generate credentials, publish access, export slips, and handle resets.
          </p>
            {isRecruitmentAssessmentMode(examForm.assessmentMode) ? (
              <p style={{ margin: 0, color: "#1d4ed8" }}>
                Recruitment assessments use applicant profiles instead of class rosters. Define clear assessment areas and optionally narrow the shortlist by role or subject specialization.
              </p>
            ) : null}

            <div>
              <strong>{getAssessmentBucketLabel(examForm.assessmentMode, true)}</strong>
              <div style={{ display: "grid", gap: 6, marginTop: 6, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                {currentExamSubjects.map((subject) => (
                  <label key={subject} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="checkbox" checked={examForm.subjects.includes(subject)} onChange={() => toggleExamSubject(subject)} />
                    <span>{subject}</span>
                  </label>
                ))}
              </div>
              {isRecruitmentAssessmentMode(examForm.assessmentMode) ? (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                  <input
                    value={customAssessmentArea}
                    onChange={(e) => setCustomAssessmentArea(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomExamSubject();
                      }
                    }}
                    placeholder="Add custom assessment area"
                  />
                  <button type="button" onClick={addCustomExamSubject}>Add Assessment Area</button>
                </div>
              ) : null}
              {!currentExamSubjects.length ? (
                <p style={{ color: "#64748b", margin: "6px 0 0" }}>
                  {isRecruitmentAssessmentMode(examForm.assessmentMode)
                    ? "No assessment areas are available yet. Add one above or upload recruitment questions first."
                    : "No subjects are available for the current audience and class selection yet."}
                </p>
              ) : null}
            </div>

          <textarea rows={2} value={examForm.instructions} onChange={(e) => setExamForm({ ...examForm, instructions: e.target.value })} />
          <button onClick={createExamSession}>Create Exam Draft</button>
        </div>
      </div>

      <div style={cardStyle}>
        <h3>Exam Sessions</h3>
        {exams.map((exam) => {
          const canAssign = canAssignExamQuestions(exam);
          const assignLockReason = getExamAssignmentLockReason(exam);
          const examStatus = getExamStatus(exam.status);
          const canDeleteClosedExam = isAdmin && ["CLOSED", "ARCHIVED"].includes(examStatus);
          const canSubmitForCredentials = ["DRAFT", "READY_FOR_GENERATION"].includes(examStatus);
          const canSyncCandidates = !["CLOSED", "ARCHIVED"].includes(examStatus);
          return (
            <div key={exam.id} style={{ borderTop: "1px dashed #d7e3f2", marginTop: 8, paddingTop: 8 }}>
              <strong>{exam.examTitle || exam.title}</strong>
                <p style={{ margin: "4px 0" }}>{exam.examType} | {getTargetAudienceLabel(exam.targetAudience)} | {exam.className || exam.recruitmentCategoryLabel || "No class link"} | {exam.durationMinutes} mins | {exam.totalQuestions} questions</p>
                <p style={{ margin: "4px 0", color: "#475569" }}>Assessment Mode: {getAssessmentModeLabel(exam.assessmentMode)}{exam.recruitmentCategoryLabel ? ` | ${exam.recruitmentCategoryLabel}` : ""}</p>
                <p style={{ margin: "4px 0", color: "#334155" }}>{getAssessmentBucketLabel(exam.assessmentMode, true)}: {(exam.subjects || []).join(", ")}</p>
              <p style={{ margin: "4px 0", color: "#14532d" }}>Exam Code: <strong>{exam.examCode || exam.accessCode || "-"}</strong></p>
              <p style={{ margin: "4px 0", color: "#1d4ed8" }}>{formatExamWindow(exam.startTime, exam.endTime)}</p>
              <p style={{ margin: "4px 0", color: "#92400e" }}>Status: {exam.status} | Assigned Questions: {exam.assignedQuestions || 0} | Candidates: {exam.totalCandidates || 0} | Generated: {exam.generatedCount || 0}</p>
              {!canAssign && (exam.assignedQuestions || 0) === 0 ? (
                <p style={{ margin: "4px 0", color: "#b91c1c" }}>{assignLockReason}</p>
              ) : null}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button
                  disabled={!canAssign}
                  title={assignLockReason}
                  onClick={() => handleExamAction(exam.id, "assign")}
                >
                  {canAssign ? "Auto-Assign Questions" : "Auto-Assign Locked"}
                </button>
                <button
                  disabled={!canSyncCandidates}
                  title={canSyncCandidates ? "" : "Closed exams cannot be synced. Delete the closed exam or create a new interview."}
                  onClick={() => handleExamAction(exam.id, "sync")}
                >
                  Sync Candidates
                </button>
                <button
                  disabled={!canSubmitForCredentials}
                  title={canSubmitForCredentials ? "" : "Only draft or ready exams can be submitted for credential generation."}
                  onClick={() => handleExamAction(exam.id, "submit")}
                >
                  Submit for Credentials
                </button>
                <Link to="/cbt/exam">{getExamLoginLabel(exam.targetAudience)}</Link>
                {canDeleteClosedExam ? (
                  <button
                    type="button"
                    onClick={() => handleExamAction(exam.id, "delete")}
                    style={{ background: "#b91c1c", color: "#fff", borderColor: "#991b1b" }}
                  >
                    Delete Closed Exam
                  </button>
                ) : null}
              </div>
              {isRecruitmentAssessmentMode(exam.assessmentMode) && canSyncCandidates ? (
                <div style={{ marginTop: 10, padding: 10, border: "1px solid #dbeafe", borderRadius: 10, background: "#f8fbff" }}>
                  <strong style={{ display: "block", marginBottom: 6 }}>Manually add interview candidate</strong>
                  <p style={{ margin: "0 0 8px", color: "#64748b" }}>
                    Use this when a valid applicant should sit for this interview even if the automatic filter does not match.
                  </p>
                  <div style={{ display: "grid", gap: 8, gridTemplateColumns: "minmax(220px, 1.1fr) minmax(220px, 1fr) auto" }}>
                    <input
                      placeholder="Applicant ID / application no / email"
                      value={manualCandidateRefs[exam.id] || ""}
                      onChange={(e) => setManualCandidateRefs((prev) => ({ ...prev, [exam.id]: e.target.value }))}
                    />
                    <input
                      placeholder="Full name override (optional)"
                      value={manualCandidateNames[exam.id] || ""}
                      onChange={(e) => setManualCandidateNames((prev) => ({ ...prev, [exam.id]: e.target.value }))}
                    />
                    <button type="button" onClick={() => addManualInterviewCandidate(exam)}>
                      Add Candidate
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
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














