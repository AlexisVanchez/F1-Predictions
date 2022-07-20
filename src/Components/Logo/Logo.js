import classes from './Logo.module.css'

export default function Logo(){
    return(
        <div className={classes.logoDiv}>
                <img className={classes.logo} 
                src={require('../../images/f1_logo.jpg')} 
                alt="f1 logo"
                width="120" height="40"
                />
            </div>
    )
}