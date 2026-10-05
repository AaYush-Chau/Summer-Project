
import { Router } from "express";

import { healthCheck } from "../controller/TestController";

import reviewRouter from "./review-router";
import authRouter from "./auth-router";
import professionRouter from "./profession-router";
import userRouter from "./user-router";
import plumberRouter from "./plumber-router";
import electricalRouter from "./electrical-router";
import cleaningRouter from "./cleaning-router";
import paintingRouter from "./painting-router";
import providerRouter from "./provider-router";
import bookingRouter from "./booking-router";
import adminRouter from "./admin-router";

const router: Router = Router();

router.get("/", healthCheck);

router.use("/provider", providerRouter);

router.use("/auth", authRouter);

router.use("/profession", professionRouter);

router.use("/user", userRouter);

router.use("/plumber", plumberRouter);

router.use("/electrical", electricalRouter);

router.use("/cleaning", cleaningRouter);

router.use("/painting", paintingRouter);

router.use("/booking", bookingRouter);

router.use("/review", reviewRouter);

/* =========================
   ADMIN ROUTES
========================= */

router.use("/admin", adminRouter);

export default router;

