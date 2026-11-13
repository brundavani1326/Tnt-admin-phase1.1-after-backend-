import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import * as bookingApiModule from "../api/bookingApi";
import {
  isImageUrl,
  getImages,
  extractUrlsAndLabels,
  isImageAvailable,
} from "../utils/bookingImageUtils";

// Mock Sample Bookings from Step 22A
const BOOKING_NORMAL = {
  id: "b1000000-0000-0000-0000-000000000001",
  booking_id: "BK-NORMAL-001",
  customer_name: "Aarav Sharma",
  service_name: "Deep Cleaning",
  platform: "website",
  work_status: "COMPLETED",
  payment_status: "paid",
  start_photo_url: "['https://storage.co/normal_start.jpg']",
  end_photo_url: "['https://storage.co/normal_end.jpg']",
  assigned_staff_email: "rajesh@neatify.com",
};

const BOOKING_MANUAL_PARTIAL = {
  id: "b2000000-0000-0000-0000-000000000002",
  booking_id: "BK-MANUAL-002",
  customer_name: "Priya Patel",
  service_name: "Sofa Shampooing",
  platform: "Admin Manual",
  work_status: "COMPLETED",
  payment_status: "partial",
  start_photo_url: null,
  end_photo_url: null,
  assigned_staff_email: "rajesh@neatify.com",
};

const BOOKING_MANUAL_DIRECT = {
  id: "b3000000-0000-0000-0000-000000000003",
  booking_id: "BK-MANUAL-003",
  customer_name: "Vikram Singh",
  service_name: "Kitchen Deep Clean",
  platform: "Admin Manual",
  work_status: "COMPLETED",
  payment_status: "partial",
  start_photo_url: "['https://storage.co/manual_start.jpg']",
  end_photo_url: "['https://storage.co/manual_end.jpg']",
  assigned_staff_email: "rajesh@neatify.com",
};

const BOOKING_MULTI_IMG = {
  id: "b4000000-0000-0000-0000-000000000004",
  booking_id: "BK-MULTI-004",
  customer_name: "Sunita Rao",
  service_name: "Villa Full Cleaning",
  platform: "Admin Manual",
  work_status: "COMPLETED",
  payment_status: "paid",
  start_photo_url: "['https://storage.co/p1.jpg', 'https://storage.co/p2.jpg', 'https://storage.co/p3.jpg']",
  end_photo_url: "['https://storage.co/e1.jpg', 'https://storage.co/e2.jpg']",
  assigned_staff_email: "rajesh@neatify.com",
};

const BOOKING_SKIPPED = {
  id: "b6000000-0000-0000-0000-000000000006",
  booking_id: "BK-SKIP-006",
  customer_name: "Ananya Joshi",
  service_name: "Balcony Cleaning",
  platform: "Admin Manual",
  work_status: "COMPLETED",
  payment_status: "partial",
  start_photo_url: "Skipped: Camera not working",
  end_photo_url: "Skipped: Customer denied permission",
  assigned_staff_email: "rajesh@neatify.com",
};

const BOOKING_NO_IMG = {
  id: "b5000000-0000-0000-0000-000000000005",
  booking_id: "BK-NONE-005",
  customer_name: "Kiran Reddy",
  service_name: "Bathroom Cleaning",
  platform: "Admin Manual",
  work_status: "COMPLETED",
  payment_status: "pending",
  start_photo_url: null,
  end_photo_url: null,
  assigned_staff_email: null,
};

