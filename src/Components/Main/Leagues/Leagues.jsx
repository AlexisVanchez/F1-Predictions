import React from 'react';
import Header from '../../Header/Header';
import LeagueManager from './LeagueManager';

export default function Leagues() {
    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col">
            <Header />
            <div className="flex-grow container mx-auto p-4 md:p-8">
                <h1 className="text-3xl font-bold mb-6 text-center text-red-500 uppercase tracking-widest">Leagues Hub</h1>
                <LeagueManager />
            </div>
        </div>
    );
}
