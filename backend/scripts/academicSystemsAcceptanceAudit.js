const assert = require("assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "ames-acceptance-audit-secret";
process.env.JSON_DB_PATH = path.join(os.tmpdir(), `ames-acceptance-audit-${process.pid}-${Date.now()}`, "db.json");
process.env.PASSWORD_HASH_ROUNDS = process.env.PASSWORD_HASH_ROUNDS || "4";
process.env.GLOBAL_RATE_LIMIT_MAX = "1000";
process.env.LOGIN_RATE_LIMIT_MAX = "1000";
process.env.CURRENT_SESSION = "2026/2027";
process.env.CURRENT_TERM = "First Term";

const {
  ensureAcademicSystemShape,
  getApprovedClassConfig,
  getClassCapabilitySummary,
  getLegacyClassMapping,
  getReportFramework,
  getTeacherToolsetForClass,
  supportsEYFSAssessment,
  supportsNigerianCA,
} = require("../lib/academicSystems");

const app = require("../app");

const tmpDir = path.dirname(process.env.JSON_DB_PATH);
const now = new Date().toISOString();

function seedDb() {
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.writeFileSync(process.env.JSON_DB_PATH, JSON.stringify({
    users: [
      { id: "u-admin", name: "Audit Admin", username: "audit.admin", password: "Audit@123", role: "ADMIN", status: "active", mustChangePassword: false, subjects: [] },
      { id: "u-teacher-basic", name: "Audit Basic Teacher", username: "audit.teacher.basic", password: "Audit@123", role: "TEACHER", status: "active", mustChangePassword: false, subjects: ["Mathematics"] },
      { id: "u-teacher-early", name: "Audit Early Teacher", username: "audit.teacher.early", password: "Audit@123", role: "TEACHER", status: "active", mustChangePassword: false, subjects: ["Mathematics"] },
      { id: "u-parent", name: "Audit Parent", username: "audit.parent", password: "Audit@123", role: "PARENT", status: "active", mustChangePassword: false, studentIds: ["stu-basic"] },
      { id: "u-student", name: "Audit Student User", username: "audit.student", password: "Audit@123", role: "STUDENT", status: "active", mustChangePassword: false, studentId: "stu-basic" },
    ],
    academicSessions: [
      { id: "sess-2025-2026", sessionName: "2025/2026", isActive: false, createdAt: now, updatedAt: now },
      { id: "sess-2026-2027", sessionName: "2026/2027", isActive: true, createdAt: now, updatedAt: now },
    ],
    terms: [
      { id: "term-2025-2026-3", sessionId: "sess-2025-2026", termName: "Third Term", isActive: false, createdAt: now, updatedAt: now },
      { id: "term-2026-2027-1", sessionId: "sess-2026-2027", termName: "First Term", isActive: true, createdAt: now, updatedAt: now },
      { id: "term-2026-2027-2", sessionId: "sess-2026-2027", termName: "Second Term", isActive: false, createdAt: now, updatedAt: now },
      { id: "term-2026-2027-3", sessionId: "sess-2026-2027", termName: "Third Term", isActive: false, createdAt: now, updatedAt: now },
    ],
    financeSettings: {
      currency: "NGN",
      activeSessionId: "sess-2026-2027",
      activeTermId: "term-2026-2027-1",
      paymentMethods: ["cash", "transfer", "online"],
      expenseCategories: ["general"],
      accountTypes: ["asset", "liability", "income", "expense", "equity"],
    },
    classes: [
      { id: "legacy-nursery-1", name: "Nursery 1", section: "Early Years", isActive: true, createdAt: now, updatedAt: now },
      { id: "legacy-nursery-2", name: "Nursery 2", section: "Early Years", isActive: true, createdAt: now, updatedAt: now },
      { id: "legacy-kindergarten", name: "Kindergarten", section: "Early Years", isActive: true, createdAt: now, updatedAt: now },
      { id: "legacy-playgroup", name: "Playgroup", section: "Early Years", isActive: true, createdAt: now, updatedAt: now },
    ],
    students: [
      { id: "stu-creche", name: "Audit Creche Learner", classId: "creche", className: "Crèche", status: "active" },
      { id: "stu-nursery", name: "Audit Nursery Learner", classId: "nursery", className: "Nursery", status: "active" },
      { id: "stu-reception", name: "Audit Reception Learner", classId: "reception", className: "Reception", status: "active" },
      { id: "stu-basic", name: "Audit Basic Learner", classId: "basic-1", className: "Basic 1", status: "active" },
      { id: "stu-history", name: "Historical Nursery One Learner", classId: "legacy-nursery-1", className: "Nursery 1", status: "archived", isArchived: true },
    ],
    attendanceSessions: [
      { id: "att-history", classId: "legacy-nursery-1", className: "Nursery 1", sessionId: "sess-2025-2026", termId: "term-2025-2026-3", date: "2026-06-10" },
    ],
    results: [
      { id: "res-history", studentId: "stu-history", classId: "legacy-nursery-1", className: "Nursery 1", session: "2025/2026", term: "Third Term", subject: "Numeracy", score: 80 },
    ],
    reports: [
      { id: "rep-history", studentId: "stu-history", classId: "legacy-nursery-1", className: "Nursery 1", session: "2025/2026", term: "Third Term" },
    ],
    feeInvoices: [
      { id: "inv-history", studentId: "stu-history", classId: "legacy-nursery-1", className: "Nursery 1", sessionId: "sess-2025-2026", termId: "term-2025-2026-3", total: 22000 },
    ],
    payments: [
      { id: "pay-history", studentId: "stu-history", classId: "legacy-nursery-1", className: "Nursery 1", amount: 22000, status: "success" },
    ],
    financeStudentFees: [
      { id: "fs-history", studentId: "stu-history", classId: "legacy-nursery-1", className: "Nursery 1", sessionId: "sess-2025-2026", termId: "term-2025-2026-3", totalFee: 22000, paid: 22000 },
    ],
    promotionDecisions: [
      { id: "prom-history", studentId: "stu-history", classId: "legacy-nursery-1", className: "Nursery 1", sessionId: "sess-2025-2026" },
    ],
    classSubjectOfferings: [
      { id: "off-basic", classId: "basic-1", className: "Basic 1", subject: "Mathematics", teacherUserId: "u-teacher-basic", teacherName: "Audit Basic Teacher", sessionId: "sess-2026-2027", sessionName: "2026/2027", termId: "term-2026-2027-1", termName: "First Term", status: "ACTIVE" },
      { id: "off-early", classId: "creche", className: "Crèche", subject: "Mathematics", teacherUserId: "u-teacher-early", teacherName: "Audit Early Teacher", sessionId: "sess-2026-2027", sessionName: "2026/2027", termId: "term-2026-2027-1", termName: "First Term", status: "ACTIVE" },
    ],
    scoreSheets: [
      { id: "sheet-early", classSubjectOfferingId: "off-early", title: "Historical Early Years Sheet", status: "DRAFT", createdAt: now, updatedAt: now },
    ],
  }, null, 2));
}

function listen() {
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
  });
}

