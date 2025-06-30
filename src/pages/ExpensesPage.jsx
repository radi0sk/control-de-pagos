// src/pages/ExpensesPage.jsx
import React, { useState, useEffect } from 'react';
import ExpenseForm from '../components/Expenses/ExpenseForm';
import ExpenseList from '../components/Expenses/ExpenseList';
import { getExpenses, addExpense } from '../services/expensesService';
// CAMBIO AQUI: Importar RefreshIcon desde la ruta de Heroicons v2
import { ArrowPathIcon as RefreshIcon } from '@heroicons/react/24/outline'; // Renombramos ArrowPathIcon a RefreshIcon para mantener el nombre en el código

function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refresh, setRefresh] = useState(false);

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        setLoading(true);
        const expensesData = await getExpenses();
        setExpenses(expensesData);
        setError(null);
      } catch (err) {
        console.error('Error fetching expenses:', err);
        setError('No se pudieron cargar los gastos. Intente nuevamente.');
      } finally {
        setLoading(false);
      }
    };

    fetchExpenses();
  }, [refresh]);

  const handleAddExpense = async (newExpense) => {
    try {
      const addedExpense = await addExpense(newExpense);
      setExpenses(prev => [addedExpense, ...prev]); // Nuevo gasto al inicio
    } catch (err) {
      console.error('Error adding expense:', err);
      setError('No se pudo agregar el gasto. Verifique los datos.');
    }
  };

  const handleRefresh = () => setRefresh(prev => !prev);

  if (loading) return (
    <div className="flex justify-center items-center h-screen"> {/* Altura de pantalla completa */}
      <div className="spinner"></div> {/* Spinner personalizado de App.css */}
      <span className="ml-4 text-gray-600">Cargando gastos...</span>
    </div>
  );

  if (error) return (
    <div className="container mx-auto px-4 py-8 animate-fadeInUp"> {/* Animación de entrada */}
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error:</strong>
        <span className="block sm:inline"> {error}</span>
        <button 
          onClick={handleRefresh}
          className="btn-primary-gradient mt-4 inline-flex items-center" // Estilo de botón
        >
          Reintentar
        </button>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8 animate-fadeInUp"> {/* Animación de entrada */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="main-header-title">Registro de Gastos</h1> {/* Título principal */}
        <button
          onClick={handleRefresh}
          className="btn-primary-gradient inline-flex items-center" // Estilo de botón
        >
          <RefreshIcon className="h-5 w-5 mr-2 icon-interactive" /> {/* Ícono interactivo */}
          Actualizar
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 animate-fadeInUp delay-1"> {/* Animación con retraso */}
          <div className="card-modern p-6"> {/* Estilo de tarjeta moderna */}
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Nuevo Gasto</h2>
            <ExpenseForm onSubmit={handleAddExpense} />
          </div>
        </div>
        
        <div className="lg:col-span-2 animate-fadeInUp delay-2"> {/* Animación con retraso */}
          <div className="card-modern p-6"> {/* Estilo de tarjeta moderna */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Historial de Gastos</h2>
              <span className="text-sm text-gray-500">
                Total: {expenses.length} gastos
              </span>
            </div>
            <ExpenseList expenses={expenses} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExpensesPage;
