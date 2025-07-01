import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react'; // Importar useState y useEffect
import { collection, getDocs, query, where } from 'firebase/firestore'; // Importar Firestore
import { db } from '../firebase/firebaseConfig'; // Asegúrate de que la ruta a tu db sea correcta
import ContributionList from '../components/contributions/ContributionList';
import { PlusIcon } from '@heroicons/react/24/outline';

const ContributionsPage = () => {
  const [summaryData, setSummaryData] = useState([]);
  const [totalGeneralAsignado, setTotalGeneralAsignado] = useState(0);
  const [totalGeneralRecaudado, setTotalGeneralRecaudado] = useState(0);
  const [totalGeneralPendiente, setTotalGeneralPendiente] = useState(0);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [errorSummary, setErrorSummary] = useState('');

  useEffect(() => {
    const fetchSummaryData = async () => {
      setLoadingSummary(true);
      setErrorSummary('');
      try {
        const contributionsRef = collection(db, 'contributions');
        const contributionsSnap = await getDocs(contributionsRef);
        const fetchedContributions = contributionsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        let tempSummary = [];
        let currentTotalGeneralAsignado = 0;
        let currentTotalGeneralRecaudado = 0;
        let currentTotalGeneralPendiente = 0;

        for (const contribution of fetchedContributions) {
          const memberContributionsRef = collection(db, 'member_contributions');
          const q = query(memberContributionsRef, where('contributionId', '==', contribution.id));
          const memberContributionsSnap = await getDocs(q);

          let montoAsignadoContribution = 0;
          let recaudadoContribution = 0;

          memberContributionsSnap.docs.forEach(mcDoc => {
            const mcData = mcDoc.data();
            montoAsignadoContribution += mcData.montoTotalMiembro || 0;

            const pagadoAbonos = mcData.abonos?.reduce((sum, abono) =>
              sum + (abono.montoAbonoPagado || (abono.estadoAbono === 'pagado' ? abono.montoAbono : 0)), 0
            ) || 0;
            recaudadoContribution += pagadoAbonos;
          });

          const pendienteContribution = montoAsignadoContribution - recaudadoContribution;
          const porcentajeRecaudado = montoAsignadoContribution > 0
            ? (recaudadoContribution / montoAsignadoContribution) * 100
            : 0;

          tempSummary.push({
            id: contribution.id,
            titulo: contribution.titulo,
            montoAsignado: montoAsignadoContribution,
            recaudado: recaudadoContribution,
            porcentajeRecaudado: porcentajeRecaudado,
            pendiente: pendienteContribution,
          });

          currentTotalGeneralAsignado += montoAsignadoContribution;
          currentTotalGeneralRecaudado += recaudadoContribution;
          currentTotalGeneralPendiente += pendienteContribution;
        }

        // Calcular "% del Total" después de tener el total general asignado
        const finalSummary = tempSummary.map(item => ({
          ...item,
          porcentajeTotal: currentTotalGeneralAsignado > 0
            ? (item.montoAsignado / currentTotalGeneralAsignado) * 100
            : 0,
        }));

        setSummaryData(finalSummary);
        setTotalGeneralAsignado(currentTotalGeneralAsignado);
        setTotalGeneralRecaudado(currentTotalGeneralRecaudado);
        setTotalGeneralPendiente(currentTotalGeneralPendiente);

      } catch (err) {
        console.error("Error al cargar el resumen de aportaciones:", err);
        setErrorSummary('Error al cargar el resumen de aportaciones. Intente de nuevo.');
      } finally {
        setLoadingSummary(false);
      }
    };

    fetchSummaryData();
  }, []); // Se ejecuta una vez al montar el componente

  return (
    <div className="container mx-auto px-4 py-8 animate-fadeInUp">
      {/* Encabezado mejorado con los estilos de App.css */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div className="main-header-section">
          <h1 className="main-header-title">Aportaciones</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestión de aportaciones colectivas de los miembros
          </p>
        </div>
        
        {/* Botón mejorado con el gradiente */}
        <Link 
          to="/contributions/new" 
          className="btn-primary-gradient inline-flex items-center gap-2"
        >
          <PlusIcon className="icon icon-md text-white" />
          Nueva Aportación
        </Link>
      </div>

      {/* Contenedor de la lista con estilos de tarjeta moderna */}
      <div className="card-modern p-6 mb-8"> {/* Añadido mb-8 para espacio con el resumen */}
        <ContributionList />
      </div>

      {/* Sección de resumen de ingresos totales */}
      <div className="card-modern p-6 animate-fadeInUp delay-3"> {/* Animación con retraso */}
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Resumen de Ingresos Totales</h2>
        
        {loadingSummary ? (
          <div className="flex justify-center py-8">
            <div className="spinner"></div>
            <span className="ml-4 text-gray-600">Cargando resumen...</span>
          </div>
        ) : errorSummary ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline"> {errorSummary}</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-blue-800 to-blue-600">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Concepto
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Monto Asignado
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    % del Total
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Recaudado
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    % Recaudado
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Pendiente
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {summaryData.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.titulo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      Q{item.montoAsignado.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {item.porcentajeTotal.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      Q{item.recaudado.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {item.porcentajeRecaudado.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      Q{item.pendiente.toFixed(2)}
                    </td>
                  </tr>
                ))}
                {/* Fila de totales generales */}
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">TOTALES GENERALES</td>
                  <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">Q{totalGeneralAsignado.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">100%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">Q{totalGeneralRecaudado.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">
                    {(totalGeneralAsignado > 0 ? (totalGeneralRecaudado / totalGeneralAsignado) * 100 : 0).toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">Q{totalGeneralPendiente.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContributionsPage;
