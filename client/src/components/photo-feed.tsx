import { useQuery } from "@tanstack/react-query";
import { Photo, Comment, User } from "@shared/schema";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, MessageCircle, Smile } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserListDialog } from "./user-list-dialog";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function PhotoFeed() {
  const { user } = useAuth();
  const [feedType, setFeedType] = useState<"general" | "personal">("general");

  const { data: photos, isLoading } = useQuery<Photo[]>({
    queryKey: [feedType === "general" ? "/api/photos" : "/api/photos/feed"],
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs value={feedType} onValueChange={(v) => setFeedType(v as "general" | "personal")}>
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="general">General Feed</TabsTrigger>
          <TabsTrigger value="personal">Personal Feed</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {photos?.map((photo) => (
          <PhotoCard key={photo.id} photo={photo} />
        ))}
      </div>
    </div>
  );
}

function PhotoCard({ photo }: { photo: Photo }) {
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");

  const { data: comments } = useQuery<Comment[]>({
    queryKey: [`/api/photos/${photo.id}/comments`],
    enabled: showComments,
  });

  const { data: photoUser } = useQuery<User>({
    queryKey: [`/api/users/${photo.userId}`],
  });

  const { data: likedUsers } = useQuery<User[]>({
    queryKey: [`/api/photos/${photo.id}/likes`],
  });

  const handleLike = async () => {
    await apiRequest("POST", `/api/photos/${photo.id}/like`);
    queryClient.invalidateQueries({ queryKey: ["/api/photos"] });
    queryClient.invalidateQueries({ queryKey: [`/api/photos/${photo.id}/likes`] });
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    await apiRequest("POST", `/api/photos/${photo.id}/comments`, {
      content: newComment
    });

    queryClient.invalidateQueries({ queryKey: [`/api/photos/${photo.id}/comments`] });
    setNewComment("");
  };

  const handleLikeComment = async (commentId: number) => {
    await apiRequest("POST", `/api/comments/${commentId}/like`);
    queryClient.invalidateQueries({ queryKey: [`/api/photos/${photo.id}/comments`] });
  };

  const handleEmojiSelect = (emoji: any) => {
    setNewComment(prev => prev + emoji.native);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-4">
        <div className="flex items-center space-x-4">
          <Avatar>
            {photoUser?.avatarUrl ? (
              <img
                src={photoUser.avatarUrl}
                alt={photoUser.displayName || photoUser.username}
                className="h-full w-full object-cover"
              />
            ) : (
              <AvatarFallback>
                {photoUser?.displayName?.[0] || photoUser?.username[0]}
              </AvatarFallback>
            )}
          </Avatar>
          <Link href={`/profile/${photo.userId}`} className="font-medium hover:underline">
            {photoUser?.displayName || photoUser?.username}
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <img
          src={photo.imageUrl}
          alt={photo.caption || "Fitness progress"}
          className="w-full aspect-square object-cover"
        />
      </CardContent>
      <CardFooter className="p-4 flex-col items-start">
        <div className="flex items-center space-x-4 w-full mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLike}
          >
            <Heart className={photo.likeCount ? "fill-red-500 stroke-red-500" : ""} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowComments(!showComments)}
          >
            <MessageCircle />
            {photo.commentCount > 0 && (
              <span className="ml-1 text-xs">{photo.commentCount}</span>
            )}
          </Button>
          <UserListDialog
            trigger={
              <Button variant="link" className="p-0 h-auto">
                {photo.likeCount || 0} likes
              </Button>
            }
            title="Likes"
            users={likedUsers || []}
          />
        </div>

        {photo.caption && (
          <p className="text-sm mb-4">{photo.caption}</p>
        )}

        {showComments && (
          <div className="w-full space-y-4">
            <div className="max-h-40 overflow-y-auto space-y-2">
              {comments?.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onLike={() => handleLikeComment(comment.id)}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1"
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Smile className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Picker
                    data={data}
                    onEmojiSelect={handleEmojiSelect}
                    theme="light"
                    previewPosition="none"
                  />
                </PopoverContent>
              </Popover>
              <Button onClick={handleAddComment}>Post</Button>
            </div>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

function CommentItem({ comment, onLike }: { comment: Comment; onLike: () => Promise<void> }) {
  const { data: commentUser } = useQuery<User>({
    queryKey: [`/api/users/${comment.userId}`],
  });

  return (
    <div className="flex items-start gap-2">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Link href={`/profile/${comment.userId}`} className="font-medium hover:underline">
            {commentUser?.displayName || commentUser?.username}
          </Link>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.createdAt!), { addSuffix: true })}
          </span>
        </div>
        <p className="text-sm">{comment.content}</p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6"
        onClick={onLike}
      >
        <Heart
          className={`h-4 w-4 ${comment.likeCount ? "fill-red-500 stroke-red-500" : ""}`}
        />
        {comment.likeCount > 0 && (
          <span className="ml-1 text-xs">{comment.likeCount}</span>
        )}
      </Button>
    </div>
  );
}