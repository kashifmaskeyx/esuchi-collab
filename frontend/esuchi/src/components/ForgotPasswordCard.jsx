import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/ForgotPasswordCard.css";
import logo from "../assets/logo.png";
import heroBg from "../assets/Login.png";

export default function ForgotPasswordCard() {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();

    navigate("/otp", {
      state: {
        email,
        source: "forgot-password",
      },
    });
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

            <button type="submit" className="forgot-btn">
              Send OTP
            </button>
          </form>

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
