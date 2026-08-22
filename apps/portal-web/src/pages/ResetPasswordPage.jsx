import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DomainAwareLink from "../components/DomainAwareLink";
import { resetPassword } from "../api/services";
import "./LoginPage.css";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = useMemo(() => String(searchParams.get("token") || "").trim(), [searchParams]);
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const passwordMismatch = confirmPassword && newPassword !== confirmPassword;
  const usingToken = Boolean(tokenFromUrl);

  const submit = async (event) => {
    event.preventDefault();
    try {
      setLoading(true);
      setError("");
      await resetPassword({
        token: tokenFromUrl,
        identifier: usingToken ? undefined : identifier,
        otp: usingToken ? undefined : otp,
        newPassword,
        confirmPassword,
      });
      navigate("/portal/login", {
        replace: true,
        state: { notice: "Password reset successful. You can now sign in with your new password." },
      });
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to reset password right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-login-page portal-reset-page">
      <div className="portal-login-shell">
        <img src="/logo.png" alt="Angel Montessori School logo" className="portal-login-logo" />

        <form onSubmit={submit} className="portal-login-card">
          <div className="portal-login-card-head">
            <div className="portal-login-kicker">Secure Reset</div>
            <h1>Create New Password</h1>
            <p>
              {usingToken
                ? "Your secure reset link has been detected. Choose a new password to continue."
                : "Enter the email or phone you used for reset plus the OTP sent to your email."}
            </p>
          </div>

          {error ? <p className="portal-login-alert error">{error}</p> : null}

          {!usingToken ? (
            <>
              <label className="portal-login-field">
                <span>Email address or phone number</span>
                <input
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="Registered email or phone"
                  autoComplete="email"
                  required
                />
              </label>

              <label className="portal-login-field">
                <span>Reset OTP</span>
                <input
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  placeholder="6-digit OTP"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                />
              </label>
            </>
          ) : null}

          <label className="portal-login-field">
            <span>New password</span>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="At least 8 characters, letters and numbers"
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

          {passwordMismatch ? <p className="portal-login-alert error">Password and confirm password do not match.</p> : null}

          <button
            type="submit"
            className="portal-login-primary-btn"
            disabled={loading || !newPassword || !confirmPassword || passwordMismatch || (!usingToken && (!identifier.trim() || !otp.trim()))}
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>

          <div className="portal-login-support">
            <DomainAwareLink to="/portal/forgot-password" className="portal-login-link secondary">Request a new reset code</DomainAwareLink>
            <DomainAwareLink to="/portal/login" className="portal-login-link">Back to login</DomainAwareLink>
          </div>
        </form>
      </div>
    </div>
  );
}
