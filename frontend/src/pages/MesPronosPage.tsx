import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

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
}

interface Prediction {
  id: string;
  predictedHome: number;
  predictedAway: number;
  predictedSetScores?: SetScore[];
  pointsAwarded?: number;
  match: Match;
}

type FilterType = 'all' | 'finished' | 'ongoing' | 'scheduled';

export default function MesPronosPage() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedPredictions, setSelectedPredictions] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchPredictions();
  }, []);

  const fetchPredictions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/predictions/user');
      setPredictions(response.data.data);
      setLoading(false);
    } catch (err: any) {
      setError('Erreur lors du chargement de vos pronostics');
      setLoading(false);
    }
  };

  const handleSelectPrediction = (predictionId: string) => {
    const newSelected = new Set(selectedPredictions);
    if (newSelected.has(predictionId)) {
      newSelected.delete(predictionId);
    } else {
      newSelected.add(predictionId);
    }
    setSelectedPredictions(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedPredictions.size === filteredPredictions.length) {
      setSelectedPredictions(new Set());
    } else {
      setSelectedPredictions(new Set(filteredPredictions.map(p => p.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedPredictions.size === 0) return;
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      setDeleting(true);
      const predictionIds = Array.from(selectedPredictions);
      await api.delete('/predictions/batch', { data: { predictionIds } });
      
      // Recharger les pronostics
      await fetchPredictions();
      
      // Réinitialiser la sélection
      setSelectedPredictions(new Set());
      setShowDeleteModal(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la suppression');
      setDeleting(false);
    }
  };

  const getSelectedUnfinishedCount = () => {
    return Array.from(selectedPredictions).filter(id => {
      const prediction = predictions.find(p => p.id === id);
      return prediction && (prediction.match.status === 'SCHEDULED' || prediction.match.status === 'IN_PROGRESS');
    }).length;
  };

  const formatDate = (dateString: string) => {
    // Utiliser toLocaleString pour afficher date + heure selon le fuseau horaire de l'utilisateur
    return new Date(dateString).toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Utiliser le fuseau horaire de l'utilisateur
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-blue-500 text-white';
      case 'IN_PROGRESS':
        return 'bg-yellow-500 text-white';
      case 'FINISHED':
        return 'bg-green-500 text-white';
      case 'CANCELED':
        return 'bg-red-600 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'Programmé';
      case 'IN_PROGRESS':
        return 'En cours';
      case 'FINISHED':
        return 'Terminé';
      case 'CANCELED':
        return 'Annulé';
      default:
        return status;
    }
  };

  const filteredPredictions = predictions.filter((pred) => {
    if (filter === 'finished') {
      return pred.match.status === 'FINISHED';
    }
    if (filter === 'ongoing') {
      return pred.match.status === 'IN_PROGRESS';
    }
    if (filter === 'scheduled') {
      return pred.match.status === 'SCHEDULED';
    }
    return true;
  });

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
          <h1 className="font-sport text-4xl text-white mb-1">Mes Pronostics</h1>
          <p className="text-gray-400 font-bold-sport text-sm">Tous vos pronostics en un coup d'œil</p>
        </div>

        {/* Filtres */}
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-bold-sport text-sm transition-all duration-200 ${
              filter === 'all'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/40'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
            }`}
          >
            Tous
          </button>
          <button
            onClick={() => setFilter('scheduled')}
            className={`px-3 py-1.5 rounded-lg font-bold-sport text-sm transition-all duration-200 ${
              filter === 'scheduled'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/40'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
            }`}
          >
            Programmé
          </button>
          <button
            onClick={() => setFilter('ongoing')}
            className={`px-3 py-1.5 rounded-lg font-bold-sport text-sm transition-all duration-200 ${
              filter === 'ongoing'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/40'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
            }`}
          >
            En cours
          </button>
          <button
            onClick={() => setFilter('finished')}
            className={`px-3 py-1.5 rounded-lg font-bold-sport text-sm transition-all duration-200 ${
              filter === 'finished'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/40'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
            }`}
          >
            Terminés
          </button>
        </div>

        {error && (
          <div className="mb-3 bg-red-900/50 border border-red-500 text-red-300 px-3 py-2 rounded-lg font-bold-sport text-sm">
            {error}
          </div>
        )}

        {/* Actions de sélection */}
        {filteredPredictions.length > 0 && (
          <div className="mb-3 flex items-center justify-between bg-gray-800 rounded-lg border border-gray-700 p-3">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSelectAll}
                className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-xs font-bold-sport hover:bg-gray-600 transition-colors"
              >
                {selectedPredictions.size === filteredPredictions.length ? 'Tout désélectionner' : 'Tout sélectionner'}
              </button>
              {selectedPredictions.size > 0 && (
                <span className="text-gray-300 font-bold-sport text-xs">
                  {selectedPredictions.size} pronostic{selectedPredictions.size > 1 ? 's' : ''} sélectionné{selectedPredictions.size > 1 ? 's' : ''}
                </span>
              )}
            </div>
            {selectedPredictions.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold-sport hover:bg-red-700 transition-colors shadow-md shadow-red-500/30"
              >
                Supprimer ({selectedPredictions.size})
              </button>
            )}
          </div>
        )}

        {filteredPredictions.length === 0 ? (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 text-center">
            <p className="text-gray-400 font-bold-sport text-sm">
              {filter === 'all'
                ? 'Aucun pronostic trouvé'
                : filter === 'scheduled'
                ? 'Aucun pronostic programmé'
                : filter === 'ongoing'
                ? 'Aucun match en cours'
                : 'Aucun pronostic terminé'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPredictions.map((prediction) => (
              <div key={prediction.id} className={`bg-gray-800 rounded-lg shadow-md border p-4 transition-all duration-200 ${
                selectedPredictions.has(prediction.id) 
                  ? 'border-orange-500 bg-gray-750' 
                  : 'border-gray-700 hover:border-orange-500'
              }`}>
                {/* Checkbox de sélection */}
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedPredictions.has(prediction.id)}
                    onChange={() => handleSelectPrediction(prediction.id)}
                    className="mt-0.5 w-4 h-4 text-orange-500 bg-gray-700 border-gray-600 rounded focus:ring-orange-500 focus:ring-2"
                  />
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-3 pb-3 border-b border-gray-700">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1.5">
                          <h3 className="font-team text-base text-white">
                            <span className="text-orange-400">{prediction.match.homeTeam}</span>
                            <span className="mx-2 text-gray-500 text-xs">VS</span>
                            <span className="text-orange-400">{prediction.match.awayTeam}</span>
                          </h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold-sport ${getStatusColor(prediction.match.status)}`}>
                            {getStatusText(prediction.match.status)}
                          </span>
                          {prediction.match.isLocked && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold-sport bg-red-600 text-white">
                              Verrouillé
                            </span>
                          )}
                        </div>
                        <p className="text-gray-400 text-xs mb-1">{formatDate(prediction.match.startAt)}</p>
                        <p className="text-gray-500 text-xs">
                          Groupe: <span className="font-bold-sport text-orange-400">{prediction.match.group.name}</span>
                        </p>
                      </div>
                    </div>

                {/* Pronostic */}
                <div className="mb-3 p-3 bg-gray-700 rounded-lg border border-gray-600">
                  <p className="text-orange-400 font-bold-sport mb-1.5 text-xs">Votre pronostic:</p>
                  <div className="flex items-center space-x-2">
                    <span className="font-team text-sm text-white">{prediction.match.homeTeam}</span>
                    <span className="font-sport text-xl text-orange-500">
                      {prediction.predictedHome} - {prediction.predictedAway}
                    </span>
                    <span className="font-team text-sm text-white">{prediction.match.awayTeam}</span>
                  </div>
                  {prediction.predictedSetScores && prediction.predictedSetScores.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-600">
                      <p className="text-xs text-gray-400 font-bold-sport mb-1.5">Scores détaillés:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {prediction.predictedSetScores.map((setScore, index) => (
                          <div key={index} className="bg-white rounded-lg p-1.5 min-w-[50px] text-center">
                            <div className="text-xs text-gray-500 mb-0.5 font-bold-sport">SET {index + 1}</div>
                            <div className="text-xs font-bold-sport text-black">
                              {setScore.home} - {setScore.away}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Résultat si terminé */}
                {prediction.match.status === 'FINISHED' && prediction.match.setsHome !== undefined && prediction.match.setsAway !== undefined && (
                  <div className="mb-3 p-3 bg-gray-700 rounded-lg border border-gray-600">
                    <p className="text-green-400 font-bold-sport mb-1.5 text-xs">Résultat:</p>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-team text-sm text-white">{prediction.match.homeTeam}</span>
                      <span className="font-sport text-xl text-green-400">
                        {prediction.match.setsHome} - {prediction.match.setsAway}
                      </span>
                      <span className="font-team text-sm text-white">{prediction.match.awayTeam}</span>
                    </div>
                    {prediction.match.setScores && prediction.match.setScores.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-600">
                        <p className="text-xs text-gray-400 font-bold-sport mb-1.5">Scores détaillés:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {prediction.match.setScores.map((setScore, index) => {
                            const homeWon = setScore.home > setScore.away;
                            return (
                              <div key={index} className="bg-white rounded-lg p-1.5 min-w-[50px] text-center">
                                <div className="text-xs text-gray-500 mb-0.5 font-bold-sport">SET {index + 1}</div>
                                <div className="text-xs font-bold-sport">
                                  <span className={homeWon ? 'text-orange-500' : 'text-black'}>{setScore.home}</span>
                                  <span className="text-gray-400 mx-0.5">-</span>
                                  <span className={!homeWon ? 'text-orange-500' : 'text-black'}>{setScore.away}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {prediction.pointsAwarded !== undefined && (
                      <div className="mt-2 pt-2 border-t border-gray-600">
                        <p className="text-green-400 font-bold-sport text-sm">
                          Points obtenus: <span className="text-base">{prediction.pointsAwarded} pts</span>
                        </p>
                      </div>
                    )}
                  </div>
                )}

                    {/* Actions */}
                    <div className="flex justify-end space-x-2 pt-3 border-t border-gray-700">
                      <Link
                        to={`/groups/${prediction.match.group.id}`}
                        className="text-orange-400 hover:text-orange-300 text-xs font-bold-sport transition-colors"
                      >
                        Voir le groupe
                      </Link>
                      {!prediction.match.isLocked && prediction.match.status === 'SCHEDULED' && (
                        <Link
                          to={`/groups/${prediction.match.group.id}/matches/${prediction.match.id}/predict`}
                          className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-1.5 rounded-lg hover:from-orange-600 hover:to-orange-700 text-xs font-bold-sport shadow-md shadow-orange-500/30 transition-all duration-200"
                        >
                          Modifier
                        </Link>
                      )}
                      {prediction.match.status === 'IN_PROGRESS' && (
                        <span className="text-yellow-400 text-xs font-bold-sport px-3 py-1.5">
                          Match en cours
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modale de confirmation de suppression */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3">
            <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-xl max-w-md w-full p-4">
              <h2 className="font-sport text-lg text-white mb-3">Confirmer la suppression</h2>
              
              {getSelectedUnfinishedCount() > 0 ? (
                <div className="mb-3">
                  <p className="text-red-400 font-bold-sport mb-1.5 text-sm">
                    ⚠️ Attention : Parmi les pronostics sélectionnés, il y a {getSelectedUnfinishedCount()} pronostic{getSelectedUnfinishedCount() > 1 ? 's' : ''} programmé{getSelectedUnfinishedCount() > 1 ? 's' : ''} ou en cours.
                  </p>
                  <p className="text-gray-300 font-bold-sport mb-3 text-xs">
                    Si vous les supprimez, les points ne seront pas attribués même en cas de pronostic correct.
                  </p>
                  <p className="text-gray-400 font-bold-sport text-xs">
                    Êtes-vous sûr de vouloir supprimer ces pronostics ?
                  </p>
                </div>
              ) : (
                <div className="mb-3">
                  <p className="text-gray-300 font-bold-sport mb-3 text-xs">
                    Vous êtes sur le point de supprimer {selectedPredictions.size} pronostic{selectedPredictions.size > 1 ? 's' : ''} terminé{selectedPredictions.size > 1 ? 's' : ''}.
                  </p>
                  <p className="text-green-400 font-bold-sport text-xs">
                    Les points obtenus seront conservés pour le classement global.
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-2 mt-4">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleting(false);
                  }}
                  disabled={deleting}
                  className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-xs font-bold-sport hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold-sport hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {deleting ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      <span>Suppression...</span>
                    </>
                  ) : (
                    <span>Confirmer</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
