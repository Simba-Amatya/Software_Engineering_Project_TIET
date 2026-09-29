// ============================================================
// mockData.ts — All demo data lives in one file
// Professor explanation: This replaces a real database/API.
// In production, this data would come from a stock market API.
// ============================================================

// Market indices shown on the home page and dashboard (Indian indices)
export const marketIndices = [
  { symbol: "NIFTY 50", value: "22,450.85", change: "+1.24%", positive: true },
  { symbol: "SENSEX", value: "73,850.32", change: "+0.91%", positive: true },
  { symbol: "NIFTY BANK", value: "48,512.60", change: "+0.85%", positive: true },
  { symbol: "NIFTY IT", value: "38,450.22", change: "-0.41%", positive: false },
];

// Individual stock data for the watchlist (NSE-listed Indian stocks, INR prices)
export const stocks = [
  { symbol: "TCS", name: "Tata Consultancy Services", price: 3405.60, change: +38.20, percentChange: "+1.13%" },
  { symbol: "RELIANCE", name: "Reliance Industries", price: 2890.50, change: +45.30, percentChange: "+1.59%" },
  { symbol: "HDFCBANK", name: "HDFC Bank", price: 1520.40, change: +12.35, percentChange: "+0.82%" },
  { symbol: "INFY", name: "Infosys", price: 1452.80, change: -8.60, percentChange: "-0.59%" },
  { symbol: "ICICIBANK", name: "ICICI Bank", price: 958.20, change: +6.45, percentChange: "+0.68%" },
  { symbol: "SBIN", name: "State Bank of India", price: 624.35, change: +4.20, percentChange: "+0.68%" },
  { symbol: "ITC", name: "ITC Ltd", price: 401.50, change: +2.15, percentChange: "+0.54%" },
  { symbol: "LT", name: "Larsen & Toubro", price: 3108.75, change: -12.40, percentChange: "-0.40%" },
];

// Chart data generators — creates realistic-looking price data for each timeframe
// Professor explanation: These functions simulate what a real stock API would return.

// Helper: generate random walk data
function generatePriceData(
  basePrice: number,
  points: number,
  volatility: number,
): { time: string; price: number }[] {
  const data: { time: string; price: number }[] = [];
  let price = basePrice;

  for (let i = 0; i < points; i++) {
    // Random price movement
    const change = (Math.random() - 0.48) * volatility; // slight upward bias
    price = Math.max(price + change, basePrice * 0.85); // floor at 85% of base
    price = Math.min(price, basePrice * 1.15); // ceiling at 115% of base

    const hours = Math.floor((i / points) * 24);
    const mins = Math.floor(((i / points) * 24 * 60) % 60);
    data.push({
      time: `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`,
      price: Math.round(price * 100) / 100,
    });
  }
  return data;
}

function generateWeeklyData(
  basePrice: number,
): { time: string; price: number }[] {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  let price = basePrice - 5;
  return days.map((day) => {
    price += (Math.random() - 0.45) * 4;
    return { time: day, price: Math.round(price * 100) / 100 };
  });
}

function generateMonthlyData(
  basePrice: number,
): { time: string; price: number }[] {
  const data: { time: string; price: number }[] = [];
  let price = basePrice - 15;
  for (let i = 1; i <= 30; i++) {
    price += (Math.random() - 0.47) * 3;
    price = Math.max(price, basePrice * 0.9);
    data.push({
      time: `Day ${i}`,
      price: Math.round(price * 100) / 100,
    });
  }
  return data;
}

function generateYearlyData(
  basePrice: number,
): { time: string; price: number }[] {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  let price = basePrice * 0.8;
  return months.map((month) => {
    price += (Math.random() - 0.42) * (basePrice * 0.06);
    price = Math.max(price, basePrice * 0.7);
    return {
      time: month,
      price: Math.round(price * 100) / 100,
    };
  });
}

// Main chart data export — keyed by stock symbol then timeframe
// Professor explanation: This is a nested object that maps each stock to its chart data.
export const chartData: Record<string, Record<string, { time: string; price: number }[]>> = {};

stocks.forEach((stock) => {
  chartData[stock.symbol] = {
    "1D": generatePriceData(stock.price, 48, stock.price * 0.005),
    "1W": generateWeeklyData(stock.price),
    "1M": generateMonthlyData(stock.price),
    "1Y": generateYearlyData(stock.price),
  };
});
