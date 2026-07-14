import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";

const mockUseAuth = vi.hoisted(() => vi.fn());
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: mockUseAuth,
}));

const mockSupabaseFrom = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mockSupabaseFrom,
  },
}));

function renderRoute(allowedRoles?: string[]) {
  return render(
    <MemoryRouter initialEntries={["/protected"]}>
      <ProtectedRoute allowedRoles={allowedRoles}>
        <div>Protected Content</div>
      </ProtectedRoute>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockSupabaseFrom.mockReset();
  });

  it("shows loading spinner while auth is loading", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      role: null,
    });

    renderRoute();
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeDefined();
    expect(screen.queryByText("Protected Content")).toBeNull();
  });

  it("redirects to login when no user", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      role: null,
    });

    renderRoute();
    expect(screen.queryByText("Protected Content")).toBeNull();
  });

  it("renders children when user is authenticated and no role restriction", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "1" },
      loading: false,
      role: "tenant",
    });

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: { role: "tenant", status: "active" } });
    mockSupabaseFrom.mockReturnValue({ select: mockSelect, eq: mockEq, maybeSingle: mockMaybeSingle });

    renderRoute();
    expect(screen.getByText("Protected Content")).toBeDefined();
  });

  it("renders children when role matches allowedRoles", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "1" },
      loading: false,
      role: "house_manager",
    });

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: { role: "house_manager", status: "active" } });
    mockSupabaseFrom.mockReturnValue({ select: mockSelect, eq: mockEq, maybeSingle: mockMaybeSingle });

    renderRoute(["house_manager", "super_admin"]);
    expect(screen.getByText("Protected Content")).toBeDefined();
  });

  it("redirects when role does not match allowedRoles", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "1" },
      loading: false,
      role: "tenant",
    });

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: { role: "tenant", status: "active" } });
    mockSupabaseFrom.mockReturnValue({ select: mockSelect, eq: mockEq, maybeSingle: mockMaybeSingle });

    renderRoute(["super_admin"]);
    expect(screen.queryByText("Protected Content")).toBeNull();
  });
});
