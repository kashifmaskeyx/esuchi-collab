import React from "react";
import "../css/DashboardCard.css";

function DashboardCard({ title, actionText, children, className = "" }) {
  return (
    <section className={`dashboard-card ${className}`}>
      <div className="dashboard-card-head">
        <h3>{title}</h3>
        {actionText ? (
          <button type="button" className="card-action-btn">
            {actionText}
          </button>
        ) : null}
      </div>
      <div className="dashboard-card-body">{children}</div>
    </section>
  );
}

export default DashboardCard;
