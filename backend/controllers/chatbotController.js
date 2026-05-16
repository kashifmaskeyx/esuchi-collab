const Inventory = require("../models/inventoryModel");
const Product = require("../models/productModel");
const StockMovement = require("../models/stockMovementModel");
const Order = require("../models/orderModel");
const createAuditLog = require("../utils/auditLogger");
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

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
      StockMovement.countDocuments({ user: userId, createdAt: { $gte: today } }),
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
    return { status: 404, body: { success: false, message: "Product not found." } };
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
