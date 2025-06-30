import { useState, useEffect } from 'react';
import { addMember, getMembers, updateMember, deleteMember } from '../services/membersService.js';
import {  serverTimestamp } from 'firebase/firestore';


import { PlusCircleIcon, PhoneIcon, EnvelopeIcon, BuildingOffice2Icon, CheckCircleIcon, XCircleIcon, TrashIcon, UserMinusIcon, UserPlusIcon } from '@heroicons/react/24/outline'; // Importamos más iconos para mejorar la UI

const MembersPage = () => {

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    cantidadJaulas: 0,
    activo: true
  });

  // Determinar categoría basada en cantidad de jaulas
  const determinarCategoria = (jaulas) => {
    if (jaulas >= 26 && jaulas <= 100) return 'grande';
    if (jaulas >= 10 && jaulas <= 25) return 'mediano';
    if (jaulas >= 1 && jaulas <= 9) return 'pequeño';
    return 'pequeño'; // Valor por defecto
  };

  // Cargar miembros al montar el componente
  useEffect(() => {
    const loadMembers = async () => {
      try {
        const membersData = await getMembers();
        setMembers(membersData);
        setLoading(false);
      } catch (err) {
        setError('Error al cargar los miembros');
        setLoading(false);
        console.error(err);
      }
    };

    loadMembers();
  }, []);

  // Manejar cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Formatear teléfono automáticamente
    if (name === 'telefono') {
      const cleaned = value.replace(/\D/g, ''); // Eliminar cualquier caracter que no sea número
      const formatted = cleaned.slice(0, 8); // Limitar a 8 dígitos (formato de Guatemala)
      setFormData({
        ...formData,
        [name]: formatted
      });
      return;
    }
    
    // Para cantidad de jaulas, convertir a número
    if (name === 'cantidadJaulas') {
      setFormData({
        ...formData,
        [name]: parseInt(value) || 0
      });
      return;
    }
    
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null); // Resetear errores
    
    if (!formData.nombre || !formData.telefono) {
      setError('Nombre y teléfono son obligatorios.');
      return;
    }
    
    try {
      const memberToAdd = {
        ...formData,
        telefono: `+502${formData.telefono}`, // Agregar código de país
        categoria: determinarCategoria(formData.cantidadJaulas),
        fechaRegistro: serverTimestamp(),
        activo: true
      };
      
      const result = await addMember(memberToAdd);
      
      if (result.success) {
        // Actualizar la lista de miembros
        const updatedMembers = await getMembers();
        setMembers(updatedMembers);
        // Resetear formulario
        setFormData({
          nombre: '',
          email: '',
          telefono: '',
          cantidadJaulas: 0,
          activo: true
        });
        setShowForm(false);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Error al agregar el miembro. Por favor, intente de nuevo.');
      console.error(err);
    }
  };

  // Manejar cambio de estado activo/inactivo
  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await updateMember(id, { activo: !currentStatus });
      const updatedMembers = await getMembers();
      setMembers(updatedMembers);
    } catch (err) {
      setError('Error al actualizar el estado del miembro.');
      console.error(err);
    }
  };

  // Manejar eliminación de miembro
  const handleDelete = async (id) => {
    // Reemplazar window.confirm por un modal o UI personalizada para mejor UX
    const userConfirmed = window.confirm('¿Estás seguro de eliminar este miembro? Esta acción no se puede deshacer.'); 
    
    if (userConfirmed) {
      try {
        await deleteMember(id);
        const updatedMembers = await getMembers();
        setMembers(updatedMembers);
      } catch (err) {
        setError('Error al eliminar el miembro. Por favor, intente de nuevo.');
        console.error(err);
      }
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-screen"> {/* Spinner centrado */}
      <div className="spinner"></div> {/* Spinner personalizado de App.css */}
      <span className="ml-4 text-gray-600">Cargando miembros...</span>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8 animate-fadeInUp"> {/* Animación de entrada */}
      <h1 className="main-header-title mb-6">Gestión de Miembros</h1> {/* Título principal */}
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-start">
          <XCircleIcon className="h-5 w-5 mr-2" />
          <span>{error}</span>
        </div>
      )}

      <div className="mb-6">
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary-gradient inline-flex items-center" // Estilo de botón
        >
          <PlusCircleIcon className="h-5 w-5 mr-2 icon-interactive" /> {/* Ícono interactivo */}
          {showForm ? 'Cerrar Formulario' : 'Agregar Nuevo Miembro'}
        </button>
      </div>
      
      {showForm && (
        <div className="card-modern p-6 mb-8 animate-fadeInUp delay-1"> {/* Estilo de tarjeta moderna y animación */}
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Nuevo Miembro</h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  className="input-field w-full" // Estilo de input mejorado
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono *</label>
                <div className="input-with-icon-wrapper"> {/* Contenedor de input con ícono */}
                  <div className="input-icon">
                    <PhoneIcon className="h-5 w-5" />
                  </div>
                  <span className="text-gray-500 pl-2 pr-1">+502</span> {/* Prefijo fijo */}
                  <input
                    type="tel"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleInputChange}
                    className="input-field-inside flex-1" // Input dentro del wrapper
                    maxLength={8}
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="input-with-icon-wrapper">
                  <div className="input-icon">
                    <EnvelopeIcon className="h-5 w-5" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="input-field-inside flex-1" // Input dentro del wrapper
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad de Jaulas *</label>
                <div className="input-with-icon-wrapper">
                  <div className="input-icon">
                    <BuildingOffice2Icon className="h-5 w-5" />
                  </div>
                  <input
                    type="number"
                    name="cantidadJaulas"
                    value={formData.cantidadJaulas}
                    onChange={handleInputChange}
                    min="1"
                    className="input-field-inside flex-1" // Input dentro del wrapper
                    required
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              <button
                type="submit"
                className="btn-primary-gradient inline-flex items-center" // Estilo de botón
              >
                <CheckCircleIcon className="h-5 w-5 mr-2 icon-interactive" /> {/* Ícono interactivo */}
                Guardar Miembro
              </button>
            </div>
          </form>
        </div>
      )}
      
      <div className="card-modern rounded-lg shadow overflow-hidden animate-fadeInUp delay-2"> {/* Estilo de tarjeta moderna y animación */}
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jaulas</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {members.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-4 text-center text-gray-500">No hay miembros registrados</td>
              </tr>
            ) : (
              members.map((member) => (
                <tr key={member.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">{member.nombre}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">{member.telefono}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">{member.email || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">{member.cantidadJaulas}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full font-semibold ${
                      member.categoria === 'grande' ? 'bg-purple-100 text-purple-800' :
                      member.categoria === 'mediano' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {member.categoria}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full font-semibold ${
                      member.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {member.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap space-x-2">
                    <button
                      onClick={() => handleToggleStatus(member.id, member.activo)}
                      className={`btn-secondary-outline inline-flex items-center text-xs px-2 py-1 ${
                        member.activo ? 'text-yellow-800 border-yellow-800 hover:bg-yellow-800 hover:text-white' : 'text-green-800 border-green-800 hover:bg-green-800 hover:text-white'
                      }`}
                    >
                      {member.activo ? <UserMinusIcon className="h-4 w-4 mr-1 icon-interactive" /> : <UserPlusIcon className="h-4 w-4 mr-1 icon-interactive" />}
                      {member.activo ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      onClick={() => handleDelete(member.id)}
                      className="btn-secondary-outline inline-flex items-center text-xs px-2 py-1 text-red-800 border-red-800 hover:bg-red-800 hover:text-white"
                    >
                      <TrashIcon className="h-4 w-4 mr-1 icon-interactive" />
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MembersPage;
