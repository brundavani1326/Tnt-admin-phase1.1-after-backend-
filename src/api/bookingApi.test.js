import * as apiClientModule from "./apiClient";
import bookingApi, {
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
} from "./bookingApi";

describe("Booking Assignment, Cancellation & Management API Client Unit Tests (Phase 6 Step 15B)", () => {
  const validBookingId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
  const validStaffId = "11111111-2222-3333-4444-555555555555";
  const replacementStaffId = "99999999-8888-7777-6666-555555555555";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("UUID Validation & Safety Guards", () => {
    it("validateBookingUuid accepts valid 36-character UUID strings", () => {
      expect(validateBookingUuid(validBookingId)).toBe(validBookingId);
      expect(validateBookingUuid("  " + validBookingId.toUpperCase() + "  ")).toBe(validBookingId);
    });

    it("validateBookingUuid rejects invalid, empty, or non-string booking IDs", () => {
      expect(() => validateBookingUuid("")).toThrow("Must be a valid 36-character UUID string");
      expect(() => validateBookingUuid(null)).toThrow("Must be a valid 36-character UUID string");
      expect(() => validateBookingUuid(undefined)).toThrow("Must be a valid 36-character UUID string");
      expect(() => validateBookingUuid("not-a-valid-uuid")).toThrow("Must be a valid 36-character UUID string");
      expect(() => validateBookingUuid(12345)).toThrow("Must be a valid 36-character UUID string");
    });

    it("validateStaffUuid accepts valid 36-character UUID strings", () => {
      expect(validateStaffUuid(validStaffId)).toBe(validStaffId);
      expect(validateStaffUuid("  " + validStaffId.toUpperCase() + "  ")).toBe(validStaffId);
    });

    it("validateStaffUuid rejects invalid, empty, or non-string staff IDs", () => {
      expect(() => validateStaffUuid("")).toThrow("Must be a valid 36-character UUID string");
      expect(() => validateStaffUuid(null)).toThrow("Must be a valid 36-character UUID string");
      expect(() => validateStaffUuid("staff-123")).toThrow("Must be a valid 36-character UUID string");
    });
  });

  describe("Query & Detail Endpoints", () => {
    it("getBookings properly serializes query parameters", async () => {
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce({
        items: [],
        total: 0,
        page: 1,
        page_size: 50,
      });

      await getBookings({
        tab: "unassigned",
        search: "Ramesh",
        hub_id: "hub-koramangala",
        date: "2026-11-02",
        page: 2,
        page_size: 25,
      });

      expect(spy).toHaveBeenCalledWith(
        "/bookings?tab=unassigned&search=Ramesh&hub_id=hub-koramangala&date=2026-11-02&page=2&page_size=25",
        { method: "GET" }
      );
    });

    it("getBookingDetail calls GET /bookings/{booking_id} with validated UUID", async () => {
      const mockDetail = {
        id: validBookingId,
        customer_name: "Anita Sharma",
        payment_status: "paid",
        work_status: "PENDING",
      };
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockDetail);

      const result = await getBookingDetail(validBookingId);
      expect(spy).toHaveBeenCalledWith(`/bookings/${validBookingId}`, { method: "GET" });
      expect(result).toEqual(mockDetail);
    });

    it("getEligibleStaffForBooking calls GET /bookings/{booking_id}/eligible-staff", async () => {
      const mockEligibility = {
        booking_id: validBookingId,
        booking_date: "2026-11-05",
        hub_name: "Indiranagar Hub",
        is_payment_eligible: true,
        total_staff: 2,
        eligible_count: 1,
        staff: [
          {
            staff_id: validStaffId,
            name: "Rajesh Kumar",
            email: "rajesh@neatify.app",
            phone: "+919876543210",
            is_active: true,
            is_blocked: false,
            is_eligible: true,
            ineligibility_reasons: [],
          },
          {
            staff_id: replacementStaffId,
            name: "Suresh Rao",
            email: "suresh@neatify.app",
            phone: "+919876543211",
            is_active: false,
            is_blocked: false,
            is_eligible: false,
            ineligibility_reasons: ["Staff account is inactive"],
          },
        ],
      };

      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockEligibility);

      const result = await getEligibleStaffForBooking(validBookingId);
      expect(spy).toHaveBeenCalledWith(`/bookings/${validBookingId}/eligible-staff`, { method: "GET" });
      expect(result.eligible_count).toBe(1);
      expect(result.staff).toHaveLength(2);
      expect(result.staff[0].is_eligible).toBe(true);
      expect(result.staff[1].is_eligible).toBe(false);
    });
  });

  describe("Dry-run Assignment Preview Endpoint", () => {
    it("previewBookingAssignment calls POST /bookings/{id}/preview-assignment with valid payload", async () => {
      const mockPreviewResponse = {
        can_assign: true,
        is_reassignment: false,
        booking_id: validBookingId,
        staff_id: validStaffId,
        staff_name: "Rajesh Kumar",
        reasons: [],
        guarded: true,
        message: "Staff member 'Rajesh Kumar' is eligible for assignment.",
      };

      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockPreviewResponse);

      const result = await previewBookingAssignment(validBookingId, {
        staff_id: validStaffId,
        is_reassignment: false,
      });

      expect(spy).toHaveBeenCalledWith(`/bookings/${validBookingId}/preview-assignment`, {
        method: "POST",
        body: {
          staff_id: validStaffId,
          is_reassignment: false,
        },
      });
      expect(result.can_assign).toBe(true);
    });

    it("previewBookingAssignment handles simulated ineligibility gracefully", async () => {
      const mockPreviewResponse = {
        can_assign: false,
        is_reassignment: true,
        booking_id: validBookingId,
        staff_id: validStaffId,
        staff_name: "Rajesh Kumar",
        reasons: ["Staff member is marked Not Available on 2026-11-05"],
        guarded: true,
        message: "Staff member 'Rajesh Kumar' is ineligible for reassignment (1 reason(s)).",
      };

      jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockPreviewResponse);

      const result = await previewBookingAssignment(validBookingId, {
        staff_id: validStaffId,
        is_reassignment: true,
      });

      expect(result.can_assign).toBe(false);
      expect(result.reasons).toContain("Staff member is marked Not Available on 2026-11-05");
    });

    it("previewBookingAssignment validates parameters before issuing network request", async () => {
      const spy = jest.spyOn(apiClientModule, "request");

      await expect(previewBookingAssignment("invalid-id", { staff_id: validStaffId })).rejects.toThrow(
        "Must be a valid 36-character UUID string"
      );

      await expect(previewBookingAssignment(validBookingId, { staff_id: "not-a-uuid" })).rejects.toThrow(
        "Must be a valid 36-character UUID string"
      );

      await expect(previewBookingAssignment(validBookingId, null)).rejects.toThrow(
        "Payload object is required"
      );

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe("Staff Assignment Execution", () => {
    it("assignStaffToBooking calls POST /bookings/{id}/assign with staff_id", async () => {
      const mockAssignResponse = {
        status: "success",
        message: "Staff member successfully assigned to booking.",
        booking_id: validBookingId,
        assigned_staff_id: validStaffId,
        assigned_staff_email: "rajesh@neatify.app",
        assigned_staff_name: "Rajesh Kumar",
        work_status: "ASSIGNED",
        staff_response: "APPROVED",
        assigned_at: "2026-11-02T12:00:00Z",
        otp_generated: true,
      };

      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockAssignResponse);

      const result = await assignStaffToBooking(validBookingId, { staff_id: validStaffId });

      expect(spy).toHaveBeenCalledWith(`/bookings/${validBookingId}/assign`, {
        method: "POST",
        body: { staff_id: validStaffId },
      });
      expect(result.status).toBe("success");
      expect(result.work_status).toBe("ASSIGNED");
    });

    it("assignStaffToBooking surfaces HTTP 503 live concurrency guard without crashing", async () => {
      const guardError = new apiClientModule.ApiError(
        "Live booking assignment mutations are disabled until atomic database coordination with staff deactivation is approved and deployed.",
        503
      );

      jest.spyOn(apiClientModule, "request").mockRejectedValueOnce(guardError);

      await expect(assignStaffToBooking(validBookingId, { staff_id: validStaffId })).rejects.toThrow(
        "Live booking assignment mutations are disabled"
      );
    });

    it("assignStaffToBooking surfaces HTTP 409 conflict when booking is already assigned", async () => {
      const conflictError = new apiClientModule.ApiError(
        "Booking is already assigned to 'existing@neatify.app'. Reassignment is not supported by this endpoint; use the dedicated reassignment workflow.",
        409
      );

      jest.spyOn(apiClientModule, "request").mockRejectedValueOnce(conflictError);

      await expect(assignStaffToBooking(validBookingId, { staff_id: validStaffId })).rejects.toThrow(
        "Booking is already assigned"
      );
    });
  });

  describe("Staff Reassignment Execution", () => {
    it("reassignStaffToBooking calls POST /bookings/{id}/reassign with reason and concurrency email", async () => {
      const mockReassignResponse = {
        status: "success",
        message: "Staff member successfully reassigned to booking.",
        booking_id: validBookingId,
        assigned_staff_id: replacementStaffId,
        assigned_staff_email: "suresh@neatify.app",
        assigned_staff_name: "Suresh Rao",
        previous_staff_email: "rajesh@neatify.app",
        work_status: "ASSIGNED",
        staff_response: "APPROVED",
        assigned_at: "2026-11-02T12:15:00Z",
        reassignment_reason: "Partner unavailable due to emergency",
        otp_generated: true,
      };

      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockReassignResponse);

      const result = await reassignStaffToBooking(validBookingId, {
        staff_id: replacementStaffId,
        reason: "Partner unavailable due to emergency",
        previous_staff_email: "rajesh@neatify.app",
      });

      expect(spy).toHaveBeenCalledWith(`/bookings/${validBookingId}/reassign`, {
        method: "POST",
        body: {
          staff_id: replacementStaffId,
          reason: "Partner unavailable due to emergency",
          previous_staff_email: "rajesh@neatify.app",
        },
      });
      expect(result.status).toBe("success");
      expect(result.assigned_staff_email).toBe("suresh@neatify.app");
    });

    it("reassignStaffToBooking enforces reason length validation (<= 500 characters)", async () => {
      const longReason = "a".repeat(501);
      await expect(
        reassignStaffToBooking(validBookingId, {
          staff_id: replacementStaffId,
          reason: longReason,
        })
      ).rejects.toThrow("Reassignment reason cannot exceed 500 characters.");
    });

    it("reassignStaffToBooking handles concurrency mismatch 409 error", async () => {
      const mismatchError = new apiClientModule.ApiError(
        "Concurrency conflict: booking assignment changed. Expected current staff 'rajesh@neatify.app', but booking is currently assigned to 'other@neatify.app'.",
        409
      );

      jest.spyOn(apiClientModule, "request").mockRejectedValueOnce(mismatchError);

      await expect(
        reassignStaffToBooking(validBookingId, {
          staff_id: replacementStaffId,
          previous_staff_email: "rajesh@neatify.app",
        })
      ).rejects.toThrow("Concurrency conflict");
    });
  });

  describe("Booking Cancellation Endpoints (Phase 6 Step 15B)", () => {
    it("getBookingCancellationEligibility calls GET /bookings/{id}/cancellation-eligibility with validated UUID", async () => {
      const mockEligibility = {
        booking_id: validBookingId,
        can_cancel: true,
        current_work_status: "ASSIGNED",
        payment_status: "paid",
        refund_status: null,
        assigned_staff_email: "rajesh@neatify.app",
        assigned_staff_name: "Rajesh Kumar",
        booking_date: "2026-11-10",
        booking_time: "10:00 am",
        hours_until_service: 24.5,
        is_full_refund_eligible: true,
        estimated_cancellation_fee: 0.0,
        recommended_refund_amount: 1499.0,
        reasons: ["Assigned partner Rajesh Kumar will be notified upon cancellation."],
      };

      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockEligibility);

      const result = await getBookingCancellationEligibility(validBookingId);

      expect(spy).toHaveBeenCalledWith(`/bookings/${validBookingId}/cancellation-eligibility`, {
        method: "GET",
      });
      expect(result.can_cancel).toBe(true);
      expect(result.estimated_cancellation_fee).toBe(0.0);
      expect(result.recommended_refund_amount).toBe(1499.0);
      expect(result.is_full_refund_eligible).toBe(true);
    });

    it("getBookingCancellationEligibility correctly reports ineligible terminal bookings", async () => {
      const mockIneligible = {
        booking_id: validBookingId,
        can_cancel: false,
        current_work_status: "COMPLETED",
        payment_status: "paid",
        refund_status: null,
        assigned_staff_email: null,
        assigned_staff_name: null,
        booking_date: "2026-11-01",
        booking_time: "10:00 am",
        hours_until_service: -24.0,
        is_full_refund_eligible: false,
        estimated_cancellation_fee: 99.0,
        recommended_refund_amount: 0.0,
        reasons: ["Completed bookings cannot be cancelled (current status: 'COMPLETED')."],
      };

      jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockIneligible);

      const result = await getBookingCancellationEligibility(validBookingId);
      expect(result.can_cancel).toBe(false);
      expect(result.reasons[0]).toContain("Completed bookings cannot be cancelled");
    });

    it("previewBookingCancellation calls POST /bookings/{id}/preview-cancellation with sanitized payload", async () => {
      const mockPreview = {
        booking_id: validBookingId,
        can_cancel: true,
        current_work_status: "ASSIGNED",
        target_work_status: "CANCELLED",
        payment_status: "paid",
        total_amount: 1200.0,
        assigned_staff_email: "rajesh@neatify.app",
        assigned_staff_name: "Rajesh Kumar",
        booking_date: "2026-11-03",
        booking_time: "02:00 pm",
        hours_until_service: 4.5,
        is_full_refund_eligible: false,
        estimated_cancellation_fee: 99.0,
        recommended_refund_amount: 1101.0,
        cancellation_reason_required: false,
        required_notifications: ["send-cancellation-email", "send-booking-cancellation-whatsapp", "notify-staff-cancellation"],
        reasons: ["Cancelled within 6 hours of service slot: Cancellation fee of ₹99.0 applies."],
      };

      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockPreview);

      const result = await previewBookingCancellation(validBookingId, {
        reason: "Customer schedule conflict",
      });

      expect(spy).toHaveBeenCalledWith(`/bookings/${validBookingId}/preview-cancellation`, {
        method: "POST",
        body: { reason: "Customer schedule conflict" },
      });
      expect(result.can_cancel).toBe(true);
      expect(result.target_work_status).toBe("CANCELLED");
      expect(result.estimated_cancellation_fee).toBe(99.0);
      expect(result.recommended_refund_amount).toBe(1101.0);
      expect(result.is_full_refund_eligible).toBe(false);
    });

    it("previewBookingCancellation enforces reason length validation (<= 500 characters)", async () => {
      const longReason = "b".repeat(501);
      await expect(
        previewBookingCancellation(validBookingId, { reason: longReason })
      ).rejects.toThrow("Cancellation reason cannot exceed 500 characters.");
    });

    it("previewBookingCancellation rejects negative cancellation fees", async () => {
      await expect(
        previewBookingCancellation(validBookingId, { cancellation_fee: -50 })
      ).rejects.toThrow("Cancellation fee must be a non-negative number.");
    });

    it("cancelBooking calls POST /bookings/{id}/cancel with valid payload", async () => {
      const mockCancelResponse = {
        success: true,
        message: `Booking ${validBookingId} cancelled successfully.`,
        booking_id: validBookingId,
        work_status: "CANCELLED",
        cancel_time: "2026-11-02T12:30:00Z",
        cancel_reason: "Customer emergency",
        cancellation_fee: null,
        assigned_staff_email: "rajesh@neatify.app",
        assigned_staff_name: "Rajesh Kumar",
        refund_status: null,
        notifications_dispatched: false,
      };

      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockCancelResponse);

      const result = await cancelBooking(validBookingId, {
        reason: "Customer emergency",
      });

      expect(spy).toHaveBeenCalledWith(`/bookings/${validBookingId}/cancel`, {
        method: "POST",
        body: { reason: "Customer emergency" },
      });
      expect(result.success).toBe(true);
      expect(result.work_status).toBe("CANCELLED");
      expect(result.notifications_dispatched).toBe(false);
    });

    it("cancelBooking defaults reason to 'Cancelled by Admin' when empty or omitted", async () => {
      const mockCancelResponse = {
        success: true,
        message: `Booking ${validBookingId} cancelled successfully.`,
        booking_id: validBookingId,
        work_status: "CANCELLED",
        cancel_time: "2026-11-02T12:30:00Z",
        cancel_reason: "Cancelled by Admin",
        cancellation_fee: null,
        notifications_dispatched: false,
      };

      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockCancelResponse);

      await cancelBooking(validBookingId);

      expect(spy).toHaveBeenCalledWith(`/bookings/${validBookingId}/cancel`, {
        method: "POST",
        body: { reason: "Cancelled by Admin" },
      });
    });

    it("cancelBooking handles HTTP 503 live mutation concurrency guard safely", async () => {
      const guardError = new apiClientModule.ApiError(
        "Live booking cancellation is disabled until atomic database coordination is enabled.",
        503
      );

      jest.spyOn(apiClientModule, "request").mockRejectedValueOnce(guardError);

      await expect(
        cancelBooking(validBookingId, { reason: "Customer cancelled" })
      ).rejects.toThrow("Live booking cancellation is disabled");
    });

    it("cancelBooking handles HTTP 409 conflict when booking is already cancelled", async () => {
      const conflictError = new apiClientModule.ApiError(
        "Booking is already cancelled.",
        409
      );

      jest.spyOn(apiClientModule, "request").mockRejectedValueOnce(conflictError);

      await expect(
        cancelBooking(validBookingId, { reason: "Customer cancelled" })
      ).rejects.toThrow("Booking is already cancelled.");
    });

    it("cancelBooking handles HTTP 400 when attempting to cancel completed booking", async () => {
      const badRequestError = new apiClientModule.ApiError(
        "Cannot cancel booking with terminal status 'COMPLETED'. Completed bookings cannot be cancelled.",
        400
      );

      jest.spyOn(apiClientModule, "request").mockRejectedValueOnce(badRequestError);

      await expect(
        cancelBooking(validBookingId, { reason: "Customer cancelled" })
      ).rejects.toThrow("Completed bookings cannot be cancelled.");
    });
  });

  describe("Booking Rescheduling Endpoints & Validation (Phase 6 Step 16B)", () => {
    const today = new Date();
    const futureDate = new Date(today.getTime() + 86400000 * 7).toISOString().split("T")[0];
    const pastDate = "2020-01-01";
    const validTime = "10:30 am";

    describe("Schedule Date & Time Validation Helpers", () => {
      it("validateScheduleDate accepts valid future date in YYYY-MM-DD", () => {
        expect(validateScheduleDate(futureDate)).toBe(futureDate);
      });

      it("validateScheduleDate rejects invalid, empty, or malformed date strings", () => {
        expect(() => validateScheduleDate("")).toThrow("Schedule date is required and cannot be empty.");
        expect(() => validateScheduleDate(null)).toThrow("Schedule date is required and cannot be empty.");
        expect(() => validateScheduleDate("invalid-date")).toThrow("Invalid date format");
        expect(() => validateScheduleDate("2026/12/31")).toThrow("Invalid date format");
      });

      it("validateScheduleDate rejects past dates relative to IST", () => {
        expect(() => validateScheduleDate(pastDate)).toThrow("Cannot reschedule to a past date");
      });

      it("validateScheduleTime accepts valid 12h and 24h formats", () => {
        expect(validateScheduleTime("10:00 am")).toBe("10:00 am");
        expect(validateScheduleTime("02:30 PM")).toBe("02:30 PM");
        expect(validateScheduleTime("9:00 am")).toBe("9:00 am");
        expect(validateScheduleTime("14:00")).toBe("14:00");
      });

      it("validateScheduleTime rejects invalid time formats and hours > 12 with AM/PM", () => {
        expect(() => validateScheduleTime("")).toThrow("Schedule time is required and cannot be empty.");
        expect(() => validateScheduleTime("morning")).toThrow("Invalid time format");
        expect(() => validateScheduleTime("13:00 pm")).toThrow("Invalid hour '13' for 12-hour format with AM/PM.");
      });
    });

    describe("getBookingReschedulingEligibility", () => {
      it("calls GET /bookings/{id}/rescheduling-eligibility with validated UUID", async () => {
        const mockEligibility = {
          booking_id: validBookingId,
          can_reschedule: true,
          current_work_status: "ASSIGNED",
          current_booking_date: "2026-12-01",
          current_booking_time: "10:00 am",
          original_date: "2026-12-01",
          original_time: "10:00 am",
          payment_status: "paid",
          refund_status: null,
          assigned_staff_email: "partner@example.com",
          assigned_staff_name: "John Partner",
          reschedule_reason: null,
          reasons: [],
        };

        const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockEligibility);

        const result = await getBookingReschedulingEligibility(validBookingId);

        expect(spy).toHaveBeenCalledWith(
          `/bookings/${encodeURIComponent(validBookingId)}/rescheduling-eligibility`,
          { method: "GET" }
        );
        expect(result.can_reschedule).toBe(true);
        expect(result.booking_id).toBe(validBookingId);
      });

      it("reports ineligible booking with blocker reasons", async () => {
        const mockIneligible = {
          booking_id: validBookingId,
          can_reschedule: false,
          current_work_status: "COMPLETED",
          reasons: ["Cannot reschedule booking with terminal status 'COMPLETED'."],
        };

        jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockIneligible);

        const result = await getBookingReschedulingEligibility(validBookingId);
        expect(result.can_reschedule).toBe(false);
        expect(result.reasons).toContain("Cannot reschedule booking with terminal status 'COMPLETED'.");
      });
    });

    describe("previewBookingReschedule", () => {
      it("calls POST /bookings/{id}/preview-reschedule with validated payload", async () => {
        const mockPreview = {
          booking_id: validBookingId,
          can_reschedule: true,
          current_booking_date: "2026-12-01",
          current_booking_time: "10:00 am",
          new_booking_date: futureDate,
          new_booking_time: validTime,
          current_work_status: "ASSIGNED",
          target_work_status: "RESCHEDULED",
          assigned_staff_email: "partner@example.com",
          assigned_staff_name: "John Partner",
          assigned_staff_available: true,
          required_notifications: ["customer_whatsapp", "partner_push"],
          reasons: [],
        };

        const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockPreview);

        const result = await previewBookingReschedule(validBookingId, {
          new_date: futureDate,
          new_time: validTime,
          reason: "Customer requested morning slot",
        });

        expect(spy).toHaveBeenCalledWith(
          `/bookings/${encodeURIComponent(validBookingId)}/preview-reschedule`,
          {
            method: "POST",
            body: {
              new_date: futureDate,
              new_time: validTime,
              reason: "Customer requested morning slot",
            },
          }
        );
        expect(result.can_reschedule).toBe(true);
        expect(result.assigned_staff_available).toBe(true);
      });

      it("enforces reason length validation (<= 500 characters)", async () => {
        await expect(
          previewBookingReschedule(validBookingId, {
            new_date: futureDate,
            new_time: validTime,
            reason: "a".repeat(501),
          })
        ).rejects.toThrow("Reschedule reason cannot exceed 500 characters.");
      });
    });

    describe("rescheduleBooking", () => {
      it("calls POST /bookings/{id}/reschedule with valid payload and defaults reason", async () => {
        const mockResponse = {
          success: true,
          message: "Booking rescheduled successfully.",
          booking_id: validBookingId,
          work_status: "RESCHEDULED",
          booking_date: futureDate,
          booking_time: validTime,
          original_date: "2026-12-01",
          original_time: "10:00 am",
          reschedule_reason: "Rescheduled by Admin",
          assigned_staff_email: "partner@example.com",
          assigned_staff_name: "John Partner",
          notifications_dispatched: false,
        };

        const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockResponse);

        const result = await rescheduleBooking(validBookingId, {
          new_date: futureDate,
          new_time: validTime,
        });

        expect(spy).toHaveBeenCalledWith(
          `/bookings/${encodeURIComponent(validBookingId)}/reschedule`,
          {
            method: "POST",
            body: {
              new_date: futureDate,
              new_time: validTime,
              reason: "Rescheduled by Admin",
            },
          }
        );
        expect(result.work_status).toBe("RESCHEDULED");
      });

      it("includes optional customer otp in payload when provided", async () => {
        const mockResponse = {
          success: true,
          message: "Booking rescheduled successfully.",
          booking_id: validBookingId,
          work_status: "RESCHEDULED",
          booking_date: futureDate,
          booking_time: validTime,
          reschedule_reason: "Customer called support",
        };

        const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockResponse);

        await rescheduleBooking(validBookingId, {
          new_date: futureDate,
          new_time: validTime,
          reason: "Customer called support",
          otp: "123456",
        });

        expect(spy).toHaveBeenCalledWith(
          `/bookings/${encodeURIComponent(validBookingId)}/reschedule`,
          {
            method: "POST",
            body: {
              new_date: futureDate,
              new_time: validTime,
              reason: "Customer called support",
              otp: "123456",
            },
          }
        );
      });

      it("handles HTTP 503 live mutation concurrency guard safely without throwing unexpected errors", async () => {
        const guardError = new apiClientModule.ApiError(
          "Booking rescheduling is currently in preview mode. Live rescheduling is not enabled.",
          503
        );

        jest.spyOn(apiClientModule, "request").mockRejectedValueOnce(guardError);

        await expect(
          rescheduleBooking(validBookingId, {
            new_date: futureDate,
            new_time: validTime,
          })
        ).rejects.toThrow("Booking rescheduling is currently in preview mode.");
      });

      it("handles HTTP 409 conflict when rescheduling to same date and time slot", async () => {
        const conflictError = new apiClientModule.ApiError(
          "Booking is already scheduled for 2026-12-01 at 10:00 am. Rescheduling requires selecting a different date or time slot.",
          409
        );

        jest.spyOn(apiClientModule, "request").mockRejectedValueOnce(conflictError);

        await expect(
          rescheduleBooking(validBookingId, {
            new_date: "2026-12-01",
            new_time: "10:00 am",
          })
        ).rejects.toThrow("Rescheduling requires selecting a different date or time slot.");
      });
    });
  });

  describe("Booking Refund Management Endpoints & Safety (Phase 6 Step 17B)", () => {
    describe("getBookingRefundEligibility", () => {
      it("calls GET /bookings/{id}/refund-eligibility with validated UUID", async () => {
        const mockEligibility = {
          booking_id: validBookingId,
          can_refund: true,
          current_work_status: "CANCELLED",
          payment_status: "paid",
          refund_status: null,
          has_razorpay_payment_id: true,
          razorpay_payment_id: "pay_test123",
          rayzorpay_refund_id: null,
          total_amount: 1500.0,
          paid_amount: 1500.0,
          refundable_balance: 1500.0,
          recommended_refund_amount: 1500.0,
          estimated_cancellation_fee: 0.0,
          hours_until_service: 24.0,
          is_full_refund_eligible: true,
          customer_name: "Test Customer",
          customer_phone: "+919876543210",
          cancel_time: "2026-11-01T10:00:00Z",
          reasons: [],
        };

        const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockEligibility);

        const result = await getBookingRefundEligibility(validBookingId);

        expect(spy).toHaveBeenCalledWith(
          `/bookings/${encodeURIComponent(validBookingId)}/refund-eligibility`,
          { method: "GET" }
        );
        expect(result.can_refund).toBe(true);
        expect(result.refundable_balance).toBe(1500.0);
        expect(result.recommended_refund_amount).toBe(1500.0);
      });

      it("reconciles partial payment and policy deduction (< 6 hours before slot)", async () => {
        const mockPartial = {
          booking_id: validBookingId,
          can_refund: true,
          current_work_status: "CANCELLED",
          payment_status: "paid",
          refund_status: null,
          total_amount: 1500.0,
          paid_amount: 1500.0,
          refundable_balance: 1500.0,
          recommended_refund_amount: 1401.0,
          estimated_cancellation_fee: 99.0,
          hours_until_service: 2.5,
          is_full_refund_eligible: false,
          reasons: ["Cancelled within 6h of slot (2.5h left). Service cancellation fee of INR 99.00 applied."],
        };

        jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockPartial);

        const result = await getBookingRefundEligibility(validBookingId);
        expect(result.can_refund).toBe(true);
        expect(result.is_full_refund_eligible).toBe(false);
        expect(result.recommended_refund_amount).toBe(1401.0);
        expect(result.estimated_cancellation_fee).toBe(99.0);
      });

      it("reports unpaid booking as ineligible for refund with blocker reasons", async () => {
        const mockUnpaid = {
          booking_id: validBookingId,
          can_refund: false,
          current_work_status: "CANCELLED",
          payment_status: "unpaid",
          refund_status: null,
          total_amount: 800.0,
          paid_amount: 0.0,
          refundable_balance: 0.0,
          recommended_refund_amount: 0.0,
          reasons: ["No verified captured payment found. Booking has 0 captured funds."],
        };

        jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockUnpaid);

        const result = await getBookingRefundEligibility(validBookingId);
        expect(result.can_refund).toBe(false);
        expect(result.reasons).toContain("No verified captured payment found. Booking has 0 captured funds.");
      });
    });

    describe("previewBookingRefund", () => {
      it("calls POST /bookings/{id}/preview-refund with validated proposed amount and note", async () => {
        const mockPreview = {
          booking_id: validBookingId,
          can_refund: true,
          total_amount: 1500.0,
          captured_amount: 1500.0,
          cancellation_fee: 0.0,
          refundable_balance: 1500.0,
          recommended_refund_amount: 1500.0,
          proposed_refund_amount: 1200.0,
          is_full_refund_eligible: true,
          default_note: "Full refund applied",
          target_refund_status: "REFUND_PENDING",
          reasons: ["Custom proposed refund amount of INR 1200.00 accepted."],
        };

        const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockPreview);

        const result = await previewBookingRefund(validBookingId, {
          proposed_amount: 1200.0,
          refund_note: "Customer agreed to partial deduction",
        });

        expect(spy).toHaveBeenCalledWith(
          `/bookings/${encodeURIComponent(validBookingId)}/preview-refund`,
          {
            method: "POST",
            body: {
              proposed_amount: 1200.0,
              refund_note: "Customer agreed to partial deduction",
            },
          }
        );
        expect(result.proposed_refund_amount).toBe(1200.0);
        expect(result.target_refund_status).toBe("REFUND_PENDING");
      });

      it("rejects negative proposed refund amount", async () => {
        await expect(
          previewBookingRefund(validBookingId, { proposed_amount: -50.0 })
        ).rejects.toThrow("Proposed refund amount must be a non-negative number.");
      });

      it("rejects negative override cancellation fee", async () => {
        await expect(
          previewBookingRefund(validBookingId, { override_cancellation_fee: -100 })
        ).rejects.toThrow("Override cancellation fee must be a non-negative number.");
      });

      it("enforces refund note length (<= 500 characters)", async () => {
        await expect(
          previewBookingRefund(validBookingId, { refund_note: "a".repeat(501) })
        ).rejects.toThrow("Refund note cannot exceed 500 characters.");
      });
    });

    describe("refundBooking", () => {
      it("calls POST /bookings/{id}/refund with action 'initiate', amount, and note", async () => {
        const mockResponse = {
          success: true,
          message: "Refund marked as REFUND_PENDING.",
          booking_id: validBookingId,
          action_taken: "initiate",
          refund_status: "REFUND_PENDING",
          refund_amount: 1500.0,
          refund_note: "Customer requested cancellation refund",
          refund_time: "2026-11-02T10:00:00Z",
          rayzorpay_refund_id: null,
          guard_blocked: false,
        };

        const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockResponse);

        const result = await refundBooking(validBookingId, {
          action: "initiate",
          amount: 1500.0,
          note: "Customer requested cancellation refund",
        });

        expect(spy).toHaveBeenCalledWith(
          `/bookings/${encodeURIComponent(validBookingId)}/refund`,
          {
            method: "POST",
            body: {
              action: "initiate",
              amount: 1500.0,
              note: "Customer requested cancellation refund",
            },
          }
        );
        expect(result.refund_status).toBe("REFUND_PENDING");
      });

      it("rejects invalid refund action values", async () => {
        await expect(
          refundBooking(validBookingId, { action: "unsupported_action" })
        ).rejects.toThrow("Invalid refund action 'unsupported_action'");
      });

      it("enforces minimum refund amount (>= 0.01)", async () => {
        await expect(
          refundBooking(validBookingId, { amount: 0.0 })
        ).rejects.toThrow("Refund amount must be a number greater than or equal to 0.01.");
      });

      it("enforces refund note length (<= 500 characters)", async () => {
        await expect(
          refundBooking(validBookingId, { note: "x".repeat(501) })
        ).rejects.toThrow("Refund note cannot exceed 500 characters.");
      });

      it("enforces razorpay refund ID length (<= 128 characters)", async () => {
        await expect(
          refundBooking(validBookingId, { rayzorpay_refund_id: "r".repeat(129) })
        ).rejects.toThrow("Razorpay refund ID cannot exceed 128 characters.");
      });

      it("handles HTTP 503 live mutation concurrency guard safely without throwing unexpected errors", async () => {
        const guardError = new apiClientModule.ApiError(
          "Live refund processing is disabled for safety. Real payments and refunds cannot be executed.",
          503
        );

        jest.spyOn(apiClientModule, "request").mockRejectedValueOnce(guardError);

        await expect(
          refundBooking(validBookingId, { action: "initiate", amount: 1500.0 })
        ).rejects.toThrow("Live refund processing is disabled for safety.");
      });

      it("handles HTTP 409 conflict when booking is already marked as fully REFUNDED", async () => {
        const conflictError = new apiClientModule.ApiError(
          "Booking is already marked as fully REFUNDED.",
          409
        );

        jest.spyOn(apiClientModule, "request").mockRejectedValueOnce(conflictError);

        await expect(
          refundBooking(validBookingId, { action: "initiate", amount: 1500.0 })
        ).rejects.toThrow("Booking is already marked as fully REFUNDED.");
      });

      it("handles HTTP 400 bad request when attempting refund on unpaid booking", async () => {
        const badRequestError = new apiClientModule.ApiError(
          "Cannot process refund for an unpaid booking with zero captured amount.",
          400
        );

        jest.spyOn(apiClientModule, "request").mockRejectedValueOnce(badRequestError);

        await expect(
          refundBooking(validBookingId, { action: "initiate", amount: 1500.0 })
        ).rejects.toThrow("Cannot process refund for an unpaid booking with zero captured amount.");
      });

      it("handles HTTP 422 unprocessable entity when refund amount exceeds refundable balance", async () => {
        const unprocessableError = new apiClientModule.ApiError(
          "Refund amount (INR 2000.00) cannot exceed refundable balance (INR 1500.00).",
          422
        );

        jest.spyOn(apiClientModule, "request").mockRejectedValueOnce(unprocessableError);

        await expect(
          refundBooking(validBookingId, { action: "initiate", amount: 2000.0 })
        ).rejects.toThrow("Refund amount (INR 2000.00) cannot exceed refundable balance");
      });
    });
  });

  describe("bookingApi default export integrity", () => {
    it("exports all expected assignment, cancellation, rescheduling and refund methods on default object", () => {
      expect(typeof bookingApi.getBookings).toBe("function");
      expect(typeof bookingApi.getBookingDetail).toBe("function");
      expect(typeof bookingApi.getEligibleStaffForBooking).toBe("function");
      expect(typeof bookingApi.previewBookingAssignment).toBe("function");
      expect(typeof bookingApi.assignStaffToBooking).toBe("function");
      expect(typeof bookingApi.reassignStaffToBooking).toBe("function");
      expect(typeof bookingApi.getBookingCancellationEligibility).toBe("function");
      expect(typeof bookingApi.previewBookingCancellation).toBe("function");
      expect(typeof bookingApi.cancelBooking).toBe("function");
      expect(typeof bookingApi.getBookingReschedulingEligibility).toBe("function");
      expect(typeof bookingApi.previewBookingReschedule).toBe("function");
      expect(typeof bookingApi.rescheduleBooking).toBe("function");
      expect(typeof bookingApi.getBookingRefundEligibility).toBe("function");
      expect(typeof bookingApi.previewBookingRefund).toBe("function");
      expect(typeof bookingApi.refundBooking).toBe("function");
      expect(typeof bookingApi.validateScheduleDate).toBe("function");
      expect(typeof bookingApi.validateScheduleTime).toBe("function");
      expect(typeof bookingApi.validateBookingUuid).toBe("function");
      expect(typeof bookingApi.validateStaffUuid).toBe("function");
    });
  });
});
