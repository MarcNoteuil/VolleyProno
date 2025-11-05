import { prisma } from '../db/prisma';

export class RankingService {
  async getGroupRanking(groupId: string, userId: string) {
    // Vérifier que l'utilisateur est membre du groupe
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId
        }
      }
    });

    if (!membership) {
      throw new Error('Vous n\'êtes pas membre de ce groupe');
    }

    // Récupérer tous les membres du groupe avec leurs pronostics
    const members = await prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            id: true,
            pseudo: true
          }
        }
      }
    });

    // Calculer les statistiques pour chaque membre
    const ranking = await Promise.all(
      members.map(async (member) => {
        const predictions = await prisma.prediction.findMany({
          where: {
            userId: member.userId,
            match: {
              groupId,
              status: 'FINISHED'
            }
          },
          include: {
            match: true
          }
        });

        const totalPoints = predictions.reduce((sum, pred) => sum + (pred.pointsAwarded || 0), 0);
        const exactScores = predictions.filter(pred => pred.pointsAwarded === 5).length;
        const correctWinners = predictions.filter(pred => pred.pointsAwarded === 2).length;
        const proximity = predictions.filter(pred => pred.pointsAwarded === 1).length;
        const totalPredictions = predictions.length;

        return {
          user: member.user,
          totalPoints,
          exactScores,
          correctWinners,
          proximity,
          totalPredictions,
          joinedAt: member.joinedAt
        };
      })
    );

    // Trier par points (décroissant), puis par scores exacts (décroissant), puis par date d'arrivée (croissante)
    ranking.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      if (b.exactScores !== a.exactScores) {
        return b.exactScores - a.exactScores;
      }
      return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
    });

    // Ajouter le rang
    const rankingWithPosition = ranking.map((member, index) => ({
      ...member,
      position: index + 1
    }));

    return rankingWithPosition;
  }

  async getUserStats(userId: string, groupId: string) {
    const predictions = await prisma.prediction.findMany({
      where: {
        userId,
        match: {
          groupId,
          status: 'FINISHED'
        }
      },
      include: {
        match: true
      }
    });

    const totalPoints = predictions.reduce((sum, pred) => sum + (pred.pointsAwarded || 0), 0);
    const exactScores = predictions.filter(pred => pred.pointsAwarded === 5).length;
    const correctWinners = predictions.filter(pred => pred.pointsAwarded === 2).length;
    const proximity = predictions.filter(pred => pred.pointsAwarded === 1).length;
    const totalPredictions = predictions.length;

    // Calculer le pourcentage de réussite
    const successRate = totalPredictions > 0 ? (totalPoints / (totalPredictions * 5)) * 100 : 0;

    return {
      totalPoints,
      exactScores,
      correctWinners,
      proximity,
      totalPredictions,
      successRate: Math.round(successRate * 100) / 100
    };
  }

  async getGlobalRanking(limit: number = 10) {
    // Récupérer tous les utilisateurs
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        pseudo: true
      }
    });

    // Récupérer tous les pronostics terminés avec des points
    // Les groupes peuvent être soft-deleted mais les pronostics terminés gardent leurs points
    const allFinishedPredictions = await prisma.prediction.findMany({
      where: {
        match: {
          status: 'FINISHED'
        },
        pointsAwarded: {
          not: null
        }
        // Note: on ne filtre PAS par deletedAt car on veut inclure les pronostics supprimés visuellement
        // mais dont les points doivent quand même compter pour le classement global
        // Les groupes soft-deleted sont inclus car leurs matchs et pronostics sont toujours présents
      },
      select: {
        userId: true,
        pointsAwarded: true
      }
    });

    // Calculer les points totaux pour chaque utilisateur
    // On initialise tous les utilisateurs à 0 points
    const userPointsMap = new Map<string, { user: { id: string; pseudo: string }; totalPoints: number }>();

    // Initialiser tous les utilisateurs avec 0 points
    for (const user of allUsers) {
      userPointsMap.set(user.id, {
        user: {
          id: user.id,
          pseudo: user.pseudo
        },
        totalPoints: 0
      });
    }

    // Ajouter les points des prédictions terminées
    for (const prediction of allFinishedPredictions) {
      const userId = prediction.userId;
      const points = prediction.pointsAwarded || 0;

      if (userPointsMap.has(userId)) {
        const userData = userPointsMap.get(userId)!;
        userData.totalPoints += points;
      }
    }

    // Convertir en tableau et trier par points (décroissant), puis par pseudo (alphabétique) en cas d'égalité
    const ranking = Array.from(userPointsMap.values())
      .sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) {
          return b.totalPoints - a.totalPoints;
        }
        // En cas d'égalité, trier par pseudo (alphabétique)
        return a.user.pseudo.localeCompare(b.user.pseudo);
      })
      .slice(0, limit) // Limiter aux top N
      .map((item, index) => ({
        ...item,
        position: index + 1
      }));

    return ranking;
  }
}
