import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth";
import { ROUTES } from "@/lib/constants";
import { Loading } from "@/components/loading";
import type { JSX } from "react";

export function AdminRoute({
  children,
}: {
  children: JSX.Element;
}) {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Prevent flicker during hydration
  if (isLoading) {
    return <Loading fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  // Only admins can access
  if (user?.role !== "admin") {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return children;
}
