import { type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import ProfessionalModel from "../model/ProfessionModel";
import { Secrets } from "../config/app-env";

class ProfessionalController {
  // =========================================================
  // REGISTER
  // POST /professional/register
  // =========================================================

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
  
      if (!data.phone) {
        return next({ code: 400, message: "Phone number is required." });
      }
  
      if (data.password !== data.confirmPassword) {
        return next({
          code: 400,
          message: "Password and Confirm Password do not match",
        });
      }
  
      data.phone = data.phone.trim();
  
      const existing = await ProfessionalModel.findOne({ phone: data.phone });
  
      if (existing) {
        return next({
          code: 409,
          message: "Phone number is already registered.",
        });
      }
  
      data.password = bcrypt.hashSync(data.password, 12);
  
      if (req.file) {
        data.profileImage = {
          originalName: req.file.originalname,
          filename: req.file.filename,
          size: req.file.size,
          destination: req.file.destination,
        };
      }
  
      const professional = await ProfessionalModel.create(data);
  
      const token = jwt.sign(
        {
          sub: professional._id.toString(),
          phone: professional.phone,
          role: professional.role,
          type: "Bearer",
        },
        Secrets.jwtSecret as string,
        { expiresIn: "180 minutes" }
      );
  
      return res.status(201).json({
        data: {
          accessToken: token,
          professional,
        },
        message: "Registration Success",
        meta: null,
      });
    } catch (exception) {
      next(exception);
    }
  };

  // =========================================================
  // LOGIN
  // POST /professional/login
  // =========================================================

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { phone, password } = req.body;

      const professional = await ProfessionalModel.findOne({
        phone: phone.trim(),
      });

      if (!professional) {
        return next({
          code: 404,
          message: "Invalid phone number or password.",
        });
      }

      const passwordMatch = await bcrypt.compare(
        password,
        professional.password
      );

      if (!passwordMatch) {
        return next({
          code: 401,
          message: "Invalid phone number or password.",
        });
      }

      const token = jwt.sign(
        {
          sub: professional._id.toString(),
          phone: professional.phone,
          role: professional.role,
          type: "Bearer",
        },
        Secrets.jwtSecret as string,
        { expiresIn: "180 minutes" }
      );

      return res.json({
        data: { accessToken: token },
        message: "Login Success",
        meta: null,
      });
    } catch (exception) {
      next(exception);
    }
  };
}

export default ProfessionalController;