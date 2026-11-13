import { supabase } from "../supabase";
import catalogApi from "./catalogApi";
import promotionsApi from "./promotionsApi";
import heroImagesApi from "./heroImagesApi";
import promotionalBannersApi from "./promotionalBannersApi";
import scheduleApi from "./scheduleApi";
import pricingApi from "./pricingApi";
import partnerPayoutsApi from "./partnerPayoutsApi";
import staffReferralsApi from "./staffReferralsApi";
import categoryHubApi from "./categoryHubApi";
import staffApi from "./staffApi";
import bookingApi from "./bookingApi";
import appVersionConfigApi from "./appVersionConfigApi";
export * from "./catalogApi";
export * from "./promotionsApi";
export * from "./heroImagesApi";
export * from "./promotionalBannersApi";
export * from "./scheduleApi";
export * from "./pricingApi";
export * from "./partnerPayoutsApi";
export * from "./staffReferralsApi";
export * from "./categoryHubApi";
export * from "./staffApi";
export * from "./appVersionConfigApi";
export {
  validateBookingUuid,
  validateScheduleDate,
  validateScheduleTime,
  getBookings,
  getBookingDetail,
  getEligibleStaffForBooking,
  previewBookingAssignment,
  assignStaffToBooking,
  reassignStaffToBooking,
  getBookingCancellationEligibility,
  previewBookingCancellation,
  cancelBooking,
  getBookingReschedulingEligibility,
  previewBookingReschedule,
  rescheduleBooking,
  getBookingRefundEligibility,
  previewBookingRefund,
  refundBooking,
} from "./bookingApi";

const rawApiUrl = (
  process.env.REACT_APP_ADMIN_API_BASE_URL ||
  process.env.REACT_APP_API_URL ||
  "http://127.0.0.1:8001"
).trim().replace(/\/$/, "");

export const API_PREFIX = "/api/v1/admin";
export const API_BASE_URL = rawApiUrl.endsWith(API_PREFIX)
  ? rawApiUrl.slice(0, -API_PREFIX.length)
  : rawApiUrl;

// Storage keys in sessionStorage (scoped to browser tab, aligned with supabase.js storage)
const STORAGE_KEYS = {
  ACCESS_TOKEN: "neatify_admin_access_token",
  REFRESH_TOKEN: "neatify_admin_refresh_token",
  EXPIRES_AT: "neatify_admin_expires_at",
  USER: "neatify_admin_user",
};

// Singleton promise to serialize concurrent refresh token requests
let refreshPromise = null;

/**
 * Custom API Error carrying HTTP status code and server detail
 */
export class ApiError extends Error {
  constructor(message, status, details = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

/**
 * Storage helpers for authentication tokens and admin session
 */
export const getAccessToken = () => {
  try {
    return window.sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) || null;
  } catch {
    return null;
  }
};

export const getRefreshToken = () => {
  try {
    return window.sessionStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) || null;
  } catch {
    return null;
  }
};

export const getStoredUser = () => {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const getExpiresAt = () => {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEYS.EXPIRES_AT);
    return raw ? parseInt(raw, 10) : null;
  } catch {
    return null;
  }
};

export const setSessionTokens = (data) => {
  try {
    if (data.access_token) {
      window.sessionStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
    }
    if (data.refresh_token) {
      window.sessionStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token);
    }
    if (data.expires_at) {
      window.sessionStorage.setItem(STORAGE_KEYS.EXPIRES_AT, String(data.expires_at));
    } else if (data.expires_in) {
      const computedExpiresAt = Math.floor(Date.now() / 1000) + data.expires_in;
      window.sessionStorage.setItem(STORAGE_KEYS.EXPIRES_AT, String(computedExpiresAt));
    }
    if (data.user) {
      window.sessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
    }
  } catch (err) {
    console.error("Failed to persist admin session tokens:", err);
  }
};

export const clearSessionTokens = () => {
  try {
    window.sessionStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    window.sessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    window.sessionStorage.removeItem(STORAGE_KEYS.EXPIRES_AT);
    window.sessionStorage.removeItem(STORAGE_KEYS.USER);
  } catch (err) {
    console.error("Failed to clear admin session tokens:", err);
  }
};

/**
 * Sync Supabase client SDK session with the tokens received from FastAPI
 */
const syncSupabaseSession = async (accessToken, refreshToken) => {
  if (!accessToken || !refreshToken) return;
  try {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) {
      console.warn("Supabase SDK session synchronization notice:", error.message);
    }
  } catch (err) {
    console.warn("Unexpected error syncing Supabase SDK session:", err);
  }
};

