import { useState } from "react";
import { createReview } from "../api/review.api";

interface ReviewModalProps {
  bookingId: string;
  providerName: string;
  onClose: () => void;
  onSuccess: () => void;
}

const ReviewModal = ({
  bookingId,
  providerName,
  onClose,
  onSuccess,
}: ReviewModalProps) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!comment.trim()) {
      setError("Please write a review.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      await createReview(
        bookingId,
        rating,
        comment
      );

      alert("Review submitted successfully!");

      onSuccess();
      onClose();
    } catch (error: any) {
      setError(
        error?.response?.data?.message ||
          "Failed to submit review."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">

        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#16233B]">
              Rate Provider
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {providerName}
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-xl text-gray-500 hover:text-black"
          >
            ✕
          </button>
        </div>

        {/* Rating */}
        <div className="mb-5">
          <p className="mb-2 text-sm font-medium text-gray-700">
            Your Rating
          </p>

          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`text-3xl transition ${
                  star <= rating
                    ? "text-[#E3A73A]"
                    : "text-gray-300"
                }`}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Your Review
          </label>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Write about your experience..."
            rows={4}
            maxLength={500}
            className="w-full rounded-xl border border-gray-300 p-3 outline-none focus:border-[#E3A73A]"
          />

          <p className="mt-1 text-right text-xs text-gray-400">
            {comment.length}/500
          </p>
        </div>

        {/* Error */}
        {error && (
          <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-300 py-3 font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 rounded-xl bg-[#16233B] py-3 font-medium text-white hover:bg-[#243654] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Submit Review"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;