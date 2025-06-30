import { Link, useParams } from 'react-router-dom';
import PaymentForm from '../components/Payments/PaymentForm'; // Asumiendo esta ruta
import { ArrowLeftIcon, XMarkIcon } from '@heroicons/react/24/outline'; // Importamos XMarkIcon para errores

const RegisterPaymentPage = () => {
  const { contributionId, memberContributionId } = useParams();

  if (!contributionId || !memberContributionId) {
    return (
      <div className="container mx-auto px-4 py-8 animate-fadeInUp"> {/* Animación de entrada */}
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative flex items-start" role="alert">
          <XMarkIcon className="h-5 w-5 mr-2" />
          <div>
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline"> Faltan parámetros para registrar el pago (ID de Aportación o ID de Aportación del Miembro).</span>
          </div>
        </div>
        <div className="mt-4">
          <Link to="/contributions" className="inline-flex items-center btn-secondary-outline"> {/* Estilo de botón secundario */}
            <ArrowLeftIcon className="h-4 w-4 mr-1 icon-interactive" /> Volver a Aportaciones
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 animate-fadeInUp"> {/* Animación de entrada */}
      <div className="mb-6">
        {/* Enlace para volver a los detalles de la aportación específica */}
        <Link 
          to={`/contributions/${contributionId}`} 
          className="inline-flex items-center btn-secondary-outline" // Estilo de botón secundario
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1 icon-interactive" /> Volver a Detalles de Aportación
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="main-header-title text-gray-900">Registrar Pago</h1> {/* Título principal */}
          <p className="text-sm text-gray-500 mt-1">
            Complete el formulario para registrar un pago de aportación.
          </p>
        </div>
      </div>

      <div className="card-modern p-6 animate-fadeInUp delay-1"> {/* Estilo de tarjeta moderna y animación */}
        <PaymentForm 
          contributionId={contributionId} 
          memberContributionId={memberContributionId} 
        />
      </div>
    </div>
  );
};

export default RegisterPaymentPage;
