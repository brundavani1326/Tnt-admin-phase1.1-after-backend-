import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import {
  getBookingPaymentDetails,
  isPartialPaymentService,
  renderPaymentCells,
} from "./Bookings";

describe("Bookings Payment Columns Integration — Step 23A", () => {
  const MASTER_SERVICES = [
    {
      id: "svc-deep-clean",
      title: "Deep Cleaning",
      partial_payment_enabled: true,
      partial_payment_amount: 1000,
    },
    {
      id: "svc-sofa",
      title: "Sofa Cleaning",
      partial_payment_enabled: false,
    },
  ];

  describe("Payment Calculation Logic (getBookingPaymentDetails & isPartialPaymentService)", () => {
    it("correctly calculates full payment booking with paid status", () => {
      const booking = {
        id: "b-001",
        booking_id: "BK-001",
        total_amount: 5000,
        payment_status: "paid",
        services: [{ id: "svc-sofa", title: "Sofa Cleaning", price: 5000 }],
      };

      const details = getBookingPaymentDetails(booking);
      expect(details.advanceAmount).toBe("₹5000");
      expect(details.pendingAmount).toBe("₹0");
      expect(details.rawAdvance).toBe(5000);
      expect(details.rawPending).toBe(0);

      const isPartial = isPartialPaymentService(booking, MASTER_SERVICES);
      expect(isPartial).toBe(false);
    });

    it("correctly calculates partial payment booking with explicit advance and pending amounts", () => {
      const booking = {
        id: "b-002",
        booking_id: "BK-002",
        total_amount: 6000,
        advance_amount: 2000,
        pending_amount: 4000,
        payment_status: "partial",
        services: [{ id: "svc-sofa", title: "Sofa Cleaning", price: 6000 }],
      };

      const details = getBookingPaymentDetails(booking);
      expect(details.advanceAmount).toBe("₹2000");
      expect(details.pendingAmount).toBe("₹4000");
      expect(details.rawAdvance).toBe(2000);
      expect(details.rawPending).toBe(4000);

      const isPartial = isPartialPaymentService(booking, MASTER_SERVICES);
      expect(isPartial).toBe(true);
    });

    it("evaluates partial payment from service config when booking status is pending", () => {
      const booking = {
        id: "b-003",
        booking_id: "BK-003",
        total_amount: 4500,
        payment_status: "pending",
        services: [
          {
            id: "svc-deep-clean",
            title: "Deep Cleaning",
            partial_payment_enabled: true,
            partial_payment_amount: 1500,
            pending_amount: 3000,
          },
        ],
      };

      const details = getBookingPaymentDetails(booking);
      expect(details.advanceAmount).toBe("₹1500");
      expect(details.pendingAmount).toBe("₹3000");

      const isPartial = isPartialPaymentService(booking, MASTER_SERVICES);
      expect(isPartial).toBe(true);
    });

    it("correctly calculates payment from bookingPaymentsMap with advance transaction", () => {
      const booking = {
        id: "b-004",
        booking_id: "BK-004",
        total_amount: 8000,
        payment_status: "captured",
      };

      const paymentsMap = {
        "b-004": [
          {
            id: "pay-1",
            booking_id: "b-004",
            amount: 2500,
            payment_type: "ADVANCE_PAYMENT",
            status: "success",
          },
          {
            id: "pay-2",
            booking_id: "b-004",
            amount: 5500,
            payment_type: "REMAINING_PAYMENT",
            status: "success",
          },
        ],
      };

      const details = getBookingPaymentDetails(booking, paymentsMap);
      expect(details.advanceAmount).toBe("₹2500");
      expect(details.pendingAmount).toBe("₹5500");

      const isPartial = isPartialPaymentService(booking, MASTER_SERVICES, paymentsMap);
      expect(isPartial).toBe(true);
    });

    it("correctly calculates pending/unpaid booking", () => {
      const booking = {
        id: "b-005",
        booking_id: "BK-005",
        total_amount: 3500,
        payment_status: "pending",
      };

      const details = getBookingPaymentDetails(booking);
      expect(details.advanceAmount).toBe("₹0");
      expect(details.pendingAmount).toBe("₹3500");

      const isPartial = isPartialPaymentService(booking, MASTER_SERVICES);
      expect(isPartial).toBe(false);
    });

    it("handles zero total amount gracefully", () => {
      const booking = {
        id: "b-006",
        booking_id: "BK-006",
        total_amount: 0,
        payment_status: "paid",
      };

      const details = getBookingPaymentDetails(booking);
      expect(details.advanceAmount).toBe("₹0");
      expect(details.pendingAmount).toBe("₹0");
    });

    it("handles null/undefined booking gracefully", () => {
      const details = getBookingPaymentDetails(null);
      expect(details.advanceAmount).toBe("N/A");
      expect(details.pendingAmount).toBe("N/A");
      expect(details.rawAdvance).toBe(0);
      expect(details.rawPending).toBe(0);

      const isPartial = isPartialPaymentService(null);
      expect(isPartial).toBe(false);
    });
  });

  describe("Payment Cells Rendering (renderPaymentCells)", () => {
    it("renders 4 table cells with exact styles and Full Payment badge", () => {
      const booking = {
        id: "b-assigned-1",
        total_amount: 5000,
        payment_status: "paid",
      };

      const { container } = render(
        <table>
          <tbody>
            <tr>
              {renderPaymentCells(booking, {}, MASTER_SERVICES)}
            </tr>
          </tbody>
        </table>
      );

      const cells = container.querySelectorAll("td");
      expect(cells.length).toBe(4);

      // Cell 1: Final Price
      expect(cells[0]).toHaveTextContent("₹5000");
      expect(cells[0]).toHaveStyle("font-weight: 700");
      expect(cells[0]).toHaveStyle("color: #0f172a");

      // Cell 2: Advance Amount
      expect(cells[1]).toHaveTextContent("₹5000");
      expect(cells[1]).toHaveStyle("font-weight: 600");
      expect(cells[1]).toHaveStyle("color: #1e293b");

      // Cell 3: Pending Amount
      expect(cells[2]).toHaveTextContent("₹0");
      expect(cells[2]).toHaveStyle("font-weight: 700");
      expect(cells[2]).toHaveStyle("color: #ef4444");

      // Cell 4: Payment Type
      expect(cells[3]).toHaveTextContent("FULL PAYMENT");
      const badge = cells[3].querySelector("span");
      expect(badge).toHaveStyle("color: #16a34a");
      expect(badge).toHaveStyle("font-weight: 800");
    });

    it("renders 4 table cells with Partial Payment badge", () => {
      const booking = {
        id: "b-assigned-2",
        total_amount: 4000,
        advance_amount: 1000,
        pending_amount: 3000,
        payment_status: "partial",
      };

      const { container } = render(
        <table>
          <tbody>
            <tr>
              {renderPaymentCells(booking, {}, MASTER_SERVICES)}
            </tr>
          </tbody>
        </table>
      );

      const cells = container.querySelectorAll("td");
      expect(cells.length).toBe(4);

      // Cell 1: Final Price
      expect(cells[0]).toHaveTextContent("₹4000");

      // Cell 2: Advance Amount
      expect(cells[1]).toHaveTextContent("₹1000");

      // Cell 3: Pending Amount
      expect(cells[2]).toHaveTextContent("₹3000");

      // Cell 4: Payment Type
      expect(cells[3]).toHaveTextContent("PARTIAL PAYMENT");
      const badge = cells[3].querySelector("span");
      expect(badge).toHaveStyle("color: #d97706");
      expect(badge).toHaveStyle("font-weight: 800");
    });

    it("falls back to b.price if total_amount is null or undefined", () => {
      const booking = {
        id: "b-assigned-3",
        total_amount: null,
        price: 2500,
        payment_status: "paid",
      };

      const { container } = render(
        <table>
          <tbody>
            <tr>
              {renderPaymentCells(booking, {}, MASTER_SERVICES)}
            </tr>
          </tbody>
        </table>
      );

      const cells = container.querySelectorAll("td");
      expect(cells[0]).toHaveTextContent("₹2500");
    });

    it("renders N/A for Final Price when both total_amount and price are missing", () => {
      const booking = {
        id: "b-assigned-4",
        total_amount: null,
        price: null,
        payment_status: "pending",
      };

      const { container } = render(
        <table>
          <tbody>
            <tr>
              {renderPaymentCells(booking, {}, MASTER_SERVICES)}
            </tr>
          </tbody>
        </table>
      );

      const cells = container.querySelectorAll("td");
      expect(cells[0]).toHaveTextContent("N/A");
    });
  });

  describe("Assigned Tab Table Layout & Action Invariants", () => {
    // Simulator for the complete row rendered in Assigned tab
    const renderAssignedRow = (b, paymentsMap = {}, services = [], staffMap = {}) => {
      const isEnabled = b.payment_status === "paid" || b.payment_status === "partial";
      return (
        <tr key={b.id}>
          <td>Created At</td>
          <td>{b.booking_id || "N/A"}</td>
          <td>{b.platform || "N/A"}</td>
          <td style={{ fontWeight: "700", color: "#0f172a" }}>₹{b.total_amount}</td>
          <td>{b.payment_status}</td>
          <td>{b.razorpay_payment_id || "N/A"}</td>
          <td>{b.customer_name}</td>
          <td>{b.phone_number || "N/A"}</td>
          <td>{b.email}</td>
          <td>{b.full_address}</td>
          <td>{b.location_link}</td>
          <td>{b.service_name}</td>
          <td>{b.addons || "None"}</td>
          <td>{b.booking_date}</td>
          <td>{b.booking_time}</td>
          {renderPaymentCells(b, paymentsMap, services)}
          <td>
            {b.assigned_staff_email ? (
              <div>
                <span>{staffMap[b.assigned_staff_email] || b.assigned_staff_email}</span>
                <button>View OTP</button>
              </div>
            ) : (
              "Not Assigned"
            )}
          </td>
          <td>
            <button className="allot-btn" disabled={!isEnabled}>
              {b.assigned_staff_email ? "Change Staff" : "Allot Staff"}
            </button>
            <button
              className="allot-btn"
              disabled={b.payment_status !== "paid"}
            >
              Cancel
            </button>
            <button
              className="allot-btn"
              disabled={b.payment_status !== "paid"}
            >
              Reschedule
            </button>
            {b.assigned_staff_email && b.staff_response === "PENDING" && (
              <button>View Status</button>
            )}
          </td>
          <td>
            <button>Delete</button>
          </td>
          <td>
            <button>Copy</button>
          </td>
        </tr>
      );
    };

    it("renders Assigned tab row with exactly 23 columns matching table header", () => {
      const assignedBooking = {
        id: "b-assigned-full",
        booking_id: "BK-ASSIGNED-101",
        platform: "website",
        total_amount: 4500,
        payment_status: "paid",
        razorpay_payment_id: "pay_test_123",
        customer_name: "Rohan Verma",
        phone_number: "9876543210",
        email: "rohan@example.com",
        full_address: "Flat 402, Sunshine Heights, Bangalore",
        location_link: "https://maps.google.com/?q=Bangalore",
        service_name: "Sofa Cleaning",
        addons: "Cushion",
        booking_date: "2026-11-10",
        booking_time: "10:00 AM",
        assigned_staff_email: "rajesh@neatify.com",
        staff_response: "PENDING",
      };

      const staffMap = { "rajesh@neatify.com": "Rajesh Kumar" };

      const { container } = render(
        <table>
          <thead>
            <tr>
              <th style={{ minWidth: "160px" }}>Created At</th>
              <th style={{ minWidth: "120px" }}>Booking ID</th>
              <th style={{ minWidth: "100px" }}>Platform</th>
              <th style={{ minWidth: "120px" }}>Total Amount</th>
              <th style={{ minWidth: "130px" }}>Payment Status</th>
              <th style={{ minWidth: "180px" }}>Transaction ID</th>
              <th style={{ minWidth: "160px" }}>Customer</th>
              <th style={{ minWidth: "130px" }}>Phone</th>
              <th style={{ minWidth: "200px" }}>Email</th>
              <th style={{ minWidth: "350px" }}>Full Address</th>
              <th style={{ minWidth: "160px" }}>Location</th>
              <th style={{ minWidth: "180px" }}>Service</th>
              <th style={{ minWidth: "250px" }}>Add-on</th>
              <th style={{ minWidth: "120px" }}>Date</th>
              <th style={{ minWidth: "100px" }}>Time</th>
              <th style={{ minWidth: "120px" }}>Final Price</th>
              <th style={{ minWidth: "140px" }}>Advance Amount</th>
              <th style={{ minWidth: "140px" }}>Pending Amount</th>
              <th style={{ minWidth: "130px" }}>Payment Type</th>
              <th style={{ minWidth: "160px" }}>Assigned Staff</th>
              <th style={{ minWidth: "140px" }}>Action</th>
              <th style={{ minWidth: "80px" }}>Delete</th>
              <th style={{ minWidth: "80px" }}>Copy</th>
            </tr>
          </thead>
          <tbody>
            {renderAssignedRow(assignedBooking, {}, MASTER_SERVICES, staffMap)}
          </tbody>
        </table>
      );

      const headers = container.querySelectorAll("thead th");
      const cells = container.querySelectorAll("tbody td");

      expect(headers.length).toBe(23);
      expect(cells.length).toBe(23);

      // Verify the 4 payment headers
      expect(headers[15]).toHaveTextContent("Final Price");
      expect(headers[16]).toHaveTextContent("Advance Amount");
      expect(headers[17]).toHaveTextContent("Pending Amount");
      expect(headers[18]).toHaveTextContent("Payment Type");

      // Verify the 4 payment row cells
      expect(cells[15]).toHaveTextContent("₹4500");
      expect(cells[16]).toHaveTextContent("₹4500");
      expect(cells[17]).toHaveTextContent("₹0");
      expect(cells[18]).toHaveTextContent("FULL PAYMENT");

      // Verify staff name & View OTP button intact
      expect(cells[19]).toHaveTextContent("Rajesh Kumar");
      expect(screen.getByRole("button", { name: "View OTP" })).toBeInTheDocument();

      // Verify Assigned action buttons intact
      expect(screen.getByRole("button", { name: "Change Staff" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Reschedule" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "View Status" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
    });

    it("renders Assigned tab row with Partial Payment values correctly", () => {
      const assignedBooking = {
        id: "b-assigned-partial",
        booking_id: "BK-ASSIGNED-102",
        platform: "Admin Manual",
        total_amount: 7000,
        advance_amount: 2500,
        pending_amount: 4500,
        payment_status: "partial",
        customer_name: "Sneha Roy",
        phone_number: "9876543211",
        email: "sneha@example.com",
        full_address: "B-201, Lakeview Apts",
        service_name: "Deep Cleaning",
        booking_date: "2026-11-12",
        booking_time: "02:00 PM",
        assigned_staff_email: "rajesh@neatify.com",
      };

      const { container } = render(
        <table>
          <tbody>
            {renderAssignedRow(assignedBooking, {}, MASTER_SERVICES)}
          </tbody>
        </table>
      );

      const cells = container.querySelectorAll("tbody td");
      expect(cells[15]).toHaveTextContent("₹7000");
      expect(cells[16]).toHaveTextContent("₹2500");
      expect(cells[17]).toHaveTextContent("₹4500");
      expect(cells[18]).toHaveTextContent("PARTIAL PAYMENT");
    });
  });
});
