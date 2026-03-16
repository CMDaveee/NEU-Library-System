// Import Firebase using CDN
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDXPogTjT887ALz5TOxsv3wBBKhUF454fY",
    authDomain: "neu-library-d51ca.firebaseapp.com",
    projectId: "neu-library-d51ca",
    storageBucket: "neu-library-d51ca.firebasestorage.app",
    messagingSenderId: "529985649264",
    appId: "1:529985649264:web:f5a3e841adb2efefe192b5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
console.log("Firebase initialized successfully!");

export default app;