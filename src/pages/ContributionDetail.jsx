import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

const ContributionDetail = () => {
  const { id } = useParams();
  const [contribution, setContribution] = useState(null);
  const [memberContributions, setMemberContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchContributionDetails = async () => {
      try {
        setError('');
        setLoading(true);

        const contributionRef = doc(db, 'contributions', id);
        const contributionSnap = await getDoc(contributionRef);

        if (!contributionSnap.exists()) {
          setError('Aportación no encontrada.');
          setLoading(false);
          return;
        }

        const contributionData = { id: contributionSnap.id, ...contributionSnap.data() };
        setContribution(contributionData);

        const memberContributionsRef = collection(db, 'member_contributions');
        const q = query(memberContributionsRef, where('contributionId', '==', id));
        const memberContributionsSnap = await getDocs(q);

        const fetchedMemberContributions = memberContributionsSnap.docs.map(doc => {
          const data = doc.data();
          // Calculate 'pagado' considering both fully paid abonos and partially paid abonos
          const pagado = data.abonos?.reduce((sum, abono) => 
            sum + (abono.montoAbonoPagado || (abono.estadoAbono === 'pagado' ? abono.montoAbono : 0)), 0
          ) || 0;
          
          const pendiente = (data.montoTotalMiembro - pagado);
          return {
            id: doc.id,
            ...data,
            pagado: pagado.toFixed(2),
            // Ensure pendiente is 0 if very close to 0 due to floating point inaccuracies
            pendiente: parseFloat(pendiente.toFixed(2)) === 0 ? (0).toFixed(2) : pendiente.toFixed(2)
          };
        });

        fetchedMemberContributions.sort((a, b) => a.miembroNombreCompleto.localeCompare(b.miembroNombreCompleto));
        setMemberContributions(fetchedMemberContributions);

      } catch (err) {
        console.error("Error al cargar detalles de la aportación:", err);
        setError('Error al cargar los detalles de la aportación. Intente de nuevo.');
      } finally {
        setLoading(false);
      }
    };

    fetchContributionDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-gray-600">Cargando detalles de la aportación...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link to="/contributions" className="inline-flex items-center text-sm text-blue-600 hover:text-blue-900">
            <ArrowLeftIcon className="h-4 w-4 mr-1 icon-interactive" /> Volver a Aportaciones
          </Link>
        </div>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }

  if (!contribution) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link to="/contributions" className="inline-flex items-center text-sm text-blue-600 hover:text-blue-900">
            <ArrowLeftIcon className="h-4 w-4 mr-1 icon-interactive" /> Volver a Aportaciones
          </Link>
        </div>
        <div className="text-center text-gray-600">Contribución no encontrada.</div>
      </div>
    );
  }

  const totalCuotaAsignada = memberContributions.reduce((sum, mc) => sum + mc.montoTotalMiembro, 0);
  const totalPagado = memberContributions.reduce((sum, mc) => sum + parseFloat(mc.pagado), 0);
  const totalPendiente = memberContributions.reduce((sum, mc) => sum + parseFloat(mc.pendiente), 0);

  return (
    <div className="container mx-auto px-4 py-8 animate-fadeInUp">
      <div className="mb-6">
        <Link to="/contributions" className="inline-flex items-center text-sm text-blue-600 hover:text-blue-900">
          <ArrowLeftIcon className="h-4 w-4 mr-1 icon-interactive" /> Volver a Aportaciones
        </Link>
      </div>

      {/* Tarjeta de detalles de la aportación */}
      <div className="card-modern p-6 mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">{contribution.titulo}</h1>
        <p className="text-gray-600 mb-6">{contribution.descripcion}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-700">
          <div className="space-y-3">
            <p><span className="font-semibold text-blue-800">Costo Total:</span> <span className="text-gray-900">Q{contribution.costoTotal?.toFixed(2)}</span></p>
            <p><span className="font-semibold text-blue-800">Tipo de Distribución:</span> <span className="text-gray-900">{contribution.tipoDistribucion}</span></p>
            <p><span className="font-semibold text-blue-800">Número de Abonos:</span> <span className="text-gray-900">{contribution.numeroAbono}</span></p>
            <p><span className="font-semibold text-blue-800">Fecha Límite:</span> <span className="text-gray-900">{contribution.fechaLimite && new Date(contribution.fechaLimite?.toDate()).toLocaleDateString()}</span></p>
          </div>
          <div className="space-y-3">
            <p><span className="font-semibold text-blue-800">Estado General:</span> 
              <span className={`ml-2 px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                contribution.estadoGeneral === 'completo' ? 'bg-green-100 text-green-800' : 
                contribution.estadoGeneral === 'parcialmente_pagado' ? 'bg-orange-100 text-orange-800' : // New style for partially paid
                'bg-red-100 text-red-800'
              }`}>
                {contribution.estadoGeneral}
              </span>
            </p>
            <p><span className="font-semibold text-blue-800">Creado Por:</span> <span className="text-gray-900">{contribution.creadoPor}</span></p>
            <p><span className="font-semibold text-blue-800">Fecha Creación:</span> <span className="text-gray-900">{contribution.fechaCreacion && new Date(contribution.fechaCreacion.toDate()).toLocaleString()}</span></p>
          </div>
        </div>
      </div>

      {/* Sección de detalles de miembros */}
      {memberContributions.length > 0 && (
        <div className="card-modern p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Detalle de Aportaciones por Miembro</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-blue-800 to-blue-600">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Miembro
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Cuota Asignada
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Pagado
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Pendiente
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Estado
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {memberContributions.map((mc) => (
                  <tr key={mc.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {mc.miembroNombreCompleto}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      Q{mc.montoTotalMiembro?.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      Q{mc.pagado}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      Q{mc.pendiente}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          mc.estadoPagoMiembro === 'completo' ? 'bg-green-100 text-green-800' : 
                          mc.estadoPagoMiembro === 'parcialmente_pagado' ? 'bg-orange-100 text-orange-800' : // Style for partially paid
                          'bg-red-100 text-red-800'
                      }`}>
                        {mc.estadoPagoMiembro}
                      </span>
                      {mc.estadoPagoMiembro === 'completo' ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-500 inline-block ml-2 icon-interactive" />
                      ) : (
                          <XCircleIcon className="h-5 w-5 text-red-500 inline-block ml-2 icon-interactive" />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {mc.estadoPagoMiembro !== 'completo' && (
                        <Link 
                          to={`/contributions/${contribution.id}/members/${mc.id}/register-payment`}
                          className="btn-secondary-outline text-sm px-3 py-1"
                        >
                          Registrar Pago
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
                {/* Fila de totales */}
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">TOTALES</td>
                  <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">Q{totalCuotaAsignada.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">Q{totalPagado.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">Q{totalPendiente.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap"></td>
                  <td className="px-6 py-4 whitespace-nowrap"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContributionDetail;
