import React, { useState } from "react";
import { Menu, Search } from "lucide-react";
import Sidebar from "../components/Sidebar";
import DashboardCard from "../components/DashboardCard";
import "../css/Dashboard.css";

const planRows = [
  { name: "[Urgent] T-shirt Inventory", status: "TODO", progress: 0, tone: "todo" },
  { name: "[Urgent] Shoes Inventory", status: "TODO", progress: 0, tone: "todo" },
  {
    name: "[Monthly] Bag Inventory",
    status: "Processing",
    progress: 62,
    tone: "processing",
  },
  {
    name: "[Monthly] Pants Inventory",
    status: "Processing",
    progress: 45,
    tone: "processing",
  },
  {
    name: "[Yearly] Phone Case Inventory",
    status: "Complete",
    progress: 100,
    tone: "complete",
  },
  {
    name: "[Yearly] Charger Inventory",
    status: "Complete",
    progress: 100,
    tone: "complete",
  },
];

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="dashboard-page">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <button
        className={`sidebar-backdrop ${sidebarOpen ? "show" : ""}`}
        type="button"
        onClick={() => setSidebarOpen(false)}
        aria-label="Close sidebar"
      />

      <main className={`dashboard-main ${sidebarOpen ? "with-sidebar" : "full-width"}`}>
        <header className="dashboard-topbar">
          <button
            type="button"
            className="menu-toggle-btn"
            onClick={() => setSidebarOpen((current) => !current)}
            aria-label="Toggle sidebar"
          >
            <Menu size={20} />
          </button>

          <div className="search-field">
            <Search size={18} />
            <input type="text" placeholder="Search" />
          </div>
        </header>

        <section className="quick-cards-grid">
          <DashboardCard title="Inventory Summary">
            <div className="metric-grid">
              <article className="metric-box neutral">
                <p>Total Item</p>
                <h4>1,345</h4>
                <button type="button">view details</button>
              </article>

              <article className="metric-box alert">
                <p>Low-Stock Alerts</p>
                <h4>12</h4>
                <button type="button">view details</button>
              </article>
            </div>
          </DashboardCard>

          <DashboardCard title="Sales Activities">
            <div className="metric-grid">
              <article className="metric-box info">
                <p>To be delivered</p>
                <h4>200</h4>
                <button type="button">view details</button>
              </article>

              <article className="metric-box light">
                <p>To be ordered</p>
                <h4>20</h4>
                <button type="button">view details</button>
              </article>
            </div>
          </DashboardCard>
        </section>

        <section className="detail-grid">
          <DashboardCard title="Inventory Plan" actionText="view details" className="inventory-card">
            <p className="plan-meta">This month (30)</p>
            <div className="plan-list">
              {planRows.map((task) => (
                <article key={task.name} className="plan-item">
                  <p>{task.name}</p>
                  <div className="plan-status-wrap">
                    <span className={`plan-status ${task.tone}`}>{task.status}</span>
                    <div className="plan-progress-track">
                      <span style={{ width: `${task.progress}%` }} className={task.tone} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </DashboardCard>

          <DashboardCard title="Warehouse Detail" className="warehouse-card">
            <div className="warehouse-chart">
              <div className="donut-chart">
                <div>
                  <p>Total items</p>
                  <h4>1,345</h4>
                </div>
              </div>
            </div>

            <div className="warehouse-legend">
              <p>
                <span className="legend-dot black" />
                Warehouse A
                <strong>1000 items</strong>
              </p>
              <p>
                <span className="legend-dot gray" />
                Warehouse B
                <strong>345 items</strong>
              </p>
              <p>
                <span className="legend-dot blue" />
                Warehouse C
                <strong>567 items</strong>
              </p>
            </div>
          </DashboardCard>
        </section>
      </main>
    </div>
  );
}
