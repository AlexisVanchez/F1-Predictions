import { calculateScore, DEFAULT_SCORING_RULES } from './scoringUtils';

// --- 1. TRACK GROUPS DEFINITION ---

export const ACH_PITSTOP_MASTER = {
    id: 'ach_pitstop_master',
    name: 'Pitstop Master',
    icon: 'stopwatch-20',
    color: '#34d399', // Emerald Green
    description: 'Guessed median pitstops 5 times in a row.'
};

/**
 * Monaco Medal Achievement Definition
 * Awarded for guessing the exact top 3 in a race.
 */
export const ACH_MONACO = {
    id: 'ach_monaco',
    name: 'Monaco GP Master',
    icon: 'crown',
    color: '#f87171', // Soft Red
    description: 'Guessed the exact Top 3 (P1, P2, P3) in a race.'
};

/**
 * Constructor Medal Achievement Mapping
 * One medal for each team, awarded based on who brought the most points.
 */
export const CONSTRUCTOR_MEDALS = {
    'Red Bull Racing': { id: 'team_red_bull', name: 'RBR Excellence', icon: 'bullseye', color: '#1e3a8a' },
    'Mercedes': { id: 'team_mercedes', name: 'Silver Arrow', icon: 'star', color: '#6b7280' },
    'Ferrari': { id: 'team_ferrari', name: 'Tifosi Pride', icon: 'horse', color: '#ef4444' },
    'McLaren': { id: 'team_mclaren', name: 'Papaya Power', icon: 'shuttle-van', color: '#f97316' },
    'Aston Martin': { id: 'team_aston', name: 'Green Racing', icon: 'leaf', color: '#065f46' },
    'Alpine': { id: 'team_alpine', name: 'Alpine Spirit', icon: 'mountain', color: '#2563eb' },
    'Williams': { id: 'team_williams', name: 'Williams Heritage', icon: 'flag', color: '#60a5fa' },
    'Racing Bulls': { id: 'team_rb', name: 'Bulls Legacy', icon: 'bolt', color: '#3b82f6' },
    'Haas F1 Team': { id: 'team_haas', name: 'Haas Hustle', icon: 'gears', color: '#71717a' },
    'Audi': { id: 'team_audi', name: 'Audi Vorsprung', icon: 'circle-nodes', color: '#e5e7eb' },
    'Cadillac': { id: 'team_cadillac', name: 'Cadillac V-Series', icon: 'shield-halved', color: '#facc15' }
};

export const TRACK_GROUPS = {
    POWER: {
        id: 'group_1_power',
        name: 'Power',
        icon: 'bolt', // FontAwesome icon
        color: '#ff3e3e', // Red/Orange for Power
        description: 'Dominated by engine power + aero efficiency.',
        tracks: [
            'Italy - Monza',
            'Belgium - Spa-Francorchamps',
            'Great Britain - Silverstone',
            'Saudi Arabia - Jeddah'
        ]
    },
    STREET: {
        id: 'group_4_street',
        name: 'Street',
        icon: 'city',
        color: '#9d00ff', // Purple for Street/Night
        description: 'Walls, bumps, low grip, rapid track evolution.',
        tracks: [
            'Monaco - Monte Carlo',
            'Singapore - Marina Bay',
            'Azerbaijan - Baku',
            'USA - Miami',
            'USA - Las Vegas',
            'Spain - Madrid',
            'China - Shanghai'
        ]
    },
    BALANCE: {
        id: 'group_2_balance',
        name: 'Balance',
        icon: 'scale-balanced',
        color: '#ffd700', // Gold/Yellow for layout balance
        description: 'No single dominant limiting factor. Good all-rounders.',
        tracks: [
            'Bahrain',
            'Abu Dhabi',
            'Canada',
            'Austria',
            'Qatar', // "Qatar (Lusail)" -> simplified matching usually better
            'Mexico',
            'Australia'

        ]
    },
    PRECISION: {
        id: 'group_3_precision',
        name: 'Precision',
        icon: 'crosshairs',
        color: '#00ff88', // Green for precision/flow
        description: 'Narrow performance windows, punish over-driving.',
        tracks: [
            'Japan - Suzuka',
            'Hungary - Hungaroring',
            'Netherlands - Zandvoort',
            'Italy - Imola',
            'Portugal - Portimão',
            'Brazil - Interlagos'
        ]
    }
};

