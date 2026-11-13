import { request } from "./apiClient";

// ===========================================================================
// Staff Management API Client (Phase 6 Step 13B)
// Targets:
//   - Directory & Search: GET /staff, GET /staff/out-of-zone
//   - Staff Profiles & KYC: GET /staff/{id}, GET /staff/by-email/{email}, PATCH /staff/{id}
//   - Monthly Availability: GET /staff/availability, GET /staff/{id}/availability
//   - Duty Logs & History: GET /staff/{id}/duty-logs
//   - Earnings & Ledger: GET /staff/{id}/earnings
//   - Status & Blocks: PATCH /staff/{id}/status
//   - Deactivation & Offboarding: DELETE /staff/{id}, PATCH /staff/{id}/deactivate
//   - Media & Avatars: POST /staff/{id}/avatar
//   - Onboarding: POST /staff
// ===========================================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MONTH_REGEX = /^(\d{4})-(0[1-9]|1[0-2])$/;

/**
 * Validate that an identifier is a standard 36-character UUID string.
 * @param {string} staffId
 * @returns {string} Trimmed lowercase UUID
 */
export const validateStaffUuid = (staffId) => {
  if (!staffId || typeof staffId !== "string" || !UUID_REGEX.test(staffId.trim())) {
    throw new Error(`Invalid staff_id format: '${staffId}'. Must be a valid 36-character UUID string.`);
  }
  return staffId.trim().toLowerCase();
};

/**
 * Validate calendar month string in YYYY-MM format.
 * @param {string} month
 * @returns {string} Validated month string
 */
export const validateCalendarMonth = (month) => {
  if (!month || typeof month !== "string" || !MONTH_REGEX.test(month.trim())) {
    throw new Error(`Invalid month format: '${month}'. Expected 'YYYY-MM' with month between 01 and 12.`);
  }
  return month.trim();
};

/**
 * Validate staff email address.
 * @param {string} email
 * @returns {string} Trimmed email address
 */
export const validateStaffEmail = (email) => {
  if (!email || typeof email !== "string" || !email.includes("@")) {
    throw new Error(`Invalid staff email format: '${email}'.`);
  }
  return email.trim();
};

// ===========================================================================
// 1. Directory & Listing Endpoints
// ===========================================================================

/**
 * Retrieve paginated staff directory members.
 * Excludes sensitive banking details and government IDs.
 * @param {Object} [params]
 * @param {number} [params.limit=50] - Page size (1-100)
 * @param {number} [params.offset=0] - Offset for pagination
 * @param {string} [params.search] - Search substring in name or phone
 * @param {string} [params.status] - Filter by operational status
 * @param {boolean} [params.is_blocked] - Filter by blocked state
 * @param {boolean} [params.is_available] - Filter by availability
 * @returns {Promise<{items: Array<Object>, total: number, limit: number, offset: number, has_more: boolean}>}
 */
export const listStaff = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.limit !== undefined && params.limit !== null) {
    query.set("limit", String(params.limit));
  }
  if (params.offset !== undefined && params.offset !== null) {
    query.set("offset", String(params.offset));
  }
  if (params.search && String(params.search).trim()) {
    query.set("search", String(params.search).trim());
  }
  if (params.status && String(params.status).trim()) {
    query.set("status", String(params.status).trim());
  }
  if (typeof params.is_blocked === "boolean") {
    query.set("is_blocked", String(params.is_blocked));
  }
  if (typeof params.is_available === "boolean") {
    query.set("is_available", String(params.is_available));
  }

  const qs = query.toString();
  return request(`/staff${qs ? `?${qs}` : ""}`, { method: "GET" });
};

/**
 * Fetch all staff directory members by paginating across offsets.
 * @param {Object} [params]
 * @returns {Promise<Array<Object>>}
 */
export const getAllStaff = async (params = {}) => {
  const pageSize = 100;
  let offset = 0;
  let allItems = [];
  let hasMore = true;

  while (hasMore) {
    const pageRes = await listStaff({ ...params, limit: pageSize, offset });
    const items = pageRes?.items || [];
    allItems = allItems.concat(items);

    if (pageRes?.has_more === false || items.length === 0) {
      hasMore = false;
    } else if (pageRes?.has_more === true) {
      offset += pageSize;
    } else if (items.length < pageSize) {
      hasMore = false;
    } else {
      offset += pageSize;
    }
  }

  return allItems;
};

/**
 * List out-of-zone staff members for live monitoring.
 * @returns {Promise<{items: Array<Object>, count: number}>}
 */
export const getOutOfZoneStaff = async () => {
  return request("/staff/out-of-zone", { method: "GET" });
};

// ===========================================================================
// 2. Staff Profiles & Detail Lookups
// ===========================================================================

/**
 * Get detailed staff profile by UUID (masked banking & Aadhaar numbers).
 * @param {string} staffId - Staff UUID
 * @returns {Promise<Object>} StaffDetailResponse
 */
export const getStaffDetail = async (staffId) => {
  const validId = validateStaffUuid(staffId);
  return request(`/staff/${validId}`, { method: "GET" });
};

