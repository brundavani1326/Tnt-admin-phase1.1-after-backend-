import { request } from "./apiClient";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate that a booking ID is a valid 36-character UUID string.
 * @param {string} bookingId
 * @returns {string} Clean trimmed UUID string
 */
export const validateBookingUuid = (bookingId) => {
  if (!bookingId || typeof bookingId !== "string" || !UUID_REGEX.test(bookingId.trim())) {
    throw new Error(`Invalid booking_id format: '${bookingId}'. Must be a valid 36-character UUID string.`);
  }
  return bookingId.trim().toLowerCase();
};

/**
 * Validate that a staff ID is a valid 36-character UUID string.
 * @param {string} staffId
 * @returns {string} Clean trimmed UUID string
 */
export const validateStaffUuid = (staffId) => {
  if (!staffId || typeof staffId !== "string" || !UUID_REGEX.test(staffId.trim())) {
    throw new Error(`Invalid staff_id format: '${staffId}'. Must be a valid 36-character UUID string.`);
  }
  return staffId.trim().toLowerCase();
};

/**
 * Fetch bookings list with optional filtering and pagination.
 *
 * Query parameters supported by backend:
 * - tab: status subtab (unassigned, assigned, payment_failed, under_review, completed, rescheduled, cancelled, refund_management, customer_checklist)
 * - search: search term across customer_name, phone, booking_id, address
 * - hub_id: hub location filter
 * - date: exact booking date (YYYY-MM-DD)
 * - date_from: date range start (YYYY-MM-DD)
 * - date_to: date range end (YYYY-MM-DD)
 * - page: 1-based page number
 * - page_size: page size limit (1 to 1000)
 */
export const getBookings = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.tab) query.append("tab", params.tab);
  if (params.search) query.append("search", params.search);
  if (params.hub_id) query.append("hub_id", params.hub_id);
  if (params.date) query.append("date", params.date);
  if (params.date_from) query.append("date_from", params.date_from);
  if (params.date_to) query.append("date_to", params.date_to);
  if (params.page !== undefined && params.page !== null) query.append("page", String(params.page));
  if (params.page_size !== undefined && params.page_size !== null) query.append("page_size", String(params.page_size));

  const qs = query.toString();
  return request(`/bookings${qs ? `?${qs}` : ""}`, { method: "GET" });
};

/**
 * Fetch complete booking details by ID (with payments, reviews, checklist, uploads, staff profile).
 */
export const getBookingDetail = async (bookingId) => {
  const validId = validateBookingUuid(bookingId);
  return request(`/bookings/${encodeURIComponent(validId)}`, { method: "GET" });
};

/**
 * Evaluate and retrieve eligible candidate staff members for a specific booking allotment.
 * Evaluates operational active status, assignment blocks, deactivation, calendar availability,
 * and booking payment status.
 *
 * @param {string} bookingId - Booking UUID
 * @returns {Promise<{
 *   booking_id: string,
 *   booking_date?: string,
 *   booking_time?: string,
 *   hub_name?: string,
 *   current_assigned_staff_email?: string,
 *   payment_status?: string,
 *   is_payment_eligible: boolean,
 *   work_status?: string,
 *   total_staff: number,
 *   eligible_count: number,
 *   staff: Array<{
 *     staff_id: string,
 *     name: string,
 *     email?: string,
 *     phone: string,
 *     avatar_url?: string,
 *     role: string,
 *     is_active: boolean,
 *     is_blocked: boolean,
 *     is_out_of_zone: boolean,
 *     status?: string,
 *     assigned_count: number,
 *     calendar_status: string,
 *     is_eligible: boolean,
 *     ineligibility_reasons: Array<string>
 *   }>
 * }>}
 */
export const getEligibleStaffForBooking = async (bookingId) => {
  const validId = validateBookingUuid(bookingId);
  return request(`/bookings/${encodeURIComponent(validId)}/eligible-staff`, { method: "GET" });
};

