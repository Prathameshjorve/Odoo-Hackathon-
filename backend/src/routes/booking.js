const express = require("express");
const router = express.Router();
const requireAuth = require("../middlewares/requireAuth");
const {
    getPublishedAppointments,
    getAppointmentDetails,
    getAvailableSlots,
    createBooking,
    getUserBookings,
    getOrganizationBookings,
    cancelBooking,
    cancelBookingByOrganization,
} = require("../controllers/bookingController");

// Public routes
router.get("/appointments/published", getPublishedAppointments);
router.get("/appointments/:id/details", getAppointmentDetails);
router.get("/appointments/:id/slots", getAvailableSlots);

// Protected routes (require authentication)
router.post("/appointments/:id/book", requireAuth, createBooking);
router.get("/bookings/my", requireAuth, getUserBookings);
router.get("/bookings/organization", requireAuth, getOrganizationBookings);
router.delete("/bookings/:id", requireAuth, cancelBooking);
router.delete("/bookings/:id/organization", requireAuth, cancelBookingByOrganization);

module.exports = router;
