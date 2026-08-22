import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getEnquiryPublicConfig, submitPublicEnquiry } from "../api/services";
import PublicSiteLayout from "../components/PublicSiteLayout";

const initialForm = {
  fullName: "",
  phone: "",
  email: "",
  enquiryType: "general",
  intendedClass: "",
  subject: "",
  message: "",
};

const quickRoutes = [
  {
    title: "Admissions Enquiry",
    description: "Get help with entry class, admission process, fees, and next steps.",
    to: "/admissions-enquiry",
  },
  {
    title: "Request Callback",
    description: "Ask the school to call you back if you need guidance at a better time.",
    to: "/request-callback",
  },
  {
    title: "Book a Visit",
    description: "Schedule a school visit so your family can see the campus and ask questions in person.",
    to: "/book-a-visit",
  },
];

function titleCase(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export default function ContactPage() {
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
  const enquiryTypes = useMemo(() => config?.enquiryTypes || ["general", "admission", "fees", "transport", "academics", "result_support", "partnership", "complaint"], [config]);
  const office = config?.office || {
    phone: "+234 803 506 7767",
    whatsapp: "+234 803 506 7767",
    email: "info@angelmontessori.ng",
    admissionsEmail: "admissions@angelmontessori.ng",
    address: "152 Okedogbon Road, Owo, Ondo State, Nigeria",
    officeHours: "Monday - Friday, 8:00 AM - 4:00 PM",
  };

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      await submitPublicEnquiry({
        ...form,
        sourcePage: "contact_page",
      });
      setForm(initialForm);
      setSuccess("Thank you. Your enquiry has been received and the school team will follow up shortly.");
    } catch (err) {
      setError(err?.response?.data?.message || "We could not submit your enquiry right now.");
    } finally {
      setSaving(false);
    }
  };

  const requiresClass = ["admission", "visit_request"].includes(form.enquiryType);

  return (
    <PublicSiteLayout>
      <section
        className="public-page-banner"
        style={{
          backgroundImage: "url('/assets/home-about.jpg')",
          backgroundPosition: "center center",
        }}
      >
        <div className="public-page-banner-inner">
          <div className="public-kicker">Contact The School</div>
          <h1 className="public-page-banner-title">Contact Angel Montessori School</h1>
          <p>
            Reach Angel Montessori School for general enquiries, admissions guidance, callback requests, school visits,
            transport questions, and family support.
          </p>
          <div className="public-hero-actions">
            <a className="public-btn primary" href={`tel:${office.phone}`}>Call School</a>
            <a className="public-btn secondary" href={`https://wa.me/${String(office.whatsapp).replace(/[^\d]/g, "")}`}>WhatsApp Admissions</a>
          </div>
        </div>
      </section>

      <section className="public-main-wrap">
        <div className="public-grid-3" style={{ marginBottom: 24 }}>
          <article className="public-card">
            <div className="public-kicker">Main Office</div>
            <h3>Speak with the school team</h3>
            <p><strong>Phone:</strong> {office.phone}</p>
            <p><strong>Email:</strong> {office.email}</p>
            <p><strong>Admissions:</strong> {office.admissionsEmail}</p>
          </article>

          <article className="public-card">
            <div className="public-kicker">Visit Us</div>
            <h3>Campus and office details</h3>
            <p>{office.address}</p>
            <p className="public-note"><strong>Office Hours:</strong> {office.officeHours}</p>
          </article>

          <article className="public-card">
            <div className="public-kicker">Response Support</div>
            <h3>What happens after you contact us</h3>
            <p>
              Every enquiry, callback request, and visit request is handled with clear follow-up so the school team can respond more reliably and keep families better informed.
            </p>
          </article>
        </div>

        <div className="public-grid-3" style={{ marginBottom: 24 }}>
          {quickRoutes.map((item) => (
            <article key={item.to} className="public-card">
              <div className="public-kicker">Quick Route</div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <div className="public-actions">
                <Link className="public-btn secondary" to={item.to}>Open</Link>
              </div>
            </article>
          ))}
        </div>

        <div className="public-grid-2">
          <article className="public-card">
            <h3>Send Us a Message</h3>
            <p className="public-note">Use this form for general contact, fees, transport, academics, results support, partnership, and complaints.</p>

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
                Enquiry Type
                <select value={form.enquiryType} onChange={(e) => onChange("enquiryType", e.target.value)}>
                  {enquiryTypes.map((item) => (
                    <option key={item} value={item}>{titleCase(item)}</option>
                  ))}
                </select>
              </label>

              {requiresClass ? (
                <label>
                  Intended Class
                  <select value={form.intendedClass} onChange={(e) => onChange("intendedClass", e.target.value)} required>
                    <option value="">Select class</option>
                    {classOptions.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label>
                Subject
                <input type="text" value={form.subject} onChange={(e) => onChange("subject", e.target.value)} placeholder="How can we help?" />
              </label>

              <label>
                Message
                <textarea rows="5" required value={form.message} onChange={(e) => onChange("message", e.target.value)} />
              </label>

              <button className="public-btn primary" type="submit" disabled={saving}>
                {saving ? "Submitting..." : "Submit Enquiry"}
              </button>
            </form>

            {success ? <p className="public-success">{success}</p> : null}
            {error ? <p className="public-error">{error}</p> : null}
          </article>

          <article className="public-card">
            <h3>What You Can Request Here</h3>
            <ul>
              <li>General school information and parent support</li>
              <li>Admissions guidance and intended class advice</li>
              <li>School visit scheduling</li>
              <li>Callback requests for busy families</li>
              <li>Fees, transport, and academic questions</li>
              <li>Partnership, vendor, and complaint follow-up</li>
            </ul>

            <h3 style={{ marginTop: 24 }}>Helpful Next Steps</h3>
            <div className="public-actions">
              <Link className="public-btn secondary" to="/admissions">Admissions Overview</Link>
              <Link className="public-btn secondary" to="/admissions/register">Apply Now</Link>
              <Link className="public-btn secondary" to="/admissions/faq">Admissions FAQ</Link>
            </div>
          </article>
        </div>

        {(config?.faq || []).length > 0 ? (
          <div style={{ marginTop: 18 }}>
            <h2 className="public-section-title">Frequently Asked Questions</h2>
            <div className="public-grid-3">
              {(config?.faq || []).map((item) => (
                <article key={item.question} className="public-card">
                  <h3>{item.question}</h3>
                  <p>{item.answer}</p>
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </PublicSiteLayout>
  );
}

