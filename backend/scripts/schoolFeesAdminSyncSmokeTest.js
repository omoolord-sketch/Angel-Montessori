const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const jwt = require("jsonwebtoken");

const dbPath = path.join(os.tmpdir(), `angel-school-fees-admin-${Date.now()}.json`);
process.env.JSON_DB_PATH = dbPath;
process.env.JWT_SECRET = "school-fees-admin-smoke-secret";
process.env.DATABASE_URL = "";
process.env.CURRENT_SESSION = "2026/2027";
process.env.CURRENT_TERM = "Third Term";
process.env.NODE_ENV = "test";
process.env.GLOBAL_RATE_LIMIT_MAX = "10000";

const now = new Date().toISOString();
fs.writeFileSync(dbPath, JSON.stringify({
  users: [
    { id: "admin-smoke", name: "Admin Smoke", username: "admin-smoke", role: "ADMIN", status: "active" },
  ],
  classes: [
    { id: "basic-1", name: "Basic 1", section: "Basic School", order: 10 },
    { id: "basic-4", name: "Basic 4", section: "Basic School", order: 13 },
    { id: "basic-5", name: "Basic 5", section: "Basic School", order: 14 },
  ],
  students: [
    { id: "student-1", name: "Ada One", classId: "basic-1", className: "Basic 1", status: "active" },
    { id: "student-4", name: "Bola Four", classId: "basic-4", className: "Basic 4", status: "active" },
    { id: "student-5", name: "Chidi Five", classId: "basic-5", className: "Basic 5", status: "active" },
  ],
  academicSessions: [
    { id: "session-1", sessionName: "2026/2027", isActive: true, createdAt: now, updatedAt: now },
  ],
  terms: [
    { id: "term-3", sessionId: "session-1", termName: "Third Term", isActive: true, createdAt: now, updatedAt: now },
  ],
  feeTypes: [
    { id: "tuition", feeName: "Tuition", feeCode: "TUITION", category: "tuition", isRecurring: true },
  ],
  feeStructures: [
    { id: "fee-1", sessionId: "session-1", termId: "term-3", classId: "basic-1", feeTypeId: "tuition", amount: 22000, structureType: "COMPULSORY", isActive: true },
    { id: "fee-4", sessionId: "session-1", termId: "term-3", classId: "basic-4", feeTypeId: "tuition", amount: 24000, structureType: "COMPULSORY", isActive: true },
    { id: "fee-5", sessionId: "session-1", termId: "term-3", classId: "basic-5", feeTypeId: "tuition", amount: 26000, structureType: "COMPULSORY", isActive: true },
  ],
  financeStudentFees: [
    { id: "finance-fee-1", studentId: "student-1", studentName: "Ada One", sessionId: "session-1", termId: "term-3", classId: "basic-1", className: "Basic 1", totalFee: 22000, amountPaid: 5000, balance: 17000, status: "partial" },
  ],
  financePayments: [
    { id: "finance-payment-1", studentId: "student-1", studentFeeId: "finance-fee-1", amount: 5000, paymentMethod: "transfer", reference: "MANUAL-BASIC1-001", description: "School fee payment", datePaid: now, sessionId: "session-1", termId: "term-3", classId: "basic-1", receivedBy: "finance-user", receiptNumber: "RCT-2026-00001", status: "posted", createdAt: now },
  ],
}, null, 2));

const app = require("../app");

async function main() {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const token = jwt.sign({
    id: "admin-smoke",
    name: "Admin Smoke",
    username: "admin-smoke",
    role: "ADMIN",
  }, process.env.JWT_SECRET, { expiresIn: "5m" });

  const request = async (method, url, body) => {
    const response = await fetch(`${baseUrl}${url}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const payload = await response.json();
    return { status: response.status, payload };
  };

  try {
    const setup = await request("GET", "/api/payments/admin/setup");
    assert.strictEqual(setup.status, 200);

    const invoiceList = await request("GET", "/api/payments/admin/invoices");
    assert.strictEqual(invoiceList.status, 200);
    assert.strictEqual(invoiceList.payload.records.length, 3);
    assert.deepStrictEqual(
      invoiceList.payload.records.map((row) => row.className).sort(),
      ["Basic 1", "Basic 4", "Basic 5"]
    );

    const basicOne = invoiceList.payload.records.find((row) => row.className === "Basic 1");
    const basicFour = invoiceList.payload.records.find((row) => row.className === "Basic 4");
    const basicFive = invoiceList.payload.records.find((row) => row.className === "Basic 5");
    assert.strictEqual(basicOne.amountPaid, 5000);
    assert.strictEqual(basicOne.balance, 17000);
    assert.strictEqual(basicOne.status, "PARTIAL");

    const summary = await request("GET", "/api/payments/admin/summary");
    assert.strictEqual(summary.status, 200);
    assert.strictEqual(summary.payload.totalExpected, 72000);
    assert.strictEqual(summary.payload.totalCollected, 5000);
    assert.strictEqual(summary.payload.totalOutstanding, 67000);

    const reports = await request("GET", "/api/payments/admin/reports");
    assert.strictEqual(reports.status, 200);
    assert.deepStrictEqual(
      reports.payload.reports.byClass.map((row) => row.className).sort(),
      ["Basic 1", "Basic 4", "Basic 5"]
    );

    const receipts = await request("GET", "/api/payments/admin/receipts");
    assert.strictEqual(receipts.status, 200);
    assert.strictEqual(receipts.payload.records.length, 1);
    assert.strictEqual(receipts.payload.records[0].className, "Basic 1");
    assert.strictEqual(receipts.payload.records[0].receiptNumber, "RCT-2026-00001");

    const paidDelete = await request("DELETE", `/api/payments/admin/invoices/${basicOne.id}`);
    assert.strictEqual(paidDelete.status, 409);

    const unpaidDelete = await request("DELETE", `/api/payments/admin/invoices/${basicFour.id}`);
    assert.strictEqual(unpaidDelete.status, 200);
    const afterDelete = await request("GET", "/api/payments/admin/invoices");
    assert.strictEqual(afterDelete.payload.records.length, 2);
    assert.ok(!afterDelete.payload.records.some((row) => row.className === "Basic 4"));

    const regenerate = await request("POST", "/api/payments/admin/generate-invoices", {
      classId: "basic-4",
      includePreviousBalance: false,
    });
    assert.strictEqual(regenerate.status, 200);
    assert.strictEqual(regenerate.payload.generatedCount, 1);

    const bulkDelete = await request("POST", "/api/payments/admin/invoices/bulk-delete", {
      invoiceIds: [basicFive.id],
      reason: "Smoke test cleanup",
    });
    assert.strictEqual(bulkDelete.status, 200);
    assert.strictEqual(bulkDelete.payload.deletedCount, 1);

    console.log("School Fees all-class sync, receipt bridge, and cleanup routes smoke test passed.");
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(dbPath, { force: true });
  }
}

main().catch((error) => {
  try {
    fs.rmSync(dbPath, { force: true });
  } catch {
    // Nothing else to clean up.
  }
  console.error(error);
  process.exitCode = 1;
});
