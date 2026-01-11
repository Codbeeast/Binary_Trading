require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/binary-trading';

async function clearDatabase() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected.');

        console.log('🧹 Clearing "ticks" collection...');

        // Check if collection exists first to avoid error
        const collections = await mongoose.connection.db.listCollections({ name: 'ticks' }).toArray();

        if (collections.length > 0) {
            await mongoose.connection.db.dropCollection('ticks');
            console.log('✨ "ticks" collection dropped successfully. Space should be freed.');
            console.log('ℹ️ "ticks" collection does not exist (already empty).');
        }

        console.log('🧹 Clearing "candles" collection...');
        const candleCollections = await mongoose.connection.db.listCollections({ name: 'candles' }).toArray();
        if (candleCollections.length > 0) {
            await mongoose.connection.db.dropCollection('candles');
            console.log('✨ "candles" collection dropped.');
        } else {
            console.log('ℹ️ "candles" collection does not exist.');
        }

        // Optional: Clear trades if they want strictly fresh start?
        // console.log('🧹 Clearing "trades" collection...');
        // await mongoose.connection.db.dropCollection('trades');

        console.log('🏁 Done.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error clearing database:', error);
        process.exit(1);
    }
}

clearDatabase();
