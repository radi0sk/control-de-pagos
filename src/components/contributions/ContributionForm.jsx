import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDoc, query, where, getDocs, collection, serverTimestamp, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig.js';
import { useAuth } from '../../context/AuthContext.jsx';
import MemberSelector from '../Members/MemberSelector.jsx';
import { CheckIcon, XMarkIcon, CalendarDaysIcon, CurrencyDollarIcon, UsersIcon, Square3Stack3DIcon, BarsArrowUpIcon } from '@heroicons/react/24/outline'; // Nuevos iconos

const ContributionForm = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  // Estados del formulario
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    costoTotal: '',
    tipoDistribucion: '',
    fechaLimite: '',
    numeroAbono: '1', // Valor por defecto 1
    estado: 'pendiente', // This refers to the overall contribution status (initial state)
    creadoPor: currentUser?.displayName || 'Administrador',
    miembros: [], // These are just IDs
    totalJaulasSeleccionadas: 0,
    categoriasMiembros: {
      grande: 0,
      mediano: 0,
      pequeño: 0
    }
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [paymentResults, setPaymentResults] = useState(null);
  const [members, setMembers] = useState([]);
  const [showCalculationSection, setShowCalculationSection] = useState(false);

  // Obtener miembros de Firestore
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const membersRef = collection(db, 'miembros');
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
      } catch (error) {
        console.error("Error al obtener miembros:", error);
        setError('Error al cargar los miembros');
      }
    };

    fetchMembers();
  }, []);

  // Manejar cambios en los campos del formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Manejar selección de miembros
  const handleMembersSelected = useCallback((selectionData) => {
    setFormData(prev => ({
      ...prev,
      miembros: selectionData.memberIds,
      totalJaulasSeleccionadas: selectionData.totalJaulas,
      categoriasMiembros: selectionData.categorias
    }));
  }, []);

  // Manejar cambio de tipo de distribución y calcular automáticamente
  const handleDistributionChange = (value) => {
    setFormData(prev => ({ ...prev, tipoDistribucion: value }));
    setPaymentResults(null);
    setShowCalculationSection(false);
    
    // Solo calcular si tenemos todos los datos necesarios
    if (formData.miembros.length > 0 && formData.costoTotal && !isNaN(formData.costoTotal)) {
      // The calculateIndividualPayments depends on formData, so we should pass the new value
      // or ensure it's triggered by the useEffect below
    }
  };

  // Función principal que orquesta el cálculo según el tipo de distribución
  const calculateIndividualPayments = useCallback(() => {
    // Función para distribución por igualdad
    const calculateEqualPayments = (selectedMembersData, costoTotal) => {
      const amountPerMember = costoTotal / selectedMembersData.length;
      
      const paymentDetails = selectedMembersData.map(member => ({
        name: `${member.name} ${member.lastName}`,
        category: member.category,
        cages: member.cages,
        amount: amountPerMember.toFixed(2)
      }));

      const summary = [{
        type: 'Todos',
        count: selectedMembersData.length,
        individualAmount: amountPerMember.toFixed(2),
        totalAmount: costoTotal.toFixed(2)
      }];

      return { paymentDetails, summary };
    };

    // Función para distribución por categoría
    const calculateCategoryPayments = (selectedMembersData, costoTotal) => {
      const categoryWeights = {
        grande: 11,
        mediano: 9,
        pequeño: 7
      };

      // Contar miembros por categoría
      const categoryCounts = selectedMembersData.reduce((acc, member) => {
        const category = member.category?.toLowerCase();
        if (category && categoryWeights[category]) {
          acc[category] = (acc[category] || 0) + 1;
        }
        return acc;
      }, {});

      // Calcular total de unidades
      const totalUnits = Object.entries(categoryCounts).reduce(
        (sum, [category, count]) => sum + (count * categoryWeights[category]), 0
      );

      // Si totalUnits es 0, no se puede dividir
      if (totalUnits === 0) {
          throw new Error('No se pueden calcular aportaciones por categoría. Verifique las categorías de los miembros.');
      }

      // Calcular valor por unidad
      const valuePerUnit = costoTotal / totalUnits;

      // Calcular aportes por categoría
      const categoryPayments = {};
      Object.entries(categoryCounts).forEach(([category, count]) => {
        categoryPayments[category] = {
          individualAmount: (valuePerUnit * categoryWeights[category]),
          totalAmount: (valuePerUnit * categoryWeights[category] * count)
        };
      });

      // Preparar datos para tabla de resumen
      const summary = Object.entries(categoryPayments).map(([category, data]) => ({
        type: category.charAt(0).toUpperCase() + category.slice(1),
        count: categoryCounts[category],
        individualAmount: data.individualAmount.toFixed(2),
        totalAmount: data.totalAmount.toFixed(2)
      }));

      // Preparar detalles por miembro
      const paymentDetails = selectedMembersData.map(member => {
          const memberCategory = member.category.toLowerCase();
          if (!categoryPayments[memberCategory]) {
               console.warn(`Categoría '${member.category}' no encontrada en los pagos calculados para ${member.name}`);
               return {
                  name: `${member.name} ${member.lastName}`,
                  category: member.category,
                  cages: member.cages,
                  amount: (0).toFixed(2) // Asignar 0 si la categoría no tiene un cálculo
               };
          }
          return {
            name: `${member.name} ${member.lastName}`,
            category: member.category,
            cages: member.cages,
            amount: categoryPayments[memberCategory].individualAmount.toFixed(2)
          };
      });

      return { paymentDetails, summary };
    };

    // Función para distribución por jaulas
    const calculateCagePayments = (selectedMembersData, costoTotal) => {
      const totalCages = selectedMembersData.reduce(
        (sum, member) => sum + (member.cages || 0), 0
      );

      if (totalCages === 0) {
          throw new Error('No se pueden calcular aportaciones por jaulas. Verifique que los miembros seleccionados tengan jaulas asignadas.');
      }

      const valuePerCage = costoTotal / totalCages;

      const paymentDetails = selectedMembersData.map(member => ({
        name: `${member.name} ${member.lastName}`,
        category: member.category,
        cages: member.cages,
        amountPerCage: valuePerCage.toFixed(2),
        amount: (valuePerCage * (member.cages || 0)).toFixed(2)
      }));

      const summary = [{
        type: 'Total por jaulas',
        count: totalCages,
        individualAmount: valuePerCage.toFixed(2),
        totalAmount: costoTotal.toFixed(2)
      }];

      return { paymentDetails, summary };
    };

    // Función para dividir los pagos según número de abonos
    const splitPaymentsByInstallments = (paymentDetails, summary, numInstallments) => {
      numInstallments = parseInt(numInstallments) || 1;
      if (numInstallments <= 1) {
        return {
          splitDetails: paymentDetails.map(detail => ({
            ...detail,
            installments: [parseFloat(detail.amount)] // Store as number
          })),
          splitSummary: summary.map(item => ({
            ...item,
            installments: [parseFloat(item.individualAmount)], // Store as number
            totalAmount: parseFloat(item.totalAmount) // Store as number
          }))
        };
      }

      const splitDetails = paymentDetails.map(detail => {
        let amount = parseFloat(detail.amount);
        const installments = [];
        let remaining = amount;
        const baseInstallment = Math.floor((amount / numInstallments) * 100) / 100; // Truncate to 2 decimal places

        for (let i = 0; i < numInstallments; i++) {
          let currentInstallment = baseInstallment;
          if (i === numInstallments - 1) { // Last installment takes the remainder
            currentInstallment = remaining;
          }
          installments.push(currentInstallment);
          remaining = Math.round((remaining - currentInstallment) * 100) / 100; // Ensure accurate subtraction
        }
        
        return {
          ...detail,
          installments
        };
      });

      const splitSummary = summary.map(item => {
        let individualAmount = parseFloat(item.individualAmount);
        const installments = [];
        let remaining = individualAmount;
        const baseInstallment = Math.floor((individualAmount / numInstallments) * 100) / 100;

        for (let i = 0; i < numInstallments; i++) {
          let currentInstallment = baseInstallment;
          if (i === numInstallments - 1) {
            currentInstallment = remaining;
          }
          installments.push(currentInstallment);
          remaining = Math.round((remaining - currentInstallment) * 100) / 100;
        }
        
        return {
          ...item,
          installments,
          totalAmount: parseFloat(item.totalAmount)
        };
      });

      return { splitDetails, splitSummary };
    };

    const distributionType = formData.tipoDistribucion; // Obtener el tipo de distribución desde formData

    // Validaciones más robustas
    if (!distributionType) {
      setError('Seleccione un tipo de distribución.');
      setShowCalculationSection(false); // Hide calculation section on error
      return;
    }
    
    if (!formData.costoTotal || isNaN(formData.costoTotal) || Number(formData.costoTotal) <= 0) {
      setError('Ingrese un costo total válido mayor a cero.');
      setShowCalculationSection(false);
      return;
    }
    
    if (formData.miembros.length === 0) {
      setError('Seleccione al menos un miembro participante.');
      setShowCalculationSection(false);
      return;
    }

    setError('');
    setSuccess('');

    try {
      const costoTotal = Number(formData.costoTotal);
      const selectedMembersData = members.filter(member => 
        formData.miembros.includes(member.id)
      );

      // Verificar que tenemos miembros seleccionados
      if (selectedMembersData.length === 0) {
        throw new Error('No se encontraron datos para los miembros seleccionados.');
      }

      let result;

      switch(distributionType) {
        case 'igualdad':
          result = calculateEqualPayments(selectedMembersData, costoTotal);
          break;
        case 'categoria':
          // Verificar que todos los miembros tengan categoría
          if (selectedMembersData.some(m => !m.category)) {
            throw new Error('Algunos miembros seleccionados no tienen categoría asignada. Por favor, complete la información de los miembros.');
          }
          result = calculateCategoryPayments(selectedMembersData, costoTotal);
          break;
        case 'jaulas':
          // Verificar que todos los miembros tengan jaulas válidas
          if (selectedMembersData.some(m => isNaN(m.cages) || m.cages <= 0)) {
            throw new Error('Algunos miembros seleccionados no tienen una cantidad de jaulas válida. Por favor, complete la información de los miembros.');
          }
          result = calculateCagePayments(selectedMembersData, costoTotal);
          break;
        default:
          throw new Error('Tipo de distribución no válido.');
      }

      // Dividir los pagos según número de abonos
      const { splitDetails, splitSummary } = splitPaymentsByInstallments(
        result.paymentDetails, 
        result.summary, 
        formData.numeroAbono
      );

      setPaymentResults({
        details: splitDetails,
        summary: splitSummary,
        distributionType,
        numInstallments: parseInt(formData.numeroAbono) || 1
      });
      setSuccess('Cálculo completado correctamente.');
      setShowCalculationSection(true);

    } catch (error) {
      console.error("Error en cálculo:", error);
      setError(error.message || 'Ocurrió un error al calcular las aportaciones.');
      setShowCalculationSection(false); // Hide calculation section on error
    }
  }, [formData.costoTotal, formData.miembros, formData.numeroAbono, formData.tipoDistribucion, members]);

  // Recalcular cuando cambia el número de abonos, tipo de distribución, costo total, o miembros
  useEffect(() => {
    // Only recalculate if a distribution type is selected and essential data is present
    if (formData.tipoDistribucion && formData.costoTotal && formData.miembros.length > 0) {
      calculateIndividualPayments(); // Llamar sin argumentos, ya que toma los datos de formData
    }
  }, [formData.numeroAbono, formData.tipoDistribucion, formData.costoTotal, formData.miembros.length, calculateIndividualPayments]);


  // Enviar el formulario
