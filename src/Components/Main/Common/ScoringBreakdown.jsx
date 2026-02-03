import React from 'react';

const ScoringBreakdown = ({ breakdown, officialResults, predictions, totalScore, scoringSystem }) => {
    if (!predictions) return null;

    const isScored = !!breakdown;

    // Helper to check if a rule is enabled (either present in breakdown or enabled in settings)
    const isRuleActive = (ruleKey, breakdownValue) => {
        // If we have a value (even 0), it's active
        if (breakdownValue !== undefined) return true;

        // If we have scoring settings, check them
        if (scoringSystem) {
            if (ruleKey === 'redFlags') return !!scoringSystem.redFlag?.enabled;
            if (ruleKey === 'safetyCar') return !!scoringSystem.safetyCar?.enabled;
            if (ruleKey === 'pitstops') return !!scoringSystem.pitstopScoring?.enabled;
            if (ruleKey === 'polePosition') return !!scoringSystem.polePosition;
        }
        return false;
    };

    const getStatusColor = (status) => {
        if (!status) return 'border-gray-700/50';
        const s = status.toLowerCase();
        if (s.includes('exact') || s.includes('bullseye')) return 'border-green-500/50 bg-green-500/10';
        if (s.includes('close') || s.includes('near')) return 'border-yellow-500/50 bg-yellow-500/10';
        if (s.includes('bonus')) return 'border-blue-500/50 bg-blue-500/10';
        return 'border-red-500/30 bg-red-500/5';
    };

    const getPointsBadge = (points) => {
        if (points === undefined) return null;
        return (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${points > 0 ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
                +{points}
            </span>
        );
    };

    // Helper to normalize driver names to short codes
    const normalizeDriverName = (driverName) => {
        if (!driverName) return '---';

        // If already a 3-letter code, return as-is
        if (driverName.length === 3 && driverName === driverName.toUpperCase()) {
            return driverName;
        }

        // Extract last name from full name (e.g., "LANDO NORRIS" -> "NOR")
        const parts = driverName.trim().split(' ');
        if (parts.length >= 2) {
            const lastName = parts[parts.length - 1];
            return lastName.substring(0, 3).toUpperCase();
        }

        // Fallback: first 3 chars
        return driverName.substring(0, 3).toUpperCase();
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {predictions.map((driver, idx) => {
                    const rowBreakdown = breakdown?.positions?.find(p => p.predictedPos === idx + 1);
                    const actualDriverCode = officialResults?.results?.find(r => r.position === idx + 1)?.driverId || officialResults?.results?.[idx]?.driverId;

                    // Normalize both predicted and actual driver names
                    const predictedDriverCode = normalizeDriverName(driver);
                    const actualDriverDisplay = actualDriverCode || '---';

                    return (
                        <div key={idx} className={`flex flex-col p-2 rounded border transition-all ${getStatusColor(rowBreakdown?.status)}`}>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] text-gray-500 font-mono uppercase">P{idx + 1}</span>
                                {isScored && getPointsBadge(rowBreakdown?.points)}
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-gray-400 uppercase tracking-tighter">Your Pick</span>
                                    <span className="font-bold text-white text-sm">{predictedDriverCode}</span>
                                </div>
                                {isScored && (
                                    <>
                                        <div className="text-gray-600">→</div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] text-gray-400 uppercase tracking-tighter">Actual Result</span>
                                            <span className="font-bold text-gray-300 text-sm">{actualDriverDisplay}</span>
                                        </div>
                                    </>
                                )}
                            </div>

                            {isScored && rowBreakdown?.status && (
                                <div className="mt-1 text-[9px] uppercase tracking-widest font-bold text-gray-500 italic">
                                    {rowBreakdown.status}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Bonus & Total Summary */}
            {isScored && (
                <div className="space-y-3 pt-2 border-t border-gray-700">
                    <div className="grid grid-cols-4 gap-2">
                        {isRuleActive('pitstops', breakdown.pitstops) && (
                            <div className="text-center p-2 bg-blue-500/10 rounded border border-blue-500/20">
                                <div className="text-[9px] text-blue-400 uppercase tracking-widest">Stops</div>
                                <div className="font-bold text-white">+{breakdown.pitstops || 0}</div>
                            </div>
                        )}
                        {isRuleActive('redFlags', breakdown.redFlags) && (
                            <div className="text-center p-2 bg-red-500/10 rounded border border-red-500/20">
                                <div className="text-[9px] text-red-500 uppercase tracking-widest">Red Flags</div>
                                <div className="font-bold text-white">+{breakdown.redFlags || 0}</div>
                            </div>
                        )}

                        {/* Safety Car (Boolean or Count) */}
                        {(isRuleActive('safetyCar', breakdown.safetyCar) || isRuleActive('safetyCar', breakdown.safetyCarCount)) && (
                            <div className="text-center p-2 bg-yellow-500/10 rounded border border-yellow-500/20">
                                <div className="text-[9px] text-yellow-500 uppercase tracking-widest">SC</div>
                                <div className="font-bold text-white">
                                    +{(breakdown.safetyCar || 0) + (breakdown.safetyCarCount || 0)}
                                </div>
                            </div>
                        )}

                        {/* Pole Position */}
                        {isRuleActive('polePosition', breakdown.polePosition) && (
                            <div className="text-center p-2 bg-purple-500/10 rounded border border-purple-500/20">
                                <div className="text-[9px] text-purple-400 uppercase tracking-widest">Pole</div>
                                <div className="font-bold text-white">+{breakdown.polePosition || 0}</div>
                            </div>
                        )}
                    </div>

                    {totalScore !== undefined && (
                        <div className="flex justify-between items-center bg-gradient-to-r from-red-600 to-red-800 p-3 rounded-lg shadow-lg">
                            <span className="font-black italic uppercase tracking-wider text-sm">Total Points</span>
                            <span className="text-2xl font-black">{totalScore}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ScoringBreakdown;
