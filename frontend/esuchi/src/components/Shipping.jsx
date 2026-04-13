import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Bell,
  CirclePlus,
  PackageCheck,
  Pencil,
  Search,
  Truck,
  CircleCheckBig,
  Boxes,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import {
  createShipment,
  deleteShipment,
  getProducts,
  getShipments,
  getSuppliers,
  updateShipmentStatus,
} from "../api/shipments";
import "../css/Shipping.css";

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

export default function Shipping() {
  const { sidebarOpen } = useOutletContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [shipments, setShipments] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    supplier: "",
    product: "",
    quantity: "1",
    expectedDeliveryDate: "",
    notes: "",
  });
  const [editStatus, setEditStatus] = useState("pending");

  useEffect(() => {
    let isMounted = true;

    const loadShippingData = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const [shipmentsResponse, suppliersResponse, productsResponse] =
          await Promise.all([getShipments(), getSuppliers(), getProducts()]);

        if (isMounted) {
          setShipments(shipmentsResponse.data ?? []);
          setSuppliers(suppliersResponse.data ?? []);
          setProducts(Array.isArray(productsResponse) ? productsResponse : []);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error.response?.data?.message ||
              error.message ||
              "Unable to load shipments from the backend.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadShippingData();

    return () => {
      isMounted = false;
    };
  }, []);

  const refreshShipments = async () => {
    const response = await getShipments();
    setShipments(response.data ?? []);
  };

  const filteredShipments = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return shipments;
    }

    return shipments.filter((shipment) => {
      const productNames = (shipment.products ?? [])
        .map((item) => item.product?.name)
        .filter(Boolean)
        .join(" ");

      const haystack = [
        shipment.shipmentId,
        shipment.supplier,
        shipment.status,
        shipment.notes,
        shipment.createdBy?.name,
        productNames,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [searchTerm, shipments]);

  const statCards = useMemo(
    () => [
      {
        title: "Total Shipments",
        value: shipments.length,
        note: "Backend shipment records",
        icon: Boxes,
        tone: "purple",
      },
      {
        title: "Pending Shipments",
        value: shipments.filter((shipment) => shipment.status === "pending").length,
        note: "Awaiting shipment progress",
        icon: PackageCheck,
        tone: "blue",
      },
      {
        title: "In Transit",
        value: shipments.filter((shipment) => shipment.status === "in_transit").length,
        note: "Currently on the way",
        icon: Truck,
        tone: "amber",
      },
      {
        title: "Delivered",
        value: shipments.filter((shipment) => shipment.status === "delivered").length,
        note: "Completed shipment records",
        icon: CircleCheckBig,
        tone: "green",
      },
    ],
    [shipments],
  );

  const handleCreateFormChange = (event) => {
    const { name, value } = event.target;
    setCreateForm((current) => ({ ...current, [name]: value }));
  };

  const openEditModal = (shipment) => {
    setSelectedShipment(shipment);
    setEditStatus(shipment.status || "pending");
    setSubmitError("");
    setIsEditModalOpen(true);
  };

  const closeModals = () => {
    if (isSubmitting) {
      return;
    }

    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setSelectedShipment(null);
    setEditStatus("pending");
    setSubmitError("");
    setCreateForm({
      supplier: "",
      product: "",
      quantity: "1",
      expectedDeliveryDate: "",
      notes: "",
    });
  };

  const handleCreateShipment = async (event) => {
    event.preventDefault();
    setSubmitError("");

    if (!createForm.supplier || !createForm.product || !createForm.expectedDeliveryDate) {
      setSubmitError("Supplier, product, and expected delivery date are required.");
      return;
    }

    const quantity = Number(createForm.quantity);

    if (Number.isNaN(quantity) || quantity < 1) {
      setSubmitError("Quantity must be at least 1.");
      return;
    }

    setIsSubmitting(true);

    try {
      await createShipment({
        supplier: createForm.supplier,
        products: [{ product: createForm.product, quantity }],
        expectedDeliveryDate: createForm.expectedDeliveryDate,
        notes: createForm.notes.trim(),
      });

      await refreshShipments();
      closeModals();
    } catch (error) {
      setSubmitError(
        error.response?.data?.message ||
          error.message ||
          "Unable to create shipment.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (event) => {
    event.preventDefault();
    setSubmitError("");

    if (!selectedShipment?._id) {
      setSubmitError("No shipment selected.");
      return;
    }

    setIsSubmitting(true);

    try {
      await updateShipmentStatus(selectedShipment._id, editStatus);
      await refreshShipments();
      closeModals();
    } catch (error) {
      setSubmitError(
        error.response?.data?.message ||
          error.message ||
          "Unable to update shipment status.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteShipment = async (shipment) => {
    const confirmed = window.confirm(`Delete shipment ${shipment.shipmentId || ""}?`);

    if (!confirmed) {
      return;
    }

    try {
      await deleteShipment(shipment._id);
      await refreshShipments();
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Unable to delete shipment.",
      );
    }
  };

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

            <button type="button" className="shipping-profile">
              <div className="shipping-profile-avatar">A</div>
            </button>
          </div>
        </header>

        <section className="shipping-hero">
          <div>
            <h2>Shipping Management</h2>
            <p>Track, manage, and update your product deliveries.</p>
          </div>
          <button
            type="button"
            className="shipping-create-btn"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <CirclePlus size={16} />
            Create Shipment
          </button>
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

        <section className="shipping-panel shipping-table-panel">
          <div className="shipping-panel-head">
            <div>
              <h3>Recent Shipments</h3>
              <p>Track and manage all shipments</p>
            </div>

            <div className="shipping-table-tools">
              <div className="shipping-search shipping-table-search">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search shipments"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="shipping-table-wrap">
            <table className="shipping-table">
              <thead>
                <tr>
                  <th>Shipment ID</th>
                  <th>Products</th>
                  <th>Total Qty</th>
                  <th>Status</th>
                  <th>Expected Delivery</th>
                  <th>Created By</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="8" className="shipping-table-state">
                      Loading shipments from the backend...
                    </td>
                  </tr>
                ) : errorMessage ? (
                  <tr>
                    <td colSpan="8" className="shipping-table-state error">
                      {errorMessage}
                    </td>
                  </tr>
                ) : filteredShipments.length ? (
                  filteredShipments.map((shipment) => {
                    const totalQuantity = (shipment.products ?? []).reduce(
                      (sum, item) => sum + (Number(item.quantity) || 0),
                      0,
                    );
                    const productSummary = (shipment.products ?? [])
                      .map((item) =>
                        item.product?.name
                          ? `${item.product.name} (${item.quantity})`
                          : `Unknown product (${item.quantity})`,
                      )
                      .join(", ");

                    return (
                      <tr key={shipment._id}>
                        <td>{shipment.shipmentId || "-"}</td>
                        <td>{productSummary || "-"}</td>
                        <td>{totalQuantity}</td>
                        <td>
                          <span
                            className={`shipping-status ${String(shipment.status)
                              .toLowerCase()
                              .replace(/\s+/g, "-")}`}
                          >
                            {formatStatusLabel(shipment.status)}
                          </span>
                        </td>
                        <td>{formatDate(shipment.expectedDeliveryDate)}</td>
                        <td>{shipment.createdBy?.name || "-"}</td>
                        <td>{shipment.notes || "-"}</td>
                        <td>
                          <div className="shipping-row-actions">
                            {["pending", "in_transit"].includes(shipment.status) ? (
                              <button
                                type="button"
                                className="shipping-row-btn edit"
                                onClick={() => openEditModal(shipment)}
                              >
                                <Pencil size={14} />
                                Edit
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="shipping-row-btn delete"
                              onClick={() => handleDeleteShipment(shipment)}
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
                    <td colSpan="8" className="shipping-table-state">
                      No shipments match the current search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {isCreateModalOpen ? (
          <div className="shipping-modal-backdrop" onClick={closeModals}>
            <div className="shipping-modal" onClick={(event) => event.stopPropagation()}>
              <div className="shipping-modal-head">
                <div>
                  <h2>Create Shipment</h2>
                  <p>Add a shipment record using backend supplier and product entities.</p>
                </div>
                <button type="button" className="shipping-modal-close" onClick={closeModals}>
                  <X size={18} />
                </button>
              </div>

              <form className="shipping-form" onSubmit={handleCreateShipment}>
                <label>
                  <span>Supplier</span>
                  <select
                    name="supplier"
                    value={createForm.supplier}
                    onChange={handleCreateFormChange}
                  >
                    <option value="">Select supplier</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier._id} value={supplier._id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Product</span>
                  <select
                    name="product"
                    value={createForm.product}
                    onChange={handleCreateFormChange}
                  >
                    <option value="">Select product</option>
                    {products.map((product) => (
                      <option key={product._id} value={product._id}>
                        {product.name}
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
                    value={createForm.quantity}
                    onChange={handleCreateFormChange}
                  />
                </label>

                <label>
                  <span>Expected Delivery Date</span>
                  <input
                    name="expectedDeliveryDate"
                    type="date"
                    value={createForm.expectedDeliveryDate}
                    onChange={handleCreateFormChange}
                  />
                </label>

                <label className="shipping-form-full">
                  <span>Notes</span>
                  <textarea
                    name="notes"
                    rows="3"
                    value={createForm.notes}
                    onChange={handleCreateFormChange}
                  />
                </label>

                {submitError ? <p className="shipping-form-error">{submitError}</p> : null}

                <div className="shipping-form-actions">
                  <button type="button" className="shipping-form-secondary" onClick={closeModals}>
                    Cancel
                  </button>
                  <button type="submit" className="shipping-create-btn" disabled={isSubmitting}>
                    {isSubmitting ? "Creating..." : "Create Shipment"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {isEditModalOpen ? (
          <div className="shipping-modal-backdrop" onClick={closeModals}>
            <div className="shipping-modal shipping-modal-small" onClick={(event) => event.stopPropagation()}>
              <div className="shipping-modal-head">
                <div>
                  <h2>Edit Shipment Status</h2>
                  <p>Update the status for pending or in-transit shipments.</p>
                </div>
                <button type="button" className="shipping-modal-close" onClick={closeModals}>
                  <X size={18} />
                </button>
              </div>

              <form className="shipping-form" onSubmit={handleUpdateStatus}>
                <label className="shipping-form-full">
                  <span>Status</span>
                  <select value={editStatus} onChange={(event) => setEditStatus(event.target.value)}>
                    <option value="pending">Pending</option>
                    <option value="in_transit">In Transit</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </label>

                {submitError ? <p className="shipping-form-error">{submitError}</p> : null}

                <div className="shipping-form-actions">
                  <button type="button" className="shipping-form-secondary" onClick={closeModals}>
                    Cancel
                  </button>
                  <button type="submit" className="shipping-create-btn" disabled={isSubmitting}>
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
