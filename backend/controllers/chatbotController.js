const Inventory = require("../models/inventoryModel");
const Product = require("../models/productModel");
const StockMovement = require("../models/stockMovementModel");
const Order = require("../models/orderModel");
const createAuditLog = require("../utils/auditLogger");
const { actorFields, companyQuery } = require("../utils/tenant");
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const LANDING_SESSION_TTL_MS = Number(
  process.env.LANDING_CHAT_SESSION_TTL_MS || 15 * 60 * 1000,
);
const LANDING_SESSION_MAX_TURNS = Number(
  process.env.LANDING_CHAT_SESSION_MAX_TURNS || 6,
);
const landingSessionStore = new Map();

const LANDING_KNOWLEDGE_BASE = {
  systemOverview:
    "Esuchi is an Inventory and Logistics Management System designed to help teams track stock, manage products and suppliers, process orders, monitor shipments, and maintain audit visibility.",
  navigation: [
    "Admins should log in through the normal login page and will be routed to the admin dashboard when their account role is admin.",
    "Regular users and staff should log in through the normal login page and will be routed to their dashboard after approval.",
    "New visitors can create an account from Get started or register, then wait for company approval if required.",
  ],
  features: [
    "Product management to create and maintain product records.",
    "Inventory tracking with stock levels and minimum stock thresholds.",
    "Stock movement tracking for IN, OUT, and ADJUSTMENT operations.",
    "Order management to capture and monitor order activity.",
    "Shipment management for logistics flow and delivery status.",
    "Supplier and staff management to support operations teams.",
    "Audit logs for traceability of key actions in the system.",
  ],
  services: [
    "Operations visibility across inventory and logistics workflows.",
    "Low-stock awareness and stock updates to reduce stockouts.",
    "Daily activity tracking via orders and stock movement records.",
    "Role-based access using authenticated backend APIs.",
  ],
  faqs: [
    {
      question: "Can the system manage multiple products and categories?",
      answer:
        "Yes. You can create and manage product records and related stock for each item.",
    },
    {
      question: "How is low stock identified?",
      answer:
        "Low stock is identified when current stock falls below the configured minimum stock level.",
    },
    {
      question: "Can stock be updated safely?",
      answer:
        "Yes. Stock movements support IN, OUT, and ADJUSTMENT updates with validation checks.",
    },
    {
      question: "Does the system track logistics activities?",
      answer:
        "Yes. Shipment and order modules support logistics and fulfillment visibility.",
    },
    {
      question: "Is user activity traceable?",
      answer:
        "Yes. Audit logs can capture important actions for accountability and review.",
    },
    {
      question: "How do I add a product?",
      answer:
        "After logging in, open Products, choose the add/create product action, enter product details, then save it. Inventory can then track stock for that product.",
    },
    {
      question: "How do I view stock?",
      answer:
        "After logging in, open Inventory to view current stock, minimum stock levels, and stock status.",
    },
    {
      question: "Where should admins log in?",
      answer:
        "Admins use the same login page. Approved admin accounts are routed to the admin dashboard.",
    },
  ],
};

const APP_NAVIGATION_HELP = {
  dashboard:
    "Use Dashboard for a quick overview of products, orders, inventory activity, and low-stock signals.",
  inventory:
    "Use Inventory to view stock levels, minimum stock thresholds, and items that may need restocking.",
  products:
    "Use Products to add or edit product records, prices, categories, suppliers, and descriptions.",
  shipments:
    "Use Shipments to track logistics status and delivery progress.",
  orders:
    "Use Orders or Sales Orders to review customer order activity and order status.",
  staff:
    "Admins can use Users or Staff to review team members, roles, and approval status.",
};

const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const startOfWeek = () => {
  const now = startOfToday();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(now.setDate(diff));
};

const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isAdminUser = (req) => req.user?.role === "admin";

const scopedCompanyQuery = (req, query = {}) => {
  const baseQuery = companyQuery(req, query);
  return isAdminUser(req) ? baseQuery : { ...baseQuery, user: req.user._id };
};

const getStockUrgency = (currentStock, minimumStock) => {
  const current = Number(currentStock) || 0;
  const minimum = Number(minimumStock) || 0;

  if (minimum <= 0) return "Monitor";
  if (current <= 0 || current <= minimum * 0.5) return "Critical";
  if (current < minimum) return "Warning";
  if (current <= minimum * 1.25) return "Monitor";
  return "Healthy";
};

