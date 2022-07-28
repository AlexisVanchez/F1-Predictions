import classes from './Login.module.css';
import {useEffect, useState} from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login(){
    const [email, setEmail] = useState([]);
    const [password, setPassword] = useState([]);
    const [token, setToken] = useState([]);

    const nav = useNavigate()

    function auth(email, password) {
        const apiKey = 'AIzaSyCzDY0aSJXdh-vipPDtunDRKVt488PdEGY'
        fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
            method: 'POST',
            body: JSON.stringify({
                email, password, returnSecureToken: true
            }),
            headers: { 
                'Content-Type': 'application/json' 
            },
        })
        .then(response => response.json())
        .then(data =>{
            setToken(data.idToken)
            if(data.idToken === undefined || data.idToken === 0){
                alert('Invalid email or password')
            }
            else{
                nav('/home', {replace : true})
            }
        })
    }

    function onChangeEmail(e){
        setEmail(e.target.value)
    }

    function onChangePassword(e){
        setPassword(e.target.value)
    }


    function onSubmit(e){
        e.preventDefault()
        auth(email, password)
    }


    return(
        <div className={classes.loginPage}>
            <div className={classes.login}>
                <h1>Login</h1>
                <input type="email" placeholder="Name" name="name" className={classes.input} onChange={onChangeEmail}/>
                <input type="password" placeholder="Password" name="password" className={classes.input} onChange={onChangePassword}/>
                <button type='submit' className={classes.button} onClick={onSubmit}>SIGN IN</button>
            </div>
        </div>
    )
}