import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import DomainAwareLink from "../components/DomainAwareLink";
import { isTeacherRole } from "../utils/roleHelpers";
import "./PortalSurface.css";

const enquiryLinks = [
  ["/admin/enquiries/dashboard", "Enquiries Dashboard"],
  ["/admin/enquiries/callbacks", "Callback Requests"],
  ["/admin/enquiries/visits", "Visit Requests"],
  ["/admin/enquiries/reports", "Enquiry Reports"],
];

const adminLinks = [
  ["/dashboard/academic-systems", "Academic Systems"],
  ["/dashboard/early-years-curriculum", "Early Years Curriculum"],
  ["/dashboard/early-years-reports", "Early Years Reports"],
  ["/dashboard/early-years-qa", "Early Years Quality Assurance"],
  ["/dashboard/student-registry", "Student Registry"],
  ["/dashboard/report-card", "Report Card Dashboard"],
  ["/dashboard/continuous-assessment", "Continuous Assessment"],
  ["/dashboard/broadsheet", "Termly Broadsheet"],
  ["/dashboard/attendance", "Attendance"],
  ["/dashboard/cbt", "CBT"],
  ["/dashboard/grading", "Grading"],
  ["/dashboard/homework", "Homework"],
  ["/dashboard/library", "Library"],
  ["/admin/lms/dashboard", "LMS"],
  ["/dashboard/academic-calendar", "Academic Calendar"],
  ["/dashboard/scheme-of-work", "Scheme of Work"],
  ["/dashboard/lesson-notes", "Lesson Notes"],
  ["/dashboard/promotion", "Promotion"],
  ["/dashboard/sms", "SMS"],
  ["/dashboard/teacher-analytics", "Teacher Analytics"],
  ["/admin/admissions/dashboard", "Admissions Admin"],
  ["/dashboard/users", "User Management"],
  ["/dashboard/provisioning", "Account Provisioning"],
  ["/admin/id-cards", "ID Cards"],
  ["/dashboard/finance", "Finance"],
  ["/dashboard/payments", "School Fees"],
  ["/dashboard/donations", "Donations"],
  ["/admin/cbt/recruitment", "Recruitment Assessments"],
  ["/dashboard/transport", "Transport Operations"],
  ["/dashboard/careers", "Careers Dashboard"],
  ["/dashboard/teacher-registration", "Teacher Registration / Profiles"],
  ["/admin/enquiries/dashboard", "Enquiries Dashboard"],
];

const superAdminLinks = [
  ["/dashboard/academic-systems", "Academic Systems"],
  ["/dashboard/early-years-curriculum", "Early Years Curriculum"],
  ["/dashboard/early-years-reports", "Early Years Reports"],
  ["/dashboard/early-years-qa", "Early Years Quality Assurance"],
  ["/dashboard/student-registry", "Student Registry"],
  ["/dashboard/continuous-assessment", "Continuous Assessment"],
  ["/admin/cbt/exams", "CBT Credentials"],
  ["/admin/cbt/recruitment", "Recruitment Assessments"],
  ["/dashboard/users", "User Management"],
  ["/dashboard/provisioning", "Account Provisioning"],
  ["/admin/id-cards", "ID Cards"],
  ["/dashboard/finance", "Finance"],
  ["/dashboard/payments", "School Fees"],
  ["/dashboard/donations", "Donations"],
  ["/admin/enquiries/dashboard", "Enquiries Dashboard"],
  ["/dashboard/careers", "Careers Dashboard"],
  ["/dashboard/teacher-registration", "Teacher Registration / Profiles"],
  ["/dashboard/academic-calendar", "Academic Calendar"],
  ["/dashboard/scheme-of-work", "Scheme of Work"],
  ["/dashboard/lesson-notes", "Lesson Notes"],
];

const transportAdminLinks = [["/dashboard/transport", "Transport Operations"]];
const driverLinks = [["/portal/transport/driver", "My Transport Trips"]];

const hrOfficerLinks = [
  ["/dashboard/careers", "Careers Dashboard"],
  ["/dashboard/teacher-registration", "Teacher Registration / Profiles"],
  ["/admin/cbt/recruitment", "Recruitment Assessments"],
  ["/admin/careers/applications", "Applications"],
  ["/admin/careers/interviews", "Interviews"],
  ["/admin/careers/reports", "Hiring Reports"],
];

const teacherLinks = [
  ["/teacher/subject", "Subject Workspace"],
  ["/teacher/early-years/curriculum", "Early Years Curriculum"],
  ["/teacher/early-years/reports", "Early Years Reports"],
  ["/teacher/early-years/my-quality-tasks", "My Quality Tasks"],
  ["/teacher/continuous-assessment", "Continuous Assessment"],
  ["/dashboard/attendance", "Attendance"],
  ["/dashboard/cbt", "CBT Question Bank"],
  ["/dashboard/broadsheet", "Class Broadsheet"],
  ["/dashboard/library", "E-Library"],
  ["/teacher/lms/dashboard", "LMS"],
  ["/teacher/analytics", "My Analytics"],
  ["/dashboard/academic-calendar", "Academic Calendar"],
  ["/teacher/scheme-of-work", "Scheme of Work"],
  ["/teacher/lesson-notes", "Lesson Notes"],
];

