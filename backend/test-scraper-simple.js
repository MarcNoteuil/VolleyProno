const puppeteer = require('puppeteer');

async function testScraper() {
  console.log('🧪 Test du scraper FFVB...');
  
  let browser;
  try {
    console.log('🤖 Lancement de Puppeteer...');
    
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // Configurer la page
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    const url = 'https://www.ffvbbeach.org/ffvbapp/resu/seniors/2025-2026/index_3ma.htm';
    console.log('🌐 Navigation vers:', url);
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Attendre que le contenu dynamique se charge
    console.log('⏳ Attente du chargement du contenu dynamique...');
    await page.waitForTimeout(5000);

    // Extraire le contenu HTML après chargement dynamique
    const html = await page.content();
    console.log(`📄 Contenu HTML récupéré: ${html.length} caractères`);

    // Chercher des éléments de match
    const matchElements = await page.$$('table tr');
    console.log(`🔍 Trouvé ${matchElements.length} lignes de tableau`);

    // Chercher du texte qui ressemble à des matchs
    const text = await page.evaluate(() => {
      return document.body.innerText;
    });
    
    console.log('📋 Contenu de la page:');
    console.log(text.substring(0, 1000) + '...');

    return { success: true, elements: matchElements.length, textLength: text.length };
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    return { success: false, error: error.message };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testScraper().then(result => {
  console.log('🎯 Résultat:', result);
});

