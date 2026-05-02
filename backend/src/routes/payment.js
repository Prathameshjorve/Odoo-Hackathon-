const express = require("express");
const router = express.Router();
const { createOrder, verifyPayment } = require("../controllers/paymentControllerSimple");

router.post("/create-order", createOrder);
router.post("/verify", verifyPayment);

module.exports = router;