const academicOfficerLinks = [
  ["/dashboard/academic-systems", "Academic Systems"],
  ["/dashboard/early-years-curriculum", "Early Years Curriculum"],
  ["/dashboard/early-years-reports", "Early Years Reports"],
  ["/dashboard/early-years-qa", "Early Years Quality Assurance"],
  ["/dashboard/student-registry", "Student Registry"],
  ["/dashboard/continuous-assessment", "Continuous Assessment"],
  ["/admin/cbt/exams", "CBT Credentials"],
  ["/admin/cbt/recruitment", "Recruitment Assessments"],
  ["/dashboard/lms/class-subjects", "Class Subject Assignment"],
  ["/dashboard/lms/setup", "Class Subject Setup"],
  ["/dashboard/lms/reports", "LMS Reports"],
  ["/dashboard/academic-calendar", "Academic Calendar"],
  ["/admin/academic-calendar/sessions", "Calendar Sessions"],
  ["/admin/academic-calendar/terms", "Calendar Terms"],
  ["/admin/academic-calendar/events", "Calendar Events"],
  ["/admin/academic-calendar/preview", "Calendar Preview"],
  ["/admin/academic-calendar/archive", "Calendar Archive"],
  ["/dashboard/scheme-of-work", "Scheme of Work"],
  ["/dashboard/lesson-notes", "Lesson Notes"],
  ["/admin/lesson-notes/reviews", "Lesson Note Reviews"],
  ["/admin/scheme-of-work/approvals", "Scheme Approvals"],
  ["/admin/scheme-of-work/progress", "Scheme Progress"],
];

const admissionOfficerLinks = [
  ...enquiryLinks,
  ["/admin/admissions/dashboard", "Admissions Admin"],
];

const financeOfficerLinks = [
  ["/dashboard/payments", "School Fees"],
  ["/dashboard/donations", "Donations"],
  ["/dashboard/finance", "Finance Overview"],
  ["/dashboard/finance", "Student Fees"],
  ["/dashboard/finance", "Expenses & Purchases"],
  ["/dashboard/finance", "Payroll & Reports"],
];

const ictAdminLinks = [
  ["/admin/enquiries/dashboard", "Enquiries Dashboard"],
  ["/dashboard/users", "User Management"],
  ["/dashboard/library", "Library"],
];

const roleSummaries = {
  ADMIN: {
    title: "Angel Montessori Operations Portal",
    subtitle:
      "Manage academics, admissions, payments, transport, enquiries, careers, and school records from one central school desk.",
  },
  SUPER_ADMIN: {
    title: "Angel Montessori Operations Portal",
    subtitle:
      "Oversee the full school system, from learning records and users to admissions, transport, enquiries, and finance.",
  },
  TRANSPORT_ADMIN: {
    title: "Angel Montessori Transport Desk",
    subtitle:
      "Coordinate routes, vehicles, student assignments, trip logs, incidents, and transport follow-up from one place.",
  },
  DRIVER: {
    title: "Angel Montessori Driver Portal",
    subtitle:
      "Open your assigned transport trips, record pickup and dropoff updates, and keep parents informed through accurate trip logs.",
  },
  HR_OFFICER: {
    title: "Angel Montessori Careers Desk",
    subtitle:
      "Review vacancies, applications, interviews, and hiring records for the teaching, administration, and support teams.",
  },
  ACADEMIC_OFFICER: {
    title: "Angel Montessori Academic Planning Desk",
    subtitle:
      "Assign class subjects, register students into the right classes, plan sessions and terms, review lesson delivery, and coordinate academic coverage across Crèche, Nursery, Basic, and college classes.",
  },
  ADMISSION_OFFICER: {
    title: "Angel Montessori Admissions Desk",
    subtitle:
      "Guide enquiries, review applications, schedule visits, and manage admissions decisions with clear school records.",
  },
  FINANCE_OFFICER: {
    title: "Angel Montessori Finance Desk",
    subtitle:
      "Manage student fees, ledger records, expenses, payroll, budgets, and finance reporting from one structured school workspace.",
  },
  ICT_ADMIN: {
    title: "Angel Montessori ICT Portal",
    subtitle:
      "Support user accounts, digital learning tools, enquiries access, and the school's online systems from one workspace.",
  },
  TEACHER: {
    title: "Angel Montessori Teacher Portal",
    subtitle:
      "Move between your class records, scheme of work, homework, CBT resources, broadsheets, analytics, and LMS tools with one login.",
  },
  CLASS_TEACHER: {
    title: "Angel Montessori Class Teacher Portal",
    subtitle:
      "Open attendance, broadsheets, lesson planning, analytics, homework, and LMS tools for the classes and subjects under your care.",
  },
  ASSIST_CLASS_TEACHER: {
    title: "Angel Montessori Assistant Class Teacher Portal",
    subtitle:
      "Work across assigned class subjects, lesson planning, homework, analytics, and LMS tools alongside the lead class teacher.",
  },
  STUDENT: {
    title: "Angel Montessori Student Portal",
    subtitle:
      "Check class progress, homework, CBT access, E-Library resources, and student learning records from one school view.",
  },
  PARENT: {
    title: "Angel Montessori Parent Portal",
    subtitle:
      "Follow your child's attendance, transport, homework, fees, and school updates in one clear parent view.",
  },
  APPLICANT: {
    title: "Angel Montessori Applicant Portal",
    subtitle:
      "Complete your admission application, review submitted details, and track the next admission steps for your child.",
  },
};

