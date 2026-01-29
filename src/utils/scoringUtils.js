export const DEFAULT_SCORING_RULES = {
    exactMatch: {
        1: 10, // P1
        2: 9,  // P2
        3: 8,  // P3
        4: 7,  // P4
        5: 6,  // P5
        6: 5,  // P6
        7: 4,  // P7
        8: 3,  // P8
        9: 2,  // P9
        10: 1  // P10
    },
    top10Bonus: 1, // Points if in top 10 but not exact match (unless exact match is 0)
    safetyCar: false, // Default off
    safetyCarPoints: 5,
    polePosition: false, // Default off
    polePositionPoints: 5
};

/**
 * Calculates the total score for a prediction based on race results and league rules.
 * 
 * @param {Object} prediction - User's prediction (e.g., { predictions: ["VER", "HAM", ...], safetyCar: "Yes", polePosition: "VER" })
 * @param {Object} results - Official race results (e.g., { results: [{ driver: "VER", position: 1 }, ...], safetyCar: true, polePosition: "VER" })
 * @param {Object} rules - League scoring rules (defaults to DEFAULT_SCORING_RULES)
 * @returns {Object} - { totalScore, breakdown }
 */
export const calculateScore = (prediction, results, rules = DEFAULT_SCORING_RULES) => {
    let totalScore = 0;
    const breakdown = {
        positions: [],
        safetyCar: 0,
        polePosition: 0,
        pitstops: 0 // New breakdown field
    };

    // 1. Calculate Driving Points (Top 10)
    // We assume prediction.predictions is an array of driver codes/names in order 1-10
    if (prediction.predictions && results.results) {
        prediction.predictions.slice(0, 10).forEach((predictedDriver, index) => {
            const predictedPos = index + 1;

            // Find actual result for this driver
            // improved matching: check code, or last name, or full string match
            const actualResult = results.results.find(r =>
                r.driverId === predictedDriver ||
                r.code === predictedDriver ||
                r.familyName?.toLowerCase() === predictedDriver.toLowerCase() ||
                r.driverId?.toLowerCase().includes(predictedDriver.toLowerCase())
            );

            if (actualResult) {
                const actualPos = parseInt(actualResult.position);
                let driverPoints = 0;
                let status = "Miss";

                // Check Scoring Mode
                if (rules.scoringMode === 'radius') {
                    // --- RADIUS OF ERROR SYSTEM ---
                    const diff = Math.abs(predictedPos - actualPos);

                    if (diff === 0) {
                        driverPoints = 10;
                        status = "Bullseye (Exact)";
                    } else if (diff === 1) {
                        driverPoints = 5;
                        status = "Close (+/- 1)";
                    } else if (diff === 2) {
                        driverPoints = 2;
                        status = "Near (+/- 2)";
                    } else {
                        driverPoints = 0;
                        status = "Too far";
                    }
                } else {
                    // --- CLASSIC SYSTEM (Default) ---
                    if (actualPos === predictedPos) {
                        // Exact Match
                        driverPoints = rules.exactMatch[predictedPos] || 0;
                        status = "Exact Match";
                    } else if (actualPos <= 10) {
                        // In Top 10 but not exact
                        driverPoints = rules.top10Bonus;
                        status = "Top 10 Bonus";
                    }
                }

                totalScore += driverPoints;
                breakdown.positions.push({
                    driver: predictedDriver,
                    predictedPos,
                    actualPos,
                    points: driverPoints,
                    status
                });
            } else {
                breakdown.positions.push({
                    driver: predictedDriver,
                    predictedPos,
                    actualPos: 'DNF/Unknown',
                    points: 0,
                    status: "Not in Results"
                });
            }
        });
    }

    // 2. Safety Car (if enabled)
    if (rules.safetyCar) {
        // prediction.safetyCar might be "Yes"/"No" or boolean
        const predSC = normalizeBoolean(prediction.safetyCar);
        const actualSC = normalizeBoolean(results.safetyCar);

        if (predSC === actualSC) {
            totalScore += rules.safetyCarPoints;
            breakdown.safetyCar = rules.safetyCarPoints;
        }
    }

    // 3. Pole Position (if enabled)
    if (rules.polePosition) {
        if (prediction.polePosition && results.polePosition) {
            // Basic string match
            if (prediction.polePosition.toLowerCase() === results.polePosition.toLowerCase()) {
                totalScore += rules.polePositionPoints;
                breakdown.polePosition = rules.polePositionPoints;
            }
        }
    }

    // 4. Pitstop Master Points (if enabled)
    // New rules: min 1, full points if 5+ or exact match
    if (rules.pitstopScoring) {
        if (prediction.pitstops !== undefined && results.medianPitstops !== undefined) {
            const predictedStops = Math.max(1, parseInt(prediction.pitstops)); // Min 1
            const actualStops = parseInt(results.medianPitstops);
            const difference = Math.abs(predictedStops - actualStops);

            let points = 0;
            if (difference === 0) {
                // Exact match
                points = 5;
            } else if (actualStops >= 5 && predictedStops >= 5) {
                // Both are 5+, give full points
                points = 5;
            } else if (difference === 1) {
                // Off by 1
                points = 3;
            } else if (difference === 2) {
                // Off by 2
                points = 1;
            }

            if (points > 0) {
                totalScore += points;
                breakdown.pitstops = points;
            }
        }
    }

    // 5. Red Flag Count (max 3)
    if (rules.redFlag && rules.redFlag.enabled) {
        if (prediction.redFlags !== undefined && results.redFlags !== undefined) {
            const predictedFlags = Math.min(3, parseInt(prediction.redFlags)); // Max 3
            const actualFlags = Math.min(3, parseInt(results.redFlags)); // Max 3

            if (predictedFlags === actualFlags) {
                const points = rules.redFlag.points || 0;
                totalScore += points;
                breakdown.redFlags = points;
            }
        }
    }

    // 6. Safety Car Count (max 5)
    if (rules.safetyCar && typeof rules.safetyCar === 'object' && rules.safetyCar.enabled) {
        if (prediction.safetyCarCount !== undefined && results.safetyCarCount !== undefined) {
            const predictedSC = Math.min(5, parseInt(prediction.safetyCarCount)); // Max 5
            const actualSC = Math.min(5, parseInt(results.safetyCarCount)); // Max 5

            if (predictedSC === actualSC) {
                const points = rules.safetyCar.points || 0;
                totalScore += points;
                breakdown.safetyCarCount = points;
            }
        }
    }

    return { totalScore, breakdown };
};

const normalizeBoolean = (val) => {
    if (typeof val === 'string') {
        const lower = val.toLowerCase();
        return lower === 'yes' || lower === 'true' || lower === 'on';
    }
    return !!val;
};
