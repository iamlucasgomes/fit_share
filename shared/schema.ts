import { boolean, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull().unique(),
  displayName: text('display_name'),
  password: text('password').notNull(),
  bio: text('bio'),
  avatarUrl: text('avatar_url'),
  followerCount: integer('follower_count').default(0),
  isDeleted: boolean('is_deleted').default(false),
});

export const photos = pgTable('photos', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  imageUrl: text('image_url').notNull(),
  caption: text('caption'),
  likeCount: integer('like_count').default(0),
  commentCount: integer('comment_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  isDeleted: boolean('is_deleted').default(false),
});

export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  photoId: uuid('photo_id').notNull(),
  content: text('content').notNull(),
  likeCount: integer('like_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  isDeleted: boolean('is_deleted').default(false),
});

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  actorId: uuid('actor_id').notNull(), // User who triggered the notification
  type: text('type').notNull(), // 'like', 'comment', 'follow'
  photoId: uuid('photo_id'), // Optional, for photo-related notifications
  commentId: uuid('comment_id'), // Optional, for comment-related notifications
  read: boolean('read').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  isDeleted: boolean('is_deleted').default(false),
});

export const commentLikes = pgTable('comment_likes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  commentId: uuid('comment_id').notNull(),
  isDeleted: boolean('is_deleted').default(false),
});

export const follows = pgTable('follows', {
  id: uuid('id').primaryKey().defaultRandom(),
  followerId: uuid('follower_id').notNull(),
  followingId: uuid('following_id').notNull(),
  isDeleted: boolean('is_deleted').default(false),
});

export const likes = pgTable('likes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  photoId: uuid('photo_id').notNull(),
  isDeleted: boolean('is_deleted').default(false),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertPhotoSchema = createInsertSchema(photos).pick({
  imageUrl: true,
  caption: true,
});

export const insertCommentSchema = createInsertSchema(comments).pick({
  content: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Photo = typeof photos.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Follow = typeof follows.$inferSelect;
export type Like = typeof likes.$inferSelect;
export type CommentLike = typeof commentLikes.$inferSelect;
