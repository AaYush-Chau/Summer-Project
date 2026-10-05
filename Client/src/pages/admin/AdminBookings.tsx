
import { useEffect, useState } from "react";

import { CalendarCheck } from "lucide-react";

import { getAdminBookings } from "../../api/admin.api";

interface Booking {
  _id: string;
  service?: string;
  bookingDate?: string;
  bookingTime?: string;
  status?: string;
}

const AdminBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBookings = async () => {
      try {
        const response = await getAdminBookings();

        if (response.status) {
          setBookings(response.data);
        }
      } catch (error) {
        console.error(
          "Failed to load bookings:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadBookings();
  }, []);

  return (
    <main className="min-h-screen bg-[#F7F4EE] px-6 py-10">
      <div className="mx-auto max-w-7xl">

        <div className="mb-8">
          <CalendarCheck
            size={28}
            className="text-[#E3A73A]"
          />

          <h1 className="mt-2 text-3xl font-bold text-[#16233B]">
            Bookings
          </h1>

          <p className="mt-2 text-gray-600">
            Monitor customer service bookings.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">

              <thead className="bg-[#16233B] text-white">
                <tr>
                  <th className="px-6 py-4">Service</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Time</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      Loading bookings...
                    </td>
                  </tr>
                ) : bookings.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No bookings found.
                    </td>
                  </tr>
                ) : (
                  bookings.map((booking) => (
                    <tr
                      key={booking._id}
                      className="border-b last:border-b-0"
                    >
                      <td className="px-6 py-4 font-medium text-[#16233B]">
                        {booking.service || "-"}
                      </td>

                      <td className="px-6 py-4 text-gray-600">
                        {booking.bookingDate || "-"}
                      </td>

                      <td className="px-6 py-4 text-gray-600">
                        {booking.bookingTime || "-"}
                      </td>

                      <td className="px-6 py-4 text-gray-600">
                        {booking.status || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

            </table>
          </div>
        </div>

      </div>
    </main>
  );
};

export default AdminBookings;

