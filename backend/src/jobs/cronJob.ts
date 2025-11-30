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
      // Utiliser setImmediate pour éviter de bloquer le processus
      setImmediate(async () => {
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
    }, {
      scheduled: true,
      timezone: 'Europe/Paris'
    });
  }

  /**
   * Job pour synchroniser les matchs FFVB
   * Exécuté toutes les 10 minutes pour détecter rapidement les matchs terminés
   * Utilise setImmediate pour éviter de bloquer le processus
   */
  private startSyncFFVBJob() {
    // Synchronisation immédiate au démarrage
    setImmediate(async () => {
      await this.syncAllGroups();
    });

    // Puis toutes les 10 minutes
    cron.schedule('*/10 * * * *', async () => {
      // Utiliser setImmediate pour éviter de bloquer le processus et causer des "missed execution"
      setImmediate(async () => {
        await this.syncAllGroups();
      });
    }, {
      scheduled: true,
      timezone: 'Europe/Paris'
    });
  }

  /**
   * Synchronise tous les groupes avec FFVB
   */
  private async syncAllGroups() {
    try {
      logger.info('🔄 Début de la synchronisation FFVB automatique');
      
      const groups = await prisma.group.findMany({
        where: {
          ffvbSourceUrl: {
            not: null
          },
          deletedAt: null // Exclure les groupes supprimés
        }
      });

      if (groups.length === 0) {
        logger.info('Aucun groupe avec URL FFVB à synchroniser');
        return;
      }

      logger.info(`${groups.length} groupe(s) à synchroniser`);

      let totalMatches = 0;
      let totalUpdated = 0;
      let totalCreated = 0;

      for (const group of groups) {
        if (!group.ffvbSourceUrl) continue;

        try {
          logger.info(`📡 Synchronisation du groupe "${group.name}" (${group.id})`);
          
          const matches = await this.ffvbScraper.scrapeGroupMatches(group.ffvbSourceUrl);
          totalMatches += matches.length;
          
          let created = 0;
          let updated = 0;

          for (const matchData of matches) {
            const result = await this.syncMatch(group.id, matchData);
            if (result === 'created') created++;
            if (result === 'updated') updated++;
          }
          
          totalCreated += created;
          totalUpdated += updated;
          
          logger.info(`✅ Groupe "${group.name}": ${matches.length} match(s) trouvé(s), ${created} créé(s), ${updated} mis à jour`);
        } catch (error) {
          logger.error(`❌ Erreur lors de la sync du groupe "${group.name}":`, error);
        }
      }

      logger.info(`✅ Synchronisation FFVB terminée: ${totalMatches} match(s) au total, ${totalCreated} créé(s), ${totalUpdated} mis à jour`);
    } catch (error) {
      logger.error('❌ Erreur lors de la synchronisation FFVB:', error);
    }
  }

  /**
   * Job pour calculer les points des matchs terminés (sécurité en cas d'échec du calcul automatique)
   * Exécuté toutes les 30 minutes pour rattraper les matchs qui n'auraient pas été calculés
   */
  private startCalculatePointsJob() {
    cron.schedule('*/30 * * * *', async () => {
      // Utiliser setImmediate pour éviter de bloquer le processus
      setImmediate(async () => {
      try {
        logger.info('Début du calcul des points');
        
        const finishedMatches = await prisma.match.findMany({
          where: {
            status: 'FINISHED',
            setsHome: { not: null },
            setsAway: { not: null }
          },
          include: {
            predictions: true // Inclure TOUTES les prédictions pour recalculer même si points déjà calculés
          }
        });

        for (const match of finishedMatches) {
          // Filtrer les prédictions qui n'ont pas encore de points calculés
          const predictionsToRecalculate = match.predictions.filter(p => p.pointsAwarded === null);
          
          // Si toutes les prédictions ont déjà des points, on ne recalcule pas (sauf si c'est un recalcul manuel)
          if (predictionsToRecalculate.length === 0) continue;

          try {
            // Utiliser le service de prédictions qui prend en compte le mode risqué
            // Le service recalcule TOUTES les prédictions du match
            await this.predictionsService.calculatePointsForMatch(match.id);
            logger.info(`Points calculés pour le match ${match.id} (${match.homeTeam} vs ${match.awayTeam}) - ${match.predictions.length} prédictions, ${predictionsToRecalculate.length} à calculer`);
          } catch (error) {
            logger.error(`Erreur lors du calcul des points pour le match ${match.id}:`, error);
          }
        }

        logger.info(`Points calculés pour ${finishedMatches.length} matchs`);
      } catch (error) {
        logger.error('Erreur lors du calcul des points:', error);
      }
      });
    }, {
      scheduled: true,
      timezone: 'Europe/Paris'
    });
  }

  /**
   * Synchronise un match avec les données FFVB
   * @returns 'created' si nouveau match, 'updated' si match mis à jour, null sinon
   */
  private async syncMatch(groupId: string, matchData: any): Promise<'created' | 'updated' | null> {
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
      },
      include: {
        predictions: {
          select: {
            id: true,
            pointsAwarded: true
          }
        }
      }
    });

    if (existingMatch) {
      // Vérifier si le match vient d'être terminé (passage de SCHEDULED/IN_PROGRESS à FINISHED)
      const wasFinished = existingMatch.status === 'FINISHED';
      const isNowFinished = matchData.status === 'FINISHED';
      const justFinished = !wasFinished && isNowFinished;
      
      // Vérifier si les scores viennent d'être mis à jour (même si le match était déjà FINISHED)
      const hadScores = existingMatch.setsHome !== null && existingMatch.setsHome !== undefined && 
                        existingMatch.setsAway !== null && existingMatch.setsAway !== undefined;
      const hasNewScores = matchData.setsHome !== null && matchData.setsHome !== undefined && 
                           matchData.setsAway !== null && matchData.setsAway !== undefined;
      const scoresJustUpdated = !hadScores && hasNewScores;
      
      // Vérifier si les scores ont changé (même si le match était déjà FINISHED)
      const scoresChanged = hadScores && hasNewScores && 
                           (existingMatch.setsHome !== matchData.setsHome || existingMatch.setsAway !== matchData.setsAway);
      
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
      
      // Calculer les points si :
      // 1. Le match vient d'être terminé (justFinished)
      // 2. Les scores viennent d'être mis à jour (scoresJustUpdated)
      // 3. Les scores ont changé (scoresChanged)
      // 4. Le match est terminé mais n'a pas encore de points calculés pour toutes les prédictions
      const needsPointCalculation = isNowFinished && hasNewScores && 
        (justFinished || scoresJustUpdated || scoresChanged || 
         existingMatch.predictions.some(p => p.pointsAwarded === null));
      
      if (needsPointCalculation) {
        try {
          const { PredictionsService } = await import('../predictions/predictions.service');
          const predictionsService = new PredictionsService();
          await predictionsService.calculatePointsForMatch(existingMatch.id);
          logger.info(`✅ Points calculés immédiatement pour le match ${existingMatch.id} (${existingMatch.homeTeam} vs ${existingMatch.awayTeam})`);
        } catch (error) {
          logger.error(`❌ Erreur lors du calcul des points pour le match ${existingMatch.id}:`, error);
          // Ne pas faire échouer la synchronisation si le calcul des points échoue
        }
      }

      return 'updated';
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
      return 'created';
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
