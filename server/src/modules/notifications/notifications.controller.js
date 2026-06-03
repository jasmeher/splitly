import { getUserNotifications, markAsRead } from './notifications.service.js';

export const handleGetNotifications = async (req, res, next) => {
  try {
    const result = await getUserNotifications(req.user.id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const handleMarkAsRead = async (req, res, next) => {
  try {
    const result = await markAsRead(req.params.id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
