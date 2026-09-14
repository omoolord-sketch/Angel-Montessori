import API from "./client";

/* AUTH */
export const loginUser = (username, password) => API.post("/auth/login", { username, password });
export const getMe = () => API.get("/auth/me");
export const requestPasswordReset = (data) => API.post("/auth/forgot-password", data || {});
export const resetPassword = (data) => API.post("/auth/reset-password", data || {});

/* ADMIN USERS */
export const getAdminUsers = (params) => API.get("/admin/users", { params });
export const getAdminUsersDashboard = () => API.get("/admin/users/dashboard");
export const getAdminUserDetail = (id) => API.get(`/admin/users/${id}`);
export const runAdminUserAction = (id, data) => API.post(`/admin/users/${id}/actions`, data || {});
export const runAdminUsersBulkAction = (data) => API.post("/admin/users/bulk-actions", data || {});
export const getAdminActivityLogs = (params) => API.get("/admin/activity-logs", { params });
export const createAdminUser = (data) => API.post("/admin/users", data);
export const updateAdminUser = (id, data) => API.patch(`/admin/users/${id}`, data);
export const deleteAdminUser = (id) => API.delete(`/admin/users/${id}`);
export const getSubjectCatalog = () => API.get("/admin/subject-catalog");
export const getProvisioningOverview = () => API.get("/admin/provisioning/overview");
export const getProvisioningClasses = () => API.get("/admin/provisioning/classes");
export const getProvisioningStudents = (classId) => API.get("/admin/provisioning/students", { params: { classId } });
export const provisionClassAccounts = (data) => API.post("/admin/provisioning/provision-class", data);
export const provisionParentAccounts = (data) => API.post("/admin/provisioning/provision-parents", data || {});
export const provisionTeacherAccounts = (data) => API.post("/admin/provisioning/provision-teachers", data || {});
export const reissueProvisioningCredentials = (data) => API.post("/admin/provisioning/reissue-credentials", data || {});
export const rebuildStudentProvisioningAccounts = (data) => API.post("/admin/provisioning/rebuild-student-accounts", data || {});
export const getProvisioningLogs = (params) => API.get("/admin/provisioning/logs", { params });

/* REPORT CARD */
export const getClasses = () => API.get("/report-card/classes");
export const addClass = (data) => API.post("/report-card/classes", data);

export const getStudents = (params) => API.get("/report-card/students", { params });
export const addStudent = (data) => API.post("/report-card/students", data);
export const updateStudent = (id, data) => API.patch(`/report-card/students/${id}`, data);
export const deleteStudent = (id) => API.delete(`/report-card/students/${id}`);
export const archiveStudent = (id, data = {}) => API.patch(`/report-card/students/${id}/archive`, data);
export const resetStudentPortalAccount = (id) => API.post(`/report-card/students/${id}/portal-account/reset`);

export const getResults = () => API.get("/report-card/results");
export const addResult = (data) => API.post("/report-card/results", data);
export const updateResult = (id, data) => API.put(`/report-card/results/${id}`, data);
export const deleteResult = (id) => API.delete(`/report-card/results/${id}`);

export const getReports = () => API.get("/report-card/reports");
export const upsertReport = (data) => API.post("/report-card/reports", data);
export const getBroadsheet = (params) => API.get("/report-card/broadsheet", { params });
export const getBroadsheetDashboard = (params) => API.get("/report-card/broadsheet/dashboard", { params });
export const generateBroadsheet = (data) => API.post("/report-card/broadsheet/generate", data);
export const getBroadsheetPreview = (params) => API.get("/report-card/broadsheet/preview", { params });
export const getBroadsheetDetailed = (params) => API.get("/report-card/broadsheet/detailed", { params });
export const getBroadsheetClassStatistics = (params) => API.get("/report-card/broadsheet/statistics/class", { params });
export const getBroadsheetSubjectStatistics = (params) => API.get("/report-card/broadsheet/statistics/subject", { params });
export const approveBroadsheetSnapshot = (data) => API.post("/report-card/broadsheet/approve", data);
export const lockBroadsheetSnapshot = (data) => API.post("/report-card/broadsheet/lock", data);
export const getBroadsheetArchive = (params) => API.get("/report-card/broadsheet/archive", { params });
export const exportBroadsheetExcel = (params) => API.get("/report-card/broadsheet/export/excel", { params, responseType: "blob" });
export const exportBroadsheetPdf = (params) => API.get("/report-card/broadsheet/export/pdf", { params, responseType: "blob" });

/* CONTINUOUS ASSESSMENT */
export const getContinuousAssessmentMetadata = () => API.get("/continuous-assessment/metadata");
export const getContinuousAssessmentEntry = (params) => API.get("/continuous-assessment/entry", { params });
export const saveContinuousAssessmentEntry = (data) => API.post("/continuous-assessment/entry", data);
export const getContinuousAssessmentRecords = (params) => API.get("/continuous-assessment/records", { params });
export const approveContinuousAssessmentRecord = (id, data = {}) => API.post(`/continuous-assessment/records/${id}/approve`, data);
export const rejectContinuousAssessmentRecord = (id, data = {}) => API.post(`/continuous-assessment/records/${id}/reject`, data);
export const unlockContinuousAssessmentRecord = (id, data = {}) => API.post(`/continuous-assessment/records/${id}/unlock`, data);
export const saveContinuousAssessmentSettings = (data) => API.post("/continuous-assessment/settings", data);
export const saveContinuousAssessmentGradingScales = (rows) => API.post("/continuous-assessment/grading-scales", { rows });
export const publishContinuousAssessmentResults = (data) => API.post("/continuous-assessment/publish", data);

/* ACADEMIC SYSTEMS */
export const getAcademicSystemsSummary = () => API.get("/academic-systems/summary");
export const getAcademicSystemClasses = (params) => API.get("/academic-systems/classes", { params });
export const getAcademicSystemFoundation = () => API.get("/academic-systems/foundation");
export const getLegacyAcademicClasses = () => API.get("/academic-systems/legacy-classes");
export const updateAcademicScope = (data) => API.patch("/academic-systems/scope", data || {});
export const saveLegacyClassMigrationPlan = (classId, data) => API.post(`/academic-systems/legacy-classes/${classId}/migration-plan`, data || {});
export const migrateLegacyClassStudents = (classId, data) => API.post(`/academic-systems/legacy-classes/${classId}/migrate-students`, data || {});

/* EARLY YEARS CURRICULUM */
export const getEarlyYearsCurriculumFrameworks = () => API.get("/early-years/curriculum/frameworks");
export const getEarlyYearsCurriculum = (params) => API.get("/early-years/curriculum", { params });
export const getEarlyYearsCurriculumWeek = (weekId, params) => API.get(`/early-years/curriculum/weeks/${weekId}`, { params });
export const searchEarlyYearsCurriculum = (params) => API.get("/early-years/curriculum/search", { params });
export const getCurrentEarlyYearsCurriculumWeek = (params) => API.get("/early-years/curriculum/current", { params });
export const getEarlyYearsCurriculumVersion = (versionId) => API.get(`/early-years/curriculum/version/${versionId}`);
export const getEarlyYearsCurriculumImportStatus = () => API.get("/early-years/curriculum/admin/import-status");
export const importEarlyYearsCurriculumFile = (data) => API.post("/early-years/curriculum/admin/import", data || {});
export const validateEarlyYearsCurriculumImport = (data) => API.post("/early-years/curriculum/admin/validate", data || {});
export const createEarlyYearsCurriculumPlanShell = (weekId, data) => API.post(`/early-years/curriculum/weeks/${weekId}/plans`, data || {});

/* EARLY YEARS PLANNING */
export const getEarlyYearsPlanningSetup = () => API.get("/early-years/plans/setup");
export const getEarlyYearsPlans = (params) => API.get("/early-years/plans", { params });
export const createEarlyYearsWeeklyPlan = (data) => API.post("/early-years/plans", data || {});
export const getEarlyYearsPlan = (id) => API.get(`/early-years/plans/${id}`);
export const updateEarlyYearsPlan = (id, data) => API.put(`/early-years/plans/${id}`, data || {});
export const submitEarlyYearsPlan = (id) => API.post(`/early-years/plans/${id}/submit`, {});
export const copyEarlyYearsPreviousPlanStructure = (id) => API.post(`/early-years/plans/${id}/copy-previous-structure`, {});
export const reviewEarlyYearsPlan = (id, data) => API.post(`/early-years/plans/${id}/review`, data || {});
export const approveEarlyYearsPlan = (id, data) => API.post(`/early-years/plans/${id}/approve`, data || {});
export const returnEarlyYearsPlan = (id, data) => API.post(`/early-years/plans/${id}/return`, data || {});
export const getEarlyYearsPlanDailyRecords = (id) => API.get(`/early-years/plans/${id}/daily`);
export const saveEarlyYearsPlanDailyRecord = (id, data) => API.post(`/early-years/plans/${id}/daily`, data || {});
export const updateEarlyYearsPlanDailyRecord = (id, dailyId, data) => API.put(`/early-years/plans/${id}/daily/${dailyId}`, data || {});
export const saveEarlyYearsWeeklyReview = (id, data) => API.post(`/early-years/plans/${id}/weekly-review`, data || {});
export const getEarlyYearsPlanPrintHtml = (id) => API.get(`/early-years/plans/${id}/print`, { responseType: "text" });

