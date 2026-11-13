import { request } from "./apiClient";

// ==========================================
// Staff App Hero Images API (Phase 6 Step 6B)
// Target Table: hero_images (UUID id)
// Storage Bucket: hero-images
// ==========================================

/**
 * List all staff hero images ordered by priority ASC and created_at DESC
 * @param {Object} [params] - Filter options
 * @param {boolean} [params.is_active] - Optional filter by active status
 * @returns {Promise<Array>} List of hero image objects
 */
export const getHeroImages = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.is_active !== undefined && params.is_active !== null) {
    query.append("is_active", String(params.is_active));
  }
  const qs = query.toString();
  return request(`/hero-images${qs ? `?${qs}` : ""}`, { method: "GET" });
};

/**
 * Get single staff hero image details by UUID
 * @param {string} imageId - 36-character UUID string
 * @returns {Promise<Object>} Hero image details
 */
export const getHeroImage = async (imageId) => {
  if (!imageId) {
    throw new Error("imageId is required");
  }
  return request(`/hero-images/${encodeURIComponent(imageId)}`, { method: "GET" });
};

/**
 * Backend-mediated upload of image file to hero-images storage bucket
 * @param {File} file - Image file (JPEG, PNG, WEBP, <= 5MB)
 * @returns {Promise<{success: boolean, image_path: string, image_url: string, bucket: string}>}
 */
export const uploadHeroImage = async (file) => {
  if (!file) {
    throw new Error("A valid image file is required for upload.");
  }
  const formData = new FormData();
  formData.append("file", file);
  return request("/hero-images/upload", {
    method: "POST",
    body: formData,
  });
};

/**
 * Create a new staff hero image record
 * @param {Object} imageData - Payload
 * @param {string} imageData.image_path - Storage path or filename
 * @param {boolean} [imageData.is_active] - Active status (defaults to true)
 * @param {number} [imageData.priority] - Display priority (auto-sequenced by backend if omitted)
 * @returns {Promise<Object>} Created hero image record
 */
export const createHeroImage = async (imageData) => {
  if (!imageData || !imageData.image_path) {
    throw new Error("image_path is required to create a hero image.");
  }
  return request("/hero-images", {
    method: "POST",
    body: JSON.stringify(imageData),
  });
};

/**
 * Update an existing staff hero image
 * @param {string} imageId - UUID string
 * @param {Object} imageData - Fields to update (image_path, is_active, priority)
 * @returns {Promise<Object>} Updated hero image record
 */
export const updateHeroImage = async (imageId, imageData) => {
  if (!imageId) {
    throw new Error("imageId is required to update a hero image.");
  }
  return request(`/hero-images/${encodeURIComponent(imageId)}`, {
    method: "PUT",
    body: JSON.stringify(imageData),
  });
};

/**
 * Delete a staff hero image record
 * @param {string} imageId - UUID string
 * @returns {Promise<{status: string, id: string, message: string}>} Deletion status response
 */
export const deleteHeroImage = async (imageId) => {
  if (!imageId) {
    throw new Error("imageId is required to delete a hero image.");
  }
  return request(`/hero-images/${encodeURIComponent(imageId)}`, {
    method: "DELETE",
  });
};

/**
 * Reorder staff hero images display priorities
 * @param {Object} reorderData - Either { items: [{ id, priority }] } or { image_ids: [string] }
 * @returns {Promise<{status: string, message: string, updated_count: number}>} Reorder response
 */
export const reorderHeroImages = async (reorderData) => {
  if (!reorderData || (!reorderData.items && !reorderData.image_ids)) {
    throw new Error("reorderData must contain either 'items' or 'image_ids'.");
  }
  return request("/hero-images/reorder", {
    method: "PATCH",
    body: JSON.stringify(reorderData),
  });
};


// ==========================================
// Customer Website Hero Images API (Phase 6 Step 6D)
// Target Table: web-hero-images (integer id)
// Storage Bucket: web-hero-images
// ==========================================

/**
 * List all customer website hero images ordered by priority ASC and created_at DESC
 * @param {Object} [params] - Filter options
 * @param {boolean} [params.is_active] - Optional filter by active status
 * @returns {Promise<Array>} List of website hero image objects
 */
