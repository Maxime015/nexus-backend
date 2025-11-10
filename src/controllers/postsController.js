import sql from '../config/db.js';
import { getAuthenticatedUser } from '../middlewares/auth.js';
import cloudinary from '../config/cloudinary.js';

export const postsController = {
  // Créer un post
  createPost: async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      const { caption } = req.body;
      const imageFile = req.file;

      if (!caption && !imageFile) {
        return res.status(400).json({ error: 'Post must contain either text or image' });
      }

      let imageUrl = '';
      let storageId = '';

      // upload image to Cloudinary if provided
      if (imageFile) {
        try {
          // convert buffer to base64 for cloudinary
          const base64Image = `data:${imageFile.mimetype};base64,${imageFile.buffer.toString(
            'base64'
          )}`;

          const uploadResponse = await cloudinary.uploader.upload(base64Image, {
            folder: 'social_media_posts',
            resource_type: 'image',
            transformation: [
              { width: 800, height: 600, crop: 'limit' },
              { quality: 'auto' },
              { format: 'auto' },
            ],
          });
          
          imageUrl = uploadResponse.secure_url;
          storageId = uploadResponse.public_id;
        } catch (uploadError) {
          console.error('Cloudinary upload error:', uploadError);
          return res.status(400).json({ error: 'Failed to upload image' });
        }
      }

      const newPost = await sql`
        INSERT INTO posts (user_id, image_url, storage_id, caption, likes, comments)
        VALUES (${user._id}, ${imageUrl}, ${storageId}, ${caption || ''}, 0, 0)
        RETURNING *
      `;

      // Mettre à jour le compteur de posts de l'utilisateur
      await sql`
        UPDATE users SET posts = posts + 1 WHERE _id = ${user._id}
      `;

      res.status(201).json(newPost[0]);
    } catch (error) {
      console.error('Error creating post:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Obtenir les posts du feed
  getFeedPosts: async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);

      const posts = await sql`
        SELECT p.*, u.username, u.image as user_image,
               EXISTS(
                 SELECT 1 FROM likes l 
                 WHERE l.post_id = p._id AND l.user_id = ${user._id}
               ) as is_liked,
               EXISTS(
                 SELECT 1 FROM bookmarks b 
                 WHERE b.post_id = p._id AND b.user_id = ${user._id}
               ) as is_bookmarked
        FROM posts p
        JOIN users u ON p.user_id = u._id
        ORDER BY p.created_at DESC
      `;

      const postsWithInfo = posts.map(post => ({
        ...post,
        author: {
          _id: post.user_id,
          username: post.username,
          image: post.user_image
        },
        isLiked: post.is_liked,
        isBookmarked: post.is_bookmarked
      }));

      res.json(postsWithInfo);
    } catch (error) {
      console.error('Error fetching feed posts:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Obtenir les posts d'un utilisateur
  getPostsByUser: async (req, res) => {
    try {
      const { userId } = req.params;
      
      let targetUserId;
      if (userId) {
        targetUserId = userId;
      } else {
        const user = await getAuthenticatedUser(req);
        targetUserId = user._id;
      }

      const posts = await sql`
        SELECT * FROM posts 
        WHERE user_id = ${targetUserId}
        ORDER BY created_at DESC
      `;

      res.json(posts);
    } catch (error) {
      console.error('Error fetching user posts:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Supprimer un post
  deletePost: async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      const { postId } = req.params;

      // Vérifier que le post appartient à l'utilisateur
      const post = await sql`
        SELECT * FROM posts WHERE _id = ${postId} AND user_id = ${user._id}
      `;

      if (post.length === 0) {
        return res.status(404).json({ error: 'Post not found or access denied' });
      }

      // Supprimer l'image de Cloudinary si elle existe
      if (post[0].storage_id) {
        try {
          await cloudinary.uploader.destroy(post[0].storage_id);
        } catch (cloudinaryError) {
          console.error('Error deleting image from Cloudinary:', cloudinaryError);
          // On continue quand même la suppression du post même si Cloudinary échoue
        }
      }

      // Supprimer les likes associés
      await sql`DELETE FROM likes WHERE post_id = ${postId}`;
      
      // Supprimer les bookmarks associés
      await sql`DELETE FROM bookmarks WHERE post_id = ${postId}`;
      
      // Supprimer les notifications associées
      await sql`DELETE FROM notifications WHERE post_id = ${postId}`;
      
      // Supprimer les commentaires associés
      await sql`DELETE FROM comments WHERE post_id = ${postId}`;

      // Supprimer le post
      await sql`DELETE FROM posts WHERE _id = ${postId}`;

      // Mettre à jour le compteur de posts
      await sql`
        UPDATE users SET posts = GREATEST(0, posts - 1) WHERE _id = ${user._id}
      `;

      res.json({ message: 'Post deleted successfully' });
    } catch (error) {
      console.error('Error deleting post:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Aimer/Ne plus aimer un post
  toggleLike: async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      const { postId } = req.body;

      const existingLike = await sql`
        SELECT * FROM likes 
        WHERE user_id = ${user._id} AND post_id = ${postId}
      `;

      const post = await sql`SELECT * FROM posts WHERE _id = ${postId}`;
      if (post.length === 0) {
        return res.status(404).json({ error: 'Post not found' });
      }

      if (existingLike.length > 0) {
        // Retirer le like
        await sql`
          DELETE FROM likes 
          WHERE user_id = ${user._id} AND post_id = ${postId}
        `;
        await sql`
          UPDATE posts SET likes = GREATEST(0, likes - 1) WHERE _id = ${postId}
        `;
        res.json({ liked: false });
      } else {
        // Ajouter le like
        await sql`
          INSERT INTO likes (user_id, post_id)
          VALUES (${user._id}, ${postId})
        `;
        await sql`
          UPDATE posts SET likes = likes + 1 WHERE _id = ${postId}
        `;

        // Créer une notification si ce n'est pas notre propre post
        if (post[0].user_id !== user._id) {
          await sql`
            INSERT INTO notifications (receiver_id, sender_id, type, post_id)
            VALUES (${post[0].user_id}, ${user._id}, 'like', ${postId})
          `;
        }

        res.json({ liked: true });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};