
import { Router } from "express";

import AuthCheck from "../middleware/Auth";

import ReviewController from "../controller/ReviewController";

const reviewCtrl = new ReviewController();

const reviewRouter = Router();

// Customer creates a review
reviewRouter.post(
  "/",
  AuthCheck(["user"]),
  reviewCtrl.createReview
);

// Anyone can view provider reviews
reviewRouter.get(
  "/provider/:providerId",
  reviewCtrl.getProviderReviews
);

export default reviewRouter;

