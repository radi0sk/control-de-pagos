// Import required Firebase modules
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDjKkkZgkofrcO-CrWTmpllWzmQr2jRg2Y",
  authDomain: "acuicultores-lago-de-atitlan.firebaseapp.com",
  projectId: "acuicultores-lago-de-atitlan",
  storageBucket: "acuicultores-lago-de-atitlan.appspot.com",
  messagingSenderId: "746589170615",
  appId: "1:746589170615:web:3947b44e60ebc46f57d632",
  measurementId: "G-RLRYBR0S7L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Member data including jaulas (fish cages) information
const miembros = [
  { nombre: "Juan Sososf", jaulas: 79 },
  { nombre: "Antonio Sosof", jaulas: 34 },
  { nombre: "Jose Sojuel Pablo", jaulas: 10 },
  { nombre: "Nicolas Tzina", jaulas: 24 },
  { nombre: "Diego Tzina", jaulas: 22 },
  { nombre: "Diego Chiquival", jaulas: 20 },
  { nombre: "Andres Ramirez", jaulas: 16 },
  { nombre: "Nicolas Chiquival", jaulas: 12 },
  { nombre: "Gaspar Reanda Quieju", jaulas: 8 },
  { nombre: "Nicolas Yatas", jaulas: 5 },
  { nombre: "Salvador Sojuel", jaulas: 34 }
];

