import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BadgeDollarSign,
  Bell,
  CircleDollarSign,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  ShoppingCart,
  Settings,
  Truck,
  Trash2,
  UserCog,
  UsersRound,
  Warehouse,
  X,
} from "lucide-react";
import AdminRevenue from "./AdminRevenue";
import DashboardCard from "./DashboardCard";
import Pagination from "./Pagination";
import {
  ADMIN_EMAIL,
  getAdminUsers,
  getUserInitials,
  logoutUser,
  updateAdminUserRole,
} from "../api/auth";
import { getDashboardData } from "../api/dashboard";
import {
  createSalesOrder,
  deleteSalesOrder,
  getAdminOrders,
  updateSalesOrderStatus,
} from "../api/orders";
import {
  createInventory,
  createProduct,
  deleteInventory,
  deleteProduct,
  updateInventoryMinimum,
  updateInventoryStock,
  updateProduct,
} from "../api/products";
import { createStockMovement } from "../api/inventory";
import {
  createShipment,
  deleteShipment,
  getShipments,
  getSuppliers,
  updateShipmentStatus,
} from "../api/shipments";
import logo from "../assets/logo.png";
import logoIn from "../assets/LogoIn.png";
import "../css/Dashboard.css";

const adminUser = {
  name: "eSuchi Admin",
  email: ADMIN_EMAIL,
  role: "admin",
};

const adminNavItems = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Users", icon: UsersRound },
  { label: "Products", icon: Package },
  { label: "Inventory", icon: Warehouse },
  { label: "Shipments", icon: Truck },
  { label: "Sales Orders", icon: ClipboardList },
  { label: "Revenue", icon: CircleDollarSign },
  { label: "Settings", icon: Settings },
];

const ADMIN_TABLE_PAGE_SIZE = 6;

const emptyProductForm = {
  name: "",
  category: "",
  quantity: "",
  minimumStock: "",
  supplier: "",
  description: "",
  price: "",
};

const emptyMovementForm = {
  product: "",
  movementType: "IN",
  quantity: "1",
  movementDate: new Date().toISOString().slice(0, 10),
};

const emptyShipmentForm = {
  supplier: "",
  product: "",
  quantity: "1",
  expectedDeliveryDate: "",
  notes: "",
};

const emptyOrderForm = {
  product: "",
  quantity: "1",
};

const defaultAdminFilters = {
  userRole: "all",
  userStatus: "all",
  userVerified: "all",
  productCategory: "all",
  productStatus: "all",
  inventoryCategory: "all",
  inventoryStatus: "all",
  shipmentStatus: "all",
  orderStatus: "all",
  revenueStatus: "all",
};

