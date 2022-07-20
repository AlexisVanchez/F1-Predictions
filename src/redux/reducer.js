import { createSlice, createAsyncThunk} from '@reduxjs/toolkit';
import {app} from './firebase_config'
import 'firebase/compat/firestore';

export const getDrivers = createAsyncThunk(
    'drivers/getDrivers',
    async () => {
        let teamsList = []
        const db = app.firestore();
        await db.collection('Championship Info')
        .doc('Teams')
        .get().then((teams) =>{
            teams.forEach((doc) =>{
                teamsList.push(doc.data())
                console.log(doc.data());
                return teamsList
            })
        })   
    }
)

const reducer = createSlice({
    name: 'teams',
    initialState: {
        teams: [],
    },
})
export default reducer.reducer;
