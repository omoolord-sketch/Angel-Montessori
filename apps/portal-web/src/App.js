import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import DomainBoundary from "./components/DomainBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import ParentBlockedRoute from "./components/ParentBlockedRoute";

import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import AdmissionsPage from "./pages/AdmissionsPage";
import AdmissionsRequirementsPage from "./pages/AdmissionsRequirementsPage";
import AdmissionsFaqPage from "./pages/AdmissionsFaqPage";
import ApplicantSignupPage from "./pages/ApplicantSignupPage";
import ContactPage from "./pages/ContactPage";
import DonationPage from "./pages/DonationPage";
import CareersPage from "./pages/CareersPage";
import CareerVacanciesPage from "./pages/CareerVacanciesPage";
import CareerVacancyDetailPage from "./pages/CareerVacancyDetailPage";
import CareerApplicationPage from "./pages/CareerApplicationPage";
import AdmissionsEnquiryPage from "./pages/AdmissionsEnquiryPage";
import CallbackRequestPage from "./pages/CallbackRequestPage";
import BookVisitPage from "./pages/BookVisitPage";
import PublicContentPage from "./pages/PublicContentPage";
import HeadOfSchoolPage from "./pages/HeadOfSchoolPage";
import OurStoryPage from "./pages/OurStoryPage";
import VirtualClassroomPage from "./pages/VirtualClassroomPage";
import LoginPage from "./pages/LoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ChangeTemporaryPasswordPage from "./pages/ChangeTemporaryPasswordPage";
import PortalHomePage from "./pages/PortalHomePage";
import StudentPortalDashboard from "./pages/StudentPortalDashboard";
import ParentPortalDashboard from "./pages/ParentPortalDashboard";
import ApplicantAdmissionsDashboard from "./pages/ApplicantAdmissionsDashboard";
import ApplicantRecruitmentDashboard from "./pages/ApplicantRecruitmentDashboard";
import TeacherSubjectDashboard from "./pages/TeacherSubjectDashboard";
import BroadsheetDashboard from "./pages/BroadsheetDashboard";
import ContinuousAssessmentDashboard from "./pages/ContinuousAssessmentDashboard";

import ReportCardDashboard from "./pages/ReportCardDashboard";
import StudentRegistryDashboard from "./pages/StudentRegistryDashboard";
import AttendanceDashboard from "./pages/AttendanceDashboard";
import CBTDashboard from "./pages/CBTDashboard";
import CBTExamPage from "./pages/CBTExamPage";
import CBTCredentialsDashboard from "./pages/CBTCredentialsDashboard";
import RecruitmentAssessmentDashboard from "./pages/RecruitmentAssessmentDashboard";
import GradingEngineDashboard from "./pages/GradingEngineDashboard";
import HomeworkDashboard from "./pages/HomeworkDashboard";
import LibraryDashboard from "./pages/LibraryDashboard";
import LMSDashboard from "./pages/LMSDashboard";
import PromotionDashboard from "./pages/PromotionDashboard";
import SMSDashboard from "./pages/SMSDashboard";
import TeacherAnalyticsDashboard from "./pages/TeacherAnalyticsDashboard";
import AdmissionsAdminDashboard from "./pages/AdmissionsAdminDashboard";
import UserManagementDashboard from "./pages/UserManagementDashboard";
import AccountProvisioningDashboard from "./pages/AccountProvisioningDashboard";
import IDCardsDashboard from "./pages/IDCardsDashboard";
import FinanceDashboard from "./pages/FinanceDashboard";
import AdminPaymentsDashboard from "./pages/AdminPaymentsDashboard";
import DonationsDashboard from "./pages/DonationsDashboard";
import SiteRoleProfilesDashboard from "./pages/SiteRoleProfilesDashboard";
import TransportDashboard from "./pages/TransportDashboard";
import ParentTransportDashboard from "./pages/ParentTransportDashboard";
import TransportDriverDashboard from "./pages/TransportDriverDashboard";
import EnquiriesDashboard from "./pages/EnquiriesDashboard";
import CareersDashboard from "./pages/CareersDashboard";
import TeacherProfilesDashboard from "./pages/TeacherProfilesDashboard";
import AcademicCalendarDashboard from "./pages/AcademicCalendarDashboard";
import SchemeOfWorkDashboard from "./pages/SchemeOfWorkDashboard";
import LessonNotesDashboard from "./pages/LessonNotesDashboard";
import AcademicSystemsDashboard from "./pages/AcademicSystemsDashboard";
import EarlyYearsCurriculumDashboard from "./pages/EarlyYearsCurriculumDashboard";
import EarlyYearsPlanningDashboard from "./pages/EarlyYearsPlanningDashboard";
import EarlyYearsAssessmentDashboard from "./pages/EarlyYearsAssessmentDashboard";
import ReceptionLiteracyDashboard from "./pages/ReceptionLiteracyDashboard";
import EarlyYearsEnvironmentDashboard from "./pages/EarlyYearsEnvironmentDashboard";
import EarlyYearsInclusionDashboard from "./pages/EarlyYearsInclusionDashboard";
import EarlyYearsReportingDashboard from "./pages/EarlyYearsReportingDashboard";
import EarlyYearsQADashboard from "./pages/EarlyYearsQADashboard";
import { publicContentRoutes } from "./content/publicSiteContent";

