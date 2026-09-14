const { randomUUID, createHash } = require("crypto");
const { ensureAcademicSystemShape, getApprovedClassConfig, normalizeAcademicKey } = require("./academicSystems");
const {
  ensureEarlyYearsCurriculumShape,
  listAccessibleEarlyYearsClasses,
  listCurriculum,
  teacherAssignedClassIds,
  str: curriculumStr,
} = require("./earlyYearsCurriculum");
const { ensureEarlyYearsPlanningShape, listWeeklyPlans } = require("./earlyYearsPlanning");
const {
  ensureEarlyYearsAssessmentShape,
  evidenceCoverageCheck,
  listAccessibleStudents,
  listJournalEntries,
  listNextSteps,
  listObservations,
} = require("./earlyYearsAssessment");
const { ensureEarlyYearsLiteracyShape, listReceptionStudents, productionSequenceAudit } = require("./earlyYearsLiteracy");
const { ensureEarlyYearsEnvironmentShape, listEnvironmentActions, listEnvironmentChecklists } = require("./earlyYearsEnvironment");
const { ensureEarlyYearsInclusionShape, listAccessibleEarlyYearsStudents } = require("./earlyYearsInclusion");
const {
  ELG_REFERENCE_WORDING,
  ensureEarlyYearsReportingShape,
  listReceptionTransitions,
  listReports,
  reportDashboard,
} = require("./earlyYearsReporting");

const LEADER_ROLES = ["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER", "HEAD_OF_SCHOOL", "PROPRIETOR"];
const QA_ROLES = [...LEADER_ROLES, "TEACHER"];
const QA_CYCLE = ["REVIEW", "IDENTIFY", "SUPPORT", "FOLLOW_UP", "IMPROVE", "EMBED"];
const QA_MODULES = [
  "CURRICULUM",
  "PLANNING",
  "ASSESSMENT",
  "JOURNAL",
  "LITERACY",
  "ENVIRONMENT",
  "INCLUSION",
  "PARENT_PARTNERSHIP",
  "REPORTING",
  "TRANSITION",
  "DATA_QUALITY",
  "SYSTEM_HEALTH",
];
const QA_SEVERITIES = ["INFO", "REVIEW", "ACTION_REQUIRED", "CRITICAL"];
const QA_ACTION_STATUSES = ["OPEN", "IN_PROGRESS", "COMPLETED", "CLOSED"];
const QA_ACTION_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"];
const QA_MODERATION_STATUSES = ["SELECTED_FOR_REVIEW", "UNDER_REVIEW", "AGREED", "DISCUSSION_REQUIRED", "COMPLETED"];
const FORBIDDEN_QA_TERMS = [
  "league table",
  "leaderboard",
  "rank",
  "ranking",
  "top teacher",
  "best teacher",
  "worst teacher",
  "lowest teacher",
  "weakest teacher",
  "top class",
  "best class",
  "worst class",
  "lowest class",
  "weakest class",
  "child performance score",
  "teacher performance score",
  "eyfs percentage",
  "percent score",
  "competition",
];

function nowIso() {
  return new Date().toISOString();
}

function randomId(prefix) {
  return `${prefix}-${randomUUID()}`;
}

function arr(value) {
  return Array.isArray(value) ? value : [];
}

function str(value) {
  return curriculumStr ? curriculumStr(value) : String(value || "").trim();
}

function roleOf(user = {}) {
  return str(user.role || user.originalRole).toUpperCase();
}

function isLeader(user = {}) {
  return LEADER_ROLES.includes(roleOf(user));
}

function error(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function normalizeEnum(value, allowed, fallback) {
  const key = str(value || fallback).toUpperCase();
  return allowed.includes(key) ? key : fallback;
}

function textList(value) {
  if (Array.isArray(value)) return value.map((item) => str(item)).filter(Boolean);
  return str(value).split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);
}

function hash(value) {
  return createHash("sha256").update(JSON.stringify(value || null)).digest("hex");
}

function lowerBag(body = {}) {
  return Object.values(body)
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .map((value) => typeof value === "string" ? value.toLowerCase() : "")
    .filter(Boolean)
    .join(" ");
}

function assertNoCompetitiveLanguage(body = {}) {
  const bag = lowerBag(body);
  const found = FORBIDDEN_QA_TERMS.find((term) => bag.includes(term));
  if (found) {
    throw error(400, `Quality assurance records must avoid rankings, scores, league tables, and competition language. Please remove "${found}".`);
  }
}

function ensureArray(db, key) {
  if (!Array.isArray(db[key])) {
    db[key] = [];
    return true;
  }
  return false;
}

function ensureEarlyYearsQAShape(db) {
  let mutated = false;
  if (ensureAcademicSystemShape(db)?.mutated) mutated = true;
  for (const ensure of [
    ensureEarlyYearsCurriculumShape,
    ensureEarlyYearsPlanningShape,
    ensureEarlyYearsAssessmentShape,
    ensureEarlyYearsLiteracyShape,
    ensureEarlyYearsEnvironmentShape,
    ensureEarlyYearsInclusionShape,
    ensureEarlyYearsReportingShape,
  ]) {
    const result = ensure(db) || {};
    if (result.mutated) mutated = true;
  }
  [
    "earlyYearsQAActions",
    "earlyYearsQAModerationRecords",
    "earlyYearsQALeadershipNotes",
    "earlyYearsQAEnvironmentWalks",
    "earlyYearsQAAuditLogs",
    "earlyYearsQAAuditRuns",
    "earlyYearsQAMilestones",
  ].forEach((key) => {
    if (ensureArray(db, key)) mutated = true;
  });
  if (arr(db.earlyYearsQAMilestones).length === 0) {
    db.earlyYearsQAMilestones.push(
      { id: "qa-milestone-weekly-plan", module: "PLANNING", title: "Weekly plans submitted", cadence: "WEEKLY", dueOffsetDays: 0, isActive: true },
      { id: "qa-milestone-weekly-review", module: "CURRICULUM", title: "Weekly curriculum review completed", cadence: "WEEKLY", dueOffsetDays: 5, isActive: true },
      { id: "qa-milestone-development-summary", module: "ASSESSMENT", title: "Development summaries reviewed", cadence: "TERM", dueOffsetDays: 0, isActive: true },
      { id: "qa-milestone-reception-literacy", module: "LITERACY", title: "Reception literacy reviews completed", cadence: "FORTNIGHT", dueOffsetDays: 0, isActive: true },
      { id: "qa-milestone-report-approval", module: "REPORTING", title: "Reports reviewed before publication", cadence: "TERM", dueOffsetDays: 0, isActive: true }
    );
    mutated = true;
  }
  return { mutated };
}

function appendQAAuditLog(db, actor = {}, action = "", details = {}) {
  db.earlyYearsQAAuditLogs.push({
    id: randomId("ey-qa-log"),
    action: str(action),
    actorId: str(actor.id),
    actorName: str(actor.name || actor.username),
    actorRole: roleOf(actor),
    details,
    createdAt: nowIso(),
  });
}

function classConfig(ref) {
  return getApprovedClassConfig(ref);
}

