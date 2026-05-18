import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  Bell,
  CircleDollarSign,
  CirclePlus,
  PackageCheck,
  Pencil,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import { getStoredUser, getUserInitials, isAdminEmail } from "../api/auth";
import {
  createSalesOrder,
  deleteSalesOrder,
  getAdminOrders,
  getSalesOrders,
  updateSalesOrderStatus,
} from "../api/orders";
import { getProductListing } from "../api/products";
import "../css/Operations.css";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date);
};

export default function SalesOrders() {
  const { sidebarOpen } = useOutletContext();
  const navigate = useNavigate();
  const currentUser = useMemo(() => getStoredUser(), []);
  const isAdminUser = useMemo(
    () => currentUser?.role === "admin" || isAdminEmail(currentUser?.email),
    [currentUser],
  );
  const userInitials = useMemo(() => getUserInitials(), []);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderStatus, setOrderStatus] = useState("pending");
  const [form, setForm] = useState({ product: "", quantity: "1" });

  const productById = useMemo(
    () =>
      new Map(
        products
          .map((product) => [product?._id || product?.id, product])
          .filter(([id]) => Boolean(id)),
      ),
    [products],
  );

  const getOrderProductName = useCallback(
    (item) => {
      if (item.product?.name) {
        return item.product.name;
      }

      const productId =
        typeof item.product === "string" ? item.product : item.product?._id;

      return productById.get(productId)?.name || "Unknown product";
    },
    [productById],
  );

  const getOrderProductSummary = useCallback(
    (order) =>
      (order.orderItems ?? [])
        .map((item) => {
          const quantity = Number(item.quantity) || 0;
          return `${getOrderProductName(item)} (${quantity})`;
        })
        .join(", "),
    [getOrderProductName],
  );

  const loadOrders = async () => {
    const response = isAdminUser
      ? await getAdminOrders()
      : await getSalesOrders();
    setOrders(response.data ?? []);
  };

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");
        const [ordersResponse, productsResponse] = await Promise.all([
          isAdminUser ? getAdminOrders() : getSalesOrders(),
          getProductListing(),
        ]);

        if (isMounted) {
          setOrders(ordersResponse.data ?? []);
          setProducts(productsResponse.products ?? []);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error.response?.data?.message ||
              error.message ||
              "Unable to load sales orders.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isAdminUser]);

  const filteredOrders = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();

    if (!normalized) {
      return orders;
    }

    return orders.filter((order) => {
      const productNames = getOrderProductSummary(order);

      return [order._id, order.status, productNames]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [getOrderProductSummary, orders, searchTerm]);

  const stats = useMemo(() => {
    const totalRevenue = orders.reduce(
      (sum, order) => sum + (Number(order.totalAmount) || 0),
      0,
    );

    return [
      { label: "Sales Orders", value: orders.length, icon: ShoppingCart },
      {
        label: "Pending",
        value: orders.filter((order) => order.status === "pending").length,
        icon: PackageCheck,
      },
      {
        label: "Delivered",
        value: orders.filter((order) => order.status === "delivered").length,
        icon: PackageCheck,
      },
      {
        label: "Revenue",
        value: formatCurrency(totalRevenue),
        icon: CircleDollarSign,
      },
    ];
  }, [orders]);

  const closeModals = () => {
    if (isSubmitting) {
      return;
    }

    setIsCreateModalOpen(false);
    setSelectedOrder(null);
    setOrderStatus("pending");
    setSubmitError("");
    setForm({ product: "", quantity: "1" });
  };

  const handleCreateOrder = async (event) => {
    event.preventDefault();
    setSubmitError("");

    const quantity = Number(form.quantity);

    if (!form.product || !Number.isFinite(quantity) || quantity < 1) {
      setSubmitError("Select a product and enter a valid quantity.");
      return;
    }

    setIsSubmitting(true);

    try {
      await createSalesOrder({
        orderItems: [{ product: form.product, quantity }],
      });
      await loadOrders();
      closeModals();
    } catch (error) {
      setSubmitError(
        error.response?.data?.message ||
          error.message ||
          "Unable to create sales order.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const openStatusModal = (order) => {
    setSelectedOrder(order);
    setOrderStatus(order.status || "pending");
    setSubmitError("");
  };

  const handleUpdateStatus = async (event) => {
    event.preventDefault();

    if (!selectedOrder?._id) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      await updateSalesOrderStatus(selectedOrder._id, orderStatus);
      await loadOrders();
      closeModals();
    } catch (error) {
      setSubmitError(
        error.response?.data?.message ||
          error.message ||
          "Unable to update sales order.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOrder = async (order) => {
    if (!window.confirm("Delete this sales order?")) {
      return;
    }

    try {
      await deleteSalesOrder(order._id);
      await loadOrders();
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Unable to delete sales order.",
      );
    }
  };

  return (
    <div className="ops-page">
      <main
        className={`ops-main ${
          sidebarOpen ? "with-sidebar" : "with-collapsed-sidebar"
        }`}
      >
        <header className="ops-topbar">
          <h1 className="ops-page-title">Sales Orders</h1>
          <div className="ops-topbar-right">
            <button
              type="button"
              className="ops-icon-btn"
              aria-label="Notifications"
            >
              <Bell size={18} />
            </button>
            <button
              type="button"
              className="ops-avatar"
              onClick={() => navigate("/settings")}
              aria-label="Open account settings"
            >
              {userInitials}
            </button>
          </div>
        </header>

        <section className="ops-hero">
          <div>
            <h2>Track every sale from order to delivery.</h2>
            <p>
              Watch revenue, fulfillment status, and product demand in one
              place.
            </p>
          </div>
          <button
            type="button"
            className="ops-primary-btn"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <CirclePlus size={16} />
            New Order
          </button>
        </section>

        <section className="ops-stats-grid">
          {stats.map((card) => {
            const Icon = card.icon;

            return (
              <article className="ops-stat-card" key={card.label}>
                <div className="ops-stat-head">
                  <div>
                    <p>{card.label}</p>
                    <h3>{card.value}</h3>
                  </div>
                  <span className="ops-stat-icon">
                    <Icon size={18} />
                  </span>
                </div>
              </article>
            );
          })}
        </section>

        <section className="ops-panel">
          <div className="ops-panel-head">
            <div>
              <h3>Order Pipeline</h3>
              <p>{filteredOrders.length} records matched</p>
            </div>
            <div className="ops-search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search orders"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </div>

          <div className="ops-table-wrap">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Products</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="7" className="ops-table-state">
                      Loading sales orders...
                    </td>
                  </tr>
                ) : errorMessage ? (
                  <tr>
                    <td colSpan="7" className="ops-table-state error">
                      {errorMessage}
                    </td>
                  </tr>
                ) : filteredOrders.length ? (
                  filteredOrders.map((order) => {
                    const productSummary = getOrderProductSummary(order);
                    const itemCount = (order.orderItems ?? []).reduce(
                      (sum, item) => sum + (Number(item.quantity) || 0),
                      0,
                    );

                    return (
                      <tr key={order._id}>
                        <td>{order._id.slice(-8).toUpperCase()}</td>
                        <td>{productSummary || "-"}</td>
                        <td>{itemCount}</td>
                        <td>{formatCurrency(order.totalAmount)}</td>
                        <td>
                          <span className={`ops-badge ${order.status}`}>
                            {order.status}
                          </span>
                        </td>
                        <td>
                          {formatDate(order.orderDate || order.createdAt)}
                        </td>
                        <td>
                          <div className="ops-row-actions">
                            <button
                              type="button"
                              className="ops-row-btn edit"
                              onClick={() => openStatusModal(order)}
                            >
                              <Pencil size={14} />
                              Status
                            </button>
                            <button
                              type="button"
                              className="ops-row-btn delete"
                              onClick={() => handleDeleteOrder(order)}
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="ops-table-state">
                      No sales orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {isCreateModalOpen ? (
          <div className="ops-modal-backdrop" onClick={closeModals}>
            <div
              className="ops-modal ops-modal-small"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="ops-modal-head">
                <div>
                  <h2>New Sales Order</h2>
                  <p>Create an order from available products.</p>
                </div>
                <button
                  type="button"
                  className="ops-modal-close"
                  onClick={closeModals}
                >
                  <X size={18} />
                </button>
              </div>
              <form className="ops-form" onSubmit={handleCreateOrder}>
                <label className="ops-form-full">
                  <span>Product</span>
                  <select
                    value={form.product}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        product: event.target.value,
                      }))
                    }
                  >
                    <option value="">Select product</option>
                    {products.map((product) => (
                      <option key={product._id} value={product._id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="ops-form-full">
                  <span>Quantity</span>
                  <input
                    type="number"
                    min="1"
                    value={form.quantity}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        quantity: event.target.value,
                      }))
                    }
                  />
                </label>
                {submitError ? (
                  <p className="ops-form-error">{submitError}</p>
                ) : null}
                <div className="ops-form-actions">
                  <button
                    type="button"
                    className="ops-secondary-btn"
                    onClick={closeModals}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="ops-primary-btn"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Creating..." : "Create Order"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {selectedOrder ? (
          <div className="ops-modal-backdrop" onClick={closeModals}>
            <div
              className="ops-modal ops-modal-small"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="ops-modal-head">
                <div>
                  <h2>Update Status</h2>
                  <p>Move this sales order through fulfillment.</p>
                </div>
                <button
                  type="button"
                  className="ops-modal-close"
                  onClick={closeModals}
                >
                  <X size={18} />
                </button>
              </div>
              <form className="ops-form" onSubmit={handleUpdateStatus}>
                <label className="ops-form-full">
                  <span>Status</span>
                  <select
                    value={orderStatus}
                    onChange={(event) => setOrderStatus(event.target.value)}
                  >
                    <option value="pending">Pending</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                  </select>
                </label>
                {submitError ? (
                  <p className="ops-form-error">{submitError}</p>
                ) : null}
                <div className="ops-form-actions">
                  <button
                    type="button"
                    className="ops-secondary-btn"
                    onClick={closeModals}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="ops-primary-btn"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Saving..." : "Save Status"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