/* EARLY YEARS ASSESSMENT */
export const getEarlyYearsAssessmentSetup = () => API.get("/early-years/assessment/setup");
export const getEarlyYearsAssessmentStudents = (params) => API.get("/early-years/students", { params });
export const getEarlyYearsObservations = (params) => API.get("/early-years/observations", { params });
export const createEarlyYearsObservation = (data) => API.post("/early-years/observations", data || {});
export const getEarlyYearsObservation = (id) => API.get(`/early-years/observations/${id}`);
export const updateEarlyYearsObservation = (id, data) => API.put(`/early-years/observations/${id}`, data || {});
export const completeEarlyYearsObservation = (id) => API.post(`/early-years/observations/${id}/complete`, {});
export const reviewEarlyYearsObservation = (id, data) => API.post(`/early-years/observations/${id}/review`, data || {});
export const publishEarlyYearsObservation = (id, data) => API.post(`/early-years/observations/${id}/publish`, data || {});
export const getEarlyYearsChildProfile = (studentId) => API.get(`/early-years/students/${studentId}/profile`);
export const updateEarlyYearsChildProfile = (studentId, data) => API.put(`/early-years/students/${studentId}/profile`, data || {});
export const getEarlyYearsStudentJournal = (studentId, params) => API.get(`/early-years/students/${studentId}/journal`, { params });
export const createEarlyYearsJournalEntry = (studentId, data) => API.post(`/early-years/students/${studentId}/journal`, data || {});
export const getEarlyYearsStudentDevelopment = (studentId, params) => API.get(`/early-years/students/${studentId}/development`, { params });
export const createEarlyYearsDevelopmentSummary = (studentId, data) => API.post(`/early-years/students/${studentId}/summaries`, data || {});
export const updateEarlyYearsDevelopmentSummary = (id, data) => API.put(`/early-years/summaries/${id}`, data || {});
export const getEarlyYearsNextSteps = (params) => API.get("/early-years/next-steps", { params });
export const updateEarlyYearsNextStep = (id, data) => API.put(`/early-years/next-steps/${id}`, data || {});
export const getEarlyYearsEvidenceCoverage = (params) => API.get("/early-years/coverage", { params });
export const getEarlyYearsParentContributions = (params) => API.get("/early-years/parent-contributions", { params });
export const createEarlyYearsParentContribution = (data) => API.post("/early-years/parent-contributions", data || {});
export const reviewEarlyYearsParentContribution = (id, data) => API.post(`/early-years/parent-contributions/${id}/review`, data || {});
export const getEarlyYearsJournalPrintHtml = (studentId, params) =>
  API.get(`/early-years/students/${studentId}/journal/print`, { params, responseType: "text" });

/* RECEPTION LITERACY / PHONICS */
export const getReceptionLiteracySetup = () => API.get("/early-years/phonics/setup");
export const getReceptionPhonicsProgrammes = (params) => API.get("/early-years/phonics/programmes", { params });
export const createReceptionPhonicsProgramme = (data) => API.post("/early-years/phonics/programmes", data || {});
export const getReceptionPhonicsProgramme = (id) => API.get(`/early-years/phonics/programmes/${id}`);
export const updateReceptionPhonicsProgramme = (id, data) => API.put(`/early-years/phonics/programmes/${id}`, data || {});
export const activateReceptionPhonicsProgramme = (id) => API.post(`/early-years/phonics/programmes/${id}/activate`, {});
export const getReceptionPhonicsSequence = (id) => API.get(`/early-years/phonics/programmes/${id}/sequence`);
export const createReceptionPhonicsSequenceUnit = (id, data) => API.post(`/early-years/phonics/programmes/${id}/sequence`, data || {});
export const getReceptionDecodableBooks = (id) => API.get(`/early-years/phonics/programmes/${id}/books`);
export const createReceptionDecodableBook = (id, data) => API.post(`/early-years/phonics/programmes/${id}/books`, data || {});
export const getReceptionPhonicsProgress = (params) => API.get("/early-years/phonics/progress", { params });
export const createReceptionPhonicsProgress = (data) => API.post("/early-years/phonics/progress", data || {});
export const updateReceptionPhonicsProgress = (id, data) => API.put(`/early-years/phonics/progress/${id}`, data || {});
export const getReceptionReadingRecords = (params) => API.get("/early-years/reading", { params });
export const createReceptionReadingRecord = (data) => API.post("/early-years/reading", data || {});
export const getReceptionWritingRecords = (params) => API.get("/early-years/writing", { params });
export const createReceptionWritingRecord = (data) => API.post("/early-years/writing", data || {});
export const getReceptionLiteracyProfile = (studentId, params) => API.get(`/early-years/literacy/students/${studentId}`, { params });
export const getReceptionLiteracyClassOverview = (classId, params) => API.get(`/early-years/literacy/class/${classId}`, { params });
export const getReceptionLiteracySupportPlans = (params) => API.get("/early-years/literacy/support", { params });
export const createReceptionLiteracySupportPlan = (data) => API.post("/early-years/literacy/support", data || {});
export const updateReceptionLiteracySupportPlan = (id, data) => API.put(`/early-years/literacy/support/${id}`, data || {});
export const getReceptionLiteracySummaries = (params) => API.get("/early-years/literacy/summaries", { params });
export const createReceptionLiteracySummary = (data) => API.post("/early-years/literacy/summaries", data || {});
export const getReceptionHomeReadingRecords = (params) => API.get("/early-years/literacy/home-reading", { params });
export const createReceptionHomeReadingRecord = (data) => API.post("/early-years/literacy/home-reading", data || {});
export const getReceptionLiteracyParentUpdates = (params) => API.get("/early-years/literacy/parent-updates", { params });
export const createReceptionLiteracyParentUpdate = (data) => API.post("/early-years/literacy/parent-updates", data || {});
export const getReceptionLiteracyTransitionSnapshot = (studentId) => API.get(`/early-years/literacy/students/${studentId}/transition`);
export const getReceptionNoInventedSequenceAudit = () => API.get("/early-years/phonics/audit/no-invented-sequence");

/* EARLY YEARS ENVIRONMENT / CONTINUOUS PROVISION */
export const getEarlyYearsEnvironmentSetup = () => API.get("/early-years/environment/setup");
export const getEarlyYearsEnvironmentDashboard = (params) => API.get("/early-years/environment/dashboard", { params });
export const getEarlyYearsProvisionAreas = (params) => API.get("/early-years/environment/areas", { params });
export const createEarlyYearsProvisionArea = (data) => API.post("/early-years/environment/areas", data || {});
export const updateEarlyYearsProvisionArea = (id, data) => API.put(`/early-years/environment/areas/${id}`, data || {});
export const getEarlyYearsProvisionEnhancements = (params) => API.get("/early-years/environment/enhancements", { params });
export const createEarlyYearsProvisionEnhancement = (data) => API.post("/early-years/environment/enhancements", data || {});
export const updateEarlyYearsProvisionEnhancement = (id, data) => API.put(`/early-years/environment/enhancements/${id}`, data || {});
export const getEarlyYearsPracticalLifeActivities = (params) => API.get("/early-years/practical-life", { params });
export const createEarlyYearsPracticalLifeActivity = (data) => API.post("/early-years/practical-life", data || {});
export const updateEarlyYearsPracticalLifeActivity = (id, data) => API.put(`/early-years/practical-life/${id}`, data || {});
export const getEarlyYearsPracticalLifeAssignments = (params) => API.get("/early-years/practical-life/assignments", { params });
export const createEarlyYearsPracticalLifeAssignment = (data) => API.post("/early-years/practical-life/assignments", data || {});
export const getEarlyYearsEnvironmentChecklists = (params) => API.get("/early-years/environment/checklists", { params });
export const createEarlyYearsEnvironmentChecklist = (data) => API.post("/early-years/environment/checklists", data || {});
export const updateEarlyYearsEnvironmentChecklist = (id, data) => API.put(`/early-years/environment/checklists/${id}`, data || {});
export const getEarlyYearsEnvironmentChecklistPrintHtml = (id) => API.get(`/early-years/environment/checklists/${id}/print`, { responseType: "text" });
export const getEarlyYearsEnvironmentActions = (params) => API.get("/early-years/environment/actions", { params });
export const updateEarlyYearsEnvironmentAction = (id, data) => API.put(`/early-years/environment/actions/${id}`, data || {});
export const getEarlyYearsResources = (params) => API.get("/early-years/environment/resources", { params });
export const createEarlyYearsResource = (data) => API.post("/early-years/environment/resources", data || {});
export const updateEarlyYearsResource = (id, data) => API.put(`/early-years/environment/resources/${id}`, data || {});
export const getEarlyYearsResourceRequests = (params) => API.get("/early-years/environment/resource-requests", { params });
export const createEarlyYearsResourceRequest = (data) => API.post("/early-years/environment/resource-requests", data || {});
export const updateEarlyYearsResourceRequest = (id, data) => API.put(`/early-years/environment/resource-requests/${id}`, data || {});
export const getEarlyYearsResourceRequestPrintHtml = (id) => API.get(`/early-years/environment/resource-requests/${id}/print`, { responseType: "text" });
export const getEarlyYearsEnvironmentReviews = (params) => API.get("/early-years/environment/reviews", { params });
export const createEarlyYearsEnvironmentReview = (data) => API.post("/early-years/environment/reviews", data || {});
export const getEarlyYearsDisplayReviews = (params) => API.get("/early-years/environment/displays", { params });
export const createEarlyYearsDisplayReview = (data) => API.post("/early-years/environment/displays", data || {});

