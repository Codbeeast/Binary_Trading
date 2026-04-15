import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import ReferralReward from '@/models/ReferralReward';
import User from '@/models/User';

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.role || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        // Basic Stats
        const totalPaidAggregation = await ReferralReward.aggregate([
            { $group: { _id: null, total: { $sum: '$rewardAmount' } } }
        ]);
        const totalPaid = totalPaidAggregation.length > 0 ? totalPaidAggregation[0].total : 0;
        
        const activeReferrers = await User.countDocuments({ referralEarnings: { $gt: 0 } });
        
        // Top 10 Earners
        const topEarners = await User.find({ referralEarnings: { $gt: 0 } })
            .select('name email referralEarnings referralTier monthlyRefereeDeposits')
            .sort({ referralEarnings: -1 })
            .limit(10);
            
        // Get recent rewards for audit log
        const recentRewards = await ReferralReward.find({})
            .sort({ createdAt: -1 })
            .limit(100)
            .populate('referrerId', 'email')
            .populate('refereeId', 'email');
            
        const auditLog = recentRewards.map(r => {
            const rb = r.toObject();
            return {
                id: rb._id,
                date: rb.createdAt,
                referrer: rb.referrerId?.email || 'Unknown',
                referee: rb.refereeId?.email || 'Unknown',
                tradeAmount: rb.tradeAmount,
                rewardAmount: rb.rewardAmount,
                tier: rb.tierAtTime,
                percentage: rb.percentageApplied
            }
        });

        return NextResponse.json({
            totalPaid,
            activeReferrers,
            topEarners,
            auditLog
        });

    } catch (error) {
        console.error('Error fetching admin referral stats:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
