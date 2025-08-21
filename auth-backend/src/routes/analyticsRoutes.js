const express = require("express");
const router = express.Router();
const { getOverview, queryMetric, nlQuery } = require("../controllers/analyticsController");
const { protect } = require("../middleware/authMiddleware");

router.get("/overview", protect, getOverview);
router.post("/query", protect, queryMetric);
router.post("/nlquery", protect, nlQuery);

module.exports = router;
