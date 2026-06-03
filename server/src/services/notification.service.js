import Notification from '../models/Notification.js';

export const sendNotification = async ({ userId, title, message, type, relatedEntityId, relatedEntityType }) => {
  try {
    const notification = await Notification.create({
      user: userId,
      title,
      message,
      type,
      relatedEntityId,
      relatedEntityType
    });
    console.log(`Notification sent to User ${userId}: ${title}`);
    return notification;
  } catch (error) {
    console.error('Failed to dispatch notification:', error.message);
  }
};
