import { getTeamColor } from '../../../../../utils/TeamColors';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
// import { useSelector } from 'react-redux'; // This import is no longer used

// Country Code Mapping for Flags
const countryCodes = {
    "Bahrain": "bh", "Saudi Arabia": "sa", "Australia": "au", "Azerbaijan": "az", "USA": "us", "United States": "us",
    "Miami": "us", "Monaco": "mc", "Spain": "es", "Canada": "ca", "Austria": "at", "Great Britain": "gb", "UK": "gb",
    "Hungary": "hu", "Belgium": "be", "Netherlands": "nl", "Italy": "it", "Singapore": "sg", "Japan": "jp",
    "Qatar": "qa", "Mexico": "mx", "Brazil": "br", "Las Vegas": "us", "Abu Dhabi": "ae", "UAE": "ae", "China": "cn",
    "Portugal": "pt", "France": "fr", "Turkey": "tr", "Russia": "ru", "Germany": "de"
};

// Nationality to Country Code Mapping
const nationalityCodes = {
    "Dutch": "nl", "British": "gb", "Italian": "it", "Spanish": "es", "French": "fr", "German": "de",
    "Monegasque": "mc", "Mexican": "mx", "Australian": "au", "American": "us", "United States": "us", "Canadian": "ca",
    "Japanese": "jp", "Chinese": "cn", "Thai": "th", "Finnish": "fi", "Danish": "dk", "Polish": "pl",
    "Russian": "ru", "Brazilian": "br", "Argentine": "ar", "New Zealander": "nz"
};

