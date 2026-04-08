import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { CookieBanner } from "@/components/CookieBanner";

import Index from "./pages/Index";
import Impact from "./pages/Impact";
import About from "./pages/About";
import Login from "./pages/Login";
import SignUpPage from "./pages/SignUpPage";
import ForgotPassword from "./pages/ForgotPassword";
import UpdatePassword from "./pages/UpdatePassword";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import NotFound from "./pages/NotFound";

import DonorDashboard from "./pages/DonorDashboard";

import AdminDashboard from "./pages/AdminDashboard";
import SettingsPage from "./pages/SettingsPage";

const queryClient = new QueryClient();
const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, "");

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <div className="flex min-h-dvh w-full flex-1 flex-col">
          <Toaster />
          <Sonner />
          <BrowserRouter basename={routerBasename || undefined}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/about" element={<About />} />
              <Route path="/impact" element={<Impact />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<UpdatePassword />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />

              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute requiredRole="donor">
                    <DonorDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/donors"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Navigate to="/admin?tab=donations" replace />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/donors/new-supporter"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Navigate to="/admin?tab=donations&donationsSubTab=supporters" replace />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/donors/new-donation"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Navigate to="/admin?tab=donations&donationsSubTab=donations" replace />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/donors/new-allocation"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Navigate to="/admin?tab=donations&donationsSubTab=allocations" replace />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/caseload"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Navigate to="/admin?tab=residents" replace />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/recordings"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Navigate to="/admin?tab=residents&residentsSubTab=process-records" replace />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/recordings"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Navigate to="/admin?tab=residents&residentsSubTab=process-records" replace />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/visitations"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Navigate to="/admin?tab=residents&residentsSubTab=visitations" replace />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/visitations"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Navigate to="/admin?tab=residents&residentsSubTab=visitations" replace />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/social"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Navigate to="/admin?tab=outreach&outreachSubTab=social-media" replace />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/media"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Navigate to="/admin?tab=outreach&outreachSubTab=social-media" replace />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/reports"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Navigate to="/admin?tab=reports" replace />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<NotFound />} />
            </Routes>

            <CookieBanner />
          </BrowserRouter>
        </div>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
