const express = require("express");
const { nanoid } = require("nanoid");
const { readDB, writeDB } = require("../lib/jsonStore");
const { auth, requireRole } = require("../middleware/auth");
const { createRateLimiter } = require("../middleware/rateLimit");
const { SUBJECT_OPTIONS, CLASS_SUBJECTS, normalizeSubject } = require("../lib/subjects");
const {
  CBT_OFFICER_ROLES,
  buildCredentialCsv,
  buildCredentialExportRows,
  buildCredentialPdfBuffer,
  buildExamDetail,
  closeExam: closeExamWithWorkflow,
  consumeCandidateSession,
  createAuditLog,
  deriveExamCandidateType,
  ensureCollections: ensureCredentialCollections,
  generateCredentials,
  isOfficerRole,
  normalizeCandidateType,
  publishExam: publishExamWithWorkflow,
  resetCandidateCredential,
  revokeCandidateCredential,
  summarizeExam,
  syncExamCandidates,
  authenticateCandidateLogin,
} = require("../lib/cbtCredentialService");

const router = express.Router();

const ADMISSION_DEFAULT_SUBJECTS = ["English Language", "Mathematics", "Basic Science", "Social Studies"];
const QUESTION_STATUSES = ["PENDING", "APPROVED", "REJECTED"];
const EXAM_STATUSES = ["DRAFT", "READY_FOR_GENERATION", "CREDENTIALS_GENERATED", "PUBLISHED", "IN_PROGRESS", "CLOSED", "ARCHIVED"];
const EXAM_TYPES = ["PRACTICE", "CLASS_TEST", "MOCK", "PROMOTIONAL", "ENTRANCE", "INTERVIEW"];
const TARGET_AUDIENCES = ["STUDENT", "ENTRANCE", "INTERVIEW"];
const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"];
const STUDENT_ASSESSMENT_MODE = "STUDENT_EXAM";
const RECRUITMENT_ASSESSMENT_MODE = "RECRUITMENT_EXAM";
const ASSESSMENT_MODES = [STUDENT_ASSESSMENT_MODE, RECRUITMENT_ASSESSMENT_MODE];
const QUESTION_TYPES = ["mcq_single", "short_answer", "essay", "scenario"];
const RECRUITMENT_CATEGORY_OPTIONS = ["PRESCHOOL", "BASIC", "SSS"];
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
const SCHOOL_UTC_OFFSET_MINUTES = 60;
const DATE_TIME_WITH_TIME_ZONE_RE = /(Z|[+-]\d{2}:\d{2})$/i;
const SCHOOL_LOCAL_DATE_TIME_RE = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?)?$/;
const CBT_RULE_KEYS = [
  "oneAttemptDefault",
  "enableAutoSubmit",
  "enableTabSwitchWarning",
  "showCorrectionsAfterSubmit",
  "allowResultSlipPrint",
];

const CLASS_ORDER = [
  "Creche",
  "Nursery 1",
  "Nursery 2",
  "Reception",
  "Basic 1",
  "Basic 2",
  "Basic 3",
  "Basic 4",
  "Basic 5",
  "Basic 6",
  "JSS1",
  "JSS2",
  "JSS3",
  "SSS1",
  "SSS2",
  "SSS3",
];

const CBT_LOGIN_LIMITER = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 25,
  keyPrefix: "cbt-candidate-login",
  message: "Too many CBT login attempts. Please wait and try again.",
  keyGenerator: (req) => {
    const loginId = String(req.body?.loginId || req.body?.candidateLoginId || "").trim().toUpperCase();
    return `${String(req.ip || "unknown")}:${loginId}`;
  },
});

function nowIso() {
  return new Date().toISOString();
}

function parseSchoolLocalDateTime(value) {
  const match = SCHOOL_LOCAL_DATE_TIME_RE.exec(String(value || "").trim());
  if (!match) return NaN;

  const [, year, month, day, hour = "0", minute = "0", second = "0"] = match;
  return Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  ) - (SCHOOL_UTC_OFFSET_MINUTES * 60 * 1000);
}

function formatSchoolDateTime(value) {
  const time = Date.parse(String(value || ""));
  if (!Number.isFinite(time)) return "";

  try {
    const formatted = new Intl.DateTimeFormat("en-GB", {
      timeZone: SCHOOL_TIME_ZONE,
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(time));
    return `${formatted} WAT`;
  } catch {
    return new Date(time).toISOString();
  }
}

function normalizeKey(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function clampNumber(value, min, max, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  if (num < min) return min;
  if (num > max) return max;
  return num;
}

function toUpperCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "");
}

function parseBoolean(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "y"].includes(normalized)) return true;
  if (["false", "0", "no", "n"].includes(normalized)) return false;
  return fallback;
}

function normalizeDifficulty(value) {
  const clean = String(value || "").trim().toUpperCase();
  if (DIFFICULTIES.includes(clean)) return clean;
  return "MEDIUM";
}

function normalizeQuestionStatus(value, fallback = "PENDING") {
  const clean = String(value || "").trim().toUpperCase();
  if (QUESTION_STATUSES.includes(clean)) return clean;
  return fallback;
}

function normalizeExamStatus(value, fallback = "DRAFT") {
  const clean = String(value || "").trim().toUpperCase();
  if (EXAM_STATUSES.includes(clean)) return clean;
  return fallback;
}

function deriveTargetAudienceFromExamType(examType) {
  const clean = String(examType || "").trim().toUpperCase();
  if (clean === "ENTRANCE") return "ENTRANCE";
  if (clean === "INTERVIEW") return "INTERVIEW";
  return "STUDENT";
}

function modeToExamType(mode) {
  const clean = String(mode || "").trim().toUpperCase();
  if (clean === "ADMISSION") return "ENTRANCE";
  if (clean === "INTERVIEW") return "INTERVIEW";
  return "CLASS_TEST";
}

function examTypeToMode(examType) {
  const clean = String(examType || "").trim().toUpperCase();
  if (clean === "ENTRANCE") return "ADMISSION";
  if (clean === "INTERVIEW") return "INTERVIEW";
  return "ACADEMIC";
}

function normalizeExamType(value, fallback = "CLASS_TEST") {
  const clean = String(value || "").trim().toUpperCase();
  if (EXAM_TYPES.includes(clean)) return clean;
  return fallback;
}

function normalizeTargetAudience(value, fallback = "STUDENT") {
  const clean = String(value || "").trim().toUpperCase();
  if (TARGET_AUDIENCES.includes(clean)) return clean;
  return fallback;
}