const formatStatus = (status) => {
  if (!status) {
    return "Unknown";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
};

const getStatusTone = (status) => {
  const normalizedStatus = status?.toLowerCase();

  if (normalizedStatus === "active") {
    return "success";
  }

  return "warning";
};

const getResponseRows = (response) => {
  if (Array.isArray(response)) {
    return response;
  }

  return response?.data ?? [];
};

const getOrderRows = (response) => {
  if (Array.isArray(response)) {
    return response;
  }

  return response?.data ?? [];
};

const getShipmentRows = (response) => {
  if (Array.isArray(response)) {
    return response;
  }

  return response?.data ?? [];
};

const getProductCode = (product, inventory) => {
  if (inventory?.inventoryId) {
    return inventory.inventoryId;
  }

  return `PRD-${String(product?._id || "unknown").slice(-6).toUpperCase()}`;
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

const formatStatusLabel = (status) => {
  if (!status) {
    return "Unknown";
  }

  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const formatCompactNumber = (value) =>
  new Intl.NumberFormat("en-US").format(Number(value) || 0);

const formatCompactCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const readLoginNotification = () => {
  try {
    const storedNotification = sessionStorage.getItem(
      "esuchiLoginNotification",
    );
    return storedNotification ? JSON.parse(storedNotification) : null;
  } catch {
    return null;
  }
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const notificationRef = useRef(null);
  const userInitials = useMemo(() => getUserInitials(adminUser) || "EA", []);
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window === "undefined" ? true : window.innerWidth > 980,
  );
  const [activeAdminView, setActiveAdminView] = useState("Overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [adminFilters, setAdminFilters] = useState(defaultAdminFilters);
  const [productPage, setProductPage] = useState(1);
  const [inventoryPage, setInventoryPage] = useState(1);
  const [staffRows, setStaffRows] = useState([]);
  const [productRows, setProductRows] = useState([]);
  const [orderRows, setOrderRows] = useState([]);
  const [shipmentRows, setShipmentRows] = useState([]);
  const [supplierRows, setSupplierRows] = useState([]);
  const [inventoryRows, setInventoryRows] = useState([]);
  const [staffError, setStaffError] = useState("");
  const [overviewError, setOverviewError] = useState("");
  const [adminActionError, setAdminActionError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [roleUpdatingUserId, setRoleUpdatingUserId] = useState("");
  const [productModalMode, setProductModalMode] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementForm, setMovementForm] = useState(emptyMovementForm);
  const [isShipmentModalOpen, setIsShipmentModalOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [shipmentForm, setShipmentForm] = useState(emptyShipmentForm);
  const [shipmentStatus, setShipmentStatus] = useState("pending");
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderForm, setOrderForm] = useState(emptyOrderForm);
  const [orderStatus, setOrderStatus] = useState("pending");
  const [showNotifications, setShowNotifications] = useState(
    Boolean(location.state?.openNotifications),
  );
  const [loginNotification, setLoginNotification] = useState(() =>
    readLoginNotification(),
  );

  const loadAdminData = useCallback(async () => {
    try {
      setStaffError("");
      setOverviewError("");
      const [
        staffResult,
        ordersResult,
        shipmentsResult,
        suppliersResult,
        dashboardResult,
      ] = await Promise.allSettled([
        getAdminUsers(),
        getAdminOrders(),
        getShipments(),
        getSuppliers(),
        getDashboardData(),
      ]);

      if (staffResult.status === "fulfilled") {
        setStaffRows(getResponseRows(staffResult.value));
      } else {
        setStaffError(
          staffResult.reason?.response?.data?.message ||
            staffResult.reason?.message ||
            "Unable to load staff records.",
        );
      }

      if (ordersResult.status === "fulfilled") {
        setOrderRows(getOrderRows(ordersResult.value));
      }

      if (dashboardResult.status === "fulfilled") {
        setProductRows(dashboardResult.value.products ?? []);
        setInventoryRows(dashboardResult.value.inventory ?? []);
      }

      if (shipmentsResult.status === "fulfilled") {
        setShipmentRows(getShipmentRows(shipmentsResult.value));
      }

      if (suppliersResult.status === "fulfilled") {
        setSupplierRows(getResponseRows(suppliersResult.value));
      }

      if (
        ordersResult.status === "rejected" ||
        shipmentsResult.status === "rejected" ||
        dashboardResult.status === "rejected"
      ) {
        setOverviewError("Some admin data could not be loaded.");
      }
    } catch (error) {
      setOverviewError(
        error.response?.data?.message ||
          error.message ||
          "Unable to load admin data.",
      );
    }
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

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

  const handleAdminNavClick = (label) => {
    setActiveAdminView(label);
    setSearchTerm("");
    setAdminFilters(defaultAdminFilters);

    if (window.innerWidth <= 980) {
      setSidebarOpen(false);
    }
  };

  useEffect(() => {
    setProductPage(1);
    setInventoryPage(1);
  }, [adminFilters, searchTerm]);

  const updateAdminFilter = (name, value) => {
    setAdminFilters((current) => ({ ...current, [name]: value }));
  };

  const matchesAdminSearch = (row, fields) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return true;
    }

    return fields
      .map((field) => row[field])
      .filter((value) => value !== undefined && value !== null)
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearch);
  };

  const filteredStaffRows = useMemo(() => {
    return staffRows.filter((member) => {
      const role = member.role || "user";
      const status = member.status || "unknown";
      const verified = member.isVerified ? "verified" : "pending";

      return (
        (adminFilters.userRole === "all" || role === adminFilters.userRole) &&
        (adminFilters.userStatus === "all" ||
          status === adminFilters.userStatus) &&
        (adminFilters.userVerified === "all" ||
          verified === adminFilters.userVerified) &&
        matchesAdminSearch(member, ["name", "email", "role", "status"])
      );
    });
  }, [adminFilters, searchTerm, staffRows]);

  const inventoryByProductId = useMemo(
    () =>
      new Map(
        inventoryRows
          .filter((item) => item?.product?._id)
          .map((item) => [item.product._id, item]),
      ),
    [inventoryRows],
  );

  const adminProductRows = useMemo(
    () =>
      productRows.map((product) => {
        const inventory = inventoryByProductId.get(product._id);
        const currentStock = inventory?.currentStock ?? product.quantity ?? 0;
        const minimumStock = inventory?.minimumStock ?? 0;

        return {
          id: product._id,
          name: product.name || "Unnamed product",
          code: getProductCode(product, inventory),
          category: product.category || "Uncategorized",
          price: Number(product.price) || 0,
          currentStock,
          minimumStock,
          supplier: product.supplier || "-",
          description: product.description || "",
          inventoryRecordId: inventory?._id || "",
          status:
            currentStock === 0
              ? "Out"
              : currentStock <= minimumStock
                ? "Low"
                : "Healthy",
        };
      }),
    [inventoryByProductId, productRows],
  );

  const adminInventoryRows = useMemo(
    () =>
      productRows.map((product) => {
        const inventory = inventoryByProductId.get(product._id);
        const currentStock = inventory?.currentStock ?? product.quantity ?? 0;
        const minimumStock = inventory?.minimumStock ?? 0;

        return {
          id: product._id,
          productName: product.name || "Unnamed product",
          productCode: getProductCode(product, inventory),
          category: product.category || "Uncategorized",
          currentStock,
          minimumStock,
          lastUpdated: inventory?.lastUpdated || product.updatedAt,
          status:
            currentStock === 0
              ? "Out"
              : currentStock <= minimumStock
                ? "Low"
                : "Healthy",
        };
      }),
    [inventoryByProductId, productRows],
  );

  const adminShipmentRows = useMemo(
    () =>
      shipmentRows.map((shipment) => ({
        id: shipment._id,
        shipmentId: shipment.shipmentId || `SHP-${String(shipment._id).slice(-6)}`,
        supplier: shipment.supplier || "-",
        products: (shipment.products ?? [])
          .map((item) => item.product?.name)
          .filter(Boolean)
          .join(", "),
        quantity: (shipment.products ?? []).reduce(
          (sum, item) => sum + (Number(item.quantity) || 0),
          0,
        ),
        status: shipment.status || "unknown",
        expectedDeliveryDate: shipment.expectedDeliveryDate,
        notes: shipment.notes || "",
        raw: shipment,
      })),
    [shipmentRows],
  );

  const adminOrderRows = useMemo(
    () =>
      orderRows.map((order) => ({
        id: order._id,
        orderId: order._id ? `ORD-${order._id.slice(-6).toUpperCase()}` : "ORD",
        products: (order.orderItems ?? [])
          .map((item) => item.product?.name)
          .filter(Boolean)
          .join(", "),
        quantity: (order.orderItems ?? []).reduce(
          (sum, item) => sum + (Number(item.quantity) || 0),
          0,
        ),
        status: order.status || "unknown",
        totalAmount: Number(order.totalAmount) || 0,
        createdAt: order.createdAt,
        raw: order,
      })),
    [orderRows],
  );

  const filteredAdminProductRows = useMemo(
    () =>
      adminProductRows.filter(
        (product) =>
          (adminFilters.productCategory === "all" ||
            product.category === adminFilters.productCategory) &&
          (adminFilters.productStatus === "all" ||
            product.status === adminFilters.productStatus) &&
          matchesAdminSearch(product, [
            "name",
            "code",
            "category",
            "supplier",
            "status",
          ]),
      ),
    [adminFilters, adminProductRows, searchTerm],
  );

  const filteredAdminInventoryRows = useMemo(
    () =>
      adminInventoryRows.filter(
        (item) =>
          (adminFilters.inventoryCategory === "all" ||
            item.category === adminFilters.inventoryCategory) &&
          (adminFilters.inventoryStatus === "all" ||
            item.status === adminFilters.inventoryStatus) &&
          matchesAdminSearch(item, [
            "productName",
            "productCode",
            "category",
            "status",
          ]),
      ),
    [adminFilters, adminInventoryRows, searchTerm],
  );

  const filteredAdminShipmentRows = useMemo(
    () =>
      adminShipmentRows.filter(
        (shipment) =>
          (adminFilters.shipmentStatus === "all" ||
            shipment.status === adminFilters.shipmentStatus) &&
          matchesAdminSearch(shipment, [
            "shipmentId",
            "supplier",
            "products",
            "status",
          ]),
      ),
    [adminFilters, adminShipmentRows, searchTerm],
  );

  const filteredAdminOrderRows = useMemo(
    () =>
      adminOrderRows.filter(
        (order) =>
          (adminFilters.orderStatus === "all" ||
            order.status === adminFilters.orderStatus) &&
          matchesAdminSearch(order, ["orderId", "products", "status"]),
      ),
    [adminFilters, adminOrderRows, searchTerm],
  );

  const filteredRevenueOrders = useMemo(
    () =>
      orderRows.filter((order) => {
        const orderId = order._id
          ? `ORD-${order._id.slice(-6).toUpperCase()}`
          : "ORD";
        const products = (order.orderItems ?? [])
          .map((item) => item.product?.name)
          .filter(Boolean)
          .join(", ");

        return (
          (adminFilters.revenueStatus === "all" ||
            order.status === adminFilters.revenueStatus) &&
          matchesAdminSearch(
            { orderId, products, status: order.status },
            ["orderId", "products", "status"],
          )
        );
      }),
    [adminFilters, orderRows, searchTerm],
  );

  const productCategoryOptions = useMemo(
    () => [...new Set(adminProductRows.map((product) => product.category))].sort(),
    [adminProductRows],
  );
  const inventoryCategoryOptions = useMemo(
    () => [...new Set(adminInventoryRows.map((item) => item.category))].sort(),
    [adminInventoryRows],
  );
  const productStatusOptions = useMemo(
    () => [...new Set(adminProductRows.map((product) => product.status))].sort(),
    [adminProductRows],
  );
  const inventoryStatusOptions = useMemo(
    () => [...new Set(adminInventoryRows.map((item) => item.status))].sort(),
    [adminInventoryRows],
  );
  const shipmentStatusOptions = useMemo(
    () => [...new Set(adminShipmentRows.map((shipment) => shipment.status))].sort(),
    [adminShipmentRows],
  );
  const orderStatusOptions = useMemo(
    () => [...new Set(adminOrderRows.map((order) => order.status))].sort(),
    [adminOrderRows],
  );

  const productTotalPages = Math.ceil(
    filteredAdminProductRows.length / ADMIN_TABLE_PAGE_SIZE,
  );
  const inventoryTotalPages = Math.ceil(
    filteredAdminInventoryRows.length / ADMIN_TABLE_PAGE_SIZE,
  );

  useEffect(() => {
    if (productTotalPages > 0 && productPage > productTotalPages) {
      setProductPage(productTotalPages);
    }
  }, [productPage, productTotalPages]);

  useEffect(() => {
    if (inventoryTotalPages > 0 && inventoryPage > inventoryTotalPages) {
      setInventoryPage(inventoryTotalPages);
    }
  }, [inventoryPage, inventoryTotalPages]);

  const paginatedAdminProductRows = useMemo(() => {
    const startIndex = (productPage - 1) * ADMIN_TABLE_PAGE_SIZE;

    return filteredAdminProductRows.slice(
      startIndex,
      startIndex + ADMIN_TABLE_PAGE_SIZE,
    );
  }, [filteredAdminProductRows, productPage]);

  const paginatedAdminInventoryRows = useMemo(() => {
    const startIndex = (inventoryPage - 1) * ADMIN_TABLE_PAGE_SIZE;

    return filteredAdminInventoryRows.slice(
      startIndex,
      startIndex + ADMIN_TABLE_PAGE_SIZE,
    );
  }, [filteredAdminInventoryRows, inventoryPage]);

  const selectedMovementRow = useMemo(
    () =>
      adminInventoryRows.find((row) => row.id === movementForm.product) ||
      null,
    [adminInventoryRows, movementForm.product],
  );

  const closeAdminModals = () => {
    setProductModalMode("");
    setSelectedProductId("");
    setProductForm(emptyProductForm);
    setIsMovementModalOpen(false);
    setMovementForm(emptyMovementForm);
    setIsShipmentModalOpen(false);
    setSelectedShipment(null);
    setShipmentForm(emptyShipmentForm);
    setShipmentStatus("pending");
    setIsOrderModalOpen(false);
    setSelectedOrder(null);
    setOrderForm(emptyOrderForm);
    setOrderStatus("pending");
    setAdminActionError("");
  };

  const openAddProductModal = () => {
    setProductModalMode("add");
    setSelectedProductId("");
    setProductForm(emptyProductForm);
    setAdminActionError("");
  };

  const openEditProductModal = (product) => {
    setProductModalMode("edit");
    setSelectedProductId(product.id);
    setProductForm({
      name: product.name,
      category: product.category === "Uncategorized" ? "" : product.category,
      quantity: String(product.currentStock),
      minimumStock: String(product.minimumStock),
      supplier: product.supplier === "-" ? "" : product.supplier,
      description: product.description || "",
      price: String(product.price),
    });
    setAdminActionError("");
  };

  const handleProductFormChange = (event) => {
    const { name, value } = event.target;
    setProductForm((current) => ({ ...current, [name]: value }));
  };

  const handleSaveProduct = async (event) => {
    event.preventDefault();
    setAdminActionError("");

    const payload = {
      name: productForm.name.trim(),
      category: productForm.category.trim(),
      quantity: Number(productForm.quantity),
      supplier: productForm.supplier.trim(),
      description: productForm.description.trim(),
      price: Number(productForm.price),
    };
    const minimumStock = Number(productForm.minimumStock);

    if (!payload.name) {
      setAdminActionError("Product name is required.");
      return;
    }

    if (!Number.isFinite(payload.price) || payload.price < 0) {
      setAdminActionError("Price must be 0 or greater.");
      return;
    }

    if (!Number.isFinite(payload.quantity) || payload.quantity < 0) {
      setAdminActionError("Current stock must be 0 or greater.");
      return;
    }

    if (!Number.isFinite(minimumStock) || minimumStock < 0) {
      setAdminActionError("Minimum stock must be 0 or greater.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (productModalMode === "add") {
        const createdProduct = await createProduct(payload);
        await createInventory({
          product: createdProduct._id,
          currentStock: payload.quantity,
          minimumStock,
        });
      } else {
        await updateProduct(selectedProductId, payload);
        const currentRow = adminProductRows.find(
          (product) => product.id === selectedProductId,
        );

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

      await loadAdminData();
      closeAdminModals();
    } catch (error) {
      setAdminActionError(
        error.response?.data?.message ||
          error.message ||
          "Unable to save product.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (product) => {
    if (!window.confirm(`Delete ${product.name}?`)) {
      return;
    }

    setAdminActionError("");

    try {
      if (product.inventoryRecordId) {
        await deleteInventory(product.inventoryRecordId);
      }

      await deleteProduct(product.id);
      await loadAdminData();
    } catch (error) {
      setAdminActionError(
        error.response?.data?.message ||
          error.message ||
          "Unable to delete product.",
      );
    }
  };

  const openMovementModal = () => {
    setMovementForm({
      ...emptyMovementForm,
      product: adminInventoryRows[0]?.id || "",
    });
    setIsMovementModalOpen(true);
    setAdminActionError("");
  };

  const handleMovementFormChange = (event) => {
    const { name, value } = event.target;
    setMovementForm((current) => ({ ...current, [name]: value }));
  };

  const saveStockMovement = async (confirmLowStock = false) => {
    await createStockMovement({
      product: movementForm.product,
      movementType: movementForm.movementType,
      quantity: Number(movementForm.quantity),
      movementDate: movementForm.movementDate,
      confirmLowStock,
    });
    await loadAdminData();
    closeAdminModals();
  };

  const handleSaveStockMovement = async (event) => {
    event.preventDefault();
    setAdminActionError("");

    const quantity = Number(movementForm.quantity);

    if (!movementForm.product) {
      setAdminActionError("Product is required.");
      return;
    }

    if (!Number.isFinite(quantity) || quantity < 1) {
      setAdminActionError("Quantity must be at least 1.");
      return;
    }

    if (
      movementForm.movementType === "OUT" &&
      selectedMovementRow &&
      quantity > selectedMovementRow.currentStock
    ) {
      setAdminActionError("Stock out quantity cannot exceed current stock.");
      return;
    }

    setIsSubmitting(true);

    try {
      await saveStockMovement(false);
    } catch (error) {
      if (error.response?.status === 409 && error.response?.data?.warning) {
        const confirmed = window.confirm(
          `${error.response.data.message}\n\nSave this movement anyway?`,
        );

        if (confirmed) {
          await saveStockMovement(true);
        }
      } else {
        setAdminActionError(
          error.response?.data?.message ||
            error.message ||
            "Unable to save stock movement.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAddShipmentModal = () => {
    setSelectedShipment(null);
    setShipmentForm({
      ...emptyShipmentForm,
      supplier: supplierRows[0]?._id || "",
      product: productRows[0]?._id || "",
    });
    setShipmentStatus("pending");
    setIsShipmentModalOpen(true);
    setAdminActionError("");
  };

  const openEditShipmentModal = (shipment) => {
    setSelectedShipment(shipment.raw);
    setShipmentStatus(shipment.status || "pending");
    setShipmentForm(emptyShipmentForm);
    setIsShipmentModalOpen(true);
    setAdminActionError("");
  };

  const handleShipmentFormChange = (event) => {
    const { name, value } = event.target;
    setShipmentForm((current) => ({ ...current, [name]: value }));
  };

  const handleSaveShipment = async (event) => {
    event.preventDefault();
    setAdminActionError("");
    setIsSubmitting(true);

    try {
      if (selectedShipment?._id) {
        await updateShipmentStatus(selectedShipment._id, shipmentStatus);
      } else {
        const quantity = Number(shipmentForm.quantity);

        if (!shipmentForm.supplier || !shipmentForm.product) {
          setAdminActionError("Supplier and product are required.");
          return;
        }

        if (!Number.isFinite(quantity) || quantity < 1) {
          setAdminActionError("Quantity must be at least 1.");
          return;
        }

        await createShipment({
          supplier: shipmentForm.supplier,
          products: [{ product: shipmentForm.product, quantity }],
          expectedDeliveryDate: shipmentForm.expectedDeliveryDate || undefined,
          notes: shipmentForm.notes,
        });
      }

      await loadAdminData();
      closeAdminModals();
    } catch (error) {
      setAdminActionError(
        error.response?.data?.message ||
          error.message ||
          "Unable to save shipment.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteShipment = async (shipment) => {
    if (!window.confirm(`Delete ${shipment.shipmentId}?`)) {
      return;
    }

    try {
      await deleteShipment(shipment.id);
      await loadAdminData();
    } catch (error) {
      setAdminActionError(
        error.response?.data?.message ||
          error.message ||
          "Unable to delete shipment.",
      );
    }
  };

  const openAddOrderModal = () => {
    setSelectedOrder(null);
    setOrderForm({ ...emptyOrderForm, product: productRows[0]?._id || "" });
    setOrderStatus("pending");
    setIsOrderModalOpen(true);
    setAdminActionError("");
  };

  const openEditOrderModal = (order) => {
    setSelectedOrder(order.raw);
    setOrderStatus(order.status || "pending");
    setOrderForm(emptyOrderForm);
    setIsOrderModalOpen(true);
    setAdminActionError("");
  };

  const handleOrderFormChange = (event) => {
    const { name, value } = event.target;
    setOrderForm((current) => ({ ...current, [name]: value }));
  };

  const handleSaveOrder = async (event) => {
    event.preventDefault();
    setAdminActionError("");
    setIsSubmitting(true);

    try {
      if (selectedOrder?._id) {
        await updateSalesOrderStatus(selectedOrder._id, orderStatus);
      } else {
        const quantity = Number(orderForm.quantity);

        if (!orderForm.product || !Number.isFinite(quantity) || quantity < 1) {
          setAdminActionError("Select a product and enter a valid quantity.");
          return;
        }

        await createSalesOrder({
          orderItems: [{ product: orderForm.product, quantity }],
        });
      }

      await loadAdminData();
      closeAdminModals();
    } catch (error) {
      setAdminActionError(
        error.response?.data?.message ||
          error.message ||
          "Unable to save sales order.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOrder = async (order) => {
    if (!window.confirm(`Delete ${order.orderId}?`)) {
      return;
    }

    try {
      await deleteSalesOrder(order.id);
      await loadAdminData();
    } catch (error) {
      setAdminActionError(
        error.response?.data?.message ||
          error.message ||
          "Unable to delete sales order.",
      );
    }
  };

  const handleUserRoleChange = async (member, role) => {
    if (!member?._id || member.role === role) {
      return;
    }

    setStaffError("");
    setRoleUpdatingUserId(member._id);

    try {
      const response = await updateAdminUserRole(member._id, role);
      const updatedUser = response.data;

      setStaffRows((currentRows) =>
        currentRows.map((currentUser) =>
          currentUser._id === updatedUser._id
            ? { ...currentUser, ...updatedUser }
            : currentUser,
        ),
      );
    } catch (error) {
      setStaffError(
        error.message || "Unable to update the selected user's role.",
      );
    } finally {
      setRoleUpdatingUserId("");
    }
  };

  const overviewMetrics = useMemo(() => {
    const activeStaff = staffRows.filter(
      (member) => member.status?.toLowerCase() === "active",
    );
    const invitedStaff = staffRows.filter((member) =>
      ["invited", "pending"].includes(member.status?.toLowerCase()),
    );
    const openOrders = orderRows.filter((order) =>
      ["pending", "shipped"].includes(order.status?.toLowerCase()),
    );
    const pendingOrders = orderRows.filter(
      (order) => order.status?.toLowerCase() === "pending",
    );
    const stockAlerts = inventoryRows.filter(
      (item) => Number(item.currentStock) <= Number(item.minimumStock),
    );
    const criticalStockAlerts = stockAlerts.filter(
      (item) => Number(item.currentStock) === 0,
    );
    const monthlyRevenue = orderRows.reduce(
      (sum, order) => sum + (Number(order.totalAmount) || 0),
      0,
    );
    const inventoryUnits = inventoryRows.reduce(
      (sum, item) => sum + (Number(item.currentStock) || 0),
      0,
    );
    const activeShipments = shipmentRows.filter((shipment) =>
      ["pending", "in_transit"].includes(shipment.status?.toLowerCase()),
    );
    const deliveredOrders = orderRows.filter(
      (order) => order.status?.toLowerCase() === "delivered",
    );

    return {
      activeStaff,
      invitedStaff,
      openOrders,
      pendingOrders,
      stockAlerts,
      criticalStockAlerts,
      monthlyRevenue,
      inventoryUnits,
      activeShipments,
      deliveredOrders,
    };
  }, [inventoryRows, orderRows, shipmentRows, staffRows]);

  const adminKpiCards = useMemo(
    () => [
      {
        label: "Products",
        value: formatCompactNumber(productRows.length),
        helper: "backend catalog",
        trend: `${formatCompactNumber(overviewMetrics.stockAlerts.length)} stock alerts`,
        tone: "blue",
        icon: Package,
      },
      {
        label: "Inventory Units",
        value: formatCompactNumber(overviewMetrics.inventoryUnits),
        helper: "current stock",
        trend: `${formatCompactNumber(inventoryRows.length)} records`,
        tone: "green",
        icon: Warehouse,
      },
      {
        label: "Sales Revenue",
        value: formatCompactCurrency(overviewMetrics.monthlyRevenue),
        helper: "all admin orders",
        trend: `${formatCompactNumber(orderRows.length)} orders`,
        tone: "violet",
        icon: BadgeDollarSign,
      },
      {
        label: "Active Shipments",
        value: formatCompactNumber(overviewMetrics.activeShipments.length),
        helper: "in progress",
        trend: `${formatCompactNumber(shipmentRows.length)} total`,
        tone: "amber",
        icon: Truck,
      },
    ],
    [
      inventoryRows.length,
      orderRows.length,
      overviewMetrics,
      productRows.length,
      shipmentRows.length,
    ],
  );

  const overviewSections = useMemo(
    () => [
      {
        title: "Product Catalog",
        description: `${productRows.length} products are available from the backend product records.`,
        status: `${productRows.length} products`,
        icon: Package,
      },
      {
        title: "Inventory Control",
        description: `${overviewMetrics.inventoryUnits} total units are tracked across ${inventoryRows.length} inventory records.`,
        status: `${overviewMetrics.stockAlerts.length} alerts`,
        icon: Warehouse,
      },
      {
        title: "Shipment Flow",
        description: `${overviewMetrics.activeShipments.length} shipments are pending or in transit.`,
        status: `${shipmentRows.length} shipments`,
        icon: Truck,
      },
      {
        title: "Sales Orders",
        description: `${overviewMetrics.deliveredOrders.length} delivered orders and ${overviewMetrics.pendingOrders.length} pending orders are in the backend.`,
        status: `${orderRows.length} orders`,
        icon: ShoppingCart,
      },
    ],
    [inventoryRows.length, orderRows.length, overviewMetrics, productRows.length, shipmentRows.length],
  );

  const notifications = useMemo(() => {
    const inviteNotifications = overviewMetrics.invitedStaff.map((member) => ({
      id: `invite-${member._id || member.email}`,
      title: "Pending staff invite",
      message: `${member.name || member.email} is waiting to complete access setup.`,
      tone: "danger",
    }));
    const orderNotifications = overviewMetrics.pendingOrders.map((order) => ({
      id: `order-${order._id}`,
      title: "Order needs review",
      message: `${order._id ? `Order ${order._id.slice(-6)}` : "An order"} is pending.`,
      tone: "danger",
    }));
    const stockNotifications = overviewMetrics.stockAlerts.map((item) => ({
      id: `stock-${item._id}`,
      title: "Stock alert",
      message: `${item.product?.name || "A product"} has ${
        item.currentStock
      } left. Minimum stock is ${item.minimumStock}.`,
      tone: Number(item.currentStock) === 0 ? "danger" : "success",
    }));
    const systemNotifications = [staffError, overviewError]
      .filter(Boolean)
      .map((message, index) => ({
        id: `admin-system-${index}`,
        title: "Admin data update",
        message,
        tone: "danger",
      }));

    return [
      ...(loginNotification
        ? [{ id: "admin-login-success", ...loginNotification }]
        : []),
      ...systemNotifications,
      ...inviteNotifications,
      ...orderNotifications,
      ...stockNotifications,
    ];
  }, [loginNotification, overviewError, overviewMetrics, staffError]);

  const clearLoginNotification = () => {
    sessionStorage.removeItem("esuchiLoginNotification");
    setLoginNotification(null);
  };

  const isOverviewView = activeAdminView === "Overview";
  const isUsersView = activeAdminView === "Users";
  const isProductsView = activeAdminView === "Products";
  const isInventoryView = activeAdminView === "Inventory";
  const isShipmentsView = activeAdminView === "Shipments";
  const isSalesOrdersView = activeAdminView === "Sales Orders";
  const isRevenueView = activeAdminView === "Revenue";
  const isSettingsView = activeAdminView === "Settings";
  const adminHeroAction = (() => {
    if (isProductsView) {
      return (
        <button
          type="button"
          className="admin-inline-action"
          onClick={openAddProductModal}
        >
          <Plus size={15} />
          Add Product
        </button>
      );
    }

    if (isInventoryView) {
      return (
        <button
          type="button"
          className="admin-inline-action"
          onClick={openMovementModal}
          disabled={!adminInventoryRows.length}
        >
          <Plus size={15} />
          Record Movement
        </button>
      );
    }

    if (isShipmentsView) {
      return (
        <button
          type="button"
          className="admin-inline-action"
          onClick={openAddShipmentModal}
          disabled={!productRows.length}
        >
          <Plus size={15} />
          Add Shipment
        </button>
      );
    }

    if (isSalesOrdersView) {
      return (
        <button
          type="button"
          className="admin-inline-action"
          onClick={openAddOrderModal}
          disabled={!productRows.length}
        >
          <Plus size={15} />
          Add Order
        </button>
      );
    }

    return null;
  })();
  const searchPlaceholder = isOverviewView
    ? "Search dashboard"
    : isUsersView
      ? "Search users"
      : `Search ${activeAdminView.toLowerCase()}`;
  const renderFilterSelect = (label, name, value, options) => (
    <label className="admin-filter-control">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => updateAdminFilter(name, event.target.value)}
      >
        <option value="all">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {formatStatusLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
  const renderAdminFilterBar = (children) => (
    <div className="admin-filter-bar">{children}</div>
  );

  return (
    <div className="admin-page">
      <button
        className={`admin-mobile-trigger ${sidebarOpen ? "hidden" : ""}`}
        type="button"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open admin sidebar"
      >
        <PanelLeftOpen size={18} />
      </button>

      <aside
        className={`admin-sidebar-panel ${sidebarOpen ? "open" : "closed"}`}
      >
        <div className="admin-sidebar-header">
          <img
            src={sidebarOpen ? logo : logoIn}
            alt="eSuchi Admin"
            className={`admin-sidebar-logo ${sidebarOpen ? "expanded" : "collapsed"}`}
          />
          <button
            className="admin-sidebar-mini-btn"
            type="button"
            aria-label="Toggle admin sidebar"
            onClick={() => setSidebarOpen((current) => !current)}
          >
            <PanelLeftClose size={16} />
          </button>
          <button
            className="admin-sidebar-close-btn"
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close admin sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="admin-sidebar-nav" aria-label="Admin navigation">
          <p className="admin-sidebar-label">ADMIN</p>
          <ul>
            {adminNavItems.map(({ label, icon: Icon }) => (
              <li key={label}>
                <button
                  type="button"
                  className={`admin-sidebar-link ${
                    activeAdminView === label ? "active" : ""
                  }`}
                  onClick={() => handleAdminNavClick(label)}
                >
                  <Icon size={17} />
                  <span>{label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <button
          type="button"
          className="admin-sidebar-logout"
          onClick={() => {
            logoutUser();
            navigate("/login");
          }}
        >
          <LogOut size={17} />
          <span>Logout</span>
        </button>
      </aside>

      <button
        className={`sidebar-backdrop ${sidebarOpen ? "show" : ""}`}
        type="button"
        onClick={() => setSidebarOpen(false)}
        aria-label="Close admin sidebar"
      />

      <main
        className={`admin-main ${
          sidebarOpen ? "with-admin-sidebar" : "with-collapsed-admin-sidebar"
        }`}
      >
        <header className="dashboard-topbar">
          <div className="topbar-left">
            <h1 className="dashboard-page-title">Admin Dashboard</h1>
            <p className="admin-page-subtitle">
              {activeAdminView} workspace for managing eSuchi operations.
            </p>
          </div>

          <div className="topbar-right">
            <div className="notification-box-wrap" ref={notificationRef}>
              <button
                type="button"
                className="topbar-icon-btn notification-trigger"
                aria-label="Admin notifications"
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
                    <p className="notification-empty">No new notifications.</p>
                  )}
                </div>
              ) : null}
            </div>

            <div className="search-field">
              <Search size={18} />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <button
              type="button"
              className="avatar-chip"
              onClick={() => setActiveAdminView("Settings")}
              aria-label="Open admin settings"
            >
              <span>{userInitials}</span>
            </button>
          </div>
        </header>

        {adminActionError &&
        !productModalMode &&
        !isMovementModalOpen &&
        !isShipmentModalOpen &&
        !isOrderModalOpen ? (
          <div className="dashboard-status-banner error">
            {adminActionError}
          </div>
        ) : null}

        {isSettingsView ? (
          <section className="admin-profile-grid">
            <DashboardCard title="Admin Profile" icon={UserCog}>
              <div className="admin-profile-card">
                <div className="admin-profile-avatar">{userInitials}</div>
                <div>
                  <h2>{adminUser.name}</h2>
                  <p>{adminUser.email}</p>
                  <span className="admin-role-badge">
                    <ShieldCheck size={15} />
                    {adminUser.role}
                  </span>
                </div>
              </div>
            </DashboardCard>

            <DashboardCard title="Account Details" icon={Settings}>
              <div className="admin-detail-list">
                <div>
                  <span>Name</span>
                  <strong>{adminUser.name}</strong>
                </div>
                <div>
                  <span>Email</span>
                  <strong>{adminUser.email}</strong>
                </div>
                <div>
                  <span>Access</span>
                  <strong>Admin workspace</strong>
                </div>
              </div>
            </DashboardCard>
          </section>
        ) : (
          <>
            {isOverviewView ? (
              <section className="admin-kpi-strip">
                {adminKpiCards.map((card) => {
                  const Icon = card.icon;

                  return (
                    <article className="admin-kpi-card" key={card.label}>
                      <span className={`admin-kpi-icon ${card.tone}`}>
                        <Icon size={21} />
                      </span>
                      <div className="admin-kpi-main">
                        <p>{card.label}</p>
                        <h2>{card.value}</h2>
                        <div className="admin-kpi-meta">
                          <span className={`admin-kpi-trend ${card.tone}`}>
                            {card.trend}
                          </span>
                          <small>{card.helper}</small>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </section>
            ) : (
              <section className="admin-hero-panel">
                <div>
                  <span className="admin-role-badge">
                    <UserCog size={15} />
                    {adminUser.role}
                  </span>
                  <h2>{activeAdminView} Management</h2>
                  <p>
                    Manage {activeAdminView.toLowerCase()} activity from the
                    admin workspace.
                  </p>
                </div>
                {adminHeroAction ? (
                  <div className="admin-hero-actions">{adminHeroAction}</div>
                ) : null}
              </section>
            )}

            {isOverviewView ? (
              <>
                {overviewError ? (
                  <div className="dashboard-status-banner error">
                    {overviewError}
                  </div>
                ) : null}

                <section className="quick-cards-grid admin-section-grid">
                  {overviewSections.map((section) => {
                    const Icon = section.icon;

                    return (
                      <DashboardCard
                        key={section.title}
                        title={section.title}
                        icon={Icon}
                        actionText={
                          <span className="card-inline-note">
                            {section.status}
                          </span>
                        }
                      >
                        <p className="admin-section-copy">
                          {section.description}
                        </p>
                      </DashboardCard>
                    );
                  })}
                </section>
              </>
            ) : null}

            {isOverviewView ? (
              <section className="admin-bottom-stack">
                <DashboardCard
                  title="Recent Sales Orders"
                  icon={ClipboardList}
                  className="products-card admin-wide-card"
                  actionText={
                    <span className="card-inline-note">
                      {filteredAdminOrderRows.length} matching
                    </span>
                  }
                >
                  <div className="products-table-wrap">
                    <table className="products-table">
                      <thead>
                        <tr>
                          <th>Order</th>
                          <th>Products</th>
                          <th>Qty</th>
                          <th>Status</th>
                          <th>Total</th>
                          <th>Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAdminOrderRows.length ? (
                          filteredAdminOrderRows.slice(0, 5).map((order) => (
                            <tr key={order.id}>
                              <td>{order.orderId}</td>
                              <td>{order.products || "-"}</td>
                              <td>{order.quantity}</td>
                              <td>
                                <span
                                  className={`admin-status-pill ${order.status === "delivered" ? "success" : "warning"}`}
                                >
                                  {formatStatusLabel(order.status)}
                                </span>
                              </td>
                              <td>{formatCompactCurrency(order.totalAmount)}</td>
                              <td>{formatDate(order.createdAt)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td className="admin-table-empty" colSpan="6">
                              No sales orders found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </DashboardCard>
              </section>
            ) : (
              <section className="dashboard-bottom-grid">
                {isUsersView ? (
                  <DashboardCard
                    title="Users"
                    icon={UsersRound}
                    className="products-card admin-wide-card"
                    actionText={
                      <div className="admin-table-action">
                        {staffError ? (
                          <span className="card-inline-note">
                            {staffError}
                          </span>
                        ) : null}
                        <span className="card-inline-note">
                          {filteredStaffRows.length} visible
                        </span>
                      </div>
                    }
                  >
                    {renderAdminFilterBar(
                      <>
                        {renderFilterSelect("Role", "userRole", adminFilters.userRole, [
                          "user",
                          "staff",
                          "admin",
                        ])}
                        {renderFilterSelect(
                          "Account",
                          "userStatus",
                          adminFilters.userStatus,
                          ["active", "suspended"],
                        )}
                        {renderFilterSelect(
                          "Email",
                          "userVerified",
                          adminFilters.userVerified,
                          ["verified", "pending"],
                        )}
                      </>,
                    )}
                    <div className="products-table-wrap">
                      <table className="products-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Account</th>
                            <th>Email Status</th>
                            <th>Joined</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredStaffRows.length ? (
                            filteredStaffRows.map((member) => (
                              <tr key={member._id || member.email}>
                                <td>{member.name || "-"}</td>
                                <td>{member.email}</td>
                                <td>
                                  <select
                                    className="admin-role-select"
                                    value={member.role || "user"}
                                    disabled={
                                      roleUpdatingUserId === member._id ||
                                      !member._id
                                    }
                                    onChange={(event) =>
                                      handleUserRoleChange(
                                        member,
                                        event.target.value,
                                      )
                                    }
                                  >
                                    <option value="user">User</option>
                                    <option value="staff">Staff</option>
                                    <option value="admin">Admin</option>
                                  </select>
                                </td>
                                <td>
                                  <span
                                    className={`admin-status-pill ${getStatusTone(
                                      member.status,
                                    )}`}
                                  >
                                    {formatStatus(member.status)}
                                  </span>
                                </td>
                                <td>
                                  <span
                                    className={`admin-status-pill ${
                                      member.isVerified ? "success" : "warning"
                                    }`}
                                  >
                                    {member.isVerified ? "Verified" : "Pending"}
                                  </span>
                                </td>
                                <td>{formatDate(member.createdAt)}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td className="admin-table-empty" colSpan="6">
                                {staffError || "No users found."}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </DashboardCard>
                ) : null}

                {isProductsView ? (
                  <DashboardCard
                    title="Products"
                    icon={Package}
                    className="products-card admin-wide-card"
                  >
                    {renderAdminFilterBar(
                      <>
                        {renderFilterSelect(
                          "Category",
                          "productCategory",
                          adminFilters.productCategory,
                          productCategoryOptions,
                        )}
                        {renderFilterSelect(
                          "Status",
                          "productStatus",
                          adminFilters.productStatus,
                          productStatusOptions,
                        )}
                      </>,
                    )}
                    <div className="products-table-wrap">
                      <table className="products-table">
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>Code</th>
                            <th>Category</th>
                            <th>Price</th>
                            <th>Stock</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedAdminProductRows.length ? (
                            paginatedAdminProductRows.map((product) => (
                              <tr key={product.id}>
                                <td>{product.name}</td>
                                <td>{product.code}</td>
                                <td>{product.category}</td>
                                <td>{formatCompactCurrency(product.price)}</td>
                                <td>{product.currentStock}</td>
                                <td>
                                  <span
                                    className={`admin-status-pill ${product.status === "Healthy" ? "success" : "warning"}`}
                                  >
                                    {product.status}
                                  </span>
                                </td>
                                <td>
                                  <div className="admin-row-actions">
                                    <button
                                      type="button"
                                      onClick={() => openEditProductModal(product)}
                                    >
                                      <Pencil size={14} />
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      className="danger"
                                      onClick={() => handleDeleteProduct(product)}
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
                              <td className="admin-table-empty" colSpan="7">
                                No products found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <Pagination
                      currentPage={productPage}
                      totalItems={filteredAdminProductRows.length}
                      pageSize={ADMIN_TABLE_PAGE_SIZE}
                      onPageChange={setProductPage}
                      itemLabel="products"
                    />
                  </DashboardCard>
                ) : null}

                {isInventoryView ? (
                  <DashboardCard
                    title="Inventory"
                    icon={Warehouse}
                    className="products-card admin-wide-card"
                  >
                    {renderAdminFilterBar(
                      <>
                        {renderFilterSelect(
                          "Category",
                          "inventoryCategory",
                          adminFilters.inventoryCategory,
                          inventoryCategoryOptions,
                        )}
                        {renderFilterSelect(
                          "Status",
                          "inventoryStatus",
                          adminFilters.inventoryStatus,
                          inventoryStatusOptions,
                        )}
                      </>,
                    )}
                    <div className="products-table-wrap">
                      <table className="products-table">
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>SKU</th>
                            <th>Category</th>
                            <th>Current</th>
                            <th>Minimum</th>
                            <th>Updated</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedAdminInventoryRows.length ? (
                            paginatedAdminInventoryRows.map((item) => (
                              <tr key={item.id}>
                                <td>{item.productName}</td>
                                <td>{item.productCode}</td>
                                <td>{item.category}</td>
                                <td>{item.currentStock}</td>
                                <td>{item.minimumStock}</td>
                                <td>{formatDate(item.lastUpdated)}</td>
                                <td>
                                  <span
                                    className={`admin-status-pill ${item.status === "Healthy" ? "success" : "warning"}`}
                                  >
                                    {item.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td className="admin-table-empty" colSpan="7">
                                No inventory records found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <Pagination
                      currentPage={inventoryPage}
                      totalItems={filteredAdminInventoryRows.length}
                      pageSize={ADMIN_TABLE_PAGE_SIZE}
                      onPageChange={setInventoryPage}
                      itemLabel="inventory records"
                    />
                  </DashboardCard>
                ) : null}

                {isShipmentsView ? (
                  <DashboardCard
                    title="Shipments"
                    icon={Truck}
                    className="products-card admin-wide-card"
                  >
                    {renderAdminFilterBar(
                      renderFilterSelect(
                        "Status",
                        "shipmentStatus",
                        adminFilters.shipmentStatus,
                        shipmentStatusOptions,
                      ),
                    )}
                    <div className="products-table-wrap">
                      <table className="products-table">
                        <thead>
                          <tr>
                            <th>Shipment</th>
                            <th>Supplier</th>
                            <th>Products</th>
                            <th>Qty</th>
                            <th>Status</th>
                            <th>Expected</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredAdminShipmentRows.length ? (
                            filteredAdminShipmentRows.map((shipment) => (
                              <tr key={shipment.id}>
                                <td>{shipment.shipmentId}</td>
                                <td>{shipment.supplier}</td>
                                <td>{shipment.products || "-"}</td>
                                <td>{shipment.quantity}</td>
                                <td>
                                  <span
                                    className={`admin-status-pill ${shipment.status === "delivered" ? "success" : "warning"}`}
                                  >
                                    {formatStatusLabel(shipment.status)}
                                  </span>
                                </td>
                                <td>{formatDate(shipment.expectedDeliveryDate)}</td>
                                <td>
                                  <div className="admin-row-actions">
                                    <button
                                      type="button"
                                      onClick={() => openEditShipmentModal(shipment)}
                                    >
                                      <Pencil size={14} />
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      className="danger"
                                      onClick={() => handleDeleteShipment(shipment)}
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
                              <td className="admin-table-empty" colSpan="7">
                                No shipments found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </DashboardCard>
                ) : null}

                {isSalesOrdersView ? (
                  <DashboardCard
                    title="Sales Orders"
                    icon={ClipboardList}
                    className="products-card admin-wide-card"
                  >
                    {renderAdminFilterBar(
                      renderFilterSelect(
                        "Status",
                        "orderStatus",
                        adminFilters.orderStatus,
                        orderStatusOptions,
                      ),
                    )}
                    <div className="products-table-wrap">
                      <table className="products-table">
                        <thead>
                          <tr>
                            <th>Order</th>
                            <th>Products</th>
                            <th>Qty</th>
                            <th>Status</th>
                            <th>Total</th>
                            <th>Created</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredAdminOrderRows.length ? (
                            filteredAdminOrderRows.map((order) => (
                              <tr key={order.id}>
                                <td>{order.orderId}</td>
                                <td>{order.products || "-"}</td>
                                <td>{order.quantity}</td>
                                <td>
                                  <span
                                    className={`admin-status-pill ${order.status === "delivered" ? "success" : "warning"}`}
                                  >
                                    {formatStatusLabel(order.status)}
                                  </span>
                                </td>
                                <td>{formatCompactCurrency(order.totalAmount)}</td>
                                <td>{formatDate(order.createdAt)}</td>
                                <td>
                                  <div className="admin-row-actions">
                                    <button
                                      type="button"
                                      onClick={() => openEditOrderModal(order)}
                                    >
                                      <Pencil size={14} />
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      className="danger"
                                      onClick={() => handleDeleteOrder(order)}
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
                              <td className="admin-table-empty" colSpan="7">
                                No sales orders found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </DashboardCard>
                ) : null}

                {isRevenueView ? (
                  <div className="admin-wide-card">
                    {renderAdminFilterBar(
                      renderFilterSelect(
                        "Status",
                        "revenueStatus",
                        adminFilters.revenueStatus,
                        orderStatusOptions,
                      ),
                    )}
                    <AdminRevenue orders={filteredRevenueOrders} />
                  </div>
                ) : null}

              </section>
            )}
          </>
        )}
      </main>

      {productModalMode ? (
        <div className="admin-modal-backdrop" onClick={closeAdminModals}>
          <div className="admin-modal" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal-head">
              <div>
                <h2>{productModalMode === "add" ? "Add Product" : "Edit Product"}</h2>
                <p>Manage product details and inventory thresholds.</p>
              </div>
              <button type="button" onClick={closeAdminModals} aria-label="Close modal">
                <X size={18} />
              </button>
            </div>

            <form className="admin-form" onSubmit={handleSaveProduct}>
              <label>
                <span>Product Name</span>
                <input name="name" value={productForm.name} onChange={handleProductFormChange} />
              </label>
              <label>
                <span>Category</span>
                <input
                  name="category"
                  value={productForm.category}
                  onChange={handleProductFormChange}
                />
              </label>
              <label>
                <span>Price</span>
                <input
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={productForm.price}
                  onChange={handleProductFormChange}
                />
              </label>
              <label>
                <span>Current Stock</span>
                <input
                  name="quantity"
                  type="number"
                  min="0"
                  value={productForm.quantity}
                  onChange={handleProductFormChange}
                />
              </label>
              <label>
                <span>Minimum Stock</span>
                <input
                  name="minimumStock"
                  type="number"
                  min="0"
                  value={productForm.minimumStock}
                  onChange={handleProductFormChange}
                />
              </label>
              <label>
                <span>Supplier</span>
                <input
                  name="supplier"
                  value={productForm.supplier}
                  onChange={handleProductFormChange}
                />
              </label>
              <label className="admin-form-full">
                <span>Description</span>
                <textarea
                  name="description"
                  rows="3"
                  value={productForm.description}
                  onChange={handleProductFormChange}
                />
              </label>

              {adminActionError ? <p className="admin-form-error">{adminActionError}</p> : null}

              <div className="admin-form-actions">
                <button type="button" className="secondary" onClick={closeAdminModals}>
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isMovementModalOpen ? (
        <div className="admin-modal-backdrop" onClick={closeAdminModals}>
          <div className="admin-modal" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal-head">
              <div>
                <h2>Record Stock Movement</h2>
                <p>Save stock in, stock out, or stock adjustment records.</p>
              </div>
              <button type="button" onClick={closeAdminModals} aria-label="Close modal">
                <X size={18} />
              </button>
            </div>

            <form className="admin-form" onSubmit={handleSaveStockMovement}>
              <label className="admin-form-full">
                <span>Product</span>
                <select
                  name="product"
                  value={movementForm.product}
                  onChange={handleMovementFormChange}
                >
                  <option value="">Select product</option>
                  {adminInventoryRows.map((row) => (
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
                  onChange={handleMovementFormChange}
                >
                  <option value="IN">Stock In</option>
                  <option value="OUT">Stock Out</option>
                  <option value="ADJUSTMENT">Adjustment</option>
                </select>
              </label>
              <label>
                <span>Quantity</span>
                <input
                  name="quantity"
                  type="number"
                  min="1"
                  value={movementForm.quantity}
                  onChange={handleMovementFormChange}
                />
              </label>
              <label className="admin-form-full">
                <span>Date</span>
                <input
                  name="movementDate"
                  type="date"
                  value={movementForm.movementDate}
                  onChange={handleMovementFormChange}
                />
              </label>

              {selectedMovementRow ? (
                <div className="admin-form-note">
                  Current stock: {selectedMovementRow.currentStock} | Minimum:{" "}
                  {selectedMovementRow.minimumStock}
                </div>
              ) : null}

              {adminActionError ? <p className="admin-form-error">{adminActionError}</p> : null}

              <div className="admin-form-actions">
                <button type="button" className="secondary" onClick={closeAdminModals}>
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Movement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isShipmentModalOpen ? (
        <div className="admin-modal-backdrop" onClick={closeAdminModals}>
          <div className="admin-modal" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal-head">
              <div>
                <h2>{selectedShipment ? "Edit Shipment" : "Add Shipment"}</h2>
                <p>
                  {selectedShipment
                    ? "Update shipment status."
                    : "Create a shipment from backend suppliers and products."}
                </p>
              </div>
              <button type="button" onClick={closeAdminModals} aria-label="Close modal">
                <X size={18} />
              </button>
            </div>

            <form className="admin-form" onSubmit={handleSaveShipment}>
              {selectedShipment ? (
                <label className="admin-form-full">
                  <span>Status</span>
                  <select
                    value={shipmentStatus}
                    onChange={(event) => setShipmentStatus(event.target.value)}
                  >
                    <option value="pending">Pending</option>
                    <option value="in_transit">In Transit</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </label>
              ) : (
                <>
                  <label>
                    <span>Supplier</span>
                    <select
                      name="supplier"
                      value={shipmentForm.supplier}
                      onChange={handleShipmentFormChange}
                    >
                      <option value="">Select supplier</option>
                      {supplierRows.map((supplier) => (
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
                      value={shipmentForm.product}
                      onChange={handleShipmentFormChange}
                    >
                      <option value="">Select product</option>
                      {productRows.map((product) => (
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
                      value={shipmentForm.quantity}
                      onChange={handleShipmentFormChange}
                    />
                  </label>
                  <label>
                    <span>Expected Delivery</span>
                    <input
                      name="expectedDeliveryDate"
                      type="date"
                      value={shipmentForm.expectedDeliveryDate}
                      onChange={handleShipmentFormChange}
                    />
                  </label>
                  <label className="admin-form-full">
                    <span>Notes</span>
                    <textarea
                      name="notes"
                      rows="3"
                      value={shipmentForm.notes}
                      onChange={handleShipmentFormChange}
                    />
                  </label>
                </>
              )}

              {adminActionError ? <p className="admin-form-error">{adminActionError}</p> : null}

              <div className="admin-form-actions">
                <button type="button" className="secondary" onClick={closeAdminModals}>
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Shipment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isOrderModalOpen ? (
        <div className="admin-modal-backdrop" onClick={closeAdminModals}>
          <div className="admin-modal" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal-head">
              <div>
                <h2>{selectedOrder ? "Edit Sales Order" : "Add Sales Order"}</h2>
                <p>
                  {selectedOrder
                    ? "Update the order status."
                    : "Create an order from an available product."}
                </p>
              </div>
              <button type="button" onClick={closeAdminModals} aria-label="Close modal">
                <X size={18} />
              </button>
            </div>

            <form className="admin-form" onSubmit={handleSaveOrder}>
              {selectedOrder ? (
                <label className="admin-form-full">
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
              ) : (
                <>
                  <label className="admin-form-full">
                    <span>Product</span>
                    <select
                      name="product"
                      value={orderForm.product}
                      onChange={handleOrderFormChange}
                    >
                      <option value="">Select product</option>
                      {productRows.map((product) => (
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
                      value={orderForm.quantity}
                      onChange={handleOrderFormChange}
                    />
                  </label>
                </>
              )}

              {adminActionError ? <p className="admin-form-error">{adminActionError}</p> : null}

              <div className="admin-form-actions">
                <button type="button" className="secondary" onClick={closeAdminModals}>
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
