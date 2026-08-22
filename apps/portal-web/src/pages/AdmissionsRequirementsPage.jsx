import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAdmissionsPublicConfig } from "../api/services";
import PublicSiteLayout from "../components/PublicSiteLayout";

export default function AdmissionsRequirementsPage() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
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
    load();
  }, []);

  const requirements = config?.requirements || {};

  return (
    <PublicSiteLayout>
      <section className="public-card public-page-hero">
        <div className="public-kicker">Admissions Requirements</div>
        <h1>Required Documents by School Level</h1>
        <p>Review required documents before you start the application process to avoid delays.</p>
        {loading ? <p className="public-note">Loading requirements...</p> : null}
        <div className="public-actions">
          <Link to="/admissions/register" className="public-btn primary">Start Application</Link>
          <Link to="/admissions/faq" className="public-btn secondary">Open FAQ</Link>
        </div>
      </section>

      <section className="public-grid-3">
        <article className="public-card">
          <h3>Early Years</h3>
          <ul>
            {(requirements.earlyYears || []).map((item) => <li key={item}>{item}</li>)}
          </ul>
        </article>

        <article className="public-card">
          <h3>Basic School</h3>
          <ul>
            {(requirements.basicSchool || []).map((item) => <li key={item}>{item}</li>)}
          </ul>
        </article>

        <article className="public-card">
          <h3>Secondary School</h3>
          <ul>
            {(requirements.secondary || []).map((item) => <li key={item}>{item}</li>)}
          </ul>
        </article>
      </section>
    </PublicSiteLayout>
  );
}
