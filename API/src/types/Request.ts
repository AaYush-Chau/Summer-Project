import type { Request } from "express";

export interface IUserDetail {
  id: string;
  fullname: string;
  phone: string;
  role: string;
  image?: {
    filename?: string;
  };
}

export interface AuthRequest extends Request {
  loggedInUser?: IUserDetail;
}
