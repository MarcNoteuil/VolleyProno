import { useState, useEffect } from 'react';
import { api } from '../services/api';

interface GlobalRankingEntry {
  user: {
    id: string;
    pseudo: string;
    firstName?: string | null;
    avatar?: string | null;
  };
  totalPoints: number;
  position: number;
}

export default function GlobalRankingPage() {
  const [ranking, setRanking] = useState<GlobalRankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchGlobalRanking();
  }, []);

  const fetchGlobalRanking = async () => {
    try {
      setLoading(true);
      const response = await api.get('/ranking/global?limit=10');
      setRanking(response.data.data);
      setLoading(false);
    } catch (err: any) {
      setError('Erreur lors du chargement du classement global');
      setLoading(false);
    }
  };

  const getMedalIcon = (position: number) => {
    switch (position) {
      case 1:
        return '👑'; // Or
      case 2:
        return '🥈'; // Argent
      case 3:
        return '🥉'; // Bronze
      default:
        return null;
    }
  };

  const getPositionLabel = (position: number) => {
    if (position === 1) return '1er';
    if (position === 2) return '2e';
    if (position === 3) return '3e';
    return `${position}e`;
  };

  const getMedalColor = (position: number) => {
    switch (position) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500 to-yellow-600 border-yellow-400 shadow-yellow-500/50';
      case 2:
        return 'bg-gradient-to-r from-gray-300 to-gray-400 border-gray-300 shadow-gray-400/50';
      case 3:
        return 'bg-gradient-to-r from-orange-600 to-orange-700 border-orange-500 shadow-orange-500/50';
      default:
        return 'bg-gray-800 border-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-orange-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-300 font-bold-sport text-xl">Chargement du classement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-18 sm:pt-22 pb-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="font-sport text-5xl text-white mb-2">Classement Global</h1>
          <p className="text-gray-400 font-bold-sport">Top 10 des meilleurs pronostiqueurs de la communauté</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded-lg font-bold-sport">
            {error}
          </div>
        )}

        {ranking.length === 0 ? (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
            <p className="text-gray-400 font-bold-sport text-xl">
              Aucun classement disponible
            </p>
            <p className="text-gray-500 mt-2">
              Les points seront calculés après les premiers matchs terminés
            </p>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 overflow-hidden">
            <div className="px-6 py-4 bg-gray-900 border-b border-gray-700">
              <h2 className="font-sport text-3xl text-white">🏆 Top 10</h2>
            </div>
            
            <div className="divide-y divide-gray-700">
              {ranking.map((entry) => {
                const medalIcon = getMedalIcon(entry.position);
                const medalColor = getMedalColor(entry.position);
                
                return (
                  <div
                    key={entry.user.id}
                    className={`px-6 py-6 ${medalColor} transition-all duration-200 hover:scale-[1.02] ${
                      entry.position <= 3 ? 'shadow-lg' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0 flex items-center justify-center w-16 h-16">
                          {medalIcon ? (
                            <span className="text-5xl">{medalIcon}</span>
                          ) : (
                            <span className="text-3xl font-bold text-white font-sport">
                              #{entry.position}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-3">
                          {entry.user.avatar ? (
                            <img
                              src={entry.user.avatar}
                              alt={entry.user.pseudo || entry.user.firstName || 'Avatar'}
                              className="w-12 h-12 rounded-full border-2 border-gray-600 object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center text-white text-lg font-bold-sport">
                              {(entry.user.pseudo || entry.user.firstName || 'U')[0].toUpperCase()}
                            </div>
                          )}
                          <div>
                            <h3 className="font-team text-2xl text-white mb-1">
                              {entry.user.pseudo || entry.user.firstName}
                            </h3>
                            <div className="text-sm text-gray-200 font-bold-sport">
                              {getPositionLabel(entry.position)}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-sport text-4xl text-white mb-1">
                          {entry.totalPoints} pts
                        </div>
                        <div className="text-sm text-gray-200 font-bold-sport">
                          Points totaux
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-8 bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h3 className="font-sport text-2xl text-white mb-4">📊 Comment ça marche ?</h3>
          <div className="space-y-3 text-gray-300 font-bold-sport">
            <p className="text-gray-400 mb-4">
              Le classement global cumule tous les points obtenus sur les matchs terminés, 
              même si les groupes ont été supprimés. Chaque utilisateur démarre à 0 points dans chaque groupe, 
              mais ses points globaux continuent de s'accumuler à travers tous les groupes.
            </p>
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🏆</span>
              <p><span className="text-orange-400 font-bold">Bon vainqueur:</span> 1 point</p>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🎯</span>
              <p><span className="text-orange-400 font-bold">Score exact (sets):</span> 3 points</p>
            </div>
            <div className="flex items-center space-x-3 mt-4 pt-4 border-t border-gray-700">
              <span className="text-2xl">⭐</span>
              <p><span className="text-orange-400 font-bold">Bonus scores détaillés exacts:</span> +2 points</p>
              <p className="text-xs text-gray-500 ml-2">(seulement si score exact)</p>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-sm text-gray-400">
                <span className="text-orange-400 font-bold">Total maximum:</span> 5 points (3 pts score exact + 2 pts bonus détaillé)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

