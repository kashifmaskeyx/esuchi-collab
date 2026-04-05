import React, { useState } from "react";
import {
  ArrowUpDown,
  Bell,
  Boxes,
  Clock3,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Trophy,
  UserCircle2,
} from "lucide-react";
import Sidebar from "./Sidebar";
import DashboardCard from "./DashboardCard";
import "../css/Dashboard.css";

const summaryCards = [
  { title: "Total Item", value: "1,345" },
  { title: "Low-Stock Alerts", value: "12" },
];

const salesCards = [
  { title: "To be delivered", value: "200" },
  { title: "To be ordered", value: "20" },
];

const revenueData = [
  { month: "Jan", value: 19 },
  { month: "Feb", value: 23 },
  { month: "Mar", value: 18 },
  { month: "Apr", value: 20 },
  { month: "May", value: 18 },
  { month: "Jun", value: 22.5 },
  { month: "July", value: 14 },
  { month: "Aug", value: 19 },
];

const categoryData = [
  { name: "Electronics", value: 67 },
  { name: "Fashion", value: 19 },
  { name: "Home Supplies", value: 10 },
  { name: "Health Supplies", value: 4 },
];

const recentActivities = [
  {
    title: "Order #67",
    subtitle: "Masu",
    badge: "New Order",
    tone: "success",
    icon: UserCircle2,
  },
  {
    title: "Low Stock Alert",
    subtitle: "Nike shoes",
    badge: "Low Stock",
    tone: "danger",
    icon: Boxes,
  },
  {
    title: "Order#69",
    subtitle: "Joshni",
    badge: "New Order",
    tone: "success",
    icon: UserCircle2,
  },
  {
    title: "Order #456",
    subtitle: "Kashif",
    badge: "New Order",
    tone: "success",
    icon: UserCircle2,
  },
];

const productRows = [
  { product: "Samsung S26", stocks: "6767", price: "$9696", sales: "431212" },
  { product: "iPhone 16", stocks: "6767", price: "$9696", sales: "431212" },
  { product: "Nike Air", stocks: "6767", price: "$9696", sales: "431212" },
  {
    product: "Galaxy Air Buds",
    stocks: "6767",
    price: "$9696",
    sales: "431212",
  },
  {
    product: "Acer Predator",
    stocks: "6767",
    price: "$9696",
    sales: "431212",
  },
];

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="dashboard-page">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onToggle={() => setSidebarOpen((current) => !current)}
      />
      <button
        className={`sidebar-backdrop ${sidebarOpen ? "show" : ""}`}
        type="button"
        onClick={() => setSidebarOpen(false)}
        aria-label="Close sidebar"
      />

      <main
        className={`dashboard-main ${
          sidebarOpen ? "with-sidebar" : "with-collapsed-sidebar"
        }`}
      >
        <header className="dashboard-topbar">
          <h1 className="dashboard-page-title">Dashboard</h1>

          <div className="topbar-right">
            <button
              type="button"
              className="topbar-icon-btn"
              onClick={() => setSidebarOpen((current) => !current)}
              aria-label="Toggle sidebar"
            >
              <Bell size={18} />
            </button>

            <div className="search-field">
              <Search size={18} />
              <input type="text" placeholder="Search anything" />
            </div>

            <div className="avatar-chip" aria-label="User profile">
              <span>A</span>
            </div>
          </div>
        </header>

        <section className="quick-cards-grid">
          <DashboardCard title="Inventory Summary">
            <div className="metric-grid">
              {summaryCards.map((card) => (
                <article key={card.title} className="metric-box">
                  <p>{card.title}</p>
                  <div className="metric-box-footer">
                    <h4>{card.value}</h4>
                    <button type="button">view details</button>
                  </div>
                </article>
              ))}
            </div>
          </DashboardCard>

          <DashboardCard title="Sales Activities">
            <div className="metric-grid">
              {salesCards.map((card) => (
                <article key={card.title} className="metric-box">
                  <p>{card.title}</p>
                  <div className="metric-box-footer">
                    <h4>{card.value}</h4>
                    <button type="button">view details</button>
                  </div>
                </article>
              ))}
            </div>
          </DashboardCard>
        </section>

        <section className="dashboard-content-grid">
          <DashboardCard
            title="Sales Revenue"
            icon={ShoppingBag}
            actionText={
              <div className="chart-tabs">
                <button type="button" className="active">
                  Monthly
                </button>
                <button type="button">Quarterly</button>
                <button type="button">Yearly</button>
              </div>
            }
          >
            <div className="revenue-chart">
              <div className="revenue-grid-lines">
                <span>25k</span>
                <span>20k</span>
                <span>15k</span>
                <span>10k</span>
                <span>0</span>
              </div>

              <div className="revenue-bars">
                {revenueData.map((entry) => (
                  <div key={entry.month} className="revenue-bar-group">
                    <div className="revenue-bar-track">
                      <div
                        className="revenue-bar-fill"
                        style={{ height: `${(entry.value / 25) * 100}%` }}
                      />
                    </div>
                    <p>{entry.month}</p>
                  </div>
                ))}
              </div>
            </div>
          </DashboardCard>

          <DashboardCard
            title="Top Categories"
            icon={Trophy}
            actionText="See All"
          >
            <div className="category-chart-wrap">
              <div className="category-donut" />
            </div>

            <div className="category-list">
              {categoryData.map((category) => (
                <div key={category.name} className="category-row">
                  <span>{category.name}</span>
                  <strong>{category.value}%</strong>
                </div>
              ))}
            </div>
          </DashboardCard>
        </section>

        <section className="dashboard-bottom-grid">
          <DashboardCard
            title="Recent Activity"
            icon={Clock3}
            actionText="See All"
          >
            <div className="activity-list">
              {recentActivities.map((activity) => {
                const Icon = activity.icon;

                return (
                  <article
                    key={`${activity.title}-${activity.subtitle}`}
                    className="activity-item"
                  >
                    <div className="activity-item-main">
                      <span className="activity-icon">
                        <Icon size={18} />
                      </span>
                      <div>
                        <h4>{activity.title}</h4>
                        <p>{activity.subtitle}</p>
                      </div>
                    </div>

                    <span className={`activity-badge ${activity.tone}`}>
                      {activity.badge}
                    </span>
                  </article>
                );
              })}
            </div>
          </DashboardCard>

          <DashboardCard
            title="Top Products"
            icon={Boxes}
            className="products-card"
            actionText={
              <div className="products-toolbar">
                <button type="button">
                  <ArrowUpDown size={14} />
                  Sort
                </button>
                <button type="button">
                  <SlidersHorizontal size={14} />
                  Filter
                </button>
              </div>
            }
          >
            <div className="products-table-wrap">
              <table className="products-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Stocks</th>
                    <th>Price</th>
                    <th>Sales</th>
                  </tr>
                </thead>

                <tbody>
                  {productRows.map((row) => (
                    <tr key={row.product}>
                      <td>{row.product}</td>
                      <td>{row.stocks}</td>
                      <td>{row.price}</td>
                      <td>{row.sales}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DashboardCard>
        </section>
      </main>
    </div>
  );
}
