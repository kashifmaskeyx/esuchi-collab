import React, { useState, useRef } from "react";
import "../css/OTPCard.css";
import logo from "../assets/logo.png";
import wareBg from "../assets/ware.jpg";
import { verifyOtp } from "../api/auth";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

export default function OtpCard() {
  const [otp, setOtp] = useState(["", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputsRef = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();
  
  const email = location.state?.email || "your email";
  const source = location.state?.source;

  if (source !== "forgot-password") {
    return <Navigate to="/login" replace />;
  }

  const handleChange = (value, index) => {
    if (!/^[0-9]?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < otp.length - 1) {
      inputsRef.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1].focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const code = otp.join("");

  if (code.length !== 6) {
    alert("Enter full OTP");
    return;
  }

  setLoading(true);

  try {
    const res = await verifyResetOtp({
      email,
      otp: code,
    });

    console.log(res);

    // Go to reset password page
    navigate("/reset-password", { state: { email } });

  } catch (err) {
    console.error(err);
    alert(err.message || "Invalid OTP");
  } finally {
    setLoading(false);
  }
};
    

  return (
    <div
      className="otp-page"
      style={{ backgroundImage: `url(${wareBg})` }}
    >
      <div className="otp-card">
        <img src={logo} alt="logo" className="otp-logo" />

        <h2 className="otp-title">Enter Verification code</h2>
        <p className="otp-subtitle">
          We&apos;ve sent a code to <strong>{email}</strong>
        </p>

        <form onSubmit={handleSubmit}>
          <div className="otp-input-group">
            {otp.map((digit, index) => (
              <input
                key={index}
                type="text"
                maxLength="1"
                value={digit}
                ref={(el) => (inputsRef.current[index] = el)}
                onChange={(e) => handleChange(e.target.value, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className="otp-input"
              />
            ))}
          </div>

          <button type="submit" className="otp-btn" disabled={loading}>
            {loading ? "Verifying..." : "Verify"}
          </button>
        </form>

        {error && <p className="otp-error">{error}</p>}

        <p className="otp-resend">
          Didn&apos;t get a code? <span>Click to resend</span>
        </p>
      </div>
    </div>
  );
}
