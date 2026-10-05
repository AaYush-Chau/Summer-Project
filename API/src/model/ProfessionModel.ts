import mongoose from "mongoose";

const professionalSchema = new mongoose.Schema(
  {
    fullname: {
      type: String,
      required: true,
      trim: true,
    },

    // Nepal phone number, e.g. +9779812345678
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: /^\+9779\d{9}$/,
    },

    password: {
      type: String,
      required: true,
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

    role: {
      type: String,
      default: "professional",
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

const ProfessionalModel = mongoose.model("Professional", professionalSchema);

export default ProfessionalModel;