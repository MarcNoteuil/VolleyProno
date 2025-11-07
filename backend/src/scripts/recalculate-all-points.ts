import { PrismaClient } from '@prisma/client';
import { PredictionsService } from '../predictions/predictions.service';

const prisma = new PrismaClient();
const predictionsService = new PredictionsService();

async function recalculateAllPoints() {
  try {
    console.log('🔄 Début du recalcul de tous les points...');
    
    // Récupérer tous les matchs terminés
    const finishedMatches = await prisma.match.findMany({
      where: {
        status: 'FINISHED',
        setsHome: { not: null },
        setsAway: { not: null }
      },
      select: {
        id: true,
        homeTeam: true,
        awayTeam: true,
        setsHome: true,
        setsAway: true
      }
    });

    console.log(`📊 ${finishedMatches.length} match(s) terminé(s) trouvé(s)`);

    let successCount = 0;
    let errorCount = 0;

    for (const match of finishedMatches) {
      try {
        console.log(`\n🎯 Recalcul des points pour : ${match.homeTeam} vs ${match.awayTeam} (${match.setsHome}-${match.setsAway})`);
        await predictionsService.calculatePointsForMatch(match.id);
        successCount++;
        console.log(`✅ Points recalculés avec succès`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Erreur pour le match ${match.id}:`, error instanceof Error ? error.message : error);
      }
    }

    console.log(`\n📈 Résumé :`);
    console.log(`   ✅ ${successCount} match(s) recalculé(s) avec succès`);
    console.log(`   ❌ ${errorCount} erreur(s)`);
    console.log(`\n✨ Recalcul terminé !`);

  } catch (error) {
    console.error('❌ Erreur lors du recalcul :', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

recalculateAllPoints();

