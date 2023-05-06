import { useEffect, useState } from "react";
import Footer from "../../Footer/Footer";
import Header from "../../Header/Header";
import { useDispatch, useSelector } from "react-redux";
import { createBet, fetchDriverStandings } from "../../../redux/reducer";
import classes from './MyPridictions.module.css';


export default function MyPredictions() {

    
    const dispatch = useDispatch()
    const drivers = useSelector(state => state.user.drivers)

    useEffect(() => {
        dispatch(fetchDriverStandings())
    }, [])

    function onSubmit(){
        createBet()
    }

    

    return (
        <div>
            <Header/>
            <div className={classes.mainDiv}>
            <form onSubmit={onSubmit}>
                <input type="text" />
                <input type="text" />
                <input type="text" />
                <input type="text" />
                <input type="text" />
                <input type="text" />
                <input type="text" />
                <input type="text" />
                <input type="text" />
                <input type="text" />
            </form>
            </div>
            
            <Footer/>
        </div>
    );
}