/* EARLY YEARS INCLUSION / PARENT PARTNERSHIP */
export const getEarlyYearsInclusionSetup = () => API.get("/early-years/inclusion/setup");
export const getEarlyYearsInclusionDashboard = (params) => API.get("/early-years/inclusion/dashboard", { params });
export const getEarlyYearsSupportProfiles = (params) => API.get("/early-years/inclusion/profiles", { params });
export const createEarlyYearsSupportProfile = (data) => API.post("/early-years/inclusion/profiles", data || {});
export const getEarlyYearsSupportProfile = (id) => API.get(`/early-years/inclusion/profiles/${id}`);
export const updateEarlyYearsSupportProfile = (id, data) => API.put(`/early-years/inclusion/profiles/${id}`, data || {});
export const getEarlyYearsStudentInclusionProfile = (studentId) => API.get(`/early-years/inclusion/students/${studentId}`);
export const updateEarlyYearsParentPartnershipProfile = (studentId, data) => API.put(`/early-years/inclusion/students/${studentId}/parent-partnership`, data || {});
export const createEarlyYearsSupportConcern = (data) => API.post("/early-years/inclusion/concerns", data || {});
export const updateEarlyYearsSupportConcern = (id, data) => API.put(`/early-years/inclusion/concerns/${id}`, data || {});
export const createEarlyYearsSupportPlan = (data) => API.post("/early-years/inclusion/support-plans", data || {});
export const updateEarlyYearsSupportPlan = (id, data) => API.put(`/early-years/inclusion/support-plans/${id}`, data || {});
export const reviewEarlyYearsSupportPlan = (id, data) => API.post(`/early-years/inclusion/support-plans/${id}/review`, data || {});
export const getEarlyYearsSupportPlanPrintHtml = (id) => API.get(`/early-years/inclusion/support-plans/${id}/print`, { responseType: "text" });
export const getEarlyYearsSupportStrategies = (params) => API.get("/early-years/inclusion/strategies", { params });
export const createEarlyYearsSupportStrategy = (data) => API.post("/early-years/inclusion/strategies", data || {});
export const createEarlyYearsReferral = (data) => API.post("/early-years/inclusion/referrals", data || {});
export const updateEarlyYearsReferral = (id, data) => API.put(`/early-years/inclusion/referrals/${id}`, data || {});
export const createEarlyYearsConsent = (data) => API.post("/early-years/inclusion/consents", data || {});
export const getEarlyYearsParentMeetings = (params) => API.get("/early-years/parent-partnership/meetings", { params });
export const createEarlyYearsParentMeeting = (data) => API.post("/early-years/parent-partnership/meetings", data || {});
export const updateEarlyYearsParentMeeting = (id, data) => API.put(`/early-years/parent-partnership/meetings/${id}`, data || {});
export const getEarlyYearsParentMeetingPrintHtml = (id) => API.get(`/early-years/parent-partnership/meetings/${id}/print`, { responseType: "text" });
export const createEarlyYearsParentSupportSummary = (data) => API.post("/early-years/inclusion/parent-summaries", data || {});
export const createEarlyYearsTransitionPlan = (data) => API.post("/early-years/inclusion/transitions", data || {});
export const updateEarlyYearsTransitionPlan = (id, data) => API.put(`/early-years/inclusion/transitions/${id}`, data || {});
export const getEarlyYearsTransitionPrintHtml = (id) => API.get(`/early-years/inclusion/transitions/${id}/print`, { responseType: "text" });
export const getEarlyYearsInclusionReviewsDue = () => API.get("/early-years/inclusion/reviews-due");

/* EARLY YEARS REPORTING / RECEPTION TRANSITION */
export const getEarlyYearsReportingSetup = () => API.get("/early-years/reports/setup");
export const getEarlyYearsReportDashboard = (params) => API.get("/early-years/reports/dashboard", { params });
export const getEarlyYearsReports = (params) => API.get("/early-years/reports", { params });
export const createEarlyYearsReport = (data) => API.post("/early-years/reports", data || {});
export const getEarlyYearsReport = (id) => API.get(`/early-years/reports/${id}`);
export const updateEarlyYearsReport = (id, data) => API.put(`/early-years/reports/${id}`, data || {});
export const submitEarlyYearsReport = (id) => API.post(`/early-years/reports/${id}/submit`, {});
export const returnEarlyYearsReport = (id, data) => API.post(`/early-years/reports/${id}/return`, data || {});
export const approveEarlyYearsReport = (id, data) => API.post(`/early-years/reports/${id}/approve`, data || {});
export const publishEarlyYearsReport = (id) => API.post(`/early-years/reports/${id}/publish`, {});
export const amendEarlyYearsReport = (id, data) => API.post(`/early-years/reports/${id}/amend`, data || {});
export const archiveEarlyYearsReport = (id) => API.post(`/early-years/reports/${id}/archive`, {});
export const getEarlyYearsReportPrintHtml = (id) => API.get(`/early-years/reports/${id}/print`, { responseType: "text" });
export const getEarlyYearsReportArchive = (studentId, params) => API.get(`/early-years/reports/student/${studentId}/archive`, { params });
export const getEarlyYearsReportTemplates = (params) => API.get("/early-years/reports/templates", { params });
export const createEarlyYearsReportTemplate = (data) => API.post("/early-years/reports/templates", data || {});
export const getReceptionEyfsReference = (studentId) => API.get(`/early-years/reception/eyfs-reference/${studentId}`);
export const createReceptionEyfsReference = (data) => API.post("/early-years/reception/eyfs-reference", data || {});
export const updateReceptionEyfsReference = (id, data) => API.put(`/early-years/reception/eyfs-reference/${id}`, data || {});
export const submitReceptionEyfsReference = (id) => API.post(`/early-years/reception/eyfs-reference/${id}/submit`, {});
export const returnReceptionEyfsReference = (id, data) => API.post(`/early-years/reception/eyfs-reference/${id}/return`, data || {});
export const approveReceptionEyfsReference = (id, data) => API.post(`/early-years/reception/eyfs-reference/${id}/approve`, data || {});
export const publishReceptionEyfsReference = (id) => API.post(`/early-years/reception/eyfs-reference/${id}/publish`, {});
export const getReceptionTransitionProfile = (studentId) => API.get(`/early-years/reception/transition/${studentId}`);
export const createReceptionTransitionProfile = (data) => API.post("/early-years/reception/transition", data || {});
export const updateReceptionTransitionProfile = (id, data) => API.put(`/early-years/reception/transition/${id}`, data || {});
export const submitReceptionTransitionProfile = (id) => API.post(`/early-years/reception/transition/${id}/submit`, {});
export const approveReceptionTransitionProfile = (id, data) => API.post(`/early-years/reception/transition/${id}/approve`, data || {});
export const publishReceptionTransitionProfile = (id) => API.post(`/early-years/reception/transition/${id}/publish`, {});
export const handoverReceptionTransitionProfile = (id, data) => API.post(`/early-years/reception/transition/${id}/handover`, data || {});
export const acknowledgeReceptionTransitionProfile = (id, data) => API.post(`/early-years/reception/transition/${id}/acknowledge`, data || {});
export const getReceptionTransitionPrintHtml = (id) => API.get(`/early-years/reception/transition/${id}/print`, { responseType: "text" });
export const getIncomingReceptionHandovers = (params) => API.get("/early-years/reception/handover/incoming", { params });