/**
 * Simulate dry-run assignment or reassignment eligibility check without mutating database records.
 *
 * @param {string} bookingId - Booking UUID
 * @param {Object} payload
 * @param {string} payload.staff_id - Staff UUID
 * @param {boolean} [payload.is_reassignment=false] - Whether this is a reassignment dry-run
 * @returns {Promise<{
 *   can_assign: boolean,
 *   is_reassignment: boolean,
 *   booking_id: string,
 *   booking_date?: string,
 *   staff_id: string,
 *   staff_name: string,
 *   staff_email?: string,
 *   current_assigned_staff_email?: string,
 *   reasons: Array<string>,
 *   guarded: boolean,
 *   message: string
 * }>}
 */
export const previewBookingAssignment = async (bookingId, payload = {}) => {
  const validBookingId = validateBookingUuid(bookingId);
  if (!payload || typeof payload !== "object") {
    throw new Error("Payload object is required for assignment preview.");
  }
  const validStaffId = validateStaffUuid(payload.staff_id);

  const requestBody = {
    staff_id: validStaffId,
    is_reassignment: Boolean(payload.is_reassignment),
  };

  return request(`/bookings/${encodeURIComponent(validBookingId)}/preview-assignment`, {
    method: "POST",
    body: requestBody,
  });
};

/**
 * Assign an eligible staff partner to an unassigned booking.
 * Enforces admin authorization, payment eligibility checks, terminal states,
 * and fail-closed live assignment concurrency guards.
 *
 * @param {string} bookingId - Booking UUID
 * @param {Object} payload
 * @param {string} payload.staff_id - Staff UUID
 * @returns {Promise<{
 *   status: string,
 *   message: string,
 *   booking_id: string,
 *   assigned_staff_id: string,
 *   assigned_staff_email: string,
 *   assigned_staff_name: string,
 *   work_status: string,
 *   staff_response: string,
 *   assigned_at: string,
 *   otp_generated: boolean
 * }>}
 */
export const assignStaffToBooking = async (bookingId, payload = {}) => {
  const validBookingId = validateBookingUuid(bookingId);
  if (!payload || typeof payload !== "object") {
    throw new Error("Payload object is required for staff assignment.");
  }
  const validStaffId = validateStaffUuid(payload.staff_id);

  const requestBody = {
    staff_id: validStaffId,
  };

  return request(`/bookings/${encodeURIComponent(validBookingId)}/assign`, {
    method: "POST",
    body: requestBody,
  });
};

/**
 * Reassign an already-assigned or cancelled partner's booking to a replacement staff member.
 * Enforces admin authorization, optimistic concurrency check, partner distinction,
 * and fail-closed live assignment concurrency guards.
 *
 * @param {string} bookingId - Booking UUID
 * @param {Object} payload
 * @param {string} payload.staff_id - Replacement Staff UUID
 * @param {string} [payload.reason] - Administrative reason for reassignment (max 500 chars)
 * @param {string} [payload.previous_staff_email] - Email of previously assigned staff for concurrency check
 * @returns {Promise<{
 *   status: string,
 *   message: string,
 *   booking_id: string,
 *   assigned_staff_id: string,
 *   assigned_staff_email: string,
 *   assigned_staff_name: string,
 *   previous_staff_email?: string,
 *   work_status: string,
 *   staff_response: string,
 *   assigned_at: string,
 *   reassignment_reason?: string,
 *   otp_generated: boolean
 * }>}
 */
