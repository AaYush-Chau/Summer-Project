import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useParams } from "react-router-dom";

import {
  AlertCircle,
  Banknote,
  Briefcase,
  ChevronDown,
  ChevronRight,
  Clock3,
  Mail,
  MapPin,
  Paintbrush,
  Phone,
  RefreshCw,
  Sparkles,
  Star,
  UserRound,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  getProvidersByService,
  type ServiceType,
} from "../../api/services.api";
import {
  getProviderReviews,
  idOf,
  normalizeReviewsResponse,
} from "../../api/review.api";
import type { ReviewRecord } from "../../api/review.api";
import { readStoredUser, resolveAssetUrl } from "../../api/user.api";

// Controlled modal component imported from same directory
import Booking from "../booking/Booking";

// ==========================================
// TYPES & CONSTANTS
// ==========================================

export type Availability = "Available" | "Busy" | "Unavailable";

export type Provider = {
  _id: string;
  email: string;
  dob: string;
  service: ServiceType;
  experience: number;
  price: number;
  availability: Availability;
  rating?: number;
  profileImage?: {
    filename?: string;
  };
  userId?: {
    fullname?: string;
    phone?: string;
  };
};

// Everything the review UI needs for one provider, from getProviderReviews()
type ReviewsEntry = {
  reviews: ReviewRecord[];
  average: number; // meta.averageRating, else calculated from the reviews
  count: number; // meta.count, else reviews.length
  error: boolean; // the request failed
};

type SortKey = "recommended" | "priceLow" | "priceHigh" | "experience" | "rating";

type DialogStage = "none" | "details" | "booking" | "reviews";

const SERVICE_NAMES: Record<string, string> = {
  plumber: "Plumbing",
  electrician: "Electrical",
  cleaner: "Cleaning",
  painter: "Painting",
};

const SERVICE_ICONS: Record<string, LucideIcon> = {
  plumber: Wrench,
  electrician: Zap,
  cleaner: Sparkles,
  painter: Paintbrush,
};

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "rating", label: "Highest rated" },
  { value: "experience", label: "Most experienced" },
  { value: "priceLow", label: "Price: low to high" },
  { value: "priceHigh", label: "Price: high to low" },
];

const AVAILABILITY_STYLES: Record<
  Availability,
  { badge: string; dot: string }
> = {
  Available: {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  Busy: {
    badge: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
  },
  Unavailable: {
    badge: "border-red-200 bg-red-50 text-red-700",
    dot: "bg-red-500",
  },
};

const ANIMATION_CSS = `
@keyframes gs-fade-up {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.gs-fade-up {
  animation: gs-fade-up 350ms ease-out backwards;
}

@keyframes gs-overlay-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes gs-overlay-out {
  from { opacity: 1; }
  to   { opacity: 0; }
}
@keyframes gs-modal-in {
  from { opacity: 0; transform: translateY(8px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes gs-modal-out {
  from { opacity: 1; transform: translateY(0) scale(1); }
  to   { opacity: 0; transform: translateY(8px) scale(0.96); }
}
.gs-overlay-in { animation: gs-overlay-in 220ms ease-out forwards; }
.gs-overlay-out { animation: gs-overlay-out 200ms ease-in forwards; }
.gs-modal-in { animation: gs-modal-in 240ms ease-out forwards; }
.gs-modal-out { animation: gs-modal-out 200ms ease-in forwards; }

@media (prefers-reduced-motion: reduce) {
  .gs-fade-up,
  .gs-overlay-in,
  .gs-overlay-out,
  .gs-modal-in,
  .gs-modal-out {
    animation: none !important;
  }
}
`;

// Loads reviews with the existing getProviderReviews() API, ONE request per
// provider. The same data feeds the card rating, the review count and the
// "View All Reviews" modal, so opening the modal needs no extra request.
const loadReviews = async (
  providerIds: string[]
): Promise<Record<string, ReviewsEntry>> => {
  const entries = await Promise.all(
    providerIds.map(async (id): Promise<[string, ReviewsEntry]> => {
      try {
        const body: unknown = await getProviderReviews(id);
        return [id, { ...normalizeReviewsResponse(body), error: false }];
      } catch {
        return [id, { reviews: [], average: 0, count: 0, error: true }];
      }
    })
  );

  return Object.fromEntries(entries);
};

const yearsLabel = (years: number): string =>
  `${years} ${years === 1 ? "year" : "years"}`;

// "2 days ago" (null when the date is missing / invalid)
const formatRelative = (iso: string): { text: string; full: string } | null => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  const full = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return { text: "Just now", full };

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  const [unit, size] = units.find(([, s]) => seconds >= s) ?? units[5];
  const text = new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
    -Math.floor(seconds / size),
    unit
  );
  return { text, full };
};

