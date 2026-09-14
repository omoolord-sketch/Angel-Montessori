#!/usr/bin/env node

const assert = require("assert/strict");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const {
  ensureAcademicSystemShape,
} = require("../lib/academicSystems");
const {
  importCurriculumFile,
  listCurriculum,
  seedDirectory,
} = require("../lib/earlyYearsCurriculum");
const {
  approveWeeklyPlan,
  buildPrintHtml,
  copyPreviousWeekStructure,
  createWeeklyPlanFromCurriculum,
  ensureEarlyYearsPlanningShape,
  getWeeklyPlanDetail,
  listWeeklyPlans,
  phaseGuidance,
  returnWeeklyPlan,
  saveDailyRecord,
  saveWeeklyReview,
  submitWeeklyPlan,
  updateWeeklyPlan,
} = require("../lib/earlyYearsPlanning");

function hash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function curriculumHash(db) {
  return hash({
    terms: db.curriculumTerms,
    weeks: db.curriculumWeeks,
    items: db.curriculumItems,
  });
}

function seedDb() {
  const db = {
    users: [
      { id: "admin-1", name: "Academic Leader", username: "leader", role: "ACADEMIC_OFFICER" },
      { id: "teacher-creche", name: "Crèche Teacher", username: "teacher.creche", role: "TEACHER" },
      { id: "teacher-nursery", name: "Nursery Teacher", username: "teacher.nursery", role: "TEACHER" },
      { id: "teacher-reception", name: "Reception Teacher", username: "teacher.reception", role: "TEACHER" },
      { id: "teacher-basic", name: "Basic Teacher", username: "teacher.basic", role: "TEACHER" },
      { id: "parent-1", name: "Parent User", username: "parent", role: "PARENT" },
      { id: "student-1", name: "Student User", username: "student", role: "STUDENT" },
    ],
    classes: [],
    academicSessions: [{ id: "session-2026", sessionName: "2026/2027", isActive: true }],
    terms: [
      { id: "term-first", sessionId: "session-2026", termName: "First Term", isActive: true },
      { id: "term-second", sessionId: "session-2026", termName: "Second Term" },
      { id: "term-third", sessionId: "session-2026", termName: "Third Term" },
    ],
  };
  ensureAcademicSystemShape(db);
  db.classes = db.classes.map((row) => {
    if (row.id === "creche") return { ...row, teacherId: "teacher-creche" };
    if (row.id === "nursery") return { ...row, teacherId: "teacher-nursery" };
    if (row.id === "reception") return { ...row, teacherId: "teacher-reception" };
    if (row.id === "basic-1") return { ...row, teacherId: "teacher-basic" };
    return row;
  });
  ensureEarlyYearsPlanningShape(db);
  return db;
}

