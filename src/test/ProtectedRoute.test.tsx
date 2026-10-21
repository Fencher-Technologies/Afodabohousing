import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute, { ACCOUNT_NOTICE_KEY } from "@/components/ProtectedRoute";

const mockUseAuth = vi.hoisted(() => vi.fn());
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: mockUseAuth,
}));

const mockFrom = vi.hoisted(() => vi.fn());
const mockSignOut = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mockFrom,
    auth: { signOut: mockSignOut },
  },
}));

/** What `supabase.from('profiles').select().eq().maybeSingle()` resolves to. */
function profileReturns(result: unknown, { reject = false } = {}) {
  const maybeSingle = reject
    ? vi.fn().mockRejectedValue(new Error("network down"))
    : vi.fn().mockResolvedValue(result);
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.maybeSingle = maybeSingle;
  mockFrom.mockReturnValue(chain);
  return maybeSingle;
}

function signedIn(role: string | null, id = "u1") {
  mockUseAuth.mockReturnValue({ user: { id }, loading: false, role, signOut: vi.fn() });
}

// The guard must sit inside <Routes>: outside them a <Navigate> keeps
// re-rendering the guard at the new location and redirects forever.
function renderRoute(allowedRoles?: string[]) {
  return render(
    <MemoryRouter initialEntries={["/protected"]}>
      <Routes>
        <Route
          path="/protected"
          element={
            <ProtectedRoute allowedRoles={allowedRoles}>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/dashboard/tenant" element={<div>Tenant Home</div>} />
        <Route path="/dashboard/manager" element={<div>Manager Home</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockFrom.mockReset();
    mockSignOut.mockReset().mockResolvedValue({});
    sessionStorage.clear();
  });

  it("shows a spinner and no content while auth is loading", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true, role: null });
    renderRoute();
    expect(document.querySelector(".animate-spin")).not.toBeNull();
    expect(screen.queryByText("Protected Content")).toBeNull();
  });

  it("redirects to login when there is no user", async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false, role: null });
    renderRoute();
    expect(await screen.findByText("Login Page")).toBeDefined();
    expect(screen.queryByText("Protected Content")).toBeNull();
  });

  it("renders children for a signed-in user on a route with no role restriction", async () => {
    signedIn("tenant");
    profileReturns({ data: { role: "tenant", status: "active" }, error: null });
    renderRoute();
    expect(await screen.findByText("Protected Content")).toBeDefined();
  });

  it("renders children when the role matches allowedRoles", async () => {
    signedIn("house_manager");
    profileReturns({ data: { role: "house_manager", status: "active" }, error: null });
    renderRoute(["house_manager", "super_admin"]);
    expect(await screen.findByText("Protected Content")).toBeDefined();
  });

  it("sends a user with the wrong role to their own dashboard", async () => {
    signedIn("tenant");
    profileReturns({ data: { role: "tenant", status: "active" }, error: null });
    renderRoute(["super_admin"]);
    expect(await screen.findByText("Tenant Home")).toBeDefined();
    expect(screen.queryByText("Protected Content")).toBeNull();
  });

  describe("fails closed", () => {
    it("does not render a role-restricted page when no role can be found", async () => {
      signedIn(null);
      profileReturns({ data: null, error: null });
      renderRoute(["super_admin"]);
      expect(await screen.findByText("We couldn't verify your access")).toBeDefined();
      expect(screen.queryByText("Protected Content")).toBeNull();
    });

    it("does not render it when the profile request fails", async () => {
      signedIn(null);
      profileReturns(null, { reject: true });
      renderRoute(["super_admin"]);
      expect(await screen.findByText("We couldn't verify your access")).toBeDefined();
      expect(screen.getByText(/problem reaching the server/i)).toBeDefined();
      expect(screen.queryByText("Protected Content")).toBeNull();
    });

    it("lets the user retry, and renders once the role loads", async () => {
      signedIn(null);
      profileReturns(null, { reject: true });
      renderRoute(["house_manager"]);
      fireEvent.click(await screen.findByText("Try again"));

      profileReturns({ data: { role: "house_manager", status: "active" }, error: null });
      fireEvent.click(await screen.findByText("Try again"));
      expect(await screen.findByText("Protected Content")).toBeDefined();
    });

    it("still allows a login-only route when the role is unknown", async () => {
      signedIn(null);
      profileReturns({ data: null, error: null });
      renderRoute();
      expect(await screen.findByText("Protected Content")).toBeDefined();
    });
  });

  describe("account status", () => {
    it.each(["suspended", "rejected"])("signs out a %s account and explains why", async (status) => {
      signedIn("house_manager");
      profileReturns({ data: { role: "house_manager", status }, error: null });
      renderRoute(["house_manager"]);

      await waitFor(() => expect(mockSignOut).toHaveBeenCalled());
      expect(sessionStorage.getItem(ACCOUNT_NOTICE_KEY)).toBe(status);
      expect(screen.queryByText("Protected Content")).toBeNull();
    });

    it("lets a pending account through, as the API does", async () => {
      signedIn("house_manager");
      profileReturns({ data: { role: "house_manager", status: "pending" }, error: null });
      renderRoute(["house_manager"]);
      expect(await screen.findByText("Protected Content")).toBeDefined();
      expect(mockSignOut).not.toHaveBeenCalled();
    });
  });

  it("never shows a page on the strength of a previous user's role", async () => {
    signedIn("house_manager", "manager-1");
    profileReturns({ data: { role: "house_manager", status: "active" }, error: null });
    const view = renderRoute(["house_manager"]);
    expect(await screen.findByText("Protected Content")).toBeDefined();

    // A different user signs in without the guard remounting.
    signedIn("tenant", "tenant-1");
    profileReturns({ data: { role: "tenant", status: "active" }, error: null });
    view.rerender(
      <MemoryRouter initialEntries={["/protected"]}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute allowedRoles={["house_manager"]}>
                <div>Protected Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/dashboard/tenant" element={<div>Tenant Home</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(await screen.findByText("Tenant Home")).toBeDefined();
    expect(screen.queryByText("Protected Content")).toBeNull();
  });
});
