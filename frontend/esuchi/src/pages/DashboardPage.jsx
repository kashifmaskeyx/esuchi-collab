import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import {
  BarChart3,
  Bell,
  Clock3,
  CircleDollarSign,
  Database,
  PackageCheck,
  RotateCcw,
  Search,
  ShoppingBag,
  ShoppingCart,
  Boxes,
  TrendingUp,
} from "lucide-react";
import DashboardCard from "../components/DashboardCard";
import { getDashboardData } from "../api/dashboard";
import { getUserInitials } from "../api/auth";
import { getShipments } from "../api/shipments";
import "../css/Dashboard.css";

const readLoginNotification = () => {
  try {
    const storedNotification = sessionStorage.getItem("esuchiLoginNotification");
    return storedNotification ? JSON.parse(storedNotification) : null;
  } catch {
    return null;
  }
};

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

const formatStatusLabel = (status) => {
  if (!status) {
    return "Unknown";
  }

  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const getDateKey = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
};

const formatShortDate = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
};

export default function DashboardPage() {
  const { sidebarOpen } = useOutletContext();
  const navigate = useNavigate();
  const location = useLocation();
  const userInitials = useMemo(() => getUserInitials(), []);
  const [searchTerm, setSearchTerm] = useState("");
  const [showNotifications, setShowNotifications] = useState(
    Boolean(location.state?.openNotifications),
  );
  const notificationRef = useRef(null);
  const [loginNotification, setLoginNotification] = useState(() =>
    readLoginNotification(),
  );
  const [dashboardData, setDashboardData] = useState({
    products: [],
    inventory: [],
    stockMovements: [],
    orders: [],
    returns: [],
  });
  const [shipments, setShipments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const [data, shipmentsResponse] = await Promise.all([
          getDashboardData(),
          getShipments().catch(() => ({ data: [] })),
        ]);

        if (isMounted) {
          setDashboardData(data);
          setShipments(shipmentsResponse.data ?? []);
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
    const productPriceById = new Map(
      dashboardData.products.map((product) => [
        product._id,
        Number(product.price) || 0,
      ]),
    );
    const inventoryValue = dashboardData.inventory.reduce((sum, item) => {
      const productId = item.product?._id || item.product;
      const price = productPriceById.get(productId) || Number(item.product?.price) || 0;

      return sum + price * (Number(item.currentStock) || 0);
    }, 0);
    const totalRevenue = dashboardData.orders.reduce(
      (sum, order) => sum + (Number(order.totalAmount) || 0),
      0,
    );
    const deliveredRevenue = dashboardData.orders
      .filter((order) => order.status === "delivered")
      .reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0);
    const pendingRevenue = dashboardData.orders
      .filter((order) => order.status !== "delivered")
      .reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0);
    const averageOrderValue = dashboardData.orders.length
      ? totalRevenue / dashboardData.orders.length
      : 0;
    const returnedUnits = dashboardData.returns.reduce(
      (sum, item) => sum + (Number(item.quantity) || 0),
      0,
    );
    const damagedUnits = dashboardData.returns
      .filter((item) => item.condition !== "restockable")
      .reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const damagedValue = dashboardData.returns
      .filter((item) => item.condition !== "restockable")
      .reduce(
        (sum, item) =>
          sum + (Number(item.quantity) || 0) * (Number(item.product?.price) || 0),
        0,
      );
    const restockedUnits = dashboardData.returns
      .filter((item) => item.resolution === "restocked")
      .reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const orderStatusCounts = dashboardData.orders.reduce(
      (counts, order) => ({
        ...counts,
        [order.status || "pending"]: (counts[order.status || "pending"] || 0) + 1,
      }),
      {},
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
      revenueCards: [
        { label: "Total Revenue", value: formatCurrency(totalRevenue) },
        { label: "Delivered Revenue", value: formatCurrency(deliveredRevenue) },
      ],
      orderCards: [
        { label: "Orders", value: dashboardData.orders.length },
        { label: "Avg Order Value", value: formatCurrency(averageOrderValue) },
      ],
      returnCards: [
        { label: "Returned Units", value: returnedUnits },
        { label: "Damage Value", value: formatCurrency(damagedValue) },
      ],
      inventoryValue,
      totalRevenue,
      deliveredRevenue,
      pendingRevenue,
      averageOrderValue,
      returnedUnits,
      damagedUnits,
      damagedValue,
      restockedUnits,
      orderStatusCounts,
      lowStockItems,
    };
  }, [
    dashboardData.inventory,
    dashboardData.orders,
    dashboardData.products,
    dashboardData.returns,
  ]);

  const revenueTrend = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const key = date.toISOString().slice(0, 10);

      return {
        key,
        label: formatShortDate(date),
        revenue: 0,
      };
    });
    const dayMap = new Map(days.map((day) => [day.key, day]));

    dashboardData.orders.forEach((order) => {
      const key = getDateKey(order.orderDate || order.createdAt);
      const day = key ? dayMap.get(key) : null;

      if (day) {
        day.revenue += Number(order.totalAmount) || 0;
      }
    });

    const maxRevenue = Math.max(...days.map((day) => day.revenue), 1);

    return days.map((day) => ({
      ...day,
      height: Math.max(8, Math.round((day.revenue / maxRevenue) * 100)),
    }));
  }, [dashboardData.orders]);

  const topSellingProducts = useMemo(() => {
    const productSales = new Map();

    dashboardData.orders.forEach((order) => {
      (order.orderItems ?? []).forEach((item) => {
        const productId = item.product?._id || item.product;

        if (!productId) {
          return;
        }

        const existing = productSales.get(productId) || {
          id: productId,
          name: item.product?.name || "Unknown product",
          unitsSold: 0,
          revenue: 0,
        };
        const quantity = Number(item.quantity) || 0;
        const price = Number(item.price) || Number(item.product?.price) || 0;

        existing.unitsSold += quantity;
        existing.revenue += quantity * price;
        productSales.set(productId, existing);
      });
    });

    return Array.from(productSales.values())
      .filter((product) =>
        normalizedSearch ? product.name.toLowerCase().includes(normalizedSearch) : true,
      )
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [dashboardData.orders, normalizedSearch]);

  const orderStatusBreakdown = useMemo(
    () =>
      ["pending", "shipped", "delivered"].map((status) => ({
        status,
        label: formatStatusLabel(status),
        count: metrics.orderStatusCounts[status] || 0,
      })),
    [metrics.orderStatusCounts],
  );

  useEffect(() => {
    if (!location.state?.openNotifications) {
      return;
    }

    navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, location.state?.openNotifications, navigate]);

  useEffect(() => {
    if (!showNotifications) {
      return undefined;
    }

    const closeNotifications = (event) => {
      if (!notificationRef.current?.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("pointerdown", closeNotifications);

    return () => {
      document.removeEventListener("pointerdown", closeNotifications);
    };
  }, [showNotifications]);

  const notifications = useMemo(() => {
    const lowStockNotifications = metrics.lowStockItems.map((item) => ({
      id: `low-stock-${item._id}`,
      title: "Low stock alert",
      message: `${item.product?.name || "Unknown product"} has ${
        item.currentStock
      } left. Minimum stock is ${item.minimumStock}.`,
      tone: "danger",
    }));
    const shipmentNotifications = shipments
      .filter((shipment) => ["pending", "in_transit"].includes(shipment.status))
      .map((shipment) => ({
        id: `shipment-${shipment._id}`,
        title: "Shipment update",
        message: `${shipment.shipmentId || "Shipment"} is ${formatStatusLabel(
          shipment.status,
        ).toLowerCase()}.`,
        tone: shipment.status === "in_transit" ? "success" : "danger",
      }));

    return [
      ...(loginNotification
        ? [{ id: "login-success", ...loginNotification }]
        : []),
      ...lowStockNotifications,
      ...shipmentNotifications,
    ];
  }, [loginNotification, metrics.lowStockItems, shipments]);

  const clearLoginNotification = () => {
    sessionStorage.removeItem("esuchiLoginNotification");
    setLoginNotification(null);
  };

  const recentActivities = useMemo(
    () =>
      dashboardData.stockMovements.slice(0, 5).map((movement) => ({
        id: movement._id,
        title: movement.product?.name || "Unknown product",
        subtitle: `${movement.user?.name || "Unknown user"} - ${formatRelativeTime(
          movement.createdAt || movement.movementDate,
        )}`,
        status:
          movement.movementType === "IN"
            ? `Stock In - ${movement.quantity}`
            : movement.movementType === "OUT"
              ? `Stock Out - ${movement.quantity}`
              : `Adjusted - ${movement.quantity}`,
        tone: getMovementTone(movement.movementType),
      })),
    [dashboardData.stockMovements],
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
            <div className="notification-box-wrap" ref={notificationRef}>
              <button
                type="button"
                className="topbar-icon-btn notification-trigger"
                aria-label="Notifications"
                aria-expanded={showNotifications}
                onClick={() => setShowNotifications((current) => !current)}
              >
                <Bell size={18} />
                {notifications.length ? (
                  <span className="notification-count">
                    {notifications.length}
                  </span>
                ) : null}
              </button>

              {showNotifications ? (
                <div className="notification-box" role="status">
                  <div className="notification-box-head">
                    <h2>Notifications</h2>
                    {loginNotification ? (
                      <button type="button" onClick={clearLoginNotification}>
                        Clear login
                      </button>
                    ) : null}
                  </div>

                  {notifications.length ? (
                    <div className="notification-list">
                      {notifications.map((notification) => (
                        <article
                          key={notification.id}
                          className={`notification-item ${notification.tone}`}
                        >
                          <h3>{notification.title}</h3>
                          <p>{notification.message}</p>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="notification-empty">
                      No new notifications.
                    </p>
                  )}
                </div>
              ) : null}
            </div>

            <div className="search-field">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search products"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <button
              type="button"
              className="avatar-chip"
              onClick={() => navigate("/settings")}
              aria-label="Open account settings"
            >
              <span>{userInitials}</span>
            </button>
          </div>
        </header>

        {errorMessage ? (
          <div className="dashboard-status-banner error">{errorMessage}</div>
        ) : null}

        <section className="quick-cards-grid">
          <DashboardCard title="Revenue Analytics" icon={CircleDollarSign}>
            <div className="metric-grid">
              {metrics.revenueCards.map((card) => (
                <article key={card.label} className="metric-box">
                  <p>{card.label}</p>
                  <div className="metric-box-footer">
                    <h4>{card.value}</h4>
                  </div>
                </article>
              ))}
            </div>
          </DashboardCard>

          <DashboardCard title="Orders" icon={ShoppingCart}>
            <div className="metric-grid">
              {metrics.orderCards.map((card) => (
                <article key={card.label} className="metric-box">
                  <p>{card.label}</p>
                  <div className="metric-box-footer">
                    <h4>{card.value}</h4>
                  </div>
                </article>
              ))}
            </div>
          </DashboardCard>

          <DashboardCard title="Returns Impact" icon={RotateCcw}>
            <div className="metric-grid">
              {metrics.returnCards.map((card) => (
                <article key={card.label} className="metric-box">
                  <p>{card.label}</p>
                  <div className="metric-box-footer">
                    <h4>{card.value}</h4>
                  </div>
                </article>
              ))}
            </div>
          </DashboardCard>

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

        <section className="dashboard-analytics-grid">
          <DashboardCard
            title="7-Day Revenue Trend"
            icon={BarChart3}
            actionText={
              <span className="card-inline-note">
                {formatCurrency(metrics.totalRevenue)} total
              </span>
            }
          >
            <div className="revenue-chart">
              {revenueTrend.map((day) => (
                <article key={day.key} className="revenue-bar-item">
                  <div className="revenue-bar-track">
                    <span
                      className="revenue-bar-fill"
                      style={{ height: `${day.height}%` }}
                    />
                  </div>
                  <strong>{formatCurrency(day.revenue)}</strong>
                  <p>{day.label}</p>
                </article>
              ))}
            </div>
          </DashboardCard>

          <DashboardCard title="Business Snapshot" icon={TrendingUp}>
            <div className="business-snapshot-grid">
              <article>
                <p>Inventory Value</p>
                <strong>{formatCurrency(metrics.inventoryValue)}</strong>
              </article>
              <article>
                <p>Pending Revenue</p>
                <strong>{formatCurrency(metrics.pendingRevenue)}</strong>
              </article>
              <article>
                <p>Restocked Returns</p>
                <strong>{metrics.restockedUnits}</strong>
              </article>
              <article>
                <p>Low-Stock Items</p>
                <strong>{metrics.lowStockItems.length}</strong>
              </article>
            </div>

            <div className="order-status-strip">
              {orderStatusBreakdown.map((item) => (
                <span key={item.status} className={`order-status-pill ${item.status}`}>
                  {item.label}: {item.count}
                </span>
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
            title="Top Selling Products"
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
            ) : topSellingProducts.length ? (
              <div className="products-table-wrap">
                <table className="products-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Units Sold</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topSellingProducts.map((product) => (
                      <tr key={product.id}>
                        <td>{product.name}</td>
                        <td>{product.unitsSold}</td>
                        <td>{formatCurrency(product.revenue)}</td>
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
                        Minimum {item.minimumStock} - Last updated{" "}
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
