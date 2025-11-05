import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
// import { useAuthStore } from '../stores/authStore'; // Pas utilisé pour l'instant
import { api } from '../services/api';
import { AddMatchForm } from '../components/AddMatchForm';

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  startAt: string;
  setsHome?: number;
  setsAway?: number;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELED';
  isLocked: boolean;
  predictions: Array<{
    id: string;
    user: {
      id: string;
      pseudo: string;
    };
    predictedSetsHome: number;
    predictedSetsAway: number;
    pointsAwarded?: number;
  }>;
}

interface Group {
  id: string;
  name: string;
  inviteCode: string;
  ffvbSourceUrl?: string;
}

export default function GroupMatchesPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const [group, setGroup] = useState<Group | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // const { logout } = useAuthStore(); // Pas utilisé pour l'instant

  useEffect(() => {
    if (groupId) {
      fetchGroup();
      fetchMatches();
    }
  }, [groupId]);

  const fetchGroup = async () => {
    try {
      const response = await api.get(`/groups/${groupId}`);
      setGroup(response.data.data);
    } catch (err: any) {
      setError('Erreur lors du chargement du groupe');
    }
  };

  const fetchMatches = async () => {
    try {
      const response = await api.get(`/matches?groupId=${groupId}`);
      setMatches(response.data.data);
    } catch (err: any) {
      setError('Erreur lors du chargement des matchs');
    } finally {
      setLoading(false);
    }
  };

  const handleMatchAdded = () => {
    setShowAddForm(false);
    fetchMatches();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return 'bg-yellow-100 text-yellow-800';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{group?.name}</h1>
              <p className="text-gray-600 mt-2">Gestion des matchs</p>
            </div>
            <div className="flex space-x-4">
              <Link
                to="/groups"
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
              >
                Retour aux groupes
              </Link>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                {showAddForm ? 'Annuler' : 'Ajouter un match'}
              </button>
            </div>
          </div>
        </div>

        {/* Add Match Form */}
        {showAddForm && (
          <div className="mb-8">
            <AddMatchForm groupId={groupId!} onMatchAdded={handleMatchAdded} />
          </div>
        )}

        {/* Matches List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Matchs ({matches.length})</h2>
          </div>

          {matches.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-gray-500 mb-4">Aucun match trouvé</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Ajouter le premier match
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {matches.map((match) => (
                <div key={match.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div className="text-lg font-medium">
                          {match.homeTeam} vs {match.awayTeam}
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(match.status)}`}>
                          {getStatusText(match.status)}
                        </span>
                        {match.isLocked && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Verrouillé
                          </span>
                        )}
                      </div>
                      
                      <div className="mt-2 text-sm text-gray-600">
                        <div>
                          Date: {new Date(match.startAt).toLocaleString('fr-FR')}
                        </div>
                        
                        {(match.setsHome !== undefined && match.setsAway !== undefined) && (
                          <div className="mt-1">
                            Score: {match.setsHome} - {match.setsAway}
                          </div>
                        )}
                        
                        {match.predictions.length > 0 && (
                          <div className="mt-1">
                            Pronostics: {match.predictions.length}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-800 text-sm">
                        Voir détails
                      </button>
                      {!match.isLocked && (
                        <button className="text-green-600 hover:text-green-800 text-sm">
                          Modifier
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


