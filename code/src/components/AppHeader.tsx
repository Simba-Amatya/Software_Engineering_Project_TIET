// ============================================================
// AppHeader.tsx — Shared header for authenticated pages
// ============================================================
// Used by the Dashboard and the ML Lab. Shows the logo, page
// navigation, an optional search box, the signed-in user and
// a logout button. Stays sticky with a blurred cream backdrop.
// ============================================================

import { useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  TrendingUp,
  Search,
  Bell,
  LogOut,
  BrainCircuit,
  LayoutDashboard,
  BarChart3,
  Star,
  CheckCheck,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// ------------------------------------------------------------
// Notifications (demo data — would come from a backend later)
// ------------------------------------------------------------

interface NotificationItem {
  id: number;
  kind: "price" | "index" | "ml" | "watchlist";
  title: string;
  desc: string;
  time: string;
  read: boolean;
  to?: string;
}

const initialNotifications: NotificationItem[] = [
  {
    id: 1,
    kind: "price",
    title: "TCS up 1.13% today",
    desc: "Tata Consultancy Services is among the top NIFTY 50 gainers right now.",
    time: "5m ago",
    read: false,
  },
  {
    id: 2,
    kind: "index",
    title: "NIFTY BANK at 48,512",
    desc: "The banking index is trading near a fresh 52-week high.",
    time: "24m ago",
    read: false,
  },
  {
    id: 3,
    kind: "ml",
    title: "ML Lab forecast ready",
    desc: "Your TCS, RELIANCE and HDFCBANK next-day predictions are ready to view.",
    time: "1h ago",
    read: false,
    to: "/ml-lab",
  },
  {
    id: 4,
    kind: "watchlist",
    title: "Watchlist alert: INFY",
    desc: "Infosys moved -0.59% — past your 0.5% daily move threshold.",
    time: "2h ago",
    read: true,
  },
];

const notifIcon = {
  price: TrendingUp,
  index: BarChart3,
  ml: BrainCircuit,
  watchlist: Star,
};

const notifIconColor = {
  price: "text-green-600 bg-green-50",
  index: "text-blue-ink bg-blue-ink/10",
  ml: "text-purple-accent bg-purple-accent/10",
  watchlist: "text-yellow-600 bg-yellow-50",
};

interface AppHeaderProps {
  /** When provided, renders the stock search input */
  searchValue?: string;
  onSearch?: (value: string) => void;
}

export function AppHeader({ searchValue, onSearch }: AppHeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const openNotification = (n: NotificationItem) => {
    setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    if (n.to) navigate(n.to);
  };

  const navLink = (to: string, label: string, icon: ReactNode) => {
    const active = pathname.startsWith(to);
    return (
      <Link
        to={to}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
          active
            ? "bg-blue-ink/10 text-blue-ink"
            : "text-ink/50 hover:text-ink hover:bg-ink/5"
        }`}
      >
        {icon}
        {label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-50 bg-cream/90 backdrop-blur-md border-b-2 border-ink/10 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 bg-blue-ink rounded-lg flex items-center justify-center text-white font-bold text-sm">
            <TrendingUp size={18} />
          </div>
          <span className="text-lg font-bold text-ink font-heading hidden sm:block">MarketLens</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLink("/dashboard", "Dashboard", <LayoutDashboard size={15} />)}
          {navLink("/ml-lab", "ML Lab", <BrainCircuit size={15} />)}
        </nav>

        {/* Search bar */}
        {onSearch && (
          <div className="flex-1 max-w-md hidden sm:block">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
              <input
                type="text"
                placeholder="Search stocks..."
                value={searchValue ?? ""}
                onChange={(e) => onSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-card border-2 border-ink/10 rounded-xl text-sm text-ink placeholder-ink/30 focus:outline-none focus:border-blue-ink focus:ring-2 focus:ring-blue-ink/20 transition-all"
              />
            </div>
          </div>
        )}

        {/* Right side: notifications, user, logout */}
        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="p-2 text-ink/40 hover:text-ink hover:bg-ink/5 rounded-lg transition-colors relative"
                aria-label="Notifications"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[340px] sm:w-[380px] p-0 overflow-hidden rounded-2xl border-2 border-ink/10">
              {/* Panel header */}
              <div className="flex items-center justify-between px-4 py-3 border-b-2 border-ink/10">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-ink font-heading">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[11px] bg-red-500 text-white font-bold px-1.5 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-blue-ink font-semibold hover:underline inline-flex items-center gap-1"
                  >
                    <CheckCheck size={14} /> Mark all read
                  </button>
                )}
              </div>

              {/* Notification list */}
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <Bell size={24} className="mx-auto mb-2 text-ink/20" />
                    <p className="text-sm text-ink/50">You're all caught up!</p>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const Icon = notifIcon[n.kind];
                    return (
                      <button
                        key={n.id}
                        onClick={() => openNotification(n)}
                        className={`w-full text-left px-4 py-3 flex gap-3 transition-colors border-b border-ink/5 hover:bg-ink/[0.03] ${
                          n.read ? "opacity-55" : ""
                        }`}
                      >
                        <div
                          className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${notifIconColor[n.kind]}`}
                        >
                          <Icon size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink leading-snug">{n.title}</p>
                          <p className="text-xs text-ink/50 mt-0.5 leading-relaxed">{n.desc}</p>
                          <p className="text-[11px] text-ink/30 mt-1 font-mono">{n.time}</p>
                        </div>
                        {!n.read && <span className="w-2 h-2 shrink-0 mt-1.5 ml-auto rounded-full bg-blue-ink" />}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Panel footer */}
              <div className="px-4 py-2.5 bg-ink/[0.02] border-t border-ink/5">
                <p className="text-[11px] text-ink/35 text-center">
                  Demo alerts — price moves, index updates and ML Lab results
                </p>
              </div>
            </PopoverContent>
          </Popover>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-card border-2 border-ink/10 rounded-xl">
            <div className="w-7 h-7 bg-blue-ink/10 rounded-full flex items-center justify-center text-blue-ink font-bold text-xs">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <span className="text-sm font-medium text-ink">{user?.name || "Investor"}</span>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-ink/40 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}