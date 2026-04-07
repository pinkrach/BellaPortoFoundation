import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ReactNode } from "react";

export const ProtectedRoute = ({
  children,
  requiredRole,
}: {
  children: ReactNode;
  requiredRole?: "admin" | "donor";
}) => {
  const { isAuthenticated, isLoading, role } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (requiredRole && role && role !== requiredRole) {
    return <Navigate to={role === "admin" ? "/admin" : "/dashboard"} replace />;
  }

  // If role hasn't loaded/doesn't exist, allow the route to render only when
  // no role requirement is specified.
  if (requiredRole && !role) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};
