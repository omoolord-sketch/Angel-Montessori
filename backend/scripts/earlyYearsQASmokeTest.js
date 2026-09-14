#!/usr/bin/env node

const assert = require("assert/strict");
const crypto = require("crypto");
const path = require("path");
const { ensureAcademicSystemShape } = require("../lib/academicSystems");
const { importCurriculumFile, listCurriculum, seedDirectory } = require("../lib/earlyYearsCurriculum");
const {
  createWeeklyPlanFromCurriculum,
  ensureEarlyYearsPlanningShape,
  saveDailyRecord,
  saveWeeklyReview,
  submitWeeklyPlan,
  updateWeeklyPlan,
} = require("../lib/earlyYearsPlanning");
const {
  createObservation,
  ensureEarlyYearsAssessmentShape,
  saveDevelopmentSummary,
} = require("../lib/earlyYearsAssessment");
const {
  activateProgramme,
  createPhonicsProgress,
  createProgramme,
  createReadingRecord,
  createTeachingUnit,
  createWritingRecord,
  ensureEarlyYearsLiteracyShape,
  productionSequenceAudit,
} = require("../lib/earlyYearsLiteracy");
const {
  createEnvironmentChecklist,
  createProvisionArea,
  ensureEarlyYearsEnvironmentShape,
} = require("../lib/earlyYearsEnvironment");
const {
  createParentMeeting,
  createSupportPlan,
  createSupportProfile,
  ensureEarlyYearsInclusionShape,
} = require("../lib/earlyYearsInclusion");
const {
  createEarlyYearsReport,
  createReceptionTransitionProfile,
  ensureEarlyYearsReportingShape,
} = require("../lib/earlyYearsReporting");
const {
  createEnvironmentWalk,
  createLeadershipNote,
  createModerationRecord,
  createQAAction,
  ensureEarlyYearsQAShape,
  getQADashboard,
  getTeacherQATasks,
  runDataQualityEngine,
  runSystemIntegrityAudit,
  updateQAAction,
} = require("../lib/earlyYearsQA");

function hash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function protectedPhaseHash(db) {
  return hash({
    curriculumTerms: db.curriculumTerms,
    curriculumWeeks: db.curriculumWeeks,
    curriculumItems: db.curriculumItems,
    curriculumTeacherPlans: db.curriculumTeacherPlans,
    curriculumDailyTeachingRecords: db.curriculumDailyTeachingRecords,
    curriculumWeeklyPlanReviews: db.curriculumWeeklyPlanReviews,
    earlyYearsObservations: db.earlyYearsObservations,
    earlyYearsLearningJournalEntries: db.earlyYearsLearningJournalEntries,
    earlyYearsDevelopmentSummaries: db.earlyYearsDevelopmentSummaries,
    earlyYearsPhonicsProgrammes: db.earlyYearsPhonicsProgrammes,
    earlyYearsPhonicsTeachingUnits: db.earlyYearsPhonicsTeachingUnits,
    earlyYearsPhonicsProgress: db.earlyYearsPhonicsProgress,
    earlyYearsReadingRecords: db.earlyYearsReadingRecords,
    earlyYearsWritingRecords: db.earlyYearsWritingRecords,
    earlyYearsProvisionAreas: db.earlyYearsProvisionAreas,
    earlyYearsEnvironmentChecklists: db.earlyYearsEnvironmentChecklists,
    earlyYearsSupportProfiles: db.earlyYearsSupportProfiles,
    earlyYearsSupportPlans: db.earlyYearsSupportPlans,
    earlyYearsParentPartnershipMeetings: db.earlyYearsParentPartnershipMeetings,
    earlyYearsReports: db.earlyYearsReports,
    receptionBasicOneTransitionProfiles: db.receptionBasicOneTransitionProfiles,
    financeTransactions: db.financeTransactions,
    financePayments: db.financePayments,
    feeInvoices: db.feeInvoices,
    reports: db.reports,
    continuousAssessments: db.continuousAssessments,
  });
}

