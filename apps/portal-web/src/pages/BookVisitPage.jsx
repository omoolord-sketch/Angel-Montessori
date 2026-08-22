import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getEnquiryPublicConfig, submitVisitRequest } from "../api/services";
import PublicSiteLayout from "../components/PublicSiteLayout";

const initialForm = {
  fullName: "",
  phone: "",
  email: "",
  intendedClass: "",
  preferredVisitDate: "",
  preferredVisitTime: "",
  numberOfVisitors: 1,
  message: "",
};

export default function BookVisitPage() {
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
  const visitGuidance = useMemo(() => config?.visitGuidance || [], [config]);

  const onChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      await submitVisitRequest(form);
      setForm(initialForm);
      setSuccess("Thank you. Your visit request has been received and the admissions office will confirm the schedule shortly.");
    } catch (err) {
      setError(err?.response?.data?.message || "We could not submit your visit request.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PublicSiteLayout>
      <section
        className="public-page-banner"
        style={{ backgroundImage: "url('/assets/school-building-3.jpg')" }}
      >
        <div className="public-page-banner-inner">
          <div className="public-kicker">Book A School Visit</div>
          <h1 className="public-page-banner-title">Plan a visit to Angel Montessori School</h1>
          <p>Choose your preferred visit date and time so your family can meet the school, ask questions, and explore the right class level.</p>
        </div>
      </section>

      <section className="public-main-wrap">
        <div className="public-grid-2">
          <article className="public-card">
            <h3>Visit Request Form</h3>
            <form className="public-form" onSubmit={handleSubmit}>
              <label>
                Full Name
                <input type="text" required value={form.fullName} onChange={(e) => onChange("fullName", e.target.value)} />
              </label>

              <label>
                Phone Number
                <input type="tel" required value={form.phone} onChange={(e) => onChange("phone", e.target.value)} />
              </label>

              <label>
                Email Address
                <input type="email" value={form.email} onChange={(e) => onChange("email", e.target.value)} />
              </label>

              <label>
                Interested Class Level
                <select required value={form.intendedClass} onChange={(e) => onChange("intendedClass", e.target.value)}>
                  <option value="">Select class</option>
                  {classOptions.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>

              <label>
                Preferred Visit Date
                <input type="date" required value={form.preferredVisitDate} onChange={(e) => onChange("preferredVisitDate", e.target.value)} />
              </label>

              <label>
                Preferred Visit Time
                <input type="time" value={form.preferredVisitTime} onChange={(e) => onChange("preferredVisitTime", e.target.value)} />
              </label>

              <label>
                Number Of Visitors
                <input type="number" min="1" max="10" value={form.numberOfVisitors} onChange={(e) => onChange("numberOfVisitors", e.target.value)} />
              </label>

              <label>
                Message
                <textarea rows="4" value={form.message} onChange={(e) => onChange("message", e.target.value)} placeholder="Optional note about your visit, child, or preferred discussion points." />
              </label>

              <button className="public-btn primary" type="submit" disabled={saving}>
                {saving ? "Submitting..." : "Request Visit"}
              </button>
            </form>

            {success ? <p className="public-success">{success}</p> : null}
            {error ? <p className="public-error">{error}</p> : null}
          </article>

          <article className="public-card">
            <h3>Visit Guidance</h3>
            <ul>
              {visitGuidance.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <div className="public-actions" style={{ marginTop: 18 }}>
              <Link className="public-btn secondary" to="/admissions-enquiry">Admissions Enquiry</Link>
              <Link className="public-btn secondary" to="/contact">Contact The School</Link>
            </div>
          </article>
        </div>
      </section>
    </PublicSiteLayout>
  );
}
