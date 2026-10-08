import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  LogOut,
  Briefcase,
  Clock,
  Banknote,
  CalendarDays,
  MapPin,
  Mail,
  Phone,
  Check,
  X,
  CheckCircle,
  RefreshCw,
  ClipboardList,
  AlertCircle,
  Loader2,
  Star,
  Quote,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { getProviderProfile } from "../../api/provider.api";
import {
  getProviderBookings,
  updateBookingStatus,
} from "../../api/booking.api";
import { getProviderReviews } from "../../api/review.api";
import { resolveAssetUrl } from "../../api/user.api";

/* ==========================================================
   TYPES
   ========================================================== */

type Availability = "Available" | "Busy" | "Unavailable";

type BookingStatus =
  | "Pending"
  | "Accepted"
  | "Rejected"
  | "Completed"
  | "Cancelled";

type ActionStatus = "Accepted" | "Rejected" | "Completed";

type BookingFilter = "All" | "Pending" | "Accepted" | "Completed";

type ProviderProfile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  service: string;
  experience: number;
  price: number;
  availability: Availability;
  imageFilename: string;
};

type Booking = {
  _id: string;
  service: string;
  bookingDate: string;
  bookingTime: string;
  address: string;
  description: string;
  price: number;
  status: BookingStatus;
  customerId?: {
    fullname: string;
    phone: string;
  };
};

type Review = {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  customerName: string;
  service: string;
  bookingRef: string;
};

type UnknownRecord = Record<string, unknown>;

/* ==========================================================
   CONSTANTS / STYLE MAPS
   ========================================================== */

const FALLBACK_NAME = "Service Professional";

const AVAILABILITY_VALUES: Availability[] = [
  "Available",
  "Busy",
  "Unavailable",
];

const AVAILABILITY_STYLES: Record<
  Availability,
  { badge: string; dot: string; text: string }
> = {
  Available: {
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200/70",
    dot: "bg-emerald-500",
    text: "text-emerald-600",
  },
  Busy: {
    badge: "bg-amber-50 text-amber-700 ring-amber-200/70",
    dot: "bg-amber-500",
    text: "text-amber-600",
  },
  Unavailable: {
    badge: "bg-red-50 text-red-700 ring-red-200/70",
    dot: "bg-red-500",
    text: "text-red-600",
  },
};

const STATUS_STYLES: Record<BookingStatus, { badge: string; dot: string }> = {
  Pending: {
    badge: "bg-amber-50 text-amber-700 ring-amber-200/70",
    dot: "bg-amber-500",
  },
  Accepted: {
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200/70",
    dot: "bg-emerald-500",
  },
  Rejected: {
    badge: "bg-red-50 text-red-700 ring-red-200/70",
    dot: "bg-red-500",
  },
  Completed: {
    badge: "bg-blue-50 text-blue-700 ring-blue-200/70",
    dot: "bg-blue-500",
  },
  Cancelled: {
    badge: "bg-gray-100 text-gray-600 ring-gray-200/80",
    dot: "bg-gray-400",
  },
};

const SERVICE_LABELS: Record<string, string> = {
  plumber: "Plumber",
  electrician: "Electrician",
  cleaner: "Cleaner",
  painter: "Painter",
};

const FILTERS: BookingFilter[] = ["All", "Pending", "Accepted", "Completed"];

const INITIAL_REVIEWS = 4;

/** Soft layered surface used for all main cards. */
const CARD =
  "rounded-3xl border border-[#16233B]/5 bg-white shadow-[0_1px_2px_rgba(22,35,59,0.04),0_10px_30px_-14px_rgba(22,35,59,0.14)]";

/** Subtle lift on hover; disabled for reduced-motion users. */
const HOVER_LIFT =
  "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(22,35,59,0.05),0_18px_40px_-16px_rgba(22,35,59,0.22)] motion-reduce:transition-none motion-reduce:hover:translate-y-0";

const FOCUS_RING =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A] focus-visible:ring-offset-2";

const BUTTON_PRIMARY = `inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#16233B] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_6px_16px_-8px_rgba(22,35,59,0.6)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#F26B5E] hover:shadow-[0_10px_20px_-10px_rgba(242,107,94,0.7)] ${FOCUS_RING} disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:bg-[#16233B] disabled:hover:shadow-none motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:w-auto`;

const BUTTON_SECONDARY = `inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 ring-1 ring-inset ring-gray-200 transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-50 hover:text-red-600 hover:ring-red-200 ${FOCUS_RING} disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:bg-white disabled:hover:text-gray-600 disabled:hover:ring-gray-200 motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:w-auto`;

const BUTTON_GHOST = `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-[#16233B] ring-1 ring-inset ring-gray-200 transition-all duration-200 hover:-translate-y-0.5 hover:ring-[#E3A73A] ${FOCUS_RING} disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0`;

/* ==========================================================
   HELPERS
   ========================================================== */

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Returns the first non-empty string among the given values. */
const pickString = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
};

const toNumber = (value: unknown): number => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
};

const isAvailability = (value: unknown): value is Availability =>
  typeof value === "string" &&
  (AVAILABILITY_VALUES as string[]).includes(value);

const capitalize = (value: string): string =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

const humanService = (service?: string): string => {
  if (!service) return "Service";
  return SERVICE_LABELS[service.toLowerCase()] ?? capitalize(service);
};

/** Real name fields on a single object (user-like or provider-like). */
const readRealName = (source: UnknownRecord | null): string => {
  if (!source) return "";
  const joined = [source.firstName, source.lastName]
    .filter((part): part is string => typeof part === "string" && !!part.trim())
    .join(" ");
  return pickString(source.fullname, source.fullName, source.name, joined);
};

const readUsername = (source: UnknownRecord | null): string =>
  source ? pickString(source.username, source.userName) : "";

/** The user object saved at login (same key already used by logout). */
const readStoredUser = (): UnknownRecord | null => {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    return isRecord(parsed.user) ? parsed.user : parsed;
  } catch {
    return null;
  }
};

/**
 * Resolves the professional's actual name.
 * Priority: provider record → populated userId / user → logged-in user
 * (saved at login) → usernames → fallback only if nothing exists.
 */
const getProviderDisplayName = (
  provider: UnknownRecord,
  owner: UnknownRecord | null,
  storedUser: UnknownRecord | null
): string => {
  const realName =
    readRealName(provider) || readRealName(owner) || readRealName(storedUser);
  if (realName) return realName;

  return (
    readUsername(provider) || readUsername(owner) || readUsername(storedUser)
  );
};

