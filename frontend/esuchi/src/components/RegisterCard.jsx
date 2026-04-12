import React, { useState } from "react";
import "../css/RegisterCard.css";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { requestSignupOtp } from "../api/auth";
import logo from "../assets/logo.png";
import signUpBg from "../assets/Sign-Up.png";

export default function RegisterCard() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "+977 ",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "phone") {
      let digits = value.replace(/\D/g, "");

      if (digits.startsWith("977")) {
        digits = digits.slice(3);
      }

      digits = digits.slice(0, 10);

      setForm((current) => ({
        ...current,
        phone: `+977 ${digits}`,
      }));
      return;
    }

    setForm((current) => ({ ...current, [name]: value }));
  };

  const handlePhoneKeyDown = (e) => {
    if (
      (e.key === "Backspace" || e.key === "Delete") &&
      form.phone.length <= 5
    ) {
      e.preventDefault();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const name = `${form.firstName} ${form.lastName}`.trim();
    const phoneDigits = form.phone.replace("+977", "").trim();

    if (!name) {
      setError("Enter your name");
      return;
    }

    if (phoneDigits.length !== 10) {
      setError("Phone must be 10 digits");
      return;
    }

    if (form.password.trim().length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const response = await requestSignupOtp({
        email: form.email.trim(),
      });

      navigate("/otp", {
        state: {
          source: "signup",
          email: form.email.trim(),
          name,
          password: form.password,
          message: response.message || "OTP sent to your email",
        },
      });
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-left">
        <div className="register-form-wrapper">
          <img src={logo} alt="eSuchi logo" className="register-logo" />
          <h2 className="register-title">Create an account</h2>

          <p className="register-login-text">
            Already have an account?{" "}
            <span onClick={() => navigate("/login")}>Log in</span>
          </p>

          <form onSubmit={handleSubmit} className="register-form">
            <div className="register-name-row">
              <input
                type="text"
                name="firstName"
                placeholder="First name"
                value={form.firstName}
                onChange={handleChange}
                required
                className="register-input"
              />

              <input
                type="text"
                name="lastName"
                placeholder="Last name"
                value={form.lastName}
                onChange={handleChange}
                required
                className="register-input"
              />
            </div>

            <input
              type="email"
              name="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              required
              className="register-input"
            />

            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              onKeyDown={handlePhoneKeyDown}
              maxLength={15}
              className="register-input"
            />

            <div className="register-password-field">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                required
                className="register-input"
              />

              <span
                className="register-password-toggle"
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="register-submit-btn"
            >
              {loading ? "Sending code..." : "Create account"}
            </button>

            <div className="register-divider">
              <span className="register-divider-line"></span>
              <p className="register-divider-text">Or register with</p>
              <span className="register-divider-line"></span>
            </div>

            <button type="button" className="register-google-btn">
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt="Google"
              />
              Google
            </button>

            {error && <p className="register-error">{error}</p>}
          </form>
        </div>
      </div>

      <div
        className="register-right"
        style={{ backgroundImage: `url(${signUpBg})` }}
      >
        <div className="register-right-overlay" />
      </div>
    </div>
  );
}
