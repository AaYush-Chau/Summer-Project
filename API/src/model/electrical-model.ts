import mongoose from "mongoose";

const electricalSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    address: {
      type: String,
      required: true,
      trim: true,
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

    description: {
      type: String,
      trim: true,
    },

    image: {
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

const ElectricalModel = mongoose.model(
  "Electrical",
  electricalSchema
);

export default ElectricalModel;