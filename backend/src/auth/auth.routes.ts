import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authMiddleware } from './auth.middleware';

const router = Router();
const authController = new AuthController();

router.post('/register', (req, res) => authController.register(req, res));
router.post('/login', (req, res) => authController.login(req, res));
router.post('/refresh', (req, res) => authController.refresh(req, res));

// Endpoint de test pour vérifier l'authentification
router.get('/me', authMiddleware, (req, res) => {
  res.json({
    code: 'SUCCESS',
    data: {
      userId: req.userId,
      message: 'Authentification réussie'
    }
  });
});

export default router;
