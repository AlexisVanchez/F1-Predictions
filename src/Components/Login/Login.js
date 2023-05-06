import classes from './Login.module.css';
import {useEffect, useState} from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../../redux/firebase_config';

export default function Login(){
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [token, setToken] = useState('');

    const nav = useNavigate()

    async function handleLogin(email, password) {
        try {
          await auth.signInWithEmailAndPassword(email, password);
          nav("/home", { replace: true });
        } catch (error) {
          console.error("Error during login:", error.message);
          alert("Invalid email or password");
        }
      }

    function onChangeEmail(e){
        setEmail(e.target.value)
    }

    function onChangePassword(e){
        setPassword(e.target.value)
    }


    function onSubmit(e){
        e.preventDefault()
        handleLogin(email, password)
    }


    return(
        <div className={classes.loginPage}>
            <div className={classes.login}>
                <h1>Login</h1>
                <input type="email" placeholder="Email" name="email" className={classes.input} onChange={onChangeEmail}/>
                <input type="password" placeholder="Password" name="password" className={classes.input} onChange={onChangePassword}/>
                <button type='submit' className={classes.button} onClick={onSubmit}>SIGN IN</button>
                <Link to={`/signup`} className={classes.registerBtn}>Register</Link>
            </div>
        </div>
    )
}