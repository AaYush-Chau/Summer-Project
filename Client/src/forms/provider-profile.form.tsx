import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";

import { createProviderProfile } from "../api/provider.api";

/* ---------- Inline icons (no extra dependencies) ---------- */
type IconProps = { className?: string };

const baseIcon = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const MailIcon = ({ className }: IconProps) => (
  <svg {...baseIcon} className={className}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>
);

const CalendarIcon = ({ className }: IconProps) => (
  <svg {...baseIcon} className={className}>
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

const WrenchIcon = ({ className }: IconProps) => (
  <svg {...baseIcon} className={className}>
    <path d="M14.7 6.3a4 4 0 0 0 5 5L21 12.6a2 2 0 0 1 0 2.8l-5.6 5.6a2 2 0 0 1-2.8 0l-9.6-9.6a2 2 0 0 1 0-2.8L8.6 3a2 2 0 0 1 2.8 0z" />
  </svg>
);

const BriefcaseIcon = ({ className }: IconProps) => (
  <svg {...baseIcon} className={className}>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18" />
  </svg>
);

const WalletIcon = ({ className }: IconProps) => (
  <svg {...baseIcon} className={className}>
    <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2H5" />
    <circle cx="16.5" cy="14" r="1" />
  </svg>
);

const ChevronDownIcon = ({ className }: IconProps) => (
  <svg {...baseIcon} className={className}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const CameraIcon = ({ className }: IconProps) => (
  <svg {...baseIcon} className={className}>
    <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);

const UploadIcon = ({ className }: IconProps) => (
  <svg {...baseIcon} className={className}>
    <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />
  </svg>
);

const AlertIcon = ({ className }: IconProps) => (
  <svg {...baseIcon} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v5M12 16.5v.01" />
  </svg>
);

const CheckCircleIcon = ({ className }: IconProps) => (
  <svg {...baseIcon} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12.5 2.5 2.5 4.5-5" />
  </svg>
);

const XIcon = ({ className }: IconProps) => (
  <svg {...baseIcon} className={className}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

const ShieldCheckIcon = ({ className }: IconProps) => (
  <svg {...baseIcon} className={className}>
    <path d="M12 3 5 6v5c0 4.5 3 8.2 7 10 4-1.8 7-5.5 7-10V6z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

/* ---------- Validation (pure, client-side only) ---------- */
type FieldName =
  | "email"
  | "dob"
  | "service"
  | "experience"
  | "price"
  | "profileImage";

type FormErrors = Partial<Record<FieldName, string>>;

const FIELD_ORDER: FieldName[] = [
  "email",
  "dob",
  "service",
  "experience",
  "price",
  "profileImage",
];

const SERVICE_VALUES = ["plumber", "electrician", "cleaner", "painter"];
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/jpg"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MIN_AGE = 18;
const MAX_EXPERIENCE = 50;
const MIN_PRICE = 1;
const MAX_PRICE = 1_000_000;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const pad = (n: number) => String(n).padStart(2, "0");

const todayString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate()
  )}`;
};

const validateEmail = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "Please enter your email address.";
  if (!EMAIL_REGEX.test(trimmed))
    return "Please enter a valid email address.";
};

const validateDob = (value: string) => {
  if (!value) return "Please select your date of birth.";

  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return "Please select your date of birth.";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const birth = new Date(y, m - 1, d);

  if (birth > today) return "Date of birth cannot be in the future.";

  // Date the person turns 18 — computed from today, never hardcoded.
  const eighteenth = new Date(y + MIN_AGE, m - 1, d);
  if (eighteenth > today)
    return "You must be at least 18 years old to create a professional profile.";
};

const validateService = (value: string) => {
  if (!SERVICE_VALUES.includes(value))
    return "Please select your primary service.";
};

const validateExperience = (value: string) => {
  if (value.trim() === "") return "Please enter your years of experience.";
  const n = Number(value);
  if (Number.isNaN(n) || !Number.isFinite(n))
    return "Please enter a valid number of years.";
  if (n < 0) return "Experience cannot be negative.";
  if (!Number.isInteger(n)) return "Please enter a valid number of years.";
  if (n > MAX_EXPERIENCE) return "Experience cannot exceed 50 years.";
};

const validatePrice = (value: string) => {
  if (value.trim() === "") return "Please enter your starting price.";
  const n = Number(value);
  if (Number.isNaN(n) || !Number.isFinite(n))
    return "Please enter a valid price.";
  if (n < MIN_PRICE) return "Price must be greater than 0.";
  if (n > MAX_PRICE) return "Please enter a reasonable starting price.";
};

const validateImage = (file: File | null) => {
  if (!file) return; // optional
  if (!file.type.startsWith("image/"))
    return "Please select a valid image file.";
  if (!ALLOWED_IMAGE_TYPES.includes(file.type))
    return "Only JPG and PNG images are allowed.";
  if (file.size > MAX_IMAGE_BYTES)
    return "Profile image must be smaller than 5MB.";
};

/* ---------- Shared styles ---------- */
const inputBase =
  "w-full h-12 pl-11 pr-11 rounded-xl border text-sm text-[#16233B] placeholder:text-gray-400 outline-none transition-all duration-200 focus:ring-4";

const inputOk =
  "border-gray-200 bg-white hover:border-gray-300 focus:border-[#16233B] focus:bg-[#FBFAF7] focus:ring-[#16233B]/10";

const inputBad =
  "border-red-300 bg-red-50/60 hover:border-red-400 focus:border-red-500 focus:ring-red-500/10";

const labelClass = "block text-sm font-semibold text-[#16233B] mb-2";

const helperClass = "mt-1.5 text-xs text-[#6B7280]";

const leftIconClass =
  "pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 transition-all duration-200 group-focus-within:scale-110 group-hover:scale-110";

const iconTone = (hasError: boolean) =>
  hasError
    ? "text-red-400"
    : "text-[#6B7280] group-focus-within:text-[#16233B]";

const ValidTick = () => (
  <CheckCircleIcon className="gs-msg pointer-events-none absolute right-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-emerald-500" />
);

const FieldError = ({ id, message }: { id: string; message: string }) => (
  <p
    id={id}
    role="alert"
    className="gs-msg mt-1.5 flex items-start gap-1.5 text-xs font-medium text-red-600"
  >
    <AlertIcon className="mt-px h-3.5 w-3.5 shrink-0" />
    <span>{message}</span>
  </p>
);

export const ProviderProfileForm = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [service, setService] = useState("plumber");
  const [experience, setExperience] = useState("");
  const [price, setPrice] = useState("");
  const [profileImage, setProfileImage] =
    useState<File | null>(null);

  // Validation UI state (client-side only)
  const [touched, setTouched] = useState<
    Partial<Record<FieldName, boolean>>
  >({});
  const [submitted, setSubmitted] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutate, isPending, isError, error } = useMutation({
    mutationFn: createProviderProfile,

    onSuccess: () => {
      navigate("/professional/dashboard");
    },
  });

  // Small image preview (only for valid image files)
  useEffect(() => {
    if (profileImage && profileImage.type.startsWith("image/")) {
      const url = URL.createObjectURL(profileImage);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [profileImage]);

  // Errors are derived from current values on every render.
  const errors: FormErrors = {
    email: validateEmail(email),
    dob: validateDob(dob),
    service: validateService(service),
    experience: validateExperience(experience),
    price: validatePrice(price),
    profileImage: validateImage(profileImage),
  };

  const touch = (field: FieldName) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  // Only show an error after interaction, or after a submit attempt.
  const shown = (field: FieldName) =>
    touched[field] || submitted ? errors[field] : undefined;

  const isValidShown = (field: FieldName, hasValue: boolean) =>
    (touched[field] || submitted) && hasValue && !errors[field];

  const describedBy = (field: FieldName, helperId?: string) => {
    const ids = [];
    if (helperId && !shown(field)) ids.push(helperId);
    if (shown(field)) ids.push(`${field}-error`);
    return ids.length ? ids.join(" ") : undefined;
  };

  const handleRemoveImage = () => {
    setProfileImage(null);
    touch("profileImage");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);

    const firstInvalid = FIELD_ORDER.find((field) => errors[field]);

    if (firstInvalid) {
      const el = document.getElementById(firstInvalid);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.focus({ preventScroll: true });
      return;
    }

    const formData = new FormData();

    formData.append("email", email.trim());
    formData.append("dob", dob);
    formData.append("service", service);
    formData.append("experience", experience);
    formData.append("price", price);

    if (profileImage) {
      formData.append("profileImage", profileImage);
    }

    mutate(formData);
  };

  const emailError = shown("email");
  const dobError = shown("dob");
  const serviceError = shown("service");
  const experienceError = shown("experience");
  const priceError = shown("price");
  const imageError = shown("profileImage");

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F7F4EE] px-4 py-8 sm:py-14">
      {/* Local keyframes (CSS only) */}
      <style>{`
        @keyframes gs-rise {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes gs-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes gs-msg {
          from { opacity: 0; transform: translateY(-3px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .gs-card   { animation: gs-rise 0.6s ease-out both; }
        .gs-header { animation: gs-fade 0.7s ease-out 0.15s both; }
        .gs-step   { animation: gs-rise 0.5s ease-out both; }
        .gs-msg    { animation: gs-msg 0.2s ease-out both; }
        .gs-no-spin::-webkit-outer-spin-button,
        .gs-no-spin::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .gs-no-spin { -moz-appearance: textfield; appearance: textfield; }
        @media (prefers-reduced-motion: reduce) {
          .gs-card, .gs-header, .gs-step, .gs-msg { animation: none; }
        }
      `}</style>

      {/* Decorative background shapes */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-[#E3A73A]/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 -right-20 h-72 w-72 rounded-full bg-[#F26B5E]/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[8%] top-16 hidden h-24 w-24 rounded-[2rem] border border-[#16233B]/5 md:block"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-24 left-[6%] hidden h-14 w-14 rounded-full border border-[#E3A73A]/20 md:block"
      />

      <div className="gs-card relative mx-auto w-full max-w-[960px] rounded-3xl border border-gray-100 bg-white p-6 shadow-xl shadow-[#16233B]/5 sm:p-10 lg:p-12">
        <form onSubmit={handleSubmit} noValidate className="space-y-7">
          {/* Header */}
          <div className="gs-header">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#E3A73A]/30 bg-[#E3A73A]/10 px-3 py-1 text-[11px] font-semibold tracking-wider text-[#16233B]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#E3A73A]" />
              GHARSEWA PROFESSIONAL
            </span>

            <h1 className="mt-4 text-2xl font-bold text-[#16233B] sm:text-3xl">
              Complete Your Professional Profile
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#6B7280] sm:text-base">
              Tell customers about your experience and services so
              they can confidently choose you.
            </p>

            {/* Visual-only progress indicator */}
            <div
              aria-hidden="true"
              className="mt-6 flex items-center gap-3 text-xs font-medium"
            >
              <span className="flex items-center gap-2 text-[#16233B]">
                <span className="h-3 w-3 rounded-full bg-[#16233B] ring-4 ring-[#16233B]/10" />
                Profile Details
              </span>
              <span className="h-px max-w-[180px] flex-1 bg-gradient-to-r from-[#16233B]/60 to-gray-200" />
              <span className="flex items-center gap-2 text-gray-400">
                <span className="h-3 w-3 rounded-full border-2 border-gray-300" />
                Ready to Work
              </span>
            </div>
          </div>

          {/* API error */}
          {isError && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
            >
              <AlertIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
              <p className="text-sm text-red-700">
                {(error as any)?.response?.data?.message ||
                  "Unable to create your professional profile."}
              </p>
            </div>
          )}

          {/* Email */}
          <div className="gs-step" style={{ animationDelay: "0.2s" }}>
            <label htmlFor="email" className={labelClass}>
              Email Address
            </label>

            <div className="group relative">
              <MailIcon
                className={`${leftIconClass} ${iconTone(!!emailError)}`}
              />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                onBlur={() => touch("email")}
                placeholder="Enter your professional email"
                required
                aria-invalid={!!emailError}
                aria-describedby={describedBy("email")}
                className={`${inputBase} ${
                  emailError ? inputBad : inputOk
                }`}
              />
              {isValidShown("email", email.trim() !== "") && (
                <ValidTick />
              )}
            </div>
            {emailError && (
              <FieldError id="email-error" message={emailError} />
            )}
          </div>

          {/* DOB + Service */}
          <div
            className="gs-step grid gap-6 sm:grid-cols-2"
            style={{ animationDelay: "0.28s" }}
          >
            <div>
              <label htmlFor="dob" className={labelClass}>
                Date of Birth
              </label>

              <div className="group relative">
                <CalendarIcon
                  className={`${leftIconClass} ${iconTone(!!dobError)}`}
                />
                <input
                  id="dob"
                  type="date"
                  value={dob}
                  max={todayString()}
                  onChange={(event) =>
                    setDob(event.target.value)
                  }
                  onBlur={() => touch("dob")}
                  required
                  aria-invalid={!!dobError}
                  aria-describedby={describedBy("dob", "dob-help")}
                  className={`${inputBase} ${
                    dobError ? inputBad : inputOk
                  }`}
                />
              </div>
              {dobError ? (
                <FieldError id="dob-error" message={dobError} />
              ) : (
                <p id="dob-help" className={helperClass}>
                  Used only for professional profile verification.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="service" className={labelClass}>
                Primary Service
              </label>

              <div className="group relative">
                <WrenchIcon
                  className={`${leftIconClass} ${iconTone(
                    !!serviceError
                  )}`}
                />
                <select
                  id="service"
                  value={service}
                  onChange={(event) =>
                    setService(event.target.value)
                  }
                  onBlur={() => touch("service")}
                  aria-invalid={!!serviceError}
                  aria-describedby={describedBy(
                    "service",
                    "service-help"
                  )}
                  className={`${inputBase} cursor-pointer appearance-none ${
                    serviceError ? inputBad : inputOk
                  }`}
                >
                  <option value="plumber">Plumber</option>
                  <option value="electrician">Electrician</option>
                  <option value="cleaner">Cleaner</option>
                  <option value="painter">Painter</option>
                </select>
                <ChevronDownIcon className="pointer-events-none absolute right-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#6B7280]" />
              </div>
              {serviceError ? (
                <FieldError id="service-error" message={serviceError} />
              ) : (
                <p id="service-help" className={helperClass}>
                  Choose the service customers will book you for.
                </p>
              )}
            </div>
          </div>

          {/* Experience + Price */}
          <div
            className="gs-step grid gap-6 sm:grid-cols-2"
            style={{ animationDelay: "0.36s" }}
          >
            <div>
              <label htmlFor="experience" className={labelClass}>
                Years of Experience
              </label>

              <div className="group relative">
                <BriefcaseIcon
                  className={`${leftIconClass} ${iconTone(
                    !!experienceError
                  )}`}
                />
                <input
                  id="experience"
                  type="number"
                  min="0"
                  value={experience}
                  onChange={(event) =>
                    setExperience(event.target.value)
                  }
                  onBlur={() => touch("experience")}
                  placeholder="e.g. 5"
                  required
                  aria-invalid={!!experienceError}
                  aria-describedby={describedBy(
                    "experience",
                    "experience-help"
                  )}
                  className={`gs-no-spin ${inputBase} ${
                    experienceError ? inputBad : inputOk
                  }`}
                />
                {isValidShown("experience", experience.trim() !== "") && (
                  <ValidTick />
                )}
              </div>
              {experienceError ? (
                <FieldError
                  id="experience-error"
                  message={experienceError}
                />
              ) : (
                <p id="experience-help" className={helperClass}>
                  Tell customers how experienced you are.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="price" className={labelClass}>
                Starting Price
              </label>

              <div className="group relative">
                <WalletIcon
                  className={`${leftIconClass} ${iconTone(
                    !!priceError
                  )}`}
                />
                <span className="pointer-events-none absolute left-11 top-1/2 -translate-y-1/2 rounded-md bg-[#16233B]/5 px-1.5 py-0.5 text-[11px] font-bold text-[#16233B]">
                  NPR
                </span>
                <input
                  id="price"
                  type="number"
                  min="0"
                  value={price}
                  onChange={(event) =>
                    setPrice(event.target.value)
                  }
                  onBlur={() => touch("price")}
                  placeholder="e.g. 1000"
                  required
                  aria-invalid={!!priceError}
                  aria-describedby={describedBy("price", "price-help")}
                  className={`gs-no-spin ${inputBase} !pl-[5.5rem] ${
                    priceError ? inputBad : inputOk
                  }`}
                />
                {isValidShown("price", price.trim() !== "") && (
                  <ValidTick />
                )}
              </div>
              {priceError ? (
                <FieldError id="price-error" message={priceError} />
              ) : (
                <p id="price-help" className={helperClass}>
                  You can discuss the final price with customers.
                </p>
              )}
            </div>
          </div>

          {/* Profile image */}
          <div className="gs-step" style={{ animationDelay: "0.44s" }}>
            <label htmlFor="profileImage" className={labelClass}>
              Profile Photo
            </label>

            <div className="group relative">
              <input
                ref={fileInputRef}
                id="profileImage"
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={(event) => {
                  setProfileImage(
                    event.target.files?.[0] || null
                  );
                  touch("profileImage");
                }}
                aria-invalid={!!imageError}
                aria-describedby={describedBy(
                  "profileImage",
                  "profileImage-help"
                )}
                className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
              />

              <div
                className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-all duration-200 peer-focus-visible:ring-4 ${
                  imageError
                    ? "border-red-300 bg-red-50/60 peer-focus-visible:border-red-500 peer-focus-visible:ring-red-500/10"
                    : "border-[#16233B]/20 bg-[#F7F4EE]/50 group-hover:border-[#E3A73A] group-hover:bg-[#E3A73A]/5 peer-focus-visible:border-[#16233B] peer-focus-visible:ring-[#16233B]/10"
                }`}
              >
                <div className="flex items-center gap-2">
                  {previewUrl && !imageError ? (
                    <img
                      src={previewUrl}
                      alt="Selected profile preview"
                      className="h-16 w-16 rounded-full border-2 border-[#E3A73A]/50 object-cover"
                    />
                  ) : (
                    <>
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#16233B]/5 text-[#16233B] transition-transform duration-200 group-hover:scale-110">
                        <CameraIcon className="h-6 w-6" />
                      </span>
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E3A73A]/15 text-[#B9801A] transition-transform duration-200 group-hover:scale-110">
                        <UploadIcon className="h-[18px] w-[18px]" />
                      </span>
                    </>
                  )}
                </div>

                <div>
                  <p className="text-sm font-semibold text-[#16233B]">
                    {profileImage
                      ? "Change your profile photo"
                      : "Upload your profile photo"}
                  </p>
                  <p className="mt-1 text-xs text-[#6B7280]">
                    Use a clear photo so customers can recognize you.
                  </p>
                  <p
                    id="profileImage-help"
                    className="mt-1 text-xs text-gray-400"
                  >
                    PNG, JPG or JPEG • Max 5MB
                  </p>
                </div>

                {profileImage && (
                  <span className="max-w-full truncate rounded-full border border-[#E3A73A]/40 bg-white px-3 py-1 text-xs font-medium text-[#16233B]">
                    {profileImage.name}
                  </span>
                )}
              </div>

              {profileImage && (
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  aria-label="Remove selected photo"
                  className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-[#6B7280] shadow-sm transition-all duration-200 hover:scale-110 hover:text-[#F26B5E] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#16233B]/10"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              )}
            </div>
            {imageError && (
              <FieldError id="profileImage-error" message={imageError} />
            )}
          </div>

          {/* Submit */}
          <div className="gs-step" style={{ animationDelay: "0.52s" }}>
            <button
              type="submit"
              disabled={isPending}
              className="h-12 w-full rounded-xl bg-[#16233B] text-sm font-semibold text-white shadow-md shadow-[#16233B]/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#F26B5E] hover:shadow-lg hover:shadow-[#F26B5E]/25 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#16233B]/20 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:bg-[#16233B] disabled:hover:shadow-md"
            >
              {isPending
                ? "Saving Profile..."
                : "Create Professional Profile →"}
            </button>

            <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-[#6B7280]">
              <ShieldCheckIcon className="h-4 w-4 shrink-0 text-[#E3A73A]" />
              Your professional information helps customers find the
              right service provider.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};