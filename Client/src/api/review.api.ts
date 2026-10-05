import axios from "axios";

const API_BASE_URL = "http://localhost:9005";

// ==========================================
// CREATE REVIEW
// ==========================================

export const createReview = async (
  bookingId: string,
  rating: number,
  comment: string
) => {
  const token = localStorage.getItem("access_token");

  const response = await axios.post(
    `${API_BASE_URL}/review`,
    {
      bookingId,
      rating,
      comment,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

// ==========================================
// GET PROVIDER REVIEWS
// ==========================================

export const getProviderReviews = async (
  providerId: string
) => {
  const response = await axios.get(
    `${API_BASE_URL}/review/provider/${providerId}`
  );

  return response.data;
};