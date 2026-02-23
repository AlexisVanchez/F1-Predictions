// eslint-disable-next-line no-unused-vars
import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchBets, fetchSchedule, deletePrediction } from "../../../../redux/reducer";
import { NavLink } from "react-router-dom";
// eslint-disable-next-line no-unused-vars
import { calculateScore, DEFAULT_SCORING_RULES } from "../../../../utils/scoringUtils";

export default function PredictionsList() {
    const dispatch = useDispatch();
    const user = useSelector(state => state.user.user);
    const bets = useSelector(state => state.user.bet?.bet || []);
    const schedule = useSelector(state => state.user.schedule);

    const [topPredictions, setTopPredictions] = useState([]);
    const [loadingTop3, setLoadingTop3] = useState(false);

    useEffect(() => {
        if (user && (!bets || bets.length === 0)) {
            dispatch(fetchBets(user.uid));
        }
        if (schedule.length === 0) {
            dispatch(fetchSchedule());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch, user, bets.length, schedule.length]);

    // Calculate Top 3 Predictions
    useEffect(() => {
        const fetchAndCalculateScores = async () => {
            if (!bets || bets.length === 0 || schedule.length === 0) return;

            setLoadingTop3(true);
            const today = new Date();
            const pastBets = bets.filter(bet => {
                const event = schedule.find(s => s.raceName === bet.raceName);
                if (!event) return false;
                const raceDate = new Date(`${event.date}T${event.time || '14:00:00'}`);
                return raceDate < today;
            });

            if (pastBets.length === 0) {
                setLoadingTop3(false);
                return;
            }

            const scoredPredictions = await Promise.all(pastBets.map(async (bet) => {
                const year = new Date().getFullYear(); // Or get from bet/schedule if multiseason
                const event = schedule.find(s => s.raceName === bet.raceName);
                // We need race results. We'll fetch them individually for now.
                // In production, we should cache these or fetch in batch.

                try {
                    let raceData = null;

                    // 1. Try Cache
                    const CACHE_KEY = `f1_results_${year}_${event.round}`;
                    const cached = localStorage.getItem(CACHE_KEY);
                    if (cached) {
                        const parsed = JSON.parse(cached);
                        // Check expiry? For now assuming race results don't change much
                        raceData = parsed;
                    }

                    // 2. Try OpenF1
                    if (!raceData) {
                        // eslint-disable-next-line no-unused-vars
                        const sessionRes = await fetch(`https://api.openf1.org/v1/sessions?session_name=Race&year=${year}&meeting_name=${encodeURIComponent(event.raceName.replace(' Grand Prix', ''))}`); // Loose matching
                        // Better matching by round if possible, but OpenF1 round might differ.
                        // Let's use fetching logic similar to OverallResults but simplified

                        // Fallback simplier approach: Fetch all sessions for year, match by date/name
                        // For this prototype, I will fetch pure results from Ergast for reliability in matching Round Number which is consistent with Schedule
                        const ergastRes = await fetch(`https://api.jolpi.ca/ergast/f1/${year}/${event.round}/results.json`);
                        if (ergastRes.ok) {
                            const data = await ergastRes.json();
                            const results = data.MRData.RaceTable.Races[0]?.Results || [];
                            if (results.length > 0) {
                                raceData = {
                                    results: results.map(r => ({
                                        driverId: r.Driver.driverId,
                                        code: r.Driver.code,
                                        familyName: r.Driver.familyName,
                                        position: r.position
                                    })),
                                    safetyCar: false // Ergast doesn't give SC easily here
                                };
                                // Cache it
                                localStorage.setItem(CACHE_KEY, JSON.stringify(raceData));
                            }
                        }
                    }

                    if (raceData) {
                        const { totalScore, breakdown } = calculateScore(bet, raceData);
                        return {
                            ...bet,
                            score: totalScore,
                            breakdown,
                            event
                        };
                    }
                } catch (e) {
                    console.warn("Error calculating score for", bet.raceName, e);
                }
                return { ...bet, score: 0, event };
            }));

            // Sort by score desc, take top 3
            scoredPredictions.sort((a, b) => b.score - a.score);
            setTopPredictions(scoredPredictions.slice(0, 3));
            setLoadingTop3(false);
        };

        fetchAndCalculateScores();

    }, [bets, schedule]);


    const isUpcoming = (raceName) => {
        const event = schedule.find(s => s.raceName === raceName);
        if (!event) return false;
        const raceDate = new Date(`${event.date}T${event.time || '14:00:00'}`);
        return raceDate > new Date();
    }

    const nextRace = schedule.find(s => {
        const raceDate = new Date(`${s.date}T${s.time || '14:00:00'}`);
        return raceDate > new Date() && s.raceName.toLowerCase().includes("grand prix");
    });

    const hasNextPrediction = nextRace ? bets.some(b => b.raceName === nextRace.raceName) : false;
    const validBets = bets.filter(bet => schedule.some(s => s.raceName === bet.raceName));

    return (
        <div className="space-y-8">
            {/* 🏁 Next Grand Prix Target */}
            {nextRace && (
                <div className="relative overflow-hidden bg-gradient-to-r from-red-600 to-red-900 rounded-3xl p-6 shadow-2xl group border border-red-500/30">
                    <div className="absolute top-0 right-0 p-12 opacity-5 rotate-12 group-hover:rotate-45 transition-transform duration-1000">
                        <i className="fa fa-flag-checkered text-[180px]"></i>
                    </div>

                    <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
                        <div className="text-center lg:text-left">
                            <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[9px] font-black uppercase tracking-[0.2em] text-white mb-3 inline-block border border-white/20">
                                Target: Next Grand Prix
                            </span>
                            <h2 className="text-3xl md:text-4xl font-black text-white italic uppercase tracking-tighter mb-1 select-none">
                                {nextRace.raceName}
                            </h2>
                            <div className="text-red-100 font-bold text-xs uppercase tracking-widest flex items-center justify-center lg:justify-start gap-3">
                                <span className="flex items-center"><i className="fa fa-map-marker-alt mr-2 opacity-60"></i>{nextRace.Circuit.Location.locality}</span>
                                <span className="opacity-40">|</span>
                                <span className="flex items-center"><i className="fa fa-calendar mr-2 opacity-60"></i>{nextRace.date}</span>
                            </div>
                        </div>

                        {hasNextPrediction ? (
                            <div className="bg-white/10 backdrop-blur-xl border border-white/20 px-8 py-5 rounded-2xl flex items-center gap-4 shadow-inner">
                                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white shadow-[0_0_20px_rgba(34,197,94,0.4)] border-4 border-[#a31a00]/30 animate-pulse">
                                    <i className="fa fa-check text-xl"></i>
                                </div>
                                <div>
                                    <div className="text-white font-black text-sm italic uppercase tracking-tighter">Prediction Logged</div>
                                    <div className="text-red-200 text-[10px] font-bold uppercase tracking-widest opacity-80">Telemetry Synchronized</div>
                                </div>
                            </div>
                        ) : (
                            <NavLink
                                to="/my-predictions"
                                className="px-12 py-5 bg-white text-red-600 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-black/40 hover:shadow-red-600/20"
                            >
                                Place Forecast
                            </NavLink>
                        )}
                    </div>
                </div>
            )}

            {/* 📜 Podium Archive (Top 3) */}
            <div className="space-y-4">
                <div className="flex items-center space-x-4 mb-2 pl-2">
                    <h3 className="text-[10px] font-black text-red-600 uppercase tracking-[0.3em]">Top 3 Season Predictions</h3>
                    <div className="h-px flex-grow bg-white/5"></div>
                </div>

                {loadingTop3 && (
                    <div className="text-xs text-gray-500 font-bold p-4 text-center animate-pulse uppercase tracking-widest">
                        Crunching Telemetry...
                    </div>
                )}

                {!loadingTop3 && topPredictions.length === 0 && (
                    <div className="text-xs text-gray-600 font-bold p-4 text-center border border-dashed border-gray-800 rounded-xl uppercase tracking-widest">
                        No Race Results Yet
                    </div>
                )}

                {topPredictions.map((pred, i) => (
                    <DemoPredictionCard
                        key={i}
                        round={pred.event?.round}
                        race={pred.raceName}
                        date={pred.event?.date}
                        p1={pred.predictions[0]}
                        p2={pred.predictions[1]}
                        p3={pred.predictions[2]}
                        status={pred.score > 25 ? "Excellent" : pred.score > 10 ? "Points Scored" : "Missed"}
                        trend={`+${pred.score}`}
                    />
                ))}

                {/* Divider if we have predictions lists below (optional) */}
                {validBets.length > 0 && <div className="h-4"></div>}

                {/* Full Recent List (Title) */}
                {validBets.length > 0 && (
                    <div className="flex items-center space-x-4 mb-2 pl-2 mt-8">
                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Recent Pipeline</h3>
                        <div className="h-px flex-grow bg-white/5"></div>
                    </div>
                )}

                {validBets.length > 0 && validBets.slice().reverse().map((bet, index) => {
                    const event = schedule.find(s => s.raceName === bet.raceName);
                    const isLocked = !isUpcoming(bet.raceName);
                    return (
                        <div key={index} className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:bg-white/[0.07] hover:border-white/10 transition-all flex items-center justify-between group relative overflow-hidden">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 bg-[#08090d] rounded-xl flex flex-col items-center justify-center border border-white/5 shadow-inner group-hover:border-red-600/30 transition-colors">
                                    <span className="text-[8px] font-black text-gray-600 uppercase">RD</span>
                                    <span className="text-xl font-black italic text-red-600 mt-[-2px]">{event?.round || '?'}</span>
                                </div>
                                <div>
                                    <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-0.5">{event?.date}</div>
                                    <div className="text-white font-black uppercase text-sm tracking-tight italic group-hover:text-red-500 transition-colors">
                                        {bet.raceName.replace("Grand Prix", "")}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                {/* Mini Driver Tags (Top 3) */}
                                <div className="hidden sm:flex items-center gap-2">
                                    {bet.predictions?.slice(0, 3).map((driver, i) => (
                                        <div key={i} className="flex flex-col items-center">
                                            <div className="px-2 py-1 bg-white/5 rounded-md border border-white/5 text-[9px] font-black text-gray-400 uppercase">
                                                {driver?.substring(0, 3)}
                                            </div>
                                            <span className="text-[7px] font-black text-gray-600 mt-0.5 uppercase">P{i + 1}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Action Button */}
                                {!isLocked ? (
                                    <div className="flex gap-2">
                                        <NavLink to="/my-predictions" className="p-2 text-gray-500 hover:text-red-500 transition-colors bg-white/5 rounded-lg border border-white/5">
                                            <i className="fa fa-edit text-xs"></i>
                                        </NavLink>
                                        <button
                                            onClick={() => {
                                                if (window.confirm(`Scrap prediction for ${bet.raceName}?`)) {
                                                    dispatch(deletePrediction(user.uid, bet.raceName));
                                                }
                                            }}
                                            className="p-2 text-gray-500 hover:text-red-500 transition-colors bg-white/5 rounded-lg border border-white/5"
                                        >
                                            <i className="fa fa-trash text-xs"></i>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="px-3 py-1.5 bg-gray-900/50 rounded-lg border border-white/5 flex items-center gap-2">
                                        <i className="fa fa-lock text-[10px] text-gray-600"></i>
                                        <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Locked</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function DemoPredictionCard({ round, race, date, p1, p2, p3, status, trend }) {
    return (
        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 hover:bg-white/[0.07] hover:border-white/10 transition-all flex items-center justify-between group relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600/40 group-hover:bg-red-600 transition-colors"></div>

            <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-[#08090d] rounded-xl flex flex-col items-center justify-center border border-white/5 shadow-inner">
                    <span className="text-[8px] font-black text-gray-600 uppercase">RD</span>
                    <span className="text-xl font-black italic text-gray-500 mt-[-2px]">{round}</span>
                </div>
                <div>
                    <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-0.5">{date}</div>
                    <div className="text-white font-black uppercase text-sm tracking-tight italic">
                        {race.replace("Grand Prix", "")}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-8">
                {/* Podium View */}
                <div className="hidden md:flex items-center gap-4">
                    <PodiumSpot pos="1" driver={p1} color="yellow" />
                    <PodiumSpot pos="2" driver={p2} color="slate" />
                    <PodiumSpot pos="3" driver={p3} color="orange" />
                </div>

                <div className="flex flex-col items-end">
                    <div className="px-3 py-1 bg-white/5 rounded-lg border border-white/5 flex items-center gap-2 mb-1">
                        <span className={`text-[8px] font-black uppercase tracking-widest ${status === 'Perfect Hit' ? 'text-green-500' : 'text-gray-400'}`}>{status}</span>
                    </div>
                    <span className="text-[10px] font-black text-red-600 italic">{trend} PTS</span>
                </div>
            </div>
        </div>
    );
}

function PodiumSpot({ pos, driver, color }) {
    const colors = {
        yellow: 'text-yellow-500 border-yellow-500/20 bg-yellow-500/5',
        slate: 'text-slate-300 border-slate-300/20 bg-slate-300/5',
        orange: 'text-orange-500 border-orange-500/20 bg-orange-500/5'
    };
    return (
        <div className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-lg border ${colors[color]} flex items-center justify-center text-xs font-black italic shadow-xl group-hover:scale-110 transition-transform`}>
                {driver}
            </div>
            <span className="text-[7px] font-black text-gray-600 uppercase mt-1 tracking-widest">POS {pos}</span>
        </div>
    );
}
