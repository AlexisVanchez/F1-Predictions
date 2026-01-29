import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Header from '../../Header/Header';

export default function LastPrediction() {
    const navigate = useNavigate();
    const { user, bet } = useSelector(state => state.user);
    const [lastPrediction, setLastPrediction] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLastPrediction = async () => {
            try {
                if (!bet || !bet.bet || bet.bet.length === 0) {
                    setLoading(false);
                    return;
                }

                // Get the most recent prediction (sorted by date)
                const sortedBets = [...bet.bet].sort((a, b) => new Date(b.date) - new Date(a.date));
                const mostRecent = sortedBets[0];

                setLastPrediction(mostRecent);
                setLoading(false);

            } catch (err) {
                console.error("Error fetching last prediction:", err);
                setLoading(false);
            }
        };

        fetchLastPrediction();
    }, [bet]);

    if (loading) return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex flex-col">
            <Header />
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <h2 className="text-xl font-bold text-gray-400">Loading Prediction...</h2>
                </div>
            </div>
        </div>
    )

    if (!lastPrediction) return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex flex-col">
            <Header />
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center max-w-md mx-auto p-8">
                    <div className="text-6xl mb-4">🏎️</div>
                    <h2 className="text-2xl font-black text-white mb-2 italic">No Predictions Yet</h2>
                    <p className="text-gray-400 mb-6">You haven't made any predictions yet. Start predicting race results to see them here!</p>
                    <button
                        onClick={() => navigate('/my-predictions')}
                        className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-lg font-bold shadow-lg shadow-red-900/50 transition-all transform hover:-translate-y-0.5"
                    >
                        Make Your First Prediction
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex flex-col">
            <Header />

            <div className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-8 mt-6">

                {/* Header Section */}
                <div className="bg-gradient-to-br from-gray-800/50 to-black/50 backdrop-blur-md rounded-2xl shadow-2xl border border-red-900/30 p-6 mb-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-red-600 rounded-full opacity-10 -mr-16 -mt-16 pointer-events-none blur-3xl"></div>

                    <div className="relative z-10">
                        <div className="flex items-center space-x-3 mb-2">
                            <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">Your Prediction</span>
                            <span className="text-gray-400 text-sm font-medium">
                                {new Date(lastPrediction.date).toLocaleDateString()}
                            </span>
                        </div>
                        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400 tracking-tight mb-1 italic">
                            {lastPrediction.raceName}
                        </h1>
                        <p className="text-xl text-gray-400 font-medium flex items-center">
                            <span className="mr-2">🏁</span> Latest Prediction
                        </p>
                    </div>
                </div>

                {/* Prediction Grid */}
                <div className="bg-gradient-to-br from-gray-800/50 to-black/50 backdrop-blur-md rounded-2xl shadow-2xl border border-red-900/30 overflow-hidden">
                    <div className="bg-gradient-to-r from-red-900/30 to-orange-900/30 border-b border-red-900/30 px-6 py-4">
                        <h3 className="font-black text-white text-lg italic flex items-center">
                            <span className="text-2xl mr-2">🎯</span> Your Top 10 Prediction
                        </h3>
                    </div>

                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {lastPrediction.predictions && lastPrediction.predictions.map((driver, index) => (
                                <div
                                    key={index}
                                    className="flex items-center space-x-4 p-4 bg-gradient-to-r from-gray-900/50 to-gray-800/50 rounded-lg border border-gray-700/50 hover:border-red-600/50 transition-all duration-300 hover:shadow-lg hover:shadow-red-900/20"
                                >
                                    <div className="flex-shrink-0">
                                        <div className={`
                                            w-10 h-10 rounded-full flex items-center justify-center font-black text-lg
                                            ${index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-900' :
                                                index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-gray-900' :
                                                    index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-orange-900' :
                                                        'bg-gradient-to-br from-red-600 to-red-800 text-white'}
                                        `}>
                                            {index + 1}
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-white text-lg italic">{driver}</div>
                                        <div className="text-xs text-gray-500 uppercase tracking-wider">Position {index + 1}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-8 flex gap-4 justify-center">
                    <button
                        onClick={() => navigate('/my-predictions')}
                        className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-lg font-bold shadow-lg shadow-red-900/50 transition-all transform hover:-translate-y-0.5"
                    >
                        Make New Prediction
                    </button>
                    <button
                        onClick={() => navigate('/profile')}
                        className="px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white rounded-lg font-bold shadow-lg transition-all transform hover:-translate-y-0.5"
                    >
                        Back to Profile
                    </button>
                </div>
            </div>
        </div>
    );
}
