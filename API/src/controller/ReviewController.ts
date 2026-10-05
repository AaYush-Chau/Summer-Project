
import { type Response, type NextFunction } from "express";

import { type AuthRequest } from "../types/Request";

import ReviewModel from "../model/review-model";

import BookingModel from "../model/booking-model";

class ReviewController {
  // ==========================================
  // CREATE REVIEW - CUSTOMER
  // ==========================================
  createReview = async (
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
        bookingId,
        rating,
        comment,
      } = req.body;

      // ==========================================
      // VALIDATION
      // ==========================================

      if (!bookingId || rating === undefined || !comment) {
        return next({
          code: 400,
          message:
            "bookingId, rating and comment are required",
        });
      }

      if (
        !Number.isInteger(Number(rating)) ||
        Number(rating) < 1 ||
        Number(rating) > 5
      ) {
        return next({
          code: 400,
          message: "Rating must be a number between 1 and 5",
        });
      }

      // ==========================================
      // FIND BOOKING
      // ==========================================

      const booking = await BookingModel.findOne({
        _id: bookingId,
        customerId: loggedInUser.id,
      });

      if (!booking) {
        return next({
          code: 404,
          message:
            "Booking not found or this booking does not belong to you",
        });
      }

      // ==========================================
      // ONLY COMPLETED BOOKINGS CAN BE REVIEWED
      // ==========================================

      if (booking.status !== "Completed") {
        return next({
          code: 400,
          message:
            "You can only review a completed booking",
        });
      }

      // ==========================================
      // CHECK DUPLICATE REVIEW
      // ==========================================

      const existingReview = await ReviewModel.findOne({
        bookingId: booking._id,
        customerId: loggedInUser.id,
      });

      if (existingReview) {
        return next({
          code: 409,
          message:
            "You have already reviewed this booking",
        });
      }

      // ==========================================
      // CREATE REVIEW
      // ==========================================

      const review = await ReviewModel.create({
        customerId: loggedInUser.id,
        providerId: booking.providerId,
        bookingId: booking._id,
        rating: Number(rating),
        comment,
      });

      // ==========================================
      // RESPONSE
      // ==========================================

      return res.status(201).json({
        data: review,
        message: "Review submitted successfully",
        meta: null,
      });
    } catch (exception) {
      next(exception);
    }
  };

  // ==========================================
  // GET REVIEWS FOR PROVIDER
  // ==========================================
  getProviderReviews = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { providerId } = req.params;

      if (!providerId) {
        return next({
          code: 400,
          message: "Provider ID is required",
        });
      }

      const reviews = await ReviewModel.find({
        providerId,
      })
        .populate("customerId", "fullname")
        .sort({ createdAt: -1 });

      // ==========================================
      // CALCULATE AVERAGE RATING
      // ==========================================

      const totalReviews = reviews.length;

      const totalRating = reviews.reduce(
        (sum, review) => sum + review.rating,
        0
      );

      const averageRating =
        totalReviews > 0
          ? Number((totalRating / totalReviews).toFixed(1))
          : 0;

      return res.json({
        data: reviews,
        message: "Provider reviews fetched successfully",
        meta: {
          count: totalReviews,
          averageRating,
        },
      });
    } catch (exception) {
      next(exception);
    }
  };
}

export default ReviewController;
