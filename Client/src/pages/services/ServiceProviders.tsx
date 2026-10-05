
import { useEffect, useState } from "react";

import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  ArrowLeft,
  MapPin,
  Phone,
  Star,
  Briefcase,
  Mail,
} from "lucide-react";

import {
  getProvidersByService,
  type ServiceType,
} from "../../api/services.api";

type Provider = {
  _id: string;
  email: string;
  dob: string;
  service: ServiceType;
  experience: number;
  price: number;
  availability:
    | "Available"
    | "Busy"
    | "Unavailable";

  profileImage?: {
    filename?: string;
  };

  userId?: {
    fullname?: string;
    phone?: string;
  };
};

export default function ServiceProviders() {
  const { service } = useParams();

  const navigate = useNavigate();

  const [providers, setProviders] =
    useState<Provider[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  // ==========================================
  // SERVICE NAME
  // ==========================================

  const serviceNames: Record<string, string> = {
    plumber: "Plumbing",
    electrician: "Electrical",
    cleaner: "Cleaning",
    painter: "Painting",
  };

  const serviceName =
    serviceNames[service || ""] || "Service";

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

        const response =
          await getProvidersByService(
            service as ServiceType
          );

        setProviders(response?.data || []);
      } catch (error) {
        console.error(
          "Failed to load service providers:",
          error
        );

        setError(
          "Unable to load service providers."
        );
      } finally {
        setLoading(false);
      }
    };

    loadProviders();
  }, [service]);

  // ==========================================
  // PAGE
  // ==========================================

  return (
    <main className="min-h-screen bg-[#F7F4EE] px-4 py-10">
      <div className="max-w-7xl mx-auto">

        {/* ======================================
            BACK BUTTON
        ====================================== */}

        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-[#16233B] hover:text-[#F26B5E] mb-8 transition"
        >
          <ArrowLeft size={17} />
          Back to Home
        </Link>

        {/* ======================================
            PAGE HEADING
        ====================================== */}

        <div className="mb-8">
          <p className="text-[#F26B5E] font-semibold text-sm uppercase tracking-wider">
            Local Professionals
          </p>

          <h1 className="text-3xl md:text-4xl font-bold text-[#16233B] mt-2">
            {serviceName} Professionals
          </h1>

          <p className="text-gray-500 mt-2">
            Find trusted professionals for your{" "}
            {serviceName.toLowerCase()} needs.
          </p>
        </div>

        {/* ======================================
            LOADING
        ====================================== */}

        {loading && (
          <div className="text-center py-20">
            <p className="text-gray-500">
              Loading professionals...
            </p>
          </div>
        )}

        {/* ======================================
            ERROR
        ====================================== */}

        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <p className="text-red-600">
              {error}
            </p>
          </div>
        )}

        {/* ======================================
            NO PROVIDERS
        ====================================== */}

        {!loading &&
          !error &&
          providers.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">

              <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center">
                <Briefcase
                  size={28}
                  className="text-gray-400"
                />
              </div>

              <h2 className="text-xl font-semibold text-[#16233B] mt-5">
                No professionals found
              </h2>

              <p className="text-gray-500 mt-2">
                There are currently no registered
                professionals for{" "}
                {serviceName.toLowerCase()}.
              </p>

            </div>
          )}

        {/* ======================================
            PROVIDER CARDS
        ====================================== */}

        {!loading &&
          !error &&
          providers.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

              {providers.map((provider) => (

                <div
                  key={provider._id}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-lg transition"
                >

                  {/* ==================================
                      PROFILE IMAGE
                  ================================== */}

                  <div className="h-52 bg-gray-100">

                    {provider.profileImage?.filename ? (
                      <img
                        src={`http://localhost:9005/assets/uploads/images/provider/${provider.profileImage.filename}`}
                        alt={
                          provider.userId?.fullname ||
                          "Professional"
                        }
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        No Image
                      </div>
                    )}

                  </div>

                  {/* ==================================
                      PROVIDER INFORMATION
                  ================================== */}

                  <div className="p-5">

                    {/* Name + Availability */}

                    <div className="flex items-start justify-between gap-3">

                      <div>

                        <h2 className="text-xl font-bold text-[#16233B]">
                          {provider.userId?.fullname ||
                            "Professional"}
                        </h2>

                        <p className="text-sm text-[#F26B5E] font-medium capitalize mt-1">
                          {serviceName} Professional
                        </p>

                      </div>

                      {/* Availability */}

                      <span
                        className={`text-xs px-3 py-1 rounded-full font-medium whitespace-nowrap ${
                          provider.availability ===
                          "Available"
                            ? "bg-green-100 text-green-700"
                            : provider.availability ===
                              "Busy"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {provider.availability}
                      </span>

                    </div>

                    {/* ==================================
                        EMAIL
                    ================================== */}

                    <div className="mt-5">

                      <p className="text-xs text-gray-400 uppercase tracking-wide">
                        Email
                      </p>

                      <div className="flex items-center gap-2 mt-1">

                        <Mail
                          size={15}
                          className="text-gray-400 shrink-0"
                        />

                        <p className="text-sm text-gray-700 break-all">
                          {provider.email}
                        </p>

                      </div>

                    </div>

                    {/* ==================================
                        PHONE
                    ================================== */}

                    {provider.userId?.phone && (
                      <div className="mt-3">

                        <p className="text-xs text-gray-400 uppercase tracking-wide">
                          Phone
                        </p>

                        <div className="flex items-center gap-2 mt-1">

                          <Phone
                            size={15}
                            className="text-gray-400 shrink-0"
                          />

                          <p className="text-sm text-gray-700">
                            {provider.userId.phone}
                          </p>

                        </div>

                      </div>
                    )}

                    {/* ==================================
                        EXPERIENCE
                    ================================== */}

                    <div className="flex items-center gap-2 mt-4 text-sm text-gray-600">

                      <Star
                        size={16}
                        className="text-[#E3A73A]"
                      />

                      <span>
                        {provider.experience} years
                        experience
                      </span>

                    </div>

                    {/* ==================================
                        LOCATION
                    ================================== */}

                    <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">

                      <MapPin size={16} />

                      <span>
                        Kathmandu, Nepal
                      </span>

                    </div>

                    {/* ==================================
                        PRICE
                    ================================== */}

                    <div className="mt-4">

                      <p className="text-xs text-gray-500">
                        Starting price
                      </p>

                      <p className="text-xl font-bold text-[#16233B]">
                        NPR {provider.price}
                      </p>

                    </div>

                    {/* ==================================
                        BOOK NOW BUTTON
                    ================================== */}

                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/booking/${provider._id}`
                        )
                      }
                      className="mt-5 w-full flex items-center justify-center gap-2 rounded-xl bg-[#16233B] text-white py-2.5 text-sm font-semibold hover:bg-[#F26B5E] transition"
                    >
                      Book Now
                    </button>

                    {/* ==================================
                        CONTACT BUTTON
                    ================================== */}

                    {provider.userId?.phone && (
                      <a
                        href={`tel:${provider.userId.phone}`}
                        className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl border border-[#16233B] text-[#16233B] py-2.5 text-sm font-semibold hover:bg-[#16233B] hover:text-white transition"
                      >
                        <Phone size={16} />
                        Contact Professional
                      </a>
                    )}

                  </div>
                </div>
              ))}

            </div>
          )}

      </div>
    </main>
  );
}

