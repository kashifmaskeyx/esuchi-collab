import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Bell,
  Boxes,
  ClipboardList,
  Plus,
  Search,
  TrendingUp,
  X,
} from "lucide-react";
import { createStockMovement, getInventoryPageData } from "../api/inventory";
import "../css/Inventory.css";

const emptyMovementForm = {
  product: "",
  movementType: "IN",
  quantity: "1",
  movementDate: new Date().toISOString().slice(0, 10),
};

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

const getProductCode = (product, inventory) => {
  if (inventory?.inventoryId) {
    return inventory.inventoryId;
  }

  return `PRD-${String(product?._id || "unknown").slice(-6).toUpperCase()}`;
};

const getMovementBadgeClass = (movementType) => {
  if (movementType === "IN") {
    return "inventory-movement-badge in";
  }

  if (movementType === "OUT") {
    return "inventory-movement-badge out";
  }

  return "inventory-movement-badge";
};

export default function Inventory() {
  const { sidebarOpen } = useOutletContext();
  const [pageData, setPageData] = useState({
    products: [],
    inventory: [],
    movements: [],
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [movementFilter, setMovementFilter] = useState("all");
  const [inventoryFilter, setInventoryFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [movementForm, setMovementForm] = useState(emptyMovementForm);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadInventoryData = async (keepLoading = true) => {
    try {
      if (keepLoading) {
        setIsLoading(true);
      }

      setErrorMessage("");
      const data = await getInventoryPageData();
      setPageData(data);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Unable to load inventory data from the backend.",
      );
    } finally {
      if (keepLoading) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadInventoryData();
  }, []);

  const inventoryByProductId = useMemo(
    () =>
      new Map(
        pageData.inventory
          .filter((item) => item?.product?._id)
          .map((item) => [item.product._id, item]),
      ),
    [pageData.inventory],
  );

  const inventoryRows = useMemo(
    () =>
      pageData.products.map((product) => {
        const inventory = inventoryByProductId.get(product._id);
        const currentStock = inventory?.currentStock ?? product.quantity ?? 0;
        const minimumStock = inventory?.minimumStock ?? 0;

        return {
          id: product._id,
          inventoryId: inventory?._id || "",
          productName: product.name || "Unnamed product",
          productCode: getProductCode(product, inventory),
          category: product.category || "Uncategorized",
          currentStock,
          minimumStock,
          lastUpdated: inventory?.lastUpdated || product.updatedAt,
          status:
            currentStock === 0
              ? "empty"
              : currentStock <= minimumStock
                ? "low"
                : "healthy",
        };
      }),
    [inventoryByProductId, pageData.products],
  );

  const movementRows = useMemo(
    () =>
      pageData.movements.map((movement) => ({
        id: movement._id,
        movementId: movement.movementId || movement._id,
        productName: movement.product?.name || "Unknown product",
        movementType: movement.movementType || "-",
        quantity: Number(movement.quantity) || 0,
        movementDate: movement.movementDate || movement.createdAt,
        createdBy: movement.user?.name || "Unknown user",
      })),
    [pageData.movements],
  );

  const filteredInventoryRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return inventoryRows.filter((row) => {
      const matchesSearch =
        !normalizedSearch ||
        row.productName.toLowerCase().includes(normalizedSearch) ||
        row.productCode.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        inventoryFilter === "all" ||
        (inventoryFilter === "attention" && row.status !== "healthy") ||
        row.status === inventoryFilter;

      return matchesSearch && matchesStatus;
    });
  }, [inventoryFilter, inventoryRows, searchTerm]);

  const filteredMovementRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return movementRows.filter((row) => {
      const matchesSearch =
        !normalizedSearch ||
        row.productName.toLowerCase().includes(normalizedSearch) ||
        row.movementId.toLowerCase().includes(normalizedSearch) ||
        row.createdBy.toLowerCase().includes(normalizedSearch);

      const matchesType =
        movementFilter === "all" || row.movementType === movementFilter;

      return matchesSearch && matchesType;
    });
  }, [movementFilter, movementRows, searchTerm]);

  const stats = useMemo(
    () => [
      {
        title: "Tracked Products",
        value: inventoryRows.length,
        note: "Live items with stock visibility",
        icon: Boxes,
        tone: "blue",
      },
      {
        title: "Stock Units",
        value: inventoryRows.reduce((sum, row) => sum + row.currentStock, 0),
        note: "Current quantity across all products",
        icon: TrendingUp,
        tone: "green",
      },
      {
        title: "Attention Needed",
        value: inventoryRows.filter((row) => row.status !== "healthy").length,
        note: "Low stock or empty inventory records",
        icon: AlertTriangle,
        tone: "amber",
      },
      {
        title: "Movement History",
        value: movementRows.length,
        note: "Stock in and stock out records stored",
        icon: ClipboardList,
        tone: "slate",
      },
    ],
    [inventoryRows, movementRows.length],
  );

  const selectableProducts = useMemo(
    () => inventoryRows.filter((row) => row.inventoryId),
    [inventoryRows],
  );

  const selectedInventoryRow = useMemo(
    () => inventoryRows.find((row) => row.id === movementForm.product) || null,
    [inventoryRows, movementForm.product],
  );

  const projectedStock = useMemo(() => {
    if (!selectedInventoryRow) {
      return null;
    }

    const quantity = Number(movementForm.quantity);

    if (!Number.isFinite(quantity) || quantity < 0) {
      return null;
    }

    if (movementForm.movementType === "IN") {
      return selectedInventoryRow.currentStock + quantity;
    }

    return selectedInventoryRow.currentStock - quantity;
  }, [movementForm.movementType, movementForm.quantity, selectedInventoryRow]);

  const openMovementModal = () => {
    setMovementForm({
      ...emptyMovementForm,
      product: selectableProducts[0]?.id || "",
    });
    setSubmitError("");
    setIsModalOpen(true);
  };

  const closeMovementModal = () => {
    if (isSubmitting) {
      return;
    }

    setIsModalOpen(false);
    setMovementForm(emptyMovementForm);
    setSubmitError("");
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setMovementForm((current) => ({ ...current, [name]: value }));
  };

  const submitMovement = async (confirmLowStock = false) => {
    const payload = {
      product: movementForm.product,
      movementType: movementForm.movementType,
      quantity: Number(movementForm.quantity),
      movementDate: movementForm.movementDate,
      confirmLowStock,
    };

    await createStockMovement(payload);
    await loadInventoryData(false);
    closeMovementModal();
  };

  const handleCreateMovement = async (event) => {
    event.preventDefault();
    setSubmitError("");

    if (!movementForm.product) {
      setSubmitError("Product name is required.");
      return;
    }

    const quantity = Number(movementForm.quantity);

    if (!Number.isFinite(quantity) || quantity < 1) {
      setSubmitError("Quantity must be at least 1.");
      return;
    }

    if (!movementForm.movementDate) {
      setSubmitError("Date is required.");
      return;
    }

    if (
      movementForm.movementType === "OUT" &&
      selectedInventoryRow &&
      quantity > selectedInventoryRow.currentStock
    ) {
      setSubmitError("Stock out quantity cannot be greater than current stock.");
      return;
    }

    setIsSubmitting(true);

    try {
      await submitMovement(false);
    } catch (error) {
      if (error.response?.status === 409 && error.response?.data?.warning) {
        const warningMessage =
          error.response.data?.message ||
          "This movement will reduce stock below the minimum level.";
        const details = error.response.data?.data;
        const confirmed = window.confirm(
          `${warningMessage}\n\nProduct: ${details?.product || selectedInventoryRow?.productName || "-"}\nCurrent stock: ${details?.currentStock ?? selectedInventoryRow?.currentStock ?? "-"}\nProjected stock: ${details?.projectedStock ?? projectedStock ?? "-"}\nMinimum stock: ${details?.minimumStock ?? selectedInventoryRow?.minimumStock ?? "-"}\n\nDo you want to save anyway?`,
        );

        if (confirmed) {
          await submitMovement(true);
        }
      } else {
        setSubmitError(
          error.response?.data?.message ||
            error.message ||
            "Unable to record stock movement.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="inventory-page">
      <main
        className={`inventory-main ${
          sidebarOpen ? "with-sidebar" : "with-collapsed-sidebar"
        }`}
      >
        <header className="inventory-topbar">
          <div className="inventory-topbar-left">
            <h1 className="inventory-page-title">Inventory</h1>
          </div>

          <div className="inventory-topbar-right">
            <button type="button" className="inventory-icon-btn" aria-label="Notifications">
              <Bell size={18} />
            </button>

            <div className="inventory-avatar" aria-label="User profile">
              <span>A</span>
            </div>
          </div>
        </header>

        <section className="inventory-hero">
          <div>
            <h2>Inventory Updates</h2>
            <p>
              Record stock in and stock out, keep current stock levels updated,
              and review the full movement history.
            </p>
          </div>

          <button
            type="button"
            className="inventory-primary-btn"
            onClick={openMovementModal}
            disabled={!selectableProducts.length}
          >
            <Plus size={16} />
            Record Movement
          </button>
        </section>

        <section className="inventory-stats-grid">
          {stats.map((card) => {
            const Icon = card.icon;

            return (
              <article key={card.title} className="inventory-stat-card">
                <div className="inventory-stat-head">
                  <div>
                    <p>{card.title}</p>
                    <h2>{card.value}</h2>
                  </div>
                  <span className={`inventory-stat-icon ${card.tone}`}>
                    <Icon size={18} />
                  </span>
                </div>

                <div className="inventory-stat-note">
                  <span>{card.note}</span>
                </div>
              </article>
            );
          })}
        </section>

        <section className="inventory-panel">
          <div className="inventory-panel-head">
            <div>
              <h3>Inventory Overview</h3>
              <p>Live stock levels and minimum thresholds for each product.</p>
            </div>

            <div className="inventory-tools">
              <div className="inventory-search">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search products or codes"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>

              <select
                className="inventory-filter"
                value={inventoryFilter}
                onChange={(event) => setInventoryFilter(event.target.value)}
              >
                <option value="all">All stock states</option>
                <option value="healthy">Healthy</option>
                <option value="low">Low stock</option>
                <option value="empty">Empty</option>
                <option value="attention">Needs attention</option>
              </select>
            </div>
          </div>

          <div className="inventory-table-wrap">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Code</th>
                  <th>Category</th>
                  <th>Current Stock</th>
                  <th>Minimum Stock</th>
                  <th>Last Updated</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="7" className="inventory-table-state">
                      Loading inventory from the backend...
                    </td>
                  </tr>
                ) : errorMessage ? (
                  <tr>
                    <td colSpan="7" className="inventory-table-state error">
                      {errorMessage}
                    </td>
                  </tr>
                ) : filteredInventoryRows.length ? (
                  filteredInventoryRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.productName}</td>
                      <td>{row.productCode}</td>
                      <td>{row.category}</td>
                      <td>{row.currentStock}</td>
                      <td>{row.minimumStock}</td>
                      <td>{formatDate(row.lastUpdated)}</td>
                      <td>
                        <span className={`inventory-status ${row.status}`}>
                          {row.status === "healthy"
                            ? "Healthy"
                            : row.status === "low"
                              ? "Low stock"
                              : "Out of stock"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="inventory-table-state">
                      No inventory records match the current search or filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="inventory-panel">
          <div className="inventory-panel-head">
            <div>
              <h3>Stock Movement History</h3>
              <p>Full recorded history for admins and users to review.</p>
            </div>

            <select
              className="inventory-filter"
              value={movementFilter}
              onChange={(event) => setMovementFilter(event.target.value)}
            >
              <option value="all">All movement types</option>
              <option value="IN">Stock In</option>
              <option value="OUT">Stock Out</option>
            </select>
          </div>

          <div className="inventory-table-wrap">
            <table className="inventory-table inventory-history-table">
              <thead>
                <tr>
                  <th>Movement ID</th>
                  <th>Product Name</th>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Date</th>
                  <th>Recorded By</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="6" className="inventory-table-state">
                      Loading movement history...
                    </td>
                  </tr>
                ) : errorMessage ? (
                  <tr>
                    <td colSpan="6" className="inventory-table-state error">
                      {errorMessage}
                    </td>
                  </tr>
                ) : filteredMovementRows.length ? (
                  filteredMovementRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.movementId}</td>
                      <td>{row.productName}</td>
                      <td>
                        <span className={getMovementBadgeClass(row.movementType)}>
                          {row.movementType === "IN" ? (
                            <ArrowUpCircle size={14} />
                          ) : (
                            <ArrowDownCircle size={14} />
                          )}
                          {row.movementType === "IN" ? "Stock In" : "Stock Out"}
                        </span>
                      </td>
                      <td>{row.quantity}</td>
                      <td>{formatDate(row.movementDate)}</td>
                      <td>{row.createdBy}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="inventory-table-state">
                      No stock movement records match the current search or filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {isModalOpen ? (
          <div className="inventory-modal-backdrop" onClick={closeMovementModal}>
            <div
              className="inventory-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="inventory-modal-head">
                <div>
                  <h2>Record Stock Movement</h2>
                  <p>
                    Save stock in and stock out transactions with date, quantity,
                    and automatic stock updates.
                  </p>
                </div>
                <button
                  type="button"
                  className="inventory-modal-close"
                  onClick={closeMovementModal}
                >
                  <X size={18} />
                </button>
              </div>

              <form className="inventory-form" onSubmit={handleCreateMovement}>
                <label className="inventory-form-full">
                  <span>Product Name</span>
                  <select
                    name="product"
                    value={movementForm.product}
                    onChange={handleFormChange}
                  >
                    <option value="">Select product</option>
                    {selectableProducts.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.productName}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Movement Type</span>
                  <select
                    name="movementType"
                    value={movementForm.movementType}
                    onChange={handleFormChange}
                  >
                    <option value="IN">Stock In</option>
                    <option value="OUT">Stock Out</option>
                  </select>
                </label>

                <label>
                  <span>Quantity</span>
                  <input
                    name="quantity"
                    type="number"
                    min="1"
                    value={movementForm.quantity}
                    onChange={handleFormChange}
                  />
                </label>

                <label className="inventory-form-full">
                  <span>Date</span>
                  <input
                    name="movementDate"
                    type="date"
                    value={movementForm.movementDate}
                    onChange={handleFormChange}
                  />
                </label>

                {selectedInventoryRow ? (
                  <div className="inventory-projection-card">
                    <strong>{selectedInventoryRow.productName}</strong>
                    <span>Current stock: {selectedInventoryRow.currentStock}</span>
                    <span>Minimum stock: {selectedInventoryRow.minimumStock}</span>
                    <span>
                      Projected stock after save:{" "}
                      {projectedStock ?? selectedInventoryRow.currentStock}
                    </span>
                  </div>
                ) : null}

                {submitError ? <p className="inventory-form-error">{submitError}</p> : null}

                <div className="inventory-form-actions">
                  <button
                    type="button"
                    className="inventory-secondary-btn"
                    onClick={closeMovementModal}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inventory-primary-btn"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Saving..." : "Save Movement"}
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
