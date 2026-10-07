// src/api/user.api.ts
//
// Talks to your existing backend:
//   GET /auth/me           -> { data: { id, fullname, phone, role, image } }
//   GET /provider/details  -> { data: { profileImage: { filename } , ... } }  (providers only)
//
// Also manages the cached "user" in localStorage and builds image URLs.

export interface AuthUser {
  id?: string | number;
  fullname?: string;
  phone?: string;
  email?: string;
  role?: string;
  image?: string;
}

/** Thrown when the backend rejects the token (HTTP 401). */
export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

// Backend origin, e.g. http://localhost:9005  (falls back to your local server)
const API_BASE_URL = (
  (import.meta.env.VITE_APP_BASE_URL as string | undefined) ??
  "http://localhost:9005"
).replace(/\/+$/, "");

// Static files are served by the backend under /assets (ASSETS_URL in its .env)
const ASSETS_BASE_URL = (
  (import.meta.env.VITE_ASSETS_URL as string | undefined) ??
  `${API_BASE_URL}/assets`
).replace(/\/+$/, "");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

/** Turns a backend/localStorage object into a clean AuthUser (or null). */
export function normalizeUser(raw: unknown): AuthUser | null {
  if (!isRecord(raw)) return null;

  const idValue = raw.id ?? raw._id;

  // `image` can be a URL string (from /auth/me) or { filename } (older records)
  const imageValue = isRecord(raw.image)
    ? asString(raw.image.filename)
    : asString(raw.image);

  const candidate: AuthUser = {
    id:
      typeof idValue === "string" || typeof idValue === "number"
        ? idValue
        : undefined,
    fullname: asString(raw.fullname),
    phone: asString(raw.phone),
    email: asString(raw.email),
    role: asString(raw.role),
    image: imageValue,
  };

  // Drop undefined keys so merging never overwrites good data with blanks
  const entries = Object.entries(candidate).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return null;

  return Object.fromEntries(entries) as AuthUser;
}

async function requestJson(
  path: string,
  accessToken: string,
  signal?: AbortSignal
): Promise<{ status: number; body: unknown }> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    signal,
  });

  if (response.status === 401) throw new UnauthorizedError();

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  return { status: response.status, body };
}

// Provider photo lives on the provider profile, not on the user record
async function getProviderImage(
  accessToken: string,
  signal?: AbortSignal
): Promise<string | undefined> {
  try {
    const { status, body } = await requestJson(
      "/provider/details",
      accessToken,
      signal
    );

    if (status !== 200 || !isRecord(body) || !isRecord(body.data)) {
      return undefined;
    }

    const image = body.data.profileImage;
    const filename = isRecord(image) ? asString(image.filename) : undefined;

    return filename ? `uploads/images/provider/${filename}` : undefined;
  } catch (error: unknown) {
    if (error instanceof UnauthorizedError) throw error;
    return undefined; // a missing/failed photo must never break the Header
  }
}

// Tiny in-memory cache so route changes don't re-hit the API every time
const CACHE_MS = 60_000;
let cache: { token: string; at: number; user: AuthUser } | null = null;

/** Loads the logged-in user from the backend. Throws UnauthorizedError on 401. */
export async function getCurrentUser(
  accessToken: string,
  signal?: AbortSignal
): Promise<AuthUser> {
  if (
    cache &&
    cache.token === accessToken &&
    Date.now() - cache.at < CACHE_MS
  ) {
    return cache.user;
  }

  const { status, body } = await requestJson("/auth/me", accessToken, signal);

  if (status < 200 || status >= 300 || !isRecord(body)) {
    throw new Error(`Request failed (${status})`);
  }

  const user = normalizeUser(body.data);
  if (!user) throw new Error("Unexpected /auth/me response");

  // Providers: use the photo from their provider profile
  if (!user.image && user.role === "provider") {
    const providerImage = await getProviderImage(accessToken, signal);
    if (providerImage) user.image = providerImage;
  }

  cache = { token: accessToken, at: Date.now(), user };
  return user;
}

/** Cached user from localStorage (safe against missing / invalid JSON). */
export function readStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem("user");
    return raw ? normalizeUser(JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

/** Merges fresh data into the cached "user" without dropping other keys. */
export function saveStoredUser(fresh: AuthUser): void {
  try {
    const raw = localStorage.getItem("user");
    const existing: unknown = raw ? JSON.parse(raw) : {};
    const merged = { ...(isRecord(existing) ? existing : {}), ...fresh };
    localStorage.setItem("user", JSON.stringify(merged));
  } catch {
    // ignore storage errors
  }
}

/** Removes the stored session (same keys the logout button clears). */
export function clearAuth(): void {
  cache = null;
  localStorage.removeItem("access_token");
  localStorage.removeItem("user");
}

/**
 * Builds a usable image URL. Absolute / data / blob URLs are kept as-is;
 * relative paths (e.g. "uploads/images/provider/x.png") are served from
 * the backend's /assets folder.
 */
export function resolveAssetUrl(path?: string | null): string | null {
  const value = path?.trim();
  if (!value) return null;
  if (/^(https?:)?\/\//i.test(value) || /^(data|blob):/i.test(value)) {
    return value;
  }
  return `${ASSETS_BASE_URL}/${value.replace(/^\/+/, "")}`;
}