const getLowStockRows = async (req, includeMonitor = false) => {
  const thresholdExpression = includeMonitor
    ? { $lte: ["$currentStock", { $multiply: ["$minimumStock", 1.25] }] }
    : { $lt: ["$currentStock", "$minimumStock"] };

  const rows = await Inventory.find({
    ...scopedCompanyQuery(req),
    $expr: thresholdExpression,
  }).populate("product", "name category supplier");

  return rows
    .map((item) => {
      const urgency = getStockUrgency(item.currentStock, item.minimumStock);
      return {
        inventoryId: item._id,
        productId: item.product?._id,
        productName: item.product?.name || "Unknown product",
        category: item.product?.category || "Uncategorized",
        currentStock: item.currentStock,
        minimumStock: item.minimumStock,
        shortage: Math.max(0, item.minimumStock - item.currentStock),
        urgency,
      };
    })
    .sort((a, b) => {
      const ranks = { Critical: 0, Warning: 1, Monitor: 2, Healthy: 3 };
      return ranks[a.urgency] - ranks[b.urgency] || b.shortage - a.shortage;
    });
};

const getLowStockResponse = async (req, includeMonitor = false) => {
  const lowStockItems = await getLowStockRows(req, includeMonitor);

  if (!lowStockItems.length) {
    return {
      intent: "LOW_STOCK_REPORT",
      message: "All products are above minimum stock right now.",
      data: [],
    };
  }

  return {
    intent: "LOW_STOCK_REPORT",
    message: [
      `${lowStockItems.length} product(s) need attention.`,
      ...lowStockItems.slice(0, 5).map(
        (item, index) =>
          `${index + 1}. ${item.productName}: ${item.currentStock}/${item.minimumStock} units (${item.urgency}).`,
      ),
    ].join("\n"),
    data: {
      items: lowStockItems,
      suggestions: [
        "What needs restocking now?",
        "What moved most this week?",
        "Am I at risk of stockouts?",
      ],
    },
  };
};

const getSummaryResponse = async (req) => {
  const today = startOfToday();
  const weekStart = startOfWeek();
  const scopeQuery = scopedCompanyQuery(req);
  const [todayOrders, totalInventories, lowStockItems, todayMovements, weekMovements] =
    await Promise.all([
      Order.find({ ...scopeQuery, createdAt: { $gte: today } }),
      Inventory.countDocuments(scopeQuery),
      getLowStockRows(req, false),
      StockMovement.find({ ...scopeQuery, createdAt: { $gte: today } }).populate(
        "product",
        "name",
      ),
      StockMovement.find({ ...scopeQuery, createdAt: { $gte: weekStart } }).populate(
        "product",
        "name",
      ),
    ]);

  const totalRevenueToday = todayOrders.reduce(
    (sum, order) => sum + (Number(order.totalAmount) || 0),
    0,
  );
  const unitsInToday = todayMovements
    .filter((movement) => movement.movementType === "IN")
    .reduce((sum, movement) => sum + (Number(movement.quantity) || 0), 0);
  const unitsOutToday = todayMovements
    .filter((movement) => movement.movementType === "OUT")
    .reduce((sum, movement) => sum + (Number(movement.quantity) || 0), 0);
  const weeklyMovementMap = new Map();

  weekMovements.forEach((movement) => {
    const key = String(movement.product?._id || movement.product || "unknown");
    const current = weeklyMovementMap.get(key) || {
      productId: key,
      productName: movement.product?.name || "Unknown product",
      totalUnits: 0,
    };
    current.totalUnits += Number(movement.quantity) || 0;
    weeklyMovementMap.set(key, current);
  });

  const topMovedProducts = [...weeklyMovementMap.values()]
    .sort((a, b) => b.totalUnits - a.totalUnits)
    .slice(0, 5);
  const stockoutRisks = lowStockItems
    .filter((item) => item.urgency === "Critical" || item.urgency === "Warning")
    .slice(0, 5);

  return {
    intent: "OPERATIONS_SUMMARY",
    message: [
      `Today: ${todayOrders.length} order(s), ${todayMovements.length} stock movement(s), ${lowStockItems.length} low-stock item(s).`,
      `Units moved today: ${unitsInToday} in, ${unitsOutToday} out.`,
      topMovedProducts.length
        ? `Top moved this week: ${topMovedProducts
            .map((item) => `${item.productName} (${item.totalUnits})`)
            .join(", ")}.`
        : "No stock movements recorded this week yet.",
      stockoutRisks.length
        ? `Stockout risk: ${stockoutRisks
            .map((item) => `${item.productName} (${item.urgency})`)
            .join(", ")}.`
        : "No products are currently at stockout risk.",
    ].join("\n"),
    data: {
      ordersToday: todayOrders.length,
      revenueToday: totalRevenueToday,
      inventoryItems: totalInventories,
      lowStockItems: lowStockItems.length,
      stockMovementsToday: todayMovements.length,
      unitsInToday,
      unitsOutToday,
      topMovedProducts,
      stockoutRisks,
      suggestions: [
        "What moved most this week?",
        "Which products are critically low?",
        "How do I add stock?",
      ],
    },
  };
};

