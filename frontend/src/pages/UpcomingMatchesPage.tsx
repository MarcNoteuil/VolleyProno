import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuthStore } from '../stores/authStore';

interface SetScore {
  home: number;
  away: number;
}

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  startAt: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELED';
  setsHome?: number;
  setsAway?: number;
  setScores?: SetScore[];
  isLocked: boolean;
  group: {
    id: string;
    name: string;
  };
  predictions: Array<{
    id: string;
    predictedHome: number;
    predictedAway: number;
    pointsAwarded?: number;
    user: {
      id: string;
      pseudo: string;
    };
  }>;
}

export default function UpcomingMatchesPage() {
  const { user } = useAuthStore();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUpcomingMatches();
  }, []);

  const fetchUpcomingMatches = async () => {
    try {
      setLoading(true);
      // Récupérer tous les groupes de l'utilisateur
      const groupsResponse = await api.get('/groups');
      const groups = groupsResponse.data.data;
      
      // Récupérer les matchs de chaque groupe
      const allMatches: Match[] = [];
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      for (const group of groups) {
        try {
          const matchesResponse = await api.get(`/matches?groupId=${group.id}`);
          const groupMatches = matchesResponse.data.data.filter((match: Match) => {
            const matchDate = new Date(match.startAt);
            // Match dans les 7 prochains jours (inclus) et non terminé
            // Vérifier que la date est dans la fenêtre [maintenant, +7 jours]
            return matchDate >= now && 
                   matchDate <= sevenDaysFromNow && 
                   (match.status === 'SCHEDULED' || match.status === 'IN_PROGRESS');
          });
          
          // Ajouter le nom du groupe à chaque match et filtrer les matchs verrouillés
          groupMatches.forEach((match: Match) => {
            // Ne pas inclure les matchs verrouillés
            if (!match.isLocked) {
              allMatches.push({
                ...match,
                group: {
                  id: group.id,
                  name: group.name
                }
              });
            }
          });
        } catch (err) {
          // Ignorer les erreurs pour un groupe spécifique
          console.error(`Erreur lors du chargement des matchs du groupe ${group.id}:`, err);
        }
      }
      
      // Trier par date (plus proche en premier)
      allMatches.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
      
      setMatches(allMatches);
      setLoading(false);
    } catch (err: any) {
      setError('Erreur lors du chargement des matchs à venir');
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Obtenir le fuseau horaire de l'utilisateur
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Vérifier si c'est aujourd'hui (selon le fuseau horaire de l'utilisateur)
    const todayInUserTZ = new Date().toLocaleDateString('fr-FR', { timeZone: userTimeZone });
    const dateInUserTZ = date.toLocaleDateString('fr-FR', { timeZone: userTimeZone });
    
    if (dateInUserTZ === todayInUserTZ) {
      return `Aujourd'hui à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: userTimeZone })}`;
    }
    
    // Vérifier si c'est demain (selon le fuseau horaire de l'utilisateur)
    tomorrow.setDate(tomorrow.getDate());
    const tomorrowInUserTZ = tomorrow.toLocaleDateString('fr-FR', { timeZone: userTimeZone });
    
    if (dateInUserTZ === tomorrowInUserTZ) {
      return `Demain à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: userTimeZone })}`;
    }
    
    // Sinon, afficher la date complète selon le fuseau horaire de l'utilisateur
    return date.toLocaleString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: userTimeZone,
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

  const getDayOfWeek = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { weekday: 'long' });
  };

  const groupMatchesByDay = () => {
    const grouped: Record<string, Match[]> = {};
    
    matches.forEach(match => {
      const date = new Date(match.startAt);
      const dateKey = date.toLocaleDateString('fr-FR', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(match);
    });
    
    return grouped;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 border-t-transparent mx-auto"></div>
          <p className="mt-3 text-gray-300 font-bold-sport text-sm">Chargement des matchs à venir...</p>
        </div>
      </div>
    );
  }

  // Ne pas afficher d'erreur si c'est juste qu'il n'y a pas de matchs
  const hasError = error && error !== '';

  const groupedMatches = groupMatchesByDay();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-4">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="mb-4">
          <h1 className="font-sport text-4xl text-white mb-1">Matchs à Venir</h1>
          <p className="text-gray-400 font-bold-sport text-sm">
            Prochains matchs dans les 7 jours
          </p>
        </div>

        {hasError ? (
          <div className="bg-gray-800 rounded-lg border border-red-500 p-6 text-center">
            <div className="text-3xl mb-2">⚠️</div>
            <p className="text-red-400 font-bold-sport text-sm mb-2">{error}</p>
            <Link
              to="/"
              className="mt-3 inline-block text-orange-400 hover:text-orange-300 font-bold-sport text-xs"
            >
              Retour à l'accueil
            </Link>
          </div>
        ) : matches.length === 0 ? (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 text-center">
            <div className="text-3xl mb-2">📅</div>
            <p className="text-gray-400 font-bold-sport text-sm mb-1.5">
              Aucun match à venir dans les 7 prochains jours
            </p>
            <p className="text-gray-500 text-xs">
              Consultez vos groupes pour voir tous les matchs programmés
            </p>
            <Link
              to="/groups"
              className="mt-3 inline-block bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-1.5 rounded-lg hover:from-orange-600 hover:to-orange-700 font-bold-sport text-sm shadow-md shadow-orange-500/30 transition-all duration-200"
            >
              Voir mes groupes
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedMatches).map(([dateKey, dayMatches]) => (
              <div key={dateKey} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                {/* Header du jour */}
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 border-b border-orange-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-sport text-2xl text-white mb-1">
                        {dateKey}
                      </h2>
                      <p className="text-orange-100 font-bold-sport text-sm">
                        {dayMatches.length} match{dayMatches.length > 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-orange-100 font-bold-sport text-sm">
                        {getDayOfWeek(dayMatches[0].startAt)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Liste des matchs du jour */}
                <div className="divide-y divide-gray-700">
                  {dayMatches.map((match) => {
                    const userPrediction = match.predictions.find(p => p.user.id === user?.id);
                    const hasPrediction = !!userPrediction;
                    
                    return (
                      <div key={match.id} className="p-6 hover:bg-gray-750 transition-colors">
                        <div className="flex items-center justify-between">
                          {/* Info du match */}
                          <div className="flex-1">
                            {/* Nom du groupe - Prominent */}
                            <div className="mb-3">
                              <span className="inline-block bg-orange-500/20 text-orange-400 px-3 py-1 rounded-lg text-sm font-bold-sport border border-orange-500/30">
                                {match.group.name}
                              </span>
                            </div>
                            
                            {/* Équipes */}
                            <div className="flex items-center space-x-4 mb-2">
                              <span className="font-team text-xl text-white">{match.homeTeam}</span>
                              <span className="text-gray-500 font-sport text-lg">VS</span>
                              <span className="font-team text-xl text-white">{match.awayTeam}</span>
                            </div>
                            
                            {/* Date et heure */}
                            <div className="flex items-center space-x-4 text-sm">
                              <p className="text-gray-400 font-bold-sport">{formatDate(match.startAt)}</p>
                              <span className="text-gray-600">•</span>
                              <p className="text-orange-400 font-bold-sport">
                                Dans {getTimeUntilMatch(match.startAt)}
                              </p>
                            </div>
                            
                            {/* Pronostic existant */}
                            {hasPrediction && userPrediction && (
                              <div className="mt-3 inline-flex items-center space-x-2 bg-green-500/20 text-green-400 px-3 py-1 rounded-lg border border-green-500/30">
                                <span className="text-sm font-bold-sport">✓</span>
                                <span className="text-sm font-bold-sport">
                                  Votre pronostic: {userPrediction.predictedHome} - {userPrediction.predictedAway}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="ml-6 flex items-center space-x-3">
                            {hasPrediction ? (
                              <Link
                                to={`/groups/${match.group.id}/matches/${match.id}/predict`}
                                className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-2 rounded-lg hover:from-orange-600 hover:to-orange-700 font-bold-sport shadow-lg shadow-orange-500/30 transition-all duration-200 text-sm"
                              >
                                Modifier
                              </Link>
                            ) : (
                              <Link
                                to={`/groups/${match.group.id}/matches/${match.id}/predict`}
                                className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-2 rounded-lg hover:from-green-700 hover:to-green-800 font-bold-sport shadow-lg shadow-green-500/30 transition-all duration-200 text-sm"
                              >
                                Pronostiquer
                              </Link>
                            )}
                            <Link
                              to={`/groups/${match.group.id}`}
                              className="text-gray-400 hover:text-orange-400 text-sm font-bold-sport transition-colors"
                            >
                              Voir groupe
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lien vers tous les matchs */}
        <div className="mt-8 text-center">
          <Link
            to="/groups"
            className="inline-block text-orange-400 hover:text-orange-300 font-bold-sport text-sm transition-colors"
          >
            Voir tous les matchs de mes groupes →
          </Link>
        </div>
      </div>
    </div>
  );
}

