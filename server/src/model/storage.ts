import * as schema from '@shared/schema.ts';
import { Comment, InsertUser, Notification, Photo, User } from '@shared/schema.ts';

import session from 'express-session';
import createMemoryStore from 'memorystore';
import { and, desc, eq, inArray } from 'drizzle-orm';
import db from '../db';
import { asc } from 'drizzle-orm/sql/expressions/select';
import { or } from 'drizzle-orm/sql/expressions/conditions';

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  sessionStore: session.Store;

  // User methods
  getUser(id: string): Promise<User | undefined>;

  getUserByUsername(username: string): Promise<User | undefined>;

  createUser(user: InsertUser): Promise<User>;

  updateUserProfile(
    userId: string,
    bio: string,
    avatarUrl: string,
    displayName: string
  ): Promise<User>;

  isFollowing(followerId: string, followingId: string): Promise<boolean>;

  getFollowers(userId: string): Promise<User[]>;

  getLikedUsers(photoId: string): Promise<User[]>;

  // Photo methods
  createPhoto(userId: string, imageUrl: string, caption?: string): Promise<Photo>;

  getPhotos(): Promise<Photo[]>;

  getUserPhotos(userId: string): Promise<Photo[]>;

  getFeedPhotos(userId: string): Promise<Photo[]>;

  // Like methods
  likePhoto(userId: string, photoId: string): Promise<void>;

  unlikePhoto(userId: string, photoId: string): Promise<void>;

  // Follow methods
  followUser(followerId: string, followingId: string): Promise<void>;

  unfollowUser(followerId: string, followingId: string): Promise<void>;

  // Comment methods
  createComment(userId: string, photoId: string, content: string): Promise<Comment>;

  getPhotoComments(photoId: string): Promise<Comment[]>;

  likeComment(userId: string, commentId: number): Promise<void>;

  unlikeComment(userId: string, commentId: number): Promise<void>;

  // Notification methods
  createNotification(
    userId: string,
    actorId: string,
    type: string,
    photoId?: string,
    commentId?: string
  ): Promise<void>;

  getUserNotifications(userId: string): Promise<Notification[]>;

  markNotificationAsRead(notificationId: string): Promise<void>;

  markAllNotificationsAsRead(userId: string): Promise<void>;
}

