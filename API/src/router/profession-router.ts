import { Router } from "express";
import ProfessionalController from "../controller/ProfessionController";
import uploader from "../middleware/Uploader";

const professionalCtrl = new ProfessionalController();
const professionalRouter = Router();

professionalRouter.post(
  "/register",
  uploader("/professional").single("profileImage"),
  professionalCtrl.register
);

professionalRouter.post("/login", professionalCtrl.login);

export default professionalRouter;