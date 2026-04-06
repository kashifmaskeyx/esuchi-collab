import React from "react";
import { useNavigate } from "react-router-dom";
import "../css/LandingPage.css";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing">
      {/* Navbar */}
      <div className="navbar">
        <div className="logo">eSuchi</div>

        <div className="nav-links">
          <span>Features</span>
          <span>Features</span>
          <span>Features</span>
          <span>Features</span>
        </div>

        <div className="landing-auth-buttons">
          <button
            className="landing-login-btn"
            onClick={() => navigate("/login")}
          >
            Login
          </button>

          <button
            className="landing-signup-btn"
            onClick={() => navigate("/register")}
          >
            Sign up
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="hero">
        <h1>
          Best Inventory and Logistics <br />
          Management System in Nepal
        </h1>

        <p>
          Reduce empty stocks, speed up operations with the best inventory
          software for small businesses to manage their physical inventory.
        </p>

        <button
          className="landing-cta-btn"
          onClick={() => navigate("/register")}
        >
          Get started →
        </button>
      </div>

      {/* Feature Boxes */}
      <div className="features">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="feature-box"></div>
        ))}
      </div>

      {/* Floating Button */}
      <div className="floating-btn"></div>
    </div>
  );
}
