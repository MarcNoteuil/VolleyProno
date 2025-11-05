import { FFVBScraper } from './src/utils/ffvbScraper';

async function testScraper() {
  console.log('🧪 Test du scraper FFVB avec la nouvelle approche...');
  console.log('');
  
  const scraper = new FFVBScraper();
  // URL de test depuis l'image : https://www.ffvbbeach.org/ffvbapp/resu/seniors/2025-2026/index_3ma.htm
  const url = 'https://www.ffvbbeach.org/ffvbapp/resu/seniors/2025-2026/index_3ma.htm';
  
  console.log('📍 URL source:', url);
  console.log('');
  
  try {
    const matches = await scraper.scrapeGroupMatches(url);
    
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log(`✅ ${matches.length} matchs trouvés`);
    console.log('═══════════════════════════════════════');
    console.log('');
    
    if (matches.length > 0) {
      console.log('📋 Exemples de matchs trouvés:');
      console.log('');
      matches.slice(0, 5).forEach((match, index) => {
        console.log(`\n${index + 1}. ${match.homeTeam} vs ${match.awayTeam}`);
        console.log(`   Date: ${match.startAt.toLocaleString('fr-FR')}`);
        console.log(`   Statut: ${match.status}`);
        if (match.setsHome !== undefined && match.setsAway !== undefined) {
          console.log(`   Score: ${match.setsHome}-${match.setsAway}`);
        }
        if (match.ffvbMatchId) {
          console.log(`   ID FFVB: ${match.ffvbMatchId}`);
        }
      });
      
      if (matches.length > 5) {
        console.log(`\n... et ${matches.length - 5} autres matchs`);
      }
      
      console.log('');
      console.log('📄 Format JSON complet:');
      console.log(JSON.stringify(matches, null, 2));
    } else {
      console.log('⚠️ Aucun match trouvé. Vérifiez:');
      console.log('   - Que l\'URL est correcte');
      console.log('   - Que l\'endpoint PHP est accessible');
      console.log('   - Que les paramètres sont corrects');
    }
  } catch (error) {
    console.error('');
    console.error('❌ Erreur lors du test:');
    console.error(error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
      if (error.stack) {
        console.error('Stack:', error.stack);
      }
    }
    process.exit(1);
  }
}

// Exécuter le test
testScraper();

