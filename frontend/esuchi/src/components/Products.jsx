import React from "react";
import { useOutletContext } from "react-router-dom";
import {
  Download,
  Bell,
  Boxes,
  DollarSign,
  EllipsisVertical,
  Grid2X2,
  LayoutList,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Users,
  Plus,
} from "lucide-react";
import "../css/Products.css";

const stats = [
  {
    title: "Total Products",
    value: "1,248",
    delta: "+4.2%",
    period: "last 7 days",
    icon: Boxes,
  },
  {
    title: "Total Revenue",
    value: "$82,429",
    delta: "+12.8",
    period: "last 7 days",
    icon: DollarSign,
  },
  {
    title: "Total Orders",
    value: "142",
    delta: "+1.4%",
    period: "last 7 days",
    icon: ShoppingCart,
  },
  {
    title: "Customers",
    value: "3,240",
    delta: "+2.1%",
    period: "last 7 days",
    icon: Users,
  },
];

const products = [
  {
    name: "Airpods",
    id: "#KMI662266",
    price: "$10,120",
    stock: "1250",
    status: "Published",
  },
  {
    name: "Airpods",
    id: "#KMI662267",
    price: "$10,120",
    stock: "1250",
    status: "Inactive",
  },
  {
    name: "Airpods",
    id: "#KMI662268",
    price: "$10,120",
    stock: "1250",
    status: "Published",
  },
  {
    name: "Airpods",
    id: "#KMI662269",
    price: "$10,120",
    stock: "1250",
    status: "Published",
  },
  {
    name: "Airpods",
    id: "#KMI662270",
    price: "$10,120",
    stock: "1250",
    status: "Inactive",
  },
  {
    name: "Airpods",
    id: "#KMI662271",
    price: "$10,120",
    stock: "1250",
    status: "Draft",
  },
  {
    name: "Airpods",
    id: "#KMI662272",
    price: "$10,120",
    stock: "1250",
    status: "Draft",
  },
  {
    name: "Airpods",
    id: "#KMI662273",
    price: "$10,120",
    stock: "1250",
    status: "Draft",
  },
];

export default function Products() {
  const { sidebarOpen } = useOutletContext();

  return (
    <div className="products-page">
      <main
        className={`products-main ${
          sidebarOpen ? "with-sidebar" : "with-collapsed-sidebar"
        }`}
      >
        <header className="products-topbar">
          <div className="products-topbar-left">
            <h1 className="products-page-title">Products</h1>
          </div>

          <div className="products-topbar-right">
            <button
              type="button"
              className="products-icon-btn"
              aria-label="Notifications"
            >
              <Bell size={18} />
            </button>

            <div className="products-search">
              <Search size={18} />
              <input type="text" placeholder="Search anything" />
            </div>

            <div className="products-avatar" aria-label="User profile">
              <span>A</span>
            </div>
          </div>
        </header>

        <section className="products-hero">
          <div className="products-hero-head">
            <p>Manage inventory, pricing and availability across your store</p>

            <div className="products-hero-actions">
              <button type="button" className="products-secondary-btn">
                <Download size={16} />
                Export
              </button>

              <button type="button" className="products-primary-btn">
                <Plus size={16} />
                Add product
              </button>
            </div>
          </div>
        </section>

        <section className="products-stats-grid">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <article key={stat.title} className="products-stat-card">
                <div className="products-stat-head">
                  <div className="products-stat-title">
                    <Icon size={18} />
                    <span>{stat.title}</span>
                  </div>
                  <button
                    type="button"
                    className="products-stat-menu"
                    aria-label={`More options for ${stat.title}`}
                  >
                    <EllipsisVertical size={16} />
                  </button>
                </div>

                <h2>{stat.value}</h2>

                <div className="products-stat-foot">
                  <span>{stat.delta}</span>
                  <span>{stat.period}</span>
                </div>
              </article>
            );
          })}
        </section>

        <section className="products-table-card">
          <div className="products-toolbar">
            <div className="products-toolbar-left">
              <div className="products-filter-search">
                <Search size={16} />
                <input type="text" placeholder="Search by product name or Id" />
              </div>

              <button type="button" className="products-filter-btn">
                Filter
              </button>

              <div className="products-view-toggle">
                <button type="button" className="active" aria-label="Grid view">
                  <Grid2X2 size={16} />
                </button>
                <button type="button" aria-label="List view">
                  <LayoutList size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="products-table-wrap">
            <table className="products-table-full">
              <thead>
                <tr>
                  <th />
                  <th>Product Name</th>
                  <th>Id & Create Date</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Select ${product.id}`}
                      />
                    </td>
                    <td>{product.name}</td>
                    <td>{product.id}</td>
                    <td>{product.price}</td>
                    <td>{product.stock}</td>
                    <td>
                      <span
                        className={`product-status ${product.status.toLowerCase()}`}
                      >
                        <span className="product-status-dot" />
                        {product.status}
                      </span>
                    </td>
                    <td>
                      <div className="product-actions">
                        <button
                          type="button"
                          className="product-action-btn edit"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="product-action-btn delete"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
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
