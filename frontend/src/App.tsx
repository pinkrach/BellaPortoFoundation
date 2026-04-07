import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Impact from "./pages/Impact";
import About from "./pages/About";
import Login from "./pages/Login";
import SignUpPage from "./pages/SignUpPage";
import AdminDashboard from "./pages/AdminDashboard";
import AdminDonors from "./pages/AdminDonors";
import CaseloadInventory from "./pages/CaseloadInventory";
import HomeVisitationsPage from "./pages/HomeVisitationsPage";
import ProcessRecordingsPage from "./pages/ProcessRecordingsPage";
import SocialMediaDashboard from "./pages/SocialMediaDashboard";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import DonorDashboard from "./pages/DonorDashboard";
import ForgotPassword from "./pages/ForgotPassword";
import UpdatePassword from "./pages/UpdatePassword";
import { CookieBanner } from "@/components/CookieBanner";

const queryClient = new QueryClient();
const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, "");

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename={routerBasename || undefined}>
          <>
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
                    <AdminDonors />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/caseload"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <CaseloadInventory />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/recordings"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <ProcessRecordingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/visitations"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <HomeVisitationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/social"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <SocialMediaDashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <CookieBanner />
          </>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
