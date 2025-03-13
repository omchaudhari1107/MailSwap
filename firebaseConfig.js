import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
//can be generated from google-services.json
const firebaseConfig = {
  apiKey: "AIzaSyB6OWtghkEoeI-y3ZKwFMt6VBoAIhEM9Nw",
  authDomain: "mailswap-6ebd0.firebaseapp.com",
  projectId: "mailswap-6ebd0",
  storageBucket: "mailswap-6ebd0.firebasestorage.app",
  messagingSenderId: "436082064915",
  appId: "1:436082064915:android:3cf0af6c7868e8b56849e6",
  clientId: "436082064915-fpoufmvfelkh80eiig1l1n36vgg0r7is.apps.googleusercontent.com"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);