import { calculateLeagueFunStats, formatDriverName } from '../leagueStatsUtils';
import { DEFAULT_SCORING_RULES } from '../scoringUtils';

describe('leagueStatsUtils', () => {
    // ============================================
    // 1. CALCULATE LEAGUE FUN STATS
    // ============================================
    describe('calculateLeagueFunStats', () => {
        const mockMembers = [
            { uid: 'user1', displayName: 'Alice' },
            { uid: 'user2', displayName: 'Bob' }
        ];

        const mockPredictions = [
            { uid: 'user1', raceName: 'Test GP', predictions: ['VER', 'NOR', 'LEC'] },
            { uid: 'user1', raceName: 'Test GP 2', predictions: ['VER', 'HAM', 'SAI'] },
            { uid: 'user2', raceName: 'Test GP', predictions: ['NOR', 'VER', 'HAM'] }
        ];

        const mockResults = {
            'Test GP': {
                results: [
                    { driverId: 'VER', position: 1 },
                    { driverId: 'NOR', position: 2 },
                    { driverId: 'LEC', position: 3 }
                ]
            },
            'Test GP 2': {
                results: [
                    { driverId: 'VER', position: 1 },
                    { driverId: 'HAM', position: 2 },
                    { driverId: 'SAI', position: 3 }
                ]
            }
        };

        it('should return stats structure with global and perUser keys', () => {
            const stats = calculateLeagueFunStats(mockMembers, mockPredictions, mockResults);

            expect(stats).toHaveProperty('global');
            expect(stats).toHaveProperty('perUser');
            expect(stats.global).toHaveProperty('iLikeHim');
            expect(stats.global).toHaveProperty('weirdo');
        });

        it('should calculate favourite driver per user', () => {
            const stats = calculateLeagueFunStats(mockMembers, mockPredictions, mockResults);

            // user1 predicted VER 2 times, should be favourite
            expect(stats.perUser['user1']).toBeDefined();
            expect(stats.perUser['user1'].favouriteDriver).toBe('VER');
        });

        it('should calculate money maker (driver with most points earned)', () => {
            const stats = calculateLeagueFunStats(mockMembers, mockPredictions, mockResults);

            // user1's VER predictions got exact P1 match twice = 20 pts
            expect(stats.perUser['user1'].moneyMaker).toBe('VER');
            expect(stats.perUser['user1'].moneyMakerPoints).toBeGreaterThan(0);
        });

        it('should identify most picked driver globally (iLikeHim)', () => {
            const stats = calculateLeagueFunStats(mockMembers, mockPredictions, mockResults);

            // VER was picked 3 times across all users
            expect(stats.global.iLikeHim).not.toBeNull();
            expect(stats.global.iLikeHim.id).toBe('VER');
        });

        it('should identify least picked driver (weirdo)', () => {
            const stats = calculateLeagueFunStats(mockMembers, mockPredictions, mockResults);

            // Some driver was picked only once
            expect(stats.global.weirdo).not.toBeNull();
            expect(stats.global.weirdo.picks).toBe(1);
        });

        it('should return empty stats structure for null inputs', () => {
            const stats = calculateLeagueFunStats(null, null, {});

            expect(stats.global.iLikeHim).toBeNull();
            expect(stats.global.weirdo).toBeNull();
            expect(Object.keys(stats.perUser)).toHaveLength(0);
        });

        it('should handle empty members list', () => {
            const stats = calculateLeagueFunStats([], mockPredictions, mockResults);

            expect(Object.keys(stats.perUser)).toHaveLength(0);
        });
    });

    // ============================================
    // 2. FORMAT DRIVER NAME
    // ============================================
    describe('formatDriverName', () => {
        const mockDrivers = [
            { driver_number: 1, broadcast_name: 'Max VERSTAPPEN', name_acronym: 'VER' },
            { driver_number: 44, broadcast_name: 'Lewis HAMILTON', name_acronym: 'HAM' },
            { driver_number: 4, broadcast_name: 'Lando NORRIS', name_acronym: 'NOR' }
        ];

        it('should return full name for valid driver code', () => {
            expect(formatDriverName('VER', mockDrivers)).toBe('Max VERSTAPPEN');
        });

        it('should return full name for driver number as string', () => {
            expect(formatDriverName('1', mockDrivers)).toBe('Max VERSTAPPEN');
            expect(formatDriverName('44', mockDrivers)).toBe('Lewis HAMILTON');
        });

        it('should return code if driver not found', () => {
            expect(formatDriverName('XXX', mockDrivers)).toBe('XXX');
        });

        it('should return "Unknown" for null/undefined code', () => {
            expect(formatDriverName(null, mockDrivers)).toBe('Unknown');
            expect(formatDriverName(undefined, mockDrivers)).toBe('Unknown');
        });

        it('should return code if drivers list is empty', () => {
            expect(formatDriverName('VER', [])).toBe('VER');
        });
    });
    // ============================================
    // 3. ERROR HANDLING & EDGE CASES
    // ============================================
    describe('Error Handling', () => {
        it('should handle malformed race results gracefully', () => {
            const malformedResults = {
                'Test GP': { nothing: [] }, // Missing results array
                'Test GP 2': null // Null result
            };

            const stats = calculateLeagueFunStats(
                [{ uid: 'u1', displayName: 'User' }],
                [{ uid: 'u1', raceName: 'Test GP', predictions: ['VER'] }],
                malformedResults
            );

            expect(stats).toBeDefined();
            expect(stats.global).toBeDefined();
        });

        it('should handle predictions with missing fields', () => {
            const brokenPredictions = [
                { uid: 'u1' }, // Missing raceName and predictions
                { uid: 'u1', raceName: 'GP' } // Missing predictions
            ];

            const stats = calculateLeagueFunStats(
                [{ uid: 'u1', displayName: 'User' }],
                brokenPredictions,
                {}
            );

            expect(stats.perUser['u1']).toBeDefined();
        });

        it('formatDriverName should handle incomplete driver objects', () => {
            const badDrivers = [
                {}, // Empty object
                { broadcast_name: 'Just Name' }, // Missing numbers/code
                { driver_number: 99 } // Missing name
            ];

            expect(formatDriverName('UNK', badDrivers)).toBe('UNK');
            expect(formatDriverName('99', badDrivers)).toBe('99'); // Fallback to code if name missing
        });
    });
});
