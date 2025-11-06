import { prisma } from '../db/prisma';
import { FFVBScraper } from '../utils/ffvbScraper';

export interface CreateMatchData {
  groupId: string;
  homeTeam: string;
  awayTeam: string;
  startAt: Date;
  ffvbMatchId?: string;
  setsHome?: number;
  setsAway?: number;
  status?: 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELED';
}

export interface UpdateMatchData {
  setsHome?: number;
  setsAway?: number;
  status?: 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELED';
}

export class MatchesService {
  async createMatch(data: CreateMatchData) {
    const match = await prisma.match.create({
      data,
      include: {
        group: true,
        predictions: {
          include: {
            user: {
              select: {
                id: true,
                pseudo: true,
                firstName: true,
                avatar: true
              }
            }
          }
        }
      }
    });

    return match;
  }

  async getGroupMatches(groupId: string, userId: string, status?: string) {
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

    const where: any = { groupId };
    if (status) {
      where.status = status;
    }

    const matches = await prisma.match.findMany({
      where,
      orderBy: {
        startAt: 'asc'
      },
      include: {
        predictions: {
          include: {
            user: {
              select: {
                id: true,
                pseudo: true,
                firstName: true,
                avatar: true
              }
            }
          }
        }
      }
    });

    // Calculer dynamiquement isLocked pour chaque match (à l'heure exacte du match)
    const now = new Date();
    return matches.map(match => {
      const isLockedDynamically = now >= match.startAt || match.isLocked;
      
      return {
        ...match,
        isLocked: isLockedDynamically
      };
    });
  }

  async getMatchById(matchId: string, userId: string) {
    // Récupérer le match avec son groupe
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        group: {
          include: {
            members: {
              where: {
                userId
              }
            }
          }
        },
        predictions: {
          include: {
            user: {
              select: {
                id: true,
                pseudo: true,
                firstName: true,
                avatar: true
              }
            }
          }
        }
      }
    });

    if (!match) {
      throw new Error('Match non trouvé');
    }

    // Vérifier que l'utilisateur est membre du groupe
    if (match.group.members.length === 0) {
      throw new Error('Vous n\'avez pas accès à ce match');
    }

    // Calculer dynamiquement si le match est verrouillé (à l'heure exacte du match)
    const now = new Date();
    const isLockedDynamically = now >= match.startAt || match.isLocked;

    // Retourner le match avec isLocked calculé dynamiquement
    return {
      ...match,
      isLocked: isLockedDynamically
    };
  }

  async updateMatch(matchId: string, data: UpdateMatchData) {
    const match = await prisma.match.update({
      where: { id: matchId },
      data,
      include: {
        group: true,
        predictions: {
          include: {
            user: {
              select: {
                id: true,
                pseudo: true,
                firstName: true,
                avatar: true
              }
            }
          }
        }
      }
    });

    return match;
  }

  async lockMatches24hBefore() {
    const now = new Date();

    const matches = await prisma.match.findMany({
      where: {
        startAt: {
          lte: now // Matchs qui ont commencé ou sont en cours
        },
        isLocked: false
      }
    });

    const updatePromises = matches.map(match =>
      prisma.match.update({
        where: { id: match.id },
        data: {
          isLocked: true,
          lockedAt: now
        }
      })
    );

    await Promise.all(updatePromises);

    return matches.length;
  }

  async syncFFVBMatches(groupId: string, userId: string) {
    // Vérifier que l'utilisateur est owner ou admin
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId
        }
      }
    });

    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      throw new Error('Vous n\'avez pas les droits pour synchroniser les matchs');
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId }
    });

    if (!group?.ffvbSourceUrl) {
      throw new Error('Aucune URL FFVB configurée pour ce groupe');
    }

    // Utiliser le scraper FFVB pour récupérer les matchs
    const scraper = new FFVBScraper();
    const ffvbMatches = await scraper.scrapeGroupMatches(group.ffvbSourceUrl);

    let created = 0;
    let updated = 0;

    // Synchroniser chaque match trouvé
    for (const matchData of ffvbMatches) {
      // Chercher un match existant par ffvbMatchId ou par équipes + date
      const existingMatch = await prisma.match.findFirst({
        where: {
          groupId,
          OR: [
            // Si on a un ffvbMatchId, chercher par celui-ci
            ...(matchData.ffvbMatchId ? [{ ffvbMatchId: matchData.ffvbMatchId }] : []),
            // Sinon, chercher par équipes et date (fenêtre de 2h avant/après)
            {
              homeTeam: matchData.homeTeam,
              awayTeam: matchData.awayTeam,
              startAt: {
                gte: new Date(matchData.startAt.getTime() - 2 * 60 * 60 * 1000), // 2h avant
                lte: new Date(matchData.startAt.getTime() + 2 * 60 * 60 * 1000)  // 2h après
              }
            }
          ]
        }
      });

      if (existingMatch) {
        // Mettre à jour le match existant
        await prisma.match.update({
          where: { id: existingMatch.id },
          data: {
            status: matchData.status,
            setsHome: matchData.setsHome,
            setsAway: matchData.setsAway,
            setScores: matchData.setScores ? JSON.parse(JSON.stringify(matchData.setScores)) : null,
            scrapedAt: new Date(),
            // Mettre à jour le ffvbMatchId s'il n'était pas présent
            ...(matchData.ffvbMatchId && !existingMatch.ffvbMatchId ? { ffvbMatchId: matchData.ffvbMatchId } : {})
          }
        });
        updated++;
      } else {
        // Créer un nouveau match
        await prisma.match.create({
          data: {
            groupId,
            ffvbMatchId: matchData.ffvbMatchId,
            homeTeam: matchData.homeTeam,
            awayTeam: matchData.awayTeam,
            startAt: matchData.startAt,
            status: matchData.status,
            setsHome: matchData.setsHome,
            setsAway: matchData.setsAway,
            setScores: matchData.setScores ? JSON.parse(JSON.stringify(matchData.setScores)) : null,
            scrapedAt: new Date()
          }
        });
        created++;
      }
    }

    return {
      message: 'Synchronisation FFVB terminée',
      url: group.ffvbSourceUrl,
      totalFound: ffvbMatches.length,
      created,
      updated
    };
  }
}
