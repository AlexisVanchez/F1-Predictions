import { configureStore } from "@reduxjs/toolkit";
import eventSlice from "./reducer";

export default configureStore({
  reducer: {
    eventInfo: eventSlice,
  },
});