export const getWebHeroImages = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.is_active !== undefined && params.is_active !== null) {
    query.append("is_active", String(params.is_active));
  }
  const qs = query.toString();
  return request(`/web-hero-images${qs ? `?${qs}` : ""}`, { method: "GET" });
};

/**
 * Get single customer website hero image details by positive integer ID
 * @param {number|string} imageId - Positive integer ID
 * @returns {Promise<Object>} Website hero image details
 */
export const getWebHeroImage = async (imageId) => {
  if (imageId === undefined || imageId === null || imageId === "") {
    throw new Error("imageId is required");
  }
  return request(`/web-hero-images/${encodeURIComponent(String(imageId).trim())}`, { method: "GET" });
};

/**
 * Backend-mediated upload of image file to web-hero-images storage bucket
 * @param {File} file - Image file (JPEG, PNG, WEBP, <= 5MB)
 * @returns {Promise<{success: boolean, image_path: string, image_url: string, bucket: string}>}
 */
export const uploadWebHeroImage = async (file) => {
  if (!file) {
    throw new Error("A valid image file is required for upload.");
  }
  const formData = new FormData();
  formData.append("file", file);
  return request("/web-hero-images/upload", {
    method: "POST",
    body: formData,
  });
};

/**
 * Create a new customer website hero image record
 * @param {Object} imageData - Payload
 * @param {string} imageData.image_path - Storage path or filename
 * @param {boolean} [imageData.is_active] - Active status (defaults to true)
 * @param {number} [imageData.priority] - Display priority (auto-sequenced by backend if omitted)
 * @returns {Promise<Object>} Created website hero image record
 */
export const createWebHeroImage = async (imageData) => {
  if (!imageData || !imageData.image_path) {
    throw new Error("image_path is required to create a web hero image.");
  }
  return request("/web-hero-images", {
    method: "POST",
    body: JSON.stringify(imageData),
  });
};

/**
 * Update an existing customer website hero image
 * @param {number|string} imageId - Positive integer ID
 * @param {Object} imageData - Fields to update (image_path, is_active, priority)
 * @returns {Promise<Object>} Updated website hero image record
 */
export const updateWebHeroImage = async (imageId, imageData) => {
  if (imageId === undefined || imageId === null || imageId === "") {
    throw new Error("imageId is required to update a web hero image.");
  }
  return request(`/web-hero-images/${encodeURIComponent(String(imageId).trim())}`, {
    method: "PUT",
    body: JSON.stringify(imageData),
  });
};

/**
 * Delete a customer website hero image record
 * @param {number|string} imageId - Positive integer ID
 * @returns {Promise<{status: string, id: number, message: string}>} Deletion status response
 */
export const deleteWebHeroImage = async (imageId) => {
  if (imageId === undefined || imageId === null || imageId === "") {
    throw new Error("imageId is required to delete a web hero image.");
  }
  return request(`/web-hero-images/${encodeURIComponent(String(imageId).trim())}`, {
    method: "DELETE",
  });
};

/**
 * Reorder customer website hero images display priorities
 * @param {Object} reorderData - Either { items: [{ id: number, priority: number }] } or { image_ids: [number] }
 * @returns {Promise<{status: string, message: string, updated_count: number}>} Reorder response
 */
export const reorderWebHeroImages = async (reorderData) => {
  if (!reorderData || (!reorderData.items && !reorderData.image_ids)) {
    throw new Error("reorderData must contain either 'items' or 'image_ids'.");
  }
  return request("/web-hero-images/reorder", {
    method: "PATCH",
    body: JSON.stringify(reorderData),
  });
};


// ==========================================
// Customer App Hero Banners API (Phase 6 Step 6D)
// Target Table: hero_banners (UUID id)
// Storage Bucket: hero-images
// ==========================================

/**
 * List all customer app hero banners ordered by priority ASC
 * @param {Object} [params] - Filter options
 * @param {boolean} [params.is_active] - Optional filter by active status
 * @returns {Promise<Array>} List of app hero banner objects
 */
export const getAppHeroImages = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.is_active !== undefined && params.is_active !== null) {
    query.append("is_active", String(params.is_active));
  }
  const qs = query.toString();
  return request(`/app-hero-images${qs ? `?${qs}` : ""}`, { method: "GET" });
};

/**
 * Get single customer app hero banner details by UUID
 * @param {string} imageId - 36-character UUID string
 * @returns {Promise<Object>} App hero banner details
 */
