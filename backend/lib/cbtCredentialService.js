const crypto = require("crypto");
const { nanoid } = require("nanoid");
const { hashPassword, verifyPassword } = require("./passwords");

const CBT_WORKFLOW_STATUSES = [
  "DRAFT",
  "READY_FOR_GENERATION",
  "CREDENTIALS_GENERATED",
  "PUBLISHED",
  "IN_PROGRESS",
  "CLOSED",
  "ARCHIVED",
];

const CBT_CANDIDATE_TYPES = ["STUDENT", "APPLICANT"];
const CBT_ACCESS_STATUSES = ["PENDING", "GENERATED", "PUBLISHED", "USED", "REVOKED", "EXPIRED"];
const CBT_OFFICER_ROLES = ["ACADEMIC_OFFICER", "SUPER_ADMIN", "HR_OFFICER"];
const STUDENT_ASSESSMENT_MODE = "STUDENT_EXAM";
const RECRUITMENT_ASSESSMENT_MODE = "RECRUITMENT_EXAM";
const ASSESSMENT_MODES = [STUDENT_ASSESSMENT_MODE, RECRUITMENT_ASSESSMENT_MODE];
const SCHOOL_TIME_ZONE = "Africa/Lagos";
const PASSWORD_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CAPTCHA_FAILURE_THRESHOLD = 5;
const DEFAULT_SESSION_TTL_MS = 30 * 60 * 1000;

const credentialPlaintextCache = new Map();

function nowIso() {
  return new Date().toISOString();
}

function normalizeKey(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeStatus(value, fallback = "DRAFT") {
  const clean = String(value || "").trim().toUpperCase();
  return CBT_WORKFLOW_STATUSES.includes(clean) ? clean : fallback;
}

function normalizeCandidateType(value, fallback = "STUDENT") {
  const clean = String(value || "").trim().toUpperCase();
  return CBT_CANDIDATE_TYPES.includes(clean) ? clean : fallback;
}

function normalizeAccessStatus(value, fallback = "PENDING") {
  const clean = String(value || "").trim().toUpperCase();
  return CBT_ACCESS_STATUSES.includes(clean) ? clean : fallback;
}

function normalizeRole(value) {
  return String(value || "").trim().toUpperCase();
}

function clean(value) {
  return String(value || "").trim();
}

function normalizeAssessmentMode(value, fallback = STUDENT_ASSESSMENT_MODE) {
  const next = clean(value).toUpperCase();
  return ASSESSMENT_MODES.includes(next) ? next : fallback;
}

function isRecruitmentAssessment(entity) {
  return normalizeAssessmentMode(
    entity?.assessmentMode,
    String(entity?.targetAudience || "").trim().toUpperCase() === "INTERVIEW" ? RECRUITMENT_ASSESSMENT_MODE : STUDENT_ASSESSMENT_MODE
  ) === RECRUITMENT_ASSESSMENT_MODE;
}

function normalizeRecruitmentCategory(value, fallback = "BASIC") {
  const raw = clean(value).toUpperCase();
  const key = normalizeKey(raw);
  if (["preschool", "preschoolinterview", "preeschool", "earlyyears", "nursery", "earlychildhood"].includes(key)) {
    return "PRESCHOOL";
  }
  if (["basic", "basicclass", "basicinterview", "basicclassinterview", "jss", "junior"].includes(key)) {
    return "BASIC";
  }
  if (["sss", "sssinterview", "senior", "seniorsecondary"].includes(key)) {
    return "SSS";
  }
  return fallback;
}

function getRecruitmentCategoryLabel(value) {
  const category = normalizeRecruitmentCategory(value);
  if (category === "PRESCHOOL") return "Pre-school Interview";
  if (category === "SSS") return "SSS Interview";
  return "Basic Class Interview";
}

function deriveTeachingCategory(application = {}, vacancy = {}) {
  const explicit = clean(
    application.teachingCategory
    || application.teachingLevel
    || vacancy.teachingCategory
    || vacancy.category
    || vacancy.department
  );
  const key = normalizeKey(explicit);
  if (["preschool", "earlyyears", "nursery", "earlychildhood"].includes(key)) return "preschool";
  if (["sss", "seniorsecondary", "senior"].includes(key)) return "sss";
  return "basic";
}

function isOfficerRole(value) {
  return CBT_OFFICER_ROLES.includes(normalizeRole(value));
}

function isTeacherRole(value) {
  return normalizeRole(value) === "TEACHER";
}

function deriveCredentialPrefix(exam) {
  const targetAudience = String(exam?.targetAudience || "").trim().toUpperCase();
  const examType = String(exam?.examType || "").trim().toUpperCase();
  if (targetAudience === "INTERVIEW" || examType === "INTERVIEW") return "AMS-INT";
  return "AMS-CBT";
}

function deriveExamCandidateType(exam) {
  return isRecruitmentAssessment(exam) || String(exam?.targetAudience || "").trim().toUpperCase() !== "STUDENT"
    ? "APPLICANT"
    : "STUDENT";
}

function deriveWorkflowExamType(exam) {
  return isRecruitmentAssessment(exam) ? "INTERVIEW_EXAM" : "SCHOOL_EXAM";
}

function formatSchoolDateTime(value) {
  const time = Date.parse(String(value || ""));
  if (!Number.isFinite(time)) return "";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: SCHOOL_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(time));
}

function cleanupPasswordCache() {
  const now = Date.now();
  for (const [key, value] of credentialPlaintextCache.entries()) {
    if (!value || Number(value.expiresAt || 0) <= now) credentialPlaintextCache.delete(key);
  }
}

function makeCacheKey(examId, candidateType, candidateId) {
  return `${String(examId || "")}::${String(candidateType || "")}::${String(candidateId || "")}`;
}

function cachePlainPassword(examId, candidateType, candidateId, password) {
  cleanupPasswordCache();
  credentialPlaintextCache.set(makeCacheKey(examId, candidateType, candidateId), {
    password: String(password || ""),
    expiresAt: Date.now() + PASSWORD_CACHE_TTL_MS,
  });
}

function getCachedPlainPassword(examId, candidateType, candidateId) {
  cleanupPasswordCache();
  return credentialPlaintextCache.get(makeCacheKey(examId, candidateType, candidateId))?.password || "";
}

