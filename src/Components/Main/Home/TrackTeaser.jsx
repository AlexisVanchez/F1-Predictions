
import React, { useEffect, useState } from 'react';
import { geoJsonToSvgPath } from '../../../utils/geoUtils';
import locations from '../../../f1-circuits-data/f1-locations.json';
import { CIRCUIT_STATS } from '../../../utils/circuitStats';

export default function TrackTeaser({ nextEvent }) {
    const [path, setPath] = useState('');
    const [stats, setStats] = useState(null);

    useEffect(() => {
        if (!nextEvent) return;

        async function loadTrack() {
            const locality = nextEvent.Circuit.Location.locality;
            const LOCATION_OVERRIDES = {
                "Sakhir": "Sakhir", "Spa": "Spa Francorchamps", "Abu Dhabi": "Yas Marina", "Montréal": "Montreal"
            };
            const searchKey = LOCATION_OVERRIDES[locality] || locality;

            const match = locations.find(l =>
                l.location.toLowerCase() === searchKey.toLowerCase() ||
                nextEvent.Circuit.circuitName.toLowerCase().includes(l.location.toLowerCase())
            );

            if (match) {
                try {
                    const geoJsonPath = require(`../../../f1-circuits-data/circuits/${match.id}.geojson`);
                    const response = await fetch(geoJsonPath);
                    const geoJson = await response.json();
                    setPath(geoJsonToSvgPath(geoJson));
                    setStats(CIRCUIT_STATS[searchKey] || CIRCUIT_STATS[match.location]);
                } catch (e) {
                    console.error("Teaser map fail", e);
                }
            }
        }
        loadTrack();
    }, [nextEvent]);

    if (!nextEvent) return null;

    return (
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group">
            {/* Map Preview */}
            <div className="w-full md:w-1/2 aspect-square flex items-center justify-center p-4 bg-gray-50 rounded-2xl relative">
                {path ? (
                    <>
                        <svg viewBox="0 0 105 105" className="w-full h-full drop-shadow-lg filter group-hover:scale-110 transition-transform duration-500">
                            <path d={path} fill="transparent" stroke="#e10600" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <div className="absolute bottom-4 right-4 text-[10px] font-black text-gray-300 uppercase rotate-12 select-none">
                            {nextEvent.round}
                        </div>
                    </>
                ) : (
                    <div className="text-gray-300 text-xs font-bold uppercase tracking-widest">Map Loading...</div>
                )}
            </div>

            {/* Info Section */}
            <div className="w-full md:w-1/2">
                <h3 className="text-sm font-black text-red-600 uppercase tracking-widest mb-1">Track Spotlight</h3>
                <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tighter leading-tight">
                    {nextEvent.Circuit.circuitName}
                </h2>

                <div className="grid grid-cols-2 gap-4">
                    <TeaserStat label="Length" value={stats?.length || "5.281km"} />
                    <TeaserStat label="Laps" value={stats?.laps || "57"} />
                    <TeaserStat label="Turns" value={stats?.turns || "16"} />
                    <TeaserStat label="Record" value={stats?.record || "1:31.447"} />
                </div>

                <div className="mt-6 flex items-center text-xs font-bold text-gray-500 uppercase tracking-widest">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                    Simulation Ready
                </div>
            </div>
        </div>
    );
}

function TeaserStat({ label, value }) {
    return (
        <div className="p-3 bg-gray-100/50 rounded-xl border border-gray-100">
            <div className="text-[10px] font-black text-gray-400 uppercase mb-0.5">{label}</div>
            <div className="text-sm font-bold text-gray-800 tracking-tight">{value}</div>
        </div>
    );
}