/**
 * Helper to normalize track names for comparison.
 * e.g. "Qatar (Lusail)" -> "Qatar"
 */
export const normalizeTrackName = (name) => {
    if (!name) return '';
    const n = name.toLowerCase();
    if (n.includes('monza')) return 'Monza';
    if (n.includes('spa')) return 'Spa-Francorchamps';
    if (n.includes('silverstone')) return 'Silverstone';
    if (n.includes('jeddah') || n.includes('saudi')) return 'Jeddah';

    if (n.includes('monaco')) return 'Monaco';
    if (n.includes('singapore')) return 'Singapore';
    if (n.includes('baku') || n.includes('azerbaijan')) return 'Baku';
    if (n.includes('miami')) return 'Miami';
    if (n.includes('vegas')) return 'Las Vegas';
    if (n.includes('madrid')) return 'Madrid';

    if (n.includes('bahrain')) return 'Bahrain';
    if (n.includes('dhabi')) return 'Abu Dhabi';
    if (n.includes('canada') || n.includes('montreal')) return 'Canada';
    if (n.includes('austria')) return 'Austria';
    if (n.includes('qatar') || n.includes('lusail')) return 'Qatar';
    if (n.includes('mexico')) return 'Mexico';

    if (n.includes('australia') || n.includes('melbourne')) return 'Australia';
    if (n.includes('china') || n.includes('shanghai')) return 'China';

    if (n.includes('suzuka') || n.includes('japan')) return 'Suzuka';
    if (n.includes('hungary') || n.includes('hungaroring')) return 'Hungaroring';
    if (n.includes('zandvoort') || n.includes('dutch')) return 'Zandvoort';
    if (n.includes('imola') || n.includes('emilia')) return 'Imola';
    if (n.includes('portimao') || n.includes('portimão') || n.includes('portugal')) return 'Portimão';
    if (n.includes('brazil') || n.includes('interlagos') || n.includes('sao paulo')) return 'Brazil';

    return name; // Return original if no match found (fallback)
};

/**
 * Calculates the best result for a user within a specific track group.
 * 
 * @param {string} groupId - Key from TRACK_GROUPS (e.g., 'POWER', 'STREET')
 * @param {Array} userPredictions - Array of user's prediction objects (from Firestore via Redux)
 * @param {Object} allRaceResults - Dictionary of official results keyed by raceName OR array
 *                                  For simplicity in this app, we might pass an array of results found so far.
 * @returns {Object|null} - The best prediction result { track, score, date, ... } or null
 */
export const calculateGroupBest = (groupKey, userPredictions, allRaceResults, scoringRules = DEFAULT_SCORING_RULES) => {
    const group = TRACK_GROUPS[groupKey];
    if (!group) return null;

    let bestPerformance = null;

    // Filter predictions that belong to this group
    const groupPredictions = userPredictions.filter(pred => {
        const normalizedPredName = normalizeTrackName(pred.raceName);
        // Check if this track name matches any in the group's list
        return group.tracks.some(t => normalizeTrackName(t) === normalizedPredName);
    });

    groupPredictions.forEach(pred => {
        // Find corresponding official result
        // Assuming allRaceResults is a map: { "Monza": { results: [...] }, ... }
        // Or if it's an array, we find it.
        // Let's assume the caller passes a Map/Object for O(1) lookup.

        const normalizedTrack = normalizeTrackName(pred.raceName);
        const officialResult = allRaceResults[normalizedTrack] || allRaceResults[pred.raceName];

        if (officialResult) {
            // Calculate Score
            const { totalScore } = calculateScore(pred, officialResult, scoringRules);

            // Check if this is the best score so far for this group
            if (!bestPerformance || totalScore > bestPerformance.score) {
                bestPerformance = {
                    track: pred.raceName, // Keep original name for display
                    normalizedTrack: normalizedTrack,
                    score: totalScore,
                    date: pred.date,
                    prediction: pred,
                    group: group.name
                };
            }
        }
    });

    return bestPerformance;
};

/**
 * Calculates current streak of correct pitstop predictions.
 * Returns achievement object if streak >= 5.
 */
