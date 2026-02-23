import { supabase } from "../config/supabase";

/**
 * SimulatorService provides utilities for seeding test data in Supabase.
 */
export const SimulatorService = {
    /**
     * Seeds mock users into Supabase.
     * @param {number} count - Number of users to seed.
     */
    seedMockUsers: async (count = 10) => {
        const mockUsers = [];

        for (let i = 1; i <= count; i++) {
            const uid = `mock_user_${i}_${Math.random().toString(36).substring(7)}`;
            const userData = {
                id: uid,
                email: `tester${i}@example.com`,
                display_name: `Mock Racer ${i}`,
                photo_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`,
                global_points: 0,
                global_rank: 0,
                is_mock: true
            };
            mockUsers.push(userData);
        }

        const { data, error } = await supabase
            .from('users')
            .insert(mockUsers)
            .select();

        if (error) {
            console.error("Error seeding mock users:", error);
            throw error;
        }

        return data;
    },

    /**
     * Generates randomized predictions for a list of users.
     * @param {Array} userIds - List of user UIDs.
     * @param {string} raceName - Name of the race.
     * @param {Array} driverPool - List of available driver codes (e.g., ["VER", "HAM", ...]).
     */
    generateMockPredictions: async (userIds, raceName, driverPool) => {
        const predictions = userIds.map(uid => {
            // Shuffle driver pool and take top 10
            const shuffled = [...driverPool].sort(() => 0.5 - Math.random());
            const predictionList = shuffled.slice(0, 10);

            return {
                user_id: uid,
                race_name: raceName,
                predictions: predictionList,
                pitstops: Math.floor(Math.random() * 4) + 1, // 1-4
                red_flags: Math.floor(Math.random() * 2), // 0-1
                safety_car_count: Math.floor(Math.random() * 3), // 0-2
                season: "2026",
                is_mock: true
            };
        });

        const { data, error } = await supabase
            .from('predictions')
            .insert(predictions)
            .select();

        if (error) {
            console.error("Error generating mock predictions:", error);
            throw error;
        }

        return data;
    },

    /**
     * Joins mock users to a specific league.
     * @param {Array} userIds - List of user UIDs to add.
     * @param {string} leagueId - The league ID to join.
     */
    joinMockUsersToLeague: async (userIds, leagueId) => {
        // Verify league exists
        const { data: league, error: leagueError } = await supabase
            .from('leagues')
            .select('id')
            .eq('id', leagueId)
            .single();

        if (leagueError || !league) {
            throw new Error("League not found");
        }

        // Create league member entries
        const members = userIds.map(uid => ({
            league_id: leagueId,
            user_id: uid
        }));

        const { data, error } = await supabase
            .from('league_members')
            .insert(members)
            .select();

        if (error) {
            console.error("Error joining mock users to league:", error);
            throw error;
        }

        return data.length;
    },

    /**
     * Cleans up mock data (optional).
     */
    cleanupMockData: async () => {
        // Delete mock predictions
        const { error: predError } = await supabase
            .from('predictions')
            .delete()
            .eq('is_mock', true);

        if (predError) {
            console.error("Error deleting mock predictions:", predError);
        }

        // Delete mock users (cascade will handle league memberships)
        const { error: userError } = await supabase
            .from('users')
            .delete()
            .eq('is_mock', true);

        if (userError) {
            console.error("Error deleting mock users:", userError);
        }

        console.log("Mock data cleanup completed");
    }
};