const findProductForAction = async (req, action) => {
  if (action.productId) {
    return Product.findOne(scopedCompanyQuery(req, { _id: action.productId }));
  }

  const productName = String(action.productName || "").trim();
  if (!productName) return null;

  return Product.findOne(
    scopedCompanyQuery(req, {
      name: { $regex: new RegExp(escapeRegex(productName), "i") },
    }),
  );
};

const getStockPreview = (inventory, movementType, quantity) => {
  const numericQuantity = Number(quantity);
  let projectedStock = inventory.currentStock;

  if (movementType === "IN") projectedStock += numericQuantity;
  if (movementType === "OUT") projectedStock -= numericQuantity;
  if (movementType === "ADJUSTMENT") projectedStock = numericQuantity;

  return projectedStock;
};

const getConfirmationResponse = async (req, action) => {
  const numericQuantity = Number(action.quantity);
  const movementType = String(action.movementType || "").toUpperCase();

  if (!["IN", "OUT", "ADJUSTMENT"].includes(movementType)) {
    return {
      intent: "ACTION_NEEDS_DETAILS",
      message:
        "Tell me the stock action type: IN, OUT, or ADJUSTMENT. Example: add 10 units to Rice.",
      data: {
        suggestions: [
          "Add 10 units to a product",
          "Remove 5 units from a product",
          "Adjust a product to 20 units",
        ],
      },
    };
  }

  if (!Number.isFinite(numericQuantity) || numericQuantity < 1) {
    return {
      intent: "ACTION_NEEDS_DETAILS",
      message: "Tell me a quantity greater than 0 for the stock movement.",
      data: {
        suggestions: ["Add 10 units", "Remove 5 units", "Adjust to 20 units"],
      },
    };
  }

  const product = await findProductForAction(req, action);
  if (!product) {
    return {
      intent: "ACTION_NEEDS_DETAILS",
      message:
        "I could not find that product in your inventory scope. Please include the exact product name.",
      data: {
        suggestions: ["Show low stock items", "Open Products", "Cancel"],
      },
    };
  }

  const inventory = await Inventory.findOne(
    scopedCompanyQuery(req, { product: product._id }),
  );
  if (!inventory) {
    return {
      intent: "ACTION_NEEDS_DETAILS",
      message: `I found ${product.name}, but it does not have an inventory record yet.`,
      data: {
        suggestions: ["Open Inventory", "Open Products", "Cancel"],
      },
    };
  }

  const projectedStock = getStockPreview(inventory, movementType, numericQuantity);
  if (movementType === "OUT" && projectedStock < 0) {
    return {
      intent: "ACTION_BLOCKED",
      message: `${product.name} only has ${inventory.currentStock} units, so I cannot remove ${numericQuantity}.`,
      data: {
        suggestions: ["Show low stock items", "Cancel"],
      },
    };
  }

  const pendingAction = {
    type: "CREATE_MOVEMENT",
    productId: product._id,
    productName: product.name,
    movementType,
    quantity: numericQuantity,
    movementDate: action.movementDate,
    confirmLowStock: Boolean(action.confirmLowStock),
  };

  return {
    intent: "CONFIRM_STOCK_ACTION",
    message: [
      "Please confirm this stock movement before I update the database:",
      `Product: ${product.name}`,
      `Movement: ${movementType}`,
      `Quantity: ${numericQuantity}`,
      `Current stock: ${inventory.currentStock}`,
      `Projected stock: ${projectedStock}`,
      projectedStock < inventory.minimumStock
        ? `Warning: projected stock is below the minimum level of ${inventory.minimumStock}.`
        : null,
      "Reply Confirm to proceed, or Cancel to stop.",
    ]
      .filter(Boolean)
      .join("\n"),
    data: {
      pendingAction,
      suggestions: ["Confirm", "Cancel"],
    },
  };
};

