// ============================================================
// Landing.tsx — MarketLens Home Page
// ============================================================
// Professor explanation: This is the main landing page that users
// see when they first visit the website. It showcases the product
// and guides users to sign up or explore the dashboard.
// ============================================================

import { Link } from "react-router";
import { motion } from "framer-motion";
import {
  Search,
  LineChart,
  Star,
  BarChart3,
  TrendingUp,
  BookOpen,
  BrainCircuit,
  ArrowRight,
  Github,
  Mail,
  ChevronRight,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { marketIndices } from "@/data/mockData";

// Animation config: fade elements in as they scroll into view
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

// Feature cards data
const features = [
  { icon: Search, title: "Stock Search", desc: "Search and explore stocks using company names or ticker symbols." },
  { icon: LineChart, title: "Interactive Charts", desc: "View historical stock performance through clean interactive charts." },
  { icon: Star, title: "Watchlist", desc: "Keep track of stocks you're interested in all in one place." },
  { icon: BarChart3, title: "Market Overview", desc: "Monitor major market indices at a glance from your dashboard." },
  { icon: TrendingUp, title: "Paper Trading", desc: "Practise buying and selling stocks using virtual money risk-free." },
  { icon: BrainCircuit, title: "ML Price Prediction", desc: "Upload NIFTY 500 data and train five ML models — Linear Regression, SVR, Gradient Boosting, XGBoost and a tuned XGBoost — to forecast next-day closing prices." },
  { icon: BookOpen, title: "Stock Analysis", desc: "Understand price movements, trends and market sentiment." },
];

// How it works steps
const steps = [
  { num: "1", title: "Create an Account", desc: "Sign up and access your personal dashboard in seconds." },
  { num: "2", title: "Explore the Market", desc: "Search stocks, view charts and analyze market movements." },
  { num: "3", title: "Practise & Learn", desc: "Use paper trading to practise investment decisions without risk." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-cream text-ink">
      <Navbar variant="landing" />

      {/* ==================== HERO SECTION ==================== */}
      <section id="home" className="relative overflow-hidden">
        {/* Decorative notebook doodles */}
        <div className="absolute top-20 left-10 w-32 h-32 border-2 border-blue-ink/10 rounded-full blur-sm" />
        <div className="absolute bottom-10 right-20 w-48 h-48 border-2 border-purple-accent/10 rounded-full blur-sm" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: headline and CTA */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-ink/10 text-blue-ink rounded-full text-sm font-medium mb-6">
                <TrendingUp size={14} />
                Stock Market Analysis Platform
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-ink leading-tight font-heading">
                Understand the Market.{" "}
                <span className="text-blue-ink">Make Smarter Decisions.</span>
              </h1>
              <p className="mt-6 text-lg text-ink/60 leading-relaxed max-w-xl">
                MarketLens Notebook brings stock analysis, market insights, interactive charts
                and risk-free paper trading together in one simple platform — including a
                machine-learning lab that forecasts next-day prices from your own market data.
              </p>
              <div className="flex flex-wrap gap-4 mt-8">
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-ink text-white font-medium rounded-xl hover:bg-blue-ink/90 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  Get Started
                  <ArrowRight size={18} />
                </Link>
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-2 px-6 py-3 border-2 border-ink/20 text-ink font-medium rounded-xl hover:border-blue-ink hover:text-blue-ink transition-all duration-200"
                >
                  Explore Dashboard
                  <ChevronRight size={18} />
                </Link>
              </div>
            </motion.div>

            {/* Right: decorative chart illustration */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="hidden lg:block"
            >
              <div className="bg-card rounded-2xl border-2 border-ink/10 p-6 shadow-xl notebook-card">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                  <span className="ml-2 text-xs text-ink/40 font-mono">marketlens-dashboard</span>
                </div>
                {/* Mini chart SVG */}
                <svg viewBox="0 0 400 180" className="w-full">
                  <defs>
                    <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,140 Q50,120 80,100 T160,80 T240,50 T320,30 T400,20 L400,180 L0,180 Z"
                    fill="url(#heroGrad)"
                  />
                  <path
                    d="M0,140 Q50,120 80,100 T160,80 T240,50 T320,30 T400,20"
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  {/* Data points */}
                  <circle cx="80" cy="100" r="4" fill="#2563eb" />
                  <circle cx="160" cy="80" r="4" fill="#2563eb" />
                  <circle cx="240" cy="50" r="4" fill="#2563eb" />
                  <circle cx="320" cy="30" r="4" fill="#2563eb" />
                </svg>
                <div className="flex justify-between mt-4 text-xs text-ink/40 font-mono">
                  <span>Jan</span><span>Mar</span><span>May</span><span>Jul</span><span>Sep</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ==================== MARKET PREVIEW ==================== */}
      <section className="py-16 border-y-2 border-ink/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">              <p className="text-center text-sm text-ink/40 font-medium uppercase tracking-wider mb-8">
              Live Market Snapshot — MarketLens Notebook
            </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {marketIndices.map((idx) => (
              <motion.div
                key={idx.symbol}
                whileHover={{ y: -4 }}
                className="bg-card rounded-xl border-2 border-ink/10 p-5 text-center shadow-sm hover:shadow-md transition-all duration-200 notebook-card"
              >
                <p className="text-sm font-semibold text-ink/50 font-mono">{idx.symbol}</p>
                <p className="text-2xl font-bold text-ink mt-1 font-heading">{idx.value}</p>
                <p className={`text-sm font-semibold mt-1 ${idx.positive ? "text-green-600" : "text-red-500"}`}>
                  {idx.change}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FEATURES SECTION ==================== */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-ink font-heading">
              Everything You Need
            </h2>
            <p className="mt-3 text-ink/50 max-w-lg mx-auto">
              Powerful tools to help you understand, track, and practise with the stock market.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={{ ...fadeInUp, visible: { ...fadeInUp.visible, transition: { duration: 0.5, delay: i * 0.1 } } }}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className="bg-card rounded-2xl border-2 border-ink/10 p-6 shadow-sm hover:shadow-lg transition-all duration-300 group notebook-card"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-ink/10 flex items-center justify-center mb-4 group-hover:bg-blue-ink group-hover:text-white transition-all duration-300">
                  <f.icon size={22} className="text-blue-ink group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-lg font-bold text-ink mb-2 font-heading">{f.title}</h3>
                <p className="text-sm text-ink/50 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== HOW IT WORKS ==================== */}
      <section id="how-it-works" className="py-20 bg-ink/[0.02]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
            className="text-center mb-14"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-ink font-heading">
              How It Works
            </h2>
            <p className="mt-3 text-ink/50">Three simple steps to get started.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <motion.div
                key={s.num}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={{ ...fadeInUp, visible: { ...fadeInUp.visible, transition: { duration: 0.5, delay: i * 0.15 } } }}
                className="text-center"
              >
                <div className="w-14 h-14 mx-auto rounded-full bg-blue-ink text-white flex items-center justify-center text-xl font-bold font-heading shadow-lg">
                  {s.num}
                </div>
                {/* Connector line between steps */}
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute mt-7 ml-[calc(50%+40px)] w-[calc(100%-80px)] h-0.5 bg-ink/10" />
                )}
                <h3 className="text-lg font-bold text-ink mt-5 mb-2 font-heading">{s.title}</h3>
                <p className="text-sm text-ink/50 max-w-xs mx-auto">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FINAL CTA ==================== */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="bg-card rounded-3xl border-2 border-ink/10 p-12 sm:p-16 shadow-xl notebook-card"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-ink font-heading">
              Ready to Explore the Market?
            </h2>
            <p className="mt-4 text-ink/50 max-w-md mx-auto">
              Join MarketLens and start your journey into stock market analysis today.
            </p>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 mt-8 px-8 py-4 bg-blue-ink text-white font-semibold rounded-xl hover:bg-blue-ink/90 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 text-lg"
            >
              Get Started
              <ArrowRight size={20} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="border-t-2 border-ink/10 bg-ink/[0.02]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-blue-ink rounded-lg flex items-center justify-center text-white">
                  <TrendingUp size={16} />
                </div>
                <span className="text-lg font-bold text-ink font-heading">MarketLens</span>
              </div>
              <p className="text-sm text-ink/40 leading-relaxed">
                A modern stock market analysis platform built for learning and exploration.
              </p>
            </div>
            {/* Links */}
            <div>
              <h4 className="font-semibold text-ink mb-3 font-heading">Product</h4>
              <ul className="space-y-2 text-sm text-ink/50">
                <li><a href="#features" className="hover:text-blue-ink transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-blue-ink transition-colors">How It Works</a></li>
                <li><Link to="/auth" className="hover:text-blue-ink transition-colors">Get Started</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-ink mb-3 font-heading">Company</h4>
              <ul className="space-y-2 text-sm text-ink/50">
                <li><a href="#home" className="hover:text-blue-ink transition-colors">About</a></li>
                <li><a href="mailto:contact@marketlens.dev" className="hover:text-blue-ink transition-colors flex items-center gap-1"><Mail size={14} /> Contact</a></li>
                <li><a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-blue-ink transition-colors flex items-center gap-1"><Github size={14} /> GitHub</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-ink mb-3 font-heading">Legal</h4>
              <ul className="space-y-2 text-sm text-ink/50">
                <li><Link to="/auth" className="hover:text-blue-ink transition-colors">Login</Link></li>
              </ul>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="mt-10 pt-6 border-t border-ink/10 text-center">
            <p className="text-xs text-ink/30">
              MarketLens Notebook is an academic project and paper trading uses simulated money only.
              This is not financial advice.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
