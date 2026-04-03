import React, { useState } from "react";
import "../css/RegisterCard.css";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../api/auth.js";
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

  const fullName = `${form.firstName} ${form.lastName}`;

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "phone") {
      let digits = value.replace(/\D/g, ""); // allow only numbers

      // remove extra 977 if user types it again
      if (digits.startsWith("977")) {
        digits = digits.slice(3);
      }

      // limit to 10 digits
      digits = digits.slice(0, 10);

      setForm({
        ...form,
        phone: "+977 " + digits,
      });
      return;
    }

    setForm({ ...form, [name]: value });
  };

  // Prevent deleting +977
  const handlePhoneKeyDown = (e) => {
    if (
      (e.key === "Backspace" || e.key === "Delete") &&
      form.phone.length <= 5
    ) {
      e.preventDefault();
    }
  };

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    const phoneDigits = form.phone.replace("+977", "").trim();

    if (phoneDigits.length !== 10) {
      setError("Phone must be 10 digits");
      return;
    }

    setLoading(true);

    try {
      await registerUser({
        fullName,
        email: form.email,
        password: form.password,
        phone: phoneDigits,
      });

      navigate("/otp", { state: { email: form.email } });
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
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="register-submit-btn"
            >
              {loading ? "Creating..." : "Create account"}
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
