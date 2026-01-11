// Centralized Asset Configuration

export const ASSET_CATEGORIES = {
    CRYPTO: 'Crypto',
    FOREX: 'Forex',
    STOCKS: 'Stocks',
    COMMODITIES: 'Commodities',
    INDICES: 'Indices'
};

export const ALL_ASSETS = [
    // --- CRYPTO (Real-time via Binance) ---
    { symbol: "BTCUSDT", name: "Bitcoin", type: 'crypto', category: ASSET_CATEGORIES.CRYPTO, payout: 82, basePrice: 90000 },
    { symbol: "ETHUSDT", name: "Ethereum", type: 'crypto', category: ASSET_CATEGORIES.CRYPTO, payout: 80, basePrice: 3000 },
    { symbol: "LTCUSDT", name: "Litecoin", type: 'crypto', category: ASSET_CATEGORIES.CRYPTO, payout: 75, basePrice: 80 },
    { symbol: "XRPUSDT", name: "Ripple", type: 'crypto', category: ASSET_CATEGORIES.CRYPTO, payout: 72, basePrice: 0.60 },
    { symbol: "BNBUSDT", name: "BNB", type: 'crypto', category: ASSET_CATEGORIES.CRYPTO, payout: 78, basePrice: 600 },
    { symbol: "SOLUSDT", name: "Solana", type: 'crypto', category: ASSET_CATEGORIES.CRYPTO, payout: 75, basePrice: 140 },
    { symbol: "DOGEUSDT", name: "Dogecoin", type: 'crypto', category: ASSET_CATEGORIES.CRYPTO, payout: 70, basePrice: 0.15 },

    // --- FOREX (Synthetic) ---
    { symbol: "EURUSD", name: "EUR/USD", type: 'forex', category: ASSET_CATEGORIES.FOREX, payout: 85, basePrice: 1.0850 },
    { symbol: "GBPUSD", name: "GBP/USD", type: 'forex', category: ASSET_CATEGORIES.FOREX, payout: 85, basePrice: 1.2700 },
    { symbol: "USDJPY", name: "USD/JPY", type: 'forex', category: ASSET_CATEGORIES.FOREX, payout: 82, basePrice: 151.00 },
    { symbol: "USDCHF", name: "USD/CHF", type: 'forex', category: ASSET_CATEGORIES.FOREX, payout: 80, basePrice: 0.9100 },
    { symbol: "AUDUSD", name: "AUD/USD", type: 'forex', category: ASSET_CATEGORIES.FOREX, payout: 82, basePrice: 0.6500 },
    { symbol: "USDCAD", name: "USD/CAD", type: 'forex', category: ASSET_CATEGORIES.FOREX, payout: 80, basePrice: 1.3600 },
    { symbol: "EURGBP", name: "EUR/GBP", type: 'forex', category: ASSET_CATEGORIES.FOREX, payout: 80, basePrice: 0.8500 },
    { symbol: "EURJPY", name: "EUR/JPY", type: 'forex', category: ASSET_CATEGORIES.FOREX, payout: 82, basePrice: 164.00 },

    // --- STOCKS (Synthetic) ---
    { symbol: "AAPL", name: "Apple", type: 'stock', category: ASSET_CATEGORIES.STOCKS, payout: 80, basePrice: 175.00 },
    { symbol: "GOOGL", name: "Google", type: 'stock', category: ASSET_CATEGORIES.STOCKS, payout: 80, basePrice: 175.00 },
    { symbol: "AMZN", name: "Amazon", type: 'stock', category: ASSET_CATEGORIES.STOCKS, payout: 80, basePrice: 180.00 },
    { symbol: "MSFT", name: "Microsoft", type: 'stock', category: ASSET_CATEGORIES.STOCKS, payout: 80, basePrice: 420.00 },
    { symbol: "META", name: "Meta", type: 'stock', category: ASSET_CATEGORIES.STOCKS, payout: 80, basePrice: 470.00 },
    { symbol: "TSLA", name: "Tesla", type: 'stock', category: ASSET_CATEGORIES.STOCKS, payout: 80, basePrice: 175.00 },

    // --- COMMODITIES (Synthetic) ---
    { symbol: "XAUUSD", name: "Gold", type: 'commodity', category: ASSET_CATEGORIES.COMMODITIES, payout: 85, basePrice: 2350.00 },
    { symbol: "XAGUSD", name: "Silver", type: 'commodity', category: ASSET_CATEGORIES.COMMODITIES, payout: 80, basePrice: 28.00 },
    { symbol: "USOIL", name: "Crude Oil", type: 'commodity', category: ASSET_CATEGORIES.COMMODITIES, payout: 80, basePrice: 85.00 },
    { symbol: "NGAS", name: "Natural Gas", type: 'commodity', category: ASSET_CATEGORIES.COMMODITIES, payout: 75, basePrice: 1.80 },

    // --- INDICES (Synthetic) ---
    { symbol: "SPX500", name: "S&P 500", type: 'index', category: ASSET_CATEGORIES.INDICES, payout: 82, basePrice: 5200.00 },
    { symbol: "NAS100", name: "NASDAQ", type: 'index', category: ASSET_CATEGORIES.INDICES, payout: 82, basePrice: 18100.00 },
    { symbol: "US30", name: "Dow Jones", type: 'index', category: ASSET_CATEGORIES.INDICES, payout: 80, basePrice: 39000.00 },
    { symbol: "UK100", name: "FTSE 100", type: 'index', category: ASSET_CATEGORIES.INDICES, payout: 80, basePrice: 8000.00 },
];
