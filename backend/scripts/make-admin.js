const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function makeAdmin() {
  try {
    console.log('🔧 Mise à jour de l\'utilisateur en admin...');
    
    const user = await prisma.user.update({
      where: {
        email: 'noteuil.marc@gmail.com'
      },
      data: {
        role: 'ADMIN'
      }
    });

    console.log('✅ Utilisateur mis à jour:', {
      email: user.email,
      pseudo: user.pseudo,
      role: user.role
    });
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

makeAdmin();


