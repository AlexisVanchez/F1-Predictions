import { useEffect, useState } from "react";


export default function Calendar(props){

    const [schedule, setSchedule] = useState([])

    function getSchedule(){
        fetch(`http://ergast.com/api/f1/current.json`)
            .then(response => response.json())
            .then(data => {
                const races = data.MRData.RaceTable.Races.slice(0, 23);
                setSchedule(races)
        })
    }

    function convertToGMT3Time(time){
        const date = new Date(`1970-01-01T${time}`)
        const offsetInHours = 3
        date.setUTCHours(date.getUTCHours() + offsetInHours);
        return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    }

    useEffect( () => {
        getSchedule()
    }, [])

    return(
        <div>
            <table>
                <thead>
                    <tr>
                        <th>Round</th>
                        <th>Circuit</th>
                        <th>Date</th>
                        <th>Time</th>
                    </tr>
                </thead>
                <tbody>
                    {schedule.map((event) => {
                        return(
                            <tr key={event.round}>
                                <td>{event.round}</td>
                                <td>{event.raceName}</td>
                                <td>{event.date}</td>
                                <td>{convertToGMT3Time(event.time)}</td>
                                <td>{console.log(event)}</td>
                            </tr>
                        )}
                    )}
                </tbody>
            </table>
        </div>
    )
}