const applyStockMovement = async (req, action) => {
  const { productId, movementType, quantity, movementDate, confirmLowStock } =
    action;

  const numericQuantity = Number(quantity);
  if (!productId || !["IN", "OUT", "ADJUSTMENT"].includes(movementType)) {
    return {
      status: 400,
      body: {
        success: false,
        message: "Invalid action. productId and movementType are required.",
      },
    };
  }
  if (!Number.isFinite(numericQuantity) || numericQuantity < 1) {
    return {
      status: 400,
      body: { success: false, message: "Quantity must be greater than 0." },
    };
  }

  const [product, inventory] = await Promise.all([
    Product.findOne(scopedCompanyQuery(req, { _id: productId })),
    Inventory.findOne(scopedCompanyQuery(req, { product: productId })),
  ]);

  if (!product) {
    return {
      status: 404,
      body: { success: false, message: "Product not found." },
    };
  }
  if (!inventory) {
    return {
      status: 404,
      body: { success: false, message: "Inventory not found for product." },
    };
  }

  let nextStock = inventory.currentStock;
  if (movementType === "IN") nextStock += numericQuantity;
  if (movementType === "OUT") {
    if (inventory.currentStock < numericQuantity) {
      return {
        status: 400,
        body: { success: false, message: "Insufficient stock." },
      };
    }
    nextStock -= numericQuantity;
    if (nextStock < inventory.minimumStock && !confirmLowStock) {
      return {
        status: 409,
        body: {
          success: false,
          warning: true,
          message:
            "This action will reduce stock below minimum. Retry with confirmLowStock=true.",
          data: {
            productId: product._id,
            productName: product.name,
            currentStock: inventory.currentStock,
            projectedStock: nextStock,
            minimumStock: inventory.minimumStock,
          },
        },
      };
    }
  }
  if (movementType === "ADJUSTMENT") nextStock = numericQuantity;

  inventory.currentStock = nextStock;
  inventory.lastUpdated = Date.now();
  product.quantity = nextStock;

  const parsedMovementDate = movementDate ? new Date(movementDate) : new Date();
  if (Number.isNaN(parsedMovementDate.getTime())) {
    return {
      status: 400,
      body: { success: false, message: "Invalid movementDate." },
    };
  }

  const movement = await StockMovement.create({
    product: product._id,
    ...actorFields(req),
    movementType,
    quantity: numericQuantity,
    movementDate: parsedMovementDate,
  });

  await Promise.all([inventory.save(), product.save()]);

  return {
    status: 201,
    body: {
      success: true,
      intent: "CREATE_MOVEMENT",
      message: `Stock updated for ${product.name}.`,
      data: {
        movementId: movement._id,
        productId: product._id,
        productName: product.name,
        movementType,
        quantity: numericQuantity,
        currentStock: nextStock,
        minimumStock: inventory.minimumStock,
      },
    },
  };
};

const getChatbotContext = async (req) => {
  const today = startOfToday();
  const scopeQuery = scopedCompanyQuery(req);
  const [lowStockItems, todayOrdersCount, todayMovements] = await Promise.all([
    Inventory.find({
      ...scopeQuery,
      $expr: { $lt: ["$currentStock", "$minimumStock"] },
    })
      .populate("product", "name")
      .limit(5),
    Order.countDocuments({ ...scopeQuery, createdAt: { $gte: today } }),
    StockMovement.countDocuments({ ...scopeQuery, createdAt: { $gte: today } }),
  ]);

  return {
    role: req.user?.role || "user",
    scope: isAdminUser(req) ? "company-wide" : "your own records",
    todayOrdersCount,
    todayMovements,
    lowStockCount: lowStockItems.length,
    lowStockSample: lowStockItems.map((item) => ({
      productName: item.product?.name || "Unknown",
      currentStock: item.currentStock,
      minimumStock: item.minimumStock,
    })),
  };
};

