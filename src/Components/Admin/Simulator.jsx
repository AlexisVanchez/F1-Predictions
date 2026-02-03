import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { SimulatorService } from "../../utils/SimulatorService";
import { calculateLeaguePoints, fetchUserLeagues, fetchDriverStandings } from "../../redux/reducer";
import { firestore } from "../../redux/firebase_config";
import firebase from "firebase/compat/app";
import Header from "../Header/Header";

const Simulator = ({ isEmbedded = false }) => {
    const dispatch = useDispatch();
    const user = useSelector(state => state.user.user);
    const leagues = useSelector(state => state.user.leagues);
    const drivers = useSelector(state => state.user.drivers);
    const schedule = useSelector(state => state.user.schedule);

    const [status, setStatus] = useState("");
    const [mockUsers, setMockUsers] = useState([]);
    const [selectedLeagueId, setSelectedLeagueId] = useState("");
    const [selectedRace, setSelectedRace] = useState("Test Grand Prix");
    const [simulationMode, setSimulationMode] = useState('single'); // 'single' | 'multi'
    const [raceCount, setRaceCount] = useState(5);
    const [manualResults, setManualResults] = useState({
        result: ["VER", "LEC", "NOR", "HAM", "SAI", "PIA", "RUS", "PER", "ALO", "HUL"],
        medianPitstops: 2,
        redFlags: 0,
        safetyCarCount: 0
    });

    useEffect(() => {
        if (user) {
            dispatch(fetchUserLeagues(user.uid));
        }
    }, [user, dispatch]);

    useEffect(() => {
        if (drivers.length === 0) {
            dispatch(fetchDriverStandings());
        }
    }, [drivers.length, dispatch]);

    const handleSeedUsers = async () => {
        if (!selectedLeagueId) {
            setStatus("Please select a league first.");
            return;
        }
        setStatus("Seeding users...");
        try {
            const users = await SimulatorService.seedMockUsers(10);
            setMockUsers(users);

            // Auto-join them to the selected league
            const joinedCount = await SimulatorService.joinMockUsersToLeague(
                users.map(u => u.uid),
                selectedLeagueId
            );

            setStatus(`✅ Successfully seeded ${users.length} mock users and added them to the league!`);
        } catch (error) {
            setStatus(`Error seeding: ${error.message}`);
        }
    };

    const handleGeneratePredictions = async () => {
        if (mockUsers.length === 0) {
            setStatus("Please seed users first.");
            return;
        }
        setStatus("Generating predictions...");
        try {
            const driverCodes = drivers.map(d => d.code || d.broadcast_name.split(' ').pop());
            await SimulatorService.generateMockPredictions(
                mockUsers.map(u => u.uid),
                selectedRace,
                driverCodes.length > 0 ? driverCodes : ["VER", "LEC", "NOR", "HAM", "SAI", "PIA", "RUS", "PER", "ALO", "HUL"]
            );
            setStatus("Generated randomized predictions for mock users!");
        } catch (error) {
            setStatus(`Error generating: ${error.message}`);
        }
    };

    const handleSimulateScoring = async () => {
        if (!selectedLeagueId) {
            setStatus("Please select a league.");
            return;
        }
        setStatus("Simulating scoring...");
        try {
            // SAVE OFFICIAL RESULT (required for Achievements)
            // Mock pole as P1 if not manually set (or add manual pole input later)
            const pole = manualResults.result[0];

            await firestore.collection('races').doc(selectedRace).set({
                result: manualResults.result,
                polePosition: pole, // Default to P1 for now
                medianPitstops: manualResults.medianPitstops,
                status: "Final (Manual Sim)",
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            const result = await dispatch(calculateLeaguePoints(selectedLeagueId, selectedRace, {
                ...manualResults,
                polePosition: pole
            }));
            if (result.success) {
                setStatus(`✅ Scoring completed! Go to League Manager → ${selectedRace} → History Tab to see results.`);
            } else {
                setStatus(`Scoring failed: ${result.error}`);
            }
        } catch (error) {
            setStatus(`Error: ${error.message}`);
        }
    };

    const generateRandomResults = (driverCodes) => {
        // Shuffle drivers for random results
        const shuffled = [...driverCodes].sort(() => Math.random() - 0.5);

        return {
            result: shuffled.slice(0, 10),
            medianPitstops: Math.floor(Math.random() * 3) + 1, // 1-3
            redFlags: Math.random() > 0.8 ? 1 : 0, // 20% chance
            safetyCarCount: Math.floor(Math.random() * 3) // 0-2
        };
    };

    const handleMultiRaceSimulation = async () => {
        if (!selectedLeagueId) {
            setStatus("Please select a league.");
            return;
        }
        if (mockUsers.length === 0) {
            setStatus("Please seed users first.");
            return;
        }

        const racesToSimulate = schedule.slice(0, raceCount).map(r => r.raceName);

        if (racesToSimulate.length === 0) {
            setStatus("No races available in schedule.");
            return;
        }

        setStatus(`Starting simulation of ${racesToSimulate.length} races...`);

        for (let i = 0; i < racesToSimulate.length; i++) {
            const raceName = racesToSimulate[i];
            setStatus(`[${i + 1}/${racesToSimulate.length}] Simulating ${raceName}...`);

            try {

                // 1. Generate predictions for this race
                const driverCodes = drivers.map(d => d.code || d.name_acronym || d.broadcast_name?.split(' ').pop()).filter(Boolean);
                const fallbackCodes = ["VER", "LEC", "NOR", "HAM", "SAI", "PIA", "RUS", "PER", "ALO", "HUL"];
                const codesForPrediction = driverCodes.length > 0 ? driverCodes : fallbackCodes;

                await SimulatorService.generateMockPredictions(
                    mockUsers.map(u => u.uid),
                    raceName,
                    codesForPrediction
                );

                // 2. Generate random race results
                const randomResults = generateRandomResults(codesForPrediction);

                // 3. Save as OFFICIAL Result (Global) so achievements work
                // We mock Pole Position as the winner (P1) for simplicity to enable Pole King testing
                const mockPole = randomResults.result[0];

                await firestore.collection('races').doc(raceName).set({
                    result: randomResults.result,
                    polePosition: mockPole,
                    medianPitstops: randomResults.medianPitstops,
                    status: "Final (Simulated)",
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                // 4. Score the race for the selected league
                const result = await dispatch(calculateLeaguePoints(selectedLeagueId, raceName, {
                    ...randomResults,
                    polePosition: mockPole
                }));

                if (!result.success) {
                    setStatus(`Error on ${raceName}: ${result.error}`);
                    return;
                }

                // Small delay to avoid overwhelming Firestore
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                setStatus(`Error on ${raceName}: ${error.message}`);
                return;
            }
        }

        setStatus(`✅ Successfully simulated ${racesToSimulate.length} races! Check League Manager → History.`);
    };

    const handleCleanup = async () => {
        setStatus("Cleaning up...");
        try {
            await SimulatorService.cleanupMockData();
            setMockUsers([]);
            setStatus("Mock data cleaned up successfully.");
        } catch (error) {
            setStatus(`Error: ${error.message}`);
        }
    };

    const updateManualResult = (index, value) => {
        const newResult = [...manualResults.result];
        newResult[index] = value;
        setManualResults({ ...manualResults, result: newResult });
    };

    return (
        <div className={`${isEmbedded ? 'w-full' : 'min-h-screen bg-[#0a0b0f] text-white'}`}>
            {!isEmbedded && <Header />}
            <div className={`${isEmbedded ? '' : 'max-w-4xl mx-auto p-8 pt-24'}`}>
                <div className={`${isEmbedded ? '' : 'bg-[#13141a] border border-white/10 rounded-2xl p-8 shadow-2xl'}`}>
                    {!isEmbedded && (
                        <h1 className="text-3xl font-bold mb-2 flex items-center">
                            <span className="w-2 h-8 bg-red-600 rounded-full mr-4"></span>
                            Simulator Hub
                        </h1>
                    )}
                    {!isEmbedded && <p className="text-gray-400 mb-8">Test your prediction engine and league scoring flows.</p>}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Control Panel */}
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-gray-200">Simulation Controls</h2>

                            {/* Mode Toggle */}
                            <div className="flex gap-2 p-1 bg-black/30 rounded-lg">
                                <button
                                    onClick={() => setSimulationMode('single')}
                                    className={`flex-1 px-4 py-2 rounded-md font-bold transition-all ${simulationMode === 'single' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}
                                >
                                    Single Race
                                </button>
                                <button
                                    onClick={() => setSimulationMode('multi')}
                                    className={`flex-1 px-4 py-2 rounded-md font-bold transition-all ${simulationMode === 'multi' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}
                                >
                                    Multi-Race
                                </button>
                            </div>

                            {simulationMode === 'single' ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={handleSeedUsers}
                                        className="px-4 py-3 bg-blue-600 rounded-lg font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                                    >
                                        Seed 10 Users
                                    </button>
                                    <button
                                        onClick={handleGeneratePredictions}
                                        className="px-4 py-3 bg-purple-600 rounded-lg font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-500/20"
                                    >
                                        Mock Predictions
                                    </button>
                                    <button
                                        onClick={handleSimulateScoring}
                                        className="px-4 py-3 bg-green-600 rounded-lg font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-500/20"
                                    >
                                        Simulate Race
                                    </button>
                                    <button
                                        onClick={handleCleanup}
                                        className="px-4 py-3 bg-red-600 rounded-lg font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-500/20"
                                    >
                                        Cleanup All
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">
                                            Number of Races to Simulate
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="24"
                                            value={raceCount}
                                            onChange={(e) => setRaceCount(parseInt(e.target.value) || 1)}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 outline-none focus:border-red-500"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Will simulate the first {raceCount} races from the schedule
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleMultiRaceSimulation}
                                        className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg font-bold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg"
                                    >
                                        🏁 Simulate {raceCount} Races
                                    </button>
                                    <button
                                        onClick={handleCleanup}
                                        className="w-full px-4 py-3 bg-red-600 rounded-lg font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-500/20"
                                    >
                                        Cleanup All
                                    </button>
                                </div>
                            )}

                            <div className="pt-4 border-t border-white/10">
                                <label className="block text-sm font-medium text-gray-400 mb-2">Target League</label>
                                <select
                                    value={selectedLeagueId}
                                    onChange={(e) => setSelectedLeagueId(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 outline-none focus:border-red-500"
                                >
                                    <option value="">Select a league</option>
                                    {leagues.map(l => (
                                        <option key={l.id} value={l.id}>{l.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Race Result Input */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold text-gray-200">Custom Race Outcome</h2>
                            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto p-2 bg-black/20 rounded-lg border border-white/5">
                                {manualResults.result.map((driver, i) => (
                                    <div key={i} className="flex items-center space-x-2">
                                        <span className="text-xs text-gray-500 w-4">P{i + 1}</span>
                                        <input
                                            value={driver}
                                            onChange={(e) => updateManualResult(i, e.target.value.toUpperCase())}
                                            className="w-20 bg-white/5 border border-white/10 rounded px-2 py-1 text-sm outline-none focus:border-blue-500"
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Pitstops (Median)</label>
                                    <input
                                        type="number"
                                        value={manualResults.medianPitstops}
                                        onChange={(e) => setManualResults({ ...manualResults, medianPitstops: parseInt(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded px-3 py-1 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Safety Cars</label>
                                    <input
                                        type="number"
                                        value={manualResults.safetyCarCount}
                                        onChange={(e) => setManualResults({ ...manualResults, safetyCarCount: parseInt(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded px-3 py-1 outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {status && (
                        <div className={`mt-8 p-4 rounded-lg font-medium text-center ${status.includes("Error") ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-green-500/10 text-green-500 border border-green-500/20"}`}>
                            {status}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Simulator;
