
const express = require("express");
const { randomUUID } = require("crypto");
const { auth, requireRole } = require("../middleware/auth");
const { createRateLimiter } = require("../middleware/rateLimit");
const { readDB, writeDB } = require("../lib/jsonStore");
const { storeUploadedFile } = require("../lib/fileStorage");

const router = express.Router();

const CAREER_COLLECTIONS = [
  "careerVacancies",
  "careerApplications",
  "careerAttachments",
  "careerApplicationNotes",
  "careerInterviews",
  "careerStatusLogs",
  "careerAuditLogs",
];

const STAFF_ROLES = ["ADMIN", "SUPER_ADMIN", "HR_OFFICER"];
const VACANCY_STATUSES = ["draft", "published", "closed", "archived"];
const APPLICATION_STATUSES = ["new", "under_review", "shortlisted", "interviewed", "offered", "rejected", "hired", "archived"];
const INTERVIEW_STATUSES = ["scheduled", "completed", "cancelled", "rescheduled"];
const INTERVIEW_MODES = ["physical", "virtual", "phone"];
const CATEGORIES = ["academic_staff", "early_years", "administration", "ict", "finance", "transport", "support_staff"];
const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "temporary"];
const TEACHING_LEVELS = ["Early Years", "Basic", "JSS", "SSS"];
const TRCN_OPTIONS = ["yes", "no", "in_progress"];
const GENDER_OPTIONS = ["male", "female", "prefer_not_to_say"];
const ALLOWED_UPLOAD_TYPES = {
  cv: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  certificate: [
    "application/pdf",
    "image/jpeg",
    "image/png",
  ],
  passport_photo: ["image/jpeg", "image/png"],
  supporting_document: [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
};

const publicLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 6,
  keyPrefix: "careers-public",
  message: "Too many applications or vacancy actions from this device. Please try again later.",
});

function safeString(value) {
  return String(value || "").trim();
}

function safeLower(value) {
  return safeString(value).toLowerCase();
}

