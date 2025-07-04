// src/pages/MembersPage.jsx
import React, { useState, useEffect } from 'react';
import { getMembers, updateMember, deleteMember } from '../services/membersService.js';
import { addDoc, collection, serverTimestamp, writeBatch, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig.js';
import ContributionAssignment from '../components/Members/ContributionAssignment.jsx';

import { PlusCircleIcon, PhoneIcon, EnvelopeIcon, BuildingOffice2Icon, CheckCircleIcon, XCircleIcon, TrashIcon, UserMinusIcon, UserPlusIcon, EyeIcon } from '@heroicons/react/24/outline'; // Import EyeIcon
import { Link } from 'react-router-dom'; // Import Link

const MembersPage = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [memberType, setMemberType] = useState('founding');
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    cantidadJaulas: 0,
    activo: true,
    categoria: 'pequeño'
  });
  const [selectedContributionsForNewMember, setSelectedContributionsForNewMember] = useState([]);

  const determinarCategoria = (jaulas) => {
    if (jaulas >= 26 && jaulas <= 100) return 'grande';
    if (jaulas >= 11 && jaulas <= 25) return 'mediano';
    if (jaulas >= 1 && jaulas <= 10) return 'pequeño';
    return 'pequeño';
  };

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'telefono') {
      const cleaned = value.replace(/\D/g, '');
      const formatted = cleaned.slice(0, 8);
      setFormData(prev => ({
        ...prev,
        [name]: formatted
      }));
      return;
    }
    
    if (name === 'cantidadJaulas') {
      const newCantidadJaulas = parseInt(value) || 0;
      setFormData(prev => ({
        ...prev,
        [name]: newCantidadJaulas,
        categoria: determinarCategoria(newCantidadJaulas)
      }));
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!formData.nombre || !formData.telefono) {
      setError('Nombre y teléfono son obligatorios.');
      return;
    }
    
    try {
      const memberToAdd = {
        ...formData,
        telefono: `+502${formData.telefono}`,
        categoria: determinarCategoria(formData.cantidadJaulas),
        fechaRegistro: serverTimestamp(),
        activo: true
      };
      
      const newMemberRef = await addDoc(collection(db, 'miembros'), memberToAdd);
      const newMemberId = newMemberRef.id;

      if (memberType === 'new' && selectedContributionsForNewMember.length > 0) {
        const batch = writeBatch(db);
        const memberContributionsCollection = collection(db, 'member_contributions');

        for (const contrib of selectedContributionsForNewMember) {
          const contributionDocRef = doc(db, 'contributions', contrib.id);
          const contributionDocSnap = await getDoc(contributionDocRef);
          const contributionData = contributionDocSnap.data();

          const newMemberContribution = {
            memberId: newMemberId,
            miembroNombreCompleto: memberToAdd.nombre,
            miembroCantidadJaulas: memberToAdd.cantidadJaulas,
            miembroCategoria: memberToAdd.categoria,
            contributionId: contrib.id,
            contributionTitulo: contributionData.titulo,
            contributionTipoDistribucion: contributionData.tipoDistribucion,
            montoTotalMiembro: contrib.calculatedQuota,
            pagado: 0,
            pendiente: contrib.calculatedQuota,
            estadoPagoMiembro: 'pendiente',
            fechaAsignacion: serverTimestamp(),
            abonos: Array.from({ length: parseInt(contributionData.numeroAbono) || 1 }).map((_, i) => ({
              numeroAbono: i + 1,
              montoAbono: contrib.calculatedQuota / (parseInt(contributionData.numeroAbono) || 1),
              montoAbonoPagado: 0,
              estadoAbono: 'pendiente',
              fechaPago: null,
              metodoPago: null,
              registradoPor: null,
              fechaRegistroPago: null,
              comprobanteUrl: null,
            })),
          };
          batch.set(doc(memberContributionsCollection), newMemberContribution);

          const currentMembersInContribution = contributionData.miembrosParticipantesIds || [];
          const currentTotalCagesInContribution = contributionData.totalJaulasSeleccionadas || 0;
          const currentCategoriasMiembros = contributionData.categoriasMiembros || { grande: 0, mediano: 0, pequeño: 0 };

          batch.update(contributionDocRef, {
            miembrosParticipantesIds: [...currentMembersInContribution, newMemberId],
            totalJaulasSeleccionadas: currentTotalCagesInContribution + memberToAdd.cantidadJaulas,
            [`categoriasMiembros.${memberToAdd.categoria}`]: (currentCategoriasMiembros[memberToAdd.categoria] || 0) + 1,
            fechaActualizacion: serverTimestamp(),
          });
        }
        await batch.commit();
      }
      
      const updatedMembers = await getMembers();
      setMembers(updatedMembers);
      setFormData({
        nombre: '',
        email: '',
        telefono: '',
        cantidadJaulas: 0,
        activo: true,
        categoria: 'pequeño'
      });
      setSelectedContributionsForNewMember([]);
      setMemberType('founding');
      setShowForm(false);
    } catch (err) {
      setError('Error al agregar el miembro o asignar aportaciones. Por favor, intente de nuevo.');
      console.error(err);
    }
  };

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

  const handleDelete = async (id) => {
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
    <div className="flex justify-center items-center h-screen">
      <div className="spinner"></div>
      <span className="ml-4 text-gray-600">Cargando miembros...</span>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8 animate-fadeInUp">
      <h1 className="main-header-title mb-6">Gestión de Miembros</h1>
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-start">
          <XCircleIcon className="h-5 w-5 mr-2" />
          <span>{error}</span>
        </div>
      )}

      <div className="mb-6">
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary-gradient inline-flex items-center"
        >
          <PlusCircleIcon className="h-5 w-5 mr-2 icon-interactive" />
          {showForm ? 'Cerrar Formulario' : 'Agregar Nuevo Miembro'}
        </button>
      </div>
      
      {showForm && (
        <div className="card-modern p-6 mb-8 animate-fadeInUp delay-1">
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
                  className="input-field w-full"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono *</label>
                <div className="input-with-icon-wrapper">
                  <div className="input-icon">
                    <PhoneIcon className="h-5 w-5" />
                  </div>
                  <span className="text-gray-500 pl-2 pr-1">+502</span>
                  <input
                    type="tel"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleInputChange}
                    className="input-field-inside flex-1"
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
                    className="input-field-inside flex-1"
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
                    className="input-field-inside flex-1"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="mb-4 p-4 border rounded-md bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Tipo de Miembro</h3>
                <div className="flex items-center space-x-4">
                    <label className="inline-flex items-center">
                        <input
                            type="radio"
                            name="memberType"
                            value="founding"
                            checked={memberType === 'founding'}
                            onChange={() => setMemberType('founding')}
                            className="form-radio h-5 w-5 text-blue-dark"
                        />
                        <span className="ml-2 text-gray-700">Miembro Fundador</span>
                    </label>
                    <label className="inline-flex items-center">
                        <input
                            type="radio"
                            name="memberType"
                            value="new"
                            checked={memberType === 'new'}
                            onChange={() => setMemberType('new')}
                            className="form-radio h-5 w-5 text-blue-dark"
                        />
                        <span className="ml-2 text-gray-700">Nuevo Miembro (Absorbe Aportaciones)</span>
                    </label>
                </div>
            </div>

            {memberType === 'new' && (
                <div className="mb-4">
                    <ContributionAssignment 
                        newMemberData={{ ...formData, categoria: determinarCategoria(formData.cantidadJaulas) }} 
                        onContributionsAssigned={setSelectedContributionsForNewMember} 
                    />
                </div>
            )}
            
            <div className="mt-4">
              <button
                type="submit"
                className="btn-primary-gradient inline-flex items-center"
              >
                <CheckCircleIcon className="h-5 w-5 mr-2 icon-interactive" />
                Guardar Miembro
              </button>
            </div>
          </form>
        </div>
      )}
      
      <div className="card-modern rounded-lg shadow overflow-hidden animate-fadeInUp delay-2">
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
                    <Link
                      to={`/members/${member.id}/contributions-summary`} // Link to the new summary page
                      className="btn-secondary-outline inline-flex items-center text-xs px-2 py-1 text-blue-800 border-blue-800 hover:bg-blue-800 hover:text-white"
                    >
                      <EyeIcon className="h-4 w-4 mr-1 icon-interactive" />
                      Ver Aportaciones
                    </Link>
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