import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig'; // Asegúrate de que esta ruta sea correcta
import { ArrowPathIcon } from '@heroicons/react/24/outline'; // Icono para el botón de actualizar

const PaymentsPage = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refresh, setRefresh] = useState(false); // Para forzar la recarga de datos

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        setError(null);
        const paymentsRef = collection(db, 'payments');
        // Ordena por fecha en orden descendente. Si 'date' no es un Timestamp, ajústalo.
        const q = query(paymentsRef, orderBy('date', 'desc')); 
        const querySnapshot = await getDocs(q);
        const fetchedPayments = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          // Convierte el Timestamp a objeto Date para display
          date: doc.data().date?.toDate ? doc.data().date.toDate() : new Date(doc.data().date)
        }));
        setPayments(fetchedPayments);
      } catch (err) {
        console.error('Error fetching payments:', err);
        setError('No se pudieron cargar los pagos. Intente nuevamente.');
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [refresh]); // Se ejecuta cuando 'refresh' cambia

  const handleRefresh = () => {
    setRefresh(prev => !prev); // Alterna el valor para forzar useEffect
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="spinner"></div> {/* Spinner personalizado de App.css */}
        <span className="ml-4 text-gray-600">Cargando pagos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 animate-fadeInUp">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
          <button 
            onClick={handleRefresh}
            className="btn-primary-gradient mt-4 inline-flex items-center"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 animate-fadeInUp">
      <div className="flex justify-between items-center mb-6">
        <h1 className="main-header-title">Historial de Pagos</h1> {/* Título principal */}
        <button
          onClick={handleRefresh}
          className="btn-primary-gradient inline-flex items-center"
        >
          <ArrowPathIcon className="h-5 w-5 mr-2 icon-interactive" /> {/* Ícono interactivo */}
          Actualizar
        </button>
      </div>
      
      <div className="card-modern p-6"> {/* Estilo de tarjeta moderna */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Detalle de Pagos</h2>
          <span className="text-sm text-gray-500">
            Total: {payments.length} pagos
          </span>
        </div>
        
        {payments.length === 0 ? (
          <div className="text-center text-gray-500 py-4">No hay pagos registrados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descripción
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Método
                  </th>
                  {/* Puedes añadir más columnas si tus pagos tienen más campos */}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {payment.date ? payment.date.toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.description || payment.concept || 'Pago sin descripción'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      Q{payment.amount?.toFixed(2) || '0.00'}
                    </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {payment.metodoPago || 'No especificado'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentsPage;