export const reassignStaffToBooking = async (bookingId, payload = {}) => {
  const validBookingId = validateBookingUuid(bookingId);
  if (!payload || typeof payload !== "object") {
    throw new Error("Payload object is required for staff reassignment.");
  }
  const validStaffId = validateStaffUuid(payload.staff_id);

  const requestBody = {
    staff_id: validStaffId,
  };

  if (payload.reason !== undefined && payload.reason !== null) {
    const cleanedReason = String(payload.reason).trim();
    if (cleanedReason) {
      if (cleanedReason.length > 500) {
        throw new Error("Reassignment reason cannot exceed 500 characters.");
      }
      requestBody.reason = cleanedReason;
    }
  }

  if (payload.previous_staff_email !== undefined && payload.previous_staff_email !== null) {
    const cleanedEmail = String(payload.previous_staff_email).trim();
    if (cleanedEmail) {
      requestBody.previous_staff_email = cleanedEmail;
    }
  }

  return request(`/bookings/${encodeURIComponent(validBookingId)}/reassign`, {
    method: "POST",
    body: requestBody,
  });
};

/**
 * Check booking cancellation eligibility.
 * Evaluates whether booking can be cancelled, reporting terminal status,
 * active refund checks, and calculated cancellation charge/refund recommendations.
 *
 * @param {string} bookingId - Booking UUID
 * @returns {Promise<{
 *   booking_id: string,
 *   can_cancel: boolean,
 *   current_work_status: string,
 *   payment_status?: string,
 *   refund_status?: string,
 *   assigned_staff_email?: string,
 *   assigned_staff_name?: string,
 *   booking_date?: string,
 *   booking_time?: string,
 *   hours_until_service?: number,
 *   is_full_refund_eligible: boolean,
 *   estimated_cancellation_fee: number,
 *   recommended_refund_amount: number,
 *   reasons: Array<string>
 * }>}
 */
export const getBookingCancellationEligibility = async (bookingId) => {
  const validId = validateBookingUuid(bookingId);
  return request(`/bookings/${encodeURIComponent(validId)}/cancellation-eligibility`, {
    method: "GET",
  });
};

/**
 * Preview booking cancellation impact (dry-run simulation).
 * Reports prospective work status transitions, fee deductions, recommended refund amounts,
 * and required downstream notifications without modifying database records.
 *
 * @param {string} bookingId - Booking UUID
 * @param {Object} [payload]
 * @param {string} [payload.reason] - Prospective cancellation reason (max 500 chars)
 * @param {number} [payload.cancellation_fee] - Custom cancellation fee override (>= 0)
 * @returns {Promise<{
 *   booking_id: string,
 *   can_cancel: boolean,
 *   current_work_status: string,
 *   target_work_status: string,
 *   payment_status?: string,
 *   total_amount: number,
 *   assigned_staff_email?: string,
 *   assigned_staff_name?: string,
 *   booking_date?: string,
 *   booking_time?: string,
 *   hours_until_service?: number,
 *   is_full_refund_eligible: boolean,
 *   estimated_cancellation_fee: number,
 *   recommended_refund_amount: number,
 *   cancellation_reason_required: boolean,
 *   required_notifications: Array<string>,
 *   reasons: Array<string>
 * }>}
 */
export const previewBookingCancellation = async (bookingId, payload = {}) => {
  const validId = validateBookingUuid(bookingId);
  const body = {};

  if (payload && typeof payload === "object") {
    if (payload.reason !== undefined && payload.reason !== null) {
      const cleanedReason = String(payload.reason).trim();
      if (cleanedReason.length > 500) {
        throw new Error("Cancellation reason cannot exceed 500 characters.");
      }
      body.reason = cleanedReason;
    }

    if (payload.cancellation_fee !== undefined && payload.cancellation_fee !== null) {
      const parsedFee = Number(payload.cancellation_fee);
      if (isNaN(parsedFee) || parsedFee < 0) {
        throw new Error("Cancellation fee must be a non-negative number.");
      }
      body.cancellation_fee = parsedFee;
    }
  }

  return request(`/bookings/${encodeURIComponent(validId)}/preview-cancellation`, {
    method: "POST",
    body,
  });
};

