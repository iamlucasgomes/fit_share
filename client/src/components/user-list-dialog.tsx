import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { User } from "@shared/schema";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface UserListDialogProps {
  trigger: React.ReactNode;
  title: string;
  users: User[];
}

export function UserListDialog({ trigger, title, users }: UserListDialogProps) {
  const { user: currentUser } = useAuth();
  const [followingMap, setFollowingMap] = useState<Record<number, boolean>>({});

  const handleFollow = async (userId: number) => {
    await apiRequest("POST", `/api/users/${userId}/follow`);
    setFollowingMap(prev => ({ ...prev, [userId]: true }));
    queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/following`] });
  };

  const handleUnfollow = async (userId: number) => {
    await apiRequest("POST", `/api/users/${userId}/unfollow`);
    setFollowingMap(prev => ({ ...prev, [userId]: false }));
    queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/following`] });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between">
              <Link href={`/profile/${user.id}`} className="flex items-center gap-3">
                <Avatar>
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.displayName || user.username}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <AvatarFallback>
                      {(user.displayName || user.username)[0].toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <p className="font-medium">{user.displayName || user.username}</p>
                  {user.bio && (
                    <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                      {user.bio}
                    </p>
                  )}
                </div>
              </Link>
              {currentUser && currentUser.id !== user.id && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    followingMap[user.id] ? handleUnfollow(user.id) : handleFollow(user.id)
                  }
                >
                  {followingMap[user.id] ? "Unfollow" : "Follow"}
                </Button>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