// Newest first; reviews without a date yet come first
const reviewTime = (r: ReviewRecord): number => {
  const t = r.createdAt ? new Date(r.createdAt).getTime() : NaN;
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
};

// ==========================================
// SHARED PRESENTATIONAL COMPONENTS
// ==========================================

// Existing component, extended with optional `size` / `showValue`
// (defaults keep every current usage exactly as it was)
const RatingStars = ({
  rating,
  size = 13,
  showValue = true,
}: {
  rating: number;
  size?: number;
  showValue?: boolean;
}) => {
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
            size={size}
            className={
              star <= filled
                ? "fill-[#E3A73A] text-[#E3A73A]"
                : "fill-none text-gray-300"
            }
          />
        ))}
      </div>
      {showValue && (
        <span className="text-xs font-semibold text-[#16233B]">
          {value.toFixed(1)}
        </span>
      )}
    </div>
  );
};

const ProviderImage = ({
  src,
  name,
  rounded = false,
}: {
  src: string | null;
  name: string;
  rounded?: boolean;
}) => {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={`${name} profile photo`}
        onError={() => setFailed(true)}
        loading="lazy"
        className={`h-full w-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100 ${
          rounded ? "rounded-full" : ""
        }`}
      />
    );
  }

  return (
    <div
      className={`relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[#F7F4EE] ${
        rounded ? "rounded-full" : ""
      }`}
    >
      <span className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-[#E3A73A]/15" />
      <span className="absolute -bottom-12 -right-8 h-44 w-44 rounded-full bg-[#F26B5E]/10" />
      <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white text-[#16233B] shadow-sm">
        <UserRound size={36} strokeWidth={1.5} />
      </span>
      {!rounded && (
        <span className="relative mt-2 text-xs font-medium text-[#16233B]/60">
          Professional
        </span>
      )}
    </div>
  );
};

const ProviderSkeleton = () => (
  <div
    className="animate-pulse overflow-hidden rounded-2xl border border-gray-200 bg-white"
    aria-hidden="true"
  >
    <div className="h-60 bg-gray-200 sm:h-64 lg:h-[17rem]" />
    <div className="space-y-2.5 p-5">
      <div className="h-5 w-2/3 rounded bg-gray-200" />
      <div className="h-3 w-1/3 rounded bg-gray-100" />
      <div className="h-3 w-1/2 rounded bg-gray-100" />
      <div className="h-3 w-2/5 rounded bg-gray-100" />
      <div className="mt-3 border-t border-gray-100 pt-3">
        <div className="h-5 w-1/3 rounded bg-gray-200" />
        <div className="mt-3 h-9 rounded-lg bg-gray-200" />
      </div>
    </div>
  </div>
);

const DetailRow = ({
  Icon,
  label,
  children,
}: {
  Icon: LucideIcon;
  label: string;
  children: ReactNode;
}) => (
  <div className="flex items-start gap-2.5 rounded-xl border border-gray-100 bg-[#F7F4EE]/60 p-3">
    <Icon size={16} className="mt-0.5 shrink-0 text-[#16233B]/60" />
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wide text-gray-500">
        {label}
      </dt>
      <dd className="mt-0.5 break-words text-sm font-semibold text-[#16233B]">
        {children}
      </dd>
    </div>
  </div>
);

// ==========================================
// MODAL SHELL COMPONENT
// ==========================================

type ModalShellProps = {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
  maxWidth?: string;
};

const ModalShell = ({
  open,
  onClose,
  labelledBy,
  children,
  maxWidth = "max-w-[620px]",
}: ModalShellProps) => {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
    } else if (mounted) {
      setClosing(true);
      const timer = window.setTimeout(() => {
        setMounted(false);
        setClosing(false);
      }, 220);
      return () => window.clearTimeout(timer);
    }
  }, [open, mounted]);

  useEffect(() => {
    if (!mounted) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKey);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = originalOverflow;
    };
  }, [mounted, onClose]);

  if (!mounted) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className={`absolute inset-0 bg-[#16233B]/60 backdrop-blur-sm ${
          closing ? "gs-overlay-out" : "gs-overlay-in"
        }`}
      />

      <div
        className={`relative z-10 w-full ${maxWidth} max-h-[90vh] overflow-y-auto rounded-3xl border border-gray-200 bg-white shadow-2xl ${
          closing ? "gs-modal-out" : "gs-modal-in"
        }`}
      >
        {children}
      </div>
    </div>
  );
};

