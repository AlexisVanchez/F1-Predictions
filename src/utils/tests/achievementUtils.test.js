import {
    normalizeTrackName,
    calculateGroupBest,
    calculatePitstopStreak,
    calculateConsistency,
    calculateChampion,
    calculatePoleKing,
    calculateMonacoMedal,
    calculateConstructorMedals,
    TRACK_GROUPS
} from '../achievementUtils';
import { DEFAULT_SCORING_RULES } from '../scoringUtils';

describe('achievementUtils', () => {
    // ============================================
    // 1. NORMALIZE TRACK NAME
    // ============================================
    describe('normalizeTrackName', () => {
        // Note: normalizeTrackName uses keyword matching
        it('should normalize names containing "monza" to "Monza"', () => {
            expect(normalizeTrackName('Italy - Monza')).toBe('Monza');
            expect(normalizeTrackName('Monza GP')).toBe('Monza');
            expect(normalizeTrackName('Monza Grand Prix')).toBe('Monza');
        });

        it('should normalize names containing "spa" to "Spa-Francorchamps"', () => {
            expect(normalizeTrackName('Spa GP')).toBe('Spa-Francorchamps');
            expect(normalizeTrackName('Belgium - Spa-Francorchamps')).toBe('Spa-Francorchamps');
        });

        it('should normalize "Monaco Grand Prix" to "Monaco"', () => {
            expect(normalizeTrackName('Monaco Grand Prix')).toBe('Monaco');
        });

        it('should normalize names containing "japan" or "suzuka" to "Suzuka"', () => {
            expect(normalizeTrackName('Japanese Grand Prix')).toBe('Suzuka');
            expect(normalizeTrackName('Japan - Suzuka')).toBe('Suzuka');
        });

        it('should normalize names containing "australia" or "melbourne" to "Australia"', () => {
            expect(normalizeTrackName('Australian Grand Prix')).toBe('Australia');
            expect(normalizeTrackName('Melbourne')).toBe('Australia');
        });

        it('should normalize names containing "dhabi" to "Abu Dhabi"', () => {
            expect(normalizeTrackName('Abu Dhabi Grand Prix')).toBe('Abu Dhabi');
        });

        it('should normalize names containing "vegas" to "Las Vegas"', () => {
            expect(normalizeTrackName('Las Vegas Grand Prix')).toBe('Las Vegas');
        });

        it('should return original name if no match found', () => {
            expect(normalizeTrackName('Unknown Circuit')).toBe('Unknown Circuit');
        });

        it('should handle null/undefined gracefully', () => {
            expect(normalizeTrackName(null)).toBe('');
            expect(normalizeTrackName(undefined)).toBe('');
        });
    });

    // ============================================
    // 2. CALCULATE GROUP BEST
    // ============================================
    describe('calculateGroupBest', () => {
        const mockPredictions = [
            { raceName: 'Monza GP', predictions: ['VER', 'NOR', 'LEC'], date: '2026-01-01' },
            { raceName: 'Spa GP', predictions: ['VER', 'HAM', 'NOR'], date: '2026-01-08' }
        ];

        const mockResults = {
            'Monza': {
                results: [
                    { driverId: 'VER', position: 1 },
                    { driverId: 'NOR', position: 2 },
                    { driverId: 'LEC', position: 3 }
                ]
            },
            'Spa-Francorchamps': {
                results: [
                    { driverId: 'VER', position: 1 },
                    { driverId: 'HAM', position: 2 },
                    { driverId: 'NOR', position: 3 }
                ]
            }
        };

        it('should return best performance for POWER group', () => {
            const best = calculateGroupBest('POWER', mockPredictions, mockResults);

            expect(best).not.toBeNull();
            expect(best.group).toBe('Power');
            expect(best.score).toBeGreaterThan(0);
        });

        it('should return null if no predictions match the group', () => {
            const emptyPredictions = [
                { raceName: 'Unknown Race', predictions: ['VER'] }
            ];
            const best = calculateGroupBest('POWER', emptyPredictions, mockResults);

            expect(best).toBeNull();
        });

        it('should return null for invalid group key', () => {
            const best = calculateGroupBest('INVALID_GROUP', mockPredictions, mockResults);
            expect(best).toBeNull();
        });
    });

    // ============================================
    // 3. PITSTOP STREAK
    // ============================================
    describe('calculatePitstopStreak', () => {
        it('should return achievement for 5+ consecutive correct pitstop predictions', () => {
            const predictions = Array.from({ length: 6 }, (_, i) => ({
                raceName: `Race${i}`,
                pitstops: 2,
                date: `2026-01-0${i + 1}`
            }));

            const results = {};
            predictions.forEach(p => {
                results[p.raceName] = { medianPitstops: 2 };
            });

            const streak = calculatePitstopStreak(predictions, results);

            expect(streak).not.toBeNull();
            expect(streak.score).toBeGreaterThanOrEqual(5);
        });

        it('should return null if streak is less than 5', () => {
            const predictions = Array.from({ length: 3 }, (_, i) => ({
                raceName: `Race${i}`,
                pitstops: 2,
                date: `2026-01-0${i + 1}`
            }));

            const results = {};
            predictions.forEach(p => {
                results[p.raceName] = { medianPitstops: 2 };
            });

            const streak = calculatePitstopStreak(predictions, results);

            expect(streak).toBeNull();
        });

        it('should reset streak after a wrong prediction', () => {
            const predictions = [
                { raceName: 'R1', pitstops: 2, date: '2026-01-01' },
                { raceName: 'R2', pitstops: 2, date: '2026-01-02' },
                { raceName: 'R3', pitstops: 3, date: '2026-01-03' }, // WRONG
                { raceName: 'R4', pitstops: 2, date: '2026-01-04' },
                { raceName: 'R5', pitstops: 2, date: '2026-01-05' }
            ];

            const results = {
                'R1': { medianPitstops: 2 },
                'R2': { medianPitstops: 2 },
                'R3': { medianPitstops: 2 }, // Predicted 3, actual 2 = MISS
                'R4': { medianPitstops: 2 },
                'R5': { medianPitstops: 2 }
            };

            const streak = calculatePitstopStreak(predictions, results);

            expect(streak).toBeNull(); // Max streak is 2, not 5
        });
    });

    // ============================================
    // 4. CONSISTENCY
    // ============================================
    describe('calculateConsistency', () => {
        it('should return achievement if variance <= 3 over last 5 races', () => {
            const predictions = Array.from({ length: 5 }, (_, i) => ({
                raceName: `Race${i}`,
                predictions: ['VER', 'NOR', 'LEC'],
                date: `2026-01-0${i + 1}`
            }));

            // All races have same results = same score = variance 0
            const results = {};
            predictions.forEach(p => {
                results[p.raceName] = {
                    results: [
                        { driverId: 'VER', position: 1 },
                        { driverId: 'NOR', position: 2 },
                        { driverId: 'LEC', position: 3 }
                    ]
                };
            });

            const consistency = calculateConsistency(predictions, results);

            expect(consistency).not.toBeNull();
            expect(consistency.score).toBe('Stable');
        });

        it('should return null if less than 5 predictions', () => {
            const predictions = [
                { raceName: 'R1', predictions: ['VER'], date: '2026-01-01' }
            ];
            const results = { 'R1': { results: [{ driverId: 'VER', position: 1 }] } };

            const consistency = calculateConsistency(predictions, results);

            expect(consistency).toBeNull();
        });
    });

    // ============================================
    // 5. CHAMPION
    // ============================================
    describe('calculateChampion', () => {
        it('should return championship if user is #1 in league with 5+ members', () => {
            const leagues = [{
                name: 'Test League',
                members: [{ uid: 'u1' }, { uid: 'u2' }, { uid: 'u3' }, { uid: 'u4' }, { uid: 'u5' }],
                standings: { u1: 100, u2: 80, u3: 60, u4: 40, u5: 20 },
                createdAt: new Date('2026-01-01')
            }];

            const championships = calculateChampion(leagues, 'u1');

            expect(championships).toHaveLength(1);
            expect(championships[0].year).toBe(2026);
        });

        it('should return empty array if user is not #1', () => {
            const leagues = [{
                name: 'Test League',
                members: [{ uid: 'u1' }, { uid: 'u2' }, { uid: 'u3' }, { uid: 'u4' }, { uid: 'u5' }],
                standings: { u1: 100, u2: 80, u3: 60, u4: 40, u5: 20 }
            }];

            const championships = calculateChampion(leagues, 'u2'); // u2 is not #1

            expect(championships).toHaveLength(0);
        });

        it('should return empty array if league has less than 5 members', () => {
            const leagues = [{
                name: 'Small League',
                members: [{ uid: 'u1' }, { uid: 'u2' }],
                standings: { u1: 100, u2: 50 }
            }];

            const championships = calculateChampion(leagues, 'u1');

            expect(championships).toHaveLength(0);
        });
    });

    // ============================================
    // 6. POLE KING
    // ============================================
    describe('calculatePoleKing', () => {
        it('should return achievement for 3+ correct pole position predictions', () => {
            const predictions = [
                { raceName: 'R1', polePosition: 'VER' },
                { raceName: 'R2', polePosition: 'VER' },
                { raceName: 'R3', polePosition: 'VER' }
            ];

            const results = {
                'R1': { polePosition: 'VER' },
                'R2': { polePosition: 'VER' },
                'R3': { polePosition: 'VER' }
            };

            const poleKing = calculatePoleKing(predictions, results);

            expect(poleKing).not.toBeNull();
            expect(poleKing.score).toBe('3 Poles');
        });

        it('should return null for less than 3 correct poles', () => {
            const predictions = [
                { raceName: 'R1', polePosition: 'VER' },
                { raceName: 'R2', polePosition: 'NOR' } // Wrong
            ];

            const results = {
                'R1': { polePosition: 'VER' },
                'R2': { polePosition: 'VER' }
            };

            const poleKing = calculatePoleKing(predictions, results);

            expect(poleKing).toBeNull();
        });
    });

    // ============================================
    // 7. MONACO MEDAL
    // ============================================
    describe('calculateMonacoMedal', () => {
        it('should return achievement for exact Top 3 prediction', () => {
            const predictions = [{
                raceName: 'Monaco Grand Prix',
                predictions: ['VER', 'NOR', 'LEC']
            }];

            const results = {
                'Monaco': {
                    results: [
                        { driverId: 'VER', position: 1 },
                        { driverId: 'NOR', position: 2 },
                        { driverId: 'LEC', position: 3 }
                    ]
                }
            };

            const medal = calculateMonacoMedal(predictions, results);

            expect(medal).not.toBeNull();
            expect(medal.score).toBe('Top 3 Hit');
        });

        it('should return null if Top 3 is not exact', () => {
            const predictions = [{
                raceName: 'Monaco Grand Prix',
                predictions: ['VER', 'LEC', 'NOR'] // P2 and P3 swapped
            }];

            const results = {
                'Monaco': {
                    results: [
                        { driverId: 'VER', position: 1 },
                        { driverId: 'NOR', position: 2 },
                        { driverId: 'LEC', position: 3 }
                    ]
                }
            };

            const medal = calculateMonacoMedal(predictions, results);

            expect(medal).toBeNull();
        });
    });

    // ============================================
    // 8. CONSTRUCTOR MEDALS
    // ============================================
    describe('calculateConstructorMedals', () => {
        const mockDrivers = [
            { broadcast_name: 'Max VERSTAPPEN', team_name: 'Red Bull Racing' },
            { broadcast_name: 'Charles LECLERC', team_name: 'Ferrari' },
            { broadcast_name: 'Lando NORRIS', team_name: 'McLaren' }
        ];

        it('should return constructor medal for team with most earned points', () => {
            const predictions = [{
                raceName: 'Test GP',
                predictions: ['VER', 'VER', 'VER'] // All VER predictions
            }];

            const results = {
                'Test GP': {
                    results: [
                        { driverId: 'VER', position: 1 },
                        { driverId: 'LEC', position: 2 },
                        { driverId: 'NOR', position: 3 }
                    ]
                }
            };

            const medal = calculateConstructorMedals(predictions, results, mockDrivers);

            // VER got 10 points (P1 exact match), so Red Bull should win
            expect(medal).not.toBeNull();
            expect(medal.team).toBe('Red Bull Racing');
        });

        it('should return null if no drivers list provided', () => {
            const predictions = [{ raceName: 'Test GP', predictions: ['VER'] }];
            const results = { 'Test GP': { results: [{ driverId: 'VER', position: 1 }] } };

            const medal = calculateConstructorMedals(predictions, results, []);

            expect(medal).toBeNull();
        });
    });
});
