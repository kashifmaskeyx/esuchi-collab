const Supplier = require("../models/supplierModel");

// CREATE supplier
exports.createSupplier = async (req, res) => {
  try {
    const { name, contactPerson, phone, email } = req.body;

    // Basic validation
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Supplier name is required",
      });
    }

    const supplier = await Supplier.create({
      name,
      contactPerson,
      phone,
      email,
    });

    res.status(201).json({
      success: true,
      data: supplier,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// GET all suppliers
exports.getSuppliers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const totalSuppliers = await Supplier.countDocuments();

    const suppliers = await Supplier.find()
      .sort("-createdAt")
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      count: suppliers.length,
      totalSuppliers,
      totalPages: Math.ceil(totalSuppliers / limit),
      currentPage: page,
      data: suppliers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET single supplier
exports.getSupplierById = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    res.json({
      success: true,
      data: supplier,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// UPDATE supplier
exports.updateSupplier = async (req, res) => {
  try {
    const { name, contactPerson, phone, email } = req.body;

    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    // Update fields only if provided
    if (name) supplier.name = name;
    if (contactPerson) supplier.contactPerson = contactPerson;
    if (phone) supplier.phone = phone;
    if (email) supplier.email = email;

    await supplier.save();

    res.json({
      success: true,
      data: supplier,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// DELETE supplier
exports.deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndDelete(req.params.id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    res.json({
      success: true,
      message: "Supplier deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
