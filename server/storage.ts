import { User, InsertUser, Photo, Comment, Follow, Like, CommentLike, Notification } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserProfile(userId: number, bio: string, avatarUrl: string, displayName: string): Promise<User>;
  isFollowing(followerId: number, followingId: number): Promise<boolean>;
  getFollowers(userId: number): Promise<User[]>;
  getLikedUsers(photoId: number): Promise<User[]>;

  // Photo methods
  createPhoto(userId: number, imageUrl: string, caption?: string): Promise<Photo>;
  getPhotos(): Promise<Photo[]>;
  getUserPhotos(userId: number): Promise<Photo[]>;
  getFeedPhotos(userId: number): Promise<Photo[]>;

  // Like methods
  likePhoto(userId: number, photoId: number): Promise<void>;
  unlikePhoto(userId: number, photoId: number): Promise<void>;

  // Follow methods
  followUser(followerId: number, followingId: number): Promise<void>;
  unfollowUser(followerId: number, followingId: number): Promise<void>;

  // Comment methods
  createComment(userId: number, photoId: number, content: string): Promise<Comment>;
  getPhotoComments(photoId: number): Promise<Comment[]>;
  likeComment(userId: number, commentId: number): Promise<void>;
  unlikeComment(userId: number, commentId: number): Promise<void>;

  // Notification methods
  createNotification(userId: number, actorId: number, type: string, photoId?: number, commentId?: number): Promise<void>;
  getUserNotifications(userId: number): Promise<Notification[]>;
  markNotificationAsRead(notificationId: number): Promise<void>;
  markAllNotificationsAsRead(userId: number): Promise<void>;

  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private photos: Map<number, Photo>;
  private follows: Map<number, Follow>;
  private likes: Map<number, Like>;
  private comments: Map<number, Comment>;
  private commentLikes: Map<number, CommentLike>;
  private notifications: Map<number, Notification>;
  sessionStore: session.Store;
  private currentId: number;
  private currentPhotoId: number;
  private currentCommentId: number;
  private currentFollowId: number;
  private currentNotificationId: number;

  constructor() {
    this.users = new Map();
    this.photos = new Map();
    this.follows = new Map();
    this.likes = new Map();
    this.comments = new Map();
    this.commentLikes = new Map();
    this.notifications = new Map();
    this.currentId = 1;
    this.currentPhotoId = 1;
    this.currentCommentId = 1;
    this.currentFollowId = 1;
    this.currentNotificationId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { 
      ...insertUser, 
      id,
      displayName: null,
      bio: null,
      avatarUrl: null,
      followerCount: 0
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserProfile(userId: number, bio: string, avatarUrl: string, displayName: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");

    const updatedUser = {
      ...user,
      bio: bio || user.bio,
      avatarUrl: avatarUrl || user.avatarUrl,
      displayName: displayName || user.displayName
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async isFollowing(followerId: number, followingId: number): Promise<boolean> {
    return Array.from(this.follows.values()).some(
      follow => follow.followerId === followerId && follow.followingId === followingId
    );
  }

  async getFollowers(userId: number): Promise<User[]> {
    const followerIds = Array.from(this.follows.values())
      .filter(follow => follow.followingId === userId)
      .map(follow => follow.followerId);

    return followerIds
      .map(id => this.users.get(id))
      .filter((user): user is User => user !== undefined);
  }

  async getLikedUsers(photoId: number): Promise<User[]> {
    const userIds = Array.from(this.likes.values())
      .filter(like => like.photoId === photoId)
      .map(like => like.userId);

    return userIds
      .map(id => this.users.get(id))
      .filter((user): user is User => user !== undefined);
  }

  async createPhoto(userId: number, imageUrl: string, caption?: string): Promise<Photo> {
    const id = this.currentPhotoId++;
    const photo: Photo = {
      id,
      userId,
      imageUrl,
      caption: caption || null,
      likeCount: 0,
      commentCount: 0,
      createdAt: new Date()
    };
    this.photos.set(id, photo);
    return photo;
  }

  async getPhotos(): Promise<Photo[]> {
    return Array.from(this.photos.values()).sort((a, b) => 
      b.createdAt!.getTime() - a.createdAt!.getTime()
    );
  }

  async getUserPhotos(userId: number): Promise<Photo[]> {
    return Array.from(this.photos.values())
      .filter(photo => photo.userId === userId)
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async getFeedPhotos(userId: number): Promise<Photo[]> {
    // Get IDs of users that the current user follows
    const followedUserIds = Array.from(this.follows.values())
      .filter(follow => follow.followerId === userId)
      .map(follow => follow.followingId);

    // Get photos from followed users and own photos
    return Array.from(this.photos.values())
      .filter(photo => followedUserIds.includes(photo.userId) || photo.userId === userId)
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async likePhoto(userId: number, photoId: number): Promise<void> {
    const photo = this.photos.get(photoId);
    if (photo) {
      photo.likeCount = (photo.likeCount || 0) + 1;
      this.photos.set(photoId, photo);
    }
  }

  async unlikePhoto(userId: number, photoId: number): Promise<void> {
    const photo = this.photos.get(photoId);
    if (photo && photo.likeCount && photo.likeCount > 0) {
      photo.likeCount--;
      this.photos.set(photoId, photo);
    }
  }

  async followUser(followerId: number, followingId: number): Promise<void> {
    // Check if already following
    const isAlreadyFollowing = await this.isFollowing(followerId, followingId);
    if (isAlreadyFollowing) return;

    const id = this.currentFollowId++;
    const follow: Follow = {
      id,
      followerId,
      followingId
    };
    this.follows.set(id, follow);

    const user = this.users.get(followingId);
    if (user) {
      user.followerCount = (user.followerCount || 0) + 1;
      this.users.set(followingId, user);
    }
  }

  async unfollowUser(followerId: number, followingId: number): Promise<void> {
    // Find and remove the follow relationship
    const followToRemove = Array.from(this.follows.entries()).find(
      ([_, follow]) => follow.followerId === followerId && follow.followingId === followingId
    );

    if (followToRemove) {
      this.follows.delete(followToRemove[0]);
      const user = this.users.get(followingId);
      if (user && user.followerCount && user.followerCount > 0) {
        user.followerCount--;
        this.users.set(followingId, user);
      }
    }
  }

  async createComment(userId: number, photoId: number, content: string): Promise<Comment> {
    const id = this.currentCommentId++;
    const comment: Comment = {
      id,
      userId,
      photoId,
      content,
      likeCount: 0,
      createdAt: new Date()
    };
    this.comments.set(id, comment);

    // Increment photo comment count
    const photo = this.photos.get(photoId);
    if (photo) {
      photo.commentCount = (photo.commentCount || 0) + 1;
      this.photos.set(photoId, photo);
    }

    return comment;
  }

  async getPhotoComments(photoId: number): Promise<Comment[]> {
    return Array.from(this.comments.values())
      .filter(comment => comment.photoId === photoId)
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async likeComment(userId: number, commentId: number): Promise<void> {
    const comment = this.comments.get(commentId);
    if (comment) {
      comment.likeCount = (comment.likeCount || 0) + 1;
      this.comments.set(commentId, comment);
    }
  }

  async unlikeComment(userId: number, commentId: number): Promise<void> {
    const comment = this.comments.get(commentId);
    if (comment && comment.likeCount && comment.likeCount > 0) {
      comment.likeCount--;
      this.comments.set(commentId, comment);
    }
  }

  async createNotification(
    userId: number,
    actorId: number,
    type: string,
    photoId?: number,
    commentId?: number
  ): Promise<void> {
    const id = this.currentNotificationId++;
    const notification: Notification = {
      id,
      userId,
      actorId,
      type,
      photoId: photoId || null,
      commentId: commentId || null,
      read: false,
      createdAt: new Date()
    };
    this.notifications.set(id, notification);
  }

  async getUserNotifications(userId: number): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId)
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async markNotificationAsRead(notificationId: number): Promise<void> {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.read = true;
      this.notifications.set(notificationId, notification);
    }
  }

  async markAllNotificationsAsRead(userId: number): Promise<void> {
    for (const [id, notification] of this.notifications.entries()) {
      if (notification.userId === userId) {
        notification.read = true;
        this.notifications.set(id, notification);
      }
    }
  }
}

export const storage = new MemStorage();