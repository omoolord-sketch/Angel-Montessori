#!/usr/bin/env node

const assert = require("assert/strict");
const crypto = require("crypto");
const path = require("path");
const { ensureAcademicSystemShape } = require("../lib/academicSystems");
const {
  importCurriculumFile,
  listCurriculum,
  seedDirectory,
} = require("../lib/earlyYearsCurriculum");
const {
  createWeeklyPlanFromCurriculum,
  ensureEarlyYearsPlanningShape,
  updateWeeklyPlan,
} = require("../lib/earlyYearsPlanning");
const {
  completeObservation,
  createJournalEntry,
  createObservation,
  createParentContribution,
  ensureEarlyYearsAssessmentShape,
  evidenceCoverageCheck,
  getDevelopmentOverview,
  getOrCreateChildProfile,
  listJournalEntries,
  listNextSteps,
  listObservations,
  listParentContributions,
  publishObservation,
  reviewObservation,
  reviewParentContribution,
  saveDevelopmentSummary,
  updateChildProfile,
  updateNextStep,
} = require("../lib/earlyYearsAssessment");

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

function weeklyPlanHash(db) {
  return hash({
    plans: db.curriculumTeacherPlans,
    daily: db.curriculumDailyTeachingRecords,
    reviews: db.curriculumWeeklyPlanReviews,
  });
}

