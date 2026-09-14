#!/usr/bin/env node

const assert = require("assert");
const {
  ensureAcademicSystemShape,
  getApprovedClassConfig,
} = require("../lib/academicSystems");
const {
  FRAMEWORK_CODE,
  createTeacherPlanShell,
  ensureEarlyYearsCurriculumShape,
  importCurriculumPayload,
  listAccessibleEarlyYearsClasses,
  listCurriculum,
  searchCurriculum,
  validateImportPayload,
} = require("../lib/earlyYearsCurriculum");

function classRows() {
  const db = { classes: [], users: [] };
  ensureAcademicSystemShape(db);
  return db.classes.filter((row) => row.isActive !== false);
}

function fixture(classLevelCode, termName) {
  const classNames = { CRECHE: "Crèche", NURSERY: "Nursery", RECEPTION: "Reception" };
  const termCodes = { "First Term": "T1", "Second Term": "T2", "Third Term": "T3" };
  const base = `AMES-EYFS-${classLevelCode}-${termCodes[termName]}`;
  return {
    framework: { code: FRAMEWORK_CODE, version: "1.0" },
    classLevelCode,
    className: classNames[classLevelCode],
    termName,
    title: `${classNames[classLevelCode]} ${termName}`,
    overview: "Smoke-test fixture only. Not official curriculum content.",
    developmentalJourney: classLevelCode === "NURSERY" && termName === "First Term" ? ["BELONG", "COMMUNICATE", "NOTICE", "REPRESENT"] : [],
    sourceDocument: "SMOKE TEST FIXTURE - NOT OFFICIAL CURRICULUM",
    sourceVersion: "0.0-test",
    sourceSection: `${classNames[classLevelCode]} ${termName}`,
    weeks: [
      {
        code: `${base}-W01`,
        weekNumber: 1,
        weekLabel: "Week 1",
        title: "Fixture Week 1",
        bigIdea: "Fixture big idea",
        mainDevelopment: "Fixture main development",
        curriculumIntent: "Fixture curriculum intent",
        calendarStatus: "CURRENT",
        items: [
          {
            code: `${base}-W01-CL-01`,
            eyfsArea: "COMMUNICATION_LANGUAGE",
            title: "Fixture communication item",
            learningIntent: "Fixture search weather language",
            learningContent: "Fixture content",
            keyVocabulary: ["weather"],
            dimensionCodes: ["PRACTICAL_LIFE", "OUTDOOR_LEARNING"],
            assessmentFocus: "Fixture assessment focus",
            status: "APPROVED_LOCKED",
          },
        ],
      },
      {
        code: `${base}-W13`,
        weekNumber: 13,
        weekLabel: "Consolidation",
        title: "Fixture Flexible Week",
        bigIdea: "Fixture review",
        mainDevelopment: "Fixture consolidation",
        curriculumIntent: "Fixture flexible curriculum intent",
        isFlexibleWeek: true,
        calendarStatus: "FLEXIBLE",
        items: [],
      },
    ],
  };
}

function main() {
  const db = {
    users: [
      { id: "admin-1", name: "Admin", role: "ADMIN" },
      { id: "teacher-creche", name: "Crèche Teacher", role: "TEACHER" },
      { id: "teacher-basic", name: "Basic Teacher", role: "TEACHER" },
    ],
    classes: classRows(),
    academicSessions: [{ id: "session-2026", sessionName: "2026/2027", isActive: true }],
    terms: [
      { id: "term-1", sessionId: "session-2026", termName: "First Term", isActive: true },
      { id: "term-2", sessionId: "session-2026", termName: "Second Term" },
      { id: "term-3", sessionId: "session-2026", termName: "Third Term" },
    ],
  };
  db.classes = db.classes.map((row) => row.id === "creche" ? { ...row, teacherId: "teacher-creche" } : row);
  ensureEarlyYearsCurriculumShape(db);

  const admin = db.users[0];
  ["CRECHE", "NURSERY", "RECEPTION"].forEach((classCode) => {
    ["First Term", "Second Term", "Third Term"].forEach((termName) => {
      const first = importCurriculumPayload(db, fixture(classCode, termName), { actor: admin });
      assert.equal(first.result, "PASS", `${classCode} ${termName} import should pass`);
      const second = importCurriculumPayload(db, fixture(classCode, termName), { actor: admin });
      assert.equal(second.result, "PASS", `${classCode} ${termName} reimport should pass`);
      assert.equal(second.itemsCreated, 0, `${classCode} ${termName} reimport should not duplicate items`);
    });
  });

  assert.equal(getApprovedClassConfig("Crèche").academicSystem, "BRITISH_EYFS");
  assert.equal(getApprovedClassConfig("Nursery").academicSystem, "BRITISH_EYFS");
  assert.equal(getApprovedClassConfig("Reception").academicSystem, "BRITISH_EYFS");

  const creche = listCurriculum(db, { classId: "creche", termName: "First Term" }, admin);
  assert.equal(creche.weeks.length, 2, "Crèche First Term should load two fixture weeks");
  assert.equal(creche.weeks[1].isFlexibleWeek, true, "Flexible week should display");

  assert.throws(
    () => listCurriculum(db, { classId: "basic-1", termName: "First Term" }, admin),
    /only available/,
    "Basic 1 must not load through Early Years curriculum engine"
  );

  const teacherClasses = listAccessibleEarlyYearsClasses(db, db.users[1]);
  assert.deepEqual(teacherClasses.map((row) => row.id), ["creche"], "Teacher should see only assigned EYFS class");
  assert.throws(
    () => listCurriculum(db, { classId: "nursery", termName: "First Term" }, db.users[1]),
    /do not have access/,
    "Teacher must not open unassigned EYFS class"
  );

  const search = searchCurriculum(db, { classId: "creche", termName: "First Term", keyword: "weather" }, admin);
  assert.equal(search.resultCount, 1, "Search should find fixture vocabulary");

  const plan = createTeacherPlanShell(db, creche.weeks[0].id, db.users[1], { weeklyPlan: "Fixture linked plan shell" });
  assert.equal(plan.status, "DRAFT");
  assert.equal(plan.curriculumWeekId, creche.weeks[0].id);

  const invalid = validateImportPayload({ classLevelCode: "Basic 1", termName: "First Term", weeks: [] }, "invalid.json");
  assert.ok(invalid.errors.length > 0, "Invalid import should fail safely");

  console.log("Early Years curriculum smoke test passed.");
}

main();
