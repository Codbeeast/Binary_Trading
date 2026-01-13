import { useSession } from "next-auth/react";
import UserMenu from "@/components/UserMenu";

export default function DashboardHeader({ period, setPeriod, refresh }) {
    const { data: session } = useSession();
    const periods = [
        { id: 'today', label: 'Today' },
        { id: 'yesterday', label: 'Yesterday' },
        { id: 'week', label: 'This Week' },
        { id: 'month', label: 'This Month' },
    ];

    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
                <h1 className="text-2xl ml-12 sm:ml-0 font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                    Trading Analytics
                </h1>
                <p className="text-sm text-gray-400 mt-1">
                    Performance overview and trading insights
                </p>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-[#1C1F26] p-1 rounded-lg border border-[#262932]">
                    {periods.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => setPeriod(p.id)}
                            className={`
                  px-3 py-1.5 text-xs font-semibold rounded-md transition-all
                  ${period === p.id
                                    ? 'bg-[#2E323E] text-white shadow-sm'
                                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}
                `}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>

                {/* User Menu */}
                <UserMenu user={session?.user} />
            </div>
        </div>
    );
}
