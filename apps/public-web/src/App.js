import { useEffect } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import ParentBlockedRoute from "./components/ParentBlockedRoute";
import ProtectedRoute from "./components/ProtectedRoute";
import { getPortalUrl } from "./utils/domainLinks";

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
import ApplicantAdmissionsDashboard from "./pages/ApplicantAdmissionsDashboard";
import CBTExamPage from "./pages/CBTExamPage";
import LegalPage from "./pages/LegalPage";
import { publicContentRoutes } from "./content/publicSiteContent";

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

function ExternalDomainRedirect({ to }) {
  useEffect(() => {
    if (typeof window !== "undefined" && to) {
      window.location.replace(to);
    }
  }, [to]);

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
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
          <Route path="/privacy-policy" element={<LegalPage type="privacy" />} />
          <Route path="/privacy" element={<LegalPage type="privacy" />} />
          <Route path="/terms" element={<LegalPage type="terms" />} />
          <Route path="/terms-and-conditions" element={<LegalPage type="terms" />} />
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
              element={
                route.key === "headOfSchool" ? (
                  <HeadOfSchoolPage />
                ) : route.key === "history" ? (
                  <OurStoryPage />
                ) : route.key === "eLearning" ? (
                  <VirtualClassroomPage />
                ) : (
                  <PublicContentPage pageKey={route.key} />
                )
              }
            />
          ))}

          <Route
            path="/cbt/exam"
            element={
              <ParentBlockedRoute>
                <CBTExamPage />
              </ParentBlockedRoute>
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

          <Route path="/login" element={<ExternalDomainRedirect to={getPortalUrl("/login")} />} />
          <Route path="/portal/*" element={<ExternalDomainRedirect to={getPortalUrl("/login")} />} />
          <Route path="/dashboard/*" element={<ExternalDomainRedirect to={getPortalUrl("/login")} />} />
          <Route path="/teacher/*" element={<ExternalDomainRedirect to={getPortalUrl("/login")} />} />
          <Route path="/student/*" element={<ExternalDomainRedirect to={getPortalUrl("/login")} />} />
          <Route path="/parent/*" element={<ExternalDomainRedirect to={getPortalUrl("/login")} />} />
          <Route path="/admin/*" element={<ExternalDomainRedirect to={getPortalUrl("/login")} />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