function ensureCollections(db) {
  let changed = false;
  const ensureArray = (key) => {
    if (!Array.isArray(db[key])) {
      db[key] = [];
      changed = true;
    }
  };

  ensureArray("cbtExamCandidates");
  ensureArray("cbtExamCredentials");
  ensureArray("cbtExamAuditLogs");
  ensureArray("cbtCandidateSessions");
  ensureArray("cbtRecruitmentApplicants");
  syncRecruitmentApplicantsFromCareers(db);

  const now = Date.now();

  db.cbtExams = (Array.isArray(db.cbtExams) ? db.cbtExams : []).map((item) => {
    const status = normalizeStatus(item.status, "DRAFT");
    const next = {
      ...item,
      examCode: String(item.examCode || item.accessCode || "").trim().toUpperCase(),
      workflowExamType: deriveWorkflowExamType(item),
      attemptLimit: Math.max(1, Number(item.attemptLimit || (item.oneAttemptOnly === false ? 3 : 1) || 1)),
      status,
      createdByTeacherId: String(item.createdByTeacherId || item.createdBy || "").trim(),
      submittedAt: String(item.submittedAt || ""),
      reviewedByOfficerId: String(item.reviewedByOfficerId || ""),
      publishedAt: String(item.publishedAt || (status === "PUBLISHED" ? item.updatedAt || item.createdAt || nowIso() : "")),
      updatedAt: String(item.updatedAt || item.createdAt || nowIso()),
    };

    if (next.status === "PUBLISHED" || next.status === "IN_PROGRESS") {
      const endTime = Date.parse(String(next.endTime || ""));
      if (Number.isFinite(endTime) && now > endTime) {
        next.status = "CLOSED";
        next.updatedAt = nowIso();
      }
    }

    return next;
  });

  db.cbtExamCandidates = db.cbtExamCandidates.map((item) => ({
    ...item,
    candidateType: normalizeCandidateType(item.candidateType, "STUDENT"),
    accessStatus: normalizeAccessStatus(item.accessStatus, "PENDING"),
    credentialGeneratedAt: String(item.credentialGeneratedAt || ""),
    startedAt: String(item.startedAt || ""),
    completedAt: String(item.completedAt || ""),
  }));

  db.cbtExamCredentials = db.cbtExamCredentials.map((item) => {
    const expiresAt = String(item.expiresAt || "");
    const isExpired = expiresAt && Number.isFinite(Date.parse(expiresAt)) && Date.now() > Date.parse(expiresAt);
    return {
      ...item,
      candidateType: normalizeCandidateType(item.candidateType, "STUDENT"),
      loginId: String(item.loginId || "").trim().toUpperCase(),
      passwordHash: String(item.passwordHash || item.password || ""),
      passwordLast4: String(item.passwordLast4 || ""),
      generatedByUserId: String(item.generatedByUserId || ""),
      generatedAt: String(item.generatedAt || item.createdAt || nowIso()),
      expiresAt,
      isActive: Boolean(item.isActive !== false && !item.isRevoked && !isExpired),
      isRevoked: Boolean(item.isRevoked),
      revokedAt: String(item.revokedAt || ""),
      lastLoginAt: String(item.lastLoginAt || ""),
      failedAttempts: Math.max(0, Number(item.failedAttempts || 0)),
    };
  });

  db.cbtCandidateSessions = db.cbtCandidateSessions.filter((item) => {
    const expiresAt = Date.parse(String(item.expiresAt || ""));
    return Number.isFinite(expiresAt) ? expiresAt > now : false;
  });

  return changed;
}

function createAuditLog(db, payload) {
  db.cbtExamAuditLogs = Array.isArray(db.cbtExamAuditLogs) ? db.cbtExamAuditLogs : [];
  const log = {
    id: `cbt-audit-${nanoid(12)}`,
    examId: String(payload.examId || ""),
    candidateType: payload.candidateType ? normalizeCandidateType(payload.candidateType, "STUDENT") : "",
    candidateId: String(payload.candidateId || ""),
    action: String(payload.action || "").trim(),
    performedByUserId: String(payload.performedByUserId || ""),
    ipAddress: String(payload.ipAddress || ""),
    userAgent: String(payload.userAgent || ""),
    metaJson: payload.metaJson || {},
    createdAt: nowIso(),
  };
  db.cbtExamAuditLogs.unshift(log);
  return log;
}

function getCandidateRecordKey(candidateType, candidateId) {
  return `${normalizeCandidateType(candidateType)}::${String(candidateId || "").trim()}`;
}

function getActiveCredential(db, examId, candidateType, candidateId) {
  return (Array.isArray(db.cbtExamCredentials) ? db.cbtExamCredentials : []).find((item) => (
    String(item.examId || "") === String(examId || "")
    && normalizeCandidateType(item.candidateType, "STUDENT") === normalizeCandidateType(candidateType, "STUDENT")
    && String(item.candidateId || "") === String(candidateId || "")
    && Boolean(item.isActive)
    && !Boolean(item.isRevoked)
  )) || null;
}

function revokeCredentialRow(credential, now = nowIso()) {
  if (!credential) return null;
  return {
    ...credential,
    isActive: false,
    isRevoked: true,
    revokedAt: now,
    updatedAt: now,
  };
}

function revokeCredentialForCandidate(db, examId, candidateType, candidateId, reason = "revoked") {
  let revoked = 0;
  const now = nowIso();
  db.cbtExamCredentials = (Array.isArray(db.cbtExamCredentials) ? db.cbtExamCredentials : []).map((item) => {
    if (
      String(item.examId || "") === String(examId || "")
      && normalizeCandidateType(item.candidateType, "STUDENT") === normalizeCandidateType(candidateType, "STUDENT")
      && String(item.candidateId || "") === String(candidateId || "")
      && Boolean(item.isActive)
      && !Boolean(item.isRevoked)
    ) {
      revoked += 1;
      return revokeCredentialRow(item, now);
    }
    return item;
  });

  if (revoked > 0) {
    db.cbtExamCandidates = (Array.isArray(db.cbtExamCandidates) ? db.cbtExamCandidates : []).map((item) => {
      if (
        String(item.examId || "") === String(examId || "")
        && normalizeCandidateType(item.candidateType, "STUDENT") === normalizeCandidateType(candidateType, "STUDENT")
        && String(item.candidateId || "") === String(candidateId || "")
      ) {
        return {
          ...item,
          accessStatus: reason === "expired" ? "EXPIRED" : "REVOKED",
        };
      }
      return item;
    });
  }

  return revoked;
}

function findMatchingStudent(db, candidateId) {
  const key = normalizeKey(candidateId);
  return (Array.isArray(db.students) ? db.students : []).find((row) => (
    [row?.id, row?.studentId, row?.admissionNo].some((value) => normalizeKey(value) === key)
  )) || null;
}

function getLatestInterviewForApplication(db, applicationId) {
  return (Array.isArray(db.careerInterviews) ? db.careerInterviews : [])
    .filter((row) => String(row.applicationId || "") === String(applicationId || ""))
    .sort((a, b) => String(b.interviewDate || b.createdAt || "").localeCompare(String(a.interviewDate || a.createdAt || "")))[0] || null;
}

function hasActiveInterview(interview) {
  return ["scheduled", "rescheduled"].includes(clean(
    interview?.interviewStatus
    || interview?.latestInterviewStatus
    || interview?.status
  ).toLowerCase());
}

