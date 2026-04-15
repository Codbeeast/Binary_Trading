import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import ReferralConfig from '@/models/ReferralConfig';
import ReferralReward from '@/models/ReferralReward';

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();
        
        // Ensure config exists
        let config = await ReferralConfig.findOne();
        if (!config || config.tiers.length === 0) {
           config = await ReferralConfig.create({
               isEnabled: true,
               minTradeAmountForReward: 100,
               tiers: [
                   { level: 1, name: 'Starter', minDeposits: 0, maxDeposits: 9, revSharePercent: 50, turnoverPercent: 2 },
                   { level: 2, name: 'Bronze', minDeposits: 10, maxDeposits: 29, revSharePercent: 60, turnoverPercent: 3 },
                   { level: 3, name: 'Silver', minDeposits: 30, maxDeposits: 49, revSharePercent: 65, turnoverPercent: 4 },
                   { level: 4, name: 'Gold', minDeposits: 50, maxDeposits: 99, revSharePercent: 70, turnoverPercent: 5 },
                   { level: 5, name: 'Platinum', minDeposits: 100, maxDeposits: 199, revSharePercent: 75, turnoverPercent: 6 },
                   { level: 6, name: 'Diamond', minDeposits: 200, maxDeposits: 499, revSharePercent: 78, turnoverPercent: 6.5 },
                   { level: 7, name: 'Elite', minDeposits: 500, maxDeposits: null, revSharePercent: 80, turnoverPercent: 7 },
               ]
           });
        }

        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        
        // Generate referral code if user doesn't have one (legacy users)
        if (!user.referralCode) {
            user.referralCode = Math.random().toString(36).substring(2, 10).toUpperCase();
            await user.save();
        }

        // Get total referrals (people who signed up with user's code)
        const totalReferrals = await User.countDocuments({ referredBy: user._id });

        // Calculate weekly earnings
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const weeklyRewards = await ReferralReward.aggregate([
            { $match: { referrerId: user._id, createdAt: { $gte: oneWeekAgo } } },
            { $group: { _id: null, total: { $sum: '$rewardAmount' } } }
        ]);
        const weeklyEarnings = weeklyRewards.length > 0 ? weeklyRewards[0].total : 0;

        // Current tier info
        const currentTierLevel = user.referralTier || 1;
        const currentTier = config.tiers.find(t => t.level === currentTierLevel) || config.tiers[0];
        
        // Find next tier for progression UI
        const nextTier = config.tiers.find(t => t.level === currentTierLevel + 1);

        return NextResponse.json({
            referralCode: user.referralCode,
            totalEarnings: user.referralEarnings || 0,
            referralBalance: user.referralBalance || 0,
            totalReferrals,
            weeklyEarnings,
            currentTier: currentTierLevel,
            currentTierData: currentTier,
            nextTierData: nextTier,
            monthlyRefereeDeposits: user.monthlyRefereeDeposits || 0,
            configTiers: config.tiers
        });

    } catch (error) {
        console.error('Error fetching referral stats:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
