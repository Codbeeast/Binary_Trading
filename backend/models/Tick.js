const mongoose = require('mongoose');

const TickSchema = new mongoose.Schema({
  price: Number,
  timestamp: { type: Date, default: Date.now },
  timeframe: { type: String, default: '5s' },
  symbol: { type: String, default: 'BTCUSDT' },
});

module.exports = mongoose.models.Tick || mongoose.model('Tick', TickSchema);
