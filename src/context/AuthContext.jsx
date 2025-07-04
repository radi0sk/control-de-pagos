// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore'; // Importa Firestore funciones
import { auth, db } from '../firebase/firebaseConfig.js'; // Asegúrate de exportar 'db' desde firebaseConfig.js

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // --- Lógica para guardar/actualizar perfil en Firestore ---
        const userRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userRef);

        if (!docSnap.exists()) {
          // Si el usuario no tiene un perfil, lo creamos
          await setDoc(userRef, {
            uid: user.uid,
            phoneNumber: user.phoneNumber,
            // Puedes añadir más campos por defecto aquí
            createdAt: new Date(),
            displayName: user.displayName || `Usuario ${user.phoneNumber}`, // Fallback si no hay displayName
          }, { merge: true }); // Usar merge: true para no sobrescribir si ya existe, aunque aquí es nuevo
        } else {
          // Si el perfil ya existe, puedes actualizarlo si es necesario
          // Por ejemplo, para asegurar que displayName esté actualizado
          if (user.displayName && docSnap.data().displayName !== user.displayName) {
             await setDoc(userRef, { displayName: user.displayName }, { merge: true });
          }
        }
        // Firebase Auth con teléfono no tiene displayName por defecto.
        // Si quieres un displayName, deberás establecerlo manualmente en Firebase Auth
        // o generarlo a partir del número de teléfono como se hizo arriba.
        // Ejemplo de cómo podrías establecerlo si tuvieras un formulario de registro inicial:
        // if (!user.displayName && someInitialName) {
        //    await updateProfile(user, { displayName: someInitialName });
        // }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    logout: () => signOut(auth),
    
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}