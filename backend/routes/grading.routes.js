
const express = require("express");
const { nanoid } = require("nanoid");
const { auth, requireRole } = require("../middleware/auth");
const { readDB, writeDB } = require("../lib/jsonStore");
const { SUBJECT_OPTIONS, CLASS_SUBJECTS, normalizeSubject } = require("../lib/subjects");
const { isTeacherRole } = require("../lib/roles");
const { ensureAcademicScope } = require("../lib/academicScope");
const {
  ensureAcademicSystemShape,
  sortAcademicClasses,
  supportsNigerianCA,
} = require("../lib/academicSystems");

const router = express.Router();

const CURRENT_TERM = String(process.env.CURRENT_TERM || "First Term");
const CURRENT_SESSION = String(process.env.CURRENT_SESSION || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`);

function str(value) {
  return String(value || "").trim();
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeKey(value) {
  return str(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function inferSectionFromClassName(name) {
  const safe = normalizeKey(name);
  if (!safe) return "General";
  if (safe.includes("creche") || safe.includes("nursery") || safe.includes("reception") || safe.includes("playgroup")) return "Early Years";
  if (safe.includes("basic")) return "Basic School";
  if (safe.includes("jss") || safe.includes("junior")) return "Junior Secondary";
  if (safe.includes("ss") || safe.includes("sss") || safe.includes("senior")) return "Senior Secondary";
  return "General";
}

function sortClasses(rows) {
  return sortAcademicClasses(Array.isArray(rows) ? rows : []);
}

function supportsNigerianClass(row) {
  return supportsNigerianCA(row?.id || row?.classId) || supportsNigerianCA(row?.name || row?.className);
}

function ensureAcademicMeta(db) {
  let mutated = false;
  if (!Array.isArray(db.academicSessions)) {
    db.academicSessions = [];
    mutated = true;
  }
  if (!Array.isArray(db.terms)) {
    db.terms = [];
    mutated = true;
  }
  if (!Array.isArray(db.classes)) {
    db.classes = [];
    mutated = true;
  }

  const scope = ensureAcademicScope(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });
  const session = scope.activeSession || db.academicSessions.find((item) => item.isActive) || db.academicSessions[0] || null;
  mutated = true;

  const terms = ["First Term", "Second Term", "Third Term"];
  terms.forEach((termName, idx) => {
    const exists = db.terms.some((item) => str(item.sessionId) === str(session.id) && normalizeKey(item.termName) === normalizeKey(termName));
    if (exists) return;
    db.terms.push({
      id: `${session.id}-term-${idx + 1}`,
      sessionId: session.id,
      termName,
      position: idx + 1,
      isActive: normalizeKey(termName) === normalizeKey(CURRENT_TERM),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    mutated = true;
  });

  const classShapeBefore = JSON.stringify(db.classes || []);
  ensureAcademicSystemShape(db);
  if (classShapeBefore !== JSON.stringify(db.classes || [])) mutated = true;

  return mutated;
}

function ensureCollections(db) {
  let mutated = ensureAcademicMeta(db);

  [
    "gradingPolicies",
    "assessmentComponents",
    "gradeScales",
    "classSubjectOfferings",
    "scoreSheets",
    "studentScores",
    "computedResults",
    "termResultSummaries",
    "resultApprovals",
    "gradingLogs",
  ].forEach((key) => {
    if (!Array.isArray(db[key])) {
      db[key] = [];
      mutated = true;
    }
  });

  if ((db.gradingPolicies || []).length === 0) {
    const now = nowIso();
    const pid = `policy-${nanoid(8)}`;
    db.gradingPolicies.push({
      id: pid,
      policyName: "Default A-F Policy",
      section: "Basic School,Junior Secondary,Senior Secondary",
      classId: "",
      sessionId: "",
      termId: "",
      totalScore: 100,
      gradeMode: "NUMERIC",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    [
      ["Test 1", "TEST1", 10, false, 1],
      ["Test 2", "TEST2", 10, false, 2],
      ["Assignment", "ASSIGNMENT", 10, false, 3],
      ["Exam", "EXAM", 70, true, 4],
    ].forEach(([name, code, maxScore, isExam, position]) => {
      db.assessmentComponents.push({
        id: `cmp-${nanoid(9)}`,
        gradingPolicyId: pid,
        componentName: name,
        componentCode: code,
        maxScore,
        position,
        isExamComponent: isExam,
        createdAt: now,
        updatedAt: now,
      });
    });

    [
      ["A", 70, 100, 5, "Excellent"],
      ["B", 60, 69, 4, "Very Good"],
      ["C", 50, 59, 3, "Good"],
      ["D", 45, 49, 2, "Fair"],
      ["E", 40, 44, 1, "Pass"],
      ["F", 0, 39, 0, "Fail"],
    ].forEach(([label, min, max, point, remark]) => {
      db.gradeScales.push({
        id: `gsc-${nanoid(9)}`,
        gradingPolicyId: pid,
        gradeLabel: label,
        minScore: min,
        maxScore: max,
        gradePoint: point,
        remark,
        createdAt: now,
        updatedAt: now,
      });
    });

    mutated = true;
  }

  return mutated;
}

function writeIfNeeded(db, mutated) {
  if (mutated) writeDB(db);
}

function getClassByInput(db, value) {
  const safe = str(value);
  if (!safe) return null;
  const key = normalizeKey(safe);
  return sortClasses(db.classes || []).find((item) => str(item.id) === safe || normalizeKey(item.name) === key) || null;
}

function getSessionByInput(db, value) {
  const safe = str(value);
  if (!safe) return null;
  return (db.academicSessions || []).find((item) => str(item.id) === safe || normalizeKey(item.sessionName) === normalizeKey(safe)) || null;
}

function getTermByInput(db, value, sessionId = "") {
  const safe = str(value);
  if (!safe) return null;
  return (db.terms || []).find((item) => {
    if (sessionId && str(item.sessionId) !== str(sessionId)) return false;
    return str(item.id) === safe || normalizeKey(item.termName) === normalizeKey(safe);
  }) || null;
}

function getPolicyByInput(db, value) {
  const safe = str(value);
  if (!safe) return null;
  return (db.gradingPolicies || []).find((item) => str(item.id) === safe || normalizeKey(item.policyName) === normalizeKey(safe)) || null;
}

function getPolicyComponents(db, policyId) {
  return (db.assessmentComponents || [])
    .filter((item) => str(item.gradingPolicyId) === str(policyId))
    .sort((a, b) => Number(a.position || 999) - Number(b.position || 999));
}

function getPolicyScales(db, policyId) {
  return (db.gradeScales || [])
    .filter((item) => str(item.gradingPolicyId) === str(policyId))
    .sort((a, b) => Number(b.minScore || 0) - Number(a.minScore || 0));
}

function findScale(scales, score) {
  const value = Number(score || 0);
  return (Array.isArray(scales) ? scales : []).find(
    (item) => value >= Number(item.minScore) && value <= Number(item.maxScore)
  ) || null;
}

function getOfferingById(db, offeringId) {
  return (db.classSubjectOfferings || []).find((item) => str(item.id) === str(offeringId)) || null;
}

function isTeacherForOffering(user, offering) {
  if (!user || !offering) return false;
  const role = str(user.role).toUpperCase();
  if (role === "ADMIN") return true;
  return role === "TEACHER" && str(offering.teacherUserId) === str(user.id);
}

function getAccessibleOfferings(db, user) {
  const role = str(user?.role).toUpperCase();
  const offerings = (Array.isArray(db.classSubjectOfferings) ? db.classSubjectOfferings : [])
    .filter((item) => supportsNigerianClass(item));
  if (role === "ADMIN") return offerings;
  if (role === "TEACHER") return offerings.filter((item) => str(item.teacherUserId) === str(user.id));
  return [];
}

function getStudentsForClass(db, classId, className = "") {
  const safeClassId = str(classId);
  const safeClassName = normalizeKey(className);
  return (db.students || []).filter((item) => {
    if (safeClassId && str(item.classId) === safeClassId) return true;
    if (safeClassName && normalizeKey(item.className) === safeClassName) return true;
    return false;
  });
}

function resolvePolicyForOffering(db, offering, explicitPolicyId = "") {
  if (str(explicitPolicyId)) {
    const found = getPolicyByInput(db, explicitPolicyId);
    if (found) return found;
  }

  const cls = getClassByInput(db, offering?.classId || offering?.className);
  const section = str(cls?.section || offering?.section || inferSectionFromClassName(offering?.className));

  const byClass = (db.gradingPolicies || []).find(
    (item) => item.isActive && str(item.classId) && str(item.classId) === str(cls?.id)
  );
  if (byClass) return byClass;

  const bySection = (db.gradingPolicies || []).find((item) => {
    if (!item.isActive) return false;
    const scopes = str(item.section)
      .split(",")
      .map((x) => normalizeKey(x))
      .filter(Boolean);
    return scopes.includes(normalizeKey(section));
  });
  if (bySection) return bySection;

  return (db.gradingPolicies || []).find((item) => item.isActive) || db.gradingPolicies[0] || null;
}

function logAction(db, userId, action, targetType, targetId, metadata = {}) {
  db.gradingLogs.unshift({
    id: `glog-${nanoid(10)}`,
    userId: str(userId),
    action: str(action),
    targetType: str(targetType),
    targetId: str(targetId),
    metadata,
    createdAt: nowIso(),
  });
}

function buildSheetDetail(db, sheet) {
  const offering = getOfferingById(db, sheet?.classSubjectOfferingId);
  const policy = resolvePolicyForOffering(db, offering, offering?.gradingPolicyId);
  const components = getPolicyComponents(db, policy?.id);

  const students = getStudentsForClass(db, offering?.classId, offering?.className)
    .map((item) => ({ id: str(item.id), name: str(item.name), classId: str(item.classId), className: str(item.className) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const scoreRows = (db.studentScores || []).filter((item) => str(item.scoreSheetId) === str(sheet.id));
  const scoreMap = {};
  scoreRows.forEach((row) => {
    const sid = str(row.studentUserId);
    const cid = str(row.assessmentComponentId);
    if (!scoreMap[sid]) scoreMap[sid] = {};
    scoreMap[sid][cid] = Number(row.score || 0);
  });

  return { sheet, offering, policy, components, students, scoreMap };
}

router.post("/", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const score = toNumber(req.body?.score, NaN);
  if (!Number.isFinite(score)) return res.status(400).json({ message: "score must be a number" });

  const db = readDB();
  const mutated = ensureCollections(db);
  const policy = (db.gradingPolicies || []).find((item) => item.isActive) || db.gradingPolicies[0] || null;
  const matched = findScale(getPolicyScales(db, policy?.id), score);
  writeIfNeeded(db, mutated);

  return res.json({
    grade: str(matched?.gradeLabel || "F"),
    remark: str(matched?.remark || "Fail"),
    gradePoint: Number(matched?.gradePoint || 0),
  });
});

router.get("/dashboard", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);

  const offerings = getAccessibleOfferings(db, req.user);
  const offeringIds = new Set(offerings.map((item) => str(item.id)));
  const sheets = (db.scoreSheets || []).filter((item) => offeringIds.has(str(item.classSubjectOfferingId)));

  writeIfNeeded(db, mutated);

  return res.json({
    totals: {
      activePolicies: (db.gradingPolicies || []).filter((item) => item.isActive).length,
      scoreSheetsDraft: sheets.filter((item) => str(item.status).toUpperCase() === "DRAFT").length,
      submittedForReview: sheets.filter((item) => str(item.status).toUpperCase() === "SUBMITTED").length,
      approvedAndLocked: sheets.filter((item) => ["APPROVED", "LOCKED"].includes(str(item.status).toUpperCase())).length,
      computedResults: (db.computedResults || []).filter((item) => offeringIds.has(str(item.classSubjectOfferingId))).length,
      termSummaries: (db.termResultSummaries || []).length,
    },
    recentActivity: (db.gradingLogs || []).slice(0, 10),
  });
});

router.get("/metadata", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);

  const classes = sortClasses(db.classes || [])
    .filter((item) => item.isActive !== false && supportsNigerianClass(item))
    .map((item) => ({
      id: str(item.id),
      name: str(item.name),
      section: str(item.section || inferSectionFromClassName(item.name)),
      level: str(item.level),
      academicSystem: str(item.academicSystem),
      curriculumFramework: str(item.curriculumFramework),
      assessmentFramework: str(item.assessmentFramework),
      order: Number(item.order ?? item.displayOrder ?? 999),
      displayOrder: Number(item.displayOrder ?? item.order ?? 999),
    }));

  writeIfNeeded(db, mutated);

  return res.json({
    classes,
    subjects: SUBJECT_OPTIONS,
    classSubjects: CLASS_SUBJECTS,
    sessions: db.academicSessions || [],
    terms: db.terms || [],
    teachers: (db.users || [])
      .filter((item) => str(item.role).toUpperCase() === "TEACHER")
      .map((item) => ({ id: str(item.id), name: str(item.name), username: str(item.username) })),
    students: (db.students || []).map((item) => ({
      id: str(item.id),
      name: str(item.name),
      classId: str(item.classId),
      className: str(item.className),
    })),
    policies: db.gradingPolicies || [],
    offerings: getAccessibleOfferings(db, req.user),
  });
});

router.get("/policies", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);
  const policies = (db.gradingPolicies || []).map((item) => ({
    ...item,
    components: getPolicyComponents(db, item.id),
    gradeScales: getPolicyScales(db, item.id),
  }));
  writeIfNeeded(db, mutated);
  return res.json(policies);
});

router.post("/policies", auth(), requireRole("ADMIN"), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);
  const policyName = str(req.body?.policyName);
  if (!policyName) return res.status(400).json({ message: "policyName is required" });

  const row = {
    id: `pol-${nanoid(10)}`,
    policyName,
    section: str(req.body?.section),
    classId: str(req.body?.classId),
    sessionId: str(req.body?.sessionId),
    termId: str(req.body?.termId),
    totalScore: toNumber(req.body?.totalScore, 100) || 100,
    gradeMode: str(req.body?.gradeMode || "NUMERIC").toUpperCase() === "DESCRIPTIVE" ? "DESCRIPTIVE" : "NUMERIC",
    isActive: Boolean(req.body?.isActive),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  db.gradingPolicies.unshift(row);
  if (row.isActive) {
    db.gradingPolicies = db.gradingPolicies.map((item) => {
      if (str(item.id) === str(row.id)) return item;
      if (str(row.classId) && str(item.classId) === str(row.classId)) return { ...item, isActive: false, updatedAt: nowIso() };
      return item;
    });
  }

  logAction(db, req.user.id, "policy_created", "grading_policy", row.id, { policyName });
  writeDB(db);
  return res.status(201).json(row);
});

router.post("/policies/:policyId/components", auth(), requireRole("ADMIN"), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);
  const policyId = str(req.params.policyId);
  const policy = getPolicyByInput(db, policyId);
  if (!policy) return res.status(404).json({ message: "Policy not found" });

  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
  if (rows.length === 0) return res.status(400).json({ message: "rows is required" });

  const valid = rows
    .map((row, idx) => ({
      componentName: str(row.componentName),
      componentCode: str(row.componentCode || row.componentName).toUpperCase().replace(/\s+/g, "_"),
      maxScore: toNumber(row.maxScore, 0),
      position: toNumber(row.position, idx + 1),
      isExamComponent: Boolean(row.isExamComponent),
    }))
    .filter((row) => row.componentName && row.maxScore > 0)
    .sort((a, b) => Number(a.position) - Number(b.position));

  if (valid.length === 0) return res.status(400).json({ message: "No valid components provided" });

  valid.forEach((row) => {
    const idx = (db.assessmentComponents || []).findIndex(
      (item) => str(item.gradingPolicyId) === policyId && normalizeKey(item.componentCode) === normalizeKey(row.componentCode)
    );
    if (idx >= 0) {
      db.assessmentComponents[idx] = { ...db.assessmentComponents[idx], ...row, updatedAt: nowIso() };
    } else {
      db.assessmentComponents.push({
        id: `cmp-${nanoid(9)}`,
        gradingPolicyId: policyId,
        ...row,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
    }
  });

  logAction(db, req.user.id, "components_saved", "grading_policy", policyId, { count: valid.length });
  writeDB(db);
  return res.json(getPolicyComponents(db, policyId));
});

router.post("/policies/:policyId/grade-scales", auth(), requireRole("ADMIN"), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);
  const policyId = str(req.params.policyId);
  const policy = getPolicyByInput(db, policyId);
  if (!policy) return res.status(404).json({ message: "Policy not found" });

  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
  if (rows.length === 0) return res.status(400).json({ message: "rows is required" });

  const valid = rows
    .map((row) => {
      const min = toNumber(row.minScore, NaN);
      const max = toNumber(row.maxScore, NaN);
      return {
        gradeLabel: str(row.gradeLabel),
        minScore: Number.isFinite(min) && Number.isFinite(max) ? Math.min(min, max) : NaN,
        maxScore: Number.isFinite(min) && Number.isFinite(max) ? Math.max(min, max) : NaN,
        gradePoint: toNumber(row.gradePoint, 0),
        remark: str(row.remark || row.gradeLabel),
      };
    })
    .filter((row) => row.gradeLabel && Number.isFinite(row.minScore) && Number.isFinite(row.maxScore))
    .sort((a, b) => Number(b.minScore) - Number(a.minScore));

  if (valid.length === 0) return res.status(400).json({ message: "No valid grade scales provided" });

  db.gradeScales = (db.gradeScales || []).filter((item) => str(item.gradingPolicyId) !== policyId);
  valid.forEach((row) => {
    db.gradeScales.push({
      id: `gsc-${nanoid(9)}`,
      gradingPolicyId: policyId,
      ...row,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
  });

  logAction(db, req.user.id, "grade_scales_saved", "grading_policy", policyId, { count: valid.length });
  writeDB(db);
  return res.json(getPolicyScales(db, policyId));
});

router.get("/offerings", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);
  writeIfNeeded(db, mutated);
  return res.json(getAccessibleOfferings(db, req.user));
});

router.post("/offerings", auth(), requireRole("ADMIN"), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);

  const cls = getClassByInput(db, req.body?.classId || req.body?.className);
  if (!cls) return res.status(400).json({ message: "Invalid class" });
  if (cls.isActive === false || !supportsNigerianClass(cls)) {
    return res.status(400).json({ message: "Early Years classes use EYFS AMES developmental assessment, not Nigerian grading score sheets." });
  }

  const subject = normalizeSubject(req.body?.subject || req.body?.subjectName || "");
  if (!subject) return res.status(400).json({ message: "subject is required" });

  const teacher = (db.users || []).find((item) => str(item.id) === str(req.body?.teacherUserId) && isTeacherRole(item.role));
  if (!teacher) return res.status(400).json({ message: "Valid teacherUserId is required" });

  const session = getSessionByInput(db, req.body?.sessionId || req.body?.sessionName) || (db.academicSessions || [])[0] || null;
  const term = getTermByInput(db, req.body?.termId || req.body?.termName, session?.id) || (db.terms || []).find((item) => str(item.sessionId) === str(session?.id)) || null;
  if (!session || !term) return res.status(400).json({ message: "Session/term could not be resolved" });

  const policy = resolvePolicyForOffering(db, { classId: cls.id, className: cls.name, section: cls.section }, req.body?.gradingPolicyId);
  if (!policy) return res.status(400).json({ message: "No grading policy available" });

  const exists = (db.classSubjectOfferings || []).find(
    (item) => str(item.classId) === str(cls.id) && normalizeKey(item.subject) === normalizeKey(subject) && str(item.sessionId) === str(session.id) && str(item.termId) === str(term.id)
  );
  if (exists) return res.status(409).json({ message: "Offering already exists for this class/subject/term" });

  const row = {
    id: `off-${nanoid(10)}`,
    classId: str(cls.id),
    className: str(cls.name),
    section: str(cls.section || inferSectionFromClassName(cls.name)),
    subject,
    teacherUserId: str(teacher.id),
    teacherName: str(teacher.name),
    sessionId: str(session.id),
    sessionName: str(session.sessionName),
    termId: str(term.id),
    termName: str(term.termName),
    gradingPolicyId: str(policy.id),
    status: str(req.body?.status || "ACTIVE").toUpperCase(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  db.classSubjectOfferings.unshift(row);
  logAction(db, req.user.id, "offering_created", "class_subject_offering", row.id, { classId: row.classId, subject: row.subject });
  writeDB(db);
  return res.status(201).json(row);
});

function computeOfferingResults(db, offering, sheet, actorId = "") {
  if (!supportsNigerianClass(offering)) {
    throw new Error("Early Years classes use EYFS AMES developmental assessment, not Nigerian grading score sheets.");
  }

  const policy = resolvePolicyForOffering(db, offering, offering?.gradingPolicyId);
  if (!policy) throw new Error("No grading policy mapped to this offering");

  const components = getPolicyComponents(db, policy.id);
  if (components.length === 0) throw new Error("No assessment components found for policy");

  const scales = getPolicyScales(db, policy.id);
  const students = getStudentsForClass(db, offering.classId, offering.className);
  const scoreRows = (db.studentScores || []).filter((item) => str(item.scoreSheetId) === str(sheet.id));

  const byStudent = new Map();
  scoreRows.forEach((row) => {
    const sid = str(row.studentUserId);
    if (!byStudent.has(sid)) byStudent.set(sid, []);
    byStudent.get(sid).push(row);
  });

  if (students.length === 0) {
    for (const sid of byStudent.keys()) {
      students.push({ id: sid, name: sid, classId: offering.classId, className: offering.className });
    }
  }

  const now = nowIso();
  const touched = [];

  students.forEach((student) => {
    const sid = str(student.id);
    const rows = byStudent.get(sid) || [];
    const valueMap = new Map(rows.map((row) => [str(row.assessmentComponentId), Number(row.score || 0)]));

    let caTotal = 0;
    let examTotal = 0;
    components.forEach((component) => {
      const score = Number(valueMap.get(str(component.id)) || 0);
      if (component.isExamComponent) examTotal += score;
      else caTotal += score;
    });

    const totalScore = caTotal + examTotal;
    const scale = findScale(scales, totalScore);

    const payload = {
      classSubjectOfferingId: str(offering.id),
      scoreSheetId: str(sheet.id),
      studentUserId: sid,
      caTotal: Number(caTotal.toFixed(2)),
      examTotal: Number(examTotal.toFixed(2)),
      totalScore: Number(totalScore.toFixed(2)),
      gradeLabel: str(scale?.gradeLabel || "F"),
      gradePoint: Number(scale?.gradePoint || 0),
      remark: str(scale?.remark || "Fail"),
      positionInSubject: 0,
      teacherComment: "",
      updatedAt: now,
    };

    const idx = (db.computedResults || []).findIndex((item) => str(item.classSubjectOfferingId) === str(offering.id) && str(item.studentUserId) === sid);
    if (idx >= 0) {
      db.computedResults[idx] = {
        ...db.computedResults[idx],
        ...payload,
        id: db.computedResults[idx].id,
        createdAt: db.computedResults[idx].createdAt || now,
      };
      touched.push(db.computedResults[idx]);
    } else {
      const row = {
        id: `cres-${nanoid(10)}`,
        ...payload,
        createdAt: now,
      };
      db.computedResults.push(row);
      touched.push(row);
    }
  });

  const nameById = new Map((db.students || []).map((item) => [str(item.id), str(item.name)]));
  const ranked = [...touched].sort((a, b) => {
    if (Number(b.totalScore) !== Number(a.totalScore)) return Number(b.totalScore) - Number(a.totalScore);
    return str(nameById.get(str(a.studentUserId))).localeCompare(str(nameById.get(str(b.studentUserId))));
  });

  let lastScore = null;
  let lastRank = 0;
  ranked.forEach((row, idx) => {
    const score = Number(row.totalScore || 0);
    if (lastScore === null || score !== lastScore) {
      lastRank = idx + 1;
      lastScore = score;
    }
    const target = (db.computedResults || []).find((item) => str(item.id) === str(row.id));
    if (target) {
      target.positionInSubject = lastRank;
      target.updatedAt = nowIso();
    }
  });

  logAction(db, actorId, "results_computed", "score_sheet", sheet.id, { offeringId: offering.id, students: touched.length });
  return (db.computedResults || []).filter((item) => str(item.classSubjectOfferingId) === str(offering.id));
}

router.get("/score-sheets", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);
  const offerings = getAccessibleOfferings(db, req.user);
  const offeringIds = new Set(offerings.map((item) => str(item.id)));

  let rows = (db.scoreSheets || []).filter((item) => offeringIds.has(str(item.classSubjectOfferingId)));
  if (str(req.query.offeringId)) rows = rows.filter((item) => str(item.classSubjectOfferingId) === str(req.query.offeringId));

  rows = rows
    .map((item) => ({ ...item, offering: offerings.find((off) => str(off.id) === str(item.classSubjectOfferingId)) || null }))
    .sort((a, b) => str(b.updatedAt).localeCompare(str(a.updatedAt)));

  writeIfNeeded(db, mutated);
  return res.json(rows);
});

router.post("/score-sheets", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);
  const offering = getOfferingById(db, req.body?.classSubjectOfferingId);
  if (!offering) return res.status(400).json({ message: "Invalid classSubjectOfferingId" });
  if (!supportsNigerianClass(offering)) {
    return res.status(400).json({ message: "Early Years classes use EYFS AMES developmental assessment, not Nigerian grading score sheets." });
  }
  if (!isTeacherForOffering(req.user, offering)) return res.status(403).json({ message: "Forbidden" });

  const existing = (db.scoreSheets || []).find(
    (item) => str(item.classSubjectOfferingId) === str(offering.id) && ["DRAFT", "SUBMITTED", "APPROVED"].includes(str(item.status).toUpperCase())
  );
  if (existing) return res.json(existing);

  const row = {
    id: `sheet-${nanoid(10)}`,
    classSubjectOfferingId: str(offering.id),
    title: str(req.body?.title || `${offering.className} ${offering.subject} ${offering.termName}`),
    status: "DRAFT",
    lockedAt: "",
    lockedBy: "",
    submittedAt: "",
    approvedAt: "",
    createdBy: str(req.user.id),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  db.scoreSheets.unshift(row);
  logAction(db, req.user.id, "score_sheet_created", "score_sheet", row.id, { offeringId: offering.id });
  writeDB(db);
  return res.status(201).json(row);
});

router.get("/score-sheets/:sheetId", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);
  const sheet = (db.scoreSheets || []).find((item) => str(item.id) === str(req.params.sheetId));
  if (!sheet) return res.status(404).json({ message: "Score sheet not found" });

  const offering = getOfferingById(db, sheet.classSubjectOfferingId);
  if (!isTeacherForOffering(req.user, offering)) return res.status(403).json({ message: "Forbidden" });
  if (!supportsNigerianClass(offering)) {
    return res.status(400).json({ message: "Early Years classes use EYFS AMES developmental assessment, not Nigerian grading score sheets." });
  }

  writeIfNeeded(db, mutated);
  return res.json(buildSheetDetail(db, sheet));
});

router.post("/score-sheets/:sheetId/scores", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);
  const sheet = (db.scoreSheets || []).find((item) => str(item.id) === str(req.params.sheetId));
  if (!sheet) return res.status(404).json({ message: "Score sheet not found" });
  if (str(sheet.status).toUpperCase() === "LOCKED") return res.status(409).json({ message: "Locked score sheet cannot be edited" });

  const offering = getOfferingById(db, sheet.classSubjectOfferingId);
  if (!isTeacherForOffering(req.user, offering)) return res.status(403).json({ message: "Forbidden" });
  if (!supportsNigerianClass(offering)) {
    return res.status(400).json({ message: "Early Years classes use EYFS AMES developmental assessment, not Nigerian grading score sheets." });
  }

  const policy = resolvePolicyForOffering(db, offering, offering.gradingPolicyId);
  const components = getPolicyComponents(db, policy?.id);
  const componentMap = new Map(components.map((item) => [str(item.id), item]));

  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
  if (rows.length === 0) return res.status(400).json({ message: "rows is required" });

  let changed = 0;
  const errors = [];

  rows.forEach((row, idx) => {
    const studentUserId = str(row.studentUserId);
    const assessmentComponentId = str(row.assessmentComponentId);
    const score = toNumber(row.score, NaN);

    if (!studentUserId || !assessmentComponentId || !Number.isFinite(score)) {
      errors.push(`Row ${idx + 1}: invalid student/component/score`);
      return;
    }

    const component = componentMap.get(assessmentComponentId);
    if (!component) {
      errors.push(`Row ${idx + 1}: invalid assessment component`);
      return;
    }

    if (score < 0 || score > Number(component.maxScore)) {
      errors.push(`Row ${idx + 1}: score must be between 0 and ${component.maxScore}`);
      return;
    }

    const existingIdx = (db.studentScores || []).findIndex(
      (item) => str(item.scoreSheetId) === str(sheet.id) && str(item.studentUserId) === studentUserId && str(item.assessmentComponentId) === assessmentComponentId
    );

    if (existingIdx >= 0) {
      db.studentScores[existingIdx] = { ...db.studentScores[existingIdx], score, enteredBy: str(req.user.id), updatedAt: nowIso() };
    } else {
      db.studentScores.push({
        id: `ss-${nanoid(11)}`,
        scoreSheetId: str(sheet.id),
        studentUserId,
        assessmentComponentId,
        score,
        enteredBy: str(req.user.id),
        enteredAt: nowIso(),
        updatedAt: nowIso(),
      });
    }

    changed += 1;
  });

  const sheetIdx = (db.scoreSheets || []).findIndex((item) => str(item.id) === str(sheet.id));
  if (sheetIdx >= 0) db.scoreSheets[sheetIdx] = { ...db.scoreSheets[sheetIdx], status: "DRAFT", updatedAt: nowIso() };

  if (changed > 0) logAction(db, req.user.id, "scores_saved", "score_sheet", sheet.id, { changed, errors: errors.length });
  writeDB(db);

  return res.json({ changed, errors, detail: buildSheetDetail(db, (db.scoreSheets || [])[sheetIdx] || sheet) });
});

router.post("/score-sheets/:sheetId/submit", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);
  const sheetId = str(req.params.sheetId);
  const idx = (db.scoreSheets || []).findIndex((item) => str(item.id) === sheetId);
  if (idx < 0) return res.status(404).json({ message: "Score sheet not found" });

  const sheet = db.scoreSheets[idx];
  const offering = getOfferingById(db, sheet.classSubjectOfferingId);
  if (!isTeacherForOffering(req.user, offering)) return res.status(403).json({ message: "Forbidden" });
  if (!supportsNigerianClass(offering)) {
    return res.status(400).json({ message: "Early Years classes use EYFS AMES developmental assessment, not Nigerian grading score sheets." });
  }
  if (str(sheet.status).toUpperCase() === "LOCKED") return res.status(409).json({ message: "Locked score sheet cannot be submitted" });

  db.scoreSheets[idx] = { ...sheet, status: "SUBMITTED", submittedAt: nowIso(), updatedAt: nowIso() };
  db.resultApprovals.unshift({
    id: `rapp-${nanoid(10)}`,
    resultType: "score_sheet",
    referenceId: sheetId,
    approvedBy: "",
    approvalStatus: "PENDING",
    notes: str(req.body?.notes),
    approvedAt: "",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });

  logAction(db, req.user.id, "score_sheet_submitted", "score_sheet", sheetId, {});
  writeDB(db);
  return res.json(db.scoreSheets[idx]);
});

router.post("/score-sheets/:sheetId/approve", auth(), requireRole("ADMIN"), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);
  const sheetId = str(req.params.sheetId);
  const idx = (db.scoreSheets || []).findIndex((item) => str(item.id) === sheetId);
  if (idx < 0) return res.status(404).json({ message: "Score sheet not found" });
  const offering = getOfferingById(db, db.scoreSheets[idx].classSubjectOfferingId);
  if (!supportsNigerianClass(offering)) {
    return res.status(400).json({ message: "Early Years classes use EYFS AMES developmental assessment, not Nigerian grading score sheets." });
  }

  db.scoreSheets[idx] = { ...db.scoreSheets[idx], status: "APPROVED", approvedAt: nowIso(), updatedAt: nowIso() };

  const approval = (db.resultApprovals || []).find((item) => str(item.resultType).toLowerCase() === "score_sheet" && str(item.referenceId) === sheetId);
  if (approval) {
    approval.approvedBy = str(req.user.id);
    approval.approvalStatus = "APPROVED";
    approval.notes = str(req.body?.notes || approval.notes);
    approval.approvedAt = nowIso();
    approval.updatedAt = nowIso();
  } else {
    db.resultApprovals.unshift({
      id: `rapp-${nanoid(10)}`,
      resultType: "score_sheet",
      referenceId: sheetId,
      approvedBy: str(req.user.id),
      approvalStatus: "APPROVED",
      notes: str(req.body?.notes),
      approvedAt: nowIso(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
  }

  logAction(db, req.user.id, "score_sheet_approved", "score_sheet", sheetId, {});
  writeDB(db);
  return res.json(db.scoreSheets[idx]);
});

router.post("/score-sheets/:sheetId/lock", auth(), requireRole("ADMIN"), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);
  const sheetId = str(req.params.sheetId);
  const idx = (db.scoreSheets || []).findIndex((item) => str(item.id) === sheetId);
  if (idx < 0) return res.status(404).json({ message: "Score sheet not found" });
  const offering = getOfferingById(db, db.scoreSheets[idx].classSubjectOfferingId);
  if (!supportsNigerianClass(offering)) {
    return res.status(400).json({ message: "Early Years classes use EYFS AMES developmental assessment, not Nigerian grading score sheets." });
  }

  if (!["APPROVED", "LOCKED"].includes(str(db.scoreSheets[idx].status).toUpperCase())) {
    return res.status(409).json({ message: "Score sheet must be approved before locking" });
  }

  db.scoreSheets[idx] = {
    ...db.scoreSheets[idx],
    status: "LOCKED",
    lockedAt: nowIso(),
    lockedBy: str(req.user.id),
    updatedAt: nowIso(),
  };

  logAction(db, req.user.id, "score_sheet_locked", "score_sheet", sheetId, {});
  writeDB(db);
  return res.json(db.scoreSheets[idx]);
});

router.post("/compute/sheets/:sheetId", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);

  const sheet = (db.scoreSheets || []).find((item) => str(item.id) === str(req.params.sheetId));
  if (!sheet) return res.status(404).json({ message: "Score sheet not found" });

  const offering = getOfferingById(db, sheet.classSubjectOfferingId);
  if (!isTeacherForOffering(req.user, offering)) return res.status(403).json({ message: "Forbidden" });
  if (!supportsNigerianClass(offering)) {
    return res.status(400).json({ message: "Early Years classes use EYFS AMES developmental assessment, not Nigerian grading score sheets." });
  }

  try {
    const rows = computeOfferingResults(db, offering, sheet, req.user.id);
    writeDB(db);
    return res.json({ offering, scoreSheet: sheet, rows });
  } catch (error) {
    writeIfNeeded(db, mutated);
    return res.status(400).json({ message: error.message || "Failed to compute results" });
  }
});

function computeTermSummaries(db, payload, actorId = "") {
  const cls = getClassByInput(db, payload?.classId || payload?.className);
  if (!cls) throw new Error("Class could not be resolved");
  if (cls.isActive === false || !supportsNigerianClass(cls)) {
    throw new Error("Early Years classes use EYFS AMES developmental assessment, not Nigerian term summaries.");
  }

  const session = getSessionByInput(db, payload?.sessionId || payload?.sessionName) || (db.academicSessions || [])[0] || null;
  const term = getTermByInput(db, payload?.termId || payload?.termName, session?.id) || (db.terms || []).find((item) => str(item.sessionId) === str(session?.id)) || null;
  if (!session || !term) throw new Error("Session/term could not be resolved");

  const offeringIds = new Set(
    (db.classSubjectOfferings || [])
      .filter((item) => str(item.classId) === str(cls.id) && str(item.sessionId) === str(session.id) && str(item.termId) === str(term.id))
      .map((item) => str(item.id))
  );

  if (offeringIds.size === 0) throw new Error("No offerings found for selected class/session/term");

  const subjectResults = (db.computedResults || []).filter((item) => offeringIds.has(str(item.classSubjectOfferingId)));
  const byStudent = new Map();
  subjectResults.forEach((row) => {
    const sid = str(row.studentUserId);
    if (!byStudent.has(sid)) byStudent.set(sid, []);
    byStudent.get(sid).push(row);
  });

  const scales = getPolicyScales(db, ((db.gradingPolicies || []).find((item) => item.isActive) || db.gradingPolicies[0] || {}).id);

  const touched = [];
  for (const [studentId, rows] of byStudent.entries()) {
    const totalSubjects = rows.length;
    const totalScoreAllSubjects = rows.reduce((sum, row) => sum + Number(row.totalScore || 0), 0);
    const averageScore = totalSubjects > 0 ? totalScoreAllSubjects / totalSubjects : 0;
    const grade = findScale(scales, averageScore);
    const promotionStatus = normalizeKey(term.termName) === normalizeKey("Third Term") ? (averageScore >= 50 ? "PROMOTED" : "NOT_PROMOTED") : "PENDING";

    const next = {
      classId: str(cls.id),
      className: str(cls.name),
      sessionId: str(session.id),
      sessionName: str(session.sessionName),
      termId: str(term.id),
      termName: str(term.termName),
      studentUserId: studentId,
      totalSubjects,
      totalScoreAllSubjects: Number(totalScoreAllSubjects.toFixed(2)),
      averageScore: Number(averageScore.toFixed(2)),
      overallGrade: str(grade?.gradeLabel || "F"),
      overallPosition: 0,
      classTeacherComment: "",
      principalComment: "",
      promotionStatus,
      isPublished: false,
      updatedAt: nowIso(),
    };

    const idx = (db.termResultSummaries || []).findIndex(
      (item) => str(item.studentUserId) === studentId && str(item.classId) === str(cls.id) && str(item.sessionId) === str(session.id) && str(item.termId) === str(term.id)
    );

    if (idx >= 0) {
      db.termResultSummaries[idx] = {
        ...db.termResultSummaries[idx],
        ...next,
        id: db.termResultSummaries[idx].id,
        createdAt: db.termResultSummaries[idx].createdAt || nowIso(),
      };
      touched.push(db.termResultSummaries[idx]);
    } else {
      const row = { id: `tsum-${nanoid(10)}`, ...next, createdAt: nowIso() };
      db.termResultSummaries.push(row);
      touched.push(row);
    }
  }

  const nameById = new Map((db.students || []).map((item) => [str(item.id), str(item.name)]));
  const ranked = [...touched].sort((a, b) => {
    if (Number(b.averageScore) !== Number(a.averageScore)) return Number(b.averageScore) - Number(a.averageScore);
    return str(nameById.get(str(a.studentUserId))).localeCompare(str(nameById.get(str(b.studentUserId))));
  });

  let lastAvg = null;
  let lastRank = 0;
  ranked.forEach((row, idx) => {
    const avg = Number(row.averageScore || 0);
    if (lastAvg === null || avg !== lastAvg) {
      lastRank = idx + 1;
      lastAvg = avg;
    }
    const target = (db.termResultSummaries || []).find((item) => str(item.id) === str(row.id));
    if (target) {
      target.overallPosition = lastRank;
      target.updatedAt = nowIso();
    }
  });

  logAction(db, actorId, "term_summary_computed", "class", cls.id, {
    sessionId: session.id,
    termId: term.id,
    students: touched.length,
  });

  return (db.termResultSummaries || []).filter((item) => str(item.classId) === str(cls.id) && str(item.sessionId) === str(session.id) && str(item.termId) === str(term.id));
}

router.post("/compute/term", auth(), requireRole("ADMIN"), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);
  try {
    const summaries = computeTermSummaries(db, req.body || {}, req.user.id);
    writeDB(db);
    return res.json({ summaries });
  } catch (error) {
    writeIfNeeded(db, mutated);
    return res.status(400).json({ message: error.message || "Failed to compute term summaries" });
  }
});

router.post("/publish/term", auth(), requireRole("ADMIN"), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);
  try {
    const summaries = computeTermSummaries(db, req.body || {}, req.user.id);
    const ids = new Set(summaries.map((item) => str(item.id)));

    db.termResultSummaries = (db.termResultSummaries || []).map((item) => {
      if (!ids.has(str(item.id))) return item;
      return { ...item, isPublished: true, publishedAt: nowIso(), updatedAt: nowIso() };
    });

    db.resultApprovals.unshift({
      id: `rapp-${nanoid(10)}`,
      resultType: "term_result",
      referenceId: `${str(req.body?.classId || req.body?.className)}:${str(req.body?.sessionId || req.body?.sessionName)}:${str(req.body?.termId || req.body?.termName)}`,
      approvedBy: str(req.user.id),
      approvalStatus: "PUBLISHED",
      notes: str(req.body?.notes),
      approvedAt: nowIso(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });

    logAction(db, req.user.id, "term_results_published", "term_result", "bulk", { count: summaries.length });
    writeDB(db);
    return res.json({ published: summaries.length });
  } catch (error) {
    writeIfNeeded(db, mutated);
    return res.status(400).json({ message: error.message || "Failed to publish term results" });
  }
});

router.get("/results/computed", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);

  const offerings = getAccessibleOfferings(db, req.user);
  const offeringMap = new Map(offerings.map((item) => [str(item.id), item]));

  let rows = (db.computedResults || []).filter((item) => offeringMap.has(str(item.classSubjectOfferingId)));
  if (str(req.query.classSubjectOfferingId)) rows = rows.filter((item) => str(item.classSubjectOfferingId) === str(req.query.classSubjectOfferingId));

  const studentMap = new Map((db.students || []).map((item) => [str(item.id), str(item.name)]));
  rows = rows.map((item) => ({
    ...item,
    offering: offeringMap.get(str(item.classSubjectOfferingId)) || null,
    studentName: str(studentMap.get(str(item.studentUserId))),
  }));

  writeIfNeeded(db, mutated);
  return res.json(rows);
});

router.get("/results/term-summaries", auth(), requireRole("ADMIN", "TEACHER", "PARENT", "STUDENT"), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);

  let rows = Array.isArray(db.termResultSummaries) ? [...db.termResultSummaries] : [];
  const role = str(req.user.role).toUpperCase();

  if (role === "TEACHER") {
    const classIds = new Set((db.classSubjectOfferings || []).filter((item) => str(item.teacherUserId) === str(req.user.id)).map((item) => str(item.classId)));
    rows = rows.filter((item) => classIds.has(str(item.classId)));
  }

  if (role === "STUDENT") {
    rows = rows.filter((item) => str(item.studentUserId) === str(req.user.studentId || req.user.id));
  }

  if (role === "PARENT") {
    const allowed = new Set((req.user.studentIds || []).map((id) => str(id)));
    rows = rows.filter((item) => allowed.has(str(item.studentUserId)));
  }

  if (str(req.query.classId)) rows = rows.filter((item) => str(item.classId) === str(req.query.classId));
  if (str(req.query.sessionId)) rows = rows.filter((item) => str(item.sessionId) === str(req.query.sessionId));
  if (str(req.query.termId)) rows = rows.filter((item) => str(item.termId) === str(req.query.termId));

  const studentMap = new Map((db.students || []).map((item) => [str(item.id), str(item.name)]));
  rows = rows.map((item) => ({ ...item, studentName: str(studentMap.get(str(item.studentUserId))) }));

  writeIfNeeded(db, mutated);
  return res.json(rows);
});

router.patch("/results/term-summaries/:summaryId/comments", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);

  const summaryId = str(req.params.summaryId);
  const idx = (db.termResultSummaries || []).findIndex((item) => str(item.id) === summaryId);
  if (idx < 0) return res.status(404).json({ message: "Term summary not found" });

  const summary = db.termResultSummaries[idx];
  if (str(req.user.role).toUpperCase() === "TEACHER") {
    const teachesClass = (db.classSubjectOfferings || []).some((item) => str(item.classId) === str(summary.classId) && str(item.teacherUserId) === str(req.user.id));
    if (!teachesClass) return res.status(403).json({ message: "Forbidden" });
  }

  db.termResultSummaries[idx] = {
    ...summary,
    classTeacherComment: req.body?.classTeacherComment === undefined ? str(summary.classTeacherComment) : str(req.body.classTeacherComment),
    principalComment: req.body?.principalComment === undefined ? str(summary.principalComment) : str(req.body.principalComment),
    updatedAt: nowIso(),
  };

  logAction(db, req.user.id, "term_summary_comments_updated", "term_summary", summaryId, {});
  writeDB(db);
  return res.json(db.termResultSummaries[idx]);
});

module.exports = router;
