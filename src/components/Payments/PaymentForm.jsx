import { useState, useEffect } from 'react';
import { doc, getDoc, writeBatch, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { CheckIcon, XMarkIcon, CalendarDaysIcon, CurrencyDollarIcon, CreditCardIcon } from '@heroicons/react/24/outline';

const PaymentForm = ({ contributionId, memberContributionId }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [memberContribution, setMemberContribution] = useState(null);
  const [contributionTitle, setContributionTitle] = useState('');
  const [memberName, setMemberName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states for the payment
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [selectedAbonoIndex, setSelectedAbonoIndex] = useState(''); // Index of the abono being paid

  useEffect(() => {
    const fetchMemberContribution = async () => {
      try {
        setLoading(true);
        setError('');
        const mcRef = doc(db, 'member_contributions', memberContributionId);
        const mcSnap = await getDoc(mcRef);

        if (mcSnap.exists()) {
          const data = mcSnap.data();
          setMemberContribution(data);
          setContributionTitle(data.contributionTitulo);
          setMemberName(data.miembroNombreCompleto);
          
          const pendingAbonos = data.abonos.filter(abono => abono.estadoAbono === 'pendiente');
          if (pendingAbonos.length === 0) {
            setSuccess('Este miembro ya ha pagado su aportación por completo.');
          }
          
          setPaymentDate(new Date().toISOString().slice(0, 16)); // Current date and time
        } else {
          setError('Aportación del miembro no encontrada.');
        }
      } catch (err) {
        console.error("Error fetching member contribution:", err);
        setError('Error al cargar la aportación del miembro.');
      } finally {
        setLoading(false);
      }
    };

    if (memberContributionId) {
      fetchMemberContribution();
    }
  }, [memberContributionId]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!paymentAmount || isNaN(parseFloat(paymentAmount)) || parseFloat(paymentAmount) <= 0) {
      setError('Por favor, ingrese un monto de pago válido.');
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
    if (!memberContribution) {
        setError('Error: Datos de la aportación del miembro no cargados.');
        return;
    }

    const amountPaid = parseFloat(paymentAmount);
    // Calcular el total pendiente real del miembro para evitar inconsistencias
    const currentPaidTotal = memberContribution.abonos?.reduce((sum, abono) => 
      sum + (abono.estadoAbono === 'pagado' ? abono.montoAbono : 0), 0
    ) || 0;
    const currentPendingTotal = parseFloat(memberContribution.montoTotalMiembro) - currentPaidTotal;

    if (amountPaid > currentPendingTotal + 0.01) { // Adding a small tolerance for floating point issues
        setError(`El monto ingresado (Q${amountPaid.toFixed(2)}) excede el total pendiente (Q${currentPendingTotal.toFixed(2)}).`);
        return;
    }

    try {
      const batch = writeBatch(db);
      const mcRef = doc(db, 'member_contributions', memberContributionId);

      // Deep copy abonos array to modify it
      const updatedAbonos = [...memberContribution.abonos];
      let remainingAmountToPay = amountPaid;

      // Si se seleccionó un abono específico
      if (selectedAbonoIndex !== '' && selectedAbonoIndex >= 0 && selectedAbonoIndex < updatedAbonos.length) {
        const abono = updatedAbonos[selectedAbonoIndex];
        if (abono.estadoAbono === 'pendiente') {
          if (remainingAmountToPay >= abono.montoAbono) {
            // Pagar este abono completamente
            abono.estadoAbono = 'pagado';
            abono.fechaPago = new Date(paymentDate);
            abono.metodoPago = paymentMethod;
            abono.registradoPor = currentUser?.displayName || 'Desconocido';
            abono.fechaRegistroPago = new Date(); 
            remainingAmountToPay -= abono.montoAbono;
          } else {
            // Pago parcial para un abono específico, si el monto es menor al abono
            // Esto permite registrar un anticipo para un abono específico
            abono.montoAbonoPagado = (abono.montoAbonoPagado || 0) + remainingAmountToPay;
            abono.estadoAbono = 'parcialmente_pagado'; // Nuevo estado para abono
            abono.fechaPago = new Date(paymentDate);
            abono.metodoPago = paymentMethod;
            abono.registradoPor = currentUser?.displayName || 'Desconocido';
            abono.fechaRegistroPago = new Date();
            remainingAmountToPay = 0; // Se consumió todo el monto ingresado
            setError(`Se ha registrado un pago parcial de Q${amountPaid.toFixed(2)} para el abono ${abono.numeroAbono}.`);
          }
        } else {
          setError('El abono seleccionado ya está pagado o parcialmente pagado. Por favor, seleccione un abono pendiente.');
          return;
        }
      } 
      // Si no se seleccionó un abono específico, distribuir el monto entre los abonos pendientes
      else {
        for (let i = 0; i < updatedAbonos.length && remainingAmountToPay > 0; i++) {
          let abono = updatedAbonos[i]; 
          if (abono.estadoAbono === 'pendiente') {
            const abonoRemaining = abono.montoAbono - (abono.montoAbonoPagado || 0);

            if (remainingAmountToPay >= abonoRemaining) {
              // Pagar este abono completamente o completar su pago
              abono.estadoAbono = 'pagado';
              abono.fechaPago = new Date(paymentDate);
              abono.metodoPago = paymentMethod;
              abono.registradoPor = currentUser?.displayName || 'Desconocido';
              abono.fechaRegistroPago = new Date(); 
              abono.montoAbonoPagado = abono.montoAbono; // Asegurar que el monto pagado del abono sea el total del abono
              remainingAmountToPay -= abonoRemaining;
            } else {
              // Pago parcial para el abono actual
              abono.montoAbonoPagado = (abono.montoAbonoPagado || 0) + remainingAmountToPay;
              abono.estadoAbono = 'parcialmente_pagado';
              abono.fechaPago = new Date(paymentDate); // Actualizar fecha de pago con cada pago
              abono.metodoPago = paymentMethod;
              abono.registradoPor = currentUser?.displayName || 'Desconocido';
              abono.fechaRegistroPago = new Date();
              remainingAmountToPay = 0; // Se consumió todo el monto ingresado
            }
          }
        }
      }

      // Calculate new estadoPagoMiembro
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

      // Update the member_contribution document
      batch.update(mcRef, {
        abonos: updatedAbonos,
        estadoPagoMiembro: newEstadoPagoMiembro,
        fechaActualizacion: serverTimestamp(),
      });

      // Check if the main contribution's estadoGeneral needs to be updated
      const contributionMemberContributionsQuery = query(
        collection(db, 'member_contributions'),
        where('contributionId', '==', contributionId)
      );
      const allRelatedMC = await getDocs(contributionMemberContributionsQuery);
      
      let allMembersPaid = true;
      allRelatedMC.docs.forEach(docSnap => {
          if (docSnap.id === memberContributionId) { 
              if (newEstadoPagoMiembro !== 'completo') { 
                  allMembersPaid = false;
              }
          } else { 
              const otherMcData = docSnap.data();
              if (otherMcData.estadoPagoMiembro !== 'completo') { 
                  allMembersPaid = false;
              }
          }
      });

      if (allMembersPaid) {
        const contributionRef = doc(db, 'contributions', contributionId);
        batch.update(contributionRef, { estadoGeneral: 'completado' });
      } else if (newEstadoPagoMiembro === 'parcialmente_pagado' || (newEstadoPagoMiembro === 'completo' && memberContribution.estadoPagoMiembro !== 'parcialmente_pagado' && memberContribution.estadoPagoMiembro !== 'completo')) {
        const contributionRef = doc(db, 'contributions', contributionId);
        const currentContributionSnap = await getDoc(contributionRef);
        if (currentContributionSnap.exists() && currentContributionSnap.data().estadoGeneral === 'pendiente') {
            batch.update(contributionRef, { estadoGeneral: 'parcialmente_pagado' });
        }
      }

      await batch.commit();

      setSuccess('Pago registrado exitosamente!');
      setPaymentAmount(''); // Limpiar el monto después de un envío exitoso
      setSelectedAbonoIndex(''); // Limpiar la selección de abono
      setTimeout(() => navigate(`/contributions/${contributionId}`), 2000);

    } catch (err) {
      console.error("Error al registrar pago:", err);
      setError('Error al registrar el pago. Por favor, intente nuevamente.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="spinner"></div>
        <span className="ml-4 text-gray-600">Cargando formulario de pago...</span>
      </div>
    );
  }

  if (error && !memberContribution) { 
    return (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-start animate-fadeInUp">
            <XMarkIcon className="h-5 w-5 mr-2" />
            <span><strong className="font-bold">Error:</strong> {error}</span>
        </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fadeInUp">
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

      {/* Sección de Resumen de Contribución del Miembro */}
      <div className="card-modern p-4 rounded-md animate-fadeInUp delay-1">
        <p className="text-sm text-gray-700"><span className="font-semibold text-blue-dark">Aportación:</span> {contributionTitle}</p>
        <p className="text-sm text-gray-700"><span className="font-semibold text-blue-dark">Asociado:</span> {memberName}</p>
        <p className="text-sm text-gray-700"><span className="font-semibold text-blue-dark">Cuota Total Asignada:</span> Q{memberContribution?.montoTotalMiembro?.toFixed(2)}</p>
        <p className="text-sm text-gray-700"><span className="font-semibold text-blue-dark">Pagado hasta ahora:</span> Q{memberContribution?.abonos?.reduce((sum, abono) => sum + (abono.montoAbonoPagado || (abono.estadoAbono === 'pagado' ? abono.montoAbono : 0)), 0).toFixed(2)}</p>
        <p className="text-base text-gray-900"><span className="font-semibold text-red-dark">Pendiente:</span> Q{(memberContribution?.montoTotalMiembro - (memberContribution?.abonos?.reduce((sum, abono) => sum + (abono.montoAbonoPagado || (abono.estadoAbono === 'pagado' ? abono.montoAbono : 0)), 0) || 0)).toFixed(2)}</p>
      </div>

      {/* Selector de Abono a Pagar */}
      <div className="animate-fadeInUp delay-2">
        <label htmlFor="selectedAbono" className="block text-sm font-medium text-gray-700 mb-1">
          Seleccionar Abono a Pagar (Opcional)
        </label>
        <select
          id="selectedAbono"
          name="selectedAbono"
          value={selectedAbonoIndex}
          onChange={(e) => {
            const index = e.target.value;
            setSelectedAbonoIndex(index);
            // Ya no pre-rellenamos el paymentAmount aquí
          }}
          className="input-field w-full"
        >
          <option value="">Distribuir en Abonos Pendientes</option> {/* Texto más claro */}
          {memberContribution?.abonos
            ?.map((abono, index) => ({ abono, index }))
            .filter(({ abono }) => abono.estadoAbono === 'pendiente' || abono.estadoAbono === 'parcialmente_pagado') // Incluir parciales
            .map(({ abono, index }) => (
              <option key={index} value={index}>
                Abono {abono.numeroAbono} (Q{abono.montoAbono?.toFixed(2)}) - Estado: {abono.estadoAbono === 'parcialmente_pagado' ? `Parcial (Q${(abono.montoAbono - (abono.montoAbonoPagado || 0)).toFixed(2)} Pendiente)` : 'Pendiente'}
              </option>
            ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">Selecciona un abono específico si deseas registrar un pago para él. Si no seleccionas, el monto se distribuirá entre los abonos pendientes secuencialmente.</p>
      </div>

      {/* Monto del Pago */}
      <div className="animate-fadeInUp delay-3">
        <label htmlFor="paymentAmount" className="block text-sm font-medium text-gray-700 mb-1">
          Monto del Pago *
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
      <div className="animate-fadeInUp delay-4">
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
      <div className="animate-fadeInUp delay-5">
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

      {/* Botones de acción */}
      <div className="flex justify-between pt-6 border-t animate-fadeInUp delay-6">
        <button
          type="button"
          onClick={() => navigate(`/contributions/${contributionId}`)}
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
          Registrar Pago
        </button>
      </div>
    </form>
  );
};

export default PaymentForm;