/**
 * Execute booking cancellation under strict fail-closed safety guards.
 * Updates work_status to CANCELLED and records cancel reason.
 * Preserves assigned staff and payment records without row deletions.
 *
 * @param {string} bookingId - Booking UUID
 * @param {Object} [payload]
 * @param {string} [payload.reason="Cancelled by Admin"] - Administrative cancellation reason (max 500 chars)
 * @param {number} [payload.cancellation_fee] - Recorded cancellation fee if any (>= 0)
 * @returns {Promise<{
 *   success: boolean,
 *   message: string,
 *   booking_id: string,
 *   work_status: string,
 *   cancel_time: string,
 *   cancel_reason: string,
 *   cancellation_fee?: number,
 *   assigned_staff_email?: string,
 *   assigned_staff_name?: string,
 *   refund_status?: string,
 *   notifications_dispatched: boolean
 * }>}
 */
export const cancelBooking = async (bookingId, payload = {}) => {
  const validId = validateBookingUuid(bookingId);
  const body = {};

  if (payload && typeof payload === "object") {
    if (payload.reason !== undefined && payload.reason !== null) {
      const cleanedReason = String(payload.reason).trim();
      if (cleanedReason.length > 500) {
        throw new Error("Cancellation reason cannot exceed 500 characters.");
      }
      body.reason = cleanedReason || "Cancelled by Admin";
    } else {
      body.reason = "Cancelled by Admin";
    }

    if (payload.cancellation_fee !== undefined && payload.cancellation_fee !== null) {
      const parsedFee = Number(payload.cancellation_fee);
      if (isNaN(parsedFee) || parsedFee < 0) {
        throw new Error("Cancellation fee must be a non-negative number.");
      }
      body.cancellation_fee = parsedFee;
    }
  } else {
    body.reason = "Cancelled by Admin";
  }

  return request(`/bookings/${encodeURIComponent(validId)}/cancel`, {
    method: "POST",
    body,
  });
};

/**
 * Validates that a schedule date is in YYYY-MM-DD format
 * and is not in the past relative to IST (UTC+05:30).
 *
 * @param {string} dateStr - Target date string
 * @returns {string} Sanitized date string (YYYY-MM-DD)
 */
export const validateScheduleDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== "string" || !dateStr.trim()) {
    throw new Error("Schedule date is required and cannot be empty.");
  }
  const cleaned = dateStr.trim().split("T")[0];
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(cleaned);
  if (!dateMatch) {
    throw new Error(`Invalid date format '${dateStr}'. Expected format is YYYY-MM-DD.`);
  }
  const year = parseInt(dateMatch[1], 10);
  const month = parseInt(dateMatch[2], 10) - 1;
  const day = parseInt(dateMatch[3], 10);
  const parsedDate = new Date(year, month, day);
  if (parsedDate.getFullYear() !== year || parsedDate.getMonth() !== month || parsedDate.getDate() !== day) {
    throw new Error(`Invalid calendar date '${dateStr}'.`);
  }

  // Compare against IST current date (UTC+05:30)
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istNow = new Date(utc + (3600000 * 5.5));
  const todayIstStr = istNow.toISOString().split("T")[0];
  if (cleaned < todayIstStr) {
    throw new Error(`Cannot reschedule to a past date ('${dateStr}'). Target date must be today or in the future.`);
  }
  return cleaned;
};

/**
 * Validates schedule time format (e.g. '10:00 am', '02:30 pm', '11:00 AM').
 *
 * @param {string} timeStr - Target time string
 * @returns {string} Sanitized time string
 */
export const validateScheduleTime = (timeStr) => {
  if (!timeStr || typeof timeStr !== "string" || !timeStr.trim()) {
    throw new Error("Schedule time is required and cannot be empty.");
  }
  const cleaned = timeStr.trim();
  const match = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i.exec(cleaned);
  if (!match) {
    throw new Error(`Invalid time format '${timeStr}'. Expected format like '10:00 am' or '02:30 pm'.`);
  }
  const hours = parseInt(match[1], 10);
  const period = match[3];
  if (period && (hours < 1 || hours > 12)) {
    throw new Error(`Invalid hour '${hours}' for 12-hour format with AM/PM.`);
  }
  return cleaned;
};

