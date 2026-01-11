const mongoose = require('mongoose');

const CandleSchema = new mongoose.Schema({
  open: Number,
  high: Number,
  low: Number,
  close: Number,
  timeframe: String,
  timestamp: Date,
  volume: { type: Number, default: 0 },
  symbol: { type: String, default: 'BTCUSDT' },
});

module.exports = mongoose.models.Candle || mongoose.model('Candle', CandleSchema);
