require('dotenv').config(); // Load environment variables

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
const TickSchema = new mongoose.Schema({
        price: Number,
        timestamp: { type: Date, default: Date.now },
        timeframe: { type: String, default: '5s' },
});

const CandleSchema = new mongoose.Schema({
        open: Number,
        high: Number,
        low: Number,
        close: Number,
        timeframe: String,
        timestamp: Date,
        volume: { type: Number, default: 0 },
});

const MarketControlSchema = new mongoose.Schema({
        direction: { type: String, enum: ['up', 'down', 'neutral'], default: 'neutral' },
        volatility: { type: Number, default: 1.0 },
        tickSpeed: { type: Number, default: 300 },
        currentPrice: { type: Number, default: 100.00 },
        lastUpdated: { type: Date, default: Date.now },
        isActive: { type: Boolean, default: true },
});

const Tick = mongoose.models.Tick || mongoose.model('Tick', TickSchema);
const Candle = mongoose.models.Candle || mongoose.model('Candle', CandleSchema);
const MarketControl = mongoose.models.MarketControl || mongoose.model('MarketControl', MarketControlSchema);

const TradeSchema = new mongoose.Schema({
        userId: String,
        amount: Number,
        direction: { type: String, enum: ['up', 'down'] },
        result: { type: String, enum: ['win', 'loss', 'pending'], default: 'pending' },
        entryPrice: Number,
        closePrice: Number,
        timestamp: { type: Date, default: Date.now },
        timeframe: String,
});

const Trade = mongoose.models.Trade || mongoose.model('Trade', TradeSchema);

// Trade statistics (in-memory cache for speed)
let tradeStats = {
        activeUsers: 0,
        totalTrades: 0,
        buyCount: 0,
        sellCount: 0,
        buyVolume: 0,
        sellVolume: 0,
};

// Create HTTP server
const httpServer = createServer();
const io = new Server(httpServer, {
        cors: {
                origin: '*',
                methods: ['GET', 'POST'],
        },
});

// Market state
let marketState = {
        direction: 'neutral',
        volatility: 1.0,
        tickSpeed: 300,
        currentPrice: 100.00,
        isActive: true,
};

// ********************************************
// FIX: Move lastRealPrice to module scope
// ********************************************
let lastRealPrice = 0;
// ********************************************

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
        newPrice = Math.max(newPrice, 10);
        newPrice = Math.min(newPrice, 1000);

        return parseFloat(newPrice.toFixed(2));
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

function startTickGeneration() {
        if (tickInterval) {
                clearInterval(tickInterval);
        }

        tickInterval = setInterval(async () => {
                if (!marketState.isActive) {
                        console.log('⏸️  Market is inactive, skipping tick generation');
                        return;
                }

                // Generate new price
                const newPrice = generateNextPrice(
                        marketState.currentPrice,
                        marketState.direction,
                        marketState.volatility
                );

                marketState.currentPrice = newPrice;
                const timestamp = Date.now();

                // Emit tick update
                io.emit('tick_update', {
                        price: newPrice,
                        timestamp,
                        direction: marketState.direction,
                });

                console.log(`📈 Tick: $${newPrice.toFixed(2)} | ${marketState.direction} | Clients: ${io.engine.clientsCount}`);

                // Update candles for all timeframes
                for (const timeframe of Object.keys(candleTrackers)) {
                        const result = updateCandle(timeframe, newPrice, timestamp);

                        if (result.isNew && result.completedCandle) {
                                // New candle just started, emit the completed one
                                console.log(`🕯️  Candle complete [${timeframe}]: O:${result.completedCandle.open.toFixed(2)} H:${result.completedCandle.high.toFixed(2)} L:${result.completedCandle.low.toFixed(2)} C:${result.completedCandle.close.toFixed(2)}`);
                                console.log(`📡 Emitting candle_complete to ${io.engine.clientsCount} clients`);

                                // Save completed candle
                                saveCandle(result.completedCandle);

                                // Emit completed candle
                                io.emit('candle_complete', result.completedCandle);
                        } else if (!result.isNew && result.candle) {
                                // Emit candle update immediately for real-time feel
                                if (Math.random() < 0.01) {
                                        console.log(`📊 Candle update [${timeframe}]: C:${result.candle.close.toFixed(2)}`);
                                }
                                io.emit('candle_update', result.candle);
                        }
                }
        }, marketState.tickSpeed);
}

// ============================================
// BINANCE REAL-TIME DATA INTEGRATION
// ============================================

