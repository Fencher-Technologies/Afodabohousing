import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PropertyCard from "@/components/PropertyCard";

const baseProperty = {
  id: "prop-1",
  title: "Test House",
  status: "available",
  property_type: "house",
  rent_amount: 1500000,
  rent_period: "monthly",
  bedrooms: 3,
  bathrooms: 2,
  sitting_rooms: 1,
  state: "Central",
  city: "Kampala",
  area: "Kololo",
  images: null,
};

function renderCard(overrides = {}) {
  return render(
    <MemoryRouter>
      <PropertyCard property={{ ...baseProperty, ...overrides }} index={0} />
    </MemoryRouter>
  );
}

describe("PropertyCard", () => {
  it("renders property title", () => {
    renderCard();
    expect(screen.getByText("Test House")).toBeDefined();
  });

  it("renders location with area and state", () => {
    renderCard();
    expect(screen.getByText("Kololo, Central")).toBeDefined();
  });

  it("renders location with state when no area and state exists", () => {
    renderCard({ area: null, city: "Jinja", state: "Eastern" });
    expect(screen.getByText("Eastern")).toBeDefined();
  });

  it("renders bedroom count", () => {
    renderCard();
    expect(screen.getByText("3 beds")).toBeDefined();
  });

  it("renders singular bedroom", () => {
    renderCard({ bedrooms: 1 });
    expect(screen.getByText("1 bed")).toBeDefined();
  });

  it("renders bathroom count", () => {
    renderCard();
    expect(screen.getByText("2 baths")).toBeDefined();
  });

  it("renders sitting rooms when present", () => {
    renderCard();
    expect(screen.getByText("1 sitting")).toBeDefined();
  });

  it("does not render sitting rooms when zero", () => {
    renderCard({ sitting_rooms: 0 });
    expect(screen.queryByText("0 sitting")).toBeNull();
  });

  it("formats rent in millions", () => {
    renderCard({ rent_amount: 1500000 });
    expect(screen.getByText("UGX 1.5M")).toBeDefined();
  });

  it("formats rent in thousands", () => {
    renderCard({ rent_amount: 800000 });
    expect(screen.getByText("UGX 800K")).toBeDefined();
  });

  it("shows Available badge for available property", () => {
    renderCard({ status: "available" });
    expect(screen.getByText("Available")).toBeDefined();
  });

  it("shows Occupied badge for occupied property", () => {
    renderCard({ status: "occupied" });
    expect(screen.getByText("Occupied")).toBeDefined();
  });

  it("renders type badge", () => {
    renderCard();
    expect(screen.getByText("House")).toBeDefined();
  });

  it("renders apartment type badge", () => {
    renderCard({ property_type: "apartment" });
    expect(screen.getByText("Apartment")).toBeDefined();
  });
});
