const express = require("express");
const router = express.Router();
const { protect, companyAdminOnly } = require("../middlewares/authMiddleware");
const {
  approveStaff,
  createStaff,
  deleteStaff,
  getStaff,
  getJoinRequests,
  rejectStaff,
  suspendStaff,
  updateStaff,
} = require("../controllers/staffController");

router.use(protect, companyAdminOnly);

router.get("/", getStaff);
router.get("/requests", getJoinRequests);
router.post("/", createStaff);
router.patch("/:id/approve", approveStaff);
router.patch("/:id/reject", rejectStaff);
router.patch("/:id/suspend", suspendStaff);
router.put("/:id", updateStaff);
router.delete("/:id", deleteStaff);

module.exports = router;
