import { describe, it, expect } from "vitest";
import { isTimestampId, getCleanTableNumber, formatTableDisplayName, sanitizeOrderTableName, getPublicMenuBaseUrl } from "../tableUtils";
import { RestaurantTable } from "../../types";

describe("tableUtils unit tests", () => {
  const mockTables: RestaurantTable[] = [
    {
      id: "table-1791215587475",
      number: "1",
      capacity: 4,
      status: "available",
      qrCodeUrl: "http://localhost:5173/menu/table-1791215587475",
      updatedAt: new Date().toISOString()
    },
    {
      id: "table-1791215604425",
      number: "2",
      capacity: 4,
      status: "available",
      qrCodeUrl: "http://localhost:5173/menu/table-1791215604425",
      updatedAt: new Date().toISOString()
    },
    {
      id: "table-1791215624675",
      number: "3",
      capacity: 4,
      status: "available",
      qrCodeUrl: "http://localhost:5173/menu/table-1791215624675",
      updatedAt: new Date().toISOString()
    },
    {
      id: "table-vip-4",
      number: "VIP-4",
      capacity: 6,
      status: "available",
      qrCodeUrl: "http://localhost:5173/menu/table-vip-4",
      updatedAt: new Date().toISOString()
    }
  ];

  describe("isTimestampId", () => {
    it("identifies 13-digit millisecond and 10-digit second timestamps as timestamp IDs", () => {
      expect(isTimestampId("178556021144")).toBe(true);
      expect(isTimestampId("1791215587475")).toBe(true);
      expect(isTimestampId("1698765432")).toBe(true);
      expect(isTimestampId("table-178556021144")).toBe(true);
      expect(isTimestampId("table-1791215624675")).toBe(true);
      expect(isTimestampId("table_178556021144")).toBe(true);
      expect(isTimestampId("table 178556021144")).toBe(true);
    });

    it("identifies UUIDs as timestamp/system IDs", () => {
      expect(isTimestampId("a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d")).toBe(true);
    });

    it("does not flag regular table numbers as timestamps", () => {
      expect(isTimestampId("1")).toBe(false);
      expect(isTimestampId("2")).toBe(false);
      expect(isTimestampId("15")).toBe(false);
      expect(isTimestampId("Table 3")).toBe(false);
      expect(isTimestampId("T-4")).toBe(false);
      expect(isTimestampId("VIP")).toBe(false);
      expect(isTimestampId("Terrace-1")).toBe(false);
      expect(isTimestampId("T101")).toBe(false);
    });

    it("handles null or undefined or empty strings safely", () => {
      expect(isTimestampId(null)).toBe(false);
      expect(isTimestampId(undefined)).toBe(false);
      expect(isTimestampId("")).toBe(false);
      expect(isTimestampId("   ")).toBe(false);
    });
  });

  describe("getCleanTableNumber", () => {
    it("returns genuine number from table object", () => {
      expect(getCleanTableNumber({ id: "t1", number: "5", capacity: 4, status: "available", qrCodeUrl: "", updatedAt: "" })).toBe("5");
      expect(getCleanTableNumber({ id: "t2", number: "Table 12", capacity: 4, status: "available", qrCodeUrl: "", updatedAt: "" })).toBe("12");
      expect(getCleanTableNumber({ id: "t3", number: "VIP-2", capacity: 4, status: "available", qrCodeUrl: "", updatedAt: "" })).toBe("VIP-2");
    });

    it("resolves raw timestamp ID using tablesList lookup", () => {
      const corruptedTable: RestaurantTable = {
        id: "table-1791215624675",
        number: "1791215624675", // timestamp accidentally set as number
        capacity: 4,
        status: "available",
        qrCodeUrl: "",
        updatedAt: ""
      };
      // Matches table-1791215624675 in mockTables which has genuine number "3"
      expect(getCleanTableNumber(corruptedTable, mockTables)).toBe("3");
    });

    it("resolves from fallbackId matching in tablesList", () => {
      expect(getCleanTableNumber(null, mockTables, "table-1791215604425")).toBe("2");
      expect(getCleanTableNumber(undefined, mockTables, "table-1791215587475")).toBe("1");
      expect(getCleanTableNumber(undefined, mockTables, "table-vip-4")).toBe("VIP-4");
    });

    it("never returns raw 13-digit timestamp even when table is not in list", () => {
      const orphanTimestampTable: RestaurantTable = {
        id: "table-178556021144",
        number: "178556021144",
        capacity: 4,
        status: "available",
        qrCodeUrl: "",
        updatedAt: ""
      };
      // Should fallback to safe "1" instead of 178556021144
      expect(getCleanTableNumber(orphanTimestampTable, [])).toBe("1");
    });

    it("cleans fallbackId when it is a normal clean number like table-5", () => {
      expect(getCleanTableNumber(null, [], "table-5")).toBe("5");
      expect(getCleanTableNumber(null, [], "table_9")).toBe("9");
    });
  });

  describe("formatTableDisplayName", () => {
    it("formats canonical Table labels properly", () => {
      expect(formatTableDisplayName({ id: "t1", number: "4", capacity: 4, status: "available", qrCodeUrl: "", updatedAt: "" })).toBe("Table 4");
      expect(formatTableDisplayName({ id: "t2", number: "Table 7", capacity: 4, status: "available", qrCodeUrl: "", updatedAt: "" })).toBe("Table 7");
    });

    it("formats table matching scanned QR table ID without showing timestamp", () => {
      expect(formatTableDisplayName(null, mockTables, "table-1791215624675")).toBe("Table 3");
      expect(formatTableDisplayName(null, mockTables, "table-1791215587475")).toBe("Table 1");
    });

    it("CRITICAL: prevents Table 178556021144 from ever being output", () => {
      const badTable: RestaurantTable = {
        id: "table-178556021144",
        number: "178556021144",
        capacity: 4,
        status: "available",
        qrCodeUrl: "",
        updatedAt: ""
      };
      const result = formatTableDisplayName(badTable, [], "table-178556021144");
      expect(result).not.toContain("178556021144");
      expect(result).toBe("Table 1");
    });

    it("does not repeat Table word for already prefixed names", () => {
      expect(formatTableDisplayName({ id: "t1", number: "Table 5", capacity: 4, status: "available", qrCodeUrl: "", updatedAt: "" })).toBe("Table 5");
    });
  });

  describe("sanitizeOrderTableName", () => {
    it("retains takeaway and parcel labels untouched", () => {
      expect(sanitizeOrderTableName("Takeaway • TK-01")).toBe("Takeaway • TK-01");
      expect(sanitizeOrderTableName("Takeaway Parcel")).toBe("Takeaway Parcel");
      expect(sanitizeOrderTableName("Parcel #5")).toBe("Parcel #5");
    });

    it("sanitizes legacy orders that had Table 178556021144", () => {
      expect(sanitizeOrderTableName("Table 178556021144", "table-1791215624675", mockTables)).toBe("Table 3");
      expect(sanitizeOrderTableName("Table 1791215587475", "table-1791215587475", mockTables)).toBe("Table 1");
    });

    it("handles double-prefixed corrupted names like Table table-178556021144", () => {
      expect(sanitizeOrderTableName("Table table-178556021144", "table-1791215604425", mockTables)).toBe("Table 2");
    });

    it("sanitizes timestamp even when table list is empty with fallback", () => {
      expect(sanitizeOrderTableName("Table 178556021144")).toBe("Table 1");
    });

    it("preserves already clean table names", () => {
      expect(sanitizeOrderTableName("Table 2")).toBe("Table 2");
      expect(sanitizeOrderTableName("Table 5")).toBe("Table 5");
      expect(sanitizeOrderTableName("Table VIP-4")).toBe("Table VIP-4");
    });
  });

  describe("getPublicMenuBaseUrl", () => {
    it("prefers explicit custom websiteUrl when configured with http/https", () => {
      expect(getPublicMenuBaseUrl("https://mybistro.com/")).toBe("https://mybistro.com");
      expect(getPublicMenuBaseUrl("http://order.ramrasoi.in")).toBe("http://order.ramrasoi.in");
    });

    it("falls back to window.location.origin or production domain", () => {
      const url = getPublicMenuBaseUrl(null);
      expect(url).toMatch(/^https?:\/\//);
      expect(url).not.toContain("file://");
    });
  });
});
