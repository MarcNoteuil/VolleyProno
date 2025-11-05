import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
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

interface Group {
  id: string;
  name: string;
  inviteCode: string;
  ffvbSourceUrl?: string;
  leaderId?: string;
  leader?: {
    id: string;
    pseudo: string;
  };
  members: Array<{
    user: {
      id: string;
      pseudo: string;
    };
    role: 'OWNER' | 'ADMIN' | 'MEMBER';
  }>;
}

export default function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'team' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc'); // Par défaut, ordre décroissant pour afficher les plus récents en haut
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterTeam, setFilterTeam] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [showTransferLeadershipModal, setShowTransferLeadershipModal] = useState(false);
  const [selectedNewLeaderId, setSelectedNewLeaderId] = useState<string>('');

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000); // Réinitialiser après 2 secondes
    } catch (err) {
      console.error('Erreur lors de la copie:', err);
    }
  };

  useEffect(() => {
    if (groupId) {
      fetchGroupData();
    }
  }, [groupId]);

  const fetchGroupData = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Charger les deux requêtes en parallèle
      const [groupResponse, matchesResponse] = await Promise.all([
        api.get(`/groups/${groupId}`),
        api.get(`/matches?groupId=${groupId}`)
      ]);
      
      setGroup(groupResponse.data.data);
      setMatches(matchesResponse.data.data);
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des données');
      setLoading(false);
    }
  };

  const fetchGroupDetails = async () => {
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
    }
  };

  // Rafraîchir les données du groupe après certaines actions
  const refreshGroupData = async () => {
    await fetchGroupDetails();
  };

  const handleSyncFFVB = async () => {
    if (!groupId || !group?.ffvbSourceUrl) {
      setError('Aucune URL FFVB configurée pour ce groupe');
      return;
    }

    setSyncing(true);
    setError('');
    
    try {
      const response = await api.post(`/matches/${groupId}/sync`);
      await fetchMatches();
      
      if (response.data.data) {
        const { totalFound, created, updated } = response.data.data;
        alert(`Synchronisation terminée !\n${totalFound} match(s) trouvé(s)\n${created} créé(s), ${updated} mis à jour`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la synchronisation FFVB');
    } finally {
      setSyncing(false);
    }
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

  // Calculer les valeurs seulement si group est chargé
  const isLeader = group ? group.leaderId === user?.id : false;
  const membersCount = group?.members?.length || 0;
  const canDelete = isLeader && group !== null; // Seul le leader peut supprimer le groupe
  // Peut quitter sauf si c'est le dernier membre (doit supprimer le groupe à la place)
  // Important : vérifier que group est chargé et a des members
  const canLeave = !loading && group !== null && membersCount > 1;
  const canTransferLeadership = isLeader && membersCount > 1; // Le leader peut transférer si il y a d'autres membres

  const handleLeaveGroup = async () => {
    if (!groupId) return;
    
    setProcessing(true);
    setError('');
    
    try {
      await api.post(`/groups/${groupId}/leave`);
      navigate('/groups');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la sortie du groupe');
      setShowLeaveConfirm(false);
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!groupId) return;
    
    setProcessing(true);
    setError('');
    
    try {
      await api.delete(`/groups/${groupId}`);
      navigate('/groups');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la suppression du groupe');
      setShowDeleteConfirm(false);
    } finally {
      setProcessing(false);
    }
  };

  const handleTransferLeadership = async () => {
    if (!groupId || !selectedNewLeaderId) return;
    
    setProcessing(true);
    setError('');
    
    try {
      await api.post(`/groups/${groupId}/transfer-leadership`, {
        newLeaderId: selectedNewLeaderId
      });
      setShowTransferLeadershipModal(false);
      setSelectedNewLeaderId('');
      await refreshGroupData(); // Rafraîchir les données du groupe
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Erreur lors du transfert du leadership';
      setError(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  // Fonction de filtrage et tri des matchs
  const getFilteredAndSortedMatches = () => {
    let filtered = [...matches];

    // Appliquer les filtres
    if (filterDate) {
      filtered = filtered.filter(match => {
        const matchDate = new Date(match.startAt).toLocaleDateString('fr-FR');
        const filterDateObj = new Date(filterDate).toLocaleDateString('fr-FR');
        return matchDate === filterDateObj;
      });
    }

    if (filterTeam) {
      filtered = filtered.filter(match => {
        const homeTeamLower = match.homeTeam.toLowerCase();
        const awayTeamLower = match.awayTeam.toLowerCase();
        const filterTeamLower = filterTeam.toLowerCase();
        return homeTeamLower.includes(filterTeamLower) || awayTeamLower.includes(filterTeamLower);
      });
    }

    if (filterStatus) {
      filtered = filtered.filter(match => match.status === filterStatus);
    }

    // Appliquer le tri
    switch (sortBy) {
      case 'date':
        // Tri intelligent : matchs non terminés en haut, terminés en bas
        // Chaque groupe est trié par date croissante (du plus proche au plus lointain)
        filtered.sort((a, b) => {
          const isFinishedA = a.status === 'FINISHED';
          const isFinishedB = b.status === 'FINISHED';
          
          // Si l'un est terminé et l'autre non, mettre le non terminé en haut
          if (isFinishedA && !isFinishedB) return 1; // b (non terminé) avant a (terminé)
          if (!isFinishedA && isFinishedB) return -1; // a (non terminé) avant b (terminé)
          
          // Si les deux ont le même statut (terminés ou non), trier par date croissante
          const dateA = new Date(a.startAt).getTime();
          const dateB = new Date(b.startAt).getTime();
          return dateA - dateB; // Ordre croissant (plus proche en haut)
        });
        break;

      case 'team':
        filtered.sort((a, b) => {
          const teamA = a.homeTeam.toLowerCase();
          const teamB = b.homeTeam.toLowerCase();
          return sortOrder === 'asc' 
            ? teamA.localeCompare(teamB)
            : teamB.localeCompare(teamA);
        });
        break;

      case 'status':
        const statusOrder: Record<string, number> = {
          'SCHEDULED': 1,
          'IN_PROGRESS': 2,
          'FINISHED': 3,
          'CANCELED': 4
        };
        filtered.sort((a, b) => {
          const orderA = statusOrder[a.status] || 99;
          const orderB = statusOrder[b.status] || 99;
          return sortOrder === 'asc' ? orderA - orderB : orderB - orderA;
        });
        break;

      default:
        // Par défaut, appliquer le tri intelligent (comme 'date')
        filtered.sort((a, b) => {
          const isFinishedA = a.status === 'FINISHED';
          const isFinishedB = b.status === 'FINISHED';
          
          if (isFinishedA && !isFinishedB) return 1;
          if (!isFinishedA && isFinishedB) return -1;
          
          const dateA = new Date(a.startAt).getTime();
          const dateB = new Date(b.startAt).getTime();
          return dateA - dateB; // Ordre croissant (plus proche en haut)
        });
        break;
    }

    return filtered;
  };

  const filteredAndSortedMatches = getFilteredAndSortedMatches();

  // Extraire toutes les équipes uniques pour le filtre
  const allTeams = Array.from(new Set(
    matches.flatMap(match => [match.homeTeam, match.awayTeam])
  )).sort();

  // Compter les matchs filtrés
  const activeFiltersCount = [filterDate, filterTeam, filterStatus].filter(f => f !== '').length;
  
  const clearFilters = () => {
    setFilterDate('');
    setFilterTeam('');
    setFilterStatus('');
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

  if (error && !group) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <p className="text-red-500 mb-3 font-bold-sport text-sm">{error}</p>
          <Link to="/groups" className="text-orange-500 hover:text-orange-400 font-bold-sport text-xs">
            Retour aux groupes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-4">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="mb-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <Link to="/groups" className="text-orange-500 hover:text-orange-400 mb-2 inline-block font-bold-sport text-xs transition-colors">
                ← Retour aux groupes
              </Link>
              <h1 className="font-sport text-4xl text-white mb-1">{group?.name}</h1>
              <p className="text-gray-400 mt-2 flex items-center gap-2">
                Code d'invitation:{' '}
                <code className="bg-gray-800 px-3 py-1 rounded text-orange-400 font-bold-sport">
                  {group?.inviteCode}
                </code>
                {group?.inviteCode && (
                  <button
                    onClick={() => copyToClipboard(group.inviteCode)}
                    className="p-1.5 hover:bg-gray-700 rounded transition-colors relative group"
                    title="Copier le code"
                    aria-label="Copier le code d'invitation"
                  >
                    {copiedCode ? (
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-gray-400 hover:text-orange-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                )}
              </p>
            </div>
            <div className="flex space-x-3">
              {canTransferLeadership && (
                <button
                  onClick={() => setShowTransferLeadershipModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-bold-sport shadow-lg shadow-blue-500/30 transition-all duration-200 text-sm"
                >
                  Transférer le leadership
                </button>
              )}
              {canLeave && (
                <button
                  onClick={() => setShowLeaveConfirm(true)}
                  className="px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-700 text-white rounded-lg hover:from-yellow-700 hover:to-yellow-800 font-bold-sport shadow-lg shadow-yellow-500/30 transition-all duration-200 text-sm"
                >
                  Quitter le groupe
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 font-bold-sport shadow-lg shadow-red-500/30 transition-all duration-200 text-sm"
                >
                  Supprimer le groupe
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Liste des matchs */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                <h2 className="font-sport text-3xl text-white">Matchs</h2>
                {group?.ffvbSourceUrl && (
                  <button
                    onClick={handleSyncFFVB}
                    disabled={syncing}
                    className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-2 rounded-lg hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold-sport shadow-lg shadow-orange-500/30 transition-all duration-200"
                  >
                    {syncing ? 'Synchronisation...' : 'Sync FFVB'}
                  </button>
                )}
              </div>

              {/* Filtres et tri */}
              {matches.length > 0 && (
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 mb-4">
                  <div className="flex flex-wrap items-center gap-4 mb-3">
                    <span className="text-gray-300 font-bold-sport text-sm">Filtres:</span>
                    
                    {/* Filtre par date */}
                    <div className="flex items-center space-x-2">
                      <label className="text-gray-400 text-xs font-bold-sport">Date:</label>
                      <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm font-bold-sport focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    {/* Filtre par équipe */}
                    <div className="flex items-center space-x-2">
                      <label className="text-gray-400 text-xs font-bold-sport">Équipe:</label>
                      <select
                        value={filterTeam}
                        onChange={(e) => setFilterTeam(e.target.value)}
                        className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm font-bold-sport focus:outline-none focus:ring-2 focus:ring-orange-500 min-w-[150px]"
                      >
                        <option value="">Toutes les équipes</option>
                        {allTeams.map(team => (
                          <option key={team} value={team}>{team}</option>
                        ))}
                      </select>
                    </div>

                    {/* Filtre par statut */}
                    <div className="flex items-center space-x-2">
                      <label className="text-gray-400 text-xs font-bold-sport">Statut:</label>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm font-bold-sport focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="">Tous les statuts</option>
                        <option value="SCHEDULED">Programmé</option>
                        <option value="IN_PROGRESS">En cours</option>
                        <option value="FINISHED">Terminé</option>
                        <option value="CANCELED">Annulé</option>
                      </select>
                    </div>

                    {/* Bouton pour réinitialiser les filtres */}
                    {activeFiltersCount > 0 && (
                      <button
                        onClick={clearFilters}
                        className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm font-bold-sport transition-colors"
                      >
                        Réinitialiser ({activeFiltersCount})
                      </button>
                    )}
                  </div>

                  {/* Tri */}
                  <div className="flex items-center space-x-2 pt-3 border-t border-gray-700">
                    <span className="text-gray-400 text-sm font-bold-sport">Trier par:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as 'date' | 'team' | 'status')}
                      className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm font-bold-sport focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="date">Date</option>
                      <option value="team">Équipe</option>
                      <option value="status">Statut</option>
                    </select>
                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-bold-sport transition-colors"
                      title={sortOrder === 'asc' ? 'Ordre croissant' : 'Ordre décroissant'}
                    >
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </button>
                    {filteredAndSortedMatches.length !== matches.length && (
                      <span className="text-gray-400 text-sm font-bold-sport ml-2">
                        ({filteredAndSortedMatches.length} / {matches.length} matchs)
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
            {matches.length === 0 ? (
              <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
                <p className="text-gray-400 mb-4">Aucun match programmé</p>
                {group?.ffvbSourceUrl && (
                  <button
                    onClick={handleSyncFFVB}
                    disabled={syncing}
                    className="mt-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-2 rounded-lg hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 font-bold-sport shadow-lg shadow-orange-500/30"
                  >
                    {syncing ? 'Synchronisation...' : 'Synchroniser les matchs FFVB'}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAndSortedMatches.length === 0 && activeFiltersCount > 0 ? (
                  <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
                    <p className="text-gray-400 mb-4 font-bold-sport">Aucun match ne correspond aux filtres sélectionnés</p>
                    <button
                      onClick={clearFilters}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg font-bold-sport transition-colors"
                    >
                      Réinitialiser les filtres
                    </button>
                  </div>
                ) : (
                  filteredAndSortedMatches.map((match) => (
                  <div key={match.id} className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 p-6 hover:border-orange-500 transition-all duration-200">
                    {/* Header du match */}
                    <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-700">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-2">
                          <h3 className="font-team text-2xl text-white">
                            <span className="text-orange-400">{match.homeTeam}</span>
                            <span className="mx-3 text-gray-500">VS</span>
                            <span className="text-orange-400">{match.awayTeam}</span>
                          </h3>
                        </div>
                        <p className="text-gray-400 text-sm">{formatDate(match.startAt)}</p>
                      </div>
                      <div className="flex space-x-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold-sport ${getStatusColor(match.status)}`}>
                          {getStatusText(match.status)}
                        </span>
                        {match.isLocked && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold-sport bg-red-600 text-white">
                            Verrouillé
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Scores - Cases blanches pour sets */}
                    {(match.status === 'FINISHED' || match.status === 'IN_PROGRESS') && match.setsHome !== undefined && match.setsAway !== undefined && (
                      <div className="mb-4">
                        <div className="flex items-center justify-center space-x-4 mb-3">
                          {/* Cases blanches pour sets */}
                          <div className="flex space-x-2">
                            {[1, 2, 3, 4, 5].map((setNum) => {
                              const setScore = match.setScores?.[setNum - 1];
                              const homeWon = setScore && setScore.home > setScore.away;
                              const awayWon = setScore && setScore.away > setScore.home;
                              
                              return (
                                <div key={setNum} className="bg-white rounded-lg p-3 min-w-[60px] text-center shadow-lg">
                                  <div className="text-xs text-gray-500 mb-1 font-bold-sport">SET {setNum}</div>
                                  {setScore ? (
                                    <div className="space-y-1">
                                      <div className={`text-lg font-bold-sport ${homeWon ? 'text-orange-500' : 'text-black'}`}>
                                        {setScore.home}
                                      </div>
                                      <div className="text-gray-400 text-xs">-</div>
                                      <div className={`text-lg font-bold-sport ${awayWon ? 'text-orange-500' : 'text-black'}`}>
                                        {setScore.away}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-gray-300 text-sm">-</div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        {/* Score total */}
                        <div className="text-center">
                          <div className="inline-flex items-center space-x-3 bg-gray-700 rounded-lg px-6 py-2">
                            <span className="font-team text-xl text-white">{match.homeTeam}</span>
                            <span className="font-sport text-3xl text-orange-500">
                              {match.setsHome} - {match.setsAway}
                            </span>
                            <span className="font-team text-xl text-white">{match.awayTeam}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Pronostics */}
                    <div className="mb-4 pb-4 border-b border-gray-700">
                      <h4 className="font-bold-sport text-white mb-3">Pronostics:</h4>
                      {match.predictions.length === 0 ? (
                        <p className="text-gray-500 text-sm">Aucun pronostic</p>
                      ) : (
                        <div className="space-y-2">
                          {match.predictions.map((prediction) => (
                            <div key={prediction.id} className="flex justify-between items-center bg-gray-700 rounded-lg p-2">
                              <span className="text-gray-300 text-sm font-bold-sport">
                                {prediction.user.pseudo}: {prediction.predictedHome}-{prediction.predictedAway}
                              </span>
                              {prediction.pointsAwarded !== undefined && (
                                <span className="font-bold-sport text-green-400 text-lg">
                                  +{prediction.pointsAwarded} pts
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {!match.isLocked && match.status === 'SCHEDULED' ? (
                      <div className="flex items-center space-x-3">
                        {(() => {
                          const userPrediction = match.predictions.find(p => p.user.id === user?.id);
                          const hasUserPrediction = !!userPrediction;
                          
                          return hasUserPrediction ? (
                            <>
                              <span className="text-sm text-green-400 font-bold-sport">
                                ✓ Pronostic effectué
                              </span>
                              <Link
                                to={`/groups/${groupId}/matches/${match.id}/predict`}
                                className="inline-block bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-2 rounded-lg hover:from-orange-600 hover:to-orange-700 text-sm font-bold-sport shadow-lg shadow-orange-500/30 transition-all duration-200"
                              >
                                Modifier mon pronostic
                              </Link>
                            </>
                          ) : (
                            <Link
                              to={`/groups/${groupId}/matches/${match.id}/predict`}
                              className="inline-block bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-2 rounded-lg hover:from-orange-600 hover:to-orange-700 text-sm font-bold-sport shadow-lg shadow-orange-500/30 transition-all duration-200 w-full text-center"
                            >
                              Faire un pronostic
                            </Link>
                          );
                        })()}
                      </div>
                    ) : match.isLocked && match.status === 'SCHEDULED' ? (
                      <div>
                        <p className="text-sm text-gray-500 italic mb-2">
                          Les pronostics sont fermés (fermeture 24h avant le début du match)
                        </p>
                        {(() => {
                          const userPrediction = match.predictions.find(p => p.user.id === user?.id);
                          return userPrediction ? (
                            <p className="text-sm text-green-400 font-bold-sport">
                              ✓ Pronostic effectué
                            </p>
                          ) : null;
                        })()}
                      </div>
                    ) : null}
                  </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div>
            <div className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 p-6 mb-6">
              <h3 className="font-sport text-2xl text-white mb-4">Membres</h3>
              <div className="space-y-3">
                {group?.members.map((member) => (
                  <div key={member.user.id} className="flex justify-between items-center bg-gray-700 rounded-lg p-3">
                    <span className="text-gray-300 font-bold-sport">{member.user.pseudo}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold-sport ${
                      member.role === 'OWNER' ? 'bg-purple-600 text-white' :
                      member.role === 'ADMIN' ? 'bg-blue-600 text-white' :
                      'bg-gray-600 text-gray-300'
                    }`}>
                      {member.role === 'OWNER' ? 'Propriétaire' :
                       member.role === 'ADMIN' ? 'Admin' : 'Membre'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 p-6">
              <h3 className="font-sport text-2xl text-white mb-4">Actions</h3>
              <div className="space-y-3">
                <Link
                  to={`/groups/${groupId}/ranking`}
                  className="block w-full bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-3 rounded-lg hover:from-green-700 hover:to-green-800 text-center font-bold-sport shadow-lg shadow-green-500/30 transition-all duration-200"
                >
                  Voir le classement
                </Link>
                {group?.ffvbSourceUrl && (
                  <a
                    href={group.ffvbSourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 text-center font-bold-sport shadow-lg shadow-blue-500/30 transition-all duration-200"
                  >
                    Voir sur FFVB
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de confirmation - Quitter le groupe */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-yellow-500/50 p-6 w-full max-w-md">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">⚠️</div>
              <h3 className="font-sport text-2xl text-white mb-2">Quitter le groupe</h3>
              <p className="text-gray-300 font-bold-sport">
                Êtes-vous sûr de vouloir quitter le groupe <span className="text-orange-400">{group?.name}</span> ?
              </p>
              {isLeader && membersCount > 1 && (
                <p className="text-orange-400 text-sm mt-2 font-bold-sport">
                  ⚠️ En tant que leader, le leadership sera automatiquement transféré au membre le plus ancien du groupe.
                </p>
              )}
              <p className="text-gray-400 text-sm mt-2">
                Vous perdrez accès à tous les matchs et pronostics de ce groupe.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowLeaveConfirm(false)}
                disabled={processing}
                className="px-6 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 font-bold-sport transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleLeaveGroup}
                disabled={processing}
                className="px-6 py-2 bg-gradient-to-r from-yellow-600 to-yellow-700 text-white rounded-lg hover:from-yellow-700 hover:to-yellow-800 disabled:opacity-50 font-bold-sport shadow-lg shadow-yellow-500/30 transition-all duration-200"
              >
                {processing ? 'Traitement...' : 'Quitter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation - Supprimer le groupe */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-red-500/50 p-6 w-full max-w-md">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">🗑️</div>
              <h3 className="font-sport text-2xl text-white mb-2">Supprimer le groupe</h3>
              <p className="text-gray-300 font-bold-sport">
                Êtes-vous sûr de vouloir supprimer le groupe <span className="text-orange-400">{group?.name}</span> ?
              </p>
              <p className="text-red-400 text-sm mt-2 font-bold-sport">
                ⚠️ Cette action est irréversible et affectera tous les membres du groupe.
              </p>
              <p className="text-gray-400 text-xs mt-2">
                Le groupe sera marqué comme supprimé mais pourra être restauré par un administrateur si nécessaire.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={processing}
                className="px-6 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 font-bold-sport transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteGroup}
                disabled={processing}
                className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 disabled:opacity-50 font-bold-sport shadow-lg shadow-red-500/30 transition-all duration-200"
              >
                {processing ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de transfert de leadership */}
      {showTransferLeadershipModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-blue-500/50 p-6 w-full max-w-md">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">👑</div>
              <h3 className="font-sport text-2xl text-white mb-2">Transférer le leadership</h3>
              <p className="text-gray-300 font-bold-sport">
                Choisissez le nouveau leader du groupe <span className="text-orange-400">{group?.name}</span>
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Vous ne pourrez plus supprimer le groupe une fois le leadership transféré.
              </p>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-bold-sport text-gray-300 mb-3">
                Nouveau leader
              </label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {group?.members
                  .filter(member => member.user.id !== user?.id)
                  .map((member) => (
                    <button
                      key={member.user.id}
                      type="button"
                      onClick={() => setSelectedNewLeaderId(member.user.id)}
                      className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                        selectedNewLeaderId === member.user.id
                          ? 'border-blue-500 bg-blue-900/30'
                          : 'border-gray-700 bg-gray-700/50 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white font-bold-sport">{member.user.pseudo}</span>
                        {selectedNewLeaderId === member.user.id && (
                          <span className="text-blue-400">✓</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 capitalize">{member.role.toLowerCase()}</span>
                    </button>
                  ))}
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowTransferLeadershipModal(false);
                  setSelectedNewLeaderId('');
                }}
                disabled={processing}
                className="px-6 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 font-bold-sport transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleTransferLeadership}
                disabled={processing || !selectedNewLeaderId}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 font-bold-sport shadow-lg shadow-blue-500/30 transition-all duration-200"
              >
                {processing ? 'Traitement...' : 'Transférer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
