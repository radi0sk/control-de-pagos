import { Link, useParams } from 'react-router-dom';
import ExpensePaymentForm from '../components/Expenses/ExpensePaymentForm';
import { ArrowLeftIcon, XMarkIcon } from '@heroicons/react/24/outline';

const RegisterExpensePaymentPage = () => {
  const { expenseId } = useParams(); // Obtener el ID del gasto de la URL

  if (!expenseId) {
    return (
      <div className="container mx-auto px-4 py-8 animate-fadeInUp">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative flex items-start" role="alert">
          <XMarkIcon className="h-5 w-5 mr-2" />
          <div>
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline"> Falta el parámetro de ID del gasto para registrar el pago.</span>
          </div>
        </div>
        <div className="mt-4">
          <Link to="/expenses" className="inline-flex items-center btn-secondary-outline">
            <ArrowLeftIcon className="h-4 w-4 mr-1 icon-interactive" /> Volver a Gastos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 animate-fadeInUp">
      <div className="mb-6">
        <Link 
          to="/expenses" 
          className="inline-flex items-center btn-secondary-outline"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1 icon-interactive" /> Volver a Gastos
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="main-header-title text-gray-900">Registrar Pago de Gasto</h1>
          <p className="text-sm text-gray-500 mt-1">
            Complete el formulario para registrar un pago para este gasto.
          </p>
        </div>
      </div>

      <div className="card-modern p-6 animate-fadeInUp delay-1">
        <ExpensePaymentForm expenseId={expenseId} />
      </div>
    </div>
  );
};

export default RegisterExpensePaymentPage;
