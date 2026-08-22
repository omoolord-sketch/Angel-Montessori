import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCareerPublicConfig, getCareerPublicVacancies, submitCareerApplication } from "../api/services";
import PublicSiteLayout from "../components/PublicSiteLayout";

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({
      fileName: file.name,
      mimeType: file.type,
      dataUrl: reader.result,
    });
    reader.onerror = () => reject(new Error("We could not read the selected file."));
    reader.readAsDataURL(file);
  });
}

export default function CareerApplicationPage() {
  const { vacancyId } = useParams();
  const [vacancies, setVacancies] = useState([]);
  const [setup, setSetup] = useState({ genders: [], teachingLevels: [], trcnOptions: [] });
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    gender: "prefer_not_to_say",
    address: "",
    highestQualification: "",
    yearsOfExperience: "",
    currentEmployer: "",
    teachingLevel: "",
    subjectsCanTeach: "",
    trcnStatus: "no",
    coverLetter: "",
    cvFile: null,
    certificateFiles: [],
    passportPhotoFile: null,
    supportingFiles: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [portalAccess, setPortalAccess] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [configRes, vacanciesRes] = await Promise.all([
          getCareerPublicConfig(),
          getCareerPublicVacancies(),
        ]);
        setSetup(configRes?.data?.setup || { genders: [], teachingLevels: [], trcnOptions: [] });
        setVacancies(vacanciesRes?.data?.vacancies || []);
      } catch {
        setError("We could not load the vacancy information for this application.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const vacancy = useMemo(() => vacancies.find((item) => String(item.id) === String(vacancyId)) || null, [vacancies, vacancyId]);

  const handleFile = async (event, key, multi = false) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    try {
      const encoded = await Promise.all(files.map((file) => readFileAsDataUrl(file)));
      setForm((prev) => ({
        ...prev,
        [key]: multi ? encoded : encoded[0],
      }));
      setError("");
    } catch (err) {
      setError(err.message || "We could not read the selected file.");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      setNotice("");
      setPortalAccess(null);
      const payload = {
        vacancyId,
        ...form,
      };
      const res = await submitCareerApplication(payload);
      setNotice(res?.data?.message || "Thank you. Your application has been submitted successfully.");
      setPortalAccess(res?.data?.portalAccess || null);
    } catch (err) {
      setError(err?.response?.data?.message || "We could not submit your application right now.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PublicSiteLayout>
      <section className="public-page-banner" style={{ backgroundImage: "url('/assets/home-featured-post.jpg')" }}>
        <div className="public-page-banner-inner">
          <div className="public-kicker">Apply Online</div>
          <h1 className="public-page-banner-title">{vacancy ? `Apply for ${vacancy.jobTitle}` : "Career Application"}</h1>
          <p>Complete the form carefully and upload the required documents so the Angel Montessori hiring team can review your application properly.</p>
        </div>
      </section>

      <section className="public-main-wrap">
        {loading ? <article className="public-card">Loading application form...</article> : null}
        {error ? <article className="public-card" style={{ color: "#b42318", borderColor: "#f3d0d0" }}>{error}</article> : null}
        {notice ? (
          <article className="public-card" style={{ color: "#027a48", borderColor: "#b8e5c8", display: "grid", gap: 12 }}>
            <div>{notice}</div>
            {portalAccess ? (
              <div style={{ border: "1px solid #b8e5c8", borderRadius: 14, padding: 14, background: "#f5fff8", color: "#14532d" }}>
                <div className="public-kicker">Recruitment Applicant Access</div>
                <h3 style={{ margin: "8px 0 10px", color: "#14532d" }}>Your portal account is ready</h3>
                <p style={{ margin: 0 }}>
                  Use these details to sign in, review your application status, and open any assigned recruitment assessment.
                </p>
                <div className="public-grid-3" style={{ marginTop: 14 }}>
                  <div>
                    <strong>Username</strong>
                    <p style={{ margin: "6px 0 0" }}>{portalAccess.username || "-"}</p>
                  </div>
                  <div>
                    <strong>Temporary Password</strong>
                    <p style={{ margin: "6px 0 0" }}>{portalAccess.temporaryPassword || "Use your existing password"}</p>
                  </div>
                  <div>
                    <strong>Login Path</strong>
                    <p style={{ margin: "6px 0 0" }}>{portalAccess.loginPath || "/admissions/login"}</p>
                  </div>
                </div>
                <div className="public-actions" style={{ marginTop: 14 }}>
                  <Link className="public-btn primary" to={portalAccess.loginPath || "/admissions/login"}>Open Applicant Login</Link>
                  <Link className="public-btn secondary" to="/careers/vacancies">Back to Vacancies</Link>
                </div>
              </div>
            ) : null}
          </article>
        ) : null}

        {vacancy ? (
          <div className="public-about-grid">
            <article className="public-card">
              <div className="public-kicker">Role Summary</div>
              <h2>{vacancy.jobTitle}</h2>
              <p>{vacancy.department} • {vacancy.location}</p>
              <p className="public-note">Deadline: {new Date(vacancy.applicationDeadline).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p>
              <div className="public-pill-row">
                <span className="public-pill">{vacancy.employmentType.replace(/_/g, " ")}</span>
                <span className="public-pill">{vacancy.category.replace(/_/g, " ")}</span>
              </div>
              <div className="public-actions" style={{ marginTop: 18 }}>
                <Link className="public-btn secondary" to={`/careers/vacancies/${vacancy.slug}`}>Review Vacancy</Link>
              </div>
            </article>

            <article className="public-card">
              <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
                <div className="public-grid-3">
                  <input value={form.fullName} onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))} placeholder="Full Name" style={inputStyle} required />
                  <input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} placeholder="Phone Number" style={inputStyle} required />
                  <input value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} placeholder="Email Address" style={inputStyle} required />
                </div>

                <div className="public-grid-3">
                  <select value={form.gender} onChange={(e) => setForm((prev) => ({ ...prev, gender: e.target.value }))} style={inputStyle}>
                    {(setup.genders || []).map((item) => <option key={item} value={item}>{item.replace(/_/g, " ")}</option>)}
                  </select>
                  <input value={form.highestQualification} onChange={(e) => setForm((prev) => ({ ...prev, highestQualification: e.target.value }))} placeholder="Highest Qualification" style={inputStyle} required />
                  <input value={form.yearsOfExperience} onChange={(e) => setForm((prev) => ({ ...prev, yearsOfExperience: e.target.value }))} placeholder="Years of Experience" style={inputStyle} />
                </div>

                <div className="public-grid-3">
                  <input value={form.currentEmployer} onChange={(e) => setForm((prev) => ({ ...prev, currentEmployer: e.target.value }))} placeholder="Current Employer" style={inputStyle} />
                  <select value={form.teachingLevel} onChange={(e) => setForm((prev) => ({ ...prev, teachingLevel: e.target.value }))} style={inputStyle}>
                    <option value="">Teaching Level</option>
                    {(setup.teachingLevels || []).map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                  <select value={form.trcnStatus} onChange={(e) => setForm((prev) => ({ ...prev, trcnStatus: e.target.value }))} style={inputStyle}>
                    {(setup.trcnOptions || []).map((item) => <option key={item} value={item}>{item.replace(/_/g, " ")}</option>)}
                  </select>
                </div>

                <input value={form.subjectsCanTeach} onChange={(e) => setForm((prev) => ({ ...prev, subjectsCanTeach: e.target.value }))} placeholder="Subjects You Can Teach" style={inputStyle} />
                <input value={form.address} onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} placeholder="Address" style={inputStyle} />
                <textarea value={form.coverLetter} onChange={(e) => setForm((prev) => ({ ...prev, coverLetter: e.target.value }))} placeholder="Cover Letter" rows={8} style={{ ...inputStyle, resize: "vertical" }} required />

                <div className="public-grid-3">
                  <label style={labelStyle}>Upload CV
                    <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => handleFile(e, "cvFile")} style={{ marginTop: 8 }} required />
                  </label>
                  <label style={labelStyle}>Certificates
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" multiple onChange={(e) => handleFile(e, "certificateFiles", true)} style={{ marginTop: 8 }} />
                  </label>
                  <label style={labelStyle}>Passport Photo
                    <input type="file" accept=".jpg,.jpeg,.png" onChange={(e) => handleFile(e, "passportPhotoFile")} style={{ marginTop: 8 }} />
                  </label>
                </div>

                <label style={labelStyle}>Supporting Documents
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" multiple onChange={(e) => handleFile(e, "supportingFiles", true)} style={{ marginTop: 8 }} />
                </label>

                <div className="public-actions">
                  <button type="submit" className="public-btn primary" disabled={saving}>{saving ? "Submitting..." : "Submit Application"}</button>
                  <Link className="public-btn secondary" to="/careers/vacancies">Cancel</Link>
                </div>
              </form>
            </article>
          </div>
        ) : null}
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

const labelStyle = {
  display: "block",
  padding: 14,
  border: "1px solid #d9e2ef",
  borderRadius: 12,
  color: "#16335a",
  fontWeight: 700,
  background: "#fbfdff",
};
