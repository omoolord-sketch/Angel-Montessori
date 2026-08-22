const fs = require("fs");
const os = require("os");
const path = require("path");
const jwt = require("jsonwebtoken");

const secret = "ca-smoke-secret";
const dbPath = path.join(os.tmpdir(), `ams-ca-smoke-${Date.now()}.json`);

process.env.JWT_SECRET = secret;
process.env.JSON_DB_PATH = dbPath;
process.env.CURRENT_SESSION = "2026/2027";
process.env.CURRENT_TERM = "First Term";
process.env.NODE_ENV = "test";
process.env.GLOBAL_RATE_LIMIT_MAX = "10000";

const classId = "ca-test-class";
const sessionId = "session-2026-2027";
const terms = {
  first: "term-1",
  second: "term-2",
  third: "term-3",
};
const studentId = "student-ca-1";
const subject = "Mathematics";

const seed = {
  users: [
    { id: "u-admin", name: "Super Admin", username: "super", role: "SUPER_ADMIN", subjects: [], studentIds: [] },
    { id: "u-teacher", name: "Math Teacher", username: "teacher", role: "TEACHER", subjects: [subject], studentIds: [] },
    { id: "u-student", name: "Worship Omoolorun", username: "student", role: "STUDENT", studentId, studentIds: [] },
    { id: "u-parent", name: "Parent User", username: "parent", role: "PARENT", studentId, studentIds: [studentId] },
  ],
  academicSessions: [{ id: sessionId, sessionName: "2026/2027", isActive: true }],
  terms: [
    { id: terms.first, sessionId, termName: "First Term", position: 1, isActive: true },
    { id: terms.second, sessionId, termName: "Second Term", position: 2, isActive: false },
    { id: terms.third, sessionId, termName: "Third Term", position: 3, isActive: false },
  ],
  classes: [{ id: classId, name: "CA Test Class", section: "Basic School", order: 1 }],
  students: [{ id: studentId, name: "Worship Omoolorun", classId, className: "CA Test Class" }],
  classSubjectOfferings: [
    { id: "offer-1", classId, sessionId, termId: terms.first, subject },
    { id: "offer-2", classId, sessionId, termId: terms.second, subject },
    { id: "offer-3", classId, sessionId, termId: terms.third, subject },
  ],
  continuousAssessments: [],
  assessmentSettings: [],
  continuousAssessmentGradingScales: [],
  resultApprovals: [],
  resultPublicationStatus: [],
  results: [],
  reports: [],
  termResultSummaries: [],
  attendanceSessions: [],
  attendanceRecords: [],
  homeworks: [],
  submissions: [],
  promotionDecisions: [],
};

fs.writeFileSync(dbPath, JSON.stringify(seed, null, 2));

const app = require("../app");

function token(userId) {
  return jwt.sign({ id: userId }, secret, { expiresIn: "1h" });
}

async function request(baseUrl, method, route, userId, body) {
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers: {
      Authorization: `Bearer ${token(userId)}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`${method} ${route} failed (${response.status}): ${text}`);
  }
  return data;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function near(actual, expected, label) {
  const diff = Math.abs(Number(actual) - Number(expected));
  assert(diff < 0.011, `${label} expected ${expected}, got ${actual}`);
}

async function submitTerm(baseUrl, termId, row) {
  const data = await request(baseUrl, "POST", "/api/continuous-assessment/entry", "u-teacher", {
    classId,
    sessionId,
    termId,
    subject,
    action: "submit",
    rows: [{ studentId, teacherRemark: "Good progress", ...row }],
  });
  assert(data.saved?.length === 1, `Expected one saved record, got ${JSON.stringify(data)}`);
  assert(!data.errors?.length, `Unexpected save errors: ${JSON.stringify(data.errors)}`);
  return data.saved[0];
}

async function approve(baseUrl, recordId) {
  return request(baseUrl, "POST", `/api/continuous-assessment/records/${recordId}/approve`, "u-admin", {
    note: "Approved in smoke test",
  });
}

async function publish(baseUrl, termId) {
  return request(baseUrl, "POST", "/api/continuous-assessment/publish", "u-admin", {
    classId,
    sessionId,
    termId,
  });
}

async function main() {
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const first = await submitTerm(baseUrl, terms.first, { ca1: 8, ca2: 9, ca3: 7, examScore: 60 });
    const firstApproved = await approve(baseUrl, first.id);
    near(firstApproved.totalScore, 84, "First term total");

    const secondPreview = await request(
      baseUrl,
      "GET",
      `/api/continuous-assessment/entry?classId=${classId}&sessionId=${sessionId}&termId=${terms.second}&subject=${encodeURIComponent(subject)}`,
      "u-teacher"
    );
    near(secondPreview.rows[0].ca3, 8.4, "Second term CA3 carry-forward");

    const second = await submitTerm(baseUrl, terms.second, { ca1: 9, ca2: 8, examScore: 59 });
    const secondApproved = await approve(baseUrl, second.id);
    near(secondApproved.ca3, 8.4, "Second term saved CA3 carry-forward");
    near(secondApproved.totalScore, 84.4, "Second term total");

    const thirdPreview = await request(
      baseUrl,
      "GET",
      `/api/continuous-assessment/entry?classId=${classId}&sessionId=${sessionId}&termId=${terms.third}&subject=${encodeURIComponent(subject)}`,
      "u-teacher"
    );
    near(thirdPreview.rows[0].ca2, 8.4, "Third term CA2 carry-forward");
    near(thirdPreview.rows[0].ca3, 8.44, "Third term CA3 carry-forward");

    const third = await submitTerm(baseUrl, terms.third, { ca1: 9, examScore: 60 });
    const thirdApproved = await approve(baseUrl, third.id);
    near(thirdApproved.totalScore, 85.84, "Third term total");

    await publish(baseUrl, terms.first);
    await publish(baseUrl, terms.second);
    await publish(baseUrl, terms.third);

    const studentOverview = await request(baseUrl, "GET", "/api/portal/student/overview", "u-student");
    assert(studentOverview.recentResults.length === 3, "Student should see three published term results");
    assert(studentOverview.recentResults.every((row) => row.ca1 != null && row.examScore != null), "Student result rows should include CA breakdown");

    const parentOverview = await request(baseUrl, "GET", "/api/portal/parent/overview", "u-parent");
    assert(parentOverview.children?.[0]?.recentResults?.length === 3, "Parent should see published child results");

    console.log("Continuous Assessment smoke test passed");
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(dbPath, { force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
