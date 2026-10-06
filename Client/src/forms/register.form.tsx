import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import { Link, useNavigate } from "react-router-dom";

import {
  useForm,
  type SubmitHandler,
  type UseFormRegisterReturn,
} from "react-hook-form";

import { yupResolver } from "@hookform/resolvers/yup";

import {
  Eye,
  EyeOff,
  MapPin,
  ArrowRight,
  AlertCircle,
  Check,
  UserRound,
  Wrench,
  Home,
  ShieldCheck,
} from "lucide-react";

import { useMutation } from "@tanstack/react-query";

import { RegisterSchema } from "../schemas/auth.schems";

import type { RegisterInput } from "../types/register.types";

import { registerUser } from "../api/auth.api";

/* ------------------------------------------------------------------ */
/*  UI-only helpers                                                    */
/* ------------------------------------------------------------------ */

const labelClass = "mb-2 block text-sm font-medium text-[#16233B]";

const fieldShell = (hasError: boolean) =>
  `h-12 w-full overflow-hidden rounded-xl border bg-white transition-all duration-200 ${
    hasError
      ? "border-red-500"
      : "border-gray-200 focus-within:border-[#16233B] focus-within:ring-2 focus-within:ring-[#16233B]/10"
  }`;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-500">{message}</p>;
}

