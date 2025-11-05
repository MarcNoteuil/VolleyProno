import { Router } from 'express';
import { RankingController } from './ranking.controller';
import { authMiddleware } from '../auth/auth.middleware';

const router = Router();
const rankingController = new RankingController();

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

router.get('/global', (req, res) => rankingController.getGlobalRanking(req, res)); // Route pour le classement global (doit être avant /:groupId)
router.get('/:groupId', (req, res) => rankingController.getGroupRanking(req, res));
router.get('/:groupId/stats', (req, res) => rankingController.getUserStats(req, res));

export default router;
