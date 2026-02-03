import { firestore } from "../redux/firebase_config";
import firebase from "firebase/compat/app";

/**
 * SimulatorService provides utilities for seeding test data.
 */
export const SimulatorService = {
    /**
     * Seeds mock users into Firestore.
     * @param {number} count - Number of users to seed.
     */
    seedMockUsers: async (count = 10) => {
        const batch = firestore.batch();
        const mockUsers = [];

        for (let i = 1; i <= count; i++) {
            const uid = `mock_user_${i}_${Math.random().toString(36).substring(7)}`;
            const userRef = firestore.collection('users').doc(uid);
            const userData = {
                uid,
                email: `tester${i}@example.com`,
                displayName: `Mock Racer ${i}`,
                photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                globalPoints: 0,
                globalRank: 0,
                isMock: true
            };
            batch.set(userRef, userData);
            mockUsers.push(userData);
        }

        await batch.commit();
        return mockUsers;
    },

    /**
     * Generates randomized predictions for a list of users.
     * @param {Array} userIds - List of user UIDs.
     * @param {string} raceName - Name of the race.
     * @param {Array} driverPool - List of available driver codes (e.g., ["VER", "HAM", ...]).
     */
    generateMockPredictions: async (userIds, raceName, driverPool) => {
        const batch = firestore.batch();

        userIds.forEach(uid => {
            // Shuffle driver pool and take top 10
            const shuffled = [...driverPool].sort(() => 0.5 - Math.random());
            const predictions = shuffled.slice(0, 10);

            const docId = `${uid}_${raceName}`;
            const predictionRef = firestore.collection('predictions').doc(docId);

            batch.set(predictionRef, {
                uid,
                raceName,
                predictions,
                pitstops: Math.floor(Math.random() * 4) + 1, // 1-4
                redFlags: Math.floor(Math.random() * 2), // 0-1
                safetyCarCount: Math.floor(Math.random() * 3), // 0-2
                date: firebase.firestore.FieldValue.serverTimestamp(),
                season: "2026",
                isMock: true
            });
        });

        await batch.commit();
    },

    /**
     * Joins mock users to a specific league.
     * @param {Array} userIds - List of user UIDs to add.
     * @param {string} leagueId - The league ID to join.
     */
    joinMockUsersToLeague: async (userIds, leagueId) => {
        const leagueRef = firestore.collection('leagues').doc(leagueId);
        const leagueDoc = await leagueRef.get();

        if (!leagueDoc.exists) {
            throw new Error("League not found");
        }

        // Fetch user data for display names
        const userPromises = userIds.map(uid => firestore.collection('users').doc(uid).get());
        const userDocs = await Promise.all(userPromises);

        const members = userDocs
            .filter(doc => doc.exists)
            .map(doc => ({
                uid: doc.id,
                displayName: doc.data().displayName || 'Mock User'
            }));

        // Update league with new members
        await leagueRef.update({
            members: firebase.firestore.FieldValue.arrayUnion(...members),
            memberIds: firebase.firestore.FieldValue.arrayUnion(...userIds)
        });

        return members.length;
    },

    /**
     * Cleans up mock data (optional).
     */
    cleanupMockData: async () => {
        const usersSnapshot = await firestore.collection('users').where('isMock', '==', true).get();
        const predSnapshot = await firestore.collection('predictions').where('isMock', '==', true).get();

        const batch = firestore.batch();
        usersSnapshot.forEach(doc => batch.delete(doc.ref));
        predSnapshot.forEach(doc => batch.delete(doc.ref));

        await batch.commit();
    }
};
