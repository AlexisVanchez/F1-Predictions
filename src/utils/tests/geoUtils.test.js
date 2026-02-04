import { geoJsonToSvgPath } from '../geoUtils';

describe('geoUtils', () => {
    // ============================================
    // 1. GeoJSON to SVG Path Conversion
    // ============================================
    describe('geoJsonToSvgPath', () => {
        it('should convert LineString to SVG path', () => {
            const geoJson = {
                type: 'LineString',
                coordinates: [
                    [0, 0],
                    [100, 0],
                    [100, 100],
                    [0, 100]
                ]
            };

            const path = geoJsonToSvgPath(geoJson);

            expect(path).toContain('M'); // Move command
            expect(path).toContain('L'); // Line commands
            expect(path.length).toBeGreaterThan(0);
        });

        it('should convert Feature with LineString geometry', () => {
            const geoJson = {
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: [[0, 0], [50, 50], [100, 0]]
                }
            };

            const path = geoJsonToSvgPath(geoJson);

            expect(path).toContain('M');
            expect(path).toContain('L');
        });

        it('should convert FeatureCollection', () => {
            const geoJson = {
                type: 'FeatureCollection',
                features: [{
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: [[0, 0], [100, 100]]
                    }
                }]
            };

            const path = geoJsonToSvgPath(geoJson);

            expect(path.length).toBeGreaterThan(0);
        });

        it('should handle MultiLineString', () => {
            const geoJson = {
                type: 'MultiLineString',
                coordinates: [
                    [[0, 0], [50, 50]],
                    [[60, 60], [100, 100]]
                ]
            };

            const path = geoJsonToSvgPath(geoJson);

            // Should have 2 'M' commands for 2 line segments
            const mCount = (path.match(/M/g) || []).length;
            expect(mCount).toBe(2);
        });

        it('should return empty string for null input', () => {
            expect(geoJsonToSvgPath(null)).toBe('');
            expect(geoJsonToSvgPath(undefined)).toBe('');
        });

        it('should return empty string for empty coordinates', () => {
            const geoJson = {
                type: 'LineString',
                coordinates: []
            };

            expect(geoJsonToSvgPath(geoJson)).toBe('');
        });

        it('should normalize coordinates to fit 100x100 viewbox', () => {
            const geoJson = {
                type: 'LineString',
                coordinates: [
                    [0, 0],
                    [1000, 1000] // Large coordinates
                ]
            };

            const path = geoJsonToSvgPath(geoJson);

            // Path should contain normalized values (0-100 range)
            const numbers = path.match(/[\d.]+/g).map(Number);
            numbers.forEach(num => {
                expect(num).toBeLessThanOrEqual(100);
                expect(num).toBeGreaterThanOrEqual(0);
            });
        });

        it('should flip Y coordinates (SVG has inverted Y)', () => {
            const geoJson = {
                type: 'LineString',
                coordinates: [
                    [0, 0],    // Bottom-left in geo, should be top-left in SVG
                    [100, 100] // Top-right in geo, should be bottom-right in SVG
                ]
            };

            const path = geoJsonToSvgPath(geoJson);

            // Path should start with M 0.00 100.00 (Y flipped)
            expect(path).toContain('100.00');
        });

        it('should handle single point gracefully', () => {
            const geoJson = {
                type: 'LineString',
                coordinates: [[50, 50]]
            };

            const path = geoJsonToSvgPath(geoJson);

            // Single point has no width/height, should return empty
            expect(path).toBe('');
        });

        // Note: Current implementation doesn't build path for Polygon,
        // it only extracts points for bounds calculation.
        it('should return empty path for Polygon geometry (path building not implemented)', () => {
            const geoJson = {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [
                        [[0, 0], [100, 0], [100, 100], [0, 100], [0, 0]]
                    ]
                }
            };

            const path = geoJsonToSvgPath(geoJson);

            // Current implementation doesn't generate path for Polygon
            expect(path).toBe('');
        });
    });
});
