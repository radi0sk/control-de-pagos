import { useState, useEffect } from 'react';
import { doc, getDoc, writeBatch, serverTimestamp, collection } from 'firebase/firestore'; // Importar 'collection'
import { db } from '../../firebase/firebaseConfig.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { CheckIcon, XMarkIcon, CalendarDaysIcon, CurrencyDollarIcon, CreditCardIcon } from '@heroicons/react/24/outline';

const ExpensePaymentForm = ({ expenseId }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estados del formulario para el pago
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 16));

  // Nuevo estado para controlar el envío del formulario
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchExpense = async () => {
      try {
        setLoading(true);
        setError('');
        const expenseRef = doc(db, 'expenses', expenseId);
        const expenseSnap = await getDoc(expenseRef);

        if (expenseSnap.exists()) {
          const data = expenseSnap.data();
          setExpense(data);
          setPaymentDate(new Date().toISOString().slice(0, 16)); // Fecha y hora actual
        } else {
          setError('Gasto no encontrado.');
        }
      } catch (err) {
        console.error("Error al cargar el gasto:", err);
        setError('Error al cargar los detalles del gasto.');
      } finally {
        setLoading(false);
      }
    };

    if (expenseId) {
      fetchExpense();
    }
  }, [expenseId]);

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

    setIsSubmitting(true); // Deshabilitar el botón

    try {
      const expenseRef = doc(db, 'expenses', expenseId);
      const expenseSnap = await getDoc(expenseRef);

      if (!expenseSnap.exists()) {
        setError('Gasto no encontrado.');
        return;
      }

      const currentExpense = expenseSnap.data();
      const batch = writeBatch(db);

      const amountToAdd = Number(paymentAmount);
      const currentPaid = Number(currentExpense.totalPagado) || 0;
      const currentPending = Number(currentExpense.monto) - currentPaid;

      if (amountToAdd > currentPending + 0.001) { // Pequeña tolerancia para flotantes
        setError(`El monto excede lo pendiente para este gasto (Q${currentPending.toFixed(2)}).`);
        return;
      }

      const newTotalPaid = currentPaid + amountToAdd;
      const newTotalPending = Number(currentExpense.monto) - newTotalPaid;
      const newEstadoPagoGasto = newTotalPending <= 0.001 ? 'pagado' : (newTotalPaid > 0 ? 'parcialmente_pagado' : 'pendiente'); // Tolerancia

      // Actualizar el estado de los abonos
      const updatedAbonos = [...(currentExpense.abonos || [])];
      let remainingAmountToApply = amountToAdd;

      for (let i = 0; i < updatedAbonos.length; i++) {
        let abono = updatedAbonos[i];
        const abonoPaid = Number(abono.montoAbonoPagado) || 0;
        const abonoTotal = Number(abono.montoAbono) || 0;
        const abonoPending = abonoTotal - abonoPaid;

        if (abonoPending > 0.001 && remainingAmountToApply > 0) {
          const amountForThisAbono = Math.min(remainingAmountToApply, abonoPending);
          abono.montoAbonoPagado = abonoPaid + amountForThisAbono;
          abono.estadoAbono = (abonoTotal <= abono.montoAbonoPagado + 0.001) ? 'pagado' : 'parcialmente_pagado';
          if (!abono.fechaPago) abono.fechaPago = new Date(paymentDate); // Solo la primera vez
          abono.metodoPago = paymentMethod;

          remainingAmountToApply -= amountForThisAbono;
        }
      }

      batch.update(expenseRef, {
        abonos: updatedAbonos,
        totalPagado: newTotalPaid,
        totalPendiente: newTotalPending,
        estadoPagoGasto: newEstadoPagoGasto,
        updatedAt: serverTimestamp(),
        lastPaymentDate: new Date(paymentDate)
      });

      // Registrar el pago en la subcolección de pagos para este gasto
      const newExpensePaymentRef = doc(collection(db, 'expenses', expenseId, 'payments')); // Auto-generar ID
      batch.set(newExpensePaymentRef, {
        amount: amountToAdd,
        method: paymentMethod,
        date: new Date(paymentDate),
        registeredAt: serverTimestamp(),
        registeredBy: currentUser ? currentUser.uid : 'anonimo', // Usando currentUser aquí
      });


      await batch.commit();

      setSuccess('¡Pago registrado exitosamente!');
      setPaymentAmount('');
      setPaymentMethod('');

      setTimeout(() => {
        navigate('/expenses'); // Redirigir a la lista de gastos
      }, 1500);

    } catch (err) {
      console.error("Error al registrar el pago del gasto:", err);
      setError('Error al registrar el pago. Por favor, intenta de nuevo. ' + err.message);
    } finally {
      setIsSubmitting(false); // Siempre habilitar el botón al finalizar
    }
  };

  if (loading) {
    return <div className="text-center py-8">Cargando detalles del gasto...</div>;
  }

  if (error && !success) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error:</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }

  const expensePendingAmount = (Number(expense?.monto) || 0) - (Number(expense?.totalPagado) || 0);

  return (
    <div className="card-modern p-6">
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Éxito:</strong>
          <span className="block sm:inline"> {success}</span>
        </div>
      )}

      <h2 className="text-lg font-semibold text-gray-800 mb-4">Registrar Pago de Gasto</h2>
      {expense && (
        <>
          <p className="text-sm text-gray-600 mb-2">Descripción: <span className="font-medium">{expense.descripcion}</span></p>
          <p className="text-sm text-gray-600 mb-4">Monto Pendiente: <span className="font-medium text-red-600">Q{expensePendingAmount.toFixed(2)}</span></p>
        </>
      )}

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
              type="text"
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
              onWheel={(e) => e.target.blur()}
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
              <option value="Otro">Otro</option>
            </select>
          </div>
        </div>

        {/* Fecha y Hora del Pago */}
        <div className="animate-fadeInUp delay-4">
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
        <div className="flex justify-between pt-6 border-t animate-fadeInUp delay-5">
          <button
            type="button"
            onClick={() => navigate('/expenses')}
            className="btn-secondary-outline inline-flex items-center"
          >
            <XMarkIcon className="h-5 w-5 mr-2 icon-interactive" />
            Cancelar
          </button>
          <button
            type="submit"
            className="btn-primary-gradient inline-flex items-center"
            disabled={isSubmitting || expensePendingAmount <= 0}
          >
            {isSubmitting ? 'Registrando...' : 'Registrar Pago'}
            <CheckIcon className="h-5 w-5 ml-2 icon-interactive" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ExpensePaymentForm;