import sql from '../config/db.js';
import { getAuthenticatedUser } from '../middlewares/auth.js';

export const usersController = {
  // Créer un utilisateur
  createUser: async (req, res) => {
    try {
      const { id, email_addresses, first_name, last_name, image_url, username } = req.body;
      
      const email = email_addresses?.[0]?.email_address;
      const fullname = `${first_name || ''} ${last_name || ''}`.trim();
      const finalUsername = username || email?.split('@')[0] || 
        fullname.split(' ').join('_').toLowerCase() || `user_${id.substring(0, 6)}`;

      // Vérifier si l'utilisateur existe déjà
      const existingUser = await sql`
        SELECT * FROM users WHERE clerk_id = ${id}
      `;

      if (existingUser.length > 0) {
        return res.status(200).json(existingUser[0]);
      }

      // Créer un nouvel utilisateur
      const newUser = await sql`
        INSERT INTO users (clerk_id, username, fullname, email, image, followers, following, posts)
        VALUES (${id}, ${finalUsername}, ${fullname}, ${email}, ${image_url}, 0, 0, 0)
        RETURNING *
      `;

      res.status(201).json(newUser[0]);
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Obtenir le profil utilisateur
  getUserProfile: async (req, res) => {
    try {
      const { id } = req.params;
      
      const user = await sql`
        SELECT _id, username, fullname, email, bio, image, followers, following, posts
        FROM users WHERE _id = ${id}
      `;

      if (user.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(user[0]);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Mettre à jour le profil
  updateProfile: async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      const { fullname, bio } = req.body;

      const updatedUser = await sql`
        UPDATE users 
        SET fullname = ${fullname}, bio = ${bio}
        WHERE _id = ${user._id}
        RETURNING *
      `;

      res.json(updatedUser[0]);
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Vérifier si on suit un utilisateur
  isFollowing: async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      const { followingId } = req.params;

      const follow = await sql`
        SELECT * FROM follows 
        WHERE follower_id = ${user._id} AND following_id = ${followingId}
      `;

      res.json({ isFollowing: follow.length > 0 });
    } catch (error) {
      console.error('Error checking follow status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Suivre/Ne plus suivre un utilisateur
  toggleFollow: async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      const { followingId } = req.body;

      // Vérifier si on suit déjà
      const existingFollow = await sql`
        SELECT * FROM follows 
        WHERE follower_id = ${user._id} AND following_id = ${followingId}
      `;

      if (existingFollow.length > 0) {
        // Ne plus suivre
        await sql`
          DELETE FROM follows 
          WHERE follower_id = ${user._id} AND following_id = ${followingId}
        `;

        // Mettre à jour les compteurs
        await sql`
          UPDATE users SET following = following - 1 WHERE _id = ${user._id}
        `;
        await sql`
          UPDATE users SET followers = followers - 1 WHERE _id = ${followingId}
        `;

        res.json({ followed: false });
      } else {
        // Suivre
        await sql`
          INSERT INTO follows (follower_id, following_id)
          VALUES (${user._id}, ${followingId})
        `;

        // Mettre à jour les compteurs
        await sql`
          UPDATE users SET following = following + 1 WHERE _id = ${user._id}
        `;
        await sql`
          UPDATE users SET followers = followers + 1 WHERE _id = ${followingId}
        `;

        // Créer une notification
        await sql`
          INSERT INTO notifications (receiver_id, sender_id, type)
          VALUES (${followingId}, ${user._id}, 'follow')
        `;

        res.json({ followed: true });
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};