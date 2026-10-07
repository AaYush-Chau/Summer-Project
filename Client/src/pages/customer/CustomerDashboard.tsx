import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType, FormEvent } from "react";
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
  X,
} from "lucide-react";

import { getCustomerBookings } from "../../api/booking.api";
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

// Extra provider data loaded from existing public endpoints
type ProviderInfo = {
  name?: string; // User.fullname of the professional
  rating: number; // average review rating (0 when there are no reviews)
  reviewCount: number;
};

// ==========================================
// HELPERS
// ==========================================

const API_BASE_URL = (
  (import.meta.env.VITE_APP_BASE_URL as string | undefined) ??
  "http://localhost:9005"
).replace(/\/+$/, "");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

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
// they are read from the existing public endpoints:
//   GET /provider/:providerId        -> data.userId.fullname
//   GET /review/provider/:providerId -> meta.averageRating, meta.count
const loadProviderInfo = async (
  providerIds: string[],
  signal?: AbortSignal
): Promise<Record<string, ProviderInfo>> => {
  const entries = await Promise.all(
    providerIds.map(async (id): Promise<[string, ProviderInfo]> => {
      const [providerBody, reviewBody] = await Promise.all([
        getJson(`/provider/${id}`, signal),
        getJson(`/review/provider/${id}`, signal),
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

      let rating = 0;
      let reviewCount = 0;
      if (isRecord(reviewBody) && isRecord(reviewBody.meta)) {
        const { averageRating, count } = reviewBody.meta;
        if (typeof averageRating === "number") rating = averageRating;
        if (typeof count === "number") reviewCount = count;
      }

      return [id, { name, rating, reviewCount }];
    })
  );

  return Object.fromEntries(entries);
};

// POST /review  { bookingId, rating (1-5), comment (3-500 chars) }
const submitReview = async (payload: {
  bookingId: string;
  rating: number;
  comment: string;
}): Promise<void> => {
  const token = localStorage.getItem("access_token");

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/review`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(
      "Network error. Please check your connection and try again."
    );
  }

  if (!response.ok) {
    let message = "Could not submit your review. Please try again.";
    try {
      const body: unknown = await response.json();
      if (isRecord(body) && typeof body.message === "string") {
        message = body.message;
      }
    } catch {
      // keep default message
    }
    throw new Error(message);
  }
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
  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5">
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
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-[#16233B] px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#1f3256] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A] ${className}`}
    >
      <Search size={16} />
      Find a Professional
    </Link>
  );
};

const BookingCard = ({
  booking,
  info,
  onRate,
}: {
  booking: Booking;
  info?: ProviderInfo;
  onRate: (booking: Booking) => void;
}) => {
  const provider = booking.providerId;

  // Real professional name first; email only if no name exists
  const providerName =
    info?.name?.trim() ||
    provider?.name?.trim() ||
    provider?.email ||
    "Professional";

  const providerRating = info?.rating ?? provider?.rating ?? 0;

  const filename = provider?.profileImage?.filename;
  const providerAvatar = resolveAssetUrl(
    filename ? `uploads/images/provider/${filename}` : null
  );

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-6">
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

      {/* REVIEW */}
      {booking.status === "Completed" && (
        <div className="mt-5 border-t border-gray-100 pt-5">
          {booking.hasReview ? (
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
              <CheckCircle size={18} />
              Review submitted
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onRate(booking)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#E3A73A] px-5 py-3 text-sm font-semibold text-[#16233B] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16233B] focus-visible:ring-offset-2 sm:w-auto"
            >
              <Star size={17} className="fill-none" />
              Rate Provider
            </button>
          )}
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
  onSuccess: () => void;
};

const RATING_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very good",
  5: "Excellent",
};

const MIN_COMMENT = 3;
const MAX_COMMENT = 500;

// ==========================================
// REVIEW MODAL
// ==========================================

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
      await submitReview({
        bookingId,
        rating,
        comment: trimmedComment,
      });

      onSuccess();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not submit your review. Please try again."
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

  // Professional names / ratings keyed by provider id
  const [providerInfo, setProviderInfo] = useState<
    Record<string, ProviderInfo>
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

  // LOAD PROFESSIONAL NAMES + RATINGS (existing public endpoints)
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

  // LOGOUT
  const handleLogout = () => {
    clearAuth();
    navigate("/login");
  };

  // REVIEW SUCCESS
  const handleReviewSuccess = () => {
    if (!selectedBooking) {
      return;
    }

    setBookings((currentBookings) =>
      currentBookings.map((booking) =>
        booking._id === selectedBooking._id
          ? { ...booking, hasReview: true }
          : booking
      )
    );

    // Refresh this professional's rating after the new review
    const reviewedProviderId = selectedBooking.providerId?._id;
    if (reviewedProviderId) {
      loadProviderInfo([reviewedProviderId]).then((result) =>
        setProviderInfo((current) => ({ ...current, ...result }))
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
              {bookings.map((booking) => (
                <BookingCard
                  key={booking._id}
                  booking={booking}
                  info={
                    booking.providerId?._id
                      ? providerInfo[booking.providerId._id]
                      : undefined
                  }
                  onRate={setSelectedBooking}
                />
              ))}
            </div>
          )}
        </section>
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