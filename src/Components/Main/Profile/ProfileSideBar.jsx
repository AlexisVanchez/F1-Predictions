import { useSelector, useDispatch } from "react-redux";
import { NavLink, useNavigate } from "react-router-dom";
import { signOut } from "../../../redux/reducer";

export default function Sidebar() {
    const user = useSelector(state => state.user.user);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await dispatch(signOut());
            navigate("/");
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    // Default image if no photoURL
    const displayImage = user?.photoURL || require('../../../images/Profile_photo.jpeg');
    const displayName = user?.displayName || "Guest User";

    return (
        <div className="SideBar w-2/12 min-h-screen flex flex-col justify-start bg-gradient-to-br from-gray-900 via-black to-gray-900 shadow-2xl z-10 border-r border-red-900/30">
            {/* Profile Header */}
            <div className="PhotoName flex flex-col p-6 items-center border-b border-red-900/30 bg-black/30 backdrop-blur-sm">
                <div className="relative group">
                    <img
                        className="h-24 w-24 rounded-full object-cover shadow-lg border-4 border-red-600/50 transition-transform duration-300 group-hover:scale-105 group-hover:border-red-500"
                        src={displayImage}
                        alt='Profile'
                    />
                    <div className="absolute inset-0 rounded-full border-2 border-red-500/20 pointer-events-none group-hover:border-red-500/40 transition-colors"></div>
                </div>

                <div className="mt-4 text-center">
                    <div className="text-xl font-black text-white tracking-tight italic">{displayName}</div>

                </div>
            </div>

            {/* Navigation Menu */}
            <div className="List flex flex-col p-4 space-y-2 mt-2">
                <NavLink to="/last-prediction" className="no-underline">
                    {({ isActive }) => <NavItem label="Last Prediction" active={isActive} />}
                </NavLink>
                <NavLink to="/upcoming-race" className="no-underline">
                    {({ isActive }) => <NavItem label="Upcoming Race" active={isActive} />}
                </NavLink>
                <NavLink to="/settings" className="no-underline">
                    {({ isActive }) => <NavItem label="Settings" active={isActive} icon="⚙️" />}
                </NavLink>
                <NavItem label="FAQ" icon="❓" />
            </div>

            {/* Footer / Logout */}
            <div className="mt-auto p-6 border-t border-red-900/30">
                <button
                    onClick={handleLogout}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-lg shadow-lg shadow-red-900/50 transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-red-500/50 font-bold flex items-center justify-center space-x-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Logout</span>
                </button>
            </div>
        </div>
    )
}

function NavItem({ label, active = false, icon = null }) {
    return (
        <div className={`
            p-3 rounded-lg cursor-pointer transition-all duration-200 flex items-center space-x-2 font-bold italic
            ${active
                ? 'bg-gradient-to-r from-red-600/20 to-red-700/20 text-red-500 border-l-4 border-red-500 shadow-lg shadow-red-900/30'
                : 'text-gray-400 hover:bg-red-900/10 hover:text-red-400 hover:pl-4 hover:border-l-2 hover:border-red-700/50'}
        `}>
            {icon && <span className="text-lg">{icon}</span>}
            <span>{label}</span>
        </div>
    )
}