function buildRecruitmentApplicantProfile(application = {}, vacancy = {}, existing = {}, latestInterview = null) {
  const teachingCategory = deriveTeachingCategory(application, vacancy);
  const candidateId = clean(application.applicationNumber || existing.candidateId || application.id);
  return {
    id: clean(existing.id || `recruitment-profile-${application.id || candidateId}`),
    candidateId,
    careerApplicationId: clean(application.id || existing.careerApplicationId),
    vacancyId: clean(application.vacancyId || vacancy.id || existing.vacancyId),
    vacancyTitle: clean(vacancy.jobTitle || existing.vacancyTitle),
    applicantUserId: clean(application.applicantUserId || existing.applicantUserId),
    applicantUsername: clean(application.applicantUsername || existing.applicantUsername),
    fullName: clean(application.fullName || existing.fullName),
    email: clean(application.email || existing.email),
    phone: clean(application.phone || existing.phone),
    appliedRole: clean(application.appliedRole || vacancy.jobTitle || existing.appliedRole),
    teachingCategory,
    subjectSpecialization: clean(application.subjectSpecialization || application.subjectsCanTeach || existing.subjectSpecialization),
    qualification: clean(application.qualification || application.highestQualification || existing.qualification),
    experience: clean(application.experience || application.yearsOfExperience || existing.experience),
    applicationStatus: clean(application.applicationStatus || application.status || existing.applicationStatus || "new").toLowerCase(),
    trcnStatus: clean(application.trcnStatus || existing.trcnStatus),
    currentEmployer: clean(application.currentEmployer || existing.currentEmployer),
    latestInterviewId: clean(latestInterview?.id || existing.latestInterviewId),
    latestInterviewStatus: clean(latestInterview?.interviewStatus || existing.latestInterviewStatus),
    latestInterviewDate: clean(latestInterview?.interviewDate || existing.latestInterviewDate),
    latestInterviewTime: clean(latestInterview?.interviewTime || existing.latestInterviewTime),
    createdAt: clean(existing.createdAt || application.createdAt || application.submittedAt || nowIso()),
    updatedAt: nowIso(),
  };
}

function syncRecruitmentApplicantsFromCareers(db) {
  const applications = Array.isArray(db.careerApplications) ? db.careerApplications : [];
  const vacancies = Array.isArray(db.careerVacancies) ? db.careerVacancies : [];
  const existing = new Map(
    (Array.isArray(db.cbtRecruitmentApplicants) ? db.cbtRecruitmentApplicants : []).map((row) => [
      clean(row.careerApplicationId || row.candidateId || row.id),
      row,
    ])
  );

  db.cbtRecruitmentApplicants = applications.map((application) => {
    const vacancy = vacancies.find((item) => String(item.id || "") === String(application.vacancyId || "")) || {};
    const current = existing.get(clean(application.id || application.applicationNumber)) || {};
    const latestInterview = getLatestInterviewForApplication(db, application.id);
    return buildRecruitmentApplicantProfile(application, vacancy, current, latestInterview);
  });

  return db.cbtRecruitmentApplicants;
}

function buildRecruitmentProfileFromInterview(db, interview = {}) {
  const applications = Array.isArray(db.careerApplications) ? db.careerApplications : [];
  const vacancies = Array.isArray(db.careerVacancies) ? db.careerVacancies : [];
  const application = applications.find((item) => String(item.id || "") === String(interview.applicationId || "")) || {};
  const vacancyId = application.vacancyId || interview.vacancyId || "";
  const vacancy = vacancies.find((item) => String(item.id || "") === String(vacancyId)) || {};
  return buildRecruitmentApplicantProfile(
    {
      ...application,
      id: application.id || interview.applicationId || interview.id,
      vacancyId,
      applicationNumber: application.applicationNumber || interview.applicationNumber || interview.candidateId,
      fullName: application.fullName || interview.applicantName || interview.fullName || interview.candidateName,
      email: application.email || interview.email,
      phone: application.phone || interview.phone,
      status: application.status || "shortlisted",
    },
    vacancy,
    {},
    interview
  );
}

function getRecruitmentCandidateSourceRows(db) {
  const rows = Array.isArray(db.cbtRecruitmentApplicants) ? [...db.cbtRecruitmentApplicants] : [];
  const seen = new Set(rows.map((row) => normalizeKey(row.careerApplicationId || row.candidateId || row.id)).filter(Boolean));

  for (const interview of Array.isArray(db.careerInterviews) ? db.careerInterviews : []) {
    if (!hasActiveInterview(interview)) continue;
    const profile = buildRecruitmentProfileFromInterview(db, interview);
    const key = normalizeKey(profile.careerApplicationId || profile.candidateId || profile.id);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    rows.push(profile);
  }

  return rows;
}

function countRecruitmentCategories(rows) {
  return (Array.isArray(rows) ? rows : []).reduce((acc, row) => {
    const category = normalizeRecruitmentCategory(row?.teachingCategory, "BASIC");
    acc[category] = Number(acc[category] || 0) + 1;
    return acc;
  }, { PRESCHOOL: 0, BASIC: 0, SSS: 0 });
}

function buildRecruitmentSyncDiagnostics(db, exam, incoming = []) {
  if (!isRecruitmentAssessment(exam)) return null;

  const applications = Array.isArray(db.careerApplications) ? db.careerApplications : [];
  const interviews = Array.isArray(db.careerInterviews) ? db.careerInterviews : [];
  const activeInterviews = interviews.filter(hasActiveInterview);
  const sourceRows = getRecruitmentCandidateSourceRows(db);
  const wantedCategory = normalizeRecruitmentCategory(exam?.recruitmentCategory || "BASIC");
  const roleFilter = normalizeKey(exam?.appliedRoleFilter || "");
  const specializationFilter = normalizeKey(exam?.subjectSpecializationFilter || "");
  const categoryMatches = sourceRows.filter((row) => normalizeRecruitmentCategory(row.teachingCategory, "BASIC") === wantedCategory);
  const filterMatches = categoryMatches.filter((row) => (
    (!roleFilter || normalizeKey(row.appliedRole).includes(roleFilter) || hasActiveInterview(row))
    && (!specializationFilter || normalizeKey(row.subjectSpecialization).includes(specializationFilter) || hasActiveInterview(row))
  ));

  const applicationsById = new Map(applications.map((row) => [String(row.id || ""), row]));
  const interviewApplicationIds = activeInterviews
    .map((row) => String(row.applicationId || row.careerApplicationId || row.candidateId || ""))
    .filter(Boolean);
  const seenInterviewIds = new Set();
  const duplicateInterviewApplicationIds = [];
  for (const id of interviewApplicationIds) {
    if (seenInterviewIds.has(id)) duplicateInterviewApplicationIds.push(id);
    seenInterviewIds.add(id);
  }

  return {
    examCategory: getRecruitmentCategoryLabel(wantedCategory),
    appliedRoleFilter: clean(exam?.appliedRoleFilter || ""),
    subjectSpecializationFilter: clean(exam?.subjectSpecializationFilter || ""),
    careerApplications: applications.length,
    careerInterviews: interviews.length,
    activeCareerInterviews: activeInterviews.length,
    recruitmentProfiles: Array.isArray(db.cbtRecruitmentApplicants) ? db.cbtRecruitmentApplicants.length : 0,
    sourceCandidates: sourceRows.length,
    sourceByCategory: countRecruitmentCategories(sourceRows),
    categoryMatches: categoryMatches.length,
    filterMatches: filterMatches.length,
    matchedCandidates: Array.isArray(incoming) ? incoming.length : 0,
    matchedNames: (Array.isArray(incoming) ? incoming : [])
      .map((row) => clean(row.fullNameSnapshot || row.fullName || row.candidateId))
      .filter(Boolean)
      .slice(0, 8),
    activeInterviewNames: activeInterviews
      .map((row) => clean(
        row.applicantName
        || row.fullName
        || row.candidateName
        || applicationsById.get(String(row.applicationId || ""))?.fullName
        || row.applicationId
      ))
      .filter(Boolean)
      .slice(0, 8),
    duplicateInterviewApplicationIds: Array.from(new Set(duplicateInterviewApplicationIds)).slice(0, 8),
  };
}

