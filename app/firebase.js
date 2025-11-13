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
  apiKey: "AIzaSyBA3jIanOQD9gD9JKXkfuH761ZXj69-ly8",
  authDomain: "ghumante-yuwa-demo.firebaseapp.com",
  databaseURL: "https://ghumante-yuwa-demo-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ghumante-yuwa-demo",
  storageBucket: "ghumante-yuwa-demo.firebasestorage.app",
  messagingSenderId: "611741769691",
  appId: "1:611741769691:web:d9b9f371518819fbb211fe"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app); // export the database instance