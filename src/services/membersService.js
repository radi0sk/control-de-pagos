import { db } from '../firebase/firebaseConfig.js';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';

const membersRef = collection(db, 'miembros');

export const addMember = async (memberData) => {
  try {
    const docRef = await addDoc(membersRef, memberData);
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getMembers = async () => {
  try {
    const snapshot = await getDocs(membersRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting members:", error);
    return [];
  }
};

export const updateMember = async (id, updatedData) => {
  try {
    await updateDoc(doc(db, 'miembros', id), updatedData);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const deleteMember = async (id) => {
  try {
    await deleteDoc(doc(db, 'miembros', id));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};