const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setSuccess('');

  if (!paymentResults || !showCalculationSection) { // Ensure calculation was successful and displayed
    setError('Por favor, realice y verifique el cálculo de las aportaciones antes de guardar.');
    return;
  }
  if (!formData.fechaLimite) {
    setError('Por favor, seleccione una fecha límite.');
    return;
  }


  try {
    // 1. Crear el documento de aportación principal en la colección 'contributions'
    const docRef = await addDoc(collection(db, 'contributions'), {
      titulo: formData.titulo,
      descripcion: formData.descripcion,
      costoTotal: Number(formData.costoTotal),
      tipoDistribucion: formData.tipoDistribucion,
      miembrosParticipantesIds: formData.miembros, // Renombrado a lo recomendado
      fechaLimite: new Date(formData.fechaLimite),
      numeroAbono: Number(formData.numeroAbono),
      estadoGeneral: 'pendiente', // Nuevo campo: estado general de la aportación
      creadoPor: formData.creadoPor,
      fechaCreacion: serverTimestamp(),
      // Guardar solo el summary de paymentResults para la aportación principal
      paymentCalculationSummary: paymentResults.summary 
    });

    // 2. Crear registros individuales en la colección 'member_contributions' para cada miembro
    const batch = writeBatch(db);
    
    paymentResults.details.forEach(memberDetail => {
      const member = members.find(m => `${m.name} ${m.lastName}` === memberDetail.name);
      if (!member) {
          console.warn(`Miembro no encontrado para el detalle de pago: ${memberDetail.name}`);
          return;
      }
      
      const memberContributionRef = doc(collection(db, 'member_contributions'));
      
      // Mapear los abonos a la nueva estructura recomendada
      const abonos = memberDetail.installments.map((amount, index) => ({
        numeroAbono: index + 1, // Nuevo nombre de campo
        montoAbono: parseFloat(amount.toFixed(2)), // Ensure 2 decimal places before saving
        fechaPago: null,
        estadoAbono: "pendiente", // Nuevo nombre de campo
        metodoPago: null,
        comprobanteUrl: null, // Nuevo nombre de campo
        registradoPor: null,
        fechaRegistroPago: null
      }));
      
      batch.set(memberContributionRef, {
        contributionId: docRef.id,
        memberId: member.id,
        montoTotalMiembro: parseFloat(parseFloat(memberDetail.amount).toFixed(2)), // Ensure 2 decimal places before saving
        estadoPagoMiembro: "pendiente", // Nuevo campo: estado de pago individual del miembro
        fechaCreacion: serverTimestamp(),
        fechaActualizacion: serverTimestamp(),
        // Datos denormalizados para fácil visualización y consulta
        miembroNombreCompleto: `${member.name} ${member.lastName}`, // Nuevo nombre de campo
        miembroCategoria: member.category, // Nuevo campo
        miembroCantidadJaulas: member.cages, // Nuevo campo
        contributionTitulo: formData.titulo,
        contributionFechaLimite: new Date(formData.fechaLimite), // Nuevo nombre de campo
        abonos: abonos
      });
    });

    await batch.commit();

    setSuccess(`Aportación "${formData.titulo}" creada exitosamente!`);
    setTimeout(() => navigate('/contributions'), 2000);
  } catch (err) {
    console.error("Error al crear aportación: ", err);
    setError('Error al crear la aportación. Por favor intente nuevamente.');
  }
};

  return (
    <div className="card-modern p-6 animate-fadeInUp"> {/* Estilo de tarjeta moderna y animación */}
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Nueva Aportación</h2>
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-start">
          <XMarkIcon className="h-5 w-5 mr-2" />
          <span>{error}</span>
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-lg flex items-start">
          <CheckIcon className="h-5 w-5 mr-2" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sección 1: Información básica */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="titulo" className="block text-sm font-medium text-gray-700 mb-1">
              Título *
            </label>
            <div className="input-with-icon-wrapper">
              <div className="input-icon">
                <BarsArrowUpIcon className="h-5 w-5" />
              </div>
              <input
                type="text"
                id="titulo"
                name="titulo"
                value={formData.titulo}
                onChange={handleInputChange}
                className="input-field-inside flex-1" // Estilo de input mejorado
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="costoTotal" className="block text-sm font-medium text-gray-700 mb-1">
              Costo Total *
            </label>
            <div className="input-with-icon-wrapper">
              <div className="input-icon">
                <CurrencyDollarIcon className="h-5 w-5" />
              </div>
              <span className="text-gray-500 pl-2 pr-1">Q</span> {/* Símbolo de moneda */}
              <input
                type="number"
                id="costoTotal"
                name="costoTotal"
                value={formData.costoTotal}
                onChange={handleInputChange}
                min="1"
                step="0.01" // Permite decimales
                className="input-field-inside flex-1" // Estilo de input mejorado
                required
              />
            </div>
          </div>
        </div>

        {/* Selector de miembros */}
        <div className="space-y-2 card-modern p-4 animate-fadeInUp delay-1"> {/* Estilo de tarjeta para MemberSelector */}
          <label className="block text-sm font-medium text-gray-700">
            Miembros Participantes *
          </label>
          <MemberSelector 
            onMembersSelected={handleMembersSelected} 
            initialSelected={formData.miembros}
            key={JSON.stringify(formData.miembros)}
          />
          <div className="text-sm text-gray-600 space-y-1 mt-2">
            <p className="flex items-center"><UsersIcon className="h-4 w-4 mr-2 text-blue-dark" /> {formData.miembros.length} miembros seleccionados</p>
            <p className="flex items-center"><Square3Stack3DIcon className="h-4 w-4 mr-2 text-blue-dark" /> Total jaulas: {formData.totalJaulasSeleccionadas || 0}</p>
            {formData.categoriasMiembros && (
              <div className="flex flex-wrap gap-x-4">
                <span className="flex items-center">Grandes: <span className="font-semibold ml-1">{formData.categoriasMiembros.grande || 0}</span></span>
                <span className="flex items-center">Medianos: <span className="font-semibold ml-1">{formData.categoriasMiembros.mediano || 0}</span></span>
                <span className="flex items-center">Pequeños: <span className="font-semibold ml-1">{formData.categoriasMiembros.pequeño || 0}</span></span>
              </div>
            )}
          </div>
        </div>

        {/* Selector de distribución y número de abonos */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 animate-fadeInUp delay-2"> {/* Animación con retraso */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Distribución *
            </label>
            <select
              value={formData.tipoDistribucion}
              onChange={(e) => handleDistributionChange(e.target.value)}
              className="input-field w-full" // Estilo de input mejorado
            >
              <option value="">Seleccione un tipo</option>
              <option value="igualdad">Igualdad (todos pagan igual)</option>
              <option value="categoria">Por categoría</option>
              <option value="jaulas">Por cantidad de jaulas</option>
            </select>
          </div>

          <div>
            <label htmlFor="numeroAbono" className="block text-sm font-medium text-gray-700 mb-1">
              Número de Abonos *
            </label>
            <input
              type="number"
              id="numeroAbono"
              name="numeroAbono"
              value={formData.numeroAbono}
              onChange={handleInputChange}
              min="1"
              className="input-field w-full" // Estilo de input mejorado
              required
            />
          </div>
        </div>

        {/* Sección de cálculo (mostrar solo si hay resultados) */}
        {showCalculationSection && paymentResults && (
          <div className="mt-6 space-y-4 card-modern p-6 animate-fadeInUp delay-3"> {/* Estilo de tarjeta y animación */}
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Resultados del Cálculo</h3> {/* Título de sección */}
            
            {/* Tabla de detalles por miembro */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Miembro
                    </th>
                    {paymentResults.distributionType === 'jaulas' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Jaulas
                      </th>
                    )}
                    {paymentResults.distributionType === 'jaulas' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Monto por jaula
                      </th>
                    )}
                    {paymentResults.distributionType === 'categoria' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Categoría
                      </th>
                    )}
                    {/* Columnas de abonos */}
                    {Array.from({ length: paymentResults.numInstallments }).map((_, i) => (
                      <th key={i} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Abono {i + 1}
                      </th>
                    ))}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paymentResults.details.map((member, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {member.name}
                      </td>
                      {paymentResults.distributionType === 'jaulas' && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {member.cages}
                        </td>
                      )}
                      {paymentResults.distributionType === 'jaulas' && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          Q{member.amountPerCage}
                        </td>
                      )}
                      {paymentResults.distributionType === 'categoria' && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {member.category}
                        </td>
                      )}
                      {/* Mostrar cada abono */}
                      {member.installments.map((amount, i) => (
                        <td key={i} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          Q{amount.toFixed(2)} {/* Asegurarse de formatear */}
                        </td>
                      ))}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        Q{parseFloat(member.amount).toFixed(2)} {/* Asegurarse de formatear */}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tabla de resumen */}
            <div className="overflow-x-auto mt-6">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nivel
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cantidad
                    </th>
                    {/* Columnas de abonos */}
                    {Array.from({ length: paymentResults.numInstallments }).map((_, i) => (
                      <th key={i} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Abono {i + 1}
                      </th>
                    ))}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paymentResults.summary.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {item.count}
                      </td>
                      {/* Mostrar cada abono */}
                      {item.installments.map((amount, i) => (
                        <td key={i} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          Q{amount.toFixed(2)} {/* Asegurarse de formatear */}
                        </td>
                      ))}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        Q{parseFloat(item.totalAmount).toFixed(2)} {/* Asegurarse de formatear */}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-bold">
                    <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900" colSpan={2 + paymentResults.numInstallments}>
                      Total general
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">
                      Q{Number(formData.costoTotal).toFixed(2)} {/* Usar el costoTotal del form */}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Sección 2: Información adicional */}
        <div className="animate-fadeInUp delay-4"> {/* Animación con retraso */}
          <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-1">
            Descripción
          </label>
          <textarea
            id="descripcion"
            name="descripcion"
            rows={3}
            value={formData.descripcion}
            onChange={handleInputChange}
            className="input-field w-full" // Estilo de input mejorado
          />
        </div>

        <div className="animate-fadeInUp delay-5"> {/* Animación con retraso */}
          <label htmlFor="fechaLimite" className="block text-sm font-medium text-gray-700 mb-1">
            Fecha Límite *
          </label>
          <div className="input-with-icon-wrapper">
              <div className="input-icon">
                <CalendarDaysIcon className="h-5 w-5" />
              </div>
              <input
                type="datetime-local"
                id="fechaLimite"
                name="fechaLimite"
                value={formData.fechaLimite}
                onChange={handleInputChange}
                className="input-field-inside flex-1" // Estilo de input mejorado
                required
              />
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex justify-between pt-6 border-t animate-fadeInUp delay-6"> {/* Animación con retraso */}
          <button
            type="button"
            onClick={() => navigate('/contributions')}
            className="btn-secondary-outline inline-flex items-center" // Estilo de botón secundario
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn-primary-gradient inline-flex items-center" // Estilo de botón principal
          >
            <CheckIcon className="h-5 w-5 mr-2 icon-interactive" /> {/* Ícono interactivo */}
            Guardar Aportación
          </button>
        </div>
      </form>
    </div>
  );
};

export default ContributionForm;
