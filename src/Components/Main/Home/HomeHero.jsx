
import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';

export default function HomeHero({ nextEvent }) {
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

    useEffect(() => {
        if (!nextEvent) return;

        const timer = setInterval(() => {
            const now = new Date();
            const raceTime = new Date(`${nextEvent.date}T${nextEvent.time || '14:00:00'}`);
            const diff = raceTime - now;

            if (diff <= 0) {
                clearInterval(timer);
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
            } else {
                setTimeLeft({
                    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((diff / 1000 / 60) % 60),
                    seconds: Math.floor((diff / 1000) % 60)
                });
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [nextEvent]);

    if (!nextEvent) return null;

    return (
        <div className="relative w-full h-[500px] overflow-hidden rounded-3xl mb-8 bg-gray-900 group">
            {/* Background Image / Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-red-600 via-red-800 to-black opacity-90"></div>

            {/* Animated Race Line */}
            <div className="absolute bottom-0 left-0 w-full h-1 bg-red-500/30">
                <div className="h-full bg-red-500 animate-pulse w-1/3 shadow-[0_0_15px_rgba(239,68,68,0.8)]"></div>
            </div>

            <div className="relative z-10 h-full flex flex-col items-center justify-center text-center p-6">
                <span className="px-4 py-1.5 bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-black rounded-full uppercase tracking-widest mb-4 inline-block shadow-lg">
                    Next Grand Prix
                </span>

                <h1 className="text-5xl md:text-7xl font-black text-white italic tracking-tighter mb-2 group-hover:scale-105 transition-transform duration-700">
                    {nextEvent.raceName.toUpperCase()}
                </h1>

                <div className="flex items-center space-x-3 text-red-200 font-bold mb-8 text-lg">
                    <span className="bg-red-950/40 px-3 py-1 rounded-lg border border-red-500/20">{nextEvent.Circuit.Location.locality}</span>
                    <span className="text-red-500">/</span>
                    <span className="bg-red-950/40 px-3 py-1 rounded-lg border border-red-500/20 font-mono">{nextEvent.date}</span>
                </div>

                {/* Countdown Grid */}
                <div className="grid grid-cols-4 gap-4 md:gap-8 mb-10 w-full max-w-2xl">
                    <CountdownUnit value={timeLeft.days} label="Days" />
                    <CountdownUnit value={timeLeft.hours} label="Hours" />
                    <CountdownUnit value={timeLeft.minutes} label="Mins" />
                    <CountdownUnit value={timeLeft.seconds} label="Secs" />
                </div>

                <div className="flex flex-wrap justify-center gap-4">
                    <NavLink
                        to="/my-predictions"
                        className="px-8 py-4 bg-white text-red-600 rounded-2xl font-black text-lg uppercase tracking-tight shadow-2xl shadow-black/40 hover:-translate-y-1 transition-all active:scale-95"
                    >
                        Place Predictions
                    </NavLink>
                    <NavLink
                        to="/upcoming-race"
                        className="px-8 py-4 bg-red-600/20 backdrop-blur-xl border border-white/20 text-white rounded-2xl font-black text-lg uppercase tracking-tight hover:bg-red-600/40 transition-all"
                    >
                        Circuit Details
                    </NavLink>
                </div>
            </div>

            {/* Side Labels */}
            <div className="absolute left-6 top-1/2 -translate-y-1/2 hidden lg:block">
                <div className="text-[100px] font-black text-white/5 select-none origin-center -rotate-90 italic">
                    {nextEvent.Circuit.Location.country}
                </div>
            </div>
        </div>
    );
}

function CountdownUnit({ value, label }) {
    return (
        <div className="flex flex-col items-center">
            <div className="text-4xl md:text-6xl font-black text-white bg-white/5 backdrop-blur-xl w-full py-4 rounded-2xl border border-white/10 shadow-inner">
                {String(value).padStart(2, '0')}
            </div>
            <span className="text-xs uppercase font-black text-red-300 mt-2 tracking-widest">{label}</span>
        </div>
    );
}
