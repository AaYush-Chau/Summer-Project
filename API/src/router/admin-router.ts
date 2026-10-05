
import { Router } from "express";

import AuthCheck from "../middleware/Auth";
import AdminController from "../controller/AdminController";

const adminRouter = Router();

const adminCtrl = new AdminController();

// Dashboard
adminRouter.get(
  "/dashboard",
  AuthCheck(["admin"]),
  adminCtrl.dashboard
);

// Users
adminRouter.get(
  "/users",
  AuthCheck(["admin"]),
  adminCtrl.getUsers
);

// Providers
adminRouter.get(
  "/providers",
  AuthCheck(["admin"]),
  adminCtrl.getProviders
);

// Bookings
adminRouter.get(
  "/bookings",
  AuthCheck(["admin"]),
  adminCtrl.getBookings
);

// Reviews
adminRouter.get(
  "/reviews",
  AuthCheck(["admin"]),
  adminCtrl.getReviews
);

// Delete User
adminRouter.delete(
  "/users/:id",
  AuthCheck(["admin"]),
  adminCtrl.deleteUser
);

// Delete Review
adminRouter.delete(
  "/reviews/:id",
  AuthCheck(["admin"]),
  adminCtrl.deleteReview
);

export default adminRouter;

