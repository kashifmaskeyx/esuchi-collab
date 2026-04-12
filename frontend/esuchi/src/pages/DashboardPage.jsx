import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Bell,
  Clock3,
  Database,
  PackageCheck,
  Search,
  ShoppingBag,
  Boxes,
} from "lucide-react";
import DashboardCard from "../components/DashboardCard";
import { getDashboardData } from "../api/dashboard";
import "../css/Dashboard.css";

const formatCurrency = (value) => {
  const amount = Number(value);

  if (Number.isNaN(amount)) {
    return "$0.00";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatRelativeTime = (value) => {
  if (!value) {
    return "Recently updated";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently updated";
  }

  const diffInMinutes = Math.round((date.getTime() - Date.now()) / 60000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffInMinutes) < 60) {
    return formatter.format(diffInMinutes, "minute");
  }

  const diffInHours = Math.round(diffInMinutes / 60);

  if (Math.abs(diffInHours) < 24) {
    return formatter.format(diffInHours, "hour");
  }

  const diffInDays = Math.round(diffInHours / 24);
  return formatter.format(diffInDays, "day");
};

const getMovementTone = (movementType) => {
  if (movementType === "OUT") {
    return "danger";
  }

  return "success";
};

export default function DashboardPage() {
  const { sidebarOpen } = useOutletContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [dashboardData, setDashboardData] = useState({
    products: [],
    inventory: [],
    stockMovements: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const data = await getDashboardData();

        if (isMounted) {
          setDashboardData(data);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error.response?.data?.message ||
              error.message ||
              "Unable to load dashboard data.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const inventoryByProductId = useMemo(
    () =>
      new Map(
        dashboardData.inventory
          .filter((item) => item?.product?._id)
          .map((item) => [item.product._id, item]),
      ),
    [dashboardData.inventory],
  );

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredProducts = useMemo(() => {
    if (!normalizedSearch) {
      return dashboardData.products;
    }

    return dashboardData.products.filter((product) => {
      const haystack = [
        product.name,
        product.category,
        product.supplier,
        product.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [dashboardData.products, normalizedSearch]);

  const metrics = useMemo(() => {
    const lowStockItems = dashboardData.inventory.filter(
      (item) => item.currentStock <= item.minimumStock,
    );
    const totalUnits = dashboardData.inventory.reduce(
      (sum, item) => sum + (Number(item.currentStock) || 0),
      0,
    );
    const categories = new Set(
      dashboardData.products.map((product) => product.category).filter(Boolean),
    );
    const suppliers = new Set(
      dashboardData.products.map((product) => product.supplier).filter(Boolean),
    );

    return {
      summaryCards: [
        { label: "Products in DB", value: dashboardData.products.length },
        { label: "Inventory Records", value: dashboardData.inventory.length },
      ],
      stockCards: [
        { label: "Total Units", value: totalUnits },
        { label: "Low-Stock Alerts", value: lowStockItems.length },
      ],
      catalogCards: [
        { label: "Categories", value: categories.size },
        { label: "Suppliers", value: suppliers.size },
      ],
      lowStockItems,
    };
  }, [dashboardData.inventory, dashboardData.products]);

  const recentActivities = useMemo(
    () =>
      dashboardData.stockMovements.slice(0, 5).map((movement) => ({
        id: movement._id,
        title: movement.product?.name || "Unknown product",
        subtitle: `${movement.user?.name || "Unknown user"} • ${formatRelativeTime(
          movement.createdAt || movement.movementDate,
        )}`,
        status:
          movement.movementType === "IN"
            ? `Stock In • ${movement.quantity}`
            : movement.movementType === "OUT"
              ? `Stock Out • ${movement.quantity}`
              : `Adjusted • ${movement.quantity}`,
        tone: getMovementTone(movement.movementType),
      })),
    [dashboardData.stockMovements],
  );

  const productsTableRows = useMemo(
    () =>
      filteredProducts.slice(0, 8).map((product) => {
        const inventory = inventoryByProductId.get(product._id);

        return {
          id: product._id,
          name: product.name,
          category: product.category || "Uncategorized",
          price: formatCurrency(product.price),
          stock: inventory?.currentStock ?? product.quantity ?? 0,
        };
      }),
    [filteredProducts, inventoryByProductId],
  );

  return (
    <div className="dashboard-page">
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
            <button
              type="button"
              className="topbar-icon-btn"
              aria-label="Notifications"
            >
              <Bell size={18} />
            </button>

            <div className="search-field">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search products"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <div className="avatar-chip" aria-label="User profile">
              <span>A</span>
            </div>
          </div>
        </header>

        {errorMessage ? (
          <div className="dashboard-status-banner error">{errorMessage}</div>
        ) : null}

        <section className="quick-cards-grid">
          <DashboardCard title="Inventory Summary">
            <div className="metric-grid">
              {metrics.summaryCards.map((card) => (
                <article key={card.label} className="metric-box">
                  <p>{card.label}</p>
                  <div className="metric-box-footer">
                    <h4>{card.value}</h4>
                  </div>
                </article>
              ))}
            </div>
          </DashboardCard>

          <DashboardCard title="Stock Overview" icon={Boxes}>
            <div className="metric-grid">
              {metrics.stockCards.map((card) => (
                <article key={card.label} className="metric-box">
                  <p>{card.label}</p>
                  <div className="metric-box-footer">
                    <h4>{card.value}</h4>
                  </div>
                </article>
              ))}
            </div>
          </DashboardCard>

          <DashboardCard
            title="Catalog Snapshot"
            icon={Database}
            className="shipment-card"
          >
            <div className="metric-grid">
              {metrics.catalogCards.map((card) => (
                <article key={card.label} className="metric-box">
                  <p>{card.label}</p>
                  <div className="metric-box-footer">
                    <h4>{card.value}</h4>
                  </div>
                </article>
              ))}
            </div>
          </DashboardCard>
        </section>

        <section className="dashboard-bottom-grid">
          <DashboardCard
            title="Recent Activity"
            icon={Clock3}
            actionText={
              <span className="card-inline-note">
                {dashboardData.stockMovements.length} records
              </span>
            }
            className="activity-card"
          >
            {isLoading ? (
              <div className="dashboard-state">Loading activity...</div>
            ) : recentActivities.length ? (
              <div className="activity-list">
                {recentActivities.map((item) => (
                  <article key={item.id} className="activity-item">
                    <div className="activity-item-main">
                      <div className="activity-icon">
                        {item.tone === "danger" ? (
                          <PackageCheck size={18} />
                        ) : (
                          <ShoppingBag size={18} />
                        )}
                      </div>

                      <div>
                        <h4>{item.title}</h4>
                        <p>{item.subtitle}</p>
                      </div>
                    </div>

                    <span className={`activity-badge ${item.tone}`}>
                      {item.status}
                    </span>
                  </article>
                ))}
              </div>
            ) : (
              <div className="dashboard-state">
                No stock movement records found.
              </div>
            )}
          </DashboardCard>

          <DashboardCard
            title="Top Products"
            icon={Boxes}
            className="products-card"
            actionText={
              <div className="products-toolbar">
                <span className="card-inline-note">
                  {filteredProducts.length} matched
                </span>
              </div>
            }
          >
            {isLoading ? (
              <div className="dashboard-state">Loading products...</div>
            ) : productsTableRows.length ? (
              <div className="products-table-wrap">
                <table className="products-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productsTableRows.map((product) => (
                      <tr key={product.id}>
                        <td>{product.name}</td>
                        <td>{product.category}</td>
                        <td>{product.price}</td>
                        <td>{product.stock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="dashboard-state">
                No products found in the database.
              </div>
            )}
          </DashboardCard>
        </section>

        {metrics.lowStockItems.length ? (
          <section className="dashboard-low-stock-section">
            <DashboardCard
              title="Low-Stock Watchlist"
              icon={PackageCheck}
              actionText={
                <span className="card-inline-note">
                  {metrics.lowStockItems.length} items
                </span>
              }
            >
              <div className="low-stock-list">
                {metrics.lowStockItems.slice(0, 6).map((item) => (
                  <article key={item._id} className="low-stock-item">
                    <div>
                      <h4>{item.product?.name || "Unknown product"}</h4>
                      <p>
                        Minimum {item.minimumStock} • Last updated{" "}
                        {formatRelativeTime(item.lastUpdated)}
                      </p>
                    </div>

                    <strong>{item.currentStock} left</strong>
                  </article>
                ))}
              </div>
            </DashboardCard>
          </section>
        ) : null}
      </main>
    </div>
  );
}
