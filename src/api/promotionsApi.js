import { request } from "./apiClient";

// ==========================================
// Coupons API
// ==========================================
export const getCoupons = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.search) query.append("search", params.search);
  if (params.is_used !== undefined && params.is_used !== null) {
    query.append("is_used", params.is_used);
  }
  if (params.is_active !== undefined && params.is_active !== null) {
    query.append("is_active", params.is_active);
  }
  const qs = query.toString();
  return request(`/coupons${qs ? `?${qs}` : ""}`, { method: "GET" });
};

export const getCoupon = async (couponId) => {
  return request(`/coupons/${encodeURIComponent(couponId)}`, { method: "GET" });
};

export const createCoupon = async (couponData) => {
  return request("/coupons", {
    method: "POST",
    body: JSON.stringify(couponData),
  });
};

export const patchCoupon = async (couponId, couponData) => {
  return request(`/coupons/${encodeURIComponent(couponId)}`, {
    method: "PATCH",
    body: JSON.stringify(couponData),
  });
};

export const deleteCoupon = async (couponId) => {
  return request(`/coupons/${encodeURIComponent(couponId)}`, {
    method: "DELETE",
  });
};

// ==========================================
// Offers API
// ==========================================
export const getOffers = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.service_type) query.append("service_type", params.service_type);
  if (params.is_offer_enabled !== undefined && params.is_offer_enabled !== null) {
    query.append("is_offer_enabled", params.is_offer_enabled);
  }
  const qs = query.toString();
  return request(`/offers${qs ? `?${qs}` : ""}`, { method: "GET" });
};

export const getOffer = async (offerId) => {
  return request(`/offers/${encodeURIComponent(offerId)}`, { method: "GET" });
};

export const createOffer = async (offerData) => {
  return request("/offers", {
    method: "POST",
    body: JSON.stringify(offerData),
  });
};

export const patchOffer = async (offerId, offerData) => {
  return request(`/offers/${encodeURIComponent(offerId)}`, {
    method: "PATCH",
    body: JSON.stringify(offerData),
  });
};

export const deleteOffer = async (offerId) => {
  return request(`/offers/${encodeURIComponent(offerId)}`, {
    method: "DELETE",
  });
};

// ==========================================
// App Popups API
// ==========================================
export const getPopups = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.is_active !== undefined && params.is_active !== null) {
    query.append("is_active", params.is_active);
  }
  const qs = query.toString();
  return request(`/popups${qs ? `?${qs}` : ""}`, { method: "GET" });
};

export const getPopup = async (popupId) => {
  return request(`/popups/${encodeURIComponent(popupId)}`, { method: "GET" });
};

export const createPopup = async (popupData) => {
  return request("/popups", {
    method: "POST",
    body: JSON.stringify(popupData),
  });
};

export const patchPopup = async (popupId, popupData) => {
  return request(`/popups/${encodeURIComponent(popupId)}`, {
    method: "PATCH",
    body: JSON.stringify(popupData),
  });
};

export const deletePopup = async (popupId) => {
  return request(`/popups/${encodeURIComponent(popupId)}`, {
    method: "DELETE",
  });
};

// ==========================================
// Popup Image Upload API
// ==========================================
export const uploadPopupImage = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return request("/popups/upload-image", {
    method: "POST",
    body: formData,
  });
};

const promotionsApi = {
  getCoupons,
  getCoupon,
  createCoupon,
  patchCoupon,
  deleteCoupon,
  getOffers,
  getOffer,
  createOffer,
  patchOffer,
  deleteOffer,
  getPopups,
  getPopup,
  createPopup,
  patchPopup,
  deletePopup,
  uploadPopupImage,
};

export default promotionsApi;

