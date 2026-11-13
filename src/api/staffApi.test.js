import * as apiClientModule from "./apiClient";
import staffApi, {
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
} from "./staffApi";

describe("Staff Management API Client Unit Tests (Phase 6 Step 13B)", () => {
  const validUuid = "11111111-2222-3333-4444-555555555555";
  const validEmail = "staff.cleaner@neatify.app";
  const validMonth = "2026-11";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Validation & Safety Guards", () => {
    it("validateStaffUuid validates and standardizes valid 36-character UUID strings", () => {
      expect(validateStaffUuid(validUuid)).toBe(validUuid);
      expect(validateStaffUuid("  " + validUuid.toUpperCase() + "  ")).toBe(validUuid);
    });

    it("validateStaffUuid rejects invalid UUID strings", () => {
      expect(() => validateStaffUuid("")).toThrow("Must be a valid 36-character UUID string");
      expect(() => validateStaffUuid(null)).toThrow("Must be a valid 36-character UUID string");
      expect(() => validateStaffUuid("12345")).toThrow("Must be a valid 36-character UUID string");
      expect(() => validateStaffUuid("invalid-uuid-format-here-1234567890123")).toThrow(
        "Must be a valid 36-character UUID string"
      );
    });

    it("validateCalendarMonth validates standard YYYY-MM formatted strings", () => {
      expect(validateCalendarMonth(validMonth)).toBe(validMonth);
      expect(validateCalendarMonth("  2026-05  ")).toBe("2026-05");
    });

    it("validateCalendarMonth rejects malformed month strings or invalid month numbers", () => {
      expect(() => validateCalendarMonth("")).toThrow("Expected 'YYYY-MM'");
      expect(() => validateCalendarMonth(null)).toThrow("Expected 'YYYY-MM'");
      expect(() => validateCalendarMonth("2026-13")).toThrow("Expected 'YYYY-MM'");
      expect(() => validateCalendarMonth("2026-00")).toThrow("Expected 'YYYY-MM'");
      expect(() => validateCalendarMonth("26-11")).toThrow("Expected 'YYYY-MM'");
    });

    it("validateStaffEmail validates email addresses", () => {
      expect(validateStaffEmail(validEmail)).toBe(validEmail);
      expect(validateStaffEmail("  admin@neatify.app  ")).toBe("admin@neatify.app");
    });

    it("validateStaffEmail rejects invalid email formats", () => {
      expect(() => validateStaffEmail("")).toThrow("Invalid staff email format");
      expect(() => validateStaffEmail(null)).toThrow("Invalid staff email format");
      expect(() => validateStaffEmail("not-an-email")).toThrow("Invalid staff email format");
    });
  });

  describe("Directory & Search Endpoints", () => {
    it("listStaff correctly formats query parameters", async () => {
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce({
        items: [],
        total: 0,
        limit: 50,
        offset: 0,
        has_more: false,
      });

      await listStaff({
        limit: 25,
        offset: 50,
        search: "Ramesh",
        status: "available",
        is_blocked: false,
        is_available: true,
      });

      expect(spy).toHaveBeenCalledWith(
        "/staff?limit=25&offset=50&search=Ramesh&status=available&is_blocked=false&is_available=true",
        { method: "GET" }
      );
    });

    it("getAllStaff paginates across offsets until has_more is false", async () => {
      const page1 = {
        items: [{ id: "1" }, { id: "2" }],
        total: 3,
        limit: 100,
        offset: 0,
        has_more: true,
      };
      const page2 = {
        items: [{ id: "3" }],
        total: 3,
        limit: 100,
        offset: 100,
        has_more: false,
      };

      jest
        .spyOn(apiClientModule, "request")
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce(page2);

      const all = await getAllStaff();
      expect(all).toHaveLength(3);
      expect(all.map((s) => s.id)).toEqual(["1", "2", "3"]);
    });

    it("getOutOfZoneStaff invokes GET /staff/out-of-zone", async () => {
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce({
        items: [{ id: validUuid, name: "Out Staff", is_out_of_zone: true }],
        count: 1,
      });

      const res = await getOutOfZoneStaff();
      expect(spy).toHaveBeenCalledWith("/staff/out-of-zone", { method: "GET" });
      expect(res.count).toBe(1);
    });
  });

  describe("Profile Detail & Lookups", () => {
    it("getStaffDetail invokes GET /staff/{id}", async () => {
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce({
        id: validUuid,
        name: "Test Staff",
      });

      const res = await getStaffDetail(validUuid);
      expect(spy).toHaveBeenCalledWith(`/staff/${validUuid}`, { method: "GET" });
      expect(res.name).toBe("Test Staff");
    });

    it("getStaffByEmail invokes GET /staff/by-email/{email}", async () => {
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce({
        id: validUuid,
        email: validEmail,
      });

      const res = await getStaffByEmail(validEmail);
      expect(spy).toHaveBeenCalledWith(
        `/staff/by-email/${encodeURIComponent(validEmail)}`,
        { method: "GET" }
      );
      expect(res.email).toBe(validEmail);
    });
  });

  describe("Availability & Scheduling", () => {
    it("getStaffMonthlyAvailability invokes GET /staff/availability?month=YYYY-MM", async () => {
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce({
        month: validMonth,
        total_records: 1,
        data: [{ staff_email: validEmail }],
      });

      const res = await getStaffMonthlyAvailability(validMonth);
      expect(spy).toHaveBeenCalledWith(
        `/staff/availability?month=${encodeURIComponent(validMonth)}`,
        { method: "GET" }
      );
      expect(res.total_records).toBe(1);
    });

    it("getStaffAvailability invokes GET /staff/{id}/availability?month=YYYY-MM", async () => {
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce({
        staff_id: validUuid,
        month: validMonth,
        calendar_data: { "2026-11-05": ["09:00"] },
      });

      const res = await getStaffAvailability(validUuid, validMonth);
      expect(spy).toHaveBeenCalledWith(
        `/staff/${validUuid}/availability?month=${encodeURIComponent(validMonth)}`,
        { method: "GET" }
      );
      expect(res.staff_id).toBe(validUuid);
    });
  });

  describe("Duty Logs & Earnings", () => {
    it("getStaffDutyLogs invokes GET /staff/{id}/duty-logs", async () => {
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce({
        staff_id: validUuid,
        today_duty_minutes: "120",
        entries: [],
      });

      const res = await getStaffDutyLogs(validUuid);
      expect(spy).toHaveBeenCalledWith(`/staff/${validUuid}/duty-logs`, {
        method: "GET",
      });
      expect(res.today_duty_minutes).toBe("120");
    });

    it("getStaffEarnings invokes GET /staff/{id}/earnings with pagination parameters", async () => {
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce({
        items: [],
        total: 0,
        limit: 25,
        offset: 50,
        has_more: false,
      });

      await getStaffEarnings(validUuid, { limit: 25, offset: 50 });
      expect(spy).toHaveBeenCalledWith(
        `/staff/${validUuid}/earnings?limit=25&offset=50`,
        { method: "GET" }
      );
    });

    it("getAllStaffEarnings concatenates multi-page earnings results", async () => {
      const page1 = {
        items: [{ id: "e1", AMOUNT: "500" }],
        total: 2,
        has_more: true,
      };
      const page2 = {
        items: [{ id: "e2", AMOUNT: "750" }],
        total: 2,
        has_more: false,
      };

      jest
        .spyOn(apiClientModule, "request")
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce(page2);

      const all = await getAllStaffEarnings(validUuid);
      expect(all).toHaveLength(2);
      expect(all.map((e) => e.id)).toEqual(["e1", "e2"]);
    });
  });

  describe("Status, Profile Updates & Deactivations", () => {
    it("updateStaffBlockStatus invokes PATCH /staff/{id}/status", async () => {
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce({
        id: validUuid,
        is_blocked: true,
      });

      const res = await updateStaffBlockStatus(validUuid, true);
      expect(spy).toHaveBeenCalledWith(`/staff/${validUuid}/status`, {
        method: "PATCH",
        body: JSON.stringify({ is_blocked: true }),
      });
      expect(res.is_blocked).toBe(true);
    });

    it("updateStaffProfile resolves aliases and omits masked banking placeholders", async () => {
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce({
        id: validUuid,
        name: "Updated Name",
      });

      await updateStaffProfile(validUuid, {
        name: "Updated Name",
        account_holder_name: "Beneficiary User",
        account_number: "XXXXXXXX1234", // MASKED: Must be omitted
        ifsc_code: "hdfc0001234",
        bank_name: "HDFC Bank",
        aadhar_number: "XXXXXXXX9012", // MASKED: Must be omitted
        tagged_partner: "Vendor Co",
      });

      expect(spy).toHaveBeenCalledWith(`/staff/${validUuid}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: "Updated Name",
          BNF_NAME: "Beneficiary User",
          BENE_IFSC: "HDFC0001234",
          bank_name: "HDFC Bank",
          tagged_partner: "Vendor Co",
        }),
      });
    });

    it("updateStaffProfile permits unmasked valid account numbers", async () => {
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce({
        id: validUuid,
      });

      await updateStaffProfile(validUuid, {
        name: "Staff Member",
        account_number: "123456789012",
        aadhar_number: "1234 5678 9012",
      });

      expect(spy).toHaveBeenCalledWith(`/staff/${validUuid}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: "Staff Member",
          BENE_ACC_NO: "123456789012",
          aadhar_number: "123456789012",
        }),
      });
    });

    it("updateStaffProfile throws error if no valid editable fields provided", async () => {
      await expect(
        updateStaffProfile(validUuid, {
          account_number: "XXXXXXXX1234", // masked -> omitted
          aadhar_number: "XXXXXXXX9012", // masked -> omitted
        })
      ).rejects.toThrow("No editable fields provided");
    });

    it("deactivateStaff invokes PATCH /staff/{id}/deactivate", async () => {
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce({
        id: validUuid,
        is_active: false,
        status: "deactivated",
      });

      const res = await deactivateStaff(validUuid, "Resigned");
      expect(spy).toHaveBeenCalledWith(`/staff/${validUuid}/deactivate`, {
        method: "PATCH",
        body: JSON.stringify({ reason: "Resigned" }),
      });
      expect(res.status).toBe("deactivated");
    });

    it("deleteStaff invokes DELETE /staff/{id}", async () => {
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce({
        id: validUuid,
        is_active: false,
        status: "deactivated",
      });

      const res = await deleteStaff(validUuid);
      expect(spy).toHaveBeenCalledWith(`/staff/${validUuid}`, {
        method: "DELETE",
      });
      expect(res.status).toBe("deactivated");
    });
  });

  describe("Avatar Uploads & Onboarding", () => {
    it("uploadStaffAvatar constructs FormData and posts to /staff/{id}/avatar", async () => {
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce({
        id: validUuid,
        avatar_url: "https://storage.neatify.app/avatars/test.jpg",
      });

      const fakeFile = new Blob(["fake image data"], { type: "image/jpeg" });
      const res = await uploadStaffAvatar(validUuid, fakeFile);

      expect(spy).toHaveBeenCalledWith(
        `/staff/${validUuid}/avatar`,
        expect.objectContaining({
          method: "POST",
          body: expect.any(FormData),
        })
      );
      expect(res.avatar_url).toBe("https://storage.neatify.app/avatars/test.jpg");
    });

    it("uploadStaffAvatar rejects missing file", async () => {
      await expect(uploadStaffAvatar(validUuid, null)).rejects.toThrow(
        "Avatar image file is required"
      );
    });

    it("onboardStaff posts payload to /staff", async () => {
      const payload = {
        name: "New Partner",
        phone: "+919876543210",
        role: "staff",
      };

      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce({
        id: validUuid,
        ...payload,
      });

      const res = await onboardStaff(payload);
      expect(spy).toHaveBeenCalledWith("/staff", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      expect(res.id).toBe(validUuid);
    });

    it("onboardStaff rejects payload missing name or phone", async () => {
      await expect(onboardStaff({ name: "Only Name" })).rejects.toThrow(
        "Staff name and phone are required"
      );
    });
  });

  describe("API Client Module Integration", () => {
    it("registers staffApi methods on the default apiClient export", () => {
      expect(typeof apiClientModule.default.listStaff).toBe("function");
      expect(typeof apiClientModule.default.getStaffDetail).toBe("function");
      expect(typeof apiClientModule.default.updateStaffBlockStatus).toBe("function");
      expect(typeof apiClientModule.default.deleteStaff).toBe("function");
      expect(typeof apiClientModule.default.uploadStaffAvatar).toBe("function");
    });
  });
});

