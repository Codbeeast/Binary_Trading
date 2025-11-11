import mongoose from 'mongoose';

const TickSchema = new mongoose.Schema({
  price: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
  },
  timeframe: {
    type: String,
    default: '5s',
  },
}, {
  timestamps: true,
});

// Index for faster queries
TickSchema.index({ timestamp: -1 });
TickSchema.index({ timeframe: 1, timestamp: -1 });

export default mongoose.models.Tick || mongoose.model('Tick', TickSchema);
