import LeagueMembers from "./LeagueMembers";
import UserLeagues from "./UserLeagues";
import PredictionsList from "./PredictionsList";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAndSyncRaceResult } from "../../../../redux/reducer";
import {
    TRACK_GROUPS,
    ACH_PITSTOP_MASTER,
    ACH_CONSISTENCY,
    ACH_CHAMPION,
    ACH_POLE_KING,
    calculateGroupBest,
    calculatePitstopStreak,
    calculateConsistency,
    calculateChampion,
    calculatePoleKing,
    normalizeTrackName
} from "../../../../utils/achievementUtils";
import { calculateScore, DEFAULT_SCORING_RULES } from "../../../../utils/scoringUtils";

export default function ProfileMainSection() {
    const dispatch = useDispatch();
    const { user, bet, leagues } = useSelector(state => state.user); // Need user.uid, bets, and leagues
    const [achievements, setAchievements] = useState({});
    const [raceResults, setRaceResults] = useState({});
    const [persona, setPersona] = useState(null);
    const [trendData, setTrendData] = useState([]);
    const [stats, setStats] = useState({ accuracy: 0, perfectHits: 0, perfectHitsTrend: "0", accuracyTrend: "0", pointsTrend: "0" });

    // 1. Fetch Official Results for races user has predicted
    useEffect(() => {
        const loadResults = async () => {
            const userBets = bet?.bet || [];
            if (userBets.length === 0) return;

            const newResults = {};
            // Identify unique races from user bets
            const uniqueRaces = [...new Set(userBets.map(b => b.raceName))];

            for (const raceName of uniqueRaces) {
                // Skip if we already have it
                if (raceResults[raceName]) continue;

                const response = await dispatch(fetchAndSyncRaceResult(raceName));
                if (response.success && response.result) {
                    newResults[raceName] = { results: response.result, ...response };
                }
            }

            if (Object.keys(newResults).length > 0) {
                setRaceResults(prev => ({ ...prev, ...newResults }));
            }
        };

        loadResults();
    }, [bet, dispatch, raceResults]); // Added raceResults to dependency to avoid infinite loop if logic flaw, but check logic: we assume raceResults updates trigger re-eval. Actually better to depend on [bet].

    // 2. Calculate Achievements
    useEffect(() => {
        const userBets = bet?.bet || [];
        const computedAchievements = {};

        Object.keys(TRACK_GROUPS).forEach(key => {
            const best = calculateGroupBest(key, userBets, raceResults);
            if (best) {
                computedAchievements[key] = best;
            }
        });

        // Calculate Pitstop Streak
        const pitstopStreak = calculatePitstopStreak(userBets, raceResults);
        if (pitstopStreak) {
            computedAchievements['PITSTOP_MASTER'] = pitstopStreak;
        }

        // Calculate Consistency
        const consistency = calculateConsistency(userBets, raceResults);
        if (consistency) computedAchievements['CONSISTENCY'] = consistency;

        // Calculate Champion
        // uses leagues from Redux
        const champion = calculateChampion(leagues, user?.uid);
        if (champion) computedAchievements['CHAMPION'] = champion;

        // Calculate Pole King
        const poleKing = calculatePoleKing(userBets, raceResults);
        if (poleKing) computedAchievements['POLE_KING'] = poleKing;

        setAchievements(computedAchievements);

        // --- CALC 3. DYNAMIC PERSONA (Best Group) ---
        let bestGroupKey = null; // Default null to show 'Analyzing'
        let maxGroupScore = -1;

        Object.keys(TRACK_GROUPS).forEach(key => {
            // We already calced 'best' for this group above
            // If we want "Best Category", we usually mean "Highest Total Score" or "Highest Average".
            // computedAchievements[key] stores the *single best result*. 
            // Let's use the single best result score as a proxy for "Mastery" for now, or sum all points?
            // "Best category that user has the most successful predictions". 
            // Implementation: Group with the highest *Highest Score Result*? Or Highest *Average*?
            // "Best result" is simple. Let's use that.
            if (computedAchievements[key] && computedAchievements[key].score > maxGroupScore) {
                maxGroupScore = computedAchievements[key].score;
                bestGroupKey = key;
            }
        });
        setPersona(bestGroupKey ? TRACK_GROUPS[bestGroupKey] : null);

        // --- CALC 4. POINTS TREND (Last 5 Predictions) ---
        const sortedBetsForTrend = [...userBets].sort((a, b) => new Date(a.date) - new Date(b.date));
        const last5Bets = sortedBetsForTrend.slice(-5); // Get last 5
        const trend = last5Bets.map(bet => {
            const normalizedTrack = normalizeTrackName(bet.raceName);
            const result = raceResults[normalizedTrack] || raceResults[bet.raceName];
            if (result && result.results) { // Ensure result holds data
                const { totalScore } = calculateScore(bet, result, DEFAULT_SCORING_RULES);
                return { race: bet.raceName, score: totalScore };
            }
            return { race: bet.raceName, score: 0 }; // Pending or missing data
        });
        setTrendData(trend);

        // --- CALC 5. DASHBOARD ANALYTICS (Accuracy, Perfect Hits, etc.) ---
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
                // If we use drivers array, user predicted X drivers.
                // If bet.predictions is always 10, use 10.
                // Let's use actual length to be safe.
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

                // If this is the last race (most recent)
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
            accuracyTrend: "0%", // Diff hard to calc without storing previous
            pointsTrend: lastRacePoints > 0 ? `+${lastRacePoints}` : "0"
        });

    }, [bet, raceResults, leagues, user]);

    return (
        <div className="ProfileMainSection flex flex-col xl:flex-row w-full bg-[#0b0c10] min-h-screen text-gray-100">
            {/* Main Content Area (Center) */}
            <div className="flex-1 flex flex-col p-6 space-y-8">

                {/* 1. TOP ANALYTICS DASHBOARD (Real Data) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <AnalyticsCard label="Global Rank" value={`#${user?.globalRank || 0}`} trend="-" color="red" />
                    <AnalyticsCard label="Prediction Accuracy" value={`${stats.accuracy}%`} trend={stats.accuracyTrend} color="red" />
                    <AnalyticsCard label="Perfect Hits" value={stats.perfectHits} trend={stats.perfectHitsTrend} color="red" />
                    <AnalyticsCard label="Global Points" value={user?.globalPoints || 0} trend={stats.pointsTrend} color="red" />
                </div>

                {/* 2. ACHIEVEMENT MEDALS */}
                <div className="bg-white/5 rounded-3xl p-6 border border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 blur-3xl rounded-full"></div>
                    <h3 className="text-xs font-black text-red-500 uppercase tracking-[0.2em] mb-6 relative z-10">Achievement Showcase</h3>
                    <div className="flex flex-wrap gap-6 justify-around md:justify-start relative z-10">
                        {/* Dynamic Group Achievements */}
                        {/* Dynamic Group Achievements */}
                        {/* Dynamic Group Achievements */}
                        {Object.keys(TRACK_GROUPS).map(key => {
                            const group = TRACK_GROUPS[key];
                            const data = achievements[key];
                            return (
                                <Medal
                                    key={key}
                                    title={group.name}
                                    icon={group.icon}
                                    color={group.color}
                                    desc={data ? `${data.track} - ${data.score} pts` : group.description}
                                    isSpecial={key === 'POWER'}
                                    locked={!data}
                                />
                            );
                        })}

                        {/* Pitstop Achievement */}
                        <Medal
                            title={ACH_PITSTOP_MASTER.name}
                            icon={ACH_PITSTOP_MASTER.icon}
                            color={ACH_PITSTOP_MASTER.color}
                            desc={achievements['PITSTOP_MASTER'] ? `Streak: ${achievements['PITSTOP_MASTER'].score}` : ACH_PITSTOP_MASTER.description}
                            isSpecial
                            locked={!achievements['PITSTOP_MASTER']}
                        />

                        {/* Consistency Achievement */}
                        {achievements['CONSISTENCY'] && (
                            <Medal
                                title={ACH_CONSISTENCY.name}
                                icon={ACH_CONSISTENCY.icon}
                                color={ACH_CONSISTENCY.color}
                                desc={ACH_CONSISTENCY.description}
                                isSpecial
                            />
                        )}

                        {/* Champion Achievement */}
                        <Medal
                            title={ACH_CHAMPION.name}
                            icon={ACH_CHAMPION.icon}
                            color={ACH_CHAMPION.color}
                            desc={achievements['CHAMPION'] ? achievements['CHAMPION'].track : ACH_CHAMPION.description}
                            isSpecial
                            locked={!achievements['CHAMPION']}
                        />

                        {/* Pole King Achievement */}
                        <Medal
                            title={ACH_POLE_KING.name}
                            icon={ACH_POLE_KING.icon}
                            color={ACH_POLE_KING.color}
                            desc={achievements['POLE_KING'] ? achievements['POLE_KING'].score : ACH_POLE_KING.description}
                            isSpecial
                            locked={!achievements['POLE_KING']}
                        />

                        {/* Static / Other Achievements (keeping some for fullness) */}
                        <Medal title="Season Champ" icon="trophy" color="#ffae00" desc="Winner 2026 Season" isSpecial />
                    </div>
                </div>

                {/* 3. CENTER CONTENT SPLIT */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Predictions List (Left 2/3) */}
                    <div className="lg:col-span-2">
                        <PredictionsList />
                    </div>

                    {/* Skill Radar / Persona (Right 1/3) */}
                    <div className="space-y-8">
                        {/* DYNAMIC ORACLE PERSONA */}
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

                        {/* DYNAMIC POINTS TREND (SVG Graph) */}
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
                                        {/* Data Points */}
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

            {/* Right Sidebar (Friends & Leagues) */}
            <div className="h-fit min-h-screen w-full xl:w-[24rem] p-6 bg-[#08090d] border-l border-white/5 space-y-10">
                <style>{`
                    @keyframes draw { to { stroke-dashoffset: 0; } }
                `}</style>
                <div className="pt-6 space-y-12">
                    <UserLeagues />
                    <LeagueMembers />
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

function Medal({ title, icon, color, desc, isSpecial, locked }) {
    return (
        <div className={`flex flex-col items-center group relative ${locked ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-help'}`}>
            {isSpecial && !locked && (
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-yellow-500/10 blur-2xl rounded-full animate-pulse"></div>
            )}
            <div className={`
                w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border transition-all duration-500 relative z-10
                ${locked ? 'border-white/5' : (isSpecial ? 'border-yellow-500/50 shadow-[0_0_20px_rgba(255,174,0,0.2)]' : 'border-white/10 group-hover:border-red-600/50')}
                ${!locked && 'group-hover:scale-110'}
            `}>
                <i className={`fa fa-${icon} ${isSpecial ? 'text-2xl' : 'text-xl'}`} style={{ color: locked ? '#666' : color }}></i>
                {isSpecial && !locked && <div className="absolute inset-0 border-2 border-yellow-500/20 rounded-full animate-spin-slow"></div>}
            </div>
            <span className={`text-[10px] font-black uppercase mt-3 tracking-tighter transition-colors ${locked ? 'text-gray-600' : (isSpecial ? 'text-yellow-500' : 'text-white')}`}>{title}</span>
            <span className={`text-[8px] font-bold text-gray-600 uppercase mt-0.5 ${locked ? '' : 'opacity-0 group-hover:opacity-100'} transition-opacity text-center w-24`}>{desc}</span>
        </div>
    );
}
