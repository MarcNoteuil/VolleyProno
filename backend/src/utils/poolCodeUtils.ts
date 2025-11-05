import { FFVBScraper } from './ffvbScraper';

/**
 * Vérifie si l'entrée est une URL complète ou un code court
 */
export function isFullUrl(input: string): boolean {
  return input.trim().startsWith('http://') || input.trim().startsWith('https://');
}

/**
 * Génère l'URL FFVB à partir d'un code de poule (format court pour pro/nationale 3)
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
 * Valide qu'une URL complète est un endpoint FFVB valide
 * Accepte soit vbspo_calendrier.php (régionales/départementales) soit index_*.htm (pro/nationale/coupes)
 */
export function validateFullUrl(url: string): { valid: boolean; message?: string } {
  try {
    const urlObj = new URL(url);
    
    // CAS 1: Endpoint PHP direct (régionales/départementales)
    if (urlObj.pathname.includes('vbspo_calendrier.php')) {
      // Vérifier la présence des paramètres essentiels
      const saison = urlObj.searchParams.get('saison');
      const poule = urlObj.searchParams.get('poule');
      
      if (!saison || !poule) {
        return {
          valid: false,
          message: 'L\'URL doit contenir les paramètres saison et poule'
        };
      }
      
      return { valid: true };
    }
    
    // CAS 2: Page HTML (index_*.htm pour pro/nationale/coupes)
    if (urlObj.pathname.includes('index_') && urlObj.pathname.endsWith('.htm')) {
      // Les pages index_*.htm sont valides (ex: index_3mb.htm, index_com.htm)
      return { valid: true };
    }
    
    // Si ce n'est ni un endpoint PHP ni une page index, c'est invalide
    return {
      valid: false,
      message: 'L\'URL doit pointer vers vbspo_calendrier.php ou une page index_*.htm'
    };
  } catch (error) {
    return {
      valid: false,
      message: 'URL invalide'
    };
  }
}

/**
 * Teste si des matchs sont disponibles pour un code de poule donné (format court)
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

/**
 * Teste si une URL complète retourne des matchs
 * Utilisé pour les poules régionales/départementales et les Coupes de France
 */
export async function testFullUrl(url: string): Promise<{ success: boolean; matchCount: number; url: string; message?: string }> {
  try {
    // Valider d'abord le format de l'URL
    const validation = validateFullUrl(url);
    if (!validation.valid) {
      return {
        success: false,
        matchCount: 0,
        url,
        message: validation.message
      };
    }
    
    const scraper = new FFVBScraper();
    
    // Pour toutes les URLs valides (PHP ou HTML), on peut les scraper directement
    // Le scraper gère automatiquement les frames pour les Coupes de France
    const matches = await scraper.scrapeGroupMatches(url);
    
    return {
      success: matches.length > 0,
      matchCount: matches.length,
      url: url // Conserver l'URL originale
    };
  } catch (error) {
    console.error('Erreur lors du test de l\'URL complète:', error);
    return {
      success: false,
      matchCount: 0,
      url,
      message: error instanceof Error ? error.message : 'Erreur lors du test de l\'URL'
    };
  }
}