/** Safely converts the unknown API response into a typed profile. */
const normalizeProfile = (response: unknown): ProviderProfile | null => {
  const payload =
    isRecord(response) && isRecord(response.data) ? response.data : response;
  if (!isRecord(payload)) return null;

  const owner = isRecord(payload.userId)
    ? payload.userId
    : isRecord(payload.user)
      ? payload.user
      : null;

  const name = getProviderDisplayName(payload, owner, readStoredUser());

  if (!name && import.meta.env?.DEV) {
    console.warn(
      "No provider name found in /provider/details response. Keys:",
      Object.keys(payload)
    );
  }

  const image = isRecord(payload.profileImage)
    ? pickString(payload.profileImage.filename)
    : "";

  return {
    id: pickString(payload._id, payload.id, payload.providerId),
    name,
    email: pickString(payload.email, owner?.email),
    phone: pickString(payload.phone, owner?.phone),
    location: pickString(payload.location, payload.address, payload.city),
    service: pickString(payload.service),
    experience: toNumber(payload.experience),
    price: toNumber(payload.price),
    availability: isAvailability(payload.availability)
      ? payload.availability
      : "Unavailable",
    imageFilename: image,
  };
};

const formatBookingDate = (date: string): string => {
  if (!date) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  const sameYear = parsed.getFullYear() === new Date().getFullYear();
  return parsed.toLocaleDateString("en-US", {
    ...(sameYear ? {} : { year: "numeric" }),
    month: "short",
    day: "numeric",
  });
};

/** "Today" / "Tomorrow" / "Yesterday" or the short date. */
const relativeDay = (date: string): { label: string; soon: boolean } => {
  const parsed = new Date(date);
  if (!date || Number.isNaN(parsed.getTime())) {
    return { label: date || "—", soon: false };
  }
  const startOf = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round(
    (startOf(parsed) - startOf(new Date())) / 86_400_000
  );
  if (diff === 0) return { label: "Today", soon: true };
  if (diff === 1) return { label: "Tomorrow", soon: true };
  if (diff === -1) return { label: "Yesterday", soon: false };
  return { label: formatBookingDate(date), soon: false };
};

const formatBookingTime = (time: string): string => {
  if (!time) return "—";
  if (/[ap]m/i.test(time)) return time.trim().toUpperCase();
  const [hourStr, minuteStr] = time.split(":");
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return time;
  const period = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, "0")} ${period}`;
};

const formatNPR = (amount: number): string => {
  if (!Number.isFinite(amount)) return "NPR 0";
  try {
    return `NPR ${amount.toLocaleString("en-NP")}`;
  } catch {
    return `NPR ${amount.toLocaleString()}`;
  }
};

const initialsFrom = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "GS";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const firstNameOf = (name: string): string => name.trim().split(/\s+/)[0];

const CUSTOMER_TINTS = [
  "bg-[#16233B]/10 text-[#16233B]",
  "bg-[#E3A73A]/20 text-[#8A5F0F]",
  "bg-[#F26B5E]/15 text-[#C23E31]",
] as const;

const tintFor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 997;
  }
  return CUSTOMER_TINTS[hash % CUSTOMER_TINTS.length];
};

/* ---------- Reviews ---------- */

/** Finds the review array in common response shapes. */
const extractList = (response: unknown): unknown[] => {
  if (Array.isArray(response)) return response;
  if (!isRecord(response)) return [];
  for (const key of ["data", "reviews"]) {
    const value = response[key];
    if (Array.isArray(value)) return value;
    if (isRecord(value)) {
      const nested = extractList(value);
      if (nested.length) return nested;
    }
  }
  return [];
};

const firstRecord = (...values: unknown[]): UnknownRecord | null => {
  for (const value of values) if (isRecord(value)) return value;
  return null;
};

const normalizeReviews = (response: unknown): Review[] =>
  extractList(response).reduce<Review[]>((acc, raw, index) => {
    if (!isRecord(raw)) return acc;

    const customer = firstRecord(
      raw.customerId,
      raw.customer,
      raw.userId,
      raw.user
    );
    const booking = firstRecord(raw.bookingId, raw.booking);

    acc.push({
      id: pickString(raw._id, raw.id) || `review-${index}`,
      rating: Math.min(5, Math.max(0, toNumber(raw.rating))),
      comment: pickString(raw.comment, raw.review, raw.feedback),
      createdAt: pickString(raw.createdAt, raw.date),
      customerName:
        readRealName(customer) || readUsername(customer) || "Customer",
      service: pickString(booking?.service, raw.service),
      bookingRef:
        typeof raw.bookingId === "string"
          ? raw.bookingId
          : pickString(booking?._id),
    });
    return acc;
  }, []);

const formatReviewDate = (date: string): string => {
  if (!date) return "";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const ratingMessage = (average: number): string => {
  if (average >= 4.5) return "Excellent service rating";
  if (average >= 4) return "Very good service rating";
  if (average >= 3) return "Good service rating";
  return "Room to grow your rating";
};

/* ==========================================================
   SMALL PRESENTATIONAL COMPONENTS
   ========================================================== */

const SkeletonBlock = ({ className = "" }: { className?: string }) => (
  <div
    className={`animate-pulse rounded-xl bg-[#16233B]/[0.07] motion-reduce:animate-none ${className}`}
  />
);

type AvatarProps = {
  src: string | null;
  name: string;
  className: string;
  textClassName: string;
};

const Avatar = ({ src, name, className, textClassName }: AvatarProps) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <div className={`shrink-0 overflow-hidden rounded-full ${className}`}>
      {src && !failed ? (
        <img
          src={src}
          alt={`${name} profile photo`}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover object-center"
        />
      ) : (
        <div
          className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-[#E3A73A] to-[#F0C060] font-bold text-[#16233B] ${textClassName}`}
          role="img"
          aria-label={`${name} initials`}
        >
          {initialsFrom(name)}
        </div>
      )}
    </div>
  );
};

const CustomerAvatar = ({ name }: { name: string }) => (
  <div
    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold sm:h-14 sm:w-14 sm:text-base ${tintFor(name)}`}
    aria-hidden="true"
  >
    {initialsFrom(name)}
  </div>
);

const StatusBadge = ({ status }: { status: BookingStatus }) => {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.Cancelled;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${style.badge}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${style.dot}`}
        aria-hidden="true"
      />
      {status}
    </span>
  );
};

