const Razorpay = require("razorpay");
const crypto = require("crypto");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.createOrder = async (req, res) => {
  try {
    let { amount, bookingId } = req.body;
    const prisma = require("../lib/prisma");

    // If bookingId is provided, fetch amount from database
    if (bookingId) {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { appointment: true }
      });

      if (!booking) {
        return res.status(404).json({ success: false, message: "Booking not found" });
      }

      amount = booking.totalAmount;
    }
    
    if (!amount) {
      return res.status(400).json({ 
        success: false, 
        message: "Amount is required" 
      });
    }

    const options = {
      amount: Math.round(amount * 100), // convert to paise
      currency: "INR",
      receipt: bookingId || `receipt_${Date.now()}`,
      notes: {
        bookingId: bookingId || ""
      }
    };

    const order = await razorpay.orders.create(options);
    
    // Return full order object as requested, plus merchantKeyId for frontend
    res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        status: order.status,
        merchantKeyId: process.env.RAZORPAY_KEY_ID,
        bookingId: bookingId
      }
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Failed to create order" 
    });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;
    const prisma = require("../lib/prisma");

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing payment details" 
      });
    }

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      // Payment verified, update booking status if bookingId is provided
      if (bookingId) {
        await prisma.booking.update({
          where: { id: bookingId },
          data: {
            paymentStatus: "PAID",
            bookingStatus: "CONFIRMED"
          }
        });
        console.log(`Booking ${bookingId} marked as PAID and CONFIRMED`);
      }

      return res.status(200).json({ 
        success: true, 
        message: "Payment verified successfully" 
      });
    } else {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid signature" 
      });
    }
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal Server Error" 
    });
  }
};
