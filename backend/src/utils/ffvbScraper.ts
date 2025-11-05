import axios from 'axios';
import * as cheerio from 'cheerio';

export interface SetScore {
  home: number;
  away: number;
}

export interface FFVBMatch {
  ffvbMatchId?: string;
  homeTeam: string;
  awayTeam: string;
  startAt: Date;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELED';
  setsHome?: number;
  setsAway?: number;
  setScores?: SetScore[]; // Scores détaillés par set (ex: [{home: 25, away: 14}, {home: 25, away: 17}])
}

export class FFVBScraper {
  private baseUrl = 'https://www.ffvb.org';

  async scrapeGroupMatches(groupUrl: string): Promise<FFVBMatch[]> {
    try {
      console.log('🔍 Début du scraping FFVB:', groupUrl);
      
      // Détecter si c'est une Coupe de France (index_com.htm)
      const isCoupeFrance = groupUrl.includes('index_com.htm') || groupUrl.includes('index_com');
      
      let matches: FFVBMatch[] = [];
      
      // Pour les Coupes de France, essayer d'abord la méthode classique (frames)
      // puis l'endpoint PHP en fallback
      if (isCoupeFrance) {
        console.log('🏆 Coupe de France détectée, tentative avec méthode classique (frames) d\'abord...');
        matches = await this.scrapePage(groupUrl);
        console.log(`📡 Scraping classique (frames) a trouvé ${matches.length} matchs`);
        
        // Si pas de matchs trouvés, essayer l'endpoint PHP
        if (matches.length === 0) {
          console.log('⚠️ Aucun match trouvé via les frames, essai avec l\'endpoint PHP...');
          matches = await this.scrapeCalendarEndpoint(groupUrl);
          console.log(`📡 Endpoint PHP a trouvé ${matches.length} matchs`);
        }
      } else {
        // Pour les autres poules, essayer d'abord l'endpoint PHP
        matches = await this.scrapeCalendarEndpoint(groupUrl);
        console.log(`📡 Endpoint PHP a trouvé ${matches.length} matchs`);
        
        // Si pas de matchs trouvés, essayer l'approche classique en fallback
        if (matches.length === 0) {
          console.log('⚠️ Aucun match trouvé via l\'endpoint PHP, essai de la méthode classique...');
          matches = await this.scrapePage(groupUrl);
          console.log(`📡 Scraping classique a trouvé ${matches.length} matchs`);
        }
      }

      console.log(`🎯 Total de ${matches.length} matchs extraits`);
      if (matches.length > 0) {
        console.log('📋 Premier match:', JSON.stringify(matches[0], null, 2));
      }
      return matches;
    } catch (error) {
      console.error('❌ Erreur lors du scraping FFVB:', error);
      throw new Error('Impossible de récupérer les données FFVB');
    }
  }

  /**
   * Construit et appelle l'endpoint PHP vbspo_calendrier.php
   * C'est l'endpoint qui charge dynamiquement les données du calendrier
   */
  private async scrapeCalendarEndpoint(groupUrl: string): Promise<FFVBMatch[]> {
    try {
      // Vérifier si l'URL est déjà un endpoint PHP direct
      const urlObj = new URL(groupUrl);
      const isDirectEndpoint = urlObj.pathname.includes('vbspo_calendrier.php');
      
      // Extraire les paramètres de l'URL source
      let urlParams = this.extractUrlParameters(groupUrl);
      if (!urlParams) {
        console.log('⚠️ Impossible d\'extraire les paramètres de l\'URL');
        return [];
      }

      // Si le codent n'est pas dans l'URL et que ce n'est pas un endpoint direct, essayer de le trouver dans la page HTML
      // Pour les endpoints directs, le codent devrait être dans l'URL
      // Pour les Coupes de France (poule = COM), le codent peut ne pas être nécessaire
      const isCoupeFrance = urlParams.poule?.toUpperCase() === 'COM';
      
      if (!urlParams.codent && !isDirectEndpoint && !isCoupeFrance) {
        console.log('🔍 Recherche du codent dans la page HTML...');
        urlParams.codent = await this.extractCodentFromPage(groupUrl);
        if (urlParams.codent) {
          console.log('✅ Codent trouvé:', urlParams.codent);
        } else {
          console.log('⚠️ Codent non trouvé, on continue sans');
        }
      } else if (isDirectEndpoint && !urlParams.codent) {
        console.log('⚠️ Endpoint PHP direct mais codent manquant dans l\'URL');
      } else if (isCoupeFrance) {
        console.log('🏆 Coupe de France détectée (poule=COM), codent peut ne pas être nécessaire');
      }

      // Construire l'URL de l'endpoint PHP - essayer plusieurs variantes
      const endpointUrls = this.buildCalendarEndpointUrls(groupUrl, urlParams);
      console.log(`🔗 ${endpointUrls.length} variante(s) d'URL d'endpoint PHP à tester`);
      
      let response: any = null;
      let successfulUrl = '';
      
      // Essayer chaque variante jusqu'à trouver celle qui fonctionne
      for (const endpointUrl of endpointUrls) {
        console.log(`🔗 Test de l'URL: ${endpointUrl}`);
        try {
          response = await axios.get(endpointUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
              'Accept-Encoding': 'gzip, deflate, br',
              'Connection': 'keep-alive',
              'Referer': groupUrl,
              'X-Requested-With': 'XMLHttpRequest'
            },
            timeout: 30000,
            validateStatus: (status) => status < 500 // Accepter les erreurs 404 mais pas 500
          });
          
          // Vérifier si la réponse est valide (200) et contient du HTML
          if (response.status === 200 && response.data && typeof response.data === 'string' && response.data.length > 100) {
            successfulUrl = endpointUrl;
            console.log(`✅ URL valide trouvée: ${endpointUrl}`);
            break;
          } else {
            console.log(`⚠️ URL retourne status ${response.status} ou contenu vide`);
          }
        } catch (error: any) {
          if (error.response?.status === 404) {
            console.log(`❌ URL 404: ${endpointUrl}`);
            continue;
          } else {
            console.log(`⚠️ Erreur avec cette URL: ${error.message}`);
            continue;
          }
        }
      }

