import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getRecruitmentApplicantDashboard } from "../api/services";

const shellStyle = {
  minHeight: "100vh",
  background: "#f8fbff",
  padding: "24px 20px 40px",
};

const cardStyle = {
  border: "1px solid #d7e3f2",
  borderRadius: 18,
  background: "#ffffff",
  boxShadow: "0 20px 45px rgba(15, 23, 42, 0.06)",
  padding: 20,
};

function formatDateTime(value) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function titleCase(value) {
  return String(value || "")
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function ApplicantRecruitmentDashboard() {
  const [data, setData] = useState({ profile: null, application: null, assessments: [], attempts: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await getRecruitmentApplicantDashboard();
        setData(response?.data || { profile: null, application: null, assessments: [], attempts: [] });
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load recruitment dashboard.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const profile = data?.profile || null;
  const application = data?.application || null;
  const assessments = Array.isArray(data?.assessments) ? data.assessments : [];
  const attempts = Array.isArray(data?.attempts) ? data.attempts : [];

  return (
    <div style={shellStyle}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gap: 18 }}>
        <section style={{ ...cardStyle, display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ maxWidth: 760 }}>
            <div style={{ color: "#b88716", fontWeight: 800, fontSize: 12, letterSpacing: "0.08em" }}>RECRUITMENT APPLICANT PORTAL</div>
            <h1 style={{ margin: "8px 0 10px", fontSize: "clamp(2rem, 4vw, 3rem)", color: "#0f172a", lineHeight: 1.05 }}>
              Recruitment assessments, application updates, and next steps
            </h1>
            <p style={{ margin: 0, color: "#475569", fontSize: 16, lineHeight: 1.7 }}>
              Use this dashboard to confirm your teaching application details, open any assigned recruitment assessment,
              and track review, shortlist, or rejection updates from the school.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
            <Link to="/cbt/exam" style={primaryActionStyle}>Open Assessment Login</Link>
            <Link to="/portal" style={secondaryActionStyle}>Portal Home</Link>
          </div>
        </section>

        {error ? <div style={{ ...cardStyle, borderColor: "#fecaca", background: "#fff1f2", color: "#991b1b" }}>{error}</div> : null}
        {loading ? <div style={cardStyle}>Loading recruitment dashboard...</div> : null}

        {!loading && !profile ? (
          <div style={cardStyle}>
            Your recruitment profile is not linked yet. If you recently submitted an application, please try again shortly or contact the school office.
          </div>
        ) : null}

        {profile ? (
          <>
            <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              <div style={cardStyle}>
                <div style={metaLabelStyle}>Applicant</div>
                <strong style={metaValueStyle}>{profile.fullName}</strong>
              </div>
              <div style={cardStyle}>
                <div style={metaLabelStyle}>Applied Role</div>
                <strong style={metaValueStyle}>{profile.appliedRole || "Role pending"}</strong>
              </div>
              <div style={cardStyle}>
                <div style={metaLabelStyle}>Teaching Category</div>
                <strong style={metaValueStyle}>{titleCase(profile.teachingCategory)}</strong>
              </div>
              <div style={cardStyle}>
                <div style={metaLabelStyle}>Application Status</div>
                <strong style={metaValueStyle}>{titleCase(profile.applicationStatus)}</strong>
              </div>
            </section>

            <section style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 18 }}>
              <article style={cardStyle}>
                <h2 style={sectionTitleStyle}>Assigned Recruitment Assessments</h2>
                {!assessments.length ? (
                  <p style={emptyTextStyle}>No recruitment assessment has been assigned to your application yet.</p>
                ) : (
                  <div style={{ display: "grid", gap: 12 }}>
                    {assessments.map((assessment) => (
                      <div key={assessment.id} style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                          <div>
                            <strong style={{ color: "#0f172a", fontSize: 18 }}>{assessment.examTitle}</strong>
                            <p style={{ margin: "6px 0 0", color: "#475569" }}>
                              {assessment.recruitmentCategoryLabel} • {assessment.status}
                            </p>
                          </div>
                          <Link to="/cbt/exam" style={smallPrimaryStyle}>Take Assessment</Link>
                        </div>
                        <p style={{ margin: "10px 0 0", color: "#475569" }}>{assessment.instructions || "Open the assessment login when your credential slip has been issued."}</p>
                        <p style={{ margin: "10px 0 0", color: "#1d4ed8", fontWeight: 700 }}>
                          Window: {formatDateTime(assessment.startTime)} - {formatDateTime(assessment.endTime)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </article>

              <article style={cardStyle}>
                <h2 style={sectionTitleStyle}>Application Snapshot</h2>
                <div style={{ display: "grid", gap: 10 }}>
                  <div><div style={metaLabelStyle}>Application Number</div><strong style={metaValueStyle}>{application?.applicationNumber || profile.candidateId || "-"}</strong></div>
                  <div><div style={metaLabelStyle}>Qualification</div><strong style={metaValueStyle}>{profile.qualification || "Not provided"}</strong></div>
                  <div><div style={metaLabelStyle}>Experience</div><strong style={metaValueStyle}>{profile.experience || "Not provided"}</strong></div>
                  <div><div style={metaLabelStyle}>Subject Specialization</div><strong style={metaValueStyle}>{profile.subjectSpecialization || "Not provided"}</strong></div>
                </div>
              </article>
            </section>

            <section style={cardStyle}>
              <h2 style={sectionTitleStyle}>Assessment History</h2>
              {!attempts.length ? (
                <p style={emptyTextStyle}>You have not completed a recruitment assessment yet.</p>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {attempts.map((attempt) => (
                    <div key={attempt.attemptId} style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <div>
                          <strong style={{ color: "#0f172a" }}>{attempt.examTitle}</strong>
                          <p style={{ margin: "6px 0 0", color: "#475569" }}>
                            Review: {titleCase(attempt.reviewStatus)} • Submitted: {formatDateTime(attempt.submittedAt)}
                          </p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={metaLabelStyle}>Current Score</div>
                          <strong style={metaValueStyle}>{attempt.finalScore}/{attempt.totalPoints}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}

const sectionTitleStyle = { margin: "0 0 14px", color: "#0f172a", fontSize: 22 };
const metaLabelStyle = { color: "#64748b", fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 700 };
const metaValueStyle = { display: "block", marginTop: 8, color: "#0f172a", fontSize: 18 };
const emptyTextStyle = { margin: 0, color: "#64748b" };
const primaryActionStyle = { textDecoration: "none", padding: "12px 16px", borderRadius: 12, background: "#0ea5e9", color: "#fff", fontWeight: 800 };
const secondaryActionStyle = { textDecoration: "none", padding: "12px 16px", borderRadius: 12, background: "#e2e8f0", color: "#0f172a", fontWeight: 700 };
const smallPrimaryStyle = { textDecoration: "none", padding: "10px 14px", borderRadius: 10, background: "#0f172a", color: "#fff", fontWeight: 700, alignSelf: "flex-start" };