function unique(values) {
  const seen = new Set();
  const out = [];
  for (const item of Array.isArray(values) ? values : []) {
    const value = String(item || "").trim();
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function uniqueSubjects(values) {
  const seen = new Set();
  const out = [];
  for (const value of Array.isArray(values) ? values : []) {
    const canonical = normalizeSubject(value);
    if (!canonical) continue;
    const key = canonical.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(canonical);
  }
  return out;
}

function normalizeAssessmentSubject(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return normalizeSubject(raw) || raw;
}

function uniqueAssessmentSubjects(values) {
  const seen = new Set();
  const out = [];
  for (const value of Array.isArray(values) ? values : []) {
    const canonical = normalizeAssessmentSubject(value);
    const key = canonical.toLowerCase();
    if (!canonical || seen.has(key)) continue;
    seen.add(key);
    out.push(canonical);
  }
  return out;
}

function normalizeAssessmentMode(value, fallback = STUDENT_ASSESSMENT_MODE) {
  const clean = String(value || "").trim().toUpperCase();
  if (ASSESSMENT_MODES.includes(clean)) return clean;
  return fallback;
}

function normalizeQuestionType(value, fallback = "mcq_single") {
  const clean = String(value || "").trim().toLowerCase();
  if (QUESTION_TYPES.includes(clean)) return clean;
  return fallback;
}

function normalizeRecruitmentCategory(value, fallback = "BASIC") {
  const clean = String(value || "").trim().toUpperCase();
  if (RECRUITMENT_CATEGORY_OPTIONS.includes(clean)) return clean;
  const key = normalizeKey(clean);
  if (["preschool", "preschoolinterview", "earlyyears", "nursery", "earlychildhood"].includes(key)) return "PRESCHOOL";
  if (["basic", "basicclass", "basicinterview", "basicclassinterview", "jss", "junior"].includes(key)) return "BASIC";
  if (["sss", "sssinterview", "senior", "seniorsecondary"].includes(key)) return "SSS";
  return fallback;
}

function getRecruitmentCategoryLabel(value) {
  const normalized = normalizeRecruitmentCategory(value, "");
  if (normalized === "PRESCHOOL") return "Pre-school Interview";
  if (normalized === "BASIC") return "Basic Class Interview";
  if (normalized === "SSS") return "SSS Interview";
  return "Recruitment Assessment";
}

function isRecruitmentAssessment(item) {
  if (!item) return false;
  return (
    normalizeAssessmentMode(item.assessmentMode, "") === RECRUITMENT_ASSESSMENT_MODE
    || String(item.targetAudience || "").trim().toUpperCase() === "INTERVIEW"
    || String(item.examType || "").trim().toUpperCase() === "INTERVIEW"
    || String(item.mode || "").trim().toUpperCase() === "INTERVIEW"
    || !!String(item.recruitmentCategory || "").trim()
  );
}

function getExamAssessmentMode(exam) {
  return normalizeAssessmentMode(
    exam?.assessmentMode,
    isRecruitmentAssessment(exam) ? RECRUITMENT_ASSESSMENT_MODE : STUDENT_ASSESSMENT_MODE
  );
}

function getQuestionAssessmentMode(question) {
  return normalizeAssessmentMode(
    question?.assessmentMode,
    isRecruitmentAssessment(question) ? RECRUITMENT_ASSESSMENT_MODE : STUDENT_ASSESSMENT_MODE
  );
}

function getQuestionSubjectForMode(question, assessmentMode) {
  const value = question?.subjectName || question?.subject || "";
  return assessmentMode === RECRUITMENT_ASSESSMENT_MODE
    ? normalizeAssessmentSubject(value)
    : normalizeSubject(value);
}

function buildRecruitmentAssessmentAreaOptions(db) {
  const questionAreas = (Array.isArray(db?.cbtQuestionBank) ? db.cbtQuestionBank : [])
    .filter((item) => isRecruitmentAssessment(item))
    .flatMap((item) => [item.subjectName || item.subject || ""]);
  const examAreas = (Array.isArray(db?.cbtExams) ? db.cbtExams : [])
    .filter((item) => isRecruitmentAssessment(item))
    .flatMap((item) => getExamSubjects(item));

  return uniqueAssessmentSubjects([
    ...DEFAULT_RECRUITMENT_ASSESSMENT_AREAS,
    ...questionAreas,
    ...examAreas,
  ]);
}

function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr;
}

function generateAccessCode() {
  return `EX-${nanoid(6).toUpperCase()}`;
}

function ensureUniqueCode(exams, requestedCode, currentExamId = "") {
  const used = new Set(
    (Array.isArray(exams) ? exams : [])
      .filter((item) => String(item.id || "") !== String(currentExamId || ""))
      .map((item) => toUpperCode(item.accessCode))
      .filter(Boolean)
  );

  let code = toUpperCode(requestedCode);
  if (!code) {
    do {
      code = generateAccessCode();
    } while (used.has(code));
    return code;
  }

  if (used.has(code)) return null;
  return code;
}

function getSectionForClass(className) {
  const clean = String(className || "").toUpperCase();
  if (clean.startsWith("CRECHE") || clean.startsWith("NURSERY") || clean.startsWith("RECEPTION")) return "Early Years";
  if (clean.startsWith("BASIC")) return "Basic School";
  if (clean.startsWith("JSS")) return "Junior Secondary";
  if (clean.startsWith("SS")) return "Senior Secondary";
  return "General";
}

function seedClassesFromCatalog() {
  const names = unique([...CLASS_ORDER, ...Object.keys(CLASS_SUBJECTS)]);
  return names.map((name, idx) => ({
    id: `cbt-class-${slugify(name)}`,
    className: name,
    section: getSectionForClass(name),
    levelOrder: idx + 1,
    status: "ACTIVE",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }));
}

function seedSubjectsFromCatalog(classes) {
  const classByName = new Map((classes || []).map((item) => [normalizeKey(item.className), item]));
  const rows = [];

  for (const [className, list] of Object.entries(CLASS_SUBJECTS)) {
    const cls = classByName.get(normalizeKey(className));
    if (!cls) continue;
    for (const subjectName of list) {
      rows.push({
        id: `cbt-subject-${slugify(cls.id)}-${slugify(subjectName)}`,
        classId: cls.id,
        className: cls.className,
        subjectName,
        category: "GENERAL",
        status: "ACTIVE",
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
    }
  }

  return rows;
}

function buildClassAliasMap(classes) {
  const map = new Map();
  for (const cls of classes || []) {
    const className = String(cls.className || "").trim();
    const key = normalizeKey(className);
    if (!key) continue;
    map.set(key, className);

    if (className.startsWith("JSS")) {
      const code = className.replace(/\s+/g, "");
      map.set(normalizeKey(code), className);
      map.set(normalizeKey(code.replace("JSS", "JSS ")), className);
    }

    if (className.startsWith("SSS")) {
      const code = className.replace(/\s+/g, "");
      map.set(normalizeKey(code), className);
      map.set(normalizeKey(code.replace("SSS", "SS ")), className);
      map.set(normalizeKey(code.replace("SSS", "SS")), className);
    }
  }
  return map;
}

function normalizeClassName(input, classes) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  const aliasMap = buildClassAliasMap(classes || []);
  return aliasMap.get(normalizeKey(raw)) || raw;
}

function resolveClassInfo(db, payload = {}) {
  const classes = Array.isArray(db.cbtClasses) ? db.cbtClasses : [];
  const classIdInput = String(payload.classId || "").trim();
  const classNameInput = String(payload.className || payload.classLevel || payload.class || "").trim();

  let cls = null;
  if (classIdInput) {
    cls = classes.find((item) => String(item.id) === classIdInput) || null;
  }

  if (!cls && classNameInput) {
    const canonicalClassName = normalizeClassName(classNameInput, classes);
    cls = classes.find((item) => normalizeKey(item.className) === normalizeKey(canonicalClassName)) || null;
  }

  if (cls) return { classId: cls.id, className: cls.className };
  if (classNameInput) return { classId: "", className: normalizeClassName(classNameInput, classes) };
  return { classId: "", className: "" };
}

function ensureSubjectRecord(db, classInfo, subjectName, createdBy = "system") {
  if (!subjectName) return { subjectId: "", subjectName: "" };
  const canonicalSubjectName = normalizeSubject(subjectName) || String(subjectName).trim();
  const classId = String(classInfo.classId || "").trim();
  const className = String(classInfo.className || "").trim();

  db.cbtSubjects = Array.isArray(db.cbtSubjects) ? db.cbtSubjects : [];
  let existing = db.cbtSubjects.find((row) => {
    const sameSubject = normalizeKey(row.subjectName) === normalizeKey(canonicalSubjectName);
    const sameClass = classId ? String(row.classId || "") === classId : normalizeKey(row.className) === normalizeKey(className);
    return sameSubject && sameClass;
  });

  if (!existing) {
    const now = nowIso();
    existing = {
      id: `cbt-subject-${nanoid(10)}`,
      classId,
      className,
      subjectName: canonicalSubjectName,
      category: "GENERAL",
      status: "ACTIVE",
      createdBy,
      createdAt: now,
      updatedAt: now,
    };
    db.cbtSubjects.unshift(existing);
  }

  return { subjectId: existing.id, subjectName: existing.subjectName };
}

function ensureTopicRecord(db, topicPayload, classInfo, subjectInfo, createdBy = "system") {
  const topicNameRaw = String(topicPayload || "").trim();
  if (!topicNameRaw) return { topicId: "", topicName: "" };

  db.cbtTopics = Array.isArray(db.cbtTopics) ? db.cbtTopics : [];
  let existing = db.cbtTopics.find((item) => (
    normalizeKey(item.topicName) === normalizeKey(topicNameRaw)
    && normalizeKey(item.subjectName) === normalizeKey(subjectInfo.subjectName)
    && normalizeKey(item.className) === normalizeKey(classInfo.className)
  ));

  if (!existing) {
    const now = nowIso();
    existing = {
      id: `cbt-topic-${nanoid(10)}`,
      classId: classInfo.classId,
      className: classInfo.className,
      subjectId: subjectInfo.subjectId,
      subjectName: subjectInfo.subjectName,
      topicName: topicNameRaw,
      status: "ACTIVE",
      createdBy,
      createdAt: now,
      updatedAt: now,
    };
    db.cbtTopics.unshift(existing);
  }

  return { topicId: existing.id, topicName: existing.topicName };
}
function parseOptions(input = {}) {
  const direct = Array.isArray(input.options) ? input.options : [];
  const keyed = [
    input.optionA,
    input.optionB,
    input.optionC,
    input.optionD,
    input.option_a,
    input.option_b,
    input.option_c,
    input.option_d,
    input.Option_A,
    input.Option_B,
    input.Option_C,
    input.Option_D,
  ];

  return (direct.length > 0 ? direct : keyed)
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 8);
}

function resolveAnswerIndex(input, options) {
  const optionsLength = Array.isArray(options) ? options.length : 0;
  if (optionsLength < 2) return -1;

  const numFields = [input.correctAnswerIndex, input.answerIndex, input.correct_option, input.correctOption];
  for (const field of numFields) {
    const value = Number(field);
    if (!Number.isInteger(value)) continue;
    if (value >= 0 && value < optionsLength) return value;
    if (value >= 1 && value <= optionsLength) return value - 1;
  }

  const answerRaw = String(input.correctAnswer || input.answer || "").trim();
  if (answerRaw) {
    const upper = answerRaw.toUpperCase();
    const alphaIndex = ["A", "B", "C", "D", "E", "F", "G", "H"].indexOf(upper);
    if (alphaIndex >= 0 && alphaIndex < optionsLength) return alphaIndex;

    const textIndex = options.findIndex((item) => normalizeKey(item) === normalizeKey(answerRaw));
    if (textIndex >= 0) return textIndex;
  }

  return -1;
}

function questionToResponse(item) {
  const safeOptions = Array.isArray(item.options) ? item.options : [];
  return {
    ...item,
    subject: item.subjectName || item.subject || "",
    assessmentMode: item.assessmentMode || (isRecruitmentAssessment(item) ? RECRUITMENT_ASSESSMENT_MODE : STUDENT_ASSESSMENT_MODE),
    recruitmentCategory: item.recruitmentCategory ? normalizeRecruitmentCategory(item.recruitmentCategory) : "",
    recruitmentCategoryLabel: item.recruitmentCategory ? getRecruitmentCategoryLabel(item.recruitmentCategory) : "",
    questionType: normalizeQuestionType(item.questionType || item.type || "mcq_single"),
    classLevel: item.className || item.classLevel || "",
    question: item.questionText || item.question || "",
    answerIndex: Number.isInteger(Number(item.correctAnswerIndex))
      ? Number(item.correctAnswerIndex)
      : Number(item.answerIndex || 0),
    options: safeOptions,
  };
}

function getExamSubjects(exam) {
  const recruitmentMode = getExamAssessmentMode(exam) === RECRUITMENT_ASSESSMENT_MODE;
  const fromArray = recruitmentMode ? uniqueAssessmentSubjects(exam.subjects || []) : uniqueSubjects(exam.subjects || []);
  const single = recruitmentMode
    ? normalizeAssessmentSubject(exam.subjectName || exam.subject || "")
    : normalizeSubject(exam.subjectName || exam.subject || "");
  const out = recruitmentMode
    ? uniqueAssessmentSubjects([...fromArray, single].filter(Boolean))
    : uniqueSubjects([...fromArray, single].filter(Boolean));

  if (out.length === 0 && normalizeTargetAudience(exam.targetAudience, deriveTargetAudienceFromExamType(exam.examType)) === "ENTRANCE") {
    return ADMISSION_DEFAULT_SUBJECTS;
  }

  return out;
}

function examToResponse(item, db) {
  const mappings = (Array.isArray(db?.cbtExamQuestions) ? db.cbtExamQuestions : []).filter(
    (row) => String(row.examId) === String(item.id)
  );
  const subjectSet = getExamSubjects(item);
  const summary = summarizeExam(db, item);

  return {
    ...item,
    title: item.examTitle || item.title || "",
    mode: examTypeToMode(item.examType || modeToExamType(item.mode)),
    classLevel: item.className || item.classLevel || "",
    questionsPerSubject: Number(item.questionsPerSubject || 10),
    subjects: subjectSet,
    assignedQuestions: mappings.length,
    examCode: String(item.examCode || item.accessCode || "").trim().toUpperCase(),
    candidateType: deriveExamCandidateType(item),
    workflowExamType: item.workflowExamType || (deriveExamCandidateType(item) === "APPLICANT" ? "INTERVIEW_EXAM" : "SCHOOL_EXAM"),
    attemptLimit: Math.max(1, Number(item.attemptLimit || 1)),
    submittedAt: String(item.submittedAt || ""),
    publishedAt: String(item.publishedAt || ""),
    reviewedByOfficerId: String(item.reviewedByOfficerId || ""),
    createdByTeacherId: String(item.createdByTeacherId || item.createdBy || ""),
    ...summary,
  };
}

function attemptToResponse(item) {
  return {
    ...item,
    startedAt: item.startedAt || item.startTime || "",
    submittedAt: item.submittedAt || item.submitTime || "",
    totalQuestions: Number(item.totalQuestions || item.total || item.questionSnapshot?.length || 0),
    examMode: item.examMode || examTypeToMode(item.examType),
  };
}

function getTeacherAllowedSubjects(user) {
  return uniqueSubjects(user?.subjects || []);
}

function canManageSubject(user, subjectName, options = {}) {
  if (!user) return false;
  if (String(user.role || "") === "ADMIN") return true;
  if (String(user.role || "") !== "TEACHER") return false;
  if (options.allowRecruitmentBypass) return true;
  const canonical = normalizeSubject(subjectName);
  if (!canonical) return false;
  const allowed = new Set(getTeacherAllowedSubjects(user));
  return allowed.has(canonical);
}

function filterQuestionsForUser(user, questions) {
  if (!user) return [];
  if (user.role === "ADMIN") return questions;
  if (user.role !== "TEACHER") return [];
  const allowed = new Set(getTeacherAllowedSubjects(user));
  return questions.filter((item) => {
    if (isRecruitmentAssessment(item)) {
      return String(item.createdBy || item.createdById || "") === String(user.id || "");
    }
    return allowed.has(normalizeSubject(item.subjectName || item.subject));
  });
}

function filterExamsForUser(user, exams) {
  if (!user) return [];
  if (user.role === "ADMIN" || isOfficerRole(user.originalRole || user.role)) return exams;
  if (user.role !== "TEACHER") return [];

  const allowed = new Set(getTeacherAllowedSubjects(user));
  return exams.filter((exam) => (
    String(exam.createdByTeacherId || exam.createdBy || "") === String(user.id || "")
    || getExamSubjects(exam).some((subject) => allowed.has(subject))
  ));
}

function canUserViewExam(user, exam) {
  if (!user || !exam) return false;
  if (user.role === "ADMIN" || isOfficerRole(user.originalRole || user.role)) return true;
  if (user.role !== "TEACHER") return false;
  if (String(exam.createdByTeacherId || exam.createdBy || "") === String(user.id || "")) return true;
  const allowed = new Set(getTeacherAllowedSubjects(user));
  return getExamSubjects(exam).some((subject) => allowed.has(subject));
}

function canUserEditExamDraft(user, exam) {
  if (!user || !exam) return false;
  if (user.role === "ADMIN") return true;
  if (user.role !== "TEACHER") return false;
  if (String(exam.status || "").toUpperCase() !== "DRAFT") return false;
  return String(exam.createdByTeacherId || exam.createdBy || "") === String(user.id || "");
}

function getExamOrFail(db, examId) {
  const exam = (db.cbtExams || []).find((item) => String(item.id || "") === String(examId || ""));
  if (!exam) {
    const error = new Error("Exam not found");
    error.status = 404;
    throw error;
  }
  return exam;
}

function getCandidateCredentialMeta(req) {
  return {
    ipAddress: String(req.headers["x-forwarded-for"] || req.ip || "").split(",")[0].trim(),
    userAgent: String(req.headers["user-agent"] || ""),
  };
}

function buildResponseMap(attempt) {
  const map = new Map();
  for (const row of Array.isArray(attempt.responses) ? attempt.responses : []) {
    const questionId = String(row?.questionId || "").trim();
    const answerIndex = Number(row?.answerIndex);
    if (!questionId || !Number.isInteger(answerIndex)) continue;
    map.set(questionId, answerIndex);
  }
  return map;
}

function responseMapToArray(map) {
  return Array.from(map.entries()).map(([questionId, answerIndex]) => ({ questionId, answerIndex }));
}

function buildStoredResponseRows(attempt, responseMap, payloadResponses = []) {
  const rowsById = new Map();

  for (const row of Array.isArray(attempt?.responses) ? attempt.responses : []) {
    const questionId = String(row?.questionId || "").trim();
    if (!questionId) continue;
    const answerIndex = Number(row?.answerIndex);
    rowsById.set(questionId, {
      ...row,
      questionId,
      ...(Number.isInteger(answerIndex) ? { answerIndex } : {}),
      answerText: String(row?.answerText || "").trim(),
    });
  }

  for (const [questionId, answerIndex] of responseMap.entries()) {
    rowsById.set(questionId, {
      ...(rowsById.get(questionId) || { questionId }),
      questionId,
      answerIndex,
    });
  }

  for (const row of Array.isArray(payloadResponses) ? payloadResponses : []) {
    const questionId = String(row?.questionId || "").trim();
    if (!questionId) continue;
    const answerIndex = Number(row?.answerIndex);
    const next = { ...(rowsById.get(questionId) || { questionId }), questionId };
    if (Number.isInteger(answerIndex)) next.answerIndex = answerIndex;
    if (row?.answerText !== undefined) next.answerText = String(row.answerText || "").trim();
    rowsById.set(questionId, next);
  }

  return Array.from(rowsById.values()).filter((row) => (
    Number.isInteger(Number(row.answerIndex))
    || String(row.answerText || "").trim()
  ));
}

function evaluateAttempt(attempt, exam) {
  const responseMap = buildResponseMap(attempt);
  const breakdown = {};
  let score = 0;
  const rows = Array.isArray(attempt.questionSnapshot) ? attempt.questionSnapshot : [];

  for (const question of rows) {
    const subjectName = String(question.subjectName || question.subject || "General");
    if (!breakdown[subjectName]) {
      breakdown[subjectName] = { total: 0, correct: 0 };
    }
    breakdown[subjectName].total += 1;

    const selected = responseMap.get(String(question.id));
    if (selected === Number(question.correctAnswerIndex)) {
      score += 1;
      breakdown[subjectName].correct += 1;
    }
  }

  const total = rows.length;
  const percentage = total > 0 ? Number(((score / total) * 100).toFixed(2)) : 0;
  const subjectBreakdown = Object.fromEntries(
    Object.entries(breakdown).map(([subjectName, info]) => [
      subjectName,
      {
        total: info.total,
        correct: info.correct,
        percentage: info.total > 0 ? Number(((info.correct / info.total) * 100).toFixed(2)) : 0,
      },
    ])
  );

  const passMark = Number(exam?.passMark || 50);
  return {
    score,
    total,
    percentage,
    subjectBreakdown,
    passed: percentage >= passMark,
    passMark,
  };
}

function prepareQuestionRecord(db, payload, user) {
  const now = nowIso();
  const assessmentMode = normalizeAssessmentMode(
    payload.assessmentMode,
    payload.recruitmentCategory ? RECRUITMENT_ASSESSMENT_MODE : STUDENT_ASSESSMENT_MODE
  );
  const classInfo = assessmentMode === RECRUITMENT_ASSESSMENT_MODE
    ? (
        String(payload.classId || payload.className || payload.classLevel || payload.class || "").trim()
          ? resolveClassInfo(db, payload)
          : { classId: "", className: "" }
      )
    : resolveClassInfo(db, payload);
  const subjectInput = payload.assessmentArea || payload.subjectName || payload.subject;
  const subjectCanonical = assessmentMode === RECRUITMENT_ASSESSMENT_MODE
    ? normalizeAssessmentSubject(subjectInput)
    : normalizeSubject(subjectInput);
  if (!subjectCanonical) {
    return {
      error: assessmentMode === RECRUITMENT_ASSESSMENT_MODE
        ? "Assessment area is required."
        : "Invalid subject name.",
    };
  }

  if (!canManageSubject(user, subjectCanonical, { allowRecruitmentBypass: assessmentMode === RECRUITMENT_ASSESSMENT_MODE })) {
    return { error: "You can only manage questions for your assigned subject(s)." };
  }

  const questionText = String(payload.questionText || payload.question || payload.Question || "").trim();
  if (!questionText) return { error: "Question text is required." };

  const options = parseOptions(payload);
  if (options.length < 2) return { error: "At least 2 options are required." };

  const correctAnswerIndex = resolveAnswerIndex(payload, options);
  if (correctAnswerIndex < 0) {
    return { error: "Correct answer is invalid for provided options." };
  }

  const subjectInfo = ensureSubjectRecord(db, classInfo, subjectCanonical, user?.id || "system");
  const topicInfo = ensureTopicRecord(
    db,
    payload.topicName || payload.topic || payload.Topic,
    classInfo,
    subjectInfo,
    user?.id || "system"
  );

  const requestedStatus = normalizeQuestionStatus(payload.status, "PENDING");
  const finalStatus = user?.role === "ADMIN" ? requestedStatus : "PENDING";

  const question = {
    id: String(payload.id || nanoid()),
    assessmentMode,
    recruitmentCategory: assessmentMode === RECRUITMENT_ASSESSMENT_MODE
      ? normalizeRecruitmentCategory(payload.recruitmentCategory || payload.teachingCategory || "BASIC")
      : "",
    questionType: normalizeQuestionType(payload.questionType || payload.type || "mcq_single"),
    classId: classInfo.classId,
    className: classInfo.className,
    subjectId: subjectInfo.subjectId,
    subjectName: subjectInfo.subjectName,
    topicId: topicInfo.topicId,
    topicName: topicInfo.topicName,
    questionText,
    options,
    correctAnswerIndex,
    correctAnswer: ["A", "B", "C", "D", "E", "F", "G", "H"][correctAnswerIndex] || "",
    explanation: String(payload.explanation || payload.Explanation || "").trim(),
    difficulty: normalizeDifficulty(payload.difficulty || payload.Difficulty),
    status: finalStatus,
    createdBy: String(payload.createdBy || user?.id || ""),
    createdByName: String(payload.createdByName || user?.name || ""),
    approvedBy: finalStatus === "APPROVED" ? String(user?.id || "") : String(payload.approvedBy || ""),
    approvedByName: finalStatus === "APPROVED" ? String(user?.name || "") : String(payload.approvedByName || ""),
    approvedAt: finalStatus === "APPROVED" ? now : String(payload.approvedAt || ""),
    createdAt: String(payload.createdAt || now),
    updatedAt: now,
  };

  return { item: questionToResponse(question) };
}

function parseDateTime(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const normalized = raw.replace(/\//g, "-");

  let time = NaN;
  if (DATE_TIME_WITH_TIME_ZONE_RE.test(normalized)) {
    time = Date.parse(normalized);
  } else {
    time = parseSchoolLocalDateTime(normalized);
    if (!Number.isFinite(time)) {
      time = Date.parse(normalized);
    }
  }

  if (!Number.isFinite(time)) return "";
  return new Date(time).toISOString();
}

function parseExamPayload(db, payload, currentExam = null) {
  const safeTitle = String(payload.examTitle || payload.title || "").trim();
  if (!safeTitle) return { error: "examTitle is required" };

  const assessmentMode = normalizeAssessmentMode(
    payload.assessmentMode,
    (
      String(payload.targetAudience || currentExam?.targetAudience || "").trim().toUpperCase() === "INTERVIEW"
      || String(payload.examType || currentExam?.examType || "").trim().toUpperCase() === "INTERVIEW"
      || String(payload.mode || "").trim().toUpperCase() === "INTERVIEW"
      || payload.recruitmentCategory
      || currentExam?.recruitmentCategory
    )
      ? RECRUITMENT_ASSESSMENT_MODE
      : STUDENT_ASSESSMENT_MODE
  );
  const requestedType = assessmentMode === RECRUITMENT_ASSESSMENT_MODE
    ? "INTERVIEW"
    : (payload.examType || modeToExamType(payload.mode));
  const examType = normalizeExamType(requestedType, currentExam?.examType || "CLASS_TEST");
  const targetAudience = normalizeTargetAudience(
    assessmentMode === RECRUITMENT_ASSESSMENT_MODE ? "INTERVIEW" : payload.targetAudience,
    currentExam?.targetAudience || deriveTargetAudienceFromExamType(examType)
  );
  const classInfo = assessmentMode === RECRUITMENT_ASSESSMENT_MODE
    ? (
        String(payload.classId || payload.className || payload.classLevel || payload.class || "").trim()
          ? resolveClassInfo(db, payload)
          : { classId: "", className: "" }
      )
    : resolveClassInfo(db, payload);

  const subjectsFromBody = (assessmentMode === RECRUITMENT_ASSESSMENT_MODE ? uniqueAssessmentSubjects : uniqueSubjects)([
    ...(Array.isArray(payload.subjects) ? payload.subjects : []),
    ...(Array.isArray(payload.assessmentAreas) ? payload.assessmentAreas : []),
    payload.assessmentArea,
    payload.subjectName,
    payload.subject,
    payload.subjectSpecializationFilter,
  ]);
  const subjects = targetAudience === "ENTRANCE" && subjectsFromBody.length === 0
    ? ADMISSION_DEFAULT_SUBJECTS
    : subjectsFromBody;

  if (subjects.length === 0) {
    return { error: assessmentMode === RECRUITMENT_ASSESSMENT_MODE ? "Select at least one assessment area." : "At least one subject is required." };
  }

  const durationMinutes = clampNumber(payload.durationMinutes, 5, 240, Number(currentExam?.durationMinutes || 40));
  const questionsPerSubject = clampNumber(payload.questionsPerSubject, 1, 100, Number(currentExam?.questionsPerSubject || 10));
  const computedTotal = questionsPerSubject * Math.max(subjects.length, 1);
  const totalQuestions = clampNumber(payload.totalQuestions, 1, 200, Number(currentExam?.totalQuestions || computedTotal));
  const passMark = clampNumber(payload.passMark, 0, 100, Number(currentExam?.passMark || 50));

  const startTime = parseDateTime(payload.startTime || payload.start_date || currentExam?.startTime);
  const endTime = parseDateTime(payload.endTime || payload.end_date || currentExam?.endTime);
  if (startTime && endTime && Date.parse(endTime) <= Date.parse(startTime)) {
    return { error: "endTime must be after startTime." };
  }

  const status = normalizeExamStatus(payload.status, currentExam?.status || "DRAFT");
  const oneAttemptOnly = parseBoolean(payload.oneAttemptOnly, parseBoolean(currentExam?.oneAttemptOnly, true));
  const shuffleQuestions = parseBoolean(payload.shuffleQuestions, parseBoolean(currentExam?.shuffleQuestions, true));
  const shuffleOptions = parseBoolean(payload.shuffleOptions, parseBoolean(currentExam?.shuffleOptions, true));
  const applicantBatchId = String(payload.applicantBatchId || currentExam?.applicantBatchId || "").trim();

  return {
    assessmentMode,
    recruitmentCategory: assessmentMode === RECRUITMENT_ASSESSMENT_MODE
      ? normalizeRecruitmentCategory(payload.recruitmentCategory || currentExam?.recruitmentCategory || "BASIC")
      : "",
    appliedRoleFilter: assessmentMode === RECRUITMENT_ASSESSMENT_MODE
      ? String(payload.appliedRoleFilter || currentExam?.appliedRoleFilter || payload.appliedRole || "").trim()
      : "",
    subjectSpecializationFilter: assessmentMode === RECRUITMENT_ASSESSMENT_MODE
      ? String(payload.subjectSpecializationFilter || currentExam?.subjectSpecializationFilter || "").trim()
      : "",
    examType,
    targetAudience,
    examTitle: safeTitle,
    classId: classInfo.classId,
    className: classInfo.className,
    subjectName: subjects.length === 1 ? subjects[0] : "",
    subjects,
    durationMinutes,
    totalQuestions,
    questionsPerSubject,
    passMark,
    shuffleQuestions,
    shuffleOptions,
    oneAttemptOnly,
    attemptLimit: Math.max(1, Number(payload.attemptLimit || currentExam?.attemptLimit || 1)),
    startTime,
    endTime,
    status,
    applicantBatchId,
    instructions: String(payload.instructions || currentExam?.instructions || "Answer all questions and submit before time elapses.").trim(),
    sessionTerm: String(payload.sessionTerm || payload.term || currentExam?.sessionTerm || "").trim(),
  };
}

function pickQuestionsForExam(exam, questionBank) {
  const subjects = getExamSubjects(exam);
  const assessmentMode = getExamAssessmentMode(exam);
  const recruitmentCategory = assessmentMode === RECRUITMENT_ASSESSMENT_MODE
    ? normalizeRecruitmentCategory(exam.recruitmentCategory || "BASIC")
    : "";
  const approved = (Array.isArray(questionBank) ? questionBank : []).filter(
    (item) => String(item.status || "").toUpperCase() === "APPROVED"
  );
  const modeFiltered = approved.filter((item) => getQuestionAssessmentMode(item) === assessmentMode);
  const recruitmentFiltered = assessmentMode === RECRUITMENT_ASSESSMENT_MODE
    ? modeFiltered.filter((item) => {
        const itemCategory = String(item.recruitmentCategory || "").trim();
        return !itemCategory || normalizeRecruitmentCategory(itemCategory) === recruitmentCategory;
      })
    : modeFiltered;

  const filteredByClass = recruitmentFiltered.filter((item) => {
    if (exam.classId) return String(item.classId || "") === String(exam.classId);
    if (exam.className) return normalizeKey(item.className) === normalizeKey(exam.className);
    return true;
  });

  const bySubject = subjects.length > 0
    ? filteredByClass.filter((item) => subjects.includes(getQuestionSubjectForMode(item, assessmentMode)))
    : filteredByClass;

  const selected = [];
  const missingSubjects = [];
  const perSubject = clampNumber(exam.questionsPerSubject, 1, 100, 10);
  const totalQuestions = clampNumber(exam.totalQuestions, 1, 200, Math.max(perSubject * Math.max(subjects.length, 1), 10));

  if (subjects.length > 0) {
    for (const subjectName of subjects) {
      const pool = bySubject.filter((item) => getQuestionSubjectForMode(item, assessmentMode) === subjectName);
      if (pool.length === 0) {
        missingSubjects.push(subjectName);
        continue;
      }
      selected.push(...shuffle(pool).slice(0, Math.min(pool.length, perSubject)));
    }
  }

  if (selected.length < totalQuestions) {
    const selectedIds = new Set(selected.map((item) => String(item.id)));
    const remains = shuffle(bySubject.filter((item) => !selectedIds.has(String(item.id))));
    selected.push(...remains.slice(0, totalQuestions - selected.length));
  }

  return {
    selected: shuffle(selected).slice(0, totalQuestions),
    missingSubjects,
  };
}

function buildQuestionSnapshot(question, shuffleOptions) {
  const baseOptions = Array.isArray(question.options) ? question.options : [];
  const baseCorrect = Number(question.correctAnswerIndex || question.answerIndex || 0);

  let options = [...baseOptions];
  let correctAnswerIndex = baseCorrect;

  if (shuffleOptions) {
    const order = baseOptions.map((_, idx) => idx);
    const shuffledOrder = shuffle(order);
    options = shuffledOrder.map((idx) => baseOptions[idx]);
    correctAnswerIndex = shuffledOrder.indexOf(baseCorrect);
  }

  const questionType = normalizeQuestionType(question.questionType || question.type || "mcq_single");
  const maxScore = questionType === "mcq_single"
    ? 1
    : clampNumber(question.maxScore || question.points || 10, 1, 100, 10);

  return {
    id: String(question.id),
    classId: question.classId || "",
    className: question.className || "",
    subjectId: question.subjectId || "",
    subjectName: question.subjectName || question.subject || "",
    topicId: question.topicId || "",
    topicName: question.topicName || "",
    questionText: question.questionText || question.question || "",
    questionType,
    scenarioContext: String(question.scenarioContext || "").trim(),
    sampleAnswer: String(question.sampleAnswer || "").trim(),
    evaluationRubric: String(question.evaluationRubric || "").trim(),
    maxScore,
    options,
    correctAnswerIndex: Number(correctAnswerIndex),
    explanation: String(question.explanation || ""),
    difficulty: normalizeDifficulty(question.difficulty),
  };
}

function buildAttemptQuestionSet(db, exam) {
  const mapped = (Array.isArray(db.cbtExamQuestions) ? db.cbtExamQuestions : [])
    .filter((row) => String(row.examId) === String(exam.id))
    .sort((a, b) => Number(a.order || 9999) - Number(b.order || 9999));

  const questionBank = Array.isArray(db.cbtQuestionBank) ? db.cbtQuestionBank : [];
  let selected = [];
  let missingSubjects = [];

  if (mapped.length > 0) {
    const mapById = new Map(questionBank.map((row) => [String(row.id), row]));
    selected = mapped
      .map((row) => mapById.get(String(row.questionId || "")))
      .filter(Boolean)
      .filter((item) => String(item.status || "").toUpperCase() === "APPROVED");
  }

  if (selected.length === 0) {
    const picked = pickQuestionsForExam(exam, questionBank);
    selected = picked.selected;
    missingSubjects = picked.missingSubjects;
  }

  if (parseBoolean(exam.shuffleQuestions, true)) {
    selected = shuffle(selected);
  }

  const questionSnapshot = selected.map((question) =>
    buildQuestionSnapshot(question, parseBoolean(exam.shuffleOptions, true))
  );

  return {
    questionSnapshot,
    missingSubjects,
  };
}

function isExamOpen(exam) {
  const status = String(exam.status || "").toUpperCase();
  if (status !== "PUBLISHED") return { ok: false, message: "Exam is not currently published." };

  const now = Date.now();
  const startTime = exam.startTime ? Date.parse(exam.startTime) : NaN;
  const endTime = exam.endTime ? Date.parse(exam.endTime) : NaN;

  if (Number.isFinite(startTime) && now < startTime) {
    const opensAt = formatSchoolDateTime(exam.startTime);
    return {
      ok: false,
      message: opensAt
        ? `Exam has not started yet. It opens on ${opensAt}.`
        : "Exam has not started yet.",
    };
  }

  if (Number.isFinite(endTime) && now > endTime) {
    const closedAt = formatSchoolDateTime(exam.endTime);
    return {
      ok: false,
      message: closedAt
        ? `Exam has ended. It closed on ${closedAt}.`
        : "Exam has ended.",
    };
  }

  return { ok: true };
}

function hasSubmittedAttempt(db, examId, candidateId, studentId) {
  const attempts = Array.isArray(db.cbtAttempts) ? db.cbtAttempts : [];
  return attempts.find((item) => {
    if (String(item.examId || "") !== String(examId || "")) return false;
    if (String(item.status || "").toUpperCase() !== "SUBMITTED") return false;
    if (studentId && String(item.studentId || "") === String(studentId)) return true;
    if (candidateId && normalizeKey(item.candidateId) === normalizeKey(candidateId)) return true;
    return false;
  });
}

function getCandidateNameFromStudent(db, studentId, fallbackName = "") {
  const students = Array.isArray(db.students) ? db.students : [];
  const student = students.find((row) => String(row.id) === String(studentId));
  return String(student?.name || fallbackName || "").trim();
}

function getCandidateClassFromStudent(db, studentId) {
  const students = Array.isArray(db.students) ? db.students : [];
  const student = students.find((row) => String(row.id) === String(studentId));
  return String(student?.className || student?.class || "").trim();
}

function parseCandidateLoginId(value) {
  const raw = String(value || "").trim();
  if (!raw) return { examCode: "", candidateRef: "" };

  const compact = raw.replace(/\\s+/g, "");
  const separators = ["/", "|", ":"];
  let splitIndex = -1;

  for (const separator of separators) {
    const idx = compact.indexOf(separator);
    if (idx > 0 && (splitIndex === -1 || idx < splitIndex)) {
      splitIndex = idx;
    }
  }

  if (splitIndex === -1) {
    return { examCode: "", candidateRef: compact };
  }

  return {
    examCode: toUpperCode(compact.slice(0, splitIndex)),
    candidateRef: compact.slice(splitIndex + 1).trim(),
  };
}

function buildPublicCandidateProfile(db, exam, candidateLoginId) {
  const { candidateRef } = parseCandidateLoginId(candidateLoginId);
  const ref = String(candidateRef || candidateLoginId || "").trim();
  const refKey = normalizeKey(ref);
  if (!refKey) return null;

  const audience = normalizeTargetAudience(exam?.targetAudience, deriveTargetAudienceFromExamType(exam?.examType));

  if (audience === "ENTRANCE") {
    const admissions = Array.isArray(db.admissions) ? db.admissions : [];
    const application = admissions.find((row) => {
      const matches = [
        row?.applicationNo,
        row?.id,
        row?.applicantUsername,
        row?.applicantUserId,
      ];
      return matches.some((value) => normalizeKey(value) === refKey);
    });
    if (!application) return null;

    const personal = application.personal || {};
    const name = [
      String(personal.surname || "").trim(),
      String(personal.firstName || "").trim(),
      String(personal.middleName || "").trim(),
    ].filter(Boolean).join(" ").trim() || String(application.applicantName || "").trim();

    return {
      name: name || "Entrance Candidate",
      candidateId: String(application.applicationNo || application.id || ref).trim(),
      details: {
        audienceLabel: "Entrance Candidate",
        referenceLabel: "Application No.",
        referenceValue: String(application.applicationNo || application.id || ref).trim(),
        secondaryLabel: "Applying For",
        secondaryValue: String(application.academicHistory?.intendedClass || application.className || application.enrollment?.offeredClassName || "Entrance Screening").trim(),
      },
    };
  }

  if (audience === "INTERVIEW") {
    const applications = Array.isArray(db.careerApplications) ? db.careerApplications : [];
    const application = applications.find((row) => {
      const matches = [
        row?.applicationNumber,
        row?.id,
        row?.email,
      ];
      return matches.some((value) => normalizeKey(value) === refKey);
    });
    if (!application) return null;

    const vacancies = Array.isArray(db.careerVacancies) ? db.careerVacancies : [];
    const vacancy = vacancies.find((row) => String(row.id || "") === String(application.vacancyId || ""));

    return {
      name: String(application.fullName || "Interview Candidate").trim(),
      candidateId: String(application.applicationNumber || application.id || ref).trim(),
      details: {
        audienceLabel: "Interview Candidate",
        referenceLabel: "Application No.",
        referenceValue: String(application.applicationNumber || application.id || ref).trim(),
        secondaryLabel: "Interview Role",
        secondaryValue: String(vacancy?.title || application.teachingLevel || application.highestQualification || "Interview Screening").trim(),
      },
    };
  }

  return null;
}

function isStudentEligibleExam(exam, studentClass) {
  const className = String(exam?.className || "").trim();
  const targetAudience = normalizeTargetAudience(exam?.targetAudience, deriveTargetAudienceFromExamType(exam?.examType));
  if (targetAudience !== "STUDENT") return false;
  if (!studentClass || !className) return false;
  return normalizeKey(className) === normalizeKey(studentClass);
}

function getVisibleStudentExams(db, studentClass) {
  return (db.cbtExams || [])
    .filter((item) => isExamOpen(item).ok)
    .filter((item) => isStudentEligibleExam(item, studentClass));
}

function studentExamToResponse(exam) {
  return {
    id: exam.id,
    examTitle: exam.examTitle,
    examType: exam.examType,
    targetAudience: normalizeTargetAudience(exam.targetAudience, deriveTargetAudienceFromExamType(exam.examType)),
    mode: examTypeToMode(exam.examType),
    className: exam.className,
    subjects: getExamSubjects(exam),
    durationMinutes: exam.durationMinutes,
    totalQuestions: exam.totalQuestions,
    passMark: exam.passMark,
    startTime: exam.startTime,
    endTime: exam.endTime,
  };
}

function buildResultSummary(attempt, exam) {
  const totalQuestions = Number(attempt.totalQuestions || attempt.total || attempt.questionSnapshot?.length || 0);
  return {
    attemptId: attempt.id,
    examId: attempt.examId,
    examTitle: attempt.examTitle,
    examType: attempt.examType,
    examMode: attempt.examMode || examTypeToMode(attempt.examType),
    candidateName: attempt.candidateName,
    candidateId: attempt.candidateId,
    studentId: attempt.studentId || "",
    score: Number(attempt.score || 0),
    total: Number(attempt.total || totalQuestions),
    totalQuestions,
    percentage: Number(attempt.percentage || 0),
    passMark: Number(attempt.passMark || exam?.passMark || 50),
    passed: Boolean(attempt.passed),
    subjectBreakdown: attempt.subjectBreakdown || {},
    submittedAt: attempt.submittedAt || attempt.submitTime || "",
    startedAt: attempt.startedAt || attempt.startTime || "",
    resultSlipNo: attempt.resultSlipNo || "",
    status: attempt.status,
  };
}

function formatExamStatusForMessage(status) {
  return String(status || "DRAFT").replace(/_/g, " ").toLowerCase();
}

function getExamAssignmentLockMessage(exam) {
  const status = normalizeExamStatus(exam?.status, "DRAFT");
  if (status === "DRAFT") return "";
  if (status === "CLOSED") {
    return "This exam is closed, so questions can no longer be assigned. Create a new draft exam or reopen the exam before assigning questions.";
  }
  if (status === "ARCHIVED") {
    return "This exam is archived, so questions can no longer be assigned. Create a new draft exam before assigning questions.";
  }
  return `This exam is already ${formatExamStatusForMessage(status)}. Assign questions while the exam is still in draft status, before submitting it for credentials.`;
}

function describeQuestionAssignmentScope(exam) {
  const assessmentMode = getExamAssessmentMode(exam);
  const subjects = getExamSubjects(exam);
  const parts = [
    `Mode: ${assessmentMode === RECRUITMENT_ASSESSMENT_MODE ? "Recruitment Assessment" : "Student Exam"}`,
  ];

  if (assessmentMode === RECRUITMENT_ASSESSMENT_MODE) {
    parts.push(`Category: ${getRecruitmentCategoryLabel(exam.recruitmentCategory || "BASIC")}`);
    parts.push(`Assessment Areas: ${subjects.join(", ") || "none selected"}`);
  } else {
    parts.push(`Class: ${exam.className || "no class selected"}`);
    parts.push(`Subjects: ${subjects.join(", ") || "none selected"}`);
  }

  return parts.join(" | ");
}

function buildNoAssignableQuestionsMessage(exam, questions, missingSubjects = []) {
  const assessmentMode = getExamAssessmentMode(exam);
  const approved = (Array.isArray(questions) ? questions : []).filter(
    (item) => String(item.status || "").toUpperCase() === "APPROVED"
  );
  const modeApproved = approved.filter((item) => getQuestionAssessmentMode(item) === assessmentMode);
  const scope = describeQuestionAssignmentScope(exam);

  if (approved.length === 0) {
    return `No approved questions are available yet. Approve matching questions in the Question Bank first. Scope: ${scope}.`;
  }

  if (modeApproved.length === 0) {
    return `No approved ${assessmentMode === RECRUITMENT_ASSESSMENT_MODE ? "recruitment assessment" : "student exam"} questions are available. Upload or approve questions for this mode first. Scope: ${scope}.`;
  }

  if (missingSubjects.length > 0) {
    return `No approved questions match this exam. Missing ${assessmentMode === RECRUITMENT_ASSESSMENT_MODE ? "assessment area" : "subject"} entries: ${missingSubjects.join(", ")}. Scope: ${scope}.`;
  }

  return `No approved questions match this exam. Check the class, ${assessmentMode === RECRUITMENT_ASSESSMENT_MODE ? "assessment areas" : "subjects"}, and question status. Scope: ${scope}.`;
}

function buildNoSyncCandidatesMessage(db, exam, candidateType) {
  const normalizedType = normalizeCandidateType(candidateType, deriveExamCandidateType(exam));
  if (normalizedType === "STUDENT") {
    if (!exam.classId && !exam.className) {
      return "Select a class/candidate cohort before syncing student candidates.";
    }
    if (!Array.isArray(db.students) || db.students.length === 0) {
      return "No students are registered yet. Add students to the portal before syncing CBT candidates.";
    }
    return `No students match this exam class: ${exam.className || exam.classId}. Check the student class assignment first.`;
  }

  if (isRecruitmentAssessment(exam)) {
    const applications = Array.isArray(db.careerApplications) ? db.careerApplications : [];
    if (applications.length === 0) {
      return "No career applications have been submitted yet, so there are no recruitment candidates to sync.";
    }

    const parts = [getRecruitmentCategoryLabel(exam.recruitmentCategory || "BASIC")];
    if (exam.appliedRoleFilter) parts.push(`role containing "${exam.appliedRoleFilter}"`);
    if (exam.subjectSpecializationFilter) parts.push(`subject specialization containing "${exam.subjectSpecializationFilter}"`);
    return `No career applicants match this recruitment assessment filter: ${parts.join(" | ")}. Check applicant teaching level/category, role filter, and subject specialization filter.`;
  }

  if (!Array.isArray(db.admissions) || db.admissions.length === 0) {
    return "No admission applicants are available to sync.";
  }
  return "No applicants match this exam candidate filter.";
}

function buildCredentialCandidateContext(db, exam, candidateType, candidateId) {
  const normalizedType = normalizeCandidateType(candidateType, deriveExamCandidateType(exam));
  const candidateRow = (db.cbtExamCandidates || []).find((item) => (
    String(item.examId || "") === String(exam.id || "")
    && normalizeCandidateType(item.candidateType, "STUDENT") === normalizedType
    && String(item.candidateId || "") === String(candidateId || "")
  ));

  if (!candidateRow) {
    const error = new Error("Candidate assignment record not found for this exam.");
    error.status = 404;
    throw error;
  }

  if (normalizedType === "STUDENT") {
    const student = (db.students || []).find((row) => (
      [row?.id, row?.studentId, row?.admissionNo].some((value) => normalizeKey(value) === normalizeKey(candidateId))
    ));
    const className = String(candidateRow.classOrBatchSnapshot || student?.className || student?.class || "").trim();
    return {
      candidateRow,
      candidateName: String(candidateRow.fullNameSnapshot || student?.name || "Candidate").trim(),
      candidateType: normalizedType,
      className,
      studentId: String(student?.id || candidateId || "").trim(),
      details: {
        referenceLabel: "Admission No.",
        referenceValue: String(student?.admissionNo || student?.studentId || candidateId || "").trim(),
        secondaryLabel: "Class",
        secondaryValue: className,
      },
    };
  }

  const applicantProfile = buildPublicCandidateProfile(db, exam, candidateId);
  return {
    candidateRow,
    candidateName: String(candidateRow.fullNameSnapshot || applicantProfile?.name || "Candidate").trim(),
    candidateType: normalizedType,
    className: String(candidateRow.classOrBatchSnapshot || "").trim(),
    studentId: "",
    details: applicantProfile?.details || {
      referenceLabel: "Application No.",
      referenceValue: String(candidateId || "").trim(),
      secondaryLabel: "Batch",
      secondaryValue: String(candidateRow.classOrBatchSnapshot || "").trim(),
    },
  };
}

function buildAttemptResponsePayload(attempt, exam, candidateContext) {
  return {
    attemptId: attempt.id,
    attemptToken: attempt.attemptToken,
    exam: {
      id: exam.id,
      title: exam.examTitle,
      examTitle: exam.examTitle,
      mode: examTypeToMode(exam.examType),
      examType: exam.examType,
      durationMinutes: attempt.durationMinutes,
      instructions: exam.instructions,
      subjects: getExamSubjects(exam),
      passMark: exam.passMark,
      startTime: exam.startTime,
      endTime: exam.endTime,
      status: exam.status,
    },
    candidate: {
      name: candidateContext.candidateName,
      candidateId: candidateContext.candidateRow.candidateId,
      studentId: candidateContext.studentId,
      loginId: attempt.candidateLoginId || "",
      details: candidateContext.details || null,
      candidateType: candidateContext.candidateType,
    },
    questions: (attempt.questionSnapshot || []).map((row) => ({
      id: row.id,
      subject: row.subjectName,
      topic: row.topicName,
      question: row.questionText,
      questionType: normalizeQuestionType(row.questionType || "mcq_single"),
      scenarioContext: row.scenarioContext || "",
      sampleAnswer: row.sampleAnswer || "",
      evaluationRubric: row.evaluationRubric || "",
      maxScore: Number(row.maxScore || 1),
      options: row.options,
    })),
    startedAt: attempt.startedAt || attempt.startTime || "",
    remainingSeconds: Math.max(0, Math.floor((Date.parse(attempt.expiresAt || "") - Date.now()) / 1000)),
  };
}

function startAttemptForCredential(db, exam, sessionRecord, meta = {}) {
  const examStatus = String(exam.status || "").toUpperCase();
  if (!["PUBLISHED", "IN_PROGRESS"].includes(examStatus)) {
    const error = new Error("This exam is not currently open for candidate access.");
    error.status = 403;
    throw error;
  }

  const nowTime = Date.now();
  const startTime = Date.parse(String(exam.startTime || ""));
  const endTime = Date.parse(String(exam.endTime || ""));
  if (Number.isFinite(startTime) && nowTime < startTime) {
    const error = new Error("This exam has not started yet.");
    error.status = 403;
    throw error;
  }
  if (Number.isFinite(endTime) && nowTime > endTime) {
    exam.status = "CLOSED";
    const error = new Error("This exam has already closed.");
    error.status = 403;
    throw error;
  }

  const candidateContext = buildCredentialCandidateContext(
    db,
    exam,
    sessionRecord.candidateType,
    sessionRecord.candidateId
  );
  const candidateType = candidateContext.candidateType;
  const activeAttempt = (db.cbtAttempts || []).find((item) => (
    String(item.examId || "") === String(exam.id)
    && normalizeCandidateType(item.candidateType || deriveExamCandidateType(exam), "STUDENT") === candidateType
    && String(item.candidateId || "") === String(sessionRecord.candidateId || "")
    && String(item.status || "").toUpperCase() === "IN_PROGRESS"
    && Number.isFinite(Date.parse(String(item.expiresAt || "")))
    && Date.parse(String(item.expiresAt || "")) > nowTime
  ));

  if (activeAttempt) {
    return buildAttemptResponsePayload(activeAttempt, exam, candidateContext);
  }

  const submittedAttempts = (db.cbtAttempts || []).filter((item) => (
    String(item.examId || "") === String(exam.id)
    && normalizeCandidateType(item.candidateType || deriveExamCandidateType(exam), "STUDENT") === candidateType
    && String(item.candidateId || "") === String(sessionRecord.candidateId || "")
    && String(item.status || "").toUpperCase() === "SUBMITTED"
  ));
  if (submittedAttempts.length >= Math.max(1, Number(exam.attemptLimit || 1))) {
    const error = new Error("The attempt limit for this exam has already been reached.");
    error.status = 409;
    throw error;
  }

  const { questionSnapshot, missingSubjects } = buildAttemptQuestionSet(db, exam);
  if (questionSnapshot.length === 0) {
    const error = new Error("No approved questions are available for this exam.");
    error.status = 400;
    throw error;
  }
  if (missingSubjects.length > 0) {
    const error = new Error(`Missing question bank entries for: ${missingSubjects.join(", ")}`);
    error.status = 400;
    throw error;
  }

  const startedAt = nowIso();
  const durationWindowMs = Number(exam.durationMinutes || 40) * 60 * 1000;
  const maxEndTime = Number.isFinite(endTime) ? Math.min(nowTime + durationWindowMs, endTime) : nowTime + durationWindowMs;
  const expiresAt = new Date(maxEndTime).toISOString();

  const attempt = {
    id: `cbt-attempt-${nanoid(12)}`,
    examId: exam.id,
    examTitle: exam.examTitle,
    examType: exam.examType,
    examMode: examTypeToMode(exam.examType),
    targetAudience: normalizeTargetAudience(exam.targetAudience, deriveTargetAudienceFromExamType(exam.examType)),
    candidateType,
    className: candidateContext.className,
    accessCode: exam.examCode || exam.accessCode || "",
    candidateName: candidateContext.candidateName,
    candidateId: String(sessionRecord.candidateId || ""),
    candidateLoginId: String(sessionRecord.loginId || ""),
    candidateDetails: candidateContext.details || null,
    studentId: candidateContext.studentId,
    status: "IN_PROGRESS",
    durationMinutes: Number(exam.durationMinutes || 40),
    attemptToken: nanoid(24),
    startTime: startedAt,
    startedAt,
    submitTime: "",
    submittedAt: "",
    expiresAt,
    questionSnapshot,
    questionSet: questionSnapshot.map((row) => ({
      id: row.id,
      subject: row.subjectName,
      question: row.questionText,
      options: row.options,
      answerIndex: row.correctAnswerIndex,
    })),
    responses: [],
    score: 0,
    total: questionSnapshot.length,
    totalQuestions: questionSnapshot.length,
    percentage: 0,
    subjectBreakdown: {},
    passMark: Number(exam.passMark || 50),
    passed: false,
    resultSlipNo: "",
    createdAt: startedAt,
    updatedAt: startedAt,
  };

  db.cbtAttempts.unshift(attempt);
  exam.status = "IN_PROGRESS";
  exam.updatedAt = startedAt;
  db.cbtExamCandidates = (db.cbtExamCandidates || []).map((item) => {
    if (
      String(item.examId || "") === String(exam.id)
      && normalizeCandidateType(item.candidateType, "STUDENT") === candidateType
      && String(item.candidateId || "") === String(sessionRecord.candidateId || "")
    ) {
      return {
        ...item,
        accessStatus: "USED",
        startedAt,
        updatedAt: startedAt,
      };
    }
    return item;
  });

  createAuditLog(db, {
    examId: exam.id,
    candidateType,
    candidateId: sessionRecord.candidateId,
    action: "exam_started",
    performedByUserId: "",
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    metaJson: {},
  });

  return buildAttemptResponsePayload(attempt, exam, candidateContext);
}

function submitAttemptByIndex(db, idx, payloadResponses = [], meta = {}) {
  const attempt = db.cbtAttempts[idx];
  const exam = (db.cbtExams || []).find((item) => String(item.id) === String(attempt.examId));
  if (!exam) {
    const error = new Error("Exam not found for this attempt.");
    error.status = 404;
    throw error;
  }

  if (String(attempt.status || "").toUpperCase() === "SUBMITTED") {
    return buildResultSummary(attempt, exam);
  }

  const responseMap = buildResponseMap(attempt);
  for (const row of Array.isArray(payloadResponses) ? payloadResponses : []) {
    const questionId = String(row?.questionId || "").trim();
    const answerIndex = Number(row?.answerIndex);
    if (!questionId || !Number.isInteger(answerIndex)) continue;
    responseMap.set(questionId, answerIndex);
  }

  const mergedAttempt = { ...attempt, responses: buildStoredResponseRows(attempt, responseMap, payloadResponses) };
  const evaluated = evaluateAttempt(mergedAttempt, exam);
  const submittedAt = nowIso();

  db.cbtAttempts[idx] = {
    ...mergedAttempt,
    status: "SUBMITTED",
    submitTime: submittedAt,
    submittedAt,
    score: evaluated.score,
    total: evaluated.total,
    totalQuestions: evaluated.total,
    percentage: evaluated.percentage,
    subjectBreakdown: evaluated.subjectBreakdown,
    passMark: evaluated.passMark,
    passed: evaluated.passed,
    resultSlipNo: attempt.resultSlipNo || `RS-${new Date().getFullYear()}-${nanoid(6).toUpperCase()}`,
    updatedAt: submittedAt,
  };

  db.cbtExamCandidates = (db.cbtExamCandidates || []).map((item) => {
    if (
      String(item.examId || "") === String(exam.id)
      && normalizeCandidateType(item.candidateType, "STUDENT") === normalizeCandidateType(attempt.candidateType || deriveExamCandidateType(exam), "STUDENT")
      && String(item.candidateId || "") === String(attempt.candidateId || "")
    ) {
      return {
        ...item,
        accessStatus: "USED",
        completedAt: submittedAt,
        updatedAt: submittedAt,
      };
    }
    return item;
  });

  createAuditLog(db, {
    examId: exam.id,
    candidateType: attempt.candidateType || deriveExamCandidateType(exam),
    candidateId: attempt.candidateId,
    action: "exam_submitted",
    performedByUserId: "",
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    metaJson: {
      score: evaluated.score,
      total: evaluated.total,
      percentage: evaluated.percentage,
    },
  });

  return buildResultSummary(db.cbtAttempts[idx], exam);
}

function ensureCbtCollections(db) {
  let changed = false;

  if (!Array.isArray(db.cbtClasses)) { db.cbtClasses = []; changed = true; }
  if (!Array.isArray(db.cbtSubjects)) { db.cbtSubjects = []; changed = true; }
  if (!Array.isArray(db.cbtTopics)) { db.cbtTopics = []; changed = true; }
  if (!Array.isArray(db.cbtSessions)) { db.cbtSessions = []; changed = true; }
  if (!Array.isArray(db.cbtQuestionBank)) { db.cbtQuestionBank = []; changed = true; }
  if (!Array.isArray(db.cbtExams)) { db.cbtExams = []; changed = true; }
  if (!Array.isArray(db.cbtExamQuestions)) { db.cbtExamQuestions = []; changed = true; }
  if (!Array.isArray(db.cbtAttempts)) { db.cbtAttempts = []; changed = true; }
  if (!db.cbtSettings || typeof db.cbtSettings !== "object") { db.cbtSettings = {}; changed = true; }
  if (ensureCredentialCollections(db)) changed = true;

  if (db.cbtClasses.length === 0) {
    db.cbtClasses = seedClassesFromCatalog();
    changed = true;
  }

  if (db.cbtSubjects.length === 0) {
    db.cbtSubjects = seedSubjectsFromCatalog(db.cbtClasses);
    changed = true;
  }

  if (db.cbtSessions.length === 0) {
    db.cbtSessions = [
      { id: "cbt-session-term-1", name: "First Term", term: "First Term", status: "ACTIVE", createdAt: nowIso(), updatedAt: nowIso() },
      { id: "cbt-session-term-2", name: "Second Term", term: "Second Term", status: "ACTIVE", createdAt: nowIso(), updatedAt: nowIso() },
      { id: "cbt-session-term-3", name: "Third Term", term: "Third Term", status: "ACTIVE", createdAt: nowIso(), updatedAt: nowIso() },
    ];
    changed = true;
  }

  db.cbtSettings = {
    schoolName: String(db.cbtSettings.schoolName || "Angel Montessori School"),
    brandingLogoUrl: String(db.cbtSettings.brandingLogoUrl || ""),
    cbtRules: {
      oneAttemptDefault: parseBoolean(db.cbtSettings?.cbtRules?.oneAttemptDefault, true),
      enableAutoSubmit: parseBoolean(db.cbtSettings?.cbtRules?.enableAutoSubmit, true),
      enableTabSwitchWarning: parseBoolean(db.cbtSettings?.cbtRules?.enableTabSwitchWarning, true),
      showCorrectionsAfterSubmit: parseBoolean(db.cbtSettings?.cbtRules?.showCorrectionsAfterSubmit, false),
      allowResultSlipPrint: parseBoolean(db.cbtSettings?.cbtRules?.allowResultSlipPrint, true),
    },
    updatedAt: nowIso(),  };

  if (Array.isArray(db.exams) && db.exams.length > 0 && db.cbtExams.length === 0) {
    db.cbtExams = db.exams.map((row) => {
      const subjects = uniqueSubjects(SUBJECT_OPTIONS.filter((subject) => normalizeKey(row.title).includes(normalizeKey(subject))));
      const now = nowIso();
      return {
        id: String(row.id || nanoid()),
        examTitle: String(row.title || "CBT Exam").trim(),
        examType: "CLASS_TEST",
        targetAudience: "STUDENT",
        classId: "",
        className: "",
        subjectName: subjects[0] || "Mathematics",
        subjects: subjects.length > 0 ? subjects : ["Mathematics"],
        durationMinutes: 40,
        totalQuestions: 20,
        questionsPerSubject: 10,
        passMark: 50,
        shuffleQuestions: true,
        shuffleOptions: true,
        oneAttemptOnly: true,
        status: "DRAFT",
        attemptLimit: 1,
        examCode: ensureUniqueCode(db.cbtExams, ""),
        accessCode: ensureUniqueCode(db.cbtExams, ""),
        instructions: "Answer all questions and submit before time elapses.",
        sessionTerm: "",
        startTime: "",
        endTime: "",
        createdBy: "u-admin",
        createdByName: "Admin",
        createdByTeacherId: "u-admin",
        submittedAt: "",
        reviewedByOfficerId: "",
        publishedAt: "",
        createdAt: String(row.createdAt || now),
        updatedAt: now,
        title: String(row.title || "CBT Exam").trim(),
        mode: "ACADEMIC",
        classLevel: "",
      };
    });
    changed = true;
  }

  db.cbtQuestionBank = (db.cbtQuestionBank || []).map((item) => {
    const classInfo = resolveClassInfo(db, item);
    const subjectCanonical = normalizeSubject(item.subjectName || item.subject || "");
    const subjectInfo = ensureSubjectRecord(db, classInfo, subjectCanonical || item.subjectName || item.subject || "General");
    const topicInfo = ensureTopicRecord(db, item.topicName || item.topic || "", classInfo, subjectInfo, item.createdBy || "system");
    const options = parseOptions(item);
    const answerIndex = resolveAnswerIndex(item, options.length > 0 ? options : (item.options || []));
    const now = nowIso();
    return questionToResponse({
      ...item,
      id: String(item.id || nanoid()),
      classId: classInfo.classId,
      className: classInfo.className,
      subjectId: subjectInfo.subjectId,
      subjectName: subjectInfo.subjectName,
      topicId: topicInfo.topicId,
      topicName: topicInfo.topicName,
      questionText: String(item.questionText || item.question || "").trim(),
      options: options.length > 0 ? options : (Array.isArray(item.options) ? item.options : []),
      correctAnswerIndex: answerIndex >= 0 ? answerIndex : Number(item.answerIndex || 0),
      correctAnswer: ["A", "B", "C", "D", "E", "F", "G", "H"][answerIndex >= 0 ? answerIndex : Number(item.answerIndex || 0)] || "",
      difficulty: normalizeDifficulty(item.difficulty),
      status: normalizeQuestionStatus(item.status, "APPROVED"),
      createdAt: String(item.createdAt || now),
      updatedAt: now,
      approvedAt: String(item.approvedAt || ""),
    });
  });

  db.cbtExams = (db.cbtExams || []).map((item) => {
    const parsed = parseExamPayload(db, item, item);
    const now = nowIso();
    const examType = parsed.error ? normalizeExamType(item.examType || modeToExamType(item.mode), "CLASS_TEST") : parsed.examType;
    const targetAudience = parsed.error ? normalizeTargetAudience(item.targetAudience, deriveTargetAudienceFromExamType(examType)) : parsed.targetAudience;
    const subjects = parsed.error ? uniqueSubjects(item.subjects || [item.subjectName || item.subject || ""]) : parsed.subjects;
    return {
      ...item,
      id: String(item.id || nanoid()),
      examTitle: String(item.examTitle || item.title || "CBT Exam").trim(),
      examType,
      targetAudience,
      classId: parsed.error ? String(item.classId || "") : parsed.classId,
      className: parsed.error ? String(item.className || item.classLevel || "") : parsed.className,
      subjectName: parsed.error ? String(item.subjectName || item.subject || subjects[0] || "") : parsed.subjectName,
      subjects: subjects.length > 0 ? subjects : ADMISSION_DEFAULT_SUBJECTS,
      durationMinutes: parsed.error ? clampNumber(item.durationMinutes, 5, 240, 40) : parsed.durationMinutes,
      totalQuestions: parsed.error ? clampNumber(item.totalQuestions, 1, 200, 20) : parsed.totalQuestions,
      questionsPerSubject: parsed.error ? clampNumber(item.questionsPerSubject, 1, 100, 10) : parsed.questionsPerSubject,
      passMark: parsed.error ? clampNumber(item.passMark, 0, 100, 50) : parsed.passMark,
      shuffleQuestions: parsed.error ? parseBoolean(item.shuffleQuestions, true) : parsed.shuffleQuestions,
      shuffleOptions: parsed.error ? parseBoolean(item.shuffleOptions, true) : parsed.shuffleOptions,
      oneAttemptOnly: parsed.error ? parseBoolean(item.oneAttemptOnly, true) : parsed.oneAttemptOnly,
      attemptLimit: parsed.error ? Math.max(1, Number(item.attemptLimit || 1)) : parsed.attemptLimit,
      startTime: parsed.error ? parseDateTime(item.startTime) : parsed.startTime,
      endTime: parsed.error ? parseDateTime(item.endTime) : parsed.endTime,
      status: parsed.error ? normalizeExamStatus(item.status, "DRAFT") : parsed.status,
      examCode: toUpperCode(item.examCode || item.accessCode || ""),
      accessCode: toUpperCode(item.examCode || item.accessCode || ""),
      instructions: String(item.instructions || "Answer all questions and submit before time elapses.").trim(),
      sessionTerm: String(item.sessionTerm || item.term || "").trim(),
      applicantBatchId: String(item.applicantBatchId || "").trim(),
      createdByTeacherId: String(item.createdByTeacherId || item.createdBy || ""),
      submittedAt: String(item.submittedAt || ""),
      reviewedByOfficerId: String(item.reviewedByOfficerId || ""),
      publishedAt: String(item.publishedAt || ""),
      createdAt: String(item.createdAt || now),
      updatedAt: now,
      title: String(item.examTitle || item.title || "CBT Exam").trim(),
      mode: examTypeToMode(examType),
      classLevel: String(parsed.error ? item.classLevel || item.className || "" : parsed.className),
    };
  });

  db.cbtAttempts = (db.cbtAttempts || []).map((item) => {
    const questionSnapshot = Array.isArray(item.questionSnapshot)
      ? item.questionSnapshot
      : (Array.isArray(item.questionSet) ? item.questionSet.map((row) => ({
        id: row.id,
        subjectName: row.subject,
        questionText: row.question,
        options: row.options || [],
        correctAnswerIndex: Number(row.answerIndex || 0),
        topicName: row.topicName || "",
      }) ) : []);
    return {
      ...item,
      startTime: String(item.startTime || item.startedAt || item.createdAt || nowIso()),
      startedAt: String(item.startedAt || item.startTime || item.createdAt || nowIso()),
      submitTime: String(item.submitTime || item.submittedAt || ""),
      submittedAt: String(item.submittedAt || item.submitTime || ""),
      examType: String(item.examType || modeToExamType(item.examMode)).toUpperCase(),
      examMode: String(item.examMode || examTypeToMode(item.examType)).toUpperCase(),
      questionSnapshot,
      questionSet: questionSnapshot.map((row) => ({
        id: row.id,
        subject: row.subjectName || row.subject || "",
        question: row.questionText || row.question || "",
        options: row.options || [],
        answerIndex: Number(row.correctAnswerIndex || row.answerIndex || 0),
      })),
      total: Number(item.total || item.totalQuestions || questionSnapshot.length),
      totalQuestions: Number(item.totalQuestions || item.total || questionSnapshot.length),
      attemptToken: String(item.attemptToken || nanoid(24)),
    };
  });

  if (changed) writeDB(db);
  return db;
}
router.get("/metadata", auth(), requireRole("ADMIN", "TEACHER", "ACADEMIC_OFFICER", "SUPER_ADMIN", "HR_OFFICER"), (req, res) => {
  const db = ensureCbtCollections(readDB());
  const allSubjects = req.user.role === "ADMIN" || isOfficerRole(req.user.originalRole || req.user.role)
    ? SUBJECT_OPTIONS
    : getTeacherAllowedSubjects(req.user);
  const recruitmentAssessmentAreas = buildRecruitmentAssessmentAreaOptions(db);

  res.json({
    subjects: allSubjects,
    recruitmentAssessmentAreas,
    classes: [...db.cbtClasses].sort((a, b) => Number(a.levelOrder || 999) - Number(b.levelOrder || 999)),
    classSubjects: CLASS_SUBJECTS,
    admissionDefaultSubjects: ADMISSION_DEFAULT_SUBJECTS,
    examModes: ["ACADEMIC", "ADMISSION", "INTERVIEW"],
    assessmentModes: ASSESSMENT_MODES,
    targetAudiences: TARGET_AUDIENCES,
    examTypes: EXAM_TYPES,
    questionStatuses: QUESTION_STATUSES,
    difficulties: DIFFICULTIES,
    questionTypes: QUESTION_TYPES,
    recruitmentCategories: RECRUITMENT_CATEGORY_OPTIONS,
    uploadColumns: [
      "Class",
      "Subject",
      "Topic",
      "Question",
      "Option_A",
      "Option_B",
      "Option_C",
      "Option_D",
      "Correct_Answer",
      "Difficulty",
      "Explanation",
    ],
  });
});

const sendOverview = (req, res) => {
  const db = ensureCbtCollections(readDB());
  const questions = filterQuestionsForUser(req.user, db.cbtQuestionBank || []);
  const exams = filterExamsForUser(req.user, db.cbtExams || []);
  const submittedAttempts = (db.cbtAttempts || []).filter((item) => String(item.status || "").toUpperCase() === "SUBMITTED");
  const visibleAttempts = req.user.role === "ADMIN"
    ? submittedAttempts
    : submittedAttempts.filter((attempt) => {
      const subjects = Object.keys(attempt.subjectBreakdown || {});
      const allowed = new Set(getTeacherAllowedSubjects(req.user));
      return subjects.some((subject) => allowed.has(normalizeSubject(subject)));
    });

  const passCount = visibleAttempts.filter((item) => Boolean(item.passed)).length;
  const passRate = visibleAttempts.length ? Number(((passCount / visibleAttempts.length) * 100).toFixed(2)) : 0;

  return res.json({
    totals: {
      classes: (db.cbtClasses || []).length,
      subjects: (db.cbtSubjects || []).length,
      questions: questions.length,
      pendingQuestions: questions.filter((item) => item.status === "PENDING").length,
      approvedQuestions: questions.filter((item) => item.status === "APPROVED").length,
      exams: exams.length,
      publishedExams: exams.filter((item) => item.status === "PUBLISHED").length,
      submittedAttempts: visibleAttempts.length,
      passRate,
    },
    recentExams: exams
      .slice()
      .sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")))
      .slice(0, 8)
      .map((item) => examToResponse(item, db)),
    recentAttempts: visibleAttempts
      .slice()
      .sort((a, b) => String(b.submittedAt || b.submitTime || b.startedAt || "").localeCompare(String(a.submittedAt || a.submitTime || a.startedAt || "")))
      .slice(0, 12)
      .map((item) => attemptToResponse(item)),
  });
};

router.get("/admin/overview", auth(), requireRole("ADMIN", "TEACHER", "ACADEMIC_OFFICER", "SUPER_ADMIN"), sendOverview);
router.get("/overview", auth(), requireRole("ADMIN", "TEACHER", "ACADEMIC_OFFICER", "SUPER_ADMIN"), sendOverview);

router.get("/classes", auth(), requireRole("ADMIN", "TEACHER", "ACADEMIC_OFFICER", "SUPER_ADMIN"), (req, res) => {
  const db = ensureCbtCollections(readDB());
  res.json(
    [...db.cbtClasses].sort((a, b) => Number(a.levelOrder || 999) - Number(b.levelOrder || 999))
  );
});

router.post("/classes", auth(), requireRole("ADMIN"), (req, res) => {
  const db = ensureCbtCollections(readDB());
  const className = String(req.body?.className || req.body?.name || "").trim();
  if (!className) return res.status(400).json({ message: "className is required" });

  const exists = (db.cbtClasses || []).find((item) => normalizeKey(item.className) === normalizeKey(className));
  if (exists) return res.status(409).json({ message: "Class already exists" });

  const now = nowIso();
  const item = {
    id: `cbt-class-${slugify(className)}-${nanoid(4)}`,
    className,
    section: String(req.body?.section || getSectionForClass(className)).trim(),
    levelOrder: clampNumber(req.body?.levelOrder, 1, 999, (db.cbtClasses || []).length + 1),
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
  };
  db.cbtClasses.push(item);
  writeDB(db);
  return res.status(201).json(item);
});

router.get("/subjects", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = ensureCbtCollections(readDB());
  const classFilter = String(req.query.classId || req.query.className || "").trim();
  let items = [...(db.cbtSubjects || [])];

  if (classFilter) {
    items = items.filter((item) => (
      String(item.classId || "") === classFilter || normalizeKey(item.className) === normalizeKey(classFilter)
    ));
  }

  if (req.user.role === "TEACHER") {
    const allowed = new Set(getTeacherAllowedSubjects(req.user));
    items = items.filter((item) => allowed.has(normalizeSubject(item.subjectName)));
  }

  return res.json(
    items.sort((a, b) => String(a.subjectName || "").localeCompare(String(b.subjectName || "")))
  );
});

router.post("/subjects", auth(), requireRole("ADMIN"), (req, res) => {
  const db = ensureCbtCollections(readDB());
  const classInfo = resolveClassInfo(db, req.body || {});
  if (!classInfo.className) return res.status(400).json({ message: "className or classId is required" });

  const subjectName = normalizeSubject(req.body?.subjectName || req.body?.subject || "");
  if (!subjectName) return res.status(400).json({ message: "Valid subjectName is required" });

  const exists = (db.cbtSubjects || []).find((item) => (
    normalizeKey(item.className) === normalizeKey(classInfo.className)
    && normalizeKey(item.subjectName) === normalizeKey(subjectName)
  ));
  if (exists) return res.status(409).json({ message: "Subject already exists for this class" });

  const now = nowIso();
  const item = {
    id: `cbt-subject-${nanoid(10)}`,
    classId: classInfo.classId,
    className: classInfo.className,
    subjectName,
    category: String(req.body?.category || "GENERAL").toUpperCase(),
    status: "ACTIVE",
    createdBy: String(req.user.id || ""),
    createdAt: now,
    updatedAt: now,
  };
  db.cbtSubjects.unshift(item);
  writeDB(db);
  return res.status(201).json(item);
});

router.get("/topics", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = ensureCbtCollections(readDB());
  let items = [...(db.cbtTopics || [])];
  const classFilter = String(req.query.classId || req.query.className || "").trim();
  const subjectFilter = normalizeSubject(req.query.subject || req.query.subjectName || "");

  if (classFilter) {
    items = items.filter((item) => (
      String(item.classId || "") === classFilter || normalizeKey(item.className) === normalizeKey(classFilter)
    ));
  }
  if (subjectFilter) {
    items = items.filter((item) => normalizeSubject(item.subjectName) === subjectFilter);
  }
  if (req.user.role === "TEACHER") {
    const allowed = new Set(getTeacherAllowedSubjects(req.user));
    items = items.filter((item) => allowed.has(normalizeSubject(item.subjectName)));
  }

  return res.json(
    items.sort((a, b) => String(a.topicName || "").localeCompare(String(b.topicName || "")))
  );
});

