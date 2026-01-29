import { useParams } from "react-router-dom"
import Footer from "../../../../Footer/Footer";
import Header from "../../../../Header/Header";


export default function Stage(props){

    const {stage} = useParams();

    console.log(stage);
    
    return(
        <div>
            <Header />
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
            <Footer />
        </div>
    )
}