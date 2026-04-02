import React, { useState } from "react";
import "../css/RegisterCard.css";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../api/auth.js";
import logo from "../assets/logo.png"; //

export default function LoginCard() {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await loginUser(form);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="card">
        {/* ✅ Logo */}
        <img src={logo} alt="logo" className="logo" />

        <h2>Welcome Back</h2>

        <p className="login-text">
          Don’t have an account?{" "}
          <span onClick={() => navigate("/register")}>Sign up</span>
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
          />

          <div className="password-field">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              required
            />
            <span onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </span>
          </div>

          <div className="forgot-password">
            <span onClick={() => navigate("/forgot-password")}>
              Forgot password?
            </span>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>

          <div className="divider">
            <span></span>
            <p>OR</p>
            <span></span>
          </div>

          <button type="button" className="google-btn">
            <img
              src="https://www.svgrepo.com/show/475656/google-color.svg"
              alt="google"
            />
            Continue with Google
          </button>

          {error && <p className="error">{error}</p>}
        </form>
      </div>
    </div>
  );
}