// ==========================================
// REVIEW COMPONENTS
// ==========================================

// "24 reviews · View All Reviews →" shown on the card and in the details modal
const ReviewsLink = ({
  entry,
  providerName,
  onClick,
}: {
  entry?: ReviewsEntry;
  providerName: string;
  onClick: () => void;
}) => {
  // still loading
  if (!entry) {
    return (
      <span
        className="block h-4 w-40 animate-pulse rounded bg-gray-100"
        aria-hidden="true"
      />
    );
  }

  const total = Math.max(entry.count, entry.reviews.length);

  if (!entry.error && total === 0) {
    return <p className="text-xs text-gray-500">No reviews yet</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      <span className="text-gray-600">
        {entry.error
          ? "Reviews unavailable"
          : `${total} ${total === 1 ? "review" : "reviews"}`}
      </span>
      <button
        type="button"
        onClick={onClick}
        aria-label={`View all reviews for ${providerName}`}
        className="group/reviews inline-flex items-center gap-0.5 rounded font-semibold text-[#F26B5E] transition-colors duration-200 hover:text-[#16233B] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A]"
      >
        {entry.error ? "View Reviews" : "View All Reviews"}
        <ChevronRight
          size={14}
          className="transition-transform duration-200 group-hover/reviews:translate-x-0.5 motion-reduce:transition-none"
        />
      </button>
    </div>
  );
};

// Reviewer avatar: image -> initial letter -> icon
const ReviewerAvatar = ({
  src,
  name,
}: {
  src?: string | null;
  name: string;
}) => {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        onError={() => setFailed(true)}
        className="h-10 w-10 shrink-0 rounded-full object-cover"
      />
    );
  }

  const initial = name.trim().charAt(0).toUpperCase();
  return (
    <span
      aria-hidden="true"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F7F4EE] text-sm font-semibold text-[#16233B]"
    >
      {initial || <UserRound size={18} />}
    </span>
  );
};

