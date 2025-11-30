"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL || 'mysql://test:test@localhost:3306/volleyprono_test'
        }
    }
});
exports.prisma = prisma;
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
