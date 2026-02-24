import { createSlice } from "@reduxjs/toolkit";
// eslint-disable-next-line no-unused-vars
import { calculateScore, DEFAULT_SCORING_RULES } from "../utils/scoringUtils";
import { supabase } from "../config/supabase";
import { F1_2026_SCHEDULE } from "../Components/Main/Home/Calendar/f1_2026_static";


const initialState = {
    user: null,
    authLoading: true, // true while we resolve the initial session
    bet: {},
    drivers: [],
    leagues: [],
    schedule: [],
    scheduleStatus: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    scheduleError: null,
    theme: localStorage.getItem('theme') || 'dark' // 'dark' | 'light'
}

const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        setDriver: (state, action) => {
            state.drivers = action.payload;
        },
        setUser: (state, action) => {
            state.user = action.payload;
            state.authLoading = false;
        },
        setAuthLoading: (state, action) => {
            state.authLoading = action.payload;
        },
        clearUser: (state) => {
            state.user = null;
            state.authLoading = false;
            state.bet = {};
            state.leagues = [];
        },
        setBet: (state, action) => {
            state.bet = action.payload
        },
        setSchedule: (state, action) => {
            state.schedule = action.payload;
            state.scheduleStatus = 'succeeded';
            state.scheduleError = null;
        },
        setScheduleLoading: (state) => {
            state.scheduleStatus = 'loading';
            state.scheduleError = null;
        },
        setScheduleError: (state, action) => {
            state.scheduleStatus = 'failed';
            state.scheduleError = action.payload;
        },
        setLeagues: (state, action) => {
            state.leagues = action.payload
        },
        setTheme: (state, action) => {
            state.theme = action.payload;
            localStorage.setItem('theme', action.payload);
        }
    }
})

export const { setUser, setAuthLoading, clearUser, setBet, setDriver, setSchedule, setLeagues, setScheduleLoading, setScheduleError, setTheme } = userSlice.actions;

// --- AUTHENTICATION ACTIONS ---

// Google Sign-In Action
export const signInWithGoogle = () => async (dispatch) => {
    try {
        // eslint-disable-next-line no-unused-vars
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });

        if (error) throw error;

        console.log("Google Sign-In initiated");
        return { success: true };
    } catch (error) {
        console.error("Error during Google Sign-In:", error.message);
        throw error;
    }
};

// Telegram Sign-In Action
// `tgUser` is the raw user object from the Telegram Login Widget callback
export const signInWithTelegram = (tgUser) => async (dispatch) => {
    try {
        const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
        const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

        const res = await fetch(
            `${supabaseUrl}/functions/v1/telegram-auth`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseAnonKey,
                    'Authorization': `Bearer ${supabaseAnonKey}`,
                },
                // Send the raw tgUser object — Edge Function verifies and extracts fields directly
                body: JSON.stringify(tgUser),
            }
        );

        const json = await res.json();

        if (!res.ok) {
            throw new Error(json.error || 'Telegram auth failed');
        }

        // Inject the session into the Supabase client — onAuthStateChange in App.js
        // will pick this up and call fetchUserProfile automatically.
        const { error: sessionError } = await supabase.auth.setSession({
            access_token: json.access_token,
            refresh_token: json.refresh_token,
        });

        if (sessionError) throw sessionError;

        console.log('Telegram Sign-In successful');
        return { success: true };
    } catch (error) {
        console.error('Error during Telegram Sign-In:', error.message);
        throw error;
    }
};

// Sign Out Action
export const signOut = () => async (dispatch) => {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;

        dispatch(clearUser());
        console.log("User signed out successfully");
    } catch (error) {
        console.error("Error during sign out:", error.message);
        throw error;
    }
};

