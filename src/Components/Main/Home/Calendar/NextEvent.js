import { useEffect, useState } from 'react';
import classes from './NextEvent.module.css';

export default function EventComponent({ props }) {

    const [nextEvent, setNextEvent] = useState({})
    const [nextEventTime, setNextEventTime] = useState('')
    const [nextEventName, setNextEventName] = useState('')
    const [nextEventDate, setNextEventDate] = useState('')

    function getNextEvent(props) {
        const now = new Date();
        let minDiff = Infinity;

        // Filter to only check Grand Prix events (exclude pre-season testing)
        const grandPrixEvents = props.filter(event =>
            event.raceName && event.raceName.toLowerCase().includes("grand prix")
        );

        for (let i = 0; i < grandPrixEvents.length; i++) {
            const eventDate = new Date(grandPrixEvents[i].date);
            const diff = eventDate - now
            if (diff > 0 && diff < minDiff) {
                minDiff = diff;
                setNextEventTime(grandPrixEvents[i].time)
                setNextEventName(grandPrixEvents[i].raceName)
                setNextEventDate(grandPrixEvents[i].date)
                setNextEvent(grandPrixEvents[i])
            }
        }
    }

    // console.log(nextEvent.FirstPractice.date);

    function convertToLocalTime(time) {
        if (!time) return "";
        // Assume time is in UTC (Format: HH:MM:SS)
        const [hours, minutes, seconds] = time.split(':');
        const date = new Date();
        date.setUTCHours(parseInt(hours, 10));
        date.setUTCMinutes(parseInt(minutes, 10));
        date.setUTCSeconds(parseInt(seconds || '0', 10));

        // Display in local computer time
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    useEffect(() => {
        getNextEvent(props)
    }, [props])

    useEffect(() => {
        async function fetchDetailedSessions() {
            let sessionsFound = false;

            if (nextEvent && nextEvent.meeting_key) {
                console.log(`Fetching sessions for meeting ${nextEvent.meeting_key}...`);
                try {
                    const res = await fetch(`https://api.openf1.org/v1/sessions?meeting_key=${nextEvent.meeting_key}`);
                    if (res.ok) {
                        const sessions = await res.json();

                        if (sessions.length > 0) {
                            sessionsFound = true;
                            // Map OpenF1 sessions to our structure
                            const updatedEvent = { ...nextEvent };

                            sessions.forEach(session => {
                                const name = session.session_name.toLowerCase();
                                const sessionData = {
                                    date: session.date_start.split('T')[0],
                                    time: session.date_start.split('T')[1]?.substring(0, 8)
                                };

                                if (name.includes('practice 1')) updatedEvent.FirstPractice = sessionData;
                                else if (name.includes('practice 2')) updatedEvent.SecondPractice = sessionData;
                                else if (name.includes('practice 3')) updatedEvent.ThirdPractice = sessionData;
                                else if (name.includes('qualifying') && !name.includes('sprint')) updatedEvent.Qualifying = sessionData;
                                else if (name.includes('sprint')) updatedEvent.Sprint = sessionData;
                            });

                            setNextEvent(updatedEvent);
                        }
                    }
                } catch (e) {
                    console.error("Error fetching sessions:", e);
                }
            }
        }

        if (nextEvent && nextEvent.date) {
            fetchDetailedSessions();
        }

    }, [nextEvent.meeting_key, nextEvent.date])

    return (
        <div className='flex flex-col w-2/5'>
            <div className='w-full flex justify-around'>
                <p>The next event is: <b>{nextEventName}</b></p>
            </div>
            <div className='flex justify-around w-full'>
                <p>Starts at: <b>{convertToLocalTime(nextEventTime)}</b></p>
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
                            <td>{convertToLocalTime(nextEvent.FirstPractice.time)}</td>
                        </tr>
                    )}
                    {nextEvent.SecondPractice && (
                        <tr>
                            <td>Second Practice</td>
                            <td>{nextEvent.SecondPractice.date}</td>
                            <td>{convertToLocalTime(nextEvent.SecondPractice.time)}</td>
                        </tr>
                    )}
                    {nextEvent.ThirdPractice && (
                        <tr>
                            <td>Third Practice</td>
                            <td>{nextEvent.ThirdPractice.date}</td>
                            <td>{convertToLocalTime(nextEvent.ThirdPractice.time)}</td>
                        </tr>
                    )}
                    {nextEvent.Qualifying && (
                        <tr>
                            <td>Qualifying</td>
                            <td>{nextEvent.Qualifying.date}</td>
                            <td>{convertToLocalTime(nextEvent.Qualifying.time)}</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    )
}