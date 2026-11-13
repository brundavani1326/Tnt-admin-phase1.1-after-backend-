import apiClient, {
  ApiError,
  request,
  getHealth,
  getDatabaseHealth,
  getAccessToken,
  setSessionTokens,
  clearSessionTokens,
  API_PREFIX,
  API_BASE_URL,
} from "./apiClient";

describe("Centralized API Client & Connectivity Audit Unit Tests (Step 18B)", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    window.sessionStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("Configuration & Base URL Assembly", () => {
    it("ensures API_PREFIX is strictly '/api/v1/admin'", () => {
      expect(API_PREFIX).toBe("/api/v1/admin");
    });

    it("ensures API_BASE_URL does not end with /api/v1/admin to avoid prefix duplication", () => {
      expect(API_BASE_URL.endsWith("/api/v1/admin")).toBe(false);
    });

    it("assembles request URLs with single API prefix", async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ status: "healthy" }),
      });
      global.fetch = mockFetch;

      await request("/health");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain("/api/v1/admin/health");
      expect(calledUrl).not.toContain("/api/v1/admin/api/v1/admin");
    });
  });

  describe("Request Headers & Content-Type Behavior", () => {
    it("automatically sets Content-Type to application/json for standard requests", async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true }),
      });
      global.fetch = mockFetch;

      await request("/test-endpoint", {
        method: "POST",
        body: JSON.stringify({ key: "value" }),
      });

      const options = mockFetch.mock.calls[0][1];
      expect(options.headers["Content-Type"]).toBe("application/json");
      expect(options.headers["Accept"]).toBe("application/json");
    });

    it("omits Content-Type header when body is FormData to allow browser boundary calculation", async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true }),
      });
      global.fetch = mockFetch;

      const formData = new FormData();
      formData.append("file", "dummy-content");

      await request("/upload-endpoint", {
        method: "POST",
        body: formData,
      });

      const options = mockFetch.mock.calls[0][1];
      expect(options.headers["Content-Type"]).toBeUndefined();
    });

    it("attaches Bearer Authorization header when access token is present in sessionStorage", async () => {
      setSessionTokens({ access_token: "test-admin-jwt-token" });

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true }),
      });
      global.fetch = mockFetch;

      await request("/protected-endpoint");

      const options = mockFetch.mock.calls[0][1];
      expect(options.headers["Authorization"]).toBe("Bearer test-admin-jwt-token");
    });

    it("does not attach Authorization header when no session exists", async () => {
      clearSessionTokens();

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true }),
      });
      global.fetch = mockFetch;

      await request("/public-endpoint");

      const options = mockFetch.mock.calls[0][1];
      expect(options.headers["Authorization"]).toBeUndefined();
    });
  });

  describe("HTTP Status Code & Error Handling", () => {
    it("preserves HTTP 400 Bad Request with server error message", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ detail: "Invalid request parameters" }),
      });

      await expect(request("/bad-request")).rejects.toMatchObject({
        name: "ApiError",
        status: 400,
        message: "Invalid request parameters",
      });
    });

    it("preserves HTTP 403 Forbidden without triggering silent privileged fallback", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ detail: "Administrator privileges required" }),
      });

      await expect(request("/admin-only")).rejects.toMatchObject({
        name: "ApiError",
        status: 403,
        message: "Administrator privileges required",
      });
    });

    it("preserves HTTP 404 Not Found error code and detail", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ detail: "Resource not found" }),
      });

      await expect(request("/non-existent")).rejects.toMatchObject({
        name: "ApiError",
        status: 404,
        message: "Resource not found",
      });
    });

    it("preserves HTTP 409 Conflict error code and detail", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 409,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ detail: "Booking already rescheduled" }),
      });

      await expect(request("/conflict-endpoint")).rejects.toMatchObject({
        name: "ApiError",
        status: 409,
        message: "Booking already rescheduled",
      });
    });

    it("formats FastAPI array validation errors (HTTP 422) into clean readable strings", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 422,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          detail: [
            { loc: ["body", "new_date"], msg: "Invalid date format", type: "value_error" },
            { loc: ["body", "new_time"], msg: "Field required", type: "missing" },
          ],
        }),
      });

      await expect(request("/validation-fail")).rejects.toMatchObject({
        name: "ApiError",
        status: 422,
        message: "Invalid date format; Field required",
      });
    });

    it("formats custom error envelope (error.details) cleanly into readable string", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 422,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Request validation failed",
            details: [
              { field: "booking_id", message: "UUID required" },
            ],
          },
        }),
      });

      await expect(request("/envelope-fail")).rejects.toMatchObject({
        name: "ApiError",
        status: 422,
        message: "Request validation failed: booking_id: UUID required",
      });
    });

    it("preserves HTTP 503 Service Unavailable fail-closed preview guard message", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 503,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          detail: "Booking rescheduling is currently in preview mode. Live rescheduling is not enabled.",
        }),
      });

      await expect(request("/guarded-action")).rejects.toMatchObject({
        name: "ApiError",
        status: 503,
        message: "Booking rescheduling is currently in preview mode. Live rescheduling is not enabled.",
      });
    });

    it("throws informative error on network disconnect", async () => {
      global.fetch = jest.fn().mockRejectedValue(new TypeError("Failed to fetch"));

      await expect(request("/any-route")).rejects.toMatchObject({
        name: "ApiError",
        status: 0,
        message: "Unable to connect to the Admin server. Please verify the backend is running.",
      });
    });

    it("throws timeout error when request is aborted due to timeout", async () => {
      const abortError = new Error("The operation was aborted");
      abortError.name = "AbortError";
      global.fetch = jest.fn().mockRejectedValue(abortError);

      await expect(request("/timeout-route", { timeoutMs: 5000 })).rejects.toMatchObject({
        name: "ApiError",
        status: 0,
        message: "Request timed out after 5s. Please verify the Admin server is running.",
      });
    });
  });

  describe("HTTP 401 Session Renewal & Refresh Coordination", () => {
    it("clears session tokens and throws 401 when refresh token is missing", async () => {
      setSessionTokens({ access_token: "expired-token" });

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ detail: "Token expired" }),
      });

      await expect(request("/protected")).rejects.toMatchObject({
        name: "ApiError",
        status: 401,
        message: "Session expired. Please log in again.",
      });

      expect(getAccessToken()).toBeNull();
    });

    it("automatically refreshes session and retries request when refresh token is available", async () => {
      setSessionTokens({
        access_token: "expired-token",
        refresh_token: "valid-refresh-token",
      });

      const mockFetch = jest
        .fn()
        // 1st call: Original request returns 401
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({ detail: "Token expired" }),
        })
        // 2nd call: POST /auth/refresh succeeds with new tokens
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({
            access_token: "new-access-token",
            refresh_token: "new-refresh-token",
            expires_in: 3600,
            user: { id: "admin-uuid", email: "admin@theneatify.com" },
          }),
        })
        // 3rd call: Retried request succeeds
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({ data: "success" }),
        });

      global.fetch = mockFetch;

      const result = await request("/data");
      expect(result).toEqual({ data: "success" });

      expect(mockFetch).toHaveBeenCalledTimes(3);
      // Verify refresh endpoint was called
      expect(mockFetch.mock.calls[1][0]).toContain("/auth/refresh");
      // Verify retry was made with new token
      expect(mockFetch.mock.calls[2][1].headers["Authorization"]).toBe("Bearer new-access-token");
      // Verify session storage was updated
      expect(getAccessToken()).toBe("new-access-token");
    });
  });

  describe("System Health Check Helpers", () => {
    it("getHealth calls GET /api/v1/admin/health", async () => {
      const mockHealth = {
        status: "healthy",
        project: "Neatify Admin Backend",
        environment: "development",
        version: "1.0.0",
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => mockHealth,
      });

      const res = await getHealth();
      expect(res.status).toBe("healthy");
      expect(res.project).toBe("Neatify Admin Backend");
    });

    it("getDatabaseHealth calls GET /api/v1/admin/health/db", async () => {
      const mockDbHealth = {
        status: "healthy",
        database: "supabase",
        connected: true,
        message: "Database connection verified",
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => mockDbHealth,
      });

      const res = await getDatabaseHealth();
      expect(res.status).toBe("healthy");
      expect(res.connected).toBe(true);
    });
  });

  describe("apiClient Default Export Integrity", () => {
    it("exports all required core and health functions", () => {
      expect(typeof apiClient.request).toBe("function");
      expect(typeof apiClient.login).toBe("function");
      expect(typeof apiClient.logout).toBe("function");
      expect(typeof apiClient.refreshSession).toBe("function");
      expect(typeof apiClient.getMe).toBe("function");
      expect(typeof apiClient.getCurrentAdmin).toBe("function");
      expect(typeof apiClient.getHealth).toBe("function");
      expect(typeof apiClient.getDatabaseHealth).toBe("function");
    });
  });
});