function startBinanceRealTimeData() {
        if (MARKET_DATA_MODE !== 'real') {
                console.log('⚠️  Binance real-time data disabled. Using synthetic data.');
                return;
        }

        binanceService = new BinanceService();

        // lastRealPrice is now a module-level variable

        binanceService.connect((realPrice) => {
                if (!marketState.isActive) return;

                // ********************************************
                // FIX: Remove 'let' so it updates the module-level variable
                // ********************************************
                if (lastRealPrice === 0) lastRealPrice = realPrice;
                // ********************************************

                // --- MANIPULATION LOGIC ---
                const { mode, activationPrice } = manipulationState;
                const noiseLevel = marketState.volatility || 1.0;

                // 1. Determine Target Offset
                const SATURATION_OFFSET = 20; // The "stay around here" value
                const BUFFER = 2.0;           // Buffer to keep clearly above/below activation

                let calculatedTarget = 0;
                let hardConstraintLimit = null; // New variable to track the absolute offset constraint

                if (mode === 'up') {
                        // Goal 1: Reach +20 relative to real price (general trend up)
                        // Goal 2: MUST be above Activation Price
                        let constraintOffset = -Infinity;
                        if (activationPrice !== null) {
                                constraintOffset = (activationPrice - realPrice) + BUFFER; // Offset needed to put price 2.0 above activation
                                hardConstraintLimit = constraintOffset; // CRITICAL: This is the minimum offset required
                        }

                        // Target must be AT LEAST the constraint, and ideally the SATURATION_OFFSET
                        calculatedTarget = Math.max(SATURATION_OFFSET, constraintOffset);

                } else if (mode === 'down') {
                        // Goal 1: Reach -20
                        // Goal 2: MUST be below Activation Price
                        let constraintOffset = Infinity;
                        if (activationPrice !== null) {
                                constraintOffset = (activationPrice - realPrice) - BUFFER; // Offset needed to put price 2.0 below activation
                                hardConstraintLimit = constraintOffset; // CRITICAL: This is the maximum offset allowed
                        }

                        // Target must be AT MOST the constraint, and ideally the -SATURATION_OFFSET
                        calculatedTarget = Math.min(-SATURATION_OFFSET, constraintOffset);

                } else {
                        // Neutral: Target is 0
                        calculatedTarget = 0;
                }

                // CRITICAL FIX: If the current offset is threatening to breach the activation price,
                // we must immediately adjust it to respect the hard constraint. This prevents the
                // Lerp smoothing from failing when the real price moves fast.
                if (hardConstraintLimit !== null) {
                        if (mode === 'up' && manipulationState.currentOffset < hardConstraintLimit) {
                                manipulationState.currentOffset = hardConstraintLimit;
                                // console.warn('⚠️ ENFORCED UP CONSTRAINT on offset'); // Optional logging
                        } else if (mode === 'down' && manipulationState.currentOffset > hardConstraintLimit) {
                                manipulationState.currentOffset = hardConstraintLimit;
                                // console.warn('⚠️ ENFORCED DOWN CONSTRAINT on offset'); // Optional logging
                        }
                }


                // 2. Smoothly Interpolate (Lerp) towards Target
                // Reduced factor for smoother transitions (0.005 is much slower than 0.05)
                const LERP_FACTOR = 0.005;

                // Check for NaN just in case
                if (isNaN(calculatedTarget)) calculatedTarget = 0;

                manipulationState.targetOffset = calculatedTarget;
                manipulationState.currentOffset += (manipulationState.targetOffset - manipulationState.currentOffset) * LERP_FACTOR;

                // 3. Add Natural Noise/Waves
                manipulationState.noisePhase += 0.1; // Advance phase
                const waveNoise = Math.sin(manipulationState.noisePhase) * 1.5; // Main wave ±1.5
                const jitter = (Math.random() - 0.5) * 1.0; // Fast jitter ±0.5

                const totalNoise = (waveNoise + jitter) * (noiseLevel * 0.5); // Scale by volatility slightly

                // 4. Calculate Final Display Price
                let manipulatedPrice = realPrice + manipulationState.currentOffset + totalNoise;

                // CRITICAL FIX: ABSOLUTE CLAMPING OF FINAL PRICE
                // This is the absolute guarantee. If the price accidentally crosses the boundary (due to noise/lag), 
                // it is forced back to the correct side immediately.
                if (activationPrice !== null) {
                        if (mode === 'up') {
                                // Price MUST be above activationPrice + a small margin (e.g., 0.01)
                                manipulatedPrice = Math.max(manipulatedPrice, activationPrice + 0.01);
                        } else if (mode === 'down') {
                                // Price MUST be below activationPrice - a small margin
                                manipulatedPrice = Math.min(manipulatedPrice, activationPrice - 0.01);
                        }
                }


                // --- END MANIPULATION LOGIC ---

                // Update market state
                const timestamp = Date.now();

                // Determine visual direction
                const priceChange = manipulatedPrice - (marketState.lastPrice || manipulatedPrice);
                let visualDirection = 'neutral';
                if (priceChange > 0) visualDirection = 'up';
                else if (priceChange < 0) visualDirection = 'down';

                // Store state
                marketState.currentPrice = manipulatedPrice;
                marketState.lastPrice = manipulatedPrice;
                marketState.direction = visualDirection;
                lastRealPrice = realPrice;

                // Save tick
                Tick.create({
                        price: manipulatedPrice,
                        timestamp: new Date(timestamp),
                        timeframe: '5s',
                }).catch(err => console.error('❌ Error saving tick:', err));

                // Emit tick update
                io.emit('tick_update', {
                        price: manipulatedPrice,
                        timestamp,
                        direction: visualDirection,
                });

                // Logging (throttled)
                if (Math.random() < 0.05) {
                        console.log(`📈 P: $${manipulatedPrice.toFixed(2)} (R: $${realPrice.toFixed(2)} | Off: ${manipulationState.currentOffset.toFixed(2)}) | Mode: ${mode}`);
                }

                // Update candles
                for (const timeframe of Object.keys(candleTrackers)) {
                        const result = updateCandle(timeframe, manipulatedPrice, timestamp);

                        if (result.isNew && result.completedCandle) {
                                console.log(`🕯️  Candle [${timeframe}]: C:${result.completedCandle.close.toFixed(2)}`);
                                saveCandle(result.completedCandle);

                                // Emit completed candle
                                io.emit('candle_complete', result.completedCandle);
                        } else if (!result.isNew && result.candle) {
                                io.emit('candle_update', result.candle);
                        }
                }
        });
}