function findRecruitmentApplicantProfile(db, reference) {
  const key = normalizeKey(reference);
  if (!key) return null;
  return getRecruitmentCandidateSourceRows(db).find((row) => (
    [
      row.id,
      row.candidateId,
      row.careerApplicationId,
      row.applicantUserId,
      row.applicantUsername,
      row.email,
    ].some((value) => normalizeKey(value) === key)
  )) || null;
}

function findMatchingApplicant(db, candidateId) {
  const recruitmentProfile = findRecruitmentApplicantProfile(db, candidateId);
  if (recruitmentProfile) return recruitmentProfile;
  const key = normalizeKey(candidateId);
  return (Array.isArray(db.admissions) ? db.admissions : []).find((row) => (
    [
      row?.id,
      row?.applicationNo,
      row?.applicantUserId,
      row?.applicantUsername,
    ].some((value) => normalizeKey(value) === key)
  )) || null;
}

function getCandidateLabel(candidate) {
  return String(candidate?.full_name_snapshot || candidate?.fullNameSnapshot || candidate?.fullName || "").trim();
}

function buildStudentCandidates(db, exam, candidateIds = []) {
  const allowedKeys = new Set((Array.isArray(candidateIds) ? candidateIds : []).map(normalizeKey).filter(Boolean));
  return (Array.isArray(db.students) ? db.students : [])
    .filter((row) => String(row.classId || "") === String(exam.classId || "") || normalizeKey(row.className || row.class) === normalizeKey(exam.className))
    .filter((row) => allowedKeys.size === 0 || [row.id, row.studentId, row.admissionNo].some((value) => allowedKeys.has(normalizeKey(value))))
    .map((row) => ({
      candidateType: "STUDENT",
      candidateId: String(row.id || row.studentId || row.admissionNo || "").trim(),
      fullNameSnapshot: String(row.name || "").trim(),
      classOrBatchSnapshot: String(row.className || row.class || "").trim(),
    }))
    .filter((row) => row.candidateId && row.fullNameSnapshot);
}

function resolveApplicantBatchLabel(record) {
  return [
    String(record?.sessionName || "").trim(),
    String(record?.className || record?.academicHistory?.intendedClass || record?.enrollment?.offeredClassName || "").trim(),
  ].filter(Boolean).join(" - ");
}

function buildRecruitmentApplicantCandidates(db, exam, candidateIds = []) {
  const allowedKeys = new Set((Array.isArray(candidateIds) ? candidateIds : []).map(normalizeKey).filter(Boolean));
  const wantedCategory = normalizeRecruitmentCategory(exam?.recruitmentCategory || "BASIC");
  const roleFilter = normalizeKey(exam?.appliedRoleFilter || "");
  const specializationFilter = normalizeKey(exam?.subjectSpecializationFilter || "");

  return getRecruitmentCandidateSourceRows(db)
    .filter((row) => {
      const applicationStatus = clean(row.applicationStatus).toLowerCase();
      return !["rejected", "archived"].includes(applicationStatus) || hasActiveInterview(row);
    })
    .filter((row) => normalizeRecruitmentCategory(row.teachingCategory, "BASIC") === wantedCategory)
    .filter((row) => !roleFilter || normalizeKey(row.appliedRole).includes(roleFilter) || hasActiveInterview(row))
    .filter((row) => !specializationFilter || normalizeKey(row.subjectSpecialization).includes(specializationFilter) || hasActiveInterview(row))
    .filter((row) => allowedKeys.size === 0 || [
      row.id,
      row.candidateId,
      row.careerApplicationId,
      row.applicantUserId,
      row.applicantUsername,
      row.email,
    ].some((value) => allowedKeys.has(normalizeKey(value))))
    .map((row) => ({
      candidateType: "APPLICANT",
      candidateId: clean(row.candidateId || row.careerApplicationId || row.id),
      fullNameSnapshot: clean(row.fullName),
      classOrBatchSnapshot: [
        getRecruitmentCategoryLabel(row.teachingCategory),
        clean(row.appliedRole),
        hasActiveInterview(row) ? "Interview scheduled" : "",
      ].filter(Boolean).join(" - "),
    }))
    .filter((row) => row.candidateId && row.fullNameSnapshot);
}

function buildApplicantCandidates(db, exam, candidateIds = []) {
  if (isRecruitmentAssessment(exam)) {
    return buildRecruitmentApplicantCandidates(db, exam, candidateIds);
  }
  const allowedKeys = new Set((Array.isArray(candidateIds) ? candidateIds : []).map(normalizeKey).filter(Boolean));
  return (Array.isArray(db.admissions) ? db.admissions : [])
    .filter((row) => !Boolean(row.isArchived))
    .filter((row) => !["REJECTED"].includes(String(row.status || "").trim().toUpperCase()))
    .filter((row) => {
      if (!exam.applicantBatchId) return true;
      const batchCandidates = [
        row?.sessionId,
        row?.sessionName,
        resolveApplicantBatchLabel(row),
        `${row?.sessionId || ""}:${row?.classId || ""}`,
      ];
      return batchCandidates.some((value) => normalizeKey(value) === normalizeKey(exam.applicantBatchId));
    })
    .filter((row) => {
      if (!exam.className) return true;
      const intended = row?.academicHistory?.intendedClass || row?.className || row?.enrollment?.offeredClassName || "";
      return normalizeKey(intended) === normalizeKey(exam.className);
    })
    .filter((row) => allowedKeys.size === 0 || [row.id, row.applicationNo, row.applicantUserId, row.applicantUsername].some((value) => allowedKeys.has(normalizeKey(value))))
    .map((row) => ({
      candidateType: "APPLICANT",
      candidateId: String(row.applicationNo || row.id || row.applicantUserId || "").trim(),
      fullNameSnapshot: String(row.applicantName || [
        row?.personal?.surname,
        row?.personal?.firstName,
        row?.personal?.middleName,
      ].filter(Boolean).join(" ")).trim(),
      classOrBatchSnapshot: resolveApplicantBatchLabel(row) || String(row.className || "").trim() || "Applicant Batch",
    }))
    .filter((row) => row.candidateId && row.fullNameSnapshot);
}

