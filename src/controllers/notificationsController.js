import sql from '../config/db.js';
import { getAuthenticatedUser } from '../middlewares/auth.js';

export const notificationsController = {
  // Obtenir les notifications
  getNotifications: async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);

      const notifications = await sql`
        SELECT n.*, u.username as sender_username, u.image as sender_image,
               p.image_url as post_image
        FROM notifications n
        JOIN users u ON n.sender_id = u._id
        LEFT JOIN posts p ON n.post_id = p._id
        LEFT JOIN comments c ON n.comment_id = c._id
        WHERE n.receiver_id = ${user._id}
        ORDER BY n.created_at DESC
      `;

      const notificationsWithInfo = notifications.map(notification => ({
        ...notification,
        sender: {
          _id: notification.sender_id,
          username: notification.sender_username,
          image: notification.sender_image
        },
        post: notification.post_id ? {
          _id: notification.post_id,
          imageUrl: notification.post_image
        } : null,
        comment: notification.comment_id ? notification.comment_content : null
      }));

      res.json(notificationsWithInfo);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};