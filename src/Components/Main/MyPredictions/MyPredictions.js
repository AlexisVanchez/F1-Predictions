import { useEffect, useState } from "react";
import Footer from "../../Footer/Footer";
import Header from "../../Header/Header";
import { useDispatch, useSelector } from "react-redux";
import { createBet, fetchDriverStandings } from "../../../redux/reducer";
import classes from './MyPredictions.module.css';


export default function MyPredictions() {

    
    const dispatch = useDispatch()
    const drivers = useSelector(state => state.user.drivers)
    const user = useSelector((state) => state.user.user);
    const bet = useSelector((state) => state.user.bet);

    console.log(user);

    useEffect(() => {
        dispatch(fetchDriverStandings())
    }, [])

    const [localBet, setLocalBet] = useState(Array(10).fill(null));

    function handleDriverSelection(index, driver) {
        const newLocalBet = [...localBet];
        newLocalBet[index] = driver;
        setLocalBet(newLocalBet);
    }

    function onSubmit(e) {
        e.preventDefault();
        dispatch(createBet(user.uid, bet));
      }

    function renderSelects(){
        const selects = []
        for(let i = 0; i < 10; i++){
            selects.push(
                <div className={classes.select}>
                    <p>{i+1}</p>
                    <select
                    onChange={(e) => handleDriverSelection(i, e.target.value)}
                    value={localBet[i]}>
                        {drivers.map((driver, i) => 
                            <option key={i} value={driver}>{driver}</option>
                        )}
                    </select>
                </div>
            )
        }
        console.log(selects);
        return selects;
    }

    

    return (
        <div>
            <Header/>
            <div className={classes.mainDiv}>
                <form onSubmit={onSubmit}>
                    {renderSelects()}
                    <button type='submit'>Submit</button>
                </form>
            </div>
            <Footer/>
        </div>
    );
}