function syncExamCandidates(db, exam, actor, options = {}) {
  const candidateType = normalizeCandidateType(options.candidateType || deriveExamCandidateType(exam));
  const incoming = candidateType === "STUDENT"
    ? buildStudentCandidates(db, exam, options.candidateIds)
    : buildApplicantCandidates(db, exam, options.candidateIds);
  const diagnostics = candidateType === "APPLICANT" && isRecruitmentAssessment(exam)
    ? buildRecruitmentSyncDiagnostics(db, exam, incoming)
    : null;

  const now = nowIso();
  const existing = (Array.isArray(db.cbtExamCandidates) ? db.cbtExamCandidates : []).filter((item) => String(item.examId || "") === String(exam.id));

  if (incoming.length === 0) {
    return {
      candidateType,
      total: 0,
      added: 0,
      removed: 0,
      candidates: existing,
      empty: true,
      diagnostics,
    };
  }

  const existingByKey = new Map(existing.map((item) => [getCandidateRecordKey(item.candidateType, item.candidateId), item]));
  const incomingKeys = new Set(incoming.map((item) => getCandidateRecordKey(item.candidateType, item.candidateId)));

  let added = 0;
  let removed = 0;

  const nextRows = [];
  for (const candidate of incoming) {
    const key = getCandidateRecordKey(candidate.candidateType, candidate.candidateId);
    const current = existingByKey.get(key);
    if (!current) added += 1;
    nextRows.push({
      id: String(current?.id || `cbt-exam-candidate-${nanoid(12)}`),
      examId: String(exam.id),
      candidateType: candidate.candidateType,
      candidateId: candidate.candidateId,
      fullNameSnapshot: candidate.fullNameSnapshot,
      classOrBatchSnapshot: candidate.classOrBatchSnapshot,
      accessStatus: normalizeAccessStatus(current?.accessStatus, "PENDING"),
      credentialGeneratedAt: String(current?.credentialGeneratedAt || ""),
      startedAt: String(current?.startedAt || ""),
      completedAt: String(current?.completedAt || ""),
      createdAt: String(current?.createdAt || now),
      updatedAt: now,
    });
  }

  for (const row of existing) {
    const key = getCandidateRecordKey(row.candidateType, row.candidateId);
    if (incomingKeys.has(key)) continue;
    removed += 1;
    revokeCredentialForCandidate(db, exam.id, row.candidateType, row.candidateId, "revoked");
    nextRows.push({
      ...row,
      accessStatus: "REVOKED",
      updatedAt: now,
    });
  }

  db.cbtExamCandidates = [
    ...nextRows,
    ...(db.cbtExamCandidates || []).filter((item) => String(item.examId || "") !== String(exam.id)),
  ];

  if (added > 0 || removed > 0) {
    if (["CREDENTIALS_GENERATED", "PUBLISHED", "IN_PROGRESS"].includes(String(exam.status || "").toUpperCase())) {
      exam.status = "READY_FOR_GENERATION";
      exam.updatedAt = now;
    }

    createAuditLog(db, {
      examId: exam.id,
      action: "candidates_synced",
      performedByUserId: actor?.id,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      metaJson: {
        added,
        removed,
        total: incoming.length,
        candidateType,
      },
    });
  }

  return {
    candidateType,
    total: incoming.length,
    added,
    removed,
    candidates: nextRows.filter((item) => String(item.examId || "") === String(exam.id)),
    diagnostics,
  };
}

function buildCredentialIndex(exam, db) {
  const prefix = deriveCredentialPrefix(exam);
  const year = new Date(exam?.startTime || exam?.createdAt || nowIso()).getUTCFullYear();
  const seriesPrefix = `${prefix}-${year}-`;
  let max = 0;

  for (const row of Array.isArray(db.cbtExamCredentials) ? db.cbtExamCredentials : []) {
    const loginId = String(row.loginId || "").trim().toUpperCase();
    if (!loginId.startsWith(seriesPrefix)) continue;
    const trailing = Number(loginId.slice(seriesPrefix.length));
    if (Number.isFinite(trailing) && trailing > max) max = trailing;
  }

  return { prefix, year, max };
}

function createLoginId(exam, db) {
  const series = buildCredentialIndex(exam, db);
  let sequence = series.max + 1;
  let loginId = "";
  const existing = new Set((Array.isArray(db.cbtExamCredentials) ? db.cbtExamCredentials : []).map((item) => String(item.loginId || "").trim().toUpperCase()));

  do {
    loginId = `${series.prefix}-${series.year}-${String(sequence).padStart(4, "0")}`;
    sequence += 1;
  } while (existing.has(loginId));

  return loginId;
}

function createRandomPassword(length = 8) {
  const size = Math.max(8, Math.min(10, Number(length || 8)));
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(size);
  let out = "";
  for (let index = 0; index < size; index += 1) {
    out += chars[bytes[index] % chars.length];
  }
  return out;
}

function getExamCandidates(db, examId, { includeRevoked = true } = {}) {
  const rows = (Array.isArray(db.cbtExamCandidates) ? db.cbtExamCandidates : []).filter((item) => String(item.examId || "") === String(examId || ""));
  return includeRevoked ? rows : rows.filter((item) => normalizeAccessStatus(item.accessStatus, "PENDING") !== "REVOKED");
}