export class PostgresStorage implements IStorage {
  sessionStore: session.Store;
  async;
  async;
  async;
  async;
  async;
  async;
  async;
  async;
  async;
  async;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    const users = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return users[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const users = await db.select().from(schema.users).where(eq(schema.users.username, username));
    return users[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(schema.users).values(insertUser).returning();
    return user;
  }

  async updateUserProfile(
    userId: string,
    bio: string,
    avatarUrl: string,
    displayName: string
  ): Promise<User> {
    const [user] = await db
      .update(schema.users)
      .set({
        bio: bio || null,
        avatarUrl: avatarUrl || null,
        displayName: displayName || null,
      })
      .where(eq(schema.users.id, userId))
      .returning();
    return user;
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const follows = await db
      .select()
      .from(schema.follows)
      .where(
        and(
          eq(schema.follows.followerId, followerId),
          eq(schema.follows.followingId, followingId),
          eq(schema.follows.isDeleted, false)
        )
      );
    return follows.length > 0;
  }

  async getFollowers(userId: string): Promise<User[]> {
    const followers = await db
      .select({
        user: schema.users,
      })
      .from(schema.follows)
      .where(eq(schema.follows.followingId, userId))
      .innerJoin(schema.users, eq(schema.users.id, schema.follows.followerId));
    return followers.map(f => f.user);
  }

  async getLikedUsers(photoId: string): Promise<User[]> {
    const likes = await db
      .select({
        user: schema.users,
      })
      .from(schema.likes)
      .where(eq(schema.likes.photoId, photoId))
      .innerJoin(schema.users, eq(schema.users.id, schema.likes.userId));
    return likes.map(l => l.user);
  }

  async createPhoto(userId: string, imageUrl: string, caption?: string): Promise<Photo> {
    const [photo] = await db
      .insert(schema.photos)
      .values({
        userId,
        imageUrl,
        caption: caption || null,
      })
      .returning();
    return photo;
  }

  async getPhotos(): Promise<Photo[]> {
    const photos = await db
      .select()
      .from(schema.photos)
      .innerJoin(schema.users, eq(schema.users.id, schema.photos.userId))
      .where(eq(schema.photos.isDeleted, false))
      .orderBy(
        desc(schema.users.followerCount),
        desc(schema.photos.likeCount),
        desc(schema.photos.commentCount),
        desc(schema.photos.createdAt)
      );

    return photos.map(photo => photo.photos);
  }

  async getUserPhotos(userId: string): Promise<Photo[]> {
    return db
      .select()
      .from(schema.photos)
      .where(eq(schema.photos.userId, userId))
      .orderBy(desc(schema.photos.createdAt));
  }

  async getFeedPhotos(userId: string): Promise<Photo[]> {
    const follows = await db
      .select()
      .from(schema.follows)
      .where(and(eq(schema.follows.followerId, userId), eq(schema.follows.isDeleted, false)));

    const followingIds = follows.map(f => f.followingId);

    return db
      .select()
      .from(schema.photos)
      .where(
        or(
          inArray(schema.photos.userId, followingIds),
          and(eq(schema.photos.isDeleted, false), eq(schema.photos.userId, userId))
        )
      )
      .orderBy(desc(schema.photos.createdAt));
  }

  async likePhoto(userId: string, photoId: string): Promise<void> {
    const hasLiked = (
      (await db
        .select()
        .from(schema.likes)
        .where(
          and(eq(schema.likes.userId, userId), eq(schema.likes.photoId, photoId))
        )) as Array<unknown>
    ).length;
    const hasDeleted = (
      await db
        .select()
        .from(schema.likes)
        .where(
          and(
            eq(schema.likes.userId, userId),
            eq(schema.likes.photoId, photoId),
            eq(schema.likes.isDeleted, true)
          )
        )
    ).length;

    const [photo] = await db.select().from(schema.photos).where(eq(schema.photos.id, photoId));

    if (!hasLiked) {
      await db.insert(schema.likes).values({ userId, photoId });

      await db
        .update(schema.photos)
        .set({ likeCount: photo.likeCount + 1 })
        .where(eq(schema.photos.id, photoId));
      return;
    } else if (hasLiked && hasDeleted) {
      await db
        .update(schema.likes)
        .set({ isDeleted: false })
        .where(
          and(
            eq(schema.likes.userId, userId),
            eq(schema.likes.photoId, photoId),
            eq(schema.likes.isDeleted, true)
          )
        );

      await db
        .update(schema.photos)
        .set({ likeCount: photo.likeCount + 1 })
        .where(eq(schema.photos.id, photoId));
      return;
    }

    await db
      .update(schema.likes)
      .set({ isDeleted: true })
      .where(
        and(
          eq(schema.likes.userId, userId),
          eq(schema.likes.photoId, photoId),
          eq(schema.likes.isDeleted, false)
        )
      );

    await db
      .update(schema.photos)
      .set({ likeCount: photo.likeCount - 1 })
      .where(eq(schema.photos.id, photoId));
    return;
  }

  async followUser(followerId: string, followingId: string): Promise<void> {
    const isFollower = (
      (await db
        .select()
        .from(schema.follows)
        .where(
          and(
            eq(schema.follows.followerId, followerId),
            eq(schema.follows.followingId, followingId)
          )
        )) as Array<unknown>
    ).length;
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, followingId));
    if (isFollower) {
      await db
        .update(schema.users)
        .set({ followerCount: user.followerCount + 1 })
        .where(eq(schema.users.id, followingId));
      await db
        .update(schema.follows)
        .set({ isDeleted: false })
        .where(
          and(
            eq(schema.follows.followerId, followerId),
            eq(schema.follows.followingId, followingId)
          )
        );
      return;
    }

