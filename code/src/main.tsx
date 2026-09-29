import "@vly-ai/integrations";
import { Toaster } from "@/components/ui/sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { AuthProvider } from "@/contexts/AuthContext";
import React, { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import "./index.css";

// Lazy load pages for better performance
const Landing = lazy(() => import("./pages/Landing.tsx"));
const AuthPage = lazy(() => import("./pages/Auth.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const MlLab = lazy(() => import("./pages/MlLab.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

// Loading spinner while pages lazy-load
function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-cream">
      <div className="animate-pulse text-ink/40 font-heading">Loading MarketLens Notebook...</div>
    </div>
  );
}

// Error boundary — toolbar crashes won't break the app
class ToolbarErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ToolbarErrorBoundary>
      <VlyToolbar />
    </ToolbarErrorBoundary>
    {/* AuthProvider manages JWT-ready authentication state */}
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<RouteLoading />}>
          <Routes>
            {/* Public: Landing page */}
            <Route path="/" element={<Landing />} />
            {/* Public: Login / Register */}
            <Route path="/auth" element={<AuthPage redirectAfterAuth="/dashboard" />} />
            {/* Protected: Dashboard — redirects to /auth if not logged in */}
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <Dashboard />
                </RequireAuth>
              }
            />
            {/* Protected: ML Lab — the machine-learning prediction workspace */}
            <Route
              path="/ml-lab"
              element={
                <RequireAuth>
                  <MlLab />
                </RequireAuth>
              }
            />
            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster />
    </AuthProvider>
  </StrictMode>,
);
