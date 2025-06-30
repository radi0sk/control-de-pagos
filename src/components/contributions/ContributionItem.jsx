import { Link } from 'react-router-dom';
import { ClockIcon, CheckCircleIcon, XCircleIcon, CurrencyDollarIcon, CalendarIcon, UsersIcon, ScaleIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline'; // Se agregó ScaleIcon y BuildingOffice2Icon
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const statusStyles = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  aprobada: 'bg-blue-100 text-blue-800',
  rechazada: 'bg-red-100 text-red-800',
  completada: 'bg-green-100 text-green-800',
  // Asegúrate de que 'parcialmente_pagado' también tenga un estilo si lo usas
  parcialmente_pagado: 'bg-orange-100 text-orange-800', 
};

const distributionIcons = {
  igualdad: <UsersIcon className="icon icon-md text-blue-dark icon-interactive" />, // Ícono interactivo
  categoria: <ScaleIcon className="icon icon-md text-blue-dark icon-interactive" />, // Ícono interactivo (cambiado de CurrencyDollarIcon por ScaleIcon para más variedad)
  jaulas: <BuildingOffice2Icon className="icon icon-md text-blue-dark icon-interactive" />, // Ícono interactivo (cambiado de CurrencyDollarIcon por BuildingOffice2Icon)
};

const statusIcons = {
  pendiente: <ClockIcon className="icon icon-md text-yellow-800" />,
  aprobada: <CheckCircleIcon className="icon icon-md text-blue-800" />,
  rechazada: <XCircleIcon className="icon icon-md text-red-800" />,
  completada: <CheckCircleIcon className="icon icon-md text-green-800" />,
  parcialmente_pagado: <ClockIcon className="icon icon-md text-orange-800" />, // Ícono para estado parcial
};

const ContributionItem = ({ contribution }) => {
  // Asegúrate de manejar correctamente el caso en que fechaLimite sea un Timestamp de Firebase
  const formattedDate = contribution.fechaLimite && contribution.fechaLimite.toDate ? format(new Date(contribution.fechaLimite.toDate()), 'dd MMM yyyy', { locale: es }) : 'N/A';
  const createdDate = contribution.fechaCreacion && contribution.fechaCreacion.toDate ? format(new Date(contribution.fechaCreacion.toDate()), 'dd MMM yyyy HH:mm', { locale: es }) : '';

  // Usar estadoGeneral si está disponible, si no, fallback a 'estado'
  const currentStatus = contribution.estadoGeneral || contribution.estado || 'pendiente';

  return (
    <li className="col-span-1 card-modern animate-fadeInUp"> {/* Aplicado card-modern y animación */}
      <Link to={`/contributions/${contribution.id}`} className="block h-full p-4 space-y-3"> {/* Asegura que el Link ocupe todo el espacio de la tarjeta */}
        <div className="flex items-start justify-between">
          <h3 className="text-xl font-semibold text-black-soft truncate">{contribution.titulo}</h3> {/* Título con estilo */}
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[currentStatus] || 'bg-gray-100 text-gray-800'}`}>
            {statusIcons[currentStatus] || <ClockIcon className="icon icon-md text-gray-800" />}
            <span className="ml-1 capitalize">{currentStatus}</span>
          </span>
        </div>

        <p className="text-sm text-gray-600 line-clamp-2">{contribution.descripcion}</p>

        <div className="flex items-center justify-between text-gray-700">
          <div className="flex items-center space-x-2">
            <CurrencyDollarIcon className="icon icon-md text-blue-dark icon-interactive" /> {/* Ícono interactivo */}
            <span className="text-lg font-bold text-blue-dark">
              Q{parseFloat(contribution.costoTotal).toFixed(2)} {/* Formatear a 2 decimales */}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {distributionIcons[contribution.tipoDistribucion] || <UsersIcon className="icon icon-md text-blue-dark" />}
            <span className="text-sm text-gray-700 capitalize">
              {contribution.tipoDistribucion}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-gray-700">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="icon icon-md text-blue-dark icon-interactive" /> {/* Ícono interactivo */}
            <span className="text-sm text-gray-700">
              {formattedDate}
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <UsersIcon className="icon icon-md text-blue-dark icon-interactive" /> {/* Ícono interactivo */}
            <span className="text-sm text-gray-700">
              {contribution.miembrosParticipantesIds?.length || 0} miembros
            </span>
          </div>
        </div>

        {createdDate && (
          <div className="text-xs text-gray-500 mt-2">
            Creado el {createdDate} por {contribution.creadoPor}
          </div>
        )}
      </Link>
    </li>
  );
};

export default ContributionItem;
