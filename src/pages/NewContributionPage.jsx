import { Link } from 'react-router-dom';
import ContributionForm from '../components/contributions/ContributionForm';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const NewContributionPage = () => {
  return (
    <div className="container mx-auto px-4 py-8 animate-fadeInUp"> {/* Animación de entrada */}
      <div className="mb-6">
        <Link 
          to="/contributions" 
          className="inline-flex items-center btn-secondary-outline" // Estilo de botón secundario
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2 icon-interactive" /> {/* Ícono interactivo */}
          Volver a Aportaciones
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="main-header-title text-gray-900">Nueva Aportación</h1> {/* Título principal */}
          <p className="text-sm text-gray-500 mt-1">
            Complete el formulario para crear una nueva aportación colectiva
          </p>
        </div>
      </div>

      <div className="card-modern p-6 animate-fadeInUp delay-1"> {/* Estilo de tarjeta moderna y animación */}
        <ContributionForm />
      </div>
    </div>
  );
};

export default NewContributionPage;
