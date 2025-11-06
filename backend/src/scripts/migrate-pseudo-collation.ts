import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Modification du collation de la colonne pseudo...');
  
  try {
    // Récupérer la taille actuelle de la colonne pseudo
    const columnInfo = await prisma.$queryRawUnsafe<Array<{
      COLUMN_NAME: string;
      COLUMN_TYPE: string;
      CHARACTER_SET_NAME: string;
      COLLATION_NAME: string;
    }>>(`
      SELECT COLUMN_NAME, COLUMN_TYPE, CHARACTER_SET_NAME, COLLATION_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'User'
      AND COLUMN_NAME = 'pseudo'
    `);
    
    if (columnInfo.length === 0) {
      throw new Error('Colonne pseudo non trouvée');
    }
    
    const currentType = columnInfo[0].COLUMN_TYPE;
    console.log(`   Type actuel de la colonne: ${currentType}`);
    console.log(`   Collation actuel: ${columnInfo[0].COLLATION_NAME}`);
    
    // Extraire la taille du VARCHAR (ex: VARCHAR(191) -> 191)
    const sizeMatch = currentType.match(/VARCHAR\((\d+)\)/);
    const size = sizeMatch ? sizeMatch[1] : '191'; // Par défaut 191 si non trouvé
    
    // Modifier le collation de la colonne pseudo pour qu'elle soit sensible à la casse
    // Utilisation de utf8mb4_bin pour une comparaison binaire (sensible à la casse)
    await prisma.$executeRawUnsafe(`
      ALTER TABLE User 
      MODIFY COLUMN pseudo VARCHAR(${size}) 
      CHARACTER SET utf8mb4 
      COLLATE utf8mb4_bin 
      NOT NULL
    `);
    
    console.log('✅ Collation de la colonne pseudo modifié avec succès');
    console.log('   La colonne pseudo utilise maintenant utf8mb4_bin (sensible à la casse)');
    console.log('   "Lrd" et "lrd" seront maintenant considérés comme différents');
  } catch (error: any) {
    console.error('❌ Erreur lors de la modification du collation:', error.message);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

