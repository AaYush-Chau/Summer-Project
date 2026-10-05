
import { type Response, type NextFunction } from "express";

import { type AuthRequest } from "../types/Request";

import BookingModel from "../model/booking-model";

import ProfessionalProfileModel from "../model/professional-profile-model";

class BookingController {
  // ==========================================
  // CREATE BOOKING - CUSTOMER
  // ==========================================
  createBooking = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const loggedInUser = req.loggedInUser;

      if (!loggedInUser) {
        return next({
          code: 401,
          message: "Login required",
        });
      }

      const {
        providerId,
        service,
        bookingDate,
        bookingTime,
        address,
        description,
      } = req.body;

      if (
        !providerId ||
        !service ||
        !bookingDate ||
        !bookingTime ||
        !address ||
        !description
      ) {
        return next({
          code: 400,
          message:
            "providerId, service, bookingDate, bookingTime, address and description are required",
        });
      }

      const validServices = [
        "plumber",
        "electrician",
        "cleaner",
        "painter",
      ];

      if (!validServices.includes(service)) {
        return next({
          code: 400,
          message: `Invalid service "${service}"`,
        });
      }

      // ==========================================
      // FIND PROFESSIONAL
      // ==========================================
      const provider =
        await ProfessionalProfileModel.findById(providerId);

      if (!provider) {
        return next({
          code: 404,
          message: "Professional not found",
        });
      }

      // Check service match
      if (provider.service !== service) {
        return next({
          code: 400,
          message:
            "Selected service does not match the professional's service",
        });
      }

      // Check availability
      if (provider.availability === "Unavailable") {
        return next({
          code: 400,
          message: "This professional is currently unavailable",
        });
      }

      // ==========================================
      // CHECK EXISTING PENDING BOOKING
      // ==========================================
      //
      // Customer cannot send another request to
      // the same provider while a previous request
      // is still pending.
      //

      const pendingBooking = await BookingModel.findOne({
        customerId: loggedInUser.id,
        providerId: provider._id,
        status: "Pending",
      });

      if (pendingBooking) {
        return next({
          code: 409,
          message:
            "You already have a pending booking request with this service provider.",
        });
      }

      // ==========================================
      // 12-HOUR BOOKING RESTRICTION
      // ==========================================
      //
      // If the same customer has an Accepted or
      // Rejected booking with the same provider
      // within the last 12 hours, block booking.
      //

      const twelveHoursAgo = new Date(
        Date.now() - 12 * 60 * 60 * 1000
      );

      const recentBooking = await BookingModel.findOne({
        customerId: loggedInUser.id,
        providerId: provider._id,
        status: {
          $in: ["Accepted", "Rejected"],
        },
        statusChangedAt: {
          $gte: twelveHoursAgo,
        },
      }).sort({
        statusChangedAt: -1,
      });

      if (recentBooking && recentBooking.statusChangedAt) {
        const unlockTime = new Date(
          recentBooking.statusChangedAt.getTime() +
            12 * 60 * 60 * 1000
        );

        const remainingMilliseconds =
          unlockTime.getTime() - Date.now();

        const remainingHours = Math.ceil(
          remainingMilliseconds / (1000 * 60 * 60)
        );

        return next({
          code: 409,
          message:
            `You cannot book this service provider again yet. ` +
            `Please wait approximately ${remainingHours} hour(s).`,
        });
      }

      // ==========================================
      // CREATE NEW BOOKING
      // ==========================================
      const booking = await BookingModel.create({
        customerId: loggedInUser.id,
        providerId: provider._id,
        service,
        bookingDate,
        bookingTime,
        address,
        description,
        price: provider.price,
        status: "Pending",
        statusChangedAt: null,
      });

      return res.status(201).json({
        data: booking,
        message: "Booking request sent successfully",
        meta: null,
      });
    } catch (exception) {
      next(exception);
    }
  };

  // ==========================================
  // GET BOOKINGS FOR LOGGED-IN PROVIDER
  // ==========================================
  getProviderBookings = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const loggedInUser = req.loggedInUser;

      if (!loggedInUser) {
        return next({
          code: 401,
          message: "Login required",
        });
      }

      // Find professional profile of logged-in provider
      const provider =
        await ProfessionalProfileModel.findOne({
          userId: loggedInUser.id,
        });

      if (!provider) {
        return next({
          code: 404,
          message: "Professional profile not found",
        });
      }

      // Find all bookings sent to this provider
      const bookings = await BookingModel.find({
        providerId: provider._id,
      })
        .populate("customerId", "fullname phone")
        .sort({ createdAt: -1 });

      return res.json({
        data: bookings,
        message: "Booking requests fetched successfully",
        meta: {
          count: bookings.length,
        },
      });
    } catch (exception) {
      next(exception);
    }
  };

  // ==========================================
  // UPDATE BOOKING STATUS
  // ==========================================
  updateBookingStatus = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const loggedInUser = req.loggedInUser;

      if (!loggedInUser) {
        return next({
          code: 401,
          message: "Login required",
        });
      }

      const { bookingId } = req.params;
      const { status } = req.body;

      if (!bookingId || !status) {
        return next({
          code: 400,
          message: "Booking ID and status are required",
        });
      }

      const allowedStatuses = [
        "Accepted",
        "Rejected",
        "Completed",
        "Cancelled",
      ];

      if (!allowedStatuses.includes(status)) {
        return next({
          code: 400,
          message: `Invalid status. Allowed values: ${allowedStatuses.join(
            ", "
          )}`,
        });
      }

      // ==========================================
      // FIND PROVIDER PROFILE
      // ==========================================
      const provider =
        await ProfessionalProfileModel.findOne({
          userId: loggedInUser.id,
        });

      if (!provider) {
        return next({
          code: 404,
          message: "Professional profile not found",
        });
      }

      // ==========================================
      // FIND BOOKING
      // ==========================================
      const booking = await BookingModel.findOne({
        _id: bookingId,
        providerId: provider._id,
      });

      if (!booking) {
        return next({
          code: 404,
          message: "Booking not found",
        });
      }

      // ==========================================
      // UPDATE STATUS
      // ==========================================
      booking.status = status;

      // ==========================================
      // SET STATUS CHANGE TIME
      // ==========================================
      //
      // The 12-hour restriction starts when the
      // provider accepts or rejects the booking.
      //

      if (status === "Accepted" || status === "Rejected") {
        booking.statusChangedAt = new Date();
      }

      await booking.save();

      await booking.populate("customerId", "fullname phone");

      return res.json({
        data: booking,
        message: `Booking ${status.toLowerCase()} successfully`,
        meta: null,
      });
    } catch (exception) {
      next(exception);
    }
  };

  // ==========================================
  // GET BOOKINGS FOR LOGGED-IN CUSTOMER
  // ==========================================
  getCustomerBookings = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const loggedInUser = req.loggedInUser;

      if (!loggedInUser) {
        return next({
          code: 401,
          message: "Login required",
        });
      }

      // Find bookings created by the logged-in customer
      const bookings = await BookingModel.find({
        customerId: loggedInUser.id,
      })
        .populate(
          "providerId",
          "email service experience price availability profileImage"
        )
        .sort({ createdAt: -1 });

      return res.json({
        data: bookings,
        message: "Customer bookings fetched successfully",
        meta: {
          count: bookings.length,
        },
      });
    } catch (exception) {
      next(exception);
    }
  };
}

export default BookingController;

