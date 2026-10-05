import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  LogOut,
  User,
  CalendarDays,
  Clock,
  MapPin,
  Banknote,
  Briefcase,
  Star,
  CheckCircle,
} from "lucide-react";

import { getCustomerBookings } from "../../api/booking.api";
import ReviewModal from "../../components/ReviewModal";

// ==========================================
// BOOKING TYPE
// ==========================================

type Booking = {
  _id: string;

  service: string;

  bookingDate: string;

  bookingTime: string;

  address: string;

  description: string;

  price: number;

  status:
    | "Pending"
    | "Accepted"
    | "Rejected"
    | "Completed"
    | "Cancelled";

  // Used only on frontend to know
  // whether customer already reviewed
  hasReview?: boolean;

  providerId?: {
    _id?: string;

    email: string;

    service: string;

    experience: number;

    price: number;

    availability: string;

    profileImage?: {
      filename?: string;
    };
  };
};

// ==========================================
// CUSTOMER DASHBOARD
// ==========================================

export const CustomerDashboardPage = () => {
  const navigate = useNavigate();

  // ==========================================
  // STATES
  // ==========================================

  const [bookings, setBookings] =
    useState<Booking[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [selectedBooking, setSelectedBooking] =
    useState<Booking | null>(null);

  // ==========================================
  // LOAD CUSTOMER BOOKINGS
  // ==========================================

  useEffect(() => {
    const loadBookings = async () => {
      try {
        const response =
          await getCustomerBookings();

        setBookings(response?.data || []);
      } catch (error) {
        console.error(
          "Failed to load customer bookings:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadBookings();
  }, []);

  // ==========================================
  // LOGOUT
  // ==========================================

  const handleLogout = () => {
    localStorage.removeItem("access_token");

    navigate("/login");
  };

  // ==========================================
  // REVIEW SUCCESS
  // ==========================================

  const handleReviewSuccess = () => {
    if (!selectedBooking) {
      return;
    }

    setBookings((currentBookings) =>
      currentBookings.map((booking) =>
        booking._id === selectedBooking._id
          ? {
              ...booking,
              hasReview: true,
            }
          : booking
      )
    );

    setSelectedBooking(null);
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <main className="min-h-screen bg-[#F7F4EE]">

      {/* ==========================================
          HEADER
      ========================================== */}

      <header className="bg-[#16233B] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <div>
            <h1 className="text-xl font-bold">
              NearPro
            </h1>

            <p className="text-sm text-gray-300">
              Customer Dashboard
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 transition hover:bg-white/20"
          >
            <LogOut size={17} />

            Logout
          </button>
        </div>
      </header>

      {/* ==========================================
          MAIN CONTENT
      ========================================== */}

      <div className="mx-auto max-w-7xl px-6 py-10">

        {/* ==========================================
            WELCOME
        ========================================== */}

        <div className="mb-8">
          <h2 className="text-3xl font-bold text-[#16233B]">
            Welcome to your dashboard
          </h2>

          <p className="mt-2 text-gray-500">
            Manage your profile and view your service
            bookings.
          </p>
        </div>

        {/* ==========================================
            PROFILE
        ========================================== */}

        <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

          <div className="flex items-center gap-4">

            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E3A73A]/20">
              <User
                size={28}
                className="text-[#16233B]"
              />
            </div>

            <div>
              <h3 className="text-xl font-bold text-[#16233B]">
                Customer Profile
              </h3>

              <p className="text-sm text-gray-500">
                Manage your account and service bookings.
              </p>
            </div>

          </div>
        </div>

        {/* ==========================================
            MY BOOKINGS
        ========================================== */}

        <div>

          <div className="mb-5">
            <h2 className="text-2xl font-bold text-[#16233B]">
              My Bookings
            </h2>

            <p className="mt-1 text-gray-500">
              Track the status of your service requests.
            </p>
          </div>

          {/* ==========================================
              LOADING
          ========================================== */}

          {loading ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <p className="text-gray-500">
                Loading your bookings...
              </p>
            </div>

          ) : bookings.length === 0 ? (

            /* ========================================
               NO BOOKINGS
            ======================================== */

            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">

              <CalendarDays
                size={40}
                className="mx-auto text-gray-400"
              />

              <h3 className="mt-4 font-semibold text-[#16233B]">
                No bookings yet
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Your service bookings will appear here.
              </p>

            </div>

          ) : (

            /* ========================================
               BOOKING LIST
            ======================================== */

            <div className="space-y-5">

              {bookings.map((booking) => (

                <div
                  key={booking._id}
                  className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
                >

                  {/* ==================================
                      TOP
                  ================================== */}

                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">

                    <div>

                      <h3 className="text-lg font-bold capitalize text-[#16233B]">
                        {booking.service}
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        Professional:{" "}
                        {booking.providerId?.email ||
                          "Professional"}
                      </p>

                    </div>

                    {/* STATUS */}

                    <span
                      className={`inline-block w-fit rounded-full px-3 py-1 text-xs font-medium ${
                        booking.status === "Pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : booking.status ===
                            "Accepted"
                          ? "bg-green-100 text-green-700"
                          : booking.status ===
                            "Rejected"
                          ? "bg-red-100 text-red-700"
                          : booking.status ===
                            "Completed"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {booking.status}
                    </span>

                  </div>

                  {/* ==================================
                      BOOKING DETAILS
                  ================================== */}

                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

                    {/* SERVICE */}

                    <div className="flex items-center gap-2 text-sm text-gray-600">

                      <Briefcase size={17} />

                      <span className="capitalize">
                        {booking.service}
                      </span>

                    </div>

                    {/* DATE */}

                    <div className="flex items-center gap-2 text-sm text-gray-600">

                      <CalendarDays size={17} />

                      <span>
                        {new Date(
                          booking.bookingDate
                        ).toLocaleDateString()}
                      </span>

                    </div>

                    {/* TIME */}

                    <div className="flex items-center gap-2 text-sm text-gray-600">

                      <Clock size={17} />

                      <span>
                        {booking.bookingTime}
                      </span>

                    </div>

                    {/* PRICE */}

                    <div className="flex items-center gap-2 text-sm text-gray-600">

                      <Banknote size={17} />

                      <span>
                        NPR {booking.price}
                      </span>

                    </div>

                  </div>

                  {/* ==================================
                      ADDRESS
                  ================================== */}

                  <div className="mt-4 flex items-start gap-2 text-sm text-gray-600">

                    <MapPin
                      size={17}
                      className="mt-0.5 shrink-0"
                    />

                    <span>
                      {booking.address}
                    </span>

                  </div>

                  {/* ==================================
                      DESCRIPTION
                  ================================== */}

                  <div className="mt-5 border-t border-gray-100 pt-5">

                    <p className="text-sm font-semibold text-[#16233B]">
                      Your Requirement
                    </p>

                    <p className="mt-2 text-sm text-gray-600">
                      {booking.description}
                    </p>

                  </div>

                  {/* ==================================
                      REVIEW SECTION
                  ================================== */}

                  {booking.status === "Completed" && (

                    <div className="mt-5 border-t border-gray-100 pt-5">

                      {booking.hasReview ? (

                        /* REVIEWED */

                        <div className="flex items-center gap-2 text-sm font-semibold text-green-600">

                          <CheckCircle
                            size={18}
                          />

                          Review submitted

                        </div>

                      ) : (

                        /* RATE PROVIDER */

                        <button
                          onClick={() =>
                            setSelectedBooking(
                              booking
                            )
                          }
                          className="flex items-center justify-center gap-2 rounded-xl bg-[#E3A73A] px-5 py-3 text-sm font-semibold text-[#16233B] transition hover:opacity-90"
                        >

                          <Star
                            size={17}
                            fill="currentColor"
                          />

                          Rate Provider

                        </button>

                      )}

                    </div>

                  )}

                </div>
              ))}

            </div>
          )}

        </div>
      </div>

      {/* ==========================================
          REVIEW MODAL
      ========================================== */}

      {selectedBooking && (

        <ReviewModal
          bookingId={selectedBooking._id}

          providerName={
            selectedBooking.providerId?.email ||
            "Service Provider"
          }

          onClose={() =>
            setSelectedBooking(null)
          }

          onSuccess={handleReviewSuccess}
        />

      )}

    </main>
  );
};