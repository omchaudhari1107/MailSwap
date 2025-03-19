import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
//can be generated from google-services.json
const firebaseConfig = {
  apiKey: "AIzaSyA74rycHr6XQV_I3DiofrAO2Nymcs08-pA",
  authDomain: "mailswap-dd0cd.firebaseapp.com",
  projectId: "mailswap-dd0cd",
  storageBucket: "mailswap-dd0cd.firebasestorage.app",
  messagingSenderId: "798624486063",
  appId: "1:798624486063:android:760ba77dad2c724f64fa5a",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);