function classKey(ref) {
  const config = classConfig(ref);
  return config?.id || normalizeAcademicKey(ref);
}

function classNameOf(ref) {
  const config = classConfig(ref);
  return config?.name || str(ref);
}

function isEarlyYearsClassRef(ref) {
  const config = classConfig(ref);
  return config?.level === "EARLY_YEARS" || ["creche", "nursery", "reception"].includes(classKey(ref));
}

function classRefOfStudent(student = {}) {
  return str(student.classId || student.currentClassId || student.className || student.currentClass || student.class);
}

function classMatches(value, classRef) {
  if (!classRef) return true;
  return classKey(value) === classKey(classRef);
}

function teacherCanAccessClass(db, user, classRef) {
  if (isLeader(user)) return true;
  const allowed = new Set(teacherAssignedClassIds(db, user).map(classKey));
  return allowed.has(classKey(classRef));
}

function filterByScope(row = {}, filters = {}) {
  if (filters.academicSessionId && ![row.academicSessionId, row.sessionId].map(str).includes(str(filters.academicSessionId))) return false;
  if (filters.termId && ![row.termId, row.curriculumTermId, row.termName].map(str).includes(str(filters.termId))) return false;
  if (filters.classId && !classMatches(row.classId || row.className || row.classLevelCode, filters.classId)) return false;
  if (filters.teacherId && str(row.teacherId || row.teacherUserId || row.createdBy) !== str(filters.teacherId)) return false;
  if (filters.status && str(row.status || row.planStatus || row.overallStatus).toUpperCase() !== str(filters.status).toUpperCase()) return false;
  const date = str(row.date || row.createdAt || row.updatedAt || row.submittedAt || row.reviewDate);
  if (filters.fromDate && date && date.slice(0, 10) < str(filters.fromDate)) return false;
  if (filters.toDate && date && date.slice(0, 10) > str(filters.toDate)) return false;
  return true;
}

function accessibleClasses(db, user) {
  if (!QA_ROLES.includes(roleOf(user))) return [];
  return listAccessibleEarlyYearsClasses(db, user).filter((row) => isEarlyYearsClassRef(row.id || row.name || row.className));
}

function accessibleStudents(db, user, filters = {}) {
  if (!QA_ROLES.includes(roleOf(user))) return [];
  const byClass = new Set(accessibleClasses(db, user).map((row) => classKey(row.id || row.name || row.className)));
  return arr(db.students)
    .filter((student) => isEarlyYearsClassRef(classRefOfStudent(student)))
    .filter((student) => isLeader(user) || byClass.has(classKey(classRefOfStudent(student))))
    .filter((student) => !filters.classId || classMatches(classRefOfStudent(student), filters.classId));
}

function countOpen(rows = []) {
  return rows.filter((row) => !["COMPLETED", "CLOSED", "RESOLVED", "ARCHIVED"].includes(str(row.status || row.actionStatus).toUpperCase())).length;
}

function severityFor(count, critical = false) {
  if (critical) return "CRITICAL";
  if (count > 0) return "ACTION_REQUIRED";
  return "INFO";
}

function statusFromCounts(issueCount) {
  return issueCount > 0 ? "ACTION_NEEDED" : "ON_TRACK";
}

function makeSummaryCard(key, label, value, status = "INFO", hint = "") {
  return { key, label, value, status, hint };
}

function activeSession(db, filters = {}) {
  return str(filters.academicSessionId)
    || str(arr(db.academicSessions).find((row) => row.isActive)?.id)
    || str(arr(db.academicSessions).find((row) => row.isActive)?.sessionName)
    || str(arr(db.lmsSessions).find((row) => row.isActive)?.id)
    || "";
}

function activeTerm(db, filters = {}) {
  return str(filters.termId)
    || str(arr(db.terms).find((row) => row.isActive)?.id)
    || str(arr(db.terms).find((row) => row.isActive)?.termName)
    || str(arr(db.lmsTerms).find((row) => row.isActive)?.id)
    || "";
}

function findStudent(db, studentId) {
  return arr(db.students).find((student) => str(student.id) === str(studentId)) || null;
}

function findUser(db, userId) {
  return arr(db.users).find((user) => str(user.id) === str(userId)) || null;
}

function currentFilters(db, filters = {}) {
  return {
    academicSessionId: activeSession(db, filters),
    termId: activeTerm(db, filters),
    classId: str(filters.classId),
    teacherId: str(filters.teacherId),
    module: str(filters.module).toUpperCase(),
    status: str(filters.status),
    fromDate: str(filters.fromDate),
    toDate: str(filters.toDate),
  };
}

function planRows(db, user, filters = {}) {
  try {
    const result = listWeeklyPlans(db, filters, user);
    return Array.isArray(result) ? result : arr(result?.plans);
  } catch {
    return arr(db.curriculumTeacherPlans)
      .filter((row) => filterByScope(row, filters))
      .filter((row) => teacherCanAccessClass(db, user, row.classId || row.className));
  }
}

function observationRows(db, user, filters = {}) {
  try {
    return listObservations(db, user, filters);
  } catch {
    return arr(db.earlyYearsObservations)
      .filter((row) => filterByScope(row, filters))
      .filter((row) => teacherCanAccessClass(db, user, row.classId || row.className));
  }
}

function actionRows(db, user, filters = {}) {
  const rows = arr(db.earlyYearsQAActions)
    .filter((row) => filterByScope(row, filters))
    .filter((row) => !filters.module || str(row.module).toUpperCase() === str(filters.module).toUpperCase());
  if (isLeader(user)) return rows;
  return rows.filter((row) => str(row.assignedToId) === str(user.id) || str(row.teacherId) === str(user.id));
}

function moderationRows(db, user, filters = {}) {
  const rows = arr(db.earlyYearsQAModerationRecords).filter((row) => filterByScope(row, filters));
  if (isLeader(user)) return rows;
  return rows.filter((row) => str(row.teacherId) === str(user.id) || str(row.selectedById) === str(user.id));
}

