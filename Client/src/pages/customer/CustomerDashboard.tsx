import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { ComponentType, FormEvent } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";

import {
  LogOut,
  UserRound,
  CalendarDays,
  Clock,
  MapPin,
  Banknote,
  Briefcase,
  Star,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Ban,
  Hourglass,
  ClipboardList,
  ThumbsUp,
  Search,
  Sparkles,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  X,
} from "lucide-react";

import { getCustomerBookings } from "../../api/booking.api";
import {
  createReview,
  getProviderReviews,
  getErrorMessage,
  idOf,
  isRecord,
  normalizeReviewsResponse,
} from "../../api/review.api";
import type { ReviewRecord } from "../../api/review.api";
import {
  getCurrentUser,
  readStoredUser,
  saveStoredUser,
  clearAuth,
  resolveAssetUrl,
  UnauthorizedError,
} from "../../api/user.api";
import type { AuthUser } from "../../api/user.api";

// ==========================================
// CONFIG
// ==========================================

// Set this to an EXISTING route (e.g. "/services") to show
// the "Find a Professional" buttons. Left null so no route
// is invented.
const FIND_PROFESSIONAL_ROUTE: string | null = null;

const PROFILE_ROUTE = "/customer/profile";

const RATING_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very good",
  5: "Excellent",
};

const MIN_COMMENT = 3;
const MAX_COMMENT = 500;

// Number of other customers' reviews shown inside a booking card
const PREVIEW_COUNT = 3;

// ==========================================
// TYPES
// ==========================================

type BookingStatus =
  | "Pending"
  | "Accepted"
  | "Rejected"
  | "Completed"
  | "Cancelled";

type Booking = {
  _id: string;
  service: string;
  bookingDate: string;
  bookingTime: string;
  address: string;
  description: string;
  price: number;
  status: BookingStatus;

  // Used only on frontend to know
  // whether customer already reviewed
  hasReview?: boolean;

  providerId?: {
    _id?: string;
    // If the backend adds a name later, it is used automatically
    name?: string;
    email: string;
    service: string;
    experience: number;
    price: number;
    availability: string;
    // Not returned by the booking API today; used if it ever is
    rating?: number;
    profileImage?: {
      filename?: string;
    };
  };
};

type IconType = ComponentType<{ size?: number; className?: string }>;

// A review that belongs to the logged-in customer, with booking context
type MyReview = ReviewRecord & {
  service: string;
  providerName: string;
  providerAvatar: string | null;
};

// Extra provider data loaded from existing endpoints
type ProviderInfo = {
  name?: string; // User.fullname of the professional
  rating: number; // average review rating (0 when there are no reviews)
  reviewCount: number;
  reviews: ReviewRecord[];
  reviewsError: boolean; // getProviderReviews failed
};

// What the review section needs to render
type ProviderReviewsState = {
  reviews: ReviewRecord[];
  average: number;
  count: number;
  loading: boolean;
  error: boolean;
};

type ReviewResult = {
  rating: number;
  comment: string;
};

// ==========================================
// HELPERS
// ==========================================

const API_BASE_URL = (
  (import.meta.env.VITE_APP_BASE_URL as string | undefined) ??
  "http://localhost:9005"
).replace(/\/+$/, "");

const getJson = async (
  path: string,
  signal?: AbortSignal
): Promise<unknown> => {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { Accept: "application/json" },
      signal,
    });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
};

// The booking API does not populate the professional's name or rating, so
// they are read from existing endpoints:
//   GET /provider/:providerId        -> data.userId.fullname
//   GET /review/provider/:providerId -> getProviderReviews() in review.api.ts
const loadProviderInfo = async (
  providerIds: string[],
  signal?: AbortSignal
): Promise<Record<string, ProviderInfo>> => {
  const entries = await Promise.all(
    providerIds.map(async (id): Promise<[string, ProviderInfo]> => {
      const [providerBody, reviewResult] = await Promise.all([
        getJson(`/provider/${id}`, signal),
        getProviderReviews(id).then(
          (body: unknown) => ({ body, failed: false }),
          () => ({ body: null as unknown, failed: true })
        ),
      ]);

      let name: string | undefined;
      if (isRecord(providerBody) && isRecord(providerBody.data)) {
        const owner = providerBody.data.userId;
        const fullname = isRecord(owner) ? owner.fullname : undefined;
        name =
          typeof fullname === "string" && fullname.trim()
            ? fullname.trim()
            : undefined;
      }

      const { reviews, average, count } = normalizeReviewsResponse(
        reviewResult.body
      );

      return [
        id,
        {
          name,
          rating: average,
          reviewCount: count,
          reviews,
          reviewsError: reviewResult.failed,
        },
      ];
    })
  );

  return Object.fromEntries(entries);
};

const formatDate = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
};

// Review dates: empty string when missing/invalid (never crashes)
const formatReviewDate = (value?: string): string => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : formatDate(value);
};

// Real professional name first; email only if no name exists
const resolveProviderName = (booking: Booking, info?: ProviderInfo): string =>
  info?.name?.trim() ||
  booking.providerId?.name?.trim() ||
  booking.providerId?.email ||
  "Professional";

const resolveProviderAvatar = (booking: Booking): string | null => {
  const filename = booking.providerId?.profileImage?.filename;
  return resolveAssetUrl(
    filename ? `uploads/images/provider/${filename}` : null
  );
};

const ratingLabel = (rating: number): string =>
  RATING_LABELS[Math.round(rating)] ?? "";

// Newest first; reviews without a date yet (just submitted) come first
const reviewTime = (r: ReviewRecord): number => {
  const t = r.createdAt ? new Date(r.createdAt).getTime() : NaN;
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
};
const byNewest = (a: ReviewRecord, b: ReviewRecord): number =>
  reviewTime(b) - reviewTime(a);

// Star counts calculated ONLY from the reviews that were loaded
const buildDistribution = (reviews: ReviewRecord[]) =>
  [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Math.round(r.rating) === star).length,
  }));

