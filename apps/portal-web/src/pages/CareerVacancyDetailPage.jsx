import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCareerPublicVacancyDetail } from "../api/services";
import PublicSiteLayout from "../components/PublicSiteLayout";

export default function CareerVacancyDetailPage() {
  const { slug } = useParams();
  const [vacancy, setVacancy] = useState(null);
  const [relatedVacancies, setRelatedVacancies] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getCareerPublicVacancyDetail(slug);
        setVacancy(res?.data?.vacancy || null);
        setRelatedVacancies(res?.data?.relatedVacancies || []);
        setError("");
      } catch (err) {
        setVacancy(null);
        setRelatedVacancies([]);
        setError(err?.response?.data?.message || "We could not load this vacancy.");
      }
    };

    load();
  }, [slug]);

  return (
    <PublicSiteLayout>
      <section
        className="public-page-banner"
        style={{ backgroundImage: "url('/assets/school-building-2.jpg')" }}
      >
        <div className="public-page-banner-inner">
          <div className="public-kicker">Vacancy Details</div>
          <h1 className="public-page-banner-title">{vacancy?.jobTitle || "Career Opportunity"}</h1>
          <p>{vacancy?.department || "Angel Montessori School"} • {vacancy?.location || "Owo, Ondo State"}</p>
        </div>
      </section>

      <section className="public-main-wrap">
        {error ? <article className="public-card">{error}</article> : null}

        {vacancy ? (
          <div className="public-about-grid">
            <article className="public-card">
              <div className="public-kicker">Role Summary</div>
              <h2>{vacancy.jobTitle}</h2>
              <div className="public-pill-row" style={{ marginBottom: 16 }}>
                <span className="public-pill">{vacancy.department}</span>
                <span className="public-pill">{vacancy.category.replace(/_/g, " ")}</span>
                <span className="public-pill">{vacancy.employmentType.replace(/_/g, " ")}</span>
              </div>
              <p>{vacancy.description}</p>

              <h3>Requirements</h3>
              <p>{vacancy.requirements}</p>

              <h3>Responsibilities</h3>
              <p>{vacancy.responsibilities}</p>

              <div className="public-actions">
                <Link className="public-btn primary" to={`/careers/apply/${vacancy.id}`}>Apply for this role</Link>
                <Link className="public-btn secondary" to="/careers/vacancies">Back to vacancies</Link>
              </div>
            </article>

            <article className="public-card">
              <div className="public-kicker">Role Information</div>
              <div style={{ display: "grid", gap: 12 }}>
                <InfoRow label="Vacancy Code" value={vacancy.vacancyCode} />
                <InfoRow label="Department" value={vacancy.department} />
                <InfoRow label="Location" value={vacancy.location} />
                <InfoRow label="Employment Type" value={vacancy.employmentType.replace(/_/g, " ")} />
                <InfoRow label="Deadline" value={new Date(vacancy.applicationDeadline).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} />
                <InfoRow label="Openings" value={String(vacancy.openingsCount)} />
                <InfoRow label="Salary Range" value={vacancy.salaryRange || "Shared during the recruitment process"} />
              </div>

              <div style={{ borderTop: "1px solid #e3eaf4", marginTop: 18, paddingTop: 18 }}>
                <h3>Application Notes</h3>
                <p className="public-note">Only published vacancies accept applications. Please prepare your CV, cover letter, certificates, and any supporting documents before you begin the Angel Montessori application process.</p>
              </div>
            </article>
          </div>
        ) : null}

        {relatedVacancies.length ? (
          <article className="public-card" style={{ marginTop: 18 }}>
            <div className="public-kicker">Related Opportunities</div>
            <div className="public-grid-3">
              {relatedVacancies.map((item) => (
                <div key={item.id} style={{ border: "1px solid #e3eaf4", borderRadius: 14, padding: 16 }}>
                  <strong style={{ display: "block", color: "#16335a", marginBottom: 6 }}>{item.jobTitle}</strong>
                  <span style={{ color: "#5f7185", display: "block", marginBottom: 12 }}>{item.department}</span>
                  <div className="public-actions">
                    <Link className="public-btn secondary" to={`/careers/vacancies/${item.slug}`}>View</Link>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ) : null}
      </section>
    </PublicSiteLayout>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, borderBottom: "1px solid #edf2f7", paddingBottom: 10 }}>
      <strong style={{ color: "#16335a" }}>{label}</strong>
      <span style={{ color: "#5f7185", textAlign: "right" }}>{value}</span>
    </div>
  );
}
