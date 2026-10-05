import z from "zod";

// =========================================================
// Nepal Phone Number Validation
// Format: +9779812345678
// =========================================================

const nepalPhoneSchema = z
  .string()
  .trim()
  .regex(
    /^\+9779\d{9}$/,
    "Enter a valid Nepal phone number (e.g. +9779812345678)"
  )
  .nonempty("Phone number Required");


  // =========================================================
  // Login Validator
  // =========================================================
  

export const LoginSchema = z.object({
  phone: nepalPhoneSchema,

  password: z
    .string()
    .nonempty("Password Required"),

    role: z
    .enum(["user", "provider", "admin"])
    .default("user"),
});



  

// =========================================================
// User Registration Validator
// =========================================================

export const UserRegisterSchema = z
  .object({
    fullname: z
      .string()
      .min(2, "Fullname must be at least 2 characters")
      .max(50, "Fullname must not exceed 50 characters")
      .nonempty("Fullname Required"),

    phone: nepalPhoneSchema,

    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .max(50, "Password must not exceed 50 characters")
      .regex(
        /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).+$/,
        "Password must contain uppercase, lowercase, number, and special character"
      )
      .nonempty("Strong Password Required"),

    confirmPassword: z
      .string()
      .nonempty("Confirm Password Required"),

    // birthDate: z.string().nonempty("Birth date Required"),

    // gender: z.string().nonempty("Gender Required"),

    // serviceCategory: z
    //   .string()
    //   .nonempty("Service category Required"),

    // servicesOffered: z
    //   .array(z.string())
    //   .min(1, "At least one service is required."),

    // priceRange: z
    //   .string()
    //   .nonempty("Price range Required"),

    // location: z
    //   .string()
    //   .nonempty("Location Required"),

    // experience: z
    //   .number()
    //   .min(0, "Experience cannot be negative."),

    // availability: z
    //   .enum(["available", "busy", "unavailable"])
    //   .optional(),
  })
  .refine(
    (data) => data.password === data.confirmPassword,
    {
      message: "Password and Confirm Password do not match",
      path: ["confirmPassword"],
    }
  );

// =========================================================
// Service Provider Validator
// =========================================================

// export const ProviderUpdateSchema = z.object({
//   fullname: z.string().min(2).max(50).optional(),
//
//   birthDate: z.string().optional(),
//
//   gender: z
//     .enum(["male", "female", "other"])
//     .optional(),
//
//   serviceCategory: z.string().optional(),
//
//   servicesOffered: z
//     .array(z.string())
//     .min(1, "At least one service is required.")
//     .optional(),
//
//   priceRange: z.string().optional(),
//
//   location: z.string().optional(),
//
//   experience: z
//     .string()
//     .min(1, "Experience Required"),
//
//   phone: z.string().optional(),
//
//   availability: z
//     .enum(["available", "busy", "unavailable"])
//     .optional(),
// });

// seeder run