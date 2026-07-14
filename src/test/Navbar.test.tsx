import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Navbar from "@/components/Navbar";

const mockUseAuth = vi.hoisted(() => vi.fn());
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: mockUseAuth,
}));

vi.mock("@/assets/logo.png", () => ({ default: "logo.png" }));

const defaultAuthState = {
  user: null,
  role: null,
  signOut: vi.fn(),
};

function renderNavbar(authOverrides = {}) {
  mockUseAuth.mockReturnValue({ ...defaultAuthState, ...authOverrides });
  return render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>
  );
}

describe("Navbar", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it("renders logo and brand name", () => {
    renderNavbar();
    expect(screen.getByText("Afodabo Housing")).toBeDefined();
    expect(screen.getByText("Uganda's Housing Platform")).toBeDefined();
  });

  it("shows Sign In and Get Started when logged out", () => {
    renderNavbar();
    expect(screen.getByText("Sign In")).toBeDefined();
    expect(screen.getByText("Get Started")).toBeDefined();
  });

  it("shows Dashboard and Sign Out when logged in", () => {
    renderNavbar({ user: { id: "1" }, role: "house_manager" });
    expect(screen.getByText("Sign Out")).toBeDefined();
    expect(screen.getByText("Manager Dashboard")).toBeDefined();
  });

  it("shows tenant dashboard label for tenant role", () => {
    renderNavbar({ user: { id: "2" }, role: "tenant" });
    expect(screen.getByText("My Dashboard")).toBeDefined();
  });

  it("shows Super Admin link for super_admin role", () => {
    renderNavbar({ user: { id: "3" }, role: "super_admin" });
    const links = screen.getAllByText("Super Admin");
    expect(links.length).toBeGreaterThanOrEqual(1);
  });

  it("toggles mobile menu", () => {
    renderNavbar();
    const toggle = screen.getByLabelText("Toggle menu");
    fireEvent.click(toggle);
    expect(screen.getByText("Browse Properties")).toBeDefined();
    expect(screen.getByText("About Us")).toBeDefined();
    expect(screen.getByText("Contact Support")).toBeDefined();

    fireEvent.click(toggle);
    expect(screen.queryByText("Browse Properties")).toBeNull();
  });

  it("shows mobile sign out when logged in", () => {
    renderNavbar({ user: { id: "1" }, role: "tenant" });
    const toggle = screen.getByLabelText("Toggle menu");
    fireEvent.click(toggle);
    const buttons = screen.getAllByText("Sign Out");
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it("calls signOut on sign out click", () => {
    const signOut = vi.fn();
    renderNavbar({ user: { id: "1" }, role: "tenant", signOut });
    const signOutButtons = screen.getAllByText("Sign Out");
    fireEvent.click(signOutButtons[0]);
    expect(signOut).toHaveBeenCalledOnce();
  });
});
