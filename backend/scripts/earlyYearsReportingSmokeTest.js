#!/usr/bin/env node

const assert = require("assert/strict");
const crypto = require("crypto");
const path = require("path");
const { ensureAcademicSystemShape } = require("../lib/academicSystems");
const { importCurriculumFile, listCurriculum, seedDirectory } = require("../lib/earlyYearsCurriculum");
const { createWeeklyPlanFromCurriculum, ensureEarlyYearsPlanningShape } = require("../lib/earlyYearsPlanning");
const {
  createObservation,
  ensureEarlyYearsAssessmentShape,
  saveDevelopmentSummary,
} = require("../lib/earlyYearsAssessment");
const {
  activateProgramme,
  createLiteracySummary,
  createPhonicsProgress,
  createProgramme,
  createReadingRecord,
  createSupportPlan: createLiteracySupportPlan,
  createTeachingUnit,
  createWritingRecord,
  ensureEarlyYearsLiteracyShape,
} = require("../lib/earlyYearsLiteracy");
const {
  createProvisionArea,
  createWeeklyEnhancement,
  ensureEarlyYearsEnvironmentShape,
} = require("../lib/earlyYearsEnvironment");
const {
  createSupportConcern,
  createSupportPlan,
  createSupportProfile,
  createTransitionPlan,
  ensureEarlyYearsInclusionShape,
} = require("../lib/earlyYearsInclusion");
const {
  ELG_REFERENCE_ITEMS,
  ELG_REFERENCE_WORDING,
  EYFS_AREAS,
  amendReport,
  approveReport,
  buildReportPrintHtml,
  buildTransitionPrintHtml,
  createCommentTemplate,
  createEarlyYearsReport,
  createReceptionEyfsReference,
  createReceptionTransitionProfile,
  ensureEarlyYearsReportingShape,
  getReceptionTransitionForStudent,
  getReportDetail,
  listReceptionEyfsReferences,
  listReceptionTransitions,
  listReportArchive,
  listReports,
  publishReport,
  reportDashboard,
  returnReport,
  submitReport,
  updateEarlyYearsReport,
  updateReceptionEyfsReference,
  updateReceptionTransitionProfile,
  acknowledgeTransitionHandover,
} = require("../lib/earlyYearsReporting");

function hash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function curriculumHash(db) {
  return hash({ terms: db.curriculumTerms, weeks: db.curriculumWeeks, items: db.curriculumItems });
}

function planningHash(db) {
  return hash({ plans: db.curriculumTeacherPlans, daily: db.curriculumDailyTeachingRecords, reviews: db.curriculumWeeklyPlanReviews });
}

function assessmentHash(db) {
  return hash({
    observations: db.earlyYearsObservations,
    journals: db.earlyYearsLearningJournalEntries,
    summaries: db.earlyYearsDevelopmentSummaries,
    nextSteps: db.earlyYearsNextSteps,
  });
}

function literacyHash(db) {
  return hash({
    programmes: db.earlyYearsPhonicsProgrammes,
    sequence: db.earlyYearsPhonicsTeachingUnits,
    progress: db.earlyYearsPhonicsProgress,
    reading: db.earlyYearsReadingRecords,
    writing: db.earlyYearsWritingRecords,
    support: db.earlyYearsLiteracySupportPlans,
    summaries: db.earlyYearsLiteracySummaries,
  });
}

function sspSequenceHash(db) {
  return hash(db.earlyYearsPhonicsTeachingUnits);
}

function environmentHash(db) {
  return hash({
    areas: db.earlyYearsProvisionAreas,
    enhancements: db.earlyYearsWeeklyProvisionEnhancements,
    practicalLife: db.earlyYearsPracticalLifeActivities,
    checklists: db.earlyYearsEnvironmentChecklists,
    resources: db.earlyYearsResources,
    requests: db.earlyYearsResourceRequests,
    reviews: db.earlyYearsEnvironmentReviews,
  });
}

