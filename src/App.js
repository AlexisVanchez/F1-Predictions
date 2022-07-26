import React from 'react';
import Header from './Components/Header/Header';
import './App.css'
import Footer from './Components/Footer/Footer';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from './Components/Main/Home/Home';
import MyPredictions from './Components/Main/MyPredictions/MyPredictions';
import Memes from './Components/Main/Memes/Memes';
import Credits from './Components/Main/Credits/Credits';
import Championship from './Components/Main/Championship/Championship';
import Stage from './Components/Main/Championship/Results/Stage/Stage';


function App() {
  
  return (
    <div className="app">
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="championship" element={<Championship />} />
          <Route path="home" element={<Home />} />
          <Route path="my-predictions" element={<MyPredictions />} />
          <Route path="memes" element={<Memes />} />
          <Route path="credits" element={<Credits />} />
          <Route path="championship/:stage" element={<Stage />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </div>
  );
}

export default App;
