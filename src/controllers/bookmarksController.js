import sql from '../config/db.js';
import { getAuthenticatedUser } from '../middlewares/auth.js';

export const bookmarksController = {
  // Ajouter/Retirer un bookmark
  toggleBookmark: async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      const { postId } = req.body;

      const existingBookmark = await sql`
        SELECT * FROM bookmarks 
        WHERE user_id = ${user._id} AND post_id = ${postId}
      `;

      if (existingBookmark.length > 0) {
        await sql`
          DELETE FROM bookmarks 
          WHERE user_id = ${user._id} AND post_id = ${postId}
        `;
        res.json({ bookmarked: false });
      } else {
        await sql`
          INSERT INTO bookmarks (user_id, post_id)
          VALUES (${user._id}, ${postId})
        `;
        res.json({ bookmarked: true });
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Obtenir les posts bookmarkés
  getBookmarkedPosts: async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);

      const bookmarks = await sql`
        SELECT p.*
        FROM bookmarks b
        JOIN posts p ON b.post_id = p._id
        WHERE b.user_id = ${user._id}
        ORDER BY b.created_at DESC
      `;

      res.json(bookmarks);
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};