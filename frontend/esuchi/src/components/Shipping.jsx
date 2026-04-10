import React from "react";
import { useOutletContext } from "react-router-dom";
import {
  Bell,
  ChevronDown,
  PackageCheck,
  Search,
  Truck,
  CircleCheckBig,
  Boxes,
  TrendingUp,
} from "lucide-react";
import "../css/Shipping.css";

const statCards = [
  {
    title: "Total Shipments",
    value: "2,870",
    note: "8.4% from last month",
    icon: Boxes,
    tone: "purple",
  },
  {
    title: "Pending Shipments",
    value: "340",
    note: "5% from last month",
    icon: PackageCheck,
    tone: "blue",
  },
  {
    title: "In Transit",
    value: "1,125",
    note: "10% increase on time delivery",
    icon: Truck,
    tone: "amber",
  },
  {
    title: "Delivered",
    value: "1,405",
    note: "0.6% from last week",
    icon: CircleCheckBig,
    tone: "green",
  },
];

const chartPoints = [
  { label: "Jan 4", orange: 40, green: 10, yellow: 50 },
  { label: "Jan 8", orange: 60, green: 20, yellow: 42 },
  { label: "Jan 12", orange: 82, green: 38, yellow: 18 },
  { label: "Jan 16", orange: 48, green: 74, yellow: 22 },
  { label: "Jan 20", orange: 30, green: 40, yellow: 58 },
  { label: "Jan 24", orange: 48, green: 28, yellow: 74 },
  { label: "Jan 28", orange: 12, green: 38, yellow: 56 },
  { label: "Jan 31", orange: 76, green: 56, yellow: 16 },
];

const partners = [
  { name: "DHL Express", shipments: "1,245", success: "96%", time: "2.1 Days" },
  { name: "FedEx", shipments: "980", success: "94%", time: "2.3 Days" },
  { name: "UPS", shipments: "645", success: "91%", time: "2.8 Days" },
  { name: "Aramex", shipments: "312", success: "91%", time: "2.8 Days" },
  { name: "Blue Dart", shipments: "278", success: "91%", time: "2.8 Days" },
];

const shipments = [
  {
    id: "TXN-982341",
    orderId: "ORD-45821",
    customer: "Sarah Lee",
    address: "New York, USA",
    courier: "DHL",
    status: "Delivered",
    date: "Jan 16, 2026",
  },
  {
    id: "TXN-982342",
    orderId: "ORD-45822",
    customer: "Kabir Singh",
    address: "Kathmandu, Nepal",
    courier: "FedEx",
    status: "In Transit",
    date: "Jan 18, 2026",
  },
  {
    id: "TXN-982343",
    orderId: "ORD-45823",
    customer: "Mina Roy",
    address: "Delhi, India",
    courier: "UPS",
    status: "Pending",
    date: "Jan 19, 2026",
  },
];

