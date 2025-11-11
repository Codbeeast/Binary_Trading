import mongoose from 'mongoose';

const MarketControlSchema = new mongoose.Schema({
  direction: {
    type: String,
    enum: ['up', 'down', 'neutral'],
    default: 'neutral',
  },
  volatility: {
    type: Number,
    default: 1.0,
    min: 0.1,
    max: 5.0,
  },
  tickSpeed: {
    type: Number,
    default: 300,
    min: 100,
    max: 1000,
  },
  currentPrice: {
    type: Number,
    default: 100.00,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

export default mongoose.models.MarketControl || mongoose.model('MarketControl', MarketControlSchema);
