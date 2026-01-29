import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchUserLeagues } from "../../../../redux/reducer";

export default function UserLeagues() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const user = useSelector(state => state.user.user);
    const leagues = useSelector(state => state.user.leagues || []);

    useEffect(() => {
        if (user) {
            dispatch(fetchUserLeagues(user.uid));
        }
    }, [dispatch, user]);

    if (!user) return null;

    const getLeagueInfo = (league) => {
        const myScore = league.standings?.[user.uid] || 0;
        const sortedScores = Object.entries(league.standings || {})
            .sort(([, scoreA], [, scoreB]) => scoreB - scoreA);
        const myRankIndex = sortedScores.findIndex(([uid]) => uid === user.uid);
        const myRank = myRankIndex !== -1 ? myRankIndex + 1 : "-";
        return { myScore, myRank, totalMembers: league.members?.length || 0 };
    };

    return (
        <div className="flex flex-col bg-black/30 backdrop-blur-sm p-6 border-b border-red-900/30 h-[45%]">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.25em] mb-6 flex items-center">
                <span className="w-1.5 h-4 bg-red-600 rounded-full mr-3 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>
                Active Leagues
            </h3>

            <div className="space-y-4 flex-1">
                {(!leagues || leagues.length === 0) ? (
                    <div className="flex flex-col items-center justify-center h-48 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">No Active Leagues</p>
                    </div>
                ) : (
                    leagues.map(league => {
                        const { myScore, myRank, totalMembers } = getLeagueInfo(league);
                        return (
                            <div
                                key={league.id}
                                onClick={() => navigate('/leagues', { state: { selectedLeagueId: league.id } })}
                                className="group p-4 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/[.08] hover:border-red-600/30 transition-all duration-300 cursor-pointer"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <h4 className="font-black text-white italic uppercase tracking-tighter group-hover:text-red-500 transition-colors">{league.name}</h4>
                                    <span className="text-[10px] font-black px-2 py-0.5 bg-red-600/10 text-red-500 rounded-md border border-red-600/20">
                                        {totalMembers}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-[#0b0c10] p-3 rounded-xl border border-white/5 text-center group-hover:bg-black transition-colors">
                                        <div className="text-[8px] text-gray-600 font-bold uppercase tracking-widest mb-1">Rank</div>
                                        <div className="font-black text-lg text-red-600 italic tracking-tighter">#{myRank}</div>
                                    </div>
                                    <div className="bg-[#0b0c10] p-3 rounded-xl border border-white/5 text-center group-hover:bg-black transition-colors">
                                        <div className="text-[8px] text-gray-600 font-bold uppercase tracking-widest mb-1">Points</div>
                                        <div className="font-black text-lg text-white italic tracking-tighter">{myScore}</div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

