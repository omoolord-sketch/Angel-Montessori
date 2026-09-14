#!/usr/bin/env node

const assert = require("assert/strict");
const crypto = require("crypto");
const path = require("path");
const { ensureAcademicSystemShape } = require("../lib/academicSystems");
const { importCurriculumFile, listCurriculum, seedDirectory } = require("../lib/earlyYearsCurriculum");
const { createWeeklyPlanFromCurriculum, ensureEarlyYearsPlanningShape } = require("../lib/earlyYearsPlanning");
const { createObservation, ensureEarlyYearsAssessmentShape } = require("../lib/earlyYearsAssessment");
const {
  activateProgramme,
  createProgramme,
  createSupportPlan: createLiteracySupportPlan,
  createTeachingUnit,
  ensureEarlyYearsLiteracyShape,
} = require("../lib/earlyYearsLiteracy");
const {
  createProvisionArea,
  createResource,
  createWeeklyEnhancement,
  ensureEarlyYearsEnvironmentShape,
} = require("../lib/earlyYearsEnvironment");
const {
  buildParentMeetingPrintHtml,
  buildSupportPlanPrintHtml,
  buildTransitionPrintHtml,
  createConsentRecord,
  createParentMeeting,
  createParentSupportSummary,
  createReferralRecord,
  createSupportConcern,
  createSupportPlan,
  createSupportProfile,
  createSupportStrategy,
  createTransitionPlan,
  ensureEarlyYearsInclusionShape,
  getInclusionDashboard,
  getStudentInclusionProfile,
  reviewSupportPlan,
  updateParentMeeting,
  updateParentPartnershipProfile,
  updateReferralRecord,
  updateSupportPlan,
} = require("../lib/earlyYearsInclusion");

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
  return hash({ observations: db.earlyYearsObservations, journals: db.earlyYearsLearningJournalEntries, summaries: db.earlyYearsDevelopmentSummaries });
}

function literacyHash(db) {
  return hash({
    programmes: db.earlyYearsPhonicsProgrammes,
    sequence: db.earlyYearsPhonicsTeachingUnits,
    progress: db.earlyYearsPhonicsProgress,
    reading: db.earlyYearsReadingRecords,
    writing: db.earlyYearsWritingRecords,
    support: db.earlyYearsLiteracySupportPlans,
  });
}

function sspSequenceHash(db) {
  return hash(db.earlyYearsPhonicsTeachingUnits);
}

function environmentHash(db) {
  return hash({
    areas: db.earlyYearsProvisionAreas,
    enhancements: db.earlyYearsWeeklyProvisionEnhancements,
    checklists: db.earlyYearsEnvironmentChecklists,
    resources: db.earlyYearsResources,
    requests: db.earlyYearsResourceRequests,
    reviews: db.earlyYearsEnvironmentReviews,
  });
}

