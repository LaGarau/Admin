import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database"; // for Realtime Database



// const firebaseConfig = {
//   apiKey: "AIzaSyAU2Gn7M7mnA7s4t7IUmnNYwaMXPGp48pQ",
//   authDomain: "realdb-6d53c.firebaseapp.com",
//   databaseURL: "https://realdb-6d53c-default-rtdb.firebaseio.com",
//   projectId: "realdb-6d53c",
//   storageBucket: "realdb-6d53c.firebasestorage.app",
//   messagingSenderId: "625759197955",
//   appId: "1:625759197955:web:b9be49b8c9c84dda03a736"
// };


// const app = initializeApp(firebaseConfig);
// export const db = getDatabase(app); // export the database instance





// Import the functions you need from the SDKs you need
// import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app); // export the database instance
