import "dotenv/config";

import mongoose from "mongoose";

import bcrypt from "bcryptjs";

import UserModel from "./src/model/user-model";

import "./src/config/mongodb";

const createAdmin = async () => {
  try {
    // Wait until MongoDB connection is ready
    while (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) =>
        setTimeout(resolve, 500)
      );
    }

    console.log("MongoDB connection ready");

    // Check if admin already exists
    const existingAdmin = await UserModel.findOne({
      role: "admin",
    });

    if (existingAdmin) {
      console.log("Admin account already exists.");
      console.log("Phone:", existingAdmin.phone);
      console.log("Role:", existingAdmin.role);
      return;
    }

    // Hash admin password
    const hashedPassword = await bcrypt.hash(
      "Admin@123",
      10
    );

    // Create admin
    const admin = await UserModel.create({
      fullname: "NearPro Admin",
      phone: "+9779812345678",
      password: hashedPassword,
      role: "admin",
    });

    console.log("Admin created successfully.");
    console.log("Phone:", admin.phone);
    console.log("Role:", admin.role);
  } catch (error) {
    console.error("Failed to create admin:", error);
  } finally {
    await mongoose.connection.close();
  }
};

createAdmin();