function importApprovedSeeds(db, actor) {
  const dir = seedDirectory();
  const files = [
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
  files.forEach((file) => {
    const report = importCurriculumFile(db, path.join(dir, file), { actor });
    assert.equal(report.result, "PASS", `${file} import should pass`);
  });
  assert.equal(db.curriculumWeeks.length, 117, "Approved curriculum should contain 117 weeks");
  assert.ok(db.curriculumItems.length >= 117, "Approved curriculum items should be present");
}

function firstWeek(db, classId, user) {
  const view = listCurriculum(db, { classId, termName: "First Term" }, user);
  assert.equal(view.weeks.length, 13, `${classId} should expose 13 first-term weeks`);
  return view.weeks[0];
}

function completeMinimumPlan(db, plan, user) {
  return updateWeeklyPlan(db, plan.id, user, {
    weeklyPriorities: "Secure routines, language, practical life and purposeful provision for the week.",
    directTeaching: "Short intentional teaching, modelling, storytelling and guided discussion.",
    purposefulPlayProvision: "Continuous provision supports the approved weekly curriculum intent.",
    resources: "picture books\npractical life trays\noutdoor resources",
    assessmentFocus: "Notice communication, independence, access needs and next steps.",
    observationFocus: "What should change because of what adults now know?",
  });
}

function main() {
  const db = seedDb();
  const leader = db.users[0];
  const crecheTeacher = db.users[1];
  const nurseryTeacher = db.users[2];
  const receptionTeacher = db.users[3];
  const basicTeacher = db.users[4];
  const parent = db.users[5];
  const student = db.users[6];

  importApprovedSeeds(db, leader);
  const beforeCurriculumHash = curriculumHash(db);

  const crecheCurriculum = listCurriculum(db, { classId: "creche", termName: "First Term" }, crecheTeacher);
  assert.equal(crecheCurriculum.weeks.length, 13, "creche should expose 13 first-term weeks");
  const crecheWeek = crecheCurriculum.weeks[0];
  const crecheWeek2 = crecheCurriculum.weeks[1];
  const nurseryWeek = firstWeek(db, "nursery", nurseryTeacher);
  const receptionWeek = firstWeek(db, "reception", receptionTeacher);

  const crechePlanResult = createWeeklyPlanFromCurriculum(db, crecheWeek.id, crecheTeacher, {
    sessionId: "session-2026",
    termId: "term-first",
  });
  assert.equal(crechePlanResult.created, true);
  assert.equal(crechePlanResult.plan.planStatus, "DRAFT");
  assert.equal(crechePlanResult.plan.curriculumSnapshot.lockedFromEditing, true);
  assert.equal(phaseGuidance("CRECHE").requiresReceptionPhonics, false);

  const duplicate = createWeeklyPlanFromCurriculum(db, crecheWeek.id, crecheTeacher, {
    sessionId: "session-2026",
    termId: "term-first",
  });
  assert.equal(duplicate.duplicatePrevented, true, "Duplicate shared class plan should be prevented");
  assert.equal(db.curriculumTeacherPlans.length, 1);

  const nurseryPlan = createWeeklyPlanFromCurriculum(db, nurseryWeek.id, nurseryTeacher, {
    sessionId: "session-2026",
    termId: "term-first",
  }).plan;
  assert.equal(phaseGuidance("NURSERY").requiresReceptionPhonics, false);
  assert.equal(nurseryPlan.phaseGuidance.requiresReceptionPhonics, false, "Nursery should not receive Reception SSP requirements");

  const receptionPlan = createWeeklyPlanFromCurriculum(db, receptionWeek.id, receptionTeacher, {
    sessionId: "session-2026",
    termId: "term-first",
  }).plan;
  assert.equal(receptionPlan.phaseGuidance.requiresReceptionPhonics, true, "Reception should receive Reception support");
  assert.ok(Object.prototype.hasOwnProperty.call(receptionPlan.phonicsImplementation, "programmePoint"));

  assert.throws(
    () => createWeeklyPlanFromCurriculum(db, receptionWeek.id, basicTeacher, { sessionId: "session-2026", termId: "term-first" }),
    /do not have access|unassigned|access/,
    "Unassigned teacher must not create a Reception plan"
  );
  assert.throws(
    () => firstWeek(db, "basic-1", leader),
    /only available/,
    "Basic/JSS/SS classes must not load through Early Years planning"
  );

  let crechePlan = completeMinimumPlan(db, crechePlanResult.plan, crecheTeacher);
  assert.equal(crechePlan.weeklyPriorities.includes("Secure routines"), true);
  crechePlan = submitWeeklyPlan(db, crechePlan.id, crecheTeacher);
  assert.equal(crechePlan.planStatus, "SUBMITTED");
  assert.throws(
    () => updateWeeklyPlan(db, crechePlan.id, crecheTeacher, { teacherNotes: "silent rewrite" }),
    /cannot be silently rewritten/,
    "Submitted plan should not be silently rewritten"
  );
  crechePlan = returnWeeklyPlan(db, crechePlan.id, leader, { notes: "Please strengthen outdoor provision." });
  assert.equal(crechePlan.planStatus, "RETURNED_FOR_REVISION");
  crechePlan = updateWeeklyPlan(db, crechePlan.id, crecheTeacher, { outdoorLearningPlan: "Outdoor story walk, movement games and plant care." });
  crechePlan = submitWeeklyPlan(db, crechePlan.id, crecheTeacher);
  crechePlan = approveWeeklyPlan(db, crechePlan.id, leader, { notes: "Approved for classroom use." });
  assert.equal(crechePlan.planStatus, "APPROVED");

  const dailyRecord = saveDailyRecord(db, crechePlan.id, crecheTeacher, {
    date: "2026-09-14",
    plannedTeaching: "Shared story and practical life routines.",
    actualTeaching: "Children needed more settling time before the story.",
    childrenRequiringRevisit: "Identified learners need the routine repeated.",
    childrenReadyForExtension: "Confident learners can take extra care roles.",
    provisionChanges: "Added visual routine cards.",
    nextDayAdjustment: "Begin with song and routine cards before book time.",
  });
  assert.equal(dailyRecord.weeklyPlanId, crechePlan.id);

  const weeklyReview = saveWeeklyReview(db, crechePlan.id, crecheTeacher, {
    learningSecure: "Routines are becoming more secure.",
    learningDeveloping: "Some children need revisit with transitions.",
    revisitNextWeek: "Revisit tidy-up and book-handling routines.",
    professionalReflection: "Shorter adult prompts improved engagement.",
  });
  assert.equal(weeklyReview.weeklyPlanId, crechePlan.id);

  const detail = getWeeklyPlanDetail(db, crechePlan.id, crecheTeacher);
  assert.equal(detail.dailyRecords.length, 1);
  assert.equal(detail.weeklyReview.id, weeklyReview.id);
  assert.ok(detail.auditTrail.length >= 5, "Audit trail should record planning workflow");

  const printHtml = buildPrintHtml(detail);
  assert.ok(printHtml.includes("Angel Montessori School"));
  assert.ok(printHtml.includes("Approved Curriculum"));
  assert.ok(printHtml.includes("AMES Weekly Implementation Plan"));

  const crecheWeek2Plan = createWeeklyPlanFromCurriculum(db, crecheWeek2.id, crecheTeacher, {
    sessionId: "session-2026",
    termId: "term-first",
  }).plan;
  const copied = copyPreviousWeekStructure(db, crecheWeek2Plan.id, crecheTeacher);
  assert.equal(copied.copiedFromPlanId, crechePlan.id, "Copy should use the nearest previous plan");
  assert.equal(copied.plan.curriculumWeekId, crecheWeek2.id, "Copy must not replace the new curriculum week link");
  assert.deepEqual(copied.plan.resources, crechePlan.resources, "Reusable resources should copy across");
  assert.notEqual(
    copied.plan.curriculumSnapshot.weekTitle,
    crechePlan.curriculumSnapshot.weekTitle,
    "Curriculum snapshot must remain the new week snapshot"
  );

  assert.equal(listWeeklyPlans(db, {}, parent).plans.length, 0, "Parent must not see internal teacher planning rows");
  assert.equal(listWeeklyPlans(db, {}, student).plans.length, 0, "Student must not see internal teacher planning rows");
  assert.throws(
    () => getWeeklyPlanDetail(db, crechePlan.id, parent),
    /access|planning|Early Years/,
    "Parent must not open a plan detail"
  );

  const teacherList = listWeeklyPlans(db, {}, crecheTeacher);
  assert.equal(teacherList.plans.length, 2);
  assert.ok(teacherList.plans.some((row) => row.id === crechePlan.id));
  const leaderList = listWeeklyPlans(db, {}, leader);
  assert.equal(leaderList.plans.length, 4);
  assert.equal(leaderList.summary.APPROVED, 1);
  assert.equal(leaderList.summary.DRAFT, 3);

  const afterCurriculumHash = curriculumHash(db);
  assert.equal(afterCurriculumHash, beforeCurriculumHash, "Phase 3 must not mutate approved curriculum records");
  assert.equal(db.curriculumWeeks.length, 117, "117 approved curriculum weeks should remain present");

  console.log("Early Years planning Phase 3 smoke test passed.");
  console.log("Verified: create plans, duplicate prevention, class differentiation, copy previous structure, submission, review, approval, daily records, weekly review, print view, permissions, audit trail, and unchanged 117-week curriculum.");
}

main();
