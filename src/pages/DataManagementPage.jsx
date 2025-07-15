// src/pages/DataManagementPage.jsx
import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, UserGroupIcon, PencilIcon, TrashIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

const DataManagementPage = () => {
  const [members, setMembers] = useState([]);
  const [allMemberContributions, setAllMemberContributions] = useState([]); // Store all contributions
  const [selectedMemberId, setSelectedMemberId] = useState(null); // Track selected member
  const [editingContributionId, setEditingContributionId] = useState(null); // Track contribution being edited
  const [editFormData, setEditFormData] = useState({}); // Data for the inline edit form
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all members
        const membersCollection = collection(db, 'miembros');
        const membersSnapshot = await getDocs(membersCollection);
        const membersData = membersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMembers(membersData);

        // Fetch all member contributions
        const memberContributionsCollection = collection(db, 'member_contributions');
        const memberContributionsSnapshot = await getDocs(memberContributionsCollection);
        const allContributions = memberContributionsSnapshot.docs.map(mcDoc => {
          const data = mcDoc.data();
          return {
            id: mcDoc.id,
            ...data,
            // Ensure numerical values are treated as numbers, default to 0 if undefined
            montoTotalMiembro: Number(data.montoTotalMiembro) || 0,
            pagado: Number(data.pagado) || 0,
          };
        });
        setAllMemberContributions(allContributions);

        setLoading(false);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Error al cargar los datos.");
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSelectMember = (memberId) => {
    setSelectedMemberId(memberId);
    setEditingContributionId(null); // Reset editing mode when a new member is selected
  };

  const handleEditMemberContribution = (memberContribution) => {
    setEditingContributionId(memberContribution.id);
    setEditFormData({
      montoTotalMiembro: memberContribution.montoTotalMiembro,
      pagado: memberContribution.pagado,
      // Add other fields you might want to edit here
    });
  };

  const handleChangeEditForm = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: Number(value) })); // Ensure values are numbers
  };

  const handleSaveEdit = async (memberContributionId) => {
    setIsSubmitting(true);
    try {
      const docRef = doc(db, 'member_contributions', memberContributionId);
      const { montoTotalMiembro, pagado } = editFormData;

      // Calculate new estadoPagoMiembro
      let newEstadoPagoMiembro = 'pendiente';
      if (pagado >= montoTotalMiembro) {
        newEstadoPagoMiembro = 'completo';
      } else if (pagado > 0 && pagado < montoTotalMiembro) {
        newEstadoPagoMiembro = 'parcialmente_pagado';
      }

      await updateDoc(docRef, {
        montoTotalMiembro: montoTotalMiembro,
        pagado: pagado,
        estadoPagoMiembro: newEstadoPagoMiembro,
        // Add other fields to update
      });

      // Update local state to reflect changes
      setAllMemberContributions(prevContributions =>
        prevContributions.map(mc =>
          mc.id === memberContributionId
            ? { ...mc, montoTotalMiembro, pagado, estadoPagoMiembro: newEstadoPagoMiembro }
            : mc
        )
      );

      setEditingContributionId(null); // Exit editing mode
     
    } catch (error) {
      console.error("Error al actualizar la aportación de miembro:", error);
      setError("Error al actualizar la aportación de miembro.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingContributionId(null); // Exit editing mode
    setEditFormData({}); // Clear form data
  };

  const handleDeleteMemberContribution = async (memberContributionId) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar esta aportación de miembro?")) {
      try {
        await deleteDoc(doc(db, 'member_contributions', memberContributionId));
        // Update local state after deletion
        setAllMemberContributions(prevContributions =>
          prevContributions.filter(mc => mc.id !== memberContributionId)
        );
        alert("Aportación de miembro eliminada exitosamente.");
      } catch (error) {
        console.error("Error al eliminar la aportación de miembro:", error);
        setError("Error al eliminar la aportación de miembro.");
      }
    }
  };

  const selectedMemberContributions = selectedMemberId
    ? allMemberContributions.filter(mc => mc.memberId === selectedMemberId)
    : [];

  if (loading) {
    return <div className="container mx-auto px-4 py-8 text-center">Cargando datos...</div>;
  }

  if (error) {
    return <div className="container mx-auto px-4 py-8 text-center text-red-500">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 animate-fadeInUp">
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center btn-secondary-outline"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2 icon-interactive" />
          Volver al Dashboard
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="main-header-title text-gray-900">Gestión de Datos de Aportaciones</h1>
          <p className="text-sm text-gray-500 mt-1">
            Administra las asignaciones de aportaciones a miembros.
          </p>
        </div>
      </div>

      {/* Member List Section */}
      <div className="card-modern p-6 shadow-md rounded-lg mb-8">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center mb-4 pb-3 border-b border-gray-200">
          <UserGroupIcon className="h-6 w-6 mr-2 text-blue-dark" />
          Seleccionar Miembro
        </h2>
        {members.length === 0 ? (
          <p className="text-gray-500 text-sm">No hay miembros registrados.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {members.map(member => (
              <button
                key={member.id}
                onClick={() => handleSelectMember(member.id)}
                className={`card-modern p-4 text-center cursor-pointer transition-all duration-200 ${
                  selectedMemberId === member.id ? 'bg-blue-100 border-blue-500 shadow-lg' : 'hover:bg-gray-50'
                }`}
              >
                <span className="font-medium text-gray-800">{member.nombre}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Member Contributions Section */}
      {selectedMemberId && (
        <div className="card-modern p-6 shadow-md rounded-lg animate-fadeInUp delay-2">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center mb-4 pb-3 border-b border-gray-200">
            <UserGroupIcon className="h-6 w-6 mr-2 text-blue-dark" />
            Aportaciones de {members.find(m => m.id === selectedMemberId)?.nombre}
          </h2>
          {selectedMemberContributions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aportación
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monto Asignado
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monto Pagado
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pendiente
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedMemberContributions.map(mc => (
                    <tr key={mc.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {mc.contributionTitulo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
  {editingContributionId === mc.id ? (
    <input
      type="number"
      name="montoTotalMiembro"
      value={editFormData.montoTotalMiembro}
      onChange={handleChangeEditForm}
      className="input-field-inline w-24"
    />
  ) : (
    `Q${mc.montoTotalMiembro.toFixed(2)}`
  )}
</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
  {editingContributionId === mc.id ? (
    <input
      type="number"
      name="pagado"
      value={editFormData.pagado}
      onChange={handleChangeEditForm}
      className="input-field-inline w-24"
    />
  ) : (
    `Q${mc.pagado.toFixed(2)}`
  )}
</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        Q{(mc.montoTotalMiembro - mc.pagado).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          mc.estadoPagoMiembro === 'completo' ? 'bg-green-100 text-green-800' :
                          mc.estadoPagoMiembro === 'parcialmente_pagado' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {mc.estadoPagoMiembro}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        {editingContributionId === mc.id ? (
                          <>
                            <button
                              onClick={() => handleSaveEdit(mc.id)}
                              className="btn-primary-gradient inline-flex items-center text-xs px-2 py-1"
                              disabled={isSubmitting}
                            >
                              {isSubmitting ? 'Guardando...' : <><CheckIcon className="h-4 w-4 mr-1 icon-interactive" /> Guardar</>}
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="btn-secondary-outline inline-flex items-center text-xs px-2 py-1"
                            >
                              <XMarkIcon className="h-4 w-4 mr-1 icon-interactive" /> Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEditMemberContribution(mc)}
                              className="btn-secondary-outline inline-flex items-center text-xs px-2 py-1"
                            >
                              <PencilIcon className="h-4 w-4 mr-1 icon-interactive" /> Editar
                            </button>
                            <button
                              onClick={() => handleDeleteMemberContribution(mc.id)}
                              className="btn-secondary-outline inline-flex items-center text-xs px-2 py-1 text-red-800 border-red-800 hover:bg-red-800 hover:text-white"
                            >
                              <TrashIcon className="h-4 w-4 mr-1 icon-interactive" /> Eliminar
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Este miembro no tiene aportaciones registradas.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default DataManagementPage;