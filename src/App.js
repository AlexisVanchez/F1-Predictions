import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./Components/Main/Home/Home";
import MyPredictions from "./Components/Main/MyPredictions/MyPredictions";
import Memes from "./Components/Main/Memes/Memes";
import Credits from "./Components/Main/Credits/Credits";
import Championship from "./Components/Main/Championship/Championship";
import Stage from "./Components/Main/Championship/Results/Stage/Stage";
import Login from "./Components/Login/Login";

function App() {
  return (
    <div className="app">
      <BrowserRouter>
        <Routes>
          <Route index element={<Login />} />
          <Route path="championship" element={<Championship />} />
          <Route path="home" element={<Home />} />
          <Route path="my-predictions" element={<MyPredictions />} />
          <Route path="memes" element={<Memes />} />
          <Route path="credits" element={<Credits />} />
          <Route path="championship/:stage" element={<Stage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
