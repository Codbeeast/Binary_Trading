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
    },
    // Referral Fields
    referralCode: { type: String, unique: true, sparse: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    referralEarnings: { type: Number, default: 0 },
    referralBalance: { type: Number, default: 0 },
    referralTier: { type: Number, default: 1 },
    monthlyRefereeDeposits: { type: Number, default: 0 },
    referralTierUpdatedAt: { type: Date, default: null }
});

// Check if model exists before compiling to avoid OverwriteModelError in Next.js dev mode
module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
