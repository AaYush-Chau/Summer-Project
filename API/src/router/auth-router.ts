import { Router } from "express";
import { bodyValidator } from "../middleware/Validator";
import { LoginSchema, UserRegisterSchema } from "../request/auth-request";
import AuthCheck from "../middleware/Auth";
import AuthController from "../controller/AuthController";
import uploader from "../middleware/Uploader";

const authCtrl = new AuthController()

const authRouter = Router();

authRouter.get("/test", (req, res) => {
    res.json({
      message: "Auth router is working",
    });
  });

authRouter.post('/register', uploader().single('image'), bodyValidator(UserRegisterSchema), authCtrl.register)
authRouter.post("/login",bodyValidator(LoginSchema),authCtrl.login);
authRouter.get('/me', AuthCheck(), authCtrl.getLoggedInUserDetail);

// Parameterized routes
authRouter.get('/:userId', AuthCheck(), authCtrl.getUserDetailById);


export default authRouter