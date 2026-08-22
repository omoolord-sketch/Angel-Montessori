import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getActiveTeacherProfiles, getCareerPublicOverview } from "../api/services";
import PublicSiteLayout from "../components/PublicSiteLayout";

function profileInitials(name) {
  return String(name || "AM")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "AM";
}

export default function CareersPage() {
  const [overview, setOverview] = useState(null);
  const [activeTeachers, setActiveTeachers] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [overviewRes, teachersRes] = await Promise.allSettled([
          getCareerPublicOverview(),
          getActiveTeacherProfiles(),
        ]);

        setOverview(overviewRes.status === "fulfilled" ? overviewRes.value?.data || null : null);
        setActiveTeachers(teachersRes.status === "fulfilled" ? teachersRes.value?.data?.teachers || [] : []);
      } catch {
        setOverview(null);
        setActiveTeachers([]);
      }
    };

    load();
  }, []);

  const summary = overview?.summary || {};
  const cultureHighlights = overview?.cultureHighlights || [];
  const opportunities = overview?.currentOpportunities || [];
  const checklist = overview?.applicationChecklist || [];

  return (
    <PublicSiteLayout>
      <section
        className="public-page-banner"
        style={{ backgroundImage: "url('/assets/home-about.jpg')" }}
      >
        <div className="public-page-banner-inner">
          <div className="public-kicker">Careers</div>
          <h1 className="public-page-banner-title">Build your career in a school community that values child development, structure, and growth</h1>
          <p>
            Explore current vacancies, understand how recruitment works, and apply online to serve in the Angel Montessori School community. Invited candidates can also return here to open the CBT interview test login.
          </p>
          <div className="public-hero-actions">
            <Link to="/careers/vacancies" className="public-btn primary">View Vacancies</Link>
            <Link to="/cbt/exam" className="public-btn secondary">Interview Test Login</Link>
          </div>
        </div>
      </section>

      <section className="public-main-wrap">
        <div className="public-grid-3" style={{ marginBottom: 18 }}>
          <article className="public-card">
            <div className="public-kicker">Open Roles</div>
            <h3>{summary.openVacancies || 0}</h3>
            <p>Published vacancies currently available to applicants.</p>
          </article>
          <article className="public-card">
            <div className="public-kicker">Departments Hiring</div>
            <h3>{summary.departmentsHiring || 0}</h3>
            <p>Teams actively recruiting across teaching and operations.</p>
          </article>
          <article className="public-card">
            <div className="public-kicker">Teaching & Operations</div>
            <h3>{(summary.teachingRoles || 0) + (summary.operationsRoles || 0)}</h3>
            <p>Opportunities across academics, early years, ICT, and support functions.</p>
          </article>
        </div>

        <div className="public-about-grid" style={{ marginBottom: 18 }}>
          <article className="public-card">
            <div className="public-kicker">Why Work With Us</div>
            <h2>Professional standards with a supportive school culture</h2>
            <p>
              Angel Montessori School is growing a school community where strong teaching, child safeguarding, moral formation, and family partnership matter. We welcome people who care about thoughtful work and the long-term development of children.
            </p>
            <div className="public-pill-row">
              {cultureHighlights.map((item) => (
                <span key={item} className="public-pill">{item}</span>
              ))}
            </div>
            <div className="public-actions" style={{ marginTop: 18 }}>
              <Link className="public-btn primary" to="/careers/vacancies">View Current Vacancies</Link>
              <Link className="public-btn secondary" to="/cbt/exam">Interview Test Login</Link>
              <Link className="public-btn secondary" to="/contact">Contact School Office</Link>
            </div>
          </article>

          <article className="public-card">
            <div className="public-kicker">Application Checklist</div>
            <h3>What to prepare before you apply</h3>
            <div style={{ display: "grid", gap: 10 }}>
              {checklist.map((item) => (
                <div key={item} style={{ border: "1px solid #e0e8f3", borderRadius: 14, padding: 14, color: "#4a5c70" }}>
                  {item}
                </div>
              ))}
            </div>
          </article>
        </div>

        {activeTeachers.length ? (
          <article className="public-card" style={{ marginBottom: 18 }}>
            <div className="public-section-heading" style={{ marginBottom: 12 }}>
              <div>
                <div className="public-kicker">Our School Team</div>
                <h2 className="public-section-title" style={{ marginBottom: 8 }}>Active teachers and staff profiles</h2>
                <p className="public-note" style={{ marginTop: 0 }}>
                  Meet some of the active educators and staff members supporting Angel Montessori School's learning environment.
                </p>
              </div>
            </div>

            <div className="public-grid-3">
              {activeTeachers.map((teacher) => {
                const name = teacher.full_name || teacher.fullName;
                const photo = teacher.photo_url || teacher.photoUrl;
                const experience = Number(teacher.experience_years || teacher.experienceYears || 0);
                return (
                  <article key={teacher.id} className="public-card public-profile-card" style={{ background: "#fbfdff" }}>
                    {photo ? (
                      <img src={photo} alt={name} className="public-profile-image" />
                    ) : (
                      <div className="public-profile-image" style={{ display: "grid", placeItems: "center", color: "#163a70", fontWeight: 900, fontSize: "1.4rem" }}>
                        {profileInitials(name)}
                      </div>
                    )}
                    <div className="public-profile-copy">
                      <div className="public-kicker">{teacher.department || "Angel Montessori Team"}</div>
                      <h3>{name}</h3>
                      <p className="public-profile-role">{teacher.role}</p>
                      <p className="public-note" style={{ margin: "0 0 8px" }}>
                        {teacher.qualification ? `${teacher.qualification}` : "Professional school staff"}
                        {experience ? ` • ${experience} year${experience === 1 ? "" : "s"} experience` : ""}
                      </p>
                      {teacher.bio ? <p>{teacher.bio}</p> : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </article>
        ) : null}

        <article className="public-card" style={{ marginBottom: 18 }}>
          <div className="public-section-heading" style={{ marginBottom: 12 }}>
            <div>
              <div className="public-kicker">Current Opportunities</div>
              <h2 className="public-section-title" style={{ marginBottom: 8 }}>Vacancies open right now</h2>
              <p className="public-note" style={{ marginTop: 0 }}>Browse published opportunities and open each vacancy page for the full role details, requirements, and application guidance.</p>
            </div>
            <Link className="public-btn secondary" to="/careers/vacancies">Open Vacancies</Link>
          </div>

          <div className="public-grid-3">
            {opportunities.map((item) => (
              <article key={item.id} className="public-card" style={{ background: "#fbfdff" }}>
                <div className="public-kicker">{item.department || "School Role"}</div>
                <h3>{item.jobTitle}</h3>
                <p>{item.description}</p>
                <p className="public-note">
                  {item.location} - {String(item.employmentType || "").replace(/_/g, " ")}
                </p>
                <div className="public-actions">
                  <Link className="public-btn secondary" to={`/careers/vacancies/${item.slug}`}>View Details</Link>
                  <Link className="public-btn primary" to={`/careers/apply/${item.id}`}>Apply</Link>
                </div>
              </article>
            ))}
          </div>
        </article>

        <article className="public-card">
          <div className="public-kicker">Recruitment Flow</div>
          <h3>How the hiring process works</h3>
          <div className="public-grid-3">
            {[
              ["1. Review current vacancies", "Review open roles, deadlines, expectations, and the kind of school team the role will join."],
              ["2. Apply online", "Submit your profile, cover letter, CV, and supporting documents through the careers portal."],
              ["3. Wait for shortlisting updates", "Shortlisted candidates move into interview scheduling and structured review by the school hiring team."],
              ["4. Write the interview test when invited", "Where a CBT screening is part of the process, invited candidates can return to the public CBT login page and select the scheduled interview test."],
            ].map(([title, text]) => (
              <div key={title} style={{ border: "1px solid #e0e8f3", borderRadius: 14, padding: 16 }}>
                <strong style={{ display: "block", color: "#16335a", marginBottom: 8 }}>{title}</strong>
                <span style={{ color: "#5f7185" }}>{text}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </PublicSiteLayout>
  );
}

