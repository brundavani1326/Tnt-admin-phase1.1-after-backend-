import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import AppConfiguration from "./AppConfiguration";
import * as appVersionConfigApi from "../api/appVersionConfigApi";

const mockCustomerConfig = {
  id: "c1111111-1111-1111-1111-111111111111",
  app_type: "customer",
  platform: "android",
  latest_version: "1.0.4",
  latest_version_code: 10,
  minimum_version_code: 8,
  update_policy: "optional",
  update_message: "Minor bug fixes for customer",
  update_enabled: false,
  play_store_url: "https://play.google.com/store/apps/details?id=com.neatify.customer",
  updated_at: "2026-11-04T07:00:00Z",
  updated_by: "admin@neatify.com",
};

const mockPartnerConfig = {
  id: "p2222222-2222-2222-2222-222222222222",
  app_type: "partner",
  platform: "android",
  latest_version: "1.2.1",
  latest_version_code: 22,
  minimum_version_code: 18,
  update_policy: "mandatory",
  update_message: "Mandatory security update for partners",
  update_enabled: true,
  play_store_url: "https://play.google.com/store/apps/details?id=com.neatify.partner",
  updated_at: "2026-11-04T07:30:00Z",
  updated_by: "admin@neatify.com",
};

describe("AppConfiguration Component Unit Tests (Phase 6 Step 20B)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(window, "confirm").mockImplementation(() => true);
    jest.spyOn(appVersionConfigApi, "getAppVersionConfig").mockImplementation(async (appType) => {
      if (appType === "customer") return mockCustomerConfig;
      if (appType === "partner") return mockPartnerConfig;
      throw new Error("Invalid app type");
    });
  });

  afterEach(() => {
    window.confirm.mockRestore && window.confirm.mockRestore();
  });

  it("renders loading state initially and then displays customer config", async () => {
    render(<AppConfiguration />);

    expect(
      screen.getByText(/Loading configuration from Admin Backend.../i)
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByDisplayValue("1.0.4")).toBeInTheDocument();
    });

    expect(screen.getByText("App Version Management")).toBeInTheDocument();
    expect(screen.getByDisplayValue("10")).toBeInTheDocument();
    expect(screen.getByDisplayValue("8")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Minor bug fixes for customer")).toBeInTheDocument();
    expect(
      screen.getByText("Configuration loaded from Admin Backend")
    ).toBeInTheDocument();
  });

  it("switches to partner tab and loads partner configuration", async () => {
    render(<AppConfiguration />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("1.0.4")).toBeInTheDocument();
    });

    const partnerTabBtn = screen.getByRole("button", { name: /Partner App/i });
    fireEvent.click(partnerTabBtn);

    await waitFor(() => {
      expect(screen.getByDisplayValue("1.2.1")).toBeInTheDocument();
      expect(screen.getByDisplayValue("22")).toBeInTheDocument();
      expect(screen.getByDisplayValue("18")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Mandatory security update for partners")).toBeInTheDocument();
    });
  });

  it("warns when switching tabs with unsaved changes and aborts switch if user cancels", async () => {
    window.confirm.mockReturnValueOnce(false); // User cancels switch

    render(<AppConfiguration />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("1.0.4")).toBeInTheDocument();
    });

    const versionInput = screen.getByDisplayValue("1.0.4");
    fireEvent.change(versionInput, { target: { value: "1.0.5-draft" } });

    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();

    const partnerTabBtn = screen.getByRole("button", { name: /Partner App/i });
    fireEvent.click(partnerTabBtn);

    expect(window.confirm).toHaveBeenCalledWith(
      "You have unsaved changes. Switch app without saving?"
    );

    // Form should still display dirty customer input because switch was cancelled
    expect(screen.getByDisplayValue("1.0.5-draft")).toBeInTheDocument();
  });

  it("switches tab if user confirms discarding unsaved changes", async () => {
    window.confirm.mockReturnValueOnce(true); // User confirms discard

    render(<AppConfiguration />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("1.0.4")).toBeInTheDocument();
    });

    const versionInput = screen.getByDisplayValue("1.0.4");
    fireEvent.change(versionInput, { target: { value: "1.0.5-draft" } });

    const partnerTabBtn = screen.getByRole("button", { name: /Partner App/i });
    fireEvent.click(partnerTabBtn);

    expect(window.confirm).toHaveBeenCalledWith(
      "You have unsaved changes. Switch app without saving?"
    );

    // Switches to partner app
    await waitFor(() => {
      expect(screen.getByDisplayValue("1.2.1")).toBeInTheDocument();
    });
  });

  it("validates form input on save: rejects if minimum_version_code > latest_version_code", async () => {
    render(<AppConfiguration />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("1.0.4")).toBeInTheDocument();
    });

    const minCodeInput = screen.getByDisplayValue("8");
    fireEvent.change(minCodeInput, { target: { value: "15" } }); // latest is 10

    const saveBtn = screen.getByRole("button", { name: /Save Configuration/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(
        screen.getByText(
          "Enter valid version codes. Minimum code must not exceed latest code."
        )
      ).toBeInTheDocument();
    });
  });

  it("validates form input on save: rejects if latest_version is empty", async () => {
    render(<AppConfiguration />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("1.0.4")).toBeInTheDocument();
    });

    const versionInput = screen.getByDisplayValue("1.0.4");
    fireEvent.change(versionInput, { target: { value: "   " } });

    const saveBtn = screen.getByRole("button", { name: /Save Configuration/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText("Latest version is required.")).toBeInTheDocument();
    });
  });

  it("saves configuration successfully when user confirms prompt", async () => {
    const updatedCustomer = {
      ...mockCustomerConfig,
      latest_version: "1.1.0",
      latest_version_code: 12,
      minimum_version_code: 10,
    };

    const updateSpy = jest
      .spyOn(appVersionConfigApi, "updateAppVersionConfig")
      .mockResolvedValueOnce(updatedCustomer);

    render(<AppConfiguration />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("1.0.4")).toBeInTheDocument();
    });

    const versionInput = screen.getByDisplayValue("1.0.4");
    fireEvent.change(versionInput, { target: { value: "1.1.0" } });

    const latestCodeInput = screen.getByDisplayValue("10");
    fireEvent.change(latestCodeInput, { target: { value: "12" } });

    const minCodeInput = screen.getByDisplayValue("8");
    fireEvent.change(minCodeInput, { target: { value: "10" } });

    const saveBtn = screen.getByRole("button", { name: /Save Configuration/i });
    fireEvent.click(saveBtn);

    expect(window.confirm).toHaveBeenCalledWith(
      "Save version configuration for Customer App?"
    );

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith("customer", expect.objectContaining({
        latest_version: "1.1.0",
        latest_version_code: "12",
        minimum_version_code: "10",
      }));
      expect(
        screen.getByText("App configuration saved successfully.")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Configuration loaded from Admin Backend")
      ).toBeInTheDocument();
    });
  });

  it("handles save failure by displaying error alert and preserving form state", async () => {
    jest
      .spyOn(appVersionConfigApi, "updateAppVersionConfig")
      .mockRejectedValueOnce(new Error("Database connection timed out"));

    render(<AppConfiguration />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("1.0.4")).toBeInTheDocument();
    });

    const versionInput = screen.getByDisplayValue("1.0.4");
    fireEvent.change(versionInput, { target: { value: "1.1.0-failed" } });

    const saveBtn = screen.getByRole("button", { name: /Save Configuration/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Database connection timed out")
      ).toBeInTheDocument();
      // Form values are preserved
      expect(screen.getByDisplayValue("1.1.0-failed")).toBeInTheDocument();
    });
  });
});