function getCurriculumQA(db, user, filters = {}) {
  const scoped = currentFilters(db, filters);
  const classes = accessibleClasses(db, user).filter((row) => !scoped.classId || classMatches(row.id || row.name, scoped.classId));
  const timeline = [];
  for (const classRow of classes) {
    let weeks = [];
    try {
      weeks = listCurriculum(db, { classId: classRow.id, termName: scoped.termId || filters.termName }, user).weeks || [];
    } catch {
      weeks = arr(db.curriculumWeeks).filter((week) => classMatches(week.classLevelCode || week.classId || week.className, classRow.id));
    }
    for (let number = 1; number <= 13; number += 1) {
      const week = weeks.find((row) => Number(row.weekNumber || row.week) === number) || null;
      const plans = planRows(db, user, { ...scoped, classId: classRow.id }).filter((plan) => Number(plan.weekNumber) === number || (week && str(plan.curriculumWeekId) === str(week.id)));
      const daily = arr(db.curriculumDailyTeachingRecords).filter((row) => plans.some((plan) => str(plan.id) === str(row.weeklyPlanId)));
      const review = arr(db.curriculumWeeklyPlanReviews).find((row) => plans.some((plan) => str(plan.id) === str(row.weeklyPlanId)));
      const issueCount = (week ? 0 : 1) + (plans.length ? 0 : 1) + (daily.length ? 0 : 1) + (review ? 0 : 1);
      timeline.push({
        classId: classRow.id,
        className: classRow.name || classRow.className,
        weekNumber: number,
        weekTitle: week?.weekTitle || week?.title || `Week ${number}`,
        curriculumAvailable: Boolean(week),
        planCreated: plans.length > 0,
        teachingRecorded: daily.length > 0,
        weeklyReviewCompleted: Boolean(review),
        status: statusFromCounts(issueCount),
      });
    }
  }
  const missingPlans = timeline.filter((row) => !row.planCreated).length;
  const missingReviews = timeline.filter((row) => !row.weeklyReviewCompleted).length;
  return {
    filters: scoped,
    timeline,
    summary: {
      classesReviewed: classes.length,
      weeksReviewed: timeline.length,
      curriculumWeeksAvailable: timeline.filter((row) => row.curriculumAvailable).length,
      plansCreated: timeline.filter((row) => row.planCreated).length,
      teachingRecorded: timeline.filter((row) => row.teachingRecorded).length,
      weeklyReviewsCompleted: timeline.filter((row) => row.weeklyReviewCompleted).length,
      missingPlans,
      missingReviews,
      status: statusFromCounts(missingPlans + missingReviews),
    },
    principle: "Coverage means curriculum evidence and follow-up support, not class comparison.",
  };
}

function getPlanningQA(db, user, filters = {}) {
  const scoped = currentFilters(db, filters);
  const plans = planRows(db, user, scoped);
  const submitted = plans.filter((row) => ["SUBMITTED", "REVIEWED", "APPROVED"].includes(str(row.planStatus || row.status).toUpperCase()));
  const returned = plans.filter((row) => str(row.planStatus || row.status).toUpperCase() === "RETURNED_FOR_REVISION");
  const drafts = plans.filter((row) => str(row.planStatus || row.status).toUpperCase() === "DRAFT");
  const dailyRecords = arr(db.curriculumDailyTeachingRecords).filter((row) => plans.some((plan) => str(plan.id) === str(row.weeklyPlanId)));
  const weeklyReviews = arr(db.curriculumWeeklyPlanReviews).filter((row) => plans.some((plan) => str(plan.id) === str(row.weeklyPlanId)));
  const checklist = plans.map((plan) => {
    const issues = [];
    if (!str(plan.weeklyPriorities)) issues.push("Weekly priorities need completion.");
    if (!str(plan.directTeaching)) issues.push("Direct teaching notes need completion.");
    if (!str(plan.purposefulPlayProvision)) issues.push("Purposeful play/provision notes need completion.");
    if (!str(plan.sendAccessAdjustments)) issues.push("Access adjustments should be considered.");
    if (!dailyRecords.some((row) => str(row.weeklyPlanId) === str(plan.id))) issues.push("Daily responsive teaching evidence is not yet recorded.");
    if (!weeklyReviews.some((row) => str(row.weeklyPlanId) === str(plan.id))) issues.push("Weekly review is not yet recorded.");
    return {
      id: plan.id,
      classId: plan.classId,
      className: plan.className,
      weekNumber: plan.weekNumber,
      teacherName: plan.teacherName,
      status: plan.planStatus || plan.status,
      checks: issues.length ? issues : ["Planning evidence is in place."],
      qaStatus: statusFromCounts(issues.length),
    };
  });
  return {
    filters: scoped,
    summary: {
      totalPlans: plans.length,
      submittedPlans: submitted.length,
      draftPlans: drafts.length,
      returnedPlans: returned.length,
      dailyRecords: dailyRecords.length,
      weeklyReviews: weeklyReviews.length,
      status: statusFromCounts(drafts.length + returned.length),
    },
    checklist,
  };
}

function getAssessmentQA(db, user, filters = {}) {
  const scoped = currentFilters(db, filters);
  const students = accessibleStudents(db, user, scoped);
  const observations = observationRows(db, user, scoped);
  const summaries = arr(db.earlyYearsDevelopmentSummaries)
    .filter((row) => filterByScope(row, scoped))
    .filter((row) => students.some((student) => str(student.id) === str(row.studentId)));
  let coverage = {};
  try {
    coverage = evidenceCoverageCheck(db, user, scoped);
  } catch {
    coverage = {};
  }
  const withoutObservation = students.filter((student) => !observations.some((row) => str(row.studentId) === str(student.id)));
  const summaryDue = students.filter((student) => !summaries.some((row) => str(row.studentId) === str(student.id)));
  return {
    filters: scoped,
    summary: {
      childrenInScope: students.length,
      observationsThisTerm: observations.length,
      developmentSummaries: summaries.length,
      developmentSummariesDue: summaryDue.length,
      childrenWithoutObservation: withoutObservation.length,
      status: statusFromCounts(summaryDue.length + withoutObservation.length),
    },
    coverage,
    childrenNeedingReview: [...withoutObservation, ...summaryDue].map((student) => ({
      studentId: student.id,
      studentName: student.name,
      classId: classRefOfStudent(student),
      className: student.className || classNameOf(classRefOfStudent(student)),
    })),
    principle: "Assessment QA checks evidence quality and follow-up, not EYFS percentages or child rankings.",
  };
}

function getLearningJournalQA(db, user, filters = {}) {
  const scoped = currentFilters(db, filters);
  const students = accessibleStudents(db, user, scoped);
  const rows = arr(db.earlyYearsLearningJournalEntries)
    .filter((row) => filterByScope(row, scoped))
    .filter((row) => students.some((student) => str(student.id) === str(row.studentId)));
  const highlighted = rows.filter((row) => row.isHighlighted);
  const parentVisible = rows.filter((row) => str(row.visibility).toUpperCase() === "PARENT_VISIBLE");
  const childrenWithoutJournal = students.filter((student) => !rows.some((row) => str(row.studentId) === str(student.id)));
  return {
    filters: scoped,
    summary: {
      journalEntries: rows.length,
      highlightedEntries: highlighted.length,
      parentVisibleEntries: parentVisible.length,
      childrenWithoutJournal: childrenWithoutJournal.length,
      status: statusFromCounts(childrenWithoutJournal.length),
    },
    entries: rows.slice(0, 40),
  };
}

