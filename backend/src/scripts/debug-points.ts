import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'mysql://volley:volley@mysql:3306/volleyprono'
    }
  }
});

async function debugPoints() {
  try {
    // Trouver le match "Sporting Club Nord Parisien" vs "I.a.f.v.o." avec score 0-3
    const match = await prisma.match.findFirst({
      where: {
        homeTeam: { contains: 'Sporting Club Nord Parisien' },
        awayTeam: { contains: 'I.a.f.v.o.' },
        setsHome: 0,
        setsAway: 3,
        status: 'FINISHED'
      },
      include: {
        predictions: {
          include: {
            user: {
              select: {
                pseudo: true
              }
            }
          }
        }
      }
    });

    if (!match) {
      console.log('❌ Match non trouvé');
      return;
    }

    console.log(`\n🎯 Match trouvé: ${match.homeTeam} vs ${match.awayTeam}`);
    console.log(`   Score réel: ${match.setsHome}-${match.setsAway}`);
    console.log(`   Status: ${match.status}`);
    console.log(`   Nombre de pronostics: ${match.predictions.length}\n`);

    const actualHome = match.setsHome;
    const actualAway = match.setsAway;
    const actualHomeNum = Number(actualHome);
    const actualAwayNum = Number(actualAway);

    console.log(`   actualHome (type: ${typeof actualHome}, value: ${actualHome})`);
    console.log(`   actualAway (type: ${typeof actualAway}, value: ${actualAway})`);
    console.log(`   actualHomeNum: ${actualHomeNum}`);
    console.log(`   actualAwayNum: ${actualAwayNum}\n`);

    for (const prediction of match.predictions) {
      const predictedHome = Number(prediction.predictedHome);
      const predictedAway = Number(prediction.predictedAway);
      
      console.log(`\n📊 Pronostic de ${prediction.user.pseudo}:`);
      console.log(`   Prédit: ${prediction.predictedHome}-${prediction.predictedAway}`);
      console.log(`   predictedHome (type: ${typeof prediction.predictedHome}, value: ${prediction.predictedHome})`);
      console.log(`   predictedAway (type: ${typeof prediction.predictedAway}, value: ${prediction.predictedAway})`);
      console.log(`   predictedHome (Number): ${predictedHome}`);
      console.log(`   predictedAway (Number): ${predictedAway}`);
      console.log(`   Points actuels: ${prediction.pointsAwarded ?? 'null'}`);
      console.log(`   Mode risqué: ${prediction.isRisky}`);
      
      // Test de comparaison
      console.log(`\n   🔍 Tests de comparaison:`);
      console.log(`      predictedHome === actualHomeNum: ${predictedHome === actualHomeNum}`);
      console.log(`      predictedAway === actualAwayNum: ${predictedAway === actualAwayNum}`);
      console.log(`      predictedHome == actualHomeNum: ${predictedHome == actualHomeNum}`);
      console.log(`      predictedAway == actualAwayNum: ${predictedAway == actualAwayNum}`);
      
      // Calcul manuel
      let points = 0;
      if (predictedHome === actualHomeNum && predictedAway === actualAwayNum) {
        points = 3;
        console.log(`      ✅ Score exact → ${points} pts`);
      } else if (
        (actualHomeNum > actualAwayNum && predictedHome > predictedAway) ||
        (actualAwayNum > actualHomeNum && predictedAway > predictedHome)
      ) {
        points = 1;
        console.log(`      ✅ Bon vainqueur → ${points} pt`);
      } else {
        points = 0;
        console.log(`      ❌ Vainqueur incorrect → ${points} pt`);
      }
      
      console.log(`   Points calculés manuellement: ${points}`);
      console.log(`   Points en base: ${prediction.pointsAwarded ?? 'null'}`);
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugPoints();

