import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  AlertTriangle,
  Bell,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  createInventory,
  createProduct,
  deleteInventory,
  deleteProduct,
  getProductListing,
  updateInventoryMinimum,
  updateInventoryStock,
  updateProduct,
} from "../api/products";
import "../css/Products.css";

const getProductCode = (product, inventory) => {
  if (inventory?.inventoryId) {
    return inventory.inventoryId;
  }

  return `PRD-${String(product?._id || "unknown").slice(-6).toUpperCase()}`;
};

const emptyForm = {
  name: "",
  category: "",
  quantity: "",
  minimumStock: "",
  supplier: "",
  description: "",
  price: "",
};

export default function Products() {
  const { sidebarOpen } = useOutletContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [listingData, setListingData] = useState({ products: [], inventory: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [formData, setFormData] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const loadProducts = async (keepLoading = true) => {
    try {
      if (keepLoading) {
        setIsLoading(true);
      }
      setErrorMessage("");

      const data = await getProductListing();
      setListingData(data);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Unable to load products from the backend.",
      );
    } finally {
      if (keepLoading) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const inventoryByProductId = useMemo(
    () =>
      new Map(
        listingData.inventory
          .filter((item) => item?.product?._id)
          .map((item) => [item.product._id, item]),
      ),
    [listingData.inventory],
  );

  const openAddModal = () => {
    setModalMode("add");
    setSelectedProductId("");
    setFormData(emptyForm);
    setSubmitError("");
    setIsModalOpen(true);
  };

  const openEditModal = (product) => {
    const inventory = inventoryByProductId.get(product.id);

    setModalMode("edit");
    setSelectedProductId(product.id);
    setFormData({
      name: product.name,
      category: product.category === "Uncategorized" ? "" : product.category,
      quantity: String(product.currentStock),
      minimumStock: String(product.minimumStock),
      supplier: product.supplier || "",
      description: product.description || "",
      price: String(product.priceValue ?? 0),
    });
    setSubmitError("");
    setIsModalOpen(true);
    void inventory;
  };

  const closeModal = () => {
    if (isSubmitting) {
      return;
    }

    setIsModalOpen(false);
    setSelectedProductId("");
    setFormData(emptyForm);
    setSubmitError("");
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const categories = useMemo(() => {
    const uniqueCategories = new Set(
      listingData.products.map((product) => product.category).filter(Boolean),
    );

    return ["all", ...Array.from(uniqueCategories).sort((a, b) => a.localeCompare(b))];
  }, [listingData.products]);

  const productRows = useMemo(
    () =>
      listingData.products.map((product) => {
        const inventory = inventoryByProductId.get(product._id);
        const currentStock = inventory?.currentStock ?? product.quantity ?? 0;
        const minimumStock = inventory?.minimumStock ?? 0;

        return {
          id: product._id,
          name: product.name || "Unnamed product",
          code: getProductCode(product, inventory),
          category: product.category || "Uncategorized",
          currentStock,
          minimumStock,
          isLowStock: currentStock <= minimumStock,
          supplier: product.supplier || "",
          description: product.description || "",
          priceValue: Number(product.price) || 0,
          inventoryRecordId: inventory?._id || "",
        };
      }),
    [inventoryByProductId, listingData.products],
  );

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return productRows.filter((product) => {
      const matchesCategory =
        categoryFilter === "all" || product.category === categoryFilter;
      const matchesSearch =
        !normalizedSearch ||
        product.name.toLowerCase().includes(normalizedSearch) ||
        product.code.toLowerCase().includes(normalizedSearch);

      return matchesCategory && matchesSearch;
    });
  }, [categoryFilter, productRows, searchTerm]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");

    const payload = {
      name: formData.name.trim(),
      category: formData.category.trim(),
      quantity: Number(formData.quantity),
      supplier: formData.supplier.trim(),
      description: formData.description.trim(),
      price: Number(formData.price),
    };
    const minimumStock = Number(formData.minimumStock);

    if (!payload.name) {
      setSubmitError("Product name is required.");
      return;
    }

    if (Number.isNaN(payload.price)) {
      setSubmitError("Price must be a number.");
      return;
    }

    if (Number.isNaN(payload.quantity) || payload.quantity < 0) {
      setSubmitError("Current stock must be 0 or greater.");
      return;
    }

    if (Number.isNaN(minimumStock) || minimumStock < 0) {
      setSubmitError("Minimum stock must be 0 or greater.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (modalMode === "add") {
        const createdProduct = await createProduct(payload);
        await createInventory({
          product: createdProduct._id,
          currentStock: payload.quantity,
          minimumStock,
        });
      } else {
        await updateProduct(selectedProductId, payload);

        const currentRow = productRows.find((product) => product.id === selectedProductId);

        if (currentRow?.inventoryRecordId) {
          await Promise.all([
            updateInventoryStock(currentRow.inventoryRecordId, payload.quantity),
            updateInventoryMinimum(currentRow.inventoryRecordId, minimumStock),
          ]);
        } else {
          await createInventory({
            product: selectedProductId,
            currentStock: payload.quantity,
            minimumStock,
          });
        }
      }

      await loadProducts(false);
      closeModal();
    } catch (error) {
      setSubmitError(
        error.response?.data?.message ||
          error.message ||
          "Unable to save the product.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (product) => {
    const confirmed = window.confirm(`Delete ${product.name}?`);

    if (!confirmed) {
      return;
    }

    try {
      if (product.inventoryRecordId) {
        await deleteInventory(product.inventoryRecordId);
      }

      await deleteProduct(product.id);
      await loadProducts(false);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Unable to delete the product.",
      );
    }
  };

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

            <div className="products-avatar" aria-label="User profile">
              <span>A</span>
            </div>
          </div>
        </header>

        <section className="products-hero">
          <div className="products-hero-head">
            <p>
              Browse the live inventory list from the backend and quickly find
              low-stock products.
            </p>
            <div className="products-hero-actions">
              <button type="button" className="products-primary-btn" onClick={openAddModal}>
                <Plus size={16} />
                Add Product
              </button>
            </div>
          </div>
        </section>

        <section className="products-table-card">
          <div className="products-toolbar">
            <div className="products-toolbar-left">
              <div className="products-filter-search">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search by product name or code"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>

              <label className="products-category-filter">
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category === "all" ? "All categories" : category}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="products-table-wrap">
            <table className="products-table-full">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Product Code</th>
                  <th>Category</th>
                  <th>Current Stock</th>
                  <th>Minimum Stock</th>
                  <th>Stock Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="7" className="products-table-state">
                      Loading products from the backend...
                    </td>
                  </tr>
                ) : errorMessage ? (
                  <tr>
                    <td colSpan="7" className="products-table-state error">
                      {errorMessage}
                    </td>
                  </tr>
                ) : filteredRows.length ? (
                  filteredRows.map((product) => (
                    <tr
                      key={product.id}
                      className={product.isLowStock ? "product-row-low-stock" : ""}
                    >
                      <td>{product.name}</td>
                      <td>{product.code}</td>
                      <td>{product.category}</td>
                      <td>{product.currentStock}</td>
                      <td>{product.minimumStock}</td>
                      <td>
                        {product.isLowStock ? (
                          <span className="product-stock-badge low">
                            <AlertTriangle size={14} />
                            Low stock
                          </span>
                        ) : (
                          <span className="product-stock-badge ok">In stock</span>
                        )}
                      </td>
                      <td>
                        <div className="product-actions">
                          <button
                            type="button"
                            className="product-action-btn edit"
                            onClick={() => openEditModal(product)}
                          >
                            <Pencil size={14} />
                            Edit
                          </button>
                          <button
                            type="button"
                            className="product-action-btn delete"
                            onClick={() => handleDelete(product)}
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="products-table-state">
                      No products match the current search or category filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {isModalOpen ? (
          <div className="products-modal-backdrop" onClick={closeModal}>
            <div
              className="products-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="products-modal-head">
                <div>
                  <h2>{modalMode === "add" ? "Add Product" : "Edit Product"}</h2>
                  <p>Update product and inventory details from the frontend.</p>
                </div>
                <button type="button" className="products-modal-close" onClick={closeModal}>
                  <X size={18} />
                </button>
              </div>

              <form className="products-form" onSubmit={handleSubmit}>
                <label>
                  <span>Product Name</span>
                  <input name="name" value={formData.name} onChange={handleFormChange} />
                </label>

                <label>
                  <span>Category</span>
                  <input
                    name="category"
                    value={formData.category}
                    onChange={handleFormChange}
                  />
                </label>

                <label>
                  <span>Price</span>
                  <input
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={handleFormChange}
                  />
                </label>

                <label>
                  <span>Current Stock</span>
                  <input
                    name="quantity"
                    type="number"
                    min="0"
                    value={formData.quantity}
                    onChange={handleFormChange}
                  />
                </label>

                <label>
                  <span>Minimum Stock</span>
                  <input
                    name="minimumStock"
                    type="number"
                    min="0"
                    value={formData.minimumStock}
                    onChange={handleFormChange}
                  />
                </label>

                <label>
                  <span>Supplier</span>
                  <input
                    name="supplier"
                    value={formData.supplier}
                    onChange={handleFormChange}
                  />
                </label>

                <label className="products-form-full">
                  <span>Description</span>
                  <textarea
                    name="description"
                    rows="3"
                    value={formData.description}
                    onChange={handleFormChange}
                  />
                </label>

                {submitError ? <p className="products-form-error">{submitError}</p> : null}

                <div className="products-form-actions">
                  <button type="button" className="products-secondary-btn" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" className="products-primary-btn" disabled={isSubmitting}>
                    {isSubmitting
                      ? "Saving..."
                      : modalMode === "add"
                        ? "Add Product"
                        : "Save Changes"}
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
