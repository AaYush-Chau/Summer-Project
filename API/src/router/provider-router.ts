
import { Router } from "express";

import ProviderController from "../controller/ProviderController";
import AuthCheck from "../middleware/Auth";
import uploader from "../middleware/Uploader";

const providerCtrl = new ProviderController();

const providerRouter = Router();

// Get providers by service
providerRouter.get(
  "/service/:service",
  providerCtrl.getProvidersByService
);

// Get logged-in provider profile
providerRouter.get(
  "/details",
  AuthCheck(["provider"]),
  providerCtrl.getProviderDetails
);

// Get single provider by ID
providerRouter.get(
  "/:providerId",
  providerCtrl.getProviderById
);

// Create provider profile
providerRouter.post(
  "/details",
  AuthCheck(["provider"]),
  uploader("/provider").single("profileImage"),
  providerCtrl.createProviderDetails
);

export default providerRouter;
