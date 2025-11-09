import { prisma } from '../db/prisma';

export interface SetScore {
  home: number;
  away: number;
}

export interface CreatePredictionData {
  userId: string;
  matchId: string;
  predictedHome: number;
  predictedAway: number;
  predictedSetScores?: SetScore[]; // Scores détaillés par set (optionnel)
  isRisky?: boolean; // Mode risqué : double les points si correct, -2 pts si incorrect
}

export interface UpdatePredictionData {
  predictedHome: number;
  predictedAway: number;
  predictedSetScores?: SetScore[]; // Scores détaillés par set (optionnel)
  isRisky?: boolean; // Mode risqué
}

export class PredictionsService {
  /**
   * Valide que les scores de sets correspondent au nombre de sets gagnés annoncé
   */
  private validateSetScores(
    predictedHome: number,
    predictedAway: number,
    setScores: SetScore[],
    match: { homeTeam: string; awayTeam: string }
  ): string | null {
    // Compter les sets gagnés par chaque équipe dans les scores détaillés
    let homeSetsWon = 0;
    let awaySetsWon = 0;
    // Le nombre total de sets est simplement la somme des sets gagnés par chaque équipe
    const totalSets = predictedHome + predictedAway;

    // Vérifier que le match se termine dès qu'une équipe gagne 3 sets
    for (let i = 0; i < setScores.length; i++) {
      const setScore = setScores[i];
      
      if (setScore.home === 0 && setScore.away === 0) {
        // Si on a déjà atteint le nombre de sets nécessaires, on ne doit pas avoir de sets vides après
        if (homeSetsWon === 3 || awaySetsWon === 3) {
          return `Le match est terminé après ${i} set(s) car une équipe a déjà gagné 3 sets. Il ne doit pas y avoir de sets supplémentaires.`;
        }
        continue; // Ignorer les sets non remplis (0-0) avant la fin du match
      }

      // Vérifier qu'un set a un gagnant (pas d'égalité possible en volley)
      if (setScore.home === setScore.away) {
        return `Le set ${i + 1} ne peut pas avoir un score égal (${setScore.home}-${setScore.away})`;
      }

      // Vérifier que le score est valide
      // Les sets 1-4 : au moins 25 points pour gagner, avec écart de 2 points
      // Le set 5 : au moins 15 points pour gagner, avec écart de 2 points
      const minScore = Math.min(setScore.home, setScore.away);
      const maxScore = Math.max(setScore.home, setScore.away);
      const isFifthSet = i === 4; // Le 5e set (index 4)
      const minPointsRequired = isFifthSet ? 15 : 25; // 15 points pour le 5e set, 25 pour les autres
      
      if (minScore < minPointsRequired && maxScore < minPointsRequired) {
        return `Le set ${i + 1} doit avoir au moins ${minPointsRequired} points pour un gagnant${isFifthSet ? ' (15 points pour le 5e set)' : ''}`;
      }

      // Vérifier l'écart de 2 points : si le gagnant a le minimum requis ou plus, il faut 2 points d'écart
      if (maxScore >= minPointsRequired && maxScore - minScore < 2) {
        return `Le set ${i + 1} doit avoir un écart de 2 points minimum (${setScore.home}-${setScore.away} n'est pas valide)`;
      }

      // Vérifier si le match est déjà terminé avant ce set
      if (homeSetsWon === 3 || awaySetsWon === 3) {
        return `Le match est terminé après ${i} set(s) car une équipe a déjà gagné 3 sets. Le set ${i + 1} ne peut pas être joué.`;
      }

      // Compter le gagnant du set
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

    // Vérifier que le nombre de sets gagnés correspond au score annoncé
    if (homeSetsWon !== predictedHome || awaySetsWon !== predictedAway) {
      return `Les scores de sets ne correspondent pas au nombre de sets gagnés annoncé (${predictedHome}-${predictedAway}). Dans les scores détaillés, ${match.homeTeam} a gagné ${homeSetsWon} set(s) et ${match.awayTeam} a gagné ${awaySetsWon} set(s).`;
    }

    // Vérifier que le nombre de sets remplis correspond au score final
    const filledSets = setScores.filter(s => s.home !== 0 || s.away !== 0).length;
    if (filledSets !== totalSets) {
      return `Le score final ${predictedHome}-${predictedAway} nécessite exactement ${totalSets} set(s) joué(s), mais vous avez rempli ${filledSets} set(s).`;
    }

    return null; // Validation OK
  }

  async createOrUpdatePrediction(data: CreatePredictionData) {
    const { userId, matchId, predictedHome, predictedAway, predictedSetScores, isRisky } = data;

    // Vérifier que le match existe et n'est pas verrouillé
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        group: true
      }
    });

    if (!match) {
      throw new Error('Match non trouvé');
    }

    if (match.isLocked) {
      throw new Error('Ce match est verrouillé, impossible de modifier le pronostic');
    }

    // Vérifier que le match n'a pas encore commencé
    const now = new Date();
    
    // Calculer dynamiquement si le match est verrouillé (à l'heure exacte du match)
    const isLockedDynamically = now >= match.startAt || match.isLocked;
    
    if (isLockedDynamically) {
      throw new Error('Le délai pour pronostiquer ce match est dépassé (fermeture à l\'heure du match)');
    }

    // Vérifier si c'est une modification d'un pronostic existant
    const existingPrediction = await prisma.prediction.findUnique({
      where: {
        userId_matchId: {
          userId,
          matchId
        }
      }
    });

    const wasRisky = existingPrediction?.isRisky || false;
    const isModifying = !!existingPrediction;

    // Gérer le mode risqué
    if (isRisky) {
      // Si c'est une modification et que le pronostic avait déjà le mode risqué, on ne vérifie pas le cooldown
      // (car c'est le même pronostic, on ne consomme pas un nouveau cooldown)
      if (!isModifying || !wasRisky) {
        // Nouveau pronostic risqué ou modification d'un pronostic non risqué -> vérifier le cooldown
        const cooldownCheck = await this.canUseRiskyMode(userId, match.groupId);
        if (!cooldownCheck.canUse) {
          const nextDate = cooldownCheck.nextAvailableDate!;
          const daysRemaining = Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          throw new Error(`Le mode risqué est en cooldown. Vous pouvez l'utiliser à nouveau dans ${daysRemaining} jour(s) (${nextDate.toLocaleDateString('fr-FR')}).`);
        }

        // Mettre à jour ou créer le cooldown seulement si c'est un nouveau pronostic risqué
        // ou si on active le mode risqué sur un pronostic qui ne l'avait pas
        await prisma.riskyPredictionCooldown.upsert({
          where: {
            userId_groupId: {
              userId,
              groupId: match.groupId
            }
          },
          update: {
            lastUsed: now
          },
          create: {
            userId,
            groupId: match.groupId,
            lastUsed: now
          }
        });
      }
      // Si c'est une modification et que le pronostic avait déjà le mode risqué, on ne fait rien
      // (on garde le cooldown existant, on ne le met pas à jour)
    } else if (isModifying && wasRisky) {
      // Si on décoche le mode risqué sur un pronostic qui l'avait, on libère le cooldown
      // (supprimer le cooldown pour permettre de l'utiliser sur un autre pronostic)
      await prisma.riskyPredictionCooldown.delete({
        where: {
          userId_groupId: {
            userId,
            groupId: match.groupId
          }
        }
      }).catch(() => {
        // Ignorer l'erreur si le cooldown n'existe pas (déjà supprimé)
      });
    }

    // Valider que les scores de sets correspondent au nombre de sets gagnés
    if (predictedSetScores && predictedSetScores.length > 0) {
      const validationError = this.validateSetScores(predictedHome, predictedAway, predictedSetScores, match);
      if (validationError) {
        throw new Error(validationError);
      }
    }

    // Créer ou mettre à jour le pronostic
    const prediction = await prisma.prediction.upsert({
      where: {
        userId_matchId: {
          userId,
          matchId
        }
      },
      update: {
        predictedHome,
        predictedAway,
        predictedSetScores: predictedSetScores ? JSON.parse(JSON.stringify(predictedSetScores)) : null,
        isRisky: isRisky || false,
        updatedAt: new Date()
      },
      create: {
        userId,
        matchId,
        predictedHome,
        predictedAway,
        predictedSetScores: predictedSetScores ? JSON.parse(JSON.stringify(predictedSetScores)) : null,
        isRisky: isRisky || false
      },
      include: {
        match: true,
        user: {
          select: {
            id: true,
            pseudo: true
          }
        }
      }
    });

    return prediction;
  }

  async getPredictionById(predictionId: string, userId: string) {
    const prediction = await prisma.prediction.findUnique({
      where: { id: predictionId },
      include: { match: true }
    });

    if (!prediction) {
      throw new Error('Pronostic non trouvé');
    }

    if (prediction.userId !== userId) {
      throw new Error('Vous n\'avez pas accès à ce pronostic');
    }

    return prediction;
  }

  async updatePrediction(predictionId: string, data: UpdatePredictionData & { userId: string }) {
    const { userId, predictedHome, predictedAway, predictedSetScores } = data;

    // Vérifier que le pronostic appartient à l'utilisateur
    const prediction = await this.getPredictionById(predictionId, userId);

    // Vérifier que le match n'est pas verrouillé
    const match = await prisma.match.findUnique({
      where: { id: prediction.matchId }
    });

    if (!match) {
      throw new Error('Match non trouvé');
    }

    const now = new Date();
    const isLockedDynamically = now >= match.startAt || match.isLocked;

    if (isLockedDynamically) {
      throw new Error('Le délai pour modifier ce pronostic est dépassé (fermeture à l\'heure du match)');
    }

    // Valider que les scores de sets correspondent au nombre de sets gagnés
    if (predictedSetScores && predictedSetScores.length > 0) {
      const validationError = this.validateSetScores(predictedHome, predictedAway, predictedSetScores, match);
      if (validationError) {
        throw new Error(validationError);
      }
    }

    const updated = await prisma.prediction.update({
      where: { id: predictionId },
      data: {
        predictedHome,
        predictedAway,
        predictedSetScores: predictedSetScores ? JSON.parse(JSON.stringify(predictedSetScores)) : null,
        updatedAt: new Date()
      },
      include: {
        match: true,
        user: {
          select: {
            id: true,
            pseudo: true
          }
        }
      }
    });

    return updated;
  }

  async getUserPredictions(userId: string, groupId: string) {
    const predictions = await prisma.prediction.findMany({
      where: {
        userId,
        match: {
          groupId
        }
      },
      include: {
        match: {
          include: {
            group: true
          }
        }
      },
      orderBy: {
        match: {
          startAt: 'asc'
        }
      }
    });

    return predictions;
  }

  async getAllUserPredictions(userId: string) {
    const predictions = await prisma.prediction.findMany({
      where: {
        userId,
        deletedAt: null // Exclure les pronostics supprimés visuellement
      },
      include: {
        match: {
          include: {
            group: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        match: {
          startAt: 'desc'
        }
      }
    });

    // Calculer dynamiquement isLocked pour chaque match (à l'heure exacte du match)
    const now = new Date();
    return predictions.map(prediction => {
      const match = prediction.match;
      const isLockedDynamically = now >= match.startAt || match.isLocked;
      
      return {
        ...prediction,
        match: {
          ...match,
          isLocked: isLockedDynamically
        }
      };
    });
  }

  async getMatchPredictions(matchId: string, userId: string) {
    // Vérifier que l'utilisateur a accès au match
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        group: {
          include: {
            members: {
              where: { userId }
            }
          }
        }
      }
    });

    if (!match) {
      throw new Error('Match non trouvé');
    }

    if (match.group.members.length === 0) {
      throw new Error('Vous n\'avez pas accès à ce match');
    }

    const predictions = await prisma.prediction.findMany({
      where: { matchId },
      include: {
        user: {
          select: {
            id: true,
            pseudo: true
          }
        }
      }
    });

    return predictions;
  }

  async getUserPredictionForMatch(matchId: string, userId: string) {
    // Vérifier que l'utilisateur a accès au match
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        group: {
          include: {
            members: {
              where: { userId }
            }
          }
        }
      }
    });

    if (!match) {
      throw new Error('Match non trouvé');
    }

    if (match.group.members.length === 0) {
      throw new Error('Vous n\'avez pas accès à ce match');
    }

    // Récupérer uniquement le pronostic de l'utilisateur
    const prediction = await prisma.prediction.findUnique({
      where: {
        userId_matchId: {
          userId,
          matchId
        }
      },
      include: {
        user: {
          select: {
            id: true,
            pseudo: true
          }
        }
      }
    });

    return prediction;
  }

  async calculatePointsForMatch(matchId: string) {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        predictions: true
      }
    });

    if (!match || match.status !== 'FINISHED' || match.setsHome === null || match.setsHome === undefined || match.setsAway === null || match.setsAway === undefined) {
      throw new Error('Match non terminé ou scores manquants');
    }

    const actualHome = match.setsHome;
    const actualAway = match.setsAway;
    const actualSetScores = match.setScores as Array<{ home: number; away: number }> | null;

    const updatePromises = match.predictions.map(prediction => {
      let points = 0;
      const isRisky = prediction.isRisky || false;

      // Convertir les valeurs en nombres pour éviter les problèmes de comparaison
      const predictedHome = Number(prediction.predictedHome);
      const predictedAway = Number(prediction.predictedAway);
      const actualHomeNum = Number(actualHome);
      const actualAwayNum = Number(actualAway);


      // Vérifier que les valeurs sont valides
      if (isNaN(predictedHome) || isNaN(predictedAway) || isNaN(actualHomeNum) || isNaN(actualAwayNum)) {
        console.error(`❌ Valeurs invalides pour le pronostic ${prediction.id}:`, {
          predictedHome: prediction.predictedHome,
          predictedAway: prediction.predictedAway,
          actualHome,
          actualAway
        });
        return prisma.prediction.update({
          where: { id: prediction.id },
          data: { pointsAwarded: 0 }
        });
      }

      // Calculer le bonus score détaillé
      let bonusDetailedSets = 0;
      let allSetsExact = false;
      if (prediction.predictedSetScores && actualSetScores) {
        const predictedScores = prediction.predictedSetScores as Array<{ home: number; away: number }>;
        
        // Compter les sets exacts en comparant set par set (set 1 avec set 1, set 2 avec set 2, etc.)
        const minLength = Math.min(predictedScores.length, actualSetScores.length);
        let exactSetsCount = 0;
        
        for (let index = 0; index < minLength; index++) {
          const predictedSet = predictedScores[index];
          const actualSet = actualSetScores[index];
          // Comparer set 1 avec set 1, set 2 avec set 2, etc. (pas set 1 avec set 2)
          if (Number(predictedSet.home) === Number(actualSet.home) && Number(predictedSet.away) === Number(actualSet.away)) {
            exactSetsCount++;
          }
        }
        
        bonusDetailedSets = exactSetsCount;
        
        // Vérifier si TOUS les sets sont exacts (même nombre de sets et tous identiques)
        allSetsExact = (predictedScores.length === actualSetScores.length) && 
                       (exactSetsCount === predictedScores.length) && 
                       (exactSetsCount === actualSetScores.length);
      }

      // Score exact (sets)
      if (predictedHome === actualHomeNum && predictedAway === actualAwayNum) {
        points = 3;
        
        if (isRisky) {
          // Mode risqué : si TOUT est exact (score + tous les sets), le bonus rentre dans la parenthèse
          if (allSetsExact && bonusDetailedSets > 0) {
            // (score exact + bonus sets) × 2
            points = (points + bonusDetailedSets) * 2;
          } else {
            // (score exact × 2) + bonus sets
            points = (points * 2) + bonusDetailedSets;
          }
        } else {
          // Sans mode risqué : score exact + bonus sets
          points += bonusDetailedSets;
        }
        
        console.log(`✅ Score exact pour ${prediction.id}: ${predictedHome}-${predictedAway} = ${actualHomeNum}-${actualAwayNum} → ${points} pts`);
      }
      // Bon vainqueur (seulement si le score exact n'est pas atteint)
      else if (
        (actualHomeNum > actualAwayNum && predictedHome > predictedAway) ||
        (actualAwayNum > actualHomeNum && predictedAway > predictedHome)
      ) {
        points = 1;
        
        if (isRisky) {
          // Mode risqué : si le score exact n'est pas bon, on gagne 0 pts (pas de multiplication)
          points = 0;
        }
        
        // Le bonus score détaillé s'ajoute toujours (hors de la multiplication risquée)
        points += bonusDetailedSets;
        
        console.log(`✅ Bon vainqueur pour ${prediction.id}: ${predictedHome}-${predictedAway} (réel: ${actualHomeNum}-${actualAwayNum}) → ${points} pts`);
      }
      // Sinon 0 points (pas de points pour différence de sets seule)
      // Mode risqué : -2 points si le vainqueur est incorrect
      else {
        if (isRisky) {
          points = -2; // L'équipe désignée gagnante a perdu
        } else {
          points = 0;
        }
        
        // Le bonus score détaillé s'ajoute toujours (même en cas de défaite)
        points += bonusDetailedSets;
        
        console.log(`❌ Vainqueur incorrect pour ${prediction.id}: ${predictedHome}-${predictedAway} (réel: ${actualHomeNum}-${actualAwayNum}) → ${points} pts`);
      }

      return prisma.prediction.update({
        where: { id: prediction.id },
        data: { pointsAwarded: points }
      });
    });

    await Promise.all(updatePromises);
    
    return updatePromises.length;
  }

  async deletePredictions(predictionIds: string[], userId: string) {
    // Vérifier que tous les pronostics appartiennent à l'utilisateur
    const predictions = await prisma.prediction.findMany({
      where: {
        id: { in: predictionIds },
        userId
      },
      include: {
        match: true
      }
    });

    if (predictions.length !== predictionIds.length) {
      throw new Error('Certains pronostics n\'ont pas été trouvés ou ne vous appartiennent pas');
    }

    // Séparer les pronostics terminés des autres
    const finishedPredictions = predictions.filter(p => p.match.status === 'FINISHED');
    const unfinishedPredictions = predictions.filter(p => p.match.status !== 'FINISHED');

    // Soft delete pour les pronostics terminés (on garde les points pour le classement)
    if (finishedPredictions.length > 0) {
      await prisma.prediction.updateMany({
        where: {
          id: { in: finishedPredictions.map(p => p.id) },
          userId
        },
        data: {
          deletedAt: new Date()
        }
      });
    }

    // Hard delete pour les pronostics non terminés (pas de points à conserver)
    if (unfinishedPredictions.length > 0) {
      await prisma.prediction.deleteMany({
        where: {
          id: { in: unfinishedPredictions.map(p => p.id) },
          userId
        }
      });
    }

    return {
      softDeleted: finishedPredictions.length,
      hardDeleted: unfinishedPredictions.length
    };
  }

  async canUseRiskyMode(userId: string, groupId: string): Promise<{ canUse: boolean; nextAvailableDate?: Date }> {
    const cooldown = await prisma.riskyPredictionCooldown.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId
        }
      }
    });

    if (!cooldown) {
      return { canUse: true };
    }

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    if (cooldown.lastUsed < oneWeekAgo) {
      return { canUse: true };
    } else {
      const nextAvailableDate = new Date(cooldown.lastUsed);
      nextAvailableDate.setDate(nextAvailableDate.getDate() + 7);
      return { canUse: false, nextAvailableDate };
    }
  }

  /**
   * Récupère les pronostics terminés depuis la dernière connexion de l'utilisateur
   * avec leurs points gagnés/perdus
   */
  async getPredictionsSinceLastLogin(userId: string) {
    // Récupérer la date de dernière connexion de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lastLoginAt: true }
    });

    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    // Si c'est la première connexion (lastLoginAt est null), on ne retourne rien
    // Note: lastLoginAt a déjà été mis à jour lors de la connexion,
    // donc on cherche les pronostics terminés dans les 7 derniers jours
    // pour être sûr de ne rien manquer
    if (!user.lastLoginAt) {
      return {
        totalPoints: 0,
        predictions: []
      };
    }

    // Calculer la date de référence (7 jours avant maintenant)
    // On cherche les pronostics terminés dans les 7 derniers jours
    // (pour éviter de manquer des pronostics si la dernière connexion était il y a longtemps)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Récupérer tous les pronostics terminés depuis la dernière connexion
    // où les points ont été attribués (pointsAwarded !== null)
    // ET qui n'ont pas encore été vus (notificationViewed === false)
    // On filtre par updatedAt du match pour trouver les matchs terminés récemment
    const predictions = await prisma.prediction.findMany({
      where: {
        userId,
        pointsAwarded: { not: null },
        notificationViewed: false, // Seulement les pronostics non vus
        match: {
          status: 'FINISHED',
          scrapedAt: { gte: sevenDaysAgo }
        }
      },
      include: {
        match: {
          select: {
            id: true,
            homeTeam: true,
            awayTeam: true,
            setsHome: true,
            setsAway: true,
            startAt: true,
            group: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        match: {
          startAt: 'desc'
        }
      }
    });

    // Calculer le total des points
    const totalPoints = predictions.reduce((sum, pred) => {
      return sum + (pred.pointsAwarded || 0);
    }, 0);

    // Grouper les pronostics par groupe pour calculer les points par groupe
    const predictionsByGroup = predictions.reduce((acc, pred) => {
      const groupId = pred.match.group.id;
      const groupName = pred.match.group.name;
      
      if (!acc[groupId]) {
        acc[groupId] = {
          groupId,
          groupName,
          totalPoints: 0,
          predictions: []
        };
      }
      
      const points = pred.pointsAwarded || 0;
      acc[groupId].totalPoints += points;
      acc[groupId].predictions.push({
        id: pred.id,
        matchId: pred.matchId,
        homeTeam: pred.match.homeTeam,
        awayTeam: pred.match.awayTeam,
        predictedHome: pred.predictedHome,
        predictedAway: pred.predictedAway,
        actualHome: pred.match.setsHome,
        actualAway: pred.match.setsAway,
        pointsAwarded: points,
        isRisky: pred.isRisky || false,
        matchDate: pred.match.startAt
      });
      
      return acc;
    }, {} as Record<string, {
      groupId: string;
      groupName: string;
      totalPoints: number;
      predictions: Array<{
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
        matchDate: Date;
      }>;
    }>);

    return {
      totalPoints,
      predictionsByGroup: Object.values(predictionsByGroup),
      predictions: predictions.map(pred => ({
        id: pred.id,
        matchId: pred.matchId,
        homeTeam: pred.match.homeTeam,
        awayTeam: pred.match.awayTeam,
        predictedHome: pred.predictedHome,
        predictedAway: pred.predictedAway,
        actualHome: pred.match.setsHome,
        actualAway: pred.match.setsAway,
        pointsAwarded: pred.pointsAwarded || 0,
        isRisky: pred.isRisky || false,
        matchDate: pred.match.startAt,
        groupName: pred.match.group.name,
        groupId: pred.match.group.id
      }))
    };
  }

  /**
   * Marque les pronostics comme "vus" pour la notification
   */
  async markPredictionsAsViewed(userId: string, predictionIds: string[]) {
    await prisma.prediction.updateMany({
      where: {
        id: { in: predictionIds },
        userId
      },
      data: {
        notificationViewed: true
      }
    });
  }
}
