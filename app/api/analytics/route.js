import dbConnect from '@/lib/dbConnect';
import Trade from '@/models/Trade';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period') || 'today';
        const userId = searchParams.get('userId');

        // Date filtering logic
        const now = new Date();
        let startDate = new Date();

        // Set start date based on period
        switch (period) {
            case 'today':
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'yesterday':
                startDate.setDate(now.getDate() - 1);
                startDate.setHours(0, 0, 0, 0);
                // Special case for yesterday: we need an end date too
                const endDate = new Date(now);
                endDate.setDate(now.getDate() - 1);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'week':
                startDate.setDate(now.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(now.getMonth() - 1);
                break;
            default:
                startDate.setHours(0, 0, 0, 0);
        }

        const query = {
            timestamp: { $gte: startDate },
            ...(userId && { userId })
        };

        // Handle 'yesterday' upper bound
        if (period === 'yesterday') {
            const yesterdayEnd = new Date(startDate);
            yesterdayEnd.setHours(23, 59, 59, 999);
            query.timestamp = { $gte: startDate, $lte: yesterdayEnd };
        }

        // Fetch trades
        const trades = await Trade.find(query).sort({ timestamp: 1 });

        // Calculate Statistics
        const totalTrades = trades.length;
        const profitableTrades = trades.filter(t => t.result === 'win').length;
        const losingTrades = trades.filter(t => t.result === 'loss').length;

        // Win Rate
        const winRate = totalTrades > 0
            ? ((profitableTrades / totalTrades) * 100).toFixed(1)
            : 0;

        // Financials
        const investments = trades.reduce((sum, t) => sum + (t.amount || 0), 0);
        const payouts = trades.reduce((sum, t) => sum + (t.payout || 0), 0); // Assuming model has payout, otherwise calculate

        // Calculate P/L manually if payout not stored, but we added payout to schema
        // Fallback if payout is missing in older records
        let totalProfit = 0;
        let maxProfit = 0;

        trades.forEach(t => {
            let profit = 0;
            if (t.result === 'win') {
                const payout = t.payout || (t.amount * 1.82); // Default 82% return
                profit = payout - t.amount;
            } else if (t.result === 'loss') {
                profit = -t.amount;
            }
            totalProfit += profit;
            if (profit > maxProfit) maxProfit = profit;
        });

        const averageProfit = totalTrades > 0 ? (totalProfit / totalTrades).toFixed(2) : 0;

        // Charts Data Preparation

        // 1. Profit Over Time (Cumulative)
        let cumulativeProfit = 0;
        const profitOverTime = trades.map(t => {
            let profit = 0;
            if (t.result === 'win') profit = (t.payout || t.amount * 1.82) - t.amount;
            else if (t.result === 'loss') profit = -t.amount;

            cumulativeProfit += profit;

            return {
                date: new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                fullDate: new Date(t.timestamp).toLocaleString(),
                profit: cumulativeProfit,
                dailyProfit: profit
            };
        });

        // 2. Win Rate Over Time (Sliding window or Cumulative)
        // Let's do cumulative win rate
        let wins = 0;
        let count = 0;
        const winRateOverTime = trades.map((t, index) => {
            count++;
            if (t.result === 'win') wins++;
            return {
                index: index + 1,
                rate: ((wins / count) * 100).toFixed(1)
            };
        });

        // 3. Distribution by Instrument
        const distributionMap = {};
        const plByInstrumentMap = {};

        trades.forEach(t => {
            const symbol = t.symbol || 'Unknown';

            // Count
            distributionMap[symbol] = (distributionMap[symbol] || 0) + 1;

            // P/L
            let profit = 0;
            if (t.result === 'win') profit = (t.payout || t.amount * 1.82) - t.amount;
            else if (t.result === 'loss') profit = -t.amount;

            plByInstrumentMap[symbol] = (plByInstrumentMap[symbol] || 0) + profit;
        });

        const distributionChart = Object.keys(distributionMap).map(key => ({
            name: key,
            value: distributionMap[key]
        }));

        const plByInstrumentChart = Object.keys(plByInstrumentMap).map(key => ({
            name: key,
            profit: plByInstrumentMap[key]
        })).sort((a, b) => b.profit - a.profit); // Sort by highest profit

        const response = {
            summary: {
                totalTrades,
                profitableTrades,
                losingTrades,
                winRate,
                totalProfit: totalProfit.toFixed(2),
                netTurnover: investments.toFixed(2),
                averageProfit,
                maxProfit: maxProfit.toFixed(2),
                trades // Optional: send raw trades if frontend needs more processing
            },
            charts: {
                profitOverTime, // Line Chart
                winRateOverTime, // Area/Line Chart
                distribution: distributionChart, // Pie Chart
                plByInstrument: plByInstrumentChart // Bar Chart
            }
        };

        return NextResponse.json(response);

    } catch (error) {
        console.error('Analytics API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
