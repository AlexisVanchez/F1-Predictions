import { configureStore } from "@reduxjs/toolkit";
import userSlice from './reducer_supabase'

export default configureStore({
    reducer: {
        user: userSlice
    }
})