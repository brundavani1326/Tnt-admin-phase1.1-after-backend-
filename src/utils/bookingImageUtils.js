/**
 * Utility functions for safely parsing, normalizing, and resolving booking photos
 * and skip reasons across Admin Manual and standard bookings.
 *
 * Step 22B: Fix Start Image and End Image Display for Admin Manual Bookings.
 */

/**
 * Checks whether a string represents a valid image URL or data URI.
 * @param {any} str - Value to test
 * @returns {boolean} True if string starts with http://, https://, or data:image/
 */
export const isImageUrl = (str) => {
  if (typeof str !== "string") return false;
  const s = str.toLowerCase().trim();
  return s.startsWith("http://") || s.startsWith("https://") || s.startsWith("data:image/");
};

/**
 * Narrowly scoped, safe extractor for HTTP/HTTPS URLs from legacy or malformed strings.
 * Avoids global apostrophe replacement (which corrupts URLs or filenames) and never uses eval.
 *
 * @param {string} str - Raw string possibly containing URLs
 * @returns {string[]} Array of matched URLs
 */
export const safeExtractUrls = (str) => {
  if (typeof str !== "string") return [];
  const matches = str.match(/https?:\/\/[^\s'"`,\])]+/gi);
  return matches ? Array.from(matches) : [];
};

/**
 * Safely parses photo data into an array of image URLs or string messages.
 * Handles:
 * - Standard JSON array strings (e.g. '["https://..."]')
 * - Already parsed arrays (e.g. ['https://...'])
 * - Direct HTTPS image URLs (e.g. 'https://...')
 * - Legacy Python single-quoted lists (e.g. "['https://...']")
 * - Skipped reasons (e.g. 'Skipped: Camera not working')
 * - Missing / empty photos (returns [])
 *
 * @param {any} img - Raw image value from booking or upload record
 * @returns {string[]} Array of image URLs or status strings
 */
export const getImages = (img) => {
  if (!img) return [];
  if (Array.isArray(img)) {
    return img.filter((item) => item !== null && item !== undefined && String(item).trim() !== "");
  }
  if (typeof img === "string") {
    const trimmed = img.trim();
    if (!trimmed || trimmed === "[]" || trimmed === '[""]') return [];

    // 1. Standard JSON array string (preferred normalized backend format)
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.filter((item) => item !== null && item !== undefined && String(item).trim() !== "");
        }
      } catch {
        // Fall through to safe URL extraction for legacy malformed stringified lists
      }

      // 2. Safe URL extraction for single-quoted Python lists (e.g. "['https://...']")
      const extracted = safeExtractUrls(trimmed);
      if (extracted.length > 0) {
        return extracted;
      }
    }

    // 3. Direct single image URL
    if (isImageUrl(trimmed)) {
      return [trimmed];
    }

    // 4. Skipped photo reasons or non-URL descriptions
    return [trimmed];
  }
  return [String(img)];
};

/**
 * Extracts URLs and corresponding labels from a service_uploads section (before or after).
 * Handles:
 * - Synthesized Step 22A dictionary ({ upload_1: 'https://...', ... })
 * - Synthesized Step 22A skip indicator ({ _skipped: true, _skip_reason: '...' })
 * - Standard arrays of URLs or objects with { url, label }
 * - Direct string URLs or skip reasons
 *
 * @param {any} sectionObj - before or after section from service_uploads
 * @returns {{ urls: string[], labels: string[], skipReason: string | null }}
 */
