import axios from "axios";
import { resolveAssetUrl } from "./user.api";

const API_BASE_URL = "http://localhost:9005";

// ==========================================
// TYPES
// ==========================================

export type ReviewRecord = {
  id: string;
  bookingId: string; // "" when the backend does not return it
  customerId: string; // "" when the backend does not return it
  rating: number;
  comment: string;
  createdAt: string; // "" when the backend does not return it
  // Only filled when the backend populates the customer on each review
  customerName?: string;
  customerEmail?: string;
  customerAvatar?: string | null;
};

export type NormalizedReviews = {
  reviews: ReviewRecord[];
  average: number; // meta.averageRating, else computed from loaded reviews
  count: number; // meta.count, else reviews.length
};

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

export const getProviderReviews = async (providerId: string) => {
  const response = await axios.get(
    `${API_BASE_URL}/review/provider/${providerId}`
  );

  return response.data;
};

// ==========================================
// HELPERS (response parsing / errors)
// ==========================================

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Reads an id from either a plain id string or a populated object. */
export const idOf = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (isRecord(value)) {
    const id = value._id ?? value.id;
    return typeof id === "string" ? id : "";
  }
  return "";
};

const firstString = (...values: unknown[]): string | undefined => {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
};

/** Turns the body of GET /review/provider/:id into typed data. */
export const normalizeReviewsResponse = (body: unknown): NormalizedReviews => {
  const root: Record<string, unknown> = isRecord(body) ? body : {};
  const list: unknown[] = Array.isArray(body)
    ? body
    : Array.isArray(root.data)
      ? root.data
      : Array.isArray(root.reviews)
        ? root.reviews
        : [];

  const reviews: ReviewRecord[] = [];

  list.forEach((raw, index) => {
    if (!isRecord(raw)) return;

    const reviewer = raw.customerId ?? raw.customer ?? raw.userId ?? raw.user;
    const rating = Number(raw.rating);
    const image = isRecord(reviewer)
      ? firstString(reviewer.image, reviewer.profileImage)
      : undefined;

    reviews.push({
      id: idOf(raw) || `review-${index}`,
      bookingId: idOf(raw.bookingId ?? raw.booking),
      customerId: idOf(reviewer),
      rating: Number.isFinite(rating) ? Math.min(5, Math.max(0, rating)) : 0,
      comment: typeof raw.comment === "string" ? raw.comment.trim() : "",
      createdAt: typeof raw.createdAt === "string" ? raw.createdAt : "",
      customerName: isRecord(reviewer)
        ? firstString(reviewer.fullname, reviewer.name)
        : undefined,
      customerEmail: isRecord(reviewer)
        ? firstString(reviewer.email)
        : undefined,
      customerAvatar: image ? resolveAssetUrl(image) : null,
    });
  });

  const meta: Record<string, unknown> = isRecord(root.meta) ? root.meta : {};
  const average =
    typeof meta.averageRating === "number"
      ? meta.averageRating
      : reviews.length
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;
  const count = typeof meta.count === "number" ? meta.count : reviews.length;

  return { reviews, average, count };
};

/** Readable message from an axios (or any) error. */
export const getErrorMessage = (err: unknown, fallback: string): string => {
  if (axios.isAxiosError(err)) {
    const data: unknown = err.response?.data;
    if (isRecord(data) && typeof data.message === "string") {
      return data.message;
    }
    if (!err.response) {
      return "Network error. Please check your connection and try again.";
    }
  }
  return err instanceof Error && err.message ? err.message : fallback;
};