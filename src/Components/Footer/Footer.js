import Logo from '../Logo/Logo'
import classes from './Footer.module.css'

export default function Footer(){
    return(
        <div className={classes.footer}>
            <div className={classes.menu}>
                <ul className={classes.list}>
                    <li>Home</li>
                    <li>My Predictions</li>
                    <li>Championship leaderboard</li>
                    <li>Memes</li>
                    <li>Credits</li>
                </ul>
            </div>
            <Logo/>
            <div className={classes.media}>
                <div className={`${classes.instagram} ${classes.social}`}>
                    <a href="#" target="_blank"><i className="fa fa-instagram fa-2x"></i></a>
                </div>
                <div className={`${classes.facebook} ${classes.social}`}>
                    <a href="#" target="_blank"><i className="fa fa-facebook fa-2x"></i></a>  
                </div>
                <div className={`${classes.linkedin} ${classes.social}`}>
                    <a href="#" target="_blank"><i className="fa fa-linkedin fa-2x"></i></a>  
                </div>
            </div>
        </div>
    )
}