function financeHash(db) {
  return hash({
    financeTransactions: db.financeTransactions,
    financeExpenses: db.financeExpenses,
    schoolFeePayments: db.schoolFeePayments,
    studentPayments: db.studentPayments,
    feeInvoices: db.feeInvoices,
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
      { id: "parent-2", name: "Other Parent", username: "parent.other", role: "PARENT", studentIds: ["student-nursery"] },
      { id: "student-user", name: "Student User", username: "student", role: "STUDENT" },
    ],
    classes: [],
    students: [
      { id: "student-creche", name: "Cole Creche", classId: "creche", className: "Crèche" },
      { id: "student-nursery", name: "Nina Nursery", classId: "nursery", className: "Nursery" },
      { id: "student-reception", name: "Ayo Reception", classId: "reception", className: "Reception" },
      { id: "student-basic", name: "Bayo Basic", classId: "basic-1", className: "Basic 1" },
    ],
    academicSessions: [{ id: "session-2026", sessionName: "2026/2027", isActive: true }],
    terms: [{ id: "term-first", sessionId: "session-2026", termName: "First Term", isActive: true }],
    financeTransactions: [{ id: "finance-1", amount: 5000, reason: "baseline" }],
    schoolFeePayments: [{ id: "fee-payment-1", studentId: "student-reception", amount: 7500 }],
    studentPayments: [{ id: "student-payment-1", studentId: "student-reception", amount: 7500 }],
    feeInvoices: [{ id: "invoice-1", studentId: "student-reception", total: 22000, paid: 7500 }],
  };
  ensureAcademicSystemShape(db);
  db.classes = db.classes.map((row) => {
    if (row.id === "creche") return { ...row, name: "Crèche", teacherId: "teacher-creche" };
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
  const view = listCurriculum(db, { classId, termName: "First Term" }, user);
  assert.equal(view.weeks.length, 13, `${classId} should expose 13 first-term weeks`);
  return view.weeks[0];
}

function assertRejected(fn, matcher, label) {
  assert.throws(fn, matcher, label);
}

function main() {
  const db = seedDb();
  const [leader, crecheTeacher, nurseryTeacher, receptionTeacher, basicTeacher, unassignedTeacher, parent, otherParent, studentUser] = db.users;

  importApprovedSeeds(db, leader);

  const crechePlan = createWeeklyPlanFromCurriculum(db, firstWeek(db, "creche", crecheTeacher).id, crecheTeacher, { sessionId: "session-2026", termId: "term-first" }).plan;
  const nurseryPlan = createWeeklyPlanFromCurriculum(db, firstWeek(db, "nursery", nurseryTeacher).id, nurseryTeacher, { sessionId: "session-2026", termId: "term-first" }).plan;
  const receptionPlan = createWeeklyPlanFromCurriculum(db, firstWeek(db, "reception", receptionTeacher).id, receptionTeacher, { sessionId: "session-2026", termId: "term-first" }).plan;

  const observation = createObservation(db, receptionTeacher, {
    studentId: "student-reception",
    classId: "reception",
    academicSessionId: "session-2026",
    termId: "term-first",
    weeklyPlanId: receptionPlan.id,
    eyfsArea: "COMMUNICATION_LANGUAGE",
    title: "Small group language observation",
    context: "Story basket activity",
    objectiveObservation: "Ayo watched the group, pointed to picture cards, and used two-word phrases after adult modelling.",
    nextStep: "Offer visual choices before group retelling.",
    possibleAccessConcern: true,
  });

  const programme = createProgramme(db, leader, {
    name: "School Adopted SSP",
    provider: "Angel Montessori",
    version: "1.0",
    academicSessionId: "session-2026",
    sequenceConfigured: true,
  });
  createTeachingUnit(db, leader, programme.id, {
    sequenceOrder: 1,
    stageLabel: "Reception",
    unitLabel: "s a t p",
    grapheme: "s",
    phoneme: "/s/",
    gpcLabel: "s",
  });
  activateProgramme(db, leader, programme.id);
  const literacySupport = createLiteracySupportPlan(db, receptionTeacher, {
    studentId: "student-reception",
    classId: "reception",
    academicSessionId: "session-2026",
    termId: "term-first",
    programmeId: programme.id,
    identifiedNeed: "Needs extra oral blending rehearsal before independent decodable reading.",
    supportFocus: "Short daily oral blending practice using adopted SSP order.",
    reviewDate: "2026-10-18",
  });

  const area = createProvisionArea(db, receptionTeacher, {
    classId: "reception",
    academicSessionId: "session-2026",
    termId: "term-first",
    areaType: "READING",
    name: "Calm story and picture-choice area",
    purpose: "Support language participation and self-selection.",
  });
  const enhancement = createWeeklyEnhancement(db, receptionTeacher, {
    weeklyPlanId: receptionPlan.id,
    provisionAreaId: area.id,
    enhancementTitle: "Visual choice story prompt",
    purpose: "Support participation in story retelling.",
    accessAdjustments: "Choice cards, reduced group size, adult model first.",
  });
  const resource = createResource(db, receptionTeacher, {
    classId: "reception",
    name: "Story choice cards",
    category: "INCLUSION_ACCESS",
    provisionArea: "READING",
    quantity: 1,
    usableQuantity: 1,
    condition: "GOOD",
    purpose: "Visual language access.",
  });

  const before = {
    curriculum: curriculumHash(db),
    planning: planningHash(db),
    assessment: assessmentHash(db),
    literacy: literacyHash(db),
    sspSequence: sspSequenceHash(db),
    environment: environmentHash(db),
    finance: financeHash(db),
  };

  const profile = createSupportProfile(db, receptionTeacher, {
    studentId: "student-reception",
    classId: "reception",
    academicSessionId: "session-2026",
    supportLevel: "TARGETED",
    primaryConcernArea: "COMMUNICATION_LANGUAGE",
    strengths: "Curious, attentive to pictures, responds warmly to adult modelling.",
    interests: "Story baskets and picture cards.",
    whatHelps: "Visual choices, calm group size, adult modelling before turn-taking.",
    whatMakesParticipationDifficult: "Large groups and fast verbal instructions.",
    parentPerspective: "Parent reports Ayo enjoys naming pictures at home.",
    childVoice: "Points to preferred story cards.",
    homeLanguageInformation: "English and Yoruba are used at home.",
    nextReviewDate: "2026-10-30",
    visibility: "PARENT_VISIBLE",
  });
  assert.equal(profile.supportLevel, "TARGETED", "Support profile stores support level");
  assert.equal(profile.strengths.includes("Curious"), true, "Strengths are recorded before concerns");

  assertRejected(() => createSupportProfile(db, basicTeacher, {
    studentId: "student-basic",
    classId: "basic-1",
    strengths: "Basic pupil",
    supportLevel: "UNIVERSAL",
  }), /Early Years inclusion profiles/, "Basic pupils cannot receive EYFS inclusion profiles");
  assertRejected(() => createSupportProfile(db, unassignedTeacher, {
    studentId: "student-reception",
    classId: "reception",
    strengths: "Wrong teacher",
    supportLevel: "UNIVERSAL",
  }), /unassigned|access/i, "Unassigned teacher cannot create profile");
  assertRejected(() => createSupportProfile(db, parent, {
    studentId: "student-reception",
    strengths: "Parent edit",
  }), /Only authorised staff/, "Parent cannot create profile");

  const concern = createSupportConcern(db, receptionTeacher, {
    studentId: "student-reception",
    supportProfileId: profile.id,
    concernArea: "COMMUNICATION_LANGUAGE",
    context: "Small group story retelling",
    objectiveEvidence: "Ayo watched silently for three turns, then used two-word phrases after picture choices were offered.",
    durationOrPattern: "Repeated in two language group sessions.",
    strategiesAlreadyTried: "Reduced group size and visual choices.",
    impactOnParticipation: "Needs access support to participate in whole-group talk.",
    parentDiscussionStatus: "PLANNED",
    linkedObservationIds: [observation.id],
    status: "SUPPORT_REQUIRED",
    visibility: "TEACHING_TEAM",
  });
  assert.deepEqual(concern.linkedObservationIds, [observation.id], "Concern links to Phase 4 observation");
  assertRejected(() => createSupportConcern(db, receptionTeacher, {
    studentId: "student-reception",
    concernArea: "COMMUNICATION_LANGUAGE",
    context: "Label attempt",
    objectiveEvidence: "Teacher wrote that the child has autism because the child avoided a noisy group.",
  }), /Teacher observation is not diagnosis/, "Casual diagnostic labels are rejected");
  assertRejected(() => createSupportConcern(db, receptionTeacher, {
    studentId: "student-reception",
    concernArea: "BEHAVIOUR_SUPPORT",
    objectiveEvidence: "There is a safeguarding concern and immediate danger in this record.",
  }), /safeguarding procedure/i, "Safeguarding-only records are rejected from inclusion workflow");

  const privateConcern = createSupportConcern(db, leader, {
    studentId: "student-reception",
    concernArea: "SENSORY_ACCESS",
    objectiveEvidence: "Ayo covered ears during the fire alarm practice and moved closer to a familiar adult.",
    context: "Fire alarm practice",
    status: "MONITOR",
    visibility: "RESTRICTED",
  });
  assert.equal(getStudentInclusionProfile(db, leader, "student-reception").concerns.some((row) => row.id === privateConcern.id), true, "Leader can see restricted records");
  assert.equal(getStudentInclusionProfile(db, receptionTeacher, "student-reception").concerns.some((row) => row.id === privateConcern.id), false, "Teacher cannot see restricted records");

  const supportPlan = createSupportPlan(db, receptionTeacher, {
    studentId: "student-reception",
    supportProfileId: profile.id,
    academicSessionId: "session-2026",
    termId: "term-first",
    weeklyPlanId: receptionPlan.id,
    receptionLiteracySupportPlanId: literacySupport.id,
    provisionAreaId: area.id,
    environmentAdjustmentId: enhancement.id,
    resourceId: resource.id,
    priorityNeed: "Access to spoken instructions and group story participation.",
    desiredOutcome: "Ayo will participate in small-group story retelling using visual choices and adult modelling.",
    strategies: ["visual choices", "model first", "small group"],
    environmentAdjustments: "Use the calm story area and choice cards.",
    communicationStrategies: "Give wait time and model two-word phrases.",
    adultSupport: "Adult to sit nearby and prompt with cards.",
    resources: ["Story choice cards"],
    homeSupport: "Family can offer two picture choices during story time.",
    professionalAdvice: "Await external language advice if review shows limited progress.",
    parentContribution: "Parent will share preferred story themes from home.",
    reviewDate: "2026-10-18",
    status: "ACTIVE",
    visibility: "PARENT_VISIBLE",
  });
  assert.equal(supportPlan.weeklyPlanId, receptionPlan.id, "Support plan references Phase 3 weekly plan");
  assert.equal(supportPlan.receptionLiteracySupportPlanId, literacySupport.id, "Support plan references Phase 5 literacy support");
  assert.equal(supportPlan.environmentAdjustmentId, enhancement.id, "Support plan references Phase 6 environment adjustment");
  assertRejected(() => updateSupportPlan(db, parent, supportPlan.id, { desiredOutcome: "Parent edit" }), /Only authorised staff/, "Parent cannot edit support plan");

  const review = reviewSupportPlan(db, receptionTeacher, supportPlan.id, {
    whatWasImplemented: "Choice cards and adult model used daily.",
    whatChanged: "Ayo selected cards independently twice.",
    parentFeedback: "Parent saw more naming during home story time.",
    teacherJudgement: "Continue with adapted visual support.",
    outcome: "CLOSE",
    nextReviewDate: "2026-11-15",
  });
  assert.equal(review.plan.status, "COMPLETED", "Closed review completes plan");
  assert.equal(getStudentInclusionProfile(db, receptionTeacher, "student-reception").supportPlans.some((row) => row.id === supportPlan.id), true, "Completed plan remains retrievable");

  const referral = createReferralRecord(db, receptionTeacher, {
    studentId: "student-reception",
    supportProfileId: profile.id,
    referralType: "SPEECH_LANGUAGE",
    referredTo: "External language specialist",
    reason: "Request advice on supporting expressive language in school routines.",
    evidenceSummary: "Observation and support plan review show visual choices help participation.",
    parentAware: true,
    parentConsentStatus: "PENDING",
    status: "PROPOSED",
    visibility: "LEADERSHIP",
  });
  const consent = createConsentRecord(db, receptionTeacher, {
    studentId: "student-reception",
    relatedEntityType: "REFERRAL",
    relatedEntityId: referral.id,
    consentStatus: "GIVEN",
    purpose: "Parent consent to discuss language support advice.",
  });
  assert.equal(consent.relatedEntityId, referral.id, "Consent links to referral");
  updateReferralRecord(db, leader, referral.id, {
    status: "ADVICE_RECEIVED",
    parentConsentStatus: "GIVEN",
    professionalAdvice: "Use shorter spoken instructions, visual support, and review after four weeks.",
    schoolAction: "Share strategy with teaching team.",
  });
  assertRejected(() => createReferralRecord(db, receptionTeacher, {
    studentId: "student-reception",
    referralType: "OTHER",
    referredTo: "Clinic",
    reason: "Teacher believes this is ADHD based on attention in one lesson.",
  }), /Teacher observation is not diagnosis/, "Referral cannot store casual diagnostic labels");

  const concernCountBeforeLanguages = db.earlyYearsSupportConcerns.length;
  const familyProfile = updateParentPartnershipProfile(db, receptionTeacher, "student-reception", {
    preferredContactMethod: "WhatsApp and phone",
    preferredCommunicationLanguage: "English",
    homeLanguages: "Yoruba, English",
    languagesUnderstood: "Yoruba, English",
    languagesSpoken: "English",
    interpreterSupportNeeds: "",
    parentPriorities: "Help Ayo speak confidently with classmates.",
    familyStrengths: "Family reads picture books together.",
    agreedActions: "Home and school will use picture choices.",
  });
  assert.deepEqual(familyProfile.homeLanguages, ["Yoruba", "English"], "Home languages are recorded");
  assert.equal(db.earlyYearsSupportConcerns.length, concernCountBeforeLanguages, "Multilingualism alone does not create a SEND concern");

  const meeting = createParentMeeting(db, receptionTeacher, {
    studentId: "student-reception",
    academicSessionId: "session-2026",
    termId: "term-first",
    meetingType: "SUPPORT_REVIEW",
    purpose: "Review communication access support.",
    childStrengths: profile.strengths,
    parentViews: "Parent agrees picture choices are helpful.",
    teacherViews: "Ayo is more confident when instructions are chunked.",
    agreedActions: "Use visual choices at school and home.",
    schoolActions: "Prepare story cards weekly.",
    parentActions: "Offer two story choices at home.",
    togetherActions: "Review progress in four weeks.",
    parentVisibleSummary: "We agreed to use picture choices and short instructions to support story participation.",
    restrictedNotes: "Leadership-only note must not be exposed to parent API.",
    reviewDate: "2026-11-15",
    visibility: "PARENT_VISIBLE",
  });
  createParentSupportSummary(db, receptionTeacher, {
    studentId: "student-reception",
    strengths: profile.strengths,
    currentFocus: supportPlan.priorityNeed,
    agreedSchoolSupport: "Visual choices and small-group modelling.",
    agreedFamilySupport: "Story choices at home.",
    reviewDate: "2026-11-15",
  });
  updateParentMeeting(db, parent, meeting.id, { parentComment: "We agree and will continue the story cards at home." });
  const parentView = getStudentInclusionProfile(db, parent, "student-reception");
  assert.equal(parentView.meetings.some((row) => row.parentComment.includes("story cards")), true, "Parent can acknowledge/comment on parent-visible meeting");
  assert.equal("restrictedNotes" in parentView.meetings.find((row) => row.id === meeting.id), false, "Parent-visible meeting excludes restricted notes");
  assert.equal("professionalAdvice" in parentView.supportPlans.find((row) => row.id === supportPlan.id), false, "Parent-visible support plan excludes restricted professional notes");
  assertRejected(() => getStudentInclusionProfile(db, parent, "student-nursery"), /own child/, "Parent cannot access another child");
  assertRejected(() => getStudentInclusionProfile(db, studentUser, "student-reception"), /Student access/, "Student users are blocked from inclusion profiles");

  const crecheTransition = createTransitionPlan(db, crecheTeacher, {
    studentId: "student-creche",
    receivingClass: "nursery",
    transitionDate: "2026-09-10",
    strengths: "Settles with familiar adult and practical-life routine.",
    routinesThatHelp: "Arrival object and first-then picture.",
    supportStrategies: "arrival object, short routine",
    status: "ACTIVE",
  });
  const nurseryTransition = createTransitionPlan(db, nurseryTeacher, {
    studentId: "student-nursery",
    receivingClass: "reception",
    transitionDate: "2026-09-10",
    strengths: "Uses role-play language confidently.",
    routinesThatHelp: "Preview timetable and partner play.",
    supportStrategies: "visual timetable, partner play",
    status: "ACTIVE",
  });
  const receptionTransition = createTransitionPlan(db, receptionTeacher, {
    studentId: "student-reception",
    receivingClass: "basic-1",
    transitionDate: "2026-09-10",
    strengths: profile.strengths,
    routinesThatHelp: "Picture choices and short instructions.",
    supportStrategies: "visual choices, model first, short instructions",
    parentInput: "Parent wants picture choices continued at first.",
    receivingTeacherNotes: "Continue access strategies and review after two weeks.",
    reviewAfterTransition: "2026-09-24",
    status: "HANDED_OVER",
  });
  assert.equal(crecheTransition.receivingClassId, "nursery", "Creche to Nursery transition is supported");
  assert.equal(nurseryTransition.receivingClassId, "reception", "Nursery to Reception transition is supported");
  assert.equal(receptionTransition.receivingClassId, "basic-1", "Reception to Basic 1 transition is supported");

  const strategy = createSupportStrategy(db, leader, {
    name: "Visual choices before verbal response",
    concernAreas: "COMMUNICATION_LANGUAGE, HOME_LANGUAGE_ACCESS",
    description: "Offer two clear picture choices before asking a child to respond verbally.",
    classroomUse: "Use picture cards and model phrase first.",
    homeUse: "Use familiar story pictures at home.",
  });
  assert.equal(strategy.isActive, true, "Leader can create shared strategy template");
  assertRejected(() => createSupportStrategy(db, receptionTeacher, { name: "Teacher template" }), /Only academic leadership/, "Teachers cannot manage shared strategy library");

  const staffDashboard = getInclusionDashboard(db, receptionTeacher, { classId: "reception" });
  const leaderDashboard = getInclusionDashboard(db, leader, {});
  const parentDashboard = getInclusionDashboard(db, parent, {});
  assert.equal(staffDashboard.students.length, 1, "Teacher dashboard is scoped to assigned children");
  assert.equal(leaderDashboard.students.length >= 3, true, "Leader can see authorised EYFS children");
  assert.equal(parentDashboard.students.length, 1, "Parent dashboard is scoped to own child");
  assert.equal(parentDashboard.meetings.some((row) => row.id === meeting.id), true, "Parent dashboard includes parent-visible meetings");
  assert.equal(parentDashboard.referrals.some((row) => row.id === referral.id), false, "Parent dashboard excludes leadership-only referral records");

  const supportPlanHtml = buildSupportPlanPrintHtml(supportPlan, profile);
  const meetingHtml = buildParentMeetingPrintHtml(meeting);
  const transitionHtml = buildTransitionPrintHtml(receptionTransition);
  assert.match(supportPlanHtml, /Early Years Support Plan/, "Support plan print view renders");
  assert.match(meetingHtml, /Parent Partnership Meeting Summary/, "Parent meeting print view renders");
  assert.match(transitionHtml, /Transition Support Summary/, "Transition print view renders");
  assert.equal(meetingHtml.includes("Leadership-only note"), false, "Meeting print excludes restricted staff-only notes");

  const storedText = JSON.stringify({
    profiles: db.earlyYearsSupportProfiles,
    concerns: db.earlyYearsSupportConcerns,
    plans: db.earlyYearsSupportPlans,
    meetings: db.earlyYearsParentPartnershipMeetings,
    transitions: db.earlyYearsTransitionSupportPlans,
  }).toLowerCase();
  assert.equal(/percentage|ranking|ranked|grade average|autism|adhd|dyslexia|probability/.test(storedText), false, "Inclusion records contain no grades, rankings, casual diagnoses, or probability labels");

  const after = {
    curriculum: curriculumHash(db),
    planning: planningHash(db),
    assessment: assessmentHash(db),
    literacy: literacyHash(db),
    sspSequence: sspSequenceHash(db),
    environment: environmentHash(db),
    finance: financeHash(db),
  };

  assert.equal(db.curriculumWeeks.length, 117, "Curriculum record count remains 117");
  assert.equal(after.curriculum, before.curriculum, "Phase 1 curriculum records unchanged by Phase 7");
  assert.equal(after.planning, before.planning, "Phase 3 planning records unchanged by Phase 7");
  assert.equal(after.assessment, before.assessment, "Phase 4 assessment records unchanged by Phase 7");
  assert.equal(after.literacy, before.literacy, "Phase 5 literacy records unchanged by Phase 7");
  assert.equal(after.sspSequence, before.sspSequence, "Phase 5 SSP teaching sequence unchanged by Phase 7");
  assert.equal(after.environment, before.environment, "Phase 6 environment records unchanged by Phase 7");
  assert.equal(after.finance, before.finance, "Finance records unchanged by Phase 7");

  console.log("Early Years Inclusion Phase 7 smoke test passed");
  console.log("Curriculum weeks:", db.curriculumWeeks.length);
  console.log("Curriculum mutations:", after.curriculum === before.curriculum ? 0 : 1);
  console.log("SSP sequence unchanged:", after.sspSequence === before.sspSequence);
}

main();