// Decides whether a review belongs to the logged-in user:
//  1. review has a customer id -> must equal the user's id
//  2. else review has an email -> must equal the user's email
//  3. else its booking must be one of the user's own bookings
const createOwnershipMatcher =
  (opts: {
    userId?: string;
    email?: string | null;
    bookingIds?: ReadonlySet<string>;
  }) =>
  (review: ReviewRecord): boolean => {
    if (review.customerId && opts.userId) {
      return review.customerId === opts.userId;
    }
    if (review.customerEmail && opts.email) {
      return review.customerEmail.toLowerCase() === opts.email.toLowerCase();
    }
    return Boolean(review.bookingId && opts.bookingIds?.has(review.bookingId));
  };

const STATUS_STYLES: Record<
  BookingStatus,
  { classes: string; Icon: IconType }
> = {
  Pending: {
    classes: "bg-amber-50 text-amber-700 border-amber-200",
    Icon: Hourglass,
  },
  Accepted: {
    classes: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Icon: CheckCircle2,
  },
  Rejected: {
    classes: "bg-red-50 text-red-700 border-red-200",
    Icon: XCircle,
  },
  Completed: {
    classes: "bg-blue-50 text-blue-700 border-blue-200",
    Icon: CheckCircle2,
  },
  Cancelled: {
    classes: "bg-gray-100 text-gray-600 border-gray-200",
    Icon: Ban,
  },
};

// ==========================================
// SMALL COMPONENTS
// ==========================================

const Logo = () => (
  <span className="text-2xl font-extrabold tracking-tight">
    <span className="text-[#16233B]">Sewa</span>
    <span className="text-[#E3A73A]">Khoj</span>
  </span>
);

// Same minimal avatar as Header.tsx: backend image when valid,
// otherwise a simple UserRound icon
const UserAvatar = ({
  src,
  size = "sm",
}: {
  src: string | null;
  size?: "sm" | "md";
}) => {
  const [failed, setFailed] = useState(false);
  const box = size === "md" ? "h-10 w-10" : "h-8 w-8";

  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        onError={() => setFailed(true)}
        className={`${box} shrink-0 rounded-full object-cover`}
      />
    );
  }

  return (
    <span
      className={`${box} flex shrink-0 items-center justify-center rounded-full bg-[#F7F4EE] text-[#16233B]`}
    >
      <UserRound size={size === "md" ? 20 : 17} strokeWidth={1.75} />
    </span>
  );
};

// Provider average rating (small, with the number beside it)
const RatingStars = ({ rating }: { rating: number }) => {
  const value = Number.isFinite(rating) ? Math.min(Math.max(rating, 0), 5) : 0;
  const filled = Math.floor(value);

  return (
    <div
      className="flex items-center gap-1.5"
      role="img"
      aria-label={`Rating ${value.toFixed(1)} out of 5`}
    >
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={14}
            className={
              star <= filled
                ? "fill-[#E3A73A] text-[#E3A73A]"
                : "fill-none text-gray-300"
            }
          />
        ))}
      </div>
      <span className="text-xs font-medium text-gray-500">
        {value.toFixed(1)}
      </span>
    </div>
  );
};

// Stars only (used by review cards); sized per use
const ReviewStars = ({
  rating,
  size = 16,
}: {
  rating: number;
  size?: number;
}) => {
  const value = Number.isFinite(rating) ? Math.min(Math.max(rating, 0), 5) : 0;
  const filled = Math.round(value);

  return (
    <div
      className="flex items-center gap-0.5"
      role="img"
      aria-label={`${value.toFixed(1)} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={
            star <= filled
              ? "fill-[#E3A73A] text-[#E3A73A]"
              : "fill-none text-gray-300"
          }
        />
      ))}
    </div>
  );
};

const StatusBadge = ({ status }: { status: BookingStatus }) => {
  const { classes, Icon } = STATUS_STYLES[status] ?? STATUS_STYLES.Cancelled;
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${classes}`}
    >
      <Icon size={13} />
      {status}
    </span>
  );
};

const StatCard = ({
  label,
  value,
  Icon,
  accent,
}: {
  label: string;
  value: number;
  Icon: IconType;
  accent: string;
}) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-5">
    <div
      className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}
    >
      <Icon size={20} />
    </div>
    <p className="mt-4 text-3xl font-bold text-[#16233B]">{value}</p>
    <p className="mt-1 text-sm text-gray-500">{label}</p>
  </div>
);

const DetailItem = ({
  label,
  value,
  Icon,
  capitalize = false,
}: {
  label: string;
  value: string;
  Icon: IconType;
  capitalize?: boolean;
}) => (
  <div className="flex items-start gap-3 rounded-xl bg-[#F7F4EE] p-3">
    <Icon size={18} className="mt-0.5 shrink-0 text-[#16233B]" />
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p
        className={`mt-0.5 break-words text-sm font-semibold text-[#16233B] ${
          capitalize ? "capitalize" : ""
        }`}
      >
        {value}
      </p>
    </div>
  </div>
);

const FindProfessionalButton = ({
  className = "",
}: {
  className?: string;
}) => {
  if (!FIND_PROFESSIONAL_ROUTE) return null;
  return (
    <Link
      to={FIND_PROFESSIONAL_ROUTE}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-[#16233B] px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#1f3256] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A] motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${className}`}
    >
      <Search size={16} />
      Find a Professional
    </Link>
  );
};

// ==========================================
// REVIEW UI (card, summary, skeleton, modal, section)
// ==========================================

// Reviewer avatar: image -> initial letter -> icon
const ReviewAvatar = ({
  src,
  name,
  size = 40,
}: {
  src?: string | null;
  name?: string;
  size?: number;
}) => {
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size };

  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        style={style}
        onError={() => setFailed(true)}
        className="shrink-0 rounded-full object-cover"
      />
    );
  }

  const initial = name?.trim().charAt(0).toUpperCase();

  return (
    <span
      style={style}
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-full bg-[#F7F4EE] text-sm font-semibold text-[#16233B]"
    >
      {initial ? initial : <UserRound size={size * 0.5} strokeWidth={1.75} />}
    </span>
  );
};

