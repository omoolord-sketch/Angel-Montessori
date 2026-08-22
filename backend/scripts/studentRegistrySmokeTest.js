const fs = require("fs");
const os = require("os");
const path = require("path");
const jwt = require("jsonwebtoken");

const secret = "student-registry-smoke";
const dbPath = path.join(os.tmpdir(), `ams-student-registry-${Date.now()}.json`);

process.env.JWT_SECRET = secret;
process.env.JSON_DB_PATH = dbPath;
process.env.NODE_ENV = "test";
process.env.GLOBAL_RATE_LIMIT_MAX = "10000";

const seed = {
  users: [{ id: "u-admin", name: "Admin", username: "admin", role: "ADMIN", subjects: [], studentIds: [] }],
  classes: [{ id: "basic-1", name: "Basic 1", section: "Basic School", order: 1 }],
  students: [
    {
      id: "s-old",
      name: "Elizabeth Sylvester",
      firstName: "Elizabeth",
      lastName: "Sylvester",
      admissionNumber: "ADM/2026/0007",
      admissionNo: "ADM/2026/0007",
      classId: "basic-1",
      className: "Basic 1",
      parentGuardianName: "Mrs Sylvester",
      parentPhone: "09067795599",
      status: "active",
      isArchived: false,
    },
  ],
  results: [],
  reports: [],
  termLocks: [],
};

fs.writeFileSync(dbPath, JSON.stringify(seed, null, 2));

const app = require("../app");
const token = jwt.sign({ id: "u-admin" }, secret, { expiresIn: "1h" });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(baseUrl, method, route, body) {
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${method} ${route} failed ${response.status}: ${text}`);
  return data;
}

async function main() {
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const rows = await request(baseUrl, "GET", "/api/report-card/students?archived=all");
    assert(rows[0].admissionNumber === "ADM/2026/0007", "Existing admission number missing");
    assert(rows[0].admissionNo === "ADM/2026/0007", "Existing admissionNo alias missing");
    assert(rows[0].parentGuardianName === "Mrs Sylvester", "Parent/guardian name missing");

    const created = await request(baseUrl, "POST", "/api/report-card/students", {
      firstName: "New",
      lastName: "Pupil",
      classId: "basic-1",
      admissionNumber: "ADM/2026/0099",
      parentGuardianName: "Parent Name",
      parentPhone: "08012345678",
      gender: "Female",
      dateOfBirth: "2020-01-01",
      academicSession: "2026/2027",
      academicTerm: "First Term",
    });
    assert(created.admissionNumber === "ADM/2026/0099", "Created admission number missing");
    assert(created.parentGuardianName === "Parent Name", "Created parent name missing");

    const updated = await request(baseUrl, "PATCH", `/api/report-card/students/${created.id}`, {
      firstName: "New",
      lastName: "Pupil",
      classId: "basic-1",
      admissionNumber: "ADM/2026/0100",
      parentGuardianName: "Updated Parent",
      parentPhone: "08012345678",
    });
    assert(updated.admissionNumber === "ADM/2026/0100", "Updated admission number missing");
    assert(updated.admissionNo === "ADM/2026/0100", "Updated admissionNo alias missing");
    assert(updated.parentGuardianName === "Updated Parent", "Updated parent name missing");

    console.log("Student registry admission-number smoke test passed");
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(dbPath, { force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
