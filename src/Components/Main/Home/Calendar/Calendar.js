import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchSchedule } from "../../../../redux/reducer";

export default function Calendar() {
    const dispatch = useDispatch();
    const schedule = useSelector(state => state.user.schedule);
    const scheduleStatus = useSelector(state => state.user.scheduleStatus);

    useEffect(() => {
        if (scheduleStatus === 'idle') {
            dispatch(fetchSchedule());
        }
    }, [dispatch, scheduleStatus]);

    function convertToLocalTime(time, dateStr) {
        if (!time || !dateStr) return "TBA";
        const date = new Date(`${dateStr}T${time}Z`); // Assume UTC from API
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    const isPast = (dateStr) => {
        const raceDate = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return raceDate < today;
    };

    if (scheduleStatus === 'loading') return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-48 bg-white/5 rounded-3xl border border-white/5"></div>
            ))}
        </div>
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {schedule
                .filter(event => event.raceName.toLowerCase().includes("grand prix"))
                .map((event) => {
                    const past = isPast(event.date);
                    return (
                        <div
                            key={event.round}
                            className={`group relative overflow-hidden rounded-3xl border transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl ${past
                                    ? 'bg-gray-900/40 border-white/5 grayscale-[0.5] opacity-60'
                                    : 'bg-gradient-to-br from-gray-900 to-black border-white/10 hover:border-red-600/50'
                                }`}
                        >
                            {/* Round Badge */}
                            <div className={`absolute top-0 right-0 px-4 py-2 rounded-bl-2xl text-[10px] font-black uppercase tracking-widest z-10 ${past ? 'bg-gray-800 text-gray-500' : 'bg-red-600 text-white shadow-lg'
                                }`}>
                                RD {event.round}
                            </div>

                            <div className="p-6">
                                {/* Country & Date Header */}
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex flex-col">
                                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${past ? 'text-gray-600' : 'text-red-500'}`}>
                                            {event.Circuit.Location.country}
                                        </span>
                                        <span className="text-white font-bold text-lg leading-tight group-hover:text-red-500 transition-colors">
                                            {event.raceName.replace("Grand Prix", "").trim()}
                                        </span>
                                    </div>
                                </div>

                                {/* Details Grid */}
                                <div className="grid grid-cols-2 gap-3 mt-6">
                                    <div className="flex flex-col p-3 bg-white/5 rounded-2xl border border-white/5">
                                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider mb-1">Date</span>
                                        <span className="text-xs font-bold text-gray-200">{event.date}</span>
                                    </div>
                                    <div className="flex flex-col p-3 bg-white/5 rounded-2xl border border-white/5">
                                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider mb-1">Time</span>
                                        <span className="text-xs font-bold text-gray-200">{convertToLocalTime(event.time, event.date)}</span>
                                    </div>
                                </div>

                                {/* Circuit Info */}
                                <div className="mt-4 flex items-center text-[10px] text-gray-500 font-bold uppercase tracking-widest pl-1">
                                    <svg className="w-3.5 h-3.5 mr-2 text-red-600/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    </svg>
                                    {event.Circuit.Location.locality}
                                </div>
                            </div>

                            {/* Hover Status Overlay */}
                            <div className={`absolute bottom-0 left-0 w-full h-1 transition-all duration-500 ${past ? 'bg-gray-800' : 'bg-red-600 opacity-0 group-hover:opacity-100 shadow-[0_0_15px_rgba(239,68,68,0.8)]'
                                }`}></div>
                        </div>
                    );
                })}
        </div>
    );
}
