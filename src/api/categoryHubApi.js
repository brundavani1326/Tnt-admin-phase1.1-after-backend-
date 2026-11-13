import { request } from "./apiClient";

// ===========================================================================
// Category Hub Counts & Hub Locations API Client (Phase 6 Step 12B)
// Targets:
//   - Metadata & Aggregations: GET /category-hub-counts/summary, /grouped-hubs, /categories, /staff
//   - Hub Locations (UUID ID): GET, POST, GET/{id}, PUT/{id}, DELETE/{id} under /category-hub-counts/locations
//   - Category Hub Counts (Integer ID): GET, POST, GET/{id}, PUT/{id}, DELETE/{id}, POST/{id}/reset
// ===========================================================================

/**
 * Validate that an ID is a valid string UUID (for hub_locations)
 * @param {string} locationId
 * @returns {string} Clean trimmed UUID string
 */
export const validateLocationUuid = (locationId) => {
  if (!locationId || typeof locationId !== "string" || !locationId.trim()) {
    throw new Error("Valid Hub Location UUID string is required.");
  }
  return locationId.trim();
};

/**
 * Validate that an ID is a valid positive integer (for hub_category_counts)
 * @param {number|string} recordId
 * @returns {number} Valid positive integer
 */
export const validateCategoryCountId = (recordId) => {
  const parsed = parseInt(recordId, 10);
  if (isNaN(parsed) || parsed <= 0) {
    throw new Error("Valid positive integer Category Hub Count ID is required.");
  }
  return parsed;
};

// ===========================================================================
// 1. Metadata, Grouping & Overview Endpoints
// ===========================================================================

/**
 * Retrieve high-level summary metrics across hubs, locations, categories, and staff capacity.
 * @returns {Promise<{
 *   total_hubs: number,
 *   total_locations: number,
 *   total_active_locations: number,
 *   total_category_count_records: number,
 *   total_allocated_capacity: number,
 *   total_assigned_staff_slots: number,
 *   configured_categories_count: number,
 *   total_available_categories: number
 * }>}
 */
export const getCategoryHubSummary = async () => {
  return request("/category-hub-counts/summary", { method: "GET" });
};

/**
 * Retrieve hubs grouped by hub_name with covered locations and configured category counts.
 * @param {string} [search] - Optional search filter by hub name or covered location
 * @returns {Promise<Array<{
 *   hub_name: string,
 *   locations: Array<string>,
 *   locations_count: number,
 *   pincodes: Array<string>,
 *   is_active: boolean,
 *   configured_categories: Array<string>,
 *   configured_categories_count: number,
 *   total_capacity: number,
 *   total_assigned_staff: number
 * }>>}
 */
export const getGroupedHubs = async (search = "") => {
  const query = new URLSearchParams();
  if (search && search.trim()) query.append("search", search.trim());
  const qs = query.toString();
  return request(`/category-hub-counts/grouped-hubs${qs ? `?${qs}` : ""}`, { method: "GET" });
};

/**
 * Retrieve unique sorted service categories from the services catalog for dropdown selection.
 * @returns {Promise<Array<string>>}
 */
export const getAvailableCategories = async () => {
  return request("/category-hub-counts/categories", { method: "GET" });
};

/**
 * Retrieve staff and partner profiles with active hub and category assignments.
 * @param {string} [search] - Optional search filter by staff name or email
 * @returns {Promise<Array<{
 *   id?: string,
 *   name: string,
 *   email: string,
 *   phone?: string,
 *   assigned_hubs: Array<string>,
 *   assignments_count: number
 * }>>}
 */
export const getAvailableStaff = async (search = "") => {
  const query = new URLSearchParams();
  if (search && search.trim()) query.append("search", search.trim());
  const qs = query.toString();
  return request(`/category-hub-counts/staff${qs ? `?${qs}` : ""}`, { method: "GET" });
};

// ===========================================================================
// 2. Hub Locations Endpoints (Identifier: UUID string)
// ===========================================================================

/**
 * List hub locations with optional filtering and pagination.
 * @param {Object} [params]
 * @param {string} [params.search] - Search by hub name, location name, or pincode
 * @param {boolean} [params.is_active] - Filter by active status
 * @param {number} [params.page=1] - Page number (1-based)
 * @param {number} [params.limit=100] - Items per page (max 200)
 * @returns {Promise<{
 *   data: Array<{
 *     id: string,
 *     hub_name: string,
 *     location_name: string,
 *     pincode?: string,
 *     is_active: boolean,
 *     latitude?: number,
 *     longitude?: number,
 *     created_at?: string,
 *     updated_at?: string
 *   }>,
 *   pagination: {
 *     total: number,
 *     page: number,
 *     limit: number,
 *     total_pages: number
 *   }
 * }>}
 */
