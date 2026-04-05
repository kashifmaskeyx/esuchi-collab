import React from "react";
import "../css/DashboardCard.css";

export default function DashboardCard({
  title,
  icon: Icon,
  actionText,
  className = "",
  children,
}) {
  return (
    <section className={`dashboard-card ${className}`.trim()}>
      {(title || actionText) && (
        <div className="dashboard-card-head">
          <div className="dashboard-card-title-wrap">
            {Icon ? <Icon size={18} className="dashboard-card-icon" /> : null}
            {title ? <h3>{title}</h3> : null}
          </div>

          {typeof actionText === "string" ? (
            <button type="button" className="card-action-btn">
              {actionText}
            </button>
          ) : actionText ? (
            <div className="card-action-content">{actionText}</div>
          ) : null}
        </div>
      )}

      <div className="dashboard-card-body">{children}</div>
    </section>
  );
}
