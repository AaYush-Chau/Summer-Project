
import { Link } from "react-router-dom";

import {
  Wrench,
  Zap,
  Sparkles,
  Paintbrush,
} from "lucide-react";

const CATEGORIES = [
  {
    name: "Plumbing",
    service: "plumber",
    icon: Wrench,
    color: "#3B82F6",
  },
  {
    name: "Electrical",
    service: "electrician",
    icon: Zap,
    color: "#E3A73A",
  },
  {
    name: "Cleaning",
    service: "cleaner",
    icon: Sparkles,
    color: "#10B981",
  },
  {
    name: "Painting",
    service: "painter",
    icon: Paintbrush,
    color: "#F26B5E",
  },
];

export default function Categories() {
  return (
    <section id="categories">
      <div className="text-center mb-8">
        <p className="text-[#F26B5E] font-semibold text-sm uppercase tracking-wider">
          Explore Services
        </p>

        <h2 className="text-3xl font-bold text-[#16233B] mt-2">
          What do you need help with?
        </h2>

        <p className="text-gray-500 mt-2">
          Find trusted professionals for your everyday needs.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {CATEGORIES.map((category) => {
          const Icon = category.icon;

          return (
            <Link
              key={category.name}
              to={`/services/${category.service}`}
              className="group bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition"
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-5"
                style={{
                  backgroundColor: `${category.color}15`,
                  color: category.color,
                }}
              >
                <Icon size={28} />
              </div>

              <h3 className="text-lg font-semibold text-[#16233B] group-hover:text-[#F26B5E]">
                {category.name}
              </h3>

              <p className="text-sm text-gray-500 mt-1">
                Find professionals
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

