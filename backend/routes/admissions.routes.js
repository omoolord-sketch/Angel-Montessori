
const express = require("express");
const jwt = require("jsonwebtoken");
const { nanoid } = require("nanoid");
const { readDB, writeDB } = require("../lib/jsonStore");
const { auth, requireRole } = require("../middleware/auth");
const { hashPassword } = require("../lib/passwords");
const { hasSuccessfulApplicationFeePayment } = require("../lib/paymentStore");
const {
  ensureAcademicScope,
  ensureAcademicSession,
  buildAdmissionSessionRow,
  syncAcademicMirrors,
  normalizeSessionName,
} = require("../lib/academicScope");
const { ACTIVE_CLASS_CONFIGS, getLegacyClassMapping } = require("../lib/academicSystems");

const router = express.Router();
const ADMISSIONS_ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN", "ADMISSION_OFFICER"];

const ADMISSION_STATUSES = [
  "REGISTERED",
  "IN_PROGRESS",
  "SUBMITTED",
  "UNDER_REVIEW",
  "SHORTLISTED",
  "SCREENING_SCHEDULED",
  "SCREENING_COMPLETED",
  "ADMITTED",
  "WAITLISTED",
  "REJECTED",
  "ENROLLED",
];

function randomTemporaryPassword() {
  return `Tmp@${nanoid(10)}`;
}

const LEGACY_STATUS_MAP = {
  DRAFT: "REGISTERED",
  NEW: "SUBMITTED",
  CONTACTED: "UNDER_REVIEW",
  SCREENING_DONE: "SCREENING_COMPLETED",
  OFFERED: "ADMITTED",
  ACCEPTED: "ADMITTED",
  ADMITTED: "ENROLLED",
  DECLINED: "REJECTED",
};

const BASE_CLASS_OPTIONS = ACTIVE_CLASS_CONFIGS.map((item) => ({
  id: item.id,
  className: item.name,
  section: item.section,
  capacity: item.level === "EARLY_YEARS" ? 35 : item.level === "PRIMARY" ? 40 : 45,
  formFee: item.level === "SENIOR_SECONDARY" ? 15000 : item.level === "EARLY_YEARS" ? 5000 : 10000,
  status: "OPEN",
  level: item.level,
  academicSystem: item.academicSystem,
  curriculumFramework: item.curriculumFramework,
  assessmentFramework: item.assessmentFramework,
}));

const DEFAULT_FAQ = [
  {
    question: "How much is the admission application fee?",
    answer: "Application fee depends on active admission settings and is shown on the application dashboard.",
  },
  {
    question: "Can I save and continue later?",
    answer: "Yes. Your form is auto-saved as draft so you can continue anytime before final submission.",
  },
  {
    question: "Can I edit after final submission?",
    answer: "After submission, editing is locked. Admissions can reopen your application if correction is required.",
  },
  {
    question: "How will I know my admission status?",
    answer: "Login to the applicant dashboard to view timeline updates for review, screening, decision, and enrollment.",
  },
  {
    question: "Can I pay online?",
    answer: "Yes. Application fee is paid online and verified before final submission.",
  },
];

const DOCUMENT_KEYS = [
  "passportPhotoUrl",
  "birthCertificateUrl",
  "previousResultUrl",
  "testimonialUrl",
  "transferLetterUrl",
  "immunizationCardUrl",
];

const APPLICATION_FEE_DEFAULT = Number(process.env.APPLICATION_FEE_DEFAULT || 2000);
const ACCEPTANCE_FEE_DEFAULT = Number(process.env.ADMISSION_ACCEPTANCE_FEE_DEFAULT || 25000);

function nowIso() {
  return new Date().toISOString();
}

function todayIsoDate() {
  return nowIso().slice(0, 10);
}

function str(value) {
  return String(value || "").trim();
}

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function bool(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  const raw = str(value).toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(raw)) return true;
  if (["false", "0", "no", "n", "off"].includes(raw)) return false;
  return fallback;
}

