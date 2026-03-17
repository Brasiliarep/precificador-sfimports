import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// TODO: Substituir pelos dados do seu Console Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBDcD2X2cYc56fL6lDdrPU-wMWL3xRb02w",
  authDomain: "precificador-sfimports.firebaseapp.com",
  projectId: "precificador-sfimports",
  storageBucket: "precificador-sfimports.firebasestorage.app",
  messagingSenderId: "136938631461",
  appId: "1:136938631461:web:ca5abe1fccc91c19502acc",
  measurementId: "G-YPBMDL8F0W"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta os serviços para usar em todo o projeto
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;