export const listHubLocations = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.search) query.append("search", params.search);
  if (params.is_active !== undefined && params.is_active !== null) {
    query.append("is_active", String(params.is_active));
  }
  if (params.page !== undefined && params.page !== null) {
    query.append("page", String(params.page));
  }
  if (params.limit !== undefined && params.limit !== null) {
    query.append("limit", String(params.limit));
  }

  const qs = query.toString();
  return request(`/category-hub-counts/locations${qs ? `?${qs}` : ""}`, { method: "GET" });
};

/**
 * Safely retrieve all hub locations across all pages without truncating results.
 * @param {Object} [params]
 * @returns {Promise<Array<Object>>}
 */
export const getAllHubLocations = async (params = {}) => {
  const pageSize = 100;
  const firstPage = await listHubLocations({ ...params, page: 1, limit: pageSize });
  const firstItems = firstPage.data || firstPage.items || (Array.isArray(firstPage) ? firstPage : []);
  const totalPages = firstPage.pagination?.total_pages || 1;

  if (totalPages <= 1) {
    return firstItems;
  }

  let allItems = [...firstItems];
  for (let p = 2; p <= totalPages; p++) {
    const pageRes = await listHubLocations({ ...params, page: p, limit: pageSize });
    const pageItems = pageRes.data || pageRes.items || [];
    allItems = allItems.concat(pageItems);
  }
  return allItems;
};

/**
 * Create a new hub location record.
 * @param {Object} payload
 * @param {string} payload.hub_name - Name of hub cluster
 * @param {string} payload.location_name - Specific area/location
 * @param {string} payload.pincode - Postal code
 * @param {boolean} [payload.is_active=true] - Active flag
 * @param {number} [payload.latitude] - Optional latitude
 * @param {number} [payload.longitude] - Optional longitude
 * @returns {Promise<Object>} Created hub location record
 */
export const createHubLocation = async (payload) => {
  if (!payload || !payload.hub_name || !payload.location_name || !payload.pincode) {
    throw new Error("hub_name, location_name, and pincode are required.");
  }
  return request("/category-hub-counts/locations", {
    method: "POST",
    body: payload,
  });
};

/**
 * Get single hub location by UUID.
 * @param {string} locationId - UUID string
 * @returns {Promise<Object>}
 */
export const getHubLocation = async (locationId) => {
  const validId = validateLocationUuid(locationId);
  return request(`/category-hub-counts/locations/${encodeURIComponent(validId)}`, {
    method: "GET",
  });
};

/**
 * Update an existing hub location by UUID.
 * @param {string} locationId - UUID string
 * @param {Object} payload - Fields to update
 * @returns {Promise<Object>} Updated hub location record
 */
export const updateHubLocation = async (locationId, payload) => {
  const validId = validateLocationUuid(locationId);
  return request(`/category-hub-counts/locations/${encodeURIComponent(validId)}`, {
    method: "PUT",
    body: payload,
  });
};

/**
 * Delete a hub location by UUID.
 * @param {string} locationId - UUID string
 * @returns {Promise<{ success: boolean, message: string, deleted_id: string }>}
 */
export const deleteHubLocation = async (locationId) => {
  const validId = validateLocationUuid(locationId);
  return request(`/category-hub-counts/locations/${encodeURIComponent(validId)}`, {
    method: "DELETE",
  });
};

// ===========================================================================
// 3. Category Hub Counts Endpoints (Identifier: positive integer)
// ===========================================================================

/**
 * List category hub count records with optional filters and pagination.
 * @param {Object} [params]
 * @param {string} [params.hub] - Filter by Hub name
 * @param {string} [params.category] - Filter by Category
 * @param {string} [params.search] - Search category, hub, location, or staff
 * @param {number} [params.page=1] - Page number (1-based)
 * @param {number} [params.limit=50] - Items per page (max 200)
 * @returns {Promise<{
 *   data: Array<{
 *     id: number,
 *     hub: string,
 *     location: string,
 *     locations_list: Array<string>,
 *     category: string,
 *     count: number,
 *     assigned_staff: string,
 *     assigned_staff_list: Array<string>,
 *     assigned_staff_count: number,
 *     is_fully_staffed: boolean,
 *     created_at?: string,
 *     updated_at?: string
 *   }>,
 *   pagination: {
 *     total: number,
 *     page: number,
 *     limit: number,
 *     total_pages: number
 *   }
 * }>}
 */
