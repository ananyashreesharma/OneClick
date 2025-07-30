// firebase setup - think of this as connecting your app to google's cloud services
// this file is like the phone book that tells your app where to find firebase services

import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// your firebase project settings - like your home address for the cloud
// you'll get these from your firebase console when you create a project
const firebaseConfig = {
  apiKey: "your-api-key",                    // like a password to access your firebase project
  authDomain: "your-project.firebaseapp.com", // where users can sign in
  projectId: "your-project-id",              // your project's unique name
  storageBucket: "your-project.appspot.com", // where files like images are stored
  messagingSenderId: "your-messaging-sender-id", // for sending notifications
  appId: "your-app-id"                       // your app's unique identifier
};

// start up firebase - like turning on the lights in your house
const app = initializeApp(firebaseConfig);

// set up user authentication - handles login signup password reset
// think of this as the security guard for your app
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage) // keeps users logged in even after closing app
});

// set up the database - where all your notes will be stored
// like a digital filing cabinet that syncs across all devices
const db = getFirestore(app);

// set up file storage - for storing images audio files etc
// like a digital attic where you can store bigger files
const storage = getStorage(app);

// export everything so other parts of your app can use them
export { auth, db, storage };
export default app; 