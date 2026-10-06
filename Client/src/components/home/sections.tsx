import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
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
} from "lucide-react";
import { Link } from "react-router-dom";

/* ------------------------------------------------------------------ */
/*  DATA  (set `image` to a local path later, e.g. "/images/hari.jpg") */
/*  Empty image = a branded placeholder is shown automatically.        */
/* ------------------------------------------------------------------ */

const STATS = [
  { value: 20, suffix: "+", decimals: 0, label: "Professionals", icon: Users },
  { value: 50, suffix: "+", decimals: 0, label: "Services Completed", icon: CheckCircle },
  { value: 4.8, suffix: "/5", decimals: 1, label: "Average Rating", icon: Star },
  { value: 10, suffix: "+", decimals: 0, label: "Service Areas", icon: MapPin },
];

const TOP_PROS = [
  {
    name: "Hari Prasad",
    service: "Professional Plumber",
    location: "Kathmandu",
    rating: 4.9,
    reviews: 28,
    image: "",
  },
  {
    name: "Ramesh Karki",
    service: "Electrician",
    location: "New Baneshwor",
    rating: 4.8,
    reviews: 35,
    image: "",
  },
  {
    name: "Sita Cleaning Services",
    service: "Cleaning Service",
    location: "Baneshwor",
    rating: 4.9,
    reviews: 41,
    image: "",
  },
];

const TRENDING = [
  { name: "Home Plumbing", hint: "Find trusted plumbers", icon: Wrench, image: "" },
  { name: "Electrical Repair", hint: "Safe, certified electricians", icon: Zap, image: "" },
  { name: "House Cleaning", hint: "Spotless homes, on time", icon: Sparkles, image: "" },
  { name: "Wall Painting", hint: "Fresh coats, clean finish", icon: Paintbrush, image: "" },
  { name: "Bathroom Cleaning", hint: "Deep clean specialists", icon: ShowerHead, image: "" },
  { name: "Wiring & Installation", hint: "Reliable fitting & setup", icon: Plug, image: "" },
];

const TESTIMONIALS = [
  {
    name: "Aarav Sharma",
    text: "GharSewa helped me find a reliable plumber quickly. The service was excellent.",
    rating: 5,
    image: "",
  },
  {
    name: "Sita Thapa",
    text: "I found a professional cleaner near my home without any hassle.",
    rating: 5,
    image: "",
  },
  {
    name: "Bikash Gurung",
    text: "The platform makes it easy to compare local service providers.",
    rating: 4,
    image: "",
  },
];

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
/*  MAIN COMPONENT                                                     */
/* ------------------------------------------------------------------ */

export default function Sections() {
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
      <section id="professionals">
        <Reveal>
          <SectionTitle
            small="TOP PROFESSIONALS"
            title="Meet our trusted professionals"
          />
        </Reveal>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TOP_PROS.map((pro, i) => (
            <Reveal key={pro.name} delay={i * 100}>
              <ProCard pro={pro} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* Become a Pro */}
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

      {/* Testimonials */}
      <section>
        <Reveal>
          <SectionTitle
            small="CUSTOMER REVIEWS"
            title="What our customers say"
          />
        </Reveal>

        <div className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 md:pb-0">
          {TESTIMONIALS.map((item, i) => (
            <Reveal
              key={item.name}
              delay={i * 100}
              className="w-[85%] shrink-0 snap-center sm:w-[60%] md:w-auto"
            >
              <TestimonialCard item={item} />
            </Reveal>
          ))}
        </div>
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

function ProCard({ pro }: { pro: (typeof TOP_PROS)[number] }) {
  return (
    <div className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl">
      {/* Image */}
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-[#16233B] to-[#2A3F66]">
        {pro.image ? (
          <img
            src={pro.image}
            alt={`${pro.name}, ${pro.service}`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center transition-transform duration-500 group-hover:scale-105">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[#E3A73A] text-3xl font-bold text-[#16233B] shadow-lg">
              {pro.name.charAt(0)}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#16233B]/50 via-transparent to-transparent" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-[#16233B] shadow-sm">
          <ShieldCheck size={13} className="text-[#F26B5E]" />
          Verified
        </span>
      </div>

      {/* Details */}
      <div className="p-5">
        <h3 className="text-lg font-bold text-[#16233B]">{pro.name}</h3>
        <p className="text-sm text-gray-500">{pro.service}</p>

        <p className="mt-2 flex items-center gap-1 text-sm text-gray-400">
          <MapPin size={14} />
          {pro.location}
        </p>

        <div className="mt-3 flex items-center gap-1 text-sm">
          <Star size={16} className="fill-[#E3A73A] text-[#E3A73A]" />
          <span className="font-semibold text-[#16233B]">{pro.rating}</span>
          <span className="text-gray-400">({pro.reviews} reviews)</span>
        </div>

        <Link
          to="/professionals"
          className="mt-4 inline-flex items-center gap-1 rounded-md text-sm font-semibold text-[#F26B5E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F26B5E]"
        >
          View Profile
          <ArrowRight
            size={15}
            className="transition-transform duration-200 group-hover:translate-x-1"
          />
        </Link>
      </div>
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
            Join GharSewa, build your professional profile, and connect with
            customers looking for trusted services near them.
          </p>

          <div {...rv(400, "mt-7")}>
            <Link
              to="/register"
              className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#F26B5E] to-[#F08454] px-6 py-3 font-semibold text-white shadow-lg shadow-[#F26B5E]/20 transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#16233B] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              Become a GharSewa Pro
              <ArrowRight
                size={18}
                className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
              />
            </Link>

            <p className="mt-4 text-xs text-white/50 sm:text-sm">
              Create your profile • Get discovered • Grow your business
            </p>
          </div>
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

function TestimonialCard({ item }: { item: (typeof TESTIMONIALS)[number] }) {
  return (
    <div className="relative h-full rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <Quote
        size={28}
        className="absolute right-5 top-5 text-[#E3A73A]/30"
        aria-hidden
      />

      <div className="mb-4 flex gap-1" aria-label={`${item.rating} out of 5 stars`}>
        {Array.from({ length: item.rating }).map((_, i) => (
          <Star key={i} size={16} className="fill-[#E3A73A] text-[#E3A73A]" />
        ))}
      </div>

      <p className="text-sm leading-6 text-gray-600">"{item.text}"</p>

      <div className="mt-5 flex items-center gap-3">
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            loading="lazy"
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#16233B] text-sm font-bold text-white">
            {item.name.charAt(0)}
          </span>
        )}
        <p className="font-semibold text-[#16233B]">{item.name}</p>
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
            Ghar<span className="text-[#E3A73A]">Sewa</span>
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