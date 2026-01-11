const mongoose = require('mongoose');

const TradeSchema = new mongoose.Schema({
    userId: String,
    amount: Number,
    direction: { type: String, enum: ['up', 'down'] },
    result: { type: String, enum: ['win', 'loss', 'pending'], default: 'pending' },
    entryPrice: Number,
    closePrice: Number,
    timestamp: { type: Date, default: Date.now },
    timeframe: String,
    symbol: { type: String, default: 'BTCUSDT' },
    duration: Number, // Duration in seconds
    expiryTime: Date,
    payout: Number,
    clientTradeId: String
});

// Prevent model recompilation error in development
module.exports = mongoose.models.Trade || mongoose.model('Trade', TradeSchema);
