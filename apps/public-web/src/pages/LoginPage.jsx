import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAuthNotice } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import DomainAwareLink from "../components/DomainAwareLink";
import { getDefaultRouteForRole } from "../utils/domainLinks";
import "./LoginPage.css";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionNotice] = useState(() => getAuthNotice());
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const notice = location.state?.notice || sessionNotice || "";
  const isApplicantLogin = location.pathname === "/admissions/login";

  const pageBackgroundStyle = isApplicantLogin
    ? {
        backgroundImage:
          "linear-gradient(rgba(29, 42, 68, 0.4), rgba(29, 42, 68, 0.28)), radial-gradient(circle at 18% 18%, rgba(236, 187, 92, 0.18) 0, rgba(236, 187, 92, 0) 24%), radial-gradient(circle at 82% 78%, rgba(86, 145, 215, 0.16) 0, rgba(86, 145, 215, 0) 24%), url('/assets/school-building.jpg')",
        backgroundSize: "auto, auto, auto, cover",
        backgroundPosition: "center, center, center, center",
        backgroundRepeat: "no-repeat, no-repeat, no-repeat, no-repeat",
      }
    : {
        backgroundImage:
          "linear-gradient(rgba(8, 22, 44, 0.34), rgba(8, 22, 44, 0.26)), radial-gradient(circle at 14% 22%, rgba(91, 158, 220, 0.2) 0, rgba(91, 158, 220, 0) 28%), radial-gradient(circle at 86% 82%, rgba(231, 198, 113, 0.16) 0, rgba(231, 198, 113, 0) 24%), url('/assets/home-about.jpg')",
        backgroundSize: "auto, auto, auto, cover",
        backgroundPosition: "center, center, center, center",
        backgroundRepeat: "no-repeat, no-repeat, no-repeat, no-repeat",
      };

  const pageConfig = isApplicantLogin
    ? {
        title: "Applicant Portal Login",
        usernameLabel: "Applicant username",
        usernamePlaceholder: "Enter applicant username",
        helperLink: { to: "/login", label: "School portal login" },
        helperCopy: "Need a new applicant account?",
      }
    : {
        title: "School Portal Login",
        usernameLabel: "Username",
        usernamePlaceholder: "Enter username",
        helperLink: { to: "/admissions/register", label: "Create admissions applicant account" },
        helperCopy: "Need applicant access?",
      };

  const submit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      const user = await login(username, password);
      const from = location.state?.from;

      if (from) return navigate(from, { replace: true });
      return navigate(getDefaultRouteForRole(user?.role), { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-login-page" style={pageBackgroundStyle}>
      <div className="portal-login-shell">
        <img src="/logo.png" alt="Angel Montessori School logo" className="portal-login-logo" />

        <form onSubmit={submit} className="portal-login-card">
          <div className="portal-login-card-head">
            <div className="portal-login-kicker">Angel Montessori School</div>
            <h1>{pageConfig.title}</h1>
          </div>

          {!isApplicantLogin ? (
            <div className="portal-login-role-strip" aria-label="Portal access roles">
              <span>Parent</span>
              <span>Student</span>
              <span>Teacher</span>
              <span>Staff</span>
            </div>
          ) : (
            <div className="portal-login-role-strip single" aria-label="Applicant access">
              <span>Admissions Applicant Access</span>
            </div>
          )}

          {notice ? <p className="portal-login-alert success">{notice}</p> : null}
          {error ? <p className="portal-login-alert error">{error}</p> : null}

          <label className="portal-login-field">
            <span>{pageConfig.usernameLabel}</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={pageConfig.usernamePlaceholder}
              autoComplete="username"
              required
            />
          </label>

          <label className="portal-login-field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
              required
            />
          </label>

          <button type="submit" className="portal-login-primary-btn" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <div className="portal-login-support">
            <DomainAwareLink to="/" className="portal-login-link secondary">Back to website</DomainAwareLink>
            <p>
              {pageConfig.helperCopy}{" "}
              <DomainAwareLink to={pageConfig.helperLink.to} className="portal-login-link">{pageConfig.helperLink.label}</DomainAwareLink>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
