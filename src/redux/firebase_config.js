import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/analytics";


const firebaseConfig = {
  apiKey: "AIzaSyCzDY0aSJXdh-vipPDtunDRKVt488PdEGY",
  authDomain: "f1-predictions-d2d36.firebaseapp.com",
  projectId: "f1-predictions-d2d36",
  storageBucket: "f1-predictions-d2d36.appspot.com",
  messagingSenderId: "738536484438",
  appId: "1:738536484438:web:cf1d53633bc486ea0d15f7",
  measurementId: "G-MBL71535FC"
};

const app = firebase.initializeApp(firebaseConfig);
const analytics = firebase.analytics(app);
const auth = firebase.auth();
const firestore = firebase.firestore();

export { app, auth, firestore, analytics };
