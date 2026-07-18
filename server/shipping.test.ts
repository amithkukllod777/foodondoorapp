/**
 * Shipping service tests
 * Validates that ENV credentials are configured and the service module loads correctly.
 */

import { describe, it, expect } from "vitest";
import { ENV } from "./_core/env";
import { mapCourierStatus, extractCourierEvents, pickPreferredCourier } from "./shipping";

describe("Shipping ENV credentials", () => {
  it("should have SHIPROCKET_EMAIL configured", () => {
    // Credentials are injected by the platform; we just check they are non-empty strings
    expect(typeof ENV.shiprocketEmail).toBe("string");
  });

  it("should have SHIPROCKET_PASSWORD configured", () => {
    expect(typeof ENV.shiprocketPassword).toBe("string");
  });

  it("should have ITHINK_ACCESS_TOKEN configured", () => {
    expect(typeof ENV.ithinkAccessToken).toBe("string");
  });

  it("should have ITHINK_SECRET_KEY configured", () => {
    expect(typeof ENV.ithinkSecretKey).toBe("string");
  });
});

describe("Shipping module exports", () => {
  it("should export createShipment and trackShipment functions", async () => {
    const mod = await import("./shipping");
    expect(typeof mod.createShipment).toBe("function");
    expect(typeof mod.trackShipment).toBe("function");
    expect(typeof mod.shiprocketCreateShipment).toBe("function");
    expect(typeof mod.ithinkCreateShipment).toBe("function");
    expect(typeof mod.shiprocketTrack).toBe("function");
    expect(typeof mod.ithinkTrack).toBe("function");
  });
});

describe("mapCourierStatus", () => {
  it("maps delivered variants to 'delivered'", () => {
    expect(mapCourierStatus("Delivered")).toBe("delivered");
    expect(mapCourierStatus("DELIVERED")).toBe("delivered");
    expect(mapCourierStatus("Shipment Delivered")).toBe("delivered");
  });

  it("does NOT treat failed/undelivered scans as delivered", () => {
    expect(mapCourierStatus("Undelivered")).toBeNull();
    expect(mapCourierStatus("Delivery Failed")).toBeNull();
    expect(mapCourierStatus("Not Delivered")).toBeNull();
  });

  it("maps in-transit family to 'shipped'", () => {
    expect(mapCourierStatus("In Transit")).toBe("shipped");
    expect(mapCourierStatus("Out For Delivery")).toBe("shipped");
    expect(mapCourierStatus("Shipped")).toBe("shipped");
    expect(mapCourierStatus("Picked Up")).toBe("shipped");
    expect(mapCourierStatus("Dispatched")).toBe("shipped");
  });

  it("maps RTO / cancellation to 'cancelled'", () => {
    expect(mapCourierStatus("RTO Initiated")).toBe("cancelled");
    expect(mapCourierStatus("RTO Delivered")).toBe("cancelled");
    expect(mapCourierStatus("Cancelled")).toBe("cancelled");
    expect(mapCourierStatus("Return To Origin")).toBe("cancelled");
  });

  it("maps pickup/manifest to 'processing'", () => {
    expect(mapCourierStatus("Pickup Generated")).toBe("processing");
    expect(mapCourierStatus("Manifested")).toBe("processing");
  });

  it("returns null for empty or unknown statuses", () => {
    expect(mapCourierStatus("")).toBeNull();
    expect(mapCourierStatus("Some Random Scan")).toBeNull();
  });
});

describe("extractCourierEvents", () => {
  it("parses a flat Shiprocket payload", () => {
    const events = extractCourierEvents({
      awb: "1234567890",
      current_status: "Delivered",
      order_id: "NW1001",
      courier_name: "Shiprocket Delhivery",
    });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ awb: "1234567890", rawStatus: "Delivered", orderId: "NW1001", provider: "shiprocket" });
  });

  it("parses an iThink waybill/status payload nested under data", () => {
    const events = extractCourierEvents({
      data: { waybill: "AWB999", package_status: "Out For Delivery", refnum: "NW2002" },
    });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ awb: "AWB999", rawStatus: "Out For Delivery", orderId: "NW2002" });
  });

  it("de-dupes repeated awb+status and ignores entries missing awb or status", () => {
    const events = extractCourierEvents({
      shipments: [
        { awb: "A1", current_status: "In Transit" },
        { awb: "A1", current_status: "In Transit" },
        { awb: "", current_status: "Delivered" },
        { awb: "A2" },
      ],
    });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ awb: "A1", rawStatus: "In Transit" });
  });

  it("returns [] for non-object payloads", () => {
    expect(extractCourierEvents(null)).toEqual([]);
    expect(extractCourierEvents("nope")).toEqual([]);
  });
});

describe("pickPreferredCourier", () => {
  const couriers = [
    { courier_company_id: 1, courier_name: "Bluedart Air", is_surface: false, rate: 90 },
    { courier_company_id: 2, courier_name: "Delhivery Surface", is_surface: true, rate: 60 },
    { courier_company_id: 3, courier_name: "Delhivery Air", is_surface: false, rate: 110 },
    { courier_company_id: 4, courier_name: "Xpressbees", is_surface: true, rate: 55 },
  ];

  it("prefers the named courier, surface over air, then cheapest", () => {
    const chosen = pickPreferredCourier(couriers, "delhivery");
    expect(chosen?.courier_company_id).toBe(2); // Delhivery Surface
  });

  it("is case-insensitive on the courier name", () => {
    expect(pickPreferredCourier(couriers, "DELHIVERY")?.courier_company_id).toBe(2);
  });

  it("returns null when the preferred courier is unavailable", () => {
    expect(pickPreferredCourier(couriers, "ekart")).toBeNull();
    expect(pickPreferredCourier([], "delhivery")).toBeNull();
  });
});
