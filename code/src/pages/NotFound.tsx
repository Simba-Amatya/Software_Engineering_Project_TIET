// NotFound.tsx — 404 page
import { Link } from "react-router";
import { TrendingUp, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto bg-blue-ink/10 rounded-2xl flex items-center justify-center mb-6">
          <TrendingUp size={28} className="text-blue-ink" />
        </div>
        <h1 className="text-6xl font-bold text-ink font-heading">404</h1>
        <p className="text-ink/50 mt-3 text-lg">Page not found</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-blue-ink text-white font-medium rounded-xl hover:bg-blue-ink/90 transition-all duration-200 shadow-lg"
        >
          <ArrowLeft size={18} />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
