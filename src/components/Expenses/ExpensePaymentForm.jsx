import { useState, useEffect } from 'react';
import { doc, getDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
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
  const [paymentDate, setPaymentDate] = useState('');

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
          setPaymentDate(new Date().toISOString().slice(0, 16)); // Fecha y hora actual por defecto
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
    if (!expense) {
      setError('Error: Datos del gasto no cargados.');
      return;
    }

    const amountPaidInput = parseFloat(paymentAmount);
    const currentExpenseTotal = parseFloat(expense.monto);
    
    // Calcular el total ya pagado de este gasto
    const currentPaidForExpense = expense.abonos?.reduce((sum, abono) => 
      sum + (abono.montoAbonoPagado || (abono.estadoAbono === 'pagado' ? abono.montoAbono : 0)), 0
    ) || 0;

    const currentPendingForExpense = currentExpenseTotal - currentPaidForExpense;

    if (amountPaidInput > currentPendingForExpense + 0.01) { // Pequeña tolerancia
      setError(`El monto ingresado (Q${amountPaidInput.toFixed(2)}) excede el total pendiente (Q${currentPendingForExpense.toFixed(2)}) para este gasto.`);
      return;
    }

    try {
      const batch = writeBatch(db);
      const expenseRef = doc(db, 'expenses', expenseId);

      // Copia profunda del array de abonos
      const updatedAbonos = expense.abonos ? [...expense.abonos] : [];

      // Si no hay abonos o solo hay un abono inicial (como se crea en ExpenseForm)
      // asumimos que el pago se aplica al primer/único abono.
      if (updatedAbonos.length === 0) {
        // Esto no debería ocurrir si ExpenseForm inicializa un abono, pero es una salvaguarda
        updatedAbonos.push({
          numeroAbono: 1,
          montoAbono: currentExpenseTotal, // El monto original del gasto
          montoAbonoPagado: 0,
          estadoAbono: "pendiente",
          fechaPago: null,
          metodoPago: null,
          registradoPor: null,
          fechaRegistroPago: null,
          comprobanteUrl: null // Si se manejan comprobantes por abono
        });
      }

      let remainingAmountToApply = amountPaidInput;

      // Aplicar el pago al primer abono pendiente/parcialmente pagado
      // En el caso de gastos, normalmente solo hay un abono que representa el total
      const firstAbono = updatedAbonos[0]; 
      if (firstAbono) {
        const abonoRemaining = firstAbono.montoAbono - (firstAbono.montoAbonoPagado || 0);

        if (remainingAmountToApply >= abonoRemaining) {
          // Paga el abono completamente
          firstAbono.montoAbonoPagado = firstAbono.montoAbono;
          firstAbono.estadoAbono = 'pagado';
          firstAbono.fechaPago = new Date(paymentDate);
          firstAbono.metodoPago = paymentMethod;
          firstAbono.registradoPor = currentUser?.displayName || 'Desconocido';
          firstAbono.fechaRegistroPago = new Date(); // Changed from serverTimestamp()
          remainingAmountToApply -= abonoRemaining;
        } else {
          // Pago parcial
          firstAbono.montoAbonoPagado = (firstAbono.montoAbonoPagado || 0) + remainingAmountToApply;
          firstAbono.estadoAbono = 'parcialmente_pagado';
          firstAbono.fechaPago = new Date(paymentDate);
          firstAbono.metodoPago = paymentMethod;
          firstAbono.registradoPor = currentUser?.displayName || 'Desconocido';
          firstAbono.fechaRegistroPago = new Date(); // Changed from serverTimestamp()
          remainingAmountToApply = 0;
        }
      }

      // Determinar el nuevo estado de pago del gasto
      let newEstadoPagoGasto;
      const totalPaidAfterUpdate = updatedAbonos.reduce((sum, abono) => 
        sum + (abono.montoAbonoPagado || (abono.estadoAbono === 'pagado' ? abono.montoAbono : 0)), 0
      );

      if (totalPaidAfterUpdate >= currentExpenseTotal) {
        newEstadoPagoGasto = 'pagado';
      } else if (totalPaidAfterUpdate > 0) {
        newEstadoPagoGasto = 'parcialmente_pagado';
      } else {
        newEstadoPagoGasto = 'pendiente';
      }

      // Actualizar el documento del gasto
      batch.update(expenseRef, {
        abonos: updatedAbonos,
        estadoPagoGasto: newEstadoPagoGasto,
        fechaActualizacion: serverTimestamp(),
      });

      await batch.commit();

      setSuccess('Pago de gasto registrado exitosamente!');
      setPaymentAmount(''); // Limpiar el monto
      setPaymentMethod(''); // Limpiar el método
      setTimeout(() => navigate('/expenses'), 2000); // Redirigir a la lista de gastos
    } catch (err) {
      console.error("Error al registrar pago de gasto:", err);
      setError('Error al registrar el pago del gasto. Por favor, intente nuevamente.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="spinner"></div>
        <span className="ml-4 text-gray-600">Cargando formulario de pago de gasto...</span>
      </div>
    );
  }

  if (error && !expense) { 
    return (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-start animate-fadeInUp">
            <XMarkIcon className="h-5 w-5 mr-2" />
            <span><strong className="font-bold">Error:</strong> {error}</span>
        </div>
    );
  }

  const currentPaidForExpense = expense?.abonos?.reduce((sum, abono) => 
    sum + (abono.montoAbonoPagado || (abono.estadoAbono === 'pagado' ? abono.montoAbono : 0)), 0
  ) || 0;
  const currentPendingForExpense = (expense?.monto || 0) - currentPaidForExpense;


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

      {/* Sección de Resumen del Gasto */}
      <div className="card-modern p-4 rounded-md animate-fadeInUp delay-1">
        <p className="text-sm text-gray-700"><span className="font-semibold text-blue-dark">Descripción del Gasto:</span> {expense?.descripcion}</p>
        <p className="text-sm text-gray-700"><span className="font-semibold text-blue-dark">Proveedor:</span> {expense?.proveedor}</p>
        <p className="text-sm text-gray-700"><span className="font-semibold text-blue-dark">Monto Total del Gasto:</span> Q{expense?.monto?.toFixed(2)}</p>
        <p className="text-sm text-gray-700"><span className="font-semibold text-blue-dark">Pagado hasta ahora:</span> Q{currentPaidForExpense.toFixed(2)}</p>
        <p className="text-base text-gray-900"><span className="font-semibold text-red-dark">Pendiente por Pagar:</span> Q{currentPendingForExpense.toFixed(2)}</p>
      </div>

      {/* Monto del Pago */}
      <div className="animate-fadeInUp delay-2">
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
        >
          <CheckIcon className="h-5 w-5 mr-2 icon-interactive" />
          Registrar Pago
        </button>
      </div>
    </form>
  );
};

export default ExpensePaymentForm;
