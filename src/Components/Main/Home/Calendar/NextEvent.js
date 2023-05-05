import {useEffect, useState} from 'react';
import classes from './NextEvent.module.css';

export default function EventComponent({props}){

    const [nextEvent, setNextEvent] = useState({})
    const [nextEventTime, setNextEventTime] = useState('')
    const [nextEventName, setNextEventName] = useState('')
    const [nextEventDate, setNextEventDate] = useState('')

    function getNextEvent(props){
        const now = new Date();
        let minDiff = Infinity;
        for(let i = 0; i < props.length; i++){
            const eventDate = new Date(props[i].date);
            const diff = eventDate - now
            if(diff > 0 && diff < minDiff){
                minDiff = diff;
                setNextEventTime(props[i].time)
                setNextEventName(props[i].raceName)
                setNextEventDate(props[i].date)
                setNextEvent(props[i])
            }
        }
    }

    // console.log(nextEvent.FirstPractice.date);

    function convertToGMT3Time(time){
        const date = new Date(`1970-01-01T${time}`)
        const offsetInHours = 1
        date.setUTCHours(date.getUTCHours() + offsetInHours);
        return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    }

    useEffect(() => {
        getNextEvent(props)
    }, [props])

    return(
        <div className={classes.mainDiv}>
            <div className={classes.name}>
                <p>The next event is: <b>{nextEventName}</b></p>
            </div>
            <div className={classes.date}>
                <p>Starts at: <b>{convertToGMT3Time(nextEventTime)}</b></p>
                <p><b>{nextEventDate}</b></p>
            </div>
            <table className={classes.weekend}>
                <thead>
                    <th></th>
                    <th>Date</th>
                    <th>Time</th>
                </thead>
                <tbody>
                    {nextEvent.FirstPractice && (
                    <tr>
                        <td>First Practice</td>
                        <td>{nextEvent.FirstPractice.date}</td>
                        <td>{convertToGMT3Time(nextEvent.FirstPractice.time)}</td>
                    </tr>
                    )}
                    {nextEvent.SecondPractice && (
                    <tr>
                        <td>Second Practice</td>
                        <td>{nextEvent.SecondPractice.date}</td>
                        <td>{convertToGMT3Time(nextEvent.SecondPractice.time)}</td>
                    </tr>
                    )}
                    {nextEvent.ThirdPractice && (
                    <tr>
                        <td>Third Practice</td>
                        <td>{nextEvent.ThirdPractice.date}</td>
                        <td>{convertToGMT3Time(nextEvent.ThirdPractice.time)}</td>
                    </tr>
                    )}
                    {nextEvent.Qualifying && (
                    <tr>
                        <td>Qualifying</td>
                        <td>{nextEvent.Qualifying.date}</td>
                        <td>{convertToGMT3Time(nextEvent.Qualifying.time)}</td>
                    </tr>
                    )}
                </tbody>
            </table>
        </div>
    )
}