import { useState } from "react";
import DomainAwareLink from "../components/DomainAwareLink";
import { requestPasswordReset } from "../api/services";
import "./LoginPage.css";

const genericMessage = "If this account exists, password reset instructions have been sent.";

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    try {
      setLoading(true);
      setError("");
      setMessage("");
      await requestPasswordReset({ identifier });
      setMessage(genericMessage);
    } catch (err) {
      if (err?.response?.status === 429) {
        setError(err?.response?.data?.message || "Too many reset requests. Please try again later.");
      } else {
        setError(err?.response?.data?.message || "Unable to send reset instructions right now.");
      }
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
            <div className="portal-login-kicker">Account Recovery</div>
            <h1>Forgot Password?</h1>
            <p>Enter your registered email address or phone number. We will send secure reset instructions if the account is found.</p>
          </div>

          {message ? <p className="portal-login-alert success">{message}</p> : null}
          {error ? <p className="portal-login-alert error">{error}</p> : null}

          <label className="portal-login-field">
            <span>Email address or phone number</span>
            <input
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="e.g. info@example.com or 080..."
              autoComplete="email"
              required
            />
          </label>

          <button type="submit" className="portal-login-primary-btn" disabled={loading || !identifier.trim()}>
            {loading ? "Sending..." : "Send Reset Instructions"}
          </button>

          <div className="portal-reset-help">
            <strong>Mobile app users:</strong> use the OTP in the email on the mobile reset screen. Website users can open the secure reset link directly.
          </div>

          <div className="portal-login-support">
            <DomainAwareLink to="/portal/login" className="portal-login-link">Back to login</DomainAwareLink>
            <DomainAwareLink to="/" className="portal-login-link secondary">Back to website</DomainAwareLink>
          </div>
        </form>
      </div>
    </div>
  );
}
