import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
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
  ArrowRight,
  AlertCircle,
  Check,
  ChevronDown,
  Home,
  Wrench,
  ShieldCheck,
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

  // UI only: drives the entrance animation
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

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

  // Fade-up helper with stagger delay (ms)
  const rv = (delay: number, extra = "") => ({
    style: { transitionDelay: `${delay}ms` } as CSSProperties,
    className: `transition-all duration-700 ease-out motion-reduce:transition-none ${
      mounted
        ? "translate-y-0 opacity-100"
        : "translate-y-5 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100"
    } ${extra}`,
  });

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#F7F4EE] to-white">
      {/* Local keyframes */}
      <style>{`
        @keyframes gs-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
        .gs-float { animation: gs-float 6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .gs-float { animation: none; } }
      `}</style>

      {/* Background decoration */}
      <div
        className={`pointer-events-none absolute inset-0 transition-opacity duration-1000 motion-reduce:transition-none ${
          mounted ? "opacity-100" : "opacity-0"
        }`}
      >
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(rgba(22,35,59,0.07) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-[#E3A73A]/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-[#F26B5E]/15 blur-3xl" />
        <div className="absolute right-1/3 top-10 h-40 w-40 rounded-full border border-[#16233B]/10" />
        <div className="absolute bottom-16 left-1/4 h-24 w-24 rounded-full border border-[#E3A73A]/25" />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-12 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:gap-16">
        {/* Desktop visual (CSS only) */}
        <div
          aria-hidden
          {...rv(0, "relative hidden lg:block")}
        >
          <div className="relative mx-auto max-w-md">
            <div className="gs-float absolute -left-6 -top-6 h-14 w-14 rounded-full bg-[#E3A73A] shadow-lg" />
            <div
              className="gs-float absolute -bottom-5 -right-4 h-10 w-10 rounded-full bg-[#F26B5E] shadow-lg"
              style={{ animationDelay: "-3s" }}
            />

            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#16233B] to-[#0F172A] p-8 text-white shadow-2xl">
              <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#E3A73A]/20 blur-3xl" />
              <div className="absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-[#F26B5E]/15 blur-3xl" />

              <div className="relative">
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#E3A73A]">
                  <MapPin size={14} />
                  Local · Trusted · Simple
                </p>

                <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight">
                  Trusted local services, made simple.
                </h2>

                <p className="mt-3 text-sm leading-6 text-gray-300">
                  Connect with verified professionals right around the corner.
                </p>

                {/* Home → Service → Professional */}
                <div className="relative mt-10">
                  <div className="absolute left-[16%] right-[16%] top-6 border-t-2 border-dashed border-white/20" />
                  <div className="relative grid grid-cols-3 text-center">
                    {[
                      { icon: Home, label: "Home", bg: "bg-[#E3A73A] text-[#16233B]" },
                      { icon: Wrench, label: "Service", bg: "bg-[#F26B5E] text-white" },
                      { icon: ShieldCheck, label: "Trusted Pro", bg: "bg-white text-[#16233B]" },
                    ].map(({ icon: Icon, label, bg }) => (
                      <div key={label} className="flex flex-col items-center gap-2">
                        <span
                          className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg ring-4 ring-[#16233B] ${bg}`}
                        >
                          <Icon size={22} />
                        </span>
                        <span className="text-xs font-medium text-gray-300">
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Login card */}
        <div
          {...rv(
            100,
            "mx-auto w-full max-w-[460px] rounded-3xl border border-[#16233B]/10 bg-white p-6 shadow-[0_1px_2px_rgba(22,35,59,0.04),0_24px_60px_-20px_rgba(22,35,59,0.22)] sm:p-8"
          )}
        >
          {/* Branding */}
          <div {...rv(200)}>
            <Link
              to="/"
              className="group inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#16233B] text-[#E3A73A] shadow-sm transition-transform duration-300 group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100">
                <MapPin size={18} />
              </span>
              <span className="text-2xl font-extrabold tracking-tight text-[#16233B]">
                Ghar<span className="text-[#E3A73A]">Sewa</span>
              </span>
            </Link>

            <p className="mt-2 text-xs text-gray-500">
              Trusted services, right around the corner.
            </p>
          </div>

          {/* Title */}
          <div {...rv(300, "mt-7")}>
            <h1 className="text-3xl font-bold tracking-tight text-[#16233B]">
              Welcome back
            </h1>

            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              Sign in to find trusted professionals and manage your GharSewa
              services.
            </p>
          </div>

          {/* Error */}
          {isError && (
            <div
              role="alert"
              className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
            >
              <AlertCircle
                size={18}
                className="mt-0.5 shrink-0 text-red-500"
              />
              <div>
                <p className="text-sm font-semibold text-red-700">
                  Unable to sign in
                </p>
                <p className="mt-0.5 text-xs text-red-600">
                  Please check your phone number, password, and account type.
                </p>
              </div>
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="mt-7 space-y-5"
          >

            {/* Phone */}
            <div {...rv(400)}>
              <label
                htmlFor="phone"
                className="mb-2 block text-sm font-medium text-[#16233B]"
              >
                Phone Number
              </label>

              <div
                className={`flex h-12 overflow-hidden rounded-xl border bg-white transition-all duration-200 ${
                  errors.phone
                    ? "border-red-500"
                    : "border-gray-200 focus-within:border-[#16233B] focus-within:ring-2 focus-within:ring-[#16233B]/10"
                }`}
              >
                <div className="flex items-center border-r border-gray-200 bg-[#F7F4EE] px-4 text-sm font-semibold text-[#16233B]">
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
                  className="h-full flex-1 bg-white px-3 text-sm text-[#16233B] outline-none placeholder:text-gray-400"
                />
              </div>

              {errors.phone?.message && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.phone.message}
                </p>
              )}
            </div>

            {/* Account Type */}
            <div {...rv(480)}>
              <label
                htmlFor="role"
                className="mb-2 block text-sm font-medium text-[#16233B]"
              >
                Account Type
              </label>

              <div className="relative">
                <select
                  {...register("role")}
                  id="role"
                  className={`h-12 w-full cursor-pointer appearance-none rounded-xl border bg-white px-4 pr-11 text-sm text-[#16233B] outline-none transition-all duration-200 ${
                    errors.role
                      ? "border-red-500"
                      : "border-gray-200 focus:border-[#16233B] focus:ring-2 focus:ring-[#16233B]/10"
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

                <ChevronDown
                  size={18}
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                />
              </div>

              {errors.role?.message && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.role.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div {...rv(560)}>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-[#16233B]"
              >
                Password
              </label>

              <div
                className={`relative h-12 w-full rounded-xl border bg-white transition-all duration-200 ${
                  errors.password
                    ? "border-red-500"
                    : "border-gray-200 focus-within:border-[#16233B] focus-within:ring-2 focus-within:ring-[#16233B]/10"
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
                  className="h-full w-full rounded-xl bg-transparent px-4 pr-12 text-sm text-[#16233B] outline-none placeholder:text-gray-400"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (previous) => !previous
                    )
                  }
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-gray-500 transition-colors duration-200 hover:bg-gray-100 hover:text-[#16233B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16233B]/30"
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
            <div {...rv(640, "flex items-center justify-between text-sm")}>
              <label className="group flex cursor-pointer items-center gap-2 text-gray-500">
                <input
                  type="checkbox"
                  className="peer sr-only"
                />
                <span className="flex h-[18px] w-[18px] items-center justify-center rounded-md border border-gray-300 bg-white text-[#E3A73A] transition-all duration-200 group-hover:border-[#16233B] peer-checked:border-[#16233B] peer-checked:bg-[#16233B] peer-checked:[&>svg]:opacity-100 peer-focus-visible:ring-2 peer-focus-visible:ring-[#16233B]/30">
                  <Check
                    size={13}
                    strokeWidth={3}
                    className="opacity-0 transition-opacity duration-200"
                  />
                </span>
                Remember me
              </label>

              <button
                type="button"
                className="rounded font-medium text-[#16233B] transition-colors duration-200 hover:text-[#F26B5E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F26B5E]/40"
              >
                Forgot password?
              </button>
            </div>

            {/* Sign In */}
            <div {...rv(720)}>
              <button
                type="submit"
                disabled={isPending}
                className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#16233B] to-[#0F172A] text-sm font-semibold text-white shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-10px_rgba(242,107,94,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                {isPending ? (
                  "Signing in..."
                ) : (
                  <>
                    Sign in
                    <ArrowRight
                      size={18}
                      className="text-[#E3A73A] transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                    />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Register */}
          <p
            {...rv(800, "mt-8 text-center text-sm text-gray-500")}
          >
            Don't have an account?{" "}

            <Link
              to="/register"
              className="group inline-flex items-center gap-1 rounded font-semibold text-[#16233B] transition-colors duration-200 hover:text-[#F26B5E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F26B5E]/40"
            >
              Create account
              <ArrowRight
                size={15}
                className="transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
              />
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};