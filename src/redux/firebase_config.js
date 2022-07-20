import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import firebase from "firebase/compat/app"


const firebaseConfig = {
  apiKey: "AIzaSyCzDY0aSJXdh-vipPDtunDRKVt488PdEGY",
  authDomain: "f1-predictions-d2d36.firebaseapp.com",
  projectId: "f1-predictions-d2d36",
  storageBucket: "f1-predictions-d2d36.appspot.com",
  messagingSenderId: "738536484438",
  appId: "1:738536484438:web:cf1d53633bc486ea0d15f7",
  measurementId: "G-MBL71535FC"
};


export const app = firebase.initializeApp(firebaseConfig);
const analytics = getAnalytics(app);