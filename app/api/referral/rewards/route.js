import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import ReferralReward from '@/models/ReferralReward';

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 20;
        const skip = (page - 1) * limit;

        await dbConnect();

        // Fetch reward history for logged-in user
        // Populate referee to show anonymous name
        const rewards = await ReferralReward.find({ referrerId: session.user.id })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('refereeId', 'email');
            
        const total = await ReferralReward.countDocuments({ referrerId: session.user.id });

        // Map data to hide full email for privacy
        const mappedRewards = rewards.map(r => {
            const rObj = r.toObject();
            const email = rObj.refereeId?.email || '';
            const hideStr = email.length > 5 ? email.substring(0, 3) + '***' + email.substring(email.length - 2) : '***';
            
            return {
                id: rObj._id,
                amount: rObj.rewardAmount,
                tradeAmount: rObj.tradeAmount,
                tier: rObj.tierAtTime,
                percentage: rObj.percentageApplied,
                date: rObj.createdAt,
                from: hideStr
            };
        });

        return NextResponse.json({
            rewards: mappedRewards,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching referral rewards:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
