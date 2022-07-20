import React from 'react';
import Header from './Components/Header/Header';
import './App.css'
import Footer from './Components/Footer/Footer';
import Main from './Components/Main/Main';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from './Components/Main/Home/Home';
import MyPredictions from './Components/Main/MyPredictions/MyPredictions';
import Memes from './Components/Main/Memes/Memes';
import Credits from './Components/Main/Credits/Credits';
import Championship from './Components/Main/Championship/Championship';

function App() {
  
  return (
    <div className="app">
      <BrowserRouter>
        <Header />
        <Footer />
        <Routes>
          <Route path="/championship" element={<Championship />} />
          <Route path="/home" element={<Home />} />
          <Route path="/my-predictions" element={<MyPredictions />} />
          <Route path="/memes" element={<Memes />} />
          <Route path="/credits" element={<Credits />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
