// src/pages/ExpensesPage.jsx
import React, { useState, useEffect } from 'react';
import ExpenseForm from '../components/Expenses/ExpenseForm';
import ExpenseList from '../components/Expenses/ExpenseList';
import { getExpenses, addExpense } from '../services/expensesService';
import { ArrowPathIcon as RefreshIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline'; // Importamos iconos adicionales

function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refresh, setRefresh] = useState(false);
  const [summaryDetails, setSummaryDetails] = useState([]);
  const [totalExpensesPaid, setTotalExpensesPaid] = useState(0);
  const [totalExpensesPending, setTotalExpensesPending] = useState(0);
  const [totalExpensesOverall, setTotalExpensesOverall] = useState(0);

  useEffect(() => {
    const fetchExpensesAndSummary = async () => {
      try {
        setLoading(true);
        const expensesData = await getExpenses();
        setExpenses(expensesData);
        setError(null);

        // Calculate summary details
        let currentTotalPaid = 0;
        let currentTotalPending = 0;
        let currentTotalOverall = 0;
        const details = expensesData.map(expense => {
          const totalPaidAbonos = expense.abonos?.reduce((sum, abono) => 
            sum + (abono.montoAbonoPagado || (abono.estadoAbono === 'pagado' ? abono.montoAbono : 0)), 0
          ) || 0;
          const totalPendingAbonos = parseFloat(expense.monto) - totalPaidAbonos;

          currentTotalPaid += totalPaidAbonos;
          currentTotalPending += totalPendingAbonos;
          currentTotalOverall += parseFloat(expense.monto);

          let statusDisplay = 'Pendiente';
          let statusIcon = <ClockIcon className="h-4 w-4 text-red-500 inline-block ml-1" />;
          if (totalPaidAbonos >= parseFloat(expense.monto)) {
            statusDisplay = 'Pagado';
            statusIcon = <CheckCircleIcon className="h-4 w-4 text-green-500 inline-block ml-1" />;
          } else if (totalPaidAbonos > 0) {
            statusDisplay = 'Parcialmente Pagado';
            statusIcon = <ClockIcon className="h-4 w-4 text-orange-500 inline-block ml-1" />;
          }

          let displayDate = 'N/A';
          if (expense.fechaGasto) {
            if (expense.fechaGasto.seconds) {
              displayDate = new Date(expense.fechaGasto.seconds * 1000).toLocaleDateString('es-GT', { year: 'numeric', month: '2-digit', day: '2-digit' });
            } else if (expense.fechaGasto instanceof Date) {
              displayDate = expense.fechaGasto.toLocaleDateString('es-GT', { year: 'numeric', month: '2-digit', day: '2-digit' });
            }
          } else if (expense.fecha) {
              if (expense.fecha.seconds) {
                  displayDate = new Date(expense.fecha.seconds * 1000).toLocaleDateString('es-GT', { year: 'numeric', month: '2-digit', day: '2-digit' });
              } else if (typeof expense.fecha === 'string') {
                  try {
                      const parsedDate = new Date(expense.fecha);
                      if (!isNaN(parsedDate)) {
                          displayDate = parsedDate.toLocaleDateString('es-GT', { year: 'numeric', month: '2-digit', day: '2-digit' });
                      } else {
                          displayDate = expense.fecha;
                      }
                  } catch (e) {
                      displayDate = expense.fecha;
                  }
              }
          }


          return {
            id: expense.id,
            date: displayDate,
            concept: expense.descripcion,
            paid: totalPaidAbonos,
            pending: totalPendingAbonos,
            total: parseFloat(expense.monto),
            status: statusDisplay,
            statusIcon: statusIcon
          };
        });

        setSummaryDetails(details);
        setTotalExpensesPaid(currentTotalPaid);
        setTotalExpensesPending(currentTotalPending);
        setTotalExpensesOverall(currentTotalOverall);

      } catch (err) {
        console.error('Error fetching expenses:', err);
        setError('No se pudieron cargar los gastos. Intente nuevamente.');
      } finally {
        setLoading(false);
      }
    };

    fetchExpensesAndSummary();
  }, [refresh]);

  const handleAddExpense = async (newExpense) => {
    try {
      const addedExpense = await addExpense(newExpense);
      setExpenses(prev => [addedExpense, ...prev]); // Nuevo gasto al inicio
      setRefresh(prev => !prev); // Refresh summary after adding expense
    } catch (err) {
      console.error('Error adding expense:', err);
      setError('No se pudo agregar el gasto. Verifique los datos.');
    }
  };

  const handleRefresh = () => setRefresh(prev => !prev);

  if (loading) return (
    <div className="flex justify-center items-center h-screen">
      <div className="spinner"></div>
      <span className="ml-4 text-gray-600">Cargando gastos...</span>
    </div>
  );

  if (error) return (
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

  return (
    <div className="container mx-auto px-4 py-8 animate-fadeInUp">
      <div className="flex justify-between items-center mb-6">
        <h1 className="main-header-title">Registro de Gastos</h1>
        <button
          onClick={handleRefresh}
          className="btn-primary-gradient inline-flex items-center"
        >
          <RefreshIcon className="h-5 w-5 mr-2 icon-interactive" />
          Actualizar
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8"> {/* Added mb-8 */}
        <div className="lg:col-span-1 animate-fadeInUp delay-1">
          <div className="card-modern p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Nuevo Gasto</h2>
            <ExpenseForm onSubmit={handleAddExpense} />
          </div>
        </div>
        
        <div className="lg:col-span-2 animate-fadeInUp delay-2">
          <div className="card-modern p-6">
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

      {/* Sección de Resumen de Gastos Ejecutados */}
      <div className="card-modern p-6 animate-fadeInUp delay-3">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Detalle de Gastos Ejecutados</h2>
        <p className="text-gray-600 mb-4">Gastos Pagados y Pendientes</p>
        
        {summaryDetails.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-gray-500">No hay detalles de gastos para mostrar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-red-800 to-red-600"> {/* Red gradient for expenses */}
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Fecha
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Concepto
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Pagado
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Pendiente
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Total
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {summaryDetails.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {item.concept}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      Q{item.paid.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      Q{item.pending.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      Q{item.total.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      <span className="flex items-center">
                        {item.status} {item.statusIcon}
                      </span>
                    </td>
                  </tr>
                ))}
                {/* Fila de totales generales de gastos */}
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900" colSpan="2">TOTALES GENERALES</td>
                  <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">Q{totalExpensesPaid.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">Q{totalExpensesPending.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">Q{totalExpensesOverall.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap"></td> {/* Empty cell for status */}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExpensesPage;
