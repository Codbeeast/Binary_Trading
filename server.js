require('dotenv').config(); // Load environment variables

const { createServer } = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/binary-trading';

if (!process.env.MONGODB_URI) {
  console.warn('⚠️  MONGODB_URI not found in .env file. Using default local connection.');
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
  
  // Initialize new candle if needed
  if (!tracker.startTime || timestamp - tracker.startTime >= tracker.duration) {
    tracker.open = price;
    tracker.high = price;
    tracker.low = price;
    tracker.close = price;
    tracker.startTime = timestamp;
    return { isNew: true, candle: null };
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
    if (!marketState.isActive) return;
    
    // Generate new price
    const newPrice = generateNextPrice(
      marketState.currentPrice,
      marketState.direction,
      marketState.volatility
    );
    
    marketState.currentPrice = newPrice;
    const timestamp = Date.now();
    
    // Save tick to database (async, don't wait)
    Tick.create({
      price: newPrice,
      timestamp: new Date(timestamp),
      timeframe: '5s',
    }).catch(err => console.error('Error saving tick:', err));
    
    // Emit tick update
    io.emit('tick_update', {
      price: newPrice,
      timestamp,
      direction: marketState.direction,
    });
    
    // Update candles for all timeframes
    for (const timeframe of Object.keys(candleTrackers)) {
      const result = updateCandle(timeframe, newPrice, timestamp);
      
      if (result.isNew && result.candle === null) {
        // New candle just started, emit the previous one if it existed
        const tracker = candleTrackers[timeframe];
        if (tracker.open !== null) {
          const completedCandle = {
            open: tracker.open,
            high: tracker.high,
            low: tracker.low,
            close: tracker.close,
            timeframe,
            timestamp: new Date(tracker.startTime),
          };
          
          // Save completed candle
          saveCandle(completedCandle);
          
          // Emit completed candle
          io.emit('candle_complete', completedCandle);
        }
      } else if (!result.isNew && result.candle) {
        // Emit candle update
        io.emit('candle_update', result.candle);
      }
    }
  }, marketState.tickSpeed);
}

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
      marketState.direction = data.direction;
    }
    
    if (data.volatility !== undefined) {
      marketState.volatility = Math.max(0.1, Math.min(5.0, data.volatility));
    }
    
    if (data.tickSpeed !== undefined) {
      marketState.tickSpeed = Math.max(100, Math.min(1000, data.tickSpeed));
      startTickGeneration(); // Restart with new speed
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
    const currentPrice = marketState.currentPrice;
    
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
    await saveCandle(completedCandle);
    
    // Emit completed candle to all clients
    io.emit('candle_complete', completedCandle);
    
    // Reset tracker to start new candle immediately
    tracker.open = currentPrice;
    tracker.high = currentPrice;
    tracker.low = currentPrice;
    tracker.close = currentPrice;
    tracker.startTime = timestamp;
    
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
    
    // Start tick generation
    startTickGeneration();
    
    // Start HTTP server
    httpServer.listen(PORT, () => {
      console.log(`🚀 Socket.IO server running on port ${PORT}`);
      console.log(`📊 Tick generation active (${marketState.tickSpeed}ms interval)`);
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
  httpServer.close(() => {
    console.log('HTTP server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});