/**
 * Core HTTP Request wrapper with automated Bearer auth and 401 refresh-and-retry
 */
export const request = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${API_PREFIX}${endpoint}`;
  const headers = {
    Accept: "application/json",
    ...options.headers,
  };
  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const token = getAccessToken();
  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const timeoutMs = options.timeoutMs || 30000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });
  } catch (networkError) {
    if (networkError.name === "AbortError") {
      throw new ApiError(
        `Request timed out after ${timeoutMs / 1000}s. Please verify the Admin server is running.`,
        0,
        networkError
      );
    }
    throw new ApiError(
      "Unable to connect to the Admin server. Please verify the backend is running.",
      0,
      networkError
    );
  } finally {
    clearTimeout(timeoutId);
  }

  // Handle Token Expiration (401) with Singleton Refresh
  if (response.status === 401 && !options._retry && !endpoint.startsWith("/auth/login") && !endpoint.startsWith("/auth/refresh")) {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearSessionTokens();
      await supabase.auth.signOut();
      throw new ApiError("Session expired. Please log in again.", 401);
    }

    try {
      // Use existing singleton refresh promise or create a new one
      if (!refreshPromise) {
        refreshPromise = refreshSession().finally(() => {
          refreshPromise = null;
        });
      }

      const refreshedData = await refreshPromise;
      if (refreshedData && refreshedData.access_token) {
        // Retry the original request with the new access token
        return request(endpoint, {
          ...options,
          _retry: true,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${refreshedData.access_token}`,
          },
        });
      }
    } catch (refreshErr) {
      clearSessionTokens();
      await supabase.auth.signOut();
      throw new ApiError("Session renewal failed. Please log in again.", 401, refreshErr);
    }
  }

  // Parse JSON response body
  let data;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    if (data) {
      if (typeof data.detail === "string" && data.detail.trim()) {
        errorMessage = data.detail.trim();
      } else if (Array.isArray(data.detail)) {
        errorMessage = data.detail
          .map((err) => (typeof err === "string" ? err : err.msg || err.message || JSON.stringify(err)))
          .join("; ");
      } else if (data.error && typeof data.error.message === "string") {
        errorMessage = data.error.message;
        if (Array.isArray(data.error.details) && data.error.details.length > 0) {
          const detailStrings = data.error.details.map((d) => (d.message ? `${d.field ? `${d.field}: ` : ""}${d.message}` : JSON.stringify(d)));
          errorMessage = `${errorMessage}: ${detailStrings.join("; ")}`;
        }
      } else if (typeof data.message === "string" && data.message.trim()) {
        errorMessage = data.message.trim();
      }
    }
    throw new ApiError(errorMessage, response.status, data);
  }

  return data;
};

/**
 * Refresh administrator session via FastAPI backend
 */
export const refreshSession = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new ApiError("No refresh token available", 401);
  }

  const url = `${API_BASE_URL}${API_PREFIX}/auth/refresh`;
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  } catch (netErr) {
    throw new ApiError("Network error during session refresh", 0, netErr);
  }

  if (!response.ok) {
    clearSessionTokens();
    await supabase.auth.signOut();
    throw new ApiError("Refresh token rejected or expired", response.status);
  }

  const data = await response.json();
  setSessionTokens(data);

  // Sync Supabase SDK with rotated tokens
  await syncSupabaseSession(data.access_token, data.refresh_token);

  return data;
};

/**
 * Authenticate administrator with FastAPI
 */
export const login = async (email, password) => {
  const data = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: email.trim(), password }),
  });

  // Store tokens in sessionStorage
  setSessionTokens(data);

  // Sync Supabase SDK session
  await syncSupabaseSession(data.access_token, data.refresh_token);

  return data;
};

/**
 * Fetch authenticated administrator identity and profile from FastAPI
 */
export const getMe = async () => {
  return request("/auth/me", {
    method: "GET",
  });
};

/**
 * Sign out administrator from FastAPI backend and Supabase SDK
 */
export const logout = async () => {
  const token = getAccessToken();
  try {
    if (token) {
      await request("/auth/logout", {
        method: "POST",
      });
    }
  } catch (err) {
    console.warn("Backend logout notification warning:", err.message);
  } finally {
    clearSessionTokens();
    await supabase.auth.signOut();
  }
};