const adminLmsRoutes = [
  "/admin/lms/dashboard",
  "/admin/lms/setup",
  "/admin/lms/class-subjects",
  "/admin/lms/virtual-classes",
  "/admin/lms/announcements",
  "/admin/lms/reports",
];

const teacherLmsRoutes = [
  "/teacher/lms/dashboard",
  "/teacher/lms/my-subjects",
  "/teacher/lms/virtual-classes",
  "/teacher/lms/topics",
  "/teacher/lms/assignments",
  "/teacher/lms/quizzes",
  "/teacher/lms/announcements",
  "/teacher/lms/reports",
];

const studentLmsRoutes = [
  "/student/lms/dashboard",
  "/student/lms/subjects",
  "/student/lms/virtual-classes",
  "/student/lms/lessons",
  "/student/lms/lessons/:id",
  "/student/lms/assignments",
  "/student/lms/assignments/:id",
  "/student/lms/quizzes",
  "/student/lms/quizzes/:id",
  "/student/lms/progress",
  "/student/lms/announcements",
];

const parentLmsRoutes = [
  "/parent/lms/dashboard",
  "/parent/lms/child-progress",
  "/parent/lms/virtual-classes",
  "/parent/lms/assignments",
  "/parent/lms/quizzes",
  "/parent/lms/announcements",
];

const applicantRoutes = [
  "/portal/applicant",
  "/applicant/dashboard",
  "/applicant/application/personal",
  "/applicant/application/parents",
  "/applicant/application/academic",
  "/applicant/application/medical",
  "/applicant/application/documents",
  "/applicant/application/payment",
  "/applicant/application/review",
  "/applicant/application/status",
  "/applicant/application/acknowledgement",
];

const adminAdmissionsRoutes = [
  "/dashboard/admissions",
  "/admin/admissions/dashboard",
  "/admin/admissions/sessions",
  "/admin/admissions/classes",
  "/admin/admissions/applications",
  "/admin/admissions/documents",
  "/admin/admissions/payments",
  "/admin/admissions/screening",
  "/admin/admissions/decisions",
  "/admin/admissions/enrollment",
];

const admissionsAdminRoles = ["ADMIN", "SUPER_ADMIN", "ADMISSION_OFFICER"];

const enquiryRoutes = [
  "/admin/enquiries/dashboard",
  "/admin/enquiries",
  "/admin/enquiries/callbacks",
  "/admin/enquiries/visits",
  "/admin/enquiries/reports",
  "/admin/enquiries/templates",
];

const careerRoutes = [
  "/dashboard/careers",
  "/admin/careers/dashboard",
  "/admin/careers/vacancies",
  "/admin/careers/applications",
  "/admin/careers/shortlisted",
  "/admin/careers/interviews",
  "/admin/careers/reports",
];

const teacherProfileRoutes = [
  "/dashboard/teacher-registration",
  "/dashboard/teacher-profiles",
  "/admin/teachers",
  "/admin/teacher-registration",
  "/admin/careers/teachers",
  "/admin/careers/teacher-registration",
  "/admin/careers/teacher-profiles",
  "/portal/dashboard/teacher-registration",
  "/portal/dashboard/teacher-profiles",
  "/portal/admin/teachers",
  "/portal/admin/teacher-registration",
  "/portal/admin/careers/teachers",
  "/portal/admin/careers/teacher-registration",
  "/portal/admin/careers/teacher-profiles",
];

