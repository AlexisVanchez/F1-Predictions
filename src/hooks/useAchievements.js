import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { firestore } from "../redux/firebase_config";
import { fetchDriverStandings } from "../redux/reducer";
import {
    TRACK_GROUPS,
    ACH_PITSTOP_MASTER,
    ACH_CONSISTENCY,
    ACH_CHAMPION,
    ACH_POLE_KING,
    ACH_MONACO,
    CONSTRUCTOR_MEDALS,
    calculateGroupBest,
    calculatePitstopStreak,
    calculateConsistency,
    calculateChampion,
    calculatePoleKing,
    calculateMonacoMedal,
    calculateConstructorMedals,
    normalizeTrackName
} from "../utils/achievementUtils";
import { calculateScore, DEFAULT_SCORING_RULES, BADGE_SCORING_RULES } from "../utils/scoringUtils";

/**
 * Converts league's scoringSystem format to the format expected by calculateScore
 * League format: { exact: [10,9,8...], presence: 1, ...}
 * calculateScore format: { exactMatch: {1:10, 2:9...}, top10Bonus: 1, ...}
 */
const convertLeagueScoringToCalculateScoreFormat = (leagueScoring) => {
    if (!leagueScoring) return DEFAULT_SCORING_RULES;

    // If it already has exactMatch, it's in the right format
    if (leagueScoring.exactMatch) return leagueScoring;

    // Convert array format to object format
    const converted = {
        ...DEFAULT_SCORING_RULES, // Start with defaults
        top10Bonus: leagueScoring.presence || 1
    };

    // Convert exact array [10, 9, 8...] to object {1: 10, 2: 9...}
    if (leagueScoring.exact && Array.isArray(leagueScoring.exact)) {
        converted.exactMatch = {};
        leagueScoring.exact.forEach((points, index) => {
            converted.exactMatch[index + 1] = points;
        });
    }

    // Handle radius error scoring mode
    if (leagueScoring.scoringMode === 'radius' || leagueScoring.radius) {
        converted.scoringMode = 'radius';
        converted.radiusConfig = leagueScoring.radius || leagueScoring;
    }

    // Copy over other properties - but NOT as booleans if they're objects
    // This prevents double-scoring (e.g., both safetyCar boolean AND safetyCar.enabled)
    if (leagueScoring.safetyCar && typeof leagueScoring.safetyCar === 'object') {
        converted.safetyCar = leagueScoring.safetyCar; // Keep as object
    } else if (leagueScoring.safetyCar) {
        converted.safetyCar = leagueScoring.safetyCar.enabled; // Boolean
    }

    if (leagueScoring.polePosition && typeof leagueScoring.polePosition === 'object') {
        converted.polePosition = leagueScoring.polePosition; // Keep as object  
    } else if (leagueScoring.polePosition) {
        converted.polePosition = leagueScoring.polePosition.enabled; // Boolean
    }

    if (leagueScoring.pitstopScoring && typeof leagueScoring.pitstopScoring === 'object') {
        converted.pitstopScoring = leagueScoring.pitstopScoring; // Keep as object
    } else if (leagueScoring.pitstopScoring) {
        converted.pitstopScoring = !!leagueScoring.pitstopScoring; // Boolean
    }

    if (leagueScoring.redFlag) {
        converted.redFlag = leagueScoring.redFlag;
    }

    return converted;
};

