import React, { useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./Components/Main/Home/Home";
import MyPredictions from "./Components/Main/MyPredictions/MyPredictions";
import Memes from "./Components/Main/Memes/Memes";
import Credits from "./Components/Main/Credits/Credits";
import LeaderboardHub from "./Components/Main/Championship/LeaderboardHub";
import Stage from "./Components/Main/Championship/Results/Stage/Stage";
import Login from "./Components/Login/Login";
import Signup from "./Components/Login/Signup";
import Profile from "./Components/Main/Profile/Profile";
import GrandPrixDetail from "./Components/Main/Championship/GrandPrixDetail/GrandPrixDetail";
import DriverDetail from "./Components/Main/Championship/DriverDetail/DriverDetail";
import Timings from "./Components/Main/Championship/Timings/Timings";
import Leagues from "./Components/Main/Leagues/Leagues";
import Settings from "./Components/Main/Profile/Settings";
import LastPrediction from "./Components/Main/Profile/LastPrediction";
import UpcomingRace from "./Components/Main/Home/UpcomingRace/UpcomingRace";
import Achievements from "./Components/Main/Profile/Achievements";
import AdminPanel from "./Components/Admin/AdminPanel";
import { useDispatch, useSelector } from "react-redux";
import { supabase } from "./config/supabase";
import { fetchUserProfile, setUser } from "./redux/reducer_supabase";

import ProtectedRoute from "./Components/ProtectedRoute";

function App() {
  const dispatch = useDispatch();
  const theme = useSelector(state => state.user.theme);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        dispatch(fetchUserProfile(session.user.id));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        dispatch(fetchUserProfile(session.user.id));
      } else {
        dispatch(setUser(null));
      }
    });

    return () => subscription.unsubscribe();
  }, [dispatch]);

  // Apply theme to document body
  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
  }, [theme]);

  return (
    <div className={`flex flex-col min-h-screen ${theme === 'light' ? 'light-mode bg-gray-50' : 'bg-[#0a0b0f]'}`}>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route index element={<Login />} />
          <Route path="signup" element={<Signup />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="leaderboard" element={<LeaderboardHub />} />
            <Route path="home" element={<Home />} />
            <Route path="leagues" element={<Leagues />} />
            <Route path="my-predictions" element={<MyPredictions />} />
            <Route path="memes" element={<Memes />} />
            <Route path="credits" element={<Credits />} />
            <Route path="driver/:year/:driverId" element={<DriverDetail />} />
            <Route path="driver/:driverId" element={<DriverDetail />} />
            <Route path="championship/:stage" element={<Stage />} />
            <Route path="championship/race/:year/:sessionKey" element={<GrandPrixDetail />} />
            <Route path="championship/race/:sessionKey" element={<GrandPrixDetail />} />
            <Route path="championship/race/:year/:sessionKey/timings" element={<Timings />} />
            <Route path="championship/race/:sessionKey/timings" element={<Timings />} />
            <Route path='profile' element={<Profile />}></Route>
            <Route path='settings' element={<Settings />}></Route>
            <Route path='last-prediction' element={<LastPrediction />}></Route>
            <Route path='upcoming-race' element={<UpcomingRace />}></Route>
            <Route path='achievements' element={<Achievements />}></Route>
            <Route path='last-year-results' element={<LeaderboardHub year={new Date().getFullYear() - 1} />}></Route>
            <Route path='admin' element={<AdminPanel />}></Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
