import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAuthNotice } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import DomainAwareLink from "../components/DomainAwareLink";
import { getDefaultRouteForRole } from "../utils/domainLinks";
import "./LoginPage.css";

function getLoginErrorMessage(error, fallback = "Login failed") {
  const data = error?.response?.data || {};
  const message = String(data.message || data.error || "").trim();
  if (message) {
    return message === "Invalid credentials" ? "Invalid username or password." : message;
  }
  if (!error?.response && error?.message) {
    return "Unable to reach the school server right now. Please check your internet connection and try again.";
  }
  return fallback;
}

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [temporaryPasswordUser, setTemporaryPasswordUser] = useState(null);
  const [temporaryAuthToken, setTemporaryAuthToken] = useState("");
  const [currentTemporaryPassword, setCurrentTemporaryPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionNotice] = useState(() => getAuthNotice());
  const { login, changeTemporaryPassword, logout } = useAuth();
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
        helperCopy: "Need applicant access?",
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

      if (user?.mustChangePassword) {
        setTemporaryPasswordUser(user);
        setTemporaryAuthToken(user?._sessionToken || "");
        setCurrentTemporaryPassword(password);
        setPassword("");
        return;
      }

      if (from) return navigate(from, { replace: true });
      return navigate(getDefaultRouteForRole(user), { replace: true });
    } catch (err) {
      setError(getLoginErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const submitTemporaryPasswordChange = async (event) => {
    event.preventDefault();

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const nextUser = await changeTemporaryPassword(username, currentTemporaryPassword, newPassword, temporaryAuthToken);
      const from = location.state?.from;
      navigate(from || getDefaultRouteForRole(nextUser), {
        replace: true,
        state: { notice: "Password updated successfully." },
      });
    } catch (err) {
      setError(getLoginErrorMessage(err, "Unable to update password right now."));
    } finally {
      setLoading(false);
    }
  };

  const cancelTemporaryPasswordChange = () => {
    logout();
    setTemporaryPasswordUser(null);
    setTemporaryAuthToken("");
    setCurrentTemporaryPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
  };

  if (temporaryPasswordUser) {
    const passwordMismatch = confirmPassword && newPassword !== confirmPassword;

    return (
      <div className="portal-login-page portal-reset-page" style={pageBackgroundStyle}>
        <div className="portal-login-shell">
          <img src="/logo.png" alt="Angel Montessori School logo" className="portal-login-logo" />

          <form onSubmit={submitTemporaryPasswordChange} className="portal-login-card">
            <div className="portal-login-card-head">
              <div className="portal-login-kicker">Security Update</div>
              <h1>Change Temporary Password</h1>
              <p>
                {temporaryPasswordUser?.name || "This account"} must set a permanent password before continuing in the school portal.
              </p>
            </div>

            <div className="portal-reset-help">
              Your login was accepted. Use the temporary password once, then choose a new password with at least 8 characters.
            </div>

            {error ? <p className="portal-login-alert error">{error}</p> : null}

            <label className="portal-login-field">
              <span>Current temporary password</span>
              <input
                type="password"
                value={currentTemporaryPassword}
                onChange={(event) => setCurrentTemporaryPassword(event.target.value)}
                placeholder="Enter current temporary password"
                autoComplete="current-password"
                required
              />
            </label>

            <label className="portal-login-field">
              <span>New password</span>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                required
              />
            </label>

            <label className="portal-login-field">
              <span>Confirm new password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repeat new password"
                autoComplete="new-password"
                required
              />
            </label>

            {passwordMismatch ? <p className="portal-login-alert error">New password and confirm password do not match.</p> : null}

            <button
              type="submit"
              className="portal-login-primary-btn"
              disabled={loading || !currentTemporaryPassword || !newPassword || !confirmPassword || passwordMismatch}
            >
              {loading ? "Updating..." : "Update Password"}
            </button>

            <div className="portal-login-support">
              <button type="button" className="portal-login-link secondary button-link" onClick={cancelTemporaryPasswordChange}>
                Logout
              </button>
              <DomainAwareLink to="/portal/forgot-password" className="portal-login-link">
                Forgot the temporary password?
              </DomainAwareLink>
            </div>
          </form>
        </div>
      </div>
    );
  }

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
              <span>Admissions and Recruitment Applicant Access</span>
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
            <span className="portal-login-field-row">
              <span>Password</span>
              <DomainAwareLink to="/portal/forgot-password" className="portal-login-link compact">Forgot Password?</DomainAwareLink>
            </span>
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
