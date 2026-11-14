import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { isCancel } from "axios";
import {
  Star,
  ArrowRight,
  CheckCircle,
  ShieldCheck,
  MapPin,
  Users,
  Search,
  UserRound,
  CalendarCheck,
  Smartphone,
  Quote,
  Wrench,
  Zap,
  Sparkles,
  Paintbrush,
  ShowerHead,
  Plug,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  getTopProfessionals,
  getProviderReviews,
  getTopReviews,
  normalizeReviewsResponse,
  type TopProfessional,
  type TopReview,
  type ReviewRecord,
} from "../../api/review.api";

/* ------------------------------------------------------------------ */
/*  DATA                                                               */
/* ------------------------------------------------------------------ */

const STATS = [
  { value: 20, suffix: "+", decimals: 0, label: "Professionals", icon: Users },
  { value: 50, suffix: "+", decimals: 0, label: "Services Completed", icon: CheckCircle },
  { value: 4.8, suffix: "/5", decimals: 1, label: "Average Rating", icon: Star },
  { value: 10, suffix: "+", decimals: 0, label: "Service Areas", icon: MapPin },
];

const TRENDING = [
  { name: "Home Plumbing", hint: "Find trusted plumbers", icon: Wrench, image: "" },
  { name: "Electrical Repair", hint: "Safe, certified electricians", icon: Zap, image: "" },
  { name: "House Cleaning", hint: "Spotless homes, on time", icon: Sparkles, image: "" },
  { name: "Wall Painting", hint: "Fresh coats, clean finish", icon: Paintbrush, image: "" },
  { name: "Bathroom Cleaning", hint: "Deep clean specialists", icon: ShowerHead, image: "" },
  { name: "Wiring & Installation", hint: "Reliable fitting & setup", icon: Plug, image: "" },
];

/* ------------------------------------------------------------------ */
/*  AUTH HELPER                                                        */
/* ------------------------------------------------------------------ */

const isAuthenticated = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return Boolean(localStorage.getItem("access_token"));
  } catch {
    return false;
  }
};

/* ------------------------------------------------------------------ */
/*  ANIMATION HELPERS                                                  */
/* ------------------------------------------------------------------ */

function useInView<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}

// Fade + slide up when scrolled into view. `delay` (ms) staggers siblings.
function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out motion-reduce:transition-none ${
        inView ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0 motion-reduce:opacity-100 motion-reduce:translate-y-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}

function CountUp({
  value,
  decimals,
  suffix,
  active,
}: {
  value: number;
  decimals: number;
  suffix: string;
  active: boolean;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!active) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDisplay(value);
      return;
    }
    const duration = 1200;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(value * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, value]);

  return (
    <>
      {display.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  DATA HOOK: TOP PROFESSIONALS                                       */
/* ------------------------------------------------------------------ */

type LoadStatus = "loading" | "success" | "error";

function useTopProfessionals(limit = 3) {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [pros, setPros] = useState<TopProfessional[]>([]);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");

    getTopProfessionals(limit, controller.signal)
      .then((data: TopProfessional[]) => {
        setPros(data);
        setStatus("success");
      })
      .catch((err: unknown) => {
        if (isCancel(err)) return;
        console.error("top-providers failed:", err);
        setStatus("error");
      });

    return () => controller.abort();
  }, [limit, attempt]);

  return { status, pros, retry: () => setAttempt((n) => n + 1) };
}

/* ------------------------------------------------------------------ */
/*  DATA HOOK: TOP-RATED REVIEWS                                       */
/* ------------------------------------------------------------------ */

function useTopReviews(limit = 3) {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [reviews, setReviews] = useState<TopReview[]>([]);
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    // keep showing current cards during a background refresh
    setStatus((s) => (s === "success" ? s : "loading"));

    getTopReviews(limit, controller.signal)
      .then((data) => {
        setReviews(data);
        setStatus("success");
      })
      .catch((err: unknown) => {
        if (isCancel(err)) return;
        console.error("top reviews failed:", err);
        setStatus("error");
      });

    return () => controller.abort();
  }, [limit, attempt]);

  // Refresh when a review is submitted ("review:created" is dispatched by the
  // review form's onSuccess) or when the tab becomes visible again.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") reload();
    };
    window.addEventListener("review:created", reload);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("review:created", reload);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [reload]);

  return { status, reviews, retry: reload };
}

/* ------------------------------------------------------------------ */
/*  MAIN COMPONENT                                                     */
/* ------------------------------------------------------------------ */

