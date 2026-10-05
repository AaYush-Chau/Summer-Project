
import { useEffect, useState } from "react";
import { Search, ChevronLeft, ChevronRight, ShieldCheck, Users, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SLIDES = [
  {
    title: "Find Trusted Professionals",
    text: "Connect with reliable local service providers near you.",
  },
  {
    title: "Quality Services, Near You",
    text: "From plumbing to painting, find the right professional easily.",
  },
  {
    title: "Get Your Work Done",
    text: "Discover skilled professionals for your everyday needs.",
  },
];

export default function Hero() {
  const [slide, setSlide] = useState(0);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setSlide((prev) => (prev + 1) % SLIDES.length);
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  const handleSearch = () => {
    if (search.trim()) {
      navigate(`/search?q=${encodeURIComponent(search)}`);
    }
  };

  return (
    <section>
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-[#16233B] text-white min-h-[420px] flex items-center">
        
        <div className="w-full px-6 sm:px-12 py-16">
          <div className="max-w-2xl">
            <p className="text-[#E3A73A] font-semibold mb-3">
              NEARPRO
            </p>

            <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
              {SLIDES[slide].title}
            </h1>

            <p className="mt-5 text-gray-300 text-lg">
              {SLIDES[slide].text}
            </p>

            {/* Search */}
            <div className="mt-8 flex bg-white rounded-xl p-1.5 max-w-xl">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search for a service..."
                className="flex-1 px-4 text-gray-800 outline-none"
              />

              <button
                onClick={handleSearch}
                className="bg-[#F26B5E] hover:bg-[#e85d50] px-5 py-3 rounded-lg flex items-center gap-2"
              >
                <Search size={18} />
                <span className="hidden sm:inline">Search</span>
              </button>
            </div>
          </div>
        </div>

        {/* Arrows */}
        <button
          onClick={() =>
            setSlide((slide - 1 + SLIDES.length) % SLIDES.length)
          }
          className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20"
        >
          <ChevronLeft />
        </button>

        <button
          onClick={() =>
            setSlide((slide + 1) % SLIDES.length)
          }
          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20"
        >
          <ChevronRight />
        </button>

        {/* Dots */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
          {SLIDES.map((_, index) => (
            <button
              key={index}
              onClick={() => setSlide(index)}
              className={`w-2.5 h-2.5 rounded-full ${
                index === slide ? "bg-[#E3A73A]" : "bg-white/40"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Trust Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
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
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="bg-white rounded-xl p-4 flex items-center gap-3 border border-gray-100">
      <div className="text-[#F26B5E]">
        {icon}
      </div>

      <div>
        <h3 className="font-semibold text-[#16233B] text-sm">
          {title}
        </h3>

        <p className="text-xs text-gray-500">
          {text}
        </p>
      </div>
    </div>
  );
}

