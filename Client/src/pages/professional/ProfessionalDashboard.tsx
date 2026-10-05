
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LogOut,
  User,
  Briefcase,
  Clock,
  Banknote,
  CalendarDays,
  MapPin,
  Check,
  X,
  CheckCircle,
} from "lucide-react";

import { getProviderProfile } from "../../api/provider.api";
import {
  getProviderBookings,
  updateBookingStatus,
} from "../../api/booking.api";

type ProviderProfile = {
  email: string;
  dob: string;
  service: string;
  experience: number;
  price: number;
  availability: "Available" | "Busy" | "Unavailable";
  profileImage?: {
    filename?: string;
  };
};

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
  customerId?: {
    fullname: string;
    phone: string;
  };
};

export const ProfessionalDashboardPage = () => {
  const navigate = useNavigate();

  const [profile, setProfile] =
    useState<ProviderProfile | null>(null);

  const [loading, setLoading] = useState(true);

  const [bookings, setBookings] =
    useState<Booking[]>([]);

  const [bookingLoading, setBookingLoading] =
    useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await getProviderProfile();

        setProfile(response?.data);
      } catch (error) {
        console.error(
          "Failed to load provider profile:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    const loadBookings = async () => {
      try {
        const response = await getProviderBookings();

        setBookings(response?.data || []);
      } catch (error) {
        console.error(
          "Failed to load booking requests:",
          error
        );
      } finally {
        setBookingLoading(false);
      }
    };

    loadProfile();
    loadBookings();
  }, []);

  const handleBookingStatus = async (
    bookingId: string,
    status:
      | "Accepted"
      | "Rejected"
      | "Completed"
  ) => {
    try {
      await updateBookingStatus(
        bookingId,
        status
      );

      setBookings((previousBookings) =>
        previousBookings.map((booking) =>
          booking._id === bookingId
            ? {
                ...booking,
                status,
              }
            : booking
        )
      );
    } catch (error: any) {
      console.error(
        "Failed to update booking status:",
        error
      );

      alert(
        error?.response?.data?.message ||
          "Failed to update booking status. Please try again."
      );
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");

    navigate("/login");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F7F4EE] flex items-center justify-center">
        <p className="text-[#16233B] font-medium">
          Loading dashboard...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F4EE]">
      {/* Header */}
      <header className="bg-[#16233B] text-white">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">
              NearPro
            </h1>

            <p className="text-sm text-gray-300">
              Professional Dashboard
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
          >
            <LogOut size={17} />
            Logout
          </button>
        </div>
      </header>

      {/* Main */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Welcome */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-[#16233B]">
            Welcome to your dashboard
          </h2>

          <p className="mt-2 text-gray-500">
            Manage your professional profile and service
            information.
          </p>
        </div>

        {profile && (
          <>
            {/* Profile Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                {/* Profile information */}
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-full bg-[#E3A73A]/20 flex items-center justify-center overflow-hidden">
                    {profile.profileImage?.filename ? (
                      <img
                        src={`http://localhost:9005/assets/uploads/images/provider/${profile.profileImage.filename}`}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User
                        size={36}
                        className="text-[#16233B]"
                      />
                    )}
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-[#16233B]">
                      Professional Profile
                    </h3>

                    <p className="text-gray-500">
                      {profile.email}
                    </p>

                    <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      {profile.availability}
                    </span>
                  </div>
                </div>

                {/* Edit */}
                <button
                  onClick={() =>
                    navigate("/professional/profile")
                  }
                  className="px-5 py-2.5 rounded-xl bg-[#16233B] text-white text-sm font-semibold hover:bg-[#F26B5E] transition"
                >
                  Edit Profile
                </button>
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Service */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                  <Briefcase
                    size={22}
                    className="text-[#16233B]"
                  />
                </div>

                <p className="text-sm text-gray-500">
                  Service
                </p>

                <h3 className="mt-1 text-xl font-bold text-[#16233B] capitalize">
                  {profile.service}
                </h3>
              </div>

              {/* Experience */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="w-11 h-11 rounded-xl bg-yellow-50 flex items-center justify-center mb-4">
                  <Clock
                    size={22}
                    className="text-[#16233B]"
                  />
                </div>

                <p className="text-sm text-gray-500">
                  Experience
                </p>

                <h3 className="mt-1 text-xl font-bold text-[#16233B]">
                  {profile.experience} Years
                </h3>
              </div>

              {/* Price */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center mb-4">
                  <Banknote
                    size={22}
                    className="text-[#16233B]"
                  />
                </div>

                <p className="text-sm text-gray-500">
                  Starting Price
                </p>

                <h3 className="mt-1 text-xl font-bold text-[#16233B]">
                  NPR {profile.price}
                </h3>
              </div>
            </div>

            {/* Booking Requests */}
            <div className="mt-8">
              <div className="mb-5">
                <h2 className="text-2xl font-bold text-[#16233B]">
                  Booking Requests
                </h2>

                <p className="mt-1 text-gray-500">
                  View and manage service requests from
                  customers.
                </p>
              </div>

              {bookingLoading ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <p className="text-gray-500">
                    Loading booking requests...
                  </p>
                </div>
              ) : bookings.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                  <CalendarDays
                    size={40}
                    className="mx-auto text-gray-400"
                  />

                  <h3 className="mt-4 font-semibold text-[#16233B]">
                    No booking requests
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    Customer booking requests will appear
                    here.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {bookings.map((booking) => (
                    <div
                      key={booking._id}
                      className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                        {/* Customer */}
                        <div>
                          <h3 className="text-lg font-bold text-[#16233B]">
                            {booking.customerId?.fullname ||
                              "Customer"}
                          </h3>

                          <p className="text-sm text-gray-500 mt-1">
                            {booking.customerId?.phone ||
                              "Phone not available"}
                          </p>

                          <span
                            className={`inline-block mt-3 px-3 py-1 rounded-full text-xs font-medium ${
                              booking.status ===
                              "Pending"
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

                        {/* Booking Details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 lg:max-w-2xl">
                          {/* Service */}
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Briefcase size={17} />

                            <span className="capitalize">
                              {booking.service}
                            </span>
                          </div>

                          {/* Date */}
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <CalendarDays size={17} />

                            <span>
                              {new Date(
                                booking.bookingDate
                              ).toLocaleDateString()}
                            </span>
                          </div>

                          {/* Time */}
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock size={17} />

                            <span>
                              {booking.bookingTime}
                            </span>
                          </div>

                          {/* Price */}
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Banknote size={17} />

                            <span>
                              NPR {booking.price}
                            </span>
                          </div>

                          {/* Address */}
                          <div className="flex items-start gap-2 text-sm text-gray-600 sm:col-span-2">
                            <MapPin
                              size={17}
                              className="mt-0.5 shrink-0"
                            />

                            <span>
                              {booking.address}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Requirement */}
                      <div className="mt-5 border-t border-gray-100 pt-5">
                        <p className="text-sm font-semibold text-[#16233B]">
                          Customer Requirement
                        </p>

                        <p className="mt-2 text-sm text-gray-600">
                          {booking.description}
                        </p>
                      </div>

                      {/* Actions */}

                      {/* Pending Booking */}
                      {booking.status ===
                        "Pending" && (
                        <div className="mt-5 flex gap-3">
                          <button
                            onClick={() =>
                              handleBookingStatus(
                                booking._id,
                                "Accepted"
                              )
                            }
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition"
                          >
                            <Check size={17} />
                            Accept
                          </button>

                          <button
                            onClick={() =>
                              handleBookingStatus(
                                booking._id,
                                "Rejected"
                              )
                            }
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition"
                          >
                            <X size={17} />
                            Reject
                          </button>
                        </div>
                      )}

                      {/* Accepted Booking */}
                      {booking.status ===
                        "Accepted" && (
                        <div className="mt-5">
                          <button
                            onClick={() =>
                              handleBookingStatus(
                                booking._id,
                                "Completed"
                              )
                            }
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#16233B] text-white text-sm font-semibold hover:bg-[#243654] transition"
                          >
                            <CheckCircle
                              size={17}
                            />
                            Mark as Completed
                          </button>
                        </div>
                      )}

                      {/* Completed Booking */}
                      {booking.status ===
                        "Completed" && (
                        <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-green-600">
                          <CheckCircle
                            size={18}
                          />
                          Service Completed
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Future Features */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="font-bold text-[#16233B]">
                  Service Bookings
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                  View and manage customer service
                  requests.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="font-bold text-[#16233B]">
                  Ratings & Reviews
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                  View customer ratings and reviews.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="font-bold text-[#16233B]">
                  Availability
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                  Manage your availability for new
                  bookings.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
};