function safeNumber(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix) {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

function slugify(value) {
  return safeLower(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "career-role";
}

function ensureOption(value, allowed, fallback) {
  const normalized = safeLower(value);
  return allowed.includes(normalized) ? normalized : fallback;
}

function dateIsPast(value) {
  const safe = safeString(value);
  if (!safe) return false;
  const date = new Date(safe);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now();
}

function ensureCareerCollections(db) {
  for (const key of CAREER_COLLECTIONS) {
    if (!Array.isArray(db[key])) db[key] = [];
  }

  let mutated = false;
  if (db.careerVacancies.length === 0) {
    const publishedAt = nowIso();
    const futureA = new Date();
    futureA.setDate(futureA.getDate() + 28);
    const futureB = new Date();
    futureB.setDate(futureB.getDate() + 21);
    const futureC = new Date();
    futureC.setDate(futureC.getDate() + 35);
    const futureD = new Date();
    futureD.setDate(futureD.getDate() + 18);

    db.careerVacancies.push(
      {
        id: createId("vacancy"),
        vacancyCode: "VAC-0001",
        slug: "mathematics-teacher",
        jobTitle: "Mathematics Teacher",
        department: "Academics",
        category: "academic_staff",
        location: "Main Campus, Owo",
        employmentType: "full_time",
        description: "We are seeking a qualified Mathematics Teacher to support junior and senior secondary learners with clear lesson delivery, strong assessment practice, and consistent student support.",
        requirements: "B.Ed or B.Sc with PGDE; at least 2 years teaching experience; TRCN registration preferred; strong classroom management and digital teaching confidence.",
        responsibilities: "Plan and deliver lessons, mark classwork and assessments, support student growth, contribute to department planning, and use digital learning tools effectively.",
        salaryRange: "Competitive and based on experience",
        applicationDeadline: futureA.toISOString(),
        openingsCount: 2,
        status: "published",
        publishedBy: "u-admin",
        publishedAt,
        createdAt: publishedAt,
        updatedAt: publishedAt,
      },
      {
        id: createId("vacancy"),
        vacancyCode: "VAC-0002",
        slug: "english-language-teacher",
        jobTitle: "English Language Teacher",
        department: "Academics",
        category: "academic_staff",
        location: "Main Campus, Owo",
        employmentType: "full_time",
        description: "Join the English department to build stronger reading, writing, communication, and exam readiness across the school.",
        requirements: "Relevant degree, strong spoken and written English, teaching experience, and good student engagement skills.",
        responsibilities: "Deliver English lessons, review student writing, prepare students for exams, and support literacy initiatives across year groups.",
        salaryRange: "Competitive and based on experience",
        applicationDeadline: futureB.toISOString(),
        openingsCount: 1,
        status: "published",
        publishedBy: "u-admin",
        publishedAt,
        createdAt: publishedAt,
        updatedAt: publishedAt,
      },
      {
        id: createId("vacancy"),
        vacancyCode: "VAC-0003",
        slug: "nursery-class-teacher",
        jobTitle: "Nursery Class Teacher",
        department: "Early Years",
        category: "early_years",
        location: "Main Campus, Owo",
        employmentType: "full_time",
        description: "Support early-years learners in a nurturing classroom that values routine, creativity, safety, and school readiness.",
        requirements: "Early years training or experience, patience, classroom warmth, and confidence with play-based learning approaches.",
        responsibilities: "Guide daily classroom routines, teach foundational skills, communicate with families, and support social development.",
        salaryRange: "Competitive and based on experience",
        applicationDeadline: futureC.toISOString(),
        openingsCount: 2,
        status: "published",
        publishedBy: "u-admin",
        publishedAt,
        createdAt: publishedAt,
        updatedAt: publishedAt,
      },
      {
        id: createId("vacancy"),
        vacancyCode: "VAC-0004",
        slug: "ict-officer",
        jobTitle: "ICT Officer",
        department: "ICT",
        category: "ict",
        location: "Main Campus, Owo",
        employmentType: "full_time",
        description: "Help maintain school systems, user support, digital classroom tools, and core technology operations.",
        requirements: "Relevant ICT qualification, practical support experience, troubleshooting confidence, and strong communication skills.",
        responsibilities: "Support portal systems, maintain devices, assist staff, and help keep digital school operations running smoothly.",
        salaryRange: "Competitive and based on experience",
        applicationDeadline: futureD.toISOString(),
        openingsCount: 1,
        status: "published",
        publishedBy: "u-admin",
        publishedAt,
        createdAt: publishedAt,
        updatedAt: publishedAt,
      }
    );
    mutated = true;
  }

  return mutated;
}

function createVacancyCode(db) {
  return `VAC-${String((db.careerVacancies || []).length + 1).padStart(4, "0")}`;
}

function createApplicationNumber(db) {
  return `APP-${String((db.careerApplications || []).length + 1).padStart(5, "0")}`;
}

function getUsersMap(db) {
  const users = Array.isArray(db.users) ? db.users : [];
  return new Map(users.map((row) => [String(row.id), row]));
}

function logCareerAudit(db, userId, action, targetType, targetId, metadata = {}) {
  db.careerAuditLogs.unshift({
    id: createId("career-audit"),
    userId: safeString(userId),
    action: safeString(action),
    targetType: safeString(targetType),
    targetId: safeString(targetId),
    metadata,
    createdAt: nowIso(),
  });
}

function logApplicationStatus(db, applicationId, oldStatus, newStatus, changedBy, note = "") {
  db.careerStatusLogs.unshift({
    id: createId("career-status"),
    applicationId: safeString(applicationId),
    oldStatus: safeLower(oldStatus),
    newStatus: safeLower(newStatus),
    changedBy: safeString(changedBy),
    note: safeString(note),
    createdAt: nowIso(),
  });
}

function getCareerSetup(db) {
  const departments = Array.from(new Set((db.careerVacancies || []).map((row) => safeString(row.department)).filter(Boolean))).sort();
  const users = Array.isArray(db.users) ? db.users : [];
  const staffOptions = users
    .filter((row) => STAFF_ROLES.includes(String(row.role || "").toUpperCase()))
    .map((row) => ({ id: String(row.id), name: safeString(row.name || row.username), role: safeString(row.role).toUpperCase() }));

  return {
    categories: CATEGORIES,
    employmentTypes: EMPLOYMENT_TYPES,
    teachingLevels: TEACHING_LEVELS,
    trcnOptions: TRCN_OPTIONS,
    genders: GENDER_OPTIONS,
    departments,
    staffOptions,
  };
}

function normalizeVacancy(row) {
  return {
    ...row,
    vacancyCode: safeString(row.vacancyCode),
    jobTitle: safeString(row.jobTitle),
    slug: safeString(row.slug || slugify(row.jobTitle)),
    department: safeString(row.department),
    category: ensureOption(row.category, CATEGORIES, "academic_staff"),
    location: safeString(row.location),
    employmentType: ensureOption(row.employmentType, EMPLOYMENT_TYPES, "full_time"),
    description: safeString(row.description),
    requirements: safeString(row.requirements),
    responsibilities: safeString(row.responsibilities),
    salaryRange: safeString(row.salaryRange),
    applicationDeadline: safeString(row.applicationDeadline),
    openingsCount: Math.max(1, safeNumber(row.openingsCount, 1)),
    status: ensureOption(row.status, VACANCY_STATUSES, "draft"),
    publishedBy: safeString(row.publishedBy),
    publishedAt: safeString(row.publishedAt),
    createdAt: safeString(row.createdAt),
    updatedAt: safeString(row.updatedAt),
  };
}
function buildVacancySummary(db, vacancy) {
  const applications = (db.careerApplications || []).filter((item) => String(item.vacancyId) === String(vacancy.id));
  const shortlistedCount = applications.filter((item) => ["shortlisted", "interviewed", "offered", "hired"].includes(safeLower(item.status))).length;
  const interviewCount = (db.careerInterviews || []).filter((item) => String(item.vacancyId) === String(vacancy.id)).length;

  return {
    ...normalizeVacancy(vacancy),
    applicationsCount: applications.length,
    shortlistedCount,
    interviewsCount: interviewCount,
    isAcceptingApplications: safeLower(vacancy.status) === "published" && !dateIsPast(vacancy.applicationDeadline),
  };
}

function listPublicVacancies(db, query = {}) {
  const search = safeLower(query.search);
  const category = safeLower(query.category);
  const department = safeLower(query.department);
  const employmentType = safeLower(query.employmentType);

  return (db.careerVacancies || [])
    .map((row) => buildVacancySummary(db, row))
    .filter((row) => row.status === "published")
    .filter((row) => (category ? row.category === category : true))
    .filter((row) => (department ? safeLower(row.department) === department : true))
    .filter((row) => (employmentType ? row.employmentType === employmentType : true))
    .filter((row) => {
      if (!search) return true;
      const hay = [row.jobTitle, row.department, row.description, row.location].join(" ").toLowerCase();
      return hay.includes(search);
    })
    .sort((a, b) => String(a.applicationDeadline).localeCompare(String(b.applicationDeadline)));
}

function findVacancyBySlug(db, slug) {
  const safeSlug = safeString(slug);
  return (db.careerVacancies || []).find((row) => safeString(row.slug) === safeSlug) || null;
}

function findVacancyById(db, id) {
  const safeId = safeString(id);
  return (db.careerVacancies || []).find((row) => String(row.id) === safeId) || null;
}

function buildApplicationListItem(db, application) {
  const vacancy = findVacancyById(db, application.vacancyId);
  const latestInterview = (db.careerInterviews || [])
    .filter((row) => String(row.applicationId) === String(application.id))
    .sort((a, b) => String(b.interviewDate || b.createdAt).localeCompare(String(a.interviewDate || a.createdAt)))[0] || null;

  return {
    ...application,
    vacancyTitle: safeString(vacancy?.jobTitle),
    department: safeString(vacancy?.department),
    vacancyStatus: safeString(vacancy?.status),
    latestInterview,
  };
}

function buildApplicationDetail(db, application) {
  const users = getUsersMap(db);
  const vacancy = findVacancyById(db, application.vacancyId);
  const attachments = (db.careerAttachments || []).filter((row) => String(row.applicationId) === String(application.id));
  const notes = (db.careerApplicationNotes || [])
    .filter((row) => String(row.applicationId) === String(application.id))
    .map((row) => ({
      ...row,
      createdByName: safeString(users.get(String(row.createdBy))?.name || users.get(String(row.createdBy))?.username || "Staff"),
    }));
  const interviews = (db.careerInterviews || [])
    .filter((row) => String(row.applicationId) === String(application.id))
    .sort((a, b) => String(b.interviewDate || b.createdAt).localeCompare(String(a.interviewDate || a.createdAt)));
  const statusLogs = (db.careerStatusLogs || [])
    .filter((row) => String(row.applicationId) === String(application.id))
    .map((row) => ({
      ...row,
      changedByName: safeString(users.get(String(row.changedBy))?.name || users.get(String(row.changedBy))?.username || "System"),
    }));

  return {
    ...application,
    vacancy: vacancy ? buildVacancySummary(db, vacancy) : null,
    attachments,
    notes,
    interviews,
    statusLogs,
  };
}

function addAttachment(db, attachment) {
  db.careerAttachments.unshift({
    id: createId("career-file"),
    ...attachment,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
}

function validateUpload(file, attachmentType) {
  if (!file) return;
  const mimeType = safeLower(file.mimeType);
  const allowed = ALLOWED_UPLOAD_TYPES[attachmentType] || [];
  if (!allowed.includes(mimeType)) {
    throw new Error(`Unsupported file type for ${attachmentType.replace(/_/g, " ")}.`);
  }
}

function storeCareerFile(req, applicationId, attachmentType, file) {
  validateUpload(file, attachmentType);
  const stored = storeUploadedFile(req, {
    category: "careers",
    fileName: file.fileName,
    dataUrl: file.dataUrl,
    base64: file.base64,
    mimeType: file.mimeType,
  });

  return {
    applicationId: safeString(applicationId),
    attachmentType,
    fileName: stored.fileName,
    filePath: stored.filePath,
    mimeType: stored.fileMimeType,
    fileSize: stored.fileSize,
  };
}

function ensureStatusTransition(currentStatus, nextStatus) {
  const current = safeLower(currentStatus);
  const next = safeLower(nextStatus);
  if (!APPLICATION_STATUSES.includes(next)) {
    throw new Error("Invalid application status.");
  }
  if (current === "rejected" && !["archived"].includes(next)) {
    throw new Error("Rejected applications can only be archived.");
  }
  if (current === "hired" && !["archived"].includes(next)) {
    throw new Error("Hired applications can only be archived.");
  }
}

router.get("/public/config", (req, res) => {
  const db = readDB();
  const mutated = ensureCareerCollections(db);
  if (mutated) writeDB(db);
  res.json({
    setup: getCareerSetup(db),
  });
});

router.get("/public/overview", (req, res) => {
  const db = readDB();
  const mutated = ensureCareerCollections(db);
  if (mutated) writeDB(db);
  const vacancies = listPublicVacancies(db, {});
  res.json({
    summary: {
      openVacancies: vacancies.length,
      departmentsHiring: Array.from(new Set(vacancies.map((item) => item.department).filter(Boolean))).length,
      teachingRoles: vacancies.filter((item) => ["academic_staff", "early_years"].includes(item.category)).length,
      operationsRoles: vacancies.filter((item) => !["academic_staff", "early_years"].includes(item.category)).length,
    },
    cultureHighlights: [
      "Professional growth and mentoring for staff",
      "A structured school culture with modern teaching tools",
      "A values-driven environment focused on students and teamwork",
      "A growing digital school system across teaching and operations",
    ],
    currentOpportunities: vacancies.slice(0, 6),
    applicationChecklist: [
      "Updated CV in PDF or Word format",
      "Relevant certificates or professional evidence",
      "A short cover letter tailored to the role",
      "Clear phone number and email for follow-up",
    ],
  });
});

router.get("/public/vacancies", (req, res) => {
  const db = readDB();
  const mutated = ensureCareerCollections(db);
  if (mutated) writeDB(db);
  res.json({
    vacancies: listPublicVacancies(db, req.query || {}),
    setup: getCareerSetup(db),
  });
});

router.get("/public/vacancies/:slug", (req, res) => {
  const db = readDB();
  const mutated = ensureCareerCollections(db);
  if (mutated) writeDB(db);

  const vacancy = findVacancyBySlug(db, req.params.slug);
  if (!vacancy || safeLower(vacancy.status) !== "published") {
    return res.status(404).json({ message: "Vacancy not found." });
  }

  const detail = buildVacancySummary(db, vacancy);
  const relatedVacancies = listPublicVacancies(db, { category: detail.category }).filter((item) => String(item.id) !== String(detail.id)).slice(0, 3);

  return res.json({ vacancy: detail, relatedVacancies });
});

router.post("/public/applications", publicLimiter, (req, res) => {
  const db = readDB();
  const mutated = ensureCareerCollections(db);
  if (mutated) writeDB(db);

  const {
    vacancyId,
    fullName,
    phone,
    email,
    gender,
    address,
    highestQualification,
    yearsOfExperience,
    currentEmployer,
    teachingLevel,
    subjectsCanTeach,
    trcnStatus,
    coverLetter,
    cvFile,
    certificateFiles,
    passportPhotoFile,
    supportingFiles,
  } = req.body || {};
  const vacancy = findVacancyById(db, vacancyId);
  if (!vacancy || safeLower(vacancy.status) !== "published") {
    return res.status(404).json({ message: "This vacancy is not available for application." });
  }
  if (dateIsPast(vacancy.applicationDeadline)) {
    return res.status(400).json({ message: "Applications for this role have closed." });
  }
  if (!safeString(fullName) || !safeString(phone) || !safeString(email) || !safeString(highestQualification) || !safeString(coverLetter)) {
    return res.status(400).json({ message: "Full name, phone, email, highest qualification, and cover letter are required." });
  }
  if (!cvFile || !safeString(cvFile.fileName)) {
    return res.status(400).json({ message: "A CV upload is required." });
  }

  const duplicate = (db.careerApplications || []).find((row) =>
    String(row.vacancyId) === String(vacancy.id)
      && safeLower(row.email) === safeLower(email)
  );
  if (duplicate) {
    return res.status(409).json({ message: "An application for this vacancy has already been submitted with this email address." });
  }

  const application = {
    id: createId("application"),
    vacancyId: String(vacancy.id),
    applicationNumber: createApplicationNumber(db),
    fullName: safeString(fullName),
    phone: safeString(phone),
    email: safeString(email),
    gender: ensureOption(gender, GENDER_OPTIONS, "prefer_not_to_say"),
    address: safeString(address),
    highestQualification: safeString(highestQualification),
    yearsOfExperience: safeString(yearsOfExperience),
    currentEmployer: safeString(currentEmployer),
    teachingLevel: safeString(teachingLevel),
    subjectsCanTeach: safeString(subjectsCanTeach),
    trcnStatus: ensureOption(trcnStatus, TRCN_OPTIONS, "no"),
    coverLetter: safeString(coverLetter),
    status: "new",
    submittedAt: nowIso(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  try {
    const cvAttachment = storeCareerFile(req, application.id, "cv", cvFile);
    addAttachment(db, cvAttachment);

    const certificates = Array.isArray(certificateFiles) ? certificateFiles : [];
    for (const file of certificates) {
      if (safeString(file?.fileName)) {
        addAttachment(db, storeCareerFile(req, application.id, "certificate", file));
      }
    }

    if (passportPhotoFile && safeString(passportPhotoFile.fileName)) {
      addAttachment(db, storeCareerFile(req, application.id, "passport_photo", passportPhotoFile));
    }

    const extras = Array.isArray(supportingFiles) ? supportingFiles : [];
    for (const file of extras) {
      if (safeString(file?.fileName)) {
        addAttachment(db, storeCareerFile(req, application.id, "supporting_document", file));
      }
    }
  } catch (error) {
    return res.status(400).json({ message: error.message || "We could not process the uploaded documents." });
  }

  db.careerApplications.unshift(application);
  logApplicationStatus(db, application.id, "", "new", "public", "Application submitted from careers page");
  logCareerAudit(db, "public", "submitted_application", "career_application", application.id, {
    vacancyId: application.vacancyId,
    applicationNumber: application.applicationNumber,
  });
  writeDB(db);

  return res.status(201).json({
    message: "Your application has been received successfully.",
    application: buildApplicationDetail(db, application),
  });
});

router.get("/dashboard", auth(), requireRole("ADMIN", "SUPER_ADMIN", "HR_OFFICER"), (req, res) => {
  const db = readDB();
  const mutated = ensureCareerCollections(db);
  if (mutated) writeDB(db);

  const vacancies = (db.careerVacancies || []).map((row) => buildVacancySummary(db, row));
  const applications = db.careerApplications || [];
  const interviews = db.careerInterviews || [];

  res.json({
    summary: {
      openVacancies: vacancies.filter((row) => row.status === "published").length,
      applicationsReceived: applications.length,
      underReview: applications.filter((row) => safeLower(row.status) === "under_review").length,
      shortlisted: applications.filter((row) => safeLower(row.status) === "shortlisted").length,
      interviewsScheduled: interviews.filter((row) => safeLower(row.interviewStatus) === "scheduled").length,
      hired: applications.filter((row) => safeLower(row.status) === "hired").length,
    },
    recentApplications: applications.slice(0, 8).map((row) => buildApplicationListItem(db, row)),
    upcomingInterviews: interviews
      .slice()
      .sort((a, b) => String(a.interviewDate || a.createdAt).localeCompare(String(b.interviewDate || b.createdAt)))
      .slice(0, 8)
      .map((row) => ({
        ...row,
        applicantName: safeString(applications.find((item) => String(item.id) === String(row.applicationId))?.fullName),
        vacancyTitle: safeString(findVacancyById(db, row.vacancyId)?.jobTitle),
      })),
    setup: getCareerSetup(db),
  });
});

router.get("/setup", auth(), requireRole("ADMIN", "SUPER_ADMIN", "HR_OFFICER"), (req, res) => {
  const db = readDB();
  const mutated = ensureCareerCollections(db);
  if (mutated) writeDB(db);
  res.json({ setup: getCareerSetup(db) });
});

router.get("/vacancies", auth(), requireRole("ADMIN", "SUPER_ADMIN", "HR_OFFICER"), (req, res) => {
  const db = readDB();
  const mutated = ensureCareerCollections(db);
  if (mutated) writeDB(db);
  res.json({
    vacancies: (db.careerVacancies || [])
      .map((row) => buildVacancySummary(db, row))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))),
  });
});

router.post("/vacancies", auth(), requireRole("ADMIN", "SUPER_ADMIN", "HR_OFFICER"), (req, res) => {
  const db = readDB();
  const mutated = ensureCareerCollections(db);
  if (mutated) writeDB(db);

  const {
    jobTitle,
    department,
    category,
    location,
    employmentType,
    description,
    requirements,
    responsibilities,
    salaryRange,
    applicationDeadline,
    openingsCount,
    status,
  } = req.body || {};

  if (!safeString(jobTitle) || !safeString(department) || !safeString(description) || !safeString(applicationDeadline)) {
    return res.status(400).json({ message: "Job title, department, description, and application deadline are required." });
  }

  const nextStatus = ensureOption(status, VACANCY_STATUSES, "draft");
  const vacancy = normalizeVacancy({
    id: createId("vacancy"),
    vacancyCode: createVacancyCode(db),
    slug: slugify(jobTitle),
    jobTitle,
    department,
    category,
    location,
    employmentType,
    description,
    requirements,
    responsibilities,
    salaryRange,
    applicationDeadline,
    openingsCount,
    status: nextStatus,
    publishedBy: ["published", "closed"].includes(nextStatus) ? req.user?.id : "",
    publishedAt: nextStatus === "published" ? nowIso() : "",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });

  db.careerVacancies.unshift(vacancy);
  logCareerAudit(db, req.user?.id, nextStatus === "published" ? "published_vacancy" : "created_vacancy", "career_vacancy", vacancy.id, {
    vacancyCode: vacancy.vacancyCode,
    title: vacancy.jobTitle,
  });
  writeDB(db);

  return res.status(201).json({ vacancy: buildVacancySummary(db, vacancy) });
});
router.patch("/vacancies/:id", auth(), requireRole("ADMIN", "SUPER_ADMIN", "HR_OFFICER"), (req, res) => {
  const db = readDB();
  const mutated = ensureCareerCollections(db);
  if (mutated) writeDB(db);

  const idx = (db.careerVacancies || []).findIndex((row) => String(row.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ message: "Vacancy not found." });

  const current = db.careerVacancies[idx];
  const nextStatus = req.body.status ? ensureOption(req.body.status, VACANCY_STATUSES, current.status) : current.status;
  const updated = normalizeVacancy({
    ...current,
    ...req.body,
    slug: req.body.jobTitle ? slugify(req.body.jobTitle) : current.slug,
    status: nextStatus,
    publishedBy: nextStatus === "published" ? safeString(current.publishedBy || req.user?.id) : current.publishedBy,
    publishedAt: nextStatus === "published" ? safeString(current.publishedAt || nowIso()) : current.publishedAt,
    updatedAt: nowIso(),
  });

  db.careerVacancies[idx] = updated;
  logCareerAudit(db, req.user?.id, "updated_vacancy", "career_vacancy", updated.id, {
    status: updated.status,
    title: updated.jobTitle,
  });
  writeDB(db);

  return res.json({ vacancy: buildVacancySummary(db, updated) });
});

router.get("/applications", auth(), requireRole("ADMIN", "SUPER_ADMIN", "HR_OFFICER"), (req, res) => {
  const db = readDB();
  const mutated = ensureCareerCollections(db);
  if (mutated) writeDB(db);

  const search = safeLower(req.query.search);
  const status = safeLower(req.query.status);
  const vacancyId = safeString(req.query.vacancyId);
  const department = safeLower(req.query.department);
  const tab = safeLower(req.query.tab);

  const applications = (db.careerApplications || [])
    .filter((row) => (status ? safeLower(row.status) === status : true))
    .filter((row) => (vacancyId ? String(row.vacancyId) === vacancyId : true))
    .filter((row) => {
      if (!department) return true;
      const vacancy = findVacancyById(db, row.vacancyId);
      return safeLower(vacancy?.department) === department;
    })
    .filter((row) => {
      if (tab === "shortlisted") return ["shortlisted", "interviewed", "offered", "hired"].includes(safeLower(row.status));
      return true;
    })
    .filter((row) => {
      if (!search) return true;
      const vacancy = findVacancyById(db, row.vacancyId);
      const hay = [row.fullName, row.email, row.phone, row.applicationNumber, vacancy?.jobTitle, row.subjectsCanTeach].join(" ").toLowerCase();
      return hay.includes(search);
    })
    .map((row) => buildApplicationListItem(db, row))
    .sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)));

  res.json({
    applications,
    vacancyOptions: (db.careerVacancies || []).map((row) => ({ id: row.id, label: row.jobTitle, status: row.status })),
    setup: getCareerSetup(db),
  });
});

