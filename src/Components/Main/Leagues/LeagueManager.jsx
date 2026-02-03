import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { createLeague, joinLeague, fetchUserLeagues, calculateLeaguePoints, updateUserStatus, searchLeagues, deleteLeague, fetchDriverStandings } from '../../../redux/reducer';
import "firebase/compat/firestore";
import { firestore } from '../../../redux/firebase_config';
import { calculateLeagueFunStats, formatDriverName } from '../../../utils/leagueStatsUtils';
import ScoringBreakdown from '../Common/ScoringBreakdown';
import SeasonStandings from './SeasonStandings';

export default function LeagueManager() {
    const dispatch = useDispatch();
    const location = useLocation();
    const user = useSelector(state => state.user.user);
    const leagues = useSelector(state => state.user.leagues || []);
    const schedule = useSelector(state => state.user.schedule || []);
    const drivers = useSelector(state => state.user.drivers || []);

    // Get the most relevant race (Current or Next)
    const getTargetRaceName = () => {
        if (schedule.length === 0) return "Australian Grand Prix"; // Fallback to R1
        const now = new Date();
        const nextRace = schedule.find(s => new Date(`${s.date}T${s.time || '14:00:00'}`) > now);
        return nextRace ? nextRace.raceName : schedule[schedule.length - 1].raceName;
    };

    const targetRaceName = getTargetRaceName();

    const [view, setView] = useState('list'); // 'list', 'create', 'join', 'detail'
    const [selectedLeague, setSelectedLeague] = useState(null);

    // Form States
    const [newLeagueName, setNewLeagueName] = useState('');

    // Custom Scoring Configuration
    const [scoringMode, setScoringMode] = useState('classic'); // 'classic' | 'radius'
    const [positionPoints, setPositionPoints] = useState([25, 18, 15, 12, 10, 8, 6, 4, 2, 1]); // P1-P10 defaults
    const [redFlag, setRedFlag] = useState({ enabled: false, points: 10 });
    const [safetyCar, setSafetyCar] = useState({ enabled: false, points: 5 });
    const [pitstopScoring, setPitstopScoring] = useState(false); // Legacy toggle, can refactor to object logic if needed
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState(null);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Member View State
    const [viewingMember, setViewingMember] = useState(null);
    const [memberPredictionData, setMemberPredictionData] = useState(null);

    // League Stats & History States
    const [leagueStats, setLeagueStats] = useState(null);
    const [isStatsLoading, setIsStatsLoading] = useState(false);
    const [detailTab, setDetailTab] = useState('leaderboard'); // 'leaderboard' | 'history'
    const [allLeaguePredictions, setAllLeaguePredictions] = useState([]);
    const [historicalRaceResults, setHistoricalRaceResults] = useState({});
    const [selectedHistoryRace, setSelectedHistoryRace] = useState(null);
    const [hoveredMember, setHoveredMember] = useState(null); // For point breakdown tooltip
    const hoverTimeoutRef = useRef(null); // For hover delay using Ref for stability



    useEffect(() => {
        if (user?.uid) {
            dispatch(fetchUserLeagues(user.uid));
            if (drivers.length === 0) dispatch(fetchDriverStandings());

            // Initial status update
            updateUserStatus(user.uid)();
            // ...
        }
    }, [dispatch, user, drivers.length]);

    // Handle navigation from profile - auto-open league
    useEffect(() => {
        if (location.state?.selectedLeagueId && leagues.length > 0) {
            const league = leagues.find(l => l.id === location.state.selectedLeagueId);
            if (league) {
                openLeague(league);
                // Clear the state to prevent re-opening on refresh
                window.history.replaceState({}, document.title);
            }
        }
    }, [location.state, leagues]);

    const handleCreateLeague = async (e) => {
        e.preventDefault();
        setError('');
        // Create custom scoring object if pitstop is enabled
        // Construct robust scoring system
        const customScoring = {
            scoringMode: scoringMode,
            exact: positionPoints.map(p => parseInt(p) || 0),
            presence: 1, // keeping standard for now, or add input
            pitstopScoring: pitstopScoring ? { enabled: true, points: 5 } : null,
            redFlag: redFlag.enabled ? { enabled: true, points: parseInt(redFlag.points) } : null,
            safetyCar: safetyCar.enabled ? { enabled: true, points: parseInt(safetyCar.points) } : null
        };

        const result = await dispatch(createLeague(newLeagueName, user, customScoring));
        if (result.success) {
            setSuccessMsg(`League Created! Invite Code: ${result.inviteCode}`);
            setNewLeagueName('');
            setPitstopScoring(false);
            setView('list');
        } else {
            setError(result.error);
        }
    };

    const handleSearchLeague = async (e) => {
        e.preventDefault();
        setError('');
        setSearchResults(null);
        if (!searchQuery.trim()) return;

        const result = await dispatch(searchLeagues(searchQuery));
        if (result.success) {
            setSearchResults(result.results);
        } else {
            setError(result.error);
        }
    };

    const handleJoinData = async (code) => {
        setError('');
        const result = await dispatch(joinLeague(code, user));
        if (result.success) {
            setSuccessMsg(`Joined ${result.leagueName} successfully!`);
            setSearchQuery('');
            setSearchResults(null);
            setView('list');
        } else {
            setError(result.error);
        }
    };

    const openLeague = (league) => {
        setSelectedLeague(league);
        setView('detail');
        setError('');
        setSuccessMsg('');
        fetchLeagueStats(league);
    };

    const fetchLeagueStats = async (league) => {
        if (!league || !league.memberIds) return;
        setIsStatsLoading(true);
        try {
            // 1. Fetch All Historical Race Results from Firestore
            const racesSnapshot = await firestore.collection('races').get();
            const raceResults = {};
            racesSnapshot.forEach(doc => {
                raceResults[doc.id] = doc.data();
            });

            // 2. Fetch All Predictions for all members of this league
            const predictionsPromises = league.memberIds.map(uid =>
                firestore.collection('predictions').where('uid', '==', uid).get()
            );

            const predictionSnapshots = await Promise.all(predictionsPromises);
            const allLeaguePredictions = [];

            predictionSnapshots.forEach(snap => {
                snap.forEach(doc => {
                    allLeaguePredictions.push(doc.data());
                });
            });

            // 3. Calculate Stats
            const stats = calculateLeagueFunStats(league.members, allLeaguePredictions, raceResults, league.scoringSystem);
            setLeagueStats(stats);
            setAllLeaguePredictions(allLeaguePredictions);
            setHistoricalRaceResults(raceResults);
        } catch (err) {
            console.error("Error calculating league stats:", err);
        } finally {
            setIsStatsLoading(false);
        }
    };

    const handleCalculatePoints = async () => {
        if (!selectedLeague) return;
        const result = await dispatch(calculateLeaguePoints(selectedLeague.id, targetRaceName));
        if (result.success) {
            setSuccessMsg(`Points updated for ${targetRaceName}!`);
        } else {
            setError(result.error || result.message);
        }
    };

    const handleViewMember = async (member, specificRace = null, context = 'history') => {
        setViewingMember(member);
        setMemberPredictionData(null);
        try {
            let raceName;

            // Determine which race to show based on context
            if (context === 'leaderboard') {
                // Show next upcoming race (future only)
                const now = new Date();
                const upcomingRace = schedule.find(race => new Date(race.date) > now);
                raceName = upcomingRace ? upcomingRace.raceName : targetRaceName;
            } else {
                // History context: show the specific race
                raceName = specificRace || targetRaceName;
            }

            const docId = `${member.uid}_${raceName}`;
            const doc = await firestore.collection('predictions').doc(docId).get();

            if (doc.exists) {
                setMemberPredictionData({ ...doc.data(), raceName: raceName });
            } else {
                setMemberPredictionData({ raceName: raceName }); // Empty object indicates no prediction found
            }
        } catch (error) {
            console.error("Error fetching member bets:", error);
            setMemberPredictionData({ raceName: targetRaceName });
        }
    };

    const closeMemberView = () => {
        setViewingMember(null);
        setMemberPredictionData(null);
    };

    const handleDeleteLeague = async () => {
        if (!selectedLeague || !user) return;

        const confirmDelete = window.confirm(
            `Are you sure you want to delete "${selectedLeague.name}"?\n\nThis action cannot be undone and will remove the league for all members.`
        );

        if (!confirmDelete) return;

        setError('');
        setSuccessMsg('');

        const result = await dispatch(deleteLeague(selectedLeague.id, user.uid));

        if (result.success) {
            setSuccessMsg('League deleted successfully!');
            setView('list');
            setSelectedLeague(null);
        } else {
            setError(result.error || 'Failed to delete league');
        }
    };


    // Derived state for detail view to ensure reactivity
    const activeLeague = view === 'detail' && selectedLeague
        ? leagues.find(l => l.id === selectedLeague.id) || selectedLeague
        : null;

    return (
        <div className="w-full bg-gray-900 rounded-xl p-6 text-white shadow-lg border border-gray-800 relative">

            {/* Modal for Member Predictions */}
            {viewingMember && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md p-6 relative shadow-2xl">
                        <button onClick={closeMemberView} className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl font-bold">✕</button>
                        <h3 className="text-xl font-bold mb-1 text-white">{viewingMember.displayName}'s Picks</h3>
                        <p className="text-sm text-gray-400 mb-4">{memberPredictionData?.raceName || targetRaceName}</p>

                        {memberPredictionData === null ? (
                            <p className="text-center py-4">Loading...</p>
                        ) : !memberPredictionData.predictions ? (
                            <p className="text-center py-4 text-gray-500">No predictions found for this event.</p>
                        ) : (
                            <ScoringBreakdown
                                predictions={memberPredictionData.predictions}
                                breakdown={memberPredictionData.leagueScores?.[activeLeague.id]?.breakdown || memberPredictionData.breakdown}
                                officialResults={memberPredictionData.officialResults}
                                totalScore={memberPredictionData.leagueScores?.[activeLeague.id]?.totalScore}
                                scoringSystem={activeLeague?.scoringSystem}
                            />
                        )}
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">
                    {view === 'detail' && activeLeague ? activeLeague.name : 'My Leagues'}
                </h2>
                <div className="space-x-2">
                    {view !== 'list' &&
                        <button onClick={() => setView('list')} className="text-sm text-gray-400 hover:text-white underline">Back to List</button>
                    }
                </div>
            </div>

            {successMsg && <div className="mb-4 p-3 bg-green-500/20 text-green-300 rounded border border-green-500/50">{successMsg}</div>}
            {error && <div className="mb-4 p-3 bg-red-500/20 text-red-300 rounded border border-red-500/50">{error}</div>}

            {view === 'list' && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <button
                            onClick={() => setView('create')}
                            className="p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition flex flex-col items-center justify-center space-y-2 group"
                        >
                            <span className="text-2xl group-hover:scale-110 transition">🏆</span>
                            <span className="font-bold text-red-400">Create League</span>
                        </button>
                        <button
                            onClick={() => setView('join')}
                            className="p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition flex flex-col items-center justify-center space-y-2 group"
                        >
                            <span className="text-2xl group-hover:scale-110 transition">🎟️</span>
                            <span className="font-bold text-blue-400">Join League</span>
                        </button>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-gray-400 text-sm uppercase tracking-widest border-b border-gray-800 pb-2">Active Leagues</h3>
                        {leagues.length === 0 ? (
                            <p className="text-gray-500 italic">You haven't joined any leagues yet.</p>
                        ) : (
                            leagues.map(league => (
                                <div
                                    key={league.id}
                                    onClick={() => openLeague(league)}
                                    className="flex justify-between items-center p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-red-500 cursor-pointer transition"
                                >
                                    <div>
                                        <h4 className="font-bold text-lg">{league.name}</h4>
                                        <p className="text-xs text-gray-500">{league.members?.length || 0} Members</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm text-gray-400 mr-2">Code:</span>
                                        <span className="font-mono bg-gray-900 px-2 py-1 rounded text-yellow-500">{league.inviteCode}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}

            {view === 'create' && (
                <form onSubmit={handleCreateLeague} className="space-y-4">
                    <h3 className="text-xl font-bold">Create New League</h3>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">League Name</label>
                        <input
                            type="text"
                            className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white focus:border-red-500 focus:outline-none"
                            value={newLeagueName}
                            onChange={(e) => setNewLeagueName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="bg-gray-800 p-4 rounded border border-gray-700 space-y-4">
                        <label className="block text-sm font-bold text-gray-300 border-b border-gray-600 pb-2 mb-2">Scoring System</label>
                        <div className="grid grid-cols-2 gap-4">
                            <div
                                onClick={() => setScoringMode('classic')}
                                className={`p-3 rounded border cursor-pointer transition ${scoringMode === 'classic' ? 'bg-red-900/30 border-red-500' : 'bg-gray-900 border-gray-600 hover:bg-gray-700'}`}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <div className={`w-4 h-4 rounded-full border ${scoringMode === 'classic' ? 'border-red-500 bg-red-500' : 'border-gray-500'}`}></div>
                                    <span className="font-bold text-sm">Position Based (Classic)</span>
                                </div>
                                <p className="text-xs text-gray-400">Fixed points for exact position matches (e.g. Correct P1 = 25pts).</p>
                            </div>

                            <div
                                onClick={() => setScoringMode('radius')}
                                className={`p-3 rounded border cursor-pointer transition ${scoringMode === 'radius' ? 'bg-red-900/30 border-red-500' : 'bg-gray-900 border-gray-600 hover:bg-gray-700'}`}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <div className={`w-4 h-4 rounded-full border ${scoringMode === 'radius' ? 'border-red-500 bg-red-500' : 'border-gray-500'}`}></div>
                                    <span className="font-bold text-sm">Radius of Error</span>
                                </div>
                                <p className="text-xs text-gray-400">Points based on closeness. Correct=10, Off by 1=5, Off by 2=2.</p>
                            </div>
                        </div>

                        {scoringMode === 'classic' && (
                            <div className="mt-4 pt-4 border-t border-gray-700 animate-fadeIn">
                                <label className="block text-sm font-bold text-gray-400 mb-2">Detailed Point Allocation (Classic)</label>
                                <div className="grid grid-cols-5 gap-2">
                                    {positionPoints.map((pts, idx) => (
                                        <div key={idx} className="flex flex-col">
                                            <span className="text-[10px] text-gray-500 mb-0.5">P{idx + 1}</span>
                                            <input
                                                type="number"
                                                className="bg-gray-900 border border-gray-600 rounded p-1 text-center text-sm text-white focus:border-red-500 outline-none"
                                                value={pts}
                                                onChange={(e) => {
                                                    const newPts = [...positionPoints];
                                                    newPts[idx] = e.target.value;
                                                    setPositionPoints(newPts);
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {scoringMode === 'radius' && (
                            <div className="mt-4 pt-4 border-t border-gray-700 animate-fadeIn">
                                <div className="bg-blue-900/20 p-3 rounded border border-blue-500/30">
                                    <p className="text-xs text-blue-200 leading-relaxed">
                                        <strong>Radius Rules:</strong> Predictions are scored on accuracy.
                                        <br />• Exact Match (bullseye): <strong>10 pts</strong>
                                        <br />• Off by 1 position (e.g. pred P2, actual P3): <strong>5 pts</strong>
                                        <br />• Off by 2 positions: <strong>2 pts</strong>
                                        <br />• Off by &gt;2: <strong>0 pts</strong>
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-gray-800 p-4 rounded border border-gray-700 space-y-4">
                        <label className="block text-sm font-bold text-gray-300 border-b border-gray-600 pb-2 mb-2">Event Predictions</label>

                        {/* Red Flag */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={redFlag.enabled}
                                    onChange={(e) => setRedFlag({ ...redFlag, enabled: e.target.checked })}
                                    className="w-4 h-4 rounded text-red-600 bg-gray-900 border-gray-600"
                                />
                                <span className={redFlag.enabled ? "text-white" : "text-gray-500"}>Red Flag Count</span>
                            </div>
                            {redFlag.enabled && (
                                <div className="flex items-center space-x-2">
                                    <span className="text-xs text-gray-400">Pts:</span>
                                    <input
                                        type="number"
                                        className="w-16 bg-gray-900 border border-gray-600 rounded p-1 text-sm text-center"
                                        value={redFlag.points}
                                        onChange={(e) => setRedFlag({ ...redFlag, points: e.target.value })}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Safety Car */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={safetyCar.enabled}
                                    onChange={(e) => setSafetyCar({ ...safetyCar, enabled: e.target.checked })}
                                    className="w-4 h-4 rounded text-yellow-500 bg-gray-900 border-gray-600"
                                />
                                <span className={safetyCar.enabled ? "text-white" : "text-gray-500"}>Safety Car Count</span>
                            </div>
                            {safetyCar.enabled && (
                                <div className="flex items-center space-x-2">
                                    <span className="text-xs text-gray-400">Pts:</span>
                                    <input
                                        type="number"
                                        className="w-16 bg-gray-900 border border-gray-600 rounded p-1 text-sm text-center"
                                        value={safetyCar.points}
                                        onChange={(e) => setSafetyCar({ ...safetyCar, points: e.target.value })}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Pitstops */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={pitstopScoring}
                                    onChange={(e) => setPitstopScoring(e.target.checked)}
                                    className="w-4 h-4 rounded text-blue-500 bg-gray-900 border-gray-600"
                                />
                                <span className={pitstopScoring ? "text-white" : "text-gray-500"}>Pitstop Count</span>
                            </div>
                            {pitstopScoring && <span className="text-xs text-gray-400">Fixed: 5 Pts</span>}
                        </div>
                    </div>

                    <button type="submit" className="w-full py-3 bg-gradient-to-r from-red-600 to-red-800 rounded font-black uppercase tracking-widest hover:brightness-110 transition shadow-lg">
                        Create Official League
                    </button>
                </form>
            )}

            {view === 'join' && (
                <div className="space-y-4">
                    <h3 className="text-xl font-bold">Find & Join League</h3>

                    <form onSubmit={handleSearchLeague} className="flex gap-2">
                        <input
                            type="text"
                            className="flex-grow bg-gray-800 border border-gray-700 rounded p-2 text-white focus:border-blue-500 focus:outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Enter League Name or Invite Code..."
                            required
                        />
                        <button type="submit" className="px-4 py-2 bg-blue-600 rounded font-bold hover:bg-blue-700 transition">Search</button>
                    </form>

                    {searchResults && (
                        <div className="mt-4 space-y-2 animate-fadeIn">
                            {searchResults.length === 0 ? (
                                <p className="text-gray-500 text-sm">No leagues found.</p>
                            ) : (
                                searchResults.map(league => (
                                    <div key={league.id} className="flex justify-between items-center p-3 bg-gray-800 rounded border border-gray-700">
                                        <div>
                                            <p className="font-bold">{league.name}</p>
                                            <p className="text-xs text-gray-500">{league.members?.length || 0} Members</p>
                                        </div>
                                        <button
                                            onClick={() => handleJoinData(league.inviteCode)}
                                            className="text-xs bg-gray-700 hover:bg-green-600 text-white px-3 py-1.5 rounded transition"
                                        >
                                            Join
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}

            {view === 'detail' && activeLeague && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center bg-gray-800 p-4 rounded-lg">
                        <div>
                            <p className="text-xs text-gray-400">Invite Code</p>
                            <p className="text-2xl font-mono text-yellow-500 font-bold tracking-wider select-all">{activeLeague.inviteCode}</p>
                        </div>
                        {activeLeague.adminUid === user.uid && (
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCalculatePoints}
                                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white border border-gray-600 transition"
                                >
                                    🔄 Update Scores ({targetRaceName})
                                </button>
                                <button
                                    onClick={handleDeleteLeague}
                                    className="px-4 py-2 bg-red-900/50 hover:bg-red-800 rounded text-xs text-white border border-red-700 transition"
                                >
                                    🗑️ Delete League
                                </button>
                            </div>
                        )}
                    </div>

                    <div>
                        {/* Tab Navigation */}
                        <div className="flex border-b border-gray-800 mb-6">
                            <button
                                onClick={() => setDetailTab('leaderboard')}
                                className={`px-6 py-3 text-sm font-bold uppercase tracking-widest transition-all border-b-2 ${detailTab === 'leaderboard' ? 'border-red-600 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                            >
                                Leaderboard
                            </button>
                            <button
                                onClick={() => setDetailTab('history')}
                                className={`px-6 py-3 text-sm font-bold uppercase tracking-widest transition-all border-b-2 ${detailTab === 'history' ? 'border-red-600 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                            >
                                Race History
                            </button>
                            <button
                                onClick={() => setDetailTab('season')}
                                className={`px-6 py-3 text-sm font-bold uppercase tracking-widest transition-all border-b-2 ${detailTab === 'season' ? 'border-red-600 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                            >
                                Season Standings
                            </button>
                        </div>

                        {detailTab === 'leaderboard' ? (
                            <div>
                                <h3 className="text-lg font-bold mb-3 border-b border-gray-700 pb-2">Standings</h3>
                                <p className="text-xs text-gray-500 mb-2">Click on a member to see their current predictions.</p>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="text-gray-500 text-xs uppercase border-b border-gray-800">
                                            <tr>
                                                <th className="py-2">Rank</th>
                                                <th className="py-2">User</th>
                                                <th className="py-2 text-right">Points</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm">
                                            {activeLeague.members && [...activeLeague.members]
                                                .sort((a, b) => ((activeLeague.standings?.[b.uid] || 0) - (activeLeague.standings?.[a.uid] || 0)))
                                                .map((member, index) => {
                                                    const isUserOnline = (lastSeenMillis) => {
                                                        if (!lastSeenMillis) return false;
                                                        const diff = Date.now() - lastSeenMillis;
                                                        return diff < 5 * 60 * 1000;
                                                    };
                                                    const isOnline = isUserOnline(member.lastSeen);

                                                    return (
                                                        <tr
                                                            key={member.uid}
                                                            onClick={() => handleViewMember(member, null, 'leaderboard')}
                                                            onMouseEnter={() => {
                                                                // Clear any existing timeout immediately
                                                                if (hoverTimeoutRef.current) {
                                                                    clearTimeout(hoverTimeoutRef.current);
                                                                    hoverTimeoutRef.current = null;
                                                                }
                                                                setHoveredMember(member.uid);
                                                            }}
                                                            onMouseLeave={() => {
                                                                // Add delay before hiding
                                                                hoverTimeoutRef.current = setTimeout(() => {
                                                                    setHoveredMember(null);
                                                                }, 500); // 500ms delay
                                                            }}
                                                            className="border-b border-gray-800 hover:bg-gray-700 cursor-pointer transition relative"
                                                        >
                                                            <td className="py-3 font-mono text-gray-400">#{index + 1}</td>
                                                            <td className="py-3 font-bold flex items-center gap-2">
                                                                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`}></div>
                                                                {member.displayName}
                                                                {member.uid === activeLeague.adminUid && '👑'}
                                                            </td>
                                                            <td className="py-3 text-right font-bold text-red-500 text-lg relative">
                                                                {activeLeague.standings?.[member.uid] || 0}

                                                                {/* Point Breakdown Tooltip */}
                                                                {hoveredMember === member.uid && (
                                                                    <div
                                                                        className="absolute right-0 top-full mt-3 bg-gradient-to-br from-gray-900 via-gray-900 to-black border-2 border-red-600/30 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] p-4 z-50 min-w-[280px] backdrop-blur-xl animate-fadeIn"
                                                                        onMouseEnter={() => {
                                                                            // Keep popup visible when hovering over it
                                                                            if (hoverTimeoutRef.current) {
                                                                                clearTimeout(hoverTimeoutRef.current);
                                                                                hoverTimeoutRef.current = null;
                                                                            }
                                                                        }}
                                                                        onMouseLeave={() => {
                                                                            // Add delay when leaving popup
                                                                            hoverTimeoutRef.current = setTimeout(() => {
                                                                                setHoveredMember(null);
                                                                            }, 500); // 500ms delay
                                                                        }}
                                                                    >
                                                                        {/* Header */}
                                                                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="w-1 h-5 bg-gradient-to-b from-red-500 to-red-700 rounded-full"></div>
                                                                                <span className="text-xs font-black text-white uppercase tracking-widest">Point Breakdown</span>
                                                                            </div>
                                                                            <span className="text-xs text-gray-500 font-mono">
                                                                                {allLeaguePredictions.filter(p => p.uid === member.uid && p.leagueScores?.[activeLeague.id]).length} races
                                                                            </span>
                                                                        </div>

                                                                        {/* Race List */}
                                                                        <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                                                            {allLeaguePredictions
                                                                                .filter(p => p.uid === member.uid && p.leagueScores?.[activeLeague.id])
                                                                                .sort((a, b) => (b.leagueScores[activeLeague.id].totalScore || 0) - (a.leagueScores[activeLeague.id].totalScore || 0))
                                                                                .map((pred, i) => {
                                                                                    const points = pred.leagueScores[activeLeague.id].totalScore;
                                                                                    return (
                                                                                        <div
                                                                                            key={i}
                                                                                            className="flex items-center justify-between bg-white/5 hover:bg-white/10 rounded-lg px-3 py-2 transition-all group border border-white/5 hover:border-red-500/30"
                                                                                        >
                                                                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                                                <span className="text-[10px] font-mono text-gray-600 w-4">#{i + 1}</span>
                                                                                                <span className="text-xs text-gray-300 truncate group-hover:text-white transition-colors">
                                                                                                    {pred.raceName}
                                                                                                </span>
                                                                                            </div>
                                                                                            <div className="flex items-center gap-2">
                                                                                                <span className={`text-sm font-black font-mono ${points >= 20 ? 'text-green-400' :
                                                                                                    points >= 10 ? 'text-blue-400' :
                                                                                                        points >= 5 ? 'text-yellow-400' :
                                                                                                            'text-gray-400'
                                                                                                    }`}>
                                                                                                    {points}
                                                                                                </span>
                                                                                                <span className="text-[10px] text-gray-600">pts</span>
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })
                                                                            }
                                                                            {allLeaguePredictions.filter(p => p.uid === member.uid && p.leagueScores?.[activeLeague.id]).length === 0 && (
                                                                                <div className="text-center py-4 text-gray-600 italic text-xs">
                                                                                    No scored races yet
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {/* Total Footer */}
                                                                        {allLeaguePredictions.filter(p => p.uid === member.uid && p.leagueScores?.[activeLeague.id]).length > 0 && (
                                                                            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
                                                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total</span>
                                                                                <span className="text-2xl font-black text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                                                                                    {activeLeague.standings?.[member.uid] || 0}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : detailTab === 'history' ? (
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold mb-3 border-b border-gray-700 pb-2">Race History</h3>
                                {(() => {
                                    // Get all unique races that have been scored in this league
                                    const scoredRaces = [...new Set(
                                        allLeaguePredictions
                                            .filter(p => p.leagueScores?.[activeLeague.id])
                                            .map(p => p.raceName)
                                    )];

                                    // Create race objects (from schedule if available, otherwise create minimal object)
                                    const raceObjects = scoredRaces.map(raceName => {
                                        const scheduleRace = schedule.find(s => s.raceName === raceName);
                                        return scheduleRace || {
                                            raceName: raceName,
                                            round: 0,
                                            date: new Date().toISOString().split('T')[0]
                                        };
                                    });

                                    // Sort by date (most recent first)
                                    const sortedRaces = raceObjects.sort((a, b) => new Date(b.date) - new Date(a.date));

                                    return sortedRaces.length > 0 ? (
                                        sortedRaces.map((race, idx) => (
                                            <div key={idx} className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
                                                <div
                                                    onClick={() => setSelectedHistoryRace(selectedHistoryRace === race.raceName ? null : race.raceName)}
                                                    className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-700 transition"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-xs bg-red-600 px-2 py-0.5 rounded font-bold uppercase tracking-tighter">Rd {race.round}</span>
                                                        <h4 className="font-bold text-gray-200">{race.raceName}</h4>
                                                    </div>
                                                    <div className="text-gray-500">{selectedHistoryRace === race.raceName ? '▼' : '▶'}</div>
                                                </div>

                                                {selectedHistoryRace === race.raceName && (
                                                    <div className="border-t border-gray-700 p-4 bg-gray-900/50 animate-fadeIn">
                                                        <table className="w-full text-left text-xs">
                                                            <thead>
                                                                <tr className="text-gray-500 uppercase tracking-widest border-b border-gray-800">
                                                                    <th className="py-2">Member</th>
                                                                    <th className="py-2 text-right">Points Earned</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {activeLeague.members.map(member => {
                                                                    const pred = allLeaguePredictions.find(p => p.uid === member.uid && p.raceName === race.raceName);
                                                                    const pts = pred?.leagueScores?.[activeLeague.id]?.totalScore || pred?.totalScore || 0;
                                                                    return (
                                                                        <tr
                                                                            key={member.uid}
                                                                            onClick={() => handleViewMember(member, race.raceName)}
                                                                            className="border-b border-gray-800/50 hover:bg-gray-800 cursor-pointer transition"
                                                                        >
                                                                            <td className="py-2 font-bold">{member.displayName}</td>
                                                                            <td className="py-2 text-right font-black text-red-500">{pts}</td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center py-10 text-gray-600 italic">No historical data available for this league yet.</p>
                                    );
                                })()}
                            </div>
                        ) : detailTab === 'season' ? (
                            <div>
                                <SeasonStandings
                                    members={activeLeague.members}
                                    predictions={allLeaguePredictions}
                                    leagueId={activeLeague.id}
                                />
                            </div>
                        ) : null}
                    </div>
                    {/* League Insights Section */}
                    <div className="mt-8 animate-fadeIn">
                        <div className="flex items-center gap-3 mb-6">
                            <h3 className="text-xl font-bold text-white">League Insights</h3>
                            <div className="h-px flex-grow bg-gradient-to-r from-gray-700 to-transparent"></div>
                            {isStatsLoading && <span className="text-xs text-blue-400 animate-pulse">Calculating...</span>}
                        </div>

                        {leagueStats ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {/* I Like Him (Most Picked) */}
                                <div className="bg-gray-800/50 backdrop-blur-md border border-white/5 p-4 rounded-2xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-3 text-emerald-500/20 text-4xl group-hover:scale-110 transition pb-4">❤️</div>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">"I Like Him"</p>
                                    <h4 className="text-lg font-black italic text-emerald-400">
                                        {formatDriverName(leagueStats.global.iLikeHim?.id, drivers) || 'No one yet'}
                                    </h4>
                                    <p className="text-[9px] text-gray-400 mt-1 leading-tight">
                                        {leagueStats.global.iLikeHim
                                            ? `League favorite! Picked ${leagueStats.global.iLikeHim.picks} times, finished top 10 ${leagueStats.global.iLikeHim.results} times.`
                                            : 'The most popular driver pick in this league.'}
                                    </p>
                                </div>

                                {/* Weirdo */}
                                <div className="bg-gray-800/50 backdrop-blur-md border border-white/5 p-4 rounded-2xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-3 text-purple-500/20 text-4xl group-hover:scale-110 transition pb-4">🌀</div>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">"The Weirdo"</p>
                                    <h4 className="text-lg font-black italic text-purple-400">
                                        {formatDriverName(leagueStats.global.weirdo?.id, drivers) || 'Undiscovered'}
                                    </h4>
                                    <p className="text-[9px] text-gray-400 mt-1 leading-tight">
                                        {leagueStats.global.weirdo
                                            ? `The absolute rarest pick (just ${leagueStats.global.weirdo.picks} times).`
                                            : 'The driver with the absolute fewest picks in this league.'}
                                    </p>
                                </div>

                                {/* The Consistency King (Most Active) */}
                                <div className="bg-gray-800/50 backdrop-blur-md border border-white/5 p-4 rounded-2xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-3 text-yellow-500/20 text-4xl group-hover:scale-110 transition pb-4">📊</div>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">"Consistency King"</p>
                                    <h4 className="text-lg font-black italic text-yellow-500">
                                        {(() => {
                                            // Find member with most predictions submitted
                                            let maxPredictions = 0;
                                            let kingName = 'TBD';
                                            activeLeague.members?.forEach(member => {
                                                const predCount = allLeaguePredictions.filter(p => p.uid === member.uid).length;
                                                if (predCount > maxPredictions) {
                                                    maxPredictions = predCount;
                                                    kingName = member.displayName;
                                                }
                                            });
                                            return kingName;
                                        })()}
                                    </h4>
                                    <p className="text-[9px] text-gray-400 mt-1 leading-tight">
                                        Most dedicated predictor. Never misses a race!
                                    </p>
                                </div>

                                {/* The Gambler (Most Varied) */}
                                <div className="bg-gray-800/50 backdrop-blur-md border border-white/5 p-4 rounded-2xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-3 text-blue-500/20 text-4xl group-hover:scale-110 transition pb-4">🎲</div>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">"The Gambler"</p>
                                    <h4 className="text-lg font-black italic text-blue-400">
                                        {(() => {
                                            // Find member with most unique drivers picked
                                            let maxUnique = 0;
                                            let gamblerName = 'TBD';
                                            activeLeague.members?.forEach(member => {
                                                const memberPreds = allLeaguePredictions.filter(p => p.uid === member.uid);
                                                const uniqueDrivers = new Set(memberPreds.flatMap(p => p.predictions || []));
                                                if (uniqueDrivers.size > maxUnique) {
                                                    maxUnique = uniqueDrivers.size;
                                                    gamblerName = member.displayName || 'Unknown';
                                                }
                                            });
                                            return gamblerName;
                                        })()}
                                    </h4>
                                    <p className="text-[9px] text-gray-400 mt-1 leading-tight">
                                        Most diverse predictions. Keeps everyone guessing!
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-center py-4 text-gray-600 text-sm italic">Unlock insights by placing more predictions!</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
