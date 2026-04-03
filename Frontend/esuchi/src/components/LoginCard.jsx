import React, { useState } from "react";
import "../css/LoginCard.css";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../api/auth.js";
import logo from "../assets/logo.png";
import heroBg from "../assets/Login.png";

export default function LoginCard() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await loginUser(form);
      navigate("/otp", { state: { email: form.email, source: "login" } });
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* ── LEFT PANEL ── */}
      <div className="login-left">
        <div className="login-form-wrapper">
          <img src={logo} alt="eSuchi logo" className="login-logo" />
          <h2 className="login-title">Welcome</h2>
          <p className="login-subtitle">Please enter your details</p>

          <form onSubmit={handleSubmit} className="login-form">
            <input
              type="email"
              name="email"
              placeholder="Username"
              value={form.email}
              onChange={handleChange}
              required
              className="login-input"
            />

            <div className="login-password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                required
                className="login-input"
              />
              <span
                className="login-eye-icon"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </span>
            </div>

            <div className="login-remember-row">
              <label className="login-remember-label">
                <input type="checkbox" />
                remember me?
              </label>
              <span
                className="login-forgot-link"
                onClick={() => navigate("/forgot-password")}
              >
                Forgot password?
              </span>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>

            <div className="login-divider">
              <span className="login-divider-line" />
              <span className="login-divider-text">Or register with</span>
              <span className="login-divider-line" />
            </div>

            <div className="login-social-row">
              <button type="button" className="login-social-btn">
                <img
                  src="https://www.svgrepo.com/show/475656/google-color.svg"
                  alt="Google"
                  className="login-social-icon"
                />
                Google
              </button>
            </div>

            {error && <p className="login-error">{error}</p>}
          </form>

          <p className="login-signup-text">
            Dont have an account?{" "}
            <span
              className="login-signup-link"
              onClick={() => navigate("/register")}
            >
              Sign Up
            </span>
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div
        className="login-right"
        style={{ backgroundImage: `url(${heroBg})` }}
      >
        <div className="login-right-overlay" />
      </div>
    </div>
  );
}
