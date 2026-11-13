import * as apiClientModule from "./apiClient";
import categoryHubApi, {
  validateLocationUuid,
  validateCategoryCountId,
  getCategoryHubSummary,
  getGroupedHubs,
  getAvailableCategories,
  getAvailableStaff,
  listHubLocations,
  getAllHubLocations,
  createHubLocation,
  getHubLocation,
  updateHubLocation,
  deleteHubLocation,
  listCategoryHubCounts,
  getAllCategoryHubCounts,
  createCategoryHubCount,
  getCategoryHubCount,
  updateCategoryHubCount,
  deleteCategoryHubCount,
  resetCategoryHubCount,
} from "./categoryHubApi";

describe("Category Hub Counts & Locations API Unit Tests (Phase 6 Step 12B)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("ID Validation & Safety Rules", () => {
    it("validateLocationUuid validates and standardizes valid UUIDs", () => {
      const valid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
      expect(validateLocationUuid(valid)).toBe(valid);
      expect(validateLocationUuid(`  ${valid}  `)).toBe(valid);
    });

    it("validateLocationUuid rejects empty or non-string IDs", () => {
      expect(() => validateLocationUuid("")).toThrow("Valid Hub Location UUID string is required.");
      expect(() => validateLocationUuid(null)).toThrow("Valid Hub Location UUID string is required.");
      expect(() => validateLocationUuid(123)).toThrow("Valid Hub Location UUID string is required.");
    });

    it("validateCategoryCountId validates positive integer IDs", () => {
      expect(validateCategoryCountId(40)).toBe(40);
      expect(validateCategoryCountId("40")).toBe(40);
      expect(validateCategoryCountId("  105 ")).toBe(105);
    });

    it("validateCategoryCountId rejects invalid or non-positive IDs", () => {
      expect(() => validateCategoryCountId(0)).toThrow("Valid positive integer Category Hub Count ID is required.");
      expect(() => validateCategoryCountId(-5)).toThrow("Valid positive integer Category Hub Count ID is required.");
      expect(() => validateCategoryCountId("abc")).toThrow("Valid positive integer Category Hub Count ID is required.");
      expect(() => validateCategoryCountId(null)).toThrow("Valid positive integer Category Hub Count ID is required.");
    });
  });

  describe("Metadata & Overview Endpoints", () => {
    it("getCategoryHubSummary calls GET /category-hub-counts/summary", async () => {
      const mockSummary = {
        total_hubs: 6,
        total_locations: 18,
        total_active_locations: 17,
        total_category_count_records: 24,
        total_allocated_capacity: 48,
        total_assigned_staff_slots: 36,
        configured_categories_count: 5,
        total_available_categories: 8,
      };
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockSummary);
      const res = await getCategoryHubSummary();
      expect(spy).toHaveBeenCalledWith("/category-hub-counts/summary", { method: "GET" });
      expect(res.total_hubs).toBe(6);
      expect(res.total_locations).toBe(18);
    });

    it("getGroupedHubs calls GET /category-hub-counts/grouped-hubs with search parameter", async () => {
      const mockGrouped = [
        {
          hub_name: "Gachibowli",
          locations: ["Indiranagar", "Telecom Nagar"],
          locations_count: 2,
          pincodes: ["500032"],
          is_active: true,
          configured_categories: ["DEEP CLEANING", "KITCHEN"],
          configured_categories_count: 2,
          total_capacity: 6,
          total_assigned_staff: 5,
        },
      ];
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockGrouped);
      const res = await getGroupedHubs("Gachibowli");
      expect(spy).toHaveBeenCalledWith("/category-hub-counts/grouped-hubs?search=Gachibowli", {
        method: "GET",
      });
      expect(res.length).toBe(1);
      expect(res[0].hub_name).toBe("Gachibowli");
    });

    it("getAvailableCategories calls GET /category-hub-counts/categories", async () => {
      const mockCategories = ["BATHROOM", "CARPET", "DEEP CLEANING", "KITCHEN", "SOFA"];
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockCategories);
      const res = await getAvailableCategories();
      expect(spy).toHaveBeenCalledWith("/category-hub-counts/categories", { method: "GET" });
      expect(res).toEqual(mockCategories);
    });

    it("getAvailableStaff calls GET /category-hub-counts/staff with search filter", async () => {
      const mockStaff = [
        {
          id: "staff-1",
          name: "Ramesh Kumar",
          email: "ramesh@example.com",
          phone: "9876543210",
          assigned_hubs: ["Gachibowli (KITCHEN)"],
          assignments_count: 1,
        },
      ];
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockStaff);
      const res = await getAvailableStaff("Ramesh");
      expect(spy).toHaveBeenCalledWith("/category-hub-counts/staff?search=Ramesh", {
        method: "GET",
      });
      expect(res.length).toBe(1);
      expect(res[0].email).toBe("ramesh@example.com");
    });
  });

  describe("Hub Locations Endpoints (UUID Identifier)", () => {
    it("listHubLocations calls GET /category-hub-counts/locations with query filters", async () => {
      const mockLocations = {
        data: [
          {
            id: "loc-uuid-1",
            hub_name: "Gachibowli",
            location_name: "Indiranagar",
            pincode: "500032",
            is_active: true,
          },
        ],
        pagination: { total: 1, page: 1, limit: 100, total_pages: 1 },
      };
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockLocations);
      const res = await listHubLocations({ search: "Indiranagar", is_active: true, page: 1, limit: 100 });
      expect(spy).toHaveBeenCalledWith(
        "/category-hub-counts/locations?search=Indiranagar&is_active=true&page=1&limit=100",
        { method: "GET" }
      );
      expect(res.data.length).toBe(1);
    });

    it("getAllHubLocations handles multi-page pagination safely", async () => {
      const page1 = {
        data: [{ id: "l1", hub_name: "Hub 1" }],
        pagination: { total: 2, page: 1, limit: 100, total_pages: 2 },
      };
      const page2 = {
        data: [{ id: "l2", hub_name: "Hub 2" }],
        pagination: { total: 2, page: 2, limit: 100, total_pages: 2 },
      };
      const spy = jest
        .spyOn(apiClientModule, "request")
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce(page2);

      const all = await getAllHubLocations();
      expect(spy).toHaveBeenCalledTimes(2);
      expect(all).toHaveLength(2);
      expect(all[0].id).toBe("l1");
      expect(all[1].id).toBe("l2");
    });

    it("createHubLocation calls POST /category-hub-counts/locations with valid payload", async () => {
      const payload = {
        hub_name: "Hitec City",
        location_name: "Madhapur",
        pincode: "500081",
        is_active: true,
      };
      const mockCreated = { id: "new-uuid", ...payload };
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockCreated);
      const res = await createHubLocation(payload);
      expect(spy).toHaveBeenCalledWith("/category-hub-counts/locations", {
        method: "POST",
        body: payload,
      });
      expect(res.id).toBe("new-uuid");
    });

    it("createHubLocation throws when required fields are missing", async () => {
      await expect(createHubLocation({ hub_name: "Hitec City" })).rejects.toThrow(
        "hub_name, location_name, and pincode are required."
      );
    });

    it("getHubLocation calls GET /category-hub-counts/locations/{uuid}", async () => {
      const locationId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
      const mockLoc = { id: locationId, hub_name: "Kondapur" };
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockLoc);
      const res = await getHubLocation(locationId);
      expect(spy).toHaveBeenCalledWith(`/category-hub-counts/locations/${locationId}`, {
        method: "GET",
      });
      expect(res.hub_name).toBe("Kondapur");
    });

    it("updateHubLocation calls PUT /category-hub-counts/locations/{uuid}", async () => {
      const locationId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
      const payload = { location_name: "Botanical Garden Road" };
      const mockUpdated = { id: locationId, ...payload };
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockUpdated);
      const res = await updateHubLocation(locationId, payload);
      expect(spy).toHaveBeenCalledWith(`/category-hub-counts/locations/${locationId}`, {
        method: "PUT",
        body: payload,
      });
      expect(res.location_name).toBe("Botanical Garden Road");
    });

    it("deleteHubLocation calls DELETE /category-hub-counts/locations/{uuid}", async () => {
      const locationId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
      const mockDeleted = { success: true, message: "Deleted", deleted_id: locationId };
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockDeleted);
      const res = await deleteHubLocation(locationId);
      expect(spy).toHaveBeenCalledWith(`/category-hub-counts/locations/${locationId}`, {
        method: "DELETE",
      });
      expect(res.success).toBe(true);
    });
  });

  describe("Category Hub Counts Endpoints (Integer Identifier)", () => {
    it("listCategoryHubCounts calls GET /category-hub-counts with filters", async () => {
      const mockCounts = {
        data: [
          {
            id: 40,
            hub: "Pragathi Nagar",
            location: "Bowrampet, Mallampet",
            locations_list: ["Bowrampet", "Mallampet"],
            category: "KITCHEN",
            count: 2,
            assigned_staff: "staff1@example.com, staff2@example.com",
            assigned_staff_list: ["staff1@example.com", "staff2@example.com"],
            assigned_staff_count: 2,
            is_fully_staffed: true,
          },
        ],
        pagination: { total: 1, page: 1, limit: 50, total_pages: 1 },
      };
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockCounts);
      const res = await listCategoryHubCounts({ hub: "Pragathi Nagar", category: "KITCHEN" });
      expect(spy).toHaveBeenCalledWith("/category-hub-counts?hub=Pragathi+Nagar&category=KITCHEN", {
        method: "GET",
      });
      expect(res.data[0].id).toBe(40);
      expect(res.data[0].is_fully_staffed).toBe(true);
    });

    it("getAllCategoryHubCounts concatenates multi-page results", async () => {
      const page1 = {
        data: [{ id: 10, category: "CARPET" }],
        pagination: { total: 2, page: 1, limit: 100, total_pages: 2 },
      };
      const page2 = {
        data: [{ id: 11, category: "SOFA" }],
        pagination: { total: 2, page: 2, limit: 100, total_pages: 2 },
      };
      const spy = jest
        .spyOn(apiClientModule, "request")
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce(page2);

      const all = await getAllCategoryHubCounts();
      expect(spy).toHaveBeenCalledTimes(2);
      expect(all).toHaveLength(2);
      expect(all[0].id).toBe(10);
      expect(all[1].id).toBe(11);
    });

    it("createCategoryHubCount calls POST /category-hub-counts", async () => {
      const payload = {
        hub: "Pragathi Nagar",
        category: "KITCHEN",
        count: 2,
        assigned_staff: "staff1@example.com, staff2@example.com",
        location: "Bowrampet, Mallampet",
      };
      const mockCreated = { id: 45, ...payload };
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockCreated);
      const res = await createCategoryHubCount(payload);
      expect(spy).toHaveBeenCalledWith("/category-hub-counts", {
        method: "POST",
        body: payload,
      });
      expect(res.id).toBe(45);
    });

    it("createCategoryHubCount throws when required fields are missing", async () => {
      await expect(createCategoryHubCount({ hub: "Hub 1", category: "KITCHEN" })).rejects.toThrow(
        "hub, category, and positive count are required."
      );
    });

    it("getCategoryHubCount calls GET /category-hub-counts/{id} with integer ID", async () => {
      const mockRecord = { id: 40, hub: "Pragathi Nagar", category: "KITCHEN" };
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockRecord);
      const res = await getCategoryHubCount(40);
      expect(spy).toHaveBeenCalledWith("/category-hub-counts/40", { method: "GET" });
      expect(res.id).toBe(40);
    });

    it("updateCategoryHubCount calls PUT /category-hub-counts/{id} with integer ID", async () => {
      const payload = { count: 3, assigned_staff: "staff1@example.com" };
      const mockUpdated = { id: 40, ...payload };
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockUpdated);
      const res = await updateCategoryHubCount(40, payload);
      expect(spy).toHaveBeenCalledWith("/category-hub-counts/40", {
        method: "PUT",
        body: payload,
      });
      expect(res.count).toBe(3);
    });

    it("deleteCategoryHubCount calls DELETE /category-hub-counts/{id} with integer ID", async () => {
      const mockDeleted = { success: true, message: "Deleted", deleted_id: 40 };
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockDeleted);
      const res = await deleteCategoryHubCount(40);
      expect(spy).toHaveBeenCalledWith("/category-hub-counts/40", { method: "DELETE" });
      expect(res.deleted_id).toBe(40);
    });

    it("resetCategoryHubCount calls POST /category-hub-counts/{id}/reset with integer ID", async () => {
      const mockReset = { id: 40, assigned_staff: "", count: 2 };
      const spy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockReset);
      const res = await resetCategoryHubCount(40, { clear_staff: true, reset_count_to: 2 });
      expect(spy).toHaveBeenCalledWith("/category-hub-counts/40/reset", {
        method: "POST",
        body: { clear_staff: true, reset_count_to: 2 },
      });
      expect(res.assigned_staff).toBe("");
    });
  });

  describe("apiClient Integration", () => {
    it("exposes all categoryHubApi methods on default apiClient object", () => {
      expect(typeof apiClientModule.default.getCategoryHubSummary).toBe("function");
      expect(typeof apiClientModule.default.getGroupedHubs).toBe("function");
      expect(typeof apiClientModule.default.getAvailableCategories).toBe("function");
      expect(typeof apiClientModule.default.getAvailableStaff).toBe("function");
      expect(typeof apiClientModule.default.listHubLocations).toBe("function");
      expect(typeof apiClientModule.default.getAllHubLocations).toBe("function");
      expect(typeof apiClientModule.default.createHubLocation).toBe("function");
      expect(typeof apiClientModule.default.getHubLocation).toBe("function");
      expect(typeof apiClientModule.default.updateHubLocation).toBe("function");
      expect(typeof apiClientModule.default.deleteHubLocation).toBe("function");
      expect(typeof apiClientModule.default.listCategoryHubCounts).toBe("function");
      expect(typeof apiClientModule.default.getAllCategoryHubCounts).toBe("function");
      expect(typeof apiClientModule.default.createCategoryHubCount).toBe("function");
      expect(typeof apiClientModule.default.getCategoryHubCount).toBe("function");
      expect(typeof apiClientModule.default.updateCategoryHubCount).toBe("function");
      expect(typeof apiClientModule.default.deleteCategoryHubCount).toBe("function");
      expect(typeof apiClientModule.default.resetCategoryHubCount).toBe("function");
    });
  });
});