/* EARLY YEARS QUALITY ASSURANCE */
export const getEarlyYearsQASetup = () => API.get("/early-years/qa/setup");
export const getEarlyYearsQADashboard = (params) => API.get("/early-years/qa/dashboard", { params });
export const getEarlyYearsQAClass = (classId, params) => API.get(`/early-years/qa/class/${classId}`, { params });
export const getMyEarlyYearsQATasks = (params) => API.get("/early-years/qa/teacher/me", { params });
export const getEarlyYearsQACurriculum = (params) => API.get("/early-years/qa/curriculum", { params });
export const getEarlyYearsQAPlanning = (params) => API.get("/early-years/qa/planning", { params });
export const getEarlyYearsQAAssessment = (params) => API.get("/early-years/qa/assessment", { params });
export const getEarlyYearsQAJournal = (params) => API.get("/early-years/qa/journal", { params });
export const getEarlyYearsQALiteracy = (params) => API.get("/early-years/qa/literacy", { params });
export const getEarlyYearsQAEnvironment = (params) => API.get("/early-years/qa/environment", { params });
export const getEarlyYearsQAInclusion = (params) => API.get("/early-years/qa/inclusion", { params });
export const getEarlyYearsQAParentPartnership = (params) => API.get("/early-years/qa/parent-partnership", { params });
export const getEarlyYearsQAReporting = (params) => API.get("/early-years/qa/reporting", { params });
export const getEarlyYearsQATransition = (params) => API.get("/early-years/qa/transition", { params });
export const getEarlyYearsQADataQuality = (params) => API.get("/early-years/qa/data-quality", { params });
export const getEarlyYearsQASystemHealth = (params) => API.get("/early-years/qa/system-health", { params });
export const getEarlyYearsQAGovernanceSummary = (params) => API.get("/early-years/qa/governance-summary", { params });
export const getEarlyYearsQAActions = (params) => API.get("/early-years/qa/actions", { params });
export const createEarlyYearsQAAction = (data) => API.post("/early-years/qa/actions", data || {});
export const updateEarlyYearsQAAction = (id, data) => API.put(`/early-years/qa/actions/${id}`, data || {});
export const getEarlyYearsQAModeration = (params) => API.get("/early-years/qa/moderation", { params });
export const createEarlyYearsQAModeration = (data) => API.post("/early-years/qa/moderation", data || {});
export const updateEarlyYearsQAModeration = (id, data) => API.put(`/early-years/qa/moderation/${id}`, data || {});
export const createEarlyYearsQAEnvironmentWalk = (data) => API.post("/early-years/qa/environment-walks", data || {});
export const updateEarlyYearsQAEnvironmentWalk = (id, data) => API.put(`/early-years/qa/environment-walks/${id}`, data || {});
export const createEarlyYearsQALeadershipNote = (data) => API.post("/early-years/qa/leadership-notes", data || {});
export const runEarlyYearsQAAudit = (data) => API.post("/early-years/qa/run-audit", data || {});

/* GRADING + PROMOTION */
export const gradeScore = (score) => API.post("/grading", { score });
export const getGradingDashboard = () => API.get("/grading/dashboard");
export const getGradingMetadata = () => API.get("/grading/metadata");
export const getGradingPolicies = () => API.get("/grading/policies");
export const createGradingPolicy = (data) => API.post("/grading/policies", data);
export const saveGradingComponents = (policyId, rows) => API.post("/grading/policies/" + policyId + "/components", { rows });
export const saveGradingScales = (policyId, rows) => API.post("/grading/policies/" + policyId + "/grade-scales", { rows });
export const getGradingOfferings = () => API.get("/grading/offerings");
export const createGradingOffering = (data) => API.post("/grading/offerings", data);
export const getGradingScoreSheets = (params) => API.get("/grading/score-sheets", { params });
export const createGradingScoreSheet = (data) => API.post("/grading/score-sheets", data);
export const getGradingScoreSheetDetail = (sheetId) => API.get("/grading/score-sheets/" + sheetId);
export const saveGradingScores = (sheetId, rows) => API.post("/grading/score-sheets/" + sheetId + "/scores", { rows });
export const submitGradingSheet = (sheetId, notes = "") => API.post("/grading/score-sheets/" + sheetId + "/submit", { notes });
export const approveGradingSheet = (sheetId, notes = "") => API.post("/grading/score-sheets/" + sheetId + "/approve", { notes });
export const lockGradingSheet = (sheetId) => API.post("/grading/score-sheets/" + sheetId + "/lock", {});
export const computeGradingSheet = (sheetId) => API.post("/grading/compute/sheets/" + sheetId, {});
export const computeGradingTerm = (data) => API.post("/grading/compute/term", data);
export const publishGradingTerm = (data) => API.post("/grading/publish/term", data);
export const getGradingComputedResults = (params) => API.get("/grading/results/computed", { params });
export const getGradingTermSummaries = (params) => API.get("/grading/results/term-summaries", { params });
export const updateGradingSummaryComments = (summaryId, data) => API.patch("/grading/results/term-summaries/" + summaryId + "/comments", data);
export const decidePromotion = (average) => API.post("/promotion/decide", { average });
export const promoteStudents = (data = {}) => API.post("/promotion/run", data);
export const getPromotionMetadata = () => API.get("/promotion/metadata");
export const getPromotionDashboard = (params) => API.get("/promotion/dashboard", { params });
export const getPromotionPolicies = () => API.get("/promotion/policies");
export const createPromotionPolicy = (data) => API.post("/promotion/policies", data);
export const savePromotionPolicySubjectRules = (policyId, rows) => API.post(`/promotion/policies/${policyId}/subject-rules`, { rows });
export const getPromotionProgressionMap = () => API.get("/promotion/progression-map");
export const savePromotionProgressionMap = (data) => API.post("/promotion/progression-map", data);
export const generatePromotionAnnualSummaries = (data) => API.post("/promotion/annual-summaries/generate", data || {});
export const getPromotionAnnualSummaries = (params) => API.get("/promotion/annual-summaries", { params });
export const processPromotionBatch = (data) => API.post("/promotion/batches/process", data);
export const getPromotionBatches = (params) => API.get("/promotion/batches", { params });
export const getPromotionBatchItems = (batchId) => API.get(`/promotion/batches/${batchId}/items`);
export const getPromotionDecisions = (params) => API.get("/promotion/decisions", { params });
export const overridePromotionDecision = (decisionId, data) => API.patch(`/promotion/decisions/${decisionId}/override`, data);
export const finalizePromotionBatch = (batchId, data) => API.post(`/promotion/batches/${batchId}/finalize`, data || {});

/* ATTENDANCE */
export const getAttendanceClasses = () => API.get("/attendance/classes");
export const getAttendanceTeachers = () => API.get("/attendance/teachers");
export const assignAttendanceClassTeacher = (classId, teacherId) => API.patch(`/attendance/classes/${classId}/teacher`, { teacherId });
export const getAttendanceStudents = (params) => API.get("/attendance/students", { params });
export const getAttendanceSession = (params) => API.get("/attendance/session", { params });
export const submitAttendanceSession = (data) => API.post("/attendance/session", data);
export const getAttendanceSessions = (params) => API.get("/attendance/sessions", { params });
export const getAttendanceClassReport = (params) => API.get("/attendance/reports/class", { params });
export const getAttendanceAdminOverview = (params) => API.get("/attendance/reports/admin-overview", { params });

// Backward-compatible aliases
export const getAttendance = (params) => getAttendanceSessions(params);
export const markAttendance = (data) => submitAttendanceSession(data);

/* CBT - CORE */
export const getCbtMetadata = () => API.get("/cbt/metadata");
export const getCbtAdminOverview = () => API.get("/cbt/admin/overview");

export const getCbtClassesCatalog = () => API.get("/cbt/classes");
export const createCbtClass = (data) => API.post("/cbt/classes", data);

export const getCbtSubjectsCatalog = (params) => API.get("/cbt/subjects", { params });
export const createCbtSubject = (data) => API.post("/cbt/subjects", data);

export const getCbtTopicsCatalog = (params) => API.get("/cbt/topics", { params });
export const createCbtTopic = (data) => API.post("/cbt/topics", data);

export const getCbtSessions = () => API.get("/cbt/sessions");
export const createCbtSession = (data) => API.post("/cbt/sessions", data);
export const updateCbtSession = (id, data) => API.patch(`/cbt/sessions/${id}`, data);

export const getCbtQuestions = (params) => API.get("/cbt/questions", { params });
export const addCbtQuestion = (data) => API.post("/cbt/questions", data);
export const updateCbtQuestion = (id, data) => API.patch(`/cbt/questions/${id}`, data);
export const approveCbtQuestion = (id) => API.post(`/cbt/questions/${id}/approve`, {});
export const rejectCbtQuestion = (id) => API.post(`/cbt/questions/${id}/reject`, {});
export const addCbtQuestionsBulk = (data) => API.post("/cbt/questions/bulk", data);
export const deleteCbtQuestionsBulk = (data) => API.post("/cbt/questions/bulk-delete", data || {});
export const approveCbtQuestionsBulk = (data) => API.post("/cbt/questions/bulk-approve", data || {});
export const rejectCbtQuestionsBulk = (data) => API.post("/cbt/questions/bulk-reject", data || {});

export const getExams = (params) => API.get("/cbt/exams", { params });
export const getCbtExamDetail = (id) => API.get(`/cbt/exams/${id}`);
export const addExam = (data) => API.post("/cbt/exams", data);
export const updateCbtExam = (id, data) => API.patch(`/cbt/exams/${id}`, data);
export const deleteCbtExam = (id) => API.delete(`/cbt/exams/${id}`);
export const submitCbtExamForGeneration = (id, data = {}) => API.post(`/cbt/exams/${id}/submit`, data);
export const syncCbtExamCandidates = (id, data = {}) => API.post(`/cbt/exams/${id}/candidates/sync`, data);
export const addCbtExamManualCandidate = (id, data = {}) => API.post(`/cbt/exams/${id}/candidates/manual`, data);
export const generateCbtExamCredentials = (id, data = {}) => API.post(`/cbt/exams/${id}/credentials/generate`, data);
export const resetCbtExamCredential = (id, candidateType, candidateId, data = {}) =>
  API.post(`/cbt/exams/${id}/credentials/reset/${candidateType}/${candidateId}`, data);
export const revokeCbtExamCredential = (id, candidateType, candidateId) =>
  API.post(`/cbt/exams/${id}/credentials/revoke/${candidateType}/${candidateId}`, {});
