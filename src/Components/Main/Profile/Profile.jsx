// eslint-disable-next-line no-unused-vars
import Footer from "../../Footer/Footer";
import Header from "../../Header/Header";
import ProfileMainSection from "./ProfileMainSection/ProfileMainSection";
import Sidebar from "./ProfileSideBar";
import UserLeagues from "./ProfileMainSection/UserLeagues";
import LeagueMembers from "./ProfileMainSection/LeagueMembers";


export default function Profile() {
    return (
        <div className="bg-[#0b0c10] min-h-screen">
            <Header />
            <div className="flex w-full">
                {/* Left Navigation Sidebar */}
                <Sidebar />

                {/* Center Content Dashbord */}
                <div className="flex-1 overflow-hidden">
                    <ProfileMainSection />
                </div>

                {/* Right Friends & Leagues Sidebar */}
                <div className="SideBar w-2/12 min-h-screen hidden xl:flex flex-col justify-start bg-gradient-to-br from-gray-900 via-black to-gray-900 shadow-2xl z-10 border-l border-red-900/30">
                    <div className="flex flex-col h-full">
                        <UserLeagues />
                        <LeagueMembers />
                    </div>
                </div>

            </div>
        </div>
    )
}