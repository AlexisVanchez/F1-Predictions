import React from 'react';

// Country Code Mapping for GP Flags
const gpCountryCodes = {
    "Bahrain": "bh", "Saudi": "sa", "Arabia": "sa", "Australia": "au", "Australian": "au",
    "Azerbaijan": "az", "Miami": "us", "Monaco": "mc", "Spain": "es", "Spanish": "es",
    "Canada": "ca", "Canadian": "ca", "Austria": "at", "Austrian": "at",
    "Great Britain": "gb", "British": "gb", "UK": "gb", "Hungary": "hu", "Hungarian": "hu",
    "Belgium": "be", "Belgian": "be", "Netherlands": "nl", "Dutch": "nl",
    "Italy": "it", "Italian": "it", "Singapore": "sg", "Japan": "jp", "Japanese": "jp",
    "Qatar": "qa", "Mexico": "mx", "Mexican": "mx", "Brazil": "br", "Brazilian": "br",
    "Las Vegas": "us", "Vegas": "us", "Abu Dhabi": "ae", "UAE": "ae", "Emilia": "it",
    "China": "cn", "Chinese": "cn", "Portugal": "pt", "France": "fr", "French": "fr",
    "Turkey": "tr", "Russia": "ru", "Germany": "de", "German": "de", "United States": "us"
};

// Helper: Get country code from race name
const getCountryCode = (raceName) => {
    for (const [key, code] of Object.entries(gpCountryCodes)) {
        if (raceName.toLowerCase().includes(key.toLowerCase())) {
            return code;
        }
    }
    return 'xx'; // Default flag
};

