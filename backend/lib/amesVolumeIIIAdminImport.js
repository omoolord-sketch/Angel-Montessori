const fs = require("fs");
const path = require("path");
const { createHash, randomUUID } = require("crypto");
const { resolveDbPath } = require("./jsonStore");
const {
  appendCurriculumAuditLog,
  ensureEarlyYearsCurriculumShape,
  importCurriculumPayload,
  seedDirectory,
  validateImportPayload,
  FRAMEWORK_CODE,
  SOURCE_VERSION,
  str,
} = require("./earlyYearsCurriculum");

const APPROVED_SOURCE_DOCUMENT = "AMES Volume III - The Complete Early Years Curriculum";
const APPROVED_SOURCE_LABEL = "approved AMES Volume III";
const CONFIRMATION_TEXT = "IMPORT_APPROVED_AMES_VOLUME_III";

const APPROVED_SEED_FILES = [
  "creche-term-1.json",
  "creche-term-2.json",
  "creche-term-3.json",
  "nursery-term-1.json",
  "nursery-term-2.json",
  "nursery-term-3.json",
  "reception-term-1.json",
  "reception-term-2.json",
  "reception-term-3.json",
];

const EXPECTED_CLASS_COUNTS = {
  "Crèche": 39,
  Nursery: 39,
  Reception: 39,
};

const MUTABLE_CURRICULUM_COLLECTIONS = new Set([
  "curriculumFrameworks",
  "curriculumFrameworkVersions",
  "curriculumTerms",
  "curriculumWeeks",
  "curriculumItems",
  "curriculumImportBatches",
  "curriculumAuditLogs",
  "curriculumDevelopmentalJourneys",
]);

const PLACEHOLDER_MARKERS = [
  "AWAITING_APPROVED_MASTER_CONTENT",
  "PLACEHOLDER",
  "TODO",
  "TBD",
  "LOREM",
  "DUMMY",
  "SAMPLE DATA",
];

