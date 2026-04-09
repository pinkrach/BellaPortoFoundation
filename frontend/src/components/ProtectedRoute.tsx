import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ReactNode } from "react";

export const ProtectedRoute = ({
  children,
  requiredRole,
  requiredRoles,
}: {
  children: ReactNode;
  requiredRole?: "admin" | "donor";
  requiredRoles?: Array<"admin" | "donor">;
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

  const allowedRoles = requiredRoles?.length ? requiredRoles : requiredRole ? [requiredRole] : undefined;

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to={role === "admin" ? "/admin" : "/dashboard"} replace />;
  }

  // If role hasn't loaded/doesn't exist, allow the route to render only when
  // no role requirement is specified.
  if (allowedRoles && !role) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="text-base font-semibold text-foreground">We could not confirm your access level.</div>
          <div className="mt-2 text-sm text-muted-foreground">
            Your account is signed in, but the app could not load a valid role yet. Please refresh, or ask an admin to verify your profile access.
          </div>
        </div>
      </div>
    );
  }
  return <>{children}</>;
};
