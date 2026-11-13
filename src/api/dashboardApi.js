import { request, ApiError } from "./apiClient";

/**
 * Neatify Admin Dashboard API Services (Phase 4D/4E)
 * Connects to FastAPI Admin Backend dashboard endpoints with strict response validation:
 * - GET /api/v1/admin/dashboard/overview
 * - GET /api/v1/admin/dashboard/staff-workload
 * - GET /api/v1/admin/dashboard/booking-counts
 */

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
 * Validates that all required operational overview metrics exist and are numeric.
 */
export const validateDashboardOverview = (data) => {
  if (!data || typeof data !== "object") return false;
  return REQUIRED_OVERVIEW_NUMERIC_FIELDS.every(
    (field) => typeof data[field] === "number" && !isNaN(data[field])
  );
};

/**
 * Validates that all required staff workload arrays are present.
 */
export const validateStaffWorkload = (data) => {
  if (!data || typeof data !== "object") return false;
  return (
    Array.isArray(data.assigned_staff) &&
    Array.isArray(data.unassigned_staff) &&
    Array.isArray(data.total_services_staff)
  );
};

/**
 * Validates that all 9 booking tab badge counts exist and are numeric.
 */
export const validateBookingCounts = (data) => {
  if (!data || typeof data !== "object") return false;
  return REQUIRED_BOOKING_COUNTS_NUMERIC_FIELDS.every(
    (field) => typeof data[field] === "number" && !isNaN(data[field])
  );
};

/**
 * Fetches high-level operational KPI counters for dashboard overview cards.
 * Validates response shape strictly before returning to callers.
 */
export const getDashboardOverview = async () => {
  const data = await request("/dashboard/overview", {
    method: "GET",
  });
  if (!validateDashboardOverview(data)) {
    throw new ApiError(
      "Malformed Dashboard Overview response: missing or non-numeric required fields",
      502,
      data
    );
  }
  return data;
};

/**
 * Fetches staff workload groupings matching exact Dashboard.js counts and semantics.
 * Validates list structures strictly before returning to callers.
 */
export const getStaffWorkload = async () => {
  const data = await request("/dashboard/staff-workload", {
    method: "GET",
  });
  if (!validateStaffWorkload(data)) {
    throw new ApiError(
      "Malformed Staff Workload response: assigned_staff, unassigned_staff, or total_services_staff is not an array",
      502,
      data
    );
  }
  return data;
};

/**
 * Fetches live tab badge counts across all 9 booking categories.
 * Validates counts strictly before returning to callers.
 */
export const getBookingCounts = async () => {
  const data = await request("/dashboard/booking-counts", {
    method: "GET",
  });
  if (!validateBookingCounts(data)) {
    throw new ApiError(
      "Malformed Booking Counts response: missing or non-numeric category counters",
      502,
      data
    );
  }
  return data;
};

const dashboardApi = {
  getDashboardOverview,
  getStaffWorkload,
  getBookingCounts,
  validateDashboardOverview,
  validateStaffWorkload,
  validateBookingCounts,
};

export default dashboardApi;