describe("Admin Booking Image Viewer Integration (Step 22B)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("View Button Enablement across Payment Statuses", () => {
    it("enables Start and End Image buttons for normal completed booking with paid payment", () => {
      expect(isImageAvailable(BOOKING_NORMAL, "start")).toBe(true);
      expect(isImageAvailable(BOOKING_NORMAL, "end")).toBe(true);
    });

    it("enables Start and End Image buttons for Admin Manual booking with partial payment", () => {
      // Must NOT be disabled because of partial payment
      expect(isImageAvailable(BOOKING_MANUAL_PARTIAL, "start")).toBe(true);
      expect(isImageAvailable(BOOKING_MANUAL_PARTIAL, "end")).toBe(true);
      expect(isImageAvailable(BOOKING_MANUAL_DIRECT, "start")).toBe(true);
      expect(isImageAvailable(BOOKING_MANUAL_DIRECT, "end")).toBe(true);
    });

    it("enables Start and End Image buttons for booking with pending payment", () => {
      // Must NOT be disabled because of pending payment
      expect(isImageAvailable(BOOKING_NO_IMG, "start")).toBe(true);
      expect(isImageAvailable(BOOKING_NO_IMG, "end")).toBe(true);
    });

    it("enables buttons for skipped photos with reason", () => {
      expect(isImageAvailable(BOOKING_SKIPPED, "start")).toBe(true);
      expect(isImageAvailable(BOOKING_SKIPPED, "end")).toBe(true);
    });
  });

  describe("Image Flow Simulation: handleViewBookingImages Logic", () => {
    // Simulator matching handleViewBookingImages in Bookings.js
    const simulateViewBookingImages = async (b, type, uploadsMap, setUploadsMap) => {
      let uploadData = uploadsMap[b.id];

      if (!uploadData) {
        try {
          const detail = await bookingApiModule.getBookingDetail(b.id);
          if (detail) {
            const uploadsObj = detail.service_uploads || detail.uploads?.uploads || detail.uploads || null;
            const staffEmailStr =
              detail.service_uploads_record?.staff_email ||
              detail.service_uploads_record?.email ||
              detail.uploads?.email ||
              detail.assigned_staff?.email ||
              detail.booking?.assigned_staff_email ||
              b.assigned_staff_email;
            uploadData = {
              uploads: uploadsObj,
              email: staffEmailStr,
              booking: detail.booking || detail,
            };
            setUploadsMap((prev) => ({ ...prev, [b.id]: uploadData }));
          }
        } catch (err) {
          // Graceful fallback on API error
        }
      }

      let rawUploads = uploadData?.uploads;
      if (typeof rawUploads === "string") {
        try {
          rawUploads = JSON.parse(rawUploads);
        } catch (e) {
          rawUploads = null;
        }
      }

      const isStart = type === "start";
      const section = isStart ? rawUploads?.before : rawUploads?.after;
      const { urls, labels } = extractUrlsAndLabels(section);
      const directPhoto = isStart
        ? (uploadData?.booking?.start_photo_url || b.start_photo_url)
        : (uploadData?.booking?.end_photo_url || b.end_photo_url);
      const fallbackUrls = getImages(directPhoto);

      let finalUrls = urls && urls.length > 0 ? urls : fallbackUrls;
      let finalLabels = urls && urls.length > 0 ? labels : [];

      if (finalUrls && finalUrls.length > 0) {
        if (finalLabels.length === 0 && finalUrls.length > 1) {
          finalLabels = finalUrls.map((_, idx) => `Upload ${idx + 1}`);
        } else if (finalLabels.length === 0 && finalUrls.length === 1 && !isImageUrl(finalUrls[0])) {
          finalLabels = ["Skip Reason"];
        }
        return { images: finalUrls, labels: finalLabels };
      } else {
        return {
          images: [isStart ? "No start images available" : "No end images available"],
          labels: [],
        };
      }
    };

    it("resolves Start Image for normal completed booking via service_uploads", async () => {
      let uploadsMap = {};
      const setUploadsMap = (fn) => { uploadsMap = fn(uploadsMap); };

      jest.spyOn(bookingApiModule, "getBookingDetail").mockResolvedValueOnce({
        booking: BOOKING_NORMAL,
        service_uploads: {
          before: { upload_1: "https://storage.co/normal_start.jpg" },
          after: { upload_1: "https://storage.co/normal_end.jpg" },
        },
      });

      const res = await simulateViewBookingImages(BOOKING_NORMAL, "start", uploadsMap, setUploadsMap);
      expect(res.images).toEqual(["https://storage.co/normal_start.jpg"]);
      expect(res.labels).toEqual(["upload_1"]);
    });

    it("resolves End Image for normal completed booking via service_uploads", async () => {
      let uploadsMap = {};
      const setUploadsMap = (fn) => { uploadsMap = fn(uploadsMap); };

      jest.spyOn(bookingApiModule, "getBookingDetail").mockResolvedValueOnce({
        booking: BOOKING_NORMAL,
        service_uploads: {
          before: { upload_1: "https://storage.co/normal_start.jpg" },
          after: { upload_1: "https://storage.co/normal_end.jpg" },
        },
      });

      const res = await simulateViewBookingImages(BOOKING_NORMAL, "end", uploadsMap, setUploadsMap);
      expect(res.images).toEqual(["https://storage.co/normal_end.jpg"]);
      expect(res.labels).toEqual(["upload_1"]);
    });

    it("resolves Start Image for Admin Manual booking with service_uploads record", async () => {
      let uploadsMap = {};
      const setUploadsMap = (fn) => { uploadsMap = fn(uploadsMap); };

      jest.spyOn(bookingApiModule, "getBookingDetail").mockResolvedValueOnce({
        booking: BOOKING_MANUAL_PARTIAL,
        service_uploads: {
          before: { upload_1: "https://storage.co/manual_db_start.jpg" },
          after: { upload_1: "https://storage.co/manual_db_end.jpg" },
        },
      });

      const res = await simulateViewBookingImages(BOOKING_MANUAL_PARTIAL, "start", uploadsMap, setUploadsMap);
      expect(res.images).toEqual(["https://storage.co/manual_db_start.jpg"]);
      expect(res.labels).toEqual(["upload_1"]);
    });

    it("resolves Start Image for Admin Manual booking with photos in booking table", async () => {
      let uploadsMap = {};
      const setUploadsMap = (fn) => { uploadsMap = fn(uploadsMap); };

      // Backend synthesizes service_uploads from booking.start_photo_url
      jest.spyOn(bookingApiModule, "getBookingDetail").mockResolvedValueOnce({
        booking: BOOKING_MANUAL_DIRECT,
        service_uploads: {
          before: { upload_1: "https://storage.co/manual_start.jpg" },
          after: { upload_1: "https://storage.co/manual_end.jpg" },
        },
      });

      const res = await simulateViewBookingImages(BOOKING_MANUAL_DIRECT, "start", uploadsMap, setUploadsMap);
      expect(res.images).toEqual(["https://storage.co/manual_start.jpg"]);
    });

    it("handles multiple images and formats carousel labels", async () => {
      let uploadsMap = {};
      const setUploadsMap = (fn) => { uploadsMap = fn(uploadsMap); };

      jest.spyOn(bookingApiModule, "getBookingDetail").mockResolvedValueOnce({
        booking: BOOKING_MULTI_IMG,
        service_uploads: {
          before: {
            upload_1: "https://storage.co/p1.jpg",
            upload_2: "https://storage.co/p2.jpg",
            upload_3: "https://storage.co/p3.jpg",
          },
          after: {
            upload_1: "https://storage.co/e1.jpg",
            upload_2: "https://storage.co/e2.jpg",
          },
        },
      });

      const res = await simulateViewBookingImages(BOOKING_MULTI_IMG, "start", uploadsMap, setUploadsMap);
      expect(res.images).toHaveLength(3);
      expect(res.images).toEqual([
        "https://storage.co/p1.jpg",
        "https://storage.co/p2.jpg",
        "https://storage.co/p3.jpg",
      ]);
      expect(res.labels).toEqual(["upload_1", "upload_2", "upload_3"]);
    });

    it("handles skipped photos and displays skip reason", async () => {
      let uploadsMap = {};
      const setUploadsMap = (fn) => { uploadsMap = fn(uploadsMap); };

      jest.spyOn(bookingApiModule, "getBookingDetail").mockResolvedValueOnce({
        booking: BOOKING_SKIPPED,
        service_uploads: {
          before: { _skipped: true, _skip_reason: "Skipped: Camera not working" },
          after: { _skipped: true, _skip_reason: "Skipped: Customer denied permission" },
        },
      });

      const resStart = await simulateViewBookingImages(BOOKING_SKIPPED, "start", uploadsMap, setUploadsMap);
      expect(resStart.images).toEqual(["Skipped: Camera not working"]);
      expect(resStart.labels).toEqual(["Skip Reason"]);

      const resEnd = await simulateViewBookingImages(BOOKING_SKIPPED, "end", uploadsMap, setUploadsMap);
      expect(resEnd.images).toEqual(["Skipped: Customer denied permission"]);
      expect(resEnd.labels).toEqual(["Skip Reason"]);
    });

    it("displays 'No start images available' when photos are missing", async () => {
      let uploadsMap = {};
      const setUploadsMap = (fn) => { uploadsMap = fn(uploadsMap); };

      jest.spyOn(bookingApiModule, "getBookingDetail").mockResolvedValueOnce({
        booking: BOOKING_NO_IMG,
        service_uploads: null,
      });

      const res = await simulateViewBookingImages(BOOKING_NO_IMG, "start", uploadsMap, setUploadsMap);
      expect(res.images).toEqual(["No start images available"]);
      expect(res.labels).toEqual([]);
    });

    it("displays 'No end images available' when end photos are missing", async () => {
      let uploadsMap = {};
      const setUploadsMap = (fn) => { uploadsMap = fn(uploadsMap); };

      jest.spyOn(bookingApiModule, "getBookingDetail").mockResolvedValueOnce({
        booking: BOOKING_NO_IMG,
        service_uploads: null,
      });

      const res = await simulateViewBookingImages(BOOKING_NO_IMG, "end", uploadsMap, setUploadsMap);
      expect(res.images).toEqual(["No end images available"]);
      expect(res.labels).toEqual([]);
    });

    it("handles backend API errors gracefully by falling back to direct photo or no images message", async () => {
      let uploadsMap = {};
      const setUploadsMap = (fn) => { uploadsMap = fn(uploadsMap); };

      jest.spyOn(bookingApiModule, "getBookingDetail").mockRejectedValueOnce(new Error("500 Internal Server Error"));

      // Direct photo available on booking row
      const resWithDirect = await simulateViewBookingImages(BOOKING_MANUAL_DIRECT, "start", uploadsMap, setUploadsMap);
      expect(resWithDirect.images).toEqual(["https://storage.co/manual_start.jpg"]);

      // Booking with no direct photo
      jest.spyOn(bookingApiModule, "getBookingDetail").mockRejectedValueOnce(new Error("Network Error"));
      const resWithoutDirect = await simulateViewBookingImages(BOOKING_NO_IMG, "start", uploadsMap, setUploadsMap);
      expect(resWithoutDirect.images).toEqual(["No start images available"]);
    });
  });
});