function obj(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function normalizeClassId(value) {
  return str(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeClassKey(value) {
  return str(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function splitName(value) {
  const full = str(value);
  if (!full) return { firstName: "", lastName: "" };
  const parts = full.split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : "",
  };
}

function joinName(firstName, lastName) {
  return [str(firstName), str(lastName)].filter(Boolean).join(" ").trim();
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    phone: user.phone || "",
    subjects: user.subjects || [],
    studentId: user.studentId || "",
    studentIds: user.studentIds || [],
  };
}

function toTitle(value) {
  const s = str(value);
  if (!s) return "";
  return s
    .split(/\s+/)
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1).toLowerCase())
    .join(" ");
}

function normalizeStatusInput(value) {
  const raw = str(value).toUpperCase();
  return LEGACY_STATUS_MAP[raw] || raw;
}

function normalizeStatus(value) {
  const next = normalizeStatusInput(value);
  return ADMISSION_STATUSES.includes(next) ? next : "REGISTERED";
}

function getCurrentAcademicSessionLabel() {
  const now = new Date();
  const year = now.getFullYear();
  const next = year + 1;
  return `${year}/${next}`;
}

function getDefaultAdmissionSessions() {
  const now = new Date();
  const year = now.getFullYear();
  return [
    {
      id: `admission-${year}-${year + 1}`,
      title: `${year}/${year + 1} Admission`,
      academicSession: `${year}/${year + 1}`,
      startDate: `${year}-03-01`,
      endDate: `${year}-09-30`,
      applicationFee: APPLICATION_FEE_DEFAULT,
      acceptanceFee: ACCEPTANCE_FEE_DEFAULT,
      status: "OPEN",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  ];
}

function normalizeSession(row) {
  const safe = obj(row);
  const title = str(safe.title || safe.sessionTitle || safe.academicSession || "");
  const academicSession = str(safe.academicSession || title || getCurrentAcademicSessionLabel());
  const now = nowIso();
  return {
    id: str(safe.id) || `admission-${academicSession.replace(/[^0-9]/g, "") || Date.now()}`,
    title: title || `${academicSession} Admission`,
    academicSession,
    startDate: str(safe.startDate) || todayIsoDate(),
    endDate: str(safe.endDate),
    applicationFee: num(safe.applicationFee, APPLICATION_FEE_DEFAULT),
    acceptanceFee: num(safe.acceptanceFee, ACCEPTANCE_FEE_DEFAULT),
    status: str(safe.status || "OPEN").toUpperCase() === "CLOSED" ? "CLOSED" : "OPEN",
    createdAt: str(safe.createdAt) || now,
    updatedAt: str(safe.updatedAt) || now,
  };
}

function normalizeAdmissionClass(row) {
  const safe = obj(row);
  const className = str(safe.className || safe.name);
  const legacy = getLegacyClassMapping(className);
  const now = nowIso();
  return {
    id: str(safe.id) || normalizeClassId(className),
    className,
    section: str(safe.section) || "Other",
    level: str(safe.level) || "BASIC",
    capacity: num(safe.capacity, 0),
    formFee: num(safe.formFee, 0),
    status: legacy || str(safe.status || "OPEN").toUpperCase() === "CLOSED" ? "CLOSED" : "OPEN",
    legacyStatus: legacy ? "historical_only" : str(safe.legacyStatus),
    legacyTargetClassId: legacy?.targetClassId || str(safe.legacyTargetClassId),
    legacyTargetClassName: legacy?.targetClassName || str(safe.legacyTargetClassName),
    requiredDocuments: Array.isArray(safe.requiredDocuments) ? safe.requiredDocuments.map((item) => str(item)).filter(Boolean) : [],
    createdAt: str(safe.createdAt) || now,
    updatedAt: str(safe.updatedAt) || now,
  };
}

function getRequiredDocumentsForClassName(className) {
  const key = normalizeClassKey(className);

  if (["creche", "nursery", "nursery1", "nursery2", "reception"].includes(key)) {
    return ["passportPhotoUrl", "birthCertificateUrl"];
  }

  if (["jss1", "jss2", "jss3", "ss1", "ss2", "ss3", "sss1", "sss2", "sss3"].includes(key)) {
    return ["passportPhotoUrl", "birthCertificateUrl", "previousResultUrl", "testimonialUrl"];
  }

  return ["passportPhotoUrl", "birthCertificateUrl", "previousResultUrl"];
}

function normalizeDocuments(source) {
  const safe = obj(source);
  const previousResultUrl = str(safe.previousResultUrl || safe.previousReportUrl);
  const immunizationCardUrl = str(safe.immunizationCardUrl || safe.immunizationRecordUrl);

  return {
    passportPhotoUrl: str(safe.passportPhotoUrl),
    birthCertificateUrl: str(safe.birthCertificateUrl),
    previousResultUrl,
    testimonialUrl: str(safe.testimonialUrl),
    transferLetterUrl: str(safe.transferLetterUrl),
    immunizationCardUrl,
  };
}

function normalizeDocumentStatuses(source) {
  const safe = obj(source);
  const out = {};
  for (const key of DOCUMENT_KEYS) {
    const status = str(safe[key] || "PENDING").toUpperCase();
    out[key] = ["PENDING", "VERIFIED", "REJECTED"].includes(status) ? status : "PENDING";
  }
  return out;
}

function normalizeHistory(row) {
  const history = Array.isArray(row.statusHistory) ? row.statusHistory : [];
  return history
    .map((item) => ({
      id: str(item.id) || nanoid(),
      status: normalizeStatus(item.status),
      changedAt: str(item.changedAt) || nowIso(),
      changedById: str(item.changedById),
      changedByName: str(item.changedByName),
      note: str(item.note),
    }))
    .sort((a, b) => str(a.changedAt).localeCompare(str(b.changedAt)));
}
function createApplicationNumber(db) {
  const year = String(new Date().getFullYear());
  const prefix = `APP-${year}-`;

  const admissions = Array.isArray(db.admissions) ? db.admissions : [];
  let max = 0;

  for (const row of admissions) {
    const appNo = str(row.applicationNo);
    if (!appNo.startsWith(prefix)) continue;
    const trailing = Number(appNo.slice(prefix.length));
    if (Number.isFinite(trailing) && trailing > max) max = trailing;
  }

  return `${prefix}${String(max + 1).padStart(5, "0")}`;
}

function createAdmissionNumber(db) {
  const year = String(new Date().getFullYear());
  const prefix = `ADM/${year}/`;

  const students = Array.isArray(db.students) ? db.students : [];
  const admissions = Array.isArray(db.admissions) ? db.admissions : [];

  let max = 0;
  const scan = (value) => {
    const text = str(value);
    if (!text.startsWith(prefix)) return;
    const trailing = Number(text.slice(prefix.length));
    if (Number.isFinite(trailing) && trailing > max) max = trailing;
  };

  for (const student of students) {
    scan(student.admissionNo);
    scan(student.admissionNumber);
  }

  for (const row of admissions) {
    scan(row?.enrollment?.admissionNo);
  }

  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

function ensureAdmissionCollections(db) {
  if (!Array.isArray(db.admissions)) db.admissions = [];
  ensureAcademicScope(db, { currentSession: process.env.CURRENT_SESSION || getCurrentAcademicSessionLabel(), currentTerm: process.env.CURRENT_TERM || "First Term" });
  if (!Array.isArray(db.admissionSessionSettings)) db.admissionSessionSettings = [];
  db.admissionSessions = (db.academicSessions || []).map((session) => normalizeSession(buildAdmissionSessionRow(db, session)));

  if (!Array.isArray(db.admissionClasses) || db.admissionClasses.length === 0) {
    db.admissionClasses = BASE_CLASS_OPTIONS.map((item) => normalizeAdmissionClass(item));
  } else {
    const rows = db.admissionClasses.map((item) => normalizeAdmissionClass(item));
    const existingKeys = new Set(rows.map((item) => normalizeClassKey(item.className)));
    for (const seed of BASE_CLASS_OPTIONS) {
      if (existingKeys.has(normalizeClassKey(seed.className))) continue;
      rows.push(normalizeAdmissionClass(seed));
    }
    db.admissionClasses = rows;
  }

  db.admissionSessions.sort((a, b) => str(b.createdAt).localeCompare(str(a.createdAt)));
  db.admissionClasses.sort((a, b) => str(a.className).localeCompare(str(b.className)));

  return db;
}

function findAdmissionSession(db, input) {
  const sessions = Array.isArray(db.admissionSessions) ? db.admissionSessions : [];
  const safe = str(input);
  if (!safe) return null;

  return (
    sessions.find((item) => str(item.id) === safe) ||
    sessions.find((item) => str(item.title).toLowerCase() === safe.toLowerCase()) ||
    sessions.find((item) => str(item.academicSession).toLowerCase() === safe.toLowerCase()) ||
    null
  );
}

function findActiveAdmissionSession(db) {
  const sessions = Array.isArray(db.admissionSessions) ? db.admissionSessions : [];
  return sessions.find((item) => str(item.status).toUpperCase() === "OPEN") || sessions[0] || null;
}

function findAdmissionClass(db, input) {
  const classes = Array.isArray(db.admissionClasses) ? db.admissionClasses : [];
  const safe = str(input);
  if (!safe) return null;
  const key = normalizeClassKey(safe);

  return (
    classes.find((item) => str(item.id) === safe) ||
    classes.find((item) => normalizeClassKey(item.className) === key) ||
    null
  );
}

function statusFromData(row) {
  const normalized = normalizeStatus(row.status);
  if (normalized !== "REGISTERED") return normalized;

  const personal = obj(row.personal);
  const parentInfo = obj(row.parentInfo);
  const hasData = Boolean(
    str(personal.firstName || row.child?.firstName || row.childName) ||
      str(parentInfo.guardianName || parentInfo.fatherName || row.parent?.fullName || row.parentName) ||
      str(row.notes)
  );

  return hasData ? "IN_PROGRESS" : "REGISTERED";
}

function ensureAdmissionRecordShape(row, db) {
  const childLegacy = splitName(row.childName);
  const child = obj(row.child);
  const parentLegacy = obj(row.parent);
  const medicalLegacy = obj(row.medical);

  const session = findAdmissionSession(db, row.sessionId || row.sessionName) || findActiveAdmissionSession(db);
  const applyingClass = findAdmissionClass(db, row.classId || row.className || row?.child?.applyingClass || row.applyingClass);

  const personal = obj(row.personal);
  const parentInfo = obj(row.parentInfo);
  const academicHistory = obj(row.academicHistory);
  const medicalSupport = obj(row.medicalSupport);
  const screening = obj(row.screening);
  const decision = obj(row.decision);
  const enrollment = obj(row.enrollment);

  const createdAt = str(row.createdAt) || nowIso();
  const updatedAt = str(row.updatedAt) || createdAt;

  const normalized = {
    id: str(row.id) || nanoid(),
    applicationNo: str(row.applicationNo),
    applicantUserId: str(row.applicantUserId),
    applicantUsername: str(row.applicantUsername),
    applicantName: str(row.applicantName || parentLegacy.fullName || row.parentName),

    sessionId: str(row.sessionId || session?.id),
    sessionName: str(row.sessionName || session?.title || session?.academicSession),

    classId: str(row.classId || applyingClass?.id),
    className: str(row.className || applyingClass?.className || child.applyingClass || row.applyingClass),

    personal: {
      surname: str(personal.surname || child.lastName || childLegacy.lastName),
      firstName: str(personal.firstName || child.firstName || childLegacy.firstName),
      middleName: str(personal.middleName),
      gender: str(personal.gender || child.gender),
      dateOfBirth: str(personal.dateOfBirth || child.dateOfBirth),
      nationality: str(personal.nationality),
      stateOfOrigin: str(personal.stateOfOrigin),
      lga: str(personal.lga),
      religion: str(personal.religion),
      residentialAddress: str(personal.residentialAddress || parentLegacy.address),
    },

    parentInfo: {
      fatherName: str(parentInfo.fatherName),
      fatherPhone: str(parentInfo.fatherPhone),
      fatherEmail: str(parentInfo.fatherEmail),
      motherName: str(parentInfo.motherName),
      motherPhone: str(parentInfo.motherPhone),
      motherEmail: str(parentInfo.motherEmail),
      guardianName: str(parentInfo.guardianName || parentLegacy.fullName || row.parentName),
      guardianPhone: str(parentInfo.guardianPhone || parentLegacy.phone || row.phone),
      guardianEmail: str(parentInfo.guardianEmail || parentLegacy.email || row.email),
      occupation: str(parentInfo.occupation),
      contactAddress: str(parentInfo.contactAddress || parentLegacy.address),
      emergencyContactName: str(parentInfo.emergencyContactName || parentLegacy.emergencyContactName),
      emergencyContactPhone: str(parentInfo.emergencyContactPhone || parentLegacy.emergencyContactPhone),
      relationship: str(parentInfo.relationship || parentLegacy.relationship),
    },

    academicHistory: {
      previousSchool: str(academicHistory.previousSchool || child.previousSchool),
      lastClassCompleted: str(academicHistory.lastClassCompleted),
      lastSessionAttended: str(academicHistory.lastSessionAttended),
      reasonForLeaving: str(academicHistory.reasonForLeaving),
      academicStrengths: str(academicHistory.academicStrengths),
      intendedClass: str(academicHistory.intendedClass || row.className || applyingClass?.className),
      specialNotes: str(academicHistory.specialNotes),
    },

    medicalSupport: {
      allergies: str(medicalSupport.allergies || medicalLegacy.allergies),
      medicalConditions: str(medicalSupport.medicalConditions),
      medications: str(medicalSupport.medications),
      learningSupportNeeds: str(medicalSupport.learningSupportNeeds || medicalLegacy.specialNeeds),
      emergencyMedicalNotes: str(medicalSupport.emergencyMedicalNotes || medicalLegacy.notes),
    },

    documents: normalizeDocuments(row.documents),
    documentStatuses: normalizeDocumentStatuses(row.documentStatuses),

    reviewChecklist: {
      personalComplete: bool(row?.reviewChecklist?.personalComplete),
      parentComplete: bool(row?.reviewChecklist?.parentComplete),
      academicComplete: bool(row?.reviewChecklist?.academicComplete),
      documentsComplete: bool(row?.reviewChecklist?.documentsComplete),
      paymentVerified: bool(row?.reviewChecklist?.paymentVerified),
      academicAcceptable: bool(row?.reviewChecklist?.academicAcceptable),
    },
    reviewNotes: str(row.reviewNotes),

    screening: {
      type: str(screening.type),
      date: str(screening.date),
      time: str(screening.time),
      venue: str(screening.venue),
      instructions: str(screening.instructions),
      status: str(screening.status),
      score: screening.score === "" ? "" : num(screening.score, ""),
      remarks: str(screening.remarks),
      updatedAt: str(screening.updatedAt),
    },

    decision: {
      decision: str(decision.decision),
      offeredClassId: str(decision.offeredClassId),
      offeredClassName: str(decision.offeredClassName),
      note: str(decision.note),
      admissionLetterUrl: str(decision.admissionLetterUrl),
      publishedAt: str(decision.publishedAt),
      publishedById: str(decision.publishedById),
      publishedByName: str(decision.publishedByName),
    },

    enrollment: {
      admissionNo: str(enrollment.admissionNo),
      assignedClassId: str(enrollment.assignedClassId),
      assignedClassName: str(enrollment.assignedClassName),
      studentId: str(enrollment.studentId),
      studentUsername: str(enrollment.studentUsername),
      parentUserId: str(enrollment.parentUserId),
      parentUsername: str(enrollment.parentUsername),
      enrolledAt: str(enrollment.enrolledAt),
      enrolledById: str(enrollment.enrolledById),
      enrolledByName: str(enrollment.enrolledByName),
    },

    declarationAccepted: bool(row.declarationAccepted),

    notes: str(row.notes),
    status: statusFromData(row),
    submittedAt: str(row.submittedAt),
    assignedOfficerId: str(row.assignedOfficerId),
    assignedOfficerName: str(row.assignedOfficerName),

    applicationFeePaid: bool(row.applicationFeePaid),
    applicationFeePaidAt: str(row.applicationFeePaidAt),
    acceptanceFeePaid: bool(row.acceptanceFeePaid),
    acceptanceFeePaidAt: str(row.acceptanceFeePaidAt),
    acceptanceFeeReference: str(row.acceptanceFeeReference),

    createdAt,
    updatedAt,
    isArchived: bool(row.isArchived),
    archivedAt: str(row.archivedAt),
    archivedById: str(row.archivedById),
    archivedByName: str(row.archivedByName),
    statusHistory: normalizeHistory(row),
  };

  if (!normalized.applicationNo) {
    normalized.applicationNo = createApplicationNumber(db);
  }

  if (!normalized.submittedAt && ["SUBMITTED", "UNDER_REVIEW", "SHORTLISTED", "SCREENING_SCHEDULED", "SCREENING_COMPLETED", "ADMITTED", "WAITLISTED", "REJECTED", "ENROLLED"].includes(normalized.status)) {
    normalized.submittedAt = normalized.createdAt;
  }

  if (normalized.statusHistory.length === 0) {
    normalized.statusHistory.push({
      id: nanoid(),
      status: normalized.status,
      changedAt: normalized.createdAt,
      changedById: normalized.applicantUserId,
      changedByName: normalized.applicantName || "System",
      note: normalized.status === "REGISTERED" ? "Applicant account created" : "Admission record initialized",
    });
  }

  syncLegacyShape(normalized);
  return normalized;
}

function syncLegacyShape(record) {
  record.child = {
    firstName: str(record.personal?.firstName),
    lastName: str(record.personal?.surname),
    dateOfBirth: str(record.personal?.dateOfBirth),
    gender: str(record.personal?.gender),
    applyingClass: str(record.className || record.academicHistory?.intendedClass),
    previousSchool: str(record.academicHistory?.previousSchool),
  };

  record.parent = {
    fullName:
      str(record.parentInfo?.guardianName) ||
      str(record.parentInfo?.fatherName) ||
      str(record.parentInfo?.motherName),
    relationship: str(record.parentInfo?.relationship),
    email:
      str(record.parentInfo?.guardianEmail) ||
      str(record.parentInfo?.fatherEmail) ||
      str(record.parentInfo?.motherEmail),
    phone:
      str(record.parentInfo?.guardianPhone) ||
      str(record.parentInfo?.fatherPhone) ||
      str(record.parentInfo?.motherPhone),
    address: str(record.parentInfo?.contactAddress || record.personal?.residentialAddress),
    emergencyContactName: str(record.parentInfo?.emergencyContactName),
    emergencyContactPhone: str(record.parentInfo?.emergencyContactPhone),
  };

  record.medical = {
    allergies: str(record.medicalSupport?.allergies),
    specialNeeds: str(record.medicalSupport?.learningSupportNeeds),
    notes: str(record.medicalSupport?.emergencyMedicalNotes),
  };

  record.documents.previousReportUrl = str(record.documents.previousResultUrl);
  record.documents.immunizationRecordUrl = str(record.documents.immunizationCardUrl);

  return record;
}

function getAdmissions(db) {
  ensureAdmissionCollections(db);
  const rows = Array.isArray(db.admissions) ? db.admissions : [];
  const normalized = rows.map((item) => ensureAdmissionRecordShape(item, db));
  db.admissions = normalized;
  return normalized;
}

function pushStatusHistory(record, { status, byId, byName, note }) {
  record.statusHistory = Array.isArray(record.statusHistory) ? record.statusHistory : [];
  record.statusHistory.push({
    id: nanoid(),
    status: normalizeStatus(status),
    changedAt: nowIso(),
    changedById: str(byId),
    changedByName: str(byName),
    note: str(note),
  });
}

function hasAnyValue(fields) {
  return fields.some((item) => str(item));
}

function isEarlyYearsClass(className) {
  const key = normalizeClassKey(className);
  return ["creche", "nursery1", "nursery2", "reception"].includes(key);
}
function computeProgress(record, db) {
  const personal = obj(record.personal);
  const parentInfo = obj(record.parentInfo);
  const academic = obj(record.academicHistory);

  const personalComplete = hasAnyValue([personal.surname, personal.firstName, personal.gender, personal.dateOfBirth, personal.residentialAddress]);
  const parentComplete = hasAnyValue([
    parentInfo.guardianName || parentInfo.fatherName || parentInfo.motherName,
    parentInfo.guardianPhone || parentInfo.fatherPhone || parentInfo.motherPhone,
    parentInfo.guardianEmail || parentInfo.fatherEmail || parentInfo.motherEmail,
  ]);

  const needsPreviousSchool = !isEarlyYearsClass(record.className);
  const academicComplete = needsPreviousSchool
    ? hasAnyValue([academic.intendedClass || record.className, academic.previousSchool, academic.lastClassCompleted])
    : hasAnyValue([academic.intendedClass || record.className]);

  const requiredDocuments = getRequiredDocumentsForClassName(record.className);
  const docs = obj(record.documents);
  const uploadedRequired = requiredDocuments.filter((key) => str(docs[key])).length;
  const documentsComplete = uploadedRequired === requiredDocuments.length;

  const feePaid = Boolean(record.applicationFeePaid || hasSuccessfulApplicationFeePayment(db, record.applicantUserId));
  const finalSubmitted = [
    "SUBMITTED",
    "UNDER_REVIEW",
    "SHORTLISTED",
    "SCREENING_SCHEDULED",
    "SCREENING_COMPLETED",
    "ADMITTED",
    "WAITLISTED",
    "REJECTED",
    "ENROLLED",
  ].includes(record.status);

  const steps = [
    { key: "account", label: "Account Created", done: true },
    { key: "personal", label: "Personal Information", done: personalComplete },
    { key: "parent", label: "Parent / Guardian", done: parentComplete },
    { key: "academic", label: "Academic History", done: academicComplete },
    { key: "documents", label: "Document Upload", done: documentsComplete },
    { key: "payment", label: "Application Fee", done: feePaid },
    { key: "submission", label: "Final Submission", done: finalSubmitted },
  ];

  const done = steps.filter((item) => item.done).length;
  const percent = Math.round((done / steps.length) * 100);

  return {
    percent,
    steps,
    canSubmit: personalComplete && parentComplete && academicComplete && documentsComplete && feePaid,
    documentsRequired: requiredDocuments,
    documentsUploaded: uploadedRequired,
    applicationFeePaid: feePaid,
  };
}

function enrichApplication(db, row) {
  const record = ensureAdmissionRecordShape(row, db);
  record.applicationFeePaid = Boolean(record.applicationFeePaid || hasSuccessfulApplicationFeePayment(db, record.applicantUserId));
  record.reviewChecklist = {
    ...record.reviewChecklist,
    paymentVerified: Boolean(record.applicationFeePaid),
  };
  record.progress = computeProgress(record, db);
  syncLegacyShape(record);
  return record;
}

function validateSubmission(record) {
  const errors = [];

  if (!str(record.personal.surname)) errors.push("Surname is required");
  if (!str(record.personal.firstName)) errors.push("First name is required");
  if (!str(record.personal.gender)) errors.push("Gender is required");
  if (!str(record.personal.dateOfBirth)) errors.push("Date of birth is required");
  if (!str(record.personal.residentialAddress)) errors.push("Residential address is required");

  if (!str(record.parentInfo.guardianName || record.parentInfo.fatherName || record.parentInfo.motherName)) {
    errors.push("Parent/guardian name is required");
  }

  if (!str(record.parentInfo.guardianPhone || record.parentInfo.fatherPhone || record.parentInfo.motherPhone)) {
    errors.push("Parent/guardian phone is required");
  }

  if (!str(record.parentInfo.guardianEmail || record.parentInfo.fatherEmail || record.parentInfo.motherEmail)) {
    errors.push("Parent/guardian email is required");
  }

  if (!str(record.className)) errors.push("Applied class is required");

  const requiredDocs = getRequiredDocumentsForClassName(record.className);
  for (const key of requiredDocs) {
    if (!str(record.documents[key])) {
      errors.push(`${toTitle(key.replace(/Url$/, "").replace(/([A-Z])/g, " $1"))} is required`);
    }
  }

  return errors;
}

function parseWorkflowPatch(body) {
  const patch = { invalidStatus: false };

  if (body.status !== undefined) {
    const mapped = normalizeStatusInput(body.status);
    if (!ADMISSION_STATUSES.includes(mapped)) patch.invalidStatus = true;
    else patch.status = mapped;
  }

  if (body.assignedOfficerId !== undefined) patch.assignedOfficerId = str(body.assignedOfficerId);
  if (body.assignedOfficerName !== undefined) patch.assignedOfficerName = str(body.assignedOfficerName);
  if (body.note !== undefined) patch.note = str(body.note);

  return patch;
}

function canApplicantEdit(record) {
  return !record.isArchived && ["REGISTERED", "IN_PROGRESS"].includes(record.status);
}

function updateRecordStatus(record, nextStatus, reqUser, note) {
  const normalizedNext = normalizeStatus(nextStatus);
  const previous = record.status;
  if (previous === normalizedNext) return false;

  record.status = normalizedNext;
  if (normalizedNext !== "REGISTERED" && !record.submittedAt) record.submittedAt = nowIso();
  record.updatedAt = nowIso();

  pushStatusHistory(record, {
    status: normalizedNext,
    byId: reqUser?.id || "",
    byName: reqUser?.name || "System",
    note: str(note) || `Status changed from ${previous} to ${normalizedNext}`,
  });

  return true;
}

function mergeSection(target, updates, keys) {
  const safeTarget = obj(target);
  const safeUpdates = obj(updates);
  const out = { ...safeTarget };
  for (const key of keys) {
    if (safeUpdates[key] !== undefined) out[key] = str(safeUpdates[key]);
  }
  return out;
}

function ensureApplicantApplication(db, user) {
  const rows = getAdmissions(db)
    .filter((item) => str(item.applicantUserId) === str(user.id) && !item.isArchived)
    .sort((a, b) => str(b.updatedAt).localeCompare(str(a.updatedAt)));

  if (rows.length > 0) return rows[0];

  const session = findActiveAdmissionSession(db);
  const firstOpenClass = (db.admissionClasses || []).find((item) => str(item.status).toUpperCase() === "OPEN") || db.admissionClasses[0] || null;

  const draft = ensureAdmissionRecordShape(
    {
      id: nanoid(),
      applicationNo: createApplicationNumber(db),
      applicantUserId: user.id,
      applicantUsername: user.username,
      applicantName: user.name,
      sessionId: session?.id,
      sessionName: session?.title,
      classId: firstOpenClass?.id,
      className: firstOpenClass?.className,
      status: "REGISTERED",
      parentInfo: {
        guardianName: user.name,
        guardianPhone: user.phone || "",
      },
      createdAt: nowIso(),
      updatedAt: nowIso(),
      statusHistory: [
        {
          id: nanoid(),
          status: "REGISTERED",
          changedAt: nowIso(),
          changedById: user.id,
          changedByName: user.name,
          note: "Applicant account created",
        },
      ],
    },
    db
  );

  db.admissions.unshift(draft);
  return draft;
}

function buildPublicAdmissionsConfig(db) {
  const activeSession = findActiveAdmissionSession(db);
  const classes = (db.admissionClasses || [])
    .filter((row) => str(row.status).toUpperCase() === "OPEN")
    .sort((a, b) => str(a.className).localeCompare(str(b.className)));

  return {
    activeSession,
    sessions: (db.admissionSessions || []).map((item) => normalizeSession(item)),
    classes,
    open: Boolean(activeSession && str(activeSession.status).toUpperCase() === "OPEN"),
    processSteps: [
      "Create Applicant Account",
      "Complete Multi-step Application",
      "Upload Required Documents",
      "Pay Application Fee",
      "Submit Application",
      "Attend Screening / Interview",
      "Admission Decision",
      "Acceptance and Enrollment",
    ],
    requirements: {
      earlyYears: ["Passport photo", "Birth certificate", "Parent contact details"],
      basicSchool: ["Passport photo", "Birth certificate", "Previous school result", "Transfer letter (if changing school)"],
      secondary: ["Passport photo", "Birth certificate", "Last results", "Testimonial", "Entrance screening"],
    },
    faq: DEFAULT_FAQ,
  };
}

function summarizeAdmissions(db, rows) {
  const list = (Array.isArray(rows) ? rows : []).filter((item) => !item.isArchived);

  const count = (status) => list.filter((item) => item.status === status).length;
  const paid = list.filter((item) => item.applicationFeePaid).length;
  const awaitingPayment = list.filter((item) => !item.applicationFeePaid && ["REGISTERED", "IN_PROGRESS", "SUBMITTED"].includes(item.status)).length;

  return {
    applicationsStarted: list.length,
    applicationsSubmitted: count("SUBMITTED") + count("UNDER_REVIEW") + count("SHORTLISTED") + count("SCREENING_SCHEDULED") + count("SCREENING_COMPLETED") + count("ADMITTED") + count("WAITLISTED") + count("REJECTED") + count("ENROLLED"),
    underReview: count("UNDER_REVIEW"),
    awaitingPayment,
    shortlisted: count("SHORTLISTED"),
    screeningScheduled: count("SCREENING_SCHEDULED"),
    admitted: count("ADMITTED") + count("ENROLLED"),
    waitlisted: count("WAITLISTED"),
    rejected: count("REJECTED"),
    enrolled: count("ENROLLED"),
    paidApplications: paid,
  };
}

function generateUniqueUsername(existingUsers, preferred, fallbackPrefix) {
  const users = Array.isArray(existingUsers) ? existingUsers : [];
  const taken = new Set(users.map((item) => str(item.username).toLowerCase()).filter(Boolean));

  const base = str(preferred)
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "") ||
    str(fallbackPrefix)
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, "") ||
    `user${Math.floor(Math.random() * 1000)}`;

  if (!taken.has(base)) return base;

  let n = 1;
  while (taken.has(`${base}${n}`)) n += 1;
  return `${base}${n}`;
}

function resolveApplicationFilters(rows, query) {
  const safeStatus = str(query.status).toUpperCase();
  const safeSearch = str(query.search).toLowerCase();
  const safeSessionId = str(query.sessionId);
  const safeClassId = str(query.classId);
  const paymentStatus = str(query.paymentStatus).toUpperCase();
  const archivedFilter = str(query.archived).toLowerCase();

  return rows
    .filter((item) => {
      if (["all", "true", "1", "yes"].includes(archivedFilter)) return true;
      if (["only", "archived"].includes(archivedFilter)) return Boolean(item.isArchived);
      return !item.isArchived;
    })
    .filter((item) => (!safeStatus || safeStatus === "ALL" ? true : item.status === safeStatus))
    .filter((item) => (!safeSessionId ? true : str(item.sessionId) === safeSessionId))
    .filter((item) => (!safeClassId ? true : str(item.classId) === safeClassId))
    .filter((item) => {
      if (!paymentStatus || paymentStatus === "ALL") return true;
      if (paymentStatus === "PAID") return Boolean(item.applicationFeePaid);
      if (paymentStatus === "UNPAID") return !Boolean(item.applicationFeePaid);
      return true;
    })
    .filter((item) => {
      if (!safeSearch) return true;
      return [
        item.applicationNo,
        item.applicantUsername,
        item.applicantName,
        item.className,
        item.sessionName,
        item.personal?.firstName,
        item.personal?.surname,
        item.parentInfo?.guardianName,
      ]
        .join(" ")
        .toLowerCase()
        .includes(safeSearch);
    })
    .sort((a, b) => str(b.updatedAt).localeCompare(str(a.updatedAt)));
}

function ensurePortalClass(db, className) {
  const safeName = str(className);
  if (!safeName) return { id: "", name: "" };

  if (!Array.isArray(db.classes)) db.classes = [];

  const key = normalizeClassKey(safeName);
  const found = db.classes.find((row) => normalizeClassKey(row.name) === key) || null;
  if (found) return { id: str(found.id), name: str(found.name) };

  const newClass = {
    id: normalizeClassId(safeName),
    name: safeName,
    section: "Other",
    order: 999,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  db.classes.push(newClass);
  return { id: newClass.id, name: newClass.name };
}

function ensureStudentRecordFromApplication(db, application, admissionNo) {
  if (!Array.isArray(db.students)) db.students = [];

  const existing = db.students.find((row) => str(row.id) === str(application.enrollment.studentId)) || null;
  const studentName = joinName(application.personal.firstName, application.personal.surname) || application.applicantName;

  const className = str(application.enrollment.assignedClassName || application.className);
  const classResolved = ensurePortalClass(db, className);

  if (existing) {
    existing.name = studentName;
    existing.firstName = str(application.personal.firstName);
    existing.lastName = str(application.personal.surname);
    existing.classId = classResolved.id;
    existing.className = classResolved.name;
    existing.parentPhone = str(application.parentInfo.guardianPhone || application.parentInfo.fatherPhone || application.parentInfo.motherPhone);
    existing.admissionNo = str(existing.admissionNo || admissionNo);
    existing.updatedAt = nowIso();
    return existing;
  }

  const created = {
    id: nanoid(),
    name: studentName,
    firstName: str(application.personal.firstName),
    lastName: str(application.personal.surname),
    classId: classResolved.id,
    className: classResolved.name,
    parentPhone: str(application.parentInfo.guardianPhone || application.parentInfo.fatherPhone || application.parentInfo.motherPhone),
    studentPhone: "",
    admissionNo,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  db.students.unshift(created);
  return created;
}

async function ensurePortalUserFromApplication(db, options) {
  const {
    role,
    application,
    preferredUsername,
    preferredPassword,
    fallbackPrefix,
    linkStudentId,
    linkStudentIds,
  } = options;

  if (!Array.isArray(db.users)) db.users = [];

  let existing = null;
  if (str(preferredUsername)) {
    existing = db.users.find((row) => str(row.username).toLowerCase() === str(preferredUsername).toLowerCase()) || null;
  }

  const baseName =
    role === "STUDENT"
      ? joinName(application.personal.firstName, application.personal.surname)
      : str(application.parentInfo.guardianName || application.parentInfo.fatherName || application.parentInfo.motherName || application.applicantName);

  if (existing) {
    if (str(existing.role).toUpperCase() !== role) {
      throw new Error(`Username '${existing.username}' is already assigned to another role.`);
    }

    if (role === "STUDENT" && linkStudentId) existing.studentId = linkStudentId;
    if (role === "PARENT" && Array.isArray(linkStudentIds)) {
      const seen = new Set((existing.studentIds || []).map((item) => str(item)));
      for (const id of linkStudentIds) {
        const safeId = str(id);
        if (!safeId || seen.has(safeId)) continue;
        seen.add(safeId);
      }
      existing.studentIds = Array.from(seen);
      if (!existing.studentId && existing.studentIds.length > 0) {
        existing.studentId = existing.studentIds[0];
      }
    }

    existing.updatedAt = nowIso();
    return existing;
  }

  const username = generateUniqueUsername(db.users, preferredUsername, fallbackPrefix);
  const passwordPlain = str(preferredPassword) || randomTemporaryPassword();

  const created = {
    id: nanoid(),
    name: baseName || `${role} User`,
    username,
    password: await hashPassword(passwordPlain),
    role,
    phone: role === "PARENT" ? str(application.parentInfo.guardianPhone || application.parentInfo.fatherPhone || application.parentInfo.motherPhone) : "",
    subjects: [],
    studentId: role === "STUDENT" ? str(linkStudentId) : role === "PARENT" ? str((linkStudentIds || [])[0] || "") : "",
    studentIds: role === "PARENT" ? (linkStudentIds || []).map((id) => str(id)).filter(Boolean) : [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  db.users.unshift(created);
  return created;
}

function toAcknowledgementPayload(application) {
  return {
    applicationNo: application.applicationNo,
    applicantName: joinName(application.personal.firstName, application.personal.surname) || application.applicantName,
    className: application.className,
    sessionName: application.sessionName,
    submittedAt: application.submittedAt,
    applicationFeePaid: application.applicationFeePaid,
    screening: application.screening,
    status: application.status,
  };
}
router.get("/public/config", (req, res) => {
  const db = readDB();
  ensureAdmissionCollections(db);
  const payload = buildPublicAdmissionsConfig(db);
  writeDB(db);
  return res.json(payload);
});

router.get("/applicant/classes", (req, res) => {
  const db = readDB();
  ensureAdmissionCollections(db);
  const rows = (db.admissionClasses || [])
    .filter((row) => str(row.status).toUpperCase() === "OPEN")
    .sort((a, b) => str(a.className).localeCompare(str(b.className)));
  writeDB(db);
  return res.json(rows);
});

router.get("/applicant/sessions", (req, res) => {
  const db = readDB();
  ensureAdmissionCollections(db);
  const rows = (db.admissionSessions || [])
    .sort((a, b) => str(b.createdAt).localeCompare(str(a.createdAt)));
  writeDB(db);
  return res.json(rows);
});

router.post("/applicant/register", async (req, res) => {
  const body = req.body || {};

  const surname = str(body.surname || splitName(body.name).lastName);
  const firstName = str(body.firstName || splitName(body.name).firstName);
  const middleName = str(body.middleName);
  const email = str(body.email);
  const phone = str(body.phone);
  const password = String(body.password || "");

  if (!surname || !firstName || !email || !phone || !password) {
    return res.status(400).json({
      message: "surname, firstName, email, phone, and password are required",
    });
  }

  const db = readDB();
  ensureAdmissionCollections(db);

  const session = findAdmissionSession(db, body.sessionId || body.admissionSession || body.admissionSessionId) || findActiveAdmissionSession(db);
  if (!session || str(session.status).toUpperCase() !== "OPEN") {
    return res.status(400).json({ message: "Admissions are currently closed for the selected session." });
  }

  const admissionClass = findAdmissionClass(db, body.classId || body.applyForClass || body.applyingClass);
  if (!admissionClass || str(admissionClass.status).toUpperCase() !== "OPEN") {
    return res.status(400).json({ message: "Selected class is not open for admission." });
  }

  const users = Array.isArray(db.users) ? db.users : [];
  const preferredUsername = str(body.username);
  const autoPrefix = `${firstName}.${surname}`;
  const username = generateUniqueUsername(users, preferredUsername, autoPrefix);

  if (preferredUsername && str(preferredUsername).toLowerCase() !== username.toLowerCase()) {
    return res.status(409).json({ message: "username already exists" });
  }

  const fullName = [firstName, middleName, surname].filter(Boolean).join(" ").trim();

  const user = {
    id: nanoid(),
    name: fullName,
    username,
    password: await hashPassword(password),
    role: "APPLICANT",
    phone,
    subjects: [],
    studentId: "",
    studentIds: [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  users.unshift(user);
  db.users = users;

  const application = ensureAdmissionRecordShape(
    {
      id: nanoid(),
      applicationNo: createApplicationNumber(db),
      applicantUserId: user.id,
      applicantUsername: user.username,
      applicantName: user.name,
      sessionId: session.id,
      sessionName: session.title,
      classId: admissionClass.id,
      className: admissionClass.className,
      status: "REGISTERED",
      personal: {
        surname,
        firstName,
        middleName,
      },
      parentInfo: {
        guardianName: fullName,
        guardianEmail: email,
        guardianPhone: phone,
      },
      academicHistory: {
        intendedClass: admissionClass.className,
      },
      statusHistory: [
        {
          id: nanoid(),
          status: "REGISTERED",
          changedAt: nowIso(),
          changedById: user.id,
          changedByName: user.name,
          note: "Applicant account created",
        },
      ],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    db
  );

  db.admissions.unshift(application);
  writeDB(db);

  const payload = sanitizeUser(user);
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "10h" });

  return res.status(201).json({ token, user: payload, application: enrichApplication(db, application) });
});

router.get("/applicant/application", auth(), requireRole("APPLICANT"), (req, res) => {
  const db = readDB();
  ensureAdmissionCollections(db);
  const record = ensureApplicantApplication(db, req.user);
  const enriched = enrichApplication(db, record);
  writeDB(db);
  return res.json(enriched);
});

router.get("/applicant/application/acknowledgement", auth(), requireRole("APPLICANT"), (req, res) => {
  const db = readDB();
  ensureAdmissionCollections(db);
  const record = ensureApplicantApplication(db, req.user);
  const enriched = enrichApplication(db, record);

  if (!str(enriched.submittedAt)) {
    return res.status(400).json({ message: "Application has not been submitted yet." });
  }

  writeDB(db);
  return res.json(toAcknowledgementPayload(enriched));
});

router.post("/applicant/application", auth(), requireRole("APPLICANT"), (req, res) => {
  const db = readDB();
  ensureAdmissionCollections(db);
  const record = ensureApplicantApplication(db, req.user);

  if (!canApplicantEdit(record)) {
    return res.status(409).json({
      message: "Application is already submitted/reviewed. Contact admissions office to reopen for edits.",
    });
  }

  const body = req.body || {};

  const nextSession = body.sessionId ? findAdmissionSession(db, body.sessionId) : null;
  if (nextSession && str(nextSession.status).toUpperCase() !== "OPEN") {
    return res.status(400).json({ message: "Selected admission session is closed." });
  }

  const nextClass = body.classId || body.className || body.applyingClass
    ? findAdmissionClass(db, body.classId || body.className || body.applyingClass)
    : null;

  if (nextClass && str(nextClass.status).toUpperCase() !== "OPEN") {
    return res.status(400).json({ message: "Selected class is closed for admissions." });
  }

  if (nextSession) {
    record.sessionId = nextSession.id;
    record.sessionName = nextSession.title;
  }

  if (nextClass) {
    record.classId = nextClass.id;
    record.className = nextClass.className;
    record.academicHistory.intendedClass = nextClass.className;
  }

  if (body.personal !== undefined) {
    record.personal = mergeSection(record.personal, body.personal, [
      "surname",
      "firstName",
      "middleName",
      "gender",
      "dateOfBirth",
      "nationality",
      "stateOfOrigin",
      "lga",
      "religion",
      "residentialAddress",
    ]);
  }

  if (body.parentInfo !== undefined) {
    record.parentInfo = mergeSection(record.parentInfo, body.parentInfo, [
      "fatherName",
      "fatherPhone",
      "fatherEmail",
      "motherName",
      "motherPhone",
      "motherEmail",
      "guardianName",
      "guardianPhone",
      "guardianEmail",
      "occupation",
      "contactAddress",
      "emergencyContactName",
      "emergencyContactPhone",
      "relationship",
    ]);
  }

  if (body.academicHistory !== undefined) {
    record.academicHistory = mergeSection(record.academicHistory, body.academicHistory, [
      "previousSchool",
      "lastClassCompleted",
      "lastSessionAttended",
      "reasonForLeaving",
      "academicStrengths",
      "intendedClass",
      "specialNotes",
    ]);
  }

  if (body.medicalSupport !== undefined) {
    record.medicalSupport = mergeSection(record.medicalSupport, body.medicalSupport, [
      "allergies",
      "medicalConditions",
      "medications",
      "learningSupportNeeds",
      "emergencyMedicalNotes",
    ]);
  }

  if (body.documents !== undefined) {
    const merged = {
      ...record.documents,
      ...normalizeDocuments(body.documents),
    };
    record.documents = normalizeDocuments(merged);

    for (const key of DOCUMENT_KEYS) {
      if (obj(body.documents)[key] !== undefined) {
        record.documentStatuses[key] = "PENDING";
      }
    }
  }

  if (body.child !== undefined) {
    const child = obj(body.child);
    if (child.firstName !== undefined) record.personal.firstName = str(child.firstName);
    if (child.lastName !== undefined) record.personal.surname = str(child.lastName);
    if (child.gender !== undefined) record.personal.gender = str(child.gender);
    if (child.dateOfBirth !== undefined) record.personal.dateOfBirth = str(child.dateOfBirth);
    if (child.previousSchool !== undefined) record.academicHistory.previousSchool = str(child.previousSchool);

    if (child.applyingClass !== undefined) {
      const found = findAdmissionClass(db, child.applyingClass);
      if (found && str(found.status).toUpperCase() === "OPEN") {
        record.classId = found.id;
        record.className = found.className;
        record.academicHistory.intendedClass = found.className;
      }
    }
  }

  if (body.parent !== undefined) {
    const parent = obj(body.parent);
    if (parent.fullName !== undefined) record.parentInfo.guardianName = str(parent.fullName);
    if (parent.phone !== undefined) record.parentInfo.guardianPhone = str(parent.phone);
    if (parent.email !== undefined) record.parentInfo.guardianEmail = str(parent.email);
    if (parent.address !== undefined) record.parentInfo.contactAddress = str(parent.address);
    if (parent.relationship !== undefined) record.parentInfo.relationship = str(parent.relationship);
    if (parent.emergencyContactName !== undefined) record.parentInfo.emergencyContactName = str(parent.emergencyContactName);
    if (parent.emergencyContactPhone !== undefined) record.parentInfo.emergencyContactPhone = str(parent.emergencyContactPhone);
  }

  if (body.medical !== undefined) {
    const medical = obj(body.medical);
    if (medical.allergies !== undefined) record.medicalSupport.allergies = str(medical.allergies);
    if (medical.specialNeeds !== undefined) record.medicalSupport.learningSupportNeeds = str(medical.specialNeeds);
    if (medical.notes !== undefined) record.medicalSupport.emergencyMedicalNotes = str(medical.notes);
  }

  if (body.notes !== undefined) record.notes = str(body.notes);
  if (body.declarationAccepted !== undefined) record.declarationAccepted = bool(body.declarationAccepted);

  record.applicantUserId = req.user.id;
  record.applicantUsername = req.user.username;
  record.applicantName = req.user.name;

  if (record.status === "REGISTERED") {
    updateRecordStatus(record, "IN_PROGRESS", req.user, "Applicant started completing application form");
  } else {
    record.updatedAt = nowIso();
  }

  const enriched = enrichApplication(db, record);
  writeDB(db);
  return res.json(enriched);
});

router.post("/applicant/application/submit", auth(), requireRole("APPLICANT"), (req, res) => {
  const db = readDB();
  ensureAdmissionCollections(db);

  const record = ensureApplicantApplication(db, req.user);

  if (["UNDER_REVIEW", "SHORTLISTED", "SCREENING_SCHEDULED", "SCREENING_COMPLETED", "ADMITTED", "WAITLISTED", "REJECTED", "ENROLLED"].includes(record.status)) {
    return res.status(409).json({ message: "Application has already moved to admissions workflow." });
  }

  const errors = validateSubmission(record);
  if (errors.length > 0) {
    return res.status(400).json({ message: "Please complete all required sections before submission.", errors });
  }

  if (!hasSuccessfulApplicationFeePayment(db, req.user.id)) {
    return res.status(402).json({ message: "Application fee payment is required before submission." });
  }

  record.applicationFeePaid = true;
  record.applicationFeePaidAt = record.applicationFeePaidAt || nowIso();

  updateRecordStatus(record, "SUBMITTED", req.user, "Applicant submitted application");
  record.submittedAt = record.submittedAt || nowIso();

  const enriched = enrichApplication(db, record);
  writeDB(db);
  return res.json(enriched);
});
router.get("/admin/dashboard", auth(), requireRole(...ADMISSIONS_ADMIN_ROLES), (req, res) => {
  const db = readDB();
  ensureAdmissionCollections(db);
  const rows = getAdmissions(db).map((item) => enrichApplication(db, item));
  const summary = summarizeAdmissions(db, rows);
  const config = buildPublicAdmissionsConfig(db);

  writeDB(db);
  return res.json({
    summary,
    activeSession: config.activeSession,
    classesOpen: config.classes.length,
    recent: rows.slice().sort((a, b) => str(b.updatedAt).localeCompare(str(a.updatedAt))).slice(0, 10),
  });
});

router.get("/admin/sessions", auth(), requireRole(...ADMISSIONS_ADMIN_ROLES), (req, res) => {
  const db = readDB();
  ensureAdmissionCollections(db);
  const rows = (db.admissionSessions || []).slice().sort((a, b) => str(b.createdAt).localeCompare(str(a.createdAt)));
  writeDB(db);
  return res.json(rows);
});

router.post("/admin/sessions", auth(), requireRole(...ADMISSIONS_ADMIN_ROLES), (req, res) => {
  const body = req.body || {};
  const title = str(body.title || body.sessionTitle);
  const academicSession = normalizeSessionName(body.academicSession || title.replace(/\s+Admission$/i, ""));

  if (!title || !academicSession) {
    return res.status(400).json({ message: "title and academicSession are required" });
  }

  const db = readDB();
  ensureAdmissionCollections(db);

  const exists = (db.academicSessions || []).some((item) => str(item.sessionName).toLowerCase() === academicSession.toLowerCase());

  if (exists) return res.status(409).json({ message: "Admission session already exists" });

  const session = ensureAcademicSession(db, academicSession, {
    startDate: body.startDate,
    endDate: body.endDate,
    isActive: false,
  });
  const created = normalizeSession({
    ...buildAdmissionSessionRow(db, session),
    title,
    academicSession,
    startDate: body.startDate,
    endDate: body.endDate,
    applicationFee: body.applicationFee,
    acceptanceFee: body.acceptanceFee,
    status: body.status || "OPEN",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });

  if (created.status === "OPEN") {
    db.admissionSessionSettings = (db.admissionSessionSettings || []).map((row) => ({ ...row, status: "CLOSED", updatedAt: nowIso() }));
  }

  const setting = (db.admissionSessionSettings || []).find((row) => str(row.sessionId) === str(session.id));
  Object.assign(setting, { ...created, id: setting.id, sessionId: session.id });
  syncAcademicMirrors(db);
  writeDB(db);
  return res.status(201).json(normalizeSession(buildAdmissionSessionRow(db, session)));
});

router.patch("/admin/sessions/:id", auth(), requireRole(...ADMISSIONS_ADMIN_ROLES), (req, res) => {
  const db = readDB();
  ensureAdmissionCollections(db);

  const academic = (db.academicSessions || []).find((row) => str(row.id) === str(req.params.id));
  if (!academic) return res.status(404).json({ message: "Admission session not found" });

  const current = normalizeSession(buildAdmissionSessionRow(db, academic));
  const body = req.body || {};
  const nextAcademicName = body.academicSession !== undefined ? normalizeSessionName(body.academicSession) : current.academicSession;
  if (!nextAcademicName) return res.status(400).json({ message: "academicSession cannot be empty" });

  const duplicate = (db.academicSessions || []).find(
    (row) => str(row.id) !== str(academic.id) && str(row.sessionName).toLowerCase() === nextAcademicName.toLowerCase()
  );
  if (duplicate) return res.status(409).json({ message: "Another academic session already uses that name" });

  academic.sessionName = nextAcademicName;
  if (body.startDate !== undefined) academic.startDate = str(body.startDate);
  if (body.endDate !== undefined) academic.endDate = str(body.endDate);
  academic.updatedAt = nowIso();

  const next = normalizeSession({
    ...current,
    title: body.title !== undefined ? str(body.title) : current.title,
    academicSession: nextAcademicName,
    startDate: body.startDate !== undefined ? str(body.startDate) : current.startDate,
    endDate: body.endDate !== undefined ? str(body.endDate) : current.endDate,
    applicationFee: body.applicationFee !== undefined ? num(body.applicationFee, current.applicationFee) : current.applicationFee,
    acceptanceFee: body.acceptanceFee !== undefined ? num(body.acceptanceFee, current.acceptanceFee) : current.acceptanceFee,
    status: body.status !== undefined ? str(body.status) : current.status,
    updatedAt: nowIso(),
  });

  if (next.status === "OPEN") {
    db.admissionSessionSettings = (db.admissionSessionSettings || []).map((row) => ({
      ...row,
      status: str(row.sessionId) === str(academic.id) ? "OPEN" : "CLOSED",
      updatedAt: nowIso(),
    }));
  }

  const setting = (db.admissionSessionSettings || []).find((row) => str(row.sessionId) === str(academic.id));
  Object.assign(setting, { ...next, id: setting.id, sessionId: academic.id });
  syncAcademicMirrors(db);
  writeDB(db);
  return res.json(normalizeSession(buildAdmissionSessionRow(db, academic)));
});

router.get("/admin/classes", auth(), requireRole(...ADMISSIONS_ADMIN_ROLES), (req, res) => {
  const db = readDB();
  ensureAdmissionCollections(db);
  const rows = (db.admissionClasses || []).slice().sort((a, b) => str(a.className).localeCompare(str(b.className)));
  writeDB(db);
  return res.json(rows);
});

router.post("/admin/classes", auth(), requireRole(...ADMISSIONS_ADMIN_ROLES), (req, res) => {
  const body = req.body || {};
  const className = str(body.className || body.name);
  if (!className) return res.status(400).json({ message: "className is required" });
  const legacy = getLegacyClassMapping(className);
  if (legacy) {
    return res.status(400).json({ message: `${className} is preserved for history only. Use ${legacy.targetClassName || "an active class"} for current admissions.` });
  }

  const db = readDB();
  ensureAdmissionCollections(db);

  const exists = (db.admissionClasses || []).some((row) => normalizeClassKey(row.className) === normalizeClassKey(className));
  if (exists) return res.status(409).json({ message: "Admission class already exists" });

  const created = normalizeAdmissionClass({
    id: normalizeClassId(className),
    className,
    section: body.section,
    level: body.level,
    capacity: body.capacity,
    formFee: body.formFee,
    status: body.status || "OPEN",
    requiredDocuments: Array.isArray(body.requiredDocuments) ? body.requiredDocuments : getRequiredDocumentsForClassName(className),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });

  db.admissionClasses.unshift(created);
  writeDB(db);
  return res.status(201).json(created);
});

router.patch("/admin/classes/:id", auth(), requireRole(...ADMISSIONS_ADMIN_ROLES), (req, res) => {
  const db = readDB();
  ensureAdmissionCollections(db);

  const idx = (db.admissionClasses || []).findIndex((row) => str(row.id) === str(req.params.id));
  if (idx < 0) return res.status(404).json({ message: "Admission class not found" });

  const current = normalizeAdmissionClass(db.admissionClasses[idx]);
  const body = req.body || {};

  const next = normalizeAdmissionClass({
    ...current,
    className: body.className !== undefined ? str(body.className) : current.className,
    section: body.section !== undefined ? str(body.section) : current.section,
    level: body.level !== undefined ? str(body.level) : current.level,
    capacity: body.capacity !== undefined ? num(body.capacity, current.capacity) : current.capacity,
    formFee: body.formFee !== undefined ? num(body.formFee, current.formFee) : current.formFee,
    status: body.status !== undefined ? str(body.status) : current.status,
    requiredDocuments: Array.isArray(body.requiredDocuments) ? body.requiredDocuments : current.requiredDocuments,
    updatedAt: nowIso(),
  });

  db.admissionClasses[idx] = next;
  writeDB(db);
  return res.json(next);
});

router.get("/", auth(), requireRole(...ADMISSIONS_ADMIN_ROLES), (req, res) => {
  const db = readDB();
  ensureAdmissionCollections(db);

  const rows = getAdmissions(db).map((item) => enrichApplication(db, item));
  const filtered = resolveApplicationFilters(rows, req.query || {});

  writeDB(db);
  return res.json(filtered);
});

router.get("/admin/applications", auth(), requireRole(...ADMISSIONS_ADMIN_ROLES), (req, res) => {
  const db = readDB();
  ensureAdmissionCollections(db);

  const rows = getAdmissions(db).map((item) => enrichApplication(db, item));
  const filtered = resolveApplicationFilters(rows, req.query || {});

  writeDB(db);
  return res.json(filtered);
});

router.get("/:id", auth(), requireRole(...ADMISSIONS_ADMIN_ROLES), (req, res) => {
  const db = readDB();
  ensureAdmissionCollections(db);

  const rows = getAdmissions(db);
  const item = rows.find((x) => str(x.id) === str(req.params.id));
  if (!item) return res.status(404).json({ message: "Application not found" });

  writeDB(db);
  return res.json(enrichApplication(db, item));
});

router.patch("/admin/applications/:id/archive", auth(), requireRole(...ADMISSIONS_ADMIN_ROLES), (req, res) => {
  const db = readDB();
  ensureAdmissionCollections(db);

  const rows = getAdmissions(db);
  const item = rows.find((x) => str(x.id) === str(req.params.id));
  if (!item) return res.status(404).json({ message: "Application not found" });

  const shouldArchive = req.body?.archived !== undefined ? bool(req.body.archived) : true;
  const note = str(req.body?.note);

  item.isArchived = shouldArchive;
  item.archivedAt = shouldArchive ? nowIso() : "";
  item.archivedById = shouldArchive ? str(req.user.id) : "";
  item.archivedByName = shouldArchive ? str(req.user.name) : "";
  item.updatedAt = nowIso();

  pushStatusHistory(item, {
    status: item.status,
    byId: req.user.id,
    byName: req.user.name,
    note: note || (shouldArchive ? "Application archived by admissions admin" : "Application restored by admissions admin"),
  });

  writeDB(db);
  return res.json(enrichApplication(db, item));
});

router.delete("/admin/applications/:id", auth(), requireRole(...ADMISSIONS_ADMIN_ROLES), (req, res) => {
  const db = readDB();
  ensureAdmissionCollections(db);

  const rows = getAdmissions(db);
  const idx = rows.findIndex((x) => str(x.id) === str(req.params.id));
  if (idx < 0) return res.status(404).json({ message: "Application not found" });

  const item = rows[idx];
  if (item.status === "ENROLLED" || str(item.enrollment?.studentId)) {
    return res.status(409).json({ message: "Enrolled application cannot be deleted. Archive it instead." });
  }

  db.admissions = rows.filter((x) => str(x.id) !== str(req.params.id));
  writeDB(db);
  return res.json({ ok: true });
});
router.patch("/admin/applications/:id/reopen", auth(), requireRole(...ADMISSIONS_ADMIN_ROLES), (req, res) => {
  const db = readDB();
  ensureAdmissionCollections(db);

  const rows = getAdmissions(db);
  const item = rows.find((x) => str(x.id) === str(req.params.id));
  if (!item) return res.status(404).json({ message: "Application not found" });

  updateRecordStatus(item, "IN_PROGRESS", req.user, str(req.body?.note) || "Application reopened for applicant edits");
  writeDB(db);
  return res.json(enrichApplication(db, item));
});

router.patch("/admin/applications/:id/review", auth(), requireRole(...ADMISSIONS_ADMIN_ROLES), (req, res) => {
  const db = readDB();
  ensureAdmissionCollections(db);

  const rows = getAdmissions(db);
  const item = rows.find((x) => str(x.id) === str(req.params.id));
  if (!item) return res.status(404).json({ message: "Application not found" });

  const body = req.body || {};

  if (body.reviewChecklist !== undefined) {
    item.reviewChecklist = {
      ...item.reviewChecklist,
      personalComplete: body.reviewChecklist.personalComplete !== undefined ? bool(body.reviewChecklist.personalComplete) : item.reviewChecklist.personalComplete,
      parentComplete: body.reviewChecklist.parentComplete !== undefined ? bool(body.reviewChecklist.parentComplete) : item.reviewChecklist.parentComplete,
      academicComplete: body.reviewChecklist.academicComplete !== undefined ? bool(body.reviewChecklist.academicComplete) : item.reviewChecklist.academicComplete,
      documentsComplete: body.reviewChecklist.documentsComplete !== undefined ? bool(body.reviewChecklist.documentsComplete) : item.reviewChecklist.documentsComplete,
      paymentVerified: body.reviewChecklist.paymentVerified !== undefined ? bool(body.reviewChecklist.paymentVerified) : item.reviewChecklist.paymentVerified,
      academicAcceptable: body.reviewChecklist.academicAcceptable !== undefined ? bool(body.reviewChecklist.academicAcceptable) : item.reviewChecklist.academicAcceptable,
    };
  }

  if (body.reviewNotes !== undefined) item.reviewNotes = str(body.reviewNotes);
  if (body.assignedOfficerName !== undefined) item.assignedOfficerName = str(body.assignedOfficerName);
  if (body.assignedOfficerId !== undefined) item.assignedOfficerId = str(body.assignedOfficerId);

  if (body.status !== undefined) {
    updateRecordStatus(item, body.status, req.user, body.note || "Admissions review status updated");
  } else {
    item.updatedAt = nowIso();
    if (str(item.status) === "SUBMITTED") {
      updateRecordStatus(item, "UNDER_REVIEW", req.user, body.note || "Admissions review started");
    }
  }

  writeDB(db);
  return res.json(enrichApplication(db, item));
});
router.patch("/admin/applications/:id/document", auth(), requireRole(...ADMISSIONS_ADMIN_ROLES), (req, res) => {
  const db = readDB();
  ensureAdmissionCollections(db);

  const rows = getAdmissions(db);
  const item = rows.find((x) => str(x.id) === str(req.params.id));
  if (!item) return res.status(404).json({ message: "Application not found" });

  const key = str(req.body?.key);
  const status = str(req.body?.status).toUpperCase();
  const note = str(req.body?.note);

  if (!DOCUMENT_KEYS.includes(key)) {
    return res.status(400).json({ message: "Invalid document key" });
  }

  if (!["PENDING", "VERIFIED", "REJECTED"].includes(status)) {
    return res.status(400).json({ message: "Invalid document status" });
  }

  item.documentStatuses[key] = status;
  item.updatedAt = nowIso();

  pushStatusHistory(item, {
    status: item.status,
    byId: req.user.id,
    byName: req.user.name,
    note: note || `${toTitle(key.replace(/Url$/, "").replace(/([A-Z])/g, " $1"))} marked as ${status}`,
  });

  writeDB(db);
  return res.json(enrichApplication(db, item));
});

router.patch("/admin/applications/:id/screening", auth(), requireRole(...ADMISSIONS_ADMIN_ROLES), (req, res) => {
  const db = readDB();
  ensureAdmissionCollections(db);

  const rows = getAdmissions(db);
  const item = rows.find((x) => str(x.id) === str(req.params.id));
  if (!item) return res.status(404).json({ message: "Application not found" });

  const body = req.body || {};
  item.screening = {
    ...item.screening,
    type: body.type !== undefined ? str(body.type) : item.screening.type,
    date: body.date !== undefined ? str(body.date) : item.screening.date,
    time: body.time !== undefined ? str(body.time) : item.screening.time,
    venue: body.venue !== undefined ? str(body.venue) : item.screening.venue,
    instructions: body.instructions !== undefined ? str(body.instructions) : item.screening.instructions,
    status: body.screeningStatus !== undefined ? str(body.screeningStatus) : body.status !== undefined ? str(body.status) : item.screening.status,
    score: body.score !== undefined ? num(body.score, "") : item.screening.score,
    remarks: body.remarks !== undefined ? str(body.remarks) : item.screening.remarks,
    updatedAt: nowIso(),
  };

  const hasSchedule = str(item.screening.date) && str(item.screening.time);
  const isCompleted = str(item.screening.status).toUpperCase() === "COMPLETED" || item.screening.score !== "";

  if (isCompleted) {
    updateRecordStatus(item, "SCREENING_COMPLETED", req.user, str(body.note) || "Screening result updated");
  } else if (hasSchedule) {
    updateRecordStatus(item, "SCREENING_SCHEDULED", req.user, str(body.note) || "Screening scheduled");
  } else {
    item.updatedAt = nowIso();
  }

  writeDB(db);
  return res.json(enrichApplication(db, item));
});

router.patch("/admin/applications/:id/decision", auth(), requireRole(...ADMISSIONS_ADMIN_ROLES), (req, res) => {
  const db = readDB();
  ensureAdmissionCollections(db);

  const rows = getAdmissions(db);
  const item = rows.find((x) => str(x.id) === str(req.params.id));
  if (!item) return res.status(404).json({ message: "Application not found" });

  const body = req.body || {};
  const decision = str(body.decision).toUpperCase();
  if (!["ADMITTED", "REJECTED", "WAITLISTED"].includes(decision)) {
    return res.status(400).json({ message: "decision must be ADMITTED, REJECTED or WAITLISTED" });
  }

  const offeredClass = findAdmissionClass(db, body.offeredClassId || body.offeredClassName || item.classId || item.className);

  item.decision = {
    ...item.decision,
    decision,
    offeredClassId: str(offeredClass?.id || item.classId),
    offeredClassName: str(offeredClass?.className || item.className),
    note: str(body.note),
    admissionLetterUrl: body.admissionLetterUrl !== undefined ? str(body.admissionLetterUrl) : item.decision.admissionLetterUrl,
    publishedAt: nowIso(),
    publishedById: req.user.id,
    publishedByName: req.user.name,
  };

  const statusTarget = decision === "ADMITTED" ? "ADMITTED" : decision === "WAITLISTED" ? "WAITLISTED" : "REJECTED";
  updateRecordStatus(item, statusTarget, req.user, body.note || `Admission decision set to ${decision}`);

  writeDB(db);
  return res.json(enrichApplication(db, item));
});

router.patch("/admin/applications/:id/acceptance", auth(), requireRole(...ADMISSIONS_ADMIN_ROLES), (req, res) => {
  const db = readDB();
  ensureAdmissionCollections(db);

  const rows = getAdmissions(db);
  const item = rows.find((x) => str(x.id) === str(req.params.id));
  if (!item) return res.status(404).json({ message: "Application not found" });

  item.acceptanceFeePaid = bool(req.body?.paid, item.acceptanceFeePaid);
  item.acceptanceFeePaidAt = item.acceptanceFeePaid ? nowIso() : "";
  item.acceptanceFeeReference = str(req.body?.reference || item.acceptanceFeeReference);
  item.updatedAt = nowIso();

  pushStatusHistory(item, {
    status: item.status,
    byId: req.user.id,
    byName: req.user.name,
    note: str(req.body?.note) || (item.acceptanceFeePaid ? "Acceptance fee marked as paid" : "Acceptance fee reset to unpaid"),
  });

  writeDB(db);
  return res.json(enrichApplication(db, item));
});

router.patch("/admin/applications/:id/enroll", auth(), requireRole(...ADMISSIONS_ADMIN_ROLES), async (req, res) => {
  const db = readDB();
  ensureAdmissionCollections(db);

  const rows = getAdmissions(db);
  const item = rows.find((x) => str(x.id) === str(req.params.id));
  if (!item) return res.status(404).json({ message: "Application not found" });

  if (item.status !== "ADMITTED" && item.status !== "ENROLLED") {
    return res.status(409).json({ message: "Only admitted applicants can be enrolled." });
  }

  if (!item.acceptanceFeePaid && !bool(req.body?.overrideAcceptanceCheck, false)) {
    return res.status(409).json({ message: "Acceptance fee must be confirmed before enrollment." });
  }

  const assignedClass = findAdmissionClass(db, req.body?.assignedClassId || req.body?.assignedClassName || item.decision?.offeredClassId || item.classId || item.className);
  if (!assignedClass) {
    return res.status(400).json({ message: "Assigned class is invalid." });
  }

  const admissionNo = str(req.body?.admissionNo || item.enrollment?.admissionNo || createAdmissionNumber(db));

  item.enrollment.assignedClassId = assignedClass.id;
  item.enrollment.assignedClassName = assignedClass.className;

  const student = ensureStudentRecordFromApplication(db, item, admissionNo);
  item.enrollment.studentId = str(student.id);
  item.enrollment.admissionNo = admissionNo;

  const createStudentLogin = req.body?.createStudentLogin !== undefined ? bool(req.body.createStudentLogin) : true;
  const createParentLogin = req.body?.createParentLogin !== undefined ? bool(req.body.createParentLogin) : true;

  let studentUser = null;
  let parentUser = null;

  if (createStudentLogin) {
    studentUser = await ensurePortalUserFromApplication(db, {
      role: "STUDENT",
      application: item,
      preferredUsername: req.body?.studentUsername,
      preferredPassword: req.body?.studentPassword,
      fallbackPrefix: `${str(item.personal.firstName).toLowerCase()}.${str(item.personal.surname).toLowerCase()}.std`,
      linkStudentId: student.id,
    });

    item.enrollment.studentUsername = str(studentUser.username);
  }

  if (createParentLogin) {
    parentUser = await ensurePortalUserFromApplication(db, {
      role: "PARENT",
      application: item,
      preferredUsername: req.body?.parentUsername,
      preferredPassword: req.body?.parentPassword,
      fallbackPrefix: `${str(item.personal.surname).toLowerCase()}.parent`,
      linkStudentIds: [student.id],
    });

    item.enrollment.parentUserId = str(parentUser.id);
    item.enrollment.parentUsername = str(parentUser.username);
  }

  item.enrollment.enrolledAt = nowIso();
  item.enrollment.enrolledById = req.user.id;
  item.enrollment.enrolledByName = req.user.name;

  updateRecordStatus(item, "ENROLLED", req.user, str(req.body?.note) || "Applicant converted to enrolled student");

  writeDB(db);
  return res.json({
    application: enrichApplication(db, item),
    student,
    studentUser: studentUser ? sanitizeUser(studentUser) : null,
    parentUser: parentUser ? sanitizeUser(parentUser) : null,
  });
});

router.post("/", (req, res) => {
  const { childName, applyingClass, childAge, parentName, email, phone, notes } = req.body || {};

  if (!childName || !applyingClass || !childAge || !parentName || !email || !phone) {
    return res.status(400).json({
      message: "childName, applyingClass, childAge, parentName, email, and phone are required",
    });
  }

  const age = Number(childAge);
  if (!Number.isFinite(age) || age < 1 || age > 20) {
    return res.status(400).json({ message: "childAge must be between 1 and 20" });
  }

  const db = readDB();
  ensureAdmissionCollections(db);

  const child = splitName(childName);
  const admissionClass = findAdmissionClass(db, applyingClass);
  const session = findActiveAdmissionSession(db);

  const row = ensureAdmissionRecordShape(
    {
      id: nanoid(),
      applicationNo: createApplicationNumber(db),
      applicantUserId: "",
      applicantUsername: "public-inquiry",
      applicantName: str(parentName),
      sessionId: session?.id,
      sessionName: session?.title,
      classId: admissionClass?.id,
      className: admissionClass?.className || str(applyingClass),
      status: "SUBMITTED",
      personal: {
        surname: child.lastName,
        firstName: child.firstName,
      },
      parentInfo: {
        guardianName: str(parentName),
        guardianPhone: str(phone),
        guardianEmail: str(email),
      },
      notes: str(notes),
      submittedAt: nowIso(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      statusHistory: [
        {
          id: nanoid(),
          status: "SUBMITTED",
          changedAt: nowIso(),
          changedById: "",
          changedByName: "Public Inquiry",
          note: `Initial inquiry submitted. Child age: ${age}`,
        },
      ],
    },
    db
  );

  db.admissions.unshift(row);
  writeDB(db);
  return res.status(201).json(enrichApplication(db, row));
});

router.patch("/:id/workflow", auth(), requireRole(...ADMISSIONS_ADMIN_ROLES), (req, res) => {
  const db = readDB();
  ensureAdmissionCollections(db);

  const rows = getAdmissions(db);
  const current = rows.find((x) => str(x.id) === str(req.params.id));
  if (!current) return res.status(404).json({ message: "Application not found" });

  const patch = parseWorkflowPatch(req.body || {});
  if (patch.invalidStatus) {
    return res.status(400).json({ message: "Invalid workflow status" });
  }

  if (patch.status) {
    updateRecordStatus(current, patch.status, req.user, patch.note || `Workflow changed to ${patch.status}`);
  } else if (patch.note) {
    pushStatusHistory(current, {
      status: current.status,
      byId: req.user.id,
      byName: req.user.name,
      note: patch.note,
    });
    current.updatedAt = nowIso();
  }

  if (patch.assignedOfficerId !== undefined) current.assignedOfficerId = patch.assignedOfficerId;
  if (patch.assignedOfficerName !== undefined) current.assignedOfficerName = patch.assignedOfficerName;

  writeDB(db);
  return res.json(enrichApplication(db, current));
});

router.patch("/:id/status", auth(), requireRole(...ADMISSIONS_ADMIN_ROLES), (req, res) => {
  const nextStatus = normalizeStatusInput(req.body?.status);
  if (!ADMISSION_STATUSES.includes(nextStatus)) {
    return res.status(400).json({ message: "Invalid workflow status" });
  }

  const db = readDB();
  ensureAdmissionCollections(db);
  const rows = getAdmissions(db);
  const current = rows.find((x) => str(x.id) === str(req.params.id));

  if (!current) return res.status(404).json({ message: "Application not found" });

  updateRecordStatus(current, nextStatus, req.user, `Status changed to ${nextStatus}`);
  writeDB(db);

  return res.json(enrichApplication(db, current));
});

module.exports = router;







