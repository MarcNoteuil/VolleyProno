import { Router } from 'express';
import { MatchesController } from './matches.controller';
import { authMiddleware } from '../auth/auth.middleware';

const router = Router();
const matchesController = new MatchesController();

// Route de test pour le scraper FFVB (sans authentification)
router.post('/test-scraper', (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL manquante' });
  }
  
  const { FFVBScraper } = require('../utils/ffvbScraper');
  const scraper = new FFVBScraper();
  
  scraper.scrapeGroupMatches(url)
    .then(matches => {
      res.json({
        success: true,
        matches: matches,
        count: matches.length
      });
    })
    .catch(error => {
      console.error('Erreur test scraper:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    });
});

// Toutes les autres routes nécessitent une authentification
router.use(authMiddleware);

// Route pour récupérer un match par ID (doit être avant les routes avec :groupId)
router.get('/match/:matchId', (req, res) => matchesController.getMatchById(req, res));

// Routes spécifiques d'abord
router.post('/:groupId/sync', (req, res) => matchesController.syncFFVB(req, res));
router.post('/:groupId', (req, res) => matchesController.createMatch(req, res));
router.get('/:groupId', (req, res) => matchesController.getGroupMatches(req, res));
router.put('/:matchId', (req, res) => matchesController.updateMatch(req, res));

// Route générale à la fin (pour les paramètres de query)
router.get('/', (req, res) => matchesController.getGroupMatches(req, res)); // Support pour ?groupId=...

export default router;