export default function useAchievements() {
    const dispatch = useDispatch();
    const { user, bet, leagues, drivers } = useSelector(state => state.user);
    const [achievements, setAchievements] = useState({});
    const [raceResults, setRaceResults] = useState({});
    const [loading, setLoading] = useState(true);

    // Fetch drivers if not available (needed for Constructor achievements)
    useEffect(() => {
        if (!drivers || drivers.length === 0) {
            console.log('[useAchievements] Drivers missing, fetching...');
            dispatch(fetchDriverStandings());
        }
    }, [dispatch, drivers]);

    useEffect(() => {
        const loadResults = async () => {
            const userBets = bet?.bet || [];
            if (userBets.length === 0) {
                setLoading(false);
                return;
            }

            const newResults = {};
            const uniqueRaces = [...new Set(userBets.map(b => b.raceName))];

            // Read directly from Firestore 'races' collection (where Simulator saves results)
            // This avoids hitting the OpenF1 API which causes 429 errors
            for (const raceName of uniqueRaces) {
                if (raceResults[raceName]) continue;

                try {
                    const raceDoc = await firestore.collection('races').doc(raceName).get();
                    if (raceDoc.exists) {
                        const data = raceDoc.data();
                        newResults[raceName] = {
                            result: data.result,
                            results: data.result, // Alias for compatibility
                            polePosition: data.polePosition,
                            medianPitstops: data.medianPitstops,
                            status: data.status
                        };
                    }
                } catch (error) {
                    console.error(`Error loading race result for ${raceName}:`, error);
                }
            }

            if (Object.keys(newResults).length > 0) {
                setRaceResults(prev => ({ ...prev, ...newResults }));
            }
            setLoading(false);
        };

        loadResults();

    }, [bet]);

    useEffect(() => {
        if (!bet || !raceResults) return;

        const userBets = bet?.bet || [];
        const computedAchievements = {};

        // Use BADGE_SCORING_RULES for badge calculations (position points only)
        // This excludes Safety Car, Pole Position, Pitstops, Red Flags, etc.
        const scoringRules = BADGE_SCORING_RULES;

        // 1. Calculate best for each group
        Object.keys(TRACK_GROUPS).forEach(key => {
            const best = calculateGroupBest(key, userBets, raceResults, scoringRules);
            if (best) {
                computedAchievements[key] = best;
            }
        });

        const pitstopStreak = calculatePitstopStreak(userBets, raceResults);
        if (pitstopStreak) computedAchievements['PITSTOP_MASTER'] = pitstopStreak;

        const consistency = calculateConsistency(userBets, raceResults, scoringRules);
        if (consistency) computedAchievements['CONSISTENCY'] = consistency;

        const championWins = calculateChampion(leagues, user.uid);
        if (championWins.length > 0) computedAchievements['CHAMPION'] = championWins;

        const poleKing = calculatePoleKing(userBets, raceResults);
        if (poleKing) computedAchievements['POLE_KING'] = poleKing;

        const monacoMedal = calculateMonacoMedal(userBets, raceResults);
        if (monacoMedal) computedAchievements['MONACO'] = monacoMedal;

        const constructorMedal = calculateConstructorMedals(userBets, raceResults, drivers, scoringRules);
        if (constructorMedal) computedAchievements['CONSTRUCTOR'] = constructorMedal;

        setAchievements(computedAchievements);
        setLoading(false);
    }, [bet, raceResults, leagues, user, drivers]);

    useEffect(() => {
        const japanPred = bet?.bet?.find(b => b.raceName?.includes('Japan'));
        const japanResult = raceResults['Japanese Grand Prix'] || raceResults['Japan'];
        if (japanPred && japanResult && leagues?.[0]) {
            const scoringRules = convertLeagueScoringToCalculateScoreFormat(leagues[0].scoringSystem);
            const { totalScore, breakdown } = calculateScore(japanPred, japanResult, scoringRules);
        }
    }, [bet, raceResults, leagues]);

    useEffect(() => {
        const chinaPred = bet?.bet?.find(b => b.raceName?.includes('China') || b.raceName?.includes('Shanghai'));
        const chinaResult = raceResults['Chinese Grand Prix'] || raceResults['China'];

        if (chinaPred && chinaResult && leagues?.[0]) {
            const scoringRules = convertLeagueScoringToCalculateScoreFormat(leagues[0].scoringSystem);
            const { totalScore, breakdown } = calculateScore(chinaPred, chinaResult, scoringRules);
        }
    }, [bet, raceResults, leagues]);


    return { achievements, raceResults, loading };
}
