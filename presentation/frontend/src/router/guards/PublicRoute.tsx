import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth";
import { ROUTES } from "@/lib/constants";
import { Loading } from "@/components/loading";
import type { JSX } from "react";

export function PublicRoute({
  children,
}: {
  children: JSX.Element;
}) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <Loading fullScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return children;
}