// Fetch Full User Profile from Supabase, creating a row for new OAuth users if needed
export const fetchUserProfile = (uid, authUser = null) => async (dispatch) => {
    try {
        // First try to fetch the existing profile
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', uid)
            .single();

        if (data) {
            dispatch(setUser({
                uid: data.id,
                email: data.email,
                displayName: data.display_name,
                photoURL: data.photo_url,
                ...data
            }));
            return { success: true, data };
        }

        // Profile doesn't exist yet (new OAuth user, no DB trigger) – create it
        if (error && error.code === 'PGRST116') {
            const meta = authUser?.user_metadata || {};
            const { data: newData, error: upsertError } = await supabase
                .from('users')
                .upsert({
                    id: uid,
                    email: authUser?.email || '',
                    display_name: meta.full_name || meta.display_name || meta.name || 'F1 Fan',
                    photo_url: meta.avatar_url || meta.picture || '',
                    global_points: 0,
                    global_rank: 0
                }, { onConflict: 'id' })
                .select()
                .single();

            if (upsertError) throw upsertError;

            dispatch(setUser({
                uid: newData.id,
                email: newData.email,
                displayName: newData.display_name,
                photoURL: newData.photo_url,
                ...newData
            }));
            return { success: true, data: newData };
        }

        if (error) throw error;
        return { success: false, error: 'User not found' };
    } catch (error) {
        console.error('Error fetching user profile:', error);
        // Don't leave auth in limbo – clear loading so the route guard can react
        dispatch(setAuthLoading(false));
        return { success: false, error: error.message };
    }
};

// Create User Profile in Supabase (called automatically by trigger, but can be used for updates)
export const createUserProfile = (user, additionalData = {}) => async (dispatch) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .upsert({
                id: user.id,
                email: user.email,
                display_name: user.user_metadata?.full_name || user.user_metadata?.display_name || "F1 Fan",
                photo_url: user.user_metadata?.avatar_url || "",
                favorite_team: additionalData.favoriteTeam || null,
                global_points: 0,
                global_rank: 0
            }, { onConflict: 'id' })
            .select()
            .single();

        if (error) throw error;

        console.log("User profile created/updated successfully");
        return data;
    } catch (error) {
        console.error("Error creating user profile:", error.message);
        throw error;
    }
};

// Check if user exists in Supabase
export const checkUserExists = (uid) => async () => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id')
            .eq('id', uid)
            .single();

        return !error && data !== null;
    } catch (error) {
        console.error("Error checking user existence:", error.message);
        return false;
    }
};

// Update User Status (Heartbeat)
export const updateUserStatus = (uid) => async () => {
    try {
        const { error } = await supabase
            .from('users')
            .update({ last_seen: new Date().toISOString() })
            .eq('id', uid);

        if (error) throw error;
    } catch (error) {
        // Suppress log to avoid noise
    }
};

// --- LEAGUE ACTIONS ---

// Fetch all leagues the user is a member of
export const fetchUserLeagues = (uid) => async (dispatch) => {
    try {
        // Query leagues through the junction table
        const { data: leagueData, error } = await supabase
            .from('league_members')
            .select(`
        league_id,
        leagues (
          id,
          name,
          admin_uid,
          invite_code,
          scoring_system,
          standings,
          created_at,
          last_update
        )
      `)
            .eq('user_id', uid);

        if (error) throw error;

        // Fetch member details for each league
        const userLeagues = await Promise.all(
            leagueData.map(async (item) => {
                const league = item.leagues;

                // Get all members for this league
                const { data: members, error: membersError } = await supabase
                    .from('league_members')
                    .select(`
            user_id,
            joined_at,
            users (
              id,
              display_name,
              photo_url,
              last_seen
            )
          `)
                    .eq('league_id', league.id);

                if (membersError) {
                    console.error("Error fetching league members:", membersError);
                    return {
                        id: league.id,
                        ...league,
                        members: []
                    };
                }

                const membersWithStatus = members.map(m => ({
                    uid: m.users.id,
                    displayName: m.users.display_name,
                    photoURL: m.users.photo_url,
                    lastSeen: m.users.last_seen ? new Date(m.users.last_seen).getTime() : 0,
                    joinedAt: m.joined_at
                }));

                return {
                    id: league.id,
                    name: league.name,
                    adminUid: league.admin_uid,
                    inviteCode: league.invite_code,
                    scoringSystem: league.scoring_system,
                    standings: league.standings,
                    createdAt: league.created_at,
                    lastUpdate: league.last_update,
                    members: membersWithStatus,
                    memberIds: membersWithStatus.map(m => m.uid)
                };
            })
        );

        dispatch(setLeagues(userLeagues));
    } catch (error) {
        console.error("Error fetching user leagues:", error);
    }
};