/**
 * Get detailed staff profile by registered email address.
 * Used by cancellation alert popups and staff modals.
 * @param {string} email - Registered staff email
 * @returns {Promise<Object>} StaffDetailResponse
 */
export const getStaffByEmail = async (email) => {
  const validEmail = validateStaffEmail(email);
  return request(`/staff/by-email/${encodeURIComponent(validEmail)}`, { method: "GET" });
};

// ===========================================================================
// 3. Availability & Scheduling Endpoints
// ===========================================================================

/**
 * List monthly calendar availability records for all staff for a given calendar month.
 * @param {string} month - Format 'YYYY-MM'
 * @returns {Promise<{month: string, total_records: number, data: Array<Object>}>}
 */
export const getStaffMonthlyAvailability = async (month) => {
  const validMonth = validateCalendarMonth(month);
  return request(`/staff/availability?month=${encodeURIComponent(validMonth)}`, { method: "GET" });
};

/**
 * Get monthly calendar availability for a single staff member.
 * @param {string} staffId - Staff UUID
 * @param {string} month - Format 'YYYY-MM'
 * @returns {Promise<Object>} StaffAvailabilityResponse
 */
export const getStaffAvailability = async (staffId, month) => {
  const validId = validateStaffUuid(staffId);
  const validMonth = validateCalendarMonth(month);
  return request(`/staff/${validId}/availability?month=${encodeURIComponent(validMonth)}`, {
    method: "GET",
  });
};

// ===========================================================================
// 4. Duty Logs & Historical Earnings
// ===========================================================================

/**
 * Get parsed duty logs, metrics, and raw sessions for a staff member.
 * @param {string} staffId - Staff UUID
 * @returns {Promise<Object>} StaffDutyLogsResponse
 */
export const getStaffDutyLogs = async (staffId) => {
  const validId = validateStaffUuid(staffId);
  return request(`/staff/${validId}/duty-logs`, { method: "GET" });
};

/**
 * Get paginated historical earnings ledger items for a staff member.
 * @param {string} staffId - Staff UUID
 * @param {Object} [params]
 * @param {number} [params.limit=50] - Page size (1-100)
 * @param {number} [params.offset=0] - Offset
 * @returns {Promise<{items: Array<Object>, total: number, limit: number, offset: number, has_more: boolean}>}
 */
export const getStaffEarnings = async (staffId, params = {}) => {
  const validId = validateStaffUuid(staffId);
  const query = new URLSearchParams();
  if (params.limit !== undefined && params.limit !== null) {
    query.set("limit", String(params.limit));
  }
  if (params.offset !== undefined && params.offset !== null) {
    query.set("offset", String(params.offset));
  }
  const qs = query.toString();
  return request(`/staff/${validId}/earnings${qs ? `?${qs}` : ""}`, { method: "GET" });
};

/**
 * Fetch all earnings records for a staff member across all pagination offsets.
 * @param {string} staffId - Staff UUID
 * @returns {Promise<Array<Object>>}
 */
export const getAllStaffEarnings = async (staffId) => {
  const validId = validateStaffUuid(staffId);
  const pageSize = 100;
  let offset = 0;
  let allItems = [];
  let hasMore = true;

  while (hasMore) {
    const pageRes = await getStaffEarnings(validId, { limit: pageSize, offset });
    const items = pageRes?.items || [];
    allItems = allItems.concat(items);

    if (pageRes?.has_more === false || items.length === 0) {
      hasMore = false;
    } else if (pageRes?.has_more === true) {
      offset += pageSize;
    } else if (items.length < pageSize) {
      hasMore = false;
    } else {
      offset += pageSize;
    }
  }

  return allItems;
};

// ===========================================================================
// 5. Status Mutations & Profile Updates
// ===========================================================================

/**
 * Toggle operational assignment block status for a staff member.
 * @param {string} staffId - Staff UUID
 * @param {boolean} isBlocked - New is_blocked value
 * @returns {Promise<{id: string, is_blocked: boolean}>}
 */
