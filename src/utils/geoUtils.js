
/**
 * Converts an array of coordinates [lon, lat] to a standardized SVG path string.
 * It strictly projects the coordinates to fit within a 0 0 100 100 viewbox (or similar aspect ratio).
 */
export function geoJsonToSvgPath(geoJson) {
    if (!geoJson) return "";

    let features = [];
    if (geoJson.type === 'FeatureCollection') {
        features = geoJson.features;
    } else if (geoJson.type === 'Feature') {
        features = [geoJson];
    } else if (geoJson.type === 'LineString' || geoJson.type === 'MultiLineString') {
        // Wrap geometry in feature
        features = [{ geometry: geoJson }];
    } else {
        console.warn("geoJsonToSvgPath: Unknown type", geoJson.type);
        return '';
    }

    // Extract all points from LineString or MultiLineString features
    let allPoints = [];

    features.forEach(feature => {
        const geom = feature.geometry;
        if (!geom) return;

        if (geom.type === "LineString") {
            allPoints.push(...geom.coordinates);
        } else if (geom.type === "MultiLineString") {
            geom.coordinates.forEach(line => allPoints.push(...line));
        } else if (geom.type === "Polygon") {
            // Usually first ring is outer
            geom.coordinates.forEach(ring => allPoints.push(...ring));
        }
    });

    if (allPoints.length === 0) return "";

    // Find bounds
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    allPoints.forEach(([x, y]) => {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    });

    const width = maxX - minX;
    const height = maxY - minY;

    // Prevent division by zero
    if (width === 0 || height === 0) {
        return "";
    }

    // Projection function
    const project = ([x, y]) => {
        const scale = 100 / Math.max(width, height);
        const finalX = (x - minX) * scale;
        const finalY = 100 - (y - minY) * scale; // Flip Y
        return [finalX, finalY];
    };

    // Build Path
    let path = "";

    features.forEach(feature => {
        const geom = feature.geometry;
        if (!geom) return;

        if (geom.type === "LineString") {
            const points = geom.coordinates.map(project);
            if (points.length > 0) {
                path += `M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)} `;
                for (let i = 1; i < points.length; i++) {
                    path += `L ${points[i][0].toFixed(2)} ${points[i][1].toFixed(2)} `;
                }
            }
        }
        else if (geom.type === "MultiLineString") {
            geom.coordinates.forEach(line => {
                const points = line.map(project);
                if (points.length > 0) {
                    path += `M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)} `;
                    for (let i = 1; i < points.length; i++) {
                        path += `L ${points[i][0].toFixed(2)} ${points[i][1].toFixed(2)} `;
                    }
                }
            });
        }
    });

    return path;
}
