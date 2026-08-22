import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import DomainAwareLink from "../components/DomainAwareLink";
import { getDefaultRouteForRole } from "../utils/domainLinks";
import "./LoginPage.css";

export default function ChangeTemporaryPasswordPage() {
  const { user, changePassword, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const passwordMismatch = confirmPassword && newPassword !== confirmPassword;

  const submit = async (event) => {
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
      const nextUser = await changePassword(currentPassword, newPassword);
      navigate(location.state?.from || getDefaultRouteForRole(nextUser), {
        replace: true,
        state: { notice: "Password updated successfully." },
      });
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to update password right now.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/portal/login", { replace: true });
  };

  return (
    <div className="portal-login-page portal-reset-page">
      <div className="portal-login-shell">
        <img src="/logo.png" alt="Angel Montessori School logo" className="portal-login-logo" />

        <form onSubmit={submit} className="portal-login-card">
          <div className="portal-login-card-head">
            <div className="portal-login-kicker">Security Update</div>
            <h1>Change Temporary Password</h1>
            <p>
              {user?.name || "This account"} must set a permanent password before continuing in the web portal.
            </p>
          </div>

          <div className="portal-reset-help">
            Use the current temporary password once, then choose a new password with at least 8 characters.
          </div>

          {error ? <p className="portal-login-alert error">{error}</p> : null}

          <label className="portal-login-field">
            <span>Current temporary password</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
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
            disabled={loading || !currentPassword || !newPassword || !confirmPassword || passwordMismatch}
          >
            {loading ? "Updating..." : "Update Password"}
          </button>

          <div className="portal-login-support">
            <button type="button" className="portal-login-link secondary button-link" onClick={handleLogout}>
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
