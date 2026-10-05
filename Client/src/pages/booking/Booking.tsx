
import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  MapPin,
  Send,
  User,
} from "lucide-react";

import { getProviderProfileById } from "../../api/provider.api";
import {
  createBooking,
  type BookingInput,
} from "../../api/booking.api";

type Provider = {
  _id: string;
  email: string;
  service:
    | "plumber"
    | "electrician"
    | "cleaner"
    | "painter";
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

export default function Booking() {
  const { providerId } = useParams();
  const navigate = useNavigate();

  const [provider, setProvider] =
    useState<Provider | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] =
    useState<BookingInput>({
      providerId: providerId || "",
      service: "plumber",
      bookingDate: "",
      bookingTime: "",
      address: "",
      description: "",
    });

  // ==========================================
  // LOAD PROFESSIONAL
  // ==========================================
  useEffect(() => {
    const loadProvider = async () => {
      if (!providerId) {
        setError("Professional not found.");
        setLoading(false);
        return;
      }

      try {
        const response =
          await getProviderProfileById(providerId);

        const providerData = response?.data;

        setProvider(providerData);

        setForm((previous) => ({
          ...previous,
          providerId: providerData._id,
          service: providerData.service,
        }));
      } catch (error) {
        console.error(
          "Failed to load professional:",
          error
        );

        setError(
          "Unable to load professional details."
        );
      } finally {
        setLoading(false);
      }
    };

    loadProvider();
  }, [providerId]);

  // ==========================================
  // HANDLE INPUT
  // ==========================================
  const handleChange = (
    event:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ==========================================
  // SUBMIT BOOKING
  // ==========================================
  const handleSubmit = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const token =
      localStorage.getItem("access_token");

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setSubmitting(true);

      await createBooking(form);

      setSuccess(
        "Booking request sent successfully!"
      );

      // Clear form
      setForm((previous) => ({
        ...previous,
        bookingDate: "",
        bookingTime: "",
        address: "",
        description: "",
      }));
    } catch (error: any) {
      console.error(
        "Booking failed:",
        error
      );

      setError(
        error?.response?.data?.message ||
          "Unable to send booking request."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================
  // LOADING
  // ==========================================
  if (loading) {
    return (
      <main className="min-h-screen bg-[#F7F4EE] flex items-center justify-center">
        <p className="text-gray-500">
          Loading professional...
        </p>
      </main>
    );
  }

  // ==========================================
  // ERROR
  // ==========================================
  if (error && !provider) {
    return (
      <main className="min-h-screen bg-[#F7F4EE] px-4 py-10">
        <div className="max-w-3xl mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-[#16233B]"
          >
            <ArrowLeft size={17} />
            Back to Home
          </Link>

          <div className="mt-8 bg-red-50 border border-red-200 rounded-2xl p-6">
            <p className="text-red-600">
              {error}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F4EE] px-4 py-10">
      <div className="max-w-4xl mx-auto">

        {/* Back */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-[#16233B] hover:text-[#F26B5E] mb-8"
        >
          <ArrowLeft size={17} />
          Back to Home
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ======================================
              PROFESSIONAL INFORMATION
          ====================================== */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

            {/* Image */}
            <div className="h-56 bg-gray-100">
              {provider?.profileImage?.filename ? (
                <img
                  src={`http://localhost:9005/assets/uploads/images/provider/${provider.profileImage.filename}`}
                  alt={
                    provider.userId?.fullname ||
                    "Professional"
                  }
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User
                    size={50}
                    className="text-gray-300"
                  />
                </div>
              )}
            </div>

            <div className="p-6">

              <h1 className="text-2xl font-bold text-[#16233B]">
                {provider?.userId?.fullname ||
                  "Professional"}
              </h1>

              <p className="text-[#F26B5E] font-medium capitalize mt-1">
                {provider?.service}
              </p>

              <div className="mt-5 space-y-3">

                <div className="flex justify-between">
                  <span className="text-gray-500">
                    Experience
                  </span>

                  <span className="font-semibold text-[#16233B]">
                    {provider?.experience} years
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">
                    Starting Price
                  </span>

                  <span className="font-semibold text-[#16233B]">
                    NPR {provider?.price}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">
                    Availability
                  </span>

                  <span
                    className={`font-medium ${
                      provider?.availability ===
                      "Available"
                        ? "text-green-600"
                        : provider?.availability ===
                          "Busy"
                        ? "text-yellow-600"
                        : "text-red-600"
                    }`}
                  >
                    {provider?.availability}
                  </span>
                </div>

              </div>
            </div>
          </div>

          {/* ======================================
              BOOKING FORM
          ====================================== */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">

            <h2 className="text-2xl font-bold text-[#16233B]">
              Book Professional
            </h2>

            <p className="text-gray-500 mt-1">
              Send a booking request to{" "}
              <span className="font-medium text-[#16233B]">
                {provider?.userId?.fullname}
              </span>
            </p>

            {/* Success */}
            {success && (
              <div className="mt-5 bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-green-700 text-sm">
                  {success}
                </p>
              </div>
            )}

            {/* Error */}
            {error && provider && (
              <div className="mt-5 bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-red-600 text-sm">
                  {error}
                </p>
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="mt-6 space-y-5"
            >

              {/* Service */}
              <div>
                <label className="block text-sm font-medium text-[#16233B] mb-2">
                  Service
                </label>

                <input
                  type="text"
                  value={
                    provider?.service || ""
                  }
                  disabled
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-600 capitalize"
                />
              </div>

              {/* Date */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-[#16233B] mb-2">
                  <CalendarDays size={16} />
                  Booking Date
                </label>

                <input
                  type="date"
                  name="bookingDate"
                  value={form.bookingDate}
                  onChange={handleChange}
                  min={
                    new Date()
                      .toISOString()
                      .split("T")[0]
                  }
                  required
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#F26B5E]/30 focus:border-[#F26B5E]"
                />
              </div>

              {/* Time */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-[#16233B] mb-2">
                  <Clock size={16} />
                  Booking Time
                </label>

                <input
                  type="time"
                  name="bookingTime"
                  value={form.bookingTime}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#F26B5E]/30 focus:border-[#F26B5E]"
                />
              </div>

              {/* Address */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-[#16233B] mb-2">
                  <MapPin size={16} />
                  Service Address
                </label>

                <input
                  type="text"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="e.g. New Baneshwor, Kathmandu"
                  required
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#F26B5E]/30 focus:border-[#F26B5E]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-[#16233B] mb-2">
                  Describe Your Requirement
                </label>

                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Describe the work you need..."
                  rows={4}
                  required
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none resize-none focus:ring-2 focus:ring-[#F26B5E]/30 focus:border-[#F26B5E]"
                />
              </div>

              {/* Price */}
              <div className="bg-[#F7F4EE] rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">
                    Estimated Starting Price
                  </span>

                  <span className="text-xl font-bold text-[#16233B]">
                    NPR {provider?.price}
                  </span>
                </div>

                <p className="text-xs text-gray-400 mt-1">
                  Final price may be confirmed by the professional.
                </p>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#16233B] text-white py-3 font-semibold hover:bg-[#F26B5E] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={17} />

                {submitting
                  ? "Sending Request..."
                  : "Send Booking Request"}
              </button>

            </form>
          </div>

        </div>
      </div>
    </main>
  );
}