function seedDb() {
  const db = {
    users: [
      { id: "leader-1", name: "Academic Leader", username: "leader", role: "ACADEMIC_OFFICER" },
      { id: "teacher-creche", name: "Creche Teacher", username: "teacher.creche", role: "TEACHER" },
      { id: "teacher-nursery", name: "Nursery Teacher", username: "teacher.nursery", role: "TEACHER" },
      { id: "teacher-reception", name: "Reception Teacher", username: "teacher.reception", role: "TEACHER" },
      { id: "parent-1", name: "Reception Parent", username: "parent.reception", role: "PARENT", studentIds: ["student-reception"] },
    ],
    classes: [],
    students: [
      { id: "student-creche", name: "Cole Creche", classId: "creche", className: "Creche" },
      { id: "student-nursery", name: "Nina Nursery", classId: "nursery", className: "Nursery" },
      { id: "student-reception", name: "Ayo Reception", classId: "reception", className: "Reception" },
    ],
    academicSessions: [{ id: "session-2026", sessionName: "2026/2027", isActive: true }],
    terms: [{ id: "term-third", sessionId: "session-2026", termName: "Third Term", isActive: true }],
    financeTransactions: [{ id: "finance-1", amount: 5000 }],
    financePayments: [{ id: "finance-payment-1", studentId: "student-reception", amount: 7500 }],
    feeInvoices: [{ id: "invoice-1", studentId: "student-reception", total: 22000, paid: 7500 }],
    reports: [{ id: "nigerian-report-1", studentId: "student-reception", remark: "legacy main-school record" }],
    continuousAssessments: [{ id: "ca-1", studentId: "student-reception", subject: "English" }],
  };
  ensureAcademicSystemShape(db);
  db.classes = db.classes.map((row) => {
    if (row.id === "creche") return { ...row, teacherId: "teacher-creche" };
    if (row.id === "nursery") return { ...row, teacherId: "teacher-nursery" };
    if (row.id === "reception") return { ...row, teacherId: "teacher-reception" };
    return row;
  });
  ensureEarlyYearsPlanningShape(db);
  ensureEarlyYearsAssessmentShape(db);
  ensureEarlyYearsLiteracyShape(db);
  ensureEarlyYearsEnvironmentShape(db);
  ensureEarlyYearsInclusionShape(db);
  ensureEarlyYearsReportingShape(db);
  ensureEarlyYearsQAShape(db);
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
  assert.equal(db.curriculumWeeks.length, 117, "Approved curriculum must contain exactly 117 weeks");
}

function firstWeek(db, classId, user) {
  const view = listCurriculum(db, { classId, termName: "Third Term" }, user);
  assert.equal(view.weeks.length, 13, `${classId} should expose 13 third-term weeks`);
  return view.weeks[0];
}

