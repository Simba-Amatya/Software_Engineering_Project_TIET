// ============================================================
// Navbar.tsx — Sticky navigation bar with mobile hamburger menu
// ============================================================

import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "@/contexts/AuthContext";
import { Menu, X, TrendingUp } from "lucide-react";

interface NavbarProps {
  variant?: "landing" | "dashboard";
}

export default function Navbar({ variant = "landing" }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
    setMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-cream/90 backdrop-blur-md border-b-2 border-ink/10 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-blue-ink rounded-lg flex items-center justify-center text-white font-bold text-sm group-hover:rotate-12 transition-transform">
              <TrendingUp size={18} />
            </div>
            <span className="text-xl font-bold text-ink tracking-tight font-heading">
              MarketLens Notebook
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {variant === "landing" && (
              <>
                <a href="#home" className="nav-link">Home</a>
                <a href="#features" className="nav-link">Features</a>
                <a href="#how-it-works" className="nav-link">How It Works</a>
              </>
            )}
            {variant === "dashboard" && (
              <>
                <Link to="/dashboard" className="nav-link">Dashboard</Link>
              </>
            )}

            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className="nav-link">Dashboard</Link>
                <button
                  onClick={handleLogout}
                  className="ml-2 px-4 py-2 text-sm font-medium text-blue-ink border-2 border-blue-ink rounded-lg hover:bg-blue-ink hover:text-white transition-all duration-200"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/auth" className="nav-link">Login</Link>
                <Link
                  to="/auth"
                  className="ml-2 px-4 py-2 text-sm font-medium text-white bg-blue-ink rounded-lg hover:bg-blue-ink/90 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger button */}
          <button
            className="md:hidden p-2 text-ink hover:bg-ink/5 rounded-lg transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {menuOpen && (
        <div className="md:hidden border-t-2 border-ink/10 bg-cream/95 backdrop-blur-md">
          <div className="px-4 py-4 space-y-2">
            {variant === "landing" && (
              <>
                <a href="#home" className="block px-4 py-2 text-ink hover:bg-ink/5 rounded-lg transition-colors" onClick={() => setMenuOpen(false)}>Home</a>
                <a href="#features" className="block px-4 py-2 text-ink hover:bg-ink/5 rounded-lg transition-colors" onClick={() => setMenuOpen(false)}>Features</a>
                <a href="#how-it-works" className="block px-4 py-2 text-ink hover:bg-ink/5 rounded-lg transition-colors" onClick={() => setMenuOpen(false)}>How It Works</a>
              </>
            )}
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className="block px-4 py-2 text-ink hover:bg-ink/5 rounded-lg transition-colors" onClick={() => setMenuOpen(false)}>Dashboard</Link>
                <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">Logout</button>
              </>
            ) : (
              <>
                <Link to="/auth" className="block px-4 py-2 text-ink hover:bg-ink/5 rounded-lg transition-colors" onClick={() => setMenuOpen(false)}>Login</Link>
                <Link to="/auth" className="block px-4 py-2 text-center text-white bg-blue-ink rounded-lg hover:bg-blue-ink/90 transition-colors" onClick={() => setMenuOpen(false)}>Get Started</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
