const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function makeAdmin() {
  try {
    // Récupérer l'email depuis les arguments de ligne de commande
    const email = process.argv[2];
    
    if (!email) {
      console.error('❌ Erreur: Veuillez fournir un email en argument');
      console.log('Usage: node make-admin.js <email>');
      process.exit(1);
    }

    console.log('🔧 Mise à jour de l\'utilisateur en admin...');
    
    const user = await prisma.user.update({
      where: {
        email: email
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
    if (error.code === 'P2025') {
      console.error('   Utilisateur non trouvé avec cet email');
    }
  } finally {
    await prisma.$disconnect();
  }
}

makeAdmin();


