import { request } from "./apiClient";

// ===========================================================================
// Pricing Management API (Phase 6 Step 9B)
// Targets:
//   - Services pricing: GET/PUT /pricing/services, PUT /pricing/services/batch
//   - Calculations & Summary: POST /pricing/calculate, GET /pricing/summary
//   - Add-on pricing: GET/PUT /pricing/add-ons
// ===========================================================================

/**
 * List all services with pricing attributes ordered alphabetically by title
 * @returns {Promise<Array<Object>>} List of services with pricing and margin attributes
 */
export const getPricingServices = async () => {
  return request("/pricing/services", { method: "GET" });
};

/**
 * Get pricing details for a single service by UUID
 * @param {string} serviceId - 36-character UUID string
 * @returns {Promise<Object>} Service pricing record
 */
export const getServicePricing = async (serviceId) => {
  if (!serviceId) {
    throw new Error("serviceId is required to retrieve service pricing.");
  }
  return request(`/pricing/services/${encodeURIComponent(serviceId)}`, { method: "GET" });
};

/**
 * Update pricing attributes for a single service
 * @param {string} serviceId - 36-character UUID string
 * @param {Object} payload - Fields to update: { title?, price?, discount_percent?, admin_amount?, staff_amount?, auto_calculate_admin_amount? }
 * @returns {Promise<Object>} Updated service pricing record
 */
export const updateServicePricing = async (serviceId, payload) => {
  if (!serviceId) {
    throw new Error("serviceId is required to update service pricing.");
  }
  if (!payload || typeof payload !== "object") {
    throw new Error("payload object is required to update service pricing.");
  }
  return request(`/pricing/services/${encodeURIComponent(serviceId)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
};

/**
 * Batch update multiple service pricing records in a single request.
 * Matches frontend 'handleSaveAllPricing' action.
 * @param {Array<Object>|{ services: Array<Object> }} servicesOrPayload - Array of service pricing items or wrapped object
 * @returns {Promise<{ status: string, updated_count: number, total_requested: number, services: Array<Object>, errors: Array<Object>|null, message: string }>}
 */
export const batchUpdateServicesPricing = async (servicesOrPayload) => {
  const body = Array.isArray(servicesOrPayload)
    ? { services: servicesOrPayload }
    : servicesOrPayload;

  if (!body || !Array.isArray(body.services) || body.services.length === 0) {
    throw new Error("Batch update requires a non-empty array of services.");
  }

  return request("/pricing/services/batch", {
    method: "PUT",
    body: JSON.stringify(body),
  });
};

/**
 * Calculate discounted price and admin share from given price inputs
 * @param {Object} payload - { price, staff_amount, discount_percent }
 * @returns {Promise<{ price: number, discount_percent: number, discounted_price: number, staff_amount: number, admin_amount: number, formatted_admin_amount: string, formatted_price: string, formatted_staff_amount: string, margin_percent: number }>}
 */
export const calculatePricing = async (payload) => {
  if (!payload || typeof payload !== "object") {
    throw new Error("payload object is required for pricing calculation.");
  }
  return request("/pricing/calculate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

/**
 * Retrieve pricing summary metrics and margin health analysis
 * @returns {Promise<{ total_services: number, average_price: number, average_staff_amount: number, average_admin_margin: number, discounted_services_count: number, negative_margin_count: number, negative_margin_services: Array<Object> }>}
 */
export const getPricingSummary = async () => {
  return request("/pricing/summary", { method: "GET" });
};

/**
 * List all add-ons with pricing attributes
 * @returns {Promise<Array<Object>>} List of add-ons with pricing attributes
 */
export const getAddonsPricing = async () => {
  return request("/pricing/add-ons", { method: "GET" });
};

/**
 * Update pricing attributes for a single add-on
 * @param {string} addonId - 36-character UUID string
 * @param {Object} payload - { price, original_price?, discount_percent? }
 * @returns {Promise<Object>} Updated add-on pricing record
 */
export const updateAddonPricing = async (addonId, payload) => {
  if (!addonId) {
    throw new Error("addonId is required to update add-on pricing.");
  }
  if (!payload || typeof payload !== "object") {
    throw new Error("payload object is required to update add-on pricing.");
  }
  return request(`/pricing/add-ons/${encodeURIComponent(addonId)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
};

const pricingApi = {
  getPricingServices,
  getServicePricing,
  updateServicePricing,
  batchUpdateServicesPricing,
  calculatePricing,
  getPricingSummary,
  getAddonsPricing,
  updateAddonPricing,
};

export default pricingApi;

