import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Users,
  Star,
} from "lucide-react";

const SLIDES = [
  {
    title: "Find Trusted Professionals",
    text: "Connect with reliable local service providers near you.",
    image: "/nearpro-hero.svg",
  },
  {
    title: "Quality Services, Near You",
    text: "From plumbing to painting, find the right professional easily.",
    image: "/nearpro-hero.svg",
  },
  {
    title: "Get Your Work Done",
    text: "Discover skilled professionals for your everyday needs.",
    image: "/nearpro-hero.svg",
  },
];

export default function Hero() {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlide((prev) => (prev + 1) % SLIDES.length);
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  const prev = () => {
    setSlide((s) => (s - 1 + SLIDES.length) % SLIDES.length);
  };

  const next = () => {
    setSlide((s) => (s + 1) % SLIDES.length);
  };

  return (
    <section>
      {/* Hero */}
      <div className="relative flex min-h-[420px] items-center overflow-hidden rounded-3xl bg-[#16233B] text-white">
        {/* Background images */}
        {SLIDES.map((s, i) => (
          <img
            key={i}
            src={s.image}
            alt=""
            aria-hidden="true"
            draggable={false}
            className={`pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-right transition-opacity duration-700 ${
              i === slide ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}

        {/* Mobile scrim */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#16233B] via-[#16233B]/70 to-transparent sm:from-[#16233B]/0 sm:via-transparent" />

        {/* Content */}
        <div className="relative z-10 w-full px-6 py-16 sm:px-12">
          <div className="max-w-xl sm:max-w-[45%]">
            <p className="mb-3 font-semibold tracking-widest text-[#E3A73A]">
              SEWAKHOJ
            </p>

            <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
              {SLIDES[slide].title}
            </h1>

            <p className="mt-5 text-lg text-gray-300">
              {SLIDES[slide].text}
            </p>
          </div>
        </div>

        {/* Previous button */}
        <button
          type="button"
          onClick={prev}
          aria-label="Previous slide"
          className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/10 p-2 transition hover:bg-white/20"
        >
          <ChevronLeft size={24} />
        </button>

        {/* Next button */}
        <button
          type="button"
          onClick={next}
          aria-label="Next slide"
          className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/10 p-2 transition hover:bg-white/20"
        >
          <ChevronRight size={24} />
        </button>

        {/* Dots */}
        <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-2">
          {SLIDES.map((_, index) => (
            <button
              type="button"
              key={index}
              onClick={() => setSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === slide ? "true" : undefined}
              className={`h-2.5 w-2.5 rounded-full transition ${
                index === slide ? "bg-[#E3A73A]" : "bg-white/40"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Trust Badges */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <TrustItem
          icon={<ShieldCheck size={22} />}
          title="Trusted Professionals"
          text="Verified service providers"
        />

        <TrustItem
          icon={<Users size={22} />}
          title="Local Services"
          text="Professionals near you"
        />

        <TrustItem
          icon={<Star size={22} />}
          title="Quality Service"
          text="Ratings & reviews"
        />
      </div>
    </section>
  );
}

function TrustItem({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4">
      <div className="text-[#F26B5E]">{icon}</div>

      <div>
        <h3 className="text-sm font-semibold text-[#16233B]">
          {title}
        </h3>

        <p className="text-xs text-gray-500">
          {text}
        </p>
      </div>
    </div>
  );
}