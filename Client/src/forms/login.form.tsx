
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  useForm,
  type SubmitHandler,
} from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  Eye,
  EyeOff,
  MapPin,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";

import { LoginSchema } from "../schemas/auth.schems";
import type { LoginInput } from "../types/login.types";
import { login } from "../api/auth.api";
import { getProviderProfile } from "../api/provider.api";

export const LoginForm = () => {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] =
    useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    defaultValues: {
      phone: "",
      password: "",
      role: "user",
    },
    resolver: yupResolver(LoginSchema),
  });

  const {
    mutate,
    isPending,
    isError,
  } = useMutation({
    mutationFn: login,

    onSuccess: async (response) => {
      const token =
        response?.data?.accessToken;

      const user =
        response?.data?.user;

      // Save JWT
      if (token) {
        localStorage.setItem(
          "access_token",
          token
        );
      }

      // Save user details
      if (user) {
        localStorage.setItem(
          "user",
          JSON.stringify(user)
        );
      }

      // Admin
      if (user?.role === "admin") {
        navigate("/admin/dashboard");
        return;
      }

      // Customer
      if (user?.role === "user") {
        navigate("/");
        return;
      }

      // Service Provider
      if (user?.role === "provider") {
        try {
          // Check whether provider profile exists
          await getProviderProfile();

          // Profile exists
          navigate("/professional/dashboard");
        } catch (error: any) {
          // Profile does not exist
          if (error?.response?.status === 404) {
            navigate("/professional/profile");
            return;
          }

          console.error(
            "Provider profile check failed:",
            error
          );
        }
      }
    },

    onError: (error: any) => {
      console.error(
        "Login error:",
        error
      );
    },
  });

  const onSubmit: SubmitHandler<LoginInput> = (
    formData
  ) => {
    mutate(formData);
  };

  return (
    <div className="w-full max-w-md">

      {/* Header */}
      <div className="flex items-center gap-2 text-[#4B5566] text-xs font-mono uppercase tracking-widest mb-3">
        <MapPin size={13} />
        <span>NearPro</span>
      </div>

      {/* Title */}
      <h1 className="text-3xl font-bold text-[#16233B] mb-2 tracking-tight">
        Welcome back
      </h1>

      <p className="text-sm text-gray-500 mb-8 leading-relaxed">
        Sign in to your NearPro account and connect with local
        service providers.
      </p>

      {/* Error */}
      {isError && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-600">
            Invalid phone number, password, or account type.
          </p>
        </div>
      )}

      {/* Form */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="space-y-5"
      >

        {/* Phone */}
        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-[#16233B] mb-2"
          >
            Phone Number
          </label>

          <div
            className={`flex h-11 rounded-xl border bg-white overflow-hidden ${
              errors.phone
                ? "border-red-500"
                : "border-gray-300 focus-within:border-[#16233B] focus-within:ring-2 focus-within:ring-[#16233B]/10"
            }`}
          >
            <div className="flex items-center px-4 bg-gray-50 border-r border-gray-300 text-sm font-medium text-[#16233B]">
              +977
            </div>

            <input
              {...register("phone")}
              id="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="9812345678"
              maxLength={10}
              className="flex-1 h-full px-3 bg-white text-[#16233B] text-sm placeholder:text-gray-400 outline-none"
            />
          </div>

          {errors.phone?.message && (
            <p className="mt-1 text-xs text-red-500">
              {errors.phone.message}
            </p>
          )}
        </div>

        {/* Account Type */}
        <div>
          <label
            htmlFor="role"
            className="block text-sm font-medium text-[#16233B] mb-2"
          >
            Account Type
          </label>

          <select
            {...register("role")}
            id="role"
            className={`w-full h-11 px-4 rounded-xl border bg-white text-[#16233B] text-sm outline-none ${
              errors.role
                ? "border-red-500"
                : "border-gray-300 focus:border-[#16233B] focus:ring-2 focus:ring-[#16233B]/10"
            }`}
          >
            <option value="user">
              Customer
            </option>

            <option value="provider">
              Service Provider
            </option>

            <option value="admin">
              Admin
            </option>
          </select>

          {errors.role?.message && (
            <p className="mt-1 text-xs text-red-500">
              {errors.role.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-[#16233B] mb-2"
          >
            Password
          </label>

          <div
            className={`relative w-full h-11 rounded-xl border bg-white ${
              errors.password
                ? "border-red-500"
                : "border-gray-300 focus-within:border-[#16233B] focus-within:ring-2 focus-within:ring-[#16233B]/10"
            }`}
          >
            <input
              {...register("password")}
              id="password"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              autoComplete="current-password"
              placeholder="Enter your password"
              className="w-full h-full px-4 pr-11 rounded-xl bg-white text-[#16233B] text-sm placeholder:text-gray-400 outline-none"
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword(
                  (previous) => !previous
                )
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#16233B]"
              aria-label={
                showPassword
                  ? "Hide password"
                  : "Show password"
              }
            >
              {showPassword ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}
            </button>
          </div>

          {errors.password?.message && (
            <p className="mt-1 text-xs text-red-500">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Remember / Forgot */}
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-gray-500 cursor-pointer">
            <input
              type="checkbox"
              className="accent-[#16233B]"
            />
            Remember me
          </label>

          <button
            type="button"
            className="font-medium text-[#16233B] hover:text-[#F26B5E]"
          >
            Forgot password?
          </button>
        </div>

        {/* Sign In */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full h-11 rounded-xl bg-[#16233B] text-white font-semibold text-sm hover:bg-[#F26B5E] transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPending
            ? "Signing in..."
            : "Sign in"}
        </button>
      </form>

      {/* Register */}
      <p className="text-center text-sm text-gray-500 mt-8">
        Don't have an account?{" "}

        <Link
          to="/register"
          className="font-semibold text-[#16233B] hover:text-[#F26B5E] transition-colors duration-200"
        >
          Create account
        </Link>
      </p>

    </div>
  );
};

