import React, { useState } from 'react';
import { CIRCUIT_DATA } from './circuitData';

export default function CircuitMap({ circuitName }) {
    // Robust Matching
    const dataKey = Object.keys(CIRCUIT_DATA).find(k =>
        circuitName?.toLowerCase().includes(k.toLowerCase()) ||
        k.toLowerCase().includes(circuitName?.toLowerCase())
    );
    const data = dataKey ? CIRCUIT_DATA[dataKey] : null;

    const [hoveredTurn, setHoveredTurn] = useState(null);

    if (!data) return (
        <div className="h-64 flex items-center justify-center bg-gray-900/30 rounded-2xl border border-dashed border-gray-700">
            <p className="text-gray-500 text-sm italic">Track layout visualization unavailable</p>
        </div>
    );

    return (
        <div className="relative group">
            <div className="absolute -inset-4 bg-gradient-to-br from-f1-red/10 to-blue-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl -z-10"></div>

            <svg
                viewBox={data.viewBox}
                className="w-full h-auto max-h-[400px] drop-shadow-2xl"
                xmlns="http://www.w3.org/2000/svg"
            >
                {/* Track Glow Effect */}
                <path
                    d={data.path}
                    fill="none"
                    stroke="#FF1801"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="opacity-20 blur-md transition-all duration-300"
                />

                {/* Main Track Path */}
                <path
                    d={data.path}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                />

                {/* Turn Markers */}
                {data.turns.map((turn) => (
                    <g
                        key={turn.number}
                        onMouseEnter={() => setHoveredTurn(turn)}
                        onMouseLeave={() => setHoveredTurn(null)}
                        className="cursor-help transition-all duration-200"
                    >
                        {/* Interactive Zone */}
                        <circle
                            cx={turn.x} cy={turn.y} r="15"
                            fill="transparent"
                        />

                        {/* Marker Circle */}
                        <circle
                            cx={turn.x} cy={turn.y} r="10"
                            fill={hoveredTurn?.number === turn.number ? "#FF1801" : "#1a1b1f"}
                            stroke="#ffffff"
                            strokeWidth="1.5"
                            className="transition-colors duration-300"
                        />

                        {/* Turn Number */}
                        <text
                            x={turn.x} y={turn.y}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize="9"
                            fontWeight="900"
                            fill={hoveredTurn?.number === turn.number ? "#ffffff" : "#ffffff"}
                            className="select-none pointer-events-none"
                        >
                            {turn.number}
                        </text>

                        {/* Hover Tooltip (Inside SVG for positioning) */}
                        {hoveredTurn?.number === turn.number && (
                            <foreignObject x={turn.x + 15} y={turn.y - 15} width="120" height="40">
                                <div className="bg-black/90 border border-f1-red text-[10px] font-bold text-white px-2 py-1 rounded shadow-xl animate-in fade-in zoom-in duration-200">
                                    {turn.label || `Turn ${turn.number}`}
                                </div>
                            </foreignObject>
                        )}
                    </g>
                ))}
            </svg>

            {/* Technical Specs Footer */}
            <div className="mt-4 flex justify-between items-end px-2">
                <div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Circuit Length</div>
                    <div className="text-lg font-bold text-white">{data.length}</div>
                </div>
                <div className="text-right">
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Total Laps</div>
                    <div className="text-lg font-bold text-white">{data.laps}</div>
                </div>
            </div>
        </div>
    );
}