/**
 * Pre-flight read-only assessment determining whether a booking can be rescheduled.
 * Checks terminal states (COMPLETED, CANCELLED), active refunds, payment status,
 * and current schedule details.
 *
 * @param {string} bookingId - Booking UUID
 * @returns {Promise<{
 *   booking_id: string,
 *   can_reschedule: boolean,
 *   current_work_status: string,
 *   payment_status?: string,
 *   refund_status?: string,
 *   current_booking_date?: string,
 *   current_booking_time?: string,
 *   original_date?: string,
 *   original_time?: string,
 *   assigned_staff_email?: string,
 *   assigned_staff_name?: string,
 *   reschedule_reason?: string,
 *   reasons: Array<string>
 * }>}
 */
export const getBookingReschedulingEligibility = async (bookingId) => {
  const validId = validateBookingUuid(bookingId);
  return request(`/bookings/${encodeURIComponent(validId)}/rescheduling-eligibility`, {
    method: "GET",
  });
};

/**
 * Non-destructive dry-run simulation of rescheduling to a target date and time slot.
 * Evaluates assigned partner calendar availability without modifying database state.
 *
 * @param {string} bookingId - Booking UUID
 * @param {Object} payload
 * @param {string} payload.new_date - Target date in YYYY-MM-DD format (today or future in IST)
 * @param {string} payload.new_time - Target time slot (e.g. '10:00 am')
 * @param {string} [payload.reason] - Prospective reschedule reason (max 500 chars)
 * @returns {Promise<{
 *   booking_id: string,
 *   can_reschedule: boolean,
 *   current_booking_date?: string,
 *   current_booking_time?: string,
 *   new_booking_date: string,
 *   new_booking_time: string,
 *   current_work_status: string,
 *   target_work_status: string,
 *   assigned_staff_email?: string,
 *   assigned_staff_name?: string,
 *   assigned_staff_available?: boolean,
 *   required_notifications: Array<string>,
 *   reasons: Array<string>
 * }>}
 */
export const previewBookingReschedule = async (bookingId, payload = {}) => {
  const validId = validateBookingUuid(bookingId);

  if (!payload || typeof payload !== "object") {
    throw new Error("Reschedule preview payload must be a non-null object.");
  }

  const validDate = validateScheduleDate(payload.new_date);
  const validTime = validateScheduleTime(payload.new_time);

  const body = {
    new_date: validDate,
    new_time: validTime,
  };

  if (payload.reason !== undefined && payload.reason !== null) {
    const cleanedReason = String(payload.reason).trim();
    if (cleanedReason.length > 500) {
      throw new Error("Reschedule reason cannot exceed 500 characters.");
    }
    if (cleanedReason) {
      body.reason = cleanedReason;
    }
  }

  return request(`/bookings/${encodeURIComponent(validId)}/preview-reschedule`, {
    method: "POST",
    body,
  });
};

/**
 * Guarded rescheduling endpoint updating booking_date, booking_time, reschedule_reason,
 * and work_status to RESCHEDULED. Preserves true original schedule and assigned partner.
 * Note: Under fail-closed production safety guards, the backend returns HTTP 503
 * if live mutation is disabled.
 *
 * @param {string} bookingId - Booking UUID
 * @param {Object} payload
 * @param {string} payload.new_date - New date in YYYY-MM-DD format (today or future in IST)
 * @param {string} payload.new_time - New time slot (e.g. '10:00 am')
 * @param {string} [payload.reason="Rescheduled by Admin"] - Administrative or customer reason (max 500 chars)
 * @param {string} [payload.otp] - Customer verification OTP if provided
 * @returns {Promise<{
 *   success: boolean,
 *   message: string,
 *   booking_id: string,
 *   work_status: string,
 *   booking_date: string,
 *   booking_time: string,
 *   original_date?: string,
 *   original_time?: string,
 *   reschedule_reason: string,
 *   assigned_staff_email?: string,
 *   assigned_staff_name?: string,
 *   notifications_dispatched: boolean
 * }>}
 */