// Financial contributions data
const aportaciones = [
  // A. Primera Aportación - Gastos Varios
  { concepto: "Primera Aportación - Gastos Varios", miembros: [
    { nombre: "Salvador Sojuel", cuota: 500, pagado: 500, pendiente: 0, estado: "Completo" },
    { nombre: "Nicolas Tzina", cuota: 500, pagado: 500, pendiente: 0, estado: "Completo" },
    { nombre: "Diego Tzina", cuota: 500, pagado: 500, pendiente: 0, estado: "Completo" },
    { nombre: "Nicolas Yatas", cuota: 500, pagado: 500, pendiente: 0, estado: "Completo" },
    { nombre: "Juan Sososf", cuota: 500, pagado: 500, pendiente: 0, estado: "Completo" },
    { nombre: "Antonio Sosof", cuota: 500, pagado: 500, pendiente: 0, estado: "Completo" },
    { nombre: "Andres Ramirez", cuota: 500, pagado: 500, pendiente: 0, estado: "Completo" },
    { nombre: "Diego Chiquival", cuota: 500, pagado: 500, pendiente: 0, estado: "Completo" },
    { nombre: "Gaspar Reanda Quieju", cuota: 500, pagado: 500, pendiente: 0, estado: "Completo" },
    { nombre: "Jose Sojuel Pablo", cuota: 500, pagado: 500, pendiente: 0, estado: "Completo" },
    { nombre: "Nicolas Chiquival", cuota: 500, pagado: 500, pendiente: 0, estado: "💙 Pagado (Deuda comida)" }
  ]},
  
  // B. Lic. Francisco
  { concepto: "Lic. Francisco", miembros: [
    { nombre: "Salvador Sojuel", total: 1650, pagado: 1650, pendiente: 0, detalle: "✅ Completo" },
    { nombre: "Nicolas Tzina", total: 1350, pagado: 1350, pendiente: 0, detalle: "✅ Completo" },
    { nombre: "Diego Tzina", total: 1350, pagado: 1350, pendiente: 0, detalle: "✅ Completo" },
    { nombre: "Nicolas Yatas", total: 1050, pagado: 1050, pendiente: 0, detalle: "✅ Completo" },
    { nombre: "Juan Sososf", total: 1650, pagado: 1650, pendiente: 0, detalle: "✅ Completo" },
    { nombre: "Antonio Sosof", total: 1650, pagado: 1650, pendiente: 0, detalle: "✅ Completo" },
    { nombre: "Andres Ramirez", total: 1350, pagado: 1350, pendiente: 0, detalle: "✅ Completo" },
    { nombre: "Diego Chiquival", total: 1350, pagado: 1350, pendiente: 0, detalle: "✅ Completo" },
    { nombre: "Gaspar Reanda Quieju", total: 1050, pagado: 1050, pendiente: 0, detalle: "✅ Completo" },
    { nombre: "Jose Sojuel Pablo", total: 1350, pagado: 1350, pendiente: 0, detalle: "✅ Completo" },
    { nombre: "Nicolas Chiquival", total: 1350, pagado: 1350, pendiente: 0, detalle: "💙 Pagado (Deuda comida)" }
  ]},
  
  // C. Ingeniero - Instrumento Ambiental
  { concepto: "Ingeniero - Instrumento Ambiental", miembros: [
    { nombre: "Salvador Sojuel", total: 1650, pagado: 800, pendiente: 850, detalle: "⚠️ Parcial" },
    { nombre: "Nicolas Tzina", total: 1350, pagado: 800, pendiente: 550, detalle: "⚠️ Parcial" },
    { nombre: "Diego Tzina", total: 1350, pagado: 1350, pendiente: 0, detalle: "✅ Completo" },
    { nombre: "Nicolas Yatas", total: 1050, pagado: 550, pendiente: 500, detalle: "⚠️ Parcial" },
    { nombre: "Juan Sososf", total: 1650, pagado: 1600, pendiente: 50, detalle: "⚠️ Parcial" },
    { nombre: "Antonio Sosof", total: 1650, pagado: 1650, pendiente: 0, detalle: "✅ Completo" },
    { nombre: "Andres Ramirez", total: 1350, pagado: 750, pendiente: 600, detalle: "⚠️ Parcial" },
    { nombre: "Diego Chiquival", total: 1350, pagado: 600, pendiente: 750, detalle: "⚠️ Parcial" },
    { nombre: "Gaspar Reanda Quieju", total: 1050, pagado: 500, pendiente: 550, detalle: "⚠️ Parcial" },
    { nombre: "Jose Sojuel Pablo", total: 1350, pagado: 800, pendiente: 550, detalle: "⚠️ Parcial" },
    { nombre: "Nicolas Chiquival", total: 1350, pagado: 0, pendiente: 1350, detalle: "💙 Pagado (Deuda comida)" }
  ]},
  
  // D. Buzo
  { concepto: "Buzo", miembros: [
    { nombre: "Salvador Sojuel", cuota: 500, pagado: 500, pendiente: 0, estado: "✅Completo" },
    { nombre: "Nicolas Tzina", cuota: 500, pagado: 500, pendiente: 0, estado: "✅Completo" },
    { nombre: "Diego Tzina", cuota: 500, pagado: 500, pendiente: 0, estado: "✅Completo" },
    { nombre: "Nicolas Yatas", cuota: 500, pagado: 500, pendiente: 0, estado: "✅Completo" },
    { nombre: "Juan Sososf", cuota: 500, pagado: 500, pendiente: 0, estado: "✅Completo" },
    { nombre: "Antonio Sosof", cuota: 500, pagado: 500, pendiente: 0, estado: "✅Completo" },
    { nombre: "Andres Ramirez", cuota: 500, pagado: 0, pendiente: 500, estado: "❌ Pendiente" },
    { nombre: "Diego Chiquival", cuota: 500, pagado: 300, pendiente: 200, estado: "⚠️ Parcial" },
    { nombre: "Gaspar Reanda Quieju", cuota: 500, pagado: 500, pendiente: 0, estado: "✅Completo" },
    { nombre: "Jose Sojuel Pablo", cuota: 500, pagado: 500, pendiente: 0, estado: "✅Completo" },
    { nombre: "Nicolas Chiquival", cuota: 500, pagado: 0, pendiente: 500, estado: "❌ Pendiente" }
  ]},
  
  // E. Recaudación Luqueño
  { concepto: "Recaudación Luqueño", miembros: [
    { nombre: "Salvador Sojuel", cuota: 150, pagado: 150, pendiente: 0, estado: "✅ Pagado completo" },
    { nombre: "Nicolas Tzina", cuota: 150, pagado: 150, pendiente: 0, estado: "✅ Pagado completo" },
    { nombre: "Diego Tzina", cuota: 150, pagado: 150, pendiente: 0, estado: "✅ Pagado completo" },
    { nombre: "Nicolas Yatas", cuota: 150, pagado: 150, pendiente: 0, estado: "✅ Pagado completo" },
    { nombre: "Juan Sososf", cuota:150, pagado: 150, pendiente: 0, estado: "✅ Pagado completo" },
    { nombre: "Antonio Sosof", cuota: 150, pagado: 150, pendiente: 0, estado: "✅ Pagado completo" },
    { nombre: "Andres Ramirez", cuota: 150, pagado: 150, pendiente: 0, estado: "✅ Pagado completo" },
    { nombre: "Diego Chiquival", cuota: 150, pagado: 150, pendiente: 0, estado: "✅ Pagado completo" },
    { nombre: "Gaspar Reanda Quieju", cuota: 150, pagado: 150, pendiente: 0, estado: "✅ Pagado completo" },
    { nombre: "Jose Sojuel Pablo", cuota: 150, pagado: 150, pendiente: 0, estado: "✅ Pagado completo" },
    { nombre: "Nicolas Chiquival", cuota: 150, pagado: 150, pendiente: 0, estado: "✅ Pagado completo" }
  ]},
  
  // F. Coloma Lic. Problema 22 Abril
  { concepto: "Coloma Lic. Problema 22 Abril", miembros: [
    { nombre: "Salvador Sojuel", cuota: 300, pagado: 0, pendiente: 3000, estado: "❌ Pendiente" },
    { nombre: "Nicolas Tzina", cuota: 300, pagado: 300, pendiente: 0, estado: "✅ Completo" },
    { nombre: "Diego Tzina", cuota: 300, pagado: 300, pendiente: 0, estado: "✅ Completo" },
    { nombre: "Nicolas Yatas", cuota: 300, pagado: 300, pendiente: 0, estado: "✅ Completo" },
    { nombre: "Juan Sososf", cuota: 300, pagado: 300, pendiente: 0, estado: "✅ Completo" },
    { nombre: "Antonio Sosof", cuota: 300, pagado: 300, pendiente: 0, estado: "✅ Completo" },
    { nombre: "Andres Ramirez", cuota: 300, pagado: 300, pendiente: 0, estado: "✅ Completoe" },
    { nombre: "Diego Chiquival", cuota: 300, pagado: 300, pendiente: 0, estado: "✅ Completo" },
    { nombre: "Gaspar Reanda Quieju", cuota: 300, pagado: 300, pendiente: 0, estado: "✅ Completo" },
    { nombre: "Jose Sojuel Pablo", cuota: 300, pagado: 300, pendiente: 0, estado: "✅ Completo" },
    { nombre: "Nicolas Chiquival", cuota: 300, pagado: 300, pendiente: 0, estado: "✅ Completoe" }
  ]},
  
  // G. Recaudación Lic. Mario 1era Asesoría
  { concepto: "Recaudación Lic. Mario 1era Asesoría", miembros: [
    { nombre: "Salvador Sojuel", cuota: 350, pagado: 350, pendiente: 0, estado: "✅Completo" },
    { nombre: "Nicolas Tzina", cuota: 350, pagado: 350, pendiente: 0, estado: "✅Completo" },
    { nombre: "Diego Tzina", cuota: 350, pagado: 350, pendiente: 0, estado: "✅Completo" },
    { nombre: "Nicolas Yatas", cuota: 350, pagado: 350, pendiente: 0, estado: "✅Completo" },
    { nombre: "Juan Sososf", cuota: 350, pagado: 350, pendiente: 0, estado: "✅Completo" },
    { nombre: "Antonio Sosof", cuota: 350, pagado: 350, pendiente: 0, estado: "✅Completo" },
    { nombre: "Andres Ramirez", cuota: 350, pagado: 0, pendiente: 350, estado: "❌Pendiente" },
    { nombre: "Diego Chiquival", cuota: 350, pagado: 350, pendiente: 0, estado: "✅Completo" },
    { nombre: "Gaspar Reanda Quieju", cuota: 350, pagado: 350, pendiente: 0, estado: "✅Completo" },
    { nombre: "Jose Sojuel Pablo", cuota: 350, pagado: 350, pendiente: 0, estado: "✅Completo" },
    { nombre: "Nicolas Chiquival", cuota: 350, pagado: 0, pendiente: 350, estado: "❌Pendiente" }
  ]},
  
  // H. Lic. Mario Amparo
  { concepto: "Lic. Mario Amparo", miembros: [
    { nombre: "Salvador Sojuel", total: 9550.56, pagado: 9550.56, pendiente: 0, detalle: "✅ Completo" },
    { nombre: "Nicolas Tzina", total: 6741.57, pagado: 6741.57, pendiente: 0, detalle: "✅ Completo" },
    { nombre: "Diego Tzina", total: 6179.78, pagado: 6179.78, pendiente: 0, detalle: "✅ Completo" },
    { nombre: "Nicolas Yatas", total: 1404.49, pagado: 1404.49, pendiente: 0, detalle: "✅ Completo" },
    { nombre: "Juan Sososf", total: 22471.91, pagado: 22471.91, pendiente: 0, detalle: "✅ Completo" },
    { nombre: "Antonio Sosof", total: 9550.56, pagado: 9540.56, pendiente: 10, detalle: "⚠️ Parcial" },
    { nombre: "Andres Ramirez", total: 4494.38, pagado: 4494.38, pendiente: 0, detalle: "✅ Completo" },
    { nombre: "Diego Chiquival", total: 5617.98, pagado: 5617.98, pendiente: 0, detalle: "✅ Completo" },
    { nombre: "Gaspar Reanda Quieju", total: 2247.19, pagado: 2247.19, pendiente: 0, detalle: "✅ Completo" },
    { nombre: "Jose Sojuel Pablo", total: 3932.58, pagado: 3900, pendiente: 32.58, detalle: "⚠️ Parcial" },
    { nombre: "Nicolas Chiquival", total: 2808.99, pagado: 2808.99, pendiente: 0, detalle: "💙 Pagado (Deuda comida)" }
  ]},
  
  // I. Lic. Mario Penal
  { concepto: "Lic. Mario Penal", miembros: [
    { nombre: "Salvador Sojuel", total: 8435.06, pagado: 4217.53, pendiente: 4217.53, detalle: "4217.53/0/0" },
    { nombre: "Nicolas Tzina", total: 5954.16, pagado: 2977.08, pendiente: 2977.08, detalle: "2977.08/0/0" },
    { nombre: "Diego Tzina", total: 5457.98, pagado: 2728.99, pendiente: 2728.99, detalle: "2728.99/0/0" },
    { nombre: "Nicolas Yatas", total: 1240.45, pagado: 620.23, pendiente: 620.22, detalle: "620.23/0/0" },
    { nombre: "Juan Sososf", total: 19599.11, pagado: 9799.56, pendiente: 9799.55, detalle: "9799.56/0/0" },
    { nombre: "Antonio Sosof", total: 8435.06, pagado: 4217.53, pendiente: 4217.53, detalle: "4217.53/0/0" },
    { nombre: "Andres Ramirez", total: 3969.44, pagado: 1984.72, pendiente: 1984.72, detalle: "1984.72/0/0" },
    { nombre: "Diego Chiquival", total: 4961.80, pagado: 2480.90, pendiente: 2480.90, detalle: "2480.90/0/0" },
    { nombre: "Gaspar Reanda Quieju", total: 1984.72, pagado: 992.36, pendiente: 992.36, detalle: "992.36/0/0" },
    { nombre: "Jose Sojuel Pablo", total: 2480.90, pagado: 1240.45, pendiente: 1240.45, detalle: "1240.45/0/0" },
    { nombre: "Nicolas Chiquival", total: 2480.90, pagado: 0, pendiente: 2480.90, detalle: "0/0/0" }
  ]}
];