// One review. `featured` = the large "Your Review" card at the top of a section
const ReviewCard = ({
  review,
  own = false,
  ownName,
  providerName,
  clamp = false,
  featured = false,
}: {
  review: ReviewRecord;
  own?: boolean;
  ownName?: string;
  providerName?: string;
  clamp?: boolean;
  featured?: boolean;
}) => {
  const name = own
    ? ownName || review.customerName || "You"
    : review.customerName || "Customer";
  const date = formatReviewDate(review.createdAt);
  const dateText = date
    ? featured
      ? `Reviewed on ${date}`
      : date
    : review.id.startsWith("local-")
      ? "Just now"
      : "";
  const label = ratingLabel(review.rating);

  return (
    <article
      className={`rounded-2xl border p-4 transition-colors duration-200 motion-reduce:transition-none ${
        own
          ? "border-[#E3A73A]/40 bg-[#FFFBF3]"
          : "border-gray-200 bg-white hover:border-gray-300"
      } ${featured ? "sm:p-5" : ""}`}
    >
      {featured && (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#B9801A]">
              <Sparkles size={13} aria-hidden="true" />
              Your Review
            </p>
            {providerName && (
              <p className="mt-1 break-words text-sm text-gray-500">
                For{" "}
                <span className="font-semibold text-[#16233B]">
                  {providerName}
                </span>
              </p>
            )}
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
            <CheckCircle size={12} aria-hidden="true" />
            Reviewed
          </span>
        </div>
      )}

      <div className="flex items-start gap-3">
        <ReviewAvatar
          key={review.customerAvatar ?? "none"}
          src={review.customerAvatar}
          name={name}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="max-w-full truncate text-sm font-semibold text-[#16233B]">
              {name}
            </p>
            {own && !featured && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#E3A73A]/15 px-2 py-0.5 text-[11px] font-semibold text-[#8A5F10]">
                <Sparkles size={11} aria-hidden="true" />
                Your Review
              </span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <ReviewStars rating={review.rating} size={featured ? 18 : 14} />
            <span className="text-sm font-bold tabular-nums text-[#16233B]">
              {review.rating.toFixed(1)}
            </span>
            {review.rating >= 4 && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                <ThumbsUp size={12} aria-hidden="true" />
                {label}
              </span>
            )}
          </div>
        </div>

        {dateText && (
          <p className="shrink-0 text-xs text-gray-400">{dateText}</p>
        )}
      </div>

      {review.comment && (
        <p
          className={`mt-3 whitespace-pre-line break-words text-sm leading-relaxed text-gray-700 ${
            clamp ? "line-clamp-3" : ""
          }`}
        >
          {featured ? `“${review.comment}”` : review.comment}
        </p>
      )}
    </article>
  );
};

const ReviewSkeleton = () => (
  <div
    className="animate-pulse rounded-2xl border border-gray-200 bg-white p-4"
    aria-hidden="true"
  >
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-full bg-gray-200" />
      <div className="space-y-2">
        <div className="h-3.5 w-28 rounded bg-gray-200" />
        <div className="h-3 w-24 rounded bg-gray-100" />
      </div>
    </div>
    <div className="mt-3 space-y-2">
      <div className="h-3.5 w-full rounded bg-gray-100" />
      <div className="h-3.5 w-2/3 rounded bg-gray-100" />
    </div>
  </div>
);

const ReviewSectionSkeleton = () => (
  <div role="status" aria-label="Loading reviews" className="space-y-3">
    <div className="h-5 w-40 animate-pulse rounded bg-gray-200" />
    <ReviewSkeleton />
    <ReviewSkeleton />
  </div>
);

