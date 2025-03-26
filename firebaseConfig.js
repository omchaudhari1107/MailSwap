import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA74rycHr6XQV_I3DiofrAO2Nymcs08-pA",
  authDomain: "mailswap-dd0cd.firebaseapp.com",
  projectId: "mailswap-dd0cd",
  storageBucket: "mailswap-dd0cd.firebasestorage.app",
  messagingSenderId: "798624486063",
  appId: "1:798624486063:android:760ba77dad2c724f64fa5a",
};

// Initialize Firebase app
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth with AsyncStorage persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});