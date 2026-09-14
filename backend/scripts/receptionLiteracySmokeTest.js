#!/usr/bin/env node

const assert = require("assert/strict");
const crypto = require("crypto");
const path = require("path");
const { ensureAcademicSystemShape } = require("../lib/academicSystems");
const { importCurriculumFile, listCurriculum, seedDirectory } = require("../lib/earlyYearsCurriculum");
const { createWeeklyPlanFromCurriculum, ensureEarlyYearsPlanningShape, updateWeeklyPlan } = require("../lib/earlyYearsPlanning");
const { createObservation, ensureEarlyYearsAssessmentShape } = require("../lib/earlyYearsAssessment");
const {
  activateProgramme,
  createDecodableBook,
  createHomeReadingRecord,
  createLiteracySummary,
  createParentUpdate,
  createPhonicsProgress,
  createProgramme,
  createReadingRecord,
  createSupportPlan,
  createTeachingUnit,
  createWritingRecord,
  ensureEarlyYearsLiteracyShape,
  getClassLiteracyOverview,
  getStudentLiteracyProfile,
  getTransitionSnapshot,
  listPhonicsProgress,
  listProgrammeSequence,
  listReadingRecords,
  listReceptionStudents,
  listSupportPlans,
  listWritingRecords,
  productionSequenceAudit,
  updateProgramme,
  updateSupportPlan,
} = require("../lib/earlyYearsLiteracy");

function hash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function curriculumHash(db) {
  return hash({ terms: db.curriculumTerms, weeks: db.curriculumWeeks, items: db.curriculumItems });
}

function weeklyPlanHash(db) {
  return hash({ plans: db.curriculumTeacherPlans, daily: db.curriculumDailyTeachingRecords, reviews: db.curriculumWeeklyPlanReviews });
}

function assessmentHash(db) {
  return hash({ observations: db.earlyYearsObservations, journals: db.earlyYearsLearningJournalEntries });
}

