
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import locations from '../../../../f1-circuits-data/f1-locations.json';
import { geoJsonToSvgPath } from '../../../../utils/geoUtils';
import { CIRCUIT_STATS } from '../../../../utils/circuitStats';
import Header from '../../../Header/Header';

export default function UpcomingRace() {
    const { schedule } = useSelector((state) => state.user);
    const [nextEvent, setNextEvent] = useState(null);
    const [trackData, setTrackData] = useState(null);
    const [trackPath, setTrackPath] = useState('');
    const [previousWinner, setPreviousWinner] = useState(null);
    // eslint-disable-next-line no-unused-vars
    const [loading, setLoading] = useState(true);

    // Find next event
    useEffect(() => {
        if (schedule && schedule.length > 0) {
            const now = new Date();
            // Filter future events AND ensure it's a Grand Prix (exclude testing)
            const upcoming = schedule.filter(e =>
                new Date(e.date) >= now &&
                e.raceName.toLowerCase().includes("grand prix")
            );

            if (upcoming.length > 0) {
                setNextEvent(upcoming[0]);
            } else {
                // Return fallback if no future GPs
                const allGPs = schedule.filter(e => e.raceName.toLowerCase().includes("grand prix"));
                setNextEvent(allGPs[allGPs.length - 1]);
            }
        }
    }, [schedule]);

    // Fetch Track Data & Stats
    useEffect(() => {
        async function fetchTrackAndStats() {
            if (!nextEvent) return;

            setLoading(true);

            // 1. Find Circuit ID from f1-locations.json
            const locality = nextEvent.Circuit.Location.locality;
            const country = nextEvent.Circuit.Location.country;

            // Manual overrides for known discrepancies between OpenF1 and f1-circuits
            const LOCATION_OVERRIDES = {
                "Sakhir": "Sakhir",
                "Bahrain": "Sakhir",
                "Jeddah": "Jeddah",
                "Melbourne": "Melbourne",
                "Baku": "Baku",
                "Miami": "Miami",
                "Imola": "Imola",
                "Monte-Carlo": "Monaco",
                "Monaco": "Monaco",
                "Barcelona": "Barcelona",
                "Montréal": "Montreal",
                "Montreal": "Montreal",
                "Spielberg": "Spielberg",
                "Silverstone": "Silverstone",
                "Budapest": "Budapest",
                "Spa-Francorchamps": "Spa Francorchamps",
                "Zandvoort": "Zandvoort",
                "Monza": "Monza",
                "Singapore": "Singapore",
                "Suzuka": "Suzuka",
                "Lusail": "Lusail",
                "Austin": "Austin",
                "Mexico City": "Mexico City",
                "São Paulo": "Sao Paulo",
                "Las Vegas": "Las Vegas",
                "Yas Marina": "Yas Marina",
                "Abu Dhabi": "Yas Marina",
                "Shanghai": "Shanghai",
                "Monte Carlo": "Monaco",
                "Spa": "Spa Francorchamps"
            };

            const searchKey = LOCATION_OVERRIDES[locality] || locality;

            let locationMatch = locations.find(l =>
                l.location.toLowerCase() === searchKey.toLowerCase()
            );

            // Fallback soft matches
            if (!locationMatch) {
                locationMatch = locations.find(l =>
                    nextEvent.Circuit.circuitName.toLowerCase().includes(l.location.toLowerCase()) ||
                    country.toLowerCase().includes(l.location.toLowerCase())
                );
            }

            if (locationMatch) {
                setTrackData(locationMatch);
                try {
                    // Webpack returns a path to the file, not the content
                    // We need to fetch it
                    /* eslint-disable-next-line import/no-dynamic-require, global-require */
                    const geoJsonPath = require(`../../../../f1-circuits-data/circuits/${locationMatch.id}.geojson`);

                    const response = await fetch(geoJsonPath);
                    const geoJson = await response.json();

                    const path = geoJsonToSvgPath(geoJson);
                    setTrackPath(path);

                } catch (e) {
                    console.error("Could not load circuit map", e);
                    setTrackPath('');
                }
            }

            // 2. Static Stats (Length, Record)
            // eslint-disable-next-line no-unused-vars
            const circuitInfo = CIRCUIT_STATS[searchKey] || CIRCUIT_STATS[locationMatch?.location] || {};

            // 3. Fetch Previous Winner & Total Laps
            try {
                const prevYear = new Date().getFullYear() - 1;

                setPreviousWinner({
                    driver: "Loading...",
                    team: "...",
                    year: prevYear,
                    laps: "TBD"
                });

                // Fetch Race Session for previous year
                const res = await fetch(`https://api.openf1.org/v1/sessions?year=${prevYear}&circuit_short_name=${nextEvent.Circuit.circuitName}&session_name=Race`);
                if (res.ok) {
                    const sessions = await res.json();
                    if (sessions.length > 0) {
                        const sessionKey = sessions[0].session_key;

                        // A. Get Total Laps (from Position 1 endpoint)
                        const posRes = await fetch(`https://api.openf1.org/v1/position?session_key=${sessionKey}&position=1`);
                        const posData = await posRes.json();

                        if (posData.length > 0) {
                            const maxLap = Math.max(...posData.map(d => d.lap_number));

                            // B. Get Winner Driver Info
                            const winnerEntry = posData[posData.length - 1];
                            const driverNum = winnerEntry.driver_number;

                            const driverRes = await fetch(`https://api.openf1.org/v1/drivers?session_key=${sessionKey}&driver_number=${driverNum}`);
                            const driverInfo = await driverRes.json();
                            const winnerName = driverInfo[0]?.full_name || "Unknown";
                            const winnerTeam = driverInfo[0]?.team_name || "Unknown";

                            setPreviousWinner(prev => ({
                                ...prev,
                                driver: winnerName,
                                team: winnerTeam,
                                laps: maxLap
                            }));
                        }
                    }
                }
            } catch (e) {
                console.error("Error fetching stats", e);
            }

            setLoading(false);
        }

        fetchTrackAndStats();
    }, [nextEvent]);

    if (!nextEvent) return <div className="p-10 text-center text-gray-500">Loading upcoming race...</div>;

    // eslint-disable-next-line no-unused-vars
    const eventDateLines = new Date(nextEvent.date).toDateString().split(' '); // [Day, Month, Date, Year]

    return (
        <>
            <Header />
            <div className="flex flex-col w-full h-full bg-gray-50 min-h-screen animate-fade-in-up">
                {/* Header Hero */}
                <div className="w-full bg-gradient-to-r from-red-600 to-red-800 text-white p-6 shadow-lg">
                    <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center">
                        <div>
                            <h4 className="text-red-200 text-sm uppercase font-bold tracking-widest mb-1">Upcoming Event</h4>
                            <h1 className="text-4xl font-extrabold italic">{nextEvent.raceName}</h1>
                            <div className="flex items-center space-x-2 mt-2">
                                <span className="bg-red-900/50 px-3 py-1 rounded text-sm font-mono">{nextEvent.Circuit.Location.locality}, {nextEvent.Circuit.Location.country}</span>
                                <span className="bg-red-900/50 px-3 py-1 rounded text-sm font-mono">{nextEvent.date}</span>
                            </div>
                        </div>
                        <div className="mt-6 md:mt-0 text-right">
                            <div className="text-3xl font-bold font-mono">{nextEvent.time ? nextEvent.time.substring(0, 5) : 'TBA'}</div>
                            <div className="text-xs text-red-100 uppercase tracking-widest">Local Start Time</div>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="max-w-7xl mx-auto w-full p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column: Track Map */}
                    <div className="lg:col-span-2 flex flex-col space-y-6">
                        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 font-bold text-9xl text-gray-900 pointer-events-none select-none">
                                {trackData ? trackData.id.split('-')[1] : ''}
                            </div>

                            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                                Track Layout
                                {trackData && <span className="ml-3 text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full uppercase tracking-wider">{trackData.name}</span>}
                            </h2>

                            <div className="w-full h-96 flex items-center justify-center p-4 bg-gray-50/50 rounded-xl relative">
                                {trackPath ? (
                                    <svg viewBox="0 0 105 105" className="w-full h-full drop-shadow-2xl filter transform transition-transform duration-500 group-hover:scale-105">
                                        <path d={trackPath} fill="transparent" stroke="#e10600" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-draw" />
                                    </svg>
                                ) : (
                                    <div className="text-gray-400 font-medium">Map data unavailable</div>
                                )}
                            </div>

                            {/* Track Stats strip */}
                            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                <StatBox label="First GP" value={trackData ? trackData.id.split('-')[1] : 'N/A'} />
                                <StatBox label="Laps" value={previousWinner?.laps || CIRCUIT_STATS[trackData?.location]?.laps || "TBD"} />
                                <StatBox label="Length" value={CIRCUIT_STATS[trackData?.location]?.length || "TBD"} />
                                <StatBox label="Lap Record" value={CIRCUIT_STATS[trackData?.location]?.record || "TBD"} />
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Info & History */}
                    <div className="flex flex-col space-y-6">

                        {/* Previous Winner Card */}
                        <div className="bg-gradient-to-br from-gray-900 to-black text-white rounded-2xl shadow-2xl p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-red-600 rounded-full filter blur-3xl opacity-20 -mr-10 -mt-10"></div>
                            <h3 className="text-lg font-bold text-gray-300 uppercase tracking-widest border-b border-gray-700 pb-2 mb-4">Last Winner</h3>

                            <div className="flex items-center space-x-4">
                                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center text-2xl">🏆</div>
                                <div>
                                    <div className="text-2xl font-bold text-white">{previousWinner?.driver || "TBA"}</div>
                                    <div className="text-sm text-gray-400">{previousWinner?.team || "Unknown Team"}</div>
                                    <div className="text-xs text-red-500 mt-1 font-mono">{previousWinner?.year}</div>
                                </div>
                            </div>
                        </div>

                        {/* Schedule Card */}
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                            <h3 className="text-lg font-bold text-gray-800 uppercase tracking-widest border-b border-gray-100 pb-2 mb-4">Weekend Schedule</h3>
                            <div className="space-y-3">
                                {/* Reusing logic if available in nextEvent, else placeholders */}
                                <ScheduleRow session="FP1" time={nextEvent.FirstPractice?.time} date={nextEvent.FirstPractice?.date} />
                                <ScheduleRow session="FP2" time={nextEvent.SecondPractice?.time} date={nextEvent.SecondPractice?.date} />
                                <ScheduleRow session="FP3" time={nextEvent.ThirdPractice?.time} date={nextEvent.ThirdPractice?.date} />
                                <ScheduleRow session="Quali" time={nextEvent.Qualifying?.time} date={nextEvent.Qualifying?.date} highlight />
                                <ScheduleRow session="Race" time={nextEvent.time} date={nextEvent.date} highlight red />
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </>
    );
}

function StatBox({ label, value }) {
    return (
        <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500 uppercase font-semibold">{label}</div>
            <div className="text-lg font-bold text-gray-800">{value}</div>
        </div>
    )
}

function ScheduleRow({ session, time, date, highlight, red }) {
    const convertTime = (t) => {
        if (!t) return "TBA";
        return t.substring(0, 5);
    }

    return (
        <div className={`flex justify-between items-center p-3 rounded-lg ${highlight ? 'bg-gray-50 font-semibold' : ''} ${red ? 'bg-red-50 text-red-600' : ''}`}>
            <div>
                <div className="text-sm">{session}</div>
                <div className="text-xs text-gray-400">{date || 'TBA'}</div>
            </div>
            <div className="font-mono text-sm">{convertTime(time)}</div>
        </div>
    )
}
