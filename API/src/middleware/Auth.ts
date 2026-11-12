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
      const authHeader = req.headers.authorization;

      // ==========================================
      // CHECK AUTHORIZATION HEADER FORMAT
      // ==========================================
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return next({
          code: 401,
          message: "Login required or invalid authorization format",
        });
      }

      // Safely extract the token after "Bearer "
      const token = authHeader.split(" ")[1];

      if (!token || token === "undefined" || token === "null") {
        return next({
          code: 401,
          message: "Token is missing or invalid",
        });
      }

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
      if (!role) {
        return next();
      }

      if (role.includes(userDetail.role)) {
        return next();
      }

      return next({
        code: 403,
        message: "Access Denied",
      });
    } catch (exception) {
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
      // INVALID JWT / MALFORMED
      // ==========================================
      if (exception instanceof Jwt.JsonWebTokenError) {
        return next({
          code: 401,
          message: "JWT Error: " + exception.message,
        });
      }

      // ==========================================
      // OTHER UNEXPECTED ERRORS
      // ==========================================
      console.error("Unexpected Auth Middleware Error:", exception);
      return next(exception);
    }
  };
};

export default AuthCheck;