import classes from './OverallResults.module.css';
import {useEffect, useState} from 'react';
import { Link } from 'react-router-dom';

export default function OverallResults(props){

    const [result, setResult] = useState([]);

    function getResults(){
        for(let i = 1; i <= 22; i++){
        fetch(`http://ergast.com/api/f1/2022/${i}/results.json`)
            .then(response => response.json())
                .then(data => {
                    let event = Object.entries(data.MRData.RaceTable.Races[0]);
                    if(event.length > 0){
                        setResult(state => [...state,event])
                    }
                })
            }
        }

    useEffect(() => {
        getResults();
    }
    , [])

    return(
        <div className={classes.races}>
            <table className={classes.table}>
                <thead>
                    <tr>
                        <th>Stage</th>
                        <th>Circuit</th>
                        <th>Date</th>
                        <th>Winner</th>
                        <th>Team</th>
                        <th>Laps</th>
                        <th>Time</th>
                    </tr>
                </thead>
                <tbody>
                        {result.map((event, index) => { //вынести в отдельный компонент
                        console.log(event)
                            return(
                                <tr key={index}>
                                    <td>{index+1}</td>
                                    <td><Link to={`/championship/${event[4][1].circuitId}`} className={classes.link}>{event[3][1]}</Link></td>
                                    <td>{event[5][1]}</td>
                                    <td><Link to={`/championship/${event[7][1][0].Driver.driverId}`} className={classes.link}>{event[7][1][0].Driver.familyName}</Link></td>
                                    <td><Link to={`/championship/${event[7][1][0].Constructor.constructorId}`} className={classes.link}>{event[7][1][0].Constructor.name}</Link></td>
                                    <td>{event[7][1][0].laps}</td>
                                    <td>{event[7][1][0].Time.time}</td>
                                </tr>
                            )}
                        )}
                </tbody>
            </table>
        </div>
    )
}