router.post("/topics", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = ensureCbtCollections(readDB());
  const classInfo = resolveClassInfo(db, req.body || {});
  const subjectName = normalizeSubject(req.body?.subjectName || req.body?.subject || "");
  const topicName = String(req.body?.topicName || req.body?.topic || "").trim();

  if (!subjectName) return res.status(400).json({ message: "Valid subjectName is required" });
  if (!topicName) return res.status(400).json({ message: "topicName is required" });
  if (!canManageSubject(req.user, subjectName)) {
    return res.status(403).json({ message: "Not allowed for this subject" });
  }

  const subjectInfo = ensureSubjectRecord(db, classInfo, subjectName, req.user.id);
  const topicInfo = ensureTopicRecord(db, topicName, classInfo, subjectInfo, req.user.id);
  writeDB(db);
  return res.status(201).json((db.cbtTopics || []).find((item) => String(item.id) === String(topicInfo.topicId)));
});

router.get("/sessions", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = ensureCbtCollections(readDB());
  return res.json(
    [...(db.cbtSessions || [])].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
  );
});

router.post("/sessions", auth(), requireRole("ADMIN"), (req, res) => {
  const db = ensureCbtCollections(readDB());
  const name = String(req.body?.name || req.body?.term || "").trim();
  if (!name) return res.status(400).json({ message: "name is required" });

  const exists = (db.cbtSessions || []).find((item) => normalizeKey(item.name) === normalizeKey(name));
  if (exists) return res.status(409).json({ message: "Session/term already exists" });

  const now = nowIso();
  const item = {
    id: `cbt-session-${nanoid(8)}`,
    name,
    term: String(req.body?.term || name).trim(),
    session: String(req.body?.session || "").trim(),
    startDate: parseDateTime(req.body?.startDate),
    endDate: parseDateTime(req.body?.endDate),
    status: String(req.body?.status || "ACTIVE").toUpperCase(),
    createdAt: now,
    updatedAt: now,
  };
  db.cbtSessions.unshift(item);
  writeDB(db);
  return res.status(201).json(item);
});

