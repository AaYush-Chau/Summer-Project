import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
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
  ArrowRight,
  RefreshCw,
  ClipboardList,
  AlertCircle,
  Loader2,
  Phone,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { getProviderProfile } from "../../api/provider.api";
import {
  getProviderBookings,
  updateBookingStatus,
} from "../../api/booking.api";
import { resolveAssetUrl } from "../../api/user.api";

/* ==========================================================
   TYPES
   ========================================================== */

type Availability = "Available" | "Busy" | "Unavailable";
type BookingStatus =
  | "Pending"
  | "Accepted"
  | "Rejected"
  | "Completed"
  | "Cancelled";

type ProviderProfile = {
  name?: string;
  username?: string;
  fullname?: string;
  email: string;
  dob: string;
  service: string;
  experience: number;
  price: number;
  availability: Availability;
  profileImage?: { filename?: string };
  userId?: {
    fullname?: string;
    phone?: string;
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
  status: BookingStatus;
  customerId?: {
    fullname: string;
    phone: string;
  };
};

/* ==========================================================
   STYLE MAPS
   ========================================================== */

const AVAILABILITY_STYLES: Record<
  Availability,
  { badge: string; dot: string }
> = {
  Available: {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  Busy: {
    badge: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
  },
  Unavailable: {
    badge: "border-red-200 bg-red-50 text-red-700",
    dot: "bg-red-500",
  },
};

const getStatusStyles = (
  status: BookingStatus
): { badge: string; dot: string; label: string } => {
  switch (status) {
    case "Pending":
      return {
        badge: "border-amber-200 bg-amber-50 text-amber-700",
        dot: "bg-amber-500",
        label: "Pending",
      };
    case "Accepted":
      return {
        badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
        dot: "bg-emerald-500",
        label: "Accepted",
      };
    case "Rejected":
      return {
        badge: "border-red-200 bg-red-50 text-red-700",
        dot: "bg-red-500",
        label: "Rejected",
      };
    case "Completed":
      return {
        badge: "border-blue-200 bg-blue-50 text-blue-700",
        dot: "bg-blue-500",
        label: "Completed",
      };
    case "Cancelled":
    default:
      return {
        badge: "border-gray-200 bg-gray-100 text-gray-700",
        dot: "bg-gray-500",
        label: "Cancelled",
      };
  }
};

const SERVICE_LABELS: Record<string, string> = {
  plumber: "Plumber",
  electrician: "Electrician",
  cleaner: "Cleaner",
  painter: "Painter",
};

/* ==========================================================
   HELPERS
   ========================================================== */

const capitalize = (value: string): string =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

const humanService = (service?: string): string => {
  if (!service) return "Service";
  return SERVICE_LABELS[service.toLowerCase()] ?? capitalize(service);
};

const formatBookingDate = (date: string): string => {
  if (!date) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  try {
    return parsed.toLocaleDateString("en-NP", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return parsed.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
};

const formatBookingTime = (time: string): string => {
  if (!time) return "—";
  // Already 12-hour formatted
  if (/[ap]m/i.test(time)) return time.trim().toUpperCase();
  const [hourStr, minuteStr] = time.split(":");
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return time;
  const period = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, "0")} ${period}`;
};

const formatNPR = (amount: number): string => {
  if (!Number.isFinite(amount)) return "NPR 0";
  try {
    return `NPR ${amount.toLocaleString("en-NP")}`;
  } catch {
    return `NPR ${amount.toLocaleString()}`;
  }
};

const initialsFrom = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "GS";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/* ==========================================================
   PRESENTATIONAL SUBCOMPONENTS
   ========================================================== */

const StatusBadge = ({ status }: { status: BookingStatus }) => {
  const style = getStatusStyles(status);
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${style.badge}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${style.dot}`}
        aria-hidden="true"
      />
      {style.label}
    </span>
  );
};

const AvailabilityBadge = ({
  availability,
}: {
  availability: Availability;
}) => {
  const style =
    AVAILABILITY_STYLES[availability] ?? AVAILABILITY_STYLES.Unavailable;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${style.badge}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${style.dot}`}
        aria-hidden="true"
      />
      {availability}
    </span>
  );
};

const SkeletonBlock = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded-xl bg-gray-200/70 ${className}`} />
);

type StatCardProps = {
  Icon: LucideIcon;
  label: string;
  value: ReactNode;
  tone?: "navy" | "gold" | "coral";
};