const academicCalendarRoutes = [
  "/dashboard/academic-calendar",
  "/admin/academic-calendar/dashboard",
  "/admin/academic-calendar/sessions",
  "/admin/academic-calendar/terms",
  "/admin/academic-calendar/events",
  "/admin/academic-calendar/preview",
  "/admin/academic-calendar/publish",
  "/admin/academic-calendar/archive",
];

const schemeOfWorkAdminRoutes = [
  "/dashboard/scheme-of-work",
  "/admin/scheme-of-work/dashboard",
  "/admin/scheme-of-work/sessions",
  "/admin/scheme-of-work/terms",
  "/admin/scheme-of-work/weeks",
  "/admin/scheme-of-work/approvals",
  "/admin/scheme-of-work/progress",
  "/admin/scheme-of-work/export",
];

const schemeOfWorkTeacherRoutes = [
  "/teacher/scheme-of-work",
  "/teacher/scheme-of-work/weeks",
  "/teacher/scheme-of-work/progress",
  "/teacher/scheme-of-work/export",
];

const lessonNotesAdminRoutes = [
  "/dashboard/lesson-notes",
  "/admin/lesson-notes/dashboard",
  "/admin/lesson-notes/notes",
  "/admin/lesson-notes/reviews",
  "/admin/lesson-notes/export",
];

const lessonNotesTeacherRoutes = [
  "/teacher/lesson-notes",
  "/teacher/lesson-notes/notes",
  "/teacher/lesson-notes/reviews",
  "/teacher/lesson-notes/export",
];

const earlyYearsCurriculumRoutes = [
  "/dashboard/early-years-curriculum",
  "/admin/early-years/curriculum",
  "/portal/admin/early-years/curriculum",
  "/teacher/early-years/curriculum",
  "/teacher/my-curriculum",
];

const earlyYearsPlanningRoutes = [
  "/dashboard/early-years-planning",
  "/admin/early-years/planning",
  "/portal/admin/early-years/planning",
  "/teacher/early-years/plans",
];

const earlyYearsPlanDetailRoutes = [
  "/admin/early-years/plans/:planId",
  "/portal/admin/early-years/plans/:planId",
  "/teacher/early-years/plans/:planId",
];

const earlyYearsAssessmentRoutes = [
  "/dashboard/early-years-assessment",
  "/admin/early-years/assessment",
  "/portal/admin/early-years/assessment",
  "/teacher/early-years/assessment",
  "/parent/early-years/journal",
  "/portal/parent/early-years/journal",
];

const receptionLiteracyRoutes = [
  "/dashboard/reception-literacy",
  "/admin/early-years/reception-literacy",
  "/portal/admin/early-years/reception-literacy",
  "/teacher/early-years/reception-literacy",
  "/teacher/early-years/phonics",
  "/parent/reception-literacy",
  "/portal/parent/reception-literacy",
];

const earlyYearsEnvironmentRoutes = [
  "/dashboard/early-years-environment",
  "/admin/early-years/environment",
  "/portal/admin/early-years/environment",
  "/teacher/early-years/environment",
  "/teacher/early-years/classroom-environment",
];

const earlyYearsInclusionRoutes = [
  "/dashboard/early-years-inclusion",
  "/admin/early-years/inclusion",
  "/portal/admin/early-years/inclusion",
  "/teacher/early-years/inclusion",
  "/teacher/early-years/support",
  "/parent/early-years/support",
  "/portal/parent/early-years/support",
];

const earlyYearsReportingRoutes = [
  "/dashboard/early-years-reports",
  "/admin/early-years/reports",
  "/portal/admin/early-years/reports",
  "/teacher/early-years/reports",
  "/teacher/early-years/reception-reference",
  "/teacher/early-years/basic-1-transition",
  "/teacher/incoming-transition",
  "/parent/early-years/reports",
  "/portal/parent/early-years/reports",
];

