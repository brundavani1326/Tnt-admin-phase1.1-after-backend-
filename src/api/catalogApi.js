import { request } from "./apiClient";

// ==========================================
// Categories API
// ==========================================
export const getCategories = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.sort_by) query.append("sort_by", params.sort_by);
  if (params.sort_order) query.append("sort_order", params.sort_order);
  const qs = query.toString();
  return request(`/categories${qs ? `?${qs}` : ""}`, { method: "GET" });
};

export const getCategory = async (categoryId) => {
  return request(`/categories/${encodeURIComponent(categoryId)}`, { method: "GET" });
};

export const createCategory = async (categoryData) => {
  return request("/categories", {
    method: "POST",
    body: JSON.stringify(categoryData),
  });
};

export const updateCategory = async (categoryId, categoryData) => {
  return request(`/categories/${encodeURIComponent(categoryId)}`, {
    method: "PUT",
    body: JSON.stringify(categoryData),
  });
};

export const deleteCategory = async (categoryId) => {
  return request(`/categories/${encodeURIComponent(categoryId)}`, {
    method: "DELETE",
  });
};

// ==========================================
// Services API
// ==========================================
export const getServices = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.service_type && params.service_type !== "ALL") query.append("service_type", params.service_type);
  if (params.main_category_id && params.main_category_id !== "ALL") query.append("main_category_id", params.main_category_id);
  if (params.sort_by) query.append("sort_by", params.sort_by);
  if (params.sort_order) query.append("sort_order", params.sort_order);
  const qs = query.toString();
  return request(`/services${qs ? `?${qs}` : ""}`, { method: "GET" });
};

export const getServiceTypes = async (mainCategoryId = null) => {
  const query = new URLSearchParams();
  if (mainCategoryId && mainCategoryId !== "ALL") query.append("main_category_id", mainCategoryId);
  const qs = query.toString();
  return request(`/services/types${qs ? `?${qs}` : ""}`, { method: "GET" });
};

export const getService = async (serviceId) => {
  return request(`/services/${encodeURIComponent(serviceId)}`, { method: "GET" });
};

export const createService = async (serviceData) => {
  return request("/services", {
    method: "POST",
    body: JSON.stringify(serviceData),
  });
};

export const updateService = async (serviceId, serviceData) => {
  return request(`/services/${encodeURIComponent(serviceId)}`, {
    method: "PUT",
    body: JSON.stringify(serviceData),
  });
};

export const deleteService = async (serviceId) => {
  return request(`/services/${encodeURIComponent(serviceId)}`, {
    method: "DELETE",
  });
};

// ==========================================
// Add-ons API
// ==========================================
export const getAddons = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.service_type && params.service_type !== "ALL") query.append("service_type", params.service_type);
  if (params.is_active !== undefined && params.is_active !== null) query.append("is_active", String(params.is_active));
  if (params.sort_by) query.append("sort_by", params.sort_by);
  if (params.sort_order) query.append("sort_order", params.sort_order);
  const qs = query.toString();
  return request(`/addons${qs ? `?${qs}` : ""}`, { method: "GET" });
};

export const getAddon = async (addonId) => {
  return request(`/addons/${encodeURIComponent(addonId)}`, { method: "GET" });
};

export const createAddon = async (addonData) => {
  return request("/addons", {
    method: "POST",
    body: JSON.stringify(addonData),
  });
};

export const updateAddon = async (addonId, addonData) => {
  return request(`/addons/${encodeURIComponent(addonId)}`, {
    method: "PUT",
    body: JSON.stringify(addonData),
  });
};

export const deleteAddon = async (addonId) => {
  return request(`/addons/${encodeURIComponent(addonId)}`, {
    method: "DELETE",
  });
};

// ==========================================
// Storage Upload API
// ==========================================
export const uploadCatalogImage = async (file, bucket = "category-icons", folder = "main") => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("bucket", bucket);
  formData.append("folder", folder);

  return request("/catalog/upload-image", {
    method: "POST",
    body: formData,
  });
};

const catalogApi = {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getServices,
  getServiceTypes,
  getService,
  createService,
  updateService,
  deleteService,
  getAddons,
  getAddon,
  createAddon,
  updateAddon,
  deleteAddon,
  uploadCatalogImage,
};

export default catalogApi;

