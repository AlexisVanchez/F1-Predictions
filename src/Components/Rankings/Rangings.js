import {getDrivers} from '../../redux/reducer'
import {useDispatch, useSelector} from 'react-redux'
import {app} from '../../redux/firebase_config'
import 'firebase/compat/firestore';
import { useState, useEffect } from 'react';

function Ranking(){
    const dispatch = useDispatch();
    const {teams} = useSelector(state => state.teams)
    const [driver, setDriver] = useState([])
    
    let teamsList = []
    async function getTeams() {  
        const db = app.firestore();
        db.collection('Championship Info')
        .doc('Teams').collection('Red Bull')
        .get().then(snapshot => {
            snapshot.forEach((doc) =>{
                teamsList.push(doc.data())
                console.log(doc.data());
                return teamsList;
            })
        })
        setDriver(teamsList)
    }

    useEffect(() => {
        getTeams()
    }
    , [])

    console.log(driver);
    return(
        <div>
            <ul>
                {setTimeout(() => {
                    driver.map((driver) => {
                    return(
                        <li>{driver.points}</li>
                    )
                })}
                , 1000)}
            </ul>
        </div>
    )
}

export default Ranking;