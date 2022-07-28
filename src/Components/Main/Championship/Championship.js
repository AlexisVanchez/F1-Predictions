import { Routes, Route, BrowserRouter} from 'react-router-dom';
import Footer from '../../Footer/Footer';
import Header from '../../Header/Header';
import OverallResults from './Results/OverallResults/OverallResults';

export default function Championship(props){
    return(
        <div>
            <Header />
            <OverallResults />
            <Footer />
        </div>
    )
}