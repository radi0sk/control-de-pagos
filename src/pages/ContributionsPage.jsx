import { Link } from 'react-router-dom';
import ContributionList from '../components/contributions/ContributionList';
import { PlusIcon } from '@heroicons/react/24/outline';

const ContributionsPage = () => {
  return (
    <div className="container mx-auto px-4 py-8 animate-fadeInUp">
      {/* Encabezado mejorado con los estilos de App.css */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div className="main-header-section">
          <h1 className="main-header-title">Aportaciones</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestión de aportaciones colectivas de los miembros
          </p>
        </div>
        
        {/* Botón mejorado con el gradiente */}
        <Link 
          to="/contributions/new" 
          className="btn-primary-gradient inline-flex items-center gap-2"
        >
          <PlusIcon className="icon icon-md text-white" />
          Nueva Aportación
        </Link>
      </div>

      {/* Contenedor de la lista con estilos de tarjeta moderna */}
      <div className="card-modern p-6">
        <ContributionList />
      </div>

      {/* Efecto de hover para la tarjeta (ya incluido en card-modern) */}
    </div>
  );
};

export default ContributionsPage;