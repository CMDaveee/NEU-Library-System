// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth }       from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore }  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyDXPogTjT887AlZ5TOxsv3wBBKhUF454fY",
  authDomain:        "neu-library-d51ca.firebaseapp.com",
  projectId:         "neu-library-d51ca",
  storageBucket:     "neu-library-d51ca.firebasestorage.app",
  messagingSenderId: "529985649264",
  appId:             "1:529985649264:web:f5a3e841adb2efefe192b5"
};

const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
export default app;