const ReviewCard = ({
  review,
  own,
  index,
}: {
  review: ReviewRecord;
  own: boolean;
  index: number;
}) => {
  const name = own ? "You" : review.customerName || "Customer";
  const when = formatRelative(review.createdAt);

  return (
    <article
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
      className={`gs-fade-up rounded-2xl border p-4 transition-colors duration-200 motion-reduce:transition-none ${
        own
          ? "border-[#E3A73A]/50 bg-[#FFFBF3] ring-1 ring-[#E3A73A]/20"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <div className="flex items-start gap-3">
        <ReviewerAvatar
          key={review.customerAvatar ?? "none"}
          src={review.customerAvatar}
          name={name}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="max-w-full truncate text-sm font-semibold text-[#16233B]">
              {name}
            </p>
            {own && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#E3A73A]/20 px-2 py-0.5 text-[11px] font-semibold text-[#16233B]">
                <Sparkles size={11} aria-hidden="true" />
                Your Review
              </span>
            )}
          </div>
          <div className="mt-1">
            <RatingStars rating={review.rating} size={14} />
          </div>
        </div>

        {when && (
          <time
            dateTime={review.createdAt}
            title={when.full}
            className="shrink-0 text-xs text-gray-400"
          >
            {when.text}
          </time>
        )}
      </div>

      {review.comment && (
        <p className="mt-3 whitespace-pre-line break-words text-sm leading-relaxed text-gray-700">
          “{review.comment}”
        </p>
      )}
    </article>
  );
};

// Bars are calculated from the reviews that were returned (never invented)
const RatingDistribution = ({ reviews }: { reviews: ReviewRecord[] }) => {
  const total = reviews.length;
  const rows = [5, 4, 3, 2, 1].map((star) => {
    const n = reviews.filter((r) => Math.round(r.rating) === star).length;
    return { star, n, pct: total ? (n / total) * 100 : 0 };
  });

  return (
    <ul className="space-y-2" aria-label="Rating breakdown">
      {rows.map(({ star, n, pct }) => (
        <li key={star} className="flex items-center gap-3 text-xs">
          <span className="w-8 shrink-0 font-medium tabular-nums text-[#16233B]">
            {star} ★
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200/70">
            <div
              className="h-full rounded-full bg-[#E3A73A] transition-[width] duration-500 motion-reduce:transition-none"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="w-16 shrink-0 text-right tabular-nums text-gray-500">
            {Math.round(pct)}%{" "}
            <span className="text-gray-400">({n})</span>
          </span>
        </li>
      ))}
    </ul>
  );
};

const ReviewSummary = ({
  average,
  count,
  reviews,
}: {
  average: number;
  count: number;
  reviews: ReviewRecord[];
}) => (
  <div className="grid gap-6 rounded-2xl border border-gray-200 bg-[#F7F4EE]/60 p-5 sm:grid-cols-[190px_1fr] sm:items-center sm:gap-8">
    <div className="text-center sm:text-left">
      <p className="flex items-center justify-center gap-1.5 text-5xl font-extrabold tabular-nums text-[#16233B] sm:justify-start">
        {average.toFixed(1)}
        <Star
          size={26}
          aria-hidden="true"
          className="fill-[#E3A73A] text-[#E3A73A]"
        />
      </p>
      <div className="mt-2 flex justify-center sm:justify-start">
        <RatingStars rating={average} size={20} showValue={false} />
      </div>
      <p className="mt-1.5 text-sm text-gray-500">
        Based on {count} {count === 1 ? "review" : "reviews"}
      </p>
    </div>

    <div>
      <RatingDistribution reviews={reviews} />
      {reviews.length < count && (
        <p className="mt-2 text-[11px] text-gray-400">
          Breakdown is based on the {reviews.length} reviews loaded.
        </p>
      )}
    </div>
  </div>
);

const ReviewSkeleton = () => (
  <div
    className="animate-pulse rounded-2xl border border-gray-200 bg-white p-4"
    aria-hidden="true"
  >
    <div className="flex items-start gap-3">
      <div className="h-10 w-10 rounded-full bg-gray-200" />
      <div className="space-y-2">
        <div className="h-3.5 w-28 rounded bg-gray-200" />
        <div className="h-3 w-24 rounded bg-gray-100" />
      </div>
    </div>
    <div className="mt-3 space-y-2">
      <div className="h-3.5 w-full rounded bg-gray-100" />
      <div className="h-3.5 w-11/12 rounded bg-gray-100" />
      <div className="h-3.5 w-2/3 rounded bg-gray-100" />
    </div>
  </div>
);

const ReviewsLoading = () => (
  <div role="status" aria-label="Loading reviews" className="space-y-5">
    <div
      className="h-40 animate-pulse rounded-2xl border border-gray-200 bg-[#F7F4EE]/60"
      aria-hidden="true"
    />
    <div className="space-y-3">
      <ReviewSkeleton />
      <ReviewSkeleton />
      <ReviewSkeleton />
    </div>
  </div>
);

const EmptyReviewsState = () => (
  <div className="px-4 py-14 text-center">
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E3A73A]/15 text-[#16233B]">
      <Star size={26} aria-hidden="true" className="fill-[#E3A73A]/40" />
    </div>
    <h3 className="mt-4 text-lg font-bold text-[#16233B]">No reviews yet</h3>
    <p className="mt-1 text-sm text-gray-500">
      Be the first customer to share your experience.
    </p>
  </div>
);

const ReviewsError = ({ onRetry }: { onRetry: () => void }) => (
  <div role="alert" className="px-4 py-14 text-center">
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
      <AlertCircle size={26} aria-hidden="true" />
    </div>
    <h3 className="mt-4 text-lg font-bold text-[#16233B]">
      Unable to load reviews.
    </h3>
    <p className="mt-1 text-sm text-gray-500">Please try again in a moment.</p>
    <button
      type="button"
      onClick={onRetry}
      className="group mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-[#16233B] px-4 py-2 text-sm font-semibold text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#F26B5E] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A] focus-visible:ring-offset-2"
    >
      <RefreshCw
        size={15}
        aria-hidden="true"
        className="transition-transform duration-500 group-hover:rotate-180 motion-reduce:transition-none"
      />
      Try Again
    </button>
  </div>
);

// The "View All Reviews" modal (built on the existing ModalShell)
type AllReviewsModalProps = {
  open: boolean;
  provider: Provider | null;
  name: string;
  imageSrc: string | null;
  serviceName: string;
  entry?: ReviewsEntry; // undefined = still loading
  isOwnReview: (review: ReviewRecord) => boolean;
  onClose: () => void;
  onRetry: () => void;
};

const AllReviewsModal = ({
  open,
  provider,
  name,
  imageSrc,
  serviceName,
  entry,
  isOwnReview,
  onClose,
  onRetry,
}: AllReviewsModalProps) => {
  // The customer's own review is pinned first, the rest are newest first
  const sorted = useMemo(() => {
    if (!entry) return [];
    const withOwn = entry.reviews.map((review) => ({
      review,
      own: isOwnReview(review),
    }));
    return withOwn.sort((a, b) =>
      a.own !== b.own
        ? a.own
          ? -1
          : 1
        : reviewTime(b.review) - reviewTime(a.review)
    );
  }, [entry, isOwnReview]);

  if (!provider) return null;

  const titleId = `reviews-modal-title-${provider._id}`;
  const total = entry ? Math.max(entry.count, entry.reviews.length) : 0;

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      maxWidth="max-w-3xl"
    >
      <div className="flex max-h-[calc(90vh-2px)] flex-col">
        {/* HEADER (stays visible while the list scrolls) */}
        <div className="flex shrink-0 items-start gap-4 border-b border-gray-100 p-5 sm:p-6">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-[#F7F4EE] bg-[#F7F4EE] shadow-sm sm:h-14 sm:w-14">
            <ProviderImage
              key={imageSrc ?? "none"}
              src={imageSrc}
              name={name}
              rounded
            />
          </div>

          <div className="min-w-0 flex-1 pr-10">
            <p className="truncate text-xs font-semibold text-[#F26B5E]">
              {name} · {serviceName}
            </p>
            <h2
              id={titleId}
              className="text-xl font-bold text-[#16233B] sm:text-2xl"
            >
              Customer Reviews
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">
              See what customers say about this professional.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close reviews"
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-[#16233B] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#F26B5E] hover:text-[#F26B5E] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A]"
          >
            <X size={18} />
          </button>
        </div>

        {/* BODY (scrolls inside the modal) */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">
          {!entry ? (
            <ReviewsLoading />
          ) : entry.error && entry.reviews.length === 0 ? (
            <ReviewsError onRetry={onRetry} />
          ) : sorted.length === 0 ? (
            <EmptyReviewsState />
          ) : (
            <div className="space-y-5">
              <ReviewSummary
                average={entry.average}
                count={total}
                reviews={entry.reviews}
              />

              <div>
                <h3 className="mb-3 text-sm font-bold text-[#16233B]">
                  All reviews ({total})
                </h3>
                <div className="space-y-3">
                  {sorted.map(({ review, own }, index) => (
                    <ReviewCard
                      key={review.id}
                      review={review}
                      own={own}
                      index={index}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
};

// ==========================================
// PROVIDER DETAILS MODAL
// ==========================================

type DetailsModalProps = {
  open: boolean;
  provider: Provider | null;
  name: string;
  rating: number;
  reviewsEntry?: ReviewsEntry;
  imageSrc: string | null;
  serviceName: string;
  onClose: () => void;
  onBook: () => void;
  onViewReviews: () => void;
};

const ProviderDetailsModal = ({
  open,
  provider,
  name,
  rating,
  reviewsEntry,
  imageSrc,
  serviceName,
  onClose,
  onBook,
  onViewReviews,
}: DetailsModalProps) => {
  if (!provider) return null;

  const phone = provider.userId?.phone;
  const status =
    AVAILABILITY_STYLES[provider.availability] ??
    AVAILABILITY_STYLES.Unavailable;

  const titleId = `provider-modal-title-${provider._id}`;

  return (
    <ModalShell open={open} onClose={onClose} labelledBy={titleId}>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-[#16233B] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#F26B5E] hover:text-[#F26B5E] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A]"
      >
        <X size={18} />
      </button>

      <div className="p-6 sm:p-8">
        <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:gap-5 sm:text-left">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-[#F7F4EE] bg-[#F7F4EE] shadow-sm sm:h-28 sm:w-28">
            <ProviderImage
              key={imageSrc ?? "none"}
              src={imageSrc}
              name={name}
              rounded
            />
          </div>

          <div className="mt-4 min-w-0 flex-1 sm:mt-0">
            <h2
              id={titleId}
              className="truncate text-xl font-bold text-[#16233B] sm:text-2xl"
            >
              {name}
            </h2>
            <p className="mt-0.5 text-sm font-semibold text-[#F26B5E]">
              {serviceName} Professional
            </p>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${status.badge}`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${status.dot}`}
                  aria-hidden="true"
                />
                {provider.availability}
              </span>
              <RatingStars rating={rating} />
            </div>

            <div className="mt-2 flex justify-center sm:justify-start">
              <ReviewsLink
                entry={reviewsEntry}
                providerName={name}
                onClick={onViewReviews}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-[#E3A73A]/30 bg-gradient-to-br from-[#F7F4EE] to-white p-5 text-center">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Starting from
          </p>
          <p className="mt-1 text-3xl font-extrabold text-[#16233B]">
            NPR {provider.price.toLocaleString()}
          </p>
        </div>

        <dl className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DetailRow Icon={UserRound} label="Professional">
            {name}
          </DetailRow>

          <DetailRow Icon={Briefcase} label="Service">
            {serviceName}
          </DetailRow>

          <DetailRow Icon={Clock3} label="Experience">
            {yearsLabel(provider.experience)}
          </DetailRow>

          <DetailRow Icon={Star} label="Rating">
            <RatingStars rating={rating} />
          </DetailRow>

          <DetailRow Icon={MapPin} label="Location">
            Kathmandu, Nepal
          </DetailRow>

          <DetailRow Icon={Mail} label="Email">
            <span className="break-all font-medium">{provider.email}</span>
          </DetailRow>

          {phone && (
            <DetailRow Icon={Phone} label="Phone">
              <a
                href={`tel:${phone}`}
                className="rounded text-[#16233B] underline-offset-2 transition-colors duration-200 hover:text-[#F26B5E] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A]"
              >
                {phone}
              </a>
            </DetailRow>
          )}

          <DetailRow Icon={Banknote} label="Starting price">
            NPR {provider.price.toLocaleString()}
          </DetailRow>

          <DetailRow Icon={Clock3} label="Availability">
            <span className="inline-flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${status.dot}`}
                aria-hidden="true"
              />
              {provider.availability}
            </span>
          </DetailRow>
        </dl>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-[#16233B] transition-all duration-200 hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A] focus-visible:ring-offset-2"
          >
            Close
          </button>

          <button
            type="button"
            onClick={onBook}
            className="group inline-flex items-center justify-center gap-2 rounded-xl bg-[#16233B] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#F26B5E] hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A] focus-visible:ring-offset-2 motion-reduce:transition-none"
          >
            Book Now
            <ChevronRight
              size={16}
              className="transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none"
            />
          </button>
        </div>
      </div>
    </ModalShell>
  );
};

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function ServiceProviders() {
  const { service } = useParams();

  const [providers, setProviders] = useState<Provider[]>([]);
  // Reviews + rating + count per provider (from getProviderReviews)
  const [reviewMap, setReviewMap] = useState<Record<string, ReviewsEntry>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("recommended");

  const [activeProvider, setActiveProvider] = useState<Provider | null>(null);
  const [dialogStage, setDialogStage] = useState<DialogStage>("none");

  const [reloadKey, setReloadKey] = useState(0);

  const serviceName = SERVICE_NAMES[service || ""] || "Service";
  const ServiceIcon = SERVICE_ICONS[service || ""] || Briefcase;

  // The logged-in user (same cached user the rest of the app uses)
  const currentUser = useMemo(() => readStoredUser(), []);
  const currentUserId = idOf(currentUser);
  const currentUserEmail = currentUser?.email;

  // A review is the user's own ONLY when its customer id (or email) matches.
  // Never "the first review".
  const isOwnReview = useMemo(
    () =>
      (review: ReviewRecord): boolean => {
        if (review.customerId && currentUserId) {
          return review.customerId === currentUserId;
        }
        if (review.customerEmail && currentUserEmail) {
          return (
            review.customerEmail.toLowerCase() ===
            currentUserEmail.toLowerCase()
          );
        }
        return false;
      },
    [currentUserId, currentUserEmail]
  );

  useEffect(() => {
    const loadProviders = async () => {
      if (!service) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await getProvidersByService(service as ServiceType);
        setProviders(response?.data || []);
      } catch (error) {
        console.error("Failed to load service providers:", error);
        setError("Unable to load service providers.");
      } finally {
        setLoading(false);
      }
    };

    loadProviders();
  }, [service, reloadKey]);

  // One getProviderReviews() request per provider
  useEffect(() => {
    if (providers.length === 0) return;

    let cancelled = false;

    loadReviews(providers.map((provider) => provider._id)).then((result) => {
      if (!cancelled) {
        setReviewMap((current) => ({ ...current, ...result }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [providers]);

  // "Try Again" inside the reviews modal
  const retryReviews = (providerId: string) => {
    setReviewMap((current) => {
      const next = { ...current };
      delete next[providerId]; // back to the loading skeleton
      return next;
    });
    loadReviews([providerId]).then((result) =>
      setReviewMap((current) => ({ ...current, ...result }))
    );
  };

  const getRating = (provider: Provider): number =>
    reviewMap[provider._id]?.average ?? provider.rating ?? 0;

  const sortedProviders = useMemo(() => {
    const list = [...providers];
    const ratingOf = (p: Provider) =>
      reviewMap[p._id]?.average ?? p.rating ?? 0;

    switch (sortBy) {
      case "priceLow":
        return list.sort((a, b) => a.price - b.price);
      case "priceHigh":
        return list.sort((a, b) => b.price - a.price);
      case "experience":
        return list.sort((a, b) => b.experience - a.experience);
      case "rating":
        return list.sort((a, b) => ratingOf(b) - ratingOf(a));
      default:
        return list;
    }
  }, [providers, reviewMap, sortBy]);

  const showResults = !loading && !error && providers.length > 0;

  const openDetails = (provider: Provider) => {
    setActiveProvider(provider);
    setDialogStage("details");
  };

  // "View All Reviews" on a provider card
  const openReviews = (provider: Provider) => {
    setActiveProvider(provider);
    setDialogStage("reviews");
  };

  const closeAllDialogs = () => {
    setDialogStage("none");
    window.setTimeout(() => setActiveProvider(null), 240);
  };

  const openBookingFromDetails = () => {
    setDialogStage("none");
    window.setTimeout(() => {
      setDialogStage("booking");
    }, 230);
  };

  // "View All Reviews" inside the details modal
  const openReviewsFromDetails = () => {
    setDialogStage("none");
    window.setTimeout(() => {
      setDialogStage("reviews");
    }, 230);
  };

  const backToDetails = () => {
    setDialogStage("none");
    window.setTimeout(() => {
      setDialogStage("details");
    }, 230);
  };

  const activeName = activeProvider?.userId?.fullname || "Professional";
  const activeImageSrc = activeProvider
    ? resolveAssetUrl(
        activeProvider.profileImage?.filename
          ? `uploads/images/provider/${activeProvider.profileImage.filename}`
          : null
      )
    : null;
  const activeEntry = activeProvider ? reviewMap[activeProvider._id] : undefined;

  return (
    <main className="min-h-screen bg-[#F7F4EE] px-4 py-6 sm:px-6 sm:py-8">
      <style>{ANIMATION_CSS}</style>

      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <header className="gs-fade-up mb-5 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:gap-5 sm:px-5">
          <span className="text-xl font-extrabold tracking-tight text-[#16233B]">
            Ghar<span className="text-[#E3A73A]">Sewa</span>
          </span>

          <span
            className="hidden h-8 w-px bg-[#16233B]/10 sm:block"
            aria-hidden="true"
          />

          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E3A73A]/15 text-[#16233B]">
              <ServiceIcon size={20} />
            </span>
            <div className="min-w-0">
              <h1 className="text-lg font-bold leading-tight text-[#16233B] sm:text-xl">
                {serviceName} Professionals
              </h1>
              <p className="text-xs text-gray-500 sm:text-sm">
                Find trusted professionals for your local service needs.
              </p>
            </div>
          </div>
        </header>

        {/* TOOLBAR */}
        {showResults && (
          <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm">
            <p className="text-sm text-gray-500" aria-live="polite">
              <span className="font-semibold text-[#16233B]">
                {providers.length}
              </span>{" "}
              {providers.length === 1 ? "Professional" : "Professionals"} found
            </p>

            <div className="flex items-center gap-2">
              <label
                htmlFor="provider-sort"
                className="hidden text-xs text-gray-500 sm:block"
              >
                Sort
              </label>
              <div className="relative">
                <select
                  id="provider-sort"
                  value={sortBy}
                  onChange={(event) =>
                    setSortBy(event.target.value as SortKey)
                  }
                  className="cursor-pointer appearance-none rounded-lg border border-gray-200 bg-[#F7F4EE] py-1.5 pl-3 pr-8 text-xs font-medium text-[#16233B] transition-all duration-200 hover:border-gray-300 focus:border-[#E3A73A] focus:outline-none focus:ring-2 focus:ring-[#E3A73A]/30 sm:text-sm"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  aria-hidden="true"
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
              </div>
            </div>
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3"
            role="status"
            aria-label="Loading professionals"
          >
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <ProviderSkeleton key={item} />
            ))}
          </div>
        )}

        {/* ERROR */}
        {!loading && error && (
          <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
              <AlertCircle size={24} />
            </div>
            <h2 className="mt-4 text-lg font-bold text-[#16233B]">
              Unable to load professionals
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Please try again in a moment.
            </p>
            <button
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
              className="group mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-[#16233B] px-4 py-2 text-sm font-semibold text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#F26B5E] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A] focus-visible:ring-offset-2"
            >
              <RefreshCw
                size={15}
                className="transition-transform duration-500 group-hover:rotate-180 motion-reduce:transition-none"
              />
              Try again
            </button>
          </div>
        )}

        {/* EMPTY */}
        {!loading && !error && providers.length === 0 && (
          <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#E3A73A]/15 text-[#16233B]">
              <Briefcase size={22} />
            </div>
            <h2 className="mt-4 text-lg font-bold text-[#16233B]">
              No professionals found
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              No professionals are currently available for this service.
            </p>
          </div>
        )}

        {/* PROVIDER CARDS */}
        {showResults && (
          <div className="grid grid-cols-1 items-start gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {sortedProviders.map((provider, index) => {
              const name = provider.userId?.fullname || "Professional";
              const rating = getRating(provider);
              const status =
                AVAILABILITY_STYLES[provider.availability] ??
                AVAILABILITY_STYLES.Unavailable;

              const filename = provider.profileImage?.filename;
              const imageSrc = resolveAssetUrl(
                filename ? `uploads/images/provider/${filename}` : null
              );

              return (
                <article
                  key={provider._id}
                  style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
                  className="gs-fade-up group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-gray-300 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  {/* IMAGE */}
                  <div className="relative h-60 overflow-hidden bg-[#F7F4EE] sm:h-64 lg:h-[17rem]">
                    <ProviderImage
                      key={imageSrc ?? "none"}
                      src={imageSrc}
                      name={name}
                    />

                    <div
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/20 to-transparent"
                      aria-hidden="true"
                    />

                    <span
                      className={`absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-sm ${status.badge}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${status.dot} ${
                          provider.availability === "Available"
                            ? "animate-pulse motion-reduce:animate-none"
                            : ""
                        }`}
                        aria-hidden="true"
                      />
                      {provider.availability}
                    </span>
                  </div>

                  {/* INFO */}
                  <div className="flex flex-1 flex-col p-5">
                    <h2 className="break-words text-lg font-bold leading-snug text-[#16233B]">
                      {name}
                    </h2>

                    <p className="mt-0.5 text-xs font-semibold text-[#F26B5E]">
                      {serviceName} Professional
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <RatingStars rating={rating} />
                      <span className="text-gray-300" aria-hidden="true">
                        •
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                        <Briefcase size={13} className="shrink-0 text-gray-400" />
                        {yearsLabel(provider.experience)}
                        <span className="sr-only"> experience</span>
                      </span>
                    </div>

                    {/* REVIEW COUNT + VIEW ALL REVIEWS */}
                    <div className="mt-2">
                      <ReviewsLink
                        entry={reviewMap[provider._id]}
                        providerName={name}
                        onClick={() => openReviews(provider)}
                      />
                    </div>

                    <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
                      <MapPin size={13} className="shrink-0" />
                      Kathmandu, Nepal
                    </p>

                    <div className="mt-4 flex items-end justify-between border-t border-gray-100 pt-4">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-gray-500">
                          Starting from
                        </p>
                        <p className="text-lg font-bold text-[#16233B]">
                          NPR {provider.price.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => openDetails(provider)}
                      className="group/details mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#16233B] py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#F26B5E] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A] focus-visible:ring-offset-2 motion-reduce:transition-none"
                    >
                      View Details
                      <ChevronRight
                        size={16}
                        className="transition-transform duration-200 group-hover/details:translate-x-1 motion-reduce:transition-none"
                      />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* DETAILS MODAL */}
      <ProviderDetailsModal
        open={dialogStage === "details"}
        provider={activeProvider}
        name={activeName}
        rating={activeProvider ? getRating(activeProvider) : 0}
        reviewsEntry={activeEntry}
        imageSrc={activeImageSrc}
        serviceName={serviceName}
        onClose={closeAllDialogs}
        onBook={openBookingFromDetails}
        onViewReviews={openReviewsFromDetails}
      />

      {/* ALL REVIEWS MODAL */}
      <AllReviewsModal
        open={dialogStage === "reviews"}
        provider={activeProvider}
        name={activeName}
        imageSrc={activeImageSrc}
        serviceName={serviceName}
        entry={activeEntry}
        isOwnReview={isOwnReview}
        onClose={closeAllDialogs}
        onRetry={() => activeProvider && retryReviews(activeProvider._id)}
      />

      {/* BOOKING MODAL */}
      <Booking
        open={dialogStage === "booking"}
        provider={activeProvider}
        name={activeName}
        imageSrc={activeImageSrc}
        serviceName={serviceName}
        onClose={closeAllDialogs}
        onBack={backToDetails}
      />
    </main>
  );
}