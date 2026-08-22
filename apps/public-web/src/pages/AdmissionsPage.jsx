import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { getAdmissionsPublicConfig, submitAdmissionInquiry } from "../api/services";
import PublicSiteLayout from "../components/PublicSiteLayout";

const initialForm = {
  childName: "",
  applyingClass: "",
  childAge: "",
  parentName: "",
  email: "",
  phone: "",
  notes: "",
};

const fallbackClassOptions = [
  "Creche",
  "Nursery 1",
  "Nursery 2",
  "Reception",
  "Basic 1",
  "Basic 2",
  "Basic 3",
  "Basic 4",
  "Basic 5",
  "Basic 6",
  "JSS1",
  "JSS2",
  "JSS3",
  "SS1",
  "SS2",
  "SS3",
];

const fallbackSteps = [
  "Create applicant account",
  "Complete multi-step application form",
  "Upload required documents",
  "Pay application fee",
  "Submit and track status",
  "Attend screening and check decision",
];

function formatNaira(value) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export default function AdmissionsPage() {
  const [config, setConfig] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true);
        const res = await getAdmissionsPublicConfig();
        setConfig(res?.data || null);
      } catch {
        setConfig(null);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  const classOptions = useMemo(() => {
    const rows = Array.isArray(config?.classes) ? config.classes : [];
    if (rows.length > 0) return rows.map((row) => row.className);
    return fallbackClassOptions;
  }, [config]);

  const processSteps = Array.isArray(config?.processSteps) && config.processSteps.length > 0
    ? config.processSteps
    : fallbackSteps;

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError("");
      await submitAdmissionInquiry({
        ...form,
        childAge: Number(form.childAge),
      });
      setSubmitted(true);
      setForm(initialForm);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to submit inquiry");
    } finally {
      setSaving(false);
    }
  };

  const activeSession = config?.activeSession || null;

  return (
    <PublicSiteLayout>
      <section
        className="public-page-banner"
        style={{
          backgroundImage: "url('/assets/school-building-3.jpg')",
        }}
      >
        <div className="public-page-banner-inner">
          <div className="public-kicker">Admissions</div>
          <h1 className="public-page-banner-title">
            {activeSession ? activeSession.title : "Admissions to Angel Montessori School"}
          </h1>
          <p>
            Start your admission journey with clear guidance on enquiries, visits, application steps, document review, and enrolment support.
          </p>
          <div className="public-hero-actions">
            <Link to="/admissions/register" className="public-btn primary">Apply Now</Link>
            <Link to="/cbt/exam" className="public-btn secondary">Entrance Exam Login</Link>
            <Link to="/admissions/login" className="public-btn secondary">Applicant Login</Link>
          </div>
        </div>
      </section>

      <section className="public-main-wrap">
        <div className="public-grid-2" style={{ marginBottom: "14px" }}>
          <article className="public-card">
            <div className="public-kicker">Why Families Start Here</div>
            <h3>Clear guidance before full application</h3>
            <p>
              Families often want to understand the right entry class, document expectations, school fees, and how screening works before opening a full application. This page brings those first decisions into one clear place.
            </p>
          </article>
          <article className="public-card">
            <div className="public-kicker">Support Options</div>
            <h3>Talk to admissions in the way that suits you</h3>
            <p>
              If you are not ready to begin the full application immediately, you can still ask questions, request a callback, book a school visit, or open the CBT login when the admissions team has scheduled your entrance screening.
            </p>
            <div className="public-actions">
              <Link to="/admissions-enquiry" className="public-btn secondary">Admission Enquiry</Link>
              <Link to="/cbt/exam" className="public-btn secondary">Entrance Exam Login</Link>
              <Link to="/request-callback" className="public-btn secondary">Request Callback</Link>
              <Link to="/book-a-visit" className="public-btn secondary">Book a Visit</Link>
            </div>
          </article>
        </div>

        <div className="public-grid-3">
          <article className="public-card">
            <h3>Application Fee</h3>
            <p>
              {activeSession ? formatNaira(activeSession.applicationFee) : "Set in active admission session"}
            </p>
          </article>
          <article className="public-card">
            <h3>Acceptance Fee</h3>
            <p>
              {activeSession ? formatNaira(activeSession.acceptanceFee) : "Set in active admission session"}
            </p>
          </article>
          <article className="public-card">
            <h3>Deadline</h3>
            <p>{activeSession?.endDate || "Configured by admissions office"}</p>
            {loading ? <p className="public-note">Loading admission details...</p> : null}
          </article>
        </div>

        <div className="public-grid-2">
          <article className="public-card">
            <h3>Classes Open for Application</h3>
            <ul>
              {(config?.classes || []).length === 0
                ? classOptions.map((item) => <li key={item}>{item}</li>)
                : config.classes.map((row) => (
                    <li key={row.id}>
                      {row.className}
                      {row.capacity ? ` (Capacity: ${row.capacity})` : ""}
                    </li>
                  ))}
            </ul>
          </article>

          <article className="public-card">
            <h3>Admission Process</h3>
            <ol>
              {processSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <div className="public-actions">
              <Link to="/admissions/requirements" className="public-btn secondary">View Requirements</Link>
              <Link to="/cbt/exam" className="public-btn secondary">Entrance Exam Login</Link>
              <Link to="/admissions/faq" className="public-btn secondary">Admissions FAQ</Link>
            </div>
          </article>
        </div>

        <div className="public-grid-2">
          <article className="public-card">
            <h3>Quick Inquiry Form</h3>
            <p className="public-note">Need help before starting the full application? Send a quick admissions enquiry and the school team will guide you on the right next step.</p>

            <form className="public-form" onSubmit={handleSubmit}>
              <label>
                Child's Full Name
                <input type="text" required value={form.childName} onChange={(e) => onChange("childName", e.target.value)} />
              </label>

              <label>
                Applying Class
                <select required value={form.applyingClass} onChange={(e) => onChange("applyingClass", e.target.value)}>
                  <option value="">Select class</option>
                  {classOptions.map((cls) => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </label>

              <label>
                Child's Age
                <input type="number" min="1" max="20" required value={form.childAge} onChange={(e) => onChange("childAge", e.target.value)} />
              </label>

              <label>
                Parent/Guardian Name
                <input type="text" required value={form.parentName} onChange={(e) => onChange("parentName", e.target.value)} />
              </label>

              <label>
                Email Address
                <input type="email" required value={form.email} onChange={(e) => onChange("email", e.target.value)} />
              </label>

              <label>
                Phone Number
                <input type="tel" required value={form.phone} onChange={(e) => onChange("phone", e.target.value)} />
              </label>

              <label>
                Notes
                <textarea rows="4" value={form.notes} onChange={(e) => onChange("notes", e.target.value)} />
              </label>

              <button className="public-btn primary" type="submit" disabled={saving}>
                {saving ? "Submitting..." : "Submit Inquiry"}
              </button>
            </form>

            {submitted ? <p className="public-success">Thank you. Your admissions enquiry has been received and the admissions team will contact you shortly.</p> : null}
            {error ? <p className="public-error">{error}</p> : null}
          </article>

          <article className="public-card">
            <h3>Requirements Snapshot</h3>
            <p className="public-note">
              These are the main entry expectations families often ask about first. The full admissions team can clarify any class-specific requirement during your enquiry or visit.
            </p>
            <h4>Early Years</h4>
            <ul>
              {(config?.requirements?.earlyYears || []).map((item) => <li key={item}>{item}</li>)}
            </ul>
            <h4>Basic School</h4>
            <ul>
              {(config?.requirements?.basicSchool || []).map((item) => <li key={item}>{item}</li>)}
            </ul>
            <h4>Secondary School</h4>
            <ul>
              {(config?.requirements?.secondary || []).map((item) => <li key={item}>{item}</li>)}
            </ul>
          </article>
        </div>
      </section>
    </PublicSiteLayout>
  );
}