// Expenses data
const gastos = [
  // Gastos Operativos y Administrativos
  { 
    fecha: "23/03/2024", 
    concepto: "Toma de foto", 
    pagado: 1233, 
    pendiente: 0, 
    total: 1233, 
    categoria: "Operativos", 
    estado: "Pagado" 
  },
  { 
    fecha: "26/03/2024", 
    concepto: "Refacción", 
    pagado: 88, 
    pendiente: 0, 
    total: 88, 
    categoria: "Operativos", 
    estado: "Pagado" 
  },
  { 
    fecha: "04/05/2024", 
    concepto: "Almuerzo", 
    pagado: 881, 
    pendiente: 0, 
    total: 881, 
    categoria: "Operativos", 
    estado: "Pagado" 
  },
  { 
    fecha: "16/04/2024", 
    concepto: "Almuerzo", 
    pagado: 840, 
    pendiente: 0, 
    total: 840, 
    categoria: "Operativos", 
    estado: "Pagado" 
  },
  { 
    fecha: "17/04/2024", 
    concepto: "Refacción", 
    pagado: 250, 
    pendiente: 0, 
    total: 250, 
    categoria: "Operativos", 
    estado: "Pagado" 
  },
  { 
    fecha: "07/02/2024", 
    concepto: "Refacción", 
    pagado: 450, 
    pendiente: 0, 
    total: 450, 
    categoria: "Operativos", 
    estado: "Pagado" 
  },
  { 
    fecha: "09/07/2024", 
    concepto: "Viaje a AMSCLAE", 
    pagado: 655, 
    pendiente: 0, 
    total: 655, 
    categoria: "Operativos", 
    estado: "Pagado" 
  },
  { 
    fecha: null, 
    concepto: "Deuda de comida con Nicolás", 
    pagado: 4474, 
    pendiente: 0, 
    total: 4474, 
    categoria: "Operativos", 
    estado: "Pagado" 
  },
  
  // Honorarios Profesionales
  { 
    fecha: null, 
    concepto: "Lic. Francisco Asociación", 
    pagado: 5500, 
    pendiente: 0, 
    total: 5500, 
    categoria: "Honorarios", 
    estado: "Pagado" 
  },
  { 
    fecha: null, 
    concepto: "Lic. Francisco Asociación (2da parte)", 
    pagado: 3000, 
    pendiente: 0, 
    total: 3000, 
    categoria: "Honorarios", 
    estado: "Pagado" 
  },
  { 
    fecha: null, 
    concepto: "Lic. Francisco Asociación (final)", 
    pagado: 3000, 
    pendiente: 0, 
    total: 3000, 
    categoria: "Honorarios", 
    estado: "Pagado" 
  },
  { 
    fecha: null, 
    concepto: "Ingeniero Instrumento Ambiental", 
    pagado: 7000, 
    pendiente: 0, 
    total: 7000, 
    categoria: "Honorarios", 
    estado: "Pagado" 
  },
  { 
    fecha: null, 
    concepto: "Pago de buzo", 
    pagado: 2500, 
    pendiente: 0, 
    total: 2500, 
    categoria: "Honorarios", 
    estado: "Pagado" 
  },
  { 
    fecha: null, 
    concepto: "Coloma y Lic. Visita", 
    pagado: 1500, 
    pendiente: 0, 
    total: 1500, 
    categoria: "Honorarios", 
    estado: "Pagado" 
  },
  { 
    fecha: null, 
    concepto: "Almuerzo en San Lucas (reunión)", 
    pagado: 600, 
    pendiente: 0, 
    total: 600, 
    categoria: "Honorarios", 
    estado: "Pagado" 
  },
  { 
    fecha: null, 
    concepto: "Gasto de memorial con gobierno", 
    pagado: 225, 
    pendiente: 0, 
    total: 225, 
    categoria: "Honorarios", 
    estado: "Pagado" 
  },
  { 
    fecha: null, 
    concepto: "Coloma Lic. Problema 22 abril", 
    pagado: 2500, 
    pendiente: 0, 
    total: 2500, 
    categoria: "Honorarios", 
    estado: "Pagado" 
  },
  { 
    fecha: null, 
    concepto: "Coloma Lic. Problema 22 abril (comida)", 
    pagado: 428, 
    pendiente: 0, 
    total: 428, 
    categoria: "Honorarios", 
    estado: "Pagado" 
  },
  { 
    fecha: null, 
    concepto: "Coloma servicio", 
    pagado: 2500, 
    pendiente: 2500, 
    total: 5000, 
    categoria: "Honorarios", 
    estado: "Parcial" 
  },
  { 
    fecha: null, 
    concepto: "Recaudación Lic. Mario 1era asesoría", 
    pagado: 3500, 
    pendiente: 0, 
    total: 3500, 
    categoria: "Honorarios", 
    estado: "Pagado" 
  },
  { 
    fecha: null, 
    concepto: "Lic. Mario Amparo", 
    pagado: 70000, 
    pendiente: 0, 
    total: 70000, 
    categoria: "Honorarios", 
    estado: "Pagado" 
  },
  { 
    fecha: null, 
    concepto: "Lic. Mario Penal", 
    pagado: 31000, 
    pendiente: 34000, 
    total: 65000, 
    categoria: "Honorarios", 
    estado: "Parcial" 
  }
];

// Function to import data to Firebase
async function importData() {
  try {
    // Import members
    const miembrosRef = collection(db, "integrantes");
    for (const miembro of miembros) {
      await addDoc(miembrosRef, miembro);
      console.log(`Added member: ${miembro.nombre}`);
    }
    
    // Import contributions
    const aportacionesRef = collection(db, "aportaciones");
    for (const aportacion of aportaciones) {
      const docRef = await addDoc(aportacionesRef, {
        concepto: aportacion.concepto,
        totalMiembros: aportacion.miembros.length
      });
      
      // Add subcollection for member contributions
      const miembrosAportacionRef = collection(db, `aportaciones/${docRef.id}/miembros`);
      for (const miembro of aportacion.miembros) {
        await addDoc(miembrosAportacionRef, miembro);
      }
      console.log(`Added contribution: ${aportacion.concepto}`);
    }
    
    // Import expenses
    const gastosRef = collection(db, "gastos");
    for (const gasto of gastos) {
      await addDoc(gastosRef, gasto);
      console.log(`Added expense: ${gasto.concepto}`);
    }
    
    console.log("Data import completed successfully!");
  } catch (error) {
    console.error("Error importing data: ", error);
  }
}

// Execute the import function
importData();