// Create a new league
export const createLeague = (leagueName, user, scoringSystem = null) => async (dispatch) => {
    try {
        // Generate a random 6-character invite code
        const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        // Default Scoring System if not provided
        const defaultScoring = {
            exact: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
            presence: 1
        };

        // Check for duplicate name
        // eslint-disable-next-line no-unused-vars
        const { data: existing, error: checkError } = await supabase
            .from('leagues')
            .select('id')
            .eq('name', leagueName)
            .single();

        if (existing) {
            return { success: false, error: "League name already exists. Please choose another." };
        }

        // Create the league
        const { data: newLeague, error: createError } = await supabase
            .from('leagues')
            .insert({
                name: leagueName,
                admin_uid: user.uid,
                invite_code: inviteCode,
                scoring_system: scoringSystem || defaultScoring,
                standings: {}
            })
            .select()
            .single();

        if (createError) throw createError;

        // Add creator as first member
        const { error: memberError } = await supabase
            .from('league_members')
            .insert({
                league_id: newLeague.id,
                user_id: user.uid
            });

        if (memberError) throw memberError;

        console.log("League created with ID:", newLeague.id);

        // Refresh leagues
        dispatch(fetchUserLeagues(user.uid));
        return { success: true, inviteCode };

    } catch (error) {
        console.error("Error creating league:", error);
        return { success: false, error: error.message };
    }
};

// Join a league via code
export const joinLeague = (inviteCode, user) => async (dispatch) => {
    try {
        // Find league by invite code
        const { data: league, error: findError } = await supabase
            .from('leagues')
            .select('id, name')
            .eq('invite_code', inviteCode)
            .single();

        if (findError || !league) {
            return { success: false, error: "Invalid invite code" };
        }

        // Check if already a member
        // eslint-disable-next-line no-unused-vars
        const { data: existing, error: checkError } = await supabase
            .from('league_members')
            .select('user_id')
            .eq('league_id', league.id)
            .eq('user_id', user.uid)
            .single();

        if (existing) {
            return { success: false, error: "You are already a member." };
        }

        // Add user to league
        const { error: joinError } = await supabase
            .from('league_members')
            .insert({
                league_id: league.id,
                user_id: user.uid
            });

        if (joinError) throw joinError;

        dispatch(fetchUserLeagues(user.uid));
        return { success: true, leagueName: league.name };

    } catch (error) {
        console.error("Error joining league:", error);
        return { success: false, error: error.message };
    }
};

// Delete a league (admin only)
export const deleteLeague = (leagueId, adminUid) => async (dispatch) => {
    try {
        // Verify that the user is the admin
        const { data: league, error: fetchError } = await supabase
            .from('leagues')
            .select('admin_uid')
            .eq('id', leagueId)
            .single();

        if (fetchError || !league) {
            return { success: false, error: "League not found" };
        }

        if (league.admin_uid !== adminUid) {
            return { success: false, error: "Only the league admin can delete this league" };
        }

        // Delete the league (cascade will handle members)
        const { error: deleteError } = await supabase
            .from('leagues')
            .delete()
            .eq('id', leagueId);

        if (deleteError) throw deleteError;

        console.log("League deleted successfully:", leagueId);

        // Refresh the user's leagues
        dispatch(fetchUserLeagues(adminUid));
        return { success: true };

    } catch (error) {
        console.error("Error deleting league:", error);
        return { success: false, error: error.message };
    }
};

// Search for leagues by Name or Code
export const searchLeagues = (query) => async (dispatch) => {
    try {
        let results = [];

        // Try exact match on invite code
        const { data: codeResults, error: codeError } = await supabase
            .from('leagues')
            .select('*')
            .eq('invite_code', query.toUpperCase());

        if (!codeError && codeResults) {
            results = codeResults;
        }

        // Try prefix match on name
        const { data: nameResults, error: nameError } = await supabase
            .from('leagues')
            .select('*')
            .ilike('name', `${query}%`)
            .limit(5);

        if (!nameError && nameResults) {
            // Avoid duplicates
            nameResults.forEach(league => {
                if (!results.find(r => r.id === league.id)) {
                    results.push(league);
                }
            });
        }

        return { success: true, results };
    } catch (error) {
        console.error("Error searching leagues:", error);
        return { success: false, error: error.message };
    }
};

// --- PREDICTION ACTIONS ---

