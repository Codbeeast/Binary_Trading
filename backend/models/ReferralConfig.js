const mongoose = require('mongoose');

const ReferralConfigSchema = new mongoose.Schema({
    isEnabled: { type: Boolean, default: true },
    minTradeAmountForReward: { type: Number, default: 100 },
    tiers: [{
        level: { type: Number, required: true },
        name: { type: String, required: true },
        minDeposits: { type: Number, required: true },
        maxDeposits: { type: Number, default: null },
        revSharePercent: { type: Number, required: true },
        turnoverPercent: { type: Number, default: 0 },
        perks: [String]
    }],
    lastUpdatedBy: String,
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.ReferralConfig || mongoose.model('ReferralConfig', ReferralConfigSchema);