export const rescheduleBooking = async (bookingId, payload = {}) => {
  const validId = validateBookingUuid(bookingId);

  if (!payload || typeof payload !== "object") {
    throw new Error("Reschedule payload must be a non-null object.");
  }

  const validDate = validateScheduleDate(payload.new_date);
  const validTime = validateScheduleTime(payload.new_time);

  let cleanedReason = "Rescheduled by Admin";
  if (payload.reason !== undefined && payload.reason !== null) {
    const trimmed = String(payload.reason).trim();
    if (trimmed.length > 500) {
      throw new Error("Reschedule reason cannot exceed 500 characters.");
    }
    cleanedReason = trimmed || "Rescheduled by Admin";
  }

  const body = {
    new_date: validDate,
    new_time: validTime,
    reason: cleanedReason,
  };

  if (payload.otp !== undefined && payload.otp !== null && String(payload.otp).trim()) {
    body.otp = String(payload.otp).trim();
  }

  return request(`/bookings/${encodeURIComponent(validId)}/reschedule`, {
    method: "POST",
    body,
  });
};

/**
 * Pre-flight read-only assessment determining whether a booking can be refunded.
 * Reconciles captured payment amount, refundable balance, cancellation fee, and 6-hour policy.
 *
 * @param {string} bookingId - Booking UUID
 * @returns {Promise<{
 *   booking_id: string,
 *   can_refund: boolean,
 *   current_work_status: string,
 *   payment_status?: string,
 *   refund_status?: string,
 *   has_razorpay_payment_id: boolean,
 *   razorpay_payment_id?: string,
 *   rayzorpay_refund_id?: string,
 *   total_amount: number,
 *   paid_amount: number,
 *   refundable_balance: number,
 *   recommended_refund_amount: number,
 *   estimated_cancellation_fee: number,
 *   hours_until_service?: number,
 *   is_full_refund_eligible: boolean,
 *   customer_name?: string,
 *   customer_phone?: string,
 *   cancel_time?: string,
 *   reasons: Array<string>
 * }>}
 */
export const getBookingRefundEligibility = async (bookingId) => {
  const validId = validateBookingUuid(bookingId);
  return request(`/bookings/${encodeURIComponent(validId)}/refund-eligibility`, {
    method: "GET",
  });
};

/**
 * Dry-run simulation of refund calculation. Verifies proposed refund amount against
 * captured funds and refundable balance without performing database writes or gateway calls.
 *
 * @param {string} bookingId - Booking UUID
 * @param {Object} [payload]
 * @param {number} [payload.proposed_amount] - Prospective refund amount in INR (>= 0)
 * @param {number} [payload.override_cancellation_fee] - Prospective cancellation fee override (>= 0)
 * @param {string} [payload.refund_note] - Prospective administrative refund note (max 500 chars)
 * @returns {Promise<{
 *   booking_id: string,
 *   can_refund: boolean,
 *   total_amount: number,
 *   captured_amount: number,
 *   cancellation_fee: number,
 *   refundable_balance: number,
 *   recommended_refund_amount: number,
 *   proposed_refund_amount: number,
 *   is_full_refund_eligible: boolean,
 *   hours_until_service?: number,
 *   default_note: string,
 *   target_refund_status: string,
 *   has_razorpay_payment_id: boolean,
 *   razorpay_payment_id?: string,
 *   reasons: Array<string>
 * }>}
 */
