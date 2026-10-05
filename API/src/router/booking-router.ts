import { Router } from "express";
import BookingController from "../controller/BookingController";
import AuthCheck from "../middleware/Auth";

const bookingCtrl = new BookingController();

const bookingRouter = Router();

// Customer sends booking request
bookingRouter.post(
  "/",
  AuthCheck(["user"]),
  bookingCtrl.createBooking
);

// Professional sees booking requests
bookingRouter.get(
  "/provider",
  AuthCheck(["provider"]),
  bookingCtrl.getProviderBookings
);

// Customer sees their own bookings
bookingRouter.get(
  "/customer",
  AuthCheck(["user"]),
  bookingCtrl.getCustomerBookings
);

// Professional accepts/rejects booking
bookingRouter.patch(
  "/:bookingId/status",
  AuthCheck(["provider"]),
  bookingCtrl.updateBookingStatus
);

export default bookingRouter;