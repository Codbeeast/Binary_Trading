const mongoose = require('mongoose');

const MarketControlSchema = new mongoose.Schema({
  direction: { type: String, enum: ['up', 'down', 'neutral'], default: 'neutral' },
  volatility: { type: Number, default: 1.0 },
  tickSpeed: { type: Number, default: 300 },
  currentPrice: { type: Number, default: 100.00 },
  lastUpdated: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  symbol: { type: String, unique: true }
});

module.exports = mongoose.models.MarketControl || mongoose.model('MarketControl', MarketControlSchema);
