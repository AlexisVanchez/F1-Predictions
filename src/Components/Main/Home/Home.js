import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import Footer from "../../Footer/Footer";
import Header from "../../Header/Header";
import Calendar from "./Calendar/Calendar";
import HomeHero from "./HomeHero";
import TrackTeaser from "./TrackTeaser";

export default function Home() {
  const { schedule } = useSelector((state) => state.user);
  const [nextEvent, setNextEvent] = useState(null);

  useEffect(() => {
    if (schedule && schedule.length > 0) {
      const now = new Date();
      const upcoming = schedule.filter(e =>
        new Date(`${e.date}T${e.time || '14:00:00'}`) >= now &&
        e.raceName.toLowerCase().includes("grand prix")
      );
      setNextEvent(upcoming[0] || schedule[0]);
    }
  }, [schedule]);

  return (
    <div className="min-h-screen bg-[#0b0c10] text-gray-100">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* Dynamic Hero Section */}
        <HomeHero nextEvent={nextEvent} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* Quick Track Preview */}
          <TrackTeaser nextEvent={nextEvent} />

          {/* Dashboard Perks / Coming Soon */}
          <div className="bg-gradient-to-br from-gray-900 to-black rounded-3xl p-8 border border-gray-800 shadow-2xl relative overflow-hidden flex flex-col justify-center">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <svg className="w-64 h-64" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
            </div>
            <h3 className="text-sm font-black text-red-500 uppercase tracking-[0.2em] mb-2">Exclusive Access</h3>
            <h2 className="text-4xl font-black text-white italic mb-4">LEAGUE INSIGHTS</h2>
            <p className="text-gray-400 text-lg max-w-md leading-relaxed">
              Analyze member picks, view live session data, and climb the global rankings.
              The 2026 season is yours to dominate.
            </p>
            <div className="mt-8 flex items-center space-x-4">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-black bg-gray-800 flex items-center justify-center text-[10px] font-bold">
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">+ 1,240 Active Predictions</span>
            </div>
          </div>
        </div>

        {/* Full Interactive Calendar */}
        <div className="pt-8">
          <div className="flex items-center space-x-4 mb-8">
            <div className="h-0.5 flex-grow bg-gradient-to-r from-red-600 to-transparent"></div>
            <h3 className="text-2xl font-black italic text-white tracking-tight uppercase">Full Season Calendar</h3>
            <div className="h-0.5 flex-grow bg-gradient-to-l from-red-600 to-transparent"></div>
          </div>
          <Calendar />
        </div>
      </main>

      <Footer />
    </div>
  );
}