function getLiteracyQA(db, user, filters = {}) {
  const scoped = currentFilters(db, filters);
  const students = listReceptionStudents(db, user, scoped);
  const audit = productionSequenceAudit(db);
  const progress = arr(db.earlyYearsPhonicsProgress).filter((row) => filterByScope(row, scoped));
  const reading = arr(db.earlyYearsReadingRecords).filter((row) => filterByScope(row, scoped));
  const writing = arr(db.earlyYearsWritingRecords).filter((row) => filterByScope(row, scoped));
  const support = arr(db.earlyYearsLiteracySupportPlans).filter((row) => filterByScope(row, scoped));
  const needsReview = students.filter((student) => {
    return !progress.some((row) => str(row.studentId) === str(student.id))
      || !reading.some((row) => str(row.studentId) === str(student.id))
      || !writing.some((row) => str(row.studentId) === str(student.id));
  });
  return {
    filters: scoped,
    summary: {
      receptionChildren: students.length,
      phonicsProgressRecords: progress.length,
      readingRecords: reading.length,
      writingRecords: writing.length,
      supportPlans: support.length,
      reviewsDue: needsReview.length,
      status: statusFromCounts(needsReview.length + (audit.productionSequenceCount > 0 ? 0 : 1)),
    },
    sspSafeguard: {
      ...audit,
      note: "The system tracks the school's adopted SSP sequence only. It does not invent phonics order.",
    },
    reviewsDue: needsReview.map((student) => ({ studentId: student.id, studentName: student.name, className: student.className || "Reception" })),
  };
}

function getEnvironmentQA(db, user, filters = {}) {
  const scoped = currentFilters(db, filters);
  const checklists = listEnvironmentChecklists(db, user, scoped);
  const actions = listEnvironmentActions(db, user, scoped);
  const openActions = actions.filter((row) => !["COMPLETED", "CLOSED"].includes(str(row.status).toUpperCase()));
  const walks = arr(db.earlyYearsQAEnvironmentWalks)
    .filter((row) => filterByScope(row, scoped))
    .filter((row) => isLeader(user) || teacherCanAccessClass(db, user, row.classId || row.className));
  return {
    filters: scoped,
    summary: {
      checklists: checklists.length,
      environmentActionsOpen: openActions.length,
      leadershipWalks: walks.length,
      status: statusFromCounts(openActions.length),
    },
    checklists,
    actions: openActions,
    leadershipWalks: walks,
    cycle: ["PREPARE", "OBSERVE", "ADJUST", "REVIEW"],
  };
}

function getInclusionQA(db, user, filters = {}) {
  const scoped = currentFilters(db, filters);
  const students = listAccessibleEarlyYearsStudents(db, user, scoped);
  const profiles = arr(db.earlyYearsSupportProfiles).filter((row) => filterByScope(row, scoped));
  const concerns = arr(db.earlyYearsSupportConcerns).filter((row) => filterByScope(row, scoped));
  const plans = arr(db.earlyYearsSupportPlans).filter((row) => filterByScope(row, scoped));
  const reviews = arr(db.earlyYearsSupportPlanReviews).filter((row) => filterByScope(row, scoped));
  const meetings = arr(db.earlyYearsParentPartnershipMeetings).filter((row) => filterByScope(row, scoped));
  const activePlans = plans.filter((row) => !["COMPLETED", "CLOSED", "ARCHIVED"].includes(str(row.status).toUpperCase()));
  return {
    filters: scoped,
    summary: {
      childrenInScope: students.length,
      supportProfiles: profiles.length,
      openConcerns: countOpen(concerns),
      activeSupportPlans: activePlans.length,
      supportReviewsDue: activePlans.filter((plan) => !reviews.some((review) => str(review.supportPlanId) === str(plan.id))).length,
      parentMeetingsDue: profiles.filter((profile) => !meetings.some((meeting) => str(meeting.studentId) === str(profile.studentId))).length,
      status: statusFromCounts(countOpen(concerns)),
    },
    supportProfiles: profiles.slice(0, 40),
    openConcerns: concerns.filter((row) => !["RESOLVED", "CLOSED"].includes(str(row.status).toUpperCase())),
    note: "Inclusion QA supports reasonable adjustments and partnership. It does not diagnose children.",
  };
}

function getParentPartnershipQA(db, user, filters = {}) {
  const scoped = currentFilters(db, filters);
  const meetings = arr(db.earlyYearsParentPartnershipMeetings).filter((row) => filterByScope(row, scoped));
  const profiles = arr(db.earlyYearsParentPartnershipProfiles).filter((row) => filterByScope(row, scoped));
  const summaries = arr(db.earlyYearsParentSupportSummaries).filter((row) => filterByScope(row, scoped));
  return {
    filters: scoped,
    summary: {
      parentPartnershipProfiles: profiles.length,
      meetingsRecorded: meetings.length,
      supportSummaries: summaries.length,
      parentMeetingsDue: profiles.filter((profile) => !meetings.some((meeting) => str(meeting.studentId) === str(profile.studentId))).length,
      status: statusFromCounts(0),
    },
    meetings: meetings.slice(0, 40),
    summaries: summaries.slice(0, 40),
  };
}

function getReportingQA(db, user, filters = {}) {
  const scoped = currentFilters(db, filters);
  const reports = listReports(db, user, scoped);
  const dashboard = reportDashboard(db, user, scoped);
  const awaitingReview = reports.filter((row) => ["SUBMITTED", "RETURNED_FOR_REVISION"].includes(str(row.reportStatus || row.status).toUpperCase()));
  const drafts = reports.filter((row) => str(row.reportStatus || row.status).toUpperCase() === "DRAFT");
  const publishedWithoutApproval = arr(db.earlyYearsReports).filter((row) => str(row.reportStatus || row.status).toUpperCase() === "PUBLISHED" && !str(row.approvedAt));
  return {
    filters: scoped,
    summary: {
      reports: reports.length,
      reportsAwaitingReview: awaitingReview.length,
      drafts: drafts.length,
      publishedReports: reports.filter((row) => str(row.reportStatus || row.status).toUpperCase() === "PUBLISHED").length,
      publishedWithoutApproval: publishedWithoutApproval.length,
      status: statusFromCounts(awaitingReview.length + publishedWithoutApproval.length),
    },
    dashboard,
    reports: reports.slice(0, 60),
    legalSafeguard: ELG_REFERENCE_WORDING,
  };
}

function getTransitionQA(db, user, filters = {}) {
  const scoped = currentFilters(db, filters);
  const transitions = listReceptionTransitions(db, user, scoped);
  const drafts = transitions.filter((row) => ["DRAFT", "RETURNED_FOR_REVISION"].includes(str(row.transitionStatus || row.status).toUpperCase()));
  const published = transitions.filter((row) => str(row.transitionStatus || row.status).toUpperCase() === "PUBLISHED");
  return {
    filters: scoped,
    summary: {
      transitionProfiles: transitions.length,
      transitionProfilesDue: drafts.length,
      publishedTransitionProfiles: published.length,
      status: statusFromCounts(drafts.length),
    },
    transitions: transitions.slice(0, 60),
    principle: "Transition means continuity, not reset.",
  };
}

function alertRow(code, severity, module, message, details = {}) {
  return {
    id: `${code}-${hash(details).slice(0, 10)}`,
    code,
    severity: normalizeEnum(severity, QA_SEVERITIES, "REVIEW"),
    module,
    message,
    details,
  };
}

