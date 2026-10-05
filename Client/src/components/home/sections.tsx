
import {
  Star,
  ArrowRight,
  CheckCircle,
  Search,
  UserRound,
  CalendarCheck,
  Smartphone,
} from "lucide-react";
import { Link } from "react-router-dom";

const TOP_PROS = [
  {
    name: "Hari Prasad",
    service: "Professional Plumber",
    location: "Kathmandu",
    rating: 4.9,
    reviews: 28,
  },
  {
    name: "Ramesh Karki",
    service: "Electrician",
    location: "New Baneshwor",
    rating: 4.8,
    reviews: 35,
  },
  {
    name: "Sita Cleaning Services",
    service: "Cleaning Service",
    location: "Baneshwor",
    rating: 4.9,
    reviews: 41,
  },
];

const TRENDING = [
  "Home Plumbing",
  "Electrical Repair",
  "House Cleaning",
  "Wall Painting",
  "Bathroom Cleaning",
  "Wiring & Installation",
];

const TESTIMONIALS = [
  {
    name: "Aarav Sharma",
    text: "NearPro helped me find a reliable plumber quickly. The service was excellent.",
    rating: 5,
  },
  {
    name: "Sita Thapa",
    text: "I found a professional cleaner near my home without any hassle.",
    rating: 5,
  },
  {
    name: "Bikash Gurung",
    text: "The platform makes it easy to compare local service providers.",
    rating: 4,
  },
];

export default function Sections() {
  return (
    <>
      {/* Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <Stat number="500+" label="Professionals" />
        <Stat number="1,000+" label="Services Completed" />
        <Stat number="4.8/5" label="Average Rating" />
        <Stat number="20+" label="Service Areas" />
      </section>

      {/* Top Professionals */}
      <section id="professionals">
        <SectionTitle
          small="TOP PROFESSIONALS"
          title="Meet our trusted professionals"
        />

        <div className="grid md:grid-cols-3 gap-5">
          {TOP_PROS.map((pro) => (
            <div
              key={pro.name}
              className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
            >
              <div className="w-16 h-16 rounded-full bg-[#16233B] text-white flex items-center justify-center text-xl font-bold">
                {pro.name.charAt(0)}
              </div>

              <h3 className="font-bold text-lg text-[#16233B] mt-4">
                {pro.name}
              </h3>

              <p className="text-sm text-gray-500">{pro.service}</p>
              <p className="text-sm text-gray-400 mt-1">
                {pro.location}
              </p>

              <div className="flex items-center gap-1 mt-3 text-sm">
                <Star size={16} className="fill-[#E3A73A] text-[#E3A73A]" />
                <span className="font-semibold">{pro.rating}</span>
                <span className="text-gray-400">
                  ({pro.reviews} reviews)
                </span>
              </div>

              <Link
                to="/professionals"
                className="flex items-center gap-1 mt-4 text-sm font-semibold text-[#F26B5E]"
              >
                View Profile <ArrowRight size={15} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Become a Pro */}
      <section className="rounded-3xl bg-[#16233B] text-white p-8 md:p-12 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <p className="text-[#E3A73A] font-semibold text-sm">
            FOR PROFESSIONALS
          </p>

          <h2 className="text-3xl font-bold mt-2">
            Grow your business with NearPro
          </h2>

          <p className="text-gray-300 mt-3 max-w-xl">
            Create your professional profile and connect with customers
            looking for your services.
          </p>
        </div>

        <Link
          to="/register"
          className="shrink-0 bg-[#F26B5E] hover:bg-[#e85d50] px-6 py-3 rounded-xl font-semibold flex items-center gap-2"
        >
          Become a Pro
          <ArrowRight size={18} />
        </Link>
      </section>

      {/* Trending Services */}
      <section>
        <SectionTitle
          small="POPULAR SERVICES"
          title="Trending services"
        />

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {TRENDING.map((service) => (
            <Link
              key={service}
              to="/services"
              className="bg-white rounded-xl border border-gray-100 p-5 flex items-center justify-between hover:shadow-md transition"
            >
              <span className="font-medium text-[#16233B]">
                {service}
              </span>

              <ArrowRight
                size={17}
                className="text-[#F26B5E]"
              />
            </Link>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works">
        <SectionTitle
          small="HOW IT WORKS"
          title="Get your service in 3 simple steps"
        />

        <div className="grid md:grid-cols-3 gap-6">
          <Step
            number="01"
            icon={<Search />}
            title="Search"
            text="Find the service you need from local professionals."
          />

          <Step
            number="02"
            icon={<UserRound />}
            title="Choose"
            text="Compare profiles, ratings, reviews and experience."
          />

          <Step
            number="03"
            icon={<CalendarCheck />}
            title="Book"
            text="Contact your chosen professional and book the service."
          />
        </div>
      </section>

      {/* Testimonials */}
      <section>
        <SectionTitle
          small="CUSTOMER REVIEWS"
          title="What our customers say"
        />

        <div className="grid md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((item) => (
            <div
              key={item.name}
              className="bg-white rounded-2xl p-6 border border-gray-100"
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: item.rating }).map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    className="fill-[#E3A73A] text-[#E3A73A]"
                  />
                ))}
              </div>

              <p className="text-gray-600 text-sm leading-6">
                "{item.text}"
              </p>

              <p className="font-semibold text-[#16233B] mt-4">
                {item.name}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* App Download */}
      <section className="rounded-3xl bg-[#F1EDE4] p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-[#F26B5E]">
            <Smartphone size={22} />
            <span className="font-semibold">NEARPRO APP</span>
          </div>

          <h2 className="text-3xl font-bold text-[#16233B] mt-3">
            Services at your fingertips
          </h2>

          <p className="text-gray-600 mt-2">
            Find and connect with local professionals anytime.
          </p>
        </div>

        <button className="px-6 py-3 bg-[#16233B] text-white rounded-xl font-semibold">
          Coming Soon
        </button>
      </section>
    </>
  );
}

function SectionTitle({
  small,
  title,
}: {
  small: string;
  title: string;
}) {
  return (
    <div className="mb-7">
      <p className="text-[#F26B5E] text-sm font-semibold tracking-wider">
        {small}
      </p>

      <h2 className="text-3xl font-bold text-[#16233B] mt-1">
        {title}
      </h2>
    </div>
  );
}

function Stat({
  number,
  label,
}: {
  number: string;
  label: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 text-center border border-gray-100">
      <h3 className="text-3xl font-bold text-[#16233B]">
        {number}
      </h3>

      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function Step({
  number,
  icon,
  title,
  text,
}: {
  number: string;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100">
      <div className="flex items-center justify-between">
        <div className="w-12 h-12 rounded-xl bg-[#16233B] text-white flex items-center justify-center">
          {icon}
        </div>

        <span className="text-3xl font-bold text-gray-200">
          {number}
        </span>
      </div>

      <h3 className="text-lg font-bold text-[#16233B] mt-5">
        {title}
      </h3>

      <p className="text-sm text-gray-500 mt-2 leading-6">
        {text}
      </p>
    </div>
  );
}
