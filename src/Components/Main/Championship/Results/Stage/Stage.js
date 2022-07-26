import { useParams } from "react-router-dom"


export default function Stage(props){

    const {stage} = useParams();

    console.log(stage);
    
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
                    {}
                </tbody>
            </table>
        </div>
    )
}