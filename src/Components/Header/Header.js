import Logo from '../Logo/Logo';
import classes from './Header.module.css';
import { NavLink } from 'react-router-dom';

export default function Header(){
    return(
        <div className={classes.header}>
            <Logo/>
            <div className={classes.menu}>
                <NavLink to="/home" className={({ isActive }) =>(isActive ? classes.active : classes.link)}>Home</NavLink>
                <NavLink to="/my-predictions" className={({ isActive }) =>(isActive ? classes.active : classes.link)}>My Predictions</NavLink>
                <NavLink to="/championship" className={({ isActive }) =>(isActive ? classes.active : classes.link)}>Championship leaderboard</NavLink>
                <NavLink to="/memes" className={({ isActive }) =>(isActive ? classes.active : classes.link)}>Memes</NavLink>
                <NavLink to="/credits" className={({ isActive }) =>(isActive ? classes.active : classes.link)}>Credits</NavLink>
            </div>
            <div className={classes.inputDiv}>
                <input className={classes.input} type="search" />
                {/* выпадающий список */}
            </div>
        </div>
    )
}