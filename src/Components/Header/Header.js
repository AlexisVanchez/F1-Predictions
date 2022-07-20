import classes from './Header.module.css';

export default function Header(){
    return(
        <div className={classes.header}>
            <div className={classes.logoDiv}>
                <img className={classes.logo} 
                src={require('../../images/f1_logo.jpg')} 
                alt="f1 logo"
                width="120" height="40"
                />
            </div>
            <div className={classes.menu}>
                <h4>Home</h4>
                <h4>My Predictions</h4>
                <h4>Championship table</h4>
                <h4>Memes</h4>
                <h4>Credits</h4>
            </div>
            <div className={classes.inputDiv}>
                <input className={classes.input} type="search" />
                {/* выпадающий список */}
            </div>
        </div>
    )
}