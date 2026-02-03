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
import { calculateScore, DEFAULT_SCORING_RULES } from "../utils/scoringUtils";

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
        const userBets = bet?.bet || [];
        const computedAchievements = {};

        // Use the user's first league's scoring rules (or default if no leagues)
        // This ensures achievements use the same rules as their main league
        const primaryLeague = leagues?.[0];
        const rawScoringSystem = primaryLeague?.scoringSystem;
        const scoringRules = convertLeagueScoringToCalculateScoreFormat(rawScoringSystem);

        // 1. Calculate best for each group
        let bestGroupAchievement = null;
        Object.keys(TRACK_GROUPS).forEach(key => {
            const best = calculateGroupBest(key, userBets, raceResults, scoringRules);
            if (best) {
                // If we don't have a best yet, or this one is higher score
                if (!bestGroupAchievement || best.score > bestGroupAchievement.score) {
                    bestGroupAchievement = { ...best, key }; // Add key for reference
                }
            }
        });

        // 2. Add ONLY the best group achievement
        if (bestGroupAchievement) {
            computedAchievements[bestGroupAchievement.key] = bestGroupAchievement;
        }

        const pitstopStreak = calculatePitstopStreak(userBets, raceResults);
        if (pitstopStreak) computedAchievements['PITSTOP_MASTER'] = pitstopStreak;

        const consistency = calculateConsistency(userBets, raceResults, scoringRules);
        if (consistency) computedAchievements['CONSISTENCY'] = consistency;

        const champion = calculateChampion(leagues, user?.uid);
        if (champion) computedAchievements['CHAMPION'] = champion;

        const poleKing = calculatePoleKing(userBets, raceResults);
        if (poleKing) computedAchievements['POLE_KING'] = poleKing;

        const monacoMedal = calculateMonacoMedal(userBets, raceResults);
        if (monacoMedal) computedAchievements['MONACO'] = monacoMedal;

        const constructorMedal = calculateConstructorMedals(userBets, raceResults, drivers, scoringRules);
        if (constructorMedal) computedAchievements['CONSTRUCTOR'] = constructorMedal;

        setAchievements(computedAchievements);
        setLoading(false);
    }, [bet, raceResults, leagues, user, drivers]);

    // DEBUG: Log achievement calculations for Australia GP
    useEffect(() => {
        const ausPred = bet?.bet?.find(b => b.raceName?.includes('Australia'));
        const ausResult = raceResults['Australian Grand Prix'] || raceResults['Australia'];
        if (ausPred && ausResult && leagues?.[0]) {
            const rules = convertLeagueScoringToCalculateScoreFormat(leagues[0].scoringSystem);
            const { totalScore, breakdown } = calculateScore(ausPred, ausResult, rules);
            console.log('[Achievement Debug] Australia Prediction:', ausPred);
            console.log('[Achievement Debug] Australia Result:', ausResult);
            console.log('[Achievement Debug] Australia Breakdown:', breakdown);
            console.log('[Achievement Debug] Australia Total:', totalScore);
            console.log('[Achievement Debug] Australia Rules:', rules);
        }
    }, [bet, raceResults, leagues]);

    // DEBUG: Log achievement calculations for Japanese GP
    useEffect(() => {
        const japanPred = bet?.bet?.find(b => b.raceName?.includes('Japan'));
        const japanResult = raceResults['Japanese Grand Prix'] || raceResults['Japan'];
        if (japanPred && japanResult && leagues?.[0]) {
            const scoringRules = convertLeagueScoringToCalculateScoreFormat(leagues[0].scoringSystem);
            const { totalScore, breakdown } = calculateScore(japanPred, japanResult, scoringRules);
            console.log('[Achievement Debug] Japan GP Prediction:', japanPred);
            console.log('[Achievement Debug] Japan GP Result:', japanResult);
            console.log('[Achievement Debug] Japan GP Breakdown:', breakdown);
            console.log('[Achievement Debug] Japan GP Total:', totalScore);
            console.log('[Achievement Debug] Scoring Rules (converted):', scoringRules);
        }
    }, [bet, raceResults, leagues]);


    return { achievements, raceResults, loading };
}
