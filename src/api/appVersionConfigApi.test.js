import * as apiClientModule from "./apiClient";
import appVersionConfigApi, {
  VALID_APP_TYPES,
  VALID_UPDATE_POLICIES,
  validateAppType,
  validateAppVersionPayload,
  getAppVersionConfig,
  updateAppVersionConfig,
} from "./appVersionConfigApi";
import { supabase } from "../supabase";

describe("App Version Configuration API Unit Tests (Phase 6 Step 20B)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Validation Rules & Payload Sanitization", () => {
    it("validates valid app types 'customer' and 'partner' case-insensitively", () => {
      expect(validateAppType("customer")).toBe("customer");
      expect(validateAppType("partner")).toBe("partner");
      expect(validateAppType("  CUSTOMER  ")).toBe("customer");
      expect(validateAppType("Partner")).toBe("partner");
    });

    it("rejects invalid app types", () => {
      expect(() => validateAppType("admin")).toThrow(
        "Invalid app type. Allowed values are 'customer' or 'partner'."
      );
      expect(() => validateAppType("")).toThrow(
        "Invalid app type. Allowed values are 'customer' or 'partner'."
      );
      expect(() => validateAppType(null)).toThrow(
        "Invalid app type. Allowed values are 'customer' or 'partner'."
      );
      expect(() => validateAppType(undefined)).toThrow(
        "Invalid app type. Allowed values are 'customer' or 'partner'."
      );
    });

    it("validates and sanitizes a complete valid payload", () => {
      const rawInput = {
        id: "forbidden-uuid-1234",
        app_type: "customer",
        platform: "android",
        updated_at: "2026-11-04T10:00:00Z",
        updated_by: "admin@neatify.com",
        latest_version: "  2.1.0  ",
        latest_version_code: "15",
        minimum_version_code: "10",
        update_policy: "mandatory",
        update_message: "Please update for critical fixes.",
        update_enabled: true,
        play_store_url: "https://play.google.com/store/apps/details?id=com.neatify.customer",
      };

      const sanitized = validateAppVersionPayload(rawInput);

      expect(sanitized).toEqual({
        latest_version: "2.1.0",
        latest_version_code: 15,
        minimum_version_code: 10,
        update_policy: "mandatory",
        update_message: "Please update for critical fixes.",
        update_enabled: true,
        play_store_url: "https://play.google.com/store/apps/details?id=com.neatify.customer",
      });

      // Strict verification that forbidden server-managed fields are stripped
      expect(sanitized.id).toBeUndefined();
      expect(sanitized.app_type).toBeUndefined();
      expect(sanitized.platform).toBeUndefined();
      expect(sanitized.updated_at).toBeUndefined();
      expect(sanitized.updated_by).toBeUndefined();
    });

    it("enforces minimum_version_code <= latest_version_code", () => {
      expect(() =>
        validateAppVersionPayload({
          latest_version: "1.0.0",
          latest_version_code: 10,
          minimum_version_code: 11,
          update_policy: "optional",
        })
      ).toThrow("Enter valid version codes. Minimum code must not exceed latest code.");
    });

    it("rejects non-integer, zero or negative version codes", () => {
      expect(() =>
        validateAppVersionPayload({
          latest_version: "1.0.0",
          latest_version_code: 0,
          minimum_version_code: 1,
          update_policy: "optional",
        })
      ).toThrow("Enter valid version codes. Minimum code must not exceed latest code.");

      expect(() =>
        validateAppVersionPayload({
          latest_version: "1.0.0",
          latest_version_code: -5,
          minimum_version_code: -10,
          update_policy: "optional",
        })
      ).toThrow("Enter valid version codes. Minimum code must not exceed latest code.");

      expect(() =>
        validateAppVersionPayload({
          latest_version: "1.0.0",
          latest_version_code: "abc",
          minimum_version_code: 1,
          update_policy: "optional",
        })
      ).toThrow("Enter valid version codes. Minimum code must not exceed latest code.");
    });

    it("requires non-empty latest_version", () => {
      expect(() =>
        validateAppVersionPayload({
          latest_version: "   ",
          latest_version_code: 5,
          minimum_version_code: 5,
          update_policy: "optional",
        })
      ).toThrow("Latest version is required.");
    });

    it("validates update_policy allows only optional or mandatory", () => {
      expect(() =>
        validateAppVersionPayload({
          latest_version: "1.0.0",
          latest_version_code: 5,
          minimum_version_code: 5,
          update_policy: "force",
        })
      ).toThrow("Invalid update policy. Allowed values are 'optional' or 'mandatory'.");
    });

    it("validates Play Store URL accepts only HTTPS play.google.com links or null", () => {
      // Empty or absent URL converts to null
      expect(
        validateAppVersionPayload({
          latest_version: "1.0.0",
          latest_version_code: 5,
          minimum_version_code: 5,
          update_policy: "optional",
          play_store_url: "",
        }).play_store_url
      ).toBeNull();

      expect(
        validateAppVersionPayload({
          latest_version: "1.0.0",
          latest_version_code: 5,
          minimum_version_code: 5,
          update_policy: "optional",
          play_store_url: null,
        }).play_store_url
      ).toBeNull();

      // Non-HTTPS rejected
      expect(() =>
        validateAppVersionPayload({
          latest_version: "1.0.0",
          latest_version_code: 5,
          minimum_version_code: 5,
          update_policy: "optional",
          play_store_url: "http://play.google.com/store/apps/details?id=com.neatify",
        })
      ).toThrow("Play Store URL must be an HTTPS Google Play link.");

      // Non play.google.com hostname rejected
      expect(() =>
        validateAppVersionPayload({
          latest_version: "1.0.0",
          latest_version_code: 5,
          minimum_version_code: 5,
          update_policy: "optional",
          play_store_url: "https://apple.com/app",
        })
      ).toThrow("Play Store URL must be an HTTPS Google Play link.");

      // Invalid URL string rejected
      expect(() =>
        validateAppVersionPayload({
          latest_version: "1.0.0",
          latest_version_code: 5,
          minimum_version_code: 5,
          update_policy: "optional",
          play_store_url: "not a valid url",
        })
      ).toThrow("Please enter a valid Play Store URL.");
    });
  });

  describe("GET /app-version-config/{app_type}", () => {
    it("fetches customer app version configuration", async () => {
      const mockConfig = {
        id: "c1111111-1111-1111-1111-111111111111",
        app_type: "customer",
        platform: "android",
        latest_version: "1.2.0",
        latest_version_code: 20,
        minimum_version_code: 15,
        update_policy: "optional",
        update_message: "New features available",
        update_enabled: true,
        play_store_url: "https://play.google.com/store/apps/details?id=com.neatify.customer",
        updated_at: "2026-11-04T08:00:00Z",
        updated_by: "admin@neatify.com",
      };

      const requestSpy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockConfig);

      const result = await getAppVersionConfig("customer");

      expect(requestSpy).toHaveBeenCalledWith("/app-version-config/customer", {
        method: "GET",
      });
      expect(result).toEqual(mockConfig);
    });

    it("fetches partner app version configuration", async () => {
      const mockConfig = {
        id: "p2222222-2222-2222-2222-222222222222",
        app_type: "partner",
        platform: "android",
        latest_version: "1.1.5",
        latest_version_code: 18,
        minimum_version_code: 12,
        update_policy: "mandatory",
        update_message: "Critical partner fix",
        update_enabled: true,
        play_store_url: "https://play.google.com/store/apps/details?id=com.neatify.partner",
        updated_at: "2026-11-04T08:30:00Z",
        updated_by: "admin@neatify.com",
      };

      const requestSpy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockConfig);

      const result = await getAppVersionConfig("partner");

      expect(requestSpy).toHaveBeenCalledWith("/app-version-config/partner", {
        method: "GET",
      });
      expect(result).toEqual(mockConfig);
    });

    it("fails early if appType is invalid without calling backend", async () => {
      const requestSpy = jest.spyOn(apiClientModule, "request");

      await expect(getAppVersionConfig("unknown_app")).rejects.toThrow("Invalid app type");
      expect(requestSpy).not.toHaveBeenCalled();
    });

    it("propagates 404 or 503 ApiError from request wrapper", async () => {
      jest
        .spyOn(apiClientModule, "request")
        .mockRejectedValueOnce(new apiClientModule.ApiError("App version configuration for 'customer' not found.", 404));

      await expect(getAppVersionConfig("customer")).rejects.toThrow("App version configuration for 'customer' not found.");
    });
  });

  describe("PUT /app-version-config/{app_type}", () => {
    it("updates customer configuration sending ONLY the 7 allowed fields", async () => {
      const formInput = {
        id: "c1111111-1111-1111-1111-111111111111",
        app_type: "customer",
        platform: "android",
        latest_version: "1.3.0",
        latest_version_code: "25",
        minimum_version_code: "20",
        update_policy: "mandatory",
        update_message: "Mandatory system update",
        update_enabled: true,
        play_store_url: "https://play.google.com/store/apps/details?id=com.neatify.customer",
        updated_at: "2026-11-04T09:00:00Z",
        updated_by: "admin@neatify.com",
      };

      const mockResponse = {
        ...formInput,
        latest_version_code: 25,
        minimum_version_code: 20,
        updated_at: "2026-11-04T09:05:00Z",
        updated_by: "superadmin@neatify.com",
      };

      const requestSpy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockResponse);

      const result = await updateAppVersionConfig("customer", formInput);

      expect(requestSpy).toHaveBeenCalledTimes(1);
      const [endpoint, options] = requestSpy.mock.calls[0];
      expect(endpoint).toBe("/app-version-config/customer");
      expect(options.method).toBe("PUT");

      const parsedBody = JSON.parse(options.body);
      expect(parsedBody).toEqual({
        latest_version: "1.3.0",
        latest_version_code: 25,
        minimum_version_code: 20,
        update_policy: "mandatory",
        update_message: "Mandatory system update",
        update_enabled: true,
        play_store_url: "https://play.google.com/store/apps/details?id=com.neatify.customer",
      });

      // Assert forbidden fields are absent
      expect(parsedBody.id).toBeUndefined();
      expect(parsedBody.app_type).toBeUndefined();
      expect(parsedBody.platform).toBeUndefined();
      expect(parsedBody.updated_at).toBeUndefined();
      expect(parsedBody.updated_by).toBeUndefined();

      expect(result).toEqual(mockResponse);
    });

    it("updates partner configuration sending properly formatted payload", async () => {
      const formInput = {
        latest_version: "2.0.1",
        latest_version_code: 32,
        minimum_version_code: 28,
        update_policy: "optional",
        update_message: "Bug fixes and improvements",
        update_enabled: false,
        play_store_url: "https://play.google.com/store/apps/details?id=com.neatify.partner",
      };

      const mockResponse = {
        id: "p2222222-2222-2222-2222-222222222222",
        app_type: "partner",
        platform: "android",
        ...formInput,
      };

      const requestSpy = jest.spyOn(apiClientModule, "request").mockResolvedValueOnce(mockResponse);

      const result = await updateAppVersionConfig("partner", formInput);

      expect(requestSpy).toHaveBeenCalledWith(
        "/app-version-config/partner",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify(formInput),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it("rejects PUT if validation fails prior to HTTP request", async () => {
      const requestSpy = jest.spyOn(apiClientModule, "request");

      await expect(
        updateAppVersionConfig("customer", {
          latest_version: "",
          latest_version_code: 10,
          minimum_version_code: 5,
        })
      ).rejects.toThrow("Latest version is required.");

      expect(requestSpy).not.toHaveBeenCalled();
    });

    it("handles backend 422 Unprocessable Entity gracefully", async () => {
      jest.spyOn(apiClientModule, "request").mockRejectedValueOnce(
        new apiClientModule.ApiError("Minimum version code cannot exceed latest version code.", 422)
      );

      await expect(
        updateAppVersionConfig("customer", {
          latest_version: "1.0.0",
          latest_version_code: 10,
          minimum_version_code: 5,
          update_policy: "optional",
        })
      ).rejects.toThrow("Minimum version code cannot exceed latest version code.");
    });
  });

  describe("Security & Architecture Invariants", () => {
    it("never calls Supabase SDK directly for App Version Configuration", () => {
      const supabaseFromSpy = jest.spyOn(supabase, "from");

      expect(supabaseFromSpy).not.toHaveBeenCalled();
    });

    it("re-exports all functions on default appVersionConfigApi export", () => {
      expect(appVersionConfigApi.getAppVersionConfig).toBe(getAppVersionConfig);
      expect(appVersionConfigApi.updateAppVersionConfig).toBe(updateAppVersionConfig);
      expect(appVersionConfigApi.validateAppType).toBe(validateAppType);
      expect(appVersionConfigApi.validateAppVersionPayload).toBe(validateAppVersionPayload);
      expect(appVersionConfigApi.VALID_APP_TYPES).toEqual(VALID_APP_TYPES);
      expect(appVersionConfigApi.VALID_UPDATE_POLICIES).toEqual(VALID_UPDATE_POLICIES);
    });

    it("is exposed on the centralized apiClient object", () => {
      expect(apiClientModule.default.getAppVersionConfig).toBeDefined();
      expect(apiClientModule.default.updateAppVersionConfig).toBeDefined();
    });
  });
});