export const listCategoryHubCounts = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.hub) query.append("hub", params.hub);
  if (params.category) query.append("category", params.category);
  if (params.search) query.append("search", params.search);
  if (params.page !== undefined && params.page !== null) {
    query.append("page", String(params.page));
  }
  if (params.limit !== undefined && params.limit !== null) {
    query.append("limit", String(params.limit));
  }

  const qs = query.toString();
  return request(`/category-hub-counts${qs ? `?${qs}` : ""}`, { method: "GET" });
};

/**
 * Safely retrieve all category hub count records across all pages without truncating.
 * @param {Object} [params]
 * @returns {Promise<Array<Object>>}
 */
export const getAllCategoryHubCounts = async (params = {}) => {
  const pageSize = 100;
  const firstPage = await listCategoryHubCounts({ ...params, page: 1, limit: pageSize });
  const firstItems = firstPage.data || firstPage.items || (Array.isArray(firstPage) ? firstPage : []);
  const totalPages = firstPage.pagination?.total_pages || 1;

  if (totalPages <= 1) {
    return firstItems;
  }

  let allItems = [...firstItems];
  for (let p = 2; p <= totalPages; p++) {
    const pageRes = await listCategoryHubCounts({ ...params, page: p, limit: pageSize });
    const pageItems = pageRes.data || pageRes.items || [];
    allItems = allItems.concat(pageItems);
  }
  return allItems;
};

/**
 * Create a new category hub count record.
 * @param {Object} payload
 * @param {string} payload.hub - Hub name
 * @param {string} payload.category - Category name
 * @param {number} payload.count - Capacity count (>= 1)
 * @param {string|Array<string>} [payload.assigned_staff] - Assigned staff emails
 * @param {string|Array<string>} [payload.location] - Locations covered
 * @returns {Promise<Object>} Created category count record
 */
export const createCategoryHubCount = async (payload) => {
  if (!payload || !payload.hub || !payload.category || !payload.count) {
    throw new Error("hub, category, and positive count are required.");
  }
  return request("/category-hub-counts", {
    method: "POST",
    body: payload,
  });
};

/**
 * Get a single category hub count record by integer ID.
 * @param {number|string} recordId - Positive integer ID
 * @returns {Promise<Object>}
 */
export const getCategoryHubCount = async (recordId) => {
  const validId = validateCategoryCountId(recordId);
  return request(`/category-hub-counts/${encodeURIComponent(validId)}`, {
    method: "GET",
  });
};

/**
 * Update an existing category hub count record by integer ID.
 * @param {number|string} recordId - Positive integer ID
 * @param {Object} payload - Fields to update
 * @returns {Promise<Object>} Updated category count record
 */
export const updateCategoryHubCount = async (recordId, payload) => {
  const validId = validateCategoryCountId(recordId);
  return request(`/category-hub-counts/${encodeURIComponent(validId)}`, {
    method: "PUT",
    body: payload,
  });
};

/**
 * Delete a category hub count record by integer ID.
 * @param {number|string} recordId - Positive integer ID
 * @returns {Promise<{ success: boolean, message: string, deleted_id: number }>}
 */
export const deleteCategoryHubCount = async (recordId) => {
  const validId = validateCategoryCountId(recordId);
  return request(`/category-hub-counts/${encodeURIComponent(validId)}`, {
    method: "DELETE",
  });
};

/**
 * Reset staff assignments or capacity on an existing category count record.
 * @param {number|string} recordId - Positive integer ID
 * @param {Object} [payload]
 * @param {boolean} [payload.clear_staff=true] - Clear assigned staff
 * @param {number} [payload.reset_count_to] - Optional new capacity count
 * @returns {Promise<Object>} Updated category count record
 */
export const resetCategoryHubCount = async (recordId, payload = {}) => {
  const validId = validateCategoryCountId(recordId);
  return request(`/category-hub-counts/${encodeURIComponent(validId)}/reset`, {
    method: "POST",
    body: {
      clear_staff: payload.clear_staff !== undefined ? payload.clear_staff : true,
      reset_count_to: payload.reset_count_to !== undefined ? payload.reset_count_to : undefined,
    },
  });
};

const categoryHubApi = {
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
};

export default categoryHubApi;

