import { getTeamColor, TEAM_COLORS } from '../TeamColors';

describe('TeamColors', () => {
    // ============================================
    // 1. GET TEAM COLOR
    // ============================================
    describe('getTeamColor', () => {
        it('should return correct color for exact team name', () => {
            expect(getTeamColor('Red Bull')).toBe('#0600EF');
            expect(getTeamColor('Ferrari')).toBe('#FF0000');
            expect(getTeamColor('McLaren')).toBe('#FF8000');
            expect(getTeamColor('Mercedes')).toBe('#00A19B');
        });

        it('should return correct color for partial team name (fuzzy match)', () => {
            expect(getTeamColor('Red Bull Racing')).toBe('#0600EF');
            expect(getTeamColor('Scuderia Ferrari')).toBe('#FF0000');
            expect(getTeamColor('McLaren F1 Team')).toBe('#FF8000');
        });

        it('should be case-insensitive', () => {
            expect(getTeamColor('red bull')).toBe('#0600EF');
            expect(getTeamColor('FERRARI')).toBe('#FF0000');
            expect(getTeamColor('mclaren')).toBe('#FF8000');
        });

        it('should return default color for unknown team', () => {
            expect(getTeamColor('Unknown Team')).toBe(TEAM_COLORS.default);
            expect(getTeamColor('Random Name')).toBe('#333333');
        });

        it('should return default color for null/undefined', () => {
            expect(getTeamColor(null)).toBe(TEAM_COLORS.default);
            expect(getTeamColor(undefined)).toBe(TEAM_COLORS.default);
        });

        it('should return correct colors for all defined teams', () => {
            expect(getTeamColor('Aston Martin')).toBe('#006F62');
            expect(getTeamColor('RB')).toBe('#6692FF');
            expect(getTeamColor('Haas F1 Team')).toBe('#B6BABD');
            expect(getTeamColor('Williams')).toBe('#64C4FF');
            expect(getTeamColor('Alpine')).toBe('#0090FF');
            expect(getTeamColor('Kick Sauber')).toBe('#52E252');
        });
    });

    // ============================================
    // 2. TEAM_COLORS CONSTANT
    // ============================================
    describe('TEAM_COLORS constant', () => {
        it('should contain all 10 current F1 teams', () => {
            const expectedTeams = [
                'Red Bull', 'McLaren', 'Ferrari', 'Mercedes',
                'Aston Martin', 'RB', 'Haas F1 Team', 'Williams',
                'Alpine', 'Kick Sauber'
            ];

            expectedTeams.forEach(team => {
                expect(TEAM_COLORS).toHaveProperty(team);
            });
        });

        it('should have valid hex color format for all teams', () => {
            const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

            Object.values(TEAM_COLORS).forEach(color => {
                expect(color).toMatch(hexColorRegex);
            });
        });

        it('should have a default color', () => {
            expect(TEAM_COLORS.default).toBeDefined();
            expect(TEAM_COLORS.default).toBe('#333333');
        });
    });
});
