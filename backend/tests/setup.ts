import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'mysql://test:test@localhost:3306/volleyprono_test'
    }
  }
});

// Nettoyer la base de données avant chaque test
beforeEach(async () => {
  await prisma.prediction.deleteMany();
  await prisma.match.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.group.deleteMany();
  await prisma.user.deleteMany();
});

// Fermer la connexion après tous les tests
afterAll(async () => {
  await prisma.$disconnect();
});

export { prisma };
