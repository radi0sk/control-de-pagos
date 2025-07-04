// src/pages/MemberContributionsSummaryPage.jsx
import React, { useState, useEffect, useRef } from 'react'; // Import useRef
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { ArrowLeftIcon, CurrencyDollarIcon, CheckIcon, ClockIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline'; // Import DocumentArrowDownIcon
import html2pdf from 'html2pdf.js'; // Import html2pdf

const MemberContributionsSummaryPage = () => {
  const { memberId } = useParams();
  const [member, setMember] = useState(null);
  const [memberContributions, setMemberContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const contentRef = useRef(null); // Create a ref for the content to be converted to PDF

  useEffect(() => {
    const fetchMemberData = async () => {
      try {
        // Fetch member details
        const memberDocRef = doc(db, 'miembros', memberId);
        const memberDocSnap = await getDoc(memberDocRef);
        if (memberDocSnap.exists()) {
          setMember({ id: memberDocSnap.id, ...memberDocSnap.data() });
        } else {
          setError('Miembro no encontrado.');
          setLoading(false);
          return;
        }

        // Fetch member contributions
        const q = query(
          collection(db, 'member_contributions'),
          where('memberId', '==', memberId)
        );
        const querySnapshot = await getDocs(q);

        const contributionsData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          let pagado = 0;
          let pendiente = 0;

          // Calculate pagado and pendiente from abonos
          if (data.abonos && Array.isArray(data.abonos)) {
            pagado = data.abonos.reduce((sum, abono) => sum + (Number(abono.montoAbonoPagado) || 0), 0);
            pendiente = data.abonos.reduce((sum, abono) => sum + (Number(abono.montoAbono) || 0), 0) - pagado;
          }

          // Return the member_contribution with calculated pagado and pendiente
          return {
            id: doc.id,
            ...data,
            pagado: pagado,       // Add calculated pagado
            pendiente: pendiente  // Add calculated pendiente
          };
        });

        setMemberContributions(contributionsData);
        console.log("Fetched and Processed Member Contributions:", contributionsData); // DEBUG: Log processed data
        setLoading(false);
      } catch (err) {
        setError('Error al cargar el resumen de aportaciones del miembro.');
        setLoading(false);
        console.error(err);
      }
    };

    fetchMemberData();
  }, [memberId]);

  const handleDownloadPdf = () => {
    const element = contentRef.current; // Get the content element

    if (!element) {
      console.error("Content element not found for PDF generation.");
      return;
    }

    const opt = {
      margin:       0.5, // Adjust margin as needed
      filename:     `Resumen_Aportaciones_${member?.nombre?.replace(/\s/g, '_') || 'Miembro'}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, logging: true, dpi: 192, letterRendering: true },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().from(element).set(opt).save();
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="spinner"></div>
        <span className="ml-4 text-gray-600">Cargando resumen de aportaciones...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-start">
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-4 p-4 bg-yellow-50 text-yellow-700 rounded-lg flex items-start">
          <span>No se encontró información del miembro.</span>
        </div>
      </div>
    );
  }

  // Now, mc.pagado and mc.pendiente will be available from the pre-processed data
  const totalAportado = memberContributions.reduce((sum, mc) => sum + (Number(mc.pagado) || 0), 0);
  const totalPendiente = memberContributions.reduce((sum, mc) => sum + (Number(mc.pendiente) || 0), 0);
  const totalAsignado = totalAportado + totalPendiente;

  console.log("Total Aportado (calculated):", totalAportado);   // DEBUG: Log calculated totals
  console.log("Total Pendiente (calculated):", totalPendiente); // DEBUG: Log calculated totals
  console.log("Total Asignado (calculated):", totalAsignado);   // DEBUG: Log calculated totals


  return (
    <div className="container mx-auto px-4 py-8 animate-fadeInUp">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="main-header-title">Resumen de Aportaciones de {member.nombre}</h1>
        <div className="flex space-x-3"> {/* Use a flex container for multiple buttons */}
            <Link to="/members" className="btn-secondary-outline inline-flex items-center">
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Volver a Miembros
            </Link>
            <button
                onClick={handleDownloadPdf}
                className="btn-primary-gradient inline-flex items-center"
            >
                <DocumentArrowDownIcon className="h-5 w-5 mr-2 icon-interactive" />
                Descargar PDF
            </button>
        </div>
      </div>

      {/* Wrap the content you want to include in the PDF with the ref */}
      <div ref={contentRef}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card-modern p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Asignado</p>
              <p className="text-2xl font-bold text-blue-dark mt-1">Q {totalAsignado.toFixed(2)}</p>
            </div>
            <CurrencyDollarIcon className="h-10 w-10 text-blue-dark opacity-70" />
          </div>
          <div className="card-modern p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Aportado</p>
              <p className="text-2xl font-bold text-green-600 mt-1">Q {totalAportado.toFixed(2)}</p>
            </div>
            <CheckIcon className="h-10 w-10 text-green-600 opacity-70" />
          </div>
          <div className="card-modern p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Pendiente</p>
              <p className="text-2xl font-bold text-red-600 mt-1">Q {totalPendiente.toFixed(2)}</p>
            </div>
            <ClockIcon className="h-10 w-10 text-red-600 opacity-70" />
          </div>
        </div>

        <div className="card-modern rounded-lg shadow overflow-hidden">
          <h2 className="text-xl font-semibold text-gray-800 p-6 border-b border-gray-200">Aportaciones Detalladas</h2>
          {memberContributions.length === 0 ? (
            <p className="p-6 text-center text-gray-500">Este miembro no tiene aportaciones asignadas.</p>
          ) : (
            <div className="divide-y divide-gray-200">
              {memberContributions.map((mc) => {
                // console.log('Processing contribution:', mc); // DEBUG: Log each contribution object (can keep or remove)
                return (
                  <div key={mc.id} className="p-6">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{mc.contributionTitulo || 'Sin título'}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          mc.estadoPagoMiembro === 'pagado' ? 'bg-green-100 text-green-800' :
                          mc.estadoPagoMiembro === 'parcial' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                      }`}>
                        {mc.estadoPagoMiembro}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-gray-700 mb-4">
                      <p><strong>Tipo Distribución:</strong> {mc.contributionTipoDistribucion}</p>
                      <p><strong>Monto Asignado:</strong> Q {(Number(mc.montoTotalMiembro) || 0).toFixed(2)}</p>
                      <p><strong>Pagado:</strong> Q {(Number(mc.pagado) || 0).toFixed(2)}</p>
                      <p><strong>Pendiente:</strong> Q {(Number(mc.pendiente) || 0).toFixed(2)}</p>
                    </div>

                    {mc.abonos && mc.abonos.length > 0 && (
                      <div className="mt-4 border-t border-gray-200 pt-4">
                        <h4 className="text-md font-semibold text-gray-800 mb-3">Detalle de Abonos:</h4>
                        <div className="space-y-3">
                          {mc.abonos.map((abono, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                              <div className="flex items-center">
                                <span className="font-medium text-gray-900 mr-2">Abono {abono.numeroAbono}:</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  abono.estadoAbono === 'pagado' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {abono.estadoAbono}
                                </span>
                              </div>
                              <div className="text-right">
                                <p className="text-sm">Monto: Q {(Number(abono.montoAbono) || 0).toFixed(2)}</p>
                                <p className="text-sm">Pagado: Q {(Number(abono.montoAbonoPagado) || 0).toFixed(2)}</p>
                                {abono.fechaPago && <p className="text-xs text-gray-500">Fecha Pago: {abono.fechaPago?.toDate().toLocaleDateString()}</p>}
                                {abono.metodoPago && <p className="text-xs text-gray-500">Método: {abono.metodoPago}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div> {/* End of contentRef div */}
    </div>
  );
};

export default MemberContributionsSummaryPage;