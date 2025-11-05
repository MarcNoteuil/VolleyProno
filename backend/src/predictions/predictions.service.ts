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
    const totalSets = Math.max(predictedHome, predictedAway) === 3 
      ? (predictedHome === 3 && predictedAway === 0 ? 3 : predictedHome === 3 && predictedAway === 1 ? 4 : 5) 
      : 5;

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

    // Vérifier que le match n'a pas encore commencé (24h avant)
    const now = new Date();
    const lockTime = new Date(match.startAt.getTime() - 24 * 60 * 60 * 1000); // 24h avant le début
    
    // Calculer dynamiquement si le match est verrouillé
    const isLockedDynamically = now >= lockTime || match.isLocked;
    
    if (isLockedDynamically) {
      throw new Error('Le délai pour pronostiquer ce match est dépassé (fermeture 24h avant le début du match)');
    }

    // Vérifier le cooldown du mode risqué si activé
    if (isRisky) {
      const cooldownCheck = await this.canUseRiskyMode(userId, match.groupId);
      if (!cooldownCheck.canUse) {
        const nextDate = cooldownCheck.nextAvailableDate!;
        const daysRemaining = Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        throw new Error(`Le mode risqué est en cooldown. Vous pouvez l'utiliser à nouveau dans ${daysRemaining} jour(s) (${nextDate.toLocaleDateString('fr-FR')}).`);
      }

      // Mettre à jour ou créer le cooldown
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
    const lockTime = new Date(match.startAt.getTime() - 24 * 60 * 60 * 1000);
    const isLockedDynamically = now >= lockTime || match.isLocked;

    if (isLockedDynamically) {
      throw new Error('Le délai pour modifier ce pronostic est dépassé (fermeture 24h avant le début du match)');
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

    // Calculer dynamiquement isLocked pour chaque match (24h avant le début)
    const now = new Date();
    return predictions.map(prediction => {
      const match = prediction.match;
      const lockTime = new Date(match.startAt.getTime() - 24 * 60 * 60 * 1000); // 24h avant
      const isLockedDynamically = now >= lockTime || match.isLocked;
      
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

    if (!match || match.status !== 'FINISHED' || !match.setsHome || !match.setsAway) {
      throw new Error('Match non terminé ou scores manquants');
    }

    const actualHome = match.setsHome;
    const actualAway = match.setsAway;
    const actualSetScores = match.setScores as Array<{ home: number; away: number }> | null;

    const updatePromises = match.predictions.map(prediction => {
      let points = 0;
      const isRisky = prediction.isRisky || false;

      // Score exact (sets)
      if (prediction.predictedHome === actualHome && prediction.predictedAway === actualAway) {
        points = 3;
        
        // Bonus +2 si les scores de sets sont exacts (bon ordre et bonnes équipes)
        // Seulement si le score exact est atteint
        if (prediction.predictedSetScores && actualSetScores) {
          const predictedScores = prediction.predictedSetScores as Array<{ home: number; away: number }>;
          
          // Vérifier que le nombre de sets correspond
          if (predictedScores.length === actualSetScores.length) {
            // Vérifier que tous les scores de sets sont exacts (bon ordre et bonnes équipes)
            const allSetsExact = predictedScores.every((predictedSet, index) => {
              const actualSet = actualSetScores[index];
              return predictedSet.home === actualSet.home && predictedSet.away === actualSet.away;
            });
            
            if (allSetsExact) {
              points += 2; // Bonus de +2 points pour score exact par set
            }
          }
        }

        // Mode risqué : double les points si correct
        if (isRisky) {
          points = points * 2;
        }
      }
      // Bon vainqueur (seulement si le score exact n'est pas atteint)
      else if (
        (actualHome > actualAway && prediction.predictedHome > prediction.predictedAway) ||
        (actualAway > actualHome && prediction.predictedAway > prediction.predictedHome)
      ) {
        points = 1;

        // Mode risqué : double les points si correct
        if (isRisky) {
          points = points * 2;
        }
      }
      // Sinon 0 points (pas de points pour différence de sets seule)
      // Mode risqué : -2 points si incorrect
      else if (isRisky) {
        points = -2;
      }

      return prisma.prediction.update({
        where: { id: prediction.id },
        data: { pointsAwarded: points }
      });
    });

    await Promise.all(updatePromises);

    return match.predictions.length;
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
}
