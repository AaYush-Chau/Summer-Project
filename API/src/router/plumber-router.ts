import { Router } from "express";
import PlumbController from "../controller/PlumberController";
import uploader from "../middleware/Uploader";

const plumberCtrl = new PlumbController();

const plumberRouter = Router();

plumberRouter.get("/", plumberCtrl.getAllPlumbers);

plumberRouter.get("/:id", plumberCtrl.getPlumberById);

plumberRouter.post(
  "/",
  uploader("/plumber").single("image"),
  plumberCtrl.createPlumber
);

plumberRouter.put(
  "/:id",
  uploader("/plumber").single("image"),
  plumberCtrl.updatePlumber
);

plumberRouter.patch(
  "/:id",
  uploader("/plumber").single("image"),
  plumberCtrl.patchPlumber
);

plumberRouter.delete("/:id", plumberCtrl.deletePlumber);

export default plumberRouter;