export default function Sections() {
  const { status, pros, retry } = useTopProfessionals(3);
  const [activePro, setActivePro] = useState<TopProfessional | null>(null);
  const topReviews = useTopReviews(3);

  // Same idea as ServiceProviders: open the reviews for the clicked professional
  const openReviews = (pro: TopProfessional) => setActivePro(pro);

  return (
    <>
      {/* Local keyframes (no Tailwind config needed) */}
      <style>{`
        @keyframes np-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-10px) } }
        .np-float { animation: np-float 5s ease-in-out infinite; }
        @keyframes np-glow { 0%,100% { opacity: .55; transform: scale(1) } 50% { opacity: 1; transform: scale(1.15) } }
        .np-glow { animation: np-glow 8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .np-float, .np-glow { animation: none; } }
      `}</style>

      <StatsStrip />

      {/* Top Professionals */}
      <section
        id="professionals"
        aria-labelledby="top-professionals-heading"
        className="relative overflow-hidden rounded-3xl border border-[#16233B]/5 bg-gradient-to-br from-white via-[#F7F4EE] to-[#FBF3E4] px-4 py-10 sm:px-8 md:px-10 md:py-14"
      >
        {/* decorative: blurred gradient circles + dot pattern */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "radial-gradient(rgba(22,35,59,0.06) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div
          aria-hidden
          className="np-glow pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(227,167,58,0.28),transparent_70%)]"
        />
        <div
          aria-hidden
          className="np-glow pointer-events-none absolute -bottom-28 -right-20 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(242,107,94,0.22),transparent_70%)]"
          style={{ animationDelay: "-4s" }}
        />

        <div className="relative">
          <Reveal>
            <div id="top-professionals-heading">
              <SectionTitle
                small="TOP PROFESSIONALS"
                title="Meet our trusted professionals"
              />
            </div>
          </Reveal>

          <div
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            aria-busy={status === "loading"}
          >
            {status === "loading" &&
              Array.from({ length: 3 }).map((_, i) => (
                <ProCardSkeleton key={i} />
              ))}

            {status === "success" &&
              pros.map((pro, i) => (
                <Reveal key={pro.id} delay={i * 100} className="h-full">
                  <ProCard
                    pro={pro}
                    profession={getProfession(pro)}
                    onViewReviews={() => openReviews(pro)}
                  />
                </Reveal>
              ))}

            {status === "success" && pros.length === 0 && (
              <StateMessage
                title="No reviewed professionals yet"
                text="Top professionals will appear here once customers start leaving reviews."
              />
            )}

            {status === "error" && (
              <StateMessage
                title="Couldn't load professionals"
                text="Something went wrong while fetching top professionals."
                onRetry={retry}
              />
            )}
          </div>
        </div>
      </section>

      {/* Reviews modal for the selected professional */}
      <ProReviewsModal
        pro={activePro}
        profession={activePro ? getProfession(activePro) : ""}
        onClose={() => setActivePro(null)}
      />

      {/* Become a Pro (CTA hidden when logged in) */}
      <BecomeAPro />

      {/* Trending Services */}
      {/* <section className="rounded-3xl bg-[#F1EDE4] p-6 md:p-10">
        <Reveal>
          <SectionTitle small="POPULAR SERVICES" title="Trending services" />
        </Reveal>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
          {TRENDING.map((service, i) => (
            <Reveal key={service.name} delay={i * 70}>
              <ServiceCard service={service} />
            </Reveal>
          ))}
        </div>
      </section> */}

      {/* How It Works */}
      <HowItWorks />

      {/* Customer reviews: top-rated reviews from the database */}
      <section>
        <Reveal>
          <SectionTitle
            small="CUSTOMER REVIEWS"
            title="What our customers say"
          />
        </Reveal>

        {(topReviews.status === "loading" ||
          (topReviews.status === "success" && topReviews.reviews.length > 0)) && (
          <div
            className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 md:pb-0"
            aria-busy={topReviews.status === "loading"}
          >
            {topReviews.status === "loading" &&
              Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="w-[85%] shrink-0 snap-center sm:w-[60%] md:w-auto"
                >
                  <ReviewCardSkeleton />
                </div>
              ))}

            {topReviews.status === "success" &&
              topReviews.reviews.map((review, i) => (
                <Reveal
                  key={review.id}
                  delay={i * 100}
                  className="w-[85%] shrink-0 snap-center sm:w-[60%] md:w-auto"
                >
                  <ReviewCard review={review} />
                </Reveal>
              ))}
          </div>
        )}

        {topReviews.status === "success" && topReviews.reviews.length === 0 && (
          <div className="grid">
            <StateMessage
              title="No reviews yet"
              text="Customer reviews will appear here once customers share their experience."
            />
          </div>
        )}

        {topReviews.status === "error" && (
          <div className="grid">
            <StateMessage
              title="Couldn't load reviews"
              text="Something went wrong while fetching customer reviews."
              onRetry={topReviews.retry}
            />
          </div>
        )}
      </section>

      {/* App Download */}
      {/* <Reveal>
        <section className="relative overflow-hidden rounded-3xl bg-[#F1EDE4] p-8 md:p-12">
          <div className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-[#E3A73A]/20 blur-3xl" />
          <div className="relative grid items-center gap-10 md:grid-cols-2">
            <div>
              <div className="flex items-center gap-2 text-[#F26B5E]">
                <Smartphone size={22} />
                <span className="font-semibold">NEARPRO APP</span>
                <span className="ml-1 rounded-full bg-[#16233B] px-2.5 py-0.5 text-xs font-semibold text-white">
                  Coming Soon
                </span>
              </div>

              <h2 className="mt-3 text-2xl font-bold text-[#16233B] md:text-3xl">
                Services at your fingertips
              </h2>

              <p className="mt-2 max-w-md text-gray-600">
                Find and connect with local professionals anytime.
              </p>

              <button
                disabled
                className="mt-6 cursor-not-allowed rounded-xl bg-[#16233B] px-6 py-3 font-semibold text-white opacity-90"
              >
                Coming Soon
              </button>
            </div>

            <PhoneMockup />
          </div>
        </section>
      </Reveal> */}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  SMALL COMPONENTS                                                   */
/* ------------------------------------------------------------------ */

function SectionTitle({ small, title }: { small: string; title: string }) {
  return (
    <div className="mb-7">
      <p className="text-sm font-semibold uppercase tracking-wider text-[#F26B5E]">
        {small}
      </p>
      <h2 className="mt-1 text-2xl font-bold text-[#16233B] md:text-3xl">
        {title}
      </h2>
    </div>
  );
}

function StatsStrip() {
  const { ref, inView } = useInView<HTMLElement>(0.3);

  return (
    <section
      ref={ref}
      className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-[#16233B]/10 bg-[#16233B]/10 shadow-sm md:grid-cols-4"
    >
      {STATS.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            style={{ transitionDelay: `${i * 100}ms` }}
            className={`group bg-white p-6 text-center transition-all duration-700 ease-out hover:bg-[#FBF9F5] motion-reduce:transition-none md:p-8 ${
              inView ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
            }`}
          >
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7F4EE] text-[#E3A73A] transition-all duration-300 group-hover:-translate-y-0.5 group-hover:bg-[#E3A73A] group-hover:text-white">
              <Icon size={20} />
            </div>
            <p className="text-2xl font-bold text-[#16233B] md:text-3xl">
              <CountUp
                value={stat.value}
                decimals={stat.decimals}
                suffix={stat.suffix}
                active={inView}
              />
            </p>
            <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
          </div>
        );
      })}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  PROFESSIONAL CARD                                                  */
/* ------------------------------------------------------------------ */

// Fallback gradients (full class strings so Tailwind can detect them).
// Picked deterministically from the name so a card never changes colour on re-render.
const AVATAR_GRADIENTS = [
  "from-[#16233B] via-[#1F3257] to-[#2A3F66]",
  "from-[#16233B] via-[#2A3F66] to-[#F26B5E]/70",
  "from-[#16233B] via-[#2A3F66] to-[#E3A73A]/70",
];

// Profession label ("Plumbing", "Electrical"...) from whatever the API returns.
// Accepts an array or a string, plain strings or { name } objects, and the
// raw service keys used elsewhere in the app (plumber, electrician, ...).
const SERVICE_LABELS: Record<string, string> = {
  plumber: "Plumbing",
  electrician: "Electrical",
  cleaner: "Cleaning",
  painter: "Painting",
};

const toServiceLabel = (value: unknown): string => {
  if (typeof value === "string") {
    const key = value.trim();
    if (!key) return "";
    return (
      SERVICE_LABELS[key.toLowerCase()] ??
      key.charAt(0).toUpperCase() + key.slice(1)
    );
  }
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    return toServiceLabel(o.name ?? o.title ?? o.label ?? o.service);
  }
  return "";
};

