// controllers/usersController.js
import sql from '../config/db.js';
import { clerkClient } from '@clerk/clerk-sdk-node';

export const usersController = {
  // Synchroniser l'utilisateur
  syncUser: async (req, res) => {
    try {
      const { userId } = req.auth;
      
      if (!userId) {
        console.log('❌ No user ID found in auth');
        return res.status(401).json({ error: 'User ID not found in auth' });
      }

      console.log(`🔄 Syncing user with Clerk ID: ${userId}`);
      console.log('🔄 Starting user sync process');
      console.log('📋 Auth object:', req.auth);
      console.log('👤 User ID from auth:', userId);

      // Vérifier si l'utilisateur existe déjà
      const existingUser = await sql`
        SELECT * FROM users WHERE clerk_id = ${userId}
      `;

      if (existingUser.length > 0) {
        console.log(`✅ User already exists in database: ${existingUser[0].username}`);
        return res.status(200).json({ 
          user: existingUser[0], 
          message: "User already exists" 
        });
      }

      // Récupérer les données utilisateur depuis Clerk
      let clerkUser;
      try {
        clerkUser = await clerkClient.users.getUser(userId);
        console.log(`📋 Clerk user data retrieved: ${clerkUser.id}`);
      } catch (clerkError) {
        console.error('❌ Error fetching user from Clerk:', clerkError);
        return res.status(500).json({ error: 'Error fetching user data from Clerk' });
      }
      
      if (!clerkUser) {
        return res.status(404).json({ error: 'User not found in Clerk' });
      }

      // Extraire les données de Clerk
      const email = clerkUser.emailAddresses?.[0]?.emailAddress || '';
      const first_name = clerkUser.firstName || '';
      const last_name = clerkUser.lastName || '';
      const fullname = `${first_name} ${last_name}`.trim() || 'Anonymous User';
      const image = clerkUser.imageUrl || '';

      // Et après la récupération de l'utilisateur Clerk :
      console.log('📋 Clerk user data:', {
        id: clerkUser.id,
        email: clerkUser.emailAddresses?.[0]?.emailAddress,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        username: clerkUser.username
      });
      
      // Générer un username unique
      const baseUsername = clerkUser.username || 
        email?.split('@')[0] || 
        fullname.split(' ').join('_').toLowerCase() || 
        `user_${userId.substring(0, 8)}`;
      
      // Nettoyer le username (supprimer les caractères spéciaux)
      let finalUsername = baseUsername.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
      
      // Vérifier l'unicité du username
      let counter = 1;
      let tempUsername = finalUsername;
      let isUnique = false;
      
      while (!isUnique && counter <= 100) {
        const existingUsername = await sql`
          SELECT _id FROM users WHERE username = ${tempUsername}
        `;
        
        if (existingUsername.length === 0) {
          finalUsername = tempUsername;
          isUnique = true;
          break;
        }
        
        tempUsername = `${finalUsername}${counter}`;
        counter++;
      }

      // Fallback si aucun username unique n'est trouvé
      if (!isUnique) {
        finalUsername = `user_${userId.substring(0, 8)}_${Date.now()}`;
        console.log(`⚠️ Using fallback username: ${finalUsername}`);
      }

      console.log(`📝 Creating new user: ${finalUsername}`);

      // Créer le nouvel utilisateur
      let newUser;
      try {
        newUser = await sql`
          INSERT INTO users (
            clerk_id, 
            username, 
            fullname, 
            email, 
            image, 
            followers, 
            following, 
            posts,
            bio
          )
          VALUES (
            ${userId}, 
            ${finalUsername}, 
            ${fullname}, 
            ${email}, 
            ${image}, 
            0, 
            0, 
            0,
            ''
          )
          RETURNING 
            _id, 
            clerk_id, 
            username, 
            fullname, 
            email, 
            image, 
            followers, 
            following, 
            posts, 
            bio, 
            created_at
        `;

        if (!newUser || newUser.length === 0) {
          throw new Error('No user returned after insertion');
        }

        console.log(`✅ User created successfully: ${newUser[0].username}`);
        console.log(`📊 User details:`, {
          id: newUser[0]._id,
          username: newUser[0].username,
          email: newUser[0].email,
          fullname: newUser[0].fullname
        });

      } catch (dbError) {
        console.error('❌ Database error during user creation:', dbError);
        
        // Gestion spécifique des erreurs de contrainte d'unicité
        if (dbError.message?.includes('unique') || dbError.message?.includes('duplicate')) {
          // Réessayer avec un username différent
          const fallbackUsername = `user_${userId}_${Date.now()}`;
          console.log(`🔄 Retrying with fallback username: ${fallbackUsername}`);
          
          newUser = await sql`
            INSERT INTO users (
              clerk_id, 
              username, 
              fullname, 
              email, 
              image, 
              followers, 
              following, 
              posts,
              bio
            )
            VALUES (
              ${userId}, 
              ${fallbackUsername}, 
              ${fullname}, 
              ${email}, 
              ${image}, 
              0, 
              0, 
              0,
              ''
            )
            RETURNING 
              _id, 
              clerk_id, 
              username, 
              fullname, 
              email, 
              image, 
              followers, 
              following, 
              posts, 
              bio, 
              created_at
          `;
        } else {
          throw dbError;
        }
      }

      res.status(201).json({ 
        user: newUser[0], 
        message: "User created successfully" 
      });

    } catch (error) {
      console.error('❌ Error syncing user:', error);
      
      // Erreurs spécifiques avec messages détaillés
      if (error.message?.includes('clerk') || error.message?.includes('Clerk')) {
        return res.status(500).json({ 
          error: 'Error fetching user data from authentication service',
          details: error.message 
        });
      }
      
      if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
        return res.status(409).json({ 
          error: 'Username already exists',
          details: 'Please try again or contact support'
        });
      }
      
      if (error.message?.includes('database') || error.message?.includes('SQL')) {
        return res.status(500).json({ 
          error: 'Database error during user creation',
          details: error.message 
        });
      }
      
      res.status(500).json({ 
        error: 'Internal server error during user sync',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Obtenir l'utilisateur courant
  getCurrentUser: async (req, res) => {
    try {
      const { userId } = req.auth;
      
      if (!userId) {
        return res.status(401).json({ error: 'User ID not found in auth' });
      }

      console.log(`🔍 Fetching current user with Clerk ID: ${userId}`);

      const user = await sql`
        SELECT 
          _id, 
          username, 
          fullname, 
          email, 
          bio, 
          image, 
          followers, 
          following, 
          posts,
          created_at
        FROM users 
        WHERE clerk_id = ${userId}
      `;

      if (user.length === 0) {
        console.log(`❌ User not found in database for Clerk ID: ${userId}`);
        return res.status(404).json({ error: 'User not found in database' });
      }

      console.log(`✅ Current user fetched: ${user[0].username}`);
      res.json({ user: user[0] });

    } catch (error) {
      console.error('❌ Error fetching current user:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Obtenir le profil utilisateur par ID
  getUserProfile: async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      console.log(`🔍 Fetching user profile with ID: ${id}`);

      const user = await sql`
        SELECT 
          _id, 
          username, 
          fullname, 
          email, 
          bio, 
          image, 
          followers, 
          following, 
          posts,
          created_at
        FROM users 
        WHERE _id = ${id}
      `;

      if (user.length === 0) {
        console.log(`❌ User profile not found for ID: ${id}`);
        return res.status(404).json({ error: 'User not found' });
      }

      console.log(`✅ User profile fetched: ${user[0].username}`);
      res.json({ user: user[0] });

    } catch (error) {
      console.error('❌ Error fetching user profile:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Mettre à jour le profil
  updateProfile: async (req, res) => {
    try {
      const { userId } = req.auth;
      const { fullname, bio } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'User ID not found in auth' });
      }

      if (!fullname || fullname.trim() === '') {
        return res.status(400).json({ error: 'Fullname is required' });
      }

      console.log(`🔄 Updating profile for user: ${userId}`);

      const updatedUser = await sql`
        UPDATE users 
        SET 
          fullname = ${fullname.trim()}, 
          bio = ${bio || ''}
        WHERE clerk_id = ${userId}
        RETURNING 
          _id, 
          username, 
          fullname, 
          email, 
          bio, 
          image, 
          followers, 
          following, 
          posts,
          created_at
      `;

      if (updatedUser.length === 0) {
        console.log(`❌ User not found during update: ${userId}`);
        return res.status(404).json({ error: 'User not found' });
      }

      console.log(`✅ Profile updated for: ${updatedUser[0].username}`);
      res.json({ user: updatedUser[0] });

    } catch (error) {
      console.error('❌ Error updating profile:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Vérifier si on suit un utilisateur
  isFollowing: async (req, res) => {
    try {
      const { userId } = req.auth;
      const { followingId } = req.params;

      if (!userId) {
        return res.status(401).json({ error: 'User ID not found in auth' });
      }

      if (!followingId) {
        return res.status(400).json({ error: 'Following ID is required' });
      }

      console.log(`🔍 Checking follow status: ${userId} -> ${followingId}`);

      const currentUser = await sql`
        SELECT _id FROM users WHERE clerk_id = ${userId}
      `;

      if (currentUser.length === 0) {
        console.log(`❌ Current user not found: ${userId}`);
        return res.status(404).json({ error: 'Current user not found' });
      }

      const follow = await sql`
        SELECT * FROM follows 
        WHERE follower_id = ${currentUser[0]._id} AND following_id = ${followingId}
      `;

      const isFollowing = follow.length > 0;
      console.log(`✅ Follow status: ${isFollowing}`);

      res.json({ isFollowing });

    } catch (error) {
      console.error('❌ Error checking follow status:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Suivre/Ne plus suivre un utilisateur
  toggleFollow: async (req, res) => {
    try {
      const { userId } = req.auth;
      const { followingId } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'User ID not found in auth' });
      }

      if (!followingId) {
        return res.status(400).json({ error: 'Following ID is required' });
      }

      console.log(`🔄 Toggling follow: ${userId} -> ${followingId}`);

      // Récupérer les IDs des utilisateurs
      const [currentUser, targetUser] = await Promise.all([
        sql`SELECT _id FROM users WHERE clerk_id = ${userId}`,
        sql`SELECT _id FROM users WHERE _id = ${followingId}`
      ]);

      if (currentUser.length === 0 || targetUser.length === 0) {
        console.log(`❌ User not found - current: ${currentUser.length}, target: ${targetUser.length}`);
        return res.status(404).json({ error: 'User not found' });
      }

      const currentUserId = currentUser[0]._id;
      const targetUserId = targetUser[0]._id;

      if (currentUserId === targetUserId) {
        console.log(`❌ User attempted to follow themselves: ${userId}`);
        return res.status(400).json({ error: 'You cannot follow yourself' });
      }

      // Vérifier si on suit déjà
      const existingFollow = await sql`
        SELECT * FROM follows 
        WHERE follower_id = ${currentUserId} AND following_id = ${targetUserId}
      `;

      let result;

      if (existingFollow.length > 0) {
        // Ne plus suivre
        console.log(`➖ Unfollowing user: ${targetUserId}`);
        
        await sql`
          DELETE FROM follows 
          WHERE follower_id = ${currentUserId} AND following_id = ${targetUserId}
        `;

        // Mettre à jour les compteurs
        await Promise.all([
          sql`UPDATE users SET following = following - 1 WHERE _id = ${currentUserId}`,
          sql`UPDATE users SET followers = followers - 1 WHERE _id = ${targetUserId}`
        ]);

        result = { followed: false, action: 'unfollowed' };
      } else {
        // Suivre
        console.log(`➕ Following user: ${targetUserId}`);
        
        await sql`
          INSERT INTO follows (follower_id, following_id)
          VALUES (${currentUserId}, ${targetUserId})
        `;

        // Mettre à jour les compteurs
        await Promise.all([
          sql`UPDATE users SET following = following + 1 WHERE _id = ${currentUserId}`,
          sql`UPDATE users SET followers = followers + 1 WHERE _id = ${targetUserId}`
        ]);

        // Créer une notification
        try {
          await sql`
            INSERT INTO notifications (receiver_id, sender_id, type)
            VALUES (${targetUserId}, ${currentUserId}, 'follow')
          `;
          console.log(`📬 Follow notification created`);
        } catch (notifError) {
          console.error('❌ Error creating follow notification:', notifError);
          // Ne pas bloquer l'opération principale si la notification échoue
        }

        result = { followed: true, action: 'followed' };
      }

      console.log(`✅ Follow toggled successfully: ${result.action}`);
      res.json(result);

    } catch (error) {
      console.error('❌ Error toggling follow:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};