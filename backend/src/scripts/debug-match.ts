import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'mysql://volley:volley@mysql:3306/volleyprono'
    }
  }
});

async function debugMatch() {
  try {
    // Chercher le match "Sporting Club Nord Parisien vs I.a.f.v.o."
    const match = await prisma.match.findFirst({
      where: {
        OR: [
          { homeTeam: { contains: 'Sporting Club Nord Parisien' } },
          { awayTeam: { contains: 'I.a.f.v.o.' } }
        ]
      },
      include: {
        predictions: {
          include: {
            user: {
              select: {
                pseudo: true,
                firstName: true
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

    console.log('\n📊 Informations du match:');
    console.log(`   ID: ${match.id}`);
    console.log(`   ${match.homeTeam} vs ${match.awayTeam}`);
    console.log(`   Statut: ${match.status}`);
    console.log(`   Sets: ${match.setsHome} - ${match.setsAway}`);
    console.log(`   SetScores:`, match.setScores);
    console.log(`   Nombre de prédictions: ${match.predictions.length}`);

    console.log('\n📋 Prédictions:');
    match.predictions.forEach(pred => {
      console.log(`   - ${pred.user.pseudo || pred.user.firstName}: ${pred.predictedHome}-${pred.predictedAway} (Risky: ${pred.isRisky}) → ${pred.pointsAwarded ?? 'non calculé'} pts`);
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugMatch();