function runDataQualityEngine(db, user, filters = {}) {
  const scoped = currentFilters(db, filters);
  const alerts = [];
  const studentsById = new Map(arr(db.students).map((student) => [str(student.id), student]));
  const usersById = new Map(arr(db.users).map((item) => [str(item.id), item]));
  const classIds = new Set(arr(db.classes).map((item) => classKey(item.id || item.name || item.className)));

  for (const row of arr(db.earlyYearsObservations).filter((item) => filterByScope(item, scoped))) {
    if (!studentsById.has(str(row.studentId))) alerts.push(alertRow("ORPHAN_OBSERVATION_STUDENT", "ACTION_REQUIRED", "ASSESSMENT", "Observation is linked to a missing child record.", { observationId: row.id, studentId: row.studentId }));
    if (row.classId && !classIds.has(classKey(row.classId))) alerts.push(alertRow("INVALID_OBSERVATION_CLASS", "REVIEW", "ASSESSMENT", "Observation references a class that is not active in the class register.", { observationId: row.id, classId: row.classId }));
  }
  for (const row of arr(db.curriculumTeacherPlans).filter((item) => filterByScope(item, scoped))) {
    if (row.classId && !classIds.has(classKey(row.classId))) alerts.push(alertRow("INVALID_PLAN_CLASS", "ACTION_REQUIRED", "PLANNING", "Weekly plan references a class that is not active in the class register.", { planId: row.id, classId: row.classId }));
    if (row.teacherId && !usersById.has(str(row.teacherId))) alerts.push(alertRow("INVALID_PLAN_TEACHER", "ACTION_REQUIRED", "PLANNING", "Weekly plan references a teacher account that cannot be found.", { planId: row.id, teacherId: row.teacherId }));
    if (!str(row.academicSessionId) || !str(row.termId)) alerts.push(alertRow("PLAN_MISSING_SESSION_TERM", "REVIEW", "PLANNING", "Weekly plan is missing session or term information.", { planId: row.id }));
  }
  for (const row of arr(db.earlyYearsReports).filter((item) => filterByScope(item, scoped))) {
    if (!studentsById.has(str(row.studentId))) alerts.push(alertRow("ORPHAN_REPORT_STUDENT", "ACTION_REQUIRED", "REPORTING", "Report is linked to a missing child record.", { reportId: row.id, studentId: row.studentId }));
    if (str(row.reportStatus || row.status).toUpperCase() === "PUBLISHED" && !str(row.approvedAt)) alerts.push(alertRow("PUBLISHED_REPORT_WITHOUT_APPROVAL", "CRITICAL", "REPORTING", "Published report has no approval record.", { reportId: row.id }));
    if (!str(row.academicSessionId) || !str(row.termId)) alerts.push(alertRow("REPORT_MISSING_SESSION_TERM", "REVIEW", "REPORTING", "Report is missing session or term information.", { reportId: row.id }));
  }
  for (const row of arr(db.receptionBasicOneTransitionProfiles).filter((item) => filterByScope(item, scoped))) {
    const student = studentsById.get(str(row.studentId));
    if (!student) alerts.push(alertRow("ORPHAN_TRANSITION_STUDENT", "ACTION_REQUIRED", "TRANSITION", "Transition profile is linked to a missing child record.", { transitionId: row.id, studentId: row.studentId }));
    if (student && !classMatches(classRefOfStudent(student), "reception") && !classMatches(row.classId, "reception")) alerts.push(alertRow("TRANSITION_NON_RECEPTION_CHILD", "REVIEW", "TRANSITION", "Reception transition profile is linked outside Reception.", { transitionId: row.id, studentId: row.studentId }));
  }
  for (const row of arr(db.earlyYearsPhonicsProgress).filter((item) => filterByScope(item, scoped))) {
    const student = studentsById.get(str(row.studentId));
    if (student && !classMatches(classRefOfStudent(student), "reception")) alerts.push(alertRow("RECEPTION_LITERACY_NON_RECEPTION", "REVIEW", "LITERACY", "Reception literacy evidence is linked to a child outside Reception.", { recordId: row.id, studentId: row.studentId }));
  }
  for (const row of arr(db.earlyYearsEnvironmentChecklists).filter((item) => filterByScope(item, scoped))) {
    if (row.classId && !isEarlyYearsClassRef(row.classId)) alerts.push(alertRow("INVALID_ENVIRONMENT_CLASS", "REVIEW", "ENVIRONMENT", "Environment checklist is linked outside Early Years.", { checklistId: row.id, classId: row.classId }));
  }
  const supportKeys = new Set();
  for (const row of arr(db.earlyYearsSupportPlans).filter((item) => filterByScope(item, scoped))) {
    const key = [row.studentId, row.academicSessionId, row.termId, str(row.status).toUpperCase()].join("|");
    if (!["COMPLETED", "CLOSED", "ARCHIVED"].includes(str(row.status).toUpperCase())) {
      if (supportKeys.has(key)) alerts.push(alertRow("DUPLICATE_ACTIVE_SUPPORT_PLAN", "ACTION_REQUIRED", "INCLUSION", "More than one active support plan appears for the same child and term.", { studentId: row.studentId, termId: row.termId }));
      supportKeys.add(key);
    }
  }
  const critical = alerts.filter((row) => row.severity === "CRITICAL").length;
  const actionRequired = alerts.filter((row) => row.severity === "ACTION_REQUIRED").length;
  return {
    filters: scoped,
    summary: {
      totalAlerts: alerts.length,
      critical,
      actionRequired,
      review: alerts.filter((row) => row.severity === "REVIEW").length,
      info: alerts.filter((row) => row.severity === "INFO").length,
      status: critical ? "CRITICAL" : actionRequired ? "ACTION_REQUIRED" : alerts.length ? "REVIEW" : "CLEAR",
    },
    alerts,
  };
}

function getSystemHealth(db, user, filters = {}) {
  const dataQuality = runDataQualityEngine(db, user, filters);
  const ssp = productionSequenceAudit(db);
  const arrays = [
    "curriculumWeeks",
    "curriculumTeacherPlans",
    "earlyYearsObservations",
    "earlyYearsLearningJournalEntries",
    "earlyYearsPhonicsTeachingUnits",
    "earlyYearsEnvironmentChecklists",
    "earlyYearsSupportPlans",
    "earlyYearsReports",
    "receptionBasicOneTransitionProfiles",
  ];
  return {
    checkedAt: nowIso(),
    summary: {
      dataQualityStatus: dataQuality.summary.status,
      activeEarlyYearsClasses: accessibleClasses(db, user).length,
      activeQAActions: countOpen(actionRows(db, user, filters)),
      sspSequenceConfigured: ssp.productionSequenceCount > 0,
      curriculumWeeks: arr(db.curriculumWeeks).length,
      status: dataQuality.summary.critical ? "CRITICAL" : dataQuality.summary.actionRequired ? "ACTION_REQUIRED" : "HEALTHY",
    },
    storage: arrays.map((key) => ({ key, records: arr(db[key]).length })),
    safeguards: {
      rankingDisabled: true,
      childScoreDisabled: true,
      teacherScoreDisabled: true,
      eyfsPercentagesDisabled: true,
      parentCrossChildAccessBlockedByModuleRoutes: true,
    },
    dataQuality,
  };
}

