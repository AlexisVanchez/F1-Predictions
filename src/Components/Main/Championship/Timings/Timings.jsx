import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../../../Header/Header';

export default function Timings() {
    const { year, sessionKey } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [lapsData, setLapsData] = useState([]);
    const [sessionName, setSessionName] = useState('');
    const [drivers, setDrivers] = useState({});

    // New State for enhancements
    const [selectedLap, setSelectedLap] = useState(1);
    const [maxLaps, setMaxLaps] = useState(0);

    useEffect(() => {
        fetchData();
    }, [sessionKey, year]);

    const fetchData = async () => {
        try {
            setLoading(true);

            const isRoundNumber = parseInt(sessionKey) < 100;
            let currentDriversMap = {};
            let currentSessionName = '';

            if (!isRoundNumber) {
                // TRY OPENF1 FIRST
                try {
                    const yearParam = year ? `&year=${year}` : '';
                    const sessionRes = await fetch(`https://api.openf1.org/v1/sessions?session_key=${sessionKey}${yearParam}`);
                    const sessionData = await sessionRes.json();
                    if (sessionData && sessionData[0]) {
                        setSessionName(sessionData[0].session_name);
                        currentSessionName = sessionData[0].session_name;
                    }

                    const driversRes = await fetch(`https://api.openf1.org/v1/drivers?session_key=${sessionKey}`);
                    const driversData = await driversRes.json();
                    driversData.forEach(d => {
                        currentDriversMap[d.driver_number] = d;
                    });

                    const lapsRes = await fetch(`https://api.openf1.org/v1/laps?session_key=${sessionKey}`);
                    const rawLaps = await lapsRes.json();

                    if (rawLaps.length > 0) {
                        const pitsRes = await fetch(`https://api.openf1.org/v1/pit?session_key=${sessionKey}`);
                        const pitsData = await pitsRes.json();
                        setDrivers(currentDriversMap);
                        processLaps(rawLaps, pitsData, currentDriversMap);
                        setLoading(false);
                        return; // Exit if OpenF1 worked
                    }
                } catch (e) {
                    console.warn("OpenF1 Timing Fetch failed, trying Ergast...");
                }
            }

            // FALLBACK TO ERGAST
            console.log(`🔄 Using Ergast Fallback for ${year} Round ${sessionKey}`);

            // 1. Fetch Drivers from Ergast
            const ergastDriversRes = await fetch(`https://api.jolpi.ca/ergast/f1/${year}/${sessionKey}/drivers.json`);
            if (ergastDriversRes.ok) {
                const ergastDriversData = await ergastDriversRes.json();
                const ergastDrivers = ergastDriversData.MRData.DriverTable.Drivers;

                // Map Ergast drivers (using multiple keys for robust matching)
                ergastDrivers.forEach(d => {
                    const info = {
                        driver_number: parseInt(d.permanentNumber) || 0,
                        full_name: `${d.givenName} ${d.familyName}`,
                        name_acronym: d.code || d.familyName.substring(0, 3).toUpperCase(),
                        team_name: '',
                        team_colour: 'E10600',
                        driver_id: d.driverId // The slug (e.g., 'stroll')
                    };
                    // Store by number AND by slug for fast lookup
                    if (d.permanentNumber) currentDriversMap[d.permanentNumber] = info;
                    currentDriversMap[d.driverId] = info;
                });

                // Get Team Names/Colors from results
                const resultsRes = await fetch(`https://api.jolpi.ca/ergast/f1/${year}/${sessionKey}/results.json`);
                if (resultsRes.ok) {
                    const resultsData = await resultsRes.json();
                    const race = resultsData.MRData.RaceTable.Races[0];
                    if (race) {
                        setSessionName(race.raceName);
                        race.Results.forEach(r => {
                            const driverInfo = currentDriversMap[r.Driver.driverId];
                            if (driverInfo) {
                                driverInfo.team_name = r.Constructor.name;
                                // Basic team color mapping
                                const team = r.Constructor.name.toLowerCase();
                                if (team.includes('red bull')) driverInfo.team_colour = '3671C6';
                                if (team.includes('mercedes')) driverInfo.team_colour = '27F4D2';
                                if (team.includes('ferrari')) driverInfo.team_colour = 'E80020';
                                if (team.includes('mclaren')) driverInfo.team_colour = 'FF8000';
                                if (team.includes('aston martin')) driverInfo.team_colour = '229971';
                                if (team.includes('alpine')) driverInfo.team_colour = '0093CC';
                                if (team.includes('williams')) driverInfo.team_colour = '64C4FF';
                                if (team.includes('rb') || team.includes('alphatauri')) driverInfo.team_colour = '6692FF';
                                if (team.includes('sauber') || team.includes('alfa romeo')) driverInfo.team_colour = '52E252';
                                if (team.includes('haas')) driverInfo.team_colour = 'B6BABD';
                            }
                        });
                    }
                }
            }
            setDrivers(currentDriversMap);

            // 2. Fetch Laps from Ergast (handles large datasets via pagination)
            let allErgastLaps = [];
            let offset = 0;
            const limit = 500; // Safer limit for various Ergast mirrors
            let total = 0;
            let loadedTimings = 0;

            do {
                const lapsUrl = `https://api.jolpi.ca/ergast/f1/${year}/${sessionKey}/laps.json?limit=${limit}&offset=${offset}`;
                console.log(`📡 Fetching Laps Segment: offset=${offset}`);

                const lapsRes = await fetch(lapsUrl);
                if (!lapsRes.ok) break;

                const lapsData = await lapsRes.json();
                const races = lapsData.MRData.RaceTable.Races;
                if (!races || races.length === 0) break;

                const chunkLaps = races[0].Laps;
                allErgastLaps.push(...chunkLaps);

                total = parseInt(lapsData.MRData.total);

                // IMPORTANT: Ergast pagination limit applies to TIMING records, not Laps.
                const timingsInThisChunk = chunkLaps.reduce((acc, lap) => acc + (lap.Timings?.length || 0), 0);
                loadedTimings += timingsInThisChunk;
                offset += timingsInThisChunk;

                if (timingsInThisChunk === 0) break;
            } while (offset < total);

            console.log(`✅ Loaded ${allErgastLaps.length} lap segments (${loadedTimings} timings total)`);

            if (allErgastLaps.length > 0) {
                // 3. Fetch Pit Stops from Ergast
                let pitsData = [];
                try {
                    const pitsRes = await fetch(`https://api.jolpi.ca/ergast/f1/${year}/${sessionKey}/pitstops.json?limit=500`);
                    if (pitsRes.ok) {
                        const pitsResult = await pitsRes.json();
                        pitsData = pitsResult.MRData.RaceTable.Races[0]?.PitStops || [];
                    }
                } catch (e) {
                    console.warn("Ergast Pit Stop Fetch failed");
                }

                // GROUP Split Laps (Ergast pagination can split a lap's timings between responses)
                const mergedLaps = [];
                const lapMap = {};

                allErgastLaps.forEach(lap => {
                    if (!lapMap[lap.number]) {
                        lapMap[lap.number] = { ...lap, Timings: [...lap.Timings] };
                        mergedLaps.push(lapMap[lap.number]);
                    } else {
                        // Merge timings into existing lap object
                        // Use a Set to avoid duplicates if segments overlap
                        const existingDriverIds = new Set(lapMap[lap.number].Timings.map(t => t.driverId));
                        lap.Timings.forEach(t => {
                            if (!existingDriverIds.has(t.driverId)) {
                                lapMap[lap.number].Timings.push(t);
                            }
                        });
                    }
                });

                processErgastLaps(mergedLaps, currentDriversMap, pitsData);
            }

            setLoading(false);
        } catch (error) {
            console.error("Error fetching timings:", error);
            setLoading(false);
        }
    };

    const processErgastLaps = (ergastLaps, driversMap, pitsData) => {
        let lastLapPositions = {};
        let cumulativeTimes = {}; // Track total race time per driver

        const processed = ergastLaps.map(lap => {
            const lapNum = parseInt(lap.number);

            // Map Timings to our standing format using unique tracking keys
            const standings = lap.Timings.map(timing => {
                const slug = timing.driverId;
                const timeParts = timing.time.split(':');
                let lapDuration = 0;
                if (timeParts.length === 2) {
                    lapDuration = parseFloat(timeParts[0]) * 60 + parseFloat(timeParts[1]);
                } else {
                    lapDuration = parseFloat(timeParts[0]);
                }

                // Exact slug lookup for 100% reliability
                const driverInfo = driversMap[slug];

                // Use slug as the source of truth for history tracking to avoid collisions between missing drivers
                const trackingKey = slug;

                if (!cumulativeTimes[trackingKey]) cumulativeTimes[trackingKey] = 0;
                cumulativeTimes[trackingKey] += lapDuration;

                const position = parseInt(timing.position);
                const prevPos = lastLapPositions[trackingKey];
                let posChange = 0;
                if (prevPos !== undefined) {
                    posChange = prevPos - position;
                }

                // Pit Status check using slug
                const hasPitted = pitsData.some(p =>
                    (parseInt(p.lap) === lapNum) && (p.driverId === slug)
                );

                return {
                    driver_number: driverInfo?.driver_number || slug,
                    lap_duration: lapDuration,
                    cumulativeTime: cumulativeTimes[trackingKey],
                    position,
                    posChange,
                    pitted: hasPitted,
                    driverInfo: driverInfo,
                    trackingKey: trackingKey
                };
            });

            // Calculate Gaps relative to the leader of THIS lap
            standings.sort((a, b) => a.position - b.position);
            const leaderTime = standings.length > 0 ? standings[0].cumulativeTime : 0;

            standings.forEach(s => {
                s.gap = s.position === 1 ? 0 : s.cumulativeTime - leaderTime;
            });

            // Update position history for next lap
            lastLapPositions = {};
            standings.forEach(s => lastLapPositions[s.driver_number] = s.position);

            return {
                lapNumber: lapNum,
                standings: standings
            };
        });

        processed.sort((a, b) => a.lapNumber - b.lapNumber);
        setLapsData(processed);
        setMaxLaps(processed.length);
        if (processed.length > 0) setSelectedLap(1);
    };

    const formatLapTime = (seconds) => {
        if (!seconds) return '-';
        const mins = Math.floor(seconds / 60);
        const secs = (seconds % 60).toFixed(3);
        const [s, ms] = secs.split('.');
        const paddedSecs = s.padStart(2, '0');

        if (mins > 0) {
            return `${mins}:${paddedSecs}.${ms}`;
        } else {
            return `${paddedSecs}.${ms}`;
        }
    };

    const processLaps = (rawLaps, pitsData, driversMap) => {
        // Group by lap number
        const lapsByNumber = {};

        rawLaps.forEach(lap => {
            if (!lapsByNumber[lap.lap_number]) {
                lapsByNumber[lap.lap_number] = [];
            }
            if (lap.lap_duration !== null && lap.lap_duration !== undefined) {
                lapsByNumber[lap.lap_number].push(lap);
            }
        });

        const sortedLapNumbers = Object.keys(lapsByNumber).sort((a, b) => Number(a) - Number(b));
        setMaxLaps(sortedLapNumbers.length);

        let lastLapPositions = {};

        const processed = sortedLapNumbers.map(lapNum => {
            const currentLaps = lapsByNumber[lapNum];

            const lapStandings = currentLaps.map(lap => {
                const pitted = pitsData.some(p => p.driver_number === lap.driver_number && p.lap_number === lap.lap_number);
                const finishTime = new Date(lap.date_start).getTime() + (lap.lap_duration * 1000);

                return {
                    driver_number: lap.driver_number,
                    lap_duration: lap.lap_duration,
                    finishTime: finishTime,
                    pitted: pitted,
                    driverInfo: driversMap[lap.driver_number]
                };
            });

            lapStandings.sort((a, b) => a.finishTime - b.finishTime);

            const validStandings = lapStandings.filter(l => l.finishTime > 0);
            const leaderFinishTime = validStandings.length > 0 ? validStandings[0].finishTime : 0;

            const finalStandings = validStandings.map((item, index) => {
                const position = index + 1;
                const gap = index === 0 ? 0 : (item.finishTime - leaderFinishTime) / 1000;

                const prevPos = lastLapPositions[item.driver_number];
                let posChange = 0;
                // If we have history and we are not on lap 1 (or the first available lap in the set)
                if (prevPos !== undefined) {
                    posChange = prevPos - position;
                }

                return {
                    ...item,
                    position,
                    gap,
                    posChange
                };
            });

            // Update history
            lastLapPositions = {};
            finalStandings.forEach(s => lastLapPositions[s.driver_number] = s.position);

            return {
                lapNumber: Number(lapNum),
                standings: finalStandings
            };
        });

        setLapsData(processed);
        if (processed.length > 0) {
            setSelectedLap(1);
        }
    };

    const handleLapChange = (lap) => {
        if (lap >= 1 && lap <= maxLaps) {
            setSelectedLap(lap);
        }
    };

    const currentLapData = lapsData.find(l => l.lapNumber === selectedLap);

    if (loading) {
        return (
            <div className='min-h-screen bg-[#0a0b0f]'>
                <Header />
                <div className='flex items-center justify-center h-96'>
                    <div className='f1-loader mb-4'></div>
                </div>
            </div>
        );
    }

    return (
        <div className='min-h-screen bg-[#0a0b0f] text-white pb-20'>
            <Header />
            <div className='max-w-7xl mx-auto px-4 py-8'>

                {/* Header info */}
                <div className='mb-12'>
                    <button
                        onClick={() => navigate(-1)}
                        className='mb-8 px-5 py-2.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-3 text-sm font-bold tracking-tight uppercase'
                    >
                        <span className="text-f1-red">←</span> Back to Session
                    </button>

                    <div className='relative overflow-hidden rounded-3xl border border-white/5 bg-[#15151e] shadow-2xl p-8 md:p-12 mb-8'>
                        <div className="absolute top-0 left-0 w-2 h-full bg-f1-red"></div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-f1-red/10 blur-[100px] -mr-32 -mt-32"></div>

                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
                            <div>
                                <h1 className='text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-white mb-2 leading-none'>
                                    {sessionName || 'LIVE TIMINGS'}
                                </h1>
                                <div className='flex items-center gap-3'>
                                    <span className="w-2 h-2 bg-f1-red rounded-full animate-pulse"></span>
                                    <h2 className='text-xs font-black uppercase tracking-[0.3em] text-gray-500'>
                                        Lap-by-Lap Telemetry Analysis {year ? `| ${year} SEASON` : ''}
                                    </h2>
                                </div>
                            </div>

                            {/* Lap Switcher - Integrated in Header */}
                            {maxLaps > 0 && (
                                <div className='flex items-center gap-4 bg-white/5 backdrop-blur-xl p-3 rounded-2xl border border-white/10'>
                                    <button
                                        onClick={() => handleLapChange(selectedLap - 1)}
                                        disabled={selectedLap <= 1}
                                        className='w-12 h-12 flex items-center justify-center bg-white/5 rounded-xl hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all border border-white/5'
                                    >
                                        <span className="text-xl">←</span>
                                    </button>

                                    <div className='flex flex-col items-center px-4'>
                                        <span className='text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-1'>SELECT LAP</span>
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={selectedLap}
                                                onChange={(e) => handleLapChange(Number(e.target.value))}
                                                className='bg-transparent border-none text-2xl font-black italic text-white focus:outline-none appearance-none cursor-pointer text-center'
                                            >
                                                {lapsData.map(l => (
                                                    <option key={l.lapNumber} value={l.lapNumber} className="bg-[#15151e]">{l.lapNumber}</option>
                                                ))}
                                            </select>
                                            <span className="text-gray-500 font-bold">/</span>
                                            <span className='text-gray-500 font-bold'>{maxLaps}</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleLapChange(selectedLap + 1)}
                                        disabled={selectedLap >= maxLaps}
                                        className='w-12 h-12 flex items-center justify-center bg-white/5 rounded-xl hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all border border-white/5'
                                    >
                                        <span className="text-xl">→</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {currentLapData ? (
                    <div className='animate-fade-in'>
                        <div className='mb-6 flex items-center justify-between'>
                            <h3 className='text-2xl font-black italic uppercase tracking-tighter flex items-center gap-3'>
                                <span className="w-2 h-6 bg-f1-red rounded-full"></span>
                                Standings at Lap {currentLapData.lapNumber}
                            </h3>
                            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest hidden md:block">
                                {currentLapData.standings.length} DRIVERS ACTIVE
                            </div>
                        </div>

                        <div className='overflow-x-auto overflow-y-visible pr-2'>
                            <table className='w-full border-separate border-spacing-y-3'>
                                <thead>
                                    <tr className='text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]'>
                                        <th className='py-2 px-6 text-center'>Pos</th>
                                        <th className='py-2 px-6 text-center'>Gain/Loss</th>
                                        <th className='py-2 px-6 text-left'>Driver</th>
                                        <th className='py-2 px-6 text-right'>Lap Time</th>
                                        <th className='py-2 px-6 text-right'>Interval</th>
                                        <th className='py-2 px-6 text-center'>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentLapData.standings.map((standing) => {
                                        const teamColor = `#${standing.driverInfo?.team_colour || 'E10600'}`;
                                        const isPodium = standing.position <= 3;

                                        return (
                                            <tr key={standing.trackingKey || standing.driver_number} className='group transition-all duration-300 hover:scale-[1.01]'>
                                                {/* Position */}
                                                <td className="px-6 py-5 bg-[#1e1f24]/60 backdrop-blur-md rounded-l-2xl border-y border-l border-white/5 group-hover:bg-[#25262c] transition-all relative text-center">
                                                    {isPodium && (
                                                        <div
                                                            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full"
                                                            style={{ backgroundColor: teamColor }}
                                                        ></div>
                                                    )}
                                                    <span className={`text-2xl font-black italic ${standing.position === 1 ? 'text-yellow-400' :
                                                        standing.position === 2 ? 'text-gray-300' :
                                                            standing.position === 3 ? 'text-orange-400' : 'text-gray-500'
                                                        }`}>
                                                        {standing.position}
                                                    </span>
                                                </td>

                                                {/* Position Change */}
                                                <td className="px-6 py-5 bg-[#1e1f24]/60 backdrop-blur-md border-y border-white/5 group-hover:bg-[#25262c] transition-all text-center">
                                                    {standing.posChange > 0 ? (
                                                        <span className='inline-flex items-center gap-1 font-black text-green-400 text-sm italic'>
                                                            ▲ {standing.posChange}
                                                        </span>
                                                    ) : standing.posChange < 0 ? (
                                                        <span className='inline-flex items-center gap-1 font-black text-f1-red text-sm italic'>
                                                            ▼ {Math.abs(standing.posChange)}
                                                        </span>
                                                    ) : (
                                                        <span className='text-gray-700 font-bold'>-</span>
                                                    )}
                                                </td>

                                                {/* Driver */}
                                                <td className="px-6 py-5 bg-[#1e1f24]/60 backdrop-blur-md border-y border-white/5 group-hover:bg-[#25262c] transition-all">
                                                    <div className='flex items-center gap-4'>
                                                        <div
                                                            className="w-1.5 h-8 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]"
                                                            style={{ backgroundColor: teamColor }}
                                                        ></div>
                                                        <div>
                                                            <div className='font-black text-white text-lg italic uppercase tracking-tighter leading-none'>
                                                                {standing.driverInfo?.full_name || standing.driver_number}
                                                            </div>
                                                            <div className='text-[10px] font-black uppercase tracking-widest mt-1 opacity-60'>
                                                                {standing.driverInfo?.team_name || 'Independent'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Lap Time */}
                                                <td className="px-6 py-5 bg-[#1e1f24]/60 backdrop-blur-md border-y border-white/5 group-hover:bg-[#25262c] text-right font-mono text-base text-gray-300 transition-all">
                                                    {formatLapTime(standing.lap_duration)}
                                                </td>

                                                {/* Interval */}
                                                <td className="px-6 py-5 bg-[#1e1f24]/60 backdrop-blur-md border-y border-white/5 group-hover:bg-[#25262c] text-right font-mono transition-all">
                                                    {standing.gap === 0 ? (
                                                        <span className="text-yellow-400 font-black italic text-xs uppercase tracking-widest">Interval</span>
                                                    ) : (
                                                        <span className='text-gray-400 text-sm'>+{standing.gap.toFixed(3)}s</span>
                                                    )}
                                                </td>

                                                {/* Status */}
                                                <td className="px-6 py-5 bg-[#1e1f24]/60 backdrop-blur-md rounded-r-2xl border-y border-r border-white/5 group-hover:bg-[#25262c] text-center transition-all">
                                                    {standing.pitted ? (
                                                        <span className='px-2 py-0.5 bg-white text-black text-[10px] font-black rounded uppercase tracking-tighter'>
                                                            PIT STOP
                                                        </span>
                                                    ) : (
                                                        <span className='w-2 h-2 rounded-full bg-green-500/50 inline-block'></span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className='text-center py-24 bg-[#15151e] rounded-3xl border border-dashed border-white/10'>
                        <div className="text-4xl mb-4">📡</div>
                        <h3 className="text-xl font-black italic uppercase tracking-tighter text-gray-500">Telemetry Data Unavailable</h3>
                        <p className="text-gray-600 text-sm mt-2">Connecting to OpenF1 stream...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