async function generateCredentials(db, exam, actor, options = {}) {
  const mode = String(options.mode || "missing_only").trim().toLowerCase();
  const currentExamStatus = normalizeStatus(exam.status, "DRAFT");
  const allowStatusBypass = Boolean(options.allowStatusBypass);
  if (!allowStatusBypass && !["READY_FOR_GENERATION", "CREDENTIALS_GENERATED"].includes(currentExamStatus)) {
    throw Object.assign(new Error("Only ready_for_generation or credentials_generated exams can generate credentials."), { status: 409 });
  }

  const passwordLength = Math.max(8, Math.min(10, Number(options.passwordLength || 8)));
  const expiresAt = String(options.expiresAt || exam.endTime || "").trim();
  const now = nowIso();
  const candidateFilterKeys = new Set(
    (Array.isArray(options.candidateIds) ? options.candidateIds : [])
      .map((item) => normalizeKey(item))
      .filter(Boolean)
  );
  const candidates = getExamCandidates(db, exam.id, { includeRevoked: false }).filter((candidate) => (
    candidateFilterKeys.size === 0 || candidateFilterKeys.has(normalizeKey(candidate.candidateId))
  ));
  if (candidates.length === 0) {
    throw Object.assign(new Error(
      candidateFilterKeys.size > 0
        ? "No synced candidate matched the requested credential operation."
        : "No synced candidates are available for credential generation."
    ), { status: 400 });
  }

  const generated = [];
  let skipped = 0;
  let regenerated = 0;

  for (const candidate of candidates) {
    const existing = getActiveCredential(db, exam.id, candidate.candidateType, candidate.candidateId);
    if (mode === "missing_only" && existing) {
      skipped += 1;
      continue;
    }

    if (existing) {
      revokeCredentialForCandidate(db, exam.id, candidate.candidateType, candidate.candidateId, "revoked");
      regenerated += 1;
    }

    const loginId = createLoginId(exam, db);
    const password = createRandomPassword(passwordLength);
    const passwordHash = await hashPassword(password);

    const row = {
      id: `cbt-credential-${nanoid(12)}`,
      examId: exam.id,
      candidateType: candidate.candidateType,
      candidateId: candidate.candidateId,
      loginId,
      passwordHash,
      passwordLast4: password.slice(-4),
      generatedByUserId: String(actor?.id || ""),
      generatedAt: now,
      expiresAt,
      isActive: true,
      isRevoked: false,
      revokedAt: "",
      lastLoginAt: "",
      failedAttempts: 0,
      createdAt: now,
      updatedAt: now,
    };

    db.cbtExamCredentials.unshift(row);
    cachePlainPassword(exam.id, candidate.candidateType, candidate.candidateId, password);

    db.cbtExamCandidates = (db.cbtExamCandidates || []).map((item) => {
      if (
        String(item.examId || "") === String(exam.id)
        && normalizeCandidateType(item.candidateType, "STUDENT") === normalizeCandidateType(candidate.candidateType, "STUDENT")
        && String(item.candidateId || "") === String(candidate.candidateId)
      ) {
        return {
          ...item,
          accessStatus: ["PUBLISHED", "IN_PROGRESS"].includes(currentExamStatus) ? "PUBLISHED" : "GENERATED",
          credentialGeneratedAt: now,
          updatedAt: now,
        };
      }
      return item;
    });

    generated.push({
      candidateId: candidate.candidateId,
      candidateName: candidate.fullNameSnapshot,
      candidateType: candidate.candidateType,
      classOrBatch: candidate.classOrBatchSnapshot,
      loginId,
      password,
      expiresAt,
    });
  }

  if (generated.length > 0) {
    if (allowStatusBypass) {
      if (["READY_FOR_GENERATION", "DRAFT"].includes(currentExamStatus)) {
        exam.status = "CREDENTIALS_GENERATED";
      }
    } else {
      exam.status = "CREDENTIALS_GENERATED";
    }
    exam.reviewedByOfficerId = String(actor?.id || "");
    exam.updatedAt = now;
  }

  createAuditLog(db, {
    examId: exam.id,
    action: mode === "regenerate_all" ? "credentials_regenerated" : "credentials_generated",
    performedByUserId: actor?.id,
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
    metaJson: {
      generated: generated.length,
      skipped,
      regenerated,
      passwordLength,
      expiresAt,
      mode,
    },
  });

  return { generated, skipped, regenerated, mode };
}

async function resetCandidateCredential(db, exam, candidateType, candidateId, actor, options = {}) {
  const row = getExamCandidates(db, exam.id).find((item) => (
    normalizeCandidateType(item.candidateType, "STUDENT") === normalizeCandidateType(candidateType, "STUDENT")
    && String(item.candidateId || "") === String(candidateId || "")
  ));
  if (!row) throw Object.assign(new Error("Candidate is not assigned to this exam."), { status: 404 });

  revokeCredentialForCandidate(db, exam.id, candidateType, candidateId, "revoked");
  const result = await generateCredentials(db, exam, actor, {
    ...options,
    mode: "missing_only",
    candidateIds: [candidateId],
    allowStatusBypass: true,
  });
  const generated = result.generated.find((item) => (
    normalizeCandidateType(item.candidateType, "STUDENT") === normalizeCandidateType(candidateType, "STUDENT")
    && String(item.candidateId || "") === String(candidateId || "")
  ));

  createAuditLog(db, {
    examId: exam.id,
    candidateType,
    candidateId,
    action: "credential_reset",
    performedByUserId: actor?.id,
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
    metaJson: generated || {},
  });

  return generated;
}

function revokeCandidateCredential(db, exam, candidateType, candidateId, actor, options = {}) {
  const revoked = revokeCredentialForCandidate(db, exam.id, candidateType, candidateId, "revoked");
  if (!revoked) throw Object.assign(new Error("Active credential not found for this candidate."), { status: 404 });

  createAuditLog(db, {
    examId: exam.id,
    candidateType,
    candidateId,
    action: "credential_revoked",
    performedByUserId: actor?.id,
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
    metaJson: { revoked },
  });

  return revoked;
}

function publishExam(db, exam, actor, options = {}) {
  if (String(exam.status || "").toUpperCase() !== "CREDENTIALS_GENERATED") {
    throw Object.assign(new Error("Only credentials_generated exams can be published."), { status: 409 });
  }

  const candidates = getExamCandidates(db, exam.id, { includeRevoked: false });
  const activeCredentials = (db.cbtExamCredentials || []).filter((item) => String(item.examId || "") === String(exam.id) && item.isActive && !item.isRevoked);
  if (!candidates.length || !activeCredentials.length) {
    throw Object.assign(new Error("Generate candidate credentials before publishing this exam."), { status: 400 });
  }

  const now = nowIso();
  exam.status = "PUBLISHED";
  exam.publishedAt = now;
  exam.reviewedByOfficerId = String(actor?.id || "");
  exam.updatedAt = now;

  db.cbtExamCandidates = (db.cbtExamCandidates || []).map((item) => {
    if (String(item.examId || "") === String(exam.id) && item.accessStatus === "GENERATED") {
      return { ...item, accessStatus: "PUBLISHED", updatedAt: now };
    }
    return item;
  });

  createAuditLog(db, {
    examId: exam.id,
    action: "exam_published",
    performedByUserId: actor?.id,
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
    metaJson: {
      candidates: candidates.length,
      activeCredentials: activeCredentials.length,
    },
  });

  return exam;
}