/**
 * Get current admin session: checks stored tokens, validates/refreshes with backend,
 * and ensures the Supabase SDK session is synchronized.
 */
export const getCurrentAdmin = async () => {
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();

  if (!accessToken && !refreshToken) {
    return null;
  }

  // Check if token is nearing expiration (within 60 seconds)
  const expiresAt = getExpiresAt();
  const now = Math.floor(Date.now() / 1000);
  if (expiresAt && now >= expiresAt - 60 && refreshToken) {
    try {
      const refreshed = await refreshSession();
      return refreshed.user || getStoredUser();
    } catch {
      return null;
    }
  }

  try {
    const adminUser = await getMe();
    if (adminUser) {
      // Ensure Supabase SDK has active session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session && accessToken && refreshToken) {
        await syncSupabaseSession(accessToken, refreshToken);
      }
      return adminUser;
    }
  } catch (err) {
    if (err.status === 401 && refreshToken) {
      try {
        const refreshed = await refreshSession();
        return refreshed.user || getStoredUser();
      } catch {
        return null;
      }
    }
    // For network errors, fallback to stored user if session is nominally valid
    if (err.status === 0) {
      const stored = getStoredUser();
      if (stored && expiresAt && now < expiresAt) {
        return stored;
      }
    }
    return null;
  }

  return null;
};

const REQUIRED_OVERVIEW_NUMERIC_FIELDS = [
  "total_staff_count",
  "available_staff_count",
  "unassigned_bookings_count",
  "assigned_staff_count",
  "unassigned_staff_count",
  "total_services_staff_count",
];

const REQUIRED_BOOKING_COUNTS_NUMERIC_FIELDS = [
  "unassigned",
  "assigned",
  "payment_failed",
  "under_review",
  "completed",
  "rescheduled",
  "cancelled",
  "refund_management",
  "customer_checklist",
];

/**
 * Dashboard APIs (Phase 4D/4E) with strict response validation
 */
export const getDashboardOverview = async () => {
  const data = await request("/dashboard/overview", {
    method: "GET",
  });
  const isValid =
    data &&
    typeof data === "object" &&
    REQUIRED_OVERVIEW_NUMERIC_FIELDS.every(
      (f) => typeof data[f] === "number" && !isNaN(data[f])
    );
  if (!isValid) {
    throw new ApiError(
      "Malformed Dashboard Overview response: missing or non-numeric required fields",
      502,
      data
    );
  }
  return data;
};

export const getStaffWorkload = async () => {
  const data = await request("/dashboard/staff-workload", {
    method: "GET",
  });
  const isValid =
    data &&
    typeof data === "object" &&
    Array.isArray(data.assigned_staff) &&
    Array.isArray(data.unassigned_staff) &&
    Array.isArray(data.total_services_staff);
  if (!isValid) {
    throw new ApiError(
      "Malformed Staff Workload response: assigned_staff, unassigned_staff, or total_services_staff is not an array",
      502,
      data
    );
  }
  return data;
};

export const getBookingCounts = async () => {
  const data = await request("/dashboard/booking-counts", {
    method: "GET",
  });
  const isValid =
    data &&
    typeof data === "object" &&
    REQUIRED_BOOKING_COUNTS_NUMERIC_FIELDS.every(
      (f) => typeof data[f] === "number" && !isNaN(data[f])
    );
  if (!isValid) {
    throw new ApiError(
      "Malformed Booking Counts response: missing or non-numeric category counters",
      502,
      data
    );
  }
  return data;
};

/**
 * System and Database health checks (Phase 6 Step 18B)
 */
export const getHealth = async () => {
  return request("/health", { method: "GET" });
};

export const getDatabaseHealth = async () => {
  return request("/health/db", { method: "GET" });
};

const apiClient = {
  login,
  logout,
  refreshSession,
  getMe,
  getCurrentAdmin,
  request,
  getHealth,
  getDatabaseHealth,
  getAccessToken,
  getRefreshToken,
  getStoredUser,
  clearSessionTokens,
  getDashboardOverview,
  getStaffWorkload,
  getBookingCounts,
  ...bookingApi,
  ...catalogApi,
  ...promotionsApi,
  ...heroImagesApi,
  ...promotionalBannersApi,
  ...scheduleApi,
  ...pricingApi,
  ...partnerPayoutsApi,
  ...staffReferralsApi,
  ...categoryHubApi,
  ...staffApi,
  ...appVersionConfigApi,
};

export default apiClient;
