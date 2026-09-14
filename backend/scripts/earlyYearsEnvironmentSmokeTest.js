#!/usr/bin/env node

const assert = require("assert/strict");
const crypto = require("crypto");
const path = require("path");
const { ensureAcademicSystemShape } = require("../lib/academicSystems");
const { importCurriculumFile, listCurriculum, seedDirectory } = require("../lib/earlyYearsCurriculum");
const { createWeeklyPlanFromCurriculum, ensureEarlyYearsPlanningShape } = require("../lib/earlyYearsPlanning");
const { createObservation, ensureEarlyYearsAssessmentShape } = require("../lib/earlyYearsAssessment");
const { ensureEarlyYearsLiteracyShape } = require("../lib/earlyYearsLiteracy");
const {
  buildChecklistPrintHtml,
  buildResourceRequestPrintHtml,
  createEnvironmentChecklist,
  createEnvironmentReview,
  createPracticalLifeActivity,
  createPracticalLifeAssignment,
  createProvisionArea,
  createResource,
  createResourceRequest,
  createWeeklyEnhancement,
  ensureEarlyYearsEnvironmentShape,
  getEnvironmentDashboard,
  listEnvironmentActions,
  listProvisionAreas,
  updateEnvironmentAction,
  updateEnvironmentChecklist,
  updatePracticalLifeActivity,
  updateResource,
  updateResourceRequest,
} = require("../lib/earlyYearsEnvironment");

function hash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function curriculumHash(db) {
  return hash({ terms: db.curriculumTerms, weeks: db.curriculumWeeks, items: db.curriculumItems });
}

function planHash(db) {
  return hash({ plans: db.curriculumTeacherPlans, daily: db.curriculumDailyTeachingRecords, reviews: db.curriculumWeeklyPlanReviews });
}

function assessmentHash(db) {
  return hash({ observations: db.earlyYearsObservations, journals: db.earlyYearsLearningJournalEntries, summaries: db.earlyYearsDevelopmentSummaries });
}

function literacyHash(db) {
  return hash({
    programmes: db.earlyYearsPhonicsProgrammes,
    sequence: db.earlyYearsPhonicsTeachingUnits,
    progress: db.earlyYearsPhonicsProgress,
    reading: db.earlyYearsReadingRecords,
    writing: db.earlyYearsWritingRecords,
  });
}

function financeHash(db) {
  return hash({
    financeTransactions: db.financeTransactions,
    financeExpenses: db.financeExpenses,
    schoolFeePayments: db.schoolFeePayments,
    studentPayments: db.studentPayments,
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
      { id: "parent-1", name: "Parent User", username: "parent", role: "PARENT", studentIds: ["student-reception"] },
      { id: "student-user", name: "Student User", username: "student", role: "STUDENT" },
    ],
    classes: [],
    students: [
      { id: "student-creche", name: "Cole Creche", classId: "creche", className: "Creche" },
      { id: "student-nursery", name: "Nina Nursery", classId: "nursery", className: "Nursery" },
      { id: "student-reception", name: "Ayo Reception", classId: "reception", className: "Reception" },
      { id: "student-basic", name: "Bayo Basic", classId: "basic-1", className: "Basic 1" },
    ],
    academicSessions: [{ id: "session-2026", sessionName: "2026/2027", isActive: true }],
    terms: [{ id: "term-first", sessionId: "session-2026", termName: "First Term", isActive: true }],
    financeTransactions: [{ id: "finance-1", amount: 5000, reason: "baseline" }],
  };
  ensureAcademicSystemShape(db);
  db.classes = db.classes.map((row) => {
    if (row.id === "creche") return { ...row, name: "Creche", teacherId: "teacher-creche" };
    if (row.id === "nursery") return { ...row, teacherId: "teacher-nursery" };
    if (row.id === "reception") return { ...row, teacherId: "teacher-reception" };
    if (row.id === "basic-1") return { ...row, teacherId: "teacher-basic" };
    return row;
  });
  ensureEarlyYearsPlanningShape(db);
  ensureEarlyYearsAssessmentShape(db);
  ensureEarlyYearsLiteracyShape(db);
  ensureEarlyYearsEnvironmentShape(db);
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
  assert.equal(db.curriculumWeeks.length, 117, "Approved curriculum should contain 117 weeks");
}

