import {
  type Request,
  type Response,
  type NextFunction,
} from "express";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import UserModel from "../model/user-model";

import {
  AppConfig,
  Secrets,
} from "../config/app-env";

import { AuthRequest } from "../types/Request";

class AuthController {
  // =========================================================
  // REGISTER
  // =========================================================

  async register(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const data = req.body;

      // Default role
      if (!data.role) {
        data.role = "user";
      }

      // Normalize phone number
      if (!data.phone) {
        return next({
          code: 400,
          message: "Phone number is required.",
        });
      }

      data.phone = data.phone.trim();

      // Check if phone number already exists
      const existingUser = await UserModel.findOne({
        phone: data.phone,
      });

      if (existingUser) {
        return next({
          code: 409,
          message: "Phone number is already registered.",
        });
      }

      // Hash password
      data.password = bcrypt.hashSync(
        data.password,
        12
      );

      // Handle uploaded image
      if (req.file) {
        data.image = {
          originalName: req.file.originalname,
          filename: req.file.filename,
          size: req.file.size,
          destination: req.file.destination,
        };
      }

      // Store user
      const user = new UserModel(data);

      await user.save();

      // Generate JWT token
      const token = jwt.sign(
        {
          sub: user._id.toString(),
          phone: user.phone,
          role: user.role,
          type: "Bearer",
        },
        Secrets.jwtSecret as string,
        {
          expiresIn: "180m",
        }
      );

      return res.json({
        data: {
          accessToken: token,
          user: {
            id: user._id,
            fullname: user.fullname,
            phone: user.phone,
            role: user.role,
          },
        },
        message: "Registration Success",
        meta: null,
      });
    } catch (exception) {
      next(exception);
    }
  }

  // =========================================================
  // LOGIN
  // =========================================================

  login = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const credentials = req.body;

      // -----------------------------------------------------
      // Check phone
      // -----------------------------------------------------

      if (!credentials.phone) {
        return next({
          code: 400,
          message: "Phone number is required.",
        });
      }

      // -----------------------------------------------------
      // Check password
      // -----------------------------------------------------

      if (!credentials.password) {
        return next({
          code: 400,
          message: "Password is required.",
        });
      }

      // -----------------------------------------------------
      // Check account role
      // -----------------------------------------------------

      if (!credentials.role) {
        return next({
          code: 400,
          message: "Account type is required.",
        });
      }

      // -----------------------------------------------------
      // Allow Customer, Provider, and Admin
      // -----------------------------------------------------

      if (
        !["user", "provider", "admin"].includes(
          credentials.role
        )
      ) {
        return next({
          code: 400,
          message: "Invalid account type.",
        });
      }

      // -----------------------------------------------------
      // Normalize phone number
      // -----------------------------------------------------

      const phone = credentials.phone.trim();

      // -----------------------------------------------------
      // Find user using phone AND role
      // -----------------------------------------------------

      const userDetail = await UserModel.findOne({
        phone: phone,
        role: credentials.role,
      });

      // -----------------------------------------------------
      // Check user
      // -----------------------------------------------------

      if (!userDetail) {
        return next({
          code: 404,
          message:
            "Invalid phone number, password, or account type.",
        });
      }

      // -----------------------------------------------------
      // Check password
      // -----------------------------------------------------

      const passwordMatch = await bcrypt.compare(
        credentials.password,
        userDetail.password
      );

      if (!passwordMatch) {
        return next({
          code: 401,
          message:
            "Invalid phone number or password.",
        });
      }

      // -----------------------------------------------------
      // Generate JWT token
      // -----------------------------------------------------

      const token = jwt.sign(
        {
          sub: userDetail._id.toString(),
          phone: userDetail.phone,
          role: userDetail.role,
          type: "Bearer",
        },
        Secrets.jwtSecret as string,
        {
          expiresIn: "180m",
        }
      );

      // -----------------------------------------------------
      // Send response
      // -----------------------------------------------------

      return res.json({
        data: {
          accessToken: token,

          user: {
            id: userDetail._id,
            fullname: userDetail.fullname,
            phone: userDetail.phone,
            role: userDetail.role,
          },
        },

        message: "Login Success",

        meta: null,
      });
    } catch (exception) {
      console.error("LOGIN ERROR:", exception);

      next(exception);
    }
  };

  // =========================================================
  // GET USER DETAIL BY ID
  // =========================================================

  getUserDetailById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const params = req.params;

      const userDetail = await UserModel.findById(
        params.userId,
        {
          password: 0,
          createdAt: 0,
          updatedAt: 0,
        }
      );

      if (!userDetail) {
        throw {
          code: 404,
          message: "User not found",
        };
      }

      return res.json({
        data: userDetail,
        message: "User Detail",
        meta: null,
      });
    } catch (exception) {
      next(exception);
    }
  };

  // =========================================================
  // GET LOGGED-IN USER DETAIL
  // =========================================================

  getLoggedInUserDetail(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const loggedInUser = req.loggedInUser;

      return res.json({
        data: {
          ...loggedInUser,

          image: loggedInUser?.image?.filename
            ? `${AppConfig.assetUrl}uploads/user/${loggedInUser.image.filename}`
            : null,
        },

        message: "User Detail",

        meta: null,
      });
    } catch (exception) {
      next(exception);
    }
  }
}

export default AuthController;