router.patch("/sessions/:id", auth(), requireRole("ADMIN"), (req, res) => {
  const db = ensureCbtCollections(readDB());
  const idx = (db.cbtSessions || []).findIndex((item) => String(item.id) === String(req.params.id));
  if (idx < 0) return res.status(404).json({ message: "Session/term not found" });

  const current = db.cbtSessions[idx];
  db.cbtSessions[idx] = {
    ...current,
    name: req.body?.name !== undefined ? String(req.body.name || "").trim() : current.name,
    term: req.body?.term !== undefined ? String(req.body.term || "").trim() : current.term,
    session: req.body?.session !== undefined ? String(req.body.session || "").trim() : current.session,
    startDate: req.body?.startDate !== undefined ? parseDateTime(req.body.startDate) : current.startDate,
    endDate: req.body?.endDate !== undefined ? parseDateTime(req.body.endDate) : current.endDate,
    status: req.body?.status !== undefined ? String(req.body.status || "").toUpperCase() : current.status,
    updatedAt: nowIso(),  };
  writeDB(db);
  return res.json(db.cbtSessions[idx]);
});

function normalizeQuestionFilters(input = {}) {
  const assessmentModeFilter = normalizeAssessmentMode(input.assessmentMode || "", "");
  return {
    subjectFilter: normalizeAssessmentSubject(input.subject || input.subjectName || ""),
    classFilter: String(input.classId || input.className || input.classLevel || "").trim(),
    topicFilter: String(input.topic || input.topicName || "").trim(),
    statusFilter: String(input.status || "").trim().toUpperCase(),
    difficultyFilter: String(input.difficulty || "").trim().toUpperCase(),
    assessmentModeFilter,
    recruitmentCategoryFilter: normalizeRecruitmentCategory(input.recruitmentCategory || "", ""),
    questionTypeFilter: normalizeQuestionType(input.questionType || "", ""),
  };
}