function closeExam(db, exam, actor, options = {}) {
  const now = nowIso();
  exam.status = "CLOSED";
  exam.updatedAt = now;
  db.cbtExamCandidates = (db.cbtExamCandidates || []).map((item) => {
    if (String(item.examId || "") === String(exam.id) && ["GENERATED", "PUBLISHED"].includes(normalizeAccessStatus(item.accessStatus, "PENDING"))) {
      return { ...item, accessStatus: "EXPIRED", updatedAt: now };
    }
    return item;
  });

  createAuditLog(db, {
    examId: exam.id,
    action: "exam_closed",
    performedByUserId: actor?.id,
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
    metaJson: {},
  });

  return exam;
}

function buildCredentialExportRows(db, exam) {
  const candidates = getExamCandidates(db, exam.id);
  const activeByKey = new Map(
    (db.cbtExamCredentials || [])
      .filter((item) => String(item.examId || "") === String(exam.id) && item.isActive && !item.isRevoked)
      .map((item) => [getCandidateRecordKey(item.candidateType, item.candidateId), item])
  );

  return candidates.map((candidate) => {
    const credential = activeByKey.get(getCandidateRecordKey(candidate.candidateType, candidate.candidateId));
    const password = credential ? getCachedPlainPassword(exam.id, candidate.candidateType, candidate.candidateId) : "";
    return {
      candidateName: candidate.fullNameSnapshot,
      candidateType: candidate.candidateType,
      classOrBatch: candidate.classOrBatchSnapshot,
      loginId: credential?.loginId || "",
      password: password || "",
      passwordAvailable: Boolean(password),
      examTitle: exam.examTitle,
      expiry: credential?.expiresAt || exam.endTime || "",
    };
  });
}

function buildCredentialCsv(rows) {
  const escape = (value) => {
    const text = String(value ?? "");
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, "\"\"")}"`;
    return text;
  };

  const header = ["Candidate Name", "Candidate Type", "Class/Batch", "Login ID", "Password", "Exam Title", "Expiry"];
  return [
    header.map(escape).join(","),
    ...rows.map((row) => [
      row.candidateName,
      row.candidateType,
      row.classOrBatch,
      row.loginId,
      row.password || "RESET REQUIRED",
      row.examTitle,
      row.expiry,
    ].map(escape).join(",")),
  ].join("\n");
}

function pdfEscape(text) {
  return String(text || "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function pdfText(x, y, font, size, text, color = "0 0 0") {
  return `${color} rg\nBT /${font} ${size} Tf ${x} ${y} Td (${pdfEscape(text)}) Tj ET`;
}

function wrapPdfLine(text, width = 74) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
  const out = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > width && current) {
      out.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) out.push(current);
  return out;
}

