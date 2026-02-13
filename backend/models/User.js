const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: false // Optional for Google Users
    },
    image: {
        type: String
    },
    balance: {
        type: Number,
        default: 800000 // Demo balance 8 Lakhs
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    provider: {
        type: String,
        default: 'credentials'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Check if model exists before compiling to avoid OverwriteModelError in Next.js dev mode
module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
