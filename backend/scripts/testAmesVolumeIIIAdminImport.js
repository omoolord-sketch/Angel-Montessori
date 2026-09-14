#!/usr/bin/env node

const assert = require("assert");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const express = require("express");
const jwt = require("jsonwebtoken");
const curriculumRoutes = require("../routes/earlyYearsCurriculum.routes");
const {
  CONFIRMATION_TEXT,
  dryRunVolumeIIIImport,
  executeVolumeIIIImport,
  validateApprovedVolumeIII,
} = require("../lib/amesVolumeIIIAdminImport");

const adminActor = { id: "admin-1", username: "admin", name: "Admin User", role: "ADMIN" };

function baseDb() {
  return {
    users: [
      { id: "admin-1", username: "admin", name: "Admin User", role: "ADMIN", status: "active", password: "" },
      { id: "academic-1", username: "academic", name: "Academic Officer", role: "ACADEMIC_OFFICER", status: "active", password: "" },
      { id: "teacher-user-1", username: "teacher", name: "Teacher User", role: "TEACHER", status: "active", password: "" },
      { id: "parent-user-1", username: "parent", name: "Parent User", role: "PARENT", status: "active", password: "" },
      { id: "student-user-1", username: "student", name: "Student User", role: "STUDENT", status: "active", password: "" },
    ],
    students: [{ id: "student-1", name: "Protected Student", classId: "creche" }],
    teachers: [{ id: "teacher-1", name: "Protected Teacher" }],
    parents: [{ id: "parent-1", name: "Protected Parent" }],
    fees: [{ id: "fee-1", amount: 22000 }],
    payments: [{ id: "payment-1", amount: 7500 }],
    receipts: [{ id: "receipt-1", number: "R-001" }],
    financePayments: [{ id: "finance-payment-1", amount: 7500 }],
    attendanceRecords: [{ id: "attendance-1", studentId: "student-1" }],
    reports: [{ id: "report-1", studentId: "student-1" }],
    assessments: [{ id: "assessment-1", studentId: "student-1" }],
    academicSessions: [],
    terms: [],
    classes: [],
    curriculumFrameworks: [],
    curriculumFrameworkVersions: [],
    curriculumTerms: [],
    curriculumWeeks: [],
    curriculumItems: [],
    curriculumImportBatches: [],
    curriculumAuditLogs: [],
    curriculumDevelopmentalJourneys: [],
  };
}

function readDb(dbPath) {
  return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

function writeDb(dbPath, db) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

function protectedSnapshot(db) {
  const keys = [
    "users",
    "students",
    "teachers",
    "parents",
    "fees",
    "payments",
    "receipts",
    "financePayments",
    "attendanceRecords",
    "reports",
    "assessments",
  ];
  return keys.reduce((snapshot, key) => {
    snapshot[key] = JSON.stringify(db[key] || []);
    return snapshot;
  }, {});
}

function assertProtectedUnchanged(before, db) {
  assert.deepStrictEqual(protectedSnapshot(db), before);
}

function request(server, pathname, token) {
  const { port } = server.address();
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: "127.0.0.1",
      port,
      path: pathname,
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }, (res) => {
      res.resume();
      res.on("end", () => resolve(res.statusCode));
    });
    req.on("error", reject);
    req.end();
  });
}

