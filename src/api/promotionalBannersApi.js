import { request } from "./apiClient";

// ==========================================
// Promotional Banners API (Phase 6 Step 7B)
// Target Table: promotional_banners (UUID id)
// Junctions: promotional_banner_locations, promotional_banner_services
// Storage Bucket: promotional_banners
// ==========================================

/**
 * List all promotional banners ordered by display_order ASC
 * @param {Object} [params] - Filter options
 * @param {boolean} [params.is_active] - Optional filter by active status
 * @param {string} [params.banner_type] - Optional filter by banner_type ('customer_app', 'website', 'partner_app')
 * @returns {Promise<Array>} List of promotional banner objects
 */
export const getPromotionalBanners = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.is_active !== undefined && params.is_active !== null) {
    query.append("is_active", String(params.is_active));
  }
  if (params.banner_type) {
    query.append("banner_type", params.banner_type);
  }
  const qs = query.toString();
  return request(`/promotional-banners${qs ? `?${qs}` : ""}`, { method: "GET" });
};

/**
 * Get single promotional banner details by UUID
 * @param {string} bannerId - 36-character UUID string
 * @returns {Promise<Object>} Promotional banner details including location_ids and service_ids
 */
export const getPromotionalBanner = async (bannerId) => {
  if (!bannerId) {
    throw new Error("bannerId is required");
  }
  return request(`/promotional-banners/${encodeURIComponent(bannerId)}`, { method: "GET" });
};

/**
 * Create a new promotional banner record with location and service associations
 * @param {Object} bannerData - Payload
 * @returns {Promise<Object>} Created promotional banner record
 */
export const createPromotionalBanner = async (bannerData) => {
  if (!bannerData) {
    throw new Error("bannerData is required to create a promotional banner.");
  }
  return request("/promotional-banners", {
    method: "POST",
    body: JSON.stringify(bannerData),
  });
};

/**
 * Update an existing promotional banner and its associations
 * @param {string} bannerId - 36-character UUID string
 * @param {Object} bannerData - Fields to update
 * @returns {Promise<Object>} Updated promotional banner record
 */
export const updatePromotionalBanner = async (bannerId, bannerData) => {
  if (!bannerId) {
    throw new Error("bannerId is required to update a promotional banner.");
  }
  return request(`/promotional-banners/${encodeURIComponent(bannerId)}`, {
    method: "PUT",
    body: JSON.stringify(bannerData),
  });
};

/**
 * Delete a promotional banner record and its associations permanently
 * @param {string} bannerId - 36-character UUID string
 * @returns {Promise<{status: string, id: string, message: string}>} Deletion status response
 */
export const deletePromotionalBanner = async (bannerId) => {
  if (!bannerId) {
    throw new Error("bannerId is required to delete a promotional banner.");
  }
  return request(`/promotional-banners/${encodeURIComponent(bannerId)}`, {
    method: "DELETE",
  });
};

/**
 * Backend-mediated upload of image file to promotional_banners storage bucket
 * @param {File} file - Image file (JPEG, PNG, WEBP, <= 5MB)
 * @returns {Promise<{success: boolean, image_path: string, image_url: string, bucket: string}>}
 */
export const uploadPromotionalBanner = async (file) => {
  if (!file) {
    throw new Error("A valid image file is required for upload.");
  }
  const formData = new FormData();
  formData.append("file", file);
  return request("/promotional-banners/upload", {
    method: "POST",
    body: formData,
  });
};

/**
 * Toggle the active status of a promotional banner
 * @param {string} bannerId - 36-character UUID string
 * @returns {Promise<{id: string, is_active: boolean, message: string}>} Updated status
 */
export const togglePromotionalBannerActive = async (bannerId) => {
  if (!bannerId) {
    throw new Error("bannerId is required to toggle banner status.");
  }
  return request(`/promotional-banners/${encodeURIComponent(bannerId)}/toggle-active`, {
    method: "PATCH",
  });
};

/**
 * Reorder promotional banners display order
 * @param {Object} reorderData - Either { items: [{ id: string, display_order: number }] } or { banner_ids: [string] }
 * @returns {Promise<{status: string, message: string, updated_count: number}>} Reorder response
 */
export const reorderPromotionalBanners = async (reorderData) => {
  if (!reorderData || (!reorderData.items && !reorderData.banner_ids)) {
    throw new Error("reorderData must contain either 'items' or 'banner_ids'.");
  }
  return request("/promotional-banners/reorder", {
    method: "PATCH",
    body: JSON.stringify(reorderData),
  });
};

/**
 * Retrieve available hub locations for promotional targeting
 * @returns {Promise<Array>} List of hub locations
 */
export const getBannerLocations = async () => {
  return request("/promotional-banners/locations", { method: "GET" });
};

const promotionalBannersApi = {
  getPromotionalBanners,
  getPromotionalBanner,
  createPromotionalBanner,
  updatePromotionalBanner,
  deletePromotionalBanner,
  uploadPromotionalBanner,
  uploadPromotionalBannerImage: uploadPromotionalBanner,
  togglePromotionalBannerActive,
  reorderPromotionalBanners,
  getBannerLocations,
  getPromotionalBannerLocations: getBannerLocations,
};

export default promotionalBannersApi;