const callGemini = async ({ message, context }) => {
  if (!process.env.GEMINI_API_KEY) return null;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const prompt = [
    "You are the eSuchi Inventory Copilot inside an authenticated dashboard.",
    "Keep responses concise and practical.",
    "Answer navigation questions about Dashboard, Inventory, Products, Shipments, Orders, Staff, and Settings.",
    "Use live business context when relevant.",
    "Never claim a stock write has happened unless the backend action already confirmed it.",
    "If the user requests a stock-changing action, tell them you will ask for confirmation first.",
    "Use the business context below when relevant.",
    `Navigation guide: ${JSON.stringify(APP_NAVIGATION_HELP)}`,
    `Context: ${JSON.stringify(context)}`,
    `User message: ${message}`,
  ].join("\n");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 300 },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const aiText =
    data?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("\n")
      .trim() || "";

  if (!aiText) return null;
  return aiText;
};

const classifyLandingIntent = (message = "") => {
  const normalized = String(message || "").toLowerCase();

  if (
    normalized.includes("login") ||
    normalized.includes("log in") ||
    normalized.includes("signin") ||
    normalized.includes("sign in") ||
    normalized.includes("admin") ||
    normalized.includes("user path") ||
    normalized.includes("role") ||
    normalized.includes("navigate") ||
    normalized.includes("where do")
  ) {
    return "NAVIGATION_HELP";
  }

  if (
    normalized.includes("add product") ||
    normalized.includes("create product") ||
    normalized.includes("view stock") ||
    normalized.includes("step") ||
    normalized.includes("how do i")
  ) {
    return "TASK_GUIDE";
  }

  if (
    normalized.includes("faq") ||
    normalized.includes("frequently asked") ||
    normalized.includes("common question")
  ) {
    return "FAQ";
  }

  if (
    normalized.includes("feature") ||
    normalized.includes("module") ||
    normalized.includes("what can") ||
    normalized.includes("capability")
  ) {
    return "FEATURE_EXPLAIN";
  }

  if (
    normalized.includes("service") ||
    normalized.includes("support") ||
    normalized.includes("pricing") ||
    normalized.includes("plan")
  ) {
    return "SERVICE_INFO";
  }

  if (
    normalized.includes("human") ||
    normalized.includes("agent") ||
    normalized.includes("person") ||
    normalized.includes("contact") ||
    normalized.includes("sales")
  ) {
    return "LIVE_AGENT";
  }

  return "GENERAL_INFO";
};

const callLandingGemini = async ({
  message,
  intent,
  knowledgeBase,
  history,
}) => {
  if (!process.env.GEMINI_API_KEY) return null;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const prompt = [
    "You are the public AI chatbot for eSuchi, an Inventory and Logistics Management System website.",
    "Answer the visitor's actual question naturally, like a helpful website assistant.",
    "Use the website context below when the question is about eSuchi, inventory, logistics, account roles, login paths, navigation, or system features.",
    "Guide new visitors to the correct login path for Admin or User roles.",
    "Provide step-by-step guidance for common tasks like adding products and viewing stock.",
    "If the user asks something outside the website/system, answer briefly and gently bring them back to eSuchi when useful.",
    "Do not invent pricing, emails, phone numbers, or policies that are not in context.",
    "Keep the tone friendly and concise.",
    `Detected intent: ${intent}`,
    `Recent conversation: ${JSON.stringify(history || [])}`,
    `Website context: ${JSON.stringify(knowledgeBase)}`,
    `User question: ${message}`,
  ].join("\n");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 260 },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const aiText =
    data?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("\n")
      .trim() || "";

  return aiText || null;
};

const getLandingSessionKey = (req, bodySessionId) => {
  const providedSessionId = String(bodySessionId || "").trim();
  if (providedSessionId) return providedSessionId;

  const ipAddress =
    (req.headers["x-forwarded-for"] || "").toString().split(",")[0].trim() ||
    req.ip ||
    "unknown-ip";
  const userAgent = (req.headers["user-agent"] || "unknown-agent").toString();
  return `anon:${ipAddress}:${userAgent.slice(0, 60)}`;
};

