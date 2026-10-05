
import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    // Customer who created the booking
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Professional being booked
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProfessionalProfile",
      required: true,
    },

    // Service requested
    service: {
      type: String,
      required: true,
      enum: [
        "plumber",
        "electrician",
        "cleaner",
        "painter",
      ],
    },

    // Requested service date
    bookingDate: {
      type: Date,
      required: true,
    },

    // Requested service time
    bookingTime: {
      type: String,
      required: true,
    },

    // Customer's service location
    address: {
      type: String,
      required: true,
      trim: true,
    },

    // Customer's description/problem
    description: {
      type: String,
      required: true,
      trim: true,
    },

    // Provider's listed price at the time of booking
    price: {
      type: Number,
      required: true,
      min: 0,
    },

    // Booking status
    status: {
      type: String,
      enum: [
        "Pending",
        "Accepted",
        "Rejected",
        "Completed",
        "Cancelled",
      ],
      default: "Pending",
    },

    // Time when provider accepts or rejects the booking
    statusChangedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const BookingModel = mongoose.model(
  "Booking",
  bookingSchema
);

export default BookingModel;

