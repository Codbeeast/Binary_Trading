const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); // Load environment variables from root

const { createServer } = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const BinanceService = require('./services/binanceService');

// Market Data Mode: 'real' for Binance live data, 'synthetic' for generated data
const MARKET_DATA_MODE = process.env.MARKET_DATA_MODE || 'synthetic';
console.log(`📊 Market Data Mode: ${MARKET_DATA_MODE.toUpperCase()}`);

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/binary-trading';

if (!process.env.MONGODB_URI) {
        console.warn('⚠️  MONGODB_URI not found in .env file. Using default local connection.');
}

// Define schemas directly in server
// Define schemas via External Models
const Tick = require('./models/Tick');
const Candle = require('./models/Candle');
const MarketControl = require('./models/MarketControl');

const Trade = require('./models/Trade');
const User = require('./models/User');

// Trade statistics (in-memory cache for speed)
// Trade statistics (per asset)
const assetStats = new Map();

function getAssetStats(symbol) {
        if (!assetStats.has(symbol)) {
                assetStats.set(symbol, {
                        activeUsers: 0,
                        totalTrades: 0,
                        buyCount: 0,
                        sellCount: 0,
                        activeBuyCount: 0, // Track active 'up' trades
                        activeSellCount: 0, // Track active 'down' trades
                        buyVolume: 0,
                        sellVolume: 0,
                });
        }
        return assetStats.get(symbol);
}

const express = require('express');
const cors = require('cors');

// Create Express App
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Create HTTP server wrapping Express
const httpServer = createServer(app);
const io = new Server(httpServer, {
        cors: {
                origin: '*',
                methods: ['GET', 'POST'],
        },
});

// REST API Endpoints

// Routes
const analyticsRoutes = require('./routes/analytics');

// Use Routes
app.use('/api/analytics', analyticsRoutes);

// Market state
let marketState = {
        direction: 'neutral',
        volatility: 1.0,
        tickSpeed: 300,
        currentPrice: 100.00,
        isActive: true,
};

// Last real price storage
let lastRealPrice = 0;

// Manipulation State
let manipulationState = {
        mode: 'neutral',      // 'neutral', 'up', 'down'
        activationPrice: null, // Price when the button was pressed
        currentOffset: 0,     // The actual offset currently applied (smoothed)
        targetOffset: 0,      // The calculated goal for the offset
        noisePhase: 0         // For continuous natural wave/noise
};

// Candle tracking for different timeframes
const candleTrackers = {
        '1s': { open: null, high: null, low: null, close: null, startTime: null, duration: 1000 },
        '5s': { open: null, high: null, low: null, close: null, startTime: null, duration: 5000 },
        '15s': { open: null, high: null, low: null, close: null, startTime: null, duration: 15000 },
        '30s': { open: null, high: null, low: null, close: null, startTime: null, duration: 30000 },
        '1m': { open: null, high: null, low: null, close: null, startTime: null, duration: 60000 },
};

// Initialize market control from DB
async function initializeMarketControl() {
        try {
                let control = await MarketControl.findOne().sort({ lastUpdated: -1 });

                if (!control) {
                        control = await MarketControl.create({
                                direction: 'neutral',
                                volatility: 1.0,
                                tickSpeed: 300,
                                currentPrice: 100.00,
                                isActive: true,
                        });
                }

                marketState = {
                        direction: control.direction,
                        volatility: control.volatility,
                        tickSpeed: control.tickSpeed,
                        currentPrice: control.currentPrice,
                        isActive: control.isActive,
                };

                // Sync manipulation state with persisted direction if needed
                manipulationState.mode = control.direction;

                console.log('📊 Market state initialized:', marketState);
        } catch (error) {
                console.error('Error initializing market control:', error);
        }
}

// Price generation with smooth realistic movement
function generateNextPrice(currentPrice, direction, volatility) {
        // Base volatility (smaller for smoother movement)
        const baseVolatility = 0.02 * volatility;

        // Random walk component
        const randomWalk = (Math.random() - 0.5) * baseVolatility;

        // Directional bias
        let directionBias = 0;
        if (direction === 'up') {
                directionBias = 0.015 * volatility;
        } else if (direction === 'down') {
                directionBias = -0.015 * volatility;
        }

        // Add some wave-like movement for realism
        const wave = Math.sin(Date.now() / 1000) * 0.005 * volatility;

        // Calculate new price
        const priceChange = (randomWalk + directionBias + wave) * currentPrice;
        let newPrice = currentPrice + priceChange;

        // Ensure price stays positive and reasonable
        newPrice = Math.max(newPrice, 0.00001); // Fix: Allow low values for Forex
        // newPrice = Math.min(newPrice, 1000000); // Removed upper limit or set very high

        return parseFloat(newPrice.toFixed(6)); // High precision for binary trading (6 decimals)
}

// Update candle with new tick
function updateCandle(timeframe, price, timestamp) {
        const tracker = candleTrackers[timeframe];

        // Check if we need to complete the current candle and start a new one
        if (!tracker.startTime || timestamp - tracker.startTime >= tracker.duration) {
                // Save the completed candle before resetting
                const completedCandle = tracker.startTime && tracker.open !== null ? {
                        open: tracker.open,
                        high: tracker.high,
                        low: tracker.low,
                        close: tracker.close,
                        timeframe,
                        timestamp: new Date(tracker.startTime),
                } : null;

                // Reset tracker for new candle
                tracker.open = price;
                tracker.high = price;
                tracker.low = price;
                tracker.close = price;
                tracker.startTime = timestamp;

                return { isNew: true, completedCandle };
        }

        // Update existing candle
        tracker.high = Math.max(tracker.high, price);
        tracker.low = Math.min(tracker.low, price);
        tracker.close = price;

        return {
                isNew: false,
                candle: {
                        open: tracker.open,
                        high: tracker.high,
                        low: tracker.low,
                        close: tracker.close,
                        timeframe,
                        timestamp: new Date(tracker.startTime),
                },
        };
}