function stopBinanceRealTimeData() {
        if (binanceService) {
                binanceService.disconnect();
                binanceService = null;
        }
}

// ============================================
// DATABASE CLEANUP LOGIC
// ============================================

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

        // Send current market state
        socket.emit('market_state', marketState);

        // Send recent candles for all timeframes
        (async () => {
                try {
                        for (const timeframe of Object.keys(candleTrackers)) {
                                const recentCandles = await Candle.find({ timeframe })
                                        .sort({ timestamp: -1 })
                                        .limit(150)
                                        .lean();

                                socket.emit('historical_candles', {
                                        timeframe,
                                        candles: recentCandles.reverse(),
                                });
                        }
                } catch (error) {
                        console.error('Error fetching historical candles:', error);
                }
        })();

        // Handle admin control updates
        socket.on('control_update', async (data) => {
                console.log('🎮 Control update received:', data);

                if (data.direction) {
                        const newDirection = data.direction;

                        // If we are switching modes, capture the activation price
                        if (newDirection !== manipulationState.mode) {
                                console.log(`🔄 Mode Switch: ${manipulationState.mode} -> ${newDirection}`);

                                // ********************************************
                                // FIX: Mode Switch Logic for Smooth Transition
                                // ********************************************
                                if ((newDirection === 'up' || newDirection === 'down') && marketState.currentPrice) {
                                        // Entering UP/DOWN: Capture the current manipulated price as the new boundary
                                        manipulationState.activationPrice = marketState.currentPrice;

                                } else if (newDirection === 'neutral') {
                                        // Entering NEUTRAL: Set the currentOffset immediately to the instantaneous difference 
                                        // to prevent a jump caused by the sudden shift in targetOffset from +/-20 to 0.
                                        if (marketState.currentPrice && lastRealPrice) {
                                                // This calculation uses the module-scoped lastRealPrice
                                                const instantaneousOffset = marketState.currentPrice - lastRealPrice;
                                                manipulationState.currentOffset = instantaneousOffset;
                                                console.log(`✨ Offset set instantaneously to: ${instantaneousOffset.toFixed(2)} for smooth transition.`);
                                        }
                                        manipulationState.activationPrice = null;
                                }
                                // ********************************************

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
                        if (MARKET_DATA_MODE !== 'real') {
                                startTickGeneration();
                        }
                }

                if (data.isActive !== undefined) {
                        marketState.isActive = data.isActive;
                }

                // Update database
                try {
                        await MarketControl.findOneAndUpdate(
                                {},
                                {
                                        direction: marketState.direction,
                                        volatility: marketState.volatility,
                                        tickSpeed: marketState.tickSpeed,
                                        currentPrice: marketState.currentPrice,
                                        isActive: marketState.isActive,
                                        lastUpdated: new Date(),
                                },
                                { upsert: true, new: true }
                        );
                } catch (error) {
                        console.error('Error updating market control:', error);
                }

                // Broadcast updated state to all clients
                io.emit('market_state', marketState);
        });

        // Handle manual candle close
        socket.on('force_close_candle', async (data) => {
                console.log('🔒 Force close candle received:', data);

                const { timeframe } = data;

                if (!timeframe || !candleTrackers[timeframe]) {
                        console.error('❌ Invalid timeframe:', timeframe);
                        socket.emit('candle_closed', {
                                timeframe,
                                success: false,
                                message: `Invalid timeframe: ${timeframe}`
                        });
                        return;
                }

                const tracker = candleTrackers[timeframe];
                const timestamp = Date.now();
                const currentPrice = data.price || marketState.currentPrice;

                // Initialize candle if not started yet
                if (!tracker.startTime || tracker.open === null) {
                        console.log(`⚠️ Candle not yet started for ${timeframe}, initializing first...`);
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
                };

                // Save completed candle
                // Save completed candle (non-blocking)
                saveCandle(completedCandle);

                // Emit completed candle to all clients
                io.emit('candle_complete', completedCandle);

                // Reset tracker to start new candle immediately
                tracker.open = currentPrice;
                tracker.high = currentPrice;
                tracker.low = currentPrice;
                tracker.close = currentPrice;
                tracker.startTime = data.nextCandleStartTime || timestamp;

                // Emit new candle immediately so clients see it right away
                io.emit('candle_update', {
                        open: tracker.open,
                        high: tracker.high,
                        low: tracker.low,
                        close: tracker.close,
                        timeframe,
                        timestamp: new Date(tracker.startTime),
                });

                console.log(`✅ Candle manually closed for ${timeframe} - Open: ${completedCandle.open}, Close: ${completedCandle.close}`);

                // Emit confirmation to admin
                socket.emit('candle_closed', {
                        timeframe,
                        success: true,
                        message: `Candle closed for ${timeframe}`,
                        candle: completedCandle
                });
        });

        socket.on('disconnect', () => {
                console.log('👤 Client disconnected:', socket.id);
        });

        // Handle new trade placement
        socket.on('place_trade', async (tradeData) => {
                console.log('💰 Trade received:', tradeData);

                // Update local stats immediately
                tradeStats.totalTrades++;
                if (tradeData.direction === 'up') {
                        tradeStats.buyCount++;
                        tradeStats.buyVolume += (tradeData.amount || 0);
                } else {
                        tradeStats.sellCount++;
                        tradeStats.sellVolume += (tradeData.amount || 0);
                }

                // Broadcast stats update to admins (or everyone for now)
                io.emit('stats_update', {
                        ...tradeStats,
                        activeUsers: io.engine.clientsCount
                });

                try {
                        await Trade.create({
                                userId: socket.id,
                                amount: tradeData.amount || 100,
                                direction: tradeData.direction,
                                entryPrice: marketState.currentPrice,
                                timeframe: '1m', // Default or passed from client
                                timestamp: new Date(),
                        });
                } catch (err) {
                        console.error('Error saving trade:', err);
                }
        });

        // Handle admin stats request
        socket.on('request_stats', () => {
                socket.emit('stats_update', {
                        ...tradeStats,
                        activeUsers: io.engine.clientsCount
                });
        });
});

