import { Router } from 'express';
import { GroupsController } from './groups.controller';
import { authMiddleware } from '../auth/auth.middleware';

const router = Router();
const groupsController = new GroupsController();

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

router.post('/', (req, res) => groupsController.createGroup(req, res));
router.post('/join', (req, res) => groupsController.joinGroup(req, res));
router.get('/', (req, res) => groupsController.getUserGroups(req, res));
router.get('/:groupId', (req, res) => groupsController.getGroupById(req, res));
router.post('/:groupId/leave', (req, res) => groupsController.leaveGroup(req, res));
router.delete('/:groupId', (req, res) => groupsController.deleteGroup(req, res));
router.post('/:groupId/regenerate-invite', (req, res) => groupsController.regenerateInviteCode(req, res));
router.post('/:groupId/transfer-leadership', (req, res) => groupsController.transferLeadership(req, res));

export default router;
