
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

import { RegisterSchema } from "../schemas/auth.schems";

import type { RegisterInput } from "../types/register.types";

import { registerUser } from "../api/auth.api";

export const RegisterForm = () => {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    defaultValues: {
      fullname: "",
      phone: "",
      password: "",
      confirmPassword: "",
      role: "user",
    },

    resolver: yupResolver(RegisterSchema),
  });

  const {
    mutate,
    isPending,
    isError,
  } = useMutation({
    mutationFn: registerUser,

    onSuccess: (response) => {
      console.log(
        "Registration response:",
        response
      );

      const token =
        response?.data?.accessToken;

      if (token) {
        localStorage.setItem(
          "access_token",
          token
        );
      }

      navigate("/login");
    },

    onError: (error: any) => {
      console.error(
        "Registration error:",
        error
      );

      console.log(
        "Backend response:",
        JSON.stringify(
          error?.response?.data,
          null,
          2
        )
      );
    },
  });

  const onSubmit: SubmitHandler<
    RegisterInput
  > = (formData) => {
    mutate(formData);
  };

  return (
    <div className="w-full max-w-md">

      {/* MEMBER REGISTRATION */}
      <div className="flex items-center gap-2 text-[#4B5566] text-xs font-mono uppercase tracking-widest mb-3">
        <MapPin size={13} />
        <span>Join NearPro</span>
      </div>

      {/* TITLE */}
      <h1 className="text-3xl font-bold text-[#16233B] mb-2 tracking-tight">
        Create your account
      </h1>

      <p className="text-sm text-gray-500 mb-8 leading-relaxed">
        Join NearPro and connect with trusted local
        service providers near you.
      </p>

      {/* ERROR */}
      {isError && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-600">
            Registration failed. Please check your
            information and try again.
          </p>
        </div>
      )}

      {/* FORM */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="space-y-5"
      >

        {/* FULL NAME */}
        <div>
          <label
            htmlFor="fullname"
            className="block text-sm font-medium text-[#16233B] mb-2"
          >
            Full name
          </label>

          <div
            className={`w-full h-11.5 rounded-lg border bg-white overflow-hidden transition-all duration-300 ${
              errors.fullname
                ? "border-red-500"
                : "border-gray-300 focus-within:border-[#16233B] focus-within:shadow-[0_0_0_3px_rgba(22,35,59,0.1)]"
            }`}
          >
            <input
              {...register("fullname")}
              id="fullname"
              type="text"
              autoComplete="name"
              placeholder="Enter your full name"
              className="w-full h-full px-3 bg-white text-[#16233B] text-sm placeholder:text-gray-400 outline-none"
            />
          </div>

          {errors.fullname?.message && (
            <p className="mt-1 text-xs text-red-500">
              {errors.fullname.message}
            </p>
          )}
        </div>

        {/* PHONE NUMBER */}
        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-[#16233B] mb-2"
          >
            Phone number
          </label>

          <div
            className="flex h-11 rounded-xl border border-gray-300 bg-white overflow-hidden focus-within:border-[#16233B] focus-within:ring-2 focus-within:ring-[#16233B]/10"
          >
            {/* Nepal country code */}
            <div className="flex items-center px-4 bg-gray-50 border-r border-gray-300 text-sm font-medium text-[#16233B]">
              +977
            </div>

            {/* Phone number */}
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

        {/* PASSWORD */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-[#16233B] mb-2"
          >
            Password
          </label>

          <div
            className={`relative w-full h-11.5 rounded-lg border bg-white overflow-hidden ${
              errors.password
                ? "border-red-500"
                : "border-gray-300 focus-within:border-[#16233B] focus-within:shadow-[0_0_0_3px_rgba(22,35,59,0.1)]"
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
              autoComplete="new-password"
              placeholder="••••••••"
              className="w-full h-full px-3 pr-12 bg-white text-[#16233B] text-sm placeholder:text-gray-400 outline-none"
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword(
                  (previous) => !previous
                )
              }
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-md text-gray-500 hover:text-[#16233B] hover:bg-gray-50"
              aria-label={
                showPassword
                  ? "Hide password"
                  : "Show password"
              }
            >
              {showPassword ? (
                <Eye size={18} />
              ) : (
                <EyeOff size={18} />
              )}
            </button>
          </div>

          {errors.password?.message && (
            <p className="mt-1 text-xs text-red-500">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* CONFIRM PASSWORD */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-[#16233B] mb-2"
          >
            Confirm password
          </label>

          <div
            className={`relative w-full h-11.5 rounded-lg border bg-white overflow-hidden ${
              errors.confirmPassword
                ? "border-red-500"
                : "border-gray-300 focus-within:border-[#16233B] focus-within:shadow-[0_0_0_3px_rgba(22,35,59,0.1)]"
            }`}
          >
            <input
              {...register("confirmPassword")}
              id="confirmPassword"
              type={
                showConfirmPassword
                  ? "text"
                  : "password"
              }
              autoComplete="new-password"
              placeholder="••••••••"
              className="w-full h-full px-3 pr-12 bg-white text-[#16233B] text-sm placeholder:text-gray-400 outline-none"
            />

            <button
              type="button"
              onClick={() =>
                setShowConfirmPassword(
                  (previous) => !previous
                )
              }
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-md text-gray-500 hover:text-[#16233B] hover:bg-gray-50"
              aria-label={
                showConfirmPassword
                  ? "Hide confirm password"
                  : "Show confirm password"
              }
            >
              {showConfirmPassword ? (
                <Eye size={18} />
              ) : (
                <EyeOff size={18} />
              )}
            </button>
          </div>

          {errors.confirmPassword?.message && (
            <p className="mt-1 text-xs text-red-500">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* ACCOUNT TYPE */}
        <div>
          <label className="block text-sm font-medium text-[#16233B] mb-2">
            Account type
          </label>

          <div className="grid grid-cols-2 gap-3">

            {/* CUSTOMER */}
            <label className="cursor-pointer">
              <input
                {...register("role")}
                type="radio"
                value="user"
                className="peer sr-only"
              />

              <div className="h-11 flex items-center justify-center rounded-lg border border-gray-300 text-sm text-gray-600 peer-checked:border-[#16233B] peer-checked:bg-[#16233B] peer-checked:text-white transition-all">
                Customer
              </div>
            </label>

            {/* SERVICE PROVIDER */}
            <label className="cursor-pointer">
              <input
                {...register("role")}
                type="radio"
                value="provider"
                className="peer sr-only"
              />

              <div className="h-11 flex items-center justify-center rounded-lg border border-gray-300 text-sm text-gray-600 peer-checked:border-[#16233B] peer-checked:bg-[#16233B] peer-checked:text-white transition-all">
                Service Provider
              </div>
            </label>

          </div>

          {errors.role?.message && (
            <p className="mt-1 text-xs text-red-500">
              {errors.role.message}
            </p>
          )}
        </div>

        {/* TERMS */}
        <label className="flex items-start gap-2 text-sm text-gray-500 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-[#16233B]"
          />

          <span>
            I agree to{" "}
            <Link
              to="#"
              className="text-[#16233B] font-medium hover:underline"
            >
              Terms & Conditions
            </Link>
          </span>
        </label>

        {/* REGISTER BUTTON */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full h-[46px] rounded-lg bg-[#16233B] text-white text-sm font-semibold transition-all duration-200 hover:bg-[#243754] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending
            ? "Creating account..."
            : "Create account"}
        </button>

      </form>

      {/* LOGIN LINK */}
      <p className="text-center text-sm text-gray-500 mt-8">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-semibold text-[#16233B] hover:text-[#F26B5E] transition-colors duration-200"
        >
          Sign in
        </Link>
      </p>

    </div>
  );
};
