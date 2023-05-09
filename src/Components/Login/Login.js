import classes from './Login.module.css';
import {useEffect, useState} from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../../redux/firebase_config';
import { signIn } from '../../redux/reducer';
import { useDispatch, useSelector } from 'react-redux';
import { setUser } from "../../redux/reducer";

export default function Login(){
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [token, setToken] = useState('');
    const dispatch = useDispatch();

    const user = useSelector((state) => state.user.user);


    const nav = useNavigate()

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
          if (user) {
            console.log(user);
            dispatch(setUser({ uid: user.uid, email: user.email }));
            nav("/home", { replace: true });
          }
        });
      
        return () => {
          unsubscribe();
        };
      }, [dispatch, nav]);

    async function handleLogin(email, password) {
        try {
          dispatch(signIn(email, password));
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

    return(
        <div className={classes.loginPage}>
            <div className={classes.login}>
                <h1>Login</h1>
                <input type="email" placeholder="Email" name="email" className={classes.input} onChange={onChangeEmail}/>
                <input type="password" placeholder="Password" name="password" className={classes.input} onChange={onChangePassword}/>
                <button type='submit' className={classes.button} onClick={handleLogin}>SIGN IN</button>
                <Link to={`/signup`} className={classes.registerBtn}>Register</Link>
            </div>
        </div>
    )
}