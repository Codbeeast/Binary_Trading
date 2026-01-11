
const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/binary-trading';

async function setupIndexes() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('🔌 Connected to MongoDB');

        const db = mongoose.connection.db;

        // 1. Drop existing 'candles' collection to clear any partial dupes
        console.log('🧹 Dropping candles collection...');
        try {
            await db.dropCollection('candles');
            console.log('✅ Collection dropped.');
        } catch (e) {
            console.log('ℹ️ Collection did not exist.');
        }

        // 2. Create Schema with Unique Index logic (via collection API directly to be sure)
        console.log('🔒 Creating Unique Index...');
        await db.collection('candles').createIndex(
            { symbol: 1, timeframe: 1, timestamp: 1 },
            { unique: true }
        );

        console.log('✅ Unique Index created on { symbol, timeframe, timestamp }');

        // 3. List indexes to confirm
        const indexes = await db.collection('candles').indexes();
        console.log('📋 Indexes:', indexes);

    } catch (error) {
        console.error('❌ Error setup indexes:', error);
    } finally {
        await mongoose.disconnect();
    }
}

setupIndexes();