async function withServer(app, fn) {
  const server = await new Promise((resolve) => {
    const next = app.listen(0, "127.0.0.1", () => resolve(next));
  });
  try {
    await fn(server);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function main() {
  const previousDbPath = process.env.JSON_DB_PATH;
  const previousJwtSecret = process.env.JWT_SECRET;
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ames-volume-iii-import-"));
  const dbPath = path.join(tempRoot, "db.json");
  const initialDb = baseDb();
  const originalProtected = protectedSnapshot(initialDb);
  const summary = {};

  try {
    process.env.JSON_DB_PATH = dbPath;
    process.env.JWT_SECRET = "ames-volume-iii-test-secret";
    writeDb(dbPath, initialDb);

    const dryRunBeforeText = fs.readFileSync(dbPath, "utf8");
    const dryRun = dryRunVolumeIIIImport(adminActor);
    assert.strictEqual(fs.readFileSync(dbPath, "utf8"), dryRunBeforeText);
    assert.strictEqual(dryRun.databaseDetected, true);
    assert.strictEqual(dryRun.existingCurriculumTotal, 0);
    assert.strictEqual(dryRun.proposedAdditions.weeks, 117);
    assert.strictEqual(dryRun.proposedDeletions.totalRecords, 0);
    assert.strictEqual(dryRun.expectedFinalTotal, 117);
    assert.strictEqual(dryRun.duplicateCount, 0);
    assert.strictEqual(dryRun.placeholderCount, 0);
    summary.dryRun = {
      existingCurriculumTotal: dryRun.existingCurriculumTotal,
      proposedWeekAdditions: dryRun.proposedAdditions.weeks,
      proposedUpdates: dryRun.proposedUpdates.weeks,
      proposedDeletions: dryRun.proposedDeletions.totalRecords,
      expectedFinalTotal: dryRun.expectedFinalTotal,
      alreadyImported: dryRun.alreadyImported,
    };

    await assert.rejects(
      async () => executeVolumeIIIImport({
        actor: adminActor,
        confirmation: CONFIRMATION_TEXT,
        createBackup: () => {
          throw new Error("backup failed intentionally");
        },
      }),
      /backup failed intentionally/
    );
    assert.strictEqual(fs.readFileSync(dbPath, "utf8"), dryRunBeforeText);

    await assert.rejects(
      async () => executeVolumeIIIImport({
        actor: adminActor,
        confirmation: CONFIRMATION_TEXT,
        beforeProtectedCompareHook: (candidateDb) => {
          candidateDb.students.push({ id: "unexpected-student-mutation" });
        },
      }),
      /Protected data changed/
    );
    assert.strictEqual(fs.readFileSync(dbPath, "utf8"), dryRunBeforeText);

    const firstImport = executeVolumeIIIImport({ actor: adminActor, confirmation: CONFIRMATION_TEXT });
    const afterFirstDb = readDb(dbPath);
    const firstValidation = validateApprovedVolumeIII(afterFirstDb);
    assert.strictEqual(firstImport.result, "PASS");
    assert.strictEqual(firstValidation.ok, true);
    assert.strictEqual(firstValidation.total, 117);
    assert.strictEqual(firstValidation.classCounts["Crèche"], 39);
    assert.strictEqual(firstValidation.classCounts.Nursery, 39);
    assert.strictEqual(firstValidation.classCounts.Reception, 39);
    assert.strictEqual(firstValidation.duplicateCount, 0);
    assert.strictEqual(firstValidation.placeholderCount, 0);
    assertProtectedUnchanged(originalProtected, afterFirstDb);
    summary.firstImport = {
      result: firstImport.result,
      total: firstValidation.total,
      creche: firstValidation.classCounts["Crèche"],
      nursery: firstValidation.classCounts.Nursery,
      reception: firstValidation.classCounts.Reception,
      duplicateCount: firstValidation.duplicateCount,
      placeholderCount: firstValidation.placeholderCount,
      backupCreated: firstImport.backupCreated,
    };

    const secondImport = executeVolumeIIIImport({ actor: adminActor, confirmation: CONFIRMATION_TEXT });
    const afterSecondDb = readDb(dbPath);
    const secondValidation = validateApprovedVolumeIII(afterSecondDb);
    assert.strictEqual(secondImport.result, "ALREADY_IMPORTED");
    assert.strictEqual(secondValidation.ok, true);
    assert.strictEqual(secondValidation.total, 117);
    assert.strictEqual(secondValidation.duplicateCount, 0);
    assertProtectedUnchanged(originalProtected, afterSecondDb);
    summary.secondImport = {
      result: secondImport.result,
      alreadyImported: secondImport.alreadyImported,
      total: secondValidation.total,
      duplicateCount: secondValidation.duplicateCount,
      placeholderCount: secondValidation.placeholderCount,
    };

    const app = express();
    app.use(express.json());
    app.use("/api/early-years/curriculum", curriculumRoutes);
    const blockedUserIds = ["academic-1", "teacher-user-1", "parent-user-1", "student-user-1"];
    await withServer(app, async (server) => {
      const statuses = {};
      for (const userId of blockedUserIds) {
        const token = jwt.sign({ id: userId }, process.env.JWT_SECRET);
        statuses[userId] = await request(server, "/api/early-years/curriculum/admin/volume-iii-import/status", token);
        assert.strictEqual(statuses[userId], 403);
      }
      summary.nonAdminAccess = statuses;
    });

    console.log(JSON.stringify({
      result: "PASS",
      dryRun: summary.dryRun,
      firstImport: summary.firstImport,
      secondImport: summary.secondImport,
      protectedCollectionsVerified: Object.keys(originalProtected),
      nonAdminAccess: summary.nonAdminAccess,
    }, null, 2));
  } finally {
    process.env.JSON_DB_PATH = previousDbPath;
    process.env.JWT_SECRET = previousJwtSecret;
    if (tempRoot.startsWith(os.tmpdir())) {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
