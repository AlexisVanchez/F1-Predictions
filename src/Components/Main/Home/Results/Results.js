import classes from  './Results.module.css';
import './Results.module.css';
import {useEffect, useMemo, useState} from 'react';
const API = `http://ergast.com/api/f1/2022/5/results.json`

export default function Results(){

    const [country, setCountry] = useState([]);
    const [result, setResult] = useState([]);
    const [fetches, setFetches] = useState([]);
    let [count, setCount] = useState(0);

    useEffect(() => {
        async function getResults(){
            for(let i = 1; i <= 22; i++){
            fetches.push(
            await fetch(`http://ergast.com/api/f1/2022/${i}/results.json`)
                .then(response => response.json())
                    .then(data => {
                        let event = Object.entries(data.MRData.RaceTable.Races[0]);
                        if(event.length > 0){
                            setResult(state => [...state,event])
                            console.log(data.MRData);
                        }
                    })
                )}
            }
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
                            return(
                                <tr key={index}>
                                    <td>{index+1}</td>
                                    <td>{event[3][1]}</td>
                                    <td>{event[5][1]}</td>
                                    <td>{event[7][1][0].Driver.familyName}</td>
                                    <td>{event[7][1][0].Constructor.name}</td>
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