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

export interface TopProfessional {
  id: string;
  name: string;
  services: string[]; // [] when none
  location: string;
  image: string; // "" when none
  verified: boolean;
  rating: number;
  reviews: number;
}

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

// ==========================================
// GET TOP RATED PROFESSIONALS (homepage)
// ==========================================

const OBJECT_ID = /^[a-f0-9]{24}$/i;

const SERVICE_LABELS: Record<string, string> = {
  plumber: "Plumbing",
  electrician: "Electrical",
  cleaner: "Cleaning",
  painter: "Painting",
};

const prettyService = (name: string): string =>
  SERVICE_LABELS[name.toLowerCase()] ??
  name.charAt(0).toUpperCase() + name.slice(1);

/** Accepts "plumber", ["plumber"] or [{ name: "Plumbing" }]; ignores raw Mongo ids. */
const toServiceNames = (value: unknown): string[] => {
  const items: unknown[] = Array.isArray(value) ? value : [value];
  const names: string[] = [];
  items.forEach((item) => {
    const raw = isRecord(item)
      ? firstString(item.name, item.title, item.serviceName, item.service)
      : firstString(item);
    if (!raw || OBJECT_ID.test(raw)) return;
    const name = prettyService(raw);
    if (!names.includes(name)) names.push(name);
  });
  return names;
};

/** Tries every field the backend might use for the profession. */
const pickServices = (raw: Record<string, unknown>): string[] => {
  for (const candidate of [
    raw.services,
    raw.service,
    raw.profession,
    raw.serviceType,
    raw.category,
  ]) {
    const names = toServiceNames(candidate);
    if (names.length) return names;
  }
  return [];
};

export const getTopProfessionals = async (
  limit = 3,
  signal?: AbortSignal
): Promise<TopProfessional[]> => {
  const response = await axios.get(`${API_BASE_URL}/review/top-providers`, {
    params: { limit },
    signal,
  });

  const body: unknown = response.data;
  const list: unknown[] =
    isRecord(body) && Array.isArray(body.data)
      ? body.data
      : Array.isArray(body)
        ? body
        : [];

  const pros: TopProfessional[] = [];

  list.forEach((raw) => {
    if (!isRecord(raw)) return;

    const rating = Number(raw.averageRating);
    const reviews = Number(raw.reviewCount);
    const name = firstString(raw.name);

    // Skip entries without a real name, a valid rating, or at least one review
    if (
      !name ||
      !Number.isFinite(rating) ||
      rating <= 0 ||
      !Number.isFinite(reviews) ||
      reviews < 1
    ) {
      return;
    }

    const image = firstString(raw.image);

    pros.push({
      id: idOf(raw) || name,
      name,
      services: pickServices(raw),
      location: firstString(raw.location) ?? "",
      image: image ? (resolveAssetUrl(image) ?? "") : "",
      verified: raw.verified === true,
      rating: Math.min(5, rating),
      reviews: Math.floor(reviews),
    });
  });

  // Defensive re-sort in case server order ever changes
  return pros
    .sort((a, b) => b.rating - a.rating || b.reviews - a.reviews)
    .slice(0, limit);
};

// ==========================================
// GET TOP-RATED REVIEWS (homepage "What our customers say")
// ==========================================

export type TopReview = ReviewRecord & { providerName: string };

/**
 * Highest-rated real reviews, built only from existing endpoints:
 * the top professionals (/review/top-providers) and each one's reviews
 * (/review/provider/:id). Sorted by rating (desc), then newest first.
 * Reviews without a comment and duplicate ids are skipped.
 */
export const getTopReviews = async (
  limit = 3,
  signal?: AbortSignal
): Promise<TopReview[]> => {
  const pros = await getTopProfessionals(6, signal);

  const results = await Promise.allSettled(
    pros.map(async (pro) => {
      const body: unknown = await getProviderReviews(pro.id);
      return normalizeReviewsResponse(body).reviews.map(
        (review): TopReview => ({ ...review, providerName: pro.name })
      );
    })
  );

  if (results.length > 0 && results.every((r) => r.status === "rejected")) {
    throw new Error("Unable to load reviews");
  }

  const all = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

  const time = (r: ReviewRecord): number => {
    const t = r.createdAt ? new Date(r.createdAt).getTime() : 0;
    return Number.isNaN(t) ? 0 : t;
  };

  const seen = new Set<string>();
  return all
    .filter((r) => {
      if (!r.comment || r.rating <= 0 || seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    })
    .sort((a, b) => b.rating - a.rating || time(b) - time(a))
    .slice(0, limit);
};