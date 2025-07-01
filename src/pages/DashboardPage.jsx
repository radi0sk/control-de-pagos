import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { Link } from 'react-router-dom';
import { CurrencyDollarIcon, CreditCardIcon, BuildingLibraryIcon, WalletIcon, ScaleIcon, ChartBarIcon, UsersIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline'; // Importar iconos adicionales

const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summaryData, setSummaryData] = useState({
    totalAsignado: 0,
    totalRecaudado: 0,
    totalGastos: 0,
    totalGastosPagados: 0,
    totalGastosPendientes: 0,
    saldoDisponible: 0,
    deudaPorCobrar: 0,
    tasaRecuperacion: 0,
    topDebtors: [],
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [detailedDebts, setDetailedDebts] = useState([]); // Estado para la tabla de deudores detallada
  const [contributionsDataMap, setContributionsDataMap] = useState(new Map()); // Nuevo estado para almacenar el mapa de aportaciones (ID -> Título)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError('');

        let totalAsignado = 0;
        let totalRecaudado = 0;
        let totalGastos = 0;
        let totalGastosPagados = 0;
        let totalGastosPendientes = 0;

        const memberContributionsMap = new Map(); // Para acumular pagos por miembro y calcular deudas
        const detailedDebtsMap = new Map(); // Para la nueva tabla de deudores por aportación
        const tempContributionsMap = new Map(); // Variable temporal para construir el mapa de aportaciones

        // 1. Obtener todas las aportaciones para sus títulos y IDs
        const contributionsRef = collection(db, 'contributions');
        const contributionsSnap = await getDocs(contributionsRef);
        contributionsSnap.docs.forEach(doc => {
          tempContributionsMap.set(doc.id, doc.data().titulo);
        });
        setContributionsDataMap(tempContributionsMap); // Guardar el mapa en el estado

        // 2. Obtener todas las member_contributions
        const memberContributionsRef = collection(db, 'member_contributions');
        const mcSnap = await getDocs(memberContributionsRef);

        mcSnap.docs.forEach(doc => {
          const data = doc.data();
          const miembroId = data.memberId;
          const contributionId = data.contributionId;
          const montoTotalMiembro = data.montoTotalMiembro || 0;
          
          // Sumar los pagos parciales también para el total recaudado
          const pagadoActual = data.abonos?.reduce((sum, abono) => 
            sum + (abono.montoAbonoPagado || (abono.estadoAbono === 'pagado' ? abono.montoAbono : 0)), 0
          ) || 0;

          const pendienteActual = montoTotalMiembro - pagadoActual;

          totalAsignado += montoTotalMiembro;
          totalRecaudado += pagadoActual;

          // Acumular la deuda por miembro para el resumen general
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

          // Acumular deudas detalladas por miembro y por aportación
          if (pendienteActual > 0.01) { // Solo si hay deuda pendiente
            if (!detailedDebtsMap.has(miembroId)) {
              detailedDebtsMap.set(miembroId, {
                miembroNombreCompleto: data.miembroNombreCompleto,
                debts: new Map(), // Map para almacenar deudas por contributionId
                totalMemberDebt: 0,
              });
            }
            const memberDebtEntry = detailedDebtsMap.get(miembroId);
            memberDebtEntry.debts.set(contributionId, pendienteActual);
            memberDebtEntry.totalMemberDebt += pendienteActual;
          }
        });

        // Convertir detailedDebtsMap a un array para renderizar
        const sortedDetailedDebts = Array.from(detailedDebtsMap.values())
          .sort((a, b) => a.miembroNombreCompleto.localeCompare(b.miembroNombreCompleto))
          .map(entry => ({
            ...entry,
            debts: Object.fromEntries(entry.debts) // Convertir Map a objeto para fácil acceso en JSX
          }));
        setDetailedDebts(sortedDetailedDebts);


        // 3. Obtener datos de expenses (Gastos)
        const expensesRef = collection(db, 'expenses');
        const expensesSnap = await getDocs(expensesRef);
        expensesSnap.docs.forEach(doc => {
          const data = doc.data();
          const expenseMonto = data.monto || 0;
          totalGastos += expenseMonto; // Suma el monto total original del gasto

          // Calcular el monto pagado para este gasto específico (sumando abonos)
          const paidForThisExpense = data.abonos?.reduce((sum, abono) =>
            sum + (abono.montoAbonoPagado || (abono.estadoAbono === 'pagado' ? abono.montoAbono : 0)), 0
          ) || 0;

          const pendingForThisExpense = expenseMonto - paidForThisExpense;

          totalGastosPagados += paidForThisExpense;
          totalGastosPendientes += pendingForThisExpense;
        });

        const deudaPorCobrar = totalAsignado - totalRecaudado;
        const saldoDisponible = totalRecaudado - totalGastosPagados; 
        const tasaRecuperacion = totalAsignado > 0 ? (totalRecaudado / totalAsignado) * 100 : 0;

        // Actividad Reciente - Pagos de Aportaciones
        const recentPayments = mcSnap.docs.flatMap(doc => {
          const data = doc.data();
          return data.abonos
            ?.filter(abono => abono.fechaRegistroPago)
            .map(abono => ({
              type: 'Pago',
              description: `Pago de Q${abono.montoAbonoPagado?.toFixed(2) || abono.montoAbono?.toFixed(2)} por ${data.miembroNombreCompleto} para ${data.contributionTitulo}`,
              date: abono.fechaRegistroPago?.toDate(),
            }));
        }).filter(Boolean);

        // Actividad Reciente - Gastos
        const recentExpenses = expensesSnap.docs.map(doc => {
          const data = doc.data();
          let expenseDate = null;
          if (data.fechaGasto && data.fechaGasto.seconds) {
            expenseDate = new Date(data.fechaGasto.seconds * 1000);
          } else if (data.fecha && typeof data.fecha === 'string') {
            try {
              const parsedDate = new Date(data.fecha);
              if (!isNaN(parsedDate)) {
                expenseDate = parsedDate;
              }
            } catch (e) {
              console.warn("Could not parse old expense date string:", data.fecha, e);
            }
          }
          
          return {
            type: 'Gasto',
            description: `Gasto de Q${data.monto?.toFixed(2)} por ${data.descripcion}`,
            date: expenseDate,
          };
        }).filter(expense => expense.date);

        // Combinar y ordenar actividades recientes
        const combinedRecentActivities = [...recentPayments, ...recentExpenses]
          .sort((a, b) => b.date - a.date)
          .slice(0, 5);

        setSummaryData({
          totalAsignado: totalAsignado.toFixed(2),
          totalRecaudado: totalRecaudado.toFixed(2),
          totalGastos: totalGastos.toFixed(2),
          totalGastosPagados: totalGastosPagados.toFixed(2),
          totalGastosPendientes: totalGastosPendientes.toFixed(2),
          saldoDisponible: saldoDisponible.toFixed(2),
          deudaPorCobrar: deudaPorCobrar.toFixed(2),
          tasaRecuperacion: tasaRecuperacion.toFixed(2),
          topDebtors: [], // topDebtors se calcula en la nueva tabla detallada
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const { totalAsignado, totalRecaudado, totalGastos, totalGastosPagados, totalGastosPendientes, saldoDisponible, deudaPorCobrar, tasaRecuperacion } = summaryData;

  // Calcular totales para la tabla de deudores detallada
  const totalGeneralDeudasPorAportacion = {};
  detailedDebts.forEach(member => {
    for (const contributionId in member.debts) {
      if (totalGeneralDeudasPorAportacion[contributionId]) {
        totalGeneralDeudasPorAportacion[contributionId] += member.debts[contributionId];
      } else {
        totalGeneralDeudasPorAportacion[contributionId] = member.debts[contributionId];
      }
    }
  });

  // Filtrar las aportaciones que tienen deuda total general > 0
  const filteredContributionIds = Array.from(contributionsDataMap.keys()).filter(id => 
    (totalGeneralDeudasPorAportacion[id] || 0) > 0.01
  );

  return (
    <div className="container mx-auto px-4 py-8 animate-fadeInUp">
      {/* Encabezado principal con estilos mejorados */}
      <div className="main-header-section text-center mb-10">
        <h1 className="main-header-title">Resumen Financiero</h1>
        <p className="text-gray-500 mt-2">Vista general de las finanzas colectivas</p>
      </div>

      {/* Tarjetas de Resumen Ejecutivo con estilos mejorados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {/* Tarjeta 1: Total Asignado */}
        <div className="card-modern p-6 flex items-center justify-between bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <div>
            <p className="text-sm font-semibold opacity-80">Total Asignado</p>
            <p className="text-2xl font-bold">Q{totalAsignado}</p>
          </div>
          <CurrencyDollarIcon className="icon-xl text-white opacity-80" />
        </div>

        {/* Tarjeta 2: Total Recaudado */}
        <div className="card-modern p-6 flex items-center justify-between bg-gradient-to-r from-green-500 to-green-600 text-white">
          <div>
            <p className="text-sm font-semibold opacity-80">Total Recaudado</p>
            <p className="text-2xl font-bold">Q{totalRecaudado}</p>
          </div>
          <CreditCardIcon className="icon-xl text-white opacity-80" />
        </div>

        {/* Tarjeta 3: Saldo Disponible */}
        <div className={`card-modern p-6 flex items-center justify-between ${parseFloat(saldoDisponible) >= 0 ? 'bg-gradient-to-r from-teal-500 to-teal-600' : 'bg-gradient-to-r from-orange-500 to-orange-600'} text-white`}>
          <div>
            <p className="text-sm font-semibold opacity-80">Saldo Disponible</p>
            <p className="text-2xl font-bold">Q{saldoDisponible}</p>
          </div>
          <WalletIcon className="icon-xl text-white opacity-80" />
        </div>

        {/* Tarjeta 4: Deuda por Cobrar */}
        <div className="card-modern p-6 flex items-center justify-between bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <div>
            <p className="text-sm font-semibold opacity-80">Deuda por Cobrar</p>
            <p className="text-2xl font-bold">Q{deudaPorCobrar}</p>
          </div>
          <ScaleIcon className="icon-xl text-white opacity-80" />
        </div>

        {/* Tarjeta 5: Tasa de Recuperación */}
        <div className="card-modern p-6 flex items-center justify-between bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
          <div>
            <p className="text-sm font-semibold opacity-80">Tasa de Recuperación</p>
            <p className="text-2xl font-bold">{tasaRecuperacion}%</p>
          </div>
          <ChartBarIcon className="icon-xl text-white opacity-80" />
        </div>

        {/* Tarjeta 6: Total de Gastos (General) */}
        <div className="card-modern p-6 flex items-center justify-between bg-gradient-to-r from-red-500 to-red-600 text-white">
          <div>
            <p className="text-sm font-semibold opacity-80">Total de Gastos (General)</p>
            <p className="text-2xl font-bold">Q{totalGastos}</p>
          </div>
          <BuildingLibraryIcon className="icon-xl text-white opacity-80" />
        </div>

        {/* Tarjeta 7: Total Gastos Pagados */}
        <div className="card-modern p-6 flex items-center justify-between bg-gradient-to-r from-green-700 to-green-800 text-white">
          <div>
            <p className="text-sm font-semibold opacity-80">Gastos Pagados</p>
            <p className="text-2xl font-bold">Q{totalGastosPagados}</p>
          </div>
          <CheckCircleIcon className="icon-xl text-white opacity-80" />
        </div>

        {/* Tarjeta 8: Falta por Pagar (Gastos) */}
        <div className="card-modern p-6 flex items-center justify-between bg-gradient-to-r from-orange-700 to-orange-800 text-white">
          <div>
            <p className="text-sm font-semibold opacity-80">Falta por Pagar (Gastos)</p>
            <p className="text-2xl font-bold">Q{totalGastosPendientes}</p>
          </div>
          <ClockIcon className="icon-xl text-white opacity-80" />
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

        {/* Principales Deudores (resumen simple, la tabla de abajo es más detallada) */}
        <div className="card-modern p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Principales Deudores (Resumen)</h2>
          {detailedDebts.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {detailedDebts
                .filter(debtor => debtor.totalMemberDebt > 0.01) // Solo mostrar si tienen deuda
                .sort((a, b) => b.totalMemberDebt - a.totalMemberDebt) // Ordenar por deuda total
                .slice(0, 5) // Mostrar los 5 principales
                .map((debtor, index) => (
                <li key={index} className="py-3 flex justify-between items-center">
                  <span className="text-gray-700">{debtor.miembroNombreCompleto}</span>
                  <span className="text-red-600 font-semibold">Q{debtor.totalMemberDebt.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No hay deudores pendientes.</p>
          )}
        </div>
      </div>

      {/* NUEVA SECCIÓN: DETALLE COMPLETO DE DEUDAS POR INTEGRANTE */}
      <div className="card-modern p-6 mb-10 animate-fadeInUp delay-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Detalle Completo de Deudas por Integrante</h2>
        <p className="text-gray-600 mb-4">Deudas de Aportaciones por cada miembro y concepto.</p>

        {detailedDebts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No hay deudas pendientes registradas.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-purple-800 to-purple-600">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Integrante
                  </th>
                  {/* Encabezados de aportaciones dinámicos, solo si tienen deuda total general */}
                  {filteredContributionIds.map((id, index) => (
                    <th key={id} scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      {contributionsDataMap.get(id)}
                    </th>
                  ))}
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    TOTAL
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {detailedDebts.map((member) => (
                  <tr key={member.miembroNombreCompleto}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {member.miembroNombreCompleto}
                    </td>
                    {/* Deudas por aportación, solo para las columnas filtradas */}
                    {filteredContributionIds.map((contributionId) => (
                      <td key={contributionId} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        Q{member.debts[contributionId]?.toFixed(2) || '0.00'}
                      </td>
                    ))}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      Q{member.totalMemberDebt.toFixed(2)}
                    </td>
                  </tr>
                ))}
                {/* Fila de totales generales */}
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">TOTAL GENERAL</td>
                  {filteredContributionIds.map((id) => (
                    <td key={id} className="px-6 py-4 whitespace-nowrap text-base text-gray-900">
                      Q{totalGeneralDeudasPorAportacion[id]?.toFixed(2) || '0.00'}
                    </td>
                  ))}
                  <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">
                    Q{deudaPorCobrar} {/* Este ya es el total general de deuda */}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
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
