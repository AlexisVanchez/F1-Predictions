import LeagueMembers from "./LeagueMembers";
import UserLeagues from "./UserLeagues";
import PredictionsList from "./PredictionsList";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import useAchievements from "../../../../hooks/useAchievements";
import Medal from "../Medal";
import {
    TRACK_GROUPS,
    ACH_PITSTOP_MASTER,
    ACH_CONSISTENCY,
    ACH_CHAMPION,
    ACH_POLE_KING,
    ACH_MONACO,
    CONSTRUCTOR_MEDALS,
    normalizeTrackName
} from "../../../../utils/achievementUtils";
import { calculateScore, DEFAULT_SCORING_RULES } from "../../../../utils/scoringUtils";

export default function ProfileMainSection() {
    const { user, bet, leagues } = useSelector(state => state.user);
    const { achievements, raceResults, loading } = useAchievements();
    const [persona, setPersona] = useState(null);
    const [trendData, setTrendData] = useState([]);
    const [stats, setStats] = useState({ accuracy: 0, perfectHits: 0, perfectHitsTrend: "0", accuracyTrend: "0", pointsTrend: "0" });

    // 2. Dashbard Analytics & Persona (Calculated from Achievements & Results)
    useEffect(() => {
        if (loading) return;

        const userBets = bet?.bet || [];

        // --- CALC 1. DYNAMIC PERSONA (Best Group) ---
        let bestGroupKey = null;
        let maxGroupScore = -1;

        Object.keys(TRACK_GROUPS).forEach(key => {
            if (achievements[key] && achievements[key].score > maxGroupScore) {
                maxGroupScore = achievements[key].score;
                bestGroupKey = key;
            }
        });
        setPersona(bestGroupKey ? TRACK_GROUPS[bestGroupKey] : null);

        // --- CALC 2. POINTS TREND (Last 5 Predictions) ---
        const sortedBetsForTrend = [...userBets].sort((a, b) => new Date(a.date) - new Date(b.date));
        const last5Bets = sortedBetsForTrend.slice(-5);
        const trend = last5Bets.map(bet => {
            const normalizedTrack = normalizeTrackName(bet.raceName);
            const result = raceResults[normalizedTrack] || raceResults[bet.raceName];
            if (result && result.results) {
                const { totalScore } = calculateScore(bet, result, DEFAULT_SCORING_RULES);
                return { race: bet.raceName, score: totalScore };
            }
            return { race: bet.raceName, score: 0 };
        });
        setTrendData(trend);

        // --- CALC 3. DASHBOARD ANALYTICS ---
        let totalDriversPredicted = 0;
        let totalHits = 0;
        let exactHits = 0;
        let lastRaceExactHits = 0;
        let lastRacePoints = 0;

        sortedBetsForTrend.forEach((bet, index) => {
            const normalizedTrack = normalizeTrackName(bet.raceName);
            const result = raceResults[normalizedTrack] || raceResults[bet.raceName];
            if (result && result.results) {
                const { totalScore, breakdown } = calculateScore(bet, result, DEFAULT_SCORING_RULES);
                const betDrivers = bet.predictions || [];
                totalDriversPredicted += betDrivers.length;

                let currentBetExactHits = 0;
                breakdown.positions.forEach(p => {
                    if (p.status === "Exact Match") {
                        totalHits++;
                        exactHits++;
                        currentBetExactHits++;
                    } else if (p.status === "Top 10 Bonus") {
                        totalHits++;
                    }
                });

                if (index === sortedBetsForTrend.length - 1) {
                    lastRaceExactHits = currentBetExactHits;
                    lastRacePoints = totalScore;
                }
            }
        });

        const accuracy = totalDriversPredicted > 0 ? ((totalHits / totalDriversPredicted) * 100).toFixed(1) : 0;

        setStats({
            accuracy: accuracy,
            perfectHits: exactHits,
            perfectHitsTrend: lastRaceExactHits > 0 ? `+${lastRaceExactHits}` : "0",
            accuracyTrend: "0%",
            pointsTrend: lastRacePoints > 0 ? `+${lastRacePoints}` : "0"
        });

    }, [bet, raceResults, achievements, loading, user]);

    return (
        <div className="ProfileMainSection w-full bg-[#0b0c10] min-h-screen text-gray-100">
            <div className="flex-1 flex flex-col p-6 space-y-8">

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <AnalyticsCard label="Global Rank" value={user?.globalRank ? `#${user.globalRank}` : "-"} trend="-" color="red" />
                    <AnalyticsCard label="Prediction Accuracy" value={`${stats.accuracy}%`} trend={stats.accuracyTrend} color="red" />
                    <AnalyticsCard label="Perfect Hits" value={stats.perfectHits} trend={stats.perfectHitsTrend} color="red" />
                    <AnalyticsCard label="Global Points" value={user?.globalPoints || 0} trend={stats.pointsTrend} color="red" />
                </div>

                {/* 2. ACHIEVEMENT MEDALS (ONLY EARNED) */}
                <div className="bg-white/5 rounded-3xl p-6 border border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 blur-3xl rounded-full"></div>
                    <h3 className="text-xs font-black text-red-500 uppercase tracking-[0.2em] mb-6 relative z-10">Earned Achievements</h3>
                    <div className="flex flex-wrap gap-6 justify-around md:justify-start relative z-10">
                        {/* Best Track Achievement - Only show the single best one */}
                        {(() => {
                            const trackKeys = Object.keys(TRACK_GROUPS);
                            const earnedTracks = trackKeys
                                .map(key => ({
                                    key,
                                    data: achievements[key],
                                    score: achievements[key]?.score || 0
                                }))
                                .filter(item => item.data);

                            // Find and show only the best one
                            if (earnedTracks.length > 0) {
                                earnedTracks.sort((a, b) => b.score - a.score);
                                const best = earnedTracks[0];
                                const group = TRACK_GROUPS[best.key];

                                return (
                                    <Medal
                                        key={best.key}
                                        title={group.name}
                                        icon={group.icon}
                                        color={group.color}
                                        desc={`${best.data.track} - ${best.data.score} pts`}
                                        isSpecial={true}
                                    />
                                );
                            }
                            return null;
                        })()}

                        {achievements['PITSTOP_MASTER'] && (
                            <Medal
                                title={ACH_PITSTOP_MASTER.name}
                                icon={ACH_PITSTOP_MASTER.icon}
                                color={ACH_PITSTOP_MASTER.color}
                                desc={`Streak: ${achievements['PITSTOP_MASTER'].score}`}
                                isSpecial
                            />
                        )}

                        {achievements['CONSISTENCY'] && (
                            <Medal
                                title={ACH_CONSISTENCY.name}
                                icon={ACH_CONSISTENCY.icon}
                                color={ACH_CONSISTENCY.color}
                                desc={ACH_CONSISTENCY.description}
                                isSpecial
                            />
                        )}

                        {achievements['CHAMPION'] && achievements['CHAMPION'].map(win => (
                            <Medal
                                key={`champ_${win.year}`}
                                title={`Champion of the ${win.year}`}
                                icon={ACH_CHAMPION.icon}
                                color={ACH_CHAMPION.color}
                                desc={win.track}
                                isSpecial
                            />
                        ))}

                        {achievements['POLE_KING'] && (
                            <Medal
                                title={ACH_POLE_KING.name}
                                icon={ACH_POLE_KING.icon}
                                color={ACH_POLE_KING.color}
                                desc={achievements['POLE_KING'].score}
                                isSpecial
                            />
                        )}

                        {achievements['MONACO'] && (
                            <Medal
                                title={ACH_MONACO.name}
                                icon={ACH_MONACO.icon}
                                color={ACH_MONACO.color}
                                desc={`${achievements['MONACO'].track} - Hit`}
                                isSpecial
                            />
                        )}

                        {achievements['CONSTRUCTOR'] && (
                            <Medal
                                title={achievements['CONSTRUCTOR'].medalDef.name}
                                icon={achievements['CONSTRUCTOR'].medalDef.icon}
                                color={achievements['CONSTRUCTOR'].medalDef.color}
                                desc={`${achievements['CONSTRUCTOR'].team}: ${achievements['CONSTRUCTOR'].points} pts`}
                                isSpecial
                            />
                        )}

                        {/* If no achievements earned yet */}
                        {Object.keys(achievements).length === 0 && !loading && (
                            <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest py-4">
                                No achievements earned yet. Start predicting now!
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <PredictionsList />
                    </div>

                    <div className="space-y-8">
                        <div className={`bg-gradient-to-br from-${persona ? 'gray-800' : 'red-600/20'} to-black rounded-3xl p-6 border border-red-500/20`}>
                            <h3 className="text-xs font-black text-red-500 uppercase tracking-widest mb-4">Persona</h3>
                            <div className="aspect-square flex items-center justify-center relative">
                                <div className="absolute inset-0 border-2 border-white/5 rounded-full animate-ping opacity-20"></div>
                                <div className="text-center">
                                    <div className="text-4xl font-black italic text-white mb-1">{persona ? persona.name.toUpperCase() : "ANALYZING..."}</div>
                                    <div className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Mastery Level: {persona ? "HIGH" : "CALCULATING"}</div>
                                </div>
                            </div>
                            <p className="text-[10px] text-gray-500 font-bold uppercase text-center mt-4">
                                {persona ? persona.description : "Predict more races to unlock persona."}
                            </p>
                        </div>

                        <div className="bg-white/5 rounded-3xl p-6 border border-white/5 relative overflow-hidden">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Points Trend</h3>
                            <div className="h-24 w-full relative">
                                {trendData.length > 0 ? (
                                    <svg viewBox="0 0 100 40" className="w-full h-full drop-shadow-[0_0_8px_rgba(225,6,0,0.4)]">
                                        <path
                                            d={`M ${trendData.map((d, i) => `${10 + i * 20},${40 - (d.score * 0.8)}`).join(' L ')}`}
                                            fill="none"
                                            stroke="#e10600"
                                            strokeWidth="2.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className="animate-[draw_2s_ease-out_forwards]"
                                            style={{ strokeDasharray: 200, strokeDashoffset: 0 }}
                                        />
                                        {trendData.map((d, i) => (
                                            <circle
                                                key={i}
                                                cx={10 + i * 20}
                                                cy={40 - (d.score * 0.8)}
                                                r="1.5"
                                                fill="white"
                                                className="animate-pulse"
                                            >
                                                <title>{d.race}: {d.score} pts</title>
                                            </circle>
                                        ))}
                                    </svg>
                                ) : (
                                    <div className="text-center text-xs text-gray-500 mt-8">Not enough data</div>
                                )}
                            </div>
                            <div className="flex justify-between mt-4 text-[8px] font-black text-gray-600 uppercase tracking-widest">
                                {trendData.map((d, i) => (
                                    <span key={i}>{d.race.substring(0, 3).toUpperCase()}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function AnalyticsCard({ label, value, trend, color }) {
    return (
        <div className="bg-white/5 rounded-2xl p-5 border border-white/5 hover:border-red-600/20 transition-all flex flex-col justify-between group">
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4 group-hover:text-red-500 transition-colors">{label}</span>
            <div className="flex items-end justify-between">
                <span className="text-2xl font-black text-white italic tracking-tighter">{value}</span>
                <span className={`text-[10px] font-bold ${trend.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>{trend}</span>
            </div>
        </div>
    );
}
