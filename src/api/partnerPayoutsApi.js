import { request } from "./apiClient";

// ===========================================================================
// Partner Payouts API (Phase 6 Step 10B)
// Targets:
//   - Summary & Cycles: GET /partner-payouts/summary, /cycles/current, /cycles/validate
//   - Partner Lists & Breakdown: GET /partner-payouts/partners, /partners/{id}/breakdown
//   - Ledger Table & Recent Activity: GET /partner-payouts/table, /partner-payouts/recent
//   - Guarded Reconciliation Preview: POST /partner-payouts/sync-preview
// ===========================================================================

/**
 * Get high-level summary metrics for Partner Payouts
 * @returns {Promise<{ total_partners: number, pending_payout_total: number, paid_payout_total: number, lifetime_payout_total: number, current_cycle: Object, recent_paid_count: number }>}
 */
export const getPayoutSummary = async () => {
  return request("/partner-payouts/summary", { method: "GET" });
};

/**
 * Get the current standard payout cycle (Sun-Wed or Thu-Sat)
 * @returns {Promise<{ start: string, end: string, start_iso: string, end_iso: string, label: string }>}
 */
export const getCurrentCycle = async () => {
  return request("/partner-payouts/cycles/current", { method: "GET" });
};

/**
 * Validate custom date range for payout cycles
 * @param {string} start - Start date in YYYY-MM-DD
 * @param {string} end - End date in YYYY-MM-DD
 * @returns {Promise<{ is_valid: boolean, message: string, cycle_label: string, start: string, end: string }>}
 */
export const validateCycleDates = async (start, end) => {
  if (!start || !end) {
    throw new Error("start and end dates are required for cycle validation.");
  }
  const query = new URLSearchParams({ start, end });
  return request(`/partner-payouts/cycles/validate?${query.toString()}`, { method: "GET" });
};

/**
 * Get recent successfully paid payouts
 * @param {Object} [params] - Filters
 * @param {string} [params.staff_email] - Filter by staff email
 * @param {string} [params.date] - Filter by paid_at date (YYYY-MM-DD)
 * @param {string} [params.time] - Filter by time string (e.g. '10:00 am')
 * @param {number} [params.limit=10] - Number of records
 * @returns {Promise<Array<Object>>}
 */
export const getRecentPayouts = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.staff_email) query.append("staff_email", params.staff_email);
  if (params.date) query.append("date", params.date);
  if (params.time) query.append("time", params.time);
  if (params.limit !== undefined && params.limit !== null) {
    query.append("limit", String(params.limit));
  }
  const qs = query.toString();
  return request(`/partner-payouts/recent${qs ? `?${qs}` : ""}`, { method: "GET" });
};

/**
 * Retrieve global earnings records for the bottom table in Partner Payouts tab
 * @param {Object} [params] - Query options
 * @param {string} [params.payment_status] - 'pending', 'paid', or null for all
 * @param {string} [params.filter_mode='all'] - 'all', 'weekly', 'monthly', 'byDate'
 * @param {string} [params.month] - 'YYYY-MM'
 * @param {string} [params.week] - 'week_1', 'week_2', etc.
 * @param {string} [params.date] - 'YYYY-MM-DD'
 * @param {string} [params.search] - Search text
 * @param {number} [params.page=1] - Page number
 * @param {number} [params.limit=50] - Page size
 * @returns {Promise<{ items: Array<Object>, total_count: number, total_amount: number, pending_amount: number, paid_amount: number, page: number, limit: number, total_pages: number, dynamic_weeks: Array<Object> }>}
 */
export const getPayoutsTableData = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.payment_status) query.append("payment_status", params.payment_status);
  if (params.filter_mode) query.append("filter_mode", params.filter_mode);
  if (params.month) query.append("month", params.month);
  if (params.week) query.append("week", params.week);
  if (params.date) query.append("date", params.date);
  if (params.search) query.append("search", params.search);
  if (params.page !== undefined && params.page !== null) query.append("page", String(params.page));
  if (params.limit !== undefined && params.limit !== null) query.append("limit", String(params.limit));

  const qs = query.toString();
  return request(`/partner-payouts/table${qs ? `?${qs}` : ""}`, { method: "GET" });
};

/**
 * List all partner payout profiles with aggregated earnings metrics
 * @param {Object} [params]
 * @param {string} [params.search] - Search query by name or email
 * @returns {Promise<Array<Object>>}
 */
export const getPartnersPayouts = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.search) query.append("search", params.search);
  const qs = query.toString();
  return request(`/partner-payouts/partners${qs ? `?${qs}` : ""}`, { method: "GET" });
};

/**
 * Get profile details and aggregated live earnings for a single partner
 * @param {string} partnerIdOrEmail - Partner UUID or email address
 * @returns {Promise<Object>} Partner payout details
 */
export const getPartnerPayoutDetail = async (partnerIdOrEmail) => {
  if (!partnerIdOrEmail) {
    throw new Error("partnerIdOrEmail is required.");
  }
  return request(`/partner-payouts/partners/${encodeURIComponent(partnerIdOrEmail)}`, {
    method: "GET",
  });
};

/**
 * Retrieve itemized service earnings breakdown for a specific partner
 * @param {string} partnerIdOrEmail - Partner UUID or email address
 * @param {Object} [params] - Optional status and date filters
 * @param {string} [params.status] - 'pending', 'paid', or null for all
 * @param {string} [params.start_date] - 'YYYY-MM-DD'
 * @param {string} [params.end_date] - 'YYYY-MM-DD'
 * @returns {Promise<Array<Object>>}
 */
export const getPartnerEarningsBreakdown = async (partnerIdOrEmail, params = {}) => {
  if (!partnerIdOrEmail) {
    throw new Error("partnerIdOrEmail is required.");
  }
  const query = new URLSearchParams();
  if (params.status) query.append("status", params.status);
  if (params.start_date) query.append("start_date", params.start_date);
  if (params.end_date) query.append("end_date", params.end_date);
  const qs = query.toString();
  return request(
    `/partner-payouts/partners/${encodeURIComponent(partnerIdOrEmail)}/breakdown${qs ? `?${qs}` : ""}`,
    { method: "GET" }
  );
};

/**
 * Preview partner payout reconciliation (strictly guarded dry-run mode)
 * Financial mutations are blocked; confirm_financial_mutation defaults to false.
 * @param {Object} payload - { earnings_ids?: string[], bank_account_numbers?: string[], confirm_financial_mutation?: boolean }
 * @returns {Promise<{ status: string, mutation_executed: boolean, requires_authorization: boolean, message: string, records_count: number, total_amount: number, affected_partners_count: number, earnings_ids: string[] }>}
 */
export const previewPayoutSync = async (payload = {}) => {
  const safePayload = {
    ...payload,
    confirm_financial_mutation: false, // Enforce non-destructive preview mode
  };
  return request("/partner-payouts/sync-preview", {
    method: "POST",
    body: JSON.stringify(safePayload),
  });
};

const partnerPayoutsApi = {
  getPayoutSummary,
  getCurrentCycle,
  validateCycleDates,
  getRecentPayouts,
  getPayoutsTableData,
  getPartnersPayouts,
  getPartnerPayoutDetail,
  getPartnerEarningsBreakdown,
  previewPayoutSync,
};

export default partnerPayoutsApi;

