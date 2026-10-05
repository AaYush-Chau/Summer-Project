import mongoose from "mongoose";

const professionalProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one profile per user
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    dob: {
      type: Date,
      required: true,
    },

    service: {
      type: String,
      required: true,
      enum: ["plumber", "electrician", "cleaner", "painter"],
    },

    experience: {
      type: Number,
      required: true,
      min: 0,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    profileImage: {
      originalName: String,
      filename: String,
      size: Number,
      destination: String,
    },

    availability: {
      type: String,
      enum: ["Available", "Busy", "Unavailable"],
      default: "Available",
    },
  },
  {
    timestamps: true,
  }
);

const ProfessionalProfileModel = mongoose.model(
  "ProfessionalProfile",
  professionalProfileSchema
);

export default ProfessionalProfileModel;