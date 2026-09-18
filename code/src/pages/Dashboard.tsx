// ============================================================
// Dashboard.tsx — Main authenticated dashboard
// ============================================================
// Professor explanation: This is the core page after login.
// It shows market data, an interactive chart, and a watchlist.
// All data is currently mock/demo data (no real API calls).
// ============================================================

import { useState } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { AppHeader } from "@/components/AppHeader";
import StockChart from "@/components/StockChart";
import { marketIndices, stocks } from "@/data/mockData";
import { TrendingUp, Search, Star, BarChart3, LineChart, X, BrainCircuit } from "lucide-react";

// Fade-in animation for dashboard sections
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function Dashboard() {
  // Currently selected stock for the chart
  const [selectedStock, setSelectedStock] = useState(stocks[0]);
  // Which stocks are "starred" in the watchlist
  const [favorites, setFavorites] = useState<Set<string>>(new Set(["TCS", "RELIANCE"]));
  // Search filter for the watchlist
  const [searchQuery, setSearchQuery] = useState("");
  // Modal for "Coming Soon" quick actions
  const [modal, setModal] = useState<string | null>(null);

  // Toggle star/favorite on a stock
  const toggleFavorite = (symbol: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) next.delete(symbol);
      else next.add(symbol);
      return next;
    });
  };

  // Filter stocks by search
  const filteredStocks = stocks.filter(
    (s) =>
      s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Feature cards data
  const featureCards = [
    { icon: LineChart, title: "📈 Analyze", desc: "Interactive charts help you understand historical price movements." },
    { icon: Star, title: "⭐ Watch", desc: "Build your personal watchlist and keep important stocks together." },
    { icon: BrainCircuit, title: "🧠 Predict", desc: "Upload NIFTY data and train five ML models to forecast next-day closing prices." },
    { icon: BarChart3, title: "📊 Track", desc: "Monitor major market indices and stock performance from one dashboard." },
  ];

  // Quick action cards — some navigate to real pages, others open the "coming soon" modal
  const quickActions: { icon: typeof Search; label: string; desc: string; to?: string }[] = [
    { icon: BrainCircuit, label: "ML Price Prediction", desc: "Upload NIFTY 500 data and run five ML models that forecast next-day closing prices.", to: "/ml-lab" },
    { icon: Search, label: "Search a Stock", desc: "Find stocks by name or symbol" },
    { icon: Star, label: "Build Watchlist", desc: "Curate your favorite stocks" },
  ];

  return (
    <div className="min-h-screen bg-cream text-ink">
      {/* ============ HEADER ============ */}
      <AppHeader searchValue={searchQuery} onSearch={setSearchQuery} />

      {/* ============ MAIN CONTENT ============ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Welcome message */}
        <motion.div initial="hidden" animate="visible" variants={fadeIn}>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink font-heading">
            Welcome back, Investor 👋
          </h1>
          <p className="text-ink/50 mt-1">Here's a quick look at the market today.</p>
        </motion.div>

        {/* ============ MARKET CARDS ============ */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {marketIndices.map((idx) => (
            <motion.div
              key={idx.symbol}
              variants={fadeIn}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="bg-card rounded-2xl border-2 border-ink/10 p-5 shadow-sm hover:shadow-md transition-all duration-200 notebook-card"
            >
              <p className="text-xs font-semibold text-ink/40 font-mono uppercase tracking-wider">{idx.symbol}</p>
              <p className="text-2xl font-bold text-ink mt-1 font-heading">{idx.value}</p>
              <p className={`text-sm font-semibold mt-1 ${idx.positive ? "text-green-600" : "text-red-500"}`}>
                {idx.change}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* ============ CHART + WATCHLIST ============ */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main chart */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="lg:col-span-2"
          >
            <StockChart
              symbol={selectedStock.symbol}
              name={selectedStock.name}
              price={selectedStock.price}
              change={selectedStock.change}
            />
          </motion.div>

          {/* Watchlist */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ ...fadeIn, visible: { ...fadeIn.visible, transition: { duration: 0.5, delay: 0.15 } } }}
            className="bg-card rounded-2xl border-2 border-ink/10 p-6 shadow-sm notebook-card"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-ink font-heading flex items-center gap-2">
                <Star size={18} className="text-yellow-500" />
                Watchlist
              </h3>
              <span className="text-xs text-ink/30 font-mono">{filteredStocks.length} stocks</span>
            </div>

            <div className="space-y-2">
              {filteredStocks.map((stock) => {
                const isPositive = stock.change >= 0;
                const isSelected = selectedStock.symbol === stock.symbol;

                return (
                  <button
                    key={stock.symbol}
                    onClick={() => setSelectedStock(stock)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all duration-200 ${
                      isSelected
                        ? "bg-blue-ink/10 border-2 border-blue-ink/30"
                        : "bg-ink/[0.02] border-2 border-transparent hover:border-ink/10 hover:bg-ink/[0.04]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Favorite star */}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(stock.symbol); }}
                        className={`transition-colors ${favorites.has(stock.symbol) ? "text-yellow-500" : "text-ink/20 hover:text-yellow-300"}`}
                      >
                        <Star size={14} fill={favorites.has(stock.symbol) ? "currentColor" : "none"} />
                      </button>
                      <div>
                        <p className="text-sm font-bold text-ink">{stock.symbol}</p>
                        <p className="text-xs text-ink/40">{stock.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-ink">₹{stock.price.toFixed(2)}</p>
                      <p className={`text-xs font-semibold ${isPositive ? "text-green-600" : "text-red-500"}`}>
                        {stock.percentChange}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* ============ WHAT MARKETLENS OFFERS ============ */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        >
          <h2 className="text-xl font-bold text-ink mb-4 font-heading">What MarketLens Offers</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featureCards.map((card) => (
              <motion.div
                key={card.title}
                variants={fadeIn}
                whileHover={{ y: -4 }}
                className="bg-card rounded-2xl border-2 border-ink/10 p-5 shadow-sm hover:shadow-md transition-all duration-200 notebook-card"
              >
                <h3 className="font-bold text-ink mb-1 font-heading">{card.title}</h3>
                <p className="text-sm text-ink/50 leading-relaxed">{card.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ============ QUICK ACTIONS ============ */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        >
          <h2 className="text-xl font-bold text-ink mb-4 font-heading">Quick Actions</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {quickActions.map((action) => {
              const inner = (
                <>
                  <div className="w-10 h-10 rounded-xl bg-blue-ink/10 flex items-center justify-center mb-3 group-hover:bg-blue-ink group-hover:text-white transition-all duration-300">
                    <action.icon size={20} className="text-blue-ink group-hover:text-white transition-colors" />
                  </div>
                  <p className="font-bold text-ink font-heading">{action.label}</p>
                  <p className="text-sm text-ink/40 mt-1">{action.desc}</p>
                </>
              );
              const className =
                "bg-card rounded-2xl border-2 border-ink/10 p-6 text-left shadow-sm hover:shadow-lg hover:border-blue-ink/30 transition-all duration-200 group notebook-card";
              return action.to ? (
                <motion.div key={action.label} variants={fadeIn} whileHover={{ y: -4 }} className={className}>
                  <Link to={action.to} className="block">
                    {inner}
                  </Link>
                </motion.div>
              ) : (
                <motion.button
                  key={action.label}
                  variants={fadeIn}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setModal(action.label)}
                  className={className}
                >
                  {inner}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </main>

      {/* ============ COMING SOON MODAL ============ */}
      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/30 backdrop-blur-sm p-4"
            onClick={() => setModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-2xl border-2 border-ink/10 p-8 max-w-sm w-full shadow-2xl text-center notebook-card"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 mx-auto bg-blue-ink/10 rounded-2xl flex items-center justify-center mb-4">
                <TrendingUp size={28} className="text-blue-ink" />
              </div>
              <h3 className="text-xl font-bold text-ink font-heading">{modal}</h3>
              <p className="text-ink/50 mt-2 text-sm">
                This feature is coming soon! We're building it as part of the full MarketLens Notebook platform.
              </p>
              <button
                onClick={() => setModal(null)}
                className="mt-6 px-6 py-2 bg-blue-ink text-white font-medium rounded-xl hover:bg-blue-ink/90 transition-all duration-200 inline-flex items-center gap-2"
              >
                Got it <X size={16} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
