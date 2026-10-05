import {
  type Request,
  type Response,
  type NextFunction
} from "express";

export const Errorhandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const code =
    typeof error.code === "number" &&
    error.code >= 100 &&
    error.code < 600
      ? error.code
      : 500;

  const detail = error.details || error.detail || null;

  const message = error.message || "Internal App Error";
  
  res.status(code).json({
    error: detail,
    message: message,
    status: false,
  });
};