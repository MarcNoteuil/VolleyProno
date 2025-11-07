import cron from 'node-cron';
import { prisma } from '../db/prisma';
import { FFVBScraper } from '../utils/ffvbScraper';
import { PredictionsService } from '../predictions/predictions.service';
import logger from '../config/logger';

export class CronJobManager {
  private ffvbScraper = new FFVBScraper();
  private predictionsService = new PredictionsService();

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
   * Job pour verrouiller les matchs et mettre le statut à IN_PROGRESS à l'heure exacte du début
   * Exécuté toutes les heures
   */
  private startLockMatchesJob() {
    cron.schedule('0 * * * *', async () => {
      try {
        logger.info('Début du job de verrouillage et mise à jour du statut des matchs');
        
        const now = new Date();

        // Trouver les matchs qui doivent être verrouillés et passer en IN_PROGRESS
        const matchesToUpdate = await prisma.match.findMany({
          where: {
            startAt: {
              lte: now // Matchs qui ont commencé ou sont en cours
            },
            status: 'SCHEDULED' // Seulement les matchs programmés (pas encore terminés ou annulés)
          }
        });

        if (matchesToUpdate.length > 0) {
          const updatePromises = matchesToUpdate.map(match =>
            prisma.match.update({
              where: { id: match.id },
              data: {
                isLocked: true,
                lockedAt: now,
                status: 'IN_PROGRESS' // Passer en "En cours" dès le début du match
              }
            })
          );

          await Promise.all(updatePromises);
          logger.info(`${matchesToUpdate.length} matchs verrouillés et mis à jour en IN_PROGRESS`);
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
   * Exécuté toutes les heures
   */
  private startSyncFFVBJob() {
    cron.schedule('0 * * * *', async () => {
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

          try {
            // Utiliser le service de prédictions qui prend en compte le mode risqué
            await this.predictionsService.calculatePointsForMatch(match.id);
            logger.info(`Points calculés pour le match ${match.id} (${match.predictions.length} prédictions)`);
          } catch (error) {
            logger.error(`Erreur lors du calcul des points pour le match ${match.id}:`, error);
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
      // Vérifier si le match vient d'être terminé (passage de SCHEDULED/IN_PROGRESS à FINISHED)
      const wasFinished = existingMatch.status === 'FINISHED';
      const isNowFinished = matchData.status === 'FINISHED';
      const justFinished = !wasFinished && isNowFinished;
      
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
      
      // Si le match vient d'être terminé, calculer immédiatement les points
      if (justFinished && matchData.setsHome !== undefined && matchData.setsAway !== undefined) {
        try {
          const { PredictionsService } = await import('../predictions/predictions.service');
          const predictionsService = new PredictionsService();
          await predictionsService.calculatePointsForMatch(existingMatch.id);
          logger.info(`✅ Points calculés immédiatement pour le match ${existingMatch.id}`);
        } catch (error) {
          logger.error(`❌ Erreur lors du calcul des points pour le match ${existingMatch.id}:`, error);
          // Ne pas faire échouer la synchronisation si le calcul des points échoue
        }
      }
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