async function request(baseUrl, method, url, token = "", body = undefined) {
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(`${baseUrl}${url}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: response.status, ok: response.ok, data };
}

async function login(baseUrl, username) {
  const res = await request(baseUrl, "POST", "/api/auth/login", "", { username, password: "Audit@123" });
  assert.equal(res.status, 200, `login failed for ${username}: ${JSON.stringify(res.data)}`);
  assert.ok(res.data?.token, `missing token for ${username}`);
  return res.data.token;
}

function names(rows) {
  return rows.map((row) => row.name || row.className).filter(Boolean);
}

function assertExactNames(rows, expected) {
  assert.deepEqual(names(rows), expected);
}

async function main() {
  seedDb();
  const server = await listen();
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const results = [];

  async function check(requirement, testPerformed, fn) {
    try {
      const notes = await fn();
      results.push({ requirement, testPerformed, result: "PASS", notes: notes || "" });
    } catch (error) {
      results.push({ requirement, testPerformed, result: "FAIL", notes: error.message || String(error) });
    }
  }

  function markNotTestable(requirement, testPerformed, notes) {
    results.push({ requirement, testPerformed, result: "NOT TESTABLE", notes });
  }

  let adminToken = "";
  let teacherToken = "";
  let parentToken = "";
  let studentToken = "";

  await check("Role login - Admin", "POST /api/auth/login with seeded admin credentials", async () => {
    adminToken = await login(baseUrl, "audit.admin");
    return "Admin token issued.";
  });
  await check("Role login - Teacher", "POST /api/auth/login with seeded teacher credentials", async () => {
    teacherToken = await login(baseUrl, "audit.teacher.basic");
    return "Teacher token issued.";
  });
  await check("Role login - Parent", "POST /api/auth/login with seeded parent credentials", async () => {
    parentToken = await login(baseUrl, "audit.parent");
    return "Parent token issued.";
  });
  await check("Role login - Student", "POST /api/auth/login with seeded student credentials", async () => {
    studentToken = await login(baseUrl, "audit.student");
    return "Student token issued.";
  });

  await check("Final active class structure", "Resolver seed and GET /api/academic-systems/classes", async () => {
    const db = JSON.parse(fs.readFileSync(process.env.JSON_DB_PATH, "utf8"));
    const shape = ensureAcademicSystemShape(db);
    assertExactNames(shape.activeClasses, [
      "Crèche",
      "Nursery",
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
      "SS1",
      "SS2",
      "SS3",
    ]);
    const legacy = new Set(names(shape.legacyClasses));
    ["Nursery 1", "Nursery 2", "Kindergarten", "Playgroup"].forEach((name) => assert.ok(legacy.has(name), `${name} missing from legacy list`));
    const res = await request(baseUrl, "GET", "/api/academic-systems/classes", adminToken);
    assert.equal(res.status, 200);
    assertExactNames(res.data, names(shape.activeClasses));
    return "Active list is exact; legacy classes are inactive.";
  });

  await check("Academic system resolution - Early Years", "Direct resolver checks for Crèche, Nursery, Reception", async () => {
    ["Crèche", "Nursery", "Reception"].forEach((className) => {
      const caps = getClassCapabilitySummary(className);
      assert.equal(caps.academicSystem, "BRITISH_EYFS", className);
      assert.equal(caps.assessmentFramework, "EYFS_AMES", className);
      assert.equal(supportsEYFSAssessment(className), true, className);
      assert.equal(supportsNigerianCA(className), false, className);
    });
    return "All Early Years classes resolve to BRITISH_EYFS / EYFS_AMES.";
  });

  await check("Academic system resolution - Nigerian classes", "Direct resolver checks for Basic 1-6, JSS1-3, SS1-3", async () => {
    ["Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6", "JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"].forEach((className) => {
      const caps = getClassCapabilitySummary(className);
      assert.equal(caps.academicSystem, "NIGERIAN_AMES", className);
      assert.equal(caps.assessmentFramework, "NIGERIAN_CA", className);
      assert.equal(supportsNigerianCA(className), true, className);
      assert.equal(supportsEYFSAssessment(className), false, className);
    });
    return "All Basic/JSS/SS classes resolve to NIGERIAN_AMES / NIGERIAN_CA.";
  });

  await check("Legacy class mapping", "Direct mapping and active-config checks", async () => {
    assert.equal(getLegacyClassMapping("Nursery 1").targetClassName, "Nursery");
    assert.equal(getLegacyClassMapping("Nursery 2").targetClassName, "Nursery");
    assert.equal(getLegacyClassMapping("Kindergarten").mappingMode, "ADMIN_REVIEW");
    assert.equal(getLegacyClassMapping("Playgroup").mappingMode, "ADMIN_REVIEW");
    ["Nursery 1", "Nursery 2", "Kindergarten", "Playgroup"].forEach((className) => {
      assert.equal(getApprovedClassConfig(className), null, `${className} must not be active`);
    });
    return "Legacy names are not approved active class configs.";
  });

  for (const classId of ["creche", "nursery", "reception"]) {
    await check(`Nigerian CA blocked for ${classId}`, `GET and POST /api/continuous-assessment/entry for ${classId}`, async () => {
      const getRes = await request(baseUrl, "GET", `/api/continuous-assessment/entry?classId=${classId}&sessionId=sess-2026-2027&termId=term-2026-2027-1&subject=Mathematics`, adminToken);
      assert.equal(getRes.status, 400);
      const postRes = await request(baseUrl, "POST", "/api/continuous-assessment/entry", adminToken, {
        classId,
        sessionId: "sess-2026-2027",
        termId: "term-2026-2027-1",
        subject: "Mathematics",
        rows: [{ studentId: `stu-${classId}`, classId, sessionId: "sess-2026-2027", termId: "term-2026-2027-1", subject: "Mathematics", ca1: 5 }],
      });
      assert.equal(postRes.status, 400);
      assert.equal((postRes.data?.saved || []).length, 0);
      return "Backend rejected Nigerian CA entry.";
    });
  }

  await check("Nigerian CA still works for Basic 1", "POST /api/continuous-assessment/entry for Basic 1", async () => {
    const res = await request(baseUrl, "POST", "/api/continuous-assessment/entry", adminToken, {
      classId: "basic-1",
      sessionId: "sess-2026-2027",
      termId: "term-2026-2027-1",
      subject: "Mathematics",
      rows: [{ studentId: "stu-basic", classId: "basic-1", sessionId: "sess-2026-2027", termId: "term-2026-2027-1", subject: "Mathematics", ca1: 8, ca2: 7, ca3: 6, examScore: 55 }],
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.saved.length, 1);
    assert.equal(res.data.saved[0].className, "Basic 1");
    return "Basic 1 CA record saved through Nigerian path.";
  });

  await check("CA metadata excludes Early Years", "GET /api/continuous-assessment/metadata", async () => {
    const res = await request(baseUrl, "GET", "/api/continuous-assessment/metadata", adminToken);
    assert.equal(res.status, 200);
    const classNames = names(res.data.classes || []);
    ["Crèche", "Nursery", "Reception"].forEach((name) => assert.equal(classNames.includes(name), false, `${name} leaked into CA metadata`));
    ["Basic 1", "JSS1", "SS1"].forEach((name) => assert.equal(classNames.includes(name), true, `${name} missing from CA metadata`));
    return "Only Nigerian classes are exposed to CA metadata.";
  });

  await check("Grading blocks Early Years", "Existing Early Years score sheet cannot be viewed, edited, submitted, approved, locked, or computed", async () => {
    const edit = await request(baseUrl, "POST", "/api/grading/score-sheets/sheet-early/scores", adminToken, { rows: [{ studentUserId: "stu-creche", assessmentComponentId: "missing", score: 5 }] });
    const submit = await request(baseUrl, "POST", "/api/grading/score-sheets/sheet-early/submit", adminToken, {});
    const approve = await request(baseUrl, "POST", "/api/grading/score-sheets/sheet-early/approve", adminToken, {});
    const lock = await request(baseUrl, "POST", "/api/grading/score-sheets/sheet-early/lock", adminToken, {});
    const compute = await request(baseUrl, "POST", "/api/grading/compute/sheets/sheet-early", adminToken, {});
    [edit, submit, approve, lock, compute].forEach((res) => assert.equal(res.status, 400, JSON.stringify(res.data)));
    return "Deep score-sheet actions reject Early Years offerings.";
  });

  await check("Nigerian grading metadata remains available", "GET /api/grading/metadata", async () => {
    const res = await request(baseUrl, "GET", "/api/grading/metadata", adminToken);
    assert.equal(res.status, 200);
    const classNames = names(res.data.classes || []);
    assert.ok(classNames.includes("Basic 1"));
    assert.equal(classNames.includes("Crèche"), false);
    const offeringIds = (res.data.offerings || []).map((row) => row.id);
    assert.ok(offeringIds.includes("off-basic"));
    assert.equal(offeringIds.includes("off-early"), false);
    return "Nigerian grading classes/offerings are available; Early Years offering is hidden.";
  });

  await check("Broadsheet blocks Early Years", "POST /api/report-card/broadsheet/generate for Crèche", async () => {
    const res = await request(baseUrl, "POST", "/api/report-card/broadsheet/generate", adminToken, {
      classId: "creche",
      session: "2026/2027",
      term: "First Term",
      createSnapshot: false,
    });
    assert.ok([400, 404].includes(res.status), JSON.stringify(res.data));
    return "Early Years broadsheet generation rejected.";
  });

  await check("Nigerian broadsheet remains available", "POST /api/report-card/broadsheet/generate for Basic 1", async () => {
    const res = await request(baseUrl, "POST", "/api/report-card/broadsheet/generate", adminToken, {
      classId: "basic-1",
      session: "2026/2027",
      term: "First Term",
      createSnapshot: false,
    });
    assert.equal(res.status, 200, JSON.stringify(res.data));
    assert.equal(res.data.payload.class.name, "Basic 1");
    return "Basic 1 broadsheet endpoint still responds.";
  });

  await check("Teacher access resolution", "Toolset resolver for Crèche, Nursery, Reception, Basic 1, JSS1, SS1", async () => {
    assert.ok(getTeacherToolsetForClass("Crèche").includes("EYFS Observations"));
    assert.ok(getTeacherToolsetForClass("Nursery").includes("Phonological Awareness"));
    assert.ok(getTeacherToolsetForClass("Reception").includes("Transition to Basic 1"));
    ["Basic 1", "JSS1", "SS1"].forEach((className) => {
      const tools = getTeacherToolsetForClass(className);
      assert.ok(tools.includes("Continuous Assessment"), className);
      assert.ok(tools.includes("Broadsheet"), className);
      assert.equal(tools.includes("EYFS Observations"), false, className);
    });
    return "Capabilities change according to selected class.";
  });

  await check("Teacher API access uses Nigerian offering scope", "Teacher GET /api/grading/metadata", async () => {
    const res = await request(baseUrl, "GET", "/api/grading/metadata", teacherToken);
    assert.equal(res.status, 200);
    const offeringIds = (res.data.offerings || []).map((row) => row.id);
    assert.deepEqual(offeringIds, ["off-basic"]);
    return "Teacher sees only own Nigerian offering in grading metadata.";
  });

  await check("Historical data safety", "Shape enforcement and legacy migration endpoint on archived historical row", async () => {
    const before = JSON.parse(fs.readFileSync(process.env.JSON_DB_PATH, "utf8"));
    const historicalBefore = before.students.find((row) => row.id === "stu-history");
    assert.equal(historicalBefore.className, "Nursery 1");
    const migrate = await request(baseUrl, "POST", "/api/academic-systems/legacy-classes/legacy-nursery-1/migrate-students", adminToken, {
      confirm: true,
      targetClassId: "nursery",
    });
    assert.equal(migrate.status, 200, JSON.stringify(migrate.data));
    assert.equal(migrate.data.count, 0, "archived historical student should not migrate");
    const after = JSON.parse(fs.readFileSync(process.env.JSON_DB_PATH, "utf8"));
    const historicalAfter = after.students.find((row) => row.id === "stu-history");
    assert.equal(historicalAfter.classId, "legacy-nursery-1");
    assert.equal(historicalAfter.className, "Nursery 1");
    assert.equal(after.results.find((row) => row.id === "res-history").className, "Nursery 1");
    assert.equal(after.attendanceSessions.find((row) => row.id === "att-history").className, "Nursery 1");
    assert.equal(after.feeInvoices.find((row) => row.id === "inv-history").className, "Nursery 1");
    assert.equal(after.payments.find((row) => row.id === "pay-history").className, "Nursery 1");
    return "Archived/historical legacy rows remained unchanged.";
  });

  await check("Session and term safety", "PATCH /api/academic-systems/scope and inspect historical rows", async () => {
    const res = await request(baseUrl, "PATCH", "/api/academic-systems/scope", adminToken, {
      sessionId: "sess-2025-2026",
      termId: "term-2025-2026-3",
    });
    assert.equal(res.status, 200, JSON.stringify(res.data));
    const db = JSON.parse(fs.readFileSync(process.env.JSON_DB_PATH, "utf8"));
    assert.equal(db.academicSessions.find((row) => row.id === "sess-2025-2026").isActive, true);
    assert.equal(db.terms.find((row) => row.id === "term-2025-2026-3").isActive, true);
    assert.equal(db.results.find((row) => row.id === "res-history").session, "2025/2026");
    assert.equal(db.results.find((row) => row.id === "res-history").term, "Third Term");
    assert.equal(db.financeStudentFees.find((row) => row.id === "fs-history").sessionId, "sess-2025-2026");
    assert.equal(db.financeStudentFees.find((row) => row.id === "fs-history").termId, "term-2025-2026-3");
    return "Active scope changed without rewriting historical records.";
  });

  await check("Admin Academic Systems API", "GET /api/academic-systems/summary and /foundation", async () => {
    const summary = await request(baseUrl, "GET", "/api/academic-systems/summary", adminToken);
    const foundation = await request(baseUrl, "GET", "/api/academic-systems/foundation", adminToken);
    assert.equal(summary.status, 200);
    assert.equal(foundation.status, 200);
    const systems = new Map((summary.data.systems || []).map((row) => [row.code, row]));
    assert.deepEqual(names(systems.get("BRITISH_EYFS").classes), ["Crèche", "Nursery", "Reception"]);
    assert.deepEqual(names(systems.get("NIGERIAN_AMES").classes), ["Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6", "JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"]);
    assert.equal(systems.get("BRITISH_EYFS").curriculumFramework, "AMES_EYFS");
    assert.equal(systems.get("BRITISH_EYFS").assessmentFramework, "EYFS_AMES");
    assert.equal(systems.get("NIGERIAN_AMES").curriculumFramework, "AMES_NIGERIAN");
    assert.equal(systems.get("NIGERIAN_AMES").assessmentFramework, "NIGERIAN_CA");
    assert.equal(foundation.data.observationRecordsReady, true);
    assert.equal(foundation.data.receptionPhonicsReady, true);
    assert.ok((foundation.data.eyfsCurriculumAreas || []).length >= 7);
    return "Academic Systems API exposes the two approved systems and EYFS metadata.";
  });

  await check("Route/API role security", "Teacher attempts admin-only scope change", async () => {
    const res = await request(baseUrl, "PATCH", "/api/academic-systems/scope", teacherToken, {
      sessionId: "sess-2026-2027",
      termId: "term-2026-2027-1",
    });
    assert.equal(res.status, 403);
    return "Backend role guard rejects teacher configuration write.";
  });

  await check("Regression - Attendance", "GET /api/attendance/classes", async () => {
    const res = await request(baseUrl, "GET", "/api/attendance/classes", adminToken);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data));
    return "Attendance class endpoint responds.";
  });
  await check("Regression - Finance", "GET /api/finance/setup", async () => {
    const res = await request(baseUrl, "GET", "/api/finance/setup", adminToken);
    assert.equal(res.status, 200);
    return "Finance setup endpoint responds.";
  });
  await check("Regression - Payments/Receipts", "GET /api/payments/admin/summary and /admin/receipts", async () => {
    const summary = await request(baseUrl, "GET", "/api/payments/admin/summary", adminToken);
    const receipts = await request(baseUrl, "GET", "/api/payments/admin/receipts", adminToken);
    assert.equal(summary.status, 200, JSON.stringify(summary.data));
    assert.equal(receipts.status, 200, JSON.stringify(receipts.data));
    return "Payments summary and receipts endpoints respond.";
  });
  await check("Regression - Report Cards", "GET /api/report-card/classes", async () => {
    const res = await request(baseUrl, "GET", "/api/report-card/classes", adminToken);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data));
    return "Report-card class endpoint responds.";
  });
  await check("Regression - Promotion", "GET /api/promotion/metadata", async () => {
    const res = await request(baseUrl, "GET", "/api/promotion/metadata", adminToken);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.classes));
    return "Promotion metadata endpoint responds.";
  });
  await check("Regression - CBT", "GET /api/cbt/metadata", async () => {
    const res = await request(baseUrl, "GET", "/api/cbt/metadata", adminToken);
    assert.equal(res.status, 200);
    return "CBT metadata endpoint responds.";
  });
  await check("Regression - Homework", "GET /api/homework/metadata", async () => {
    const res = await request(baseUrl, "GET", "/api/homework/metadata", adminToken);
    assert.equal(res.status, 200);
    return "Homework metadata endpoint responds.";
  });
  await check("Regression - LMS", "GET /api/lms/metadata", async () => {
    const res = await request(baseUrl, "GET", "/api/lms/metadata", adminToken);
    assert.equal(res.status, 200);
    return "LMS metadata endpoint responds.";
  });
  await check("Regression - Admissions", "GET /api/admissions/admin/dashboard", async () => {
    const res = await request(baseUrl, "GET", "/api/admissions/admin/dashboard", adminToken);
    assert.equal(res.status, 200);
    return "Admissions dashboard endpoint responds.";
  });
  await check("Regression - Parent dashboard", "GET /api/portal/parent/overview", async () => {
    const res = await request(baseUrl, "GET", "/api/portal/parent/overview", parentToken);
    assert.equal(res.status, 200);
    return "Parent overview endpoint responds.";
  });
  await check("Regression - Student dashboard", "GET /api/portal/student/overview", async () => {
    const res = await request(baseUrl, "GET", "/api/portal/student/overview", studentToken);
    assert.equal(res.status, 200);
    return "Student overview endpoint responds.";
  });

  markNotTestable(
    "EYFS create endpoint route security",
    "Attempt Basic/JSS/SS EYFS creation through live API",
    "No Phase 1 EYFS observation/assessment create route exists yet; only collections and capability metadata are prepared."
  );
  markNotTestable(
    "Visual screenshot of Admin Academic Systems page",
    "Browser screenshot",
    "No browser session was launched for this audit; API, route, source, and build checks were used instead."
  );

  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(tmpDir, { recursive: true, force: true });

  const hasFail = results.some((row) => row.result === "FAIL");
  const lines = [
    "Requirement | Test Performed | Result | Notes",
    "--- | --- | --- | ---",
    ...results.map((row) => `${row.requirement} | ${row.testPerformed} | ${row.result} | ${String(row.notes || "").replace(/\r?\n/g, " ")}`),
    "",
    `PHASE 1 FINAL RESULT: ${hasFail ? "FAIL" : "PASS"}`,
  ];
  console.log(lines.join("\n"));
  if (hasFail) process.exitCode = 1;
}

main().catch((error) => {
  try {
    if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {}
  console.error(error);
  process.exit(1);
});