function hasAnyQuestionFilter(filters = {}) {
  const normalized = normalizeQuestionFilters(filters);
  return Object.values(normalized).some((value) => String(value || "").trim());
}

function applyQuestionFilters(items, filters = {}) {
  const {
    subjectFilter,
    classFilter,
    topicFilter,
    statusFilter,
    difficultyFilter,
    assessmentModeFilter,
    recruitmentCategoryFilter,
    questionTypeFilter,
  } = normalizeQuestionFilters(filters);

  let output = Array.isArray(items) ? items.slice() : [];

  if (subjectFilter) {
    output = output.filter((item) => (
      normalizeAssessmentSubject(item.subjectName || item.subject) === subjectFilter
    ));
  }
  if (classFilter) {
    output = output.filter((item) => (
      String(item.classId || "") === classFilter || normalizeKey(item.className || item.classLevel) === normalizeKey(classFilter)
    ));
  }
  if (topicFilter) output = output.filter((item) => normalizeKey(item.topicName) === normalizeKey(topicFilter));
  if (statusFilter && QUESTION_STATUSES.includes(statusFilter)) output = output.filter((item) => String(item.status) === statusFilter);
  if (difficultyFilter && DIFFICULTIES.includes(difficultyFilter)) output = output.filter((item) => String(item.difficulty) === difficultyFilter);
  if (assessmentModeFilter) {
    output = output.filter((item) => normalizeAssessmentMode(item.assessmentMode, STUDENT_ASSESSMENT_MODE) === assessmentModeFilter);
  }
  if (recruitmentCategoryFilter) {
    output = output.filter((item) => normalizeRecruitmentCategory(item.recruitmentCategory || "", "") === recruitmentCategoryFilter);
  }
  if (questionTypeFilter) {
    output = output.filter((item) => normalizeQuestionType(item.questionType || item.type, "") === questionTypeFilter);
  }

  return output;
}

function setQuestionApprovalState(item, user, status) {
  const now = nowIso();
  return {
    ...item,
    status,
    approvedBy: String(user?.id || ""),
    approvedByName: String(user?.name || ""),
    approvedAt: now,
    updatedAt: now,
  };
}

function bulkUpdateFilteredQuestionStatus(db, user, filters, status) {
  if (!QUESTION_STATUSES.includes(status)) {
    return { error: "Invalid question status." };
  }
  if (!hasAnyQuestionFilter(filters)) {
    return { error: `Set at least one question-bank filter before bulk ${String(status || "").toLowerCase()}.`, status: 400 };
  }

  const visibleQuestions = filterQuestionsForUser(user, db.cbtQuestionBank || []);
  const matches = applyQuestionFilters(visibleQuestions, filters);
  if (!matches.length) {
    return { error: "No questions match the selected filters.", status: 404 };
  }

  const idsToUpdate = new Set(matches.map((item) => String(item.id)));
  let updated = 0;
  db.cbtQuestionBank = (db.cbtQuestionBank || []).map((item) => {
    if (!idsToUpdate.has(String(item.id))) return item;
    updated += 1;
    return setQuestionApprovalState(item, user, status);
  });
  writeDB(db);
  return {
    updated,
    status,
    filters: normalizeQuestionFilters(filters),
  };
}

router.get("/questions", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = ensureCbtCollections(readDB());
  const items = applyQuestionFilters(filterQuestionsForUser(req.user, db.cbtQuestionBank || []), req.query || {});

  return res.json(
    items
      .slice()
      .sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")))
      .map(questionToResponse)
  );
});

router.post("/questions", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = ensureCbtCollections(readDB());
  const built = prepareQuestionRecord(db, req.body || {}, req.user);
  if (built.error) return res.status(400).json({ message: built.error });

  db.cbtQuestionBank.unshift(built.item);
  writeDB(db);
  return res.status(201).json(questionToResponse(built.item));
});

router.patch("/questions/:id", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = ensureCbtCollections(readDB());
  const idx = (db.cbtQuestionBank || []).findIndex((item) => String(item.id) === String(req.params.id));
  if (idx < 0) return res.status(404).json({ message: "Question not found" });

  const current = db.cbtQuestionBank[idx];
  if (!canManageSubject(req.user, current.subjectName || current.subject)) {
    return res.status(403).json({ message: "Not allowed for this subject" });
  }

  const mergedInput = { ...current, ...req.body, id: current.id };
  const rebuilt = prepareQuestionRecord(db, mergedInput, req.user);
  if (rebuilt.error) return res.status(400).json({ message: rebuilt.error });

  const item = {
    ...current,
    ...rebuilt.item,
    createdAt: current.createdAt || rebuilt.item.createdAt,
    updatedAt: nowIso(),  };

  if (req.user.role === "TEACHER") {
    item.status = "PENDING";
    item.approvedBy = "";
    item.approvedByName = "";
    item.approvedAt = "";
  } else if (req.body.status) {
    item.status = normalizeQuestionStatus(req.body.status, item.status);
    if (item.status === "APPROVED") {
      item.approvedBy = String(req.user.id || "");
      item.approvedByName = String(req.user.name || "");
      item.approvedAt = nowIso();
    }
  }

  db.cbtQuestionBank[idx] = questionToResponse(item);
  writeDB(db);
  return res.json(questionToResponse(db.cbtQuestionBank[idx]));
});

router.post("/questions/:id/approve", auth(), requireRole("ADMIN"), (req, res) => {
  const db = ensureCbtCollections(readDB());
  const idx = (db.cbtQuestionBank || []).findIndex((item) => String(item.id) === String(req.params.id));
  if (idx < 0) return res.status(404).json({ message: "Question not found" });

  db.cbtQuestionBank[idx] = {
    ...db.cbtQuestionBank[idx],
    status: "APPROVED",
    approvedBy: String(req.user.id || ""),
    approvedByName: String(req.user.name || ""),
    approvedAt: nowIso(),
    updatedAt: nowIso(),  };
  writeDB(db);
  return res.json(questionToResponse(db.cbtQuestionBank[idx]));
});

router.post("/questions/:id/reject", auth(), requireRole("ADMIN"), (req, res) => {
  const db = ensureCbtCollections(readDB());
  const idx = (db.cbtQuestionBank || []).findIndex((item) => String(item.id) === String(req.params.id));
  if (idx < 0) return res.status(404).json({ message: "Question not found" });

  db.cbtQuestionBank[idx] = {
    ...db.cbtQuestionBank[idx],
    status: "REJECTED",
    approvedBy: String(req.user.id || ""),
    approvedByName: String(req.user.name || ""),
    approvedAt: nowIso(),
    updatedAt: nowIso(),  };
  writeDB(db);
  return res.json(questionToResponse(db.cbtQuestionBank[idx]));
});

router.post("/questions/bulk-delete", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = ensureCbtCollections(readDB());
  const filters = req.body?.filters && typeof req.body.filters === "object" ? req.body.filters : (req.body || {});

  if (!hasAnyQuestionFilter(filters)) {
    return res.status(400).json({ message: "Set at least one question-bank filter before bulk delete." });
  }

  const visibleQuestions = filterQuestionsForUser(req.user, db.cbtQuestionBank || []);
  const matches = applyQuestionFilters(visibleQuestions, filters);
  if (!matches.length) {
    return res.status(404).json({ message: "No questions match the selected filters." });
  }

  const idsToDelete = new Set(matches.map((item) => String(item.id)));
  db.cbtQuestionBank = (db.cbtQuestionBank || []).filter((item) => !idsToDelete.has(String(item.id)));
  writeDB(db);

  return res.json({
    deleted: idsToDelete.size,
    remaining: db.cbtQuestionBank.length,
    filters: normalizeQuestionFilters(filters),
  });
});

router.post("/questions/bulk-approve", auth(), requireRole("ADMIN"), (req, res) => {
  const db = ensureCbtCollections(readDB());
  const filters = req.body?.filters && typeof req.body.filters === "object" ? req.body.filters : (req.body || {});
  const result = bulkUpdateFilteredQuestionStatus(db, req.user, filters, "APPROVED");
  if (result.error) return res.status(result.status || 400).json({ message: result.error });
  return res.json(result);
});

router.post("/questions/bulk-reject", auth(), requireRole("ADMIN"), (req, res) => {
  const db = ensureCbtCollections(readDB());
  const filters = req.body?.filters && typeof req.body.filters === "object" ? req.body.filters : (req.body || {});
  const result = bulkUpdateFilteredQuestionStatus(db, req.user, filters, "REJECTED");
  if (result.error) return res.status(result.status || 400).json({ message: result.error });
  return res.json(result);
});

function extractBulkRows(body) {
  if (Array.isArray(body.rows) && body.rows.length > 0) return body.rows.map((row) => ({ ...row }));
  if (Array.isArray(body.questions) && body.questions.length > 0) return body.questions.map((row) => ({ ...row }));
  return [];
}

function pickRowValue(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) return row[key];
  }
  return "";
}

router.post("/questions/bulk", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = ensureCbtCollections(readDB());
  const rows = extractBulkRows(req.body || {});
  if (rows.length === 0) return res.status(400).json({ message: "rows/questions array is required" });

  const created = [];
  const failed = [];

    rows.forEach((row, index) => {
      const payload = {
        className: pickRowValue(row, ["className", "classLevel", "Class", "class", "class_id"]) || req.body?.className || req.body?.classLevel,
        subjectName: pickRowValue(row, ["subjectName", "subject", "Subject", "assessmentArea", "Assessment_Area", "Assessment Area"]) || req.body?.subject || req.body?.subjectName || req.body?.assessmentArea,
        assessmentArea: pickRowValue(row, ["assessmentArea", "Assessment_Area", "Assessment Area", "subjectName", "subject", "Subject"]) || req.body?.assessmentArea || req.body?.subject || req.body?.subjectName,
        topicName: pickRowValue(row, ["topicName", "topic", "Topic"]),
        questionText: pickRowValue(row, ["questionText", "question", "Question"]),
        options: Array.isArray(row.options) ? row.options : undefined,
      optionA: pickRowValue(row, ["optionA", "option_a", "Option_A"]),
      optionB: pickRowValue(row, ["optionB", "option_b", "Option_B"]),
      optionC: pickRowValue(row, ["optionC", "option_c", "Option_C"]),
      optionD: pickRowValue(row, ["optionD", "option_d", "Option_D"]),
      correctAnswer: pickRowValue(row, ["correctAnswer", "Correct_Answer", "answer"]),
      answerIndex: pickRowValue(row, ["answerIndex", "correctAnswerIndex"]),
        explanation: pickRowValue(row, ["explanation", "Explanation"]),
        difficulty: pickRowValue(row, ["difficulty", "Difficulty"]),
        status: pickRowValue(row, ["status"]),
        assessmentMode: pickRowValue(row, ["assessmentMode", "Assessment_Mode"]) || req.body?.assessmentMode,
        recruitmentCategory: pickRowValue(row, ["recruitmentCategory", "Recruitment_Category", "Recruitment Category", "teachingCategory", "Teaching_Category"]) || req.body?.recruitmentCategory,
      };

    const built = prepareQuestionRecord(db, payload, req.user);
    if (built.error) {
      failed.push({ line: index + 1, message: built.error });
      return;
    }
    created.push(built.item);
  });

  if (created.length === 0) {
    return res.status(400).json({ message: "No valid questions uploaded", failed });
  }

  db.cbtQuestionBank = [...created, ...db.cbtQuestionBank];
  writeDB(db);
  return res.status(201).json({
    created: created.length,
    failed,
    items: created.map(questionToResponse),
  });
});

router.get("/exams", auth(), requireRole("ADMIN", "TEACHER", "ACADEMIC_OFFICER", "SUPER_ADMIN", "HR_OFFICER"), (req, res) => {
  const db = ensureCbtCollections(readDB());
  const classFilter = String(req.query.classId || req.query.className || "").trim();
  const statusFilter = String(req.query.status || "").trim().toUpperCase();
  const typeFilter = String(req.query.examType || "").trim().toUpperCase();
  const assessmentModeFilter = normalizeAssessmentMode(req.query.assessmentMode || "", "");

  let items = filterExamsForUser(req.user, db.cbtExams || []);
  if (classFilter) {
    items = items.filter((item) => (
      String(item.classId || "") === classFilter || normalizeKey(item.className) === normalizeKey(classFilter)
    ));
  }
  if (statusFilter && EXAM_STATUSES.includes(statusFilter)) {
    items = items.filter((item) => String(item.status) === statusFilter);
  }
  if (typeFilter && EXAM_TYPES.includes(typeFilter)) {
    items = items.filter((item) => String(item.examType) === typeFilter);
  }
  if (assessmentModeFilter && ASSESSMENT_MODES.includes(assessmentModeFilter)) {
    items = items.filter((item) => getExamAssessmentMode(item) === assessmentModeFilter);
  }

  return res.json(
    items
      .slice()
      .sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")))
      .map((item) => examToResponse(item, db))
  );
});

router.post("/exams", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = ensureCbtCollections(readDB());
  const parsed = parseExamPayload(db, req.body || {});
  if (parsed.error) return res.status(400).json({ message: parsed.error });

  const examCode = ensureUniqueCode(db.cbtExams || [], req.body?.examCode || req.body?.accessCode);
  if (!examCode) return res.status(409).json({ message: "examCode already exists" });

  const now = nowIso();
  const exam = {
    id: `cbt-exam-${nanoid(10)}`,
    ...parsed,
    examCode,
    accessCode: examCode,
    status: "DRAFT",
    createdByTeacherId: String(req.user.id || ""),
    createdBy: String(req.user.id || ""),
    createdByName: String(req.user.name || ""),
    submittedAt: "",
    reviewedByOfficerId: "",
    publishedAt: "",
    createdAt: now,
    updatedAt: now,
    title: parsed.examTitle,
    mode: examTypeToMode(parsed.examType),
    classLevel: parsed.className,
  };

  db.cbtExams.unshift(exam);
  db.exams = Array.isArray(db.exams) ? db.exams : [];
  db.exams.unshift({ id: exam.id, title: exam.examTitle, createdAt: now });
  writeDB(db);

  return res.status(201).json(examToResponse(exam, db));
});

router.patch("/exams/:id", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = ensureCbtCollections(readDB());
  const idx = (db.cbtExams || []).findIndex((item) => String(item.id) === String(req.params.id));
  if (idx < 0) return res.status(404).json({ message: "Exam not found" });

  const current = db.cbtExams[idx];
  if (!canUserEditExamDraft(req.user, current)) {
    return res.status(403).json({ message: "Only draft exams created by the teacher can be edited." });
  }
  const parsed = parseExamPayload(db, { ...current, ...req.body }, current);
  if (parsed.error) return res.status(400).json({ message: parsed.error });

  let examCode = toUpperCode(req.body?.examCode || req.body?.accessCode || current.examCode || current.accessCode);
  if (req.body?.examCode !== undefined || req.body?.accessCode !== undefined) {
    examCode = ensureUniqueCode(db.cbtExams || [], req.body?.examCode || req.body?.accessCode, current.id);
    if (!examCode) return res.status(409).json({ message: "examCode already exists" });
  }

  db.cbtExams[idx] = {
    ...current,
    ...parsed,
    examCode: examCode || current.examCode || current.accessCode,
    accessCode: examCode || current.accessCode,
    createdByTeacherId: String(current.createdByTeacherId || current.createdBy || req.user.id || ""),
    updatedAt: nowIso(),
    title: parsed.examTitle,
    mode: examTypeToMode(parsed.examType),
    classLevel: parsed.className,
  };
  writeDB(db);
  return res.json(examToResponse(db.cbtExams[idx], db));
});

router.get("/exams/:id", auth(), requireRole("ADMIN", "TEACHER", "ACADEMIC_OFFICER", "SUPER_ADMIN", "HR_OFFICER"), (req, res) => {
  const db = ensureCbtCollections(readDB());
  const exam = (db.cbtExams || []).find((item) => String(item.id) === String(req.params.id));
  if (!exam) return res.status(404).json({ message: "Exam not found" });
  if (!canUserViewExam(req.user, exam)) return res.status(403).json({ message: "Not allowed to view this exam" });
  return res.json(buildExamDetail(db, exam));
});