export const calculatePitstopStreak = (userPredictions, allRaceResults) => {
    // Sort predictions by date (newest first for streak check? or oldest first to count?)
    // Logic: "5 predictions in a row".
    // 1. Sort by date ascending.
    // 2. Iterate. If Correct, streak++. If Wrong, streak=0.
    // 3. Keep track of max streak ? Or current?
    // Requirement: "if he gets 5 predictions of pits correct in a row, he get a badge"
    // Usually means ANY sequence of 5.

    const sortedBets = [...userPredictions].sort((a, b) => new Date(a.date) - new Date(b.date));
    let currentStreak = 0;
    let maxStreak = 0;

    sortedBets.forEach(pred => {
        const normalizedTrack = normalizeTrackName(pred.raceName);
        const officialResult = allRaceResults[normalizedTrack] || allRaceResults[pred.raceName];

        if (officialResult && officialResult.medianPitstops !== undefined && pred.pitstops !== undefined) {
            if (parseInt(pred.pitstops) === parseInt(officialResult.medianPitstops)) {
                currentStreak++;
            } else {
                currentStreak = 0;
            }
            if (currentStreak > maxStreak) maxStreak = currentStreak;
        }
    });

    if (maxStreak >= 5) {
        return {
            track: "Streak Master",
            score: maxStreak,
            date: new Date().toISOString(),
            // ... any other metadata
        };
    }
    return null;
};

// --- New Achievement Definitions ---
export const ACH_CONSISTENCY = {
    id: 'ach_consistency',
    name: 'Mr. Consistency',
    icon: 'balance-scale',
    color: '#60a5fa', // Blue
    description: 'Maintained a score difference of ≤3 pts over last 5 races.'
};

export const ACH_CHAMPION = {
    id: 'ach_champion',
    name: 'Champion of the Year',
    icon: 'trophy',
    color: '#facc15', // Yellow/Gold
    description: 'Winner of a league with 5+ contenders.'
};

export const ACH_POLE_KING = {
    id: 'ach_pole_king',
    name: 'Pole King',
    icon: 'flag-checkered',
    color: '#c084fc', // Purple
    description: 'Master of Saturday. Multiple correct Pole Position predictions.'
};

// ... existing code ...

/**
 * Calculates consistency achievement.
 * Returns achievement object if last 5 predictions have score variance <= 3.
 */
export const calculateConsistency = (userPredictions, allRaceResults, scoringRules = DEFAULT_SCORING_RULES) => {
    if (userPredictions.length < 5) return null;

    // 1. Sort by date ascending to check chronological streaks
    const sortedBets = [...userPredictions].sort((a, b) => new Date(a.date) - new Date(b.date));

    // 2. Pre-calculate scores for all predictions to avoid re-calcing inside loop
    const predictionScores = [];
    for (const pred of sortedBets) {
        const normalizedTrack = normalizeTrackName(pred.raceName);
        const officialResult = allRaceResults[normalizedTrack] || allRaceResults[pred.raceName];

        if (officialResult) {
            const { totalScore } = calculateScore(pred, officialResult, scoringRules);
            predictionScores.push({ ...pred, totalScore });
        }
    }

    if (predictionScores.length < 5) return null;

    // 3. Sliding Window of 5
    for (let i = 0; i <= predictionScores.length - 5; i++) {
        const window = predictionScores.slice(i, i + 5);
        const scores = window.map(p => p.totalScore);
        const minScore = Math.min(...scores);
        const maxScore = Math.max(...scores);

        if ((maxScore - minScore) <= 3) {
            return {
                track: "Best Streak",
                score: "Stable", // Could display "30-33 pts" or similar
                date: new Date().toISOString()
            };
        }
    }

    return null;
};

/**
 * Checks for League Champion status.
 * Returns an array of championships: [{ year, track, date }]
 */
export const calculateChampion = (leagues, userUid) => {
    if (!leagues || leagues.length === 0) return [];

    const championshipsByYear = {};

    // Check each league
    for (const league of leagues) {
        if (league.members && league.members.length >= 5) {
            const standings = league.standings || {};
            const sortedUids = Object.keys(standings).sort((a, b) => standings[b] - standings[a]);

            if (sortedUids.length > 0 && sortedUids[0] === userUid) {
                // Determine Year
                let year = 2026;
                if (league.createdAt) {
                    const dateObj = typeof league.createdAt.toDate === 'function'
                        ? league.createdAt.toDate()
                        : new Date(league.createdAt);
                    year = dateObj.getFullYear();
                }

                // If multiple wins in same year, only record once (highest quality win could be added later)
                if (!championshipsByYear[year]) {
                    championshipsByYear[year] = {
                        year: year,
                        track: league.name, // The league name
                        score: "WINNER",
                        date: league.createdAt
                    };
                }
            }
        }
    }

    return Object.values(championshipsByYear).sort((a, b) => b.year - a.year);
};

