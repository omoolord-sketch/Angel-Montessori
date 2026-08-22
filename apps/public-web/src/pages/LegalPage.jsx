import { Link } from "react-router-dom";
import PublicSiteLayout from "../components/PublicSiteLayout";

const lastUpdated = "19 May 2026";

const privacySections = [
  {
    title: "1. Who We Are",
    body: [
      "Angel Montessori School operates the public website, school portal, and mobile app used by parents, pupils, applicants, teachers, staff, and administrators.",
      "This Privacy Policy explains how we collect, use, protect, and manage personal information connected with our school services.",
    ],
  },
  {
    title: "2. Information We Collect",
    body: [
      "We may collect names, contact details, addresses, parent or guardian details, student profile information, class information, admission records, attendance, homework, assessment records, report card information, fee and invoice records, payment references, uploaded photos or documents, and portal account activity.",
      "When you use the mobile app or portal, we may also receive basic technical information such as device type, app version, login activity, error reports, and security logs needed to keep the service reliable.",
    ],
  },
  {
    title: "3. How We Use Information",
    body: [
      "We use information to manage school records, support learning, communicate with families, process admissions, display academic updates, manage attendance, handle homework and CBT access, issue invoices and receipts, and provide secure portal access.",
      "We also use limited technical information to protect accounts, troubleshoot errors, improve the website and app, and comply with school administration requirements.",
    ],
  },
  {
    title: "4. Student And Child Data",
    body: [
      "Student information is used only for school management, learning support, parent visibility, safeguarding, reporting, and approved administrative purposes.",
      "We do not sell student data. Access to student information is limited to authorised school users, parents or guardians, and service providers who help deliver the school platform.",
    ],
  },
  {
    title: "5. Payments",
    body: [
      "School fee payments may be processed through approved payment providers such as Paystack. We store school invoice details, payment status, receipt information, and provider references.",
      "We do not store full card numbers or banking credentials on the Angel Montessori School portal or mobile app.",
    ],
  },
  {
    title: "6. Sharing Information",
    body: [
      "We may share limited information with authorised staff, parents or guardians, trusted service providers, payment processors, regulators, or law enforcement where required by law or school policy.",
      "We do not sell personal information to advertisers or unrelated third parties.",
    ],
  },
  {
    title: "7. Security And Retention",
    body: [
      "We use account controls, password protection, role-based access, and operational safeguards to protect school data. No system is perfect, but we work to keep information secure and access controlled.",
      "Records are retained for as long as needed for school operations, legal obligations, financial records, safeguarding, academic history, and legitimate administrative purposes.",
    ],
  },
  {
    title: "8. Your Choices And Requests",
    body: [
      "Parents, guardians, staff, and eligible users may contact the school to request correction of inaccurate information, account support, or clarification about data held in the school system.",
      "Some records may need to be retained where required for school administration, child protection, finance, legal compliance, or academic history.",
    ],
  },
  {
    title: "9. Cookies And Analytics",
    body: [
      "The website may use basic cookies or browser storage to support navigation, portal login, security, and performance. The mobile app may use secure local storage for login sessions.",
      "We do not use the school portal to serve third-party advertising.",
    ],
  },
  {
    title: "10. Contact",
    body: [
      "For privacy questions or data support, contact Angel Montessori School at info@angelmontessori.ng or visit the school office at 152 Okedogbon Road, Owo, Ondo State, Nigeria.",
    ],
  },
];

