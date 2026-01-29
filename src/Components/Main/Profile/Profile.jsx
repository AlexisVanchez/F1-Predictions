import Footer from "../../Footer/Footer";
import Header from "../../Header/Header";
import ProfileMainSection from "./ProfileMainSection/ProfileMainSection";
import Sidebar from "./ProfileSideBar";


export default function Profile() {
    return (
        <div>
            <Header />
            <div className="flex w-full">
                <Sidebar />
                <div className="flex-1">
                    <ProfileMainSection />
                </div>

            </div>

            {/* <Footer /> */}
        </div>
    )
}