/**
 * Checks for Pole King Verification.
 * (MVP: Personal Pole Count >= 3)
 */
export const calculatePoleKing = (userPredictions, allRaceResults) => {
    let poleHits = 0;

    userPredictions.forEach(pred => {
        const normalizedTrack = normalizeTrackName(pred.raceName);
        const officialResult = allRaceResults[normalizedTrack] || allRaceResults[pred.raceName];

        if (officialResult && officialResult.polePosition && pred.polePosition) {
            if (officialResult.polePosition.toLowerCase() === pred.polePosition.toLowerCase()) {
                poleHits++;
            }
        }
    });

    if (poleHits >= 3) {
        return {
            track: "Qualifying",
            score: `${poleHits} Poles`,
            date: new Date().toISOString()
        };
    }
    return null;
};

/**
 * Calculates if the user has earned the Monaco Medal.
 * Requirement: Guess the exact Top 3 in any race.
 */
export const calculateMonacoMedal = (userPredictions, allRaceResults) => {
    for (const pred of userPredictions) {
        const normalizedTrack = normalizeTrackName(pred.raceName);
        const result = allRaceResults[normalizedTrack] || allRaceResults[pred.raceName];

        if (result && result.results && pred.predictions) {
            // Check top 3
            const predTop3 = pred.predictions.slice(0, 3);
            const actualTop3 = result.results.slice(0, 3).map(r => r.driverId || r.code);

            const isMatch = predTop3.every((p, i) => p === actualTop3[i]);

            if (isMatch) {
                return {
                    track: pred.raceName,
                    score: "Top 3 Hit",
                    date: pred.date
                };
            }
        }
    }
    return null;
};

/**
 * Calculates which Constructor Medal a user should receive.
 * Requirement: The team that brought the user the most points through their drivers.
 */
export const calculateConstructorMedals = (userPredictions, allRaceResults, drivers, scoringRules = DEFAULT_SCORING_RULES) => {
    if (!drivers || drivers.length === 0) return null;

    const teamPoints = {};

    userPredictions.forEach(pred => {
        const normalizedTrack = normalizeTrackName(pred.raceName);
        const result = allRaceResults[normalizedTrack] || allRaceResults[pred.raceName];

        if (result && result.results) {
            const { breakdown } = calculateScore(pred, result, scoringRules);

            breakdown.positions.forEach(pos => {
                // Find driver's team (case-insensitive matching)
                const driverName = pos.driver?.toUpperCase() || '';
                const driverData = drivers.find(d => {
                    const broadcastName = d.broadcast_name?.toUpperCase() || '';
                    const driverNum = d.driver_number?.toString() || '';
                    const code = d.code?.toUpperCase() || '';

                    return (
                        code === driverName ||
                        driverNum === driverName ||
                        broadcastName === driverName ||
                        broadcastName.includes(driverName) ||
                        driverName.includes(broadcastName.split(' ').pop()) // Match by last name
                    );
                });

                if (driverData && driverData.team_name) {
                    let teamName = driverData.team_name;

                    // Alias mapping for consistency with CONSTRUCTOR_MEDALS keys
                    if (teamName === 'RB') teamName = 'Racing Bulls';
                    if (teamName === 'Sauber') teamName = 'Audi';
                    if (teamName === 'Haas') teamName = 'Haas F1 Team';

                    teamPoints[teamName] = (teamPoints[teamName] || 0) + pos.points;
                }
            });
        }
    });

    // Find the team with max points
    let bestTeam = null;
    let maxPoints = 0;

    Object.entries(teamPoints).forEach(([team, points]) => {
        if (points > maxPoints) {
            maxPoints = points;
            bestTeam = team;
        }
    });

    if (bestTeam && maxPoints > 0) {
        const medalDef = CONSTRUCTOR_MEDALS[bestTeam];
        if (medalDef) {
            return {
                team: bestTeam,
                points: maxPoints,
                medalDef: medalDef
            };
        }
    }

    return null;
};