export const publishCbtExam = (id) => API.post(`/cbt/exams/${id}/publish`, {});
export const closeCbtExam = (id) => API.post(`/cbt/exams/${id}/close`, {});
export const exportCbtExamCredentialsCsv = (id) => API.get(`/cbt/exams/${id}/credentials/export.csv`, { responseType: "blob" });
export const exportCbtExamCredentialsPdf = (id) => API.get(`/cbt/exams/${id}/credentials/export.pdf`, { responseType: "blob" });
export const assignCbtExamQuestions = (id, data) => API.post(`/cbt/exams/${id}/questions/assign`, data || {});
export const getCbtExamQuestions = (id) => API.get(`/cbt/exams/${id}/questions`);

export const getCbtStudents = (params) => API.get("/cbt/students", { params });
export const getCbtAttempts = () => API.get("/cbt/attempts");
export const getCbtResults = (params) => API.get("/cbt/results", { params });
export const getCbtAnalytics = () => API.get("/cbt/reports/analytics");

export const getCbtSettings = () => API.get("/cbt/settings");
export const updateCbtSettings = (data) => API.patch("/cbt/settings", data);

/* CBT - STUDENT */
export const getStudentCbtExams = (params) => API.get("/cbt/student/exams", { params });
export const getStudentCbtDashboard = () => API.get("/cbt/student/dashboard");
export const getStudentCbtHistory = () => API.get("/cbt/student/history");
export const studentCbtLogin = (data) => API.post("/cbt/student/login", data);
export const candidateCbtLogin = (data) => API.post("/cbt/candidate-login", data);
export const startCandidateCbtExam = (examId, data) => API.post(`/cbt/exams/${examId}/start`, data || {});
export const saveStudentCbtAnswer = (data) => API.post("/cbt/student/answer", data);
export const studentCbtSubmit = (data) => API.post("/cbt/student/submit", data);
export const submitCandidateCbtExam = (examId, data) => API.post(`/cbt/exams/${examId}/submit`, data || {});
export const getStudentCbtResult = (attemptId, token, params = {}) =>
  API.get(`/cbt/student/result/${attemptId}`, { params: { token, ...params } });
export const getRecruitmentApplicants = (params) => API.get("/cbt/recruitment/applicants", { params });
export const getRecruitmentApplicantDashboard = () => API.get("/cbt/recruitment/applicant/dashboard");
export const getRecruitmentSubmissions = (params) => API.get("/cbt/recruitment/submissions", { params });
export const getRecruitmentSubmissionDetail = (attemptId) => API.get(`/cbt/recruitment/submissions/${attemptId}`);
export const reviewRecruitmentSubmission = (attemptId, data = {}) => API.patch(`/cbt/recruitment/submissions/${attemptId}/review`, data);
export const finalizeRecruitmentSubmission = (attemptId, data = {}) => API.post(`/cbt/recruitment/submissions/${attemptId}/finalize`, data);
export const updateRecruitmentSubmissionDecision = (attemptId, data = {}) => API.post(`/cbt/recruitment/submissions/${attemptId}/decision`, data);
export const seedRecruitmentDemoAssessments = () => API.post("/cbt/recruitment/seed-demo", {});

/* SMS */
export const getSMSDashboard = () => API.get("/sms/dashboard");
export const getSMSProviderStatus = () => API.get("/sms/provider/status");
export const sendSMS = (data) => API.post("/sms/send", data);
export const sendSMSCampaign = (data) => API.post("/sms/campaigns/send", data);
export const getSMSCampaigns = (params) => API.get("/sms/campaigns", { params });
export const getSMSMessages = (params) => API.get("/sms/messages", { params });
export const retryFailedSMSMessages = (data) => API.post("/sms/messages/retry-failed", data || {});
export const getSMSTemplates = () => API.get("/sms/templates");
export const createSMSTemplate = (data) => API.post("/sms/templates", data);
export const updateSMSTemplate = (id, data) => API.patch(`/sms/templates/${id}`, data || {});
export const getSMSLogs = () => API.get("/sms/logs");
export const getSMSContacts = (params) => API.get("/sms/contacts", { params });

