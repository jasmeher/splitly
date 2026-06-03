import { getDashboardSummary } from './dashboard.service.js';

export const handleGetDashboard = async (req, res, next) => {
  try {
    const result = await getDashboardSummary(req.user.id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
