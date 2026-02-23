import { useEffect, useState } from "react";
// eslint-disable-next-line no-unused-vars
import Footer from "../../Footer/Footer";
import Header from "../../Header/Header";
import { useDispatch, useSelector } from "react-redux";
import { savePrediction, fetchDriverStandings, fetchSchedule, fetchBets, fetchUserLeagues } from "../../../redux/reducer";

export default function MyPredictions() {


    const dispatch = useDispatch()
    const drivers = useSelector(state => state.user.drivers)
    const user = useSelector((state) => state.user.user);
    const schedule = useSelector(state => state.user.schedule);
    const scheduleStatus = useSelector(state => state.user.scheduleStatus);
    const bets = useSelector((state) => state.user.bet?.bet || []);
    const userLeagues = useSelector(state => state.user.leagues || []);

    // Smart Rules: Check which features are enabled across all user's leagues
    const activeRules = {
        pitstops: userLeagues.length === 0 || userLeagues.some(l => l.scoringSystem?.pitstopScoring || l.scoringSystem?.pitstopScoring?.enabled),
        redFlags: userLeagues.some(l => l.scoringSystem?.redFlag?.enabled),
        safetyCars: userLeagues.some(l => l.scoringSystem?.safetyCar?.enabled)
    };

    // New state for navigation
    const [selectedRace, setSelectedRace] = useState(null);

    // Existing state for form
    const [localBet, setLocalBet] = useState(Array(10).fill(''));
    const [localPitstops, setLocalPitstops] = useState(1);
    const [localRedFlags, setLocalRedFlags] = useState(0);
    const [localSafetyCars, setLocalSafetyCars] = useState(0);
    const [isPastDeadline, setIsPastDeadline] = useState(false);
    const [message, setMessage] = useState('');

    // Helper: Determine default pitstops based on race characteristics
    // TODO: Integrate weather API for real-time rain detection
    const getDefaultPitstops = (race) => {
        if (!race) return 1;

        // Races historically known for variable weather/rain
        const wetProneRaces = ['Belgian Grand Prix', 'British Grand Prix', 'Japanese Grand Prix', 'Singapore Grand Prix'];
        const raceName = race.raceName || '';

        // Check if race is wet-prone (higher default)
        if (wetProneRaces.some(wetRace => raceName.includes(wetRace))) {
            return 2; // Higher default for potentially wet races
        }

        return 1; // Standard default
    };

    useEffect(() => {
        if (drivers.length === 0) dispatch(fetchDriverStandings())
        if (scheduleStatus === 'idle') dispatch(fetchSchedule())
        if (user && (!bets || bets.length === 0)) dispatch(fetchBets(user.uid))
        if (user) dispatch(fetchUserLeagues(user.uid)); // Always fetch fresh to get latest rules
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch, drivers.length, scheduleStatus, user, bets.length])


    // When a race is selected, check deadlines and load existing prediction
    useEffect(() => {
        if (selectedRace) {
            // Determine Deadline
            const qualTime = selectedRace.Qualifying
                ? new Date(`${selectedRace.Qualifying.date}T${selectedRace.Qualifying.time}`)
                : new Date(`${selectedRace.date}T${selectedRace.time}`);

            // Check if Past Deadline
            if (new Date() > qualTime) {
                setIsPastDeadline(true);
            } else {
                setIsPastDeadline(false);
            }

            // Load Existing Prediction
            const existingBet = bets.find(b => b.raceName === selectedRace.raceName);
            if (existingBet) {
                setLocalBet(existingBet.predictions);
                setLocalPitstops(existingBet.pitstops !== undefined ? existingBet.pitstops : getDefaultPitstops(selectedRace));
                setLocalRedFlags(existingBet.redFlags || 0);
                setLocalSafetyCars(existingBet.safetyCarCount || 0);
                setMessage("You are viewing/editing your existing prediction.");
            } else {
                setLocalBet(Array(10).fill('')); // Reset for new prediction
                setLocalPitstops(getDefaultPitstops(selectedRace)); // Smart default
                setLocalRedFlags(0);
                setLocalSafetyCars(0);
                setMessage("");
            }
        }
    }, [selectedRace, bets]);


    const handleDriverSelect = (index, driverId) => {
        const newBet = [...localBet];
        newBet[index] = driverId;
        setLocalBet(newBet);
    };

    const getAvailableDrivers = (currentIndex) => {
        return drivers.filter(driver => {
            if (!driver || !driver.broadcast_name) return false;
            const isSelectedHere = localBet[currentIndex] === driver.broadcast_name.toUpperCase();
            const isSelectedElsewhere = localBet.includes(driver.broadcast_name.toUpperCase());
            return isSelectedHere || !isSelectedElsewhere;
        });
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');

        if (isPastDeadline) {
            alert("Qualification has started! You cannot make or edit predictions.");
            return;
        }

        if (localBet.includes('') || localBet.length !== 10) {
            alert("Please select all 10 drivers.");
            return;
        }

        const uniqueDrivers = new Set(localBet);
        if (uniqueDrivers.size !== 10) {
            alert("You cannot select the same driver twice!");
            return;
        }

        if (!user || !selectedRace) return;

        try {
            const predictionData = {
                raceName: selectedRace.raceName,
                predictions: localBet,
                pitstops: localPitstops,
                redFlags: localRedFlags,
                safetyCarCount: localSafetyCars,
                date: new Date().toISOString()
            };
            const result = await dispatch(savePrediction(user.uid, predictionData));
            if (result && result.success === false) { // Handle if reducer returns error object (it currently returns undefined on success log)
                setMessage("Error saving prediction.");
            } else {
                // Reducer doesn't return value on success in current implementation, assuming success if no error thrown
                setMessage("Prediction Saved Successfully!");
            }

        } catch (error) {
            console.error("Save failed", error);
            setMessage("Error saving prediction.");
        }
    }

    const handleDelete = async () => {
        if (!window.confirm("Are you sure you want to clear your selections?")) return;
        setLocalBet(Array(10).fill(''));
        setMessage("Selections cleared.");
    }

    const handleBack = () => {
        setSelectedRace(null);
        setLocalBet(Array(10).fill(''));
        setMessage('');
    }

    // Helper to get status of a race in the list
    const getRaceStatus = (raceName) => {
        const bet = bets.find(b => b.raceName === raceName);
        if (bet) return { status: 'Predicted', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/50' };
        return { status: 'None', color: 'text-gray-500', bg: 'bg-gray-800 border-gray-700' };
    };

    return (
        <div className="flex flex-col min-h-screen bg-gray-900 text-white">
            <Header />
            <div className="flex-grow container mx-auto px-4 py-8">

                {/* HEADLINE */}
                <h1 className="text-3xl md:text-4xl font-black mb-8 text-transparent bg-clip-text bg-gradient-to-br from-red-500 to-orange-400 text-center uppercase tracking-italic">
                    {selectedRace ? selectedRace.raceName : "Season Predictions"}
                </h1>

                {!selectedRace ? (
                    /* --- LIST VIEW --- */
                    <div className="max-w-4xl mx-auto grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                        {/* Status Handling */}
                        {scheduleStatus === 'loading' && <p className="text-center col-span-full text-xl animate-pulse">Loading season schedule...</p>}
                        {scheduleStatus === 'succeeded' && schedule.length === 0 && (
                            <div className="col-span-full text-center py-10">
                                <p className="text-xl text-gray-400">No upcoming races found for this season yet.</p>
                                <p className="text-sm text-gray-600 mt-2">Check back later for the 2026 calendar update.</p>
                            </div>
                        )}
                        {scheduleStatus === 'failed' && <p className="text-center col-span-full text-red-400">Error loading schedule. Please try again later.</p>}

                        {/* Filter to only show Grand Prix events (exclude pre-season testing) */}
                        {schedule
                            .filter(race => race.raceName && race.raceName.toLowerCase().includes("grand prix"))
                            .map((race, index) => {
                                // eslint-disable-next-line no-unused-vars
                                const { status, color, bg } = getRaceStatus(race.raceName);
                                const raceDate = new Date(race.date);

                                return (
                                    <div
                                        key={index}
                                        onClick={() => setSelectedRace(race)}
                                        className={`relative p-5 rounded-xl border cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${bg} group`}
                                    >
                                        {/* Status Badge */}
                                        <div className={`absolute top-4 right-4 text-xs font-bold px-2 py-1 rounded border ${status === 'Predicted' ? 'border-green-500/30 bg-green-500/20 text-green-300' : 'border-gray-600 bg-gray-700 text-gray-400'}`}>
                                            {status}
                                        </div>

                                        <h2 className="text-xl font-bold mb-1 text-white group-hover:text-red-400 transition-colors">
                                            Round {race.round}
                                        </h2>
                                        <h3 className="text-lg font-medium text-gray-300 mb-4 line-clamp-1" title={race.raceName}>
                                            {race.raceName}
                                        </h3>

                                        <div className="flex items-center text-sm text-gray-400">
                                            <span className="mr-2">📅</span>
                                            {raceDate.toLocaleDateString()}
                                        </div>
                                        <div className="flex items-center text-sm text-gray-500 mt-1">
                                            <span className="mr-2">📍</span>
                                            {race.Circuit.Location.country}
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                ) : (
                    /* --- DETAIL VIEW (FORM) --- */
                    <div className="flex flex-col items-center animate-fadeIn">
                        {/* Navigation Buttons */}
                        <div className="w-full max-w-2xl mb-6 flex justify-between items-center">
                            <button
                                onClick={handleBack}
                                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-bold text-gray-300 transition flex items-center"
                            >
                                ← Back to List
                            </button>
                            <span className={`px-3 py-1 rounded text-xs font-bold tracking-widest ${isPastDeadline ? 'bg-red-900/50 text-red-200 border border-red-800' : 'bg-green-900/50 text-green-200 border border-green-800'}`}>
                                {isPastDeadline ? 'LOCKED' : 'OPEN FOR PREDICTION'}
                            </span>
                        </div>

                        {message && (
                            <div className={`mb-6 px-6 py-3 rounded-lg border w-full max-w-2xl text-center font-medium ${message.includes("Error") ? "bg-red-500/10 border-red-500 text-red-400" : "bg-green-500/10 border-green-500 text-green-400"}`}>
                                {message}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="w-full max-w-2xl bg-gray-800/50 backdrop-blur-md p-6 md:p-8 rounded-2xl shadow-2xl border border-gray-700">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                {localBet.map((position, index) => (
                                    <div key={index} className="flex flex-col space-y-1">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                                            Position {index + 1}
                                        </label>
                                        <div className="relative">
                                            <select
                                                className={`w-full p-3 rounded-lg bg-gray-900 border border-gray-600 outline-none transition appearance-none 
                                                    ${position ? 'text-white border-gray-500' : 'text-gray-500'}
                                                    ${!isPastDeadline && 'focus:border-red-500 focus:ring-1 focus:ring-red-500 hover:border-gray-500'}
                                                    ${isPastDeadline ? 'opacity-70 cursor-not-allowed' : ''}
                                                `}
                                                value={position}
                                                onChange={(e) => handleDriverSelect(index, e.target.value)}
                                                disabled={isPastDeadline}
                                            >
                                                <option value="" disabled>Select Driver</option>
                                                {getAvailableDrivers(index).map(driver => (
                                                    <option key={driver.driver_number} value={driver.broadcast_name.toUpperCase()}>
                                                        {driver.broadcast_name}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-500">
                                                ▼
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Pitstops */}
                                {activeRules.pitstops && (
                                    <div className="p-4 bg-blue-500/10 rounded-xl border-2 border-blue-400/60 animate-fadeIn shadow-lg shadow-blue-500/20">
                                        <label className="flex justify-between text-xs font-bold text-blue-300 uppercase tracking-wider mb-2">
                                            <span>Pitstops</span>
                                            <span className="text-white text-base">{localPitstops}</span>
                                        </label>
                                        <input
                                            type="range" min="1" max="5" step="1"
                                            value={localPitstops}
                                            onChange={(e) => setLocalPitstops(parseInt(e.target.value))}
                                            className="w-full h-2 bg-blue-900/40 rounded-lg appearance-none cursor-pointer slider-thumb-blue"
                                            disabled={isPastDeadline}
                                        />
                                        <p className="text-[9px] text-blue-400/80 mt-2 leading-tight font-semibold">✓ Active in your leagues (Min: 1, Full points at 5+)</p>
                                    </div>
                                )}

                                {/* Red Flags */}
                                {activeRules.redFlags && (
                                    <div className="p-4 bg-red-500/10 rounded-xl border-2 border-red-400/60 animate-fadeIn shadow-lg shadow-red-500/20">
                                        <label className="flex justify-between text-xs font-bold text-red-300 uppercase tracking-wider mb-2">
                                            <span>Red Flags</span>
                                            <span className="text-white text-base">{localRedFlags}</span>
                                        </label>
                                        <input
                                            type="range" min="0" max="3" step="1"
                                            value={localRedFlags}
                                            onChange={(e) => setLocalRedFlags(parseInt(e.target.value))}
                                            className="w-full h-2 bg-red-900/40 rounded-lg appearance-none cursor-pointer slider-thumb-red"
                                            disabled={isPastDeadline}
                                        />
                                        <p className="text-[9px] text-red-400/80 mt-2 leading-tight font-semibold">✓ Active in your leagues (Max: 3)</p>
                                    </div>
                                )}

                                {/* Safety Cars */}
                                {activeRules.safetyCars && (
                                    <div className="p-4 bg-yellow-500/10 rounded-xl border-2 border-yellow-400/60 animate-fadeIn shadow-lg shadow-yellow-500/20">
                                        <label className="flex justify-between text-xs font-bold text-yellow-300 uppercase tracking-wider mb-2">
                                            <span>Safety Cars</span>
                                            <span className="text-white text-base">{localSafetyCars}</span>
                                        </label>
                                        <input
                                            type="range" min="0" max="5" step="1"
                                            value={localSafetyCars}
                                            onChange={(e) => setLocalSafetyCars(parseInt(e.target.value))}
                                            className="w-full h-2 bg-yellow-900/40 rounded-lg appearance-none slider-thumb-yellow cursor-pointer"
                                            disabled={isPastDeadline}
                                        />
                                        <p className="text-[9px] text-yellow-400/80 mt-2 leading-tight font-semibold">✓ Active in your leagues (Max: 5)</p>
                                    </div>
                                )}
                            </div>

                            {(activeRules.pitstops || activeRules.redFlags || activeRules.safetyCars) && (
                                <p className="text-[10px] text-gray-500 mt-[-1rem] mb-6 italic text-center">
                                    Predict the count of events. Only options relevant to your active leagues are shown.
                                </p>
                            )}

                            <style>{`
                                .slider-thumb-blue::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 15px; height: 15px; background: #3b82f6; border-radius: 50%; cursor: pointer; }
                                .slider-thumb-red::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 15px; height: 15px; background: #ef4444; border-radius: 50%; cursor: pointer; }
                                .slider-thumb-yellow::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 15px; height: 15px; background: #eab308; border-radius: 50%; cursor: pointer; }
                            `}</style>

                            {!isPastDeadline ? (
                                <div className="flex gap-4 pt-4 border-t border-gray-700">
                                    <button
                                        type="submit"
                                        className="flex-1 py-3 px-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 rounded-xl font-bold text-lg shadow-lg hover:shadow-red-500/30 transition transform hover:-translate-y-0.5 text-white"
                                    >
                                        {bets.find(b => b.raceName === selectedRace.raceName) ? "Update Prediction" : "Submit Prediction"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDelete}
                                        className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold text-gray-300 transition"
                                    >
                                        Clear
                                    </button>
                                </div>
                            ) : (
                                <div className="p-4 bg-gray-900/50 border border-gray-600 rounded-xl text-center text-gray-400 font-bold">
                                    Predictions are closed for this event.
                                </div>
                            )}
                        </form>
                    </div>
                )}
            </div>
            {/* Added Footer since it was imported but not used in original return (though implementation plan didn't explicitly ask, it's good practice to keep layout) */}
            {/* Note: I see Footer imported at top but it wasn't in the original JSX's return statement. Wait, let me check the original file again. */}
            {/* Original file: 
               return (
                  <div ...>
                     <Header />
                     ... container ...
                  </div>
               )
               Ah, it didn't have <Footer /> in the return. I will keep it consistent and not add it unless needed, but imports had it.
               Actually, usually layout includes footer. I'll add it if it feels right, but to be safe and match original structure mostly, I won't force it if not there.
               Wait, line 2 had `import Footer from ...`.
               Line 169 had `<Header />`.
               There was no `<Footer />` in previous file render.
               Okay, I'll stick to original layout components.
             */}
        </div>
    );
}