      if (!response || response.status !== 200) {
        console.log('⚠️ Aucune URL d\'endpoint PHP valide trouvée');
        return [];
      }

      // Parser le HTML retourné
      const $ = cheerio.load(response.data);
      const matches: FFVBMatch[] = [];

      console.log(`📄 Réponse de l'endpoint (${successfulUrl}): ${response.data.length} caractères`);

      // Parser les matchs depuis le HTML retourné
      // Les matchs sont dans la Table 4 (index 3, car 0-based)
      // Mais on cherche toutes les tables avec des lignes de matchs
      $('table').each((tableIndex, table) => {
        const $table = $(table);
        
        // Chercher les lignes avec assez de colonnes pour être un match
        $table.find('tr').each((_, row) => {
          const $row = $(row);
          const cells = $row.find('td');
          
          // Ignorer les en-têtes (th) et les lignes vides
          if (cells.length < 8) return;

          const match = this.extractMatchFromCalendarRow($row);
          if (match) {
            matches.push(match);
          }
        });
      });

      return matches;
    } catch (error) {
      console.error('❌ Erreur lors de l\'appel à l\'endpoint PHP:', error);
      return [];
    }
  }

  /**
   * Extrait les paramètres nécessaires de l'URL source (saison, poule, codent, etc.)
   * Supporte deux formats :
   * 1. URL d'endpoint PHP direct : vbspo_calendrier.php?saison=2025/2026&codent=LIIDF&poule=2FA
   * 2. URL de page : index_3ma.htm (format pro/nationale 3)
   */
  private extractUrlParameters(url: string): {
    saison?: string;
    poule?: string;
    codent?: string;
    basePath?: string;
  } | null {
    try {
      const urlObj = new URL(url);
      const params: any = {};
      
      // CAS 1: URL d'endpoint PHP direct (régionales/départementales)
      if (urlObj.pathname.includes('vbspo_calendrier.php')) {
        // Extraire directement depuis les query params
        params.saison = urlObj.searchParams.get('saison') || undefined;
        params.poule = urlObj.searchParams.get('poule') || undefined;
        params.codent = urlObj.searchParams.get('codent') || undefined;
        
        // Construire le chemin de base
        const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
        const pathParts = urlObj.pathname.split('/').filter(p => p);
        const basePath = pathParts.slice(0, -1).join('/'); // Tout sauf le dernier élément (fichier PHP)
        params.basePath = basePath ? `${baseUrl}/${basePath}` : baseUrl;
        
        console.log('📋 Paramètres extraits depuis endpoint PHP direct:', params);
        return params;
      }
      
      // CAS 2: URL de page (format pro/nationale 3)
      const pathParts = urlObj.pathname.split('/').filter(p => p);
      
      // Exemple: /ffvbapp/resu/seniors/2025-2026/index_3ma.htm
      // On cherche: saison (2025-2026), poule (3MA), chemin de base
      
      // Extraire la saison (format: 2025-2026 ou 2025/2026)
      const seasonMatch = url.match(/(\d{4})[-/](\d{4})/);
      if (seasonMatch) {
        params.saison = `${seasonMatch[1]}/${seasonMatch[2]}`;
      }

      // Extraire la poule depuis le nom de fichier (ex: index_3ma.htm -> 3MA, index_com.htm -> COM)
      const pouleMatch = url.match(/index_(\w+)\.htm/i);
      if (pouleMatch) {
        params.poule = pouleMatch[1].toUpperCase();
        // Pour les Coupes de France (index_com.htm), le code est "com"
        // On peut utiliser ce code comme poule
      }

      // Construire le chemin de base (ex: https://www.ffvbbeach.org/ffvbapp/)
      const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
      const basePath = pathParts.slice(0, -1).join('/'); // Tout sauf le dernier élément (fichier)
      params.basePath = basePath ? `${baseUrl}/${basePath}` : baseUrl;

      // Le codent doit être extrait de la page HTML ou trouvé dans les scripts
      // Pour l'instant, on essaie de le trouver dans l'URL ou on le laisse vide
      // Certains sites l'ont dans l'URL, d'autres dans le HTML
      const codentMatch = url.match(/codent=([^&]+)/i);
      if (codentMatch) {
        params.codent = codentMatch[1];
      }

      console.log('📋 Paramètres extraits depuis page HTML:', params);
      return params;
    } catch (error) {
      console.error('❌ Erreur lors de l\'extraction des paramètres:', error);
      return null;
    }
  }

  /**
   * Extrait le codent et le chemin de l'endpoint depuis la page HTML originale
   * Cherche aussi les appels AJAX vers vbspo_calendrier.php pour trouver le bon chemin
   */
  private async extractCodentFromPage(url: string): Promise<string | undefined> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      let codent: string | undefined;
      
      // Chercher le codent dans plusieurs endroits possibles
      // 1. Dans les scripts JavaScript - chercher aussi les appels à vbspo_calendrier.php
      $('script').each((_, script) => {
        if (codent) return; // Déjà trouvé
        const scriptContent = $(script).html() || '';
        
        // Chercher codent dans les variables JS
        const codentMatch = scriptContent.match(/codent['"]?\s*[:=]\s*['"]?([^'",\s}]+)/i);
        if (codentMatch) {
          codent = codentMatch[1];
        }
        
        // Chercher aussi dans les appels AJAX à vbspo_calendrier.php
        const phpCallMatch = scriptContent.match(/vbspo_calendrier\.php[^'"]*codent[=_](\w+)/i);
        if (phpCallMatch) {
          codent = phpCallMatch[1];
        }
        
        // Chercher dans les URLs complètes
        const urlMatch = scriptContent.match(/['"]?([^'"]*vbspo_calendrier\.php[^'"]*codent[=_](\w+)[^'"]*)/i);
        if (urlMatch && urlMatch[2]) {
          codent = urlMatch[2];
        }
      });

      if (codent) return codent;

      // 2. Dans les attributs data-*
      codent = $('[data-codent]').attr('data-codent') || 
               $('[data-codent-id]').attr('data-codent-id');
      if (codent) return codent;

      // 3. Dans les liens ou formulaires
      $('a[href*="codent"], form[action*="codent"]').each((_, element) => {
        if (codent) return; // Déjà trouvé
        const href = $(element).attr('href') || $(element).attr('action') || '';
        const codentMatch = href.match(/codent[=_](\w+)/i);
        if (codentMatch) {
          codent = codentMatch[1];
        }
      });

      if (codent) return codent;

      // 4. Dans les inputs hidden
      const hiddenInput = $('input[type="hidden"][name*="codent"], input[type="hidden"][id*="codent"]');
      if (hiddenInput.length > 0) {
        const value = hiddenInput.val() as string;
        if (value) return value;
      }
      
      // 5. Chercher dans le HTML brut (parfois dans les commentaires ou les attributs)
      const htmlContent = response.data;
      const htmlCodentMatch = htmlContent.match(/codent[=_](\w+)/i);
      if (htmlCodentMatch) {
        codent = htmlCodentMatch[1];
      }

      return codent;
    } catch (error) {
      console.error('❌ Erreur lors de l\'extraction du codent:', error);
      return undefined;
    }
  }

  /**
   * Construit plusieurs variantes d'URL pour l'endpoint vbspo_calendrier.php
   * L'endpoint peut être à différents endroits selon la structure du site
   * Si l'URL est déjà un endpoint PHP direct, on l'utilise directement
   */
  private buildCalendarEndpointUrls(originalUrl: string, params: {
    saison?: string;
    poule?: string;
    codent?: string;
    basePath?: string;
  }): string[] {
    const urlObj = new URL(originalUrl);
    
    // CAS 1: Si l'URL est déjà un endpoint PHP direct, l'utiliser directement
    if (urlObj.pathname.includes('vbspo_calendrier.php')) {
      // Ajouter les paramètres manquants si nécessaire
      const queryParams = new URLSearchParams(urlObj.search);
      
      // Ajouter les paramètres optionnels pour le calendrier complet si pas déjà présents
      if (!queryParams.has('calend')) {
        queryParams.append('calend', 'COMPLET');
      }
      if (!queryParams.has('division')) {
        queryParams.append('division', '');
      }
      if (!queryParams.has('tour')) {
        queryParams.append('tour', '');
      }
      if (!queryParams.has('x')) {
        queryParams.append('x', '32');
      }
      if (!queryParams.has('y')) {
        queryParams.append('y', '33');
      }
      
      // Reconstruire l'URL avec tous les paramètres
      const fullUrl = `${urlObj.origin}${urlObj.pathname}?${queryParams.toString()}`;
      console.log('✅ URL endpoint PHP direct utilisée:', fullUrl);
      return [fullUrl];
    }
    
    // CAS 2: URL de page HTML, construire les variantes d'endpoint
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    const pathParts = urlObj.pathname.split('/').filter(p => p);
    const urls: string[] = [];
    
    // Construire les paramètres de requête
    const queryParams = new URLSearchParams();
    
    if (params.saison) {
      queryParams.append('saison', params.saison);
    }
    
    if (params.codent) {
      queryParams.append('codent', params.codent);
    }
    
    if (params.poule) {
      queryParams.append('poule', params.poule);
    }
    
    // Paramètres optionnels pour le calendrier complet
    queryParams.append('calend', 'COMPLET');
    queryParams.append('division', '');
    queryParams.append('tour', '');
    
    // Coordonnées
    queryParams.append('x', '32');
    queryParams.append('y', '33');
    
    const queryString = queryParams.toString();
    
    // Variante 1: /ffvbapp/vbspo_calendrier.php (racine de ffvbapp)
    const ffvbappIndex = pathParts.findIndex(p => p.toLowerCase().includes('ffvbapp'));
    if (ffvbappIndex >= 0) {
      const basePath = pathParts.slice(0, ffvbappIndex + 1).join('/');
      urls.push(`${baseUrl}/${basePath}/vbspo_calendrier.php?${queryString}`);
    }
    
    // Variante 2: /ffvbapp/resu/vbspo_calendrier.php (dans resu)
    if (pathParts.includes('resu')) {
      const resuIndex = pathParts.findIndex(p => p === 'resu');
      if (resuIndex >= 0) {
        const basePath = pathParts.slice(0, resuIndex + 1).join('/');
        urls.push(`${baseUrl}/${basePath}/vbspo_calendrier.php?${queryString}`);
      }
    }
    
    // Variante 3: Dans le même dossier que la page source
    if (params.basePath) {
      urls.push(`${params.basePath}/vbspo_calendrier.php?${queryString}`);
    }
    
    // Variante 4: Chemin relatif depuis la page source
    const basePath = pathParts.slice(0, -1).join('/');
    if (basePath) {
      urls.push(`${baseUrl}/${basePath}/vbspo_calendrier.php?${queryString}`);
    }
    
    // Variante 5: Chemin absolu depuis la racine
    urls.push(`${baseUrl}/ffvbapp/vbspo_calendrier.php?${queryString}`);
    
    // Variante 6: Chemin absolu resu
    urls.push(`${baseUrl}/ffvbapp/resu/vbspo_calendrier.php?${queryString}`);
    
    // Variante 7: /ffvbapp/resu/seniors/vbspo_calendrier.php (si on a seniors dans le chemin)
    if (pathParts.includes('seniors')) {
      const seniorsIndex = pathParts.findIndex(p => p === 'seniors');
      if (seniorsIndex >= 0) {
        const basePath = pathParts.slice(0, seniorsIndex + 1).join('/');
        urls.push(`${baseUrl}/${basePath}/vbspo_calendrier.php?${queryString}`);
      }
    }
    
    // Variante 8: Chemin absolu avec seniors
    urls.push(`${baseUrl}/ffvbapp/resu/seniors/vbspo_calendrier.php?${queryString}`);
    
    // Retirer les doublons
    return [...new Set(urls)];
  }

  /**
   * Extrait un match depuis une ligne du calendrier retourné par l'endpoint PHP
   * Structure réelle des colonnes:
   * [0]: ID match (ex: "3MA001")
   * [1]: Date (ex: "28/09/25")
   * [2]: Heure (ex: "15:00")
   * [3]: Équipe domicile
   * [4]: (vide ou image)
   * [5]: Équipe extérieure
   * [6]: Sets home (ex: "3")
   * [7]: Sets away (ex: "0")
   * [8]: Scores détaillés (ex: "25:14, 25:17, 26:24")
   * [9]: Score total (ex: "076-055")
   * [10]: Arbitres
   * [11]: (vide)
   */
  private extractMatchFromCalendarRow($row: cheerio.Cheerio<any>): FFVBMatch | null {
    try {
      const cells = $row.find('td');
      if (cells.length < 8) return null; // Pas assez de colonnes pour un match

      // Ignorer les lignes de séparation (Journée XX)
      const firstCell = cells.eq(0).text().trim();
      if (firstCell.toLowerCase().includes('journée') || firstCell.toLowerCase().includes('journee')) {
        return null;
      }

      // Colonne 0: ID du match
      const ffvbMatchId = firstCell.trim();
      
      // Vérifier que c'est un ID de match valide (format: 3MA001, etc.)
      if (!/^[A-Z0-9]+\d+$/i.test(ffvbMatchId)) {
        return null;
      }

      // Colonne 1: Date
      const dateText = cells.eq(1).text().trim();
      // Colonne 2: Heure
      const timeText = cells.eq(2).text().trim();
      
      // Colonne 3: Équipe domicile
      const homeTeamText = cells.eq(3).text().trim();
      // Colonne 5: Équipe extérieure (colonne 4 est vide)
      const awayTeamText = cells.eq(5).text().trim();

      // Vérifier que nous avons bien des équipes et une date
      if (!homeTeamText || !awayTeamText || !dateText) {
        return null;
      }

      // Nettoyer les noms d'équipes
      const homeTeam = this.normalizeTeamName(homeTeamText);
      const awayTeam = this.normalizeTeamName(awayTeamText);

      // Parser la date et l'heure combinées
      const dateTimeText = `${dateText} ${timeText}`;
      const startAt = this.parseDate(dateTimeText);

      // Colonne 6: Sets home
      const setsHomeText = cells.eq(6).text().trim();
      // Colonne 7: Sets away
      const setsAwayText = cells.eq(7).text().trim();
      // Colonne 8: Scores détaillés (ex: "25:14, 25:17, 26:24")
      const setScoresText = cells.length > 8 ? cells.eq(8).text().trim() : '';

      let setsHome: number | undefined;
      let setsAway: number | undefined;
      let status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELED' = 'SCHEDULED';
      let setScores: SetScore[] | undefined;

      // Si les sets sont présents, le match est terminé
      if (setsHomeText && setsAwayText) {
        const homeSets = parseInt(setsHomeText);
        const awaySets = parseInt(setsAwayText);
        
        if (!isNaN(homeSets) && !isNaN(awaySets)) {
          setsHome = homeSets;
          setsAway = awaySets;
          status = 'FINISHED';
          
          // Parser les scores détaillés si présents
          if (setScoresText) {
            setScores = this.parseSetScores(setScoresText);
          }
        }
      } else {
        // Match programmé ou en cours
        status = 'SCHEDULED';
      }

      return {
        ffvbMatchId,
        homeTeam,
        awayTeam,
        startAt,
        status,
        setsHome,
        setsAway,
        setScores
      };
    } catch (error) {
      console.error('Erreur lors de l\'extraction d\'un match depuis la ligne:', error);
      return null;
    }
  }


  private async scrapePage(url: string): Promise<FFVBMatch[]> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      const matches: FFVBMatch[] = [];

      console.log(`📄 Analyse de la page: ${url}`);
      console.log(`📄 Contenu HTML: ${response.data.length} caractères`);

      // DÉTECTION DES FRAMES (Coupes de France)
      // Vérifier si la page contient des frames ou iframes (ou frameset)
      const frames = $('frame, iframe');
      const framesets = $('frameset');
      
      if (frames.length > 0 || framesets.length > 0) {
        console.log(`🖼️ Page avec frames détectée (${frames.length} frame(s), ${framesets.length} frameset(s))`);
        
        // Essayer d'extraire l'URL de la frame qui contient les données
        const frameUrls: string[] = [];
        
        // Extraire depuis les frames classiques
        frames.each((_, frame) => {
          const src = $(frame).attr('src');
          if (src) {
            // Construire l'URL absolue si c'est une URL relative
            const frameUrl = src.startsWith('http') 
              ? src 
              : new URL(src, url).toString();
            frameUrls.push(frameUrl);
            console.log(`🔗 Frame trouvée: ${frameUrl}`);
          }
        });
        
        // Extraire depuis les framesets (pour les Coupes de France)
        framesets.find('frame').each((_, frame) => {
          const src = $(frame).attr('src');
          if (src) {
            const frameUrl = src.startsWith('http') 
              ? src 
              : new URL(src, url).toString();
            if (!frameUrls.includes(frameUrl)) {
              frameUrls.push(frameUrl);
              console.log(`🔗 Frame depuis frameset trouvée: ${frameUrl}`);
            }
          }
        });

        // Essayer de scraper chaque frame (avec récursion limitée pour éviter les boucles infinies)
        for (const frameUrl of frameUrls) {
          try {
            console.log(`🔍 Tentative de scraping de la frame: ${frameUrl}`);
            // Charger le contenu de la frame directement
            const frameResponse = await axios.get(frameUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
                'Referer': url
              },
              timeout: 30000
            });
            
            const $frame = cheerio.load(frameResponse.data);
            const frameMatches: FFVBMatch[] = [];
            
            // Essayer d'abord avec extractMatchFromCalendarRow (pour les tableaux FFVB)
            $frame('table').each((tableIndex, table) => {
              const $table = $frame(table);
              
              // Chercher les lignes avec assez de colonnes pour être un match
              $table.find('tr').each((_, row) => {
                const $row = $frame(row);
                const cells = $row.find('td');
                
                // Ignorer les en-têtes (th) et les lignes vides
                if (cells.length >= 8) {
                  const match = this.extractMatchFromCalendarRow($row);
                  if (match) {
                    frameMatches.push(match);
                  }
                }
              });
            });
            
            // Si pas de matchs trouvés avec extractMatchFromCalendarRow, essayer extractMatchesFromGeneralStructure
            if (frameMatches.length === 0) {
              console.log('⚠️ Aucun match trouvé avec extractMatchFromCalendarRow, essai avec extractMatchesFromGeneralStructure...');
              const generalMatches = this.extractMatchesFromGeneralStructure($frame);
              frameMatches.push(...generalMatches);
            }
            
            if (frameMatches.length > 0) {
              console.log(`✅ ${frameMatches.length} match(s) trouvé(s) dans la frame`);
              matches.push(...frameMatches);
            }
          } catch (error) {
            console.log(`⚠️ Erreur lors du scraping de la frame ${frameUrl}:`, error);
          }
        }

        // Si on a trouvé des matchs dans les frames, les retourner
        if (matches.length > 0) {
          return matches;
        }

        // Sinon, essayer aussi l'endpoint PHP directement (comme pour les autres poules)
        console.log('🔍 Aucun match trouvé dans les frames, tentative avec l\'endpoint PHP...');
        const phpMatches = await this.scrapeCalendarEndpoint(url);
        if (phpMatches.length > 0) {
          return phpMatches;
        }
      }

      // Analyser le contenu de la page pour comprendre sa structure
      const pageText = $('body').text();
      console.log(`📄 Contenu texte: ${pageText.length} caractères`);
      
      // Chercher des indices de matchs dans le texte
      const matchIndicators = [
        'vs', 'contre', 'match', 'rencontre', 'journée', '3-0', '3-1', '3-2', '2-3', '1-3', '0-3'
      ];
      
      let hasMatchIndicators = false;
      for (const indicator of matchIndicators) {
        if (pageText.toLowerCase().includes(indicator.toLowerCase())) {
          hasMatchIndicators = true;
          console.log(`🔍 Indicateur de match trouvé: "${indicator}"`);
          break;
        }
      }

      if (!hasMatchIndicators) {
        console.log('⚠️ Aucun indicateur de match trouvé dans le contenu');
        return [];
      }

      // Essayer différents sélecteurs selon le type de page FFVB
      const selectors = [
        // Sélecteurs génériques
        '.match, .game, .rencontre',
        // Sélecteurs FFVB spécifiques
        'table tr',
        'table tbody tr',
        '.resultat',
        '.match-row',
        // Sélecteurs pour les pages de résultats
        'tr[class*="match"], tr[class*="game"]',
        'div[class*="match"], div[class*="game"]',
        // Sélecteurs pour les calendriers FFVB
        'table.calendrier tr',
        'table.resultats tr',
        'table.rencontres tr',
        // Sélecteurs plus spécifiques
        'tr:has(td)',
        'table tr:not(:first-child)',
        'tbody tr'
      ];

      for (const selector of selectors) {
        const elements = $(selector);
        console.log(`🔍 Sélecteur "${selector}": ${elements.length} éléments trouvés`);

        if (elements.length > 0) {
          elements.each((_, element) => {
            const $match = $(element);
            const match = this.extractMatchFromElement($match);
            if (match) {
              matches.push(match);
            }
          });

          if (matches.length > 0) {
            console.log(`✅ Trouvé ${matches.length} matchs avec le sélecteur "${selector}"`);
            break;
          }
        }
      }

      // Si aucun match trouvé, essayer une approche plus générale
      if (matches.length === 0) {
        console.log('🔍 Aucun match trouvé avec les sélecteurs standards, analyse générale...');
        matches.push(...this.extractMatchesFromGeneralStructure($));
      }

      return matches;
    } catch (error) {
      console.error('❌ Erreur lors du scraping de la page:', url, error);
      return [];
    }
  }

  private extractMatchFromElement($element: cheerio.Cheerio<any>): FFVBMatch | null {
    try {
      // Essayer différents patterns pour extraire les équipes
      const text = $element.text();
      const html = $element.html() || '';
      
      // Pattern pour les noms d'équipes (recherche de texte qui ressemble à des noms d'équipes)
      const teamPatterns = [
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+vs?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+-\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+contre\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i
      ];

      let homeTeam = '';
      let awayTeam = '';

      for (const pattern of teamPatterns) {
        const match = text.match(pattern);
        if (match) {
          homeTeam = this.normalizeTeamName(match[1]);
          awayTeam = this.normalizeTeamName(match[2]);
          break;
        }
      }

      // Si pas de pattern trouvé, essayer les sélecteurs CSS
      if (!homeTeam || !awayTeam) {
        homeTeam = this.normalizeTeamName($element.find('.home, .equipe-domicile, .team-home, td:first-child').text().trim());
        awayTeam = this.normalizeTeamName($element.find('.away, .equipe-exterieur, .team-away, td:nth-child(2)').text().trim());
      }

      if (!homeTeam || !awayTeam) {
        return null;
      }

      // Extraire la date
      const dateText = $element.find('.date, .jour, .time, td:nth-child(3)').text().trim() || text;
      const startAt = this.parseDate(dateText);

      // Extraire le score
      const scoreText = $element.find('.score, .resultat, td:nth-child(4)').text().trim() || text;
      const { setsHome, setsAway, status } = this.parseScore(scoreText);

      const ffvbMatchId = $element.attr('data-id') || $element.attr('id') || undefined;

      return {
        ffvbMatchId,
        homeTeam,
        awayTeam,
        startAt,
        status,
        setsHome,
        setsAway
      };
    } catch (error) {
      console.error('Erreur lors de l\'extraction d\'un match:', error);
      return null;
    }
  }

  private extractMatchesFromGeneralStructure($: cheerio.CheerioAPI): FFVBMatch[] {
    const matches: FFVBMatch[] = [];
    
    // Analyser toutes les tables
    $('table').each((_, table) => {
      const $table = $(table);
      $table.find('tr').each((_, row) => {
        const $row = $(row);
        const cells = $row.find('td, th');
        
        if (cells.length >= 2) {
          const text = $row.text().trim();
          
          // Chercher des patterns de match dans le texte
          if (text.includes('vs') || text.includes('-') || text.includes('contre')) {
            const match = this.extractMatchFromElement($row);
            if (match) {
              matches.push(match);
            }
          }
        }
      });
    });

    return matches;
  }

  private async findCalendarUrl(originalUrl: string): Promise<string | null> {
    try {
      const response = await axios.get(originalUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Chercher des liens vers le calendrier complet
      const calendarLinks = [
        'a[href*="calendrier"]',
        'a[href*="calendrier-complet"]',
        'a[href*="tous-les-matchs"]',
        'a[href*="programme"]',
        'a:contains("Calendrier")',
        'a:contains("Tous les matchs")',
        'a:contains("Programme complet")'
      ];

      for (const selector of calendarLinks) {
        const links = $(selector);
        if (links.length > 0) {
          const href = links.first().attr('href');
          if (href) {
            // Construire l'URL complète
            if (href.startsWith('http')) {
              return href;
            } else if (href.startsWith('/')) {
              const baseUrl = originalUrl.split('/').slice(0, 3).join('/');
              return baseUrl + href;
            } else {
              return originalUrl.replace(/\/[^\/]*$/, '/') + href;
            }
          }
        }
      }

      return null;
    } catch (error) {
      console.error('❌ Erreur lors de la recherche du calendrier:', error);
      return null;
    }
  }

  private generateUrlVariants(originalUrl: string): string[] {
    const variants: string[] = [];
    
    // Variantes communes pour les sites FFVB
    const commonVariants = [
      originalUrl.replace('index_3ma.htm', 'calendrier.htm'),
      originalUrl.replace('index_3ma.htm', 'programme.htm'),
      originalUrl.replace('index_3ma.htm', 'tous-les-matchs.htm'),
      originalUrl.replace('index_3ma.htm', 'resultats.htm'),
      originalUrl.replace('index_3ma.htm', 'calendrier-complet.htm'),
      // Essayer avec des paramètres
      originalUrl + '?calendrier=complet',
      originalUrl + '?vue=calendrier',
      originalUrl + '?affichage=tous'
    ];

    return commonVariants;
  }

  private normalizeTeamName(name: string): string {
    return name
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Calcule le dernier dimanche d'un mois donné
   */
  private getLastSundayOfMonth(year: number, month: number): number {
    // Trouver le dernier jour du mois
    const lastDay = new Date(year, month, 0).getDate(); // 0 = dernier jour du mois précédent
    
    // Trouver le jour de la semaine du dernier jour du mois
    const lastDayDate = new Date(year, month - 1, lastDay); // month - 1 car 0-indexé
    const dayOfWeek = lastDayDate.getDay(); // 0 = dimanche, 6 = samedi
    
    // Calculer le dernier dimanche (reculer jusqu'au dimanche)
    const lastSunday = lastDay - dayOfWeek;
    
    return lastSunday;
  }

  /**
   * Détermine si une date est en heure d'été (CEST) en Europe/Paris
   * L'heure d'été commence le dernier dimanche de mars à 2h00 et se termine le dernier dimanche d'octobre à 3h00
   */
  private isDaylightSavingTime(year: number, month: number, day: number, hour: number): boolean {
    // Si on est avant mars ou après octobre, on est en heure d'hiver
    if (month < 3 || month > 10) {
      return false;
    }
    
    // Si on est entre avril et septembre, on est certainement en heure d'été
    if (month >= 4 && month <= 9) {
      return true;
    }
    
    // Pour mars et octobre, il faut calculer le dernier dimanche
    if (month === 3) {
      // En mars, l'heure d'été commence le dernier dimanche à 2h00
      const lastSundayOfMarch = this.getLastSundayOfMonth(year, 3);
      
      // Si on est après le dernier dimanche, ou si c'est le dernier dimanche après 2h00
      return day > lastSundayOfMarch || (day === lastSundayOfMarch && hour >= 2);
    }
    
    if (month === 10) {
      // En octobre, l'heure d'été se termine le dernier dimanche à 3h00
      const lastSundayOfOctober = this.getLastSundayOfMonth(year, 10);
      
      // Si on est avant le dernier dimanche, ou si c'est le dernier dimanche avant 3h00
      return day < lastSundayOfOctober || (day === lastSundayOfOctober && hour < 3);
    }
    
    return false;
  }

  /**
   * Convertit une date/heure en heure française (Europe/Paris) en UTC
   * Les heures FFVB sont en heure française, on doit les convertir en UTC pour le stockage
   */
  private convertParisTimeToUTC(year: number, month: number, day: number, hour: number, minute: number): Date {
    // Déterminer si on est en heure d'été (CEST = UTC+2) ou d'hiver (CET = UTC+1)
    const isDST = this.isDaylightSavingTime(year, month, day, hour);
    const offset = isDST ? 2 : 1; // Offset en heures pour Europe/Paris
    
    // Créer la date en UTC en soustrayant l'offset
    const utcDate = new Date(Date.UTC(year, month - 1, day, hour - offset, minute));
    
    return utcDate;
  }

  private parseDate(dateText: string): Date {
    // Formats de date courants FFVB
    // Format typique: "28/09/25 15:00" (DD/MM/YY HH:MM)
    // IMPORTANT: Les heures FFVB sont en heure française (Europe/Paris), on doit les convertir en UTC
    const datePatterns = [
      /(\d{1,2})\/(\d{1,2})\/(\d{2})\s+(\d{1,2}):(\d{2})/, // DD/MM/YY HH:MM (format court)
      /(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/, // DD/MM/YYYY HH:MM
      /(\d{1,2})\/(\d{1,2})\/(\d{2})/, // DD/MM/YY (sans heure)
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // DD/MM/YYYY (sans heure)
      /(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})/, // YYYY-MM-DD HH:MM
    ];

    for (const pattern of datePatterns) {
      const match = dateText.match(pattern);
      if (match) {
        if (pattern === datePatterns[0]) {
          // DD/MM/YY HH:MM (format court - 2 chiffres pour l'année)
          const [, day, month, year, hour, minute] = match;
          // Convertir YY en YYYY (assumer 2000-2099)
          const fullYear = parseInt(year) < 50 ? 2000 + parseInt(year) : 1900 + parseInt(year);
          return this.convertParisTimeToUTC(fullYear, parseInt(month), parseInt(day), parseInt(hour), parseInt(minute));
        } else if (pattern === datePatterns[1]) {
          // DD/MM/YYYY HH:MM
          const [, day, month, year, hour, minute] = match;
          return this.convertParisTimeToUTC(parseInt(year), parseInt(month), parseInt(day), parseInt(hour), parseInt(minute));
        } else if (pattern === datePatterns[2]) {
          // DD/MM/YY (sans heure) - pas d'heure, on met minuit en heure française
          const [, day, month, year] = match;
          const fullYear = parseInt(year) < 50 ? 2000 + parseInt(year) : 1900 + parseInt(year);
          return this.convertParisTimeToUTC(fullYear, parseInt(month), parseInt(day), 0, 0);
        } else if (pattern === datePatterns[3]) {
          // DD/MM/YYYY (sans heure) - pas d'heure, on met minuit en heure française
          const [, day, month, year] = match;
          return this.convertParisTimeToUTC(parseInt(year), parseInt(month), parseInt(day), 0, 0);
        } else if (pattern === datePatterns[4]) {
          // YYYY-MM-DD HH:MM
          const [, year, month, day, hour, minute] = match;
          return this.convertParisTimeToUTC(parseInt(year), parseInt(month), parseInt(day), parseInt(hour), parseInt(minute));
        }
      }
    }

    // Fallback: essayer de parser avec Date native
    const parsed = new Date(dateText);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  /**
   * Parse les scores détaillés par set (ex: "25:14, 25:17, 26:24" ou "25-14, 25-17, 26-24")
   */
  private parseSetScores(setScoresText: string): SetScore[] | undefined {
    if (!setScoresText || setScoresText.trim() === '') {
      return undefined;
    }

    const setScores: SetScore[] = [];
    
    // Nettoyer le texte (enlever les espaces, normaliser les séparateurs)
    const cleaned = setScoresText.trim();
    
    // Pattern pour matcher les scores de set : "25:14" ou "25-14" ou "25 14"
    // Supporte plusieurs formats : "25:14, 25:17, 26:24" ou "25-14 25-17 26-24"
    const setScorePattern = /(\d+)[\s:,-]+(\d+)/g;
    let match;
    
    while ((match = setScorePattern.exec(cleaned)) !== null) {
      const home = parseInt(match[1]);
      const away = parseInt(match[2]);
      
      // Vérifier que les scores sont valides (typiquement entre 0 et 50 pour un set de volley)
      if (!isNaN(home) && !isNaN(away) && home >= 0 && away >= 0 && home <= 50 && away <= 50) {
        setScores.push({ home, away });
      }
    }
    
    return setScores.length > 0 ? setScores : undefined;
  }

  private parseScore(scoreText: string): { setsHome?: number; setsAway?: number; status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELED' } {
    if (!scoreText || scoreText.includes('Annulé') || scoreText.includes('Canceled')) {
      return { status: 'CANCELED' };
    }

    if (scoreText.includes('En cours') || scoreText.includes('Live')) {
      return { status: 'IN_PROGRESS' };
    }

    // Pattern pour score sets (ex: "3-1", "25-23 25-21 25-19")
    const scoreMatch = scoreText.match(/(\d+)-(\d+)/);
    if (scoreMatch) {
      const setsHome = parseInt(scoreMatch[1]);
      const setsAway = parseInt(scoreMatch[2]);
      
      if (setsHome >= 0 && setsHome <= 3 && setsAway >= 0 && setsAway <= 3) {
        return {
          setsHome,
          setsAway,
          status: 'FINISHED'
        };
      }
    }

    return { status: 'SCHEDULED' };
  }

  async testConnection(url: string): Promise<boolean> {
    try {
      const response = await axios.head(url, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}
