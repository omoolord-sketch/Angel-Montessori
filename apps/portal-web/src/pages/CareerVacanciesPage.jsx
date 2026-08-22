import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getCareerPublicVacancies } from "../api/services";
import PublicSiteLayout from "../components/PublicSiteLayout";

export default function CareerVacanciesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [vacancies, setVacancies] = useState([]);
  const [setup, setSetup] = useState({ categories: [], employmentTypes: [], departments: [] });
  const [loading, setLoading] = useState(true);

  const filters = {
    search: searchParams.get("search") || "",
    category: searchParams.get("category") || "",
    department: searchParams.get("department") || "",
    employmentType: searchParams.get("employmentType") || "",
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await getCareerPublicVacancies(filters);
        setVacancies(res?.data?.vacancies || []);
        setSetup(res?.data?.setup || { categories: [], employmentTypes: [], departments: [] });
      } catch {
        setVacancies([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [filters.search, filters.category, filters.department, filters.employmentType]);

  const updateFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  };

  return (
    <PublicSiteLayout>
      <section
        className="public-page-banner"
        style={{ backgroundImage: "url('/assets/school-building-3.jpg')" }}
      >
        <div className="public-page-banner-inner">
          <div className="public-kicker">Current Vacancies</div>
          <h1 className="public-page-banner-title">Explore published roles across teaching, administration, ICT, transport, finance, and support services</h1>
          <p>Filter by category, department, or employment type to find the right opportunity for your experience.</p>
        </div>
      </section>

      <section className="public-main-wrap">
        <article className="public-card" style={{ marginBottom: 18 }}>
          <div className="public-grid-3">
            <input value={filters.search} onChange={(e) => updateFilter("search", e.target.value)} placeholder="Search roles" style={inputStyle} />
            <select value={filters.category} onChange={(e) => updateFilter("category", e.target.value)} style={inputStyle}>
              <option value="">All categories</option>
              {(setup.categories || []).map((item) => <option key={item} value={item}>{item.replace(/_/g, " ")}</option>)}
            </select>
            <select value={filters.department} onChange={(e) => updateFilter("department", e.target.value)} style={inputStyle}>
              <option value="">All departments</option>
              {(setup.departments || []).map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div className="public-grid-3" style={{ marginTop: 12 }}>
            <select value={filters.employmentType} onChange={(e) => updateFilter("employmentType", e.target.value)} style={inputStyle}>
              <option value="">All employment types</option>
              {(setup.employmentTypes || []).map((item) => <option key={item} value={item}>{item.replace(/_/g, " ")}</option>)}
            </select>
            <div style={{ display: "flex", alignItems: "center", color: "#5f7185", fontWeight: 700 }}>{vacancies.length} vacancy{vacancies.length === 1 ? "" : "ies"} found</div>
            <Link className="public-btn secondary" to="/careers">Back to Careers</Link>
          </div>
        </article>

        {loading ? <article className="public-card">Loading vacancies...</article> : null}

        {!loading && vacancies.length === 0 ? (
          <article className="public-card">
            <h3>No vacancies match these filters right now</h3>
            <p className="public-note">Try adjusting the filters or return later as new Angel Montessori opportunities are published.</p>
          </article>
        ) : null}

        <div className="public-grid-3">
          {vacancies.map((vacancy) => (
            <article key={vacancy.id} className="public-card" style={{ background: "#fbfdff" }}>
              <div className="public-kicker">{vacancy.department}</div>
              <h3>{vacancy.jobTitle}</h3>
              <p>{vacancy.description}</p>
              <div style={{ display: "grid", gap: 6, color: "#5f7185", marginBottom: 14 }}>
                <span>{vacancy.location}</span>
                <span>{vacancy.employmentType.replace(/_/g, " ")} • {new Date(vacancy.applicationDeadline).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
                <span>{vacancy.applicationsCount} applications received</span>
              </div>
              <div className="public-actions">
                <Link className="public-btn secondary" to={`/careers/vacancies/${vacancy.slug}`}>View Details</Link>
                <Link className="public-btn primary" to={`/careers/apply/${vacancy.id}`}>Apply</Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </PublicSiteLayout>
  );
}

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #d9e2ef",
  background: "#fff",
  boxSizing: "border-box",
};
