const Inventory = require("../models/inventoryModel");
const Product = require("../models/productModel");
const StockMovement = require("../models/stockMovementModel");
const Order = require("../models/orderModel");
const createAuditLog = require("../utils/auditLogger");
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const LANDING_RELEVANCE_THRESHOLD = Number(
  process.env.LANDING_CHAT_RELEVANCE_THRESHOLD || 0.65,
);
const LANDING_LOW_CONFIDENCE_THRESHOLD = Number(
  process.env.LANDING_CHAT_LOW_CONFIDENCE_THRESHOLD || 0.8,
);
const LANDING_SESSION_TTL_MS = Number(
  process.env.LANDING_CHAT_SESSION_TTL_MS || 15 * 60 * 1000,
);
const LANDING_SESSION_MAX_TURNS = Number(
  process.env.LANDING_CHAT_SESSION_MAX_TURNS || 6,
);
const landingSessionStore = new Map();

const LANDING_SCOPE_MESSAGE =
  "I can only help with questions about this Inventory and Logistics Management System. Please ask about features, services, setup, or FAQs.";

const LANDING_KNOWLEDGE_BASE = {
  systemOverview:
    "Esuchi is an Inventory and Logistics Management System designed to help teams track stock, manage products and suppliers, process orders, monitor shipments, and maintain audit visibility.",
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
  ],
};

const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const getLowStockResponse = async (userId) => {
  const lowStockItems = await Inventory.find({
    user: userId,
    $expr: { $lt: ["$currentStock", "$minimumStock"] },
  }).populate("product", "name");

  if (!lowStockItems.length) {
    return {
      intent: "LOW_STOCK_REPORT",
      message: "All products are above minimum stock right now.",
      data: [],
    };
  }

  return {
    intent: "LOW_STOCK_REPORT",
    message: `${lowStockItems.length} product(s) are below minimum stock.`,
    data: lowStockItems.map((item) => ({
      inventoryId: item._id,
      productId: item.product?._id,
      productName: item.product?.name || "Unknown product",
      currentStock: item.currentStock,
      minimumStock: item.minimumStock,
      shortage: item.minimumStock - item.currentStock,
    })),
  };
};

const getSummaryResponse = async (userId) => {
  const today = startOfToday();
  const [todayOrders, totalInventories, lowStockCount, todayMovements] =
    await Promise.all([
      Order.find({ user: userId, createdAt: { $gte: today } }),
      Inventory.countDocuments({ user: userId }),
      Inventory.countDocuments({
        user: userId,
        $expr: { $lt: ["$currentStock", "$minimumStock"] },
      }),
      StockMovement.countDocuments({
        user: userId,
        createdAt: { $gte: today },
      }),
    ]);

  const totalRevenueToday = todayOrders.reduce(
    (sum, order) => sum + (Number(order.totalAmount) || 0),
    0,
  );

  return {
    intent: "OPERATIONS_SUMMARY",
    message: `Today: ${todayOrders.length} order(s), ${todayMovements} stock movement(s), ${lowStockCount} low-stock item(s).`,
    data: {
      ordersToday: todayOrders.length,
      revenueToday: totalRevenueToday,
      inventoryItems: totalInventories,
      lowStockItems: lowStockCount,
      stockMovementsToday: todayMovements,
    },
  };
};

