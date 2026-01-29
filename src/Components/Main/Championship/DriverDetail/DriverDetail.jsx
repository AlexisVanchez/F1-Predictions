import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Header from '../../../Header/Header';

export default function DriverDetail() {
    const { year: urlYear, driverId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // Get year from URL, location state, or default to current year
    const year = urlYear || location.state?.year || new Date().getFullYear();

    const [driver, setDriver] = useState(null);
    const [seasonResults, setSeasonResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Cache configuration
    const CACHE_KEY = `driver_${driverId}_v2`; // v2 to include sprints
    const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

    useEffect(() => {
        loadDriverData();
    }, [driverId]);

    // Helper function to get country flag emoji from country code
    function getFlagEmoji(countryCode) {
        if (!countryCode) return '🏁';

        // Convert country code to flag emoji using regional indicator symbols
        const codePoints = countryCode
            .toUpperCase()
            .split('')
            .map(char => 127397 + char.charCodeAt());
        return String.fromCodePoint(...codePoints);
    }

    async function loadDriverData() {
        try {
            setLoading(true);
            setError(null);

            // Check cache
            const cachedData = localStorage.getItem(CACHE_KEY);
            const cacheTimestamp = localStorage.getItem(`${CACHE_KEY}_timestamp`);

            if (cachedData && cacheTimestamp) {
                const age = Date.now() - parseInt(cacheTimestamp);
                if (age < CACHE_DURATION) {
                    console.log(`✓ Loading ${driverId} from cache`);
                    const parsed = JSON.parse(cachedData);
                    setDriver(parsed.driver);
                    setSeasonResults(parsed.results);
                    setLoading(false);
                    return;
                }
            }

            // fresh data
            const useErgast = year < 2023;

            if (useErgast) {
                console.log(`🔄 Using Ergast Fallback for driver ${driverId} in ${year}`);
                // Fetch driver details
                const driverRes = await fetch(`https://api.jolpi.ca/ergast/f1/drivers/${driverId}.json`);
                if (!driverRes.ok) throw new Error(`Driver ${driverId} not found in historical records`);
                const driverJson = await driverRes.json();
                const d = driverJson.MRData.DriverTable.Drivers[0];

                if (!d) throw new Error(`Driver ${driverId} not found`);

                const driverData = {
                    full_name: `${d.givenName} ${d.familyName}`,
                    first_name: d.givenName,
                    last_name: d.familyName,
                    name_acronym: d.code || d.familyName.substring(0, 3).toUpperCase(),
                    driver_number: d.permanentNumber || '??',
                    country_code: d.nationality,
                    team_name: 'Historical Data',
                    team_colour: 'E10600',
                    country_name: d.nationality
                };

                // Fetch season results
                const resultsRes = await fetch(`https://api.jolpi.ca/ergast/f1/${year}/drivers/${driverId}/results.json`);
                const resultsJson = await resultsRes.ok ? await resultsRes.json() : null;
                const races = resultsJson?.MRData?.RaceTable?.Races || [];

                const mappedResults = races.map(race => ({
                    session: {
                        location: race.Circuit.Location.locality,
                        date_start: race.date,
                        meeting_key: race.round,
                        session_name: 'Race'
                    },
                    result: {
                        position: parseInt(race.Results[0].position),
                        points: parseFloat(race.Results[0].points),
                        status: race.Results[0].status,
                        dnf: race.Results[0].status !== 'Finished' && !race.Results[0].status.includes('Lap')
                    }
                }));

                setDriver(driverData);
                setSeasonResults(mappedResults);

                const cacheData = { driver: driverData, results: mappedResults };
                localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
                localStorage.setItem(`${CACHE_KEY}_timestamp`, Date.now().toString());

                setLoading(false);
                return;
            }

            // Standard OpenF1 Logic
            const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
            const [racesResponse, sprintsResponse] = await Promise.all([
                fetch(`https://api.openf1.org/v1/sessions?year=${year}&session_name=Race`),
                fetch(`https://api.openf1.org/v1/sessions?year=${year}&session_name=Sprint`)
            ]);

            const races = await racesResponse.ok ? await racesResponse.json() : [];
            const sprints = sprintsResponse.ok ? await sprintsResponse.json() : [];

            if (races.length === 0) throw new Error(`No data found for year ${year}`);

            // Get driver info from latest session
            const latestSession = races[races.length - 1];
            const driversResponse = await fetch(`https://api.openf1.org/v1/drivers?session_key=${latestSession.session_key}`);
            const drivers = await driversResponse.json();

            const driverData = drivers.find(d => {
                const id = driverId.toLowerCase();
                if (d.name_acronym && d.name_acronym.toLowerCase() === id) return true;
                const fullSlug = d.full_name.toLowerCase().replace(/\s+/g, '_');
                if (fullSlug === id) return true;
                if (d.last_name && d.last_name.toLowerCase() === id) return true;
                // Loose match for Ergast IDs (e.g. "max_verstappen" should match "Verstappen")
                if (id.includes(d.last_name?.toLowerCase()) || (d.last_name && id.includes(d.last_name.toLowerCase()))) return true;
                return false;
            });

            if (!driverData) {
                setError(`Driver ${driverId} not found`);
                setLoading(false);
                return;
            }

            setDriver(driverData);

            // Get results for all sessions (races and sprints)
            const results = [];
            const allSessions = [...races, ...sprints];

            for (let i = 0; i < allSessions.length; i++) {
                const session = allSessions[i];
                if (i > 0) await delay(150); // Rate limiting
                try {
                    const resultResponse = await fetch(
                        `https://api.openf1.org/v1/session_result?session_key=${session.session_key}&driver_number=${driverData.driver_number}`
                    );

                    if (resultResponse.ok) {
                        const resultData = await resultResponse.json();
                        if (resultData && resultData.length > 0) {
                            results.push({
                                session,
                                result: resultData[0],
                                isSprint: session.session_name === 'Sprint'
                            });
                        }
                    }
                } catch (err) {
                    console.warn(`Failed to load result for ${session.location}:`, err);
                }
            }

            // Group results by meeting_key (Grand Prix weekend)
            const groupedResults = [];
            results.forEach(item => {
                const existing = groupedResults.find(g =>
                    g.session.meeting_key === item.session.meeting_key && !g.isSprint
                );

                if (item.isSprint) {
                    const mainRace = results.find(r =>
                        r.session.meeting_key === item.session.meeting_key && !r.isSprint
                    );
                    if (mainRace) {
                        if (!mainRace.sprint) mainRace.sprint = item;
                    }
                } else {
                    if (!existing) groupedResults.push(item);
                }
            });

            groupedResults.sort((a, b) => new Date(a.session.date_start) - new Date(b.session.date_start));
            setSeasonResults(groupedResults);

            // Cache the data
            const cacheData = { driver: driverData, results: groupedResults };
            localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
            localStorage.setItem(`${CACHE_KEY}_timestamp`, Date.now().toString());
            setLoading(false);

        } catch (err) {
            console.error('Error loading driver data:', err);
            setError(err.message);
            setLoading(false);
        }
    }

    function clearCache() {
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem(`${CACHE_KEY}_timestamp`);
        loadDriverData();
    }

    // Calculate stats (including sprint points)
    const stats = seasonResults.length > 0 ? {
        totalPoints: seasonResults.reduce((sum, r) => {
            let points = r.result.points || 0;
            if (r.sprint) points += r.sprint.result.points || 0;
            return sum + points;
        }, 0),
        bestFinish: Math.min(...seasonResults.map(r => r.result.position).filter(p => p)),
        podiums: seasonResults.filter(r => r.result.position <= 3).length,
        races: seasonResults.length,
        wins: seasonResults.filter(r => r.result.position === 1).length
    } : null;

    if (loading) {
        return (
            <div className='min-h-screen bg-gradient-to-br from-f1-black via-f1-dark to-f1-black'>
                <Header />
                <div className='flex items-center justify-center h-96'>
                    <div className='text-center'>
                        <div className='f1-loader mb-4'></div>
                        <p className='text-white'>Loading driver information...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !driver) {
        return (
            <div className='min-h-screen bg-gradient-to-br from-f1-black via-f1-dark to-f1-black'>
                <Header />
                <div className='flex items-center justify-center h-96'>
                    <div className='text-center text-white'>
                        <h2 className='text-2xl mb-4'>⚠️ {error || 'Driver not found'}</h2>
                        <button
                            onClick={() => navigate('/championship/overall')}
                            className='px-6 py-3 bg-f1-red rounded-lg hover:bg-racing-red transition-colors'
                        >
                            Back to Championship
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className='min-h-screen bg-gradient-to-br from-f1-black via-f1-dark to-f1-black text-white pb-20'>
            <Header />

            <div className='max-w-7xl mx-auto px-4 py-8'>
                {/* Header with back button */}
                <div className='flex justify-between items-center mb-8'>
                    <button
                        onClick={() => navigate(-1)}
                        className='px-4 py-2 bg-f1-dark border border-f1-gray rounded-lg hover:bg-f1-gray transition-colors flex items-center gap-2'
                    >
                        ← Back to Results
                    </button>
                    <button
                        onClick={clearCache}
                        className='px-4 py-2 bg-f1-dark border border-f1-gray rounded-lg hover:bg-f1-gray transition-colors text-sm'
                    >
                        Refresh Data
                    </button>
                </div>

                {/* Driver Bio Section */}
                <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 lg:items-center'>
                    {/* Driver Card */}
                    <div className='lg:col-span-1'>
                        <div
                            className='relative p-6 rounded-2xl border-2 h-full overflow-hidden shadow-2xl transition-all duration-300 hover:shadow-3xl hover:scale-[1.02]'
                            style={{
                                borderColor: `#${driver.team_colour || 'E10600'}`,
                                background: `linear-gradient(135deg, rgba(${parseInt((driver.team_colour || 'E10600').substring(0, 2), 16)}, ${parseInt((driver.team_colour || 'E10600').substring(2, 4), 16)}, ${parseInt((driver.team_colour || 'E10600').substring(4, 6), 16)}, 0.05) 0%, rgba(0,0,0,0) 100%), #15151e`
                            }}
                        >
                            {/* Gradient Overlay */}
                            <div
                                className='absolute inset-0 opacity-10 pointer-events-none'
                                style={{
                                    background: `radial-gradient(circle at top right, #${driver.team_colour || 'E10600'}, transparent 70%)`
                                }}
                            />

                            {/* Content */}
                            <div className='relative z-10'>
                                {/* Driver Photo */}
                                <div className='mb-4 flex justify-center'>
                                    {driver.headshot_url ? (
                                        <div className='relative'>
                                            <img
                                                src={driver.headshot_url}
                                                alt={driver.full_name}
                                                className='w-auto h-auto max-h-32 object-cover rounded-xl shadow-lg'
                                                style={{
                                                    border: `3px solid #${driver.team_colour || 'E10600'}`,
                                                    boxShadow: `0 0 20px rgba(${parseInt((driver.team_colour || 'E10600').substring(0, 2), 16)}, ${parseInt((driver.team_colour || 'E10600').substring(2, 4), 16)}, ${parseInt((driver.team_colour || 'E10600').substring(4, 6), 16)}, 0.4)`
                                                }}
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                    e.target.nextSibling.style.display = 'flex';
                                                }}
                                            />
                                        </div>
                                    ) : null}
                                    <div
                                        className='w-full h-32 bg-gradient-to-br from-f1-dark to-f1-black rounded-xl items-center justify-center text-4xl font-bold shadow-lg'
                                        style={{
                                            display: driver.headshot_url ? 'none' : 'flex',
                                            color: `#${driver.team_colour || 'E10600'}`,
                                            border: `3px solid #${driver.team_colour || 'E10600'}`,
                                            boxShadow: `0 0 20px rgba(${parseInt((driver.team_colour || 'E10600').substring(0, 2), 16)}, ${parseInt((driver.team_colour || 'E10600').substring(2, 4), 16)}, ${parseInt((driver.team_colour || 'E10600').substring(4, 6), 16)}, 0.4)`
                                        }}
                                    >
                                        {driver.name_acronym}
                                    </div>
                                </div>

                                {/* Divider */}
                                <div
                                    className='h-0.5 w-16 mx-auto mb-4 rounded-full'
                                    style={{ backgroundColor: `#${driver.team_colour || 'E10600'}` }}
                                />

                                {/* Driver Number */}
                                <div
                                    className='text-5xl font-black mb-3 text-center tracking-tight'
                                    style={{
                                        color: `#${driver.team_colour || 'E10600'}`,
                                        textShadow: `0 0 20px rgba(${parseInt((driver.team_colour || 'E10600').substring(0, 2), 16)}, ${parseInt((driver.team_colour || 'E10600').substring(2, 4), 16)}, ${parseInt((driver.team_colour || 'E10600').substring(4, 6), 16)}, 0.5)`
                                    }}
                                >
                                    #{driver.driver_number}
                                </div>

                                {/* Driver Name */}
                                <h1 className='text-2xl font-bold mb-2 text-center text-white tracking-wide'>{driver.full_name}</h1>

                                {/* Team */}
                                <p
                                    className='text-base mb-4 text-center font-semibold tracking-wide'
                                    style={{ color: `#${driver.team_colour || 'E10600'}` }}
                                >
                                    {driver.team_name}
                                </p>

                                {/* Country with actual flag */}
                                <div className='text-center text-base mb-4 text-gray-300'>
                                    <span className='text-2xl mr-2'>{getFlagEmoji(driver.country_code)}</span>
                                    <span className='font-medium'>{driver.country_code}</span>
                                </div>

                                {/* Acronym Badge */}
                                <div className='text-center'>
                                    <span
                                        className='inline-block px-4 py-2 rounded-full font-bold text-base tracking-wider shadow-lg transition-transform duration-200 hover:scale-110'
                                        style={{
                                            backgroundColor: `#${driver.team_colour || 'E10600'}`,
                                            color: '#000',
                                            boxShadow: `0 4px 15px rgba(${parseInt((driver.team_colour || 'E10600').substring(0, 2), 16)}, ${parseInt((driver.team_colour || 'E10600').substring(2, 4), 16)}, ${parseInt((driver.team_colour || 'E10600').substring(4, 6), 16)}, 0.4)`
                                        }}
                                    >
                                        {driver.name_acronym}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className='lg:col-span-2 flex items-center h-full'>
                        <div className='grid grid-cols-2 md:grid-cols-5 gap-4 w-full'>
                            <div className='relative p-5 rounded-2xl text-center overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 border border-red-500/30 bg-gradient-to-br from-red-500/10 to-transparent'>
                                <div className='absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none' />
                                <div className='relative z-10'>
                                    <div className='text-4xl font-black text-f1-red mb-2' style={{ textShadow: '0 0 20px rgba(225, 6, 0, 0.5)' }}>{stats?.totalPoints || 0}</div>
                                    <div className='text-xs font-semibold text-gray-400 uppercase tracking-wider'>Total Points</div>
                                </div>
                            </div>
                            <div className='relative p-5 rounded-2xl text-center overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 border border-yellow-400/30 bg-gradient-to-br from-yellow-400/10 to-transparent'>
                                <div className='absolute inset-0 bg-gradient-to-br from-yellow-400/5 to-transparent pointer-events-none' />
                                <div className='relative z-10'>
                                    <div className='text-4xl font-black text-yellow-400 mb-2' style={{ textShadow: '0 0 20px rgba(250, 204, 21, 0.5)' }}>{stats?.wins || 0}</div>
                                    <div className='text-xs font-semibold text-gray-400 uppercase tracking-wider'>Wins</div>
                                </div>
                            </div>
                            <div className='relative p-5 rounded-2xl text-center overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 border border-orange-400/30 bg-gradient-to-br from-orange-400/10 to-transparent'>
                                <div className='absolute inset-0 bg-gradient-to-br from-orange-400/5 to-transparent pointer-events-none' />
                                <div className='relative z-10'>
                                    <div className='text-4xl font-black text-orange-400 mb-2' style={{ textShadow: '0 0 20px rgba(251, 146, 60, 0.5)' }}>{stats?.podiums || 0}</div>
                                    <div className='text-xs font-semibold text-gray-400 uppercase tracking-wider'>Podiums</div>
                                </div>
                            </div>
                            <div className='relative p-5 rounded-2xl text-center overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 border border-green-400/30 bg-gradient-to-br from-green-400/10 to-transparent'>
                                <div className='absolute inset-0 bg-gradient-to-br from-green-400/5 to-transparent pointer-events-none' />
                                <div className='relative z-10'>
                                    <div className='text-4xl font-black text-green-400 mb-2' style={{ textShadow: '0 0 20px rgba(74, 222, 128, 0.5)' }}>{stats?.bestFinish || 'N/A'}</div>
                                    <div className='text-xs font-semibold text-gray-400 uppercase tracking-wider'>Best Finish</div>
                                </div>
                            </div>
                            <div className='relative p-5 rounded-2xl text-center overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 border border-blue-400/30 bg-gradient-to-br from-blue-400/10 to-transparent'>
                                <div className='absolute inset-0 bg-gradient-to-br from-blue-400/5 to-transparent pointer-events-none' />
                                <div className='relative z-10'>
                                    <div className='text-4xl font-black text-blue-400 mb-2' style={{ textShadow: '0 0 20px rgba(96, 165, 250, 0.5)' }}>{stats?.races || 0}</div>
                                    <div className='text-xs font-semibold text-gray-400 uppercase tracking-wider'>Races</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Season Results Table */}
                <div className='f1-card p-6 rounded-xl'>
                    <h2 className='text-2xl font-bold mb-6'>
                        {year} Season Results
                    </h2>

                    <div className='overflow-x-auto'>
                        <table className='w-full text-center'>
                            <thead>
                                <tr className='border-b border-f1-gray'>
                                    <th className='py-3 px-4'>Round</th>
                                    <th className='py-3 px-4'>Circuit</th>
                                    <th className='py-3 px-4'>Date</th>
                                    <th className='py-3 px-4'>Session</th>
                                    <th className='py-3 px-4'>Position</th>
                                    <th className='py-3 px-4'>Points</th>
                                    <th className='py-3 px-4'>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {seasonResults.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className='py-8 text-gray-400'>
                                            No race results available
                                        </td>
                                    </tr>
                                ) : (
                                    seasonResults.map((item, index) => {
                                        const renderRow = (data, isSprint = false, indent = false) => {
                                            const pos = data.result.position;
                                            const isDNF = data.result.dnf;
                                            const isDNS = data.result.dns;
                                            const isDSQ = data.result.dsq;

                                            let positionColor = '';
                                            let positionText = pos;

                                            if (isDNF) positionText = 'DNF';
                                            else if (isDNS) positionText = 'DNS';
                                            else if (isDSQ) positionText = 'DSQ';
                                            else if (pos === 1) positionColor = 'text-yellow-400 font-bold';
                                            else if (pos === 2) positionColor = 'text-gray-300 font-bold';
                                            else if (pos === 3) positionColor = 'text-orange-400 font-bold';

                                            return (
                                                <tr
                                                    key={data.session.session_key}
                                                    onClick={() => navigate(`/championship/race/${year}/${data.session.session_key}`)}
                                                    className={`border-b border-f1-gray/30 hover:bg-f1-dark/50 transition-colors cursor-pointer ${indent ? 'bg-f1-dark/30' : ''}`}
                                                >
                                                    <td className='py-2 px-4'>{!isSprint ? index + 1 : ''}</td>
                                                    <td className='py-2 px-4'>
                                                        {data.session.location}
                                                    </td>
                                                    <td className='py-3 px-4'>{data.session.date_start.split('T')[0]}</td>
                                                    <td className='py-3 px-4'>
                                                        <span className={`px-2 py-1 rounded text-xs ${isSprint ? 'bg-purple-600' : 'bg-red-600'}`}>
                                                            {isSprint ? 'Sprint' : 'Race'}
                                                        </span>
                                                    </td>
                                                    <td className={`py-3 px-4 text-xl ${positionColor}`}>
                                                        {positionText}
                                                    </td>
                                                    <td className='py-3 px-4'>{data.result.points || 0}</td>
                                                    <td className='py-3 px-4'>
                                                        {isDNF || isDNS || isDSQ ? (
                                                            <span className='px-2 py-1 bg-red-600 rounded text-xs'>
                                                                {positionText}
                                                            </span>
                                                        ) : (
                                                            <span className='px-2 py-1 bg-green-600 rounded text-xs'>
                                                                Finished
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        };

                                        return (
                                            <>
                                                {/* Main Race Row */}
                                                {renderRow(item, false, false)}

                                                {/* Sprint Row (if exists) */}
                                                {item.sprint && renderRow(item.sprint, true, true)}
                                            </>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
