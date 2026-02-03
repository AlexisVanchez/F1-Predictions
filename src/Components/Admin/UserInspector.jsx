import React, { useState } from "react";
import { adminSearchUsers } from "../../redux/reducer";

export default function UserInspector() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        const res = await adminSearchUsers(query)();
        if (res.success) {
            setResults(res.users);
        } else {
            alert("Search failed: " + res.error);
        }
        setLoading(false);
        setSearched(true);
    };

    return (
        <div className="space-y-6">
            <form onSubmit={handleSearch} className="flex gap-4">
                <input
                    type="text"
                    className="flex-1 bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-red-500 outline-none"
                    placeholder="Search by Email or Username..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <button
                    type="submit"
                    className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-bold"
                >
                    {loading ? "Scanning..." : "Search"}
                </button>
            </form>

            <div className="space-y-4">
                {searched && results.length === 0 && (
                    <div className="text-center text-gray-500 py-8">No users found matching "{query}"</div>
                )}

                {results.map(user => (
                    <div key={user.uid} className="bg-gray-800/50 border border-gray-700 p-4 rounded-xl flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <img
                                src={user.photoURL || "https://via.placeholder.com/50"}
                                className="w-12 h-12 rounded-full border-2 border-gray-600"
                                alt="User"
                            />
                            <div>
                                <div className="font-bold text-white text-lg">{user.displayName}</div>
                                <div className="text-sm text-gray-400 font-mono">{user.email}</div>
                                <div className="text-xs text-gray-500 mt-1">UID: {user.uid}</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="bg-red-900/40 text-red-400 px-3 py-1 rounded text-sm font-bold mb-1 inline-block">
                                Rank #{user.globalRank || "-"}
                            </div>
                            <div className="text-gray-400 text-sm">
                                {user.globalPoints || 0} pts
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
