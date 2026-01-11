"use client";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ProfitChart({ data }) {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                No profit data available
            </div>
        );
    }

    // Calculate gradient offsets for coloring based on positive/negative
    const gradientOffset = () => {
        const dataMax = Math.max(...data.map((i) => i.profit));
        const dataMin = Math.min(...data.map((i) => i.profit));

        if (dataMax <= 0) return 0;
        if (dataMin >= 0) return 1;

        return dataMax / (dataMax - dataMin);
    };

    const off = gradientOffset();

    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={data}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset={off} stopColor="#10B981" stopOpacity={0.3} />
                            <stop offset={off} stopColor="#F43F5E" stopOpacity={0.3} />
                        </linearGradient>
                        <linearGradient id="splitColorStroke" x1="0" y1="0" x2="0" y2="1">
                            <stop offset={off} stopColor="#10B981" stopOpacity={1} />
                            <stop offset={off} stopColor="#F43F5E" stopOpacity={1} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} opacity={0.2} />
                    <XAxis
                        dataKey="date"
                        stroke="#9CA3AF"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={30}
                    />
                    <YAxis
                        stroke="#9CA3AF"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `₹${value}`}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '0.5rem', color: '#F3F4F6' }}
                        itemStyle={{ color: '#E5E7EB' }}
                        formatter={(value) => [`₹${value.toFixed(2)}`, 'Profit']}
                        labelFormatter={(label, payload) => payload[0]?.payload.fullDate || label}
                    />
                    <Area
                        type="monotone"
                        dataKey="profit"
                        stroke="url(#splitColorStroke)"
                        fill="url(#splitColor)"
                        strokeWidth={2}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
