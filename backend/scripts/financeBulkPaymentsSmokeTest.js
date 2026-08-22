const assert = require("assert");
const {
  mergeStudentRoster,
} = require("../lib/studentRosterSync");
const {
  buildFinanceSetup,
  listFinanceStudentFees,
  receiveFinancePaymentsBulk,
} = require("../lib/finance");

function createDb() {
  return {
    users: [],
    classes: [
      { id: "basic-1", name: "Basic 1", section: "Basic School", order: 10 },
      { id: "basic-4", name: "Basic 4", section: "Basic School", order: 13 },
      { id: "basic-5", name: "Basic 5", section: "Basic School", order: 14 },
    ],
    students: [],
    academicSessions: [
      { id: "session-1", sessionName: "2026/2027", isActive: true },
    ],
    terms: [
      { id: "term-1", sessionId: "session-1", termName: "First Term", isActive: true },
    ],
    feeTypes: [
      { id: "tuition", feeName: "Tuition", feeCode: "TUITION" },
    ],
    feeStructures: [
      { id: "fee-b1", sessionId: "session-1", termId: "term-1", classId: "basic-1", feeTypeId: "tuition", amount: 22000, isActive: true },
      { id: "fee-b4", sessionId: "session-1", termId: "term-1", classId: "basic-4", feeTypeId: "tuition", amount: 24000, isActive: true },
      { id: "fee-b5", sessionId: "session-1", termId: "term-1", classId: "basic-5", feeTypeId: "tuition", amount: 26000, isActive: true },
    ],
    studentFeeAssignments: [],
    invoices: [],
    payments: [],
  };
}

const db = createDb();
const mergeResult = mergeStudentRoster(db, {
  classes: [
    { id: "prisma-basic-1", name: "Basic 1", section: "Basic School", order: 10 },
    { id: "prisma-basic-4", name: "Basic 4", section: "Basic School", order: 13 },
    { id: "prisma-basic-5", name: "Basic 5", section: "Basic School", order: 14 },
  ],
  students: [
    { id: "student-1", name: "Ada One", classId: "prisma-basic-1", class: { id: "prisma-basic-1", name: "Basic 1" } },
    { id: "student-2", name: "Bola Two", classId: "prisma-basic-1", class: { id: "prisma-basic-1", name: "Basic 1" } },
    { id: "student-3", name: "Chidi Four", classId: "prisma-basic-4", class: { id: "prisma-basic-4", name: "Basic 4" } },
    { id: "student-4", name: "Dayo Five", classId: "prisma-basic-5", class: { id: "prisma-basic-5", name: "Basic 5" } },
  ],
});

assert.strictEqual(mergeResult.studentCount, 4);
assert.strictEqual(db.students.find((row) => row.id === "student-1").classId, "basic-1");
assert.strictEqual(db.students.find((row) => row.id === "student-3").classId, "basic-4");

const setup = buildFinanceSetup(db);
assert.deepStrictEqual(
  setup.students.map((row) => row.className).sort(),
  ["Basic 1", "Basic 1", "Basic 4", "Basic 5"]
);

const basicOneFees = listFinanceStudentFees(db, {
  sessionId: "session-1",
  termId: "term-1",
  classId: "basic-1",
});
assert.strictEqual(basicOneFees.records.length, 2);
assert.strictEqual(basicOneFees.records[0].totalFee, 22000);

const bulk = receiveFinancePaymentsBulk(db, {
  sessionId: "session-1",
  termId: "term-1",
  paymentMethod: "transfer",
  payments: [
    { studentId: "student-1", amount: 22000, reference: "BATCH-01" },
    { studentId: "student-2", amount: 10000, reference: "BATCH-02" },
  ],
}, { id: "finance-user" });

assert.strictEqual(bulk.createdCount, 2);
assert.strictEqual(db.financePayments.length, 2);
assert.strictEqual(db.financeTransactions.length, 4);

const updatedFees = listFinanceStudentFees(db, {
  sessionId: "session-1",
  termId: "term-1",
  classId: "basic-1",
});
const paid = updatedFees.records.find((row) => row.studentId === "student-1");
const partial = updatedFees.records.find((row) => row.studentId === "student-2");
assert.strictEqual(paid.status, "paid");
assert.strictEqual(paid.balance, 0);
assert.strictEqual(partial.status, "partial");
assert.strictEqual(partial.balance, 12000);

console.log("Finance roster and bulk payment smoke test passed.");