// Password input with a show/hide toggle (same behaviour as before)
function PasswordField({
  id,
  label,
  registration,
  visible,
  onToggle,
  toggleLabel,
  error,
}: {
  id: string;
  label: string;
  registration: UseFormRegisterReturn;
  visible: boolean;
  onToggle: () => void;
  toggleLabel: string;
  error?: string;
}) {
  return (
    <>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>

      <div className={`relative ${fieldShell(!!error)}`}>
        <input
          {...registration}
          id={id}
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          placeholder="••••••••"
          className="h-full w-full bg-transparent px-4 pr-12 text-sm text-[#16233B] outline-none placeholder:text-gray-400"
        />

        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-gray-500 transition-colors duration-200 hover:bg-gray-100 hover:text-[#F26B5E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16233B]/30"
          aria-label={toggleLabel}
        >
          {visible ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>
      </div>

      <FieldError message={error} />
    </>
  );
}

// Selectable card driven by the real radio input (peer)
function RoleCard({
  registration,
  value,
  icon,
  title,
  description,
}: {
  registration: UseFormRegisterReturn;
  value: string;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <label className="cursor-pointer">
      <input
        {...registration}
        type="radio"
        value={value}
        className="peer sr-only"
      />

      <div className="relative flex h-full flex-col items-center gap-1.5 rounded-2xl border border-gray-200 bg-white px-3 py-4 text-center text-gray-600 transition-all duration-300 hover:border-[#16233B]/40 peer-checked:scale-[1.02] peer-checked:border-[#16233B] peer-checked:bg-[#16233B] peer-checked:text-white peer-checked:shadow-lg peer-checked:[&_.role-check]:opacity-100 peer-checked:[&_.role-desc]:text-gray-300 peer-checked:[&_.role-icon]:bg-[#E3A73A]/20 peer-checked:[&_.role-icon]:text-[#E3A73A] peer-focus-visible:ring-2 peer-focus-visible:ring-[#E3A73A] peer-focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:peer-checked:scale-100">
        <span className="role-check absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#E3A73A] text-[#16233B] opacity-0 transition-opacity duration-300">
          <Check size={10} strokeWidth={3} />
        </span>

        <span className="role-icon flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7F4EE] text-[#16233B] transition-colors duration-300">
          {icon}
        </span>

        <span className="text-sm font-semibold">{title}</span>
        <span className="role-desc text-xs text-gray-400 transition-colors duration-300">
          {description}
        </span>
      </div>
    </label>
  );
}

/* ------------------------------------------------------------------ */
/*  Form                                                               */
/* ------------------------------------------------------------------ */

export const RegisterForm = () => {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
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
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#E3A73A]/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-[#F26B5E]/15 blur-3xl" />
        <div className="absolute left-1/3 top-10 h-40 w-40 rounded-full border border-[#16233B]/10" />
        <div className="absolute bottom-16 right-1/4 h-24 w-24 rounded-full border border-[#E3A73A]/25" />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-12 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:gap-16">
        {/* Desktop visual (CSS only) */}
        <div aria-hidden {...rv(0, "relative hidden lg:block")}>
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
                  Join · Connect · Grow
                </p>

                <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight">
                  Trusted local services, made simple.
                </h2>

                <p className="mt-3 text-sm leading-6 text-gray-300">
                  Whether you need help or offer it, GharSewa connects you with
                  people right around the corner.
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

        {/* Registration card */}
        <div
          {...rv(
            100,
            "mx-auto w-full max-w-[480px] rounded-3xl border border-[#16233B]/10 bg-white p-6 shadow-[0_1px_2px_rgba(22,35,59,0.04),0_24px_60px_-20px_rgba(22,35,59,0.22)] sm:p-8"
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

          {/* TITLE */}
          <div {...rv(300, "mt-7")}>
            <h1 className="text-3xl font-bold tracking-tight text-[#16233B]">
              Create your account
            </h1>

            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              Join GharSewa and connect with trusted professionals for the
              services you need.
            </p>
          </div>

          {/* ERROR */}
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
                  Unable to create your account
                </p>
                <p className="mt-0.5 text-xs text-red-600">
                  Please check your information and try again.
                </p>
              </div>
            </div>
          )}

          {/* FORM */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="mt-7 space-y-5"
          >

            {/* FULL NAME */}
            <div {...rv(400)}>
              <label htmlFor="fullname" className={labelClass}>
                Full name
              </label>

              <div className={fieldShell(!!errors.fullname)}>
                <input
                  {...register("fullname")}
                  id="fullname"
                  type="text"
                  autoComplete="name"
                  placeholder="Enter your full name"
                  className="h-full w-full bg-white px-4 text-sm text-[#16233B] outline-none placeholder:text-gray-400"
                />
              </div>

              <FieldError message={errors.fullname?.message} />
            </div>

            {/* PHONE NUMBER */}
            <div {...rv(460)}>
              <label htmlFor="phone" className={labelClass}>
                Phone number
              </label>

              <div
                className={`flex ${fieldShell(!!errors.phone)}`}
              >
                {/* Nepal country code */}
                <div className="flex items-center border-r border-gray-200 bg-[#F7F4EE] px-4 text-sm font-semibold text-[#16233B]">
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
                  className="h-full flex-1 bg-white px-3 text-sm text-[#16233B] outline-none placeholder:text-gray-400"
                />
              </div>

              <FieldError message={errors.phone?.message} />
            </div>

            {/* PASSWORD */}
            <div {...rv(520)}>
              <PasswordField
                id="password"
                label="Password"
                registration={register("password")}
                visible={showPassword}
                onToggle={() =>
                  setShowPassword((previous) => !previous)
                }
                toggleLabel={
                  showPassword ? "Hide password" : "Show password"
                }
                error={errors.password?.message}
              />
            </div>

            {/* CONFIRM PASSWORD */}
            <div {...rv(580)}>
              <PasswordField
                id="confirmPassword"
                label="Confirm password"
                registration={register("confirmPassword")}
                visible={showConfirmPassword}
                onToggle={() =>
                  setShowConfirmPassword((previous) => !previous)
                }
                toggleLabel={
                  showConfirmPassword
                    ? "Hide confirm password"
                    : "Show confirm password"
                }
                error={errors.confirmPassword?.message}
              />
            </div>

            {/* ACCOUNT TYPE */}
            <fieldset {...rv(640)}>
              <legend className={labelClass}>Account type</legend>

              <div className="grid grid-cols-2 gap-3">
                <RoleCard
                  registration={register("role")}
                  value="user"
                  icon={<UserRound size={20} />}
                  title="Customer"
                  description="Find local services"
                />

                <RoleCard
                  registration={register("role")}
                  value="provider"
                  icon={<Wrench size={20} />}
                  title="Service Provider"
                  description="Offer your services"
                />
              </div>

              <FieldError message={errors.role?.message} />
            </fieldset>

            {/* TERMS */}
            <label
              {...rv(
                700,
                "group flex cursor-pointer items-start gap-2.5 text-sm text-gray-500"
              )}
            >
              <input type="checkbox" className="peer sr-only" />

              <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border border-gray-300 bg-white text-[#E3A73A] transition-all duration-200 group-hover:border-[#16233B] peer-checked:border-[#16233B] peer-checked:bg-[#16233B] peer-checked:[&>svg]:opacity-100 peer-focus-visible:ring-2 peer-focus-visible:ring-[#16233B]/30">
                <Check
                  size={13}
                  strokeWidth={3}
                  className="opacity-0 transition-opacity duration-200"
                />
              </span>

              <span>
                I agree to{" "}
                <Link
                  to="#"
                  className="font-medium text-[#16233B] transition-colors duration-200 hover:text-[#F26B5E] hover:underline"
                >
                  Terms & Conditions
                </Link>
              </span>
            </label>

            {/* REGISTER BUTTON */}
            <div {...rv(760)}>
              <button
                type="submit"
                disabled={isPending}
                className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#16233B] to-[#243754] text-sm font-semibold text-white shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_12px_28px_-10px_rgba(242,107,94,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                {isPending ? (
                  "Creating account..."
                ) : (
                  <>
                    Create account
                    <ArrowRight
                      size={18}
                      className="text-[#E3A73A] transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                    />
                  </>
                )}
              </button>
            </div>

          </form>

          {/* LOGIN LINK */}
          <p {...rv(820, "mt-8 text-center text-sm text-gray-500")}>
            Already have an account?{" "}
            <Link
              to="/login"
              className="group inline-flex items-center gap-1 rounded font-semibold text-[#16233B] transition-colors duration-200 hover:text-[#F26B5E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F26B5E]/40"
            >
              Sign in
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