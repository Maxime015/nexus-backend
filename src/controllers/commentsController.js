import sql from '../config/db.js';
import { getAuthenticatedUser } from '../middlewares/auth.js';

export const commentsController = {
  // Ajouter un commentaire
  addComment: async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      const { content, postId } = req.body;

      const post = await sql`SELECT * FROM posts WHERE _id = ${postId}`;
      if (post.length === 0) {
        return res.status(404).json({ error: 'Post not found' });
      }

      const newComment = await sql`
        INSERT INTO comments (user_id, post_id, content)
        VALUES (${user._id}, ${postId}, ${content})
        RETURNING *
      `;

      // Incrémenter le compteur de commentaires
      await sql`
        UPDATE posts SET comments = comments + 1 WHERE _id = ${postId}
      `;

      // Créer une notification si ce n'est pas notre propre post
      if (post[0].user_id !== user._id) {
        await sql`
          INSERT INTO notifications (receiver_id, sender_id, type, post_id, comment_id)
          VALUES (${post[0].user_id}, ${user._id}, 'comment', ${postId}, ${newComment[0]._id})
        `;
      }

      res.status(201).json(newComment[0]);
    } catch (error) {
      console.error('Error adding comment:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Obtenir les commentaires d'un post
  getComments: async (req, res) => {
    try {
      const { postId } = req.params;

      const comments = await sql`
        SELECT c.*, u.fullname, u.image
        FROM comments c
        JOIN users u ON c.user_id = u._id
        WHERE c.post_id = ${postId}
        ORDER BY c.created_at ASC
      `;

      const commentsWithInfo = comments.map(comment => ({
        ...comment,
        user: {
          fullname: comment.fullname,
          image: comment.image
        }
      }));

      res.json(commentsWithInfo);
    } catch (error) {
      console.error('Error fetching comments:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};