const AvailabilityBadge = ({
  availability,
}: {
  availability: Availability;
}) => {
  const style = AVAILABILITY_STYLES[availability];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${style.badge}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${style.dot}`}
        aria-hidden="true"
      />
      {availability}
    </span>
  );
};

type InfoChipProps = {
  Icon: LucideIcon;
  children: ReactNode;
  href?: string;
};

const InfoChip = ({ Icon, children, href }: InfoChipProps) => {
  const className = `inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#F7F4EE] px-3 py-1.5 text-xs font-medium text-[#16233B]`;
  const content = (
    <>
      <Icon size={13} className="shrink-0 text-gray-500" aria-hidden="true" />
      <span className="truncate">{children}</span>
    </>
  );

  return href ? (
    <a
      href={href}
      className={`${className} transition-colors duration-200 hover:bg-[#E3A73A]/20 ${FOCUS_RING}`}
    >
      {content}
    </a>
  ) : (
    <span className={className}>{content}</span>
  );
};

/* ==========================================================
   EMPTY / ERROR STATES
   ========================================================== */

type EmptyStateProps = {
  Icon: LucideIcon;
  title: string;
  message: string;
  action?: ReactNode;
};

const EmptyState = ({ Icon, title, message, action }: EmptyStateProps) => (
  <div className={`${CARD} px-6 py-12 text-center sm:py-16`}>
    <div className="relative mx-auto h-20 w-20">
      <div
        className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#E3A73A]/25 to-[#F26B5E]/15"
        aria-hidden="true"
      />
      <div className="relative flex h-full w-full items-center justify-center rounded-3xl text-[#16233B]">
        <Icon size={32} strokeWidth={1.7} aria-hidden="true" />
      </div>
    </div>
    <h3 className="mt-6 text-lg font-semibold text-[#16233B]">{title}</h3>
    <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-gray-500">
      {message}
    </p>
    {action && <div className="mt-6 flex justify-center">{action}</div>}
  </div>
);

type ErrorStateProps = {
  title: string;
  message: string;
  onRetry: () => void;
  retrying?: boolean;
};

const ErrorState = ({ title, message, onRetry, retrying }: ErrorStateProps) => (
  <div
    role="alert"
    className="rounded-3xl border border-red-100 bg-red-50/60 px-6 py-10 text-center"
  >
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-red-500 shadow-sm ring-1 ring-red-100">
      <AlertCircle size={22} aria-hidden="true" />
    </div>
    <h2 className="mt-4 text-base font-semibold text-[#16233B] sm:text-lg">
      {title}
    </h2>
    <p className="mx-auto mt-1.5 max-w-sm text-sm text-gray-600">{message}</p>
    <button
      type="button"
      onClick={onRetry}
      disabled={retrying}
      className={`group mt-5 ${BUTTON_PRIMARY} !w-auto`}
    >
      {retrying ? (
        <Loader2 size={15} className="animate-spin" aria-hidden="true" />
      ) : (
        <RefreshCw
          size={15}
          aria-hidden="true"
          className="transition-transform duration-500 group-hover:rotate-180 motion-reduce:transition-none"
        />
      )}
      Try Again
    </button>
  </div>
);

/* ==========================================================
   LOADING SKELETON
   ========================================================== */

const BookingCardSkeleton = () => (
  <div className={`${CARD} p-5 sm:p-6`}>
    <div className="flex items-center justify-between">
      <SkeletonBlock className="h-6 w-24 !rounded-full" />
      <SkeletonBlock className="h-4 w-20" />
    </div>
    <div className="mt-4 flex items-center gap-3.5">
      <SkeletonBlock className="h-12 w-12 shrink-0 !rounded-full sm:h-14 sm:w-14" />
      <div className="space-y-2">
        <SkeletonBlock className="h-5 w-40" />
        <SkeletonBlock className="h-4 w-28" />
      </div>
    </div>
    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <SkeletonBlock className="h-[68px]" />
      <SkeletonBlock className="h-[68px]" />
      <SkeletonBlock className="h-[68px]" />
    </div>
    <SkeletonBlock className="mt-5 h-4 w-3/4" />
    <SkeletonBlock className="mt-4 h-20" />
    <div className="mt-5 flex flex-col gap-4 border-t border-[#16233B]/5 pt-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-2">
        <SkeletonBlock className="h-3 w-24" />
        <SkeletonBlock className="h-7 w-32" />
      </div>
      <div className="flex gap-2">
        <SkeletonBlock className="h-11 w-full sm:w-24" />
        <SkeletonBlock className="h-11 w-full sm:w-36" />
      </div>
    </div>
  </div>
);

const LoadingSkeleton = () => (
  <div
    className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10"
    role="status"
    aria-busy="true"
  >
    <span className="sr-only">Loading your dashboard…</span>

    {/* Welcome */}
    <div className="space-y-3">
      <SkeletonBlock className="h-9 w-72 max-w-full" />
      <SkeletonBlock className="h-4 w-96 max-w-full" />
      <SkeletonBlock className="h-7 w-24 !rounded-full" />
    </div>

    {/* Hero */}
    <div className={`${CARD} mt-8 overflow-hidden`}>
      <SkeletonBlock className="h-28 !rounded-none sm:h-36" />
      <div className="px-5 pb-6 sm:px-8 sm:pb-8">
        <div className="-mt-12 flex flex-col gap-4 sm:-mt-[52px] sm:flex-row sm:items-start sm:gap-6">
          <SkeletonBlock className="h-24 w-24 shrink-0 !rounded-full border-4 border-white sm:h-[104px] sm:w-[104px]" />
          <div className="flex-1 space-y-2 sm:mt-[60px]">
            <SkeletonBlock className="h-6 w-48" />
            <SkeletonBlock className="h-4 w-36" />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <SkeletonBlock className="h-8 w-28 !rounded-full" />
          <SkeletonBlock className="h-8 w-32 !rounded-full" />
          <SkeletonBlock className="h-8 w-36 !rounded-full" />
        </div>
      </div>
    </div>

    {/* Metrics */}
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
      {[0, 1, 2].map((i) => (
        <div key={i} className={`${CARD} p-5`}>
          <div className="flex items-center gap-3">
            <SkeletonBlock className="h-10 w-10" />
            <SkeletonBlock className="h-3 w-20" />
          </div>
          <SkeletonBlock className="mt-4 h-7 w-28" />
          <SkeletonBlock className="mt-2 h-3 w-36" />
        </div>
      ))}
    </div>

    {/* Bookings */}
    <div className="mt-12 space-y-5">
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <SkeletonBlock className="h-7 w-52" />
          <SkeletonBlock className="h-4 w-64 max-w-full" />
        </div>
        <SkeletonBlock className="h-10 w-24" />
      </div>
      <SkeletonBlock className="h-[88px]" />
      <SkeletonBlock className="h-12 w-full sm:w-96" />
      <BookingCardSkeleton />
      <BookingCardSkeleton />
    </div>
  </div>
);

/* ==========================================================
   HEADER
   ========================================================== */

type DashboardHeaderProps = {
  providerName?: string;
  availability?: Availability;
  profileImageSrc: string | null;
  onLogout: () => void;
};

