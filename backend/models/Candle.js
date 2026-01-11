import mongoose from 'mongoose';

const CandleSchema = new mongoose.Schema({
  open: {
    type: Number,
    required: true,
  },
  high: {
    type: Number,
    required: true,
  },
  low: {
    type: Number,
    required: true,
  },
  close: {
    type: Number,
    required: true,
  },
  timeframe: {
    type: String,
    required: true,
    enum: ['1s', '5s', '15s', '30s', '1m'],
  },
  timestamp: {
    type: Date,
    required: true,
  },
  volume: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Compound index for efficient queries
CandleSchema.index({ timeframe: 1, timestamp: -1 });

export default mongoose.models.Candle || mongoose.model('Candle', CandleSchema);
