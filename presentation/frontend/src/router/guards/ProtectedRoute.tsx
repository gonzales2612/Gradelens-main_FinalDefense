import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth";
import { ROUTES } from "@/lib/constants";
import { Loading } from "@/components/loading";
import type { JSX } from "react";

export function ProtectedRoute({
  children,
}: {
  children: JSX.Element;
}) {
  const { isAuthenticated, isLoading } = useAuth();

  // Prevent flicker during hydration
  if (isLoading) {
    return <Loading fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return children;
}