// Big rating + star distribution (distribution uses loaded reviews only)
const RatingSummary = ({
  average,
  count,
  reviews,
}: {
  average: number;
  count: number;
  reviews: ReviewRecord[];
}) => {
  const distribution = buildDistribution(reviews);

  return (
    <div className="grid gap-5 rounded-2xl border border-gray-200 bg-[#F7F4EE] p-5 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-8">
      <div>
        <p className="flex items-baseline gap-1.5 text-5xl font-bold tabular-nums text-[#16233B]">
          {average.toFixed(1)}
          <Star
            size={26}
            aria-hidden="true"
            className="translate-y-0.5 fill-[#E3A73A] text-[#E3A73A]"
          />
        </p>
        <p className="mt-1 text-base font-semibold text-[#16233B]">
          {ratingLabel(average)}
        </p>
        <p className="text-sm text-gray-500">
          Based on {count} {count === 1 ? "review" : "reviews"}
        </p>
      </div>

      <div>
        <ul className="space-y-1.5" aria-label="Rating distribution">
          {distribution.map(({ star, count: n }) => {
            const pct = reviews.length ? (n / reviews.length) * 100 : 0;
            return (
              <li key={star} className="flex items-center gap-2 text-xs">
                <span className="w-6 shrink-0 tabular-nums text-gray-600">
                  {star} ★
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-[#E3A73A] transition-[width] duration-500 motion-reduce:transition-none"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right tabular-nums text-gray-500">
                  {n}
                </span>
              </li>
            );
          })}
        </ul>
        {reviews.length < count && (
          <p className="mt-2 text-[11px] text-gray-400">
            Distribution is based on the {reviews.length} reviews loaded.
          </p>
        )}
      </div>
    </div>
  );
};

// View All Reviews: bottom sheet on mobile, right drawer from `sm` up.
// Rendered in a portal so a transformed parent (hover lift on booking
// cards) can never break `position: fixed`.
const AllReviewsModal = ({
  providerName,
  reviews,
  average,
  count,
  isOwnReview,
  currentUserName,
  onClose,
}: {
  providerName: string;
  reviews: ReviewRecord[];
  average: number;
  count: number;
  isOwnReview: (review: ReviewRecord) => boolean;
  currentUserName?: string;
  onClose: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const requestClose = useCallback(() => {
    setOpen(false);
    timer.current = window.setTimeout(onClose, 200);
  }, [onClose]);

  // animate in, lock page scroll, move focus in / restore it on close
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => {
      setOpen(true);
      dialogRef.current?.focus();
    });
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer.current);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, []);

  // Escape closes; Tab stays inside the dialog
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        requestClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [requestClose]);

  const sorted = useMemo(() => [...reviews].sort(byNewest), [reviews]);

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center bg-[#16233B]/50 transition-opacity duration-200 motion-reduce:transition-none sm:items-stretch sm:justify-end ${
        open ? "opacity-100" : "opacity-0"
      }`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="all-reviews-title"
        tabIndex={-1}
        className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-xl outline-none transition-transform duration-200 ease-out motion-reduce:transition-none sm:max-h-full sm:max-w-lg sm:rounded-none sm:rounded-l-3xl ${
          open
            ? "translate-y-0 sm:translate-x-0"
            : "translate-y-full sm:translate-y-0 sm:translate-x-full"
        }`}
      >
        {/* HEADER (stays fixed) */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2
              id="all-reviews-title"
              className="text-lg font-bold text-[#16233B]"
            >
              Customer Reviews
            </h2>
            <p className="mt-0.5 break-words text-sm text-gray-500">
              {providerName}
            </p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close reviews"
            className="rounded-lg p-2 text-gray-400 transition-colors duration-200 hover:bg-[#F7F4EE] hover:text-[#16233B] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A]"
          >
            <X size={20} />
          </button>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
          {sorted.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E3A73A]/15 text-[#E3A73A]">
                <Star
                  size={26}
                  className="fill-[#E3A73A]/30"
                  aria-hidden="true"
                />
              </div>
              <h3 className="mt-4 text-lg font-bold text-[#16233B]">
                No reviews yet
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Be the first customer to review this provider.
              </p>
            </div>
          ) : (
            <>
              <RatingSummary
                average={average}
                count={Math.max(count, sorted.length)}
                reviews={sorted}
              />
              <div className="space-y-3">
                {sorted.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    own={isOwnReview(review)}
                    ownName={currentUserName}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

// The review section shown inside every booking card
const ReviewSection = ({
  providerName,
  data,
  isOwnReview,
  currentUserName,
  bookingId,
  hasReviewed = false,
  onWriteReview,
  onRetry,
}: {
  providerName: string;
  data: ProviderReviewsState;
  isOwnReview: (review: ReviewRecord) => boolean;
  currentUserName?: string;
  /** "Your Review" = the review written for this booking */
  bookingId: string;
  /** Booking says it was reviewed (fallback if the text isn't loaded) */
  hasReviewed?: boolean;
  /** Provided ONLY when the customer can write a review here */
  onWriteReview?: () => void;
  onRetry?: () => void;
}) => {
  const [showAll, setShowAll] = useState(false);
  const headingId = useId();
  const { reviews, average, count, loading, error } = data;
  const total = Math.max(count, reviews.length);

  const { myReview, others } = useMemo(
    () => ({
      myReview: reviews.find(
        (r) =>
          isOwnReview(r) && (!r.bookingId || r.bookingId === bookingId)
      ),
      others: reviews.filter((r) => !isOwnReview(r)).sort(byNewest),
    }),
    [reviews, isOwnReview, bookingId]
  );

  if (loading) return <ReviewSectionSkeleton />;

  if (error && reviews.length === 0) {
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        <AlertCircle size={18} aria-hidden="true" />
        <span className="flex-1">Reviews couldn't be loaded right now.</span>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 font-semibold transition-colors hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A]"
          >
            <RefreshCw size={14} aria-hidden="true" />
            Retry
          </button>
        )}
      </div>
    );
  }

  const writeButton = onWriteReview && (
    <button
      type="button"
      onClick={onWriteReview}
      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#E3A73A] px-5 py-3 text-sm font-semibold text-[#16233B] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16233B] focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:w-auto"
    >
      <Star size={17} className="fill-none" aria-hidden="true" />
      Write a Review
    </button>
  );

  const preview = others.slice(0, PREVIEW_COUNT);

  return (
    <section aria-labelledby={headingId} className="space-y-4">
      {/* HEADER + OVERALL RATING */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <h3 id={headingId} className="text-lg font-bold text-[#16233B]">
          Customer Reviews
        </h3>
        {total > 0 && (
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="text-2xl font-bold tabular-nums text-[#16233B]">
              {average.toFixed(1)}
            </span>
            <ReviewStars rating={average} size={16} />
            <span className="text-sm font-medium text-[#16233B]">
              {ratingLabel(average)}
            </span>
            <span className="text-sm text-gray-500">
              · {total} {total === 1 ? "review" : "reviews"}
            </span>
          </div>
        )}
      </div>

      {total === 0 && !myReview ? (
        /* NO REVIEWS AT ALL */
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#E3A73A]/15 text-[#E3A73A]">
            <Star size={22} className="fill-[#E3A73A]/30" aria-hidden="true" />
          </div>
          <p className="mt-3 text-base font-bold text-[#16233B]">
            No reviews yet
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Be the first customer to review this provider.
          </p>
          {!hasReviewed && writeButton}
        </div>
      ) : (
        <>
          {/* YOUR REVIEW */}
          {myReview ? (
            <ReviewCard
              review={myReview}
              own
              featured
              ownName={currentUserName}
              providerName={providerName}
            />
          ) : hasReviewed ? (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
              <CheckCircle
                size={18}
                className="shrink-0 text-emerald-600"
                aria-hidden="true"
              />
              <p className="text-sm text-[#16233B]">
                <span className="font-semibold">Reviewed.</span> Thanks for
                sharing your experience!
              </p>
            </div>
          ) : onWriteReview ? (
            <div className="rounded-2xl border border-[#E3A73A]/30 bg-[#F7F4EE] p-5">
              <p className="text-base font-bold text-[#16233B]">
                You haven't reviewed this provider yet.
              </p>
              <p className="mt-0.5 text-sm text-gray-500">
                Your feedback helps other customers.
              </p>
              {writeButton}
            </div>
          ) : null}

          {/* OTHER REVIEWS PREVIEW */}
          {preview.length > 0 && (
            <div>
              <h4 className="mb-3 text-sm font-bold text-[#16233B]">
                Other Reviews
              </h4>
              <div className="space-y-3">
                {preview.map((review) => (
                  <ReviewCard key={review.id} review={review} clamp />
                ))}
              </div>
            </div>
          )}

          {/* VIEW ALL */}
          {reviews.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="group inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-[#16233B] transition-all duration-200 hover:border-[#16233B] hover:bg-[#F7F4EE] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A] sm:w-auto"
            >
              View All Reviews
              <ChevronRight
                size={16}
                aria-hidden="true"
                className="transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
              />
            </button>
          )}
        </>
      )}

      {showAll && (
        <AllReviewsModal
          providerName={providerName}
          reviews={reviews}
          average={average}
          count={total}
          isOwnReview={isOwnReview}
          currentUserName={currentUserName}
          onClose={() => setShowAll(false)}
        />
      )}
    </section>
  );
};

