import { createSlice } from "@reduxjs/toolkit";
import "firebase/compat/firestore";
import { auth, firestore} from "./firebase_config";
import firebase from "firebase/compat/app";

const initialState = {
  user: null,
  bet: {},
  drivers: []
}

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setDriver: (state, action) => {
      state.drivers = action.payload;
    },
    setUser: (state, action) => {
      state.user = action.payload
    },
    setBet: (state, action) => {
      state.bet = action.payload
    },
  }
})

export const {setUser, setBet, setDriver} = userSlice.actions;

export const fetchDriverStandings = () => async (dispatch) => {
  try {
    const response = await fetch("https://ergast.com/api/f1/2023/driverStandings.json");
    const data = await response.json();
    const driverStandings = data.MRData.StandingsTable.StandingsLists[0].DriverStandings;
    for(let i = 0; i < driverStandings.length; i++) {
      dispatch(setDriver(driverStandings[i].Driver.familyName));
    }
  } catch (error) {
    console.error("Error fetching driver standings:", error.message);
  }
};


export const signIn = (email, password) => async (dispatch) => {
  try{
    await auth.signInWithEmailAndPassword(email, password);
    const user = auth.currentUser;
    dispatch(setUser({uid: user.uid, email: user.email}))
  }
  catch(error){
    console.error(error.message);
  }
}

export const createBet = (userID, betData) => async (dispatch) => {
  try{
    const bet = await firestore.collection('bets').doc(userID)
    bet.set({
      bet: firebase.firestore.FieldValue.arrayUnion(betData)
    },
    { merge: true }
    )
    dispatch(setBet(betData));
  } 
  catch (error) {
    console.error("Error creating bet:", error.message);
  }
};

export const fetchBets = (userID) => async (dispatch) => {
  try{
    const betRef = firestore.collection('bets').doc(userID)
    const betDoc = await betRef.get();

    if(betDoc){
      dispatch(setBet(betDoc.data()))
    }
    else{
      console.error('No bets found', userID);
    }
  }
  catch(error){
    console.log(error.message);
  }
}

export default userSlice.reducer;