const StatCard = ({ Icon, label, value, tone = "navy" }: StatCardProps) => {
  const tones = {
    navy: "bg-[#16233B]/10 text-[#16233B]",
    gold: "bg-[#E3A73A]/15 text-[#B9801A]",
    coral: "bg-[#F26B5E]/10 text-[#D4493C]",
  } as const;

  return (
    <div className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-xl ${tones[tone]}`}
      >
        <Icon size={20} />
      </div>
      <p className="mt-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold text-[#16233B]">{value}</p>
    </div>
  );
};

type MiniStatProps = {
  label: string;
  value: number;
  accent: "navy" | "amber" | "emerald" | "blue";
};

const MiniStat = ({ label, value, accent }: MiniStatProps) => {
  const accents = {
    navy: "text-[#16233B]",
    amber: "text-amber-600",
    emerald: "text-emerald-600",
    blue: "text-blue-600",
  } as const;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${accents[accent]}`}>
        {value}
      </p>
    </div>
  );
};

const BookingDetail = ({
  Icon,
  label,
  value,
}: {
  Icon: LucideIcon;
  label: string;
  value: string;
}) => (
  <div>
    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
      <Icon size={12} className="text-gray-400" aria-hidden="true" />
      {label}
    </p>
    <p className="mt-1 text-sm font-semibold text-[#16233B]">{value}</p>
  </div>
);

/* ==========================================================
   SKELETONS
   ========================================================== */

const DashboardSkeleton = () => (
  <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
    {/* Welcome */}
    <div className="space-y-3">
      <SkeletonBlock className="h-8 w-64" />
      <SkeletonBlock className="h-4 w-80 max-w-full" />
    </div>

    {/* Profile */}
    <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <SkeletonBlock className="h-20 w-20 !rounded-full" />
        <div className="flex-1 space-y-3">
          <SkeletonBlock className="h-5 w-40" />
          <SkeletonBlock className="h-4 w-56" />
          <div className="flex gap-2">
            <SkeletonBlock className="h-6 w-24 !rounded-full" />
            <SkeletonBlock className="h-6 w-24 !rounded-full" />
          </div>
        </div>
        <SkeletonBlock className="h-10 w-32" />
      </div>
    </div>

    {/* Stats */}
    <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <SkeletonBlock className="h-11 w-11" />
          <SkeletonBlock className="mt-4 h-3 w-20" />
          <SkeletonBlock className="mt-2 h-5 w-28" />
        </div>
      ))}
    </div>

    {/* Booking section */}
    <div className="mt-10 space-y-4">
      <SkeletonBlock className="h-6 w-48" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonBlock key={i} className="h-20" />
        ))}
      </div>
      <div className="space-y-4">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <SkeletonBlock className="h-5 w-40" />
              <SkeletonBlock className="h-6 w-20 !rounded-full" />
            </div>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <SkeletonBlock className="h-8" />
              <SkeletonBlock className="h-8" />
              <SkeletonBlock className="h-8" />
            </div>
            <SkeletonBlock className="mt-5 h-16" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ==========================================================
   MAIN COMPONENT
   ========================================================== */

