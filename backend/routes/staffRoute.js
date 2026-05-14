const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const {
  createStaff,
  deleteStaff,
  getStaff,
  updateStaff,
} = require("../controllers/staffController");

router.use(protect);

router.get("/", getStaff);
router.post("/", createStaff);
router.put("/:id", updateStaff);
router.delete("/:id", deleteStaff);

module.exports = router;
