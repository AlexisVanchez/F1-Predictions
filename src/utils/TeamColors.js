export const TEAM_COLORS = {
    "Red Bull": "#0600EF",
    "McLaren": "#FF8000",
    "Ferrari": "#FF0000",
    "Mercedes": "#00A19B",
    "Aston Martin": "#006F62",
    "RB": "#6692FF",
    "Haas F1 Team": "#B6BABD",
    "Williams": "#64C4FF",
    "Alpine": "#0090FF",
    "Kick Sauber": "#52E252",
    // Fallback
    "default": "#333333"
};

export const getTeamColor = (teamName) => {
    // Basic fuzzy match
    if (!teamName) return TEAM_COLORS.default;
    const name = Object.keys(TEAM_COLORS).find(k => teamName.toLowerCase().includes(k.toLowerCase()));
    return name ? TEAM_COLORS[name] : TEAM_COLORS.default;
};
