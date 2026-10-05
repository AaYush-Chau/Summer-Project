import axios from "axios";

import type { LoginInput } from "../types/login.types";
import type { RegisterInput } from "../types/register.types";

const API_BASE_URL = "http://localhost:9005";

/* =========================
   LOGIN
========================= */

export const login = async (data: LoginInput) => {
  const phone = data.phone.startsWith("+977")
    ? data.phone
    : `+977${data.phone}`;

  const response = await axios.post(
    `${API_BASE_URL}/auth/login`,
    {
      phone,
      password: data.password,
      role: data.role,
    }
  );

  return response.data;
};

/* =========================
   REGISTER
========================= */

export const registerUser = async (data: RegisterInput) => {
  const phone = data.phone.startsWith("+977")
    ? data.phone
    : `+977${data.phone}`;

  const response = await axios.post(
    `${API_BASE_URL}/auth/register`,
    {
      fullname: data.fullname,
      phone,
      password: data.password,
      confirmPassword: data.confirmPassword,
      role: data.role,
    }
  );

  return response.data;
};