function getClassQAView(db, user, classId, filters = {}) {
  if (!teacherCanAccessClass(db, user, classId)) throw error(403, "You cannot view QA for this class.");
  const scoped = currentFilters(db, { ...filters, classId });
  return {
    classId,
    className: classNameOf(classId),
    curriculum: getCurriculumQA(db, user, scoped),
    planning: getPlanningQA(db, user, scoped),
    assessment: getAssessmentQA(db, user, scoped),
    literacy: classMatches(classId, "reception") ? getLiteracyQA(db, user, scoped) : null,
    environment: getEnvironmentQA(db, user, scoped),
    inclusion: getInclusionQA(db, user, scoped),
    reporting: getReportingQA(db, user, scoped),
    actions: actionRows(db, user, scoped),
  };
}

function getTeacherQATasks(db, user, filters = {}) {
  const scoped = currentFilters(db, { ...filters, teacherId: user.id });
  const actions = actionRows(db, user, scoped);
  const plans = planRows(db, user, scoped).filter((row) => ["DRAFT", "RETURNED_FOR_REVISION"].includes(str(row.planStatus || row.status).toUpperCase()));
  const observations = observationRows(db, user, scoped).filter((row) => ["DRAFT", "IN_PROGRESS", "NEEDS_REVIEW"].includes(str(row.status || row.observationStatus).toUpperCase()));
  const reports = listReports(db, user, scoped).filter((row) => ["DRAFT", "RETURNED_FOR_REVISION"].includes(str(row.reportStatus || row.status).toUpperCase()));
  return {
    filters: scoped,
    summary: {
      assignedActions: actions.length,
      planningFollowUps: plans.length,
      observationFollowUps: observations.length,
      reportFollowUps: reports.length,
      status: statusFromCounts(actions.length + plans.length + observations.length + reports.length),
    },
    actions,
    planning: plans.slice(0, 30),
    observations: observations.slice(0, 30),
    reports: reports.slice(0, 30),
    note: "My Quality Tasks shows support follow-ups assigned to the teacher. It does not rank teachers.",
  };
}

function getQADashboard(db, user, filters = {}) {
  const scoped = currentFilters(db, filters);
  const classes = accessibleClasses(db, user);
  const curriculum = getCurriculumQA(db, user, scoped);
  const planning = getPlanningQA(db, user, scoped);
  const assessment = getAssessmentQA(db, user, scoped);
  const literacy = getLiteracyQA(db, user, scoped);
  const environment = getEnvironmentQA(db, user, scoped);
  const inclusion = getInclusionQA(db, user, scoped);
  const reporting = getReportingQA(db, user, scoped);
  const transition = getTransitionQA(db, user, scoped);
  const dataQuality = isLeader(user)
    ? runDataQualityEngine(db, user, scoped)
    : { summary: { totalAlerts: 0, critical: 0, actionRequired: 0, review: 0, info: 0, status: "LEADERSHIP_ONLY" }, alerts: [] };
  const health = isLeader(user)
    ? getSystemHealth(db, user, scoped)
    : { summary: { status: "LEADERSHIP_ONLY", activeQAActions: countOpen(actionRows(db, user, scoped)) } };
  const actions = actionRows(db, user, scoped);
  return {
    filters: scoped,
    cycle: QA_CYCLE,
    classes,
    cards: [
      makeSummaryCard("activeClasses", "Active Early Years Classes", classes.length, "INFO"),
      makeSummaryCard("currentCurriculumWeek", "Current Curriculum Week", curriculum.timeline.find((row) => row.curriculumAvailable)?.weekNumber || "-", "INFO"),
      makeSummaryCard("weeklyPlans", "Weekly Plans Due/Submitted", `${planning.summary.draftPlans}/${planning.summary.submittedPlans}`, severityFor(planning.summary.draftPlans)),
      makeSummaryCard("observations", "Observations This Term", assessment.summary.observationsThisTerm, "INFO"),
      makeSummaryCard("developmentSummaries", "Development Summaries Due", assessment.summary.developmentSummariesDue, severityFor(assessment.summary.developmentSummariesDue)),
      makeSummaryCard("literacy", "Reception Literacy Reviews Due", literacy.summary.reviewsDue, severityFor(literacy.summary.reviewsDue)),
      makeSummaryCard("environment", "Environment Actions Open", environment.summary.environmentActionsOpen, severityFor(environment.summary.environmentActionsOpen)),
      makeSummaryCard("support", "Support Reviews Due", inclusion.summary.supportReviewsDue, severityFor(inclusion.summary.supportReviewsDue)),
      makeSummaryCard("parentMeetings", "Parent Meetings Due", inclusion.summary.parentMeetingsDue, severityFor(inclusion.summary.parentMeetingsDue)),
      makeSummaryCard("reports", "Reports Awaiting Review", reporting.summary.reportsAwaitingReview, severityFor(reporting.summary.reportsAwaitingReview)),
      makeSummaryCard("transition", "Transition Profiles Due", transition.summary.transitionProfilesDue, severityFor(transition.summary.transitionProfilesDue)),
      makeSummaryCard("dataQuality", "Data Integrity Alerts", dataQuality.summary.totalAlerts, dataQuality.summary.status),
      makeSummaryCard("systemHealth", "System Health", health.summary.status, health.summary.status),
    ],
    domainStatus: {
      curriculum: curriculum.summary,
      planning: planning.summary,
      assessment: assessment.summary,
      literacy: literacy.summary,
      environment: environment.summary,
      inclusion: inclusion.summary,
      reporting: reporting.summary,
      transition: transition.summary,
      dataQuality: dataQuality.summary,
      systemHealth: health.summary,
    },
    recentActions: actions.slice(0, 12),
    safeguards: {
      noClassRanking: true,
      noTeacherRanking: true,
      noChildRanking: true,
      noEyfsPercentages: true,
      noCompetitionLanguage: true,
    },
  };
}

function assertLeaderAction(user, action = "manage quality assurance") {
  if (!isLeader(user)) throw error(403, `Only school leaders can ${action}.`);
}