function inclusionHash(db) {
  return hash({
    profiles: db.earlyYearsSupportProfiles,
    concerns: db.earlyYearsSupportConcerns,
    plans: db.earlyYearsSupportPlans,
    strategies: db.earlyYearsSupportStrategies,
    referrals: db.earlyYearsReferralRecords,
    meetings: db.earlyYearsParentPartnershipMeetings,
    transitions: db.earlyYearsTransitionSupportPlans,
  });
}

function financeHash(db) {
  return hash({
    financeTransactions: db.financeTransactions,
    financePayments: db.financePayments,
    schoolFeePayments: db.schoolFeePayments,
    studentPayments: db.studentPayments,
    feeInvoices: db.feeInvoices,
  });
}

function nigerianReportHash(db) {
  return hash({
    reports: db.reports,
    continuousAssessments: db.continuousAssessments,
    resultApprovals: db.resultApprovals,
    computedResults: db.computedResults,
    termResultSummaries: db.termResultSummaries,
  });
}

function seedDb() {
  const db = {
    users: [
      { id: "leader-1", name: "Academic Leader", username: "leader", role: "ACADEMIC_OFFICER" },
      { id: "teacher-creche", name: "Creche Teacher", username: "teacher.creche", role: "TEACHER" },
      { id: "teacher-nursery", name: "Nursery Teacher", username: "teacher.nursery", role: "TEACHER" },
      { id: "teacher-reception", name: "Reception Teacher", username: "teacher.reception", role: "TEACHER" },
      { id: "teacher-basic", name: "Basic 1 Teacher", username: "teacher.basic", role: "TEACHER" },
      { id: "teacher-unassigned", name: "Unassigned Teacher", username: "teacher.unassigned", role: "TEACHER" },
      { id: "parent-1", name: "Reception Parent", username: "parent.reception", role: "PARENT", studentIds: ["student-reception"] },
      { id: "parent-2", name: "Other Parent", username: "parent.other", role: "PARENT", studentIds: ["student-nursery"] },
      { id: "student-user", name: "Student User", username: "student", role: "STUDENT", studentId: "student-reception" },
    ],
    classes: [],
    students: [
      { id: "student-creche", name: "Cole Creche", classId: "creche", className: "Creche" },
      { id: "student-nursery", name: "Nina Nursery", classId: "nursery", className: "Nursery" },
      { id: "student-reception", name: "Ayo Reception", classId: "reception", className: "Reception" },
      { id: "student-basic", name: "Bayo Basic", classId: "basic-1", className: "Basic 1" },
    ],
    academicSessions: [{ id: "session-2026", sessionName: "2026/2027", isActive: true }],
    terms: [{ id: "term-third", sessionId: "session-2026", termName: "Third Term", isActive: true }],
    reports: [{ id: "nigerian-report-1", studentId: "student-basic", average: 71 }],
    continuousAssessments: [{ id: "ca-1", studentId: "student-basic", score: 18 }],
    resultApprovals: [],
    computedResults: [],
    termResultSummaries: [],
    financeTransactions: [{ id: "finance-1", amount: 5000, reason: "baseline" }],
    financePayments: [{ id: "finance-payment-1", studentId: "student-basic", amount: 7500 }],
    schoolFeePayments: [{ id: "fee-payment-1", studentId: "student-reception", amount: 7500 }],
    studentPayments: [{ id: "student-payment-1", studentId: "student-reception", amount: 7500 }],
    feeInvoices: [{ id: "invoice-1", studentId: "student-reception", total: 22000, paid: 7500 }],
  };
  ensureAcademicSystemShape(db);
  db.classes = db.classes.map((row) => {
    if (row.id === "creche") return { ...row, name: "Creche", teacherId: "teacher-creche" };
    if (row.id === "nursery") return { ...row, name: "Nursery", teacherId: "teacher-nursery" };
    if (row.id === "reception") return { ...row, name: "Reception", teacherId: "teacher-reception" };
    if (row.id === "basic-1") return { ...row, name: "Basic 1", teacherId: "teacher-basic" };
    return row;
  });
  ensureEarlyYearsPlanningShape(db);
  ensureEarlyYearsAssessmentShape(db);
  ensureEarlyYearsLiteracyShape(db);
  ensureEarlyYearsEnvironmentShape(db);
  ensureEarlyYearsInclusionShape(db);
  ensureEarlyYearsReportingShape(db);
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

function assertRejected(fn, matcher, label) {
  assert.throws(fn, matcher, label);
}

function reportPayload(overrides = {}) {
  return {
    attendanceSummary: "Present 58 days; absent 2 days.",
    practicalLifeSummary: "Uses classroom routines with increasing care and can choose familiar materials responsibly.",
    independenceSummary: "Manages personal items with reminders and is becoming confident during transitions.",
    characterResponsibilitySummary: "Shows kindness, cooperation, and care for shared materials.",
    learningBehaviourSummary: "Engages with curiosity, persists with adult encouragement, and asks for help appropriately.",
    parentPartnershipSummary: "Home and school will continue shared reading and practical-life routines.",
    supportSummary: "Visual choices and short instructions help participation.",
    accessSummary: "Small-group modelling and picture prompts support communication.",
    literacySummary: "Uses the adopted SSP to blend familiar sounds, reads decodable text with support, and is building writing confidence.",
    mathematicsSummary: "Explores number stories, counting, and shape language through practical activities.",
    schoolReadinessSummary: "Ready for the next step through growing independence, communication, and learning confidence.",
    transitionPriorities: "Keep visual routines, shared reading, and practical problem solving active.",
    strengths: "Warm relationships, story talk, picture choices, and careful practical-life work.",
    nextPriorities: "Deepen oral explanation, independent rereading, and self-managed learning routines.",
    overallTeacherComment: "Ayo has grown in confidence and now joins familiar group learning with increasing independence.",
    internalTeacherNotes: "Internal moderation note for leadership only.",
    ...overrides,
    areas: EYFS_AREAS.map((area) => ({
      eyfsArea: area.code,
      descriptor: "DEVELOPING",
      strengthsProgress: `${area.name}: shows meaningful progress through adult-supported play and exploration.`,
      currentDevelopment: `${area.name}: applies familiar ideas in routines and small-group activities.`,
      nextPriority: `${area.name}: continue extending independence, explanation, and confident participation.`,
      teacherComment: `${area.name}: evidence is drawn from observations, practical activities, and teacher knowledge.`,
      sourceEvidenceSummary: "Observation and development-summary evidence available for teacher reference.",
    })),
  };
}

function createCompletedReport(db, user, studentId, classId, reportType) {
  const created = createEarlyYearsReport(db, user, {
    studentId,
    classId,
    academicSessionId: "session-2026",
    termId: "term-third",
    reportType,
  });
  const detail = updateEarlyYearsReport(db, user, created.report.id, reportPayload({ reportType }));
  assert.equal(detail.areas.length, 7, "Every termly report should include all seven EYFS areas");
  return detail;
}

function main() {
  const db = seedDb();
  const [leader, crecheTeacher, nurseryTeacher, receptionTeacher, basicTeacher, unassignedTeacher, parent, otherParent, studentUser] = db.users;

  importApprovedSeeds(db, leader);
  const curriculumBeforeCount = db.curriculumWeeks.length;

  const crechePlan = createWeeklyPlanFromCurriculum(db, firstWeek(db, "creche", crecheTeacher).id, crecheTeacher, { sessionId: "session-2026", termId: "term-third" }).plan;
  const nurseryPlan = createWeeklyPlanFromCurriculum(db, firstWeek(db, "nursery", nurseryTeacher).id, nurseryTeacher, { sessionId: "session-2026", termId: "term-third" }).plan;
  const receptionPlan = createWeeklyPlanFromCurriculum(db, firstWeek(db, "reception", receptionTeacher).id, receptionTeacher, { sessionId: "session-2026", termId: "term-third" }).plan;

  createObservation(db, receptionTeacher, {
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
    areaSummaries: {
      COMMUNICATION_LANGUAGE: {
        strengthsProgress: "Retells familiar story moments with picture support.",
        currentDevelopment: "Explains ideas in small groups.",
        nextPriority: "Build longer sentences in group sharing.",
        descriptor: "DEVELOPING",
      },
    },
  });

  const programme = createProgramme(db, leader, {
    name: "School Adopted SSP",
    provider: "Angel Montessori",
    version: "1.0",
    academicSessionId: "session-2026",
    sequenceConfigured: true,
  });
  const teachingUnit = createTeachingUnit(db, leader, programme.id, {
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
    teachingUnitId: teachingUnit.id,
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
    comprehensionNote: "Answers simple who and what questions.",
    teacherComment: "Uses phonics knowledge with encouragement.",
    parentVisible: true,
  });
  createWritingRecord(db, receptionTeacher, {
    studentId: "student-reception",
    classId: "reception",
    academicSessionId: "session-2026",
    termId: "term-third",
    programmeId: programme.id,
    oralComposition: "Can say a simple sentence before writing.",
    segmenting: "Hears initial sounds in familiar words.",
    teacherComment: "Writing confidence is growing.",
    nextPriority: "Rehearse sentence, build it, write it, read it back.",
    parentVisible: true,
  });
  createLiteracySupportPlan(db, receptionTeacher, {
    studentId: "student-reception",
    classId: "reception",
    academicSessionId: "session-2026",
    termId: "term-third",
    programmeId: programme.id,
    identifiedNeed: "Needs extra oral blending before independent decodable reading.",
    supportFocus: "Short daily blending practice using adopted SSP order.",
    strategy: "Use sound buttons and oral blending games.",
    reviewDate: "2026-07-20",
  });
  createLiteracySummary(db, receptionTeacher, {
    studentId: "student-reception",
    classId: "reception",
    academicSessionId: "session-2026",
    termId: "term-third",
    phonicsSummary: "Uses the school SSP sequence and is developing blending confidence.",
    readingSummary: "Reads simple decodable text with adult prompting.",
    comprehensionSummary: "Retells familiar events using picture support.",
    writingSummary: "Writes known sounds and attempts simple words.",
    strengths: "Enjoys books and oral story talk.",
    currentPriorities: "Oral blending, decodable rereading, and confident sentence rehearsal.",
    support: "Short daily keep-up practice.",
    nextSteps: "Continue the adopted SSP sequence.",
    parentVisible: true,
  });

  const provisionArea = createProvisionArea(db, receptionTeacher, {
    classId: "reception",
    academicSessionId: "session-2026",
    termId: "term-third",
    areaType: "READING",
    name: "Calm reading and retell area",
    purpose: "Support story language and reading confidence.",
  });
  createWeeklyEnhancement(db, receptionTeacher, {
    weeklyPlanId: receptionPlan.id,
    provisionAreaId: provisionArea.id,
    enhancementTitle: "Story picture prompt set",
    purpose: "Support oral retell and turn-taking.",
    accessAdjustments: "Picture choices, adult model, small group.",
  });

  const supportProfile = createSupportProfile(db, receptionTeacher, {
    studentId: "student-reception",
    classId: "reception",
    academicSessionId: "session-2026",
    supportLevel: "TARGETED",
    primaryConcernArea: "COMMUNICATION_LANGUAGE",
    strengths: "Warm relationships and strong interest in story pictures.",
    interests: "Story baskets and practical-life routines.",
    whatHelps: "Visual choices, adult model, short instruction.",
    parentPerspective: "Parent reports Ayo enjoys picture books at home.",
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
    communicationStrategies: "Wait time and two clear choices.",
    adultSupport: "Adult nearby for first response.",
    homeSupport: "Family picture-book choices.",
    reviewDate: "2026-07-20",
    status: "ACTIVE",
    visibility: "PARENT_VISIBLE",
  });
  createSupportConcern(db, leader, {
    studentId: "student-reception",
    concernArea: "SENSORY_ACCESS",
    objectiveEvidence: "Restricted leadership note: family medical context not for parent report.",
    context: "Leadership review",
    status: "MONITOR",
    visibility: "RESTRICTED",
  });
  createTransitionPlan(db, receptionTeacher, {
    studentId: "student-reception",
    receivingClass: "basic-1",
    transitionDate: "2026-09-10",
    strengths: "Story talk and careful routines.",
    supportStrategies: "visual choices, model first",
    currentPriorities: "Continue short instruction and decodable rereading.",
    status: "HANDED_OVER",
    visibility: "PARENT_VISIBLE",
  });

  const before = {
    curriculum: curriculumHash(db),
    planning: planningHash(db),
    assessment: assessmentHash(db),
    literacy: literacyHash(db),
    sspSequence: sspSequenceHash(db),
    environment: environmentHash(db),
    inclusion: inclusionHash(db),
    finance: financeHash(db),
    nigerianReports: nigerianReportHash(db),
  };

  createCommentTemplate(db, leader, {
    title: "Specific Strength Next Step",
    section: "AREA",
    guidanceText: "Be specific, describe learning, and give one next priority.",
    exampleComment: "The child can retell familiar story events and will next practise explaining why events happened.",
  });

  const crecheReport = createCompletedReport(db, crecheTeacher, "student-creche", "creche", "CRECHE_TERMLY");
  assert.equal(crecheReport.report.reportType, "CRECHE_TERMLY", "Creche termly report type is supported");

  const nurseryDraft = createEarlyYearsReport(db, nurseryTeacher, {
    studentId: "student-nursery",
    classId: "nursery",
    academicSessionId: "session-2026",
    termId: "term-third",
    reportType: "NURSERY_TERMLY",
  });
  assertRejected(() => submitReport(db, nurseryTeacher, nurseryDraft.report.id), /incomplete/i, "Incomplete draft cannot be submitted");
  const nurseryReport = updateEarlyYearsReport(db, nurseryTeacher, nurseryDraft.report.id, reportPayload({ literacySummary: "" }));
  assert.equal(nurseryReport.report.reportType, "NURSERY_TERMLY", "Nursery termly report type is supported");

  const receptionCreated = createEarlyYearsReport(db, receptionTeacher, {
    studentId: "student-reception",
    classId: "reception",
    academicSessionId: "session-2026",
    termId: "term-third",
    reportType: "RECEPTION_END_OF_YEAR",
  });
  assert.equal(receptionCreated.areas.every((area) => area.descriptor === ""), true, "Evidence can suggest, but descriptors are not auto-judged");
  let receptionReport = updateEarlyYearsReport(db, receptionTeacher, receptionCreated.report.id, reportPayload({ reportType: "RECEPTION_END_OF_YEAR" }));
  assert.equal(receptionReport.report.reportType, "RECEPTION_END_OF_YEAR", "Reception end-of-year report type is supported");
  assert.equal(receptionReport.evidenceSuggestions.recentObservations.length > 0, true, "Phase 4 evidence suggestions load");
  assert.equal(receptionReport.evidenceSuggestions.literacySummary.reading.length > 0, true, "Phase 5 literacy suggestions load");
  assert.equal(receptionReport.evidenceSuggestions.supportSummary.length > 0, true, "Phase 7 parent-visible support suggestions load");

  assertRejected(() => createEarlyYearsReport(db, basicTeacher, {
    studentId: "student-basic",
    classId: "basic-1",
    academicSessionId: "session-2026",
    termId: "term-third",
  }), /Early Years reports/, "Basic teacher cannot create EYFS report for Basic 1");
  assertRejected(() => createEarlyYearsReport(db, unassignedTeacher, {
    studentId: "student-reception",
    classId: "reception",
    academicSessionId: "session-2026",
    termId: "term-third",
  }), /unassigned|access/i, "Unassigned teacher is rejected");
  assertRejected(() => updateEarlyYearsReport(db, receptionTeacher, receptionReport.report.id, { overallTeacherComment: "This is a weak report." }), /professional developmental language/i, "Negative labels are blocked");
  assertRejected(() => updateEarlyYearsReport(db, receptionTeacher, receptionReport.report.id, { overallTeacherComment: "Do not add class rank or score total here." }), /must be developmental/i, "CA, ranking, and scoring language is blocked");

  submitReport(db, crecheTeacher, crecheReport.report.id);
  submitReport(db, nurseryTeacher, nurseryReport.report.id);
  receptionReport = submitReport(db, receptionTeacher, receptionReport.report.id);
  assert.equal(receptionReport.report.reportStatus, "SUBMITTED", "Teacher can submit complete report");
  assert.equal(reportDashboard(db, leader, { classId: "reception" }).statusCounts.SUBMITTED >= 1, true, "Leadership dashboard sees submitted reports");

  receptionReport = returnReport(db, leader, receptionReport.report.id, { reviewerComment: "Please sharpen the Basic 1 continuity next priority." });
  assert.equal(receptionReport.report.reportStatus, "RETURNED_FOR_REVISION", "Leader can return report");
  receptionReport = updateEarlyYearsReport(db, receptionTeacher, receptionReport.report.id, {
    nextPriorities: "Continue oral explanation, independent rereading, and confident classroom responsibility.",
    areas: receptionReport.areas,
  });
  receptionReport = submitReport(db, receptionTeacher, receptionReport.report.id);
  receptionReport = approveReport(db, leader, receptionReport.report.id, { reviewerComment: "Approved for parent publication." });
  assert.equal(receptionReport.report.reportStatus, "APPROVED", "Leader can approve report");
  receptionReport = publishReport(db, leader, receptionReport.report.id);
  assert.equal(receptionReport.report.reportStatus, "PUBLISHED", "Leader can publish report");
  assert.equal(receptionReport.report.publishedToParent, true, "Published report is parent-visible");
  assertRejected(() => updateEarlyYearsReport(db, receptionTeacher, receptionReport.report.id, { overallTeacherComment: "Silent overwrite attempt" }), /locked/i, "Published reports are locked");

  const parentDetail = getReportDetail(db, parent, receptionReport.report.id);
  assert.equal(parentDetail.report.internalTeacherNotes, undefined, "Parent report hides internal teacher notes");
  assertRejected(() => getReportDetail(db, otherParent, receptionReport.report.id), /own child|published/i, "Parent cannot view another child");
  assertRejected(() => getReportDetail(db, studentUser, receptionReport.report.id), /Student access/, "Student users do not have unrestricted Early Years report access");
  const html = buildReportPrintHtml(parentDetail);
  assert.match(html, /Angel Montessori School/, "Report print view includes school branding");
  assert.equal(html.includes("Internal moderation note"), false, "Report print excludes internal notes");

  const amendment = amendReport(db, leader, receptionReport.report.id, { amendmentReason: "Corrected parent-facing priority wording." });
  assert.equal(amendment.report.reportVersion, "1.1", "Amendment creates v1.1");
  assertRejected(() => getReportDetail(db, parent, amendment.report.id), /published/i, "Parent cannot see amendment draft");
  assert.equal(getReportDetail(db, parent, receptionReport.report.id).report.id, receptionReport.report.id, "Parent still sees v1.0 until amended report is published");
  submitReport(db, leader, amendment.report.id);
  approveReport(db, leader, amendment.report.id, {});
  const publishedAmendment = publishReport(db, leader, amendment.report.id);
  const parentReports = listReports(db, parent, { studentId: "student-reception" });
  assert.equal(parentReports[0].id, publishedAmendment.report.id, "Parent current view moves to amended report after publication");
  assert.equal(listReportArchive(db, parent, "student-reception").some((row) => row.id === receptionReport.report.id), true, "Older report version remains archived");

  const reference = createReceptionEyfsReference(db, receptionTeacher, {
    studentId: "student-reception",
    classId: "reception",
    academicSessionId: "session-2026",
    referenceItemId: ELG_REFERENCE_ITEMS[0].id,
    teacherComment: "Listens to familiar story language with visual support.",
    evidenceSummary: "Teacher judgement from observations and literacy records.",
    status: "APPROVED",
  });
  assert.equal(reference.status, "DRAFT", "Teacher-created EYFS reference does not skip review");
  assert.equal(reference.amesReferenceStatus, "NOT_YET_ASSESSED", "No automatic ELG reference judgement is made");
  assertRejected(() => createReceptionEyfsReference(db, nurseryTeacher, {
    studentId: "student-nursery",
    classId: "nursery",
    academicSessionId: "session-2026",
    referenceItemId: ELG_REFERENCE_ITEMS[0].id,
  }), /Reception/, "Non-Reception class is blocked from EYFS reference");
  let referenceRecord = updateReceptionEyfsReference(db, receptionTeacher, reference.id, {
    amesReferenceStatus: "DEVELOPING_TOWARDS_REFERENCE",
    teacherComment: "Developing towards the AMES reference through supported story talk.",
    status: "SUBMITTED",
  });
  assert.equal(referenceRecord.status, "SUBMITTED", "Teacher can submit EYFS reference");
  referenceRecord = updateReceptionEyfsReference(db, leader, reference.id, { status: "APPROVED", reviewerComment: "Reference approved." });
  referenceRecord = updateReceptionEyfsReference(db, leader, reference.id, { status: "PUBLISHED" });
  assert.equal(referenceRecord.status, "PUBLISHED", "Leadership can publish EYFS reference");
  assert.equal(listReceptionEyfsReferences(db, parent, "student-reception").length, 1, "Parent sees published EYFS reference summary");
  assert.equal(ELG_REFERENCE_WORDING, "The Early Learning Goals are statutory end-of-Reception expectations within England's EYFS system. Angel Montessori School operates in Nigeria and adopts them as an end-of-Reception reference framework within its British-system Early Years programme.", "ELG legal wording is exact");

  let transition = createReceptionTransitionProfile(db, receptionTeacher, {
    studentId: "student-reception",
    classId: "reception",
    academicSessionId: "session-2026",
    termId: "term-third",
    transitionDate: "2026-09-10",
    communicationLanguage: "Uses picture choices and adult model to explain familiar ideas.",
    psed: "Builds confidence through clear routines and warm adult support.",
    physicalDevelopment: "Manages classroom movement and practical-life routines safely.",
    phonics: "Continue the adopted SSP sequence from s a t p and oral blending.",
    reading: "Continue decodable rereading with adult encouragement.",
    writing: "Rehearse sentence orally before writing and reading back.",
    mathematics: "Build on counting, matching, and practical number stories.",
    understandingTheWorld: "Shows curiosity during investigation and story-linked exploration.",
    expressiveArts: "Uses drawing, role play, and materials to communicate ideas.",
    practicalLifeIndependence: "Can manage belongings and needs visual routine prompts.",
    learningBehaviour: "Curious, reflective, and persistent with a familiar routine.",
    characterResponsibility: "Kind, cooperative, and increasingly responsible for materials.",
    strengths: "Story language, practical-life care, and warm relationships.",
    interests: "Story baskets, construction, and picture cards.",
    successfulStrategies: "visual choices, model first, short instructions",
    accessAdjustments: "Picture prompts and calm small group.",
    currentPriorities: "Continue oral explanation, decodable rereading, and independent routines.",
    parentInformation: "Parent values continued reading guidance.",
    childVoice: "I like the story cards.",
    receivingTeacherNotes: "Start with picture choices and continue short instruction.",
    parentTransitionSummary: "Basic 1 will build on Ayo's story talk, reading confidence, and independence.",
    schoolReadinessSummary: "Ready means continuity, not finished learning.",
    readiness: {
      COMMUNICATION: "Uses supported spoken language to join familiar activities.",
      LITERACY: "Uses early phonics and decodable rereading with support.",
      INDEPENDENCE: "Growing self-management with visual routines.",
      LEARNING_BEHAVIOUR: "Curious and persistent when tasks are clear.",
    },
  });
  assert.equal(transition.status, "DRAFT", "Transition profile starts as draft");
  assert.equal(JSON.stringify(transition).includes("Restricted leadership note"), false, "Restricted inclusion data is not copied into transition profile");
  transition = updateReceptionTransitionProfile(db, receptionTeacher, transition.id, { status: "SUBMITTED" });
  transition = updateReceptionTransitionProfile(db, leader, transition.id, { status: "APPROVED" });
  transition = updateReceptionTransitionProfile(db, leader, transition.id, { status: "PUBLISHED" });
  assert.equal(listReceptionTransitions(db, basicTeacher, {}).length, 1, "Authorised Basic 1 teacher sees incoming published handover");
  assertRejected(() => updateReceptionTransitionProfile(db, basicTeacher, transition.id, { phonics: "Basic teacher edit" }), /cannot edit|access/i, "Basic 1 teacher cannot edit Reception historical evidence");
  transition = acknowledgeTransitionHandover(db, basicTeacher, transition.id, { receivingTeacherNotes: "Acknowledged for Basic 1 continuity." });
  assert.equal(transition.status, "HANDED_OVER", "Basic 1 teacher can acknowledge handover");
  assert.equal(getReceptionTransitionForStudent(db, parent, "student-reception").transitions.length, 1, "Parent transition summary is available after publication");
  assert.match(buildTransitionPrintHtml(transition), /Reception to Basic 1 Transition Profile/, "Transition print view renders");
  assert.equal(JSON.stringify(transition).includes("I like the story cards."), true, "Child voice is preserved");

  const movedStudent = db.students.find((row) => row.id === "student-reception");
  movedStudent.classId = "basic-1";
  movedStudent.className = "Basic 1";
  assert.equal(getReportDetail(db, parent, publishedAmendment.report.id).report.classId, "reception", "Historical Reception report remains viewable after child moves to Basic 1");

  const after = {
    curriculum: curriculumHash(db),
    planning: planningHash(db),
    assessment: assessmentHash(db),
    literacy: literacyHash(db),
    sspSequence: sspSequenceHash(db),
    environment: environmentHash(db),
    inclusion: inclusionHash(db),
    finance: financeHash(db),
    nigerianReports: nigerianReportHash(db),
  };

  assert.equal(db.curriculumWeeks.length, 117, "Curriculum count remains 117 after Phase 8");
  assert.equal(after.curriculum, before.curriculum, "Phase 8 does not mutate approved curriculum");
  assert.equal(after.planning, before.planning, "Phase 8 does not mutate weekly plans");
  assert.equal(after.assessment, before.assessment, "Phase 8 does not mutate observations, journals, or development summaries");
  assert.equal(after.literacy, before.literacy, "Phase 8 does not mutate literacy records");
  assert.equal(after.sspSequence, before.sspSequence, "SSP sequence remains unchanged");
  assert.equal(after.environment, before.environment, "Phase 8 does not mutate environment records");
  assert.equal(after.inclusion, before.inclusion, "Phase 8 does not mutate inclusion records");
  assert.equal(after.finance, before.finance, "Phase 8 does not mutate finance");
  assert.equal(after.nigerianReports, before.nigerianReports, "Phase 8 does not mutate Nigerian report cards");

  const reportingText = JSON.stringify({
    reports: db.earlyYearsReports,
    areas: db.earlyYearsReportAreas,
    references: db.receptionEyfsReferences,
    transitions: db.receptionBasicOneTransitionProfiles,
  }).toLowerCase();
  ["ca1", "ca2", "ca3", "class rank", "position in class", "cgpa", "score total"].forEach((term) => {
    assert.equal(reportingText.includes(term), false, `Early Years reporting data must not introduce ${term}`);
  });

  console.log("Early Years Reporting Phase 8 smoke test passed");
  console.log(`Curriculum weeks before: ${curriculumBeforeCount}`);
  console.log(`Curriculum weeks after: ${db.curriculumWeeks.length}`);
  console.log(`Curriculum mutations: ${after.curriculum === before.curriculum ? 0 : 1}`);
  console.log(`SSP sequence unchanged: ${after.sspSequence === before.sspSequence}`);
  console.log("Early Years percentage/ranking introduced: NO");
}

main();
