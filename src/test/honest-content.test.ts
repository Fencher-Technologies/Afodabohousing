import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (rel: string) => readFileSync(resolve(__dirname, "..", rel), "utf8");

describe("public copy matches how payments really work", () => {
  // Rent is paid straight to the house manager; Axis records and verifies the
  // proof. Only Axis's own charges (plans, boosts) go through the gateway.
  const publicPages = ["pages/Index.tsx", "pages/Onboarding.tsx", "pages/Terms.tsx"];

  it.each(publicPages)("%s does not claim rent is paid through Axis", (file) => {
    const text = read(file);
    expect(text).not.toMatch(/pay rent via/i);
    expect(text).not.toMatch(/pay rent through/i);
    expect(text).not.toMatch(/online rent payments are processed/i);
    expect(text).not.toMatch(/pay rent,/i);
  });

  it("the homepage says rent goes to the manager", () => {
    expect(read("pages/Index.tsx")).toMatch(/paid directly to your house manager/i);
  });
});

describe("the Super Admin dashboard shows no fabricated data", () => {
  const dashboard = read("pages/SuperAdminDashboard.tsx");

  it("does not generate numbers", () => {
    expect(dashboard).not.toMatch(/Math\.random/);
  });

  it("has no hard-coded sample data", () => {
    for (const fake of ["Ntinda Apts", "Bukoto Heights", "Muyenga Villas", "Sarah Nakato", "Peter Ssali", "grace@example.com"]) {
      expect(dashboard).not.toContain(fake);
    }
    expect(dashboard).not.toMatch(/\(mock\)/i);
    expect(dashboard).not.toMatch(/Sparkline = \[/);
  });

  it("draws its charts from the trends endpoint", () => {
    expect(dashboard).toContain("/admin/stats/trends");
  });
});