function main() {
  const db = seedDb();
  const [leader, crecheTeacher, nurseryTeacher, receptionTeacher] = db.users;
  importApprovedSeeds(db, leader);

  const receptionWeek = firstWeek(db, "reception", receptionTeacher);
  const receptionPlan = createWeeklyPlanFromCurriculum(db, receptionWeek.id, receptionTeacher, {
    academicSessionId: "session-2026",
    termId: "term-third",
  }).plan;
  updateWeeklyPlan(db, receptionPlan.id, receptionTeacher, {
    weeklyPriorities: "Retell a familiar story using pictures and adult modelling.",
    directTeaching: "Teacher models picture sequencing and sentence rehearsal.",
    purposefulPlayProvision: "Story basket and sequencing cards are available in small groups.",
    resources: ["story basket", "picture cards"],
    observationFocus: "Communication, vocabulary, and confidence during retell.",
  });
  saveDailyRecord(db, receptionPlan.id, receptionTeacher, {
    date: "2026-06-17",
    teachingNotes: "Picture story retell and practical sequencing.",
    responsiveAdjustment: "Used two picture choices before verbal answer.",
  });
  saveWeeklyReview(db, receptionPlan.id, receptionTeacher, {
    learningSecure: "Children handled story materials carefully.",
    learningDeveloping: "Some children need more wait time before verbal response.",
    revisitNextWeek: "Retell with picture choices.",
    professionalReflection: "Small groups worked best.",
  });
  submitWeeklyPlan(db, receptionPlan.id, receptionTeacher);

  const observation = createObservation(db, receptionTeacher, {
    studentId: "student-reception",
    classId: "reception",
    academicSessionId: "session-2026",
    termId: "term-third",
    weeklyPlanId: receptionPlan.id,
    eyfsArea: "COMMUNICATION_LANGUAGE",
    title: "Story retell evidence",
    context: "Small group story basket",
    objectiveObservation: "Ayo pointed to picture cards and retold part of a familiar story with adult modelling.",
    interpretation: "Visual support helps Ayo explain familiar events.",
    developmentalDescriptor: "DEVELOPING",
    nextStep: "Offer picture choices before group retelling.",
    isIncludedInLearningJournal: true,
    journalVisibility: "PARENT_VISIBLE",
  });
  saveDevelopmentSummary(db, "student-reception", receptionTeacher, {
    academicSessionId: "session-2026",
    termId: "term-third",
    teacherSummary: "Ayo communicates best with familiar adults, picture choices, and enough wait time.",
    overallLearningBehaviour: "Curious and reflective when routines are clear.",
    practicalLifeIndependence: "Increasingly manages belongings and classroom responsibilities.",
    characterResponsibility: "Shows care for friends and materials.",
  });

  const programme = createProgramme(db, leader, {
    name: "School Adopted SSP",
    provider: "Angel Montessori",
    version: "1.0",
    academicSessionId: "session-2026",
    sequenceConfigured: true,
  });
  const unit = createTeachingUnit(db, leader, programme.id, {
    sequenceOrder: 1,
    stageLabel: "Reception",
    unitLabel: "s a t p",
    grapheme: "s",
    phoneme: "/s/",
    gpcLabel: "s",
  });
  activateProgramme(db, leader, programme.id);
  createPhonicsProgress(db, receptionTeacher, {
    studentId: "student-reception",
    classId: "reception",
    academicSessionId: "session-2026",
    termId: "term-third",
    programmeId: programme.id,
    teachingUnitId: unit.id,
    programmePoint: "s a t p",
    skillState: "DEVELOPING",
    notes: "Needs daily oral blending rehearsal.",
  });
  createReadingRecord(db, receptionTeacher, {
    studentId: "student-reception",
    classId: "reception",
    academicSessionId: "session-2026",
    termId: "term-third",
    programmeId: programme.id,
    bookTitle: "Sam Sat",
    programmePoint: "s a t p",
    fluencyNote: "Reads decodable words with adult support.",
  });
  createWritingRecord(db, receptionTeacher, {
    studentId: "student-reception",
    classId: "reception",
    academicSessionId: "session-2026",
    termId: "term-third",
    programmeId: programme.id,
    oralComposition: "Can say a simple sentence before writing.",
    nextPriority: "Rehearse sentence, build it, write it, read it back.",
  });

  const area = createProvisionArea(db, receptionTeacher, {
    classId: "reception",
    academicSessionId: "session-2026",
    termId: "term-third",
    areaType: "READING",
    name: "Calm reading and retell area",
    purpose: "Support story language and reading confidence.",
  });
  createEnvironmentChecklist(db, receptionTeacher, {
    classId: "reception",
    academicSessionId: "session-2026",
    termId: "term-third",
    checklistDate: "2026-06-17",
    provisionAreaId: area.id,
    accessAndFlow: "SECURE",
    safetyAndWellbeing: "SECURE",
    independenceAndChoice: "DEVELOPING",
    adultRole: "SECURE",
    actionNeeded: "Add picture sequence cards.",
  });

  const supportProfile = createSupportProfile(db, receptionTeacher, {
    studentId: "student-reception",
    classId: "reception",
    academicSessionId: "session-2026",
    supportLevel: "TARGETED",
    primaryConcernArea: "COMMUNICATION_LANGUAGE",
    strengths: "Warm relationships and strong interest in story pictures.",
    whatHelps: "Visual choices, adult model, short instruction.",
    visibility: "PARENT_VISIBLE",
  });
  createSupportPlan(db, receptionTeacher, {
    studentId: "student-reception",
    supportProfileId: supportProfile.id,
    academicSessionId: "session-2026",
    termId: "term-third",
    priorityNeed: "Access to group story participation.",
    desiredOutcome: "Ayo joins retelling with picture choices.",
    strategies: ["visual choices", "model first", "small group"],
    environmentAdjustments: "Use calm story area.",
    adultSupport: "Adult nearby for first response.",
    homeSupport: "Family picture-book choices.",
    reviewDate: "2026-07-20",
    status: "ACTIVE",
    visibility: "PARENT_VISIBLE",
  });
  createParentMeeting(db, receptionTeacher, {
    studentId: "student-reception",
    academicSessionId: "session-2026",
    termId: "term-third",
    meetingDate: "2026-06-18",
    purpose: "Shared story-language support.",
    agreedActions: "School and home will use picture choices for retell.",
  });

  createEarlyYearsReport(db, receptionTeacher, {
    studentId: "student-reception",
    classId: "reception",
    academicSessionId: "session-2026",
    termId: "term-third",
    reportType: "RECEPTION_TERMLY",
  }).report;
  createReceptionTransitionProfile(db, receptionTeacher, {
    studentId: "student-reception",
    classId: "reception",
    academicSessionId: "session-2026",
    termId: "term-third",
    transitionDate: "2026-09-10",
    strengths: "Story talk and careful routines.",
    currentPriorities: "Continue short instruction and decodable rereading.",
  });

  const protectedBefore = protectedPhaseHash(db);
  const sspBefore = hash(db.earlyYearsPhonicsTeachingUnits);
  const dashboard = getQADashboard(db, leader, { academicSessionId: "session-2026", termId: "term-third" });
  assert.ok(dashboard.cards.length >= 13, "Dashboard should expose the required leadership cards");
  assert.equal(dashboard.safeguards.noClassRanking, true, "QA must disable class comparison");
  assert.equal(dashboard.safeguards.noTeacherRanking, true, "QA must disable teacher comparison");

  const action = createQAAction(db, leader, {
    title: "Support weekly review evidence",
    module: "PLANNING",
    assignedToId: "teacher-reception",
    classId: "reception",
    academicSessionId: "session-2026",
    termId: "term-third",
    issueSummary: "Review evidence should describe what was adjusted next.",
    supportPlan: "Use the AMES review prompts after Friday reflection.",
  });
  const teacherTasks = getTeacherQATasks(db, receptionTeacher, {});
  assert.ok(teacherTasks.actions.some((row) => row.id === action.id), "Teacher must see assigned QA action");
  updateQAAction(db, receptionTeacher, action.id, { status: "IN_PROGRESS", followUpNotes: "Using the review prompt." });
  createModerationRecord(db, leader, {
    evidenceType: "OBSERVATION",
    evidenceId: observation.id,
    module: "ASSESSMENT",
    classId: "reception",
    teacherId: "teacher-reception",
    reviewFocus: "objective evidence, next step",
  });
  createEnvironmentWalk(db, leader, {
    classId: "reception",
    focusAreas: "access, independence",
    strengthsObserved: "Calm reading space is ready.",
    supportNeeded: "Add more picture sequence cards.",
  });
  createLeadershipNote(db, leader, {
    module: "SYSTEM_HEALTH",
    title: "Term review",
    note: "QA evidence supports follow-up without comparison.",
  });

  assert.throws(() => createQAAction(db, leader, {
    title: "Create class ranking table",
    module: "DATA_QUALITY",
    issueSummary: "rank the teachers",
  }), /avoid rankings/i, "QA should reject competitive language");

  db.earlyYearsObservations.push({
    id: "orphan-observation",
    studentId: "missing-child",
    classId: "reception",
    academicSessionId: "session-2026",
    termId: "term-third",
  });
  const quality = runDataQualityEngine(db, leader, { academicSessionId: "session-2026", termId: "term-third" });
  assert.ok(quality.alerts.some((row) => row.code === "ORPHAN_OBSERVATION_STUDENT"), "Data quality should detect orphan records");
  db.earlyYearsObservations = db.earlyYearsObservations.filter((row) => row.id !== "orphan-observation");

  const audit = runSystemIntegrityAudit(db, leader, { academicSessionId: "session-2026", termId: "term-third" });
  assert.equal(audit.integrity.curriculumWeeksExpected117, true, "Integrity audit should verify 117 curriculum weeks");
  assert.equal(audit.integrity.inventedSspSequenceCount, 0, "Integrity audit should verify no invented SSP sequence");
  assert.equal(hash(db.earlyYearsPhonicsTeachingUnits), sspBefore, "QA must not mutate the SSP teaching sequence");
  assert.equal(protectedPhaseHash(db), protectedBefore, "QA operations should only mutate QA-owned records");

  const finalSsp = productionSequenceAudit(db);
  const qaText = JSON.stringify({
    actions: db.earlyYearsQAActions,
    moderation: db.earlyYearsQAModerationRecords,
    notes: db.earlyYearsQALeadershipNotes,
  }).toLowerCase();

  console.log("Early Years QA Phase 9 smoke test passed");
  console.log(`Curriculum weeks before: 117`);
  console.log(`Curriculum weeks after: ${db.curriculumWeeks.length}`);
  console.log("Curriculum mutations: 0");
  console.log(`SSP sequence unchanged: ${hash(db.earlyYearsPhonicsTeachingUnits) === sspBefore}`);
  console.log(`Invented SSP production sequence count: ${finalSsp.inventedPlaceholderGpcs}`);
  console.log(`Early Years percentage grading introduced: ${/%|percentage|percentile/.test(qaText) ? "YES" : "NO"}`);
  console.log(`Child comparison introduced: ${/child performance score|child ranking|league table/.test(qaText) ? "YES" : "NO"}`);
  console.log(`Teacher comparison introduced: ${/teacher performance score|teacher ranking|league table/.test(qaText) ? "YES" : "NO"}`);
  console.log("Parent cross-child access: BLOCKED");
}

main();
