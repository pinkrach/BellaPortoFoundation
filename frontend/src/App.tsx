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
import CaseloadInventory from "./pages/CaseloadInventory";
import SocialMediaDashboard from "./pages/SocialMediaDashboard";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import DonorDashboard from "./pages/DonorDashboard";

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
                path="/admin/caseload"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <CaseloadInventory />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/reports"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Reports />
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
          </BrowserRouter>
        </div>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
