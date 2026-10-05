
import { Router } from "express";
import ElectricalController from "../controller/ElectricalController";
import uploader from "../middleware/Uploader";

const electricalCtrl = new ElectricalController();

const electricalRouter = Router();

// ==========================================
// GET ALL ELECTRICIANS
// GET /electrical
// ==========================================

electricalRouter.get(
  "/",
  electricalCtrl.getAllElectricians
);

// ==========================================
// GET SINGLE ELECTRICIAN
// GET /electrical/:id
// ==========================================

electricalRouter.get(
  "/:id",
  electricalCtrl.getElectricianById
);

// ==========================================
// CREATE ELECTRICIAN WITH IMAGE
// POST /electrical
// ==========================================

electricalRouter.post(
  "/",
  uploader("/electrical").single("image"),
  electricalCtrl.createElectrician
);

// ==========================================
// UPDATE ENTIRE ELECTRICIAN WITH IMAGE
// PUT /electrical/:id
// ==========================================

electricalRouter.put(
  "/:id",
  uploader("/electrical").single("image"),
  electricalCtrl.updateElectrician
);

// ==========================================
// PARTIALLY UPDATE ELECTRICIAN WITH IMAGE
// PATCH /electrical/:id
// ==========================================

electricalRouter.patch(
  "/:id",
  uploader("/electrical").single("image"),
  electricalCtrl.patchElectrician
);

// ==========================================
// DELETE ELECTRICIAN
// DELETE /electrical/:id
// ==========================================

electricalRouter.delete(
  "/:id",
  electricalCtrl.deleteElectrician
);

export default electricalRouter;
