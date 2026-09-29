// ============================================================
// Auth.tsx — Login & Register page (split-screen design)
// ============================================================
// Professor explanation: This page handles both Login and Register.
// It uses a state variable 'mode' to toggle between the two forms.
// The left side shows decorative visuals, the right side has the form.
// Auth is JWT-ready: login stores a token in localStorage.
// ============================================================

import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { TrendingUp, Mail, Lock, User, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";

interface AuthProps {
  redirectAfterAuth?: string;
}

export default function Auth({ redirectAfterAuth = "/dashboard" }: AuthProps) {
  const { isAuthenticated, login, register, isLoading: authBusy } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Determine where to go after login
  const returnTo = searchParams.get("returnTo");
  const redirect = returnTo && returnTo.startsWith("/") ? returnTo : redirectAfterAuth;

  // Toggle between "login" and "register" mode
  const [mode, setMode] = useState<"login" | "register">("login");

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // UI state
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!authBusy && isAuthenticated) {
      navigate(redirect);
    }
  }, [authBusy, isAuthenticated, navigate, redirect]);

  // Handle login form submit
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const success = await login(email, password);
    if (success) {
      navigate(redirect);
    } else {
      setError("Login failed. Please try again.");
    }
    setSubmitting(false);
  };

  // Handle register form submit
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Basic validation
    if (!name.trim()) { setError("Please enter your name."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }

    setSubmitting(true);
    const success = await register(name, email, password);
    if (success) {
      navigate(redirect);
    } else {
      setError("Registration failed. Please try again.");
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex bg-cream">
      {/* ============ LEFT SIDE: Decorative visuals ============ */}
      <div className="hidden lg:flex lg:w-1/2 bg-blue-ink relative overflow-hidden items-center justify-center">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Floating chart illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center px-12"
        >
          <div className="w-20 h-20 mx-auto bg-white/20 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-sm">
            <TrendingUp size={40} className="text-white" />
          </div>            <h2 className="text-3xl font-bold text-white mb-4 font-heading">Welcome to MarketLens Notebook</h2>
            <p className="text-white/70 max-w-sm mx-auto leading-relaxed">
              Your notebook for understanding the stock market through interactive analysis and paper trading.
            </p>

          {/* Mini animated chart */}
          <div className="mt-10 bg-white/10 rounded-2xl p-6 backdrop-blur-sm">
            <svg viewBox="0 0 300 100" className="w-full">
              <defs>
                <linearGradient id="authGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="white" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="white" stopOpacity="0" />
                </linearGradient>
              </defs>
              <motion.path
                d="M0,80 Q30,70 60,55 T120,40 T180,25 T240,15 T300,10"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, ease: "easeInOut" }}
              />
            </svg>
            <div className="flex justify-between text-white/40 text-xs font-mono mt-2">
              <span>$180</span>
              <span className="text-green-300">+2.43%</span>
              <span>$192</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ============ RIGHT SIDE: Login / Register form ============ */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link to="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-blue-ink rounded-lg flex items-center justify-center text-white font-bold text-sm">
              <TrendingUp size={18} />
            </div>
            <span className="text-xl font-bold text-ink font-heading">MarketLens Notebook</span>
          </Link>

          <AnimatePresence mode="wait">
            {mode === "login" ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <h1 className="text-3xl font-bold text-ink font-heading">Welcome Back</h1>
                <p className="text-ink/50 mt-2">Sign in to access your dashboard</p>

                <form onSubmit={handleLogin} className="mt-8 space-y-5">
                  {/* Email input */}
                  <div>
                    <label className="block text-sm font-medium text-ink/70 mb-1.5">Email</label>
                    <div className="relative">
                      <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className="w-full pl-10 pr-4 py-3 bg-card border-2 border-ink/10 rounded-xl text-ink placeholder-ink/30 focus:outline-none focus:border-blue-ink focus:ring-2 focus:ring-blue-ink/20 transition-all"
                      />
                    </div>
                  </div>

                  {/* Password input */}
                  <div>
                    <label className="block text-sm font-medium text-ink/70 mb-1.5">Password</label>
                    <div className="relative">
                      <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full pl-10 pr-12 py-3 bg-card border-2 border-ink/10 rounded-xl text-ink placeholder-ink/30 focus:outline-none focus:border-blue-ink focus:ring-2 focus:ring-blue-ink/20 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30 hover:text-ink/60 transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 bg-blue-ink text-white font-semibold rounded-xl hover:bg-blue-ink/90 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {submitting ? (
                      <><Loader2 size={18} className="animate-spin" /> Signing in...</>
                    ) : (
                      <>Login <ArrowRight size={18} /></>
                    )}
                  </button>
                </form>

                <p className="mt-6 text-center text-sm text-ink/50">
                  Don't have an account?{" "}
                  <button
                    onClick={() => { setMode("register"); setError(""); }}
                    className="text-blue-ink font-semibold hover:underline"
                  >
                    Create Account
                  </button>
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="register"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h1 className="text-3xl font-bold text-ink font-heading">Create Account</h1>
                <p className="text-ink/50 mt-2">Join MarketLens and start exploring</p>

                <form onSubmit={handleRegister} className="mt-8 space-y-5">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-ink/70 mb-1.5">Full Name</label>
                    <div className="relative">
                      <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        required
                        className="w-full pl-10 pr-4 py-3 bg-card border-2 border-ink/10 rounded-xl text-ink placeholder-ink/30 focus:outline-none focus:border-blue-ink focus:ring-2 focus:ring-blue-ink/20 transition-all"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-ink/70 mb-1.5">Email</label>
                    <div className="relative">
                      <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className="w-full pl-10 pr-4 py-3 bg-card border-2 border-ink/10 rounded-xl text-ink placeholder-ink/30 focus:outline-none focus:border-blue-ink focus:ring-2 focus:ring-blue-ink/20 transition-all"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-ink/70 mb-1.5">Password</label>
                    <div className="relative">
                      <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        required
                        className="w-full pl-10 pr-12 py-3 bg-card border-2 border-ink/10 rounded-xl text-ink placeholder-ink/30 focus:outline-none focus:border-blue-ink focus:ring-2 focus:ring-blue-ink/20 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30 hover:text-ink/60 transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-ink/70 mb-1.5">Confirm Password</label>
                    <div className="relative">
                      <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        required
                        className="w-full pl-10 pr-4 py-3 bg-card border-2 border-ink/10 rounded-xl text-ink placeholder-ink/30 focus:outline-none focus:border-blue-ink focus:ring-2 focus:ring-blue-ink/20 transition-all"
                      />
                    </div>
                  </div>

                  {error && (
                    <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 bg-blue-ink text-white font-semibold rounded-xl hover:bg-blue-ink/90 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {submitting ? (
                      <><Loader2 size={18} className="animate-spin" /> Creating account...</>
                    ) : (
                      <>Create Account <ArrowRight size={18} /></>
                    )}
                  </button>
                </form>

                <p className="mt-6 text-center text-sm text-ink/50">
                  Already have an account?{" "}
                  <button
                    onClick={() => { setMode("login"); setError(""); }}
                    className="text-blue-ink font-semibold hover:underline"
                  >
                    Sign In
                  </button>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
