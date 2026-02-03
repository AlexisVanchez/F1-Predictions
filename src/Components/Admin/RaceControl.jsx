import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { submitManualRaceResult } from "../../redux/reducer";

export default function RaceControl() {
    const dispatch = useDispatch();
    const schedule = useSelector(state => state.user.schedule);
    const drivers = useSelector(state => state.user.drivers); // Assume we have a list of drivers or just use codes

    // Flatten drivers list for easier autocomplete if needed, but for now simple inputs
    const [selectedRace, setSelectedRace] = useState("");
    const [results, setResults] = useState(Array(10).fill("")); // Top 10
    const [polePosition, setPolePosition] = useState("");
    const [status, setStatus] = useState("idle"); // idle, submitting, success, error

    const handleSubmit = async () => {
        if (!selectedRace) return alert("Please select a race");

        // Filter empty
        const validResults = results.filter(r => r.trim() !== "");
        if (validResults.length !== 10) return alert("Please enter all Top 10 drivers (Codes like VER, HAM)");

        if (!window.confirm(`Are you sure you want to OFFICIALIZE results for ${selectedRace}? This will recalculate points for ALL leagues.`)) {
            return;
        }

        setStatus("submitting");
        const res = await dispatch(submitManualRaceResult(selectedRace, validResults, polePosition));

        if (res.success) {
            setStatus("success");
            alert(`Success! Updated ${res.leaguesUpdated} leagues.`);
        } else {
            setStatus("error");
            alert("Error: " + res.error);
        }
    };

    const handleDriverInput = (index, value) => {
        const newRes = [...results];
        newRes[index] = value.toUpperCase();
        setResults(newRes);
    };

    return (
        <div className="space-y-8">
            <div className="bg-red-900/10 border border-red-500/20 p-4 rounded-lg">
                <h3 className="text-xl font-bold text-red-500 mb-2">⚠️ Danger Zone</h3>
                <p className="text-gray-400 text-sm">
                    Manually submitting results overrides OpenF1 API data.
                    This triggers a background recalculation of points for every single league.
                    Only use this if the API is broken or for testing.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Race Selector */}
                <div>
                    <label className="block text-gray-400 font-bold mb-2">Select Race</label>
                    <select
                        className="w-full bg-black border border-gray-700 rounded p-3 text-white focus:border-red-500 outline-none"
                        value={selectedRace}
                        onChange={(e) => setSelectedRace(e.target.value)}
                    >
                        <option value="">-- Select Grand Prix --</option>
                        {schedule.map(race => (
                            <option key={race.raceName} value={race.raceName}>
                                Round {race.round}: {race.raceName}
                            </option>
                        ))}
                    </select>
                </div>


                {/* Result Input */}
                <div>
                    <label className="block text-gray-400 font-bold mb-4">Top 10 Classification (Driver Codes)</label>

                    {/* Pole Position Input */}
                    <div className="flex items-center space-x-3 mb-6 p-3 bg-indigo-900/20 border border-indigo-500/30 rounded-lg">
                        <span className="text-indigo-400 font-bold">🏎️ Pole Position:</span>
                        <input
                            type="text"
                            className="bg-gray-800 border border-indigo-500/50 rounded px-3 py-2 text-white font-mono w-24 uppercase placeholder-gray-600 focus:border-indigo-400 focus:bg-gray-700"
                            placeholder="VER"
                            value={polePosition}
                            onChange={(e) => setPolePosition(e.target.value.toUpperCase())}
                            maxLength={3}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {results.map((code, idx) => (
                            <div key={idx} className="flex items-center space-x-3">
                                <span className="text-gray-500 font-mono w-6">P{idx + 1}</span>
                                <input
                                    type="text"
                                    className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white font-mono w-full uppercase placeholder-gray-600 focus:border-red-500 focus:bg-gray-700"
                                    placeholder={idx === 0 ? "VER" : "..."}
                                    value={code}
                                    onChange={(e) => handleDriverInput(idx, e.target.value)}
                                    maxLength={3}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-gray-800">
                <button
                    onClick={handleSubmit}
                    disabled={status === "submitting"}
                    className={`
                        px-8 py-3 rounded-lg font-bold uppercase tracking-widest transition-all
                        ${status === "submitting" ? "bg-gray-600 cursor-wait" : "bg-red-600 hover:bg-red-500 hover:shadow-lg hover:shadow-red-600/40 text-white"}
                    `}
                >
                    {status === "submitting" ? "Processing..." : "Publish & Recalculate"}
                </button>
            </div>
        </div>
    );
}