const DashboardHeader = ({
  providerName,
  availability,
  profileImageSrc,
  onLogout,
}: DashboardHeaderProps) => (
  <header className="sticky top-0 z-30 border-b border-[#16233B]/5 bg-white/80 shadow-[0_8px_24px_-18px_rgba(22,35,59,0.25)] backdrop-blur-md">
    <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 sm:py-3">
      {/* Brand */}
      <div className="flex min-w-0 items-center gap-3">
        <span className="text-xl font-extrabold tracking-tight text-[#16233B]">
          Ghar<span className="text-[#E3A73A]">Sewa</span>
        </span>
        <span
          className="hidden h-5 w-px bg-[#16233B]/10 sm:block"
          aria-hidden="true"
        />
        <span className="hidden truncate text-sm font-medium text-gray-500 sm:block">
          Professional Dashboard
        </span>
      </div>

      {/* Identity + logout */}
      <div className="flex items-center gap-2 sm:gap-3">
        {providerName !== undefined ? (
          <div className="flex items-center gap-2.5 rounded-full bg-[#F7F4EE] py-1 pl-1 pr-1 sm:pr-4">
            <div className="relative">
              <Avatar
                src={profileImageSrc}
                name={providerName}
                className="h-9 w-9 ring-2 ring-white"
                textClassName="text-xs"
              />
              {availability && (
                <span
                  className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-white ${AVAILABILITY_STYLES[availability].dot}`}
                  aria-hidden="true"
                />
              )}
            </div>
            <div className="hidden min-w-0 sm:block">
              <p className="max-w-[170px] truncate text-sm font-semibold leading-tight text-[#16233B]">
                {providerName}
              </p>
              {availability && (
                <p
                  className={`text-[11px] font-medium leading-tight ${AVAILABILITY_STYLES[availability].text}`}
                >
                  {availability}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 rounded-full bg-[#F7F4EE] py-1 pl-1 pr-1 sm:pr-4">
            <div className="h-9 w-9 animate-pulse rounded-full bg-[#16233B]/10 motion-reduce:animate-none" />
            <div className="hidden space-y-1.5 sm:block">
              <div className="h-3 w-24 animate-pulse rounded bg-[#16233B]/10 motion-reduce:animate-none" />
              <div className="h-2.5 w-14 animate-pulse rounded bg-[#16233B]/10 motion-reduce:animate-none" />
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onLogout}
          aria-label="Logout"
          className={`inline-flex h-11 w-11 items-center justify-center gap-2 rounded-full text-gray-600 ring-1 ring-inset ring-gray-200 transition-all duration-200 hover:bg-[#16233B] hover:text-white hover:ring-[#16233B] ${FOCUS_RING} motion-reduce:transition-none sm:w-auto sm:px-4 sm:text-sm sm:font-semibold`}
        >
          <LogOut size={16} aria-hidden="true" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </div>
  </header>
);

/* ==========================================================
   WELCOME
   ========================================================== */

const WelcomeSection = ({
  name,
  hasRealName,
  availability,
}: {
  name: string;
  hasRealName: boolean;
  availability: Availability;
}) => (
  <section aria-labelledby="welcome-heading">
    <h1
      id="welcome-heading"
      className="break-words text-[28px] font-bold leading-tight tracking-tight text-[#16233B] sm:text-4xl"
    >
      {getGreeting()}, {hasRealName ? firstNameOf(name) : name} 👋
    </h1>
    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-500 sm:text-base">
      Here's what's happening with your services today. Manage your bookings
      and keep your work running smoothly.
    </p>
    <div className="mt-4">
      <AvailabilityBadge availability={availability} />
    </div>
  </section>
);

/* ==========================================================
   PROFILE HERO
   ========================================================== */

type ProfileHeroProps = {
  profile: ProviderProfile;
  providerName: string;
  imageSrc: string | null;
};

const ProfileHero = ({ profile, providerName, imageSrc }: ProfileHeroProps) => (
  <section
    aria-label="Professional profile"
    className={`${CARD} overflow-hidden`}
  >
    {/* Gradient cover */}
    <div
      className="relative h-28 overflow-hidden bg-gradient-to-br from-[#16233B] via-[#1F3457] to-[#16233B] sm:h-36"
      aria-hidden="true"
    >
      <div className="absolute -right-10 -top-16 h-52 w-52 rounded-full bg-[#F26B5E]/25 blur-3xl" />
      <div className="absolute -bottom-24 left-1/4 h-52 w-52 rounded-full bg-[#E3A73A]/20 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.07)_1px,transparent_0)] [background-size:20px_20px]" />
    </div>

    <div className="px-5 pb-6 sm:px-8 sm:pb-8">
      <div className="relative z-10 -mt-12 flex flex-col gap-3 sm:-mt-[52px] sm:flex-row sm:items-start sm:gap-6">
        <Avatar
          src={imageSrc}
          name={providerName}
          className="h-24 w-24 border-4 border-white bg-white shadow-[0_8px_24px_-8px_rgba(22,35,59,0.35)] sm:h-[104px] sm:w-[104px]"
          textClassName="text-3xl"
        />

        {/* starts below the cover on desktop */}
        <div className="min-w-0 flex-1 sm:mt-[60px]">
          <h2 className="break-words text-xl font-bold tracking-tight text-[#16233B] sm:text-2xl">
            {providerName}
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Professional {humanService(profile.service)}
          </p>
        </div>

        <div className="sm:mt-[64px]">
          <AvailabilityBadge availability={profile.availability} />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <InfoChip Icon={Briefcase}>{humanService(profile.service)}</InfoChip>
        <InfoChip Icon={Clock}>
          {profile.experience} {profile.experience === 1 ? "Year" : "Years"}{" "}
          Experience
        </InfoChip>
        {profile.phone && (
          <InfoChip Icon={Phone} href={`tel:${profile.phone}`}>
            {profile.phone}
          </InfoChip>
        )}
        {profile.email && (
          <InfoChip Icon={Mail} href={`mailto:${profile.email}`}>
            {profile.email}
          </InfoChip>
        )}
        {profile.location && (
          <InfoChip Icon={MapPin}>{profile.location}</InfoChip>
        )}
      </div>
    </div>
  </section>
);

/* ==========================================================
   PROFILE METRIC CARD
   ========================================================== */

type ProfileMetricCardProps = {
  Icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
  tone: "navy" | "gold" | "coral";
};

const METRIC_TONES = {
  navy: { icon: "bg-[#16233B]/10 text-[#16233B]", glow: "bg-[#16233B]/10" },
  gold: { icon: "bg-[#E3A73A]/20 text-[#9A6B0E]", glow: "bg-[#E3A73A]/25" },
  coral: { icon: "bg-[#F26B5E]/15 text-[#C23E31]", glow: "bg-[#F26B5E]/20" },
} as const;

const ProfileMetricCard = ({
  Icon,
  label,
  value,
  hint,
  tone,
}: ProfileMetricCardProps) => {
  const style = METRIC_TONES[tone];
  return (
    <div
      className={`${CARD} relative overflow-hidden !rounded-2xl p-5 ${HOVER_LIFT}`}
    >
      <div
        className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full blur-2xl ${style.glow}`}
        aria-hidden="true"
      />
      <div className="relative flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${style.icon}`}
        >
          <Icon size={19} aria-hidden="true" />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
          {label}
        </p>
      </div>
      <p className="relative mt-4 break-words text-2xl font-bold tracking-tight text-[#16233B]">
        {value}
      </p>
      <p className="relative mt-1 text-xs text-gray-500">{hint}</p>
    </div>
  );
};

/* ==========================================================
   BOOKING STATS
   ========================================================== */

type BookingStatsProps = {
  stats: {
    total: number;
    pending: number;
    accepted: number;
    completed: number;
  };
};

const BookingStats = ({ stats }: BookingStatsProps) => {
  const items = [
    { label: "Total Requests", value: stats.total, dot: "bg-[#16233B]" },
    { label: "Pending", value: stats.pending, dot: "bg-amber-500" },
    { label: "Accepted", value: stats.accepted, dot: "bg-emerald-500" },
    { label: "Completed", value: stats.completed, dot: "bg-blue-500" },
  ];

  return (
    <dl
      className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-[#16233B]/5 shadow-[0_1px_2px_rgba(22,35,59,0.04)] sm:grid-cols-4"
      aria-label="Booking overview"
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="flex h-[88px] flex-col justify-center bg-white px-5"
        >
          <dt className="flex items-center gap-2 text-xs font-medium text-gray-500">
            <span
              className={`h-1.5 w-1.5 rounded-full ${item.dot}`}
              aria-hidden="true"
            />
            {item.label}
          </dt>
          <dd className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-[#16233B]">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
};

/* ==========================================================
   BOOKING FILTERS
   ========================================================== */

type BookingFiltersProps = {
  filter: BookingFilter;
  counts: Record<BookingFilter, number>;
  onChange: (filter: BookingFilter) => void;
};

const BookingFilters = ({ filter, counts, onChange }: BookingFiltersProps) => (
  <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
    <div
      role="group"
      aria-label="Filter bookings by status"
      className="inline-flex gap-1 rounded-2xl bg-white p-1 shadow-[0_1px_2px_rgba(22,35,59,0.05)] ring-1 ring-[#16233B]/5"
    >
      {FILTERS.map((item) => {
        const active = filter === item;
        return (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-pressed={active}
            className={`inline-flex min-h-[40px] items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 ${FOCUS_RING} motion-reduce:transition-none ${
              active
                ? "bg-[#16233B] text-white shadow-[0_6px_14px_-8px_rgba(22,35,59,0.7)]"
                : "text-gray-600 hover:bg-[#F7F4EE] hover:text-[#16233B]"
            }`}
          >
            {item}
            <span
              className={`text-xs font-medium tabular-nums ${
                active ? "text-white/60" : "text-gray-400"
              }`}
            >
              {counts[item]}
            </span>
          </button>
        );
      })}
    </div>
  </div>
);

/* ==========================================================
   BOOKING CARD
   ========================================================== */

type BookingCardProps = {
  booking: Booking;
  updating: boolean;
  disabled: boolean;
  onUpdate: (status: ActionStatus) => void;
};

const DetailTile = ({
  Icon,
  label,
  value,
}: {
  Icon: LucideIcon;
  label: string;
  value: string;
}) => (
  <div className="min-w-0 rounded-xl bg-[#F7F4EE]/70 px-4 py-3">
    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
      <Icon size={12} className="text-gray-400" aria-hidden="true" />
      {label}
    </p>
    <p className="mt-1 break-words text-sm font-semibold text-[#16233B]">
      {value}
    </p>
  </div>
);

const BookingCard = ({
  booking,
  updating,
  disabled,
  onUpdate,
}: BookingCardProps) => {
  const customerName = booking.customerId?.fullname || "Customer";
  const customerPhone = booking.customerId?.phone;
  const day = relativeDay(booking.bookingDate);

  return (
    <article
      className={`${CARD} p-5 sm:p-6 ${HOVER_LIFT}`}
      aria-busy={updating}
    >
      {/* Status + day */}
      <div className="flex items-center justify-between gap-3">
        <StatusBadge status={booking.status} />
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
            day.soon ? "text-[#D4493C]" : "text-gray-500"
          }`}
        >
          <CalendarDays size={13} aria-hidden="true" />
          {day.label}
        </span>
      </div>

      {/* Customer */}
      <div className="mt-4 flex items-center gap-3.5">
        <CustomerAvatar name={customerName} />
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold tracking-tight text-[#16233B]">
            {customerName}
          </h3>
          {customerPhone && (
            <p className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-gray-500">
              <Phone size={13} className="text-gray-400" aria-hidden="true" />
              <a
                href={`tel:${customerPhone}`}
                aria-label={`Call ${customerName} at ${customerPhone}`}
                className={`rounded underline-offset-2 transition-colors duration-200 hover:text-[#F26B5E] hover:underline ${FOCUS_RING}`}
              >
                {customerPhone}
              </a>
            </p>
          )}
        </div>
      </div>

      {/* Service / date / time */}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <DetailTile
          Icon={Briefcase}
          label="Service"
          value={humanService(booking.service)}
        />
        <DetailTile
          Icon={CalendarDays}
          label="Date"
          value={formatBookingDate(booking.bookingDate)}
        />
        <DetailTile
          Icon={Clock}
          label="Time"
          value={formatBookingTime(booking.bookingTime)}
        />
      </div>

      {/* Address */}
      <div className="mt-5 flex items-start gap-2.5">
        <MapPin
          size={16}
          className="mt-0.5 shrink-0 text-[#F26B5E]"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-400">Customer location</p>
          <p className="break-words text-sm text-gray-600">{booking.address}</p>
        </div>
      </div>

      {/* Requirement */}
      <div className="mt-4 flex items-start gap-3 rounded-2xl bg-[#F7F4EE] px-4 py-3.5">
        <ClipboardList
          size={16}
          className="mt-0.5 shrink-0 text-[#B9801A]"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            Customer requirement
          </p>
          <p className="mt-1 break-words text-sm leading-relaxed text-[#16233B]">
            {booking.description}
          </p>
        </div>
      </div>

      {/* Price + actions */}
      <div className="mt-5 flex flex-col gap-4 border-t border-[#16233B]/5 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            Total estimate
          </p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight text-[#16233B]">
            {formatNPR(booking.price)}
          </p>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
          {booking.status === "Pending" && (
            <>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onUpdate("Rejected")}
                aria-label={`Reject booking from ${customerName}`}
                className={BUTTON_SECONDARY}
              >
                <X size={16} aria-hidden="true" />
                Reject
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onUpdate("Accepted")}
                aria-label={`Accept booking from ${customerName}`}
                className={BUTTON_PRIMARY}
              >
                {updating ? (
                  <>
                    <Loader2
                      size={16}
                      className="animate-spin"
                      aria-hidden="true"
                    />
                    Updating...
                  </>
                ) : (
                  <>
                    <Check size={16} aria-hidden="true" />
                    Accept Request
                  </>
                )}
              </button>
            </>
          )}

          {booking.status === "Accepted" && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onUpdate("Completed")}
              aria-label={`Mark booking from ${customerName} as completed`}
              className={BUTTON_PRIMARY}
            >
              {updating ? (
                <>
                  <Loader2
                    size={16}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                  Updating...
                </>
              ) : (
                <>
                  <CheckCircle size={16} aria-hidden="true" />
                  Mark as Completed
                </>
              )}
            </button>
          )}

          {booking.status === "Completed" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50/70 px-3.5 py-2 text-sm font-medium text-emerald-700">
              <CheckCircle size={15} aria-hidden="true" />
              Service Completed
            </span>
          )}
        </div>
      </div>
    </article>
  );
};

/* ==========================================================
   REVIEWS
   ========================================================== */

const RatingStars = ({
  value,
  size = 16,
  className = "",
}: {
  value: number;
  size?: number;
  className?: string;
}) => {
  const filled = Math.round(value);
  return (
    <span
      role="img"
      aria-label={`${value.toFixed(1)} out of 5 stars`}
      className={`inline-flex items-center gap-0.5 ${className}`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          aria-hidden="true"
          className={i <= filled ? "text-[#E3A73A]" : "text-gray-200"}
          fill={i <= filled ? "currentColor" : "none"}
          strokeWidth={i <= filled ? 1.5 : 1.8}
        />
      ))}
    </span>
  );
};

