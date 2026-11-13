import partnerPayoutsApi, {
  getPayoutSummary,
  getCurrentCycle,
  validateCycleDates,
  getRecentPayouts,
  getPayoutsTableData,
  getPartnersPayouts,
  getPartnerPayoutDetail,
  getPartnerEarningsBreakdown,
  previewPayoutSync,
} from "./partnerPayoutsApi";
import * as apiClientModule from "./apiClient";

describe("Partner Payouts API & Safety Guard Unit Tests (Phase 6 Step 10B)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("API Endpoint Contracts", () => {
    it("getPayoutSummary calls GET /partner-payouts/summary", async () => {
      const mockSummary = {
        total_partners: 12,
        pending_payout_total: 15400.0,
        paid_payout_total: 45000.0,
        lifetime_payout_total: 60400.0,
        current_cycle: { start: "26-10-2026", end: "29-10-2026", label: "Sunday to Wednesday" },
        recent_paid_count: 8,
      };
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockSummary);
      const res = await getPayoutSummary();
      expect(spy).toHaveBeenCalledWith("/partner-payouts/summary", { method: "GET" });
      expect(res.total_partners).toBe(12);
      expect(res.pending_payout_total).toBe(15400.0);
    });

    it("getCurrentCycle calls GET /partner-payouts/cycles/current", async () => {
      const mockCycle = {
        start: "26-10-2026",
        end: "29-10-2026",
        start_iso: "2026-10-26",
        end_iso: "2026-10-29",
        label: "Sunday to Wednesday",
      };
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockCycle);
      const res = await getCurrentCycle();
      expect(spy).toHaveBeenCalledWith("/partner-payouts/cycles/current", { method: "GET" });
      expect(res.label).toBe("Sunday to Wednesday");
    });

    it("validateCycleDates calls GET /partner-payouts/cycles/validate with encoded dates", async () => {
      const mockValid = { is_valid: true, message: "Valid cycle", cycle_label: "Sunday to Wednesday" };
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockValid);
      const res = await validateCycleDates("2026-10-25", "2026-10-28");
      expect(spy).toHaveBeenCalledWith("/partner-payouts/cycles/validate?start=2026-10-25&end=2026-10-28", {
        method: "GET",
      });
      expect(res.is_valid).toBe(true);
    });

    it("validateCycleDates throws an error if dates are missing", async () => {
      await expect(validateCycleDates("", "2026-10-28")).rejects.toThrow(
        "start and end dates are required for cycle validation."
      );
    });

    it("getRecentPayouts calls GET /partner-payouts/recent with query filters", async () => {
      const mockRecent = [{ id: "r1", staff_name: "Rahul", amount: 1200 }];
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockRecent);
      const res = await getRecentPayouts({
        staff_email: "rahul@example.com",
        date: "2026-10-28",
        limit: 10,
      });
      expect(spy).toHaveBeenCalledWith(
        "/partner-payouts/recent?staff_email=rahul%40example.com&date=2026-10-28&limit=10",
        { method: "GET" }
      );
      expect(res.length).toBe(1);
    });

    it("getPayoutsTableData calls GET /partner-payouts/table with pagination and month filters", async () => {
      const mockTable = {
        items: [{ id: "t1", amount: 500, payment_status: "pending" }],
        total_count: 1,
        total_amount: 500.0,
        pending_amount: 500.0,
        paid_amount: 0.0,
        page: 1,
        limit: 50,
        total_pages: 1,
        dynamic_weeks: [],
      };
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockTable);
      const res = await getPayoutsTableData({
        month: "2026-10",
        payment_status: "pending",
        page: 1,
        limit: 50,
      });
      expect(spy).toHaveBeenCalledWith(
        "/partner-payouts/table?payment_status=pending&month=2026-10&page=1&limit=50",
        { method: "GET" }
      );
      expect(res.items.length).toBe(1);
      expect(res.total_amount).toBe(500.0);
    });

    it("getPartnersPayouts calls GET /partner-payouts/partners with search query", async () => {
      const mockPartners = [
        {
          id: "p1",
          name: "Suresh",
          email: "suresh@example.com",
          cycleAmount: 3400.0,
          netPayable: 3400.0,
          cancellationDeductions: 0.0,
          weeklyEarning: 3400.0,
          monthlyEarning: 12000.0,
          totalEarning: 45000.0,
          allTimeEarning: 48400.0,
          avgEarning: 850.0,
          completedJobsCount: 40,
        },
      ];
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockPartners);
      const res = await getPartnersPayouts({ search: "Suresh" });
      expect(spy).toHaveBeenCalledWith("/partner-payouts/partners?search=Suresh", { method: "GET" });
      expect(res[0].name).toBe("Suresh");
      expect(res[0].cycleAmount).toBe(3400.0);
    });

    it("getPartnerPayoutDetail encodes email parameters safely", async () => {
      const mockDetail = { id: "p1", email: "user+test@example.com", name: "User" };
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockDetail);
      const res = await getPartnerPayoutDetail("user+test@example.com");
      expect(spy).toHaveBeenCalledWith("/partner-payouts/partners/user%2Btest%40example.com", {
        method: "GET",
      });
      expect(res.email).toBe("user+test@example.com");
    });

    it("getPartnerEarningsBreakdown calls GET /partner-payouts/partners/{id}/breakdown", async () => {
      const mockBreakdown = [
        { id: "e1", booking_id: "b101", amount: 450, service_title: "Deep Cleaning" },
      ];
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockBreakdown);
      const res = await getPartnerEarningsBreakdown("partner-uuid-1", { status: "pending" });
      expect(spy).toHaveBeenCalledWith(
        "/partner-payouts/partners/partner-uuid-1/breakdown?status=pending",
        { method: "GET" }
      );
      expect(res[0].service_title).toBe("Deep Cleaning");
    });
  });

  describe("Guarded Financial Mutation Prevention (Task 5)", () => {
    it("previewPayoutSync strictly enforces confirm_financial_mutation=false in dry-run mode", async () => {
      const mockPreviewResponse = {
        status: "preview_only",
        mutation_executed: false,
        requires_authorization: true,
        message: "PREVIEW ONLY: Found 5 records totaling ₹4,500.00",
        records_count: 5,
        total_amount: 4500.0,
        affected_partners_count: 2,
        earnings_ids: ["e1", "e2", "e3", "e4", "e5"],
      };

      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockPreviewResponse);

      // Attempt to pass confirm_financial_mutation: true - should be overridden to false for safety
      const res = await previewPayoutSync({
        earnings_ids: ["e1", "e2"],
        bank_account_numbers: ["123456789"],
        confirm_financial_mutation: true,
      });

      expect(spy).toHaveBeenCalledWith("/partner-payouts/sync-preview", {
        method: "POST",
        body: JSON.stringify({
          earnings_ids: ["e1", "e2"],
          bank_account_numbers: ["123456789"],
          confirm_financial_mutation: false, // Overridden by frontend guard
        }),
      });

      expect(res.status).toBe("preview_only");
      expect(res.mutation_executed).toBe(false);
      expect(res.requires_authorization).toBe(true);
    });
  });
});

