// src/pages/EditMemberContribution/EditMemberContributionPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon, CheckIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

const EditMemberContributionPage = () => {
  const { memberContributionId } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    montoTotalMiembro: '',
    pagado: '',
    estadoPagoMiembro: '',
    // Puedes añadir más campos aquí si necesitas editar otros datos de la aportación
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchMemberContribution = async () => {
      try {
        setLoading(true);
        setError('');
        const docRef = doc(db, 'member_contributions', memberContributionId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setFormData({
            montoTotalMiembro: data.montoTotalMiembro || '',
            pagado: data.pagado || '',
            estadoPagoMiembro: data.estadoPagoMiembro || '',
          });
        } else {
          setError('Aportación de miembro no encontrada.');
        }
        setLoading(false);
      } catch (err) {
        console.error("Error fetching member contribution:", err);
        setError('Error al cargar la aportación de miembro.');
        setLoading(false);
      }
    };

    fetchMemberContribution();
  }, [memberContributionId]);

  const handleNumericChange = (e) => {
    const { name, value } = e.target;
    // Permitir solo números y un punto decimal
    if (/^\d*\.?\d*$/.test(value) || value === '') {
      setFormData(prevData => ({
        ...prevData,
        [name]: value
      }));
    }
  };

  // Removed unused handleChange function
  /*
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };
  */

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const docRef = doc(db, 'member_contributions', memberContributionId);
      const dataToUpdate = {
        montoTotalMiembro: parseFloat(formData.montoTotalMiembro),
        pagado: parseFloat(formData.pagado),
        // estadoPagoMiembro: formData.estadoPagoMiembro, // This field is commented out in JSX
        fechaActualizacion: serverTimestamp(),
      };

      // Recalculate estadoPagoMiembro based on new montoTotalMiembro and pagado
      if (dataToUpdate.pagado >= dataToUpdate.montoTotalMiembro) {
        dataToUpdate.estadoPagoMiembro = 'pagado';
      } else if (dataToUpdate.pagado > 0 && dataToUpdate.pagado < dataToUpdate.montoTotalMiembro) {
        dataToUpdate.estadoPagoMiembro = 'parcialmente_pagado';
      } else {
        dataToUpdate.estadoPagoMiembro = 'pendiente';
      }


      await updateDoc(docRef, dataToUpdate);
      setSuccess('Aportación de miembro actualizada exitosamente!');
      // Consider navigating back or to a summary page after success
      setTimeout(() => {
        navigate('/data-management');
      }, 2000);
    } catch (err) {
      console.error("Error updating document:", err);
      setError('Error al actualizar la aportación de miembro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-8 text-center">Cargando detalles de aportación...</div>;
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 animate-fadeInUp">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative flex items-center" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
        <div className="mt-4">
          <Link to="/data-management" className="inline-flex items-center btn-secondary-outline">
            <ArrowLeftIcon className="h-5 w-5 mr-2 icon-interactive" /> Volver a Gestión de Datos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 animate-fadeInUp">
      <div className="mb-6">
        <Link
          to="/data-management"
          className="inline-flex items-center btn-secondary-outline"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2 icon-interactive" />
          Volver a Gestión de Datos
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="main-header-title text-gray-900">Editar Aportación de Miembro</h1>
          <p className="text-sm text-gray-500 mt-1">
            Modifique los detalles de la aportación asignada a este miembro.
          </p>
        </div>
      </div>

      <div className="card-modern p-6 animate-fadeInUp delay-1">
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{success}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Monto Total Asignado al Miembro */}
          <div className="animate-fadeInUp delay-2">
            <label htmlFor="montoTotalMiembro" className="block text-sm font-medium text-gray-700 mb-1">
              Monto Total Asignado al Miembro *
            </label>
            <div className="input-with-icon-wrapper">
              <div className="input-icon">
                <CurrencyDollarIcon className="h-5 w-5" />
              </div>
              <input
                type="text" // Use text to allow partial input before validation
                id="montoTotalMiembro"
                name="montoTotalMiembro"
                value={formData.montoTotalMiembro}
                onChange={handleNumericChange}
                className="input-field-inside flex-1"
                placeholder="Ej. 100.00"
                required
              />
            </div>
          </div>

          {/* Monto Pagado por el Miembro */}
          <div className="animate-fadeInUp delay-3">
            <label htmlFor="pagado" className="block text-sm font-medium text-gray-700 mb-1">
              Monto Pagado por el Miembro *
            </label>
            <div className="input-with-icon-wrapper">
              <div className="input-icon">
                <CurrencyDollarIcon className="h-5 w-5" />
              </div>
              <input
                type="text" // Use text to allow partial input before validation
                id="pagado"
                name="pagado"
                value={formData.pagado}
                onChange={handleNumericChange}
                className="input-field-inside flex-1"
                placeholder="Ej. 50.00"
                required
              />
            </div>
          </div>

          {/* Campo de Estado de Pago (Mantener comentado si el estado se calcula automáticamente)
          <div className="animate-fadeInUp delay-4">
            <label htmlFor="estadoPagoMiembro" className="block text-sm font-medium text-gray-700 mb-1">
              Estado de Pago del Miembro *
            </label>
            <div className="input-with-icon-wrapper">
              <div className="input-icon">
                <CheckCircleIcon className="h-5 w-5" />
              </div>
              <select
                id="estadoPagoMiembro"
                name="estadoPagoMiembro"
                value={formData.estadoPagoMiembro}
                onChange={handleChange}
                className="input-field-inside flex-1"
              >
                <option value="">Selecciona un estado</option>
                <option value="pendiente">Pendiente</option>
                <option value="parcialmente_pagado">Parcialmente Pagado</option>
                <option value="pagado">Pagado</option>
              </select>
            </div>
          </div> */}

          {/* Botones de acción */}
          <div className="flex justify-between pt-6 border-t">
            <button
              type="button"
              onClick={() => navigate('/data-management')}
              className="btn-secondary-outline inline-flex items-center"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-2 icon-interactive" />
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary-gradient inline-flex items-center"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
              <CheckIcon className="h-5 w-5 ml-2 icon-interactive" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditMemberContributionPage;