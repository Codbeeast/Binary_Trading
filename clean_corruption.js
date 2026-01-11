
const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/binary-trading';

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

const Candle = mongoose.model('Candle', CandleSchema);

async function cleanDB() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // Delete candles with infinite or likely invalid values
        const result = await Candle.deleteMany({
            $or: [
                { high: { $eq: Infinity } },
                { high: { $eq: -Infinity } },
                { low: { $eq: Infinity } },
                { low: { $eq: -Infinity } },
                { close: { $eq: NaN } },
                // Also catch cases where high < 0 which is impossible for price
                { high: { $lt: 0 } }
            ]
        });

        console.log(`Deleted ${result.deletedCount} corrupted candles.`);

        // Also wipe recent history to be safe if user wants fresh start (Optional, but good for "flat" issue)
        // const all = await Candle.deleteMany({});
        // console.log(`Deleted ALL ${all.deletedCount} candles.`);

    } catch (error) {
        console.error('Error cleaning DB:', error);
    } finally {
        await mongoose.disconnect();
    }
}

cleanDB();
