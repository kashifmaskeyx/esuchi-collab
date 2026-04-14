import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Boxes,
  ChartColumn,
  CheckCircle2,
  LayoutDashboard,
  PackageCheck,
  ShieldCheck,
  Truck,
  Users,
} from "lucide-react";
import logo from "../assets/logo.png";
import "../css/LandingPageV2.css";

const featureCards = [
  {
    title: "Inventory tracking",
    description:
      "Monitor stock levels, low-stock alerts, and product availability from one place.",
    icon: Boxes,
  },
  {
    title: "Shipment visibility",
    description:
      "Track pending, in-transit, and delivered shipments with a cleaner logistics workflow.",
    icon: Truck,
  },
  {
    title: "Operational dashboard",
    description:
      "See products, inventory records, stock movement, and catalog health in a single view.",
    icon: LayoutDashboard,
  },
  {
    title: "Product catalog control",
    description:
      "Organize products by category, supplier, price, and stock so teams can act faster.",
    icon: PackageCheck,
  },
  {
    title: "Business insights",
    description:
      "Review trends, recent activity, and low-stock watchlists before they become problems.",
    icon: ChartColumn,
  },
  {
    title: "Secure onboarding",
    description:
      "Use login, signup, and OTP-based account flows to keep access simple and protected.",
    icon: ShieldCheck,
  },
];

const overviewItems = [
  "Centralized inventory and stock movement records",
  "Shipment monitoring with delivery status visibility",
  "Product and supplier organization for faster operations",
  "Dashboard summaries for key business metrics",
];

const workflowSteps = [
  {
    step: "01",
    title: "Set up your catalog",
    description:
      "Create products, group them by category, and keep supplier details easy to manage.",
  },
  {
    step: "02",
    title: "Track stock in real time",
    description:
      "Record stock movement and keep an eye on inventory before shortages slow the team down.",
  },
  {
    step: "03",
    title: "Follow every shipment",
    description:
      "Monitor delivery progress, partner performance, and the latest shipment status from one screen.",
  },
];

const faqItems = [
  {
    question: "Who is eSuchi for?",
    answer:
      "It fits small and growing businesses that need clearer control over inventory, products, and shipping operations.",
  },
  {
    question: "What can teams do after signing in?",
    answer:
      "Teams can access the dashboard, browse products, monitor stock activity, and review shipment information.",
  },
  {
    question: "Is the landing page connected to the app?",
    answer:
      "Yes. The main calls to action route directly to registration, login, and the dashboard experience.",
  },
];

export default function LandingPageV2() {
  const navigate = useNavigate();
  const hasToken =
    typeof window !== "undefined" && Boolean(localStorage.getItem("token"));

  const scrollToSection = (sectionId) => {
    const section = document.getElementById(sectionId);

    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="landing-page-shell">
      <header className="landing-navbar">
        <button
          type="button"
          className="landing-brand"
          onClick={() => scrollToSection("top")}
          aria-label="Go to top of page"
        >
          <img src={logo} alt="eSuchi logo" className="landing-brand-mark" />
          <span>eSuchi</span>
        </button>

        <nav className="landing-nav-links" aria-label="Landing page sections">
          <button type="button" onClick={() => scrollToSection("features")}>
            Features
          </button>
          <button type="button" onClick={() => scrollToSection("overview")}>
            Overview
          </button>
          <button type="button" onClick={() => scrollToSection("workflow")}>
            How it works
          </button>
          <button type="button" onClick={() => scrollToSection("faq")}>
            FAQ
          </button>
        </nav>

        <div className="landing-auth-actions">
          <button
            type="button"
            className="landing-ghost-btn"
            onClick={() => navigate("/login")}
          >
            Log in
          </button>
          <button
            type="button"
            className="landing-primary-btn"
            onClick={() => navigate(hasToken ? "/register" : "/register")}
          >
            {hasToken ? "Get started" : "Get started"}
          </button>
        </div>
      </header>

      <main className="landing-main" id="top">
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <h1>
              Best Inventory and Logistics Management System in Nepal
            </h1>
            <p>
              Reduce empty stocks, speed up operations with the best inventory
              software for small businesses to manage their physical inventory.
            </p>

            <div className="landing-hero-actions">
              <button
                type="button"
                className="landing-primary-btn hero-btn"
                onClick={() => navigate(hasToken ? "/register" : "/register")}
              >
                {hasToken ? "Get started" : "Get started"}
              </button>
            </div>
          </div>
        </section>

        <section className="landing-section" id="features">
          <div className="landing-section-heading">
            <span className="landing-section-tag">Features</span>
            <h2>Everything the landing page should quickly tell a new visitor</h2>
            <p>
              The platform already covers the core workflows most operations
              teams expect: products, inventory, shipments, analytics signals,
              and secure account access.
            </p>
          </div>

          <div className="landing-feature-grid">
            {featureCards.map((feature) => {
              const Icon = feature.icon;

              return (
                <article key={feature.title} className="landing-feature-card">
                  <span className="landing-feature-icon">
                    <Icon size={20} />
                  </span>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section
          className="landing-section landing-overview-section"
          id="overview"
        >
          <div className="landing-overview-card">
            <div className="landing-section-heading compact">
              <span className="landing-section-tag">Overview</span>
              <h2>Show the product value before asking for signup</h2>
              <p>
                This landing page now explains what the app does, how it helps,
                and where visitors can go next.
              </p>
            </div>

            <div className="landing-overview-points">
              {overviewItems.map((item) => (
                <div key={item} className="landing-overview-point">
                  <CheckCircle2 size={18} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="landing-overview-stats">
            <article>
              <LayoutDashboard size={20} />
              <strong>Dashboard-first</strong>
              <p>Clear summaries for inventory, products, and recent activity.</p>
            </article>
            <article>
              <Truck size={20} />
              <strong>Shipment-ready</strong>
              <p>Sections that match logistics workflows and delivery tracking.</p>
            </article>
            <article>
              <Users size={20} />
              <strong>Team-friendly</strong>
              <p>Useful for owners, staff, and operations teams working together.</p>
            </article>
          </div>
        </section>

        <section className="landing-section" id="workflow">
          <div className="landing-section-heading">
            <span className="landing-section-tag">How It Works</span>
            <h2>Simple flow for teams managing physical stock</h2>
          </div>

          <div className="landing-workflow-grid">
            {workflowSteps.map((item) => (
              <article key={item.step} className="landing-workflow-card">
                <span className="landing-step-number">{item.step}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section" id="faq">
          <div className="landing-section-heading">
            <span className="landing-section-tag">FAQ</span>
            <h2>Questions new visitors usually ask</h2>
          </div>

          <div className="landing-faq-list">
            {faqItems.map((item) => (
              <article key={item.question} className="landing-faq-card">
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-cta-section">
          <div>
            <span className="landing-section-tag">Start Now</span>
            <h2>Turn the landing page into a real entry point for the app.</h2>
            <p>
              Visitors can now understand the product, scroll through the core
              sections, and jump straight into registration or the dashboard.
            </p>
          </div>

          <div className="landing-cta-actions">
            <button
              type="button"
              className="landing-primary-btn"
              onClick={() => navigate("/register")}
            >
              Create account
            </button>
            <button
              type="button"
              className="landing-secondary-btn"
              onClick={() => navigate("/login")}
            >
              Sign in
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