    await db.insert(schema.follows).values({ followerId, followingId });
    await db
      .update(schema.users)
      .set({ followerCount: user.followerCount + 1 })
      .where(eq(schema.users.id, followingId));
  }

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, followingId));

    await db
      .update(schema.users)
      .set({ followerCount: user.followerCount - 1 })
      .where(eq(schema.users.id, followingId));
    await db
      .update(schema.follows)
      .set({ isDeleted: true })
      .where(
        and(eq(schema.follows.followerId, followerId), eq(schema.follows.followingId, followingId))
      );
  }

  async createComment(userId: string, photoId: string, content: string): Promise<Comment> {
    const [comment] = await db
      .insert(schema.comments)
      .values({ userId, photoId, content })
      .returning();
    const [photo] = await db.select().from(schema.photos).where(eq(schema.photos.id, photoId));
    await db
      .update(schema.photos)
      .set({ commentCount: photo.commentCount + 1 })
      .where(eq(schema.photos.id, photoId));
    return comment;
  }

  getPhotoComments(photoId: string): Promise<Comment[]> {
    return db
      .select()
      .from(schema.comments)
      .where(eq(schema.comments.photoId, photoId))
      .orderBy(asc(schema.comments.createdAt));
  }

  async likeComment(userId: string, commentId: string): Promise<void> {
    const hasLiked = (
      (await db
        .select()
        .from(schema.commentLikes)
        .where(
          and(eq(schema.commentLikes.userId, userId), eq(schema.commentLikes.commentId, commentId))
        )) as Array<unknown>
    ).length;
    const hasDeleted = (
      await db
        .select()
        .from(schema.commentLikes)
        .where(
          and(
            eq(schema.commentLikes.userId, userId),
            eq(schema.commentLikes.commentId, commentId),
            eq(schema.commentLikes.isDeleted, true)
          )
        )
    ).length;
    const [comment] = await db
      .select()
      .from(schema.comments)
      .where(eq(schema.comments.id, commentId));
    if (!hasLiked) {
      await db.insert(schema.commentLikes).values({ userId, commentId });

      await db
        .update(schema.comments)
        .set({ likeCount: comment.likeCount + 1 })
        .where(eq(schema.comments.id, commentId));
      return;
    } else if (hasLiked && hasDeleted) {
      await db
        .update(schema.commentLikes)
        .set({ isDeleted: false })
        .where(
          and(
            eq(schema.commentLikes.userId, userId),
            eq(schema.commentLikes.commentId, commentId),
            eq(schema.commentLikes.isDeleted, true)
          )
        );

      await db
        .update(schema.comments)
        .set({ likeCount: comment.likeCount + 1 })
        .where(eq(schema.comments.id, commentId));
      return;
    }

    await db
      .update(schema.commentLikes)
      .set({ isDeleted: true })
      .where(
        and(
          eq(schema.commentLikes.userId, userId),
          eq(schema.commentLikes.commentId, commentId),
          eq(schema.commentLikes.isDeleted, false)
        )
      );

    await db
      .update(schema.comments)
      .set({ likeCount: comment.likeCount - 1 })
      .where(eq(schema.comments.id, commentId));
  }

  async unlikeComment(userId: string, commentId: string): Promise<void> {
    await db
      .delete(schema.commentLikes)
      .where(
        and(eq(schema.commentLikes.userId, userId), eq(schema.commentLikes.commentId, commentId))
      );
    await db
      .update(schema.comments)
      .set({ likeCount: schema.comments.likeCount - 1 })
      .where(eq(schema.comments.id, commentId));
  }

  async createNotification(
    userId: string,
    actorId: string,
    type: string,
    photoId?: string,
    commentId?: string
  ): Promise<void> {
    await db.insert(schema.notifications).values({
      userId,
      actorId,
      type,
      photoId: photoId || null,
      commentId: commentId || null,
    });
  }

  getUserNotifications(userId: string): Promise<Notification[]> {
    return db
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.userId, userId))
      .orderBy(desc(schema.notifications.createdAt));
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    await db
      .update(schema.notifications)
      .set({ read: true })
      .where(eq(schema.notifications.id, notificationId));
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db
      .update(schema.notifications)
      .set({ read: true })
      .where(eq(schema.notifications.userId, userId));
  }
}

export const storage = new PostgresStorage();