// ==========================================
// "MY REVIEWS" GRID (all reviews written by this customer)
// ==========================================

// Compact card used in the "My Reviews" grid
const MyReviewCard = ({ review }: { review: MyReview }) => {
  const label = ratingLabel(review.rating);

  return (
    <article className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <div className="flex items-center gap-3">
        <UserAvatar
          key={review.providerAvatar ?? "none"}
          src={review.providerAvatar}
          size="md"
        />
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-[#16233B]">
            {review.providerName}
          </h3>
          <p className="truncate text-xs capitalize text-gray-500">
            {review.service}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <ReviewStars rating={review.rating} size={16} />
        <span className="text-sm font-bold tabular-nums text-[#16233B]">
          {review.rating.toFixed(1)}
        </span>
        {label && <span className="text-xs text-gray-500">{label}</span>}
      </div>

      {review.comment ? (
        <p className="mt-3 flex-1 whitespace-pre-line break-words rounded-xl bg-[#F7F4EE] p-3.5 text-sm leading-relaxed text-[#16233B]">
          “{review.comment}”
        </p>
      ) : (
        <div className="flex-1" />
      )}

      {review.createdAt && (
        <p className="mt-3 text-xs text-gray-400">
          {formatDate(review.createdAt)}
        </p>
      )}
    </article>
  );
};

const MyReviewsSummary = ({ reviews }: { reviews: MyReview[] }) => {
  const count = reviews.length;
  const average = count
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / count
    : 0;

  return (
    <div className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-gray-200 bg-gray-200 shadow-sm">
      <div className="bg-white p-4 sm:p-5">
        <p className="text-3xl font-bold tabular-nums text-[#16233B]">
          {count}
        </p>
        <p className="mt-1 text-sm text-gray-500">
          {count === 1 ? "Review Given" : "Reviews Given"}
        </p>
      </div>
      <div className="bg-white p-4 sm:p-5">
        <p className="text-3xl font-bold tabular-nums text-[#16233B]">
          {average.toFixed(1)}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <ReviewStars rating={average} size={14} />
          <span className="text-sm text-gray-500">Average Rating Given</span>
        </div>
      </div>
    </div>
  );
};

const ReviewEmptyState = () => (
  <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center shadow-sm">
    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#E3A73A]/15 text-[#E3A73A]">
      <Star size={30} className="fill-[#E3A73A]/30" aria-hidden="true" />
    </div>
    <h3 className="mt-5 text-xl font-bold text-[#16233B]">No reviews yet</h3>
    <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
      Complete a service and share your experience with the GharSewa
      community.
    </p>
    <FindProfessionalButton className="mt-6" />
  </div>
);

const ReviewCardSkeleton = () => (
  <div
    className="animate-pulse rounded-2xl border border-gray-200 bg-white p-5"
    aria-hidden="true"
  >
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-full bg-gray-200" />
      <div className="space-y-2">
        <div className="h-3.5 w-28 rounded bg-gray-200" />
        <div className="h-3 w-16 rounded bg-gray-100" />
      </div>
    </div>
    <div className="mt-4 h-4 w-32 rounded bg-gray-200" />
    <div className="mt-3 space-y-2">
      <div className="h-3.5 w-full rounded bg-gray-100" />
      <div className="h-3.5 w-3/4 rounded bg-gray-100" />
    </div>
    <div className="mt-4 h-3 w-20 rounded bg-gray-100" />
  </div>
);

const MyReviewsSection = ({
  reviews,
  loading,
}: {
  reviews: MyReview[];
  loading: boolean;
}) => (
  <section className="mt-12" aria-labelledby="my-reviews-heading">
    <div className="mb-5">
      <h2
        id="my-reviews-heading"
        className="text-2xl font-bold text-[#16233B]"
      >
        My Reviews
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        Your feedback and experiences with GharSewa professionals.
      </p>
    </div>

    {loading ? (
      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        role="status"
        aria-label="Loading reviews"
      >
        <ReviewCardSkeleton />
        <ReviewCardSkeleton />
        <ReviewCardSkeleton />
      </div>
    ) : reviews.length === 0 ? (
      <ReviewEmptyState />
    ) : (
      <>
        <MyReviewsSummary reviews={reviews} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review) => (
            <MyReviewCard key={review.bookingId} review={review} />
          ))}
        </div>
      </>
    )}
  </section>
);

// ==========================================
// BOOKING CARD
// ==========================================

