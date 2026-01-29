import Logo from '../Logo/Logo';
import { NavLink } from 'react-router-dom';

export default function Footer() {
    return (
        <footer className='w-full bg-[#0b0c10] border-t border-white/5 py-12 px-6 mt-12'>
            <div className='max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 items-center'>
                {/* Menu Section */}
                <div className='flex flex-col items-center md:items-start'>
                    <h4 className='text-red-600 font-black uppercase tracking-widest text-xs mb-6'>Quick Menu</h4>
                    <ul className='flex flex-col items-center md:items-start gap-3 list-none p-0 m-0'>
                        <FooterLink to="/home">Dashboard</FooterLink>
                        <FooterLink to="/my-predictions">My Predictions</FooterLink>
                        <FooterLink to="/leaderboard">Leaderboard</FooterLink>
                        <FooterLink to="/credits">App Credits</FooterLink>
                    </ul>
                </div>

                {/* Logo Section */}
                <div className='flex flex-col items-center justify-center gap-4'>
                    <div className='scale-125 opacity-50 hover:opacity-100 transition-opacity duration-500'>
                        <Logo />
                    </div>
                    <p className='text-[10px] text-gray-600 font-bold uppercase tracking-[0.3em] mt-4'>
                        Formula 1 Predictions © 2026
                    </p>
                </div>

                {/* Social Section */}
                <div className='flex flex-col items-center md:items-end'>
                    <h4 className='text-red-600 font-black uppercase tracking-widest text-xs mb-6'>Connect</h4>
                    <div className='flex gap-4'>
                        <SocialIcon icon="instagram" href="#" />
                        <SocialIcon icon="facebook" href="#" />
                        <SocialIcon icon="twitter" href="#" />
                        <SocialIcon icon="youtube" href="#" />
                    </div>
                </div>
            </div>
        </footer>
    );
}

function FooterLink({ to, children }) {
    return (
        <li>
            <NavLink
                to={to}
                className='text-gray-500 hover:text-white font-black italic uppercase tracking-tighter text-sm transition-colors duration-300 no-underline'
            >
                {children}
            </NavLink>
        </li>
    );
}

function SocialIcon({ icon, href }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className='w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-gray-400 hover:bg-red-600 hover:border-red-600 hover:text-white transition-all duration-300 transform hover:-translate-y-1'
        >
            <i className={`fa fa-${icon} text-lg`}></i>
        </a>
    );
}
