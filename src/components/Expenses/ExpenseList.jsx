// src/components/Expenses/ExpenseList.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // Importar Link
import { DocumentIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig.js';

function ExpenseList({ expenses }) {
  const [allActiveMemberNames, setAllActiveMemberNames] = useState({});
  const [loadingMembers, setLoadingMembers] = useState(true);

  useEffect(() => {
    const fetchActiveMembers = async () => {
      try {
        setLoadingMembers(true);
        const q = query(collection(db, 'miembros'), where('activo', '==', true));
        const querySnapshot = await getDocs(q);
        const namesMap = {};
        querySnapshot.docs.forEach(doc => {
          namesMap[doc.id] = doc.data().nombre;
        });
        setAllActiveMemberNames(namesMap);
      } catch (error) {
        console.error('Error fetching active members for ExpenseList:', error);
      } finally {
        setLoadingMembers(false);
      }
    };
    fetchActiveMembers();
  }, []);

  if (expenses.length === 0) {
    return (
      <div className="card-modern text-center py-6">
        <p className="text-gray-600">No hay gastos registrados aún.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto card-modern">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Acciones
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Monto (Q)
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Descripción
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tipo
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Estado Pago
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Fecha Gasto
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Proveedor
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Documento
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Aprobado por
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {expenses.map((expense) => {
            const totalPaidAbonos = expense.abonos?.reduce((sum, abono) => 
              sum + (abono.montoAbonoPagado || (abono.estadoAbono === 'pagado' ? abono.montoAbono : 0)), 0
            ) || 0;
            const totalPendingAbonos = parseFloat(expense.monto) - totalPaidAbonos;

            let estadoPagoDisplay = 'Pendiente';
            let estadoPagoClass = 'bg-red-100 text-red-800';
            let estadoPagoIcon = <ClockIcon className="h-4 w-4 text-red-500 inline-block ml-1" />;

            if (totalPaidAbonos >= parseFloat(expense.monto)) {
              estadoPagoDisplay = 'Pagado';
              estadoPagoClass = 'bg-green-100 text-green-800';
              estadoPagoIcon = <CheckCircleIcon className="h-4 w-4 text-green-500 inline-block ml-1" />;
            } else if (totalPaidAbonos > 0) {
              estadoPagoDisplay = 'Parcialmente Pagado';
              estadoPagoClass = 'bg-orange-100 text-orange-800';
              estadoPagoIcon = <ClockIcon className="h-4 w-4 text-orange-500 inline-block ml-1" />;
            }

            let aprobadoPorDisplay = 'N/A';
            if (expense.aprobadoPor) {
              let approvedIds = [];
              if (typeof expense.aprobadoPor === 'object' && !Array.isArray(expense.aprobadoPor)) {
                approvedIds = Object.keys(expense.aprobadoPor);
              } else if (Array.isArray(expense.aprobadoPor)) {
                approvedIds = expense.aprobadoPor;
              }

              if (approvedIds.length > 0 && !loadingMembers) {
                const approvedNames = approvedIds
                  .map(id => allActiveMemberNames[id])
                  .filter(name => name);

                const totalActiveMembers = Object.keys(allActiveMemberNames).length;

                if (totalActiveMembers > 0 && approvedNames.length === totalActiveMembers) {
                  aprobadoPorDisplay = 'Aprobado por todos';
                } else if (approvedNames.length === 1) {
                  aprobadoPorDisplay = approvedNames[0];
                } else if (approvedNames.length > 1) {
                  aprobadoPorDisplay = `${approvedNames[0]} y ${approvedNames.length - 1} más`;
                } else {
                  aprobadoPorDisplay = 'N/A (IDs no reconocidos)';
                }
              }
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

            return (
              <tr key={expense.id}>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {totalPendingAbonos > 0.01 && (
                    <Link 
                      to={`/expenses/${expense.id}/register-payment`} // Nueva ruta
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Registrar Pago
                    </Link>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                  Q{expense.monto?.toFixed(2) || '0.00'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {expense.descripcion}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      expense.tipo === 'honorario' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                  }`}>
                    {expense.tipo === 'honorario' ? 'Honorario' : 'Operativo'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${estadoPagoClass}`}>
                    {estadoPagoDisplay}
                  </span>
                  {estadoPagoIcon}
                  {totalPendingAbonos > 0.01 && (
                    <p className="text-xs text-gray-500 mt-1">Pendiente: Q{totalPendingAbonos.toFixed(2)}</p>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {displayDate}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {expense.proveedor}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {expense.documento ? (
                    <a 
                      href={expense.documento} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn-secondary-outline inline-flex items-center text-xs px-2 py-1"
                    >
                      <DocumentIcon className="h-4 w-4 mr-1 icon-interactive" />
                      Ver
                    </a>
                  ) : (
                    'N/A'
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {aprobadoPorDisplay}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default ExpenseList;
