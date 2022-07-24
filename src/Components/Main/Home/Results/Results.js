import {useState} from 'react';

export default function Results(){

    // const [country, setCountry] = useState([])

    var requestOptions = {
        method: 'GET',
        redirect: 'follow',
      };
      
    let country = [];
    let driverInfo = [];
    let fetches = [];

    async function calendar(){
        for(let i = 0; i <= 22; i++){
            fetches.push(
            fetch(`http://ergast.com/api/f1/2022/${i}/results.json`, requestOptions)
            .then(response => response.text())
            .then(result => {
                let event = JSON.parse(result);
                let events = event.MRData.RaceTable.Races[0]
                // setCountry(events.Circuit.circuitName) -- крашит браузер
                country.push(events.Circuit.circuitName)
                driverInfo.push(events.Results[0])
                // console.log(country);
                return events
            })      
            .catch(error => console.log('error', error))
            )
        }
    }

    Promise.all(fetches).then(() => {
        calendar();
        console.log(fetches)
    })
    
    return(
        <div>
            <table>
                <thead>
                    <tr>
                        <th>Circuit</th>
                        <th>Date</th>
                        <th>Winner</th>
                        <th>Team</th>
                        <th>Laps</th>
                        <th>Time</th>
                        </tr>
                   
                </thead>
                <tbody>
                    <tr>
                    {driverInfo && driverInfo.Driver.map((fetch, index) => {
                        return(
                            <td>{fetch}</td>
                        )
                    }
                    )}
                        {/* <td>Bahrain</td>
                        <td>20 Mar 2022</td>
                        <td>Charles Leclerc</td>
                        <td>Ferrari</td>
                        <td>57</td>
                        <td>1:37:33.584</td> */}
                    </tr>
                    
                </tbody>
            </table>
        </div>
    )
}