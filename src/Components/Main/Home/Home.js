import Footer from "../../Footer/Footer";
import Header from "../../Header/Header";
import Calendar from "./Calendar/Calendar";
import NextEvent from "./Calendar/NextEvent";



export default function Home() {
  return (
    <div className="home">
      <Header />
      <Calendar />
      <Footer />
    </div>
  );
}