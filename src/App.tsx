import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "next-themes";
import { Component, ErrorInfo, ReactNode, Suspense, lazy } from "react";
import { usePageViewTracking } from "@/services/tracking";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./components/DashboardLayout";
import MobileAppBanner from "./components/MobileAppBanner";

const Index = lazy(() => import("./pages/Index"));
const LoginPage = lazy(() => import("./pages/Login"));
const RegisterPage = lazy(() => import("./pages/Register"));
const PropertiesPage = lazy(() => import("./pages/Properties"));
const PropertyDetailPage = lazy(() => import("./pages/PropertyDetail"));
const ManagerDashboard = lazy(() => import("./pages/ManagerDashboard"));
const BoostPage = lazy(() => import("./pages/BoostPage"));
const TenantDashboard = lazy(() => import("./pages/TenantDashboard"));
const SuperAdminDashboard = lazy(() => import("./pages/SuperAdminDashboard"));
const ManagerDetail = lazy(() => import("./pages/ManagerDetail"));
const AcceptInvitePage = lazy(() => import("./pages/AcceptInvite"));
const AboutPage = lazy(() => import("./pages/About"));
const ContactPage = lazy(() => import("./pages/Contact"));
const PrivacyPage = lazy(() => import("./pages/Privacy"));
const TermsPage = lazy(() => import("./pages/Terms"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ForgotPin = lazy(() => import("./pages/ForgotPin"));
const PhoneAuth = lazy(() => import("./pages/PhoneAuth"));
const EmailSignup = lazy(() => import("./pages/EmailSignup"));
const GettingStarted = lazy(() => import("./pages/GettingStarted"));
const PhoneOtp = lazy(() => import("./pages/PhoneOtp"));
const PhonePinSetup = lazy(() => import("./pages/PhonePinSetup"));
const PhoneSignin = lazy(() => import("./pages/PhoneSignin"));
const ChangePin = lazy(() => import("./pages/ChangePin"));
const Account = lazy(() => import("./pages/Account"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));
const ManagerTenancies = lazy(() => import("./pages/ManagerTenancies"));
const ManagerCreateTenancy = lazy(() => import("./pages/ManagerCreateTenancy"));
const ManagerTenancyDetail = lazy(() => import("./pages/ManagerTenancyDetail"));
const ManagerEditTenancy = lazy(() => import("./pages/ManagerEditTenancy"));
const ManagerReports = lazy(() => import("./pages/ManagerReports"));
const TenantPayments = lazy(() => import("./pages/TenantPayments"));
const TenantPaymentDetail = lazy(() => import("./pages/TenantPaymentDetail"));
const ManagerSubscription = lazy(() => import("./pages/ManagerSubscription"));
const PaymentStatus = lazy(() => import("./pages/PaymentStatus"));
const AgreementView = lazy(() => import("./pages/AgreementView"));
const AgreementHistory = lazy(() => import("./pages/AgreementHistory"));
const Notifications = lazy(() => import("./pages/Notifications"));
const CreateProperty = lazy(() => import("./pages/CreateProperty"));
const EditProperty = lazy(() => import("./pages/EditProperty"));
const TenantBrowse = lazy(() => import("./pages/TenantBrowse"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ManagerPaymentVerifications = lazy(() => import("./pages/ManagerPaymentVerifications"));
const ManagerPaymentDetail = lazy(() => import("./pages/ManagerPaymentDetail"));
const ManagerCreateAgreement = lazy(() => import("./pages/ManagerCreateAgreement"));
const TenantSubmitPayment = lazy(() => import("./pages/TenantSubmitPayment"));
const GuestExplore = lazy(() => import("./pages/GuestExplore"));
const ManagerProperties = lazy(() => import("./pages/ManagerProperties"));
const ManagerPaymentHistory = lazy(() => import("./pages/ManagerPaymentHistory"));
const TenantMyTenancy = lazy(() => import("./pages/TenantMyTenancy"));
const ManagerTenantDetail = lazy(() => import("./pages/ManagerTenantDetail"));
const AgreementPreview = lazy(() => import("./pages/AgreementPreview"));
const AgreementSummary = lazy(() => import("./pages/AgreementSummary"));

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

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

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
            <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public routes (no sidebar) */}
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<EmailSignup />} />
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
                <Route path="/dashboard/super-admin" element={<ProtectedRoute allowedRoles={['super_admin']}><SuperAdminDashboard initialTab="overview" /></ProtectedRoute>} />
                <Route path="/dashboard/super-admin/approvals" element={<ProtectedRoute allowedRoles={['super_admin']}><SuperAdminDashboard initialTab="approvals" /></ProtectedRoute>} />
                <Route path="/dashboard/super-admin/managers" element={<ProtectedRoute allowedRoles={['super_admin']}><SuperAdminDashboard initialTab="managers" /></ProtectedRoute>} />
                <Route path="/dashboard/super-admin/settings" element={<ProtectedRoute allowedRoles={['super_admin']}><SuperAdminDashboard initialTab="settings" /></ProtectedRoute>} />
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
            </Suspense>
            <MobileAppBanner />
          </ErrorBoundary>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </ThemeProvider>
</QueryClientProvider>);

export default App;