router.post("/exams/:id/candidates/sync", auth(), requireRole("ADMIN", "TEACHER", "ACADEMIC_OFFICER", "SUPER_ADMIN", "HR_OFFICER"), (req, res) => {
  const db = ensureCbtCollections(readDB());
  const exam = (db.cbtExams || []).find((item) => String(item.id) === String(req.params.id));
  if (!exam) return res.status(404).json({ message: "Exam not found" });
  if (!canUserViewExam(req.user, exam)) return res.status(403).json({ message: "Not allowed to sync candidates for this exam" });
  if (req.user.role === "TEACHER" && ["PUBLISHED", "IN_PROGRESS", "CLOSED", "ARCHIVED"].includes(String(exam.status || "").toUpperCase())) {
    return res.status(409).json({ message: "Teachers can only sync candidates before the exam is published." });
  }

  const result = syncExamCandidates(db, exam, req.user, {
    candidateType: normalizeCandidateType(req.body?.candidateType, deriveExamCandidateType(exam)),
    candidateIds: Array.isArray(req.body?.candidateIds) ? req.body.candidateIds : [],
    ...getCandidateCredentialMeta(req),
  });

  if (Number(result.total || 0) === 0) {
    return res.status(400).json({
      ...result,
      exam: examToResponse(exam, db),
      summary: summarizeExam(db, exam),
      message: buildNoSyncCandidatesMessage(db, exam, result.candidateType),
    });
  }

  writeDB(db);
  return res.json({
    ...result,
    exam: examToResponse(exam, db),
    summary: summarizeExam(db, exam),
  });
});

router.post("/exams/:id/credentials/generate", auth(), requireRole("ACADEMIC_OFFICER", "SUPER_ADMIN", "HR_OFFICER"), async (req, res) => {
  try {
    const db = ensureCbtCollections(readDB());
    const exam = getExamOrFail(db, req.params.id);
    const result = await generateCredentials(db, exam, req.user, {
      mode: req.body?.mode,
      passwordLength: req.body?.passwordLength,
      expiresAt: req.body?.expiresAt,
      ...getCandidateCredentialMeta(req),
    });
    writeDB(db);
    return res.json({
      exam: examToResponse(exam, db),
      summary: summarizeExam(db, exam),
      generated: result.generated,
      skipped: result.skipped,
      regenerated: result.regenerated,
      mode: result.mode,
    });
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message || "Failed to generate credentials" });
  }
});

router.post("/exams/:id/credentials/reset/:candidateType/:candidateId", auth(), requireRole("ACADEMIC_OFFICER", "SUPER_ADMIN", "HR_OFFICER"), async (req, res) => {
  try {
    const db = ensureCbtCollections(readDB());
    const exam = getExamOrFail(db, req.params.id);
    const credential = await resetCandidateCredential(
      db,
      exam,
      req.params.candidateType,
      req.params.candidateId,
      req.user,
      {
        passwordLength: req.body?.passwordLength,
        expiresAt: req.body?.expiresAt,
        ...getCandidateCredentialMeta(req),
      }
    );
    writeDB(db);
    return res.json({
      credential,
      exam: examToResponse(exam, db),
      summary: summarizeExam(db, exam),
    });
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message || "Failed to reset credential" });
  }
});

router.post("/exams/:id/credentials/revoke/:candidateType/:candidateId", auth(), requireRole("ACADEMIC_OFFICER", "SUPER_ADMIN", "HR_OFFICER"), (req, res) => {
  try {
    const db = ensureCbtCollections(readDB());
    const exam = getExamOrFail(db, req.params.id);
    const revoked = revokeCandidateCredential(
      db,
      exam,
      req.params.candidateType,
      req.params.candidateId,
      req.user,
      getCandidateCredentialMeta(req)
    );
    writeDB(db);
    return res.json({
      revoked,
      exam: examToResponse(exam, db),
      summary: summarizeExam(db, exam),
    });
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message || "Failed to revoke credential" });
  }
});

router.post("/exams/:id/publish", auth(), requireRole("ACADEMIC_OFFICER", "SUPER_ADMIN", "HR_OFFICER"), (req, res) => {
  try {
    const db = ensureCbtCollections(readDB());
    const exam = getExamOrFail(db, req.params.id);
    publishExamWithWorkflow(db, exam, req.user, getCandidateCredentialMeta(req));
    writeDB(db);
    return res.json(examToResponse(exam, db));
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message || "Failed to publish exam" });
  }
});

router.post("/exams/:id/close", auth(), requireRole("ACADEMIC_OFFICER", "SUPER_ADMIN", "HR_OFFICER"), (req, res) => {
  try {
    const db = ensureCbtCollections(readDB());
    const exam = getExamOrFail(db, req.params.id);
    closeExamWithWorkflow(db, exam, req.user, getCandidateCredentialMeta(req));
    writeDB(db);
    return res.json(examToResponse(exam, db));
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message || "Failed to close exam" });
  }
});

router.get("/exams/:id/credentials/export.csv", auth(), requireRole("ACADEMIC_OFFICER", "SUPER_ADMIN", "HR_OFFICER"), (req, res) => {
  try {
    const db = ensureCbtCollections(readDB());
    const exam = getExamOrFail(db, req.params.id);
    const rows = buildCredentialExportRows(db, exam);
    createAuditLog(db, {
      examId: exam.id,
      action: "export_csv",
      performedByUserId: req.user?.id,
      ...getCandidateCredentialMeta(req),
      metaJson: { rows: rows.length },
    });
    writeDB(db);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=\"${String(exam.examCode || exam.accessCode || exam.id)}-credentials.csv\"`);
    return res.send(buildCredentialCsv(rows));
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message || "Failed to export credentials CSV" });
  }
});

router.get("/exams/:id/credentials/export.pdf", auth(), requireRole("ACADEMIC_OFFICER", "SUPER_ADMIN", "HR_OFFICER"), (req, res) => {
  try {
    const db = ensureCbtCollections(readDB());
    const exam = getExamOrFail(db, req.params.id);
    const rows = buildCredentialExportRows(db, exam);
    createAuditLog(db, {
      examId: exam.id,
      action: "export_pdf",
      performedByUserId: req.user?.id,
      ...getCandidateCredentialMeta(req),
      metaJson: { rows: rows.length },
    });
    createAuditLog(db, {
      examId: exam.id,
      action: "printed_slips",
      performedByUserId: req.user?.id,
      ...getCandidateCredentialMeta(req),
      metaJson: { rows: rows.length },
    });
    writeDB(db);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=\"${String(exam.examCode || exam.accessCode || exam.id)}-credentials.pdf\"`);
    return res.send(buildCredentialPdfBuffer(exam, rows));
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message || "Failed to export credentials PDF" });
  }
});
router.post("/exams/:id/questions/assign", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = ensureCbtCollections(readDB());
  const exam = (db.cbtExams || []).find((item) => String(item.id) === String(req.params.id));
  if (!exam) return res.status(404).json({ message: "Exam not found" });

  const lockMessage = getExamAssignmentLockMessage(exam);
  if (lockMessage) {
    return res.status(409).json({ message: lockMessage });
  }

  if (req.user.role === "TEACHER") {
    const allowed = new Set(getTeacherAllowedSubjects(req.user));
    const examSubjects = getExamSubjects(exam);
    if (!examSubjects.some((subject) => allowed.has(subject))) {
      return res.status(403).json({ message: "Not allowed to assign questions for this exam" });
    }
  }

  let selected = [];
  let missingSubjects = [];
  const inputIds = Array.isArray(req.body?.questionIds) ? req.body.questionIds.map((id) => String(id)) : [];

  if (inputIds.length > 0) {
    const visible = filterQuestionsForUser(req.user, db.cbtQuestionBank || []);
    const byId = new Map(visible.map((item) => [String(item.id), item]));
    selected = inputIds.map((id) => byId.get(id)).filter(Boolean);
  } else {
    const picked = pickQuestionsForExam(exam, filterQuestionsForUser(req.user, db.cbtQuestionBank || []));
    selected = picked.selected;
    missingSubjects = picked.missingSubjects;
  }

  if (selected.length === 0) {
    return res.status(400).json({
      message: buildNoAssignableQuestionsMessage(
        exam,
        filterQuestionsForUser(req.user, db.cbtQuestionBank || []),
        missingSubjects
      ),
      missingSubjects,
    });
  }

  const orderMap = selected.map((question, idx) => ({
    id: `cbt-exam-question-${nanoid(8)}`,
    examId: exam.id,
    questionId: String(question.id),
    order: idx + 1,
    createdAt: nowIso(),
  }));

  db.cbtExamQuestions = (db.cbtExamQuestions || []).filter((item) => String(item.examId) !== String(exam.id));
  db.cbtExamQuestions.push(...orderMap);
  writeDB(db);

  return res.json({
    examId: exam.id,
    assigned: orderMap.length,
    missingSubjects,
  });
});

router.get("/exams/:id/questions", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = ensureCbtCollections(readDB());
  const exam = (db.cbtExams || []).find((item) => String(item.id) === String(req.params.id));
  if (!exam) return res.status(404).json({ message: "Exam not found" });

  if (req.user.role === "TEACHER") {
    const allowed = new Set(getTeacherAllowedSubjects(req.user));
    if (!getExamSubjects(exam).some((subject) => allowed.has(subject))) {
      return res.status(403).json({ message: "Not allowed for this exam" });
    }
  }

  const mapById = new Map((db.cbtQuestionBank || []).map((item) => [String(item.id), item]));
  const assigned = (db.cbtExamQuestions || [])
    .filter((item) => String(item.examId) === String(exam.id))
    .sort((a, b) => Number(a.order || 9999) - Number(b.order || 9999))
    .map((item) => mapById.get(String(item.questionId)))
    .filter(Boolean);

  return res.json(assigned.map(questionToResponse));
});

router.get("/students", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = ensureCbtCollections(readDB());
  const classFilter = String(req.query.classId || req.query.className || "").trim();
  let students = Array.isArray(db.students) ? db.students : [];

  if (classFilter) {
    students = students.filter((item) => (
      String(item.classId || "") === classFilter || normalizeKey(item.className || item.class) === normalizeKey(classFilter)
    ));
  }

  const payload = students
    .map((student) => ({
      id: student.id,
      studentId: student.studentId || student.admissionNo || "",
      name: student.name,
      classId: student.classId || "",
      className: student.className || student.class || "",
      parentPhone: student.parentPhone || "",
      studentPhone: student.studentPhone || "",
    }))
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

  return res.json(payload);
});

router.get("/attempts", auth(), requireRole("ADMIN", "TEACHER", "ACADEMIC_OFFICER", "SUPER_ADMIN"), (req, res) => {
  const db = ensureCbtCollections(readDB());
  const attempts = Array.isArray(db.cbtAttempts) ? db.cbtAttempts : [];

  if (req.user.role === "ADMIN" || isOfficerRole(req.user.originalRole || req.user.role)) {
    return res.json(
      attempts
        .slice()
        .sort((a, b) => String(b.submittedAt || b.submitTime || b.startedAt || "").localeCompare(String(a.submittedAt || a.submitTime || a.startedAt || "")))
        .map(attemptToResponse)
    );
  }

  const allowed = new Set(getTeacherAllowedSubjects(req.user));
  const filtered = attempts.filter((attempt) => {
    const subjects = Object.keys(attempt.subjectBreakdown || {});
    return subjects.some((subject) => allowed.has(normalizeSubject(subject)));
  });

  return res.json(
    filtered
      .slice()
      .sort((a, b) => String(b.submittedAt || b.submitTime || b.startedAt || "").localeCompare(String(a.submittedAt || a.submitTime || a.startedAt || "")))
      .map(attemptToResponse)
  );
});

router.get("/results", auth(), requireRole("ADMIN", "TEACHER", "ACADEMIC_OFFICER", "SUPER_ADMIN"), (req, res) => {
  const db = ensureCbtCollections(readDB());
  const attempts = (db.cbtAttempts || []).filter((item) => String(item.status || "").toUpperCase() === "SUBMITTED");
  const classFilter = String(req.query.className || req.query.classId || "").trim();
  const subjectFilter = normalizeSubject(req.query.subject || "");
  const examIdFilter = String(req.query.examId || "").trim();

  let rows = attempts;
  if (examIdFilter) rows = rows.filter((item) => String(item.examId || "") === examIdFilter);
  if (classFilter) rows = rows.filter((item) => normalizeKey(item.className) === normalizeKey(classFilter));
  if (subjectFilter) {
    rows = rows.filter((item) => Object.keys(item.subjectBreakdown || {}).some((subject) => normalizeSubject(subject) === subjectFilter));
  }

  if (req.user.role === "TEACHER") {
    const allowed = new Set(getTeacherAllowedSubjects(req.user));
    rows = rows.filter((item) => Object.keys(item.subjectBreakdown || {}).some((subject) => allowed.has(normalizeSubject(subject))));
  }

  const exams = new Map((db.cbtExams || []).map((item) => [String(item.id), item]));
  return res.json(
    rows
      .slice()
      .sort((a, b) => String(b.submittedAt || b.submitTime || "").localeCompare(String(a.submittedAt || a.submitTime || "")))
      .map((item) => buildResultSummary(item, exams.get(String(item.examId))))
  );
});

router.get("/reports/analytics", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = ensureCbtCollections(readDB());
  const attempts = (db.cbtAttempts || []).filter((item) => String(item.status || "").toUpperCase() === "SUBMITTED");
  const allowed = new Set(getTeacherAllowedSubjects(req.user));
  const visible = req.user.role === "ADMIN"
    ? attempts
    : attempts.filter((item) => Object.keys(item.subjectBreakdown || {}).some((subject) => allowed.has(normalizeSubject(subject))));

  const byClass = new Map();
  const bySubject = new Map();
  const top = [];
  const questionStats = new Map();
  const topicStats = new Map();

  for (const attempt of visible) {
    const className = String(attempt.className || "General");
    if (!byClass.has(className)) byClass.set(className, { className, total: 0, count: 0 });
    byClass.get(className).total += Number(attempt.percentage || 0);
    byClass.get(className).count += 1;

    top.push({
      attemptId: attempt.id,
      candidateName: attempt.candidateName,
      candidateId: attempt.candidateId,
      className,
      examTitle: attempt.examTitle,
      percentage: Number(attempt.percentage || 0),
      submittedAt: attempt.submittedAt || attempt.submitTime || "",
    });

    for (const [subjectName, info] of Object.entries(attempt.subjectBreakdown || {})) {
      const canonical = normalizeSubject(subjectName) || subjectName;
      if (req.user.role === "TEACHER" && !allowed.has(normalizeSubject(canonical))) continue;
      if (!bySubject.has(canonical)) bySubject.set(canonical, { subjectName: canonical, total: 0, count: 0 });
      bySubject.get(canonical).total += Number(info.percentage || 0);
      bySubject.get(canonical).count += 1;
    }

    const answerMap = buildResponseMap(attempt);
    for (const question of attempt.questionSnapshot || []) {
      const subjectName = normalizeSubject(question.subjectName || question.subject || "") || "General";
      if (req.user.role === "TEACHER" && !allowed.has(subjectName)) continue;
      const key = String(question.id || `${question.subjectName}-${question.topicName}-${question.questionText}`);
      if (!questionStats.has(key)) {
        questionStats.set(key, {
          questionId: String(question.id || ""),
          subjectName,
          topicName: question.topicName || "",
          questionText: question.questionText || question.question || "",
          total: 0,
          wrong: 0,
        });
      }
      const row = questionStats.get(key);
      row.total += 1;
      const selected = answerMap.get(String(question.id));
      if (selected !== Number(question.correctAnswerIndex)) row.wrong += 1;

      const topicKey = `${subjectName}__${normalizeKey(question.topicName || "General")}`;
      if (!topicStats.has(topicKey)) {
        topicStats.set(topicKey, { subjectName, topicName: question.topicName || "General", total: 0, wrong: 0 });
      }
      const topicRow = topicStats.get(topicKey);
      topicRow.total += 1;
      if (selected !== Number(question.correctAnswerIndex)) topicRow.wrong += 1;
    }
  }

  const averageByClass = Array.from(byClass.values())
    .map((item) => ({
      className: item.className,
      average: item.count ? Number((item.total / item.count).toFixed(2)) : 0,
      attempts: item.count,
    }))
    .sort((a, b) => b.average - a.average);

  const averageBySubject = Array.from(bySubject.values())
    .map((item) => ({
      subjectName: item.subjectName,
      average: item.count ? Number((item.total / item.count).toFixed(2)) : 0,
      attempts: item.count,
    }))
    .sort((a, b) => b.average - a.average);

  const failedQuestions = Array.from(questionStats.values())
    .map((item) => ({
      ...item,
      failRate: item.total ? Number(((item.wrong / item.total) * 100).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.failRate - a.failRate)
    .slice(0, 30);

  const topicWeakness = Array.from(topicStats.values())
    .map((item) => ({
      ...item,
      failRate: item.total ? Number(((item.wrong / item.total) * 100).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.failRate - a.failRate)
    .slice(0, 20);

  const topPerformers = top
    .slice()
    .sort((a, b) => b.percentage - a.percentage || String(b.submittedAt).localeCompare(String(a.submittedAt)))
    .slice(0, 20);

  return res.json({
    topPerformers,
    averageByClass,
    averageBySubject,
    failedQuestions,
    topicWeakness,
    attemptCount: visible.length,
  });
});

router.get("/settings", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = ensureCbtCollections(readDB());
  res.json(db.cbtSettings || {});
});

router.patch("/settings", auth(), requireRole("ADMIN"), (req, res) => {
  const db = ensureCbtCollections(readDB());
  const nextRules = { ...(db.cbtSettings?.cbtRules || {}) };
  for (const key of CBT_RULE_KEYS) {
    if (req.body?.cbtRules?.[key] !== undefined) nextRules[key] = parseBoolean(req.body.cbtRules[key], nextRules[key]);
    if (req.body?.[key] !== undefined) nextRules[key] = parseBoolean(req.body[key], nextRules[key]);
  }

  db.cbtSettings = {
    ...db.cbtSettings,
    schoolName: req.body?.schoolName !== undefined ? String(req.body.schoolName || "").trim() : db.cbtSettings.schoolName,
    brandingLogoUrl: req.body?.brandingLogoUrl !== undefined ? String(req.body.brandingLogoUrl || "").trim() : db.cbtSettings.brandingLogoUrl,
    cbtRules: nextRules,
    updatedAt: nowIso(),  };
  writeDB(db);
  return res.json(db.cbtSettings);
});
router.get("/student/exams", auth(false), (req, res) => {
  const db = ensureCbtCollections(readDB());
  if (req.user?.role !== "STUDENT") return res.json([]);

  const studentClass = getCandidateClassFromStudent(db, req.user.studentId);
  const exams = getVisibleStudentExams(db, studentClass);

  return res.json(
    exams
      .slice()
      .sort((a, b) => String(a.startTime || a.createdAt || "").localeCompare(String(b.startTime || b.createdAt || "")))
      .map((exam) => studentExamToResponse(exam))
  );
});

router.get("/student/dashboard", auth(), requireRole("STUDENT"), (req, res) => {
  const db = ensureCbtCollections(readDB());
  const studentId = String(req.user.studentId || "").trim();
  if (!studentId) return res.status(400).json({ message: "Student account is not linked." });

  const className = getCandidateClassFromStudent(db, studentId);
  const availableExams = getVisibleStudentExams(db, className).map((exam) => studentExamToResponse(exam));

  const attempts = (db.cbtAttempts || [])
    .filter((item) => String(item.studentId || "") === studentId || normalizeKey(item.candidateId || "") === normalizeKey(studentId))
    .sort((a, b) => String(b.submittedAt || b.submitTime || b.startedAt || "").localeCompare(String(a.submittedAt || a.submitTime || a.startedAt || "")));

  return res.json({
    profile: {
      studentId,
      name: getCandidateNameFromStudent(db, studentId, req.user.name),
      className,
    },
    availableExams,
    examHistory: attempts.map(attemptToResponse),
    results: attempts
      .filter((item) => String(item.status || "").toUpperCase() === "SUBMITTED")
      .map((item) => buildResultSummary(item, (db.cbtExams || []).find((row) => String(row.id) === String(item.examId)))),
  });
});

router.get("/student/history", auth(), requireRole("STUDENT"), (req, res) => {
  const db = ensureCbtCollections(readDB());
  const studentId = String(req.user.studentId || "").trim();
  const attempts = (db.cbtAttempts || [])
    .filter((item) => String(item.studentId || "") === studentId || normalizeKey(item.candidateId || "") === normalizeKey(studentId))
    .sort((a, b) => String(b.submittedAt || b.submitTime || b.startedAt || "").localeCompare(String(a.submittedAt || a.submitTime || a.startedAt || "")));
  return res.json(attempts.map(attemptToResponse));
});

router.post("/candidate-login", auth(false), CBT_LOGIN_LIMITER, async (req, res) => {
  const loginId = String(req.body?.loginId || req.body?.candidateLoginId || "").trim();
  const password = String(req.body?.password || req.body?.accessPassword || "").trim();
  if (!loginId || !password) {
    return res.status(400).json({ message: "loginId and password are required" });
  }

  const db = ensureCbtCollections(readDB());
  const authResult = await authenticateCandidateLogin(db, loginId, password, getCandidateCredentialMeta(req));
  writeDB(db);

  if (!authResult.ok) {
    return res.status(authResult.status || 403).json({
      message: authResult.message || "Candidate login failed.",
      captchaRequired: Boolean(authResult.captchaRequired),
    });
  }

  const candidateContext = buildCredentialCandidateContext(
    db,
    authResult.exam,
    authResult.credential.candidateType,
    authResult.credential.candidateId
  );

  return res.json({
    sessionToken: authResult.sessionToken,
    exam: {
      id: authResult.exam.id,
      examTitle: authResult.exam.examTitle,
      examCode: authResult.exam.examCode || authResult.exam.accessCode || "",
      examType: authResult.exam.examType,
      workflowExamType: authResult.exam.workflowExamType || (deriveExamCandidateType(authResult.exam) === "APPLICANT" ? "INTERVIEW_EXAM" : "SCHOOL_EXAM"),
      status: authResult.exam.status,
      durationMinutes: Number(authResult.exam.durationMinutes || 40),
      startTime: authResult.exam.startTime || "",
      endTime: authResult.exam.endTime || "",
      instructions: authResult.exam.instructions || "",
      attemptLimit: Math.max(1, Number(authResult.exam.attemptLimit || 1)),
    },
    candidate: {
      name: candidateContext.candidateName,
      candidateType: candidateContext.candidateType,
      candidateId: authResult.credential.candidateId,
      loginId: authResult.credential.loginId,
      details: candidateContext.details,
    },
  });
});

router.post("/exams/:id/start", auth(false), (req, res) => {
  try {
    const db = ensureCbtCollections(readDB());
    const exam = getExamOrFail(db, req.params.id);
    const sessionRecord = consumeCandidateSession(db, exam.id, req.body?.sessionToken);
    const payload = startAttemptForCredential(db, exam, sessionRecord, getCandidateCredentialMeta(req));
    writeDB(db);
    return res.json(payload);
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message || "Failed to start exam" });
  }
});

router.post("/exams/:id/submit", auth(false), (req, res) => {
  if (req.user && ["TEACHER", "ADMIN"].includes(String(req.user.role || "").toUpperCase()) && !req.body?.attemptId) {
    const db = ensureCbtCollections(readDB());
    const exam = (db.cbtExams || []).find((item) => String(item.id) === String(req.params.id));
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    if (!canUserViewExam(req.user, exam)) return res.status(403).json({ message: "Not allowed to submit this exam for generation" });
    if (req.user.role === "TEACHER" && String(exam.createdByTeacherId || exam.createdBy || "") !== String(req.user.id || "")) {
      return res.status(403).json({ message: "Teachers can only submit exams they created." });
    }
    if (!["DRAFT", "READY_FOR_GENERATION"].includes(String(exam.status || "").toUpperCase())) {
      return res.status(409).json({ message: "Only draft exams can be submitted for credential generation." });
    }

    const syncResult = syncExamCandidates(db, exam, req.user, {
      candidateType: normalizeCandidateType(req.body?.candidateType, deriveExamCandidateType(exam)),
      candidateIds: Array.isArray(req.body?.candidateIds) ? req.body.candidateIds : [],
      ...getCandidateCredentialMeta(req),
    });
    if (Number(syncResult.total || 0) === 0) {
      return res.status(400).json({ message: buildNoSyncCandidatesMessage(db, exam, syncResult.candidateType) });
    }
    const activeCandidates = syncResult.candidates.filter((item) => String(item.accessStatus || "").toUpperCase() !== "REVOKED");
    if (!activeCandidates.length) {
      return res.status(400).json({ message: "Assign at least one candidate before submitting this exam." });
    }

    const { questionSnapshot, missingSubjects } = buildAttemptQuestionSet(db, exam);
    if (!questionSnapshot.length) {
      return res.status(400).json({ message: "Add or assign approved CBT questions before submitting this exam." });
    }
    if (missingSubjects.length > 0) {
      return res.status(400).json({ message: `Missing approved question bank entries for: ${missingSubjects.join(", ")}` });
    }

    const submittedAt = nowIso();
    exam.status = "READY_FOR_GENERATION";
    exam.submittedAt = submittedAt;
    exam.updatedAt = submittedAt;

    createAuditLog(db, {
      examId: exam.id,
      action: "exam_submitted",
      performedByUserId: req.user?.id,
      ...getCandidateCredentialMeta(req),
      metaJson: {
        candidates: activeCandidates.length,
        questions: questionSnapshot.length,
      },
    });

    writeDB(db);
    return res.json({
      exam: examToResponse(exam, db),
      summary: summarizeExam(db, exam),
      candidateSync: syncResult,
      message: "Exam submitted and marked ready_for_generation.",
    });
  }

  const attemptId = String(req.body?.attemptId || "").trim();
  const attemptToken = String(req.body?.attemptToken || "").trim();
  const payloadResponses = Array.isArray(req.body?.responses) ? req.body.responses : [];

  if (!attemptId || !attemptToken) {
    return res.status(400).json({ message: "attemptId and attemptToken are required" });
  }

  try {
    const db = ensureCbtCollections(readDB());
    const idx = (db.cbtAttempts || []).findIndex((item) => String(item.id) === attemptId && String(item.examId || "") === String(req.params.id));
    if (idx < 0) return res.status(404).json({ message: "Attempt not found" });

    const attempt = db.cbtAttempts[idx];
    if (String(attempt.attemptToken || "") !== attemptToken) {
      return res.status(401).json({ message: "Invalid attempt token" });
    }

    const summary = submitAttemptByIndex(db, idx, payloadResponses, getCandidateCredentialMeta(req));
    writeDB(db);
    return res.json(summary);
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message || "Failed to submit attempt" });
  }
});

