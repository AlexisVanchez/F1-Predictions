import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { app } from "./firebase_config";
import "firebase/compat/firestore";

export const getEventInfo = (state) => {
  for (let i = 1; i <= 22; i++) {
    fetch(`http://ergast.com/api/f1/2022/${i}/results.json`)
      .then((response) => response.json())
      .then((data) => {
        let event = Object.entries(data.MRData.RaceTable.Races[0]);
        if (event.length > 0) {
          // setResult(state => [...state,event])
          eventSlice.getInitialState(state);
        }
      });
  }
};

export const eventSlice = createSlice({
  name: "eventInfo",
  initialState: {
    event: "",
    driver: "",
    constructor: "",
  },
  reducers: {
    setEvent: (state, action) => {
      state.event = action.payload;
    },
  },
});

export const { setEvent } = eventSlice.actions;

export default eventSlice.reducer;
