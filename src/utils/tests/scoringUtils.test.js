import { calculateScore, DEFAULT_SCORING_RULES, BADGE_SCORING_RULES } from '../scoringUtils';

describe('scoringUtils - calculateScore', () => {
    // --- TEST DATA ---
    const mockPrediction = {
        predictions: ['VER', 'NOR', 'LEC', 'HAM', 'SAI', 'PIA', 'RUS', 'PER', 'ALO', 'HUL'],
        pitstops: 2,
        redFlags: 0,
        safetyCarCount: 1
    };

    const mockResults = {
        results: [
            { driverId: 'VER', position: 1 },
            { driverId: 'NOR', position: 2 },
            { driverId: 'LEC', position: 3 },
            { driverId: 'HAM', position: 4 },
            { driverId: 'SAI', position: 5 },
            { driverId: 'PIA', position: 6 },
            { driverId: 'RUS', position: 7 },
            { driverId: 'PER', position: 8 },
            { driverId: 'ALO', position: 9 },
            { driverId: 'HUL', position: 10 }
        ],
        medianPitstops: 2,
        redFlags: 0,
        safetyCarCount: 1
    };

    // ============================================
    // 1. DEFAULT MODE (RADIUS ERROR) - EXACT MATCHES
    // ============================================
    describe('Default Mode (Radius Error) - Exact Position Matches', () => {
        // DEFAULT_SCORING_RULES now uses radius mode
        it('should give 10 points (Bullseye) for exact P1 match', () => {
            const prediction = { predictions: ['VER'] };
            const results = { results: [{ driverId: 'VER', position: 1 }] };

            const { totalScore, breakdown } = calculateScore(prediction, results);

            expect(breakdown.positions[0].points).toBe(10);
            expect(breakdown.positions[0].status).toBe('Bullseye (Exact)');
            expect(totalScore).toBe(10);
        });

        it('should give 10 points (Bullseye) for exact P2 match', () => {
            const prediction = { predictions: ['X', 'NOR'] };
            const results = {
                results: [
                    { driverId: 'VER', position: 1 },
                    { driverId: 'NOR', position: 2 }
                ]
            };

            const { breakdown } = calculateScore(prediction, results);

            expect(breakdown.positions[1].points).toBe(10); // Radius mode: exact = 10
            expect(breakdown.positions[1].status).toBe('Bullseye (Exact)');
        });

        it('should give perfect score (100 pts) for all 10 exact matches in radius mode', () => {
            // Radius mode: 10 exact matches = 10 * 10 = 100 pts
            const { totalScore, breakdown } = calculateScore(mockPrediction, mockResults);

            const positionPoints = breakdown.positions.reduce((sum, p) => sum + p.points, 0);
            expect(positionPoints).toBe(100); // 10 drivers * 10 pts each
            expect(totalScore).toBe(100); // No bonus features enabled by default
        });
    });

    // ============================================
    // 2. RADIUS MODE - CLOSE PREDICTIONS
    // ============================================
    describe('Default Mode (Radius Error) - Close Predictions', () => {
        it('should give 2 points for +2 position error (predicted P1, actual P3)', () => {
            const prediction = { predictions: ['VER'] }; // Predicted VER P1
            const results = {
                results: [
                    { driverId: 'NOR', position: 1 },
                    { driverId: 'LEC', position: 2 },
                    { driverId: 'VER', position: 3 } // VER actually P3, diff=2
                ]
            };

            const { breakdown } = calculateScore(prediction, results);

            expect(breakdown.positions[0].points).toBe(2); // Near (+/- 2)
            expect(breakdown.positions[0].status).toBe('Near (+/- 2)');
        });

        it('should give 0 points if predicted driver finishes outside Top 10', () => {
            const prediction = { predictions: ['VER'] };
            const results = {
                results: [
                    { driverId: 'NOR', position: 1 },
                    { driverId: 'VER', position: 15 } // Outside top 10
                ]
            };

            const { breakdown } = calculateScore(prediction, results);

            expect(breakdown.positions[0].points).toBe(0);
            expect(breakdown.positions[0].status).toBe('Too far'); // Radius mode status
        });

        it('should give 0 points if predicted driver DNFs', () => {
            const prediction = { predictions: ['VER'] };
            const results = {
                results: [{ driverId: 'NOR', position: 1 }] // VER not in results
            };

            const { breakdown } = calculateScore(prediction, results);

            expect(breakdown.positions[0].points).toBe(0);
            expect(breakdown.positions[0].status).toBe('Not in Results');
        });
    });

    // ============================================
    // 3. RADIUS OF ERROR MODE
    // ============================================
    describe('Radius of Error Mode', () => {
        const radiusRules = { ...DEFAULT_SCORING_RULES, scoringMode: 'radius' };

        it('should give 10 points (Bullseye) for exact match', () => {
            const prediction = { predictions: ['VER'] };
            const results = { results: [{ driverId: 'VER', position: 1 }] };

            const { breakdown } = calculateScore(prediction, results, radiusRules);

            expect(breakdown.positions[0].points).toBe(10);
            expect(breakdown.positions[0].status).toBe('Bullseye (Exact)');
        });

        it('should give 5 points for +/- 1 position error', () => {
            const prediction = { predictions: ['VER'] }; // Predicted P1
            const results = {
                results: [
                    { driverId: 'NOR', position: 1 },
                    { driverId: 'VER', position: 2 } // Actual P2, diff = 1
                ]
            };

            const { breakdown } = calculateScore(prediction, results, radiusRules);

            expect(breakdown.positions[0].points).toBe(5);
            expect(breakdown.positions[0].status).toBe('Close (+/- 1)');
        });

        it('should give 2 points for +/- 2 position error', () => {
            const prediction = { predictions: ['VER'] }; // Predicted P1
            const results = {
                results: [
                    { driverId: 'NOR', position: 1 },
                    { driverId: 'LEC', position: 2 },
                    { driverId: 'VER', position: 3 } // Actual P3, diff = 2
                ]
            };

            const { breakdown } = calculateScore(prediction, results, radiusRules);

            expect(breakdown.positions[0].points).toBe(2);
            expect(breakdown.positions[0].status).toBe('Near (+/- 2)');
        });

        it('should give 1 consolation point if >2 error but still in Top 10', () => {
            const prediction = { predictions: ['VER'] }; // Predicted P1
            const results = {
                results: Array.from({ length: 10 }, (_, i) => ({
                    driverId: i === 9 ? 'VER' : `D${i}`, // VER at P10
                    position: i + 1
                }))
            };

            const { breakdown } = calculateScore(prediction, results, radiusRules);

            expect(breakdown.positions[0].points).toBe(1);
            expect(breakdown.positions[0].status).toBe('Top 10 (Consolation)');
        });

        it('should give 0 points if driver finishes outside Top 10', () => {
            const prediction = { predictions: ['VER'] }; // Predicted P1
            const results = {
                results: [
                    { driverId: 'NOR', position: 1 },
                    { driverId: 'VER', position: 11 } // Outside top 10
                ]
            };

            const { breakdown } = calculateScore(prediction, results, radiusRules);

            expect(breakdown.positions[0].points).toBe(0);
            expect(breakdown.positions[0].status).toBe('Too far');
        });
    });

    // ============================================
    // 4. PITSTOP SCORING
    // ============================================
    describe('Pitstop Scoring', () => {
        const pitstopRules = { ...DEFAULT_SCORING_RULES, pitstopScoring: true };

        it('should give 5 points for exact pitstop match', () => {
            const prediction = { predictions: [], pitstops: 2 };
            const results = { results: [], medianPitstops: 2 };

            const { totalScore, breakdown } = calculateScore(prediction, results, pitstopRules);

            expect(breakdown.pitstops).toBe(5);
            expect(totalScore).toBe(5);
        });

        it('should give 0 points if pitstop prediction is wrong', () => {
            const prediction = { predictions: [], pitstops: 3 };
            const results = { results: [], medianPitstops: 2 };

            const { breakdown } = calculateScore(prediction, results, pitstopRules);

            expect(breakdown.pitstops).toBe(0);
        });

        it('should treat pitstops < 1 as 1 (minimum)', () => {
            const prediction = { predictions: [], pitstops: 0 }; // Should become 1
            const results = { results: [], medianPitstops: 1 };

            const { breakdown } = calculateScore(prediction, results, pitstopRules);

            expect(breakdown.pitstops).toBe(5); // Should match since 0 -> 1
        });
    });

    // ============================================
    // 5. RED FLAG SCORING
    // ============================================
    describe('Red Flag Scoring', () => {
        const redFlagRules = {
            ...DEFAULT_SCORING_RULES,
            redFlag: { enabled: true, points: 5 }
        };

        it('should give 5 points for exact red flag count match', () => {
            const prediction = { predictions: [], redFlags: 1 };
            const results = { results: [], redFlags: 1 };

            const { totalScore, breakdown } = calculateScore(prediction, results, redFlagRules);

            expect(breakdown.redFlags).toBe(5);
            expect(totalScore).toBe(5);
        });

        it('should give 0 points if red flag count is wrong', () => {
            const prediction = { predictions: [], redFlags: 2 };
            const results = { results: [], redFlags: 0 };

            const { breakdown } = calculateScore(prediction, results, redFlagRules);

            expect(breakdown.redFlags).toBe(0);
        });

        it('should cap red flags at 3 max for comparison', () => {
            const prediction = { predictions: [], redFlags: 5 }; // Should become 3
            const results = { results: [], redFlags: 3 };

            const { breakdown } = calculateScore(prediction, results, redFlagRules);

            expect(breakdown.redFlags).toBe(5); // Match at cap
        });

        it('should treat null red flags as 0', () => {
            const prediction = { predictions: [], redFlags: null };
            const results = { results: [], redFlags: 0 };

            const { breakdown } = calculateScore(prediction, results, redFlagRules);

            expect(breakdown.redFlags).toBe(5); // null -> 0, match
        });
    });

    // ============================================
    // 6. SAFETY CAR COUNT SCORING
    // ============================================
    describe('Safety Car Count Scoring', () => {
        const scRules = {
            ...DEFAULT_SCORING_RULES,
            safetyCar: { enabled: true, points: 5 }
        };

        it('should give 5 points for exact safety car count match', () => {
            const prediction = { predictions: [], safetyCarCount: 2 };
            const results = { results: [], safetyCarCount: 2 };

            const { breakdown } = calculateScore(prediction, results, scRules);

            expect(breakdown.safetyCarCount).toBe(5);
        });

        it('should give 0 points if safety car count is wrong', () => {
            const prediction = { predictions: [], safetyCarCount: 3 };
            const results = { results: [], safetyCarCount: 1 };

            const { breakdown } = calculateScore(prediction, results, scRules);

            expect(breakdown.safetyCarCount || 0).toBe(0);
        });

        it('should cap safety car count at 5 max for comparison', () => {
            const prediction = { predictions: [], safetyCarCount: 10 }; // Should become 5
            const results = { results: [], safetyCarCount: 5 };

            const { breakdown } = calculateScore(prediction, results, scRules);

            expect(breakdown.safetyCarCount).toBe(5); // Match at cap
        });
    });

    // ============================================
    // 7. COMBINED SCORING SCENARIOS
    // ============================================
    describe('Combined Scoring - Full Race', () => {
        it('should calculate total score correctly with all bonuses enabled', () => {
            const fullRules = {
                ...DEFAULT_SCORING_RULES,
                pitstopScoring: true,
                redFlag: { enabled: true, points: 5 },
                safetyCar: { enabled: true, points: 5 }
            };

            const prediction = {
                predictions: ['VER', 'NOR', 'LEC'], // 3 exact matches: 10+9+8 = 27
                pitstops: 2,                         // Match: +5
                redFlags: 0,                         // Match: +5
                safetyCarCount: 1                    // Match: +5
            };

            const results = {
                results: [
                    { driverId: 'VER', position: 1 },
                    { driverId: 'NOR', position: 2 },
                    { driverId: 'LEC', position: 3 }
                ],
                medianPitstops: 2,
                redFlags: 0,
                safetyCarCount: 1
            };

            const { totalScore, breakdown } = calculateScore(prediction, results, fullRules);

            // Position points (radius mode: exact = 10 each)
            const posPoints = breakdown.positions.reduce((s, p) => s + p.points, 0);
            expect(posPoints).toBe(30); // 10+10+10 (radius mode)

            // Bonus points
            expect(breakdown.pitstops).toBe(5);
            expect(breakdown.redFlags).toBe(5);
            expect(breakdown.safetyCarCount).toBe(5);

            // Total
            expect(totalScore).toBe(45); // 30 (radius mode) + 5 + 5 + 5
        });
    });

    // ============================================
    // 8. DRIVER NAME MATCHING EDGE CASES
    // ============================================
    describe('Driver Name Matching', () => {
        it('should match full name to 3-letter code (VER = Verstappen)', () => {
            const prediction = { predictions: ['Verstappen'] };
            const results = { results: [{ driverId: 'VER', position: 1 }] };

            const { breakdown } = calculateScore(prediction, results);

            expect(breakdown.positions[0].status).toBe('Bullseye (Exact)'); // Radius mode
        });

        it('should match case-insensitively', () => {
            const prediction = { predictions: ['ver'] };
            const results = { results: [{ driverId: 'VER', position: 1 }] };

            const { breakdown } = calculateScore(prediction, results);

            expect(breakdown.positions[0].status).toBe('Bullseye (Exact)'); // Radius mode
        });

        it('should handle simplified result format (array of strings)', () => {
            const prediction = { predictions: ['VER', 'NOR'] };
            const results = { result: ['VER', 'NOR', 'LEC'] }; // Simplified format

            const { breakdown } = calculateScore(prediction, results);

            expect(breakdown.positions[0].status).toBe('Bullseye (Exact)'); // Radius mode
            expect(breakdown.positions[1].status).toBe('Bullseye (Exact)'); // Radius mode
        });
    });

    // ============================================
    // 9. BADGE SCORING RULES (POSITION-ONLY)
    // ============================================
    describe('BADGE_SCORING_RULES - Position Points Only', () => {
        it('should use radius error mode', () => {
            const prediction = { predictions: ['VER'] };
            const results = { results: [{ driverId: 'VER', position: 1 }] };

            const { breakdown } = calculateScore(prediction, results, BADGE_SCORING_RULES);

            expect(breakdown.positions[0].points).toBe(10);
            expect(breakdown.positions[0].status).toBe('Bullseye (Exact)');
        });

        it('should NOT award points for pitstops (disabled)', () => {
            const prediction = { predictions: [], pitstops: 2 };
            const results = { results: [], medianPitstops: 2 };

            const { breakdown } = calculateScore(prediction, results, BADGE_SCORING_RULES);

            expect(breakdown.pitstops).toBe(0); // Disabled
        });

        it('should NOT award points for red flags (disabled)', () => {
            const prediction = { predictions: [], redFlags: 1 };
            const results = { results: [], redFlags: 1 };

            const { breakdown } = calculateScore(prediction, results, BADGE_SCORING_RULES);

            expect(breakdown.redFlags).toBe(0); // Disabled
        });

        it('should NOT award points for safety car count (disabled)', () => {
            const prediction = { predictions: [], safetyCarCount: 2 };
            const results = { results: [], safetyCarCount: 2 };

            const { breakdown } = calculateScore(prediction, results, BADGE_SCORING_RULES);

            expect(breakdown.safetyCarCount || 0).toBe(0); // Disabled
        });

        it('should only count position points in total score', () => {
            const prediction = {
                predictions: ['VER', 'NOR', 'LEC'], // 3 exact: 10+10+10 = 30
                pitstops: 2,
                redFlags: 0,
                safetyCarCount: 1
            };

            const results = {
                results: [
                    { driverId: 'VER', position: 1 },
                    { driverId: 'NOR', position: 2 },
                    { driverId: 'LEC', position: 3 }
                ],
                medianPitstops: 2,    // Would match but disabled
                redFlags: 0,          // Would match but disabled
                safetyCarCount: 1     // Would match but disabled
            };

            const { totalScore } = calculateScore(prediction, results, BADGE_SCORING_RULES);

            expect(totalScore).toBe(30); // Only position points, no bonuses
        });
    });
});
