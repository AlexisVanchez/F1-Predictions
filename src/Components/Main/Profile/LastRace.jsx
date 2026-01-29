import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Header from '../../Header/Header';

export default function LastRace() {
    const navigate = useNavigate();
    const { user, bet, leagues } = useSelector(state => state.user);
    const [lastRace, setLastRace] = useState(null);
    const [results, setResults] = useState([]);
    const [userPrediction, setUserPrediction] = useState(null);
    const [isDummyData, setIsDummyData] = useState(false);
    const [loading, setLoading] = useState(true);

    console.log("LastRace State:", lastRace);
    console.log("Results State:", results);

    useEffect(() => {
        const fetchLastRace = async () => {
            try {
                const now = new Date();
                let currentYear = now.getFullYear();

                // Helper: Fetch finished races for a given year
                const getFinishedRaces = async (year) => {
                    try {
                        const res = await fetch(`https://api.openf1.org/v1/sessions?session_name=Race&year=${year}`);
                        if (!res.ok) return [];
                        const data = await res.json();
                        // Filter for races that have strictly started before now
                        return data.filter(s => new Date(s.date_start) < now);
                    } catch (e) {
                        console.error(`Error fetching ${year} races:`, e);
                        return [];
                    }
                };

                // Get candidates from current and previous year
                const racesCurrent = await getFinishedRaces(currentYear);
                const racesPrev = await getFinishedRaces(currentYear - 1);

                // Combine and sort descending
                const allCandidates = [...racesCurrent, ...racesPrev].sort((a, b) => new Date(b.date_start) - new Date(a.date_start));

                if (allCandidates.length === 0) {
                    console.warn("No finished races found in API.");
                    setLoading(false);
                    return;
                }

                // Iterate candidates to find one with actual results
                let validRace = null;
                let validResults = [];
                let validDriverMap = {};

                for (const race of allCandidates) {
                    try {
                        // Parallel fetch for results and drivers
                        const [resResults, resDrivers] = await Promise.all([
                            fetch(`https://api.openf1.org/v1/session_result?session_key=${race.session_key}`),
                            fetch(`https://api.openf1.org/v1/drivers?session_key=${race.session_key}`)
                        ]);

                        if (resResults.ok && resDrivers.ok) {
                            const dataResults = await resResults.json();
                            const dataDrivers = await resDrivers.json();

                            if (dataResults && dataResults.length > 0) {
                                validRace = race;
                                validResults = dataResults;

                                // Build Driver Map (Number -> Full Name)
                                const map = {};
                                dataDrivers.forEach(d => {
                                    if (d.driver_number) map[d.driver_number] = d.full_name;
                                });
                                validDriverMap = map;

                                break; // Found one!
                            }
                        }
                    } catch (err) {
                        console.warn(`Failed fetch for ${race.session_name}`, err);
                    }
                    if (validRace) break;
                }

                if (!validRace) {
                    setLoading(false);
                    return; // Nothing found with results
                }

                // Set Valid Race Data
                setLastRace({
                    raceName: validRace.session_name,
                    date: new Date(validRace.date_start).toLocaleDateString(),
                    Circuit: {
                        circuitName: validRace.circuit_short_name,
                        Location: { locality: validRace.country_name }
                    },
                    session_key: validRace.session_key
                });

                // Process Results with Driver Names
                validResults.sort((a, b) => a.position - b.position);
                const top10 = validResults.slice(0, 10).map(r => {
                    // Use map to finding name, fallback to number if missing
                    return validDriverMap[r.driver_number] || `Driver #${r.driver_number}`;
                });

                // CRITICAL: Set results state
                console.log("Setting Results:", top10);
                setResults(top10);

                // Match User Prediction
                let matchingBet = null;
                if (bet && bet.length > 0) {
                    const raceNameLower = validRace.session_name.toLowerCase();
                    matchingBet = bet.find(b => {
                        const betNameLower = b.raceName.toLowerCase();
                        return raceNameLower.includes(betNameLower) || betNameLower.includes(raceNameLower);
                    });
                }

                if (matchingBet) {
                    setUserPrediction(matchingBet.predictions);
                    setIsDummyData(false);
                } else {
                    // Create Dummy based on actual results (which now has names!)
                    const dummy = [...top10];
                    if (dummy.length > 2) [dummy[0], dummy[1]] = [dummy[1], dummy[0]];
                    if (dummy.length > 5) [dummy[2], dummy[4]] = [dummy[4], dummy[2]];
                    if (dummy.length > 9) dummy[9] = "Pierre Gasly";

                    setUserPrediction(dummy);
                    setIsDummyData(true);
                }

                setLoading(false);

            } catch (err) {
                console.error("Error in fetchLastRace:", err);
                setLoading(false);
            }
        };

        fetchLastRace();
    }, [user, bet]);

    const calculatePoints = (prediction, actual, index) => {
        if (!prediction || !actual) return 0;
        const normalize = n => (n && typeof n === 'string') ? n.toLowerCase().trim() : "";
        const p = normalize(prediction);
        const a = normalize(actual);
        if (!p || !a) return 0;

        if (p === a) return 10;
        const allResultsLower = results.map(r => normalize(r));
        if (allResultsLower.includes(p)) return 1; // User changed scoring to 1
        return 0;
    };

    // Ensure predictions exist before reduce
    const totalScore = userPrediction ? userPrediction.reduce((acc, driver, idx) => {
        // Safe access to result
        const actual = results[idx] || "";
        return acc + calculatePoints(driver, actual, idx);
    }, 0) : 0;

    const leagueResults = leagues && leagues.length > 0
        ? leagues[0].members.map(m => ({
            displayName: m.displayName,
            score: m.uid === user?.uid ? totalScore : Math.floor(Math.random() * 40) + 10,
            uid: m.uid
        })).sort((a, b) => b.score - a.score)
        : [
            { displayName: "LewisH_Fan", score: Math.max(totalScore - 5, 20) },
            { displayName: user?.displayName || "You", score: totalScore, isUser: true },
            { displayName: "F1_Master", score: Math.min(totalScore + 10, 100) },
        ].sort((a, b) => b.score - a.score);


    if (loading) return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header />
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <h2 className="text-xl font-bold text-gray-400">Loading Race Data...</h2>
                </div>
            </div>
        </div>
    )

    if (!lastRace) return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header />
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-400">No race results found.</h2>
                    <p className="text-gray-500 mt-2">Checked recent races but found no published results.</p>
                    <button onClick={() => navigate('/home')} className="mt-4 text-red-600 hover:underline">Return Home</button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header />

            <div className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-8 mt-6">

                {/* Header Section */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-8 flex flex-col md:flex-row justify-between items-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-red-500 rounded-full opacity-5 -mr-16 -mt-16 pointer-events-none"></div>

                    <div className="relative z-10">
                        <div className="flex items-center space-x-3 mb-2">
                            <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">Finished</span>
                            <span className="text-gray-400 text-sm font-medium">{lastRace.date}</span>
                            {isDummyData && <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded">Visualizer Mode</span>}
                        </div>
                        <h1 className="text-4xl font-black text-gray-800 tracking-tight mb-1">{lastRace.raceName}</h1>
                        <p className="text-xl text-gray-500 font-medium flex items-center">
                            <span className="mr-2">🏁</span> {lastRace.Circuit?.circuitName}
                        </p>
                    </div>

                    <div className="relative z-10 mt-6 md:mt-0 flex flex-col items-end">
                        <div className="text-sm text-gray-400 uppercase tracking-widest font-bold mb-1">Your Score</div>
                        <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-500">
                            {totalScore} <span className="text-2xl text-gray-400">PTS</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* LEAGUE RESULTS */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                            <div className="p-4 bg-gray-50 border-b border-gray-100">
                                <h3 className="font-bold text-gray-700 flex items-center">
                                    <span className="text-xl mr-2">🏆</span> League Standings
                                </h3>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {leagueResults.map((member, idx) => (
                                    <div key={idx} className={`p-4 flex items-center justify-between ${member.uid === user?.uid || member.isUser ? 'bg-red-50' : ''}`}>
                                        <div className="flex items-center space-x-3">
                                            <span className={`font-mono font-bold w-6 ${idx < 3 ? 'text-yellow-500 text-lg' : 'text-gray-400'}`}>
                                                #{idx + 1}
                                            </span>
                                            <div>
                                                <div className={`font-bold ${member.uid === user?.uid || member.isUser ? 'text-red-700' : 'text-gray-700'}`}>
                                                    {member.displayName}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="font-bold text-gray-800">{member.score} pts</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* PREDICTIONS vs RESULTS */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                            {isDummyData && (
                                <div className="bg-blue-50 text-blue-700 px-4 py-2 text-xs text-center font-bold border-b border-blue-100">
                                    You haven't predicted this race. Visualizing dummy data for demonstration.
                                </div>
                            )}

                            <div className="grid grid-cols-2 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">
                                <div className="py-3">My Prediction</div>
                                <div className="py-3 border-l border-gray-200">Official Result</div>
                            </div>

                            {userPrediction && userPrediction.map((driver, index) => {
                                const actual = results[index] || "TBD";
                                const points = calculatePoints(driver, actual, index);
                                const isExact = points === 10;
                                const isPresent = points === 1; // Updated to 1 as per user edit

                                return (
                                    <div key={index} className="grid grid-cols-2 border-b border-gray-100 last:border-0 relative group hover:bg-gray-50 transition-colors">

                                        {/* My Prediction */}
                                        <div className={`p-3 flex items-center justify-between relative overflow-hidden ${isExact ? 'bg-green-50' : isPresent ? 'bg-yellow-50' : ''}`}>
                                            <div className="flex items-center space-x-3 z-10">
                                                <span className="text-gray-300 font-bold font-mono text-sm w-4">{index + 1}</span>
                                                <span className={`font-medium ${isExact ? 'text-green-800 font-bold' : isPresent ? 'text-yellow-800' : 'text-gray-500 line-through opacity-70'}`}>
                                                    {driver}
                                                </span>
                                            </div>

                                            {/* Score Badge */}
                                            <div className="z-10">
                                                {isExact && <span className="bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">+10</span>}
                                                {isPresent && <span className="bg-yellow-400 text-yellow-900 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">+1</span>}
                                                {!isExact && !isPresent && <span className="text-gray-300 text-[10px] font-bold">0</span>}
                                            </div>

                                            {/* Status Bar */}
                                            {isExact && <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500"></div>}
                                            {isPresent && <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-400"></div>}
                                        </div>

                                        {/* Official Result */}
                                        <div className="p-3 flex items-center border-l border-gray-100 bg-gray-50/30">
                                            <span className="font-bold text-gray-800">{actual}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
