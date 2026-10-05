
import * as yup from "yup";

export const LoginSchema = yup.object({
  phone: yup
    .string()
    .required("Phone number is required"),

  password: yup
    .string()
    .required("Password is required"),

  role: yup
    .mixed<"user" | "provider" | "admin">()
    .oneOf(
      ["user", "provider", "admin"],
      "Invalid account type"
    )
    .required("Account type is required"),
});

export const RegisterSchema = yup.object({
  fullname: yup
    .string()
    .required("Full name is required")
    .min(2, "Full name must be at least 2 characters"),

  phone: yup
    .string()
    .required("Phone number is required")
    .matches(
      /^(98|97)\d{8}$/,
      "Enter a valid Nepal phone number"
    ),

  password: yup
    .string()
    .required("Password is required")
    .min(8, "Password must be at least 8 characters"),

  confirmPassword: yup
    .string()
    .required("Please confirm your password")
    .oneOf(
      [yup.ref("password")],
      "Passwords do not match"
    ),

    role: yup
    .mixed<"user" | "provider" | "admin">()
    .oneOf(["user", "provider", "admin"])
    .required("Account type is required"),
});

