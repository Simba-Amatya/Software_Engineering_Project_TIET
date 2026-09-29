// ============================================================
// RequireAuth.tsx — Protects routes that need login
// ============================================================
// Professor explanation: This component wraps any page that should
// only be visible to logged-in users. If the user isn't authenticated,
// they are redirected to the login page with a "returnTo" parameter
// so they come back to the right page after logging in.
// ============================================================

import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Show a loading spinner while checking auth status
  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream">
        <Loader2 className="size-6 animate-spin text-blue-ink" />
      </main>
    );
  }

  // Not logged in? Redirect to login with return path
  if (!isAuthenticated) {
    const returnTo = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to={`/auth?returnTo=${encodeURIComponent(returnTo)}`}
        replace
      />
    );
  }

  return children;
}
