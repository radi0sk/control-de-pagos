import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import ContributionItem from './ContributionItem';
import { MagnifyingGlassIcon, FunnelIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';

const ContributionList = () => {
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [sortField, setSortField] = useState('fechaCreacion');
  const [sortDirection, setSortDirection] = useState('desc');

  // Obtener aportaciones de Firestore
  useEffect(() => {
    setLoading(true);
    const contributionsRef = collection(db, 'contributions');
    // IMPORTANTE: orderBy() en Firestore puede requerir índices compuestos si combinas
    // con where() en consultas más complejas. Para este caso, solo ordenar por un campo
    // no debería causar problemas de índice inicial.
    let q = query(contributionsRef, orderBy(sortField, sortDirection));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const contributionsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setContributions(contributionsData);
      setLoading(false);
    }, (error) => {
        console.error("Error al cargar aportaciones:", error);
        // Manejo de errores para onSnapshot, si es necesario
        setLoading(false);
    });

    return () => unsubscribe();
  }, [sortField, sortDirection]);

  // Filtrar contribuciones en memoria (después de obtenerlas)
  const filteredContributions = contributions
    .filter(contribution => {
      // Usar 'estadoGeneral' si existe, de lo contrario 'estado'
      const currentStatus = contribution.estadoGeneral || contribution.estado; 
      const matchesSearch = contribution.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           contribution.descripcion?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'todos' || currentStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc'); // Predeterminado a descendente para la nueva clasificación
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="spinner"></div> {/* Spinner personalizado de App.css */}
        <span className="ml-4 text-gray-600">Cargando aportaciones...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeInUp"> {/* Animación de entrada */}
      {/* Controles de búsqueda y filtrado */}
      <div className="card-modern p-4 animate-fadeInUp delay-1"> {/* Estilo de tarjeta moderna y animación */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative flex-1 input-with-icon-wrapper"> {/* Estilo de input con ícono */}
            <div className="input-icon">
              <MagnifyingGlassIcon className="h-5 w-5 icon-interactive" /> {/* Ícono interactivo */}
            </div>
            <input
              type="text"
              placeholder="Buscar aportaciones..."
              className="input-field-inside w-full" // Estilo de input mejorado
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <FunnelIcon className="h-5 w-5 text-blue-dark mr-2 icon-interactive" /> {/* Ícono interactivo */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-field pr-10" // Estilo de input mejorado
              >
                <option value="todos">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="aprobada">Aprobada</option>
                <option value="rechazada">Rechazada</option>
                <option value="completada">Completada</option>
                <option value="parcialmente_pagado">Parcialmente Pagado</option> {/* Nuevo estado */}
              </select>
            </div>

            <button
              onClick={() => handleSort('fechaCreacion')}
              className="btn-secondary-outline inline-flex items-center text-sm" // Estilo de botón secundario
            >
              Ordenar por fecha
              {sortField === 'fechaCreacion' ? (
                sortDirection === 'asc' ? (
                  <ArrowUpIcon className="h-5 w-5 ml-2 icon-interactive" /> 
                ) : (
                  <ArrowDownIcon className="h-5 w-5 ml-2 icon-interactive" /> 
                )
              ) : null}
            </button>
          </div>
        </div>
      </div>

      {/* Lista de aportaciones */}
      {filteredContributions.length === 0 ? (
        <div className="card-modern text-center py-12 animate-fadeInUp delay-2"> {/* Estilo de tarjeta moderna y animación */}
          <p className="text-gray-600">
            {contributions.length === 0 
              ? 'No hay aportaciones registradas aún.' 
              : 'No se encontraron aportaciones con los filtros aplicados.'}
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredContributions.map(contribution => (
            <ContributionItem key={contribution.id} contribution={contribution} />
          ))}
        </ul>
      )}
    </div>
  );
};

export default ContributionList;
