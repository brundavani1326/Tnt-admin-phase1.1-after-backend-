import { request } from "./apiClient";

// ==========================================
// App Version Configuration API (Phase 6 Step 20B)
// Endpoints:
//   GET /app-version-config/{app_type}
//   PUT /app-version-config/{app_type}
// Supported app types: 'customer', 'partner'
// Platform: android
// ==========================================

export const VALID_APP_TYPES = ["customer", "partner"];
export const VALID_UPDATE_POLICIES = ["optional", "mandatory"];

/**
 * Validates and normalizes app_type parameter
 * @param {string} appType - Target app type ('customer' or 'partner')
 * @returns {string} Normalized lower-case app type
 */
export const validateAppType = (appType) => {
  const clean = String(appType || "").trim().toLowerCase();
  if (!VALID_APP_TYPES.includes(clean)) {
    throw new Error("Invalid app type. Allowed values are 'customer' or 'partner'.");
  }
  return clean;
};

/**
 * Validates and sanitizes update payload for App Version Configuration.
 * Ensures only the 7 allowed fields are included and strips server-managed fields.
 *
 * @param {Object} values - Raw form input values
 * @returns {Object} Sanitized payload ready for PUT request
 */
export const validateAppVersionPayload = (values) => {
  if (!values || typeof values !== "object") {
    throw new Error("Payload is required.");
  }

  // 1. Latest Version
  const version = String(values.latest_version || "").trim();
  if (!version) {
    throw new Error("Latest version is required.");
  }

  // 2. Version Codes
  const latestCode = Number(values.latest_version_code);
  const minimumCode = Number(values.minimum_version_code);

  if (
    !Number.isSafeInteger(latestCode) ||
    !Number.isSafeInteger(minimumCode) ||
    latestCode <= 0 ||
    minimumCode <= 0 ||
    minimumCode > latestCode
  ) {
    throw new Error(
      "Enter valid version codes. Minimum code must not exceed latest code."
    );
  }

  // 3. Update Policy
  const policy = String(values.update_policy || "").trim().toLowerCase();
  if (!VALID_UPDATE_POLICIES.includes(policy)) {
    throw new Error("Invalid update policy. Allowed values are 'optional' or 'mandatory'.");
  }

  // 4. Update Message
  const updateMessage = values.update_message ? String(values.update_message) : "";
  if (updateMessage.length > 500) {
    throw new Error("Update message cannot exceed 500 characters.");
  }

  // 5. Update Enabled
  const updateEnabled = Boolean(values.update_enabled);

  // 6. Play Store URL
  const storeUrl = String(values.play_store_url || "").trim();
  let sanitizedStoreUrl = null;

  if (storeUrl) {
    let parsedUrl;
    try {
      parsedUrl = new URL(storeUrl);
    } catch {
      throw new Error("Please enter a valid Play Store URL.");
    }

    if (
      parsedUrl.protocol !== "https:" ||
      (parsedUrl.hostname || "").toLowerCase() !== "play.google.com"
    ) {
      throw new Error("Play Store URL must be an HTTPS Google Play link.");
    }
    sanitizedStoreUrl = storeUrl;
  }

  // Strict whitelist of the 7 allowed payload fields (excluding id, app_type, platform, updated_at, updated_by)
  return {
    latest_version: version,
    latest_version_code: latestCode,
    minimum_version_code: minimumCode,
    update_policy: policy,
    update_message: updateMessage,
    update_enabled: updateEnabled,
    play_store_url: sanitizedStoreUrl,
  };
};

/**
 * Fetch app version configuration for customer or partner Android app.
 *
 * @param {string} appType - 'customer' or 'partner'
 * @returns {Promise<Object>} Version configuration record
 */
export const getAppVersionConfig = async (appType) => {
  const cleanType = validateAppType(appType);
  return request(`/app-version-config/${cleanType}`, {
    method: "GET",
  });
};

/**
 * Update app version configuration for customer or partner Android app.
 *
 * @param {string} appType - 'customer' or 'partner'
 * @param {Object} values - Configuration values to update
 * @returns {Promise<Object>} Updated version configuration record from backend
 */
export const updateAppVersionConfig = async (appType, values) => {
  const cleanType = validateAppType(appType);
  const payload = validateAppVersionPayload(values);

  return request(`/app-version-config/${cleanType}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
};

const appVersionConfigApi = {
  VALID_APP_TYPES,
  VALID_UPDATE_POLICIES,
  validateAppType,
  validateAppVersionPayload,
  getAppVersionConfig,
  updateAppVersionConfig,
};

export default appVersionConfigApi;

