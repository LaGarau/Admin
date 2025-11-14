// /lib/firebase.js

import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBA3jIanOQD9gD9JKXkfuH761ZXj69-ly8",
  authDomain: "ghumante-yuwa-demo.firebaseapp.com",
  databaseURL:
    "https://ghumante-yuwa-demo-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ghumante-yuwa-demo",
  storageBucket: "ghumante-yuwa-demo.firebasestorage.app",
  messagingSenderId: "611741769691",
  appId: "1:611741769691:web:d9b9f371518819fbb211fe",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

//  Initialize Realtime Database
export const realtimeDb = getDatabase(app);

// Optional export
export default app;
