// src/services/expensesService.js
import { db } from '../firebase/firebaseConfig.js'; // Asegúrate de tener configurado Firebase
import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';


export const getExpenses = async () => {
  try {
    // Primero obtenemos los miembros activos para mapear IDs a nombres
    const membersQuery = query(collection(db, 'miembros'), where('activo', '==', true));
    const membersSnapshot = await getDocs(membersQuery);
    const membersMap = {};
    membersSnapshot.forEach(doc => {
      membersMap[doc.id] = doc.data().nombre;
    });

    // Luego obtenemos los gastos
    const expensesQuery = query(collection(db, 'expenses'));
    const expensesSnapshot = await getDocs(expensesQuery);
    
    return expensesSnapshot.docs.map(doc => {
      const expenseData = doc.data();
      return {
        id: doc.id,
        ...expenseData,
        fecha: expenseData.fecha?.toDate() || new Date(),
        aprobadoPor: expenseData.aprobadoPor.map(id => membersMap[id] || id) // Convertir IDs a nombres
      };
    });
  } catch (error) {
    console.error('Error getting expenses:', error);
    throw error;
  }
};

export const addExpense = async (expenseData) => {
  try {
    const docRef = await addDoc(collection(db, 'expenses'), {
      ...expenseData,
      fecha: serverTimestamp(), // Firebase usa la hora del servidor (GMT)
      createdAt: serverTimestamp(),
    });
    
    return {
      id: docRef.id,
      ...expenseData,
      fecha: new Date(), // Usamos la fecha local como aproximación
    };
  } catch (error) {
    console.error('Error adding expense:', error);
    throw error;
  }
};