router.get("/applications/:id", auth(), requireRole("ADMIN", "SUPER_ADMIN", "HR_OFFICER"), (req, res) => {
  const db = readDB();
  const mutated = ensureCareerCollections(db);
  if (mutated) writeDB(db);
  const application = (db.careerApplications || []).find((row) => String(row.id) === String(req.params.id));
  if (!application) return res.status(404).json({ message: "Application not found." });
  res.json({ application: buildApplicationDetail(db, application) });
});

router.patch("/applications/:id/status", auth(), requireRole("ADMIN", "SUPER_ADMIN", "HR_OFFICER"), (req, res) => {
  const db = readDB();
  const mutated = ensureCareerCollections(db);
  if (mutated) writeDB(db);

  const idx = (db.careerApplications || []).findIndex((row) => String(row.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ message: "Application not found." });

  const current = db.careerApplications[idx];
  const nextStatus = safeLower(req.body.status);
  const note = safeString(req.body.note);

  try {
    ensureStatusTransition(current.status, nextStatus);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }

  db.careerApplications[idx] = {
    ...current,
    status: nextStatus,
    updatedAt: nowIso(),
  };
  logApplicationStatus(db, current.id, current.status, nextStatus, req.user?.id, note);
  logCareerAudit(db, req.user?.id, `${nextStatus}_application`, "career_application", current.id, {
    previousStatus: current.status,
    nextStatus,
  });
  writeDB(db);

  return res.json({ application: buildApplicationDetail(db, db.careerApplications[idx]) });
});

