import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAdmissionsPublicConfig } from "../api/services";
import PublicSiteLayout from "../components/PublicSiteLayout";

export default function AdmissionsFaqPage() {
  const [faq, setFaq] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await getAdmissionsPublicConfig();
        const rows = Array.isArray(res?.data?.faq) ? res.data.faq : [];
        setFaq(rows);
      } catch {
        setFaq([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <PublicSiteLayout>
      <section className="public-card public-page-hero">
        <div className="public-kicker">Admissions FAQ</div>
        <h1>Frequently Asked Questions</h1>
        <p>Quick answers on registration, fees, screening, admission decisions, and enrolment at Angel Montessori School.</p>
        {loading ? <p className="public-note">Loading FAQ...</p> : null}
        <div className="public-actions">
          <Link to="/admissions" className="public-btn secondary">Admissions Overview</Link>
          <Link to="/admissions/register" className="public-btn primary">Apply Now</Link>
        </div>
      </section>

      <section className="public-card">
        {faq.length === 0 ? <p className="public-note">No FAQ has been published yet.</p> : null}
        <div style={{ display: "grid", gap: 12 }}>
          {faq.map((item, index) => (
            <article key={`${item.question}-${index}`} style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: 10 }}>
              <h4 style={{ margin: "0 0 4px" }}>{item.question}</h4>
              <p style={{ margin: 0 }}>{item.answer}</p>
            </article>
          ))}
        </div>
      </section>
    </PublicSiteLayout>
  );
}

