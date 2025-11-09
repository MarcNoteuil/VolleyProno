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
    predictedSetScores?: SetScore[];
    isRisky?: boolean;
    pointsAwarded?: number;
    user: {
      id: string;
      pseudo: string;
      avatar?: string | null;
      firstName?: string | null;
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
      firstName?: string | null;
      avatar?: string | null;
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
  const [filterHasPredictions, setFilterHasPredictions] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showTransferLeadershipModal, setShowTransferLeadershipModal] = useState(false);
  const [selectedNewLeaderId, setSelectedNewLeaderId] = useState<string>('');
  const [groupRanking, setGroupRanking] = useState<Array<{
    user: {
      id: string;
      pseudo: string;
      firstName?: string | null;
      avatar?: string | null;
    };
    totalPoints: number;
    position: number;
  }>>([]);
  const [showTeamRanking, setShowTeamRanking] = useState(true);
  const [showTeamRankingModal, setShowTeamRankingModal] = useState(false);
  const [showPredictionsDetails, setShowPredictionsDetails] = useState<Record<string, boolean>>({});
  const [showFilters, setShowFilters] = useState(false);

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
      // Charger les trois requêtes en parallèle
      const [groupResponse, matchesResponse, rankingResponse] = await Promise.all([
        api.get(`/groups/${groupId}`),
        api.get(`/matches?groupId=${groupId}`),
        api.get(`/ranking/${groupId}`).catch(() => ({ data: { data: [] } })) // Ignorer l'erreur si le classement n'est pas disponible
      ]);
      
      setGroup(groupResponse.data.data);
      setMatches(matchesResponse.data.data);
      setGroupRanking(rankingResponse.data.data || []);
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

    if (filterHasPredictions) {
      filtered = filtered.filter(match => match.predictions && match.predictions.length > 0);
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

  // Fonction pour calculer le classement des équipes
  const calculateTeamRanking = () => {
    // Filtrer uniquement les matchs finis avec des scores de sets valides
    const finishedMatches = matches.filter(m => {
      const isValid = m.status === 'FINISHED' && 
        m.setsHome !== undefined && 
        m.setsAway !== undefined &&
        m.setsHome !== null &&
        m.setsAway !== null &&
        typeof m.setsHome === 'number' &&
        typeof m.setsAway === 'number' &&
        m.setsHome >= 0 &&
        m.setsAway >= 0 &&
        (m.setsHome === 3 || m.setsAway === 3); // Un match fini doit avoir une équipe avec 3 sets
      return isValid;
    });
    
    // Détecter si c'est une coupe (via l'URL FFVB)
    const isCoupe = group?.ffvbSourceUrl?.includes('index_com.htm') || group?.ffvbSourceUrl?.includes('coupe');
    
    // Pour une coupe, on retourne la liste des équipes encore en lice
    // Au début, toutes les équipes sont en lice, puis on retire celles qui ont perdu
    if (isCoupe) {
      // Récupérer toutes les équipes qui ont participé à des matchs (terminés ou non)
      const allTeams = new Set<string>();
      matches.forEach(match => {
        allTeams.add(match.homeTeam);
        allTeams.add(match.awayTeam);
      });
      
      // Récupérer les équipes qui ont perdu un match terminé
      const eliminatedTeams = new Set<string>();
      finishedMatches.forEach(match => {
        if (match.setsHome! > match.setsAway!) {
          // L'équipe à domicile a gagné, l'équipe à l'extérieur est éliminée
          eliminatedTeams.add(match.awayTeam);
        } else {
          // L'équipe à l'extérieur a gagné, l'équipe à domicile est éliminée
          eliminatedTeams.add(match.homeTeam);
        }
      });
      
      // Les équipes encore en lice sont celles qui n'ont pas été éliminées
      const teamsStillIn = Array.from(allTeams).filter(team => !eliminatedTeams.has(team));
      
      return teamsStillIn.map(team => ({ name: team, isStillIn: true }));
    }
    
    // Pour un championnat, calculer le classement
    const teamStats: Record<string, {
      name: string;
      points: number;
      wins: number;
      losses: number;
      setsWon: number;
      setsLost: number;
      pointsWon: number;
      pointsLost: number;
      matchesPlayed: number;
    }> = {};
    
    finishedMatches.forEach(match => {
      const homeTeam = match.homeTeam;
      const awayTeam = match.awayTeam;
      const homeSets = match.setsHome!;
      const awaySets = match.setsAway!;
      
      // Initialiser les stats si nécessaire
      if (!teamStats[homeTeam]) {
        teamStats[homeTeam] = {
          name: homeTeam,
          points: 0,
          wins: 0,
          losses: 0,
          setsWon: 0,
          setsLost: 0,
          pointsWon: 0,
          pointsLost: 0,
          matchesPlayed: 0
        };
      }
      if (!teamStats[awayTeam]) {
        teamStats[awayTeam] = {
          name: awayTeam,
          points: 0,
          wins: 0,
          losses: 0,
          setsWon: 0,
          setsLost: 0,
          pointsWon: 0,
          pointsLost: 0,
          matchesPlayed: 0
        };
      }
      
      // Calculer les points selon les règles du volley-ball
      // 3 pts pour 3-0 ou 3-1
      // 2 pts pour 3-2
      // 1 pt pour 2-3
      // 0 pts pour 0-3 ou 1-3
      let homePoints = 0;
      let awayPoints = 0;
      
      if (homeSets === 3 && awaySets === 0) {
        homePoints = 3;
        awayPoints = 0;
      } else if (homeSets === 3 && awaySets === 1) {
        homePoints = 3;
        awayPoints = 0;
      } else if (homeSets === 3 && awaySets === 2) {
        homePoints = 2;
        awayPoints = 1;
      } else if (homeSets === 2 && awaySets === 3) {
        homePoints = 1;
        awayPoints = 2;
      } else if (homeSets === 1 && awaySets === 3) {
        homePoints = 0;
        awayPoints = 3;
      } else if (homeSets === 0 && awaySets === 3) {
        homePoints = 0;
        awayPoints = 3;
      }
      
      teamStats[homeTeam].points += homePoints;
      teamStats[awayTeam].points += awayPoints;
      teamStats[homeTeam].setsWon += homeSets;
      teamStats[homeTeam].setsLost += awaySets;
      teamStats[awayTeam].setsWon += awaySets;
      teamStats[awayTeam].setsLost += homeSets;
      
      if (homeSets > awaySets) {
        teamStats[homeTeam].wins++;
        teamStats[awayTeam].losses++;
      } else {
        teamStats[awayTeam].wins++;
        teamStats[homeTeam].losses++;
      }
      
      teamStats[homeTeam].matchesPlayed++;
      teamStats[awayTeam].matchesPlayed++;
      
      // Calculer les points totaux (si setScores est disponible)
      if (match.setScores && match.setScores.length > 0) {
        match.setScores.forEach(setScore => {
          if (setScore.home > 0 || setScore.away > 0) {
            teamStats[homeTeam].pointsWon += setScore.home;
            teamStats[homeTeam].pointsLost += setScore.away;
            teamStats[awayTeam].pointsWon += setScore.away;
            teamStats[awayTeam].pointsLost += setScore.home;
          }
        });
      }
    });
    
    // Convertir en tableau et calculer les averages (pour le tri uniquement)
    const ranking = Object.values(teamStats).map(team => {
      const setAverage = team.setsLost > 0 ? team.setsWon / team.setsLost : (team.setsWon > 0 ? team.setsWon : 0);
      const pointAverage = team.pointsLost > 0 ? team.pointsWon / team.pointsLost : (team.pointsWon > 0 ? team.pointsWon : 0);
      
      return {
        ...team,
        setAverage,
        pointAverage
      };
    });
    
    // Trier par points (décroissant), puis set average (décroissant), puis point average (décroissant)
    ranking.sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      if (b.setAverage !== a.setAverage) {
        return b.setAverage - a.setAverage;
      }
      return b.pointAverage - a.pointAverage;
    });
    
    // Ajouter la position
    return ranking.map((team, index) => ({
      ...team,
      position: index + 1
    }));
  };
  
  const teamRanking = calculateTeamRanking();
  const isCoupe = group?.ffvbSourceUrl?.includes('index_com.htm') || group?.ffvbSourceUrl?.includes('coupe');

  // Extraire toutes les équipes uniques pour le filtre
  const allTeams = Array.from(new Set(
    matches.flatMap(match => [match.homeTeam, match.awayTeam])
  )).sort();

  // Compter les matchs filtrés
  const activeFiltersCount = [filterDate, filterTeam, filterStatus].filter(f => f !== '').length + (filterHasPredictions ? 1 : 0);
  
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
          <Link to="/groups" className="text-orange-500 hover:text-orange-400 font-bold-sport text-sm">
            Retour aux groupes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <Link to="/groups" className="text-orange-500 hover:text-orange-400 mb-2 inline-block font-bold-sport text-sm transition-colors">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Liste des matchs */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                <h2 className="font-sport text-3xl text-white">Matchs</h2>
                <div className="flex items-center space-x-3">
                  {group?.ffvbSourceUrl && (
                    <button
                      onClick={() => setShowTeamRanking(!showTeamRanking)}
                      className="hidden lg:block bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-blue-700 font-bold-sport shadow-lg shadow-blue-500/30 transition-all duration-200 text-sm"
                    >
                      {showTeamRanking ? 'Masquer' : 'Afficher'} le classement
                    </button>
                  )}
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
                <>
                  {/* Filtres et tri */}
                  {matches.length > 0 && (
                    <div className="bg-gray-800 rounded-xl border border-gray-700 p-3 sm:p-4 mb-4">
                      {/* Bouton pour afficher/masquer les filtres sur mobile */}
                      <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="md:hidden w-full flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors mb-3"
                      >
                        <span className="text-gray-300 font-bold-sport text-sm">Filtres et tri</span>
                        <svg
                          className={`w-5 h-5 text-gray-400 transition-transform ${showFilters ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      <div className={`${showFilters ? 'block' : 'hidden'} md:block`}>
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-3">
                          <span className="text-gray-300 font-bold-sport text-sm w-full md:w-auto">Filtres:</span>
                        
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

                          {/* Filtre par pronostics */}
                          <div className="flex items-center space-x-2">
                            <label className="text-gray-400 text-xs font-bold-sport flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={filterHasPredictions}
                                onChange={(e) => setFilterHasPredictions(e.target.checked)}
                                className="w-4 h-4 text-orange-500 bg-gray-700 border-gray-600 rounded focus:ring-orange-500 focus:ring-2"
                              />
                              <span>Avec pronostics</span>
                            </label>
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
                    </div>
                  )}

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
                  <div key={match.id} className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 p-4 sm:p-6 hover:border-orange-500 transition-all duration-200">
                    {/* Header du match */}
                    <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-700">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-2">
                          <h3 className="font-team text-lg sm:text-xl lg:text-2xl text-white">
                            <span className="text-orange-400 break-words">
                              <span className="text-orange-400 font-bold mr-1">A</span>
                              - {match.homeTeam}
                            </span>
                            <span className="mx-2 sm:mx-3 text-gray-500">VS</span>
                            <span className="text-orange-400 break-words">
                              <span className="text-orange-400 font-bold mr-1">B</span>
                              - {match.awayTeam}
                            </span>
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

                    {/* Scores par set - Cases blanches */}
                    {(match.status === 'FINISHED' || match.status === 'IN_PROGRESS') && match.setsHome !== undefined && match.setsAway !== undefined && (
                      <div className="mb-4">
                        {/* Identifiants A et B - Responsive */}
                        <div className="flex sm:flex-row flex-col items-center justify-center gap-2 sm:gap-4 mb-3 text-xs font-bold-sport">
                          <div className="flex items-center space-x-2">
                            <span className="text-orange-400">A</span>
                            <span className="text-gray-400 hidden sm:inline">- {match.homeTeam}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-orange-400">B</span>
                            <span className="text-gray-400 hidden sm:inline">- {match.awayTeam}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-center space-x-4 mb-3">
                          {/* Cases blanches pour scores par set */}
                          <div className="flex flex-wrap gap-2 sm:gap-2 justify-center">
                            {[1, 2, 3, 4, 5].map((setNum) => {
                              const setScore = match.setScores?.[setNum - 1];
                              const homeWon = setScore && setScore.home > setScore.away;
                              const awayWon = setScore && setScore.away > setScore.home;
                              
                              return (
                                <div key={setNum} className="bg-white rounded-lg p-2 sm:p-3 min-w-[50px] sm:min-w-[60px] text-center shadow-lg relative">
                                  <div className="text-xs text-gray-500 mb-1 font-bold-sport">SET {setNum}</div>
                                  {setScore ? (
                                    <div className="space-y-1 relative">
                                      {/* Identifiant A aligné avec le score du haut */}
                                      <div className="relative">
                                        <span className="absolute -left-6 sm:-left-7 top-1/2 -translate-y-1/2 text-orange-400 font-bold text-xs bg-gray-800 rounded-full w-5 h-5 flex items-center justify-center">A</span>
                                        <div className={`text-lg font-bold-sport ${homeWon ? 'text-orange-500' : 'text-black'}`}>
                                          {setScore.home}
                                        </div>
                                      </div>
                                      <div className="text-gray-400 text-xs">-</div>
                                      {/* Identifiant B aligné avec le score du bas */}
                                      <div className="relative">
                                        <span className="absolute -left-6 sm:-left-7 top-1/2 -translate-y-1/2 text-orange-400 font-bold text-xs bg-gray-800 rounded-full w-5 h-5 flex items-center justify-center">B</span>
                                        <div className={`text-lg font-bold-sport ${awayWon ? 'text-orange-500' : 'text-black'}`}>
                                          {setScore.away}
                                        </div>
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
                        {/* Sets gagnés (résultat final) */}
                        <div className="text-center">
                          <div className="inline-flex flex-col sm:flex-row items-center gap-2 sm:gap-3 bg-gray-700 rounded-lg px-4 sm:px-6 py-2">
                            <span className="font-team text-base sm:text-xl text-white text-center">
                              <span className="text-orange-400 font-bold mr-1">A</span>
                              - {match.homeTeam}
                            </span>
                            <span className="font-sport text-2xl sm:text-3xl text-orange-500">
                              {match.setsHome} - {match.setsAway}
                            </span>
                            <span className="font-team text-base sm:text-xl text-white text-center">
                              <span className="text-orange-400 font-bold mr-1">B</span>
                              - {match.awayTeam}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Pronostics */}
                    <div className="mb-4 pb-4 border-b border-gray-700">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold-sport text-white">Pronostics:</h4>
                          {!showPredictionsDetails[match.id] && match.predictions.length > 0 && (
                            <span className="text-orange-400 font-bold-sport text-base">
                              <span className="font-bold text-lg">{match.predictions.length}</span> pronostic{match.predictions.length > 1 ? 's' : ''} disponible{match.predictions.length > 1 ? 's' : ''}
                            </span>
                          )}
                          {match.predictions.length === 0 && (
                            <span className="text-gray-500 text-sm">Aucun pronostic</span>
                          )}
                        </div>
                        {match.predictions.length > 0 && (
                          <button
                            onClick={() => setShowPredictionsDetails(prev => ({
                              ...prev,
                              [match.id]: !prev[match.id]
                            }))}
                            className="text-xs text-orange-400 hover:text-orange-300 font-bold-sport transition-colors flex items-center space-x-1"
                          >
                            <span>{showPredictionsDetails[match.id] ? 'Masquer' : 'Afficher'} les pronostics</span>
                            <svg 
                              className={`w-4 h-4 transition-transform ${showPredictionsDetails[match.id] ? 'rotate-180' : ''}`}
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        )}
                      </div>
                      {showPredictionsDetails[match.id] && match.predictions.length > 0 && (
                        <div className="space-y-3">
                          {match.predictions.map((prediction) => {
                            // Calculer le nombre de sets attendus selon le pronostic
                            const totalSets = prediction.predictedHome + prediction.predictedAway;
                            
                            // Filtrer les scores détaillés pour ne garder que ceux qui ont été remplis (pas 0-0)
                            const filledSetScores = prediction.predictedSetScores?.filter(
                              (score) => score.home > 0 || score.away > 0
                            ) || [];
                            
                            // Limiter aux sets attendus selon le pronostic
                            const displayedSetScores = filledSetScores.slice(0, totalSets);
                            
                            return (
                              <div key={prediction.id} className="bg-gray-700 rounded-lg p-3">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center space-x-2">
                                    {prediction.user.avatar ? (
                                      <img
                                        src={prediction.user.avatar}
                                        alt={prediction.user.pseudo || prediction.user.firstName || 'Avatar'}
                                        className="w-6 h-6 rounded-full border border-gray-600 object-cover"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                      />
                                    ) : (
                                      <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-white text-xs font-bold-sport">
                                        {(prediction.user.pseudo || prediction.user.firstName || 'U')[0].toUpperCase()}
                                      </div>
                                    )}
                                    <span className="text-gray-300 text-sm font-bold-sport">
                                      {prediction.user.pseudo || prediction.user.firstName}: {prediction.predictedHome}-{prediction.predictedAway}
                                    </span>
                                    {prediction.isRisky && (
                                      <span className="text-orange-500 text-sm" title="Pronostic risqué">
                                        🔥
                                      </span>
                                    )}
                                  </div>
                                  {prediction.pointsAwarded !== undefined && (
                                    <span className={`font-bold-sport text-sm ${
                                      prediction.pointsAwarded > 0 
                                        ? 'text-green-400' 
                                        : prediction.pointsAwarded < 0 
                                        ? 'text-red-400' 
                                        : 'text-gray-400'
                                    }`}>
                                      {prediction.pointsAwarded > 0 ? '+' : ''}{String(prediction.pointsAwarded ?? 0)} pts
                                    </span>
                                  )}
                                </div>
                                
                                {/* Scores par set prédits */}
                                {displayedSetScores.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-gray-600">
                                    {/* Identifiants A et B - Responsive */}
                                    <div className="flex sm:flex-row flex-col items-center justify-center gap-2 sm:gap-4 mb-2 text-xs font-bold-sport">
                                      <div className="flex items-center space-x-2">
                                        <span className="text-orange-400">A</span>
                                        <span className="text-gray-400 hidden sm:inline">- {match.homeTeam}</span>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <span className="text-orange-400">B</span>
                                        <span className="text-gray-400 hidden sm:inline">- {match.awayTeam}</span>
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {displayedSetScores.map((setScore, index) => {
                                        const homeWon = setScore.home > setScore.away;
                                        return (
                                          <div key={index} className="bg-white rounded-lg p-1.5 min-w-[45px] text-center relative">
                                            <div className="text-xs text-gray-500 mb-0.5 font-bold-sport">SET {index + 1}</div>
                                            <div className="text-xs font-bold-sport space-y-0.5">
                                              {/* Identifiant A aligné avec le score du haut */}
                                              <div className="relative">
                                                <span className="absolute -left-5 sm:-left-6 top-1/2 -translate-y-1/2 text-orange-400 font-bold text-xs bg-gray-800 rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-[10px] sm:text-xs">A</span>
                                                <span className={homeWon ? 'text-orange-500' : 'text-black'}>{setScore.home}</span>
                                              </div>
                                              <span className="text-gray-400 mx-0.5">-</span>
                                              {/* Identifiant B aligné avec le score du bas */}
                                              <div className="relative">
                                                <span className="absolute -left-5 sm:-left-6 top-1/2 -translate-y-1/2 text-orange-400 font-bold text-xs bg-gray-800 rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-[10px] sm:text-xs">B</span>
                                                <span className={!homeWon ? 'text-orange-500' : 'text-black'}>{setScore.away}</span>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
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
                          Les pronostics sont fermés (fermeture à l'heure du match)
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
                </>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div>
            <div className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 p-6 mb-6">
              <h3 className="font-sport text-2xl text-white mb-4">Classement</h3>
              <div className="space-y-2">
                {groupRanking.length > 0 ? (
                  groupRanking.map((entry) => {
                    const isLeader = entry.user.id === group?.leaderId;
                    const getPositionLabel = (position: number) => {
                      if (position === 1) return '1er';
                      if (position === 2) return '2e';
                      if (position === 3) return '3e';
                      return null;
                    };
                    const positionLabel = getPositionLabel(entry.position);
                    
                    return (
                      <div
                        key={entry.user.id}
                        className={`flex items-center justify-between bg-gray-700 rounded-lg p-3 ${
                          isLeader ? 'border-2 border-yellow-500 shadow-lg shadow-yellow-500/30' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          {/* Position */}
                          {positionLabel && (
                            <span className="text-orange-400 font-bold-sport text-sm min-w-[30px]">
                              {positionLabel}
                            </span>
                          )}
                          {!positionLabel && (
                            <span className="text-gray-500 font-bold-sport text-sm min-w-[30px]">
                              {entry.position}e
                            </span>
                          )}
                          
                          {/* Avatar */}
                          {entry.user.avatar ? (
                            <img
                              src={entry.user.avatar}
                              alt={entry.user.pseudo || entry.user.firstName || 'Avatar'}
                              className="w-8 h-8 rounded-full border border-gray-600 object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white text-xs font-bold-sport">
                              {(entry.user.pseudo || entry.user.firstName || 'U')[0].toUpperCase()}
                            </div>
                          )}
                          
                          {/* Nom */}
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-300 font-bold-sport text-sm">
                                {entry.user.pseudo || entry.user.firstName || 'Utilisateur'}
                              </span>
                              {isLeader && (
                                <span className="text-yellow-500 text-xs" title="Leader du groupe">
                                  👑
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Points */}
                          <span className="text-orange-400 font-bold-sport text-sm">
                            {entry.totalPoints} pts
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-gray-500 text-sm text-center py-4">
                    Aucun classement disponible
                  </div>
                )}
              </div>
            </div>

            {/* Classement sticky Desktop uniquement */}
            {showTeamRanking && (
              <div className="hidden lg:block bg-gray-800 rounded-xl shadow-xl border border-gray-700 p-6 sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-sport text-2xl text-white">
                    {isCoupe ? 'Équipes en lice' : 'Classement'}
                  </h3>
                  <div className="flex items-center space-x-2">
                    {group?.ffvbSourceUrl && (
                      <a
                        href={group.ffvbSourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                        title="Voir sur FFVB"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                    <button
                      onClick={() => setShowTeamRanking(false)}
                      className="text-gray-400 hover:text-gray-300 transition-colors"
                      title="Fermer"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {isCoupe ? (
                  // Pour une coupe, afficher juste la liste des équipes encore en lice
                  <div className="space-y-2">
                    {teamRanking.length > 0 ? (
                      teamRanking.map((team: any) => (
                        <div key={team.name} className="bg-gray-700 rounded-lg p-3">
                          <span className="text-gray-300 font-bold-sport text-sm">{team.name}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-gray-500 text-sm text-center py-4">
                        Aucune équipe en lice pour le moment
                      </div>
                    )}
                  </div>
                ) : (
                  // Pour un championnat, afficher le classement complet
                  <div className="space-y-2">
                    {teamRanking.length > 0 ? (
                      <>
                        {/* En-tête du tableau */}
                        <div className="grid grid-cols-12 gap-2 text-xs text-gray-400 font-bold-sport mb-2 pb-2 border-b border-gray-700">
                          <div className="col-span-1">Pos</div>
                          <div className="col-span-7">Équipe</div>
                          <div className="col-span-2 text-center">Pts</div>
                          <div className="col-span-2 text-center">MJ</div>
                        </div>
                        
                        {/* Lignes du classement */}
                        {teamRanking.map((team: any) => (
                          <div key={team.name} className="bg-gray-700 rounded-lg p-2">
                            <div className="grid grid-cols-12 gap-2 items-center text-sm">
                              <div className="col-span-1 text-orange-400 font-bold-sport">
                                {team.position}
                              </div>
                              <div className="col-span-7 text-gray-300 font-bold-sport truncate">
                                {team.name}
                              </div>
                              <div className="col-span-2 text-orange-400 font-bold-sport text-center">
                                {team.points}
                              </div>
                              <div className="col-span-2 text-gray-400 font-bold-sport text-center">
                                {team.matchesPlayed}
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div className="text-gray-500 text-sm text-center py-4">
                        Aucun classement disponible pour le moment
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de confirmation - Quitter le groupe */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-yellow-500/50 p-4 sm:p-6 w-full max-w-md my-4">
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-red-500/50 p-4 sm:p-6 w-full max-w-md my-4">
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-blue-500/50 p-4 sm:p-6 w-full max-w-md my-4">
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

      {/* FAB (Floating Action Button) pour le classement - Mobile/Tablette uniquement */}
      {group?.ffvbSourceUrl && (
        <button
          onClick={() => setShowTeamRankingModal(true)}
          className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full shadow-2xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center justify-center z-40 hover:scale-110 active:scale-95"
          aria-label="Afficher le classement"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </button>
      )}

      {/* Modal pour le classement - Mobile/Tablette uniquement */}
      {showTeamRankingModal && (
        <div className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end z-50" onClick={() => setShowTeamRankingModal(false)}>
          <div className="w-full bg-gray-800 rounded-t-3xl shadow-2xl border-t-2 border-orange-500 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 flex justify-between items-center z-10">
              <h3 className="font-sport text-2xl text-white">
                {isCoupe ? 'Équipes en lice' : 'Classement'}
              </h3>
              <div className="flex items-center space-x-2">
                {group?.ffvbSourceUrl && (
                  <a
                    href={group.ffvbSourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 transition-colors p-2"
                    title="Voir sur FFVB"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
                <button
                  onClick={() => setShowTeamRankingModal(false)}
                  className="text-gray-400 hover:text-gray-300 transition-colors p-2"
                  aria-label="Fermer"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-4">
              {isCoupe ? (
                // Pour une coupe, afficher juste la liste des équipes encore en lice
                <div className="space-y-2">
                  {teamRanking.length > 0 ? (
                    teamRanking.map((team: any) => (
                      <div key={team.name} className="bg-gray-700 rounded-lg p-3">
                        <span className="text-gray-300 font-bold-sport text-sm">{team.name}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500 text-sm text-center py-4">
                      Aucune équipe en lice pour le moment
                    </div>
                  )}
                </div>
              ) : (
                // Pour un championnat, afficher le classement complet (cartes sur mobile)
                <div className="space-y-3">
                  {teamRanking.length > 0 ? (
                    teamRanking.map((team: any) => (
                      <div key={team.name} className="bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                              <span className="text-white font-bold-sport text-sm">{team.position}</span>
                            </div>
                            <span className="text-gray-300 font-bold-sport text-base truncate flex-1">
                              {team.name}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-gray-600">
                          <div className="flex items-center space-x-4">
                            <div>
                              <span className="text-gray-400 text-xs font-bold-sport">Points</span>
                              <p className="text-orange-400 font-bold-sport text-lg">{team.points}</p>
                            </div>
                            <div>
                              <span className="text-gray-400 text-xs font-bold-sport">Matchs</span>
                              <p className="text-gray-300 font-bold-sport text-lg">{team.matchesPlayed}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500 text-sm text-center py-4">
                      Aucun classement disponible pour le moment
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
