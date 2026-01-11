import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function StatCard({ title, value, subValue, trend, icon: Icon, color = 'blue' }) {
    const isPositive = trend === 'up';

    const colorClasses = {
        blue: 'from-blue-500/10 to-blue-500/5 text-blue-500 border-blue-500/20',
        green: 'from-emerald-500/10 to-emerald-500/5 text-emerald-500 border-emerald-500/20',
        red: 'from-rose-500/10 to-rose-500/5 text-rose-500 border-rose-500/20',
        yellow: 'from-yellow-500/10 to-yellow-500/5 text-yellow-500 border-yellow-500/20',
    };

    const bgClass = colorClasses[color] || colorClasses.blue;

    return (
        <div className={`relative overflow-hidden rounded-xl border bg-gradient-to-br ${bgClass} p-4 sm:p-6 transition-all duration-300 hover:shadow-lg hover:shadow-black/40`}>
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</span>
                    <span className="text-2xl font-bold text-gray-100">{value}</span>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 ${bgClass.split(' ')[2]}`}>
                    {Icon && <Icon className="h-5 w-5" />}
                </div>
            </div>

            {(subValue || trend) && (
                <div className="mt-4 flex items-center gap-2">
                    {trend && (
                        <span className={`flex items-center gap-0.5 text-xs font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            {/* Placeholder for percentage or logic */}
                        </span>
                    )}
                    <span className="text-xs text-gray-500">{subValue}</span>
                </div>
            )}
        </div>
    );
}
