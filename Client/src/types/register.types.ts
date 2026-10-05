
export type RegisterInput = {
  fullname: string;
  phone: string;
  password: string;
  confirmPassword: string;
  role: "user" | "provider" |"admin";
};

