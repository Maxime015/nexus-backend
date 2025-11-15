// index.js
import express from 'express';
import { bookmarksController } from '../controllers/bookmarksController.js';
import { commentsController } from '../controllers/commentsController.js';
import { notificationsController } from '../controllers/notificationsController.js';
import { postsController } from '../controllers/postsController.js';
import { usersController } from '../controllers/usersController.js';
import { requireAuth } from '../middlewares/auth.js';
import upload from '../middlewares/upload.middleware.js';

const router = express.Router();

// Routes utilisateurs
router.post('/users/sync', requireAuth, usersController.syncUser);
router.get('/users/me', requireAuth, usersController.getCurrentUser);
router.get('/users/profile/:id', requireAuth, usersController.getUserProfile);
router.put('/users/profile', requireAuth, usersController.updateProfile);
router.get('/users/is-following/:followingId', requireAuth, usersController.isFollowing);
router.post('/users/toggle-follow', requireAuth, usersController.toggleFollow);

// Routes posts
router.post('/posts', requireAuth, upload.single('image'), postsController.createPost);
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
router.delete('/notifications/:notificationId', requireAuth, notificationsController.deleteNotification);

export default router;