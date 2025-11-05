import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuthStore } from '../stores/authStore';

interface Stats {
  totalPredictions: number;
  totalPoints: number;
  exactPredictions: number;
  correctPredictions: number;
  averagePoints: number;
  successRate: number;
}

interface UpcomingMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  startAt: string;
  group: {
    id: string;
    name: string;
  };
  isLocked: boolean;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [upcomingMatches, setUpcomingMatches] = useState<UpcomingMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Récupérer les pronostics pour calculer les stats
      const predictionsResponse = await api.get('/predictions/user');
      const predictions = predictionsResponse.data.data;

      // Calculer les statistiques
      const finishedPredictions = predictions.filter((p: any) => p.match.status === 'FINISHED');
      const totalPoints = finishedPredictions.reduce((sum: number, p: any) => sum + (p.pointsAwarded || 0), 0);
      const exactPredictions = finishedPredictions.filter((p: any) => p.pointsAwarded === 5 || p.pointsAwarded === 7).length;
      const correctPredictions = finishedPredictions.filter((p: any) => (p.pointsAwarded || 0) > 0).length;
      const averagePoints = finishedPredictions.length > 0 ? totalPoints / finishedPredictions.length : 0;
      const successRate = finishedPredictions.length > 0 ? (correctPredictions / finishedPredictions.length) * 100 : 0;

      setStats({
        totalPredictions: predictions.length,
        totalPoints,
        exactPredictions,
        correctPredictions,
        averagePoints: Math.round(averagePoints * 10) / 10,
        successRate: Math.round(successRate * 10) / 10
      });

      // Récupérer les matchs à venir (exemple : prochains 5 matchs)
      const groupsResponse = await api.get('/groups');
      const groups = groupsResponse.data.data;
      
      const allUpcomingMatches: UpcomingMatch[] = [];
      for (const group of groups) {
        try {
          const matchesResponse = await api.get(`/matches?groupId=${group.id}`);
          const matches = matchesResponse.data.data.filter((m: any) => 
            m.status === 'SCHEDULED' && new Date(m.startAt) > new Date()
          );
          matches.forEach((match: any) => {
            allUpcomingMatches.push({
              ...match,
              group: { id: group.id, name: group.name }
            });
          });
        } catch (err) {
          // Ignorer les erreurs
        }
      }

      // Trier par date et prendre les 5 prochains
      allUpcomingMatches.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
      setUpcomingMatches(allUpcomingMatches.slice(0, 5));

      setLoading(false);
    } catch (err) {
      console.error('Erreur lors du chargement du dashboard:', err);
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    // Utiliser toLocaleString pour afficher date + heure selon le fuseau horaire de l'utilisateur
    return new Date(dateString).toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Utiliser le fuseau horaire de l'utilisateur
    });
  };

  const getTimeUntilMatch = (dateString: string) => {
    const now = new Date();
    const matchDate = new Date(dateString);
    const diff = matchDate.getTime() - now.getTime();
    
    if (diff < 0) return 'Déjà commencé';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}j ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (loading) {
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-4">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="mb-4">
          <h1 className="font-sport text-4xl text-white mb-1">
            Bienvenue, {user?.pseudo} !
          </h1>
          <p className="text-gray-400 font-bold-sport text-sm">Votre tableau de bord</p>
        </div>

        {/* Statistiques */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 hover:border-orange-500 transition-all duration-200">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-gray-400 font-bold-sport text-xs">Total Points</span>
                <span className="text-lg">🏆</span>
              </div>
              <p className="font-sport text-2xl text-orange-500">{stats.totalPoints}</p>
              <p className="text-gray-500 text-xs mt-1.5 font-bold-sport">pts accumulés</p>
            </div>

            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 hover:border-orange-500 transition-all duration-200">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-gray-400 font-bold-sport text-xs">Pronostics</span>
                <span className="text-lg">📊</span>
              </div>
              <p className="font-sport text-2xl text-orange-500">{stats.totalPredictions}</p>
              <p className="text-gray-500 text-xs mt-1.5 font-bold-sport">pronostics effectués</p>
            </div>

            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 hover:border-orange-500 transition-all duration-200">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-gray-400 font-bold-sport text-xs">Taux de réussite</span>
                <span className="text-lg">🎯</span>
              </div>
              <p className="font-sport text-2xl text-green-400">{stats.successRate}%</p>
              <p className="text-gray-500 text-xs mt-1.5 font-bold-sport">de pronostics corrects</p>
            </div>

            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 hover:border-orange-500 transition-all duration-200">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-gray-400 font-bold-sport text-xs">Scores exacts</span>
                <span className="text-lg">⭐</span>
              </div>
              <p className="font-sport text-2xl text-yellow-400">{stats.exactPredictions}</p>
              <p className="text-gray-500 text-xs mt-1.5 font-bold-sport">pronostics parfaits</p>
            </div>

            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 hover:border-orange-500 transition-all duration-200">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-gray-400 font-bold-sport text-xs">Moyenne</span>
                <span className="text-lg">📈</span>
              </div>
              <p className="font-sport text-2xl text-blue-400">{stats.averagePoints}</p>
              <p className="text-gray-500 text-xs mt-1.5 font-bold-sport">pts par match</p>
            </div>

            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 hover:border-orange-500 transition-all duration-200">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-gray-400 font-bold-sport text-xs">Corrects</span>
                <span className="text-lg">✅</span>
              </div>
              <p className="font-sport text-2xl text-green-400">{stats.correctPredictions}</p>
              <p className="text-gray-500 text-xs mt-1.5 font-bold-sport">pronostics corrects</p>
            </div>
          </div>
        )}

        {/* Matchs à venir */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-sport text-xl text-white">Matchs à venir</h2>
            <Link
              to="/matchs-a-venir"
              className="text-orange-400 hover:text-orange-300 font-bold-sport text-xs transition-colors"
            >
              Voir tous →
            </Link>
          </div>
          {upcomingMatches.length === 0 ? (
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 text-center">
              <div className="text-2xl mb-2">📅</div>
              <p className="text-gray-400 font-bold-sport text-sm mb-1.5">Aucun match à venir dans les 7 prochains jours</p>
              <p className="text-gray-500 text-xs">Consultez vos groupes pour voir tous les matchs programmés</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingMatches.map((match) => (
                <Link
                  key={match.id}
                  to={`/groups/${match.group.id}/matches/${match.id}/predict`}
                  className="block bg-gray-800 rounded-lg border border-gray-700 p-3 hover:border-orange-500 transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1.5">
                        <span className="font-team text-sm text-white">{match.homeTeam}</span>
                        <span className="text-gray-500 text-xs">VS</span>
                        <span className="font-team text-sm text-white">{match.awayTeam}</span>
                      </div>
                      <p className="text-gray-400 text-xs font-bold-sport">{match.group.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400 text-xs font-bold-sport mb-1">{formatDate(match.startAt)}</p>
                      <p className="text-orange-400 font-bold-sport text-xs">
                        {getTimeUntilMatch(match.startAt)}
                      </p>
                      {match.isLocked && (
                        <span className="mt-1 inline-block px-1.5 py-0.5 bg-red-600 text-white text-xs rounded font-bold-sport">
                          Verrouillé
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Actions rapides */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Link
            to="/mes-pronos"
            className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-4 hover:from-orange-600 hover:to-orange-700 transition-all duration-200 shadow-md shadow-orange-500/30"
          >
            <div className="text-2xl mb-2">📋</div>
            <h3 className="font-sport text-base text-white mb-1.5">Mes Pronostics</h3>
            <p className="text-gray-100 text-xs font-bold-sport">Voir tous vos pronostics</p>
          </Link>

          <Link
            to="/groups"
            className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-4 hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md shadow-blue-500/30"
          >
            <div className="text-2xl mb-2">👥</div>
            <h3 className="font-sport text-base text-white mb-1.5">Mes Groupes</h3>
            <p className="text-gray-100 text-xs font-bold-sport">Gérer vos groupes</p>
          </Link>

          <Link
            to="/matchs-a-venir"
            className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg p-4 hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-md shadow-green-500/30"
          >
            <div className="text-2xl mb-2">📅</div>
            <h3 className="font-sport text-base text-white mb-1.5">Matchs à Venir</h3>
            <p className="text-gray-100 text-xs font-bold-sport">Prochains 7 jours</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

