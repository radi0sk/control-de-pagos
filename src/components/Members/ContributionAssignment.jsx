// src/components/Members/ContributionAssignment.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { CheckIcon, CurrencyDollarIcon, UsersIcon, ScaleIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline';

const ContributionAssignment = ({ newMemberData, onContributionsAssigned, initialSelectedContributions = [] }) => {
  const [activeContributions, setActiveContributions] = useState([]);
  const [selectedContributions, setSelectedContributions] = useState(initialSelectedContributions); // { id: '...', calculatedQuota: X }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper function to calculate the new member's quota for a specific contribution
  const calculateNewMemberQuota = useCallback(async (contribution, memberData) => {
    const { cantidadJaulas, categoria } = memberData;
    let cuota = 0;

    const paymentSummary = contribution.paymentCalculationSummary;

    if (!paymentSummary || !Array.isArray(paymentSummary) || paymentSummary.length === 0) {
      console.warn(`No paymentCalculationSummary found or it's empty for contribution: ${contribution.id}`);
      return 0;
    }

    switch (contribution.tipoDistribucion) {
      case 'igualdad':
        console.log(`[${contribution.titulo}] Tipo Distribucion: igualdad`);
        const igualdadEntry = paymentSummary.find(item => item.type === 'Todos');
        if (igualdadEntry) {
          cuota = parseFloat(igualdadEntry.individualAmount || '0');
          console.log(`[${contribution.titulo}] Encontrado 'Todos' con individualAmount: ${igualdadEntry.individualAmount}, Cuota: ${cuota}`);
        } else {
          console.warn(`[${contribution.titulo}] No se encontró una entrada con type 'Todos' para distribución por igualdad.`);
        }
        break;
      case 'categoria':
        console.log(`[${contribution.titulo}] Tipo Distribucion: categoria`);
        console.log(`[${contribution.titulo}] Categoria del nuevo miembro (original): ${categoria}`); // Log original for debugging
        const memberCategoryNormalized = categoria ? categoria.toLowerCase() : ''; // Normalize member's category to lowercase
        console.log(`[${contribution.titulo}] Categoria del nuevo miembro (normalizada): ${memberCategoryNormalized}`);
        console.log(`[${contribution.titulo}] Payment Summary:`, paymentSummary);

        const categoriaEntry = paymentSummary.find(item => {
          const summaryItemTypeNormalized = item.type ? item.type.toLowerCase() : ''; // Normalize summary item type to lowercase
          console.log(`[${contribution.titulo}] Comparando summary item type (normalizado): '${summaryItemTypeNormalized}' con member categoria (normalizada): '${memberCategoryNormalized}'`);
          return summaryItemTypeNormalized === memberCategoryNormalized;
        });

        if (categoriaEntry) {
          cuota = parseFloat(categoriaEntry.individualAmount || '0');
          console.log(`[${contribution.titulo}] Encontrada entrada para categoria '${categoriaEntry.type}' con individualAmount: ${categoriaEntry.individualAmount}, Cuota: ${cuota}`);
        } else {
          console.warn(`[${contribution.titulo}] No se encontró una entrada para la categoría '${categoria}' en el paymentCalculationSummary (después de normalizar).`);
        }
        break;
      case 'jaulas':
        console.log(`[${contribution.titulo}] Tipo Distribucion: jaulas`);
        console.log(`[${contribution.titulo}] Cantidad de jaulas del nuevo miembro: ${cantidadJaulas}`);
        const jaulasEntry = paymentSummary.find(item => item.type === 'Total por jaulas');
        if (jaulasEntry) {
          cuota = parseFloat(jaulasEntry.individualAmount || '0') * cantidadJaulas;
          console.log(`[${contribution.titulo}] Encontrado 'Total por jaulas' con individualAmount: ${jaulasEntry.individualAmount}, Cuota: ${cuota}`);
        } else {
          console.warn(`[${contribution.titulo}] No se encontró una entrada con type 'Total por jaulas' para distribución por jaulas.`);
        }
        break;
      default:
        cuota = 0;
        console.log(`[${contribution.titulo}] Tipo de distribución desconocido: ${contribution.tipoDistribucion}`);
    }
    console.log(`[${contribution.titulo}] Cuota final calculada: ${cuota.toFixed(2)}`);
    return parseFloat(cuota.toFixed(2)); // Ensure 2 decimal places
  }, []);

  // ... (rest of your component code remains the same)
  // Fetch active contributions
  useEffect(() => {
    const fetchContributions = async () => {
      try {
        setLoading(true);
        const contributionsRef = collection(db, 'contributions');
        const q = query(contributionsRef);
        const querySnapshot = await getDocs(q);

        const fetchedContributions = [];
        for (const docSnapshot of querySnapshot.docs) {
          const data = { id: docSnapshot.id, ...docSnapshot.data() };
          const calculatedQuota = await calculateNewMemberQuota(data, newMemberData);
          fetchedContributions.push({
            ...data,
            calculatedQuota: calculatedQuota,
          });
        }
        setActiveContributions(fetchedContributions);
        setError(null);
      } catch (err) {
        console.error("Error fetching contributions:", err);
        setError(`Error al cargar aportaciones: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (newMemberData) {
      fetchContributions();
    }
  }, [newMemberData, calculateNewMemberQuota]);

  // Notify parent component about selected contributions
  useEffect(() => {
    onContributionsAssigned(selectedContributions);
  }, [selectedContributions, onContributionsAssigned]);


  const toggleContributionSelection = (contributionId) => {
    setSelectedContributions(prev => {
      const isSelected = prev.some(c => c.id === contributionId);
      if (isSelected) {
        return prev.filter(c => c.id !== contributionId);
      } else {
        const contributionToAdd = activeContributions.find(c => c.id === contributionId);
        if (contributionToAdd) {
          return [...prev, { id: contributionToAdd.id, calculatedQuota: contributionToAdd.calculatedQuota }];
        }
        return prev;
      }
    });
  };

  if (!newMemberData) {
    return (
      <div className="text-center py-4 text-gray-600">
        Por favor, complete los datos del nuevo miembro para asignar aportaciones.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-4">
        <div className="spinner"></div>
        <span className="ml-2 text-gray-600">Cargando aportaciones...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4 text-red-700 bg-red-50 border border-red-200 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fadeInUp">
      <h3 className="text-lg font-semibold text-gray-800">Asignar a Aportaciones</h3>
      <p className="text-sm text-gray-600">Seleccione las aportaciones a las que el nuevo miembro se unirá. Se calculará su cuota automáticamente.</p>

      {activeContributions.length === 0 ? (
        <div className="p-4 text-center text-gray-600 border rounded-md">
          No hay aportaciones disponibles para asignar.
        </div>
      ) : (
        <div className="max-h-80 overflow-y-auto border rounded-md shadow-sm">
          <ul className="divide-y divide-gray-200">
            {activeContributions.map(contribution => (
              <li key={contribution.id} className="p-3 hover:bg-gray-50">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedContributions.some(c => c.id === contribution.id)}
                    onChange={() => toggleContributionSelection(contribution.id)}
                    className="h-5 w-5 text-blue-dark rounded focus:ring-blue-dark border-gray-300 icon-interactive"
                  />
                  <div className="ml-3 flex-1">
                    <p className="font-medium text-gray-900">{contribution.titulo}</p>
                    <p className="text-sm text-gray-600">{contribution.descripcion}</p>
                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      <span className="mr-3 flex items-center">
                        {contribution.tipoDistribucion === 'igualdad' && <UsersIcon className="h-4 w-4 mr-1" />}
                        {contribution.tipoDistribucion === 'categoria' && <ScaleIcon className="h-4 w-4 mr-1" />}
                        {contribution.tipoDistribucion === 'jaulas' && <BuildingOffice2Icon className="h-4 w-4 mr-1" />}
                        Distribución: {contribution.tipoDistribucion}
                      </span>
                      <span className="flex items-center">
                        <CurrencyDollarIcon className="h-4 w-4 mr-1" />
                        Cuota Nueva: Q{contribution.calculatedQuota.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  {selectedContributions.some(c => c.id === contribution.id) && (
                    <CheckIcon className="h-6 w-6 text-green-500" />
                  )}
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ContributionAssignment;