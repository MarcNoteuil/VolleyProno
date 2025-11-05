import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seeding...');

  // Nettoyer la base de données
  await prisma.prediction.deleteMany();
  await prisma.match.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.group.deleteMany();
  await prisma.user.deleteMany();

  // Créer des utilisateurs
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'admin@volleyprono.com',
        pseudo: 'Admin',
        passwordHash: await bcrypt.hash('password123', 12)
      }
    }),
    prisma.user.create({
      data: {
        email: 'alice@example.com',
        pseudo: 'Alice',
        passwordHash: await bcrypt.hash('password123', 12)
      }
    }),
    prisma.user.create({
      data: {
        email: 'bob@example.com',
        pseudo: 'Bob',
        passwordHash: await bcrypt.hash('password123', 12)
      }
    }),
    prisma.user.create({
      data: {
        email: 'charlie@example.com',
        pseudo: 'Charlie',
        passwordHash: await bcrypt.hash('password123', 12)
      }
    })
  ]);

  console.log(`✅ ${users.length} utilisateurs créés`);

  // Créer des groupes
  const groups = await Promise.all([
    prisma.group.create({
      data: {
        name: 'Championnat Pro A 2024',
        inviteCode: 'PROA2024',
        ffvbSourceUrl: 'https://www.ffvb.org/competition/pro-a-2024',
        createdByUserId: users[0].id
      }
    }),
    prisma.group.create({
      data: {
        name: 'Ligue B Masculine',
        inviteCode: 'LIGUEB2024',
        ffvbSourceUrl: 'https://www.ffvb.org/competition/ligue-b-masculine',
        createdByUserId: users[1].id
      }
    })
  ]);

  console.log(`✅ ${groups.length} groupes créés`);

  // Ajouter des membres aux groupes
  await Promise.all([
    // Groupe 1 - Admin (owner), Alice, Bob, Charlie
    prisma.groupMember.create({
      data: {
        userId: users[0].id,
        groupId: groups[0].id,
        role: 'OWNER'
      }
    }),
    prisma.groupMember.create({
      data: {
        userId: users[1].id,
        groupId: groups[0].id,
        role: 'MEMBER'
      }
    }),
    prisma.groupMember.create({
      data: {
        userId: users[2].id,
        groupId: groups[0].id,
        role: 'MEMBER'
      }
    }),
    prisma.groupMember.create({
      data: {
        userId: users[3].id,
        groupId: groups[0].id,
        role: 'MEMBER'
      }
    }),
    // Groupe 2 - Alice (owner), Bob, Charlie
    prisma.groupMember.create({
      data: {
        userId: users[1].id,
        groupId: groups[1].id,
        role: 'OWNER'
      }
    }),
    prisma.groupMember.create({
      data: {
        userId: users[2].id,
        groupId: groups[1].id,
        role: 'MEMBER'
      }
    }),
    prisma.groupMember.create({
      data: {
        userId: users[3].id,
        groupId: groups[1].id,
        role: 'MEMBER'
      }
    })
  ]);

  console.log('✅ Membres ajoutés aux groupes');

  // Créer des matchs
  const now = new Date();
  const matches = await Promise.all([
    // Matchs passés (terminés)
    prisma.match.create({
      data: {
        groupId: groups[0].id,
        homeTeam: 'Tours VB',
        awayTeam: 'Chaumont VB 52',
        startAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 jours avant
        status: 'FINISHED',
        setsHome: 3,
        setsAway: 1,
        isLocked: true,
        lockedAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000)
      }
    }),
    prisma.match.create({
      data: {
        groupId: groups[0].id,
        homeTeam: 'Paris Volley',
        awayTeam: 'Nantes Rezé',
        startAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 jours avant
        status: 'FINISHED',
        setsHome: 2,
        setsAway: 3,
        isLocked: true,
        lockedAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
      }
    }),
    // Matchs à venir
    prisma.match.create({
      data: {
        groupId: groups[0].id,
        homeTeam: 'Montpellier UC',
        awayTeam: 'Cannes',
        startAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 jours après
        status: 'SCHEDULED',
        isLocked: false
      }
    }),
    prisma.match.create({
      data: {
        groupId: groups[0].id,
        homeTeam: 'Poitiers',
        awayTeam: 'Sète',
        startAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 jours après
        status: 'SCHEDULED',
        isLocked: false
      }
    }),
    // Matchs pour le groupe 2
    prisma.match.create({
      data: {
        groupId: groups[1].id,
        homeTeam: 'Lyon VB',
        awayTeam: 'Nice VB',
        startAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 jours après
        status: 'SCHEDULED',
        isLocked: false
      }
    })
  ]);

  console.log(`✅ ${matches.length} matchs créés`);

  // Créer des pronostics
  const predictions = await Promise.all([
    // Pronostics pour le match Tours vs Chaumont (terminé)
    prisma.prediction.create({
      data: {
        userId: users[1].id, // Alice
        matchId: matches[0].id,
        predictedHome: 3,
        predictedAway: 1,
        pointsAwarded: 5 // Score exact
      }
    }),
    prisma.prediction.create({
      data: {
        userId: users[2].id, // Bob
        matchId: matches[0].id,
        predictedHome: 3,
        predictedAway: 0,
        pointsAwarded: 2 // Bon vainqueur
      }
    }),
    prisma.prediction.create({
      data: {
        userId: users[3].id, // Charlie
        matchId: matches[0].id,
        predictedHome: 2,
        predictedAway: 3,
        pointsAwarded: 0 // Mauvais pronostic
      }
    }),
    // Pronostics pour le match Paris vs Nantes (terminé)
    prisma.prediction.create({
      data: {
        userId: users[1].id, // Alice
        matchId: matches[1].id,
        predictedHome: 1,
        predictedAway: 3,
        pointsAwarded: 2 // Bon vainqueur
      }
    }),
    prisma.prediction.create({
      data: {
        userId: users[2].id, // Bob
        matchId: matches[1].id,
        predictedHome: 2,
        predictedAway: 3,
        pointsAwarded: 2 // Bon vainqueur
      }
    }),
    prisma.prediction.create({
      data: {
        userId: users[3].id, // Charlie
        matchId: matches[1].id,
        predictedHome: 3,
        predictedAway: 1,
        pointsAwarded: 0 // Mauvais pronostic
      }
    }),
    // Pronostics pour le match Montpellier vs Cannes (à venir)
    prisma.prediction.create({
      data: {
        userId: users[1].id, // Alice
        matchId: matches[2].id,
        predictedHome: 3,
        predictedAway: 1
      }
    }),
    prisma.prediction.create({
      data: {
        userId: users[2].id, // Bob
        matchId: matches[2].id,
        predictedHome: 2,
        predictedAway: 3
      }
    }),
    prisma.prediction.create({
      data: {
        userId: users[3].id, // Charlie
        matchId: matches[2].id,
        predictedHome: 3,
        predictedAway: 0
      }
    })
  ]);

  console.log(`✅ ${predictions.length} pronostics créés`);

  console.log('🎉 Seeding terminé avec succès !');
  console.log('\n📊 Résumé des données créées :');
  console.log(`- ${users.length} utilisateurs`);
  console.log(`- ${groups.length} groupes`);
  console.log(`- ${matches.length} matchs`);
  console.log(`- ${predictions.length} pronostics`);
  console.log('\n🔑 Codes d\'invitation :');
  console.log(`- Groupe 1: ${groups[0].inviteCode}`);
  console.log(`- Groupe 2: ${groups[1].inviteCode}`);
  console.log('\n👥 Comptes de test :');
  console.log('- admin@volleyprono.com / password123');
  console.log('- alice@example.com / password123');
  console.log('- bob@example.com / password123');
  console.log('- charlie@example.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
