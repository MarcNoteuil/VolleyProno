import { Router } from 'express';
import { prisma } from '../db/prisma';
import { AdminController } from './admin.controller';
import { adminMiddleware } from '../auth/admin.middleware';

const router = Router();
const adminController = new AdminController();

// Route pour mettre à jour un utilisateur en admin (sans authentification pour l'instant)
router.post('/make-admin', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        code: 'ERROR',
        message: 'Email manquant'
      });
    }

    const user = await prisma.user.update({
      where: { email },
      data: { role: 'ADMIN' }
    });

    res.json({
      code: 'SUCCESS',
      message: 'Utilisateur mis à jour en admin',
      data: {
        id: user.id,
        email: user.email,
        pseudo: user.pseudo,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour:', error);
    res.status(500).json({
      code: 'ERROR',
      message: 'Erreur lors de la mise à jour de l\'utilisateur'
    });
  }
});

// Routes protégées par le middleware admin
router.use(adminMiddleware);

// Gestion des matchs
router.post('/matches', (req, res) => adminController.createMatch(req, res));
router.get('/matches', (req, res) => adminController.getAllMatches(req, res));
router.put('/matches/:matchId', (req, res) => adminController.updateMatch(req, res));
router.delete('/matches/:matchId', (req, res) => adminController.deleteMatch(req, res));

export default router;
