import { Router } from "express";
import PaintingController from "../controller/PaintingController";
import uploader from "../middleware/Uploader";

const paintingCtrl = new PaintingController();

const paintingRouter = Router();

// ==========================================
// GET ALL PAINTERS
// GET /painting
// ==========================================

paintingRouter.get("/", paintingCtrl.getAllPainters);

// ==========================================
// GET SINGLE PAINTER
// GET /painting/:id
// ==========================================

paintingRouter.get("/:id", paintingCtrl.getPainterById);

// ==========================================
// CREATE PAINTER WITH IMAGE
// POST /painting
// ==========================================

paintingRouter.post(
  "/",
  uploader("/painting").single("image"),
  paintingCtrl.createPainter
);

// ==========================================
// UPDATE ENTIRE PAINTER WITH IMAGE
// PUT /painting/:id
// ==========================================

paintingRouter.put(
  "/:id",
  uploader("/painting").single("image"),
  paintingCtrl.updatePainter
);

// ==========================================
// PARTIALLY UPDATE PAINTER WITH IMAGE
// PATCH /painting/:id
// ==========================================

paintingRouter.patch(
  "/:id",
  uploader("/painting").single("image"),
  paintingCtrl.patchPainter
);

// ==========================================
// DELETE PAINTER
// DELETE /painting/:id
// ==========================================

paintingRouter.delete("/:id", paintingCtrl.deletePainter);

export default paintingRouter;

