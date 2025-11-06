import { Router } from 'express';
import { UsersController } from './users.controller';
import { authMiddleware } from '../auth/auth.middleware';
import { getAvatars } from './avatars';

const router = Router();
const usersController = new UsersController();

// Toutes les routes nécessitent une authentification
router.get('/profile', authMiddleware, (req, res) => usersController.getProfile(req, res));
router.put('/profile', authMiddleware, (req, res) => usersController.updateProfile(req, res));
router.delete('/account', authMiddleware, (req, res) => usersController.deleteAccount(req, res));
router.get('/avatars', authMiddleware, (req, res) => {
  res.json({
    code: 'SUCCESS',
    data: getAvatars()
  });
});

export default router;