const earlyYearsQARoutes = [
  "/dashboard/early-years-qa",
  "/admin/early-years/qa",
  "/portal/admin/early-years/qa",
  "/teacher/early-years/qa",
  "/teacher/early-years/my-quality-tasks",
];

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <DomainBoundary>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/admissions" element={<AdmissionsPage />} />
            <Route path="/admissions/requirements" element={<AdmissionsRequirementsPage />} />
            <Route path="/admissions/faq" element={<AdmissionsFaqPage />} />
            <Route path="/admissions/apply" element={<ApplicantSignupPage />} />
            <Route path="/admissions/register" element={<ApplicantSignupPage />} />
            <Route path="/admissions/login" element={<LoginPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/donate" element={<DonationPage />} />
            <Route path="/careers" element={<CareersPage />} />
            <Route path="/careers/vacancies" element={<CareerVacanciesPage />} />
            <Route path="/careers/vacancies/:slug" element={<CareerVacancyDetailPage />} />
            <Route path="/careers/apply/:vacancyId" element={<CareerApplicationPage />} />
            <Route path="/admissions-enquiry" element={<AdmissionsEnquiryPage />} />
            <Route path="/request-callback" element={<CallbackRequestPage />} />
            <Route path="/book-a-visit" element={<BookVisitPage />} />
            <Route path="/academic-calendar" element={<PublicContentPage pageKey="academicsCalendar" />} />
            {publicContentRoutes.map((route) => (
              <Route
                key={route.key}
                path={route.path}
                element={route.key === "headOfSchool" ? <HeadOfSchoolPage /> : route.key === "history" ? <OurStoryPage /> : route.key === "eLearning" ? <VirtualClassroomPage /> : <PublicContentPage pageKey={route.key} />}
              />
            ))}
            <Route path="/cbt/exam" element={<ParentBlockedRoute><CBTExamPage /></ParentBlockedRoute>} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/portal/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/change-password" element={<ProtectedRoute><ChangeTemporaryPasswordPage /></ProtectedRoute>} />
            <Route path="/portal/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/portal/reset-password" element={<ResetPasswordPage />} />
            <Route path="/portal/change-password" element={<ProtectedRoute><ChangeTemporaryPasswordPage /></ProtectedRoute>} />

            <Route
              path="/portal"
              element={
                <ProtectedRoute>
                  <PortalHomePage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/teacher/subject"
              element={
                <ProtectedRoute roles={["TEACHER"]}>
                  <TeacherSubjectDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/portal/student"
              element={
                <ProtectedRoute roles={["STUDENT"]}>
                  <StudentPortalDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/portal/parent"
              element={
                <ProtectedRoute roles={["PARENT"]}>
                  <ParentPortalDashboard />
                </ProtectedRoute>
              }
            />

            {applicantRoutes.map((path) => (
              <Route
                key={path}
                path={path}
                element={
                  <ProtectedRoute roles={["APPLICANT"]}>
                    <ApplicantAdmissionsDashboard />
                  </ProtectedRoute>
                }
              />
            ))}

            <Route
              path="/applicant/recruitment"
              element={
                <ProtectedRoute roles={["APPLICANT"]}>
                  <ApplicantRecruitmentDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/broadsheet"
              element={
                <ProtectedRoute roles={["ADMIN", "TEACHER"]}>
                  <BroadsheetDashboard />
                </ProtectedRoute>
              }
            />

            <Route path="/dashboard/student-registry" element={<ProtectedRoute roles={["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER"]}><StudentRegistryDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/academic-systems" element={<ProtectedRoute roles={["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER"]}><AcademicSystemsDashboard /></ProtectedRoute>} />
            <Route path="/admin/academic-systems" element={<ProtectedRoute roles={["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER"]}><AcademicSystemsDashboard /></ProtectedRoute>} />
            <Route path="/portal/admin/academic-systems" element={<ProtectedRoute roles={["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER"]}><AcademicSystemsDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/report-card" element={<ProtectedRoute roles={["ADMIN"]}><ReportCardDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/continuous-assessment" element={<ProtectedRoute roles={["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER", "TEACHER"]}><ContinuousAssessmentDashboard /></ProtectedRoute>} />
            <Route path="/teacher/continuous-assessment" element={<ProtectedRoute roles={["TEACHER"]}><ContinuousAssessmentDashboard /></ProtectedRoute>} />
            <Route path="/admin/continuous-assessment" element={<ProtectedRoute roles={["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER"]}><ContinuousAssessmentDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/attendance" element={<ProtectedRoute roles={["ADMIN", "TEACHER"]}><AttendanceDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/cbt" element={<ProtectedRoute roles={["ADMIN", "TEACHER"]}><CBTDashboard /></ProtectedRoute>} />
            <Route path="/admin/cbt/exams" element={<ProtectedRoute roles={["ACADEMIC_OFFICER", "SUPER_ADMIN"]}><CBTCredentialsDashboard /></ProtectedRoute>} />
            <Route path="/admin/cbt/exams/:id" element={<ProtectedRoute roles={["ACADEMIC_OFFICER", "SUPER_ADMIN"]}><CBTCredentialsDashboard /></ProtectedRoute>} />
            <Route path="/admin/cbt/exams/:id/credentials" element={<ProtectedRoute roles={["ACADEMIC_OFFICER", "SUPER_ADMIN"]}><CBTCredentialsDashboard /></ProtectedRoute>} />
            <Route path="/admin/cbt/recruitment" element={<ProtectedRoute roles={["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER", "HR_OFFICER"]}><RecruitmentAssessmentDashboard /></ProtectedRoute>} />
            <Route path="/portal/admin/cbt/exams" element={<ProtectedRoute roles={["ACADEMIC_OFFICER", "SUPER_ADMIN"]}><CBTCredentialsDashboard /></ProtectedRoute>} />
            <Route path="/portal/admin/cbt/exams/:id" element={<ProtectedRoute roles={["ACADEMIC_OFFICER", "SUPER_ADMIN"]}><CBTCredentialsDashboard /></ProtectedRoute>} />
            <Route path="/portal/admin/cbt/exams/:id/credentials" element={<ProtectedRoute roles={["ACADEMIC_OFFICER", "SUPER_ADMIN"]}><CBTCredentialsDashboard /></ProtectedRoute>} />
            <Route path="/portal/admin/cbt/recruitment" element={<ProtectedRoute roles={["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER", "HR_OFFICER"]}><RecruitmentAssessmentDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/grading" element={<ProtectedRoute roles={["ADMIN"]}><GradingEngineDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/homework" element={<ProtectedRoute roles={["ADMIN"]}><HomeworkDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/library" element={<ProtectedRoute roles={["ADMIN", "TEACHER", "STUDENT", "APPLICANT"]}><LibraryDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/lms" element={<ProtectedRoute roles={["ADMIN", "ACADEMIC_OFFICER", "TEACHER", "STUDENT", "PARENT"]}><LMSDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/lms/*" element={<ProtectedRoute roles={["ADMIN", "ACADEMIC_OFFICER", "TEACHER", "STUDENT", "PARENT"]}><LMSDashboard /></ProtectedRoute>} />

            {adminLmsRoutes.map((path) => (
              <Route key={path} path={path} element={<ProtectedRoute roles={["ADMIN"]}><LMSDashboard /></ProtectedRoute>} />
            ))}
            {teacherLmsRoutes.map((path) => (
              <Route key={path} path={path} element={<ProtectedRoute roles={["TEACHER"]}><LMSDashboard /></ProtectedRoute>} />
            ))}
            {studentLmsRoutes.map((path) => (
              <Route key={path} path={path} element={<ProtectedRoute roles={["STUDENT"]}><LMSDashboard /></ProtectedRoute>} />
            ))}
            {parentLmsRoutes.map((path) => (
              <Route key={path} path={path} element={<ProtectedRoute roles={["PARENT"]}><LMSDashboard /></ProtectedRoute>} />
            ))}

            <Route path="/admin/lms/*" element={<ProtectedRoute roles={["ADMIN"]}><LMSDashboard /></ProtectedRoute>} />
            <Route path="/teacher/lms/*" element={<ProtectedRoute roles={["TEACHER"]}><LMSDashboard /></ProtectedRoute>} />
            <Route path="/student/lms/*" element={<ProtectedRoute roles={["STUDENT"]}><LMSDashboard /></ProtectedRoute>} />
            <Route path="/parent/lms/*" element={<ProtectedRoute roles={["PARENT"]}><LMSDashboard /></ProtectedRoute>} />

            <Route path="/dashboard/promotion" element={<ProtectedRoute roles={["ADMIN"]}><PromotionDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/sms" element={<ProtectedRoute roles={["ADMIN"]}><SMSDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/teacher-analytics" element={<ProtectedRoute roles={["ADMIN", "TEACHER"]}><TeacherAnalyticsDashboard /></ProtectedRoute>} />
            <Route path="/teacher/analytics" element={<ProtectedRoute roles={["TEACHER"]}><TeacherAnalyticsDashboard /></ProtectedRoute>} />

            {adminAdmissionsRoutes.map((path) => (
              <Route key={path} path={path} element={<ProtectedRoute roles={admissionsAdminRoles}><AdmissionsAdminDashboard /></ProtectedRoute>} />
            ))}

            {enquiryRoutes.map((path) => (
              <Route
                key={path}
                path={path}
                element={<ProtectedRoute roles={["ADMIN", "SUPER_ADMIN", "ICT_ADMIN", "ADMISSION_OFFICER", "FINANCE_OFFICER"]}><EnquiriesDashboard /></ProtectedRoute>}
              />
            ))}

            {careerRoutes.map((path) => (
              <Route
                key={path}
                path={path}
                element={<ProtectedRoute roles={["ADMIN", "SUPER_ADMIN", "HR_OFFICER"]}><CareersDashboard /></ProtectedRoute>}
              />
            ))}

            {teacherProfileRoutes.map((path) => (
              <Route
                key={path}
                path={path}
                element={<ProtectedRoute roles={["ADMIN", "SUPER_ADMIN", "HR_OFFICER"]}><TeacherProfilesDashboard /></ProtectedRoute>}
              />
            ))}

            {academicCalendarRoutes.map((path) => (
              <Route
                key={path}
                path={path}
                element={<ProtectedRoute roles={["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER", "TEACHER"]}><AcademicCalendarDashboard /></ProtectedRoute>}
              />
            ))}

            {schemeOfWorkAdminRoutes.map((path) => (
              <Route
                key={path}
                path={path}
                element={<ProtectedRoute roles={["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER"]}><SchemeOfWorkDashboard /></ProtectedRoute>} />
            ))}

            {schemeOfWorkTeacherRoutes.map((path) => (
              <Route
                key={path}
                path={path}
                element={<ProtectedRoute roles={["TEACHER"]}><SchemeOfWorkDashboard /></ProtectedRoute>} />
            ))}

            {lessonNotesAdminRoutes.map((path) => (
              <Route
                key={path}
                path={path}
                element={<ProtectedRoute roles={["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER"]}><LessonNotesDashboard /></ProtectedRoute>} />
            ))}

            {lessonNotesTeacherRoutes.map((path) => (
              <Route
                key={path}
                path={path}
                element={<ProtectedRoute roles={["TEACHER"]}><LessonNotesDashboard /></ProtectedRoute>} />
            ))}
            {earlyYearsCurriculumRoutes.map((path) => (
              <Route
                key={path}
                path={path}
                element={<ProtectedRoute roles={["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER", "TEACHER"]}><EarlyYearsCurriculumDashboard /></ProtectedRoute>} />
            ))}
            {earlyYearsPlanningRoutes.map((path) => (
              <Route
                key={path}
                path={path}
                element={<ProtectedRoute roles={["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER", "TEACHER"]}><EarlyYearsPlanningDashboard /></ProtectedRoute>} />
            ))}
            {earlyYearsPlanDetailRoutes.map((path) => (
              <Route
                key={path}
                path={path}
                element={<ProtectedRoute roles={["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER", "TEACHER"]}><EarlyYearsPlanningDashboard /></ProtectedRoute>} />
            ))}
            {earlyYearsAssessmentRoutes.map((path) => (
              <Route
                key={path}
                path={path}
                element={<ProtectedRoute roles={["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER", "TEACHER", "PARENT"]}><EarlyYearsAssessmentDashboard /></ProtectedRoute>} />
            ))}
            {receptionLiteracyRoutes.map((path) => (
              <Route
                key={path}
                path={path}
                element={<ProtectedRoute roles={["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER", "TEACHER", "PARENT"]}><ReceptionLiteracyDashboard /></ProtectedRoute>} />
            ))}
            {earlyYearsEnvironmentRoutes.map((path) => (
              <Route
                key={path}
                path={path}
                element={<ProtectedRoute roles={["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER", "TEACHER"]}><EarlyYearsEnvironmentDashboard /></ProtectedRoute>} />
            ))}
            {earlyYearsInclusionRoutes.map((path) => (
              <Route
                key={path}
                path={path}
                element={<ProtectedRoute roles={["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER", "TEACHER", "PARENT"]}><EarlyYearsInclusionDashboard /></ProtectedRoute>} />
            ))}
            {earlyYearsReportingRoutes.map((path) => (
              <Route
                key={path}
                path={path}
                element={<ProtectedRoute roles={["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER", "TEACHER", "PARENT"]}><EarlyYearsReportingDashboard /></ProtectedRoute>} />
            ))}
            {earlyYearsQARoutes.map((path) => (
              <Route
                key={path}
                path={path}
                element={<ProtectedRoute roles={["ADMIN", "SUPER_ADMIN", "ACADEMIC_OFFICER", "TEACHER"]}><EarlyYearsQADashboard /></ProtectedRoute>} />
            ))}
            <Route path="/dashboard/users" element={<ProtectedRoute roles={["ADMIN", "SUPER_ADMIN"]}><UserManagementDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/provisioning" element={<ProtectedRoute roles={["ADMIN", "SUPER_ADMIN"]}><AccountProvisioningDashboard /></ProtectedRoute>} />
            <Route path="/admin/id-cards" element={<ProtectedRoute roles={["ADMIN", "SUPER_ADMIN"]}><IDCardsDashboard mode="overview" /></ProtectedRoute>} />
            <Route path="/admin/id-cards/students" element={<ProtectedRoute roles={["ADMIN", "SUPER_ADMIN"]}><IDCardsDashboard mode="students" /></ProtectedRoute>} />
            <Route path="/admin/id-cards/staff" element={<ProtectedRoute roles={["ADMIN", "SUPER_ADMIN"]}><IDCardsDashboard mode="staff" /></ProtectedRoute>} />
            <Route path="/admin/id-cards/templates" element={<ProtectedRoute roles={["ADMIN", "SUPER_ADMIN"]}><IDCardsDashboard mode="templates" /></ProtectedRoute>} />
            <Route path="/portal/admin/id-cards" element={<ProtectedRoute roles={["ADMIN", "SUPER_ADMIN"]}><IDCardsDashboard mode="overview" /></ProtectedRoute>} />
            <Route path="/portal/admin/id-cards/students" element={<ProtectedRoute roles={["ADMIN", "SUPER_ADMIN"]}><IDCardsDashboard mode="students" /></ProtectedRoute>} />
            <Route path="/portal/admin/id-cards/staff" element={<ProtectedRoute roles={["ADMIN", "SUPER_ADMIN"]}><IDCardsDashboard mode="staff" /></ProtectedRoute>} />
            <Route path="/portal/admin/id-cards/templates" element={<ProtectedRoute roles={["ADMIN", "SUPER_ADMIN"]}><IDCardsDashboard mode="templates" /></ProtectedRoute>} />
            <Route path="/dashboard/finance" element={<ProtectedRoute roles={["ADMIN", "SUPER_ADMIN", "FINANCE_OFFICER"]}><FinanceDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/payments" element={<ProtectedRoute roles={["ADMIN", "SUPER_ADMIN", "FINANCE_OFFICER"]}><AdminPaymentsDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/donations" element={<ProtectedRoute roles={["ADMIN", "SUPER_ADMIN", "FINANCE_OFFICER"]}><DonationsDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/site-profiles" element={<ProtectedRoute roles={["SUPER_ADMIN"]}><SiteRoleProfilesDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/transport" element={<ProtectedRoute roles={["ADMIN", "TRANSPORT_ADMIN"]}><TransportDashboard /></ProtectedRoute>} />
            <Route path="/portal/parent/transport" element={<ProtectedRoute roles={["PARENT"]}><ParentTransportDashboard /></ProtectedRoute>} />
            <Route path="/portal/transport/driver" element={<ProtectedRoute roles={["DRIVER"]}><TransportDriverDashboard /></ProtectedRoute>} />
          </Routes>
        </DomainBoundary>
      </Router>
    </AuthProvider>
  );
}













