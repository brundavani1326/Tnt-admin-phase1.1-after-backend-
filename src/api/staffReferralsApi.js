import { request } from "./apiClient";

// ===========================================================================
// Staff Referrals API Client (Phase 6 Step 11B)
// Targets:
//   - Summary & Milestones: GET /staff-referrals/summary, /staff-referrals/milestones
//   - Listing & Search: GET /staff-referrals, /staff-referrals/staff/{staff_id_or_code}, /staff-referrals/{id}
//   - Candidate Status: PATCH /staff-referrals/{id}/status
//   - Export Helper: GET /staff-referrals/export
//   - Guarded Operations: POST /staff-referrals/sync-preview, /{id}/initiate-bonus, /{id}/complete-payment
// ===========================================================================

/**
 * Standard referral reward amount in INR
 */
export const STANDARD_REFERRAL_BONUS_AMOUNT = 1500;

/**
 * Standard booking milestone target to qualify for bonus
 */
export const REFERRAL_MILESTONE_TARGET = 30;

/**
 * Retrieve high-level summary metrics across all staff referral submissions.
 * @returns {Promise<{
 *   total_referrals: number,
 *   pending_approval_count: number,
 *   approved_count: number,
 *   rejected_count: number,
 *   milestone_completed_count: number,
 *   pending_bonuses_count: number,
 *   paid_bonuses_count: number,
 *   total_bonus_paid_amount: number,
 *   total_bonus_pending_amount: number,
 *   milestone_target_bookings: number,
 *   reward_per_referral: number
 * }>}
 */
export const getReferralsSummary = async () => {
  return request("/staff-referrals/summary", { method: "GET" });
};

/**
 * Retrieve approved referrals grouped by referring partner with milestone progress.
 * Matches the collapsible Referral Milestones & Bonuses panel in Dashboard.js.
 * @returns {Promise<Array<{
 *   referrer_name: string,
 *   referral_code: string,
 *   referrer_email: string,
 *   referrer_phone: string,
 *   account_holder_name: string,
 *   account_number: string,
 *   ifsc_code: string,
 *   bank_name: string,
 *   total_referrals_count: number,
 *   eligible_rewards_count: number,
 *   paid_rewards_count: number,
 *   pending_bonus_amount: number,
 *   candidates: Array<Object>
 * }>>}
 */
export const getMilestonesGrouped = async () => {
  return request("/staff-referrals/milestones", { method: "GET" });
};

/**
 * Retrieve export-ready eligible referral rewards with bank details.
 * Combines eligible referrals (approved, 30+ completed bookings, bonus_status != 'paid').
 * @returns {Promise<{
 *   export_settings: {
 *     debit_account_no: string,
 *     payout_mode: string,
 *     product_code: string
 *   },
 *   total_referrers: number,
 *   total_eligible_referrals: number,
 *   total_payout_amount: number,
 *   rows: Array<Object>,
 *   records?: Array<Object>
 * }>}
 */
export const getExportData = async () => {
  return request("/staff-referrals/export", { method: "GET" });
};

/**
 * List staff referral applications with filters and server-side pagination.
 * @param {Object} [params] - Query options
 * @param {string} [params.status] - Filter by candidate status: 'pending', 'approved', 'rejected'
 * @param {string} [params.bonus_status] - Filter by bonus status: 'pending', 'initiated', 'paid'
 * @param {string} [params.search] - Search text for candidate name, phone, email, referrer, code
 * @param {number} [params.page=1] - Page number (1-based)
 * @param {number} [params.limit=50] - Items per page (max 200)
 * @returns {Promise<{
 *   items: Array<Object>,
 *   data?: Array<Object>,
 *   total_count: number,
 *   page: number,
 *   limit: number,
 *   total_pages: number
 * }>}
 */
export const listStaffReferrals = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.status) query.append("status", params.status);
  if (params.bonus_status) query.append("bonus_status", params.bonus_status);
  if (params.search) query.append("search", params.search);
  if (params.page !== undefined && params.page !== null) {
    query.append("page", String(params.page));
  }
  if (params.limit !== undefined && params.limit !== null) {
    query.append("limit", String(params.limit));
  }

  const qs = query.toString();
  return request(`/staff-referrals${qs ? `?${qs}` : ""}`, { method: "GET" });
};

/**
 * Safely retrieve all staff referral applications across all pages.
 * Handles server-side pagination transparently without truncating dataset.
 * @param {Object} [params] - Filter criteria
 * @returns {Promise<Array<Object>>}
 */
export const getAllStaffReferrals = async (params = {}) => {
  const pageSize = 100;
  const firstPage = await listStaffReferrals({
    ...params,
    page: 1,
    limit: pageSize,
  });

  const firstItems = firstPage.items || firstPage.data || [];
  const totalPages = firstPage.total_pages || 1;

  if (totalPages <= 1) {
    return firstItems;
  }

  let allItems = [...firstItems];
  for (let p = 2; p <= totalPages; p++) {
    const pageRes = await listStaffReferrals({
      ...params,
      page: p,
      limit: pageSize,
    });
    const pageItems = pageRes.items || pageRes.data || [];
    allItems = allItems.concat(pageItems);
  }

  return allItems;
};

/**
 * Retrieve referral history and metrics for a specific staff member by ID or referral code.
 * @param {string} staffIdOrCode - Staff UUID or referral code (e.g. 'REF12345')
 * @returns {Promise<{
 *   staff_profile: Object,
 *   referral_code: string,
 *   total_referrals: number,
 *   eligible_bonuses_count: number,
 *   paid_bonuses_count: number,
 *   pending_bonus_amount: number,
 *   referrals: Array<Object>
 * }>}
 */