export const ProfessionalDashboardPage = () => {
  const navigate = useNavigate();

  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState("");

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingLoading, setBookingLoading] = useState(true);
  const [bookingError, setBookingError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  /* -------------------- LOADERS -------------------- */

  const loadProfile = async () => {
    setLoading(true);
    setProfileError("");
    try {
      const response = await getProviderProfile();
      setProfile(response?.data ?? null);
    } catch (error) {
      console.error("Failed to load provider profile:", error);
      setProfileError("Unable to load your dashboard");
    } finally {
      setLoading(false);
    }
  };

  const loadBookings = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setBookingLoading(true);
    setBookingError("");
    try {
      const response = await getProviderBookings();
      setBookings(response?.data || []);
    } catch (error) {
      console.error("Failed to load booking requests:", error);
      setBookingError("Unable to load booking requests");
    } finally {
      if (isRefresh) setRefreshing(false);
      else setBookingLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefreshBookings = () => loadBookings(true);

  const handleRetryAll = () => {
    if (!profile) loadProfile();
    loadBookings(!profile);
  };

  /* -------------------- ACTIONS -------------------- */

  const handleBookingStatus = async (
    bookingId: string,
    status: "Accepted" | "Rejected" | "Completed"
  ) => {
    setStatusUpdating(bookingId);
    try {
      await updateBookingStatus(bookingId, status);
      setBookings((prev) =>
        prev.map((booking) =>
          booking._id === bookingId ? { ...booking, status } : booking
        )
      );
    } catch (error) {
      console.error("Failed to update booking status:", error);
    } finally {
      setStatusUpdating(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  /* -------------------- DERIVED -------------------- */

  const providerName =
    profile?.name ||
    profile?.username ||
    profile?.fullname ||
    profile?.userId?.fullname ||
    "Service Professional";

  const profileImageSrc = resolveAssetUrl(
    profile?.profileImage?.filename
      ? `uploads/images/provider/${profile.profileImage.filename}`
      : null
  );

  const initials = initialsFrom(providerName);

  const bookingStats = useMemo(
    () => ({
      total: bookings.length,
      pending: bookings.filter((b) => b.status === "Pending").length,
      accepted: bookings.filter((b) => b.status === "Accepted").length,
      completed: bookings.filter((b) => b.status === "Completed").length,
    }),
    [bookings]
  );

  /* ==================== RENDER: LOADING ==================== */

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F7F4EE]">
        <DashboardHeader
          providerName={undefined}
          profileImageSrc={null}
          initials=""
          onLogout={handleLogout}
        />
        <DashboardSkeleton />
      </main>
    );
  }

  /* ==================== RENDER: PROFILE ERROR ==================== */

  if (profileError && !profile) {
    return (
      <main className="min-h-screen bg-[#F7F4EE]">
        <DashboardHeader
          providerName={undefined}
          profileImageSrc={null}
          initials=""
          onLogout={handleLogout}
        />
        <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
              <AlertCircle size={24} />
            </div>
            <h1 className="mt-4 text-xl font-bold text-[#16233B]">
              Unable to load your dashboard
            </h1>
            <p className="mt-1.5 text-sm text-gray-500">
              Please check your connection and try again.
            </p>
            <button
              type="button"
              onClick={handleRetryAll}
              className="group mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[#16233B] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#F26B5E] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A] focus-visible:ring-offset-2 motion-reduce:transition-none"
            >
              <RefreshCw
                size={15}
                className="transition-transform duration-500 group-hover:rotate-180 motion-reduce:transition-none"
              />
              Try Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  /* ==================== RENDER: MAIN ==================== */

  return (
    <main className="min-h-screen bg-[#F7F4EE]">
      <DashboardHeader
        providerName={providerName}
        profileImageSrc={profileImageSrc}
        initials={initials}
        onLogout={handleLogout}
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* ============ WELCOME ============ */}
        <section>
          <h1 className="text-2xl font-bold text-[#16233B] sm:text-3xl">
            Welcome back, {providerName} 👋
          </h1>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {profile?.service && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#16233B]">
                <Briefcase size={12} className="text-gray-400" />
                {humanService(profile.service)}
              </span>
            )}
            <span className="text-gray-300" aria-hidden="true">
              ·
            </span>
            {profile?.availability && (
              <AvailabilityBadge availability={profile.availability} />
            )}
          </div>

          <p className="mt-3 max-w-2xl text-sm text-gray-500">
            Manage your services, bookings and professional profile.
          </p>
        </section>

        {/* ============ PROFILE OVERVIEW ============ */}
        {profile && (
          <section className="mt-8">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                {/* Avatar + name */}
                <div className="flex min-w-0 flex-1 items-center gap-5">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-[#F7F4EE] bg-[#F7F4EE] shadow-sm sm:h-24 sm:w-24">
                    {profileImageSrc ? (
                      <img
                        src={profileImageSrc}
                        alt={`${providerName} profile photo`}
                        loading="lazy"
                        className="h-full w-full object-cover object-center"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[#E3A73A]/15 text-[#16233B]">
                        <User size={36} strokeWidth={1.6} />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-bold text-[#16233B] sm:text-xl">
                      {providerName}
                    </h2>
                    <p className="mt-0.5 truncate text-sm text-gray-500">
                      {profile.email}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-[#F7F4EE]/70 px-2.5 py-1 text-[11px] font-semibold text-[#16233B]">
                        <Briefcase size={12} className="text-gray-500" />
                        {humanService(profile.service)}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-[#F7F4EE]/70 px-2.5 py-1 text-[11px] font-semibold text-[#16233B]">
                        <Clock size={12} className="text-gray-500" />
                        {profile.experience}{" "}
                        {profile.experience === 1 ? "Year" : "Years"}
                      </span>
                      <AvailabilityBadge
                        availability={profile.availability}
                      />
                    </div>
                  </div>
                </div>

                
              </div>
            </div>
          </section>
        )}

        {/* ============ DASHBOARD STATS ============ */}
        {profile && (
          <section className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              Icon={Briefcase}
              tone="navy"
              label="Service"
              value={humanService(profile.service)}
            />
            <StatCard
              Icon={Clock}
              tone="gold"
              label="Experience"
              value={`${profile.experience} ${
                profile.experience === 1 ? "Year" : "Years"
              }`}
            />
            <StatCard
              Icon={Banknote}
              tone="coral"
              label="Price Per Hour"
              value={formatNPR(profile.price)}
            />
          </section>
        )}

        {/* ============ BOOKING REQUESTS ============ */}
        <section className="mt-10">
          {/* Section header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#16233B] sm:text-2xl">
                Booking Requests
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Manage customer service requests and upcoming jobs.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {!bookingLoading && bookings.length > 0 && (
                <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#16233B]">
                  {bookings.length}{" "}
                  {bookings.length === 1 ? "Request" : "Requests"}
                </span>
              )}

              <button
                type="button"
                onClick={handleRefreshBookings}
                disabled={refreshing || bookingLoading}
                aria-label="Refresh booking requests"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-[#16233B] shadow-sm transition-all duration-200 hover:border-[#E3A73A] hover:bg-[#E3A73A]/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
              >
                {refreshing ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <RefreshCw size={13} />
                )}
                <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
              </button>
            </div>
          </div>

          {/* Booking stats */}
          {!bookingLoading && bookings.length > 0 && (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              <MiniStat
                label="Total Requests"
                value={bookingStats.total}
                accent="navy"
              />
              <MiniStat
                label="Pending"
                value={bookingStats.pending}
                accent="amber"
              />
              <MiniStat
                label="Accepted"
                value={bookingStats.accepted}
                accent="emerald"
              />
              <MiniStat
                label="Completed"
                value={bookingStats.completed}
                accent="blue"
              />
            </div>
          )}

          {/* List / states */}
          <div className="mt-5">
            {bookingLoading ? (
              <div className="space-y-4">
                {[0, 1].map((i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <SkeletonBlock className="h-5 w-40" />
                      <SkeletonBlock className="h-6 w-20 !rounded-full" />
                    </div>
                    <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <SkeletonBlock className="h-8" />
                      <SkeletonBlock className="h-8" />
                      <SkeletonBlock className="h-8" />
                    </div>
                    <SkeletonBlock className="mt-5 h-16" />
                  </div>
                ))}
              </div>
            ) : bookingError ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
                  <AlertCircle size={22} />
                </div>
                <h3 className="mt-4 text-base font-bold text-[#16233B]">
                  {bookingError}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Please check your connection and try again.
                </p>
                <button
                  type="button"
                  onClick={handleRefreshBookings}
                  className="group mt-5 inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-[#16233B] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#E3A73A] hover:bg-[#E3A73A]/5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A] focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  <RefreshCw
                    size={15}
                    className="transition-transform duration-500 group-hover:rotate-180 motion-reduce:transition-none"
                  />
                  Try Again
                </button>
              </div>
            ) : bookings.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center shadow-sm">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F7F4EE] text-[#16233B]">
                  <ClipboardList size={26} strokeWidth={1.8} />
                </div>
                <h3 className="mt-5 text-base font-bold text-[#16233B]">
                  No booking requests yet
                </h3>
                <p className="mx-auto mt-1.5 max-w-sm text-sm text-gray-500">
                  When customers book your service, their requests will
                  appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <BookingCard
                    key={booking._id}
                    booking={booking}
                    updating={statusUpdating === booking._id}
                    onUpdate={(status) =>
                      handleBookingStatus(booking._id, status)
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
};

/* ==========================================================
   HEADER
   ========================================================== */

type DashboardHeaderProps = {
  providerName?: string;
  profileImageSrc: string | null;
  initials: string;
  onLogout: () => void;
};

const DashboardHeader = ({
  providerName,
  profileImageSrc,
  initials,
  onLogout,
}: DashboardHeaderProps) => (
  <header className="sticky top-0 z-30 border-b border-white/5 bg-[#16233B] text-white shadow-sm">
    <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
      {/* Brand */}
      <div className="flex min-w-0 items-center gap-3">
        <span className="text-lg font-extrabold tracking-tight sm:text-xl">
          Ghar<span className="text-[#E3A73A]">Sewa</span>
        </span>
        <span
          className="hidden h-5 w-px bg-white/15 sm:block"
          aria-hidden="true"
        />
        <span className="hidden truncate text-xs font-medium text-white/70 sm:block">
          Professional Dashboard
        </span>
      </div>

      {/* Identity + Logout */}
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-2.5">
          {providerName !== undefined ? (
            <>
              {profileImageSrc ? (
                <img
                  src={profileImageSrc}
                  alt={`${providerName} profile photo`}
                  className="h-8 w-8 rounded-full border border-white/20 object-cover"
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E3A73A] text-[11px] font-bold text-[#16233B]">
                  {initials || "GS"}
                </span>
              )}
              <span className="hidden max-w-[160px] truncate text-sm font-semibold sm:inline">
                {providerName}
              </span>
            </>
          ) : (
            <>
              <div className="h-8 w-8 animate-pulse rounded-full bg-white/10" />
              <div className="hidden h-4 w-24 animate-pulse rounded bg-white/10 sm:block" />
            </>
          )}
        </div>

        <button
          type="button"
          onClick={onLogout}
          aria-label="Logout"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#16233B] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          <LogOut size={14} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </div>
  </header>
);

/* ==========================================================
   BOOKING CARD
   ========================================================== */

type BookingCardProps = {
  booking: Booking;
  updating: boolean;
  onUpdate: (status: "Accepted" | "Rejected" | "Completed") => void;
};

const BookingCard = ({ booking, updating, onUpdate }: BookingCardProps) => {
  const customerName = booking.customerId?.fullname || "Customer";
  const customerPhone = booking.customerId?.phone;

  return (
    <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:border-gray-300 hover:shadow-md motion-reduce:transition-none">
      {/* HEADER: customer + status */}
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-[#16233B]">
            {customerName}
          </h3>
          {customerPhone && (
            <p className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-gray-500">
              <Phone size={12} className="text-gray-400" aria-hidden="true" />
              <a
                href={`tel:${customerPhone}`}
                className="rounded underline-offset-2 transition-colors duration-200 hover:text-[#F26B5E] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A]"
              >
                {customerPhone}
              </a>
            </p>
          )}
        </div>

        <StatusBadge status={booking.status} />
      </div>

      {/* DETAILS: service / date / time */}
      <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-3">
        <BookingDetail
          Icon={Briefcase}
          label="Service"
          value={humanService(booking.service)}
        />
        <BookingDetail
          Icon={CalendarDays}
          label="Date"
          value={formatBookingDate(booking.bookingDate)}
        />
        <BookingDetail
          Icon={Clock}
          label="Time"
          value={formatBookingTime(booking.bookingTime)}
        />
      </div>

      {/* ADDRESS + REQUIREMENT */}
      <div className="space-y-4 border-t border-gray-100 px-5 py-4">
        <div className="flex items-start gap-2.5 text-sm text-gray-600">
          <MapPin
            size={15}
            className="mt-0.5 shrink-0 text-gray-400"
            aria-hidden="true"
          />
          <span className="break-words">{booking.address}</span>
        </div>

        <div className="rounded-xl bg-[#F7F4EE]/60 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Customer Requirement
          </p>
          <p className="mt-1 break-words text-sm text-[#16233B]">
            {booking.description}
          </p>
        </div>
      </div>

      {/* FOOTER: price + actions */}
      <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Total
          </p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-[#16233B]">
            {formatNPR(booking.price)}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {booking.status === "Pending" && (
            <>
              <button
                type="button"
                disabled={updating}
                onClick={() => onUpdate("Rejected")}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#16233B] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-50 hover:text-red-600 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:bg-white disabled:hover:text-[#16233B] motion-reduce:transition-none sm:w-auto"
              >
                <X size={15} />
                Reject
              </button>
              <button
                type="button"
                disabled={updating}
                onClick={() => onUpdate("Accepted")}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#16233B] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#F26B5E] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:bg-[#16233B] motion-reduce:transition-none sm:w-auto"
              >
                {updating ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Check size={15} />
                    Accept
                  </>
                )}
              </button>
            </>
          )}

          {booking.status === "Accepted" && (
            <button
              type="button"
              disabled={updating}
              onClick={() => onUpdate("Completed")}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#16233B] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#F26B5E] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A73A] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:bg-[#16233B] motion-reduce:transition-none sm:w-auto"
            >
              {updating ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <CheckCircle size={15} />
                  Mark as Completed
                </>
              )}
            </button>
          )}

          {booking.status === "Completed" && (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3.5 py-2 text-sm font-semibold text-emerald-700">
              <CheckCircle size={15} />
              Service Completed
            </span>
          )}
        </div>
      </div>
    </article>
  );
};