export default function Shipping() {
  const { sidebarOpen } = useOutletContext();

  const buildAreaPath = (key) =>
    chartPoints
      .map((point, index) => {
        const x = index * 84 + 16;
        const y = 220 - point[key] * 2.1;
        return `${index === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");

  return (
    <div className="shipping-page">
      <main
        className={`shipping-main ${
          sidebarOpen ? "with-sidebar" : "with-collapsed-sidebar"
        }`}
      >
        <header className="shipping-topbar">
          <div className="shipping-topbar-left">
            <h1 className="shipping-page-title">Shipment</h1>
          </div>

          <div className="shipping-topbar-right">
            <button type="button" className="shipping-icon-btn" aria-label="Notifications">
              <Bell size={18} />
            </button>

            <div className="shipping-search">
              <Search size={18} />
              <input type="text" placeholder="Search anything" />
            </div>

            <button type="button" className="shipping-profile">
              <div className="shipping-profile-avatar">A</div>
            </button>
          </div>
        </header>

        <section className="shipping-hero">
          <h2>Shipping Management</h2>
          <p>Track, manage, and update your product deliveries.</p>
        </section>

        <section className="shipping-stats-grid">
          {statCards.map((card) => {
            const Icon = card.icon;

            return (
              <article key={card.title} className="shipping-stat-card">
                <div className="shipping-stat-head">
                  <div>
                    <p>{card.title}</p>
                    <h2>{card.value}</h2>
                  </div>
                  <span className={`shipping-stat-icon ${card.tone}`}>
                    <Icon size={18} />
                  </span>
                </div>

                <div className="shipping-stat-note">
                  <TrendingUp size={14} />
                  <span>{card.note}</span>
                </div>
              </article>
            );
          })}
        </section>

        <section className="shipping-dashboard-grid">
          <article className="shipping-panel shipping-chart-panel">
            <div className="shipping-panel-head">
              <div>
                <h3>Delivery Performance</h3>
                <p>Delivery performance over last 30 days</p>
              </div>

              <button type="button" className="shipping-filter-btn">
                Monthly
                <ChevronDown size={16} />
              </button>
            </div>

            <div className="shipping-chart-wrap">
              <svg viewBox="0 0 620 250" className="shipping-chart" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((line) => (
                  <line
                    key={line}
                    x1="0"
                    y1={30 + line * 45}
                    x2="620"
                    y2={30 + line * 45}
                    className="shipping-grid-line"
                  />
                ))}

                <path d={buildAreaPath("orange")} className="shipping-line orange" />
                <path d={buildAreaPath("green")} className="shipping-line green" />
                <path d={buildAreaPath("yellow")} className="shipping-line yellow" />

                {chartPoints.map((point, index) => (
                  <g key={point.label}>
                    <circle cx={index * 84 + 16} cy={220 - point.orange * 2.1} r="4" className="shipping-point orange" />
                    <circle cx={index * 84 + 16} cy={220 - point.green * 2.1} r="4" className="shipping-point green" />
                    <circle cx={index * 84 + 16} cy={220 - point.yellow * 2.1} r="4" className="shipping-point yellow" />
                  </g>
                ))}
              </svg>

              <div className="shipping-chart-labels">
                {chartPoints.map((point) => (
                  <span key={point.label}>{point.label}</span>
                ))}
              </div>
            </div>

            <div className="shipping-chart-summary">
              <div>
                <p>Avg Delivery Time</p>
                <strong>2.4 Days</strong>
              </div>
              <div>
                <p>On-Time Delivery Rate</p>
                <strong>92.6%</strong>
              </div>
              <div>
                <p>Late Deliveries</p>
                <strong>7.4%</strong>
              </div>
            </div>
          </article>

          <article className="shipping-panel shipping-partners-panel">
            <div className="shipping-panel-head shipping-partners-head">
              <div>
                <h3>Shipping Partners</h3>
              </div>
            </div>

            <div className="shipping-partner-table">
              <div className="shipping-partner-head shipping-partner-row">
                <span>Partner</span>
                <span>Shipments</span>
                <span>Success Rate</span>
                <span>Avg Delivery Time</span>
              </div>

              {partners.map((partner) => (
                <div key={partner.name} className="shipping-partner-row">
                  <span className="shipping-partner-name">
                    <span className="shipping-partner-dot" />
                    {partner.name}
                  </span>
                  <span>{partner.shipments}</span>
                  <span>{partner.success}</span>
                  <span>{partner.time}</span>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="shipping-panel shipping-table-panel">
          <div className="shipping-panel-head">
            <div>
              <h3>Recent Shipments</h3>
              <p>Track and manage all shipments</p>
            </div>

            <div className="shipping-table-tools">
              <div className="shipping-search shipping-table-search">
                <Search size={16} />
                <input type="text" placeholder="Search" />
              </div>
              <button type="button" className="shipping-filter-btn">
                Date Range
                <ChevronDown size={16} />
              </button>
            </div>
          </div>

          <div className="shipping-table-wrap">
            <table className="shipping-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Address</th>
                  <th>Courier</th>
                  <th>Status</th>
                  <th>Expected Delivery</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((shipment) => (
                  <tr key={shipment.id}>
                    <td>{shipment.id}</td>
                    <td>{shipment.orderId}</td>
                    <td>{shipment.customer}</td>
                    <td>{shipment.address}</td>
                    <td>{shipment.courier}</td>
                    <td>
                      <span
                        className={`shipping-status ${shipment.status
                          .toLowerCase()
                          .replace(/\s+/g, "-")}`}
                      >
                        {shipment.status}
                      </span>
                    </td>
                    <td>{shipment.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
