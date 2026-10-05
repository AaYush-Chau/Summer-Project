import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullname: {
      type: String,
      required: true,
      min: 2,
      max: 50,
      trim: true,
    },

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

    image: {
      originalName: String,
      filename: String,
      size: Number,
      destination: String,
    },

    role: {
      type: String,
      enum: ["admin", "user", "provider"],
      default: "user",
    },
  },
  {
    timestamps: true,
  }
);

const UserModel =
  mongoose.models.User || mongoose.model("User", userSchema);

export default UserModel;