function createQAAction(db, user, body = {}) {
  assertLeaderAction(user, "create QA actions");
  assertNoCompetitiveLanguage(body);
  const timestamp = nowIso();
  const assignedTo = str(body.assignedToId) ? findUser(db, body.assignedToId) : null;
  const row = {
    id: randomId("ey-qa-action"),
    title: str(body.title),
    module: normalizeEnum(body.module, QA_MODULES, "SYSTEM_HEALTH"),
    qaCycleStage: normalizeEnum(body.qaCycleStage, QA_CYCLE, "SUPPORT"),
    severity: normalizeEnum(body.severity, QA_SEVERITIES, "REVIEW"),
    priority: normalizeEnum(body.priority, QA_ACTION_PRIORITIES, "NORMAL"),
    status: normalizeEnum(body.status, QA_ACTION_STATUSES, "OPEN"),
    classId: str(body.classId),
    className: str(body.className || classNameOf(body.classId)),
    studentId: str(body.studentId),
    studentName: str(body.studentName || findStudent(db, body.studentId)?.name),
    teacherId: str(body.teacherId || assignedTo?.id),
    teacherName: str(body.teacherName || assignedTo?.name || assignedTo?.username),
    assignedToId: str(body.assignedToId || body.teacherId),
    assignedToName: str(body.assignedToName || assignedTo?.name || assignedTo?.username || body.teacherName),
    academicSessionId: str(body.academicSessionId || activeSession(db)),
    termId: str(body.termId || activeTerm(db)),
    dueDate: str(body.dueDate),
    evidenceType: str(body.evidenceType),
    evidenceId: str(body.evidenceId),
    issueSummary: str(body.issueSummary || body.description),
    supportPlan: str(body.supportPlan),
    followUpNotes: str(body.followUpNotes),
    createdBy: str(user.id),
    createdByName: str(user.name || user.username),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  if (!row.title) throw error(400, "Action title is required.");
  db.earlyYearsQAActions.push(row);
  appendQAAuditLog(db, user, "qa_action_created", { actionId: row.id, module: row.module });
  return row;
}

function updateQAAction(db, user, actionId, body = {}) {
  assertNoCompetitiveLanguage(body);
  const row = arr(db.earlyYearsQAActions).find((item) => str(item.id) === str(actionId));
  if (!row) throw error(404, "QA action was not found.");
  const ownAction = str(row.assignedToId) === str(user.id) || str(row.teacherId) === str(user.id);
  if (!isLeader(user) && !ownAction) throw error(403, "You can only update QA actions assigned to you.");
  if (body.title !== undefined && isLeader(user)) row.title = str(body.title);
  if (body.module !== undefined && isLeader(user)) row.module = normalizeEnum(body.module, QA_MODULES, row.module);
  if (body.qaCycleStage !== undefined) row.qaCycleStage = normalizeEnum(body.qaCycleStage, QA_CYCLE, row.qaCycleStage);
  if (body.severity !== undefined && isLeader(user)) row.severity = normalizeEnum(body.severity, QA_SEVERITIES, row.severity);
  if (body.priority !== undefined && isLeader(user)) row.priority = normalizeEnum(body.priority, QA_ACTION_PRIORITIES, row.priority);
  if (body.status !== undefined) row.status = normalizeEnum(body.status, QA_ACTION_STATUSES, row.status);
  if (body.dueDate !== undefined && isLeader(user)) row.dueDate = str(body.dueDate);
  if (body.issueSummary !== undefined && isLeader(user)) row.issueSummary = str(body.issueSummary);
  if (body.supportPlan !== undefined) row.supportPlan = str(body.supportPlan);
  if (body.followUpNotes !== undefined) row.followUpNotes = str(body.followUpNotes);
  if (body.assignedToId !== undefined && isLeader(user)) {
    const assignedTo = findUser(db, body.assignedToId);
    row.assignedToId = str(body.assignedToId);
    row.assignedToName = str(assignedTo?.name || assignedTo?.username || body.assignedToName);
  }
  row.updatedAt = nowIso();
  row.updatedBy = str(user.id);
  appendQAAuditLog(db, user, "qa_action_updated", { actionId: row.id, status: row.status });
  return row;
}

function createModerationRecord(db, user, body = {}) {
  assertLeaderAction(user, "create moderation records");
  assertNoCompetitiveLanguage(body);
  const evidenceType = normalizeEnum(body.evidenceType, ["OBSERVATION", "JOURNAL", "PLAN", "REPORT", "ENVIRONMENT", "INCLUSION"], "OBSERVATION");
  const row = {
    id: randomId("ey-qa-moderation"),
    evidenceType,
    evidenceId: str(body.evidenceId),
    module: normalizeEnum(body.module, QA_MODULES, "ASSESSMENT"),
    status: normalizeEnum(body.status, QA_MODERATION_STATUSES, "SELECTED_FOR_REVIEW"),
    classId: str(body.classId),
    className: str(body.className || classNameOf(body.classId)),
    studentId: str(body.studentId),
    studentName: str(body.studentName || findStudent(db, body.studentId)?.name),
    teacherId: str(body.teacherId),
    teacherName: str(body.teacherName || findUser(db, body.teacherId)?.name || findUser(db, body.teacherId)?.username),
    academicSessionId: str(body.academicSessionId || activeSession(db)),
    termId: str(body.termId || activeTerm(db)),
    reviewFocus: textList(body.reviewFocus || body.focus),
    leadershipFeedback: str(body.leadershipFeedback),
    agreedSupport: str(body.agreedSupport),
    selectedById: str(user.id),
    selectedByName: str(user.name || user.username),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  if (!row.evidenceId) throw error(400, "Moderation evidence reference is required.");
  db.earlyYearsQAModerationRecords.push(row);
  appendQAAuditLog(db, user, "qa_moderation_created", { moderationId: row.id, evidenceType });
  return row;
}

function updateModerationRecord(db, user, recordId, body = {}) {
  assertLeaderAction(user, "update moderation records");
  assertNoCompetitiveLanguage(body);
  const row = arr(db.earlyYearsQAModerationRecords).find((item) => str(item.id) === str(recordId));
  if (!row) throw error(404, "Moderation record was not found.");
  if (body.status !== undefined) row.status = normalizeEnum(body.status, QA_MODERATION_STATUSES, row.status);
  if (body.reviewFocus !== undefined) row.reviewFocus = textList(body.reviewFocus);
  if (body.leadershipFeedback !== undefined) row.leadershipFeedback = str(body.leadershipFeedback);
  if (body.agreedSupport !== undefined) row.agreedSupport = str(body.agreedSupport);
  row.updatedAt = nowIso();
  row.updatedBy = str(user.id);
  appendQAAuditLog(db, user, "qa_moderation_updated", { moderationId: row.id, status: row.status });
  return row;
}

function createEnvironmentWalk(db, user, body = {}) {
  assertLeaderAction(user, "record leadership environment walks");
  assertNoCompetitiveLanguage(body);
  const row = {
    id: randomId("ey-qa-env-walk"),
    classId: str(body.classId),
    className: str(body.className || classNameOf(body.classId)),
    academicSessionId: str(body.academicSessionId || activeSession(db)),
    termId: str(body.termId || activeTerm(db)),
    walkDate: str(body.walkDate || nowIso().slice(0, 10)),
    focusAreas: textList(body.focusAreas),
    strengthsObserved: str(body.strengthsObserved),
    supportNeeded: str(body.supportNeeded),
    followUpActions: textList(body.followUpActions),
    status: normalizeEnum(body.status, ["OPEN", "FOLLOW_UP", "COMPLETED"], "OPEN"),
    createdBy: str(user.id),
    createdByName: str(user.name || user.username),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  if (!row.classId) throw error(400, "Class is required for an environment walk.");
  db.earlyYearsQAEnvironmentWalks.push(row);
  appendQAAuditLog(db, user, "qa_environment_walk_created", { walkId: row.id, classId: row.classId });
  return row;
}

function updateEnvironmentWalk(db, user, walkId, body = {}) {
  assertLeaderAction(user, "update environment walks");
  assertNoCompetitiveLanguage(body);
  const row = arr(db.earlyYearsQAEnvironmentWalks).find((item) => str(item.id) === str(walkId));
  if (!row) throw error(404, "Environment walk was not found.");
  if (body.focusAreas !== undefined) row.focusAreas = textList(body.focusAreas);
  if (body.strengthsObserved !== undefined) row.strengthsObserved = str(body.strengthsObserved);
  if (body.supportNeeded !== undefined) row.supportNeeded = str(body.supportNeeded);
  if (body.followUpActions !== undefined) row.followUpActions = textList(body.followUpActions);
  if (body.status !== undefined) row.status = normalizeEnum(body.status, ["OPEN", "FOLLOW_UP", "COMPLETED"], row.status);
  row.updatedAt = nowIso();
  row.updatedBy = str(user.id);
  appendQAAuditLog(db, user, "qa_environment_walk_updated", { walkId: row.id, status: row.status });
  return row;
}

function createLeadershipNote(db, user, body = {}) {
  assertLeaderAction(user, "record leadership notes");
  assertNoCompetitiveLanguage(body);
  const row = {
    id: randomId("ey-qa-note"),
    module: normalizeEnum(body.module, QA_MODULES, "SYSTEM_HEALTH"),
    qaCycleStage: normalizeEnum(body.qaCycleStage, QA_CYCLE, "REVIEW"),
    classId: str(body.classId),
    className: str(body.className || classNameOf(body.classId)),
    academicSessionId: str(body.academicSessionId || activeSession(db)),
    termId: str(body.termId || activeTerm(db)),
    title: str(body.title),
    note: str(body.note),
    followUpNeeded: body.followUpNeeded === true,
    createdBy: str(user.id),
    createdByName: str(user.name || user.username),
    createdAt: nowIso(),
  };
  if (!row.title || !row.note) throw error(400, "Leadership note title and note are required.");
  db.earlyYearsQALeadershipNotes.push(row);
  appendQAAuditLog(db, user, "qa_leadership_note_created", { noteId: row.id, module: row.module });
  return row;
}

function runSystemIntegrityAudit(db, user, filters = {}) {
  assertLeaderAction(user, "run the system integrity audit");
  const dataQuality = runDataQualityEngine(db, user, filters);
  const ssp = productionSequenceAudit(db);
  const curriculumWeeks = arr(db.curriculumWeeks).length;
  const reportText = JSON.stringify(arr(db.earlyYearsReports));
  const audit = {
    id: randomId("ey-qa-audit"),
    generatedAt: nowIso(),
    generatedBy: str(user.id),
    result: dataQuality.summary.critical ? "REVIEW_REQUIRED" : "PASS",
    integrity: {
      phaseOneAcademicSystemsIntact: Boolean(arr(db.classes).length),
      curriculumWeeksExpected117: curriculumWeeks === 117,
      curriculumWeeks,
      sspSequenceConfigured: ssp.productionSequenceCount > 0,
      inventedSspSequenceCount: ssp.inventedPlaceholderGpcs || 0,
      eyfsReferenceWordingPreserved: Boolean(ELG_REFERENCE_WORDING),
      noEyfsPercentageLanguageInReports: !/%|percentage|percentile/i.test(reportText),
      noRankingLanguageInQA: !FORBIDDEN_QA_TERMS.some((term) => JSON.stringify(arr(db.earlyYearsQAActions)).toLowerCase().includes(term)),
      parentCrossChildAccessBlockedByRoutes: true,
      qaOwnsOnlyQARecords: true,
    },
    dataQuality: dataQuality.summary,
    storageHash: {
      curriculum: hash({ weeks: db.curriculumWeeks, items: db.curriculumItems }),
      planning: hash({ plans: db.curriculumTeacherPlans, daily: db.curriculumDailyTeachingRecords }),
      assessment: hash({ observations: db.earlyYearsObservations, summaries: db.earlyYearsDevelopmentSummaries }),
      literacy: hash({ programmes: db.earlyYearsPhonicsProgrammes, sequence: db.earlyYearsPhonicsTeachingUnits }),
      environment: hash({ areas: db.earlyYearsProvisionAreas, checklists: db.earlyYearsEnvironmentChecklists }),
      inclusion: hash({ profiles: db.earlyYearsSupportProfiles, plans: db.earlyYearsSupportPlans }),
      reporting: hash({ reports: db.earlyYearsReports, transitions: db.receptionBasicOneTransitionProfiles }),
    },
  };
  db.earlyYearsQAAuditRuns.push(audit);
  appendQAAuditLog(db, user, "qa_system_integrity_audit_run", { auditId: audit.id, result: audit.result });
  return audit;
}

function getGovernanceSummary(db, user, filters = {}) {
  if (!isLeader(user)) throw error(403, "Only school leaders can view the governance summary.");
  const scoped = currentFilters(db, filters);
  return {
    generatedAt: nowIso(),
    filters: scoped,
    dashboard: getQADashboard(db, user, scoped).domainStatus,
    dataQuality: runDataQualityEngine(db, user, scoped).summary,
    systemHealth: getSystemHealth(db, user, scoped).summary,
    openActions: actionRows(db, user, scoped).filter((row) => !["COMPLETED", "CLOSED"].includes(str(row.status).toUpperCase())).length,
    governanceBoundary: "This summary supports leadership review and follow-up. It excludes rankings, league tables, scores, and child or teacher comparison.",
  };
}

function setupPayload(db, user) {
  return {
    classes: accessibleClasses(db, user),
    sessions: arr(db.academicSessions || db.lmsSessions),
    terms: arr(db.terms || db.lmsTerms),
    teachers: arr(db.users).filter((row) => roleOf(row) === "TEACHER").map((row) => ({ id: row.id, name: row.name || row.username })),
    qaCycle: QA_CYCLE,
    modules: QA_MODULES,
    severities: QA_SEVERITIES,
    actionStatuses: QA_ACTION_STATUSES,
    actionPriorities: QA_ACTION_PRIORITIES,
    moderationStatuses: QA_MODERATION_STATUSES,
    safeguards: {
      noRankings: true,
      noLeagueTables: true,
      noTeacherScores: true,
      noChildScores: true,
      noEyfsPercentages: true,
    },
  };
}

module.exports = {
  FORBIDDEN_QA_TERMS,
  LEADER_ROLES,
  QA_ACTION_PRIORITIES,
  QA_ACTION_STATUSES,
  QA_CYCLE,
  QA_MODULES,
  QA_MODERATION_STATUSES,
  QA_ROLES,
  QA_SEVERITIES,
  appendQAAuditLog,
  createEnvironmentWalk,
  createLeadershipNote,
  createModerationRecord,
  createQAAction,
  ensureEarlyYearsQAShape,
  getAssessmentQA,
  getClassQAView,
  getCurriculumQA,
  getEnvironmentQA,
  getGovernanceSummary,
  getInclusionQA,
  getLearningJournalQA,
  getLiteracyQA,
  getParentPartnershipQA,
  getPlanningQA,
  getQADashboard,
  getReportingQA,
  getSystemHealth,
  getTeacherQATasks,
  getTransitionQA,
  moderationRows,
  actionRows,
  runDataQualityEngine,
  runSystemIntegrityAudit,
  setupPayload,
  updateEnvironmentWalk,
  updateModerationRecord,
  updateQAAction,
};
