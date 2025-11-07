import { Router } from 'express';
import { PredictionsController } from './predictions.controller';
import { authMiddleware } from '../auth/auth.middleware';

const router = Router();
const predictionsController = new PredictionsController();

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

router.get('/since-last-login', (req, res) => predictionsController.getPredictionsSinceLastLogin(req, res)); // Route pour récupérer les pronostics depuis la dernière connexion
router.post('/mark-as-viewed', (req, res) => predictionsController.markPredictionsAsViewed(req, res)); // Route pour marquer les pronostics comme vus
router.get('/risky-cooldown/:groupId', (req, res) => predictionsController.checkRiskyModeCooldown(req, res)); // Route pour vérifier le cooldown du mode risqué
router.post('/:matchId', (req, res) => predictionsController.createOrUpdatePrediction(req, res));
router.put('/:predictionId', (req, res) => predictionsController.updatePrediction(req, res));
router.delete('/batch', (req, res) => predictionsController.deletePredictions(req, res)); // Route pour supprimer plusieurs pronostics
router.post('/:matchId/calculate-points', (req, res) => predictionsController.calculatePoints(req, res));
router.get('/user', (req, res) => predictionsController.getAllUserPredictions(req, res)); // Route pour tous les pronostics de l'utilisateur
router.get('/match/:matchId', (req, res) => predictionsController.getMatchPredictions(req, res)); // Route pour les pronostics d'un match
router.get('/:groupId', (req, res) => predictionsController.getUserPredictions(req, res)); // Route pour les pronostics d'un groupe
// Route pour obtenir le pronostic de l'utilisateur pour un match (query parameter) - doit être en dernier
router.get('/', (req, res) => {
  if (req.query.matchId) {
    // Utiliser getMatchPredictions qui gère maintenant les query parameters
    return predictionsController.getMatchPredictions(req as any, res);
  }
  return res.status(400).json({
    code: 'ERROR',
    message: 'Paramètre manquant'
  });
});

export default router;
