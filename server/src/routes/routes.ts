import type { Express } from 'express';
import express from 'express';
import { createServer, type Server } from 'http';
import { setupAuth } from '../auth/auth.ts';
import { storage } from '../model';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for handling file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      // Create uploads directory if it doesn't exist
      const uploadDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      // Generate a unique filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only accept images
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'));
      return;
    }
    cb(null, true);
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // File upload route - must be before static file serving
  app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Return the URL to access the uploaded file
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
  });

  // Serve uploaded files - must be after upload route
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Photo routes
  app.get('/api/photos', async (req, res) => {
    const photos = await storage.getPhotos();
    res.json(photos);
  });

  app.get('/api/photos/feed', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const photos = await storage.getFeedPhotos(req.user.id);
    res.json(photos);
  });

  app.get('/api/photos/user/:userId', async (req, res) => {
    const photos = await storage.getUserPhotos(req.params.userId);
    res.json(photos);
  });

  app.post('/api/photos', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { imageUrl, caption } = req.body;
    const photo = await storage.createPhoto(req.user.id, imageUrl, caption);
    res.json(photo);
  });

  // Like routes
  app.post('/api/photos/:photoId/like', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    await storage.likePhoto(req.user.id, req.params.photoId);
    res.sendStatus(200);
  });

  // Follow routes
  app.get('/api/users/:userId/following', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const isFollowing = await storage.isFollowing(req.user.id, req.params.userId);
    res.json({ isFollowing });
  });

  app.post('/api/users/:userId/follow', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await storage.followUser(req.user.id, req.params.userId);
    res.sendStatus(200);
  });

  app.post('/api/users/:userId/unfollow', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await storage.unfollowUser(req.user.id, req.params.userId);
    res.sendStatus(200);
  });

  // Comment routes
  app.get('/api/photos/:photoId/comments', async (req, res) => {
    const comments = await storage.getPhotoComments(req.params.photoId);
    res.json(comments);
  });

  app.post('/api/photos/:photoId/comments', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const comment = await storage.createComment(req.user.id, req.params.photoId, req.body.content);
    res.json(comment);
  });

  app.post('/api/comments/:commentId/like', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await storage.likeComment(req.user.id, req.params.commentId);
    res.sendStatus(200);
  });

  app.post('/api/comments/:commentId/unlike', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await storage.unlikeComment(req.user.id, req.params.commentId);
    res.sendStatus(200);
  });

  // Profile routes
  app.get('/api/users/:userId', async (req, res) => {
    const user = await storage.getUser(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Don't send password in response
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  app.patch('/api/user/profile', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { bio, avatarUrl, displayName } = req.body;
    try {
      const user = await storage.updateUserProfile(req.user.id, bio, avatarUrl, displayName);
      // Don't send password in response
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  // Notification routes
  app.get('/api/notifications', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const notifications = await storage.getUserNotifications(req.user.id);
    res.json(notifications);
  });

  app.post('/api/notifications/:id/read', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await storage.markNotificationAsRead(req.params.id);
    res.sendStatus(200);
  });

  app.post('/api/notifications/read-all', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await storage.markAllNotificationsAsRead(req.user.id);
    res.sendStatus(200);
  });

  // User list routes
  app.get('/api/photos/:photoId/likes', async (req, res) => {
    const users = await storage.getLikedUsers(req.params.photoId);
    res.json(users);
  });

  app.get('/api/users/:userId/followers', async (req, res) => {
    const followers = await storage.getFollowers(req.params.userId);
    res.json(followers);
  });

  return createServer(app);
}