const RatingDistribution = ({
  counts,
  total,
}: {
  counts: number[]; // index 0 => 5 stars ... index 4 => 1 star
  total: number;
}) => (
  <ul className="space-y-2" aria-label="Rating distribution">
    {counts.map((count, i) => {
      const stars = 5 - i;
      const pct = total > 0 ? (count / total) * 100 : 0;
      return (
        <li key={stars} className="flex items-center gap-3 text-xs">
          <span className="flex w-8 shrink-0 items-center gap-1 font-semibold text-[#16233B]">
            {stars}
            <Star
              size={11}
              className="text-[#E3A73A]"
              fill="currentColor"
              aria-hidden="true"
            />
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#16233B]/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#E3A73A] to-[#F0C060] transition-[width] duration-500 motion-reduce:transition-none"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="w-6 shrink-0 text-right tabular-nums text-gray-500">
            {count}
          </span>
        </li>
      );
    })}
  </ul>
);

const ReviewSummary = ({ reviews }: { reviews: Review[] }) => {
  const total = reviews.length;
  const average = total
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / total
    : 0;
  const counts = [5, 4, 3, 2, 1].map(
    (stars) => reviews.filter((r) => Math.round(r.rating) === stars).length
  );

  return (
    <div className={`${CARD} relative overflow-hidden p-6`}>
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[#E3A73A]/20 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
          Overall rating
        </p>
        <div className="mt-2 flex items-end gap-2">
          <span className="text-5xl font-bold tabular-nums tracking-tight text-[#16233B]">
            {average.toFixed(1)}
          </span>
          <span className="pb-1.5 text-sm font-medium text-gray-400">/ 5</span>
        </div>
        <RatingStars value={average} size={20} className="mt-2" />
        <p className="mt-2 text-sm text-gray-500">
          Based on {total} customer {total === 1 ? "review" : "reviews"}
        </p>
        <p className="mt-1 text-sm font-semibold text-[#16233B]">
          {ratingMessage(average)}
        </p>

        <div className="mt-6 border-t border-[#16233B]/5 pt-5">
          <RatingDistribution counts={counts} total={total} />
        </div>
      </div>
    </div>
  );
};

const ReviewCard = ({ review }: { review: Review }) => {
  const date = formatReviewDate(review.createdAt);
  const tag =
    review.service !== ""
      ? `${humanService(review.service)} Service`
      : review.bookingRef
        ? `Booking #${review.bookingRef.slice(-6).toUpperCase()}`
        : "";

  return (
    <article className={`${CARD} !rounded-2xl p-5 sm:p-6 ${HOVER_LIFT}`}>
      <div className="flex items-start gap-3.5">
        <CustomerAvatar name={review.customerName} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-[#16233B]">
                {review.customerName}
              </h3>
              {date && <p className="mt-0.5 text-xs text-gray-500">{date}</p>}
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#E3A73A]/15 px-2.5 py-1 text-xs font-bold tabular-nums text-[#8A5F0F]">
              {Number.isInteger(review.rating)
                ? review.rating
                : review.rating.toFixed(1)}
              <Star size={12} fill="currentColor" aria-hidden="true" />
            </span>
          </div>
          <RatingStars value={review.rating} size={15} className="mt-2" />
        </div>
      </div>

      {review.comment ? (
        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-[#F7F4EE] px-4 py-3.5">
          <Quote
            size={15}
            className="mt-0.5 shrink-0 text-[#B9801A]"
            aria-hidden="true"
          />
          <p className="break-words text-sm leading-relaxed text-[#16233B]">
            {review.comment}
          </p>
        </div>
      ) : (
        <p className="mt-4 text-sm italic text-gray-400">
          No written feedback provided.
        </p>
      )}

      {tag && (
        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#16233B]/[0.05] px-3 py-1 text-xs font-medium text-[#16233B]">
          <Briefcase size={12} className="text-gray-500" aria-hidden="true" />
          {tag}
        </span>
      )}
    </article>
  );
};

const ReviewLoadingSkeleton = () => (
  <div
    className="grid grid-cols-1 gap-5 lg:grid-cols-[340px_1fr]"
    role="status"
    aria-busy="true"
  >
    <span className="sr-only">Loading customer reviews…</span>
    <div className={`${CARD} space-y-4 p-6`}>
      <SkeletonBlock className="h-3 w-24" />
      <SkeletonBlock className="h-12 w-28" />
      <SkeletonBlock className="h-5 w-32" />
      <SkeletonBlock className="h-4 w-44" />
      <div className="space-y-2.5 pt-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <SkeletonBlock key={i} className="h-2.5 w-full !rounded-full" />
        ))}
      </div>
    </div>
    <div className="space-y-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className={`${CARD} !rounded-2xl p-5 sm:p-6`}>
          <div className="flex items-center gap-3.5">
            <SkeletonBlock className="h-12 w-12 shrink-0 !rounded-full sm:h-14 sm:w-14" />
            <div className="flex-1 space-y-2">
              <SkeletonBlock className="h-4 w-40" />
              <SkeletonBlock className="h-3 w-24" />
            </div>
          </div>
          <SkeletonBlock className="mt-4 h-16" />
          <SkeletonBlock className="mt-4 h-6 w-32 !rounded-full" />
        </div>
      ))}
    </div>
  </div>
);

