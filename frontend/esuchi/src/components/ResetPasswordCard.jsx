import React, { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import "../css/ForgotPasswordCard.css";
import logo from "../assets/logo.png";
import heroBg from "../assets/Login.png";
import { resetPassword } from "../api/auth";

export default function ResetPasswordCard() {
  const [form, setForm] = useState({
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email;
  const resetVerified = location.state?.resetVerified;

  if (!email || !resetVerified) {
    return <Navigate to="/forgot-password" replace />;
  }

  const handleChange = (e) =>
    setForm((current) => ({ ...current, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const response = await resetPassword({
        email,
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      setMessage(response.message);

      navigate("/login", {
        replace: true,
        state: {
          passwordResetSuccess: response.message,
          email,
        },
      });
    } catch (err) {
      setError(err.message || "Password reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-page">
      <div className="forgot-left">
        <div className="forgot-form-wrapper">
          <img src={logo} alt="eSuchi logo" className="forgot-logo" />
          <h2 className="forgot-title">Set a new password</h2>
          <p className="forgot-subtitle">
            Create a new password for <strong>{email}</strong>.
          </p>

          <form onSubmit={handleSubmit} className="forgot-form">
            <input
              type="password"
              name="password"
              placeholder="New password"
              value={form.password}
              onChange={handleChange}
              required
              className="forgot-input"
            />

            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm new password"
              value={form.confirmPassword}
              onChange={handleChange}
              required
              className="forgot-input"
            />

            <button type="submit" className="forgot-btn" disabled={loading}>
              {loading ? "Updating..." : "Reset Password"}
            </button>
          </form>

          {error && <p className="forgot-error">{error}</p>}
          {message && <p className="forgot-success">{message}</p>}

          <p className="forgot-back">
            Want to start over?{" "}
            <span onClick={() => navigate("/forgot-password")}>
              Request a new code
            </span>
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
