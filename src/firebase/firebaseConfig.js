// Importa las funciones que necesitas de los SDKs de Firebase
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDjKkkZgkofrcO-CrWTmpllWzmQr2jRg2Y",
  authDomain: "acuicultores-lago-de-atitlan.firebaseapp.com",
  projectId: "acuicultores-lago-de-atitlan",
  storageBucket: "acuicultores-lago-de-atitlan.appspot.com",
  messagingSenderId: "746589170615",
  appId: "1:746589170615:web:3947b44e60ebc46f57d632",
  measurementId: "G-RLRYBR0S7L"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);

// Inicializa los servicios que necesitas
const db = getFirestore(app);
const auth = getAuth(app);

// Exporta los servicios para usarlos en otros archivos
export { db, auth, RecaptchaVerifier, signInWithPhoneNumber };