// Save a prediction
export const savePrediction = (userID, newPrediction) => async (dispatch) => {
    try {
        // eslint-disable-next-line no-unused-vars
        const { data, error } = await supabase
            .from('predictions')
            .upsert({
                user_id: userID,
                race_name: newPrediction.raceName,
                predictions: newPrediction.predictions,
                pitstops: newPrediction.pitstops,
                red_flags: newPrediction.redFlags,
                safety_car_count: newPrediction.safetyCarCount,
                date: newPrediction.date,
                season: new Date().getFullYear().toString()
            }, { onConflict: 'user_id,race_name' })
            .select();

        if (error) throw error;

        console.log("Prediction saved successfully");

        // Refresh local state
        dispatch(fetchBets(userID));
        return { success: true };

    } catch (error) {
        console.error("Error saving prediction:", error.message);
        return { success: false, error: error.message };
    }
};

// Delete a prediction
export const deletePrediction = (userID, raceName) => async (dispatch) => {
    try {
        const { error } = await supabase
            .from('predictions')
            .delete()
            .eq('user_id', userID)
            .eq('race_name', raceName);

        if (error) throw error;

        console.log("Prediction deleted successfully");
        dispatch(fetchBets(userID));
    } catch (error) {
        console.error("Error deleting prediction:", error.message);
    }
};

// Fetch user's predictions
export const fetchBets = (userID) => async (dispatch) => {
    try {
        const { data, error } = await supabase
            .from('predictions')
            .select('*')
            .eq('user_id', userID);

        if (error) throw error;

        if (data && data.length > 0) {
            // Transform to match expected structure
            const bets = data.map(pred => ({
                raceName: pred.race_name,
                predictions: pred.predictions,
                pitstops: pred.pitstops,
                redFlags: pred.red_flags,
                safetyCarCount: pred.safety_car_count,
                date: pred.date,
                season: pred.season,
                leagueScores: pred.league_scores,
                globalScored: pred.global_scored,
                standardScore: pred.standard_score
            }));

            dispatch(setBet({ bet: bets }));
        } else {
            console.log('No bets found', userID);
            dispatch(setBet({ bet: [] }));
        }
    } catch (error) {
        console.error("Error fetching bets:", error.message);
    }
};

// --- DRIVER STANDINGS ---

// Hardcoded fallback grid for 2026
const FALLBACK_DRIVERS = [
    { driver_number: 1, broadcast_name: "Max VERSTAPPEN", team_name: "Red Bull Racing" },
    { driver_number: 11, broadcast_name: "Sergio PEREZ", team_name: "Red Bull Racing" },
    { driver_number: 63, broadcast_name: "George RUSSELL", team_name: "Mercedes" },
    { driver_number: 7, broadcast_name: "Andrea Kimi ANTONELLI", team_name: "Mercedes" },
    { driver_number: 16, broadcast_name: "Charles LECLERC", team_name: "Ferrari" },
    { driver_number: 44, broadcast_name: "Lewis HAMILTON", team_name: "Ferrari" },
    { driver_number: 4, broadcast_name: "Lando NORRIS", team_name: "McLaren" },
    { driver_number: 81, broadcast_name: "Oscar PIASTRI", team_name: "McLaren" },
    { driver_number: 14, broadcast_name: "Fernando ALONSO", team_name: "Aston Martin" },
    { driver_number: 18, broadcast_name: "Lance STROLL", team_name: "Aston Martin" },
    { driver_number: 10, broadcast_name: "Pierre GASLY", team_name: "Alpine" },
    { driver_number: 40, broadcast_name: "Jack DOOHAN", team_name: "Alpine" },
    { driver_number: 23, broadcast_name: "Alexander ALBON", team_name: "Williams" },
    { driver_number: 55, broadcast_name: "Carlos SAINZ", team_name: "Williams" },
    { driver_number: 22, broadcast_name: "Yuki TSUNODA", team_name: "RB" },
    { driver_number: 30, broadcast_name: "Liam LAWSON", team_name: "RB" },
    { driver_number: 31, broadcast_name: "Esteban OCON", team_name: "Haas" },
    { driver_number: 33, broadcast_name: "Oliver BEARMAN", team_name: "Haas" },
    { driver_number: 27, broadcast_name: "Nico HULKENBERG", team_name: "Audi" },
    { driver_number: 5, broadcast_name: "Gabriel BORTOLETO", team_name: "Audi" }
];

