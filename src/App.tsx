import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "next-themes";
import { Component, ErrorInfo, ReactNode } from "react";
import { usePageViewTracking } from "@/services/tracking";
import Index from "./pages/Index";
import LoginPage from "./pages/Login";
import RegisterPage from "./pages/Register";
import PropertiesPage from "./pages/Properties";
import PropertyDetailPage from "./pages/PropertyDetail";
import ManagerDashboard from "./pages/ManagerDashboard";
import BoostPage from "./pages/BoostPage";
import TenantDashboard from "./pages/TenantDashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import ManagerDetail from "./pages/ManagerDetail";
import AcceptInvitePage from "./pages/AcceptInvite";
import ProtectedRoute from "./components/ProtectedRoute";
import AboutPage from "./pages/About";
import ContactPage from "./pages/Contact";
import PrivacyPage from "./pages/Privacy";
import TermsPage from "./pages/Terms";
import ForgotPassword from "./pages/ForgotPassword";
import ForgotPin from "./pages/ForgotPin";
import PhoneAuth from "./pages/PhoneAuth";
import GettingStarted from "./pages/GettingStarted";
import PhoneOtp from "./pages/PhoneOtp";
import PhonePinSetup from "./pages/PhonePinSetup";
import PhoneSignin from "./pages/PhoneSignin";
import ChangePin from "./pages/ChangePin";
import Account from "./pages/Account";
import EditProfile from "./pages/EditProfile";
import ChangePassword from "./pages/ChangePassword";
import ManagerTenancies from "./pages/ManagerTenancies";
import ManagerCreateTenancy from "./pages/ManagerCreateTenancy";
import ManagerTenancyDetail from "./pages/ManagerTenancyDetail";
import ManagerEditTenancy from "./pages/ManagerEditTenancy";
import ManagerReports from "./pages/ManagerReports";
import TenantPayments from "./pages/TenantPayments";
import TenantPaymentDetail from "./pages/TenantPaymentDetail";
import ManagerSubscription from "./pages/ManagerSubscription";
import PaymentStatus from "./pages/PaymentStatus";
import AgreementView from "./pages/AgreementView";
import AgreementHistory from "./pages/AgreementHistory";
import Notifications from "./pages/Notifications";
import CreateProperty from "./pages/CreateProperty";
import EditProperty from "./pages/EditProperty";
import TenantBrowse from "./pages/TenantBrowse";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
import ManagerPaymentVerifications from "./pages/ManagerPaymentVerifications";
import ManagerPaymentDetail from "./pages/ManagerPaymentDetail";
import ManagerCreateAgreement from "./pages/ManagerCreateAgreement";
import TenantSubmitPayment from "./pages/TenantSubmitPayment";
import GuestExplore from "./pages/GuestExplore";
import ManagerProperties from "./pages/ManagerProperties";
import ManagerPaymentHistory from "./pages/ManagerPaymentHistory";
import TenantMyTenancy from "./pages/TenantMyTenancy";
import ManagerTenantDetail from "./pages/ManagerTenantDetail";
import AgreementPreview from "./pages/AgreementPreview";
import AgreementSummary from "./pages/AgreementSummary";
import DashboardLayout from "./components/DashboardLayout";
import MobileAppBanner from "./components/MobileAppBanner";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('ErrorBoundary caught:', error, info); }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-8">
          <div className="max-w-md text-center space-y-4">
            <h1 className="font-display text-2xl font-bold text-foreground">Something went wrong</h1>
            <pre className="text-sm text-muted-foreground bg-muted rounded-xl p-4 text-left overflow-auto max-h-48">
              {this.state.error.message}
            </pre>
            <button onClick={() => { this.setState({ error: null }); window.location.href = '/'; }}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90">
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function PageViewTracker() { usePageViewTracking(); return null; }

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <PageViewTracker />
          <ErrorBoundary>
            <Routes>
              {/* Public routes (no sidebar) */}
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/accept-invite" element={<AcceptInvitePage />} />
              <Route path="/properties" element={<PropertiesPage />} />
              <Route path="/properties/:id" element={<PropertyDetailPage />} />
              <Route path="/phone-auth" element={<PhoneAuth />} />
              <Route path="/getting-started" element={<GettingStarted />} />
              <Route path="/phone-otp" element={<PhoneOtp />} />
              <Route path="/phone-pin-setup" element={<PhonePinSetup />} />
              <Route path="/phone-signin" element={<PhoneSignin />} />
              <Route path="/forgot-pin" element={<ForgotPin />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/explore" element={<GuestExplore />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />

              {/* Dashboard routes (with sidebar layout) */}
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard/super-admin" element={<ProtectedRoute allowedRoles={['super_admin']}><SuperAdminDashboard /></ProtectedRoute>} />
                <Route path="/dashboard/super-admin/managers/:id" element={<ProtectedRoute allowedRoles={['super_admin']}><ManagerDetail /></ProtectedRoute>} />
                <Route path="/dashboard/manager" element={<ProtectedRoute allowedRoles={['house_manager', 'super_admin']}><ManagerDashboard /></ProtectedRoute>} />
                <Route path="/dashboard/manager/boost/:id" element={<ProtectedRoute allowedRoles={['house_manager', 'super_admin']}><BoostPage /></ProtectedRoute>} />
                <Route path="/dashboard/manager/properties" element={<ProtectedRoute allowedRoles={['house_manager', 'super_admin']}><ManagerProperties /></ProtectedRoute>} />
                <Route path="/dashboard/manager/properties/new" element={<ProtectedRoute allowedRoles={['house_manager', 'super_admin']}><CreateProperty /></ProtectedRoute>} />
                <Route path="/dashboard/manager/properties/:id/edit" element={<ProtectedRoute allowedRoles={['house_manager', 'super_admin']}><EditProperty /></ProtectedRoute>} />
                <Route path="/dashboard/manager/tenancies" element={<ProtectedRoute allowedRoles={['house_manager', 'super_admin']}><ManagerTenancies /></ProtectedRoute>} />
                <Route path="/dashboard/manager/tenancies/new" element={<ProtectedRoute allowedRoles={['house_manager', 'super_admin']}><ManagerCreateTenancy /></ProtectedRoute>} />
                <Route path="/dashboard/manager/tenancies/:id" element={<ProtectedRoute allowedRoles={['house_manager', 'super_admin']}><ManagerTenancyDetail /></ProtectedRoute>} />
                <Route path="/dashboard/manager/tenancies/:id/edit" element={<ProtectedRoute allowedRoles={['house_manager', 'super_admin']}><ManagerEditTenancy /></ProtectedRoute>} />
                <Route path="/dashboard/manager/tenants/:id" element={<ProtectedRoute allowedRoles={['house_manager', 'super_admin']}><ManagerTenantDetail /></ProtectedRoute>} />
                <Route path="/dashboard/manager/payment-verifications" element={<ProtectedRoute allowedRoles={['house_manager', 'super_admin']}><ManagerPaymentVerifications /></ProtectedRoute>} />
                <Route path="/dashboard/manager/payments/:id" element={<ProtectedRoute allowedRoles={['house_manager', 'super_admin']}><ManagerPaymentDetail /></ProtectedRoute>} />
                <Route path="/dashboard/manager/payments/history/:tenancyId" element={<ProtectedRoute allowedRoles={['house_manager', 'super_admin']}><ManagerPaymentHistory /></ProtectedRoute>} />
                <Route path="/dashboard/manager/agreements/create/:leaseId" element={<ProtectedRoute allowedRoles={['house_manager', 'super_admin']}><ManagerCreateAgreement /></ProtectedRoute>} />
                <Route path="/dashboard/manager/agreements/preview/:leaseId" element={<ProtectedRoute allowedRoles={['house_manager', 'super_admin']}><AgreementPreview /></ProtectedRoute>} />
                <Route path="/dashboard/manager/agreements/summary/:leaseId" element={<ProtectedRoute allowedRoles={['house_manager', 'super_admin']}><AgreementSummary /></ProtectedRoute>} />
                <Route path="/dashboard/manager/reports" element={<ProtectedRoute allowedRoles={['house_manager', 'super_admin']}><ManagerReports /></ProtectedRoute>} />
                <Route path="/subscription" element={<ProtectedRoute allowedRoles={['house_manager', 'super_admin']}><ManagerSubscription /></ProtectedRoute>} />
                <Route path="/payment/status" element={<ProtectedRoute><PaymentStatus /></ProtectedRoute>} />
                <Route path="/dashboard/tenant" element={<ProtectedRoute allowedRoles={['tenant']}><TenantDashboard /></ProtectedRoute>} />
                <Route path="/dashboard/tenant/payments" element={<ProtectedRoute allowedRoles={['tenant']}><TenantPayments /></ProtectedRoute>} />
                <Route path="/dashboard/tenant/payments/submit" element={<ProtectedRoute allowedRoles={['tenant']}><TenantSubmitPayment /></ProtectedRoute>} />
                <Route path="/dashboard/tenant/payments/:id" element={<ProtectedRoute allowedRoles={['tenant']}><TenantPaymentDetail /></ProtectedRoute>} />
                <Route path="/dashboard/tenant/my-tenancy" element={<ProtectedRoute allowedRoles={['tenant']}><TenantMyTenancy /></ProtectedRoute>} />
                <Route path="/dashboard/tenant/agreement/:leaseId" element={<ProtectedRoute allowedRoles={['tenant']}><AgreementView /></ProtectedRoute>} />
                <Route path="/dashboard/tenant/agreement/:leaseId/history" element={<ProtectedRoute allowedRoles={['tenant']}><AgreementHistory /></ProtectedRoute>} />
                <Route path="/dashboard/tenant/browse" element={<ProtectedRoute allowedRoles={['tenant']}><TenantBrowse /></ProtectedRoute>} />
                <Route path="/account" element={<ProtectedRoute allowedRoles={['tenant', 'house_manager', 'super_admin']}><Account /></ProtectedRoute>} />
                <Route path="/account/edit" element={<ProtectedRoute allowedRoles={['tenant', 'house_manager', 'super_admin']}><EditProfile /></ProtectedRoute>} />
                <Route path="/account/change-password" element={<ProtectedRoute allowedRoles={['tenant', 'house_manager', 'super_admin']}><ChangePassword /></ProtectedRoute>} />
                <Route path="/account/change-pin" element={<ProtectedRoute allowedRoles={['tenant', 'house_manager', 'super_admin']}><ChangePin /></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute allowedRoles={['tenant', 'house_manager', 'super_admin']}><Notifications /></ProtectedRoute>} />
                <Route path="/onboarding" element={<ProtectedRoute allowedRoles={['tenant', 'house_manager']}><Onboarding /></ProtectedRoute>} />
              </Route>

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <MobileAppBanner />
          </ErrorBoundary>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </ThemeProvider>
</QueryClientProvider>);

export default App;
