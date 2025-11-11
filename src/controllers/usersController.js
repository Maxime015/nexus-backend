import sql from '../config/db.js';
import { clerkClient } from '@clerk/clerk-sdk-node';

export const usersController = {
  // Synchroniser l'utilisateur (remplace createUser pour l'API)
  syncUser: async (req, res) => {
    try {
      const { userId } = req.auth; // Récupéré du middleware Clerk
      
      // Vérifier si l'utilisateur existe déjà
      const existingUser = await sql`
        SELECT * FROM users WHERE clerk_id = ${userId}
      `;

      if (existingUser.length > 0) {
        return res.status(200).json({ 
          user: existingUser[0], 
          message: "User already exists" 
        });
      }

      // Récupérer les données utilisateur depuis Clerk
      const clerkUser = await clerkClient.users.getUser(userId);
      
      const email = clerkUser.emailAddresses?.[0]?.emailAddress;
      const first_name = clerkUser.firstName || '';
      const last_name = clerkUser.lastName || '';
      const fullname = `${first_name} ${last_name}`.trim();
      
      // Générer un username unique
      const baseUsername = clerkUser.username || 
        email?.split('@')[0] || 
        fullname.split(' ').join('_').toLowerCase() || 
        `user_${userId.substring(0, 6)}`;
      
      // Vérifier l'unicité du username
      let finalUsername = baseUsername;
      let counter = 1;
      
      while (true) {
        const existingUsername = await sql`
          SELECT _id FROM users WHERE username = ${finalUsername}
        `;
        
        if (existingUsername.length === 0) break;
        
        finalUsername = `${baseUsername}${counter}`;
        counter++;
      }

      // Créer le nouvel utilisateur
      const newUser = await sql`
        INSERT INTO users (clerk_id, username, fullname, email, image, followers, following, posts)
        VALUES (${userId}, ${finalUsername}, ${fullname}, ${email}, ${clerkUser.imageUrl}, 0, 0, 0)
        RETURNING _id, clerk_id, username, fullname, email, image, followers, following, posts, bio
      `;

      res.status(201).json({ 
        user: newUser[0], 
        message: "User created successfully" 
      });
    } catch (error) {
      console.error('Error syncing user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Obtenir l'utilisateur courant
  getCurrentUser: async (req, res) => {
    try {
      const { userId } = req.auth;
      
      const user = await sql`
        SELECT _id, username, fullname, email, bio, image, followers, following, posts
        FROM users WHERE clerk_id = ${userId}
      `;

      if (user.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ user: user[0] });
    } catch (error) {
      console.error('Error fetching current user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Obtenir le profil utilisateur par ID
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

      res.json({ user: user[0] });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Mettre à jour le profil
  updateProfile: async (req, res) => {
    try {
      const { userId } = req.auth;
      const { fullname, bio } = req.body;

      const updatedUser = await sql`
        UPDATE users 
        SET fullname = ${fullname}, bio = ${bio}
        WHERE clerk_id = ${userId}
        RETURNING _id, username, fullname, email, bio, image, followers, following, posts
      `;

      res.json({ user: updatedUser[0] });
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Vérifier si on suit un utilisateur
  isFollowing: async (req, res) => {
    try {
      const { userId } = req.auth;
      const { followingId } = req.params;

      const currentUser = await sql`
        SELECT _id FROM users WHERE clerk_id = ${userId}
      `;

      if (currentUser.length === 0) {
        return res.status(404).json({ error: 'Current user not found' });
      }

      const follow = await sql`
        SELECT * FROM follows 
        WHERE follower_id = ${currentUser[0]._id} AND following_id = ${followingId}
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
      const { userId } = req.auth;
      const { followingId } = req.body;

      // Récupérer les IDs des utilisateurs
      const [currentUser, targetUser] = await Promise.all([
        sql`SELECT _id FROM users WHERE clerk_id = ${userId}`,
        sql`SELECT _id FROM users WHERE _id = ${followingId}`
      ]);

      if (currentUser.length === 0 || targetUser.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const currentUserId = currentUser[0]._id;
      const targetUserId = targetUser[0]._id;

      if (currentUserId === targetUserId) {
        return res.status(400).json({ error: 'You cannot follow yourself' });
      }

      // Vérifier si on suit déjà
      const existingFollow = await sql`
        SELECT * FROM follows 
        WHERE follower_id = ${currentUserId} AND following_id = ${targetUserId}
      `;

      if (existingFollow.length > 0) {
        // Ne plus suivre
        await sql`
          DELETE FROM follows 
          WHERE follower_id = ${currentUserId} AND following_id = ${targetUserId}
        `;

        // Mettre à jour les compteurs
        await sql`
          UPDATE users SET following = following - 1 WHERE _id = ${currentUserId}
        `;
        await sql`
          UPDATE users SET followers = followers - 1 WHERE _id = ${targetUserId}
        `;

        res.json({ followed: false });
      } else {
        // Suivre
        await sql`
          INSERT INTO follows (follower_id, following_id)
          VALUES (${currentUserId}, ${targetUserId})
        `;

        // Mettre à jour les compteurs
        await sql`
          UPDATE users SET following = following + 1 WHERE _id = ${currentUserId}
        `;
        await sql`
          UPDATE users SET followers = followers + 1 WHERE _id = ${targetUserId}
        `;

        // Créer une notification
        await sql`
          INSERT INTO notifications (receiver_id, sender_id, type)
          VALUES (${targetUserId}, ${currentUserId}, 'follow')
        `;

        res.json({ followed: true });
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};