function arr(value) {
  return Array.isArray(value) ? value : [];
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function stableStringify(value) {
  if (value === undefined) return "\"__undefined__\"";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function hashValue(value) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function makeError(message, status = 400, details = {}) {
  const error = new Error(message);
  error.status = status;
  error.details = details;
  return error;
}

function maskPath(filePath) {
  const raw = String(filePath || "");
  const parts = raw.split(/[\\/]+/).filter(Boolean);
  if (parts.length <= 2) return raw;
  const prefix = raw.startsWith("/") ? "/" : "";
  return `${prefix}...${path.sep}${parts.slice(-2).join(path.sep)}`;
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readDatabaseSnapshot() {
  const dbPath = resolveDbPath();
  if (!fs.existsSync(dbPath)) {
    return {
      databaseDetected: false,
      dbPath,
      resolvedDatabasePath: maskPath(dbPath),
      db: null,
    };
  }

  return {
    databaseDetected: true,
    dbPath,
    resolvedDatabasePath: maskPath(dbPath),
    db: readJsonFile(dbPath),
  };
}

function countPlaceholderMarkers(value) {
  let count = 0;
  const scan = (input) => {
    if (input == null) return;
    if (typeof input === "string") {
      const upper = input.toUpperCase();
      PLACEHOLDER_MARKERS.forEach((marker) => {
        if (upper.includes(marker)) count += 1;
      });
      return;
    }
    if (Array.isArray(input)) {
      input.forEach(scan);
      return;
    }
    if (typeof input === "object") {
      Object.values(input).forEach(scan);
    }
  };
  scan(value);
  return count;
}

function normalizeClassName(value) {
  const text = str(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (text.includes("creche")) return "Crèche";
  if (text.includes("nursery")) return "Nursery";
  if (text.includes("reception")) return "Reception";
  return "";
}

function loadApprovedSeeds() {
  const base = seedDirectory();
  const baseResolved = path.resolve(base);
  const seedReports = [];
  const errors = [];

  APPROVED_SEED_FILES.forEach((fileName) => {
    const fullPath = path.resolve(baseResolved, fileName);
    if (!fullPath.startsWith(baseResolved + path.sep) && fullPath !== baseResolved) {
      errors.push(`${fileName} resolves outside the AMES Volume III seed directory.`);
      return;
    }
    if (!fs.existsSync(fullPath)) {
      errors.push(`Missing approved AMES Volume III seed file: ${fileName}`);
      return;
    }

    const raw = readJsonFile(fullPath);
    const validation = validateImportPayload(raw, fullPath);
    const className = validation.payload.className || normalizeClassName(raw.className || raw.classLevelCode || raw.classId);
    const sourceStatus = str(raw.sourceStatus);
    const sourceVersion = str(raw.sourceVersion || raw.framework?.version);
    const sourceDocument = str(raw.sourceDocument || APPROVED_SOURCE_DOCUMENT);

    validation.errors.forEach((message) => errors.push(`${fileName}: ${message}`));
    if (sourceStatus !== "APPROVED_LOCKED") errors.push(`${fileName}: sourceStatus must be APPROVED_LOCKED.`);
    if (sourceVersion !== SOURCE_VERSION) errors.push(`${fileName}: sourceVersion must be ${SOURCE_VERSION}.`);
    if (!sourceDocument.includes("AMES Volume III")) errors.push(`${fileName}: sourceDocument must reference AMES Volume III.`);
    if (!EXPECTED_CLASS_COUNTS[className]) errors.push(`${fileName}: class must be Crèche, Nursery, or Reception.`);

    seedReports.push({
      fileName,
      fullPath,
      raw,
      className,
      termName: validation.payload.termName,
      weeksDetected: validation.payload.weeks.length,
      itemsDetected: validation.payload.weeks.reduce((sum, week) => sum + arr(week.items).length, 0),
      placeholderCount: countPlaceholderMarkers(raw),
      sourceDocument,
      sourceVersion,
      sourceStatus,
      validation,
    });
  });

  const counts = Object.keys(EXPECTED_CLASS_COUNTS).reduce((next, key) => ({ ...next, [key]: 0 }), {});
  seedReports.forEach((report) => {
    counts[report.className] = (counts[report.className] || 0) + report.weeksDetected;
    if (report.placeholderCount) errors.push(`${report.fileName}: placeholder markers were detected.`);
  });

  Object.entries(EXPECTED_CLASS_COUNTS).forEach(([className, expected]) => {
    if (counts[className] !== expected) {
      errors.push(`${className} seed count must be ${expected}; detected ${counts[className] || 0}.`);
    }
  });

  return {
    baseDirectory: baseResolved,
    files: seedReports,
    counts,
    totalWeeks: Object.values(counts).reduce((sum, value) => sum + value, 0),
    totalItems: seedReports.reduce((sum, report) => sum + report.itemsDetected, 0),
    placeholderCount: seedReports.reduce((sum, report) => sum + report.placeholderCount, 0),
    source: APPROVED_SOURCE_DOCUMENT,
    version: SOURCE_VERSION,
    errors,
  };
}

function seedWeekCodes(seedBundle) {
  return seedBundle.files.flatMap((file) => arr(file.raw.weeks).map((week) => str(week.code)).filter(Boolean));
}

function seedItemCodes(seedBundle) {
  return seedBundle.files.flatMap((file) =>
    arr(file.raw.weeks).flatMap((week) => arr(week.items).map((item) => str(item.code)).filter(Boolean))
  );
}

function mapRowsByCode(rows) {
  const map = new Map();
  arr(rows).forEach((row) => {
    const code = str(row.code);
    if (!code) return;
    if (!map.has(code)) map.set(code, []);
    map.get(code).push(row);
  });
  return map;
}

function duplicateCodes(rows) {
  return Array.from(mapRowsByCode(rows).entries())
    .filter(([, matches]) => matches.length > 1)
    .map(([code, matches]) => ({ code, count: matches.length }));
}

function approvedFrameworkIds(db) {
  const ids = new Set();
  arr(db?.curriculumFrameworks).forEach((row) => {
    const label = `${str(row.name)} ${str(row.sourceDocument)}`;
    if (str(row.code) === FRAMEWORK_CODE || label.includes("AMES Volume III")) {
      ids.add(str(row.id));
    }
  });
  return ids;
}

function approvedTerms(db) {
  const frameworkIds = approvedFrameworkIds(db);
  return arr(db?.curriculumTerms).filter((row) =>
    str(row.frameworkCode) === FRAMEWORK_CODE || frameworkIds.has(str(row.frameworkId)) || str(row.code).startsWith(FRAMEWORK_CODE)
  );
}

function approvedWeeks(db, seedBundle) {
  const expectedCodes = new Set(seedWeekCodes(seedBundle));
  const termsById = new Map(approvedTerms(db).map((term) => [str(term.id), term]));
  return arr(db?.curriculumWeeks).filter((row) => expectedCodes.has(str(row.code)) || termsById.has(str(row.curriculumTermId)));
}

function approvedItems(db, seedBundle) {
  const expectedCodes = new Set(seedItemCodes(seedBundle));
  const weekIds = new Set(approvedWeeks(db, seedBundle).map((week) => str(week.id)));
  return arr(db?.curriculumItems).filter((row) => expectedCodes.has(str(row.code)) || weekIds.has(str(row.curriculumWeekId)));
}

function classCounts(db, seedBundle) {
  const termsById = new Map(approvedTerms(db).map((term) => [str(term.id), term]));
  const counts = Object.keys(EXPECTED_CLASS_COUNTS).reduce((next, key) => ({ ...next, [key]: 0 }), {});

  approvedWeeks(db, seedBundle).forEach((week) => {
    const term = termsById.get(str(week.curriculumTermId));
    const className = normalizeClassName(term?.className || term?.classLevelCode || week.className || week.classLevelCode);
    if (className) counts[className] = (counts[className] || 0) + 1;
  });

  return counts;
}

function validateApprovedVolumeIII(db, seedBundle = loadApprovedSeeds()) {
  const errors = [];
  if (seedBundle.errors.length) errors.push(...seedBundle.errors);

  const counts = classCounts(db, seedBundle);
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const weeks = approvedWeeks(db, seedBundle);
  const items = approvedItems(db, seedBundle);
  const weekCodeCounts = mapRowsByCode(weeks);
  const itemCodeCounts = mapRowsByCode(items);
  const expectedWeekCodes = seedWeekCodes(seedBundle);
  const expectedItemCodes = seedItemCodes(seedBundle);
  const duplicateWeekCodes = duplicateCodes(weeks);
  const duplicateItemCodes = duplicateCodes(items);
  const missingWeekCodes = expectedWeekCodes.filter((code) => (weekCodeCounts.get(code) || []).length !== 1);
  const missingItemCodes = expectedItemCodes.filter((code) => (itemCodeCounts.get(code) || []).length !== 1);
  const unexpectedWeekCodes = Array.from(weekCodeCounts.keys()).filter((code) => !expectedWeekCodes.includes(code));
  const placeholderCount = countPlaceholderMarkers({ terms: approvedTerms(db), weeks, items });
  const sourceVersionMismatches = [...weeks, ...items].filter((row) =>
    str(row.sourceVersion) !== SOURCE_VERSION || !str(row.sourceDocument).includes("AMES Volume III")
  );

  Object.entries(EXPECTED_CLASS_COUNTS).forEach(([className, expected]) => {
    if (counts[className] !== expected) errors.push(`${className} must have ${expected} weeks; detected ${counts[className] || 0}.`);
  });
  if (total !== 117) errors.push(`Total approved AMES Volume III weeks must be 117; detected ${total}.`);
  if (duplicateWeekCodes.length || duplicateItemCodes.length) errors.push("Duplicate approved AMES Volume III curriculum codes were detected.");
  if (placeholderCount > 0) errors.push("Placeholder markers were detected in imported curriculum records.");
  if (missingWeekCodes.length) errors.push(`${missingWeekCodes.length} approved AMES Volume III week codes are missing.`);
  if (missingItemCodes.length) errors.push(`${missingItemCodes.length} approved AMES Volume III item codes are missing.`);
  if (unexpectedWeekCodes.length) errors.push(`${unexpectedWeekCodes.length} unexpected AMES Volume III week codes were detected.`);
  if (sourceVersionMismatches.length) errors.push(`${sourceVersionMismatches.length} imported curriculum records have incorrect source/version metadata.`);

  return {
    ok: errors.length === 0,
    errors,
    total,
    classCounts: counts,
    duplicates: {
      weeks: duplicateWeekCodes,
      items: duplicateItemCodes,
      total: duplicateWeekCodes.length + duplicateItemCodes.length,
    },
    duplicateCount: duplicateWeekCodes.length + duplicateItemCodes.length,
    placeholderCount,
    source: APPROVED_SOURCE_LABEL,
    sourceDocument: APPROVED_SOURCE_DOCUMENT,
    version: SOURCE_VERSION,
    missingWeekCodes,
    missingItemCount: missingItemCodes.length,
    unexpectedWeekCodes,
    sourceVersionMismatchCount: sourceVersionMismatches.length,
  };
}

function diffByCode(beforeRows, afterRows) {
  const before = mapRowsByCode(beforeRows);
  const after = mapRowsByCode(afterRows);
  let additions = 0;
  let updates = 0;

  after.forEach((rows, code) => {
    if (!before.has(code)) {
      additions += rows.length;
      return;
    }
    if (hashValue(before.get(code)) !== hashValue(rows)) updates += rows.length;
  });

  return { additions, updates, deletions: 0 };
}

function buildCurriculumDiff(originalDb, candidateDb, seedBundle) {
  const terms = diffByCode(approvedTerms(originalDb), approvedTerms(candidateDb));
  const weeks = diffByCode(approvedWeeks(originalDb, seedBundle), approvedWeeks(candidateDb, seedBundle));
  const items = diffByCode(approvedItems(originalDb, seedBundle), approvedItems(candidateDb, seedBundle));
  const additions = terms.additions + weeks.additions + items.additions;
  const updates = terms.updates + weeks.updates + items.updates;

  return {
    proposedAdditions: {
      terms: terms.additions,
      weeks: weeks.additions,
      items: items.additions,
      totalRecords: additions,
    },
    proposedUpdates: {
      terms: terms.updates,
      weeks: weeks.updates,
      items: items.updates,
      totalRecords: updates,
    },
    proposedDeletions: {
      terms: 0,
      weeks: 0,
      items: 0,
      totalRecords: 0,
    },
  };
}

function compareProtectedCollections(originalDb, candidateDb) {
  const keys = new Set([...Object.keys(originalDb || {}), ...Object.keys(candidateDb || {})]);
  const changedCollections = [];

  Array.from(keys).sort().forEach((key) => {
    if (MUTABLE_CURRICULUM_COLLECTIONS.has(key)) return;
    const beforeExists = Object.prototype.hasOwnProperty.call(originalDb || {}, key);
    const afterExists = Object.prototype.hasOwnProperty.call(candidateDb || {}, key);
    const beforeHash = beforeExists ? hashValue(originalDb[key]) : "__missing__";
    const afterHash = afterExists ? hashValue(candidateDb[key]) : "__missing__";
    if (beforeHash !== afterHash) changedCollections.push(key);
  });

  return {
    ok: changedCollections.length === 0,
    changedCollections,
    protectedCollectionsChecked: Array.from(keys).filter((key) => !MUTABLE_CURRICULUM_COLLECTIONS.has(key)).length,
  };
}

function buildFinalDb(originalDb, importedClone) {
  const finalDb = cloneJson(originalDb);
  MUTABLE_CURRICULUM_COLLECTIONS.forEach((key) => {
    finalDb[key] = cloneJson(importedClone[key] || []);
  });
  return finalDb;
}

function buildImportCandidate(originalDb, actor = {}, options = {}) {
  const seedBundle = loadApprovedSeeds();
  if (seedBundle.errors.length) {
    throw makeError("Approved AMES Volume III source validation failed.", 500, { errors: seedBundle.errors });
  }

  const originalValidation = validateApprovedVolumeIII(originalDb, seedBundle);
  if (originalValidation.ok) {
    return {
      seedBundle,
      originalValidation,
      finalValidation: originalValidation,
      finalDb: cloneJson(originalDb),
      reports: [],
      diff: {
        proposedAdditions: { terms: 0, weeks: 0, items: 0, totalRecords: 0 },
        proposedUpdates: { terms: 0, weeks: 0, items: 0, totalRecords: 0 },
        proposedDeletions: { terms: 0, weeks: 0, items: 0, totalRecords: 0 },
      },
      protectedComparison: compareProtectedCollections(originalDb, originalDb),
      alreadyImported: true,
    };
  }

  const workingDb = cloneJson(originalDb);
  ensureEarlyYearsCurriculumShape(workingDb);
  const reports = seedBundle.files.map((file) => importCurriculumPayload(workingDb, file.raw, {
    sourceFile: file.fullPath,
    actor,
  }));

  if (typeof options.afterImportHook === "function") options.afterImportHook(workingDb);

  const finalDb = buildFinalDb(originalDb, workingDb);
  if (typeof options.beforeProtectedCompareHook === "function") options.beforeProtectedCompareHook(finalDb);

  const protectedComparison = compareProtectedCollections(originalDb, finalDb);
  const finalValidation = validateApprovedVolumeIII(finalDb, seedBundle);
  const diff = buildCurriculumDiff(originalDb, finalDb, seedBundle);

  return {
    seedBundle,
    originalValidation,
    finalValidation,
    finalDb,
    reports,
    diff,
    protectedComparison,
    alreadyImported: false,
  };
}

function publicSummaryFromCandidate(snapshot, candidate, mode = "dry-run") {
  const backupRequired = !candidate.alreadyImported;
  return {
    mode,
    databaseDetected: snapshot.databaseDetected,
    resolvedDatabasePath: snapshot.resolvedDatabasePath,
    existingCurriculumTotal: candidate.originalValidation.total,
    currentCounts: candidate.originalValidation.classCounts,
    crecheCurrentCount: candidate.originalValidation.classCounts["Crèche"] || 0,
    nurseryCurrentCount: candidate.originalValidation.classCounts.Nursery || 0,
    receptionCurrentCount: candidate.originalValidation.classCounts.Reception || 0,
    proposedAdditions: candidate.diff.proposedAdditions,
    proposedUpdates: candidate.diff.proposedUpdates,
    proposedDeletions: candidate.diff.proposedDeletions,
    expectedFinalTotal: candidate.finalValidation.total,
    expectedFinalCounts: candidate.finalValidation.classCounts,
    duplicateCount: candidate.finalValidation.duplicateCount,
    placeholderCount: candidate.seedBundle.placeholderCount + candidate.finalValidation.placeholderCount,
    source: candidate.finalValidation.source,
    sourceDocument: candidate.finalValidation.sourceDocument,
    version: candidate.finalValidation.version,
    backupRequired,
    alreadyImported: candidate.alreadyImported,
    canImport: snapshot.databaseDetected && !candidate.alreadyImported && candidate.finalValidation.ok && candidate.protectedComparison.ok,
    protectedCollections: {
      ok: candidate.protectedComparison.ok,
      checked: candidate.protectedComparison.protectedCollectionsChecked,
      changedCollections: candidate.protectedComparison.changedCollections,
    },
    verification: candidate.finalValidation,
    reports: candidate.reports.map((report) => ({
      class: report.class,
      term: report.term,
      weeksDetected: report.weeksDetected,
      weeksCreated: report.weeksCreated,
      weeksUpdated: report.weeksUpdated,
      itemsDetected: report.itemsDetected,
      itemsCreated: report.itemsCreated,
      itemsUpdated: report.itemsUpdated,
      result: report.result,
    })),
    errors: candidate.finalValidation.errors,
  };
}

function getVolumeIIIImportStatus() {
  const snapshot = readDatabaseSnapshot();
  if (!snapshot.databaseDetected) {
    const seedBundle = loadApprovedSeeds();
    return {
      mode: "status",
      databaseDetected: false,
      resolvedDatabasePath: snapshot.resolvedDatabasePath,
      existingCurriculumTotal: 0,
      currentCounts: { "Crèche": 0, Nursery: 0, Reception: 0 },
      crecheCurrentCount: 0,
      nurseryCurrentCount: 0,
      receptionCurrentCount: 0,
      proposedAdditions: { terms: 0, weeks: 0, items: 0, totalRecords: 0 },
      proposedUpdates: { terms: 0, weeks: 0, items: 0, totalRecords: 0 },
      proposedDeletions: { terms: 0, weeks: 0, items: 0, totalRecords: 0 },
      expectedFinalTotal: 117,
      duplicateCount: 0,
      placeholderCount: seedBundle.placeholderCount,
      source: APPROVED_SOURCE_LABEL,
      sourceDocument: APPROVED_SOURCE_DOCUMENT,
      version: SOURCE_VERSION,
      backupRequired: false,
      alreadyImported: false,
      canImport: false,
      errors: ["JSON database file was not found."],
    };
  }

  const candidate = buildImportCandidate(snapshot.db, { id: "status-check", role: "ADMIN" });
  return publicSummaryFromCandidate(snapshot, candidate, "status");
}

function dryRunVolumeIIIImport(actor = {}) {
  const snapshot = readDatabaseSnapshot();
  if (!snapshot.databaseDetected) return getVolumeIIIImportStatus();
  const candidate = buildImportCandidate(snapshot.db, actor);
  return publicSummaryFromCandidate(snapshot, candidate, "dry-run");
}

function timestampForFile() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function createDatabaseBackup(dbPath) {
  const backupDir = path.join(path.dirname(dbPath), "backups", "ames-volume-iii");
  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `db-${timestampForFile()}.json`);
  fs.copyFileSync(dbPath, backupPath);
  return {
    path: backupPath,
    reference: maskPath(backupPath),
  };
}

function writeJsonAtomically(dbPath, db) {
  const tempPath = `${dbPath}.tmp-${process.pid}-${Date.now()}-${randomUUID().slice(0, 8)}`;
  fs.writeFileSync(tempPath, JSON.stringify(db, null, 2));
  fs.renameSync(tempPath, dbPath);
}

function executeVolumeIIIImport(options = {}) {
  const actor = options.actor || {};
  const confirmation = str(options.confirmation || options.confirm || "");
  if (confirmation !== CONFIRMATION_TEXT) {
    throw makeError(`Confirmation must be ${CONFIRMATION_TEXT}.`, 400);
  }

  const snapshot = readDatabaseSnapshot();
  if (!snapshot.databaseDetected) {
    throw makeError("JSON database file was not found. Import aborted before any write.", 400);
  }

  const candidate = buildImportCandidate(snapshot.db, actor, options);
  if (candidate.alreadyImported) {
    return {
      ...publicSummaryFromCandidate(snapshot, candidate, "execute"),
      result: "ALREADY_IMPORTED",
      backupCreated: false,
      backupReference: "",
      persistedVerification: candidate.finalValidation,
    };
  }

  if (!candidate.finalValidation.ok) {
    throw makeError("Approved AMES Volume III import validation failed. Import aborted before any write.", 422, candidate.finalValidation);
  }
  if (!candidate.protectedComparison.ok) {
    throw makeError("Protected data changed during import simulation. Import aborted before any write.", 409, candidate.protectedComparison);
  }

  const finalDb = cloneJson(candidate.finalDb);
  appendCurriculumAuditLog(finalDb, actor, "ames_volume_iii_admin_import_verified", {
    frameworkCode: FRAMEWORK_CODE,
    version: SOURCE_VERSION,
    source: APPROVED_SOURCE_LABEL,
    sourceDocument: APPROVED_SOURCE_DOCUMENT,
    verification: candidate.finalValidation,
  });

  const auditedProtectedComparison = compareProtectedCollections(snapshot.db, finalDb);
  if (!auditedProtectedComparison.ok) {
    throw makeError("Protected data changed while preparing the audit log. Import aborted before any write.", 409, auditedProtectedComparison);
  }

  const auditedPreWriteValidation = validateApprovedVolumeIII(finalDb, candidate.seedBundle);
  if (!auditedPreWriteValidation.ok) {
    throw makeError("Audited AMES Volume III validation failed before write. Import aborted before any write.", 422, auditedPreWriteValidation);
  }

  const backup = (options.createBackup || createDatabaseBackup)(snapshot.dbPath);
  finalDb.curriculumAuditLogs[0].details.backupReference = backup.reference || maskPath(backup.path);
  const finalPreWriteValidation = validateApprovedVolumeIII(finalDb, candidate.seedBundle);
  if (!finalPreWriteValidation.ok) {
    throw makeError("Final AMES Volume III validation failed before write. Import aborted before any write.", 422, finalPreWriteValidation);
  }
  writeJsonAtomically(snapshot.dbPath, finalDb);

  const persistedSnapshot = readDatabaseSnapshot();
  const persistedValidation = validateApprovedVolumeIII(persistedSnapshot.db, candidate.seedBundle);
  if (!persistedValidation.ok) {
    writeJsonAtomically(snapshot.dbPath, readJsonFile(backup.path));
    throw makeError("Persisted AMES Volume III validation failed after write. Backup was restored.", 500, persistedValidation);
  }

  return {
    ...publicSummaryFromCandidate(snapshot, candidate, "execute"),
    result: "PASS",
    backupCreated: true,
    backupReference: backup.reference || maskPath(backup.path),
    verification: persistedValidation,
    persistedVerification: persistedValidation,
  };
}

module.exports = {
  APPROVED_SEED_FILES,
  APPROVED_SOURCE_DOCUMENT,
  CONFIRMATION_TEXT,
  EXPECTED_CLASS_COUNTS,
  MUTABLE_CURRICULUM_COLLECTIONS,
  compareProtectedCollections,
  dryRunVolumeIIIImport,
  executeVolumeIIIImport,
  getVolumeIIIImportStatus,
  loadApprovedSeeds,
  validateApprovedVolumeIII,
};
