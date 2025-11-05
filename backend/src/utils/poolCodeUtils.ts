import { FFVBScraper } from './ffvbScraper';

/**
 * Génère l'URL FFVB à partir d'un code de poule
 * Format attendu : https://www.ffvbbeach.org/ffvbapp/resu/seniors/2025-2026/index_{code}.htm
 */
export function generatePoolUrl(poolCode: string): string {
  // Normaliser le code (minuscules, sans espaces)
  const normalizedCode = poolCode.trim().toLowerCase().replace(/\s+/g, '');
  
  // Déterminer l'année de saison (2025-2026 pour la saison actuelle)
  const currentYear = new Date().getFullYear();
  const month = new Date().getMonth(); // 0-11
  // Si on est entre septembre et décembre, on est dans la saison année-année+1
  // Sinon, on est dans la saison année-1-année
  const seasonStart = month >= 8 ? currentYear : currentYear - 1;
  const seasonEnd = seasonStart + 1;
  const season = `${seasonStart}-${seasonEnd}`;
  
  return `https://www.ffvbbeach.org/ffvbapp/resu/seniors/${season}/index_${normalizedCode}.htm`;
}

/**
 * Teste si des matchs sont disponibles pour un code de poule donné
 * Retourne le nombre de matchs trouvés ou 0 si aucun match
 */
export async function testPoolCode(poolCode: string): Promise<{ success: boolean; matchCount: number; url: string }> {
  try {
    const url = generatePoolUrl(poolCode);
    const scraper = new FFVBScraper();
    
    // Tenter de récupérer les matchs
    const matches = await scraper.scrapeGroupMatches(url);
    
    return {
      success: matches.length > 0,
      matchCount: matches.length,
      url
    };
  } catch (error) {
    console.error('Erreur lors du test du code de poule:', error);
    return {
      success: false,
      matchCount: 0,
      url: generatePoolUrl(poolCode)
    };
  }
}

