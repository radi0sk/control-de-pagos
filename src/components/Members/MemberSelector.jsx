import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { CheckIcon, UserIcon, UsersIcon, TagIcon, Square3Stack3DIcon, UserMinusIcon } from '@heroicons/react/24/outline'; // Importamos más iconos

const MemberSelector = ({ onMembersSelected, initialSelected = [] }) => {
  const [members, setMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState(initialSelected);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Obtener miembros de Firestore
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoading(true);
        const membersRef = collection(db, 'miembros');
        // Filtrar solo miembros activos
        const q = query(membersRef, where("activo", "==", true));
        const querySnapshot = await getDocs(q);
        
        const membersData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.nombre || 'Sin nombre',
            lastName: data.apellido || '',
            category: data.categoria || '',
            cages: data.cantidadJaulas || 0,
            active: data.activo || false
          };
        });
        
        setMembers(membersData);
        setError(null);
      } catch (error) {
        console.error("Error al obtener miembros:", error);
        setError(`Error al cargar miembros: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, []);

  // Notificar cambios en la selección y calcular estadísticas
  useEffect(() => {
    const selectedMembersData = members.filter(member => 
      selectedMembers.includes(member.id)
    );
    
    const totalJaulas = selectedMembersData.reduce(
      (sum, member) => sum + (member.cages || 0), 0
    );
    
    const categoriasCount = selectedMembersData.reduce((acc, member) => {
      const categoria = member.category?.toLowerCase() || 'sin_categoria';
      acc[categoria] = (acc[categoria] || 0) + 1;
      return acc;
    }, {});
    
    onMembersSelected({
      memberIds: selectedMembers,
      totalJaulas,
      categorias: {
        grande: categoriasCount.grande || 0,
        mediano: categoriasCount.mediano || 0,
        pequeño: categoriasCount.pequeño || 0
      }
    });
  }, [selectedMembers, members, onMembersSelected]);


  const toggleMemberSelection = (memberId) => {
    setSelectedMembers(prev => {
      const newSelection = prev.includes(memberId) 
        ? prev.filter(id => id !== memberId) 
        : [...prev, memberId];
      return newSelection;
    });
  };

  const toggleSelectAll = () => {
    setSelectedMembers(prev => {
      const newSelection = prev.length === filteredMembers.length // Check against filtered members
        ? [] 
        : filteredMembers.map(member => member.id); // Select only filtered members
      return newSelection;
    });
  };

  // Filtrar miembros según término de búsqueda
  const filteredMembers = members.filter(member => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      member.name.toLowerCase().includes(searchTermLower) ||
      (member.lastName && member.lastName.toLowerCase().includes(searchTermLower)) ||
      member.category?.toLowerCase().includes(searchTermLower) // Permitir búsqueda por categoría
    );
  });

  if (loading) return (
    <div className="flex justify-center items-center py-4">
      <div className="spinner"></div>
      <span className="ml-2 text-gray-600">Cargando miembros...</span>
    </div>
  );
  if (error) return (
    <div className="text-center py-4 text-red-700 bg-red-50 border border-red-200 rounded-lg">
      {error}
    </div>
  );

  return (
    <div className="space-y-4 animate-fadeInUp"> {/* Animación de entrada */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Barra de búsqueda */}
        <div className="relative flex-1 w-full sm:w-auto input-with-icon-wrapper">
          <div className="input-icon">
            <UserIcon className="h-5 w-5" />
          </div>
          <input
            type="text"
            placeholder="Buscar miembros..."
            className="input-field-inside w-full" // Aplicar estilo de input mejorado
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {/* Botón Seleccionar/Deseleccionar todos */}
        <button
          onClick={toggleSelectAll}
          className="btn-secondary-outline inline-flex items-center w-full sm:w-auto justify-center" // Estilo de botón secundario
        >
          <UsersIcon className="h-5 w-5 mr-2 icon-interactive" /> {/* Ícono interactivo */}
          {selectedMembers.length === filteredMembers.length && filteredMembers.length > 0 ? 'Deseleccionar todos' : 'Seleccionar todos'}
        </button>
      </div>

      {/* Lista de miembros */}
      <div className="max-h-96 overflow-y-auto card-modern p-2"> {/* Estilo de tarjeta moderna */}
        {filteredMembers.length === 0 ? (
          <div className="p-4 text-center text-gray-600">
            {members.length === 0 ? 'No hay miembros activos disponibles.' : 'No se encontraron miembros con ese nombre o categoría.'}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredMembers.map(member => (
              <li key={member.id} className="py-2 hover:bg-gray-50 transition-colors duration-200">
                <label className="flex items-center p-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(member.id)}
                    onChange={() => toggleMemberSelection(member.id)}
                    className="h-5 w-5 text-blue-dark rounded focus:ring-blue-dark border-gray-300 icon-interactive" // Estilo de checkbox
                  />
                  <div className="ml-3 flex-1">
                    <p className="font-medium text-gray-900">
                      {member.name} {member.lastName}
                    </p>
                    <div className="flex flex-wrap items-center text-sm text-gray-600 mt-1 gap-x-3">
                      {member.category && (
                        <span className="inline-flex items-center">
                          <TagIcon className="h-4 w-4 mr-1 text-blue-dark" /> Categoría: {member.category}
                        </span>
                      )}
                      {member.cages > 0 && (
                        <span className="inline-flex items-center">
                          <Square3Stack3DIcon className="h-4 w-4 mr-1 text-blue-dark" /> Jaulas: {member.cages}
                        </span>
                      )}
                      {!member.active && (
                        <span className="inline-flex items-center text-red-500 font-semibold">
                          <UserMinusIcon className="h-4 w-4 mr-1" /> Inactivo
                        </span>
                      )}
                    </div>
                  </div>
                  {selectedMembers.includes(member.id) && (
                    <CheckIcon className="h-6 w-6 text-green-500 icon-interactive" /> 
                  )}
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Resumen de selección */}
      <div className="text-sm text-gray-700 mt-4 px-2">
        <span className="font-semibold">{selectedMembers.length}</span> {selectedMembers.length === 1 ? 'miembro seleccionado' : 'miembros seleccionados'} de {members.length} activos.
      </div>
    </div>
  );
};

export default MemberSelector;
