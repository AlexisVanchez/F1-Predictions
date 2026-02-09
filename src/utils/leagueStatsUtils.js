/**
 * Utility for calculating catchy statistics for League members.
 */
import { calculateScore, DEFAULT_SCORING_RULES } from './scoringUtils';

/**
 * Calculates fun stats for a league based on predictions and results.
 * 
 * @param {Array} members - League members [{ uid, displayName }]
 * @param {Array} allPredictions - Every prediction doc in the league [ { uid, predictions: ["VER", "NOR", ...], raceName } ]
 * @param {Object} allRaceResults - Dictionary of official results { "Monza": { results: [...] }, ... }
 * @param {Object} scoringRules - League scoring rules
 * @returns {Object} - { global: { iLikeHim, weirdo }, perUser: { [uid]: { favouritePos, favouriteDriver, moneyMaker } } }
 */
export const calculateLeagueFunStats = (members, allPredictions, allRaceResults, scoringRules = DEFAULT_SCORING_RULES) => {
    const stats = {
        global: {
            iLikeHim: null, // Most picked driver + result stats
            weirdo: null    // Least picked driver + result stats
        },
        perUser: {}
    };

    if (!members || !allPredictions) return stats;

    const raceNamesInLeague = new Set(allPredictions.map(p => p.raceName));
    const driverPickCounts = {}; // { driverId: count }
    const driverTop10Counts = {}; // { driverId: actualTop10count }

    // Helper: Extract last name and get 3-letter code
    const getDriverCode = (name) => {
        if (!name) return 'UNK';
        // If already a 3-letter code
        if (name.length === 3 && name === name.toUpperCase()) return name;

        // Extract last name
        const parts = name.trim().split(' ');
        const lastName = parts.length >= 2 ? parts[parts.length - 1] : name;

        // Return first 3 chars of last name 
        return lastName.substring(0, 3).toUpperCase();
    };

    // 1. Initialize driverTop10Counts only from races predicted in this league
    // This makes it "Results via users only"
    Object.keys(allRaceResults).forEach(raceName => {
        if (raceNamesInLeague.has(raceName)) {
            const race = allRaceResults[raceName];
            if (race.result || race.results) {
                const resultsArray = Array.isArray(race.result) ? race.result : (race.results || []);
                // If it's the simplified ["VER", "NOR"] format
                if (typeof resultsArray[0] === 'string') {
                    resultsArray.slice(0, 10).forEach(code => {
                        const normalizedCode = getDriverCode(code);
                        driverTop10Counts[normalizedCode] = (driverTop10Counts[normalizedCode] || 0) + 1;
                    });
                } else {
                    // If it's the object format [{ driverId: 'verstappen', position: 1 }]
                    resultsArray.slice(0, 10).forEach(r => {
                        const id = r.driverId || r.code;
                        if (id) {
                            const normalizedCode = getDriverCode(id);
                            driverTop10Counts[normalizedCode] = (driverTop10Counts[normalizedCode] || 0) + 1;
                        }
                    });
                }
            }
        }
    });

    // 2. Process Per-User Stats and Global Pick Counts
    members.forEach(member => {
        const userBets = allPredictions.filter(p => p.uid === member.uid);
        const posFrequency = {};
        const driverFrequency = {};
        const driverPointsEarned = {}; // { driverId: totalPoints }

        userBets.forEach(bet => {
            // Calculate detailed score breakdown to get points per driver
            const raceResult = allRaceResults[bet.raceName];
            if (raceResult) {
                const { breakdown } = calculateScore(bet, raceResult, scoringRules);
                if (breakdown && breakdown.positions) {
                    breakdown.positions.forEach(pos => {
                        const driverId = getDriverCode(pos.driver);
                        driverPointsEarned[driverId] = (driverPointsEarned[driverId] || 0) + pos.points;
                    });
                }
            }

            (bet.predictions || []).forEach((driverName, index) => {
                const pos = index + 1;
                const driverCode = getDriverCode(driverName);

                // Frequency counts
                posFrequency[pos] = (posFrequency[pos] || 0) + 1;
                driverFrequency[driverCode] = (driverFrequency[driverCode] || 0) + 1;

                // Global tracker
                driverPickCounts[driverCode] = (driverPickCounts[driverCode] || 0) + 1;
            });
        });

        // Find Favourite Position
        let favPos = null;
        let maxPosFreq = 0;
        Object.entries(posFrequency).forEach(([p, count]) => {
            if (count > maxPosFreq) {
                maxPosFreq = count;
                favPos = p;
            }
        });

        // Find Favourite Driver
        let favDriver = null;
        let maxDriverFreq = 0;
        Object.entries(driverFrequency).forEach(([d, count]) => {
            if (count > maxDriverFreq) {
                maxDriverFreq = count;
                favDriver = d;
            }
        });

        // Find Most Points Driver (Money Maker)
        let moneyMaker = null;
        let maxPoints = -1;
        Object.entries(driverPointsEarned).forEach(([d, pts]) => {
            if (pts > maxPoints) {
                maxPoints = pts;
                moneyMaker = d;
            }
        });

        stats.perUser[member.uid] = {
            favouritePos: favPos ? `P${favPos}` : 'N/A',
            favouritePosCount: maxPosFreq,
            favouriteDriver: favDriver || 'N/A',
            favouriteDriverCount: maxDriverFreq,
            moneyMaker: moneyMaker || 'N/A',
            moneyMakerPoints: maxPoints > 0 ? maxPoints : 0
        };
    });

    // 3. Calculate "I like him" (Most Picked Driver in the category)
    // We find the driver with the highest pick count
    let maxPicks = -1;
    let iLikeHimId = null;

    Object.entries(driverPickCounts).forEach(([driverId, picks]) => {
        if (picks > maxPicks) {
            maxPicks = picks;
            iLikeHimId = driverId;
        } else if (picks === maxPicks) {
            // Tie-break: the one with fewer top 10s
            if ((driverTop10Counts[driverId] || 0) < (driverTop10Counts[iLikeHimId] || 0)) {
                iLikeHimId = driverId;
            }
        }
    });

    if (iLikeHimId) {
        stats.global.iLikeHim = {
            id: iLikeHimId,
            picks: maxPicks,
            results: driverTop10Counts[iLikeHimId] || 0
        };
    }

    // 4. Calculate "Weirdo" (Least amount of picks across all league)
    let minPicks = Infinity;
    let weirdoId = null;

    Object.entries(driverPickCounts).forEach(([driverId, picks]) => {
        if (picks < minPicks) {
            minPicks = picks;
            weirdoId = driverId;
        }
    });

    if (weirdoId) {
        stats.global.weirdo = {
            id: weirdoId,
            picks: minPicks,
            results: driverTop10Counts[weirdoId] || 0
        };
    }

    return stats;
};

/**
 * Formats a driver code to a readable name if possible
 */
export const formatDriverName = (code, drivers = []) => {
    if (!code) return 'Unknown';
    const driver = drivers.find(d =>
        (d.driver_number?.toString() === code) ||
        (d.broadcast_name?.includes(code)) ||
        (d.name_acronym === code)
    );
    return driver ? (driver.broadcast_name || driver.name_acronym || code) : code;
};
