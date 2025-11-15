// controllers/notificationsController.js
import sql from '../config/db.js';
import { getAuthenticatedUser } from '../middlewares/auth.js';

// controllers/notificationsController.js
export const notificationsController = {
  getNotifications: async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);

      const notifications = await sql`
        SELECT 
          n.*, 
          u.username as sender_username, 
          u.fullname as sender_fullname,
          u.image as sender_image,
          p.image_url as post_image_url,
          p._id as post_id,
          p.caption as post_caption,
          p.user_id as post_user_id
        FROM notifications n
        LEFT JOIN users u ON n.sender_id = u._id
        LEFT JOIN posts p ON n.post_id = p._id
        WHERE n.receiver_id = ${user._id}
        ORDER BY n.created_at DESC
      `;

      const formattedNotifications = notifications.map(notification => ({
        _id: notification._id,
        receiver_id: notification.receiver_id,
        sender_id: notification.sender_id,
        type: notification.type,
        post_id: notification.post_id,
        comment_id: notification.comment_id,
        created_at: notification.created_at,
        sender: notification.sender_id ? {
          _id: notification.sender_id,
          username: notification.sender_username,
          fullname: notification.sender_fullname,
          image: notification.sender_image
        } : null,
        post: notification.post_id ? {
          _id: notification.post_id,
          image_url: notification.post_image_url,
          caption: notification.post_caption,
          user_id: notification.post_user_id
        } : null
      }));

      res.json(formattedNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Supprimer une notification
  deleteNotification: async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      const { notificationId } = req.params;

      // Vérifier que l'utilisateur est bien le destinataire de la notification
      const notification = await sql`
        SELECT * FROM notifications 
        WHERE _id = ${notificationId} AND receiver_id = ${user._id}
      `;

      if (notification.length === 0) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      // Supprimer la notification
      await sql`
        DELETE FROM notifications 
        WHERE _id = ${notificationId} AND receiver_id = ${user._id}
      `;

      res.json({ message: 'Notification deleted successfully' });
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};