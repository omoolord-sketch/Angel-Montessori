import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  getAdmissionApplicantClasses,
  getAdmissionApplicantSessions,
  registerApplicantAdmissionAccount,
} from "../api/services";
import "./SitePages.css";

const initial = {
  surname: "",
  firstName: "",
  middleName: "",
  email: "",
  phone: "",
  username: "",
  password: "",
  confirmPassword: "",
  sessionId: "",
  classId: "",
};

export default function ApplicantSignupPage() {
  const [form, setForm] = useState(initial);
  const [sessions, setSessions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingSetup, setLoadingSetup] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const loadSetup = async () => {
      try {
        setLoadingSetup(true);
        const [sessionRes, classRes] = await Promise.all([
          getAdmissionApplicantSessions(),
          getAdmissionApplicantClasses(),
        ]);

        const loadedSessions = Array.isArray(sessionRes?.data) ? sessionRes.data : [];
        const loadedClasses = Array.isArray(classRes?.data) ? classRes.data : [];

        setSessions(loadedSessions);
        setClasses(loadedClasses);

        setForm((prev) => ({
          ...prev,
          sessionId: prev.sessionId || loadedSessions[0]?.id || "",
          classId: prev.classId || loadedClasses[0]?.id || "",
        }));
      } catch {
        setSessions([]);
        setClasses([]);
      } finally {
        setLoadingSetup(false);
      }
    };

    loadSetup();
  }, []);

  const inferredName = useMemo(
    () => [form.firstName.trim(), form.middleName.trim(), form.surname.trim()].filter(Boolean).join(" "),
    [form.firstName, form.middleName, form.surname]
  );

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      setError("Password confirmation does not match");
      return;
    }

    const payload = {
      surname: form.surname.trim(),
      firstName: form.firstName.trim(),
      middleName: form.middleName.trim(),
      username: form.username.trim() || undefined,
      password: form.password,
      email: form.email.trim(),
      phone: form.phone.trim(),
      sessionId: form.sessionId,
      classId: form.classId,
      name: inferredName,
    };

    let createdUser = null;
    try {
      setSaving(true);
      setError("");
      const res = await registerApplicantAdmissionAccount(payload);
      createdUser = res?.data?.user || null;
    } catch (err) {
      if (!err?.response) {
        setError("Unable to reach the server. Please confirm backend/API URL settings and try again.");
      } else {
        setError(err?.response?.data?.message || "Failed to create applicant account");
      }
      setSaving(false);
      return;
    }

    try {
      await login(createdUser?.username || payload.username, payload.password);
      navigate("/applicant/dashboard", { replace: true });
    } catch {
      navigate("/admissions/login", {
        replace: true,
        state: {
          notice: "Applicant account created successfully. Please sign in to continue.",
        },
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="site-page">
      <div className="site-wrap">
        <header className="site-header">
          <strong>Admissions Application Account</strong>
          <nav className="site-links">
            <Link to="/admissions">Admissions</Link>
            <Link to="/admissions/login">Applicant Login</Link>
          </nav>
        </header>

        <section className="site-grid-2">
          <article className="site-card">
            <h3>Create Applicant Account</h3>
            <p>Register once and complete your full multi-step application inside the applicant dashboard.</p>

            {loadingSetup ? <p className="site-muted">Loading admission classes and sessions...</p> : null}

            <form className="site-form" onSubmit={submit}>
              <label>
                Surname
                <input type="text" required value={form.surname} onChange={(e) => onChange("surname", e.target.value)} />
              </label>

              <label>
                First Name
                <input type="text" required value={form.firstName} onChange={(e) => onChange("firstName", e.target.value)} />
              </label>

              <label>
                Middle Name (Optional)
                <input type="text" value={form.middleName} onChange={(e) => onChange("middleName", e.target.value)} />
              </label>

              <label>
                Email Address
                <input type="email" required value={form.email} onChange={(e) => onChange("email", e.target.value)} />
              </label>

              <label>
                Phone Number
                <input type="tel" required value={form.phone} onChange={(e) => onChange("phone", e.target.value)} />
              </label>

              <label>
                Preferred Username (Optional)
                <input type="text" value={form.username} onChange={(e) => onChange("username", e.target.value)} placeholder="Leave blank to auto-generate" />
              </label>

              <label>
                Admission Session
                <select required value={form.sessionId} onChange={(e) => onChange("sessionId", e.target.value)}>
                  <option value="">Select session</option>
                  {sessions.map((row) => (
                    <option key={row.id} value={row.id}>{row.title || row.academicSession}</option>
                  ))}
                </select>
              </label>

              <label>
                Apply For Class
                <select required value={form.classId} onChange={(e) => onChange("classId", e.target.value)}>
                  <option value="">Select class</option>
                  {classes.map((row) => (
                    <option key={row.id} value={row.id}>{row.className}</option>
                  ))}
                </select>
              </label>

              <label>
                Password
                <input type="password" required minLength={8} value={form.password} onChange={(e) => onChange("password", e.target.value)} />
              </label>

              <label>
                Confirm Password
                <input type="password" required minLength={8} value={form.confirmPassword} onChange={(e) => onChange("confirmPassword", e.target.value)} />
              </label>

              <button className="site-btn" type="submit" disabled={saving || loadingSetup}>
                {saving ? "Creating account..." : "Create Account and Continue"}
              </button>
            </form>

            {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
          </article>

          <article className="site-card">
            <h3>What You Can Do After Registration</h3>
            <ul>
              <li>Complete personal, guardian, academic and medical details in steps</li>
              <li>Upload required document links and save drafts</li>
              <li>Pay application fee and submit final application</li>
              <li>Track screening, decision, and enrollment updates</li>
            </ul>
          </article>
        </section>
      </div>
    </div>
  );
}