function firstWeek(db, classId, user) {
  const view = listCurriculum(db, { classId, termName: "First Term" }, user);
  assert.equal(view.weeks.length, 13, `${classId} should expose 13 first-term weeks`);
  return view.weeks[0];
}

function main() {
  const db = seedDb();
  const leader = db.users[0];
  const crecheTeacher = db.users[1];
  const nurseryTeacher = db.users[2];
  const receptionTeacher = db.users[3];
  const basicTeacher = db.users[4];
  const unassignedTeacher = db.users[5];
  const parent = db.users[6];
  const student = db.users[7];

  importApprovedSeeds(db, leader);
  const crechePlan = createWeeklyPlanFromCurriculum(db, firstWeek(db, "creche", crecheTeacher).id, crecheTeacher, { sessionId: "session-2026", termId: "term-first" }).plan;
  const nurseryPlan = createWeeklyPlanFromCurriculum(db, firstWeek(db, "nursery", nurseryTeacher).id, nurseryTeacher, { sessionId: "session-2026", termId: "term-first" }).plan;
  const receptionPlan = createWeeklyPlanFromCurriculum(db, firstWeek(db, "reception", receptionTeacher).id, receptionTeacher, { sessionId: "session-2026", termId: "term-first" }).plan;

  const beforeCurriculum = curriculumHash(db);
  const beforePlans = planHash(db);
  const beforeLiteracy = literacyHash(db);
  const beforeFinance = financeHash(db);

  const crecheArea = createProvisionArea(db, crecheTeacher, {
    classId: "creche",
    academicSessionId: "session-2026",
    termId: "term-first",
    areaType: "FINE_MOTOR_SENSORY",
    name: "Low sensory shelf",
    purpose: "Safe sensory exploration and settling.",
    coreResources: "soft blocks, textured basket",
    accessibilityNotes: "Low open shelf with adult nearby.",
  });
  const nurseryArea = createProvisionArea(db, nurseryTeacher, {
    classId: "nursery",
    areaType: "ROLE_PLAY",
    name: "Home corner",
    purpose: "Language, relationship, family and responsibility play.",
  });
  const receptionArea = createProvisionArea(db, receptionTeacher, {
    classId: "reception",
    areaType: "READING",
    name: "Reception reading area",
    purpose: "Independent book access, decodable reading practice and calm reading.",
    coreResources: "decodable books, story basket, cushions",
  });
  assert.equal(listProvisionAreas(db, crecheTeacher, { classId: "creche" }).length, 1, "Creche teacher views Creche provision");
  assert.equal(listProvisionAreas(db, nurseryTeacher, { classId: "nursery" }).length, 1, "Nursery teacher views Nursery provision");
  assert.equal(listProvisionAreas(db, receptionTeacher, { classId: "reception" }).length, 1, "Reception teacher views Reception provision");
  assert.throws(() => createProvisionArea(db, basicTeacher, { classId: "basic-1", name: "Wrong", areaType: "READING" }), /Early Years|access/, "Basic teacher rejected");
  assert.throws(() => createProvisionArea(db, unassignedTeacher, { classId: "reception", name: "Wrong", areaType: "READING" }), /access|unassigned/, "Unassigned teacher rejected");
  assert.throws(() => getEnvironmentDashboard(db, parent, { classId: "reception" }), /internal|access|authorised/i, "Parent cannot access internal environment dashboard");
  assert.throws(() => getEnvironmentDashboard(db, student, { classId: "reception" }), /internal|access|authorised/i, "Student cannot access environment dashboard");

  const crecheEnhancement = createWeeklyEnhancement(db, crecheTeacher, {
    weeklyPlanId: crechePlan.id,
    provisionAreaId: crecheArea.id,
    enhancementTitle: "Texture invitation",
    purpose: "Invite safe sensory exploration.",
    resourcesAdded: "texture basket",
    adultRole: "Stay close, name textures, and observe.",
    accessAdjustments: "Use large washable materials only.",
  });
  const nurseryEnhancement = createWeeklyEnhancement(db, nurseryTeacher, {
    weeklyPlanId: nurseryPlan.id,
    provisionAreaId: nurseryArea.id,
    enhancementTitle: "Market role play",
    purpose: "Use language, counting and social responsibility.",
    linkedCurriculumAreas: "COMMUNICATION_LANGUAGE, MATHEMATICS",
  });
  const outdoorEnhancement = createWeeklyEnhancement(db, receptionTeacher, {
    weeklyPlanId: receptionPlan.id,
    provisionAreaId: receptionArea.id,
    areaType: "OUTDOOR",
    enhancementTitle: "Outdoor story trail",
    purpose: "Link storytelling, gross motor movement and vocabulary.",
    outdoorConnection: "Risk-managed movement route with adult positioning.",
    accessAdjustments: "Visual route cards available.",
  });
  assert.equal(crecheEnhancement.weeklyPlanId, crechePlan.id, "Enhancement links to weekly plan");
  assert.equal(nurseryEnhancement.curriculumWeekId, nurseryPlan.curriculumWeekId, "Enhancement links to approved curriculum week");
  assert.equal(outdoorEnhancement.outdoorConnection.includes("Risk"), true, "Outdoor weekly enhancement stores risk consideration");

  const review = createEnvironmentReview(db, receptionTeacher, {
    classId: "reception",
    weeklyEnhancementId: outdoorEnhancement.id,
    reviewDecision: "DEEPEN",
    cycleStage: "ADAPT",
    observedUse: "Children used the story route repeatedly.",
    visibleLearning: "Vocabulary and sequence language increased.",
    changeNeeded: "Add picture prompts for less confident children.",
    nextWeeklyPlanFeedForward: "Keep trail and deepen story retelling.",
  });
  assert.equal(review.reviewDecision, "DEEPEN", "Teacher reviews enhancement");
  assert.equal(db.earlyYearsWeeklyProvisionEnhancements.find((row) => row.id === outdoorEnhancement.id).status, "REVIEWED", "Enhancement status updates");

  const leaderTemplate = createPracticalLifeActivity(db, leader, {
    name: "Shared pouring template",
    category: "POURING",
    purpose: "Shared leadership-defined Practical Life template.",
    materials: "jug, bowl, tray",
  });
  assert.throws(() => updatePracticalLifeActivity(db, receptionTeacher, leaderTemplate.id, { purpose: "Teacher edit" }), /leadership|templates/, "Teacher cannot edit shared system guidance/template");
  updatePracticalLifeActivity(db, leader, leaderTemplate.id, { purpose: "Leadership-managed template." });

  const crechePractical = createPracticalLifeActivity(db, crecheTeacher, {
    classId: "creche",
    name: "Carry soft basket",
    category: "CARRYING",
    purpose: "Let me help with safe classroom care.",
    developmentalStage: "LET_ME_HELP",
    materials: "soft basket",
  });
  const nurseryPractical = createPracticalLifeActivity(db, nurseryTeacher, {
    classId: "nursery",
    name: "Set snack table",
    category: "SERVING",
    purpose: "I can take responsibility for snack routine.",
    developmentalStage: "I_CAN_TAKE_RESPONSIBILITY",
    materials: "cups, napkins",
  });
  const receptionPractical = createPracticalLifeActivity(db, receptionTeacher, {
    classId: "reception",
    name: "Restore reading area",
    category: "RESOURCE_CARE",
    purpose: "Take responsibility for the learning environment.",
    developmentalStage: "I_CAN_TAKE_RESPONSIBILITY_FOR_MY_LEARNING_ENVIRONMENT",
    materials: "book basket, shelf labels",
  });
  createPracticalLifeAssignment(db, crecheTeacher, { classId: "creche", weeklyPlanId: crechePlan.id, activityId: crechePractical.id, independenceExpectation: "Do with me, then let me help." });
  createPracticalLifeAssignment(db, nurseryTeacher, { classId: "nursery", weeklyPlanId: nurseryPlan.id, activityId: nurseryPractical.id, independenceExpectation: "Children take a real role with adult nearby." });
  createPracticalLifeAssignment(db, receptionTeacher, { classId: "reception", weeklyPlanId: receptionPlan.id, activityId: receptionPractical.id, independenceExpectation: "Children manage the shelf after use." });
  const crecheDashboard = getEnvironmentDashboard(db, crecheTeacher, { classId: "creche" });
  const nurseryDashboard = getEnvironmentDashboard(db, nurseryTeacher, { classId: "nursery" });
  const receptionDashboard = getEnvironmentDashboard(db, receptionTeacher, { classId: "reception" });
  assert.notDeepEqual(crecheDashboard.practicalLifeGuidance.stages, nurseryDashboard.practicalLifeGuidance.stages, "Creche progression differs from Nursery");
  assert.notDeepEqual(nurseryDashboard.practicalLifeGuidance.stages, receptionDashboard.practicalLifeGuidance.stages, "Nursery progression differs from Reception");

  const checklistResult = createEnvironmentChecklist(db, receptionTeacher, {
    classId: "reception",
    academicSessionId: "session-2026",
    termId: "term-first",
    date: "2026-09-25",
    safetyStatus: "SECURE",
    accessibilityStatus: "ACTION_REQUIRED",
    resourceConditionStatus: "ACTION_REQUIRED",
    displayStatus: "DEVELOPING",
    strengths: "Children can independently choose books.",
    priorityActions: "Add visual choice board and repair torn book basket.",
    responsiblePerson: "Reception Teacher",
    deadline: "2026-09-28",
    reviewDate: "2026-09-30",
    accessibilityNotes: "General visual support needed. No confidential diagnosis is printed.",
    culturalRepresentationNotes: "Add Owo, Ondo State, Nigeria, Africa, families, occupations and modern life books without stereotypes.",
  });
  assert.equal(checklistResult.checklist.status, "ACTION_REQUIRED", "Checklist status saves");
  assert.equal(Boolean(checklistResult.action), true, "Action Required creates action item");
  const action = listEnvironmentActions(db, leader, { classId: "reception" })[0];
  updateEnvironmentAction(db, receptionTeacher, action.id, { status: "IN_PROGRESS", completionNote: "Visual support prepared." });
  const reviewedChecklist = updateEnvironmentChecklist(db, leader, checklistResult.checklist.id, { ...checklistResult.checklist, leadershipComment: "Reviewed. Keep the focus calm and purposeful." }).checklist;
  assert.equal(reviewedChecklist.leadershipComment.includes("Reviewed"), true, "Leadership can review checklist");
  assert.equal(JSON.stringify(getEnvironmentDashboard(db, leader, { classId: "reception" })).toLowerCase().includes("rank"), false, "No child or teacher ranking appears");

  const resource = createResource(db, receptionTeacher, {
    classId: "reception",
    name: "Book basket",
    category: "LITERACY",
    provisionArea: "READING",
    quantity: 2,
    usableQuantity: 1,
    condition: "NEEDS_REPAIR",
    purpose: "Accessible reading storage.",
    childAccessible: true,
    actuallyUsed: true,
  });
  const updatedResource = updateResource(db, receptionTeacher, resource.id, { condition: "REPLACE", notes: "Handle broken." });
  assert.equal(updatedResource.condition, "REPLACE", "Replacement need can be flagged");
  const request = createResourceRequest(db, receptionTeacher, {
    classId: "reception",
    resource: "Replacement book basket",
    reason: "Purpose before price: safe and accessible book choice.",
    quantity: 1,
    priority: "HIGH",
    provisionArea: "READING",
    linkedWeeklyPlanId: receptionPlan.id,
  });
  assert.equal(request.status, "REQUESTED", "Resource request created");
  assert.throws(() => updateResourceRequest(db, receptionTeacher, request.id, { status: "APPROVED" }), /leadership/, "Teacher cannot approve resource request");
  const reviewedRequest = updateResourceRequest(db, leader, request.id, { status: "REVIEWED", adminNote: "Check existing storage before purchase." });
  assert.equal(reviewedRequest.status, "REVIEWED", "Leadership reviews request");
  assert.equal(financeHash(db), beforeFinance, "Resource request does not alter finance");

  const linkedObservation = createObservation(db, receptionTeacher, {
    studentId: "student-reception",
    classId: "reception",
    weeklyPlanId: receptionPlan.id,
    provisionAreaId: receptionArea.id,
    weeklyEnhancementId: outdoorEnhancement.id,
    practicalLifeActivityId: receptionPractical.id,
    eyfsArea: "COMMUNICATION_LANGUAGE",
    title: "Story trail language",
    objectiveObservation: "Child sequenced story images during the outdoor story trail.",
    interpretation: "Outdoor provision supported language and confidence.",
    developmentalDescriptor: "DEVELOPING",
    nextStep: "Repeat with peer retelling.",
  });
  assert.equal(linkedObservation.provisionAreaId, receptionArea.id, "Phase 4 observation can link to provision area");
  assert.equal(linkedObservation.weeklyEnhancementId, outdoorEnhancement.id, "Phase 4 observation can link to weekly enhancement");
  const afterObservationHash = assessmentHash(db);

  const checklistPrint = buildChecklistPrintHtml(checklistResult.checklist);
  assert.equal(checklistPrint.includes("Angel Montessori School"), true, "Printable checklist includes school name");
  assert.equal(checklistPrint.includes("confidential diagnosis"), false, "Printable checklist does not expose confidential SEND details");
  const requestPrint = buildResourceRequestPrintHtml(request);
  assert.equal(requestPrint.includes("Resource Request"), true, "Printable resource request generated");
  assert.equal(requestPrint.includes("₦"), false, "No financial amount required in Phase 6 request print");

  assert.equal(curriculumHash(db), beforeCurriculum, "117 approved curriculum records unchanged");
  assert.equal(planHash(db), beforePlans, "Existing Phase 3 weekly plans unchanged by Phase 6 operational records");
  assert.equal(assessmentHash(db), afterObservationHash, "Phase 6 did not mutate existing observations after optional link creation");
  assert.equal(literacyHash(db), beforeLiteracy, "Phase 5 literacy data remains unchanged");
  assert.equal(db.curriculumWeeks.length, 117, "117 curriculum weeks remain present");
  assert.equal(JSON.stringify(db.earlyYearsEnvironmentChecklists).toLowerCase().includes("bottom"), false, "Checklist avoids ranking language");
  assert.equal(JSON.stringify(db.earlyYearsEnvironmentChecklists).toLowerCase().includes("decoration score"), false, "No decoration score is stored");
  assert.equal(JSON.stringify(db.earlyYearsResources).toLowerCase().includes("montessori compliant"), false, "No false Montessori compliance label is stored");

  console.log("Early Years environment Phase 6 smoke test passed.");
  console.log("Verified: provision areas, weekly enhancements, Practical Life, checklist/actions, resource inventory, resource requests, outdoor review, Phase 3/4/5 integration boundaries, print views, permissions, and unchanged 117-week curriculum.");
}

main();