const getLandingSessionHistory = (sessionKey) => {
  const session = landingSessionStore.get(sessionKey);
  if (!session) return [];

  const isExpired = Date.now() - session.updatedAt > LANDING_SESSION_TTL_MS;
  if (isExpired) {
    landingSessionStore.delete(sessionKey);
    return [];
  }

  return Array.isArray(session.history) ? session.history : [];
};

const saveLandingSessionTurn = (sessionKey, userMessage, assistantMessage) => {
  const previous = getLandingSessionHistory(sessionKey);
  const updatedHistory = [
    ...previous,
    { role: "user", text: userMessage },
    { role: "assistant", text: assistantMessage },
  ].slice(-LANDING_SESSION_MAX_TURNS);

  landingSessionStore.set(sessionKey, {
    history: updatedHistory,
    updatedAt: Date.now(),
  });
};

const includesAny = (value, terms) =>
  terms.some((term) => value.includes(term));

const classifyAppIntent = (message = "") => {
  const normalized = String(message || "").toLowerCase();

  if (message === "__CHATBOT_OPEN__") return "OPEN_ALERTS";
  if (
    includesAny(normalized, [
      "low stock",
      "restock",
      "critically low",
      "critical",
      "below minimum",
      "stockout",
      "stock out",
      "risk",
    ])
  ) {
    return "LOW_STOCK_REPORT";
  }
  if (
    includesAny(normalized, [
      "summary",
      "today",
      "dashboard",
      "moved most",
      "top moved",
      "this week",
      "orders processed",
      "units moved",
    ])
  ) {
    return "OPERATIONS_SUMMARY";
  }
  if (
    includesAny(normalized, [
      "where",
      "navigate",
      "open",
      "go to",
      "find",
      "how do i",
      "how can i",
      "add product",
      "view stock",
      "shipment",
      "shipments",
      "orders",
      "staff",
      "settings",
    ])
  ) {
    return "NAVIGATION_HELP";
  }

  return "AI_CHAT";
};

const parseStockAction = (message = "") => {
  const normalized = String(message || "").trim();
  const lower = normalized.toLowerCase();

  let movementType = null;
  if (includesAny(lower, ["add", "restock", "receive", "increase", "stock in"])) {
    movementType = "IN";
  }
  if (
    includesAny(lower, ["remove", "deduct", "decrease", "stock out", "sell", "sold"])
  ) {
    movementType = "OUT";
  }
  if (includesAny(lower, ["adjust", "set stock", "set inventory"])) {
    movementType = "ADJUSTMENT";
  }
  if (!movementType) return null;

  const quantityMatch = lower.match(/\b(\d+)\b/);
  const quantity = quantityMatch ? Number(quantityMatch[1]) : null;
  const productPatterns = [
    /\b(?:to|for|from|of)\s+(.+)$/i,
    /\b(?:units?|items?)\s+(.+)$/i,
  ];
  let productName = "";

  for (const pattern of productPatterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      productName = match[1]
        .replace(/\b(confirm|please|now|today)\b/gi, "")
        .trim();
      break;
    }
  }

  if (!productName && quantityMatch) {
    productName = normalized.slice(quantityMatch.index + quantityMatch[0].length).trim();
  }

  return {
    type: "CREATE_MOVEMENT",
    movementType,
    quantity,
    productName,
  };
};

const getOpenAlertsResponse = async (req) => {
  const lowStockItems = await getLowStockRows(req, true);
  const criticalItems = lowStockItems.filter((item) => item.urgency === "Critical");

  if (!criticalItems.length) {
    return {
      intent: "OPEN_ALERTS",
      message:
        "Inventory Copilot is ready. No critical stock alerts right now. You can ask about low stock, today's summary, or navigation.",
      data: {
        suggestions: [
          "Show low stock items",
          "Give me today's summary",
          "What moved most this week?",
        ],
      },
    };
  }

  return {
    intent: "OPEN_ALERTS",
    message: [
      `Critical stock alert: ${criticalItems.length} product(s) need urgent attention.`,
      ...criticalItems
        .slice(0, 4)
        .map((item) => `${item.productName}: ${item.currentStock}/${item.minimumStock} units.`),
      "Ask 'what needs restocking now?' for the full ranked list.",
    ].join("\n"),
    data: {
      items: criticalItems,
      suggestions: [
        "What needs restocking now?",
        "Am I at risk of stockouts?",
        "Give me today's summary",
      ],
    },
  };
};

