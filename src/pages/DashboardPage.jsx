import { useEffect, useState } from 'react';
import { collection,  getDocs} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { Link } from 'react-router-dom';
import { CurrencyDollarIcon, CreditCardIcon, BuildingLibraryIcon, WalletIcon, ScaleIcon, ChartBarIcon, UsersIcon } from '@heroicons/react/24/outline';

const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summaryData, setSummaryData] = useState({
    totalAsignado: 0,
    totalRecaudado: 0,
    totalGastos: 0,
    saldoDisponible: 0,
    deudaPorCobrar: 0,
    tasaRecuperacion: 0,
    topDebtors: [],
  });
  const [recentActivities, setRecentActivities] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError('');

        let totalAsignado = 0;
        let totalRecaudado = 0;
        let totalGastos = 0;
        const memberContributionsMap = new Map();

        const memberContributionsRef = collection(db, 'member_contributions');
        const mcSnap = await getDocs(memberContributionsRef);

        mcSnap.docs.forEach(doc => {
          const data = doc.data();
          const miembroId = data.miembroId;
          const montoTotalMiembro = data.montoTotalMiembro || 0;
          
          const pagadoActual = data.abonos?.reduce((sum, abono) => 
            sum + (abono.estadoAbono === 'pagado' ? abono.montoAbono : 0), 0
          ) || 0;

          totalAsignado += montoTotalMiembro;
          totalRecaudado += pagadoActual;

          if (!memberContributionsMap.has(miembroId)) {
            memberContributionsMap.set(miembroId, {
              miembroNombreCompleto: data.miembroNombreCompleto,
              totalAsignadoMiembro: 0,
              totalPagadoMiembro: 0,
            });
          }
          const miembroData = memberContributionsMap.get(miembroId);
          miembroData.totalAsignadoMiembro += montoTotalMiembro;
          miembroData.totalPagadoMiembro += pagadoActual;
        });

        const expensesRef = collection(db, 'expenses');
        const expensesSnap = await getDocs(expensesRef);
        expensesSnap.docs.forEach(doc => {
          totalGastos += doc.data().monto || 0;
        });

        const deudaPorCobrar = totalAsignado - totalRecaudado;
        const saldoDisponible = totalRecaudado - totalGastos;
        const tasaRecuperacion = totalAsignado > 0 ? (totalRecaudado / totalAsignado) * 100 : 0;

        const topDebtors = Array.from(memberContributionsMap.values())
          .map(miembro => ({
            miembroNombreCompleto: miembro.miembroNombreCompleto,
            deuda: (miembro.totalAsignadoMiembro - miembro.totalPagadoMiembro).toFixed(2),
          }))
          .filter(miembro => parseFloat(miembro.deuda) > 0)
          .sort((a, b) => parseFloat(b.deuda) - parseFloat(a.deuda))
          .slice(0, 5);

        const recentPayments = mcSnap.docs.flatMap(doc => {
          const data = doc.data();
          return data.abonos
            ?.filter(abono => abono.estadoAbono === 'pagado' && abono.fechaRegistroPago)
            .map(abono => ({
              type: 'Pago',
              description: `Pago de Q${abono.montoAbono?.toFixed(2)} por ${data.miembroNombreCompleto} para ${data.contributionTitulo}`,
              date: abono.fechaRegistroPago?.toDate(),
            }));
        }).filter(Boolean);

        const recentExpenses = expensesSnap.docs.map(doc => ({
          type: 'Gasto',
          description: `Gasto de Q${doc.data().monto?.toFixed(2)} por ${doc.data().concept}`,
          date: doc.data().date?.toDate(),
        }));

        const combinedRecentActivities = [...recentPayments, ...recentExpenses]
          .sort((a, b) => b.date - a.date)
          .slice(0, 5);

        setSummaryData({
          totalAsignado: totalAsignado.toFixed(2),
          totalRecaudado: totalRecaudado.toFixed(2),
          totalGastos: totalGastos.toFixed(2),
          saldoDisponible: saldoDisponible.toFixed(2),
          deudaPorCobrar: deudaPorCobrar.toFixed(2),
          tasaRecuperacion: tasaRecuperacion.toFixed(2),
          topDebtors,
        });
        setRecentActivities(combinedRecentActivities);

      } catch (err) {
        console.error("Error al cargar los datos del Dashboard:", err);
        setError('Error al cargar los datos del tablero. Intente de nuevo.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="spinner"></div>
        <div className="text-gray-600 ml-3">Cargando tablero...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }

  const { totalAsignado, totalRecaudado, totalGastos, saldoDisponible, deudaPorCobrar, tasaRecuperacion, topDebtors } = summaryData;

  return (
    <div className="container mx-auto px-4 py-8 animate-fadeInUp">
      {/* Encabezado principal con estilos mejorados */}
      <div className="main-header-section text-center mb-10">
        <h1 className="main-header-title">Resumen Financiero</h1>
        <p className="text-gray-500 mt-2">Vista general de las finanzas colectivas</p>
      </div>

      {/* Tarjetas de Resumen Ejecutivo con estilos mejorados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {/* Tarjeta 1 */}
        <div className="card-modern p-6 flex items-center justify-between bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <div>
            <p className="text-sm font-semibold opacity-80">Total Asignado</p>
            <p className="text-2xl font-bold">Q{totalAsignado}</p>
          </div>
          <CurrencyDollarIcon className="icon-xl text-white opacity-80" />
        </div>

        {/* Tarjeta 2 */}
        <div className="card-modern p-6 flex items-center justify-between bg-gradient-to-r from-green-500 to-green-600 text-white">
          <div>
            <p className="text-sm font-semibold opacity-80">Total Recaudado</p>
            <p className="text-2xl font-bold">Q{totalRecaudado}</p>
          </div>
          <CreditCardIcon className="icon-xl text-white opacity-80" />
        </div>

        {/* Tarjeta 3 */}
        <div className="card-modern p-6 flex items-center justify-between bg-gradient-to-r from-red-500 to-red-600 text-white">
          <div>
            <p className="text-sm font-semibold opacity-80">Total Gastos</p>
            <p className="text-2xl font-bold">Q{totalGastos}</p>
          </div>
          <BuildingLibraryIcon className="icon-xl text-white opacity-80" />
        </div>

        {/* Tarjeta 4 */}
        <div className={`card-modern p-6 flex items-center justify-between ${parseFloat(saldoDisponible) >= 0 ? 'bg-gradient-to-r from-teal-500 to-teal-600' : 'bg-gradient-to-r from-orange-500 to-orange-600'} text-white`}>
          <div>
            <p className="text-sm font-semibold opacity-80">Saldo Disponible</p>
            <p className="text-2xl font-bold">Q{saldoDisponible}</p>
          </div>
          <WalletIcon className="icon-xl text-white opacity-80" />
        </div>

        {/* Tarjeta 5 */}
        <div className="card-modern p-6 flex items-center justify-between bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <div>
            <p className="text-sm font-semibold opacity-80">Deuda por Cobrar</p>
            <p className="text-2xl font-bold">Q{deudaPorCobrar}</p>
          </div>
          <ScaleIcon className="icon-xl text-white opacity-80" />
        </div>

        {/* Tarjeta 6 */}
        <div className="card-modern p-6 flex items-center justify-between bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
          <div>
            <p className="text-sm font-semibold opacity-80">Tasa de Recuperación</p>
            <p className="text-2xl font-bold">{tasaRecuperacion}%</p>
          </div>
          <ChartBarIcon className="icon-xl text-white opacity-80" />
        </div>
      </div>

      {/* Sección de gráficos y deudores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        {/* Gráfico Comparativo */}
        <div className="card-modern p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Ingresos vs. Gastos</h2>
          <div className="flex flex-col gap-4">
            <div className="h-10 bg-green-500 rounded-md flex items-center justify-between px-4 text-white font-medium"
                 style={{ width: `${Math.min((parseFloat(totalRecaudado) / Math.max(parseFloat(totalAsignado), parseFloat(totalGastos))) * 100, 100)}%` }}>
              <span>Recaudado</span>
              <span>Q{totalRecaudado}</span>
            </div>
            <div className="h-10 bg-red-500 rounded-md flex items-center justify-between px-4 text-white font-medium"
                 style={{ width: `${Math.min((parseFloat(totalGastos) / Math.max(parseFloat(totalAsignado), parseFloat(totalGastos))) * 100, 100)}%` }}>
              <span>Gastos</span>
              <span>Q{totalGastos}</span>
            </div>
          </div>
        </div>

        {/* Principales Deudores */}
        <div className="card-modern p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Principales Deudores</h2>
          {topDebtors.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {topDebtors.map((debtor, index) => (
                <li key={index} className="py-3 flex justify-between items-center">
                  <span className="text-gray-700">{debtor.miembroNombreCompleto}</span>
                  <span className="text-red-600 font-semibold">Q{debtor.deuda}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No hay deudores pendientes.</p>
          )}
        </div>
      </div>

      {/* Actividad Reciente */}
      <div className="card-modern p-6 mb-10">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Actividad Reciente</h2>
        {recentActivities.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {recentActivities.map((activity, index) => (
              <li key={index} className="py-3 flex justify-between items-center text-sm">
                <span className="flex-1 text-gray-700">{activity.description}</span>
                <span className="text-gray-500 ml-4">{activity.date?.toLocaleDateString()}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ml-4 ${activity.type === 'Pago' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {activity.type}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No hay actividad reciente.</p>
        )}
      </div>

      {/* Navegación Rápida con estilos mejorados */}
      <div className="text-center">
        <h2 className="main-header-title text-2xl mb-6">Navegación Rápida</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
          <Link to="/contributions" className="card-modern p-4 text-center hover:transform hover:-translate-y-1 transition-transform">
            <CurrencyDollarIcon className="icon-lg text-blue-600 mx-auto mb-2" />
            <span className="text-sm font-medium">Aportaciones</span>
          </Link>
          <Link to="/members" className="card-modern p-4 text-center hover:transform hover:-translate-y-1 transition-transform">
            <UsersIcon className="icon-lg text-green-600 mx-auto mb-2" />
            <span className="text-sm font-medium">Miembros</span>
          </Link>
          <Link to="/expenses" className="card-modern p-4 text-center hover:transform hover:-translate-y-1 transition-transform">
            <BuildingLibraryIcon className="icon-lg text-red-600 mx-auto mb-2" />
            <span className="text-sm font-medium">Gastos</span>
          </Link>
          <Link to="/contributions/new" className="card-modern p-4 text-center hover:transform hover:-translate-y-1 transition-transform">
            <CreditCardIcon className="icon-lg text-purple-600 mx-auto mb-2" />
            <span className="text-sm font-medium">Nueva Aportación</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;