function formatRole(role) {
  return String(role || "")
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function PortalHomePage() {
  const { user, logout } = useAuth();
  const role = user?.role || "";
  const summary = roleSummaries[role] || {
    title: "Angel Montessori Portal",
    subtitle: "Open the school tools and records available to your account.",
  };
  const applicantType = String(user?.applicantType || "").toUpperCase();
  const applicantSummary = role === "APPLICANT" && applicantType === "RECRUITMENT"
    ? {
        title: "Angel Montessori Recruitment Applicant Portal",
        subtitle:
          "Review your teaching application, open assigned recruitment assessments, and follow interview and shortlist updates from one applicant workspace.",
      }
    : summary;

  const links =
    role === "SUPER_ADMIN"
      ? superAdminLinks
      : role === "ADMIN"
      ? adminLinks
      : role === "TRANSPORT_ADMIN"
        ? transportAdminLinks
        : role === "DRIVER"
          ? driverLinks
          : role === "HR_OFFICER"
            ? hrOfficerLinks
            : role === "ACADEMIC_OFFICER"
              ? academicOfficerLinks
              : role === "ADMISSION_OFFICER"
                ? admissionOfficerLinks
                : role === "FINANCE_OFFICER"
                  ? financeOfficerLinks
                  : role === "ICT_ADMIN"
                    ? ictAdminLinks
                    : isTeacherRole(role)
                      ? teacherLinks
                      : role === "STUDENT"
                        ? [["/portal/student", "Student Dashboard"], ["/student/lms/dashboard", "LMS"], ["/cbt/exam", "CBT Exam Login"], ["/dashboard/library", "E-Library"]]
                        : role === "PARENT"
                          ? [["/portal/parent", "Parent Dashboard"], ["/portal/parent/early-years/reports", "Early Years Reports"], ["/portal/parent/transport", "Child Transport"], ["/parent/lms/dashboard", "LMS"]]
                          : role === "APPLICANT"
                            ? applicantType === "RECRUITMENT"
                              ? [["/applicant/recruitment", "My Recruitment Dashboard"], ["/cbt/exam", "Assessment Login"]]
                              : [["/applicant/dashboard", "My Admission Application"]]
                            : [];

  return (
    <div className="portal-surface-page">
      <div className="portal-surface-shell">
        <section className="portal-surface-hero">
          <div className="portal-surface-hero-copy">
            <div className="portal-surface-kicker">Angel Montessori School</div>
            <h1 className="portal-surface-title">{applicantSummary.title}</h1>
            <p className="portal-surface-motto">In God We Trust</p>
            <p className="portal-surface-meta">
              Welcome back, <strong>{user?.name}</strong>
            </p>
            <p className="portal-surface-subtitle">
              {applicantSummary.subtitle}
              {role ? ` You are signed in with ${formatRole(role)} access.` : ""}
            </p>
          </div>

          <div className="portal-surface-actions">
            <DomainAwareLink to="/" className="portal-surface-action secondary">Public Website</DomainAwareLink>
            <button type="button" onClick={logout} className="portal-surface-action primary">Logout</button>
          </div>
        </section>

        {role === "SUPER_ADMIN" ? (
          <section className="portal-surface-featured">
            <div className="portal-surface-featured-copy">
              <div className="portal-surface-kicker">Website Management</div>
              <h2 className="portal-surface-featured-title">Update leadership and governance role holders</h2>
              <p className="portal-surface-subtitle">
                Open the website profile manager to add, remove, or update the changing leadership and governance
                positions without touching code. The Head of School and Deputy Head of School remain locked.
              </p>
            </div>
            <Link to="/dashboard/site-profiles" className="portal-surface-action primary">
              Open Profile Manager
            </Link>
          </section>
        ) : null}

        <div className="portal-link-grid">
          {links.map(([to, label]) => (
            <Link key={to} to={to} className="portal-link-card">
              <strong>{label}</strong>
            </Link>
          ))}
        </div>

        {!links.length ? (
          <div className="portal-surface-empty">
            Your account is active, but no portal modules are assigned yet. Please contact the school office if you should have access to more school tools.
          </div>
        ) : null}
      </div>
    </div>
  );
}


