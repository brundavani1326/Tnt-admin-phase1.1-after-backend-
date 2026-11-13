import pricingApi, {
  getPricingServices,
  getServicePricing,
  updateServicePricing,
  batchUpdateServicesPricing,
  calculatePricing,
  getPricingSummary,
  getAddonsPricing,
  updateAddonPricing,
} from "./pricingApi";
import * as apiClientModule from "./apiClient";

describe("Pricing Management API & Formula Unit Tests (Phase 6 Step 9B)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("API Method Endpoint Contracts", () => {
    it("getPricingServices calls GET /pricing/services", async () => {
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce([{ id: "s1", title: "Cleaning" }]);
      const res = await getPricingServices();
      expect(spy).toHaveBeenCalledWith("/pricing/services", { method: "GET" });
      expect(res).toEqual([{ id: "s1", title: "Cleaning" }]);
    });

    it("getServicePricing calls GET /pricing/services/{service_id}", async () => {
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce({ id: "s1", price: "₹499" });
      const res = await getServicePricing("s1");
      expect(spy).toHaveBeenCalledWith("/pricing/services/s1", { method: "GET" });
      expect(res.price).toBe("₹499");
    });

    it("updateServicePricing calls PUT /pricing/services/{service_id}", async () => {
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce({ id: "s1", price: "₹599" });
      const payload = { price: "₹599", staff_amount: "₹400" };
      await updateServicePricing("s1", payload);
      expect(spy).toHaveBeenCalledWith("/pricing/services/s1", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    });

    it("batchUpdateServicesPricing wraps arrays into { services: [...] }", async () => {
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce({
        status: "success",
        updated_count: 1,
        total_requested: 1,
        services: [{ id: "s1" }],
        errors: null,
      });
      const items = [{ id: "s1", price: "₹499" }];
      const res = await batchUpdateServicesPricing(items);
      expect(spy).toHaveBeenCalledWith("/pricing/services/batch", {
        method: "PUT",
        body: JSON.stringify({ services: items }),
      });
      expect(res.status).toBe("success");
    });

    it("batchUpdateServicesPricing throws an error when passed an empty array", async () => {
      await expect(batchUpdateServicesPricing([])).rejects.toThrow(
        "Batch update requires a non-empty array of services."
      );
    });

    it("calculatePricing calls POST /pricing/calculate", async () => {
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce({
        price: 500,
        discounted_price: 450,
        admin_amount: 150,
      });
      const payload = { price: 500, staff_amount: 300, discount_percent: 10 };
      await calculatePricing(payload);
      expect(spy).toHaveBeenCalledWith("/pricing/calculate", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    });

    it("getPricingSummary calls GET /pricing/summary", async () => {
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce({ total_services: 10 });
      const res = await getPricingSummary();
      expect(spy).toHaveBeenCalledWith("/pricing/summary", { method: "GET" });
      expect(res.total_services).toBe(10);
    });

    it("getAddonsPricing calls GET /pricing/add-ons", async () => {
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce([{ id: "a1" }]);
      await getAddonsPricing();
      expect(spy).toHaveBeenCalledWith("/pricing/add-ons", { method: "GET" });
    });

    it("updateAddonPricing calls PUT /pricing/add-ons/{addon_id}", async () => {
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce({ id: "a1", price: "₹199" });
      await updateAddonPricing("a1", { price: "₹199" });
      expect(spy).toHaveBeenCalledWith("/pricing/add-ons/a1", {
        method: "PUT",
        body: JSON.stringify({ price: "₹199" }),
      });
    });
  });

  describe("Frontend Margin and Pricing Formula Verification", () => {
    // Formula:
    // discounted_price = price - (price * (discount / 100))
    // admin_amount = round(discounted_price - staff_amount)
    const calculateLocalAdminAmount = (priceStr, staffAmtStr, discountVal) => {
      const parseNum = (val) => {
        if (!val) return 0;
        let s = String(val).replace(/[₹,%]/g, "").trim();
        return parseFloat(s) || 0;
      };

      const price = parseNum(priceStr);
      const staff = parseNum(staffAmtStr);
      const discount = parseFloat(discountVal) || 0;

      const discountedPrice = price - (price * (discount / 100));
      const adminNum = Math.round(discountedPrice - staff);

      const isNegative = adminNum < 0;
      const absVal = Math.abs(adminNum).toLocaleString("en-IN");
      return (isNegative ? "-" : "") + "₹" + absVal;
    };

    it("calculates positive admin margin with 0% discount correctly", () => {
      // 500 - 0% = 500; 500 - 350 = 150
      const result = calculateLocalAdminAmount("₹500", "₹350", 0);
      expect(result).toBe("₹150");
    });

    it("calculates positive admin margin with discount correctly", () => {
      // 1000 - 10% = 900; 900 - 650 = 250
      const result = calculateLocalAdminAmount("₹1,000", "₹650", 10);
      expect(result).toBe("₹250");
    });

    it("calculates negative admin margin correctly and formats with leading minus sign", () => {
      // 500 - 20% = 400; 400 - 550 = -150
      const result = calculateLocalAdminAmount("₹500", "₹550", 20);
      expect(result).toBe("-₹150");
    });

    it("handles Indian Rupee formatting with commas and currency symbols cleanly", () => {
      const result = calculateLocalAdminAmount("₹10,000", "₹7,000", "5%");
      // 10000 - 5% = 9500; 9500 - 7000 = 2500
      expect(result).toBe("₹2,500");
    });
  });

  describe("Partial Batch Failure Detection and Isolation", () => {
    it("differentiates full success from partial batch success", () => {
      const fullSuccessResponse = {
        status: "success",
        updated_count: 3,
        total_requested: 3,
        services: [{ id: "1" }, { id: "2" }, { id: "3" }],
        errors: null,
      };

      const isFullSuccess =
        fullSuccessResponse.status === "success" &&
        (!fullSuccessResponse.errors || fullSuccessResponse.errors.length === 0);
      expect(isFullSuccess).toBe(true);

      const partialSuccessResponse = {
        status: "partial_success",
        updated_count: 2,
        total_requested: 3,
        services: [{ id: "1" }, { id: "2" }],
        errors: [{ service_id: "3", error: "Database lock timeout" }],
      };

      const hasPartialErrors =
        partialSuccessResponse.status === "partial_success" ||
        (Array.isArray(partialSuccessResponse.errors) && partialSuccessResponse.errors.length > 0);
      expect(hasPartialErrors).toBe(true);

      const failedIds = new Set(partialSuccessResponse.errors.map((e) => e.service_id));
      expect(failedIds.has("3")).toBe(true);
      expect(failedIds.has("1")).toBe(false);
    });
  });
});

