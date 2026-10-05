
import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    // Customer who wrote the review
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Provider being reviewed
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProfessionalProfile",
      required: true,
    },

    // Completed booking associated with this review
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },

    // Rating from 1 to 5
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    // Customer's written review
    comment: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// One customer can review the same booking only once
reviewSchema.index(
  {
    customerId: 1,
    bookingId: 1,
  },
  {
    unique: true,
  }
);

const ReviewModel = mongoose.model(
  "Review",
  reviewSchema
);

export default ReviewModel;

