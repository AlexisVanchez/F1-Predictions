export const CIRCUIT_DATA = {
    "Albert Park": {
        viewBox: "0 0 500 500",
        path: "M 250 450 L 150 450 C 100 450 50 400 50 350 L 50 250 C 50 200 100 150 150 150 L 350 150 C 400 150 450 200 450 250 L 450 350 C 450 400 400 450 350 450 Z",
        turns: [
            { number: 1, x: 150, y: 450 },
            { number: 2, x: 50, y: 400 },
            { number: 3, x: 50, y: 300 },
            { number: 4, x: 50, y: 200 },
            { number: 5, x: 100, y: 150 },
            { number: 6, x: 200, y: 150 },
            { number: 7, x: 300, y: 150 },
            { number: 8, x: 400, y: 150 },
            { number: 9, x: 450, y: 200 },
            { number: 10, x: 450, y: 300 },
            { number: 11, x: 450, y: 400 },
            { number: 12, x: 400, y: 450 },
            { number: 13, x: 300, y: 450 },
            { number: 14, x: 250, y: 450 }
        ],
        length: "5.278 km",
        laps: 58
    },
    "Bahrain": {
        viewBox: "0 0 100 100",
        path: "M20,80 L20,20 L80,20 L80,50 L50,50 L50,80 Z",
        turns: [
            { number: 1, x: 20, y: 80 },
            { number: 4, x: 80, y: 20 },
            { number: 10, x: 50, y: 50 }
        ],
        length: "5.412 km",
        laps: 57
    },
    "Monaco": {
        viewBox: "0 0 100 100",
        path: "M20,20 C50,0 80,20 80,50 C80,80 50,100 20,80 Z",
        turns: [
            { number: 1, x: 20, y: 20 },
            { number: 6, x: 80, y: 50 },
            { number: 18, x: 20, y: 80 }
        ],
        length: "3.337 km",
        laps: 78
    }
};

export const getCircuitData = (name) => {
    return CIRCUIT_DATA[name] || null;
};
