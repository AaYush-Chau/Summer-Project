import { type Response, type NextFunction } from "express";

import { type AuthRequest } from "../types/Request";

import ReviewModel from "../model/review-model";

import BookingModel from "../model/booking-model";

import UserModel from "../model/user-model"; // adjust to your real file name

import ProfessionalProfileModel from "../model/professional-profile-model"; // adjust to your real file name

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

  // ==========================================
  // GET TOP RATED PROVIDERS - PUBLIC (HOMEPAGE)
  // ==========================================
  getTopRatedProviders = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const parsed = Number.parseInt(String(req.query.limit), 10);
      const limit = Math.min(
        Math.max(Number.isNaN(parsed) ? 3 : parsed, 1),
        12
      );

      const data = await ReviewModel.aggregate([
        // Only valid ratings
        {
          $match: {
            rating: { $gte: 1, $lte: 5 },
            providerId: { $ne: null },
          },
        },

        // Average rating + review count per provider profile
        {
          $group: {
            _id: "$providerId",
            averageRating: { $avg: "$rating" },
            reviewCount: { $sum: 1 },
          },
        },

        // Highest average first, then most reviews, then stable order
        { $sort: { averageRating: -1, reviewCount: -1, _id: 1 } },

        // Join the professional profile (providerId refs ProfessionalProfile)
        {
          $lookup: {
            from: ProfessionalProfileModel.collection.name,
            localField: "_id",
            foreignField: "_id",
            as: "profile",
          },
        },
        // Drops reviews whose profile no longer exists
        { $unwind: "$profile" },

        // Join the user that owns the profile (for the real name)
        {
          $addFields: {
            ownerId: { $ifNull: ["$profile.userId", "$profile.user"] }, // ASSUME field name
          },
        },
        {
          $lookup: {
            from: UserModel.collection.name,
            localField: "ownerId",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },

        { $limit: limit },

        {
          $project: {
            _id: 0,
            id: { $toString: "$_id" },
            name: {
              $ifNull: [
                "$user.fullname",
                { $ifNull: ["$profile.fullname", "$profile.name"] },
              ],
            },
            // Always returned as an array of strings
            services: {
              $let: {
                vars: {
                  raw: {
                    $ifNull: [
                      "$profile.services",
                      {
                        $ifNull: [
                          "$profile.skills",
                          {
                            $ifNull: [
                              "$profile.serviceCategory",
                              {
                                $ifNull: [
                                  "$profile.profession",
                                  "$profile.category",
                                ],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                },
                in: {
                  $cond: [
                    { $isArray: "$$raw" },
                    "$$raw",
                    {
                      $cond: [
                        { $eq: [{ $type: "$$raw" }, "string"] },
                        ["$$raw"],
                        [],
                      ],
                    },
                  ],
                },
              },
            },
            location: {
              $ifNull: [
                "$profile.location",
                { $ifNull: ["$profile.address", "$profile.city"] },
              ],
            },
            // Provider photo is stored as profileImage: { filename }
            image: {
              $cond: [
                {
                  $gt: [
                    {
                      $strLenCP: {
                        $ifNull: ["$profile.profileImage.filename", ""],
                      },
                    },
                    0,
                  ],
                },
                {
                  $concat: [
                    "uploads/images/provider/",
                    "$profile.profileImage.filename",
                  ],
                },
                null,
              ],
            },
            verified: {
              $eq: [
                { $ifNull: ["$profile.isVerified", "$profile.verified"] },
                true,
              ],
            },
            averageRating: { $round: ["$averageRating", 1] },
            reviewCount: 1,
          },
        },
      ]);

      return res.json({
        data,
        message: "Top rated providers fetched successfully",
        meta: { count: data.length },
      });
    } catch (exception) {
      next(exception);
    }
  };
}

export default ReviewController;