
import { Request, Response } from "express";

import UserModel from "../model/user-model";
import BookingModel from "../model/booking-model";
import ReviewModel from "../model/review-model";

class AdminController {
  // =========================
  // Dashboard Statistics
  // =========================
  dashboard = async (req: Request, res: Response) => {
    try {
      const totalUsers = await UserModel.countDocuments({
        role: "user",
      });

      const totalProviders = await UserModel.countDocuments({
        role: "provider",
      });

      const totalBookings = await BookingModel.countDocuments();

      const totalReviews = await ReviewModel.countDocuments();

      return res.status(200).json({
        status: true,
        message: "Admin dashboard data fetched successfully",
        data: {
          totalUsers,
          totalProviders,
          totalBookings,
          totalReviews,
        },
      });
    } catch (error) {
      console.error("Dashboard Error:", error);

      return res.status(500).json({
        status: false,
        message: "Failed to fetch dashboard data",
      });
    }
  };

  // =========================
  // Get All Customers
  // =========================
  getUsers = async (req: Request, res: Response) => {
    try {
      const users = await UserModel.find({
        role: "user",
      })
        .select("-password")
        .sort({ createdAt: -1 });

      return res.status(200).json({
        status: true,
        message: "Users fetched successfully",
        data: users,
      });
    } catch (error) {
      console.error("Get Users Error:", error);

      return res.status(500).json({
        status: false,
        message: "Failed to fetch users",
      });
    }
  };

  // =========================
  // Get All Service Providers
  // =========================
  getProviders = async (req: Request, res: Response) => {
    try {
      const providers = await UserModel.find({
        role: "provider",
      })
        .select("-password")
        .sort({ createdAt: -1 });

      return res.status(200).json({
        status: true,
        message: "Providers fetched successfully",
        data: providers,
      });
    } catch (error) {
      console.error("Get Providers Error:", error);

      return res.status(500).json({
        status: false,
        message: "Failed to fetch providers",
      });
    }
  };

  // =========================
  // Get All Bookings
  // =========================
  getBookings = async (req: Request, res: Response) => {
    try {
      const bookings = await BookingModel.find()
        .populate("customerId", "fullname phone")
        .populate("providerId")
        .sort({ createdAt: -1 });

      return res.status(200).json({
        status: true,
        message: "Bookings fetched successfully",
        data: bookings,
      });
    } catch (error) {
      console.error("Get Bookings Error:", error);

      return res.status(500).json({
        status: false,
        message: "Failed to fetch bookings",
      });
    }
  };

  // =========================
  // Get All Reviews
  // =========================
  getReviews = async (req: Request, res: Response) => {
    try {
      const reviews = await ReviewModel.find()
        .populate("customerId", "fullname")
        .populate("providerId")
        .populate("bookingId")
        .sort({ createdAt: -1 });

      return res.status(200).json({
        status: true,
        message: "Reviews fetched successfully",
        data: reviews,
      });
    } catch (error) {
      console.error("Get Reviews Error:", error);

      return res.status(500).json({
        status: false,
        message: "Failed to fetch reviews",
      });
    }
  };

  // =========================
  // Delete User
  // =========================
  deleteUser = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const user = await UserModel.findByIdAndDelete(id);

      if (!user) {
        return res.status(404).json({
          status: false,
          message: "User not found",
        });
      }

      return res.status(200).json({
        status: true,
        message: "User deleted successfully",
      });
    } catch (error) {
      console.error("Delete User Error:", error);

      return res.status(500).json({
        status: false,
        message: "Failed to delete user",
      });
    }
  };

  // =========================
  // Delete Review
  // =========================
  deleteReview = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const review = await ReviewModel.findByIdAndDelete(id);

      if (!review) {
        return res.status(404).json({
          status: false,
          message: "Review not found",
        });
      }

      return res.status(200).json({
        status: true,
        message: "Review deleted successfully",
      });
    } catch (error) {
      console.error("Delete Review Error:", error);

      return res.status(500).json({
        status: false,
        message: "Failed to delete review",
      });
    }
  };
}

export default AdminController;