export default function OverallResults(props) {
    // TODO
    const [result, setResult] = useState([]);
    const [loading, setLoading] = useState(true);
    // eslint-disable-next-line no-unused-vars
    const [circuit, setCircuit] = useState([]);
    // eslint-disable-next-line no-unused-vars
    const [driver, setDriver] = useState([]);
    // eslint-disable-next-line no-unused-vars
    const [constructor, setConstructor] = useState([]);

    // const event = useSelector(state => state.eventInfo); // This line is removed as per the new code

    // Use year from props or default to current year
    const year = props.year || new Date().getFullYear();

    // Cache configuration
    const CACHE_KEY = `f1_race_results_${year}`;
    const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

    const getResults = async () => {
        try {
            setLoading(true);

            // Check Cache
            const cachedData = localStorage.getItem(CACHE_KEY);
            const cacheTimestamp = localStorage.getItem(`${CACHE_KEY}_timestamp`);

            if (cachedData && cacheTimestamp) {
                const age = Date.now() - parseInt(cacheTimestamp);
                if (age < CACHE_DURATION) {
                    console.log('✓ Loading race results from cache');
                    setResult(JSON.parse(cachedData));
                    setLoading(false);
                    return;
                }
            }

            let formattedResults = [];

            // TRY OPENF1 API FIRST
            try {
                console.log(`🏎️ Trying OpenF1 API for ${year}...`);

                // Fetch all race sessions for the year
                const sessionsResponse = await fetch(`https://api.openf1.org/v1/sessions?session_name=Race&year=${year}`);

                if (sessionsResponse.ok) {
                    const sessions = await sessionsResponse.json();

                    // Filter for completed races only
                    const now = new Date();
                    const completedSessions = sessions.filter(s => new Date(s.date_end) < now);

                    console.log(`✓ OpenF1: Found ${completedSessions.length} completed races for ${year}`);

                    if (completedSessions.length > 0) {
                        // Helper: chunk array into smaller batches to avoid rate limits
                        const chunkArray = (arr, size) => {
                            return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
                                arr.slice(i * size, i * size + size)
                            );
                        };

                        const sessionChunks = chunkArray(completedSessions, 5); // Batch size of 5
                        const allResults = [];

                        for (const chunk of sessionChunks) {
                            const chunkPromises = chunk.map(async (session) => {
                                try {
                                    // Delay slightly to prevent instant burst
                                    await new Promise(r => setTimeout(r, 100));

                                    const [resultsRes, driversRes] = await Promise.all([
                                        fetch(`https://api.openf1.org/v1/session_result?session_key=${session.session_key}`),
                                        fetch(`https://api.openf1.org/v1/drivers?session_key=${session.session_key}`)
                                    ]);

                                    if (resultsRes.ok && driversRes.ok) {
                                        const results = await resultsRes.json();
                                        const drivers = await driversRes.json();

                                        const winner = results.find(r => r.position === 1);
                                        if (!winner) return null;

                                        const driverInfo = drivers.find(d => d.driver_number === winner.driver_number);
                                        if (!driverInfo) return null;

                                        return {
                                            session: { session_key: session.session_key },
                                            formatted: {
                                                round: session.session_key,
                                                circuitId: session.circuit_short_name?.toLowerCase().replace(/\s+/g, '_') || 'unknown',
                                                raceName: session.session_name === 'Race' ? session.meeting_name : session.session_name,
                                                date: session.date_start.split('T')[0],
                                                country: session.country_name,
                                                nationality: driverInfo.country_code || 'Unknown',
                                                winnerName: driverInfo.last_name || driverInfo.full_name,
                                                winnerFullName: driverInfo.full_name,
                                                driverId: driverInfo.name_acronym?.toLowerCase() || driverInfo.driver_number.toString(),
                                                teamName: driverInfo.team_name || 'Unknown',
                                                constructorId: driverInfo.team_name?.toLowerCase().replace(/\s+/g, '_') || 'unknown',
                                                laps: 'N/A',
                                                time: 'N/A'
                                            }
                                        };
                                    }
                                    return null;
                                } catch (err) {
                                    console.warn(`Failed session ${session.session_key}`, err);
                                    return null;
                                }
                            });

                            const chunkResults = await Promise.all(chunkPromises);
                            allResults.push(...chunkResults);
                        }

                        formattedResults = allResults.filter(r => r !== null);

                        // Sort by date (descending)
                        formattedResults.sort((a, b) => new Date(b.formatted.date) - new Date(a.formatted.date));

                        console.log(`✓ OpenF1: Successfully loaded ${formattedResults.length} race results`);
                    }
                }
            } catch (openF1Error) {
                console.warn('⚠️ OpenF1 API failed:', openF1Error.message);
            }

            // SMART FALLBACK: If OpenF1 failed or returned very few results (less than 20% of expected for a past year), try Ergast
            // Use Ergast for years prior to 2023 where OpenF1 might be spotty, or if OpenF1 returned nothing.
            // Exception: If current year (e.g. 2026), few results are normal.
            const isHistoricalYear = year < new Date().getFullYear();
            const insufficientData = formattedResults.length === 0 || (isHistoricalYear && formattedResults.length < 5);

            if (insufficientData) {
                console.log(`🔄 Triggering Fallback to Ergast API for ${year}... (OpenF1 returned ${formattedResults.length} results)`);

                try {
                    // Try Jolpica first (HTTPS)
                    let response = await fetch(`https://api.jolpi.ca/ergast/f1/${year}/results/1.json?limit=100`);

                    if (!response.ok) {
                        // Try fallback to standard Ergast if Jolpica fails
                        console.log("Jolpica failed, trying ergast.com...");
                        response = await fetch(`https://ergast.com/api/f1/${year}/results/1.json?limit=100`);
                    }

                    if (response.ok) {
                        const data = await response.json();
                        const races = data.MRData.RaceTable.Races || [];
                        console.log(`✓ Ergast: Found ${races.length} races for ${year}`);

                        if (races.length > 0) {
                            formattedResults = races.map(race => {
                                const winner = race.Results[0];
                                return {
                                    session: { session_key: race.round },
                                    formatted: {
                                        round: race.round,
                                        circuitId: race.Circuit.circuitId,
                                        raceName: race.raceName,
                                        date: race.date,
                                        country: race.Circuit.Location.country,
                                        nationality: winner.Driver.nationality,
                                        winnerName: winner.Driver.familyName,
                                        winnerFullName: `${winner.Driver.givenName} ${winner.Driver.familyName}`,
                                        driverId: winner.Driver.driverId,
                                        teamName: winner.Constructor.name,
                                        constructorId: winner.Constructor.constructorId,
                                        laps: winner.laps,
                                        time: winner.Time?.time || "N/A"
                                    }
                                };
                            });
                            // Sort Ergast results descending
                            formattedResults.sort((a, b) => new Date(b.formatted.date) - new Date(a.formatted.date));
                        }
                    }
                } catch (ergastError) {
                    console.error('❌ Ergast API also failed:', ergastError);
                }
            }

            // Save to Cache
            if (formattedResults.length > 0) {
                localStorage.setItem(CACHE_KEY, JSON.stringify(formattedResults));
                localStorage.setItem(`${CACHE_KEY}_timestamp`, Date.now().toString());
                console.log(`✓ Cached ${formattedResults.length} results for ${year}`);
            }

            setResult(formattedResults);
            setLoading(false);

        } catch (error) {
            console.error('❌ Error fetching results:', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        getResults();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [year]);

    function setCircuitName(circuitId) {
        setCircuit(circuitId)
    }

    function setDriverName(driverId) {
        setDriver(driverId)
    }

    function setConstructorName(constructorId) {
        setConstructor(constructorId)
    }

    function clearCache() {
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem(`${CACHE_KEY}_timestamp`);
        alert('Cache cleared!');
    }

    // Helper to get Flag URL
    const getFlag = (country) => {
        const code = countryCodes[country] || 'xx';
        return `https://flagcdn.com/w40/${code}.png`;
    };

    // Helper to get Nationality Flag
    const getDriverFlag = (nationality) => {
        const code = nationalityCodes[nationality] || 'xx';
        return `https://flagcdn.com/w40/${code}.png`;
    };

    return (
        <div className='w-full flex flex-col items-center pb-10'>
            {/* Header / Actions */}
            <div className='flex justify-between items-center w-full max-w-6xl px-4 py-4'>
                <h2 className='text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent uppercase italic tracking-tighter'>
                    Race Results {year}
                </h2>
                <button
                    onClick={clearCache}
                    className='px-3 py-1.5 bg-gray-800 hover:bg-red-600 border border-gray-700 rounded-lg text-xs font-bold text-gray-300 hover:text-white transition-all uppercase tracking-wider'
                >
                    Refresh Data
                </button>
            </div>

            {/* Premium Table */}
            <div className='w-full overflow-x-auto'>
                <table className='w-full text-left border-separate border-spacing-y-3'>
                    <thead>
                        <tr className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                            <th className="px-6 py-4">Grand Prix</th>
                            <th className="px-6 py-4 hidden md:table-cell">Date</th>
                            <th className="px-6 py-4">Winner</th>
                            <th className="px-6 py-4 hidden sm:table-cell">Constructor</th>
                            <th className="px-6 py-4 text-center hidden md:table-cell">Laps</th>
                            <th className="px-6 py-4 text-right">Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="6" className="p-10 text-center">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                                        <p className="text-gray-400 animate-pulse">Fetching results...</p>
                                    </div>
                                </td>
                            </tr>
                        ) : result.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="p-10 text-center text-gray-500 bg-white/5 rounded-2xl border border-dashed border-white/10">
                                    No completed races found for {year} yet.
                                </td>
                            </tr>
                        ) : (
                            result.map((item, index) => {
                                const data = item.formatted;
                                const teamColor = getTeamColor(data.teamName);

                                return (
                                    <tr key={index} className="group transition-all duration-300">
                                        {/* Circuit / Flag */}
                                        <td className="px-6 py-4 bg-[#1e1f24] rounded-l-2xl border-y border-l border-white/5 group-hover:border-white/10 group-hover:bg-[#25262c] transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="relative w-8 h-5 shrink-0 overflow-hidden rounded shadow-sm">
                                                    <img
                                                        src={getFlag(data.country)}
                                                        alt={data.country}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => e.target.style.display = 'none'}
                                                    />
                                                    <div className="absolute inset-0 ring-1 ring-inset ring-black/10"></div>
                                                </div>
                                                <Link
                                                    to={`/championship/race/${year}/${item.session.session_key}`}
                                                    onClick={() => setCircuitName(data.circuitId)}
                                                    className="font-bold text-gray-100 hover:text-red-400 transition-colors truncate"
                                                >
                                                    {data.raceName}
                                                </Link>
                                            </div>
                                        </td>

                                        {/* Date */}
                                        <td className="px-6 py-4 bg-[#1e1f24] border-y border-white/5 group-hover:border-white/10 group-hover:bg-[#25262c] text-sm text-gray-400 font-mono hidden md:table-cell transition-all">
                                            {new Date(data.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </td>

                                        {/* Winner with Flag */}
                                        <td className="px-6 py-4 bg-[#1e1f24] border-y border-white/5 group-hover:border-white/10 group-hover:bg-[#25262c] transition-all">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={getDriverFlag(data.nationality)}
                                                    alt={data.nationality}
                                                    title={data.nationality}
                                                    className="w-5 h-3 rounded-sm object-cover opacity-80"
                                                    onError={(e) => e.target.style.display = 'none'}
                                                />
                                                <Link
                                                    to={`/driver/${year}/${data.driverId}`}
                                                    onClick={() => setDriverName(data.driverId)}
                                                    className="font-bold text-white hover:text-red-500 transition-colors"
                                                >
                                                    {data.winnerFullName}
                                                </Link>
                                            </div>
                                        </td>

                                        {/* Team (with Color Strip) */}
                                        <td className="px-6 py-4 bg-[#1e1f24] border-y border-white/5 group-hover:border-white/10 group-hover:bg-[#25262c] hidden sm:table-cell transition-all">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-1 h-8 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                                                    style={{ backgroundColor: teamColor, boxShadow: `0 0 10px ${teamColor}80` }}
                                                ></div>
                                                <Link
                                                    to={`/championship/${data.constructorId}`}
                                                    onClick={() => setConstructorName(data.constructorId)}
                                                    className="text-gray-300 hover:text-white transition-colors text-sm uppercase tracking-wide font-semibold"
                                                >
                                                    {data.teamName}
                                                </Link>
                                            </div>
                                        </td>

                                        {/* Laps */}
                                        <td className="px-6 py-4 bg-[#1e1f24] border-y border-white/5 group-hover:border-white/10 group-hover:bg-[#25262c] text-center font-mono text-gray-500 hidden md:table-cell transition-all">
                                            {data.laps}
                                        </td>

                                        {/* Time */}
                                        <td className="px-6 py-4 bg-[#1e1f24] rounded-r-2xl border-y border-r border-white/5 group-hover:border-white/10 group-hover:bg-[#25262c] text-right font-mono text-green-400 group-hover:text-green-300 text-sm whitespace-nowrap transition-all">
                                            {data.time}
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}