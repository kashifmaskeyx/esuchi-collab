import React, { useState, useRef } from "react";
import "../css/OTPCard.css";
import logo from "../assets/logo.png";
import wareBg from "../assets/ware.jpg";
import { useLocation, useNavigate } from "react-router-dom";

export default function OtpCard() {
  const [otp, setOtp] = useState(["", "", "", "", ""]);
  const inputsRef = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email || "your email";

  const handleChange = (value, index) => {
    if (!/^[0-9]?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Move forward
    if (value && index < otp.length - 1) {
      inputsRef.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1].focus();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const code = otp.join("");

    if (code.length !== 5) {
      alert("Enter full OTP");
      return;
    }

    console.log("OTP Submitted:", code);

    // TODO: verify API
    navigate("/dashboard");
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
          We’ve sent a code to <strong>{email}</strong>
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

          <button type="submit" className="otp-btn">
            Verify
          </button>
        </form>

        <p className="otp-resend">
          Didn’t get a code? <span>Click to resend</span>
        </p>
      </div>
    </div>
  );
}
