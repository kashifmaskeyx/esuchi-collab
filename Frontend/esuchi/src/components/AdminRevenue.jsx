import React, { useMemo } from "react";
import { BadgeDollarSign, CircleDollarSign, PackageCheck, ShoppingCart } from "lucide-react";
import DashboardCard from "./DashboardCard";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
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

export default function AdminRevenue({ orders = [] }) {
  const revenueSummary = useMemo(() => {
    const totalRevenue = orders.reduce(
      (sum, order) => sum + (Number(order.totalAmount) || 0),
      0,
    );
    const deliveredOrders = orders.filter((order) => order.status === "delivered");
    const deliveredRevenue = deliveredOrders.reduce(
      (sum, order) => sum + (Number(order.totalAmount) || 0),
      0,
    );
    const pendingRevenue = orders
      .filter((order) => order.status === "pending")
      .reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0);
    const averageOrderValue = orders.length ? totalRevenue / orders.length : 0;

    return [
      {
        label: "Total Revenue",
        value: formatCurrency(totalRevenue),
        icon: CircleDollarSign,
      },
      {
        label: "Delivered Revenue",
        value: formatCurrency(deliveredRevenue),
        icon: PackageCheck,
      },
      {
        label: "Pending Value",
        value: formatCurrency(pendingRevenue),
        icon: ShoppingCart,
      },
      {
        label: "Average Order",
        value: formatCurrency(averageOrderValue),
        icon: BadgeDollarSign,
      },
    ];
  }, [orders]);

  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort(
          (first, second) =>
            new Date(second.createdAt || 0).getTime() -
            new Date(first.createdAt || 0).getTime(),
        )
        .slice(0, 5),
    [orders],
  );

  return (
    <div className="admin-revenue-view">
      <section className="admin-revenue-metrics">
        {revenueSummary.map(({ label, value, icon: Icon }) => (
          <article className="admin-revenue-metric" key={label}>
            <span>
              <Icon size={20} />
            </span>
            <div>
              <p>{label}</p>
              <strong>{value}</strong>
            </div>
          </article>
        ))}
      </section>

      <DashboardCard
        title="Revenue Orders"
        icon={CircleDollarSign}
        className="products-card"
        actionText={<span className="card-inline-note">{orders.length} orders</span>}
      >
        <div className="products-table-wrap">
          <table className="products-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Products</th>
                <th>Status</th>
                <th>Total</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length ? (
                recentOrders.map((order) => {
                  const products = (order.orderItems ?? [])
                    .map((item) => item.product?.name)
                    .filter(Boolean)
                    .join(", ");

                  return (
                    <tr key={order._id}>
                      <td>
                        {order._id
                          ? `ORD-${order._id.slice(-6).toUpperCase()}`
                          : "ORD"}
                      </td>
                      <td>{products || "-"}</td>
                      <td>
                        <span
                          className={`admin-status-pill ${
                            order.status === "delivered" ? "success" : "warning"
                          }`}
                        >
                          {formatStatusLabel(order.status)}
                        </span>
                      </td>
                      <td>{formatCurrency(order.totalAmount)}</td>
                      <td>{formatDate(order.createdAt)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="admin-actions-empty" colSpan="5">
                    No revenue orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DashboardCard>
    </div>
  );
}
