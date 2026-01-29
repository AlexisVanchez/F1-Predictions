import Logo from '../Logo/Logo';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { signOut } from '../../redux/reducer';

export default function Header() {
    const user = useSelector((state) => state.user.user);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        try {
            await dispatch(signOut());
            navigate('/', { replace: true });
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    const linkClass = ({ isActive }) =>
        `px-4 py-2 no-underline font-black italic uppercase tracking-tighter text-sm transition-all duration-300 rounded-lg ${isActive
            ? 'text-red-600 bg-red-600/10 scale-105'
            : 'text-gray-400 hover:text-white hover:bg-white/5'
        }`;

    return (
        <header className='sticky top-0 z-50 bg-[#0b0c10]/90 backdrop-blur-xl border-b border-white/5 px-6 py-4'>
            <div className='max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6'>
                <div className='flex items-center gap-8'>
                    <Logo />
                    <nav className='hidden lg:flex items-center gap-1'>
                        <NavLink to="/home" className={linkClass}>Home</NavLink>
                        <NavLink to="/leagues" className={linkClass}>Leagues</NavLink>
                        <NavLink to="/profile" className={linkClass}>Profile</NavLink>
                        <NavLink to="/my-predictions" className={linkClass}>My Predictions</NavLink>
                        <NavLink to="/leaderboard" className={linkClass}>Leaderboard</NavLink>
                        <NavLink to="/credits" className={linkClass}>Credits</NavLink>
                    </nav>
                </div>

                <div className='flex items-center gap-4 w-full md:w-auto'>
                    <div className='relative flex-grow md:flex-grow-0 group'>
                        <input
                            className='w-full md:w-[220px] h-10 px-4 pl-10 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-200 outline-none focus:border-red-600/50 focus:ring-1 focus:ring-red-600/50 transition-all placeholder:text-gray-600 group-hover:bg-white/10'
                            type="search"
                            placeholder="Search..."
                        />
                        <svg className="absolute left-3.5 top-3 w-4 h-4 text-gray-500 group-focus-within:text-red-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    {user && (
                        <button
                            onClick={handleSignOut}
                            className='px-6 py-2 bg-gradient-to-r from-red-600 to-red-800 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all transform hover:-translate-y-0.5 active:scale-95'
                        >
                            Logout
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}
