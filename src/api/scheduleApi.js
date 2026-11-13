import { request } from "./apiClient";

// ===========================================================================
// Schedule and Service Time Management API (Phase 6 Step 8B)
// Target Table: schedule_config
// Keys: time_slots, years, service_time_rules, date_time_slots
// ===========================================================================

/**
 * Retrieve the full schedule configuration including:
 * - time_slots: list of { value: string, active: boolean }
 * - years: list of { value: number, active: boolean }
 * - service_time_rules: list of { service_name: string, last_booking_time: string }
 * - date_time_slots: object mapping "YYYY-MM-DD" to array of enabled slot strings
 * @returns {Promise<Object>} Full schedule configuration object
 */
export const getScheduleConfig = async () => {
  return request("/schedule/config", { method: "GET" });
};

/**
 * Bulk or partial update of schedule configuration sections
 * @param {Object} payload - Object containing one or more sections: time_slots, years, service_time_rules, date_time_slots
 * @returns {Promise<Object>} Updated full schedule configuration
 */
export const updateScheduleConfig = async (payload) => {
  if (!payload || typeof payload !== "object") {
    throw new Error("payload object is required to update schedule configuration.");
  }
  return request("/schedule/config", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
};

/**
 * Retrieve a single schedule configuration section by key
 * @param {string} key - 'time_slots' | 'years' | 'service_time_rules' | 'date_time_slots'
 * @returns {Promise<{ config_key: string, config_value: any }>}
 */
export const getScheduleConfigKey = async (key) => {
  if (!key) {
    throw new Error("key is required to retrieve schedule configuration section.");
  }
  return request(`/schedule/config/${encodeURIComponent(key)}`, { method: "GET" });
};

/**
 * Update a single configuration section key in schedule_config
 * @param {string} key - 'time_slots' | 'years' | 'service_time_rules' | 'date_time_slots'
 * @param {any} value - New value to store for this configuration key
 * @returns {Promise<Object>} Backend response with status, config_key, config_value, and message
 */
export const updateScheduleConfigKey = async (key, value) => {
  if (!key) {
    throw new Error("key is required to update schedule configuration section.");
  }
  return request(`/schedule/config/${encodeURIComponent(key)}`, {
    method: "PUT",
    body: JSON.stringify({ value }),
  });
};

/**
 * Retrieve all service last booking cutoff time rules sorted alphabetically
 * @returns {Promise<Array<{ service_name: string, last_booking_time: string }>>}
 */
export const getServiceTimeRules = async () => {
  return request("/schedule/service-times", { method: "GET" });
};

/**
 * Replace entire list of service last booking cutoff rules
 * @param {Array<{ service_name: string, last_booking_time: string }>} rules
 * @returns {Promise<Array<{ service_name: string, last_booking_time: string }>>}
 */
export const updateServiceTimeRules = async (rules) => {
  if (!Array.isArray(rules)) {
    throw new Error("rules must be an array of service cutoff rules.");
  }
  return request("/schedule/service-times", {
    method: "PUT",
    body: JSON.stringify(rules),
  });
};

/**
 * Add a new service cutoff rule, or update an existing rule with matching service_name
 * @param {{ service_name: string, last_booking_time: string }} rule
 * @returns {Promise<Array<{ service_name: string, last_booking_time: string }>>}
 */
export const addServiceTimeRule = async (rule) => {
  if (!rule || !rule.service_name || !rule.last_booking_time) {
    throw new Error("rule must include both service_name and last_booking_time.");
  }
  return request("/schedule/service-times", {
    method: "POST",
    body: JSON.stringify(rule),
  });
};

/**
 * Delete a single service last booking time cutoff rule
 * @param {string} serviceName - Target service name to remove
 * @returns {Promise<Object>} Deletion result and updated rules list
 */
export const deleteServiceTimeRule = async (serviceName) => {
  if (!serviceName) {
    throw new Error("serviceName is required to delete service time rule.");
  }
  return request(`/schedule/service-times/${encodeURIComponent(serviceName)}`, {
    method: "DELETE",
  });
};

/**
 * Retrieve time slots for a specific calendar date (YYYY-MM-DD)
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<{ date: string, slots: Array<string>, is_custom: boolean, master_active_count: number }>}
 */
export const getDateSpecificSlots = async (date) => {
  if (!date) {
    throw new Error("date is required to retrieve date-specific slots.");
  }
  return request(`/schedule/slots/date?date=${encodeURIComponent(date)}`, {
    method: "GET",
  });
};

/**
 * Save custom time slots for a specific calendar date
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {Array<string>} slots - List of active slot strings for this date
 * @returns {Promise<Object>} Saved slots response
 */
export const saveDateSpecificSlots = async (date, slots) => {
  if (!date || !Array.isArray(slots)) {
    throw new Error("date and slots array are required to save date-specific slots.");
  }
  return request("/schedule/slots/date", {
    method: "PUT",
    body: JSON.stringify({ date, slots }),
  });
};

/**
 * Reset a calendar date's custom time slots to follow master default slots
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<Object>} Reset response
 */
export const resetDateSlots = async (date) => {
  if (!date) {
    throw new Error("date is required to reset date slots.");
  }
  return request(`/schedule/slots/date/${encodeURIComponent(date)}`, {
    method: "DELETE",
  });
};

/**
 * Retrieve master time slots sorted chronologically
 * @returns {Promise<Array<{ value: string, active: boolean }>>}
 */
export const getMasterTimeSlots = async () => {
  return request("/schedule/time-slots", { method: "GET" });
};

/**
 * Replace master time slots list
 * @param {Array<{ value: string, active: boolean }>} slots
 * @returns {Promise<Object>}
 */
export const updateMasterTimeSlots = async (slots) => {
  if (!Array.isArray(slots)) {
    throw new Error("slots must be an array of time slot objects.");
  }
  return request("/schedule/time-slots", {
    method: "PUT",
    body: JSON.stringify(slots),
  });
};

/**
 * Retrieve enabled booking years sorted ascending
 * @returns {Promise<Array<{ value: number, active: boolean }>>}
 */
export const getBookingYears = async () => {
  return request("/schedule/years", { method: "GET" });
};

/**
 * Replace enabled booking years list
 * @param {Array<{ value: number, active: boolean }>} years
 * @returns {Promise<Object>}
 */
export const updateBookingYears = async (years) => {
  if (!Array.isArray(years)) {
    throw new Error("years must be an array of year objects.");
  }
  return request("/schedule/years", {
    method: "PUT",
    body: JSON.stringify(years),
  });
};

const scheduleApi = {
  getScheduleConfig,
  updateScheduleConfig,
  getScheduleConfigKey,
  updateScheduleConfigKey,
  getServiceTimeRules,
  updateServiceTimeRules,
  addServiceTimeRule,
  deleteServiceTimeRule,
  getDateSpecificSlots,
  saveDateSpecificSlots,
  resetDateSlots,
  getMasterTimeSlots,
  updateMasterTimeSlots,
  getBookingYears,
  updateBookingYears,
};

export default scheduleApi;

