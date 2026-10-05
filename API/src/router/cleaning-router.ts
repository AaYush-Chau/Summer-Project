import { Router } from "express";
import CleaningController from "../controller/CleaningController";
import uploader from "../middleware/Uploader";

const cleaningCtrl = new CleaningController();

const cleaningRouter = Router();

// GET all cleaners
cleaningRouter.get("/", cleaningCtrl.getAllCleaners);

// GET cleaner by ID
cleaningRouter.get("/:id", cleaningCtrl.getCleanerById);

// CREATE cleaner + image upload
cleaningRouter.post(
  "/",
  uploader("/cleaning").single("image"),
  cleaningCtrl.createCleaner
);

// UPDATE cleaner + optional image upload
cleaningRouter.put(
  "/:id",
  uploader("/cleaning").single("image"),
  cleaningCtrl.updateCleaner
);

// PATCH cleaner + optional image upload
cleaningRouter.patch(
  "/:id",
  uploader("/cleaning").single("image"),
  cleaningCtrl.patchCleaner
);

// DELETE cleaner
cleaningRouter.delete("/:id", cleaningCtrl.deleteCleaner);

export default cleaningRouter;

