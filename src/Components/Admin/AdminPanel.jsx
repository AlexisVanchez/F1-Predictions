import React, { useState, useEffect } from "react";
// eslint-disable-next-line no-unused-vars
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import Header from "../Header/Header";
import AdminStats from "./AdminStats";
import RaceControl from "./RaceControl";
import BroadcastControl from "./BroadcastControl";
import UserInspector from "./UserInspector";
import Simulator from "./Simulator";

export default function AdminPanel() {
    const user = useSelector(state => state.user.user);
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("dashboard");

    // Security Check
    useEffect(() => {
        if (!user || user.email !== "daks977463@gmail.com") {
            navigate("/home");
        }
    }, [user, navigate]);

    if (!user || user.email !== "daks977463@gmail.com") return null;

    return (
        <div className="min-h-screen bg-[#0b0c10] text-white font-sans">
            <Header />

            <div className="container mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-black italic tracking-widest text-red-600">
                        ADMIN<span className="text-white">PANEL</span>
                    </h1>
                    <div className="text-sm text-gray-400 font-mono bg-gray-900 px-3 py-1 rounded border border-gray-800">
                        ACCESS: GRANTED
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex flex-wrap gap-4 mb-8 border-b border-gray-800 pb-4">
                    <TabButton
                        id="dashboard"
                        label="Dashboard"
                        icon="📊"
                        active={activeTab === "dashboard"}
                        onClick={setActiveTab}
                    />
                    <TabButton
                        id="raceRequest"
                        label="Race Control"
                        icon="🏎️"
                        active={activeTab === "raceRequest"}
                        onClick={setActiveTab}
                    />
                    <TabButton
                        id="broadcast"
                        label="Broadcast"
                        icon="📡"
                        active={activeTab === "broadcast"}
                        onClick={setActiveTab}
                    />
                    <TabButton
                        id="simulator"
                        label="Simulator"
                        icon="🏁"
                        active={activeTab === "simulator"}
                        onClick={setActiveTab}
                    />
                    <TabButton
                        id="users"
                        label="User Inspector"
                        icon="🕵️‍♂️"
                        active={activeTab === "users"}
                        onClick={setActiveTab}
                    />
                </div>

                {/* Content Area */}
                <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800 rounded-xl p-6 shadow-2xl">
                    {activeTab === "dashboard" && <AdminStats />}
                    {activeTab === "raceRequest" && <RaceControl />}
                    {activeTab === "broadcast" && <BroadcastControl />}
                    {activeTab === "simulator" && <Simulator isEmbedded={true} />}
                    {activeTab === "users" && <UserInspector />}
                </div>
            </div>
        </div>
    );
}

function TabButton({ id, label, icon, active, onClick }) {
    return (
        <button
            onClick={() => onClick(id)}
            className={`
                flex items-center space-x-2 px-6 py-3 rounded-lg font-bold uppercase tracking-wider transition-all duration-300
                ${active
                    ? "bg-red-600 text-white shadow-lg shadow-red-900/50 transform -translate-y-1"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                }
            `}
        >
            <span className="text-lg">{icon}</span>
            <span>{label}</span>
        </button>
    );
}
