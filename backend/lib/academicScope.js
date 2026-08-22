const { nanoid } = require("nanoid");

const DEFAULT_TERM_NAMES = ["First Term", "Second Term", "Third Term"];

function nowIso() {
  return new Date().toISOString();
}

function str(value) {
  return String(value || "").trim();
}

function key(value) {
  return str(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function bool(value, fallback = false) {
  if (typeof value === "boolean") return value;
  const safe = str(value).toLowerCase();
  if (["true", "1", "yes", "y", "on", "open", "active"].includes(safe)) return true;
  if (["false", "0", "no", "n", "off", "closed", "inactive"].includes(safe)) return false;
  return fallback;
}

function normalizeSessionName(value) {
  const safe = str(value);
  if (!safe) return "";
  const match = safe.match(/\d{4}\s*\/\s*\d{4}/);
  if (match) return match[0].replace(/\s+/g, "");
  return safe.replace(/\s+Admission$/i, "").trim();
}

function normalizeTermName(value) {
  const safe = str(value);
  const safeKey = key(safe);
  if (safeKey === "first" || safeKey === "firstterm" || safeKey === "term1" || safeKey === "1stterm") return "First Term";
  if (safeKey === "second" || safeKey === "secondterm" || safeKey === "term2" || safeKey === "2ndterm") return "Second Term";
  if (safeKey === "third" || safeKey === "thirdterm" || safeKey === "term3" || safeKey === "3rdterm") return "Third Term";
  return safe || "First Term";
}

function defaultSessionName() {
  const year = new Date().getFullYear();
  return `${year}/${year + 1}`;
}

function termOrder(termName) {
  const idx = DEFAULT_TERM_NAMES.findIndex((item) => key(item) === key(termName));
  return idx >= 0 ? idx + 1 : 99;
}

function ensureArrays(db) {
  if (!Array.isArray(db.academicSessions)) db.academicSessions = [];
  if (!Array.isArray(db.terms)) db.terms = [];
}

function ensureAcademicSession(db, sessionName, values = {}) {
  ensureArrays(db);
  const safeName = normalizeSessionName(sessionName || values.sessionName || values.academicSession);
  if (!safeName) return null;

  let row = (db.academicSessions || []).find((item) => key(item.sessionName) === key(safeName));
  const now = nowIso();
  if (!row) {
    row = {
      id: str(values.id) && !String(values.id).startsWith("admission-") ? str(values.id) : nanoid(),
      sessionName: safeName,
      startDate: str(values.startDate),
      endDate: str(values.endDate),
      isActive: bool(values.isActive, false),
      createdAt: str(values.createdAt) || now,
      updatedAt: str(values.updatedAt) || now,
    };
    db.academicSessions.unshift(row);
  } else {
    row.sessionName = safeName;
    if (values.startDate !== undefined && str(values.startDate)) row.startDate = str(values.startDate);
    if (values.endDate !== undefined) row.endDate = str(values.endDate);
    if (values.isActive !== undefined && bool(values.isActive, false)) row.isActive = true;
    row.createdAt = str(row.createdAt || values.createdAt) || now;
    row.updatedAt = str(values.updatedAt || row.updatedAt) || now;
  }
  return row;
}

function ensureAcademicTerm(db, sessionId, termName, values = {}) {
  ensureArrays(db);
  const safeSessionId = str(sessionId);
  const safeTermName = normalizeTermName(termName || values.termName);
  if (!safeSessionId || !safeTermName) return null;

  let row = (db.terms || []).find((item) => str(item.sessionId) === safeSessionId && key(item.termName) === key(safeTermName));
  const now = nowIso();
  if (!row) {
    row = {
      id: str(values.id) || nanoid(),
      sessionId: safeSessionId,
      termName: safeTermName,
      startDate: str(values.startDate),
      endDate: str(values.endDate),
      isActive: bool(values.isActive, false),
      createdAt: str(values.createdAt) || now,
      updatedAt: str(values.updatedAt) || now,
    };
    db.terms.push(row);
  } else {
    row.sessionId = safeSessionId;
    row.termName = safeTermName;
    if (values.startDate !== undefined && str(values.startDate)) row.startDate = str(values.startDate);
    if (values.endDate !== undefined) row.endDate = str(values.endDate);
    if (values.isActive !== undefined && bool(values.isActive, false)) row.isActive = true;
    row.createdAt = str(row.createdAt || values.createdAt) || now;
    row.updatedAt = str(values.updatedAt || row.updatedAt) || now;
  }
  return row;
}

function ensureDefaultTerms(db, sessionId, activeTermName = "") {
  DEFAULT_TERM_NAMES.forEach((name) => {
    ensureAcademicTerm(db, sessionId, name, {
      isActive: activeTermName ? key(activeTermName) === key(name) : false,
    });
  });
}

function findAcademicSession(db, input) {
  const safe = str(input);
  if (!safe) return null;
  const safeName = normalizeSessionName(safe);
  return (db.academicSessions || []).find((row) => str(row.id) === safe || key(row.sessionName) === key(safeName)) || null;
}

function findAcademicTerm(db, input, sessionId = "") {
  const safe = str(input);
  if (!safe) return null;
  const safeName = normalizeTermName(safe);
  return (db.terms || []).find((row) => {
    if (sessionId && str(row.sessionId) !== str(sessionId)) return false;
    return str(row.id) === safe || key(row.termName) === key(safeName);
  }) || null;
}

function remapAcademicRefs(rows, sessionMap, termMap) {
  if (!Array.isArray(rows)) return;
  rows.forEach((row) => {
    const oldSessionId = str(row.sessionId);
    const oldTermId = str(row.termId);
    if (oldSessionId && sessionMap.has(oldSessionId)) row.sessionId = sessionMap.get(oldSessionId);
    if (oldTermId && termMap.has(oldTermId)) row.termId = termMap.get(oldTermId);
  });
}

function migrateLmsScope(db) {
  const lmsSessions = Array.isArray(db.lmsSessions) ? db.lmsSessions : [];
  const lmsTerms = Array.isArray(db.lmsTerms) ? db.lmsTerms : [];
  const sessionMap = new Map();
  const termMap = new Map();

  lmsSessions.forEach((oldSession) => {
    const row = ensureAcademicSession(db, oldSession.sessionName, oldSession);
    if (row && oldSession.id) sessionMap.set(str(oldSession.id), str(row.id));
  });

  lmsTerms.forEach((oldTerm) => {
    const targetSessionId = sessionMap.get(str(oldTerm.sessionId)) || str(oldTerm.sessionId);
    const session = (db.academicSessions || []).find((row) => str(row.id) === targetSessionId);
    if (!session) return;
    const row = ensureAcademicTerm(db, session.id, oldTerm.termName, oldTerm);
    if (row && oldTerm.id) termMap.set(str(oldTerm.id), str(row.id));
  });

  [
    "lmsClassSubjects",
    "lmsTopics",
    "lmsLessons",
    "lmsAssignments",
    "lmsQuizzes",
    "lmsAnnouncements",
  ].forEach((collection) => remapAcademicRefs(db[collection], sessionMap, termMap));
}

function migrateAdmissionScope(db) {
  const rows = Array.isArray(db.admissionSessions) ? db.admissionSessions : [];
  if (!Array.isArray(db.admissionSessionSettings)) db.admissionSessionSettings = [];
  const sessionMap = new Map();

  rows.forEach((oldSession) => {
    const academicName = normalizeSessionName(oldSession.academicSession || oldSession.sessionName || oldSession.title);
    const row = ensureAcademicSession(db, academicName, {
      ...oldSession,
      sessionName: academicName,
      isActive: str(oldSession.status).toUpperCase() === "OPEN" ? true : oldSession.isActive,
    });
    if (!row) return;

    if (oldSession.id) sessionMap.set(str(oldSession.id), str(row.id));
    let settings = db.admissionSessionSettings.find((item) => str(item.sessionId) === str(row.id));
    if (!settings) {
      settings = { id: `admission-settings-${row.id}`, sessionId: row.id };
      db.admissionSessionSettings.push(settings);
    }
    settings.title = str(oldSession.title) || `${row.sessionName} Admission`;
    settings.academicSession = row.sessionName;
    settings.startDate = str(oldSession.startDate || settings.startDate);
    settings.endDate = str(oldSession.endDate || settings.endDate);
    settings.applicationFee = Number(oldSession.applicationFee || settings.applicationFee || 0);
    settings.acceptanceFee = Number(oldSession.acceptanceFee || settings.acceptanceFee || 0);
    settings.status = str(oldSession.status || settings.status || (row.isActive ? "OPEN" : "CLOSED")).toUpperCase() === "OPEN" ? "OPEN" : "CLOSED";
    settings.createdAt = str(oldSession.createdAt || settings.createdAt) || nowIso();
    settings.updatedAt = str(oldSession.updatedAt || settings.updatedAt) || nowIso();
  });

  remapAcademicRefs(db.admissions, sessionMap, new Map());
}

function setActiveAcademicScope(db, sessionId, termId = "") {
  ensureArrays(db);
  const targetSession = findAcademicSession(db, sessionId) || (db.academicSessions || [])[0] || null;
  if (!targetSession) return { activeSession: null, activeTerm: null };

  ensureDefaultTerms(db, targetSession.id);
  const targetTerm =
    findAcademicTerm(db, termId, targetSession.id) ||
    (db.terms || []).find((row) => str(row.sessionId) === str(targetSession.id) && row.isActive) ||
    (db.terms || []).find((row) => str(row.sessionId) === str(targetSession.id)) ||
    null;

  const now = nowIso();
  db.academicSessions.forEach((row) => {
    row.isActive = str(row.id) === str(targetSession.id);
    row.updatedAt = now;
  });
  db.terms.forEach((row) => {
    row.isActive = targetTerm ? str(row.id) === str(targetTerm.id) : false;
    row.updatedAt = now;
  });

  if (!db.financeSettings || typeof db.financeSettings !== "object") db.financeSettings = {};
  db.financeSettings.activeSessionId = str(targetSession.id);
  db.financeSettings.activeTermId = str(targetTerm?.id);

  syncAcademicMirrors(db);
  return { activeSession: targetSession, activeTerm: targetTerm };
}

function buildAdmissionSessionRow(db, session) {
  if (!Array.isArray(db.admissionSessionSettings)) db.admissionSessionSettings = [];
  let settings = db.admissionSessionSettings.find((item) => str(item.sessionId) === str(session.id));
  if (!settings) {
    settings = {
      id: `admission-settings-${session.id}`,
      sessionId: session.id,
      title: `${session.sessionName} Admission`,
      academicSession: session.sessionName,
      startDate: str(session.startDate),
      endDate: str(session.endDate),
      applicationFee: Number(process.env.APPLICATION_FEE_DEFAULT || 2000),
      acceptanceFee: Number(process.env.ADMISSION_ACCEPTANCE_FEE_DEFAULT || 25000),
      status: session.isActive ? "OPEN" : "CLOSED",
      createdAt: str(session.createdAt) || nowIso(),
      updatedAt: str(session.updatedAt) || nowIso(),
    };
    db.admissionSessionSettings.push(settings);
  }

  return {
    id: str(session.id),
    title: str(settings.title) || `${session.sessionName} Admission`,
    academicSession: str(session.sessionName),
    sessionName: str(session.sessionName),
    startDate: str(settings.startDate || session.startDate),
    endDate: str(settings.endDate || session.endDate),
    applicationFee: Number(settings.applicationFee || 0),
    acceptanceFee: Number(settings.acceptanceFee || 0),
    status: str(settings.status || (session.isActive ? "OPEN" : "CLOSED")).toUpperCase() === "OPEN" ? "OPEN" : "CLOSED",
    isActive: Boolean(session.isActive),
    createdAt: str(settings.createdAt || session.createdAt) || nowIso(),
    updatedAt: str(settings.updatedAt || session.updatedAt) || nowIso(),
  };
}

function syncAcademicMirrors(db) {
  ensureArrays(db);
  db.academicSessions.sort((a, b) => str(b.sessionName).localeCompare(str(a.sessionName)));
  db.terms.sort((a, b) => {
    const sessionCompare = str(a.sessionId).localeCompare(str(b.sessionId));
    if (sessionCompare) return sessionCompare;
    return termOrder(a.termName) - termOrder(b.termName);
  });

  db.lmsSessions = db.academicSessions.map((row) => ({ ...row }));
  db.lmsTerms = db.terms.map((row) => ({ ...row }));
  db.admissionSessions = db.academicSessions.map((row) => buildAdmissionSessionRow(db, row));
}

function ensureAcademicScope(db, options = {}) {
  ensureArrays(db);
  const requestedSession = normalizeSessionName(options.currentSession || process.env.CURRENT_SESSION || defaultSessionName());
  const requestedTerm = normalizeTermName(options.currentTerm || process.env.CURRENT_TERM || "First Term");

  db.academicSessions = (db.academicSessions || [])
    .map((row) => ({
      ...row,
      id: str(row.id) || nanoid(),
      sessionName: normalizeSessionName(row.sessionName || row.academicSession || row.title) || requestedSession,
      startDate: str(row.startDate),
      endDate: str(row.endDate),
      isActive: bool(row.isActive, false),
      createdAt: str(row.createdAt) || nowIso(),
      updatedAt: str(row.updatedAt) || nowIso(),
    }))
    .filter((row) => row.sessionName);

  db.terms = (db.terms || [])
    .map((row) => ({
      ...row,
      id: str(row.id) || nanoid(),
      sessionId: str(row.sessionId),
      termName: normalizeTermName(row.termName),
      startDate: str(row.startDate),
      endDate: str(row.endDate),
      isActive: bool(row.isActive, false),
      createdAt: str(row.createdAt) || nowIso(),
      updatedAt: str(row.updatedAt) || nowIso(),
    }))
    .filter((row) => row.sessionId && row.termName);

  migrateLmsScope(db);
  migrateAdmissionScope(db);

  let activeSession =
    findAcademicSession(db, db.financeSettings?.activeSessionId) ||
    (db.academicSessions || []).find((row) => row.isActive) ||
    ensureAcademicSession(db, requestedSession, { isActive: true });

  if (!activeSession && db.academicSessions.length) activeSession = db.academicSessions[0];
  if (!activeSession) activeSession = ensureAcademicSession(db, defaultSessionName(), { isActive: true });

  for (const session of db.academicSessions || []) {
    ensureDefaultTerms(db, session.id, str(session.id) === str(activeSession?.id) ? requestedTerm : "");
  }

  let activeTerm =
    findAcademicTerm(db, db.financeSettings?.activeTermId, activeSession?.id) ||
    (db.terms || []).find((row) => str(row.sessionId) === str(activeSession?.id) && row.isActive) ||
    findAcademicTerm(db, requestedTerm, activeSession?.id) ||
    (db.terms || []).find((row) => str(row.sessionId) === str(activeSession?.id)) ||
    null;

  return setActiveAcademicScope(db, activeSession?.id, activeTerm?.id);
}

module.exports = {
  DEFAULT_TERM_NAMES,
  nowIso,
  str,
  key,
  normalizeSessionName,
  normalizeTermName,
  ensureAcademicScope,
  ensureAcademicSession,
  ensureAcademicTerm,
  ensureDefaultTerms,
  findAcademicSession,
  findAcademicTerm,
  setActiveAcademicScope,
  syncAcademicMirrors,
  buildAdmissionSessionRow,
};
