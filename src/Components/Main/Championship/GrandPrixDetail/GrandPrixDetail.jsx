import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../../../Header/Header';
import CircuitMap from './CircuitMap';
import { getTeamColor } from '../../../../utils/TeamColors';

export default function GrandPrixDetail() {
    const { year: urlYear, sessionKey } = useParams();
    const navigate = useNavigate();

    const currentYear = new Date().getFullYear();
    const year = urlYear || currentYear;

    const [session, setSession] = useState(null);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Cache configuration
    const CACHE_KEY = `gp_${sessionKey}`;
    const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours

    useEffect(() => {
        loadGrandPrixData();
    }, [sessionKey]);

    // Helper function to get country flag emoji
    function getFlagEmoji(countryCode) {
        if (!countryCode) return '🏁';
        const codePoints = countryCode
            .toUpperCase()
            .split('')
            .map(char => 127397 + char.charCodeAt());
        return String.fromCodePoint(...codePoints);
    }

    async function loadGrandPrixData() {
        try {
            setLoading(true);
            setError(null);

            // Check cache
            const cachedData = localStorage.getItem(CACHE_KEY);
            const cacheTimestamp = localStorage.getItem(`${CACHE_KEY}_timestamp`);

            if (cachedData && cacheTimestamp) {
                const age = Date.now() - parseInt(cacheTimestamp);
                if (age < CACHE_DURATION) {
                    const parsed = JSON.parse(cachedData);
                    setSession(parsed.session);
                    setResults(parsed.results);
                    setLoading(false);
                    return;
                }
            }

            // 1. Get Session Details
            let currentSession = null;
            let enrichedResults = [];

            // STRATEGY: Ergast for historical (<2023) or if sessionKey looks like a round number
            const isRoundNumber = !isNaN(sessionKey) && sessionKey.length <= 2;
            const useErgast = year < 2023 || isRoundNumber;

            if (useErgast) {
                console.log(`🔄 Using Ergast Fallback for ${year} R${sessionKey}`);
                const response = await fetch(`https://api.jolpi.ca/ergast/f1/${year}/${sessionKey}/results.json`);
                if (!response.ok) throw new Error('Failed to fetch historical results');
                const data = await response.json();
                const raceData = data.MRData.RaceTable.Races[0];

                if (!raceData) throw new Error('Historical race not found');

                currentSession = {
                    session_name: raceData.raceName,
                    circuit_short_name: raceData.Circuit.circuitName,
                    date_start: `${raceData.date}T${raceData.time || '12:00:00Z'}`,
                    country_name: raceData.Circuit.Location.country,
                };

                enrichedResults = raceData.Results.map(res => ({
                    position: parseInt(res.position),
                    full_name: `${res.Driver.givenName} ${res.Driver.familyName}`,
                    name_acronym: res.Driver.code || res.Driver.familyName.substring(0, 3).toUpperCase(),
                    team_name: res.Constructor.name,
                    team_colour: getTeamColor(res.Constructor.name).replace('#', ''),
                    points: parseFloat(res.points),
                    pit_stops: '-', // Ergast doesn't provide this in this endpoint
                    gap_to_leader: res.Time?.time || (res.status === 'Finished' ? '-' : res.status),
                    driver_number: parseInt(res.number),
                    driver_info: { headshot_url: null }
                }));
            } else {
                // FRESH OPENF1 DATA
                const sessionResponse = await fetch(`https://api.openf1.org/v1/sessions?session_key=${sessionKey}`);
                if (!sessionResponse.ok) throw new Error('Failed to fetch session details');
                const sessionData = await sessionResponse.json();

                if (!sessionData || sessionData.length === 0) {
                    throw new Error('Session not found');
                }
                currentSession = sessionData[0];

                // 2. Get Race Results
                const resultResponse = await fetch(`https://api.openf1.org/v1/session_result?session_key=${sessionKey}`);
                if (!resultResponse.ok) throw new Error('Failed to fetch results');
                const resultData = await resultResponse.json();

                // 3. Get Pit Stops
                const pitResponse = await fetch(`https://api.openf1.org/v1/pit?session_key=${sessionKey}`);
                const pitData = pitResponse.ok ? await pitResponse.json() : [];

                // 4. Get Drivers
                const driverResponse = await fetch(`https://api.openf1.org/v1/drivers?session_key=${sessionKey}`);
                const driverData = driverResponse.ok ? await driverResponse.json() : [];

                // Merge Data
                enrichedResults = resultData.map(result => {
                    const driver = driverData.find(d => d.driver_number === result.driver_number);
                    const pits = pitData.filter(p => p.driver_number === result.driver_number);

                    return {
                        ...result,
                        driver_info: driver,
                        pit_stops: pits.length,
                        teams: [{ team_colour: result.team_colour }]
                    };
                });

                // Sort by position
                enrichedResults.sort((a, b) => (a.position || 999) - (b.position || 999));
            }

            setSession(currentSession);
            setResults(enrichedResults);

            // Cache
            localStorage.setItem(CACHE_KEY, JSON.stringify({ session: currentSession, results: enrichedResults }));
            localStorage.setItem(`${CACHE_KEY}_timestamp`, Date.now().toString());

            setLoading(false);

        } catch (err) {
            console.error('Error loading GP data:', err);
            setError(err.message);
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className='min-h-screen bg-gradient-to-br from-f1-black via-f1-dark to-f1-black'>
                <Header />
                <div className='flex items-center justify-center h-96'>
                    <div className='text-center'>
                        <div className='f1-loader mb-4'></div>
                        <p className='text-white'>Loading Grand Prix data...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !session) {
        return (
            <div className='min-h-screen bg-gradient-to-br from-f1-black via-f1-dark to-f1-black'>
                <Header />
                <div className='flex items-center justify-center h-96'>
                    <div className='text-center text-white'>
                        <h2 className='text-2xl mb-4'>⚠️ {error || 'Grand Prix not found'}</h2>
                        <button
                            onClick={() => navigate('/championship')}
                            className='px-6 py-3 bg-f1-red rounded-lg hover:bg-racing-red transition-colors'
                        >
                            Back to Championship
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Format interval/gap
    const formatTime = (time, leaderTime) => {
        if (!time) return 'DNF';
        if (time === leaderTime) return new Date(time * 1000).toISOString().substr(11, 8); // Format seconds to HH:mm:ss
        // If it's a gap (usually provided in results directly, but OpenF1 provides total time often)
        // Adjust based on actual API response format (usually session_result has .time as duration)
        return new Date(time * 1000).toISOString().substr(11, 8);
    };

    return (
        <div className='min-h-screen bg-gradient-to-br from-f1-black via-f1-dark to-f1-black text-white pb-20'>
            <Header />

            <div className='max-w-7xl mx-auto px-4 py-8'>
                {/* Header Section */}
                <div className='mb-12'>
                    <button
                        onClick={() => navigate(-1)}
                        className='mb-8 px-5 py-2.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-3 text-sm font-bold tracking-tight'
                    >
                        <span className="text-f1-red">←</span> BACK TO RESULTS
                    </button>

                    <div className='relative overflow-hidden rounded-3xl border border-white/5 bg-[#15151e] shadow-2xl'>
                        {/* Decorative Red Accent */}
                        <div className="absolute top-0 left-0 w-2 h-full bg-f1-red"></div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-f1-red/10 blur-[100px] -mr-32 -mt-32"></div>

                        <div className="p-8 md:p-12 relative z-10">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                                <div>
                                    <h1 className='text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-white mb-4 leading-none'>
                                        {session.session_name}
                                    </h1>
                                    <div className='flex flex-wrap gap-6 text-gray-400 font-bold uppercase tracking-widest text-xs'>
                                        <span className='flex items-center gap-2'>
                                            <span className="text-f1-red">📍</span> {session.circuit_short_name}
                                        </span>
                                        <span className='flex items-center gap-2'>
                                            <span className="text-f1-red">📅</span> {new Date(session.date_start).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                        </span>
                                        <span className='flex items-center gap-2'>
                                            <span className="text-f1-red">🗺️</span> {session.country_name}
                                        </span>
                                    </div>
                                </div>
                                <div className="hidden lg:block text-right">
                                    <div className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em] mb-1">Season</div>
                                    <div className="text-4xl font-black text-white italic">{year}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>

                    {/* Final Standings Table */}
                    <div className='lg:col-span-2'>
                        <div className='mb-6 flex items-center justify-between'>
                            <h2 className='text-2xl font-black italic uppercase tracking-tighter flex items-center gap-3'>
                                <span className="w-2 h-6 bg-f1-red rounded-full"></span>
                                Final Result
                            </h2>
                            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                {results.length} CLASSIFIED
                            </div>
                        </div>

                        <div className='w-full overflow-x-auto overflow-y-visible pr-2'>
                            <table className='w-full border-separate border-spacing-y-3'>
                                <thead>
                                    <tr className='text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]'>
                                        <th className='py-2 px-6 text-left'>Pos</th>
                                        <th className='py-2 px-6 text-left'>Driver</th>
                                        <th className='py-2 px-6 text-center'>Time/Gap</th>
                                        <th className='py-2 px-6 text-center'>Pits</th>
                                        <th className='py-2 px-6 text-right'>Points</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.map((result, index) => {
                                        const teamColor = `#${result.team_colour || 'E10600'}`;
                                        const isPodium = result.position <= 3;

                                        return (
                                            <tr
                                                key={result.driver_number}
                                                className="group transition-all duration-300 hover:scale-[1.01] cursor-pointer"
                                                onClick={() => navigate(`/driver/${year}/${result.name_acronym}`)}
                                            >
                                                {/* Position */}
                                                <td className="px-6 py-5 bg-[#1e1f24]/60 backdrop-blur-md rounded-l-2xl border-y border-l border-white/5 group-hover:bg-[#25262c] transition-all relative">
                                                    {isPodium && (
                                                        <div
                                                            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full"
                                                            style={{ backgroundColor: teamColor }}
                                                        ></div>
                                                    )}
                                                    <span className={`text-2xl font-black italic ${result.position === 1 ? 'text-yellow-400' :
                                                        result.position === 2 ? 'text-gray-300' :
                                                            result.position === 3 ? 'text-orange-400' : 'text-gray-500'
                                                        }`}>
                                                        {result.position}
                                                    </span>
                                                </td>

                                                {/* Driver */}
                                                <td className="px-6 py-5 bg-[#1e1f24]/60 backdrop-blur-md border-y border-white/5 group-hover:bg-[#25262c] transition-all">
                                                    <div className='flex items-center gap-4'>
                                                        <div className="relative">
                                                            {result.driver_info?.headshot_url ? (
                                                                <img
                                                                    src={result.driver_info.headshot_url}
                                                                    alt={result.name_acronym}
                                                                    className='w-10 h-10 object-cover rounded-xl border border-white/10'
                                                                />
                                                            ) : (
                                                                <div className="w-10 h-10 rounded-xl bg-f1-dark flex items-center justify-center font-black text-xs border border-white/10" style={{ color: teamColor }}>
                                                                    {result.name_acronym}
                                                                </div>
                                                            )}
                                                            <div
                                                                className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#1e1f24]"
                                                                style={{ backgroundColor: teamColor }}
                                                            ></div>
                                                        </div>
                                                        <div>
                                                            <div className='font-black text-white hover:text-f1-red transition-colors text-lg italic uppercase tracking-tighter leading-none'>
                                                                {result.full_name}
                                                            </div>
                                                            <div className='text-[10px] font-black uppercase tracking-widest mt-1 opacity-60'>
                                                                {result.team_name}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Time/Gap */}
                                                <td className="px-6 py-5 bg-[#1e1f24]/60 backdrop-blur-md border-y border-white/5 group-hover:bg-[#25262c] text-center font-mono text-sm text-gray-400 transition-all">
                                                    {index === 0 ? (
                                                        <span className="text-green-400 font-bold">WINNER</span>
                                                    ) : (
                                                        result.gap_to_leader ? `+${result.gap_to_leader}s` : <span className="text-red-500/50">DNF</span>
                                                    )}
                                                </td>

                                                {/* Pits */}
                                                <td className="px-6 py-5 bg-[#1e1f24]/60 backdrop-blur-md border-y border-white/5 group-hover:bg-[#25262c] text-center transition-all">
                                                    <span className='px-2 py-0.5 bg-black/40 rounded text-[10px] font-black text-gray-400 border border-white/10'>
                                                        {result.pit_stops} PITS
                                                    </span>
                                                </td>

                                                {/* Points */}
                                                <td className="px-6 py-5 bg-[#1e1f24]/60 backdrop-blur-md rounded-r-2xl border-y border-r border-white/5 group-hover:bg-[#25262c] text-right transition-all">
                                                    <div className="text-2xl font-black italic text-white">
                                                        {result.points}
                                                        <span className="text-[10px] not-italic text-gray-500 ml-1">PTS</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Sidebar / Circuit Visualization */}
                    <div className='lg:col-span-1 space-y-6'>

                        {/* Circuit Map */}
                        <div className='bg-[#1e1f24]/60 backdrop-blur-md p-6 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-white/10 transition-all'>
                            <div className="absolute top-0 right-0 p-3">
                                <span className="px-2 py-0.5 bg-f1-red text-[10px] font-black uppercase rounded tracking-tighter">Interactive</span>
                            </div>
                            <h3 className='text-xs font-black mb-6 flex items-center gap-3 tracking-[0.2em] text-gray-500'>
                                <span className="w-1.5 h-3 bg-f1-red rounded-full"></span>
                                CIRCUIT LAYOUT
                            </h3>
                            <CircuitMap circuitName={session.circuit_short_name} />
                        </div>

                        {/* Summary Stats */}
                        <div className='bg-[#1e1f24]/60 backdrop-blur-md p-6 rounded-3xl border border-white/5'>
                            <h3 className='text-[10px] font-black mb-6 flex items-center gap-3 tracking-[0.2em] text-gray-500'>
                                <span className="w-1.5 h-3 bg-gray-600 rounded-full"></span>
                                RACE SUMMARY
                            </h3>
                            <div className='space-y-4'>
                                <div className='flex justify-between items-center border-b border-white/5 pb-3'>
                                    <span className='text-[10px] font-bold text-gray-500 uppercase tracking-widest'>Winner</span>
                                    <span className='font-black italic text-lg text-white'>{results[0]?.full_name || '-'}</span>
                                </div>
                                <div className='flex justify-between items-center border-b border-white/5 pb-3'>
                                    <span className='text-[10px] font-bold text-gray-500 uppercase tracking-widest'>Fastest Lap</span>
                                    <span className='font-black italic text-lg text-purple-400'>N/A</span>
                                </div>
                                <div className='flex justify-between items-center'>
                                    <span className='text-[10px] font-bold text-gray-500 uppercase tracking-widest'>Status</span>
                                    <span className='font-black italic text-lg text-green-400 uppercase'>Official</span>
                                </div>
                            </div>
                        </div>

                        {/* Lap by Lap Analysis */}
                        <div
                            className='relative overflow-hidden p-6 rounded-3xl border border-f1-red/20 bg-gradient-to-br from-f1-red/5 to-transparent backdrop-blur-sm cursor-pointer hover:border-f1-red transition-all group'
                            onClick={() => navigate(`/championship/race/${year}/${sessionKey}/timings`)}
                        >
                            <div className="absolute top-0 right-0 p-3">
                                <span className="text-gray-500 group-hover:text-f1-red transition-colors">↗</span>
                            </div>
                            <div className='flex items-center gap-4 mb-3'>
                                <div className="w-10 h-10 rounded-xl bg-f1-red/10 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">📈</div>
                                <div>
                                    <h3 className='font-black italic uppercase tracking-tighter text-white'>Lap Analysis</h3>
                                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Timings & Pit Stops</div>
                                </div>
                            </div>
                            <p className='text-gray-400 text-xs leading-relaxed'>
                                Detailed lap-by-lap breakdown of every driver's performance, position changes, and strategy.
                            </p>
                            <div className='mt-4 pt-4 border-t border-white/5 flex items-center text-f1-red text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0'>
                                Open Telemetry View
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
