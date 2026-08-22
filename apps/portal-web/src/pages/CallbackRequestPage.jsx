import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getEnquiryPublicConfig, submitCallbackRequest } from "../api/services";
import PublicSiteLayout from "../components/PublicSiteLayout";

const initialForm = {
  fullName: "",
  phone: "",
  email: "",
  reasonForCallback: "admission enquiry",
  preferredCallTime: "Morning",
  message: "",
};

export default function CallbackRequestPage() {
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

  const reasons = useMemo(() => config?.callbackReasons || [], [config]);
  const callTimes = useMemo(() => config?.callbackTimes || ["Morning", "Afternoon", "Evening"], [config]);

  const onChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      await submitCallbackRequest(form);
      setForm(initialForm);
      setSuccess("Thank you. Your callback request has been received and the school team will call you at the nearest available time.");
    } catch (err) {
      setError(err?.response?.data?.message || "We could not submit your callback request.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PublicSiteLayout>
      <section
        className="public-page-banner"
        style={{ backgroundImage: "url('/assets/school-building-2.jpg')" }}
      >
        <div className="public-page-banner-inner">
          <div className="public-kicker">Request A Callback</div>
          <h1 className="public-page-banner-title">Need Angel Montessori School to call you back?</h1>
          <p>Share your preferred contact time and the school will route the request to the right desk for admissions, fees, visits, or general support.</p>
        </div>
      </section>

      <section className="public-main-wrap">
        <div className="public-grid-2">
          <article className="public-card">
            <h3>Callback Request Form</h3>
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
                Reason For Callback
                <select value={form.reasonForCallback} onChange={(e) => onChange("reasonForCallback", e.target.value)}>
                  {reasons.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>

              <label>
                Preferred Call Time
                <select value={form.preferredCallTime} onChange={(e) => onChange("preferredCallTime", e.target.value)}>
                  {callTimes.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>

              <label>
                Message
                <textarea rows="4" value={form.message} onChange={(e) => onChange("message", e.target.value)} placeholder="Optional note to help the school team prepare for your call." />
              </label>

              <button className="public-btn primary" type="submit" disabled={saving}>
                {saving ? "Submitting..." : "Request Callback"}
              </button>
            </form>

            {success ? <p className="public-success">{success}</p> : null}
            {error ? <p className="public-error">{error}</p> : null}
          </article>

          <article className="public-card">
            <h3>Good Reasons To Use This</h3>
            <ul>
              <li>You need a quick admissions call without waiting on email.</li>
              <li>You want to ask about fees, transport, or visit scheduling.</li>
              <li>You are busy and prefer the school to contact you directly.</li>
            </ul>

            <div className="public-actions" style={{ marginTop: 18 }}>
              <Link className="public-btn secondary" to="/contact">General Contact</Link>
              <Link className="public-btn secondary" to="/book-a-visit">Book A Visit</Link>
            </div>
          </article>
        </div>
      </section>
    </PublicSiteLayout>
  );
}