const BookingCard = ({
  booking,
  info,
  reviews,
  isOwnReview,
  currentUserName,
  onRate,
  onRetry,
}: {
  booking: Booking;
  info?: ProviderInfo;
  reviews: ReviewRecord[];
  isOwnReview: (review: ReviewRecord) => boolean;
  currentUserName?: string;
  onRate: (booking: Booking) => void;
  onRetry: (providerId: string) => void;
}) => {
  const provider = booking.providerId;

  const providerName = resolveProviderName(booking, info);
  const providerRating = info?.rating ?? provider?.rating ?? 0;
  const providerAvatar = resolveProviderAvatar(booking);

  const reviewData: ProviderReviewsState = {
    reviews,
    average: info?.rating ?? 0,
    count: Math.max(info?.reviewCount ?? 0, reviews.length),
    // Provider data (and its reviews) still loading for this booking
    loading: Boolean(provider?._id) && !info,
    error: Boolean(info?.reviewsError),
  };

  // "Write a Review" only for completed, not-yet-reviewed bookings
  const canWrite =
    booking.status === "Completed" &&
    !booking.hasReview &&
    !reviews.some(
      (r) => isOwnReview(r) && (!r.bookingId || r.bookingId === booking._id)
    );

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-6">
      {/* TOP */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-xl font-bold capitalize text-[#16233B]">
            {booking.service}
          </h3>
          <div className="mt-3 flex items-center gap-3">
            <UserAvatar
              key={providerAvatar ?? "none"}
              src={providerAvatar}
              size="md"
            />
            <div className="min-w-0">
              <p className="break-words text-sm font-semibold text-[#16233B]">
                {providerName}
              </p>
              <p className="text-xs text-gray-500">Professional</p>
              <div className="mt-1">
                <RatingStars rating={providerRating} />
              </div>
            </div>
          </div>
        </div>

        <StatusBadge status={booking.status} />
      </div>

      {/* DETAILS */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <DetailItem
          label="Service"
          value={booking.service}
          Icon={Briefcase}
          capitalize
        />
        <DetailItem
          label="Date"
          value={formatDate(booking.bookingDate)}
          Icon={CalendarDays}
        />
        <DetailItem label="Time" value={booking.bookingTime} Icon={Clock} />
        <DetailItem
          label="Price"
          value={`NPR ${booking.price.toLocaleString()}`}
          Icon={Banknote}
        />
      </div>

      {/* LOCATION */}
      <div className="mt-4 flex items-start gap-3 rounded-xl border border-gray-200 p-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F26B5E]/10 text-[#F26B5E]">
          <MapPin size={18} />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Service Location
          </p>
          <p className="mt-0.5 break-words text-sm font-medium text-[#16233B]">
            {booking.address}
          </p>
        </div>
      </div>

      {/* REQUIREMENT */}
      <div className="mt-4 rounded-xl bg-[#F7F4EE] p-4">
        <p className="text-sm font-semibold text-[#16233B]">
          Your Requirement
        </p>
        <p className="mt-1.5 whitespace-pre-line break-words text-sm leading-relaxed text-gray-600">
          {booking.description}
        </p>
      </div>

      {/* REVIEWS */}
      {provider?._id && (
        <div className="mt-5 border-t border-gray-100 pt-5">
          <ReviewSection
            providerName={providerName}
            data={reviewData}
            isOwnReview={isOwnReview}
            currentUserName={currentUserName}
            bookingId={booking._id}
            hasReviewed={booking.hasReview}
            onWriteReview={canWrite ? () => onRate(booking) : undefined}
            onRetry={() => onRetry(provider._id as string)}
          />
        </div>
      )}
    </article>
  );
};

// ==========================================
// REVIEW MODAL (stars start at 0 / empty)
// ==========================================

type ReviewModalProps = {
  bookingId: string;
  providerName: string;
  onClose: () => void;
  onSuccess: (result: ReviewResult) => void;
};

const ReviewModal = ({
  bookingId,
  providerName,
  onClose,
  onSuccess,
}: ReviewModalProps) => {
  // Stars start EMPTY: 0 selected until the customer chooses
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement | null>(null);

  const activeStars = hovered || rating;
  const trimmedComment = comment.trim();
  const canSubmit =
    rating >= 1 && trimmedComment.length >= MIN_COMMENT && !submitting;

  // Close with Escape (unless a request is in progress)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, submitting]);

  // Lock page scroll while the modal is open
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (rating < 1) {
      setError("Please select a star rating.");
      return;
    }

    if (trimmedComment.length < MIN_COMMENT) {
      setError(`Please write at least ${MIN_COMMENT} characters.`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await createReview(bookingId, rating, trimmedComment);
      onSuccess({ rating, comment: trimmedComment });
    } catch (err) {
      setError(
        getErrorMessage(err, "Could not submit your review. Please try again.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#16233B]/50 p-4 sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-modal-title"
        tabIndex={-1}
        className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl outline-none"
      >
        {/* HEADER */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2
              id="review-modal-title"
              className="text-xl font-bold text-[#16233B]"
            >
              Rate your professional
            </h2>
            <p className="mt-1 break-words text-sm text-gray-500">
              How was your experience with{" "}
              <span className="font-semibold text-[#16233B]">
                {providerName}
              </span>
              ?
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            className="rounded-lg p-1.5 text-gray-400 transition-colors duration-200 hover:bg-[#F7F4EE] hover:text-[#16233B] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A] disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5">
          {/* STARS */}
          <div>
            <div
              className="flex items-center gap-1"
              role="radiogroup"
              aria-label="Rating"
              onMouseLeave={() => setHovered(0)}
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  role="radio"
                  aria-checked={rating === star}
                  aria-label={`${star} star${star > 1 ? "s" : ""}`}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHovered(star)}
                  onFocus={() => setHovered(star)}
                  onBlur={() => setHovered(0)}
                  className="rounded p-0.5 transition-transform duration-150 hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A]"
                >
                  <Star
                    size={32}
                    className={
                      star <= activeStars
                        ? "fill-[#E3A73A] text-[#E3A73A]"
                        : "fill-none text-gray-300"
                    }
                  />
                </button>
              ))}
            </div>

            <p className="mt-2 h-5 text-sm text-gray-500" aria-live="polite">
              {activeStars >= 1
                ? RATING_LABELS[activeStars]
                : "Select a rating"}
            </p>
          </div>

          {/* COMMENT */}
          <div className="mt-4">
            <label
              htmlFor="review-comment"
              className="text-sm font-semibold text-[#16233B]"
            >
              Your review
            </label>
            <textarea
              id="review-comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              maxLength={MAX_COMMENT}
              rows={4}
              placeholder="Share what went well and what could be better."
              className="mt-2 w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#16233B] placeholder:text-gray-400 focus:border-[#E3A73A] focus:outline-none focus:ring-2 focus:ring-[#E3A73A]/30"
            />
            <p className="mt-1 text-right text-xs text-gray-400">
              {comment.length}/{MAX_COMMENT}
            </p>
          </div>

          {/* ERROR */}
          {error && (
            <p
              role="alert"
              className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          {/* ACTIONS */}
          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-[#16233B] transition-colors duration-200 hover:bg-[#F7F4EE] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A] disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!canSubmit}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#E3A73A] px-5 py-2.5 text-sm font-semibold text-[#16233B] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16233B] focus-visible:ring-offset-2 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none"
            >
              <Star size={16} className="fill-none" />
              {submitting ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const BookingSkeleton = () => (
  <div
    className="animate-pulse rounded-2xl border border-gray-200 bg-white p-5 sm:p-6"
    aria-hidden="true"
  >
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-3">
        <div className="h-6 w-40 rounded-lg bg-gray-200" />
        <div className="h-4 w-56 rounded-lg bg-gray-100" />
      </div>
      <div className="h-7 w-24 rounded-full bg-gray-200" />
    </div>
    <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-16 rounded-xl bg-gray-100" />
      ))}
    </div>
    <div className="mt-4 h-16 rounded-xl bg-gray-100" />
    <div className="mt-4 h-24 rounded-xl bg-gray-100" />
  </div>
);

// ==========================================
// CUSTOMER DASHBOARD
// ==========================================

export const CustomerDashboardPage = () => {
  const navigate = useNavigate();

  // STATES
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(
    null
  );

  // Professional names / ratings / reviews keyed by provider id
  const [providerInfo, setProviderInfo] = useState<
    Record<string, ProviderInfo>
  >({});

  // Reviews just submitted in this session (shown instantly, replaced by
  // the server copy once it is reloaded)
  const [localReviews, setLocalReviews] = useState<
    Record<string, ReviewRecord>
  >({});

  // Cached user first (instant), then refreshed from /auth/me
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());

  const displayName = user?.fullname || "Customer";
  const displayContact = user?.email || user?.phone || null;
  const avatarSrc = resolveAssetUrl(user?.image);

  // LOAD CURRENT USER
  useEffect(() => {
    const controller = new AbortController();
    const token = localStorage.getItem("access_token");

    if (!token) {
      return;
    }

    const loadUser = async () => {
      try {
        const fresh = await getCurrentUser(token, controller.signal);
        setUser((current) => ({ ...current, ...fresh }));
        saveStoredUser(fresh);
      } catch (error) {
        if (error instanceof UnauthorizedError) {
          clearAuth();
          navigate("/login");
          return;
        }
        // Keep showing cached name / "Customer" on other errors
        if (!controller.signal.aborted) {
          console.error("Failed to load current user:", error);
        }
      }
    };

    loadUser();

    return () => controller.abort();
  }, [navigate]);

  // LOAD CUSTOMER BOOKINGS
  useEffect(() => {
    const loadBookings = async () => {
      try {
        const response = await getCustomerBookings();
        setBookings(response?.data || []);
      } catch (error) {
        console.error("Failed to load customer bookings:", error);
      } finally {
        setLoading(false);
      }
    };

    loadBookings();
  }, []);

  // LOAD PROFESSIONAL NAMES + RATINGS + REVIEWS
  const providerIdsKey = useMemo(
    () =>
      Array.from(
        new Set(
          bookings
            .map((b) => b.providerId?._id)
            .filter((id): id is string => Boolean(id))
        )
      ).join(","),
    [bookings]
  );

  useEffect(() => {
    if (!providerIdsKey) return;

    const controller = new AbortController();

    loadProviderInfo(providerIdsKey.split(","), controller.signal).then(
      (result) => {
        if (!controller.signal.aborted) {
          setProviderInfo((current) => ({ ...current, ...result }));
        }
      }
    );

    return () => controller.abort();
  }, [providerIdsKey]);

  // Retry button inside a booking card's review section
  const retryProvider = (providerId: string) => {
    loadProviderInfo([providerId]).then((info) =>
      setProviderInfo((current) => ({ ...current, ...info }))
    );
  };

  // LOGOUT
  const handleLogout = () => {
    clearAuth();
    navigate("/login");
  };

  // REVIEW SUCCESS
  const handleReviewSuccess = (result: ReviewResult) => {
    if (!selectedBooking) {
      return;
    }

    const bookingId = selectedBooking._id;

    setBookings((currentBookings) =>
      currentBookings.map((booking) =>
        booking._id === bookingId ? { ...booking, hasReview: true } : booking
      )
    );

    // Show the review immediately (date appears once the server copy loads)
    setLocalReviews((current) => ({
      ...current,
      [bookingId]: {
        id: `local-${bookingId}`,
        bookingId,
        customerId: "",
        rating: result.rating,
        comment: result.comment,
        createdAt: "",
      },
    }));

    // Refresh this professional's rating + reviews after the new review
    const reviewedProviderId = selectedBooking.providerId?._id;
    if (reviewedProviderId) {
      loadProviderInfo([reviewedProviderId]).then((info) =>
        setProviderInfo((current) => ({ ...current, ...info }))
      );
    }

    setSelectedBooking(null);
  };

  // STATS (from real bookings)
  const stats = useMemo(() => {
    const count = (status: BookingStatus) =>
      bookings.filter((b) => b.status === status).length;

    return {
      total: bookings.length,
      pending: count("Pending"),
      accepted: count("Accepted"),
      completed: count("Completed"),
    };
  }, [bookings]);

  // THE LOGGED-IN CUSTOMER'S OWN REVIEWS
  // A review is only used when its bookingId matches one of this customer's
  // bookings. If the review also carries customer info, it must match the
  // logged-in user too, so another customer's review is never shown.
  const myReviews = useMemo<MyReview[]>(() => {
    const currentUserId = idOf(user);
    const items: MyReview[] = [];

    for (const booking of bookings) {
      const providerId = booking.providerId?._id;
      const info = providerId ? providerInfo[providerId] : undefined;

      const serverReview = info?.reviews.find(
        (r) =>
          r.bookingId === booking._id &&
          (!r.customerId || !currentUserId || r.customerId === currentUserId)
      );

      const review = serverReview ?? localReviews[booking._id];
      if (!review) continue;

      items.push({
        ...review,
        bookingId: booking._id,
        service: booking.service,
        providerName: resolveProviderName(booking, info),
        providerAvatar: resolveProviderAvatar(booking),
      });
    }

    return items;
  }, [bookings, providerInfo, localReviews, user]);

  // Newest first; reviews without a date yet (just submitted) come first
  const sortedMyReviews = useMemo(
    () => [...myReviews].sort(byNewest),
    [myReviews]
  );

  // Ownership check used by every review section / modal
  const isOwnReview = useMemo(
    () =>
      createOwnershipMatcher({
        userId: idOf(user),
        email: user?.email,
        bookingIds: new Set(bookings.map((b) => b._id)),
      }),
    [user, bookings]
  );

  // Server reviews per provider (+ my just-submitted review until the
  // refreshed server copy arrives)
  const reviewsByProvider = useMemo(() => {
    const map: Record<string, ReviewRecord[]> = {};
    for (const [pid, info] of Object.entries(providerInfo)) {
      map[pid] = [...info.reviews];
    }
    for (const b of bookings) {
      const pid = b.providerId?._id;
      const local = localReviews[b._id];
      if (!pid || !local) continue;
      const list = map[pid] ?? [];
      if (!list.some((r) => r.bookingId === b._id)) list.push(local);
      map[pid] = list;
    }
    return map;
  }, [providerInfo, bookings, localReviews]);

  const reviewsLoading =
    loading ||
    bookings.some((b) => b.providerId?._id && !providerInfo[b.providerId._id]);

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <main className="min-h-screen bg-[#F7F4EE]">
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 flex-col leading-tight sm:flex-row sm:items-baseline sm:gap-3">
            <Logo />
            <span className="text-xs text-gray-500 sm:text-sm">
              Customer Dashboard
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to={PROFILE_ROUTE}
              aria-label="View profile"
              className="flex min-w-0 items-center gap-2.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A]"
            >
              <UserAvatar key={avatarSrc ?? "none"} src={avatarSrc} size="sm" />
              <span className="hidden max-w-[160px] truncate text-sm font-semibold text-[#16233B] sm:block">
                {displayName}
              </span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-[#16233B] transition-all duration-200 hover:border-[#F26B5E] hover:text-[#F26B5E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A] sm:px-4"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        {/* WELCOME */}
        <section className="mb-8 flex items-center justify-between gap-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold text-[#16233B] sm:text-4xl">
              Welcome back! <span aria-hidden="true">👋</span>
            </h1>
            <p className="mt-3 text-base text-gray-500">
              Manage your bookings, track service requests, and stay
              connected with your professionals.
            </p>
          </div>

          {/* Minimal decorative visual (desktop only) */}
          <div
            className="relative hidden h-28 w-48 shrink-0 lg:block"
            aria-hidden="true"
          >
            <div className="absolute right-0 top-0 h-20 w-40 rounded-2xl bg-[#16233B] p-4">
              <div className="h-2.5 w-16 rounded-full bg-[#E3A73A]" />
              <div className="mt-3 h-2 w-24 rounded-full bg-white/30" />
              <div className="mt-2 h-2 w-14 rounded-full bg-white/20" />
            </div>
            <div className="absolute bottom-0 left-0 flex h-14 w-32 items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 shadow-md">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F26B5E]/10 text-[#F26B5E]">
                <CheckCircle2 size={17} />
              </span>
              <div className="space-y-1.5">
                <div className="h-2 w-12 rounded-full bg-gray-300" />
                <div className="h-2 w-8 rounded-full bg-gray-200" />
              </div>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section
          aria-label="Booking summary"
          className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
        >
          <StatCard
            label="Total Bookings"
            value={stats.total}
            Icon={ClipboardList}
            accent="bg-[#16233B]/10 text-[#16233B]"
          />
          <StatCard
            label="Pending"
            value={stats.pending}
            Icon={Hourglass}
            accent="bg-amber-50 text-amber-600"
          />
          <StatCard
            label="Accepted"
            value={stats.accepted}
            Icon={ThumbsUp}
            accent="bg-emerald-50 text-emerald-600"
          />
          <StatCard
            label="Completed"
            value={stats.completed}
            Icon={CheckCircle2}
            accent="bg-blue-50 text-blue-600"
          />
        </section>

        {/* ACCOUNT */}
        <section className="mb-10 flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex min-w-0 items-center gap-4">
            <UserAvatar key={avatarSrc ?? "none"} src={avatarSrc} size="md" />
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Account
              </p>
              <h2 className="truncate text-lg font-bold text-[#16233B]">
                {displayName}
              </h2>
              {displayContact && (
                <p className="truncate text-sm text-gray-500">
                  {displayContact}
                </p>
              )}
              <span className="mt-1.5 inline-block rounded-full bg-[#E3A73A]/20 px-2.5 py-0.5 text-xs font-semibold text-[#16233B]">
                Customer
              </span>
            </div>
          </div>
        </section>

        {/* MY BOOKINGS */}
        <section>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-[#16233B]">
                My Bookings
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Track and manage your service requests.
              </p>
            </div>
            <FindProfessionalButton />
          </div>

          {loading ? (
            <div className="space-y-5" role="status" aria-label="Loading">
              <BookingSkeleton />
              <BookingSkeleton />
            </div>
          ) : bookings.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white px-6 py-14 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#E3A73A]/15 text-[#16233B]">
                <CalendarDays size={30} />
              </div>
              <h3 className="mt-5 text-xl font-bold text-[#16233B]">
                No bookings yet
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
                You haven't requested any services yet. Your bookings will
                appear here once you make a request.
              </p>
              <FindProfessionalButton className="mt-6" />
            </div>
          ) : (
            <div className="space-y-5">
              {bookings.map((booking) => {
                const pid = booking.providerId?._id;
                return (
                  <BookingCard
                    key={booking._id}
                    booking={booking}
                    info={pid ? providerInfo[pid] : undefined}
                    reviews={pid ? (reviewsByProvider[pid] ?? []) : []}
                    isOwnReview={isOwnReview}
                    currentUserName={user?.fullname}
                    onRate={setSelectedBooking}
                    onRetry={retryProvider}
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* MY REVIEWS */}
        {(loading || bookings.length > 0) && (
          <MyReviewsSection
            reviews={sortedMyReviews}
            loading={reviewsLoading}
          />
        )}
      </div>

      {/* REVIEW MODAL */}
      {selectedBooking && (
        <ReviewModal
          bookingId={selectedBooking._id}
          providerName={
            providerInfo[selectedBooking.providerId?._id ?? ""]?.name ||
            selectedBooking.providerId?.email ||
            "Service Provider"
          }
          onClose={() => setSelectedBooking(null)}
          onSuccess={handleReviewSuccess}
        />
      )}
    </main>
  );
};