export default function SeasonStandings({ members, predictions, leagueId }) {
    // Get all unique races that have been scored
    const scoredRaces = [...new Set(
        predictions
            .filter(p => p.leagueScores?.[leagueId])
            .map(p => p.raceName)
    )].sort();

    // Build standings data
    const standingsData = {};

    members?.forEach(member => {
        standingsData[member.uid] = {
            displayName: member.displayName,
            totalPoints: 0,
            races: {}
        };

        scoredRaces.forEach(raceName => {
            const prediction = predictions.find(
                p => p.uid === member.uid && p.raceName === raceName && p.leagueScores?.[leagueId]
            );

            if (prediction) {
                const points = prediction.leagueScores[leagueId].totalScore || 0;
                standingsData[member.uid].races[raceName] = points;
                standingsData[member.uid].totalPoints += points;
            } else {
                standingsData[member.uid].races[raceName] = null; // DNS
            }
        });
    });

    // Sort members by total points (descending)
    const sortedMembers = Object.entries(standingsData).sort(
        ([, a], [, b]) => b.totalPoints - a.totalPoints
    );

    // Helper: Get podium position for a race (1st, 2nd, 3rd based on points)
    // Handles ties: if multiple users have same points, they share the same position
    const getPodiumPosition = (raceName, memberUid) => {
        // Get all members' points for this race
        const racePoints = Object.entries(standingsData)
            .map(([uid, data]) => ({ uid, points: data.races[raceName] }))
            .filter(item => item.points !== null) // Exclude DNS
            .sort((a, b) => b.points - a.points); // Sort by points descending

        if (racePoints.length === 0) return null;

        // Find unique point values and assign positions
        const uniquePoints = [...new Set(racePoints.map(item => item.points))];

        // Get the points for this member
        const memberPoints = standingsData[memberUid].races[raceName];
        if (memberPoints === null) return null;

        // Find which unique point value this is (0-based index)
        const pointRank = uniquePoints.indexOf(memberPoints);

        // Return podium position
        if (pointRank === 0) return 'gold';   // 1st place (highest points)
        if (pointRank === 1) return 'silver'; // 2nd place
        if (pointRank === 2) return 'bronze'; // 3rd place
        return null;
    };

    // Helper: Get background for podium positions
    const getPodiumBg = (podium) => {
        if (podium === 'gold') return 'bg-gradient-to-br from-yellow-500/30 to-yellow-600/20 border border-yellow-500/40';
        if (podium === 'silver') return 'bg-gradient-to-br from-gray-400/30 to-gray-500/20 border border-gray-400/40';
        if (podium === 'bronze') return 'bg-gradient-to-br from-orange-600/30 to-orange-700/20 border border-orange-600/40';
        return ''; // Default for non-podium (transparent)
    };

    // Helper: Get text color
    const getTextColor = (points, podium) => {
        if (points === null) return 'text-gray-600';
        if (podium === 'gold') return 'text-yellow-300 font-black';
        if (podium === 'silver') return 'text-gray-300 font-black';
        if (podium === 'bronze') return 'text-orange-400 font-black';
        return 'text-gray-300 font-semibold';
    };

    // Helper: Get position styling for overall standings
    const getPositionStyle = (position) => {
        if (position === 0) return 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 border-l-4 border-yellow-500';
        if (position === 1) return 'bg-gradient-to-r from-gray-400/20 to-gray-500/10 border-l-4 border-gray-400';
        if (position === 2) return 'bg-gradient-to-r from-orange-600/20 to-orange-700/10 border-l-4 border-orange-600';
        return '';
    };

    if (scoredRaces.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500">
                <p className="text-lg">No races have been scored yet.</p>
                <p className="text-sm mt-2">Simulate some races to see season standings!</p>
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="flex items-center gap-3 mb-6">
                <h3 className="text-2xl font-black italic text-white uppercase tracking-tight">Season Standings</h3>
                <div className="h-px flex-grow bg-gradient-to-r from-red-600/50 via-gray-700 to-transparent"></div>
                <span className="text-xs text-gray-400 font-mono bg-white/5 px-3 py-1 rounded-full">{scoredRaces.length} Races</span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10 shadow-2xl">
                <table className="w-full text-sm border-collapse">
                    <thead className="bg-gradient-to-b from-black/60 to-black/40 sticky top-0 z-10">
                        <tr>
                            <th className="sticky left-0 z-20 bg-black/80 backdrop-blur-md px-6 py-4 text-left text-xs font-black text-gray-300 uppercase tracking-widest border-r border-white/10">
                                <div className="flex items-center gap-2">
                                    <span className="text-red-500">#</span>
                                    <span>Driver</span>
                                </div>
                            </th>
                            {scoredRaces.map((raceName, idx) => {
                                const countryCode = getCountryCode(raceName);
                                const shortName = raceName.split(' ')[0].substring(0, 3).toUpperCase();

                                return (
                                    <th
                                        key={idx}
                                        className="px-4 py-4 text-center border-l border-white/5 hover:bg-white/5 transition-colors group"
                                        title={raceName}
                                    >
                                        <div className="flex flex-col items-center gap-1.5">
                                            <img
                                                src={`https://flagcdn.com/w40/${countryCode}.png`}
                                                alt={raceName}
                                                className="w-6 h-4 rounded-sm object-cover shadow-md opacity-80 group-hover:opacity-100 transition-opacity"
                                                onError={(e) => e.target.style.display = 'none'}
                                            />
                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                                {shortName}
                                            </span>
                                        </div>
                                    </th>
                                );
                            })}
                            <th className="sticky right-0 z-20 bg-black/80 backdrop-blur-md px-6 py-4 text-center text-xs font-black text-red-500 uppercase tracking-widest border-l-2 border-red-600/30">
                                Total
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedMembers.map(([uid, data], position) => (
                            <tr
                                key={uid}
                                className={`border-b border-white/5 hover:bg-white/10 transition-all duration-200 ${getPositionStyle(position)}`}
                            >
                                {/* Driver Name (Sticky) */}
                                <td className="sticky left-0 z-10 bg-[#1a1a1a]/95 backdrop-blur-sm px-6 py-4 border-r border-white/10">
                                    <div className="flex items-center gap-3">
                                        <span className={`text-sm font-black font-mono w-8 ${position === 0 ? 'text-yellow-500' :
                                            position === 1 ? 'text-gray-400' :
                                                position === 2 ? 'text-orange-600' :
                                                    'text-gray-600'
                                            }`}>
                                            P{position + 1}
                                        </span>
                                        <span className="font-bold text-white truncate max-w-[150px]">
                                            {data.displayName}
                                        </span>
                                    </div>
                                </td>

                                {/* Race Results */}
                                {scoredRaces.map((raceName, idx) => {
                                    const points = data.races[raceName];
                                    const podium = points !== null ? getPodiumPosition(raceName, uid) : null;

                                    return (
                                        <td
                                            key={idx}
                                            className={`px-4 py-4 text-center font-mono text-sm border-l border-white/5 ${getTextColor(points, podium)} ${getPodiumBg(podium)} transition-all hover:scale-110`}
                                        >
                                            {points === null ? (
                                                <span className="text-gray-600 text-[10px] font-bold">—</span>
                                            ) : (
                                                <span className="font-bold">{points}</span>
                                            )}
                                        </td>
                                    );
                                })}

                                {/* Total Points (Sticky) */}
                                <td className="sticky right-0 z-10 bg-[#1a1a1a]/95 backdrop-blur-sm px-6 py-4 text-center border-l-2 border-red-600/30">
                                    <span className="font-black text-xl text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">
                                        {data.totalPoints}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Legend */}
            <div className="mt-6 flex flex-wrap gap-6 text-xs">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-gradient-to-br from-yellow-500/30 to-yellow-600/20 border border-yellow-500/40"></div>
                    <span className="text-gray-400 font-medium">1st Place (Gold)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-gradient-to-br from-gray-400/30 to-gray-500/20 border border-gray-400/40"></div>
                    <span className="text-gray-400 font-medium">2nd Place (Silver)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-gradient-to-br from-orange-600/30 to-orange-700/20 border border-orange-600/40"></div>
                    <span className="text-gray-400 font-medium">3rd Place (Bronze)</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-gray-600 font-bold text-sm">—</span>
                    <span className="text-gray-400 font-medium">DNS (Did Not Submit)</span>
                </div>
            </div>
        </div>
    );
}
