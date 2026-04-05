import React, { useState } from "react";
import {
  Bell,
  CircleUserRound,
  Clock3,
  PackageCheck,
  Search,
  ShoppingBag,
  Trophy,
  ArrowUpDown,
  ListFilter,
  BarChart3,
  Boxes,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import DashboardCard from "../components/DashboardCard";
import "../css/Dashboard.css";

const summaryCards = [
  { label: "Total Item", value: "1,345" },
  { label: "Low-Stock Alerts", value: "12" },
];

const salesCards = [
  { label: "To be delivered", value: "200" },
  { label: "To be ordered", value: "20" },
];

const revenueBars = [
  { month: "Jan", value: 76 },
  { month: "Feb", value: 90 },
  { month: "Mar", value: 72 },
  { month: "Apr", value: 82 },
  { month: "May", value: 71 },
  { month: "Jun", value: 89 },
  { month: "July", value: 54 },
  { month: "Aug", value: 77 },
];

const categories = [
  { name: "Electronics", percent: 67 },
  { name: "Fashion", percent: 19 },
  { name: "Home Supplies", percent: 10 },
  { name: "Health Supplies", percent: 4 },
];

const activities = [
  { title: "Order #67", subtitle: "Masu", status: "New Order", tone: "success" },
  { title: "Low Stock Alert", subtitle: "Nike shoes", status: "Low Stock", tone: "danger" },
  { title: "Order #69", subtitle: "Joshni", status: "New Order", tone: "success" },
  { title: "Order #456", subtitle: "Kashif", status: "New Order", tone: "success" },
];

const products = [
  { name: "Samsung S26", stocks: "6767", price: "$9696", sales: "431212" },
  { name: "iPhone 16", stocks: "6767", price: "$9696", sales: "431212" },
  { name: "Nike Air", stocks: "6767", price: "$9696", sales: "431212" },
  { name: "Galaxy Air Buds", stocks: "6767", price: "$9696", sales: "431212" },
  { name: "Acer Predator", stocks: "6767", price: "$9696", sales: "431212" },
];

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
          <div className="topbar-left">
            <h1 className="dashboard-page-title">Dashboard</h1>
          </div>

          <div className="topbar-right">
            <button type="button" className="topbar-icon-btn" aria-label="Notifications">
              <Bell size={18} />
            </button>

            <div className="search-field">
              <Search size={18} />
              <input type="text" placeholder="Search anything" />
            </div>

            <div className="avatar-chip" aria-label="User profile">
              <CircleUserRound size={18} />
              <span>A</span>
            </div>
          </div>
        </header>

        <section className="quick-cards-grid">
          <DashboardCard title="Inventory Summary">
            <div className="metric-grid">
              {summaryCards.map((card) => (
                <article key={card.label} className="metric-box">
                  <p>{card.label}</p>
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
                <article key={card.label} className="metric-box">
                  <p>{card.label}</p>
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
          <DashboardCard title="Sales Revenue" icon={BarChart3} className="revenue-card">
            <div className="chart-tabs">
              <button type="button" className="active">
                Monthly
              </button>
              <button type="button">Quarterly</button>
              <button type="button">Yearly</button>
            </div>

            <div className="revenue-chart">
              <div className="revenue-grid-lines">
                <span>25k</span>
                <span>20k</span>
                <span>15k</span>
                <span>10k</span>
                <span>0</span>
              </div>

              <div className="revenue-bars">
                {revenueBars.map((bar) => (
                  <div key={bar.month} className="revenue-bar-group">
                    <div className="revenue-bar-track">
                      <span className="revenue-bar-fill" style={{ height: `${bar.value}%` }} />
                    </div>
                    <p>{bar.month}</p>
                  </div>
                ))}
              </div>
            </div>
          </DashboardCard>

          <DashboardCard title="Top Categories" icon={Trophy} actionText="See All" className="categories-card">
            <div className="category-chart-wrap">
              <div className="category-donut" />
            </div>

            <div className="category-list">
              {categories.map((item) => (
                <div key={item.name} className="category-row">
                  <span>{item.name}</span>
                  <strong>{item.percent}%</strong>
                </div>
              ))}
            </div>
          </DashboardCard>
        </section>

        <section className="dashboard-bottom-grid">
          <DashboardCard title="Recent Activity" icon={Clock3} actionText="See All" className="activity-card">
            <div className="activity-list">
              {activities.map((item) => (
                <article key={`${item.title}-${item.subtitle}`} className="activity-item">
                  <div className="activity-item-main">
                    <div className="activity-icon">
                      {item.tone === "danger" ? <PackageCheck size={18} /> : <ShoppingBag size={18} />}
                    </div>

                    <div>
                      <h4>{item.title}</h4>
                      <p>{item.subtitle}</p>
                    </div>
                  </div>

                  <span className={`activity-badge ${item.tone}`}>{item.status}</span>
                </article>
              ))}
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
                  <ListFilter size={14} />
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
                  {products.map((product) => (
                    <tr key={product.name}>
                      <td>{product.name}</td>
                      <td>{product.stocks}</td>
                      <td>{product.price}</td>
                      <td>{product.sales}</td>
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
