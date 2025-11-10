import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';

// Middleware Clerk pour protéger les routes
export const requireAuth = ClerkExpressRequireAuth;

// Middleware pour récupérer l'utilisateur authentifié
export const getAuthenticatedUser = async (req) => {
  try {
    const { userId } = req.auth;
    
    const sql = (await import('../config/db.js')).default;
    const user = await sql`
      SELECT * FROM users WHERE clerk_id = ${userId}
    `;
    
    if (user.length === 0) {
      throw new Error('User not found');
    }
    
    return user[0];
  } catch (error) {
    console.error('Error in getAuthenticatedUser:', error);
    throw new Error('Unauthorized');
  }
};

// Middleware pour vérifier la propriété
export const checkOwnership = (resourceType) => {
  return async (req, res, next) => {
    try {
      const user = await getAuthenticatedUser(req);
      const resourceId = req.params.id;
      
      const sql = (await import('../config/db.js')).default;
      
      let resource;
      switch (resourceType) {
        case 'post':
          resource = await sql`
            SELECT * FROM posts WHERE _id = ${resourceId} AND user_id = ${user._id}
          `;
          break;
        case 'comment':
          resource = await sql`
            SELECT * FROM comments WHERE _id = ${resourceId} AND user_id = ${user._id}
          `;
          break;
        default:
          return res.status(400).json({ error: 'Invalid resource type' });
      }
      
      if (resource.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      next();
    } catch (error) {
      console.error('Error in checkOwnership:', error);
      res.status(401).json({ error: 'Unauthorized' });
    }
  };
};
