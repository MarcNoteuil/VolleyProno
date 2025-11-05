import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';

interface RankingEntry {
  user: {
    id: string;
    pseudo: string;
  };
  totalPoints: number;
  predictionsCount: number;
  correctPredictions: number;
  exactPredictions: number;
  position: number;
}

export default function RankingPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (groupId) {
      fetchRanking();
    }
  }, [groupId]);

  const fetchRanking = async () => {
    try {
      const response = await api.get(`/ranking/${groupId}`);
      setRanking(response.data.data);
    } catch (err: any) {
      setError('Erreur lors du chargement du classement');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return '🥇';
      case 1:
        return '🥈';
      case 2:
        return '🥉';
      default:
        return `#${index + 1}`;
    }
  };

  const getRankColor = (index: number) => {
    switch (index) {
      case 0:
        return 'bg-gradient-to-r from-yellow-600 to-yellow-700 border-yellow-500';
      case 1:
        return 'bg-gradient-to-r from-gray-400 to-gray-500 border-gray-400';
      case 2:
        return 'bg-gradient-to-r from-orange-600 to-orange-700 border-orange-500';
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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <p className="text-red-500 mb-4 font-bold-sport text-xl">{error}</p>
          <Link to={`/groups/${groupId}`} className="text-orange-500 hover:text-orange-400 font-bold-sport">
            Retour au groupe
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link to={`/groups/${groupId}`} className="text-orange-500 hover:text-orange-400 mb-4 inline-block font-bold-sport text-sm transition-colors">
            ← Retour au groupe
          </Link>
          <h1 className="font-sport text-5xl text-white mb-2">Classement</h1>
          <p className="text-gray-400 font-bold-sport">Classement des membres du groupe</p>
        </div>

        {ranking.length === 0 ? (
          <div className="text-center py-12 bg-gray-800 rounded-xl border border-gray-700">
            <div className="text-gray-400 text-xl mb-4 font-bold-sport">
              Aucun classement disponible
            </div>
            <p className="text-gray-500">
              Les points seront calculés après les premiers matchs
            </p>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 overflow-hidden">
            <div className="px-6 py-4 bg-gray-900 border-b border-gray-700">
              <h2 className="font-sport text-3xl text-white">Résultats</h2>
            </div>
            
            <div className="divide-y divide-gray-700">
              {ranking.map((entry, index) => (
                <div
                  key={entry.user.id}
                  className={`px-6 py-5 ${getRankColor(index)} transition-all duration-200 hover:scale-[1.02]`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <span className="text-4xl font-bold text-white">
                          {getRankIcon(index)}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-team text-2xl text-white mb-1">
                          {entry.user.pseudo}
                        </h3>
                        <div className="flex space-x-4 text-sm text-gray-200 font-bold-sport">
                          <span>{entry.predictionsCount} pronostic{entry.predictionsCount > 1 ? 's' : ''}</span>
                          <span>{entry.correctPredictions} correct{entry.correctPredictions > 1 ? 's' : ''}</span>
                          <span>{entry.exactPredictions} exact{entry.exactPredictions > 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-sport text-4xl text-white mb-1">
                        {entry.totalPoints} pts
                      </div>
                      <div className="text-sm text-gray-200 font-bold-sport">
                        Moyenne: {entry.predictionsCount > 0 ? (entry.totalPoints / entry.predictionsCount).toFixed(1) : '0'} pts/match
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h3 className="font-sport text-2xl text-white mb-4">Système de points</h3>
          <div className="space-y-3 text-gray-300 font-bold-sport">
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