const RECRUITMENT_MANAGER_ROLES = ["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER", "HR_OFFICER"];

function normalizeRecruitmentApplicationStatus(value, fallback = "new") {
  const clean = String(value || "").trim().toLowerCase();
  if (["new", "submitted", "under_review", "shortlisted", "interviewed", "offered", "hired", "rejected", "archived"].includes(clean)) {
    return clean;
  }
  if (clean === "shortlist") return "shortlisted";
  if (clean === "review") return "under_review";
  return fallback;
}

function findCareerVacancy(db, application = {}) {
  return (Array.isArray(db.careerVacancies) ? db.careerVacancies : []).find((row) => (
    String(row.id || "") === String(application.vacancyId || application.vacancy_id || "")
  )) || {};
}

function buildRecruitmentApplicantItem(db, source = {}) {
  const application = source.careerApplicationId
    ? ((Array.isArray(db.careerApplications) ? db.careerApplications : []).find((row) => String(row.id || "") === String(source.careerApplicationId || "")) || source)
    : source;
  const vacancy = findCareerVacancy(db, application);
  const candidateId = String(
    source.candidateId
    || application.applicationNumber
    || application.id
    || source.id
    || ""
  ).trim();
  const applicationStatus = normalizeRecruitmentApplicationStatus(
    application.applicationStatus || application.status || source.applicationStatus || source.status,
    "new"
  );
  const teachingCategory = normalizeRecruitmentCategory(
    source.teachingCategory
    || application.teachingCategory
    || application.teachingLevel
    || vacancy.teachingCategory
    || vacancy.category
    || vacancy.department
    || "BASIC"
  );

  return {
    id: String(source.id || application.id || candidateId || `recruitment-profile-${nanoid(8)}`).trim(),
    candidateId,
    careerApplicationId: String(application.id || source.careerApplicationId || "").trim(),
    applicationId: String(application.id || source.applicationId || source.careerApplicationId || "").trim(),
    applicationNumber: String(application.applicationNumber || source.applicationNumber || candidateId).trim(),
    vacancyId: String(application.vacancyId || source.vacancyId || "").trim(),
    applicantUserId: String(application.applicantUserId || source.applicantUserId || "").trim(),
    applicantUsername: String(application.applicantUsername || source.applicantUsername || "").trim(),
    fullName: String(application.fullName || source.fullName || source.fullNameSnapshot || "Recruitment Applicant").trim(),
    email: String(application.email || source.email || "").trim(),
    phone: String(application.phone || source.phone || "").trim(),
    appliedRole: String(application.appliedRole || vacancy.jobTitle || vacancy.title || source.appliedRole || source.vacancyTitle || "Teaching applicant").trim(),
    teachingCategory,
    teachingCategoryLabel: getRecruitmentCategoryLabel(teachingCategory),
    subjectSpecialization: String(application.subjectSpecialization || application.subjectsCanTeach || source.subjectSpecialization || "").trim(),
    qualification: String(application.qualification || application.highestQualification || source.qualification || "").trim(),
    experience: String(application.experience || application.yearsOfExperience || source.experience || "").trim(),
    trcnStatus: String(application.trcnStatus || source.trcnStatus || "").trim(),
    currentEmployer: String(application.currentEmployer || source.currentEmployer || "").trim(),
    applicationStatus,
    status: applicationStatus,
    submittedAt: String(application.submittedAt || source.submittedAt || source.createdAt || "").trim(),
    updatedAt: String(application.updatedAt || source.updatedAt || "").trim(),
  };
}

function listRecruitmentApplicantItems(db) {
  const rows = [];
  const seen = new Set();
  const push = (item) => {
    const built = buildRecruitmentApplicantItem(db, item);
    const key = normalizeKey(built.careerApplicationId || built.candidateId || built.email || built.id);
    if (!key || seen.has(key)) return;
    seen.add(key);
    rows.push(built);
  };

  for (const row of Array.isArray(db.cbtRecruitmentApplicants) ? db.cbtRecruitmentApplicants : []) push(row);
  for (const row of Array.isArray(db.careerApplications) ? db.careerApplications : []) push(row);

  return rows.sort((a, b) => String(b.submittedAt || b.updatedAt).localeCompare(String(a.submittedAt || a.updatedAt)));
}

function findRecruitmentProfileForAttempt(db, attempt = {}) {
  const keys = [
    attempt.candidateId,
    attempt.studentId,
    attempt.candidateLoginId,
    attempt.candidateDetails?.referenceValue,
    attempt.candidateDetails?.secondaryValue,
  ].map(normalizeKey).filter(Boolean);

  const assignment = (Array.isArray(db.cbtExamCandidates) ? db.cbtExamCandidates : []).find((row) => (
    String(row.examId || "") === String(attempt.examId || "")
    && normalizeCandidateType(row.candidateType, "STUDENT") === "APPLICANT"
    && keys.includes(normalizeKey(row.candidateId))
  ));
  if (assignment) keys.push(normalizeKey(assignment.candidateId));

  return listRecruitmentApplicantItems(db).find((profile) => [
    profile.id,
    profile.candidateId,
    profile.careerApplicationId,
    profile.applicationId,
    profile.applicationNumber,
    profile.applicantUserId,
    profile.applicantUsername,
    profile.email,
  ].some((value) => keys.includes(normalizeKey(value)))) || null;
}

function getRecruitmentExamForAttempt(db, attempt = {}) {
  return (Array.isArray(db.cbtExams) ? db.cbtExams : []).find((item) => String(item.id || "") === String(attempt.examId || "")) || null;
}

function isRecruitmentAttempt(db, attempt = {}) {
  const exam = getRecruitmentExamForAttempt(db, attempt);
  return isRecruitmentAssessment(exam)
    || normalizeCandidateType(attempt.candidateType || deriveExamCandidateType(exam || {}), "STUDENT") === "APPLICANT"
    || String(attempt.targetAudience || "").trim().toUpperCase() === "INTERVIEW"
    || String(attempt.examType || "").trim().toUpperCase() === "INTERVIEW";
}

function buildAttemptResponseRowMap(attempt = {}) {
  const map = new Map();
  for (const row of Array.isArray(attempt.responses) ? attempt.responses : []) {
    const questionId = String(row?.questionId || "").trim();
    if (!questionId) continue;
    const answerIndex = Number(row?.answerIndex);
    const manualScore = Number(row?.manualScore);
    const autoScore = Number(row?.autoScore);
    const finalScore = Number(row?.finalScore);
    map.set(questionId, {
      ...row,
      questionId,
      answerIndex: Number.isInteger(answerIndex) ? answerIndex : null,
      answerText: String(row?.answerText || "").trim(),
      manualScore: Number.isFinite(manualScore) ? manualScore : null,
      autoScore: Number.isFinite(autoScore) ? autoScore : null,
      finalScore: Number.isFinite(finalScore) ? finalScore : null,
      reviewComment: String(row?.reviewComment || "").trim(),
      reviewStatus: String(row?.reviewStatus || "").trim(),
    });
  }
  return map;
}

function getRecruitmentQuestionSourceRows(db, attempt = {}, exam = {}) {
  const snapshot = Array.isArray(attempt.questionSnapshot) ? attempt.questionSnapshot : [];
  if (snapshot.length) return snapshot;

  const bankById = new Map((Array.isArray(db.cbtQuestionBank) ? db.cbtQuestionBank : []).map((row) => [String(row.id), row]));
  return (Array.isArray(db.cbtExamQuestions) ? db.cbtExamQuestions : [])
    .filter((row) => String(row.examId || "") === String(exam?.id || attempt.examId || ""))
    .sort((a, b) => Number(a.order || 9999) - Number(b.order || 9999))
    .map((row) => bankById.get(String(row.questionId || "")))
    .filter(Boolean);
}

function buildRecruitmentResponseRows(db, attempt = {}, exam = {}) {
  const bankById = new Map((Array.isArray(db.cbtQuestionBank) ? db.cbtQuestionBank : []).map((row) => [String(row.id), row]));
  const responseMap = buildAttemptResponseRowMap(attempt);

  return getRecruitmentQuestionSourceRows(db, attempt, exam).map((question, index) => {
    const bankQuestion = bankById.get(String(question.id || "")) || {};
    const source = { ...bankQuestion, ...question };
    const questionId = String(source.id || question.id || "").trim();
    const questionType = normalizeQuestionType(source.questionType || source.type || "mcq_single");
    const maxScore = questionType === "mcq_single"
      ? 1
      : clampNumber(source.maxScore || source.points || 10, 1, 100, 10);
    const response = responseMap.get(questionId) || {};
    const answerIndex = Number(response.answerIndex);
    const objective = questionType === "mcq_single";
    const autoScore = Number.isFinite(Number(response.autoScore))
      ? clampNumber(response.autoScore, 0, maxScore, 0)
      : (objective && Number.isInteger(answerIndex) && answerIndex === Number(source.correctAnswerIndex) ? maxScore : 0);
    const manualScore = Number.isFinite(Number(response.manualScore))
      ? clampNumber(response.manualScore, 0, maxScore, 0)
      : null;
    const finalScore = Number.isFinite(Number(response.finalScore))
      ? clampNumber(response.finalScore, 0, maxScore, autoScore)
      : (manualScore !== null ? manualScore : autoScore);
    const reviewStatus = String(response.reviewStatus || "").trim().toUpperCase()
      || (objective ? "AUTO_GRADED" : "PENDING_REVIEW");

    return {
      questionId,
      questionType,
      subjectName: source.subjectName || source.subject || "General Interview",
      order: Number(source.order || index + 1),
      questionText: source.questionText || source.question || "",
      scenarioContext: source.scenarioContext || "",
      options: Array.isArray(source.options) ? source.options : [],
      sampleAnswer: source.sampleAnswer || "",
      evaluationRubric: source.evaluationRubric || "",
      maxScore,
      response: {
        answerIndex: Number.isInteger(answerIndex) ? answerIndex : null,
        answerText: String(response.answerText || "").trim(),
        autoScore,
        manualScore,
        finalScore,
        reviewComment: String(response.reviewComment || "").trim(),
        reviewStatus,
      },
    };
  });
}

function buildRecruitmentSubmissionDetail(db, attempt = {}) {
  const exam = getRecruitmentExamForAttempt(db, attempt) || {};
  const profile = findRecruitmentProfileForAttempt(db, attempt) || buildRecruitmentApplicantItem(db, {
    id: attempt.candidateId || attempt.id,
    candidateId: attempt.candidateId,
    fullName: attempt.candidateName,
    applicationStatus: attempt.applicationStatus || "under_review",
    teachingCategory: exam.recruitmentCategory || "BASIC",
    appliedRole: attempt.candidateDetails?.secondaryValue || "Teaching applicant",
  });
  const responses = buildRecruitmentResponseRows(db, attempt, exam);
  const finalScore = responses.reduce((sum, row) => sum + Number(row.response?.finalScore || 0), 0);
  const totalPoints = responses.reduce((sum, row) => sum + Number(row.maxScore || 0), 0);
  const hasPendingSubjective = responses.some((row) => (
    ["short_answer", "essay", "scenario"].includes(String(row.questionType || "").toLowerCase())
    && String(row.response?.reviewStatus || "").toUpperCase() !== "FINALIZED"
  ));
  const reviewStatus = String(attempt.recruitmentReviewStatus || attempt.reviewStatus || "").trim().toUpperCase()
    || (hasPendingSubjective ? "PENDING_REVIEW" : "AUTO_GRADED");

  return {
    profile,
    exam: {
      id: exam.id || attempt.examId || "",
      examTitle: exam.examTitle || attempt.examTitle || "Recruitment Assessment",
      recruitmentCategory: exam.recruitmentCategory || profile.teachingCategory || "BASIC",
      recruitmentCategoryLabel: getRecruitmentCategoryLabel(exam.recruitmentCategory || profile.teachingCategory || "BASIC"),
      subjects: getExamSubjects(exam || {}),
    },
    summary: {
      attemptId: attempt.id,
      finalScore,
      totalPoints,
      percentage: totalPoints > 0 ? Number(((finalScore / totalPoints) * 100).toFixed(2)) : 0,
      reviewStatus,
      reviewerComment: String(attempt.reviewerComment || attempt.recruitmentReviewerComment || "").trim(),
      decision: String(attempt.applicationDecision || attempt.decision || "").trim(),
      decisionNote: String(attempt.decisionNote || "").trim(),
      submittedAt: attempt.submittedAt || attempt.submitTime || "",
    },
    responses,
  };
}

function buildRecruitmentSubmissionRow(db, attempt = {}) {
  const detail = buildRecruitmentSubmissionDetail(db, attempt);
  return {
    attemptId: attempt.id,
    candidateName: detail.profile.fullName || attempt.candidateName || "Recruitment Applicant",
    examId: detail.exam.id,
    examTitle: detail.exam.examTitle,
    recruitmentCategory: detail.exam.recruitmentCategory,
    recruitmentCategoryLabel: detail.exam.recruitmentCategoryLabel,
    reviewStatus: detail.summary.reviewStatus,
    applicationStatus: detail.profile.applicationStatus || attempt.applicationStatus || "under_review",
    finalScore: detail.summary.finalScore,
    totalPoints: detail.summary.totalPoints,
    submittedAt: detail.summary.submittedAt,
  };
}

