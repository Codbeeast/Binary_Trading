import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import ReferralConfig from '@/models/ReferralConfig';

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.role || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();
        
        let config = await ReferralConfig.findOne();
        if (!config) {
            config = { error: 'Not initialized' };
        }

        return NextResponse.json(config);
    } catch (error) {
        console.error('Error fetching admin config:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.role || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        
        await dbConnect();
        
        let config = await ReferralConfig.findOne();
        if (!config) {
            config = new ReferralConfig();
        }

        if (body.isEnabled !== undefined) config.isEnabled = body.isEnabled;
        if (body.minTradeAmountForReward !== undefined) config.minTradeAmountForReward = body.minTradeAmountForReward;
        if (body.tiers && Array.isArray(body.tiers)) {
            config.tiers = body.tiers;
        }
        
        config.lastUpdatedBy = session.user.id;
        config.updatedAt = new Date();
        
        await config.save();

        return NextResponse.json({ success: true, message: 'Settings saved', config });
    } catch (error) {
        console.error('Error updating admin config:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
