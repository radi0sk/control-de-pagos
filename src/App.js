// src/App.js
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import MembersPage from './pages/MembersPage.jsx';
import MemberDebtsPage from './pages/MemberDebtsPage.jsx';
import ExpensesPage from './pages/ExpensesPage.jsx';
import ContributionsPage from './pages/ContributionsPage.jsx';
import ContributionDetail from './pages/ContributionDetail.jsx';
import NewContributionPage from './pages/NewContributionPage.jsx';
import RegisterPaymentPage from './pages/RegisterPaymentPage.jsx';
import RegisterMemberPaymentPage from './pages/RegisterMemberPaymentPage.jsx';
import RegisterExpensePaymentPage from './pages/RegisterExpensePaymentPage.jsx';
import MemberContributionsSummaryPage from './pages/MemberContributionsSummaryPage.jsx'; // Import the new page
import PrivateRoute from './components/Shared/PrivateRoute.jsx';
import Navbar from './components/Shared/Navbar.jsx';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route element={<LayoutWithNavbar />}>
            <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
            <Route path="/members" element={<PrivateRoute><MembersPage /></PrivateRoute>} />
            {/* NEW ROUTE FOR MEMBER CONTRIBUTIONS SUMMARY */}
            <Route path="/members/:memberId/contributions-summary" element={<PrivateRoute><MemberContributionsSummaryPage /></PrivateRoute>} />
            <Route path="/payments" element={<PrivateRoute><MemberDebtsPage /></PrivateRoute>} />
            <Route path="/expenses" element={<PrivateRoute><ExpensesPage /></PrivateRoute>} />
            <Route path="/contributions" element={<PrivateRoute><ContributionsPage /></PrivateRoute>} />
            <Route path="/contributions/:id" element={<PrivateRoute><ContributionDetail /></PrivateRoute>} />
            <Route path="/contributions/new" element={<PrivateRoute><NewContributionPage /></PrivateRoute>} />
            <Route 
              path="/contributions/:contributionId/members/:memberContributionId/register-payment" 
              element={<PrivateRoute><RegisterPaymentPage /></PrivateRoute>} 
            />
            <Route 
              path="/payments/register-general/:memberId" 
              element={<PrivateRoute><RegisterMemberPaymentPage /></PrivateRoute>} 
            />
            <Route 
              path="/expenses/:expenseId/register-payment" 
              element={<PrivateRoute><RegisterExpensePaymentPage /></PrivateRoute>} 
            />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

const LayoutWithNavbar = () => {
  return (
    <>
      <Navbar />
      <div className="pt-16"> 
        <Outlet />
      </div>
    </>
  );
};

export default App;