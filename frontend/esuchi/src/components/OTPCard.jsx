import React, { useRef, useState } from "react";
import "../css/OTPCard.css";
import logo from "../assets/logo.png";
import wareBg from "../assets/ware.jpg";
import {
  requestPasswordResetOtp,
  requestSignupOtp,
  verifyOtp,
  verifySignupOtp,
} from "../api/auth";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

export default function OtpCard() {
  const location = useLocation();
  const navigate = useNavigate();
  const inputsRef = useRef([]);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(location.state?.message || "");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const email = location.state?.email;
  const source = location.state?.source;
  const name = location.state?.name;
  const password = location.state?.password;

  const isForgotPasswordFlow = source === "forgot-password";
  const isSignupFlow = source === "signup";

  if (!isForgotPasswordFlow && !isSignupFlow) {
    return <Navigate to="/login" replace />;
  }

  if (!email) {
    return <Navigate to={isSignupFlow ? "/register" : "/forgot-password"} replace />;
  }

  if (isSignupFlow && (!name || !password)) {
    return <Navigate to="/register" replace />;
  }

  const handleChange = (value, index) => {
    if (!/^[0-9]?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

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
      if (isSignupFlow) {
        await verifySignupOtp({
          email,
          otp: code,
          name,
          password,
        });
        navigate("/dashboard", { replace: true });
        return;
      }

      await verifyOtp({ email, otp: code });
      navigate("/reset-password", {
        replace: true,
        state: {
          resetVerified: true,
          email,
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
      const response = isSignupFlow
        ? await requestSignupOtp({ email })
        : await requestPasswordResetOtp({ email });

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
        <img src={logo} alt="logo" className="otp-logo" />

        <h2 className="otp-title">
          {isSignupFlow ? "Verify your email" : "Enter Verification code"}
        </h2>
        <p className="otp-subtitle">
          {isSignupFlow ? (
            <>
              Enter the code sent to complete your signup for{" "}
              <strong>{email}</strong>
            </>
          ) : (
            <>
              We&apos;ve sent a code to <strong>{email}</strong>
            </>
          )}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="otp-input-group">
            {otp.map((digit, index) => (
              <input
                key={index}
                type="text"
                maxLength="1"
                value={digit}
                ref={(element) => (inputsRef.current[index] = element)}
                onChange={(event) => handleChange(event.target.value, index)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                className="otp-input"
              />
            ))}
          </div>

          <button type="submit" className="otp-btn" disabled={loading}>
            {loading
              ? "Verifying..."
              : isSignupFlow
                ? "Complete sign up"
                : "Verify"}
          </button>
        </form>

        {error && <p className="otp-error">{error}</p>}
        {message && <p className="otp-success">{message}</p>}

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
      </div>
    </div>
  );
}
