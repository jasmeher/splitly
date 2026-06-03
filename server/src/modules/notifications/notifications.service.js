import Notification from '../../models/Notification.js';

export const getUserNotifications = async (userId) => {
  return Notification.find({ user: userId }).sort({ createdAt: -1 });
};

export const markAsRead = async (notificationId) => {
  return Notification.findByIdAndUpdate(notificationId, { isRead: true, readAt: new Date() }, { new: true });
};
