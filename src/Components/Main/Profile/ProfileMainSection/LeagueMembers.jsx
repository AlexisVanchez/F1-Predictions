import { useState } from "react";
import { useSelector } from "react-redux";

export default function LeagueMembers() {
    const leagues = useSelector(state => state.user.leagues || []);
    const [selectedLeagueIndex, setSelectedLeagueIndex] = useState(0);

    if (!leagues || leagues.length === 0) return null;

    const selectedLeague = leagues[selectedLeagueIndex];
    const members = selectedLeague?.members || [];

    return (
        <div className="flex flex-col bg-black/30 backdrop-blur-sm p-6 flex-grow">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.25em] mb-6 flex items-center justify-between">
                <div className="flex items-center">
                    <span className="w-1.5 h-4 bg-red-600 rounded-full mr-3 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>
                    Friends
                </div>
                {leagues.length > 1 && (
                    <select
                        className="bg-black/40 text-[10px] font-black border border-white/10 rounded-lg px-2 py-1 outline-none text-red-500 uppercase tracking-widest"
                        value={selectedLeagueIndex}
                        onChange={(e) => setSelectedLeagueIndex(Number(e.target.value))}
                    >
                        {leagues.map((l, idx) => (
                            <option key={l.id} value={idx}>{l.name}</option>
                        ))}
                    </select>
                )}
            </h3>

            <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                {members.map((member, idx) => {
                    const isOnline = member.lastSeen && (Date.now() - member.lastSeen) < 5 * 60 * 1000;
                    return (
                        <div key={member.uid || idx} className="flex items-center justify-between group p-3 rounded-2xl bg-white/[0.02] border border-white/[0.02] hover:bg-white/5 hover:border-white/5 transition-all">
                            <div className="flex items-center space-x-4">
                                <div className="relative group/avatar">
                                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-red-600/30 group-hover:border-red-500 transition-colors shadow-lg">
                                        <img
                                            src={member.photoURL || "https://files.catbox.moe/k900b9.jpeg"}
                                            alt={member.displayName}
                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                        />
                                    </div>
                                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#13141a] transition-shadow ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-gray-700'}`}></div>
                                </div>
                                <div>
                                    <h4 className="font-black text-white italic uppercase tracking-tighter text-sm leading-none group-hover:text-red-500 transition-colors mb-1">{member.displayName}</h4>
                                    <div className="text-[9px] text-gray-600 font-bold uppercase tracking-widest flex items-center">
                                        RANK <span className="text-red-600 ml-1">#{idx + 1}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
