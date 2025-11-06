import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

interface Prediction {
  id: string;
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  predictedHome: number;
  predictedAway: number;
  actualHome: number | null;
  actualAway: number | null;
  pointsAwarded: number;
  isRisky: boolean;
  matchDate: string;
  groupName: string;
  groupId: string;
}

interface PointsNotificationData {
  totalPoints: number;
  predictions: Prediction[];
}

interface PointsNotificationModalProps {
  onClose: () => void;
}

export default function PointsNotificationModal({ onClose }: PointsNotificationModalProps) {
  const [data, setData] = useState<PointsNotificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/predictions/since-last-login');
        if (response.data.code === 'SUCCESS') {
          setData(response.data.data);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des points:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border-2 border-orange-500 shadow-2xl max-w-md w-full p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-300 font-bold-sport">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  // Si pas de données ou aucun pronostic, on ferme la modal
  if (!data || data.predictions.length === 0) {
    return null;
  }

  const positivePoints = data.predictions.filter(p => p.pointsAwarded > 0).reduce((sum, p) => sum + p.pointsAwarded, 0);
  const negativePoints = data.predictions.filter(p => p.pointsAwarded < 0).reduce((sum, p) => sum + Math.abs(p.pointsAwarded), 0);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border-2 border-orange-500 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold-sport text-orange-400">
              🎉 Résultats de vos pronostics
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-300 transition-colors"
              title="Fermer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-6">
            <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
              <div className="text-center">
                <p className="text-gray-300 font-bold-sport text-sm mb-2">Points depuis votre dernière connexion</p>
                <div className="flex items-center justify-center space-x-4">
                  {data.totalPoints > 0 && (
                    <div className="text-green-400 font-bold-sport text-4xl">
                      +{data.totalPoints} pts
                    </div>
                  )}
                  {data.totalPoints < 0 && (
                    <div className="text-red-400 font-bold-sport text-4xl">
                      {data.totalPoints} pts
                    </div>
                  )}
                  {data.totalPoints === 0 && (
                    <div className="text-gray-400 font-bold-sport text-4xl">
                      0 pts
                    </div>
                  )}
                </div>
                {positivePoints > 0 && negativePoints > 0 && (
                  <div className="mt-2 text-xs text-gray-400">
                    <span className="text-green-400">+{positivePoints} pts</span>
                    {' / '}
                    <span className="text-red-400">-{negativePoints} pts</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {!showDetails ? (
            <div className="text-center">
              <button
                onClick={() => setShowDetails(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold-sport px-6 py-3 rounded-lg transition-colors"
              >
                Afficher les pronostics concernés ({data.predictions.length})
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-xl font-bold-sport text-white mb-4">
                Détail des pronostics ({data.predictions.length})
              </h3>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {data.predictions.map((prediction) => (
                  <div
                    key={prediction.id}
                    className={`bg-gray-700 rounded-lg p-4 border ${
                      prediction.pointsAwarded > 0
                        ? 'border-green-500'
                        : prediction.pointsAwarded < 0
                        ? 'border-red-500'
                        : 'border-gray-600'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="text-white font-team text-sm mb-1">
                          {prediction.homeTeam} <span className="text-orange-400">VS</span> {prediction.awayTeam}
                        </p>
                        <p className="text-gray-400 text-xs font-bold-sport">
                          {prediction.groupName} • {formatDate(prediction.matchDate)}
                        </p>
                      </div>
                      <div className={`text-right ml-4 ${
                        prediction.pointsAwarded > 0
                          ? 'text-green-400'
                          : prediction.pointsAwarded < 0
                          ? 'text-red-400'
                          : 'text-gray-400'
                      }`}>
                        <div className="font-bold-sport text-lg">
                          {prediction.pointsAwarded > 0 ? '+' : ''}{prediction.pointsAwarded} pts
                        </div>
                        {prediction.isRisky && (
                          <div className="text-xs text-orange-400 mt-1">🔥 Risky</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-gray-600">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-400 font-bold-sport text-xs mb-1">Votre pronostic</p>
                          <p className="text-white font-bold-sport">
                            {prediction.predictedHome} - {prediction.predictedAway}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 font-bold-sport text-xs mb-1">Résultat réel</p>
                          <p className="text-white font-bold-sport">
                            {prediction.actualHome !== null && prediction.actualAway !== null
                              ? `${prediction.actualHome} - ${prediction.actualAway}`
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-700 text-white font-bold-sport px-6 py-2 rounded-lg transition-colors"
            >
              Fermer
            </button>
            {showDetails && (
              <button
                onClick={() => navigate('/mes-pronos')}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold-sport px-6 py-2 rounded-lg transition-colors"
              >
                Voir tous mes pronostics
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