export const getAppHeroImage = async (imageId) => {
  if (!imageId) {
    throw new Error("imageId is required");
  }
  return request(`/app-hero-images/${encodeURIComponent(imageId)}`, { method: "GET" });
};

/**
 * Backend-mediated upload of image file to hero-images storage bucket for Customer App
 * @param {File} file - Image file (JPEG, PNG, WEBP, <= 5MB)
 * @returns {Promise<{success: boolean, image_path: string, image_url: string, bucket: string}>}
 */
export const uploadAppHeroImage = async (file) => {
  if (!file) {
    throw new Error("A valid image file is required for upload.");
  }
  const formData = new FormData();
  formData.append("file", file);
  return request("/app-hero-images/upload", {
    method: "POST",
    body: formData,
  });
};

/**
 * Create a new customer app hero banner record
 * @param {Object} imageData - Payload
 * @param {string} imageData.image_path - Storage path or filename
 * @param {boolean} [imageData.is_active] - Active status (defaults to true)
 * @param {number} [imageData.priority] - Display priority (auto-sequenced by backend if omitted)
 * @returns {Promise<Object>} Created app hero banner record
 */
export const createAppHeroImage = async (imageData) => {
  if (!imageData || !imageData.image_path) {
    throw new Error("image_path is required to create an app hero banner.");
  }
  return request("/app-hero-images", {
    method: "POST",
    body: JSON.stringify(imageData),
  });
};

/**
 * Update an existing customer app hero banner
 * @param {string} imageId - UUID string
 * @param {Object} imageData - Fields to update (image_path, is_active, priority)
 * @returns {Promise<Object>} Updated app hero banner record
 */
export const updateAppHeroImage = async (imageId, imageData) => {
  if (!imageId) {
    throw new Error("imageId is required to update an app hero banner.");
  }
  return request(`/app-hero-images/${encodeURIComponent(imageId)}`, {
    method: "PUT",
    body: JSON.stringify(imageData),
  });
};

/**
 * Delete a customer app hero banner record
 * @param {string} imageId - UUID string
 * @returns {Promise<{status: string, id: string, message: string}>} Deletion status response
 */
export const deleteAppHeroImage = async (imageId) => {
  if (!imageId) {
    throw new Error("imageId is required to delete an app hero banner.");
  }
  return request(`/app-hero-images/${encodeURIComponent(imageId)}`, {
    method: "DELETE",
  });
};

/**
 * Reorder customer app hero banners display priorities
 * @param {Object} reorderData - Either { items: [{ id: string, priority: number }] } or { image_ids: [string] }
 * @returns {Promise<{status: string, message: string, updated_count: number}>} Reorder response
 */
export const reorderAppHeroImages = async (reorderData) => {
  if (!reorderData || (!reorderData.items && !reorderData.image_ids)) {
    throw new Error("reorderData must contain either 'items' or 'image_ids'.");
  }
  return request("/app-hero-images/reorder", {
    method: "PATCH",
    body: JSON.stringify(reorderData),
  });
};


const heroImagesApi = {
  // Staff App
  getHeroImages,
  getHeroImage,
  uploadHeroImage,
  uploadHeroImageFile: uploadHeroImage,
  createHeroImage,
  updateHeroImage,
  deleteHeroImage,
  reorderHeroImages,

  // Customer Website
  getWebHeroImages,
  getWebHeroImage,
  uploadWebHeroImage,
  createWebHeroImage,
  updateWebHeroImage,
  deleteWebHeroImage,
  reorderWebHeroImages,

  // Customer App
  getAppHeroImages,
  getAppHeroImage,
  uploadAppHeroImage,
  createAppHeroImage,
  updateAppHeroImage,
  deleteAppHeroImage,
  reorderAppHeroImages,
  // Customer App Banners aliases
  getAppHeroBanners: getAppHeroImages,
  getAppHeroBanner: getAppHeroImage,
  uploadAppHeroBanner: uploadAppHeroImage,
  createAppHeroBanner: createAppHeroImage,
  updateAppHeroBanner: updateAppHeroImage,
  deleteAppHeroBanner: deleteAppHeroImage,
  reorderAppHeroBanners: reorderAppHeroImages,
};

export default heroImagesApi;