function buildCredentialPdfBuffer(exam, rows) {
  const lines = [];
  rows.forEach((row, index) => {
    lines.push(`Slip ${index + 1}`);
    lines.push(`School: Angel Montessori School`);
    lines.push(`Exam: ${exam.examTitle}`);
    lines.push(`Candidate: ${row.candidateName}`);
    lines.push(`Type: ${row.candidateType}`);
    lines.push(`Class/Batch: ${row.classOrBatch}`);
    lines.push(`Login ID: ${row.loginId || "-"}`);
    lines.push(`Password: ${row.password || "RESET REQUIRED"}`);
    lines.push(`Expiry: ${formatSchoolDateTime(row.expiry) || "Not set"}`);
    wrapPdfLine("Instructions: Arrive early, keep your login slip secure, and contact the school immediately if your credential needs to be reset before the exam.").forEach((line) => lines.push(line));
    lines.push("");
  });

  const pages = [];
  for (let index = 0; index < lines.length; index += 48) {
    pages.push(lines.slice(index, index + 48));
  }
  if (!pages.length) pages.push(["No credential slips available"]);

  const objects = {};
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";
  objects[5] = "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>";

  let objectId = 6;
  const pageIds = [];
  pages.forEach((pageLines, pageIndex) => {
    const pageId = objectId;
    const contentId = objectId + 1;
    objectId += 2;
    pageIds.push(pageId);

    const operations = [];
    operations.push("0.11 0.31 0.56 rg\n36 792 523 28 re f");
    operations.push(pdfText(46, 801, "F4", 13, `CBT CREDENTIAL SLIPS - ${exam.examTitle} (Page ${pageIndex + 1}/${pages.length})`, "1 1 1"));

    let y = 776;
    pageLines.forEach((line, lineIndex) => {
      const font = /^Slip \d+$/i.test(line) ? "F4" : line.startsWith("Password:") ? "F5" : "F3";
      const size = font === "F4" ? 10 : 8.5;
      operations.push(pdfText(40, y, font, size, line));
      y -= 14;
    });

    const stream = operations.join("\n");
    objects[contentId] = `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`;
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F3 3 0 R /F4 4 0 R /F5 5 0 R >> >> /Contents ${contentId} 0 R >>`;
  });

  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((value) => `${value} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
  let pdf = "%PDF-1.4\n";
  const maxObjectId = objectId - 1;
  const offsets = new Array(maxObjectId + 1).fill(0);
  for (let index = 1; index <= maxObjectId; index += 1) {
    offsets[index] = Buffer.byteLength(pdf, "utf8");
    pdf += `${index} 0 obj\n${objects[index] || "<<>>"}\nendobj\n`;
  }
  const xrefStart = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${maxObjectId + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= maxObjectId; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${maxObjectId + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}

function summarizeExam(db, exam) {
  const candidates = getExamCandidates(db, exam.id);
  const activeCandidates = candidates.filter((item) => normalizeAccessStatus(item.accessStatus, "PENDING") !== "REVOKED");
  const activeCredentials = (db.cbtExamCredentials || []).filter((item) => String(item.examId || "") === String(exam.id) && item.isActive && !item.isRevoked);
  const generatedCount = candidates.filter((item) => ["GENERATED", "PUBLISHED", "USED"].includes(normalizeAccessStatus(item.accessStatus, "PENDING"))).length;
  const publishedCount = candidates.filter((item) => ["PUBLISHED", "USED"].includes(normalizeAccessStatus(item.accessStatus, "PENDING"))).length;
  return {
    totalCandidates: activeCandidates.length,
    generatedCount,
    publishedCount,
    activeCredentialCount: activeCredentials.length,
  };
}

function buildExamDetail(db, exam) {
  const summary = summarizeExam(db, exam);
  const candidates = getExamCandidates(db, exam.id).map((candidate) => {
    const credential = getActiveCredential(db, exam.id, candidate.candidateType, candidate.candidateId);
    return {
      ...candidate,
      loginId: credential?.loginId || "",
      passwordAvailable: Boolean(credential ? getCachedPlainPassword(exam.id, candidate.candidateType, candidate.candidateId) : ""),
      expiresAt: credential?.expiresAt || "",
      failedAttempts: Number(credential?.failedAttempts || 0),
      lastLoginAt: credential?.lastLoginAt || "",
      isActive: Boolean(credential?.isActive),
      isRevoked: Boolean(credential?.isRevoked),
    };
  });

  const auditLogs = (db.cbtExamAuditLogs || [])
    .filter((item) => String(item.examId || "") === String(exam.id))
    .slice(0, 50);

  return {
    exam: {
      ...exam,
      ...summary,
      examCode: exam.examCode || exam.accessCode || "",
      workflowExamType: deriveWorkflowExamType(exam),
      candidateType: deriveExamCandidateType(exam),
    },
    credentialsSummary: summary,
    candidates,
    auditLogs,
  };
}

async function authenticateCandidateLogin(db, loginId, password, meta = {}) {
  const normalizedLoginId = String(loginId || "").trim().toUpperCase();
  const credential = (db.cbtExamCredentials || []).find((item) => String(item.loginId || "").trim().toUpperCase() === normalizedLoginId);
  if (!credential) {
    return { ok: false, status: 404, message: "Credential not found." };
  }

  const exam = (db.cbtExams || []).find((item) => String(item.id || "") === String(credential.examId || ""));
  if (!exam) {
    return { ok: false, status: 404, message: "Exam not found for this credential." };
  }

  const candidate = getExamCandidates(db, exam.id).find((item) => (
    normalizeCandidateType(item.candidateType, "STUDENT") === normalizeCandidateType(credential.candidateType, "STUDENT")
    && String(item.candidateId || "") === String(credential.candidateId || "")
  ));

  const fail = (message, auditMeta = {}) => {
    credential.failedAttempts = Math.max(0, Number(credential.failedAttempts || 0)) + 1;
    credential.updatedAt = nowIso();
    createAuditLog(db, {
      examId: exam.id,
      candidateType: credential.candidateType,
      candidateId: credential.candidateId,
      action: "login_failed",
      performedByUserId: "",
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metaJson: auditMeta,
    });
    return {
      ok: false,
      status: 403,
      message,
      captchaRequired: credential.failedAttempts >= CAPTCHA_FAILURE_THRESHOLD,
    };
  };

  if (!credential.isActive || credential.isRevoked) {
    return fail("Credential is not active for this exam.", { reason: "inactive" });
  }

  if (credential.expiresAt && Number.isFinite(Date.parse(credential.expiresAt)) && Date.now() > Date.parse(credential.expiresAt)) {
    credential.isActive = false;
    return fail("Credential has expired for this exam.", { reason: "expired" });
  }

  if (!["PUBLISHED", "IN_PROGRESS"].includes(normalizeStatus(exam.status, "DRAFT"))) {
    return fail("This exam is not currently open for candidate login.", { reason: "exam_status", examStatus: exam.status });
  }

  const startTime = Date.parse(String(exam.startTime || ""));
  const endTime = Date.parse(String(exam.endTime || ""));
  const now = Date.now();
  if (Number.isFinite(startTime) && now < startTime) {
    return fail("This exam has not started yet.", { reason: "too_early" });
  }
  if (Number.isFinite(endTime) && now > endTime) {
    exam.status = "CLOSED";
    credential.isActive = false;
    return fail("This exam has already closed.", { reason: "too_late" });
  }

  const verify = await verifyPassword(password, credential.passwordHash);
  if (!verify.ok) {
    return fail("Invalid credential password.", { reason: "bad_password" });
  }

  const attempts = (db.cbtAttempts || []).filter((item) => (
    String(item.examId || "") === String(exam.id)
    && normalizeCandidateType(item.candidateType || deriveExamCandidateType(exam), "STUDENT") === normalizeCandidateType(credential.candidateType, "STUDENT")
    && String(item.candidateId || "") === String(credential.candidateId || "")
    && String(item.status || "").toUpperCase() === "SUBMITTED"
  ));
  if (attempts.length >= Math.max(1, Number(exam.attemptLimit || 1))) {
    return fail("The attempt limit for this exam has already been reached.", { reason: "attempt_limit" });
  }

  credential.failedAttempts = 0;
  credential.lastLoginAt = nowIso();
  credential.updatedAt = credential.lastLoginAt;

  const sessionToken = nanoid(32);
  db.cbtCandidateSessions.unshift({
    id: `cbt-candidate-session-${nanoid(12)}`,
    examId: exam.id,
    credentialId: credential.id,
    candidateType: credential.candidateType,
    candidateId: credential.candidateId,
    loginId: credential.loginId,
    sessionToken,
    createdAt: nowIso(),
    expiresAt: new Date(Date.now() + DEFAULT_SESSION_TTL_MS).toISOString(),
    ipAddress: String(meta.ipAddress || ""),
    userAgent: String(meta.userAgent || ""),
    isConsumed: false,
  });

  createAuditLog(db, {
    examId: exam.id,
    candidateType: credential.candidateType,
    candidateId: credential.candidateId,
    action: "login_success",
    performedByUserId: "",
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    metaJson: {},
  });

  return {
    ok: true,
    exam,
    candidate,
    credential,
    sessionToken,
  };
}

function consumeCandidateSession(db, examId, sessionToken) {
  const session = (db.cbtCandidateSessions || []).find((item) => (
    String(item.examId || "") === String(examId || "")
    && String(item.sessionToken || "") === String(sessionToken || "")
  ));
  if (!session) {
    throw Object.assign(new Error("Candidate session is not valid."), { status: 401 });
  }

  if (Boolean(session.isConsumed)) {
    throw Object.assign(new Error("Candidate session has already been used."), { status: 409 });
  }

  const expiresAt = Date.parse(String(session.expiresAt || ""));
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    throw Object.assign(new Error("Candidate session has expired."), { status: 401 });
  }

  session.isConsumed = true;
  session.consumedAt = nowIso();
  return session;
}

module.exports = {
  CAPTCHA_FAILURE_THRESHOLD,
  CBT_OFFICER_ROLES,
  CBT_WORKFLOW_STATUSES,
  buildCredentialCsv,
  buildCredentialExportRows,
  buildCredentialPdfBuffer,
  buildExamDetail,
  closeExam,
  consumeCandidateSession,
  createAuditLog,
  deriveExamCandidateType,
  ensureCollections,
  formatSchoolDateTime,
  generateCredentials,
  getCachedPlainPassword,
  getExamCandidates,
  getExamCandidateRecords: getExamCandidates,
  getActiveCredential,
  isOfficerRole,
  isTeacherRole,
  normalizeCandidateType,
  normalizeRole,
  normalizeStatus,
  publishExam,
  resetCandidateCredential,
  revokeCandidateCredential,
  summarizeExam,
  syncExamCandidates,
  authenticateCandidateLogin,
};
