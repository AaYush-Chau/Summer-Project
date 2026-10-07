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
import { resolveAssetUrl } from "../../api/user.api";

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

type SortKey = "recommended" | "priceLow" | "priceHigh" | "experience" | "rating";

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

const API_BASE_URL = (
  (import.meta.env.VITE_APP_BASE_URL as string | undefined) ??
  "http://localhost:9005"
).replace(/\/+$/, "");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const loadRatings = async (
  providerIds: string[],
  signal: AbortSignal
): Promise<Record<string, number>> => {
  const entries = await Promise.all(
    providerIds.map(async (id): Promise<[string, number]> => {
      try {
        const response = await fetch(`${API_BASE_URL}/review/provider/${id}`, {
          headers: { Accept: "application/json" },
          signal,
        });
        if (!response.ok) return [id, 0];

        const body: unknown = await response.json();
        const average =
          isRecord(body) && isRecord(body.meta)
            ? body.meta.averageRating
            : undefined;

        return [id, typeof average === "number" ? average : 0];
      } catch {
        return [id, 0];
      }
    })
  );

  return Object.fromEntries(entries);
};

const yearsLabel = (years: number): string =>
  `${years} ${years === 1 ? "year" : "years"}`;

// ==========================================
// SHARED PRESENTATIONAL COMPONENTS
// ==========================================

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
            size={13}
            className={
              star <= filled
                ? "fill-[#E3A73A] text-[#E3A73A]"
                : "fill-none text-gray-300"
            }
          />
        ))}
      </div>
      <span className="text-xs font-semibold text-[#16233B]">
        {value.toFixed(1)}
      </span>
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
// PROVIDER DETAILS MODAL
// ==========================================

type DetailsModalProps = {
  open: boolean;
  provider: Provider | null;
  name: string;
  rating: number;
  imageSrc: string | null;
  serviceName: string;
  onClose: () => void;
  onBook: () => void;
};

const ProviderDetailsModal = ({
  open,
  provider,
  name,
  rating,
  imageSrc,
  serviceName,
  onClose,
  onBook,
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
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("recommended");

  const [activeProvider, setActiveProvider] = useState<Provider | null>(null);
  const [dialogStage, setDialogStage] = useState<"none" | "details" | "booking">(
    "none"
  );

  const [reloadKey, setReloadKey] = useState(0);

  const serviceName = SERVICE_NAMES[service || ""] || "Service";
  const ServiceIcon = SERVICE_ICONS[service || ""] || Briefcase;

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

  useEffect(() => {
    if (providers.length === 0) return;

    const controller = new AbortController();

    loadRatings(
      providers.map((provider) => provider._id),
      controller.signal
    ).then((result) => {
      if (!controller.signal.aborted) {
        setRatings((current) => ({ ...current, ...result }));
      }
    });

    return () => controller.abort();
  }, [providers]);

  const getRating = (provider: Provider): number =>
    ratings[provider._id] ?? provider.rating ?? 0;

  const sortedProviders = useMemo(() => {
    const list = [...providers];

    switch (sortBy) {
      case "priceLow":
        return list.sort((a, b) => a.price - b.price);
      case "priceHigh":
        return list.sort((a, b) => b.price - a.price);
      case "experience":
        return list.sort((a, b) => b.experience - a.experience);
      case "rating":
        return list.sort(
          (a, b) =>
            (ratings[b._id] ?? b.rating ?? 0) -
            (ratings[a._id] ?? a.rating ?? 0)
        );
      default:
        return list;
    }
  }, [providers, ratings, sortBy]);

  const showResults = !loading && !error && providers.length > 0;

  const openDetails = (provider: Provider) => {
    setActiveProvider(provider);
    setDialogStage("details");
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
        imageSrc={activeImageSrc}
        serviceName={serviceName}
        onClose={closeAllDialogs}
        onBook={openBookingFromDetails}
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