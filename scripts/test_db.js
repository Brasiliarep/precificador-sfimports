import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBDcD2X2cYc56fL6lDdrPU-wMWL3xRb02w",
  authDomain: "precificador-sfimports.firebaseapp.com",
  projectId: "precificador-sfimports",
  storageBucket: "precificador-sfimports.firebasestorage.app",
  messagingSenderId: "136938631461",
  appId: "1:136938631461:web:ca5abe1fccc91c19502acc"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
  console.log("Testing Firestore write...");
  try {
    await setDoc(doc(db, "test", "ping"), { 
        time: new Date().toISOString(),
        message: "Hello from Antigravity"
    });
    console.log("✅ Success! Firestore is working.");
  } catch (err) {
    console.error("❌ Firestore Test Failed:", err);
  }
  process.exit(0);
}

test();
