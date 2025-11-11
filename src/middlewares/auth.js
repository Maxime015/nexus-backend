import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';

// Middleware Clerk pour protéger les routes
export const requireAuth = ClerkExpressRequireAuth({
  // Options supplémentaires si nécessaire
});

// Middleware pour récupérer l'utilisateur authentifié
export const getAuthenticatedUser = async (req) => {
  try {
    const { userId } = req.auth;
    
    if (!userId) {
      throw new Error('No user ID in auth');
    }
    
    const sql = (await import('../config/db.js')).default;
    const user = await sql`
      SELECT * FROM users WHERE clerk_id = ${userId}
    `;
    
    if (user.length === 0) {
      throw new Error('User not found in database');
    }
    
    return user[0];
  } catch (error) {
    console.error('Error in getAuthenticatedUser:', error);
    throw new Error('Unauthorized');
  }
};