function applyRecruitmentReview(db, attemptId, payload = {}, reviewer = {}, finalize = false) {
  const idx = (Array.isArray(db.cbtAttempts) ? db.cbtAttempts : []).findIndex((row) => String(row.id || "") === String(attemptId || ""));
  if (idx < 0) {
    const error = new Error("Recruitment submission not found.");
    error.status = 404;
    throw error;
  }

  const attempt = db.cbtAttempts[idx];
  if (!isRecruitmentAttempt(db, attempt)) {
    const error = new Error("This attempt is not a recruitment assessment submission.");
    error.status = 400;
    throw error;
  }

  const responseMap = buildAttemptResponseRowMap(attempt);
  const questionRows = buildRecruitmentResponseRows(db, attempt, getRecruitmentExamForAttempt(db, attempt) || {});
  const maxByQuestionId = new Map(questionRows.map((row) => [String(row.questionId), Number(row.maxScore || 0)]));

  for (const row of Array.isArray(payload.responses) ? payload.responses : []) {
    const questionId = String(row?.questionId || "").trim();
    if (!questionId) continue;
    const maxScore = maxByQuestionId.get(questionId) || 100;
    const manualScore = clampNumber(row?.manualScore, 0, maxScore, 0);
    const current = responseMap.get(questionId) || { questionId };
    responseMap.set(questionId, {
      ...current,
      questionId,
      manualScore,
      finalScore: manualScore,
      reviewComment: String(row?.reviewComment || "").trim(),
      reviewStatus: finalize ? "FINALIZED" : String(row?.reviewStatus || "IN_REVIEW").trim().toUpperCase(),
    });
  }

  const updatedAt = nowIso();
  const nextAttempt = {
    ...attempt,
    responses: Array.from(responseMap.values()),
    reviewerComment: String(payload.reviewerComment || "").trim(),
    recruitmentReviewerComment: String(payload.reviewerComment || "").trim(),
    recruitmentReviewStatus: finalize ? "FINALIZED" : "IN_REVIEW",
    reviewStatus: finalize ? "FINALIZED" : "IN_REVIEW",
    reviewedByUserId: String(reviewer?.id || "").trim(),
    reviewedByName: String(reviewer?.name || reviewer?.username || "").trim(),
    reviewedAt: updatedAt,
    updatedAt,
  };

  const detail = buildRecruitmentSubmissionDetail(db, nextAttempt);
  nextAttempt.score = detail.summary.finalScore;
  nextAttempt.total = detail.summary.totalPoints || nextAttempt.total;
  nextAttempt.percentage = detail.summary.percentage;
  db.cbtAttempts[idx] = nextAttempt;
  return buildRecruitmentSubmissionDetail(db, db.cbtAttempts[idx]);
}

function updateRecruitmentDecision(db, attemptId, payload = {}, reviewer = {}) {
  const idx = (Array.isArray(db.cbtAttempts) ? db.cbtAttempts : []).findIndex((row) => String(row.id || "") === String(attemptId || ""));
  if (idx < 0) {
    const error = new Error("Recruitment submission not found.");
    error.status = 404;
    throw error;
  }
  const decision = normalizeRecruitmentApplicationStatus(payload.decision, "under_review");
  if (!["under_review", "shortlisted", "rejected", "interviewed", "offered", "hired"].includes(decision)) {
    const error = new Error("Decision must be under_review, shortlisted, rejected, interviewed, offered, or hired.");
    error.status = 400;
    throw error;
  }

  const attempt = db.cbtAttempts[idx];
  const profile = findRecruitmentProfileForAttempt(db, attempt);
  const note = String(payload.note || payload.decisionNote || "").trim();
  const updatedAt = nowIso();

  if (profile?.careerApplicationId && Array.isArray(db.careerApplications)) {
    const appIdx = db.careerApplications.findIndex((row) => String(row.id || "") === String(profile.careerApplicationId || ""));
    if (appIdx >= 0) {
      const previousStatus = String(db.careerApplications[appIdx].status || "new").trim().toLowerCase();
      db.careerApplications[appIdx] = {
        ...db.careerApplications[appIdx],
        status: decision,
        applicationStatus: decision,
        updatedAt,
      };
      if (!Array.isArray(db.careerStatusLogs)) db.careerStatusLogs = [];
      db.careerStatusLogs.unshift({
        id: `career-status-${nanoid(8)}`,
        applicationId: profile.careerApplicationId,
        oldStatus: previousStatus,
        newStatus: decision,
        changedBy: String(reviewer?.id || "").trim(),
        note,
        createdAt: updatedAt,
      });
    }
  }

  db.cbtAttempts[idx] = {
    ...attempt,
    applicationStatus: decision,
    applicationDecision: decision,
    decision,
    decisionNote: note,
    decisionByUserId: String(reviewer?.id || "").trim(),
    decisionByName: String(reviewer?.name || reviewer?.username || "").trim(),
    decisionAt: updatedAt,
    updatedAt,
  };

  return buildRecruitmentSubmissionDetail(db, db.cbtAttempts[idx]);
}

function seedRecruitmentDemoData(db, user = {}) {
  const now = nowIso();
  if (!Array.isArray(db.careerVacancies)) db.careerVacancies = [];
  if (!Array.isArray(db.careerApplications)) db.careerApplications = [];

  let vacancy = db.careerVacancies.find((row) => String(row.id || "") === "vacancy-demo-recruitment-cbt");
  if (!vacancy) {
    vacancy = {
      id: "vacancy-demo-recruitment-cbt",
      vacancyCode: "VAC-DEMO-CBT",
      jobTitle: "Basic Class Teacher",
      department: "Academics",
      category: "academic_staff",
      teachingCategory: "BASIC",
      status: "published",
      createdAt: now,
      updatedAt: now,
    };
    db.careerVacancies.unshift(vacancy);
  }

  let application = db.careerApplications.find((row) => String(row.id || "") === "application-demo-recruitment-cbt");
  if (!application) {
    application = {
      id: "application-demo-recruitment-cbt",
      vacancyId: vacancy.id,
      applicationNumber: "APP-DEMO-CBT",
      fullName: "Demo Recruitment Applicant",
      phone: "08000000000",
      email: "demo.recruitment@angelmontessori.ng",
      highestQualification: "B.Ed Education",
      yearsOfExperience: "3 years",
      teachingLevel: "basic",
      subjectsCanTeach: "English, Mathematics, Basic Science",
      trcnStatus: "yes",
      status: "under_review",
      submittedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    db.careerApplications.unshift(application);
  }

  const questions = [
    {
      id: "recruitment-demo-q-teaching-aptitude",
      subjectName: "Teaching Aptitude",
      questionType: "mcq_single",
      questionText: "Which classroom action best supports a pupil who is struggling with a new concept?",
      options: ["Move on quickly", "Offer guided practice and check understanding", "Give only homework", "Remove the pupil from class"],
      correctAnswerIndex: 1,
      maxScore: 1,
    },
    {
      id: "recruitment-demo-q-classroom-management",
      subjectName: "Classroom Management",
      questionType: "scenario",
      scenarioContext: "Two pupils keep interrupting while others are trying to complete a short activity.",
      questionText: "Explain how you would restore calm, protect learning time, and keep the pupils engaged.",
      sampleAnswer: "A strong answer uses calm redirection, clear expectations, proximity, positive reinforcement, and a follow-up conversation.",
      evaluationRubric: "Award marks for calm tone, clear routine, inclusion, safeguarding, and practical follow-through.",
      maxScore: 10,
    },
    {
      id: "recruitment-demo-q-communication",
      subjectName: "Communication Skills",
      questionType: "short_answer",
      questionText: "Write one concise message you would send to a parent about a child who has improved this week.",
      sampleAnswer: "Your child showed good focus this week and completed class tasks more independently. Please encourage the same effort at home.",
      evaluationRubric: "Award marks for clarity, warmth, professionalism, and specific evidence.",
      maxScore: 5,
    },
    {
      id: "recruitment-demo-q-edtech",
      subjectName: "Educational Technology",
      questionType: "essay",
      questionText: "Describe how you would use a smart classroom tool to improve participation in a Basic class lesson.",
      sampleAnswer: "A strong answer links the tool to lesson objectives, participation, feedback, inclusion, and classroom management.",
      evaluationRubric: "Award marks for planning, relevance, student participation, assessment feedback, and realistic implementation.",
      maxScore: 10,
    },
  ];

  db.cbtQuestionBank = Array.isArray(db.cbtQuestionBank) ? db.cbtQuestionBank : [];
  for (const question of questions) {
    if (db.cbtQuestionBank.some((row) => String(row.id || "") === question.id)) continue;
    db.cbtQuestionBank.unshift({
      ...question,
      assessmentMode: RECRUITMENT_ASSESSMENT_MODE,
      recruitmentCategory: "BASIC",
      status: "APPROVED",
      difficulty: "MEDIUM",
      classId: "",
      className: "",
      topicName: "Recruitment Assessment",
      createdBy: String(user?.id || "system"),
      createdByName: String(user?.name || "System"),
      createdAt: now,
      updatedAt: now,
    });
  }

  let exam = db.cbtExams.find((row) => String(row.id || "") === "cbt-exam-demo-recruitment-basic");
  if (!exam) {
    const start = new Date();
    start.setMinutes(start.getMinutes() - 5);
    const end = new Date();
    end.setDate(end.getDate() + 30);
    exam = {
      id: "cbt-exam-demo-recruitment-basic",
      examTitle: "Demo Basic Class Teacher Recruitment Assessment",
      examType: "INTERVIEW",
      targetAudience: "INTERVIEW",
      assessmentMode: RECRUITMENT_ASSESSMENT_MODE,
      recruitmentCategory: "BASIC",
      classId: "",
      className: "",
      subjectName: "",
      subjects: questions.map((row) => row.subjectName),
      durationMinutes: 30,
      totalQuestions: questions.length,
      questionsPerSubject: 1,
      passMark: 50,
      shuffleQuestions: false,
      shuffleOptions: false,
      oneAttemptOnly: true,
      attemptLimit: 1,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      status: "DRAFT",
      examCode: "AMSINTDEMO",
      accessCode: "AMSINTDEMO",
      instructions: "Answer the recruitment assessment questions professionally.",
      createdByTeacherId: String(user?.id || "system"),
      createdBy: String(user?.id || "system"),
      createdByName: String(user?.name || "System"),
      submittedAt: "",
      reviewedByOfficerId: "",
      publishedAt: "",
      createdAt: now,
      updatedAt: now,
      title: "Demo Basic Class Teacher Recruitment Assessment",
      mode: "INTERVIEW",
      classLevel: "",
    };
    db.cbtExams.unshift(exam);
  }

  return { exam, application, questions };
}

router.get("/recruitment/applicants", auth(), requireRole(...RECRUITMENT_MANAGER_ROLES), (req, res) => {
  const db = ensureCbtCollections(readDB());
  const status = normalizeRecruitmentApplicationStatus(req.query.status, "");
  const category = normalizeRecruitmentCategory(req.query.recruitmentCategory || req.query.teachingCategory || "", "");
  const search = normalizeKey(req.query.search || "");
  let applicants = listRecruitmentApplicantItems(db);
  if (status) applicants = applicants.filter((row) => row.applicationStatus === status);
  if (category) applicants = applicants.filter((row) => normalizeRecruitmentCategory(row.teachingCategory, "") === category);
  if (search) {
    applicants = applicants.filter((row) => normalizeKey([
      row.fullName,
      row.email,
      row.phone,
      row.applicationNumber,
      row.appliedRole,
      row.subjectSpecialization,
    ].join(" ")).includes(search));
  }
  return res.json({ applicants });
});

router.get("/recruitment/applicant/dashboard", auth(false), (req, res) => {
  const db = ensureCbtCollections(readDB());
  const userKeys = [
    req.user?.id,
    req.user?.username,
    req.user?.email,
  ].map(normalizeKey).filter(Boolean);
  const profile = listRecruitmentApplicantItems(db).find((row) => [
    row.applicantUserId,
    row.applicantUsername,
    row.email,
    row.candidateId,
    row.applicationNumber,
  ].some((value) => userKeys.includes(normalizeKey(value)))) || null;

  if (!profile) return res.json({ profile: null, assessments: [], submissions: [] });

  const assessments = (db.cbtExams || [])
    .filter((exam) => isRecruitmentAssessment(exam))
    .filter((exam) => normalizeRecruitmentCategory(exam.recruitmentCategory || "BASIC") === normalizeRecruitmentCategory(profile.teachingCategory || "BASIC"))
    .map((exam) => examToResponse(exam, db));
  const submissions = (db.cbtAttempts || [])
    .filter((attempt) => isRecruitmentAttempt(db, attempt))
    .filter((attempt) => findRecruitmentProfileForAttempt(db, attempt)?.id === profile.id)
    .map((attempt) => buildRecruitmentSubmissionRow(db, attempt));

  return res.json({ profile, assessments, submissions });
});

router.get("/recruitment/submissions", auth(), requireRole(...RECRUITMENT_MANAGER_ROLES), (req, res) => {
  const db = ensureCbtCollections(readDB());
  const examId = String(req.query.examId || "").trim();
  const reviewStatus = String(req.query.reviewStatus || "").trim().toUpperCase();
  const applicationStatus = normalizeRecruitmentApplicationStatus(req.query.applicationStatus, "");

  let submissions = (db.cbtAttempts || [])
    .filter((attempt) => isRecruitmentAttempt(db, attempt))
    .filter((attempt) => ["SUBMITTED", "COMPLETED", "FINALIZED", "REVIEWED"].includes(String(attempt.status || "").toUpperCase()) || attempt.submittedAt || attempt.submitTime)
    .map((attempt) => buildRecruitmentSubmissionRow(db, attempt));

  if (examId) submissions = submissions.filter((row) => String(row.examId || "") === examId);
  if (reviewStatus) submissions = submissions.filter((row) => String(row.reviewStatus || "").toUpperCase() === reviewStatus);
  if (applicationStatus) submissions = submissions.filter((row) => row.applicationStatus === applicationStatus);

  submissions = submissions.sort((a, b) => String(b.submittedAt || "").localeCompare(String(a.submittedAt || "")));
  return res.json({ submissions });
});

router.get("/recruitment/submissions/:attemptId", auth(), requireRole(...RECRUITMENT_MANAGER_ROLES), (req, res) => {
  const db = ensureCbtCollections(readDB());
  const attempt = (db.cbtAttempts || []).find((row) => String(row.id || "") === String(req.params.attemptId || ""));
  if (!attempt || !isRecruitmentAttempt(db, attempt)) {
    return res.status(404).json({ message: "Recruitment submission not found." });
  }
  return res.json(buildRecruitmentSubmissionDetail(db, attempt));
});

router.patch("/recruitment/submissions/:attemptId/review", auth(), requireRole(...RECRUITMENT_MANAGER_ROLES), (req, res) => {
  try {
    const db = ensureCbtCollections(readDB());
    const detail = applyRecruitmentReview(db, req.params.attemptId, req.body || {}, req.user, false);
    writeDB(db);
    return res.json(detail);
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message || "Failed to save recruitment review." });
  }
});

router.post("/recruitment/submissions/:attemptId/finalize", auth(), requireRole(...RECRUITMENT_MANAGER_ROLES), (req, res) => {
  try {
    const db = ensureCbtCollections(readDB());
    const detail = applyRecruitmentReview(db, req.params.attemptId, req.body || {}, req.user, true);
    writeDB(db);
    return res.json(detail);
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message || "Failed to finalize recruitment review." });
  }
});

router.post("/recruitment/submissions/:attemptId/decision", auth(), requireRole(...RECRUITMENT_MANAGER_ROLES), (req, res) => {
  try {
    const db = ensureCbtCollections(readDB());
    const detail = updateRecruitmentDecision(db, req.params.attemptId, req.body || {}, req.user);
    writeDB(db);
    return res.json(detail);
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message || "Failed to update recruitment decision." });
  }
});

router.post("/recruitment/seed-demo", auth(), requireRole(...RECRUITMENT_MANAGER_ROLES), (req, res) => {
  const db = ensureCbtCollections(readDB());
  const seeded = seedRecruitmentDemoData(db, req.user);
  writeDB(db);
  return res.status(201).json({
    message: "Demo recruitment assessment data is ready.",
    exam: examToResponse(seeded.exam, db),
    application: buildRecruitmentApplicantItem(db, seeded.application),
    questions: seeded.questions.length,
  });
});

router.post("/student/login", auth(false), async (req, res) => {
  const loginId = String(req.body?.loginId || req.body?.candidateLoginId || "").trim();
  const password = String(req.body?.password || req.body?.accessPassword || "").trim();
  if (!loginId || !password) {
    return res.status(400).json({ message: "Use the CBT login ID and password issued for this exam." });
  }

  const db = ensureCbtCollections(readDB());
  const authResult = await authenticateCandidateLogin(db, loginId, password, getCandidateCredentialMeta(req));
  if (!authResult.ok) {
    writeDB(db);
    return res.status(authResult.status || 403).json({
      message: authResult.message || "Candidate login failed.",
      captchaRequired: Boolean(authResult.captchaRequired),
    });
  }

  const sessionRecord = consumeCandidateSession(db, authResult.exam.id, authResult.sessionToken);
  const payload = startAttemptForCredential(db, authResult.exam, sessionRecord, getCandidateCredentialMeta(req));
  writeDB(db);
  return res.json(payload);
});

router.post("/student/answer", (req, res) => {
  const attemptId = String(req.body?.attemptId || "").trim();
  const attemptToken = String(req.body?.attemptToken || "").trim();
  const questionId = String(req.body?.questionId || "").trim();
  const answerIndex = Number(req.body?.answerIndex);
  const answerText = String(req.body?.answerText || "").trim();

  if (!attemptId || !attemptToken || !questionId || (!Number.isInteger(answerIndex) && !answerText)) {
    return res.status(400).json({ message: "attemptId, attemptToken, questionId and an answer are required" });
  }

  const db = ensureCbtCollections(readDB());
  const idx = (db.cbtAttempts || []).findIndex((item) => String(item.id) === attemptId);
  if (idx < 0) return res.status(404).json({ message: "Attempt not found" });
  const attempt = db.cbtAttempts[idx];
  if (String(attempt.attemptToken || "") !== attemptToken) return res.status(401).json({ message: "Invalid attempt token" });
  if (String(attempt.status || "").toUpperCase() !== "IN_PROGRESS") {
    return res.status(400).json({ message: "Attempt is no longer in progress" });
  }

  const responseMap = buildResponseMap(attempt);
  if (Number.isInteger(answerIndex)) responseMap.set(questionId, answerIndex);
  const payloadResponse = {
    questionId,
    ...(Number.isInteger(answerIndex) ? { answerIndex } : {}),
    ...(answerText ? { answerText } : {}),
  };
  db.cbtAttempts[idx] = {
    ...attempt,
    responses: buildStoredResponseRows(attempt, responseMap, [payloadResponse]),
    updatedAt: nowIso(),  };
  writeDB(db);
  return res.json({ ok: true, savedAt: db.cbtAttempts[idx].updatedAt });
});

router.post("/student/submit", (req, res) => {
  const attemptId = String(req.body?.attemptId || "").trim();
  const attemptToken = String(req.body?.attemptToken || "").trim();
  const payloadResponses = Array.isArray(req.body?.responses) ? req.body.responses : [];

  if (!attemptId || !attemptToken) {
    return res.status(400).json({ message: "attemptId and attemptToken are required" });
  }

  const db = ensureCbtCollections(readDB());
  const idx = (db.cbtAttempts || []).findIndex((item) => String(item.id) === attemptId);
  if (idx < 0) return res.status(404).json({ message: "Attempt not found" });

  const attempt = db.cbtAttempts[idx];
  if (String(attempt.attemptToken || "") !== attemptToken) {
    return res.status(401).json({ message: "Invalid attempt token" });
  }
  const summary = submitAttemptByIndex(db, idx, payloadResponses, getCandidateCredentialMeta(req));
  writeDB(db);
  return res.json(summary);
});

router.get("/student/result/:attemptId", auth(false), (req, res) => {
  const db = ensureCbtCollections(readDB());
  const attemptId = String(req.params.attemptId || "");
  const token = String(req.query.token || "");
  const attempt = (db.cbtAttempts || []).find((item) => String(item.id) === attemptId);
  if (!attempt) return res.status(404).json({ message: "Attempt not found" });

  const isTokenAccess = token && String(attempt.attemptToken || "") === token;
  const isOwnerStudent = req.user?.role === "STUDENT"
    && String(req.user.studentId || "") !== ""
    && (
      String(attempt.studentId || "") === String(req.user.studentId || "")
      || normalizeKey(attempt.candidateId) === normalizeKey(req.user.studentId)
    );

  if (!isTokenAccess && !isOwnerStudent) {
    return res.status(401).json({ message: "Unauthorized result access" });
  }

  if (String(attempt.status || "").toUpperCase() !== "SUBMITTED") {
    return res.status(400).json({ message: "Attempt has not been submitted yet" });
  }

  const exam = (db.cbtExams || []).find((item) => String(item.id) === String(attempt.examId));
  const summary = buildResultSummary(attempt, exam);
  const includeReview = parseBoolean(req.query.review, false)
    && parseBoolean(db.cbtSettings?.cbtRules?.showCorrectionsAfterSubmit, false);

  if (!includeReview) return res.json(summary);

  const responseMap = buildResponseMap(attempt);
  return res.json({
    ...summary,
    review: (attempt.questionSnapshot || []).map((question) => ({
      questionId: question.id,
      subjectName: question.subjectName,
      topicName: question.topicName,
      questionText: question.questionText,
      options: question.options,
      selectedIndex: responseMap.has(String(question.id)) ? responseMap.get(String(question.id)) : null,
      correctIndex: question.correctAnswerIndex,
      isCorrect: responseMap.get(String(question.id)) === Number(question.correctAnswerIndex),
      explanation: question.explanation || "",
    })),
  });
});

module.exports = router;





