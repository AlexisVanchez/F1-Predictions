import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAndSyncRaceResult } from "../redux/reducer";
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

export default function useAchievements() {
    const dispatch = useDispatch();
    const { user, bet, leagues, drivers } = useSelector(state => state.user);
    const [achievements, setAchievements] = useState({});
    const [raceResults, setRaceResults] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadResults = async () => {
            const userBets = bet?.bet || [];
            if (userBets.length === 0) {
                setLoading(false);
                return;
            }

            const newResults = {};
            const uniqueRaces = [...new Set(userBets.map(b => b.raceName))];

            for (const raceName of uniqueRaces) {
                if (raceResults[raceName]) continue;
                const response = await dispatch(fetchAndSyncRaceResult(raceName));
                if (response.success && response.result) {
                    newResults[raceName] = { results: response.result, ...response };
                }
            }

            if (Object.keys(newResults).length > 0) {
                setRaceResults(prev => ({ ...prev, ...newResults }));
            }
        };

        loadResults();
    }, [bet, dispatch]);

    useEffect(() => {
        const userBets = bet?.bet || [];
        const computedAchievements = {};

        Object.keys(TRACK_GROUPS).forEach(key => {
            const best = calculateGroupBest(key, userBets, raceResults);
            if (best) computedAchievements[key] = best;
        });

        const pitstopStreak = calculatePitstopStreak(userBets, raceResults);
        if (pitstopStreak) computedAchievements['PITSTOP_MASTER'] = pitstopStreak;

        const consistency = calculateConsistency(userBets, raceResults);
        if (consistency) computedAchievements['CONSISTENCY'] = consistency;

        const champion = calculateChampion(leagues, user?.uid);
        if (champion) computedAchievements['CHAMPION'] = champion;

        const poleKing = calculatePoleKing(userBets, raceResults);
        if (poleKing) computedAchievements['POLE_KING'] = poleKing;

        const monacoMedal = calculateMonacoMedal(userBets, raceResults);
        if (monacoMedal) computedAchievements['MONACO'] = monacoMedal;

        const constructorMedal = calculateConstructorMedals(userBets, raceResults, drivers);
        if (constructorMedal) computedAchievements['CONSTRUCTOR'] = constructorMedal;

        setAchievements(computedAchievements);
        setLoading(false);
    }, [bet, raceResults, leagues, user, drivers]);

    return { achievements, raceResults, loading };
}
