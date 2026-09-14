const fs = require("fs");
const path = require("path");
const { normalizeSubject, normalizeSubjectList } = require("./subjects");
const { hashPasswordSync, isPasswordHash } = require("./passwords");

const DEFAULT_DB_PATH = path.join(__dirname, "..", "db.json");

function envValue(name) {
  return String(process.env[name] || "").trim();
}

function resolveDbPath() {
  const configuredPath = String(process.env.JSON_DB_PATH || process.env.AMS_JSON_DB_PATH || "").trim();
  if (!configuredPath) return DEFAULT_DB_PATH;
  return path.resolve(configuredPath);
}

function ensureDbFileExists(dbPath) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify(defaultDB(), null, 2));
  }
}

function buildInitialUsers() {
  const bootstrapUsername = envValue("BOOTSTRAP_ADMIN_USERNAME");
  const bootstrapPassword = envValue("BOOTSTRAP_ADMIN_PASSWORD");
  if (!bootstrapUsername || !bootstrapPassword) return [];

  return [
    {
      id: envValue("BOOTSTRAP_ADMIN_ID") || "u-bootstrap-admin",
      name: envValue("BOOTSTRAP_ADMIN_NAME") || "Bootstrap Admin",
      username: bootstrapUsername,
      password: hashPasswordSync(bootstrapPassword),
      role: "ADMIN",
      status: "active",
      mustChangePassword: true,
      phone: "",
      subjects: [],
      studentId: "",
      studentIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ];
}

function defaultDB() {
  return {
    users: buildInitialUsers(),
    students: [],
    results: [],
    classes: [],
    reports: [],
    termLocks: [],
    continuousAssessments: [],
    assessmentSettings: [],
    continuousAssessmentGradingScales: [],
    resultApprovals: [],
    resultPublicationStatus: [],
    attendance: [],
    attendanceSessions: [],
    attendanceRecords: [],
    exams: [
      { id: "exam-1", title: "Mathematics Mock CBT" },
      { id: "exam-2", title: "English Entrance Practice" }
    ],
    cbtQuestionBank: [],
    cbtExams: [],
    cbtAttempts: [],
    courses: [
      { id: "course-1", title: "Mathematics - Primary 3" },
      { id: "course-2", title: "English Language - JSS 1" }
    ],
    homeworks: [
      {
        id: "hw-1",
        type: "HOMEWORK",
        taskType: "homework",
        title: "Math Assignment 1",
        instructions: "",
        classId: "",
        className: "",
        subject: "Mathematics",
        dueDate: "",
        availableFrom: "",
        submissionType: "text",
        allowLateSubmission: true,
        lateSubmissionDeadline: "",
        isGraded: true,
        maxScore: 20,
        status: "published",
        attachments: [],
        createdBy: "u-teacher-math",
        createdByName: "Math Teacher",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "hw-2",
        type: "ASSIGNMENT",
        taskType: "assignment",
        title: "Essay Writing Task",
        instructions: "",
        classId: "",
        className: "",
        subject: "English Language",
        dueDate: "",
        availableFrom: "",
        submissionType: "text",
        allowLateSubmission: true,
        lateSubmissionDeadline: "",
        isGraded: true,
        maxScore: 20,
        status: "published",
        attachments: [],
        createdBy: "u-teacher-english",
        createdByName: "English Teacher",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ],
    submissions: [],
    assignmentAttachments: [],
    assignmentComments: [],
    assignmentReminders: [],
    assignmentMetricsSnapshots: [],
    books: [
      { id: "book-1", name: "Basic Science Textbook" },
      { id: "book-2", name: "English Grammar Guide" }
    ],
    smsLogs: [],
    smsTemplates: [],
    smsCampaigns: [],
    smsMessages: [],
    smsProviderLogs: [],
    smsBalanceLogs: [],
    accountProvisioningLogs: [],
    userActivityLogs: [],
    admissions: [],
    contactEnquiries: [],
    donations: [],
    donationCampaigns: [],
    donationWebhookLogs: [],
    donationEmailLogs: [],
    donationAuditLogs: [],
    enquiryReplies: [],
    enquiryStatusLogs: [],
    callbackRequests: [],
    visitRequests: [],
    enquiryAssignments: [],
    enquiryAttachments: [],
    enquiryTemplates: [],
    enquiryAuditLogs: [],
    activities: [],
    activityComments: [],
    siteRoleProfiles: [],
    feeInvoices: [],
    payments: [],
    gradingPolicies: [],
    assessmentComponents: [],
    gradeScales: [],
    classSubjectOfferings: [],
    scoreSheets: [],
    studentScores: [],
    computedResults: [],
    termResultSummaries: [],
    resultApprovals: [],
    gradingLogs: [],
    promotionPolicies: [],
    promotionPolicySubjectRules: [],
    annualResultSummaries: [],
    promotionDecisions: [],
    classProgressionMap: [],
    promotionBatches: [],
    promotionBatchItems: [],
    studentClassHistory: [],
    promotionLogs: [],
    teacherAnalyticsSnapshots: [],
    teacherPerformanceFlags: [],
    teacherTargets: [],
    teacherFeedbackNotes: [],
    teacherWorkloadSnapshots: [],
    teacherMetricTrends: [],
    analyticsJobsLog: [],
    teacherAnalyticsExports: [],
    broadsheetSnapshots: [],
    broadsheetSnapshotItems: [],
    broadsheetLogs: [],
    financeAccounts: [],
    financeTransactions: [],
    financeStudentFees: [],
    financePayments: [],
    financeExpenses: [],
    financePurchases: [],
    financeStaffSalaries: [],
    financeSalaryPayments: [],
    financeIncome: [],
    financeBudgets: [],
    financialReports: [],
    financeSettings: {
      currency: "NGN",
      paymentMethods: ["cash", "transfer", "online"],
      expenseCategories: ["utilities", "maintenance", "supplies", "operations", "transport", "fuel", "repairs", "general"],
      accountTypes: ["asset", "liability", "income", "expense", "equity"],
      activeSessionId: "",
      activeTermId: "",
    },
    financeFeeStructures: [],
    financeStudentProfiles: [],
    careerVacancies: [],
    careerApplications: [],
    careerAttachments: [],
    careerApplicationNotes: [],
    careerInterviews: [],
    careerStatusLogs: [],
    careerAuditLogs: [],
    transportVehicles: [],
    transportDrivers: [],
    transportRoutes: [],
    transportStops: [],
    studentTransportAssignments: [],
    transportTripLogs: [],
    transportTripStudentLogs: [],
    transportIncidents: [],
    transportFeeAssignments: [],
    vehicleMaintenanceLogs: [],
    transportAuditLogs: [],
    transportNotifications: [],
    schemeOfWorkSessions: [],
    schemeOfWorkTerms: [],
    schemeOfWorkWeeks: [],
    schemeOfWorkAttachments: [],
    schemeOfWorkApprovals: [],
    schemeOfWorkProgressLogs: [],
    lessonNotes: [],
    lessonNoteReviews: [],
    curriculumFrameworks: [],
    curriculumFrameworkVersions: [],
    curriculumTerms: [],
    curriculumWeeks: [],
    curriculumItems: [],
    curriculumTeacherPlans: [],
    curriculumDailyTeachingRecords: [],
    curriculumWeeklyPlanReviews: [],
    curriculumPlanAmendments: [],
    curriculumImportBatches: [],
    curriculumAuditLogs: [],
    curriculumSessionAssignments: [],
    curriculumDevelopmentalJourneys: [],
    earlyYearsObservations: [],
    earlyYearsLearningJournalEntries: [],
    earlyYearsChildProfiles: [],
    earlyYearsDevelopmentSummaries: [],
    earlyYearsNextSteps: [],
    earlyYearsParentContributions: [],
    earlyYearsAssessmentAuditLogs: [],
    earlyYearsEvidenceRecords: [],
    eyfsObservations: [],
    earlyYearsPhonicsProgrammes: [],
    earlyYearsPhonicsTeachingUnits: [],
    earlyYearsPhonicsProgress: [],
    earlyYearsDecodableBooks: [],
    earlyYearsDecodableReadingRecords: [],
    earlyYearsReadingRecords: [],
    earlyYearsWritingRecords: [],
    earlyYearsLiteracySupportPlans: [],
    earlyYearsLiteracySummaries: [],
    earlyYearsHomeReadingRecords: [],
    earlyYearsLiteracyParentUpdates: [],
    earlyYearsLiteracyAuditLogs: [],
    earlyYearsProvisionAreas: [],
    earlyYearsWeeklyProvisionEnhancements: [],
    earlyYearsPracticalLifeActivities: [],
    earlyYearsPracticalLifeAssignments: [],
    earlyYearsEnvironmentChecklists: [],
    earlyYearsEnvironmentActions: [],
    earlyYearsResources: [],
    earlyYearsResourceRequests: [],
    earlyYearsEnvironmentReviews: [],
    earlyYearsDisplayReviews: [],
    earlyYearsEnvironmentAuditLogs: [],
    earlyYearsSupportProfiles: [],
    earlyYearsSupportConcerns: [],
    earlyYearsSupportPlans: [],
    earlyYearsSupportPlanReviews: [],
    earlyYearsSupportStrategies: [],
    earlyYearsReferralRecords: [],
    earlyYearsProfessionalRecords: [],
    earlyYearsParentPartnershipProfiles: [],
    earlyYearsParentPartnershipMeetings: [],
    earlyYearsParentSupportSummaries: [],
    earlyYearsConsentRecords: [],
    earlyYearsTransitionSupportPlans: [],
    earlyYearsInclusionAuditLogs: [],
    earlyYearsReports: [],
    earlyYearsReportAreas: [],
    earlyYearsReportEvidenceLinks: [],
    earlyYearsReportTemplates: [],
    earlyYearsReportAuditLogs: [],
    receptionEyfsReferences: [],
    receptionSchoolReadinessProfiles: [],
    receptionBasicOneTransitionProfiles: [],
    earlyYearsReportHandoverAcknowledgements: [],
    earlyYearsQAActions: [],
    earlyYearsQAModerationRecords: [],
    earlyYearsQALeadershipNotes: [],
    earlyYearsQAEnvironmentWalks: [],
    earlyYearsQAAuditLogs: [],
    earlyYearsQAAuditRuns: [],
    earlyYearsQAMilestones: [],
    lmsVirtualClasses: [],
    lmsVirtualClassJoins: [],
    lmsVirtualNotifications: [],
    lmsVirtualReminderLogs: [],
    lmsVirtualEmailLogs: []
  };
}

function normalizeStudentIds(value) {
  const list = Array.isArray(value) ? value : [];
  const out = [];
  const seen = new Set();

  for (const item of list) {
    const id = String(item || "").trim();
    if (!id) continue;
    const key = id.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(id);
  }

  return out;
}

function splitNameParts(value) {
  const full = String(value || "").trim();
  if (!full) return { firstName: "", lastName: "" };
  const parts = full.split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : "",
  };
}

function normalizeTaskType(value) {
  const key = String(value || "HOMEWORK").trim().toUpperCase();
  if (key === "ASSIGNMENT") return { taskType: "assignment", type: "ASSIGNMENT" };
  if (key === "PROJECT") return { taskType: "project", type: "PROJECT" };
  if (key === "PRACTICE") return { taskType: "practice", type: "PRACTICE" };
  return { taskType: "homework", type: "HOMEWORK" };
}

function ensureShape(db) {
  let mutated = false;
  const base = defaultDB();

  for (const [key, value] of Object.entries(base)) {
    if (Array.isArray(value) && !Array.isArray(db[key])) {
      db[key] = value;
      mutated = true;
    }
  }

  if (Array.isArray(db.users)) {
    db.users = db.users.map((user) => {
      const role = String(user.role || "").toUpperCase();
      const normalizedSubjects = normalizeSubjectList(user.subjects || []).subjects;
      const rawPassword = String(user.password || "");
      const normalizedPassword = rawPassword
        ? (isPasswordHash(rawPassword) ? rawPassword : hashPasswordSync(rawPassword))
        : "";

      if (rawPassword && rawPassword !== normalizedPassword) {
        mutated = true;
      }

      const normalizedStatus = String(user.status || "active").toLowerCase();
      return {
        ...user,
        role,
        password: normalizedPassword,
        status: ["active", "inactive", "suspended", "archived"].includes(normalizedStatus) ? normalizedStatus : "active",
        mustChangePassword: user.mustChangePassword !== false,
        lastLoginAt: String(user.lastLoginAt || "").trim(),
        phone: String(user.phone || "").trim(),
        subjects: role === "TEACHER" ? normalizedSubjects : [],
        studentId: role === "STUDENT" ? String(user.studentId || "").trim() : "",
        studentIds: role === "PARENT" ? normalizeStudentIds(user.studentIds) : []
      };
    });
  }

  if (Array.isArray(db.students)) {
    db.students = db.students.map((item) => {
      const derived = splitNameParts(item.name);
      const firstName = String(item.firstName || "").trim() || derived.firstName;
      const lastName = String(item.lastName || "").trim() || derived.lastName;
      return {
        ...item,
        name: [firstName, lastName].filter(Boolean).join(" ").trim() || String(item.name || "").trim(),
        firstName,
        lastName,
        studentPhone: String(item.studentPhone || "").trim(),
        parentPhone: String(item.parentPhone || "").trim(),
      };
    });
  }

  if (Array.isArray(db.homeworks)) {
    db.homeworks = db.homeworks.map((item) => {
      const canonical = normalizeSubject(item.subject);
      const normalizedType = normalizeTaskType(item.type || item.taskType);
      return {
        ...item,
        type: normalizedType.type,
        taskType: normalizedType.taskType,
        subject: canonical || item.subject,
        classId: String(item.classId || ""),
        className: String(item.className || ""),
        instructions: String(item.instructions || ""),
        topic: String(item.topic || ""),
        lesson: String(item.lesson || ""),
        availableFrom: String(item.availableFrom || ""),
        dueDate: String(item.dueDate || ""),
        submissionType: String(item.submissionType || "text").toLowerCase(),
        allowLateSubmission: item.allowLateSubmission !== false,
        lateSubmissionDeadline: String(item.lateSubmissionDeadline || ""),
        isGraded: item.isGraded !== false,
        maxScore: Number.isFinite(Number(item.maxScore)) ? Number(item.maxScore) : 20,
        status: String(item.status || "published").toLowerCase(),
        attachments: Array.isArray(item.attachments)
          ? item.attachments.map((attachment) => ({
              id: String(attachment.id || ""),
              fileTitle: String(attachment.fileTitle || ""),
              filePath: String(attachment.filePath || ""),
              mimeType: String(attachment.mimeType || ""),
              fileSize: Number(attachment.fileSize || 0),
            }))
          : [],
        updatedAt: String(item.updatedAt || item.createdAt || new Date().toISOString()),
      };
    });
  }

  if (Array.isArray(db.submissions)) {
    db.submissions = db.submissions.map((item) => ({
      ...item,
      assignmentId: String(item.assignmentId || item.homeworkId || ""),
      homeworkId: String(item.homeworkId || item.assignmentId || ""),
      studentId: String(item.studentId || ""),
      studentName: String(item.studentName || ""),
      studentUserId: String(item.studentUserId || ""),
      submissionText: String(item.submissionText || item.content || ""),
      filePath: String(item.filePath || ""),
      content: String(item.content || item.submissionText || ""),
      status: String(item.status || "submitted").toLowerCase(),
      score: item.score == null ? null : Number(item.score),
      feedback: String(item.feedback || ""),
      isLate: Boolean(item.isLate),
      gradedBy: String(item.gradedBy || item.reviewedBy || ""),
      gradedAt: String(item.gradedAt || item.reviewedAt || ""),
      submittedAt: String(item.submittedAt || item.updatedAt || ""),
      updatedAt: String(item.updatedAt || item.submittedAt || ""),
      createdAt: String(item.createdAt || item.submittedAt || item.updatedAt || ""),
    }));
  }

  return { db, mutated };
}

function readDB() {
  const dbPath = resolveDbPath();
  ensureDbFileExists(dbPath);

  const parsed = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
  const { db, mutated } = ensureShape(parsed);

  if (mutated) {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
  }

  return db;
}

function writeDB(db) {
  const dbPath = resolveDbPath();
  ensureDbFileExists(dbPath);
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

module.exports = { readDB, writeDB, resolveDbPath };













