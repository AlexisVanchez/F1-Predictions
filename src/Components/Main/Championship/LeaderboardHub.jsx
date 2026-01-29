import React, { useState, useEffect } from 'react';
import Header from '../../Header/Header';
import OverallResults from './Results/OverallResults/OverallResults';
import Standings from './Standings/Standings';

export default function LeaderboardHub({ year: propYear }) {
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(propYear || currentYear);
    const years = [2026, 2025, 2024, 2023, 2022];

    // Update selectedYear when propYear changes (for route-based year)
    useEffect(() => {
        if (propYear) {
            setSelectedYear(propYear);
        }
    }, [propYear]);

    return (
        <div className="min-h-screen bg-app-bg text-white">
            <Header />

            <div className="w-full flex flex-col items-center">
                {/* Hero / Title Section */}
                <div className="w-full max-w-7xl px-4 py-8 flex flex-col md:flex-row justify-between items-center gap-6">
                    <h1 className="text-4xl md:text-5xl font-bold uppercase italic tacking-tighter text-center md:text-left">
                        Leaderboard {selectedYear}
                    </h1>

                    {/* Season Selector */}
                    <div className="flex bg-gray-900/60 p-1 rounded-xl items-center backdrop-blur-md border border-white/10 overflow-x-auto max-w-full">
                        {years.map(year => (
                            <button
                                key={year}
                                onClick={() => setSelectedYear(year)}
                                className={`
                                    px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all duration-300
                                    ${selectedYear === year
                                        ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'}
                                `}
                            >
                                {year}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="w-full max-w-7xl px-4 flex flex-col gap-12 pb-20">

                    {/* Standings Section (Drivers & Constructors Side-by-Side) */}
                    <div className="animate-fadeIn">
                        <Standings year={selectedYear} />
                    </div>

                    {/* GP Results Section (Scrollable List) at Bottom */}
                    <div className="animate-fadeIn w-full max-w-5xl mx-auto">
                        <div className="bg-gray-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl">
                            <h2 className="text-3xl font-bold mb-6 uppercase tracking-wider text-center bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                                Grand Prix Results {selectedYear}
                            </h2>
                            {/* Full height container */}
                            <div className="rounded-lg">
                                <OverallResults year={selectedYear} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