export const updateStaffBlockStatus = async (staffId, isBlocked) => {
  const validId = validateStaffUuid(staffId);
  return request(`/staff/${validId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ is_blocked: Boolean(isBlocked) }),
  });
};

/**
 * Update editable staff profile, banking, and KYC fields.
 * Safely omits masked bank/Aadhaar placeholders to avoid 422 rejections.
 * @param {string} staffId - Staff UUID
 * @param {Object} payload - Profile fields
 * @returns {Promise<Object>} Refreshed StaffDetailResponse
 */
export const updateStaffProfile = async (staffId, payload = {}) => {
  const validId = validateStaffUuid(staffId);

  const cleanPayload = {};

  if (payload.name !== undefined && payload.name !== null && String(payload.name).trim()) {
    cleanPayload.name = String(payload.name).trim();
  }

  // Account holder name / BNF_NAME
  const bnfName = payload.BNF_NAME ?? payload.account_holder_name;
  if (bnfName !== undefined && bnfName !== null && String(bnfName).trim()) {
    cleanPayload.BNF_NAME = String(bnfName).trim();
  }

  // Bank account number: omit if masked (contains X or *) or blank
  const accNo = payload.BENE_ACC_NO ?? payload.account_number;
  if (accNo !== undefined && accNo !== null) {
    const accStr = String(accNo).trim();
    if (accStr && !/[Xx*]/.test(accStr)) {
      cleanPayload.BENE_ACC_NO = accStr;
    }
  }

  // IFSC code
  const ifsc = payload.BENE_IFSC ?? payload.ifsc_code;
  if (ifsc !== undefined && ifsc !== null && String(ifsc).trim()) {
    cleanPayload.BENE_IFSC = String(ifsc).trim().toUpperCase();
  }

  // Bank name
  if (payload.bank_name !== undefined && payload.bank_name !== null && String(payload.bank_name).trim()) {
    cleanPayload.bank_name = String(payload.bank_name).trim();
  }

  // Aadhaar number: omit if masked (contains X or *) or blank
  if (payload.aadhar_number !== undefined && payload.aadhar_number !== null) {
    const aadharStr = String(payload.aadhar_number).replace(/[\s-]/g, "").trim();
    if (aadharStr && !/[Xx*]/.test(aadharStr)) {
      cleanPayload.aadhar_number = aadharStr;
    }
  }

  // Tagged partner
  if (payload.tagged_partner !== undefined && payload.tagged_partner !== null && String(payload.tagged_partner).trim()) {
    cleanPayload.tagged_partner = String(payload.tagged_partner).trim();
  }

  if (Object.keys(cleanPayload).length === 0) {
    throw new Error("No editable fields provided for staff profile update.");
  }

  return request(`/staff/${validId}`, {
    method: "PATCH",
    body: JSON.stringify(cleanPayload),
  });
};

// ===========================================================================
// 6. Deactivation & Offboarding (Guarded Non-Destructive Mutations)
// ===========================================================================

/**
 * Softly deactivate a staff member.
 * Protected by backend fail-closed LIVE_DEACTIVATION_PERMITTED guard and active booking checks.
 * @param {string} staffId - Staff UUID
 * @param {string} [reason] - Optional administrative reason
 * @returns {Promise<Object>} StaffDeactivateResponse
 */
export const deactivateStaff = async (staffId, reason = null) => {
  const validId = validateStaffUuid(staffId);
  const body = reason && String(reason).trim() ? JSON.stringify({ reason: String(reason).trim() }) : undefined;
  return request(`/staff/${validId}/deactivate`, {
    method: "PATCH",
    body,
  });
};

/**
 * DELETE alias for staff offboarding/deactivation.
 * Protected by backend fail-closed LIVE_DEACTIVATION_PERMITTED guard and active booking checks.
 * @param {string} staffId - Staff UUID
 * @returns {Promise<Object>} StaffDeactivateResponse
 */
export const deleteStaff = async (staffId) => {
  const validId = validateStaffUuid(staffId);
  return request(`/staff/${validId}`, {
    method: "DELETE",
  });
};

// ===========================================================================
// 7. Avatar Uploads & Onboarding
// ===========================================================================

/**
 * Upload or replace a staff member's avatar image via backend Storage orchestrator.
 * Strips EXIF metadata, validates magic bytes, and atomically updates staff_profile.avatar_url.
 * @param {string} staffId - Staff UUID
 * @param {File|Blob} file - Avatar image file (JPEG, PNG, WebP up to 5 MB)
 * @returns {Promise<{id: string, avatar_url: string}>}
 */
export const uploadStaffAvatar = async (staffId, file) => {
  const validId = validateStaffUuid(staffId);
  if (!file) {
    throw new Error("Avatar image file is required.");
  }

  const formData = new FormData();
  formData.append("file", file);

  return request(`/staff/${validId}/avatar`, {
    method: "POST",
    body: formData,
  });
};

/**
 * Onboard a new staff member into Neatify.
 * Provisions Supabase Auth user and creates staff_profile.
 * Protected by backend fail-closed LIVE_ONBOARDING_PERMITTED guard.
 * @param {Object} payload - Staff creation fields
 * @returns {Promise<Object>} StaffDetailResponse
 */
export const onboardStaff = async (payload) => {
  if (!payload || !payload.name || !payload.phone) {
    throw new Error("Staff name and phone are required for onboarding.");
  }
  return request("/staff", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

const staffApi = {
  validateStaffUuid,
  validateCalendarMonth,
  validateStaffEmail,
  listStaff,
  getAllStaff,
  getOutOfZoneStaff,
  getStaffDetail,
  getStaffByEmail,
  getStaffMonthlyAvailability,
  getStaffAvailability,
  getStaffDutyLogs,
  getStaffEarnings,
  getAllStaffEarnings,
  updateStaffBlockStatus,
  updateStaffProfile,
  deactivateStaff,
  deleteStaff,
  uploadStaffAvatar,
  onboardStaff,
};

export default staffApi;