// Save candle to database
async function saveCandle(candleData) {
        try {
                await Candle.create(candleData);
        } catch (error) {
                console.error('Error saving candle:', error);
        }
}

// Tick generation loop
let tickInterval = null;

// Synthetic generator moved to startSyntheticMultiAssetGeneration

// Binance Real-time Data Integration

// Multi-Asset Manipulation State
// Map<symbol, { ...state }>
const assetStates = new Map();

function getAssetState(symbol) {
        if (!assetStates.has(symbol)) {
                assetStates.set(symbol, {
                        marketState: {
                                symbol: symbol,
                                direction: 'neutral',
                                volatility: 1.0,
                                tickSpeed: 300,
                                currentPrice: 0,
                                lastPrice: 0,
                                isActive: true,
                        },
                        lastRealPrice: 0,
                        manipulationState: {
                                mode: 'neutral',
                                activationPrice: null,
                                currentOffset: 0,
                                targetOffset: 0,
                                lastUpdateTime: 0, // Track time for smooth accumulation
                                noisePhase: Math.random() * 10,
                        },
                        // Per-asset stats
                        stats: {
                                activeUsers: 0,
                                totalTrades: 0,
                                buyCount: 0,
                                sellCount: 0,
                                buyVolume: 0,
                                sellVolume: 0,
                        }
                });
        }
        return assetStates.get(symbol);
}

// Asset Configuration
const ASSET_CATEGORIES = {
        CRYPTO: 'Crypto',
        FOREX: 'Forex',
        STOCKS: 'Stocks',
        COMMODITIES: 'Commodities',
        INDICES: 'Indices'
};

const ALL_ASSETS = [
        // --- CRYPTO (Real-time via Binance) ---
        { symbol: "BTCUSDT", name: "Bitcoin", type: 'crypto', category: ASSET_CATEGORIES.CRYPTO, basePrice: 90000 },
        { symbol: "ETHUSDT", name: "Ethereum", type: 'crypto', category: ASSET_CATEGORIES.CRYPTO, basePrice: 3000 },
        { symbol: "LTCUSDT", name: "Litecoin", type: 'crypto', category: ASSET_CATEGORIES.CRYPTO, basePrice: 80 },
        { symbol: "XRPUSDT", name: "Ripple", type: 'crypto', category: ASSET_CATEGORIES.CRYPTO, basePrice: 0.60 },
        { symbol: "BNBUSDT", name: "BNB", type: 'crypto', category: ASSET_CATEGORIES.CRYPTO, basePrice: 600 },
        { symbol: "SOLUSDT", name: "Solana", type: 'crypto', category: ASSET_CATEGORIES.CRYPTO, basePrice: 140 },
        { symbol: "DOGEUSDT", name: "Dogecoin", type: 'crypto', category: ASSET_CATEGORIES.CRYPTO, basePrice: 0.15 },

        // --- FOREX (Synthetic - Updated Base Prices) ---
        { symbol: "EURUSD", name: "EUR/USD", type: 'forex', category: ASSET_CATEGORIES.FOREX, basePrice: 1.0850 },
        { symbol: "GBPUSD", name: "GBP/USD", type: 'forex', category: ASSET_CATEGORIES.FOREX, basePrice: 1.2700 },
        { symbol: "USDJPY", name: "USD/JPY", type: 'forex', category: ASSET_CATEGORIES.FOREX, basePrice: 153.00 },
        { symbol: "USDCHF", name: "USD/CHF", type: 'forex', category: ASSET_CATEGORIES.FOREX, basePrice: 0.9100 },
        { symbol: "AUDUSD", name: "AUD/USD", type: 'forex', category: ASSET_CATEGORIES.FOREX, basePrice: 0.6500 },
        { symbol: "USDCAD", name: "USD/CAD", type: 'forex', category: ASSET_CATEGORIES.FOREX, basePrice: 1.3700 },
        { symbol: "EURGBP", name: "EUR/GBP", type: 'forex', category: ASSET_CATEGORIES.FOREX, basePrice: 0.8550 },
        { symbol: "EURJPY", name: "EUR/JPY", type: 'forex', category: ASSET_CATEGORIES.FOREX, basePrice: 165.00 },

        // --- STOCKS (Synthetic - Updated Base Prices) ---
        { symbol: "AAPL", name: "Apple", type: 'stock', category: ASSET_CATEGORIES.STOCKS, basePrice: 178.00 },
        { symbol: "GOOGL", name: "Google", type: 'stock', category: ASSET_CATEGORIES.STOCKS, basePrice: 176.00 },
        { symbol: "AMZN", name: "Amazon", type: 'stock', category: ASSET_CATEGORIES.STOCKS, basePrice: 185.00 },
        { symbol: "MSFT", name: "Microsoft", type: 'stock', category: ASSET_CATEGORIES.STOCKS, basePrice: 425.00 },
        { symbol: "META", name: "Meta", type: 'stock', category: ASSET_CATEGORIES.STOCKS, basePrice: 480.00 },
        { symbol: "TSLA", name: "Tesla", type: 'stock', category: ASSET_CATEGORIES.STOCKS, basePrice: 175.00 },

        // --- COMMODITIES (Synthetic) ---
        { symbol: "XAUUSD", name: "Gold", type: 'commodity', category: ASSET_CATEGORIES.COMMODITIES, basePrice: 2380.00 },
        { symbol: "XAGUSD", name: "Silver", type: 'commodity', category: ASSET_CATEGORIES.COMMODITIES, basePrice: 28.50 },
        { symbol: "USOIL", name: "Crude Oil", type: 'commodity', category: ASSET_CATEGORIES.COMMODITIES, basePrice: 86.00 },
        { symbol: "NGAS", name: "Natural Gas", type: 'commodity', category: ASSET_CATEGORIES.COMMODITIES, basePrice: 1.85 },

        // --- INDICES (Synthetic) ---
        { symbol: "SPX500", name: "S&P 500", type: 'index', category: ASSET_CATEGORIES.INDICES, basePrice: 5200.00 },
        { symbol: "NAS100", name: "NASDAQ", type: 'index', category: ASSET_CATEGORIES.INDICES, basePrice: 18100.00 },
        { symbol: "US30", name: "Dow Jones", type: 'index', category: ASSET_CATEGORIES.INDICES, basePrice: 39000.00 },
        { symbol: "UK100", name: "FTSE 100", type: 'index', category: ASSET_CATEGORIES.INDICES, basePrice: 8000.00 },
];