const termsSections = [
  {
    title: "1. Acceptance Of Terms",
    body: [
      "By using the Angel Montessori School website, school portal, or mobile app, you agree to use the platform responsibly and only for legitimate school-related purposes.",
    ],
  },
  {
    title: "2. Account Access",
    body: [
      "Portal and mobile app access is available only to authorised students, parents, teachers, staff, applicants, and administrators. Users must keep login details confidential and report suspected account misuse promptly.",
      "The school may suspend or restrict access where an account is misused, inactive, compromised, or no longer connected to an authorised school relationship.",
    ],
  },
  {
    title: "3. School Information And Records",
    body: [
      "The portal may display attendance, homework, school fees, report cards, learning updates, CBT access, admissions status, and other school records. The school works to keep this information accurate, but official records may be verified through the school office when needed.",
    ],
  },
  {
    title: "4. Payments And Receipts",
    body: [
      "School fee payments made through the portal are handled by approved payment providers. Payment confirmation may depend on successful provider verification and school reconciliation.",
      "Users should not mark payments as complete based only on a payment screen unless the portal or school confirms the transaction.",
    ],
  },
  {
    title: "5. Acceptable Use",
    body: [
      "Users must not attempt to access accounts or records that do not belong to them, upload harmful files, disrupt the platform, share false information, or use school systems for harassment, fraud, or unauthorised activity.",
    ],
  },
  {
    title: "6. Content And Intellectual Property",
    body: [
      "School branding, page content, portal screens, documents, learning resources, and system designs remain the property of Angel Montessori School or its authorised partners unless otherwise stated.",
    ],
  },
  {
    title: "7. Availability",
    body: [
      "We aim to keep the website, portal, and app available, but access may be interrupted by maintenance, hosting issues, network problems, updates, or events outside the school's control.",
    ],
  },
  {
    title: "8. Changes",
    body: [
      "Angel Montessori School may update these terms, the platform, or related school processes when necessary. Continued use of the website, portal, or app means you accept the updated terms.",
    ],
  },
  {
    title: "9. Contact",
    body: [
      "For support, contact Angel Montessori School at info@angelmontessori.ng or +234 803 506 7767.",
    ],
  },
];

function LegalSection({ section }) {
  const id = section.title.toLowerCase().includes("cookies") ? "cookies" : undefined;
  return (
    <article className="public-legal-section" id={id}>
      <h2>{section.title}</h2>
      {section.body.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </article>
  );
}

export default function LegalPage({ type = "privacy" }) {
  const isPrivacy = type === "privacy";
  const title = isPrivacy ? "Privacy Policy" : "Terms and Conditions";
  const kicker = isPrivacy ? "Privacy & Data Protection" : "Platform Terms";
  const intro = isPrivacy
    ? "How Angel Montessori School collects, uses, protects, and manages information across the website, portal, and mobile app."
    : "The rules for responsible use of the Angel Montessori School website, portal, and mobile app.";
  const sections = isPrivacy ? privacySections : termsSections;

  return (
    <PublicSiteLayout>
      <section className="public-legal-hero">
        <div className="public-kicker">{kicker}</div>
        <h1>{title}</h1>
        <p>{intro}</p>
        <div className="public-legal-meta">Last updated: {lastUpdated}</div>
      </section>

      <section className="public-main-wrap public-legal-layout">
        <div className="public-legal-main public-card">
          {sections.map((section) => (
            <LegalSection key={section.title} section={section} />
          ))}
        </div>

        <aside className="public-legal-side">
          <article className="public-card">
            <div className="public-kicker">Google Play Ready</div>
            <h3>Policy URLs</h3>
            <p>Use these direct links when completing Google Play Console forms.</p>
            <div className="public-side-link-list">
              <Link className="public-side-link" to="/privacy-policy">
                <strong>Privacy Policy</strong>
                <p>https://angelmontessori.ng/privacy-policy</p>
              </Link>
              <Link className="public-side-link" to="/terms">
                <strong>Terms and Conditions</strong>
                <p>https://angelmontessori.ng/terms</p>
              </Link>
            </div>
          </article>

          <article className="public-card">
            <div className="public-kicker">Need Help?</div>
            <h3>Contact the school</h3>
            <p>For policy questions, account support, or data correction requests, contact the school office.</p>
            <div className="public-actions">
              <Link className="public-btn primary" to="/contact">Contact School</Link>
            </div>
          </article>
        </aside>
      </section>
    </PublicSiteLayout>
  );
}
