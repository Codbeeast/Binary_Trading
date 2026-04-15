import mongoose from 'mongoose';

const ReferralRewardSchema = new mongoose.Schema({
    referrerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    refereeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tradeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trade', required: true, unique: true },
    tradeAmount: { type: Number, required: true },
    rewardAmount: { type: Number, required: true },
    rewardType: { type: String, enum: ['revshare', 'turnover'], default: 'revshare' },
    tierAtTime: { type: Number, required: true },
    percentageApplied: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.ReferralReward || mongoose.model('ReferralReward', ReferralRewardSchema);
