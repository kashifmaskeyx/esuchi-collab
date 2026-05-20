import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  AlertTriangle,
  Bell,
  CirclePlus,
  PackageCheck,
  RotateCcw,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import { getSalesOrders } from "../api/orders";
import { getProductListing } from "../api/products";
import { createReturn, getReturns } from "../api/returns";
import UserProfileMenu from "./UserProfileMenu";
import "../css/Operations.css";

const emptyForm = {
  order: "",
  product: "",
  quantity: "1",
  condition: "restockable",
  resolution: "restocked",
  reason: "",
  notes: "",
};

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

const getConditionLabel = (condition) => {
  const labels = {
    restockable: "Restockable",
    damaged: "Damaged",
    expired: "Expired",
    lost: "Lost",
  };

  return labels[condition] || condition;
};

export default function Returns() {
  const { sidebarOpen } = useOutletContext();
  const [returns, setReturns] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const loadReturns = async () => {
    const response = await getReturns();
    setReturns(response.data ?? []);
  };

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const [returnsResponse, ordersResponse, productsResponse] =
          await Promise.all([
            getReturns(),
            getSalesOrders(),
            getProductListing(),
          ]);

        if (isMounted) {
          setReturns(returnsResponse.data ?? []);
          setOrders(ordersResponse.data ?? []);
          setProducts(productsResponse.products ?? []);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error.response?.data?.message ||
              error.message ||
              "Unable to load returns.",
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
  }, []);

  const selectedOrder = useMemo(
    () => orders.find((order) => order._id === form.order) || null,
    [form.order, orders],
  );

  const selectableProducts = useMemo(() => {
    if (!selectedOrder) {
      return products.map((product) => ({
        id: product._id,
        name: product.name,
        maxQuantity: null,
      }));
    }

    return (selectedOrder.orderItems ?? [])
      .filter((item) => item.product?._id)
      .map((item) => ({
        id: item.product._id,
        name: item.product.name,
        maxQuantity: item.quantity,
      }));
  }, [products, selectedOrder]);

  const filteredReturns = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();

    if (!normalized) {
      return returns;
    }

    return returns.filter((item) =>
      [
        item.returnId,
        item.product?.name,
        item.condition,
        item.resolution,
        item.reason,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [returns, searchTerm]);

  const stats = useMemo(
    () => [
      { label: "Total Returns", value: returns.length, icon: RotateCcw },
      {
        label: "Restocked",
        value: returns.filter((item) => item.resolution === "restocked").length,
        icon: PackageCheck,
      },
      {
        label: "Damaged / Loss",
        value: returns.filter((item) => item.condition !== "restockable")
          .length,
        icon: ShieldAlert,
      },
      {
        label: "Units Reviewed",
        value: returns.reduce(
          (sum, item) => sum + (Number(item.quantity) || 0),
          0,
        ),
        icon: AlertTriangle,
      },
    ],
    [returns],
  );

  const openModal = () => {
    setForm({
      ...emptyForm,
      product: products[0]?._id || "",
    });
    setSubmitError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) {
      return;
    }

    setIsModalOpen(false);
    setForm(emptyForm);
    setSubmitError("");
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => {
      const next = { ...current, [name]: value };

      if (name === "order") {
        const order = orders.find((item) => item._id === value);
        next.product =
          order?.orderItems?.[0]?.product?._id || products[0]?._id || "";
      }

      if (name === "condition" && value === "restockable") {
        next.resolution = "restocked";
      }

      if (name === "condition" && value !== "restockable") {
        next.resolution = "quarantined";
      }

      return next;
    });
  };

  const handleCreateReturn = async (event) => {
    event.preventDefault();
    setSubmitError("");

    const quantity = Number(form.quantity);

    if (!form.product || !Number.isFinite(quantity) || quantity < 1) {
      setSubmitError("Select a product and enter a valid quantity.");
      return;
    }

    if (!form.reason.trim()) {
      setSubmitError("Return reason is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      await createReturn({
        ...form,
        order: form.order || null,
        quantity,
      });
      await loadReturns();
      closeModal();
    } catch (error) {
      setSubmitError(
        error.response?.data?.message ||
          error.message ||
          "Unable to record return.",
      );
    } finally {
      setIsSubmitting(false);
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
          <h1 className="ops-page-title">Returns & Damage</h1>
          <div className="ops-topbar-right">
            <button
              type="button"
              className="ops-icon-btn"
              aria-label="Notifications"
            >
              <Bell size={18} />
            </button>
            <UserProfileMenu className="ops-profile-menu" />
          </div>
        </header>

        <section className="ops-hero">
          <div>
            <h2>Return policy control for sellable and damaged stock.</h2>
            <p>
              Restock clean returns, quarantine damaged goods, and keep every
              exception visible in inventory history.
            </p>
          </div>
          <button type="button" className="ops-primary-btn" onClick={openModal}>
            <CirclePlus size={16} />
            Record Return
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
              <h3>Return Records</h3>
              <p>{filteredReturns.length} records matched</p>
            </div>
            <div className="ops-search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search returns"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </div>

          <div className="ops-table-wrap">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Return ID</th>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Condition</th>
                  <th>Resolution</th>
                  <th>Reason</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="7" className="ops-table-state">
                      Loading returns...
                    </td>
                  </tr>
                ) : errorMessage ? (
                  <tr>
                    <td colSpan="7" className="ops-table-state error">
                      {errorMessage}
                    </td>
                  </tr>
                ) : filteredReturns.length ? (
                  filteredReturns.map((item) => (
                    <tr key={item._id}>
                      <td>{item.returnId}</td>
                      <td>{item.product?.name || "-"}</td>
                      <td>{item.quantity}</td>
                      <td>
                        <span
                          className={`ops-badge ${
                            item.condition === "restockable"
                              ? "delivered"
                              : "suspended"
                          }`}
                        >
                          {getConditionLabel(item.condition)}
                        </span>
                      </td>
                      <td>{item.resolution}</td>
                      <td>{item.reason}</td>
                      <td>{formatDate(item.createdAt)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="ops-table-state">
                      No return records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {isModalOpen ? (
          <div className="ops-modal-backdrop" onClick={closeModal}>
            <div
              className="ops-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="ops-modal-head">
                <div>
                  <h2>Record Return</h2>
                  <p>
                    Choose whether this return becomes sellable stock again.
                  </p>
                </div>
                <button
                  type="button"
                  className="ops-modal-close"
                  onClick={closeModal}
                >
                  <X size={18} />
                </button>
              </div>

              <form className="ops-form" onSubmit={handleCreateReturn}>
                <label>
                  <span>Related Order</span>
                  <select
                    name="order"
                    value={form.order}
                    onChange={handleFormChange}
                  >
                    <option value="">No order selected</option>
                    {orders.map((order) => (
                      <option key={order._id} value={order._id}>
                        {order._id.slice(-8).toUpperCase()}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Product</span>
                  <select
                    name="product"
                    value={form.product}
                    onChange={handleFormChange}
                  >
                    <option value="">Select product</option>
                    {selectableProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                        {product.maxQuantity
                          ? ` (${product.maxQuantity} ordered)`
                          : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Quantity</span>
                  <input
                    name="quantity"
                    type="number"
                    min="1"
                    value={form.quantity}
                    onChange={handleFormChange}
                  />
                </label>

                <label>
                  <span>Condition</span>
                  <select
                    name="condition"
                    value={form.condition}
                    onChange={handleFormChange}
                  >
                    <option value="restockable">Restockable</option>
                    <option value="damaged">Damaged</option>
                    <option value="expired">Expired</option>
                    <option value="lost">Lost</option>
                  </select>
                </label>

                <label>
                  <span>Resolution</span>
                  <select
                    name="resolution"
                    value={form.resolution}
                    onChange={handleFormChange}
                  >
                    <option value="restocked">Restocked</option>
                    <option value="quarantined">Quarantined</option>
                    <option value="disposed">Disposed</option>
                    <option value="refund">Refund</option>
                    <option value="replacement">Replacement</option>
                  </select>
                </label>

                <label>
                  <span>Reason</span>
                  <input
                    name="reason"
                    value={form.reason}
                    onChange={handleFormChange}
                    placeholder="Damaged on arrival, wrong item, expired..."
                  />
                </label>

                <label className="ops-form-full">
                  <span>Notes</span>
                  <input
                    name="notes"
                    value={form.notes}
                    onChange={handleFormChange}
                    placeholder="Inspection notes or customer context"
                  />
                </label>

                {submitError ? (
                  <p className="ops-form-error">{submitError}</p>
                ) : null}

                <div className="ops-form-actions">
                  <button
                    type="button"
                    className="ops-secondary-btn"
                    onClick={closeModal}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="ops-primary-btn"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Saving..." : "Save Return"}
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
