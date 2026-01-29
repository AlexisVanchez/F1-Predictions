import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTeamColor } from '../../../../utils/TeamColors';

export default function Standings(props) {
    const [drivers, setDrivers] = useState([]);
    const [constructors, setConstructors] = useState([]);
    const [loading, setLoading] = useState(true);

    const year = props.year || new Date().getFullYear();

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // Fetch Drivers
                const dRes = await fetch(`https://api.jolpi.ca/ergast/f1/${year}/driverStandings.json`);
                const dData = await dRes.json();
                setDrivers(dData.MRData.StandingsTable.StandingsLists[0]?.DriverStandings || []);

                // Fetch Constructors
                const cRes = await fetch(`https://api.jolpi.ca/ergast/f1/${year}/constructorStandings.json`);
                const cData = await cRes.json();
                setConstructors(cData.MRData.StandingsTable.StandingsLists[0]?.ConstructorStandings || []);

                setLoading(false);
            } catch (error) {
                console.error("Error fetching standings:", error);
                setLoading(false);
            }
        };
        fetchData();
    }, [year]);

    if (loading) return <div className="text-center p-10"><div className="f1-loader"></div></div>;

    return (
        <div className="flex flex-col md:flex-row md:justify-around gap-10 w-full max-w-7xl mx-auto p-4">

            {/* Drivers Standings */}
            <section className="w-full md:w-[45%] bg-gray-900/40 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-2xl">
                <h2 className="text-2xl font-bold mb-6 uppercase tracking-wider text-center bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">Driver Standings</h2>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-gray-400 border-b border-gray-700/50 text-xs font-bold uppercase tracking-widest">
                                <th className="p-3">Pos</th>
                                <th className="p-3">Driver</th>
                                <th className="p-3 hidden md:table-cell">Team</th>
                                <th className="p-3 text-right">Pts</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {drivers.map((d) => {
                                const teamName = d.Constructors[0]?.name;
                                const color = getTeamColor(teamName);
                                return (
                                    <tr key={d.Driver.driverId} className="hover:bg-white/5 transition-colors group relative">
                                        <td className="p-4 font-mono font-bold text-gray-400">{d.position}</td>
                                        <td className="p-4 flex items-center gap-4">
                                            {/* Vertical Color Strip */}
                                            <div className="w-1.5 h-10 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}40` }}></div>
                                            <div className="flex flex-col">
                                                <Link
                                                    to={`/driver/${d.Driver.driverId}`}
                                                    state={{ year }}
                                                    className="font-bold text-lg leading-tight hover:text-red-500 transition-colors"
                                                >
                                                    {d.Driver.givenName} {d.Driver.familyName}
                                                </Link>
                                                <span className="text-xs text-gray-500 md:hidden uppercase tracking-wider mt-0.5">{teamName}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 hidden md:table-cell text-gray-400 text-sm font-medium">{teamName}</td>
                                        <td className="p-4 text-right font-bold text-xl text-white">{d.points}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Constructors Standings */}
            <section className="w-full md:w-[45%] bg-gray-900/40 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-2xl">
                <h2 className="text-2xl font-bold mb-6 uppercase tracking-wider text-center bg-gradient-to-r from-red-500 to-pink-600 bg-clip-text text-transparent">Constructor Standings</h2>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-gray-400 border-b border-gray-700/50 text-xs font-bold uppercase tracking-widest">
                                <th className="p-3">Pos</th>
                                <th className="p-3">Team</th>
                                <th className="p-3 text-right">Pts</th>
                                <th className="p-3 text-right hidden md:table-cell">Wins</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {constructors.map((c) => {
                                const color = getTeamColor(c.Constructor.name);
                                return (
                                    <tr key={c.Constructor.constructorId}
                                        className="hover:bg-white/5 transition-colors"
                                    >
                                        <td className="p-4 font-mono font-bold text-gray-400">{c.position}</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                {/* Team Color Dot/Box */}
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}></div>
                                                <span className="font-bold text-lg">{c.Constructor.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right font-bold text-xl text-white">{c.points}</td>
                                        <td className="p-4 text-right hidden md:table-cell text-gray-500 font-mono">{c.wins}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>

        </div>
    );
}