router.post("/applications/:id/notes", auth(), requireRole("ADMIN", "SUPER_ADMIN", "HR_OFFICER"), (req, res) => {
  const db = readDB();
  const mutated = ensureCareerCollections(db);
  if (mutated) writeDB(db);
  const application = (db.careerApplications || []).find((row) => String(row.id) === String(req.params.id));
  if (!application) return res.status(404).json({ message: "Application not found." });
  const note = safeString(req.body.note);
  if (!note) return res.status(400).json({ message: "A note is required." });

  db.careerApplicationNotes.unshift({
    id: createId("career-note"),
    applicationId: application.id,
    note,
    createdBy: safeString(req.user?.id),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  logCareerAudit(db, req.user?.id, "added_application_note", "career_application", application.id, {});
  writeDB(db);

  return res.status(201).json({ application: buildApplicationDetail(db, application) });
});

router.get("/interviews", auth(), requireRole("ADMIN", "SUPER_ADMIN", "HR_OFFICER"), (req, res) => {
  const db = readDB();
  const mutated = ensureCareerCollections(db);
  if (mutated) writeDB(db);
  const interviews = (db.careerInterviews || [])
    .map((row) => ({
      ...row,
      applicantName: safeString((db.careerApplications || []).find((item) => String(item.id) === String(row.applicationId))?.fullName),
      vacancyTitle: safeString(findVacancyById(db, row.vacancyId)?.jobTitle),
    }))
    .sort((a, b) => String(a.interviewDate || a.createdAt).localeCompare(String(b.interviewDate || b.createdAt)));

  res.json({ interviews });
});
router.post("/applications/:id/interviews", auth(), requireRole("ADMIN", "SUPER_ADMIN", "HR_OFFICER"), (req, res) => {
  const db = readDB();
  const mutated = ensureCareerCollections(db);
  if (mutated) writeDB(db);
  const application = (db.careerApplications || []).find((row) => String(row.id) === String(req.params.id));
  if (!application) return res.status(404).json({ message: "Application not found." });

  const { interviewDate, interviewTime, interviewMode, interviewerName, interviewNote } = req.body || {};
  if (!safeString(interviewDate) || !safeString(interviewTime) || !safeString(interviewerName)) {
    return res.status(400).json({ message: "Interview date, time, and interviewer are required." });
  }

  const interview = {
    id: createId("career-interview"),
    applicationId: application.id,
    vacancyId: application.vacancyId,
    interviewDate: safeString(interviewDate),
    interviewTime: safeString(interviewTime),
    interviewMode: ensureOption(interviewMode, INTERVIEW_MODES, "physical"),
    interviewerName: safeString(interviewerName),
    interviewStatus: "scheduled",
    interviewNote: safeString(interviewNote),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  db.careerInterviews.unshift(interview);
  if (["new", "under_review"].includes(safeLower(application.status))) {
    logApplicationStatus(db, application.id, application.status, "shortlisted", req.user?.id, "Interview scheduled");
    application.status = "shortlisted";
    application.updatedAt = nowIso();
  }
  logCareerAudit(db, req.user?.id, "scheduled_interview", "career_interview", interview.id, {
    applicationId: application.id,
    vacancyId: application.vacancyId,
  });
  writeDB(db);

  return res.status(201).json({ interview, application: buildApplicationDetail(db, application) });
});

router.patch("/interviews/:id", auth(), requireRole("ADMIN", "SUPER_ADMIN", "HR_OFFICER"), (req, res) => {
  const db = readDB();
  const mutated = ensureCareerCollections(db);
  if (mutated) writeDB(db);
  const idx = (db.careerInterviews || []).findIndex((row) => String(row.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ message: "Interview not found." });

  const current = db.careerInterviews[idx];
  const nextStatus = req.body.interviewStatus ? ensureOption(req.body.interviewStatus, INTERVIEW_STATUSES, current.interviewStatus) : current.interviewStatus;
  const updated = {
    ...current,
    ...req.body,
    interviewMode: req.body.interviewMode ? ensureOption(req.body.interviewMode, INTERVIEW_MODES, current.interviewMode) : current.interviewMode,
    interviewStatus: nextStatus,
    updatedAt: nowIso(),
  };
  db.careerInterviews[idx] = updated;

  const application = (db.careerApplications || []).find((row) => String(row.id) === String(current.applicationId));
  if (application && nextStatus === "completed" && ["shortlisted", "under_review", "new"].includes(safeLower(application.status))) {
    logApplicationStatus(db, application.id, application.status, "interviewed", req.user?.id, "Interview completed");
    application.status = "interviewed";
    application.updatedAt = nowIso();
  }

  logCareerAudit(db, req.user?.id, "updated_interview", "career_interview", updated.id, { interviewStatus: updated.interviewStatus });
  writeDB(db);

  return res.json({ interview: updated });
});

router.get("/reports", auth(), requireRole("ADMIN", "SUPER_ADMIN", "HR_OFFICER"), (req, res) => {
  const db = readDB();
  const mutated = ensureCareerCollections(db);
  if (mutated) writeDB(db);

  const vacancies = (db.careerVacancies || []).map((row) => buildVacancySummary(db, row));
  const applications = db.careerApplications || [];
  const countsByStatus = APPLICATION_STATUSES.reduce((acc, key) => {
    acc[key] = applications.filter((row) => safeLower(row.status) === key).length;
    return acc;
  }, {});

  const applicationsByVacancy = vacancies.map((vacancy) => ({
    vacancyId: vacancy.id,
    jobTitle: vacancy.jobTitle,
    department: vacancy.department,
    status: vacancy.status,
    applications: vacancy.applicationsCount,
    shortlisted: vacancy.shortlistedCount,
    hires: applications.filter((row) => String(row.vacancyId) === String(vacancy.id) && safeLower(row.status) === "hired").length,
  }));

  const byDepartmentMap = new Map();
  for (const vacancy of vacancies) {
    const department = safeString(vacancy.department || "General");
    const current = byDepartmentMap.get(department) || { department, vacancies: 0, applications: 0, shortlisted: 0, hires: 0 };
    current.vacancies += 1;
    current.applications += vacancy.applicationsCount;
    current.shortlisted += vacancy.shortlistedCount;
    current.hires += applications.filter((row) => String(row.vacancyId) === String(vacancy.id) && safeLower(row.status) === "hired").length;
    byDepartmentMap.set(department, current);
  }

  res.json({
    summary: {
      totalVacancies: vacancies.length,
      activeVacancies: vacancies.filter((item) => item.status === "published").length,
      totalApplications: applications.length,
      shortlisted: countsByStatus.shortlisted + countsByStatus.interviewed + countsByStatus.offered + countsByStatus.hired,
      rejected: countsByStatus.rejected,
      hired: countsByStatus.hired,
      interviewsScheduled: (db.careerInterviews || []).filter((row) => safeLower(row.interviewStatus) === "scheduled").length,
    },
    applicationsByVacancy,
    byDepartment: Array.from(byDepartmentMap.values()),
    statusBreakdown: countsByStatus,
  });
});

module.exports = router;
