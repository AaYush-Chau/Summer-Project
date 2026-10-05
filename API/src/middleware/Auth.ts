import {
  type NextFunction,
  type Response,
} from "express";

import Jwt from "jsonwebtoken";

import { Secrets } from "../config/app-env";

import UserModel from "../model/user-model";

import { AuthRequest } from "../types/Request";

const AuthCheck = (
  role: null | Array<string> = null
) => {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      let token =
        req.headers.authorization || null;

      // ==========================================
      // CHECK AUTHORIZATION TOKEN
      // ==========================================

      if (!token) {
        return next({
          code: 401,
          message: "Login required",
        });
      }

      // Remove "Bearer " from token
      token = token.replace("Bearer ", "");

      // ==========================================
      // VERIFY JWT TOKEN
      // ==========================================

      const data = Jwt.verify(
        token,
        Secrets.jwtSecret as string
      ) as Jwt.JwtPayload;

      // ==========================================
      // FIND USER
      // ==========================================

      const userDetail = await UserModel.findOne({
        _id: data.sub,
      });

      if (!userDetail) {
        return next({
          code: 404,
          message: "User not found",
        });
      }

      // ==========================================
      // STORE LOGGED-IN USER DETAILS
      // ==========================================

      req.loggedInUser = {
        id: userDetail.id as unknown as string,
        fullname: userDetail.fullname,
        phone: userDetail.phone,
        role: userDetail.role,
      };

      // ==========================================
      // CHECK USER ROLE
      // ==========================================

      // No specific role required
      // → Any authenticated user can continue
      if (!role) {
        return next();
      }

      // Specific role required
      // → User role must match one of the allowed roles
      if (role.includes(userDetail.role)) {
        return next();
      }

      // User is authenticated but does not have permission
      return next({
        code: 403,
        message: "Access Denied",
      });
    } catch (exception) {
      console.log(exception);

      // ==========================================
      // TOKEN EXPIRED
      // ==========================================

      if (exception instanceof Jwt.TokenExpiredError) {
        return next({
          code: 401,
          message: "Token expired",
        });
      }

      // ==========================================
      // INVALID JWT
      // ==========================================

      if (exception instanceof Jwt.JsonWebTokenError) {
        return next({
          code: 401,
          message:
            "JWT Error: " + exception.message,
        });
      }

      // ==========================================
      // OTHER ERRORS
      // ==========================================

      return next(exception);
    }
  };
};

export default AuthCheck;