import { Router } from "express";
import AuthCheck from "../middleware/Auth";
import UserController from "../controller/UserController";

const userCtrl = new UserController();
const userRouter = Router()

userRouter.get("/", AuthCheck(['admin']), userCtrl.getAllUserList)

export default userRouter;