export const fetchDriverStandings = () => async (dispatch) => {
    try {
        const currentYear = new Date().getFullYear();
        let sessions = [];

        // Try Current Year (2026) Races
        try {
            const res = await fetch(`https://api.openf1.org/v1/sessions?year=${currentYear}&session_name=Race`);
            if (res.ok) sessions = await res.json();
        } catch (e) { console.warn("OpenF1 2026 Race fetch failed"); }

        // Try Current Year (2026) Any Session
        if (sessions.length === 0) {
            try {
                const res = await fetch(`https://api.openf1.org/v1/sessions?year=${currentYear}`);
                if (res.ok) sessions = await res.json();
            } catch (e) { console.warn("OpenF1 2026 all sessions fetch failed"); }
        }

        // Try Previous Year (2025) Races
        if (sessions.length === 0) {
            try {
                const res = await fetch(`https://api.openf1.org/v1/sessions?year=${currentYear - 1}&session_name=Race`);
                if (res.ok) sessions = await res.json();
            } catch (e) { console.warn("OpenF1 2025 Race fetch failed"); }
        }

        let finalDriverList = [];

        if (sessions.length > 0) {
            const latestSession = sessions[sessions.length - 1];
            try {
                const dRes = await fetch(`https://api.openf1.org/v1/drivers?session_key=${latestSession.session_key}`);
                if (dRes.ok) {
                    finalDriverList = await dRes.json();
                }
            } catch (e) { console.error("Error fetching drivers from session", e); }
        }

        // FINAL SAFETY NET: Hardcoded 2025/2026 Grid
        if (finalDriverList.length === 0) {
            console.log("Using Safety Net: FALLBACK_DRIVERS");
            finalDriverList = FALLBACK_DRIVERS;
        }

        // Remove duplicates
        const uniqueDrivers = Array.from(
            new Map(finalDriverList.map(d => [d.driver_number, d])).values()
        );

        dispatch(setDriver(uniqueDrivers));

    } catch (error) {
        console.error("Error fetching driver standings:", error.message);
        dispatch(setDriver(FALLBACK_DRIVERS)); // Extreme fallback
    }
};

// --- SCHEDULE ---

export const fetchSchedule = () => async (dispatch) => {
    dispatch(setScheduleLoading());

    try {
        const currentYear = new Date().getFullYear();
        const res = await fetch(`https://api.openf1.org/v1/meetings?date_start>=${currentYear}-01-01`);

        if (res.ok) {
            const results = await res.json();
            let allMeetings = Array.isArray(results) ? [...results] : [];

            // Filter to ensure data quality AND only Grand Prix events
            allMeetings = allMeetings.filter(m =>
                m.meeting_name &&
                m.date_start &&
                m.meeting_name.toLowerCase().includes("grand prix")
            );

            if (allMeetings.length > 0) {
                console.log("Using API Schedule");
                const sortedMeetings = allMeetings.sort((a, b) =>
                    new Date(a.date_start) - new Date(b.date_start)
                );

                const transformedSchedule = sortedMeetings.map((meeting, index) => ({
                    round: index + 1,
                    raceName: meeting.meeting_name,
                    meeting_key: meeting.meeting_key,
                    Circuit: {
                        circuitName: meeting.circuit_short_name,
                        Location: {
                            locality: meeting.location,
                            country: meeting.country_name
                        }
                    },
                    date: meeting.date_start.split('T')[0],
                    time: meeting.date_start.split('T')[1]?.substring(0, 8) || "00:00:00"
                }));
                dispatch(setSchedule(transformedSchedule));
            } else {
                console.log("API returned empty. Using Hardcoded 2026 Fallback.");
                dispatch(setSchedule(F1_2026_SCHEDULE));
            }

        } else {
            throw new Error(`API Error: ${res.status}`);
        }
    } catch (error) {
        console.error('Error fetching schedule:', error);
        console.log("Error occurred. Using Hardcoded 2026 Fallback.");
        dispatch(setSchedule(F1_2026_SCHEDULE));
    }
}

// NOTE: Race results, scoring, and admin functions will be migrated in the next phase
// For now, keeping the structure compatible with existing components

export default userSlice.reducer;
