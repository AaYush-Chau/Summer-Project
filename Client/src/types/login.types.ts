
export type LoginInput = {
  phone: string;
  password: string;
  role: "user" | "provider" | "admin";
};

