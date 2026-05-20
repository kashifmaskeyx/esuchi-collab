import React, { useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import wareBg from "../assets/ware.jpg";
import {
  requestEmailChangeOtp,
  updateCurrentUser,
} from "../api/auth";
import "../css/OTPCard.css";

export default function EmailChangeOtpPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const inputsRef = useRef([]);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(location.state?.message || "");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const name = location.state?.name;
  const email = location.state?.email;

  if (!name || !email) {
    return <Navigate to="/settings" replace />;
  }

  const handleChange = (value, index) => {
    if (!/^[0-9]?$/.test(value)) {
      return;
    }

    const nextOtp = [...otp];
    nextOtp[index] = value;
    setOtp(nextOtp);

    if (value && index < otp.length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (event, index) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const code = otp.join("");

    if (code.length !== 6) {
      setError("Enter the full OTP");
      return;
    }

    setLoading(true);

    try {
      await updateCurrentUser({
        name,
        email,
        emailOtp: code,
      });
      navigate("/settings", {
        replace: true,
        state: {
          profileMessage: "Profile updated. Your new email has been verified.",
        },
      });
    } catch (err) {
      setError(err.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setMessage("");
    setResending(true);

    try {
      const response = await requestEmailChangeOtp({ email });
      setOtp(["", "", "", "", "", ""]);
      setMessage(response.message || "A new code has been sent.");
      inputsRef.current[0]?.focus();
    } catch (err) {
      setError(err.message || "Failed to resend OTP");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="otp-page" style={{ backgroundImage: `url(${wareBg})` }}>
      <div className="otp-card">
        <img src={logo} alt="eSuchi logo" className="otp-logo" />
        <h2 className="otp-title">Verify your new email</h2>
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
                ref={(element) => {
                  inputsRef.current[index] = element;
                }}
                onChange={(event) => handleChange(event.target.value, index)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                className="otp-input"
              />
            ))}
          </div>

          <button type="submit" className="otp-btn" disabled={loading}>
            {loading ? "Verifying..." : "Verify email"}
          </button>
        </form>

        {error ? <p className="otp-error">{error}</p> : null}
        {message ? <p className="otp-success">{message}</p> : null}

        <p className="otp-resend">
          Didn&apos;t get a code?{" "}
          <span
            role="button"
            tabIndex={0}
            onClick={resending ? undefined : handleResend}
            onKeyDown={(event) => {
              if (!resending && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                handleResend();
              }
            }}
            aria-disabled={resending}
          >
            {resending ? "Sending..." : "Click to resend"}
          </span>
        </p>

        <button
          type="button"
          className="otp-secondary-btn"
          onClick={() => navigate("/settings")}
        >
          Back to profile
        </button>
      </div>
    </div>
  );
}