// Initialize and start server
const PORT = process.env.PORT || 3001;

// Main startup function
async function startServer() {
        try {
                // Uncomment below for in-memory MongoDB (testing without MongoDB installed)
                // const mongod = await MongoMemoryServer.create();
                // const uri = mongod.getUri();
                // console.log('🧪 Using in-memory MongoDB for testing');
                // await mongoose.connect(uri, { bufferCommands: false });

                // Connect to MongoDB
                await mongoose.connect(MONGODB_URI, {
                        bufferCommands: false,
                        serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
                });
                console.log('✅ MongoDB connected to server');

                // Initialize market control
                await initializeMarketControl();

                // Start data cleanup process
                startDataCleanup();

                // Start data generation based on mode
                if (MARKET_DATA_MODE === 'real') {
                        console.log('🌐 Starting Binance real-time data stream...');
                        startBinanceRealTimeData();
                } else {
                        console.log('🎲 Starting synthetic data generation...');
                        startTickGeneration();
                }

                // Start HTTP server
                httpServer.listen(PORT, () => {
                        console.log(`🚀 Socket.IO server running on port ${PORT}`);
                        if (MARKET_DATA_MODE === 'real') {
                                console.log(`📊 Real-time Binance data active for ${process.env.MASSIVE_SYMBOL || 'BTCUSDT'}`);
                        } else {
                                console.log(`📊 Synthetic tick generation active (${marketState.tickSpeed}ms interval)`);
                        }
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