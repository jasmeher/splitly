import express from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import usersRoutes from '../modules/users/users.routes.js';
import groupsRoutes from '../modules/groups/groups.routes.js';
import expensesRoutes from '../modules/expenses/expenses.routes.js';
import settlementsRoutes from '../modules/settlements/settlements.routes.js';
import notificationsRoutes from '../modules/notifications/notifications.routes.js';
import dashboardRoutes from '../modules/dashboard/dashboard.routes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/groups', groupsRoutes);
router.use('/expenses', expensesRoutes);
router.use('/settlements', settlementsRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;