export const extractUrlsAndLabels = (sectionObj) => {
  let urls = [];
  let labels = [];
  let skipReason = null;

  if (!sectionObj) return { urls, labels, skipReason };

  // 1. Direct string
  if (typeof sectionObj === "string") {
    const trimmed = sectionObj.trim();
    if (trimmed) {
      const parsedImages = getImages(trimmed);
      parsedImages.forEach((img, idx) => {
        urls.push(img);
        if (isImageUrl(img)) {
          labels.push(parsedImages.length > 1 ? `upload_${idx + 1}` : "");
        } else {
          labels.push("Skip Reason");
          skipReason = img;
        }
      });
    }
    return { urls, labels, skipReason };
  }

  // 2. Array of items
  if (Array.isArray(sectionObj)) {
    sectionObj.forEach((item, idx) => {
      if (typeof item === "string" && item.trim()) {
        const val = item.trim();
        urls.push(val);
        labels.push(isImageUrl(val) ? `upload_${idx + 1}` : "Skip Reason");
        if (!isImageUrl(val)) skipReason = val;
      } else if (item && typeof item === "object") {
        if (item._skipped || item.skipped || item._skip_reason || item.skip_reason) {
          const reason = item._skip_reason || item.skip_reason || item.reason || "Skipped";
          urls.push(reason);
          labels.push("Skip Reason");
          skipReason = reason;
        } else {
          const uUrl = item.url || item.src || item.path || Object.values(item)[0];
          if (typeof uUrl === "string" && uUrl.trim()) {
            urls.push(uUrl.trim());
            labels.push(item.label || item.name || `upload_${idx + 1}`);
          }
        }
      }
    });
    return { urls, labels, skipReason };
  }

  // 3. Object / Dictionary
  if (typeof sectionObj === "object") {
    if (sectionObj._skipped || sectionObj.skipped || sectionObj._skip_reason || sectionObj.skip_reason) {
      const reason =
        sectionObj._skip_reason ||
        sectionObj.skip_reason ||
        sectionObj.reason ||
        (typeof sectionObj._skipped === "string" ? sectionObj._skipped : "Photo capture skipped");
      urls.push(reason);
      labels.push("Skip Reason");
      skipReason = reason;
      return { urls, labels, skipReason };
    }

    Object.entries(sectionObj).forEach(([key, val]) => {
      if (key === "_skipped" || key === "skipped") return;
      if (typeof val === "string" && val.trim()) {
        urls.push(val.trim());
        labels.push(key);
        if (!isImageUrl(val.trim())) skipReason = val.trim();
      } else if (Array.isArray(val)) {
        val.forEach((v) => {
          if (typeof v === "string" && v.trim()) {
            urls.push(v.trim());
            labels.push(key);
            if (!isImageUrl(v.trim())) skipReason = v.trim();
          }
        });
      } else if (val && typeof val === "object") {
        const uUrl = val.url || val.src || val.path;
        if (typeof uUrl === "string" && uUrl.trim()) {
          urls.push(uUrl.trim());
          labels.push(val.label || val.name || key);
        }
      }
    });
  }

  return { urls, labels, skipReason };
};

/**
 * Determines whether the View Image button should be enabled in the Completed tab.
 * Does NOT restrict by payment_status.
 * If image availability is only known after fetching booking details, returns true
 * to allow opening the viewer.
 *
 * @param {Object} b - Booking object
 * @param {"start" | "end"} type - Image column type
 * @param {Object} [uploadsMap] - Cached uploads mapping
 * @returns {boolean} Whether button is enabled
 */
export const isImageAvailable = (b, type, uploadsMap = {}) => {
  if (!b) return false;
  const isStart = type === "start";
  const directPhoto = isStart ? b.start_photo_url : b.end_photo_url;

  // 1. Direct photo exists on booking row (URL string, array, or skip reason)
  if (directPhoto) {
    if (Array.isArray(directPhoto) && directPhoto.length > 0) return true;
    if (typeof directPhoto === "string" && directPhoto.trim()) {
      const trimmed = directPhoto.trim();
      if (trimmed !== "[]" && trimmed !== '[""]') return true;
    }
  }

  // 2. If uploads have already been fetched and cached for this booking:
  const uploadData = uploadsMap ? uploadsMap[b.id] : undefined;
  if (uploadData !== undefined) {
    let rawUploads = uploadData?.uploads;
    if (typeof rawUploads === "string") {
      try {
        rawUploads = JSON.parse(rawUploads);
      } catch {
        rawUploads = null;
      }
    }
    const section = isStart ? rawUploads?.before : rawUploads?.after;
    const { urls, skipReason } = extractUrlsAndLabels(section);
    if ((urls && urls.length > 0) || skipReason) {
      return true;
    }
    const fallbackUrls = getImages(directPhoto);
    if (fallbackUrls && fallbackUrls.length > 0) {
      return true;
    }
    // Confirmed fetched and explicitly empty
    return false;
  }

  // 3. Availability is only known after fetching booking details:
  // Allow opening the viewer to fetch details and display images or "No images available".
  return true;
};

const bookingImageUtils = {
  isImageUrl,
  safeExtractUrls,
  getImages,
  extractUrlsAndLabels,
  isImageAvailable,
};

export default bookingImageUtils;