function seedDb() {
  const db = {
    users: [
      { id: "leader-1", name: "Academic Leader", username: "leader", role: "ACADEMIC_OFFICER" },
      { id: "teacher-creche", name: "Creche Teacher", username: "teacher.creche", role: "TEACHER" },
      { id: "teacher-nursery", name: "Nursery Teacher", username: "teacher.nursery", role: "TEACHER" },
      { id: "teacher-reception", name: "Reception Teacher", username: "teacher.reception", role: "TEACHER" },
      { id: "teacher-basic", name: "Basic Teacher", username: "teacher.basic", role: "TEACHER" },
      { id: "teacher-unassigned", name: "Unassigned Teacher", username: "teacher.unassigned", role: "TEACHER" },
      { id: "parent-creche", name: "Creche Parent", username: "parent.creche", role: "PARENT", studentIds: ["student-creche"] },
      { id: "parent-nursery", name: "Nursery Parent", username: "parent.nursery", role: "PARENT", studentIds: ["student-nursery"] },
      { id: "student-user", name: "Student User", username: "student", role: "STUDENT" },
    ],
    classes: [],
    students: [
      { id: "student-creche", name: "Ada Creche", classId: "creche", className: "Creche" },
      { id: "student-nursery", name: "Bola Nursery", classId: "nursery", className: "Nursery" },
      { id: "student-reception", name: "Chika Reception", classId: "reception", className: "Reception" },
      { id: "student-basic", name: "Dayo Basic", classId: "basic-1", className: "Basic 1" },
      { id: "student-overlooked", name: "Efe Reception", classId: "reception", className: "Reception" },
    ],
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
  ensureEarlyYearsAssessmentShape(db);
  return db;
}

function importApprovedSeeds(db, actor) {
  const dir = seedDirectory();
  [
    "creche-term-1.json",
    "creche-term-2.json",
    "creche-term-3.json",
    "nursery-term-1.json",
    "nursery-term-2.json",
    "nursery-term-3.json",
    "reception-term-1.json",
    "reception-term-2.json",
    "reception-term-3.json",
  ].forEach((file) => {
    const report = importCurriculumFile(db, path.join(dir, file), { actor });
    assert.equal(report.result, "PASS", `${file} import should pass`);
  });
  assert.equal(db.curriculumWeeks.length, 117, "Approved AMES curriculum should contain 117 weeks");
}

function firstWeek(db, classId, user) {
  const view = listCurriculum(db, { classId, termName: "First Term" }, user);
  assert.equal(view.weeks.length, 13, `${classId} should expose 13 first-term weeks`);
  return view.weeks[0];
}

function createMinimumPlan(db, week, teacher) {
  const result = createWeeklyPlanFromCurriculum(db, week.id, teacher, {
    sessionId: "session-2026",
    termId: "term-first",
  });
  return updateWeeklyPlan(db, result.plan.id, teacher, {
    weeklyPriorities: "Observe language, independence and purposeful play.",
    directTeaching: "Short whole-group modelling and responsive adult support.",
    purposefulPlayProvision: "Provision supports the approved AMES weekly curriculum.",
    assessmentFocus: "Describe before interpreting and identify next steps.",
  });
}

function observationPayload(studentId, classId, overrides = {}) {
  return {
    studentId,
    classId,
    academicSessionId: "session-2026",
    termId: "term-first",
    observationDate: "2026-09-15",
    observationType: "EVERYDAY_OBSERVATION",
    context: "Purposeful provision",
    eyfsArea: "COMMUNICATION_LANGUAGE",
    title: "Language during play",
    objectiveObservation: "The child named three objects and asked an adult to help arrange the tray.",
    childWords: "I want the blue one first.",
    interpretation: "The child is using purposeful language to organise activity.",
    developmentalDescriptor: "DEVELOPING",
    nextStep: "Offer paired turn-taking language games during provision.",
    supportRequired: "Model short sentence frames.",
    challengeRequired: "Invite the child to explain the sequence to a peer.",
    followUpRequired: true,
    reviewDate: "2026-09-22",
    evidenceType: "OTHER",
    evidenceAnnotation: "The note shows practical language used in context.",
    isIncludedInLearningJournal: false,
    journalVisibility: "INTERNAL",
    ...overrides,
  };
}

function main() {
  const db = seedDb();
  const [leader, crecheTeacher, nurseryTeacher, receptionTeacher, basicTeacher, unassignedTeacher, crecheParent, nurseryParent, studentUser] = db.users;

  importApprovedSeeds(db, leader);
  const beforeCurriculum = curriculumHash(db);

  const crechePlan = createMinimumPlan(db, firstWeek(db, "creche", crecheTeacher), crecheTeacher);
  const nurseryPlan = createMinimumPlan(db, firstWeek(db, "nursery", nurseryTeacher), nurseryTeacher);
  const receptionPlan = createMinimumPlan(db, firstWeek(db, "reception", receptionTeacher), receptionTeacher);
  const beforePlans = weeklyPlanHash(db);

  const crecheObservation = createObservation(db, crecheTeacher, observationPayload("student-creche", "creche", {
    weeklyPlanId: crechePlan.id,
    curriculumItemId: crechePlan.curriculumItemIds?.[0],
    isIncludedInLearningJournal: true,
    isSignificant: true,
  }));
  assert.equal(crecheObservation.curriculumWeekId, crechePlan.curriculumWeekId, "Observation should link to curriculum through the weekly plan");
  assert.equal(crecheObservation.status, "DRAFT");
  assert.equal(crecheObservation.objectiveObservation.includes("named three objects"), true);
  assert.equal(crecheObservation.interpretation.includes("purposeful language"), true);

  const nurseryObservation = createObservation(db, nurseryTeacher, observationPayload("student-nursery", "nursery", {
    weeklyPlanId: nurseryPlan.id,
    eyfsArea: "MATHEMATICS",
    observationType: "FOCUSED_OBSERVATION",
    objectiveObservation: "The child sorted leaves into two groups and described big and small.",
    interpretation: "The method shows emerging comparison language and sorting strategy.",
    developmentalDescriptor: "EMERGING",
    nextStep: "Offer real objects for sorting by one attribute, then invite explanation.",
  }));
  assert.equal(nurseryObservation.eyfsArea, "MATHEMATICS");

  const receptionObservation = createObservation(db, receptionTeacher, observationPayload("student-reception", "reception", {
    weeklyPlanId: receptionPlan.id,
    eyfsArea: "LITERACY",
    observationType: "WORK_EVIDENCE",
    objectiveObservation: "The child identified initial sounds while matching picture cards.",
    interpretation: "This is literacy evidence only; dedicated phonics tracking is not implemented in Phase 4.",
    developmentalDescriptor: "SECURE",
    nextStep: "Invite the child to apply the sound in shared writing.",
  }));
  assert.equal(receptionObservation.observationType, "WORK_EVIDENCE");

  assert.throws(
    () => createObservation(db, basicTeacher, observationPayload("student-basic", "basic-1")),
    /Early Years|only available|cannot assess/,
    "Basic teacher cannot use the Early Years assessment engine"
  );
  assert.throws(
    () => createObservation(db, unassignedTeacher, observationPayload("student-nursery", "nursery")),
    /outside your assigned|do not have access/,
    "Unassigned teacher should be rejected"
  );
  assert.throws(
    () => listJournalEntries(db, "student-creche", studentUser),
    /Student access|not enabled/i,
    "Student access should be blocked"
  );
  assert.throws(
    () => createObservation(db, crecheTeacher, observationPayload("student-creche", "creche", { safeguardingConcern: true })),
    /safeguarding reporting procedure/,
    "Safeguarding concerns must not be stored as ordinary observations"
  );

  assert.equal(listNextSteps(db, crecheTeacher, { studentId: "student-creche" }).length, 1, "Observation next step should be created");
  completeObservation(db, crecheObservation.id, crecheTeacher);
  completeObservation(db, nurseryObservation.id, nurseryTeacher);
  completeObservation(db, receptionObservation.id, receptionTeacher);
  assert.equal(listObservations(db, leader, { status: "COMPLETE" }).length, 3, "Leader should see completed observations");

  assert.equal(listJournalEntries(db, "student-creche", crecheParent).length, 0, "Internal-only journal entry must be hidden from parent");
  assert.throws(
    () => listJournalEntries(db, "student-creche", nurseryParent),
    /own child/,
    "Parent must not view another child's journal"
  );
  publishObservation(db, crecheObservation.id, crecheTeacher, { visibility: "PARENT_VISIBLE" });
  const parentJournal = listJournalEntries(db, "student-creche", crecheParent);
  assert.equal(parentJournal.length, 1, "Parent-visible entry should appear for the correct parent");
  assert.equal(parentJournal[0].content.includes("named three objects"), true);

  const childVoice = createJournalEntry(db, "student-creche", crecheTeacher, {
    entryType: "CHILD_VOICE",
    title: "Child reflection",
    content: "Teacher recorded child voice after provision.",
    childVoice: "I liked helping.",
    visibility: "PARENT_VISIBLE",
  });
  assert.equal(childVoice.entryType, "CHILD_VOICE");
  const workSample = createJournalEntry(db, "student-creche", crecheTeacher, {
    entryType: "WORK_SAMPLE",
    title: "Drawing reference",
    content: "Annotated mark-making reference.",
    eyfsAreas: ["LITERACY"],
    visibility: "INTERNAL",
  });
  assert.equal(workSample.entryType, "WORK_SAMPLE");

  const contribution = createParentContribution(db, crecheParent, {
    studentId: "student-creche",
    title: "Home practical life",
    contribution: "Ada helped arrange cups at home.",
    homeLearningObservation: "She counted each cup carefully.",
  });
  assert.equal(contribution.status, "SUBMITTED");
  const reviewedContribution = reviewParentContribution(db, contribution.id, crecheTeacher, {
    status: "APPROVED",
    teacherResponse: "Thank you. This supports our independence observations.",
  });
  assert.equal(reviewedContribution.contribution.status, "APPROVED");
  assert.equal(listParentContributions(db, crecheParent, { studentId: "student-creche" }).length, 1);

  const summary = saveDevelopmentSummary(db, "student-creche", crecheTeacher, {
    academicSessionId: "session-2026",
    termId: "term-first",
    summaryType: "TERMLY",
    areaSummaries: {
      COMMUNICATION_LANGUAGE: {
        strengthsProgress: "Uses language purposefully in provision.",
        currentDevelopment: "Increasingly communicates choices.",
        nextPriority: "Extend turn-taking explanation.",
        descriptor: "DEVELOPING",
      },
    },
    overallLearningBehaviour: "Settling well and increasingly independent.",
    practicalLifeIndependence: "Enjoys routine responsibilities.",
    characterResponsibility: "Shows care for materials.",
    parentPartnershipPriority: "Continue simple sequencing language at home.",
    teacherSummary: "Ada is developing confidence through routines and language-rich provision.",
  });
  const historicalTeacherSummary = summary.teacherSummary;
  const overview = getDevelopmentOverview(db, "student-creche", crecheTeacher, { termId: "term-first" });
  assert.equal(overview.areaSummary.some((row) => row.latestDescriptor === "DEVELOPING"), true, "Latest descriptor should display");
  assert.equal(JSON.stringify(overview).includes("percentage"), false, "Development overview must not create percentages");
  assert.equal(JSON.stringify(overview).includes("rank"), false, "Development overview must not create ranking");

  const nextStep = listNextSteps(db, crecheTeacher, { studentId: "student-creche" })[0];
  updateNextStep(db, nextStep.id, crecheTeacher, { status: "IN_PROGRESS", reviewNote: "Adult modelling started." });
  assert.equal(listNextSteps(db, crecheTeacher, { studentId: "student-creche" })[0].status, "IN_PROGRESS");

  const reviewed = reviewObservation(db, nurseryObservation.id, leader, {
    developmentalDescriptor: "DEVELOPING",
    moderationNote: "Descriptor adjusted after moderation discussion.",
  });
  assert.equal(reviewed.status, "REVIEWED");
  assert.equal(reviewed.moderationNote.includes("moderation"), true);
  assert.throws(
    () => reviewObservation(db, receptionObservation.id, receptionTeacher, { moderationNote: "Teacher tries to moderate" }),
    /Only academic leaders/,
    "Unauthorised user cannot moderate"
  );

  const profile = getOrCreateChildProfile(db, db.students[0], crecheTeacher);
  assert.equal(profile.studentId, "student-creche");
  const updatedProfile = updateChildProfile(db, "student-creche", crecheTeacher, {
    preferredName: "Ada",
    homeLanguages: "English, Yoruba",
    interests: "Water play and practical life trays.",
    strengthsAtEntry: "Curious and observant.",
    parentPriorities: "Build confidence with peers.",
  });
  assert.equal(updatedProfile.preferredName, "Ada");

  const coverage = evidenceCoverageCheck(db, leader, { onlyGaps: true });
  assert.equal(coverage.some((row) => row.studentId === "student-overlooked"), true, "Coverage check should notice children with no evidence");
  assert.equal(coverage.some((row) => String(row.label).toLowerCase().includes("failing")), false, "Coverage check must not label children as failing");

  const printHtml = require("../lib/earlyYearsAssessment").buildJournalPrintHtml(db, "student-creche", crecheTeacher, {});
  assert.ok(printHtml.includes("Angel Montessori School"));
  assert.ok(printHtml.includes("Ada Creche"));
  assert.ok(printHtml.includes("Ada is developing confidence"));
  assert.equal(printHtml.includes("Annotated mark-making reference."), false, "Print view should not expose internal work sample notes automatically");

  assert.equal(db.earlyYearsDevelopmentSummaries.find((row) => row.id === summary.id).teacherSummary, historicalTeacherSummary, "Historical summary remains unchanged after later operations");
  assert.equal(curriculumHash(db), beforeCurriculum, "Phase 4 must not mutate approved curriculum records");
  assert.equal(weeklyPlanHash(db), beforePlans, "Phase 4 must not mutate teacher weekly plans");
  assert.equal(db.curriculumWeeks.length, 117, "117 approved curriculum weeks should remain present");

  console.log("Early Years assessment Phase 4 smoke test passed.");
  console.log("Verified: observations, descriptor separation, EYFS-only access, journal visibility, child voice, work samples, parent contributions, summaries, next steps, moderation, safeguarding boundary, coverage check, print privacy, and unchanged 117-week curriculum.");
}

main();
