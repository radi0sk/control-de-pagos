import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import MembersPage from './pages/MembersPage.jsx';
import PaymentsPage from './pages/PaymentsPage.jsx';
import ExpensesPage from './pages/ExpensesPage.jsx';
import ContributionsPage from './pages/ContributionsPage.jsx';
import ContributionDetail from './pages/ContributionDetail.jsx';
import NewContributionPage from './pages/NewContributionPage.jsx';
import RegisterPaymentPage from './pages/RegisterPaymentPage.jsx';
import PrivateRoute from './components/Shared/PrivateRoute.jsx';
import Navbar from './components/Shared/Navbar.jsx'; // Importa el Navbar
import RegisterExpensePaymentPage from './pages/RegisterExpensePaymentPage.jsx'; // Import the new page

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* La página de login no tiene Navbar */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* Envuelve todas las rutas protegidas con un layout que incluye el Navbar */}
          {/* El Navbar y el espacio para el contenido de la página se renderizan aquí */}
          <Route element={<LayoutWithNavbar />}>
            <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
            <Route path="/members" element={<PrivateRoute><MembersPage /></PrivateRoute>} />
            <Route path="/payments" element={<PrivateRoute><PaymentsPage /></PrivateRoute>} />
            <Route path="/expenses" element={<PrivateRoute><ExpensesPage /></PrivateRoute>} />
            <Route path="/contributions" element={<PrivateRoute><ContributionsPage /></PrivateRoute>} />
            <Route path="/contributions/:id" element={<PrivateRoute><ContributionDetail /></PrivateRoute>} />
            <Route path="/contributions/new" element={<PrivateRoute><NewContributionPage /></PrivateRoute>} />
            <Route 
              path="/contributions/:contributionId/members/:memberContributionId/register-payment" 
              element={<PrivateRoute><RegisterPaymentPage /></PrivateRoute>} 
            />
          </Route>
          <Route 
            path="/expenses/:expenseId/register-payment" 
            element={<PrivateRoute><RegisterExpensePaymentPage /></PrivateRoute>} 
          />
        
        </Routes>
      </AuthProvider>
    </Router>
  );
}

// Componente de Layout que incluye el Navbar
// Este componente se renderizará para todas las rutas anidadas dentro de él.
const LayoutWithNavbar = () => {
  return (
    <>
      <Navbar /> {/* El Navbar se muestra en la parte superior */}
      {/* Añade padding superior para que el contenido de la página no quede debajo del navbar fijo */}
      <div className="pt-16"> 
        <Outlet /> {/* Aquí se renderizará el componente de la ruta actual (Dashboard, Miembros, etc.) */}
      </div>
    </>
  );
};

export default App;
