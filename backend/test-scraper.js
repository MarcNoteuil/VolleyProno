const { FFVBScraper } = require('./src/utils/ffvbScraper.ts');

async function testScraper() {
  console.log('🧪 Test du scraper FFVB...');
  
  const scraper = new FFVBScraper();
  const url = 'https://www.ffvbbeach.org/ffvbapp/resu/seniors/2025-2026/index_3ma.htm';
  
  try {
    const matches = await scraper.scrapeGroupMatches(url);
    console.log(`✅ ${matches.length} matchs trouvés`);
    console.log('Matchs:', JSON.stringify(matches, null, 2));
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

testScraper();

