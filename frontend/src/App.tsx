import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './stores/authStore';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
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

function App() {
  const { isAuthenticated, initializeAuth } = useAuthStore();

  // Initialiser l'authentification au démarrage
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

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
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;
