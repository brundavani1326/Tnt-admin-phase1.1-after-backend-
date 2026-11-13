import * as apiClientModule from "./apiClient";
import staffReferralsApi, {
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
  STANDARD_REFERRAL_BONUS_AMOUNT,
  REFERRAL_MILESTONE_TARGET,
} from "./staffReferralsApi";

describe("Staff Referrals API & Safety Guard Unit Tests (Phase 6 Step 11B)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Constants & Baseline Rules", () => {
    it("exports standard milestone rules matching backend Step 11A", () => {
      expect(STANDARD_REFERRAL_BONUS_AMOUNT).toBe(1500);
      expect(REFERRAL_MILESTONE_TARGET).toBe(30);
    });
  });

  describe("API Endpoint Contracts", () => {
    it("getReferralsSummary calls GET /staff-referrals/summary", async () => {
      const mockSummary = {
        total_referrals: 25,
        pending_approval_count: 5,
        approved_count: 18,
        rejected_count: 2,
        milestone_completed_count: 10,
        pending_bonuses_count: 4,
        paid_bonuses_count: 6,
        total_bonus_paid_amount: 9000.0,
        total_bonus_pending_amount: 6000.0,
        milestone_target_bookings: 30,
        reward_per_referral: 1500,
      };
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockSummary);
      const res = await getReferralsSummary();
      expect(spy).toHaveBeenCalledWith("/staff-referrals/summary", { method: "GET" });
      expect(res.total_referrals).toBe(25);
      expect(res.approved_count).toBe(18);
      expect(res.total_bonus_paid_amount).toBe(9000.0);
    });

    it("getMilestonesGrouped calls GET /staff-referrals/milestones", async () => {
      const mockMilestones = [
        {
          referrer_name: "John Doe",
          referral_code: "JOHN1234",
          total_referrals_count: 3,
          eligible_rewards_count: 2,
          paid_rewards_count: 1,
          pending_bonus_amount: 3000.0,
          candidates: [
            { id: "c1", full_name: "Alice", completed_booking: 35, is_milestone_eligible: true },
          ],
        },
      ];
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockMilestones);
      const res = await getMilestonesGrouped();
      expect(spy).toHaveBeenCalledWith("/staff-referrals/milestones", { method: "GET" });
      expect(res.length).toBe(1);
      expect(res[0].referral_code).toBe("JOHN1234");
      expect(res[0].eligible_rewards_count).toBe(2);
    });

    it("getExportData calls GET /staff-referrals/export", async () => {
      const mockExport = {
        export_settings: {
          debit_account_no: "123456789012",
          payout_mode: "FT",
          product_code: "PAB_VENDOR",
        },
        total_referrers: 1,
        total_eligible_referrals: 2,
        total_payout_amount: 3000.0,
        rows: [
          {
            referrer_name: "John Doe",
            referral_code: "JOHN1234",
            account_holder_name: "John Doe",
            account_number: "987654321012",
            ifsc_code: "ICIC0001234",
            bank_name: "ICICI Bank",
            referral_count: 2,
            total_amount: 3000.0,
          },
        ],
      };
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockExport);
      const res = await getExportData();
      expect(spy).toHaveBeenCalledWith("/staff-referrals/export", { method: "GET" });
      expect(res.total_payout_amount).toBe(3000.0);
      expect(res.rows[0].account_number).toBe("987654321012");
    });

    it("listStaffReferrals calls GET /staff-referrals with query parameters", async () => {
      const mockList = {
        items: [{ id: "r1", full_name: "Bob Smith", status: "pending" }],
        total_count: 1,
        page: 1,
        limit: 20,
        total_pages: 1,
      };
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockList);
      const res = await listStaffReferrals({
        status: "pending",
        bonus_status: "pending",
        search: "Bob",
        page: 1,
        limit: 20,
      });
      expect(spy).toHaveBeenCalledWith(
        "/staff-referrals?status=pending&bonus_status=pending&search=Bob&page=1&limit=20",
        { method: "GET" }
      );
      expect(res.items.length).toBe(1);
    });

    it("getStaffReferralHistory calls GET /staff-referrals/staff/{code} with URL encoding", async () => {
      const mockHistory = {
        staff_profile: { id: "s-123", name: "Ramesh" },
        referral_code: "RAM123",
        total_referrals: 5,
      };
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockHistory);
      const res = await getStaffReferralHistory("RAM 123");
      expect(spy).toHaveBeenCalledWith("/staff-referrals/staff/RAM%20123", { method: "GET" });
      expect(res.staff_profile.name).toBe("Ramesh");
    });

    it("getStaffReferralDetail calls GET /staff-referrals/{id} with UUID", async () => {
      const mockDetail = { id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", full_name: "Candidate One" };
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockDetail);
      const res = await getStaffReferralDetail("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
      expect(spy).toHaveBeenCalledWith(
        "/staff-referrals/a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        { method: "GET" }
      );
      expect(res.full_name).toBe("Candidate One");
    });

    it("updateCandidateStatus calls PATCH /staff-referrals/{id}/status", async () => {
      const mockRes = {
        status: "success",
        message: "Referral status updated to 'approved' successfully",
        referral: { id: "ref-uuid", status: "approved" },
      };
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockRes);
      const res = await updateCandidateStatus("ref-uuid", "approved");
      expect(spy).toHaveBeenCalledWith("/staff-referrals/ref-uuid/status", {
        method: "PATCH",
        body: { status: "approved" },
      });
      expect(res.status).toBe("success");
      expect(res.referral.status).toBe("approved");
    });
  });

  describe("Pagination Handling", () => {
    it("getAllStaffReferrals retrieves single page when total_pages is 1", async () => {
      const page1 = {
        items: [{ id: "1", name: "A" }],
        total_pages: 1,
        total_count: 1,
      };
      jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(page1);
      const all = await getAllStaffReferrals();
      expect(all).toHaveLength(1);
      expect(all[0].id).toBe("1");
    });

    it("getAllStaffReferrals paginates through multiple pages and concatenates items", async () => {
      const page1 = {
        items: [{ id: "1", name: "A" }],
        total_pages: 2,
        total_count: 2,
      };
      const page2 = {
        items: [{ id: "2", name: "B" }],
        total_pages: 2,
        total_count: 2,
      };
      const spy = jest
        .spyOn(apiClientModule, "request")
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce(page2);

      const all = await getAllStaffReferrals();
      expect(spy).toHaveBeenCalledTimes(2);
      expect(all).toHaveLength(2);
      expect(all.map((i) => i.id)).toEqual(["1", "2"]);
    });
  });

  describe("Financial Safety Guards (Non-Destructive Simulation Mode)", () => {
    it("previewReferralSync strictly sets confirm_financial_mutation=false", async () => {
      const mockPreview = {
        status: "preview_only",
        mutation_executed: false,
        requires_authorization: true,
        total_records: 3,
        total_amount: 4500.0,
        message: "PREVIEW ONLY: Found 3 pending referral records totaling ₹4,500.00.",
      };
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockPreview);

      const res = await previewReferralSync({
        referral_ids: ["ref-1", "ref-2"],
        bank_account_numbers: ["111222333"],
        confirm_financial_mutation: true, // Attempted true should be overridden to false
      });

      expect(spy).toHaveBeenCalledWith("/staff-referrals/sync-preview", {
        method: "POST",
        body: {
          referral_ids: ["ref-1", "ref-2"],
          bank_account_numbers: ["111222333"],
          confirm_financial_mutation: false, // Strict safety guard enforced
        },
      });
      expect(res.mutation_executed).toBe(false);
      expect(res.status).toBe("preview_only");
    });

    it("initiateReferralBonus enforces dry_run=true, notify_staff=false, confirm_financial_mutation=false", async () => {
      const mockBonus = {
        status: "preview_only",
        mutation_executed: false,
        requires_authorization: true,
        action: "initiate",
        bonus_amount: 1500,
        candidate_name: "Pooja",
        message: "PREVIEW ONLY: Would mark referral bonus as 'initiated'.",
      };
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockBonus);

      const res = await initiateReferralBonus("ref-test-id");
      expect(spy).toHaveBeenCalledWith("/staff-referrals/ref-test-id/initiate-bonus", {
        method: "POST",
        body: {
          bonus_amount: 1500,
          confirm_financial_mutation: false,
          dry_run: true,
          notify_staff: false,
        },
      });
      expect(res.mutation_executed).toBe(false);
      expect(res.action).toBe("initiate");
    });

    it("completeReferralPayment enforces dry_run=true and confirm_financial_mutation=false", async () => {
      const mockPayment = {
        status: "preview_only",
        mutation_executed: false,
        requires_authorization: true,
        action: "complete",
        bonus_amount: 1500,
        candidate_name: "Pooja",
        message: "PREVIEW ONLY: Would mark referral bonus as 'paid'.",
      };
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockPayment);

      const res = await completeReferralPayment("ref-test-id", { payment_reference: "TXN12345" });
      expect(spy).toHaveBeenCalledWith("/staff-referrals/ref-test-id/complete-payment", {
        method: "POST",
        body: {
          bonus_amount: 1500,
          confirm_financial_mutation: false,
          payment_reference: "TXN12345",
          dry_run: true,
        },
      });
      expect(res.mutation_executed).toBe(false);
      expect(res.action).toBe("complete");
    });
  });

  describe("apiClient Integration", () => {
    it("exposes all staffReferralsApi methods on default apiClient object", () => {
      expect(typeof apiClientModule.default.getReferralsSummary).toBe("function");
      expect(typeof apiClientModule.default.getMilestonesGrouped).toBe("function");
      expect(typeof apiClientModule.default.getExportData).toBe("function");
      expect(typeof apiClientModule.default.listStaffReferrals).toBe("function");
      expect(typeof apiClientModule.default.getAllStaffReferrals).toBe("function");
      expect(typeof apiClientModule.default.getStaffReferralHistory).toBe("function");
      expect(typeof apiClientModule.default.getStaffReferralDetail).toBe("function");
      expect(typeof apiClientModule.default.updateCandidateStatus).toBe("function");
      expect(typeof apiClientModule.default.previewReferralSync).toBe("function");
      expect(typeof apiClientModule.default.initiateReferralBonus).toBe("function");
      expect(typeof apiClientModule.default.completeReferralPayment).toBe("function");
    });
  });
});
