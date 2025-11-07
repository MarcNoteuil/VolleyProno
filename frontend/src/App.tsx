import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from './stores/authStore';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import WelcomePage from './pages/WelcomePage';
import GroupsPage from './pages/GroupsPage';
import GroupDetailPage from './pages/GroupDetailPage';
import GroupMatchesPage from './pages/GroupMatchesPage';
import PredictPage from './pages/PredictPage';
import RankingPage from './pages/RankingPage';
import AdminPage from './pages/AdminPage';
import MesPronosPage from './pages/MesPronosPage';
import DashboardPage from './pages/DashboardPage';
import UpcomingMatchesPage from './pages/UpcomingMatchesPage';
import GlobalRankingPage from './pages/GlobalRankingPage';
import ProfilePage from './pages/ProfilePage';

function App() {
  const { isAuthenticated, initializeAuth, isLoading } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialiser l'authentification au démarrage
  useEffect(() => {
    const init = async () => {
      await initializeAuth();
      setIsInitialized(true);
    };
    init();
  }, [initializeAuth]);

  // Attendre que l'initialisation soit terminée avant de rendre les routes
  // pour éviter les redirections incorrectes lors de la réhydratation
  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 border-t-transparent mx-auto"></div>
          <p className="mt-3 text-gray-300 font-bold-sport text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <Routes>
          {/* Route d'accueil - WelcomePage si non connecté, Dashboard si connecté */}
          <Route 
            path="/" 
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <WelcomePage />} 
          />
          
          {/* Routes publiques */}
          <Route 
            path="/login" 
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} 
          />
          <Route 
            path="/register" 
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />} 
          />
          <Route 
            path="/forgot-password" 
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <ForgotPasswordPage />} 
          />
          <Route 
            path="/reset-password" 
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <ResetPasswordPage />} 
          />
          
          {/* Routes protégées avec Layout (Header inclus) */}
          <Route 
            element={isAuthenticated ? <Layout /> : <Navigate to="/" replace />}
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/groups" element={<GroupsPage />} />
            <Route path="/groups/:groupId" element={<GroupDetailPage />} />
            <Route path="/groups/:groupId/matches" element={<GroupMatchesPage />} />
            <Route path="/groups/:groupId/matches/:matchId/predict" element={<PredictPage />} />
            <Route path="/groups/:groupId/ranking" element={<RankingPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/mes-pronos" element={<MesPronosPage />} />
            <Route path="/matchs-a-venir" element={<UpcomingMatchesPage />} />
            <Route path="/classement-global" element={<GlobalRankingPage />} />
            <Route path="/profil" element={<ProfilePage />} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;
