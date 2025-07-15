import { useState, useEffect } from 'react';
import { doc, getDoc, writeBatch, serverTimestamp, collection } from 'firebase/firestore';
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
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 16));
  const [selectedAbonoIndex, setSelectedAbonoIndex] = useState(''); // Index of the abono being paid

  // Nuevo estado para controlar el envío del formulario
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchMemberContribution = async () => {
      try {
        setLoading(true);
        setError('');
        const mcRef = doc(db, 'member_contributions', memberContributionId);
        const mcSnap = await getDoc(mcRef);

        if (!mcSnap.exists()) {
          setError('Aportación del miembro no encontrada.');
          setLoading(false);
          return;
        }

        const mcData = { id: mcSnap.id, ...mcSnap.data() };
        setMemberContribution(mcData);
        setMemberName(mcData.miembroNombreCompleto);
        
        // Fetch contribution title
        const contributionRef = doc(db, 'contributions', mcData.contributionId);
        const contributionSnap = await getDoc(contributionRef);
        if (contributionSnap.exists()) {
          setContributionTitle(contributionSnap.data().title);
        } else {
          setContributionTitle('Título no encontrado');
        }

      } catch (err) {
        console.error("Error al cargar la aportación del miembro:", err);
        setError('Error al cargar los detalles de la aportación.');
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

    if (isSubmitting) return; // Prevenir doble envío

    if (!paymentAmount || isNaN(Number(paymentAmount)) || Number(paymentAmount) <= 0) {
      setError('Por favor, ingresa un monto de pago válido.');
      return;
    }
    if (!paymentMethod) {
      setError('Por favor, selecciona un método de pago.');
      return;
    }
    if (memberContribution && memberContribution.abonos && selectedAbonoIndex === '') {
      setError('Por favor, selecciona un abono al cual aplicar el pago.');
      return;
    }

    setIsSubmitting(true); // Deshabilitar el botón

    try {
      const mcRef = doc(db, 'member_contributions', memberContributionId);
      const mcSnap = await getDoc(mcRef);

      if (!mcSnap.exists()) {
        setError('Aportación del miembro no encontrada.');
        return; // No retornar setIsSubmitting(false) aquí, se hace en finally
      }

      const currentMemberContribution = mcSnap.data();
      const currentAbonos = [...(currentMemberContribution.abonos || [])];
      
      const batch = writeBatch(db);

      // Lógica de actualización de abono individual
      if (selectedAbonoIndex !== null && selectedAbonoIndex !== undefined && currentAbonos[selectedAbonoIndex]) {
        const abonoToUpdate = currentAbonos[selectedAbonoIndex];
        const amountToAdd = Number(paymentAmount);

        // Validar que el pago no exceda lo pendiente del abono
        const currentAbonoPending = Number(abonoToUpdate.montoAbono) - (Number(abonoToUpdate.montoAbonoPagado) || 0);
        if (amountToAdd > currentAbonoPending + 0.001) { // Pequeña tolerancia para flotantes
          setError(`El monto excede lo pendiente para este abono (Q${currentAbonoPending.toFixed(2)}).`);
          return; // No retornar setIsSubmitting(false) aquí, se hace en finally
        }

        abonoToUpdate.montoAbonoPagado = (Number(abonoToUpdate.montoAbonoPagado) || 0) + amountToAdd;
        abonoToUpdate.estadoAbono = (Number(abonoToUpdate.montoAbono) <= abonoToUpdate.montoAbonoPagado + 0.001) ? 'pagado' : 'parcialmente_pagado';
        abonoToUpdate.fechaPago = new Date(paymentDate); // Usar la fecha del formulario
        abonoToUpdate.metodoPago = paymentMethod;
      } else {
          setError('Debe seleccionar un abono al cual aplicar el pago.');
          return; // No retornar setIsSubmitting(false) aquí, se hace en finally
      }

      // Calcular nuevos totales para member_contribution
      const newTotalPaid = (Number(currentMemberContribution.totalPagado) || 0) + Number(paymentAmount);
      const newTotalPending = Number(currentMemberContribution.montoTotalMiembro) - newTotalPaid;
      const newEstadoPagoMiembro = newTotalPending <= 0.001 ? 'completo' : (newTotalPaid > 0 ? 'parcialmente_pagado' : 'pendiente'); // Tolerancia

      // Actualizar el documento de member_contributions
      batch.update(mcRef, {
        abonos: currentAbonos,
        totalPagado: newTotalPaid,
        totalPendiente: newTotalPending,
        estadoPagoMiembro: newEstadoPagoMiembro,
        updatedAt: serverTimestamp(),
        lastPaymentDate: new Date(paymentDate) // Registrar la última fecha de pago
      });

      // Registrar el pago en la subcolección de pagos
      const paymentsCollectionRef = collection(db, 'member_contributions', memberContributionId, 'payments');
      const newPaymentRef = doc(paymentsCollectionRef); // Firestore auto-generates ID
      batch.set(newPaymentRef, {
        amount: Number(paymentAmount),
        method: paymentMethod,
        date: new Date(paymentDate), // Usar la fecha del formulario
        registeredAt: serverTimestamp(), // Fecha de registro en el servidor
        registeredBy: currentUser ? currentUser.uid : 'anonimo',
        abonoAplicadoIndex: selectedAbonoIndex // Guardar el índice del abono al que se aplicó
      });

      await batch.commit();

      setSuccess('¡Pago registrado exitosamente!');
      setPaymentAmount('');
      setSelectedAbonoIndex('');

      // Recargar los datos para que la UI se actualice
      // Esto hará que el ContributionDetail se re-renderice con los datos actualizados
      // (asumiendo que fetchMemberContribution se pasa como prop o se maneja un estado global)
      // Si fetchMemberContribution no es accesible aquí, navega de vuelta para forzar la recarga
      setTimeout(() => {
        navigate(`/contributions/${contributionId}`);
      }, 1500);

    } catch (err) {
      console.error("Error al registrar el pago:", err);
      setError('Error al registrar el pago. Por favor, intenta de nuevo. ' + err.message);
    } finally {
      setIsSubmitting(false); // Siempre habilitar el botón al finalizar
    }
  };

  if (loading) {
    return <div className="text-center py-8">Cargando detalles de la aportación...</div>;
  }

  if (error && !success) { // Muestra error solo si no hay mensaje de éxito
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error:</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }

  const pendingAbonos = memberContribution?.abonos?.filter(abono => 
    (Number(abono.montoAbono) || 0) > (Number(abono.montoAbonoPagado) || 0) + 0.001
  ) || [];

  return (
    <div className="card-modern p-6">
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Éxito:</strong>
          <span className="block sm:inline"> {success}</span>
        </div>
      )}

      <h2 className="text-lg font-semibold text-gray-800 mb-4">Detalle de Aportación</h2>
      <p className="text-sm text-gray-600 mb-2">Miembro: <span className="font-medium">{memberName}</span></p>
      <p className="text-sm text-gray-600 mb-4">Aportación: <span className="font-medium">{contributionTitle}</span></p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Monto del Abono */}
        <div className="animate-fadeInUp delay-2">
          <label htmlFor="paymentAmount" className="block text-sm font-medium text-gray-700 mb-1">
            Monto del Abono *
          </label>
          <div className="input-with-icon-wrapper">
            <div className="input-icon">
              <CurrencyDollarIcon className="h-5 w-5" />
            </div>
            <input
              type="text" // Cambiado a text
              id="paymentAmount"
              name="paymentAmount"
              value={paymentAmount}
              onChange={(e) => {
                const re = /^[0-9]*\.?[0-9]*$/;
                if (e.target.value === '' || re.test(e.target.value)) {
                  setPaymentAmount(e.target.value);
                }
              }}
              onBlur={(e) => {
                if (e.target.value !== '') {
                  setPaymentAmount(parseFloat(e.target.value).toFixed(2));
                }
              }}
              onWheel={(e) => e.target.blur()} // Deshabilita el scroll
              placeholder="0.00"
              className="input-field-inside flex-1"
              required
            />
          </div>
        </div>

        {/* Método de Pago */}
        <div className="animate-fadeInUp delay-3">
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
              <option value="">Selecciona un método</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Transferencia">Transferencia Bancaria</option>
              <option value="Tarjeta">Tarjeta de Crédito/Débito</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>
        </div>

        {/* Seleccionar Abono a Pagar */}
        {pendingAbonos.length > 0 && (
          <div className="animate-fadeInUp delay-4">
            <label htmlFor="selectedAbono" className="block text-sm font-medium text-gray-700 mb-1">
              Seleccionar Abono a Pagar *
            </label>
            <div className="input-with-icon-wrapper">
              <div className="input-icon">
                <CurrencyDollarIcon className="h-5 w-5" />
              </div>
              <select
                id="selectedAbono"
                name="selectedAbono"
                value={selectedAbonoIndex}
                onChange={(e) => setSelectedAbonoIndex(e.target.value)}
                className="input-field-inside flex-1"
                required
              >
                <option value="">Selecciona un abono pendiente</option>
                {pendingAbonos.map((abono, index) => (
                  <option key={index} value={memberContribution.abonos.indexOf(abono)}>
                    Abono {abono.numeroAbono} - Pendiente: Q{(Number(abono.montoAbono) - (Number(abono.montoAbonoPagado) || 0)).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        {pendingAbonos.length === 0 && (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">Todos los abonos de esta aportación están pagados.</span>
          </div>
        )}


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
            disabled={isSubmitting || pendingAbonos.length === 0} // Deshabilitado si enviando o no hay abonos pendientes
          >
            {isSubmitting ? 'Registrando...' : 'Registrar Pago'}
            <CheckIcon className="h-5 w-5 ml-2 icon-interactive" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default PaymentForm;