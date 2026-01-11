const express = require('express');
const router = express.Router();
const Trade = require('../models/Trade'); // Adjust path as needed

// Analytics Endpoint
router.get('/', async (req, res) => {
    try {
        const { period = 'today', userId } = req.query;

        // Date filtering logic
        const now = new Date();
        let startDate = new Date();

        switch (period) {
            case 'today':
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'yesterday':
                startDate.setDate(now.getDate() - 1);
                startDate.setHours(0, 0, 0, 0);
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

        let totalProfit = 0;
        let maxProfit = 0;

        trades.forEach(t => {
            let profit = 0;
            if (t.result === 'win') {
                const payout = t.payout || (t.amount * 1.82);
                profit = payout - t.amount;
            } else if (t.result === 'loss') {
                profit = -t.amount;
            }
            totalProfit += profit;
            if (profit > maxProfit) maxProfit = profit;
        });

        const averageProfit = totalTrades > 0 ? (totalProfit / totalTrades).toFixed(2) : 0;

        // Charts Data Preparation

        // 1. Profit Over Time
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

        // 2. Win Rate Over Time
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
            distributionMap[symbol] = (distributionMap[symbol] || 0) + 1;

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
        })).sort((a, b) => b.profit - a.profit);

        res.json({
            summary: {
                totalTrades,
                profitableTrades,
                losingTrades,
                winRate,
                totalProfit: totalProfit.toFixed(2),
                netTurnover: investments.toFixed(2),
                averageProfit,
                maxProfit: maxProfit.toFixed(2),
                trades
            },
            charts: {
                profitOverTime,
                winRateOverTime,
                distribution: distributionChart,
                plByInstrument: plByInstrumentChart
            }
        });

    } catch (error) {
        console.error('Analytics API Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