function seedDb() {
  const db = {
    users: [
      { id: "leader-1", name: "Academic Leader", username: "leader", role: "ACADEMIC_OFFICER" },
      { id: "teacher-reception", name: "Reception Teacher", username: "teacher.reception", role: "TEACHER" },
      { id: "teacher-nursery", name: "Nursery Teacher", username: "teacher.nursery", role: "TEACHER" },
      { id: "teacher-creche", name: "Creche Teacher", username: "teacher.creche", role: "TEACHER" },
      { id: "teacher-basic", name: "Basic Teacher", username: "teacher.basic", role: "TEACHER" },
      { id: "teacher-unassigned", name: "Unassigned Teacher", username: "teacher.unassigned", role: "TEACHER" },
      { id: "parent-reception", name: "Reception Parent", username: "parent.reception", role: "PARENT", studentIds: ["student-reception"] },
      { id: "student-user", name: "Student User", username: "student", role: "STUDENT" },
    ],
    classes: [],
    students: [
      { id: "student-reception", name: "Ayo Reception", classId: "reception", className: "Reception" },
      { id: "student-reception-2", name: "Bisi Reception", classId: "reception", className: "Reception" },
      { id: "student-nursery", name: "Nina Nursery", classId: "nursery", className: "Nursery" },
      { id: "student-creche", name: "Cole Creche", classId: "creche", className: "Creche" },
      { id: "student-basic", name: "Bayo Basic", classId: "basic-1", className: "Basic 1" },
    ],
    academicSessions: [{ id: "session-2026", sessionName: "2026/2027", isActive: true }],
    terms: [{ id: "term-first", sessionId: "session-2026", termName: "First Term", isActive: true }],
  };
  ensureAcademicSystemShape(db);
  db.classes = db.classes.map((row) => {
    if (row.id === "reception") return { ...row, teacherId: "teacher-reception" };
    if (row.id === "nursery") return { ...row, teacherId: "teacher-nursery" };
    if (row.id === "creche") return { ...row, teacherId: "teacher-creche" };
    if (row.id === "basic-1") return { ...row, teacherId: "teacher-basic" };
    return row;
  });
  ensureEarlyYearsPlanningShape(db);
  ensureEarlyYearsAssessmentShape(db);
  ensureEarlyYearsLiteracyShape(db);
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

function firstReceptionWeek(db, user) {
  const view = listCurriculum(db, { classId: "reception", termName: "First Term" }, user);
  assert.equal(view.weeks.length, 13);
  return view.weeks[0];
}

function createReceptionPlan(db, week, teacher) {
  const result = createWeeklyPlanFromCurriculum(db, week.id, teacher, { sessionId: "session-2026", termId: "term-first" });
  return updateWeeklyPlan(db, result.plan.id, teacher, {
    weeklyPriorities: "TEST ONLY weekly plan references configured phonics without editing programme sequence.",
    phonicsImplementation: {
      programmePoint: "TEST ONLY Unit 1",
      reviewFocus: "Review taught unit only.",
      blendingFocus: "Blend with taught code only.",
      segmentingFocus: "Segment with taught code only.",
      decodableReadingFocus: "Use matched text where configured.",
    },
  });
}

function main() {
  const db = seedDb();
  const [leader, receptionTeacher, nurseryTeacher, crecheTeacher, basicTeacher, unassignedTeacher, parent, studentUser] = db.users;
  importApprovedSeeds(db, leader);
  const beforeCurriculum = curriculumHash(db);

  const initialAudit = productionSequenceAudit(db);
  assert.deepEqual(initialAudit, {
    configuredSspProgramme: "NO",
    productionGpcSequence: "EMPTY",
    inventedPlaceholderGpcs: 0,
    productionSequenceCount: 0,
  }, "No production SSP programme or GPC sequence should exist by default");

  const programme = createProgramme(db, leader, {
    name: "TEST ONLY SSP Programme",
    provider: "TEST ONLY Provider",
    version: "TEST ONLY v1",
    academicSessionId: "session-2026",
    programmeReference: "TEST ONLY source supplied inside smoke test only",
  });
  assert.equal(programme.status, "DRAFT");
  assert.throws(
    () => activateProgramme(db, receptionTeacher, programme.id),
    /Only authorised academic leadership/,
    "Teacher cannot activate programme"
  );
  assert.throws(
    () => activateProgramme(db, leader, programme.id),
    /approved teaching sequence/,
    "Programme cannot activate without configured sequence"
  );

  const unit2 = createTeachingUnit(db, leader, programme.id, {
    sequenceOrder: 2,
    stageLabel: "TEST ONLY Stage",
    unitLabel: "TEST ONLY Unit 2",
    grapheme: "TEST-GRAPHEME-2",
    phoneme: "TEST-PHONEME-2",
    gpcLabel: "TEST ONLY GPC 2",
    exampleWords: "TEST ONLY word",
  });
  const unit1 = createTeachingUnit(db, leader, programme.id, {
    sequenceOrder: 1,
    stageLabel: "TEST ONLY Stage",
    unitLabel: "TEST ONLY Unit 1",
    grapheme: "TEST-GRAPHEME-1",
    phoneme: "TEST-PHONEME-1",
    gpcLabel: "TEST ONLY GPC 1",
    reviewOf: "TEST ONLY prior oral blending",
  });
  assert.deepEqual(listProgrammeSequence(db, programme.id).map((unit) => unit.id), [unit1.id, unit2.id], "Programme sequence order should be preserved");
  const active = activateProgramme(db, leader, programme.id);
  assert.equal(active.status, "ACTIVE");
  assert.throws(
    () => createTeachingUnit(db, leader, programme.id, { sequenceOrder: 3, unitLabel: "Should fail" }),
    /protected/,
    "Active programme sequence must be protected"
  );
  assert.throws(
    () => updateProgramme(db, leader, programme.id, { name: "Edited active programme" }),
    /protected/,
    "Active programme must be protected"
  );

  const version2 = createProgramme(db, leader, { name: "TEST ONLY SSP Programme", version: "TEST ONLY v2", academicSessionId: "session-2027" });
  assert.equal(version2.status, "DRAFT", "Future programme versions remain separate");

  const week = firstReceptionWeek(db, receptionTeacher);
  const receptionPlan = createReceptionPlan(db, week, receptionTeacher);
  const beforePlans = weeklyPlanHash(db);
  const beforeAssessment = assessmentHash(db);

  assert.equal(listReceptionStudents(db, receptionTeacher).length, 2, "Reception teacher should view assigned Reception children");
  assert.equal(listReceptionStudents(db, nurseryTeacher).length, 0, "Nursery teacher should not see formal Reception tracker children");
  assert.equal(listReceptionStudents(db, crecheTeacher).length, 0, "Creche teacher should not see formal Reception tracker children");

  assert.throws(
    () => createPhonicsProgress(db, unassignedTeacher, { studentId: "student-reception", programmeId: programme.id, teachingUnitId: unit1.id }),
    /unassigned|access/,
    "Unassigned teacher rejected"
  );
  assert.throws(
    () => createPhonicsProgress(db, nurseryTeacher, { studentId: "student-nursery", programmeId: programme.id, teachingUnitId: unit1.id }),
    /Reception/,
    "Nursery cannot use formal Reception SSP tracker"
  );
  assert.throws(
    () => createPhonicsProgress(db, crecheTeacher, { studentId: "student-creche", programmeId: programme.id, teachingUnitId: unit1.id }),
    /Reception/,
    "Creche cannot use formal Reception SSP tracker"
  );
  assert.throws(
    () => createPhonicsProgress(db, basicTeacher, { studentId: "student-basic", programmeId: programme.id, teachingUnitId: unit1.id }),
    /Reception|Early Years/,
    "Basic/JSS/SS blocked"
  );

  const phase4Observation = createObservation(db, receptionTeacher, {
    studentId: "student-reception",
    classId: "reception",
    academicSessionId: "session-2026",
    termId: "term-first",
    observationDate: "2026-09-17",
    observationType: "FOCUSED_CHECK",
    context: "TEST ONLY literacy observation",
    eyfsArea: "LITERACY",
    objectiveObservation: "TEST ONLY factual literacy observation.",
    interpretation: "TEST ONLY teacher interpretation.",
    developmentalDescriptor: "EMERGING",
  });

  const progress = createPhonicsProgress(db, receptionTeacher, {
    studentId: "student-reception",
    classId: "reception",
    academicSessionId: "session-2026",
    termId: "term-first",
    programmeId: programme.id,
    teachingUnitId: unit1.id,
    assessmentDate: "2026-09-18",
    gpcRecognition: "TAUGHT",
    blending: "DEVELOPING",
    segmenting: "REQUIRES_SUPPORT",
    applicationInReading: "DEVELOPING",
    applicationInWriting: "REVIEW_REQUIRED",
    descriptor: "DEVELOPING",
    teacherNote: "TEST ONLY phonics note.",
    nextAction: "Keep-up practice with taught code.",
    weeklyPlanId: receptionPlan.id,
    evidenceObservationId: phase4Observation.id,
    includeInJournal: true,
  });
  assert.equal(progress.curriculumWeekId, receptionPlan.curriculumWeekId, "Progress can link to weekly plan and curriculum week");
  assert.equal(progress.linkedJournalEntryId.length > 0, true, "Phase 5 evidence can be selected for Learning Journal");
  assert.equal(db.earlyYearsObservations.find((row) => row.id === phase4Observation.id).developmentalDescriptor, "EMERGING", "Phase 5 does not overwrite Phase 4 descriptor automatically");

  const notYetTaught = createPhonicsProgress(db, receptionTeacher, {
    studentId: "student-reception-2",
    classId: "reception",
    programmeId: programme.id,
    teachingUnitId: unit2.id,
    gpcRecognition: "NOT_YET_TAUGHT",
    blending: "NOT_YET_TAUGHT",
    segmenting: "NOT_YET_TAUGHT",
    applicationInReading: "NOT_YET_TAUGHT",
    applicationInWriting: "NOT_YET_TAUGHT",
    teacherNote: "Not yet taught is a neutral pre-teaching state.",
  });
  assert.equal(/fail|weak|poor/.test(JSON.stringify(notYetTaught).toLowerCase()), false, "NOT_YET_TAUGHT is not treated as a negative label");
  assert.equal(listPhonicsProgress(db, receptionTeacher, { studentId: "student-reception" }).length, 1);

  const decodableReading = createReadingRecord(db, receptionTeacher, {
    studentId: "student-reception",
    classId: "reception",
    programmeId: programme.id,
    textType: "DECODABLE",
    bookTitle: "TEST ONLY Manual Decodable",
    dateRead: "2026-09-19",
    accuracyNote: "Read taught-code words with support.",
    blendingNote: "Blended with adult prompt.",
    fluencyNote: "Developing phrasing.",
    comprehensionNote: "Retold the main event.",
    vocabulary: "Discussed new story words.",
    confidenceNote: "Growing confidence.",
    reviewAction: "Revisit taught unit.",
    parentVisible: true,
  });
  assert.equal(decodableReading.textType, "DECODABLE");
  const richReading = createReadingRecord(db, receptionTeacher, {
    studentId: "student-reception",
    classId: "reception",
    textType: "RICH_LITERATURE",
    textTitle: "TEST ONLY Rich Story",
    comprehensionNote: "Discussed character feelings.",
    vocabulary: "New descriptive words.",
    parentVisible: false,
  });
  assert.equal(richReading.textType, "RICH_LITERATURE");
  assert.equal(db.earlyYearsDecodableBooks.length, 0, "Book sequence is not invented by reading records");
  assert.equal(listReadingRecords(db, parent, { studentId: "student-reception" }).length, 1, "Parent sees only published reading information");

  const writing = createWritingRecord(db, receptionTeacher, {
    studentId: "student-reception",
    classId: "reception",
    programmeId: programme.id,
    oralComposition: "Said sentence before writing.",
    segmenting: "Segmented initial sound with support.",
    graphemeSelection: "Selected taught grapheme.",
    letterFormation: "Developing orientation.",
    sentenceConstruction: "Wrote a simple label.",
    writingForPurpose: "Labelled a picture for meaning.",
    teacherComment: "Writing evidence covers SAY IT - BUILD IT - WRITE IT - READ IT BACK.",
    nextPriority: "Reread writing with adult prompt.",
    includeInJournal: true,
  });
  assert.equal(writing.linkedJournalEntryId.length > 0, true, "Writing record links to Learning Journal where selected");

  const support = createSupportPlan(db, receptionTeacher, {
    studentId: "student-reception",
    classId: "reception",
    programmeId: programme.id,
    programmePoint: "TEST ONLY GPC 1",
    identifiedNeed: "Review blending with taught code.",
    supportFocus: "Keep-up support for blending.",
    startDate: "2026-09-20",
    reviewDate: "2026-09-27",
    frequency: "Short daily practice",
    strategy: "Use taught-code cards and oral blending.",
    status: "PLANNED",
  });
  updateSupportPlan(db, receptionTeacher, support.id, { status: "ACTIVE", reviewOutcome: "Practice started." });
  updateSupportPlan(db, receptionTeacher, support.id, { status: "COMPLETED", reviewOutcome: "Historical completed support retained." });
  assert.equal(listSupportPlans(db, receptionTeacher, { studentId: "student-reception" })[0].status, "COMPLETED");
  assert.equal(JSON.stringify(db.earlyYearsLiteracySupportPlans).toLowerCase().includes("weak"), false, "Support uses no punitive labels");

  createLiteracySummary(db, receptionTeacher, {
    studentId: "student-reception",
    classId: "reception",
    summaryType: "TERMLY",
    phonicsSummary: "Developing with taught code.",
    readingSummary: "Decodable reading is developing.",
    comprehensionSummary: "Retells familiar stories.",
    writingSummary: "Beginning to apply taught code in writing.",
    strengths: "Confidence and oral composition.",
    currentPriorities: "Blend and reread.",
    support: "Keep-up support active historically.",
    nextSteps: "Continue taught-code application.",
    parentVisible: true,
  });
  createParentUpdate(db, receptionTeacher, {
    studentId: "student-reception",
    classId: "reception",
    currentLiteracyFocus: "Practise taught TEST ONLY GPC 1.",
    readingComment: "Use only school-approved home reading guidance.",
    suggestedHomePractice: "Short oral blending game with taught content.",
    teacherMessage: "Thank you for keeping practice calm and short.",
  });
  createHomeReadingRecord(db, parent, {
    studentId: "student-reception",
    book: "TEST ONLY Home Reader",
    parentComment: "Read calmly at home.",
    readingCompleted: true,
  });

  const profile = getStudentLiteracyProfile(db, receptionTeacher, "student-reception");
  assert.equal(profile.currentProgramme.name, "TEST ONLY SSP Programme");
  assert.equal(profile.readingFluency, "Developing phrasing.");
  assert.equal(profile.writing.teacherComment.includes("SAY IT"), true);
  assert.equal(JSON.stringify(profile).includes("percentage"), false, "No percentage score in literacy profile");
  assert.equal(JSON.stringify(profile).includes("rank"), false, "No ranking in literacy profile");

  const overview = getClassLiteracyOverview(db, leader, "reception");
  assert.equal(Object.prototype.hasOwnProperty.call(overview.summary, "NO_RECENT_EVIDENCE"), true);
  assert.equal(JSON.stringify(overview).toLowerCase().includes("bottom"), false, "Class overview does not rank or label children");

  const transition = getTransitionSnapshot(db, receptionTeacher, "student-reception");
  assert.equal(transition.note.includes("continuity"), true, "Transition architecture is prepared without final transition engine");

  const sequenceBeforePlanEdit = hash(listProgrammeSequence(db, programme.id));
  updateWeeklyPlan(db, receptionPlan.id, receptionTeacher, {
    phonicsImplementation: { programmePoint: "Teacher note changed only", reviewFocus: "Review", blendingFocus: "Blend", segmentingFocus: "Segment", decodableReadingFocus: "Read" },
  });
  assert.equal(hash(listProgrammeSequence(db, programme.id)), sequenceBeforePlanEdit, "Weekly plan cannot modify programme sequence");

  createDecodableBook(db, leader, version2.id, {
    title: "TEST ONLY Future Book",
    code: "TEST-BOOK",
    programmeStage: "TEST ONLY stage",
    sequenceOrder: 1,
  });
  assert.equal(db.earlyYearsDecodableBooks.length, 1, "Leadership can configure decodable books for a draft programme");

  assert.throws(
    () => getStudentLiteracyProfile(db, studentUser, "student-reception"),
    /not enabled|access/,
    "Student access blocked"
  );

  assert.equal(curriculumHash(db), beforeCurriculum, "Phase 5 must not mutate 117 approved curriculum records");
  assert.equal(db.curriculumWeeks.length, 117, "117 approved curriculum weeks should remain present");
  assert.notEqual(weeklyPlanHash(db), beforePlans, "The test intentionally updated the weekly plan's teacher note");
  assert.equal(hash(listProgrammeSequence(db, programme.id)), sequenceBeforePlanEdit, "Programme sequence remains protected after weekly-plan integration");
  assert.notEqual(assessmentHash(db), beforeAssessment, "The test intentionally linked Phase 5 evidence to Phase 4 journal/observation");

  const audit = productionSequenceAudit({ earlyYearsPhonicsProgrammes: [], earlyYearsPhonicsTeachingUnits: [] });
  assert.equal(audit.configuredSspProgramme, "NO");
  assert.equal(audit.productionGpcSequence, "EMPTY");
  assert.equal(audit.inventedPlaceholderGpcs, 0);

  console.log("Reception Literacy Phase 5 smoke test passed.");
  console.log("Verified: programme configuration, protected active sequence, no invented production sequence, Reception-only tracker, phonics, blending, segmenting, reading, writing, keep-up support, Phase 4 integration, weekly-plan reference, parent visibility, privacy, and unchanged 117-week curriculum.");
}

main();
