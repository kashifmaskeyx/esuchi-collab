import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/ForgotPasswordCard.css";
import logo from "../assets/logo.png";
import heroBg from "../assets/Login.png";
import { requestPasswordResetOtp } from "../api/auth";

export default function ForgotPasswordCard() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await requestPasswordResetOtp({ email });
      setMessage(response.message || "OTP sent to your email");
      navigate("/otp", {
        state: {
          email,
          source: "forgot-password",
        },
      });
    } catch (err) {
      setError(err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-page">
      <div className="forgot-left">
        <div className="forgot-form-wrapper">
          <img src={logo} alt="eSuchi logo" className="forgot-logo" />
          <h2 className="forgot-title">Forgot your password?</h2>
          <p className="forgot-subtitle">
            Enter your email and we will send you a verification code.
          </p>

          <form onSubmit={handleSubmit} className="forgot-form">
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="forgot-input"
            />

            <button type="submit" className="forgot-btn" disabled={loading}>
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </form>

          {error && <p className="forgot-error">{error}</p>}
          {message && <p className="forgot-success">{message}</p>}

          <p className="forgot-back">
            Remember your password?{" "}
            <span onClick={() => navigate("/login")}>Back to login</span>
          </p>
        </div>
      </div>

      <div
        className="forgot-right"
        style={{ backgroundImage: `url(${heroBg})` }}
      >
        <div className="forgot-right-overlay" />
      </div>
    </div>
  );
}
