import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  startAt: string;
  status: string;
  isLocked: boolean;
}

interface SetScore {
  home: number;
  away: number;
}

interface Prediction {
  id: string;
  predictedHome: number;
  predictedAway: number;
  predictedSetScores?: SetScore[];
  pointsAwarded?: number;
  isRisky?: boolean;
}

interface RiskyCooldown {
  canUse: boolean;
  nextAvailableDate?: string;
}

export default function PredictPage() {
  const { groupId, matchId } = useParams<{ groupId: string; matchId: string }>();
  const navigate = useNavigate();
  
  const [match, setMatch] = useState<Match | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [predictedHome, setPredictedHome] = useState<number | ''>('');
  const [predictedAway, setPredictedAway] = useState<number | ''>('');
  const [predictedSetScores, setPredictedSetScores] = useState<SetScore[]>([]);
  const [setScoreInputs, setSetScoreInputs] = useState<Record<string, { home: string; away: string }>>({});
  const [predictionLoaded, setPredictionLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isRisky, setIsRisky] = useState(false);
  const [riskyCooldown, setRiskyCooldown] = useState<RiskyCooldown | null>(null);
  const [showDetailedScores, setShowDetailedScores] = useState(false);
  const [showRiskyModal, setShowRiskyModal] = useState(false);
  const [showBonusModal, setShowBonusModal] = useState(false);

  useEffect(() => {
    if (matchId) {
      setPredictionLoaded(false);
      setPrediction(null);
      setPredictedHome('');
      setPredictedAway('');
      setPredictedSetScores([]);
      setSetScoreInputs({});
      setShowDetailedScores(false);
      
      fetchMatchDetails();
      fetchPrediction();
      if (groupId) {
        fetchRiskyCooldown();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, groupId]);

  const fetchMatchDetails = async () => {
    try {
      const response = await api.get(`/matches/match/${matchId}`);
      setMatch(response.data.data);
      setLoading(false);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Erreur lors du chargement du match';
      setError(errorMessage);
      setLoading(false);
    }
  };

  const fetchPrediction = async () => {
    try {
      const response = await api.get(`/predictions?matchId=${matchId}`);
      
      if (response.data.data.length > 0) {
        const pred = response.data.data[0];
        setPrediction(pred);
        setPredictedHome(pred.predictedHome);
        setPredictedAway(pred.predictedAway);
        setIsRisky(pred.isRisky || false);
        
        if (pred.predictedSetScores && Array.isArray(pred.predictedSetScores) && pred.predictedSetScores.length > 0) {
          // Vérifier si au moins un score détaillé est rempli
          const hasFilledScores = pred.predictedSetScores.some((score: SetScore) => score.home !== 0 || score.away !== 0);
          if (hasFilledScores) {
            setPredictedSetScores(pred.predictedSetScores);
            setShowDetailedScores(true); // Afficher les scores détaillés si une prédiction existe
            const inputs: Record<string, { home: string; away: string }> = {};
            pred.predictedSetScores.forEach((score: SetScore, idx: number) => {
              inputs[`set_${idx}`] = {
                home: score.home === 0 ? '' : String(score.home),
                away: score.away === 0 ? '' : String(score.away)
              };
            });
            setSetScoreInputs(inputs);
          } else {
            setPredictedSetScores([]);
            setSetScoreInputs({});
            setShowDetailedScores(false);
          }
        } else {
          setPredictedSetScores([]);
          setSetScoreInputs({});
          setShowDetailedScores(false);
        }
        setPredictionLoaded(true);
      } else {
        setPrediction(null);
        setPredictedHome('');
        setPredictedAway('');
        setPredictedSetScores([]);
        setSetScoreInputs({});
        setIsRisky(false);
        setPredictionLoaded(true);
      }
    } catch (err: any) {
      setPrediction(null);
      setPredictedHome('');
      setPredictedAway('');
      setPredictedSetScores([]);
      setSetScoreInputs({});
      setIsRisky(false);
      setPredictionLoaded(true);
    }
  };

  const fetchRiskyCooldown = async () => {
    if (!groupId) return;
    try {
      const response = await api.get(`/predictions/risky-cooldown/${groupId}`);
      setRiskyCooldown(response.data.data);
    } catch (err: any) {
      // Erreur silencieuse, on assume que le mode risqué est disponible
      setRiskyCooldown({ canUse: true });
    }
  };

  useEffect(() => {
    if (!predictionLoaded) return;
    
    const home = typeof predictedHome === 'number' ? predictedHome : 0;
    const away = typeof predictedAway === 'number' ? predictedAway : 0;
    // Le nombre total de sets est simplement la somme des sets gagnés par chaque équipe
    const totalSets = home + away;
    
    if (prediction) {
      // Si on a une prédiction existante, mettre à jour les inputs seulement si les scores détaillés sont affichés
      if (showDetailedScores && predictedSetScores.length > 0) {
        if (predictedSetScores.length === totalSets) {
          const currentInputs = setScoreInputs;
          let needsUpdate = false;
          const inputs: Record<string, { home: string; away: string }> = {};
          
          predictedSetScores.forEach((score: SetScore, idx: number) => {
            const key = `set_${idx}`;
            const existingInput = currentInputs[key];
            const expectedHome = score.home === 0 ? '' : String(score.home);
            const expectedAway = score.away === 0 ? '' : String(score.away);
            
            if (!existingInput || existingInput.home !== expectedHome || existingInput.away !== expectedAway) {
              needsUpdate = true;
              inputs[key] = {
                home: expectedHome,
                away: expectedAway
              };
            } else {
              inputs[key] = existingInput;
            }
          });
          
          if (needsUpdate || Object.keys(currentInputs).length === 0) {
            setSetScoreInputs(inputs);
          }
        }
      }
      return;
    }
    
    // Ne pas initialiser automatiquement les scores détaillés
    // Ils seront initialisés seulement si l'utilisateur clique sur "Afficher les scores détaillés"
    if (home === 0 && away === 0 && !prediction) {
      setPredictedSetScores([]);
      setSetScoreInputs({});
      setShowDetailedScores(false);
    }
    // Si les scores détaillés sont affichés et que le nombre de sets change, ajuster
    else if (showDetailedScores && totalSets > 0 && totalSets <= 5 && (home > 0 || away > 0)) {
      const newScores: SetScore[] = [];
      const newInputs: Record<string, { home: string; away: string }> = {};
      
      for (let i = 0; i < totalSets; i++) {
        if (predictedSetScores[i]) {
          newScores.push(predictedSetScores[i]);
          if (!setScoreInputs[`set_${i}`]) {
            newInputs[`set_${i}`] = {
              home: predictedSetScores[i].home === 0 ? '' : String(predictedSetScores[i].home),
              away: predictedSetScores[i].away === 0 ? '' : String(predictedSetScores[i].away)
            };
          }
        } else {
          newScores.push({ home: 0, away: 0 });
          if (!setScoreInputs[`set_${i}`]) {
            newInputs[`set_${i}`] = { home: '', away: '' };
          }
        }
      }
      
      if (newScores.length !== predictedSetScores.length) {
        setPredictedSetScores(newScores);
        if (Object.keys(newInputs).length > 0) {
          setSetScoreInputs(prev => ({ ...prev, ...newInputs }));
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [predictedHome, predictedAway, predictionLoaded]);

  const validateBeforeSubmit = (): boolean => {
    const home = typeof predictedHome === 'number' ? predictedHome : 0;
    const away = typeof predictedAway === 'number' ? predictedAway : 0;

    if (home === 0 && away === 0) {
      setError('Vous devez prédire au moins un gagnant');
      return false;
    }

    if (home + away > 5) {
      setError('Le nombre total de sets ne peut pas dépasser 5');
      return false;
    }

    if (home < 0 || home > 3 || away < 0 || away > 3) {
      setError('Chaque équipe ne peut gagner que 0 à 3 sets');
      return false;
    }

    if (home === away) {
      setError('Il ne peut pas y avoir d\'égalité (un vainqueur doit être désigné)');
      return false;
    }

    if (Math.max(home, away) < 3) {
      setError('Une équipe doit gagner au moins 3 sets pour gagner le match');
      return false;
    }

    if (Math.max(home, away) > 3 && home + away > 5) {
      setError('Un match ne peut pas dépasser 5 sets');
      return false;
    }

    // Valider les scores détaillés seulement s'ils sont affichés et remplis
    if (showDetailedScores && predictedSetScores.length > 0) {
      // Vérifier si au moins un score détaillé est rempli (pas tous à 0-0)
      const hasFilledScores = predictedSetScores.some(score => score.home !== 0 || score.away !== 0);
      if (hasFilledScores) {
        const setErrorMsg = validateSetScores(home, away, predictedSetScores);
        if (setErrorMsg) {
          setError(setErrorMsg);
          return false;
        }
      }
    }

    return true;
  };

  const validateSetScores = (home: number, away: number, setScores: SetScore[]): string | null => {
    if (setScores.length === 0) return null;

    let homeSetsWon = 0;
    let awaySetsWon = 0;
    // Le nombre total de sets est simplement la somme des sets gagnés par chaque équipe
    const totalSets = home + away;

    // Vérifier que le match se termine dès qu'une équipe gagne 3 sets
    for (let i = 0; i < setScores.length; i++) {
      const setScore = setScores[i];
      
      if (setScore.home === 0 && setScore.away === 0) {
        // Si on a déjà atteint le nombre de sets nécessaires, on ne doit pas avoir de sets vides après
        if (homeSetsWon === 3 || awaySetsWon === 3) {
          return `Le match est terminé après ${i} set(s) car une équipe a déjà gagné 3 sets. Il ne doit pas y avoir de sets supplémentaires.`;
        }
        continue;
      }

      if (setScore.home === setScore.away) {
        return `Le set ${i + 1} ne peut pas avoir un score égal (${setScore.home}-${setScore.away})`;
      }

      const minScore = Math.min(setScore.home, setScore.away);
      const maxScore = Math.max(setScore.home, setScore.away);
      const isFifthSet = i === 4; // Le 5e set (index 4)
      const minPointsRequired = isFifthSet ? 15 : 25; // 15 points pour le 5e set, 25 pour les autres
      
      if (minScore < minPointsRequired && maxScore < minPointsRequired) {
        return `Le set ${i + 1} doit avoir au moins ${minPointsRequired} points pour un gagnant${isFifthSet ? ' (15 points pour le 5e set)' : ''}`;
      }

      // Vérifier l'écart de 2 points
      if (maxScore >= minPointsRequired && maxScore - minScore < 2) {
        return `Le set ${i + 1} doit avoir un écart de 2 points minimum (${setScore.home}-${setScore.away} n'est pas valide)`;
      }

      // Vérifier si le match est déjà terminé avant ce set
      if (homeSetsWon === 3 || awaySetsWon === 3) {
        return `Le match est terminé après ${i} set(s) car une équipe a déjà gagné 3 sets. Le set ${i + 1} ne peut pas être joué.`;
      }

      if (setScore.home > setScore.away) {
        homeSetsWon++;
      } else {
        awaySetsWon++;
      }

      // Vérifier que le match se termine dès qu'une équipe gagne 3 sets
      if (homeSetsWon === 3 || awaySetsWon === 3) {
        // Vérifier qu'il n'y a pas de sets supplémentaires après
        for (let j = i + 1; j < setScores.length; j++) {
          const nextSetScore = setScores[j];
          if (nextSetScore.home !== 0 || nextSetScore.away !== 0) {
            return `Le match est terminé après ${i + 1} set(s) car une équipe a gagné 3 sets. Le set ${j + 1} ne peut pas être joué.`;
          }
        }
        break; // Le match est terminé, on arrête la vérification
      }
    }

    // Vérifier que le nombre total de sets correspond au score final
    if (homeSetsWon !== home || awaySetsWon !== away) {
      return `Les scores de sets ne correspondent pas au nombre de sets gagnés annoncé (${home}-${away}). Dans les scores détaillés, ${match?.homeTeam} a gagné ${homeSetsWon} set(s) et ${match?.awayTeam} a gagné ${awaySetsWon} set(s).`;
    }

    // Vérifier que le nombre de sets remplis correspond au score final
    const filledSets = setScores.filter(s => s.home !== 0 || s.away !== 0).length;
    if (filledSets !== totalSets) {
      return `Le score final ${home}-${away} nécessite exactement ${totalSets} set(s) joué(s), mais vous avez rempli ${filledSets} set(s).`;
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateBeforeSubmit()) {
      return;
    }

    // Afficher la modale de confirmation
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
    setSubmitting(true);
    setError('');

    try {
      const home = typeof predictedHome === 'number' ? predictedHome : 0;
      const away = typeof predictedAway === 'number' ? predictedAway : 0;

      // N'envoyer les scores détaillés que s'ils sont affichés et remplis
      let filteredSetScores: SetScore[] | undefined = undefined;
      if (showDetailedScores && predictedSetScores.length > 0) {
        const filledScores = predictedSetScores.filter(score => score.home !== 0 || score.away !== 0);
        if (filledScores.length > 0) {
          filteredSetScores = filledScores;
        }
      }

      const payload = {
        predictedHome: home,
        predictedAway: away,
        predictedSetScores: filteredSetScores,
        isRisky: isRisky
      };

      await api.post(`/predictions/${matchId}`, payload);
      
      // Afficher la modale de succès
      setShowSuccessModal(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la sauvegarde du pronostic');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoToGroups = () => {
    navigate('/groups');
  };

  const handleMakeAnotherPrediction = () => {
    setShowSuccessModal(false);
    navigate(`/groups/${groupId}`);
  };

  const updateSetScore = (index: number, field: 'home' | 'away', value: string) => {
    const newInputs = { ...setScoreInputs };
    if (!newInputs[`set_${index}`]) {
      newInputs[`set_${index}`] = { home: '', away: '' };
    }
    newInputs[`set_${index}`][field] = value;
    setSetScoreInputs(newInputs);

    const newScores = [...predictedSetScores];
    const numValue = value === '' ? 0 : parseInt(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 50) {
      newScores[index] = {
        ...newScores[index],
        [field]: numValue
      };
      setPredictedSetScores(newScores);
    } else if (value === '') {
      newScores[index] = {
        ...newScores[index],
        [field]: 0
      };
      setPredictedSetScores(newScores);
    }
  };

  const swapSetScores = (index: number) => {
    const newInputs = { ...setScoreInputs };
    if (!newInputs[`set_${index}`]) {
      newInputs[`set_${index}`] = { home: '', away: '' };
    }
    
    // Inverser les valeurs dans les inputs
    const tempHome = newInputs[`set_${index}`].home;
    const tempAway = newInputs[`set_${index}`].away;
    newInputs[`set_${index}`].home = tempAway;
    newInputs[`set_${index}`].away = tempHome;
    setSetScoreInputs(newInputs);

    // Inverser les valeurs dans les scores
    const newScores = [...predictedSetScores];
    if (newScores[index]) {
      const tempHomeScore = newScores[index].home;
      const tempAwayScore = newScores[index].away;
      newScores[index] = {
        home: tempAwayScore,
        away: tempHomeScore
      };
      setPredictedSetScores(newScores);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-orange-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-300 font-bold-sport text-xl">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <p className="text-red-500 mb-4 font-bold-sport text-xl">Match non trouvé</p>
          <Link to={`/groups/${groupId}`} className="text-orange-500 hover:text-orange-400 font-bold-sport">
            Retour au groupe
          </Link>
        </div>
      </div>
    );
  }

  if (match.isLocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center max-w-md">
          <div className="bg-red-900/50 border border-red-500 text-red-300 px-6 py-4 rounded-lg mb-4 font-bold-sport">
            Ce match est verrouillé. Les pronostics ne peuvent plus être modifiés.
          </div>
          <Link to={`/groups/${groupId}`} className="text-orange-500 hover:text-orange-400 font-bold-sport">
            Retour au groupe
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link to={`/groups/${groupId}`} className="text-orange-500 hover:text-orange-400 mb-4 inline-block font-bold-sport text-sm transition-colors">
            ← Retour au groupe
          </Link>
          <h1 className="font-sport text-4xl text-white mb-2">Faire un Pronostic</h1>
          <p className="text-gray-400">{formatDate(match.startAt)}</p>
        </div>

        <div className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 p-4 sm:p-6">
          {/* Header du match */}
          <div className="mb-6 pb-6 border-b border-gray-700">
            <h2 className="font-team text-xl sm:text-2xl lg:text-3xl text-white text-center mb-2">
              <span className="text-orange-400 break-words">{match.homeTeam}</span>
              <span className="mx-2 sm:mx-4 text-gray-500">VS</span>
              <span className="text-orange-400 break-words">{match.awayTeam}</span>
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Score final */}
            <div>
              <label className="block text-sm font-bold-sport text-gray-300 mb-4">
                Sets gagnés (résultat final)
              </label>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
                <div className="w-full sm:flex-1">
                  <label className="block text-xs text-gray-400 mb-2 font-bold-sport text-center">
                    <span className="text-orange-400 font-bold">A</span> - {match.homeTeam}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="3"
                    value={predictedHome === '' ? '' : predictedHome}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setPredictedHome('');
                      } else {
                        const num = parseInt(val);
                        if (!isNaN(num) && num >= 0 && num <= 3) {
                          setPredictedHome(num);
                        }
                      }
                    }}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-white text-center text-xl sm:text-2xl font-bold-sport"
                    required
                  />
                </div>
                <div className="text-3xl sm:text-4xl font-sport text-orange-500">-</div>
                <div className="w-full sm:flex-1">
                  <label className="block text-xs text-gray-400 mb-2 font-bold-sport text-center">
                    <span className="text-orange-400 font-bold">B</span> - {match.awayTeam}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="3"
                    value={predictedAway === '' ? '' : predictedAway}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setPredictedAway('');
                      } else {
                        const num = parseInt(val);
                        if (!isNaN(num) && num >= 0 && num <= 3) {
                          setPredictedAway(num);
                        }
                      }
                    }}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-white text-center text-xl sm:text-2xl font-bold-sport"
                    required
                  />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-3 text-center font-bold-sport">
                Prédisez le nombre de sets gagnés par chaque équipe (0 à 3)
              </p>
            </div>

            {/* Mode risqué */}
            <div className="bg-gray-700 rounded-lg border border-gray-600 p-4">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="risky-mode"
                  checked={isRisky}
                  onChange={(e) => {
                    // Permettre de décocher le mode risqué même si le cooldown n'est pas disponible
                    // (car c'est une modification d'un pronostic existant)
                    if (e.target.checked && !riskyCooldown?.canUse && !prediction?.isRisky) {
                      setError('Le mode risqué est en cooldown. Vous ne pouvez pas l\'utiliser pour le moment.');
                      return;
                    }
                    setIsRisky(e.target.checked);
                    setError('');
                  }}
                  // Désactiver seulement si on essaie de cocher le mode risqué alors que le cooldown n'est pas disponible
                  // ET que ce n'est pas une modification d'un pronostic qui avait déjà le mode risqué
                  disabled={!riskyCooldown?.canUse && !isRisky && !prediction?.isRisky}
                  className="mt-1 w-5 h-5 text-orange-500 bg-gray-700 border-gray-600 rounded focus:ring-orange-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <div className="flex-1">
                  <label htmlFor="risky-mode" className="block text-sm font-bold-sport text-white cursor-pointer">
                    <span className="text-orange-400 font-sport text-lg">⚡ Mode Risqué</span>
                    <span 
                      className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 text-xs font-bold cursor-pointer hover:bg-orange-500/30 transition-colors"
                      title="Plus d'information"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowRiskyModal(true);
                      }}
                    >?</span>
                  </label>
                  <div className="mt-2 space-y-1 text-xs text-gray-300 font-bold-sport">
                    <p>• Si sets gagnés exacts + tous scores par set exacts : (sets + bonus) × 2</p>
                    <p>• Si sets gagnés exacts mais scores par set différents : (sets × 2) + bonus</p>
                    <p>• Si vainqueur OK mais sets gagnés incorrects : 0 + bonus</p>
                    <p>• Si vainqueur incorrect : <span className="text-red-400">-2</span> + bonus</p>
                    <p className="text-gray-500">• Utilisable 1 fois par semaine par groupe</p>
                  </div>
                  {riskyCooldown && !riskyCooldown.canUse && riskyCooldown.nextAvailableDate && (
                    <div className="mt-3 p-3 bg-yellow-900/30 border border-yellow-600 rounded-lg">
                      <p className="text-yellow-400 text-sm font-bold-sport">
                        ⏱️ Mode risqué en cooldown
                      </p>
                      <p className="text-yellow-300 text-xs mt-1">
                        Disponible le : {new Date(riskyCooldown.nextAvailableDate).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                      <p className="text-yellow-400 text-xs mt-1">
                        {Math.ceil((new Date(riskyCooldown.nextAvailableDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} jour(s) restant(s)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section BONUS - Scores par set */}
            <div className="mb-6">
              <div className="flex items-center justify-center space-x-2 mb-3">
                <span className="text-green-400 font-bold-sport text-lg">BONUS</span>
                <span 
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500/20 text-green-400 text-xs font-bold cursor-pointer hover:bg-green-500/30 transition-colors"
                  title="Plus d'information"
                  onClick={() => setShowBonusModal(true)}
                >?</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDetailedScores(!showDetailedScores);
                  // Initialiser les scores détaillés si on les affiche pour la première fois
                  if (!showDetailedScores && predictedSetScores.length === 0 && predictedHome !== '' && predictedAway !== '') {
                    const home = typeof predictedHome === 'number' ? predictedHome : 0;
                    const away = typeof predictedAway === 'number' ? predictedAway : 0;
                    // Le nombre total de sets est simplement la somme des sets gagnés par chaque équipe
                    const totalSets = home + away;
                    const newScores: SetScore[] = Array(totalSets).fill(null).map(() => ({ home: 0, away: 0 }));
                    setPredictedSetScores(newScores);
                    const inputs: Record<string, { home: string; away: string }> = {};
                    newScores.forEach((_, idx) => {
                      inputs[`set_${idx}`] = { home: '', away: '' };
                    });
                    setSetScoreInputs(inputs);
                  }
                }}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-bold-sport shadow-lg shadow-blue-500/30 transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <span>{showDetailedScores ? 'Masquer' : 'Afficher'} les scores par set</span>
                {showDetailedScores ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>
              <p className="mt-2 text-xs text-gray-500 text-center">
                {showDetailedScores ? 'Bonus +1 pt par score exact (set 1 avec set 1, set 2 avec set 2, etc.)' : 'Cliquez pour prédire les scores par set (optionnel)'}
              </p>
            </div>

            {/* Scores par set - Cases blanches */}
            {showDetailedScores && predictedSetScores.length > 0 && (() => {
              const home = typeof predictedHome === 'number' ? predictedHome : 0;
              const away = typeof predictedAway === 'number' ? predictedAway : 0;
              // Le nombre total de sets est simplement la somme des sets gagnés par chaque équipe
              const totalSets = home + away;
              // N'afficher que le nombre de sets correspondant au pronostic
              const displayedSets = predictedSetScores.slice(0, totalSets);
              
              return (
                <div>
                  <label className="block text-sm font-bold-sport text-gray-300 mb-3">
                    Scores par set - Bonus +1 pt par score exact
                  </label>
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
                  <div className={`grid gap-2 sm:gap-3 ${totalSets === 3 ? 'grid-cols-1 sm:grid-cols-3' : totalSets === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-5'}`}>
                    {displayedSets.map((setScore, index) => {
                      const isFifthSet = index === 4;
                      return (
                        <div key={index} className="bg-white rounded-lg p-3 shadow-lg relative">
                          <div className="text-xs text-gray-500 mb-2 font-bold-sport text-center">
                            SET {index + 1}
                            {isFifthSet && (
                              <span className="block text-orange-600 text-xs mt-1 font-bold">(15 pts)</span>
                            )}
                          </div>
                          <div className="space-y-2 relative">
                            {/* Identifiant A aligné avec le score du haut */}
                            <div className="relative">
                              <span className="absolute -left-6 sm:-left-7 top-1/2 -translate-y-1/2 text-orange-400 font-bold text-xs bg-gray-800 rounded-full w-5 h-5 flex items-center justify-center">A</span>
                              <input
                                type="number"
                                min="0"
                                max="50"
                                value={setScoreInputs[`set_${index}`]?.home ?? (setScore.home === 0 ? '' : String(setScore.home))}
                                onChange={(e) => updateSetScore(index, 'home', e.target.value)}
                                placeholder="0"
                                className="w-full px-2 py-2 bg-white border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-black text-center font-bold-sport text-sm"
                              />
                            </div>
                            <div className="flex items-center justify-center py-1">
                              <button
                                type="button"
                                onClick={() => swapSetScores(index)}
                                className="text-orange-500 hover:text-orange-600 transition-colors cursor-pointer flex items-center justify-center"
                                title="Inverser les scores"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                </svg>
                              </button>
                            </div>
                            {/* Identifiant B aligné avec le score du bas */}
                            <div className="relative">
                              <span className="absolute -left-6 sm:-left-7 top-1/2 -translate-y-1/2 text-orange-400 font-bold text-xs bg-gray-800 rounded-full w-5 h-5 flex items-center justify-center">B</span>
                              <input
                                type="number"
                                min="0"
                                max="50"
                                value={setScoreInputs[`set_${index}`]?.away ?? (setScore.away === 0 ? '' : String(setScore.away))}
                                onChange={(e) => updateSetScore(index, 'away', e.target.value)}
                                placeholder="0"
                                className="w-full px-2 py-2 bg-white border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-black text-center font-bold-sport text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {error && (
              <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded-lg font-bold-sport">
                {error}
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
              <Link
                to={`/groups/${groupId}`}
                className="px-6 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 font-bold-sport transition-colors"
              >
                Annuler
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 font-bold-sport shadow-lg shadow-orange-500/30 transition-all duration-200"
              >
                {submitting ? 'Sauvegarde...' : (prediction ? 'Modifier le pronostic' : 'Sauvegarder le pronostic')}
              </button>
            </div>
          </form>

          {prediction && (
            <div className="mt-6 p-4 bg-gray-700 rounded-lg border border-gray-600">
              <h3 className="text-sm font-bold-sport text-orange-400 mb-2">Votre pronostic actuel:</h3>
                <p className="text-white font-team text-lg">
                  <span className="text-orange-400 font-bold mr-1">A</span>
                  - {match.homeTeam} {prediction.predictedHome} - {prediction.predictedAway} <span className="text-orange-400 font-bold ml-1">B</span> - {match.awayTeam}
                </p>
              {prediction.pointsAwarded !== undefined && (
                <p className={`text-sm mt-2 font-bold-sport ${
                  prediction.pointsAwarded > 0 
                    ? 'text-green-400' 
                    : prediction.pointsAwarded < 0 
                    ? 'text-red-400' 
                    : 'text-gray-400'
                }`}>
                  Points obtenus: {String(prediction.pointsAwarded ?? 0)} pts
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modale de confirmation */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border-2 border-orange-500 shadow-2xl max-w-md w-full p-4 sm:p-6 my-4">
            <h2 className="text-2xl font-bold-sport text-orange-400 mb-4">Confirmer votre pronostic</h2>
            <p className="text-gray-300 mb-6">
              Voulez-vous vraiment enregistrer ce pronostic ?
            </p>
            
            {/* Récapitulatif */}
            <div className="bg-gray-700 rounded-lg p-4 mb-6 border border-gray-600">
              <div className="mb-4">
                <p className="text-sm text-gray-400 font-bold-sport mb-2">Match</p>
                <p className="text-white font-team text-lg">
                  {match?.homeTeam} <span className="text-orange-400">VS</span> {match?.awayTeam}
                </p>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-400 font-bold-sport mb-2">Sets gagnés prédits</p>
                <p className="text-white font-bold-sport text-xl">
                  <span className="text-orange-400 font-bold mr-1">A</span>
                  - {match?.homeTeam} <span className="text-orange-400">{typeof predictedHome === 'number' ? predictedHome : 0}</span> - 
                  <span className="text-orange-400"> {typeof predictedAway === 'number' ? predictedAway : 0}</span> <span className="text-orange-400 font-bold ml-1">B</span> - {match?.awayTeam}
                </p>
              </div>

              {predictedSetScores.filter(s => s.home !== 0 || s.away !== 0).length > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-gray-400 font-bold-sport mb-2">Scores par set prédits</p>
                  <div className="space-y-2">
                    {predictedSetScores.filter(s => s.home !== 0 || s.away !== 0).map((score, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-800 rounded px-3 py-2">
                        <span className="text-gray-300 text-sm font-bold-sport">Set {idx + 1}</span>
                        <span className="text-white font-bold-sport">
                          <span className="text-orange-400 text-xs mr-1">A</span>
                          - {score.home} - {score.away} <span className="text-orange-400 text-xs ml-1">B</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isRisky && (
                <div className="mt-4 pt-4 border-t border-gray-600">
                  <p className="text-sm text-orange-400 font-bold-sport mb-2">⚡ Mode Risqué Activé</p>
                  <p className="text-xs text-yellow-300 font-bold-sport">
                    Vos points seront <span className="text-green-400">doublés</span> si correct, ou <span className="text-red-400">-2 points</span> si incorrect
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-6 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 font-bold-sport transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmSubmit}
                disabled={submitting}
                className="px-6 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 font-bold-sport shadow-lg shadow-orange-500/30 transition-all duration-200"
              >
                {submitting ? 'Enregistrement...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale de succès */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border-2 border-green-500 shadow-2xl max-w-md w-full p-4 sm:p-6 my-4">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-full mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold-sport text-green-400 mb-2">Pronostic effectué !</h2>
              <p className="text-gray-300">
                Votre pronostic a été enregistré avec succès.
              </p>
            </div>

            <div className="flex flex-col space-y-3">
              <button
                onClick={handleMakeAnotherPrediction}
                className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 font-bold-sport shadow-lg shadow-orange-500/30 transition-all duration-200"
              >
                Faire un autre pronostic
              </button>
              <button
                onClick={handleGoToGroups}
                className="w-full px-6 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 font-bold-sport transition-colors"
              >
                Voir mes groupes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pour les explications du Mode Risqué */}
      {showRiskyModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowRiskyModal(false)}>
          <div className="bg-gray-800 rounded-2xl shadow-2xl border-2 border-orange-500 max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 flex justify-between items-center z-10 rounded-t-2xl">
              <h3 className="font-sport text-2xl text-orange-400">⚡ Mode Risqué - Règles</h3>
              <button
                onClick={() => setShowRiskyModal(false)}
                className="text-gray-400 hover:text-gray-300 transition-colors p-2"
                aria-label="Fermer"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-white font-bold-sport mb-4">Si les sets gagnés sont exacts :</p>
              <ul className="text-sm text-gray-300 space-y-2 mb-6 ml-4">
                <li>• <span className="text-orange-400">TOUT exact</span> (sets gagnés + tous les scores par set) : <span className="text-green-400">(3 + bonus) × 2</span></li>
                <li>• <span className="text-yellow-400">Scores par set différents</span> : <span className="text-green-400">(3 × 2) + bonus</span></li>
              </ul>
              
              <p className="text-sm text-white font-bold-sport mb-4">Si les sets gagnés sont incorrects :</p>
              <ul className="text-sm text-gray-300 space-y-2 mb-6 ml-4">
                <li>• Vainqueur correct : <span className="text-yellow-400">0 pts</span> + bonus scores</li>
                <li>• Vainqueur incorrect : <span className="text-red-400">-2 pts</span> + bonus scores</li>
              </ul>
              
              <p className="text-sm text-gray-400 italic border-t border-gray-700 pt-4 mb-6">
                💡 Le bonus (+1 pt par score exact) rentre dans la multiplication <span className="text-orange-400">SEULEMENT</span> si TOUT est parfait !
              </p>
              
              <p className="text-sm text-orange-400 mb-3 font-bold">Exemples :</p>
              <div className="text-sm text-gray-300 space-y-2 bg-gray-700/50 rounded-lg p-4">
                <p>• 3-0 exact + scores par set exacts = (3+3)×2 = <span className="text-green-400">12 pts</span></p>
                <p>• 3-0 exact + 1 score par set différent = (3×2)+2 = <span className="text-green-400">8 pts</span></p>
                <p>• 3-0 exact sans scores par set = 3×2 = <span className="text-green-400">6 pts</span></p>
                <p>• 3-1 (vainqueur OK) = 0 + bonus = <span className="text-yellow-400">2 pts</span></p>
                <p>• 2-3 (vainqueur faux) = -2 + bonus = <span className="text-red-400">-1 pt</span></p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal pour les explications du BONUS */}
      {showBonusModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowBonusModal(false)}>
          <div className="bg-gray-800 rounded-2xl shadow-2xl border-2 border-green-500 max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 flex justify-between items-center z-10 rounded-t-2xl">
              <h3 className="font-sport text-2xl text-green-400">💎 BONUS - Scores par set</h3>
              <button
                onClick={() => setShowBonusModal(false)}
                className="text-gray-400 hover:text-gray-300 transition-colors p-2"
                aria-label="Fermer"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-white font-bold-sport mb-4">
                Les <span className="text-green-400">scores par set</span> sont les points marqués dans chaque set (ex: 25-23, 30-28).
              </p>
              
              <p className="text-sm text-white font-bold-sport mb-4">
                Le bonus fonctionne ainsi :
              </p>
              <ul className="text-sm text-gray-300 space-y-2 mb-6 ml-4">
                <li>• <span className="text-green-400">+1 point</span> pour chaque score par set exact</li>
                <li>• Comparaison : <span className="text-orange-400">Set 1 prédit</span> vs <span className="text-orange-400">Set 1 réel</span></li>
                <li>• Comparaison : <span className="text-orange-400">Set 2 prédit</span> vs <span className="text-orange-400">Set 2 réel</span></li>
                <li>• Et ainsi de suite...</li>
              </ul>
              
              <p className="text-sm text-orange-400 mb-3 font-bold">Exemples :</p>
              <div className="text-sm text-gray-300 space-y-3 bg-gray-700/50 rounded-lg p-4 mb-4">
                <div>
                  <p className="font-bold text-white mb-1">Exemple 1 : Tout exact</p>
                  <p className="text-xs">Vous prédisez : Set 1 (25-23), Set 2 (30-28), Set 3 (25-18)</p>
                  <p className="text-xs">Résultat réel : Set 1 (25-23), Set 2 (30-28), Set 3 (25-18)</p>
                  <p className="text-green-400 font-bold mt-1">→ Bonus : +3 points (3 scores exacts)</p>
                </div>
                <div>
                  <p className="font-bold text-white mb-1">Exemple 2 : Partiellement exact</p>
                  <p className="text-xs">Vous prédisez : Set 1 (25-23), Set 2 (30-28), Set 3 (25-18)</p>
                  <p className="text-xs">Résultat réel : Set 1 (25-23), Set 2 (28-30), Set 3 (25-18)</p>
                  <p className="text-green-400 font-bold mt-1">→ Bonus : +2 points (2 scores exacts sur 3)</p>
                </div>
                <div>
                  <p className="font-bold text-white mb-1">Exemple 3 : Aucun exact</p>
                  <p className="text-xs">Vous prédisez : Set 1 (25-23), Set 2 (30-28), Set 3 (25-18)</p>
                  <p className="text-xs">Résultat réel : Set 1 (23-25), Set 2 (28-30), Set 3 (18-25)</p>
                  <p className="text-gray-400 font-bold mt-1">→ Bonus : 0 point (aucun score exact)</p>
                </div>
              </div>
              
              <p className="text-sm text-gray-400 italic border-t border-gray-700 pt-4">
                💡 Le bonus s'ajoute aux points obtenus pour les sets gagnés, même si les sets gagnés ne sont pas exacts !
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