export const getStaffReferralHistory = async (staffIdOrCode) => {
  if (!staffIdOrCode) {
    throw new Error("staffIdOrCode is required.");
  }
  const encoded = encodeURIComponent(String(staffIdOrCode).trim());
  return request(`/staff-referrals/staff/${encoded}`, { method: "GET" });
};

/**
 * Retrieve full details for a single referral submission by UUID.
 * @param {string} id - 36-character referral UUID
 * @returns {Promise<Object>}
 */
export const getStaffReferralDetail = async (id) => {
  if (!id) {
    throw new Error("referral id is required.");
  }
  const encoded = encodeURIComponent(String(id).trim());
  return request(`/staff-referrals/${encoded}`, { method: "GET" });
};

/**
 * Update candidate application status ('approved' or 'rejected').
 * @param {string} id - Referral form UUID
 * @param {string} status - Target status ('approved', 'rejected', or 'pending')
 * @returns {Promise<{ status: string, message: string, referral: Object }>}
 */
export const updateCandidateStatus = async (id, status) => {
  if (!id) {
    throw new Error("referral id is required.");
  }
  if (!status) {
    throw new Error("status is required ('approved', 'rejected', or 'pending').");
  }
  const cleanStatus = String(status).trim().toLowerCase();
  const encoded = encodeURIComponent(String(id).trim());
  return request(`/staff-referrals/${encoded}/status`, {
    method: "PATCH",
    body: { status: cleanStatus },
  });
};

/**
 * Preview referral bonus reconciliation from Excel/bank statement.
 * STRICT FINANCIAL SAFETY GUARD:
 * Enforces confirm_financial_mutation=false to prevent unauthorized database updates.
 * @param {Object} payload - Search criteria
 * @param {Array<string>} [payload.referral_ids] - Specific referral UUIDs
 * @param {Array<string>} [payload.bank_account_numbers] - Account numbers from statement
 * @returns {Promise<{
 *   status: string,
 *   mutation_executed: boolean,
 *   requires_authorization: boolean,
 *   total_records: number,
 *   total_amount: number,
 *   earnings_ids?: Array<string>,
 *   message: string
 * }>}
 */
export const previewReferralSync = async (payload = {}) => {
  const safePayload = {
    referral_ids: payload.referral_ids || undefined,
    bank_account_numbers: payload.bank_account_numbers || undefined,
    confirm_financial_mutation: false, // Strict safety guard: always preview only
  };
  return request("/staff-referrals/sync-preview", {
    method: "POST",
    body: safePayload,
  });
};

/**
 * Safely initiate referral bonus for a candidate reaching 30+ completed bookings.
 * STRICT FINANCIAL SAFETY GUARD:
 * Operates in non-destructive dry-run simulation mode.
 * @param {string} id - Referral UUID
 * @param {Object} [payload] - Optional parameters
 * @param {number} [payload.bonus_amount=1500] - Bonus amount in INR
 * @returns {Promise<{
 *   status: string,
 *   mutation_executed: boolean,
 *   requires_authorization: boolean,
 *   action: string,
 *   target_bonus_status: string,
 *   bonus_amount: number,
 *   candidate_name: string,
 *   referrer_name: string,
 *   referral_code: string,
 *   message: string
 * }>}
 */
export const initiateReferralBonus = async (id, payload = {}) => {
  if (!id) {
    throw new Error("referral id is required.");
  }
  const encoded = encodeURIComponent(String(id).trim());
  const safePayload = {
    bonus_amount: payload.bonus_amount || STANDARD_REFERRAL_BONUS_AMOUNT,
    confirm_financial_mutation: false, // Strict safety guard: dry-run only
    dry_run: true,
    notify_staff: false,
  };
  return request(`/staff-referrals/${encoded}/initiate-bonus`, {
    method: "POST",
    body: safePayload,
  });
};

/**
 * Complete referral bonus payment (₹1,500).
 * STRICT FINANCIAL SAFETY GUARD:
 * Operates in non-destructive dry-run simulation mode.
 * @param {string} id - Referral UUID
 * @param {Object} [payload] - Optional parameters
 * @param {string} [payload.payment_reference] - Optional transaction reference
 * @param {number} [payload.bonus_amount=1500] - Bonus amount in INR
 * @returns {Promise<{
 *   status: string,
 *   mutation_executed: boolean,
 *   requires_authorization: boolean,
 *   action: string,
 *   target_bonus_status: string,
 *   bonus_amount: number,
 *   candidate_name: string,
 *   referrer_name: string,
 *   referral_code: string,
 *   message: string
 * }>}
 */
export const completeReferralPayment = async (id, payload = {}) => {
  if (!id) {
    throw new Error("referral id is required.");
  }
  const encoded = encodeURIComponent(String(id).trim());
  const safePayload = {
    bonus_amount: payload.bonus_amount || STANDARD_REFERRAL_BONUS_AMOUNT,
    confirm_financial_mutation: false, // Strict safety guard: dry-run only
    payment_reference: payload.payment_reference || "",
    dry_run: true,
  };
  return request(`/staff-referrals/${encoded}/complete-payment`, {
    method: "POST",
    body: safePayload,
  });
};

const staffReferralsApi = {
  STANDARD_REFERRAL_BONUS_AMOUNT,
  REFERRAL_MILESTONE_TARGET,
  getReferralsSummary,
  getMilestonesGrouped,
  getExportData,
  listStaffReferrals,
  getAllStaffReferrals,
  getStaffReferralHistory,
  getStaffReferralDetail,
  updateCandidateStatus,
  previewReferralSync,
  initiateReferralBonus,
  completeReferralPayment,
};

export default staffReferralsApi;

