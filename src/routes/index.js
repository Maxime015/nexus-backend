import express from 'express';
import { usersController } from '../controllers/usersController.js';
import { postsController } from '../controllers/postsController.js';
import { commentsController } from '../controllers/commentsController.js';
import { bookmarksController } from '../controllers/bookmarksController.js';
import { notificationsController } from '../controllers/notificationsController.js';
import { requireAuth } from '../middlewares/auth.js';

const router = express.Router();

// Routes utilisateurs
router.post('/users/sync', requireAuth, usersController.syncUser); // Nouvelle route de sync
router.get('/users/me', requireAuth, usersController.getCurrentUser); // Récupérer l'utilisateur courant
router.get('/users/profile/:id', requireAuth, usersController.getUserProfile);
router.put('/users/profile', requireAuth, usersController.updateProfile);
router.get('/users/is-following/:followingId', requireAuth, usersController.isFollowing);
router.post('/users/toggle-follow', requireAuth, usersController.toggleFollow);

// Routes posts
router.post('/posts', requireAuth, postsController.createPost);
router.get('/posts/feed', requireAuth, postsController.getFeedPosts);
router.get('/posts/user/:userId?', requireAuth, postsController.getPostsByUser);
router.delete('/posts/:postId', requireAuth, postsController.deletePost);
router.post('/posts/toggle-like', requireAuth, postsController.toggleLike);

// Routes commentaires
router.post('/comments', requireAuth, commentsController.addComment);
router.get('/comments/:postId', requireAuth, commentsController.getComments);

// Routes bookmarks
router.post('/bookmarks/toggle', requireAuth, bookmarksController.toggleBookmark);
router.get('/bookmarks', requireAuth, bookmarksController.getBookmarkedPosts);

// Routes notifications
router.get('/notifications', requireAuth, notificationsController.getNotifications);

export default router;