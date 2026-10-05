
import { useEffect, useState } from "react";

import { Star } from "lucide-react";

import { getAdminReviews } from "../../api/admin.api";

interface Review {
  _id: string;
  rating: number;
  comment?: string;
}

const AdminReviews = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReviews = async () => {
      try {
        const response = await getAdminReviews();

        if (response.status) {
          setReviews(response.data);
        }
      } catch (error) {
        console.error(
          "Failed to load reviews:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadReviews();
  }, []);

  return (
    <main className="min-h-screen bg-[#F7F4EE] px-6 py-10">
      <div className="mx-auto max-w-7xl">

        <div className="mb-8">
          <Star
            size={28}
            className="text-[#E3A73A]"
          />

          <h1 className="mt-2 text-3xl font-bold text-[#16233B]">
            Reviews
          </h1>

          <p className="mt-2 text-gray-600">
            Monitor customer reviews.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">

              <thead className="bg-[#16233B] text-white">
                <tr>
                  <th className="px-6 py-4">Rating</th>
                  <th className="px-6 py-4">Comment</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      Loading reviews...
                    </td>
                  </tr>
                ) : reviews.length === 0 ? (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No reviews found.
                    </td>
                  </tr>
                ) : (
                  reviews.map((review) => (
                    <tr
                      key={review._id}
                      className="border-b last:border-b-0"
                    >
                      <td className="px-6 py-4 font-medium text-[#16233B]">
                        {review.rating}/5
                      </td>

                      <td className="px-6 py-4 text-gray-600">
                        {review.comment || "-"}
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

export default AdminReviews;

