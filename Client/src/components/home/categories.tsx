import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { Wrench, Zap, Sparkles, Paintbrush, ArrowRight } from "lucide-react";

// Same structure as before, plus a short `description` for each card
const CATEGORIES = [
  {
    name: "Plumbing",
    service: "plumber",
    icon: Wrench,
    color: "#3B82F6",
    description: "Repairs, pipes & installations",
  },
  {
    name: "Electrical",
    service: "electrician",
    icon: Zap,
    color: "#E3A73A",
    description: "Wiring, repairs & installations",
  },
  {
    name: "Cleaning",
    service: "cleaner",
    icon: Sparkles,
    color: "#10B981",
    description: "Home & office cleaning",
  },
  {
    name: "Painting",
    service: "painter",
    icon: Paintbrush,
    color: "#F26B5E",
    description: "Interior & exterior painting",
  },
];

// Fires once when the section scrolls into view
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

export default function Categories() {
  const { ref, inView } = useInView<HTMLElement>();

  // Fade + slide-up classes with a stagger delay (ms)
  const enter = (delay: number) => ({
    style: { transitionDelay: `${delay}ms` } as CSSProperties,
    className: `transition-all duration-700 ease-out motion-reduce:transition-none ${
      inView
        ? "translate-y-0 opacity-100"
        : "translate-y-6 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100"
    }`,
  });

  return (
    <section
      id="categories"
      ref={ref}
      aria-labelledby="categories-title"
      className="relative overflow-hidden rounded-3xl border border-[#16233B]/5 bg-gradient-to-b from-[#F7F4EE] to-[#FBF9F5] px-4 py-10 sm:px-8 md:py-14"
    >
      {/* subtle background shapes */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#F26B5E]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-[#E3A73A]/15 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-56 w-56 -translate-x-1/2 rounded-full bg-[#16233B]/[0.04] blur-3xl" />

      <div className="relative">
        {/* Header */}
        <div
          {...enter(0)}
          className={`mx-auto mb-10 max-w-2xl text-center ${enter(0).className}`}
        >
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#F26B5E]">
            <span className="h-px w-6 bg-[#E3A73A]" />
            Explore Services
            <span className="h-px w-6 bg-[#E3A73A]" />
          </p>

          <h2
            id="categories-title"
            className="mt-3 text-3xl font-extrabold tracking-tight text-[#16233B] sm:text-4xl"
          >
            What do you need help with?
          </h2>

          <p className="mt-3 text-gray-500">
            From quick repairs to everyday services, find trusted professionals
            ready to help.
          </p>
        </div>

        {/* Cards */}
        <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {CATEGORIES.map((category, i) => {
            const Icon = category.icon;

            // Category color exposed to Tailwind via CSS variables
            const vars = {
              "--c": category.color,
              "--c-soft": `${category.color}1A`,
              "--c-mid": `${category.color}33`,
              "--c-glow": `${category.color}55`,
              "--c-edge": `${category.color}66`,
            } as CSSProperties;

            return (
              <li
                key={category.name}
                style={{ transitionDelay: `${150 + i * 100}ms` }}
                className={`transition-all duration-700 ease-out motion-reduce:transition-none ${
                  inView
                    ? "translate-y-0 opacity-100"
                    : "translate-y-6 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100"
                }`}
              >
                <Link
                  to={`/services/${category.service}`}
                  style={vars}
                  className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-[#16233B]/10 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-[color:var(--c-edge)] hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--c)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-6"
                >
                  {/* decorative details (very low opacity) */}
                  <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[color:var(--c)] opacity-10 blur-2xl transition-opacity duration-300 group-hover:opacity-25" />
                  <div className="pointer-events-none absolute -bottom-12 -left-12 h-32 w-32 rounded-full border border-[color:var(--c-edge)] opacity-30" />
                  <span className="pointer-events-none absolute right-5 top-5 h-1.5 w-1.5 rounded-full bg-[color:var(--c)] opacity-50" />
                  <Icon
                    aria-hidden
                    size={110}
                    strokeWidth={1.25}
                    className="pointer-events-none absolute -bottom-3 -right-3 text-[color:var(--c)] opacity-[0.06]"
                  />

                  {/* Icon with glow */}
                  <div className="relative h-14 w-14 sm:h-16 sm:w-16">
                    <div className="absolute inset-0 rounded-2xl bg-[color:var(--c-glow)] opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100" />
                    <div className="relative flex h-full w-full items-center justify-center rounded-2xl bg-[color:var(--c-soft)] text-[color:var(--c)] transition-all duration-300 group-hover:-rotate-3 group-hover:scale-110 group-hover:bg-[color:var(--c-mid)] motion-reduce:transition-none motion-reduce:group-hover:rotate-0 motion-reduce:group-hover:scale-100">
                      <Icon className="h-7 w-7 sm:h-8 sm:w-8" />
                    </div>
                  </div>

                  {/* Text */}
                  <h3 className="relative mt-5 text-lg font-bold text-[#16233B] transition-colors duration-300 group-hover:text-[color:var(--c)] sm:text-xl">
                    {category.name}
                  </h3>
                  <p className="relative mt-1 text-xs leading-5 text-gray-500 sm:text-sm">
                    {category.description}
                  </p>

                  {/* CTA */}
                  <span className="relative mt-auto flex items-center gap-1 pt-5 text-sm font-semibold text-[color:var(--c)]">
                    Explore
                    <ArrowRight
                      size={16}
                      className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                    />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}