export const previewBookingRefund = async (bookingId, payload = {}) => {
  const validId = validateBookingUuid(bookingId);

  if (!payload || typeof payload !== "object") {
    throw new Error("Refund preview payload must be a non-null object.");
  }

  const body = {};

  if (payload.proposed_amount !== undefined && payload.proposed_amount !== null) {
    const parsedProposed = Number(payload.proposed_amount);
    if (isNaN(parsedProposed) || parsedProposed < 0) {
      throw new Error("Proposed refund amount must be a non-negative number.");
    }
    body.proposed_amount = parsedProposed;
  }

  if (payload.override_cancellation_fee !== undefined && payload.override_cancellation_fee !== null) {
    const parsedFee = Number(payload.override_cancellation_fee);
    if (isNaN(parsedFee) || parsedFee < 0) {
      throw new Error("Override cancellation fee must be a non-negative number.");
    }
    body.override_cancellation_fee = parsedFee;
  }

  if (payload.refund_note !== undefined && payload.refund_note !== null) {
    const cleanedNote = String(payload.refund_note).trim();
    if (cleanedNote.length > 500) {
      throw new Error("Refund note cannot exceed 500 characters.");
    }
    if (cleanedNote) {
      body.refund_note = cleanedNote;
    }
  }

  return request(`/bookings/${encodeURIComponent(validId)}/preview-refund`, {
    method: "POST",
    body,
  });
};

/**
 * Guarded refund endpoint. Supports initiating a refund (marking REFUND_PENDING)
 * or confirming/completing a refund (marking REFUNDED). Live gateway execution and database
 * mutations are guarded when LIVE_REFUNDS_PERMITTED is False on the backend.
 *
 * @param {string} bookingId - Booking UUID
 * @param {Object} [payload]
 * @param {string} [payload.action="initiate"] - 'initiate' | 'confirm' | 'auto' | 'complete'
 * @param {number} [payload.amount] - Explicit refund amount in INR (>= 0.01)
 * @param {string} [payload.note] - Administrative refund note (max 500 chars)
 * @param {string} [payload.rayzorpay_refund_id] - External Razorpay refund ID (max 128 chars)
 * @returns {Promise<{
 *   success: boolean,
 *   message: string,
 *   booking_id: string,
 *   action_taken: string,
 *   refund_status: string,
 *   refund_amount: number,
 *   refund_note?: string,
 *   refund_time?: string,
 *   rayzorpay_refund_id?: string,
 *   guard_blocked: boolean
 * }>}
 */
export const refundBooking = async (bookingId, payload = {}) => {
  const validId = validateBookingUuid(bookingId);

  if (!payload || typeof payload !== "object") {
    throw new Error("Refund payload must be a non-null object.");
  }

  const action = (payload.action && String(payload.action).trim().toLowerCase()) || "initiate";
  const allowedActions = ["initiate", "confirm", "auto", "complete"];
  if (!allowedActions.includes(action)) {
    throw new Error(`Invalid refund action '${payload.action}'. Must be one of: ${allowedActions.join(", ")}`);
  }

  const body = {
    action,
  };

  if (payload.amount !== undefined && payload.amount !== null) {
    const parsedAmount = Number(payload.amount);
    if (isNaN(parsedAmount) || parsedAmount < 0.01) {
      throw new Error("Refund amount must be a number greater than or equal to 0.01.");
    }
    body.amount = parsedAmount;
  }

  if (payload.note !== undefined && payload.note !== null) {
    const cleanedNote = String(payload.note).trim();
    if (cleanedNote.length > 500) {
      throw new Error("Refund note cannot exceed 500 characters.");
    }
    if (cleanedNote) {
      body.note = cleanedNote;
    }
  }

  if (payload.rayzorpay_refund_id !== undefined && payload.rayzorpay_refund_id !== null) {
    const cleanedGatewayId = String(payload.rayzorpay_refund_id).trim();
    if (cleanedGatewayId.length > 128) {
      throw new Error("Razorpay refund ID cannot exceed 128 characters.");
    }
    if (cleanedGatewayId) {
      body.rayzorpay_refund_id = cleanedGatewayId;
    }
  }

  return request(`/bookings/${encodeURIComponent(validId)}/refund`, {
    method: "POST",
    body,
  });
};

const bookingApi = {
  validateBookingUuid,
  validateStaffUuid,
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
};

export default bookingApi;