exports.chat = async (req, res) => {
  try {
    const { message = "", action } = req.body || {};
    const trimmedMessage = String(message || "").trim();

    let result;
    if (action?.type === "CREATE_MOVEMENT") {
      if (!action.confirmed) {
        result = await getConfirmationResponse(req, action);
        return res.json({ success: true, ...result });
      }

      result = await applyStockMovement(req, action);
      await createAuditLog({
        userId: req.user._id,
        action: "CHATBOT_CREATE_MOVEMENT",
        entity: "StockMovement",
        newData: { request: action, response: result.body },
        req,
      });
      return res.status(result.status).json(result.body);
    }

    const parsedStockAction = parseStockAction(trimmedMessage);
    if (parsedStockAction) {
      result = await getConfirmationResponse(req, parsedStockAction);
      await createAuditLog({
        userId: req.user._id,
        action: "CHATBOT_QUERY",
        entity: "Chatbot",
        newData: {
          message: trimmedMessage,
          intent: result.intent,
          requestedAction: parsedStockAction,
        },
        req,
      });
      return res.json({ success: true, ...result });
    }

    const intent = classifyAppIntent(trimmedMessage);
    if (intent === "OPEN_ALERTS") {
      result = await getOpenAlertsResponse(req);
      return res.json({ success: true, ...result });
    }

    if (intent === "LOW_STOCK_REPORT") {
      result = await getLowStockResponse(req, true);
      await createAuditLog({
        userId: req.user._id,
        action: "CHATBOT_QUERY",
        entity: "Chatbot",
        newData: { message: trimmedMessage, intent: result.intent },
        req,
      });
      return res.json({ success: true, ...result });
    }

    if (intent === "OPERATIONS_SUMMARY") {
      result = await getSummaryResponse(req);
      await createAuditLog({
        userId: req.user._id,
        action: "CHATBOT_QUERY",
        entity: "Chatbot",
        newData: { message: trimmedMessage, intent: result.intent },
        req,
      });
      return res.json({ success: true, ...result });
    }

    let aiReply = null;
    let usedGemini = false;

    try {
      const context = await getChatbotContext(req);
      aiReply = await callGemini({ message: trimmedMessage, context });
      usedGemini = Boolean(aiReply);
    } catch (geminiError) {
      usedGemini = false;
    }

    if (usedGemini) {
      result = {
        intent,
        message: aiReply,
        data: null,
      };
    } else {
      result = {
        intent: "AI_UNAVAILABLE",
        message:
          "AI is not configured yet. Add GEMINI_API_KEY to backend/.env and restart the backend server.",
        data: null,
      };
    }

    await createAuditLog({
      userId: req.user._id,
      action: "CHATBOT_QUERY",
      entity: "Chatbot",
      newData: { message: trimmedMessage, intent: result.intent, usedGemini },
      req,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.landingChat = async (req, res) => {
  try {
    const { message = "", sessionId } = req.body || {};
    const trimmedMessage = String(message || "").trim();
    const sessionKey = getLandingSessionKey(req, sessionId);

    if (!trimmedMessage) {
      return res.status(400).json({
        success: false,
        intent: "VALIDATION_ERROR",
        message: "Message is required.",
      });
    }

    const recentHistory = getLandingSessionHistory(sessionKey);
    const intent = classifyLandingIntent(trimmedMessage);
    let botMessage = null;

    try {
      botMessage = await callLandingGemini({
        message: trimmedMessage,
        intent,
        history: recentHistory,
        knowledgeBase: LANDING_KNOWLEDGE_BASE,
      });
    } catch (error) {
      botMessage = null;
    }

    if (!botMessage) {
      return res.status(503).json({
        success: false,
        intent: "AI_UNAVAILABLE",
        message:
          "AI is not configured yet. Add GEMINI_API_KEY to backend/.env and restart the backend server.",
        sessionId: sessionKey,
      });
    }

    saveLandingSessionTurn(sessionKey, trimmedMessage, botMessage);

    res.json({
      success: true,
      intent,
      message: botMessage,
      sessionId: sessionKey,
      usedGemini: true,
      data: {
        historyLength: getLandingSessionHistory(sessionKey).length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
