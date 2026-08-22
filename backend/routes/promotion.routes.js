const express = require("express");
const { nanoid } = require("nanoid");
const { auth, requireRole } = require("../middleware/auth");
const { readDB, writeDB } = require("../lib/jsonStore");
const { DEFAULT_CLASSES } = require("../lib/defaultClasses");
const { ensureAcademicScope } = require("../lib/academicScope");

const router = express.Router();

const CURRENT_TERM = String(process.env.CURRENT_TERM || "First Term");
const CURRENT_SESSION = String(process.env.CURRENT_SESSION || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`);
const DECISION_STATUSES = ["promoted", "promoted_conditionally", "probation", "repeated", "graduated", "pending_review", "withdrawn", "not_eligible"];

const str = (v) => String(v || "").trim();
const nowIso = () => new Date().toISOString();
const norm = (v) => str(v).toLowerCase().replace(/[^a-z0-9]/g, "");
const num = (v, fb = 0) => (Number.isFinite(Number(v)) ? Number(v) : fb);
const classIdFromName = (name) => str(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

function sectionFromClass(name) {
  const k = norm(name);
  if (k.includes("creche") || k.includes("nursery") || k.includes("reception") || k.includes("playgroup")) return "Early Years";
  if (k.includes("basic")) return "Basic School";
  if (k.includes("jss") || k.includes("junior")) return "Junior Secondary";
  if (k.includes("ss") || k.includes("sss") || k.includes("senior")) return "Senior Secondary";
  return "General";
}

function sortClasses(rows) {
  return [...(Array.isArray(rows) ? rows : [])].sort((a, b) => {
    const ao = Number(a.order ?? 999);
    const bo = Number(b.order ?? 999);
    if (ao !== bo) return ao - bo;
    return str(a.name).localeCompare(str(b.name));
  });
}

function getClassByInput(db, input) {
  const s = str(input);
  if (!s) return null;
  const k = norm(s);
  return sortClasses(db.classes || []).find((c) => str(c.id) === s || norm(c.name) === k) || null;
}

function getSessionByInput(db, input) {
  const s = str(input);
  if (!s) return null;
  return (db.academicSessions || []).find((x) => str(x.id) === s || norm(x.sessionName) === norm(s)) || null;
}

function resolveSession(db, input) {
  return getSessionByInput(db, input) || (db.academicSessions || []).find((x) => x.isActive) || (db.academicSessions || [])[0] || null;
}

function termsForSession(db, sessionId) {
  return (db.terms || [])
    .filter((t) => str(t.sessionId) === str(sessionId))
    .sort((a, b) => Number(a.position ?? 99) - Number(b.position ?? 99));
}

function thirdTerm(db, sessionId) {
  const list = termsForSession(db, sessionId);
  return list.find((t) => norm(t.termName).includes("third")) || list[list.length - 1] || null;
}

function gradeFromAverage(average) {
  const s = Number(average || 0);
  if (s >= 70) return "A";
  if (s >= 60) return "B";
  if (s >= 50) return "C";
  if (s >= 45) return "D";
  if (s >= 40) return "E";
  return "F";
}

function decideFromAverage(average) {
  const grade = gradeFromAverage(average);
  const promoted = ["A", "B", "C"].includes(grade);
  return { grade, promoted, decision: promoted ? "Promoted" : "Not Promoted" };
}

function logAction(db, userId, action, promotionDecisionId = "", metadata = {}) {
  db.promotionLogs.unshift({
    id: `plog-${nanoid(10)}`,
    userId: str(userId),
    action: str(action),
    promotionDecisionId: str(promotionDecisionId),
    metadata,
    createdAt: nowIso(),
  });
}

function ensureAcademicMeta(db) {
  let mutated = false;
  if (!Array.isArray(db.academicSessions)) { db.academicSessions = []; mutated = true; }
  if (!Array.isArray(db.terms)) { db.terms = []; mutated = true; }
  if (!Array.isArray(db.classes)) { db.classes = []; mutated = true; }

  const scope = ensureAcademicScope(db, { currentSession: CURRENT_SESSION, currentTerm: CURRENT_TERM });
  const session = scope.activeSession || db.academicSessions.find((x) => x.isActive) || db.academicSessions[0] || null;
  mutated = true;

  ["First Term", "Second Term", "Third Term"].forEach((name, i) => {
    const exists = (db.terms || []).some((t) => str(t.sessionId) === str(session.id) && norm(t.termName) === norm(name));
    if (!exists) {
      db.terms.push({ id: `${session.id}-term-${i + 1}`, sessionId: session.id, termName: name, position: i + 1, isActive: norm(name) === norm(CURRENT_TERM), createdAt: nowIso(), updatedAt: nowIso() });
      mutated = true;
    }
  });

  const existing = new Set((db.classes || []).map((c) => norm(c.name)));
  DEFAULT_CLASSES.forEach((c) => {
    if (existing.has(norm(c.name))) return;
    db.classes.push({ id: classIdFromName(c.name), name: c.name, section: c.section, order: Number(c.order || 999), createdAt: nowIso(), updatedAt: nowIso() });
    existing.add(norm(c.name));
    mutated = true;
  });

  return mutated;
}

function ensureProgressionMap(db) {
  let mutated = false;
  if (!Array.isArray(db.classProgressionMap)) { db.classProgressionMap = []; mutated = true; }
  const byFrom = new Set((db.classProgressionMap || []).map((x) => str(x.fromClassId)));
  const classes = sortClasses(db.classes || []);
  for (let i = 0; i < classes.length; i += 1) {
    const cls = classes[i];
    if (byFrom.has(str(cls.id))) continue;
    const next = classes[i + 1] || null;
    const transition = norm(cls.name).includes("reception") || norm(cls.name).includes("basic6") || norm(cls.name).includes("jss3") || (next && norm(cls.section) !== norm(next.section));
    db.classProgressionMap.push({
      id: `prog-${nanoid(10)}`,
      fromClassId: str(cls.id),
      fromClassName: str(cls.name),
      toClassId: next ? str(next.id) : "",
      toClassName: next ? str(next.name) : "",
      progressionType: next ? (transition ? "transition" : "normal") : "terminal",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    mutated = true;
  }
  return mutated;
}

function ensureCollections(db) {
  let mutated = ensureAcademicMeta(db);
  [
    "students", "users", "computedResults", "termResultSummaries", "classSubjectOfferings",
    "attendanceSessions", "attendanceRecords", "promotionPolicies", "promotionPolicySubjectRules",
    "annualResultSummaries", "promotionDecisions", "classProgressionMap", "promotionBatches",
    "promotionBatchItems", "studentClassHistory", "promotionLogs",
  ].forEach((k) => {
    if (!Array.isArray(db[k])) { db[k] = []; mutated = true; }
  });
  if ((db.promotionPolicies || []).length === 0) {
    const defs = [
      ["Early Years Promotion Policy", "Early Years", 45, 0, false, false, true, 40],
      ["Basic School Promotion Policy", "Basic School", 50, 5, true, true, true, 45],
      ["JSS Promotion Policy", "Junior Secondary", 50, 5, true, true, true, 45],
      ["SS Promotion Policy", "Senior Secondary", 50, 5, true, true, true, 45],
    ];
    defs.forEach(([policyName, section, minAverage, minSubjectPassCount, requireEnglishPass, requireMathPass, allowProbation, probationMinAverage]) => {
      const id = `ppol-${nanoid(10)}`;
      db.promotionPolicies.push({ id, policyName, section, classId: "", sessionId: "", minAverage, minSubjectPassCount, requireEnglishPass, requireMathPass, allowProbation, probationMinAverage, attendanceRequired: false, minAttendancePercentage: 0, autoPromote: true, isTerminalClass: false, isActive: true, createdAt: nowIso(), updatedAt: nowIso() });
      if (section !== "Early Years") {
        db.promotionPolicySubjectRules.push({ id: `psr-${nanoid(10)}`, promotionPolicyId: id, subjectId: "english-language", subjectName: "English Language", isCompulsoryPass: true, minimumScore: 50, createdAt: nowIso(), updatedAt: nowIso() });
        db.promotionPolicySubjectRules.push({ id: `psr-${nanoid(10)}`, promotionPolicyId: id, subjectId: "mathematics", subjectName: "Mathematics", isCompulsoryPass: true, minimumScore: 50, createdAt: nowIso(), updatedAt: nowIso() });
      }
    });
    mutated = true;
  }
  if (ensureProgressionMap(db)) mutated = true;
  return mutated;
}

function writeIfNeeded(db, mutated) { if (mutated) writeDB(db); }

function getPolicyByInput(db, input) {
  const s = str(input);
  if (!s) return null;
  return (db.promotionPolicies || []).find((p) => str(p.id) === s || norm(p.policyName) === norm(s)) || null;
}

function policyRules(db, policyId) {
  return (db.promotionPolicySubjectRules || []).filter((r) => str(r.promotionPolicyId) === str(policyId));
}

function resolvePolicy(db, cls, sessionId = "", explicitId = "") {
  if (str(explicitId)) {
    const explicit = getPolicyByInput(db, explicitId);
    if (explicit) return explicit;
  }
  const section = str(cls?.section || sectionFromClass(cls?.name));
  const active = (db.promotionPolicies || []).filter((p) => p.isActive);
  return active.find((p) => str(p.classId) === str(cls?.id) && str(p.sessionId) === str(sessionId))
    || active.find((p) => str(p.classId) === str(cls?.id) && !str(p.sessionId))
    || active.find((p) => norm(p.section) === norm(section) && str(p.sessionId) === str(sessionId))
    || active.find((p) => norm(p.section) === norm(section))
    || active[0]
    || (db.promotionPolicies || [])[0]
    || null;
}

function isWithdrawn(student) {
  const s = norm(student?.status);
  return s === "withdrawn" || s === "inactive";
}

function studentsForClass(db, classId, className = "") {
  const cid = str(classId);
  const ckey = norm(className);
  return (db.students || []).filter((s) => {
    if (isWithdrawn(s)) return false;
    if (cid && str(s.classId) === cid) return true;
    if (ckey && norm(s.className) === ckey) return true;
    return false;
  });
}

function subjectKey(name) {
  const k = norm(name);
  if (!k) return "";
  if (k.includes("english")) return "english";
  if (k.includes("math")) return "mathematics";
  return k;
}

function attendancePct(db, studentId, classId, sessionName) {
  const sessions = (db.attendanceSessions || []).filter((x) => str(x.classId) === str(classId) && (!str(sessionName) || str(x.academicSession) === str(sessionName)));
  if (!sessions.length) return null;
  const sids = new Set(sessions.map((x) => str(x.id)));
  const rows = (db.attendanceRecords || []).filter((r) => str(r.studentId) === str(studentId) && sids.has(str(r.attendanceSessionId)));
  if (!rows.length) return 0;
  const attended = rows.filter((r) => {
    const st = norm(r.status);
    return st === "present" || st === "late" || st === "excused";
  }).length;
  return Number(((attended / rows.length) * 100).toFixed(2));
}

function annualSubjectStats(db, classId, sessionId, termIds) {
  const offerings = new Map(
    (db.classSubjectOfferings || [])
      .filter((o) => str(o.classId) === str(classId) && str(o.sessionId) === str(sessionId) && termIds.has(str(o.termId)))
      .map((o) => [str(o.id), o])
  );

  const byStudent = new Map();
  (db.computedResults || []).forEach((row) => {
    const offer = offerings.get(str(row.classSubjectOfferingId));
    if (!offer) return;
    const sid = str(row.studentUserId);
    const skey = subjectKey(offer.subject);
    if (!skey) return;

    if (!byStudent.has(sid)) byStudent.set(sid, {});
    if (!byStudent.get(sid)[skey]) byStudent.get(sid)[skey] = { subjectName: str(offer.subject), scores: [] };
    byStudent.get(sid)[skey].scores.push(num(row.totalScore, 0));
  });

  const out = new Map();
  for (const [sid, bucket] of byStudent.entries()) {
    const item = {};
    Object.entries(bucket).forEach(([k, v]) => {
      const total = v.scores.reduce((a, b) => a + Number(b || 0), 0);
      const avg = v.scores.length ? total / v.scores.length : 0;
      item[k] = { subjectName: v.subjectName, average: Number(avg.toFixed(2)), attempts: v.scores.length };
    });
    out.set(sid, item);
  }
  return out;
}

function generateAnnualSummaries(db, payload, actorId = "") {
  const session = resolveSession(db, payload?.sessionId || payload?.sessionName);
  if (!session) throw new Error("Session could not be resolved");

  const classes = str(payload?.classId || payload?.className)
    ? [getClassByInput(db, payload?.classId || payload?.className)].filter(Boolean)
    : sortClasses(db.classes || []);
  if (!classes.length) throw new Error("No classes available");

  const termIds = new Set(termsForSession(db, session.id).map((t) => str(t.id)));
  const touched = [];

  classes.forEach((cls) => {
    const learners = studentsForClass(db, cls.id, cls.name);
    const subStats = annualSubjectStats(db, cls.id, session.id, termIds);

    learners.forEach((student) => {
      const sid = str(student.id);
      const terms = (db.termResultSummaries || []).filter((r) => str(r.studentUserId) === sid && str(r.classId) === str(cls.id) && str(r.sessionId) === str(session.id) && termIds.has(str(r.termId)));
      const termAverages = terms.map((r) => num(r.averageScore, 0));
      const annualAverage = termAverages.length ? termAverages.reduce((a, b) => a + b, 0) / termAverages.length : 0;

      const subjectScores = subStats.get(sid) || {};
      const subjects = Object.values(subjectScores);
      const totalSubjects = subjects.length || Math.max(...terms.map((x) => Number(x.totalSubjects || 0)), 0) || 0;
      const subjectsPassed = subjects.filter((x) => Number(x.average || 0) >= 50).length;

      const row = {
        studentUserId: sid,
        classId: str(cls.id),
        className: str(cls.name),
        sessionId: str(session.id),
        sessionName: str(session.sessionName),
        totalSubjects,
        subjectsPassed,
        subjectsFailed: Math.max(totalSubjects - subjectsPassed, 0),
        annualTotalScore: Number((annualAverage * (totalSubjects || 0)).toFixed(2)),
        annualAverage: Number(annualAverage.toFixed(2)),
        overallGrade: gradeFromAverage(annualAverage),
        attendancePercentage: attendancePct(db, sid, cls.id, session.sessionName),
        teacherRecommendation: str(payload?.teacherRecommendation),
        subjectScores,
        updatedAt: nowIso(),
      };

      const idx = (db.annualResultSummaries || []).findIndex((x) => str(x.studentUserId) === sid && str(x.classId) === str(cls.id) && str(x.sessionId) === str(session.id));
      if (idx >= 0) {
        db.annualResultSummaries[idx] = { ...db.annualResultSummaries[idx], ...row, id: db.annualResultSummaries[idx].id };
        touched.push(db.annualResultSummaries[idx]);
      } else {
        const created = { id: `ars-${nanoid(10)}`, createdAt: nowIso(), ...row };
        db.annualResultSummaries.unshift(created);
        touched.push(created);
      }
    });

    logAction(db, actorId, "annual_summary_generated", "", { classId: cls.id, sessionId: session.id, studentCount: learners.length });
  });

  return touched;
}

function evaluateDecision(summary, policy, progression, rules) {
  const reasons = [];
  const terminal = Boolean(policy?.isTerminalClass) || norm(progression?.progressionType) === "terminal";
  if (terminal) return { decisionStatus: "graduated", decisionReason: "Terminal class completed", nextClassId: "", nextClassName: "" };
  if (!summary || Number(summary.totalSubjects || 0) <= 0) return { decisionStatus: "pending_review", decisionReason: "Annual summary incomplete", nextClassId: "", nextClassName: "" };

  const minAverage = num(policy?.minAverage, 50);
  const minPassed = Math.max(0, num(policy?.minSubjectPassCount, 0));
  const probationMin = num(policy?.probationMinAverage, Math.max(minAverage - 5, 0));
  const attendanceRequired = Boolean(policy?.attendanceRequired);
  const minAttendance = num(policy?.minAttendancePercentage, 0);

  const avg = num(summary.annualAverage, 0);
  const passed = num(summary.subjectsPassed, 0);
  const scores = summary.subjectScores || {};

  const checkRules = [];
  if (policy?.requireEnglishPass) checkRules.push({ key: "english", min: 50, label: "English Language" });
  if (policy?.requireMathPass) checkRules.push({ key: "mathematics", min: 50, label: "Mathematics" });
  (Array.isArray(rules) ? rules : []).forEach((r) => {
    if (!r.isCompulsoryPass) return;
    const key = subjectKey(r.subjectName || r.subjectId);
    if (!key) return;
    checkRules.push({ key, min: num(r.minimumScore, 50), label: str(r.subjectName || r.subjectId || key) });
  });

  let compulsoryOk = true;
  checkRules.forEach((r) => {
    const score = num(scores?.[r.key]?.average, NaN);
    if (!Number.isFinite(score)) { compulsoryOk = false; reasons.push(`${r.label} score missing`); return; }
    if (score < r.min) { compulsoryOk = false; reasons.push(`${r.label} below ${r.min}`); }
  });

  const attendance = summary.attendancePercentage == null ? null : num(summary.attendancePercentage, 0);
  const attendanceOk = !attendanceRequired || (attendance != null && attendance >= minAttendance);
  if (!attendanceOk) reasons.push(`Attendance below ${minAttendance}%`);
  if (avg < minAverage) reasons.push(`Average below ${minAverage}`);
  if (passed < minPassed) reasons.push(`Passed subjects below ${minPassed}`);

  const canPromote = avg >= minAverage && passed >= minPassed && compulsoryOk && attendanceOk;
  if (canPromote) {
    if (!str(progression?.toClassId)) return { decisionStatus: "pending_review", decisionReason: "No next-class mapping", nextClassId: "", nextClassName: "" };
    return { decisionStatus: "promoted", decisionReason: "Meets promotion policy", nextClassId: str(progression.toClassId), nextClassName: str(progression.toClassName) };
  }

  if (!attendanceOk) return { decisionStatus: "not_eligible", decisionReason: reasons.join("; ") || "Not eligible", nextClassId: "", nextClassName: "" };

  if (policy?.allowProbation && avg >= probationMin && compulsoryOk) {
    if (!str(progression?.toClassId)) return { decisionStatus: "pending_review", decisionReason: "No next-class mapping", nextClassId: "", nextClassName: "" };
    return { decisionStatus: "probation", decisionReason: reasons.join("; ") || "Promotion on probation", nextClassId: str(progression.toClassId), nextClassName: str(progression.toClassName) };
  }

  return { decisionStatus: "repeated", decisionReason: reasons.join("; ") || "Did not meet promotion policy", nextClassId: str(summary.classId), nextClassName: str(summary.className) };
}

function processBatch(db, payload, actorId = "") {
  const session = resolveSession(db, payload?.sessionId || payload?.sessionName);
  const cls = getClassByInput(db, payload?.classId || payload?.className);
  if (!session) throw new Error("Session could not be resolved");
  if (!cls) throw new Error("Class could not be resolved");

  if (payload?.generateAnnualSummaries !== false) generateAnnualSummaries(db, { classId: cls.id, sessionId: session.id }, actorId);

  const summaries = (db.annualResultSummaries || []).filter((x) => str(x.classId) === str(cls.id) && str(x.sessionId) === str(session.id));
  if (!summaries.length) throw new Error("No annual summaries found");

  const policy = resolvePolicy(db, cls, session.id, payload?.promotionPolicyId);
  if (!policy) throw new Error("No active promotion policy found");

  const progression = (db.classProgressionMap || []).find((m) => str(m.fromClassId) === str(cls.id)) || null;
  const rules = policyRules(db, policy.id);

  const batch = {
    id: `pb-${nanoid(10)}`,
    sessionId: str(session.id),
    classId: str(cls.id),
    title: str(payload?.title || `${cls.name} Promotion Batch (${session.sessionName})`),
    status: "processed",
    processedBy: str(actorId),
    processedAt: nowIso(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  db.promotionBatches.unshift(batch);

  const counts = { promoted: 0, promoted_conditionally: 0, probation: 0, repeated: 0, graduated: 0, pending_review: 0, withdrawn: 0, not_eligible: 0 };

  summaries.forEach((summary) => {
    const student = (db.students || []).find((s) => str(s.id) === str(summary.studentUserId)) || null;
    const evaluated = isWithdrawn(student)
      ? { decisionStatus: "withdrawn", decisionReason: "Student is inactive/withdrawn", nextClassId: "", nextClassName: "" }
      : evaluateDecision(summary, policy, progression, rules);

    const decision = {
      id: `pdec-${nanoid(11)}`,
      studentUserId: str(summary.studentUserId),
      currentClassId: str(cls.id),
      currentClassName: str(cls.name),
      nextClassId: str(evaluated.nextClassId),
      nextClassName: str(evaluated.nextClassName),
      sessionId: str(session.id),
      sessionName: str(session.sessionName),
      promotionPolicyId: str(policy.id),
      decisionStatus: str(evaluated.decisionStatus),
      decisionReason: str(evaluated.decisionReason),
      annualAverage: num(summary.annualAverage, 0),
      attendancePercentage: summary.attendancePercentage == null ? null : Number(summary.attendancePercentage),
      decidedBy: str(actorId),
      decidedAt: nowIso(),
      isOverridden: false,
      overrideReason: "",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    db.promotionDecisions.unshift(decision);
    db.promotionBatchItems.unshift({ id: `pbi-${nanoid(10)}`, promotionBatchId: batch.id, studentUserId: decision.studentUserId, promotionDecisionId: decision.id, status: "generated", createdAt: nowIso(), updatedAt: nowIso() });
    if (counts[decision.decisionStatus] !== undefined) counts[decision.decisionStatus] += 1;
  });

  logAction(db, actorId, "promotion_batch_processed", "", { batchId: batch.id, classId: cls.id, sessionId: session.id, policyId: policy.id, counts });
  return { batch, counts };
}

function nextSessionName(sessionName) {
  const m = str(sessionName).match(/(\d{4})\s*\/\s*(\d{4})/);
  if (m) return `${Number(m[1]) + 1}/${Number(m[2]) + 1}`;
  const s = str(sessionName).match(/(\d{4})/);
  if (s) return `${Number(s[1]) + 1}/${Number(s[1]) + 2}`;
  const y = new Date().getFullYear();
  return `${y + 1}/${y + 2}`;
}

function ensureSessionWithTerms(db, sessionName) {
  let session = (db.academicSessions || []).find((x) => norm(x.sessionName) === norm(sessionName)) || null;
  if (!session) {
    session = { id: `session-${norm(sessionName) || nanoid()}`, sessionName, isActive: false, createdAt: nowIso(), updatedAt: nowIso() };
    db.academicSessions.unshift(session);
  }
  ["First Term", "Second Term", "Third Term"].forEach((name, i) => {
    const exists = (db.terms || []).some((t) => str(t.sessionId) === str(session.id) && norm(t.termName) === norm(name));
    if (!exists) db.terms.push({ id: `${session.id}-term-${i + 1}`, sessionId: session.id, termName: name, position: i + 1, isActive: i === 0, createdAt: nowIso(), updatedAt: nowIso() });
  });
  return session;
}

router.get("/metadata", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);
  const policies = (db.promotionPolicies || []).map((p) => ({ ...p, subjectRules: policyRules(db, p.id) }));
  writeIfNeeded(db, mutated);
  res.json({ statuses: DECISION_STATUSES, classes: sortClasses(db.classes || []), sessions: db.academicSessions || [], terms: db.terms || [], policies, progressionMap: db.classProgressionMap || [] });
});

router.get("/dashboard", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);
  const session = resolveSession(db, req.query?.sessionId || req.query?.sessionName);
  const sid = str(session?.id);
  const decisions = (db.promotionDecisions || []).filter((d) => !sid || str(d.sessionId) === sid);
  const annual = (db.annualResultSummaries || []).filter((a) => !sid || str(a.sessionId) === sid);
  writeIfNeeded(db, mutated);
  res.json({
    session,
    totals: {
      policiesActive: (db.promotionPolicies || []).filter((p) => p.isActive).length,
      classesReadyForPromotion: new Set(annual.map((x) => str(x.classId))).size,
      studentsPendingReview: decisions.filter((d) => norm(d.decisionStatus) === "pendingreview").length,
      promoted: decisions.filter((d) => norm(d.decisionStatus) === "promoted").length,
      probation: decisions.filter((d) => norm(d.decisionStatus) === "probation").length,
      repeated: decisions.filter((d) => norm(d.decisionStatus) === "repeated").length,
      graduated: decisions.filter((d) => norm(d.decisionStatus) === "graduated").length,
      notEligible: decisions.filter((d) => norm(d.decisionStatus) === "noteligible").length,
    },
    recentActivity: (db.promotionLogs || []).slice(0, 12),
  });
});

router.post("/decide", auth(), requireRole("ADMIN"), (req, res) => {
  const average = Number(req.body?.average);
  if (Number.isNaN(average)) return res.status(400).json({ message: "average must be a number" });
  return res.json(decideFromAverage(average));
});

router.get("/policies", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);
  writeIfNeeded(db, mutated);
  res.json((db.promotionPolicies || []).map((p) => ({ ...p, subjectRules: policyRules(db, p.id) })));
});

router.post("/policies", auth(), requireRole("ADMIN"), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);
  const policyName = str(req.body?.policyName);
  if (!policyName) return res.status(400).json({ message: "policyName is required" });
  const cls = str(req.body?.classId) ? getClassByInput(db, req.body.classId) : null;
  const row = {
    id: `ppol-${nanoid(10)}`,
    policyName,
    section: str(req.body?.section || cls?.section || ""),
    classId: cls ? str(cls.id) : "",
    sessionId: str(req.body?.sessionId),
    minAverage: num(req.body?.minAverage, 50),
    minSubjectPassCount: num(req.body?.minSubjectPassCount, 0),
    requireEnglishPass: Boolean(req.body?.requireEnglishPass),
    requireMathPass: Boolean(req.body?.requireMathPass),
    allowProbation: Boolean(req.body?.allowProbation),
    probationMinAverage: num(req.body?.probationMinAverage, 45),
    attendanceRequired: Boolean(req.body?.attendanceRequired),
    minAttendancePercentage: num(req.body?.minAttendancePercentage, 0),
    autoPromote: req.body?.autoPromote === undefined ? true : Boolean(req.body?.autoPromote),
    isTerminalClass: Boolean(req.body?.isTerminalClass),
    isActive: req.body?.isActive === undefined ? true : Boolean(req.body?.isActive),
    createdAt: nowIso(), updatedAt: nowIso(),
  };
  db.promotionPolicies.unshift(row);
  logAction(db, req.user.id, "promotion_policy_created", "", { policyId: row.id });
  writeDB(db);
  return res.status(201).json({ ...row, subjectRules: [] });
});

router.post("/policies/:policyId/subject-rules", auth(), requireRole("ADMIN"), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);
  const policyId = str(req.params.policyId);
  const policy = getPolicyByInput(db, policyId);
  if (!policy) return res.status(404).json({ message: "Policy not found" });
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
  if (!rows.length) return res.status(400).json({ message: "rows is required" });
  const valid = rows.map((r) => ({ subjectName: str(r.subjectName || r.subjectId), subjectId: str(r.subjectId || r.subjectName).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""), isCompulsoryPass: r.isCompulsoryPass === undefined ? true : Boolean(r.isCompulsoryPass), minimumScore: num(r.minimumScore, 50) })).filter((r) => r.subjectName);
  if (!valid.length) return res.status(400).json({ message: "No valid rules provided" });
  db.promotionPolicySubjectRules = (db.promotionPolicySubjectRules || []).filter((r) => str(r.promotionPolicyId) !== policyId);
  valid.forEach((r) => db.promotionPolicySubjectRules.push({ id: `psr-${nanoid(10)}`, promotionPolicyId: policyId, ...r, createdAt: nowIso(), updatedAt: nowIso() }));
  logAction(db, req.user.id, "promotion_policy_subject_rules_saved", "", { policyId, count: valid.length });
  writeDB(db);
  res.json(policyRules(db, policyId));
});

router.get("/progression-map", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);
  writeIfNeeded(db, mutated);
  res.json(db.classProgressionMap || []);
});

router.post("/progression-map", auth(), requireRole("ADMIN"), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);
  const fromClass = getClassByInput(db, req.body?.fromClassId || req.body?.fromClassName);
  if (!fromClass) return res.status(400).json({ message: "fromClass is required" });
  const type = ["normal", "transition", "terminal"].includes(str(req.body?.progressionType).toLowerCase()) ? str(req.body?.progressionType).toLowerCase() : "normal";
  const toClass = type === "terminal" ? null : getClassByInput(db, req.body?.toClassId || req.body?.toClassName);
  if (type !== "terminal" && !toClass) return res.status(400).json({ message: "toClass is required for non-terminal progression" });
  const idx = (db.classProgressionMap || []).findIndex((x) => str(x.fromClassId) === str(fromClass.id));
  const row = { id: idx >= 0 ? db.classProgressionMap[idx].id : `prog-${nanoid(10)}`, fromClassId: str(fromClass.id), fromClassName: str(fromClass.name), toClassId: toClass ? str(toClass.id) : "", toClassName: toClass ? str(toClass.name) : "", progressionType: type, createdAt: idx >= 0 ? db.classProgressionMap[idx].createdAt || nowIso() : nowIso(), updatedAt: nowIso() };
  if (idx >= 0) db.classProgressionMap[idx] = row; else db.classProgressionMap.unshift(row);
  logAction(db, req.user.id, "class_progression_saved", "", { fromClassId: fromClass.id, toClassId: toClass?.id || "", progressionType: type });
  writeDB(db);
  res.json(row);
});

router.post("/annual-summaries/generate", auth(), requireRole("ADMIN"), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);
  try {
    const summaries = generateAnnualSummaries(db, req.body || {}, req.user.id);
    writeDB(db);
    return res.json({ generated: summaries.length, summaries });
  } catch (e) {
    writeIfNeeded(db, mutated);
    return res.status(400).json({ message: e.message || "Failed to generate annual summaries" });
  }
});

router.get("/annual-summaries", auth(), requireRole("ADMIN", "TEACHER", "PARENT", "STUDENT"), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);
  let rows = Array.isArray(db.annualResultSummaries) ? [...db.annualResultSummaries] : [];
  const role = str(req.user.role).toUpperCase();
  if (role === "TEACHER") {
    const allowed = new Set((db.classSubjectOfferings || []).filter((o) => str(o.teacherUserId) === str(req.user.id)).map((o) => str(o.classId)));
    rows = rows.filter((r) => allowed.has(str(r.classId)));
  }
  if (role === "STUDENT") rows = rows.filter((r) => str(r.studentUserId) === str(req.user.studentId || req.user.id));
  if (role === "PARENT") {
    const allowed = new Set((req.user.studentIds || []).map((id) => str(id)));
    rows = rows.filter((r) => allowed.has(str(r.studentUserId)));
  }
  if (str(req.query.classId)) rows = rows.filter((r) => str(r.classId) === str(req.query.classId));
  if (str(req.query.sessionId)) rows = rows.filter((r) => str(r.sessionId) === str(req.query.sessionId));
  if (str(req.query.studentUserId)) rows = rows.filter((r) => str(r.studentUserId) === str(req.query.studentUserId));
  const names = new Map((db.students || []).map((s) => [str(s.id), str(s.name)]));
  rows = rows.map((r) => ({ ...r, studentName: str(names.get(str(r.studentUserId))) }));
  writeIfNeeded(db, mutated);
  res.json(rows);
});

router.post("/batches/process", auth(), requireRole("ADMIN"), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);
  try {
    const out = processBatch(db, req.body || {}, req.user.id);
    writeDB(db);
    return res.status(201).json(out);
  } catch (e) {
    writeIfNeeded(db, mutated);
    return res.status(400).json({ message: e.message || "Failed to process promotion batch" });
  }
});

router.get("/batches", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);
  let rows = Array.isArray(db.promotionBatches) ? [...db.promotionBatches] : [];
  if (str(req.query.classId)) rows = rows.filter((b) => str(b.classId) === str(req.query.classId));
  if (str(req.query.sessionId)) rows = rows.filter((b) => str(b.sessionId) === str(req.query.sessionId));
  rows = rows.sort((a, b) => str(b.processedAt).localeCompare(str(a.processedAt)));
  writeIfNeeded(db, mutated);
  res.json(rows);
});

router.get("/batches/:batchId/items", auth(), requireRole("ADMIN", "TEACHER"), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);
  const batchId = str(req.params.batchId);
  const items = (db.promotionBatchItems || []).filter((i) => str(i.promotionBatchId) === batchId);
  const decisions = new Map((db.promotionDecisions || []).map((d) => [str(d.id), d]));
  const students = new Map((db.students || []).map((s) => [str(s.id), s]));
  writeIfNeeded(db, mutated);
  res.json(items.map((i) => ({ ...i, decision: decisions.get(str(i.promotionDecisionId)) || null, studentName: str(students.get(str(i.studentUserId))?.name) })));
});

router.get("/decisions", auth(), requireRole("ADMIN", "TEACHER", "PARENT", "STUDENT"), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);
  let rows = Array.isArray(db.promotionDecisions) ? [...db.promotionDecisions] : [];
  const role = str(req.user.role).toUpperCase();
  if (role === "TEACHER") {
    const allowed = new Set((db.classSubjectOfferings || []).filter((o) => str(o.teacherUserId) === str(req.user.id)).map((o) => str(o.classId)));
    rows = rows.filter((d) => allowed.has(str(d.currentClassId)));
  }
  if (role === "STUDENT") rows = rows.filter((d) => str(d.studentUserId) === str(req.user.studentId || req.user.id));
  if (role === "PARENT") {
    const allowed = new Set((req.user.studentIds || []).map((id) => str(id)));
    rows = rows.filter((d) => allowed.has(str(d.studentUserId)));
  }
  if (str(req.query.sessionId)) rows = rows.filter((d) => str(d.sessionId) === str(req.query.sessionId));
  if (str(req.query.classId)) rows = rows.filter((d) => str(d.currentClassId) === str(req.query.classId));
  if (str(req.query.decisionStatus)) rows = rows.filter((d) => norm(d.decisionStatus) === norm(req.query.decisionStatus));
  if (str(req.query.batchId)) {
    const allowed = new Set((db.promotionBatchItems || []).filter((i) => str(i.promotionBatchId) === str(req.query.batchId)).map((i) => str(i.promotionDecisionId)));
    rows = rows.filter((d) => allowed.has(str(d.id)));
  }
  const names = new Map((db.students || []).map((s) => [str(s.id), str(s.name)]));
  rows = rows.map((d) => ({ ...d, studentName: str(names.get(str(d.studentUserId))) })).sort((a, b) => str(b.decidedAt).localeCompare(str(a.decidedAt)));
  writeIfNeeded(db, mutated);
  res.json(rows);
});

router.patch("/decisions/:decisionId/override", auth(), requireRole("ADMIN"), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);
  const id = str(req.params.decisionId);
  const idx = (db.promotionDecisions || []).findIndex((d) => str(d.id) === id);
  if (idx < 0) return res.status(404).json({ message: "Promotion decision not found" });
  const status = str(req.body?.decisionStatus).toLowerCase();
  if (!DECISION_STATUSES.includes(status)) return res.status(400).json({ message: `decisionStatus must be one of: ${DECISION_STATUSES.join(", ")}` });
  const reason = str(req.body?.overrideReason || req.body?.reason);
  if (!reason) return res.status(400).json({ message: "overrideReason is required" });

  const curr = db.promotionDecisions[idx];
  let nextClassId = curr.nextClassId;
  let nextClassName = curr.nextClassName;
  if (str(req.body?.nextClassId || req.body?.nextClassName)) {
    const cls = getClassByInput(db, req.body?.nextClassId || req.body?.nextClassName);
    if (!cls && !["graduated", "not_eligible", "withdrawn"].includes(status)) return res.status(400).json({ message: "Invalid nextClass" });
    nextClassId = cls ? str(cls.id) : "";
    nextClassName = cls ? str(cls.name) : "";
  }
  if (["graduated", "not_eligible", "withdrawn"].includes(status)) { nextClassId = ""; nextClassName = ""; }

  db.promotionDecisions[idx] = { ...curr, decisionStatus: status, nextClassId, nextClassName, isOverridden: true, overrideReason: reason, decidedBy: str(req.user.id), decidedAt: nowIso(), updatedAt: nowIso() };
  logAction(db, req.user.id, "promotion_decision_overridden", id, { previousStatus: curr.decisionStatus, newStatus: status });
  writeDB(db);
  res.json(db.promotionDecisions[idx]);
});

router.post("/batches/:batchId/finalize", auth(), requireRole("ADMIN"), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);
  const batchId = str(req.params.batchId);
  const bidx = (db.promotionBatches || []).findIndex((b) => str(b.id) === batchId);
  if (bidx < 0) return res.status(404).json({ message: "Promotion batch not found" });

  const batch = db.promotionBatches[bidx];
  const sourceSession = resolveSession(db, batch.sessionId);
  const nextName = str(req.body?.nextSessionName) || nextSessionName(sourceSession?.sessionName || batch.sessionId);
  const nextSession = ensureSessionWithTerms(db, nextName);

  const items = (db.promotionBatchItems || []).filter((i) => str(i.promotionBatchId) === batchId);
  const decisions = new Map((db.promotionDecisions || []).map((d) => [str(d.id), d]));
  const classes = new Map((db.classes || []).map((c) => [str(c.id), c]));

  let finalized = 0;
  items.forEach((item) => {
    const d = decisions.get(str(item.promotionDecisionId));
    if (!d) return;
    const sidx = (db.students || []).findIndex((s) => str(s.id) === str(d.studentUserId));
    if (sidx < 0) return;
    const student = db.students[sidx];
    const state = norm(d.decisionStatus);

    let targetClassId = "";
    let targetClassName = "";
    if (["promoted", "promotedconditionally", "probation"].includes(state)) { targetClassId = str(d.nextClassId); targetClassName = str(d.nextClassName || classes.get(targetClassId)?.name); }
    if (state === "repeated") { targetClassId = str(d.currentClassId || student.classId); targetClassName = str(d.currentClassName || student.className || classes.get(targetClassId)?.name); }

    if (targetClassId) {
      db.students[sidx] = { ...student, classId: targetClassId, className: targetClassName, updatedAt: nowIso() };
      db.studentClassHistory.unshift({ id: `sch-${nanoid(10)}`, studentUserId: str(student.id), sessionId: str(nextSession.id), classId: targetClassId, className: targetClassName, entryStatus: ["promoted", "promotedconditionally", "probation"].includes(state) ? "promoted_in" : "repeated_in", promotionStatus: str(d.decisionStatus), startDate: nowIso(), endDate: "", createdAt: nowIso(), updatedAt: nowIso() });
    }

    const t3 = thirdTerm(db, batch.sessionId);
    if (t3) {
      const tsum = (db.termResultSummaries || []).findIndex((r) => str(r.studentUserId) === str(d.studentUserId) && str(r.classId) === str(d.currentClassId) && str(r.sessionId) === str(batch.sessionId) && str(r.termId) === str(t3.id));
      if (tsum >= 0) db.termResultSummaries[tsum] = { ...db.termResultSummaries[tsum], promotionStatus: str(d.decisionStatus).toUpperCase(), promotionDecisionId: str(d.id), nextClassId: targetClassId, nextClassName: targetClassName, updatedAt: nowIso() };
    }

    finalized += 1;
  });

  db.promotionBatchItems = (db.promotionBatchItems || []).map((i) => (str(i.promotionBatchId) === batchId ? { ...i, status: "finalized", updatedAt: nowIso() } : i));
  db.promotionBatches[bidx] = { ...batch, status: "finalized", finalizedAt: nowIso(), finalizedBy: str(req.user.id), nextSessionId: str(nextSession.id), updatedAt: nowIso() };
  logAction(db, req.user.id, "promotion_batch_finalized", "", { batchId, finalized, nextSessionId: nextSession.id });
  writeDB(db);
  res.json({ ok: true, finalized, batch: db.promotionBatches[bidx] });
});

router.post("/run", auth(), requireRole("ADMIN"), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);
  try {
    const session = resolveSession(db, req.body?.sessionId || req.body?.sessionName);
    if (!session) throw new Error("Session could not be resolved");
    const classes = str(req.body?.classId || req.body?.className)
      ? [getClassByInput(db, req.body?.classId || req.body?.className)].filter(Boolean)
      : sortClasses(db.classes || []);
    if (!classes.length) throw new Error("No classes found to process");

    const out = [];
    classes.forEach((cls) => out.push(processBatch(db, { classId: cls.id, sessionId: session.id, generateAnnualSummaries: req.body?.generateAnnualSummaries !== false, title: req.body?.title ? `${req.body.title} - ${cls.name}` : "" }, req.user.id)));
    writeDB(db);

    return res.json({ ok: true, message: `Promotion run completed for ${out.length} class(es).`, batches: out.map((x) => x.batch), counts: out.map((x) => x.counts) });
  } catch (e) {
    writeIfNeeded(db, mutated);
    return res.status(400).json({ message: e.message || "Promotion run failed" });
  }
});

module.exports = router;