type ReviewSectionProps = {
  reviews: Review[];
  loading: boolean;
  error: boolean;
  refreshing: boolean;
  onRefresh: () => void;
};

const ReviewSection = ({
  reviews,
  loading,
  error,
  refreshing,
  onRefresh,
}: ReviewSectionProps) => {
  const [expanded, setExpanded] = useState(false);

  const sorted = useMemo(
    () =>
      [...reviews].sort((a, b) => {
        const ta = new Date(a.createdAt).getTime();
        const tb = new Date(b.createdAt).getTime();
        return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
      }),
    [reviews]
  );
  const visible = expanded ? sorted : sorted.slice(0, INITIAL_REVIEWS);

  return (
    <section className="mt-12" aria-labelledby="reviews-heading">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2
            id="reviews-heading"
            className="text-xl font-bold tracking-tight text-[#16233B] sm:text-2xl"
          >
            Customer Reviews
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            See what customers are saying about your services.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading || refreshing}
          aria-label="Refresh customer reviews"
          className={`${BUTTON_GHOST} shrink-0 !px-3.5`}
        >
          <RefreshCw
            size={15}
            aria-hidden="true"
            className={refreshing ? "animate-spin" : ""}
          />
        </button>
      </div>

      <div className="mt-6">
        {loading ? (
          <ReviewLoadingSkeleton />
        ) : error ? (
          <ErrorState
            title="Unable to load reviews"
            message="We couldn't retrieve your customer reviews."
            onRetry={onRefresh}
            retrying={refreshing}
          />
        ) : reviews.length === 0 ? (
          <EmptyState
            Icon={Star}
            title="No customer reviews yet"
            message="Your completed services will appear here once customers leave their feedback."
          />
        ) : (
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[340px_1fr]">
            <div className="lg:sticky lg:top-24">
              <ReviewSummary reviews={reviews} />
            </div>
            <div className="space-y-4">
              {visible.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
              {sorted.length > INITIAL_REVIEWS && (
                <div className="flex justify-center pt-1">
                  <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    aria-expanded={expanded}
                    className={BUTTON_GHOST}
                  >
                    {expanded
                      ? "Show fewer reviews"
                      : `Show all ${sorted.length} reviews`}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

/* ==========================================================
   PAGE SHELL (background depth)
   ========================================================== */

const PageShell = ({ children }: { children: ReactNode }) => (
  <main className="relative min-h-screen bg-[#F7F4EE]">
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      <div className="absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-[#16233B]/[0.06] blur-3xl" />
      <div className="absolute -right-32 top-48 h-[360px] w-[360px] rounded-full bg-[#F26B5E]/[0.07] blur-3xl" />
      <div className="absolute bottom-0 left-1/3 h-[320px] w-[320px] rounded-full bg-[#E3A73A]/[0.07] blur-3xl" />
    </div>
    <div className="relative">{children}</div>
  </main>
);

/* ==========================================================
   MAIN COMPONENT
   ========================================================== */

export const ProfessionalDashboardPage = () => {
  const navigate = useNavigate();

  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState("");

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingLoading, setBookingLoading] = useState(true);
  const [bookingError, setBookingError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [filter, setFilter] = useState<BookingFilter>("All");

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState(false);
  const [reviewsRefreshing, setReviewsRefreshing] = useState(false);

  const providerId = profile?.id ?? "";

  /* -------------------- LOADERS -------------------- */

  const loadProfile = async () => {
    setLoading(true);
    setProfileError("");
    try {
      const response: unknown = await getProviderProfile();
      setProfile(normalizeProfile(response));
    } catch (error) {
      console.error("Failed to load provider profile:", error);
      setProfileError("Unable to load your dashboard");
    } finally {
      setLoading(false);
    }
  };

  const loadBookings = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setBookingLoading(true);
    setBookingError("");
    try {
      const response = await getProviderBookings();
      const list: unknown = response?.data;
      setBookings(Array.isArray(list) ? (list as Booking[]) : []);
    } catch (error) {
      console.error("Failed to load booking requests:", error);
      setBookingError("Unable to load booking requests");
    } finally {
      if (isRefresh) setRefreshing(false);
      else setBookingLoading(false);
    }
  };

  const loadReviews = async (isRefresh = false) => {
    if (!providerId) {
      setReviewsLoading(false);
      setReviewsError(true);
      return;
    }
    if (isRefresh) setReviewsRefreshing(true);
    else setReviewsLoading(true);
    setReviewsError(false);
    try {
      const response: unknown = await getProviderReviews(providerId);
      setReviews(normalizeReviews(response));
    } catch (error) {
      console.error("Failed to load reviews:", error);
      setReviewsError(true);
    } finally {
      setReviewsLoading(false);
      setReviewsRefreshing(false);
    }
  };

  useEffect(() => {
    loadProfile();
    loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reviews load once the provider profile (and its id) is available.
  // Kept above the early returns (rules of hooks).
  useEffect(() => {
    if (loading) return;
    loadReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, providerId]);

  const handleRefreshBookings = () => loadBookings(true);

  const handleRetryAll = () => {
    loadProfile();
    loadBookings(false);
  };

  /* -------------------- ACTIONS -------------------- */

  const handleBookingStatus = async (
    bookingId: string,
    status: ActionStatus
  ) => {
    if (statusUpdating) return; // prevent duplicate requests
    setStatusUpdating(bookingId);
    setActionError("");
    try {
      await updateBookingStatus(bookingId, status);
      setBookings((prev) =>
        prev.map((booking) =>
          booking._id === bookingId ? { ...booking, status } : booking
        )
      );
    } catch (error) {
      console.error("Failed to update booking status:", error);
      setActionError("We couldn't update this booking. Please try again.");
    } finally {
      setStatusUpdating(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  /* -------------------- DERIVED -------------------- */

  const providerName = profile?.name || FALLBACK_NAME;

  const profileImageSrc = resolveAssetUrl(
    profile?.imageFilename
      ? `uploads/images/provider/${profile.imageFilename}`
      : null
  );

  const bookingStats = useMemo(
    () => ({
      total: bookings.length,
      pending: bookings.filter((b) => b.status === "Pending").length,
      accepted: bookings.filter((b) => b.status === "Accepted").length,
      completed: bookings.filter((b) => b.status === "Completed").length,
    }),
    [bookings]
  );

  const filteredBookings = useMemo(
    () =>
      filter === "All"
        ? bookings
        : bookings.filter((b) => b.status === filter),
    [bookings, filter]
  );

  const filterCounts: Record<BookingFilter, number> = {
    All: bookingStats.total,
    Pending: bookingStats.pending,
    Accepted: bookingStats.accepted,
    Completed: bookingStats.completed,
  };

  /* ==================== RENDER: LOADING ==================== */

  if (loading) {
    return (
      <PageShell>
        <DashboardHeader
          providerName={undefined}
          profileImageSrc={null}
          onLogout={handleLogout}
        />
        <LoadingSkeleton />
      </PageShell>
    );
  }

  /* ==================== RENDER: PROFILE ERROR ==================== */

  if (!profile) {
    return (
      <PageShell>
        <DashboardHeader
          providerName={undefined}
          profileImageSrc={null}
          onLogout={handleLogout}
        />
        <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
          <ErrorState
            title={profileError || "Unable to load your dashboard"}
            message="Please check your connection and try again."
            onRetry={handleRetryAll}
          />
        </div>
      </PageShell>
    );
  }

  /* ==================== RENDER: MAIN ==================== */

  return (
    <PageShell>
      <DashboardHeader
        providerName={providerName}
        availability={profile.availability}
        profileImageSrc={profileImageSrc}
        onLogout={handleLogout}
      />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <WelcomeSection
          name={providerName}
          hasRealName={Boolean(profile.name)}
          availability={profile.availability}
        />

        <div className="mt-8">
          <ProfileHero
            profile={profile}
            providerName={providerName}
            imageSrc={profileImageSrc}
          />
        </div>

        {/* Profile metrics */}
        <section
          className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5"
          aria-label="Profile statistics"
        >
          <ProfileMetricCard
            Icon={Briefcase}
            tone="navy"
            label="Service"
            value={humanService(profile.service)}
            hint="Your primary service"
          />
          <ProfileMetricCard
            Icon={Clock}
            tone="gold"
            label="Experience"
            value={`${profile.experience} ${
              profile.experience === 1 ? "Year" : "Years"
            }`}
            hint="Professional experience"
          />
          <ProfileMetricCard
            Icon={Banknote}
            tone="coral"
            label="Starting Price"
            value={formatNPR(profile.price)}
            hint="Starting rate for your service"
          />
        </section>

        {/* ============ BOOKING REQUESTS ============ */}
        <section className="mt-12" aria-labelledby="bookings-heading">
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <h2
                id="bookings-heading"
                className="text-xl font-bold tracking-tight text-[#16233B] sm:text-2xl"
              >
                Booking Requests
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Manage incoming customer requests
              </p>
            </div>

            <button
              type="button"
              onClick={handleRefreshBookings}
              disabled={refreshing || bookingLoading}
              aria-label="Refresh booking requests"
              className={`${BUTTON_GHOST} shrink-0 !min-h-[44px] !px-4`}
            >
              {refreshing ? (
                <Loader2
                  size={15}
                  className="animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <RefreshCw size={15} aria-hidden="true" />
              )}
              <span aria-live="polite" className="hidden sm:inline">
                {refreshing ? "Refreshing..." : "Refresh"}
              </span>
            </button>
          </div>

          {/* Action error */}
          {actionError && (
            <div
              role="alert"
              className="mt-4 flex items-start justify-between gap-3 rounded-2xl border border-red-100 bg-red-50/70 px-4 py-3 text-sm text-red-700"
            >
              <span className="flex items-start gap-2.5">
                <AlertCircle
                  size={16}
                  className="mt-0.5 shrink-0"
                  aria-hidden="true"
                />
                {actionError}
              </span>
              <button
                type="button"
                onClick={() => setActionError("")}
                aria-label="Dismiss error"
                className="-m-1 rounded-lg p-2 text-red-500 transition-colors hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Stats + filters */}
          {!bookingLoading && !bookingError && bookings.length > 0 && (
            <div className="mt-6 space-y-5">
              <BookingStats stats={bookingStats} />
              <BookingFilters
                filter={filter}
                counts={filterCounts}
                onChange={setFilter}
              />
            </div>
          )}

          {/* List / states */}
          <div className="mt-5">
            {bookingLoading ? (
              <div className="space-y-4" role="status" aria-busy="true">
                <span className="sr-only">Loading booking requests…</span>
                <BookingCardSkeleton />
                <BookingCardSkeleton />
              </div>
            ) : bookingError ? (
              <ErrorState
                title={bookingError}
                message="Please check your connection and try again."
                onRetry={handleRefreshBookings}
                retrying={refreshing}
              />
            ) : bookings.length === 0 ? (
              <EmptyState
                Icon={ClipboardList}
                title="No booking requests yet"
                message="Your customer requests will appear here when someone books your service."
                action={
                  <button
                    type="button"
                    onClick={handleRefreshBookings}
                    disabled={refreshing}
                    className={BUTTON_GHOST}
                  >
                    {refreshing ? (
                      <Loader2
                        size={15}
                        className="animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <RefreshCw size={15} aria-hidden="true" />
                    )}
                    Refresh Requests
                  </button>
                }
              />
            ) : filteredBookings.length === 0 ? (
              <EmptyState
                Icon={ClipboardList}
                title={`No ${filter.toLowerCase()} bookings`}
                message="Nothing matches this filter right now."
                action={
                  <button
                    type="button"
                    onClick={() => setFilter("All")}
                    className={BUTTON_GHOST}
                  >
                    Show all requests
                  </button>
                }
              />
            ) : (
              <div className="space-y-4 sm:space-y-5">
                {filteredBookings.map((booking) => (
                  <BookingCard
                    key={booking._id}
                    booking={booking}
                    updating={statusUpdating === booking._id}
                    disabled={statusUpdating !== null}
                    onUpdate={(status) =>
                      handleBookingStatus(booking._id, status)
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ============ CUSTOMER REVIEWS ============ */}
        <ReviewSection
          reviews={reviews}
          loading={reviewsLoading}
          error={reviewsError}
          refreshing={reviewsRefreshing}
          onRefresh={() => loadReviews(true)}
        />
      </div>
    </PageShell>
  );
};

export default ProfessionalDashboardPage;