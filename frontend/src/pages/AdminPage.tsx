import React, { useState, useEffect } from 'react';
// import { useAuthStore } from '../stores/authStore'; // Pas utilisé pour l'instant
import { api } from '../services/api';

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
  startAt: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELED';
  setsHome?: number;
  setsAway?: number;
  group: {
    id: string;
    name: string;
  };
  predictions: Array<{
    id: string;
    predictedHome: number;
    predictedAway: number;
    user: {
      id: string;
      pseudo: string;
    };
  }>;
}

export default function AdminPage() {
  // const { user } = useAuthStore(); // Pas utilisé pour l'instant
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddMatch, setShowAddMatch] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/matches');
      setMatches(response.data.data);
    } catch (err) {
      setError('Erreur lors du chargement des matchs');
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce match ?')) return;

    try {
      await api.delete(`/admin/matches/${matchId}`);
      setMatches(matches.filter(m => m.id !== matchId));
    } catch (err) {
      setError('Erreur lors de la suppression du match');
      console.error('Erreur:', err);
    }
  };

  // handleUpdateMatch n'est pas utilisé - le modal EditMatchModal fait son propre appel API
  // const handleUpdateMatch = async (matchId: string, data: any) => {
  //   try {
  //     await api.put(`/admin/matches/${matchId}`, data);
  //     loadMatches(); // Recharger la liste
  //     setEditingMatch(null);
  //   } catch (err) {
  //     setError('Erreur lors de la mise à jour du match');
  //     console.error('Erreur:', err);
  //   }
  // };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
      case 'FINISHED': return 'bg-green-100 text-green-800';
      case 'CANCELED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return 'Programmé';
      case 'IN_PROGRESS': return 'En cours';
      case 'FINISHED': return 'Terminé';
      case 'CANCELED': return 'Annulé';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Administration</h1>
          <p className="mt-2 text-gray-600">
            Gestion des matchs et des utilisateurs
          </p>
        </div>

        {/* Actions */}
        <div className="mb-6 flex justify-between items-center">
          <div className="flex space-x-4">
            <button
              onClick={() => setShowAddMatch(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Ajouter un match
            </button>
            <button
              onClick={loadMatches}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              Actualiser
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Matches List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {matches.map((match) => (
              <li key={match.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        {match.homeTeamLogo && (
                          <img
                            src={match.homeTeamLogo}
                            alt={match.homeTeam}
                            className="h-8 w-8 rounded-full"
                          />
                        )}
                        <span className="font-medium text-gray-900">
                          {match.homeTeam}
                        </span>
                      </div>
                      <span className="text-gray-500">vs</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">
                          {match.awayTeam}
                        </span>
                        {match.awayTeamLogo && (
                          <img
                            src={match.awayTeamLogo}
                            alt={match.awayTeam}
                            className="h-8 w-8 rounded-full"
                          />
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                      <span>{formatDate(match.startAt)}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(match.status)}`}>
                        {getStatusText(match.status)}
                      </span>
                      <span>Groupe: {match.group.name}</span>
                      {match.setsHome !== undefined && match.setsAway !== undefined && (
                        <span className="font-medium">
                          Score: {match.setsHome}-{match.setsAway}
                        </span>
                      )}
                    </div>

                    {match.predictions.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600">
                          {match.predictions.length} prédiction(s)
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setEditingMatch(match)}
                      className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDeleteMatch(match.id)}
                      className="text-red-600 hover:text-red-900 text-sm font-medium"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {matches.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">Aucun match trouvé</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Match Modal */}
      {showAddMatch && (
        <AddMatchModal
          onClose={() => setShowAddMatch(false)}
          onSuccess={() => {
            setShowAddMatch(false);
            loadMatches();
          }}
        />
      )}

      {/* Edit Match Modal */}
      {editingMatch && (
        <EditMatchModal
          match={editingMatch}
          onClose={() => setEditingMatch(null)}
          onSuccess={() => {
            setEditingMatch(null);
            loadMatches();
          }}
        />
      )}
    </div>
  );
}

// Composant pour ajouter un match
function AddMatchModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    groupId: '',
    homeTeam: '',
    awayTeam: '',
    homeTeamLogo: '',
    awayTeamLogo: '',
    startAt: '',
    status: 'SCHEDULED' as const
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.post('/admin/matches', formData);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la création du match');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Ajouter un match</h3>
          
          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">ID du groupe</label>
              <input
                type="text"
                value={formData.groupId}
                onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Équipe à domicile</label>
              <input
                type="text"
                value={formData.homeTeam}
                onChange={(e) => setFormData({ ...formData, homeTeam: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Équipe à l'extérieur</label>
              <input
                type="text"
                value={formData.awayTeam}
                onChange={(e) => setFormData({ ...formData, awayTeam: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Date et heure</label>
              <input
                type="datetime-local"
                value={formData.startAt}
                onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                required
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Création...' : 'Créer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Composant pour modifier un match
function EditMatchModal({ match, onClose, onSuccess }: { match: Match; onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    homeTeamLogo: match.homeTeamLogo || '',
    awayTeamLogo: match.awayTeamLogo || '',
    startAt: new Date(match.startAt).toISOString().slice(0, 16),
    status: match.status,
    setsHome: match.setsHome || 0,
    setsAway: match.setsAway || 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.put(`/admin/matches/${match.id}`, formData);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la mise à jour du match');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Modifier le match</h3>
          
          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Équipe à domicile</label>
              <input
                type="text"
                value={formData.homeTeam}
                onChange={(e) => setFormData({ ...formData, homeTeam: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Équipe à l'extérieur</label>
              <input
                type="text"
                value={formData.awayTeam}
                onChange={(e) => setFormData({ ...formData, awayTeam: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Date et heure</label>
              <input
                type="datetime-local"
                value={formData.startAt}
                onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Statut</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="SCHEDULED">Programmé</option>
                <option value="IN_PROGRESS">En cours</option>
                <option value="FINISHED">Terminé</option>
                <option value="CANCELED">Annulé</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Sets domicile</label>
                <input
                  type="number"
                  min="0"
                  max="3"
                  value={formData.setsHome}
                  onChange={(e) => setFormData({ ...formData, setsHome: parseInt(e.target.value) })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Sets extérieur</label>
                <input
                  type="number"
                  min="0"
                  max="3"
                  value={formData.setsAway}
                  onChange={(e) => setFormData({ ...formData, setsAway: parseInt(e.target.value) })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Mise à jour...' : 'Mettre à jour'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


