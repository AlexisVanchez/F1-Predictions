import classes from './Signup.module.css';
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import {useEffect, useState} from 'react';
import { useNavigate } from 'react-router-dom';

export default function Signup(props){

    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [password2, setPassword2] = useState('')
    const [error, setError] = useState('')

    const nav = useNavigate();
    const auth = getAuth();


    const register = async (e) => {
        e.preventDefault();
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const user = userCredential.user;
          console.log('User registered:', user);
          if(name.length > 0 && email.length > 0){
            nav('/', {replace : true})
          }
          // Optionally, create a new user document in the 'users' collection with additional information
        } catch (error) {
          setError(error.message);
          console.error('Error registering user:', error);
        }
      };

    function onChangeName(e){
        setName(e.target.value)
    }

    function onChangeEmail(e){
        setEmail(e.target.value)
    }

    function onChangePassword(e){
        setPassword(e.target.value)
    }

    function onChangePassword2(e){
        setPassword2(e.target.value)
    }

    return(
        <div className={classes.signupPage}>
            <div className={classes.signup}>
                <input type="text" placeholder='name' onChange={onChangeName}/>
                <input type="email" placeholder='email' onChange={onChangeEmail}/>
                <input type="password" placeholder='password' onChange={onChangePassword}/>
                <input type="password" placeholder='retype password' onChange={onChangePassword2}/>
                <button type='submit' className={classes.btn} onClick={register}></button>
            </div>
        </div>
    )
}