/* HOMEWORK / ASSIGNMENTS */
export const getHomeworkMetadata = () => API.get("/homework/metadata");
export const getHomeworkDashboard = () => API.get("/homework/dashboard");
export const getHomework = (params) => API.get("/homework", { params });
export const addHomeworkItem = (data) => API.post("/homework", data);
export const uploadHomeworkFile = (file, options = {}) => {
  const formData = new FormData();
  if (file) {
    formData.append("file", file, options.fileName || file.name || "homework-upload");
  }
  if (options.target) {
    formData.append("target", options.target);
  }
  return API.post("/homework/uploads", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
export const getHomeworkSubmissions = (params) => API.get("/homework/submissions", { params });
export const getHomeworkTaskSubmissions = (taskId, params) => API.get(`/homework/${taskId}/submissions`, { params });
export const sendHomeworkTaskReminders = (taskId, data = {}) => API.post(`/homework/${taskId}/reminders`, data);
export const submitHomeworkSubmission = (data) => API.post("/homework/submissions", data);
export const reviewHomeworkSubmission = (id, data) => API.patch(`/homework/submissions/${id}/review`, data);
export const gradeHomeworkSubmission = (id, data) => API.patch(`/homework/submissions/${id}/grade`, data);
export const bulkGradeHomeworkSubmissions = (data) => API.post("/homework/submissions/bulk-grade", data);

/* STUDENT / PARENT PORTAL */
export const getStudentPortalOverview = () => API.get("/portal/student/overview");
export const getParentPortalOverview = () => API.get("/portal/parent/overview");
export const getFinanceSetup = () => API.get("/finance/setup");
export const getFinanceDashboard = () => API.get("/finance/dashboard");
export const getFinanceStudentFees = (params) => API.get("/finance/student-fees", { params });
export const getFinancePayments = (params) => API.get("/finance/payments", { params });
export const receiveFinancePayment = (data) => API.post("/finance/payments", data);
export const receiveFinancePaymentsBulk = (data) => API.post("/finance/payments/bulk", data);
export const voidFinancePayment = (paymentId, data = {}) => API.patch(`/finance/payments/${paymentId}/void`, data);
export const getFinanceReceipt = (paymentId) => API.get(`/finance/payments/${paymentId}/receipt`, { responseType: "text" });
export const getFinanceExpenses = (params) => API.get("/finance/expenses", { params });
export const createFinanceExpense = (data) => API.post("/finance/expenses", data);
export const updateFinanceExpense = (expenseId, data) => API.patch(`/finance/expenses/${expenseId}`, data);
export const deleteFinanceExpense = (expenseId) => API.delete(`/finance/expenses/${expenseId}`);
export const getFinancePurchases = (params) => API.get("/finance/purchases", { params });
export const createFinancePurchase = (data) => API.post("/finance/purchases", data);
export const getFinancePayroll = (params) => API.get("/finance/payroll", { params });
export const saveFinanceSalaryStructure = (data) => API.post("/finance/payroll/structures", data);
export const payFinanceSalary = (data) => API.post("/finance/payroll/payments", data);
export const getTeacherFinanceSalary = (params) => API.get("/finance/payroll/me", { params });
export const getFinanceIncome = (params) => API.get("/finance/income", { params });
export const createFinanceIncome = (data) => API.post("/finance/income", data);
export const getFinanceBudgets = (params) => API.get("/finance/budgets", { params });
export const createFinanceBudget = (data) => API.post("/finance/budgets", data);
export const getFinanceReports = (params) => API.get("/finance/reports", { params });
export const getFinanceSettings = () => API.get("/finance/settings");
export const updateFinanceSettings = (data) => API.patch("/finance/settings", data);
export const getParentFinanceFees = () => API.get("/finance/parent/fees");
export const getTransportSetup = () => API.get("/transport/setup");
export const getTransportDashboard = () => API.get("/transport/dashboard");
export const getTransportVehicles = () => API.get("/transport/vehicles");
export const createTransportVehicle = (data) => API.post("/transport/vehicles", data);
export const updateTransportVehicle = (id, data) => API.patch(`/transport/vehicles/${id}`, data);
export const getTransportDrivers = () => API.get("/transport/drivers");
export const createTransportDriver = (data) => API.post("/transport/drivers", data);
export const updateTransportDriver = (id, data) => API.patch(`/transport/drivers/${id}`, data);
export const getTransportRoutes = () => API.get("/transport/routes");
export const getTransportRouteDetail = (id) => API.get(`/transport/routes/${id}`);
export const createTransportRoute = (data) => API.post("/transport/routes", data);
export const updateTransportRoute = (id, data) => API.patch(`/transport/routes/${id}`, data);
export const createTransportStop = (routeId, data) => API.post(`/transport/routes/${routeId}/stops`, data);
export const updateTransportStop = (id, data) => API.patch(`/transport/stops/${id}`, data);
export const getTransportAssignments = (params) => API.get("/transport/assignments", { params });
export const createTransportAssignment = (data) => API.post("/transport/assignments", data);
export const updateTransportAssignment = (id, data) => API.patch(`/transport/assignments/${id}`, data);
export const getTransportTrips = (params) => API.get("/transport/trips", { params });
export const getTransportTripDetail = (id) => API.get(`/transport/trips/${id}`);
export const startTransportTrip = (data) => API.post("/transport/trips/start", data);
export const updateTransportTripStudentLog = (tripId, studentId, data) => API.patch(`/transport/trips/${tripId}/students/${studentId}`, data);
export const completeTransportTrip = (tripId, data) => API.post(`/transport/trips/${tripId}/complete`, data || {});
export const getTransportIncidents = () => API.get("/transport/incidents");
export const createTransportIncident = (data) => API.post("/transport/incidents", data);
export const updateTransportIncident = (id, data) => API.patch(`/transport/incidents/${id}`, data);
export const getTransportMaintenance = () => API.get("/transport/maintenance");
export const createTransportMaintenance = (data) => API.post("/transport/maintenance", data);
export const getTransportFees = () => API.get("/transport/fees");
export const createTransportFee = (data) => API.post("/transport/fees", data);
export const getTransportReports = () => API.get("/transport/reports");
export const getParentTransportOverview = () => API.get("/transport/parent/overview");
export const getTransportDriverOverview = () => API.get("/transport/driver/overview");
export const getDriverTransportTrips = (params) => API.get("/transport/driver/trips", { params });
export const getDriverTransportTripDetail = (id) => API.get(`/transport/driver/trips/${id}`);
export const updateDriverTransportTripStudentLog = (tripId, studentId, data) => API.patch(`/transport/driver/trips/${tripId}/students/${studentId}`, data);
export const completeDriverTransportTrip = (tripId, data) => API.post(`/transport/driver/trips/${tripId}/complete`, data || {});
export const createDriverTransportIncident = (data) => API.post("/transport/driver/incidents", data);


export const getPublicSiteOverview = () => API.get("/public-site/overview");
export const getPublicSiteRoleProfiles = (params) => API.get("/public-site/role-profiles", { params });
export const getAdminSiteRoleProfiles = (params) => API.get("/public-site/admin/role-profiles", { params });
export const createAdminSiteRoleProfile = (data) => API.post("/public-site/admin/role-profiles", data);
export const updateAdminSiteRoleProfile = (id, data) => API.patch(`/public-site/admin/role-profiles/${id}`, data);
export const deleteAdminSiteRoleProfile = (id) => API.delete(`/public-site/admin/role-profiles/${id}`);

/* ACADEMIC CALENDAR */
export const getPublicAcademicCalendar = () => API.get("/academic-calendar/public/current");
export const getAcademicCalendarDashboard = () => API.get("/academic-calendar/dashboard");
export const getAcademicCalendarSetup = () => API.get("/academic-calendar/setup");
export const getAcademicCalendarSessions = () => API.get("/academic-calendar/sessions");
export const getAcademicCalendarSessionDetail = (id) => API.get(`/academic-calendar/sessions/${id}`);
export const createAcademicCalendarSession = (data) => API.post("/academic-calendar/sessions", data);
export const duplicateAcademicCalendarSession = (id, data) => API.post(`/academic-calendar/sessions/${id}/duplicate`, data);
export const updateAcademicCalendarSession = (id, data) => API.patch(`/academic-calendar/sessions/${id}`, data);
export const getAcademicCalendarTerms = (params) => API.get("/academic-calendar/terms", { params });
export const createAcademicCalendarTerm = (data) => API.post("/academic-calendar/terms", data);
export const updateAcademicCalendarTerm = (id, data) => API.patch(`/academic-calendar/terms/${id}`, data);
export const deleteAcademicCalendarTerm = (id) => API.delete(`/academic-calendar/terms/${id}`);
export const getAcademicCalendarEvents = (params) => API.get("/academic-calendar/events", { params });
export const createAcademicCalendarEvent = (data) => API.post("/academic-calendar/events", data);
export const updateAcademicCalendarEvent = (id, data) => API.patch(`/academic-calendar/events/${id}`, data);
export const deleteAcademicCalendarEvent = (id) => API.delete(`/academic-calendar/events/${id}`);
export const getAcademicCalendarPreview = (sessionId) => API.get(`/academic-calendar/preview/${sessionId}`);
export const exportAcademicCalendar = (sessionId) =>
  API.get(`/academic-calendar/export/${sessionId}`, { responseType: "blob" });
export const exportAcademicCalendarPdf = (sessionId) =>
  API.get(`/academic-calendar/export/${sessionId}/pdf`, { responseType: "blob" });
export const publishAcademicCalendar = (sessionId) => API.post(`/academic-calendar/publish/${sessionId}`, {});
export const archiveAcademicCalendar = (sessionId) => API.post(`/academic-calendar/archive/${sessionId}`, {});

/* SCHEME OF WORK */
export const getSchemeOfWorkDashboard = () => API.get("/scheme-of-work/dashboard");
export const getSchemeOfWorkSetup = () => API.get("/scheme-of-work/setup");
export const getSchemeOfWorkAnalytics = (params) => API.get("/scheme-of-work/analytics", { params });
export const getSchemeOfWorkSessions = () => API.get("/scheme-of-work/sessions");
export const createSchemeOfWorkSession = (data) => API.post("/scheme-of-work/sessions", data);
export const updateSchemeOfWorkSession = (id, data) => API.patch(`/scheme-of-work/sessions/${id}`, data);
export const getSchemeOfWorkTerms = (params) => API.get("/scheme-of-work/terms", { params });
export const getSchemeOfWorkTermDetail = (id) => API.get(`/scheme-of-work/terms/${id}`);
export const createSchemeOfWorkTerm = (data) => API.post("/scheme-of-work/terms", data);
export const updateSchemeOfWorkTerm = (id, data) => API.patch(`/scheme-of-work/terms/${id}`, data);
export const createSchemeOfWorkWeek = (data) => API.post("/scheme-of-work/weeks", data);
export const updateSchemeOfWorkWeek = (id, data) => API.patch(`/scheme-of-work/weeks/${id}`, data);
export const addSchemeOfWorkAttachment = (id, data) => API.post(`/scheme-of-work/weeks/${id}/attachments`, data);
export const deleteSchemeOfWorkAttachment = (id) => API.delete(`/scheme-of-work/attachments/${id}`);
export const submitSchemeOfWorkForReview = (id, data = {}) => API.post(`/scheme-of-work/terms/${id}/submit-review`, data);
export const getSchemeOfWorkApprovals = (params) => API.get("/scheme-of-work/approvals", { params });
export const reviewSchemeOfWork = (id, data) => API.post(`/scheme-of-work/terms/${id}/approval`, data);
export const getSchemeOfWorkProgress = (params) => API.get("/scheme-of-work/progress", { params });
export const exportSchemeOfWork = (termId) => API.get(`/scheme-of-work/export/${termId}`, { responseType: "blob" });
export const exportSchemeOfWorkPdf = (termId) => API.get(`/scheme-of-work/export/${termId}/pdf`, { responseType: "blob" });
export const getTeacherSchemeOfWorkTerms = (params) => API.get("/scheme-of-work/teacher/my-schemes", { params });
export const getTeacherSchemeOfWorkTermDetail = (id) => API.get(`/scheme-of-work/teacher/terms/${id}`);
export const updateTeacherSchemeOfWorkWeekProgress = (id, data) => API.post(`/scheme-of-work/teacher/weeks/${id}/update-progress`, data);

/* LESSON NOTES */
export const getLessonNotesDashboard = () => API.get("/lesson-notes/dashboard");
export const getLessonNotesSetup = () => API.get("/lesson-notes/setup");
export const getLessonNotes = (params) => API.get("/lesson-notes", { params });
export const getLessonNoteDetail = (id) => API.get(`/lesson-notes/${id}`);
export const getLessonNoteByWeek = (schemeWeekId) => API.get(`/lesson-notes/by-week/${schemeWeekId}`);
export const createLessonNote = (data) => API.post("/lesson-notes", data);
export const updateLessonNote = (id, data) => API.patch(`/lesson-notes/${id}`, data);
export const submitLessonNoteForReview = (id, data = {}) => API.post(`/lesson-notes/${id}/submit-review`, data);
export const reviewLessonNote = (id, data) => API.post(`/lesson-notes/${id}/review`, data);
export const getLessonNoteReviews = (params) => API.get("/lesson-notes/reviews", { params });
export const exportLessonNote = (id) => API.get(`/lesson-notes/export/${id}`, { responseType: "blob" });
export const exportLessonNotePdf = (id) => API.get(`/lesson-notes/export/${id}/pdf`, { responseType: "blob" });

/* CAREERS */
export const getCareerPublicConfig = () => API.get("/careers/public/config");
export const getCareerPublicOverview = () => API.get("/careers/public/overview");
export const getCareerPublicVacancies = (params) => API.get("/careers/public/vacancies", { params });
export const getCareerPublicVacancyDetail = (slug) => API.get(`/careers/public/vacancies/${slug}`);
export const submitCareerApplication = (data) => API.post("/careers/public/applications", data);
export const getCareersDashboard = () => API.get("/careers/dashboard");
export const getCareersSetup = () => API.get("/careers/setup");
export const getAdminCareerVacancies = () => API.get("/careers/vacancies");
export const createAdminCareerVacancy = (data) => API.post("/careers/vacancies", data);
export const updateAdminCareerVacancy = (id, data) => API.patch(`/careers/vacancies/${id}`, data);
export const getAdminCareerApplications = (params) => API.get("/careers/applications", { params });
export const getAdminCareerApplicationDetail = (id) => API.get(`/careers/applications/${id}`);
export const updateAdminCareerApplicationStatus = (id, data) => API.patch(`/careers/applications/${id}/status`, data);
export const addAdminCareerApplicationNote = (id, data) => API.post(`/careers/applications/${id}/notes`, data);
export const getAdminCareerInterviews = () => API.get("/careers/interviews");
export const scheduleAdminCareerInterview = (id, data) => API.post(`/careers/applications/${id}/interviews`, data);
export const updateAdminCareerInterview = (id, data) => API.patch(`/careers/interviews/${id}`, data);
export const getAdminCareerReports = () => API.get("/careers/reports");
export const getTeacherProfiles = (params) => API.get("/teachers", { params });
export const getTeacherProfileSetup = () => API.get("/teachers/setup");
export const getActiveTeacherProfiles = () => API.get("/teachers/active");
export const createTeacherProfile = (data) => API.post("/teachers", data);
export const updateTeacherProfile = (id, data) => API.put(`/teachers/${id}`, data);
export const deactivateTeacherProfile = (id, data = {}) => API.patch(`/teachers/${id}/deactivate`, data);
export const reactivateTeacherProfile = (id) => API.patch(`/teachers/${id}/reactivate`, {});
export const deleteTeacherProfile = (id) => API.delete(`/teachers/${id}`);

/* ENQUIRIES / CONTACT */
export const getEnquiryPublicConfig = () => API.get("/enquiries/public/config");
export const submitPublicEnquiry = (data) => API.post("/enquiries/public/submit", data);
export const submitAdmissionsEnquiryForm = (data) => API.post("/enquiries/public/admissions", data);
export const submitCallbackRequest = (data) => API.post("/enquiries/public/callback", data);
export const submitVisitRequest = (data) => API.post("/enquiries/public/visit", data);
export const getEnquiriesDashboard = () => API.get("/enquiries/dashboard");
export const getAdminEnquiries = (params) => API.get("/enquiries", { params });
export const getAdminEnquiryDetail = (id) => API.get(`/enquiries/${id}`);
export const assignAdminEnquiry = (id, data) => API.patch(`/enquiries/${id}/assign`, data);
export const updateAdminEnquiryStatus = (id, data) => API.patch(`/enquiries/${id}/status`, data);
export const replyToAdminEnquiry = (id, data) => API.post(`/enquiries/${id}/replies`, data);
export const getAdminCallbackRequests = (params) => API.get("/enquiries/callbacks", { params });
export const updateAdminCallbackRequest = (id, data) => API.patch(`/enquiries/callbacks/${id}`, data);
export const getAdminVisitRequests = (params) => API.get("/enquiries/visits", { params });
export const updateAdminVisitRequest = (id, data) => API.patch(`/enquiries/visits/${id}`, data);
export const getAdminEnquiryReports = () => API.get("/enquiries/reports");
export const getAdminEnquiryTemplates = () => API.get("/enquiries/templates");
export const createAdminEnquiryTemplate = (data) => API.post("/enquiries/templates", data);
/* LIBRARY */
export const getBooks = () => API.get("/library");
export const addBook = (data) => API.post("/library", data);

/* LMS */
export const getCourses = () => API.get("/lms");
export const addCourse = (data) => API.post("/lms", data);

export const getLmsMetadata = () => API.get("/lms/metadata");
export const getLmsDashboard = () => API.get("/lms/dashboard");

export const getLmsSessions = () => API.get("/lms/sessions");
export const createLmsSession = (data) => API.post("/lms/sessions", data);
export const updateLmsSession = (id, data) => API.patch(`/lms/sessions/${id}`, data);

export const getLmsTerms = (params) => API.get("/lms/terms", { params });
export const createLmsTerm = (data) => API.post("/lms/terms", data);
export const updateLmsTerm = (id, data) => API.patch(`/lms/terms/${id}`, data);

export const getLmsSubjects = () => API.get("/lms/subjects");
export const createLmsSubject = (data) => API.post("/lms/subjects", data);

export const getLmsClassSubjects = (params) => API.get("/lms/class-subjects", { params });
export const createLmsClassSubject = (data) => API.post("/lms/class-subjects", data);
export const updateLmsClassSubject = (id, data) => API.patch(`/lms/class-subjects/${id}`, data);
export const seedLmsClassSubjects = (data) => API.post("/lms/setup/seed-class-subjects", data || {});

export const getLmsTopics = (params) => API.get("/lms/topics", { params });
export const createLmsTopic = (data) => API.post("/lms/topics", data);

export const getLmsLessons = (params) => API.get("/lms/lessons", { params });
export const createLmsLesson = (data) => API.post("/lms/lessons", data);
export const updateLmsLesson = (id, data) => API.patch(`/lms/lessons/${id}`, data);
export const addLmsLessonResource = (lessonId, data) => API.post(`/lms/lessons/${lessonId}/resources`, data);
export const markLmsLessonProgress = (lessonId, data) => API.post(`/lms/lessons/${lessonId}/progress`, data || {});

export const getLmsAssignments = (params) => API.get("/lms/assignments", { params });
export const createLmsAssignment = (data) => API.post("/lms/assignments", data);
export const getLmsAssignmentSubmissions = (assignmentId) => API.get(`/lms/assignments/${assignmentId}/submissions`);
export const submitLmsAssignment = (assignmentId, data) => API.post(`/lms/assignments/${assignmentId}/submissions`, data);
export const gradeLmsAssignmentSubmission = (submissionId, data) => API.patch(`/lms/assignment-submissions/${submissionId}/grade`, data);

export const getLmsQuizzes = (params) => API.get("/lms/quizzes", { params });
export const createLmsQuiz = (data) => API.post("/lms/quizzes", data);
export const addLmsQuizQuestions = (quizId, data) => API.post(`/lms/quizzes/${quizId}/questions`, data);
export const getLmsQuizQuestions = (quizId) => API.get(`/lms/quizzes/${quizId}/questions`);
export const startLmsQuiz = (quizId) => API.post(`/lms/quizzes/${quizId}/start`, {});
export const answerLmsQuizAttempt = (attemptId, data) => API.post(`/lms/quiz-attempts/${attemptId}/answer`, data);
export const submitLmsQuizAttempt = (attemptId) => API.post(`/lms/quiz-attempts/${attemptId}/submit`, {});
export const getLmsQuizAttempts = () => API.get("/lms/quiz-attempts");

export const getLmsAnnouncements = () => API.get("/lms/announcements");
export const createLmsAnnouncement = (data) => API.post("/lms/announcements", data);

export const getLmsReportsOverview = () => API.get("/lms/reports/overview");
export const getLmsVirtualClasses = (params) => API.get("/lms/virtual-classes", { params });
export const getLmsVirtualNotifications = () => API.get("/lms/virtual-classes/notifications");
export const getLmsVirtualEmailProviderStatus = () => API.get("/lms/virtual-classes/provider-status");
export const createLmsVirtualClass = (data) => API.post("/lms/virtual-classes", data);
export const updateLmsVirtualClass = (id, data) => API.patch(`/lms/virtual-classes/${id}`, data);
export const sendLmsVirtualClassReminders = (id, data = {}) => API.post(`/lms/virtual-classes/${id}/reminders/send`, data);
export const getLmsVirtualClassReminderTargets = (id) => API.get(`/lms/virtual-classes/${id}/reminder-targets`);
export const joinLmsVirtualClass = (id, data = {}) => API.post(`/lms/virtual-classes/${id}/join`, data);
export const getLmsVirtualClassJoins = (id) => API.get(`/lms/virtual-classes/${id}/joins`);
export const exportLmsVirtualClassJoins = (id) => API.get(`/lms/virtual-classes/${id}/joins/export`, { responseType: "blob" });

/* TEACHER ANALYTICS */
export const getTeacherAnalytics = (params) => API.get("/teacher-analytics", { params });
export const getTeacherAnalyticsMetadata = () => API.get("/teacher-analytics/metadata");
export const getTeacherAnalyticsDashboard = (params) => API.get("/teacher-analytics/dashboard", { params });
export const getTeacherAnalyticsTeachers = (params) => API.get("/teacher-analytics/teachers", { params });
export const getTeacherAnalyticsTeacherDetail = (teacherUserId, params) =>
  API.get(`/teacher-analytics/teachers/${teacherUserId}`, { params });
export const getTeacherAnalyticsSelf = (params) => API.get("/teacher-analytics/self", { params });
export const runTeacherAnalyticsSnapshotJob = (data = {}) => API.post("/teacher-analytics/jobs/snapshot", data);
export const runTeacherAnalyticsFlagJob = (data = {}) => API.post("/teacher-analytics/jobs/flags", data);
export const getTeacherAnalyticsFlags = (params) => API.get("/teacher-analytics/flags", { params });
export const resolveTeacherAnalyticsFlag = (flagId, data = {}) =>
  API.patch(`/teacher-analytics/flags/${flagId}/resolve`, data);
export const getTeacherAnalyticsNotes = (params) => API.get("/teacher-analytics/notes", { params });
export const createTeacherAnalyticsNote = (data) => API.post("/teacher-analytics/notes", data);
export const getTeacherAnalyticsTargets = (params) => API.get("/teacher-analytics/targets", { params });
export const saveTeacherAnalyticsTarget = (data) => API.post("/teacher-analytics/targets", data);
export const getTeacherAnalyticsExports = (params) => API.get("/teacher-analytics/exports", { params });
export const exportTeacherAnalytics = (params) =>
  API.get("/teacher-analytics/export", { params, responseType: "blob" });

/* ADMISSIONS */
export const getAdmissionsPublicConfig = () => API.get("/admissions/public/config");
export const getAdmissionApplicantClasses = () => API.get("/admissions/applicant/classes");
export const getAdmissionApplicantSessions = () => API.get("/admissions/applicant/sessions");

export const submitAdmissionInquiry = (data) => API.post("/admissions", data);
export const registerApplicantAdmissionAccount = (data) => API.post("/admissions/applicant/register", data);
export const getApplicantAdmissionApplication = () => API.get("/admissions/applicant/application");
export const getApplicantAdmissionAcknowledgement = () => API.get("/admissions/applicant/application/acknowledgement");
export const saveApplicantAdmissionApplication = (data) => API.post("/admissions/applicant/application", data);
export const submitApplicantAdmissionApplication = () => API.post("/admissions/applicant/application/submit", {});

export const getAdmissionInquiries = (params) => API.get("/admissions", { params });
export const getAdmissionAdminApplications = (params) => API.get("/admissions/admin/applications", { params });
export const getAdmissionAdminDashboard = () => API.get("/admissions/admin/dashboard");
export const getAdmissionAdminSessions = () => API.get("/admissions/admin/sessions");
export const createAdmissionAdminSession = (data) => API.post("/admissions/admin/sessions", data);
export const updateAdmissionAdminSession = (id, data) => API.patch(`/admissions/admin/sessions/${id}`, data);
export const getAdmissionAdminClasses = () => API.get("/admissions/admin/classes");
export const createAdmissionAdminClass = (data) => API.post("/admissions/admin/classes", data);
export const updateAdmissionAdminClass = (id, data) => API.patch(`/admissions/admin/classes/${id}`, data);

export const updateAdmissionWorkflow = (id, data) => API.patch(`/admissions/${id}/workflow`, data);
export const updateAdmissionStatus = (id, status) => API.patch(`/admissions/${id}/status`, { status });
export const reopenAdmissionApplication = (id, data = {}) => API.patch(`/admissions/admin/applications/${id}/reopen`, data);
export const reviewAdmissionApplication = (id, data) => API.patch(`/admissions/admin/applications/${id}/review`, data);
export const verifyAdmissionDocument = (id, data) => API.patch(`/admissions/admin/applications/${id}/document`, data);
export const updateAdmissionScreening = (id, data) => API.patch(`/admissions/admin/applications/${id}/screening`, data);
export const publishAdmissionDecision = (id, data) => API.patch(`/admissions/admin/applications/${id}/decision`, data);
export const updateAdmissionAcceptance = (id, data) => API.patch(`/admissions/admin/applications/${id}/acceptance`, data);
export const enrollAdmissionApplicant = (id, data) => API.patch(`/admissions/admin/applications/${id}/enroll`, data);
export const archiveAdmissionApplication = (id, data = {}) => API.patch(`/admissions/admin/applications/${id}/archive`, data);
export const deleteAdmissionApplication = (id) => API.delete(`/admissions/admin/applications/${id}`);

/* DAILY ACTIVITIES */
export const getActivities = () => API.get("/activities");
export const addActivity = (data) => API.post("/activities", data);
export const addActivityComment = (activityId, comment) => API.post(`/activities/${activityId}/comments`, { comment });

/* PAYMENTS */
export const getParentPaymentSummary = () => API.get("/payments/parent/summary");
export const initializeParentFeePayment = (data) => API.post("/payments/parent/initialize", data);
export const getApplicantPaymentSummary = () => API.get("/payments/applicant/summary");
export const initializeApplicantFeePayment = (data = {}) => API.post("/payments/applicant/initialize", data);
export const getApplicantAcceptancePaymentSummary = () => API.get("/payments/applicant/acceptance/summary");
export const initializeApplicantAcceptanceFeePayment = (data = {}) => API.post("/payments/applicant/acceptance/initialize", data);
export const verifyPayment = (reference) => API.post("/payments/verify", { reference });
export const getPaymentHistory = () => API.get("/payments/history");

export const getAdminPaymentsSummary = (params) => API.get("/payments/admin/summary", { params });
export const getAdminPayments = (params) => API.get("/payments/admin/records", { params });
export const exportAdminPayments = (params) => API.get("/payments/admin/export", { params, responseType: "blob" });

/* PAYMENTS - FINANCE ADMIN */
export const getAdminFinanceSetup = () => API.get("/payments/admin/setup");
export const updateAdminFinanceSetup = (data) => API.post("/payments/admin/setup", data);
export const getAdminAcademicSessions = () => API.get("/payments/admin/academic-sessions");
export const createAdminAcademicSession = (data) => API.post("/payments/admin/academic-sessions", data);
export const updateAdminAcademicSession = (id, data) => API.patch(`/payments/admin/academic-sessions/${id}`, data);
export const createAdminAcademicTerm = (sessionId, data) => API.post(`/payments/admin/academic-sessions/${sessionId}/terms`, data);
export const updateAdminAcademicTerm = (id, data) => API.patch(`/payments/admin/terms/${id}`, data);
export const getAdminSchoolStructure = () => API.get("/payments/admin/school-structure");
export const createAdminSchoolSection = (data) => API.post("/payments/admin/school-structure/sections", data);
export const updateAdminSchoolSection = (id, data) => API.patch(`/payments/admin/school-structure/sections/${id}`, data);
export const createAdminSchoolClass = (data) => API.post("/payments/admin/school-structure/classes", data);
export const updateAdminSchoolClass = (id, data) => API.patch(`/payments/admin/school-structure/classes/${id}`, data);
export const updateAdminStudentFinanceStatus = (id, data) => API.patch(`/payments/admin/students/${id}/finance-status`, data);
export const getAdminStudentFinanceProfile = (id) => API.get(`/payments/admin/student-finance/${id}`);
export const getAdminFinanceAuditLogs = (params) => API.get("/payments/admin/audit-logs", { params });
export const reverseAdminPayment = (id, data = {}) => API.patch(`/payments/admin/payments/${id}/reverse`, data);
export const getAdminFeeTypes = () => API.get("/payments/admin/fee-types");
export const createAdminFeeType = (data) => API.post("/payments/admin/fee-types", data);
export const getAdminFeeStructures = (params) => API.get("/payments/admin/fee-structures", { params });
export const getAdminSchoolFeeTemplates = (params) => API.get("/payments/admin/fee-templates", { params });
export const createAdminFeeStructure = (data) => API.post("/payments/admin/fee-structures", data);
export const updateAdminFeeStructure = (id, data) => API.patch(`/payments/admin/fee-structures/${id}`, data);
export const deleteAdminFeeStructure = (id) => API.delete(`/payments/admin/fee-structures/${id}`);
export const bulkUploadAdminFeeStructures = (data) => API.post("/payments/admin/fee-structures/bulk", data);
export const getPublicSchoolFeeTemplate = (params) => API.get("/payments/public/fee-template", { params });
export const getAdminFinanceStudents = (params) => API.get("/payments/admin/students", { params });
export const getAdminStudentFeeAssignments = (params) => API.get("/payments/admin/student-fee-assignments", { params });
export const createAdminStudentFeeAssignment = (data) => API.post("/payments/admin/student-fee-assignments", data);
export const bulkUploadAdminStudentFeeAssignments = (data) => API.post("/payments/admin/student-fee-assignments/bulk", data);
export const getAdminDiscounts = (params) => API.get("/payments/admin/discounts", { params });
export const createAdminDiscount = (data) => API.post("/payments/admin/discounts", data);
export const generateAdminInvoices = (data) => API.post("/payments/admin/generate-invoices", data);
export const getAdminInvoices = (params) => API.get("/payments/admin/invoices", { params });
export const cancelAdminInvoice = (id, data = {}) => API.patch(`/payments/admin/invoices/${id}/cancel`, data);
export const deleteAdminInvoice = (id) => API.delete(`/payments/admin/invoices/${id}`);
export const bulkCancelAdminInvoices = (data) => API.post("/payments/admin/invoices/bulk-cancel", data);
export const bulkDeleteAdminInvoices = (data) => API.post("/payments/admin/invoices/bulk-delete", data);
export const getAdminReceipts = (params) => API.get("/payments/admin/receipts", { params });
export const getAdminFinanceReports = (params) => API.get("/payments/admin/reports", { params });

/* DONATIONS */
export const getDonationPublicOverview = () => API.get("/donations/public/overview");
export const initiateDonation = (data) => API.post("/donations/initiate", data);
export const verifyDonationPayment = (reference) => API.get(`/donations/verify/${reference}`);
export const getAdminDonations = (params) => API.get("/admin/donations", { params });
export const getAdminDonationDetail = (id) => API.get(`/admin/donations/${id}`);
export const updateAdminDonationNote = (id, data) => API.patch(`/admin/donations/${id}/note`, data || {});
export const exportAdminDonations = (params) => API.get("/admin/donations/export", { params, responseType: "blob" });
