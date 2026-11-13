import {
  isImageUrl,
  safeExtractUrls,
  getImages,
  extractUrlsAndLabels,
  isImageAvailable,
} from "./bookingImageUtils";

describe("Booking Image Utilities Unit Tests (Step 22B)", () => {
  describe("isImageUrl", () => {
    it("returns true for valid http, https and data URI image strings", () => {
      expect(isImageUrl("https://storage.supabase.co/photo.jpg")).toBe(true);
      expect(isImageUrl("http://example.com/image.png")).toBe(true);
      expect(isImageUrl("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA")).toBe(true);
      expect(isImageUrl("  HTTPS://EXAMPLE.COM/PHOTO.WEBP  ")).toBe(true);
    });

    it("returns false for non-URL strings, skip reasons, and non-string types", () => {
      expect(isImageUrl("Skipped: Camera not working")).toBe(false);
      expect(isImageUrl("No start images available")).toBe(false);
      expect(isImageUrl("[Skipped] Customer denied permission")).toBe(false);
      expect(isImageUrl("")).toBe(false);
      expect(isImageUrl(null)).toBe(false);
      expect(isImageUrl(undefined)).toBe(false);
      expect(isImageUrl(12345)).toBe(false);
      expect(isImageUrl({})).toBe(false);
    });
  });

  describe("safeExtractUrls", () => {
    it("extracts HTTP/HTTPS URLs from legacy single-quoted Python lists", () => {
      const pythonList = "['https://storage.supabase.co/p1.jpg', 'https://storage.supabase.co/p2.jpg']";
      const result = safeExtractUrls(pythonList);
      expect(result).toEqual([
        "https://storage.supabase.co/p1.jpg",
        "https://storage.supabase.co/p2.jpg",
      ]);
    });

    it("safely extracts URLs with query parameters and complex paths", () => {
      const complexStr = "['https://auth.neatify.in/storage/v1/object/public/work-photos/staff_uploads/photo_123.jpg?token=abc-123&width=800']";
      const result = safeExtractUrls(complexStr);
      expect(result).toEqual([
        "https://auth.neatify.in/storage/v1/object/public/work-photos/staff_uploads/photo_123.jpg?token=abc-123&width=800",
      ]);
    });

    it("returns empty array when no URLs exist in string", () => {
      expect(safeExtractUrls("Skipped: Camera not working")).toEqual([]);
      expect(safeExtractUrls("")).toEqual([]);
      expect(safeExtractUrls(null)).toEqual([]);
    });
  });

  describe("getImages", () => {
    it("parses standard clean JSON array strings (backend-normalized format)", () => {
      const jsonStr = '["https://storage.co/photo1.jpg", "https://storage.co/photo2.jpg"]';
      expect(getImages(jsonStr)).toEqual([
        "https://storage.co/photo1.jpg",
        "https://storage.co/photo2.jpg",
      ]);
    });

    it("handles already parsed JavaScript arrays", () => {
      const arr = ["https://storage.co/p1.jpg", "https://storage.co/p2.jpg"];
      expect(getImages(arr)).toEqual(arr);
    });

    it("handles direct single HTTPS URL string", () => {
      const url = "https://storage.co/photo.jpg";
      expect(getImages(url)).toEqual([url]);
    });

    it("handles legacy Python single-quoted list strings using safe fallback parser", () => {
      const legacyStr = "['https://storage.co/p1.jpg', 'https://storage.co/p2.jpg']";
      expect(getImages(legacyStr)).toEqual([
        "https://storage.co/p1.jpg",
        "https://storage.co/p2.jpg",
      ]);
    });

    it("handles multiple images correctly", () => {
      const multi = "['https://storage.co/1.jpg', 'https://storage.co/2.jpg', 'https://storage.co/3.jpg']";
      const result = getImages(multi);
      expect(result).toHaveLength(3);
      expect(result).toEqual([
        "https://storage.co/1.jpg",
        "https://storage.co/2.jpg",
        "https://storage.co/3.jpg",
      ]);
    });

    it("handles skipped photo reason string without corrupting", () => {
      expect(getImages("Skipped: Camera not working")).toEqual([
        "Skipped: Camera not working",
      ]);
      expect(getImages("[Skipped] Customer denied permission")).toEqual([
        "[Skipped] Customer denied permission",
      ]);
    });

    it("returns empty array for missing or empty image inputs", () => {
      expect(getImages(null)).toEqual([]);
      expect(getImages(undefined)).toEqual([]);
      expect(getImages("")).toEqual([]);
      expect(getImages("[]")).toEqual([]);
      expect(getImages('[""]')).toEqual([]);
      expect(getImages([])).toEqual([]);
    });
  });

  describe("extractUrlsAndLabels", () => {
    it("extracts synthesized Step 22A dictionary { upload_1, upload_2 }", () => {
      const synthesized = {
        upload_1: "https://storage.co/p1.jpg",
        upload_2: "https://storage.co/p2.jpg",
      };
      const result = extractUrlsAndLabels(synthesized);
      expect(result.urls).toEqual([
        "https://storage.co/p1.jpg",
        "https://storage.co/p2.jpg",
      ]);
      expect(result.labels).toEqual(["upload_1", "upload_2"]);
      expect(result.skipReason).toBeNull();
    });

    it("extracts synthesized Step 22A skipped photo object { _skipped, _skip_reason }", () => {
      const skippedObj = {
        _skipped: true,
        _skip_reason: "Skipped: Camera not working",
      };
      const result = extractUrlsAndLabels(skippedObj);
      expect(result.urls).toEqual(["Skipped: Camera not working"]);
      expect(result.labels).toEqual(["Skip Reason"]);
      expect(result.skipReason).toBe("Skipped: Camera not working");
    });

    it("extracts array of upload objects with url and label", () => {
      const arrayObj = [
        { url: "https://storage.co/front.jpg", label: "Front View" },
        { url: "https://storage.co/back.jpg", label: "Back View" },
      ];
      const result = extractUrlsAndLabels(arrayObj);
      expect(result.urls).toEqual([
        "https://storage.co/front.jpg",
        "https://storage.co/back.jpg",
      ]);
      expect(result.labels).toEqual(["Front View", "Back View"]);
    });

    it("extracts direct string URL or skip reason", () => {
      const urlRes = extractUrlsAndLabels("https://storage.co/direct.jpg");
      expect(urlRes.urls).toEqual(["https://storage.co/direct.jpg"]);
      expect(urlRes.labels).toEqual([""]);

      const skipRes = extractUrlsAndLabels("Skipped: Customer not available");
      expect(skipRes.urls).toEqual(["Skipped: Customer not available"]);
      expect(skipRes.labels).toEqual(["Skip Reason"]);
      expect(skipRes.skipReason).toBe("Skipped: Customer not available");
    });

    it("handles null or undefined sectionObj safely", () => {
      const result = extractUrlsAndLabels(null);
      expect(result).toEqual({ urls: [], labels: [], skipReason: null });
    });
  });

  describe("isImageAvailable (View Button Conditions)", () => {
    it("enables button for normal completed booking with payment_status: paid", () => {
      const booking = {
        id: "b-001",
        work_status: "COMPLETED",
        payment_status: "paid",
        start_photo_url: "['https://storage.co/start.jpg']",
        end_photo_url: "['https://storage.co/end.jpg']",
      };
      expect(isImageAvailable(booking, "start")).toBe(true);
      expect(isImageAvailable(booking, "end")).toBe(true);
    });

    it("enables button for Admin Manual booking with payment_status: partial (removes payment restriction)", () => {
      const manualPartialBooking = {
        id: "b-manual-002",
        work_status: "COMPLETED",
        payment_status: "partial",
        platform: "Admin Manual",
        start_photo_url: "['https://storage.co/manual_start.jpg']",
        end_photo_url: "['https://storage.co/manual_end.jpg']",
      };
      // Must NOT be disabled by partial payment!
      expect(isImageAvailable(manualPartialBooking, "start")).toBe(true);
      expect(isImageAvailable(manualPartialBooking, "end")).toBe(true);
    });

    it("enables button for Admin Manual booking with payment_status: pending (removes payment restriction)", () => {
      const manualPendingBooking = {
        id: "b-manual-003",
        work_status: "COMPLETED",
        payment_status: "pending",
        platform: "Admin Manual",
        start_photo_url: "https://storage.co/manual_start.jpg",
        end_photo_url: "https://storage.co/manual_end.jpg",
      };
      // Must NOT be disabled by pending payment!
      expect(isImageAvailable(manualPendingBooking, "start")).toBe(true);
      expect(isImageAvailable(manualPendingBooking, "end")).toBe(true);
    });

    it("enables button for booking with skipped photo reasons", () => {
      const skippedBooking = {
        id: "b-skip-004",
        work_status: "COMPLETED",
        payment_status: "partial",
        platform: "Admin Manual",
        start_photo_url: "Skipped: Camera not working",
        end_photo_url: "Skipped: Customer denied permission",
      };
      expect(isImageAvailable(skippedBooking, "start")).toBe(true);
      expect(isImageAvailable(skippedBooking, "end")).toBe(true);
    });

    it("enables button when image availability is only known after fetching booking details", () => {
      // Normal bookings where start_photo_url is null in bookings table, but uploads exist in service_uploads
      const bookingWithoutDirectPhotos = {
        id: "b-db-005",
        work_status: "COMPLETED",
        payment_status: "partial",
        platform: "Admin Manual",
        start_photo_url: null,
        end_photo_url: null,
      };
      // uploadsMap is not yet populated: allows opening viewer
      expect(isImageAvailable(bookingWithoutDirectPhotos, "start", {})).toBe(true);
      expect(isImageAvailable(bookingWithoutDirectPhotos, "end", {})).toBe(true);
    });

    it("enables button when cached uploadsMap contains synthesized service_uploads", () => {
      const booking = {
        id: "b-db-006",
        work_status: "COMPLETED",
        payment_status: "partial",
        platform: "Admin Manual",
        start_photo_url: null,
        end_photo_url: null,
      };
      const uploadsMap = {
        "b-db-006": {
          uploads: {
            before: { upload_1: "https://storage.co/before.jpg" },
            after: { upload_1: "https://storage.co/after.jpg" },
          },
        },
      };
      expect(isImageAvailable(booking, "start", uploadsMap)).toBe(true);
      expect(isImageAvailable(booking, "end", uploadsMap)).toBe(true);
    });

    it("disables button when cached uploadsMap is confirmed to have no images and no direct photos", () => {
      const bookingNoPhotos = {
        id: "b-none-007",
        work_status: "COMPLETED",
        payment_status: "paid",
        start_photo_url: null,
        end_photo_url: null,
      };
      const uploadsMap = {
        "b-none-007": {
          uploads: {
            before: null,
            after: null,
          },
        },
      };
      expect(isImageAvailable(bookingNoPhotos, "start", uploadsMap)).toBe(false);
      expect(isImageAvailable(bookingNoPhotos, "end", uploadsMap)).toBe(false);
    });

    it("returns false for null or undefined booking", () => {
      expect(isImageAvailable(null, "start")).toBe(false);
      expect(isImageAvailable(undefined, "end")).toBe(false);
    });
  });
});

