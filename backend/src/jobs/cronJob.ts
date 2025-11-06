import cron from 'node-cron';
import { prisma } from '../db/prisma';
import { FFVBScraper } from '../utils/ffvbScraper';
import { PointsCalculator } from '../utils/pointsCalculator';
import logger from '../config/logger';

export class CronJobManager {
  private ffvbScraper = new FFVBScraper();
  private pointsCalculator = new PointsCalculator();

  /**
   * Démarre tous les jobs cron
   */
  startAllJobs() {
    this.startLockMatchesJob();
    this.startSyncFFVBJob();
    this.startCalculatePointsJob();
    logger.info('Tous les jobs cron ont été démarrés');
  }

  /**
   * Job pour verrouiller les matchs à l'heure exacte du début
   * Exécuté toutes les heures
   */
  private startLockMatchesJob() {
    cron.schedule('0 * * * *', async () => {
      try {
        logger.info('Début du job de verrouillage des matchs');
        
        const now = new Date();

        const matches = await prisma.match.findMany({
          where: {
            startAt: {
              lte: now // Matchs qui ont commencé ou sont en cours
            },
            isLocked: false
          }
        });

        if (matches.length > 0) {
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
          logger.info(`${matches.length} matchs verrouillés`);
        } else {
          logger.info('Aucun match à verrouiller');
        }
      } catch (error) {
        logger.error('Erreur lors du verrouillage des matchs:', error);
      }
    });
  }

  /**
   * Job pour synchroniser les matchs FFVB
   * Exécuté toutes les 2 heures
   */
  private startSyncFFVBJob() {
    cron.schedule('0 */2 * * *', async () => {
      try {
        logger.info('Début de la synchronisation FFVB');
        
        const groups = await prisma.group.findMany({
          where: {
            ffvbSourceUrl: {
              not: null
            }
          }
        });

        for (const group of groups) {
          if (!group.ffvbSourceUrl) continue;

          try {
            logger.info(`Synchronisation du groupe ${group.name} (${group.id})`);
            
            const matches = await this.ffvbScraper.scrapeGroupMatches(group.ffvbSourceUrl);
            
            for (const matchData of matches) {
              await this.syncMatch(group.id, matchData);
            }
            
            logger.info(`${matches.length} matchs synchronisés pour le groupe ${group.name}`);
          } catch (error) {
            logger.error(`Erreur lors de la sync du groupe ${group.name}:`, error);
          }
        }
      } catch (error) {
        logger.error('Erreur lors de la synchronisation FFVB:', error);
      }
    });
  }

  /**
   * Job pour calculer les points des matchs terminés
   * Exécuté toutes les heures
   */
  private startCalculatePointsJob() {
    cron.schedule('30 * * * *', async () => {
      try {
        logger.info('Début du calcul des points');
        
        const finishedMatches = await prisma.match.findMany({
          where: {
            status: 'FINISHED',
            setsHome: { not: null },
            setsAway: { not: null }
          },
          include: {
            predictions: {
              where: {
                pointsAwarded: null
              }
            }
          }
        });

        for (const match of finishedMatches) {
          if (match.predictions.length === 0) continue;

          for (const prediction of match.predictions) {
            const result = this.pointsCalculator.calculatePoints(
              prediction.predictedHome,
              prediction.predictedAway,
              match.setsHome!,
              match.setsAway!
            );

            await prisma.prediction.update({
              where: { id: prediction.id },
              data: { pointsAwarded: result.points }
            });
          }
        }

        logger.info(`Points calculés pour ${finishedMatches.length} matchs`);
      } catch (error) {
        logger.error('Erreur lors du calcul des points:', error);
      }
    });
  }

  /**
   * Synchronise un match avec les données FFVB
   */
  private async syncMatch(groupId: string, matchData: any) {
    const existingMatch = await prisma.match.findFirst({
      where: {
        groupId,
        OR: [
          { ffvbMatchId: matchData.ffvbMatchId },
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
          scrapedAt: new Date()
        }
      });
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
    }
  }

  /**
   * Arrête tous les jobs cron
   */
  stopAllJobs() {
    cron.getTasks().forEach(task => task.destroy());
    logger.info('Tous les jobs cron ont été arrêtés');
  }
}
