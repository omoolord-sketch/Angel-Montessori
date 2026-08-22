import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getEnquiryPublicConfig, submitAdmissionsEnquiryForm } from "../api/services";
import PublicSiteLayout from "../components/PublicSiteLayout";

const initialForm = {
  fullName: "",
  phone: "",
  email: "",
  intendedClass: "",
  subject: "Admission enquiry",
  message: "",
};

export default function AdmissionsEnquiryPage() {
  const [config, setConfig] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getEnquiryPublicConfig();
        setConfig(res?.data || null);
      } catch {
        setConfig(null);
      }
    };
    load();
  }, []);

  const classOptions = useMemo(() => config?.classOptions || [], [config]);

  const onChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      await submitAdmissionsEnquiryForm(form);
      setForm(initialForm);
      setSuccess("Thank you. Your admissions enquiry has been received and the admissions team will contact you shortly.");
    } catch (err) {
      setError(err?.response?.data?.message || "We could not submit your admissions enquiry.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PublicSiteLayout>
      <section
        className="public-page-banner"
        style={{ backgroundImage: "url('/assets/school-building.jpg')" }}
      >
        <div className="public-page-banner-inner">
          <div className="public-kicker">Admissions Enquiry</div>
          <h1 className="public-page-banner-title">Speak with Angel Montessori admissions before you apply</h1>
          <p>Ask about entry classes, admission requirements, fees, screening, and the right starting point for your child.</p>
        </div>
      </section>

      <section className="public-main-wrap">
        <div className="public-grid-2">
          <article className="public-card">
            <h3>Admissions Enquiry Form</h3>
            <form className="public-form" onSubmit={handleSubmit}>
              <label>
                Full Name
                <input type="text" required value={form.fullName} onChange={(e) => onChange("fullName", e.target.value)} />
              </label>

              <label>
                Phone Number
                <input type="tel" value={form.phone} onChange={(e) => onChange("phone", e.target.value)} />
              </label>

              <label>
                Email Address
                <input type="email" value={form.email} onChange={(e) => onChange("email", e.target.value)} />
              </label>

              <label>
                Child's Intended Class
                <select required value={form.intendedClass} onChange={(e) => onChange("intendedClass", e.target.value)}>
                  <option value="">Select class</option>
                  {classOptions.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>

              <label>
                Subject
                <input type="text" value={form.subject} onChange={(e) => onChange("subject", e.target.value)} />
              </label>

              <label>
                Message
                <textarea rows="5" required value={form.message} onChange={(e) => onChange("message", e.target.value)} placeholder="Tell us what you would like to know about classes, fees, requirements, or the admission process." />
              </label>

              <button className="public-btn primary" type="submit" disabled={saving}>
                {saving ? "Submitting..." : "Submit Admissions Enquiry"}
              </button>
            </form>

            {success ? <p className="public-success">{success}</p> : null}
            {error ? <p className="public-error">{error}</p> : null}
          </article>

          <article className="public-card">
            <h3>Before You Apply</h3>
            <ul>
              <li>Check the class level most suitable for your child.</li>
              <li>Ask about admission requirements and screening expectations.</li>
              <li>Request current fees, transport options, and visit availability.</li>
              <li>Move to the online application when you are ready.</li>
            </ul>

            <div className="public-actions" style={{ marginTop: 18 }}>
              <Link className="public-btn secondary" to="/admissions">Admissions Overview</Link>
              <Link className="public-btn secondary" to="/book-a-visit">Book A Visit</Link>
              <Link className="public-btn secondary" to="/admissions/register">Apply Now</Link>
            </div>
          </article>
        </div>
      </section>
    </PublicSiteLayout>
  );
}