function getProfession(pro: TopProfessional): string {
  const raw = pro as unknown as Record<string, unknown>;
  const candidates = [
    raw.services,
    raw.service,
    raw.profession,
    raw.category,
    raw.serviceType,
  ];
  for (const candidate of candidates) {
    const list = Array.isArray(candidate) ? candidate : [candidate];
    const labels = list.map(toServiceLabel).filter(Boolean);
    if (labels.length) return Array.from(new Set(labels)).join(", ");
  }
  return "";
}

function pickGradient(name: string): string {
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return AVATAR_GRADIENTS[sum % AVATAR_GRADIENTS.length];
}

function RatingStars({ rating }: { rating: number }) {
  const filled = Math.round(rating);
  return (
    <div className="flex gap-0.5" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={15}
          className={
            i < filled
              ? "fill-[#E3A73A] text-[#E3A73A]"
              : "fill-transparent text-[#16233B]/20"
          }
        />
      ))}
    </div>
  );
}

function ProCard({
  pro,
  profession,
  onViewReviews,
}: {
  pro: TopProfessional;
  profession: string;
  onViewReviews: () => void;
}) {
  const servicesText = profession;
  const reviewLabel = `${pro.reviews} ${pro.reviews === 1 ? "review" : "reviews"}`;

  return (
    <article
      aria-label={`${pro.name}, rated ${pro.rating.toFixed(1)} out of 5 from ${reviewLabel}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-[#16233B]/10 bg-white shadow-md shadow-[#16233B]/5 transition-all duration-300 hover:-translate-y-2 hover:border-[#E3A73A]/50 hover:shadow-2xl hover:shadow-[#16233B]/15 focus-within:ring-2 focus-within:ring-[#E3A73A] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      {/* gold -> coral accent line */}
      <div className="absolute inset-x-0 top-0 z-10 h-1 bg-gradient-to-r from-[#E3A73A] to-[#F26B5E]" />

      {/* Image / gradient fallback */}
      <div
        className={`relative h-60 overflow-hidden bg-gradient-to-br ${pickGradient(
          pro.name
        )}`}
      >
        {pro.image ? (
          <img
            src={pro.image}
            alt={servicesText ? `${pro.name}, ${servicesText}` : pro.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : (
          <div className="relative flex h-full items-center justify-center">
            <div
              aria-hidden
              className="absolute h-40 w-40 rounded-full bg-[#E3A73A]/20 blur-2xl"
            />
            <span
              aria-hidden
              className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-[#E3A73A] to-[#F0BE5C] text-5xl font-bold text-[#16233B] shadow-xl ring-4 ring-white/25 transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            >
              {pro.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#16233B]/70 via-[#16233B]/5 to-transparent" />

        {pro.verified && (
          <span className="absolute left-3 top-4 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#16233B] shadow-lg">
            <ShieldCheck size={15} className="text-[#F26B5E]" />
            Verified
          </span>
        )}

        {/* Rating pill */}
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-[#16233B]/85 px-3 py-1.5 text-sm font-bold text-white shadow-lg backdrop-blur">
          <Star size={15} className="fill-[#E3A73A] text-[#E3A73A]" />
          {pro.rating.toFixed(1)}
        </span>
      </div>

      {/* Details */}
      <div className="flex flex-1 flex-col p-6">
        <h3 className="truncate text-xl font-extrabold tracking-tight text-[#16233B]">
          {pro.name}
        </h3>

        {/* Profession directly below the name */}
        {servicesText && (
          <p
            className="mt-1 truncate text-sm font-semibold text-[#F26B5E]"
            title={servicesText}
          >
            {servicesText}
          </p>
        )}

        {/* Review count + View All Reviews */}
        <button
          type="button"
          onClick={onViewReviews}
          aria-label={`View all reviews for ${pro.name}`}
          className="group/reviews -ml-2 mt-2 inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-[#16233B]/70 transition-all duration-150 ease-out hover:bg-[#F26B5E]/10 hover:text-[#F26B5E] active:scale-95 active:bg-[#F26B5E]/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A] motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          <span>{reviewLabel}</span>
          <span className="text-gray-300" aria-hidden>
            •
          </span>
          <span className="inline-flex items-center gap-0.5 text-[#F26B5E]">
            View All Reviews
            <ChevronRight
              size={14}
              className="transition-transform duration-200 group-hover/reviews:translate-x-0.5 group-active/reviews:translate-x-1.5 motion-reduce:transition-none"
            />
          </span>
        </button>

        {pro.location && (
          <p className="mt-4 flex items-center gap-2 text-sm text-gray-600">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F26B5E]/10 text-[#F26B5E]">
              <MapPin size={14} />
            </span>
            <span className="truncate">{pro.location}</span>
          </p>
        )}

        {/* Rating footer pinned to the bottom so cards align */}
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-[#16233B]/10 pt-5">
          <div className="flex items-center gap-2">
            <RatingStars rating={pro.rating} />
            <span className="text-sm font-bold text-[#16233B]">
              {pro.rating.toFixed(1)}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/*  REVIEWS MODAL                                                      */
/* ------------------------------------------------------------------ */

type ReviewsState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "success"; reviews: ReviewRecord[]; average: number; count: number };

const formatReviewDate = (iso: string): string => {
  const date = new Date(iso);
  if (!iso || Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const reviewTime = (r: ReviewRecord): number => {
  const t = r.createdAt ? new Date(r.createdAt).getTime() : NaN;
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
};

function ProReviewsModal({
  pro,
  profession,
  onClose,
}: {
  pro: TopProfessional | null;
  profession: string;
  onClose: () => void;
}) {
  const [state, setState] = useState<ReviewsState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const proId = pro?.id;

  // Fetch this professional's reviews with the existing API
  useEffect(() => {
    if (!proId) return;
    let cancelled = false;
    setState({ status: "loading" });

    getProviderReviews(proId)
      .then((body: unknown) => {
        if (cancelled) return;
        const data = normalizeReviewsResponse(body);
        setState({
          status: "success",
          reviews: data.reviews,
          average: data.average,
          count: data.count,
        });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [proId, attempt]);

  // Escape to close + lock page scroll while open
  useEffect(() => {
    if (!pro) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = original;
    };
  }, [pro, onClose]);

  if (!pro) return null;

  const titleId = `pro-reviews-title-${pro.id}`;
  const services = profession;
  const sorted =
    state.status === "success"
      ? [...state.reviews].sort((a, b) => reviewTime(b) - reviewTime(a))
      : [];
  const total =
    state.status === "success"
      ? Math.max(state.count, state.reviews.length)
      : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        aria-label="Close reviews"
        onClick={onClose}
        className="absolute inset-0 bg-[#16233B]/60 backdrop-blur-sm"
      />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-start gap-4 border-b border-gray-100 p-5 sm:p-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#16233B] to-[#2A3F66] sm:h-14 sm:w-14">
            {pro.image ? (
              <img
                src={pro.image}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-lg font-bold text-[#E3A73A]">
                {pro.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1 pr-10">
            <p className="truncate text-xs font-semibold text-[#F26B5E]">
              {pro.name}
              {services ? ` · ${services}` : ""}
            </p>
            <h2
              id={titleId}
              className="text-xl font-bold text-[#16233B] sm:text-2xl"
            >
              Customer Reviews
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-[#16233B] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#F26B5E] hover:text-[#F26B5E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">
          {state.status === "loading" && (
            <div role="status" aria-label="Loading reviews" className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  aria-hidden
                  className="animate-pulse rounded-2xl border border-gray-200 p-4 motion-reduce:animate-none"
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
              ))}
            </div>
          )}

          {state.status === "error" && (
            <div role="alert" className="px-4 py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
                <AlertCircle size={26} aria-hidden />
              </div>
              <h3 className="mt-4 text-lg font-bold text-[#16233B]">
                Unable to load reviews.
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Please try again in a moment.
              </p>
              <button
                type="button"
                onClick={() => setAttempt((n) => n + 1)}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#16233B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#F26B5E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A] focus-visible:ring-offset-2"
              >
                <RefreshCw size={15} aria-hidden />
                Try Again
              </button>
            </div>
          )}

          {state.status === "success" && sorted.length === 0 && (
            <div className="px-4 py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E3A73A]/15">
                <Star size={26} aria-hidden className="fill-[#E3A73A]/40 text-[#E3A73A]" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-[#16233B]">
                No reviews yet
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Reviews will appear here once customers share their experience.
              </p>
            </div>
          )}

          {state.status === "success" && sorted.length > 0 && (
            <div className="space-y-5">
              <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-[#F7F4EE]/60 p-5">
                <p className="flex items-center gap-1.5 text-4xl font-extrabold tabular-nums text-[#16233B]">
                  {state.average.toFixed(1)}
                  <Star size={24} aria-hidden className="fill-[#E3A73A] text-[#E3A73A]" />
                </p>
                <div>
                  <RatingStars rating={state.average} />
                  <p className="mt-1 text-sm text-gray-500">
                    Based on {total} {total === 1 ? "review" : "reviews"}
                  </p>
                </div>
              </div>

              <ul className="space-y-3">
                {sorted.map((review) => {
                  const name = review.customerName || "Customer";
                  const date = formatReviewDate(review.createdAt);
                  return (
                    <li
                      key={review.id}
                      className="rounded-2xl border border-gray-200 bg-white p-4"
                    >
                      <div className="flex items-start gap-3">
                        {review.customerAvatar ? (
                          <img
                            src={review.customerAvatar}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <span
                            aria-hidden
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F7F4EE] text-sm font-semibold text-[#16233B]"
                          >
                            {name.charAt(0).toUpperCase()}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#16233B]">
                            {name}
                          </p>
                          <div className="mt-1">
                            <RatingStars rating={review.rating} />
                          </div>
                        </div>
                        {date && (
                          <time
                            dateTime={review.createdAt}
                            className="shrink-0 text-xs text-gray-400"
                          >
                            {date}
                          </time>
                        )}
                      </div>
                      {review.comment && (
                        <p className="mt-3 whitespace-pre-line break-words text-sm leading-relaxed text-gray-700">
                          “{review.comment}”
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProCardSkeleton() {
  return (
    <div
      aria-hidden
      className="flex h-full flex-col overflow-hidden rounded-3xl border border-[#16233B]/10 bg-white shadow-md shadow-[#16233B]/5"
    >
      <div className="h-60 animate-pulse bg-[#16233B]/10 motion-reduce:animate-none" />
      <div className="flex flex-1 flex-col p-6">
        <div className="h-6 w-2/3 animate-pulse rounded bg-[#16233B]/10 motion-reduce:animate-none" />
        <div className="mt-3 flex gap-1.5">
          <div className="h-6 w-20 animate-pulse rounded-full bg-[#16233B]/10 motion-reduce:animate-none" />
          <div className="h-6 w-16 animate-pulse rounded-full bg-[#16233B]/10 motion-reduce:animate-none" />
        </div>
        <div className="mt-4 h-4 w-2/5 animate-pulse rounded bg-[#16233B]/10 motion-reduce:animate-none" />
        <div className="mt-auto flex items-center justify-between border-t border-[#16233B]/10 pt-5">
          <div className="h-4 w-24 animate-pulse rounded bg-[#E3A73A]/30 motion-reduce:animate-none" />
          <div className="h-5 w-16 animate-pulse rounded-full bg-[#16233B]/10 motion-reduce:animate-none" />
        </div>
      </div>
    </div>
  );
}

function StateMessage({
  title,
  text,
  onRetry,
}: {
  title: string;
  text: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role={onRetry ? "alert" : "status"}
      className="col-span-full flex min-h-[18rem] flex-col items-center justify-center rounded-2xl border border-dashed border-[#16233B]/15 bg-white/70 p-8 text-center backdrop-blur-sm"
    >
      <Users size={28} className="text-[#E3A73A]" />
      <p className="mt-3 text-lg font-bold text-[#16233B]">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-gray-500">{text}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 rounded-xl bg-[#F26B5E] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A]"
        >
          Try again
        </button>
      )}
    </div>
  );
}

function ServiceCard({ service }: { service: (typeof TRENDING)[number] }) {
  const Icon = service.icon;
  return (
    <Link
      to="/services"
      className="group block overflow-hidden rounded-2xl border border-white bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#F26B5E]/30 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F26B5E]"
    >
      <div className="relative h-20 overflow-hidden bg-gradient-to-br from-[#16233B] to-[#2A3F66] sm:h-28">
        {service.image ? (
          <img
            src={service.image}
            alt={service.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[#E3A73A] transition-transform duration-500 group-hover:scale-110">
            <Icon size={32} />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 p-3 sm:p-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#16233B] sm:text-base">
            {service.name}
          </p>
          <p className="hidden truncate text-xs text-gray-500 sm:block">
            {service.hint}
          </p>
        </div>
        <ArrowRight
          size={17}
          className="shrink-0 text-[#F26B5E] transition-transform duration-200 group-hover:translate-x-1"
        />
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  BECOME A PRO                                                       */
/* ------------------------------------------------------------------ */

function BecomeAPro() {
  const { ref, inView } = useInView<HTMLElement>(0.2);

  // Hide the "Become a Pro" CTA for authenticated users.
  // Reads the same access token key used across the app.
  const [loggedIn, setLoggedIn] = useState(false);
  useEffect(() => {
    setLoggedIn(isAuthenticated());
  }, []);

  // Fade-up helper with a stagger delay (ms); merges extra classes
  const rv = (delay: number, extra = "") => ({
    style: { transitionDelay: `${delay}ms` },
    className: `transition-all duration-700 ease-out motion-reduce:transition-none ${
      inView
        ? "translate-y-0 opacity-100"
        : "translate-y-5 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100"
    } ${extra}`,
  });

  return (
    <section
      ref={ref}
      {...rv(
        0,
        "relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#16233B] to-[#0F172A] text-white"
      )}
    >
      {/* dot grid + glows */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(rgba(247,244,238,0.07) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />
      <div className="np-glow pointer-events-none absolute -left-24 top-0 h-80 w-80 bg-[radial-gradient(circle,rgba(227,167,58,0.22),transparent_70%)]" />
      <div
        className="np-glow pointer-events-none absolute -bottom-28 right-0 h-80 w-80 bg-[radial-gradient(circle,rgba(242,107,94,0.22),transparent_70%)]"
        style={{ animationDelay: "-4s" }}
      />

      <div className="relative grid items-center gap-8 p-7 text-center sm:p-9 md:grid-cols-[1.15fr_0.85fr] md:gap-10 md:p-12 md:text-left">
        {/* Content */}
        <div>
          <p
            {...rv(
              100,
              "inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#E3A73A] sm:text-sm"
            )}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E3A73A] opacity-60 motion-reduce:animate-none" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#E3A73A]" />
            </span>
            For Local Professionals
          </p>

          <h2
            {...rv(
              200,
              "mt-3 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl"
            )}
          >
            Turn Your Skills Into{" "}
            <span className="text-[#E3A73A]">More Opportunities</span>
          </h2>

          <p
            {...rv(
              300,
              "mx-auto mt-4 max-w-lg text-[#F7F4EE]/80 md:mx-0"
            )}
          >
            Join SewaKhoj, build your professional profile, and connect with
            customers looking for trusted services near them.
          </p>

          {/* CTA: hidden when the user is already logged in */}
          {!loggedIn && (
            <div {...rv(400, "mt-7")}>
              <Link
                to="/register"
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#F26B5E] to-[#F08454] px-6 py-3 font-semibold text-white shadow-lg shadow-[#F26B5E]/20 transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#16233B] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                Become a SewaKhoj Pro
                <ArrowRight
                  size={18}
                  className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                />
              </Link>

              <p className="mt-4 text-xs text-white/50 sm:text-sm">
                Create your profile • Get discovered • Grow your business
              </p>
            </div>
          )}
        </div>

        {/* CSS-only decorative visual */}
        <div
          aria-hidden
          {...rv(300, "relative mx-auto h-32 w-full max-w-xs sm:h-40 md:h-60 md:max-w-sm")}
        >
          {/* layered rounded shapes */}
          <div className="absolute inset-x-8 inset-y-4 rotate-3 rounded-3xl border border-white/10 bg-white/[0.03] md:inset-x-10 md:inset-y-8" />
          <div className="absolute inset-x-6 inset-y-2 -rotate-2 rounded-3xl border border-white/10 bg-white/[0.05] md:inset-x-6 md:inset-y-4" />

          {/* thin connecting curves */}
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 300 200"
            preserveAspectRatio="none"
            fill="none"
          >
            <path
              d="M20 150 C90 150 90 50 150 70 S240 40 285 30"
              stroke="#F7F4EE"
              strokeOpacity="0.18"
              strokeDasharray="3 6"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d="M30 40 C100 20 120 130 200 120 S260 150 290 170"
              stroke="#E3A73A"
              strokeOpacity="0.22"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {/* floating dots */}
          <span className="np-float absolute left-1/2 top-2 h-3 w-3 rounded-full bg-[#E3A73A]/80" style={{ animationDuration: "6s" }} />
          <span className="np-float absolute bottom-3 right-6 h-4 w-4 rounded-full bg-[#F26B5E]/70" style={{ animationDuration: "7s", animationDelay: "-2s" }} />
          <span className="np-float absolute bottom-6 left-6 h-2 w-2 rounded-full bg-[#F7F4EE]/60" style={{ animationDuration: "5s", animationDelay: "-1s" }} />

          {/* floating badges */}
          <ProBadge
            className="left-0 top-3 md:top-6"
            icon={<Users size={14} />}
            iconClass="bg-[#E3A73A]/20 text-[#B07A12]"
            label="+ More Customers"
            duration={6}
            offset={0}
          />
          <ProBadge
            className="right-0 top-14 sm:top-16 md:top-24"
            icon={<CheckCircle size={14} />}
            iconClass="bg-[#F26B5E]/15 text-[#F26B5E]"
            label="Verified Profile"
            duration={7}
            offset={-2}
          />
          <ProBadge
            className="bottom-1 left-6 hidden sm:flex md:bottom-4 md:left-10"
            icon={<Star size={14} className="fill-[#E3A73A]" />}
            iconClass="bg-[#E3A73A]/20 text-[#E3A73A]"
            label="Build Your Reputation"
            duration={6.5}
            offset={-4}
          />
        </div>
      </div>
    </section>
  );
}

function ProBadge({
  className,
  icon,
  iconClass,
  label,
  duration,
  offset,
}: {
  className: string;
  icon: ReactNode;
  iconClass: string;
  label: string;
  duration: number;
  offset: number;
}) {
  return (
    <div className={`absolute ${className}`}>
      <div
        className="np-float flex items-center gap-2 rounded-xl bg-[#F7F4EE] px-3 py-2 text-xs font-semibold text-[#16233B] shadow-lg"
        style={{ animationDuration: `${duration}s`, animationDelay: `${offset}s` }}
      >
        <span className={`flex h-6 w-6 items-center justify-center rounded-full ${iconClass}`}>
          {icon}
        </span>
        {label}
      </div>
    </div>
  );
}

const STEPS = [
  {
    number: "01",
    icon: Search,
    title: "Search",
    label: "Find a service",
    text: "Find the service you need from local professionals.",
    accent: "gold",
  },
  {
    number: "02",
    icon: UserRound,
    title: "Choose",
    label: "Choose a professional",
    text: "Compare profiles, ratings, reviews and experience.",
    accent: "coral",
  },
  {
    number: "03",
    icon: CalendarCheck,
    title: "Book",
    label: "Get it done",
    text: "Contact your chosen professional and book the service.",
    accent: "navy",
  },
] as const;

// Full class strings so Tailwind can detect them
const ACCENTS = {
  gold: { chip: "bg-[#E3A73A]/15 text-[#9A6B10]", glow: "bg-[#E3A73A]/25" },
  coral: { chip: "bg-[#F26B5E]/10 text-[#D4493C]", glow: "bg-[#F26B5E]/20" },
  navy: { chip: "bg-[#16233B]/10 text-[#16233B]", glow: "bg-[#16233B]/10" },
};

function HowItWorks() {
  const { ref, inView } = useInView<HTMLDivElement>(0.25);

  return (
    <section
      id="how-it-works"
      className="relative overflow-hidden rounded-3xl border border-[#16233B]/5 bg-gradient-to-b from-white to-[#F7F4EE] px-4 py-10 sm:px-8 md:px-10 md:py-14"
    >
      {/* subtle background accents */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#E3A73A]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#F26B5E]/10 blur-3xl" />

      <div className="relative">
        <Reveal>
          <SectionTitle
            small="HOW IT WORKS"
            title="Get your service in 3 simple steps"
          />
        </Reveal>

        <div ref={ref} className="relative">
          {/* Desktop journey: numbered nodes joined by an animated line */}
          <div className="relative mb-8 hidden md:block">
            <div className="absolute left-[16.67%] right-[16.67%] top-7 -translate-y-1/2">
              <div className="border-t-2 border-dashed border-[#16233B]/15" />
              <div
                className={`absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 origin-left rounded-full bg-gradient-to-r from-[#E3A73A] to-[#F26B5E] transition-transform duration-[1400ms] ease-out motion-reduce:transition-none ${
                  inView ? "scale-x-100" : "scale-x-0"
                }`}
              />
            </div>

            {/* arrows between nodes */}
            {["left-1/3", "left-2/3"].map((pos, i) => (
              <span
                key={pos}
                style={{ transitionDelay: `${700 + i * 400}ms` }}
                className={`absolute top-7 ${pos} flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#16233B]/10 bg-white text-[#F26B5E] shadow-sm transition-opacity duration-500 ${
                  inView ? "opacity-100" : "opacity-0"
                }`}
              >
                <ArrowRight size={13} />
              </span>
            ))}

            <div className="relative grid grid-cols-3 gap-6 lg:gap-10">
              {STEPS.map((step, i) => (
                <div
                  key={step.number}
                  style={{ transitionDelay: `${i * 250}ms` }}
                  className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#16233B] text-lg font-bold text-[#E3A73A] shadow-lg ring-4 ring-white transition-all duration-500 motion-reduce:transition-none ${
                    inView ? "scale-100 opacity-100" : "scale-75 opacity-0"
                  }`}
                >
                  {step.number}
                </div>
              ))}
            </div>
          </div>

          {/* Steps (stacked with a vertical rail on mobile) */}
          <div className="grid gap-6 md:grid-cols-3 lg:gap-10">
            {STEPS.map((step, i) => (
              <Reveal
                key={step.number}
                delay={i * 150}
                className="relative pl-16 md:pl-0"
              >
                {/* mobile node + vertical connector */}
                <span className="absolute left-0 top-0 flex h-12 w-12 items-center justify-center rounded-full bg-[#16233B] text-sm font-bold text-[#E3A73A] shadow-md ring-4 ring-white md:hidden">
                  {step.number}
                </span>
                {i < STEPS.length - 1 && (
                  <span className="absolute -bottom-6 left-6 top-12 w-0.5 -translate-x-1/2 bg-gradient-to-b from-[#E3A73A]/60 to-[#F26B5E]/40 md:hidden" />
                )}

                <StepCard step={step} />
              </Reveal>
            ))}
          </div>
        </div>

        {/* Trust message */}
        <Reveal delay={200} className="mt-10 flex justify-center">
          <p className="inline-flex items-center gap-2 rounded-2xl border border-[#16233B]/10 bg-white/70 px-4 py-2.5 text-center text-sm text-gray-600">
            <ShieldCheck size={16} className="shrink-0 text-[#F26B5E]" />
            Simple, reliable and designed to help you find the right professional.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function StepCard({ step }: { step: (typeof STEPS)[number] }) {
  const Icon = step.icon;
  const accent = ACCENTS[step.accent];

  return (
    <div className="group relative h-full overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl sm:p-7">
      {/* faint oversized number + soft glow + tiny dots */}
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-8 -right-2 select-none text-[9rem] font-black leading-none text-[#16233B]/[0.04]"
      >
        {step.number}
      </span>
      <div
        className={`pointer-events-none absolute -left-12 -top-12 h-36 w-36 rounded-full blur-2xl ${accent.glow}`}
      />
      <div className="absolute right-5 top-5 flex gap-1" aria-hidden>
        <span className="h-1.5 w-1.5 rounded-full bg-[#E3A73A]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#F26B5E]/70" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#16233B]/20" />
      </div>

      <div className="relative">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#16233B] to-[#2A3F66] text-[#E3A73A] shadow-lg transition-all duration-300 group-hover:-translate-y-0.5 group-hover:scale-110">
          <Icon size={28} />
        </div>

        <span
          className={`mt-5 inline-block rounded-full px-3 py-1 text-xs font-semibold ${accent.chip}`}
        >
          {step.label}
        </span>

        <h3 className="mt-3 text-xl font-bold text-[#16233B]">{step.title}</h3>
        <p className="mt-2 text-sm leading-6 text-gray-500">{step.text}</p>
      </div>
    </div>
  );
}

function ReviewAvatar({ src, name }: { src?: string | null; name: string }) {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-10 w-10 rounded-full object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden
      className="flex h-10 w-10 items-center justify-center rounded-full bg-[#16233B] text-sm font-bold text-white"
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function ReviewCard({ review }: { review: TopReview }) {
  const name = review.customerName || "Customer";
  const date = formatReviewDate(review.createdAt);
  const stars = Math.max(0, Math.min(5, Math.round(review.rating)));

  return (
    <div className="relative h-full rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <Quote
        size={28}
        className="absolute right-5 top-5 text-[#E3A73A]/30"
        aria-hidden
      />

      <div className="mb-4 flex gap-1" aria-label={`${stars} out of 5 stars`}>
        {Array.from({ length: stars }).map((_, i) => (
          <Star key={i} size={16} className="fill-[#E3A73A] text-[#E3A73A]" />
        ))}
      </div>

      <p className="text-sm leading-6 text-gray-600">"{review.comment}"</p>

      <div className="mt-5 flex items-center gap-3">
        <ReviewAvatar
          key={review.customerAvatar ?? "none"}
          src={review.customerAvatar}
          name={name}
        />
        <div className="min-w-0">
          <p className="truncate font-semibold text-[#16233B]">{name}</p>
          <p className="truncate text-xs text-gray-500">
            {review.providerName}
            {review.providerName && date ? " · " : ""}
            {date}
          </p>
        </div>
      </div>
    </div>
  );
}

function ReviewCardSkeleton() {
  return (
    <div
      aria-hidden
      className="h-full rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
    >
      <div className="mb-4 h-4 w-24 animate-pulse rounded bg-[#E3A73A]/30 motion-reduce:animate-none" />
      <div className="space-y-2">
        <div className="h-3.5 w-full animate-pulse rounded bg-[#16233B]/10 motion-reduce:animate-none" />
        <div className="h-3.5 w-5/6 animate-pulse rounded bg-[#16233B]/10 motion-reduce:animate-none" />
        <div className="h-3.5 w-2/3 animate-pulse rounded bg-[#16233B]/10 motion-reduce:animate-none" />
      </div>
      <div className="mt-5 flex items-center gap-3">
        <div className="h-10 w-10 animate-pulse rounded-full bg-[#16233B]/10 motion-reduce:animate-none" />
        <div className="space-y-2">
          <div className="h-3.5 w-24 animate-pulse rounded bg-[#16233B]/10 motion-reduce:animate-none" />
          <div className="h-3 w-32 animate-pulse rounded bg-[#16233B]/10 motion-reduce:animate-none" />
        </div>
      </div>
    </div>
  );
}

function PhoneMockup() {
  return (
    <div className="relative mx-auto flex h-[360px] w-full max-w-xs items-center justify-center">
      <div className="np-float relative h-[340px] w-[170px] rounded-[2rem] border-[6px] border-[#16233B] bg-white shadow-2xl">
        {/* notch */}
        <div className="absolute left-1/2 top-1.5 h-1.5 w-12 -translate-x-1/2 rounded-full bg-[#16233B]" />

        <div className="px-3 pt-6">
          <p className="text-sm font-extrabold tracking-tight text-[#16233B]">
            Sewa<span className="text-[#E3A73A]">Khoj</span>
          </p>

          <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-[#F7F4EE] px-2 py-1.5 text-[10px] text-gray-400">
            <Search size={11} />
            Search a service
          </div>

          {["Plumber", "Electrician", "Cleaner"].map((role) => (
            <div
              key={role}
              className="mt-2.5 flex items-center gap-2 rounded-lg border border-gray-100 p-2"
            >
              <span className="h-7 w-7 rounded-full bg-[#16233B]" />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-[#16233B]">
                  {role}
                </p>
                <p className="flex items-center gap-0.5 text-[9px] text-gray-400">
                  <Star size={8} className="fill-[#E3A73A] text-[#E3A73A]" />
                  4.8 · Near you
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* floating chips */}
      <span className="absolute left-2 top-10 flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#16233B] shadow-lg">
        <ShieldCheck size={13} className="text-[#F26B5E]" />
        Verified
      </span>
      <span className="absolute bottom-12 right-2 flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#16233B] shadow-lg">
        <Star size={13} className="fill-[#E3A73A] text-[#E3A73A]" />
        4.9
      </span>
    </div>
  );
}