
import { useEffect, useState } from "react";

import {
  Users,
  UserCheck,
  CalendarCheck,
  Star,
} from "lucide-react";

import { getAdminDashboard } from "../../api/admin.api";

interface DashboardData {
  totalUsers: number;
  totalProviders: number;
  totalBookings: number;
  totalReviews: number;
}

const AdminDashboard = () => {
  const [data, setData] = useState<DashboardData>({
    totalUsers: 0,
    totalProviders: 0,
    totalBookings: 0,
    totalReviews: 0,
  });

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await getAdminDashboard();

        console.log("ADMIN DASHBOARD RESPONSE:", response);

        if (response.status === true) {
          setData(response.data);
        } else {
          setError(
            response.message || "Failed to load dashboard data."
          );
        }
      } catch (error: any) {
        console.error(
          "ADMIN DASHBOARD ERROR:",
          error
        );

        setError(
          error?.response?.data?.message ||
            "Unable to connect to admin API."
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const cards = [
    {
      title: "Total Users",
      value: data.totalUsers,
      icon: Users,
    },
    {
      title: "Service Providers",
      value: data.totalProviders,
      icon: UserCheck,
    },
    {
      title: "Total Bookings",
      value: data.totalBookings,
      icon: CalendarCheck,
    },
    {
      title: "Total Reviews",
      value: data.totalReviews,
      icon: Star,
    },
  ];

  return (
    <main className="min-h-screen bg-[#F7F4EE] px-6 py-10">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8">
          <p className="text-sm font-medium text-[#E3A73A]">
            NearPro Administration
          </p>

          <h1 className="mt-1 text-3xl font-bold text-[#16233B]">
            Admin Dashboard
          </h1>

          <p className="mt-2 text-gray-600">
            Manage users, service providers, bookings and reviews.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            <strong>Admin API Error:</strong> {error}
          </div>
        )}

        {/* Statistics */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.title}
                className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">
                      {card.title}
                    </p>

                    <h2 className="mt-2 text-3xl font-bold text-[#16233B]">
                      {loading ? "..." : card.value}
                    </h2>
                  </div>

                  <div className="rounded-xl bg-[#F7F4EE] p-3">
                    <Icon
                      size={24}
                      className="text-[#E3A73A]"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Administration */}
        <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">

          <h2 className="text-xl font-semibold text-[#16233B]">
            Administration
          </h2>

          <p className="mt-2 text-gray-600">
            Use the admin panel to manage the main activities
            of the NearPro platform.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {/* Users */}
            <div
              className="cursor-pointer rounded-xl border p-5 transition hover:-translate-y-1 hover:shadow-md"
              onClick={() => {
                window.location.href = "/admin/users";
              }}
            >
              <Users
                size={22}
                className="text-[#E3A73A]"
              />

              <h3 className="mt-3 font-semibold text-[#16233B]">
                Users
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                View and manage registered customers.
              </p>
            </div>

            {/* Providers */}
            <div
              className="cursor-pointer rounded-xl border p-5 transition hover:-translate-y-1 hover:shadow-md"
              onClick={() => {
                window.location.href = "/admin/providers";
              }}
            >
              <UserCheck
                size={22}
                className="text-[#E3A73A]"
              />

              <h3 className="mt-3 font-semibold text-[#16233B]">
                Providers
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                View and manage service providers.
              </p>
            </div>

            {/* Bookings */}
            <div
              className="cursor-pointer rounded-xl border p-5 transition hover:-translate-y-1 hover:shadow-md"
              onClick={() => {
                window.location.href = "/admin/bookings";
              }}
            >
              <CalendarCheck
                size={22}
                className="text-[#E3A73A]"
              />

              <h3 className="mt-3 font-semibold text-[#16233B]">
                Bookings
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Monitor customer service bookings.
              </p>
            </div>

            {/* Reviews */}
            <div
              className="cursor-pointer rounded-xl border p-5 transition hover:-translate-y-1 hover:shadow-md"
              onClick={() => {
                window.location.href = "/admin/reviews";
              }}
            >
              <Star
                size={22}
                className="text-[#E3A73A]"
              />

              <h3 className="mt-3 font-semibold text-[#16233B]">
                Reviews
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Monitor customer reviews.
              </p>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
};

export default AdminDashboard;

