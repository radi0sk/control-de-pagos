// src/components/Expenses/ExpenseForm.jsx
import React, { useState, useEffect } from 'react';
import { uploadImageToCloudinary } from '../../services/cloudinary';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig.js';
import { 
  TagIcon, ClipboardDocumentListIcon, CurrencyDollarIcon, 
  BuildingStorefrontIcon, CheckCircleIcon, 
  CloudArrowUpIcon, DocumentIcon, CalendarDaysIcon // Importado CalendarDaysIcon y UserGroupIcon
} from '@heroicons/react/24/outline'; 

// Definir expenseTypes fuera del componente
const expenseTypes = [
  { value: 'honorario', label: 'Honorario' },
  { value: 'operativo', label: 'Operativo' },
];

function ExpenseForm({ onSubmit }) {
  const [formData, setFormData] = useState({
    tipo: 'operativo',
    descripcion: '',
    monto: '',
    proveedor: '',
    fechaGasto: new Date().toISOString().slice(0, 10), // Campo de fecha solo día, pre-llenado con la fecha actual
    documento: null, // URL del documento cargado
    aprobadoPor: [], // IDs de miembros que aprueban
    estadoPagoGasto: 'pendiente', // Nuevo campo: estado de pago del gasto
    abonos: [], // Nuevo campo: array para manejar pagos parciales
  });
  const [fileUploading, setFileUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [dragOver, setDragOver] = useState(false); // Estado para drag & drop
  const [selectAllMembers, setSelectAllMembers] = useState(false); // Nuevo estado para "Seleccionar todos"

  // Manejar cambios en los campos del formulario
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Manejar carga de archivos
  const handleFileChange = async (file) => {
    if (!file) return;

    setFileUploading(true);
    try {
      const imageUrl = await uploadImageToCloudinary(file);
      setFormData(prev => ({
        ...prev,
        documento: imageUrl,
      }));
    } catch (error) {
      console.error('Error uploading file:', error);
      // Implementar un mensaje de error en la UI aquí
    } finally {
      setFileUploading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFileChange(file);
  };

  // Manejar selección de usuarios para 'aprobadoPor'
  const handleUserSelection = (userId) => {
    setFormData(prev => {
      const isSelected = prev.aprobadoPor.includes(userId);
      const newApprovedBy = isSelected
        ? prev.aprobadoPor.filter(id => id !== userId)
        : [...prev.aprobadoPor, userId];
      
      // Actualizar el estado de "Seleccionar todos"
      if (newApprovedBy.length === members.length && members.length > 0) {
        setSelectAllMembers(true);
      } else {
        setSelectAllMembers(false);
      }
      
      return {
        ...prev,
        aprobadoPor: newApprovedBy,
      };
    });
  };

  // Manejar "Seleccionar todos"
  const handleSelectAllMembers = () => {
    if (selectAllMembers) {
      setFormData(prev => ({ ...prev, aprobadoPor: [] }));
    } else {
      setFormData(prev => ({ ...prev, aprobadoPor: members.map(member => member.id) }));
    }
    setSelectAllMembers(prev => !prev);
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const expenseToSubmit = {
        ...formData,
        monto: parseFloat(formData.monto),
        fechaGasto: new Date(formData.fechaGasto), // Convertir a objeto Date para Firestore
        // Inicializar un abono único por defecto, si no se implementa lógica de pagos divididos avanzada
        abonos: [{
          numeroAbono: 1,
          montoAbono: parseFloat(formData.monto),
          fechaPago: null, // Se llenará al registrar el pago
          estadoAbono: "pendiente",
          metodoPago: null,
          registradoPor: null,
          comprobanteUrl: null
        }]
      };
      
      await onSubmit(expenseToSubmit);
      
      // Resetear el formulario después de un envío exitoso
      setFormData({
        tipo: 'operativo',
        descripcion: '',
        monto: '',
        proveedor: '',
        fechaGasto: new Date().toISOString().slice(0, 10), // Resetear a fecha actual
        documento: null,
        aprobadoPor: [],
        estadoPagoGasto: 'pendiente',
        abonos: [],
      });
      setSelectAllMembers(false); // Resetear "Seleccionar todos"
    } catch (error) {
      console.error('Error submitting expense:', error);
      // Implementar un mensaje de error en la UI
    } finally {
      setSubmitting(false);
    }
  };

  // Cargar miembros activos para la selección de 'aprobadoPor'
  useEffect(() => {
    const fetchActiveMembers = async () => {
      try {
        const q = query(collection(db, 'miembros'), where('activo', '==', true));
        const querySnapshot = await getDocs(q);
        
        const membersData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().nombre // Asumiendo que 'nombre' es el campo del nombre
        }));
        
        setMembers(membersData);

        // Si todos los miembros ya estaban seleccionados, mantener el checkbox de "seleccionar todos" marcado
        if (membersData.length > 0 && formData.aprobadoPor.length === membersData.length) {
          setSelectAllMembers(true);
        } else {
          setSelectAllMembers(false);
        }

      } catch (error) {
        console.error('Error fetching members:', error);
      } finally {
        setLoadingMembers(false);
      }
    };

    fetchActiveMembers();
  }, [formData.aprobadoPor.length]); // Dependencia para re-evaluar el estado de "seleccionar todos"

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fadeInUp">
      {/* Campo Tipo de Gasto */}
      <div>
        <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 mb-1">Tipo de gasto</label>
        <div className="input-with-icon-wrapper">
          <div className="input-icon">
            <TagIcon className="h-5 w-5" />
          </div>
          <select
            id="tipo"
            name="tipo"
            value={formData.tipo}
            onChange={handleChange}
            className="input-field-inside flex-1"
            required
          >
            {expenseTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Campo Descripción */}
      <div>
        <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
        <div className="input-with-icon-wrapper items-start">
          <div className="input-icon pt-3">
            <ClipboardDocumentListIcon className="h-5 w-5" />
          </div>
          <textarea
            id="descripcion"
            name="descripcion"
            value={formData.descripcion}
            onChange={handleChange}
            rows={3}
            className="input-field-inside flex-1 resize-y"
            required
          />
        </div>
      </div>

      {/* Campo Monto */}
      <div>
        <label htmlFor="monto" className="block text-sm font-medium text-gray-700 mb-1">Monto (Q)</label>
        <div className="input-with-icon-wrapper">
          <div className="input-icon">
            <CurrencyDollarIcon className="h-5 w-5" />
          </div>
          <span className="text-gray-500 pl-2 pr-1">Q</span>
          <input
            type="number"
            id="monto"
            name="monto"
            value={formData.monto}
            onChange={handleChange}
            step="0.01"
            min="0"
            className="input-field-inside flex-1"
            required
          />
        </div>
      </div>

      {/* Campo Proveedor */}
      <div>
        <label htmlFor="proveedor" className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
        <div className="input-with-icon-wrapper">
          <div className="input-icon">
            <BuildingStorefrontIcon className="h-5 w-5" />
          </div>
          <input
            type="text"
            id="proveedor"
            name="proveedor"
            value={formData.proveedor}
            onChange={handleChange}
            className="input-field-inside flex-1"
            required
          />
        </div>
      </div>

      {/* Campo Fecha del Gasto */}
      <div>
        <label htmlFor="fechaGasto" className="block text-sm font-medium text-gray-700 mb-1">Fecha del Gasto *</label>
        <div className="input-with-icon-wrapper">
          <div className="input-icon">
            <CalendarDaysIcon className="h-5 w-5" />
          </div>
          <input
            type="date" // Cambiado a type="date"
            id="fechaGasto"
            name="fechaGasto"
            value={formData.fechaGasto}
            onChange={handleChange}
            className="input-field-inside flex-1"
            required
          />
        </div>
      </div>

      {/* Área de Carga de Documentos (Drag & Drop) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Documento (Factura/Comprobante)</label>
        <div 
          className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-300 group ${
            dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-upload-input').click()}
        >
          {fileUploading ? (
            <div className="flex items-center space-x-3 text-blue-dark">
              <div className="spinner-sm"></div>
              <span>Subiendo documento...</span>
            </div>
          ) : formData.documento ? (
            <div className="flex flex-col items-center text-green-700">
              <CheckCircleIcon style={{ height: '24px', width: '24px' }} className="text-green-500 icon-interactive" /> 
              <p className="mt-2 text-sm font-medium">Documento cargado correctamente</p>
              {formData.documento.match(/\.(jpeg|jpg|gif|png|webp)$/) != null ? (
                <img 
                  src={formData.documento} 
                  alt="Vista previa del documento" 
                  className="mt-4 max-h-24 rounded-md object-cover transition-transform duration-300 group-hover:scale-105" 
                />
              ) : (
                <DocumentIcon style={{ height: '40px', width: '40px' }} className="mt-4 text-blue-dark" /> 
              )}
              <a 
                href={formData.documento} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-600 hover:underline mt-2 text-sm"
              >
                Ver documento
              </a>
            </div>
          ) : (
            <>
              <CloudArrowUpIcon style={{ height: '32px', width: '32px' }} className="text-gray-400 group-hover:text-blue-dark transition-colors duration-300 icon-interactive" />
              <p className="mt-2 text-sm text-gray-600">Arrastra y suelta aquí, o <span className="text-blue-dark font-semibold">haz clic para seleccionar</span></p>
              <p className="text-xs text-gray-500">Archivos soportados: imágenes (.jpg, .png) o .pdf</p>
            </>
          )}
          <input
            id="file-upload-input"
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => handleFileChange(e.target.files[0])}
            className="hidden"
            disabled={fileUploading}
          />
        </div>
      </div>

      {/* Sección Aprobado por */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Aprobado por</label>
        {loadingMembers ? (
          <p className="mt-2 text-sm text-gray-500 flex items-center">
            <span className="spinner-sm mr-2"></span> Cargando miembros...
          </p>
        ) : (
          <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border rounded-md p-3 bg-white shadow-sm">
            {members.length > 0 && (
              <div className="flex items-center py-1 border-b border-gray-100 mb-2 pb-2">
                <input
                  type="checkbox"
                  id="selectAllMembers"
                  checked={selectAllMembers}
                  onChange={handleSelectAllMembers}
                  className="h-4 w-4 text-blue-dark focus:ring-blue-dark border-gray-300 rounded icon-interactive"
                />
                <label htmlFor="selectAllMembers" className="ml-2 block text-sm font-semibold text-gray-800 cursor-pointer">
                  Seleccionar todos ({members.length})
                </label>
              </div>
            )}
            
            {members.length > 0 ? (
              members.map((member) => (
                <div key={member.id} className="flex items-center py-1">
                  <input
                    type="checkbox"
                    id={`member-${member.id}`}
                    checked={formData.aprobadoPor.includes(member.id)}
                    onChange={() => handleUserSelection(member.id)}
                    className="h-4 w-4 text-blue-dark focus:ring-blue-dark border-gray-300 rounded icon-interactive"
                  />
                  <label htmlFor={`member-${member.id}`} className="ml-2 block text-sm text-gray-700 cursor-pointer">
                    {member.name}
                  </label>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No hay miembros activos disponibles para aprobación.</p>
            )}
          </div>
        )}
      </div>

      {/* Botón de Envío */}
      <div className="pt-4">
        <button
          type="submit"
          disabled={submitting || fileUploading}
          className="btn-primary-gradient w-full flex justify-center items-center"
        >
          {submitting ? (
            <>
              <span className="spinner mr-2"></span> Registrando...
            </>
          ) : 'Registrar Gasto'}
        </button>
      </div>
    </form>
  );
}

export default ExpenseForm;
