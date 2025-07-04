// src/pages/RegisterMemberPaymentPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, writeBatch, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { ArrowLeftIcon, CheckIcon, XMarkIcon, CurrencyDollarIcon, CreditCardIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';

const RegisterMemberPaymentPage = () => {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [memberData, setMemberData] = useState(null);
  const [memberContributions, setMemberContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 16));

  useEffect(() => {
    const fetchMemberDetailsAndContributions = async () => {
      try {
        setLoading(true);
        setError('');

        // Fetch member details (optional, but good for display)
        const memberRef = doc(db, 'miembros', memberId);
        const memberSnap = await getDoc(memberRef);
        if (memberSnap.exists()) {
          setMemberData(memberSnap.data());
        } else {
          setError('Miembro no encontrado.');
          setLoading(false);
          return;
        }

        // Fetch all member_contributions for this member that are not yet 'completo'
        const mcRef = collection(db, 'member_contributions');
        const q = query(
          mcRef,
          where('memberId', '==', memberId),
          where('estadoPagoMiembro', 'in', ['pendiente', 'parcialmente_pagado'])
        );
        const querySnapshot = await getDocs(q);

        const fetchedMemberContributions = querySnapshot.docs.map(doc => {
          const data = doc.data();
          const paid = data.abonos?.reduce((sum, abono) => sum + (abono.montoAbonoPagado || (abono.estadoAbono === 'pagado' ? abono.montoAbono : 0)), 0) || 0;
          const pending = (data.montoTotalMiembro - paid);
          return {
            id: doc.id,
            ...data,
            pagado: paid,
            pendiente: pending,
            abonos: data.abonos || [] // Ensure abonos array exists
          };
        }).filter(mc => mc.pendiente > 0.01); // Only include if there's actual pending amount

        // Sort contributions by creation date or due date if available, to process oldest first
        fetchedMemberContributions.sort((a, b) => {
          // Assuming 'fechaAsignacion' or 'fechaCreacion' exists in member_contributions or linked contribution
          // For simplicity, let's assume 'fechaAsignacion' for now
          const dateA = a.fechaAsignacion?.toDate() || new Date(0);
          const dateB = b.fechaAsignacion?.toDate() || new Date(0);
          return dateA - dateB;
        });

        setMemberContributions(fetchedMemberContributions);

      } catch (err) {
        console.error("Error al cargar detalles del miembro y aportaciones:", err);
        setError('Error al cargar la información del miembro. Intente de nuevo.');
      } finally {
        setLoading(false);
      }
    };

    if (memberId) {
      fetchMemberDetailsAndContributions();
    }
  }, [memberId]);

  const handleGeneralPaymentSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const amountToDistribute = parseFloat(paymentAmount);

    if (isNaN(amountToDistribute) || amountToDistribute <= 0) {
      setError('Por favor, ingrese un monto de pago válido y mayor a cero.');
      return;
    }
    if (!paymentMethod) {
      setError('Por favor, seleccione un método de pago.');
      return;
    }
    if (!paymentDate) {
      setError('Por favor, seleccione una fecha de pago.');
      return;
    }
    if (memberContributions.length === 0) {
      setError('No hay aportaciones pendientes para este miembro.');
      return;
    }

    let remainingAmount = amountToDistribute;
    const batch = writeBatch(db);
    const paymentsCollectionRef = collection(db, 'payments'); // Collection for general payment history

    try {
      // Record the general payment in a 'payments' collection
      // Corrected: Use doc() to get a new document reference, then batch.set()
      const newPaymentDocRef = doc(paymentsCollectionRef); 
      batch.set(newPaymentDocRef, {
        memberId: memberId,
        memberName: memberData?.nombre || 'Desconocido',
        amount: amountToDistribute,
        metodoPago: paymentMethod,
        date: new Date(paymentDate), // Store as Date object
        registradoPor: currentUser?.displayName || 'Administrador',
        fechaRegistro: serverTimestamp(),
        concept: `Abono general de ${memberData?.nombre || 'Miembro'}`,
      });

      // Iterate through member's contributions and their abonos to distribute the payment
      for (const mc of memberContributions) {
        if (remainingAmount <= 0) break; // Stop if the payment amount is exhausted

        const mcRef = doc(db, 'member_contributions', mc.id);
        const updatedAbonos = [...mc.abonos];
        let mcPending = mc.pendiente; // Current pending for this member_contribution

        for (let i = 0; i < updatedAbonos.length && remainingAmount > 0; i++) {
          let abono = updatedAbonos[i];
          if (abono.estadoAbono === 'pendiente' || abono.estadoAbono === 'parcialmente_pagado') {
            const abonoRemaining = abono.montoAbono - (abono.montoAbonoPagado || 0);

            if (abonoRemaining <= 0.01) continue; // Skip if abono is already effectively paid

            if (remainingAmount >= abonoRemaining) {
              // Pay this abono completely
              abono.estadoAbono = 'pagado';
              abono.montoAbonoPagado = abono.montoAbono;
              abono.fechaPago = new Date(paymentDate);
              abono.metodoPago = paymentMethod;
              abono.registradoPor = currentUser?.displayName || 'Administrador';
              abono.fechaRegistroPago = new Date();
              remainingAmount -= abonoRemaining;
              mcPending -= abonoRemaining;
            } else {
              // Partial payment for this abono
              abono.montoAbonoPagado = (abono.montoAbonoPagado || 0) + remainingAmount;
              abono.estadoAbono = 'parcialmente_pagado';
              abono.fechaPago = new Date(paymentDate);
              abono.metodoPago = paymentMethod;
              abono.registradoPor = currentUser?.displayName || 'Administrador';
              abono.fechaRegistroPago = new Date();
              mcPending -= remainingAmount;
              remainingAmount = 0; // Payment exhausted
            }
          }
        }

        // Update estadoPagoMiembro for the current member_contribution
        let newEstadoPagoMiembro;
        const allAbonosPaid = updatedAbonos.every(abono => abono.estadoAbono === 'pagado');
        const someAbonosPaid = updatedAbonos.some(abono => abono.estadoAbono === 'pagado' || abono.estadoAbono === 'parcialmente_pagado');

        if (allAbonosPaid) {
          newEstadoPagoMiembro = 'completo';
        } else if (someAbonosPaid) {
          newEstadoPagoMiembro = 'parcialmente_pagado';
        } else {
          newEstadoPagoMiembro = 'pendiente';
        }

        batch.update(mcRef, {
          abonos: updatedAbonos,
          estadoPagoMiembro: newEstadoPagoMiembro,
          pagado: mc.montoTotalMiembro - mcPending, // Recalculate pagado based on actual pending
          pendiente: mcPending, // Update pending
          fechaActualizacion: serverTimestamp(),
        });

        // Update the main contribution's estadoGeneral if all its member_contributions are complete
        // This is a more complex check and might be better handled by a Cloud Function trigger
        // For now, we'll do a basic check here, but be aware of potential race conditions
        const contributionRef = doc(db, 'contributions', mc.contributionId);
        const relatedMCsQuery = query(collection(db, 'member_contributions'), where('contributionId', '==', mc.contributionId));
        const relatedMCsSnap = await getDocs(relatedMCsQuery);
        
        let allRelatedMCsComplete = true;
        let anyRelatedMCPartial = false;

        relatedMCsSnap.docs.forEach(relatedMcDoc => {
          const relatedMcData = relatedMcDoc.data();
          if (relatedMcDoc.id === mc.id) { // Use the updated state for the current MC
            if (newEstadoPagoMiembro !== 'completo') {
              allRelatedMCsComplete = false;
            }
            if (newEstadoPagoMiembro === 'parcialmente_pagado') {
              anyRelatedMCPartial = true;
            }
          } else { // Use the stored state for other MCs
            if (relatedMcData.estadoPagoMiembro !== 'completo') {
              allRelatedMCsComplete = false;
            }
            if (relatedMcData.estadoPagoMiembro === 'parcialmente_pagado') {
              anyRelatedMCPartial = true;
            }
          }
        });

        if (allRelatedMCsComplete) {
          batch.update(contributionRef, { estadoGeneral: 'completada' });
        } else if (anyRelatedMCPartial) {
          // Only update to 'parcialmente_pagado' if it's currently 'pendiente'
          const currentContributionDoc = await getDoc(contributionRef);
          if (currentContributionDoc.exists() && currentContributionDoc.data().estadoGeneral === 'pendiente') {
            batch.update(contributionRef, { estadoGeneral: 'parcialmente_pagado' });
          }
        }
      }

      await batch.commit();

      setSuccess('Abono general registrado exitosamente!');
      setPaymentAmount(''); // Clear form
      setPaymentMethod('');
      setPaymentDate(new Date().toISOString().slice(0, 16));
      // Refresh the page data after successful submission
      setTimeout(() => navigate('/payments'), 2000); // Navigate back to the member debts list
      
    } catch (err) {
      console.error("Error al registrar el abono general:", err);
      setError('Error al registrar el abono general. Por favor, intente nuevamente.');
    }
  };

  const totalMemberDebt = memberContributions.reduce((sum, mc) => sum + mc.pendiente, 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="spinner"></div>
        <span className="ml-4 text-gray-600">Cargando información del miembro...</span>
      </div>
    );
  }

  if (error && !memberData) { // Initial load error
    return (
      <div className="container mx-auto px-4 py-8 animate-fadeInUp">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
          <Link to="/payments" className="btn-primary-gradient mt-4 inline-flex items-center">
            Volver a Deudores
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 animate-fadeInUp">
      <div className="mb-6">
        <Link 
          to="/payments" 
          className="inline-flex items-center btn-secondary-outline"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1 icon-interactive" /> Volver a Deudores
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="main-header-title text-gray-900">Registrar Abono General</h1>
          <p className="text-sm text-gray-500 mt-1">
            Registre un pago para {memberData?.nombre || 'este miembro'} y distribúyalo en sus aportaciones pendientes.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-start">
          <XMarkIcon className="h-5 w-5 mr-2" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-lg flex items-start">
          <CheckIcon className="h-5 w-5 mr-2" />
          <span>{success}</span>
        </div>
      )}

      <div className="card-modern p-6 mb-8 animate-fadeInUp delay-1">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Resumen de Deuda de {memberData?.nombre || 'Miembro'}</h2>
        <p className="text-lg font-bold text-red-600 mb-4">Deuda Total Pendiente: Q{totalMemberDebt.toFixed(2)}</p>

        {memberContributions.length === 0 ? (
          <p className="text-gray-600">Este miembro no tiene aportaciones pendientes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aportación
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cuota Asignada
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pagado
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pendiente
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {memberContributions.map((mc) => (
                  <tr key={mc.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {mc.contributionTitulo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      Q{mc.montoTotalMiembro?.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      Q{mc.pagado?.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                      Q{mc.pendiente?.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          mc.estadoPagoMiembro === 'completo' ? 'bg-green-100 text-green-800' : 
                          mc.estadoPagoMiembro === 'parcialmente_pagado' ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                      }`}>
                        {mc.estadoPagoMiembro}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalMemberDebt > 0.01 && ( // Only show payment form if there's debt
        <div className="card-modern p-6 animate-fadeInUp delay-2">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Registrar Abono</h2>
          <form onSubmit={handleGeneralPaymentSubmit} className="space-y-6">
            {/* Monto del Pago */}
            <div>
              <label htmlFor="paymentAmount" className="block text-sm font-medium text-gray-700 mb-1">
                Monto del Abono *
              </label>
              <div className="input-with-icon-wrapper">
                <div className="input-icon">
                  <CurrencyDollarIcon className="h-5 w-5" />
                </div>
                <span className="text-gray-500 pl-2 pr-1">Q</span>
                <input
                  type="number"
                  id="paymentAmount"
                  name="paymentAmount"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  min="0.01"
                  step="0.01"
                  className="input-field-inside flex-1"
                  required
                />
              </div>
            </div>

            {/* Método de Pago */}
            <div>
              <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-1">
                Método de Pago *
              </label>
              <div className="input-with-icon-wrapper">
                <div className="input-icon">
                  <CreditCardIcon className="h-5 w-5" />
                </div>
                <select
                  id="paymentMethod"
                  name="paymentMethod"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="input-field-inside flex-1"
                  required
                >
                  <option value="">Seleccione un método</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia Bancaria">Transferencia Bancaria</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Depósito">Depósito</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
            </div>

            {/* Fecha y Hora del Pago */}
            <div>
              <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-700 mb-1">
                Fecha y Hora del Pago *
              </label>
              <div className="input-with-icon-wrapper">
                <div className="input-icon">
                  <CalendarDaysIcon className="h-5 w-5" />
                </div>
                <input
                  type="datetime-local"
                  id="paymentDate"
                  name="paymentDate"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="input-field-inside flex-1"
                  required
                />
              </div>
            </div>

            <div className="flex justify-between pt-6 border-t">
              <button
                type="button"
                onClick={() => navigate('/payments')}
                className="btn-secondary-outline inline-flex items-center"
              >
                <XMarkIcon className="h-5 w-5 mr-2 icon-interactive" />
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-primary-gradient inline-flex items-center"
              >
                <CheckIcon className="h-5 w-5 mr-2 icon-interactive" />
                Registrar Abono
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default RegisterMemberPaymentPage;
