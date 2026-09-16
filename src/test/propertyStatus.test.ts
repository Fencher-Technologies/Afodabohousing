import { describe, it, expect } from "vitest";
import {
  PROPERTY_STATUSES,
  HIDDEN_STATUS,
  VISIBLE_STATUS,
} from "@/constants/propertyStatus";

// Pins the frontend vocabulary to the database CHECK constraint:
//   properties_status_check CHECK (status = ANY (ARRAY[
//     'available', 'occupied', 'maintenance', 'unlisted'
//   ]))
// The deactivate toggle once wrote 'inactive', which Postgres rejected and
// silently failed the whole PATCH. Any change here must land in the DB
// constraint first.
describe("property status vocabulary", () => {
  it("matches the DB CHECK constraint exactly", () => {
    expect([...PROPERTY_STATUSES]).toEqual([
      "available",
      "occupied",
      "maintenance",
      "unlisted",
    ]);
  });

  it("hides with unlisted and re-lists with available", () => {
    expect(HIDDEN_STATUS).toBe("unlisted");
    expect(VISIBLE_STATUS).toBe("available");
  });

  it("contains no inactive value", () => {
    expect(PROPERTY_STATUSES).not.toContain("inactive");
  });
});
