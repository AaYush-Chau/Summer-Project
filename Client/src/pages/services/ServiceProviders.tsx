import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { useNavigate, useParams } from "react-router-dom";

import {
  AlertCircle,
  Banknote,
  Briefcase,
  ChevronDown,
  ChevronRight,
  ChevronUp,
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
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  getProvidersByService,
  type ServiceType,
} from "../../api/services.api";
import { resolveAssetUrl } from "../../api/user.api";

// ==========================================
// TYPES
// ==========================================

type Availability = "Available" | "Busy" | "Unavailable";

type Provider = {
  _id: string;
  email: string;
  dob: string;
  service: ServiceType;
  experience: number;
  price: number;
  availability: Availability;

  // Not returned by the providers API today; used if it ever is
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

// ==========================================
// CONSTANTS / HELPERS
// ==========================================

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

// Short entrance animations (disabled for reduced-motion users).
// "backwards" fill mode so hover transforms still work afterwards.
const ANIMATION_CSS = `
@keyframes sk-fade-up {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.sk-fade-up {
  animation: sk-fade-up 350ms ease-out backwards;
}
@media (prefers-reduced-motion: reduce) {
  .sk-fade-up { animation: none; }
}
`;

const API_BASE_URL = (
  (import.meta.env.VITE_APP_BASE_URL as string | undefined) ??
  "http://localhost:9005"
).replace(/\/+$/, "");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// Real average rating from the existing public review endpoint:
//   GET /review/provider/:providerId -> meta.averageRating
// Returns 0 when there are no reviews or the request fails.
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
// SMALL COMPONENTS
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
}: {
  src: string | null;
  name: string;
}) => {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={`${name} profile photo`}
        onError={() => setFailed(true)}
        loading="lazy"
        className="h-full w-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      />
    );
  }

  // Intentional fallback when there is no (valid) photo
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[#F7F4EE]">
      <span className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-[#E3A73A]/15" />
      <span className="absolute -bottom-12 -right-8 h-44 w-44 rounded-full bg-[#F26B5E]/10" />
      <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white text-[#16233B] shadow-sm">
        <UserRound size={36} strokeWidth={1.5} />
      </span>
      <span className="relative mt-2 text-xs font-medium text-[#16233B]/60">
        Professional
      </span>
    </div>
  );
};

const ProviderSkeleton = () => (
  <div
    className="animate-pulse overflow-hidden rounded-2xl border border-gray-200 bg-white"
    aria-hidden="true"
  >
    <div className="h-60 bg-gray-200 sm:h-64 lg:h-[17rem]" />
    <div className="space-y-2.5 p-4">
      <div className="h-5 w-2/3 rounded bg-gray-200" />
      <div className="h-3 w-1/3 rounded bg-gray-100" />
      <div className="h-3 w-1/2 rounded bg-gray-100" />
      <div className="h-3 w-2/5 rounded bg-gray-100" />
      <div className="mt-3 border-t border-gray-100 pt-3">
        <div className="h-5 w-1/3 rounded bg-gray-200" />
        <div className="mt-3 h-9 rounded-lg bg-gray-200" />
        <div className="mt-2 h-9 rounded-lg bg-gray-100" />
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
  <div className="flex items-start gap-2.5">
    <Icon size={15} className="mt-0.5 shrink-0 text-[#16233B]/60" />
    <div className="min-w-0">
      <dt className="text-[11px] text-gray-500">{label}</dt>
      <dd className="break-words text-sm font-medium text-[#16233B]">
        {children}
      </dd>
    </div>
  </div>
);

// Expandable details panel (slides open inside the card)
const ProviderDetails = ({
  id,
  open,
  provider,
  name,
  rating,
  onBook,
}: {
  id: string;
  open: boolean;
  provider: Provider;
  name: string;
  rating: number;
  onBook: () => void;
}) => {
  const phone = provider.userId?.phone;
  const status =
    AVAILABILITY_STYLES[provider.availability] ??
    AVAILABILITY_STYLES.Unavailable;

  return (
    <div
      id={id}
      aria-hidden={!open}
      className={`grid transition-[grid-template-rows,opacity,visibility] duration-300 ease-out motion-reduce:transition-none ${
        open
          ? "visible grid-rows-[1fr] opacity-100"
          : "invisible grid-rows-[0fr] opacity-0"
      }`}
    >
      <div className="overflow-hidden">
        <div
          className={`mt-3 rounded-xl bg-[#F7F4EE] p-4 transition-transform duration-300 ease-out motion-reduce:transition-none ${
            open ? "translate-y-0" : "-translate-y-2"
          }`}
        >
          <h3 className="text-sm font-bold text-[#16233B]">
            Provider details
          </h3>

          <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DetailRow Icon={UserRound} label="Professional">
              {name}
            </DetailRow>

            <DetailRow Icon={Briefcase} label="Experience">
              {yearsLabel(provider.experience)}
            </DetailRow>

            <DetailRow Icon={Star} label="Rating">
              <RatingStars rating={rating} />
            </DetailRow>

            <DetailRow Icon={MapPin} label="Location">
              Kathmandu, Nepal
            </DetailRow>

            <DetailRow Icon={Mail} label="Email">
              <span className="break-all">{provider.email}</span>
            </DetailRow>

            {phone && (
              <DetailRow Icon={Phone} label="Phone">
                <a
                  href={`tel:${phone}`}
                  tabIndex={open ? 0 : -1}
                  className="rounded text-[#16233B] underline-offset-2 transition-colors duration-200 hover:text-[#F26B5E] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A]"
                >
                  {phone}
                </a>
              </DetailRow>
            )}

            <DetailRow Icon={Banknote} label="Starting from">
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

          <button
            type="button"
            onClick={onBook}
            tabIndex={open ? 0 : -1}
            className="mt-4 flex w-full items-center justify-center rounded-lg bg-[#16233B] py-2 text-sm font-semibold text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#F26B5E] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A] focus-visible:ring-offset-2 motion-reduce:transition-none"
          >
            Book Now
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// PAGE
// ==========================================

export default function ServiceProviders() {
  const { service } = useParams();

  const navigate = useNavigate();

  const [providers, setProviders] = useState<Provider[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("recommended");

  // Which provider card has its details panel open
  const [openId, setOpenId] = useState<string | null>(null);

  // Incremented by the "Try again" button to re-run the loader
  const [reloadKey, setReloadKey] = useState(0);

  const serviceName = SERVICE_NAMES[service || ""] || "Service";
  const ServiceIcon = SERVICE_ICONS[service || ""] || Briefcase;

  // ==========================================
  // LOAD PROVIDERS
  // ==========================================

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

  // ==========================================
  // LOAD REAL RATINGS (default 0 when none)
  // ==========================================

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

  // ==========================================
  // SORTING (client-side only)
  // ==========================================

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

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <main className="min-h-screen bg-[#F7F4EE] px-4 py-6 sm:px-6 sm:py-8">
      <style>{ANIMATION_CSS}</style>

      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <header className="sk-fade-up mb-5 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:gap-5 sm:px-5">
          <span className="text-xl font-extrabold tracking-tight text-[#16233B]">
            Sewa<span className="text-[#E3A73A]">Khoj</span>
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

        {/* TOOLBAR: COUNT + SORT */}
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
          <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
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

              const detailsId = `provider-details-${provider._id}`;
              const isOpen = openId === provider._id;

              return (
                <article
                  key={provider._id}
                  style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
                  className="sk-fade-up group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  {/* IMAGE */}
                  <div className="relative h-60 overflow-hidden bg-[#F7F4EE] sm:h-64 lg:h-[17rem]">
                    <ProviderImage
                      key={imageSrc ?? "none"}
                      src={imageSrc}
                      name={name}
                    />

                    {/* soft bottom gradient */}
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
                  <div className="flex flex-1 flex-col p-4">
                    <h2 className="break-words text-lg font-bold leading-snug text-[#16233B]">
                      {name}
                    </h2>

                    <p className="text-xs font-medium text-[#F26B5E]">
                      {serviceName} Professional
                    </p>

                    {/* Rating + experience */}
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

                    {/* Location */}
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
                      <MapPin size={13} className="shrink-0" />
                      Kathmandu, Nepal
                    </p>

                    {/* FOOTER */}
                    <div className="mt-3 border-t border-gray-100 pt-3">
                      <p className="text-[11px] text-gray-500">Starting from</p>
                      <p className="text-lg font-bold text-[#16233B]">
                        NPR {provider.price.toLocaleString()}
                      </p>

                      <button
                        type="button"
                        onClick={() => navigate(`/booking/${provider._id}`)}
                        className="mt-3 flex w-full items-center justify-center rounded-lg bg-[#16233B] py-2 text-sm font-semibold text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#F26B5E] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A] focus-visible:ring-offset-2 motion-reduce:transition-none"
                      >
                        Book Now
                      </button>

                      <button
                        type="button"
                        onClick={() => setOpenId(isOpen ? null : provider._id)}
                        aria-expanded={isOpen}
                        aria-controls={detailsId}
                        className="group/details mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#16233B] bg-white py-2 text-sm font-semibold text-[#16233B] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#16233B] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A] focus-visible:ring-offset-2 motion-reduce:transition-none"
                      >
                        {isOpen ? "Hide Details" : "View Details"}
                        {isOpen ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronRight
                            size={16}
                            className="transition-transform duration-200 group-hover/details:translate-x-1 motion-reduce:transition-none"
                          />
                        )}
                      </button>

                      <ProviderDetails
                        id={detailsId}
                        open={isOpen}
                        provider={provider}
                        name={name}
                        rating={rating}
                        onBook={() => navigate(`/booking/${provider._id}`)}
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}