// Hybrid Data Generation

// Helper to fetch real snapshot prices
async function fetchInitialPrices() {
        console.log('🌍 Fetching real-world initial prices...');

        // 1. Fetch Forex Rates (Base USD)
        try {
                const fxRes = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
                const fxData = await fxRes.json();

                if (fxData && fxData.rates) {
                        ALL_ASSETS.forEach(asset => {
                                if (asset.category === ASSET_CATEGORIES.FOREX) {
                                        const base = asset.symbol.substring(0, 3);
                                        const quote = asset.symbol.substring(3, 6);
                                        let price = 0;
                                        if (quote === 'USD') {
                                                const rate = fxData.rates[base];
                                                if (rate) price = 1 / rate;
                                        } else if (base === 'USD') {
                                                const rate = fxData.rates[quote];
                                                if (rate) price = rate;
                                        }
                                        if (price > 0) {
                                                const state = getAssetState(asset.symbol);
                                                state.marketState.currentPrice = price;
                                                state.lastRealPrice = price;
                                                console.log(`💱 Synced ${asset.symbol}: ${price.toFixed(4)}`);
                                        }
                                }
                        });
                }
        } catch (e) {
                console.error('❌ Forex sync failed:', e.message);
        }
        // ... Stocks fetch (omitted for brevity in replacement, assume existing logic matches if not changing) ...
        // Wait, replace_file_content must match exactly or replace block.
        // I will just rely on the existing fetch Stocks logic being acceptable, 
        // but I must provide the FULL text for the block I am replacing if I span it.
        // I am replacing lines 331 to 468 approximately.

        // RE-INSERTING STOCKS FETCH LOGIC TO BE SAFE:
        const stockAssets = ALL_ASSETS.filter(a => a.category === ASSET_CATEGORIES.STOCKS || a.category === ASSET_CATEGORIES.INDICES);
        for (const asset of stockAssets) {
                try {
                        let ySymbol = asset.symbol;
                        if (asset.symbol === 'SPX500') ySymbol = '%5EGSPC';
                        if (asset.symbol === 'NAS100') ySymbol = '%5EIXIC';
                        if (asset.symbol === 'US30') ySymbol = '%5EDJI';

                        const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ySymbol}?interval=1d&range=1d`);
                        const data = await res.json();
                        const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;

                        if (price) {
                                const state = getAssetState(asset.symbol);
                                state.marketState.currentPrice = price;
                                state.lastRealPrice = price;
                                console.log(`📈 Synced ${asset.symbol}: ${price.toFixed(2)}`);
                        }
                } catch (e) { }
        }
}

// 1. Synthetic Generator for Non-Crypto & Crypto (when in synthetic mode)
function startSyntheticMultiAssetGeneration() {
        if (tickInterval) clearInterval(tickInterval);

        console.log('🎲 Starting Synthetic Data Generator for ALL assets...');

        // Initialize all assets with defaults first
        ALL_ASSETS.forEach(asset => {
                const state = getAssetState(asset.symbol);
                if (state.marketState.currentPrice === 0) {
                        state.marketState.currentPrice = asset.basePrice;
                        state.lastRealPrice = asset.basePrice;
                }
        });

        // Try to fetch real prices to overwrite defaults
        console.log('🔄 Initiating Smart Start fetch...');
        try {
                fetchInitialPrices();
        } catch (err) {
                console.error('❌ Error invoking fetchInitialPrices:', err);
        }

        // ALIGNMENT FIX: Sync to the nearest second to prevent "visual drift"
        const now = Date.now();
        const msUntilNextSecond = 1000 - (now % 1000);

        console.log(`⏱️ Aligning synthetic loop: starting in ${msUntilNextSecond}ms`);

        setTimeout(() => {
                // Determine tick speed - prefer 200ms for 5s/1s divisibility if using default 300
                // If DB has 300, we override to 200 for smoother alignment unless it's a user setting?
                // For synthetic stability, 200ms is much better.
                const SYNTHETIC_TICK_SPEED = 200;

                // Define the run function
                const runTick = async () => {
                        if (!marketState.isActive) return;

                        ALL_ASSETS.forEach(asset => {
                                // If mode is REAL, skip Crypto assets (Binance handles them)
                                // UNLESS Binance is disabled/failed, but we assume it works.
                                if (MARKET_DATA_MODE === 'real' && asset.type === 'crypto') return;

                                const symbol = asset.symbol;
                                const state = getAssetState(symbol);
                                const ms = state.marketState;
                                const man = state.manipulationState;

                                // Generate Price Movement
                                // Use asset-specific volatility if we had it, otherwise global defaults
                                // For variety, we can vary volatility slightly per asset type
                                let volatilityMultiplier = 1.0;
                                if (asset.type === 'forex') volatilityMultiplier = 0.3; // Forex moves slower
                                if (asset.type === 'commodity') volatilityMultiplier = 0.5;

                                const newPrice = generateNextPrice(
                                        ms.currentPrice,
                                        ms.direction,
                                        ms.volatility * volatilityMultiplier
                                );

                                // --- MANIPULATION LOGIC for Synthetic Assets ---
                                // (Re-using the logic from binance connection, simplified here)
                                // Ideally we extract the manipulation logic to a shared function
                                // For now, simpler manipulation for synthetic:
                                if (man.mode !== 'neutral') {
                                        // Apply simple drift
                                        const drift = ms.currentPrice * 0.0001;
                                        if (man.mode === 'up') ms.currentPrice += drift;
                                        if (man.mode === 'down') ms.currentPrice -= drift;
                                } else {
                                        ms.currentPrice = newPrice;
                                }

                                const timestamp = Date.now();

                                // Emit
                                io.to(symbol).emit('tick_update', {
                                        price: ms.currentPrice,
                                        timestamp,
                                        direction: ms.direction,
                                        symbol: symbol
                                });

                                // Update Candles
                                for (const timeframe of ['5s', '15s', '30s', '1m']) {
                                        processAssetCandle(symbol, timeframe, ms.currentPrice, timestamp);
                                }
                        });
                };

                // Run immediately once aligned
                runTick();

                // Start Loop
                tickInterval = setInterval(runTick, SYNTHETIC_TICK_SPEED);
                console.log(`🚀 Synthetic loop started with ${SYNTHETIC_TICK_SPEED}ms interval.`);

        }, msUntilNextSecond);
}

// Helper to update specific asset candle (refactored from updateCandle)
function updateAssetCandle(symbol, timeframe, price, timestamp) {
        const tracker = getAssetCandleTracker(symbol, timeframe);
        // ... logic mirrors updateCandle but uses the asset tracker ...
        if (!tracker.startTime || timestamp - tracker.startTime >= tracker.duration) {
                const completedCandle = tracker.startTime && tracker.open !== null ? {
                        open: tracker.open, high: tracker.high, low: tracker.low, close: tracker.close,
                        timeframe, timestamp: new Date(tracker.startTime), symbol
                } : null;
                tracker.open = price; tracker.high = price; tracker.low = price; tracker.close = price; tracker.startTime = timestamp;
                return { isNew: true, completedCandle };
        }
        tracker.high = Math.max(tracker.high, price); tracker.low = Math.min(tracker.low, price); tracker.close = price;
        return {
                isNew: false, candle: {
                        open: tracker.open, high: tracker.high, low: tracker.low, close: tracker.close,
                        timeframe, timestamp: new Date(tracker.startTime), symbol
                }
        };
}


function startBinanceRealTimeData() {
        if (MARKET_DATA_MODE !== 'real') {
                console.log('⚠️  Binance real-time data disabled. Using synthetic data.');
                return;
        }

        binanceService = new BinanceService();

        // Track active symbols to subscribe to
        // Track active symbols to subscribe to
        const cryptoSymbols = ALL_ASSETS.filter(a => a.type === 'crypto').map(a => a.symbol);

        // Connect with initial list
        binanceService.connect(cryptoSymbols);

        // Subscribe to each symbol
        cryptoSymbols.forEach(symbol => {
                binanceService.subscribe(symbol, (rawPrice) => {
                        const basePrice = parseFloat(rawPrice);
                        // Inject micro-noise to simulate 6-decimal precision for Binary Options matching (Binomo style)
                        // Adds 0.000000 to 0.009999 to the base price
                        const microNoise = Math.floor(Math.random() * 10000) / 1000000;
                        const realPrice = parseFloat((basePrice + microNoise).toFixed(6));

                        const state = getAssetState(symbol);
                        const { marketState, manipulationState } = state;

                        if (!marketState.isActive) return;

                        // Initialize lastRealPrice
                        if (state.lastRealPrice === 0) state.lastRealPrice = realPrice;

                        // --- MANIPULATION LOGIC (Throttled Smart Ratchet) ---
                        const { mode, activationPrice } = manipulationState;
                        const now = Date.now();
                        const THROTTLE_MS = 200; // Max 5 updates per second

                        // 1. Accumulate Drift (Throttled)
                        if (mode !== 'neutral' && now - manipulationState.lastUpdateTime > THROTTLE_MS) {
                                manipulationState.lastUpdateTime = now;

                                // Drift Magnitude: User asked for +0.1, +0.2, +0.3 approx.
                                // 0.1 on 90k is ~0.000001. 
                                // Let's use a bit more visible crawl: 0.000005 * Price
                                const DRIFT_BASE = realPrice * 0.000005;
                                const randomStep = (Math.floor(Math.random() * 3) + 1); // 1, 2, or 3
                                const driftDelta = DRIFT_BASE * randomStep;

                                const currentManipulated = realPrice + manipulationState.currentOffset;

                                if (mode === 'up') {
                                        // Smart Ratchet UP with Natural Oscillation:
                                        const safeZone = activationPrice ? activationPrice * 1.0003 : 0; // 0.03% buffer
                                        const isSafe = !activationPrice || currentManipulated > safeZone;

                                        if (isSafe) {
                                                // Natural movement: mostly up, but sometimes down (retracement)
                                                // 60% Up, 40% Down (creates red candles)
                                                if (Math.random() < 0.6) {
                                                        manipulationState.currentOffset += driftDelta; // Trend Up
                                                } else {
                                                        manipulationState.currentOffset -= driftDelta * 0.5; // Shallow Retrace
                                                }
                                        } else {
                                                // Danger Zone: FORCE UP to clear activation price
                                                manipulationState.currentOffset += driftDelta * 1.5;
                                        }

                                } else if (mode === 'down') {
                                        // Smart Ratchet DOWN with Natural Oscillation:
                                        const safeZone = activationPrice ? activationPrice * 0.9997 : Infinity;
                                        const isSafe = !activationPrice || currentManipulated < safeZone;

                                        if (isSafe) {
                                                // Natural movement: mostly down, but sometimes up (retracement)
                                                if (Math.random() < 0.6) {
                                                        manipulationState.currentOffset -= driftDelta; // Trend Down
                                                } else {
                                                        manipulationState.currentOffset += driftDelta * 0.5; // Shallow Retrace
                                                }
                                        } else {
                                                // Danger Zone: FORCE DOWN
                                                manipulationState.currentOffset -= driftDelta * 1.5;
                                        }
                                }
                        } else if (mode === 'neutral') {
                                // Decay to 0 (Slower for seamless transition)
                                const LERP_FACTOR = 0.01; // Slower fade (was 0.05)
                                manipulationState.currentOffset += (0 - manipulationState.currentOffset) * LERP_FACTOR;
                        }

                        // 2. Calculate Preliminary Price
                        let manipulatedPrice = realPrice + manipulationState.currentOffset;

                        // 3. Strict Boundary Clamping (Final Safety Net)
                        if (mode === 'up' && activationPrice !== null) {
                                if (manipulatedPrice < activationPrice) {
                                        manipulatedPrice = activationPrice + (realPrice * 0.000005);
                                        // Sync offset to prevent "stuck" effect
                                        manipulationState.currentOffset = manipulatedPrice - realPrice;
                                }
                        } else if (mode === 'down' && activationPrice !== null) {
                                if (manipulatedPrice > activationPrice) {
                                        manipulatedPrice = activationPrice - (realPrice * 0.000005);
                                        // Sync offset
                                        manipulationState.currentOffset = manipulatedPrice - realPrice;
                                }
                        }

                        // Sanity check
                        manipulatedPrice = Math.max(0.01, manipulatedPrice);

                        // --- END MANIPULATION LOGIC ---

                        const timestamp = Date.now();

                        // Visual Direction
                        const priceChange = manipulatedPrice - (marketState.lastPrice || manipulatedPrice);
                        let visualDirection = 'neutral';
                        if (priceChange > 0) visualDirection = 'up';
                        else if (priceChange < 0) visualDirection = 'down';

                        // Update State
                        marketState.currentPrice = manipulatedPrice;
                        marketState.lastPrice = manipulatedPrice;
                        marketState.direction = visualDirection;
                        state.lastRealPrice = realPrice;

                        // Save Tick
                        Tick.create({
                                price: manipulatedPrice,
                                timestamp: new Date(timestamp),
                                timeframe: '5s',
                                symbol: symbol
                        }).catch(err => console.error('❌ Error saving tick:', err));

                        // Emit Room Update
                        io.to(symbol).emit('tick_update', {
                                price: manipulatedPrice,
                                timestamp,
                                direction: visualDirection,
                                symbol: symbol
                        });

                        // Update Candles
                        for (const timeframe of ['5s', '15s', '30s', '1m']) {
                                processAssetCandle(symbol, timeframe, manipulatedPrice, timestamp);
                        }
                });
        });
}

function stopBinanceRealTimeData() {
        if (binanceService) {
                binanceService.disconnect();
                binanceService = null;
        }
}

// Per-asset candle trackers: Map<symbol, Map<timeframe, tracker>>
const assetCandleTrackers = new Map();

function getAssetCandleTracker(symbol, timeframe) {
        if (!assetCandleTrackers.has(symbol)) {
                assetCandleTrackers.set(symbol, {});
        }
        const symbolTrackers = assetCandleTrackers.get(symbol);

        if (!symbolTrackers[timeframe]) {
                // Initialize standard values
                const durations = { '5s': 5000, '15s': 15000, '30s': 30000, '1m': 60000 };
                symbolTrackers[timeframe] = { open: null, high: null, low: null, close: null, startTime: null, duration: durations[timeframe] };
        }
        return symbolTrackers[timeframe];
}

function processAssetCandle(symbol, timeframe, price, timestamp) {
        const tracker = getAssetCandleTracker(symbol, timeframe);

        // GRID ALIGNMENT: Snap timestamp to the exact timeframe bucket (e.g. 10:00:00, 10:00:05)
        const duration = tracker.duration;
        const alignedTimestamp = Math.floor(timestamp / duration) * duration;

        // Detect New Candle: If tracker is empty OR new bucket is later than current tracker start
        if (!tracker.startTime || alignedTimestamp > tracker.startTime) {
                // Complete previous candle
                const completedCandle = tracker.startTime && tracker.open !== null ? {
                        open: tracker.open,
                        high: tracker.high,
                        low: tracker.low,
                        close: tracker.close,
                        timeframe,
                        timestamp: new Date(tracker.startTime),
                        symbol: symbol
                } : null;

                // Reset tracker for NEW candle
                tracker.open = price;
                tracker.high = price;
                tracker.low = price;
                tracker.close = price;
                tracker.startTime = alignedTimestamp; // Use ALIGNED time

                if (completedCandle) {
                        // console.log('🔥 CANDLE COMPLETE:', symbol, completedCandle.timeframe, completedCandle.close);
                        saveCandle(completedCandle); // Save with symbol
                        io.to(symbol).emit('candle_complete', completedCandle);
                }
        } else {
                // Update candle
                tracker.high = Math.max(tracker.high, price);
                tracker.low = Math.min(tracker.low, price);
                tracker.close = price;

                // console.log('⚡ CANDLE UPDATE:', symbol, timeframe, price); // Verbose
                io.to(symbol).emit('candle_update', {
                        open: tracker.open,
                        high: tracker.high,
                        low: tracker.low,
                        close: tracker.close,
                        timeframe,
                        timestamp: new Date(tracker.startTime),
                        symbol: symbol
                });
        }
}
// Database Cleanup Logic

// Interval for running the cleanup job (e.g., every 30 minutes)
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

// Time limit for candles (1 hour)
const CANDLE_RETENTION_MS = 60 * 60 * 1000; // 1 hour

// Time limit for ticks (1 hour - explicit constant)
const TICK_RETENTION_MS = 60 * 60 * 1000; // 1 hour

let cleanupInterval = null;

async function runDataCleanup() {
        try {
                const candleThreshold = new Date(Date.now() - CANDLE_RETENTION_MS);
                const tickThreshold = new Date(Date.now() - TICK_RETENTION_MS); // Separate threshold

                // Delete Candle documents older than the threshold
                const candleResult = await Candle.deleteMany({
                        timestamp: { $lt: candleThreshold }
                });

                // Delete Tick documents older than the threshold
                const tickResult = await Tick.deleteMany({
                        timestamp: { $lt: tickThreshold }
                });

                console.log(`🧹 Data Cleanup: Deleted ${candleResult.deletedCount} old candles and ${tickResult.deletedCount} old ticks.`);

        } catch (error) {
                console.error('❌ Error during data cleanup:', error);
        }
}

function startDataCleanup() {
        if (cleanupInterval) {
                clearInterval(cleanupInterval);
        }
        // Run once on startup, then schedule
        runDataCleanup();
        cleanupInterval = setInterval(runDataCleanup, CLEANUP_INTERVAL_MS);
        console.log(`⏱️ Data cleanup scheduled to run every ${CLEANUP_INTERVAL_MS / 60000} minutes.`);
}

// ============================================

// Socket.IO connection handling
io.on('connection', (socket) => {
        console.log('👤 Client connected:', socket.id);

        // Handle joining user room for multi-tab sync
        socket.on('join_user', async (userId) => {
                if (userId) {
                        socket.join(userId);
                        console.log(`👤 Socket ${socket.id} joined user room: ${userId}`);

                        // Fetch and emit user's trade history
                        try {
                                const user = await User.findById(userId);
                                const balance = user ? user.balance : 800000;
                                socket.emit('active_balance', balance);

                                const history = await Trade.find({ userId })
                                        .sort({ timestamp: -1 })
                                        .limit(50);

                                socket.emit('user_trade_history', history);
                        } catch (err) {
                                console.error('Error fetching user trade history:', err);
                        }
                }
        });

        // Handle subscription
        socket.on('subscribe', async (symbol) => {
                const asset = symbol.toUpperCase(); // Ensure standard format
                console.log(`📡 Client ${socket.id} joined room: ${asset}`);

                // Leave previous rooms? (Optional: mostly one asset per view)
                // socket.rooms.forEach(room => { if(room !== socket.id) socket.leave(room); });

                socket.join(asset);

                // Send initial state/history for this asset
                const state = getAssetState(asset);
                socket.emit('market_state', state.marketState);

                // Send history
                try {
                        const timeframes = ['5s', '15s', '30s', '1m']; // Send ALL timeframes
                        for (const timeframe of timeframes) {
                                // 1. Send Completed History from DB
                                const recentCandles = await Candle.find({ timeframe, symbol: asset })
                                        .sort({ timestamp: -1 })
                                        .limit(150)
                                        .lean();

                                socket.emit('historical_candles', {
                                        timeframe,
                                        candles: recentCandles.reverse(),
                                        symbol: asset
                                });

                                // 2. Send Current In-Progress Candle from Memory (Critical for Wicks)
                                const tracker = getAssetCandleTracker(asset, timeframe);
                                if (tracker.startTime) {
                                        socket.emit('candle_update', {
                                                open: tracker.open,
                                                high: tracker.high,
                                                low: tracker.low,
                                                close: tracker.close,
                                                timeframe,
                                                timestamp: new Date(tracker.startTime),
                                                symbol: asset
                                        });
                                }
                        }
                } catch (error) {
                        console.error('Error fetching history:', error);
                }
        });

        // Handle placing a trade
        socket.on('place_trade', async (data) => {

                try {
                        const { direction, amount, timeframe, userId, symbol, clientTradeId, duration } = data;

                        // Idempotency Check: Prevent duplicate trades
                        if (clientTradeId) {
                                const existingTrade = await Trade.findOne({ clientTradeId });
                                if (existingTrade) {
                                        console.log(`⚠️ Duplicate trade skipped: ${clientTradeId}`);
                                        return;
                                }
                        }

                        // Get current price from memory state
                        const state = getAssetState(symbol);
                        const currentPrice = state ? state.marketState.currentPrice : 0;

                        const newTrade = new Trade({
                                userId,
                                amount,
                                direction,
                                symbol: symbol || 'BTCUSDT',
                                timeframe: timeframe || '1m',
                                duration,
                                entryPrice: currentPrice,
                                result: 'pending',
                                timestamp: new Date(),
                                expiryTime: new Date(Date.now() + (duration * 1000)),
                                clientTradeId
                        });

                        // Deduct Balance
                        const user = await User.findByIdAndUpdate(
                                userId,
                                { $inc: { balance: -amount } },
                                { new: true }
                        );

                        if (user) {
                                io.to(userId).emit('balance_update', user.balance);
                        }

                        await newTrade.save();

                        // Notify user (and other tabs)
                        if (userId) {
                                io.to(userId).emit('new_trade', { ...newTrade.toObject(), clientTradeId });
                        }

                        // Notify Admin
                        io.to('admin').emit('admin_new_trade', newTrade.toObject());

                        // UPDATE STATS (Real-time Active Count)
                        const stats = getAssetStats(symbol || 'BTCUSDT');
                        if (direction === 'up') stats.activeBuyCount++;
                        else stats.activeSellCount++;

                        // stats.totalTrades++; // Moved to completion to prevent "double update" perception
                        // Emit stats update to anyone listening (Admin)
                        io.emit('stats_update', {
                                ...stats,
                                symbol: symbol || 'BTCUSDT', // Critical for filtering
                                activeUsers: io.engine.clientsCount
                        });

                        // Schedule Trade Resolution
                        setTimeout(async () => {
                                try {
                                        // Fetch fresh state/price
                                        const endState = getAssetState(symbol);
                                        const closePrice = endState ? endState.marketState.currentPrice : 0;

                                        // Determine Result
                                        let result = 'loss';
                                        if (direction === 'up' && closePrice > newTrade.entryPrice) result = 'win';
                                        if (direction === 'down' && closePrice < newTrade.entryPrice) result = 'win';
                                        if (closePrice === newTrade.entryPrice) result = 'tie';

                                        // Calculate Payout
                                        const payout = result === 'win' ? amount * 1.82 : 0;

                                        // Update Trade in DB
                                        newTrade.result = result === 'win' ? 'win' : 'loss';
                                        newTrade.closePrice = closePrice;
                                        newTrade.payout = payout;
                                        await newTrade.save();



                                        // Update User Balance on Win
                                        if (result === 'win') {
                                                const updatedUser = await User.findByIdAndUpdate(
                                                        userId,
                                                        { $inc: { balance: payout } },
                                                        { new: true }
                                                );
                                                if (updatedUser) {
                                                        io.to(userId).emit('balance_update', updatedUser.balance);
                                                }
                                        }

                                        // Notify Client of Result
                                        if (userId) {
                                                io.to(userId).emit('trade_result', {
                                                        id: newTrade._id,
                                                        clientTradeId,
                                                        result: result === 'win' ? 'PROFIT' : 'LOSS',
                                                        amount: payout,
                                                        investment: amount, // Send original investment
                                                        closePrice,
                                                        symbol
                                                });
                                        }

                                        // Notify Admin
                                        io.to('admin').emit('admin_trade_result', {
                                                id: newTrade._id,
                                                result,
                                                payout,
                                                closePrice,
                                                symbol
                                        });

                                        // Update Asset Stats
                                        const stats = getAssetStats(symbol);
                                        stats.totalTrades++;

                                        // UPDATE ACTIVE COUNTS (Decrement)
                                        if (direction === 'up') {
                                                stats.buyCount++;
                                                stats.buyVolume += amount;
                                                stats.activeBuyCount = Math.max(0, stats.activeBuyCount - 1);
                                        } else {
                                                stats.sellCount++;
                                                stats.sellVolume += amount;
                                                stats.activeSellCount = Math.max(0, stats.activeSellCount - 1);
                                        }

                                        // Broadcast new stats to the Asset Room (Admin will receive it)
                                        io.to(symbol).emit('stats_update', {
                                                ...stats,
                                                symbol: symbol, // Critical for filtering
                                                activeUsers: io.engine.clientsCount
                                        });


                                } catch (err) {
                                        console.error('Error resolving trade:', err);
                                }
                        }, duration * 1000);

                } catch (error) {
                        console.error('❌ Error placing trade:', error);
                }
        });

        // Handle admin control updates
        socket.on('control_update', async (data) => {

                const requestedSymbol = data.symbol ? data.symbol.toUpperCase() : 'GLOBAL';

                // Determine assets to update: either a specific one or ALL active ones
                const targets = [];
                if (requestedSymbol === 'GLOBAL' || requestedSymbol === 'ALL') {
                        // Update all tracked assets
                        assetStates.forEach((state, key) => targets.push(key));
                } else {
                        targets.push(requestedSymbol);
                }


                targets.forEach(async (targetSymbol) => {
                        const state = getAssetState(targetSymbol);
                        const { marketState, manipulationState } = state;

                        if (data.direction) {
                                const newDirection = data.direction;

                                // If we are switching modes, handle the transition logic
                                if (newDirection !== manipulationState.mode) {

                                        const currentPrice = marketState.currentPrice;
                                        const realPrice = state.lastRealPrice;

                                        if (newDirection === 'up') {
                                                // 1. Set Activation Price (The Floor)
                                                manipulationState.activationPrice = currentPrice;
                                                // 2. Start Accumulating from current offset (no fixed target)
                                                manipulationState.targetOffset = null;

                                        } else if (newDirection === 'down') {
                                                // 1. Set Activation Price (The Ceiling)
                                                manipulationState.activationPrice = currentPrice;
                                                // 2. Start Accumulating from current offset (no fixed target)
                                                manipulationState.targetOffset = null;

                                        } else if (newDirection === 'neutral') {
                                                // 1. Seamless Transition: Capture the EXACT current error
                                                if (currentPrice && realPrice) {
                                                        const exactDiff = currentPrice - realPrice;
                                                        manipulationState.currentOffset = exactDiff;
                                                        console.log(`✨ Seamless Neutral: init offset at ${exactDiff.toFixed(2)}`);
                                                }
                                                // 2. Target is Zero (Decay)
                                                manipulationState.targetOffset = 0;
                                                // 3. Clear Activation Price
                                                manipulationState.activationPrice = null;
                                        }

                                        manipulationState.mode = newDirection;
                                }

                                // Update persistent direction state
                                marketState.direction = newDirection;
                        }

                        if (data.volatility !== undefined) {
                                marketState.volatility = Math.max(0.1, Math.min(5.0, data.volatility));
                        }

                        if (data.tickSpeed !== undefined) {
                                marketState.tickSpeed = Math.max(100, Math.min(1000, data.tickSpeed));
                        }

                        if (data.isActive !== undefined) {
                                marketState.isActive = data.isActive;
                        }

                        // Update database
                        try {
                                await MarketControl.findOneAndUpdate(
                                        { symbol: targetSymbol },
                                        {
                                                direction: marketState.direction,
                                                volatility: marketState.volatility,
                                                tickSpeed: marketState.tickSpeed,
                                                currentPrice: marketState.currentPrice,
                                                isActive: marketState.isActive,
                                                lastUpdated: new Date(),
                                                symbol: targetSymbol,
                                        },
                                        { upsert: true, new: true }
                                );
                        } catch (error) {
                                console.error('Error updating market control:', error);
                        }

                        // Broadcast updated state
                        io.to(targetSymbol).emit('market_state', marketState);
                }); // End forEach target
        });

        // Handle manual candle close
        socket.on('force_close_candle', async (data) => {
                console.log('🔒 Force close candle received:', data);

                const { timeframe, symbol } = data;
                const targetSymbol = symbol ? symbol.toUpperCase() : 'BTCUSDT'; // Default symbol

                if (!timeframe || !candleTrackers[timeframe]) { // candleTrackers is for synthetic, need to use assetCandleTrackers for real
                        console.error('❌ Invalid timeframe:', timeframe);
                        socket.emit('candle_closed', {
                                timeframe,
                                success: false,
                                message: `Invalid timeframe: ${timeframe}`
                        });
                        return;
                }

                // Use the correct tracker based on MARKET_DATA_MODE
                const tracker = MARKET_DATA_MODE === 'real' ? getAssetCandleTracker(targetSymbol, timeframe) : candleTrackers[timeframe];
                const currentPrice = data.price || (MARKET_DATA_MODE === 'real' ? getAssetState(targetSymbol).marketState.currentPrice : marketState.currentPrice);
                const timestamp = Date.now();

                // Initialize candle if not started yet
                if (!tracker.startTime || tracker.open === null) {
                        console.log(`⚠️ Candle not yet started for ${targetSymbol} ${timeframe}, initializing first...`);
                        tracker.open = currentPrice;
                        tracker.high = currentPrice;
                        tracker.low = currentPrice;
                        tracker.close = currentPrice;
                        tracker.startTime = timestamp;
                }

                // Close the current candle
                const completedCandle = {
                        open: tracker.open,
                        high: Math.max(tracker.high, currentPrice),
                        low: Math.min(tracker.low, currentPrice),
                        close: currentPrice,
                        timeframe,
                        timestamp: new Date(tracker.startTime),
                        symbol: targetSymbol, // Add symbol
                };

                // Save completed candle (non-blocking)
                saveCandle(completedCandle);

                // Emit completed candle to all clients in the specific room
                io.to(targetSymbol).emit('candle_complete', completedCandle);

                // Reset tracker to start new candle immediately
                tracker.open = currentPrice;
                tracker.high = currentPrice;
                tracker.low = currentPrice;
                tracker.close = currentPrice;
                tracker.startTime = data.nextCandleStartTime || timestamp;

                // Emit new candle immediately so clients see it right away
                io.to(targetSymbol).emit('candle_update', {
                        open: tracker.open,
                        high: tracker.high,
                        low: tracker.low,
                        close: tracker.close,
                        timeframe,
                        timestamp: new Date(tracker.startTime),
                        symbol: targetSymbol, // Add symbol
                });

                console.log(`✅ Candle manually closed for ${targetSymbol} ${timeframe} - Open: ${completedCandle.open}, Close: ${completedCandle.close}`);

                // Emit confirmation to admin
                socket.emit('candle_closed', {
                        timeframe,
                        success: true,
                        message: `Candle closed for ${targetSymbol} ${timeframe}`,
                        candle: completedCandle
                });
        });

        socket.on('disconnect', () => {
                console.log('👤 Client disconnected:', socket.id);
        });





        // Handle admin stats request
        // Handle admin stats request
        socket.on('request_stats', (symbol) => {
                const targetSymbol = symbol || 'BTCUSDT';
                const stats = getAssetStats(targetSymbol);

                // Emit only to the requester or the room? 
                // Admin dashboard subscribes to room, so room emit might be duplicated if we also emit to socket.
                // But specifically for initial load 'request_stats', we should just emit back to socket.
                socket.emit('stats_update', {
                        ...stats,
                        symbol: targetSymbol, // Critical: Client filters by this now!
                        activeUsers: io.engine.clientsCount // Global active users, or per room? Using global for now.
                });
        });

        // Admin: Join Room
        socket.on('join_admin', () => {
                socket.join('admin');
        });

        // Admin: Request Active Trades
        socket.on('request_active_trades', async (symbol) => {
                try {
                        const trades = await Trade.find({
                                result: 'pending',
                                symbol: symbol
                        }).sort({ timestamp: -1 }).limit(50);

                        socket.emit('active_trades_list', trades);
                } catch (err) {
                        console.error('Error fetching active trades:', err);
                }
        });
});

// Initialize and start server
const PORT = process.env.PORT || 3001;

// Main startup function
async function startServer() {
        try {
                // Connect to MongoDB
                await mongoose.connect(MONGODB_URI, {
                        bufferCommands: false,
                        serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
                });
                console.log('✅ MongoDB connected to server');

                // Initialize market control
                await initializeMarketControl();

                // Initialize ALL asset states
                ALL_ASSETS.forEach(asset => getAssetState(asset.symbol));
                console.log(`✅ Initialized state for ${ALL_ASSETS.length} assets`);

                // Start data cleanup process
                startDataCleanup();

                // Start data generation based on mode
                if (MARKET_DATA_MODE === 'real') {
                        console.log('🌐 Starting Binance real-time data stream (Crypto)...');
                        startBinanceRealTimeData();
                }

                // Start Synthetic Generator for everything else (or ALL if mode is synthetic)
                // This function is smart enough to skip Crypto if mode is 'real'
                console.log('🎲 Starting Synthetic Multi-Asset Generator...');
                startSyntheticMultiAssetGeneration();

                // Start HTTP server
                httpServer.listen(PORT, () => {
                        console.log(`🚀 Socket.IO server running on port ${PORT}`);
                        console.log(`📊 Hybrid Data Feed Active: ${MARKET_DATA_MODE.toUpperCase()}`);
                });
        } catch (err) {
                console.error('❌ Server startup error:', err);
                process.exit(1);
        }
}

// Start the server
startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
        console.log('SIGTERM signal received: closing HTTP server');
        if (tickInterval) clearInterval(tickInterval);
        if (cleanupInterval) clearInterval(cleanupInterval); // Clear cleanup interval

        stopBinanceRealTimeData();
        httpServer.close(() => {
                console.log('HTTP server closed');
                mongoose.connection.close(false, () => {
                        console.log('MongoDB connection closed');
                        process.exit(0);
                });
        });
});