import { configureStore } from "@reduxjs/toolkit";
import userSlice from './reducer'

export default configureStore({
    reducer:{
        user: userSlice
    }
})