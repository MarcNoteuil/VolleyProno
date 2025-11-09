import { PrismaClient } from '@prisma/client';
import { PredictionsService } from '../predictions/predictions.service';

// Utiliser directement les variables d'environnement du conteneur Docker
// Le docker-compose.yml définit déjà DATABASE_URL avec mysql:3306
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'mysql://volley:volley@mysql:3306/volleyprono'
    }
  }
});
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
      include: {
        predictions: true
      }
    });

    console.log(`📊 ${finishedMatches.length} match(s) terminé(s) trouvé(s)`);

    let successCount = 0;
    let errorCount = 0;

    for (const match of finishedMatches) {
      try {
        // Vérifier s'il y a des prédictions pour ce match
        const predictionsCount = await prisma.prediction.count({
          where: { matchId: match.id }
        });
        
        if (predictionsCount === 0) {
          console.log(`⏭️  Pas de prédictions pour : ${match.homeTeam} vs ${match.awayTeam}`);
          continue;
        }
        
        console.log(`\n🎯 Recalcul des points pour : ${match.homeTeam} vs ${match.awayTeam} (${match.setsHome}-${match.setsAway}) - ${predictionsCount} prédiction(s)`);
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

