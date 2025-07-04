// src/pages/MemberDebtsPage.jsx
import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { Link } from 'react-router-dom';
import { ArrowPathIcon, UserGroupIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

const MemberDebtsPage = () => {
  const [membersWithDebt, setMembersWithDebt] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refresh, setRefresh] = useState(false);

  useEffect(() => {
    const fetchMemberDebts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const memberContributionsRef = collection(db, 'member_contributions');
        // Obtener todas las member_contributions que no están completas
        const q = query(
          memberContributionsRef,
          where('estadoPagoMiembro', 'in', ['pendiente', 'parcialmente_pagado'])
        );
        const querySnapshot = await getDocs(q);

        const debtsByMember = new Map();

        querySnapshot.docs.forEach(doc => {
          const data = doc.data();
          const memberId = data.memberId;
          const memberName = data.miembroNombreCompleto;
          const montoTotalMiembro = data.montoTotalMiembro || 0;
          
          const pagadoActual = data.abonos?.reduce((sum, abono) => 
            sum + (abono.montoAbonoPagado || (abono.estadoAbono === 'pagado' ? abono.montoAbono : 0)), 0
          ) || 0;
          
          const pendienteActual = montoTotalMiembro - pagadoActual;

          if (pendienteActual > 0.01) { // Solo si hay deuda real
            if (!debtsByMember.has(memberId)) {
              debtsByMember.set(memberId, {
                id: memberId,
                name: memberName,
                totalDebt: 0,
              });
            }
            const memberEntry = debtsByMember.get(memberId);
            memberEntry.totalDebt += pendienteActual;
          }
        });

        // Convertir el mapa a un array y ordenar por nombre
        const sortedMembers = Array.from(debtsByMember.values())
          .sort((a, b) => a.name.localeCompare(b.name));

        setMembersWithDebt(sortedMembers);

      } catch (err) {
        console.error('Error fetching member debts:', err);
        setError('No se pudieron cargar los deudores. Intente nuevamente.');
      } finally {
        setLoading(false);
      }
    };

    fetchMemberDebts();
  }, [refresh]);

  const handleRefresh = () => {
    setRefresh(prev => !prev);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="spinner"></div>
        <span className="ml-4 text-gray-600">Cargando deudores...</span>
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
        <h1 className="main-header-title">Gestión de Pagos de Aportaciones</h1>
        <button
          onClick={handleRefresh}
          className="btn-primary-gradient inline-flex items-center"
        >
          <ArrowPathIcon className="h-5 w-5 mr-2 icon-interactive" />
          Actualizar
        </button>
      </div>
      
      <div className="card-modern p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Miembros Deudores</h2>
          <span className="text-sm text-gray-500">
            Total: {membersWithDebt.length} deudores
          </span>
        </div>
        
        {membersWithDebt.length === 0 ? (
          <div className="text-center text-gray-500 py-4">No hay miembros con deudas pendientes.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Miembro
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deuda Total Pendiente
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {membersWithDebt.map((member) => (
                  <tr key={member.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center">
                        <UserGroupIcon className="h-5 w-5 mr-2 text-blue-dark" />
                        {member.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">
                      Q{member.totalDebt.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link 
                        to={`/payments/register-general/${member.id}`}
                        className="btn-primary-gradient inline-flex items-center text-sm px-3 py-1"
                      >
                        <CurrencyDollarIcon className="h-4 w-4 mr-1 icon-interactive" />
                        Registrar Abono General
                      </Link>
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

export default MemberDebtsPage;