const applyStockMovement = async (userId, action) => {
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
    Product.findOne({ _id: productId, user: userId }),
    Inventory.findOne({ product: productId, user: userId }),
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
    user: userId,
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

const getChatbotContext = async (userId) => {
  const today = startOfToday();
  const [lowStockItems, todayOrdersCount, todayMovements] = await Promise.all([
    Inventory.find({
      user: userId,
      $expr: { $lt: ["$currentStock", "$minimumStock"] },
    })
      .populate("product", "name")
      .limit(5),
    Order.countDocuments({ user: userId, createdAt: { $gte: today } }),
    StockMovement.countDocuments({ user: userId, createdAt: { $gte: today } }),
  ]);

  return {
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
    "You are an inventory operations assistant.",
    "Keep responses concise and practical.",
    "If user requests stock-changing action, ask them to use action.type='CREATE_MOVEMENT'.",
    "Use the business context below when relevant.",
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

const scoreLandingDomainRelevance = (message = "") => {
  const normalized = String(message || "").toLowerCase();
  const tokens = normalized.split(/[^a-z0-9]+/).filter(Boolean);
  if (!tokens.length) {
    return {
      score: 0,
      isRelevant: false,
      matchedKeywords: [],
    };
  }

  const keywords = [
    "inventory",
    "stock",
    "movement",
    "warehouse",
    "logistics",
    "shipment",
    "shipments",
    "delivery",
    "order",
    "orders",
    "product",
    "products",
    "supplier",
    "suppliers",
    "staff",
    "dashboard",
    "feature",
    "features",
    "service",
    "services",
    "faq",
    "support",
    "pricing",
    "plan",
    "plans",
    "setup",
    "onboarding",
    "restock",
    "low",
  ];

  const matchedKeywords = keywords.filter((keyword) =>
    normalized.includes(keyword),
  );

  const score = Math.min(1, matchedKeywords.length / 3);
  return {
    score,
    isRelevant: score >= LANDING_RELEVANCE_THRESHOLD,
    matchedKeywords,
  };
};

const classifyLandingIntent = (message = "") => {
  const normalized = String(message || "").toLowerCase();

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
    "You are the public landing-page assistant for an Inventory and Logistics Management System.",
    "Answer only using the knowledge base provided below.",
    "If information is not in the knowledge base, say that it is not available and suggest contacting support.",
    "Do not answer unrelated questions.",
    "Keep the tone friendly and concise.",
    `Detected intent: ${intent}`,
    `Recent conversation: ${JSON.stringify(history || [])}`,
    `Knowledge base: ${JSON.stringify(knowledgeBase)}`,
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

const getLandingFallbackResponse = (intent) => {
  if (intent === "FEATURE_EXPLAIN") {
    return "Core features include product management, inventory tracking, stock movement logging, order handling, shipment monitoring, supplier/staff management, and audit logs.";
  }
  if (intent === "SERVICE_INFO") {
    return "The system focuses on inventory and logistics operations visibility, low-stock control, and authenticated API-based workflows with audit traceability.";
  }
  if (intent === "FAQ") {
    const faqPreview = LANDING_KNOWLEDGE_BASE.faqs
      .slice(0, 3)
      .map((faq, idx) => `${idx + 1}. ${faq.question}`)
      .join(" ");
    return `Here are common FAQs: ${faqPreview}`;
  }
  if (intent === "LIVE_AGENT") {
    return "I can help with system information here. If you want a live person, please use the contact/support option on this page.";
  }
  return LANDING_KNOWLEDGE_BASE.systemOverview;
};

const getLandingSuggestions = (intent) => {
  if (intent === "FEATURE_EXPLAIN") {
    return [
      "Do you want a quick overview of each core module?",
      "Would you like to know how low-stock alerts work?",
      "Should I explain order and shipment tracking next?",
    ];
  }
  if (intent === "SERVICE_INFO") {
    return [
      "Do you want support and onboarding details?",
      "Should I explain what operations visibility includes?",
      "Would you like a quick FAQ list about services?",
    ];
  }
  if (intent === "FAQ") {
    return [
      "Do you want FAQs about inventory tracking?",
      "Should I list FAQs about stock movement safety?",
      "Would you like FAQs about shipment and order flow?",
    ];
  }
  if (intent === "LIVE_AGENT") {
    return [
      "Do you want me to summarize features before handoff?",
      "Should I share common setup FAQs first?",
      "Would you like service/support details while you wait?",
    ];
  }
  return [
    "Do you want a feature overview?",
    "Should I explain services and support?",
    "Would you like to see common FAQs?",
  ];
};

const getClarifyingQuestion = (message) => {
  const normalized = String(message || "").toLowerCase();
  if (normalized.includes("feature") || normalized.includes("module")) {
    return "Do you want details on inventory, shipments, orders, or all features?";
  }
  if (
    normalized.includes("service") ||
    normalized.includes("support") ||
    normalized.includes("pricing")
  ) {
    return "Are you asking about support/onboarding, or about plans and pricing?";
  }
  return "Could you clarify if you want information about features, services, or FAQs?";
};

const getFollowUpQuestion = (intent) => {
  if (intent === "FEATURE_EXPLAIN") {
    return "Would you like a deeper explanation of inventory tracking or shipment management?";
  }
  if (intent === "SERVICE_INFO") {
    return "Do you want support and onboarding details next?";
  }
  if (intent === "FAQ") {
    return "Would you like more FAQs focused on stock and logistics workflows?";
  }
  if (intent === "LIVE_AGENT") {
    return "Would you like a quick summary prepared before you contact a live agent?";
  }
  return "Would you like a quick overview of features, services, or FAQs?";
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

exports.chat = async (req, res) => {
  try {
    const { message = "", action } = req.body || {};
    const normalized = String(message || "").toLowerCase();

    let result;
    if (action?.type === "CREATE_MOVEMENT") {
      result = await applyStockMovement(req.user._id, action);
      await createAuditLog({
        userId: req.user._id,
        action: "CHATBOT_CREATE_MOVEMENT",
        entity: "StockMovement",
        newData: { request: action, response: result.body },
        req,
      });
      return res.status(result.status).json(result.body);
    }

    let aiReply = null;
    let usedGemini = false;

    try {
      const context = await getChatbotContext(req.user._id);
      aiReply = await callGemini({ message, context });
      usedGemini = Boolean(aiReply);
    } catch (geminiError) {
      usedGemini = false;
    }

    if (usedGemini) {
      result = {
        intent: "AI_CHAT",
        message: aiReply,
        data: null,
      };
    } else {
      if (
        normalized.includes("low stock") ||
        normalized.includes("restock") ||
        normalized.includes("below minimum")
      ) {
        result = await getLowStockResponse(req.user._id);
      } else if (
        normalized.includes("summary") ||
        normalized.includes("today") ||
        normalized.includes("dashboard")
      ) {
        result = await getSummaryResponse(req.user._id);
      } else {
        result = {
          intent: "HELP",
          message:
            "Ask for 'low stock' or 'summary'. You can also send action.type='CREATE_MOVEMENT' to update stock safely.",
          data: null,
        };
      }
    }

    await createAuditLog({
      userId: req.user._id,
      action: "CHATBOT_QUERY",
      entity: "Chatbot",
      newData: { message, intent: result.intent, usedGemini },
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
    const relevance = scoreLandingDomainRelevance(trimmedMessage);
    const isIntentClearlyInDomain =
      intent === "FEATURE_EXPLAIN" ||
      intent === "SERVICE_INFO" ||
      intent === "FAQ" ||
      intent === "LIVE_AGENT";
    const shouldTreatAsRelevant = relevance.isRelevant || isIntentClearlyInDomain;
    if (!shouldTreatAsRelevant) {
      const clarifyingQuestion = getClarifyingQuestion(trimmedMessage);
      const outOfScopeMessage = `${LANDING_SCOPE_MESSAGE} ${clarifyingQuestion}`;
      saveLandingSessionTurn(sessionKey, trimmedMessage, outOfScopeMessage);
      return res.json({
        success: true,
        intent: "IRRELEVANT_QUERY",
        message: outOfScopeMessage,
        sessionId: sessionKey,
        relevanceScore: relevance.score,
        suggestions: [
          "What features does this system provide?",
          "How does low-stock tracking work?",
          "What services and support are available?",
        ],
      });
    }

    let botMessage = null;
    let usedGemini = false;

    try {
      botMessage = await callLandingGemini({
        message: trimmedMessage,
        intent,
        history: recentHistory,
        knowledgeBase: LANDING_KNOWLEDGE_BASE,
      });
      usedGemini = Boolean(botMessage);
    } catch (error) {
      usedGemini = false;
    }

    if (!botMessage) {
      botMessage = getLandingFallbackResponse(intent);
    }
    const needsClarification = relevance.score < LANDING_LOW_CONFIDENCE_THRESHOLD;
    const followUpQuestion = needsClarification
      ? getClarifyingQuestion(trimmedMessage)
      : getFollowUpQuestion(intent);
    const finalMessage = `${botMessage}\n\n${followUpQuestion}`;
    saveLandingSessionTurn(sessionKey, trimmedMessage, finalMessage);

    res.json({
      success: true,
      intent,
      message: finalMessage,
      sessionId: sessionKey,
      relevanceScore: relevance.score,
      usedGemini,
      confidence: needsClarification ? "LOW" : "NORMAL",
      data: {
        matchedKeywords: relevance.matchedKeywords,
        historyLength: getLandingSessionHistory(sessionKey).length,
        followUpQuestion,
        suggestions: getLandingSuggestions(intent),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
