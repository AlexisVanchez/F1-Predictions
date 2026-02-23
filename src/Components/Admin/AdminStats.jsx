import React, { useEffect, useState } from "react";
import { fetchAdminStats } from "../../redux/reducer";

export default function AdminStats() {
    const [stats, setStats] = useState({
        totalUsers: 0,
        onlineUsers: 0,
        totalLeagues: 0,
        totalBets: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // eslint-disable-next-line no-unused-vars
        async function load() {
            setLoading(true);
            // eslint-disable-next-line no-unused-vars
            const res = await fetchAdminStats()(); // Call the thunk wrapper
            // Wait, fetchAdminStats is a thunk creator: () => async () => ...
            // But usually we dispatch it. However, I exported it as a raw async function wrapper or thunk?
            // In reducer.js: export const fetchAdminStats = () => async () => { ... }
            // If I want to use it directly without dispatch (since it doesn't dispatch anything), 
            // I should call it like fetchAdminStats()(). But cleaner is to use it as a utility or dispatch it.
            // Let's assume standard Redux usage: dispatch(fetchAdminStats()). 
            // But fetchAdminStats returns a value, so we need to await the dispatch result.
            // Redux Thunk returns the inner function's return value.

            // Correction: In reducer.js I defined it as a thunk: export const fetchAdminStats = () => async () => { ... }
            // So I need to execute the inner function.
            // Simplest way: const res = await fetchAdminStats()(); 
        }

        // Actually, let's fix the usage to be consistent with Redux norms.
        // It's a bit unusual to not dispatch, but since it reads from Firestore directly and returns data...
        // Let's just execute the logic.
        const run = async () => {
            const result = await fetchAdminStats()();
            if (result.success) {
                setStats(result);
            }
            setLoading(false);
        };
        run();
    }, []);

    if (loading) return <div className="p-8 text-center animate-pulse">Loading Mission Control Data...</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
                label="Online Users"
                value={stats.onlineUsers}
                icon="🟢"
                color="text-green-500"
                borderColor="border-green-500/30"
            />
            <StatCard
                label="Total Users"
                value={stats.totalUsers}
                icon="👥"
                color="text-blue-500"
                borderColor="border-blue-500/30"
            />
            <StatCard
                label="Active Leagues"
                value={stats.totalLeagues}
                icon="🏆"
                color="text-yellow-500"
                borderColor="border-yellow-500/30"
            />
            <StatCard
                label="Total Bets"
                value={stats.totalBets}
                icon="🎰"
                color="text-purple-500"
                borderColor="border-purple-500/30"
            />
        </div>
    );
}

function StatCard({ label, value, icon, color, borderColor }) {
    return (
        <div className={`bg-black/40 border ${borderColor} p-6 rounded-xl shadow-lg backdrop-blur-sm flex items-center justify-between group hover:bg-black/60 transition-all`}>
            <div>
                <div className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-1">{label}</div>
                <div className={`text-4xl font-black ${color}`}>{value}</div>
            </div>
            <div className="text-4xl opacity-50 group-hover:scale-110 transition-transform">{icon}</div>
        </div>
    );
}
